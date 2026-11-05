/* ═══ THE LOGIN WHEEL, ON A PHONE AND A COMPUTER (v2.3.4285, docs/specs/login-wheel.md) ═══
 *
 * One real player against a real worker, in the Wheel's BroTown, twice (a phone
 * upright 390 x 844 and a computer 1280 x 800):
 *   1. the worker advertises the wheel (caps.loginspin); the window is opened
 *      by hand (the host waits for the first steps of a new character);
 *   2. before: the title plate, the wheel, the pointer, one SPIN button;
 *   3. SPIN: the wheel turns and stops; the worker HOLDS the prize (nothing
 *      paid yet); DOUBLE OR NOTHING? with YES / NO; YES until a loss (or 3
 *      wins), then NO: the worker's purse is exactly the held pot higher
 *      (or unchanged after a loss) -- the gold is the worker's;
 *   5. a second ask the same day: nothing to spin; no page errors.
 * Pictures: docs/shots/daily-spin-<view>-{before,after,double-ask,double-win|double-nothing,collect}.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const WIDE = { width: 1280, height: 800 };

async function pass(view, { browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'docs/shots');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `daily-spin-${view}-${name}.png`) }).catch(() => {});
  const phone = view === 'phone';
  const A = await H.newPlayer(browser, phone
    ? { name: 'Spinbro', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true }
    : { name: 'Spindesk', wsPort, webPort, world: 'wheel', viewport: WIDE, wide: true });
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
    await A.page.waitForSelector('[data-login-spin-btn]', { timeout: 20000 }).catch(() => {});
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
    await A.page.click('[data-login-spin-btn]').catch(() => A.page.evaluate(() => window.__btLoginSpinBus.open()));
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

export async function run(ctx) {
  await pass('phone', ctx);
  await pass('desk', ctx);
}
