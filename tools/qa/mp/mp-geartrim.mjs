/* Cropped gear frames (v2.3.2750).
 *
 * Owner: "would it be an improvement to the memory constraints that currently
 * exist equipping armor while running on mobile?" -- then "yes, build the
 * cropping PR".
 *
 * gearSheets now crops the empty space off every walking-layer gear frame and
 * hands the renderer Textures whose `orig` is the whole frame and whose `trim`
 * says where the crop sits in it.  The claim has two halves and this checks
 * both, on the live renderer rather than on the sheets:
 *
 *   SMALLER -- the cropped sheets hold under a third of the bytes the uncropped
 *   strips did (__btGearTrim, counted as they are built), and the whole-game
 *   texture total (__btTex) is printed so a before/after against the previous
 *   build is one number each side.
 *
 *   IN THE SAME PLACE -- every visible armour sprite, on the wearer's own
 *   screen AND on a peer's, reports a bounding box that is exactly the body
 *   sprite's box.  Sprite bounds are computed from `orig`, so this is the check
 *   that `_placeGear`'s scale moved from frame to orig: had it not, a cropped
 *   64px frame would be scaled 2x and its box would be twice the body's.
 *   It is asserted in every facing while jogging and standing, local and peer.
 *
 *   v2.3.2774, THE COMBAT STRIPS -- the 33 stand-in gear strips (swing,
 *   bowshot, chop, cook, fire) are cropped by effectsRenderer._gearStripFrame:
 *   all of them built cropped, under a third of their bytes, and every frame
 *   byte-identical to its frame in the served PNG.
 *
 *   v2.3.2775, THE STAND-IN BODIES -- the recoloured sword / bow / jog-leg /
 *   chop figures (effectsRenderer._sliceStandIn): built cropped, well under
 *   their bytes, and every frame byte-identical to the whole bake, which the
 *   slicer keeps beside the crops only because this scenario sets
 *   __btTrimVerify before the game loads.
 *
 * Pictures of the armoured figure (both screens, four facings) land in
 * GEARTRIM_SHOTS (default /tmp/qa-geartrim) for a by-eye comparison against
 * the previous build.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';

const DIR = process.env.GEARTRIM_SHOTS || '/tmp/qa-geartrim';

const setGear = (P, slot, id) => P.page.evaluate(({ s, i }) => {
  if (!window.__btSetGear) return 'missing';
  window.__btSetGear(s, i);
  return 'ok';
}, { s: slot, i: id });

/* Every player display in the scene graph (the peer displays live in a closure
   map the facade does not expose, so they are found by walking the stage for
   the gear-sprite fields every player display carries). */
const displays = (P) => P.page.evaluate(() => {
  const R = window._pixiRenderer;
  const stage = R && R.app && R.app.stage;
  if (!stage) return null;
  const own = R.playerDisplayRaw ? R.playerDisplayRaw() : null;
  const found = [];
  const walk = (c, d) => {
    if (!c || d > 10) return;
    if (c._spriteBody && ('_gearChest' in c || '_gearLegs' in c)) { found.push(c); return; }
    for (const ch of (c.children || [])) walk(ch, d + 1);
  };
  walk(stage, 0);
  const box = (s) => { const b = s.getBounds(); return [b.minX, b.minY, b.maxX, b.maxY]; };
  return found.filter((d) => d.visible !== false).map((d) => {
    const body = d._spriteBody;
    const bodyBox = body && body.visible && body.texture ? box(body) : null;
    const layer = (k) => {
      const s = d[k];
      if (!s || !s.visible || !s.texture) return null;
      const t = s.texture;
      const b = box(s);
      return {
        cropped: !!t.trim,
        origW: t.orig ? t.orig.width : null,
        frameW: t.frame ? t.frame.width : null,
        /* how far each edge of the layer's box sits from the body's */
        off: bodyBox ? b.map((v, i) => +(v - bodyBox[i]).toFixed(2)) : null,
      };
    };
    return {
      own: d === own,
      pose: d._animPose || null, dir: d._animDir || null,
      body: !!bodyBox,
      chest: layer('_gearChest'), legs: layer('_gearLegs'), shirt: layer('_gearShirt'),
      head: layer('_bodyHead'),   /* v2.3.2775: the head overlay (cropped head sheets) */
    };
  });
});

const tex = (P) => P.page.evaluate(() => (window.__btTex ? window.__btTex() : null));
const trimStats = (P) => P.page.evaluate(() => (window.__btGearTrim ? window.__btGearTrim() : null));

/* v2.3.2774: the COMBAT stand-in strips (swing, bowshot, chop, cook, fire),
   cropped by effectsRenderer._gearStripFrame.  For every cropped sheet: decode
   the served file again, cut it into the same frames the uncropped loader cut
   (frame count and width from the cropped frames' own `orig`), and compare
   each against the cropped frame drawn back into its whole frame at its trim.
   Byte-for-byte, or it is reported. */
/* v2.3.2775: the recoloured STAND-IN bodies (sword / bow bodies and torsos,
   jog legs, cook / chop / fire figures, the peer chop copies), cropped by
   effectsRenderer._sliceStandIn.  Each cropped frame is drawn back into its
   whole frame at its trim and compared with the same frame of the whole bake,
   which the slicer kept only because __btTrimVerify was set. */
const standInIdentity = (P, which = 'standin') => P.page.evaluate((which) => {
  /* v2.3.2775: the same comparison serves the head sheets (playerSkins), whose
     probe returns a key -> stats map rather than a list */
  let stats = null;
  if (which === 'head') {
    const m = window.__btHeadTrim ? window.__btHeadTrim() : null;
    stats = m ? Object.keys(m).map((k) => ({ key: k, ...m[k] })) : null;
  } else {
    stats = window.__btStandInTrim ? window.__btStandInTrim() : null;
  }
  if (!stats) return null;
  const framesOf = (k) => (which === 'head' ? window.__btHeadFrames(k) : window.__btStandInFrames(k));
  const out = { sheets: stats.length, frames: 0, mismatched: [], fullBytes: 0, packedBytes: 0, keys: stats.map((s) => s.key) };
  for (const st of stats) {
    out.fullBytes += st.fullBytes; out.packedBytes += st.packedBytes;
    const rec = framesOf(st.key);
    if (!rec || !rec.full || !rec.frames) { out.mismatched.push(st.key + ' no verify copy'); continue; }
    const { frames, full, fw, fh } = rec;
    for (let i = 0; i < frames.length; i++) {
      const a = document.createElement('canvas'); a.width = fw; a.height = fh;
      const ag = a.getContext('2d', { willReadFrequently: true }); ag.imageSmoothingEnabled = false;
      ag.drawImage(full, i * fw, 0, fw, fh, 0, 0, fw, fh);
      const f = frames[i];
      const b = document.createElement('canvas'); b.width = fw; b.height = fh;
      const bg = b.getContext('2d', { willReadFrequently: true }); bg.imageSmoothingEnabled = false;
      bg.drawImage(f.source.resource, f.frame.x, f.frame.y, f.frame.width, f.frame.height, f.trim.x, f.trim.y, f.frame.width, f.frame.height);
      const da = ag.getImageData(0, 0, fw, fh).data, db = bg.getImageData(0, 0, fw, fh).data;
      let d = 0; for (let k = 0; k < da.length; k++) if (da[k] !== db[k]) d++;
      out.frames++;
      if (d) out.mismatched.push(`${st.key}#${i} ${d} bytes`);
    }
  }
  return out;
}, which);

/* v2.3.2776: the one-shot fx strips and the trait frames (hats, hair, beards,
   glasses), cropped by gearSheets.loadCroppedStrip.  Each recorded sheet is
   decoded again from its URL, cut into the same n frames, and compared with
   the cropped frames drawn back at their trims. */
const fxIdentity = (P) => P.page.evaluate(async () => {
  const stats = window.__btFxTrim ? window.__btFxTrim() : null;
  if (!stats) return null;
  const load = (u) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = u; });
  const out = { sheets: stats.length, frames: 0, mismatched: [], fxFull: 0, fxPacked: 0, trFull: 0, trPacked: 0, fxSheets: 0, trSheets: 0 };
  for (const st of stats) {
    const isTrait = st.url.indexOf('/sprites/traits/') >= 0;
    if (isTrait) { out.trFull += st.fullBytes; out.trPacked += st.packedBytes; out.trSheets++; }
    else { out.fxFull += st.fullBytes; out.fxPacked += st.packedBytes; out.fxSheets++; }
    const rec = window.__btFxTrimFrames(st.url);
    if (!rec) { out.mismatched.push(st.url + ' no frames'); continue; }
    let img;
    try { img = await load(st.url); } catch (e) { out.mismatched.push(st.url + ' reload failed'); continue; }
    const { frames, fw, fh } = rec;
    for (let i = 0; i < frames.length; i++) {
      const a = document.createElement('canvas'); a.width = fw; a.height = fh;
      const ag = a.getContext('2d', { willReadFrequently: true }); ag.imageSmoothingEnabled = false;
      ag.drawImage(img, i * fw, 0, fw, fh, 0, 0, fw, fh);
      const f = frames[i];
      const b = document.createElement('canvas'); b.width = fw; b.height = fh;
      const bg = b.getContext('2d', { willReadFrequently: true }); bg.imageSmoothingEnabled = false;
      bg.drawImage(f.source.resource, f.frame.x, f.frame.y, f.frame.width, f.frame.height, f.trim.x, f.trim.y, f.frame.width, f.frame.height);
      const da = ag.getImageData(0, 0, fw, fh).data, db = bg.getImageData(0, 0, fw, fh).data;
      let d = 0; for (let k = 0; k < da.length; k++) if (da[k] !== db[k]) d++;
      out.frames++;
      if (d) out.mismatched.push(`${st.url.split('?')[0]}#${i} ${d} bytes`);
    }
  }
  return out;
});

const combatIdentity = (P) => P.page.evaluate(async () => {
  const stats = window.__btCombatGearTrim ? window.__btCombatGearTrim() : null;
  if (!stats) return null;
  const load = (u) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = u; });
  const out = { sheets: stats.length, frames: 0, mismatched: [], fullBytes: 0, packedBytes: 0 };
  for (const st of stats) {
    out.fullBytes += st.fullBytes; out.packedBytes += st.packedBytes;
    const frames = window.__btCombatGearFrames(st.key);
    if (!frames || !frames.length) { out.mismatched.push(st.key + ' no frames'); continue; }
    /* the PNG the loader asked for; its .webp twin is lossless by the
       optimize-sprites contract, so either decodes to the same pixels */
    let img;
    try { img = await load(st.url); }
    catch (e) { out.mismatched.push(st.key + ' reload failed'); continue; }
    const w = frames[0].orig.width, h = frames[0].orig.height;
    for (let i = 0; i < frames.length; i++) {
      const a = document.createElement('canvas'); a.width = w; a.height = h;
      const ag = a.getContext('2d', { willReadFrequently: true }); ag.imageSmoothingEnabled = false;
      ag.drawImage(img, i * w, 0, w, h, 0, 0, w, h);
      const f = frames[i];
      const b = document.createElement('canvas'); b.width = w; b.height = h;
      const bg = b.getContext('2d', { willReadFrequently: true }); bg.imageSmoothingEnabled = false;
      bg.drawImage(f.source.resource, f.frame.x, f.frame.y, f.frame.width, f.frame.height, f.trim.x, f.trim.y, f.frame.width, f.frame.height);
      const da = ag.getImageData(0, 0, w, h).data, db = bg.getImageData(0, 0, w, h).data;
      let d = 0; for (let k = 0; k < da.length; k++) if (da[k] !== db[k]) d++;
      out.frames++;
      if (d) out.mismatched.push(`${st.key}#${i} ${d} bytes`);
    }
  }
  return out;
});

/* A drawn layer's box must be the body's box, to the pixel.  Only layers drawn
   on the plain walking path are held to it -- a pose with its own per-slot
   nudge (pickup) is not reached here. */
const aligned = (L) => !L || (L.off && L.off.every((v) => Math.abs(v) < 0.5));

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(DIR, { recursive: true });
  /* v2.3.2775: __btTrimVerify makes the stand-in slicer keep each whole bake
     beside its crops, so the identity check below has something to compare
     against.  QA only -- see _sliceStandIn. */
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Plated', nameB: 'Watcher',
    init: () => { window.__btTrimVerify = true; } });

  const stats = await trimStats(A);
  rec.ok('the gear sheets are built cropped (probe present, sheets counted)',
    !!stats && stats.sheets > 0, stats);
  if (stats && stats.fullBytes) {
    const ratio = stats.packedBytes / stats.fullBytes;
    console.log(`INFO  geartrim :: cropped gear sheets ${(stats.packedBytes / 1048576).toFixed(1)} MB vs ${(stats.fullBytes / 1048576).toFixed(1)} MB uncropped (${(ratio * 100).toFixed(0)}%) over ${stats.sheets} sheets`);
    rec.ok('the cropped sheets hold under a third of the uncropped bytes', ratio < 1 / 3, stats);
  }

  /* Steel chest over COPPER greaves: two metals cannot be one fullset figure
     (entityRenderer _fullsetFrame, v2.3.1761), so every facing takes the
     layered path and there is a chest AND a legs sprite to measure.  The full
     steel set would swap in the (uncropped) knight figure on four jog facings
     and leave nothing to check there. */
  rec.ok('the test can drive the equip store', (await setGear(A, 'chest', 'steelplate')) === 'ok');
  await setGear(A, 'legs', 'coppergreaves');
  await A.page.waitForTimeout(2500);
  await H.waitMutualSight(A, B).catch(() => {});

  const t0 = await tex(A);
  if (t0) console.log(`INFO  geartrim :: resident texture total ${t0.mb} MB (${t0.sources} sources), armoured, town`);

  const cid = await combatIdentity(A);
  if (cid && cid.fullBytes) {
    console.log(`INFO  geartrim :: combat stand-in strips ${(cid.packedBytes / 1048576).toFixed(1)} MB vs ${(cid.fullBytes / 1048576).toFixed(1)} MB uncropped over ${cid.sheets} sheets, ${cid.frames} frames compared`);
  }
  rec.ok('every combat stand-in strip (3 layers x swing 3, bowshot 5, chop, cook, fire) is built cropped',
    !!cid && cid.sheets === 33, cid && { sheets: cid.sheets });
  rec.ok('...and holds under a third of its uncropped bytes',
    !!cid && cid.fullBytes > 0 && cid.packedBytes / cid.fullBytes < 1 / 3, cid && { packed: cid.packedBytes, full: cid.fullBytes });
  const sid = await standInIdentity(A);
  if (sid && sid.fullBytes) {
    console.log(`INFO  geartrim :: stand-in bodies ${(sid.packedBytes / 1048576).toFixed(1)} MB vs ${(sid.fullBytes / 1048576).toFixed(1)} MB uncropped over ${sid.sheets} bakes, ${sid.frames} frames compared`);
  }
  /* The cook and fire figures are NOT expected here: their art fills its
     frames (measured 99-101% when cropped), so packTrimmed declines them and
     they keep the plain strip.  Everything else must come back cropped. */
  rec.ok('the recoloured stand-in bodies (sword, bow, jog legs, chop, peer chop) are built cropped',
    !!sid && ['_chopSkinFrames', '_chopLeglessSkinFrames', 'chopPeer|body', 'chopPeer|legless'].every((k) => sid.keys.includes(k))
      && ['south', 'east', 'north'].every((d) => sid.keys.some((k) => k.includes('sword-' + d + '-body')))
      && ['east', 'southwest', 'south', 'northwest', 'north'].every((d) => sid.keys.some((k) => k.includes('bow-' + d + '-body')))
      && sid.keys.filter((k) => /jog-.*-legs/.test(k)).length >= 5, sid && sid.keys);
  rec.ok('...and hold well under their uncropped bytes (< 60%)',
    !!sid && sid.fullBytes > 0 && sid.packedBytes / sid.fullBytes < 0.6, sid && { packed: sid.packedBytes, full: sid.fullBytes });
  rec.ok('...and every cropped stand-in frame is byte-identical to the same frame of the whole bake',
    !!sid && sid.frames > 0 && sid.mismatched.length === 0, sid && sid.mismatched.slice(0, 8));
  const fid = await fxIdentity(A);
  if (fid) {
    console.log(`INFO  geartrim :: fx strips ${(fid.fxPacked / 1048576).toFixed(1)} MB vs ${(fid.fxFull / 1048576).toFixed(1)} MB over ${fid.fxSheets}; trait frames ${(fid.trPacked / 1048576).toFixed(1)} MB vs ${(fid.trFull / 1048576).toFixed(1)} MB over ${fid.trSheets}; ${fid.frames} frames compared`);
  }
  rec.ok('the one-shot fx strips (bursts, debris, tool gestures, stun / whirl / fire trail) are built cropped',
    !!fid && fid.fxSheets >= 10 && fid.fxPacked < fid.fxFull / 2, fid && { sheets: fid.fxSheets, packed: fid.fxPacked, full: fid.fxFull });
  rec.ok('the trait frames (hats, hair, beards, glasses) are built cropped',
    !!fid && fid.trSheets >= 50 && fid.trPacked < fid.trFull / 3, fid && { sheets: fid.trSheets, packed: fid.trPacked, full: fid.trFull });
  rec.ok('...and every cropped fx and trait frame is byte-identical to its frame in the served file',
    !!fid && fid.frames > 0 && fid.mismatched.length === 0, fid && fid.mismatched.slice(0, 8));
  /* put on a hat from the catalog (the id off a cropped trait URL) and read the
     sprite the renderer actually drew it with */
  const hatId = await A.page.evaluate(() => {
    const u = (window.__btFxTrim() || []).map((r) => r.url).find((x) => x.indexOf('/sprites/traits/headwear/') >= 0);
    const id = u ? u.split('/sprites/traits/headwear/')[1].split('/')[0] : null;
    if (id && window.__btSetHeadwear) window.__btSetHeadwear(id);
    return id;
  });
  await A.page.waitForTimeout(1500);
  const hat = await A.page.evaluate(() => {
    const pd = window._pixiRenderer.playerDisplayRaw && window._pixiRenderer.playerDisplayRaw();
    const h = pd && pd._headwearSprite;
    const t = h && h.texture;
    return h ? { visible: !!h.visible, cropped: !!(t && t.trim), origW: t && t.orig ? t.orig.width : null, frameW: t && t.frame ? t.frame.width : null } : null;
  });
  rec.ok(`a worn hat (${hatId}) is drawn from a cropped trait frame`,
    !!hatId && !!hat && hat.visible && hat.cropped && hat.frameW < hat.origW, { hatId, hat });
  rec.ok('...and every cropped combat frame is byte-identical to its frame in the served sheet',
    !!cid && cid.frames > 0 && cid.mismatched.length === 0, cid && [...new Set(cid.mismatched.map((m) => m.split("#")[0]))]);

  const pics = [];
  for (const [key, name] of [['s', 'south'], ['d', 'east'], ['w', 'north'], ['a', 'west']]) {
    await A.page.keyboard.down(key);
    await A.page.waitForTimeout(450);
    const mine = (await displays(A)) || [];
    const theirs = (await displays(B)) || [];
    const box = await H.figureBox(A, { pad: 14 }).catch(() => null);
    if (box) await A.page.screenshot({ path: `${DIR}/jog-${name}-own.png`, clip: box }).catch(() => {});
    const pbox = await H.figureBox(B, { pad: 14, peerId: await A.page.evaluate(() => window._gameState.current.myId) }).catch(() => null);
    if (pbox) await B.page.screenshot({ path: `${DIR}/jog-${name}-peer.png`, clip: pbox }).catch(() => {});
    await A.page.keyboard.up(key);

    const me = mine.find((d) => d.own);
    const armour = me ? [me.chest, me.legs].filter(Boolean) : [];
    rec.ok(`jog ${name}: the wearer's armour is drawn, from cropped frames`,
      armour.length > 0 && armour.every((L) => L.cropped && L.frameW < L.origW), me);
    rec.ok(`jog ${name}: every armour layer's box is exactly the body's box (own screen)`,
      !!me && me.body && [me.chest, me.legs, me.shirt].every(aligned), me);

    /* the peer: any display on B's screen that is not B's own, wearing plate */
    const peer = theirs.find((d) => !d.own && (d.chest || d.legs));
    rec.ok(`jog ${name}: the peer sees the armour, from cropped frames`,
      !!peer && [peer.chest, peer.legs].filter(Boolean).every((L) => L.cropped), { peer, count: theirs.length });
    rec.ok(`jog ${name}: every armour layer's box is exactly the body's box (peer screen)`,
      !!peer && peer.body && [peer.chest, peer.legs, peer.shirt].every(aligned), peer);
    pics.push(name);
  }

  /* ── v2.3.2775: the HEAD overlay, cropped ──
     The full steel set jogs as the fullset knight figure, which draws the
     player's head from the head sheets (playerSkins) -- now cropped to the
     head.  The overlay must still land exactly on the body's box. */
  await setGear(A, 'legs', 'steelgreaves');
  await A.page.waitForTimeout(1500);
  for (const [key, name] of [['s', 'south'], ['d', 'east'], ['w', 'north']]) {
    await A.page.keyboard.down(key);
    await A.page.waitForTimeout(450);
    const me = ((await displays(A)) || []).find((d) => d.own);
    const hbox = await H.figureBox(A, { pad: 14 }).catch(() => null);
    if (hbox) await A.page.screenshot({ path: `${DIR}/fullset-${name}-own.png`, clip: hbox }).catch(() => {});
    await A.page.keyboard.up(key);
    rec.ok(`full set, jog ${name}: the head overlay is drawn from a cropped head frame`,
      !!me && !!me.head && me.head.cropped && me.head.frameW < me.head.origW, me && me.head);
    rec.ok(`full set, jog ${name}: the head overlay's box is exactly the body's box`,
      !!me && me.body && aligned(me.head), me && me.head);
  }
  const hid = await standInIdentity(A, 'head');
  if (hid && hid.fullBytes) {
    console.log(`INFO  geartrim :: head sheets ${(hid.packedBytes / 1048576).toFixed(2)} MB vs ${(hid.fullBytes / 1048576).toFixed(2)} MB uncropped over ${hid.sheets} sheets, ${hid.frames} frames compared`);
  }
  rec.ok('the head sheets are built cropped, and every cropped head frame is byte-identical to the whole bake',
    !!hid && hid.sheets > 0 && hid.frames > 0 && hid.mismatched.length === 0 && hid.packedBytes < hid.fullBytes / 3,
    hid && { sheets: hid.sheets, frames: hid.frames, mism: hid.mismatched.slice(0, 5), packed: hid.packedBytes, full: hid.fullBytes });
  await setGear(A, 'legs', 'coppergreaves');
  await A.page.waitForTimeout(800);

  /* standing still, after the last jog */
  await A.page.waitForTimeout(700);
  const still = ((await displays(A)) || []).find((d) => d.own);
  rec.ok('standing: every armour layer\'s box is exactly the body\'s box',
    !!still && still.body && [still.chest, still.legs, still.shirt].every(aligned), still);

  const errs = H.takeRenderThrows ? H.takeRenderThrows() : [];
  rec.ok('no render throws across equip + four jogs', errs.length === 0, errs.slice(0, 5));
  console.log(`INFO  geartrim :: pictures in ${DIR} (${pics.join(', ')})`);

  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
