import React, { useCallback, useState } from 'react';
import { USAGE_SWITCHES, usageTop, usageWords } from '../../game/usageMeter.js';

/* ═══ v2.3.6001: THE USAGE METER (card CS PR 2) ═══
 *
 * The owner, 2026-11-17, turning the six cost switches on: "I think turn all
 * of them on then we monitor usage cost".  This box shows what the worker
 * counted, in memory, since it started and today (UTC): the rows it wrote
 * and read and the messages it sent, the biggest kinds of each, and the six
 * switches' own rows apart, with an estimate of today's writes against
 * Cloudflare's included usage (game/usageMeter.js).  Cloudflare's dashboard
 * is the truth, and the box says so.
 *
 * Read through GET /dev/usage (devtools.js) with the panel's `call`, which
 * carries the admin key.  Drawn only when asked for.  A box of the Test
 * panel, not a window of its own.  Notes: docs/UI-DESIGN-NOTES.md, "The
 * usage meter (the Test panel)".
 */
const num = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');

export function UsageMeter({ call, busy, setMsg, COL, btn, label }) {
  const [u, setU] = useState(null);
  const load = useCallback(async () => {
    const j = await call('/dev/usage');
    if (!j || !j.ok) return;
    setU(j);
    setMsg(j.on === false ? 'The usage meter is switched OFF (the usagemeter flag): nothing is being counted.' : 'Usage: counted in the server\'s memory.');
  }, [call, setMsg]);
  const row = { display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, lineHeight: 1.45, color: COL.text };
  const sub = { color: COL.muted, fontSize: 12, lineHeight: 1.4 };
  const box = { marginTop: 6, padding: 8, borderRadius: 8, border: '1px solid ' + COL.border, background: COL.raised };
  const kinds = (title, byKind) => {
    const top = usageTop(byKind, 6);
    return (
      <div style={{ ...sub, marginTop: 2 }}>{title}: {top.length ? top.map(([k, n]) => k.replace(/:$/, '') + ' ' + num(n)).join(', ') : 'none'}</div>
    );
  };
  const bucket = (name, b, attr) => (
    <div data-usage-bucket={attr} style={{ marginBottom: 8 }}>
      <div style={{ ...row, fontWeight: 600 }}><span>{name}</span></div>
      <div style={row}><span>Rows written</span><strong>{num(b.writes)}</strong></div>
      {kinds('Most written', b.byKind && b.byKind.writes)}
      <div style={row}><span>Rows read</span><strong>{num(b.reads)}</strong></div>
      {kinds('Most read', b.byKind && b.byKind.reads)}
      <div style={row}><span>Messages sent</span><strong>{num(b.sends)}</strong></div>
      {kinds('Most sent', b.byKind && b.byKind.sends)}
    </div>
  );
  return (
    <>
      <div style={label}>Usage (the server's rows and messages)</div>
      <div style={{ ...sub, marginBottom: 6 }}>
        Rows the server wrote and read, and messages it sent, today (UTC) and since it last started. Counted in memory: an update starts it again. Cloudflare bills the messages the server receives; the ones it sends show its traffic.
      </div>
      <button type="button" data-usage-load="1" style={{ ...btn(false), touchAction: 'manipulation' }} disabled={busy} onClick={load}>
        {u ? 'Reload usage' : 'Show usage'}
      </button>
      {u && u.today && u.sinceStart && (
        <div data-usage-card="1" style={box}>
          {usageWords(u).map((w, i) => (
            <div key={i} data-usage-estimate={i} style={{ ...row, display: 'block', marginBottom: 2 }}>{w}</div>
          ))}
          <div style={{ ...sub, margin: '4px 0 8px' }}>
            The truth is Cloudflare's own page: Workers &amp; Pages, brotown-server, Metrics; and Billing.
          </div>
          {bucket('Today', u.today, 'today')}
          {bucket('Since the server started', u.sinceStart, 'start')}
          <div style={{ ...row, fontWeight: 600 }}><span>The six cost switches, today</span></div>
          {USAGE_SWITCHES.map((s) => {
            const c = (u.today.switches && u.today.switches[s.name]) || { writes: 0, reads: 0 };
            return (
              <div key={s.name} data-usage-switch={s.name} style={{ marginBottom: 4 }}>
                <div style={row}><span>{s.name}</span><strong>{num(c.writes)} written, {num(c.reads)} read</strong></div>
                <div style={sub}>{s.what}</div>
              </div>
            );
          })}
          <div style={{ ...sub, marginTop: 4 }}>
            Any of them turns off in Live flags, Set a switch: its name, then off.
          </div>
        </div>
      )}
    </>
  );
}
