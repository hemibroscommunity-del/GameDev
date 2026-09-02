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
    liveScalePx: 96,          /* user request v2.3.49: ~50 % larger than
                                 the previous 64 to match the desired
                                 on-screen presence of the shuffling
                                 mummy.  Skeleton stays at its own
                                 (already-bigger) liveScalePx 96. */
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
    incomingDmgScalar: 0.25,  /* v2.3.49: halved from 0.5 -> 0.25 so
                                 the skeleton effectively has 2x HP.
                                 HP itself is server-authoritative
                                 (server thinks it's still fodder),
                                 so the toughness bump rides on the
                                 client-side damage scalar instead. */
    liveScalePx: 96,
    walkFrameMs: 110,         /* Legacy time-based pacing -- no longer
                                 read by the v2.3.93 distance-driven
                                 walk loop; kept for documentation. */
    /* v2.3.116: explicit walkDistPerFrame doubles the default 1.5 so
       skeleton's chase animation cycles ~0.8 s instead of ~0.4 s --
       50% slower per user feedback ("too frantic"). */
    walkDistPerFrame: 3.0,
    deathMs: 1200,            /* 16-frame death sheet at ~75 ms/frame =
                                 1.2 s total -- crumble -> dust ->
                                 bone pile settling on the ground. */
    /* The user's death source video was pre-shrunk to keep all
       bones + dust effects inside the 544 x 544 canvas, so the
       figure inside each chroma-keyed cell reads smaller than the
       live skeleton's silhouette.  v2.3.65: 1.5x (was 2x in v2.3.64,
       which read too large per user). */
    deathScalePx: 144,
    remnantsScalePx: 48,
    spd: 1.4,                 /* charges the player vs fodder's 0.5 */
    /* Movement is server-authoritative.  The worker applies
       skeleton's spd via _variantSpeed when the mummy -> skeleton
       transform fires server-side (see _tickMonsters); a
       monster_transform event tells the client to swap visuals +
       play the shred animation.  No clientSideMovement override
       needed -- server position is the source of truth. */
    /* Skeleton inherits the no-projectile flag from the mummy form
       so the slime-orb fire doesn't re-arm after the transform.
       v2.3.61: dropped noFodderRemnants -- the skeleton now has its
       own remnants.png (bone pile) so the fodder branch in
       effectsRenderer picks up that texture instead of falling
       through to the slime splat. */
    noProjectile: true,
    /* Outgoing damage scalar -- skeleton is the "danger" form, so
       its melee swings hit 4x.  Applied in BroTown.jsx's monster_attack
       handler (scales payload.dmg by attacker variant's dmgMult
       before defense + final damage are computed).  v2.3.49 bumped
       2 -> 4 per user request. */
    dmgMult: 4,
    /* Block punish -- a successful shield block on a skeleton swing
       stuns it for 5 s.  Reads as a tactical reward: time the block,
       freeze the chase, capitalize.  Applied in BroTown.jsx's local
       melee shielded branch. */
    blockStunMs: 5000,
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
       baseline but no longer running.  (Time-based legacy; the walk
       loop is now driven by walkDistPerFrame below.) */
    walkFrameMs: 66,
    /* v2.3.93+ walk frame index is distance-driven.  fireGoblin's
       fast spd (67.5 px/sec at chase) combined with its short
       walkFrameMs source pacing makes the legacy cycle frantic.
       Bumped to 6.0 (was 3.0) so each frame holds for ~90 ms of
       actual travel, halving the on-screen cycle rate again per
       v2.3.96 user feedback ("his run animation needs to be slowed
       down by 2x from here"). */
    walkDistPerFrame: 6.0,
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
    /* Movement is now server-authoritative.  The worker mirrors
       fireGoblin's spd (1.5) via _variantSpeed in
       brotown-server/src/index.js so server-driven positions move
       at the correct variant pace -- no more clientSideMovement
       escape hatch.  Two players viewing the same fireGoblin now
       see identical positions (closes the v2.3.62-era
       "position diverges slightly between players' views"
       trade-off). */
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
  /* Fishman -- Tidal Caves brute skin.  Single still pose, no walk
     cycle; the renderer dwells on the only frame while the entity
     translates around the map. */
  fishman: {
    baseArchetype: 'brute',
    liveScalePx: 96,
    spd: 0.5,
  },
  /* Rockmonster -- Deep Hollows brute skin.  Same still-pose pattern
     as fishman. */
  rockmonster: {
    baseArchetype: 'brute',
    liveScalePx: 96,
    spd: 0.5,
  },
  /* ═══ v2.3.1147: verdant + mist reskins (the L22-40 zones spawned
     NOTHING -- the mid-band content hole).  All four are TINTED reuses
     of existing sheets: `tint` is a plain Pixi sprite tint consumed by
     entityRenderer where it previously hard-reset 0xffffff.  Fodder
     skins set useSlimeSheets so the renderer's slime branch (idle/
     shoot/hit/death states) picks them up despite arch !== 'fodder'.
     Deliberately NO incomingDmgScalar / xpMult / dmgMult: those are
     client-prediction-only relics (the server rolls its own damage via
     _computeAttackDamage and pays base-archetype XP) -- setting them
     would only desync prediction from monster_hit truth.  Stats come
     entirely from the base archetype + the zone's level band. */
  mossSlime: {
    baseArchetype: 'fodder',
    useSlimeSheets: true,
    tint: 0x55cc44, /* mossy green */
  },
  /* v2.3.1535 (owner: "one fast squishier blue slime and the rest the regular
     green"): the rare one.  Verdant Wilds spawns 7 mossSlime + 1 of these, so
     it is a single standout in the zone rather than a reskin of the whole
     population -- see the spawn table in zones.js / server data.js, which is
     what picks it (this variant is deliberately NOT in ZONE_VARIANT_MAP,
     because that maps a whole ARCHETYPE and would turn every slime blue).
     Two things make it different from every earlier variant:
       1. `recolor` is a luminance RETINT, not the multiplicative `tint` the
          other reskins use.  tint physically cannot make green art blue -- it
          only multiplies, and the slime sheet is saturated green, so a blue
          tint lands at mean RGB (32,94,72), still green-dominant.  See
          slimeRecolor.js.  `tint` below is kept purely as the fallback for
          the frames before the recolour finishes building.
       2. it is the first variant that TRADES A STAT rather than being purely
          visual: fast and squishy.  spd 1.15 is 2.3x the fodder base 0.5 and
          sits under fireGoblin's 1.5, so it reads as genuinely fast without
          being unoutrunnable.  MIRRORS server _variantSpeed.blueSlime -- the
          server drives movement, so a mismatch shows up as rubber-banding.
          The other half (maxHp x0.55) is server-only by design: HP is
          authoritative there and the client renders what it is sent, so
          there is nothing to mirror and nothing to drift. */
  blueSlime: {
    baseArchetype: 'fodder',
    useSlimeSheets: true,
    tint: 0x4488cc,          /* fallback only -- see recolor */
    recolor: [58, 122, 208], /* #3a7ad0 */
    spd: 1.15,
  },
  mireWisp: {
    baseArchetype: 'fodder',
    useSlimeSheets: true,
    tint: 0x7a5fa8, /* toxic violet (mist = venom zone) */
  },
  thornShambler: {
    baseArchetype: 'brute',
    liveScalePx: 96,
    spd: 0.5,        /* mirrored in server _variantSpeed */
    tint: 0x4f9a3f,  /* moss-covered rockmonster */
  },
  bogLurker: {
    baseArchetype: 'brute',
    liveScalePx: 96,
    spd: 0.5,        /* mirrored in server _variantSpeed */
    tint: 0x5f7a5a,  /* murky fishman */
  },
};

/* Per-zone overrides — when a monster of base archetype X spawns in
   zone Y, swap its archetype to the variant.  Format:
     ZONE_VARIANT_MAP[zoneId] = { [baseArchetype]: variantKey } */
export const ZONE_VARIANT_MAP = {
  ember: { fodder: 'fireGoblin' },
  tidal: { brute: 'fishman' },
  hollows: { brute: 'rockmonster' },
  /* v2.3.1147: keep in sync with server _variantForArchInZone. */
  /* v2.3.1675 (owner: "make the slimes in verdant wilds blue"): the zone-wide
     fodder skin is BLUE now.  This map remaps a whole ARCHETYPE, and the
     per-spawn `variant` override in zones.js only covers spawns that carry
     it — so leaving mossSlime here would repaint anything the spawn table did
     not explicitly pin, and the zone would go back to green the moment a
     spawn entry is edited.  Both places say blue; neither can drift alone. */
  verdant: { fodder: 'blueSlime', brute: 'thornShambler' },
  mist: { fodder: 'mireWisp', brute: 'bogLurker' },
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
/* ═══ v2.3.2224: IS THIS MONSTER INTANGIBLE RIGHT NOW? ═══
   Owner: attacking the burrow phase should "not send any combat messages"
   and projectiles should "travel right through it".

   So the pile is not a target that refuses damage -- it is a target that is
   not there.  The IMMUNE popup and its beep were the right call for a boss
   phase, where the message IS the mechanic ("wait for the opening"); they
   are the wrong call here, where the mound already reads as untouchable and
   a popup on every swing turns a quiet moment into a wall of grey text.

   Deliberately keyed on the burrow phase and NOT on `_invulnerable`: bosses
   keep their IMMUNE feedback exactly as it was.  One predicate so the melee
   sweep and the projectile pass cannot drift apart -- a sword that ignores
   the pile and an arrow that stops dead on it would read as a bug in one of
   the two. */
export function isIntangible(m) {
  return !!(m && m._burPhase === 'pile');
}

export function isFodderLike(arch) {
  return baseArchetypeOf(arch) === 'fodder';
}

/* ═══ v2.3.2200: WHAT A MONSTER IS MADE OF (hit-feedback material) ═══
 *
 * Owner: "Every successful damage taken plays a brief feedback effect
 * (snow that flies off the monster, snow on the ground)."  Every hit
 * spawns a debris burst and a ground decal keyed by THIS table — the
 * one place a monster's physical substance is written down.  Values are
 * DEBRIS_BURSTS keys (effectsRenderer) plus the decal tint.  Keyed by
 * variant first, then base archetype, so a reskin can override its
 * base (skeleton is bone even though its base brute would be stone).
 * Unknown anything falls through to goo — the least wrong default in a
 * game whose default monster is a slime. */
const HIT_MATERIALS = {
  snowman:       { kind: 'snow',  tint: 0xe8f4ff, decal: '#dbeafe' },
  skeleton:      { kind: 'bone',  tint: 0xe6ddc8, decal: '#c9bfa5' },
  mummy:         { kind: 'bone',  tint: 0xd8cdb4, decal: '#b8ad90' },
  fireGoblin:    { kind: 'ember', tint: 0xea580c, decal: '#7c2d12' },
  rockmonster:   { kind: 'stone', tint: 0x8a8a8a, decal: '#5b5b5b' },
  thornShambler: { kind: 'stone', tint: 0x6b8f4e, decal: '#3f5e2c' },
  brute:         { kind: 'stone', tint: 0x8a8a8a, decal: '#5b5b5b' },
  sentinel:      { kind: 'stone', tint: 0x9aa4b0, decal: '#565e68' },
  fodder:        { kind: 'goo',   tint: 0x3dd497, decal: '#1f7a55' },
  mossSlime:     { kind: 'goo',   tint: 0x4cbf6b, decal: '#2a6e3e' },
  blueSlime:     { kind: 'goo',   tint: 0x4c9fdc, decal: '#28567e' },
  mireWisp:      { kind: 'goo',   tint: 0x7fd0c9, decal: '#3d6f6a' },
  bogLurker:     { kind: 'goo',   tint: 0x5e7a52, decal: '#37482f' },
  fishman:       { kind: 'goo',   tint: 0x62b8c7, decal: '#2f6570' },
  swarm:         { kind: 'goo',   tint: 0x8a6dc0, decal: '#4c3a70' },
  volatile:      { kind: 'ember', tint: 0xf59e0b, decal: '#78350f' },
  stalker:       { kind: 'goo',   tint: 0x94a3b8, decal: '#475569' },
  hexer:         { kind: 'bone',  tint: 0xb8a9d9, decal: '#5b4a80' },
};
const HIT_MATERIAL_DEFAULT = { kind: 'goo', tint: 0x3dd497, decal: '#1f7a55' };
export function hitMaterialOf(archOrVariant) {
  return HIT_MATERIALS[archOrVariant]
    || HIT_MATERIALS[baseArchetypeOf(archOrVariant)]
    || HIT_MATERIAL_DEFAULT;
}

/* v2.3.1535: every variant key a zone can put on screen.
 *
 * Two sources, because there are two ways to assign a variant: the
 * whole-ARCHETYPE map (ZONE_VARIANT_MAP: "every fodder here is a mossSlime")
 * and a per-SPAWN-ENTRY override (zones.js spawns[].variant: "one of these
 * eight is a blueSlime").  Anything that has to warm a zone's variant art --
 * preloadZoneAssets -- must see BOTH, or the per-entry ones load lazily on
 * first sighting, which is exactly what the preloading LAW forbids. */
export function variantsForZone(zoneId) {
  const keys = new Set(Object.values(ZONE_VARIANT_MAP[zoneId] || {}));
  const z = ZONES[zoneId];
  for (const s of (z && z.spawns) || []) {
    if (s && s.variant) keys.add(s.variant);
  }
  return keys;
}

/* v2.3.1535: the archetype whose HITBOX SHAPE this thing renders with.
 *
 * Every hit test in the game -- melee reach, the arrow/bolt collision, the
 * body-centre table monsterBodyOffsetY -- keys off `m.archetype || m.type`
 * and compares it to a literal like 'fodder'.  applyZoneVariant overwrites
 * BOTH of those fields with the variant key, so a Verdant Wilds slime arrives
 * as 'mossSlime', matches NOTHING, and falls to the default: body offset 0 and
 * no radius bonus.  Body offset 0 means the hitbox sits at m.y -- the feet --
 * so you had to aim at the slime's SHADOW to hit it (owner: "slimes are
 * hitting way too low, the hitbox is at their shadow").  The same miss is why
 * arrows planted at the feet before v2.3.1534.
 *
 * The rule is deliberately about SHEETS, not stats: a variant that renders
 * with the slime sheets IS a slime for collision purposes, whatever its name
 * or speed.  Everything else returns its own key unchanged, so the named
 * cases that already exist (fireGoblin, mummy, skeleton, snowman) keep their
 * hand-tuned numbers, and mummy/skeleton do NOT collapse to their 'fodder'
 * base -- they render as 96px upright figures and have their own entries.
 *
 * Use this ANYWHERE a hitbox is chosen by archetype.  A new variant then
 * inherits a correct hitbox for free instead of silently getting a
 * feet-anchored one. */
export function hitShapeOf(archOrType) {
  const v = MONSTER_VARIANTS[archOrType];
  if (v && v.useSlimeSheets) return 'fodder';
  return archOrType;
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
    /* v2.3.1147: floor clamp relaxed to minLv-4 -- the server's
       entrance ramp legitimately spawns up to 4 levels below the band
       floor in the shallowest 15% of a zone; clamping those back up
       would desync the displayed level from the authoritative stats. */
    if (monster.level < minLv - 4) monster.level = Math.max(1, minLv - 4);
  }
  /* v2.3.1535: the SERVER's per-monster variant wins when it sent one.
     ZONE_VARIANT_MAP maps a whole ARCHETYPE, so it can only say "every
     fodder in this zone is a mossSlime" -- it cannot express Verdant Wilds'
     7 green slimes + 1 blue one.  The server picks the variant per spawn and
     now ships it (join.js), so trust it and skip the archetype map.  A
     monster from an OLD worker has no variant field and falls through to the
     map below exactly as before. */
  const sent = monster.variant;
  if (sent && MONSTER_VARIANTS[sent]) {
    monster.archetype = sent;
    monster.type = sent;
    if (monster.arch !== undefined) monster.arch = sent;
    const sv = MONSTER_VARIANTS[sent];
    if (sv && sv.spd != null) monster.spd = sv.spd;
    return monster;
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

/* v2.3.1673: which inventory key a skull's remnants stack into.
 *
 * MIRRORS server _invKeyForSkull.  The server owns the inventory, so a
 * mismatch here shows up as the bag briefly showing one thing and then being
 * corrected by the next player_state — confusing, and the reason this is one
 * function rather than an inline chain in the pickup handler.
 *
 * The base-archetype fallback is the fix: every zone-flavoured slime reskin
 * (mossSlime, blueSlime, mireWisp) is a `fodder` underneath and stacks into
 * the same 'slime-remnants'.  Before this they fell through to their own
 * variant name, so Verdant Wilds slime drops landed under a 'mossSlime' key
 * that nothing in the game reads — and the SERVER dropped nothing at all.
 */
export function remnantInvKey(skull) {
  if (!skull) return null;
  if (skull === 'fireGoblin') return 'fire-goblin-remnants';
  if (skull === 'mummy' || skull === 'skeleton') return 'skeleton-remnants';
  const base = (MONSTER_VARIANTS[skull] && MONSTER_VARIANTS[skull].baseArchetype) || skull;
  if (skull === 'fodder' || base === 'fodder') return 'slime-remnants';
  if (skull === 'snowman' || base === 'snowman') return 'snowman';
  return skull;
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
  if (curHp == null) return false;
  /* Allow the transform to fire on the death tick (curHp <= 0) so an
     overkill hit from above transformAt doesn't skip the skeleton phase
     entirely -- without this, mummies that get one-shotted from full
     HP have no death sheet of their own and just pop out (v2.3.135). */
  if (curHp > 0 && curHp / maxHp > v.transformAt) return false;
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
