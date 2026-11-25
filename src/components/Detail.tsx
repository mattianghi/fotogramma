// Mattoni condivisi fra le schede film e serie.
import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { Img, PersonCard, Rail } from './ui';
import { img, Provider, Video } from '../lib/tmdb';
import { useStore } from '../lib/store';
import { avatarColor } from './MediaActions';

export function BackButton() {
  const nav = useNavigate();
  return <button className="back-btn" onClick={() => (history.length > 1 ? nav(-1) : nav('/'))} aria-label="Indietro"><Icon name="back" size={20} /></button>;
}

export function DetailHero({ backdrop, poster, title, accent, kicker, meta, children, score }: {
  backdrop: string | null; poster: string | null; title: string; accent: string; kicker: ReactNode; meta: ReactNode; children?: ReactNode; score?: number;
}) {
  return (
    <header className="detail-hero" style={{ ['--accent' as string]: accent }}>
      <BackButton />
      <div className={`detail-backdrop ${backdrop ? '' : 'is-poster'}`}><Img src={backdrop ? img.backdrop(backdrop) : img.poster(poster, 'w780')} alt="" eager /></div>
      <div className="detail-tint" />
      <div className="detail-head">
        <div className="detail-poster"><Img src={img.poster(poster, 'w500')} alt={title} eager /></div>
        <div className="detail-titles">
          <span className="kicker">{kicker}</span>
          <h1 className="detail-title">{title}</h1>
          <div className="detail-meta">{meta}</div>
          {children}
        </div>
        {score ? <ScoreRing value={score} /> : null}
      </div>
    </header>
  );
}

export function ScoreRing({ value }: { value: number }) {
  const r = 22, c = 2 * Math.PI * r;
  return (
    <div className="score-ring" title="Gradimento del pubblico su TMDB">
      <svg viewBox="0 0 56 56" width="56" height="56">
        <circle cx="28" cy="28" r={r} className="track" />
        <circle cx="28" cy="28" r={r} className="bar" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
      </svg>
      <span>{value}<small>%</small></span>
    </div>
  );
}

export function Overview({ text, fallback }: { text: string; fallback?: string }) {
  const [open, setOpen] = useState(false);
  const t = text || fallback || 'Nessuna trama disponibile.';
  const long = t.length > 320;
  return (
    <section className="block overview">
      <p className={!open && long ? 'clamp' : ''}>{t}</p>
      {!text && fallback && <span className="muted small">Trama in inglese: quella in italiano non è ancora disponibile.</span>}
      {long && <button className="link-btn" onClick={() => setOpen(!open)}>{open ? 'Meno' : 'Leggi tutto'}</button>}
    </section>
  );
}

export function CastRail({ cast, title = 'Cast' }: { cast: { id: number; name: string; character?: string; profile_path: string | null; roles?: { character: string; episode_count: number }[]; total_episode_count?: number }[]; title?: string }) {
  if (!cast.length) return null;
  return (
    <Rail title={title} kicker={`${cast.length} interpreti`}>
      {cast.slice(0, 30).map((c) => (
        <PersonCard key={c.id} id={c.id} name={c.name} path={c.profile_path}
          role={c.roles ? `${c.roles[0]?.character || ''}${c.total_episode_count ? ` · ${c.total_episode_count} ep.` : ''}` : c.character} />
      ))}
    </Rail>
  );
}

export function Crew({ people }: { people: { id: number; name: string; job: string }[] }) {
  if (!people.length) return null;
  return (
    <section className="block crew">
      {people.map((p) => (
        <a key={`${p.id}-${p.job}`} href={`#/person/${p.id}`} className="crew-item"><span className="muted small">{p.job}</span><strong>{p.name}</strong></a>
      ))}
    </section>
  );
}

export function Trailer({ videos }: { videos?: Video[] }) {
  const v = videos?.filter((x) => x.site === 'YouTube').sort((a, b) => score(b) - score(a))[0];
  const [play, setPlay] = useState(false);
  if (!v) return null;
  return (
    <section className="block">
      <h2 className="rail-title">Trailer</h2>
      <div className="trailer">
        {play ? (
          <iframe src={`https://www.youtube-nocookie.com/embed/${v.key}?autoplay=1&rel=0`} title={v.name} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
        ) : (
          <button onClick={() => setPlay(true)} aria-label={`Guarda ${v.name}`}>
            <Img src={`https://i.ytimg.com/vi/${v.key}/hqdefault.jpg`} alt={v.name} />
            <span className="trailer-play"><Icon name="play" size={26} fill strokeWidth={0} /></span>
            <span className="trailer-name">{v.name}</span>
          </button>
        )}
      </div>
    </section>
  );
}
const score = (v: Video) => (v.type === 'Trailer' ? 4 : v.type === 'Teaser' ? 2 : 0) + (v.official ? 1 : 0);

export function Providers({ data }: { data?: Record<string, { flatrate?: Provider[]; rent?: Provider[]; buy?: Provider[]; link?: string }> }) {
  const it = data?.IT;
  const list = it?.flatrate ?? it?.rent ?? it?.buy;
  if (!list?.length) return null;
  const label = it?.flatrate ? 'In streaming su' : it?.rent ? 'A noleggio su' : 'In vendita su';
  return (
    <section className="block providers">
      <span className="kicker">{label}</span>
      <div className="provider-row">
        {list.slice(0, 6).map((p) => <a key={p.provider_id} href={it?.link} target="_blank" rel="noreferrer" title={p.provider_name}><Img src={img.logo(p.logo_path)} alt={p.provider_name} /></a>)}
      </div>
    </section>
  );
}

// consigli ricevuti dagli amici per questo titolo
export function FriendNotes({ type, id }: { type: 'movie' | 'tv'; id: number }) {
  const recs = useStore((s) => s.inbox.filter((r) => r.type === type && r.mediaId === id));
  if (!recs.length) return null;
  return (
    <section className="block friend-notes">
      {recs.map((r) => (
        <div key={r.id} className="friend-note">
          <span className="avatar-sm" style={{ background: avatarColor(r.from) }}>{r.from[0]?.toUpperCase()}</span>
          <div><strong>{r.from}</strong> te l'ha consigliato{r.rating ? ` · ★ ${r.rating}` : ''}{r.note && <p>“{r.note}”</p>}</div>
        </div>
      ))}
    </section>
  );
}
