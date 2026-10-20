/* ═══ v2.3.3517: LIL BRO'S RACE ROUND THE SQUARE ═══
 *
 * The owner, planning the quest line for an exposé a week out: "Maybe a quest
 * racing an npc (like a clone of you) where you have to sprint around a simple
 * course."  The racer is Lil Bro, the kid on the square whose line has been
 * "Betcha can't catch me!" since v2.3.2064 -- an NPC with a walk in every
 * direction already, where a clone of you would be a fake player every system
 * that reads players would have to be taught to ignore.  The tour's race_1
 * (data.js QUEST_REWARDS) is won here.
 *
 * THE COURSE is one lap of the Town Hall's square, outside its benches, lamps
 * and well: a flag at each of its four corners and the finish at Lil Bro's own
 * spot -- Lil Bro's own line, so the shortest line round the flags is only the
 * corners' and the finish's reach shorter than his (a flag on three corners
 * let a walker cut the fourth and beat him without a sprint).  Offsets from the Wheel's middle -- the town
 * is the same ground on both Wheels (BroTown's door, Mayor Bro and Lil Bro
 * stand at the same offsets on each; test-world-core checks the course is
 * clear and on the town's ground, and that START is Lil Bro's spot).
 *
 * WHAT IS JUDGED, and where.  The worker owns the race: `race_start` stamps
 * when the gun goes (COUNTDOWN_MS from now) and Lil Bro's time for the lap,
 * LIL_SPEED along LIL_PATH; every move the worker ACCEPTS (movement.js, after
 * its own speed budget has placed you) is tested against the next flag --
 * the segment you moved along, so a fast step cannot hop over one; the
 * finish, reached before Lil Bro's time, is a win and credits `race`
 * (quests.js) while race_1 is running.  The phone draws Lil Bro running the
 * same path at the same speed from the same moment (game/race.js), so what
 * it shows is what is judged.
 *
 * THE NUMBERS.  A walk is 150 px a second, a sprint 1.33x that (sprint.js),
 * Zoom Juice 1.25x (data.js SHOP_ITEMS zoomJuice).  Lil Bro runs 165, a tenth
 * faster than a walk: his lap is ~4,010 px, 24.3 s.  The shortest line round
 * the flags is ~3,500 px, but nobody steers a thumb on it: on a line 8% longer,
 * with a beat lost at the gun, a walker comes in ~1.6 s behind him, a full bar
 * of sprint (~9 s at 200) ~1.3 s ahead, and Zoom Juice ~3.6 s ahead walking
 * (tour.test.mjs §1).  Moves before the gun count for nothing; the phone holds
 * you on the line through the countdown, and a lap begun more than START_R
 * from his spot is a false start.
 *
 * IN MEMORY ONLY (`ps._race`, never in _saveRpg's field list): a race lost to
 * a reconnect is a race run again.  One race a player at a time; a new start
 * replaces the last.  `race: false` in the live flags un-advertises it
 * (caps.race) and starts none.
 */

export const RACE = Object.freeze({
  QUEST: 'race_1',
  /* game px from the Wheel's middle: Lil Bro's spot, the Town Hall's door +
     (-260, 110) (src/data/wheelBuildingDoors.js WHEEL_TOWNSFOLK) */
  START: Object.freeze([-260, 290]),
  /* the flags in order -- his path's corners; the last is the finish line,
     at his spot */
  FLAGS: Object.freeze([
    Object.freeze([-620, 290]),
    Object.freeze([-620, -470]),
    Object.freeze([620, -470]),
    Object.freeze([620, 300]),
    Object.freeze([-260, 290]),
  ]),
  /* Lil Bro's own line: out west from his spot, then round the corners */
  LIL_PATH: Object.freeze([
    Object.freeze([-260, 290]),
    Object.freeze([-620, 290]),
    Object.freeze([-620, -470]),
    Object.freeze([620, -470]),
    Object.freeze([620, 300]),
    Object.freeze([-260, 290]),
  ]),
  FLAG_R: 80,         /* how near a flag counts as touching it */
  START_R: 160,       /* how near Lil Bro a race can be started -- and begun */
  LIL_SPEED: 165,     /* px a second (a walk is 150, a sprint ~200) */
  COUNTDOWN_MS: 3000, /* 3, 2, 1 -- then the gun */
  GRACE_MS: 30000,    /* a lap not finished this long after his is lost */
  START_GAP_MS: 1500, /* the soonest a race may start after the last start */
});

/* Lil Bro's lap, in px (the path's own length) */
export function lilLapPx() {
  let d = 0;
  const p = RACE.LIL_PATH;
  for (let i = 1; i < p.length; i++) d += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  return d;
}
/* ...and his time for it, in ms */
export function lilLapMs() {
  return Math.round(lilLapPx() / RACE.LIL_SPEED * 1000);
}

/* How near the segment a->b comes to point p */
export function segDist(ax, ay, bx, by, px, py) {
  const vx = bx - ax, vy = by - ay;
  const L = vx * vx + vy * vy;
  let t = L > 0 ? ((px - ax) * vx + (py - ay) * vy) / L : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(ax + vx * t - px, ay + vy * t - py);
}

const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

export const raceMethods = {
  /* The kill switch, the house way (smelting.js _smeltOff) */
  _raceOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && has(f, 'race') && !f.race);
  },

  /* The Wheel's middle this room plays (wheeltables.js) */
  _raceCentre() {
    const T = typeof this._wheelT === 'function' ? this._wheelT() : null;
    const c = T && T.WHEEL_CENTRE;
    return Array.isArray(c) ? c : [21504, 21504];
  },

  _raceSend(pid, type, payload) {
    const ws = this._wsBySessionId(pid);
    if (!ws) return;
    try { ws.send(JSON.stringify({ type, payload })); } catch (e) { /* the race state stands */ }
  },

  /* race_start {} -- on your marks.  Answers `race_state` (the course, in the
     room's own coordinates, and when the gun goes), or `race_end` with `err`. */
  _handleRaceStart(session) {
    if (!session || !session.id) return null;
    const pid = session.id;
    const refuse = (err) => { this._raceSend(pid, 'race_end', { won: false, err }); return null; };
    if (this._raceOff()) return refuse('off');
    const ps = this.playerState[pid];
    if (!ps || ps.dying || ps.dead || ps.disconnected) return null;
    if (ps.z !== 'wheel') return refuse('where');
    const q = ps._quests && has(ps._quests, RACE.QUEST) ? ps._quests[RACE.QUEST] : null;
    if (q !== 'active') return refuse('quest');
    const now = Date.now();
    if (ps._raceStartedAt && now - ps._raceStartedAt < RACE.START_GAP_MS) return refuse('soon');
    const [cx, cy] = this._raceCentre();
    const sx = cx + RACE.START[0], sy = cy + RACE.START[1];
    if (!(typeof ps.x === 'number' && typeof ps.y === 'number') || Math.hypot(ps.x - sx, ps.y - sy) > RACE.START_R) return refuse('far');
    const lilMs = lilLapMs();
    const t0 = now + RACE.COUNTDOWN_MS;
    ps._raceStartedAt = now;
    ps._race = { t0, next: 0, lilMs, endBy: t0 + lilMs + RACE.GRACE_MS };
    const abs = (p) => [cx + p[0], cy + p[1]];
    const state = {
      in: RACE.COUNTDOWN_MS, lilMs, speed: RACE.LIL_SPEED, flagR: RACE.FLAG_R,
      flags: RACE.FLAGS.map(abs), path: RACE.LIL_PATH.map(abs),
    };
    this._raceSend(pid, 'race_state', state);
    return state;
  },

  /* Every move the worker accepted, from (fx, fy) to where it now has you
     (movement.js).  Cheap when there is no race: one property read. */
  _raceOnMove(pid, ps, fx, fy) {
    const r = ps && ps._race;
    if (!r) return null;
    const now = Date.now();
    if (ps.z !== 'wheel' || ps.dead || ps.dying) return this._raceEnd(pid, ps, { won: false, err: 'left' });
    if (now > r.endBy) return this._raceEnd(pid, ps, { won: false, err: 'late' });
    if (now < r.t0) return null;   /* before the gun: nothing counts */
    if (typeof fx !== 'number' || typeof fy !== 'number') { fx = ps.x; fy = ps.y; }
    const [cx, cy] = this._raceCentre();
    /* the first step after the gun must leave from the line: walking off
       during the countdown (the phone holds an honest player still) is a
       false start */
    if (!r.off) {
      r.off = true;
      if (Math.hypot(fx - (cx + RACE.START[0]), fy - (cy + RACE.START[1])) > RACE.START_R) {
        return this._raceEnd(pid, ps, { won: false, err: 'early' });
      }
    }
    while (r.next < RACE.FLAGS.length) {
      const f = RACE.FLAGS[r.next];
      if (segDist(fx, fy, ps.x, ps.y, cx + f[0], cy + f[1]) > RACE.FLAG_R) break;
      r.next += 1;
      if (r.next < RACE.FLAGS.length) this._raceSend(pid, 'race_cp', { i: r.next - 1, of: RACE.FLAGS.length });
    }
    if (r.next < RACE.FLAGS.length) return null;
    const ms = now - r.t0;
    return this._raceEnd(pid, ps, { won: ms <= r.lilMs, ms, lilMs: r.lilMs });
  },

  _raceEnd(pid, ps, result) {
    ps._race = null;
    if (result.won) {
      let moved = false;
      try { moved = !!this._creditQuestObjective(pid, 'race'); } catch (e) { /* the win stands */ }
      if (moved) this._saveRpg(pid, ps);
    }
    this._raceSend(pid, 'race_end', result);
    return result;
  },
};
