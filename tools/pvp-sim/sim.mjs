/* ═══ v2.3.3258: THE FIGHT SIMULATOR -- TWO PLAYERS IN NO MAN'S LAND ═══
 * (docs/specs/pvp-fights.md has the study, the tables and the decisions)
 *
 * Two fighters on open ground in No man's land, stepped at 60 frames a second
 * the way a phone runs the game.  Everything that decides DAMAGE is the
 * worker's own code, called in-process on a real GameRoom:
 *   - every landed attack goes through GameRoom._resolvePvPAttack exactly as a
 *     `player_attack` would (range, arc, the lanes, the shield arc, the roll's
 *     i-frames, the worker's own roll of pvpbalance.js, _applyDamage: armour,
 *     the one cap, rounding);
 *   - stamina and mana refill through GameRoom._tickPlayerRegen every regen
 *     tick; specials and rolls are priced and paid by GameRoom._abilityCost /
 *     _handleAbilityUse (which opens the PvP special window);
 *   - HP, mana pools and block counts come from GameRoom._prog3Recompute (the
 *     one formula's health, oneformula.js), and each weapon's base hit from
 *     GameRoom._maxWeaponDmg;
 *   - a bite of food is the worker's (cooking.js _fishHealAmount, the
 *     one-bite clock _pvpHealWait).
 * What the PAGE decides is restated here from the game's code (cited per
 * line): what each attack claims, how often, how projectiles fly and hit
 * (CLIENT.mode 'new' is v2.3.3258's page, 'old' the page before it).  What a
 * PLAYER decides (where to stand, when to fire a special, when to roll or
 * eat) is the skill model (SKILL): the study's assumptions.
 *
 * Use it from matrix.mjs, food-one.mjs and food-both.mjs beside it, or:
 *   import { fight, describe, seed, setTune, room } from './sim.mjs';
 *   fight({ style: 'melee', L: 10, tm: 1.25, chest: 1, legs: 1 }, 'moderate',
 *         { style: 'bow', L: 10, tm: 1.25, chest: 1, legs: 1 }, 'moderate');
 * Live flags go on room._liveFlags (`oneformula: false` is the old world).
 * Deterministic: seed(n) seeds the sim's dice AND the worker's (Math.random),
 * and the worker's clock is the sim's (Date.now).  Node only; nothing here
 * runs in the game or the worker.
 */
import { GameRoom } from '../../server/src/index.js';
import { WHEEL_ZONE } from '../../server/src/wheelzone.js';
import { WHEEL_CENTRE } from '../../server/src/wheelspawns.js';
import { nmlLevelAt } from '../../server/src/nomansland.js';

/* ── determinism: one seeded generator for the sim AND the worker's own rolls ── */
let _s = 1;
export function seed(n) { _s = (n >>> 0) || 1; }
function rnd() {   /* mulberry32 */
  _s = (_s + 0x6D2B79F5) >>> 0;
  let t = _s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
Math.random = rnd;
const gauss = () => { let u = 0, v = 0; while (u === 0) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

/* ── the sim clock is the worker's clock ── */
let T = 1_800_000_000_000;
Date.now = () => Math.round(T);

/* ── the game's numbers (client side), each from the code ── */
const FRAME = 1000 / 60;
const WALK = 2.5;                 /* gameSystems SPEED: px a frame, 150 px/s */
const ATTACK_WALK = 0.5;          /* BroTown: "Auto-attack movement: 50% speed" */
const SPRINT_MULT = 1.33;         /* game/sprint.js */
const SPRINT_DRAIN = 11;          /* stamina a second */
const SPRINT_START = 5;
const ROLL_MS = 250;              /* dodge.js dodgeWindowMs at 0 points */
const ROLL_STEP = 6;              /* BroTown: 6 px a frame while rolling */
const SWING_CD = 600;             /* SWING_COOLDOWN */
const SWEEP_MS = 400;             /* monsterCombat: claims every frame while now - swingTimer < 400 */
const SWING_CLEAR_MS = 450;       /* isSwinging clears after 450 */
const BOW_CD = 600 * 0.825;       /* BOW_SWING_MULT */
const STAFF_CD = 600 + 300;       /* _staffCdExtra */
const SPECIAL_CD = 1500;          /* playerActions: now - _lastSwipe < 1500 */
const MELEE_CLAIM_RANGE = 50;     /* min(250, WEAPON_TYPES.greatsword.range 50 x 1 x depthK 1) */
const MELEE_ARC = Math.PI * 0.85; /* WEAPON_TYPES.greatsword.arc */
const ARROW_PX = 24;              /* projectiles ARROW_SPEED_PX, a frame */
const VOLLEY_PX = 24 * 0.7;       /* BOW_VOLLEY.SPEED_K */
const VOLLEY_GAP_MS = 200 * FRAME / VOLLEY_PX;   /* volleyDelayMs: GAP_PX 200 */
const BOLT_PX = 5;                /* staff bolt a frame */
const BOLT_RANGE = 675;           /* STAFF_RANGE_PX */
const ARROW_RANGE = 450;          /* the arrow plants at 675 px or near the screen's edge: ~half a phone's view */
const R_ARROW = 28.6, R_VOLLEY = 33, R_BOLT = 34, R_BIGBOLT = 51;   /* projectiles.js PvP radii */
const BIG_BAND = [0.3, 2.5];      /* STAFF_BIG_BOLT_BAND */
const BIG_ORBS = 3, STAFF_SPECIAL = 2, MELEE_BOW_SPECIAL = 3, VOLLEY_WORTH = 2, VOLLEY_N = 3;
const REGEN_MS = 680;             /* REGEN_TICKS 30 x the paced tick */

/* ── one room, two players, in No man's land ── */
function makeState() {
  const store = new Map();
  return { storage: { get: async (k) => store.get(k), put: async (k, v) => { store.set(k, v); }, list: async () => new Map(), delete: async (k) => { store.delete(k); } },
    getWebSockets: () => [], acceptWebSocket: () => {} };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
const fakeWs = () => ({ send() {}, close() {} });
export const room = new GameRoom(makeState(), mockEnv);
const IDS = ['bp_a', 'bp_b'];
for (const id of IDS) {
  const ws = fakeWs();
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, phrase: 'p-' + id, data: { x: 0, y: 0, z: 'town' } }));
}
clearInterval(room.tickInterval); room.tickInterval = null;
/* persistence and the wire are not part of a hit's damage: kept quiet so a
   run of thousands of fights does not pile up storage writes */
room._saveRpg = () => {}; room._saveRpgVitals = () => {}; room._saveRpgPools = () => {};
room._queuePlayerStateFlush = () => {};
room.stateHistory = {};            /* no rewind: the target is where it stands (rtt 0) */
const R0 = 9000;                   /* No man's land 5 -- the fight never drifts out of it */
const cx = WHEEL_CENTRE[0], cy = WHEEL_CENTRE[1];

const WEAPON = { melee: 'greatsword', bow: 'bow', staff: 'staff' };
const SLOT = { melee: 'weapon', bow: 'rangedWeapon', staff: 'staffWeapon' };
const CAT = { melee: 'sword', bow: 'bow', staff: 'staff' };
const ACTIVE = { melee: 'melee', bow: 'ranged', staff: 'staff' };

/* spec: { style, L (main skill), tm (weapon tier), chest (tm|null), legs (tm|null) } */
function dress(ps, spec) {
  for (const c of ['sword', 'bow', 'staff']) ps.prog3.sk[c].level = 1;
  ps.prog3.sk[CAT[spec.style]].level = spec.L;
  ps.weapon = ps.rangedWeapon = ps.staffWeapon = null;
  ps[SLOT[spec.style]] = { type: WEAPON[spec.style], name: spec.style, tierMult: spec.tm, quality: 'normal' };
  ps.activeSlot = ACTIVE[spec.style];
  ps.armor = spec.chest ? { name: 'Torso', mat: 'copper', tierMult: spec.chest, quality: 'normal' } : null;
  ps.legsArmor = spec.legs ? { name: 'Greaves', mat: 'copper', tierMult: spec.legs, quality: 'normal' } : null;
  ps.shield = spec.shield === false ? null : { name: 'Pine Shield', gearBase: 'wood', tierMult: 1.0 };
  room._prog3Recompute(ps);
  const out = {
    maxHp: ps.maxHp, maxMana: ps.maxMana, maxStamina: ps.maxStamina,
    base: room._maxWeaponDmg(ps, false),
    swipe: room._abilityCost(ps, 'swipe'), roll: room._abilityCost(ps, 'dodge'),
    armourCut: 1 - room._armorDrMult(ps),
  };
  ps.stamina = ps.maxStamina; ps.mana = Math.floor(ps.maxMana * TUNE.manaStart);
  ps.hp = 1e9;                     /* the worker's death path never runs: the sim keeps the real HP (maxHp stays real: the PvP cap reads it) */
  ps.z = WHEEL_ZONE; ps.dead = false; ps.dying = false; ps.disconnected = false;
  ps._zoneEntryGraceUntil = 0; ps.blocking = false; ps.dodging = false; ps.def = 0;
  ps.lastDamageAt = 0; ps._lastDealtAt = 0; ps._sprintAt = 0; ps._guardBrokenUntil = 0;
  ps._buffs = {}; ps._nml = null;
  return out;
}
export function describe(spec) { return dress(room.playerState.bp_a, spec); }

/* ── the client's damage rolls (gameSystems calcWeaponDmg / calcSpecialDmg) ── */
const U = (a, b) => a + rnd() * (b - a);
function plainRoll(style, base) {
  if (style === 'staff') return base * U(0.5, 1.65);
  if (style === 'bow') return base * U(0.6, 0.8);
  return base * U(0.75, 1.25);
}

/* ── the worker, called as a player_attack would call it ── */
function landClaim(att, tgt, payload) {
  room.eventBuffer.length = 0;
  room._resolvePvPAttack(att.sess, payload);
  let dmg = 0, hit = false;
  for (const e of room.eventBuffer) {
    if (e.type === 'pvp_hit' && e.payload.target === tgt.id) {
      hit = true; dmg += e.payload.dmgTaken;
      if (e.payload.blocked) tgt.stats.blocked = (tgt.stats.blocked || 0) + 1;
    }
  }
  room.eventBuffer.length = 0;
  if (hit && dmg > 0) {
    tgt.hp -= dmg; tgt.taken += dmg; att.dealt += dmg;
    if (!F.firstHitAt) F.firstHitAt = T;
  }
  return { hit, dmg };
}
/* The lane the worker keeps per pair -- read only to skip claims it would
   refuse anyway (the range and arc tests run first and touch nothing). */
function laneRefuses(att, tgt, special) {
  const lane = room._pvpHitLanes && room._pvpHitLanes.get(att.id + '>' + tgt.id);
  if (!lane) return false;
  const now = Date.now();
  if (special) return now - lane.spStart <= room.PVP_TUNING.SPECIAL_LANE_MS && lane.spCount >= room.PVP_TUNING.SPECIAL_LANE_MAX;
  return now - lane.lastTs < room.PVP_TUNING.CADENCE_MS;
}

/* ── geometry ── */
const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
function segGap(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  if (!(L > 0)) return Math.hypot(px - bx, py - by);
  let t = ((px - ax) * dx + (py - ay) * dy) / L; t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/* ═══ THE PLAYER: the study's assumptions ═══
   focus      share of half-second windows spent actually attacking when able
   holdAt     melee: holds the attack button from this far (it halves the chase)
   sprint     closes / escapes with the sprint
   lunge      melee: rolls in from 80-150 px (a 90 px gap-closer)
   band       ranged: [too close, too far] -- the distance they try to fight at
   kite       ranged: 'none' stands still, 'shoot' backs off while shooting
              (half speed), 'smart' stops shooting to retreat at full speed,
              sprints from a sprinting chaser, rolls away from contact
   strafe     sideways share of movement while trading shots (dodges arrows)
   special    the farthest they will throw a special from, by weapon
   shieldSpecial chance to raise the Pine Shield (every player has one, the
              tutorial's) against a big staff bolt / the rest of a volley; the
              shield blocks everything in its 120 degree arc, 10 stamina a
              blocked hit and 5 a regen tick held (index.js BLOCK_* )
   rollSpecial otherwise, chance to try to roll it (250 ms of i-frames)
   react/rollSigma  reaction time and its spread, ms */
export const SKILL = {
  low: {
    focus: 0.65, holdAt: 140, sprint: false, lunge: false,
    band: { bow: [0, 280], staff: [0, 380] }, kite: 'none', strafe: 0,
    special: { melee: 120, bow: 420, staff: 600 }, specialMiss: 0.25,
    shieldSpecial: 0, rollSpecial: 0, rollSigma: 260, react: 450,
    eatBelow: 0.30, bagMs: 3000,
  },
  moderate: {
    focus: 0.85, holdAt: 48, sprint: true, lunge: true,
    band: { bow: [110, 280], staff: [130, 380] }, kite: 'shoot', strafe: 0.35,
    special: { melee: 60, bow: 320, staff: 450 }, specialMiss: 0.1,
    shieldSpecial: 0.35, rollSpecial: 0.25, rollSigma: 180, react: 320,
    eatBelow: 0.40, bagMs: 2000,
  },
  high: {
    focus: 0.97, holdAt: 45, sprint: true, lunge: true,
    band: { bow: [150, 300], staff: [180, 400] }, kite: 'smart', strafe: 0.7,
    special: { melee: 40, bow: 320, staff: 450 }, specialMiss: 0.03,
    shieldSpecial: 0.7, rollSpecial: 0.5, rollSigma: 110, react: 250,
    eatBelow: 0.50, bagMs: 1300,
  },
};

/* ── which page: 'new' sends one sword claim a swing (with `sw`) and the
   specials' shapes; 'old' is the page as it was (a claim every frame) ── */
export const CLIENT = { mode: 'new' };
let SWSEQ = 0;

/* ── what-if knobs: all off = the game as it is today ── */
export const TUNE = { manaStart: 1, noSpecials: false, meleeOneHit: false, specialMult: 1, hitCapFrac: 0, dmgScale: null, slowK: 1, slowMs: 0, holdMs: 0, holdImmuneMs: 2000 };
export function setTune(t) {
  Object.assign(TUNE, { manaStart: 1, noSpecials: false, meleeOneHit: false, specialMult: 1, hitCapFrac: 0, dmgScale: null, slowK: 1, slowMs: 0, holdMs: 0, holdImmuneMs: 2000 }, t || {});
  room.PVP_TUNING = Object.assign({}, Object.getPrototypeOf(room).PVP_TUNING, TUNE.dmgScale != null ? { DMG_SCALE: TUNE.dmgScale } : {});
}
function tuneClaim(claim, special, tgt) {
  let c = claim * (special ? TUNE.specialMult : 1);
  if (TUNE.hitCapFrac > 0) c = Math.min(c, TUNE.hitCapFrac * tgt.d.maxHp / room.PVP_TUNING.DMG_SCALE);
  return c;
}

/* ── one fight ── */
let F = null;   /* the fight in progress (landClaim stamps its first hit) */
function makeFighter(id, spec, skill, place) {
  const ps = room.playerState[id];
  const d = dress(ps, spec);
  const sk = typeof skill === 'string' ? SKILL[skill] : skill;
  return {
    id, ps, spec, style: spec.style, sk, d,
    sess: { id, name: id, rtt: 0 },
    x: place.x, y: place.y, hp: d.maxHp, taken: 0, dealt: 0,
    swingTimer: -1e9, isSwinging: false, specialSwing: false, lastSwipe: -1e9,
    engaged: true, focusAt: 0, strafeDir: rnd() < 0.5 ? -1 : 1, strafeAt: 0,
    sprinting: false, roll: null, held: false,
    shots: [], casts: [], stats: { swings: 0, shots: 0, specials: 0, specialsLanded: 0, specialDmg: 0, rolls: 0, rolledOff: 0, shields: 0, blocked: 0 },
    startDelay: typeof spec.startDelay === "number" ? spec.startDelay : 0,
    pendingRoll: null, shield: null, pendingShield: null,
    hasShield: spec.shield !== false,
    /* spec.food = { key: 'cooked_fish_trout', n: 3, eatMs?: quick-eat time } */
    food: spec.food ? Object.assign({}, spec.food) : null, eating: null,
  };
}

function startRoll(f, ang, why) {
  if (f.roll || f.shield || f.ps.stamina < f.d.roll) return false;
  if (f.holdUntil && T < f.holdUntil) return false;
  { const s0 = f.ps.stamina; room._handleAbilityUse(f.sess, { type: 'dodge' }); if (!(f.ps.stamina < s0)) return false; }
  f.roll = { ang, until: T + ROLL_MS };
  f.sprinting = false;
  f.stats.rolls++;
  if (why === 'special') f.stats.rolledOff++;
  return true;
}

/* A defender sees a special coming and answers it: the shield if they have the
   habit and the stamina, else perhaps a roll.  `lead` is how long they have
   before it lands, ms (a volley's later arrows: about 200 ms apart). */
function planDefence(o, f, kind) {
  if (o.shield || o.pendingShield) return 'shield';
  /* a sword toe to toe keeps swinging: the shield would hand back the contact it worked for */
  if (o.style === 'melee' && dist(o, f) < 90) return 'none';
  const sk = o.sk;
  const react = Math.max(150, sk.react + gauss() * sk.rollSigma);
  if (o.hasShield && sk.shieldSpecial > 0 && rnd() < sk.shieldSpecial && o.ps.stamina >= 15
      && !(o.ps._guardBrokenUntil && Date.now() < o.ps._guardBrokenUntil)) {
    o.pendingShield = { at: T + react, from: f };
    return 'shield';
  }
  if (kind === 'volley' && sk.rollSpecial > 0 && rnd() < sk.rollSpecial) {
    o.pendingRoll = { at: T + react, ang: angTo(o, f) + (rnd() < 0.5 ? 1 : -1) * Math.PI / 2 };
    return 'roll';
  }
  return kind === 'big' && sk.rollSpecial > 0 && rnd() < sk.rollSpecial ? 'roll' : 'none';
}
function incomingSpecial(f, o) {
  for (const s of o.shots) if (s.special && (s.kind === 'big' || s.kind === 'volley')) return true;
  return false;
}
function updateShield(f, o) {
  const ps = f.ps;
  if (f.pendingShield && T >= f.pendingShield.at) {
    f.pendingShield = null;
    if (!(ps._guardBrokenUntil && Date.now() < ps._guardBrokenUntil) && ps.stamina > 0 && !f.roll) {
      f.shield = { since: T, until: T + 400 };
      f.sprinting = false;
      f.stats.shields = (f.stats.shields || 0) + 1;
      ps.blocking = true; ps.blockStartT = Date.now();
    }
  }
  if (f.shield) {
    if (incomingSpecial(f, o)) f.shield.until = Math.max(f.shield.until, T + 120);
    /* the worker drops it at zero stamina (guard break) */
    if (!ps.blocking || T > f.shield.until || T - f.shield.since > 2500) { f.shield = null; ps.blocking = false; ps.blockStartT = 0; }
    else ps.ba = angTo(f, o);
  } else ps.blocking = false;
}

/* Eating mid-fight: open the bag, tap the fish, tap Eat (ItemDetailPopup) --
   `bagMs` with nothing else done -- then eat_request, which the worker
   settles with its own one-bite-in-15-s clock (cooking.js _pvpHealWait). */
function tryEat(f) {
  const food = f.food;
  if (!food || food.n <= 0 || f.eating || f.roll || f.shield) return;
  if (f.hp > f.d.maxHp * f.sk.eatBelow) return;
  if (room._pvpHealWait(f.id, f.ps, Date.now()) > 0) return;   /* the page knows the wait too (fightFood.js) */
  f.eating = { until: T + (food.eatMs != null ? food.eatMs : f.sk.bagMs) };
  f.sprinting = false; f.held = false;
  f.stats.eatTries = (f.stats.eatTries || 0) + 1;
}
function finishEat(f) {
  if (!f.eating || T < f.eating.until) return;
  f.eating = null;
  if (room._pvpHealWait(f.id, f.ps, Date.now()) > 0) { f.stats.eatRefused = (f.stats.eatRefused || 0) + 1; return; }
  /* the worker's own heal, the same in any fight (cooking.js, the one formula) */
  const heal = Math.ceil(room._fishHealAmount(f.food.key)) + room._recoveryFlat(f.ps);
  room._noteInstantHeal(f.id);
  f.food.n -= 1;
  const before = f.hp;
  f.hp = Math.min(f.d.maxHp, f.hp + heal);
  f.stats.eaten = (f.stats.eaten || 0) + 1;
  f.stats.healed = (f.stats.healed || 0) + (f.hp - before);
}

function think(f, o) {
  const sk = f.sk, d = dist(f, o), a = angTo(f, o);
  if (T >= f.focusAt) { f.engaged = rnd() < sk.focus; f.focusAt = T + 500; }
  if (T >= f.strafeAt) { f.strafeDir = -f.strafeDir; f.strafeAt = T + 600 + rnd() * 700; }
  let mv = { ang: a, k: 0 }, hold = false, sprint = false;
  if (f.style === 'melee') {
    hold = f.engaged && d <= sk.holdAt;
    if (d > 28) mv = { ang: a, k: 1 };
    /* chase at full speed (attack released), sprinting from further off */
    sprint = sk.sprint && !hold && d > 70 && f.ps.stamina > 25;
    if (sk.lunge && !f.roll && d > 80 && d < 150 && f.ps.stamina >= 40 && f.engaged) startRoll(f, a, 'lunge');
  } else {
    const [lo, hi] = sk.band[f.style];
    const range = f.style === 'bow' ? ARROW_RANGE : BOLT_RANGE;
    const side = a + f.strafeDir * Math.PI / 2;
    if (d > Math.min(hi, range)) { mv = { ang: a, k: 1 }; hold = false; }
    else if (d < lo && sk.kite === 'smart') {
      /* stop shooting and get the distance back */
      mv = { ang: a + Math.PI, k: 1 }; hold = false;
      sprint = sk.sprint && o.sprinting && f.ps.stamina > 20;
      if (d < 70 && f.ps.stamina >= 40) startRoll(f, a + Math.PI, 'escape');
    } else if (d < lo && sk.kite === 'shoot') {
      mv = { ang: a + Math.PI, k: 1 }; hold = f.engaged;
    } else {
      hold = f.engaged;
      /* trading shots: drift sideways by `strafe` */
      const s = sk.strafe;
      mv = s > 0 ? { ang: Math.atan2(Math.sin(side) * s, Math.cos(side) * s), k: s } : { ang: a, k: 0 };
    }
  }
  if (f.shield) hold = false;          /* attacking would drop it (playerActions dropShield) */
  f.held = hold;
  f.mv = mv;
  /* sprint: SPRINT_START to begin, ends on an attack, at zero, or with a roll */
  if (sprint && !hold && !f.roll && (f.sprinting || f.ps.stamina >= SPRINT_START)) f.sprinting = true; else f.sprinting = false;
}

function move(f) {
  if (f.holdUntil && T < f.holdUntil) { f.sprinting = false; return; }
  if (f.roll) {
    f.x += Math.cos(f.roll.ang) * ROLL_STEP; f.y += Math.sin(f.roll.ang) * ROLL_STEP;
    if (T >= f.roll.until) f.roll = null;
    return;
  }
  let spd = WALK * (f.held ? ATTACK_WALK : 1) * (f.sprinting ? SPRINT_MULT : 1) * (f.shield ? 0.5 : 1) * (f.mv ? f.mv.k : 0)
    * (f.slowUntil && T < f.slowUntil ? TUNE.slowK : 1);
  if (f.sprinting) {
    f.ps.stamina = Math.max(0, f.ps.stamina - SPRINT_DRAIN / 60);
    f.ps._sprintAt = Date.now();               /* holds the worker's regen (sprint.js REGEN_PAUSE_MS) */
    if (f.ps.stamina <= 0) f.sprinting = false;
  }
  if (spd > 0) { f.x += Math.cos(f.mv.ang) * spd; f.y += Math.sin(f.mv.ang) * spd; }
}

function useSpecial(f, o) {
  const sk = f.sk, d = dist(f, o);
  if (!f.engaged || f.roll || f.shield) return false;
  if (T - f.lastSwipe < SPECIAL_CD) return false;
  if (f.ps.mana < f.d.swipe) return false;
  if (TUNE.noSpecials) return false;
  const reach = sk.special[f.style];
  /* a careless player fires now and then from too far (specialMiss) */
  if (d > reach && !(rnd() < sk.specialMiss / 30)) return false;
  if (f.style !== 'melee' && d > (f.style === 'bow' ? ARROW_RANGE : BOLT_RANGE)) return false;
  {
    const m0 = f.ps.mana;
    room._handleAbilityUse(f.sess, { type: 'swipe' });   /* the worker charges it and opens the PvP special window */
    if (!(f.ps.mana < m0)) return false;
  }
  f.lastSwipe = T; f.swingTimer = T;            /* playerActions: the special spends the swing clock */
  f.stats.specials++;
  const cast = { landed: false, dmg: 0 };
  f.casts.push(cast);
  const a = angTo(f, o);
  if (f.style === 'melee') {
    f.isSwinging = true; f.specialSwing = true; f.swingAt = T; f.swingSw = ++SWSEQ; f.swingCast = cast;
  } else if (f.style === 'bow') {
    /* calcSpecialDmg (bow band) x 3, then two-thirds an arrow, one roll for the volley */
    const full = Math.round(plainRoll('bow', f.d.base) * MELEE_BOW_SPECIAL);
    const each = Math.max(1, Math.round(full * VOLLEY_WORTH / VOLLEY_N));
    const line = { x: f.x, y: f.y, ang: a };
    for (let i = 0; i < VOLLEY_N; i++) {
      f.shots.push({ kind: 'volley', at: T + i * VOLLEY_GAP_MS, line, x: null, y: null, travelled: 0, dmg: each, special: true, R: R_VOLLEY, i, cast });
    }
  } else {
    const dmg = Math.round(f.d.base * U(BIG_BAND[0], BIG_BAND[1]) * STAFF_SPECIAL * BIG_ORBS);
    f.shots.push({ kind: 'big', at: T, dist: 14, dmg, special: true, R: R_BIGBOLT, rollAt: null, cast });
  }
  return true;
}

function attack(f, o) {
  if (f.roll || f.shield) return;
  const d = dist(f, o);
  if (useSpecial(f, o)) return;
  if (!f.held) return;
  if (f.style === 'melee') {
    if (!f.isSwinging && T - f.swingTimer >= SWING_CD) {
      f.swingTimer = T; f.isSwinging = true; f.specialSwing = false; f.swingAt = T; f.swingSw = ++SWSEQ; f.stats.swings++;
    }
  } else {
    const cd = f.style === 'bow' ? BOW_CD : STAFF_CD;
    if (T - f.swingTimer < cd) return;
    if (f.style === 'bow' && d > ARROW_RANGE) return;   /* the sight gate: no line, no arrow */
    f.swingTimer = T; f.stats.shots++;
    const dmg = Math.round(plainRoll(f.style, f.d.base));   /* monsterCombat: dmg: Math.round(pDmg) */
    if (f.style === 'bow') f.shots.push({ kind: 'arrow', at: T, line: { x: f.x, y: f.y, ang: angTo(f, o) }, x: null, y: null, travelled: 0, dmg, special: false, R: R_ARROW });
    else f.shots.push({ kind: 'bolt', at: T, dist: 14, dmg, special: false, R: R_BOLT });
  }
}

/* the melee sweep: a claim every frame for 400 ms (monsterCombat §19) */
function sweep(f, o) {
  if (!f.isSwinging) return;
  const age = T - f.swingAt;
  if (age >= SWING_CLEAR_MS) { f.isSwinging = false; f.specialSwing = false; return; }
  if (age >= SWEEP_MS) return;
  let r;
  if (CLIENT.mode === 'new') {
    /* v2.3.3258 page: a claim only while its own view has the target in
       reach, at most at 0 / 90 / 180 ms of the sweep, each saying its swing */
    if (f.swingLanded === f.swingAt) return;
    if (!(f.claimsAt && f.claimsAt.sw === f.swingSw)) f.claimsAt = { sw: f.swingSw, n: 0, next: f.swingAt };
    if (f.claimsAt.n >= 3 || T < f.claimsAt.next) return;
    if (dist(f, o) > MELEE_CLAIM_RANGE) return;
    f.claimsAt.n++; f.claimsAt.next = T + 90;
    r = landClaim(f, o, { kind: 'melee', x: f.x, y: f.y, angle: angTo(f, o), dmgBase: plainRoll('melee', f.d.base) * (f.specialSwing ? MELEE_BOW_SPECIAL : 1),
      critChance: 1, range: MELEE_CLAIM_RANGE, arc: MELEE_ARC, sw: f.swingSw, special: f.specialSwing || undefined, ts: Date.now() });
  } else {
    if (laneRefuses(f, o, false)) return;
    if (TUNE.meleeOneHit && f.swingLanded === f.swingAt) return;
    const claim = tuneClaim(plainRoll('melee', f.d.base) * (f.specialSwing ? MELEE_BOW_SPECIAL : 1), f.specialSwing, o);
    r = landClaim(f, o, { kind: 'melee', x: f.x, y: f.y, angle: angTo(f, o), dmgBase: claim,
      critChance: 0.01, range: MELEE_CLAIM_RANGE, arc: MELEE_ARC, ts: Date.now() });
  }
  if (r.hit) f.swingLanded = f.swingAt;
  if (r.hit && TUNE.slowMs > 0) o.slowUntil = T + TUNE.slowMs;
  /* the sword's special pins its target: no walking, no rolling */
  if (r.dmg > 0 && f.specialSwing && TUNE.holdMs > 0 && !(o.holdImmuneUntil > T)) {
    o.holdUntil = T + TUNE.holdMs; o.holdImmuneUntil = T + TUNE.holdMs + TUNE.holdImmuneMs; o.roll = null;
  }
  if (f.specialSwing && r.dmg > 0) { f.swingCast.landed = true; f.swingCast.dmg += r.dmg; f.stats.specialDmg += r.dmg; }
}

function claimShot(f, o, s) {
  const d = dist(f, o);
  const r = landClaim(f, o, { kind: f.style === 'staff' ? 'staff' : 'ranged', x: f.x, y: f.y, angle: angTo(f, o),
    dmgBase: Math.max(1, tuneClaim(s.dmg, !!s.special, o)), critChance: 0, range: Math.min(940, Math.round(d + 60)), arc: 0.9,
    special: !!s.special, target: o.id, ts: Date.now(),
    orbs: s.kind === 'big' ? 3 : undefined, part: s.kind === 'volley' ? 3 : undefined });
  if (s.special && r.dmg > 0) { s.cast.landed = true; s.cast.dmg += r.dmg; f.stats.specialDmg += r.dmg; }
  return r;
}

function flyShots(f, o) {
  const keep = [];
  for (const s of f.shots) {
    if (T < s.at) { keep.push(s); continue; }
    if (s.kind === 'arrow' || s.kind === 'volley') {
      if (s.x == null) { s.x = s.line.x; s.y = s.line.y; }
      const step = s.kind === 'arrow' ? ARROW_PX : VOLLEY_PX;
      const ax = s.x, ay = s.y;
      s.x += Math.cos(s.line.ang) * step; s.y += Math.sin(s.line.ang) * step; s.travelled += step;
      if (segGap(o.x, o.y, ax, ay, s.x, s.y) < s.R) {
        const r = claimShot(f, o, s);
        /* hit by the first arrow of a volley: a quick player rolls off its line */
        if (s.kind === 'volley' && s.i === 0 && r.hit) planDefence(o, f, 'volley');
        continue;
      }
      if (s.travelled > ARROW_RANGE) continue;
      keep.push(s);
    } else {
      /* a staff bolt rides the caster and turns to the locked target every
         frame (projectiles.js: !a.isStaff keeps the line, so magic re-aims) */
      s.dist += BOLT_PX;
      const gap = dist(f, o) - s.R;
      if (s.kind === 'big') {
        if (s.rollAt == null) {
          /* decided once, when it is seen leaving */
          const plan = planDefence(o, f, 'big');
          s.rollTry = plan === 'roll';
          s.rollAt = 125 + gauss() * o.sk.rollSigma;   /* ms before impact the roll starts */
        }
        const eta = (gap - s.dist) / BOLT_PX * FRAME;
        if (s.rollTry && !o.roll && eta <= s.rollAt) { startRoll(o, angTo(f, o) + Math.PI / 2, 'special'); s.rollTry = false; }
      }
      if (s.dist >= gap) { claimShot(f, o, s); continue; }
      if (s.dist > BOLT_RANGE) continue;
      keep.push(s);
    }
  }
  f.shots = keep;
}

export function fight(specA, skillA, specB, skillB, opts = {}) {
  const gap0 = opts.gap0 || 350;
  const theta = rnd() * Math.PI * 2;
  const pa = { x: cx + R0 * Math.cos(theta), y: cy + R0 * Math.sin(theta) };
  const pb = { x: pa.x + gap0, y: pa.y };
  room._pvpHitLanes && room._pvpHitLanes.clear();
  const A = makeFighter('bp_a', specA, skillA, pa), B = makeFighter('bp_b', specB, skillB, pb);
  F = { firstHitAt: 0, start: T };
  const maxMs = opts.maxMs || 120000;
  let nextRegen = T + rnd() * REGEN_MS;
  const both = [A, B];
  while (T - F.start < maxMs) {
    T += FRAME;
    for (const f of both) {
      f.ps.x = f.x; f.ps.y = f.y;
      f.ps.dodging = !!f.roll;
    }
    const order = rnd() < 0.5 ? [[A, B], [B, A]] : [[B, A], [A, B]];
    for (const [f, o] of order) {
      if (T - F.start < f.startDelay) continue;
      if (f.pendingRoll && T >= f.pendingRoll.at) { startRoll(f, f.pendingRoll.ang, 'special'); f.pendingRoll = null; }
      updateShield(f, o);
      finishEat(f);
      if (f.hp > 0) tryEat(f);
      if (f.eating) {
        /* the right thumb is in the bag; with food.move the left one keeps
           backing away (no attacking either way) */
        if (f.food && f.food.move) {
          const a = angTo(o, f);
          f.x += Math.cos(a) * WALK; f.y += Math.sin(a) * WALK;
        }
        f.ps.x = f.x; f.ps.y = f.y; continue;
      }
      think(f, o);
      move(f);
      f.ps.x = f.x; f.ps.y = f.y; f.ps.dodging = !!f.roll;
      attack(f, o);
    }
    for (const [f, o] of order) { sweep(f, o); flyShots(f, o); }
    if (T >= nextRegen) {
      nextRegen += REGEN_MS;
      room._tickPlayerRegen();
      /* the out-of-combat HP trickle (index.js SPOKE_REGEN_*), on the sim's HP */
      for (const f of both) {
        const now = Date.now();
        if (f.hp < f.d.maxHp && now - (f.ps.lastDamageAt || 0) > 6000 && now - (f.ps._lastDealtAt || 0) > 6000) {
          f.hp = Math.min(f.d.maxHp, f.hp + Math.max(1, Math.round(f.d.maxHp * 0.01)));
        }
      }
    }
    if (opts.onFrame) opts.onFrame(A, B, T - F.start);
    if (A.hp <= 0 || B.hp <= 0) break;
    if (opts.checkNml && (nmlLevelAt(WHEEL_ZONE, A.x, A.y) < 1 || nmlLevelAt(WHEEL_ZONE, B.x, B.y) < 1)) throw new Error('left NML');
  }
  for (const f of both) f.stats.specialsLanded = f.casts.filter((c) => c.landed).length;
  const t = T - F.start;
  const winner = A.hp <= 0 && B.hp <= 0 ? 'both' : A.hp <= 0 ? 'B' : B.hp <= 0 ? 'A' : 'none';
  /* leave a gap on the clock so no lane, skull or regen stamp carries over */
  T += 60000;
  return {
    winner, ms: t, fromFirstHit: F.firstHitAt ? (T - 60000) - F.firstHitAt : null,
    A: { hp: A.hp, maxHp: A.d.maxHp, dealt: A.dealt, stats: A.stats },
    B: { hp: B.hp, maxHp: B.d.maxHp, dealt: B.dealt, stats: B.stats },
  };
}
