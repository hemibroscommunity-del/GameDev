/* ═══ THE DAILY REWARDS, ON A PHONE (v2.3.3140) ═══
 *
 * Owner, 2026-10-06: a layered daily system (a reward for coming back, daily
 * quests, a season track), then: "Personally I find the login page with the
 * chest intrusive.  I'd rather have it be something like a free daily spin
 * from the gambling building", and its twist: "Your first spin is for a lump
 * sum award ... Then you have the option of spinning it for double or nothing
 * at 50% odds and that continues on."  One real player against a real
 * worker, in the Wheel, on a phone:
 *   1. the worker advertises the spin and the quests, and says so on join;
 *   2. NOTHING opens at login -- no chest window (even with the harness's
 *      chest offer allowed), no chest in the bag;
 *   3. at the Gambling Den's door, Enter opens its window with the FREE
 *      DAILY SPIN on top: a prize wheel of eight lump sums, its labels upright;
 *   4. the free spin lands on the prize slice the worker picked, and that is
 *      a POT -- nothing paid yet; DOUBLE OR NOTHING turns the wheel to x2 / ✕
 *      and lands on the answer; a won double then TAKEN pays exactly the
 *      doubled pot, a lost one pays nothing; then the button counts down to
 *      tomorrow's free spin;
 *   5. a bonus spin (an operator grant here; in the game, all three daily
 *      quests or the season) lands a lump sum, and TAKE IT pays it exactly;
 *   6. "Daily quests & season" opens the Daily Rewards window: the streak,
 *      the spin used, three daily quests (the first quest handed in), a reroll
 *      that swaps one; finishing all three pays and banks a bonus spin;
 *   7. the Season tab: stars, 25 tiers, a reached tier claimed (coins on the
 *      purse), "Claim all" taking the rest, the Quests button's dot lit while
 *      one waits and out after;
 *   8. the Quests tab's card opens the same window; the window fits a phone
 *      on its side (header, tabs and close on screen); no page errors.
 * Pictures: tools/qa/mp/out/daily-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const SIDEWAYS = { width: 844, height: 390 };

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `daily-${name}.png`) }).catch(() => {});
  const { DAILY } = await import(H.REPO + '/server/src/dailyrewards.js');

  const P = await H.newPlayer(browser, { name: 'Spinbro', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, chestOffer: true });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  try {
    await H.enterWorld(P);
    const zoneNow = () => H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
    for (let i = 0; i < 150; i++) { if ((await zoneNow()) === 'wheel') break; await P.page.waitForTimeout(400); }
    const id = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', id, { god: true, godMinutes: 30 });
    await P.page.evaluate(() => { setInterval(() => { const S = window._gameState && window._gameState.current; if (S) S._isDesktop = false; }, 120); });
    let stopAlive = false;
    (async () => {
      while (!stopAlive) {
        await P.page.keyboard.press('Control').catch(() => {});
        for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
      }
    })();
    const state = () => P.page.evaluate(() => (window.__btDailyRewards ? window.__btDailyRewards.state() : null));
    const coins = () => H.readState(P, (S) => (S.rpg && S.rpg.coins) || 0);
    const waitFor = async (fn, ms = 8000, gap = 200) => { let v = null; for (const t0 = Date.now(); Date.now() - t0 < ms;) { v = await fn(); if (v) return v; await P.page.waitForTimeout(gap); } return v; };

    /* ── 1. caps and the state ── */
    const caps = await H.readState(P, (S) => S._serverCaps || {});
    const st0 = await waitFor(state, 15000);
    rec.ok('the worker advertises the free spin and the daily quests, and sends their state on join',
      caps.dailyspin === true && caps.dailyquests === true && !!st0 && st0.spin.ready === 1 && st0.spin.open === 0
        && Array.isArray(st0.spin.prizes) && st0.spin.prizes.length === DAILY.SPIN.PRIZES.length,
      { caps: { dailyspin: caps.dailyspin, dailyquests: caps.dailyquests }, spin: st0 && st0.spin });

    /* ── 2. nothing at login ── */
    await P.page.waitForTimeout(3000);
    const login = await P.page.evaluate(() => ({
      chestWin: !!document.querySelector('[data-chest-window]'),
      dailyWin: !!document.querySelector('[data-daily-rewards]'),
      chests: (window._gameState.current.rpg.inventory || {}).daily_chest || 0,
    }));
    await shot(P, 'login');
    rec.ok('nothing opens at login: no chest window (even with the chest offer allowed), no daily window, no chest in the bag',
      !login.chestWin && !login.dailyWin && login.chests === 0, login);

    /* ── 3. the Gambling Den ── */
    let doors = [];
    for (let i = 0; i < 40 && doors.length < 17; i++) {
      doors = await P.page.evaluate(() => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []));
      if (doors.length < 17) await P.page.waitForTimeout(500);
    }
    const den = doors.find((d) => d.id === 'gambling');
    const standAt = async (x, bootsY) => {
      for (let k = 0; k < 4; k++) {
        const dy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g.y - S.player.y; });
        await H.hopTo(P, x, bootsY - dy, { step: 100, gap: 260, tries: 90 });
        await P.page.waitForTimeout(800);
        const g = await P.page.evaluate(() => window.__btPlayerGround());
        if (Math.hypot(g.x - x, g.y - bootsY) < 12) return true;
      }
      return false;
    };
    const panelKey = () => P.page.evaluate(() => { const c = document.querySelector('.bt-inspect-card'); return c ? c.getAttribute('data-building-panel') : null; });
    let opened = null;
    if (den) {
      await standAt(den.x, den.y + 30);
      for (let i = 0; i < 16 && !opened; i++) {
        await P.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')); if (b) b.click(); });
        await P.page.waitForTimeout(400);
        opened = await panelKey();
      }
    }
    const spinBox = await waitFor(() => P.page.evaluate(() => {
      const el = document.querySelector('[data-daily-spin]');
      const wh = document.querySelector('[data-spin-wheel]');
      if (!el || !wh) return null;
      const r = el.getBoundingClientRect();
      /* every label upright: its own turn and the wheel's add to nothing */
      const ang = (e) => { const m = getComputedStyle(e).transform; if (!m || m === 'none') return 0; const v = m.match(/matrix\(([^)]+)\)/); if (!v) return 0; const [a, b] = v[1].split(',').map(Number); return Math.atan2(b, a) * 180 / Math.PI; };
      const wd = ang(wh);
      const labs = Array.from(wh.querySelectorAll('[data-slab]'));
      const tilt = labs.map((l) => Math.round(((ang(l) + wd) % 360 + 540) % 360 - 180));
      return { state: el.getAttribute('data-daily-spin'), face: wh.getAttribute('data-face'), labels: labs.map((l) => l.textContent),
        tilt, btn: (document.querySelector('[data-spin-btn]') || {}).textContent || '', sub: (document.querySelector('[data-spin-sub]') || {}).textContent || '',
        w: Math.round(r.width), l: Math.round(r.left), r: Math.round(r.right), vw: window.innerWidth };
    }), 6000);
    await shot(P, 'den-ready');
    const ORDER = [0, 4, 1, 5, 2, 6, 3, 7];
    const short = (n) => (n >= 10000 ? (n / 1000).toFixed(n % 1000 ? 1 : 0).replace(/\.0$/, '') + 'k' : n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n));
    const wantLabels = ORDER.map((p) => short(st0.spin.prizes[p].c));
    rec.ok('at the Gambling Den, Enter opens its window with the free daily spin on top: eight lump sums on the wheel, upright, and the odds',
      !!den && opened === 'gamble' && !!spinBox && spinBox.state === 'ready' && spinBox.face === 'prize'
        && JSON.stringify(spinBox.labels) === JSON.stringify(wantLabels) && spinBox.tilt.every((t) => Math.abs(t) <= 1)
        && /free/i.test(spinBox.btn) && /jackpot/i.test(spinBox.sub) && spinBox.l >= 0 && spinBox.r <= spinBox.vw,
      { den: !!den, opened, spinBox, wantLabels });

    /* ── 4. the free spin, then double or nothing ── */
    const lastLog = () => P.page.evaluate(() => { const l = window.__btSpinLog || []; return l.length ? l[l.length - 1] : null; });
    const logLen = () => P.page.evaluate(() => (window.__btSpinLog || []).length);
    const act = async (sel) => {
      const before = await logLen();
      const clicked = await P.page.evaluate((q) => { const b = document.querySelector(q); if (!b || b.disabled) return false; b.click(); return true; }, sel);
      if (!clicked) return null;
      return waitFor(() => P.page.evaluate((n) => { const l = window.__btSpinLog || []; return l.length > n ? l[l.length - 1] : null; }, before), 12000, 150);
    };
    /* where the wheel stopped: the slice under the pointer at the top, and
       whether every label there still stands upright */
    const under = () => P.page.evaluate(() => {
      const el = document.querySelector('[data-spin-wheel]');
      const ang = (e) => { const m = getComputedStyle(e).transform; if (!m || m === 'none') return 0; const v = m.match(/matrix\(([^)]+)\)/); if (!v) return 0; const [a, b] = v[1].split(',').map(Number); return Math.atan2(b, a) * 180 / Math.PI; };
      const deg = ang(el);
      const u = ((360 - ((deg % 360) + 360) % 360) % 360);
      const tilt = Array.from(el.querySelectorAll('[data-slab]')).map((l) => Math.round(((ang(l) + deg) % 360 + 540) % 360 - 180));
      return { deg, slice: Math.floor(u / 45), face: el.getAttribute('data-face'), upright: tilt.every((t) => Math.abs(t) <= 1), tilt };
    });
    const c0 = await coins();
    const first = await act('[data-spin-btn]');
    const u1 = first ? await under() : null;
    const pot1 = await P.page.evaluate(() => { const e = document.querySelector('[data-spin-pot]'); return e ? +e.getAttribute('data-spin-pot') : null; });
    const c1 = await coins();
    await shot(P, 'den-pot');
    rec.ok('the free spin lands on the prize slice the worker picked, and that lump sum is a POT: shown, nothing paid yet',
      !!first && first.act === 'spin' && !!u1 && u1.face === 'prize' && ORDER[u1.slice] === first.i && u1.upright
        && pot1 === first.pot && first.pot === st0.spin.prizes[first.i].c && c1 === c0,
      { first, u1, pot1, paid: c1 - c0 });
    const take = await P.page.evaluate(() => ({ take: (document.querySelector('[data-spin-take]') || {}).textContent || '', dbl: (document.querySelector('[data-spin-double]') || {}).textContent || '' }));
    rec.ok('two choices: Take it, or Double or nothing for twice the pot', /Take/.test(take.take) && /Double or nothing/.test(take.dbl)
      && take.dbl.includes((first ? first.pot * 2 : 0).toLocaleString('en-US')), take);
    await P.page.waitForTimeout(500);
    const dbl = await act('[data-spin-double]');
    const u2 = dbl ? await under() : null;
    await shot(P, dbl && dbl.won ? 'den-doubled' : 'den-lost');
    rec.ok('double or nothing turns the wheel to x2 / ✕ and lands on the answer',
      !!dbl && dbl.act === 'double' && !!u2 && u2.face === 'double' && (u2.slice % 2 === 0) === !!dbl.won && u2.upright, { dbl, u2 });
    let paidRun = 0;
    if (dbl && dbl.won) {
      await P.page.waitForTimeout(500);
      const tk = await act('[data-spin-take]');
      paidRun = tk && tk.act === 'collect' ? tk.paid : -1;
    }
    await P.page.waitForTimeout(1200);
    const c2 = await coins();
    const after = await P.page.evaluate(() => ({ btn: (document.querySelector('[data-spin-btn]') || {}).textContent || '', line: (document.querySelector('[data-spin-line]') || {}).textContent || '',
      pot: !!document.querySelector('[data-spin-pot]') }));
    await shot(P, 'den-done');
    const expected = dbl && dbl.won ? first.pot * 2 : 0;
    rec.ok(dbl && dbl.won
      ? `the double was won and taken: exactly the doubled pot, ${expected} coins, paid once`
      : 'the double was lost: the pot is gone and nothing was paid',
    !!dbl && c2 - c0 === expected && paidRun === expected, { won: dbl && dbl.won, got: c2 - c0, expected, paidRun });
    rec.ok('then the window says what happened and the button counts down to tomorrow\'s free spin',
      /Next free spin in/i.test(after.btn) && !after.pot && (dbl && dbl.won ? /\+/.test(after.line) : /Lost it all/.test(after.line)), after);

    /* ── 5. a bonus spin, taken ── */
    await H.devOp(wsPort, 'daily', id, { spins: 1 });
    const bonusBtn = await waitFor(() => P.page.evaluate(() => { const b = document.querySelector('[data-spin-btn]'); return b && /bonus/i.test(b.textContent) && !b.disabled ? b.textContent : null; }), 6000);
    const cB = await coins();
    const bonus = bonusBtn ? await act('[data-spin-btn]') : null;
    await P.page.waitForTimeout(500);
    const took = bonus ? await act('[data-spin-take]') : null;
    await P.page.waitForTimeout(1200);
    const cB1 = await coins();
    rec.ok('a bonus spin lands a lump sum, and Take it pays exactly that', !!bonusBtn && !!bonus && bonus.act === 'spin' && !!took
      && took.paid === bonus.pot && cB1 - cB === bonus.pot, { bonusBtn, bonus, took, got: cB1 - cB });

    /* ── 6. the Daily Rewards window ── */
    await H.devOp(wsPort, 'quests', id);   /* the tutorial handed in: the daily quests open */
    await P.page.evaluate(() => { const b = document.querySelector('[data-open-daily]'); if (b) b.click(); });
    const win = await waitFor(() => P.page.evaluate(() => {
      const w = document.querySelector('[data-daily-rewards]');
      if (!w) return null;
      return { tab: w.getAttribute('data-daily-rewards'), quests: document.querySelectorAll('[data-daily-quest]').length,
        streak: !!document.querySelector('[data-daily-streak]'), spinrow: (document.querySelector('[data-daily-spinrow]') || { getAttribute: () => null }).getAttribute('data-daily-spinrow') };
    }).then((v) => (v && v.quests === 3 ? v : null)), 10000);
    await shot(P, 'window-today');
    rec.ok('"Daily quests & season" opens the window on Today: the streak, the spin, and three daily quests',
      !!win && win.tab === 'today' && win.streak && win.quests === 3 && !!win.spinrow, win);

    const before6 = await state();
    const t0 = before6 && before6.dq.list.map((q) => q.t + ':' + (q.p || ''));
    await P.page.evaluate(() => { const b = document.querySelector('[data-reroll="0"]'); if (b) b.click(); });
    const rerolled = await waitFor(async () => { const s = await state(); return s && s.dq.rr === 0 && s.dq.list[0] && (s.dq.list[0].t + ':' + (s.dq.list[0].p || '')) !== t0[0] ? s : null; }, 6000);
    const rrBtns = await P.page.evaluate(() => document.querySelectorAll('[data-reroll]').length);
    rec.ok('↻ swaps a quest for another, once a day (then the swap buttons go)', !!rerolled && rrBtns === 0, { before: t0, after: rerolled && rerolled.dq.list.map((q) => q.t + ':' + (q.p || '')), rrBtns });

    const cQ = await coins();
    const extra0 = (await state()).spin.extra;
    for (let i = 0; i < 3; i++) { await H.devOp(wsPort, 'daily', id, { quest: [i, 999] }); await P.page.waitForTimeout(400); }
    const allDone = await waitFor(async () => { const s = await state(); return s && s.dq.all === 1 ? s : null; }, 8000);
    const cQ1 = await coins();
    const pay = allDone ? allDone.dq.list.reduce((a, q) => a + q.c, 0) : -1;
    const toasts = await P.page.evaluate(() => (window.__btToastLog || []).map((t) => t.text || t).slice(-6));
    await shot(P, 'window-alldone');
    rec.ok('finishing all three pays each quest\'s coins, banks a bonus spin and says so in a toast',
      !!allDone && cQ1 - cQ === pay && allDone.spin.extra === extra0 + DAILY.QUESTS.ALL.spins
        && toasts.some((t) => /Daily quest done/.test(String(t))),
      { got: cQ1 - cQ, pay, extra0, extra: allDone && allDone.spin.extra, toasts });

    /* ── 7. the Season tab ── */
    await H.devOp(wsPort, 'daily', id, { stars: 12 });
    await P.page.evaluate(() => { const b = document.querySelector('[data-daily-tab="season"]'); if (b) b.click(); });
    const season = await waitFor(() => P.page.evaluate(() => {
      const w = document.querySelector('[data-daily-rewards="season"]');
      if (!w) return null;
      return { tiers: document.querySelectorAll('[data-season-tier]').length, claimBtns: document.querySelectorAll('[data-claim]').length,
        all: !!document.querySelector('[data-claim-all]'), stars: +(document.querySelector('[data-season-stars]') || { getAttribute: () => 0 }).getAttribute('data-season-stars') };
    }).then((v) => (v && v.claimBtns > 1 ? v : null)), 8000);
    const dotOn = await P.page.evaluate(() => { const q = document.querySelector('[data-nav="quests"]'); return q ? q.innerText : null; });
    await shot(P, 'window-season');
    rec.ok('the Season tab: the stars, all 25 tiers, Claim on each reached one and "Claim all"',
      !!season && season.tiers === DAILY.SEASON.TIERS.length && season.claimBtns >= 2 && season.all, season);
    const cS = await coins();
    await P.page.evaluate(() => { const b = document.querySelector('[data-claim="1"]'); if (b) b.click(); });
    const one = await waitFor(async () => { const s = await state(); return s && s.season.cl.includes(1) ? s : null; }, 6000);
    await P.page.waitForTimeout(600);
    const cS1 = await coins();
    const t1coins = DAILY.SEASON.TIERS[0].filter((g) => g.kind === 'coins').reduce((a, g) => a + g.n, 0);
    rec.ok('a reached tier\'s Claim pays it (its coins on the purse) and marks it claimed', !!one && cS1 - cS === t1coins, { got: cS1 - cS, want: t1coins });
    await P.page.evaluate(() => { const b = document.querySelector('[data-claim-all]'); if (b) b.click(); else { const c = document.querySelector('[data-claim]'); if (c) c.click(); } });
    const allClaimed = await waitFor(async () => {
      const s = await state();
      if (!s) return null;
      const reach = Math.floor(s.season.st / s.season.per);
      return s.season.cl.length >= Math.min(reach, s.season.tiers.length) ? s : null;
    }, 6000);
    await P.page.waitForTimeout(400);
    await shot(P, 'window-season-claimed');
    const leftClaims = await P.page.evaluate(() => document.querySelectorAll('[data-claim]').length);
    rec.ok('"Claim all" takes every reached tier left', !!allClaimed && leftClaims === 0, { cl: allClaimed && allClaimed.season.cl, leftClaims });

    /* ── 8. sideways, then the Quests card ── */
    await P.page.setViewportSize(SIDEWAYS);
    await P.page.waitForTimeout(900);
    const fit = await P.page.evaluate(() => {
      const c = document.querySelector('[data-daily-card]');
      const x = document.querySelector('[data-daily-close]');
      const t = document.querySelector('[data-daily-tab="today"]');
      const r = (el) => { const b = el.getBoundingClientRect(); return { t: Math.round(b.top), b: Math.round(b.bottom), l: Math.round(b.left), r: Math.round(b.right) }; };
      return { card: c && r(c), close: x && r(x), tab: t && r(t), vh: window.innerHeight, vw: window.innerWidth };
    });
    await shot(P, 'window-sideways');
    rec.ok('on a phone on its side the window fits: its card, the close button and the tabs all on screen',
      !!fit.card && fit.card.t >= 0 && fit.card.b <= fit.vh && !!fit.close && fit.close.t >= 0 && fit.close.r <= fit.vw && !!fit.tab && fit.tab.b <= fit.vh, fit);
    await P.page.setViewportSize(PHONE);
    await P.page.waitForTimeout(700);
    await P.page.evaluate(() => { const b = document.querySelector('[data-daily-close]'); if (b) b.click(); });
    await P.page.waitForTimeout(400);
    await P.page.evaluate(() => { const b = document.querySelector('.bt-inspect-close'); if (b) b.click(); });
    await P.page.waitForTimeout(400);
    let card = null;
    try {
      await H.openDest(P, 'Quests');
      card = await waitFor(() => P.page.evaluate(() => { const c = document.querySelector('[data-daily-card-open]'); return c ? (c.textContent || '').trim() : null; }), 6000);
    } catch (e) { card = null; }
    await shot(P, 'quests-card');
    if (card) await P.page.evaluate(() => { const c = document.querySelector('[data-daily-card-open]'); if (c) { c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); c.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); } });
    const viaCard = await waitFor(() => P.page.evaluate(() => !!document.querySelector('[data-daily-rewards]')), 5000);
    rec.ok('the Quests tab\'s card says the day at a glance and opens the same window', !!card && /Daily rewards/.test(card) && !!viaCard, { card, viaCard, dotOn });

    stopAlive = true;
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
