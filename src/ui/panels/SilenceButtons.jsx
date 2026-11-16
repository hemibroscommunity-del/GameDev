import React, { useState, useCallback } from 'react';
import { SILENCE_PATH, SILENCE_CHOICES, untilWords, askWords, silencedWords, liftedWords } from '../../game/silenceOwner.js';
import { notYetWords } from '../../game/feedbackOwner.js';
/* ═══ v2.3.5605: SILENCE FROM A CHAT REPORT (card OPS PR 6) ═══
 *
 * Card MOD's #1897 gave the owner a silence (server/src/silence.js): the
 * character's words reach nobody, and they still play -- between a Kick (back
 * at once) and a Freeze (kept out).  The owner never runs a terminal command
 * (CLAUDE.md §1), so under each chat report, beside its Freeze: Silence for a
 * minute, an hour, a day, or until lifted, and Lift while one runs.  Each asks
 * once (the first tap says what it will do, in the panel's message line),
 * then sends through `callOwner` (the admin key; DevPanel.jsx) and says the
 * reply in words.  A 404 is a worker without the route, or a key it does not
 * take: told apart by the panel's own admin route, quietly
 * (feedbackOwner.js notYetWords).
 *
 * `until` is the running silence's end (0: until lifted; undefined: none),
 * from the list the panel reads with the reports (GET /api/admin/silence).
 */
export function SilenceButtons({ r, until, call, callOwner, busy, setMsg, chip, COL, onChanged }) {
  const [armed, setArmed] = useState('');
  /* v2.3.5605 (mend, sitting 19b): its words shown right under its buttons
     too (the panel's line is ~1,300 px above on a phone) */
  const [note, setNote] = useState('');
  const say = useCallback((t) => { setNote(t); setMsg(t); }, [setMsg]);
  const who = r.targetName || r.target;
  const silenced = until !== undefined && until !== null;
  const why404 = useCallback(async () => {
    const probe = await call('/overview', null, null, { quiet: true });
    say(notYetWords(!!probe, 'silence anyone'));
  }, [call, say]);
  const act = useCallback(async (choice) => {
    if (armed !== choice.key) { setArmed(choice.key); say(askWords(who, choice)); return; }
    setArmed('');
    const res = await callOwner(SILENCE_PATH, 'POST', { playerId: r.target, minutes: choice.minutes, note: 'chat report: ' + (r.reason || 'other') }, { say: setNote });
    if (!res || !res.status) return;
    if (res.status === 404) { await why404(); return; }
    if (res.j && res.j.ok) { say(silencedWords(who, res.j, Date.now())); if (onChanged) onChanged(); }
    else say('The silence did not go through' + (res.j && res.j.error ? ': ' + res.j.error : ' (' + res.status + ')') + '.');
  }, [armed, callOwner, onChanged, r, say, who, why404]);
  const lift = useCallback(async () => {
    if (armed !== 'unsilence') { setArmed('unsilence'); say('Lift ' + who + '\'s silence? Tap Lift again to do it.'); return; }
    setArmed('');
    const res = await callOwner(SILENCE_PATH + '?id=' + encodeURIComponent(r.target), 'DELETE', undefined, { say: setNote });
    if (!res || !res.status) return;
    if (res.status === 404) { await why404(); return; }
    if (res.j && res.j.ok) { say(liftedWords(who, res.j)); if (onChanged) onChanged(); }
    else say('Lifting did not go through' + (res.j && res.j.error ? ': ' + res.j.error : ' (' + res.status + ')') + '.');
  }, [armed, callOwner, onChanged, r, say, who, why404]);
  const small = { ...chip, minHeight: 34, flex: 'none', touchAction: 'manipulation' };
  return (
    <div data-silence={r.target} style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      {silenced ? (
        <>
          <span data-silence-state="1" style={{ font: '600 11.5px system-ui, sans-serif', color: COL.danger }}>
            {'Silenced ' + untilWords(until, Date.now())}
          </span>
          <button type="button" data-silence-act="unsilence" style={small} disabled={busy} onClick={lift}>
            {armed === 'unsilence' ? 'Sure? Lift' : 'Lift'}
          </button>
        </>
      ) : (
        <>
          <span style={{ font: '600 11.5px system-ui, sans-serif', color: COL.muted }}>Silence:</span>
          {SILENCE_CHOICES.map((c) => (
            <button key={c.key} type="button" data-silence-act={c.key}
              style={{ ...small, borderColor: armed === c.key ? COL.danger : COL.border, color: armed === c.key ? COL.danger : COL.text }}
              disabled={busy} onClick={() => act(c)}>{armed === c.key ? 'Sure? ' + c.label : c.label}</button>
          ))}
        </>
      )}
      {note ? (
        <div data-silence-note="1" role="status" style={{ flexBasis: '100%', color: COL.text, fontSize: 12.5, lineHeight: 1.4 }}>{note}</div>
      ) : null}
    </div>
  );
}
