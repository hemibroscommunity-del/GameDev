/* THE COPPER LEGGINGS HAVE BLUISH FEET (v2.3.2519).
 *
 * Owner (backlog triage 2026-09-14 §5.8): the copper leg armour reads blue at
 * the feet on a jog east, and the cause is already settled -- "the body's SHOES
 * poke out beneath the copper leggings".
 *
 * WHY THAT ANSWER IS FORCED, and why this scenario can be a COLOUR test rather
 * than a shape test.  Copper is the steel art under a Pixi multiply tint
 * (0xFF9E58, materialTints.js): out = texel x tint, and the tint's blue channel
 * is 88/255.  A multiply cannot ADD blue -- every copper pixel is strictly LESS
 * blue than the steel pixel it came from, and the steel sheets are 99.2%
 * neutral.  So a pixel at the feet whose BLUE beats its RED cannot be the
 * armour, whatever the art does.  That makes "cool pixels in the boot band" an
 * exact measure of body showing through, with no thresholds to argue about.
 *
 * THE CONTROLS ARE THE POINT.  Bare legs say what the boot looks like with
 * nothing over it (the upper bound); steel greaves say whether this is about
 * COPPER or about the greaves generally (it is the latter -- the tint only
 * makes it legible).  Without both, "there is blue at the feet" is a number
 * with nothing to compare it to.
 *
 *   node tools/qa/mp/run.mjs copperfeet
 */
import * as H from './harness.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = H.REPO + '/tools/qa/mp/out';
const TAG = process.env.BT_SHOT_TAG || 'now';
const SAMPLES = 34;


/* ═══ THE FIGURE ON ITS OWN, OFF THE LIVE SPRITES ═══
 * A world screenshot cannot answer this question and three runs of this file
 * proved it: the boot is about four screen pixels, it stands on grey-blue
 * cobble, and a PNG of the game has no alpha to tell a character from what it
 * is standing on.  Every "cool pixels at the feet" number measured this way came
 * back within 2% of itself whatever the armour was doing, because it was mostly
 * counting the ground.
 *
 * So the layers are read STRAIGHT OFF THE LIVE SPRITES instead -- the baked,
 * gear-erased body texture that _maskedBodyFrame produced this frame, plus the
 * gear sprites with their own tints -- and composited onto transparency.  That
 * is the same picture the GPU is drawing, minus the world behind it, and it is
 * the real bake rather than an offline mirror of it (the thing
 * _maskedBodyFrame was exported for in v2.3.1349, after the Python mirrors kept
 * diverging from it).
 *
 * Every layer is stretched to the same 256 box: the gear sheets are
 * pixel-aligned to the body by construction (gear-layer-spec.md) and the only
 * difference between them is frame SIZE, so a common box re-registers them
 * exactly as the renderer's shared transform does. */
const figureCanvas = (P) => P.page.evaluate(() => {
  const pd = window._pixiRenderer.playerDisplayRaw ? window._pixiRenderer.playerDisplayRaw() : null;
  if (!pd) return null;
  const N = 256;
  const cv = document.createElement('canvas');
  cv.width = N; cv.height = N;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingEnabled = false;
  const draw = (spr) => {
    if (!spr || !spr.visible || !spr.texture) return false;
    const t = spr.texture;
    const res = t.source && (t.source.resource || t.source._resource);
    if (!res) return false;
    const f = t.frame || { x: 0, y: 0, width: t.width, height: t.height };
    /* v2.3.2733: gear frames are CROPPED (gearSheets packTrimmed) -- `frame` is
       only the crop, `orig` the whole frame and `trim` where the crop sits in
       it.  Place the crop in the box by those, or it stretches over it. */
    const o = t.orig || f, tr = t.trim;
    const dx = tr ? tr.x * N / o.width : 0, dy = tr ? tr.y * N / o.height : 0;
    const dw = tr ? f.width * N / o.width : N, dh = tr ? f.height * N / o.height : N;
    const tmp = document.createElement('canvas');
    tmp.width = N; tmp.height = N;
    const tg = tmp.getContext('2d', { willReadFrequently: true });
    tg.imageSmoothingEnabled = false;
    try { tg.drawImage(res, f.x, f.y, f.width, f.height, dx, dy, dw, dh); } catch (e) { return false; }
    const tint = (spr.tint === undefined || spr.tint === null) ? 0xffffff : spr.tint;
    if (tint !== 0xffffff) {
      /* the same multiply Pixi's batcher applies, done here so a copper piece
         is measured as copper rather than as the steel art it borrows. */
      tg.globalCompositeOperation = 'multiply';
      tg.fillStyle = `rgb(${(tint >> 16) & 255},${(tint >> 8) & 255},${tint & 255})`;
      tg.fillRect(0, 0, N, N);
      tg.globalCompositeOperation = 'destination-in';
      tg.drawImage(res, f.x, f.y, f.width, f.height, dx, dy, dw, dh);
    }
    g.drawImage(tmp, 0, 0);
    return true;
  };
  /* the renderer's own slot order: body, then legs < shirt < chest < shoulders */
  const drew = { body: draw(pd._spriteBody), legs: draw(pd._gearLegs),
    shirt: draw(pd._gearShirt), chest: draw(pd._gearChest), shoulders: draw(pd._gearShoulders) };
  const d = g.getImageData(0, 0, N, N).data;
  let fy0 = N, fy1 = -1;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) if (d[(y * N + x) * 4 + 3] > 40) { if (y < fy0) fy0 = y; if (y > fy1) fy1 = y; break; }
  }
  if (fy1 <= fy0) return null;
  /* THE BOOT BAND: the bottom sixth of the figure, which is where the boots are
     and which is the band the renderer's own deeper erase is clipped to. */
  const band = Math.round(fy0 + 0.84 * (fy1 - fy0));
  /* ═══ WHAT "BLUISH" ACTUALLY IS, MEASURED ═══
   * The first cut of this counted pixels whose BLUE beat their RED, on the
   * reasoning that a copper multiply cannot add blue.  That reasoning is sound
   * and the metric was still wrong, and it is worth writing down because it is
   * the shape of mistake docs/TRAPS.md keeps recording: the body's boot is a
   * FLAT NEUTRAL GREY (playerSkins classifies it by max-min < 28), so b and r
   * are within a couple of counts of each other and a "b > r" test scores it
   * zero.  What the owner is seeing is that grey sitting beside copper, which
   * reads blue by contrast -- a fact about the two colours together, not about
   * the pixel.  Measured through the old test, armour on and armour off came
   * out 3.6 and 16.2 with no daylight between a fixed build and a broken one.
   *
   * So this counts the BOOT, by the renderer's own shoe test, which is what the
   * question was all along: how much of the body's own boot is still drawn when
   * leg armour is on.  Copper cannot produce a pixel that passes it -- the tint
   * is (255,158,88), so every copper texel comes out with max-min far above 28. */
  const isShoe = (i) => {
    const r = d[i], gg = d[i + 1], b = d[i + 2];
    const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
    return (mx - mn) < 28 && mx >= 45 && mx < 140;
  };
  let cool = 0, warm = 0, opaque = 0;
  for (let y = band; y <= fy1; y++) {
    for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4;
      if (d[i + 3] < 40) continue;
      opaque++;
      const r = d[i], b = d[i + 2];
      if (Math.max(r, d[i + 1], b) < 40) continue;     /* the art's own keyline */
      if (isShoe(i)) cool++; else if (r > b + 6) warm++;
    }
  }
  return { cool, warm, opaque, band, fy0, fy1, drew,
    frame: pd._animFrame, pose: pd._animPose, dir: pd._animDir,
    url: cv.toDataURL('image/png') };
});

const uiAside = (P, hide) => P.page.evaluate((v) => {
  if (!v) {
    for (const el of document.querySelectorAll('[data-bt-shot-hidden]')) {
      el.style.visibility = el.dataset.btShotVis || '';
      delete el.dataset.btShotHidden; delete el.dataset.btShotVis;
    }
    return;
  }
  let el = document.querySelector('canvas');
  while (el && el.parentElement) {
    for (const sib of el.parentElement.children) {
      if (sib === el || sib.dataset.btShotHidden) continue;
      sib.dataset.btShotHidden = '1';
      sib.dataset.btShotVis = sib.style.visibility || '';
      sib.style.visibility = 'hidden';
    }
    el = el.parentElement;
  }
}, hide);

async function stride(P, label, rec) {
  await H.hopTo(P, H.TOWN_CLEAN_SPOT.x, H.TOWN_CLEAN_SPOT.y).catch(() => {});
  await P.page.waitForTimeout(400);
  const seen = [];
  const urls = [];
  await P.page.keyboard.down('d');
  await P.page.waitForTimeout(200);
  for (let i = 0; i < SAMPLES; i++) {
    const fig = await figureCanvas(P);
    if (fig && fig.pose === 'jog' && fig.dir === 'east') {
      if (!seen.some((x) => x.frame === fig.frame)) {
        urls.push({ frame: fig.frame, url: fig.url });
        const { url, ...rest } = fig;
        seen.push(rest);
      }
    }
    if (seen.length >= 26) break;
    await P.page.waitForTimeout(40);
  }
  await P.page.keyboard.up('d');
  await P.page.waitForTimeout(300);
  rec.ok(`the ${label} stride was sampled off the live sprites (guard)`,
    seen.length >= 14, { got: seen.length });
  rec.ok(`...and every sample had a baked body on it (guard — an empty draw `
    + `would score zero cool pixels and pass every claim below)`,
    seen.length > 0 && seen.every((x) => x.drew && x.drew.body && x.opaque > 20),
    { drew: seen[0] && seen[0].drew, opaque: seen[0] && seen[0].opaque });

  /* A contact strip of the figures themselves, 6 of them at 6x -- these are
     256px frames, so 6x is already 1536px of bro per cell. */
  urls.sort((a, b) => a.frame - b.frame);
  const strip = await P.page.evaluate(async (list) => {
    const imgs = await Promise.all(list.map((e) => new Promise((res) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = e.url;
    })));
    const ok = imgs.filter(Boolean).slice(0, 6);
    if (!ok.length) return null;
    const S = 6;
    const cv = document.createElement('canvas');
    cv.width = ok.length * 256 * S; cv.height = 256 * S;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#14202a'; g.fillRect(0, 0, cv.width, cv.height);
    ok.forEach((im, i) => g.drawImage(im, i * 256 * S, 0, 256 * S, 256 * S));
    return cv.toDataURL('image/png');
  }, urls.filter((_, i) => i % Math.max(1, Math.floor(urls.length / 6)) === 0));
  if (strip) {
    mkdirSync(OUT, { recursive: true });
    writeFileSync(`${OUT}/copperfeet-${TAG}-${label}.png`, Buffer.from(strip.split(',')[1], 'base64'));
  }
  const byFrame = Object.create(null);
  for (const x of seen) if (byFrame[x.frame] === undefined) byFrame[x.frame] = x.cool;
  const cools = seen.map((x) => x.cool);
  const total = cools.reduce((a, b) => a + b, 0);
  return { per: seen, byFrame, total,
    mean: cools.length ? +(total / cools.length).toFixed(1) : 0,
    worst: cools.length ? Math.max(...cools) : 0 };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Coppered', wsPort, webPort,
    viewport: { width: 390, height: 844 } });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2200);
  /* THE NAME PLATE SITS ON THE BOOTS.  It is drawn in the WORLD canvas below the
     figure, so hiding the DOM does not touch it and a crop that reaches the feet
     reaches it too -- three runs of this file photographed a bro whose legs end
     at a black pill reading "Coppered LV 3".  `renderable` rather than `visible`
     because the renderer writes `visible` every frame from _placeNamePill, and
     a shadowing property does not fool Pixi v8's render bitmask (mp-cape's own
     note on exactly that trap). */
  await P.page.evaluate(() => {
    const pd = window._pixiRenderer.playerDisplayRaw ? window._pixiRenderer.playerDisplayRaw() : null;
    if (pd && pd._namePill) pd._namePill.renderable = false;
  });

  const setLegs = async (id) => {
    await P.page.evaluate((v) => { try { window.__btGearSet('legs', v); } catch (e) {} }, id);
    await P.page.waitForTimeout(900);
    return P.page.evaluate(() => (window.__btWardrobe ? window.__btWardrobe().gearLegs : null));
  };

  const bareId = await setLegs('none');
  rec.ok('the character starts with bare legs (guard)', bareId === 'none' || !bareId, { legs: bareId });
  const bare = await stride(P, 'bare-legs', rec);

  const steelId = await setLegs('steelgreaves');
  rec.ok('the STEEL greaves went on through the real gear store (guard)',
    steelId === 'steelgreaves', { legs: steelId });
  const steel = await stride(P, 'steel-greaves', rec);

  const copperId = await setLegs('coppergreaves');
  rec.ok('the COPPER greaves went on through the real gear store (guard)',
    copperId === 'coppergreaves', { legs: copperId });
  const copper = await stride(P, 'copper-greaves', rec);

  console.log(`    BODY-BOOT pixels still drawn in the boot band, per frame:`);
  console.log(`      bare legs     : mean ${bare.mean}  worst ${bare.worst}  total ${bare.total}`);
  console.log(`      steel greaves : mean ${steel.mean}  worst ${steel.worst}  total ${steel.total}`);
  console.log(`      copper greaves: mean ${copper.mean}  worst ${copper.worst}  total ${copper.total}`);
  const frames = Object.keys(copper.byFrame).filter((f) => bare.byFrame[f] !== undefined);
  console.log(`      copper by frame: ${JSON.stringify(frames.map((f) => [f, copper.byFrame[f]]))}`);
  /* ── WHICH LAYER IS THE GREY? ──
     The composite says there is flat grey at the boots with copper greaves on,
     and "the body's boot poking out" and "the armour's own boot art" are
     indistinguishable in it.  So the two layers are dumped separately, from the
     same frame, and the grey is counted in each.  A copper pixel cannot pass the
     shoe test (proved in figureCanvas), so whichever layer carries the grey is
     the answer. */
  await P.page.keyboard.down('d');
  await P.page.waitForTimeout(500);
  const layers = await P.page.evaluate(() => {
    const pd = window._pixiRenderer.playerDisplayRaw();
    const N = 256;
    const one = (spr, applyTint) => {
      if (!spr || !spr.visible || !spr.texture) return null;
      const t = spr.texture;
      const res = t.source && (t.source.resource || t.source._resource);
      if (!res) return null;
      const f = t.frame || { x: 0, y: 0, width: t.width, height: t.height };
      /* v2.3.2733: gear frames are CROPPED (gearSheets packTrimmed) -- `frame` is
         only the crop, `orig` the whole frame and `trim` where the crop sits in
         it.  Place the crop in the box by those, or it stretches over it. */
      const o = t.orig || f, tr = t.trim;
      const dx = tr ? tr.x * N / o.width : 0, dy = tr ? tr.y * N / o.height : 0;
      const dw = tr ? f.width * N / o.width : N, dh = tr ? f.height * N / o.height : N;
      const c = document.createElement('canvas'); c.width = N; c.height = N;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.imageSmoothingEnabled = false;
      try { g.drawImage(res, f.x, f.y, f.width, f.height, dx, dy, dw, dh); } catch (e) { return null; }
      const tint = (applyTint && spr.tint != null) ? spr.tint : 0xffffff;
      if (tint !== 0xffffff) {
        g.globalCompositeOperation = 'multiply';
        g.fillStyle = `rgb(${(tint >> 16) & 255},${(tint >> 8) & 255},${tint & 255})`;
        g.fillRect(0, 0, N, N);
        g.globalCompositeOperation = 'destination-in';
        g.drawImage(res, f.x, f.y, f.width, f.height, dx, dy, dw, dh);
      }
      const d = g.getImageData(0, 0, N, N).data;
      let fy0 = N, fy1 = -1;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (d[(y * N + x) * 4 + 3] > 40) { if (y < fy0) fy0 = y; if (y > fy1) fy1 = y; break; }
      let grey = 0;
      const band = Math.round(fy0 + 0.84 * (fy1 - fy0));
      for (let y = Math.max(0, band); y <= fy1 && y < N; y++) {
        for (let x = 0; x < N; x++) {
          const i = (y * N + x) * 4;
          if (d[i + 3] < 40) continue;
          const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
          if ((mx - mn) < 28 && mx >= 45 && mx < 140) grey++;
        }
      }
      return { grey, fy0, fy1, band, tint: tint.toString(16),
        texW: f.width, texH: f.height, texX: f.x,
        srcKind: (res && res.constructor && res.constructor.name) || typeof res,
        srcW: res && (res.width || 0), srcH: res && (res.height || 0),
        url: c.toDataURL('image/png') };
    };
    return { frame: pd._animFrame, dir: pd._animDir, pose: pd._animPose,
      body: one(pd._spriteBody, false), legs: one(pd._gearLegs, true) };
  });
  await P.page.keyboard.up('d');
  if (layers) {
    mkdirSync(OUT, { recursive: true });
    for (const k of ['body', 'legs']) {
      if (layers[k] && layers[k].url) {
        writeFileSync(`${OUT}/copperfeet-${TAG}-layer-${k}.png`,
          Buffer.from(layers[k].url.split(',')[1], 'base64'));
      }
    }
    console.log(`      LAYERS on ${layers.pose}-${layers.dir} frame ${layers.frame}:`);
    console.log(`        body: ${JSON.stringify(layers.body && { grey: layers.body.grey, band: layers.body.band, fy1: layers.body.fy1, texW: layers.body.texW, texX: layers.body.texX, src: layers.body.srcKind, srcW: layers.body.srcW })}`);
    console.log(`        legs: ${JSON.stringify(layers.legs && { grey: layers.legs.grey, band: layers.legs.band, fy1: layers.legs.fy1, texW: layers.legs.texW, tint: layers.legs.tint, src: layers.legs.srcKind, srcW: layers.legs.srcW })}`);
  }


  rec.ok('all three loadouts were measured over a jog-east stride (guard)',
    bare.per.length > 10 && steel.per.length > 10 && copper.per.length > 10,
    { bare: bare.per.length, steel: steel.per.length, copper: copper.per.length });

  /* THE CONTROL THAT MAKES THE NUMBER MEAN SOMETHING.  Bare legs are the upper
     bound: that IS the boot, unarmoured.  If the copper run came out near it,
     the armour would not be covering anything at all and the story would be
     different. */
  rec.ok('CONTROL: bare legs show plenty of body boot in the band, so the '
    + 'measure can see a boot when there is one', bare.mean > 20, { bare: bare.mean });

  /* THE CLAIM, AS A RATIO AGAINST THE BARE RUN.  Copper cannot make a cool
     pixel -- the tint's blue channel is 88/255 and a multiply only darkens --
     so cool pixels down here are either the body's boot or the GROUND, and a
     world screenshot has no alpha to tell a character from what it is standing
     on.  Measuring against the bare run cancels the ground: both runs walk the
     same route over the same cobbles with the same crop, so what separates them
     is the armour.  Before the fix the copper run scored 0.79 of bare -- the
     armour was hiding almost none of the boot the erase was supposed to remove. */
  /* REPORTED, NOT GATED, and the reason is in the layer dump below: this is a
     diagnosis, not a fix.  A gate here could only say "the number I chose
     moved", and three different renderer-side fixes were built against this
     number and every one of them left the picture identical. */
  rec.ok('MEASURED: how much of the body\'s own boot is still drawn with copper '
    + 'leg armour on. A copper pixel cannot pass the renderer\'s flat-grey shoe '
    + 'test (the tint is 255,158,88), so this counts body and nothing else',
    copper.per.length > 0,
    { copper: copper.mean, bare: bare.mean,
      ratio: bare.mean ? +(copper.mean / bare.mean).toFixed(2) : null, worst: copper.worst });

  /* STEEL IS NOT A COMPARABLE NUMBER and saying so is the point: steel armour
     is itself flat grey, so it passes the shoe test and scores HIGHER than a
     bare leg (533 against 484, measured).  Copper is the only loadout where
     "grey" means "body", which is why the whole diagnosis runs on copper. */
  rec.ok('...and the STEEL run is reported for contrast only — steel armour is '
    + 'flat grey itself, so the shoe test cannot tell it from a boot; copper is '
    + 'the loadout that separates them',
    steel.per.length > 0, { steel: steel.mean, worst: steel.worst });

  /* THE VERDICT, off the layer dump above: the grey is in the BODY layer and
     there is none of it in the copper-tinted LEGS layer.  So the owner's answer
     in §5.8 is right -- it is the body's shoe -- and it is not the greaves art
     being the wrong colour. */
  rec.ok('DIAGNOSIS: the grey at the feet is in the BODY layer, not in the '
    + 'copper-tinted armour layer — so it is the body\'s own boot, exactly as '
    + 'the owner\'s answer says, and not a cool pixel in the steel art',
    !!(layers && layers.body && layers.legs && layers.body.grey > 0 && layers.legs.grey === 0),
    { bodyGrey: layers && layers.body && layers.body.grey,
      legsGrey: layers && layers.legs && layers.legs.grey,
      legsTint: layers && layers.legs && layers.legs.tint });

  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await P.ctx.close();
}
