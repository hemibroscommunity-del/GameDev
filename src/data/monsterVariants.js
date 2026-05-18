import { ZONES } from './zones.js';

/* ═══ MONSTER VARIANT REGISTRY ═══
 *
 * Single source of truth for per-zone monster skins.
 *
 * Adding a new monster (cookbook):
 *
 *   1. Drop sprite sheets in public/sprites/monsters/<variantKey>/
 *      Required: walk-<dir>.png
 *      Optional: hit-<dir>.png, attack-<dir>.png, death.png,
 *                remnants.png, projectile.png
 *
 *   2. Create a sprite loader module under src/rendering/ that mirrors
 *      the shape of fireGoblinSprites.js (loadXSprites, getFrame, etc.)
 *
 *   3. Register it in src/rendering/monsterVariantSprites.js — add an
 *      entry to VARIANT_SPRITES with the uniform interface.
 *
 *   4. Add the stat template to ARCHETYPES in gameSystems.js (this is
 *      what the server uses too — same name keeps server in sync).
 *
 *   5. Add an entry below in MONSTER_VARIANTS with the per-variant
 *      tuning (incomingDmgScalar, sprite scales, etc.).
 *
 *   6. Map the variant into one or more zones via ZONE_VARIANT_MAP.
 *
 * The networking layer, renderer, and AI all pick up the variant
 * from this config — adding a new monster touches one config entry
 * plus the sprite module, not 10 inline checks.
 */

/* Per-variant config.  Keys are the archetype name as it appears on
   monster.archetype after applyZoneVariant has been called. */
export const MONSTER_VARIANTS = {
  /* Mummy -- the desert-winds (sky) fodder variant.  Slow shuffle in
     mummy form; at transformAt HP fraction the bandages shred (see
     transform.png) and the monster swaps to its 'skeleton' archetype
     mid-fight, gaining speed and a chase pose. */
  mummy: {
    baseArchetype: 'fodder',
    incomingDmgScalar: 0.5,   /* ~2 hits to push past transform threshold */
    liveScalePx: 64,
    walkFrameMs: 90,          /* v2.3.48: walk strip now has 16 frames
                                 (was 8).  Cycle duration stays at
                                 ~1.44 s overall, but the per-frame
                                 dwell halved so the shuffle reads as
                                 smoother instead of choppy. */
    deathMs: 1000,
    remnantsScalePx: 48,
    spd: 0.4,                 /* slower than fodder's 0.5 */
    xpMult: 1,                /* base XP -- the skeleton form pays
                                 the second-hit XP via its own mult */
    /* Mummies are pure melee shamblers -- no ranged slime orb, and
       their loot drop shouldn't render the green slime splat the
       fodder branch falls back to when a variant has no remnants
       art of its own.  Both flags checked at the existing fodder-
       inheritance sites (BroTown.jsx projectile spawn,
       effectsRenderer.js ground-loot fodder branch). */
    noProjectile: true,
    noFodderRemnants: true,
    /* Transform trigger -- when m.curHp / m.maxHp drops below this,
       the mummy plays transform.png frames then swaps archetype to
       'skeleton' (see transformsTo).  Set false to disable. */
    transformAt: 0.5,
    transformsTo: 'skeleton',
    transformFrameMs: 60,     /* 8 frames * 60 ms = 480 ms shred */
    transformHoldMs: 480,     /* total animation duration */
  },
  /* Skeleton -- the runtime-spawned 'second life' of a mummy.  Faster
     than the mummy, chases the player.  Not in ZONE_VARIANT_MAP since
     it appears only via the mummy -> skeleton transform. */
  skeleton: {
    baseArchetype: 'fodder',  /* AI inherits fodder telegraph/attack,
                                 but spd + clientSideMovement let it
                                 chase locally rather than wander */
    incomingDmgScalar: 0.5,
    liveScalePx: 96,          /* 50 % bigger than mummy's 64 per user
                                 request -- the skeleton form should
                                 read as a more imposing on-screen
                                 silhouette than the shuffling mummy */
    walkFrameMs: 110,         /* 50 % slower per user request (was 55).
                                 Strip duration ~ 880 ms across 8 frames,
                                 reads as a more deliberate charge. */
    deathMs: 1000,
    remnantsScalePx: 48,
    spd: 1.4,                 /* charges the player vs fodder's 0.5 */
    clientSideMovement: true, /* same trick as fireGoblin: local AI
                                 chase since server only knows fodder */
    /* Skeleton inherits the no-projectile + no-slime-remnants flags
       from the mummy form so the inheritance doesn't reappear after
       the transform (the swap leaves baseArchetype: 'fodder' in
       place for AI dispatch, which would otherwise re-arm the slime
       orb fire and the slime-splat ground loot). */
    noProjectile: true,
    noFodderRemnants: true,
    /* 2x outgoing damage scalar -- the skeleton is the "danger" form
       of the mummy, so its melee swings hit twice as hard.  Applied
       in BroTown.jsx's monster_attack handler (we scale the server's
       payload.dmg by the attacker variant's dmgMult before computing
       defense + final damage taken). */
    dmgMult: 2,
    xpMult: 2,                /* skeleton form is the harder kill */
  },
  fireGoblin: {
    /* AI dispatch — variant inherits attack/move logic from this
       base archetype.  fodder = telegraphs then fires a projectile. */
    baseArchetype: 'fodder',
    /* Damage taken per hit = pDmg × incomingDmgScalar.  Lower = tougher.
       0.25 -> 3-4 hits to kill at base player damage.  Synced between
       local + server because the scaled value is what we apply to
       m.curHp AND broadcast in monster_damage. */
    incomingDmgScalar: 0.25,
    /* Render hints — sprite is 256 px source, on-screen height is
       liveScalePx (death frames use the same).  remnants/projectile
       scales are absolute on-screen pixel sizes. */
    liveScalePx: 64,
    /* 66 ms/frame -- the v2.3.2 33 ms read too frantic; halved the
       speed (50% slower) per user feedback.  8-frame loop now
       completes in ~528 ms, still snappier than the original 100 ms
       baseline but no longer running. */
    walkFrameMs: 66,
    /* Attack strip plays at a fixed frame rate (8 frames * 50 ms = 400 ms)
       then the renderer holds the last frame until _shootAnimEnd.  Earlier
       v2.3.23 spread the strip across the full telegraph window (480 ms),
       which made the swing read slow and the body looked like it was
       skidding mid-attack -- the goblin's chase motion lingered while the
       swing was still mid-arc.  Decoupling swing speed from telegraph
       length lets the wind-up snap and the body settle on the held pose. */
    attackFrameMs: 50,
    deathMs: 1000,
    /* Source remnants.png is 256x256 and the burnt-stick pile occupies
       maybe 60% of the frame.  At 24 px the pile read as ~14 px on
       screen -- effectively invisible (v2.3.8 bug).  Bumped to 48 px
       so the pile reads at roughly the same on-screen size as the
       slime splat. */
    remnantsScalePx: 48,
    /* Fireball on-screen size.  16 px was a bit small to read against
       the bright zone -- 50% bump per user (v2.3.13). */
    projectileScalePx: 24,
    /* Client-authoritative movement.  The server only knows the base
       fodder archetype, so server-driven positions would advance at
       fodder speed regardless of ARCHETYPES.fireGoblin.spdMult.  With
       this flag set, BroTown.jsx skips the server-position override
       and lets each client's local AI run -- the goblin actually
       chases at the bumped spdMult.  Trade-off: position diverges
       slightly between players' views; damage / death / loot stay
       authoritative via monster id, not coordinates. */
    clientSideMovement: true,
    /* m.spd to write when applyZoneVariant remaps a server monster.
       Matches createMonster's formula: 0.5 * spdMult.  Without this,
       server-spawned goblins inherit fodder's 0.5 spd and local AI
       chases at fodder speed even with clientSideMovement on. */
    spd: 1.5,
    /* XP awarded per kill is multiplied by this on the client.
       Server uses the base 'fodder' XP value; client doubles it on
       receipt because goblins take 3-4 hits vs slimes' 1 hit. */
    xpMult: 2,
  },
};

/* Per-zone overrides — when a monster of base archetype X spawns in
   zone Y, swap its archetype to the variant.  Format:
     ZONE_VARIANT_MAP[zoneId] = { [baseArchetype]: variantKey } */
export const ZONE_VARIANT_MAP = {
  ember: { fodder: 'fireGoblin' },
  /* sky / Desert Winds: every server archetype remaps to 'mummy' so
     MP players see mummies regardless of whether the server seeds
     fodder or stalker/hexer/volatile/etc.  Server AI keeps running
     for the LIVE archetype; the variant is purely a client-side
     visual skin + the mummy->skeleton transform trigger.  Drop
     entries here later if Desert Winds should also feature non-mummy
     enemy types. */
  sky: {
    fodder:   'mummy',
    stalker:  'mummy',
    hexer:    'mummy',
    volatile: 'mummy',
    brute:    'mummy',
    swarm:    'mummy',
    sentinel: 'mummy',
  },
};

/* Lookup helpers — used by the renderer, AI dispatch, and damage
   scaling paths. */
export function variantForArchetype(arch) {
  return (arch && MONSTER_VARIANTS[arch]) || null;
}

/* Returns the base archetype an arch behaves like for AI purposes.
   Variants inherit from their baseArchetype; raw archetypes return
   themselves.  Use this to keep AI dispatch single-line:
     if (baseArchetypeOf(arch) === 'fodder') { ... } */
export function baseArchetypeOf(arch) {
  const v = variantForArchetype(arch);
  return v ? v.baseArchetype : arch;
}

/* True if arch behaves like 'fodder' (either the raw archetype or a
   variant of it).  Convenience wrapper used by the legacy inline
   checks in BroTown.jsx. */
export function isFodderLike(arch) {
  return baseArchetypeOf(arch) === 'fodder';
}

/* Mutate a monster object in-place so its archetype/type/arch reflect
   the per-zone variant AND its level is clamped to the zone's
   level range.  Idempotent — calling twice is harmless.
   Returns the same monster reference for chaining.
   Also overrides m.spd with the variant's spd when set, so client-
   authoritative AI runs at the variant's pace instead of the server's
   base-archetype speed.

   The level clamp is the client-side defense against server-sent
   monsters that exceed the zone's spec (e.g. elemental zone 1 caps
   at [1, 2] — see zones.js).  Runs first so it applies to every
   per-zone monster regardless of whether a variant remap follows. */
export function applyZoneVariant(monster, zoneId) {
  if (!monster || !zoneId) return monster;
  const zone = ZONES[zoneId];
  if (zone && Array.isArray(zone.level) && zone.level.length === 2 && typeof monster.level === 'number') {
    const minLv = zone.level[0];
    const maxLv = zone.level[1];
    if (maxLv > 0 && monster.level > maxLv) monster.level = maxLv;
    if (monster.level < minLv) monster.level = minLv;
  }
  const overrides = ZONE_VARIANT_MAP[zoneId];
  if (!overrides) return monster;
  const baseArch = monster.archetype || monster.type || monster.arch;
  const variantKey = overrides[baseArch];
  if (!variantKey) return monster;
  monster.archetype = variantKey;
  monster.type = variantKey;
  if (monster.arch !== undefined) monster.arch = variantKey;
  const v = MONSTER_VARIANTS[variantKey];
  if (v && v.spd != null) monster.spd = v.spd;
  return monster;
}

/* Scale incoming damage for the variant's armor.  Returns the
   monster's incomingDmgScalar (1 if no variant).  Centralized so
   melee, ranged, and any future damage path use the same source. */
export function incomingDmgScalarFor(monster) {
  const arch = monster && (monster.archetype || monster.type);
  const v = variantForArchetype(arch);
  return v ? v.incomingDmgScalar : 1;
}

/* True if this monster's variant overrides server-driven movement
   with local AI.  Used by BroTown.jsx to bypass the
   _serverMonsters position lock for specific variants (see fireGoblin
   notes).  Returns false for raw archetypes and any variant without
   the flag explicitly set. */
export function usesClientSideMovement(monster) {
  const arch = monster && (monster.archetype || monster.type);
  const v = variantForArchetype(arch);
  return !!(v && v.clientSideMovement);
}

/* True if a loot drop's skull tag should be treated as a "remnant
   pile" -- persists forever (no 60s expiry), excluded from magnetism,
   and has a brief pickup delay so the splat/pile lands on the ground
   before the player can vacuum it.  Covers every monster that has
   dedicated remnants art:
     - 'fodder'    -> slime splat
     - 'snowman'   -> snowman wreck
     - any variant -> variant.remnants texture (e.g. fireGoblin debris)
   Used by both the tick/monster_kill loot-drop guard (so the pile
   actually spawns in MP where the local hit code never fires) and the
   loot-filter logic (persistence, magnetism, pickup delay). */
export function isRemnantSkull(skull) {
  return skull === 'fodder' || skull === 'snowman'
      || !!(skull && MONSTER_VARIANTS[skull]);
}

/* Per-kill XP multiplier for a variant.  Server-mode XP rolls
   through the base archetype, so the client scales it on receipt
   in the monster_kill handler.  Returns 1 for raw archetypes and
   variants without xpMult set. */
export function xpMultFor(monster) {
  const arch = monster && (monster.archetype || monster.type);
  const v = variantForArchetype(arch);
  return v && v.xpMult ? v.xpMult : 1;
}

/* Mid-fight transform check.  Variants with transformAt + transformsTo
   (currently just 'mummy' -> 'skeleton') swap archetype client-side
   when m.curHp / m.maxHp drops below the threshold.  Idempotent:
   already-transformed monsters short-circuit on the !current.transformsTo
   guard.  Stamps m._transformStart so the renderer can play the
   variant's transform animation over the existing walk frames before
   the new archetype's walk loop takes over.

   The server doesn't know about variants -- this is a purely
   client-side visual + behavior swap.  m.spd updates so the variant's
   clientSideMovement chase kicks in immediately; the renderer keeps
   showing the bandage shred for transformHoldMs ms before the
   skeleton walk-cycle replaces it.

   Returns true on the tick we actually fire the transform (one-shot). */
export function maybeTransformMonster(m) {
  if (!m || !m.alive) return false;
  if (m._transformStart) return false; /* already transforming or done */
  const arch = m.archetype || m.type;
  const v = MONSTER_VARIANTS[arch];
  if (!v || !v.transformsTo) return false;
  const maxHp = m.maxHp || m.hp || 1;
  const curHp = m.curHp != null ? m.curHp : m.hp;
  if (curHp == null || curHp <= 0) return false;
  if (curHp / maxHp > v.transformAt) return false;
  /* Trigger -- stamp the start time so the renderer plays the
     transform strip, then swap archetype/spd to the new form. */
  m._transformStart = Date.now();
  m._transformHoldMs = v.transformHoldMs || 480;
  m._transformFromArch = arch; /* renderer reads this to pick the
                                  source variant's transform frames */
  m.archetype = v.transformsTo;
  m.type = v.transformsTo;
  if (m.arch !== undefined) m.arch = v.transformsTo;
  const next = MONSTER_VARIANTS[v.transformsTo];
  if (next && next.spd != null) m.spd = next.spd;
  return true;
}
