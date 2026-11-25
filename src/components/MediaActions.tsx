// Barra azioni comune a film e serie: visto, da vedere, preferito, valuta, consiglia.
import { useState } from 'react';
import { Icon } from './Icon';
import { Sheet, StarInput, Stars, ratingWords, toast } from './ui';
import { actions, entryKey, EntrySeed, useStore, uid } from '../lib/store';
import { encodeRec, fmtRating, recLink } from '../lib/util';

export function MediaActions({ seed, accent }: { seed: EntrySeed; accent: string }) {
  const e = useStore((s) => s.entries[entryKey(seed.type, seed.id)]);
  const [rateOpen, setRateOpen] = useState(false);
  const [recOpen, setRecOpen] = useState(false);
  const isTv = seed.type === 'tv';

  return (
    <>
      <div className="actions" style={{ ['--accent' as string]: accent }}>
        <button className={`action ${e?.watched ? 'is-on' : ''}`} onClick={() => { actions.toggleWatched(seed); toast(e?.watched ? 'Rimosso dai visti' : isTv ? 'Serie segnata come vista' : 'Aggiunto ai film visti'); }}>
          <Icon name={e?.watched ? 'check' : 'eye'} size={22} strokeWidth={e?.watched ? 2.6 : 1.8} />
          <span>{e?.watched ? 'Visto' : isTv ? 'Vista' : 'Visto?'}</span>
        </button>
        <button className={`action ${e?.watchlist ? 'is-on' : ''}`} onClick={() => { actions.toggleWatchlist(seed); toast(e?.watchlist ? 'Tolto da “Da vedere”' : 'Aggiunto a “Da vedere”'); }}>
          <Icon name="bookmark" size={22} fill={!!e?.watchlist} />
          <span>Da vedere</span>
        </button>
        <button className={`action ${e?.favorite ? 'is-on is-heart' : ''}`} onClick={() => { actions.toggleFavorite(seed); toast(e?.favorite ? 'Tolto dai preferiti' : 'Nel tuo Pantheon ✦'); }}>
          <Icon name="heart" size={22} fill={!!e?.favorite} />
          <span>Preferito</span>
        </button>
        <button className="action" onClick={() => setRecOpen(true)}>
          <Icon name="send" size={22} />
          <span>Consiglia</span>
        </button>
      </div>

      <button className="rate-card" onClick={() => setRateOpen(true)} style={{ ['--accent' as string]: accent }}>
        <div>
          <span className="kicker">{isTv ? 'La tua valutazione della serie' : 'La tua valutazione'}</span>
          <div className="rate-card-row">
            <Stars value={e?.rating ?? 0} size={26} />
            <span className="rate-card-num">{e?.rating ? fmtRating(e.rating) : 'Tocca per votare'}</span>
          </div>
          {e?.review && <p className="rate-card-review">“{e.review}”</p>}
        </div>
        <Icon name="chevron" size={18} />
      </button>

      <RateSheet open={rateOpen} onClose={() => setRateOpen(false)} title={seed.title} value={e?.rating} review={e?.review}
        onSave={(r, text) => { actions.rate(seed, r); actions.setReview(seed, text); toast(r ? `Valutato ${fmtRating(r)} ★` : 'Valutazione rimossa'); }} />
      <RecommendSheet open={recOpen} onClose={() => setRecOpen(false)} seed={seed} rating={e?.rating} />
    </>
  );
}

export function RateSheet({ open, onClose, title, subtitle, value, review, onSave, withReview = true }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; value?: number; review?: string;
  onSave: (r: number | undefined, review: string) => void; withReview?: boolean;
}) {
  const [v, setV] = useState<number | undefined>(value);
  const [text, setText] = useState(review ?? '');
  const [lastOpen, setLastOpen] = useState(false);
  if (open && !lastOpen) { setLastOpen(true); setV(value); setText(review ?? ''); }
  if (!open && lastOpen) setLastOpen(false);
  return (
    <Sheet open={open} onClose={onClose} title={<>{title}{subtitle && <small>{subtitle}</small>}</>}>
      <div className="rate-sheet">
        <StarInput value={v} onChange={setV} size={46} />
        <div className="rate-sheet-word">
          <strong>{v ? fmtRating(v) : '—'}</strong>
          <span>{v ? ratingWords[Math.round(v * 2)] : 'Tocca o trascina sulle stelle'}</span>
        </div>
        {withReview && (
          <textarea className="field" rows={3} placeholder="Due righe per ricordartelo… (facoltativo)" value={text} onChange={(e) => setText(e.target.value)} />
        )}
        <div className="row-btns">
          {value !== undefined && <button className="btn ghost" onClick={() => { onSave(undefined, ''); onClose(); }}>Rimuovi</button>}
          <button className="btn primary" disabled={!v} onClick={() => { onSave(v, text.trim()); onClose(); }}>Salva</button>
        </div>
      </div>
    </Sheet>
  );
}

export function RecommendSheet({ open, onClose, seed, rating }: { open: boolean; onClose: () => void; seed: EntrySeed; rating?: number }) {
  const friends = useStore((s) => s.friends);
  const me = useStore((s) => s.profile.name);
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [newFriend, setNewFriend] = useState('');

  const code = encodeRec({ type: seed.type, mediaId: seed.id, title: seed.title, poster: seed.poster, backdrop: seed.backdrop, year: seed.year, from: me, note: note.trim(), rating });
  const link = recLink(code);
  const text = `${me} ti consiglia “${seed.title}”${rating ? ` (★ ${fmtRating(rating)})` : ''}${note.trim() ? ` — ${note.trim()}` : ''}`;

  const done = () => {
    actions.logSent({ id: uid(), type: seed.type, mediaId: seed.id, title: seed.title, poster: seed.poster, year: seed.year, from: me, to: picked, note: note.trim(), rating, date: new Date().toISOString() });
    setPicked([]); setNote(''); onClose();
  };

  const share = async () => {
    try {
      if (navigator.share) { await navigator.share({ title: seed.title, text, url: link }); done(); toast('Consiglio inviato'); return; }
    } catch (err) { if ((err as Error).name === 'AbortError') return; }
    await navigator.clipboard?.writeText(`${text}\n${link}`).catch(() => {});
    done(); toast('Link copiato: incollalo dove vuoi');
  };

  const addFriend = () => {
    const n = newFriend.trim();
    if (!n) return;
    actions.addFriend(n); setPicked((p) => [...p, n]); setNewFriend('');
  };

  return (
    <Sheet open={open} onClose={onClose} title={<>Consiglia<small>{seed.title}</small></>}>
      <div className="rec-sheet">
        <span className="label">A chi?</span>
        <div className="chips">
          {friends.map((f) => (
            <button key={f} className={`chip ${picked.includes(f) ? 'is-on' : ''}`} onClick={() => setPicked((p) => (p.includes(f) ? p.filter((x) => x !== f) : [...p, f]))}>
              <span className="avatar-xs" style={{ background: avatarColor(f) }}>{f[0]?.toUpperCase()}</span>{f}
            </button>
          ))}
          <form className="chip chip-input" onSubmit={(e) => { e.preventDefault(); addFriend(); }}>
            <Icon name="plus" size={14} />
            <input placeholder="Nuovo amico" value={newFriend} onChange={(e) => setNewFriend(e.target.value)} onBlur={addFriend} />
          </form>
        </div>
        <span className="label">Un messaggio</span>
        <textarea className="field" rows={2} maxLength={300} placeholder="Perché deve vederlo?" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="rec-preview">
          <Icon name="link" size={16} />
          <span>{text}</span>
        </div>
        <button className="btn primary wide" onClick={share}><Icon name="send" size={18} /> Invia consiglio</button>
        <p className="hint">Si apre la condivisione del telefono (WhatsApp, Telegram, Messaggi…). Chi riceve il link vede la scheda e può salvarla.</p>
      </div>
    </Sheet>
  );
}

const hues = [12, 32, 48, 160, 190, 215, 260, 290, 330];
export function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `linear-gradient(135deg, hsl(${hues[h % hues.length]} 80% 62%), hsl(${(hues[h % hues.length] + 40) % 360} 75% 45%))`;
}
