import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ART_W, ART_H, artColorAt, isValidArt } from '@/rendering/traits/playerArt.js';
import { useBoardFaces } from '@/ui/mobile/dash/BoardRow.jsx';
import { accPct } from '@/game/accuracy.js';

/* ═══ v2.3.4480: TWO BOXES OF THE TEST PANEL -- WHAT PLAYERS DREW, AND HOW WELL THEY AIM ═══
 *
 * The owner, 2026-11-10: "I also need profile pic and character images of
 * other players saved somewhere so I can monitor for anything inappropriate
 * that they drew in the custom character creator", and "I want somewhere
 * that stats keep track of 'accuracy'".
 *
 * PLAYER DRAWINGS (server/src/charwatch.js): every character that has drawn
 * something, newest first, a page at a time.  A drawing is a 16 x 16 grid of
 * the creator's sixteen colours: each is drawn here from the stored record
 * itself, six times its size, on grey (so white ink and black ink both
 * show), under the name of where it is worn.  NEW marks what was made since
 * "Mark all seen" was last pressed -- a drawing cannot change after its
 * character is made, so one mark in time is all "seen" needs.  "Remove
 * drawings" (two taps) takes a character's drawings off its record for
 * everyone and for good; Freeze is the Chat reports' own.
 *
 * ACCURACY (server/src/accuracy.js): every player's basic shots and hits, a
 * weapon, a day -- the owner's view of whether a change to a weapon moved
 * how often it lands.
 *
 * Both are the owner's alone: every call goes through the panel's `call`,
 * which carries the admin key.  Drawn only when asked for (a button each).
 */

/* the drawing keys of a character's record (server join.js DRAWING_KEYS), in the order a body is read, and where
   each is worn */
const ART_WHERE = [
  ['tf', 'Face'], ['tb', 'Back of head'], ['ta', 'Chest'], ['tr', 'Back'], ['tm', 'Arm'],
  ['sa', 'Shirt front'], ['sb', 'Shirt back'], ['pa', 'Trousers front'], ['pb', 'Trousers back'],
];
const CELL = 6;

function ArtTile({ k, where, art, COL }) {
  const ref = useRef(null);
  const ok = isValidArt(art);
  useEffect(() => {
    const cv = ref.current;
    if (!cv || !ok) return;
    const g = cv.getContext('2d');
    g.clearRect(0, 0, ART_W, ART_H);
    for (let y = 0; y < ART_H; y++) {
      for (let x = 0; x < ART_W; x++) {
        const c = artColorAt(art, x, y);
        if (c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); }
      }
    }
  }, [art, ok]);
  return (
    <div data-watch-art={k} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {ok ? (
        <canvas ref={ref} width={ART_W} height={ART_H} style={{
          width: ART_W * CELL, height: ART_H * CELL, imageRendering: 'pixelated', background: '#6b7785',
          border: '1px solid ' + COL.border, borderRadius: 4,
        }} />
      ) : (
        <div style={{ width: ART_W * CELL, height: ART_H * CELL, display: 'flex', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', fontSize: 10, color: COL.muted, border: '1px solid ' + COL.border, borderRadius: 4 }}>
          cannot be drawn ({String(art || '').length} characters)
        </div>
      )}
      <span style={{ fontSize: 10.5, color: COL.text2 }}>{where}</span>
    </div>
  );
}

const dayWords = (at) => {
  if (!at) return 'date unknown';
  try { return new Date(at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); } catch (_e) { return ''; }
};

export function PlayerDrawings({ call, busy, setMsg, COL, btn, chip, label }) {
  const [page, setPage] = useState(null);      /* { rows, total, fresh, seenAt, more } */
  const [sure, setSure] = useState('');
  const faces = useBoardFaces((page ? page.rows : []).map((r) => ({ look: r.face || null })));

  const load = useCallback(async (older) => {
    const before = older && page && page.rows.length ? page.rows[page.rows.length - 1].createdAt : 0;
    const j = await call('/dev/looks?limit=24' + (before ? '&before=' + before : ''));
    if (!j || !j.ok) return;
    setPage((was) => (older && was
      ? { ...j, rows: was.rows.concat(j.rows.filter((r) => !was.rows.some((w) => w.id === r.id))) }
      : j));
    if (!older) setMsg(j.total ? j.total + ' character' + (j.total === 1 ? ' has' : 's have') + ' drawn something; ' + j.fresh + ' new.' : 'Nobody has drawn anything yet.');
  }, [call, page, setMsg]);

  const markSeen = useCallback(async () => {
    const j = await call('/dev/lookseen', {});
    if (!j || !j.ok) return;
    setPage((was) => (was ? { ...was, seenAt: j.seenAt, fresh: 0, rows: was.rows.map((r) => ({ ...r, fresh: false })) } : was));
    setMsg('Marked. From now on only characters made after this moment are NEW.');
  }, [call, setMsg]);

  const wipe = useCallback(async (r) => {
    if (sure !== 'wipe:' + r.id) { setSure('wipe:' + r.id); return; }
    setSure('');
    const j = await call('/dev/lookwipe', { playerId: r.id });
    if (!j || !j.ok) return;
    setPage((was) => (was ? { ...was, total: Math.max(0, was.total - 1), rows: was.rows.filter((w) => w.id !== r.id) } : was));
    setMsg('Removed ' + (r.name || 'that character') + "'s drawings" + (j.wasOnline ? ' (they are in the world: everyone near them was told).' : '.'));
  }, [call, sure, setMsg]);

  const freeze = useCallback(async (r) => {
    if (sure !== 'freeze:' + r.id) { setSure('freeze:' + r.id); return; }
    setSure('');
    const j = await call('/freeze', { playerId: r.id, note: 'drawings' });
    if (j && j.ok) setMsg('Frozen: ' + (r.name || r.id) + ' cannot come in until you unfreeze them (Chat reports, or the commands in OPERATIONS).');
  }, [call, sure, setMsg]);

  return (
    <>
      <div style={label}>Player drawings</div>
      <button type="button" data-watch-load="1" style={btn(false)} disabled={busy} onClick={() => load(false)}>
        {page ? 'Reload player drawings' : 'Show player drawings'}
      </button>
      {page && (
        <>
          <div style={{ color: COL.muted, fontSize: 12, marginBottom: 6, lineHeight: 1.4 }}>
            Every character that drew something in the creator, newest first: {page.total} in all, {page.fresh} new since you last marked them seen.
            Remove drawings takes them off that character for everyone, for good (its hair, clothes and name stay).
          </div>
          {page.fresh > 0 && (
            <button type="button" data-watch-seen="1" style={{ ...chip, minHeight: 34, marginBottom: 8 }} disabled={busy} onClick={markSeen}>
              Mark all seen
            </button>
          )}
          {page.rows.length === 0 && (
            <div data-watch-empty="1" style={{ color: COL.text2, fontSize: 12, marginBottom: 8 }}>Nobody has drawn anything yet.</div>
          )}
          {page.rows.map((r, i) => (
            <div key={r.id} data-watch-row={r.id} style={{
              marginBottom: 6, background: COL.raised, borderRadius: 8, padding: '8px 9px', border: '1px solid ' + COL.border,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {faces[i] ? <img src={faces[i]} alt="" width={32} height={32} style={{ borderRadius: 6, flex: 'none' }} /> : null}
                <span data-watch-name="1" style={{ flex: 1, minWidth: 0, font: '600 13px system-ui, sans-serif',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.name || '(no name)'}
                </span>
                {r.fresh ? <span data-watch-new="1" style={{ font: '700 10.5px system-ui, sans-serif', color: COL.accent }}>NEW</span> : null}
                <span style={{ font: '600 11px system-ui, sans-serif', color: r.online ? COL.accent : COL.muted }}>
                  {r.online ? 'online' : 'offline'}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: COL.text2, marginTop: 2 }}>made {dayWords(r.createdAt)}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                {ART_WHERE.filter(([k]) => r.art && r.art[k]).map(([k, where]) => (
                  <ArtTile key={k} k={k} where={where} art={r.art[k]} COL={COL} />
                ))}
              </div>
              <div style={{ fontSize: 11, marginTop: 4, color: COL.muted, wordBreak: 'break-all', userSelect: 'all' }}>{r.id}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                <button type="button" data-watch-act="wipe" style={{ ...chip, minHeight: 34, flex: 'none', borderColor: COL.danger, color: COL.danger }}
                  disabled={busy} onClick={() => wipe(r)}>
                  {sure === 'wipe:' + r.id ? 'Sure? Remove' : 'Remove drawings'}
                </button>
                <button type="button" data-watch-act="freeze" style={{ ...chip, minHeight: 34, flex: 'none' }}
                  disabled={busy} onClick={() => freeze(r)}>
                  {sure === 'freeze:' + r.id ? 'Sure? Freeze' : 'Freeze'}
                </button>
              </div>
            </div>
          ))}
          {page.more && (
            <button type="button" data-watch-more="1" style={btn(false)} disabled={busy} onClick={() => load(true)}>Show older ones</button>
          )}
        </>
      )}
    </>
  );
}

const DAY = (d) => (typeof d === 'string' && d.length === 8 ? d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6) : String(d || ''));

export function AccuracyDays({ call, busy, setMsg, COL, btn, label }) {
  const [days, setDays] = useState(null);
  const [on, setOn] = useState(true);
  const load = useCallback(async () => {
    const j = await call('/dev/accuracy?days=14');
    if (!j || !j.ok) return;
    setDays(j.days || []);
    setOn(j.on !== false);
    setMsg((j.days || []).length ? 'Accuracy for the last ' + j.days.length + ' day' + (j.days.length === 1 ? '' : 's') + ' with a shot fired.' : 'No shots counted yet.');
  }, [call, setMsg]);
  const cell = (p) => {
    const s = (p && p[0]) || 0, h = (p && p[1]) || 0;
    return s > 0 ? accPct(s, h) + ' of ' + s.toLocaleString() : '—';
  };
  const td = { padding: '4px 6px', fontSize: 12, fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid ' + COL.border, textAlign: 'right' };
  return (
    <>
      <div style={label}>Accuracy (all players)</div>
      <button type="button" data-acc-load="1" style={btn(false)} disabled={busy} onClick={load}>
        {days ? 'Reload accuracy' : 'Show accuracy'}
      </button>
      {days && (
        <>
          <div style={{ color: COL.muted, fontSize: 12, marginBottom: 6, lineHeight: 1.4 }}>
            Basic attacks only, every player together, a day (UTC): how many hit an enemy, of how many were made.
            The hits are the server's own count; the shots are each phone's. {on ? '' : 'Counting is switched OFF (the accuracy flag).'}
          </div>
          {days.length === 0 ? (
            <div data-acc-empty="1" style={{ color: COL.text2, fontSize: 12, marginBottom: 8 }}>No shots counted yet.</div>
          ) : (
            <table data-acc-table="1" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
              <thead>
                <tr>
                  {['Day', 'Sword', 'Bow', 'Staff'].map((h, i) => (
                    <th key={h} style={{ ...td, textAlign: i ? 'right' : 'left', color: COL.text2, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d.day} data-acc-day={d.day}>
                    <td style={{ ...td, textAlign: 'left' }}>{DAY(d.day)}</td>
                    <td style={td}>{cell(d.melee)}</td>
                    <td style={td}>{cell(d.ranged)}</td>
                    <td style={td}>{cell(d.staff)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </>
  );
}
