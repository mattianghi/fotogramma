// Diario a calendario: ogni giorno mostra la locandina di ciò che hai visto.
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { actions, DiaryEvent, Entry, useStore } from '../lib/store';
import { img } from '../lib/tmdb';
import { Empty, Img, Stars, toast } from '../components/ui';
import { Icon } from '../components/Icon';

const WEEK = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const kindLabel = { movie: 'Film', show: 'Serie', season: 'Stagione', episode: 'Episodio' } as const;
const pad = (n: number) => String(n).padStart(2, '0');
// giorno locale (non UTC): una visione alle 23:30 resta in quel giorno
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromDayKey = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d, 12); };
// a parità di giorno, la copertina va al film o alla serie più "importante"
const weight = { movie: 4, show: 3, season: 2, episode: 1 } as const;

export default function Diary() {
  const diary = useStore((s) => s.diary);
  const entries = useStore((s) => s.entries);
  const today = dayKey(new Date());
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selected, setSelected] = useState<string | null>(null);
  const touch = useRef<number | null>(null);

  const byDay = useMemo(() => {
    const m = new Map<string, DiaryEvent[]>();
    for (const d of diary) {
      if (!entries[d.key]) continue;
      const k = dayKey(new Date(d.date));
      m.set(k, [...(m.get(k) ?? []), d]);
    }
    for (const list of m.values()) list.sort((a, b) => weight[b.kind] - weight[a.kind] || (b.rating ?? 0) - (a.rating ?? 0) || b.date.localeCompare(a.date));
    return m;
  }, [diary, entries]);

  const cells = useMemo(() => {
    const first = month;
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const out: (string | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= days; d++) out.push(dayKey(new Date(first.getFullYear(), first.getMonth(), d)));
    while (out.length % 7) out.push(null);
    return out;
  }, [month]);

  const monthEvents = cells.flatMap((c) => (c ? byDay.get(c) ?? [] : []));
  const films = monthEvents.filter((e) => e.kind === 'movie').length;
  const eps = monthEvents.filter((e) => e.kind === 'episode').length;
  const activeDays = cells.filter((c) => c && byDay.has(c)).length;

  const go = (delta: number) => { setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1)); setSelected(null); };
  const isCurrentMonth = month.getFullYear() === new Date().getFullYear() && month.getMonth() === new Date().getMonth();
  const monthName = month.toLocaleDateString('it-IT', { month: 'long' });

  // elenco sotto il calendario: il giorno scelto, altrimenti tutto il mese
  const listDays = selected ? [selected] : cells.filter((c): c is string => !!c && byDay.has(c)).reverse();

  return (
    <div className="page diary">
      <header className="page-head">
        <span className="kicker">Tutto ciò che hai visto</span>
        <h1 className="display small">Diario</h1>
      </header>

      <section className="cal card" onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => { if (touch.current === null) return; const dx = e.changedTouches[0].clientX - touch.current; touch.current = null; if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1); }}>
        <header className="cal-head">
          <button className="icon-btn" onClick={() => go(-1)} aria-label="Mese precedente"><Icon name="back" size={18} /></button>
          <div className="cal-title" key={`${month.getFullYear()}-${month.getMonth()}`}>
            <h2>{monthName}<span>{month.getFullYear()}</span></h2>
            <p>{monthEvents.length ? `${films} film · ${eps} ${eps === 1 ? 'episodio' : 'episodi'} · ${activeDays} ${activeDays === 1 ? 'giorno' : 'giorni'} davanti allo schermo` : 'Nessuna visione questo mese'}</p>
          </div>
          <button className="icon-btn" onClick={() => go(1)} aria-label="Mese successivo"><Icon name="chevron" size={18} /></button>
        </header>
        {!isCurrentMonth && <button className="cal-today" onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setSelected(null); }}>Torna a oggi</button>}

        <div className="cal-week">{WEEK.map((w) => <span key={w}>{w}</span>)}</div>
        <div className="cal-grid" key={month.toISOString()}>
          {cells.map((c, i) => {
            if (!c) return <span key={`x${i}`} className="cal-cell is-blank" />;
            const evs = byDay.get(c) ?? [];
            const cover = evs[0] ? entries[evs[0].key] : undefined;
            const n = Number(c.slice(8));
            const future = c > today;
            return (
              <button key={c} disabled={!evs.length} onClick={() => setSelected(selected === c ? null : c)}
                className={`cal-cell ${evs.length ? 'has' : ''} ${c === today ? 'is-today' : ''} ${selected === c ? 'is-sel' : ''} ${future ? 'is-future' : ''}`}
                aria-label={`${n} ${monthName}: ${evs.length} ${evs.length === 1 ? "visione" : "visioni"}`}>
                {cover && <>
                  {evs.length > 1 && <span className="cal-stack" />}
                  <span className="cal-poster"><Img src={img.poster(cover.poster, 'w154')} alt="" /></span>
                </>}
                <span className="cal-num">{n}</span>
                {evs.length > 1 && <span className="cal-count">+{evs.length - 1}</span>}
                {evs[0]?.rating ? <span className="cal-star"><Icon name="star" size={9} fill strokeWidth={0} />{evs[0].rating}</span> : null}
              </button>
            );
          })}
        </div>
      </section>

      {diary.length === 0 && <Empty icon="calendar" title="Il calendario è ancora vuoto">Quando segni un film, una stagione o un episodio come visto, la sua locandina compare qui nel giorno in cui l'hai guardato.</Empty>}

      {listDays.length > 0 && (
        <section className="day-list">
          {selected && <button className="link-btn" onClick={() => setSelected(null)}><Icon name="back" size={15} /> Tutto {monthName}</button>}
          {listDays.map((k) => (
            <div key={k} className="day-group">
              <h3 className="day-title">{fromDayKey(k).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
              <ol>
                {(byDay.get(k) ?? []).map((d) => <DiaryRow key={d.id} d={d} e={entries[d.key]} />)}
              </ol>
            </div>
          ))}
        </section>
      )}
      {diary.length > 0 && !listDays.length && <p className="muted small center">Scorri ai mesi precedenti o segna qualcosa che hai visto.</p>}
    </div>
  );
}

function DiaryRow({ d, e }: { d: DiaryEvent; e: Entry }) {
  return (
    <li className="diary-row">
      <Link to={`/${e.type}/${e.id}`} className="diary-thumb"><Img src={img.poster(e.poster, 'w154')} alt={e.title} /></Link>
      <Link to={`/${e.type}/${e.id}`} className="diary-info">
        <strong>{e.title}</strong>
        <span className="muted small">{d.label ?? `${kindLabel[d.kind]} · ${e.year}`}</span>
        {d.rating ? <Stars value={d.rating} size={12} /> : null}
      </Link>
      <div className="diary-tools">
        <label className="icon-btn sm ghosty date-pick" title="Cambia giorno">
          <Icon name="calendar" size={15} />
          <input type="date" value={dayKey(new Date(d.date))} max={dayKey(new Date())} aria-label="Cambia giorno della visione"
            onChange={(ev) => { if (!ev.target.value) return; actions.setDiaryDate(d.id, fromDayKey(ev.target.value).toISOString()); toast('Spostato al ' + fromDayKey(ev.target.value).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })); }} />
        </label>
        <button className="icon-btn sm ghosty" aria-label="Rimuovi dal diario" onClick={() => { actions.removeDiary(d.id); toast('Rimosso dal diario'); }}><Icon name="trash" size={15} /></button>
      </div>
    </li>
  );
}
