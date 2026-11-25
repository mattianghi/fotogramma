import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { actions, Entry, FavPerson, useStore } from '../lib/store';
import { img } from '../lib/tmdb';
import { fmtRating, plural, useDominantColor } from '../lib/util';
import { Empty, Img, Segmented, Stars } from '../components/ui';
import { Icon } from '../components/Icon';
import { avatarColor } from '../components/MediaActions';

type Shelf = 'movie' | 'tv' | 'people';

export default function Profile() {
  const profile = useStore((s) => s.profile);
  const entries = useStore((s) => s.entries);
  const episodes = useStore((s) => s.episodes);
  const people = useStore((s) => s.people);
  const [shelf, setShelf] = useState<Shelf>('movie');

  const all = Object.values(entries);
  const favs = useMemo(() => all.filter((e) => e.favorite && (shelf === 'people' ? false : e.type === shelf)).sort((a, b) => (a.favAt ?? 0) - (b.favAt ?? 0)), [entries, shelf]);
  const favPeople = useMemo(() => Object.values(people).sort((a, b) => a.favAt - b.favAt), [people]);

  const stats = useMemo(() => {
    const movies = all.filter((e) => e.type === 'movie' && e.watched);
    const eps = Object.values(episodes).filter((e) => e.watchedAt);
    const shows = new Set(Object.keys(episodes).filter((k) => episodes[k].watchedAt).map((k) => k.split(':')[1]));
    all.filter((e) => e.type === 'tv' && e.watched).forEach((e) => shows.add(String(e.id)));
    const minutes = movies.reduce((a, e) => a + (e.runtime || 110), 0) + eps.reduce((a, e) => a + (e.runtime || 45), 0);
    const ratings = [...all.map((e) => e.rating), ...Object.values(episodes).map((e) => e.rating)].filter(Boolean) as number[];
    const dist = Array.from({ length: 10 }, (_, i) => all.filter((e) => e.rating === (i + 1) / 2).length);
    const genres = new Map<string, number>();
    all.filter((e) => e.watched || e.rating).forEach((e) => e.genres.forEach((g) => genres.set(g, (genres.get(g) ?? 0) + 1)));
    const actors = new Map<number, { id: number; name: string; profile_path: string | null; n: number }>();
    all.filter((e) => e.watched || e.rating).forEach((e) => e.cast.slice(0, 6).forEach((c) => {
      const a = actors.get(c.id) ?? { ...c, n: 0 };
      a.n++; actors.set(c.id, a);
    }));
    return {
      movies: movies.length, shows: shows.size, eps: eps.length, hours: Math.round(minutes / 60),
      avg: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0, rated: all.filter((e) => e.rating).length,
      dist, genres: [...genres.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
      actors: [...actors.values()].filter((a) => a.n > 1).sort((a, b) => b.n - a.n).slice(0, 12),
      watchlist: all.filter((e) => e.watchlist).length,
    };
  }, [entries, episodes]);

  return (
    <div className="page profile">
      <Pantheon items={favs} people={favPeople} shelf={shelf} name={profile.name}
        header={
          <div className="profile-id">
            <span className="avatar-lg" style={{ background: avatarColor(profile.name) }}>{profile.name[0]?.toUpperCase()}</span>
            <div>
              <h1 className="profile-name">{profile.name}</h1>
              <span className="muted small">@{profile.handle || 'cinefilo'} · {plural(stats.movies, 'film', 'film')} · {plural(stats.shows, 'serie', 'serie')}</span>
            </div>
            <Link to="/settings" className="icon-btn" aria-label="Impostazioni"><Icon name="settings" size={20} /></Link>
          </div>
        }
        switcher={<Segmented value={shelf} onChange={setShelf} options={[{ value: 'movie', label: 'Film' }, { value: 'tv', label: 'Serie' }, { value: 'people', label: 'Attori' }]} />}
      />
      {profile.bio && <p className="profile-bio">{profile.bio}</p>}

      <section className="stat-grid">
        <Stat n={stats.movies} label="film visti" to="/me/movies" />
        <Stat n={stats.eps} label="episodi visti" to="/me/shows" />
        <Stat n={stats.hours} label="ore davanti allo schermo" />
        <Stat n={stats.avg ? fmtRating(Math.round(stats.avg * 10) / 10) : '–'} label="voto medio" to="/me/rated" star />
      </section>

      <nav className="lib-links">
        <Link to="/me/watchlist"><Icon name="bookmark" size={18} /> Da vedere <b>{stats.watchlist}</b><Icon name="chevron" size={16} /></Link>
        <Link to="/me/rated"><Icon name="star" size={18} /> Valutazioni <b>{stats.rated}</b><Icon name="chevron" size={16} /></Link>
        <Link to="/diary"><Icon name="diary" size={18} /> Diario <Icon name="chevron" size={16} /></Link>
      </nav>

      {stats.rated > 0 && (
        <section className="block card">
          <h2 className="rail-title">Come voti</h2>
          <div className="dist">
            {stats.dist.map((n, i) => {
              const max = Math.max(...stats.dist, 1);
              return <div key={i} className="dist-col" title={`${(i + 1) / 2} ★: ${n}`}><i style={{ height: `${(n / max) * 100}%` }} /><span>{(i + 1) % 2 === 0 ? (i + 1) / 2 : ''}</span></div>;
            })}
          </div>
          <p className="muted small">{stats.avg >= 4 ? 'Hai il cuore tenero: voti generosi.' : stats.avg >= 3 ? 'Un critico equilibrato.' : 'Palato esigente: pochi passano l\'esame.'}</p>
        </section>
      )}

      {stats.genres.length > 0 && (
        <section className="block card">
          <h2 className="rail-title">I tuoi generi</h2>
          <ul className="genre-bars">
            {stats.genres.map(([g, n]) => <li key={g}><span>{g}</span><i style={{ width: `${(n / stats.genres[0][1]) * 100}%` }} /><b>{n}</b></li>)}
          </ul>
        </section>
      )}

      {stats.actors.length > 0 && (
        <section className="block">
          <h2 className="rail-title">I volti che vedi più spesso</h2>
          <div className="rail-track">
            {stats.actors.map((a) => (
              <Link key={a.id} to={`/person/${a.id}`} className="person-card">
                <div className="person-photo"><Img src={img.profile(a.profile_path)} alt={a.name} /><span className="person-count">{a.n}×</span></div>
                <span className="person-name">{a.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {stats.movies + stats.eps === 0 && (
        <Empty icon="film" title="Il tuo profilo prende vita con i film">Segna i titoli che hai visto, dai un voto e premi il cuore sui tuoi preferiti: compariranno qui in alto, nel tuo Pantheon.</Empty>
      )}
    </div>
  );
}

function Stat({ n, label, to, star }: { n: number | string; label: string; to?: string; star?: boolean }) {
  const body = <><strong>{typeof n === 'number' ? n.toLocaleString('it-IT') : n}{star && <Icon name="star" size={18} fill strokeWidth={0} />}</strong><span>{label}</span></>;
  return to ? <Link to={to} className="stat">{body}</Link> : <div className="stat">{body}</div>;
}

// ---------------- Pantheon: coverflow 3D dei preferiti ----------------
function Pantheon({ items, people, shelf, header, switcher, name }: { items: Entry[]; people: FavPerson[]; shelf: Shelf; header: React.ReactNode; switcher: React.ReactNode; name: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const cards = shelf === 'people'
    ? people.map((p) => ({ key: `p${p.id}`, to: `/person/${p.id}`, img: img.profile(p.profile_path, 'h632'), bg: img.profile(p.profile_path, 'h632'), title: p.name, sub: 'Attore preferito', rating: undefined as number | undefined, entryKey: undefined as string | undefined }))
    : items.map((e) => ({ key: e.key, to: `/${e.type}/${e.id}`, img: img.poster(e.poster, 'w500'), bg: img.backdrop(e.backdrop), title: e.title, sub: e.year, rating: e.rating, entryKey: e.key }));
  const cur = cards[Math.min(active, cards.length - 1)];
  const accent = useDominantColor(cur ? (shelf === 'people' ? cur.img : img.poster(items[Math.min(active, items.length - 1)]?.poster, 'w154')) : undefined);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      const mid = el.scrollLeft + el.clientWidth / 2;
      let best = 0, bestD = Infinity;
      [...el.children].forEach((child, i) => {
        const c = child as HTMLElement;
        const center = c.offsetLeft + c.offsetWidth / 2;
        const off = (center - mid) / c.offsetWidth;
        const a = Math.min(Math.abs(off), 3);
        c.style.setProperty('--off', off.toFixed(3));
        c.style.setProperty('--abs', a.toFixed(3));
        c.style.zIndex = String(100 - Math.round(a * 10));
        if (Math.abs(off) < bestD) { bestD = Math.abs(off); best = i; }
      });
      setActive(best);
    };
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    update();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { el.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, [cards.length, shelf]);

  useEffect(() => { track.current?.scrollTo({ left: 0 }); setActive(0); }, [shelf]);

  const go = (i: number) => {
    const el = track.current, c = el?.children[i] as HTMLElement | undefined;
    if (el && c) el.scrollTo({ left: c.offsetLeft + c.offsetWidth / 2 - el.clientWidth / 2, behavior: 'smooth' });
  };

  return (
    <section className="pantheon" style={{ ['--accent' as string]: accent }}>
      <div className="pantheon-bg">{cur && <Img key={cur.bg} src={cur.bg} alt="" eager />}</div>
      <div className="pantheon-shade" />
      <div className="pantheon-inner">
        {header}
        <div className="pantheon-title">
          <div>
            <span className="kicker">Il Pantheon di {name}</span>
            <h2 className="display small">{shelf === 'movie' ? 'I film della vita' : shelf === 'tv' ? 'Le serie del cuore' : 'Volti del cuore'}</h2>
          </div>
          {switcher}
        </div>
        {cards.length === 0 ? (
          <div className="pantheon-empty">
            <div className="ghost-cards"><span /><span /><span /></div>
            <p>Premi <Icon name="heart" size={14} fill /> su {shelf === 'people' ? 'un attore' : shelf === 'movie' ? 'un film' : 'una serie'} per metterlo qui, in prima fila.</p>
            <Link to="/search" className="btn ghost">Cerca qualcosa</Link>
          </div>
        ) : (
          <>
            <div className="coverflow" ref={track}>
              {cards.map((c, i) => (
                <div key={c.key} className="cf-item" onClick={(e) => { if (i !== active) { e.preventDefault(); go(i); } }}>
                  <span className="cf-rank" aria-hidden="true">{i + 1}</span>
                  <Link to={c.to} className={`cf-card ${shelf === 'people' ? 'is-person' : ''}`} onClick={(e) => { if (i !== active) e.preventDefault(); }}>
                    <Img src={c.img} alt={c.title} eager={i < 4} />
                    <span className="cf-shine" />
                  </Link>
                </div>
              ))}
            </div>
            {cur && (
              <div className="cf-caption" key={cur.key}>
                <strong>{cur.title}</strong>
                <span>{cur.sub}{cur.rating ? <> · <Stars value={cur.rating} size={12} /></> : null}</span>
                {cur.entryKey && cards.length > 1 && (
                  <span className="cf-order">
                    <button className="icon-btn sm" disabled={active === 0} onClick={() => { actions.moveFavorite(cur.entryKey!, -1); setTimeout(() => go(active - 1), 30); }} aria-label="Sposta prima"><Icon name="back" size={15} /></button>
                    <span>N° {active + 1}</span>
                    <button className="icon-btn sm" disabled={active === cards.length - 1} onClick={() => { actions.moveFavorite(cur.entryKey!, 1); setTimeout(() => go(active + 1), 30); }} aria-label="Sposta dopo"><Icon name="chevron" size={15} /></button>
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
