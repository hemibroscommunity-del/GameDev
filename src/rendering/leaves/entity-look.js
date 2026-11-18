/* ═══ v2.3.6200: look's leaves from entityRenderer.js (card EN, grand plan 5.5, M's line 8) ═══
 *
 * Top-level functions of src/rendering/systems/entityRenderer.js that read
 * no `this` and reach no module state, moved VERBATIM (only `export` and
 * the imports are new), with the constants they read; imported back by the
 * same names.  A leaf imports nothing from the renderers (four-lines'
 * IMPORT_CYCLE_FILES has no room).  The census: part 5 of
 * docs/plan/census/M-tables.md (tools/dev/render-code-census.mjs).
 */
import { Assets, Rectangle, Texture } from 'pixi.js';
import { BODY_DIR_SCALE, BODY_ROWS, FULLSET_CROWN, JOG_EW_HAT_TUNE, STAND_HAT_TUNE, _CAPE_HOOD_DX_K, _CAPE_HOOD_TILT_K, _CAPE_JOG_DX, _CAPE_JOG_TILT, _CAPE_PIVOT_Y } from '../tables/look.js';
import { artHasInk, sanitizeShirtArt } from '../traits/playerArt.js';
import { gearArt, gearMaterial, gearTint } from '../gearVariants.js';
import { gearDrawFrame, gearDrawFramePhased } from '../gearWalkFrame.js';
import { getEquip } from '../gearCatalog.js';
import { getEyeColor } from '../traits/eyeColorCatalog.js';
import { getEyeStyle } from '../traits/eyeStyleCatalog.js';
import { getLookBodyEntries, getPants, getShoes, getSkin } from '../playerSkins.js';
import { headwearBehindBeard, headwearUnderHair } from '../traits/headwearCatalog.js';
import { lookArmourFrame, lookArmourOn, lookSheetForWorker } from '../lookArmour.js';
import { pageAddress } from '@/game/switches.js';
import { sanitizePattern } from '../traits/patternCatalog.js';
import { wornSigOf } from '../maskedEvict.js';

/* ── v2.3.6200: level 0 ── */
/* v2.3.3520: the arm capsule's body clone and every clone riding on it
   (shirt v2.3.2134, cape v2.3.2138, greaves and plate v2.3.3520), hidden
   together.  The shield's and the empty hand's branches hid the body clone
   alone, so the shirt's and cape's could linger a frame after a shield came up
   mid east jog -- a stripe with nothing under it. */
export function _hideArmClones(display) {
  if (!display) return;
  if (display._handArmSprite) display._handArmSprite.visible = false;
  if (display._handArmShirt) display._handArmShirt.visible = false;
  if (display._handArmLegs) display._handArmLegs.visible = false;
  if (display._handArmChest) display._handArmChest.visible = false;
  if (display._handArmCape) display._handArmCape.visible = false;
}
export function _traitState(e, dir) {
  if (!e) return 'none';
  const now = Date.now();
  const f = e.inflight && e.inflight[dir];
  return [e.tex && e.tex[dir] ? 'tex' : 'no-tex', f ? `asked ${Math.round((now - f) / 1000)}s` : '',
    e.gaveUp && e.gaveUp[dir] ? 'gave-up' : '', e.retryAt ? `retry in ${Math.max(0, Math.round((e.retryAt - now) / 1000))}s` : '',
    e.retries ? `round ${e.retries}` : '', e.meta ? '' : (e.metaGaveUp ? 'meta gave up' : 'no meta')].filter(Boolean).join(', ');
}
export function _jogPlantCrossed(contacts, prev, cur, fc, backward, gapMs, cycMs) {
  if (prev === cur) return false;
  if (prev == null || !(fc > 0) || !(gapMs >= 0 && gapMs < cycMs)) return contacts.indexOf(cur) !== -1;
  const d = backward ? ((prev - cur) % fc + fc) % fc : ((cur - prev) % fc + fc) % fc;
  const step = backward ? -1 : 1;
  let f = prev;
  for (let k = 0; k < d; k++) {
    f = ((f + step) % fc + fc) % fc;
    if (contacts.indexOf(f) !== -1) return true;
  }
  return false;
}
/* South is the fallback because it is the pair the old constants encoded, so
   an unknown facing lands exactly where it used to rather than somewhere new. */
export function bodyRows(pose, dir) {
  const m = BODY_ROWS[pose] || BODY_ROWS.stand;
  return m[dir] || m.south;
}
export function bodyDirScale(pose, dir) {
  if (pose === 'hit') return dir === 'east' ? 0.88 : 1.0;
  const m = BODY_DIR_SCALE[pose];
  return (m && m[dir]) || 1.0;
}
/* v2.3.1354: IDLE (stand pose, every facing — a hat that reads small
   idling east reads small on every idle facing; per-dir splits would
   make the hat pop while turning) corrections from the same review:
   bucket-hat and fedora +10% and 2px down. */
export function hatPoseTune(hatId, pose, dir) {
  if (pose === 'jog' && dir === 'east') return JOG_EW_HAT_TUNE[hatId] || null;
  if (pose === 'stand') return STAND_HAT_TUNE[hatId] || null;
  return null;
}
export function _fullsetCrown(dir, phase) {
  const t = FULLSET_CROWN[dir];
  if (!t || phase == null) return null;
  const p = ((phase % 1) + 1) % 1;
  return t[Math.min(t.length - 1, Math.floor(p * t.length))];
}
/* v2.3.1459: the v2.3.1216 _FISH_CHEST_DEJITTER table is GONE.  It existed
   because the fish-south gear sheets were one stamp hand-placed with ~2.1x
   the body's sway; tools/rebake_fish_gear.py has since re-baked all three
   sheets (chest/shirt/legs) to warp the stamp onto the body's measured
   per-row motion — sway, lean AND vertical bob (relative wobble now
   <0.7px, was ~4.5).  A runtime X-only correction on top of the tracked
   sheets would re-introduce the very slide it used to cancel. */
/* v2.3.1361 (owner: "Try 1"): pre-composed FULL-SET armored figure.  A
   finished textured knight (helmet included, chain waist baked by the
   artist) ships per (pose,dir) at gear/fullset/steel/<pose>-<dir>.png and
   REPLACES the whole masked-body bake + chest/legs layering when the full
   steel set is worn — no erase, no chain paint, no seams for those dirs.
   A missing sheet (only jog-south ships so far) returns null and the
   classic path runs unchanged.  DISPLAY_DS guard: the sheet rides the 256
   gear pipeline while the body sprite's transform expects display-sized
   frames — identical only while DISPLAY_DS === 1.
   v2.3.1408: guard LIFTED — gearSheets now stores the fullset slot at
   display size (256/DISPLAY_DS, see its buildSheet fullset branch), so
   the figure is a drop-in body frame at any DS and the knight keeps the
   painted-figure path under the half-res memory mode. */
export function _fullsetFrame(chestItem, legsItem, pose, dir, frameIdx, phase) {
  if (pose !== 'jog') return null;
  /* v2.3.3846: north-east (and north-west, its mirror) ships no knight figure
     (gearSheets preloadFullsetFigures: south, south-west, north, east; and
     _fullsetCoversBake below), so it is never asked for.  Asked, the sheet
     404'd and its retries ran, and the final failure landed in the crash ring
     as `gear-sheet-failed fullset/steel/jog/northeast` (E's judge pass, a
     computer on the old path) -- the plates were drawn the classic way after
     it either way. */
  if (dir === 'northeast') return null;
  /* v2.3.1757: compare the ART, not the id, so a recoloured pair still gets the
     painted knight figure instead of silently dropping to the overlay path.
     The figure REPLACES the body sprite, so its colour is applied to that
     sprite by the callers (see _fullsetTint).
     ═══ v2.3.1761: ...AND ONLY WHEN BOTH PIECES ARE THE SAME METAL ═══
     Owner: "it didn't display consistently when I was wearing a combo of
     different armor pieces jogging in each direction.  Some directions it
     changed the armor to match the full copper set and other directions it
     correctly showed the iron greaves I was wearing."
     Exactly right, and this line was the cause.  The figure is ONE sheet
     carrying both pieces, so it can only be painted ONE colour — and it was
     taking the chest's.  A mixed pair therefore had its legs repainted to
     match the torso, but only on the jog directions that ship a figure (every
     one but northeast), which is why turning changed the answer.
     Two metals cannot be expressed by one figure, so a mixed pair falls back
     to the layered path, where each piece is tinted on its own sprite. */
  if (gearArt(chestItem) !== 'steelplate' || gearArt(legsItem) !== 'steelgreaves') return null;
  if (gearMaterial(chestItem) !== gearMaterial(legsItem)) return null;
  /* v2.3.1367: when the caller knows the jog cycle PHASE, the sheet plays
     its NATIVE frame count evenly on the same clock (east ships 25 frames
     vs the 28-frame body cycle — no held frames, no wrap jump).  Callers
     that only gate on presence (_placeGear) pass the body frameIdx. */
  /* v2.3.4999: the figure from the colour numbers (gearWalkFrame.js) */
  if (phase != null) return gearDrawFramePhased('fullset', 'steel', pose, dir, phase);
  return gearDrawFrame('fullset', 'steel', pose, dir, frameIdx);
}
/* v2.3.1399: TRUE when a masked-body bake for this (worn set, pose, dir)
   would be dead weight — the fullset knight figure replaces the masked
   composite at runtime for the full steel set on the jog dirs that ship a
   figure (all but northeast), so baking those frames only burns VRAM.
   Both prewarm passes skip on this.  Incident chain: the v2.3.1382 iPhone
   startup OOM was "fixed" by deferring the fullset warm; v2.3.1398 put the
   warm back on the loading gate (owner: assets must load at the login
   screen) and the ~39MB landed on top of ~64MB of these dead bakes —
   context-loss crash loop on iPhone (2026-07-20).  Skipping the dead bakes
   pays for the gated warm with ~25MB to spare.  If a figure ever fails all
   gate retries, the runtime falls back to a lazy on-demand masked bake —
   rare hitch, correct image. */
/* v2.3.1757: the material a fullset figure is worn in.  The figure is armour
   art assigned onto the BODY sprite, so unlike every other gear layer its
   colour has to travel with the body — and be cleared the instant the body
   goes back to being a body, or an unarmoured player jogs around copper. */
export function _fullsetTint(chestItem) {
  return gearTint(chestItem);
}
/* v2.3.1872: `legsFrom` lets ONE slot be drawn from a different (pose,frame)
 * than the rest.  The south block needs exactly that and nothing more general:
 * the chest and shirt hold the standing frame while the greaves animate with
 * the jog, or a bro in leg armour blocks with static plates over striding
 * legs.  Null on every other call site, so the normal path is byte-identical. */
/* v2.3.1938: the pair of drawings a display wears, or null when both sides are
   blank (the overwhelmingly common case, and the one that must cost nothing).
   Returned as {front, back} so _placeGear can pick per facing without knowing
   where the drawings came from -- the local player's own store, or a peer's
   off the wire. */
export function _shirtArtPair(front, back) {
  const f = artHasInk(front) ? front : null;
  const b = artHasInk(back) ? back : null;
  return (f || b) ? { front: f, back: b } : null;
}
export function _remoteBodyArtBuild(other, mirror) {
  const p = sanitizeShirtArt(other.pantsArt), t = sanitizeShirtArt(other.tattooArt);
  /* v2.3.1949: face and arm tattoos ride the same sanitiser -- a peer string
     that is not a well-formed 256-char drawing answers null and is dropped
     here, before it can reach a bake key or a canvas. */
  const ft = sanitizeShirtArt(other.faceTattooArt), at = sanitizeShirtArt(other.armTattooArt);
  /* v2.3.2043: and the back of their head, through the same sanitiser. Peers
     draw it via artForFacing exactly as the local player does, so a remote who
     turns away shows THEIR back canvas rather than a blank head. */
  const hb = sanitizeShirtArt(other.headBackTattooArt);
  /* v2.3.2148: and the back of their body, through the same sanitiser -- peers
     resolve it via artForFacing exactly as the local player does. */
  const bb = sanitizeShirtArt(other.bodyBackTattooArt);
  /* v2.3.2428: and the back of their trousers, through the same sanitiser --
     peers resolve it via artForFacing exactly as the local player does, so a
     remote who walks away shows THEIR back print rather than their front one
     wrapped round. */
  const pb = sanitizeShirtArt(other.pantsBackArt);
  const q = sanitizePattern(other.pantsPattern, 'pants');   /* v2.3.1941 */
  const f = sanitizePattern(other.shoesPattern, 'shoes');   /* v2.3.1944 */
  return (p || t || ft || at || hb || bb || pb || q || f)
    ? { pants: p || '', pantsBack: pb || '', tattoo: t || '', tattooFace: ft || '', tattooArm: at || '',
      tattooHeadBack: hb || '', tattooBack: bb || '',
      pantsPattern: q, shoesPattern: f, mirror: !!mirror }
    : null;
}
export function _capeTune(dir) {
  let t = null;
  try { t = window.__btCapeTune || null; } catch (e) { t = null; }
  const base = _CAPE_JOG_TILT[dir] || 0;
  /* ═══ v2.3.2153: THE DEFAULT BRANCH OWES A `dx` TOO ═══
     Owner, for the third time: "Cape still disappears on jog."

     v2.3.2126 added the jog slide and added it to ONE of these two returns.
     This is the branch every real session takes -- the other needs
     window.__btCapeTune, which only a QA bench sets -- and without `dx` the
     caller computes `undefined * scale * ±1`, which is NaN, and writes NaN
     into spr.x. A sprite at NaN never rasterises. So the cape vanished for
     every player on every jog, while the tuning sweep that was built to
     photograph this exact animation kept producing a perfect cape, because
     setting __btCapeTune is what put a number back in the object.

     That is also why three rounds of scene-graph assertions missed it: the
     sprite is visible, its texture is right, its scale matches the body and
     its rotation is applied. Only the position is poisoned. */
  if (!t) {
    return { tilt: base, pivotY: _CAPE_PIVOT_Y, dx: (_CAPE_JOG_DX[dir] || 0),
      hoodTiltK: _CAPE_HOOD_TILT_K, hoodDxK: _CAPE_HOOD_DX_K };
  }
  /* A tilt of 0 is meaningful (north/south face the camera, where a sideways
     lean would be a lie), so scale rather than replace: one knob moves the
     whole table and cannot accidentally give north a tilt it must not have. */
  const k = (typeof t.tiltScale === 'number') ? t.tiltScale : 1;
  return {
    tilt: base * k,
    pivotY: (typeof t.pivotY === 'number') ? t.pivotY : _CAPE_PIVOT_Y,
    /* v2.3.2126: absolute, not scaled -- the table has a ZERO for north and
       south (they face the camera; a sideways slide there would be the same
       lie a sideways tilt would), and scaling cannot move a zero.  A sweep
       needs to be able to ask "what does -20 look like on east". */
    dx: (typeof t.jogDx === 'number') ? t.jogDx : (_CAPE_JOG_DX[dir] || 0),
    /* v2.3.2189: the same shape -- absolute, because 0 is the shipped value
       and scaling cannot move a zero.  This is the whole point of the bench:
       asking "what does a quarter of the panel tilt look like on the hood". */
    hoodTiltK: (typeof t.hoodTiltK === 'number') ? t.hoodTiltK : _CAPE_HOOD_TILT_K,
    hoodDxK: (typeof t.hoodDxK === 'number') ? t.hoodDxK : _CAPE_HOOD_DX_K,
  };
}
/* v2.3.3716: an armour slot worn with nothing in it (the look-palette body
   is drawn only where no armour masks it) */
export const _bareOf = (it) => !it || it === 'none';
export const _localWornSig = () => wornSigOf(getEquip('chest'), getEquip('legs'));
/* v2.3.2904: the same Texture around a crop made elsewhere (the worker's
   cropFrame): one cell at 0,0, so frame = the whole canvas, trim = where it
   sat, orig = the whole display frame. */
export function _croppedTexture(cv, c) {
  const src = Texture.from(cv).source;   /* cached: __btTex counts it, eviction removes it (see _storeBake) */
  return new Texture({ source: src, frame: new Rectangle(0, 0, c.w, c.h),
    orig: new Rectangle(0, 0, c.fw, c.fh), trim: new Rectangle(c.tx, c.ty, c.w, c.h) });
}
/* v2.3.5000: the sheets of numbers a job's pieces name, to the worker before
   the job (once a worker: lookSheetForWorker); false if one could not go */
export function _sendGearSheets(wk, inps) {
  for (const x of inps) {
    if (!x || !x.look) continue;
    const sm = lookSheetForWorker(x.look, wk);
    if (!sm) continue;
    try { wk.postMessage(sm, sm.bytes ? [sm.bytes.buffer] : []); } catch (e) { return false; }   /* v2.3.5015: a file to fetch carries no bytes */
  }
  return true;
}
/* No worker (old Safari, a worker error) -- or QA's window.__btLookBakeInline,
   since a worker's canvas on the QA box's software chip is ~200x slower than
   the page's (mp-lookarmour runs the full oracle this way and samples the
   worker): the same bake (lookBake.js) here, as the old path's no-worker
   bake is (_maskedBodyFrame). */
export const _lookInlineAddr = (() => { try { return /(^|[?&])lookinline(=1)?(&|$)/.test(pageAddress()); } catch (e) { return false; } })();   /* QA: BT_QA_QUERY=lookinline */
export const _lookInline = () => typeof window !== 'undefined' && (window.__btLookBakeInline === true || (_lookInlineAddr && window.__btLookBakeInline !== false));
/* The body's frame under armour for a figure the look palette draws: the
   masked look frame once decided; while it is not, `pending` (the caller
   draws as the old path does for a frame not baked yet); null when it
   cannot be drawn so (the caller's old path). */
export function _lookArmourBody(entries, worn, poseInfo, rank) {
  if (!entries) return null;
  const why = {};
  const r = lookArmourFrame(entries, worn, poseInfo, rank, why);
  if (r) return r;
  return why.fallback ? null : { pending: true };
}
/* the local player's look as row entries, where the look palette draws it
   (getLookBodyEntries), for the armour's prewarm and the render path */
export function _localLookEntries(pose, dir, art) {
  if (!lookArmourOn()) return null;
  return getLookBodyEntries(getSkin(), getPants(), getShoes(), pose, dir, null, getEyeColor(), art, getEyeStyle());
}
export function _maskedKey(bodyTex, worn, dilate) {
  return (bodyTex.uid != null ? bodyTex.uid : '') + '|' + worn.map(w => w.k).join(',') + '|' + dilate;
}
/* v2.3.4878: the prewarm's signature for an armoured peer, remembered on their
   display with the eight things it is made from, and made again only when one
   of them changes.  The string is exactly the one the render path built every
   frame before ([...].join('|')), so the prewarms see no difference.  All
   eight are wire scalars (peerCosmetics.js; equip's are item ids) or a flag,
   so `===` says what the join said. */
export function _peerArmourSig(display, other, hasArt) {
  const e = other.equip, ch = e && e.chest, lg = e && e.legs;
  const c = display._peerSigIn;
  if (c && c.skin === other.skin && c.pants === other.pants && c.shoes === other.shoes
    && c.eyeColor === other.eyeColor && c.eyeStyle === other.eyeStyle && c.art === hasArt
    && c.ch === ch && c.lg === lg) return c.sig;
  const sig = [other.skin, other.pants, other.shoes, other.eyeColor, other.eyeStyle, hasArt ? 'art' : '', ch, lg].join('|');
  display._peerSigIn = { skin: other.skin, pants: other.pants, shoes: other.shoes, eyeColor: other.eyeColor, eyeStyle: other.eyeStyle, art: hasArt, ch, lg, sig };
  return sig;
}
export function _hideBodyRegions(display) {
  for (const k of ['_bodyHead', '_bodyTorso', '_bodyLegs']) if (display[k]) display[k].visible = false;
}
/* v2.3.3623: the worn chest from a worn list ({k: 'chest:<id>', tex}) as
   {tex, tint} -- its frame and its metal -- or null: the overlay keeps the grip
   off the plate and draws what it leaves bare as a gauntlet in its metal (THE
   PLATE DRAWS ITS OWN HANDS) */
export function _chestFrameOf(worn) {
  if (!worn) return null;
  let plate = null, legs = null;
  for (let i = 0; i < worn.length; i++) {
    const w = worn[i];
    if (!w.k || !w.tex) continue;
    if (w.k.indexOf('chest:') === 0) plate = { tex: w.tex, tint: gearTint(w.k.slice(6)) };
    else if (w.k.indexOf('legs:') === 0) legs = w.tex;
  }
  /* ...and the greaves' frame: the gauntlet keeps off them but at the rod */
  if (plate) plate.legs = legs;
  /* v2.3.3657: greaves alone too -- the grip keeps the trousers off them
     (see THE GRIP LIFTS THE HAND, NOT THE TROUSERS) */
  else if (legs) plate = { tex: null, tint: 0xffffff, legs };
  return plate;
}
/* v2.3.4452: and a TIME LIMIT (TRAPS §257): a request that never answered
   was never retried (only a rejection was), and held the loading screen to
   its cap (state-machine sweep VC-1, R1-9).  Past TRAIT_LOAD_TIMEOUT_MS it
   counts as failed, into the same rounds; a late answer is kept if the facing
   is still bare, and let go if a later round got there first.  Off with the
   rounds (`?traitretry=0`, `?retrylooks=0`). */
export function _takeHairMask(e, dir, t, url) {
  if (!t) return;
  if (e.tex[dir] && e.tex[dir] !== t) { Assets.unload(url).catch(() => { /* gone */ }); return; }
  e.tex[dir] = t;
  if (t.source) t.source.scaleMode = 'linear';
}
export function _orderHairOverHat(display, hatId) {
  const hair = display && display._hairSprite;
  const hat = display && display._headwearSprite;
  if (!hair || !hat || !hair.parent || hair.parent !== hat.parent) return;
  const parent = hair.parent;
  const want = headwearUnderHair(hatId);
  const hairIdx = parent.getChildIndex(hair);
  const hatIdx = parent.getChildIndex(hat);
  const hairIsOver = hairIdx > hatIdx;
  if (want === hairIsOver) return;
  try { parent.setChildIndex(hair, want ? hatIdx : Math.max(0, hatIdx - 1)); } catch (e) { /* order is cosmetic */ }
}
/* v2.3.2923: a trait entry wearing its recoloured textures when there are
   any -- the base meta (a retint moves no pixel) and the native art as the
   fallback while the bake is in flight, exactly as _placeEyewear builds it. */
export function _colouredEntry(base, colored) {
  return (colored && base) ? { tex: colored, meta: base.meta, fallbackTex: base.tex } : base;
}
/* v2.3.354: per-frame beard z-order.  The beard is on the face, so it
   needs a direction-dependent layer just like the weapon + shield:
   - Rear facings (NW 5 / N 6 / NE 7): the beard sits BEHIND the head --
     only the fuzz that extends past the head silhouette peeks out.  The
     old rule put it 'just above the body', which stamped the beard sliver
     ON the back of the head (user report, v2.3.679).
   - Every other facing: the beard hangs over the chin and down the chest,
     so it renders ABOVE the body AND above the worn gear (chest plate /
     pauldrons) -- the old 'bodyIdx + 1' target predated the gear layers
     and left the beard hidden behind the armour on S/SW/SE.  On E / W it
     additionally goes above the hand-cap body-clones (the hand swing
     crosses the face and the clones would erase it).  The weapon stays
     above the beard on the toward-camera facings via the block below.
   Shared by local + remote (remote displays simply lack the hand/shield
   sprites, so those are skipped). */
export function _orderTraitsAndWeapon(display, facingIdx, hatId) {
  /* --- Pickup head overlay above the worn plate (v2.3.1055) ---
     _placePickupHead put the head-only sheet on _bodyHead; lift it above the
     body + worn gear so the raised arm/pauldron plate can't cover it. Same
     setChildIndex-to-highest-visible-ref move the beard uses just below. */
  const phead = display._bodyHead;
  if (phead && phead.visible) {
    /* v2.3.1116: guarded -- getChildIndex throws if a referenced sprite isn't a
       child of `display` (a transient layout state), and this runs every frame
       during the loot freeze, so an unguarded throw freezes the whole game. */
    try {
      /* v2.3.1553 (owner: "can you actually put the head behind the armor
         shoulder for jog east?  The shoulder should be the layer in front if
         you think about the perspective").  Correct: east/west is a PROFILE,
         so the near pauldron and the collar are between the camera and the
         neck.  Drawing the head over them put bare skin on top of steel that
         is physically in front of it, which is what read as the head sitting
         on the armour rather than in it.
         The lift exists because the fullset used to carry a HELMET that would
         swallow the face; the helmet has been cut off since v2.3.1368, so on
         this facing there is nothing above the collar to hide behind and the
         face stays fully visible with the head underneath -- only the jaw and
         neck are occluded, which is the point.  Set per frame beside the head
         placement; every other facing keeps the lift. */
      if (display._headBehindGear && display._spriteBody
          && display._spriteBody.parent === display && phead.parent === display) {
        const bi = display.getChildIndex(display._spriteBody);
        if (display.getChildIndex(phead) > bi) display.setChildIndex(phead, bi);
      } else {
        let ref = -1;
        /* ═══ v2.3.2278: _gearShirt WAS MISSING FROM THIS LIST ═══
           Owner (v2.3.1914): "When fishing that hand needs to be over the
           shirt during the reel animation instead of under it."  That fix has
           been a NO-OP ever since, for the commonest character there is.
           The list is what the head/hand overlay is lifted ABOVE.  With only
           a tee on, the sole visible member was _spriteBody (child index 3) --
           and _bodyHead is index 4, so `hi < ref` was 4 < 3, false, and no
           lift ever happened; _gearShirt is index 10 and drew straight over
           the reeling hand.  Leg armour reaches the same end by a different
           road (_gearLegs is index 9, above _bodyHead), which is the case the
           owner reported.  Adding the shirt fixes both and the default. */
        for (const s of [display._spriteBody, display._gearShirt, display._gearLegs, display._gearChest, display._gearShoulders]) {
          if (s && s.visible && s.parent === display) ref = Math.max(ref, display.getChildIndex(s));
        }
        if (ref >= 0 && phead.parent === display) { const hi = display.getChildIndex(phead); if (hi < ref) display.setChildIndex(phead, ref); }
      }
    } catch (e) { /* leave head where it is this frame */ }
  }
  const beard = display._facialHairSprite;
  /* --- Beard layer --- */
  if (display._spriteBody && beard && beard.visible) {
    /* Rear = away-from-camera: NW(5) / N(6) / NE(7).  SW(3) shows the
       face, so it belongs with the toward-camera facings (beard above
       body + gear like S/SE) -- it was briefly swept into the rear set
       and the beard vanished on southwest (user report, v2.3.698).
       NE history: v2.3.679 had NE rear -> beard invisible on the OLD
       NE art (user report, v2.3.689) -> moved to the toward set.  On
       the regenerated NE sheets (v2.3.708+) that draws the beard OVER
       the back of the head, and only on NE -- NW, its mirror twin, was
       rear -- so the beard "showed on one side only".  Owner call
       (2026-07-19): both diagonals layer the beard BEHIND the head. */
    const rearFacing = (facingIdx === 5 || facingIdx === 6 || facingIdx === 7);
    if (rearFacing) {
      /* Behind the head: insert just BELOW the body sprite. */
      const bodyIdx = display.getChildIndex(display._spriteBody);
      const fhIdx = display.getChildIndex(beard);
      if (fhIdx > bodyIdx) display.setChildIndex(beard, bodyIdx);
    } else {
      /* Above body + gear (+ hand clones / shield where they cross the
         face).  setChildIndex removes-then-inserts, so inserting at the
         highest reference index lands the beard directly above it. */
      let ref = display.getChildIndex(display._spriteBody);
      /* v2.3.1099: include the SHIRT (_gearShirt) -- the beard hangs over the
         chest, so on toward-camera facings it must sit above the t-shirt too,
         not just the armour. Without it, a shirt worn with no armour rendered
         OVER the beard (beard "behind the t-shirt" on south). */
      for (const s of [display._gearShirt, display._gearLegs, display._gearChest, display._gearShoulders,
                       display._bodyHead,   /* v2.3.1055: pickup head overlay */
                       display._handCapSprite, display._handArmSprite,
                       display._shieldSprite]) {
        if (s && s.visible) ref = Math.max(ref, display.getChildIndex(s));
      }
      /* v2.3.1934: ...and above the HAT, for the pieces that declare it
         (headwearBehindBeard).  Headwear is normally above facial hair so a
         brim or a cheek guard can overlap the face; a keffiyeh's side drape is
         the exception the owner hit -- it was covering the beard on southwest.
         Joining this list rather than getting its own pass means the beard
         still lands above the gear it already had to clear. */
      if (headwearBehindBeard(hatId)) {
        const hw = display._headwearSprite;
        if (hw && hw.visible && hw.parent === display) ref = Math.max(ref, display.getChildIndex(hw));
      }
      const fhIdx = display.getChildIndex(beard);
      if (fhIdx < ref) display.setChildIndex(beard, ref);
    }
  }
  /* --- Weapon in front of ALL body traits on the toward-camera facings
     (E=0 / SE=1 / S=2 / NE=7).  The weapon swings across the upper body
     there, so headwear + facial hair + hair (and any future body trait)
     render BEHIND it.  Lift the weapon just above the highest trait. */
  if (facingIdx === 0 || facingIdx === 1 || facingIdx === 2 || facingIdx === 7) {
    const wc = display._weaponContainer;
    if (wc && wc.visible) {
      let ref = -1;
      for (const s of [display._headwearSprite, display._facialHairSprite, display._eyewearSprite, display._eyeStyleSprite, display._speciesSprite, display._hairSprite, display._shirtSprite]) {   /* v2.3.2361: + eyewear; v2.3.2643: + the eye style; v2.3.2682: + the species */
        if (s && s.visible) ref = Math.max(ref, display.getChildIndex(s));
      }
      if (ref >= 0) {
        const wcIdx = display.getChildIndex(wc);
        if (wcIdx < ref) display.setChildIndex(wc, ref);
      }
    }
  }
}
/**
 * NFT 360° render — applies the front/back cross-fade + horizontal
 * compression + shear lean to the display's _nftFront/_nftBack
 * sprites.  Mirrors the Canvas 2D drawNft360 path (BroTown.jsx
 * ~3594-3661).  Called when the regular sprite-sheet body isn't
 * being shown and the player has an NFT avatar URL whose textures
 * have loaded.
 *
 * Pixi has no native 2D matrix shear on Sprite, but skewing the
 * sprite is equivalent: tan(skewX) gives the c-coefficient we want,
 * and scale.y compensates so sprite height stays at 1×.
 */
export function applyNftTransform(display, frontTex, backTex, facingAngle, size, bobY) {
  const front = display._nftFront;
  const back = display._nftBack;
  if (front.texture !== frontTex) front.texture = frontTex;
  if (back.texture !== backTex)   back.texture = backTex;

  /* turnFromCam: 0=facing camera, π=facing away (mirror of Canvas 2D). */
  const rawTurn = facingAngle - Math.PI / 2;
  const turnFromCam = Math.abs(((rawTurn % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
  const isFacingRight = Math.cos(facingAngle) > 0;
  const sinTurn = Math.sin(turnFromCam);

  /* Horizontal compression: 0.5 at pure side, 1.0 at front/back. */
  const sx = 0.5 + 0.5 * Math.abs(Math.cos(turnFromCam));
  /* Shear: 0 at front/back, peaks at sin(π/2)*0.25 = 0.25 at pure side. */
  const kx = sinTurn * 0.25 * (isFacingRight ? -1 : 1);
  /* Cross-fade band 70°-110° (matches Canvas 2D). */
  const fadeStart = 1.22, fadeEnd = 1.92;
  let frontAlpha, backAlpha;
  if (turnFromCam < fadeStart) { frontAlpha = 1; backAlpha = 0; }
  else if (turnFromCam > fadeEnd) { frontAlpha = 0; backAlpha = 1; }
  else {
    const t = (turnFromCam - fadeStart) / (fadeEnd - fadeStart);
    frontAlpha = 1 - t;
    backAlpha = t;
  }

  /* Pixi skew → matrix c = scale.y*sin(skewX), d = scale.y*cos(skewX).
     Want c = kx, d = 1 → skewX = atan(kx), scale.y = 1/cos(skewX). */
  const skewX = Math.atan(kx);
  const scaleY = 1 / Math.cos(skewX);
  /* Position both sprites at same place: bottom-anchored at y=10
     below display origin (matches Canvas 2D's nftY = py - 18). */
  const FOOT_Y = 10;
  for (const s of [front, back]) {
    s.x = 0;
    s.y = FOOT_Y + bobY;
    s.width = size;       // Pixi auto-respects scale; resetting here
    s.height = size;      // re-bases width/height to source size.
    s.scale.x = (isFacingRight ? -1 : 1) * sx;
    s.scale.y = scaleY;
    s.skew.x = skewX;
    s.skew.y = 0;
  }
  front.alpha = frontAlpha;
  back.alpha = backAlpha;
  front.visible = frontAlpha > 0.01;
  back.visible = backAlpha > 0.01;
}
export function hideNft(display) {
  if (display._nftFront) display._nftFront.visible = false;
  if (display._nftBack)  display._nftBack.visible = false;
}
/* v2.3.3392: the x a figure stands at -- its x, or, while it emotes, the x
   its feet are planted at (a tilt about the feet moves its origin) */
export function figureFeetX(display) {
  /* v2.3.3499: and while a jump leans it (rendering/jumpFx.js), the same */
  if (display._jumpXw != null && display.x === display._jumpXw) return display.x - (display._jumpXFix || 0);
  return display._emoteXw != null && display.x === display._emoteXw ? display.x - (display._emoteXFix || 0) : display.x;
}
