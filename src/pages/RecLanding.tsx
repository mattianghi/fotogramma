import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { actions, getState, uid, useStore } from '../lib/store';
import { img } from '../lib/tmdb';
import { decodeRec, fmtRating, useDominantColor, initial } from '../lib/util';
import { Empty, Img } from '../components/ui';
import { Icon } from '../components/Icon';
import { avatarColor } from '../components/MediaActions';

export default function RecLanding() {
  const { code = '' } = useParams();
  const rec = useMemo(() => decodeRec(code), [code]);
  const ready = useStore((s) => !!s.profile.name && !!s.apiKey);
  const nav = useNavigate();
  const accent = useDominantColor(rec ? img.poster(rec.poster, 'w154') : undefined);

  useEffect(() => {
    if (!rec || rec.from === getState().profile.name) return;
    actions.receive({ ...rec, id: uid(), date: new Date().toISOString() });
  }, [rec]);

  if (!rec) return <div className="page"><Empty icon="link" title="Link non valido">Questo consiglio sembra incompleto. Chiedi a chi te l'ha mandato di ricondividerlo.</Empty></div>;

  return (
    <div className="rec-landing" style={{ ['--accent' as string]: accent }}>
      <div className="rec-landing-bg"><Img src={img.backdrop(rec.backdrop ?? null)} alt="" eager /></div>
      <div className="rec-landing-body">
        <span className="rec-landing-from"><span className="avatar-md" style={{ background: avatarColor(rec.from) }}>{initial(rec.from)}</span><span><b>{rec.from}</b> ti consiglia</span></span>
        <div className="rec-landing-poster"><Img src={img.poster(rec.poster, 'w500')} alt={rec.title} eager /></div>
        <h1 className="detail-title">{rec.title}</h1>
        <span className="muted">{rec.type === 'movie' ? 'Film' : 'Serie TV'}{rec.year ? ` · ${rec.year}` : ''}{rec.rating ? ` · ★ ${fmtRating(rec.rating)} per ${rec.from}` : ''}</span>
        {rec.note && <blockquote>“{rec.note}”</blockquote>}
        {ready ? (
          <div className="row-btns">
            <button className="btn primary" onClick={() => nav(`/${rec.type}/${rec.mediaId}`, { replace: true })}>Apri la scheda <Icon name="chevron" size={16} /></button>
            <Link className="btn ghost" to="/friends" replace>Tutti i consigli</Link>
          </div>
        ) : (
          <>
            <p className="lede">L'abbiamo salvato per te. Crea il tuo Fotogramma per tenere il diario di ciò che guardi e rispondere con i tuoi consigli.</p>
            <button className="btn primary wide" onClick={() => { try { sessionStorage.setItem('fotogramma:skipWelcome', '1'); } catch { /* ignora */ } nav('/', { replace: true }); }}>Crea il mio profilo <Icon name="chevron" size={16} /></button>
          </>
        )}
      </div>
    </div>
  );
}
