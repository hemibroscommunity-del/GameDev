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
   the per-zone variant.  Idempotent — calling twice is harmless.
   Returns the same monster reference for chaining.
   Also overrides m.spd with the variant's spd when set, so client-
   authoritative AI runs at the variant's pace instead of the server's
   base-archetype speed. */
export function applyZoneVariant(monster, zoneId) {
  if (!monster || !zoneId) return monster;
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
