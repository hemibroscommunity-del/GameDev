/* Weapon icon sprite loader for the Pixi renderer.
 *
 * Mirrors the Canvas 2D path in BroTown.jsx ~1346:
 *   sword / greatsword → /sprites/weapons/swords/Sword1.webp
 *   bow                → /sprites/weapons/bows/Bow2.png
 *   staff              → /sprites/weapons/staffs/Wizard%20Staff2.png
 *
 * Each PNG is a single-frame icon (not a strip).  Loaded as a Pixi
 * Texture and reused by all weapon sprites in the renderer.
 */

import { Assets, Texture } from 'pixi.js';

/* Bump on every weapon-art change so URL-keyed browser/CDN caches
   refetch instead of serving the previous PNG. */
/* v2.3.1763: bow + staff art repainted as PINE (tools/gear/make-pine-wood.mjs,
   owner: "recolor the bow and staff lighter to look like pine").  PNG rather
   than WebP for the same reason the fishing pole is (v2.3.1696): the sources
   are WebP and there is no WebP encoder in this sandbox, so a regenerated file
   can only come out as PNG.  Version bumped or every CDN edge keeps serving
   the brown art. */
const SPRITE_VERSION = '2.3.2910';   // 1073: re-added black outline to all bow art (recolor had stripped it); 2354: the two 1254px sword icons became 256px twins; 2895: greatsword-<dir> art widened 1.75x

/* v2.3.172: per-gearBase variants. Keys are `${type}:${gearBase}`;
   the bare type key is the fallback for any unmapped gearBase. wood-
   tier swords pick the Bamboo art; higher tiers fall through to
   Sword1.png. Same pattern can be extended per BLACKSMITH_TIERS.
   v2.3.942: the greatsword has per-FACING held art (owner-drawn, grip
   pinned via handles.json greatsword-<dir>).  Keys `greatsword-<dir>`
   for the 5 canonical facings; the other 3 mirror in entityRenderer. */
/* ═══ v2.3.2354: THE HELD SWORD ICONS ARE 256, NOT 1254 ═══
   Sword1.webp and Bamboo.webp are 1254x1254 -- 6 MB of decoded RGBA each,
   12 MB resident in every zone -- and they are drawn as the held weapon at
   `fitScale = targetH / th` with targetH 26 (chrome sword), 45 (bamboo) or
   48 (greatsword) world px: at most ~119 device px on a dpr-3 phone with the
   dashboard folded, so a 256 twin is still twice the resolution anything
   samples.  The per-facing greatsword art beside them was already ~100px,
   which is what the slot's real size looks like (P7 item 4).
   THE TRAP, and why handles.json changed with them: every grip anchor is
   `handle[0] / tex.width` (entityRenderer, effectsRenderer, the portrait),
   so the numbers in that file live in EACH sprite's own pixel space.  Left
   alone, a 1180-of-1254 grip against a 256px texture would put the anchor at
   4.6 -- the blade would fly off the hand entirely.  The two rows are scaled
   by the same 256/1254 and kept as floats so the ANCHOR FRACTION is
   identical to six decimal places; the tip is not stored anywhere (only the
   -45 degree axis in blockArm.js, which a proportional resize cannot move). */
/* ═══ v2.3.2910: THE GREATSWORD IS WIDER, NOT SHORTER ═══
   Owner: "make the great sword the player holds wider (maybe 1.5 to 2x as
   wide?)".  The five greatsword-<dir> sheets were re-drawn 1.75x thicker by
   tools/art/widen_greatsword.py -- stretched PERPENDICULAR to each blade's
   own diagonal about its handles.json grip, so the hilt stays in the fist.

   THE TRAP: every site sizes held art by texture HEIGHT (targetH / th).  A
   fatter diagonal blade needs a taller canvas (200 -> ~207), so dividing by
   the new height would quietly shrink the sword and give back part of the
   width.  `fitH` is the sheet's ORIGINAL height; weaponFitH() hands it to
   the sizing math (never to the grip anchor, which is in the new canvas's
   pixels).  Result: same length on screen, 1.75x the width.

   Then, same day: "Maybe a little longer too".  `lenMul` scales the drawn
   size along with it (both axes -- the art is already the width asked for
   relative to its length, so this keeps the new proportions).  Every site
   that sizes per-facing greatsword art goes through weaponFitH, so this ONE
   number reaches the carried blade, the swing, both block off-hand views and
   the equip portrait together; the grip anchor is untouched, so the hilt
   stays in the fist and the extra length goes out past the tip. */
const GREATSWORD_LEN_MUL = 1.2;
/* v2.3.2927: `carryH` -- the world-px height a blade is drawn at in the hand
   (entityRenderer's targetH for it), for the soft bake below.  The bare
   greatsword icon is only ever the sheathed / other-player carry (36); the
   per-facing sheets are the held one (48). */
const SHEETS = {
  sword:        { url: `/sprites/weapons/swords/Sword1-256.webp?v=${SPRITE_VERSION}`,      tex: null, carryH: 26 },
  'sword:wood': { url: `/sprites/weapons/swords/Bamboo-256.webp?v=${SPRITE_VERSION}`,      tex: null, carryH: 45 },
  greatsword:   { url: `/sprites/weapons/swords/Sword1-256.webp?v=${SPRITE_VERSION}`,      tex: null, carryH: 36 },
  'greatsword-south':     { url: `/sprites/weapons/swords/greatsword-south.webp?v=${SPRITE_VERSION}`,     tex: null, fitH: 200, lenMul: GREATSWORD_LEN_MUL, carryH: 48 },
  'greatsword-southwest': { url: `/sprites/weapons/swords/greatsword-southwest.webp?v=${SPRITE_VERSION}`, tex: null, fitH: 200, lenMul: GREATSWORD_LEN_MUL, carryH: 48 },
  'greatsword-east':      { url: `/sprites/weapons/swords/greatsword-east.webp?v=${SPRITE_VERSION}`,      tex: null, fitH: 200, lenMul: GREATSWORD_LEN_MUL, carryH: 48 },
  'greatsword-northeast': { url: `/sprites/weapons/swords/greatsword-northeast.webp?v=${SPRITE_VERSION}`, tex: null, fitH: 200, lenMul: GREATSWORD_LEN_MUL, carryH: 48 },
  'greatsword-north':     { url: `/sprites/weapons/swords/greatsword-north.webp?v=${SPRITE_VERSION}`,     tex: null, fitH: 200, lenMul: GREATSWORD_LEN_MUL, carryH: 48 },
  bow:          { url: `/sprites/weapons/bows/Bow2.png?v=${SPRITE_VERSION}`,              tex: null },
  'bow-south':     { url: `/sprites/weapons/bows/bow-south.png?v=${SPRITE_VERSION}`,     tex: null },
  'bow-southwest': { url: `/sprites/weapons/bows/bow-southwest.png?v=${SPRITE_VERSION}`, tex: null },
  'bow-east':      { url: `/sprites/weapons/bows/bow-east.png?v=${SPRITE_VERSION}`,      tex: null },
  'bow-northeast': { url: `/sprites/weapons/bows/bow-northeast.png?v=${SPRITE_VERSION}`, tex: null },
  'bow-north':     { url: `/sprites/weapons/bows/bow-north.png?v=${SPRITE_VERSION}`,     tex: null },
  staff:        { url: `/sprites/weapons/staffs/Wizard%20Staff2.png?v=${SPRITE_VERSION}`, tex: null },
};

function keyFor(type, gearBase) {
  if (gearBase && SHEETS[`${type}:${gearBase}`]) return `${type}:${gearBase}`;
  return type;
}

/* ═══ v2.3.2927: THE BLADE AT THE BODY'S RESOLUTION ═══
 * Owner: "The character body is also slightly softer lower res art so I'm
 * wondering if softening all the blade frames would look more natural or
 * just sharpening the character."  Then: "Try softening blade work now."
 *
 * MEASURED: the body's display textures are baked at 128 texels per 256-space
 * frame (spriteScale DISPLAY_DS = 2, stand AND jog alike), drawn at
 * bodyScale = BODY_DIR_SCALE (0.93-1.25, ~1.06 typical) x 0.421875 -- so one
 * body texel covers ~0.9 world px.  A held blade is drawn at
 * carryH / sheet height: the greatsword sheets at 48 / 166.7 = 0.29 world px
 * per texel, the 256 px sword icon at 26 / 256 = 0.10.  So the blade carried
 * three to nine times the detail of the hand holding it, and read as a sharp
 * cut-out pasted onto a soft figure.  (Sharpening the body instead cannot add
 * detail its 128 px art does not have; it only rings the edges.)
 *
 * THE BAKE: each blade is resampled DOWN to the body's texel size and smoothly
 * back UP to its own canvas size ('high' both ways -- the same resample the
 * body's own anti-alias bake uses, spriteScale antialiasUpscaledCanvas).  The
 * result has the body's level of detail but the SAME pixel dimensions, so the
 * grip anchors (handles.json, in each sheet's own pixels), weaponFitH, the
 * fist masks and every sizing site are untouched.  Once, behind the loading
 * screen (the preload law: loadWeaponSprites is on the gate), ~10 small
 * canvases.  Swords and greatswords only -- the ask was the blades.
 *
 * HOW SOFT, picked by looking (mp-bladesoft, idle S and E side by side at
 * dpr 3): at the body's exact texel size (1x) the blade went out of focus and
 * lost the dark keyline the body's own art keeps; stepping back up in blocks
 * instead gave the tilted blade saw-teeth.  TWICE the body's detail (2x) takes
 * the cut-out crispness off and keeps the outline and the fuller readable;
 * 3x is barely distinguishable from the sharp art.  So BLADE_DETAIL = 2.
 *
 * ?bladesoft=0 turns it off (compare on the phone); ?bladesoft=<n> sets the
 * detail instead (1 = the body's exact texel size, 3 = crisper). */
const BLADE_DETAIL = 2;
const BODY_TEXEL_WORLD = 2 * 0.421875 * 1.06;   /* ~0.9 world px per body display texel */
function bladeSoftMul() {
  try {
    const m = /[?&]bladesoft=([0-9.]+|off|on)\b/.exec(window.location.search);
    if (!m || m[1] === 'on') return BLADE_DETAIL;
    if (m[1] === 'off') return 0;
    return parseFloat(m[1]) || 0;
  } catch (e) { return BLADE_DETAIL; }
}
function softBake(tex, k) {
  const src = tex && tex.source && tex.source.resource;
  const w = tex && tex.source ? tex.source.width : 0, h = tex && tex.source ? tex.source.height : 0;
  if (!src || !w || !h || !(k > 0 && k < 1) || typeof document === 'undefined') return null;
  const sm = document.createElement('canvas');
  sm.width = Math.max(1, Math.round(w * k)); sm.height = Math.max(1, Math.round(h * k));
  const sctx = sm.getContext('2d');
  sctx.imageSmoothingEnabled = true; sctx.imageSmoothingQuality = 'high';
  sctx.drawImage(src, 0, 0, sm.width, sm.height);
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const octx = out.getContext('2d');
  octx.imageSmoothingEnabled = true; octx.imageSmoothingQuality = 'high';
  octx.drawImage(sm, 0, 0, w, h);
  const soft = Texture.from(out);
  soft.label = 'blade-soft';
  return soft;
}
function softenBlades() {
  const mul = bladeSoftMul();
  if (!(mul > 0)) return;
  const cache = new Map();   /* sword and the bare greatsword share one sheet; bake per (url, k) */
  for (const key of Object.keys(SHEETS)) {
    const e = SHEETS[key];
    if (!e.tex || !e.carryH || e.sharp) continue;
    const sheetH = (e.fitH || e.tex.height) / (e.lenMul || 1);
    const k = Math.min(1, (e.carryH / sheetH) / BODY_TEXEL_WORLD * mul);
    const ck = e.url + '|' + k.toFixed(3);
    let soft = cache.get(ck);
    if (soft === undefined) { try { soft = softBake(e.tex, k); } catch (err) { soft = null; } cache.set(ck, soft); }
    if (soft) { e.sharp = e.tex; e.tex = soft; e.softK = k; }
  }
}

let loadPromise = null;

async function loadIcon(type) {
  const entry = SHEETS[type];
  if (!entry || entry.tex) return;
  try {
    const tex = await Assets.load(entry.url);
    if (tex) entry.tex = tex;
  } catch {
    /* Missing — caller falls back to procedural Graphics. */
  }
}

export function loadWeaponSprites() {
  if (loadPromise) return loadPromise;
  /* sword + greatsword share the same URL — Pixi v8 Assets dedupes
     by URL so requesting both is cheap. */
  const seen = new Set();
  const tasks = [];
  for (const type of Object.keys(SHEETS)) {
    if (seen.has(SHEETS[type].url)) continue;
    seen.add(SHEETS[type].url);
    tasks.push(loadIcon(type));
  }
  /* After the first batch resolves, dedupe types pointing at the same
     URL get filled in by re-checking each entry. */
  loadPromise = Promise.all(tasks).then(() => {
    for (const type of Object.keys(SHEETS)) {
      if (SHEETS[type].tex) continue;
      for (const other of Object.keys(SHEETS)) {
        if (SHEETS[other].url === SHEETS[type].url && SHEETS[other].tex) {
          SHEETS[type].tex = SHEETS[other].sharp || SHEETS[other].tex;
          break;
        }
      }
    }
    softenBlades();   /* v2.3.2927 */
  });
  return loadPromise;
}

/** Return the loaded texture for a weapon type (+ optional gearBase),
 *  or null if not yet loaded.  Caller falls back to procedural drawing
 *  when null.  Passing gearBase picks a tier-specific variant when one
 *  is registered (e.g. sword:wood -> Bamboo); otherwise falls back to
 *  the bare-type entry. */
export function getWeaponTexture(type, gearBase, dir) {
  /* v2.3.942/944: per-facing held art keyed `${type}-${dir}` (greatsword, bow). */
  if (dir && SHEETS[`${type}-${dir}`] && SHEETS[`${type}-${dir}`].tex) {
    return SHEETS[`${type}-${dir}`].tex;
  }
  const entry = SHEETS[keyFor(type, gearBase)];
  return (entry && entry.tex) || null;
}

/** v2.3.1841: the same art, by URL, for the 2D compositor.
 *  characterPortrait draws on a canvas and cannot use a Pixi Texture, and the
 *  equip screen has to show the weapon you are actually holding.  Resolving
 *  the key HERE rather than rebuilding the path over there is the point: the
 *  per-facing keys, the gearBase variants and the cache-busting version are
 *  all one table, and a second copy of them would drift the first time a
 *  sprite is renamed. */
export function weaponArtUrl(type, gearBase, dir) {
  if (dir && SHEETS[`${type}-${dir}`]) return SHEETS[`${type}-${dir}`].url;
  const k = keyFor(type, gearBase);
  return (SHEETS[k] && SHEETS[k].url) || null;
}

/** v2.3.2910: the height to SIZE this art by (fitScale = targetH / fitH).
 *  Normally the texture's own height; a sheet widened after the fact carries
 *  its pre-widening height so it keeps its length, divided by any `lenMul`
 *  so it can be drawn longer on purpose (see SHEETS).  `fallbackH`
 *  is the caller's measured height (texture or <img>). */
export function weaponFitH(type, gearBase, dir, fallbackH) {
  /* Same pick as getWeaponTexture: the per-facing sheet only once it has
     loaded, else the bare/gearBase one -- so the height matches the art. */
  const d = dir && SHEETS[`${type}-${dir}`];
  const entry = (d && d.tex) ? d : SHEETS[keyFor(type, gearBase)];
  return ((entry && entry.fitH) || fallbackH) / ((entry && entry.lenMul) || 1);
}

export function hasWeapon(type, gearBase, dir) {
  if (dir && SHEETS[`${type}-${dir}`]) {
    return !!SHEETS[`${type}-${dir}`].tex;
  }
  const k = keyFor(type, gearBase);
  return !!(SHEETS[k] && SHEETS[k].tex);
}
