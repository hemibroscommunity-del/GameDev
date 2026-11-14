import React, { useCallback, useState } from 'react';
import { bookTableText } from '../../debug/report.js';

/* ═══ v2.3.5125: THE SMOOTHNESS TABLE, IN THE TEST PANEL (the grand plan's step 1.2) ═══
 *
 * Every phone sends how smoothly the game ran on it (debug/report.js), and a
 * Speed test sends its card; the worker adds them into the day's book by
 * device class, with no name on them (server/src/report.js).  No coding
 * session can reach the live game, so until a reader brings the book into
 * the repository (step 1.3, the owner's call 6) the owner copies it from
 * here and pastes it into a session: "Copy table" puts the days' `dev` and
 * `speed` parts on the clipboard as plain text (report.js bookTableText).
 *
 * Read through the book's ONE admin route (GET /dev/daybook, devtools.js),
 * with the panel's `call`, which carries the admin key.  Drawn only when
 * asked for.  A box of the Test panel, not a window of its own.
 */
export function ReportTable({ call, busy, setMsg, COL, btn, label }) {
  const [book, setBook] = useState(null);
  const [days, setDays] = useState(1);
  const [text, setText] = useState('');
  const load = useCallback(async (n) => {
    const j = await call('/dev/daybook?days=' + n);
    if (!j || !j.ok) return;
    setBook(j);
    setText(bookTableText(j.days || []));
    const cells = (j.days || []).reduce((a, d) => a + Object.keys(d.dev || {}).length, 0);
    const cards = (j.days || []).reduce((a, d) => a + Object.keys(d.speed || {}).length, 0);
    setMsg((j.on === false ? 'The day\'s book is switched OFF (the daybook flag). ' : '')
      + cells + ' smoothness cell(s) and ' + cards + ' speed card(s) in ' + (j.days || []).length + ' day(s).');
  }, [call, setMsg]);
  /* the copy is the tap's own (iOS asks for one); the box below is there to select by hand if it is refused */
  const copy = useCallback(() => {
    const done = () => setMsg('Copied: paste it into a session.');
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done, () => setMsg('Copy refused: select the text below and copy it.')); return; }
    } catch (e) { /* the box below */ }
    setMsg('Select the text below and copy it.');
  }, [text, setMsg]);
  const pick = { minHeight: 32, borderRadius: 8, border: '1px solid ' + COL.border, background: COL.raised, color: COL.text, touchAction: 'manipulation', marginRight: 6 };
  return (
    <>
      <div style={label}>Smoothness table (every phone)</div>
      <div style={{ color: COL.muted, fontSize: 12, marginBottom: 6, lineHeight: 1.4 }}>
        How smoothly the game ran, from every phone's reports and Speed test cards, by device type (no names), a day (UTC).
        Copy it and paste it into a session to ask how the game runs on a device.
      </div>
      <select data-report-days="1" value={days} style={pick} onChange={(e) => setDays(Number(e.target.value))}>
        <option value={1}>Today</option>
        <option value={7}>Last 7 days</option>
        <option value={30}>Last 30 days</option>
      </select>
      <button type="button" data-report-load="1" style={btn(false)} disabled={busy} onClick={() => load(days)}>
        {book ? 'Reload table' : 'Show table'}
      </button>
      {book && (
        <>
          <button type="button" data-report-copy="1" style={btn(false)} disabled={!text} onClick={copy}>Copy table</button>
          <textarea data-report-text="1" readOnly value={text}
            style={{ display: 'block', width: '100%', boxSizing: 'border-box', minHeight: 140, marginTop: 6, fontSize: 11, fontFamily: 'ui-monospace, monospace',
              background: COL.raised, color: COL.text2, border: '1px solid ' + COL.border, borderRadius: 8, touchAction: 'manipulation' }} />
        </>
      )}
    </>
  );
}
