/* ═══ FORM SHADING: LIGHT FROM ABOVE ON FIGURES AND PROPS (v2.3.2755) ═══
 *
 * Owner: "I love gradient colors to make things 'pop' more.  I'm wondering if
 * there's a way you can add that kind of subtle shadowing on the game's
 * geometry, including the character."
 *
 * The shading is a colour per sprite CORNER (src/rendering/formShade.js), so
 * the only honest measure is the real render with and without it:
 * window.__btShadeOff toggles it live.  For town (props, NPCs, the player) and
 * a gathering zone (trees, rocks, monsters) this shoots both, checks the
 * patch actually ran (__btShade counts shaded quads), that it changed pixels,
 * and that it DARKENED them (never brightened past the art) -- and leaves
 * side-by-side stills in out/formshade-*.png for a human.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

/* Mean luminance of a decoded PNG's rows [y0, y1) -- the camera settles in
   sub-pixel steps between two shots, so a per-pixel diff of a noisy cobble
   floor is mostly that drift; a MEAN is immune to it and is exactly what a
   shade that only darkens must move. */
function meanLum(img, y0f = 0, y1f = 1) {
  const y0 = Math.floor(img.height * y0f), y1 = Math.floor(img.height * y1f);
  let sum = 0, n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < img.width; x++) {
      const [r, g, b] = img.at(x, y);   /* decodePng: RGB or RGBA, at() hides which */
      sum += r * 0.299 + g * 0.587 + b * 0.114; n++;
    }
  }
  return n ? sum / n : 0;
}

async function onOff(P, name, rec, { props = true } = {}) {
  /* the welcome / quest plate is UI, not world, and it comes and goes */
  await P.page.evaluate(() => { try { window._setQuestMsg && window._setQuestMsg(null); } catch (e) {} });
  await P.page.evaluate(() => { window.__btShadeOff = false; });
  await P.page.waitForTimeout(400);
  const before = await P.page.evaluate(() => window.__btShade && window.__btShade());
  const box = await H.figureBox(P, { pad: 2 }).catch(() => null);
  const shot = async (off, file) => {
    await P.page.evaluate((o) => { window.__btShadeOff = o; }, off);
    await P.page.waitForTimeout(250);
    const full = await P.page.screenshot(file ? { path: file } : {});
    const fig = box ? await P.page.screenshot({ clip: box }) : null;
    return { full: H.decodePng(full), fig: fig ? H.decodePng(fig) : null };
  };
  const on = await shot(false, `${H.REPO}/tools/qa/mp/out/formshade-${name}-on.png`);
  const off = await shot(true, `${H.REPO}/tools/qa/mp/out/formshade-${name}-off.png`);
  await P.page.evaluate(() => { window.__btShadeOff = false; });
  const after = await P.page.evaluate(() => window.__btShade && window.__btShade());
  rec.ok(`${name}: the batcher patch is live and shading quads`,
    !!before && before.on && after.quadsShadedTotal > before.quadsShadedTotal, { before, after });
  /* the world band, clear of the top bar and the dashboard */
  const wOn = meanLum(on.full, 0.12, 0.86), wOff = meanLum(off.full, 0.12, 0.86);
  console.log(`    ${name}: world mean ${wOff.toFixed(1)} -> ${wOn.toFixed(1)}`);
  /* town is built of prop SPRITES, so the whole scene darkens a little; an
     image zone's scenery is painted into its map (nothing to shade there but
     the figures), so it is only held to "never lit up" */
  if (props) rec.ok(`${name}: the scene is shaded (darker on average)`, wOn < wOff - 0.3, { wOn, wOff });
  rec.ok(`${name}: ...and nothing is lit up by it`, wOn <= wOff + 0.3, { wOn, wOff });
  if (on.fig && off.fig) {
    const lOn = meanLum(on.fig, 0.55, 1), lOff = meanLum(off.fig, 0.55, 1);
    const hOn = meanLum(on.fig, 0, 0.3), hOff = meanLum(off.fig, 0, 0.3);
    console.log(`    ${name}: player legs ${lOff.toFixed(1)} -> ${lOn.toFixed(1)}, head ${hOff.toFixed(1)} -> ${hOn.toFixed(1)}`);
    /* the whole figure, gear and all, is one gradient: the feet take the
       shade, the head keeps (nearly) its painted colour */
    rec.ok(`${name}: the player's legs are shaded`, lOn < lOff - 1.5, { lOn, lOff });
    rec.ok(`${name}: ...more than the head is`, (lOff - lOn) > (hOff - hOn), { legs: lOff - lOn, head: hOff - hOn });
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Shady', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2 });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);
  await P.page.addStyleTag({ content: '*:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
  /* town, by the fountain and Mayor Bro: props, an NPC, the player */
  await P.page.evaluate(() => { const S = window._gameState.current; S.player.x = 1110; S.player.y = 1110; });
  await P.page.waitForTimeout(2500);
  await onOff(P, 'town', rec);
  await H.warpToZone(P, { wsPort, label: 'Verdant Wilds', zoneId: 'verdant' }).catch(() => null);
  const z = await H.readState(P, (S) => S.currentZone);
  rec.ok('warped to verdant (guard)', z === 'verdant', { z });
  if (z === 'verdant') {
    await H.closeDest(P).catch(() => {});
    await P.page.waitForTimeout(1500);
    await onOff(P, 'verdant', rec, { props: false });
  }
  await P.ctx.close().catch(() => {});
}
