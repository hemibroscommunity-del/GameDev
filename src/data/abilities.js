/* ═══ v2.3.1733: STAMINA ABILITIES — client mirror ═══
 *
 * Client half of PR 5 of docs/COMBAT-OVERHAUL-PLAN.md.  server/src/abilities.js
 * is THE source of truth: it validates every cast against its own copy of the
 * numbers below, rolls the damage, and owns the stamina pool.  This file
 * exists so the buttons can be drawn honestly — greyed out at the right level,
 * showing the right cooldown, predicting the right bar drop — and for no
 * other reason.  A disagreement between the two is a lying button, so
 * server/test/abilities.test.mjs imports BOTH and fails if they differ.
 *
 * Deploy-order gate (the setProg3Enabled pattern, rule 19): wsClient flips
 * _enabled from state_sync caps.abil.  Against an old worker the flag stays
 * off, no ability button renders, and nothing is ever sent — the worker would
 * treat the unknown `ability` type as a broadcast and never settle it, so a
 * visible button would spend a client-predicted stamina bar on nothing.
 */

/* MIRROR OF server/src/abilities.js STAM_ABILITIES — identical by test. */
export const STAM_ABILITIES = {
  bash: {
    minLevel: 4,
    staminaPct: 0.30,
    cooldownMs: 4000,
    dmgMult: 0.75,
    radius: 70,
    stunMs: 800,
    knockback: 90,
    needs: 'shield',
  },
  whirl: {
    minLevel: 8,
    staminaPct: 0.40,
    cooldownMs: 6000,
    dmgMult: 1.00,
    radius: 60,
    stunMs: 0,
    knockback: 40,
    needs: 'weapon',
    maxTargets: 8,
  },
};

/* MIRROR OF server/src/abilities.js MILESTONES — pinned by strict
   JSON.stringify equality in abilities.test.mjs, so entries must match
   exactly, field for field.
   v2.3.1734: rung 6 is Element Burst, which spends MANA and so carries
   `burst: true` rather than a `kind` (there is no stamina-table entry to
   look up).  See the server copy for the full reasoning. */
export const MILESTONES = {
  4:  { kind: 'bash',  label: 'Shield Bash' },
  5:  { points: 1,     label: 'Bonus stat point' },
  6:  { burst: true,   label: 'Element Burst' },
  8:  { kind: 'whirl', label: 'Whirlwind' },
  10: { stamMult: 1.25, label: 'Second Wind' },
};

/* Presentation only (never mirrored): what the button says and looks like. */
export const ABILITY_META = {
  bash:  { label: 'Bash',  glyph: '🛡️', hint: 'Stun + knock back the closest enemy', key: 'E' },
  whirl: { label: 'Whirl', glyph: '🌀', hint: 'Hit everything around you', key: 'R' },
};

/* Mirror of the server's staminaMilestoneMult — recalcDerived multiplies
   max stamina by this, exactly as _prog3Recompute does, or the bar the
   player watches disagrees with the pool the server spends from. */
export function staminaMilestoneMult(charLevel) {
  var mult = 1;
  for (var lvl in MILESTONES) {
    if (!Object.prototype.hasOwnProperty.call(MILESTONES, lvl)) continue;
    if (MILESTONES[lvl].stamMult && charLevel >= Number(lvl)) mult *= MILESTONES[lvl].stamMult;
  }
  return mult;
}

export function abilityCfg(kind) {
  return Object.prototype.hasOwnProperty.call(STAM_ABILITIES, kind) ? STAM_ABILITIES[kind] : null;
}

export function abilityStaminaCost(rpg, kind) {
  var cfg = abilityCfg(kind);
  if (!cfg) return 0;
  return Math.ceil(((rpg && rpg.maxStamina) || 100) * cfg.staminaPct);
}

var _enabled = false;
export function setAbilitiesEnabled(on) { _enabled = !!on; }
export function isAbilitiesEnabled() { return _enabled; }

/* Is this ability BOTH server-supported and level-unlocked?  charLevel is
   passed in (rather than derived here) so the caller uses the same
   prog3CharLevel the rest of the UI reads — one level source, one answer. */
export function abilityUnlocked(charLevel, kind) {
  var cfg = abilityCfg(kind);
  if (!cfg || !_enabled) return false;
  return (charLevel || 0) >= cfg.minLevel;
}

/* The rejection copy.  ability_rejected has carried these reasons since the
   handler was written; until v2.3.1733 nothing on the client listened, so a
   refused cast was a button that did nothing — the exact failure v2.3.1716
   fixed for the special attack. */
export function abilityRejectText(payload) {
  var kind = (payload && payload.kind) || '';
  var meta = Object.prototype.hasOwnProperty.call(ABILITY_META, kind) ? ABILITY_META[kind] : null;
  var name = (meta && meta.label) || 'Ability';
  switch (payload && payload.reason) {
    case 'locked':   return name + ' unlocks at level ' + (payload.need || '?');
    case 'cooldown': return name + ' not ready';
    case 'stamina':  return 'Not enough energy!';
    case 'no-shield': return 'No shield equipped!';
    case 'no-weapon': return 'No weapon equipped!';
    case 'whiff':    return 'Missed!';
    default:         return name + ' failed';
  }
}
