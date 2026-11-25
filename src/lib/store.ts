// Archivio locale dell'utente: tutto resta sul dispositivo (localStorage).
import { useRef, useSyncExternalStore } from 'react';

export type Kind = 'movie' | 'tv';

export interface CastRef { id: number; name: string; profile_path: string | null }

export interface Entry {
  key: string;            // "movie:123" | "tv:456"
  type: Kind;
  id: number;
  title: string;
  poster: string | null;
  backdrop: string | null;
  year: string;
  genres: string[];
  runtime: number;        // minuti (film) o minuti per episodio (serie)
  cast: CastRef[];        // primi attori: alimenta le statistiche "attori più visti"
  rating?: number;        // 0.5 – 5, mezze stelle
  review?: string;
  watched?: boolean;
  watchedAt?: string;     // ISO
  watchlist?: boolean;
  favorite?: boolean;
  favAt?: number;         // ordine nel Pantheon
  updatedAt: number;
}

export interface EpisodeMark { rating?: number; watchedAt?: string; name?: string; runtime?: number }

export interface DiaryEvent {
  id: string;
  key: string;            // chiave dell'Entry
  date: string;           // ISO
  kind: 'movie' | 'show' | 'season' | 'episode';
  label?: string;         // es. "S2 · E5 — Titolo"
  rating?: number;
}

export interface Recommendation {
  id: string;
  type: Kind;
  mediaId: number;
  title: string;
  poster: string | null;
  backdrop?: string | null;
  year?: string;
  from: string;           // chi consiglia
  to?: string[];          // destinatari (solo per gli inviati)
  note?: string;
  rating?: number;
  date: string;
  seen?: boolean;
}

export interface FavPerson { id: number; name: string; profile_path: string | null; favAt: number }

export interface State {
  version: 1;
  apiKey: string;
  profile: { name: string; handle: string; bio: string; accent: string; createdAt: string; prefer: Kind };
  entries: Record<string, Entry>;
  seasons: Record<string, { rating?: number }>;      // "tv:1:s2"
  episodes: Record<string, EpisodeMark>;              // "tv:1:s2:e5"
  diary: DiaryEvent[];
  friends: string[];
  inbox: Recommendation[];
  sent: Recommendation[];
  people: Record<number, FavPerson>;
}

const KEY = 'fotogramma:v1';

const blank = (): State => ({
  version: 1,
  apiKey: '',
  profile: { name: '', handle: '', bio: '', accent: '#ffb547', createdAt: new Date().toISOString(), prefer: 'movie' },
  entries: {},
  seasons: {},
  episodes: {},
  diary: [],
  friends: [],
  inbox: [],
  sent: [],
  people: {},
});

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return { ...blank(), ...saved, profile: { ...blank().profile, ...saved.profile } };
    }
  } catch { /* storage non disponibile */ }
  return blank();
}

let state: State = load();
const listeners = new Set<() => void>();

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota o privacy mode */ }
}

export function getState() { return state; }

export function setState(fn: (s: State) => State) {
  state = fn(state);
  persist();
  listeners.forEach((l) => l());
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function shallowEqual(a: unknown, b: unknown) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

// il selettore può restituire array/oggetti nuovi: riusa il precedente se è equivalente
export function useStore<T>(sel: (s: State) => T): T {
  const last = useRef<{ v: T } | null>(null);
  const get = () => {
    const v = sel(state);
    if (last.current && shallowEqual(last.current.v, v)) return last.current.v;
    last.current = { v };
    return v;
  };
  return useSyncExternalStore(subscribe, get, get);
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const entryKey = (t: Kind, id: number) => `${t}:${id}`;
export const seasonKey = (id: number, s: number) => `tv:${id}:s${s}`;
export const episodeKey = (id: number, s: number, e: number) => `tv:${id}:s${s}:e${e}`;

export type EntrySeed = Omit<Entry, 'key' | 'updatedAt'>;

function upsert(s: State, seed: EntrySeed, patch: Partial<Entry>): State {
  const key = entryKey(seed.type, seed.id);
  const prev = s.entries[key];
  const next: Entry = { ...seed, ...(prev ?? {}), ...pickFresh(seed), ...patch, key, updatedAt: Date.now() };
  return { ...s, entries: { ...s.entries, [key]: next } };
}

// i metadati (poster, titolo…) si aggiornano sempre con quelli più freschi
function pickFresh(seed: EntrySeed): Partial<Entry> {
  const { title, poster, backdrop, year, genres, runtime, cast } = seed;
  const out: Partial<Entry> = { title, poster, backdrop, year };
  if (genres.length) out.genres = genres;
  if (runtime) out.runtime = runtime;
  if (cast.length) out.cast = cast;
  return out;
}

function logEvent(s: State, ev: Omit<DiaryEvent, 'id'>): State {
  return { ...s, diary: [{ ...ev, id: uid() }, ...s.diary] };
}

export const actions = {
  setApiKey: (apiKey: string) => setState((s) => ({ ...s, apiKey })),
  setProfile: (p: Partial<State['profile']>) => setState((s) => ({ ...s, profile: { ...s.profile, ...p } })),

  rate(seed: EntrySeed, rating: number | undefined) {
    setState((s) => {
      const prev = s.entries[entryKey(seed.type, seed.id)];
      let next = upsert(s, seed, { rating });
      // dare un voto implica averlo visto: film e serie vengono segnati come visti
      if (rating && !prev?.watched) {
        const now = new Date().toISOString();
        next = upsert(next, seed, { watched: true, watchedAt: now, watchlist: false });
        next = logEvent(next, { key: entryKey(seed.type, seed.id), date: now, kind: seed.type === 'movie' ? 'movie' : 'show', rating });
      } else if (rating) {
        const k = entryKey(seed.type, seed.id);
        const last = next.diary.find((d) => d.key === k && (d.kind === 'movie' || d.kind === 'show'));
        if (last && Date.now() - +new Date(last.date) < 1000 * 60 * 60 * 24) {
          next = { ...next, diary: next.diary.map((d) => (d === last ? { ...d, rating } : d)) };
        } else if (seed.type === 'tv') {
          next = logEvent(next, { key: k, date: new Date().toISOString(), kind: 'show', rating });
        }
      }
      return next;
    });
  },

  setReview: (seed: EntrySeed, review: string) => setState((s) => upsert(s, seed, { review })),

  toggleWatched(seed: EntrySeed) {
    setState((s) => {
      const prev = s.entries[entryKey(seed.type, seed.id)];
      if (prev?.watched) return upsert(s, seed, { watched: false });
      const now = new Date().toISOString();
      const next = upsert(s, seed, { watched: true, watchedAt: now, watchlist: false });
      return logEvent(next, { key: entryKey(seed.type, seed.id), date: now, kind: seed.type === 'movie' ? 'movie' : 'show', rating: prev?.rating });
    });
  },

  toggleWatchlist: (seed: EntrySeed) =>
    setState((s) => upsert(s, seed, { watchlist: !s.entries[entryKey(seed.type, seed.id)]?.watchlist })),

  toggleFavorite: (seed: EntrySeed) =>
    setState((s) => {
      const fav = !s.entries[entryKey(seed.type, seed.id)]?.favorite;
      return upsert(s, seed, { favorite: fav, favAt: fav ? Date.now() : undefined });
    }),

  moveFavorite(key: string, dir: -1 | 1) {
    setState((s) => {
      const e = s.entries[key];
      if (!e) return s;
      const list = Object.values(s.entries).filter((x) => x.favorite && x.type === e.type).sort((a, b) => (a.favAt ?? 0) - (b.favAt ?? 0));
      const i = list.findIndex((x) => x.key === key);
      const j = i + dir;
      if (j < 0 || j >= list.length) return s;
      const a = list[i], b = list[j];
      return { ...s, entries: { ...s.entries, [a.key]: { ...a, favAt: b.favAt }, [b.key]: { ...b, favAt: a.favAt } } };
    });
  },

  // eps: episodi già usciti della stagione; con un voto vengono segnati tutti come visti
  rateSeason: (seed: EntrySeed, season: number, rating: number | undefined, eps: { n: number; name: string; runtime?: number }[] = []) =>
    setState((s) => {
      let next = upsert(s, seed, rating ? { watchlist: false } : {});
      next = { ...next, seasons: { ...next.seasons, [seasonKey(seed.id, season)]: { rating } } };
      if (rating && eps.length) {
        const now = new Date().toISOString();
        const episodes = { ...next.episodes };
        for (const e of eps) {
          const k = episodeKey(seed.id, season, e.n);
          if (!episodes[k]?.watchedAt) episodes[k] = { ...episodes[k], watchedAt: now, name: e.name, runtime: e.runtime };
        }
        next = { ...next, episodes };
      }
      if (rating) next = logEvent(next, { key: entryKey('tv', seed.id), date: new Date().toISOString(), kind: 'season', label: `Stagione ${season}`, rating });
      return next;
    }),

  rateEpisode: (seed: EntrySeed, season: number, ep: number, name: string, rating: number | undefined, runtime?: number) =>
    setState((s) => {
      const k = episodeKey(seed.id, season, ep);
      const prev = s.episodes[k];
      const watchedAt = prev?.watchedAt ?? (rating ? new Date().toISOString() : undefined);
      let next = upsert(s, seed, { watchlist: false });
      next = { ...next, episodes: { ...next.episodes, [k]: { ...prev, rating, watchedAt, name, runtime } } };
      if (rating) next = logEvent(next, { key: entryKey('tv', seed.id), date: new Date().toISOString(), kind: 'episode', label: `S${season} · E${ep} — ${name}`, rating });
      return next;
    }),

  toggleEpisode: (seed: EntrySeed, season: number, ep: number, name: string, runtime?: number) =>
    setState((s) => {
      const k = episodeKey(seed.id, season, ep);
      const prev = s.episodes[k];
      if (prev?.watchedAt) {
        const { watchedAt: _w, ...rest } = prev;
        return { ...s, episodes: { ...s.episodes, [k]: rest } };
      }
      const now = new Date().toISOString();
      let next = upsert(s, seed, { watchlist: false });
      next = { ...next, episodes: { ...next.episodes, [k]: { ...prev, watchedAt: now, name, runtime } } };
      return logEvent(next, { key: entryKey('tv', seed.id), date: now, kind: 'episode', label: `S${season} · E${ep} — ${name}` });
    }),

  markSeason: (seed: EntrySeed, season: number, eps: { n: number; name: string; runtime?: number }[], watched: boolean) =>
    setState((s) => {
      const episodes = { ...s.episodes };
      const now = new Date().toISOString();
      for (const e of eps) {
        const k = episodeKey(seed.id, season, e.n);
        if (watched) episodes[k] = { ...episodes[k], watchedAt: episodes[k]?.watchedAt ?? now, name: e.name, runtime: e.runtime };
        else if (episodes[k]) { const { watchedAt: _w, ...rest } = episodes[k]; episodes[k] = rest; }
      }
      let next = upsert({ ...s, episodes }, seed, { watchlist: false });
      if (watched) next = logEvent(next, { key: entryKey('tv', seed.id), date: now, kind: 'season', label: `Stagione ${season} completata` });
      return next;
    }),

  removeDiary: (id: string) => setState((s) => ({ ...s, diary: s.diary.filter((d) => d.id !== id) })),

  // sposta una visione in un altro giorno (es. un film visto venerdì e segnato oggi)
  setDiaryDate: (id: string, date: string) =>
    setState((s) => {
      const ev = s.diary.find((d) => d.id === id);
      if (!ev) return s;
      const diary = s.diary.map((d) => (d.id === id ? { ...d, date } : d));
      const e = s.entries[ev.key];
      const entries = ev.kind === 'movie' && e?.watched ? { ...s.entries, [ev.key]: { ...e, watchedAt: date } } : s.entries;
      return { ...s, diary, entries };
    }),

  addFriend: (name: string) =>
    setState((s) => (s.friends.some((f) => f.toLowerCase() === name.toLowerCase()) ? s : { ...s, friends: [...s.friends, name] })),
  removeFriend: (name: string) => setState((s) => ({ ...s, friends: s.friends.filter((f) => f !== name) })),

  receive: (r: Recommendation) =>
    setState((s) => {
      const exists = s.inbox.some((x) => x.mediaId === r.mediaId && x.type === r.type && x.from === r.from);
      const friends = s.friends.some((f) => f.toLowerCase() === r.from.toLowerCase()) ? s.friends : [...s.friends, r.from];
      return exists ? { ...s, friends } : { ...s, friends, inbox: [r, ...s.inbox] };
    }),
  markRecSeen: (id: string) => setState((s) => ({ ...s, inbox: s.inbox.map((r) => (r.id === id ? { ...r, seen: true } : r)) })),
  removeRec: (id: string) => setState((s) => ({ ...s, inbox: s.inbox.filter((r) => r.id !== id) })),
  logSent: (r: Recommendation) => setState((s) => ({ ...s, sent: [r, ...s.sent] })),

  toggleFavPerson: (p: { id: number; name: string; profile_path: string | null }) =>
    setState((s) => {
      const people = { ...s.people };
      if (people[p.id]) delete people[p.id];
      else people[p.id] = { ...p, favAt: Date.now() };
      return { ...s, people };
    }),

  importAll: (data: State) => setState(() => ({ ...blank(), ...data, profile: { ...blank().profile, ...data.profile } })),
  reset: () => setState(() => blank()),
};
