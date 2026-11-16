/* ═══ v2.3.5611: THE OWNER RENAMES FROM THE TEST PANEL (card OPS PR 12) ═══
 *
 * Card MOD's #1907 (server/src/charname.js; docs/specs/name-rules.md) gives
 * the owner a rename, behind the admin key:
 *   POST /api/admin/rename  {playerId, name, force}
 * The same name rule a new character meets (1 to 20 letters, digits, spaces,
 * - ' _; no emoji, no hidden marks, nothing that reads as the game or its
 * staff), but `force: true` lets a staff word through: the owner's own
 * character.  It answers {ok, playerId, from, name, online}; a refused name
 * 400 `name refused: <why>`; a character not on file 404 `no such character`.
 * The Test panel's rows (RenameRow.jsx) offer it under each chat report and
 * for the owner's own character; this is what they send and say, with no
 * imports so node can test it (tools/guards/rename-owner.test.mjs).
 */

export const RENAME_PATH = '/api/admin/rename';
export const RENAME_MAX = 20;   /* charname.js CHAR_NAME.MAX: the server judges, this only stops a long typo early */

/** The server's refusal, in words (charname.js checkCharName's `why`). */
export const NAME_WHY = Object.freeze({
  short: 'The name is empty.',
  long: 'A name is ' + RENAME_MAX + ' letters at most.',
  chars: 'Letters, digits, spaces, - \' and _ only: no emoji or symbols.',
  staff: 'That name reads as the game or its staff. Only your own character may take it (Staff word).',
});

/** The `why` in a refusal's error ("name refused: staff" -> "staff"), or null. */
export function whyOf(reply) {
  const e = reply && typeof reply.error === 'string' ? reply.error : '';
  const m = /^name refused: ([a-z]+)$/.exec(e);
  return m ? m[1] : null;
}

/** A refusal (status, reply) in words, or null when it is not one the row
 *  can name (the panel then says the status). */
export function refusedWords(status, reply) {
  if (status === 400) {
    const why = whyOf(reply);
    if (why && NAME_WHY[why]) return NAME_WHY[why];
    if (reply && reply.error === 'playerId required') return 'No character id to rename.';
  }
  if (status === 404 && reply && reply.error === 'no such character') {
    return 'No saved character has that id (a guest has none to rename).';
  }
  return null;
}

/** The body the second tap sends: `force` only when asked. */
export function renameBody(playerId, name, force) {
  const body = { playerId: String(playerId || ''), name: String(name || '').trim() };
  if (force === true) body.force = true;
  return body;
}

/** The two taps' first: what the second will do. */
export function askRenameWords(who, name, force) {
  return 'Rename ' + who + ' to "' + String(name || '').trim() + '"?'
    + (force ? ' A staff word is allowed (your own character only).' : '')
    + ' Everyone sees the new name. Tap Rename again to do it.';
}

/** The reply to a rename, in words. */
export function renamedWords(who, reply) {
  const was = reply && typeof reply.from === 'string' && reply.from ? reply.from : who;
  const now = reply && typeof reply.name === 'string' ? reply.name : '';
  return 'Renamed ' + was + ' to ' + now + '.'
    + (reply && reply.online ? ' They see it now.' : ' They see it the next time they play.')
    + ' The boards show it at their next update.';
}
