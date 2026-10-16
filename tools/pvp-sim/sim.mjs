/* ═══ v2.3.3260: THE FIGHT SIMULATOR -- TWO PLAYERS IN NO MAN'S LAND ═══
 * (docs/specs/pvp-fights.md has the study, the tables and the decisions)
 *
 * Two fighters on open ground in No man's land, stepped at 60 frames a second
 * the way a phone runs the game.  Everything that decides DAMAGE is the
 * worker's own code, called in-process on a real GameRoom:
 *   - every landed attack goes through GameRoom._resolvePvPAttack exactly as a
 *     `player_attack` would (range, arc, the lanes, the shield arc, the roll's
 *     i-frames, the worker's own roll of pvpbalance.js, _applyDamage: armour,
 *     rounding);
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
 * (CLIENT.mode 'new' is v2.3.3260's page, 'old' the page before it).  What a
 * PLAYER decides (where to stand, when to fire a special, when to roll or
 * eat) is the skill model (SKILL): the study's assumptions.
 *
 * v2.3.3262: the sword's opening lunge reaches players too (the press, the
 * dash, the worker's strike and its daze; docs/specs/pvp-lunge.md).  `TUNE.lunge`
 * false is the game before it; lunge.mjs measures it.
 *
 * v2.3.3264: the monster-only extras on players (server pvpextras.js) run
 * here through the worker's own code -- a parry staggers, a gem's ticks tick
 * -- and two that are NOT on players can be tried (whatIfs below: an ordinary
 * hit's knockback, the bow volley's burn).  lunge.mjs's LUNGE_SETTINGS takes
 * them: docs/specs/one-formula.md "Not on players yet" has the tables.
 *
 * Use it from matrix.mjs, food-one.mjs, food-both.mjs and lunge.mjs beside it, or:
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
import { PVP_LUNGE } from '../../server/src/pvplunge.js';   /* v2.3.3262 */
import { HIT_KNOCKBACK } from '../../server/src/combat.js';   /* v2.3.3264: the what-if shove */

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
/* v2.3.3262: the sword's opening lunge (game/abilities.js, BroTown's dash) */
const DASH_STEP = 26;             /* DASH_STEP_PX, a frame */
const DASH_STOP = 46;             /* DASH_STOP_PX: contact */
const DASH_REACH = 900;           /* DASH_MAX_REACH_PX: the travel cap */
const DASH_SPEED = 26 * 60 / 1000, DASH_SLOW = 3.0, DASH_WIN_MIN = 420;   /* dashWindowMs */
const DASH_WIN_MAX = Math.round(DASH_REACH / DASH_SPEED * DASH_SLOW) + 90;
const LUNGE_CD = 2500;            /* STAM_ABILITIES.sworddash.cooldownMs */
const REPRESS_MS = 120;           /* a press refused in a daze, pressed again after it (a person's second tap) */
/* v2.3.3264: the what-ifs' numbers, each the monster's: a shove's catch-up
   (index.js KB_RECOVER_PX_PER_TICK 1.1 a 22 ms tick, the debt capped at 60:
   combat.js), the volley's burn (bowVolley.js: a tick every 500 ms, the
   siblings of one volley within ~400 ms of the first) */
const KB_REPAY_PER_MS = 1.1 / 22, KB_DEBT_MAX = 60;
const BURN_EVERY_MS = 500, BURN_SAME_MS = 1000;

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
  /* v2.3.3264: nothing of the extras carries over from the fight before */
  ps._wst = null; ps._staggerUntil = 0; ps._dmgFromPlayer = null; ps._gustLeft = 0; ps._gustUntil = 0;
  ps._dazeUntil = 0; ps._dazeImmuneUntil = 0; ps._thornRecoilAt = 0;
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
  let dmg = 0, hit = false, main = null;
  for (const p of takeHits()) {
    if (p.target === tgt.id && p.attacker === att.id) { hit = true; dmg += p.dmgTaken; if (!main && !p.ability) main = p; }
  }
  if (main && main.dmgTaken > 0 && !main.blocked && !main.dodged) whatIfs(att, tgt, payload, main);
  return { hit, dmg };
}
/* v2.3.3264: every pvp_hit the worker just sent, carried out the way each
   page carries it out -- the target's HP; a shove the hit carries (`kb`: an
   ability's, src/game/elemHits.js applyHitShove: the target's page moves
   itself); and a parried blow's stagger on the one who threw it
   (gameEvents.js: the page refuses their swings, specials and abilities,
   combatHelpers.staggerRefused, as the worker refuses their claims).  A gem's
   ticks come the same way, from the worker's own clock (_tickPvpStatuses). */
function takeHits() {
  const out = [];
  for (const e of room.eventBuffer) {
    if (e.type !== 'pvp_hit') continue;
    const p = e.payload, tgt = F.by[p.target], att = F.by[p.attacker];
    if (!tgt) continue;
    out.push(p);
    if (p.blocked) tgt.stats.blocked = (tgt.stats.blocked || 0) + 1;
    if (p.parried && att) {
      att.staggerUntil = T + room.PARRY_STAGGER_MS;
      att.stats.staggered = (att.stats.staggered || 0) + 1;
    }
    const kb = p.kb;
    if (Array.isArray(kb) && kb.length === 2) shoveBy(tgt, kb[0], kb[1], false);
    if (p.dmgTaken > 0) {
      tgt.hp -= p.dmgTaken; tgt.taken += p.dmgTaken;
      if (att) {
        att.dealt += p.dmgTaken;
        if (p.ability === 'volley') att.stats.burnDmg = (att.stats.burnDmg || 0) + p.dmgTaken;
      }
      if (!F.firstHitAt) F.firstHitAt = T;
    }
  }
  room.eventBuffer.length = 0;
  return out;
}
function shoveBy(tgt, dx, dy, debt) {
  tgt.x += dx; tgt.y += dy;
  const len = Math.hypot(dx, dy);
  tgt.stats.shoved = (tgt.stats.shoved || 0) + len;
  /* the debt, capped at a special's shove (combat.js m._kbDebt) */
  if (debt) tgt.kbDebt = Math.min((tgt.kbDebt || 0) + len, KB_DEBT_MAX);
}
/* ═══ v2.3.3264: WHAT-IFS -- TWO MONSTER-ONLY EFFECTS, TRIED ON PLAYERS ═══
   Neither is in the game (docs/specs/one-formula.md "Not on players yet");
   both are the monster's own rule, carried out here on a claim that landed:
   - `shove`: the knockback an ordinary hit gives a monster (combat.js
     HIT_KNOCKBACK x the zone's depth: a special 60, a crit 45, else 30; a
     volley's first arrow only, as bowVolley.js volleyShoves), the page moving
     itself, and with `kbDebt` the catch-up a monster has (walked back off at
     KB_RECOVER_PX_PER_TICK extra while walking at whoever shoved you);
   - `burnTicks`: the volley's stuck arrows burning that many ordinary bow
     hits, 500 ms apart (the monster's four: projectiles.js), each the
     worker's own roll (_rollHit) through the pair's ordinary-hit lane, as a
     tick on a monster goes through its lane, landed through the one door
     (_strikePlayer: no shield, no roll -- the arrow is in you), `burnK` of
     it. */
function whatIfs(att, tgt, payload, main) {
  if (TUNE.shove && payload.noKb !== true) {
    const len = Math.min(200, (payload.special ? HIT_KNOCKBACK.special : main.isCrit ? HIT_KNOCKBACK.crit : HIT_KNOCKBACK.normal)
      * (room._depthK(WHEEL_ZONE, tgt.y) || 1));
    const a = angTo(att, tgt);
    shoveBy(tgt, Math.trunc(Math.cos(a) * len), Math.trunc(Math.sin(a) * len), TUNE.kbDebt);
  }
  if (TUNE.burnTicks > 0 && payload.kind === 'ranged' && payload.special && Math.floor(Number(payload.part)) >= 2) {
    const was = F.burns.get(att.id);
    if (!(was && T - was.t0 < BURN_SAME_MS)) F.burns.set(att.id, { att, tgt, t0: T, left: TUNE.burnTicks, next: T + BURN_EVERY_MS });
  }
}
/* the pair's ordinary-hit lane, as _resolvePvPAttack takes it */
function laneTake(att, tgt) {
  if (!room._pvpHitLanes) room._pvpHitLanes = new Map();
  const key = att.id + '>' + tgt.id;
  let lane = room._pvpHitLanes.get(key);
  if (!lane) { lane = { lastTs: 0, spStart: 0, spCount: 0 }; room._pvpHitLanes.set(key, lane); }
  if (Date.now() - lane.lastTs < room.PVP_TUNING.CADENCE_MS) return false;
  lane.lastTs = Date.now();
  return true;
}
function tickBurns() {
  for (const [k, b] of F.burns) {
    if (T < b.next) continue;
    b.next = T + BURN_EVERY_MS; b.left--;
    if (b.tgt.hp > 0 && laneTake(b.att, b.tgt)) {
      const r = room._rollHit(b.att.ps, 'ranged', false, { targetLevel: room._prog3OpponentLevel(b.tgt.ps) });
      room.eventBuffer.length = 0;
      room._strikePlayer(b.att.id, b.att.ps, b.tgt.id, b.tgt.ps, Math.max(1, Math.round(r.dmg * TUNE.burnK)),
        { slot: 'ranged', ability: 'volley', isCrit: r.isCrit, noBlock: true, fracture: true });
      takeHits();
    }
    if (b.left <= 0) F.burns.delete(k);
  }
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
   react/rollSigma  reaction time and its spread, ms
   dashAt     v2.3.3262, melee: the sword's opening lunge (sworddash) -- they
              press attack for it whenever it is ready and the other player
              is between dashAt[0] and dashAt[1] px: a careless player only
              when close enough to swing anyway, an average one from across a
              phone's half-screen, a skilled one on the whole screen and in
              contact too (a re-press lunges again, and dazes).  The one
              lunged at answers with the specials' habits (planDefence).
   lungeWaits v2.3.3262: holds the lunge while the other's big bolt or volley
              is in the air (no roll in a dash: it would run into it)
   v2.3.3267, a beginner's habits (the sparring clones' Easy, server/src/spar.js;
   absent on the three players below, so they fight exactly as before):
   special    null: never throws a special
   gapMs      waits this much longer than the weapon's cooldown between two
              swings or shots (slow to press again)
   aimSigma   aims each arrow and plain bolt this far off, radians (a normal
              spread): a shot off its line misses
   boltsStraight  a plain bolt keeps the line it left on, as a bolt does with
              no lock (projectiles.js: only a lock turns a bolt), riding the
              caster: a target that moves off the line is missed */
export const SKILL = {
  low: {
    focus: 0.65, holdAt: 140, sprint: false, lunge: false,
    band: { bow: [0, 280], staff: [0, 380] }, kite: 'none', strafe: 0,
    special: { melee: 120, bow: 420, staff: 600 }, specialMiss: 0.25,
    shieldSpecial: 0, rollSpecial: 0, rollSigma: 260, react: 450,
    eatBelow: 0.30, bagMs: 3000,
    dashAt: [60, 140], lungeWaits: false,
  },
  moderate: {
    focus: 0.85, holdAt: 48, sprint: true, lunge: true,
    band: { bow: [110, 280], staff: [130, 380] }, kite: 'shoot', strafe: 0.35,
    special: { melee: 60, bow: 320, staff: 450 }, specialMiss: 0.1,
    shieldSpecial: 0.35, rollSpecial: 0.25, rollSigma: 180, react: 320,
    eatBelow: 0.40, bagMs: 2000,
    dashAt: [60, 300], lungeWaits: true,
  },
  high: {
    focus: 0.97, holdAt: 45, sprint: true, lunge: true,
    band: { bow: [150, 300], staff: [180, 400] }, kite: 'smart', strafe: 0.7,
    /* v2.3.3262: melee 40 -> 50, the special's real reach (MELEE_CLAIM_RANGE):
       the lunge stops at 46 px, and a skilled sword throws the special from
       where it stops (40 left every lunge's follow-up to chance) */
    special: { melee: 50, bow: 320, staff: 450 }, specialMiss: 0.03,
    shieldSpecial: 0.7, rollSpecial: 0.5, rollSigma: 110, react: 250,
    eatBelow: 0.50, bagMs: 1300,
    dashAt: [0, 450], lungeWaits: true,
  },
};

/* ── which page: 'new' sends one sword claim a swing (with `sw`) and the
   specials' shapes; 'old' is the page as it was (a claim every frame) ── */
export const CLIENT = { mode: 'new' };
let SWSEQ = 0;

/* ── what-if knobs: all off = the game as it is today ── */
/* v2.3.3262: `lunge` false is the game before the sword's lunge reached
   players; `dazeMs` / `dazeImmuneMs` (null: the worker's PVP_LUNGE) try other
   lengths for its daze, through the worker's own code (below) */
/* v2.3.3264: the monster-only extras on players (server pvpextras.js).
   `extras` false is the game before them -- the worker's own kill switch,
   `pvpextras: false` in its live flags.  In a fight of two with no gems,
   points or abilities, what of them can change it is a parry's 1.5 s
   stagger; `parry` false takes it away, to see its share.
   The two that are NOT on players (whatIfs above): `shove` true tries an
   ordinary hit's knockback on them (`kbDebt` false without the catch-up),
   `burnTicks` N the volley's burn (4 is the monster's; `burnK` its share of
   an ordinary hit); `cadenceMs` the pair's ordinary-hit lane (the worker's
   PVP_TUNING.CADENCE_MS, 300; a monster's is 210) */
const TUNE0 = { manaStart: 1, noSpecials: false, meleeOneHit: false, specialMult: 1, hitCapFrac: 0, dmgScale: null, slowK: 1, slowMs: 0, holdMs: 0, holdImmuneMs: 2000,
  lunge: true, dazeMs: null, dazeImmuneMs: null, lungeCd: null, extras: true, parry: true, cadenceMs: null,
  shove: false, kbDebt: true, burnTicks: 0, burnK: 1 };
export const TUNE = Object.assign({}, TUNE0);
export function setTune(t) {
  Object.assign(TUNE, TUNE0, t || {});
  room.PVP_TUNING = Object.assign({}, Object.getPrototypeOf(room).PVP_TUNING, TUNE.dmgScale != null ? { DMG_SCALE: TUNE.dmgScale } : {},
    TUNE.cadenceMs != null ? { CADENCE_MS: TUNE.cadenceMs } : {});   /* v2.3.3264: the pair's ordinary-hit lane */
  /* v2.3.3264: the extras' switch is the worker's live flag (only `extras:
     false` writes it, so a caller's own flags stand) */
  const lf = Object.assign({}, room._liveFlags || {});
  if (TUNE.extras === false) lf.pvpextras = false; else delete lf.pvpextras;
  room._liveFlags = lf;
}
/* v2.3.3264: `parry` false: no block is a parry (it costs its stamina as
   any block does, and staggers nobody) -- the worker's own window, closed */
{
  const open = room._parryOpen;
  room._parryOpen = function (...a) { return TUNE.parry ? open.apply(this, a) : false; };
}
/* the daze a lunge puts on a player is the worker's (pvplunge.js
   _pvpLungeDaze); a tried length replaces only its two numbers */
{
  const real = room._pvpLungeDaze;
  room._pvpLungeDaze = function (tps, now) {
    if (TUNE.dazeMs == null && TUNE.dazeImmuneMs == null) return real.call(this, tps, now);
    const ms = TUNE.dazeMs != null ? TUNE.dazeMs : PVP_LUNGE.DAZE_MS;
    const imm = TUNE.dazeImmuneMs != null ? TUNE.dazeImmuneMs : PVP_LUNGE.IMMUNE_MS;
    if (!tps || !(ms > 0) || now < (tps._dazeImmuneUntil || 0)) return 0;
    tps._dazeUntil = now + ms; tps._dazeImmuneUntil = now + ms + imm;
    return ms;
  };
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
    shots: [], casts: [], stats: { swings: 0, shots: 0, specials: 0, specialsLanded: 0, specialDmg: 0, rolls: 0, rolledOff: 0, shields: 0, blocked: 0,
      lunges: 0, lungesLanded: 0, lungeDmg: 0, dazed: 0 },   /* v2.3.3262 */
    dash: null, lungeReadyAt: 0, dazeUntil: 0,               /* v2.3.3262 */
    staggerUntil: 0, kbDebt: 0,                              /* v2.3.3264 */
    startDelay: typeof spec.startDelay === "number" ? spec.startDelay : 0,
    pendingRoll: null, shield: null, pendingShield: null,
    hasShield: spec.shield !== false,
    /* spec.food = { key: 'cooked_fish_trout', n: 3, eatMs?: quick-eat time } */
    food: spec.food ? Object.assign({}, spec.food) : null, eating: null,
  };
}

/* v2.3.3262: dazed by a sword's lunge -- no walk, swing, shot, special,
   roll, lunge or shield raised (combatHelpers.dazeRefused, the auto-attack
   loop's isDazed; a swing or a shot already under way goes on) */
const dazed = (f) => T < (f.dazeUntil || 0);
/* v2.3.3264: staggered by a parry -- no swing, shot, special or lunge (the
   page's staggerRefused); the feet, the roll and the shield stay yours */
const staggered = (f) => T < (f.staggerUntil || 0);

function startRoll(f, ang, why) {
  if (f.roll || f.shield || f.ps.stamina < f.d.roll) return false;
  if (f.holdUntil && T < f.holdUntil) return false;
  if (dazed(f) || f.dash) return false;   /* v2.3.3262 */
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
  /* v2.3.3262: a lunge is seen leaving (its tumble is broadcast on the press)
     and answered like the rest of a volley -- in time only when the dash is
     longer than the reaction */
  if ((kind === 'volley' || kind === 'lunge') && sk.rollSpecial > 0 && rnd() < sk.rollSpecial) {
    o.pendingRoll = { at: T + react, ang: angTo(o, f) + (rnd() < 0.5 ? 1 : -1) * Math.PI / 2 };
    return 'roll';
  }
  return kind === 'big' && sk.rollSpecial > 0 && rnd() < sk.rollSpecial ? 'roll' : 'none';
}
function incomingSpecial(f, o) {
  if (o.dash) return true;   /* v2.3.3262: a lunge on its way */
  for (const s of o.shots) if (s.special && (s.kind === 'big' || s.kind === 'volley')) return true;
  return false;
}
function updateShield(f, o) {
  const ps = f.ps;
  /* v2.3.3262: a press refused in a daze ("Dazed!") is pressed again once
     it is over */
  if (f.pendingShield && T >= f.pendingShield.at && dazed(f)) f.pendingShield.at = f.dazeUntil + REPRESS_MS;
  if (f.pendingShield && T >= f.pendingShield.at) {
    f.pendingShield = null;
    if (!(ps._guardBrokenUntil && Date.now() < ps._guardBrokenUntil) && ps.stamina > 0 && !f.roll
        && !dazed(f) && !f.dash /* v2.3.3262: no guard raised in a daze */) {
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
  if (!food || food.n <= 0 || f.eating || f.roll || f.shield || f.dash) return;   /* v2.3.3262: + the dash */
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
  /* v2.3.3262: a dash runs to its strike; a daze decides nothing */
  if (f.dash) return;
  if (dazed(f)) { f.sprinting = false; return; }
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
      /* v2.3.3262: ...not in the instant a lunge arrives -- seen leaving at
         ~1,560 px/s, it is answered after a reaction (castLunge), as a
         walking sword's approach is not */
      if (d < 70 && f.ps.stamina >= 40 && !(T < (f.caughtUntil || 0))) startRoll(f, a + Math.PI, 'escape');
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
  /* v2.3.3262: the sword's opening lunge, pressed for when it is ready */
  if (f.style === 'melee' && canLunge(f, d)) castLunge(f, o, d);
}

/* ═══ v2.3.3262: THE SWORD'S OPENING LUNGE AT A PLAYER ═══
   The phone's half restated from the code: the press (maybeSwordDash ->
   castAbility) starts a dash at the locked player, 26 px a frame, re-aimed
   every frame, stopping at contact (BroTown's movement block); the strike
   goes out on arrival, or when the window or the 900 px of travel runs out.
   The worker's half is its own: _handleAbility -> pvplunge.js, which puts the
   swordsman at contact, lands the hit through _resolvePvPAttack and dazes. */
function lungeOn() { return TUNE.lunge && !room._pvpLungeOff(); }
function canLunge(f, d) {
  const at = f.sk.dashAt;
  return !!at && lungeOn() && f.engaged && !f.dash && !f.roll && !f.shield && !f.eating && !dazed(f) && !staggered(f)
    && T >= f.lungeReadyAt && d > at[0] && d <= at[1]
    /* an average or skilled player does not dash into a big bolt or a volley
       in the air (no roll mid-dash): they lunge once it has landed or passed */
    && !(f.sk.lungeWaits && incomingSpecial(f, f.foe));
}
function castLunge(f, o, d) {
  const gap = Math.max(0, d - DASH_STOP);
  const win = Math.min(DASH_WIN_MAX, Math.max(DASH_WIN_MIN, Math.round(gap / DASH_SPEED * DASH_SLOW) + 90));
  f.dash = { until: T + win, travelled: 0 };
  f.lungeReadyAt = T + (TUNE.lungeCd || LUNGE_CD);         /* castAbility stamps the cooldown on the press */
  f.swingTimer = T;                      /* ...and the swing clock: no ordinary swing on the way */
  f.sprinting = false; f.held = false;
  f.stats.lunges++;
  /* the one lunged at sees the tumble start (broadcast on the press,
     player_dodge) and can act on it after a reaction: a planned answer
     (planDefence), and the smart kite's escape roll no sooner */
  o.caughtUntil = T + Math.max(150, o.sk.react + gauss() * o.sk.rollSigma);
  planDefence(o, f, 'lunge');
}
/* one frame of the dash (BroTown: arrival is checked before the step) */
function stepDash(f, o) {
  const d = dist(f, o);
  if (d <= DASH_STOP || T > f.dash.until || f.dash.travelled >= DASH_REACH) { strikeLunge(f, o); return; }
  const step = Math.min(d - DASH_STOP, DASH_STEP);
  const a = angTo(f, o);
  f.x += Math.cos(a) * step; f.y += Math.sin(a) * step;
  f.dash.travelled += step;
}
function strikeLunge(f, o) {
  f.dash = null;
  f.ps.x = f.x; f.ps.y = f.y;            /* "say where you landed, then swing" (the arrival's move) */
  room.eventBuffer.length = 0;
  room._handleAbility(f.sess, { kind: 'sworddash', pid: o.id });
  /* the worker puts the swordsman at contact; the phone is there already */
  f.x = f.ps.x; f.y = f.ps.y;
  f.swingTimer = T; f.lungeReadyAt = T + (TUNE.lungeCd || LUNGE_CD);   /* applyAbilityStrike re-stamps both */
  let hit = null;
  for (const p of takeHits()) {   /* v2.3.3264: HP, blocks and a parry carried out there */
    if (!hit && p.attacker === f.id && p.target === o.id) hit = p;
  }
  if (!hit) return;
  if (hit.dmgTaken > 0) { f.stats.lungesLanded++; f.stats.lungeDmg += hit.dmgTaken; }
  /* the daze, carried out as the phone does (elemHits.js applyElemHit) */
  if (hit.st === 'daze' && hit.stMs > 0) {
    o.dazeUntil = Math.max(o.dazeUntil || 0, T + hit.stMs);
    o.stats.dazed++;
    o.sprinting = false;   /* a planned shield or roll waits for its end (REPRESS_MS) */
  }
}

function move(f, o) {
  if (dazed(f)) { f.sprinting = false; return; }   /* v2.3.3262: no walk */
  if (f.dash) { stepDash(f, o); return; }           /* v2.3.3262: the dash is the move */
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
  /* v2.3.3264: a shove is walked back off at extra pace while walking back
     toward whoever you fight, as a monster walks its off while it chases */
  if (spd > 0 && f.kbDebt > 0) {
    const c = Math.cos(f.mv.ang - angTo(f, o));
    if (c > 0) {
      const r = Math.min(f.kbDebt, KB_REPAY_PER_MS * FRAME) * c;
      f.x += Math.cos(f.mv.ang) * r; f.y += Math.sin(f.mv.ang) * r;
      f.kbDebt -= r;
      f.stats.repaid = (f.stats.repaid || 0) + r;
    }
  }
}

function useSpecial(f, o) {
  const sk = f.sk, d = dist(f, o);
  if (!f.engaged || f.roll || f.shield) return false;
  if (T - f.lastSwipe < SPECIAL_CD) return false;
  if (f.ps.mana < f.d.swipe) return false;
  if (TUNE.noSpecials) return false;
  if (!sk.special) return false;   /* v2.3.3267: a beginner throws none */
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
  if (dazed(f) || f.dash) return;   /* v2.3.3262: no swing, shot or special in a daze or a dash */
  if (staggered(f)) return;         /* v2.3.3264: nor in a parry's stagger */
  const d = dist(f, o);
  if (useSpecial(f, o)) return;
  if (!f.held) return;
  const gap = f.sk.gapMs || 0;   /* v2.3.3267: a beginner's slow re-press */
  if (f.style === 'melee') {
    if (!f.isSwinging && T - f.swingTimer >= SWING_CD + gap) {
      f.swingTimer = T; f.isSwinging = true; f.specialSwing = false; f.swingAt = T; f.swingSw = ++SWSEQ; f.stats.swings++;
    }
  } else {
    const cd = (f.style === 'bow' ? BOW_CD : STAFF_CD) + gap;
    if (T - f.swingTimer < cd) return;
    if (f.style === 'bow' && d > ARROW_RANGE) return;   /* the sight gate: no line, no arrow */
    f.swingTimer = T; f.stats.shots++;
    const dmg = Math.round(plainRoll(f.style, f.d.base));   /* monsterCombat: dmg: Math.round(pDmg) */
    /* v2.3.3267: a beginner's aim is off by a normal spread */
    const off = f.sk.aimSigma ? gauss() * f.sk.aimSigma : 0;
    if (f.style === 'bow') f.shots.push({ kind: 'arrow', at: T, line: { x: f.x, y: f.y, ang: angTo(f, o) + off }, x: null, y: null, travelled: 0, dmg, special: false, R: R_ARROW });
    else if (f.sk.boltsStraight) f.shots.push({ kind: 'bolt', straight: true, ang: angTo(f, o) + off, at: T, dist: 14, dmg, special: false, R: R_BOLT });
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
    /* v2.3.3260 page: a claim only while its own view has the target in
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
  /* v2.3.3264: a volley shoves once -- its first arrow to hit, the rest
     noKb (the page's volleyShoves, bowVolley.js), on a player as on a monster */
  const noKb = s.kind === 'volley' && s.cast && s.cast.shoved ? true : undefined;
  const r = landClaim(f, o, { kind: f.style === 'staff' ? 'staff' : 'ranged', x: f.x, y: f.y, angle: angTo(f, o), noKb,
    dmgBase: Math.max(1, tuneClaim(s.dmg, !!s.special, o)), critChance: 0, range: Math.min(940, Math.round(d + 60)), arc: 0.9,
    special: !!s.special, target: o.id, ts: Date.now(),
    orbs: s.kind === 'big' ? 3 : undefined, part: s.kind === 'volley' ? 3 : undefined });
  if (s.special && r.dmg > 0) { s.cast.landed = true; s.cast.dmg += r.dmg; f.stats.specialDmg += r.dmg; }
  if (s.kind === 'volley' && r.hit && s.cast) s.cast.shoved = true;
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
    } else if (s.straight) {
      /* v2.3.3267: a bolt with no lock keeps its line, riding the caster (the
         page's rule for every bolt: origin the caster, `dist` along `ang`) */
      const ax = f.x + Math.cos(s.ang) * s.dist, ay = f.y + Math.sin(s.ang) * s.dist;
      s.dist += BOLT_PX;
      const bx = f.x + Math.cos(s.ang) * s.dist, by = f.y + Math.sin(s.ang) * s.dist;
      if (segGap(o.x, o.y, ax, ay, bx, by) < s.R) { claimShot(f, o, s); continue; }
      if (s.dist > BOLT_RANGE) continue;
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
  room._pvpStPlayers && room._pvpStPlayers.clear();   /* v2.3.3264: no gem's tick from the fight before */
  const A = makeFighter('bp_a', specA, skillA, pa), B = makeFighter('bp_b', specB, skillB, pb);
  A.foe = B; B.foe = A;   /* v2.3.3262 */
  F = { firstHitAt: 0, start: T, by: { [A.id]: A, [B.id]: B }, burns: new Map() };
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
      if (f.pendingRoll && T >= f.pendingRoll.at && dazed(f)) f.pendingRoll.at = f.dazeUntil + REPRESS_MS;   /* v2.3.3262 */
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
      move(f, o);
      f.ps.x = f.x; f.ps.y = f.y; f.ps.dodging = !!f.roll;
      attack(f, o);
    }
    for (const [f, o] of order) { sweep(f, o); flyShots(f, o); }
    /* v2.3.3264: the worker's own clock on players, as tick.js runs it
       every tick (a gem's ticks), and the what-if burn's */
    room.eventBuffer.length = 0;
    room._tickPvpStatuses(Date.now());
    takeHits();
    tickBurns();
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
