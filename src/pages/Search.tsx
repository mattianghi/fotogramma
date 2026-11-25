import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, img, MediaSummary, MediaType, titleOf, typeOf, yearOf } from '../lib/tmdb';
import { useAsync } from '../lib/useAsync';
import { Empty, Img, PersonCard, PosterCard, Segmented } from '../components/ui';
import { Icon } from '../components/Icon';
import { useStore } from '../lib/store';

type Tab = 'multi' | 'movie' | 'tv' | 'person';
const RECENT = 'fotogramma:recent';

export default function Search() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [tab, setTab] = useState<Tab>((params.get('t') as Tab) ?? 'multi');
  const [debounced, setDebounced] = useState(q);
  const [genre, setGenre] = useState<{ t: MediaType; id: number; name: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 280);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => { setParams(debounced ? { q: debounced, t: tab } : {}, { replace: true }); }, [debounced, tab, setParams]);

  const res = useAsync(async () => (debounced ? api.search(debounced, tab) : null), [debounced, tab]);
  const results = useMemo(() => (res.data?.results ?? []).map((m) => ({ ...m, media_type: m.media_type ?? (tab === 'multi' ? undefined : tab) })), [res.data, tab]);

  // salva la ricerca solo quando la usi davvero (apri un risultato o premi Invio), non lettera per lettera
  const saveRecent = () => {
    const term = q.trim();
    if (!term) return;
    try {
      const prev: string[] = JSON.parse(localStorage.getItem(RECENT) ?? '[]');
      localStorage.setItem(RECENT, JSON.stringify([term, ...prev.filter((x) => x.toLowerCase() !== term.toLowerCase())].slice(0, 8)));
    } catch { /* ignora */ }
  };

  const people = results.filter((m) => typeOf(m) === 'person');
  const media = results.filter((m) => typeOf(m) !== 'person');
  const top = tab === 'multi' ? results[0] : undefined;

  return (
    <div className="page search">
      <header className="page-head sticky">
        <h1 className="display small">Cerca</h1>
        <label className="search-box">
          <Icon name="search" size={20} />
          <input autoFocus placeholder="Film, serie TV, attori…" value={q} onChange={(e) => { setQ(e.target.value); setGenre(null); }} enterKeyHint="search"
            onKeyDown={(e) => { if (e.key === 'Enter') { saveRecent(); (e.target as HTMLInputElement).blur(); } }} />
          {q && <button onClick={() => setQ('')} aria-label="Cancella"><Icon name="close" size={16} /></button>}
        </label>
        <Segmented value={tab} onChange={setTab} options={[
          { value: 'multi', label: 'Tutto' }, { value: 'movie', label: 'Film' }, { value: 'tv', label: 'Serie' }, { value: 'person', label: 'Attori' },
        ]} />
      </header>

      {!debounced && !genre && <Browse onPick={setGenre} onRecent={setQ} tab={tab} />}
      {!debounced && genre && <GenreResults g={genre} onBack={() => setGenre(null)} />}

      {debounced && res.loading && !res.data && <div className="grid">{Array.from({ length: 8 }, (_, i) => <div key={i} className="poster-card"><div className="poster-frame sk" /></div>)}</div>}
      {debounced && res.data && !results.length && <Empty icon="search" title="Nessun risultato">Prova con il titolo originale o un'altra parola.</Empty>}

      <div onClickCapture={(e) => { if ((e.target as Element).closest('a')) saveRecent(); }}>
      {top && <TopResult m={top} />}
      {(tab === 'person' || (tab === 'multi' && people.length > 0)) && (
        <section className="block">
          {tab === 'multi' && <h2 className="rail-title">Attori e persone</h2>}
          <div className="people-grid">
            {people.filter((p) => p !== top).map((p) => <PersonCard key={p.id} id={p.id} name={titleOf(p)} path={p.profile_path ?? null} role={p.known_for?.map(titleOf).slice(0, 2).join(', ')} />)}
          </div>
        </section>
      )}
      {media.length > 0 && tab !== 'person' && (
        <section className="block">
          {tab === 'multi' && <h2 className="rail-title">Film e serie</h2>}
          <div className="grid">{media.filter((m) => m !== top).map((m) => <PosterCard key={`${m.media_type}-${m.id}`} m={m} />)}</div>
        </section>
      )}
      </div>
    </div>
  );
}

function TopResult({ m }: { m: MediaSummary }) {
  const t = typeOf(m);
  const isPerson = t === 'person';
  return (
    <Link to={`/${t}/${m.id}`} className="top-result">
      <div className={`top-result-img ${isPerson ? 'is-round' : ''}`}><Img src={isPerson ? img.profile(m.profile_path) : img.poster(m.poster_path)} alt={titleOf(m)} /></div>
      <div>
        <span className="kicker">Miglior risultato · {isPerson ? 'Persona' : t === 'tv' ? 'Serie TV' : 'Film'}</span>
        <h3 className="top-result-title">{titleOf(m)}</h3>
        <p className="muted">{isPerson ? m.known_for?.map(titleOf).join(' · ') : `${yearOf(m)} — ${m.overview?.slice(0, 140) ?? ''}${(m.overview?.length ?? 0) > 140 ? '…' : ''}`}</p>
      </div>
    </Link>
  );
}

const genreArt: Record<string, string> = {
  Azione: '🔥', Avventura: '🧭', Animazione: '✏️', Commedia: '😂', Crime: '🕵️', Documentario: '🎥', Dramma: '🎭', Famiglia: '🏡', Fantasy: '🐉', Storia: '🏛️', Horror: '🩸', Musica: '🎷', Mistero: '🔍', Romance: '💌', Fantascienza: '🚀', Thriller: '🔪', Guerra: '🎖️', Western: '🤠',
};

function Browse({ onPick, onRecent, tab }: { onPick: (g: { t: MediaType; id: number; name: string }) => void; onRecent: (q: string) => void; tab: Tab }) {
  const prefer = useStore((s) => s.profile.prefer);
  const t: MediaType = tab === 'tv' ? 'tv' : tab === 'movie' ? 'movie' : prefer;
  const { data } = useAsync(() => api.genres(t), [t]);
  const recent: string[] = (() => { try { return JSON.parse(localStorage.getItem(RECENT) ?? '[]'); } catch { return []; } })();
  return (
    <>
      {recent.length > 0 && (
        <section className="block">
          <h2 className="rail-title">Ricerche recenti</h2>
          <div className="chips">{recent.map((r) => <button key={r} className="chip" onClick={() => onRecent(r)}><Icon name="clock" size={14} />{r}</button>)}</div>
        </section>
      )}
      <section className="block">
        <h2 className="rail-title">Esplora per genere · {t === 'tv' ? 'Serie' : 'Film'}</h2>
        <div className="genre-grid">
          {(data?.genres ?? []).map((g, i) => (
            <button key={g.id} className="genre-tile" style={{ ['--h' as string]: `${(i * 47) % 360}` }} onClick={() => onPick({ t, id: g.id, name: g.name })}>
              <span className="genre-emoji">{genreArt[g.name] ?? '🎬'}</span>
              <span>{g.name}</span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

function GenreResults({ g, onBack }: { g: { t: MediaType; id: number; name: string }; onBack: () => void }) {
  const { data } = useAsync(() => api.discoverByGenre(g.t, g.id), [g.t, g.id]);
  return (
    <section className="block">
      <button className="link-btn" onClick={onBack}><Icon name="back" size={16} /> Tutti i generi</button>
      <h2 className="display small">{g.name}</h2>
      <div className="grid">{(data?.results ?? []).map((m) => <PosterCard key={m.id} m={{ ...m, media_type: g.t }} />)}</div>
    </section>
  );
}
