/* ═══ v2.3.3265: SPARRING CLONES -- A FIGHT WITH YOURSELF, FROM THE TEST PANEL ═══
 *
 * Owner, 2026-10-15: "I wish I could test PvP somehow. Can you make a special
 * environment where I can go to attack clones of myself using different
 * weapons and you just have them attack me using AI? Purely for testing
 * purposes. Maybe this is better to add to the admin window".
 *
 * WHAT IT IS.  The test panel (src/ui/panels/DevPanel.jsx; the admin key's,
 * like every /dev/ op in devtools.js) brings up to SPAR.MAX clones beside you
 * in the Wheel -- a sword, a bow, a staff, in any mix.  A clone is a PLAYER to
 * the room: a playerState entry the tick draws on every phone near it, with
 * your look, your level, your points and your armour, and its own weapon (the
 * one you carry for that slot, gems and all, else the tutorial's).  An AI here
 * on the worker moves it and fights you with it.  Every blow between you and
 * a clone, either way, goes through the room's own doors for a fight between
 * players -- combat.js _resolvePvPAttack (the worker's roll, the shield and
 * its parry, the roll's i-frames, armour, the extras of pvpextras.js),
 * abilities.js for the sword's lunge (pvplunge.js) and the specials' mana and
 * the rolls' stamina (index.js _handleAbilityUse) -- so what you test is PvP
 * itself, not a copy of it.  On your screen a clone's swings, shots, rolls,
 * dashes and raised shield arrive as the relays a real player's page sends
 * (player_swing, player_projectile, player_dodge, player_shield), so they are
 * drawn by the same code.
 *
 * THE AI is the fight simulator's player (tools/pvp-sim/sim.mjs, the study of
 * docs/specs/pvp-fights.md), moved here and stepped on the room's clock: when
 * a careless, an average or a skilled player attacks, keeps their distance,
 * strafes, rolls, raises the shield against a special, throws a special, and
 * (a sword) lunges -- SPAR_SKILLS below, the sim's SKILL table under the
 * panel's names.  Plus a DUMMY that stands still and never attacks, to read
 * your own numbers on.  The page's half of a player's fight (how far and how
 * often each weapon claims, how its shots fly) is the sim's too, cited there
 * from the game's code.
 *
 * NOBODY ELSE IS IN IT.  A clone may fight its owner and nobody else, either
 * way (_sparPair, asked first by index.js _pvpAllowed), and no monster sees
 * one (index.js _tickMonsters, _telegraphHitPlayer, firetrail.js,
 * monsterstatus.js _shockArcs).  No man's land never applies between you and a
 * clone (nomansland.js _nmlAllowed): no skull, no loss.
 *
 * NOTHING IS KEPT, NOTHING IS LOST.  A clone has no socket, no record and no
 * bag: persistence.js _saveRpg never writes one; it drops nothing and takes
 * nothing.  When you knock one out it is down SPAR.RESPAWN_MS and stands up
 * beside you again.  When one knocks YOU out it is not a death (_sparDeath):
 * no death screen, no trip to town, no pile, no bag lost -- you are healed
 * where you stand, the clones step back and heal too, and the round is the
 * clones'.  The panel keeps the score.  Leaving the Wheel (a dungeon, the
 * farm, a death to anything else), leaving the game, the panel's Clear or the
 * kill switch takes every clone away.
 *
 * WHAT IS NOT THE SAME AS A REAL PLAYER, said plainly:
 *   - the worker has no walls: a clone walks through buildings and water, as
 *     the monsters do (props.js: "monsters chase in a straight line"), and its
 *     shots fly through them -- on your screen an arrow can stick in a wall
 *     the worker's copy went through;
 *   - it swings, shoots and walks at the base speeds (the sim's): your Speed,
 *     Move Speed and Range points do not change how fast it acts (every number
 *     the worker rolls -- Power, Crit, Defense, Dodge, armour -- does);
 *   - it eats nothing and never sprints away to heal.
 *
 * ITS SHOTS ARE A PAGE'S.  Each arrow, volley and bolt goes out as the very
 * relay a player's page sends for it (monsterCombat.js, playerActions.js), so
 * your screen draws a clone's shots through the code that draws everyone
 * else's: an arrow's `life` of 90 says the bow's own speed and reach (the page
 * reads them back, game/peerShots.js), a volley's `delayMs` is sized for
 * BOW_VOLLEY.PEER_PX_PER_FRAME as a page sizes it, and `tg` names you, as a
 * page names the player it has locked.  v2.3.3266: until then a clone's arrows
 * were drawn at 20 px a frame (the most a `speedPx` may say) and a real
 * archer's at 8, a third of their speed -- the finding this build reported,
 * fixed for everyone in v2.3.3266 (docs/specs/peer-shots.md).
 *
 * THE WIRE.  Nothing new from the page: the panel is admin HTTP (devtools.js
 * `/dev/spar`).  To the owner only, `spar_state` (PRIVILEGED_EVENTS; handled
 * in wsClient's direct switch, the farm_state way): the clones, the skill and
 * the score, and what just happened (`note`).  The page lets you aim at a
 * clone with a tap, as at a duel's opponent (src/game/spar.js).
 *
 * SWITCHES.  `spar: false` in liveflags: the route says so, every live clone
 * goes on the next tick, and caps.spar is withdrawn (the panel hides it).
 *
 * MEMORY ONLY (handoff rule 1): the clones, the score and the AI live on the
 * room, in Maps keyed by player id (CLAUDE.md's '__proto__' rule). */

import { WHEEL_ZONE } from './wheelzone.js';

export const SPAR = Object.freeze({
  /* clones at once, per owner */
  MAX: 3,
  /* the zones a spar may start in: the Wheel -- not a dungeon's arena, whose
     waves are the owner's own business, nor the farm */
  ZONES: Object.freeze([WHEEL_ZONE]),
  /* where they stand when they arrive or come back, px from you */
  RING_R: 220,
  /* a clone further than this from you (a teleport, a lunge across the map)
     is put back on the ring */
  LEASH_PX: 1600,
  /* how long a knocked-out clone stays down */
  RESPAWN_MS: 3000,
  /* after a knockout the clones stand back this long before they come again */
  PAUSE_MS: 2500,
  /* the longest step the AI takes in one go (a tick the runtime delayed) */
  STEP_CAP_MS: 100,
  /* the farthest a hit's shove (`kb`) may carry a clone (pvpextras.js
     PVP_EXTRAS.SHOVE_MAX) */
  SHOVE_MAX: 200,
});

/* The page's numbers for one player's fight -- the fight simulator's, each
   cited there from the game's code (tools/pvp-sim/sim.mjs), in px a ms. */
const F60 = 60 / 1000;
const G = Object.freeze({
  WALK: 2.5 * F60,            /* gameSystems SPEED, 150 px/s */
  ATTACK_WALK: 0.5,           /* walking while the attack is held */
  SPRINT_MULT: 1.33,          /* game/sprint.js */
  SPRINT_DRAIN: 11 / 1000,    /* stamina a ms */
  SPRINT_START: 5,
  ROLL_MS: 250,               /* dodge.js dodgeWindowMs at 0 points */
  ROLL_SPEED: 6 * F60,        /* 6 px a frame while rolling */
  SWING_CD: 600,              /* SWING_COOLDOWN */
  SWEEP_MS: 400,              /* the swing claims while it sweeps */
  SWING_CLEAR_MS: 450,
  CLAIM_GAP_MS: 90,           /* v2.3.3260: three claims a swing, at 0 / 90 / 180 ms */
  CLAIMS_A_SWING: 3,
  BOW_CD: 600 * 0.825,        /* BOW_SWING_MULT */
  STAFF_CD: 600 + 300,        /* the staff's +300 */
  SPECIAL_CD: 1500,           /* playerActions: a special, then 1500 ms */
  MELEE_RANGE: 50,            /* greatsword reach, what a swing claims */
  MELEE_ARC: Math.PI * 0.85,
  ARROW_SPEED: 24 * F60,      /* projectiles.js ARROW_SPEED_PX */
  /* v2.3.3266: the life a page sends a plain arrow with (90 frames x its
     `_rangeMult`, 1 here): what a watcher reads the bow's speed and reach back
     off (src/game/peerShots.js PEER_SHOT.LIFE_PER_K) */
  ARROW_LIFE: 90,
  /* v2.3.3266: the speed a page sizes a volley's delays for
     (BOW_VOLLEY.PEER_PX_PER_FRAME, playerActions.js volleyDelayMs) */
  PEER_PX: 8,
  ARROW_FLIGHT: 675,          /* where an arrow comes down */
  ARROW_RANGE: 450,           /* the sight gate: no shot past about half a phone's view */
  VOLLEY_SPEED: 24 * 0.7 * F60,   /* BOW_VOLLEY.SPEED_K */
  VOLLEY_GAP_PX: 200,         /* BOW_VOLLEY.GAP_PX between the three */
  VOLLEY_GAP_MS: 200 / (24 * 0.7 * F60),   /* ...in this speed's ms */
  VOLLEY_N: 3,
  BOLT_SPEED: 5 * F60,        /* a staff bolt, 5 px a frame */
  BOLT_DRAWN_PX: 5,
  BOLT_RANGE: 675,            /* STAFF_RANGE_PX */
  R_ARROW: 28.6, R_VOLLEY: 33, R_BOLT: 34, R_BIGBOLT: 51,   /* projectiles.js PvP radii */
  DASH_SPEED: 26 * F60,       /* DASH_STEP_PX a frame */
  DASH_STOP: 46,              /* contact */
  DASH_REACH: 900,            /* DASH_MAX_REACH_PX */
  DASH_SLOW: 3.0, DASH_WIN_MIN: 420,
  DASH_WIN_MAX: Math.round(900 / (26 * F60) * 3.0) + 90,   /* the longest dash window (dashWindowMs) */
  LUNGE_CD: 2500,             /* STAM_ABILITIES.sworddash.cooldownMs */
  SHIELD_MIN_MS: 400,         /* a guard raised against a special, held at least this */
  SHIELD_MAX_MS: 2500,
  SLOW_DEFAULT: 0.4,          /* a slow with no `mult` (pvpextras.js SLOW_MULT) */
  CHILL_MULT: 0.55,           /* a monster's chill (monsterstatus.js CHILL) */
});

/* The sim's players (tools/pvp-sim/sim.mjs SKILL: moderate / high, and since
   v2.3.3267 a beginner below its low), under the panel's names; `dummy`
   stands still and never attacks.  Each field is the sim's own meaning: focus
   (a share of half-seconds spent attacking when able), holdAt (a sword holds
   the attack from this far), sprint, lunge (rolls in from 80-150 px), band
   (where a bow or staff tries to stand), kite, strafe, special (the farthest a
   special is thrown from; null, none), specialMiss, shieldSpecial /
   rollSpecial (the answer to your special), react / rollSigma (ms), dashAt
   (the sword's opening lunge, from this far; null, none), lungeWaits (no lunge
   into your special), gapMs (v2.3.3267: longer between two attacks). */
/* ═══ v2.3.3267: EASY IS A BEGINNER ═══
   The owner, after a playtest: "The bot was tough to be beat even on easy".
   Easy was the sim's careless player (SKILL.low) -- a coin flip for a
   careless player, and on the fight simulator a careless player who throws
   no specials lost EVERY fight to it, at every weapon (tools/pvp-sim/easy.mjs:
   0% in all nine pairings at Lv 12).  The specials and the lunge are most of a
   careless player's damage.  So Easy throws no special (`special: null`),
   never lunges (`dashAt: null`), attacks half the half-seconds it could
   (`focus` 0.5) and waits `gapMs` 600 longer between two swings or shots: the
   same player loses to it in every pairing at Lv 7, 12 and 22 (100%), a fight
   about half a minute long.  Every number the worker rolls is still yours. */
export const SPAR_SKILLS = Object.freeze({
  dummy: null,
  easy: Object.freeze({
    focus: 0.5, holdAt: 140, sprint: false, lunge: false,
    band: { bow: [0, 280], staff: [0, 380] }, kite: 'none', strafe: 0,
    special: null, specialMiss: 0,
    shieldSpecial: 0, rollSpecial: 0, rollSigma: 260, react: 450,
    dashAt: null, lungeWaits: false, gapMs: 600,
  }),
  normal: Object.freeze({
    focus: 0.85, holdAt: 48, sprint: true, lunge: true,
    band: { bow: [110, 280], staff: [130, 380] }, kite: 'shoot', strafe: 0.35,
    special: { melee: 60, bow: 320, staff: 450 }, specialMiss: 0.1,
    shieldSpecial: 0.35, rollSpecial: 0.25, rollSigma: 180, react: 320,
    dashAt: [60, 300], lungeWaits: true,
  }),
  hard: Object.freeze({
    focus: 0.97, holdAt: 45, sprint: true, lunge: true,
    band: { bow: [150, 300], staff: [180, 400] }, kite: 'smart', strafe: 0.7,
    special: { melee: 50, bow: 320, staff: 450 }, specialMiss: 0.03,
    shieldSpecial: 0.7, rollSpecial: 0.5, rollSigma: 110, react: 250,
    dashAt: [0, 450], lungeWaits: true,
  }),
});
export const SPAR_SKILL_NAMES = Object.freeze(Object.keys(SPAR_SKILLS));
export const SPAR_DEFAULT_SKILL = 'normal';

/* the panel's weapon -> the slot it fills, the page's style, the wire's kind */
export const SPAR_WEAPONS = Object.freeze({
  sword: Object.freeze({ slot: 'weapon', active: 'melee', style: 'melee', kind: 'melee', name: 'Sword Clone', cat: 'sword' }),
  bow: Object.freeze({ slot: 'rangedWeapon', active: 'ranged', style: 'bow', kind: 'ranged', name: 'Bow Clone', cat: 'bow' }),
  staff: Object.freeze({ slot: 'staffWeapon', active: 'staff', style: 'staff', kind: 'staff', name: 'Staff Clone', cat: 'staff' }),
});

/* What of your state a clone does NOT copy: the economy, the quests, the
   gathering, the badge, and the life state.  Everything with a leading `_`
   is the room's working state and is never copied either (the clone starts
   its own).  What it does copy is how you fight: level, points (prog3), the
   weapon skills, armour, shield, amulet, the old stat block, your look. */
const SPAR_NOT_COPIED = new Set([
  'coins', 'inventory', 'lifeSkills', 'goldNuggets', 'goldBars', 'gemsCaptured',
  'weaponStash', 'shieldStash', 'armorStash', 'legsStash', 'gearStash', 'amuletStash',
  'achievementPoints', 'svKills', 'xp', 'unspentT2', 'buildPointsThisLvl',
  'bro', 'broN', 'cape', 'ex', 'lingering', 'dead', 'dying', 'respawnAt', 'disconnected',
  'dodging', 'blocking', 'blockStartT', 'ba', 'x', 'y', 'vx', 'vy', 'z', 'd', 'f',
  'hp', 'stamina', 'mana', 'lastMoveAt', 'lastDamageAt', 'name',
]);

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
/* a clone's ask of the room's own ability handler (index.js
   _handleAbilityUse: a roll's stamina, a special's mana) -- built from a
   variable so wire-audit.test.mjs, which reads every `type:` literal as a
   message the worker sends, does not take the ask for one */
const ask = (t) => ({ type: t });
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const angTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
const FACING8 = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];
const facing8 = (a) => FACING8[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];
const dir4 = (a) => (Math.abs(Math.cos(a)) >= Math.abs(Math.sin(a)) ? (Math.cos(a) >= 0 ? 'right' : 'left') : (Math.sin(a) >= 0 ? 'down' : 'up'));
const rnd = () => Math.random();
const gauss = () => { let u = 0; while (u === 0) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
function segGap(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  if (!(L > 0)) return Math.hypot(px - bx, py - by);
  let t = ((px - ax) * dx + (py - ay) * dy) / L; t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
/* the claim's number for an older worker's path (pvpbalance: false); the
   worker's own roll ignores it (gameSystems calcWeaponDmg's bands) */
function plainRoll(style, base) {
  const U = (a, b) => a + rnd() * (b - a);
  if (style === 'staff') return base * U(0.5, 1.65);
  if (style === 'bow') return base * U(0.6, 0.8);
  return base * U(0.75, 1.25);
}

export const sparMethods = {
  /* ── switches and lookups ── */
  _sparOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && own(f, 'spar') && !f.spar);
  },
  /* the clone with this id, or null */
  _sparClone(id) {
    return (this._sparById && typeof id === 'string' && this._sparById.get(id)) || null;
  },
  _sparIsClone(id) { return !!this._sparClone(id); },
  /* a clone and its owner: the one pair a clone may fight */
  _sparPair(a, b) {
    const ca = this._sparClone(a);
    if (ca) return ca.owner === b;
    const cb = this._sparClone(b);
    return !!cb && cb.owner === a;
  },
  _sparHas(ownerId) {
    const sp = this._spars && this._spars.get(ownerId);
    return !!(sp && sp.clones.size > 0);
  },

  /* ═══ THE PANEL'S LEVER (devtools.js `/dev/spar`) ═══
     body: { add: 'sword' | 'bow' | 'staff' | 'all', skill, clear: true }.
     `all` replaces what is out with one of each.  Answers the summary. */
  _sparDev(playerId, body) {
    const b = body || {};
    if (this._sparOff()) return { ok: false, error: 'sparring is switched off (live flag spar: false)' };
    const ps = own(this.playerState, playerId) ? this.playerState[playerId] : null;
    const ws = ps ? this._wsBySessionId(playerId) : null;
    if (!ps || !ws || this._sparIsClone(playerId)) return { ok: false, error: 'player not online' };
    if (b.clear) {
      this._sparClear(playerId, 'cleared', false);
      return { ok: true, ...this._sparSummary(playerId) };
    }
    if (typeof b.skill === 'string') {
      if (!own(SPAR_SKILLS, b.skill)) return { ok: false, error: 'unknown skill: ' + b.skill };
      const sp = this._sparRecord(playerId, true);
      sp.skill = b.skill;
      /* a change of mind is a fresh start for every clone's habits */
      for (const c of sp.clones.values()) this._sparResetAi(c);
    }
    if (typeof b.add === 'string') {
      if (b.add !== 'all' && !own(SPAR_WEAPONS, b.add)) return { ok: false, error: 'unknown weapon: ' + b.add };
      if (!SPAR.ZONES.includes(ps.z)) return { ok: false, error: 'stand in the world first (not a dungeon or the farm)' };
      if (ps.dead || ps.dying || !(ps.hp > 0)) return { ok: false, error: 'you are down -- try again once you are back up' };
      const sp = this._sparRecord(playerId, true);
      /* new clones start fighting at once, whatever the last round left */
      sp.pauseUntil = 0;
      if (b.add === 'all') {
        this._sparClear(playerId, null, false);
        for (const w of Object.keys(SPAR_WEAPONS)) this._sparSpawn(playerId, ps, w);
      } else {
        if (sp.clones.size >= SPAR.MAX) return { ok: false, error: 'at most ' + SPAR.MAX + ' clones at once -- clear them first' };
        this._sparSpawn(playerId, ps, b.add);
      }
    }
    this._sparTell(playerId, typeof b.add === 'string' ? 'spawned' : 'set');
    return { ok: true, ...this._sparSummary(playerId) };
  },

  _sparRecord(ownerId, create) {
    if (!this._spars) this._spars = new Map();
    let sp = this._spars.get(ownerId);
    if (!sp && create) {
      sp = { skill: SPAR_DEFAULT_SKILL, clones: new Map(), rounds: { you: 0, clones: 0 }, pauseUntil: 0 };
      this._spars.set(ownerId, sp);
    }
    return sp || null;
  },

  _sparSummary(ownerId) {
    const sp = this._spars && this._spars.get(ownerId);
    const out = { skill: sp ? sp.skill : SPAR_DEFAULT_SKILL, rounds: sp ? { ...sp.rounds } : { you: 0, clones: 0 }, clones: [] };
    if (!sp) return out;
    for (const c of sp.clones.values()) {
      const cps = this.playerState[c.id];
      out.clones.push({
        id: c.id, weapon: c.weapon, name: c.name,
        hp: cps ? Math.max(0, Math.round(cps.hp || 0)) : 0,
        maxHp: cps ? Math.max(1, Math.round(cps.maxHp || 1)) : 1,
        down: !!(cps && (cps.dead || cps.dying)),
      });
    }
    return out;
  },

  /* To the owner's phone only: the clones, the skill, the score and what
     just happened. */
  _sparTell(ownerId, note, extra) {
    const ws = this._wsBySessionId(ownerId);
    if (!ws) return;
    try {
      ws.send(JSON.stringify({ type: 'spar_state', payload: { ...this._sparSummary(ownerId), note: note || null, ...(extra || null) } }));
    } catch (e) { /* the next one will do */ }
  },

  /* ═══ A CLONE ARRIVES ═══ */
  _sparSpawn(ownerId, ownerPs, weapon) {
    const W = SPAR_WEAPONS[weapon];
    const sp = this._sparRecord(ownerId, true);
    if (!this._sparById) this._sparById = new Map();
    /* unique by the count, unguessable by the rest: never a real player's
       `bp_` id, never one already in the room */
    let id;
    do {
      this._sparSeq = (this._sparSeq || 0) + 1;
      id = 'spar_' + this._sparSeq.toString(36) + '_' + Math.floor(rnd() * 0x7fffffff).toString(36);
    } while (own(this.playerState, id) || this._sparById.has(id));
    /* how you fight, copied deep (a clone's hit must never write into your
       state): every key that is not the room's working state or yours alone */
    const ps = {};   /* proto-ok: a playerState entry, as join.js makes one; its keys are the room's own field names, copied below */
    for (const k of Object.keys(ownerPs)) {
      if (k.charAt(0) === '_' || SPAR_NOT_COPIED.has(k) || k === 'constructor' || k === 'prototype') continue;
      const v = ownerPs[k];
      if (v === undefined || typeof v === 'function') continue;
      try { ps[k] = (v && typeof v === 'object') ? JSON.parse(JSON.stringify(v)) : v; } catch (e) { /* not a number of a fight */ }
    }
    /* its weapon: yours for that slot (gems as your page last said them, when
       you hold that kind -- setting a gem is the page's, pvpextras.js
       _pvpClaimElement), else the tutorial's */
    const mine = ownerPs[W.slot] && typeof ownerPs[W.slot] === 'object' ? JSON.parse(JSON.stringify(ownerPs[W.slot])) : null;
    const wpn = mine || this._sparStarterWeapon(weapon);
    const look0 = this._sparOwnerLook(ownerId, ownerPs);
    if (look0.wpnType && this._sparCatOf(look0.wpnType) === W.cat) {
      if (look0.wpnE1 !== undefined) wpn.element1 = look0.wpnE1 || null;
      if (look0.wpnE2 !== undefined) wpn.element2 = look0.wpnE2 || null;
    }
    ps.weapon = ps.rangedWeapon = ps.staffWeapon = null;
    ps[W.slot] = wpn;
    ps.activeSlot = W.active;
    const n = sp.clones.size;
    const a0 = (sp.ringAt = (typeof sp.ringAt === 'number' ? sp.ringAt : rnd() * Math.PI * 2) + Math.PI * 2 / 3);
    Object.assign(ps, {
      x: (ownerPs.x || 0) + Math.cos(a0) * SPAR.RING_R, y: (ownerPs.y || 0) + Math.sin(a0) * SPAR.RING_R,
      z: ownerPs.z, d: 'down', f: 'south', vx: 0, vy: 0,
      dead: false, dying: false, disconnected: false, dodging: false, blocking: false, blockStartT: 0,
      name: W.name, lastMoveAt: Date.now(), lastDamageAt: 0,
      _buffs: {}, _spar: { owner: ownerId, weapon },
    });
    if (typeof this._prog3Recompute === 'function') this._prog3Recompute(ps);
    ps.hp = ps.maxHp || 100; ps.stamina = ps.maxStamina || 100; ps.mana = ps.maxMana || 100;
    this.playerState[id] = ps;
    this.stateHistory[id] = [];
    const look = { ...look0, name: W.name, wpnType: wpn.type, wpnMat: wpn.gearBase || undefined,
      wpnE1: wpn.element1 || null, wpnE2: wpn.element2 || null,
      rpgHp: Math.round(ps.hp), rpgMaxHp: Math.round(ps.maxHp || ps.hp), rpgLv: ps.level || 1,
      aw: 0, pet: null, x: ps.x, y: ps.y, z: ps.z, d: ps.d, f: ps.f,
      rpgData: Object.assign({}, look0.rpgData && typeof look0.rpgData === 'object' ? look0.rpgData : null, { weapon: wpn.name || W.name }),
    };
    delete look.bro;
    const c = {
      id, owner: ownerId, weapon, style: W.style, kind: W.kind, name: W.name,
      sess: { id, name: W.name, rtt: 0, data: look }, look,
      born: Date.now(), lastAt: Date.now(), downUntil: 0, n,
    };
    this._sparResetAi(c);
    sp.clones.set(id, c);
    this._sparById.set(id, c);
    this.dirtyPlayers.add(id);
    /* everyone near is told a player arrived, with the look to draw (the
       join's own message: join.js)... */
    this.broadcastAll({ type: 'player_join', id, name: W.name, data: look });
    /* ...and its look as a player's page relays it (the look relay's
       player_update): a phone takes the weapon in hand (`wpnType`, `wpnMat`)
       and the slung shield (`rpgData`) only from that road, and a real
       player's page sends one within 2 s of joining -- a clone has no page,
       so without this every clone was drawn holding the default sword
       (found by mp-spar) */
    this.broadcastAll({ type: 'player_update', id, data: look });
    return c;
  },

  /* the tutorial's weapon for a slot you leave empty (quests.js mints these) */
  _sparStarterWeapon(weapon) {
    const ww = weapon !== 'sword';
    const table = ww ? this._WOODWORKING_TIERS_DATA() : this._BLACKSMITH_TIERS_DATA();
    const key = ww ? 'pine' : 'copper';
    const tier = (table && own(table, key)) ? table[key] : null;
    return {
      type: weapon === 'sword' ? 'greatsword' : weapon, tier: 'common',
      tierMult: (tier && tier.tierMult) || 1, element1: null, element2: null, isVolatile: false,
      name: weapon === 'sword' ? 'Copper Great Sword' : weapon === 'bow' ? 'Pine Bow' : 'Pine Staff',
      gearBase: ww ? 'ww_' + key : key, reforgeBonus: null, hardenBonus: null, quality: 'normal', hardness: 0, temper: 0,
    };
  },

  _sparCatOf(type) {
    if (type === 'bow') return 'bow';
    if (type === 'staff') return 'staff';
    return 'sword';
  },

  /* your look as the others are told it (index.js _peerPublic) */
  _sparOwnerLook(ownerId, ownerPs) {
    const ws = this._wsBySessionId(ownerId);
    const s = ws ? this.sessions.get(ws) : null;
    const look = this._peerPublic ? this._peerPublic(ownerPs, s) : {};
    return look && typeof look === 'object' ? look : {};
  },

  /* a clone's habits, fresh */
  _sparResetAi(c) {
    Object.assign(c, {
      engaged: true, focusAt: 0, strafeDir: rnd() < 0.5 ? -1 : 1, strafeAt: 0,
      sprinting: false, roll: null, held: false, mv: null,
      swingTimer: -1e12, isSwinging: false, specialSwing: false, swingAt: 0, swingSw: 0, claims: null, swingLanded: 0,
      lastSwipe: -1e12, shots: [], dash: null, lungeReadyAt: 0,
      pendingRoll: null, pendingShield: null, shield: null,
      slowUntil: 0, slowK: 1, foeSpecialUntil: 0,
      sent: null,
    });
  },

  /* ═══ A CLONE GOES ═══ */
  _sparRemove(id) {
    const c = this._sparClone(id);
    if (!c) return;
    this._sparById.delete(id);
    const sp = this._spars && this._spars.get(c.owner);
    if (sp) sp.clones.delete(id);
    const ps = this.playerState[id];
    if (ps && this._pvpClearStatuses) this._pvpClearStatuses(id, ps);
    if (ps && ps.blocking) this._sparRelay(c, { type: 'player_shield', up: false });
    if (this._abilPending) this._abilPending.delete(id);
    if (this._pvpHealClocks) this._pvpHealClocks.delete(id);
    delete this.playerState[id];
    delete this.stateHistory[id];
    this.dirtyPlayers.delete(id);
    this.broadcastAll({ type: 'player_leave', id });
  },

  /* Every clone of this owner.  `note` tells the owner's phone why; `forget`
     drops the score and the skill with them (you left the Wheel, or the
     switch went off) -- the panel's Clear keeps both for the next clones. */
  _sparClear(ownerId, note, forget) {
    const sp = this._spars && this._spars.get(ownerId);
    if (!sp) return;
    for (const id of [...sp.clones.keys()]) this._sparRemove(id);
    if (note) this._sparTell(ownerId, note);
    if (forget) this._spars.delete(ownerId);
  },

  /* the owner left the game: their clones go with them (index.js
     webSocketClose) */
  _sparOnLeave(ownerId) {
    if (this._spars && this._spars.has(ownerId)) this._sparClear(ownerId, null, true);
  },

  /* What the clone does on your screen: the relay a player's page sends, in
     its own shape (gameEvents.js), placed where the room has the clone
     (eventplace.js RELAY_PLACED reads `from`). */
  _sparRelay(c, ev) {
    const { type, ...payload } = ev;
    this.eventBuffer.push({ type, payload: { id: c.id, ts: Date.now(), ...payload }, from: c.id });
  },

  /* ═══ A KNOCKOUT (index.js _handlePlayerDeath asks first) ═══
     A clone down: up again beside you in RESPAWN_MS.  You down by one of your
     own clones: healed where you stand, no death.  Anything else is the
     game's own death.  Returns true when it took the death. */
  _sparDeath(ps, playerId, cause) {
    const now = Date.now();
    const c = this._sparClone(playerId);
    if (c) {
      ps.dying = true; ps.dead = true; ps.hp = 0;
      ps.respawnAt = 0;
      ps.blocking = false; ps.dodging = false; ps.vx = 0; ps.vy = 0;
      if (this._pvpClearStatuses) this._pvpClearStatuses(playerId, ps);
      c.downUntil = now + SPAR.RESPAWN_MS;
      c.shots = []; c.dash = null; c.roll = null; c.shield = null; c.pendingRoll = null; c.pendingShield = null;
      c.isSwinging = false;
      this.dirtyPlayers.add(playerId);
      /* drawn as any player's knockout on the screens near it (the relay a
         player's page sends when it dies: gameEvents.js) */
      this._sparRelay(c, { type: 'player_died_to_monster', x: Math.round(ps.x || 0), y: Math.round(ps.y || 0) });
      const sp = this._spars && this._spars.get(c.owner);
      if (sp) sp.rounds.you++;
      this._sparTell(c.owner, 'down', { who: c.name });
      return true;
    }
    if (typeof cause !== 'string' || cause.indexOf('pvp:') !== 0) return false;
    const by = this._sparClone(cause.slice(4));
    if (!by || by.owner !== playerId) return false;
    /* ...you, by your own clone: not a death */
    ps.hp = ps.maxHp || 100;
    ps.stamina = ps.maxStamina || ps.stamina;
    ps.mana = ps.maxMana || ps.mana;
    ps.lastDamageAt = 0;
    ps._dmgFromPlayer = null;
    if (this._pvpClearStatuses) this._pvpClearStatuses(playerId, ps);
    ps._dazeUntil = 0; ps._stuckUntil = 0; ps._staggerUntil = 0;
    /* the hit that did it saved you near death (persistence.js
       _saveRpgVitals): save you healed, so a restart cannot bring that back */
    this._saveRpg(playerId, ps);
    this._queuePlayerStateFlush(playerId);
    const sp = this._spars && this._spars.get(playerId);
    if (sp) {
      sp.rounds.clones++;
      sp.pauseUntil = now + SPAR.PAUSE_MS;
      /* a new round: every clone whole again and back on the ring, one that
         was down included */
      for (const k of sp.clones.values()) {
        const kps = this.playerState[k.id];
        const wasDown = !!(kps && (kps.dead || kps.dying));
        this._sparStandBack(k, ps, now, true);
        if (wasDown) this._sparRelay(k, { type: 'player_respawned' });
      }
    }
    this._sparTell(playerId, 'ko', { who: by.name });
    return true;
  },

  /* a clone back on the ring round you: whole again when `revive` */
  _sparStandBack(c, ownerPs, now, revive) {
    const ps = this.playerState[c.id];
    if (!ps) return;
    const sp = this._spars && this._spars.get(c.owner);
    const a = (sp && typeof sp.ringAt === 'number') ? (sp.ringAt += Math.PI * 2 / 3) : rnd() * Math.PI * 2;
    ps.x = (ownerPs.x || 0) + Math.cos(a) * SPAR.RING_R;
    ps.y = (ownerPs.y || 0) + Math.sin(a) * SPAR.RING_R;
    ps.z = ownerPs.z;
    ps.vx = 0; ps.vy = 0;
    ps.lastMoveAt = now;
    if (revive || !(ps.dead || ps.dying)) {
      ps.hp = ps.maxHp || 100; ps.stamina = ps.maxStamina || 100; ps.mana = ps.maxMana || 100;
      ps.lastDamageAt = 0; ps._dmgFromPlayer = null;
      if (this._pvpClearStatuses) this._pvpClearStatuses(c.id, ps);
      ps._dazeUntil = 0; ps._stuckUntil = 0; ps._staggerUntil = 0;
    }
    if (revive) { ps.dead = false; ps.dying = false; c.downUntil = 0; }
    if (ps.blocking) this._sparRelay(c, { type: 'player_shield', up: false });
    ps.blocking = false; ps.dodging = false;
    this._sparResetAi(c);
    /* the history the next hit is judged against starts here, not where it
       stood before (combat.js reads the newest entry for a clone: rtt 0) */
    this.stateHistory[c.id] = [];
    this.dirtyPlayers.add(c.id);
    /* its bar full again on every screen (a peer's bar is fed by pvp_hit and
       the look relay: wsClient.js player_update) */
    this.broadcastAll({ type: 'player_update', id: c.id, data: { rpgHp: Math.round(ps.hp), rpgMaxHp: Math.round(ps.maxHp || ps.hp) } });
  },

  /* ═══ YOUR SPECIAL, SEEN (index.js's relay branch shows us yours) ═══
     A clone answers it as the sim's player does (planDefence): the shield,
     else perhaps a roll, after a reaction.  `kind`: 'big', 'volley', 'lunge',
     'special'. */
  _sparSeen(senderId, msg) {
    const sp = this._spars && this._spars.get(senderId);
    if (!sp || !sp.clones.size || !msg || typeof msg !== 'object') return;
    const p = msg.payload && typeof msg.payload === 'object' ? msg.payload : msg;
    let kind = null;
    if (msg.type === 'player_projectile' && p.isSpecial) kind = (p.isStaff && p.big) ? 'big' : (p.isStaff ? 'big' : 'volley');
    else if (msg.type === 'player_swing' && p.special && !p.whirl && !p.bash) kind = 'special';
    else if (msg.type === 'player_dodge' && p.kind === 'sworddash') kind = 'lunge';
    if (!kind) return;
    const sk = SPAR_SKILLS[sp.skill];
    if (!sk) return;
    const now = Date.now();
    const ops = this.playerState[senderId];
    for (const c of sp.clones.values()) {
      const ps = this.playerState[c.id];
      if (!ps || ps.dead || ps.dying || !ops) continue;
      c.foeSpecialUntil = now + 1200;
      this._sparPlanDefence(c, ps, ops, kind, now, sk);
    }
  },

  _sparPlanDefence(c, ps, ops, kind, now, sk) {
    if (c.shield || c.pendingShield) return;
    const d = dist(ps.x, ps.y, ops.x, ops.y);
    /* a sword toe to toe keeps swinging (the sim's rule) */
    if (c.style === 'melee' && d < 90) return;
    const react = Math.max(150, sk.react + gauss() * sk.rollSigma);
    if (ps.shield && sk.shieldSpecial > 0 && rnd() < sk.shieldSpecial && (ps.stamina || 0) >= 15
        && !(ps._guardBrokenUntil && now < ps._guardBrokenUntil)) {
      c.pendingShield = { at: now + react };
      return;
    }
    if (sk.rollSpecial > 0 && rnd() < sk.rollSpecial) {
      /* a slow big bolt is rolled as it arrives (its i-frames are 250 ms) */
      const eta = kind === 'big' ? d / G.BOLT_SPEED : 0;
      const at = now + Math.max(react, eta - 125 + gauss() * sk.rollSigma * 0.5);
      c.pendingRoll = { at, ang: angTo(ps.x, ps.y, ops.x, ops.y) + (rnd() < 0.5 ? 1 : -1) * Math.PI / 2 };
    }
  },

  /* ═══ THE TICK (tick.js, before the player-state flush) ═══ */
  _tickSpar(now) {
    if (!this._spars || this._spars.size === 0) return;
    if (this._sparOff()) {
      for (const ownerId of [...this._spars.keys()]) this._sparClear(ownerId, 'off', true);
      return;
    }
    this._sparTakeHits(now);
    for (const [ownerId, sp] of [...this._spars]) {
      const ops = own(this.playerState, ownerId) ? this.playerState[ownerId] : null;
      /* you left the Wheel (or the game): the clones go */
      if (!ops || ops.disconnected || !SPAR.ZONES.includes(ops.z)) {
        this._sparClear(ownerId, sp.clones.size ? 'left' : null, true);
        continue;
      }
      const sk = SPAR_SKILLS[sp.skill] || null;
      for (const c of [...sp.clones.values()]) {
        const ps = this.playerState[c.id];
        if (!ps) { this._sparRemove(c.id); continue; }
        const dt = Math.max(0, Math.min(SPAR.STEP_CAP_MS, now - (c.lastAt || now)));
        c.lastAt = now;
        try { this._sparStep(c, ps, ops, sp, sk, now, dt); }
        catch (e) {
          /* one clone's bad step must not take the room's tick with it */
          this._sparErrs = (this._sparErrs || 0) + 1;
          if (this._sparErrs === 1) { try { console.error('[spar] step threw:', e && e.message); } catch (_e) { /* */ } }
        }
      }
    }
  },

  /* The hits on a clone, as a player's page carries them out (gameEvents.js
     pvp_hit: the shove `kb`, a slow): the worker keeps the holds itself
     (_dazeUntil, _stuckUntil, _staggerUntil on the clone's state).  Each
     event once -- the room's buffer keeps an event a tick it could not send. */
  _sparTakeHits(now) {
    if (!this._sparById || this._sparById.size === 0) return;
    if (!this._sparSeenEv) this._sparSeenEv = new WeakSet();
    for (const e of this.eventBuffer) {
      if (!e || e.type !== 'pvp_hit' || !e.payload || this._sparSeenEv.has(e)) continue;
      const c = this._sparClone(e.payload.target);
      if (!c) continue;
      this._sparSeenEv.add(e);
      const ps = this.playerState[c.id];
      if (!ps || ps.dead || ps.dying) continue;
      const p = e.payload;
      const kb = p.kb;
      if (Array.isArray(kb) && kb.length === 2 && Number.isFinite(kb[0]) && Number.isFinite(kb[1])) {
        const len = Math.hypot(kb[0], kb[1]);
        const k = len > SPAR.SHOVE_MAX ? SPAR.SHOVE_MAX / len : 1;
        ps.x += kb[0] * k; ps.y += kb[1] * k;
        ps.lastMoveAt = now;
        this.dirtyPlayers.add(c.id);
      }
      const ms = num(p.stMs);
      if ((p.st === 'slow' || p.st === 'chill') && ms > 0) {
        c.slowUntil = Math.max(c.slowUntil || 0, now + ms);
        c.slowK = p.st === 'chill' ? G.CHILL_MULT : (num(p.mult) > 0 && num(p.mult) < 1 ? num(p.mult) : G.SLOW_DEFAULT);
      }
      /* struck mid-roll or mid-dash: a dash ends with its strike, a roll runs out */
    }
  },

  /* One clone, one step. */
  _sparStep(c, ps, ops, sp, sk, now, dt) {
    /* at nothing by any road but a death (the room's stuck-at-zero sweep
       leaves a clone to the spar: index.js _tickPlayerRespawn): down now */
    if (!(ps.hp > 0) && !ps.dying) { this._sparDeath(ps, c.id, 'stuck-at-zero'); return; }
    /* down: up again beside you when its time comes */
    if (ps.dead || ps.dying) {
      if (c.downUntil && now >= c.downUntil) {
        this._sparStandBack(c, ops, now, true);
        this._sparRelay(c, { type: 'player_respawned' });
        this._sparTell(c.owner, 'up', { who: c.name });
      }
      return;
    }
    /* too far from you (a long lunge of yours, a teleport): back to the ring */
    if (ps.z !== ops.z || dist(ps.x, ps.y, ops.x, ops.y) > SPAR.LEASH_PX) {
      this._sparStandBack(c, ops, now, false);
      return;
    }
    const x0 = ps.x, y0 = ps.y;
    const o = { x: ops.x || 0, y: ops.y || 0, ps: ops,
      sprinting: !!(this._sprintWire && this._sprintWire(ops, now)) };
    /* a dummy, the clones standing back after a knockout, or you down: they
       only turn to face you */
    const idle = !sk || now < (sp.pauseUntil || 0) || ops.dead || ops.dying || !(ops.hp > 0);
    if (idle) {
      if (c.shield) this._sparLower(c, ps);
      c.held = false; c.sprinting = false; c.dash = null; c.roll = null; ps.dodging = false;
      if (c.shots.length && (ops.dead || ops.dying)) c.shots = [];
    } else {
      if (c.pendingRoll && now >= c.pendingRoll.at) {
        if (now < (ps._dazeUntil || 0) || now < (ps._stuckUntil || 0)) c.pendingRoll.at = Math.max(ps._dazeUntil || 0, ps._stuckUntil || 0) + 120;
        else { this._sparRollStart(c, ps, c.pendingRoll.ang, now); c.pendingRoll = null; }
      }
      this._sparShieldStep(c, ps, o, now);
      this._sparThink(c, ps, o, sk, now);
      this._sparMove(c, ps, o, now, dt);
      this._sparAttack(c, ps, o, sk, now);
      this._sparSweep(c, ps, o, now);
    }
    this._sparFly(c, ps, o, now, dt);
    this._sparWire(c, ps, o, now, dt, x0, y0);
  },

  /* ── the sim's think(), on the room's clock ── */
  _sparThink(c, ps, o, sk, now) {
    if (c.dash) return;
    if (now < (ps._dazeUntil || 0)) { c.sprinting = false; c.held = false; return; }
    const d = dist(ps.x, ps.y, o.x, o.y), a = angTo(ps.x, ps.y, o.x, o.y);
    if (now >= c.focusAt) { c.engaged = rnd() < sk.focus; c.focusAt = now + 500; }
    if (now >= c.strafeAt) { c.strafeDir = -c.strafeDir; c.strafeAt = now + 600 + rnd() * 700; }
    let mv = { ang: a, k: 0 }, hold = false, sprint = false;
    if (c.style === 'melee') {
      hold = c.engaged && d <= sk.holdAt;
      if (d > 28) mv = { ang: a, k: 1 };
      sprint = sk.sprint && !hold && d > 70 && (ps.stamina || 0) > 25;
      if (sk.lunge && !c.roll && d > 80 && d < 150 && (ps.stamina || 0) >= 40 && c.engaged) this._sparRollStart(c, ps, a, now);
    } else {
      const band = sk.band[c.style];
      const lo = band[0], hi = band[1];
      const range = c.style === 'bow' ? G.ARROW_RANGE : G.BOLT_RANGE;
      const side = a + c.strafeDir * Math.PI / 2;
      if (d > Math.min(hi, range)) { mv = { ang: a, k: 1 }; hold = false; }
      else if (d < lo && sk.kite === 'smart') {
        mv = { ang: a + Math.PI, k: 1 }; hold = false;
        sprint = sk.sprint && o.sprinting && (ps.stamina || 0) > 20;
        if (d < 70 && (ps.stamina || 0) >= 40) this._sparRollStart(c, ps, a + Math.PI, now);
      } else if (d < lo && sk.kite === 'shoot') {
        mv = { ang: a + Math.PI, k: 1 }; hold = c.engaged;
      } else {
        hold = c.engaged;
        const s = sk.strafe;
        mv = s > 0 ? { ang: Math.atan2(Math.sin(side) * s, Math.cos(side) * s), k: s } : { ang: a, k: 0 };
      }
    }
    if (c.shield) hold = false;
    c.held = hold;
    c.mv = mv;
    if (sprint && !hold && !c.roll && (c.sprinting || (ps.stamina || 0) >= G.SPRINT_START)) c.sprinting = true;
    else c.sprinting = false;
    /* the sword's opening lunge, pressed for when it is ready */
    if (c.style === 'melee' && this._sparCanLunge(c, ps, sk, d, now)) this._sparLungeStart(c, ps, o, d, now);
  },

  _sparCanLunge(c, ps, sk, d, now) {
    const at = sk.dashAt;
    if (!at || !c.engaged || c.dash || c.roll || c.shield) return false;
    if (typeof this._pvpLungeOff === 'function' && this._pvpLungeOff()) return false;
    if (now < (ps._dazeUntil || 0) || (this._pvpStaggered && this._pvpStaggered(ps))) return false;
    if (now < c.lungeReadyAt || !(d > at[0] && d <= at[1])) return false;
    if (sk.lungeWaits && now < (c.foeSpecialUntil || 0)) return false;
    /* the worker's own cooldown (abilities.js _abilCd) and its stamina gate */
    if (ps._abilCd && now < (ps._abilCd.sworddash || 0)) return false;
    return !!ps.weapon;
  },

  _sparLungeStart(c, ps, o, d, now) {
    const gap = Math.max(0, d - G.DASH_STOP);
    const win = Math.min(G.DASH_WIN_MAX, Math.max(G.DASH_WIN_MIN, Math.round(gap / G.DASH_SPEED * G.DASH_SLOW) + 90));
    const a = angTo(ps.x, ps.y, o.x, o.y);
    c.dash = { until: now + win, travelled: 0, ang: a };
    c.lungeReadyAt = now + G.LUNGE_CD;
    c.swingTimer = now;
    c.sprinting = false; c.held = false;
    /* the tumble on every screen (abilities.js castAbility's player_dodge) */
    this._sparRelay(c, { type: 'player_dodge', kind: 'sworddash', angle: a, dur: win });
  },

  _sparLungeStrike(c, ps, o, now) {
    c.dash = null;
    const a = angTo(ps.x, ps.y, o.x, o.y);
    /* the worker's own lunge at a player (pvplunge.js): the reach, the
       contact, the hit through the one door, the daze */
    this._handleAbility(c.sess, { kind: 'sworddash', pid: c.owner });
    c.swingTimer = now;
    c.lungeReadyAt = now + G.LUNGE_CD;
    /* the strike's swing on every screen (castAbility's player_swing) */
    this._sparRelay(c, { type: 'player_swing', special: true, wpn: (ps.weapon && ps.weapon.type) || 'greatsword', ang: a });
  },

  _sparRollStart(c, ps, ang, now) {
    if (c.roll || c.shield || c.dash) return false;
    if (now < (ps._dazeUntil || 0) || now < (ps._stuckUntil || 0)) return false;
    const cost = typeof this._abilityCost === 'function' ? this._abilityCost(ps, 'dodge') : 0;
    if ((ps.stamina || 0) < cost) return false;
    const s0 = ps.stamina;
    this._handleAbilityUse(c.sess, ask('dodge'));
    if (!(ps.stamina < s0) && cost > 0) return false;
    c.roll = { ang, until: now + G.ROLL_MS };
    c.sprinting = false;
    ps.dodging = true;
    this._sparRelay(c, { type: 'player_dodge', kind: 'dodge', angle: ang, dur: G.ROLL_MS, walk: true });
    return true;
  },

  /* ── the shield: raised against your special, held while it is coming ── */
  _sparShieldStep(c, ps, o, now) {
    if (c.pendingShield && now >= c.pendingShield.at) {
      if (now < (ps._dazeUntil || 0)) c.pendingShield.at = (ps._dazeUntil || 0) + 120;
      else {
        c.pendingShield = null;
        if (ps.shield && !(ps._guardBrokenUntil && now < ps._guardBrokenUntil) && (ps.stamina || 0) > 0 && !c.roll && !c.dash) {
          c.shield = { since: now, until: now + Math.max(G.SHIELD_MIN_MS, 700) };
          c.sprinting = false;
          ps.blocking = true; ps.blockStartT = now;
          ps.ba = angTo(ps.x, ps.y, o.x, o.y);
          this._sparRelay(c, { type: 'player_shield', up: true });
        }
      }
    }
    if (c.shield) {
      if (now < (c.foeSpecialUntil || 0)) c.shield.until = Math.max(c.shield.until, now + 120);
      /* the worker drops a guard at no stamina (index.js, the guard break) */
      if (!ps.blocking || now > c.shield.until || now - c.shield.since > G.SHIELD_MAX_MS) this._sparLower(c, ps);
      else ps.ba = angTo(ps.x, ps.y, o.x, o.y);
    }
  },

  _sparLower(c, ps) {
    c.shield = null;
    const was = ps.blocking;
    ps.blocking = false; ps.blockStartT = 0;
    if (was) this._sparRelay(c, { type: 'player_shield', up: false });
  },

  /* ── the sim's move(), on the room's clock ── */
  _sparMove(c, ps, o, now, dt) {
    if (now < (ps._dazeUntil || 0)) { c.sprinting = false; return; }
    if (c.dash) {
      const d = dist(ps.x, ps.y, o.x, o.y);
      if (d <= G.DASH_STOP || now > c.dash.until || c.dash.travelled >= G.DASH_REACH) { this._sparLungeStrike(c, ps, o, now); return; }
      const step = Math.min(d - G.DASH_STOP, G.DASH_SPEED * dt);
      const a = angTo(ps.x, ps.y, o.x, o.y);
      ps.x += Math.cos(a) * step; ps.y += Math.sin(a) * step;
      c.dash.travelled += step; c.dash.ang = a;
      return;
    }
    if (now < (ps._stuckUntil || 0)) { c.sprinting = false; return; }
    if (c.roll) {
      const left = Math.max(0, Math.min(dt, c.roll.until - (now - dt)));
      ps.x += Math.cos(c.roll.ang) * G.ROLL_SPEED * left; ps.y += Math.sin(c.roll.ang) * G.ROLL_SPEED * left;
      if (now >= c.roll.until) { c.roll = null; ps.dodging = false; }
      return;
    }
    const slowK = now < (c.slowUntil || 0) ? (c.slowK || 1) : 1;
    const spd = G.WALK * (c.held ? G.ATTACK_WALK : 1) * (c.sprinting ? G.SPRINT_MULT : 1) * (c.shield ? 0.5 : 1)
      * (c.mv ? c.mv.k : 0) * slowK;
    if (c.sprinting) {
      ps.stamina = Math.max(0, (ps.stamina || 0) - G.SPRINT_DRAIN * dt);
      ps._sprintAt = now;   /* the others' legs at a sprint's pace (sprint.js _sprintWire), the regen held */
      if (ps.stamina <= 0) c.sprinting = false;
    }
    if (spd > 0 && dt > 0) { ps.x += Math.cos(c.mv.ang) * spd * dt; ps.y += Math.sin(c.mv.ang) * spd * dt; }
  },

  /* ── the sim's attack() and useSpecial() ── */
  _sparAttack(c, ps, o, sk, now) {
    if (c.roll || c.shield || c.dash) return;
    if (now < (ps._dazeUntil || 0)) return;
    if (this._pvpStaggered && this._pvpStaggered(ps)) return;
    const d = dist(ps.x, ps.y, o.x, o.y);
    if (this._sparSpecial(c, ps, o, sk, d, now)) return;
    if (!c.held) return;
    const a = angTo(ps.x, ps.y, o.x, o.y);
    const gap = sk.gapMs || 0;   /* v2.3.3267: Easy's slow re-press */
    if (c.style === 'melee') {
      if (!c.isSwinging && now - c.swingTimer >= G.SWING_CD + gap) {
        c.swingTimer = now; c.isSwinging = true; c.specialSwing = false; c.swingAt = now; c.swingSw = now; c.claims = null; c.swingLanded = 0;
        this._sparRelay(c, { type: 'player_swing', wpn: (ps.weapon && ps.weapon.type) || 'greatsword', ang: a });
      }
      return;
    }
    const cd = (c.style === 'bow' ? G.BOW_CD : G.STAFF_CD) + gap;
    if (now - c.swingTimer < cd) return;
    if (c.style === 'bow' && d > G.ARROW_RANGE) return;
    c.swingTimer = now;
    const base = this._maxWeaponDmg(ps, false);
    if (c.style === 'bow') {
      c.shots.push({ kind: 'arrow', ox: ps.x, oy: ps.y, ang: a, x: ps.x, y: ps.y, travelled: 0, at: now,
        dmg: Math.round(plainRoll('bow', base)), special: false, R: G.R_ARROW, speed: G.ARROW_SPEED, flight: G.ARROW_FLIGHT });
      /* v2.3.3266: a page's arrow relay, exactly (see the header) */
      this._sparRelay(c, { type: 'player_projectile', x: Math.round(ps.x), y: Math.round(ps.y), ang: a, isStaff: false,
        el: this._sparElem(ps) || undefined, tg: c.owner, life: G.ARROW_LIFE });
    } else {
      c.shots.push({ kind: 'bolt', dist: 14, at: now, dmg: Math.round(plainRoll('staff', base)), special: false, R: G.R_BOLT });
      this._sparRelay(c, { type: 'player_projectile', x: Math.round(ps.x), y: Math.round(ps.y), ang: a, isStaff: true,
        el: this._sparElem(ps) || undefined, tg: c.owner, life: Math.round(G.BOLT_RANGE / G.BOLT_DRAWN_PX) });
    }
  },

  _sparSpecial(c, ps, o, sk, d, now) {
    if (!c.engaged || c.roll || c.shield) return false;
    if (now - c.lastSwipe < G.SPECIAL_CD) return false;
    const cost = typeof this._abilityCost === 'function' ? this._abilityCost(ps, 'swipe') : 0;
    if ((ps.mana || 0) < cost) return false;
    if (!sk.special) return false;   /* v2.3.3267: Easy throws none */
    const reach = sk.special[c.style];
    if (d > reach && !(rnd() < sk.specialMiss / 30)) return false;
    if (c.style !== 'melee' && d > (c.style === 'bow' ? G.ARROW_RANGE : G.BOLT_RANGE)) return false;
    {
      /* the worker charges it and opens the window a special may land in
         (index.js _handleAbilityUse, pvpbalance.js _pvpSpecialPaid) */
      const m0 = ps.mana;
      this._handleAbilityUse(c.sess, ask('swipe'));
      if (!(ps.mana < m0) && cost > 0) return false;
    }
    c.lastSwipe = now; c.swingTimer = now;
    const a = angTo(ps.x, ps.y, o.x, o.y);
    const base = this._maxWeaponDmg(ps, false);
    const el = this._sparElem(ps) || undefined;
    if (c.style === 'melee') {
      c.isSwinging = true; c.specialSwing = true; c.swingAt = now; c.swingSw = now; c.claims = null; c.swingLanded = 0;
      this._sparRelay(c, { type: 'player_swing', special: true, wpn: (ps.weapon && ps.weapon.type) || 'greatsword', ang: a });
    } else if (c.style === 'bow') {
      /* the volley: three arrows down one line, 200 px apart (bowVolley.js) */
      const each = Math.max(1, Math.round(plainRoll('bow', base) * 3 * 2 / G.VOLLEY_N));
      for (let i = 0; i < G.VOLLEY_N; i++) {
        c.shots.push({ kind: 'volley', ox: ps.x, oy: ps.y, ang: a, x: ps.x, y: ps.y, travelled: 0, at: now + i * G.VOLLEY_GAP_MS,
          dmg: each, special: true, R: G.R_VOLLEY, speed: G.VOLLEY_SPEED, flight: G.ARROW_FLIGHT });
        /* v2.3.3266: a page's volley relay, exactly: one `ts` for the three,
           each one's wait sized for PEER_PX as a page sizes it -- the watcher
           counts it in the volley's own speed, so it leaves VOLLEY_GAP_MS
           after the one before, as here */
        this._sparRelay(c, { type: 'player_projectile', x: Math.round(ps.x), y: Math.round(ps.y), ang: a, isStaff: false, isSpecial: true,
          el, volley: 1, tg: c.owner, ts: now, delayMs: Math.round(i * G.VOLLEY_GAP_PX * (1000 / 60) / G.PEER_PX), life: G.ARROW_LIFE });
      }
    } else {
      /* the big bolt: three orbs' worth, one bolt (playerActions.js) */
      c.shots.push({ kind: 'big', dist: 14, at: now, dmg: Math.round(plainRoll('staff', base) * 2 * 3), special: true, R: G.R_BIGBOLT });
      this._sparRelay(c, { type: 'player_projectile', x: Math.round(ps.x), y: Math.round(ps.y), ang: a, isStaff: true, isSpecial: true,
        big: true, el, tg: c.owner, speedPx: G.BOLT_DRAWN_PX, life: Math.round(G.BOLT_RANGE / G.BOLT_DRAWN_PX) });
    }
    return true;
  },

  /* the gem the clone's weapon carries, as a page's claim names it */
  _sparElem(ps) {
    const w = ps.activeSlot === 'ranged' ? ps.rangedWeapon : ps.activeSlot === 'staff' ? ps.staffWeapon : ps.weapon;
    return (w && (w.element1 || null)) || null;
  },

  /* ── the sword's sweep: a claim at 0 / 90 / 180 ms while you are in reach
     (monsterCombat.js, v2.3.3260's page) ── */
  _sparSweep(c, ps, o, now) {
    if (!c.isSwinging) return;
    const age = now - c.swingAt;
    if (age >= G.SWING_CLEAR_MS) { c.isSwinging = false; c.specialSwing = false; return; }
    if (age >= G.SWEEP_MS || c.swingLanded === c.swingAt) return;
    if (!c.claims) c.claims = { n: 0, next: c.swingAt };
    if (c.claims.n >= G.CLAIMS_A_SWING || now < c.claims.next) return;
    if (dist(ps.x, ps.y, o.x, o.y) > G.MELEE_RANGE) return;
    c.claims.n++; c.claims.next = now + G.CLAIM_GAP_MS;
    const base = this._maxWeaponDmg(ps, false);
    const hit = this._sparClaim(c, ps, {
      kind: 'melee', x: ps.x, y: ps.y, angle: angTo(ps.x, ps.y, o.x, o.y),
      dmgBase: plainRoll('melee', base) * (c.specialSwing ? 3 : 1), critChance: 1,
      range: G.MELEE_RANGE, arc: G.MELEE_ARC, sw: c.swingSw, special: c.specialSwing || undefined,
      element: this._sparElem(ps) || undefined,
    });
    if (hit) c.swingLanded = c.swingAt;
  },

  /* ── the shots in the air: an arrow keeps its line, a bolt chases you
     (projectiles.js: a staff bolt re-aims every frame) ── */
  _sparFly(c, ps, o, now, dt) {
    if (!c.shots.length) return;
    const keep = [];
    for (const s of c.shots) {
      if (now < s.at) { keep.push(s); continue; }
      if (s.kind === 'arrow' || s.kind === 'volley') {
        const ax = s.x, ay = s.y;
        const step = s.speed * Math.min(dt, now - s.at + dt);
        s.x += Math.cos(s.ang) * step; s.y += Math.sin(s.ang) * step; s.travelled += step;
        if (segGap(o.x, o.y, ax, ay, s.x, s.y) < s.R) { this._sparShotLands(c, ps, o, s); continue; }
        if (s.travelled > s.flight) continue;
        keep.push(s);
      } else {
        s.dist += G.BOLT_SPEED * dt;
        const gap = dist(ps.x, ps.y, o.x, o.y) - s.R;
        if (s.dist >= gap) { this._sparShotLands(c, ps, o, s); continue; }
        if (s.dist > G.BOLT_RANGE) continue;
        keep.push(s);
      }
    }
    c.shots = keep;
  },

  _sparShotLands(c, ps, o, s) {
    const d = dist(ps.x, ps.y, o.x, o.y);
    this._sparClaim(c, ps, {
      kind: c.style === 'staff' ? 'staff' : 'ranged', x: ps.x, y: ps.y, angle: angTo(ps.x, ps.y, o.x, o.y),
      dmgBase: Math.max(1, s.dmg), critChance: 0, range: Math.min(940, Math.round(d + 60)), arc: 0.9,
      special: !!s.special, target: c.owner,
      orbs: s.kind === 'big' ? 3 : undefined, part: s.kind === 'volley' ? G.VOLLEY_N : undefined,
      element: this._sparElem(ps) || undefined,
    });
  },

  /* A clone's blow: the room's one door for a hit between players
     (combat.js _resolvePvPAttack), as a player_attack.  True when it was
     resolved against you (landed, blocked or dodged). */
  _sparClaim(c, ps, payload) {
    const mark = this.eventBuffer.length;
    this._resolvePvPAttack(c.sess, { ...payload, ts: Date.now() });
    for (let i = mark; i < this.eventBuffer.length; i++) {
      const e = this.eventBuffer[i];
      if (e && e.type === 'pvp_hit' && e.payload && e.payload.attacker === c.id && e.payload.target === c.owner) return true;
    }
    return false;
  },

  /* ── what the tick sends of it: where it is, how fast, which way ── */
  _sparWire(c, ps, o, now, dt, x0, y0) {
    const dx = ps.x - x0, dy = ps.y - y0;
    const moved = Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01;
    /* the page's velocity: px a 60 Hz frame, x100 (BroTown's move) */
    const k = dt > 0 ? (1000 / 60) / dt * 100 : 0;
    ps.vx = moved ? Math.round(dx * k) : 0;
    ps.vy = moved ? Math.round(dy * k) : 0;
    /* faces you while it fights, else the way it walks */
    const fighting = c.held || c.isSwinging || c.shield || c.dash || (now - c.swingTimer) < 600;
    const a = (moved && !fighting) ? Math.atan2(dy, dx) : angTo(ps.x, ps.y, o.x, o.y);
    ps.f = facing8(a); ps.d = dir4(a);
    if (moved) ps.lastMoveAt = now;
    const sig = Math.round(ps.x) + ',' + Math.round(ps.y) + ',' + ps.f + ',' + (ps.vx | 0) + ',' + (ps.vy | 0) + ',' + (c.sprinting ? 1 : 0);
    if (sig !== c.sent) { c.sent = sig; this.dirtyPlayers.add(c.id); }
  },
};
