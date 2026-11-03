/* ═══ v2.3.3946: MONSTER MOVES -- TOUGHER MONSTERS FROM LEVEL 6 ═══
 * (spec: docs/specs/monster-moves.md; pinned by server/test/monster-moves.test.mjs)
 *
 * The owner, 2026-11-02: "Make next tier monsters noticeably harder.  Develop
 * combo / specific ability system to make them harder to beat."  And from the
 * list of 2026-10-26 (item 18): measure it with the fight simulator, and do
 * not make the judges' first slimes a wall.
 *
 * Until now a Wheel monster fought the same at every tier: its HP and damage
 * grew with its level (pace-and-difficulty.md), and its behaviour did not.
 * This gives every look family a short list of MOVES, each unlocked by the
 * tier the monster stands in (wheelzone.js stamps `m.tier` on every stretch
 * past the first; the first has none, and is tier 1):
 *
 *   tier 1   (levels 1-5)    nothing new: a new player's first fights are
 *                             exactly as they were
 *   tier 2   (levels 6-10)   one signature move a family: a two-strike combo
 *                             (the slime's is a double lunge)
 *   tiers 3-4 (11-20)        a second: the snowman's Snow Volley, a charge
 *                             along a lane, a two-step slam
 *   tiers 5-6 (21-30)        an area slam: a ring round the monster
 *   tiers 7-8 (31-40)        enrage below 30% HP (faster swings, shorter
 *                             cooldowns, a red pulse on the body), and every
 *                             cooldown 20% shorter
 *
 * WHAT MAKES EACH ONE FAIR (telegraph.js's four rules, kept):
 *   1. a warning on the ground the player can SEE -- a ring, a lane or a fan
 *      in the monster's element colour -- at least 600 ms before it lands,
 *      800 for the big hits, with the monster planted for it;
 *   2. what is drawn is what is tested: every hit is measured, when it lands,
 *      against the shape the warning drew, where the player is NOW;
 *   3. every hit goes through the one door (hits.js _monsterHit), each move
 *      with its own row: a shield facing it blocks it, a roll slips it, a
 *      rock in the way stops it, the safe ground and the harvest shield as
 *      ever;
 *   4. the no-one-shot rail: no single strike takes more than half a bar.
 *
 * WRITES AND MESSAGES (CLAUDE.md §5).  A move stores nothing: its state is on
 * the monster in memory, gone with a deploy like every wind-up (handoff rule
 * 11).  A move sends one `monster_ability` telegraph, as a kit does, and one
 * `execute` a strike (a combo's two, a two-step slam's two); a hit on a player
 * is the door's own monster_attack and its coalesced save.  No new message
 * type: new `ability` kinds on the existing display-only event, so nothing to
 * add to PRIVILEGED_EVENTS.
 *
 * SWITCHES (liveops.js, lower case): `monstermoves: false` turns all of it off
 * (tier 1's behaviour everywhere), and one a kind -- `monstercombo`,
 * `monstercharge`, `monstervolley`, `monsterslam` (the two-step slam and the
 * area slam), `monsterenrage`.  `caps.monstermoves` tells a phone the worker
 * can do this; the flags ride the caps (liveops.js), so a phone also reads a
 * kind's switch there.
 */
import { WHEEL_ZONE } from './wheelzone.js';
import { slideMove } from './props.js';

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

/* ═══ THE MOVES ═══
 * Each move's numbers.  A family's entry below may override any of them (its
 * name for the bestiary, a slower wind-up, a smaller hit).
 *
 *   kind        the wire's `ability` (gameEvents.js's tables draw it)
 *   row         its row of the hit door (hits.js MONSTER_HITS)
 *   flag        its own kill switch
 *   windupMs    the warning, before the first strike lands
 *   cooldownMs  before the same move again (x the tier's and enrage's K)
 *   minR, maxR  it starts only with its target this far (px, a plain distance)
 *
 *   combo   strikes: how many; gapMs between them; `radius` of the ring round
 *           the monster (it flails in front of itself, so the ring goes where
 *           it goes: a player's own blows shove it back mid-combo, and a ring
 *           left at the target's feet whiffed on everyone who followed it in --
 *           measured, the first cut's tier 2 took LESS damage than tier 1)
 *   charge  the lane: from the monster through its target and `past` px on,
 *           `minLen`..`maxLen` long, `laneW` px each side; a dash of `pxPerS`
 *   volley  `n` balls in a fan `spread` radians wide, each landing `travelMs`
 *           after the throw at the fan's ends, `reach` px out at most, hitting
 *           `ballR` px round where it lands
 *   stomp   two rings round the monster, the second `gapMs` after the first:
 *           `r0` then `radius` (a step forward, a bigger slam)
 *   quake   one ring round the monster, `radius`
 */
export const MOVE_DEFS = Object.freeze({
  combo: Object.freeze({
    kind: 'combo', row: 'combo', flag: 'monstercombo',
    windupMs: 700, gapMs: 400, strikes: 2, dmgMult: 1.0, radius: 100,
    minR: 0, maxR: 100, cooldownMs: 4500,
  }),
  charge: Object.freeze({
    kind: 'charge', row: 'charge', flag: 'monstercharge',
    windupMs: 800, dmgMult: 1.5, laneW: 34, past: 70, minLen: 160, maxLen: 340, pxPerS: 650,
    minR: 110, maxR: 320, cooldownMs: 9000,
  }),
  volley: Object.freeze({
    kind: 'volley', row: 'volley', flag: 'monstervolley',
    windupMs: 800, n: 3, spread: 0.84, reach: 340, ballR: 44, travelMs: 650, dmgMult: 0.9,
    minR: 110, maxR: 340, cooldownMs: 8000,
  }),
  stomp: Object.freeze({
    kind: 'stomp', row: 'quake', flag: 'monsterslam',
    windupMs: 800, gapMs: 450, r0: 90, radius: 150, dmgMult: 1.0,
    minR: 0, maxR: 120, cooldownMs: 9000,
  }),
  quake: Object.freeze({
    kind: 'quake', row: 'quake', flag: 'monsterslam',
    windupMs: 1000, radius: 150, dmgMult: 1.6,
    minR: 0, maxR: 130, cooldownMs: 11000,
  }),
});

/* the kinds a phone draws as a warning on the ground (mirror-audit holds
   gameEvents.js's tables to them, as it does the kits) */
export const MOVE_KINDS = Object.freeze(Object.keys(MOVE_DEFS).map((k) => MOVE_DEFS[k].kind));

export const MONSTER_MOVES = Object.freeze({
  /* no special (a move or a kit) starts within this of the last one ending:
     two in a row is a wall of warnings, not a fight */
  GAP_MS: 1800,
  /* on a monster's first look at a fight each move waits this share of its
     cooldown, so the opening blows are its ordinary swings */
  OPEN_K: 0,
  /* ═══ THE STAT STEP (the brief's fallback, taken: see the spec's tables) ═══
     Moves alone did not make tier 2 noticeably harder: a same-level fight
     is over in 3 to 5 seconds, one or two moves.  So each tier past the
     first adds HP_K to a monster's health and DMG_K to its hit, at spawn
     (wheelzone.js; 1.1x and 1.08x at tier 2, 1.7x and 1.56x at tier 8).
     `monstermoves: false` leaves a monster spawned after it as it was. */
  STEP: Object.freeze({ HP_K: 0.10, DMG_K: 0.08 }),
  /* tiers 7-8: every cooldown (a move's, a kit's) 20% shorter */
  ELDER_TIER: 7,
  ELDER_CD_K: 0.8,
  /* enrage: below HP_FRAC of its bar, a monster that has it swings SWING_K as
     often (1500 -> 1050 ms) and its cooldowns are CD_K shorter again.  The
     wind-ups are NOT shortened: the warning stays as long as it was. */
  ENRAGE: Object.freeze({ TIER: 7, HP_FRAC: 0.3, CD_K: 0.7, SWING_K: 0.7, flag: 'monsterenrage' }),
});

/* ═══ EACH FAMILY'S MOVES, BY TIER ═══
 * A family is the look a player knows (familyOf below).  Each list is the
 * order a monster tries its moves in when more than one is ready: the newest
 * first.  `name` is the bestiary's (src/data/codexStage.js CODEX_SPECIAL_LABEL
 * has each kind's colour). */
const M = (tier, move, name, over) => Object.freeze({ tier, move, name, ...(over || null) });
export const FAMILY_MOVES = Object.freeze({
  /* the storm slimes, the mire wisps and the Verdant Wilds' blue slimes */
  slime: Object.freeze([
    M(2, 'combo', 'Double Lunge', { windupMs: 800, gapMs: 450, dmgMult: 0.9 }),
    M(3, 'volley', 'Goo Volley', { ball: 'slime', dmgMult: 0.8 }),
    M(5, 'quake', 'Belly Flop', { radius: 130 }),
    M(7, 'enrage', 'Enrage'),
  ]),
  goblin: Object.freeze([
    M(2, 'combo', 'Claw Combo'),
    M(3, 'charge', 'Flame Charge'),
    M(5, 'quake', 'Eruption'),
    M(7, 'enrage', 'Enrage'),
  ]),
  /* his melee ring is 70 on a 1.5 stretch (telegraph.js _basicAtkGeom): the
     combo's reach is his, and the volley is the deferred Snow Volley
     (telegraph.js header, COMBAT-OVERHAUL-PLAN PR3) */
  snowman: Object.freeze([
    M(2, 'combo', 'Double Poke'),
    M(3, 'volley', 'Snow Volley', { ball: 'snowball' }),
    M(5, 'quake', 'Avalanche'),
    M(7, 'enrage', 'Enrage'),
  ]),
  mummy: Object.freeze([
    M(2, 'combo', 'Bandage Lash'),
    M(3, 'charge', 'Sand Rush'),
    M(5, 'quake', 'Sandstorm Slam'),
    M(7, 'enrage', 'Enrage'),
  ]),
  rock: Object.freeze([
    M(2, 'combo', 'One-Two Punch'),
    M(3, 'stomp', 'Two-Step Slam'),
    M(5, 'quake', 'Quake'),
    M(7, 'enrage', 'Enrage'),
  ]),
  fishman: Object.freeze([
    M(2, 'combo', 'Fin Combo'),
    M(3, 'charge', 'Tidal Rush'),
    M(5, 'quake', 'Wave Slam'),
    M(7, 'enrage', 'Enrage'),
  ]),
  lurker: Object.freeze([
    M(2, 'combo', 'Bog Combo'),
    M(3, 'stomp', 'Two-Step Slam'),
    M(5, 'quake', 'Mire Quake'),
    M(7, 'enrage', 'Enrage'),
  ]),
});

/* A monster's family: by its archetype and element, the two things the worker
   decides its look by (index.js _variantForArchInZone).  A swarm gets nothing,
   the kits' rule (telegraph.js: several at once, N warnings is noise). */
export function familyOf(m) {
  if (!m || typeof m.arch !== 'string') return null;
  const a = m.arch, e = m.element;
  if (a === 'swarm') return null;
  if (a === 'snowman') return 'snowman';
  if (e === 'wind') return 'mummy';                       /* the Wind Dunes: every archetype a mummy */
  if (a === 'fodder') return e === 'flame' ? 'goblin' : 'slime';
  if (a === 'brute') return e === 'water' ? 'fishman' : e === 'venom' ? 'lurker' : 'rock';
  return null;
}

/* the tier a monster stands in: the Wheel's stamp, 1 without one (the first
   stretch, an old zone, a dungeon) */
export function moveTier(m) {
  const t = m && Number(m.tier);
  return Number.isFinite(t) && t >= 1 ? Math.min(8, Math.floor(t)) : 1;
}

/* a family's list as full moves (MOVE_DEFS + its overrides), every tier */
export function familyMoves(fam) {
  const list = own(FAMILY_MOVES, fam) ? FAMILY_MOVES[fam] : null;
  if (!list) return [];
  return list.map((e) => (e.move === 'enrage'
    ? { tier: e.tier, move: 'enrage', kind: 'enrage', name: e.name, flag: MONSTER_MOVES.ENRAGE.flag }
    : Object.assign({}, MOVE_DEFS[e.move], e, { kind: MOVE_DEFS[e.move].kind })));
}

/* the cache of each family's full list (built once: the table is frozen) */
const FULL = Object.create(null);
function fullMoves(fam) {
  if (!FULL[fam]) FULL[fam] = familyMoves(fam).sort((a, b) => b.tier - a.tier);
  return FULL[fam];
}

/* distance from (px, py) to the segment (ax, ay)-(bx, by) */
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
  let t = L2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / L2 : 0;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + dx * t - px, qy = ay + dy * t - py;
  return Math.sqrt(qx * qx + qy * qy);
}

export const monsterMoveMethods = {
  /* ── the switches ── */
  _monsterMovesOn() {
    const f = this._liveFlags;
    return !(f && typeof f === 'object' && own(f, 'monstermoves') && !f.monstermoves);
  },
  _moveKindOn(flag) {
    const f = this._liveFlags;
    return !(f && typeof f === 'object' && own(f, flag) && !f[flag]);
  },

  /* The moves this monster may use now: its family's, unlocked by its tier,
     each with its switch on -- the newest first.  `_kitFor`'s partner: the
     kits stay as they are (a brute's slam, a slime's lunge, a mummy's roar);
     these are on top, from tier 2. */
  _movesFor(m) {
    if (!m || !this._monsterMovesOn()) return [];
    const tier = moveTier(m);
    if (tier < 2) return [];
    const fam = familyOf(m);
    if (!fam) return [];
    return fullMoves(fam).filter((mv) => mv.tier <= tier && this._moveKindOn(mv.flag));
  },
  /* the move in flight's own numbers (null if its switch was thrown) */
  _moveInFlight(m) {
    if (!m || !m._mvKind) return null;
    return this._movesFor(m).find((mv) => mv.kind === m._mvKind) || null;
  },

  /* The stat step on a monster just built for tier `m.tier` (wheelzone.js
     after its stamp; the simulator the same).  Its HP and its hit, once. */
  _moveTierStep(m) {
    if (!m || m._mvStepped || !this._monsterMovesOn()) return m;
    const t = moveTier(m);
    if (t < 2) return m;
    const kh = 1 + MONSTER_MOVES.STEP.HP_K * (t - 1), kd = 1 + MONSTER_MOVES.STEP.DMG_K * (t - 1);
    m.maxHp = Math.max(1, Math.ceil(m.maxHp * kh));
    m.hp = m.maxHp;
    m.dmg = Math.max(1, Math.ceil(m.dmg * kd));
    m._mvStepped = true;
    return m;
  },

  /* ── enrage and the elder tiers' cooldowns ── */
  _monsterEnraged(m) {
    if (!m || !m.alive || !(m.maxHp > 0) || !(m.hp > 0)) return false;
    if (m.hp / m.maxHp >= MONSTER_MOVES.ENRAGE.HP_FRAC) return false;
    return this._movesFor(m).some((mv) => mv.kind === 'enrage');
  },
  /* what a cooldown is multiplied by: 1 below the elder tiers (and with the
     moves off), 0.8 in tiers 7-8, and enrage's 0.7 on top */
  _moveCdK(m) {
    if (!m || moveTier(m) < MONSTER_MOVES.ELDER_TIER || !this._monsterMovesOn()) return 1;
    return MONSTER_MOVES.ELDER_CD_K * (this._monsterEnraged(m) ? MONSTER_MOVES.ENRAGE.CD_K : 1);
  },
  /* a basic swing's or throw's cadence: faster when enraged (index.js) */
  _monsterSwingCd(m, base) {
    return this._monsterEnraged(m) ? Math.round(base * MONSTER_MOVES.ENRAGE.SWING_K) : base;
  },
  /* a special ended (a move here, a kit in telegraph.js): the next waits
     GAP_MS -- only for a monster with moves, so tier 1's kits keep exactly
     the rhythm they had */
  _noteSpecialEnded(m, now) {
    if (moveTier(m) >= 2 && this._movesFor(m).length) m._mvGapAt = now + MONSTER_MOVES.GAP_MS;
  },

  /* A fresh life: no move in flight, nothing cooling, not enraged (the
     respawn in index.js, beside the kit's own reset). */
  _clearMonsterMove(m) {
    m._mvKind = null; m._mvPhase = null; m._mvUntil = 0; m._mvTarget = null; m._mvAim = null;
    m._mvStep = 0; m._mvHit = null; m._mvBalls = null; m._mvDir = null; m._mvLeft = 0; m._mvHits = 0;
    m._mvCd = null; m._mvGapAt = 0; m._enrageCued = false;
  },
  /* a move ends: cooled, the gap, the basic cadence restarted (no free swing
     after a move, as after a kit) */
  _endMove(m, mv, now) {
    if (mv && m._mvCd) m._mvCd[mv.kind] = now + Math.round(mv.cooldownMs * this._moveCdK(m));
    m._mvKind = null; m._mvPhase = null; m._mvUntil = 0; m._mvTarget = null; m._mvAim = null;
    m._mvStep = 0; m._mvHit = null; m._mvBalls = null; m._mvDir = null; m._mvLeft = 0;
    this._noteSpecialEnded(m, now);
    m.atkCd = Math.max(m.atkCd || 0, now + this._monsterSwingCd(m, this.MONSTER_ATTACK_CD));
    m._attackingUntil = Math.max(m._attackingUntil || 0, now + 400);
  },

  /* Braced: winding up a move or between a combo's strikes, a monster is not
     shoved by a player's blow (combat.js) -- the warning is where it lands.
     A charge's dash and a volley's flight are not braced moments. */
  _moveBraced(m) {
    return !!(m && (m._mvPhase === 'windup' || m._mvPhase === 'strike'));
  },

  /* A parry breaks the move in flight (index.js _applyParry, its one hook):
     the rest of a combo or a two-step slam, a charge stopped dead on the
     shield.  Its full cooldown, as a parried kit's ("an instant retry would
     punish the parry").  Balls already thrown fly on. */
  _breakMove(m, now) {
    if (!m || !m._mvPhase || m._mvPhase === 'flight') return;
    this._endMove(m, this._moveInFlight(m), now);
    m._attackingUntil = 0;
  },

  /* ═══ START A MOVE ═══
     From the aggro branch, with a live target in hand, ABOVE the kits and the
     basic swing (index.js): a move outranks a kit, which outranks a jab.
     Returns true when one began. */
  _maybeStartMove(zoneId, m, nearest, now) {
    if (m._mvPhase || m._tgPhase || m._bwUntil) return false;
    /* the cheap refusals first: this runs every tick for every monster in a fight */
    if (m._mvCd && (now <= (m.atkCd || 0) || now < (m._mvGapAt || 0))) return false;
    const moves = this._movesFor(m);
    if (!moves.length) return false;
    if (!m._mvCd) {
      /* the first look at a fight: each move waits OPEN_K of its cooldown */
      m._mvCd = Object.create(null);
      for (const mv of moves) if (mv.cooldownMs) m._mvCd[mv.kind] = now + Math.round(mv.cooldownMs * MONSTER_MOVES.OPEN_K);
    }
    if (now <= (m.atkCd || 0) || now < (m._mvGapAt || 0)) return false;
    if (!nearest || nearest.extracting) return false;
    const ps = this.playerState[nearest.id];
    if (!ps || ps.dead || ps.dying || ps.z !== zoneId) return false;
    const d = Math.hypot(ps.x - m.x, ps.y - m.y);
    for (const mv of moves) {
      if (mv.kind === 'enrage') continue;
      if (now < (m._mvCd[mv.kind] || 0)) continue;
      if (d < mv.minR || d > mv.maxR) continue;
      return this._startMove(zoneId, m, mv, nearest.id, ps, now);
    }
    return false;
  },

  _startMove(zoneId, m, mv, pid, ps, now) {
    m._mvKind = mv.kind;
    m._mvPhase = 'windup';
    m._mvUntil = now + mv.windupMs;
    m._mvTarget = pid;
    m._mvStep = 0;
    m._mvHit = null;
    m._attackingUntil = Math.max(m._attackingUntil || 0, now + 100);
    if (typeof this._sigOnWindup === 'function') this._sigOnWindup(pid, m, now);   /* the reflex clock (botsig.js), as a kit's */
    const ex = { ms: mv.windupMs };   /* proto-ok: fixed-field payload struct */
    if (mv.kind === 'combo') {
      /* the whole combo drawn at once, round the monster (`follow`: the ring
         goes where it is shoved): the second strike is on the ground from
         the start, windup + gap ahead */
      m._mvAim = { x: m.x, y: m.y };   /* proto-ok: fixed-field point */
      ex.ms = mv.windupMs + mv.gapMs * (mv.strikes - 1);
      ex.radius = mv.radius; ex.n = mv.strikes; ex.gap = mv.gapMs; ex.follow = 1;
    } else if (mv.kind === 'stomp' || mv.kind === 'quake') {
      /* round the monster where it stands (an area's ring, telegraph.js
         v2.3.3634: what the ring shows is what it reaches) */
      m._mvAim = { x: m.x, y: m.y };   /* proto-ok: fixed-field point */
      ex.radius = mv.radius; ex.shape = 'ring';   /* a ring with the moves' dark edge (telegraphShapes.js) */
      if (mv.kind === 'stomp') { ex.ms = mv.windupMs + mv.gapMs; ex.shape = 'rings'; ex.r0 = mv.r0; ex.gap = mv.gapMs; }
    } else if (mv.kind === 'charge') {
      /* the lane: through its target and on past them */
      const dx = ps.x - m.x, dy = ps.y - m.y, d = Math.hypot(dx, dy) || 1;
      const len = Math.max(mv.minLen, Math.min(mv.maxLen, d + mv.past));
      const ux = dx / d, uy = dy / d;
      m._mvAim = { x: m.x, y: m.y };   /* proto-ok: fixed-field point */
      m._mvDir = { x: ux, y: uy };     /* proto-ok: fixed-field point */
      m._mvLeft = len;
      ex.shape = 'line'; ex.radius = mv.laneW; ex.w = mv.laneW;
      ex.bx = Math.round(m.x + ux * len); ex.by = Math.round(m.y + uy * len);
    } else if (mv.kind === 'volley') {
      /* the fan: its middle ball at its target's feet (no further than
         `reach`), the others `spread` either side */
      const dx = ps.x - m.x, dy = ps.y - m.y, d = Math.hypot(dx, dy) || 1;
      const reach = Math.min(mv.reach, d);
      const ang = Math.atan2(dy, dx);
      const balls = [];
      for (let i = 0; i < mv.n; i++) {
        const a = ang + (mv.n > 1 ? (i / (mv.n - 1) - 0.5) * mv.spread : 0);
        balls.push({ x: m.x + Math.cos(a) * reach, y: m.y + Math.sin(a) * reach });   /* proto-ok: fixed-field point */
      }
      m._mvAim = { x: m.x, y: m.y };   /* proto-ok: fixed-field point */
      m._mvBalls = balls;
      ex.shape = 'fan'; ex.radius = mv.ballR; ex.br = mv.ballR;
      ex.ang = Math.round(ang * 1000) / 1000; ex.span = mv.spread; ex.len = Math.round(reach); ex.n = mv.n;
    }
    ex.ax = Math.round(m._mvAim.x); ex.ay = Math.round(m._mvAim.y);
    this._monsterAbilityEvent(zoneId, m, mv.kind, 'telegraph', ex);
    return true;
  },

  /* ═══ RUN A MOVE IN FLIGHT ═══
     Called UNCONDITIONALLY before target acquisition, beside the kit's own
     resolve (index.js), for its reason: a player who runs away must not strand
     a move half done.  Returns true while it owns the monster this tick.
     Also where an elder monster's enrage is first announced. */
  _resolveMonsterMove(zoneId, m, now) {
    if (!m._enrageCued && moveTier(m) >= MONSTER_MOVES.ENRAGE.TIER && this._monsterEnraged(m)) {
      /* once a life: the phone pulses the body red while it lasts, worked out
         from the level and the bar it already has (src/game/monsterMoves.js),
         so a phone that comes along later sees it too; this is the moment */
      m._enrageCued = true;
      this._monsterAbilityEvent(zoneId, m, 'enrage', 'execute', {});
    }
    if (!m._mvPhase) return false;
    /* a slime swelling to go off (telegraph.js) has no move left in it; a
       stun (Shield Bash, a snow pile's bonk) breaks one, the balls of a
       volley already thrown excepted */
    if (m._burstUntil || !(m.hp > 0) || (m._stunUntil && now < m._stunUntil && m._mvPhase !== 'flight')) {
      this._endMove(m, this._moveInFlight(m), now);
      return false;
    }
    const mv = this._moveInFlight(m);
    if (!mv) {
      /* its switch was thrown mid-move: it ends quietly, never planted */
      const kind = m._mvKind;
      this._endMove(m, null, now);
      if (m._mvCd && kind) m._mvCd[kind] = now;
      return false;
    }
    if (m._mvPhase === 'dash') return this._dashTick(zoneId, m, mv, now);
    if (now < m._mvUntil) {
      m._attackingUntil = Math.max(m._attackingUntil || 0, now + 100);
      return true;
    }
    if (mv.kind === 'combo') return this._comboStrike(zoneId, m, mv, now);
    if (mv.kind === 'stomp' || mv.kind === 'quake') return this._ringStrike(zoneId, m, mv, now);
    if (mv.kind === 'charge') {
      m._mvPhase = 'dash';
      m._mvHit = [];
      m._mvUntil = now + Math.ceil(m._mvLeft / mv.pxPerS * 1000) + 200;   /* a cap, never reached on open ground */
      return this._dashTick(zoneId, m, mv, now);
    }
    if (mv.kind === 'volley') return this._volleyStep(zoneId, m, mv, now);
    this._endMove(m, mv, now);
    return false;
  },

  /* One player, by one move's row of the door.  `at` is where the blow comes
     from (a shield faces it, a rock is measured from it). */
  _moveHit(zoneId, m, mv, pid, at, mult) {
    return this._monsterHit({
      src: mv.row, zoneId, pid, m, mid: m.id, lvl: m.level,
      raw: Math.max(1, Math.ceil(m.dmg * (mult == null ? mv.dmgMult : mult))),
      at: { x: at.x, y: at.y },   /* proto-ok: fixed-field point */
      /* the tag gets the number past the phone's "no attacker near you"
         filter (hits.js v2.3.2235), which a volley's ball would fail */
      ability: mv.kind,
    });
  },
  /* who a ring/spot reaches: live, here, not a sparring clone, inside it,
     and not slipped by a roll or behind a rock (the door asks again; this is
     so the execute can say MISS, as a kit's does) */
  _moveReach(zoneId, m, mv, cx, cy, r, from, now) {
    const out = [];
    const r2 = r * r;
    for (const pid of Object.keys(this.playerState)) {
      const p = this.playerState[pid];
      if (!p || p.dead || p.dying || p.disconnected || p.z !== zoneId || p._spar) continue;
      const dx = p.x - cx, dy = p.y - cy;
      if (dx * dx + dy * dy > r2) continue;
      if (this._hitMissed(mv.row, zoneId, p, from, now)) continue;
      out.push(pid);
    }
    return out;
  },

  /* a combo's strike: everyone in the ring round the monster, where it
     stands NOW (the ring the phone draws follows it) */
  _comboStrike(zoneId, m, mv, now) {
    const at = { x: m.x, y: m.y };   /* proto-ok: fixed-field point */
    const reached = this._moveReach(zoneId, m, mv, at.x, at.y, mv.radius, at, now);
    for (const pid of reached) this._moveHit(zoneId, m, mv, pid, at);
    const step = ++m._mvStep;
    this._monsterAbilityEvent(zoneId, m, mv.kind, 'execute', { radius: mv.radius, hit: reached.length > 0, ax: Math.round(at.x), ay: Math.round(at.y), step });
    if (!m._mvPhase) return true;   /* a parry broke it (_breakMove) */
    if (step < mv.strikes) {
      m._mvPhase = 'strike';
      m._mvUntil = now + mv.gapMs;
      m._attackingUntil = Math.max(m._attackingUntil || 0, now + 100);
      return true;
    }
    this._endMove(m, mv, now);
    return true;
  },

  /* an area's ring round where the monster stood as it wound up: everyone in
     it (a two-step slam: the small ring, then the big one) */
  _ringStrike(zoneId, m, mv, now) {
    const two = mv.kind === 'stomp';
    const r = two && m._mvStep === 0 ? mv.r0 : mv.radius;
    const c = m._mvAim;
    const reached = this._moveReach(zoneId, m, mv, c.x, c.y, r, c, now);
    for (const pid of reached) this._moveHit(zoneId, m, mv, pid, c);
    const step = ++m._mvStep;
    this._monsterAbilityEvent(zoneId, m, mv.kind, 'execute', { radius: r, hit: reached.length > 0, ax: Math.round(c.x), ay: Math.round(c.y), step });
    if (!m._mvPhase) return true;   /* a parry broke it (_breakMove) */
    if (two && step < 2) {
      m._mvPhase = 'strike';
      m._mvUntil = now + mv.gapMs;
      m._attackingUntil = Math.max(m._attackingUntil || 0, now + 100);
      return true;
    }
    this._endMove(m, mv, now);
    return true;
  },

  /* a charge, one tick of it: along the lane drawn, never onto the safe
     ground, round no rock (slideMove: a rock ends it), hitting each player it
     passes within the lane once */
  _dashTick(zoneId, m, mv, now) {
    const step = Math.min(m._mvLeft, mv.pxPerS * (this.TICK_RATE / 1000));
    const d = m._mvDir;
    let ended = !(step > 0.5) || now >= m._mvUntil;
    if (!ended) {
      const nx = m.x + d.x * step, ny = m.y + d.y * step;
      if (zoneId === WHEEL_ZONE && this._wheelSafeAt && this._wheelSafeAt(nx, ny)) ended = true;
      else {
        const x0 = m.x, y0 = m.y;
        const mvTo = slideMove(zoneId, m.x, m.y, nx, ny);
        m.x = mvTo.x; m.y = mvTo.y;
        if (typeof this._keepMonsterIn === 'function') this._keepMonsterIn(zoneId, m);
        const moved = Math.hypot(m.x - x0, m.y - y0);
        m._mvLeft -= step;
        this._markMonsterDirty(zoneId, m.id);
        /* everyone on the stretch it just covered, once a charge */
        const at = { x: m.x, y: m.y };   /* proto-ok: fixed-field point */
        for (const pid of Object.keys(this.playerState)) {
          if (m._mvHit.includes(pid)) continue;
          const p = this.playerState[pid];
          if (!p || p.dead || p.dying || p.disconnected || p.z !== zoneId || p._spar) continue;
          if (segDist(p.x, p.y, x0, y0, m.x, m.y) > mv.laneW) continue;
          m._mvHit.push(pid);
          if (this._hitMissed(mv.row, zoneId, p, at, now)) continue;
          m._mvHits = (m._mvHits || 0) + 1;
          this._moveHit(zoneId, m, mv, pid, at);
          if (!m._mvPhase) break;   /* a parry stopped it dead (_breakMove) */
        }
        if (!m._mvPhase) {
          this._monsterAbilityEvent(zoneId, m, mv.kind, 'execute', { radius: mv.laneW, hit: true, ax: Math.round(m.x), ay: Math.round(m.y) });
          m._mvHits = 0;
          return true;
        }
        if (moved < step * 0.3 || m._mvLeft <= 0.5) ended = true;   /* a rock, or the lane's end */
      }
    }
    m._attackingUntil = Math.max(m._attackingUntil || 0, now + 100);
    if (!ended) return true;
    const hit = (m._mvHits || 0) > 0;
    m._mvHits = 0;
    this._monsterAbilityEvent(zoneId, m, mv.kind, 'execute', { radius: mv.laneW, hit, ax: Math.round(m.x), ay: Math.round(m.y) });
    this._endMove(m, mv, now);
    return true;
  },

  /* a volley: thrown when the wind-up ends (the release, with each ball's
     landing spot, so the phone flies them), landing travelMs later */
  _volleyStep(zoneId, m, mv, now) {
    if (m._mvPhase === 'windup') {
      m._mvPhase = 'flight';
      m._mvUntil = now + mv.travelMs;
      m._mvAim = { x: m.x, y: m.y };   /* proto-ok: fixed-field point (where they left his hand) */
      this._monsterAbilityEvent(zoneId, m, mv.kind, 'execute', {
        radius: mv.ballR, release: true, travelMs: mv.travelMs, ball: mv.ball || 'snowball',
        ax: Math.round(m.x), ay: Math.round(m.y),
        pts: m._mvBalls.map((b) => [Math.round(b.x), Math.round(b.y)]),
      });
      /* he stays planted while they fly (owned by the resolve above, like
         the wind-up): one thing at a time, and nothing else can start */
      return true;
    }
    /* landed: every player within ballR of each ball (a shield facing the
       thrower blocks it, as a snowball's) */
    const from = m._mvAim;
    for (const b of m._mvBalls || []) {
      const reached = this._moveReach(zoneId, m, mv, b.x, b.y, mv.ballR, from, now);
      for (const pid of reached) this._moveHit(zoneId, m, mv, pid, from);
    }
    this._endMove(m, mv, now);
    return false;
  },
};
