/* ═══ v2.3.3136: FARMING BY HAND, ON THE FARM YOU WALK ═══
 *
 * The owner, 2026-10-06: "I want your character to be able to walk around on
 * the farm.  I want the planting process to happen by your character taking
 * action on the plot of ground.  You dig, you water, you fertilize, etc. you
 * can use the firemaking animation for all of that.  I don't want the game to
 * just be reading a bunch of boring menus.  Make the timer appear above the
 * crop that was planted and any next steps it needs (next in sequence like
 * 'Needs Watering') etc".  And then: "Cooking animation might be better.  You
 * can use something to occlude the part where the pan or log is."
 *
 * The rules of a bed are the WORKER's (server/src/farm.js _handleFarmAct): a
 * bed is dug from grass, planted when dug, watered and fertilized while it
 * grows, harvested when ripe by the worker's clock.  This module is only what
 * the game needs to SHOW them and to ask: a bed's next step and its words,
 * its timer, how long the kneeling takes, the cook's frame at each moment and
 * when the hands push out, and which bed your boots are in reach of.  Plain
 * arithmetic over plain data (src/data/farmCovers.js): node runs it, and
 * server/test/farmwalk.test.mjs runs it against the worker's own handler, so
 * a step this says is next is always one the worker takes.
 * docs/specs/farm-walk.md.
 */

import { FARM_KNEEL_ORDER } from '../data/farmCovers.js';

/** The five steps, in the order a bed goes through them. */
export const FARM_STEPS = ['dig', 'plant', 'water', 'feed', 'harvest'];

/* How long each step keeps you kneeling, ms.  The fire-lighter's strike is
   0.7 s (BroTown's S._firemaking); a step is a little longer -- the hands go
   into the earth a few times -- and digging longest.  Short enough that six
   beds' worth of steps is a minute's work, not a chore. */
export const FARM_WORK_MS = Object.freeze({ dig: 1500, plant: 1100, water: 1150, feed: 1100, harvest: 1250 });
/* The farmer crouches as the cook does (effectsRenderer _updateFarmKneel), on
   the cook strip's frames where the pan is held out to the side, to and fro
   (FARM_KNEEL_ORDER, from tools/world/make_farm_covers.py), one every
   FARM_KNEEL_FRAME_MS: the arms work as the cook's do over the fire. */
export const FARM_KNEEL_FRAME_MS = 110;
/* The hands push out (the to-and-fro's far end) every half turn of it. */
const HALF_TURN_MS = (FARM_KNEEL_ORDER.length / 2) * FARM_KNEEL_FRAME_MS;
/* A push this near the end is not shown: you are getting up. */
const LAST_PUSH_MS = 80;

/** The cook strip's frame the farmer shows at `t` ms into a step of `total`
 *  ms: FARM_KNEEL_ORDER round and round, its first frame for a time that is
 *  no time at all. */
export function farmWorkFrame(t, total) {
  if (!(t >= 0) || !(total > 0)) return FARM_KNEEL_ORDER[0];
  const k = Math.floor(Math.min(t, total) / FARM_KNEEL_FRAME_MS);
  return FARM_KNEEL_ORDER[k % FARM_KNEEL_ORDER.length];
}

/** When the hands push out -- the far end of the to-and-fro, every half
 *  turn -- ms from the start of a step of `total` ms.  The dirt, the seeds,
 *  the water and the compost fly then, and the step's sound plays. */
export function farmWorkBeats(total) {
  const out = [];
  if (!(total > 0)) return out;
  for (let t = HALF_TURN_MS; t < total - LAST_PUSH_MS; t += 2 * HALF_TURN_MS) out.push(t);
  return out;
}

/** A bed's next step, by the worker's own rules, and the words over it.
 *  `p` is a plot from farm_state ({s, crop?, plantedAt?, readyAt?, water?,
 *  feed?}), `now` the worker's clock (farmBus.serverNow()).
 *  Returns {step, words, left, ripe}: `step` the one a tap would take (null
 *  when there is nothing to do but wait), `words` the line under the timer
 *  (null when there is none), `left` ms until ripe (null when not growing). */
export function bedNext(p, now) {
  const s = p && p.s;
  if (!p || s === 'rough' || (s !== 'tilled' && s !== 'planted')) {
    return { step: 'dig', words: 'Needs Digging', left: null, ripe: false };
  }
  if (s === 'tilled') return { step: 'plant', words: 'Needs Planting', left: null, ripe: false };
  const ready = Number(p.readyAt) || 0;
  if (now >= ready) return { step: 'harvest', words: 'Ready to Harvest!', left: null, ripe: true };
  const left = ready - now;
  /* The owner's order: dig, plant, water, fertilize.  Water first -- it
     re-times the whole crop 25% sooner, so the sooner the better -- then the
     compost, which pays at the harvest whenever it went on. */
  if (!p.water) return { step: 'water', words: 'Needs Watering', left, ripe: false };
  if (!p.feed) return { step: 'feed', words: 'Needs Fertilizer', left, ripe: false };
  return { step: null, words: null, left, ripe: false };
}

/** What a planted bed's crop looks like now: the owner's four pictures,
 *  sprout, young and nearly grown a third of its time each, then ripe by the
 *  worker's clock. */
export function cropStageOf(p, now) {
  const at = Number(p && p.plantedAt) || 0, ready = Number(p && p.readyAt) || 0;
  if (now >= ready) return 'ripe';
  const prog = ready > at ? (now - at) / (ready - at) : 0;
  return prog < 1 / 3 ? 'sprout' : prog < 2 / 3 ? 'young' : 'grown';
}

/** The soil a bed shows: the plot's stakes on grass until it is dug, then
 *  dug earth -- darker watered, worked with compost fertilized, or both. */
export function soilOf(p) {
  if (!p || (p.s !== 'tilled' && p.s !== 'planted')) return 'plot';
  return p.water && p.feed ? 'bed-wetfed' : p.water ? 'bed-wet' : p.feed ? 'bed-fed' : 'bed-dug';
}

/** "1h 20m", "4m 12s", "9s" -- a timer that visibly counts down. */
export function farmClock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s >= 3600) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return m ? h + 'h ' + m + 'm' : h + 'h';
  }
  if (s >= 60) {
    const m = Math.floor(s / 60), r = s % 60;
    return r ? m + 'm ' + r + 's' : m + 'm';
  }
  return s + 's';
}

/** The bed whose reach your boots stand in, or -1: the nearest by its middle
 *  of those whose rectangle grown by `reach` holds (bx, by).  `beds` are
 *  {x, y, w, h} (top-left, game px). */
export function bedAt(beds, bx, by, reach) {
  let best = -1, bestD = Infinity;
  if (!beds || !Number.isFinite(bx) || !Number.isFinite(by)) return -1;
  for (let i = 0; i < beds.length; i++) {
    const b = beds[i];
    if (!b) continue;
    if (bx < b.x - reach || bx > b.x + b.w + reach || by < b.y - reach || by > b.y + b.h + reach) continue;
    const d = Math.hypot(bx - (b.x + b.w / 2), by - (b.y + b.h / 2));
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

/** Which seed a dug bed is planted with: the one you chose, while you still
 *  hold it; else the last you planted; else the first you hold in the crop
 *  order.  `have(id)` is how many of that crop's seed are in the bag and
 *  `open(id)` whether your Farming level plants it. */
export function seedToPlant(order, chosen, last, have, open) {
  const ok = (id) => !!id && order.indexOf(id) >= 0 && open(id) && have(id) > 0;
  if (ok(chosen)) return chosen;
  if (ok(last)) return last;
  for (const id of order) if (ok(id)) return id;
  return null;
}

/** The seeds you could plant now, in the crop order (for the picker that
 *  shows only when there is a choice). */
export function seedsInHand(order, have, open) {
  return order.filter((id) => open(id) && have(id) > 0);
}
