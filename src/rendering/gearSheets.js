/* Layered gear sheets (paper-doll equipment).
 *
 * Each gear piece is a transparent sprite sheet that shares the body's exact
 * frame layout: public/sprites/gear/<slot>/<item>/<pose>-<dir>.png, a strip of
 * 256x256 frames in the same count/order as the body's <pose>-<dir>.png.  Frame
 * i of the gear is pixel-aligned to frame i of the body, so the renderer draws
 * it with the SAME transform as the body sprite -- no anchors, no angles.
 *
 * This module just loads + slices + caches frame textures (mirror of
 * playerSkins.buildBodySheet).  Mirroring of west/nw/se is handled by the caller
 * copying the body sprite's (negative) scale.x, so we always load the BASE dir.
 *
 * See gear-layer-spec.md.
 */

import { Rectangle, Texture } from 'pixi.js';
import { GEAR_SLOTS, GEAR_CATALOG } from './gearCatalog.js';
import { upscaleToFrameHeight, antialiasUpscaledCanvas, downscaleByFactor, DISPLAY_DS } from './spriteScale.js'; /* v2.3.1110 upscale; v2.3.1341 AA; v2.3.1408 fullset display-downscale */
import { loadWebpOrPng } from './webpImage.js'; /* v2.3.1122: prefer lossless WebP, fall back to PNG */

const FRAME_W = 256;
const FRAME_H = 256;
/* v2.3.708: NE jog gear re-painted on the new 24-frame body cycle (see
   playerSprites VERSION 69); chain belt re-baked into the chest sheet. */
/* v2.3.748: + shirt/tshirt white-base sheets (all 5 base dirs by v2.3.754). */
/* v2.3.1053: + pickup-south sheets for chest/steelplate, legs/steelgreaves,
   and shirt/tshirt -- the loot-pickup freeze pose now shows the recoloured
   shirt + equipped plate instead of the bare body (owner-drawn art). */
/* v2.3.1054: pickup greaves rescaled +25% (owner) -- bump to refetch the PNG. */
/* v2.3.1123: + fish-south sheets for chest/steelplate, legs/steelgreaves, and
   shirt/tshirt -- the fishing pose now shows the equipped plate/greaves and the
   recoloured shirt (paper-doll, mirrors the cook stand-in). Each is a 4096x128
   32-frame strip aligned to fish-south.png; the armor tracks the body's per-
   frame lean, the shirt is a grayscale tint base with a 1px outline. */
const GEAR_VERSION = '2.3.1549'; /* v2.3.1549: east pauldrons restored FROM THE ORIGINAL BOARD -- the owner still had the full-armour jog-east sprite sheet and sent it (archived at assets/armor boards/fullset-steel-jog-east.png).  That is the actual source these figures were imported from in v2.3.1366, helmet and all, so it is the ground truth the chest sheet never was: re-imported through tools/import_fullset_board.py at the board's own 25 frames, it covers the shipped armour frame-for-frame at 0.97-0.99 (mean 0.988).  Restoring the missing armour then needs only to separate pauldron from helmet, and the data does that by itself -- measuring, per column, how far the board rises above the shipped top edge gives a cleanly bimodal split with ZERO columns at 8 or 9px: 473 columns rise 1-7px (the razored shoulder cap) and the rest rise 10px or more (the helmet).  MAXFILL=7 is that gap.  +778px over all 25 frames, 0 removed, and unlike the chest-sheet attempts 751 of those 778 are VISIBLE in play rather than 38, because this is the real outline rather than a cap hidden behind the head.  0 seams on all four directions after.  v2.3.1548: east joins the pauldron restore, on a correspondence that was MEASURED rather than assumed -- owner: "you have the original jog east torso armor sprites still.  Retrieve it" + "what if you took out the 3 frames from the torso sheet?".  Both right.  v2.3.1546 (reverted as v2.3.1547) paired the 25-frame fullset with the 28-frame chest sheet by scoring how much of the torso plate landed INSIDE the fullset -- worthless here, because a small plate scores ~1.00 against any frame it happens to fit inside, and rendered side by side the "matches" were unrelated poses.  The correspondence has to be measured against what BOTH sheets are registered to, the body: the chest sits inside its own body frame at 0.94 index-for-index, and the fullset is that same figure at the same scale, just headless (bbox 63px vs the body's 84, and 84-63 = 21 = exactly the east head height).  Matching the fullset's silhouette against the head-stripped body gives fullset 0..13 -> body 0..13 one-to-one, and fullset 14..24 -> the same cycle WITH THREE FRAMES DROPPED (3, 10, 13) -- the owner's three frames, found rather than guessed.  Mean silhouette agreement 0.94 (worst 0.88) at a constant (0,+2) offset, against 0.93-0.97 for the three directions that restored cleanly.  Still band-limited to the 8 rows below the figure's top edge, because even on the right map the chest sheet's sleeve edges differ by a pixel or two from the fullset's arm: 177px over 15 frames, of which 38 are visible in play (the head overlay covers the rest -- which is also why east never read as broken as north).  v2.3.1545: the jog fullset figures get back the armour the HELMET cuts took (tools/restore_fullset_pauldrons.py) -- owner, on jog north: "the very tips of the shoulder pauldron outlines get cut off in some frames ... the defect is in the standalone torso armor. It is not supposed to have that jagged chunk missing. The original sprite sheet art did not have that for jog north ... or maybe you cut it with the helmet still on it."  That last guess is right.  These figures were baked WITH a helmet and v2.3.1368-1379 cut it back off so the player's own head could show; the cuts were horizontal, so they took the tops of the PAULDRONS with the helmet and the domes came out razored flat with their keyline outline sliced away.  v2.3.1386 already answered one round of this ("pauldrons rounded -- no more razored flat line on jog north/south"), which is the tell that the CUT, not the art, is at fault.  The intact art was never lost: the same plate ships as its own torso sheet under gear/chest/steelplate for a partially-armoured player (v2.3.1372), with whole rounded pauldrons.  Measured, the two sheets are registered -- 93-97% of the torso's pixels land inside the fullset silhouette -- so the missing armour is put back from it.  STRICTLY ADDITIVE: written only where the fullset is transparent and the torso sheet has armour, so nothing else tuned into these sheets can regress and the helmet cannot return (the torso sheet has none in it).  north was losing 77px/frame, southwest 52, south 40.  EAST is skipped: its fullset plays 25 frames against the chest sheet's 28, so frame i is not the same pose in both.  After the restore the only armour outline the head still covers is the collar arch directly behind the neck, which is correct occlusion, and the seal re-check reports 0 seams on all four directions.  v2.3.1540: southwest fullset KEYLINED where it meets the jaw (tools/keyline_jaw.py) -- owner: "his chin turning into metal armor".  Removing the armour there is the instinctive fix and it does clear the jaw, but rendered on magenta it opens holes: the fullset REPLACES the body, so the armour touching the chin is the only thing drawn there.  Nothing is removed -- the armour pixels touching the head, in the jaw half only, are recoloured to the sheet's OWN darkest opaque value, the keyline it is already drawn with everywhere else.  The chin then has a clean dark edge instead of two mid-greys blending; no pixel loses alpha so no hole is possible, and the value is sampled rather than invented.  v2.3.1481: east-jog fullset gorget trimmed on frames 3 and 15 (tools/fix_east_jog_collar.py) — owner: "there's a frame on armor east jog that looks like it rides too high up into the characters face".  Measured with each frame's own crown as the datum so the run bob can't confuse the reading: the collar's top edge sits at crown+19..22 on all 23 other frames and at crown+17 (f3) / crown+18 (f15), 16 columns wide, right across the jaw and past the ear.  Nothing else was wrong — the sheet never rises above the eye line, the head overlay draws ON TOP of the figure, and the FULLSET_HEAD_RES residuals are sub-pixel — so this is two frames of art, not a placement bug.  Trimmed to crown+19, which is also where the head sheet's chin ends on those frames, so no seam opens; the new top row is re-darkened to the sheet's own keyline value. v2.3.1480: NEW shirt/tshirt hit-<dir> (all five base dirs) + mine-south sheets (tools/fit_shirt_art.py, owner-generated art) — the SHIRT slot was the last gap in these two poses, and it is the one most players actually wear, so an unarmoured bro still flashed bare-chested on every hit taken and every ore swing.  Fitted like the plate but with two deliberate differences: the target is the TRUNK ONLY (erode the arms off the skin mask, keep the core that meets the trousers, grow it back geodesically) because a tee that chases the whole upper body ends up sleeved to the wrist; and there is NO seal, because a tee is SUPPOSED to leave the forearms and belly bare.  Head is cut out of every frame, and on mining so are the pickaxe and boulder (they draw in front — see v2.3.1478). v2.3.1478: NEW mine-south chest/legs sheets (tools/fit_mine_armor_art.py, owner-generated art) — the pickaxe swing had never shipped gear either, so the player mined bare-chested whatever they wore (owner: "it looked like there was no chest armor while I was mining the ore").  Same fit/split/seal as the hit sheets, plus two things this pose needs: the pickaxe and the ore boulder are BAKED INTO the body sheet and draw in FRONT of the character, so they are cut back out of the finished plate instead of being swallowed by it; and the pickaxe shaft is skin-coloured to the shared classifier (measured (165,116,70) vs skin (237,133,55)), so the skin rule there carries an extra red-minus-green test. v2.3.1477: NEW hit-<dir> chest/legs sheets for all five base dirs (tools/fit_hit_armor_art.py, owner-generated art). The 250 ms hit-react pose had never shipped gear, so getGearFrame 404'd and a fully plated knight flashed BARE every time they took a hit. The art is keyed, overlap-fitted at one constant scale per direction, split into chest/legs by the body region each pixel sits on, and SEALED: any body pixel below the neck the art misses is filled from the nearest lit armour pixel, so with both pieces worn there is zero uncovered body on all 30 frames (owner: "make sure you remove the body beneath completely ... otherwise AI drift will make the naked body beneath poke out"). v2.3.1471: fish chest/shirt re-placed — v2.3.1461's silhouette-correlation fit left ~2x the original's uncovered skin at the collar and rod hand (owner: "bare hand coming through the armor near the hand"); the plate now rides the body's own motion track (same de-wobble) and the residual exposure is sealed INTO the plate, so zero body skin shows under the armor on all 32 frames. v2.3.1462: stand-south/-northeast waist gaps steel-filled in the chest sheets (patch_stand_gear_gaps.py) — uncovered skin/pants strips between sleeve and cuirass at sword-grip height read as a "hole around the right hand" (owner); neck opening + between-leg shadows deliberately kept. v2.3.1461: fish re-bake take 2 — RIGID integer tracking (owner: v1459's per-row shear read "jittery and wobbly"; a plate is a shell, not rubber): one np.roll'd (dx,dy) per frame from the torso correlation track, median-cleaned, zero resampling; legs fully constant on the feet. v2.3.1459: fish-south chest/shirt/legs re-baked to TRACK the body (rebake_fish_gear.py) — the shipped sheets were ONE stamp translated with ~2.1x the body's sway; the v2.3.1216 runtime chest de-jitter table is deleted with it. v2.3.1457: SW fullset re-cut with the north/south protections — RELIEF 2px, connectivity-gated shelf erase, band-limited round-top (owner: backswing "shoulder ... clipped at the top"); jog-southwest-head.png regenerated from the same rows. v2.3.1456: east fullset edge cleanup — detached flecks + helmet antenna stubs removed, 1px notches filled, staircase corners soft-AA'd (owner: "lines look chewed up in the back"). v2.3.1393: east collar slit-fill under the jaw (fix_east_neck_collar.py). v2.3.1381: south fullset rebuilt on armor-anchored cuts (shoulder slivers). v2.3.1380: SW f1 two-band cut — face clear, pauldron kept (owner). v2.3.1379: north rebuilt on armor-anchored cuts (sliver flicker); SW f1 gray arcs stripped. v2.3.1378: SW f0-f2/f13-f14 helmet-edge leftovers shaved to the armor shelf (owner). v2.3.1377: southwest fullset rebuilt on armor-anchored per-frame neck cuts (owner frame list). v2.3.1373: chest hem belt extended a few px down (south/southwest/
   north) so chest-only wear never flashes tan belly between hem and trousers; east fullset interior
   seam lines lifted toward soft gray ("too thick of black outlines"). */
/* v2.3.1372: hip-skirt (thigh plate) pixels stripped BACK OUT of the
   south/southwest/north jog chest sheets (restored to the v2.3.1345b belt-stripped originals).  The
   v2.3.1348b "restored hip skirt" baked the mannequin's silver skirt into the CHEST sheet, so a player
   wearing ONLY the chest plate showed leg armor on bare thighs (owner report).  Full-set on these dirs
   uses the fullset figure and never draws this sheet; NE/NW full-set gets its thigh cover from the
   LEGS sheet, so nothing else changes. */
/* v2.3.1345: baked jog belts STRIPPED from all five chest sheets — the
   chain belt is now a runtime layer (see getJogBeltTexture + entityRenderer._placeGear); six rounds of
   baking/sealing it into the sheets each produced a new on-device artifact.
   BUMP THIS on EVERY gear-art regen — v2.3.1342c changed the PNGs without bumping, so
   previews served the cached old art and the change was invisible on-device. */

/* `${slot}/${item}/${pose}/${dir}` -> [Texture] | 'loading' | [] (missing) */
const _sheets = {};

/* v2.3.1122: WebP-preferring load (PNG fallback) for the gear sheets. */
function loadImg(url) { return loadWebpOrPng(url); }

/* v2.3.1305: bounded retry on gear-sheet load failure.  A flaked request
   (deploy-day cold CDN edge / dropped mobile request) used to cache []
   permanently and hide that gear slot for that (pose,dir) all session —
   part of the owner's "clothes missing depending on the angle" report.
   The entry stays 'loading' across the backoff so callers keep their
   graceful null fallback; the retry URL appends &r=N to bypass a
   poisoned cache entry.  Deliberately NO crash-telemetry here: partial
   pose sets are by design (fish/pickup ship south only), so a final
   failure is only distinguishable from expected-missing art by eye —
   flip window.__spriteLog = true to see them. */
const _GEAR_RETRY_MS = [2000, 6000];
function buildSheet(key, slot, item, pose, dir, attempt = 0) {
  _sheets[key] = 'loading';
  /* Returns a promise that ALWAYS resolves (missing sheet -> []), so callers
     that want to await a full preload don't hang on a 404. */
  const bust = attempt > 0 ? `&r=${attempt}` : '';
  return loadImg(`/sprites/gear/${slot}/${item}/${pose}-${dir}.png?v=${GEAR_VERSION}${bust}`).then(rawImg => {
    /* restore a downscaled-on-disk gear sheet to the 256px frame (no-op for any
       native >=256 sheet, so the variable-height combat poses are untouched) */
    const rawH = rawImg.naturalHeight || rawImg.height || 0;
    /* v2.3.1120: gear stays at the FULL 256 frame (NOT display-downscaled like the
       body).  Gear is also consumed by the combat swing/bowshot stand-ins
       (effectsRenderer) at 256, so downscaling it here would shrink the legs there;
       instead the MAIN renderer's _placeGear divides the body transform by
       DISPLAY_DS to render this 256 gear at the right size over the smaller body.
       v2.3.1341 (owner: the chain belt / armor edges SHIMMER while jogging): the
       v2.3.1237 anti-alias cure was only ever applied to the BODY sheets, so
       128px-on-disk gear rendered with raw nearest-upscale stair-steps that
       crawl sub-pixel in motion.  antialiasUpscaledCanvas is the SAME resample,
       but size-preserving — the 256 contract above still holds (unlike
       bakeDisplayCanvas, which would shrink gear if DISPLAY_DS ever went back
       to 2).  Native >=256 sheets pass through untouched. */
    /* v2.3.1408 (DISPLAY_DS=2): the FULLSET figure sheets are display-
       downscaled like the body, NOT kept at the 256 gear contract.  The
       figure texture is assigned directly onto the body sprite
       (entityRenderer _fullsetFrame -> spriteBody.texture), whose
       transform expects display-sized frames — this is exactly why the
       figure path used to be guarded to DISPLAY_DS === 1.  Storing the
       fullset at display size makes the figure a drop-in body frame at
       any DS, so the guards lift and the painted knight stays on the
       figure path.  Overlay/combat gear sheets keep the full-256
       contract (the note above still holds for them).  fw/fh track the
       scaled frame for slicing. */
    /* v2.3.1434 (frost OOM report: "crashed after harvesting different
       resources over a short period"): the exact-texel treatment extends
       from the fullset figures to EVERY gear sheet that ships at the
       display size on disk (jog/stand/pickup/fish steel sheets are all
       128px-tall art; the "full 256" was always a nearest-neighbour
       pixel-double of these texels).  Storing them raw at 128 removes
       ~60MB of resident upscale canvases at DS=2 with the artist's
       exact pixels — the same owner-approved recipe as v2.3.1412 —
       and halves the lazy fish/mine harvest-pose loads that stacked
       the frost-zone peak back to the iOS kill line.  Consumers are
       size-agnostic: the masked bake stretch-draws by source rect, and
       _placeGear (entityRenderer) now normalizes by the texture's own
       frame width.  Sheets shipping any OTHER height (bowshot/cook/
       chop combat stand-in strips, 256-native art) keep the full-256
       contract unchanged. */
    const _fsDs = (slot === 'fullset' || (DISPLAY_DS > 1 && rawH === FRAME_H / DISPLAY_DS)) ? DISPLAY_DS : 1;
    let img;
    if (_fsDs > 1 && rawH === FRAME_H / _fsDs) {
      /* v2.3.1412 (owner: "the half res texture looks soft — it's a very
         simple armor sprite, maybe it can be compressed differently").
         The steel figure sheets ship 128px ON DISK — the 256 "full res"
         was always a nearest-neighbour 2x pixel-double of these texels.
         The v2.3.1408 pipeline (NN-upscale 128->256, anti-alias, Lanczos
         back down to 128) double-resampled the art into mush.  When the
         on-disk height already IS the display size, slice the RAW image
         untouched: the texture is the artist's exact pixels, same memory,
         no resampling anywhere. */
      img = rawImg;
    } else {
      img = antialiasUpscaledCanvas(upscaleToFrameHeight(rawImg, FRAME_H), rawH);
      if (_fsDs > 1) img = downscaleByFactor(img, _fsDs);
    }
    const fw = FRAME_W / _fsDs, fh = FRAME_H / _fsDs;
    const src = Texture.from(img).source;
    src.scaleMode = 'linear';
    /* v2.3.1385: the v2.3.1384 fullset mips-off (invisible-knight memory
       guess) came RIGHT BACK as "lines are blurry and wobbly behind the
       character while running east" — on a 3x-DPR phone the strip renders
       slightly minified in device pixels, exactly where mips matter.
       Restored; the invisible-knight hunt rides on the v2.3.1384 telemetry
       (gear-sheet-failed / body-sheet-failed + GL caps) instead. */
    src.autoGenerateMipmaps = true;
    const frames = Math.max(1, Math.floor(img.width / fw));
    const out = [];
    for (let i = 0; i < frames; i++) {
      out.push(new Texture({ source: src, frame: new Rectangle(i * fw, 0, fw, fh) }));
    }
    _sheets[key] = out;
  }).catch(() => {
    if (attempt < _GEAR_RETRY_MS.length) {
      /* v2.3.1398: retry CHAINS into the returned promise so the intro
         gate (preloadGear/preloadFullsetFigures awaiters) waits through
         the backoff instead of passing with a sheet still re-fetching. */
      return new Promise((res) => setTimeout(res, _GEAR_RETRY_MS[attempt]))
        .then(() => buildSheet(key, slot, item, pose, dir, attempt + 1));
    }
    _sheets[key] = []; /* missing -> caller hides the slot */
    try { if (window.__spriteLog) console.warn('[sprite] gear sheet failed', key); } catch (e) { /* ignore */ }
    /* v2.3.1384: a FINAL failure on a sheet that must exist (the fullset
       knights and their jog belts) is real evidence for an invisible /
       misdressed character — land it in the crash ring so on-device
       reports arrive with facts.  Poses that legitimately 404 (fish/
       pickup non-south) never reach here with these slots. */
    if (slot === 'fullset' || slot === 'belt') {
      try { import('../debug/crashTrap.js').then(ct => ct.recordCrash('gear-sheet-failed', key)).catch(() => {}); } catch (e) { /* ignore */ }
    }
  });
}

/** Frame texture for an equipped piece, or null while loading / if missing /
 *  if nothing is equipped in the slot.  Lazy-baked + cached per (slot,item,
 *  pose,dir).  The caller (entityRenderer) passes the BASE dir + body frameIdx
 *  and copies the body sprite's transform, which carries mirror + bodyScale. */
export function getGearFrame(slot, item, pose, dir, frameIdx) {
  if (!item || item === 'none') return null;
  const key = slot + '/' + item + '/' + pose + '/' + dir;
  const entry = _sheets[key];
  if (entry === undefined) { buildSheet(key, slot, item, pose, dir); return null; }
  if (entry === 'loading' || !entry.length) return null;
  return entry[((frameIdx % entry.length) + entry.length) % entry.length];
}

/** v2.3.1367: frame by CYCLE PHASE (0..1) instead of a body frame index —
 *  for sheets whose frame count differs from the body cycle's (the east
 *  fullset ships its native 25 frames vs the 28-frame body cycle; owner:
 *  "cut the animation cycle down to the frame count instead of extending
 *  it").  Each sheet frame plays exactly once per cycle, evenly spaced on
 *  the same clock, so there are no held/duplicated frames and no wrap
 *  jump. */
export function getGearFramePhased(slot, item, pose, dir, phase) {
  if (!item || item === 'none') return null;
  const key = slot + '/' + item + '/' + pose + '/' + dir;
  const entry = _sheets[key];
  if (entry === undefined) { buildSheet(key, slot, item, pose, dir); return null; }
  if (entry === 'loading' || !entry.length) return null;
  const p = ((phase % 1) + 1) % 1;
  return entry[Math.min(entry.length - 1, Math.floor(p * entry.length))];
}

/* v2.3.1345: the jog chain belt ships as its own gear sheet
   (belt/chainbelt/jog-<dir>.png, generated by tools/gen_jog_belt_table.py,
   clipped to the body silhouette per frame) and loads through the normal
   buildSheet path above — entityRenderer requests
   getGearFrame('belt', 'chainbelt', 'jog', dir, frameIdx) and draws it on a
   dedicated sprite BELOW gearLegs.  A missing sheet degrades gracefully
   (belt hidden; the pants band still covers the seam). */

/** v2.3.1376: preload the pre-composed FULLSET knight figures (jog
 *  south/southwest/north/east) — they replace the whole armored body when
 *  the full steel set is worn, and a lazy first fetch hitched the first
 *  armored jog per direction (animation-preload law, CLAUDE.md v2.3.1358).
 *  Missing dirs (northeast keeps the classic composite) resolve to [] and
 *  cost one 404 at load time. */
export function preloadFullsetFigures() {
  const tasks = [];
  for (const dir of ['south', 'southwest', 'north', 'east']) {
    const key = 'fullset/steel/jog/' + dir;
    if (_sheets[key] === undefined) tasks.push(buildSheet(key, 'fullset', 'steel', 'jog', dir));
  }
  return Promise.all(tasks);
}

/** Unique TextureSources of every gear sheet baked so far (idle/jog stand sets).
 *  Lets the renderer force-GPU-upload them during the loading screen (mirrors
 *  the masked-body uploadBakedTextures) so a first armored turn doesn't pay a
 *  lazy first-draw upload.  All frames of a sheet share one source. */
export function getLoadedGearSources() {
  const sources = new Set();
  for (const entry of Object.values(_sheets)) {
    if (Array.isArray(entry) && entry.length && entry[0] && entry[0].source) {
      sources.add(entry[0].source);
    }
  }
  return sources;
}

/** Pre-bake a slot's spawn-pose sheets (all base dirs) to avoid a first-frame
 *  gap, mirroring playerSkins.prewarmBody. */
export function prewarmGear(slot, item) {
  if (!item || item === 'none') return;
  for (const dir of ['east', 'north', 'northeast', 'south', 'southwest']) {
    const key = slot + '/' + item + '/stand/' + dir;
    if (_sheets[key] === undefined) buildSheet(key, slot, item, 'stand', dir);
  }
}

/** Preload EVERY (pose, dir) sheet for EVERY catalog gear item so the
 *  armoured figure never falls back to the bare body when the player first
 *  turns/jogs in a fresh direction (the gear sheets were previously lazy-
 *  loaded on first use, which read as an armour->unarmoured flicker).
 *  Returns a promise that resolves once all sheets are baked (or 404'd).
 *  Poses limited to those the gear set actually ships to avoid spurious 404s.
 *  v2.3.1477: + 'hit' — the 250 ms recoil now ships chest/legs sheets for all
 *  five base dirs, and a lazy first fetch would drop the armour for the whole
 *  first hit (animation-preload law, CLAUDE.md). */
export function preloadGear() {
  const DIRS = ['east', 'north', 'northeast', 'south', 'southwest'];
  /* (pose, dirs) pairs, not pose x dirs: the gather poses are authored
     south-only, so v2.3.1478's mine sheets would 404 four times per slot on
     every load if they rode the full DIRS loop. */
  const SETS = [['stand', DIRS], ['jog', DIRS], ['hit', DIRS],
    ['mine', ['south']]];
  const tasks = [];
  for (const slot of GEAR_SLOTS) {
    /* v2.3.1197: preload EVERY catalog item per slot, not just the currently
       equipped one. Equipping owned armour after spawn used to fetch+slice the
       sheet on the main thread (the equip stutter / armour flicker). The gear
       catalog is tiny (one armour set), so this adds little to the loading
       screen and matches what preloadCombatGear() already does for swings. */
    for (const c of (GEAR_CATALOG[slot] || [])) {
      const item = c && c.id;
      if (!item || item === 'none') continue;
      for (const [pose, dirs] of SETS) {
        for (const dir of dirs) {
          const key = slot + '/' + item + '/' + pose + '/' + dir;
          if (_sheets[key] === undefined) tasks.push(buildSheet(key, slot, item, pose, dir));
        }
      }
    }
  }
  return Promise.all(tasks);
}
