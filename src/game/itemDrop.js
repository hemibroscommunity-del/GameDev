/* ═══ v2.3.3473: DROP AN ITEM (docs/specs/item-drop.md) ═══
 *
 * The owner: "add an option to "drop" items in game. After about a minute
 * they become visible to other players. After 2 minutes it begins flashing
 * and disappears".
 *
 * The worker does all of it (server/src/itemdrop.js): it takes the item out
 * of the bag, lays the pile at your feet, sends it to you alone for a minute
 * and then to everyone, and lets it go ten seconds after it starts flashing.
 * This is the phone's half:
 *
 *   - the ask (`item_drop {key, qty}`, from the bag's item card), sent only
 *     to a worker that says it drops (`caps.itemdrop`);
 *   - its answer in words over your head (`item_drop_result`, PRIVILEGED);
 *   - YOUR OWN DROP IS NOT WALKED STRAIGHT BACK UP: it lands at your feet,
 *     inside the 20 px a pile is picked up from, so it waits until your boots
 *     have once been DROP_LEAVE_PX from it (groundLoot.js, and the pet's
 *     vacuum in BroTown.jsx) -- then it is yours to take back like any pile;
 *   - the flashing: the worker says when (`flashLeft`), the renderer asks
 *     dropAlpha() each frame.
 *
 * The pile's clocks come as time LEFT (index.js _dropWire), put on this
 * phone's clock as the pile arrives (wsClient.js _buildServerPile), so a
 * phone whose clock is off still flashes it and lets it go when the worker
 * does.
 */
import { pushDmgPopup } from '@/game/combatHelpers.js';
import { cue } from '@/game/eventSounds.js';
import { NO_DROP_ZONES, DROP_GONE_MS, DROP_FLASH_MS } from '@/data/itemDrop.js';   /* the worker's rules (mirror-audit) */

export { NO_DROP_ZONES };

/* How far your boots must once be from your own drop before walking onto it
   picks it back up.  The pickup trigger is 20 px (groundLoot.js) and the
   magnet 50 from the pile's spot, so a step past the magnet is a choice. */
export const DROP_LEAVE_PX = 60;

/* The flashing: on/off this many times a second at its start, quickening to
   FLASH_HZ_END by its end (the worker's GONE_MS - FLASH_MS, ten seconds). */
export const FLASH_HZ_START = 2.5;
export const FLASH_HZ_END = 7;
export const FLASH_FOR_MS = DROP_GONE_MS - DROP_FLASH_MS;
/* the "off" half is faint, never gone: the thing warned about stays seen */
export const FLASH_LOW = 0.18;

/* Does this worker drop? (caps.itemdrop, read directly: caps-audit) */
export function dropSupported(S) {
  return !!(S && S._serverCaps && S._serverCaps.itemdrop === true);
}

/* Why Drop is greyed here, or '' when it is not */
export function dropBlockedWhy(S) {
  const z = S && S.currentZone;
  if (z && NO_DROP_ZONES.indexOf(z) >= 0) {
    return z === 'farm_home' ? 'Nothing can be dropped on your farm' : 'Nothing can be dropped here';
  }
  return '';
}

/* Send the ask.  True when it went (the answer comes as item_drop_result). */
export function sendItemDrop(S, key, qty) {
  if (!S || !S.channel || typeof key !== 'string' || !key) return false;
  if (!dropSupported(S)) return false;
  const n = Math.max(1, Math.floor(Number(qty) || 1));
  try { S.channel.send({ type: 'item_drop', key, qty: n }); } catch (e) { return false; }
  return true;
}

/* The worker's refusals, in words (server/src/itemdrop.js's list) */
const REFUSED = Object.freeze({
  off: 'Dropping is switched off right now',
  dead: 'You can\'t drop things right now',
  'not-here': 'Nothing can be dropped here',
  fight: 'Not in a fight with a player',
  bad: 'You don\'t have that',
  none: 'You don\'t have that',
  slow: '',   /* a second tap of the same press: nothing to say */
  'too-many': 'Too many of your things on the ground -- pick some up first',
});
export function dropRefusalText(reason) {
  if (Object.prototype.hasOwnProperty.call(REFUSED, reason)) return REFUSED[reason];
  return 'You can\'t drop that right now';
}

/* item_drop_result -- the bag itself moves on the player_state that comes
   first; this is the word over your head and the sound */
export function applyItemDropResult(S, p) {
  if (!S || !p) return;
  const at = S.player;
  if (p.ok) {
    try { cue('lootDrop'); } catch (e) { /* sound only */ }
    S._dropLast = { key: p.key, qty: p.qty, lootId: p.lootId, at: Date.now() };
    return;
  }
  const words = dropRefusalText(p.reason);
  S._dropLast = { refused: p.reason || 'unknown', at: Date.now() };
  if (!words || !at) return;
  pushDmgPopup(S, at.x, at.y - 44, words, '#e9d27a', { ts: Date.now() + 1 });
  try { cue('denied'); } catch (e) { /* sound only */ }
}

/* Is this pile your own drop, still waiting for you to step off it?  `dist`
   is your boots' distance from the pile's own spot.  Once you have been
   DROP_LEAVE_PX away it is never held again -- walking back onto it takes it
   back, as with any pile of yours. */
export function dropWaitsForYou(S, loot, dist) {
  if (!loot || !loot.dropped || loot._leftIt) return false;
  if (!S || loot.dropBy !== S.myId) return false;
  if (dist > DROP_LEAVE_PX) { loot._leftIt = true; return false; }
  return true;
}

/* Is it flashing now (the worker's flashAt, on this phone's clock)? */
export function dropFlashing(l, now) {
  return !!(l && l.dropped && l.flashAt && now >= l.flashAt);
}

/* The pile's alpha this frame: 1 until it flashes, then on and off, faster
   as its end comes. */
export function dropAlpha(l, now) {
  if (!dropFlashing(l, now)) return 1;
  /* the phase is the integral of a rate rising linearly, so the blink
     quickens smoothly instead of jumping */
  const s = Math.max(0, now - l.flashAt) / 1000;
  const span = FLASH_FOR_MS / 1000;
  const phase = FLASH_HZ_START * s + (FLASH_HZ_END - FLASH_HZ_START) * s * Math.min(s, span) / (2 * span);
  return (phase % 1) < 0.5 ? 1 : FLASH_LOW;
}
