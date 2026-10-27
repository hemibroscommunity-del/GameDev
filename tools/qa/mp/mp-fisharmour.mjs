/* ═══ v2.3.3623: AN ARMOURED ANGLER'S HANDS ═══
 *
 * The owner's list of 2026-10-26: "The fishing animation gets messed up around
 * the hands when the character is wearing torso armor".
 *
 * The fish pose draws the body (the masked bake), the gear over it, then a TOP
 * overlay (entityRenderer _fishTopFrame): the head band, the rod, and the
 * GRIP -- every body pixel within GRIP_R of the rod -- so the hand holding the
 * rod rides over a tee (v2.3.1914) or greaves (v2.3.2278).  A torso plate draws
 * its own arms and hands: the steel gauntlet on the rod, the forearm crossing to
 * the reel.  The grip laid the bare arm and hand back over them, a strip of
 * skin a hand wide along the rod: bare knuckles over the gauntlet, skin over
 * the forearm guard, cut square where the strip ends.
 *
 * Measured on the real figure, in held frames of the cast: the player's display
 * drawn with the overlay and without it (extract, the same frame and state),
 * the bro's skin purple so nothing else reads as skin -- the bare SKIN the
 * overlay lays over what is under it, below the head band (whose chin rides
 * over the plate's collar on purpose, v2.3.1123):
 *   a. a copper plate alone: none below the head but a blend at an edge
 *      (it was 77-120 px a frame),
 *   b. an iron plate and iron greaves: the same (it was 76-182),
 *   c. a black steel plate and copper greaves: the same (it was 75-132),
 * -- what the plate leaves bare (a finger past its gauntlet, the reel hand, the
 * forearm reaching down to it) drawn as a gauntlet in the plate's metal
 * instead -- and what must still hold:
 *   d. the tee alone: the hand on the rod still rides over the tee (v2.3.1914),
 *   e. greaves alone: the reel hand still rides over the greaves (v2.3.2278),
 *   and in every outfit the rod is still lifted over the gear.
 *
 * v2.3.3642, THE GRIP LIFTS THE HAND, NOT THE TROUSERS: the owner's "check all
 * the animations for ghost remnants" -- mp-ghostaudit's angler in pink
 * trousers under iron greaves had a pink patch on the thigh by the reel hand,
 * up to 54 px: the grip lifted the trousers over the greaves with the hand.
 * The bro wears pink trousers here, and in every outfit with greaves (b, c, e)
 * the overlay lays none of their colour over the gear -- where the same frame
 * with the grip as before (`__btFishGripTrousers(true)`) lays it, so the test
 * sees the patch it guards against.
 *
 *   BT_FISHARM_DUMP=1  writes each outfit's worst frame with the overlay,
 *   without it, and with the skin it lays in red (out/fisharmour-<key>.png, 4x).
 *
 *   node tools/qa/mp/run.mjs fisharmour
 */
import fs from 'node:fs';
import path from 'node:path';
import * as H from './harness.mjs';

const DUMP = !!process.env.BT_FISHARM_DUMP;
/* the picture is drawn scaled, so a pixel where the gauntlet meets the skin
   left in the body layer is a blend of the two: a few a frame, at an edge
   (before this version, 77-182 a frame, the bare arm over the plate) */
const EDGE_BLEND = 4;

const OUTFITS = [
  { key: 'a', label: 'a copper plate alone', shirt: 'none', chest: 'copperplate', legs: 'none', plate: true },
  { key: 'b', label: 'an iron plate and iron greaves', shirt: 'none', chest: 'ironplate', legs: 'irongreaves', plate: true },
  { key: 'c', label: 'a black steel plate and copper greaves', shirt: 'none', chest: 'blacksteelplate', legs: 'coppergreaves', plate: true },
  { key: 'd', label: 'the tee alone', shirt: 'tshirt', chest: 'none', legs: 'none', plate: false },
  { key: 'e', label: 'greaves alone', shirt: 'none', chest: 'none', legs: 'irongreaves', plate: false },
];

/* one held frame: the figure drawn with the top overlay and without it */
const measure = (P, dump) => P.page.evaluate((dump) => {
  const d = window._pixiRenderer && window._pixiRenderer.playerDisplayRaw();
  const R = window._pixiRenderer && window._pixiRenderer.app && window._pixiRenderer.app.renderer;
  if (!d || !R) return { why: 'no display' };
  if (d._animPose !== 'fish') return { why: 'not fishing', pose: d._animPose };
  const hd = d._bodyHead;
  if (!hd || !hd.visible) return { why: 'no overlay' };
  const ui = d._uiLayer;
  const uiV = ui ? ui.visible : null;
  if (ui) ui.visible = false;
  try {
    const lb = d.getLocalBounds().rectangle;
    const grab = () => R.extract.pixels({ target: d, frame: lb, resolution: 1 });
    const on = grab();
    hd.visible = false;
    const off = grab();
    hd.visible = true;
    /* the bro's skin is purple (120, 72, 180) for this test: nothing else he
       wears or holds is (copper, steel, pine, olive, the boots' grey) */
    const skin = (p, i) => p[i + 3] > 100 && p[i + 2] > p[i] + 15 && p[i] > p[i + 1] + 15 && p[i + 2] > 50;
    /* v2.3.3642: the trousers are pink (214, 112, 168): redder than blue, unlike the skin */
    const pink = (p, i) => p[i + 3] > 100 && p[i] > 110 && p[i + 2] > 70 && p[i] > p[i + 2] && p[i + 1] < p[i] * 0.72 && p[i + 2] > p[i + 1] * 1.15;
    const A = on.pixels, B = off.pixels;
    /* which of the overlay's rows each picture row is: the head band (its top
       35%, v2.3.1123: the head lifted over the plate's collar) is not the
       hands, so it is counted apart */
    const tex = hd.texture, TH = (tex.orig && tex.orig.height) || (tex.frame && tex.frame.height) || 128;
    const headBot = Math.round(TH * 0.35);
    const rowOf = (ix, iy) => {
      const g = d.toGlobal({ x: lb.x + ix + 0.5, y: lb.y + iy + 0.5 });
      const l = hd.toLocal(g);
      return l.y + TH * hd.anchor.y;
    };
    let laid = 0, lifted = 0, laidHead = 0, pinkLaid = 0;
    const laidAt = new Uint8Array(A.length / 4), rows = [];
    for (let i = 0; i < A.length; i += 4) {
      if (A[i + 3] < 20) continue;
      const same = Math.abs(A[i] - B[i]) <= 24 && Math.abs(A[i + 1] - B[i + 1]) <= 24 && Math.abs(A[i + 2] - B[i + 2]) <= 24 && Math.abs(A[i + 3] - B[i + 3]) <= 24;
      if (same) continue;
      lifted++;   /* the overlay changed this pixel: the rod, or the grip */
      if (pink(A, i) && !pink(B, i)) pinkLaid++;   /* v2.3.3642: the trousers laid over the gear */
      if (skin(A, i) && !skin(B, i)) {   /* bare skin laid over the gear */
        const q = i >> 2, ix = q % on.width, iy = (q - ix) / on.width;
        if (rowOf(ix, iy) <= headBot + 1.5) { laidHead++; continue; }   /* a row's give: the head band's last row lands on either side */
        laid++; laidAt[q] = 1; rows.push(iy);
      }
    }
    let png = null;
    if (dump) {
      const k = 4, W = on.width, Hh = on.height;
      const cv = document.createElement('canvas'); cv.width = W * 3 * k + 2 * k; cv.height = Hh * k;
      const cx = cv.getContext('2d');
      cx.fillStyle = '#3a6b45'; cx.fillRect(0, 0, cv.width, cv.height);
      /* the third picture: the overlay's picture with the skin it lays in red */
      const mark = new Uint8ClampedArray(on.pixels);
      for (let q = 0; q < laidAt.length; q++) if (laidAt[q]) { mark[q * 4] = 255; mark[q * 4 + 1] = 0; mark[q * 4 + 2] = 0; mark[q * 4 + 3] = 255; }
      [on, off, { pixels: mark }].forEach((img, j) => {
        const t = document.createElement('canvas'); t.width = W; t.height = Hh;
        t.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(img.pixels), W, Hh), 0, 0);
        cx.imageSmoothingEnabled = false;
        cx.drawImage(t, j * (W * k + k), 0, W * k, Hh * k);
      });
      png = cv.toDataURL('image/png');
    }
    const top = window.__btFishTop || null;
    return { frame: d._animFrame, laid, laidHead, lifted, pinkLaid, top, w: on.width, h: on.height, rows: rows.length ? [Math.min(...rows), Math.max(...rows)] : null, png };
  } catch (e) {
    return { why: 'extract: ' + String(e).slice(0, 120) };
  } finally {
    if (ui) ui.visible = uiV;
  }
}, dump);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Angler', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, world: 'wheel',
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  const ready = await P.page.evaluate(() => {
    if (window.__btSetSkin) window.__btSetSkin('purple');
    if (window.__btSetPants) window.__btSetPants('pink');   /* v2.3.3642 */
    return { gear: !!window.__btGearSet, skin: !!window.__btSetSkin, pants: !!window.__btSetPants, flip: !!window.__btFishGripTrousers };
  });
  rec.ok('setup: the gear store and the skin and trouser setters are there; the bro\'s skin is purple, his trousers pink (guard)', ready.gear && ready.skin && ready.pants && ready.flip, ready);

  /* Hold the pose rather than walk to water: what is under test is the
     layering of the frames, not the route to them (mp-fishhand's fixture). */
  await P.page.evaluate(() => {
    window.__fishPin = () => {
      const s = window._gameState.current;
      if (!s) return;
      const now = Date.now();
      s._extraction = { nodeId: 'qa', nodeRef: { id: 'qa', x: s.player.x + 20, y: s.player.y,
        gatherLvl: 1, alive: true, nodeType: 'water' },
        skill: 'fishing', startedAt: now, windowOpensAt: now + 4000,
        windowClosesAt: now + 6000, status: 'waiting', swipeSamples: [] };
      requestAnimationFrame(window.__fishPin);
    };
    window.__fishPin();
  });

  const results = {};
  for (const o of OUTFITS) {
    await P.page.evaluate((o) => {
      window.__btFishTop = null;
      window.__btGearSet('shirt', o.shirt);
      window.__btGearSet('chest', o.chest);
      window.__btGearSet('legs', o.legs);
    }, o);
    await P.page.waitForTimeout(2200);   /* the masked bakes for the new outfit */
    const got = [];
    let why = null;
    let worst = null;   /* the dump keeps the frame with the most skin laid */
    for (let i = 0; i < 60 && got.length < 8; i++) {
      const m = await measure(P, DUMP);
      if (m && m.laid != null) {
        if (m.png && (!worst || m.laid > worst.laid)) worst = { laid: m.laid, png: m.png, frame: m.frame };
        delete m.png;
        if (!got.some((g) => g.frame === m.frame)) got.push(m);
      } else why = m;
      await P.page.waitForTimeout(150);
    }
    if (worst) {
      const out = path.join(path.dirname(new URL(import.meta.url).pathname), 'out', `fisharmour-${o.key}.png`);
      try { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, Buffer.from(worst.png.split(',')[1], 'base64')); console.log(`    wrote ${out} (frame ${worst.frame}, ${worst.laid} px laid)`); } catch (e) { console.log('    dump failed: ' + e); }
    }
    const laid = got.map((g) => g.laid), lifted = got.map((g) => g.lifted);
    /* v2.3.3642: the trousers under greaves, and the same frames with the grip as before */
    if (o.legs !== 'none') {
      const pinks = got.map((g) => g.pinkLaid);
      await P.page.evaluate(() => window.__btFishGripTrousers(true));
      const before = [];
      for (let i = 0; i < 60 && before.length < got.length; i++) {
        const m = await measure(P, false);
        if (m && m.pinkLaid != null && got.some((g) => g.frame === m.frame) && !before.some((b) => b.frame === m.frame)) before.push(m);
        await P.page.waitForTimeout(150);
      }
      await P.page.evaluate(() => window.__btFishGripTrousers(false));
      const was = before.map((b) => b.pinkLaid);
      console.log(`    ${o.label}: trousers laid over the gear ${JSON.stringify(pinks)}, with the grip as before ${JSON.stringify(was)} (frames ${JSON.stringify(before.map((b) => b.frame))})`);
      rec.ok(`${o.key}. ${o.label}: the grip lays none of the trousers over the greaves (${Math.max(0, ...pinks)} px at most over ${got.length} frames; with the grip as before ${Math.max(0, ...was)})`,
        got.length >= 3 && Math.max(0, ...pinks) <= EDGE_BLEND, { pinks, was });
      results[o.key + 'was'] = was;
    }
    const top = got.length ? got[got.length - 1].top : null;
    console.log(`    ${o.label}: frames ${JSON.stringify(got.map((g) => g.frame))}, skin laid over the gear ${JSON.stringify(laid)} (in the head band ${JSON.stringify(got.map((g) => g.laidHead))}), `
      + `pixels the overlay changes ${JSON.stringify(lifted)}, overlay ${JSON.stringify(top)}${got.length ? '' : ', last: ' + JSON.stringify(why)}`);
    results[o.key] = { got, laid, lifted, top };
    const maxLaid = laid.length ? Math.max(...laid) : -1;
    if (o.plate) {
      rec.ok(`${o.key}. ${o.label}: below the head the overlay lays no bare skin over the plate's gauntlet or forearm (${maxLaid} px at most over ${got.length} frames, a blend at an edge; it was 77-182)`,
        got.length >= 3 && maxLaid <= EDGE_BLEND, { laid, frames: got.map((g) => g.frame) });
      rec.ok(`${o.key}. ...and the rod is still lifted over the plate (${top ? top.rod : '?'} px of rod, ${top ? top.grip : '?'} of grip)`,
        !!top && top.rod > 0 && got.every((g) => g.lifted > 0), top);
      const gaunt = got.map((g) => (g.top ? g.top.gauntlet : 0));
      rec.ok(`${o.key}. ...and the hand the plate leaves bare is drawn as a gauntlet in its metal (${Math.max(0, ...gaunt)} px at most)`,
        gaunt.some((n) => n > 0) && got.every((g) => g.top && g.top.plate), gaunt);
    } else {
      const total = laid.reduce((x, y) => x + y, 0);
      rec.ok(`${o.key}. ${o.label}: the hand on the rod still rides over the ${o.shirt !== 'none' ? 'tee' : 'greaves'} (${total} px of skin over ${got.length} frames; grip ${top ? top.grip : '?'})`,
        got.length >= 3 && !!top && top.rod > 0 && top.grip > 0 && total > 0, { laid, top });
    }
  }
  /* the test sees the patch it guards against: the grip as before lays the
     trousers over the greaves on some frame (the audit's 54 px) */
  const wasAll = ['b', 'c', 'e'].flatMap((k) => results[k + 'was'] || []);
  rec.ok(`with the grip as before, the trousers lie over the greaves on some frame (${Math.max(0, ...wasAll)} px at most)`, Math.max(0, ...wasAll) >= 10, wasAll);
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await P.ctx.close();
}
