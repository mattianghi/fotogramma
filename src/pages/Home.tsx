import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, img, MediaSummary, titleOf, typeOf, yearOf } from '../lib/tmdb';
import { useAsync } from '../lib/useAsync';
import { useStore, Entry } from '../lib/store';
import { PersonCard, PosterCard, Rail, RailSkeleton, Img, Stars } from '../components/ui';
import { Icon } from '../components/Icon';
import { tmdbScore, useDominantColor } from '../lib/util';

const asSummary = (e: Entry): MediaSummary => ({ id: e.id, media_type: e.type, title: e.type === 'movie' ? e.title : undefined, name: e.type === 'tv' ? e.title : undefined, poster_path: e.poster, backdrop_path: e.backdrop, release_date: e.type === 'movie' ? `${e.year}` : undefined, first_air_date: e.type === 'tv' ? `${e.year}` : undefined });

export default function Home() {
  const name = useStore((s) => s.profile.name);
  const entries = useStore((s) => s.entries);
  const episodes = useStore((s) => s.episodes);
  const trending = useAsync(() => api.trending('all', 'week'), []);
  const hour = new Date().getHours();
  const greet = hour < 6 ? 'Notte da maratona' : hour < 13 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera';

  const watchlist = useMemo(() => Object.values(entries).filter((e) => e.watchlist).sort((a, b) => b.updatedAt - a.updatedAt), [entries]);
  const continuing = useMemo(() => {
    const last = new Map<number, string>();
    for (const [k, v] of Object.entries(episodes)) {
      if (!v.watchedAt) continue;
      const id = Number(k.split(':')[1]);
      if (!last.has(id) || last.get(id)! < v.watchedAt) last.set(id, v.watchedAt);
    }
    return [...last.entries()].sort((a, b) => b[1].localeCompare(a[1])).map(([id]) => entries[`tv:${id}`]).filter((e) => e && !e.watched);
  }, [episodes, entries]);
  const seedFav = useMemo(() => Object.values(entries).filter((e) => (e.rating ?? 0) >= 4 || e.favorite).sort((a, b) => (b.rating ?? 4.5) - (a.rating ?? 4.5) || b.updatedAt - a.updatedAt)[0], [entries]);

  const heroes = (trending.data?.results ?? []).filter((m) => m.backdrop_path && m.media_type !== 'person').slice(0, 6);

  return (
    <div className="page home">
      {heroes.length ? <Hero items={heroes} /> : <div className="hero sk" />}
      <div className="home-greet">
        <span className="kicker">{greet}, {name}</span>
        <h1 className="display small">Cosa guardiamo stasera?</h1>
      </div>

      {continuing.length > 0 && (
        <Rail title="Continua a guardare" kicker="Le tue serie">
          {continuing.map((e) => <ContinueCard key={e.key} e={e} />)}
        </Rail>
      )}
      {watchlist.length > 0 && (
        <Rail title="Da vedere" kicker={`${watchlist.length} in lista`}>
          {watchlist.map((e) => <PosterCard key={e.key} m={asSummary(e)} />)}
        </Rail>
      )}
      {seedFav && <Because e={seedFav} />}
      <Section title="Di tendenza questa settimana" kicker="Ovunque" load={() => api.trending('all', 'week')} ranked />
      <Section title="Al cinema" kicker="In sala ora" load={api.nowPlaying} />
      <Section title="Serie del momento" kicker="Le più seguite" load={() => api.trending('tv', 'week')} />
      <PeopleSection />
      <Section title="Film più amati di sempre" kicker="Classici" load={() => api.topRated('movie')} />
      <Section title="Serie più amate di sempre" kicker="Classici" load={() => api.topRated('tv')} />
      <footer className="credit"><span className="tmdb-badge">TMDB</span> Dati e immagini da TMDB. Non approvato né certificato da TMDB.</footer>
    </div>
  );
}

function Hero({ items }: { items: MediaSummary[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setI((x) => (x + 1) % items.length), 6500);
    return () => clearInterval(t);
  }, [items.length, paused]);
  const m = items[i];
  const accent = useDominantColor(img.poster(m.poster_path, 'w154'));
  const kind = typeOf(m) === 'tv' ? 'tv' : 'movie';
  return (
    <section className="hero" style={{ ['--accent' as string]: accent }} onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)}>
      {items.map((h, j) => (
        <div key={h.id} className={`hero-bg ${j === i ? 'is-on' : ''}`}><Img src={img.backdrop(h.backdrop_path)} alt="" eager={j < 2} /></div>
      ))}
      <div className="hero-shade" />
      <div className="hero-body" key={m.id}>
        <span className="hero-tag"><Icon name="sparkle" size={14} /> N° {i + 1} di tendenza · {kind === 'tv' ? 'Serie TV' : 'Film'}</span>
        <h2 className="hero-title">{titleOf(m)}</h2>
        <div className="hero-meta">
          <span>{yearOf(m)}</span>
          {m.vote_average ? <span className="score"><b>{tmdbScore(m.vote_average)}%</b> gradimento</span> : null}
        </div>
        <p className="hero-overview">{m.overview}</p>
        <Link className="btn primary" to={`/${kind}/${m.id}`}>Apri scheda <Icon name="chevron" size={16} /></Link>
      </div>
      <div className="hero-dots">{items.map((h, j) => <button key={h.id} aria-label={`Vai a ${titleOf(h)}`} className={j === i ? 'is-on' : ''} onClick={() => setI(j)} />)}</div>
    </section>
  );
}

function Section({ title, kicker, load, ranked }: { title: string; kicker?: string; load: () => Promise<{ results: MediaSummary[] }>; ranked?: boolean }) {
  const { data, loading } = useAsync(load, [title]);
  if (loading && !data) return <RailSkeleton />;
  const items = (data?.results ?? []).filter((m) => m.poster_path && m.media_type !== 'person');
  if (!items.length) return null;
  return (
    <Rail title={title} kicker={kicker}>
      {items.map((m, i) => <PosterCard key={`${m.media_type}-${m.id}`} m={m} rank={ranked && i < 10 ? i + 1 : undefined} />)}
    </Rail>
  );
}

function PeopleSection() {
  const { data } = useAsync(() => api.trending('person', 'week'), []);
  const people = (data?.results ?? []).filter((p) => p.profile_path && p.known_for_department === 'Acting');
  if (!people.length) return null;
  return (
    <Rail title="Volti della settimana" kicker="Attori">
      {people.map((p) => <PersonCard key={p.id} id={p.id} name={titleOf(p)} path={p.profile_path ?? null} role={p.known_for?.[0] ? titleOf(p.known_for[0]) : undefined} />)}
    </Rail>
  );
}

function Because({ e }: { e: Entry }) {
  const { data } = useAsync<{ recommendations?: { results: MediaSummary[] } }>(() => (e.type === 'movie' ? api.movie(e.id) : api.tv(e.id)), [e.key]);
  const recs = (data?.recommendations?.results ?? []).filter((m) => m.poster_path);
  if (!recs.length) return null;
  return (
    <Rail title={<>Perché hai amato <em>{e.title}</em></>} kicker="Per te">
      {recs.map((m) => <PosterCard key={m.id} m={{ ...m, media_type: m.media_type ?? e.type }} />)}
    </Rail>
  );
}

function ContinueCard({ e }: { e: Entry }) {
  const all = useStore((s) => s.episodes);
  const eps = useMemo(() => Object.entries(all).filter(([k, v]) => k.startsWith(`tv:${e.id}:`) && v.watchedAt).sort((a, b) => b[1].watchedAt!.localeCompare(a[1].watchedAt!)), [all, e.id]);
  const last = eps[0];
  const [, , s, ep] = last?.[0].split(':') ?? [];
  return (
    <Link to={`/tv/${e.id}/season/${s?.slice(1) ?? 1}`} className="continue-card">
      <div className="continue-img"><Img src={img.backdrop(e.backdrop, 'w780')} alt={e.title} /></div>
      <div className="continue-body">
        <strong>{e.title}</strong>
        <span>Ultimo visto: {s?.toUpperCase()} · {ep?.toUpperCase()}</span>
        {e.rating ? <Stars value={e.rating} size={11} /> : <span className="muted">{eps.length} episodi visti</span>}
      </div>
      <span className="continue-play"><Icon name="play" size={14} fill strokeWidth={0} /></span>
    </Link>
  );
}
