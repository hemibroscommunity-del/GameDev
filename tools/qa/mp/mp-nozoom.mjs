/* ═══ NO DOUBLE-TAP ZOOM IN THE STAT WINDOW, OR ANYWHERE (v2.3.3442) ═══
 *
 * Owner: "Double tap to zoom in is enabled during skill point application
 * window.  Disable that.  I got stuck there."
 *
 * html and body are touch-action:none, but a browser counts an element's
 * touch-action only up to the nearest box that scrolls.  The stat window's
 * middle scrolls (InfoPopup's [data-infopopup-scroll]) and set no touch-action
 * of its own, so a double tap on its words, its scene or its meter was a
 * double tap on `auto`: iPhone Safari zoomed the whole page, and with the page
 * itself never pannable there was no way back out.  Some fifty other windows'
 * scrollers were the same.  game.css now gives every element `manipulation`
 * (all that `auto` allows except the double tap) as its weakest rule.
 *
 * Chromium honours user-scalable=no, so it never zooms and cannot show the
 * bug itself; what it can show is the cause, exactly: an element whose
 * computed touch-action is `auto` is one a double tap may zoom on.  So, on a
 * touch phone, with the stat window open from the Points screen as a player
 * opens it:
 *   1. no element on the page is `auto` -- the window's scroller, its words,
 *      its scene, its stepper, the dashboard behind it (it failed on main:
 *      hundreds were);
 *   2. inside the window, no chain from an element up to the box that
 *      scrolls it is `auto` all the way (touch-action intersects along it,
 *      and an all-auto chain is exactly what a double tap zooms on);
 *   3. what named its own touch-action kept it: the game's canvas `none`,
 *      the window's +/- and close `manipulation`, html and body `none`;
 *   4. the stepper still steps (a +, a +, a -) and the window still scrolls
 *      by touch rules (`manipulation` pans); no page errors.
 */
import * as H from './harness.mjs';

const tapSel = (P, sel) => P.page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return false;
  const r = el.getBoundingClientRect();
  for (const type of ['pointerdown', 'pointerup']) {
    el.dispatchEvent(new PointerEvent(type, {
      clientX: r.left + r.width / 2, clientY: r.top + r.height / 2,
      bubbles: true, cancelable: true, pointerId: 9, pointerType: 'touch',
    }));
  }
  return true;
}, sel);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Zoomless', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true,
  });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  try {
    await H.enterWorld(P);
    await P.page.waitForTimeout(2200);

    /* a weapon and unspent points, so the Points screen's stat has its [+]
       and the window opens with its stepper (mp-statdemo's setup) */
    await P.page.evaluate(() => {
      const R = window._gameState.current.rpg;
      R.weapon = { type: 'greatsword', tier: 'common', tierMult: 1.12, gearBase: 'copper',
        name: 'Test Sword', quality: 'normal', element1: null, element2: null, hardness: 0, temper: 0 };
      R.activeSlot = 'melee';
      if (!R.prog3) R.prog3 = {};
      R.prog3.sk = { ...(R.prog3.sk || {}), sword: { level: 8, xp: 0 } };
      /* three sword-lane points to spend (prog3.js prog3Pool / prog3PoolBy) */
      R.prog3.pool = 3;
      R.prog3.poolBy = { sword: 3 };
      try { window.__broDashPanelBus.open('hero'); window.__broDashPanelBus.expand(); } catch (e) {}
    });
    await P.page.waitForTimeout(900);
    await tapSel(P, '[role="button"][data-section="Build"]');
    await P.page.waitForTimeout(900);
    await H.openPointCols(P, ['sword']);
    const opened = await tapSel(P, '[data-prog3-row$=":luck"]');
    let win = null;
    for (let i = 0; i < 30 && !win; i++) {
      await P.page.waitForTimeout(150);
      win = await P.page.evaluate(() => {
        const w = document.querySelector('[data-infopopup]');
        return w ? { title: w.getAttribute('data-infopopup'), scroll: !!w.querySelector('[data-infopopup-scroll]'),
          step: !!w.querySelector('[data-infopopup-step="up"]') } : null;
      });
    }
    rec.ok('the stat window opens from the Points screen with its scrolling middle and its stepper (guard)',
      opened && !!win && win.scroll && win.step, { opened, win });

    /* ── 1. nothing on the page is `auto` ── */
    const census = await P.page.evaluate(() => {
      const all = [...document.querySelectorAll('*')];
      const auto = all.filter((el) => getComputedStyle(el).touchAction === 'auto');
      const name = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '')
        + [...el.attributes].filter((a) => a.name.startsWith('data-')).slice(0, 2).map((a) => '[' + a.name + ']').join('');
      return { total: all.length, auto: auto.length, sample: auto.slice(0, 8).map(name) };
    });
    rec.ok(`1. no element on the page is touch-action auto, so none can be double-tapped into a zoom (${census.auto} of ${census.total})`,
      census.total > 200 && census.auto === 0, census);

    /* ── 2. inside the window, no chain up to its scroller carries `auto` ── */
    const chains = await P.page.evaluate(() => {
      const w = document.querySelector('[data-infopopup]');
      const scrolls = (el) => { const cs = getComputedStyle(el); return /(auto|scroll)/.test(cs.overflowY + ' ' + cs.overflowX); };
      let bad = 0, n = 0;
      const samples = [];
      for (const el of w.querySelectorAll('*')) {
        n++;
        let cur = el, seen = [];
        while (cur && cur !== document.documentElement) {
          const ta = getComputedStyle(cur).touchAction;
          seen.push(ta);
          if (scrolls(cur)) break;
          cur = cur.parentElement;
        }
        /* touch-action intersects along the chain: one value that is not
           auto (manipulation, pan-y, none) already takes the double tap
           away -- a tap there zooms only if the whole chain is auto */
        if (seen.every((v) => v === 'auto')) { bad++; if (samples.length < 4) samples.push(el.tagName + ':' + seen.join('>')); }
      }
      const sc = w.querySelector('[data-infopopup-scroll]');
      return { n, bad, samples, scroller: sc ? getComputedStyle(sc).touchAction : null };
    });
    rec.ok(`2. inside the stat window no element's chain up to the box that scrolls it is auto all the way, which is what a double tap zooms on (${chains.bad} of ${chains.n}); its scroller is "${chains.scroller}"`,
      chains.n > 10 && chains.bad === 0 && chains.scroller === 'manipulation', chains);

    /* ── 3. what named its own touch-action kept it ── */
    const kept = await P.page.evaluate(() => {
      const ta = (sel) => { const el = document.querySelector(sel); return el ? getComputedStyle(el).touchAction : null; };
      return {
        canvas: ta('canvas.brotown-canvas'), html: getComputedStyle(document.documentElement).touchAction,
        body: getComputedStyle(document.body).touchAction,
        plus: ta('[data-infopopup-step="up"]'), close: ta('[data-infopopup-x]'),
      };
    });
    rec.ok('3. what named its own touch-action kept it: the game canvas, html and body none, the window\'s + and × manipulation',
      kept.canvas === 'none' && kept.html === 'none' && kept.body === 'none' && kept.plus === 'manipulation' && kept.close === 'manipulation', kept);

    /* ── 4. the stepper still steps ── */
    const count = () => P.page.evaluate(() => {
      const up = document.querySelector('[data-infopopup-step="up"]');
      const row = up && up.parentElement;
      const m = row ? (row.textContent || '').match(/\d+/) : null;
      return m ? +m[0] : null;
    });
    const n0 = await count();
    await tapSel(P, '[data-infopopup-step="up"]'); await P.page.waitForTimeout(120);
    await tapSel(P, '[data-infopopup-step="up"]'); await P.page.waitForTimeout(120);
    const n2 = await count();
    await tapSel(P, '[data-infopopup-step="down"]'); await P.page.waitForTimeout(120);
    const n1 = await count();
    rec.ok(`4. the stepper still steps: ${n0} -> ${n2} -> ${n1}`, n0 != null && n2 === Math.min(3, n0 + 2) && n1 === n2 - 1, { n0, n2, n1 });

    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
