import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { actions, useStore } from '../lib/store';
import { img } from '../lib/tmdb';
import { Empty, Img, Stars, toast } from '../components/ui';
import { Icon } from '../components/Icon';

const kindLabel = { movie: 'Film', show: 'Serie', season: 'Stagione', episode: 'Episodio' } as const;

export default function Diary() {
  const diary = useStore((s) => s.diary);
  const entries = useStore((s) => s.entries);

  const months = useMemo(() => {
    const m = new Map<string, typeof diary>();
    for (const d of [...diary].sort((a, b) => b.date.localeCompare(a.date))) {
      const k = d.date.slice(0, 7);
      m.set(k, [...(m.get(k) ?? []), d]);
    }
    return [...m.entries()];
  }, [diary]);

  // ultime 12 settimane, stile "heatmap"
  const heat = useMemo(() => {
    const days = new Map<string, number>();
    diary.forEach((d) => days.set(d.date.slice(0, 10), (days.get(d.date.slice(0, 10)) ?? 0) + 1));
    const out: { day: string; n: number }[] = [];
    const today = new Date();
    for (let d = new Date(today); out.length < 84; d.setDate(d.getDate() - 1)) {
      const k = d.toISOString().slice(0, 10);
      out.unshift({ day: k, n: days.get(k) ?? 0 });
    }
    return out;
  }, [diary]);

  return (
    <div className="page diary">
      <header className="page-head">
        <span className="kicker">Tutto ciò che hai visto</span>
        <h1 className="display small">Diario</h1>
      </header>
      {diary.length > 0 && (
        <section className="heat card" aria-label="Attività delle ultime 12 settimane">
          <div className="heat-grid">{heat.map((h) => <i key={h.day} title={`${h.day}: ${h.n}`} style={{ opacity: h.n ? Math.min(1, 0.35 + h.n * 0.22) : undefined }} className={h.n ? 'on' : ''} />)}</div>
          <span className="muted small">Ultime 12 settimane · {diary.filter((d) => +new Date(d.date) > Date.now() - 84 * 864e5).length} visioni</span>
        </section>
      )}
      {diary.length === 0 && <Empty icon="diary" title="Il diario è vuoto">Quando segni un film, una stagione o un episodio come visto, lo trovi qui con data e voto.</Empty>}
      {months.map(([month, list]) => (
        <section key={month} className="diary-month">
          <h2 className="diary-month-title">{new Date(`${month}-01`).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}<span>{list.length}</span></h2>
          <ol>
            {list.map((d) => {
              const e = entries[d.key];
              if (!e) return null;
              const date = new Date(d.date);
              return (
                <li key={d.id} className="diary-row">
                  <div className="diary-day"><strong>{date.getDate()}</strong><span>{date.toLocaleDateString('it-IT', { weekday: 'short' })}</span></div>
                  <Link to={`/${e.type}/${e.id}`} className="diary-thumb"><Img src={img.poster(e.poster, 'w154')} alt={e.title} /></Link>
                  <Link to={`/${e.type}/${e.id}`} className="diary-info">
                    <strong>{e.title}</strong>
                    <span className="muted small">{d.label ?? `${kindLabel[d.kind]} · ${e.year}`}</span>
                    {d.rating ? <Stars value={d.rating} size={12} /> : null}
                  </Link>
                  <button className="icon-btn sm ghosty" aria-label="Rimuovi dal diario" onClick={() => { actions.removeDiary(d.id); toast('Rimosso dal diario'); }}><Icon name="trash" size={15} /></button>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
