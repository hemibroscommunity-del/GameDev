/* ═══ v2.3.3258: QUICK EAT -- ONE TAP, THE RIGHT FOOD ═══
 * (docs/specs/pvp-fights.md "Fish", ui/panels/QuickEatButton.jsx)
 *
 * Owner: "The idea is that fishing becomes a valuable skill because they can
 * use it during "no man's land" combat (where all the higher level resources
 * are) creating a need for higher and higher levels", then "I want you to
 * plan and implement fixes for all of these including how much HP each fish
 * should heal."
 *
 * The study found that a fish could not matter in a fight because of how it
 * was eaten: open the dashboard, the bag, find the fish, tap it, tap Eat --
 * four to six seconds of taps with your thumbs off the sticks, longer than
 * most fights between players lasted.  So a button beside the movement stick
 * eats in one tap, and this file decides WHAT it eats:
 *
 *   - the heals eaten at once you carry (fightFood.js isInstantHeal: a cooked
 *     fish, the Garden Stew, the old minnow bottle) -- never a meal or a
 *     brew, which are half-hour effects with a slot of their own;
 *   - of those, the SMALLEST that fills what you are missing, else the
 *     BIGGEST -- so a scratch never costs your pike and a deep wound gets
 *     the most you carry; a tie goes to the one you carry more of;
 *   - each heal as this page predicts it (calcDisplayHeal, the worker's own
 *     arithmetic: Recovery included) and a quarter of it in a fight with a player
 *     (fightFood.js pvpHealSized, as the worker sizes it).
 *
 * The tap goes through eatBus, the bag's own Eat (BroTown's handler: the
 * one-bite rule's wait, the prediction, `eat_request`), so the worker decides
 * everything as before; nothing new is sent.
 *
 * Shown only while you carry such a heal AND are missing HP: a full bar has
 * nothing to eat for, and a button that comes and goes with the fight keeps
 * the screen quiet the rest of the time (the owner: "I just don't want the
 * screen to be too busy").
 *
 * Imports only the light rules files, so the worker's suites can run it; the
 * heal function is handed in (the button passes calcDisplayHeal). */
import { isInstantHeal, pvpHealSized, pvpHealWaitMs, PVP_HEAL } from './fightFood.js';
import { dishFor } from '../data/dishes.js';

/* The heals you could eat now: [{ key, count, heal }], heal as it would land
   (half in a fight with a player). */
export function quickEatChoices(S, healOf, now) {
  var R = S && S.rpg;
  var inv = R && R.inventory;
  if (!inv || typeof healOf !== 'function') return [];
  var out = [];
  for (var key in inv) {
    if (!Object.prototype.hasOwnProperty.call(inv, key)) continue;
    var n = Math.floor(Number(inv[key]) || 0);
    if (n <= 0) continue;
    var dish = dishFor(key);
    if (!isInstantHeal(key, dish)) continue;
    var h = Number(healOf(R, key)) || 0;
    if (!(h > 0)) continue;
    out.push({ key: key, count: n, heal: pvpHealSized(S, h, now) });
  }
  return out;
}

/* Which to eat: the smallest heal that fills `missing`, else the biggest; a
   tie goes to the one carried more of, then by name (so the pick is steady). */
export function quickEatPick(choices, missing) {
  if (!choices || !choices.length) return null;
  var m = Math.max(0, Number(missing) || 0);
  var fills = choices.filter(function (c) { return c.heal >= m; });
  var pool = fills.length ? fills : choices;
  var sorted = pool.slice().sort(function (a, b) {
    if (a.heal !== b.heal) return fills.length ? a.heal - b.heal : b.heal - a.heal;
    if (a.count !== b.count) return b.count - a.count;
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  });
  return sorted[0];
}

/* What the button draws, or null when it is not drawn:
   { key, count, heal, kinds, wait, waitFrac, renderKey }. */
export function quickEatView(S, healOf, now) {
  var R = S && S.rpg;
  if (!R) return null;
  var hp = Number(R.hp), max = Number(R.maxHp) > 0 ? Number(R.maxHp) : 100;
  if (!(hp > 0)) return null;            /* dead: nothing to eat for */
  if (hp >= max) return null;            /* full: nothing to eat for */
  var t = typeof now === 'number' ? now : Date.now();
  var choices = quickEatChoices(S, healOf, t);
  var pick = quickEatPick(choices, max - hp);
  if (!pick) return null;
  var wait = pvpHealWaitMs(S, t);
  var waitFrac = wait > 0 ? Math.min(1, wait / PVP_HEAL.GAP_MS) : 0;
  return {
    key: pick.key,
    count: pick.count,
    heal: pick.heal,
    kinds: choices.length,
    wait: wait,
    waitFrac: waitFrac,
    /* re-render on what is drawn: the food, how many, and the wait's ring in
       twentieths */
    renderKey: pick.key + '|' + pick.count + '|' + (wait > 0 ? Math.ceil(waitFrac * 20) : 0),
  };
}
