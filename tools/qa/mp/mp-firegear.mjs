/* The fire-lighter wears their clothes ON their body (v2.3.1723).
 *
 * Owner, shown the composited firemaking figure: it does not look right.  The
 * shirt and the armour sat low and to the LEFT of the torso, and on the three
 * tending frames they sat inside the flames — the owner's four supplied sheets
 * were generated independently and are not registered to each other, which
 * v2.3.1715 shipped knowingly and FIRE_GEAR_REG (effectsRenderer.js) corrects.
 *
 * TWO ASSERTIONS, because they fail for different reasons:
 *
 *   WIRING — each layer is offset from the body by ITS OWN row of the table,
 *   scaled by the sprite's scale.  Passing the wrong slot (chest's row to the
 *   shirt) or forgetting the scale both produce a plausible-looking figure that
 *   is wrong on every frame, and neither is visible in a still.
 *
 *   PIXELS — the table moves each garment ONTO the body part it covers, scored
 *   from the art itself rather than from the table, so it still fails if the
 *   numbers are wrong.  See the long note at that assertion for why it reads
 *   the sheets and not the screen; the screen version was written first, and it
 *   failed the very fix it was meant to prove.
 *
 * The likely future regression is precise and worth naming: corrected art
 * arrives, build_fire_8f.mjs is re-run, and FIRE_GEAR_REG is left in place —
 * nudging already-registered sheets back OFF the body.  The pixel assertion is
 * what catches that (the score would FALL when the table is applied); the
 * wiring assertion would happily pass.
 */
import * as H from './harness.mjs';

/* The table under test, mirrored here on purpose: a copy that has to be updated
   in two places is the point.  If someone edits FIRE_GEAR_REG without a reason
   they can state, this fails and asks them to say it twice.
   Frame 7 is hand-tuned rather than fitted (v2.3.1725) — its reasoning is in
   the FIRE_GEAR_REG header, and the coverage floors below already absorb it. */
const REG = {
  shirt: { scale: 0.85, off: [[48, -89], [8, -50], [20, -47], [55, -64], [67, -50], [56, -52], [57, -56], [46, -103]] },
  chest: { scale: 0.90, off: [[39, -79], [18, 27], [42, 13], [35, 23], [84, 11], [75, 10], [59, 9], [42, -69]] },
  legs: { scale: 0.90, off: [[28, -7], [23, 8], [89, 48], [57, 7], [73, 15], [72, 15], [64, 17], [41, 15]] },
};
const FRAME_MS = 200;

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Sparky', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1200);

  /* Full kit, so all three layers draw at once — the plate hides the shirt by
     design (_placeSwingShirt), so the shirt is measured in a second pass. */
  const gear = (chest, legs) => P.page.evaluate(({ c, l }) => {
    window._gameFns.setEquip('chest', c); window._gameFns.setEquip('legs', l);
  }, { c: chest, l: legs });

  /* Hold the animation on one frame.  _updateFiremaking derives the frame from
     (now - startedAt), so backdating startedAt by a whole number of frames and
     then reading on the next tick pins it; doneAt is pushed far out so the
     figure does not pack up mid-measurement. */
  const holdFrame = async (f) => {
    await P.page.evaluate(({ f, ms }) => {
      const S = window._gameState.current;
      S._firemaking = { startedAt: Date.now() - (f * ms + 40), doneAt: Date.now() + 120000 };
    }, { f, ms: FRAME_MS });
    await P.page.waitForTimeout(90);
  };
  const probe = () => P.page.evaluate(() => window._pixiRenderer.fireGearProbe());

  /* ── the animation is alive at all ── */
  await gear('steelplate', 'steelgreaves');
  await holdFrame(0);
  const p0 = await probe();
  rec.ok('the firemaking strip loaded its 8 frames', p0.frames === 8, p0.frames);
  rec.ok('the body, plate and greaves all draw',
    !!(p0.body && p0.body.visible && p0.chest && p0.chest.visible && p0.legs && p0.legs.visible),
    JSON.stringify({ body: !!p0.body?.visible, chest: !!p0.chest?.visible, legs: !!p0.legs?.visible }));

  /* ── WIRING: every layer, every frame, its own row, scaled ── */
  const bad = [];
  for (let f = 0; f < 8; f++) {
    await holdFrame(f);
    const pr = await probe();
    if (!pr.body) { bad.push(`f${f}: no body sprite`); continue; }
    for (const slot of ['chest', 'legs']) {
      const sp = pr[slot];
      if (!sp || !sp.visible) { bad.push(`f${f} ${slot}: not drawn`); continue; }
      const want = REG[slot].off[f];
      const dx = sp.x - pr.body.x, dy = sp.y - pr.body.y;
      /* 0.6px of slack: the probe rounds to one decimal and the scale is
         irrational (154/512), so an exact compare would be flaky. */
      if (Math.abs(dx - want[0] * pr.body.scale) > 0.6 || Math.abs(dy - want[1] * pr.body.scale) > 0.6) {
        bad.push(`f${f} ${slot}: off by (${dx.toFixed(1)},${dy.toFixed(1)}), want (${(want[0] * pr.body.scale).toFixed(1)},${(want[1] * pr.body.scale).toFixed(1)})`);
      }
      /* v2.3.1724: and its own SIZE.  The offsets were re-fitted at these
         scales, so a layer drawn at the wrong one is misplaced as well as
         mis-sized — and a stray scale is invisible in a single still. */
      if (Math.abs(sp.scale - pr.body.scale * REG[slot].scale) > 0.002) {
        bad.push(`f${f} ${slot}: scale ${sp.scale}, want ${(pr.body.scale * REG[slot].scale).toFixed(4)}`);
      }
    }
  }
  rec.ok('each armour layer is nudged by its own row of the registration table, scaled',
    bad.length === 0, bad.slice(0, 4).join(' | '));

  /* Same again for the shirt, which only draws with the chest slot empty. */
  await gear('none', 'none');
  const badShirt = [];
  for (let f = 0; f < 8; f++) {
    await holdFrame(f);
    const pr = await probe();
    if (!pr.body || !pr.shirt || !pr.shirt.visible) { badShirt.push(`f${f}: shirt not drawn`); continue; }
    const want = REG.shirt.off[f];
    const dx = pr.shirt.x - pr.body.x, dy = pr.shirt.y - pr.body.y;
    if (Math.abs(dx - want[0] * pr.body.scale) > 0.6 || Math.abs(dy - want[1] * pr.body.scale) > 0.6) {
      badShirt.push(`f${f}: off by (${dx.toFixed(1)},${dy.toFixed(1)})`);
    }
    if (Math.abs(pr.shirt.scale - pr.body.scale * REG.shirt.scale) > 0.002) {
      badShirt.push(`f${f}: scale ${pr.shirt.scale}, want ${(pr.body.scale * REG.shirt.scale).toFixed(4)}`);
    }
  }
  rec.ok('the shirt is nudged by the SHIRT row, not another slot\'s',
    badShirt.length === 0, badShirt.slice(0, 4).join(' | '));

  /* ── PIXELS: the garment actually covers the body ──
     The first attempt at this measured the SCREEN — classify skin and steel in
     a crop around the player, compare their horizontal centroids.  It does not
     work and it failed the fix it was written to prove: dumped as a mask image,
     the "skin" ratio window lights up the entire yellow cobblestone ground and
     "steel" lights up the grey stone stairs behind the spawn.  Against a live
     painted world, colour alone cannot find the character.

     So measure in ART space, where there is no background: fetch the four
     sheets, mask them, and score how much of each gear frame lands on the body
     part it is supposed to cover — skin for the shirt and the plate, trousers
     and boots for the greaves.  Deliberately computed BOTH with and without the
     registration table, because the interesting assertion is not an absolute
     number, it is that the table MOVES THE GARMENT ONTO THE BODY.  That is what
     stays honest if corrected art ever lands: the same score then falls when the
     table is applied, and this fails. */
  const cover = await P.page.evaluate(async (REG) => {
    const FW = 384, FH = 512, N = 8;
    const load = (src) => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = () => j(new Error(src)); i.src = src; });
    const cells = async (src) => {
      const im = await load(src);
      const cv = document.createElement('canvas');
      cv.width = im.naturalWidth; cv.height = im.naturalHeight;
      const c = cv.getContext('2d', { willReadFrequently: true });
      c.imageSmoothingEnabled = false; c.drawImage(im, 0, 0);
      return Array.from({ length: N }, (_, i) => c.getImageData(i * FW, 0, FW, FH).data);
    };
    const mask = (d, t) => { const m = new Uint8Array(FW * FH); for (let p = 0; p < FW * FH; p++) { const q = p * 4; if (t(d[q], d[q + 1], d[q + 2], d[q + 3])) m[p] = 1; } return m; };
    /* the renderer's own FIRE_SKIN_OPTS window, which rejects flame and glow */
    const isSkin = (r, g, b, a) => a > 200 && r > 60 && b / r <= 0.50 && g / r >= 0.45 && g / r <= 0.80;
    const isLeg = (r, g, b, a) => a > 200 && ((r > 20 && g / r > 1.0 && b / r < 0.72) || (r < 130 && Math.abs(r - g) < 26 && Math.abs(g - b) < 26));
    const solid = (r, g, b, a) => a > 200;
    /* The renderer's placement, exactly: anchor (0.5, 1) means scale happens
       about the cell's BOTTOM CENTRE, then the offset is added. */
    const on = (g, b, k, dx, dy) => {
      let hit = 0, tot = 0;
      for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
        if (!g[y * FW + x]) continue;
        tot++;
        const tx = (FW / 2 + (x - FW / 2) * k + dx) | 0;
        const ty = (FH + (y - FH) * k + dy) | 0;
        if (tx >= 0 && tx < FW && ty >= 0 && ty < FH && b[ty * FW + tx]) hit++;
      }
      return tot ? hit / tot : 0;
    };
    const body = await cells('/sprites/skills/firemaking-strip.webp');
    const skin = body.map((d) => mask(d, isSkin));
    const leg = body.map((d) => mask(d, isLeg));
    const out = {};
    for (const [slot, src, tgt] of [
      ['shirt', '/sprites/gear/shirt/tshirt/fire-south.png', skin],
      ['chest', '/sprites/gear/chest/steelplate/fire-south.png', skin],
      ['legs', '/sprites/gear/legs/steelgreaves/fire-south.png', leg],
    ]) {
      const g = (await cells(src)).map((d) => mask(d, solid));
      let raw = 0, reg = 0;
      for (let f = 0; f < N; f++) {
        raw += on(g[f], tgt[f], 1, 0, 0);            /* the sheet as supplied */
        reg += on(g[f], tgt[f], REG[slot].scale, REG[slot].off[f][0], REG[slot].off[f][1]);
      }
      out[slot] = { raw: raw / N, reg: reg / N };
    }
    return out;
  }, REG);

  /* Measured on the shipped art at the chosen scales: shirt 0.42 -> 0.79,
     chest 0.43 -> 0.79, legs 0.20 -> 0.44.  The floors sit just under each
     corrected figure and well above each raw one; 1.35x is comfortably inside
     the smallest real gain while still failing loudly on a no-op table.
     NOTE the ratio cannot be used to CHOOSE the scale — it rewards shrinking
     without limit (see FIRE_GEAR_REG).  It is a floor, not an optimiser. */
  const FLOOR = { shirt: 0.70, chest: 0.72, legs: 0.38 };
  for (const slot of ['shirt', 'chest', 'legs']) {
    const c = cover[slot];
    rec.ok(`the registered ${slot} covers the body far better than the raw sheet does`,
      c.reg >= c.raw * 1.35, `${c.raw.toFixed(3)} -> ${c.reg.toFixed(3)} (x${(c.reg / c.raw).toFixed(2)})`);
    rec.ok(`the registered ${slot} sits on the body`, c.reg >= FLOOR[slot], c.reg.toFixed(3));
  }

  await P.ctx.close().catch(() => {});
}
