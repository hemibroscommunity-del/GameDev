/* ═══ THE TOP BAR, LARGER, AND EVERYTHING ON IT WHOLE (v2.3.3765) ═══
 *
 * The owner: "Make the info on the top ribbon larger (icon for achievement
 * points, numbers, titles, larger). It can fit more".  Everything on the bar
 * is sized by one factor, --zk (game.css .bt-zone-header), set per layout:
 * the largest that fits.  This scenario is how those were found and how they
 * are held: on each layout, with the bar at its fullest -- No man's land's
 * pill beside the title, a purse of 2,550,000, 12,400 AP -- and again with the
 * XP bar up in the title's place:
 *   1. nothing on the bar is cut off (the title's text whole, the purse's and
 *      the AP's numbers whole) or overlapping, all of it inside the bar and on
 *      the screen, at 320, 360, 375, 390 and 430 upright, sideways at
 *      667 x 375, 844 x 390 and 568 x 320, and on a computer's wide layout;
 *   2. the XP bar fits in the title's place;
 *   3. the bar's size is the layout's --zk, larger than before (1) where it
 *      fits, and the minimap's box starts below the bar;
 *   4. no page errors.
 *
 *   node tools/qa/mp/run.mjs topbar
 *   BT_TOPBAR_SWEEP=1   on each layout, the largest --zk from 1.6 down that
 *                       passes 1-2 (how game.css's numbers were chosen)
 *   BT_TOPBAR_ONLY=320x640,1440x900   only those layouts
 * Pictures: tools/qa/mp/out/topbar-<w>x<h>.png (and -xp).
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SWEEP = !!process.env.BT_TOPBAR_SWEEP;

/* the bar at its fullest: a rich purse and many points, kept so between the
   worker's own writes */
const FILL = (P, xp) => P.page.evaluate((xp) => {
  const S = window._gameState.current;
  if (S.rpg) S.rpg.coins = 2550000;
  S._achv = Object.assign({}, S._achv || {}, { ap: 12400 });
  if (xp) {
    window.__btXpHold = true;
    S._xpBar = { cat: 'sword', level: 24, xp: 4510, need: 12000, frac: 0.376, gain: 125, gainAt: Date.now(), seq: 7, at: Date.now(), up: false, fromLevel: 24, fromFrac: 0.37 };
  } else {
    window.__btXpHold = false;
    S._xpBar = null;
  }
}, xp);

/* every piece of the bar, whether its text is whole, and what overlaps */
const MEASURE = (P) => P.page.evaluate(() => {
  const r = (el) => { if (!el) return null; const q = el.getBoundingClientRect(); return q.width > 0 && q.height > 0 ? { l: q.left, r: q.right, t: q.top, b: q.bottom } : null; };
  const hdr = document.querySelector('.bt-zone-header');
  const cut = (el) => !!el && el.scrollWidth > el.clientWidth + 1;
  const title = document.querySelector('[data-zone-title]');
  const xpOn = !!document.querySelector('.bt-zone-header__mid--xp');
  const pieces = {
    door: r(document.querySelector('.bt-zone-header__logout')),
    ap: r(document.querySelector('[data-ap-chip]')),
    tod: xpOn ? null : r(document.querySelector('.bt-zone-header__tod')),
    title: xpOn ? null : r(title),
    pill: xpOn ? null : r(document.querySelector('[data-nml-badge] .bt-nml-pill__body')),
    purse: r(document.querySelector('[data-purse]')),
    xp: xpOn ? r(document.querySelector('.bt-xp-bar.is-on')) : null,
  };
  /* the XP bar's own pieces must sit inside it */
  let xpOver = null;
  if (xpOn) {
    const bar = document.querySelector('.bt-xp-bar.is-on');
    const b = bar && bar.getBoundingClientRect();
    if (b) {
      for (const k of bar.children) {
        const q = k.getBoundingClientRect();
        if (q.width > 0 && (q.left < b.left - 1 || q.right > b.right + 1)) xpOver = (xpOver || []).concat(k.className || k.tagName);
      }
    }
  }
  const names = Object.keys(pieces).filter((k) => pieces[k]);
  const hits = [];
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = pieces[names[i]], c = pieces[names[j]];
      if (names[i] === 'xp' || names[j] === 'xp') {
        /* the XP bar lies over the middle column: it may not reach the door, the AP or the purse */
        if (!['door', 'ap', 'purse'].includes(names[i] === 'xp' ? names[j] : names[i])) continue;
      }
      if (Math.min(a.r, c.r) - Math.max(a.l, c.l) > 0.5 && Math.min(a.b, c.b) - Math.max(a.t, c.t) > 0.5) hits.push(names[i] + '/' + names[j]);
    }
  }
  const h = r(hdr);
  const out = names.filter((k) => h && (pieces[k].l < h.l - 0.5 || pieces[k].r > h.r + 0.5 || pieces[k].t < h.t - 0.5 || pieces[k].b > h.b + 0.5));
  const purse = document.querySelector('[data-purse] span'), apEl = document.querySelector('[data-ap-chip]');
  const ap = apEl && apEl.getBoundingClientRect().width > 0 ? apEl.querySelector('span') : null;
  return {
    vw: innerWidth, zk: hdr ? +getComputedStyle(hdr).getPropertyValue('--zk') || 1 : null, barH: h ? Math.round(h.b - h.t) : null,
    titleCut: xpOn ? false : cut(title), titleText: title ? title.textContent : null,
    purseText: purse ? purse.textContent : null, apText: ap ? ap.textContent : null,
    hits, out, xpOver, xpOn, pill: !!pieces.pill || xpOn,
    mini: window.__btWheelMini ? window.__btWheelMini.top : null, hdrB: h ? h.b : null,
  };
});
/* on a narrow bar (an upright phone) the big numbers are said short
   (game/barNumbers.js), and while the XP bar is up the AP steps out */
const fits = (m) => !m.titleCut && m.titleText === 'BroTown' && m.hits.length === 0 && m.out.length === 0 && !m.xpOver
  && m.purseText === (m.vw < 430 ? '2.55M' : '2,550,000') && (m.apText === (m.vw < 430 ? '12.4K' : '12,400') || (m.xpOn && m.vw < 430 && m.apText == null)) && m.pill;

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const errors = [];
  const pages = [];
  try {
    /* one phone and one computer, both walked onto No man's land 1's ring */
    const LONG = (await H.wheelGeom()).long;
    const { WHEEL_SPAWNS, WHEEL_CENTRE } = await import(H.REPO + '/server/src/wheelspawns.js');
    const { NML } = await import(H.REPO + '/src/data/noMansLandRings.js');
    const T = NML.TIER * LONG;
    const r0 = Math.max(NML.SAFE_R || 0, NML.HUB + (NML.FIRST_TIER - 1) * T), r1 = NML.HUB + NML.FIRST_TIER * T;
    const land = Object.keys(WHEEL_SPAWNS)[0], a = WHEEL_SPAWNS[land].anchor;
    const L = Math.hypot(a[0] - WHEEL_CENTRE[0], a[1] - WHEEL_CENTRE[1]);
    const spot = { x: Math.round(WHEEL_CENTRE[0] + (a[0] - WHEEL_CENTRE[0]) / L * (r0 + r1) / 2), y: Math.round(WHEEL_CENTRE[1] + (a[1] - WHEEL_CENTRE[1]) / L * (r0 + r1) / 2) };
    const enter = async (P, tag) => {
      P.page.on('pageerror', (e) => errors.push(tag + ': ' + String((e && e.message) || e).slice(0, 200)));
      await H.enterWorld(P);
      await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'into the Wheel' });
      const id = await H.readState(P, (S) => S.myId);
      await H.devOp(wsPort, 'quests', id);
      await H.devOp(wsPort, 'vitals', id, { heal: true, god: true, godMinutes: 30 });
      await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
      await H.hopTo(P, spot.x, spot.y, { tries: 120, step: 150 });
      return H.waitFor(P, () => (window.__btNmlBadge ? window.__btNmlBadge().lvl : 0), (v) => v > 0, { timeout: 8000, label: 'No man\'s land' }).catch(() => 0);
    };
    /* the harness's keep-alive key: a page left alone two minutes while the
       other layouts are measured is logged out (mp-doublejump's way) */
    let alive = true;
    const keepAlive = (P) => (async () => { while (alive) { await P.page.keyboard.press('Control').catch(() => {}); for (let i = 0; i < 40 && alive; i++) await P.page.waitForTimeout(500).catch(() => {}); } })();
    const phone = await H.newPlayer(browser, { name: 'Barbro', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, dpr: 1, world: 'wheel' });
    pages.push(phone);
    keepAlive(phone);
    const lp = await enter(phone, 'phone');
    rec.ok(`the phone in No man's land ${lp} (guard)`, lp > 0);
    const desk = await H.newPlayer(browser, { name: 'Bardesk', wsPort, webPort, viewport: { width: 1440, height: 900 }, wide: true, guest: true, world: 'wheel' });
    pages.push(desk);
    keepAlive(desk);
    const ld = await enter(desk, 'desk');
    rec.ok(`the computer in No man's land ${ld} (guard)`, ld > 0);

    const layouts = [[phone, 320, 640], [phone, 360, 780], [phone, 375, 812], [phone, 390, 844], [phone, 430, 932],
      [phone, 667, 375], [phone, 844, 390], [phone, 568, 320], [desk, 1440, 900]];
    const only = process.env.BT_TOPBAR_ONLY ? new Set(process.env.BT_TOPBAR_ONLY.split(',')) : null;   /* e.g. 320x640 */
    for (const [P, w, h] of layouts) {
      if (only && !only.has(`${w}x${h}`)) continue;
      await P.page.setViewportSize({ width: w, height: h });
      await P.page.waitForTimeout(1500);
      const tag = `${w} x ${h}${P === desk ? ' (computer)' : ''}`;
      if (SWEEP) {
        let best = null;
        for (let k = 1.6; k >= 0.999; k -= 0.05) {
          await P.page.evaluate((k) => {
            let st = document.getElementById('qa-zk');
            if (!st) { st = document.createElement('style'); st.id = 'qa-zk'; document.head.appendChild(st); }
            st.textContent = `.bt-zone-header{--zk:${k.toFixed(2)} !important}`;
          }, k);
          let ok = true;
          for (const xp of [false, true]) {
            await FILL(P, xp);
            await P.page.waitForTimeout(700);
            if (!fits(await MEASURE(P))) { ok = false; break; }
          }
          if (ok) { best = +k.toFixed(2); break; }
        }
        await P.page.evaluate(() => { const st = document.getElementById('qa-zk'); if (st) st.remove(); });
        console.log(`    SWEEP ${tag}: the largest --zk that fits is ${best}`);
        rec.ok(`sweep ${tag}: a --zk that fits (${best})`, best != null, best);
        continue;
      }
      for (const xp of [false, true]) {
        await FILL(P, xp);
        await P.page.waitForTimeout(900);
        const m = await MEASURE(P);
        await P.page.screenshot({ path: join(OUT, `topbar-${w}x${h}${xp ? '-xp' : ''}.png`), clip: { x: 0, y: 0, width: w, height: Math.min(h, 90) } }).catch(() => {});
        rec.ok(`1${xp ? '/2' : ''}. ${tag}${xp ? ', the XP bar up' : ''}: at --zk ${m.zk} (the bar ${m.barH} px) nothing cut off${m.titleCut ? ' (THE TITLE)' : ''} or overlapping (${m.hits.join(', ') || 'none'}), all of it in the bar (${m.out.join(', ') || 'yes'}) -- "${m.titleText}", ${m.purseText} gold, ${m.apText} AP`,
          fits(m), m);
        if (!xp) rec.ok(`3. ${tag}: larger than before where it fits (--zk ${m.zk}), and the minimap's box starts below the bar (${m.mini} vs ${m.hdrB && Math.round(m.hdrB)})`,
          m.zk >= 1 && (m.mini == null || m.mini >= m.hdrB - 1), m);
      }
    }
    for (const P of pages) await FILL(P, false);
    alive = false;
    rec.ok(`4. no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  } finally {
    for (const P of pages) await P.ctx.close().catch(() => {});
  }
}
