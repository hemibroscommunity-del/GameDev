/* ═══ v2.3.4620: THE WORKER JUDGES A CHANGE OF PLACE ═══
 *
 * A phone's `move` names the zone it is in (`z`), and the worker took it:
 * "a zone change is never judged" (movement.js, MOVE_BUDGET).  So a modified
 * phone losing a fight with another player in No man's land left it -- and
 * the bag the killer should take -- by naming today's town, the farm, an old
 * land or someone else's live run (their ids ride the 1 Hz roster): no player
 * and no monster in the Wheel reaches a player the worker holds elsewhere.
 * The state-machine sweep (2026-11-03, V1 S3-15; PLAN.md Wave 2 item 1); the
 * owner's list, "who decides a change of place".  Before this, three honest
 * roads were gated (#1499 a run nobody opened, #1508 the entry grace, #1523
 * the dungeon mouth mid-fight); the change itself was not.
 *
 * THE INVENTORY (docs/specs/zone-judge.md): every honest way OUT OF THE WHEEL
 * is one of
 *   - a dungeon, after the worker sent THIS player `dungeon_started` (their
 *     own tap at a mouth, or the leader's pull: dungeon.js);
 *   - the farm, from the Land Office's or the Feed & Seed's door in the
 *     Wheel's Brotown (game/farmTrip.js warpToFarm: no message at all), and
 *     `?wayback`'s exit beside the arrival (QA): both on the safe ground, the
 *     doors 1,202 px and more inside its edge;
 *   - the respawn, which the worker writes itself (index.js).
 * Every other way of changing place starts in today's town (the stairs into
 * the Wheel on every login, death and way back), the farm or a dungeon, where
 * no player fights a player, or on the retired old map, whose exits are tile
 * tables on the phone only and where No man's land does not exist.
 *
 * THE RULE.  A move naming a zone other than the worker's own is honoured
 * only with a reason (_zoneJudgeRefuses, asked by movement.js's zone gate, a
 * CHANGE only, as the quest lock and `dungeonlive` are):
 *   R1. INTO A DUNGEON, from anywhere: on the PASS the run gave this player
 *       when the worker sent them `dungeon_started` (inst.passes), used once,
 *       within PASS_MS.  The pass lives on the run, so a reconnect behind the
 *       dungeon's loading screen keeps it, and a swept run takes it along.  It
 *       is NOT asked again whether the player is fighting at the step in
 *       (the orchestrator's choice A): an honest player hit during the
 *       loading screen must not land in an empty arena.  The mouth already
 *       refuses a tap mid-fight (fightlock.js `fightlockdoor`).
 *   R2. OUT OF THE WHEEL to anything else: only while the worker's own last
 *       place is on the Wheel's safe ground (_wheelSafeAt).  Its radius is No
 *       man's land's SAFE_R, so nobody it lets out is in No man's land.  Not
 *       asked of a phone out of step with the room's Wheel (another map's
 *       numbers: No man's land holds nothing for it, as lastplace.js leaves it
 *       alone).
 *   Everything else as before, INTO the Wheel included (its place is judged
 *   already: the way back and the arrival, lastplace.js).  The worker's own
 *   zone writes (the respawn, the join, a spar, a body taken over) never pass
 *   here.
 *
 * A REFUSED MOVE is the refused zone's path exactly (movement.js, v2.3.1631 /
 * v2.3.3325): nothing is written -- not the zone, the place, the grace, the
 * zone's lists nor the budget -- and nothing is sent.  No message can put a
 * phone back into another map (body_place lands only a taken-over body's
 * phone and only from today's town; the tick never corrects a phone's own
 * place), so a refused phone shows where it went while the worker keeps its
 * body where it stood, in the fight and hittable.  For an honest phone --
 * which should never meet this -- it is a place with nothing in it, healed
 * by walking out: every way out of the farm or a dungeon comes down the
 * stairs to where the worker has them.  The safety net is the count of
 * refusals by road on /api/admin/overview (`zoneJudge`), so a road this
 * inventory missed shows as numbers, and `zonejudge: false` in the live flags
 * puts every change back as it was at once.  The passes are written whatever
 * the switch says, so turning it on mid-run strands nobody.
 *
 * Both protocol versions send the same move, and the refusal returns before
 * any zone snapshot is built: v1 and v2 phones fare alike, and no cap is
 * needed -- no honest phone meets it.  It protects the OTHER player: never
 * asks _testMode.  Memory only (rule 11): the passes go with their runs.
 * server/test/zone-judge.test.mjs.
 */
import { WHEEL_ZONE } from './wheelzone.js';

export const ZONE_JUDGE = Object.freeze({
  /* a run's pass lasts this long after its dungeon_started: the phone steps
     in after its loading race (8 s at most, gameEvents.js dungeon_started)
     and the network.  An app switched away behind that screen for longer
     meets the run's empty arena and walks back out of its door, as one
     away past the empty-run sweep (60 s) always did (`dungeonlive`) */
  PASS_MS: 20000,
});

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

/* the overview's road names: a dungeon's id is never a key (a phone can
   name thousands), so every run is 'dungeon' */
const roadEnd = (z) => (typeof z === 'string' && z.startsWith('dungeon:') ? 'dungeon' : String(z));

export const zoneJudgeMethods = {
  /* the kill switch: on unless `zonejudge: false` */
  _zoneJudgeOn() {
    const f = this._liveFlags;
    return !(f && typeof f === 'object' && own(f, 'zonejudge') && !f.zonejudge);
  },

  /* dungeon.js: the run gives `pid` its pass as the worker sends them
     dungeon_started (the start's own send and the leader's pull) */
  _zonePassGive(inst, pid, now) {
    if (!inst || typeof pid !== 'string' || !pid) return;
    if (!inst.passes) inst.passes = new Map();
    inst.passes.set(pid, typeof now === 'number' ? now : Date.now());
  },

  /* this player's pass into dungeon zone `z`, if it is good now */
  _zonePassOf(pid, z, now) {
    if (typeof z !== 'string' || !z.startsWith('dungeon:') || !this._dungeons) return null;
    const inst = this._dungeons.get(z.slice('dungeon:'.length));
    const at = inst && inst.passes ? inst.passes.get(pid) : undefined;
    if (typeof at !== 'number' || now < at || now - at > ZONE_JUDGE.PASS_MS) return null;
    return inst;
  },

  /* movement.js: the change into `z` was taken -- its pass is used up */
  _zonePassUse(pid, z) {
    if (typeof z !== 'string' || !z.startsWith('dungeon:') || !this._dungeons) return;
    const inst = this._dungeons.get(z.slice('dungeon:'.length));
    if (inst && inst.passes) inst.passes.delete(pid);
  },

  /* movement.js's zone gate: true when this CHANGE, from the worker's
     `ps.z` to `to`, has no reason the worker knows (R1, R2 above) */
  _zoneJudgeRefuses(pid, ps, to, now) {
    if (!ps || to === ps.z || !this._zoneJudgeOn()) return false;
    const t = typeof now === 'number' ? now : Date.now();
    let refused = false;
    if (typeof to === 'string' && to.startsWith('dungeon:')) {
      refused = !this._zonePassOf(pid, to, t);
    } else if (ps.z === WHEEL_ZONE) {
      const outOfStep = typeof this._wheelInStep === 'function' && !this._wheelInStep(ps);
      refused = !outOfStep && !this._wheelSafeAt(ps.x, ps.y);
    }
    if (refused) {
      const c = this._zjRefused || (this._zjRefused = new Map());
      const k = roadEnd(ps.z) + '>' + roadEnd(to);
      c.set(k, (c.get(k) || 0) + 1);
    }
    return refused;
  },

  /* for /api/admin/overview: on, and the changes refused by road
     ('wheel>farm_home': n, ...).  An honest phone never meets a refusal, so
     any number here is a modified phone -- or a road docs/specs/
     zone-judge.md missed: `zonejudge: false` turns it off at once */
  _zoneJudgeInfo() {
    const refused = Object.create(null);
    if (this._zjRefused) for (const [k, n] of this._zjRefused) refused[k] = n;
    return { on: this._zoneJudgeOn(), refused };
  },
};
