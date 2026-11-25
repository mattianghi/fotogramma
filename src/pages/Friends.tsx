import { useState } from 'react';
import { Link } from 'react-router-dom';
import { actions, useStore } from '../lib/store';
import { img } from '../lib/tmdb';
import { fmtDate, fmtRating } from '../lib/util';
import { Empty, Img, Segmented, toast } from '../components/ui';
import { Icon } from '../components/Icon';
import { avatarColor } from '../components/MediaActions';

export default function Friends() {
  const friends = useStore((s) => s.friends);
  const inbox = useStore((s) => s.inbox);
  const sent = useStore((s) => s.sent);
  const entries = useStore((s) => s.entries);
  const [tab, setTab] = useState<'in' | 'out'>('in');
  const [name, setName] = useState('');
  const [who, setWho] = useState<string | null>(null);

  const inList = inbox.filter((r) => !who || r.from === who);
  const outList = sent.filter((r) => !who || r.to?.includes(who));

  return (
    <div className="page friends">
      <header className="page-head">
        <span className="kicker">Consigli fra cinefili</span>
        <h1 className="display small">Amici</h1>
      </header>

      <section className="friend-strip">
        <button className={`friend-bubble ${!who ? 'is-on' : ''}`} onClick={() => setWho(null)}><span className="avatar-md all"><Icon name="friends" size={20} /></span><span>Tutti</span></button>
        {friends.map((f) => {
          const n = inbox.filter((r) => r.from === f).length;
          return (
            <button key={f} className={`friend-bubble ${who === f ? 'is-on' : ''}`} onClick={() => setWho(who === f ? null : f)}>
              <span className="avatar-md" style={{ background: avatarColor(f) }}>{f[0]?.toUpperCase()}{n > 0 && <i>{n}</i>}</span>
              <span>{f}</span>
            </button>
          );
        })}
        <form className="friend-add" onSubmit={(e) => { e.preventDefault(); if (name.trim()) { actions.addFriend(name.trim()); toast(`${name.trim()} aggiunto`); setName(''); } }}>
          <input placeholder="+ Amico" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} />
        </form>
      </section>

      <Segmented value={tab} onChange={setTab} options={[
        { value: 'in', label: <>Ricevuti {inbox.length > 0 && <b className="count">{inList.length}</b>}</> },
        { value: 'out', label: <>Inviati {sent.length > 0 && <b className="count">{outList.length}</b>}</> },
      ]} />

      {tab === 'in' && (inList.length === 0 ? (
        <Empty icon="inbox" title="Nessun consiglio ricevuto">Quando un amico ti manda un link da Fotogramma, il suo consiglio compare qui. Inizia tu: apri un film e premi “Consiglia”.</Empty>
      ) : (
        <div className="rec-list">
          {inList.map((r) => {
            const e = entries[`${r.type}:${r.mediaId}`];
            return (
              <article key={r.id} className={`rec-card ${r.seen ? '' : 'is-new'}`}>
                <div className="rec-bg"><Img src={img.backdrop(r.backdrop ?? null, 'w780')} alt="" /></div>
                <Link to={`/${r.type}/${r.mediaId}`} className="rec-poster" onClick={() => actions.markRecSeen(r.id)}><Img src={img.poster(r.poster, 'w342')} alt={r.title} /></Link>
                <div className="rec-body">
                  <span className="rec-from"><span className="avatar-xs" style={{ background: avatarColor(r.from) }}>{r.from[0]?.toUpperCase()}</span><b>{r.from}</b> · {fmtDate(r.date, { day: 'numeric', month: 'short' })}</span>
                  <h3>{r.title} <small>{r.year}</small></h3>
                  {r.rating && <span className="rec-rating"><Icon name="star" size={12} fill strokeWidth={0} /> {fmtRating(r.rating)} per {r.from}</span>}
                  {r.note && <p>“{r.note}”</p>}
                  <div className="rec-actions">
                    {e?.watched ? <span className="pill ok"><Icon name="check" size={13} strokeWidth={2.6} /> Visto</span> : (
                      <button className={`btn sm ${e?.watchlist ? 'ghost' : 'primary'}`} onClick={() => {
                        actions.toggleWatchlist({ type: r.type, id: r.mediaId, title: r.title, poster: r.poster, backdrop: r.backdrop ?? null, year: r.year ?? '', genres: [], runtime: 0, cast: [] });
                        actions.markRecSeen(r.id); toast(e?.watchlist ? 'Tolto da “Da vedere”' : 'Aggiunto a “Da vedere”');
                      }}><Icon name="bookmark" size={14} fill={!!e?.watchlist} /> {e?.watchlist ? 'In lista' : 'Da vedere'}</button>
                    )}
                    <button className="icon-btn sm ghosty" aria-label="Elimina" onClick={() => actions.removeRec(r.id)}><Icon name="trash" size={15} /></button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ))}

      {tab === 'out' && (outList.length === 0 ? (
        <Empty icon="send" title="Non hai ancora consigliato nulla">Apri la scheda di un film o di una serie e premi “Consiglia”: scegli gli amici, scrivi due righe e condividi il link.</Empty>
      ) : (
        <ol className="sent-list">
          {outList.map((r) => (
            <li key={r.id}>
              <Link to={`/${r.type}/${r.mediaId}`} className="sent-row">
                <span className="sent-thumb"><Img src={img.poster(r.poster, 'w154')} alt="" /></span>
                <span className="sent-info">
                  <strong>{r.title}</strong>
                  <span className="muted small">a {r.to?.length ? r.to.join(', ') : 'qualcuno'} · {fmtDate(r.date, { day: 'numeric', month: 'short' })}</span>
                  {r.note && <em>“{r.note}”</em>}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ))}
    </div>
  );
}
