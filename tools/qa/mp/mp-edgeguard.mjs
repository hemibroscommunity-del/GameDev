/* ═══ THE BUTTONS AT THE SCREEN'S LEFT EDGE ANSWER A TAP (v2.3.3374) ═══
 *
 * Owner, 2026-10-18: "Make sure all actions/buttons can be completed in
 * landscape mode and on the computer."
 *
 * The UI review's numbered pictures (tools/qa/ui-review) marked the top bar's
 * logout button COVERED on every sideways screen, and a sideways page's ◂
 * back arrow with it.  What covered them: the iOS edge guard (v2.3.112), an
 * invisible strip 18 px wide down the whole left edge at z 40, appended to the
 * body -- above everything outside the game's wrap.  A touch on it was
 * cancelled, so the left part of each control at the edge did nothing: the
 * logout's left third, the ◂ arrow's, the dashboard's ▴/▼ fold chip's, and
 * upright the band's CLOSE pill and its first column of bag tiles.
 *
 * Since v2.3.3374 the guard is a listener (BroTown.jsx, EDGE_CONTROL): a touch
 * starting in those 18 px is still swallowed on the WORLD -- the bezel swipe
 * cancelled, the movement pad never told -- and goes to a control it lands on.
 *
 * Sideways (844 x 390, touch), each by a REAL touch at x = 10:
 *   1. nothing lies over the logout button at x 10 (it answers there);
 *   2. the ▴ fold chip opens the dashboard column;
 *   3. a drilled page's ◂ arrow goes back;
 *   4. the ▼ chip closes the column again;
 *   5. a thumb at x 8 on the world does NOT start a walk (the guard still
 *      swallows it), where the same drag from x 60 does;
 *   6. Ace's coin flip fits the screen -- its ✕ and tabs on it, its Flip
 *      button reached by scrolling the face (it was off the bottom);
 * upright (390 x 844, touch):
 *   6. the band's first bag tile, touched at x 10, opens its card.
 * Steps 1-4 and 6 fail on the strip; 5 passes on both (it is the guard's own
 * job, kept).
 */
import * as H from './harness.mjs';

const LAND = { width: 844, height: 390 };
const PORT = { width: 390, height: 844 };
const EDGE_X = 10;

/* a real finger, by CDP: down at (x, y), optionally dragged to (x2, y2) and
   held `holdMs`, then up -- returning a read of the page taken while held */
async function touch(P, x, y, { x2 = null, y2 = null, holdMs = 120, read = null } = {}) {
  const cdp = await P.ctx.newCDPSession(P.page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 7 }] });
  if (x2 != null) {
    const n = 8;
    for (let i = 1; i <= n; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (x2 - x) * i / n, y: y + (y2 - y) * i / n, id: 7 }] });
      await P.page.waitForTimeout(30);
    }
  }
  await P.page.waitForTimeout(holdMs);
  const seen = read ? await read() : null;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach().catch(() => {});
  return seen;
}

const busState = (P) => P.page.evaluate(() => {
  const b = window.__broDashPanelBus;
  return b ? { mode: b.state.mode, depth: (b.state.stack || []).length, top: (b.state.stack || []).slice(-1)[0] || null } : null;
});
const boxOf = (P, sel, text) => P.page.evaluate(([s, t]) => {
  const el = Array.from(document.querySelectorAll(s)).find((e) => {
    const r = e.getBoundingClientRect();
    return r.width > 4 && r.height > 4 && (!t || (e.textContent || '').trim() === t);
  });
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { left: Math.round(r.left), top: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), cy: Math.round(r.top + r.height / 2) };
}, [sel, text || null]);

async function arrive(P) {
  await H.enterWorld(P);
  await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
    (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'into the Wheel' }).catch(() => null);
  /* the tutorial's cards stand aside: this is about the edge */
  await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
  await P.page.waitForTimeout(1500);
}

export async function run({ browser, wsPort, webPort, rec }) {
  /* ═══ SIDEWAYS ═══ */
  const P = await H.newPlayer(browser, { name: 'Edgebro', wsPort, webPort, viewport: LAND, touch: true, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stopAlive = H.keepAlive(P, 15000);
  try {
    await arrive(P);

    /* 1. the logout button, at x 10 */
    const lo = await boxOf(P, '.bt-zone-header__logout');
    const at = lo ? await P.page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      return { inLogout: !!(el && el.closest && el.closest('.bt-zone-header__logout')),
        what: el ? el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : '') : 'nothing' };
    }, [EDGE_X, lo.cy]) : null;
    rec.ok('sideways, the logout button is what answers a tap at x 10 (nothing lies over its left part)',
      !!(lo && lo.left < EDGE_X && at && at.inLogout), { lo, at });

    /* 2. the ▴ fold chip opens the dashboard column */
    const chip = await boxOf(P, '[data-land-fold="min"]');
    if (chip) await touch(P, EDGE_X, chip.cy);
    await P.page.waitForTimeout(900);
    const opened = await busState(P);
    rec.ok('a tap at x 10 on the ▴ chip opens the dashboard column', !!chip && chip.left < EDGE_X && !!opened && opened.mode === 'expanded', { chip, opened });

    /* 3. a drilled page's ◂ arrow goes back */
    await P.page.evaluate(() => { const b = window.__broDashPanelBus; b.open('more'); });
    await P.page.waitForTimeout(600);
    await P.page.evaluate(() => { const b = window.__broDashPanelBus; b.push('social'); });
    await P.page.waitForTimeout(900);
    const drilled = await busState(P);
    const back = await boxOf(P, '.bt-land-sheet button', '◂');
    if (back) await touch(P, EDGE_X, back.cy);
    await P.page.waitForTimeout(900);
    const popped = await busState(P);
    rec.ok('a tap at x 10 on a drilled page\'s ◂ arrow goes back a page',
      !!back && back.left < EDGE_X && !!drilled && !!popped && popped.depth === drilled.depth - 1, { back, drilled, popped });

    /* 4. the ▼ chip closes the column */
    const chip2 = await boxOf(P, '[data-land-fold="open"]');
    if (chip2) await touch(P, EDGE_X, chip2.cy);
    await P.page.waitForTimeout(900);
    const shut = await busState(P);
    rec.ok('...and a tap at x 10 on the ▼ chip closes it', !!chip2 && !!shut && shut.mode !== 'expanded', { chip2, shut });

    /* 5. the guard still swallows a thumb at the edge on the world: no walk.
          The same drag from x 60 walks (the control for it). */
    const y = 250;
    const stick = () => P.page.evaluate(() => { const S = window._gameState.current; return { sx: +(S.stickX || 0).toFixed(2), sy: +(S.stickY || 0).toFixed(2) }; });
    const fromEdge = await touch(P, 8, y, { x2: 8 + 70, y2: y, holdMs: 400, read: stick });
    await P.page.waitForTimeout(600);
    const fromPad = await touch(P, 60, y, { x2: 60 + 70, y2: y, holdMs: 400, read: stick });
    rec.ok('a thumb starting at x 8 on the world is still swallowed (no walk); from x 60 the same drag walks',
      !!fromEdge && fromEdge.sx === 0 && fromEdge.sy === 0 && !!fromPad && Math.abs(fromPad.sx) > 0.2, { fromEdge, fromPad });

    /* 6. Ace's coin flip fits a sideways screen: it was ~600px tall on a
          390px screen, centred on a scrim that does not scroll, its tabs off
          the top and its Flip button off the bottom.  Now his header and tabs
          are on screen and the face scrolls to the button, which answers. */
    await P.page.evaluate(() => window.__btAceFlipBus && window.__btAceFlipBus.setOpen(true));
    await P.page.waitForTimeout(1000);
    const ace = await P.page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const R = (e) => { const r = e.getBoundingClientRect(); return { t: Math.round(r.top), b: Math.round(r.bottom), x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
      const flip = btns.find((b) => /^(flip for|pick a stake)/i.test(b.textContent.trim()));
      const close = btns.find((b) => b.getAttribute('aria-label') === 'Close' && /×/.test(b.textContent));
      const tabs = btns.filter((b) => /^(gold|items|records)$/i.test(b.textContent.trim())).map(R);
      let sc = flip;
      while (sc && sc !== document.body) { const cs = getComputedStyle(sc); if (/(auto|scroll)/.test(cs.overflowY) && sc.scrollHeight > sc.clientHeight + 1) break; sc = sc.parentElement; }
      if (sc && sc !== document.body) sc.scrollTop = sc.scrollHeight;
      const f = flip ? R(flip) : null;
      const at = f ? document.elementFromPoint(f.x, f.y) : null;
      return { vh: innerHeight, flip: f, flipAnswers: !!(at && flip.contains(at)), close: close ? R(close) : null, tabs };
    });
    rec.ok('Ace\'s coin flip fits a sideways screen: his ✕ and the tabs on it, and the Flip button scrolled to answers',
      !!ace.flip && ace.flipAnswers && ace.flip.b <= ace.vh && !!ace.close && ace.close.t >= 0
      && ace.tabs.length === 3 && ace.tabs.every((t) => t.t >= 0), ace);
    await P.page.evaluate(() => window.__btAceFlipBus && window.__btAceFlipBus.setOpen(false));
    rec.ok('no page errors sideways', errors.length === 0, errors.slice(0, 3));
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }

  /* ═══ UPRIGHT: the band's first bag tile ═══ */
  const Q = await H.newPlayer(browser, { name: 'Edgeup', wsPort, webPort, viewport: PORT, touch: true, world: 'wheel' });
  const stopAlive2 = H.keepAlive(Q, 15000);
  try {
    await arrive(Q);
    const myId = await H.readState(Q, (S) => S.myId);
    await H.grant(wsPort, myId, 'item', { invKey: 'wood_pine_log', count: 3 }).catch(() => {});
    await H.unfoldBand(Q).catch(() => {});
    await Q.page.waitForTimeout(1200);
    const tile = await Q.page.evaluate(() => {
      const t = Array.from(document.querySelectorAll('[data-bag-key]')).map((e) => ({ e, r: e.getBoundingClientRect() }))
        .filter((o) => o.r.width > 20 && o.r.top > 0 && o.r.bottom < innerHeight).sort((a, b) => a.r.left - b.r.left || a.r.top - b.r.top)[0];
      return t ? { key: t.e.getAttribute('data-bag-key'), left: Math.round(t.r.left), cy: Math.round(t.r.top + t.r.height / 2) } : null;
    });
    if (tile) await touch(Q, EDGE_X, tile.cy);
    await Q.page.waitForTimeout(900);
    const card = await Q.page.evaluate(() => !!document.querySelector('[data-item-detail], .bt-item-detail, .bt-idp, [data-idp]')
      || Array.from(document.querySelectorAll('button')).some((b) => /^(equip|use|eat|sell|drop)$/i.test((b.textContent || '').trim())));
    rec.ok('upright, the band\'s first bag tile touched at x 10 opens its card', !!tile && tile.left < EDGE_X && card, { tile, card });
  } finally {
    stopAlive2();
    await Q.ctx.close().catch(() => {});
  }
}
