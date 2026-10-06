/* ═══ v2.3.3117: FOOD THAT COUNTS IN A FIGHT ═══
 * Owner: "Farming needs a purpose. I think the best purpose it can serve are
 * temporary buffs (boss fights, PvP, dueling, etc) and source of income."
 * (docs/specs/fight-food.md)
 *
 * The page's half of two rules the WORKER decides:
 *
 *   1. THE BREW IN A FIGHT WITH A PLAYER.  A duel hit is claimed by the page
 *      and clamped by the worker.  Only some claims carried the damage brew
 *      (the swing and the plain shot; never the bow volley or the staff
 *      special), and a big brewed claim could be clipped by a ceiling never
 *      sized for a Fury Tonic.  Against a worker with caps.pvpbrew the page
 *      claims every hit WITHOUT its brew and marks it `nb: 1`, and the worker
 *      multiplies the clamped claim by the brew it holds (combat.js _brewMul).
 *      Against an older worker the page folds the brew in, as it always did.
 *      So every projectile carries the brew it was fired with (`brew`), and
 *      pvpClaim takes it back out only when the worker will put it back.
 *
 *   2. ONE BITE AT A TIME.  A heal eaten at once (Garden Stew, cooked fish,
 *      the minnow bottle) is once per GAP_MS while in a duel or within
 *      WINDOW_MS of a hit between you and another player (cooking.js
 *      _pvpHealWait).  The page holds its own bite back -- and says how long
 *      -- only against a worker with caps.pvpheal, so it never refuses what an
 *      older worker would allow; the worker refuses anything early with the
 *      usual resend either way, and says why (`eat_refused {wait}`), which
 *      sets this page's clock to the worker's (noteEatRefused).
 *      The page's own guess reads only the hits it has seen, NOT S._inDuel
 *      (review): that flag can outlive its duel (a dropped accept, a declined
 *      one, a restart, a long disconnect), and held every bite back against
 *      monsters until a reload.  A duel's lull is the worker's to call.
 *
 * No imports, so the worker's suites can run it (fightfood.test.mjs) and
 * mirror-audit can hold PVP_HEAL to the server's. */

/* Mirror of server/src/data.js PVP_HEAL (mirror-audit). */
export const PVP_HEAL = Object.freeze({ WINDOW_MS: 10000, GAP_MS: 15000 });

/* The damage brew's multiplier as the page sees it -- combat.js _brewMul's
   rule on the worker's echo (wsClient: S._dmgBuff is the brew's end, and
   S._dmgBuffMul its own number).  1.20 without a number, bounded 1..4. */
export function brewMulNow(S, now) {
  if (!S || !S._dmgBuff) return 1;
  var t = typeof now === 'number' ? now : Date.now();
  if (!(t < S._dmgBuff)) return 1;
  var m = Number(S._dmgBuffMul);
  return (m >= 1 && m <= 4) ? m : 1.20;
}

/* Does the worker put the brew on a PvP claim itself? */
export function pvpBrewOnWorker(S) {
  return !!(S && S._serverCaps && S._serverCaps.pvpbrew);
}

/* A PvP claim from damage the page computed WITH a brew of `brewK` folded in.
   Against a pvpbrew worker the brew comes back out and `nb` says so; against
   an older one the claim is what it always was.  Returns { dmgBase, nb }
   (nb undefined when not sent). */
export function pvpClaim(S, dmgWithBrew, brewK) {
  var d = Number(dmgWithBrew) || 0;
  if (!pvpBrewOnWorker(S)) return { dmgBase: d, nb: undefined };
  var k = Number(brewK);
  if (!(k >= 1 && k <= 4)) k = 1;
  return { dmgBase: d / k, nb: 1 };
}

/* A pvp_hit names an attacker and a target; either way, it is a fight with a
   player for this page -- the same event the worker stamps `_pvpAt` beside
   (combat.js _resolvePvPAttack), so the two clocks agree. */
export function notePvpHit(S, payload, now) {
  if (!S || !payload || !S.myId) return false;
  if (payload.attacker !== S.myId && payload.target !== S.myId) return false;
  S._pvpAt = typeof now === 'number' ? now : Date.now();
  return true;
}

/* A heal eaten at once: the dishes with slot 'now', a cooked fish, the old
   minnow bottle.  `dish` is dishes.js's entry for the key, if any. */
export function isInstantHeal(key, dish) {
  if (typeof key !== 'string') return false;
  if (dish) return dish.slot === 'now';
  return key.indexOf('cooked_fish_') === 0 || key === 'cookedMinnow';
}

export function noteInstantHeal(S, now) {
  if (S) S._instantHealAt = typeof now === 'number' ? now : Date.now();
}

/* How long this page must still wait before a heal eaten at once (0 when it
   may) -- cooking.js _pvpHealWait on the page's own copies: the last pvp_hit
   it saw (S._pvpAt) and the last bite (S._instantHealAt).  A guess that errs
   toward letting the bite go: the worker decides, and says why it did not. */
export function pvpHealWaitMs(S, now) {
  if (!S || !(S._serverCaps && S._serverCaps.pvpheal)) return 0;
  var t = typeof now === 'number' ? now : Date.now();
  var inFight = typeof S._pvpAt === 'number' && t - S._pvpAt < PVP_HEAL.WINDOW_MS;
  if (!inFight) return 0;
  var last = typeof S._instantHealAt === 'number' ? S._instantHealAt : 0;
  return Math.max(0, PVP_HEAL.GAP_MS - (t - last));
}

/* The worker held a bite back (eat_refused {wait}): its clock is the truth.
   The last bite becomes the one the worker counted, and the page counts
   itself in a fight for as long as the wait, so the next tap is held here,
   with words, instead of going out to be refused again. */
export function noteEatRefused(S, wait, now) {
  if (!S) return 0;
  var t = typeof now === 'number' ? now : Date.now();
  var w = Math.max(0, Math.min(PVP_HEAL.GAP_MS, Math.floor(Number(wait) || 0)));
  S._instantHealAt = t - (PVP_HEAL.GAP_MS - w);
  S._pvpAt = t;
  return w;
}

/* What the page says when it holds a bite back. */
export function pvpHealWaitText(ms) {
  return 'Eat again in ' + Math.max(1, Math.ceil(ms / 1000)) + 's';
}
