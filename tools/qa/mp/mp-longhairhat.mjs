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
 *   LH_FAIL=part         fail every download whose address holds `part` for LH_FAIL_MS
 *                        (20 s) from the page's start, as a wifi blip or a deploy does, then
 *                        let it through (LH_INITHAT=hat: worn from the start, so it loads then)
 *   LH_CTX=1             then the graphics lost and given back (WEBGL_lose_context, the
 *                        black-screen recovery) and each hat's N/NE/NW read again, against before
 *   LH_QUERY=x           another switch on the page (retrylooks=0: the loaders as they were)
 *   LH_HATS=a,b          these hats only; LH_REPEAT=n  each reading n times, frame after frame (a flicker
 *                        is one frame: the least of the n is what is judged, all n printed)
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const HATS = process.env.LH_HATS ? process.env.LH_HATS.split(',') : ['cowboy-hat', 'cowboy-hat-2', 'army-helmet'];
const REPEAT = Math.max(1, +(process.env.LH_REPEAT || 1));
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

/* LH_REPEAT readings, a frame apart: the least one (a flicker is one frame), and all of them */
async function readMin(P) {
  let least = null;
  const all = [];
  for (let i = 0; i < REPEAT; i++) {
    const r = await hairPixels(P);
    all.push(r && r.vis ? r.n : (r ? 'hidden:' + r.why : '?'));
    if (!least || !r || !r.vis || (least.vis && r.n < least.n)) least = r;
    if (REPEAT > 1) await P.page.waitForTimeout(120);
  }
  if (least && REPEAT > 1) least.all = all;
  return least;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const views = process.env.LH_VIEW ? [process.env.LH_VIEW] : ['phone', 'desk'];
  for (const vname of views) {
    const V = VIEWS[vname];
    const P = await H.newPlayer(browser, {
      name: 'Longhair' + vname, wsPort, webPort, world: 'wheel', ...V, query: 'headframes' + (process.env.LH_QUERY ? '&' + process.env.LH_QUERY : ''),
      init: `try { localStorage.setItem('bt-hair', 'long'); localStorage.setItem('bt-headwear', ${JSON.stringify(process.env.LH_INITHAT || 'none')}); localStorage.setItem('bt-facialhair', 'none'); localStorage.setItem('bt-eyewear', 'none');`
        + (process.env.LH_HATCOLOR ? ` localStorage.setItem('bt-hatcolor', ${JSON.stringify(process.env.LH_HATCOLOR)});` : '')
        + (process.env.LH_CAPE ? ` localStorage.setItem('bt_cape', ${JSON.stringify(process.env.LH_CAPE)});` : '') + ' } catch (e) {}',
    });
    const errors = [];
    P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
    const failed = [];
    if (process.env.LH_FAIL) {
      const part = process.env.LH_FAIL, until = Date.now() + +(process.env.LH_FAIL_MS || 20000);
      await P.page.route((u) => String(u).includes(part), (r) => {
        if (Date.now() < until) { failed.push(r.request().url().split('/sprites/')[1]); return r.abort(); }
        return r.continue();
      });
    }
    try {
      await H.enterWorld(P);
      const ok = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
        { timeout: 90000, label: 'in the world' }).catch(() => null);
      rec.ok(`${vname}: in the world (guard)`, !!ok, ok);
      if (!ok) continue;
      await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
      /* the head-frame count (src/rendering/headFrames.js) reads the hair back
         every frame too: a frame it drops is logged with its clip's state */
      await P.page.evaluate((t) => { window.__btHeadTargets = { hair: t }; }, HAIR_T);
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
          const jog = await readMin(P);
          if (face === 'north' || face === 'northwest' || face === 'northeast') await shot(`${hat}-${face}-jog`);
          for (const k of keys) await P.page.keyboard.up(k);
          await P.page.waitForTimeout(600);
          const stand = await readMin(P);
          if (face === 'north') await shot(`${hat}-${face}-stand`);
          table[hat][face] = { jog, stand };
        }
      }
      /* v2.3.3865: LH_CTX -- the graphics lost and given back, as the iPhone's
         black-screen recovery does, then each hat's back facings read again */
      if (process.env.LH_CTX) {
        const lost = await P.page.evaluate(() => {
          const c = document.querySelector('canvas');
          const gl = c && (c.getContext('webgl2') || c.getContext('webgl'));
          const ext = gl && gl.getExtension('WEBGL_lose_context');
          if (!ext) return false;
          ext.loseContext();
          setTimeout(() => { try { ext.restoreContext(); } catch (e) { /* gone */ } }, 800);
          return true;
        }).catch(() => false);
        await P.page.waitForTimeout(8000);
        /* what the count saw through the restore: pieces not drawn and why,
           frames with no bro, and the look palette's own state */
        const diag = await P.page.evaluate(() => ({
          head: window.__btHeadCount ? window.__btHeadCount() : null,
          pal: window.__btLookPalette ? window.__btLookPalette() : null,
        })).catch((e) => ({ err: String(e) }));
        const hc = diag && diag.head;
        console.log(`    [${vname}] through the restore: ${hc ? `${hc.frames} frames, ${hc.missed} piece-frames missing ${JSON.stringify(hc.byWhy)}, ${hc.bodyGone} with no bro ${JSON.stringify(hc.goneBy)}` : 'no count'}`);
        if (hc) for (const l of hc.log.slice(-6)) console.log('      miss: ' + JSON.stringify(l));
        if (hc) for (const l of (hc.goneLog || []).slice(0, 4)) console.log('      gone: ' + JSON.stringify(l));
        console.log('      look palette: ' + JSON.stringify(diag && diag.pal).slice(0, 400));
        const after = [];
        for (const hat of HATS) {
          await P.page.evaluate((h) => window.__btSetHeadwear(h), hat);
          await P.page.waitForTimeout(1500);
          for (const face of ['north', 'northeast', 'northwest']) {
            const keys = FACINGS[face];
            for (const k of keys) await P.page.keyboard.down(k);
            await P.page.waitForTimeout(700);
            const jog = await readMin(P);
            if (face === 'north') await shot(`${hat}-${face}-jog-after-loss`);
            for (const k of keys) await P.page.keyboard.up(k);
            await P.page.waitForTimeout(600);
            const stand = await readMin(P);
            for (const [pose, r] of [['jog', jog], ['stand', stand]]) {
              const was = table[hat][face][pose];
              const share = was && was.vis && was.n ? ((r && r.vis ? r.n : 0) / was.n) : null;
              after.push({ hat, face, pose, before: was && was.vis ? was.n : 'hidden', after: r && r.vis ? r.n : 'hidden:' + (r && r.why), clip: r && r.mask, share });
            }
          }
        }
        console.log(`    [${vname}] after the graphics were lost (${lost ? 'lost and given back' : 'NOT LOST'}), against before:\n      `
          + after.map((a) => `${a.hat} ${a.face} ${a.pose}: ${a.before} -> ${a.after}${a.clip ? ', clipped' : ', NOT CLIPPED'}${a.share != null ? ` (${Math.round(a.share * 100)}%)` : ''}`).join('\n      '));
        const lostHair = after.filter((a) => a.share != null && a.share < 0.5);
        rec.ok(`${vname}: after the graphics were lost and given back, the long hair under each hat keeps at least half its pixels facing N/NE/NW (${lostHair.length} short)`,
          !!lost && lostHair.length === 0, lostHair.slice(0, 8));
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
            rows.push(`${hat} ${face} ${pose}: ${hatted && hatted.vis ? hatted.n : 'hidden'} / ${bare.n} (${Math.round(share * 100)}%)${hatted && hatted.vis ? (hatted.mask ? ', clipped to the hat' : ', NOT CLIPPED') : ''}${hatted && hatted.all ? ' [' + hatted.all.join(' ') + ']' : ''}`);
            if (share < LH_MIN) bad.push({ hat, face, pose, n: hatted && hatted.n, bare: bare.n, hatted });
          }
        }
      }
      if (process.env.LH_FAIL) console.log(`    [${vname}] failed on purpose (${failed.length}): ${[...new Set(failed)].slice(0, 6).join(', ')}`);
      console.log(`    [${vname}] the long hair's pixels under each hat, against bare-headed:\n      ` + rows.join('\n      '));
      const px = await P.page.evaluate(() => (window.__btHeadCountPixels ? window.__btHeadCountPixels() : null)).catch(() => null);
      if (px) {
        console.log(`    [${vname}] every frame: ${px.looked} hair-frames read back, ${px.drops} dropped`);
        for (const l of px.log.slice(-12)) console.log('      ' + JSON.stringify(l));
        for (const sh of px.shots || []) {
          const { writeFileSync } = await import('node:fs');
          const f = join(OUT, `longhairhat-${vname}-drop-f${sh.f}.png`);
          writeFileSync(f, Buffer.from(sh.url.split(',')[1], 'base64'));
          console.log('      picture: ' + f.replace(H.REPO + '/', ''));
        }
      }
      rec.ok(`${vname}: the long hair shows under the Brown Cowboy Hat, the Sheriff Hat and the Army Helmet in every facing, standing and jogging (at least ${LH_MIN * 100}% of its bare-headed pixels; ${bad.length} short)`,
        bad.length === 0, bad.slice(0, 12));
      rec.ok(`${vname}: no page errors`, errors.length === 0, errors.slice(0, 6));
    } finally {
      await P.ctx.close().catch(() => {});
    }
  }
}
