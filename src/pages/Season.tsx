import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, Episode, img, titleOf } from '../lib/tmdb';
import { useAsync } from '../lib/useAsync';
import { fmtDate, fmtRating, seedFromTv, useDominantColor } from '../lib/util';
import { BackButton } from '../components/Detail';
import { RateSheet } from '../components/MediaActions';
import { ErrorBox, Img, PersonCard, Rail, Stars, toast } from '../components/ui';
import { Icon } from '../components/Icon';
import { actions, episodeKey, EntrySeed, seasonKey, useStore } from '../lib/store';

export default function SeasonPage() {
  const { id: idS, n: nS } = useParams();
  const id = Number(idS), n = Number(nS);
  const show = useAsync(() => api.tv(id), [id]);
  const { data: season, error } = useAsync(() => api.season(id, n), [id, n]);
  const accent = useDominantColor(season ? img.poster(season.poster_path ?? show.data?.poster_path, 'w154') : undefined);
  const marks = useStore((s) => s.episodes);
  const sRating = useStore((s) => s.seasons[seasonKey(id, n)]?.rating);
  const [rateSeason, setRateSeason] = useState(false);
  const [rateEp, setRateEp] = useState<Episode | null>(null);

  if (error) return <div className="page"><ErrorBox error={error} /></div>;
  if (!season || !show.data) return <div className="page"><div className="detail-hero sk" /></div>;
  const t = show.data;
  const seed = seedFromTv(t);
  const eps = season.episodes;
  const watched = eps.filter((e) => marks[episodeKey(id, n, e.episode_number)]?.watchedAt).length;
  const all = watched === eps.length && eps.length > 0;
  const seasons = t.seasons.filter((s) => s.episode_count > 0).sort((a, b) => (a.season_number || 999) - (b.season_number || 999));
  const guests = Object.values(Object.fromEntries(eps.flatMap((e) => e.guest_stars ?? []).map((g) => [g.id, g]))).filter((g) => g.profile_path).slice(0, 20);

  return (
    <div className="page detail season-page" style={{ ['--accent' as string]: accent }}>
      <header className="season-hero">
        <BackButton />
        <div className="detail-backdrop"><Img src={img.backdrop(t.backdrop_path)} alt="" eager /></div>
        <div className="detail-tint" />
        <div className="season-hero-body">
          <div className="detail-poster small"><Img src={img.poster(season.poster_path ?? t.poster_path, 'w342')} alt={season.name} eager /></div>
          <div>
            <Link to={`/tv/${id}`} className="kicker link">{titleOf(t)}</Link>
            <h1 className="detail-title">{season.name}</h1>
            <div className="detail-meta"><span>{season.air_date?.slice(0, 4)}</span><span>{eps.length} episodi</span><span>{watched} visti</span></div>
          </div>
        </div>
      </header>

      <nav className="season-tabs">
        {seasons.map((s) => (
          <Link key={s.id} to={`/tv/${id}/season/${s.season_number}`} replace className={s.season_number === n ? 'is-on' : ''}>
            {s.season_number === 0 ? 'Speciali' : `S${s.season_number}`}
          </Link>
        ))}
      </nav>

      <div className="detail-body">
        <div className="season-actions">
          <button className="rate-card" onClick={() => setRateSeason(true)}>
            <div>
              <span className="kicker">La tua valutazione della stagione</span>
              <div className="rate-card-row"><Stars value={sRating ?? 0} size={24} /><span className="rate-card-num">{sRating ? fmtRating(sRating) : 'Tocca per votare'}</span></div>
            </div>
            <Icon name="chevron" size={18} />
          </button>
          <button className={`btn ${all ? 'ghost' : 'primary'} wide`} onClick={() => { actions.markSeason(seed, n, eps.map((e) => ({ n: e.episode_number, name: e.name, runtime: e.runtime ?? undefined })), !all); toast(all ? 'Stagione segnata come non vista' : 'Stagione completata ✓'); }}>
            <Icon name="check" size={18} strokeWidth={2.4} /> {all ? 'Togli “vista”' : 'Segna tutta la stagione come vista'}
          </button>
        </div>

        <EpisodeChart eps={eps} id={id} n={n} />

        {season.overview && <p className="overview">{season.overview}</p>}

        <ol className="episodes">
          {eps.map((e) => <EpisodeRow key={e.id} e={e} id={id} seed={seed} onRate={() => setRateEp(e)} />)}
        </ol>

        {guests.length > 0 && (
          <Rail title="Guest star della stagione" kicker="Volti">
            {guests.map((g) => <PersonCard key={g.id} id={g.id} name={g.name} path={g.profile_path} role={g.character} small />)}
          </Rail>
        )}
      </div>

      <RateSheet open={rateSeason} onClose={() => setRateSeason(false)} title={season.name} subtitle={titleOf(t)} value={sRating} withReview={false}
        onSave={(r) => {
          const aired = eps.filter((e) => e.air_date && new Date(e.air_date) <= new Date()).map((e) => ({ n: e.episode_number, name: e.name, runtime: e.runtime ?? undefined }));
          actions.rateSeason(seed, n, r, aired);
          toast(r ? `Stagione valutata ${fmtRating(r)} ★ · segnata come vista` : 'Valutazione rimossa');
        }} />
      {rateEp && (
        <RateSheet open onClose={() => setRateEp(null)} title={rateEp.name} subtitle={`${titleOf(t)} · S${n} E${rateEp.episode_number}`} withReview={false}
          value={marks[episodeKey(id, n, rateEp.episode_number)]?.rating}
          onSave={(r) => { actions.rateEpisode(seed, n, rateEp.episode_number, rateEp.name, r, rateEp.runtime ?? undefined); toast(r ? `Episodio valutato ${fmtRating(r)} ★` : 'Valutazione rimossa'); }} />
      )}
    </div>
  );
}

function EpisodeRow({ e, id, seed, onRate }: { e: Episode; id: number; seed: EntrySeed; onRate: () => void }) {
  const mark = useStore((s) => s.episodes[episodeKey(id, e.season_number, e.episode_number)]);
  const [open, setOpen] = useState(false);
  const future = e.air_date ? new Date(e.air_date) > new Date() : true;
  return (
    <li className={`episode ${mark?.watchedAt ? 'is-watched' : ''}`}>
      <div className="episode-still" onClick={() => setOpen(!open)}>
        <Img src={img.still(e.still_path)} alt={e.name} />
        <span className="episode-num">{e.episode_number}</span>
      </div>
      <div className="episode-body" onClick={() => setOpen(!open)}>
        <strong>{e.name}</strong>
        <span className="muted small">{future ? `In uscita ${fmtDate(e.air_date, { day: 'numeric', month: 'short' }) || 'prossimamente'}` : fmtDate(e.air_date, { day: 'numeric', month: 'short', year: 'numeric' })}{e.runtime ? ` · ${e.runtime} min` : ''}{e.vote_average ? ` · ${Math.round(e.vote_average * 10)}%` : ''}</span>
        {e.overview && <p className={open ? '' : 'clamp-2'}>{e.overview}</p>}
      </div>
      <div className="episode-side">
        <button className={`check-btn ${mark?.watchedAt ? 'is-on' : ''}`} disabled={future} aria-label={mark?.watchedAt ? 'Segna come non visto' : 'Segna come visto'}
          onClick={() => { actions.toggleEpisode(seed, e.season_number, e.episode_number, e.name, e.runtime ?? undefined); navigator.vibrate?.(6); }}>
          <Icon name="check" size={18} strokeWidth={2.6} />
        </button>
        <button className={`ep-rate ${mark?.rating ? 'is-on' : ''}`} disabled={future} onClick={onRate} aria-label="Valuta episodio">
          <Icon name="star" size={13} fill={!!mark?.rating} strokeWidth={mark?.rating ? 0 : 1.8} />
          {mark?.rating ? fmtRating(mark.rating) : 'Vota'}
        </button>
      </div>
    </li>
  );
}

// grafico: i tuoi voti episodio per episodio, confrontati con il pubblico
function EpisodeChart({ eps, id, n }: { eps: Episode[]; id: number; n: number }) {
  const marks = useStore((s) => s.episodes);
  const mine = eps.map((e) => marks[episodeKey(id, n, e.episode_number)]?.rating);
  if (eps.length < 2 || !eps.some((e) => e.vote_average)) return null;
  const rated = mine.filter(Boolean).length;
  return (
    <section className="ep-chart" aria-label="Andamento della stagione">
      <div className="ep-chart-head">
        <span className="kicker">Andamento della stagione</span>
        <span className="legend"><i className="lg-pub" /> Pubblico <i className="lg-me" /> Tu{rated ? ` (${rated})` : ''}</span>
      </div>
      <div className="ep-bars">
        {eps.map((e, i) => (
          <div key={e.id} className="ep-bar" title={`E${e.episode_number}: pubblico ${e.vote_average.toFixed(1)}${mine[i] ? ` · tu ${mine[i]! * 2}` : ''}`}>
            <i className="pub" style={{ height: `${Math.max(4, (e.vote_average / 10) * 100)}%` }} />
            {mine[i] && <i className="me" style={{ bottom: `calc(${(mine[i]! / 5) * 100}% - 4px)` }} />}
            <span>{e.episode_number}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
