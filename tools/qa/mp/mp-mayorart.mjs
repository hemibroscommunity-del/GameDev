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
     is the purple of his shorts (~#55267E).  It is NOT unique in town — see
     the note below. */

  /* ═══ v2.3.2071: CROPPED TO HIM, AND CHECKED THAT IT IS HIM ═══
     This counted his purple across the ENTIRE screenshot, on the stated
     grounds that the colour "appears nowhere else in town".  That was true
     when it was written and stopped being true at v2.3.2069, when the owner
     asked for the mayor's house at about 3x: the same purple is in the
     building's trim, and scaling it from 165 to 400 world px took its
     contribution from 5 rows to 36.  The count came back at 70 against a
     ceiling of 38 and read as "the mayor is drawn at giant scale" — while he
     was being drawn exactly right, one house-width away.  A whole-screen
     colour count is a proxy for "is HE the right size", and proxies rot when
     the scenery changes.

     Cropping to him is most of the fix and not all of it.  The crop is
     computed from the camera in one evaluate and the shutter opens in
     another, so anything that moves the view between the two lands the crop
     somewhere else — and the old vantage point made that easy: standing at
     (758, 560) left him 220 px south-east, which on a 615 px canvas under a
     243 px dashboard can put him beneath the bottom panel, and the teleport
     itself is a jump the server can reject and snap back.  One run in five
     came back at 44 rows off a crop that turned out to be the BAG: one of the
     potion icons is purple, and it sails through a test looking for purple.

     So: stand almost on top of him so the camera centres him, wait for the
     camera to actually stop, and then verify the crop is over the world with
     nothing painted on it before believing any colour taken from it. */
  const frame = async () => {
    await A.page.evaluate(() => {
      const S = window._gameState && window._gameState.current;
      const m = (S && S.npcs || []).find((n) => n && n.id === 'mayor_bro');
      /* 150 px south, not 70: the quest-giver proximity dialogue opens at
         ~1.75 tiles and holds its latch until you leave ~3.4 tiles (109 px),
         so anything closer re-opens `bt-npcdlg-scrim` over the whole screen
         the moment it is dismissed — which the guard below duly caught, three
         points out of three. 150 keeps him near the middle of the world
         viewport and outside the latch. */
      if (S && S.player && m) { S.player.x = m.x; S.player.y = m.y + 150; }
    });
    await A.page.waitForTimeout(400);
    await A.page.evaluate(() => {
      try { window.__broShopBus && window.__broShopBus.setOpen(false); } catch (e) {}
    });
    await H.closeNpcDialogue(A).catch(() => {});
    await A.page.waitForTimeout(500);
    await A.page.evaluate(() => new Promise((res) => {
      const S = window._gameState.current;
      let last = null, still = 0;
      const tick = () => {
        const now = Math.round(S.camera.x) + ',' + Math.round(S.camera.y);
        still = (now === last) ? still + 1 : 0;
        last = now;
        if (still >= 8) return res();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }));
    return A.page.evaluate(() => {
      const S = window._gameState.current;
      const n = (window.__btNpcSprites ? window.__btNpcSprites() : [])
        .find((m) => m.id === 'mayor_bro');
      if (!n) return null;
      const c = document.querySelector('canvas');
      const r = c.getBoundingClientRect();
      const sx = S._worldScaleX || 1, sy = S._worldScaleY || 1;
      /* Wider and taller than the figure, so a scale bug that draws him
         BIGGER still lands inside the crop and fails loudly rather than being
         silently clipped back to looking correct. */
      const PAD = 1.6;
      const w = n.width * sx * PAD, h = n.height * sy * PAD;
      const cx = r.left + (n.x - S.camera.x) * sx;
      const footY = r.top + (n.footY - S.camera.y) * sy;
      const clip = { x: Math.round(cx - w / 2), y: Math.round(footY - h),
        width: Math.round(w), height: Math.round(h) };
      const inCanvas = clip.x >= r.left && clip.y >= r.top
        && clip.x + clip.width <= r.right && clip.y + clip.height <= r.bottom;
      /* Nothing may PAINT over the crop.  Not elementFromPoint: the topmost
         element is always the touch-control wrapper, which paints nothing, so
         the stack is walked down to the canvas instead and each layer above
         it checked for a real background. */
      const painters = [];
      const pts = [[clip.x + clip.width / 2, clip.y + clip.height / 2],
        [clip.x + 2, clip.y + clip.height - 2],
        [clip.x + clip.width - 2, clip.y + clip.height - 2]];
      for (const [px, py] of pts) {
        for (const el of document.elementsFromPoint(px, py)) {
          if (el.tagName === 'CANVAS') break;
          const cs = getComputedStyle(el);
          const mm = (cs.backgroundColor || '').match(/rgba?\(([^)]+)\)/);
          const al = mm ? (mm[1].split(',')[3] === undefined ? 1 : parseFloat(mm[1].split(',')[3])) : 0;
          if (al > 0.02 || (cs.backgroundImage && cs.backgroundImage !== 'none')) {
            painters.push(el.tagName + (typeof el.className === 'string' && el.className
              ? '.' + el.className.split(' ')[0] : ''));
          }
        }
      }
      return { clip, inCanvas, painters, ok: inCanvas && painters.length === 0 };
    });
  };
  let view = await frame();
  for (let i = 0; i < 3 && !(view && view.ok); i++) view = await frame();
  rec.ok('he is framed in the world, with no panel over him',
    !!(view && view.ok), view);
  const clip = view.clip;
  await A.page.screenshot({ path: H.REPO + '/tools/qa/mp/out/mayorcrop.png', clip }).catch(() => {});
  const shot = await H.screenshotPixels(A, clip);
  const isShorts = (r, g, b) => b > 70 && r > 40 && b - g > 40 && r - g > 15;
  const purple = shot.count(isShorts);
  rec.ok('his art is actually painted on the canvas', purple > 60, { purplePx: purple, clip });

  /* Scale.  This has moved twice on request — v2.3.1672 pinned player height,
     v2.3.1673 doubled it, v2.3.1675 halved it back — so the band tracks the
     current intent rather than a remembered number.  The point of the check
     never changes: catch a draw scale derived from the wrong constant, in
     either direction (the first attempt at this drew him two thirds too
     small, and only a screenshot caught it).
     Figure = 200/256 of a 96px frame = 75 world px; the purple band is a
     quarter of the figure, so ~19 world px of shorts before camera zoom. */
  const rows = new Set();
  shot.count((r, g, b, x, y) => {
    if (isShorts(r, g, b)) rows.add(y);
    return false;
  });
  rec.ok('he is drawn at roughly player scale, not doll or giant scale',
    rows.size >= 12 && rows.size <= 38, { shortsRows: rows.size, clip });

  await A.ctx.close().catch(() => {});
}
