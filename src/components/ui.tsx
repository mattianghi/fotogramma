import { ReactNode, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { img, MediaSummary, titleOf, yearOf, typeOf } from '../lib/tmdb';
import { useStore, entryKey } from '../lib/store';
import { fmtRating } from '../lib/util';

// ---------- immagine con dissolvenza ----------
export function Img({ src, alt, className, eager }: { src: string; alt: string; className?: string; eager?: boolean }) {
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState(false);
  if (!src || err) return <div className={`img-fallback ${className ?? ''}`} aria-label={alt}><span>{alt.slice(0, 1)}</span></div>;
  return (
    <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" className={`${className ?? ''} img-fade ${ok ? 'is-in' : ''}`}
      onLoad={() => setOk(true)} onError={() => setErr(true)} />
  );
}

// ---------- locandina ----------
export function PosterCard({ m, size = 'md', rank, sub }: { m: MediaSummary; size?: 'sm' | 'md' | 'lg'; rank?: number; sub?: ReactNode }) {
  const t = typeOf(m);
  const kind = t === 'person' ? 'movie' : t;
  const entry = useStore((s) => s.entries[entryKey(kind, m.id)]);
  const title = titleOf(m);
  return (
    <Link to={`/${kind}/${m.id}`} className={`poster-card poster-${size}`}>
      <div className="poster-frame">
        <Img src={img.poster(m.poster_path, size === 'lg' ? 'w500' : 'w342')} alt={title} />
        {entry?.rating ? <span className="poster-badge"><Icon name="star" size={11} fill strokeWidth={0} />{fmtRating(entry.rating)}</span>
          : entry?.watched ? <span className="poster-badge"><Icon name="check" size={12} strokeWidth={3} /></span>
          : entry?.watchlist ? <span className="poster-badge is-soft"><Icon name="bookmark" size={11} fill strokeWidth={0} /></span> : null}
        {entry?.favorite && <span className="poster-heart"><Icon name="heart" size={13} fill strokeWidth={0} /></span>}
      </div>
      {rank !== undefined && <span className="poster-rank">{rank}</span>}
      <div className="poster-meta">
        <span className="poster-title">{title}</span>
        <span className="poster-sub">{sub ?? `${yearOf(m) || '—'} · ${kind === 'movie' ? 'Film' : 'Serie'}`}</span>
      </div>
    </Link>
  );
}

// ---------- riga orizzontale scorrevole ----------
export function Rail({ title, kicker, children, action }: { title: ReactNode; kicker?: string; children: ReactNode; action?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const nudge = (d: number) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <section className="rail">
      <header className="rail-head">
        <div>
          {kicker && <span className="kicker">{kicker}</span>}
          <h2 className="rail-title">{title}</h2>
        </div>
        <div className="rail-actions">
          {action}
          <button className="icon-btn hide-touch" onClick={() => nudge(-1)} aria-label="Indietro"><Icon name="back" size={18} /></button>
          <button className="icon-btn hide-touch" onClick={() => nudge(1)} aria-label="Avanti"><Icon name="chevron" size={18} /></button>
        </div>
      </header>
      <div className="rail-track" ref={ref}>{children}</div>
    </section>
  );
}

export function RailSkeleton({ n = 6 }: { n?: number }) {
  return (
    <section className="rail">
      <header className="rail-head"><div><div className="sk sk-line" style={{ width: 160, height: 22 }} /></div></header>
      <div className="rail-track">{Array.from({ length: n }, (_, i) => <div key={i} className="poster-card poster-md"><div className="poster-frame sk" /></div>)}</div>
    </section>
  );
}

// ---------- persona (attore) ----------
export function PersonCard({ id, name, role, path, small }: { id: number; name: string; role?: string; path: string | null; small?: boolean }) {
  return (
    <Link to={`/person/${id}`} className={`person-card ${small ? 'is-small' : ''}`}>
      <div className="person-photo"><Img src={img.profile(path)} alt={name} /></div>
      <span className="person-name">{name}</span>
      {role && <span className="person-role">{role}</span>}
    </Link>
  );
}

// ---------- stelle ----------
export function Stars({ value = 0, size = 14 }: { value?: number; size?: number }) {
  return (
    <span className="stars" style={{ ['--s' as string]: `${size}px` }} aria-label={`${value} su 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fillPct = Math.max(0, Math.min(1, value - (i - 1))) * 100;
        return (
          <span key={i} className="star">
            <Icon name="star" size={size} fill strokeWidth={0} className="star-bg" />
            <span className="star-fill" style={{ width: `${fillPct}%` }}><Icon name="star" size={size} fill strokeWidth={0} /></span>
          </span>
        );
      })}
    </span>
  );
}

// valutazione interattiva a mezze stelle: tocca o trascina
export function StarInput({ value, onChange, size = 40 }: { value?: number; onChange: (v: number | undefined) => void; size?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const dragging = useRef(false);
  const calc = (x: number) => {
    const r = ref.current!.getBoundingClientRect();
    const v = Math.ceil(((x - r.left) / r.width) * 10) / 2;
    return Math.max(0.5, Math.min(5, v));
  };
  const shown = hover ?? value ?? 0;
  return (
    <div className="star-input" ref={ref} role="slider" aria-valuemin={0.5} aria-valuemax={5} aria-valuenow={value ?? 0} aria-label="Valutazione" tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange(Math.min(5, (value ?? 0) + 0.5));
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange(Math.max(0.5, (value ?? 1) - 0.5));
      }}
      onPointerDown={(e) => { dragging.current = true; (e.target as Element).setPointerCapture?.(e.pointerId); setHover(calc(e.clientX)); }}
      onPointerMove={(e) => { if (dragging.current || e.pointerType === 'mouse') setHover(calc(e.clientX)); }}
      onPointerUp={(e) => { dragging.current = false; const v = calc(e.clientX); setHover(null); onChange(v === value ? undefined : v); navigator.vibrate?.(8); }}
      onPointerLeave={() => { if (!dragging.current) setHover(null); }}
    >
      <Stars value={shown} size={size} />
    </div>
  );
}

export const ratingWords = ['', 'Pessimo', 'Scarso', 'Deludente', 'Così così', 'Nella media', 'Discreto', 'Buono', 'Ottimo', 'Splendido', 'Capolavoro'];

// ---------- bottom sheet ----------
export function Sheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    document.body.classList.add('no-scroll');
    return () => { window.removeEventListener('keydown', k); document.body.classList.remove('no-scroll'); };
  }, [open, onClose]);
  if (!open) return null;
  // portal: le animazioni con transform della pagina non devono "intrappolare" il position: fixed
  return createPortal(
    <div className="sheet-wrap" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        {title && <header className="sheet-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose} aria-label="Chiudi"><Icon name="close" size={18} /></button></header>}
        {children}
      </div>
    </div>,
    document.body,
  );
}

// ---------- toast ----------
let toastMsg: { text: string; id: number } | null = null;
const toastSubs = new Set<() => void>();
export function toast(text: string) {
  toastMsg = { text, id: Date.now() };
  toastSubs.forEach((f) => f());
  setTimeout(() => { if (toastMsg && Date.now() - toastMsg.id >= 2400) { toastMsg = null; toastSubs.forEach((f) => f()); } }, 2500);
}
export function Toaster() {
  const msg = useSyncExternalStore((f) => { toastSubs.add(f); return () => toastSubs.delete(f); }, () => toastMsg);
  return createPortal(<div className={`toast ${msg ? 'is-on' : ''}`} role="status">{msg?.text}</div>, document.body);
}

export function Empty({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name={icon} size={28} /></div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={o.value === value} className={o.value === value ? 'is-on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function ErrorBox({ error }: { error: Error }) {
  const status = (error as Error & { status?: number }).status;
  const retry = <button className="btn ghost sm retry" onClick={() => location.reload()}>Riprova</button>;
  if (status === 0 || !navigator.onLine)
    return <Empty icon="close" title="Sei offline">Controlla la connessione e riprova. I tuoi voti, il diario e il profilo restano consultabili.<br />{retry}</Empty>;
  if (status === 404) return <Empty icon="search" title="Non l'abbiamo trovato">Questo titolo o questa persona non esiste più nel catalogo. Prova a cercarlo di nuovo.</Empty>;
  if (status === 401) return <Empty icon="close" title="Chiave TMDB non valida">Controlla la chiave nelle impostazioni.</Empty>;
  return <Empty icon="close" title="Qualcosa è andato storto">Il catalogo non risponde in questo momento.<br />{retry}</Empty>;
}
