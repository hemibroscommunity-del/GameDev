import React, { useCallback, useState } from 'react';
import { ECON_NUMBERS, econDays, econCompute } from '../../game/econCard.js';

/* ═══ v2.3.5093: THE OWNER'S CARD, THE ECONOMY (the grand plan's step 10.4, card E PR 12) ═══
 *
 * The day's book on screen: for each day, the gold and the items the game
 * MADE and DESTROYED (its `econ` part, counted by the gold and bag doors as
 * each road runs), and the room's own row (card A's `room` part: joins,
 * restarts, rows written, saves refused); then the economy's five numbers
 * (game/econCard.js ECON_NUMBERS).  A number nothing counts yet reads "not
 * counted yet", never a 0 that looks like a reading.
 *
 * Read through the book's ONE admin route (GET /dev/daybook, devtools.js,
 * card A's) with the panel's `call`, which carries the admin key.  Drawn only
 * when asked for.  A box of the Test panel, not a window of its own (the
 * panel's own Close closes it).  Notes: docs/UI-DESIGN-NOTES.md, "The owner's
 * card: the economy".
 */
const fmt = (n) => (Math.round(n) === n ? n : Math.round(n * 100) / 100).toLocaleString('en-US');
const dayName = (d) => (/^\d{8}$/.test(d) ? d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6, 8) : d || '?');
const items = (list, n) => (list.length ? list.slice(0, n).map(([k, v]) => k + ' ' + fmt(v)).join(', ') + (list.length > n ? ', ...' : '') : 'none');

export function EconCard({ call, busy, setMsg, COL, btn, label }) {
  const [book, setBook] = useState(null);
  const [card, setCard] = useState(null);
  const [days, setDays] = useState(1);
  /* v2.3.5093: the numbers want a week of the book whatever is shown, and the
     card's other read (GET /dev/econcard: the daily counts, the ledger) */
  const load = useCallback(async (n) => {
    const j = await call('/dev/daybook?days=' + Math.max(n, 8));
    if (!j || !j.ok) return;
    const c = await call('/dev/econcard?days=1');
    setBook(j);
    setCard(c && c.ok ? c : null);
    setMsg((j.on === false ? 'The day\'s book is switched OFF (the daybook flag). ' : '')
      + 'The economy: ' + Math.min(n, (j.days || []).length) + ' day(s) of the book.');
  }, [call, setMsg]);
  const pick = { minHeight: 32, borderRadius: 8, border: '1px solid ' + COL.border, background: COL.raised, color: COL.text, touchAction: 'manipulation', marginRight: 6 };
  const row = { display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, lineHeight: 1.45, color: COL.text };
  const sub = { color: COL.muted, fontSize: 12, lineHeight: 1.4 };
  const shown = book ? econDays(book).slice(0, days) : [];
  const numbers = econCompute(book, card);
  const pct = (v) => Math.round(v * 1000) / 10 + '%';
  const shownAs = (id, x) => {
    if (!x || x.v === null) return null;
    if (id === 'oneWay' || id === 'richest') return pct(x.v);
    if (id === 'perHour') return fmt(Math.round(x.v)) + ' an hour' + (x.week !== null && x.week !== undefined ? ' (week ' + fmt(Math.round(x.week)) + ')' : '');
    if (id === 'unexplained') return fmt(x.v) + ' gold';
    return fmt(x.v);
  };
  return (
    <>
      <div style={label}>The economy (the day's book)</div>
      <div style={{ ...sub, marginBottom: 6 }}>
        Gold and items the game made and destroyed, a day (UTC), and the room's own counts. Moves between players and gold the game holds are not making or destroying.
      </div>
      <select data-econ-days="1" value={days} style={pick} onChange={(e) => setDays(Number(e.target.value))}>
        <option value={1}>Today</option>
        <option value={7}>Last 7 days</option>
        <option value={30}>Last 30 days</option>
      </select>
      <button type="button" data-econ-load="1" style={btn(false)} disabled={busy} onClick={() => load(days)}>
        {book ? 'Reload the economy' : 'Show the economy'}
      </button>
      {book && (
        <div data-econ-card="1" style={{ marginTop: 6, padding: 8, borderRadius: 8, border: '1px solid ' + COL.border, background: COL.raised }}>
          {ECON_NUMBERS.map((n) => {
            const x = numbers[n.id];
            const v = shownAs(n.id, x);
            return (
              <div key={n.id} data-econ-number={n.id} style={{ marginBottom: 6 }}>
                <div style={row}>
                  <span>{n.name}</span>
                  <strong data-econ-value={v === null ? 'none' : 'counted'} style={{ color: v === null ? COL.muted : (n.id === 'unexplained' && x.v !== 0 ? COL.danger : COL.text) }}>
                    {v === null ? 'not counted yet' : v}
                  </strong>
                </div>
                <div style={sub}>{n.what}{v === null && x && x.why ? ' (' + x.why + ')' : ''}</div>
              </div>
            );
          })}
          {book.on === false && <div style={{ ...sub, color: COL.danger, marginTop: 4 }}>The day's book is switched off: what is shown is what was written before.</div>}
          {shown.length === 0 && <div style={{ ...sub, marginTop: 4 }}>The book has no days yet.</div>}
          {shown.map((d) => (
            <div key={d.day} data-econ-day={d.day} style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid ' + COL.border }}>
              <div style={{ ...row, fontWeight: 700 }}><span>{dayName(d.day)}</span>{d.newer && <span style={{ color: COL.muted }}>a newer worker's day</span>}</div>
              <div style={row}><span>Gold made</span><span data-econ-gold-made="1">{fmt(d.goldMade)}</span></div>
              <div style={row}><span>Gold destroyed</span><span data-econ-gold-gone="1">{fmt(d.goldGone)}</span></div>
              <div style={row}><span>Gold made, less destroyed</span><span>{fmt(d.goldMade - d.goldGone)}</span></div>
              <div style={row}><span>Play</span><span>{fmt(Math.round(d.playSeconds / 360) / 10)} player-hour(s)</span></div>
              <div style={sub}>Items made: {items(d.itemsMade, 6)}</div>
              <div style={sub}>Items destroyed: {items(d.itemsGone, 6)}</div>
              <div style={{ ...sub, marginTop: 4 }}>
                Joins {fmt(d.room.joins[0] + d.room.joins[1])}, restarts {fmt(d.room.restarts)}, rows written {fmt(d.room.rows[0])} and deleted {fmt(d.room.rows[1])},
                saves refused {fmt(d.room.refused[0] + d.room.refused[1])}; {fmt(d.devCells)} smoothness cell(s), {fmt(d.speedCards)} speed card(s).
              </div>
              {d.over.length > 0 && <div style={{ ...sub, color: COL.danger }}>A full part left numbers out: {d.over.map(([k, n]) => k + ' ' + n).join(', ')}</div>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
