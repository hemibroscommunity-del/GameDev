/* ═══ v2.3.3732: THE MESSAGE DIET -- A STEADY WALK IS A PATH, NOT A STREAM ═══
 *
 * Owner, 2026-10-28: "Before when you mentioned using less server messages
 * for movement, can that be started now?" -- after asking "Wouldn't the
 * message diet slow down the game?  Like introduce more lag than otherwise?"
 * and being told it must not (docs/WORLD-ARCHITECTURE.md §11, "The fix: fewer
 * messages", item 1; docs/specs/move-path.md has the whole story and the
 * numbers).
 *
 * A moving phone sends its place 15-30 times a second (wsClient.js
 * MOVE_GAP_SEEN_MS / MOVE_GAP_SOLO_MS), and messages coming in are the
 * biggest line of the bill and what fills a room.  Against a worker that
 * advertises `caps.movepath`, a phone in the Wheel sends a steady walk -- the
 * same speed, on the line its last move drew, about as far along it as that
 * speed takes it (src/game/moveDiet.js pathMayWait) -- only every GAP_MS
 * (about 5 a second), and anything else at once, on its next 33 ms batch: a
 * turn past ~2 degrees, a start, a stop, a sprint, a roll, a shove, a wall
 * (the phone stops where the speed says it goes on), new gear.  Those moves
 * carry `pd: 1`: "move me along my speed until my next one".
 *
 * And between them THIS WORKER MOVES ITS COPY of the player along that speed
 * (_tickMovePath, the first thing every tick does), so what reads ps.x/ps.y
 * -- the monsters' chase, every hit's range, the lag compensation's history
 * (tick.js), the abilities -- reads a player who walks smoothly, not one who
 * jumps every 200 ms.  That is v2.3.1635's mistake not repeated: a plain 5 Hz
 * left the copy standing between messages, and chasing monsters rubber-banded
 * after its 40 px jumps (v2.3.1767 put the floor back to 15 Hz).
 *
 * WHAT IT NEVER DOES:
 *   - move anyone faster than the walk's own bound (movement.js MOVE_BUDGET,
 *     the potion and the move stat the worker sold, SPRINT.MULT only for a
 *     sprint step it is billing): the speed on the wire is clipped to it;
 *   - move anyone further than HORIZON_MS of that speed past their last move:
 *     a phone that goes quiet (a stalled connection) is left there, as today;
 *   - judge a move from its own guess.  A new move is judged from the LAST
 *     MOVE'S place (_movePathRewind), so the walk budget, the sprint's bill,
 *     the race's flags and the pose are worked out from move to move exactly
 *     as before -- the glide in between is never spent, never billed and
 *     never trusted;
 *   - go on after the worker put the player somewhere itself (a lunge, a dash,
 *     a respawn, a follow) or the player died or left the Wheel: it stops on
 *     anything it did not write itself.
 *   The worker has no walls (the phone does: BroTown.jsx isSolid), so the copy
 *   stops at what the worker already refuses -- speed and zone -- and no more;
 *   a phone that meets a wall sends at once (its place stops matching its
 *   speed), so an honest copy runs on into one for at most a batch.
 *
 * WHAT THE OTHER PHONES SEE: a glider goes out to them every SEND_MS (the
 * steady hold's own MAX_MS, steadymovers.js), at where the copy is, so a
 * watching phone gets the walker as often as it did -- and draws them from
 * their speed, as it always has (visualSystems.js); a turn, a stop or a start
 * goes out on the next tick after it comes in, as before.
 *
 * THE SWITCHES (the owner, 2026-10-28: "I would want to play it with it on
 * before tomorrow to see if there's any noticeable difference.  If not, I'd
 * rather just leave it on."):
 *   - this worker always UNDERSTANDS the path: it advertises caps.movepath and
 *     glides any move marked `pd: 1`;
 *   - v2.3.3744: EVERY PHONE IS ON IT BY DEFAULT (caps.pathall), the owner,
 *     2026-10-28: "Just turn the message diet on now I'll turn it off if I do
 *     not like".  `pathall: false` in the live flags (the Test panel's "Only
 *     ?diet=1 phones") puts only a phone that asks back on it:
 *   - one phone asks with `?diet=1` in its address (wsClient.js
 *     movePathOn; `?diet=0` keeps one phone out);
 *   - `movepath: false` is the kill switch: no cap, no glide from the next
 *     tick, and every phone told at once (`move_path`, _movePathFlagChanged)
 *     to send every move again.
 * An old phone never sends `pd` and is never glided; an old worker never
 * advertises the cap and every phone sends as before.
 *
 * NOTHING IS PERSISTED (handoff rule 1): `_mp` is an underscore field on the
 * player state, and a worker restart forgetting it is correct.
 */
import { MOVE_BUDGET } from './movement.js';
import { SPRINT } from './sprint.js';
import { RIDE } from './ride.js';   /* v2.3.3776: a board glides at its own pace */
import { WHEEL_ZONE } from './wheelzone.js';

export const MOVE_PATH = Object.freeze({
  /* the longest a steady move waits on the phone -- MIRROR:
     src/game/moveDiet.js MOVE_PATH.GAP_MS (move-path.test.mjs pins it) */
  GAP_MS: 200,
  /* the copy goes no further than this past the last move's own time: a
     report a batch late and a network's wobble on top of GAP_MS */
  HORIZON_MS: 300,
  /* a glider goes out to the other phones this often: steadymovers.js
     STEADY.MAX_MS, the most a steady walker was ever held */
  SEND_MS: 66,
});

/* a move's vx/vy: hundredths of a pixel a 60 Hz frame -> pixels a ms */
const PX_PER_MS = 60 / 100 / 1000;

export const movePathMethods = {
  /* the worker's glide: on unless the kill switch `movepath: false` (the
     header, THE SWITCHES) */
  _movePathOn() {
    const f = this._liveFlags;
    return !(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'movepath') && !f.movepath);
  },

  /* every phone on the path: v2.3.3744, ON by default, off with `pathall:
     false` in the live flags, and never while the kill switch is thrown */
  _movePathAll() {
    const f = this._liveFlags;
    return this._movePathOn() && !(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'pathall') && !f.pathall);
  },

  /* liveops.js, when `movepath` or `pathall` is set or cleared: every phone
     told at once, so the kill switch stops every phone's diet as it stops
     the glide (a phone still on the path with no glide behind it would be
     v2.3.1635's rubber band); a phone that joins later reads its caps */
  _movePathFlagChanged() {
    this.broadcastAll({ type: 'move_path', on: this._movePathOn(), all: this._movePathAll() });
  },

  /* _handleMove, before it judges a move: a glided copy goes back to the last
     move's place, so the new one is judged, billed and raced from move to
     move as before (the header, WHAT IT NEVER DOES).  Only when nothing but
     the glide moved the copy since. */
  _movePathRewind(ps) {
    const g = ps && ps._mp;
    if (!g) return;
    if (ps.x === g.lx && ps.y === g.ly && ps.z === g.z) { ps.x = g.x; ps.y = g.y; }
    ps._mp = undefined;
  },

  /* _handleMove, once a move is accepted and written: glide it if its phone
     asks (`pd: 1`), the switch is on, it is in the Wheel, moving, and the
     worker took it where the phone said (not followed: the follow moves it) */
  _movePathNote(id, ps, msg, now, sprintK) {
    if (!ps) return;
    ps._mp = undefined;
    if (!msg || msg.pd !== 1 || !this._movePathOn()) return;
    if (ps.z !== WHEEL_ZONE || ps.dead || ps.dying || ps._mvFollow) return;
    if (ps.x !== msg.x || ps.y !== msg.y) return;
    let vx = typeof msg.vx === 'number' && Number.isFinite(msg.vx) ? msg.vx * PX_PER_MS : 0;
    let vy = typeof msg.vy === 'number' && Number.isFinite(msg.vy) ? msg.vy * PX_PER_MS : 0;
    const sp = Math.sqrt(vx * vx + vy * vy);
    if (!(sp > 0)) return;
    /* never faster than the walk's bound (movement.js, the same multipliers) */
    const { spdCap, moveMult } = this._moveSpeedK(ps);
    const k = sprintK > 1 ? Math.min(sprintK, Math.max(SPRINT.MULT, RIDE.MULT)) : 1;
    const cap = MOVE_BUDGET.SPEED_PX * spdCap * moveMult * k / 1000;
    if (sp > cap) { vx *= cap / sp; vy *= cap / sp; }
    ps._mp = { x: ps.x, y: ps.y, z: ps.z, vx, vy, at: now, lx: ps.x, ly: ps.y, sentAt: now };
    const set = this._mpGliding || (this._mpGliding = new Set());
    set.add(id);
  },

  /* the tick's first job: every glider's copy on along its speed, to where
     it is now (at most HORIZON_MS past its last move); out to the other
     phones every SEND_MS.  Almost always an empty Set. */
  _tickMovePath(now) {
    const set = this._mpGliding;
    if (!set || set.size === 0) return;
    const on = this._movePathOn();
    for (const id of set) {
      const ps = this.playerState[id];
      const g = ps && ps._mp;
      if (!on || !g || ps.z !== g.z || ps.dead || ps.dying || ps._mvFollow
          || ps.x !== g.lx || ps.y !== g.ly) {   /* someone else put them somewhere */
        if (ps && ps._mp === g) ps._mp = undefined;
        set.delete(id);
        continue;
      }
      const t = Math.min(Math.max(0, now - g.at), MOVE_PATH.HORIZON_MS);
      /* to a tenth of a px, as a phone sends its place (BroTown.jsx): every
         phone near is sent it, and a long fraction is bytes for nothing */
      const nx = Math.round((g.x + g.vx * t) * 10) / 10, ny = Math.round((g.y + g.vy * t) * 10) / 10;
      if (nx !== ps.x || ny !== ps.y) {
        ps.x = nx; ps.y = ny;
        g.lx = nx; g.ly = ny;
        g.t = g.at + t;
        if (now - g.sentAt >= MOVE_PATH.SEND_MS) {
          g.sentAt = now;
          this.dirtyPlayers.add(id);
        }
      }
      if (t >= MOVE_PATH.HORIZON_MS) {   /* the end of the path: left there */
        set.delete(id);
        this.dirtyPlayers.add(id);
      }
    }
  },

  /* tick.js, the time a dirty player's place is from (steadymovers.js reads
     it as the move's time): the glide's, while it is ahead of the last move */
  _movePathAt(ps) {
    const g = ps && ps._mp;
    return g && typeof g.t === 'number' && ps.x === g.lx && ps.y === g.ly ? g.t : ps.lastMoveAt;
  },

  /* /api/admin/overview: is it on, and how many glide now */
  _movePathInfo() {
    return { on: this._movePathOn(), gliding: this._mpGliding ? this._mpGliding.size : 0 };
  },
};
