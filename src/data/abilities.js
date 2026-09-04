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
  /* ═══ v2.3.2258: THE SWORD'S OPENING LUNGE ═══
     Owner: "For ONLY melee (sword) ... the default first attack will be very
     similar to 'shield bash' (you can even re-use the mechanic but for sword)
     and keep the stun enemy effect.  I've been feeling like melee is a little
     underpowered so this should help.  Also make the cost of sword dash 10%
     stamina."

     So it IS the bash mechanic, re-pointed: the same declared-target dash that
     v2.3.2252 built to make a shove connect (name the monster, close the gap
     frame by frame, let the worker validate the longer reach), with a sword's
     numbers instead of a shield's.  Differences from bash, all deliberate:
       needs 'weapon' rather than 'shield', and no needsHeldShield -- this is
         what a sword does, not what a raised guard does;
       staminaPct 0.10, the owner's number, against bash's 0.30;
       dmgMult 1.0, because this REPLACES the first swing rather than adding a
         second move on top of it -- 0.75 would have made opening with it a
         damage LOSS, which is the opposite of "melee is underpowered";
       knockback 40 against bash's 90: a lunge closes distance, and shoving the
         target back out of reach on the opening hit would undo the dash;
       stunMs 1600 unchanged -- "keep the stun enemy effect", verbatim.
     cooldownMs is the real limiter (see game/abilities.js maybeSwordDash): the
     move is "the first attack of an engagement", and 2500 is what stops a
     release-and-re-press from making every swing a lunge. */
  sworddash: {
    minLevel: 0,
    staminaPct: 0.10,
    cooldownMs: 2500,
    dmgMult: 1.0,
    radius: 70,
    stunMs: 1600,
    knockback: 40,
    needs: 'weapon',
    /* v2.3.2266: 240 -> 900, matching the client's own DASH_MAX_REACH_PX -- the
       distance the lunge can actually close.  The server's copy carries the
       reasoning; this half exists so the mirror assertion in
       server/test/abilities.test.mjs keeps passing, and a drifted number here
       is a button that lies about its range. */
    reach: 900,
  },
  bash: {
    /* ═══ v2.3.2252: NO LEVEL GATE ═══
       Owner: "Make shield bash an ability for any level (no gates) the only
       requirement is you must have your shield held."
       Kept as 0 rather than deleted: `abilityUnlocked` compares
       `charLevel >= cfg.minLevel`, and a MISSING field makes that
       `n >= undefined` -> NaN -> false, i.e. permanently LOCKED, which is the
       exact opposite of ungated.  0 is always true and never rejects.
       The requirement moved to "a shield, and it is raised" -- see
       game/abilities.js abilityStatus. */
    minLevel: 0,
    staminaPct: 0.30,
    cooldownMs: 4000,
    dmgMult: 0.75,
    radius: 70,
    stunMs: 1600,   /* v2.3.1736 (owner): was 800 */
    knockback: 90,
    needs: 'shield',
    /* v2.3.2252: ...and it must be RAISED for the button to appear (client
       rule; the server's authoritative requirement stays `needs`, because
       ps.blocking is client-supplied on every move packet and a server gate on
       it would be forgeable and lag-fragile). */
    needsHeldShield: true,
    /* v2.3.2252: how far the bash may CLOSE when it names its target.  240
       covers the 220px targeting perimeter, so anything you can engage is
       something you can bash to.  Only honoured for a declared target. */
    reach: 240,
  },
  whirl: {
    minLevel: 8,
    staminaPct: 0.40,
    cooldownMs: 6000,
    dmgMult: 1.00,
    radius: 240,    /* v2.3.1738 (owner): the vacuum — was 60 */
    stunMs: 1000,  /* v2.3.1738: the 1s attack lockout while it gathers */
    knockback: 0,   /* v2.3.1735: whirl gathers instead of shoving */
    pullTo: 34,     /* ...onto a ring this far from the caster */
    needs: 'weapon',
    maxTargets: 16,
  },
};

/* MIRROR OF server/src/abilities.js MILESTONES — pinned by strict
   JSON.stringify equality in abilities.test.mjs, so entries must match
   exactly, field for field.
   v2.3.1734: rung 6 is Element Burst, which spends MANA and so carries
   `burst: true` rather than a `kind` (there is no stamina-table entry to
   look up).  See the server copy for the full reasoning. */
export const MILESTONES = {
  /* v2.3.2252: rung 4 no longer UNLOCKS anything -- Shield Bash is ungated,
     and leaving `kind: 'bash'` here would have the level-up celebration
     announce "Shield Bash unlocked!" for a move the player has had since
     level 1 (prog3.js reads MILESTONES[level].label for exactly that). */
  4:  { label: 'Sturdy Arm' },
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
