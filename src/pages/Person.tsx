import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, img, MediaSummary, titleOf, yearOf } from '../lib/tmdb';
import { useAsync } from '../lib/useAsync';
import { fmtDate, useDominantColor } from '../lib/util';
import { BackButton } from '../components/Detail';
import { ErrorBox, Img, PosterCard, Rail, Segmented, toast } from '../components/ui';
import { Icon } from '../components/Icon';
import { actions, useStore } from '../lib/store';

// talk show, notiziari, reality e apparizioni "come sé stesso" non sono ruoli
const NON_FICTION = [10763, 10764, 10767];
const isAppearance = (c: MediaSummary) =>
  /^(self|himself|herself|themselves)\b|\(voice\)?\s*-?\s*self|\bguest\b|\bhost\b/i.test(c.character ?? '') ||
  (c.genre_ids ?? []).some((g) => NON_FICTION.includes(g)) ||
  (c.media_type === 'movie' && (c.genre_ids ?? []).includes(99) && /self/i.test(c.character ?? ''));

const dept: Record<string, string> = { Acting: 'Attore / Attrice', Directing: 'Regia', Writing: 'Sceneggiatura', Production: 'Produzione', Sound: 'Musica', Camera: 'Fotografia', Editing: 'Montaggio' };

export default function PersonPage() {
  const id = Number(useParams().id);
  const { data: p, error } = useAsync(() => api.person(id), [id]);
  const en = useAsync(async () => (p && !p.biography ? api.personEn(id) : null), [p?.id]);
  const accent = useDominantColor(p ? img.profile(p.profile_path) : undefined);
  const entries = useStore((s) => s.entries);
  const isFav = useStore((s) => !!s.people[id]);
  const [tab, setTab] = useState<'all' | 'movie' | 'tv' | 'seen'>('all');
  const [bioOpen, setBioOpen] = useState(false);

  const credits = useMemo(() => {
    if (!p) return [];
    const src = p.known_for_department === 'Acting' ? p.combined_credits.cast : [...p.combined_credits.crew, ...p.combined_credits.cast];
    const seen = new Map<string, MediaSummary>();
    for (const c of src) {
      const k = `${c.media_type}-${c.id}`;
      if (!seen.has(k) && c.poster_path && !isAppearance(c)) seen.set(k, c);
    }
    return [...seen.values()];
  }, [p]);

  if (error) return <div className="page"><ErrorBox error={error} /></div>;
  if (!p) return <div className="page"><div className="person-hero sk" /></div>;

  // "conosciuto per": i titoli più votati in assoluto, ruoli principali prima
  const known = [...credits].sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0)).slice(0, 12);
  const seenByMe = credits.filter((c) => entries[`${c.media_type}:${c.id}`]?.watched || entries[`${c.media_type}:${c.id}`]?.rating);
  const filtered = credits
    .filter((c) => (tab === 'all' ? true : tab === 'seen' ? seenByMe.includes(c) : c.media_type === tab))
    .sort((a, b) => (yearOf(b) || '9999').localeCompare(yearOf(a) || '9999'));
  const bio = p.biography || en.data?.biography || '';
  const age = p.birthday ? Math.floor((+(p.deathday ? new Date(p.deathday) : new Date()) - +new Date(p.birthday)) / 31557600000) : null;
  const avg = seenByMe.map((c) => entries[`${c.media_type}:${c.id}`]?.rating).filter(Boolean) as number[];

  return (
    <div className="page person" style={{ ['--accent' as string]: accent }}>
      <header className="person-hero">
        <BackButton />
        <div className="person-hero-bg"><Img src={img.profile(p.profile_path, 'h632')} alt="" eager /></div>
        <div className="person-hero-body">
          <div className="person-portrait"><Img src={img.profile(p.profile_path, 'h632')} alt={p.name} eager /></div>
          <div className="person-titles">
            <span className="kicker">{dept[p.known_for_department] ?? p.known_for_department}</span>
            <h1 className="detail-title">{p.name}</h1>
            <div className="detail-meta">
              {p.birthday && <span>{fmtDate(p.birthday)}{age !== null && ` · ${age} anni`}{p.deathday && ` († ${fmtDate(p.deathday, { year: 'numeric' })})`}</span>}
              {p.place_of_birth && <span>{p.place_of_birth}</span>}
            </div>
            <button className={`btn ${isFav ? 'primary' : 'ghost'}`} onClick={() => { actions.toggleFavPerson({ id: p.id, name: p.name, profile_path: p.profile_path }); toast(isFav ? 'Tolto dagli attori preferiti' : 'Tra i tuoi attori preferiti'); }}>
              <Icon name="heart" size={18} fill={isFav} /> {isFav ? 'Preferito' : 'Aggiungi ai preferiti'}
            </button>
          </div>
        </div>
      </header>

      <div className="detail-body">
        <div className="person-stats">
          <div><strong>{credits.length}</strong><span>titoli</span></div>
          <div><strong>{seenByMe.length}</strong><span>visti da te</span></div>
          <div><strong>{avg.length ? (avg.reduce((a, b) => a + b, 0) / avg.length).toFixed(1) : '–'}</strong><span>tuo voto medio</span></div>
        </div>

        {bio && (
          <section className="block overview">
            <p className={bioOpen ? '' : 'clamp'}>{bio}</p>
            {bio.length > 320 && <button className="link-btn" onClick={() => setBioOpen(!bioOpen)}>{bioOpen ? 'Meno' : 'Leggi tutto'}</button>}
          </section>
        )}

        <Rail title="Conosciuto per" kicker="Il meglio">
          {known.map((c) => <PosterCard key={`${c.media_type}-${c.id}`} m={c} sub={c.character || c.job || yearOf(c)} />)}
        </Rail>

        {(p.images?.profiles.length ?? 0) > 1 && (
          <Rail title="Foto" kicker="Galleria">
            {p.images!.profiles.slice(0, 12).map((im) => <div key={im.file_path} className="gallery-shot"><Img src={img.profile(im.file_path, 'h632')} alt={p.name} /></div>)}
          </Rail>
        )}

        <section className="block">
          <h2 className="rail-title">Filmografia</h2>
          <Segmented value={tab} onChange={setTab} options={[
            { value: 'all', label: 'Tutto' }, { value: 'movie', label: 'Film' }, { value: 'tv', label: 'Serie' }, { value: 'seen', label: `Visti (${seenByMe.length})` },
          ]} />
          <ol className="filmography">
            {filtered.map((c) => {
              const e = entries[`${c.media_type}:${c.id}`];
              return (
                <li key={`${c.media_type}-${c.id}-${c.character ?? c.job}`}>
                  <a href={`#/${c.media_type}/${c.id}`}>
                    <span className="fy">{yearOf(c) || '—'}</span>
                    <span className="fthumb"><Img src={img.poster(c.poster_path, 'w154')} alt="" /></span>
                    <span className="ft"><strong>{titleOf(c)}</strong><small>{c.character || c.job}{c.media_type === 'tv' ? ` · Serie${c.episode_count ? `, ${c.episode_count} ep.` : ''}` : ''}</small></span>
                    {e?.rating ? <span className="fr"><Icon name="star" size={12} fill strokeWidth={0} />{e.rating}</span> : e?.watched ? <span className="fr"><Icon name="check" size={14} strokeWidth={2.6} /></span> : null}
                  </a>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </div>
  );
}
