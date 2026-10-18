/* ═══ v2.3.3356: /roll AND /flip (docs/specs/dice.md) ═══
 *
 * The fun & social plan's Phase 1 (docs/FUN-SOCIAL-PLAN.md): "/roll" (1-100),
 * "/roll 20" (1-20, up to 1000) and "/flip" in the chat.  The WORKER rolls
 * (server/src/dice.js): a phone's own roll could always say 100.  This phone
 * only asks, holds its own asks to one every DICE_GAP_MS with words, and shows
 * the worker's answer (game/chat.js handleDiceEvent): a line in the chat and
 * the number over the roller's head.
 *
 * No imports, so it can be read in node (server/test/dice.test.mjs). */

/* one roll or flip this often (server/src/dice.js DICE.GAP_MS, mirror-audit) */
export const DICE_GAP_MS = 5000;
export const DICE_SIDES = 100;
export const DICE_MAX_SIDES = 1000;

/* "/roll", "/roll 20", "/dice", "/flip", "/coin" -> the ask, else null.  A
   message that is only the command; "/roll the bones" is a line. */
export function slashDice(text) {
  if (typeof text !== 'string') return null;
  const m = /^\/(roll|dice|flip|coin)(?:\s+(\d{1,4}))?\s*$/i.exec(text.trim());
  if (!m) return null;
  const cmd = m[1].toLowerCase();
  if (cmd === 'flip' || cmd === 'coin') return m[2] ? null : { kind: 'flip' };
  const n = m[2] ? parseInt(m[2], 10) : DICE_SIDES;
  if (!(n >= 2 && n <= DICE_MAX_SIDES)) return null;
  return { kind: 'roll', max: n };
}

/* a dice_roll from the worker, checked: {kind, value, max} or null */
export function diceResult(p) {
  if (!p || typeof p !== 'object') return null;
  const max = p.max, value = p.value;
  if (p.kind === 'flip') return max === 2 && (value === 1 || value === 2) ? { kind: 'flip', value, max: 2 } : null;
  if (p.kind !== 'roll' || !Number.isInteger(max) || max < 2 || max > DICE_MAX_SIDES) return null;
  if (!Number.isInteger(value) || value < 1 || value > max) return null;
  return { kind: 'roll', value, max };
}

/* what the chat says, after the roller's name */
export function diceLineText(r) {
  if (r.kind === 'flip') return '🪙 flipped ' + (r.value === 1 ? 'heads' : 'tails');
  return '🎲 rolled ' + r.value + ' (1-' + r.max + ')';
}
/* what the bubble over the roller's head says */
export function diceBubbleText(r) {
  if (r.kind === 'flip') return '🪙 ' + (r.value === 1 ? 'Heads!' : 'Tails!');
  return '🎲 ' + r.value;
}

/* how long until this phone may ask again (0: now) */
export function diceWaitMs(S, now) {
  const at = S && S._diceAskAt;
  if (!at) return 0;
  const left = DICE_GAP_MS - ((typeof now === 'number' ? now : Date.now()) - at);
  return left > 0 ? left : 0;
}
