import React, { useState, useCallback } from 'react';
import { RENAME_PATH, RENAME_MAX, refusedWords, renameBody, askRenameWords, renamedWords } from '../../game/renameOwner.js';
import { notYetWords } from '../../game/feedbackOwner.js';
/* ═══ v2.3.5611: RENAME FROM THE TEST PANEL (card OPS PR 12) ═══
 *
 * Card MOD's #1907 made a character's name permanent: the phone can no longer
 * change it, and only the owner renames (POST /api/admin/rename, the admin
 * key; server/src/charname.js).  The owner never runs a terminal command
 * (CLAUDE.md §1), so the Test panel offers it twice:
 *   - under each chat report, beside its Silence: the reported character;
 *   - in the Character section (`mine`): the owner's own, where the Staff
 *     word chip sends `force` (a name like "Owner" only the owner may take).
 * A "Rename" chip opens it: the new name, then a first tap that says what it
 * will do (the panel's message line) and a second that sends it through
 * `callOwner`, and the reply in words (renameOwner.js): the old name and the
 * new, or why the server refused it.  A 404 that is not the route's own "no
 * such character" is a worker without the route, or a key it does not take:
 * told apart quietly by the panel's own admin route (feedbackOwner.js
 * notYetWords), as the silence does.
 *
 * A box of the Test panel, not a window of its own.  Notes:
 * docs/UI-DESIGN-NOTES.md, "The Test panel renames a character".
 */
export function RenameRow({ targetId, who, mine, call, callOwner, busy, setMsg, chip, COL }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [force, setForce] = useState(false);
  const [armed, setArmed] = useState(false);
  const small = { ...chip, minHeight: 34, flex: 'none', touchAction: 'manipulation' };
  const field = {
    flex: '1 1 140px', minWidth: 0, boxSizing: 'border-box', background: COL.well, color: COL.text,
    border: '1px solid ' + COL.border, borderRadius: 8, padding: '7px 9px', minHeight: 34,
    touchAction: 'manipulation',
  };
  const why404 = useCallback(async () => {
    const probe = await call('/overview', null, null, { quiet: true });
    setMsg(notYetWords(!!probe, 'rename anyone'));
  }, [call, setMsg]);
  const go = useCallback(async () => {
    const n = name.trim();
    if (!n || !targetId) return;
    const f = !!(mine && force);
    if (!armed) { setArmed(true); setMsg(askRenameWords(who, n, f)); return; }
    setArmed(false);
    const res = await callOwner(RENAME_PATH, 'POST', renameBody(targetId, n, f));
    if (!res || !res.status) return;   /* the panel has said what went wrong */
    if (res.j && res.j.ok) { setMsg(renamedWords(who, res.j)); setName(''); setOpen(false); return; }
    const words = refusedWords(res.status, res.j);
    if (words) { setMsg(words); return; }
    if (res.status === 404) { await why404(); return; }
    setMsg('The rename did not go through' + (res.j && res.j.error ? ': ' + res.j.error : ' (' + res.status + ')') + '.');
  }, [armed, callOwner, force, mine, name, setMsg, targetId, who, why404]);
  if (!open) {
    return (
      <div data-rename={targetId || ''} style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
        <button type="button" data-rename-open="1" style={small} disabled={busy || !targetId}
          onClick={() => { setOpen(true); setArmed(false); }}>{mine ? 'Rename my character' : 'Rename'}</button>
      </div>
    );
  }
  return (
    <div data-rename={targetId || ''} style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      <input data-rename-name="1" value={name} maxLength={RENAME_MAX + 4}
        onChange={(e) => { setName(e.target.value); setArmed(false); }}
        placeholder={'new name (' + RENAME_MAX + ' letters at most)'} autoCapitalize="off" autoCorrect="off" spellCheck={false}
        style={field} />
      {mine && (
        <button type="button" data-rename-force="1"
          style={{ ...small, borderColor: force ? COL.accent : COL.border, color: force ? COL.accent : COL.text }}
          disabled={busy} onClick={() => { setForce(!force); setArmed(false); }}>{force ? 'Staff word: yes' : 'Staff word'}</button>
      )}
      <button type="button" data-rename-go="1"
        style={{ ...small, borderColor: armed ? COL.danger : COL.border, color: armed ? COL.danger : COL.text }}
        disabled={busy || !name.trim()} onClick={go}>{armed ? 'Sure? Rename' : 'Rename'}</button>
      <button type="button" data-rename-close="1" style={small} disabled={busy}
        onClick={() => { setOpen(false); setArmed(false); setName(''); }}>Cancel</button>
    </div>
  );
}
