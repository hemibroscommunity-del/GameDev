/* ═══ v2.3.6800 (card SHOP, the mend of sitting 71's hold): THE PHONE SEES
 * THE SHIELDS THE WORKER HOLDS FOR IT ═══
 *
 * The gatekeeper, sitting 71: the phone learned of a shield bought from Diego
 * ONLY from `shop_result.shield`.  The worker's `player_state` has carried
 * its copy of the bag (`shieldStash`, gearstash.js) since v2.3.2523, and no
 * page code read it; a re-sent request id is answered with `player_state`
 * only (reqonce.js), and a rejoin adopted nothing.  So a lost `shop_result`
 * (or a phone that lost its copy of the bag) left the player 100 coins down,
 * the shield unseen, and every buy refused "You already have one".
 *
 * The worker is the authority: the phone now ADDS, by id, every recorded
 * shield the worker holds for it that it holds nowhere itself -- from
 * `player_state.shieldStash` (every state, a rejoin's full one and a repeat's
 * resend included), from `shop_result.shield`, and from `held`, the pieces a
 * shield's "have" quote or refusal carries (shop.js), so a phone with no copy
 * that opens Diego's shelf sees the one it owns instead of a row it cannot
 * buy.  Only callers holding `caps.shieldshop` (the PR's own cap) call it.
 *
 * ADD, NEVER TAKE.  Nothing leaves a list here: the phone's own moves (the
 * arm and the bag, equipActions.js) and the worker's named takes (a listing,
 * No man's land) keep their own roads.  Only a piece with an id (`gid`, the
 * provenance ledger's) is adopted: one without cannot be told from its twin.
 * A piece is held when the phone has it on the arm or in the bag by the same
 * id -- or, once each, a piece of the phone's own with NO id and the same
 * signature (an old copy of the very piece, from before the ledger gave it
 * one: wsClient's `_sameSh` reads a piece the same way), so an old copy is
 * never doubled.
 *
 * Pure (no imports), so the server's suites call it (shop.test.mjs). */

export const SHIELD_ADOPT = Object.freeze({
  MAX: 48,      /* the most pieces read from one list (the worker's own stash cap, gearstash.js) */
  GID_MAX: 40,  /* the longest id read (shieldwear.js SHIELD_WEAR.GID_MAX) */
});

const sigOf = (p) => [p.name || '', p.gearBase || '', p.tierMult == null ? '' : p.tierMult, p.tier || ''].join('|');
const gidOf = (p) => (p && typeof p === 'object' && typeof p.gid === 'string' && p.gid && p.gid.length <= SHIELD_ADOPT.GID_MAX ? p.gid : null);

/* Add to `rpg.shieldStash` each piece of `pieces` the phone holds nowhere.
   Returns how many were added (0: nothing changed). */
export function adoptHeldShields(rpg, pieces) {
  if (!rpg || typeof rpg !== 'object' || !Array.isArray(pieces) || !pieces.length) return 0;
  if (!Array.isArray(rpg.shieldStash)) rpg.shieldStash = [];
  const mine = [rpg.shield, ...rpg.shieldStash].filter((p) => p && typeof p === 'object');
  const ids = new Set(mine.map(gidOf).filter(Boolean));
  const oldCopies = mine.filter((p) => !gidOf(p));   /* each matches one piece at most */
  let added = 0;
  for (const p of pieces.slice(0, SHIELD_ADOPT.MAX)) {
    const gid = gidOf(p);
    if (!gid || ids.has(gid)) continue;
    const at = oldCopies.findIndex((q) => sigOf(q) === sigOf(p));
    if (at >= 0) { oldCopies.splice(at, 1); ids.add(gid); continue; }
    rpg.shieldStash.push(p);
    ids.add(gid);
    added++;
  }
  return added;
}

/* The pieces a frame from the worker carries for the bag, by its type: a
   state's `shieldStash` (wsClient's player_state case: v1's full snapshot
   and v2's delta alike, which carries the list whenever it changed and in
   full on a join and a repeat's resend); a buy's `shield`; and a shield's
   "have" quote or refusal's `held` (shop.js shieldHeld).  Any other frame,
   or a field not in its form, carries none. */
export function shieldsInFrame(type, payload) {
  if (!payload || typeof payload !== 'object') return [];
  if (type === 'player_state') return Array.isArray(payload.shieldStash) ? payload.shieldStash : [];
  if (type === 'shop_result' || type === 'shop_quoted') {
    const out = [];
    if (payload.shield && typeof payload.shield === 'object') out.push(payload.shield);   /* a quote's `shield` is `true`: no piece */
    if (Array.isArray(payload.held)) out.push(...payload.held);
    return out;
  }
  return [];
}

/* wsClient's player_state case, in one call: the state's shields, only
   against a worker that says `shieldshop` (S: the game's state).  Never
   throws: the next state carries the list again. */
export function adoptStateShields(S, payload) {
  try {
    if (!S || !S.rpg || !S._serverCaps || !S._serverCaps.shieldshop) return 0;
    return adoptHeldShields(S.rpg, shieldsInFrame('player_state', payload));
  } catch (e) { return 0; }
}
