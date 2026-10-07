/* ═══ v2.3.3141: SALVAGE'S RECEIPTS, ON THE GAME'S SIDE ═══
 *
 * The worker settles every salvage and every essence (server/src/salvage.js)
 * and answers `smith_salvage_result` / `essence_result`.  This module does the
 * two things the browser still owns, then tells the Blacksmith's Salvage tab:
 *
 *   - ARMOUR LISTS ARE THE BROWSER'S OWN (gear-stash.md): a salvaged torso or
 *     greaves leaves `armorStash` / `legsStash` here by its id, and a piece an
 *     essence raised takes its new grade here, or the next join would offer
 *     the old copy back (as `legacy` -- usable, never salvageable again).
 *   - The WEAPON BAG is the worker's list, mirrored by the player_state that
 *     follows each receipt, so nothing here touches it.
 *
 * A refusal changes nothing; its `reason` becomes the line the tab shows. */
import { BT_AUDIO } from '@/data/index.js';
import { pushDmgPopup } from '@/game/combatHelpers.js';
import { essenceName, GRADE_LABEL } from '@/data/salvage.js';

let _last = null;
const _listeners = new Set();
const emit = () => { for (const fn of _listeners) { try { fn(); } catch (e) { /* one dead listener must not starve the rest */ } } };

/** The last receipt: {kind: 'salvage'|'essence', ok, reason?, ..., at}. */
export const salvageBus = {
  get() { return _last; },
  subscribe(fn) { _listeners.add(fn); return () => _listeners.delete(fn); },
};

/* A refusal's reason, in words a player can act on. */
const REASON = Object.freeze({
  worn: 'Take it off first',
  in_mail: 'It is still in your mail',
  legacy: 'Too old to salvage: made before the forge kept records',
  not_held: 'That piece is not in your bag',
  wrong_slot: 'That piece is not in your bag',
  gone: 'That piece is not in your bag',
  changed: 'Your bag changed. Try again',
  not_metal: 'Only copper, iron and black steel salvage',
  no_essence: 'You have no essence left',
  wrong_metal: 'That essence is for another metal',
  not_lower: 'Already that grade or better',
});
export function salvageReasonText(reason, kind) {
  return REASON[reason] || (kind === 'essence' ? 'Could not use the essence' : 'Could not salvage');
}

const ARMOUR_FIELDS = ['armorStash', 'legsStash'];

function say(S, text, color) {
  try { const P = S && S.player; if (P) pushDmgPopup(S, P.x, P.y - 34, text, color || '#D8AA58'); } catch (e) { /* popup only */ }
}
function play(key, opts) { try { BT_AUDIO.play(key, opts); } catch (e) { /* a sound never breaks a receipt */ } }

function probe(entry) {
  try { if (typeof window !== 'undefined' && window.__btProbe) (window.__btSalvageLog || (window.__btSalvageLog = [])).push(entry); } catch (e) { /* probe only */ }
}

/** smith_salvage_result */
export function applySalvageResult(S, payload, save) {
  if (!payload || typeof payload !== 'object') return;
  const R = S && S.rpg;
  if (payload.ok && R && ARMOUR_FIELDS.indexOf(payload.field) >= 0 && typeof payload.gid === 'string' && Array.isArray(R[payload.field])) {
    const at = R[payload.field].findIndex((p) => p && p.gid === payload.gid);
    if (at >= 0) R[payload.field].splice(at, 1);
    try { if (typeof save === 'function') save(S); } catch (e) { /* the echo carries the worker's own lists */ }
  }
  if (payload.ok) {
    say(S, '+' + (payload.bars || 0) + ' bars' + (payload.essence ? ' · ' + (essenceName(payload.essence) || 'essence') : ''), payload.essence ? '#9FD3F0' : '#D8AA58');
    try { BT_AUDIO.collect(); } catch (e) { /* sound only */ }
    if (payload.essence) setTimeout(() => play('flip-win', { vol: 0.45 }), 160);
  }
  _last = { kind: 'salvage', ...payload, at: Date.now() };
  probe({ at: _last.at, kind: 'salvage', ok: !!payload.ok, reason: payload.reason || null, field: payload.field, gid: payload.gid || null, idx: payload.idx, bar: payload.bar, bars: payload.bars, essence: payload.essence || null, grade: payload.grade || null });
  emit();
}

/** essence_result */
export function applyEssenceResult(S, payload, save) {
  if (!payload || typeof payload !== 'object') return;
  const R = S && S.rpg;
  if (payload.ok && R && ARMOUR_FIELDS.indexOf(payload.field) >= 0 && typeof payload.gid === 'string' && Array.isArray(R[payload.field])) {
    for (const p of R[payload.field]) if (p && p.gid === payload.gid) p.quality = payload.grade;
    try { if (typeof save === 'function') save(S); } catch (e) { /* the ledger is the record either way */ }
  }
  if (payload.ok) {
    say(S, (GRADE_LABEL[payload.grade] || 'Better') + '!', payload.grade === 'elite' ? '#E8893A' : payload.grade === 'godly' ? '#F0C45F' : '#5B99DE');
    play('level-up', { vol: 0.5 });
  }
  _last = { kind: 'essence', ...payload, at: Date.now() };
  probe({ at: _last.at, kind: 'essence', ok: !!payload.ok, reason: payload.reason || null, field: payload.field, gid: payload.gid || null, idx: payload.idx, grade: payload.grade || null, essence: payload.essence || null });
  emit();
}
