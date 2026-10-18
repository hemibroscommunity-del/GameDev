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
 * its timer, how long a step takes, the frame of its animation at each moment
 * and when the work lands, and which bed your boots are in reach of.  Plain
 * arithmetic over plain data (src/data/farmAnims.js): node runs it, and
 * server/test/farmwalk.test.mjs runs it against the worker's own handler, so
 * a step this says is next is always one the worker takes.
 * docs/specs/farm-walk.md.
 */

/** The five steps, in the order a bed goes through them. */
export const FARM_STEPS = ['dig', 'plant', 'water', 'feed', 'harvest'];

/* How long each step keeps you at the bed, ms.  The fire-lighter's strike is
   0.7 s (BroTown's S._firemaking); a step is a little longer -- two swings of
   the hoe, a can's pour, the hands in the soil -- and digging longest.  Short
   enough that six beds' worth of steps is a minute's work, not a chore. */
export const FARM_WORK_MS = Object.freeze({ dig: 1500, plant: 1100, water: 1150, feed: 1100, harvest: 1250 });

/* ═══ v2.3.3345: THE FARMER'S OWN MOVES ═══
   The owner, 2026-10-17: "I'd like to have animations during the farming
   process perhaps on a sprite sheet."  They made three (tools/farm_anim_src,
   cut by tools/make_farm_anims.py into src/data/farmAnims.js): the hoe, the
   watering can, and kneeling with his hands in the soil.  Each step plays
   one of them -- digging the hoe, watering the can, planting, the compost
   and the harvest the kneel (v2.3.3136's cook crouch, its pan hidden behind a
   crate, is gone) -- frame by frame for these ms, a TURN of eight frames: */
export const FARM_STEP_ANIM = Object.freeze({ dig: 'hoe', plant: 'kneel', water: 'water', feed: 'kneel', harvest: 'kneel' });
export const FARM_ANIM_TURN = Object.freeze({
  /* raise (slower at the top), swing down fast, the strike held, pull back:
     750 ms, two swings a dig */
  hoe: Object.freeze([90, 110, 130, 60, 140, 90, 90, 40]),
  /* tip, start to pour, the stream (three frames that waver), tip back: one
     pour a watering */
  water: Object.freeze([80, 110, 120, 170, 170, 170, 160, 170]),
  /* lean in, press, pat, drop, pat, sit back: one a step */
  kneel: Object.freeze([90, 130, 150, 150, 160, 150, 130, 140]),
});
/* the frames where the work lands -- the blade striking, the water reaching
   the soil and again as it wavers, the hands pressing in and letting go:
   dirt, water, seeds, compost or leaves fly then, and the step's sound plays
   (farmWorld.js _burst, farmWalk.js) */
export const FARM_ANIM_BEATS = Object.freeze({ hoe: Object.freeze([4]), water: Object.freeze([3, 5]), kneel: Object.freeze([2, 4]) });
/* A beat this near the end is not shown: you are getting up. */
const LAST_BEAT_MS = 80;

function turnOf(step) {
  const anim = FARM_STEP_ANIM[step] || 'kneel';
  const turn = FARM_ANIM_TURN[anim];
  let ms = 0;
  for (const f of turn) ms += f;
  return { anim, turn, ms };
}
/* A step plays WHOLE turns -- as many as fit its time, at least one -- each
   stretched or squeezed a little to fill it exactly, so it always ends on the
   eighth frame, the rest pose it began in. */
function turnsIn(T, total) { return Math.max(1, Math.round(total / T.ms)); }

/** The animation a step plays ('hoe' | 'water' | 'kneel'). */
export function farmAnimOf(step) { return FARM_STEP_ANIM[step] || 'kneel'; }

/** The frame of its animation a step shows at `t` ms into its `total`;
 *  the first frame for a time that is no time at all, the last held at the
 *  end. */
export function farmWorkFrame(step, t, total) {
  if (!(t >= 0) || !(total > 0)) return 0;
  const T = turnOf(step);
  const k = (turnsIn(T, total) * T.ms) / total;
  let u = (Math.min(t, total - 1) * k) % T.ms;
  for (let f = 0; f < T.turn.length; f++) {
    if (u < T.turn[f]) return f;
    u -= T.turn[f];
  }
  return T.turn.length - 1;
}

/** When the work lands in a step of `total` ms, ms from its start: each
 *  turn's beat frames as they begin.  The bits fly and the sound plays then. */
export function farmWorkBeats(step, total) {
  const out = [];
  if (!(total > 0)) return out;
  const T = turnOf(step);
  const n = turnsIn(T, total);
  const k = total / (n * T.ms);
  const beats = FARM_ANIM_BEATS[T.anim] || [];
  for (let i = 0; i < n; i++) {
    for (const b of beats) {
      let at = i * T.ms;
      for (let f = 0; f < b; f++) at += T.turn[f];
      /* the first whole ms farmWorkFrame shows that frame -- the same
         arithmetic, so the dirt never flies a ms before the blade lands */
      let ms = Math.round(at * k);
      while (ms > 0 && farmWorkFrame(step, ms - 1, total) === b) ms--;
      while (ms < total && farmWorkFrame(step, ms, total) !== b) ms++;
      if (ms < total - LAST_BEAT_MS) out.push(ms);
    }
  }
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
