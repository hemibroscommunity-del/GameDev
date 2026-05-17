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
    /* 8-frame walk loop -> 33 ms/frame = ~264 ms full cycle, giving
       the goblin a brisk jog cadence (3x faster than the 100 ms
       default per user feedback v2.3.2). */
    walkFrameMs: 33,
    deathMs: 1000,
    remnantsScalePx: 24,
    projectileScalePx: 16,
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
   Returns the same monster reference for chaining. */
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
