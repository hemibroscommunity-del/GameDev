/* ═══ v2.3.2979: THE STAT SCENE IS A SIMULATION, NOT A STORYBOARD ═══
 *
 * Owner: "Make it so the preview of the combat skills stat allocation
 * confirmation window shows real simulation of the hits against a slime
 * monster.  These previews were made under a worse model."
 *
 * What StatDemo.jsx played until now was a storyboard: '12' then '24' for
 * Power, '10' and a '25' crit for Luck, a burn of 8 shrinking to 2 for
 * Resist -- the same numbers for every character, picked to exaggerate
 * (v2.3.2222's brief).  None of them was anything YOUR character would do,
 * and two of them described mechanics a slime does not have: its ball does
 * not burn you, and nothing in the game lets a burn tick for 8 off a level-1
 * slime fight.
 *
 * This module plays the fight instead.  Every number below comes out of the
 * game's own arithmetic, through the same client mirrors the rest of the UI
 * already predicts the worker with:
 *   - THE SLIME is the Starting Meadow's: archetype fodder at the zone's own
 *     floor level, built by createMonster -- 58 HP and a 10-damage ball today.
 *   - YOUR HIT is combat.js _computeAttackDamage step for step: the
 *     pre-variance base (combatHitBase -- the number the damage card prints),
 *     one draw from the weapon's band, the special multipliers, volatile,
 *     the crit roll and its 2x-top-of-range anchor, the flame amulet -- and
 *     then _handleMonsterDamage's own post-processing for the big bolt and
 *     the volley arrows.
 *   - THE NUMBER over the slime is toDisplayHitDamage -- the drop in its
 *     displayed HP, and the roll itself on the killing blow -- which is what
 *     a monster_hit pops in the world.
 *   - THE CADENCE is the auto-attack loop's (monsterCombat.js
 *     effectiveSwingCd): Speed points, the storm amulet, the bow's 0.825,
 *     the staff's +300.
 *   - BURN and ROOT tick the way elemental.js ticks them, off the power the
 *     status snapshotted when it landed; a flora weapon's thorns answer the
 *     slime's own attacks.
 *   - THE SLIME'S BALL on you is combat.js _applyDamage: the Dodge roll, the
 *     Defense cut under the combined floor, worn armour, floor 1.  Stamina
 *     pays the shield exactly as the worker charges it against a THROWN ball:
 *     the hold drain in _tickPlayerRegen, and nothing per ball caught (the
 *     ball's own block branch drains none).  The one elemental thing a slime does -- the blue slime's
 *     death burst -- is the only thing Resist is shown against, because it
 *     is the only slime damage Resist ever meets.
 *
 * THE SAME DICE, BOTH HALVES.  The scene plays the fight as you are, a point
 * lands, and the same fight plays again.  Both halves read ONE set of random
 * numbers, swing for swing (sceneDie: a hash of the loop's seed, the stream
 * and the swing index), so the only thing that differs between them is the
 * points -- a crit that appears in the second half is a roll that just missed
 * in the first.  The seed is fresh every loop, so a few loops show the real
 * spread rather than one lucky fight; the VERDICT line under the scene is the
 * long run, averaged over a fixed set of fights so it does not flicker.
 *
 * WHAT IT PROMISES, AND WHAT IT DOES NOT.  The worker rolls; this predicts.
 * statsim.test.mjs holds the roll to the worker's own _computeAttackDamage,
 * dice for dice, and the slime/ball/burst/stamina constants to the worker's
 * tables.  Situational layers the DPS readout also leaves out stay out here:
 * food and potion buffs, the hexer's curse, elemental collisions.
 *
 * Pure: no React, no DOM, no window.  StatDemo turns the beats into its
 * timeline; the server suite imports this file under plain node.
 */
import {
  WEAPON_TYPES, SWING_COOLDOWN, SPEED, swingCooldownMultFor, weaponSwingMult,
  combatHitBase, weaponVarBand, CRIT_ANCHOR_MULT, STAFF_BIG_BOLT_BAND,
  calcCritChance, calcCritMult, weaponCritStatFor, weaponCritFlatFor,
  toDisplayHitDamage, toDisplayDamage, toDisplayHp, DISPLAY_SCALE_K,
  createMonster, recalcDerived, getArmorDrPct, STATUS_DEFS, calcMoveSpeed,
  meleeRangeMult, bowRangeMult, staffRangeMult, GS_OUTER_RADIUS, BOW_RANGE_PX, STAFF_RANGE_PX,
} from '../../../data/gameSystems.js';
import {
  PROG3, prog3Live, prog3CatFor, prog3CritPct, prog3CritMult, prog3CritFlat,
  prog3SpecialMult, prog3ElemPower, prog3DodgePct, prog3DefPct, prog3EresPct,
  prog3MoveMult, prog3IsAtkStat,
} from '../../../data/prog3.js';
import { ZONES } from '../../../data/zones.js';
import { TILE } from '../../../data/constants.js';
import { ELEMENTS } from '../../../data/elements.js';
import { getAmuletBonus } from '../../../data/items.js';
import { rpgBlockSize } from '../../../data/abilities.js';
import { BOW_VOLLEY } from '../../../game/bowVolley.js';
import { withPoints, statCapped } from './statPreview.js';

/* ── the worker's constants this scene needs and the client had no copy of ──
   Each is a server literal; statsim.test.mjs reads the worker's own value
   (or measures its behaviour) and fails if one moves without the other. */
export const SLIME_THROW = {
  CD_MS: 2000,        /* index.js MONSTER_RANGED_BY_ARCH.fodder.cd */
  WINDUP_MS: 350,     /* telegraph.js BASIC_WINDUP.THROW_MS -- the arm going back */
  FLIGHT_MS: 650,     /* MONSTER_RANGED_BY_ARCH.fodder.travelMs */
};
/* v2.3.2979: ...and what it does INSTEAD once you stand inside its reach,
   which a melee hero always does: it swings (index.js -- the throw fires only
   in the band past the melee ring, "closing to melee switches it back to
   swinging").  No ball and no attack strip -- the world's slime throbs
   through the wind-up (entityRenderer _windupFx; the throw strip is gated
   off a swing) -- and a swing caught on a raised shield DOES cost stamina,
   where a ball costs none (reviewer-found: the first cut threw balls at
   everyone, so a sword-and-board guard read ~13s against a slime that would
   break it in ~7). */
export const SLIME_SWING = {
  CD_MS: 1500,        /* index.js MONSTER_ATTACK_CD -- the wind-up sits inside it */
  WINDUP_MS: 500,     /* telegraph.js BASIC_WINDUP.MS.fodder */
  BLOCK_COST: 10,     /* data.js BLOCK_STAMINA_COST x _blockStaminaMult, which is 1 on prog3 */
};
/* The worker's heartbeat (index.js TICK_RATE).  A burn's "every 0.5s" is
   checked on it and re-stamped to the tick that fired, so it really ticks
   every 23 x 22 = 506ms, a root every 1012 -- and a lone 4s burn ticks 7
   times, not 8 (reviewer-found; statsim.test counts the worker's). */
export const SERVER_TICK_MS = 22;
export const BLUE_BURST = {
  DMG: 60,            /* telegraph.js SLIME_BURST.DMG -- flat, ELEMENTAL */
  MAX_HIT_PCT: 0.5,   /* telegraph.js TELEGRAPH.MAX_HIT_PCT -- never more than half your max HP */
  SWELL_MS: 1600,     /* SLIME_BURST.SWELL_MS -- the swell is the only warning */
};
/* What holding a shield costs.  NOT the 10 a blocked hit costs
   (BLOCK_STAMINA_COST): that is charged on a blocked melee SWING
   (SLIME_SWING.BLOCK_COST) -- the worker resolves a ball that meets a raised
   shield in its projectile branch (index.js, the in-flight ball) with no
   stamina drain at all ("that cost is tied to the melee cadence").  So
   against a ball the only cost is the hold, and statsim.test measures the
   worker doing exactly that rather than pinning a constant. */
export const GUARD = {
  HOLD_DRAIN: 5,      /* _tickPlayerRegen: holding the shield, per regen tick */
  REGEN: 7,           /* _tickPlayerRegen: not holding, per regen tick */
  TICK_MS: 660,       /* the regen tick: 30 server ticks x TICK_RATE 22 */
  BREAK_MS: 3000,     /* GUARD_BREAK_MS -- the lockout when the bar empties */
  PARRY_MS: 250,      /* PARRY_WINDOW_MS -- a block this soon after raising is a parry */
};
/* entityRenderer SLIME_DEATH_MS -- the splat the world plays. */
export const SLIME_DEATH_MS = 400;

/* Presentation beats, not mechanics: when the first swing goes, how long the
   slime takes to hop back in after a kill, and how long a pass rests on its
   last frame.  The impact delays are Script.strike()'s, unchanged, so a blade
   still lands when it visibly connects and an arrow when it arrives. */
const LEAD_MS = 350;
const RESPAWN_MS = 350;
const TAIL_MS = 700;
const IMPACT_MS = { melee: 160, ranged: 200 };
/* The slime's attack on THIS hero: a ball against a bow or a staff (you
   stand off), a swing against anything held at arm's length.  `hitAt` is
   when it resolves, from the start of its wind-up. */
function slimeAttack(ranged) {
  return ranged
    ? { kind: 'throw', cd: SLIME_THROW.CD_MS, hitAt: SLIME_THROW.WINDUP_MS + SLIME_THROW.FLIGHT_MS }
    : { kind: 'swing', cd: SLIME_SWING.CD_MS, hitAt: SLIME_SWING.WINDUP_MS };
}
const isRangedWeapon = (w) => !!w && (w.type === 'bow' || w.type === 'staff');
/* A pass is a few seconds, not a fight to the bitter end: up to this long,
   and never fewer than MIN_SWINGS (a character that one-shots a slime fights
   three of them, so a crit chance has three rolls to show itself in). */
const PASS_MS = 4200;
const MIN_SWINGS = 3;
const MAX_SWINGS = 7;
/* The verdict's long run: this many fights, on these dice, every time. */
const VERDICT_FIGHTS = 400;
const VERDICT_SEED = 0x5eed2957;

/* ── dice ───────────────────────────────────────────────────────────────
   Stateless on purpose: sceneDie(seed, stream, i) is the same number however
   many times it is asked and in whatever order, which is what lets the two
   halves of a scene share a roll without sharing a cursor.  v2.3.2979: a
   fight's i is slime k's hit j (fightPass), not the loop's swing n. */
function mix32(x) {
  x = (x + 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}
export function sceneDie(seed, stream, i) {
  return mix32((seed >>> 0) ^ mix32(((stream & 0xffff) << 16) + (i & 0xffff))) / 4294967296;
}
const D = { VAR: 1, CRIT: 2, DODGE: 3, SP_VAR: 4, SP_CRIT: 5, SP_VAR2: 6, SP_CRIT2: 7, SP_VAR3: 8, SP_CRIT3: 9 };
export function newSceneSeed() {
  return (Math.floor(Math.random() * 4294967296) >>> 0) || 1;
}

/* ── the slime ────────────────────────────────────────────────────────── */
/** The Starting Meadow's slime as the worker spawns it at the zone's floor
 *  level (_makeZoneMonster; createMonster is its client mirror).  The blue
 *  slime is the Verdant Wilds' -- only its burst is used. */
export function sceneSlime() {
  const z = ZONES.meadow || {};
  const lvl = Math.max(1, (z.level && z.level[0]) || 1);
  const arch = (z.spawns && z.spawns[0] && z.spawns[0].arch) || 'fodder';
  const m = createMonster('statsim', arch, lvl, 0, 0, z.element || null);
  return { level: lvl, hp: m.maxHp, dmg: m.dmg, arch };
}
/* The blue slime's level -- the Verdant Wilds' floor, where it spawns.  Only
   its level matters (the EDGE on Resist); its burst is flat. */
function blueSlimeLevel() {
  const z = ZONES.verdant || {};
  return Math.max(1, (z.level && z.level[0]) || 1);
}

/* ── your hit ─────────────────────────────────────────────────────────── */
function critOf(R, wpn, mlvl) {
  /* calcDisplayDps' own branch, so the scene and the DPS row beside it agree
     against either kind of worker (rule 19). */
  const cat = prog3CatFor(wpn.type);
  if (prog3Live(R)) {
    return { chance: prog3CritPct(R, cat, mlvl), mult: prog3CritMult(R, cat, mlvl), flat: prog3CritFlat(R, cat) };
  }
  return {
    chance: calcCritChance((R && R.power) || 0, weaponCritStatFor(R, wpn.type)),
    mult: calcCritMult((R && R.power) || 0),
    flat: weaponCritFlatFor(R, wpn.type),
  };
}

/** The auto-attack's period for THIS weapon, as monsterCombat's
 *  effectiveSwingCd + _staffCdExtra compute it for the weapon in hand. */
export function autoSwingMs(R, wpn) {
  const ab = R && getAmuletBonus(R.amulet);
  const amu = (ab && ab.stat === 'atkSpd') ? 1 + ab.value / 100 : 1;
  const cd = Math.max(200, Math.floor(SWING_COOLDOWN * swingCooldownMultFor(R, wpn.type) * weaponSwingMult(wpn.type) / amu));
  return cd + (wpn.type === 'staff' ? 300 : 0);
}

/** Everything one weapon's hit needs, resolved once.  Null without a weapon:
 *  the auto-attack does not swing an empty hand, so neither does the scene. */
export function offenseOf(R, wpn, slime) {
  if (!R || !wpn || !WEAPON_TYPES[wpn.type]) return null;
  const mlvl = slime ? slime.level : undefined;
  const hb = combatHitBase(R, wpn, mlvl);
  if (!hb) return null;
  const band = weaponVarBand(wpn.type);
  const cat = prog3CatFor(wpn.type);
  const ab = getAmuletBonus(R.amulet);
  const el = wpn.element1 || null;
  return {
    type: wpn.type, cat,
    ranged: wpn.type === 'bow' || wpn.type === 'staff',
    base: hb.base, flat: hb.flat, band,
    /* the anchor's "top of the range" -- the weapon's OWN band, even for a
       big bolt drawing from a wider one (combat.js v2.3.2849) */
    rangeTop: hb.base * band[1] + hb.flat,
    crit: critOf(R, wpn, mlvl),
    specMult: (wpn.type === 'staff' ? 2.0 : 3.0) * prog3SpecialMult(R, cat, mlvl),
    volatile: !!wpn.isVolatile,
    /* the flame-gem amulet, on an elemental weapon only (combat.js v2.3.1139) */
    amulet: (ab && ab.stat === 'elemDmg' && el) ? 1 + ab.value / 100 : 1,
    period: autoSwingMs(R, wpn),
    element: el,
    status: el && ELEMENTS[el] ? ELEMENTS[el].status : null,
    elemPower: prog3ElemPower(R, cat, mlvl),
  };
}

/** _computeAttackDamage, line for line, with the two Math.random() draws it
 *  makes handed in -- the variance first, the crit second.  `band` replaces
 *  the DRAW band only (the big bolt); the anchor keeps the weapon's own. */
export function rollHit(off, uVar, uCrit, special, band) {
  const b = band || off.band;
  let dmg = off.base * (b[0] + uVar * (b[1] - b[0])) + off.flat;
  if (special) dmg *= off.specMult;
  if (off.volatile) dmg *= 1.30;
  const isCrit = uCrit < off.crit.chance;
  if (isCrit) dmg = Math.max(dmg * off.crit.mult, off.rangeTop * CRIT_ANCHOR_MULT) + off.crit.flat;
  dmg *= off.amulet;
  return { dmg: Math.max(1, Math.round(dmg)), isCrit };
}

/** _handleMonsterDamage's handling of what the roll returned: a big bolt is
 *  worth the orbs it spent, a volley arrow WORTH/part of a special, and the
 *  credited figure is rounded once more (x the fracture mult, 1 on a slime). */
export function landedDmg(rolled, orbs, part) {
  let dmg = rolled.dmg;
  if (orbs > 1) dmg *= orbs;
  if (part > 1) dmg = dmg * Math.min(1, BOW_VOLLEY.WORTH / part);
  return Math.max(1, Math.round(Math.max(1, dmg)));
}

/* The status a normal hit leaves -- monsterCombat sends the weapon's FIRST
   element on an ordinary swing.  Burn and root are the two that tick, priced
   off the power snapshot exactly as elemental.js tickElementStatuses does. */
export function dotOf(off) {
  const id = off.status;
  const def = id && STATUS_DEFS[id];
  if (!def || !def.tick) return null;
  const per = id === 'burn' ? 5 + off.elemPower * 0.3 : id === 'root' ? 3 + off.elemPower * 0.15 : 0;
  if (!(per > 0)) return null;
  return {
    id, raw: Math.round(per), tickMs: Math.ceil(def.tick * 1000 / SERVER_TICK_MS) * SERVER_TICK_MS,
    durMs: def.dur * 1000, refreshMs: (def.refresh || 0) * 1000, maxMs: (def.maxDur || def.dur) * 1000,
  };
}
/* Flora's thorn: no tick -- it answers the slime's OWN attack (index.js
   _monsterStrikePlayer), 4 + power x 0.25. */
export function thornOf(off) {
  return off.status === 'thorn' ? Math.round(4 + off.elemPower * 0.25) : 0;
}

/* ── the slime hitting you ────────────────────────────────────────────── */
/** One slime ball against this character: what lands when it is not dodged,
 *  and the chance it is.  _applyDamage's prog3 path; the edge reads the
 *  slime's level, so a point counts in full against a slime below you. */
export function takenOf(R, slime) {
  const mlvl = slime.level;
  const r = Math.max(1, Math.round(slime.dmg));
  const p3 = !!(R && R.prog3);
  const dodge = p3 ? prog3DodgePct(R, mlvl) : Math.min(((R && R.agility) || 0) * 0.0008, 0.50);
  let dmg = Math.max(1, r);
  if (p3) {
    /* v2.3.2680's combined floor: Defense is held so (1 - dodge) x cut never
       lets less than PROG3.FLOOR of a base hit through. */
    const defMult = 1 - prog3DefPct(R, mlvl);
    const cut = Math.max(defMult, PROG3.FLOOR / Math.max(0.01, 1 - dodge));
    if (cut < 1) dmg = Math.max(1, Math.round(dmg * cut));
  }
  const armor = 1 - getArmorDrPct(R);
  if (armor < 1) dmg = Math.max(1, Math.round(dmg * armor));
  return { dmg, dodge };
}
/** The blue slime's burst: flat, ELEMENTAL -- so Dodge and Defense never meet
 *  it and Resist is the only cut (combat.js v2.3.2680) -- and never more than
 *  half your max HP (telegraph.js MAX_HIT_PCT). */
export function burstOf(R) {
  const maxHp = (R && R.maxHp) || 100;
  const raw = Math.min(Math.ceil(BLUE_BURST.DMG), Math.max(1, Math.floor(maxHp * BLUE_BURST.MAX_HIT_PCT)));
  let dmg = Math.max(1, Math.round(raw));
  if (R && R.prog3) {
    const mult = 1 - prog3EresPct(R, blueSlimeLevel());
    if (mult < 1) dmg = Math.max(1, Math.round(dmg * mult));
  }
  const armor = 1 - getArmorDrPct(R);
  if (armor < 1) dmg = Math.max(1, Math.round(dmg * armor));
  return dmg;
}

/* The derived pools a point changes (max HP, max stamina, the stamina block
   count), read through recalcDerived on a COPY -- the same mirror of the
   worker's _prog3Recompute every echo is measured against.  The live
   character is never touched. */
function pooled(R) {
  if (!R) return R;
  let c;
  try { c = JSON.parse(JSON.stringify(R)); } catch (e) { return R; }
  return derived(c);
}
/* ...and on a copy the caller already owns, in place. */
function derived(c) {
  if (c && prog3Live(c)) { try { recalcDerived(c); } catch (e) { /* keep the copy as it was */ } }
  return c;
}

/* ── a pass: the fight ────────────────────────────────────────────────── */
/* Beats are {t, k, ...} with t in ms from the start of the pass:
     atk    the hero swings / looses (ranged true: a projectile crosses)
     hit    the impact: text, crit, hp/max of the slime, kill
     tick   a burn/root tick: text, status, hp/max, kill
     death  the slime's splat;  spawn  the next one hops in (hp/max)
     throw  the slime winds up and throws;  swing  it winds up a swing
            (a hero at arm's length -- slimeAttack);  land  either resolves:
            text, kind 'hurt' | 'dodged' | 'blocked' | 'miss', hero hp/max
     recoil thorns answer an attack: text on the slime
   The pass also says what the bars start at, and when it is over. */
function fightPass(off, slime, seed, opts) {
  const o = opts || {};
  const beats = [];
  const imp = off.ranged ? IMPACT_MS.ranged : IMPACT_MS.melee;
  const dot = o.noDot ? null : dotOf(off);
  /* o.attacks: the slime fights back (flora's scene, for its thorn) -- with
     the attack it really uses on this hero */
  const atk = o.attacks ? slimeAttack(off.ranged) : null;
  const thorn = atk ? thornOf(off) : 0;
  const swingCap = o.swings || swingCapFor(off);
  /* `kills`: the AFTER half fights exactly as many slimes as the BEFORE half
     put down, so the two are the same job and the second can only finish
     sooner.  Unset (the before half), a pass ends at its first kill once it
     has swung MIN_SWINGS times. */
  const wantKills = o.kills || 0;
  let hp = slime.hp, swings = 0, hitsHere = 0, strikes = 0, kills = 0;
  let nextSwing = LEAD_MS, lastAt = LEAD_MS, alive = true;
  let dotSt = null;        /* {next, until}: a burn/root ticking on this slime */
  let thornUntil = -1;     /* a thorn on this slime answers its attacks until then */
  let nextAtk = atk ? LEAD_MS + 250 : Infinity;
  const firstKill = { hits: 0, ms: 0 };
  let endAt = -1;
  /* Once the swings are spent, a burn still on the slime is shown for a
     moment longer, not to the end of a status that can run six seconds. */
  let quitAt = Infinity;
  const kill = (t) => {
    kills++;
    if (!firstKill.hits) { firstKill.hits = hitsHere; firstKill.ms = t - LEAD_MS; }
    beats.push({ t, k: 'death' });
    dotSt = null; thornUntil = -1; alive = false;
    const enough = wantKills ? kills >= wantKills : swings >= Math.min(MIN_SWINGS, swingCap);
    if (enough || swings >= swingCap) { endAt = t + SLIME_DEATH_MS + TAIL_MS; return; }
    /* a character that kills in fewer than MIN_SWINGS meets the next slime,
       so the roll has a few chances to show what it does */
    const back = t + SLIME_DEATH_MS + RESPAWN_MS;
    beats.push({ t: back, k: 'spawn', hp: slime.hp, max: slime.hp });
    hp = slime.hp; hitsHere = 0; alive = true;
    nextSwing = Math.max(nextSwing, back + 120);
    if (atk) nextAtk = Math.max(nextAtk, back + 300);
  };
  for (let guard = 0; guard < 400 && endAt < 0; guard++) {
    const swingAt = swings < swingCap ? nextSwing : Infinity;
    const impactAt = swingAt + imp;
    const tickAt = (dotSt && dotSt.next <= dotSt.until) ? dotSt.next : Infinity;
    /* the slime keeps throwing only while there is still a fight to have */
    const landAt = (atk && (swings < swingCap || thornUntil >= nextAtk)) ? nextAtk + atk.hitAt : Infinity;
    const first = Math.min(impactAt, tickAt, landAt);
    if (first === Infinity || first > quitAt) { endAt = lastAt + TAIL_MS; break; }
    if (first === tickAt) {
      const before = hp;
      hp = Math.max(0, hp - dot.raw);
      beats.push({ t: tickAt, k: 'tick', text: String(toDisplayHitDamage(before, hp, dot.raw)), status: dot.id, element: off.element, hp, max: slime.hp, kill: hp <= 0 });
      lastAt = tickAt;
      dotSt.next += dot.tickMs;
      if (hp <= 0) kill(tickAt);
      continue;
    }
    if (first === landAt) {
      /* the slime's ball or swing resolves (flora's scene only) -- and a
         thorn on the slime answers it, landed or dodged (index.js: the recoil
         follows the attack, not the damage) */
      beats.push({ t: nextAtk, k: atk.kind });
      const dodged = sceneDie(seed, D.DODGE, strikes) < o.taken.dodge;
      beats.push(dodged
        ? { t: landAt, k: 'land', text: 'Dodged!', kind: 'dodged' }
        : { t: landAt, k: 'land', text: '-' + toDisplayDamage(Math.ceil(o.taken.dmg)), kind: 'hurt' });
      strikes++;
      lastAt = landAt;
      nextAtk += atk.cd;
      /* AT landAt, the instant the attack resolves -- the worker answers in
         the same strike.  It used to be drawn 60ms later but applied here, ahead
         of an arrow landing inside those 60ms: the arrow killed the slime,
         then the thorn popped on the corpse and refilled its bar. */
      if (thorn > 0 && alive && thornUntil >= landAt) {
        const before = hp;
        hp = Math.max(0, hp - thorn);
        beats.push({ t: landAt, k: 'recoil', text: String(toDisplayHitDamage(before, hp, thorn)), element: off.element, hp, max: slime.hp, kill: hp <= 0 });
        if (hp <= 0) kill(landAt);
      }
      continue;
    }
    /* a swing, and its impact.  The dice are SLIME k's hit j, not the pass's
       swing n: a burn/root tick can finish a slime BETWEEN swings, and when
       the points change whether slime 1 falls to a tick or to a swing, a
       pass-wide count hands every later slime the other half's rolls -- the
       "+n" half then visibly crits less and finishes later (reviewer-found,
       ~6% of loops for Speed on a flame sword).  Keyed per slime, each slime
       meets the same rolls in both halves, whatever finished the last one. */
    beats.push({ t: swingAt, k: 'atk', ranged: off.ranged });
    const die = kills * 64 + hitsHere;
    const r = rollHit(off, sceneDie(seed, D.VAR, die), sceneDie(seed, D.CRIT, die), false);
    const raw = landedDmg(r, 1, 1);
    swings++; hitsHere++;
    const before = hp;
    hp = Math.max(0, hp - raw);
    beats.push({ t: impactAt, k: 'hit', text: String(toDisplayHitDamage(before, hp, raw)), crit: r.isCrit, raw, hp, max: slime.hp, kill: hp <= 0 });
    lastAt = impactAt;
    nextSwing = swingAt + off.period;
    if (swings >= swingCap) quitAt = impactAt + 1500;
    if (hp <= 0) { kill(impactAt); continue; }
    /* applyElementStatus, after the hit and only on a live slime: a new
       status starts its own clock; a re-hit extends it by `refresh`, up to
       maxDur from now. */
    if (dot) {
      if (dotSt) dotSt.until = impactAt + Math.min(dotSt.until - impactAt + dot.refreshMs, dot.maxMs);
      else dotSt = { next: impactAt + dot.tickMs, until: impactAt + dot.durMs };
    } else if (thorn > 0) {
      const td = STATUS_DEFS.thorn;
      thornUntil = thornUntil > impactAt
        ? impactAt + Math.min(thornUntil - impactAt + td.refresh * 1000, td.maxDur * 1000)
        : impactAt + td.dur * 1000;
    }
  }
  return {
    beats, end: Math.max(endAt, lastAt + TAIL_MS),
    slime: { hp: slime.hp, max: slime.hp },
    swings, swingCap, kills, firstKill, hpLeft: hp,
  };
}
/* How many swings a pass may take: about PASS_MS of fighting at this
   weapon's cadence, never under MIN_SWINGS or over MAX_SWINGS. */
function swingCapFor(off) {
  return Math.max(MIN_SWINGS, Math.min(MAX_SWINGS, Math.floor((PASS_MS - LEAD_MS) / off.period) + 1));
}
/* The two halves of a fight scene: the before half sets the job (its swing
   allowance and the slimes it put down), the after half does the same job
   with the points. */
function fightPair(o0, o1, slime, seed, opt0, opt1) {
  const p0 = fightPass(o0, slime, seed, opt0);
  if (!o1) return [p0, null];
  const p1 = fightPass(o1, slime, seed, Object.assign({}, opt1 || {}, { swings: p0.swingCap, kills: Math.max(1, p0.kills) }));
  return [p0, p1];
}

/* The verdict for a fight: the swings it takes to put one slime down, and
   the swing-time that costs you (swings x your cadence -- the next swing is
   not ready any sooner because the slime died, so a burn that finishes it
   between swings saves the swings it saved and no more).  Measured that way,
   Speed shows even for a character that one-shots a slime: the slime still
   costs one swing, and the swing is shorter.  Averaged over VERDICT_FIGHTS
   fights on a FIXED set of dice -- the long run, stable from one render to
   the next.  A fight still going after 60 swings is scored at 60.
   `attacks`: the slime fights back as it does in the flora scene, and a
   thorn on it answers each attack -- the worker routes the slime's swing and
   its ball through the same strike (_monsterStrikePlayer), so the thorn
   answers either, at the cadence of whichever this hero meets (slimeAttack:
   a swing every 1.5s at arm's length, a ball every 2s at range). */
export function killStats(off, slime, opts) {
  if (!off) return null;
  const dot = dotOf(off);
  const atk = (opts && opts.attacks) ? slimeAttack(off.ranged) : null;
  const thorn = atk ? thornOf(off) : 0;
  const imp = off.ranged ? IMPACT_MS.ranged : IMPACT_MS.melee;
  const firstLand = atk ? 250 + atk.hitAt : Infinity;   /* fightPass' first attack */
  const td = STATUS_DEFS.thorn;
  let swingSum = 0;
  for (let f = 0; f < VERDICT_FIGHTS; f++) {
    const seed = mix32(VERDICT_SEED + f);
    let hp = slime.hp, swings = 0, status = null, thornUntil = -1, dead = false;
    let nextLand = thorn > 0 ? firstLand : Infinity;
    while (swings < 60 && !dead) {
      const impactAt = swings * off.period + imp;
      /* whatever lands before this swing does, in time order: burn/root
         ticks, and thorns answering the slime's attacks */
      for (;;) {
        const tickAt = (status && status.next <= status.until) ? status.next : Infinity;
        const t = Math.min(tickAt, nextLand);
        if (!(t < impactAt)) break;
        if (t === tickAt) { hp -= dot.raw; status.next += dot.tickMs; }
        else { if (thornUntil >= nextLand) hp -= thorn; nextLand += atk.cd; }
        if (hp <= 0) { dead = true; break; }
      }
      if (dead) break;
      const r = rollHit(off, sceneDie(seed, D.VAR, swings), sceneDie(seed, D.CRIT, swings), false);
      hp -= landedDmg(r, 1, 1);
      swings++;
      if (hp <= 0) { dead = true; break; }
      if (dot) {
        if (status) status.until = impactAt + Math.min(status.until - impactAt + dot.refreshMs, dot.maxMs);
        else status = { next: impactAt + dot.tickMs, until: impactAt + dot.durMs };
      } else if (thorn > 0) {
        thornUntil = thornUntil > impactAt
          ? impactAt + Math.min(thornUntil - impactAt + td.refresh * 1000, td.maxDur * 1000)
          : impactAt + td.dur * 1000;
      }
    }
    swingSum += swings;
  }
  const hits = swingSum / VERDICT_FIGHTS;
  return { hits, secs: hits * off.period / 1000 };
}

/* ── a pass: the special ──────────────────────────────────────────────── */
/* One ordinary hit, then the special -- the shape the worker rolls for the
   weapon in hand.  caps say which shape the CONNECTED worker settles:
   bowvolley -> three arrows, each WORTH/3 of a special; bigorb -> one big
   bolt from its own band, worth three orbs; neither -> the old one arrow,
   or three separate orbs. */
function specialShots(off, caps) {
  const c = caps || {};
  if (off.type === 'bow') return c.bowvolley ? { n: BOW_VOLLEY.N, part: BOW_VOLLEY.N, orbs: 1, band: null, gapMs: 200 } : { n: 1, part: 1, orbs: 1, band: null, gapMs: 0 };
  if (off.type === 'staff') return c.bigorb ? { n: 1, part: 1, orbs: 3, band: STAFF_BIG_BOLT_BAND, gapMs: 0 } : { n: 3, part: 1, orbs: 1, band: null, gapMs: 90 };
  return { n: 1, part: 1, orbs: 1, band: null, gapMs: 0 };
}
const SP_DICE = [[D.SP_VAR, D.SP_CRIT], [D.SP_VAR2, D.SP_CRIT2], [D.SP_VAR3, D.SP_CRIT3]];
function specialPass(off, slime, seed, caps) {
  const beats = [];
  const imp = off.ranged ? IMPACT_MS.ranged : IMPACT_MS.melee;
  let hp = slime.hp, lastAt = LEAD_MS;
  /* the ordinary hit -- the yardstick the special is read against; the
     Special stat does not touch it, so it is the same number both halves */
  beats.push({ t: LEAD_MS, k: 'atk', ranged: off.ranged });
  const r0 = rollHit(off, sceneDie(seed, D.VAR, 0), sceneDie(seed, D.CRIT, 0), false);
  const raw0 = landedDmg(r0, 1, 1);
  let before = hp;
  hp = Math.max(0, hp - raw0);
  lastAt = LEAD_MS + imp;
  beats.push({ t: lastAt, k: 'hit', text: String(toDisplayHitDamage(before, hp, raw0)), crit: r0.isCrit, raw: raw0, hp, max: slime.hp, kill: hp <= 0 });
  /* the special, a beat later (it spends the swing clock -- playerActions).
     If the ordinary hit already put this slime down, the special goes into
     the next one. */
  let at = LEAD_MS + Math.max(off.period, 700);
  if (hp <= 0) {
    beats.push({ t: lastAt, k: 'death' });
    const back = lastAt + SLIME_DEATH_MS + RESPAWN_MS;
    beats.push({ t: back, k: 'spawn', hp: slime.hp, max: slime.hp });
    hp = slime.hp;
    at = Math.max(at, back + 200);
  }
  const sp = specialShots(off, caps);
  beats.push({ t: at, k: 'special', ranged: off.ranged, shots: sp.n, big: sp.orbs > 1, gapMs: sp.gapMs });
  let total = 0;
  for (let j = 0; j < sp.n; j++) {
    const dice = SP_DICE[j] || SP_DICE[0];
    const r = rollHit(off, sceneDie(seed, dice[0], 0), sceneDie(seed, dice[1], 0), true, sp.band);
    const raw = landedDmg(r, sp.orbs, sp.part);
    total += raw;
    if (hp <= 0) continue;
    before = hp;
    hp = Math.max(0, hp - raw);
    const t = at + imp + j * sp.gapMs;
    lastAt = t;
    beats.push({ t, k: 'hit', text: String(toDisplayHitDamage(before, hp, raw)), crit: r.isCrit, raw, hp, max: slime.hp, kill: hp <= 0, special: true, dx: (j - (sp.n - 1) / 2) * 16 });
    if (hp <= 0) beats.push({ t, k: 'death' });
  }
  return { beats, end: lastAt + (hp <= 0 ? SLIME_DEATH_MS : 0) + TAIL_MS, slime: { hp: slime.hp, max: slime.hp }, total };
}
function specialStats(off, caps) {
  const sp = specialShots(off, caps);
  let sum = 0;
  for (let f = 0; f < VERDICT_FIGHTS; f++) {
    const seed = mix32(VERDICT_SEED + f);
    for (let j = 0; j < sp.n; j++) {
      const dice = SP_DICE[j] || SP_DICE[0];
      sum += landedDmg(rollHit(off, sceneDie(seed, dice[0], 0), sceneDie(seed, dice[1], 0), true, sp.band), sp.orbs, sp.part);
    }
  }
  return sum / VERDICT_FIGHTS;
}

/* ── a pass: the mana bar ─────────────────────────────────────────────── */
/* ═══ v2.3.3008: MAX MP GETS ITS SCENE ═══
   Owner: "add a max mp before and after for the simulation stat allocation
   confirmation window it's the only one missing one" -- every other body
   stat's window played its fight; Max MP's had none (SIM_STATS left it out).

   What a bigger bar buys is CASTS.  A special costs one BLOCK of it
   (prog3.js specialManaCost: maxMana / manaBlocks), and the block count
   climbs the ladder the worker counts (blocksAt: 5, then one more every 20
   points of Magic level + Max MP points).  So the scene is the bar: the hero
   casts his special at the slime until it cannot pay for another, the bar a
   block lighter each time, and the "+n" lane's bar drawn as much longer as
   the points make it.  A point that crosses a rung shows its extra cast;
   one that does not shows the honest answer, the same casts from a bigger
   bar.  The same dice both halves, cast for cast (sceneDie's index is the
   cast).  No regen: "on a full bar" is the question. */
/** Specials a full bar pays for (one block each). */
export function specialsOnABar(R) {
  const max = (R && R.maxMana) || 100;
  return Math.floor(max / rpgBlockSize(R, 'mana'));
}
const MANA_CASTS_MAX = 12;   /* the ladder tops out at 10 blocks */
function manaPass(off, R, slime, seed, caps) {
  const max = (R && R.maxMana) || 100;
  const cost = rpgBlockSize(R, 'mana');
  const bar = { kind: 'mana', cur: max, max };
  /* nothing in hand: the bar alone, full -- its length is still the answer */
  if (!off) return { beats: [], end: LEAD_MS + TAIL_MS, bar };
  const beats = [];
  const imp = off.ranged ? IMPACT_MS.ranged : IMPACT_MS.melee;
  const sp = specialShots(off, caps);
  const gap = Math.max(off.period, 700);
  let mp = max, hp = slime.hp, at = LEAD_MS, lastAt = LEAD_MS;
  for (let c = 0; mp >= cost && c < MANA_CASTS_MAX; c++) {
    if (hp <= 0) {
      const back = lastAt + SLIME_DEATH_MS + RESPAWN_MS;
      beats.push({ t: back, k: 'spawn', hp: slime.hp, max: slime.hp });
      hp = slime.hp;
      at = Math.max(at, back + 200);
    }
    mp -= cost;
    beats.push({ t: at, k: 'special', ranged: off.ranged, shots: sp.n, big: sp.orbs > 1, gapMs: sp.gapMs });
    beats.push({ t: at, k: 'mana', cur: mp });
    for (let j = 0; j < sp.n; j++) {
      const dice = SP_DICE[j] || SP_DICE[0];
      const r = rollHit(off, sceneDie(seed, dice[0], c), sceneDie(seed, dice[1], c), true, sp.band);
      const raw = landedDmg(r, sp.orbs, sp.part);
      if (hp <= 0) continue;
      const before = hp;
      hp = Math.max(0, hp - raw);
      const t = at + imp + j * sp.gapMs;
      lastAt = t;
      beats.push({ t, k: 'hit', text: String(toDisplayHitDamage(before, hp, raw)), crit: r.isCrit, raw, hp, max: slime.hp, kill: hp <= 0, special: true, dx: (j - (sp.n - 1) / 2) * 16 });
      if (hp <= 0) beats.push({ t, k: 'death' });
    }
    at += gap;
  }
  /* the bar cannot pay for the next one: said where it would have gone */
  beats.push({ t: at, k: 'nomana', text: 'Out of mana' });
  return { beats, end: at + 600 + TAIL_MS, slime: { hp: slime.hp, max: slime.hp }, bar };
}

/* ── a pass: reach ────────────────────────────────────────────────────── */
/** How far this weapon reaches, in world px: melee's swing ring, the arrow's
 *  plant cap, the bolt's flight (life x speed), each x its lane's Range. */
export function reachOf(R, off) {
  if (!off) return 0;
  if (off.type === 'bow') return BOW_RANGE_PX * bowRangeMult(R);
  if (off.type === 'staff') return STAFF_RANGE_PX * staffRangeMult(R);
  return GS_OUTER_RADIUS * meleeRangeMult(R);
}
/* A slime standing `dist` away: if it is past your reach the attack stops
   short (`frac` of the way there) and nothing lands; inside it, it is the
   ordinary fight's hits. */
function reachPass(off, slime, seed, reach, dist) {
  /* two swings is the whole story: it reaches, and it lands what it always did */
  if (reach >= dist) return fightPass(off, slime, seed, { noDot: true, swings: 2 });
  const beats = [];
  const frac = Math.max(0, Math.min(1, reach / dist));
  for (let i = 0; i < 2; i++) {
    const t = LEAD_MS + i * Math.max(off.period, 900);
    beats.push({ t, k: 'short', ranged: off.ranged, frac });
    beats.push({ t: t + (off.ranged ? 340 : 240), k: 'miss', text: 'Short!' });
  }
  return { beats, end: LEAD_MS + Math.max(off.period, 900) + 240 + TAIL_MS, slime: { hp: slime.hp, max: slime.hp } };
}

/* ── a pass: the slime's attacks on you ───────────────────────────────── */
/* A ball against a bow or a staff, a swing against anything else
   (slimeAttack) -- the same m.dmg either way (index.js: "the impact uses the
   same m.dmg the swing does"), so only the picture and the rhythm differ. */
function hitsPass(R, slime, seed, n, ranged) {
  const beats = [];
  const tk = takenOf(R, slime);
  const atk = slimeAttack(ranged);
  let hp = (R && R.maxHp) || 100;
  const max = hp;
  for (let i = 0; i < n; i++) {
    const t = LEAD_MS + i * atk.cd;
    const land = t + atk.hitAt;
    beats.push({ t, k: atk.kind });
    if (sceneDie(seed, D.DODGE, i) < tk.dodge) {
      beats.push({ t: land, k: 'land', text: 'Dodged!', kind: 'dodged', hp: toDisplayHp(hp), max: toDisplayHp(max), dodge: true });
    } else {
      hp = Math.max(0, hp - tk.dmg);
      beats.push({ t: land, k: 'land', text: '-' + toDisplayDamage(Math.ceil(tk.dmg)), kind: 'hurt', hp: toDisplayHp(hp), max: toDisplayHp(max) });
    }
  }
  const end = LEAD_MS + (n - 1) * atk.cd + atk.hitAt + TAIL_MS;
  return { beats, end, bar: { kind: 'hp', cur: toDisplayHp(max), max: toDisplayHp(max) } };
}
/* How many of the slime's attacks it takes to put you down from full: the
   ones that land, over the share that is not dodged.  Exact -- no dice. */
export function hitsToDown(R, slime) {
  const tk = takenOf(R, slime);
  const maxHp = (R && R.maxHp) || 100;
  const landing = Math.ceil(maxHp / tk.dmg);
  return landing / Math.max(0.01, 1 - tk.dodge);
}

/* ── a pass: stamina ──────────────────────────────────────────────────── */
/* WITH a shield: you hold your guard through the slime's attacks.  Holding
   drains HOLD_DRAIN every regen tick; a ball caught on it costs nothing more
   (GUARD's note), a SWING caught on it costs SLIME_SWING.BLOCK_COST; at zero
   the guard breaks.  WITHOUT one: you roll out of each attack, and a roll is
   one stamina block (rpgBlockSize), refilled at REGEN a tick between.
   Which attack is slimeAttack's: a swing unless you hold a bow or a staff. */
export function guardHoldMs(R, ranged) {
  const max = (R && R.maxStamina) || 100;
  /* The LONG RUN, like the fight's verdict: the regen tick and the slime's
     swing fall at no fixed point after you raise the shield, so this is the
     break averaged over every phase of both -- the regen tick's 30 places on
     the 22ms heartbeat, and 30 places in the swing's 1.5s (from the end of
     the parry window: a swing caught inside it is a parry, which costs
     nothing and is not holding a guard).  In time order: the hold's drain on
     each regen tick, the block's cost on each swing.  The guard only BREAKS
     on a regen tick (_tickPlayerRegen is what drops the shield), so a swing
     that empties the bar is still caught and the break lands on the tick
     after.  A single fixed phase made one point read "no change" and the
     next a whole tick; what is left is real -- every cost here is a multiple
     of 5, so stamina only counts in fives. */
  const TPH = Math.round(GUARD.TICK_MS / SERVER_TICK_MS);
  const SPH = ranged ? 1 : 30;
  let sum = 0;
  for (let a = 1; a <= TPH; a++) {
    for (let b = 0; b < SPH; b++) {
      let st = max, tick = a * SERVER_TICK_MS;
      let sw = ranged ? Infinity : GUARD.PARRY_MS + b * (SLIME_SWING.CD_MS / SPH);
      for (let i = 0; i < 4000; i++) {
        if (sw < tick) { st = Math.max(0, st - SLIME_SWING.BLOCK_COST); sw += SLIME_SWING.CD_MS; continue; }
        st = Math.max(0, st - GUARD.HOLD_DRAIN);
        if (st <= 0) break;
        tick += GUARD.TICK_MS;
      }
      sum += tick;
    }
  }
  return sum / (TPH * SPH);
}
export function rollsInARow(R) {
  const max = (R && R.maxStamina) || 100;
  return Math.floor(max / rpgBlockSize(R, 'stamina'));
}
function guardPass(R, slime, n, shield, ranged, rollMs) {
  const beats = [];
  const max = (R && R.maxStamina) || 100;
  const atk = slimeAttack(ranged);
  let st = max;
  if (shield) {
    beats.push({ t: 0, k: 'guard', on: true });
    let nextTick = GUARD.TICK_MS;
    let lastLand = 0;
    for (let i = 0; i < n; i++) {
      const t = LEAD_MS + i * atk.cd;
      const land = t + atk.hitAt;
      while (nextTick < land) { st = Math.max(0, st - GUARD.HOLD_DRAIN); beats.push({ t: nextTick, k: 'stam', cur: st }); nextTick += GUARD.TICK_MS; }
      beats.push({ t, k: atk.kind });
      /* caught on the shield: the BLOCK the world pops -- free for a ball,
         BLOCK_COST off the bar for a swing */
      if (atk.kind === 'swing') {
        st = Math.max(0, st - SLIME_SWING.BLOCK_COST);
        beats.push({ t: land, k: 'land', text: 'Blocked!', kind: 'blocked', stam: st });
      } else {
        beats.push({ t: land, k: 'land', text: 'Blocked!', kind: 'blocked' });
      }
      lastLand = land;
    }
    /* the hold keeps costing until the shield comes down */
    while (nextTick < lastLand + 500) { st = Math.max(0, st - GUARD.HOLD_DRAIN); beats.push({ t: nextTick, k: 'stam', cur: st }); nextTick += GUARD.TICK_MS; }
    beats.push({ t: lastLand + 500, k: 'guard', on: false });
    return { beats, end: lastLand + TAIL_MS, bar: { kind: 'stamina', cur: max, max } };
  }
  const cost = rpgBlockSize(R, 'stamina');
  /* v2.3.2987: the roll starts half the hero's roll window before the attack
     lands, so his own tumble (StatDemo) meets it curled up -- and the stamina
     goes when the roll starts, so the regen ticks are counted up to THAT
     moment, or one would be shown landing before the cost it follows.
     Without a window (tests, an old caller) the old 260ms lead. */
  const lead = rollMs > 0 ? rollMs / 2 : 260;
  let nextTick = GUARD.TICK_MS, lastLand = 0;
  for (let i = 0; i < n; i++) {
    const t = LEAD_MS + i * atk.cd;
    const land = t + atk.hitAt;
    while (nextTick < land - lead) { if (st < max) { st = Math.min(max, st + GUARD.REGEN); beats.push({ t: nextTick, k: 'stam', cur: st }); } nextTick += GUARD.TICK_MS; }
    beats.push({ t, k: atk.kind });
    st = Math.max(0, st - cost);
    beats.push({ t: land - lead, k: 'roll', stam: st, cost, land });
    beats.push({ t: land, k: 'land', text: '', kind: 'miss' });
    lastLand = land;
  }
  return { beats, end: lastLand + TAIL_MS, bar: { kind: 'stamina', cur: max, max } };
}

/* ── a pass: the blue slime goes off ──────────────────────────────────── */
function burstPass(R) {
  const max = (R && R.maxHp) || 100;
  const dmg = burstOf(R);
  const at = LEAD_MS + BLUE_BURST.SWELL_MS;
  const hp = Math.max(0, max - dmg);
  return {
    beats: [
      { t: LEAD_MS, k: 'swell', ms: BLUE_BURST.SWELL_MS },
      { t: at, k: 'burst' },
      { t: at + 60, k: 'land', text: '-' + toDisplayDamage(Math.ceil(dmg)), kind: 'burst', hp: toDisplayHp(hp), max: toDisplayHp(max) },
    ],
    end: at + SLIME_DEATH_MS + TAIL_MS + 200,
    bar: { kind: 'hp', cur: toDisplayHp(max), max: toDisplayHp(max) },
    blue: true,
  };
}

/* ── a pass: ground covered ───────────────────────────────────────────── */
/** Walk speed in px/s: BroTown's baseSpd (calcMoveSpeed/5 x SPEED per frame,
 *  at 60 frames a second) x the Move stat x a moveSpd amulet.
 *  v2.3.2979: the amulet is BroTown's amuletSpdMult, in finalSpd beside the
 *  Move stat -- left out at first, so anyone wearing one was told they cross
 *  the meadow slower than they do (reviewer-found). */
export function walkPxPerSec(R) {
  const swift = ((R && R.enduranceSpec) || {}).swiftness || 0;
  const ab = R && getAmuletBonus(R.amulet);
  const amu = (ab && ab.stat === 'moveSpd') ? 1 + ab.value / 100 : 1;
  return calcMoveSpeed((R && R.agility) || 0, swift) / 5 * SPEED * 60 * prog3MoveMult(R) * amu;
}
const TREK_PX = 64;   /* out 64px and back: the hero's own jog (v2.3.2987), or game.css bt-sd-trek */
function trekPass(R) {
  const ms = Math.round((TREK_PX * 2) / Math.max(1, walkPxPerSec(R)) * 1000);
  /* two trips, so the second half's quicker step has a rhythm to be read against */
  return {
    beats: [{ t: LEAD_MS, k: 'trek', ms, px: TREK_PX }, { t: LEAD_MS + ms + 250, k: 'trek', ms, px: TREK_PX }],
    end: LEAD_MS + 2 * ms + 250 + TAIL_MS, trekMs: ms,
  };
}
/* Crossing the Starting Meadow edge to edge, in seconds -- a distance a
   player has walked, which "px per second" is not. */
function meadowCrossSecs(R) {
  const z = ZONES.meadow || {};
  return ((z.w || 32) * TILE) / Math.max(1, walkPxPerSec(R));
}

/* ── the scene ────────────────────────────────────────────────────────── */
const OFFENSE = { dmg: 1, aspd: 1, luck: 1, crit: 1, critDmg: 1 };
const fmt1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
const fmtN = (v) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : fmt1(v));
/* Seconds to two places under ten: one Speed point takes a few hundredths
   off a slime fight, and one place would round that to nothing -- the
   v2.3.2525 lesson about the DPS row, which carries two places for the same
   reason. */
const fmtSecs = (v) => (v < 10 ? (Math.round(v * 100) / 100).toFixed(2) : fmt1(v)) + 's';
const LANE_GEAR = { sword: 'a melee weapon', bow: 'a bow', staff: 'a staff' };

/**
 * The whole scene for one stat, PREPARED: everything that does not depend on
 * the dice -- the two characters (you, and you with the points), the verdict
 * line averaged over a fixed set of fights, the note -- worked out once, and
 * a play(seed) that rolls one loop's fight on fresh dice.  StatDemo prepares
 * when the window (or its stepper) changes and plays every loop, so a loop
 * costs a few hundred rolls and no copies of the character.
 *   R       the live character (never written)
 *   stat    the row's key
 *   cat     the lane an attack stat is spent in ('sword' | 'bow' | 'staff')
 *   n       the stepper's count -- the second half fights with all of them
 *   weapon  what the figure holds (the lane's weapon, or the one in hand)
 *   shield  is a shield worn (Stamina's guard needs one)
 *   caps    the connected worker's caps (bowvolley / bigorb)
 *   rollMs  v2.3.2987: the hero's roll window (game/dodge.js dodgeWindowMs,
 *           which this module cannot import) -- a stamina roll starts half of
 *           it before the attack it dodges; absent, the old 260ms lead
 * Returns null for a stat with no scene.  play() returns [before, after];
 * `after` is null when the stat is at its cap (there is no second half to
 * show, and the window says so).
 */
export function prepareStatScene(R, stat, cat, n, weapon, shield, caps, rollMs) {
  if (!R || !stat) return null;
  const slime = sceneSlime();
  const capped = statCapped(R, stat, cat);
  const pts = Math.max(1, Math.floor(Number(n) || 1));
  const isAtk = prog3IsAtkStat(stat);
  const afterR = capped ? R : withPoints(R, stat, isAtk ? cat : null, pts);
  if (!afterR) return null;
  /* An attack stat moves no pool, so both halves read the character as it is
     (afterR is already withPoints' private copy) -- one deep copy, not three,
     which matters while a thumb holds the stepper's +.  A body stat re-derives
     both sides' pools through the same mirror, so its two bars are measured
     by one formula. */
  const A = isAtk ? R : pooled(R);
  const B = isAtk ? afterR : (capped ? A : derived(afterR));
  const base = { stat, capped, n: pts, slime, note: null, shot: null };
  const none = () => [null, null];

  const gearNote = (what) => 'Equip ' + (LANE_GEAR[cat] || 'a weapon') + ' to see ' + what + '.';
  if (OFFENSE[stat] || stat === 'elem') {
    const o0 = offenseOf(A, weapon, slime), o1 = offenseOf(B, weapon, slime);
    if (!o0) return { ...base, kind: 'empty', note: gearNote('this fight'), verdict: null, play: none };
    let note = null;
    if (stat === 'elem') {
      /* Element powers burns, roots and thorns.  A weapon with none of those
         gets the plain fight on both halves -- which is the truth -- and a
         line saying why, rather than a burn the weapon cannot cast. */
      const el = o0.element;
      if (!el) note = 'This weapon has no element, so Element has nothing to power yet.';
      else if (!dotOf(o0) && !thornOf(o0)) note = (ELEMENTS[el] && ELEMENTS[el].status ? cap1(ELEMENTS[el].status) : cap1(el)) + ' does no damage over time. Element only powers combos with it.';
    }
    const attacks = stat === 'elem' && !!thornOf(o0);
    const t0 = attacks ? { attacks: true, taken: takenOf(A, slime) } : null;
    const t1 = attacks ? { attacks: true, taken: takenOf(B, slime) } : null;
    const kOpt = attacks ? { attacks: true } : null;
    const k0 = killStats(o0, slime, kOpt), k1 = capped ? null : killStats(o1, slime, kOpt);
    const ttk = (k) => fmtN(k.hits) + (Math.abs(k.hits - 1) < 0.05 ? ' hit · ' : ' hits · ') + fmtSecs(k.secs);
    return {
      /* v2.3.2987: `rolls` -- the slime attacks in this scene, so your Dodge
         can roll you out of one, and the window wants the roll's frames */
      ...base, kind: 'fight', shot: o0.ranged ? o0.type : null, note, rolls: attacks,
      verdict: k0 ? { label: 'Slime down in', now: ttk(k0), after: k1 ? ttk(k1) : null } : null,
      play: (seed) => fightPair(o0, capped ? null : o1, slime, seed || 1, t0, t1),
    };
  }
  if (stat === 'special') {
    const o0 = offenseOf(A, weapon, slime), o1 = offenseOf(B, weapon, slime);
    if (!o0) return { ...base, kind: 'empty', note: gearNote('its special'), verdict: null, play: none };
    /* the average special, in the numbers the world prints (display scale) */
    const a0 = specialStats(o0, caps) / DISPLAY_SCALE_K, a1 = capped ? null : specialStats(o1, caps) / DISPLAY_SCALE_K;
    return {
      ...base, kind: 'special', shot: o0.ranged ? o0.type : null,
      verdict: { label: 'Special hits for (avg)', now: fmt1(a0), after: a1 == null ? null : fmt1(a1) },
      play: (seed) => [specialPass(o0, slime, seed || 1, caps), capped ? null : specialPass(o1, slime, seed || 1, caps)],
    };
  }
  if (stat === 'range') {
    const o0 = offenseOf(A, weapon, slime), o1 = offenseOf(B, weapon, slime);
    if (!o0) return { ...base, kind: 'empty', note: gearNote('its reach'), verdict: null, play: none };
    const r0 = reachOf(A, o0), r1 = reachOf(B, o1);
    /* The slime stands where the point makes the difference: past today's
       reach and inside tomorrow's.  Real distances, so the attack falls
       short by exactly the ground the point buys.  No verdict line: the
       window's own row already says how much farther, and a distance in
       world pixels is not a unit anyone plays in. */
    const dist = (!capped && r1 > r0) ? (r0 + r1) / 2 : r0;
    return {
      ...base, kind: 'range', shot: o0.ranged ? o0.type : null, verdict: null,
      play: (seed) => [reachPass(o0, slime, seed || 1, r0, dist), capped ? null : reachPass(o1, slime, seed || 1, r1, dist)],
    };
  }
  /* A body stat has no lane: the slime meets what is in your hand, so it
     swings at a sword and throws at a bow (slimeAttack). */
  const ranged = isRangedWeapon(weapon);
  if (stat === 'hp' || stat === 'def' || stat === 'dodge') {
    const h0 = hitsToDown(A, slime), h1 = capped ? null : hitsToDown(B, slime);
    return {
      ...base, kind: 'defend', rolls: true,
      verdict: { label: 'Slime hits to drop you', now: fmtN(h0), after: h1 == null ? null : fmtN(h1) },
      play: (seed) => [hitsPass(A, slime, seed || 1, 2, ranged), capped ? null : hitsPass(B, slime, seed || 1, 2, ranged)],
    };
  }
  if (stat === 'stam') {
    /* with a shield the bar pays for holding your guard; without one, for
       rolling out of the way -- the two things stamina is spent on */
    const hasShield = !!shield;
    return {
      ...base, kind: 'stamina', shield: hasShield, rolls: !hasShield,
      verdict: hasShield
        ? { label: 'Guard holds vs. a slime', now: fmtSecs(guardHoldMs(A, ranged) / 1000), after: capped ? null : fmtSecs(guardHoldMs(B, ranged) / 1000) }
        : { label: 'Dodge rolls on a full bar', now: String(rollsInARow(A)), after: capped ? null : String(rollsInARow(B)) },
      play: () => [guardPass(A, slime, 2, hasShield, ranged, rollMs), capped ? null : guardPass(B, slime, 2, hasShield, ranged, rollMs)],
    };
  }
  if (stat === 'mana') {
    /* v2.3.3008: the bar and the casts it pays for (manaPass).  Two lines
       under it: the Max MP itself, now -> after (the owner's ask, word for
       word), and the specials a full bar pays for. */
    const o0 = offenseOf(A, weapon, slime), o1 = offenseOf(B, weapon, slime);
    const mp = (C) => String(Math.round((C && C.maxMana) || 100));
    return {
      ...base, kind: 'mana', shot: o0 && o0.ranged ? o0.type : null,
      note: o0 ? null : gearNote('its specials'),
      verdict: { label: 'Max MP', now: mp(A), after: capped ? null : mp(B) },
      verdict2: o0 ? { label: 'Specials on a full bar', now: String(specialsOnABar(A)), after: capped ? null : String(specialsOnABar(B)) } : null,
      play: (seed) => [manaPass(o0, A, slime, seed || 1, caps), capped ? null : manaPass(o1, B, slime, seed || 1, caps)],
    };
  }
  if (stat === 'eres') {
    return {
      ...base, kind: 'burst',
      verdict: { label: 'Blue slime burst', now: '-' + toDisplayDamage(burstOf(A)), after: capped ? null : '-' + toDisplayDamage(burstOf(B)) },
      play: () => [burstPass(A), capped ? null : burstPass(B)],
    };
  }
  if (stat === 'move') {
    return {
      ...base, kind: 'trek',
      verdict: { label: 'Cross the meadow', now: fmtSecs(meadowCrossSecs(A)), after: capped ? null : fmtSecs(meadowCrossSecs(B)) },
      play: () => [trekPass(A), capped ? null : trekPass(B)],
    };
  }
  return null;
}
/** prepareStatScene + one loop's play, in one call (tests, and any caller
 *  that wants a single scene). */
export function simulateStatScene(R, stat, cat, n, weapon, shield, caps, seed, rollMs) {
  const prep = prepareStatScene(R, stat, cat, n, weapon, shield, caps, rollMs);
  if (!prep) return null;
  const { play, ...rest } = prep;
  return { ...rest, passes: play(seed || 1) };
}
function cap1(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

/** The stats that have a scene -- StatDemo's STAT_DEMO_KEYS. */
/* v2.3.3008: + 'mana', the one body stat that had no scene */
export const SIM_STATS = ['dmg', 'aspd', 'luck', 'crit', 'critDmg', 'special', 'elem', 'range', 'hp', 'def', 'dodge', 'stam', 'mana', 'eres', 'move'];
