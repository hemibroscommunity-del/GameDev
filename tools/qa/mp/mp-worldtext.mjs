/* IN-WORLD TEXT STAYS READABLE WHEN THE WORLD ZOOMS OUT (v2.3.2262)
 *
 * Two owner requests, and they are the same measurement taken twice:
 *
 *   "This was probably unintentional on your part but was an amazing discovery
 *    that when you close the dashboard the game zooms in.  Bringing back the
 *    dashboard zooms the game out.  I love it and want to keep it that way."
 *
 *   "increase any small font size when the game is zoomed out for stuff in the
 *    game world (name plates is one example)"
 *
 * ═══ THE ZOOM IS EMERGENT, WHICH IS EXACTLY WHY IT NEEDS PINNING ═══
 * Nobody wrote it.  The dashboard's height feeds --sheet-h, which sizes the
 * canvas, which pixiRenderer divides into the world viewport to get
 * worldContainer.scale -- so closing the band hands the renderer a taller canvas
 * and the world grows to fill it.  An emergent behaviour with no code that names
 * it is one refactor away from vanishing with nobody noticing, and the owner has
 * asked to keep it.  So it is asserted as a RULE here: opening the dashboard
 * must lower the world scale, closing it must raise it.
 *
 * ═══ AND THE SAME ZOOM IS WHAT SHRANK THE PLATES ═══
 * Every glyph in the world container is multiplied by that scale, so the name
 * plate was 6 CSS px at a combat zone's 0.60 and smaller again with the band up.
 * v2.3.2262 counter-scales the plate against the camera zoom (and re-rasterises,
 * or it would be bigger AND blurrier -- the v2.3.1821 trap on this very plate).
 *
 * So the second assertion is the first one's consequence: the world scale moves,
 * and the plate's ON-SCREEN size does not follow it down.
 *
 * TRAPS §44: every reading here is taken after the layout has settled, and the
 * two states are compared to each other rather than to a literal, because the
 * scale depends on the device and the zone.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

/* The world scale the renderer resolved, and the plate as the SCREEN sees it --
   getBounds() on the pill walks up through worldContainer, so it already has
   the camera zoom in it.  That is the number a player's eye gets. */
const probe = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const d = window.__btPlateBox ? window.__btPlateBox() : null;
  return {
    scale: +(S._worldScaleX || 0).toFixed(4),
    canvasH: Math.round(document.querySelector('canvas').getBoundingClientRect().height),
    plate: d,
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Reader', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  const closed = await probe(P);
  console.log('    dashboard closed: ' + JSON.stringify(closed));
  rec.ok('the world scale and the plate can both be measured (guard)',
    closed.scale > 0 && !!closed.plate && closed.plate.h > 0, closed);
  if (!closed.plate) { await P.ctx.close().catch(() => {}); return; }

  /* Open the dashboard -- the same bus the sheet's own controls drive. */
  await P.page.evaluate(() => { window.__broDashPanelBus.open('bag'); });
  await P.page.waitForTimeout(1200);
  const open = await probe(P);
  console.log('    dashboard open:   ' + JSON.stringify(open));

  /* ═══ 1. THE ZOOM THE OWNER ASKED TO KEEP ═══ */
  rec.ok(`opening the dashboard zooms the world OUT (${closed.scale} -> ${open.scale})`,
    open.scale < closed.scale - 0.001, { closed: closed.scale, open: open.scale });
  rec.ok('...because the canvas is shorter, which is the whole mechanism',
    open.canvasH < closed.canvasH, { closed: closed.canvasH, open: open.canvasH });

  await P.page.evaluate(() => { window.__broDashPanelBus.close(); });
  await P.page.waitForTimeout(1200);
  const reclosed = await probe(P);
  console.log('    dashboard reclosed: ' + JSON.stringify(reclosed));
  rec.ok(`...and closing it zooms back IN (${open.scale} -> ${reclosed.scale})`,
    reclosed.scale > open.scale + 0.001, { open: open.scale, reclosed: reclosed.scale });

  /* ═══ 2. THE PLATE DOES NOT SHRINK WITH IT ═══
     The world scale dropped by a real fraction between the two states.  Left
     uncompensated the plate's on-screen height would drop by the SAME fraction,
     because it is a child of the container that scale is applied to.  The
     assertion is that it does not: within a pixel of the same height, at both
     zooms. */
  const ratio = open.scale / closed.scale;
  console.log(`    world scale ratio ${ratio.toFixed(3)}; plate h ${closed.plate.h} -> ${open.plate.h}`);
  rec.ok(`guard: the two states really are different zooms (x${ratio.toFixed(3)})`,
    ratio < 0.97, { ratio, closed: closed.scale, open: open.scale });
  rec.ok(`the name plate keeps its on-screen size when the world zooms out (${closed.plate.h}px -> ${open.plate.h}px)`,
    Math.abs(open.plate.h - closed.plate.h) <= 1.5, { closed: closed.plate, open: open.plate, ratio });
  /* ...and it would have shrunk without the fix: state the counterfactual, so a
     reader can see what the assertion above is worth. */
  rec.ok(`...where uncompensated it would have fallen to ${(closed.plate.h * ratio).toFixed(1)}px`,
    open.plate.h > closed.plate.h * ratio + 0.5,
    { would: +(closed.plate.h * ratio).toFixed(1), is: open.plate.h });

  /* ═══ 3. AND IT IS RASTERISED AT THE SIZE IT IS SHOWN ═══
     v2.3.1821 on this same plate: a Pixi Text is a texture, so growing its
     container without moving `resolution` buys size at the cost of sharpness --
     bigger AND blurrier, which is not more legible.  The counter-scale is
     exactly that kind of growth, so the resolution is asserted with it. */
  rec.ok('...and its glyphs are rasterised for the size they are drawn at, not upscaled',
    open.plate.res >= closed.plate.res && open.plate.res >= 1,
    { closed: closed.plate.res, open: open.plate.res });

  await P.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/worldtext-open.png' });
  await P.ctx.close().catch(() => {});
}
