/* ═══ v2.3.6650: THE COMBO GOES AT THE LAST TARGET (card PAD part 14) ═══
 * The owner, about 07:05 UTC 2026-11-28, after playing on their iPhone:
 * "Also for combos it's hard to have to tap the button and aim at the same
 * time.  Just make the combo auto-attack the last target.  If the line of
 * site is lined up just make the combo be first attack".
 *
 * WHAT A COMBO IS, in the game's own words: the two buttons were made so
 * that "the majority of combat will consist of delivering combos of special
 * attacks, jumps, and blocking instead of managing the direction" (the
 * owner, 2026-11-23: latch.js's header).  The x1/x2/x3 chain is long gone
 * (v2.3.1747), so a combo here is the SPECIAL thrown into the fight.
 *
 * WHY IT WAS HARD: in the two buttons (`?manual=5`) a bow or a staff makes
 * the Attack disc a STICK (card PAD part 13, game/rangedStick.js): nothing
 * locks, so the special had nothing to fly at.  The bow's waited, readied,
 * until a shot's line landed on something (playerActions.js specialAttack's
 * queue), and the staff's went along the last aim or the facing: the same
 * right thumb had to press Special AND aim the disc.
 *
 * THE RULE (the stick's kinds only; the sword keeps its latch, which already
 * turns its special to the lock):
 *   1. Special with the thumb NOT aiming the disc goes at THE LAST TARGET:
 *      the monster your last landed blow hit (the worker's own echo,
 *      gameEvents.js monster_hit's `_hitByMeAt`), within LAST_MS, alive, in
 *      the weapon's sight range (sight.js sightRange: the latch's own reach);
 *   2. no last target, but the line of sight lined up (the monster a press
 *      would sight along the body's facing: sight.js sightPick, the latch's
 *      own pick): the special goes at it, the first attack of the fight;
 *   3. a thumb aiming the disc wins (a player who aims is never overruled),
 *      and nothing to take is today's road (the bow's queue, the staff's
 *      aim);
 *   4. nothing is locked: the stick keeps no lock (PAD part 13);
 *   5. `?comboaim=0` gives today's back, and the phone remembers it
 *      (localStorage `bt_comboaim`; `?comboaim=1` forgets it).
 * The choice is `comboPick` (pure); `lastTarget` the scan; `comboMon` the one
 * reading of the page, called once from specialAttack.
 * tools/guards/combo-aim.test.mjs; tools/qa/mp/mp-comboaim.mjs.
 */
import { readerFor, sw, swHas } from './switches.js';
import { twoButtonsLive } from './latch.js';
import { sightPick, sightRange, drawnFace, inSightView } from './sight.js';
import { discKind } from './rangedStick.js';

/* how long a monster you hit stays "the last target": a fight's pause (a
   roll, a jump, a block) is shorter than this, a walk to the next pack
   longer.  The owner's to change. */
export const COMBO_AIM = Object.freeze({ LAST_MS: 8000 });

const KEY = 'bt_comboaim';

/** `?comboaim=0` (remembered) gives today's special back.  On unless thrown
 *  by the address, or by the phone's memory of it.  `search` and `store` for
 *  tests (a string address, a Storage-like object or null). */
export function comboAimOn(search, store) {
  const r = typeof search === 'string' ? readerFor(search) : null;
  const off = r ? r.sw('comboaim') : sw('comboaim');
  const has = r ? r.swHas('comboaim') : swHas('comboaim');
  let ls = store;
  if (ls === undefined) { try { ls = typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { ls = null; } }
  if (has) {
    try { if (ls) { if (off) ls.setItem(KEY, '0'); else ls.removeItem(KEY); } } catch (e) { /* private mode: the address alone */ }
    return !off;
  }
  try { if (ls && ls.getItem(KEY) === '0') return false; } catch (e) { /* no memory: on */ }
  return true;
}

function idOk(id) { return id != null && id !== ''; }

/** THE CHOICE.  `live` exactly true for the two buttons' stick (the disc a
 *  stick: a bow or a staff), `on` the switch, `aiming` exactly true while the
 *  thumb aims the disc, `lastId` the last target's id or null, `sightId` the
 *  lined-up monster's id or null.  The id the special goes at, or null:
 *  today's road. */
export function comboPick(live, on, aiming, lastId, sightId) {
  if (live !== true || on !== true || aiming === true) return null;
  if (idOk(lastId)) return lastId;
  if (idOk(sightId)) return sightId;
  return null;
}

function alive(m) {
  return !!m && !!m.alive && !(typeof m.curHp === 'number' && m.curHp <= 0) && isFinite(m.x) && isFinite(m.y);
}

/** THE LAST TARGET: of `mons`, the one your newest landed blow hit
 *  (`_hitByMeAt`, ms) no longer ago than LAST_MS before `now`, alive, within
 *  `reach` world px of `me` and in `view` (sightView's, or null: all in
 *  view).  A monster that is gone, dead, far or old is no target: the next
 *  newest is not taken either (the last is the last).  Or null. */
export function lastTarget(mons, me, reach, now, view) {
  if (!Array.isArray(mons) || !me || !isFinite(me.x) || !isFinite(me.y)) return null;
  let best = null, at = 0;
  for (let i = 0; i < mons.length; i++) {
    const m = mons[i];
    const t = m && m._hitByMeAt;
    if (typeof t === 'number' && t > at) { at = t; best = m; }
  }
  if (!best || !(now - at <= COMBO_AIM.LAST_MS) || !alive(best)) return null;
  if (Math.hypot(best.x - me.x, best.y - me.y) > reach) return null;
  if (!inSightView(view, best.x, best.y)) return null;
  return best;
}

function findMon(mons, id) {
  if (!Array.isArray(mons)) return null;
  const k = String(id);   /* ids are numbers in some spawn paths, strings over the wire (latch.js findMon) */
  for (let i = 0; i < mons.length; i++) { const m = mons[i]; if (m && String(m.id) === k) return m; }
  return null;
}

/** specialAttack's read: the monster this special goes at, or null (today's
 *  road).  `mult` the weapon's range multiplier (bowRangeMult or
 *  staffRangeMult: the frame's own, BroTown's discFrame call).  Reads,
 *  writes nothing (no lock: the stick keeps none). */
export function comboMon(S, mult, now) {
  if (!S || !S.rpg || !S.player) return null;
  const live = twoButtonsLive() && discKind(S) === 'stick';
  if (!live) return null;
  const on = comboAimOn();
  const aiming = S._aiming === true;
  const slot = S.rpg.activeSlot;
  const range = sightRange(slot, mult);
  const view = null;   /* the weapon's reach alone: a page rule reads no view's size (TRAPS 237's census, traps-combat-rules) */
  const t = typeof now === 'number' ? now : Date.now();
  const last = lastTarget(S.monsters, S.player, range.out, t, view);
  const pk = last ? null : sightPick(S.player, drawnFace(S), S.monsters, range, null, view, false);
  const id = comboPick(live, on, aiming, last ? last.id : null, pk ? pk.id : null);
  return idOk(id) ? (last && String(last.id) === String(id) ? last : findMon(S.monsters, id)) : null;
}
