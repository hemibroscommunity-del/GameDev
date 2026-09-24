/* ═══ v2.3.2874: THE MASKED-BODY BAKE, AS A PURE PIXEL FUNCTION ═══
 *
 * Owner: "whenever I put on a piece of armor like legs or torso the game
 * would noticeably stutter".  v2.3.2871-2873 made the bake cheaper and baked
 * owned pieces ahead of time; what is left is WHERE it runs -- on the main
 * thread, in the frames right after an equip.  This is the bake moved out of
 * entityRenderer, verbatim apart from its inputs, so the same code can run in
 * a worker (maskedBakeWorker.js) on another core:
 *
 *   mk(w, h)          -> a canvas (document canvas here, OffscreenCanvas there)
 *   body(ctx,x,y,w,h) -> draws the body frame (was drawGearFrame(ctx, bodyTex, ...))
 *   worn[i].draw      -> the same for each worn gear frame (null = not loaded)
 *   belt(dir, f)      -> a draw function for the chain belt, or null while its
 *                        sheet loads (the bake then reports beltPending)
 *   fishRod           -> { has(), at(f, u, v) } -- toolRecolor's rod mask
 *
 * Returns { cv, beltPending } -- the 256x256 composite, before the display
 * downscale and crop, which stay with the caller -- or null when the body
 * frame had no pixels yet (spawn) or the bake failed: draw the raw body.
 * Byte-identity with the inline version is pinned by tools/qa/qa-bake-ident.mjs. */
import { jogWaistRow } from './jogWaist.js';

function _histMedian(h, n) {
  const want = n >> 1;
  let cum = 0;
  for (let v = 0; v < 256; v++) { cum += h[v]; if (cum > want) return v; }
  return 255;
}
const _medR = new Uint32Array(256), _medG = new Uint32Array(256), _medB = new Uint32Array(256);
const _fillStack = new Int32Array(256 * 256 + 1024);

export function bakeMaskedCanvas(inp) {
  const { mk, body, worn, dilate, poseInfo, belt, fishRod } = inp;
  let _beltPending = false;  /* v2.3.1347: belt sheet not loaded yet -> skip caching */
  let cv;
  try {
    cv = mk(256, 256);
    const ctx = cv.getContext('2d', { willReadFrequently: true });   /* v2.3.2871: read back 3x per bake */
    /* ═══ v2.3.2325: THE ARMOURED FIGURE WAS RESAMPLED TWICE FOR NOTHING ═══
       Owner: the character "looks soft like the textures are low resolution".
       This bake works at 256 but is FED DISPLAY textures.  At DISPLAY_DS=2 the
       body frame is 128px (playerSkins slices FRAME/DS) and every jog / stand /
       hit / fish / mine gear sheet is 128px too since v2.3.1434 -- so every
       drawImage below is an exact 2x pixel-double.  Canvas smoothing defaults
       ON, so those doubles were BILINEAR: each texel came out a blend of itself
       and its neighbour, and the tail of this function then resampled the whole
       composite back down to 128.  Exact texels in, two resamples, mush out.
       It is the SAME double-resample v2.3.1412 took off the body sheets and
       v2.3.1434 took off the gear sheets -- left standing in the one place
       BETWEEN them, which is why the armoured figure alone still looked soft
       after both of those landed.  Nearest here plus the exact-texel inverse at
       the tail make the round trip lossless.
       BOTH ENDS MOVE TOGETHER or not at all: nearest up with the old smooth
       downscale still blurs, and smooth up with a nearest downscale samples
       that blend and smears WORSE than today.
       Bonus: the skin/pants/shoes hue scoring and the alpha>40 figure tests
       further down now read the artist's real colours instead of the in-between
       shades bilinear invents -- the exact hazard spriteScale's file header
       warns about for the recolour pipeline. */
    ctx.imageSmoothingEnabled = false;
    body(ctx, 0, 0, 256, 256);   /* v2.3.2791: the body frame may be cropped */
    /* head+neck must always stay visible -- the chest plate has a neckline
       opening the body's neck fills.  Find the body figure's neck line (top +
       BODY_NECK_FRAC*height) BEFORE punching so we can restore that band after;
       otherwise the dilated collar mask closes the narrow neck gap and the head
       floats detached above the plate (v2.3.617). */
    let neckY = 0, figTop = 256, figBot = -1, origBody = null;
    try {
      origBody = ctx.getImageData(0, 0, 256, 256).data;   // body BEFORE the erase (for pant-restore)
      const id = origBody;
      for (let y = 0; y < 256; y++) {
        for (let x = 0; x < 256; x++) {
          if (id[(y * 256 + x) * 4 + 3] > 40) { if (y < figTop) figTop = y; figBot = y; break; }
        }
      }
      /* 0.33 == preview_armor_frames.NECK_RESTORE_FRAC (keep in sync) */
      if (figBot > figTop) neckY = Math.round(figTop + 0.33 * (figBot - figTop));
    } catch (e) { neckY = 0; }
    /* v2.3.678: the bake can run on a frame whose backing pixels aren't ready
       yet (spawn) -- drawing produces an empty figure.  Caching that would
       freeze an invisible/garbled body (headless armoured player on join), so
       render the raw body this frame and retry the bake on a later frame. */
    if (figBot <= figTop) return null;
    /* v2.3.689: separable box dilation.  Erasing the body under every (dx,dy)
       offset of the gear is a square-box dilation of the gear silhouette --
       the union of translates over a (2d+1)^2 grid equals horizontal translates
       gathered once, then vertical translates of THAT (max-filter separability).
       Same erased pixel set, 2*(2d+1) draws instead of (2d+1)^2 per piece
       (26 vs 169 at dilate 6). */
    const dilCv = mk(256, 256);
    const dilCtx = dilCv.getContext('2d');
    /* v2.3.2325: same exact 2x pixel-double as the body above.  A bilinear gear
       edge here smeared the erase mask about half a display texel wider than the
       art, so the destination-out below partly erased body pixels the plate does
       not actually cover.  The dilation itself is unchanged: sampling only even
       positions at the tail, the union over dx in [-6..6] is still exactly a
       3-display-texel dilation, odd offsets included. */
    dilCtx.imageSmoothingEnabled = false;
    for (const w of worn) {
      if (!w.draw) continue;
      /* v2.3.2750: drawGearFrame places a cropped frame at its own offset. */
      for (let dx = -dilate; dx <= dilate; dx++)
        w.draw(dilCtx, dx, 0, 256, 256);
    }
    ctx.globalCompositeOperation = 'destination-out';   // erase body under the armour
    /* v2.3.1073: only dilate the erase DOWNWARD when a leg plate is also worn to
       fill the over-erased band.  With chest-only (no leg plate), the downward
       dilation ate the bare waist/upper-leg just below the chest plate -- a
       transparent GAP between torso and legs, most visible while jogging (the
       jog torso/leg junction shifts).  Cap dy<=0 there so the bare body fills the
       waist; the leg-plate case keeps full dilation (the plate hides the band). */
    const _hasLegPlate = worn.some(w => w.k && w.k.indexOf('legs:') === 0);
    const _dyMax = _hasLegPlate ? dilate : 0;
    for (let dy = -dilate; dy <= _dyMax; dy++)
      ctx.drawImage(dilCv, 0, dy);
    ctx.globalCompositeOperation = 'source-over';
    if (neckY > 0) {                                     // restore the head+neck band
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, 256, neckY); ctx.clip();
      body(ctx, 0, 0, 256, 256);   /* v2.3.2791: cropped-frame aware */
      ctx.restore();
    }
    /* v2.3.1123: the fishing rod is baked into the fish-pose body sprite, so the
       gear erase above chops the part of the pole that crosses the (dilated) plate
       silhouette -- the pole looked cut near the character when armour was worn.
       Restore the rod from the pre-erase body: its pink/magenta pixels (high R,
       low G, B > G) appear ONLY on the fish rod, so this is a no-op for every
       other pose/body.  The rod is drawn back into the body texture; the small
       segment directly behind the plate is still occluded by the gear on top
       (natural), but the halo-cut section beyond the plate reappears. */
    if (origBody) {
      try {
        /* v2.3.2761: the rod is PINE now (toolRecolor.js -- the owner asked
           for the magenta key to become a real material), so it can no longer
           be found by colour: its shape was recorded from the key as the
           sheet loaded, and this asks that.  The magenta test stays as the
           fallback for a sheet that loaded before the mask existed. */
        const _rodF = (poseInfo && poseInfo.pose === 'fish' && (fishRod && fishRod.has())) ? (poseInfo.frameIdx | 0) : null;
        const isRod = (o) => {
          const r = origBody[o], g = origBody[o + 1], b = origBody[o + 2], a = origBody[o + 3];
          if (_rodF != null) {
            const p = o >> 2;
            return a > 60 && fishRod.at(_rodF, (p % 256) / 256, Math.floor(p / 256) / 256) === true;
          }
          return a > 60 && r > 140 && g < 115 && b > 60 && b < 195 && (r - g) > 60 && b > g + 22;
        };
        const rimg = ctx.getImageData(0, 0, 256, 256);
        const rd = rimg.data;
        let restored = false;
        const put = (o) => { rd[o] = origBody[o]; rd[o + 1] = origBody[o + 1]; rd[o + 2] = origBody[o + 2]; rd[o + 3] = origBody[o + 3]; restored = true; };
        for (let y = 0; y < 256; y++) {
          for (let x = 0; x < 256; x++) {
            const o = (y * 256 + x) * 4;
            if (!isRod(o)) continue;
            put(o);
            /* also restore the rod's dark outline (adjacent opaque non-rod px)
               so the pole keeps its edge where the erase cut it */
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || nx > 255 || ny < 0 || ny > 255) continue;
                const no = (ny * 256 + nx) * 4;
                if (origBody[no + 3] > 60 && !isRod(no)
                    && origBody[no] < 90 && origBody[no + 1] < 90 && origBody[no + 2] < 110) put(no);
              }
            }
          }
        }
        if (restored) ctx.putImageData(rimg, 0, 0);
      } catch (e) { /* best-effort: rod stays cut, body otherwise intact */ }
    }
    /* Blend the ghost hand: ChatGPT's armour drift leaves the body's bare fist
       poking out below the waist past the gauntlet.  Where the fist sits OVER the
       leg, recolour it to the player's PANTS shade (no transparent hole); where
       it pokes BEYOND the leg outline, erase it.  The pants/skin/shoe colours are
       SAMPLED from this body (skin from the head, pants from the upper leg, shoes
       from the foot band) so the patch matches whatever skin/pants the player
       picked -- and works for remote players' palettes too.  The fist is found by
       hue-alignment to the sampled skin (score = (p.ref)^2/|ref|^2), not a fixed
       skin colour.  Mirrors preview_armor_frames._blend_ghost_hand -- keep in
       sync.  v2.3.620.
       v2.3.686: FULL SET ONLY.  The blend assumes any below-waist skin is the
       ghost fist -- with chest-only wear the bare belly/hands are legit skin,
       and the blend painted flat pants-colour smears across the belly, ate the
       pants' top edge, and chewed the idle outlines near the hanging hands. */
    /* v2.3.1347: refs hoisted for the waist chain paint (see the confinement
       block) — the sampled skin/pants/shoes colours classify which waist
       pixels are the exposed green/pants band the chain replaces. */
    let _bakeRefs = null;
    /* v2.3.1360 (owner: chest-only jog "messed up"): refs are computed
       whenever the CHEST is worn — the chain waist paint needs them on
       partial wear too (chest-only lost its waist cover when v2.3.1345
       stripped the baked belt).  The v2.3.650 pants-restore and the
       ghost-hand blend stay FULL-SET only (v2.3.686), gated below. */
    const _wornChestRefs = worn.some(w => w.k && w.k.indexOf('chest:') === 0);
    const _wornLegsRefs = worn.some(w => w.k && w.k.indexOf('legs:') === 0);
    if (figBot > figTop && _wornChestRefs) {
      try {
        const fh = figBot - figTop;
        const waistY = Math.round(figTop + 0.45 * fh);   // a bit above mid-figure so the waist/hip skin (chain-belt zone) is caught too
        const img = ctx.getImageData(0, 0, 256, 256);
        const d = img.data;
        /* v2.3.1349b: sample from the PRE-ERASE body (origBody), not the
           erased canvas.  With a full set worn the dilated erase wipes the
           whole waist + shoe band on the frontal dirs, so sampling `d` found
           nothing, pantsRef/shoesRef came back null, and BOTH the v2.3.650
           pants-restore and the v2.3.1347 chain waist paint silently never
           ran for south/north/most southwest frames — the safety net's flat
           fill covered the gap and read as "black superhero underwear"
           (owner).  East/northeast only worked because their profile erase
           leaves leftovers to sample.  origBody is what the restores colour-
           match against, so it is also the CORRECT sample source. */
        const spx = origBody || d;
        const medRGB = (y0, y1) => {            // per-channel median of opaque pixels in [y0,y1)
          /* v2.3.2871: histogram median -- same value as sorting, one pass */
          _medR.fill(0); _medG.fill(0); _medB.fill(0);
          let n = 0;
          for (let y = Math.max(0, y0); y < Math.min(256, y1); y++)
            for (let x = 0; x < 256; x++) { const o = (y * 256 + x) * 4; if (spx[o + 3] > 40) { _medR[spx[o]]++; _medG[spx[o + 1]]++; _medB[spx[o + 2]]++; n++; } }
          if (!n) return null;
          return [_histMedian(_medR, n), _histMedian(_medG, n), _histMedian(_medB, n)];
        };
        const shoeTop = figBot - Math.round(0.18 * fh);
        const skinRef = medRGB(figTop, neckY);
        const shoesRef = medRGB(shoeTop, figBot + 1);
        // Pants colour: median of the upper-leg band EXCLUDING skin-toned pixels
        // -- the bare hip/fist can sit inside this band and would otherwise drag
        // the sample toward skin, making pants ~ skin so the fist test fails to
        // separate them (e.g. a big pale fist over blue pants).  Exclude by hue-
        // alignment to the sampled skin.
        let pantsRef = null;
        if (skinRef) {
          const sn = Math.sqrt(skinRef[0] * skinRef[0] + skinRef[1] * skinRef[1] + skinRef[2] * skinRef[2]) || 1;
          const y1 = waistY + Math.round(0.40 * fh);
          _medR.fill(0); _medG.fill(0); _medB.fill(0);   /* v2.3.2871: histogram median */
          let pn0 = 0;
          for (let y = waistY; y < Math.min(256, y1); y++)
            for (let x = 0; x < 256; x++) {
              const o = (y * 256 + x) * 4; if (spx[o + 3] <= 40) continue;
              const R = spx[o], G = spx[o + 1], B = spx[o + 2];
              const pn = Math.sqrt(R * R + G * G + B * B) || 1;
              const cos = (R * skinRef[0] + G * skinRef[1] + B * skinRef[2]) / (pn * sn);
              if (cos < 0.985) { _medR[R]++; _medG[G]++; _medB[B]++; pn0++; }
            }
          if (pn0) pantsRef = [_histMedian(_medR, pn0), _histMedian(_medG, pn0), _histMedian(_medB, pn0)];
          else pantsRef = medRGB(waistY, waistY + Math.round(0.40 * fh));
        }
        const score = (R, G, B, T) => { const n = T[0] * T[0] + T[1] * T[1] + T[2] * T[2] || 1; const dt = R * T[0] + G * T[1] + B * T[2]; return dt * dt / n; };
        _bakeRefs = { skinRef, pantsRef, shoesRef };
        if (_wornLegsRefs && skinRef && pantsRef && shoesRef) {
          let dirty = false;
          /* Restore pants the dilated cover-mask ATE: the chest gear's halo erodes
             the pants next to the gauntlets.  The erase only zeroed alpha (RGB
             intact in origBody), so re-open any erased pixel that reads as PANTS;
             skin/shoes stay erased so the armour still hides the torso/arms.
             Mirrors preview_armor_frames._blend_ghost_hand.  v2.3.650
             v2.3.1353: WAIST BAND ONLY.  The v2.3.1349b origBody refs revived
             this restore on the frontal/profile dirs — but un-gated it also
             re-opened the pants-scored OUTLINE ring the dilated erase eats
             around the ENTIRE armor (east's body art has an olive outline —
             owner: "an entire chain armor outline on the east body").  Its
             v2.3.650 purpose was always the waist next to the gauntlets, and
             the chain paint (same band) converts what it restores. */
          if (origBody) {
            let rLo = neckY, rHi = 256;
            if (poseInfo && poseInfo.pose === 'jog') {
              const wrr = jogWaistRow(poseInfo.dir, poseInfo.frameIdx || 0);
              rLo = Math.max(neckY, wrr - 50); rHi = Math.min(256, wrr + 42);
            } else {
              rLo = Math.max(neckY, Math.round(figTop + 0.33 * fh));
              rHi = Math.min(256, Math.round(figTop + 0.70 * fh));
            }
            for (let p = rLo * 256; p < rHi * 256; p++) {
              const o = p * 4;
              if (d[o + 3] > 40 || origBody[o + 3] <= 40) continue;
              const R = origBody[o], G = origBody[o + 1], B = origBody[o + 2];
              const sP = score(R, G, B, pantsRef);
              if (sP >= score(R, G, B, skinRef) && sP >= score(R, G, B, shoesRef)) {
                d[o] = R; d[o + 1] = G; d[o + 2] = B; d[o + 3] = origBody[o + 3]; dirty = true;
              }
            }
          }
          const fist = new Uint8Array(256 * 256), leg = new Uint8Array(256 * 256);
          let anyFist = false;
          for (let y = waistY; y < 256; y++) {
            for (let x = 0; x < 256; x++) {
              const o = (y * 256 + x) * 4; if (d[o + 3] <= 40) continue;
              const R = d[o], G = d[o + 1], B = d[o + 2];
              // strict argmax (not a fixed margin): the fist is skin when skin is the
              // MOST hue-aligned of the three refs.  A margin fails for bright/
              // desaturated skin (pale scores almost as high to the grey boots as to
              // skin).  Detect ONLY above the shoe band -- the hand swings at the
              // hip, never at the feet -- so grey boot pixels can't flip to skin and
              // get a pants ring.
              const sSkin = score(R, G, B, skinRef);
              if (y < shoeTop && sSkin > score(R, G, B, pantsRef) && sSkin > score(R, G, B, shoesRef)) { fist[y * 256 + x] = 1; anyFist = true; }
              else leg[y * 256 + x] = 1;
            }
          }
          if (anyFist) {
            // despeckle: drop fist blobs < 20px (stray edge/boot misclassifications),
            // 4-connectivity flood fill -- matches the preview's ndimage.label.
            const seen = new Uint8Array(256 * 256), st = [];
            for (let p0 = 0; p0 < 256 * 256; p0++) {
              if (!fist[p0] || seen[p0]) continue;
              const comp = []; st.length = 0; st.push(p0); seen[p0] = 1;
              while (st.length) {
                const p = st.pop(); comp.push(p);
                const x = p % 256, y = (p / 256) | 0;
                if (x > 0 && fist[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; st.push(p - 1); }
                if (x < 255 && fist[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; st.push(p + 1); }
                if (y > 0 && fist[p - 256] && !seen[p - 256]) { seen[p - 256] = 1; st.push(p - 256); }
                if (y < 255 && fist[p + 256] && !seen[p + 256]) { seen[p + 256] = 1; st.push(p + 256); }
              }
              if (comp.length < 20) for (let i = 0; i < comp.length; i++) { fist[comp[i]] = 0; leg[comp[i]] = 1; }
            }
            const sil = new Uint8Array(256 * 256);          // leg silhouette: per-row span of non-fist body, +2px
            for (let y = waistY; y < 256; y++) {
              let mn = 256, mx = -1;
              for (let x = 0; x < 256; x++) if (leg[y * 256 + x]) { if (x < mn) mn = x; mx = x; }
              if (mx >= 0) { const a = Math.max(0, mn - 2), b = Math.min(255, mx + 2); for (let x = a; x <= b; x++) sil[y * 256 + x] = 1; }
            }
            for (let y = waistY; y < 256; y++) {
              for (let x = 0; x < 256; x++) {
                const p = y * 256 + x, o = p * 4; if (d[o + 3] <= 40) continue;
                let isHand = fist[p] === 1;
                if (!isHand && d[o] < 85 && d[o + 1] < 85 && d[o + 2] < 85) {   // dark outline within 2px (Manhattan) of the fist
                  for (let dy = -2; dy <= 2 && !isHand; dy++)
                    for (let dx = -2; dx <= 2; dx++) {
                      if (Math.abs(dx) + Math.abs(dy) > 2) continue;
                      const xx = x + dx, yy = y + dy;
                      if (xx >= 0 && xx < 256 && yy >= 0 && yy < 256 && fist[yy * 256 + xx]) { isHand = true; break; }
                    }
                }
                if (!isHand) continue;
                if (sil[p]) { d[o] = pantsRef[0]; d[o + 1] = pantsRef[1]; d[o + 2] = pantsRef[2]; d[o + 3] = 255; }
                else d[o + 3] = 0;
              }
            }
            dirty = true;
          }
          if (dirty) ctx.putImageData(img, 0, 0);
        }
      } catch (e) { /* ghost-hand blend is best-effort */ }
    }
    /* v2.3.681: erase the naked-body OUTLINE/SHADOW remnants that survive
       OUTSIDE the armour silhouette where the AI drawing drifted (floating
       arcs hugging the figure).  When armoured, the body may only show INSIDE
       the filled gear silhouette (+2px: pants in plate gaps, armpit windows)
       or in the restored head band.  Row-ranges keep partial equips intact.
       Mirrors preview_armor_frames.composite -- keep in sync. */
    try {
      const sc = mk(256, 256);
      const sctx = sc.getContext('2d', { willReadFrequently: true });   /* v2.3.2871: read back once per bake */
      /* v2.3.2325: exact 2x.  This canvas is immediately thresholded at
         alpha>30 into `gop`, so with smoothing on the silhouette's edge landed
         wherever the bilinear ramp happened to cross 30 rather than on the art
         -- a foot of slop the v2.3.1353 / v2.3.1359 peek-ring tightening then
         had to fight. */
      sctx.imageSmoothingEnabled = false;
      let wornChest = false, wornLegs = false;
      for (const w of worn) {
        if (!w.draw) continue;
        w.draw(sctx, 0, 0, 256, 256);   /* v2.3.2750: cropped frames */
        if (w.k && w.k.indexOf('chest:') === 0) wornChest = true;
        if (w.k && w.k.indexOf('legs:') === 0) wornLegs = true;
      }
      const gd = sctx.getImageData(0, 0, 256, 256).data;
      const gop = new Uint8Array(256 * 256);
      let gLo = 256, gHi = -1;
      for (let p = 0; p < 256 * 256; p++) {
        if (gd[p * 4 + 3] > 30) {
          gop[p] = 1;
          const y = (p / 256) | 0;
          if (y < gLo) gLo = y; if (y > gHi) gHi = y;
        }
      }
      if (gHi >= gLo) {
        /* fill holes: flood the EMPTY space from the borders; anything empty
           and unreached is an interior hole -> part of the silhouette. */
        /* v2.3.2871: a preallocated stack, each pixel marked as it is pushed,
           so it is pushed at most once -- the same reached set as the old
           push-everything array, without ~260k array pushes per bake. */
        const reach = new Uint8Array(256 * 256); const st = _fillStack; let sp = 0;
        const seed = (p) => { if (!reach[p] && !gop[p]) { reach[p] = 1; st[sp++] = p; } };
        for (let x = 0; x < 256; x++) { seed(x); seed(255 * 256 + x); }
        for (let y = 0; y < 256; y++) { seed(y * 256); seed(y * 256 + 255); }
        while (sp > 0) {
          const p = st[--sp];
          const x = p & 255, y = p >> 8;
          if (x > 0) seed(p - 1);
          if (x < 255) seed(p + 1);
          if (y > 0) seed(p - 256);
          if (y < 255) seed(p + 256);
        }
        /* allowed = filled silhouette (gop | unreached) dilated by 2 */
        let fill = new Uint8Array(256 * 256);
        for (let p = 0; p < 256 * 256; p++) fill[p] = (gop[p] || !reach[p]) ? 1 : 0;
        /* v2.3.1353: pre-dilation silhouette (exact gear + interior windows)
           — the peek-ring tightening below needs it to tell "2px allowance
           ring" apart from "inside the armor / an interior window". */
        const fill0 = new Uint8Array(fill);
        for (let it = 0; it < 2; it++) {
          const nx = new Uint8Array(fill);
          for (let p = 0; p < 256 * 256; p++) {
            if (fill[p]) continue;
            const x = p % 256, y = (p / 256) | 0;
            if ((x > 0 && fill[p - 1]) || (x < 255 && fill[p + 1]) ||
                (y > 0 && fill[p - 256]) || (y < 255 && fill[p + 256])) nx[p] = 1;
          }
          fill = nx;
        }
        /* WAIST BAND: the torso-leg gap isn't always enclosed by gear (open at
           the hip side in profile frames), but the body there is legit -- it
           backs the see-through chain belt and fills the gap with pants
           instead of background.  Allow body in the waist rows, but only
           within the gear's horizontal span per row so outline arcs at waist
           height (beyond the gauntlets) stay dead.
           v2.3.684: partial wear too (chest-only: pants behind the baked-in
           belt; legs-only: hip edges beside the thigh plates). */
        const rowMin = new Int16Array(256).fill(256), rowMax = new Int16Array(256).fill(-1);
        let w0 = 256, w1 = 256;
        if ((wornChest || wornLegs) && figBot > figTop) {
          const fh2 = figBot - figTop;
          /* v2.3.1341 (owner: waist shimmer): for JOG the band rows come from
             the committed jogWaistRow table (the offline-measured skin->pants
             row per frame, the same source the attack composites land on)
             instead of the live silhouette's figTop/figBot -- the alpha-
             threshold jitter in those made the pants strip visible through
             the see-through chain belt shift every frame.  The measured row
             still tracks the genuine run-cycle bob.  Extents ~= the old
             0.38..0.64 fractions around the waist.  Stand is a single frame
             (already stable) and other poses keep the fraction formula. */
          if (poseInfo && poseInfo.pose === 'jog') {
            const wr = jogWaistRow(poseInfo.dir, poseInfo.frameIdx || 0);
            w0 = Math.max(0, wr - 26);
            w1 = Math.min(256, wr + 18);
          } else {
            w0 = Math.max(0, Math.round(figTop + 0.38 * fh2));
            w1 = Math.min(256, Math.round(figTop + 0.64 * fh2));
          }
          for (let y = w0; y < w1; y++) {
            for (let x = 0; x < 256; x++) {
              if (gop[y * 256 + x]) { if (x < rowMin[y]) rowMin[y] = x; if (x > rowMax[y]) rowMax[y] = x; }
            }
          }
        }
        /* v2.3.684 PARTIAL WEAR (chest-only / legs-only): the row-range gates
           (gLo/gHi) are fooled by sheet accessories -- the idle chest's hanging
           gauntlet reaches mid-thigh and the idle greaves can carry stray
           pixels above the knee -- so whole bare-thigh/hip rows were erased
           (floating boots under a chopped figure).  Confine per ROW instead:
           only rows where the gear actually WRAPS the body (gear pixels >=
           85% of the original body pixels in that row) are silhouette-
           confined; rows crossed by a narrow accessory keep the bare body.
           The full set keeps the original aggressive path (in profile the
           erased thigh hides behind the stacked plates -- restoring it would
           poke pants past the gauntlet). */
        const partial = !(wornChest && wornLegs);
        const covered = new Uint8Array(256);
        if (partial && origBody) {
          for (let y = 0; y < 256; y++) {
            let bc = 0, gc = 0;
            for (let x = 0; x < 256; x++) {
              const p = y * 256 + x;
              if (origBody[p * 4 + 3] > 40) bc++;
              if (gop[p]) gc++;
            }
            covered[y] = (bc > 0 && gc >= 0.85 * bc) ? 1 : 0;
          }
        }
        const img2 = ctx.getImageData(0, 0, 256, 256); const d2 = img2.data;
        const hi2 = wornLegs ? Math.min(256, gHi + 8) : 256;
        let dirty2 = false;
        for (let y = Math.max(0, neckY); y < 256; y++) {
          const skipBelow = !wornLegs && y > gHi;     // bare legs stay
          const skipAbove = !wornChest && y < gLo;    // bare torso stays
          const inWaist = y >= w0 && y < w1;
          for (let x = 0; x < 256; x++) {
            const p = y * 256 + x, o = p * 4;
            if (partial && !covered[y] && !(wornLegs && y >= hi2)) {
              /* bare row: stays whole AND gets back what the dilated cover
                 halo ate (the hue-based pant-restore misses shirt/skin, which
                 left a transparent band above the greaves top / around the
                 hanging gauntlet on partial wear). */
              if (d2[o + 3] === 0 && origBody && origBody[o + 3] > 40) {
                d2[o] = origBody[o]; d2[o + 1] = origBody[o + 1];
                d2[o + 2] = origBody[o + 2]; d2[o + 3] = origBody[o + 3];
                dirty2 = true;
              }
              continue;
            }
            if (d2[o + 3] === 0) continue;
            if (wornLegs && y >= hi2) { d2[o + 3] = 0; dirty2 = true; continue; }
            if (partial) {
              if (!covered[y]) continue;              // bare row stays whole
            } else if (skipBelow || skipAbove) continue;
            if (inWaist && x >= rowMin[y] && x <= rowMax[y]) continue;
            if (!fill[p]) { d2[o + 3] = 0; dirty2 = true; continue; }
            /* v2.3.1353 (owner: "an entire chain armor outline on the east
               body — it just needs to be in the waist part"): BELOW the
               waist band the 2px allowance ring let the BODY's leg edges
               peek past the narrower greave art — east's olive pants traced
               the legs.  Legs are not waist: there the body may show only
               INSIDE the exact gear silhouette (interior windows included,
               fill0); the waist rows keep the ring, where the trunks
               legitimately meet the hip edge.  Full-set jog only — partial
               wear and other poses keep the v2.3.681 behavior.
               v2.3.1358 (owner: SW/SE "head ... sunken behind" the plate on
               the early frames): below-band ONLY.  Tightening ABOVE the band
               also shaved the neck/chin edge under neckY that pads the
               collar, sinking the head behind the plate where the chin dips
               lowest in the cycle. */
            if (!partial && poseInfo && poseInfo.pose === 'jog' && w0 < w1
                && (y >= w1 + 8
                    /* v2.3.1359 (owner: east "still has a slight ghost
                       outline"): east's fixed 46px chain band never reaches
                       the hip edges, so the band rows' allowance ring there
                       is pure olive-pants bleed — clamp it too.  The neck
                       rows above w0-8 keep the ring (head padding). */
                    || (poseInfo.dir === 'east' && y >= w0 - 8))
                && !fill0[p]) {
              d2[o + 3] = 0; dirty2 = true;
            }
          }
        }
        /* v2.3.1347 (owner): the chain belt is PAINTED ONTO the exposed
           waist — the green/pants band the art left between plate and
           greaves — instead of rendering as its own layer.  Because the
           paint replaces only pants-classified pixels of the BODY frame,
           the swinging bare arm (skin) and every armor piece keep their
           exact hand-drawn depth: whatever the sheet drew over the green
           stays in front.  Chain pixels come from the frame-aligned belt
           sheet (belt/chainbelt/jog-<dir>.png), sampled at the same (x,y).
           Runs only on the ARMORED bake, so unarmored players (and the
           shirt-hem / waist anchors computed from the raw sheets) are
           untouched. */
        /* v2.3.1360: the paint ran whenever the CHEST was worn — partial
           chest-only wear lost its waist cover when v2.3.1345 stripped the
           baked belt (the bare-midriff band read as broken).
           v2.3.1372 (owner: "leg armor is appearing on thighs" on chest-only):
           FULL SET ONLY again.  The belt sheets carry chain TRUNKS over the
           hips/thighs on the frontal dirs — under greaves that's the sealed
           waist, on bare legs it read as chain shorts.  Chest-only wear now
           uses the ORIGINAL pre-v2.3.1345 chest sheets (baked hem belt
           restored on south/southwest/north/east), so the old-system look
           needs no runtime paint; those dirs draw this sheet only on partial
           wear (full set = the fullset figure), so the baked belt cannot
           re-trigger the full-set belt artifacts. */
        if (wornChest && wornLegs && poseInfo && poseInfo.pose === 'jog' && w0 < w1
            && _bakeRefs && _bakeRefs.pantsRef) {
          try {
            const bt = belt ? belt(poseInfo.dir, poseInfo.frameIdx | 0) : null;   /* v2.3.2874: a draw function, or null while the sheet loads */
            if (!bt) {
              _beltPending = true;   // sheet still loading: bake uncached, retry later
            } else {
              const bcv = mk(256, 256);
              const bctx = bcv.getContext('2d');
              /* v2.3.2325: exact 2x.  These pixels are COPIED VERBATIM into the
                 waist band below (d2[o] = bd[o]), so a bilinear belt sheet
                 painted bilinear chain straight into the finished frame. */
              bctx.imageSmoothingEnabled = false;
              bt(bctx, 0, 0, 256, 256);   /* v2.3.2750: cropped frames */
              const bd = bctx.getImageData(0, 0, 256, 256).data;
              const _score = (R, G, B, T) => { const nn = T[0] * T[0] + T[1] * T[1] + T[2] * T[2] || 1; const dt = R * T[0] + G * T[1] + B * T[2]; return dt * dt / nn; };
              const { skinRef, pantsRef, shoesRef } = _bakeRefs;
              /* v2.3.1349: paint over the belt sheet's FULL extent, not just
                 the w0..w1 band rows — the trunks reach below wr+18 on SW and
                 the row gate left their lower hips unpainted = the on-device
                 holes.  The sheet itself is already confined to the waist. */
              for (let y = Math.max(0, w0 - 24); y < Math.min(256, w1 + 24); y++) {
                for (let x = 0; x < 256; x++) {
                  const o = (y * 256 + x) * 4;
                  if (bd[o + 3] <= 40) continue;
                  if (d2[o + 3] <= 40) {
                    /* seam hole (the erase ate the bare midriff): fill with
                       chain — this WAS the detached torso/legs gap.
                       v2.3.1359 (owner: SE "light material between the legs"):
                       only where the BODY originally existed — the belt
                       sheet's 2px clip slack bridges the crotch gap when the
                       thighs separate, and filling background pixels there
                       hung floating chain between the legs. */
                    if (!origBody || origBody[o + 3] <= 40) continue;
                    d2[o] = bd[o]; d2[o + 1] = bd[o + 1]; d2[o + 2] = bd[o + 2];
                    d2[o + 3] = 255;
                    dirty2 = true;
                    continue;
                  }
                  const R = d2[o], G = d2[o + 1], B = d2[o + 2];
                  /* v2.3.1349b (owner: "black superhero underwear"): the body
                     sheet draws a DARK waistband/shadow at the waist (max
                     channel < 75).  The hue-projection score is unstable at
                     that brightness, so those pixels failed the pants test
                     and survived as a flat dark band under the plate.  Dark
                     pixels inside the belt's extent ARE the exposed waist —
                     replace them with chain; skin (arm, fist) is bright and
                     never matches.
                     v2.3.1360: on the non-profile dirs the arm NEVER crosses
                     the band (fixed/central masks), so the belt extent
                     replaces EVERYTHING there — the bare-midriff skin sliver
                     included (glaring on chest-only wear).  East/northeast
                     keep the skin test so the crossing fist stays in front. */
                  const _skinSafe = poseInfo.dir !== 'east' && poseInfo.dir !== 'northeast';
                  const sP = _score(R, G, B, pantsRef);
                  if (_skinSafe || Math.max(R, G, B) < 75
                      || ((!skinRef || sP >= _score(R, G, B, skinRef))
                          && (!shoesRef || sP >= _score(R, G, B, shoesRef)))) {
                    /* green/pants band pixel: chain replaces it; skin (arm,
                       fist) stays and keeps its hand-drawn depth */
                    d2[o] = bd[o]; d2[o + 1] = bd[o + 1]; d2[o + 2] = bd[o + 2];
                    dirty2 = true;
                  }
                }
              }
            }
          } catch (e) { /* best-effort: waist stays pants this bake */ }
        }
        /* v2.3.1359 (owner: east "still has a slight ghost outline"): east's
           body sheet draws its pants OLIVE-GREEN.  Through the armor's
           INTERIOR windows around the crotch/legs — legitimately inside the
           silhouette, so the exact-silhouette clamp can't touch them — the
           olive reads as a ghost tracing the figure.  East only: quiet any
           olive-tinted pixel below the chain band's top to under-armor
           shadow.  Skin fails the tint test (R far above G); chain gray has
           G ~= B and passes through untouched. */
        if (!partial && poseInfo && poseInfo.pose === 'jog' && w0 < w1
            && poseInfo.dir === 'east') {
          for (let y = Math.max(0, w0 - 8); y < 256; y++) {
            for (let x = 0; x < 256; x++) {
              const o = (y * 256 + x) * 4;
              if (d2[o + 3] <= 40) continue;
              const R = d2[o], G = d2[o + 1], B = d2[o + 2];
              if (G > B + 14 && G >= R - 24 && R > 40) {
                d2[o] = 44; d2[o + 1] = 47; d2[o + 2] = 54; dirty2 = true;
              }
            }
          }
        }
        /* v2.3.1349 SAFETY NET: no interior waist hole survives, period.  Any
           pixel where the ORIGINAL body existed, nothing remains after the
           erase/restores/paints, and the gear silhouette encloses it
           vertically (armor within 16 rows above AND below) is filled with
           quiet under-armor shadow.  This is independent of any sheet's
           coverage — the class of bug that kept reappearing ("giant gaps
           while running") whenever a generator and the art disagreed. */
        if (wornChest && wornLegs && origBody && poseInfo && poseInfo.pose === 'jog' && w0 < w1) {
          /* v2.3.1360 ran this on chest-only wear too; v2.3.1373 (owner:
             "sudden black appearing in the south jog torso only"): the slate
             fill flashing in and out at the hem read as black flicker on the
             bare-pants look.  FULL SET ONLY — chest-only waist cover is now
             the chest sheet's own extended hem belt (art-level, steady). */
          const lo3 = Math.max(0, w0 - 28), hi3 = Math.min(256, w1 + 28);
          for (let y = lo3; y < hi3; y++) {
            for (let x = 0; x < 256; x++) {
              const p = y * 256 + x, o = p * 4;
              if (d2[o + 3] > 40 || origBody[o + 3] <= 40) continue;
              let above = false, below = false;
              for (let k = 1; k <= 16 && !(above && below); k++) {
                if (!above && y - k >= 0 && (gop[p - k * 256] || d2[(p - k * 256) * 4 + 3] > 40)) above = true;
                if (!below && y + k < 256 && (gop[p + k * 256] || d2[(p + k * 256) * 4 + 3] > 40)) below = true;
              }
              if (above && below) {
                /* v2.3.1349b: dark STEEL, not near-black — flat black patches
                   at the waist read as "underwear" (owner) */
                d2[o] = 44; d2[o + 1] = 47; d2[o + 2] = 54; d2[o + 3] = 255;
                dirty2 = true;
              }
            }
          }
        }
        if (dirty2) ctx.putImageData(img2, 0, 0);
      }
    } catch (e) { /* silhouette confinement is best-effort */ }
  } catch (e) { return null; }
  return { cv, beltPending: _beltPending };
}
