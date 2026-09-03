/* ═══ WHAT THE BRO ACTUALLY LOOKS LIKE AT A GIVEN ZOOM (v2.3.2249) ═══
 *
 * Owner: "the bro is too small. Can you actually simulate at different sizes
 * so I don't have to do a bunch of guesswork."
 *
 * This is not an assertion scenario, it is a CAMERA.  It stands a real
 * character on a real worker in a fixed spot in town, screenshots the phone
 * viewport, and reports the numbers that go with the picture: the world scale
 * the zone resolved to and the character's drawn height in CSS px.
 *
 * WHY A SCENARIO AND NOT A ONE-OFF SCRIPT.  The zoom has now been retuned
 * three times (v2.3.1780, v2.3.2247, this), every time by argument, and each
 * time the argument turned on what the character looks like -- which nobody
 * could see.  tools/qa/mp/sweep-zoom.mjs drives this file across candidate
 * FIGURE_SCALE_FLOOR values and lays the shots side by side, so the next
 * person tuning it looks instead of reasoning.
 *
 * THE SPOT IS FIXED ON PURPOSE.  Same coordinates, same facing, same zone
 * every run: the whole point is that the ONLY difference between two shots is
 * the constant, so anything else that moves would be noise dressed as signal.
 */
import * as H from './harness.mjs';

/* A spot in town with ground, buildings and a horizon in frame, so the shot
   shows the character IN a scene rather than alone on a texture. */
const SPOT = { x: 830, y: 980 };

export async function run({ browser, wsPort, webPort, rec }) {
  const tag = process.env.BT_ZOOM_TAG || 'x';
  const outDir = process.env.BT_ZOOM_OUT || `${H.REPO}/tools/qa/mp/out`;

  const P = await H.newPlayer(browser, {
    name: 'Zoom' + tag.replace(/[^a-zA-Z0-9]/g, ''), wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* Stand still on the mark, facing the camera, with the shield down and no
     lock -- a neutral pose, so two shots differ only by scale. */
  await P.page.evaluate((s) => {
    const S = window._gameState.current;
    S.player.x = s.x; S.player.y = s.y;
    S._facing = 'down'; S.autoAttack = false; S._shieldUp = false;
    S.lockedTarget = null;
  }, SPOT);
  await P.page.waitForTimeout(1600);

  const geom = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const z = (window.__btZones || {})[S.currentZone];
    return {
      zone: S.currentZone,
      scale: +(S._worldScaleX || 0).toFixed(4),
      viewW: Math.round(S._viewW || 0), viewH: Math.round(S._viewH || 0),
      zoneW: z ? z.w * 32 : 0, zoneH: z ? z.h * 32 : 0,
    };
  });
  const box = await H.figureBox(P).catch(() => null);
  const dpr = await P.page.evaluate(() => window.devicePixelRatio || 1);

  const shot = `${outDir}/zoom-${tag}.png`;
  await P.page.screenshot({ path: shot });

  /* The character's drawn height, measured the way mp-figscale measures it:
     figureBox is a fixed CSS-px crop, so it cannot report the height directly
     at every scale -- the live probe can. */
  const drawn = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const d = window.__btPlayerDrawn ? window.__btPlayerDrawn() : null;
    if (!d || !d.height) return null;
    /* height is the body sprite in WORLD px; `scale` is the container's
       perspective shrink (1 in town, <1 on a vista); the world scale is what
       turns world px into the CSS px a thumb actually sees.  All three, or the
       number means nothing -- v2.3.2124 records the measurement that went
       wrong by using only the first. */
    const persp = typeof d.scale === 'number' && d.scale > 0 ? d.scale : 1;
    return d.height * persp * (S._worldScaleX || 1);
  });

  const line = {
    tag, ...geom, dpr,
    figureCssPx: drawn != null ? +(drawn).toFixed(1) : null,
    boxFacing: box ? box.facing : null,
    shot,
  };
  console.log('    ZOOMSHOT ' + JSON.stringify(line));

  rec.ok(`zoom ${tag}: the world resolved a scale and a viewport`,
    geom.scale > 0 && geom.viewW > 0, line);
  rec.ok(`zoom ${tag}: the shot was taken`, !!shot, { shot });
  rec.ok(`zoom ${tag}: the viewport still fits inside the zone (no void)`,
    geom.viewW <= geom.zoneW + 1 && geom.viewH <= geom.zoneH + 1, line);

  await P.ctx.close().catch(() => {});
}
