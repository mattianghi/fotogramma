import { useEffect, useState } from 'react';
import type { MovieDetail, TvDetail } from './tmdb';
import { yearOf, titleOf } from './tmdb';
import type { EntrySeed, Recommendation } from './store';

export function seedFromMovie(m: MovieDetail): EntrySeed {
  return {
    type: 'movie', id: m.id, title: titleOf(m), poster: m.poster_path, backdrop: m.backdrop_path, year: yearOf(m),
    genres: m.genres.map((g) => g.name), runtime: m.runtime ?? 0,
    cast: m.credits.cast.slice(0, 8).map(({ id, name, profile_path }) => ({ id, name, profile_path })),
  };
}

export function seedFromTv(t: TvDetail): EntrySeed {
  return {
    type: 'tv', id: t.id, title: titleOf(t), poster: t.poster_path, backdrop: t.backdrop_path, year: yearOf(t),
    genres: t.genres.map((g) => g.name), runtime: t.episode_run_time?.[0] ?? 0,
    cast: t.aggregate_credits.cast.slice(0, 8).map(({ id, name, profile_path }) => ({ id, name, profile_path })),
  };
}

// ---- colore dominante da un'immagine (per tingere le pagine) ----
const colorCache = new Map<string, string>();

export function useDominantColor(src: string | undefined, fallback = '#ffb547') {
  const [color, setColor] = useState(() => (src && colorCache.get(src)) || fallback);
  useEffect(() => {
    if (!src) { setColor(fallback); return; }
    const hit = colorCache.get(src);
    if (hit) { setColor(hit); return; }
    let alive = true;
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = c.height = 24;
        const ctx = c.getContext('2d', { willReadFrequently: true })!;
        ctx.drawImage(im, 0, 0, 24, 24);
        const d = ctx.getImageData(0, 0, 24, 24).data;
        // scegli il pixel più "vivace" pesando saturazione e luminosità
        let best = { s: -1, r: 255, g: 181, b: 71 };
        const buckets = new Map<string, { n: number; r: number; g: number; b: number; s: number }>();
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          const l = (max + min) / 510;
          const sat = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));
          if (l < 0.12 || l > 0.92) continue;
          const k = `${r >> 5}-${g >> 5}-${b >> 5}`;
          const bk = buckets.get(k) ?? { n: 0, r: 0, g: 0, b: 0, s: 0 };
          bk.n++; bk.r += r; bk.g += g; bk.b += b; bk.s += sat;
          buckets.set(k, bk);
        }
        for (const bk of buckets.values()) {
          const score = (bk.s / bk.n) * Math.sqrt(bk.n);
          if (score > best.s) best = { s: score, r: bk.r / bk.n, g: bk.g / bk.n, b: bk.b / bk.n };
        }
        const out = vivid(best.r, best.g, best.b);
        colorCache.set(src, out);
        if (alive) setColor(out);
      } catch { /* canvas "tainted": resta il fallback */ }
    };
    // parametro extra: evita di riusare dalla cache una copia scaricata senza intestazioni CORS
    im.src = `${src}${src.includes('?') ? '&' : '?'}cors=1`;
    return () => { alive = false; };
  }, [src, fallback]);
  return color;
}

// porta il colore a una luminosità leggibile su sfondo scuro
function vivid(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0; const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d) {
    if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  const S = Math.min(1, Math.max(0.55, s * 1.25));
  const L = Math.min(0.72, Math.max(0.6, l));
  return `hsl(${Math.round(h)} ${Math.round(S * 100)}% ${Math.round(L * 100)}%)`;
}

// ---- formattazione ----
export const fmtRuntime = (min?: number | null) => {
  if (!min) return '';
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} h ${m ? `${m} min` : ''}`.trim() : `${m} min`;
};
export const fmtDate = (iso?: string | null, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) =>
  iso ? new Date(iso).toLocaleDateString('it-IT', opts) : '';
export const fmtRating = (r?: number) => (r ? r.toLocaleString('it-IT', { minimumFractionDigits: r % 1 ? 1 : 0 }) : '–');
export const tmdbScore = (v?: number) => (v ? Math.round(v * 10) : 0);
export const plural = (n: number, one: string, many: string) => `${n.toLocaleString('it-IT')} ${n === 1 ? one : many}`;

// ---- link di consiglio: tutto il contenuto viaggia nel link, niente server ----
type RecPayload = Pick<Recommendation, 'type' | 'mediaId' | 'title' | 'poster' | 'backdrop' | 'year' | 'from' | 'note' | 'rating'>;

const b64url = {
  enc: (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))),
};

export function encodeRec(p: RecPayload) {
  const compact = { t: p.type === 'movie' ? 'm' : 't', i: p.mediaId, ti: p.title, p: p.poster, b: p.backdrop, y: p.year, f: p.from, n: p.note || undefined, r: p.rating || undefined };
  return b64url.enc(JSON.stringify(compact));
}

export function decodeRec(code: string): RecPayload | null {
  try {
    const c = JSON.parse(b64url.dec(code));
    if (!c.i || !c.f) return null;
    return { type: c.t === 'm' ? 'movie' : 'tv', mediaId: c.i, title: c.ti, poster: c.p ?? null, backdrop: c.b ?? null, year: c.y, from: String(c.f).slice(0, 40), note: c.n ? String(c.n).slice(0, 400) : undefined, rating: c.r };
  } catch { return null; }
}

export const recLink = (code: string) => `${location.origin}${location.pathname}#/r/${code}`;

export function useMedia(query: string) {
  const [m, setM] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const mq = matchMedia(query);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return m;
}
