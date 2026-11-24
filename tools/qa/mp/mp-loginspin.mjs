/* ═══ THE LOGIN WHEEL, ON A PHONE AND A COMPUTER (v2.3.4295, docs/specs/login-wheel.md) ═══
 *
 * One real player against a real worker, in the Wheel's BroTown, twice (a phone
 * upright 390 x 844 and a computer 1280 x 800):
 *   1. the worker advertises the wheel (caps.loginspin); v2.3.6560 (card LS,
 *      the owner 2026-11-24: "just leave it as a button in the top right"): on
 *      the game's default address the window does NOT open by itself, past the
 *      settle time plus three seconds of the page's own clock and frames; the
 *      page asked the worker exactly once and the bar's button reads ready; a
 *      tap opens it; closed without a spin it stays closed, the button bright;
 *      a second tap opens it for the spin;
 *   2. before: the title plate, the wheel, the pointer, one SPIN button;
 *   3. SPIN: the wheel turns and stops; the worker HOLDS the prize (nothing
 *      paid yet); DOUBLE OR NOTHING? with YES / NO; YES until a loss (or 3
 *      wins), then NO: the worker's purse is exactly the held pot higher
 *      (or unchanged after a loss) -- the gold is the worker's;
 *   5. a second ask the same day: nothing to spin; no page errors;
 *   6. (the phone) `?loginspin=1`, the off-ramp: a character logs in, the window offers itself ONCE, and closed without a
 *      spin it stays closed.
 * THE DEFAULT ADDRESS: the harness appends `loginspin=0` to an address that
 * does not name it (harness.mjs `_noSpin`), so no query can ask for the
 * default.  QA_INIT below runs before the game's script and takes the
 * harness's word back off the address (history.replaceState; the page's
 * switch reader reads the address as it is at each ask, src/game/switches.js):
 * the game reads no `loginspin` at all, as on a player's phone.  Every
 * character here is past the tutorial (QA_INIT), so the old wheel would have
 * opened itself for each of them.
 * Pictures: docs/shots/daily-spin-<view>-{before,after,double-ask,double-win|double-nothing,collect}.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
export const lane = 'full';

const PHONE = { width: 390, height: 844 };
const WIDE = { width: 1280, height: 800 };

/* v2.3.6560: the page's own init (H.newPlayer `init`, before the game's script).  It takes the harness's
   `loginspin=0` off the address (the header: THE DEFAULT ADDRESS; `?loginspin=1` stays); it marks the tutorial
   skipped, as the game's own Skip does (onboardingPace.js SKIP_KEY), so the character is one the old wheel WOULD
   have opened itself for (onboardingBusy holds it back for a new character's first steps: without this the
   default pass stayed green with the unconditional open put back, the plant run of 2026-11-24); and it counts the
   page's loginspin_ask messages as they leave (a bundle's frame holds several: each one counts). */
const QA_INIT = () => {
  try {
    const u = new URL(location.href);
    if (u.searchParams.get('loginspin') === '0') { u.searchParams.delete('loginspin'); history.replaceState(history.state, '', u.pathname + u.search + u.hash); }
  } catch (e) { /* the address as it was */ }
  try { localStorage.setItem('bt_tutorial_skipped', '1'); } catch (e) { /* private window */ }
  window.__qaSpinAsks = 0;
  const send = WebSocket.prototype.send;
  WebSocket.prototype.send = function (d) { try { if (typeof d === 'string') window.__qaSpinAsks += (d.match(/"loginspin_ask"/g) || []).length; } catch (e) { /* counted or not */ } return send.call(this, d); };
};
/* v2.3.6560: wait `ms` of the page's own clock AND at least four of its frames (TRAPS §200: this box draws a
   few frames a second; the host's poll runs on the page's timers) */
const pageWait = (P, ms) => P.page.evaluate((ms) => new Promise((res) => {
  const t0 = performance.now(); let frames = 0;
  const step = () => { frames++; if (performance.now() - t0 >= ms && frames >= 4) res({ ms: Math.round(performance.now() - t0), frames }); else requestAnimationFrame(step); };
  requestAnimationFrame(step);
}), ms);
const SETTLE_PLUS_MS = 3000 + 1000;   /* three seconds past the settle, and one of the host's 1000 ms polls */
const winState = (P) => P.page.evaluate(() => ({
  win: !!document.querySelector('[data-login-spin]'),
  open: !!(window.__btLoginSpinBus && window.__btLoginSpinBus.get().open),
  btn: (document.querySelector('[data-login-spin-btn]') || { getAttribute: () => null }).getAttribute('data-login-spin-btn'),
  asks: window.__qaSpinAsks,
}));
const tapButton = (A) => A.page.click('[data-login-spin-btn="ready"]', { timeout: 4000, force: true }).catch(() => A.page.evaluate(() => document.querySelector('[data-login-spin-btn]').click()));

async function pass(view, { browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'docs/shots');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `daily-spin-${view}-${name}.png`) }).catch(() => {});
  const phone = view === 'phone';
  const A = await H.newPlayer(browser, phone
    ? { name: 'Spinbro', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, init: QA_INIT }
    : { name: 'Spindesk', wsPort, webPort, world: 'wheel', viewport: WIDE, wide: true, init: QA_INIT });
  const errors = [];
  A.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const tag = (s) => `${view}: ${s}`;
  try {
    await H.enterWorld(A);
    await H.waitFor(A, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the Wheel' }).catch(() => null);
    const caps = await H.readState(A, (S) => !!(S._serverCaps && S._serverCaps.loginspin));
    rec.ok(tag('the worker advertises the wheel (caps.loginspin)'), caps === true, caps);
    await A.page.waitForTimeout(1500);
    const id = await H.readState(A, (S) => S.myId);
    const gold0 = (await H.adminPlayer(wsPort, id)).rpg.coins;
    /* the top bar's button (the host asks once the world is up): it opens the window */
    await A.page.waitForSelector('[data-login-spin-btn="ready"]', { timeout: 20000 }).catch(() => {});
    /* v2.3.6560: the default address -- no popup at login.  The ask went (so the host is past its settle time);
       then three seconds more, and a poll, by the page's clock and frames */
    const addr = await A.page.evaluate(() => location.search);
    rec.ok(tag('the game\'s address names no loginspin (the default a player gets)'), !/(?:^|[?&])loginspin=/.test(addr), addr);
    await A.page.waitForFunction(() => window.__qaSpinAsks >= 1, null, { timeout: 20000 }).catch(() => {});
    const waited = await pageWait(A, SETTLE_PLUS_MS);
    const st0 = await winState(A);
    rec.ok(tag('logged in with a spin ready: past the settle time plus three seconds the window has NOT opened by itself, the bar\'s button reads ready'), !st0.win && !st0.open && st0.btn === 'ready', { ...st0, waited });
    rec.ok(tag('the page asked the worker exactly once'), st0.asks === 1, st0);
    await shot(A, 'topbar');
    const rects = await A.page.evaluate(() => {
      const r = (sel) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return b.width ? { l: b.left, r: b.right, t: b.top, b: b.bottom } : null; };
      return { out: r('.bt-zone-header__logout'), logo: r('[data-topbar-logo]'), btn: r('[data-login-spin-btn]'), w: window.innerWidth };
    });
    const hit = (a, b) => !!a && !!b && a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
    rec.ok(tag('the top bar shows the FREE DAILY SPIN button, off LOGOUT and the logo, inside the screen'), !!rects.btn && !hit(rects.btn, rects.out) && !hit(rects.btn, rects.logo) && rects.btn.r <= rects.w, rects);
    if (phone) {
      await A.page.setViewportSize({ width: 320, height: 640 });
      await A.page.waitForTimeout(500);
      const r3 = await A.page.evaluate(() => {
        const r = (sel) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return b.width ? { l: b.left, r: b.right, t: b.top, b: b.bottom } : null; };
        return { out: r('.bt-zone-header__logout'), logo: r('[data-topbar-logo]'), btn: r('[data-login-spin-btn]'), w: window.innerWidth };
      });
      await shot(A, 'topbar-320');
      rec.ok(tag('at 320 px the button overlaps neither LOGOUT nor the logo'), !!r3.btn && !hit(r3.btn, r3.out) && !hit(r3.btn, r3.logo) && r3.btn.r <= r3.w, r3);
      await A.page.setViewportSize(PHONE);
      await A.page.waitForTimeout(400);
    }
    /* v2.3.4345: opening the window and closing it WITHOUT a spin (what a refusal on unsafe ground leads to) leaves the button bright;
       v2.3.6560: by the button and its ✕, as a player does, and closed it stays closed (the owner's "wouldn't leave me alone") */
    await tapButton(A);
    await A.page.waitForSelector('[data-login-spin-close]', { timeout: 10000 }).catch(() => {});
    const opened = await winState(A);
    rec.ok(tag('a tap on the bar\'s button opens the window'), opened.win && opened.open, opened);
    await A.page.click('[data-login-spin-close]', { timeout: 4000, force: true }).catch(() => A.page.evaluate(() => document.querySelector('[data-login-spin-close]').click()));
    await A.page.waitForSelector('[data-login-spin]', { state: 'detached', timeout: 5000 }).catch(() => {});
    const waited2 = await pageWait(A, SETTLE_PLUS_MS);
    const st1 = await winState(A);
    rec.ok(tag('closed without a spin: it stays closed (three seconds and a poll later), the bar\'s button still bright, not greyed'), !st1.win && !st1.open && st1.btn === 'ready', { ...st1, waited: waited2 });
    await tapButton(A);
    await A.page.waitForSelector('[data-login-spin="ready"]', { timeout: 10000 }).catch(() => {});
    await A.page.waitForTimeout(600);
    await shot(A, 'before');
    const ready = await A.page.evaluate(() => !!document.querySelector('[data-login-spin="ready"] [data-login-spin-go]') && document.querySelectorAll('[data-login-spin] img').length === 4);
    rec.ok(tag('the window shows the plate, the wheel, the pointer and a SPIN button'), ready, ready);
    const words = await A.page.evaluate(() => (document.querySelector('[data-login-spin]') || {}).innerText || '');
    rec.ok(tag(phone ? 'the words say "Tap"' : 'the words say "Click", never "Tap"'), phone ? /Tap SPIN/.test(words) : (/Click SPIN/.test(words) && !/\bTap\b/.test(words)), words.slice(0, 80));
    await A.page.click('[data-login-spin-go]');
    await A.page.waitForSelector('[data-login-spin="landed"], [data-login-spin="ask"]', { timeout: 15000 }).catch(() => {});
    await A.page.waitForTimeout(300);
    await shot(A, 'after');
    await A.page.waitForSelector('[data-login-spin="ask"]', { timeout: 8000 }).catch(() => {});
    const res = await A.page.evaluate(() => window.__btLoginSpin || null);
    rec.ok(tag('the wheel landed and the worker HOLDS the prize: nothing paid yet'), !!res && res.open && res.pot === res.base, res);
    const gold0b = (await H.adminPlayer(wsPort, id)).rpg.coins;
    rec.ok(tag('DOUBLE OR NOTHING? is offered with YES and NO'), await A.page.evaluate(() => !!document.querySelector('[data-login-double] [data-login-yes]') && !!document.querySelector('[data-login-double] [data-login-no]')), res);
    await shot(A, 'double-ask');
    /* YES: the worker's 50/50; keep saying YES while it is a win, up to 3 rounds, then NO */
    let held = res.pot, lost = false, rounds = 0;
    for (; rounds < 3; rounds++) {
      await A.page.click('[data-login-yes]');
      await A.page.waitForSelector('[data-login-spin="dwon"], [data-login-spin="dlost"], [data-login-spin="done"]', { timeout: 15000 }).catch(() => {});
      await A.page.waitForTimeout(350);
      const rd = await A.page.evaluate(() => window.__btLoginRound || null);
      await shot(A, rd && rd.lost ? 'double-nothing' : 'double-win');
      if (!rd || rd.lost) { lost = !!(rd && rd.lost); held = rd ? rd.pot : held; break; }
      held = rd.pot;
      if (!rd.open) break;
      await A.page.waitForSelector('[data-login-spin="ask"]', { timeout: 8000 }).catch(() => {});
    }
    if (!lost) {
      const open = await A.page.evaluate(() => !!document.querySelector('[data-login-no]:not([disabled])'));
      if (open) { await A.page.click('[data-login-no]'); await A.page.waitForSelector('[data-login-spin="done"]', { timeout: 8000 }).catch(() => {}); await A.page.waitForTimeout(400); await shot(A, 'collect'); }
    }
    await A.page.waitForTimeout(1500);
    const gold1 = (await H.adminPlayer(wsPort, id)).rpg.coins;
    rec.ok(tag(lost ? 'a loss: the worker paid nothing' : 'the worker paid exactly the held pot, once'), lost ? gold1 === gold0b : gold1 - gold0b === held, { gold0, gold0b, gold1, held, lost, rounds });
    await A.page.click('[data-login-spin-close]').catch(() => {});
    await A.page.click('[data-login-spin] button[data-enter]').catch(() => {});
    await A.page.waitForTimeout(500);
    const closed = await A.page.evaluate(() => !document.querySelector('[data-login-spin]'));
    rec.ok(tag('the window closes'), closed, closed);
    /* spun: the bar's button stays, greyed; a tap says when the next one is, and opens no window */
    await A.page.waitForSelector('[data-login-spin-btn="spent"]', { timeout: 8000 }).catch(() => {});
    await A.page.click('[data-login-spin-btn="spent"]', { timeout: 4000, force: true }).catch(() => A.page.evaluate(() => document.querySelector('[data-login-spin-btn="spent"]').click()));
    await A.page.waitForTimeout(400);
    const note = await A.page.evaluate(() => {
      const b = document.querySelector('[data-login-spin-btn]'); const r = b && b.getBoundingClientRect();
      const top = r ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
      return { t: (document.querySelector('[data-login-spin-note]') || {}).textContent || '', win: !!document.querySelector('[data-login-spin]'), btn: b ? b.getAttribute('data-login-spin-btn') : null, top: top ? (top.tagName + '.' + String(top.className).slice(0, 40)) : null, st: window.__btLoginSpinBus ? JSON.stringify(window.__btLoginSpinBus.get()).slice(0, 200) : null };
    });
    await shot(A, 'topbar-spent');
    rec.ok(tag('after the spin the bar\'s button is greyed out; a tap says "Next free spin in ..h ..m" and opens no window'), /^Next free spin in (\d+h )?\d+m$/.test(note.t) && !note.win, note);
    const asksAfter = await A.page.evaluate(() => window.__qaSpinAsks);
    rec.ok(tag('one ask the whole sitting: the window\'s opens, closes and the spin asked nothing more'), asksAfter === 1, asksAfter);
    /* a second ask the same day: nothing to spin */
    await A.page.evaluate(() => { window._gameState.current.channel.send({ type: 'loginspin_ask', payload: {} }); });
    await A.page.waitForTimeout(1200);
    const avail = await A.page.evaluate(() => window.__btLoginSpinBus.get().avail);
    rec.ok(tag('a second ask the same day: nothing to spin'), avail === false, avail);
    rec.ok(tag('no page errors'), errors.length === 0, errors.slice(0, 3));
  } finally {
    await A.ctx.close().catch(() => {});
  }
}

/* v2.3.6560: the off-ramp, `?loginspin=1`: the old offer at login, once a mount */
async function offerRoad({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Spinoffer', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, query: 'loginspin=1', init: QA_INIT });
  const errors = [];
  A.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const tag = (s) => `loginspin=1: ${s}`;
  try {
    await H.enterWorld(A);
    await H.waitFor(A, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the Wheel' }).catch(() => null);
    await A.page.waitForSelector('[data-login-spin-close]', { timeout: 30000 }).catch(() => {});
    const st0 = await winState(A);
    rec.ok(tag('a character past the tutorial logs in: the window offers itself'), st0.win && st0.open, st0);
    await A.page.click('[data-login-spin-close]', { timeout: 4000, force: true }).catch(() => A.page.evaluate(() => { const b = document.querySelector('[data-login-spin-close]'); if (b) b.click(); }));
    await A.page.waitForSelector('[data-login-spin]', { state: 'detached', timeout: 5000 }).catch(() => {});
    const waited = await pageWait(A, SETTLE_PLUS_MS);
    const st1 = await winState(A);
    rec.ok(tag('closed without a spin it stays closed (three seconds and a poll later), the button bright'), !st1.win && !st1.open && st1.btn === 'ready', { ...st1, waited });
    rec.ok(tag('the page asked the worker exactly once'), st1.asks === 1, st1);
    rec.ok(tag('no page errors'), errors.length === 0, errors.slice(0, 3));
  } finally {
    await A.ctx.close().catch(() => {});
  }
}

export async function run(ctx) {
  await pass('phone', ctx);
  await pass('desk', ctx);
  await offerRoad(ctx);
}
