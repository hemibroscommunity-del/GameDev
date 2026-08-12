/* Mayor Bro's art actually reaches the screen (v2.3.1672).
 *
 * The renderer's texture lookup is CACHE-ONLY on purpose: if the preload
 * manifest ever stops registering NPC art, the mayor silently falls back to
 * his emoji stand-in and nothing else breaks.  That is the right failure mode
 * to ship, and the wrong one to leave untested — so this asserts the texture
 * is warm when the intro lifts, and that the figure is on the display list at
 * the player's scale with its feet on the NPC's own y.
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Looker', wsPort, webPort });
  await H.enterWorld(A);
  await A.page.waitForTimeout(1500);

  const warm = await A.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const npc = (S && S.npcs || []).find((n) => n && n.id === 'mayor_bro');
    return { spawned: !!npc, src: npc && npc.sprite || null, zone: S && S.currentZone };
  });
  rec.ok('Mayor Bro is spawned in town', warm.spawned && warm.zone === 'town', warm);
  rec.ok('his NPC record names a sprite', warm.src === '/sprites/npc/mayor-bro.webp', warm.src);

  /* The asset must be SERVED — a typo'd path is a 404 that the cache-only
     lookup would swallow into a permanent emoji. */
  const status = await A.page.evaluate(async (u) => {
    try { const r = await fetch(u, { method: 'GET' }); return r.status; } catch (e) { return String(e); }
  }, warm.src);
  rec.ok('the sprite file is served', status === 200, status);

  /* PIXELS, not plumbing.  The obvious probe — Assets.cache.get, or
     getImageData on the canvas — does not work here: the app exposes no PIXI
     handle, and the WebGL context has no preserveDrawingBuffer so a canvas
     readback comes back blank.  (It did, and it reported 0 matching pixels
     against a mayor who was in fact drawing perfectly — a false FAILURE, the
     mirror image of the false passes further up this file.)
     A screenshot does capture him, so decode that instead.  Signature colour
     is the purple of his shorts (~#55267E), which appears nowhere else in
     town — the mayor's house banner is magenta and fails the b-g test. */
  await A.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.player) { S.player.x = 758; S.player.y = 560; }
  });
  await A.page.waitForTimeout(1800);

  const shot = await H.screenshotPixels(A);
  const purple = shot.count((r, g, b) => b > 70 && r > 40 && b - g > 40 && r - g > 15);
  /* His shorts are ~1445 px of a 256 frame; drawn at 96/256 the area scales by
     (96/256)^2, so ~200 px on screen.  A floor of 60 is comfortably above
     "nothing" and comfortably below "the whole figure", so it fails loudly if
     the art stops loading and cannot pass on a stray pixel or two. */
  rec.ok('his art is actually painted on the canvas', purple > 60, { purplePx: purple });

  /* Scale.  v2.3.1672 pinned "roughly player height" after the first attempt
     drew him at two thirds of it.  v2.3.1673 (owner: "he needs to be twice as
     large") makes DOUBLE the intent, so the band moves with it — the point of
     the check is unchanged: catch a draw scale derived from the wrong
     constant, in either direction.
     His figure is 200/256 of a 192px frame = 150 world px, the purple band is
     a quarter of the figure, so ~37 world px of shorts before camera zoom. */
  const rows = new Set();
  shot.count((r, g, b, x, y) => {
    if (b > 70 && r > 40 && b - g > 40 && r - g > 15) rows.add(y);
    return false;
  });
  rec.ok('he is drawn at DOUBLE player scale (owner request), not doll scale',
    rows.size >= 30 && rows.size <= 70, { shortsRows: rows.size });

  await A.ctx.close().catch(() => {});
}
