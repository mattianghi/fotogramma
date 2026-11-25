import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStore, Entry } from '../lib/store';
import { MediaSummary } from '../lib/tmdb';
import { BackButton } from '../components/Detail';
import { Empty, PosterCard, Segmented, Stars } from '../components/ui';
import { fmtRating } from '../lib/util';

const titles: Record<string, string> = { watchlist: 'Da vedere', rated: 'Valutazioni', movies: 'Film visti', shows: 'Serie seguite' };

export const entryAsSummary = (e: Entry): MediaSummary => ({
  id: e.id, media_type: e.type, title: e.type === 'movie' ? e.title : undefined, name: e.type === 'tv' ? e.title : undefined,
  poster_path: e.poster, backdrop_path: e.backdrop, release_date: e.type === 'movie' ? e.year : undefined, first_air_date: e.type === 'tv' ? e.year : undefined,
});

export default function Library() {
  const list = useParams().list ?? 'watchlist';
  const entries = useStore((s) => s.entries);
  const episodes = useStore((s) => s.episodes);
  const [sort, setSort] = useState<'recent' | 'rating' | 'title'>(list === 'rated' ? 'rating' : 'recent');
  const [kind, setKind] = useState<'all' | 'movie' | 'tv'>('all');

  const items = useMemo(() => {
    const tvWithEps = new Set(Object.keys(episodes).filter((k) => episodes[k].watchedAt).map((k) => Number(k.split(':')[1])));
    let arr = Object.values(entries).filter((e) => {
      if (list === 'watchlist') return e.watchlist;
      if (list === 'rated') return e.rating;
      if (list === 'movies') return e.type === 'movie' && e.watched;
      if (list === 'shows') return e.type === 'tv' && (e.watched || tvWithEps.has(e.id) || e.rating);
      return false;
    });
    if (kind !== 'all') arr = arr.filter((e) => e.type === kind);
    return arr.sort((a, b) => (sort === 'rating' ? (b.rating ?? 0) - (a.rating ?? 0) || b.updatedAt - a.updatedAt : sort === 'title' ? a.title.localeCompare(b.title, 'it') : b.updatedAt - a.updatedAt));
  }, [entries, episodes, list, sort, kind]);

  return (
    <div className="page library">
      <header className="page-head with-back">
        <BackButton />
        <h1 className="display small">{titles[list] ?? 'Libreria'}</h1>
        <span className="muted">{items.length} titoli</span>
      </header>
      <div className="toolbar">
        {(list === 'watchlist' || list === 'rated') && <Segmented value={kind} onChange={setKind} options={[{ value: 'all', label: 'Tutto' }, { value: 'movie', label: 'Film' }, { value: 'tv', label: 'Serie' }]} />}
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="recent">Più recenti</option>
          <option value="rating">Voto più alto</option>
          <option value="title">Titolo A–Z</option>
        </select>
      </div>
      {items.length === 0 ? <Empty icon="film" title="Ancora niente qui">Cerca un titolo e usa i pulsanti nella sua scheda.</Empty> : (
        <div className="grid">
          {items.map((e) => <PosterCard key={e.key} m={entryAsSummary(e)} sub={e.rating ? <span className="sub-stars"><Stars value={e.rating} size={10} /> {fmtRating(e.rating)}</span> : undefined} />)}
        </div>
      )}
    </div>
  );
}
