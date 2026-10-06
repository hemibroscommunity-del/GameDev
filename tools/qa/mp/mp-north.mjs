/* ═══ NORTH ON THE WHEEL'S MAPS (v2.3.3061) ═══
 *
 * The owner, on the recommendations for finding your way round the Wheel:
 * "Continue building recommended" -- a north mark on the minimap among them.
 * The maps never turn (up is always north) and nothing said so.
 *
 * On a phone (390 x 844, 3x) in the Wheel:
 *   1. the minimap's frame carries a north bead at the middle of its top band
 *      (window.__btMinimap.north), drawn: brass N strokes on the slate bead,
 *      the box's top-left and top-right corners still the frame;
 *   2. tapping the minimap opens the world map, with a compass at its top
 *      left: the N, the brass north half of the needle, in the map's corner
 *      clear of the zoom buttons and the key, taking no taps (a drag that
 *      starts on it still moves the map);
 *   3. no page errors.
 * Pictures: tools/qa/mp/out/north-{minimap,worldmap}.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const mini = (P) => P.page.evaluate(() => (window.__btMinimap ? JSON.parse(JSON.stringify(window.__btMinimap)) : null));
const like = (p, hex, tol) => !!p && Math.abs(p[0] - ((hex >> 16) & 255)) <= tol && Math.abs(p[1] - ((hex >> 8) & 255)) <= tol && Math.abs(p[2] - (hex & 255)) <= tol;
const BRASS = 0xd8aa58, SLATE = 0x202c32;

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Northbro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!inW, inW);
    if (!inW) return;
    await P.page.addStyleTag({ content:
      '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    let m = null;
    for (let i = 0; i < 40; i++) {
      m = await mini(P);
      if (m && m.wheel && m.under) break;
      await P.page.waitForTimeout(500);
    }
    const n = m && m.north;
    rec.ok(`the minimap's frame carries a north bead at the middle of its top band (x ${n && n.x} of ${m && m.box}, y ${n && n.y}, frame ${m && m.frame})`,
      !!n && n.visible && n.text === 'N' && Math.abs(n.x - m.box / 2) < 0.01 && Math.abs(n.y - m.frame / 2) < 0.01 && n.r >= 6 && n.r <= 8, { n, box: m && m.box, frame: m && m.frame });

    /* ── 1. drawn ── */
    const box = await H.screenshotPixels(P);
    const dpr = box.width / PHONE.width;
    const px = (x, y) => box.at(Math.round(x * dpr), Math.round(y * dpr));
    const cx = m.rootX + n.x, cy = m.topInset + n.y;
    let brass = 0, slate = 0, all = 0;
    for (let y = cy - n.r + 1; y <= cy + n.r - 1; y += 1 / dpr) {
      for (let x = cx - n.r + 1; x <= cx + n.r - 1; x += 1 / dpr) {
        if (Math.hypot(x - cx, y - cy) > n.r - 1.6) continue;   /* inside the rim */
        const p = px(x, y);
        all++;
        if (like(p, BRASS, 60)) brass++;
        else if (like(p, SLATE, 22)) slate++;
      }
    }
    rec.ok(`...drawn: brass N strokes on the slate bead (${brass} brass, ${slate} slate of ${all} device px inside its rim)`,
      all > 200 && brass > all * 0.12 && brass < all * 0.6 && slate > all * 0.3, { brass, slate, all });
    const cornerL = px(m.rootX + 3, m.topInset + 12), cornerR = px(m.rootX + m.box - 3, m.topInset + 12);
    rec.ok('...and the frame either side of it is still the frame (slate)', like(cornerL, SLATE, 16) && like(cornerR, SLATE, 16), { cornerL, cornerR });
    const W = 170, Hh = 160;
    await P.page.screenshot({ path: join(OUT, 'north-minimap.png'),
      clip: { x: PHONE.width - W, y: Math.max(0, Math.round(m.topInset - 10)), width: W, height: Hh } }).catch(() => {});

    /* ── 2. the world map ── */
    const btn = await P.page.evaluate(() => {
      const b = document.querySelector('[data-world-map-open]');
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    });
    rec.ok('a button over the minimap opens the world map (guard)', !!btn, btn);
    if (btn) {
      await P.page.touchscreen.tap(btn.x + btn.w / 2, btn.y + btn.h / 2);
      await P.page.waitForTimeout(900);
      const c = await P.page.evaluate(() => {
        const el = document.querySelector('[data-world-map-north]');
        const cv = document.querySelector('[data-world-map-canvas]');
        if (!el || !cv) return null;
        const r = el.getBoundingClientRect(), rc = cv.getBoundingClientRect();
        const box = (q) => { const e = document.querySelector(q); if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        const t = el.querySelector('text');
        return {
          l: r.left, t: r.top, w: r.width, h: r.height, map: { l: rc.left, t: rc.top, r: rc.right, b: rc.bottom },
          text: t ? t.textContent : null, takesTaps: getComputedStyle(el).pointerEvents !== 'none', under: hit ? hit.getAttribute('data-world-map-canvas') !== null : false,
          zoomIn: box('[data-world-map-zoom-in]'), me: box('[data-world-map-me]'),
        };
      });
      const overlaps = (a, b) => !!a && !!b && a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
      const me = c && { l: c.l, t: c.t, r: c.l + c.w, b: c.t + c.h };
      rec.ok(`the world map has a compass at its top left (${c && c.w}x${c && c.h} at ${c && Math.round(c.l - c.map.l)},${c && Math.round(c.t - c.map.t)} in the map) saying N`,
        !!c && c.text === 'N' && c.w >= 36 && c.l - c.map.l < 20 && c.t - c.map.t < 20, c);
      rec.ok('...clear of the zoom buttons, and taking no taps: the map under it gets them', !!c && !overlaps(me, c.zoomIn) && !overlaps(me, c.me) && !c.takesTaps && c.under, c);
      const shot = await H.screenshotPixels(P);
      const d2 = shot.width / PHONE.width;
      let nb = 0;
      for (let y = c.t + 18; y < c.t + 29; y += 1 / d2) for (let x = c.l + 18; x < c.l + 26; x += 1 / d2) {
        const p = shot.at(Math.round(x * d2), Math.round(y * d2));
        if (like(p, 0xeac675, 50)) nb++;
      }
      rec.ok(`...drawn: the needle's north half in brass (${nb} device px)`, nb > 60, { nb });
      await P.page.screenshot({ path: join(OUT, 'north-worldmap.png'), clip: { x: 0, y: Math.max(0, Math.round(c.map.t - 60)), width: PHONE.width, height: 260 } }).catch(() => {});
      await P.page.evaluate(() => { const b = document.querySelector('[data-world-map-close]'); if (b) b.click(); });
    }
    rec.ok(`no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
