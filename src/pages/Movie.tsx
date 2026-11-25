import { useParams } from 'react-router-dom';
import { api, img, titleOf, yearOf } from '../lib/tmdb';
import { useAsync } from '../lib/useAsync';
import { fmtRuntime, seedFromMovie, tmdbScore, useDominantColor } from '../lib/util';
import { CastRail, Crew, DetailHero, FriendNotes, Overview, Providers, Trailer } from '../components/Detail';
import { MediaActions } from '../components/MediaActions';
import { ErrorBox, PosterCard, Rail } from '../components/ui';

export default function MoviePage() {
  const id = Number(useParams().id);
  const { data: m, error } = useAsync(() => api.movie(id), [id]);
  const en = useAsync(async () => (m && !m.overview ? api.movieEn(id) : null), [m?.id]);
  const accent = useDominantColor(m ? img.poster(m.poster_path, 'w154') : undefined);
  if (error) return <div className="page"><ErrorBox error={error} /></div>;
  if (!m) return <div className="page"><div className="detail-hero sk" /></div>;

  const seed = seedFromMovie(m);
  const directors = m.credits.crew.filter((c) => c.job === 'Director');
  const keyCrew = [
    ...directors.map((d) => ({ ...d, job: 'Regia' })),
    ...m.credits.crew.filter((c) => c.job === 'Screenplay' || c.job === 'Writer').slice(0, 2).map((d) => ({ ...d, job: 'Sceneggiatura' })),
    ...m.credits.crew.filter((c) => c.job === 'Original Music Composer').slice(0, 1).map((d) => ({ ...d, job: 'Musiche' })),
    ...m.credits.crew.filter((c) => c.job === 'Director of Photography').slice(0, 1).map((d) => ({ ...d, job: 'Fotografia' })),
  ];

  return (
    <div className="page detail" style={{ ['--accent' as string]: accent }}>
      <DetailHero backdrop={m.backdrop_path} poster={m.poster_path} title={titleOf(m)} accent={accent} score={tmdbScore(m.vote_average)}
        kicker={<>Film{directors[0] && <> · di <a href={`#/person/${directors[0].id}`}>{directors[0].name}</a></>}</>}
        meta={<>
          <span>{yearOf(m)}</span>
          {m.runtime ? <span>{fmtRuntime(m.runtime)}</span> : null}
          {m.genres.slice(0, 3).map((g) => <span key={g.id} className="pill">{g.name}</span>)}
        </>}>
        {m.tagline && <p className="tagline">{m.tagline}</p>}
      </DetailHero>
      <div className="detail-body">
        <MediaActions seed={seed} accent={accent} releaseDate={m.release_date} />
        <FriendNotes type="movie" id={m.id} />
        <Overview text={m.overview ?? ''} fallback={en.data?.overview} />
        <Providers data={m['watch/providers']?.results} />
        <CastRail cast={m.credits.cast} />
        <Crew people={keyCrew} />
        <Trailer videos={m.videos?.results} />
        {!!m.recommendations?.results.length && (
          <Rail title="Se ti è piaciuto" kicker="Simili">
            {m.recommendations.results.filter((r) => r.poster_path).map((r) => <PosterCard key={r.id} m={{ ...r, media_type: 'movie' }} />)}
          </Rail>
        )}
      </div>
    </div>
  );
}
