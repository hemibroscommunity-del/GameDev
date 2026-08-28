/* ═══ v2.3.1757: THE MATERIAL TINT PIPELINE ═══
 *
 * Owner: "I'm planning to make this part of a larger armor recoloring (and
 * weapon recoloring) pipeline.  So architect it the way it would work best
 * performance wise."
 *
 * One art set, any number of metals.  A material is a COLOR, not a folder of
 * sprites: `copperplate` is the shipped steelplate art drawn with a tint.
 * Adding a metal is one entry in the table below — no new sheets, no new
 * network requests, no new preload registration, and (this is the point) no
 * new texture memory.
 *
 * ── why a GPU tint and not baked art, measured rather than assumed ──
 *
 * The obvious route is to recolor the sheets offline and ship a second folder.
 * The armour wardrobe is ~97 sheets at ~0.8 MB decoded each, so every colour
 * would add ~80 MB of resident texture — on the platform whose July RAM
 * incident was caused by exactly this kind of up-front asset weight (see the
 * ZONE-ASSET EXCEPTION in CLAUDE.md).  A per-colour CPU retint at load has the
 * same cost, just paid later.
 *
 * A Pixi tint is a per-vertex multiply inside the existing batcher: no extra
 * texture, no extra draw call, no batch break, and a hundred remote players in
 * a hundred different metals cost exactly what one costs.  So the tint is the
 * whole mechanism, and the only question was whether it can produce the colour
 * the owner approved.
 *
 * ── why it can, exactly ──
 *
 * A tint MULTIPLIES, so it can only darken: `out = texel * tint`.  The retint
 * the shirt/hair colours use is a brightness-RATIO map (`target * L / ref`),
 * which brightens everything above `ref` and therefore cannot be reproduced by
 * a multiply in general.  Two measurements closed the gap:
 *
 *   1. The steel sheets are 99.2% neutral (measured: <1% of opaque pixels
 *      carry any saturation), so there is no source hue for a tint to fight.
 *   2. Their max luminance is ALREADY 255 — the art contains true white
 *      highlights.  That is the normalisation the shirt art gets on purpose
 *      ("a grayscale tint base", gearSheets.js), and the plate has it for
 *      free.  So the shipped sheet IS the tint base: no bake step, no second
 *      texture, and `tint = white` reproduces the shipped steel EXACTLY
 *      (verified pixel-for-pixel, mean and worst error both 0).
 *
 * The tint for a metal is then just its colour scaled so its brightest channel
 * is 255.  Scaling all three channels by the same factor is what keeps the HUE
 * exact — a wrong hue reads as the wrong metal, while a slightly deeper one
 * reads as the same metal in shade.  Against the CPU retint the owner approved
 * this lands at mean 21/255 per channel, and the difference is that direction:
 * the tinted copper is a touch deeper than the preview.
 *
 * ── the one thing this cannot do ──
 *
 * The source must be near-neutral with white highlights.  Metals qualify.
 * Something already strongly coloured (a green cape, the bamboo sword) will
 * fight the tint and needs real art or a normalised base of its own — do NOT
 * quietly add such a piece to a material set and assume it works; look at it.
 */

/** Multiply tint for a design colour: the same hue at full brightness, then
 *  scaled by `level`.
 *
 *  v2.3.1760: `level` exists because normalising to full brightness makes every
 *  metal exactly as bright as the art, and IRON is supposed to be duller than
 *  steel.  Without it a darker metal is unexpressible — the normalisation would
 *  hand back the same near-white tint and iron would be steel with extra steps.
 *  Hue still comes from the normalise, so the two knobs stay independent: rgb
 *  says which metal, level says how bright. */
export function tintFromRgb(rgb, level = 1) {
  const m = Math.max(1, rgb[0], rgb[1], rgb[2]);
  const k = 255 / m * Math.max(0, Math.min(1, level));
  const r = Math.min(255, Math.round(rgb[0] * k));
  const g = Math.min(255, Math.round(rgb[1] * k));
  const b = Math.min(255, Math.round(rgb[2] * k));
  return (r << 16) | (g << 8) | b;
}

/* `rgb` is the DESIGN colour — the swatch you would pick in an art tool, and
 * the one the owner chose from the recolor preview.  `tint` is derived from it
 * so the table stays authored in human terms.
 *
 * 'steel' is the native art: white multiplies to a no-op, which is why an
 * unrecoloured piece costs nothing and cannot regress. */
export const MATERIALS = {
  steel: { id: 'steel', name: 'Steel', rgb: [255, 255, 255], swatch: '#c9ced6' },
  /* Owner picked the 'bronze' swatch [166,116,54] from the recolor preview and
     asked for it as Copper.  It shipped that way and then read wrong in play —
     owner: "I think I'm seeing the player pants layered on top of copper
     legging".  Nothing was layered: the copper legs are pixel-identical in
     SHAPE to the steel ones (diffed — every differing pixel is a colour
     change, none is a different figure).  The fault was the colour.  On the
     GREAVES, whose art carries less specular than the cuirass, that brown
     lands in the same register as the character's cloth trousers, so armour
     read as pants.
     Pushed toward orange until it cannot be mistaken for fabric.  This is the
     lesson for every metal added here: judge it on the LEGS, in the world, on
     bright ground — a swatch on a dark background over the torso is the
     easiest possible test and it passed one that play did not. */
  /* v2.3.1761 (owner: "The copper needs to be lightened some more.  It's hard
     to tell what it is when it's dark").  Lightened by DESATURATING toward the
     art's own value rather than by raising brightness, because brightness is
     not available: a tint MULTIPLIES, so the ceiling is the art itself and no
     colour here can make a midtone lighter than the pixel it multiplies.
     Going lighter still means either art authored brighter or a per-sprite
     filter with a real memory cost — noted so the next person does not go
     hunting for a number that would do it. */
  copper: { id: 'copper', name: 'Copper', rgb: [166, 103, 57], swatch: '#a66739' },
  /* v2.3.1760 (owner: "The second tier of armor will be iron" / "I do want
     copper and iron weapons also").  Iron reads as a duller, cooler metal than
     the bright steel the art is drawn as — hence `level`.  The art IS steel, so
     'steel' stays the native no-op and iron sits between it and copper. */
  iron: { id: 'iron', name: 'Iron', rgb: [198, 206, 218], level: 0.80, swatch: '#8f97a3' },
};

for (const m of Object.values(MATERIALS)) m.tint = tintFromRgb(m.rgb, m.level == null ? 1 : m.level);

/* ═══ v2.3.1760: WHICH WEAPONS TAKE A METAL ═══
   Owner: "I do want copper and iron weapons also.  First weapon should be
   copper.  Make sure weapons get the full treatment armor is getting.  Only
   for metals though not staff or bow."

   The blacksmith tier keys ARE metal names (server/src/data.js
   BLACKSMITH_TIERS: wood, copper, iron, steel, ...), and a weapon minted from
   them carries its tier as `gearBase` — so the metal is already on the weapon
   and needs no new field.  Woodworking weapons (bow, staff) are minted with a
   'ww_' prefix, which is the discriminator the owner's rule needs; the TYPE
   check backs it up so a bow can never take a metal even if its base is
   renamed.
   A tier with no entry in MATERIALS renders native, so the twenty tiers above
   iron keep the art they have until someone gives them a colour. */
const MELEE_TYPES = { sword: 1, greatsword: 1 };

export function weaponMaterial(type, gearBase) {
  if (!type || !MELEE_TYPES[type]) return null;      /* no staff, no bow */
  const base = gearBase ? String(gearBase) : '';
  if (!base || base.indexOf('ww_') === 0) return null;
  return MATERIALS[base] ? base : null;
}

/** The icon file for a base icon in a given metal.
 *
 *  One RULE rather than a table, and it is the same rule
 *  tools/gear/make-metal-icons.mjs writes by — so a metal added to MATERIALS
 *  and generated with that script is wired up by construction.  A table here
 *  would be a second place to forget. */
export function metalIconPath(basePath, material) {
  if (!basePath) return basePath;
  const m = material && MATERIALS[material];
  if (!m || m.tint === NATIVE_TINT) return basePath;
  /* v2.3.2068: .webp, not .png.  The per-metal icons were the only PNGs left
     in /icons/items and they were reached ONLY through this concatenation —
     no filename grep would have found them.  They are lossless webp now
     (exact pixels, 48% fewer bytes); the generator below writes the same
     extension, so the rule and the files still cannot drift apart. */
  return basePath.replace(/\.(webp|png)$/i, '') + '-' + m.id + '.webp';
}

/** Pixi tint for a weapon, or the native white for anything unmapped. */
export function weaponTint(type, gearBase) {
  return materialTint(weaponMaterial(type, gearBase));
}

export const NATIVE_TINT = 0xFFFFFF;

/** Pixi tint for a material id.  Unknown / absent -> the native no-op white,
 *  so a piece with no material declared renders exactly as its art. */
export function materialTint(id) {
  const m = id && MATERIALS[id];
  return m ? m.tint : NATIVE_TINT;
}

/** The design colour, for UI that needs to draw the metal outside the
 *  renderer (swatches, item icons). */
export function materialRgb(id) {
  const m = id && MATERIALS[id];
  return m ? m.rgb : null;
}

export function materialName(id) {
  const m = id && MATERIALS[id];
  return m ? m.name : null;
}

/* v2.3.1757: QA probe (mirrors traits/headwearCatalog's __btSetHeadwear). */
if (typeof window !== 'undefined') window.__btMaterials = () => MATERIALS;
/* v2.3.1760: the metals-only rule, so a test can pin it directly. */
if (typeof window !== 'undefined') window.__btWeaponMaterial = (t, g) => weaponMaterial(t, g);
