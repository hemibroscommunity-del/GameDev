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

  /* ═══ THE FOLD CHIP, NOT A DESTINATION PANEL ═══
     The first cut of this drove dashboardPanelBus.open('bag') and measured
     nothing at all -- 0.6006 -> 0.6006, canvas 615 -> 615.  Opening a
     DESTINATION grows the sheet the floating controls hang from; it does not
     resize the CANVAS.  What the owner means by closing the dashboard is the
     FOLD, and dashMinBus is the one geometry path (its own comment: "BroTown's
     resize() listens for this").
     Driven through the real chip rather than the bus, because the chip is what
     a thumb presses and it is the thing that must keep working: `[data-dash-fold]`
     carries the state as well, so the press can be proven to have landed. */
  const foldBefore = await P.page.evaluate(() => {
    const b = document.querySelector('[data-dash-fold]');
    return b ? b.getAttribute('data-dash-fold') : null;
  });
  rec.ok('the dashboard fold chip is on screen (guard)', foldBefore === 'open', { foldBefore });
  await P.page.evaluate(() => {
    const b = document.querySelector('[data-dash-fold]');
    if (b) b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
  });
  await P.page.waitForTimeout(1400);
  const folded = await P.page.evaluate(() => {
    const b = document.querySelector('[data-dash-fold]');
    return b ? b.getAttribute('data-dash-fold') : null;
  });
  rec.ok('...and pressing it folds the band (guard)', folded === 'min', { foldBefore, folded });
  const open = await probe(P);
  console.log('    dashboard folded: ' + JSON.stringify(open));

  /* ═══ 1. THE ZOOM THE OWNER ASKED TO KEEP ═══ */
  rec.ok(`FOLDING the dashboard away zooms the world IN (${closed.scale} -> ${open.scale})`,
    open.scale > closed.scale + 0.001, { withBand: closed.scale, folded: open.scale });
  rec.ok('...because the canvas is TALLER once the band is out of the way, which is the whole mechanism',
    open.canvasH > closed.canvasH, { withBand: closed.canvasH, folded: open.canvasH });

  await P.page.evaluate(() => {
    const b = document.querySelector('[data-dash-fold]');
    if (b) b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
  });
  await P.page.waitForTimeout(1400);
  const reclosed = await probe(P);
  console.log('    dashboard restored: ' + JSON.stringify(reclosed));
  rec.ok(`...and bringing the band back zooms OUT again (${open.scale} -> ${reclosed.scale})`,
    reclosed.scale < open.scale - 0.001, { folded: open.scale, restored: reclosed.scale });

  /* ═══ 2. THE PLATE SHRINKS LESS THAN THE WORLD, AND NOT BY NOTHING ═══
     ═══ v2.3.2263: THE MIDDLE, PINNED FROM BOTH SIDES ═══
     v2.3.2262 asserted the plate held EXACTLY its on-screen size across a zoom
     change, which is what full 1/w compensation does -- and the owner's answer
     to that build was "nameplates are now way too large", measured at 18 CSS px
     of type over a 27 CSS px slime.  So the rule changed to sqrt(1/w)
     (entityRenderer setPlateZoom) and this pair of assertions changed with it,
     to a bound rather than an equality: the plate must shrink by LESS than the
     world does, and by MORE than nothing.

     Both counterfactuals are named on purpose.  An assertion that only said
     "bigger than uncompensated" would pass for the too-large build this exists
     to prevent coming back, and one that only said "smaller than compensated"
     would pass for no compensation at all.  Between them there is one rule
     left, and it is the one shipped. */
  const ratio = closed.scale / open.scale;   /* band-up scale over folded scale: < 1 */
  const wantRatio = Math.sqrt(ratio);        /* what sqrt compensation predicts */
  const gotRatio = closed.plate.h / open.plate.h;
  console.log(`    world scale ratio ${ratio.toFixed(3)}; plate h ${open.plate.h} -> ${closed.plate.h}`
    + ` (plate ratio ${gotRatio.toFixed(3)}, sqrt predicts ${wantRatio.toFixed(3)})`);
  rec.ok(`guard: the two states really are different zooms (x${ratio.toFixed(3)})`,
    ratio < 0.97, { ratio, withBand: closed.scale, folded: open.scale });
  rec.ok(`the plate shrinks LESS than the world does (plate x${gotRatio.toFixed(3)} vs world x${ratio.toFixed(3)})`,
    gotRatio > ratio + 0.02, { gotRatio, ratio, withBand: closed.plate, folded: open.plate });
  rec.ok('...and it is NOT pinned to a constant screen size either, which is what read as "way too large"',
    gotRatio < 0.995, { gotRatio, withBand: closed.plate, folded: open.plate });
  rec.ok(`...it tracks sqrt(zoom), the middle both of those miss (${gotRatio.toFixed(3)} vs ${wantRatio.toFixed(3)})`,
    Math.abs(gotRatio - wantRatio) <= 0.04, { gotRatio, wantRatio, ratio });

  /* ═══ 3. AND IT IS RASTERISED AT THE SIZE IT IS SHOWN ═══
     v2.3.1821 on this same plate: a Pixi Text is a texture, so growing its
     container without moving `resolution` buys size at the cost of sharpness --
     bigger AND blurrier, which is not more legible.  The counter-scale is
     exactly that kind of growth, so the resolution is asserted with it. */
  rec.ok('...and its glyphs are rasterised for the size they are drawn at, not upscaled',
    closed.plate.res >= open.plate.res && closed.plate.res >= 1,
    { withBand: closed.plate.res, folded: open.plate.res });

  await P.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/worldtext-open.png' });
  await P.ctx.close().catch(() => {});
}
