/* A FIRST-TIME PLAYER GETS A WHOLE SCREEN, NOT A STRIP (v2.3.1975).
 *
 * Owner, with a screenshot from the FIRST person ever to play-test the game,
 * on brotown.net from a phone: the world squashed into a band at the top, the
 * joysticks floating in black below it, the dashboard fine at the bottom.
 * Unplayable, and the third time this symptom has reached him (the judging
 * session, then v2.3.1740).
 *
 * ── A THEORY THAT WAS WRONG, KEPT BECAUSE IT COST AN HOUR ──
 * The obvious suspect was the keyboard guard in BroTown.jsx's resize():
 *
 *     if (vv && _typing && window.innerHeight - vhFull > 100) return;
 *
 * mp-viewport (v2.3.1740) stubs the visualViewport gap but never focuses a
 * text field, so `_typing` is false there and the guard never fires — and a
 * FIRST-TIME player is the one person who has just typed into the name box,
 * so on their run both halves of that condition are true at once. It fit the
 * evidence, including the number: an unsized <canvas> is 300x150, and "a
 * ~150px strip" is what every report of this has said.
 *
 * It is not the cause. The first-run-with-a-keyboard half of this scenario
 * was written to prove it and PASSES on the pre-watchdog build. Written down
 * rather than deleted so the next person does not spend the same hour.
 *
 * ── WHAT IS ACTUALLY BEING TESTED ──
 * Measured off the owner's screenshot: the region under the strip is
 * #10181D, the page's own background — so the canvas really is short and we
 * are seeing the wrap behind it, not the canvas painting void. It is ~12% of
 * the page viewport where it should be ~56%.
 *
 * Three fixes have now chased three different triggers into the same state,
 * and a fourth arrived anyway. Every trigger is a different way for resize()
 * to run once against a viewport that is not the real one and never be called
 * again — and resize() is edge-triggered, so it depends on the browser
 * PROMISING to tell us. The list of browsers that break that promise is not a
 * list anyone can finish.
 *
 * So the second half of this scenario stops guessing the trigger and tests
 * the PROPERTY, by breaking the canvas directly — no event fired, nothing for
 * a ResizeObserver to see — and requiring the game to come back on its own.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

/** The canvas, the dashboard band, and the space the world should fill. */
const geometry = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas.brotown-canvas') || document.querySelector('canvas');
  const cr = c ? c.getBoundingClientRect() : null;
  const wrap = document.querySelector('.brotown-wrap');
  const dashH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dash-h')) || 0;
  return {
    innerH: window.innerHeight,
    vvH: window.visualViewport ? Math.round(window.visualViewport.height) : null,
    gap: window.visualViewport ? Math.round(window.innerHeight - window.visualViewport.height) : null,
    canvasCssH: cr ? Math.round(cr.height) : null,
    canvasCssW: cr ? Math.round(cr.width) : null,
    canvasAttrH: c ? c.height : null,
    canvasAttrW: c ? c.width : null,
    wrapH: wrap ? Math.round(wrap.getBoundingClientRect().height) : null,
    dashH: Math.round(dashH),
    focused: document.activeElement ? document.activeElement.tagName : null,
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const ctx = await browser.newContext({
    viewport: PHONE, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
      + ' (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const page = await ctx.newPage();

  /* ═══ A PHONE KEYBOARD, WHICH PLAYWRIGHT DOES NOT EMULATE ═══
     On iOS the keyboard shrinks visualViewport.height while innerHeight stays
     put — that gap IS the keyboard, and it is what the guard keys off. Here it
     is tied to whether a text field is focused, so it opens when the player
     taps the name box and closes when they leave it, exactly as a real one
     does. `resize` is dispatched on the visualViewport so the app hears about
     it the same way too. */
  await page.addInitScript((p) => {
    window.BROTOWN_WS_URL = `ws://127.0.0.1:${p}`;
    const vv = window.visualViewport;
    if (!vv) return;
    const KEYBOARD = 336;                       /* a real iPhone keyboard */
    const typing = () => {
      const a = document.activeElement;
      return !!(a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable));
    };
    try {
      Object.defineProperty(vv, 'height', {
        get: () => window.innerHeight - (typing() ? KEYBOARD : 0),
        configurable: true,
      });
    } catch (e) { return; }
    /* Fire the event the browser would fire, on focus and on blur. */
    const kick = () => { try { vv.dispatchEvent(new Event('resize')); } catch (e) {} };
    document.addEventListener('focusin', () => setTimeout(kick, 16), true);
    document.addEventListener('focusout', () => setTimeout(kick, 16), true);

    /* Keep a handle on every ResizeObserver the app creates, so the watchdog
       half of this scenario can silence them and test the watchdog ALONE.
       Without this the observer on the canvas's parent heals the break first
       and the assertion passes without the watchdog existing — which is
       exactly the false green this file is here to avoid. */
    const RO = window.ResizeObserver;
    if (RO) {
      const live = [];
      window.__btObservers = live;
      window.ResizeObserver = function (cb) { const o = new RO(cb); live.push(o); return o; };
      window.ResizeObserver.prototype = RO.prototype;
      window.__btKillObservers = () => { live.forEach((o) => { try { o.disconnect(); } catch (e) {} }); return live.length; };
    }
  }, wsPort);

  await page.goto(`http://localhost:${webPort}/`, { waitUntil: 'domcontentloaded' });
  const P = { ctx, page, logs: [], name: 'Firsty' };

  /* Take the first-timer's door explicitly rather than letting the harness
     choose: the whole point is the CREATE path, where a name is typed. */
  await page.waitForFunction(() => !!(document.querySelector('input.bt-cc-name')
    || document.querySelector('[data-tut="login-create"]')), null, { timeout: 30000, polling: 250 });
  const createBtn = await page.$('[data-tut="login-create"]');
  if (createBtn) await createBtn.click();
  await page.waitForSelector('input.bt-cc-name', { timeout: 30000 });

  /* Type it the way a person does — tap the field, then keys. `fill` sets the
     value without ever making the field the active element on some paths, and
     the focus is the entire condition under test. */
  await page.click('input.bt-cc-name');
  await page.type('input.bt-cc-name', 'Firsty', { delay: 20 });
  await page.waitForTimeout(400);

  const typingGeo = await geometry(page);
  rec.ok('the keyboard stub is live: a text field is focused and the viewport shrank',
    typingGeo.focused === 'INPUT' && typingGeo.gap > 100, typingGeo);

  await page.click('button.bt-cc-play');

  /* The world comes up behind the closing keyboard. Wait for it the way the
     harness does, then give the layout longer than it needs — the bug is
     present on arrival, so this is generosity, not a race. */
  await page.waitForFunction(() => {
    const S = window._gameState && window._gameState.current;
    return !!(S && S.myId && S.currentZone);
  }, null, { timeout: 90000, polling: 500 });
  await page.waitForFunction(() => document.querySelectorAll('video').length === 0,
    null, { timeout: 15000, polling: 200 }).catch(() => {});
  await page.waitForTimeout(3000);

  const geo = await geometry(page);

  /* ── THE ASSERTION THE OWNER WOULD MAKE, LOOKING AT HIS PHONE ── */
  const expected = geo.innerH - geo.dashH;
  rec.ok('a first-time player gets a full-height world, not a strip',
    geo.canvasCssH !== null && geo.canvasCssH >= expected * 0.88,
    { ...geo, expected: Math.round(expected), got: geo.canvasCssH });
  rec.ok('...and it spans the full width',
    geo.canvasCssW !== null && Math.abs(geo.canvasCssW - PHONE.width) <= 2, geo);

  /* The signature, named so a failure says WHICH failure it is: an unsized
     <canvas> is 300x150 by definition, so those two numbers mean resize()
     never ran to completion even once. */
  rec.ok('the canvas was sized at all — 300x150 means resize() never completed',
    !(geo.canvasAttrW === 300 && geo.canvasAttrH === 150),
    { attrW: geo.canvasAttrW, attrH: geo.canvasAttrH });

  /* The world must not be left behind by a keyboard that has since closed:
     with no field focused there is no gap, so nothing may still be suppressed. */
  rec.ok('the keyboard is gone by the time the world is up',
    geo.focused !== 'INPUT' && (geo.gap === null || geo.gap <= 100), geo);

  /* ── AND IT MUST SURVIVE THE KEYBOARD COMING BACK ──
     Chat opens a keyboard mid-session. That must still NOT resize the scene
     (v2.3.130, the reason the guard exists) and must not strand the canvas
     either: same size before and after. */
  const before = geo.canvasCssH;
  await page.evaluate(() => {
    const i = document.createElement('input');
    i.id = '__kbprobe';
    i.style.cssText = 'position:fixed;bottom:0;left:0;opacity:0;z-index:99999';
    document.body.appendChild(i);
    i.focus();
  });
  await page.waitForTimeout(800);
  const during = await geometry(page);
  rec.ok('an open keyboard does not shrink the world (the guard still does its job)',
    during.canvasCssH === before, { before, during: during.canvasCssH, gap: during.gap });

  await page.evaluate(() => {
    const i = document.getElementById('__kbprobe');
    if (i) { i.blur(); i.remove(); }
  });
  await page.waitForTimeout(900);
  const after = await geometry(page);
  rec.ok('...and closing it leaves the world exactly as it was',
    after.canvasCssH === before, { before, after: after.canvasCssH, gap: after.gap });

  /* ═══ THE WATCHDOG, PROVED BY BREAKING THE CANVAS ═══════════════════════
     v2.3.1975. The assertions above all pass on the pre-watchdog build — the
     owner's failure needs a trigger this harness cannot produce, because
     Playwright is a well-behaved browser that fires every resize event it
     owes you. That is precisely the hole: three fixes have chased three
     triggers, and the fourth arrived anyway.

     So this stops trying to guess the trigger and tests the PROPERTY: put the
     canvas into the broken state directly — the state the owner photographed,
     a strip with the page background below it — WITHOUT firing any event, and
     require the game to come back on its own. Nothing that suppresses a
     resize can defeat a check that looks at the size itself.

     Deliberately dispatches NO resize event, and mutates only the canvas, so
     the ResizeObserver on the parent has nothing to react to either. If the
     watchdog is removed, this fails; if it is made edge-triggered again, this
     fails. */
  const healBefore = await geometry(page);
  const killed = await page.evaluate(() => (window.__btKillObservers ? window.__btKillObservers() : -1));
  rec.ok('the app\'s ResizeObservers are silenced, so only the watchdog can heal (guard)',
    killed > 0, { observersDisconnected: killed });
  await page.evaluate(() => {
    const c = document.querySelector('canvas.brotown-canvas') || document.querySelector('canvas');
    window.__btResizeHealed = null;
    c.style.height = '150px';          /* the unsized-canvas default, and the owner's strip */
    c.height = Math.round(150 * (window.devicePixelRatio || 1));
  });
  const broken = await geometry(page);
  rec.ok('the canvas really is broken for the test (guard)',
    broken.canvasCssH !== null && broken.canvasCssH <= 160, broken);

  /* The watchdog runs on a 500ms tick; give it several. */
  await page.waitForFunction(() => {
    const c = document.querySelector('canvas.brotown-canvas') || document.querySelector('canvas');
    return c && c.getBoundingClientRect().height > 300;
  }, null, { timeout: 12000, polling: 250 }).catch(() => {});
  const healed = await geometry(page);
  rec.ok('a canvas stuck at a strip heals itself, with no resize event to help it',
    healed.canvasCssH !== null && healed.canvasCssH >= (healed.innerH - healed.dashH) * 0.88,
    { was: broken.canvasCssH, now: healed.canvasCssH,
      expected: Math.round(healed.innerH - healed.dashH) });
  rec.ok('...and it said so in the console, with the numbers a diagnosis needs',
    await page.evaluate(() => !!(window.__btResizeHealed && window.__btResizeHealed.had)),
    await page.evaluate(() => window.__btResizeHealed));
  rec.ok('...and healing did not change the width', healed.canvasCssW === healBefore.canvasCssW,
    { before: healBefore.canvasCssW, after: healed.canvasCssW });

  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors on a first run', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}
