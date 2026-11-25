import { Link, useParams } from 'react-router-dom';
import { api, img, titleOf, yearOf } from '../lib/tmdb';
import { useAsync } from '../lib/useAsync';
import { fmtRating, seedFromTv, tmdbScore, useDominantColor } from '../lib/util';
import { CastRail, Crew, DetailHero, FriendNotes, Overview, Providers, Trailer } from '../components/Detail';
import { MediaActions } from '../components/MediaActions';
import { ErrorBox, Img, PosterCard, Rail, Stars } from '../components/ui';
import { seasonKey, useStore } from '../lib/store';

export default function TvPage() {
  const id = Number(useParams().id);
  const { data: t, error } = useAsync(() => api.tv(id), [id]);
  const en = useAsync(async () => (t && !t.overview ? api.tvEn(id) : null), [t?.id]);
  const accent = useDominantColor(t ? img.poster(t.poster_path, 'w154') : undefined);
  const episodes = useStore((s) => s.episodes);
  const seasonsR = useStore((s) => s.seasons);
  if (error) return <div className="page"><ErrorBox error={error} /></div>;
  if (!t) return <div className="page"><div className="detail-hero sk" /></div>;

  const seed = seedFromTv(t);
  const seasons = t.seasons.filter((s) => s.episode_count > 0).sort((a, b) => (a.season_number || 999) - (b.season_number || 999));
  const watchedIn = (n: number) => Object.entries(episodes).filter(([k, v]) => k.startsWith(`tv:${id}:s${n}:`) && v.watchedAt).length;
  const totalWatched = seasons.filter((s) => s.season_number > 0).reduce((a, s) => a + watchedIn(s.season_number), 0);
  const total = seasons.filter((s) => s.season_number > 0).reduce((a, s) => a + s.episode_count, 0) || t.number_of_episodes;
  const pct = total ? Math.round((totalWatched / total) * 100) : 0;
  const years = `${yearOf(t)}${t.status === 'Ended' || t.status === 'Canceled' ? `–${(t.last_air_date ?? '').slice(0, 4)}` : '–oggi'}`;
  const crew = (t.created_by ?? []).map((c) => ({ id: c.id, name: c.name, job: 'Ideata da' }));

  return (
    <div className="page detail" style={{ ['--accent' as string]: accent }}>
      <DetailHero backdrop={t.backdrop_path} poster={t.poster_path} title={titleOf(t)} accent={accent} score={tmdbScore(t.vote_average)}
        kicker={<>Serie TV{t.networks?.[0] && <> · {t.networks[0].name}</>}</>}
        meta={<>
          <span>{years}</span>
          <span>{t.number_of_seasons} {t.number_of_seasons === 1 ? 'stagione' : 'stagioni'}</span>
          {t.genres.slice(0, 2).map((g) => <span key={g.id} className="pill">{g.name}</span>)}
        </>}>
        {t.tagline && <p className="tagline">{t.tagline}</p>}
      </DetailHero>
      <div className="detail-body">
        <MediaActions seed={seed} accent={accent} releaseDate={t.first_air_date} />
        {totalWatched > 0 && (
          <div className="progress-card">
            <div className="progress-top"><span className="kicker">I tuoi progressi</span><strong>{totalWatched}/{total} episodi · {pct}%</strong></div>
            <div className="progress"><i style={{ width: `${pct}%` }} /></div>
          </div>
        )}
        <FriendNotes type="tv" id={t.id} />
        <Overview text={t.overview ?? ''} fallback={en.data?.overview} />
        <Providers data={t['watch/providers']?.results} />

        <section className="block">
          <h2 className="rail-title">Stagioni</h2>
          <p className="muted small">Valuta l'intera serie qui sopra, ogni stagione o i singoli episodi.</p>
          <div className="season-list">
            {seasons.map((s) => {
              const w = watchedIn(s.season_number);
              const r = seasonsR[seasonKey(id, s.season_number)]?.rating;
              return (
                <Link key={s.id} to={`/tv/${id}/season/${s.season_number}`} className="season-card">
                  <div className="season-poster"><Img src={img.poster(s.poster_path ?? t.poster_path, 'w154')} alt={s.name} /></div>
                  <div className="season-info">
                    <strong>{s.name}</strong>
                    <span className="muted small">{s.air_date?.slice(0, 4) ?? 'Prossimamente'} · {s.episode_count} episodi</span>
                    {r ? <span className="season-rating"><Stars value={r} size={13} /> {fmtRating(r)}</span> : <span className="muted small">Non ancora valutata</span>}
                    <div className="progress thin"><i style={{ width: `${(w / s.episode_count) * 100}%` }} /></div>
                  </div>
                  <span className="season-count">{w}/{s.episode_count}</span>
                </Link>
              );
            })}
          </div>
        </section>

        <CastRail cast={t.aggregate_credits.cast} title="Cast della serie" />
        <Crew people={crew} />
        <Trailer videos={t.videos?.results} />
        {!!t.recommendations?.results.length && (
          <Rail title="Se ti è piaciuta" kicker="Simili">
            {t.recommendations.results.filter((r) => r.poster_path).map((r) => <PosterCard key={r.id} m={{ ...r, media_type: 'tv' }} />)}
          </Rail>
        )}
      </div>
    </div>
  );
}
