/* ═══ SHARP PIXELS ON THE CHARACTERS (v2.3.2770) ═══
 *
 * Owner: "The character also looks soft compared to the art he's wearing like
 * sword or shirt ... is there an enhancement you can do for that?"
 *
 * src/rendering/sharpPixels.js samples the character sprites with "sharp
 * bilinear" through its own batcher and shader.  This checks, on a 3x phone:
 *   - the shader compiled (no GL errors) and the batcher is live;
 *   - the figure's sprites were actually routed through it;
 *   - the figure is SHARPER: the mean edge contrast inside the player's box
 *     rises with it on vs window.__btSharpOff (same frame, same camera);
 * and leaves out/sharppixels-{on,off}.png for a human.
 */
import * as H from './harness.mjs';

/* Edge contrast of the FIGURE, not the floor: the cobble behind him is a busy
   texture that the switch never touches, so the gradient is summed only over
   pixels that the switch changes (luminance moved by more than 6) -- which are
   exactly the figure's texel seams. */
const lum = (p) => p[0] + p[1] + p[2];
function figureEdges(on, off) {
  let eOn = 0, eOff = 0, n = 0;
  for (let y = 0; y < on.height - 1; y++) {
    for (let x = 0; x < on.width - 1; x++) {
      if (Math.abs(lum(on.at(x, y)) - lum(off.at(x, y))) <= 18) continue;
      const g = (img) => Math.abs(lum(img.at(x, y)) - lum(img.at(x + 1, y))) + Math.abs(lum(img.at(x, y)) - lum(img.at(x, y + 1)));
      eOn += g(on); eOff += g(off); n++;
    }
  }
  return { n, eOn: n ? eOn / n : 0, eOff: n ? eOff / n : 0 };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Crisp', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, dpr: 3 });
  const glErrors = [];
  P.page.on('console', (m) => { if (/ERROR: \d|shader|GLSL|program/i.test(m.text())) glErrors.push(m.text().slice(0, 200)); });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);
  await P.page.addStyleTag({ content: '*:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
  await P.page.evaluate(() => { try { window._setQuestMsg && window._setQuestMsg(null); } catch (e) {} const S = window._gameState.current; S.player.x = 900; S.player.y = 1250; });
  await P.page.waitForTimeout(2500);
  const st = await P.page.evaluate(() => window.__btSharp && window.__btSharp());
  console.log('    ' + JSON.stringify(st));
  rec.ok('the sharp batcher is installed (WebGL2)', !!st && st.enabled, st);
  rec.ok('...and the character sprites are routed through it', !!st && st.routedTotal > 0, st);
  rec.ok('...with no shader compile errors', glErrors.length === 0, glErrors.slice(0, 3));
  const box = await H.figureBox(P, { pad: 2 });
  rec.ok('the player figure box was found (guard)', !!box, box);
  if (!box) { await P.ctx.close().catch(() => {}); return; }
  /* body only: the name plate above is UI text and is not sharpened */
  const clip = { x: box.x, y: box.y + box.height * 0.1, width: box.width, height: box.height * 0.9 };
  /* ═══ v2.3.2922: ONE FROZEN FRAME, SO THE SWITCH IS THE ONLY DIFFERENCE ═══
     The two pictures used to be taken live, 300 ms apart, so they were two
     moments of the idle animation as well as on and off.  And since
     v2.3.2922 the switch also moves the figure by a fraction of a pixel: the
     character batcher draws it where it is (sharpPixels.js), the default one
     snaps each sprite to a whole pixel.  Live, those two differences swamped
     the one being measured (on 23.4 vs off 25.2 over 20,728 px, while the
     same comparison on a frozen jog frame is +25%).  So the loop is held and
     one instant is drawn twice, a rebuild of the draw list forced so the
     switch reroutes the sprites (mp-sheen's frozen frame). */
  await P.page.evaluate(() => new Promise((res) => {
    const R = window._pixiRenderer; const orig = R.update;
    R.update = function (...args) { window.__spArgs = args; return orig.apply(this, args); };
    window.__spArgs = null;
    const wait = () => (window.__spArgs ? res() : setTimeout(wait, 16)); wait();
  }));
  await P.page.evaluate(() => {
    window.__spReal = window.requestAnimationFrame.bind(window);
    window.__spHeld = [];
    window.requestAnimationFrame = (cb) => { window.__spHeld.push(cb); return 0; };
    window.__spT = Date.now(); window.__spPT = performance.now();
  });
  await P.page.waitForTimeout(150);
  const shot = async (off, name) => {
    await P.page.evaluate((o) => {
      window.__btSharpOff = o;
      const R = window._pixiRenderer;
      R.app.stage.renderGroup.structureDidChange = true;
      const dn = Date.now, pn = performance.now.bind(performance);
      Date.now = () => window.__spT; performance.now = () => window.__spPT;
      try { R.update(...window.__spArgs); } finally { Date.now = dn; performance.now = pn; }
    }, off);
    return H.decodePng(await P.page.screenshot({ clip, path: `${H.REPO}/tools/qa/mp/out/sharppixels-${name}.png` }));
  };
  const off = await shot(true, 'off');
  const on = await shot(false, 'on');
  await P.page.evaluate(() => {
    window.__btSharpOff = false;
    const held = window.__spHeld || [];
    window.requestAnimationFrame = window.__spReal; window.__spHeld = null;
    for (const cb of held) window.requestAnimationFrame(cb);
  });
  const e = figureEdges(on, off);
  console.log(`    figure edge contrast over ${e.n} px: off ${e.eOff.toFixed(1)} -> on ${e.eOn.toFixed(1)}`);
  rec.ok('the switch changes the figure (guard)', e.n > 200, e);
  rec.ok('the figure is sharper with it on (more edge contrast)', e.eOn > e.eOff * 1.05, e);   /* measured +11% on the idle-south figure; texel interiors are flat either way, which dilutes the mean */
  await P.ctx.close().catch(() => {});
}
