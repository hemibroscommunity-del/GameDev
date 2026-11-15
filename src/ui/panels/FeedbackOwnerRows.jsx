import React, { useState, useCallback } from 'react';
import { FEEDBACK_ROUTES, postLine, sweepWords, notYetWords } from '../../game/feedbackOwner.js';
/* ═══ v2.3.5603: THE TEST PANEL LOOKS AFTER THE FEEDBACK BOARD (card OPS PR 4) ═══
 *
 * Red team RT-3 (#1878) put two owner's routes on the Feedback object, behind
 * the admin key: take one post down, and sweep the board (oversized posts and
 * old pace rows out, its counts rebuilt).  The owner never runs a terminal
 * command (CLAUDE.md §1), so each is a row here:
 *
 *   - "Show the newest posts": the board's newest 20 (its public list), each
 *     with a Take down that asks once more, then removes it;
 *   - "Sweep the feedback board": asks once more, then sweeps, and says the
 *     reply's numbers in words.
 *
 * The admin key goes as `Authorization: Bearer`, through the panel's
 * `callOwner` (DevPanel.jsx: the same key and timeout as its `/api/admin`
 * `call`, for a path outside it; act() carries a player's session, never the
 * owner's key).  A 404 is the Feedback object's answer both to a worker
 * without the routes and to a key it does not take; the panel's own admin
 * route (`/overview`, quiet) tells the two apart, and the row says which.
 *
 * A box of the Test panel.  Notes: docs/UI-DESIGN-NOTES.md, "The Test panel
 * looks after the feedback board".
 */
export function FeedbackOwnerRows({ call, callOwner, busy, setMsg, COL, btn, chip, label }) {
  const [posts, setPosts] = useState(null);
  const [armedId, setArmedId] = useState(null);
  const [sweepArmed, setSweepArmed] = useState(false);

  /* a 404: the route is not on this worker, or the key is not taken */
  const why404 = useCallback(async (what) => {
    const probe = await call('/overview', null, null, { quiet: true });
    setMsg(notYetWords(!!probe, what));
  }, [call, setMsg]);

  const show = useCallback(async () => {
    setArmedId(null);
    const r = await callOwner(FEEDBACK_ROUTES.LIST, 'GET');
    if (!r || r.status !== 200 || !r.j || !Array.isArray(r.j.tickets)) {
      if (r && r.status) setMsg('The feedback board did not answer (' + r.status + ').');
      return;
    }
    setPosts(r.j.tickets.filter((t) => t && typeof t.id === 'string'));
    setMsg(r.j.tickets.length ? '' : 'The feedback board is empty.');
  }, [callOwner, setMsg]);

  const takeDown = useCallback(async (t) => {
    if (armedId !== t.id) { setArmedId(t.id); setSweepArmed(false); setMsg('Take down this post? ' + postLine(t) + ' Tap Take down again to do it.'); return; }
    setArmedId(null);
    const r = await callOwner(FEEDBACK_ROUTES.TICKET + encodeURIComponent(t.id), 'DELETE');
    if (!r || !r.status) return;
    if (r.status === 404) { await why404('take a post down'); return; }
    if (r.j && r.j.ok) {
      setPosts((p) => (p || []).filter((x) => x.id !== t.id));
      setMsg('Took down ' + (t.playerName || 'Bro') + '\'s post. Nobody sees it on the board now.');
    } else {
      setMsg('That post is already gone.');
      setPosts((p) => (p || []).filter((x) => x.id !== t.id));
    }
  }, [armedId, callOwner, setMsg, why404]);

  const sweep = useCallback(async () => {
    if (!sweepArmed) { setSweepArmed(true); setArmedId(null); setMsg('Sweep the feedback board? Posts that are too big and old pace rows are removed for good, and the board\'s counts made again. Tap Sweep again to do it.'); return; }
    setSweepArmed(false);
    const r = await callOwner(FEEDBACK_ROUTES.SWEEP, 'DELETE');
    if (!r || !r.status) return;
    if (r.status === 404) { await why404('sweep the board'); return; }
    if (r.j && r.j.ok) setMsg(sweepWords(r.j));
    else setMsg('The sweep did not go through' + (r.j && r.j.error ? ': ' + r.j.error : ' (' + r.status + ')') + '.');
  }, [callOwner, setMsg, sweepArmed, why404]);

  return (
    <div data-fb-owner="1">
      <div style={label}>Feedback board</div>
      <div style={{ color: COL.muted, fontSize: 12, marginBottom: 7, lineHeight: 1.4 }}>
        Take down a post anyone can read on the board, or sweep the board. Each asks once more before it acts.
      </div>
      <button type="button" data-fb-show="1" style={{ ...btn(false), touchAction: 'manipulation' }} disabled={busy} onClick={show}>
        {posts ? 'Show the newest posts again' : 'Show the newest posts'}
      </button>
      {posts && posts.map((t) => (
        <div key={t.id} data-fb-post={t.id} style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
          background: COL.raised, borderRadius: 8, padding: '8px 9px',
          border: '1px solid ' + (armedId === t.id ? COL.danger : COL.border),
        }}>
          <span style={{ flex: 1, minWidth: 0, font: '500 12.5px system-ui, sans-serif', color: COL.text, lineHeight: 1.35, overflowWrap: 'anywhere' }}>
            {postLine(t)}
          </span>
          <button type="button" data-fb-down={t.id}
            style={{ ...chip, minHeight: 34, flex: 'none', color: COL.danger, borderColor: armedId === t.id ? COL.danger : COL.border, touchAction: 'manipulation' }}
            disabled={busy} onClick={() => takeDown(t)}>{armedId === t.id ? 'Sure?' : 'Take down'}</button>
        </div>
      ))}
      <button type="button" data-fb-sweep="1"
        style={{ ...btn(sweepArmed), borderColor: COL.danger, color: COL.danger, touchAction: 'manipulation' }}
        disabled={busy} onClick={sweep}>
        {sweepArmed ? 'Sure? Sweep the feedback board' : 'Sweep the feedback board'}
      </button>
    </div>
  );
}
