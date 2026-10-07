/* ═══ v2.3.3124: WORKING YOUR BEDS BY HAND ═══
 *
 * The owner, 2026-10-06: "I want the planting process to happen by your
 * character taking action on the plot of ground.  You dig, you water, you
 * fertilize, etc. you can use the firemaking animation for all of that.  I
 * don't want the game to just be reading a bunch of boring menus."
 *
 * So on your farm (farm_home) a bed is worked where it lies:
 *
 *   - walk up to it: the bed your BOOTS stand in reach of is S._nearBed
 *     ({i, step}), its step the next in the worker's own order (farmWork.js
 *     bedNext) -- the right stick wears that step's picture and E, a tap on
 *     the stick or a tap on the bed itself takes it (desktopControls
 *     runInteract, BroTown's bed tap);
 *   - you CROUCH at its back, facing us, and work it, as the cook does -- the
 *     owner: "Cooking animation might be better.  You can use something to
 *     occlude the part where the pan or log is" -- with a crate of earth,
 *     seeds or water, the compost bin or the straw standing where the pan
 *     would be (effectsRenderer _updateFarmKneel), dirt, seeds, water or
 *     compost flying from your hands each time they push out (farmWorld.js),
 *     a sound at each (below);
 *   - when the kneeling ends the step goes to the worker (farm_act, the
 *     window's own message: farmBus.act) and the bed changes when it
 *     answers -- nothing here changes a bed, the bag or the XP;
 *   - move and the step is dropped, unsent.
 *
 * What a step needs is said BEFORE you kneel: no seeds, no compost, the farm
 * switched off, the socket down.  docs/specs/farm-walk.md.
 */
import { BT_AUDIO } from '@/data/index.js';
import { FARM, FARM_CROP_ORDER } from '@/data/farmCrops.js';
import { FARM_BEDS, FARM_BED_REACH, FARM_KNEEL_DY, FARM_KNEEL_DX } from '@/data/farmLayout.js';
import { farmBus } from '@/ui/mobile/farmBus.js';
import { bedNext, bedAt, farmClock, farmWorkBeats, FARM_WORK_MS, seedToPlant, seedsInHand } from '@/game/farmWork.js';
import { pushDmgPopup, offlineRefused } from '@/game/combatHelpers.js';
import { jumpAirborne } from '@/game/jump.js';
import { playerGroundDy } from '@/rendering/systems/entityRenderer.js';

export const FARM_WALK_ZONE = 'farm_home';
/* How far the seat may slide under you before a step counts as walked away
   from (the stick's dead zone moves you a hair) */
const LEAVE_PX = 10;
/* How often a farm the worker has not described is asked for again */
const ASK_MS = 5000;
const BAD = '#D8635D';
const SAY = '#F4F0E7';

function farmOn(S) { return !!(S && S._serverCaps && S._serverCaps.farm); }
/* the crops this worker grows (caps.farmCrops counts them, in their order) */
function grownCrops(S) {
  const n = S && S._serverCaps && typeof S._serverCaps.farmCrops === 'number' ? S._serverCaps.farmCrops : 4;
  const ids = Object.keys(FARM.CROPS).slice(0, n);
  return FARM_CROP_ORDER.filter((id) => ids.indexOf(id) >= 0);
}
function farmingLevel(S) {
  const f = S && S.rpg && S.rpg.lifeSkills && S.rpg.lifeSkills.farming;
  return (f && f.level) || 1;
}
function seedsHeld(S, id) {
  const inv = S && S.rpg && S.rpg.inventory;
  const c = FARM.CROPS[id];
  return (inv && c && Math.floor(Number(inv[c.seed]) || 0)) || 0;
}
function canGrow(S, id) { return !!FARM.CROPS[id] && farmingLevel(S) >= FARM.CROPS[id].lvl; }

/** The seeds you could plant now (the picker shows only when there is a choice). */
export function farmSeedsInHand(S) {
  return seedsInHand(grownCrops(S), (id) => seedsHeld(S, id), (id) => canGrow(S, id));
}
/** The seed a dug bed would be planted with now. */
export function farmSeedToPlant(S) {
  return seedToPlant(grownCrops(S), S && S._farmSeedPick, S && S._farmLastSeed, (id) => seedsHeld(S, id), (id) => canGrow(S, id));
}
/** Choose the seed to plant (the picker beside the bed). */
export function pickFarmSeed(S, id) {
  if (S && FARM.CROPS[id]) S._farmSeedPick = id;
}

function sayOverBed(S, i, text, color) {
  const b = FARM_BEDS[i];
  if (!S || !b) return;
  try { pushDmgPopup(S, b.x + b.w / 2, b.y - 8, text, color || SAY, { ttl: 1.6 }); } catch (e) { /* words only */ }
  if (typeof window !== 'undefined' && window.__btProbe) {
    const log = window.__btFarmSaid || (window.__btFarmSaid = []);
    log.push({ bed: i, text, at: Date.now() });
    if (log.length > 40) log.shift();
  }
}
function play(key, opts) { try { BT_AUDIO.play(key, opts); } catch (e) { /* sound only */ } }

/* the sound of each lean, from recordings already in the game (SFX_MANIFEST) */
const BEAT_SOUND = {
  dig: () => play('footstep-v3', { vol: 0.55, rate: 0.7 }),
  plant: () => play('footstep-v3', { vol: 0.3, rate: 1.35 }),
  water: () => play('lure-drop', { vol: 0.32, rate: 1.25 }),
  feed: () => play('footstep-v3', { vol: 0.4, rate: 0.6 }),
  harvest: () => play('footstep-v3', { vol: 0.45, rate: 0.95 }),
};

/** Per frame, from BroTown's loop: the bed in reach (S._nearBed) and a step in
 *  progress (S._farmWork) -- its sounds, its end, or its being walked away from. */
export function tickFarmWalk(S, now) {
  if (!S) return;
  if (S.currentZone !== FARM_WALK_ZONE || !S.player) {
    S._nearBed = null;
    if (S._farmWork) S._farmWork = null;
    return;
  }
  const P = S.player;
  const w = S._farmWork;
  if (w) {
    if (S._dying || Math.hypot(P.x - w.x, P.y - w.y) > LEAVE_PX) {
      S._farmWork = null;   /* walked away, or fell: nothing is sent */
    } else {
      if (!w._beats) { w._beats = farmWorkBeats(w.doneAt - w.startedAt); w._sb = 0; }
      while (w._sb < w._beats.length && now - w.startedAt >= w._beats[w._sb]) {
        w._sb++;
        const fx = BEAT_SOUND[w.step];
        if (fx) fx();
      }
      if (now >= w.doneAt) {
        S._farmWork = null;
        finishStep(S, w);
      }
    }
  }
  const view = farmBus.view;
  /* A farm the worker has not described to this page -- you came by the Land
     Office and never opened the Feed & Seed, and the join sends a farm only
     once there is one (farm.js _farmOnJoin) -- is asked for on arrival, as
     the window asks when it opens: farm_open makes the free deed.  Again
     every ASK_MS while it goes unanswered, never over a request still out. */
  if (farmOn(S) && !view && !farmBus.pending && !(now - (S._farmAskedAt || 0) < ASK_MS)) {
    S._farmAskedAt = now;
    farmBus.open(S);
  }
  if (!farmOn(S) || !view || !Array.isArray(view.plots)) { S._nearBed = null; return; }
  const fy = P.y + playerGroundDy(S.currentZone, P.x, P.y);
  const i = bedAt(FARM_BEDS.slice(0, view.beds), P.x, fy, FARM_BED_REACH);
  if (i < 0) { S._nearBed = null; return; }
  const n = bedNext(view.plots[i], farmBus.serverNow());
  const prev = S._nearBed;
  if (prev && prev.i === i && prev.step === n.step) return;
  S._nearBed = { i, step: n.step };
}

/** Take the next step at bed `i` (E, the stick's tap, a tap on the bed).
 *  True when the press was used -- a step begun, or a reason said. */
export function startFarmStep(S, i) {
  if (!S || !S.player || S.currentZone !== FARM_WALK_ZONE) return false;
  if (S._farmWork) return true;   /* one at a time: the press is used */
  if (S._extraction || S._firemaking) return false;   /* the cook's figure is busy at a fire */
  if (jumpAirborne(S, Date.now())) return false;
  const b = FARM_BEDS[i];
  const view = farmBus.view;
  if (!b) return false;
  if (!farmOn(S) || !view || !Array.isArray(view.plots) || i >= view.beds) {
    sayOverBed(S, i, 'The farm is closed for now', BAD);
    return true;
  }
  if (offlineRefused(S)) return true;   /* "Reconnecting..." -- the worker could not hear the step */
  if (farmBus.pending) return true;     /* the last step's answer is still on its way */
  const n = bedNext(view.plots[i], farmBus.serverNow());
  if (!n.step) {
    sayOverBed(S, i, 'Growing: ' + farmClock(n.left || 0), SAY);
    return true;
  }
  let crop = null;
  if (n.step === 'plant') {
    crop = farmSeedToPlant(S);
    if (!crop) { sayOverBed(S, i, 'No seeds: the Feed & Seed sells them', BAD); return true; }
  }
  if (n.step === 'feed') {
    const inv = S.rpg && S.rpg.inventory;
    if (!(inv && Math.floor(Number(inv[FARM.COMPOST]) || 0) > 0)) { sayOverBed(S, i, 'No compost: the Feed & Seed sells it', BAD); return true; }
  }
  /* crouch at its back, boots just inside its edge and left of its middle,
     facing us: what stands where the cook's pan is comes to your right, over
     the bed (farmLayout.js FARM_KNEEL_DX) */
  const P = S.player;
  P.x = b.x + b.w / 2 + FARM_KNEEL_DX;
  P.y = b.y + FARM_KNEEL_DY - playerGroundDy(S.currentZone, P.x, b.y);
  P.vx = 0; P.vy = 0;
  S._facingAngle = Math.PI / 2;
  S._targetFacingAngle = Math.PI / 2;
  S._facing = 'down';
  P.dir = 'down';
  const t0 = Date.now();
  S._farmWork = { bed: i, step: n.step, crop, startedAt: t0, doneAt: t0 + FARM_WORK_MS[n.step], x: P.x, y: P.y };
  return true;
}

function finishStep(S, w) {
  const ok = farmBus.act(S, w.step, [w.bed], w.step === 'plant' ? w.crop : undefined);
  if (!ok) { sayOverBed(S, w.bed, 'Try again', BAD); return; }
  if (w.step === 'plant' && w.crop) S._farmLastSeed = w.crop;
  /* where a harvest's crop flies to the bag from (farmFeedback.js) */
  S._farmLastStep = { bed: w.bed, step: w.step, at: Date.now() };
  if (typeof window !== 'undefined' && window.__btProbe) {
    const log = window.__btFarmSteps || (window.__btFarmSteps = []);
    log.push({ bed: w.bed, step: w.step, crop: w.crop || null, at: Date.now() });
    if (log.length > 40) log.shift();
  }
}

/** QA (mp-farmwalk): the bed in reach, the step under way, the seed. */
if (typeof window !== 'undefined') {
  window.__btFarmWalk = () => {
    const S = window._gameState && window._gameState.current;
    if (!S) return null;
    const w = S._farmWork;
    return {
      near: S._nearBed ? { ...S._nearBed } : null,
      work: w ? { bed: w.bed, step: w.step, crop: w.crop, left: w.doneAt - Date.now() } : null,
      seed: farmSeedToPlant(S),
      seeds: farmSeedsInHand(S),
      hold: !!S._farmArtHold,
    };
  };
}
