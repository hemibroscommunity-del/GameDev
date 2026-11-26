/* ═══ v2.3.6786: THE GOLD ON THE TOP BAR, BETWEEN BROTOWN AND THE SPIN (card UI3, PR 7) ═══
 *
 * The owner, 2026-11-26: "Move gold amount in between daily spin and brotown
 * on top bar".  Real players against a real worker, IN THE WORLD
 * (`world: 'wheel'`), at four phone shapes (375 x 667 and 390 x 844 upright,
 * 667 x 375 and 844 x 390 sideways) and a computer playing wide (1440 x 900):
 *   1. the gold's DRAWN box ([data-topbar-gold]) lies between the name's box
 *      (the clear "BroTown" and the logo over it) and the spin's button, on
 *      the bar;
 *   2. the name's centre is the bar's and the screen's centre within 1 px,
 *      with the gold at the new character's purse and at a seven-figure one
 *      (9,999,999 granted by the worker), and nothing overlaps: the gold
 *      neither the logo nor the name nor the spin; the door's column not the
 *      middle's;
 *   3. (upright 390) buy or sell at Diego's (H.approachNpc): after the
 *      server's event the bar's number equals Gear's reading of the purse
 *      and the worker's;
 *   4. with the spin's button gone (a worker without the spin: the page's cap
 *      taken away) the gold has not moved, and the corner is empty;
 *   5. `?topgold=0`: no gold, remembered on the device, and the bar as on the
 *      base (the door's column its own width, the right the spin's alone);
 *   6. no page errors.
 * Pictures (deviceScaleFactor 2): docs/shots/topgold-<view>-{gold,big,nospin}.png,
 * and the base's bar under ?topgold=0: docs/shots/topgold-<view>-before.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
export const lane = 'full';

const VIEWS = [
  { id: '375x667', viewport: { width: 375, height: 667 }, touch: true },
  { id: '390x844', viewport: { width: 390, height: 844 }, touch: true, sale: true, before: true },
  { id: '667x375', viewport: { width: 667, height: 375 }, touch: true, before: true },
  { id: '844x390', viewport: { width: 844, height: 390 }, touch: true },
  { id: 'computer', viewport: { width: 1440, height: 900 }, touch: false, wide: true, before: true },
];
const BIG = 9999999;
const KEY = 'slime-remnants';

/* the page's own init: the harness's `loginspin=0` off the address (so the
   spin's button shows, as on a player's phone; mp-loginspin's THE DEFAULT
   ADDRESS) and the tutorial skipped */
const QA_INIT = () => {
  try {
    const u = new URL(location.href);
    if (u.searchParams.get('loginspin') === '0') { u.searchParams.delete('loginspin'); history.replaceState(history.state, '', u.pathname + u.search + u.hash); }
  } catch (e) { /* the address as it was */ }
  try { localStorage.setItem('bt_tutorial_skipped', '1'); } catch (e) { /* private window */ }
};

const look = (P) => P.page.evaluate(() => {
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); if (!b.width && !b.height) return null; return { l: +b.left.toFixed(1), r: +b.right.toFixed(1), t: +b.top.toFixed(1), b: +b.bottom.toFixed(1), w: +b.width.toFixed(1) }; };
  const q = (s) => document.querySelector(s);
  const g = q('[data-topbar-gold]');
  const S = window._gameState && window._gameState.current;
  return {
    vw: innerWidth,
    header: r(q('.bt-zone-header')), left: r(q('.bt-zone-header__left')), out: r(q('.bt-zone-header__logout')),
    mid: r(q('.bt-zone-header__mid')), title: r(q('[data-zone-title]')), logo: r(q('[data-topbar-logo]')),
    right: r(q('.bt-zone-header__balance')), spin: r(q('[data-login-spin-btn]')),
    gold: r(g), goldN: g ? g.getAttribute('data-topbar-gold') : null, goldText: g ? (g.textContent || '').trim() : null,
    goldLabel: g ? g.getAttribute('aria-label') : null,
    coin: r(g && g.querySelector('img')), num: r(g && g.querySelector('.bt-zone-header__goldnum')),
    test: r(q('[data-test-mode-tag]')), nml: r(q('.bt-zone-header .bt-nml-pill')),
    coins: S && S.rpg ? S.rpg.coins : null, fromServer: !!(S && S._rpgFromServer),
    stored: (() => { try { return localStorage.getItem('bt_topgold'); } catch (e) { return 'x'; } })(),
  };
});
const over = (a, b) => !!a && !!b && a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5;
const cx = (b) => (b.l + b.r) / 2;

export async function run({ browser, wsPort, webPort, rec }) {
  const SHOTS = join(H.REPO, 'docs/shots');
  mkdirSync(SHOTS, { recursive: true });
  const errors = [];
  const until = async (P, pred, ms = 20000) => { let v = null; const end = Date.now() + ms; do { v = await look(P); if (pred(v)) return v; await P.page.waitForTimeout(300); } while (Date.now() < end); return v; };
  const placed = (T, a, why) => {
    const nameR = Math.max(a.title ? a.title.r : 0, a.logo ? a.logo.r : 0);
    rec.ok(T + `1 (${why}): the gold "${a.goldText}" (${a.gold && a.gold.l}-${a.gold && a.gold.r}) between the name (to ${nameR}) and the spin (from ${a.spin && a.spin.l}), on the bar`,
      !!a.gold && !!a.spin && !!a.header && a.gold.l >= nameR && a.gold.r <= a.spin.l + 0.5 && a.gold.t >= a.header.t && a.gold.b <= a.header.b, a);
    const c = a.title ? cx(a.title) : null;
    const hc = a.header ? cx(a.header) : null;
    rec.ok(T + `2 (${why}): the name's centre ${c} is the bar's ${hc} and the screen's ${a.vw / 2} within 1 px`,
      c != null && Math.abs(c - hc) <= 1 && Math.abs(c - a.vw / 2) <= 1, { title: a.title, header: a.header, left: a.left, right: a.right, mid: a.mid });
    const hits = [['gold', 'logo'], ['gold', 'title'], ['gold', 'spin'], ['gold', 'test'], ['gold', 'nml'], ['out', 'mid'], ['out', 'logo'], ['coin', 'num']].filter(([x, y]) => over(a[x], a[y]));
    rec.ok(T + `2 (${why}): nothing overlaps (${hits.map((h) => h.join('/')).join(', ') || 'none'})`, hits.length === 0, a);
  };

  for (const V of VIEWS) {
    const T = `[${V.id}] `;
    const shot = (P, name) => P.page.screenshot({ path: join(SHOTS, `topgold-${V.id}-${name}.png`), clip: { x: 0, y: 0, width: V.viewport.width, height: Math.min(V.viewport.height, 120) } }).catch(() => {});

    /* ── 5 first, where pictured: the base's bar (?topgold=0) ── */
    if (V.before) {
      const B = await H.newPlayer(browser, { name: 'Before' + V.id.slice(0, 3), wsPort, webPort, viewport: V.viewport, touch: V.touch, wide: !!V.wide, world: 'wheel', dpr: 2, init: QA_INIT, query: 'topgold=0' });
      B.page.on('pageerror', (e) => errors.push(V.id + ' before: ' + String(e && e.message || e).slice(0, 200)));
      await H.enterWorld(B); await H.pastWelcome(B);
      const b = await until(B, (x) => !!x.spin && x.fromServer);
      await B.page.waitForTimeout(600);
      await shot(B, 'before');
      rec.ok(T + `5: ?topgold=0: no gold on the bar, remembered on the device (bt_topgold "${b.stored}")`, !b.gold && b.stored === '0', b);
      rec.ok(T + `5: ...and the bar as on the base: the door's column its own width (${b.left && b.left.w} = the door's ${b.out && b.out.w}), the right the spin's alone (${b.right && b.right.w}, the spin ${b.spin && b.spin.w})`,
        !!b.left && !!b.out && Math.abs(b.left.w - b.out.w) <= 1 && !!b.right && !!b.spin && b.right.w <= b.spin.w + 1, b);
      await B.ctx.close().catch(() => {});
    }

    const P = await H.newPlayer(browser, { name: 'Gold' + V.id.slice(0, 3), wsPort, webPort, viewport: V.viewport, touch: V.touch, wide: !!V.wide, world: 'wheel', dpr: 2, init: QA_INIT });
    P.page.on('pageerror', (e) => errors.push(V.id + ': ' + String(e && e.message || e).slice(0, 200)));
    await H.enterWorld(P); await H.pastWelcome(P);
    const stopAlive = H.keepAlive(P);
    try {
      let a = await until(P, (x) => !!x.gold && !!x.spin);
      await P.page.waitForTimeout(600);
      a = await look(P);
      rec.ok(T + `the gold shows the page's purse once the worker's record has come ("${a.goldText}", the purse ${a.coins}; "${a.goldLabel}")`,
        a.fromServer && a.goldN === String(a.coins) && a.goldLabel === 'Gold: ' + Number(a.coins).toLocaleString('en-US'), a);
      placed(T, a, 'the new character\'s ' + a.coins);
      await shot(P, 'gold');

      /* seven figures */
      const id = await H.readState(P, (S) => S.myId);
      await H.grant(wsPort, id, 'gold', { amount: BIG - Number(a.coins || 0) }).catch(() => {});
      a = await until(P, (x) => x.goldN === String(BIG));
      await P.page.waitForTimeout(700);   /* past its pop */
      a = await look(P);
      rec.ok(T + `a seven-figure purse: the bar says "${a.goldText}", the reader "${a.goldLabel}"`, a.goldN === String(BIG) && a.goldLabel === 'Gold: 9,999,999', a);
      placed(T, a, '9,999,999');
      await shot(P, 'big');

      /* ── 4. the spin's button gone: the gold has not moved ── */
      const g0 = a.gold;
      await P.page.evaluate(() => { const S = window._gameState.current; S.__qaCaps = S._serverCaps; S._serverCaps = Object.assign({}, S._serverCaps, { loginspin: false }); });
      const n = await until(P, (x) => !x.spin, 5000);
      await P.page.waitForTimeout(300);
      await shot(P, 'nospin');
      rec.ok(T + `4: with the spin's button gone the gold has not moved (${g0 && g0.l}-${g0 && g0.r} -> ${n.gold && n.gold.l}-${n.gold && n.gold.r}), the corner right of it empty`,
        !n.spin && !!n.gold && !!g0 && Math.abs(n.gold.l - g0.l) <= 0.5 && Math.abs(n.gold.r - g0.r) <= 0.5 && !!n.right && n.right.r - n.gold.r > 40, { g0, n: n.gold, right: n.right });
      rec.ok(T + `4: ...and the name still centred (${n.title && cx(n.title)} on ${n.vw / 2})`, !!n.title && Math.abs(cx(n.title) - n.vw / 2) <= 1, n);
      await P.page.evaluate(() => { const S = window._gameState.current; S._serverCaps = S.__qaCaps; });

      /* ── 3. a sale at Diego's: the bar equals Gear and the worker ── */
      if (V.sale) {
        await H.grant(wsPort, id, 'item', { invKey: KEY, count: 5 }).catch(() => {});
        await P.page.waitForTimeout(1500);
        await H.approachNpc(P, 'shopkeeper_bro');
        const opened = await H.waitFor(P, () => !!document.querySelector('[data-shop-panel]'), (v) => v === true, { timeout: 12000, label: 'shop open' }).then(() => true).catch(() => false);
        rec.ok(T + '3: a tap on Diego opens his shop', opened);
        const c0 = Number((await look(P)).coins);
        await P.page.evaluate((k) => { try { window.__broShopBus.setSel(k, 'bag'); } catch (e) { /* the shop's own */ } }, KEY);
        for (let i = 0; i < 30; i++) {
          const ready = await P.page.evaluate(() => { const b = document.querySelector('[data-shop-act]'); return !!b && !b.disabled && /sell/i.test(b.textContent || ''); });
          if (ready) break;
          await P.page.waitForTimeout(200);
        }
        await P.page.evaluate(() => { const b = document.querySelector('[data-shop-act]'); if (b) b.click(); });
        let s = await until(P, (x) => Number(x.coins) > c0, 10000);
        await P.page.waitForTimeout(800);
        s = await look(P);
        const srv = await H.adminPlayer(wsPort, id).then((p) => (p && p.rpg ? p.rpg.coins : null)).catch(() => null);
        await P.page.evaluate(() => { try { window.__broShopBus.setOpen(false); } catch (e) { /* closed */ } });
        await H.dashOpen(P, 'gear').catch(() => {});
        let gear = null;
        for (let i = 0; i < 30 && gear == null; i++) {
          gear = await P.page.evaluate(() => { const e = document.querySelector('[data-gear-gold]'); return e ? e.getAttribute('data-gear-gold') : null; });
          if (gear == null) await P.page.waitForTimeout(300);
        }
        const bar = (await look(P)).goldN;
        rec.ok(T + `3: after the sale (the purse ${c0} -> ${s.coins}) the bar's ${bar} equals Gear's ${gear} and the worker's ${srv}`,
          Number(s.coins) > c0 && bar === String(gear) && Number(bar) === Number(srv), { c0, coins: s.coins, bar, gear, srv });
        await H.closeDest(P).catch(() => {});
      }
    } finally {
      stopAlive();
      await P.ctx.close().catch(() => {});
    }
  }
  rec.ok(`6: no page errors (${errors.length})`, errors.length === 0, errors);
}
