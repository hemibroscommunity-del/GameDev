/* "SOUTH JOG THE SHIRT IS SLIVERING SKIN THROUGH IT" (owner, v2.3.1873).
 *
 * Reported against a screen recording this sandbox cannot decode (iPhone
 * captures are HEVC and there is no decoder here), so the report is
 * reproduced instead of watched.
 *
 * The question this has to answer FIRST is whose bug it is.  v2.3.1872 gave
 * the south block a two-band body — standing frame above the waist, jog frame
 * below — and a seam is exactly the kind of thing that leaks skin between a
 * shirt hem and a waistband.  But the owner said "south jog", not "south
 * block", and the plain jog is a different code path that v2.3.1872 never
 * touches.  So both are captured, side by side, at a zoom where a one-pixel
 * sliver is visible:
 *   - south jog, shield DOWN  -> the untouched path (the control)
 *   - south jog, shield UP    -> the composite
 * If only the second shows it, it is mine.  If both do, it predates this
 * work and the composite merely made it easier to notice.
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Shirt', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  /* A shirt, and a shield to raise later.  The shirt is the layer under
     suspicion; without one there is nothing for skin to sliver through. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.shield = { name: 'Pine Shield', type: 'shield' };
    S.rpg.weapon = S.rpg.weapon || { type: 'greatsword', name: 'Copper Greatsword', gearBase: 'copper', dmg: 5 };
    window.__pin = { on: false };
    const tick = () => {
      const S2 = window._gameState.current;
      if (S2 && window.__pin.on) {
        S2._shieldUp = true;
        S2._shieldKb = false;
        /* south */
        S2._mouseAimAngle = Math.PI / 2;
        S2._facingAngle = Math.PI / 2;
        S2._aimAngle = Math.PI / 2;
        S2._shieldAngle = Math.PI / 2;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await P.page.waitForTimeout(400);

  const shirtOn = await P.page.evaluate(() => {
    /* v2.3.2078: was `window.__btShirtId`, which nothing defines — so this
       line printed {shirt:null,equipShirt:null} on every run and told you
       nothing about what the character had on.  __btWardrobe (gearCatalog)
       is the real probe. */
    try {
      const w = window.__btWardrobe ? window.__btWardrobe() : null;
      const S = window._gameState && window._gameState.current;
      return { shirt: (S && S.myShirt) || null, equipShirt: w && w.gearShirt };
    } catch (e) { return null; }
  });
  console.log('  shirt state', JSON.stringify(shirtOn));

  const crop = async (tag) => {
    const cv = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const r = document.querySelector('canvas').getBoundingClientRect();
      return { x: r.left + (S.player.x - S.camera.x) * (S._worldScaleX || 1),
               y: r.top + (S.player.y - S.camera.y) * (S._worldScaleY || 1) };
    });
    await P.page.screenshot({ path: `tools/qa/mp/out/ss-${tag}.png`,
      clip: { x: Math.max(0, Math.round(cv.x - 55)), y: Math.max(0, Math.round(cv.y - 95)),
              width: 110, height: 120 } });
  };

  /* ── CONTROL: plain south jog, shield down ── */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S._shieldUp = false;
    S._facingAngle = Math.PI / 2; S._aimAngle = Math.PI / 2;
  });
  await P.page.keyboard.down('s');
  await P.page.waitForTimeout(700);
  for (let i = 0; i < 5; i++) { await P.page.waitForTimeout(150); await crop('plain-' + i); }
  await P.page.keyboard.up('s');
  await P.page.waitForTimeout(400);

  /* ── THE COMPOSITE: south jog with the shield up ── */
  await P.page.evaluate(() => { window.__pin.on = true; });
  await P.page.waitForTimeout(500);
  await P.page.keyboard.down('s');
  await P.page.waitForTimeout(700);
  const sb = [];
  for (let i = 0; i < 5; i++) {
    await P.page.waitForTimeout(150);
    await crop('block-' + i);
    const b = await P.page.evaluate(() => window.__btSouthBlockBody || null);
    if (b) sb.push(b);
  }
  await P.page.keyboard.up('s');

  rec.ok('the south block composite was actually running for the block shots (guard)',
    sb.some((b) => b && b.on), sb[0] || null);

  /* ── THE ART IS SEALED (v2.3.1873, re-measured v2.3.1995) ──
     The screenshots above are how this was FOUND; this is how it stays fixed.
     The defect was the tee being a pixel or two narrower than the body beneath
     it, so the count that matters is thin runs of visible body along the
     shirt's edge — the same measure tools/gear/seal-shirt-edges.mjs fills, run
     here in read-only form.

     v2.3.1995: THE RUN IS MEASURED ON THE WHOLE FRAME.  This counted runs
     inside the shirt's bounding box, which is the exact flaw that made the
     tool paint the owner's three "too large black outline" spots: a garment
     OPENING (the neck hole, the hem where the belly starts, the shoulder line,
     the cut-out crossing arm) is body that runs OUT of that box, so clipping
     the scan at the box turns a long run into a 1-2px one and calls the tee's
     own design a sliver.  The tool now measures each run across the frame and
     so does this, or the gate would fail art that is more correct than what it
     was written against — jog-east reads 10.64/frame truncated and 0.21
     honestly, and the difference is entirely the arm the artist cut out.

     BASELINES on this measure: the artist's pre-seal art 6-14 px/frame on the
     stand sheets and 19-32 on the jog sheets, every one of the 26 jog-south
     frames affected; v2.3.1873's sealed art 0 on stand and 1.4-4.2 on jog; the
     v2.3.1995 art 0 on stand and 0.04-0.65 on jog — better sealed than
     v2.3.1873 despite writing 41% fewer pixels, because filling an opening's
     edge manufactures a fresh 1px run on the far side of what it just wrote.
     A threshold of 5 sits above every shipped number and below every unsealed
     one, so unsealed art being dropped back in fails on any sheet. */
  const SHEETS = [];
  for (const pose of ['stand', 'jog']) {
    for (const dir of ['south', 'southwest', 'east', 'northeast', 'north']) SHEETS.push({ pose, dir });
  }
  const fs = await import('node:fs');
  const path = await import('node:path');
  const repo = path.resolve(H.REPO);
  const readAsUrl = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
  for (const { pose, dir } of SHEETS) {
    const shirtF = `${repo}/public/sprites/gear/shirt/tshirt/${pose}-${dir}.png`;
    const bodyF = `${repo}/public/sprites/player/${pose}-${dir}.png`;
    if (!fs.existsSync(shirtF) || !fs.existsSync(bodyF)) continue;
    const n = await P.page.evaluate(async (o) => {
      const load = async (src) => {
        const i = new Image();
        await new Promise((r, j) => { i.onload = r; i.onerror = j; i.src = src; });
        const c = document.createElement('canvas');
        c.width = i.width; c.height = i.height;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(i, 0, 0);
        return { c, g };
      };
      const S = await load(o.shirt);
      let B = await load(o.body);
      if (S.c.width !== B.c.width) {              /* stand sheets are half-res */
        const c2 = document.createElement('canvas');
        c2.width = S.c.width; c2.height = S.c.height;
        const g2 = c2.getContext('2d', { willReadFrequently: true });
        g2.imageSmoothingEnabled = false;
        g2.drawImage(B.c, 0, 0, c2.width, c2.height);
        B = { c: c2, g: g2 };
      }
      const W = S.c.width, Hh = S.c.height, fw = Hh;
      const sd = S.g.getImageData(0, 0, W, Hh).data;
      const bd = B.g.getImageData(0, 0, W, Hh).data;
      const isShirt = (x, y) => sd[(y * W + x) * 4 + 3] > 40;
      const isBody = (x, y) => bd[(y * W + x) * 4 + 3] > 60;
      const nF = Math.round(W / fw);
      let thin = 0;
      for (let f = 0; f < nF; f++) {
        const x0 = f * fw, x1 = x0 + fw;
        let bx0 = x1, bx1 = x0 - 1, by0 = Hh, by1 = -1;
        for (let y = 0; y < Hh; y++) for (let x = x0; x < x1; x++) {
          if (isShirt(x, y)) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
        }
        if (bx1 < bx0) continue;
        /* v2.3.1995: runs span the whole frame; only pixels inside the shirt's
           own box are COUNTED, the same split the tool uses between measuring
           and writing. */
        for (let y = 0; y < Hh; y++) {
          let cur = null;
          for (let x = x0; x <= x1; x++) {
            const vis = x < x1 && isBody(x, y) && !isShirt(x, y);
            if (vis) { if (!cur) cur = { a: x, len: 0, px: [] }; cur.len++; cur.px.push(x); }
            else if (cur) {
              const ls = cur.a - 1 >= x0 && isShirt(cur.a - 1, y);
              const rs = x < x1 && isShirt(x, y);
              if (cur.len <= 2 && (ls || rs)) {
                for (const px of cur.px) if (px >= bx0 && px <= bx1 && y >= by0 && y <= by1) thin++;
              }
              cur = null;
            }
          }
        }
      }
      return { thin, nF, perFrame: +(thin / Math.max(1, nF)).toFixed(2) };
    }, { shirt: readAsUrl(shirtF), body: readAsUrl(bodyF) });
    rec.ok(`shirt ${pose}-${dir}: no skin slivers along the tee's edge (${n.perFrame}/frame)`,
      n.perFrame < 5, n);
  }
  console.log('  composite', JSON.stringify(sb.filter((b) => b && b.on).map((b) => ({ f: b.jogFrame, cut: b.cut }))));
  await P.ctx.close().catch(() => {});
}
