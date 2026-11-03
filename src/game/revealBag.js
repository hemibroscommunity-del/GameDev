/* ═══ v2.3.4012: A MYSTERY PIECE WAITS IN YOUR BAG (docs/specs/reveal-in-bag.md) ═══
 *
 * The owner: "Mystery item launched automatically. Should go to inventory then
 * have reveal option."
 *
 * The worker keeps a rare-or-better pickup's grade to itself
 * (server/src/revealbag.js): the piece lands in the bag with `unrevealed:
 * true` and no `quality`, drawn as a silhouette under a "?" with the rare-blue
 * edge (the pile only ever promised "rare or better").  This is the phone's
 * half:
 *
 *   - the ask, `reveal_item {field, gid}` (armour, by the id the worker gave
 *     it) or `{field: 'weaponStash', idx, name}` (the blade, by its place in
 *     the weapon bag the worker mirrors to us), sent only to a worker that
 *     says it reveals (`caps.revealbag`);
 *   - its answer, `item_reveal` (PRIVILEGED): the opened piece goes into the
 *     bag here (armour: the bag IS the phone's; a blade comes back on the
 *     player_state echo) and its ladder onto the same revealBus the pickup
 *     used to feed, so the ceremony is the one players know;
 *   - EQUIP REVEALS FIRST: Equip on a "?" asks for the reveal and puts the
 *     piece on when the overlay has landed (`then`, run once, with a time
 *     limit so a ceremony that never plays can never hold the equip back).
 *     The worker opens anything put on regardless (its own guarantee).
 *
 * Nothing here decides a grade: the answer is the worker's, and the overlay
 * only plays the ladder it was sent.
 */
import { revealBus } from '@/ui/reveal/revealBus.js';
import { pushDmgPopup } from '@/game/combatHelpers.js';

/* The rare blue (QUALITY_COLOR.rare, dash/common.js -- not imported: this
   file stays free of the UI tree): a "?" promises "rare or better" and no
   more, the pile's own word (v2.3.3746). */
export const REVEAL_BLUE = '#5B99DE';

/* The overlay plays a stage in 2 s and holds 1.7 s; a godly is two stages.
   Past this the equip goes ahead without waiting for it. */
export const REVEAL_THEN_MS = 9000;

export function isUnrevealed(p) {
  return !!(p && typeof p === 'object' && p.unrevealed);
}

/* Does this worker reveal? (caps.revealbag, read directly: caps-audit) */
export function revealSupported(S) {
  return !!(S && S._serverCaps && S._serverCaps.revealbag === true);
}

/* The piece an item card is about, for the three kinds a "?" can be. */
export function pieceOfTarget(target) {
  if (!target) return null;
  if (target.kind === 'stashArmor' || target.kind === 'stashLegs') return target.armor || null;
  if (target.kind === 'stashWeapon') return target.wpn || null;
  return null;
}

/* The worker's name for it: the list and the id (armour) or the place and
   the name (a blade). */
export function revealRefFor(target) {
  const p = pieceOfTarget(target);
  if (!p) return null;
  if (target.kind === 'stashWeapon') {
    const idx = Number(target.index);
    if (!Number.isInteger(idx) || idx < 0) return null;
    return { field: 'weaponStash', idx, name: typeof p.name === 'string' ? p.name : undefined };
  }
  if (typeof p.gid !== 'string' || !p.gid) return null;
  return { field: target.kind === 'stashLegs' ? 'legsStash' : 'armorStash', gid: p.gid };
}

function keyOf(ref) {
  if (!ref) return '';
  return ref.field + ':' + (ref.gid != null ? ref.gid : ref.idx);
}

/* What waits for a reveal's ceremony to land: key -> run-once function. */
const _then = new Map();

/* The pieces whose ceremony is playing: key -> true.  The bag keeps drawing
   them as a "?" until their grade lands in the overlay -- a blade's opened
   copy arrives on the player_state echo straight after the answer, and its
   tile must not show the grade under the spin. */
const _held = new Map();

/* What waits for every playing reveal to land: the achievements the grade
   earned (the worker sends them right behind its answer) -- "Elite piece!"
   must not pop while the "?" still spins. */
const _after = [];
export function afterReveal(fn) {
  if (typeof fn !== 'function') return;
  if (!_held.size) { fn(); return; }
  _after.push(fn);
}
function _releaseAfter() {
  if (_held.size) return;
  const list = _after.splice(0, _after.length);
  for (const fn of list) { try { fn(); } catch (e) { /* display only */ } }
}

/* Is this bag tile a "?" now: still unrevealed, or its reveal still playing? */
export function shownUnrevealed(kind, index, obj) {
  if (isUnrevealed(obj)) return true;
  if (!_held.size) return false;
  if (kind === 'stashWeapon') return _held.has('weaponStash:' + index);
  if ((kind === 'stashArmor' || kind === 'stashLegs') && obj && obj.gid) {
    return _held.has((kind === 'stashLegs' ? 'legsStash' : 'armorStash') + ':' + obj.gid);
  }
  return false;
}

function once(fn) {
  let done = false;
  return () => { if (done) return; done = true; try { fn(); } catch (e) { /* an equip that failed says so itself */ } };
}

/* After the reveal the card's target must name the OPENED piece: a blade's
   opened copy replaced the "?" in the weapon bag on the echo, and the equip
   finds its blade by place and signature, grade included (ItemDetailPopup
   sameWeapon).  Armour is opened in place (openInBag), so it is the same
   object already. */
function refreshTarget(S, target) {
  if (!target || target.kind !== 'stashWeapon' || !target.wpn) return;
  const list = S && S.rpg && Array.isArray(S.rpg.weaponStash) ? S.rpg.weaponStash : [];
  const w = list[Number(target.index)];
  const was = target.wpn;
  if (w && !w.unrevealed && w.name === was.name && w.type === was.type && w.gearBase === was.gearBase) target.wpn = w;
}

/* Send the ask.  True when it went; `then` runs once the ceremony has landed
   (or straight away when there is none). */
export function sendReveal(S, target, then) {
  if (!S || !S.channel || !revealSupported(S)) return false;
  const ref = revealRefFor(target);
  if (!ref) return false;
  if (typeof then === 'function') _then.set(keyOf(ref), once(() => { refreshTarget(S, target); then(); }));
  try { S.channel.send({ type: 'reveal_item', payload: ref }); } catch (e) { _then.delete(keyOf(ref)); return false; }
  return true;
}

/* The worker's refusals, in words (server/src/revealbag.js's list).  Never
   about a grade: the worker's reasons do not depend on one. */
const REFUSED = Object.freeze({
  busy: '',   /* a burst of taps: the first one is already on its way */
  bad: '',
  not_held: 'That piece is not in your bag any more',
  changed: 'Your bag changed -- open the piece again',
});
export function revealRefusalText(reason) {
  if (Object.prototype.hasOwnProperty.call(REFUSED, reason)) return REFUSED[reason];
  return 'That piece cannot be revealed right now';
}

/* Put the opened piece's grade on the bag's own copy (armour: the phone's
   bag is the store; the worn slots too, for a piece the join opened). */
function openInBag(R, p) {
  if (!R || !p || !p.gid || !p.piece) return false;
  const lists = p.field === 'legsStash' ? [R.legsStash] : p.field === 'armorStash' ? [R.armorStash] : [R.armorStash, R.legsStash];
  const q = typeof p.piece.quality === 'string' ? p.piece.quality : undefined;
  let hit = false;
  const fix = (a) => {
    if (!a || typeof a !== 'object' || a.gid !== p.gid) return;
    if (q) a.quality = q; else delete a.quality;
    delete a.unrevealed;
    hit = true;
  };
  for (const list of lists) if (Array.isArray(list)) list.forEach(fix);
  fix(R.armor);
  fix(R.legsArmor);
  return hit;
}

/* item_reveal -- the piece opened (or already open), its ceremony, and
   whatever waited for it; or the refusal in words over your head. */
export function applyItemReveal(S, p, save) {
  if (!S || !p) return;
  S._revealLast = { ok: !!p.ok, reason: p.reason || null, field: p.field || null, gid: p.gid || null, idx: p.idx != null ? p.idx : null,
    quality: p.piece && p.piece.quality || null, already: !!p.already, at: Date.now() };
  const key = keyOf(p);
  const then = _then.get(key) || null;
  _then.delete(key);
  if (!p.ok) {
    const words = revealRefusalText(p.reason);
    const at = S.player;
    if (words && at) pushDmgPopup(S, at.x, at.y - 44, words, '#e9d27a', { ts: Date.now() + 1 });
    return;
  }
  if (openInBag(S.rpg, p) && typeof save === 'function') { try { save(); } catch (e) { /* the next join re-reads it */ } }
  const list = Array.isArray(p.reveals) ? p.reveals.filter((r) => r && Array.isArray(r.ladder) && r.ladder.length) : [];
  if (!list.length) { if (then) then(); return; }
  /* on the LAST entry: the tile shows the grade, and the piece goes on, once
   * its own grade has landed in the overlay -- with a time limit, so a
   * ceremony that never plays holds nothing back */
  _held.set(key, true);
  const landed = once(() => { _held.delete(key); if (then) then(); _releaseAfter(); });
  list[list.length - 1] = { ...list[list.length - 1], onDone: landed };
  setTimeout(landed, REVEAL_THEN_MS);
  try { revealBus.push(list); } catch (e) { landed(); }
}

/* ═══ THE CARD ═══
   An item card's content for a "?" (ItemDetailPopup's resolveTarget result,
   overridden): the item's own name and kind, "Rare or better" in the rare
   blue (the pile's promise, and all the phone knows), no number that would
   read the piece as a Normal (its damage or its "% damage reduced"), and two
   actions: Reveal, and Equip (which reveals first).  Sell, Drop and the rest
   wait for the reveal: a "?" is not sold, traded or salvaged in this version
   (docs/specs/reveal-in-bag.md).  Anything else comes back unchanged. */
export function revealCardFor(target, resolved, S) {
  if (!resolved) return resolved;
  const piece = pieceOfTarget(target);
  if (!isUnrevealed(piece)) return resolved;
  return {
    ...resolved,
    info: 'Rare or better',
    infoColor: REVEAL_BLUE,
    delta: null,
    unrevealed: true,
    actions: { reveal: revealSupported(S), equip: true },
    sellWhy: '',
    dropWhy: '',
  };
}
