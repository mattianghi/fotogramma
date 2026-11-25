// Client TMDB (The Movie Database). Supporta sia la API key v3 sia il token v4.
import { getState } from './store';

const API = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p/';
const LANG = 'it-IT';

export type MediaType = 'movie' | 'tv';

export interface Genre { id: number; name: string }
export interface CastMember {
  id: number; name: string; character?: string; profile_path: string | null; order?: number;
  roles?: { character: string; episode_count: number }[]; total_episode_count?: number;
}
export interface CrewMember { id: number; name: string; job: string; department: string; profile_path: string | null }
export interface Video { key: string; site: string; type: string; name: string; official?: boolean }

export interface MediaSummary {
  id: number; media_type?: 'movie' | 'tv' | 'person';
  title?: string; name?: string; original_title?: string; original_name?: string;
  poster_path: string | null; backdrop_path: string | null; profile_path?: string | null;
  release_date?: string; first_air_date?: string; vote_average?: number; overview?: string;
  genre_ids?: number[]; known_for_department?: string; known_for?: MediaSummary[];
  character?: string; job?: string; episode_count?: number; popularity?: number; vote_count?: number;
}

export interface MovieDetail extends MediaSummary {
  runtime: number | null; genres: Genre[]; tagline?: string; status?: string;
  credits: { cast: CastMember[]; crew: CrewMember[] };
  videos?: { results: Video[] };
  recommendations?: { results: MediaSummary[] };
  similar?: { results: MediaSummary[] };
  production_countries?: { iso_3166_1: string; name: string }[];
  'watch/providers'?: { results: Record<string, { flatrate?: Provider[]; rent?: Provider[]; buy?: Provider[]; link?: string }> };
}
export interface Provider { provider_id: number; provider_name: string; logo_path: string }

export interface SeasonSummary {
  id: number; season_number: number; name: string; episode_count: number;
  poster_path: string | null; air_date: string | null; overview?: string; vote_average?: number;
}
export interface TvDetail extends MediaSummary {
  genres: Genre[]; tagline?: string; status?: string; number_of_seasons: number; number_of_episodes: number;
  episode_run_time?: number[]; seasons: SeasonSummary[]; networks?: { id: number; name: string; logo_path: string | null }[];
  created_by?: { id: number; name: string; profile_path: string | null }[];
  aggregate_credits: { cast: CastMember[]; crew: CrewMember[] };
  videos?: { results: Video[] };
  recommendations?: { results: MediaSummary[] };
  last_air_date?: string; in_production?: boolean;
  'watch/providers'?: MovieDetail['watch/providers'];
}
export interface Episode {
  id: number; episode_number: number; season_number: number; name: string; overview: string;
  still_path: string | null; air_date: string | null; runtime: number | null; vote_average: number;
  guest_stars?: CastMember[];
}
export interface SeasonDetail {
  id: number; season_number: number; name: string; overview: string; poster_path: string | null;
  air_date: string | null; episodes: Episode[];
}
export interface PersonDetail {
  id: number; name: string; biography: string; birthday: string | null; deathday: string | null;
  place_of_birth: string | null; profile_path: string | null; known_for_department: string;
  combined_credits: { cast: MediaSummary[]; crew: MediaSummary[] };
  images?: { profiles: { file_path: string }[] };
}
export interface Paged<T> { page: number; results: T[]; total_pages: number; total_results: number }

export class TmdbError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

const cache = new Map<string, Promise<unknown>>();

function authFor(key: string): { headers: Record<string, string>; param: string } {
  const k = key.trim();
  if (k.startsWith('eyJ')) return { headers: { Authorization: `Bearer ${k}` }, param: '' };
  return { headers: {}, param: k };
}

export function activeKey(): string {
  return getState().apiKey || (import.meta.env.VITE_TMDB_KEY as string | undefined) || '';
}

export async function tmdb<T>(path: string, params: Record<string, string | number | undefined> = {}, keyOverride?: string): Promise<T> {
  const key = keyOverride ?? activeKey();
  if (!key) throw new TmdbError('Chiave TMDB mancante', 401);
  const { headers, param } = authFor(key);
  const qs = new URLSearchParams();
  if (!('language' in params)) qs.set('language', LANG);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') qs.set(k, String(v));
  if (param) qs.set('api_key', param);
  const url = `${API}${path}?${qs}`;
  const cacheKey = keyOverride ? `${url}#probe` : url;
  if (!keyOverride && cache.has(cacheKey)) return cache.get(cacheKey) as Promise<T>;
  const p = fetch(url, { headers }).then(async (r) => {
    if (!r.ok) {
      cache.delete(cacheKey);
      throw new TmdbError(r.status === 401 ? 'Chiave TMDB non valida' : `Errore TMDB (${r.status})`, r.status);
    }
    return r.json() as Promise<T>;
  }, (e) => { cache.delete(cacheKey); throw e; });
  if (!keyOverride) cache.set(cacheKey, p);
  return p;
}

export const verifyKey = (key: string) => tmdb<{ images: unknown }>('/configuration', {}, key);

export const img = {
  poster: (p: string | null | undefined, size: 'w154' | 'w342' | 'w500' | 'w780' = 'w342') => (p ? `${IMG}${size}${p}` : ''),
  backdrop: (p: string | null | undefined, size: 'w780' | 'w1280' | 'original' = 'w1280') => (p ? `${IMG}${size}${p}` : ''),
  profile: (p: string | null | undefined, size: 'w185' | 'h632' = 'w185') => (p ? `${IMG}${size}${p}` : ''),
  still: (p: string | null | undefined, size: 'w300' | 'w780' = 'w300') => (p ? `${IMG}${size}${p}` : ''),
  logo: (p: string | null | undefined) => (p ? `${IMG}w92${p}` : ''),
};

export const titleOf = (m: { title?: string; name?: string }) => m.title || m.name || '';
export const dateOf = (m: { release_date?: string; first_air_date?: string }) => m.release_date || m.first_air_date || '';
export const yearOf = (m: { release_date?: string; first_air_date?: string }) => (dateOf(m) || '').slice(0, 4);
export const typeOf = (m: MediaSummary): MediaType | 'person' =>
  m.media_type ?? (m.title !== undefined || m.release_date !== undefined ? 'movie' : 'tv');

export const api = {
  trending: (kind: 'all' | 'movie' | 'tv' | 'person' = 'all', window: 'day' | 'week' = 'week') =>
    tmdb<Paged<MediaSummary>>(`/trending/${kind}/${window}`),
  popular: (t: MediaType) => tmdb<Paged<MediaSummary>>(`/${t}/popular`),
  topRated: (t: MediaType) => tmdb<Paged<MediaSummary>>(`/${t}/top_rated`),
  nowPlaying: () => tmdb<Paged<MediaSummary>>('/movie/now_playing', { region: 'IT' }),
  onAir: () => tmdb<Paged<MediaSummary>>('/tv/on_the_air'),
  search: (q: string, kind: 'multi' | 'movie' | 'tv' | 'person', page = 1) =>
    tmdb<Paged<MediaSummary>>(`/search/${kind}`, { query: q, page, include_adult: 'false' }),
  movie: (id: number) =>
    tmdb<MovieDetail>(`/movie/${id}`, { append_to_response: 'credits,videos,recommendations,watch/providers', include_video_language: 'it,en' }),
  tv: (id: number) =>
    tmdb<TvDetail>(`/tv/${id}`, { append_to_response: 'aggregate_credits,videos,recommendations,watch/providers', include_video_language: 'it,en' }),
  season: (id: number, n: number) => tmdb<SeasonDetail>(`/tv/${id}/season/${n}`),
  person: (id: number) => tmdb<PersonDetail>(`/person/${id}`, { append_to_response: 'combined_credits,images' }),
  personEn: (id: number) => tmdb<PersonDetail>(`/person/${id}`, { language: 'en-US' }),
  movieEn: (id: number) => tmdb<{ overview: string }>(`/movie/${id}`, { language: 'en-US' }),
  tvEn: (id: number) => tmdb<{ overview: string }>(`/tv/${id}`, { language: 'en-US' }),
  genres: (t: MediaType) => tmdb<{ genres: Genre[] }>(`/genre/${t}/list`),
  discoverByGenre: (t: MediaType, genre: number) =>
    tmdb<Paged<MediaSummary>>(`/discover/${t}`, { with_genres: genre, sort_by: 'popularity.desc', 'vote_count.gte': 200 }),
};
