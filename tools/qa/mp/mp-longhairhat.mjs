/* ═══ v2.3.3865: LONG HAIR UNDER A COWBOY HAT ═══
 *
 * The owner, 2026-10-29: "some things still go missing.  One was the 'long
 * hair' on the north run.  While wearing cowboy hat (or maybe it's the sheriff
 * hat) it's not underneath."  The hair under a hat that `clipsHair` is cut to
 * the hat's silhouette (entityRenderer _clipHairToHat, hairClip.js's stencil).
 *
 * The long hair under the Brown Cowboy Hat ('cowboy-hat'), the Sheriff Hat
 * ('cowboy-hat-2') and, for comparison, the Army Helmet, standing and jogging
 * in all eight facings, on a phone (390 x 844, the look palette on) and on a
 * computer (the sideways layout, the palette off): in each, the hair's
 * pixels on screen (its colour, read back off the drawing buffer by the
 * head-frame count's own reading, ?headframes) against the same facing and
 * pose bare-headed -- under a hat the hair must keep at least LH_MIN of them
 * where it ships a picture (the brim covers its top, never all of it).
 * Pictures of each head: tools/qa/mp/out/longhairhat-*.png.
 *
 *   node tools/qa/mp/run.mjs longhairhat
 *   LH_VIEW=phone|desk  one of the two (both)
 *   LH_HATCOLOR=red      the hats in a colour (drawn from the look palette)
 *   LH_CAPE=crimson      a cape, whose hood clips the hair too
 *   LH_TAG=x             a word in the pictures' names
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const HATS = ['cowboy-hat', 'cowboy-hat-2', 'army-helmet'];
/* the share of its bare-headed pixels the hair keeps under a hat, at least */
const LH_MIN = 0.25;
const FACINGS = {
  east: ['d'], northeast: ['w', 'd'], north: ['w'], northwest: ['w', 'a'],
  west: ['a'], southwest: ['s', 'a'], south: ['s'], southeast: ['s', 'd'],
};
/* the long hair's own browns (its picture's colours) */
const HAIR_T = [46, 33, 23];
const VIEWS = {
  phone: { viewport: { width: 390, height: 844 }, touch: true, dpr: 2 },
  desk: { viewport: { width: 1366, height: 768 }, touch: false, dpr: 1, wide: true },
};

/* the hair sprite's box on screen and how many of its pixels are its browns
   (the pixels read straight after a frame is drawn, as headFrames.js does) */
const hairPixels = (P) => P.page.evaluate((t) => {
  const R = window._pixiRenderer;
  const d = R && R.playerDisplayRaw && R.playerDisplayRaw();
  const app = R && R.app;
  if (!d || !app) return null;
  const sp = d._hairSprite;
  try {
    /* a frame drawn now, by hand as the game draws (it runs no ticker), and
       read straight back before the page shows it */
    const gl = app.renderer.gl, res = app.renderer.resolution || 1;
    app.render();
    if (!sp || !sp.visible) return { vis: false, why: sp && sp._btHide, mask: !!(sp && sp.mask) };
    const b = sp.getBounds();
    const H2 = gl.drawingBufferHeight, W2 = gl.drawingBufferWidth;
    const x0 = Math.max(0, Math.floor(b.minX * res)), x1 = Math.min(W2, Math.ceil(b.maxX * res));
    const y0 = Math.max(0, Math.floor(b.minY * res)), y1 = Math.min(H2, Math.ceil(b.maxY * res));
    const w = x1 - x0, h = y1 - y0;
    if (w < 2 || h < 2) return { vis: true, n: 0, box: [x0, y0, w, h] };
    const buf = new Uint8Array(w * h * 4);
    gl.readPixels(x0, H2 - y1, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    let n = 0;
    for (let i = 0; i < buf.length; i += 4) {
      const r = buf[i], g = buf[i + 1], bb = buf[i + 2];
      if (Math.abs(r - t[0]) + Math.abs(g - t[1]) + Math.abs(bb - t[2]) < 45 && r > g && g > bb) n++;
    }
    return { vis: true, n, box: [x0, y0, w, h], mask: !!sp.mask, dir: d._animDir, pose: d._animPose };
  } catch (e) { return { err: String(e && e.message || e) }; }
}, HAIR_T);

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const views = process.env.LH_VIEW ? [process.env.LH_VIEW] : ['phone', 'desk'];
  for (const vname of views) {
    const V = VIEWS[vname];
    const P = await H.newPlayer(browser, {
      name: 'Longhair' + vname, wsPort, webPort, world: 'wheel', guest: true, ...V,
      init: `try { localStorage.setItem('bt-hair', 'long'); localStorage.setItem('bt-headwear', 'none'); localStorage.setItem('bt-facialhair', 'none'); localStorage.setItem('bt-eyewear', 'none');`
        + (process.env.LH_HATCOLOR ? ` localStorage.setItem('bt-hatcolor', ${JSON.stringify(process.env.LH_HATCOLOR)});` : '')
        + (process.env.LH_CAPE ? ` localStorage.setItem('bt_cape', ${JSON.stringify(process.env.LH_CAPE)});` : '') + ' } catch (e) {}',
    });
    const errors = [];
    P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
    try {
      await H.enterWorld(P);
      const ok = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
        { timeout: 90000, label: 'in the world' }).catch(() => null);
      rec.ok(`${vname}: in the world (guard)`, !!ok, ok);
      if (!ok) continue;
      await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
      await P.page.waitForTimeout(2500);
      const shot = async (name) => {
        const pos = await P.page.evaluate(() => {
          const S = window._gameState.current, c = document.querySelector('canvas'), r = c.getBoundingClientRect();
          return { x: r.left + (S.player.x - S.camera.x) * (S._worldScaleX || 1), y: r.top + (S.player.y - S.camera.y) * (S._worldScaleY || 1) };
        });
        await P.page.screenshot({ path: join(OUT, `longhairhat-${vname}${process.env.LH_TAG ? '-' + process.env.LH_TAG : ''}-${name}.png`), clip: { x: Math.max(0, pos.x - 45), y: Math.max(0, pos.y - 110), width: 90, height: 120 } }).catch(() => {});
      };
      /* each hat, each facing, standing and jogging: the hair's pixels */
      const table = {};
      for (const hat of ['none', ...HATS]) {
        await P.page.evaluate((h) => window.__btSetHeadwear(h), hat);
        await P.page.waitForTimeout(1500);
        table[hat] = {};
        for (const [face, keys] of Object.entries(FACINGS)) {
          for (const k of keys) await P.page.keyboard.down(k);
          await P.page.waitForTimeout(700);
          const jog = await hairPixels(P);
          if (face === 'north' || face === 'northwest' || face === 'northeast') await shot(`${hat}-${face}-jog`);
          for (const k of keys) await P.page.keyboard.up(k);
          await P.page.waitForTimeout(600);
          const stand = await hairPixels(P);
          if (face === 'north') await shot(`${hat}-${face}-stand`);
          table[hat][face] = { jog, stand };
        }
      }
      /* under each hat against bare-headed, the same facing and pose */
      const bad = [];
      const rows = [];
      for (const hat of HATS) {
        for (const face of Object.keys(FACINGS)) {
          for (const pose of ['jog', 'stand']) {
            const bare = table.none[face][pose], hatted = table[hat][face][pose];
            if (!bare || !bare.vis || !(bare.n > 20)) continue;   /* the hair does not show here bare-headed (from the front, a short fringe) */
            const share = hatted && hatted.vis ? (hatted.n || 0) / bare.n : 0;
            rows.push(`${hat} ${face} ${pose}: ${hatted && hatted.vis ? hatted.n : 'hidden'} / ${bare.n} (${Math.round(share * 100)}%)`);
            if (share < LH_MIN) bad.push({ hat, face, pose, n: hatted && hatted.n, bare: bare.n, hatted });
          }
        }
      }
      console.log(`    [${vname}] the long hair's pixels under each hat, against bare-headed:\n      ` + rows.join('\n      '));
      rec.ok(`${vname}: the long hair shows under the Brown Cowboy Hat, the Sheriff Hat and the Army Helmet in every facing, standing and jogging (at least ${LH_MIN * 100}% of its bare-headed pixels; ${bad.length} short)`,
        bad.length === 0, bad.slice(0, 12));
      rec.ok(`${vname}: no page errors`, errors.length === 0, errors.slice(0, 6));
    } finally {
      await P.ctx.close().catch(() => {});
    }
  }
}
