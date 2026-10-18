/* ═══ THE DAILY REWARDS, ON A PHONE (v2.3.3140) ═══
 *
 * Owner, 2026-10-06: a layered daily system (a reward for coming back, daily
 * quests, a season track), then: "Personally I find the login page with the
 * chest intrusive.  I'd rather have it be something like a free daily spin
 * from the gambling building", and its twist: "Your first spin is for a lump
 * sum award ... Then you have the option of spinning it for double or nothing
 * at 50% odds and that continues on."  One real player against a real
 * worker, in the Wheel, on a phone.  v2.3.3400: the daily quests and the
 * season are PUT AWAY (the owner: "Remove the daily quests", then "Yes drop
 * the season"), so this is the game without them:
 *   1. the worker advertises the spin and NOT the quests or the season, and
 *      says so on join;
 *   2. NOTHING opens at login -- no chest window (even with the harness's
 *      chest offer allowed), no chest in the bag;
 *   3. at the Gambling Den's door, Enter opens its window with the FREE
 *      DAILY SPIN on top: a prize wheel of eight lump sums, its labels upright;
 *   4. the free spin lands on the prize slice the worker picked, and that is
 *      a POT -- nothing paid yet; DOUBLE OR NOTHING turns the wheel to x2 / ✕
 *      and lands on the answer; a won double then TAKEN pays exactly the
 *      doubled pot, a lost one pays nothing; then the button counts down to
 *      tomorrow's free spin;
 *   5. a bonus spin (an operator grant here) lands a lump sum, and TAKE IT
 *      pays it exactly; neither spin put a star anywhere, and the state says
 *      the season is off;
 *   6. the Den has no button past its spin (it opened the season);
 *   7. the Quests tab's card says the day in words -- the streak, no stars,
 *      no quests -- and opens the Daily Rewards window: Today alone, no tabs,
 *      the streak and the spin, no daily quest or season anywhere, and no
 *      "Daily quest done" toast ever came; the window fits a phone on its
 *      side (header and close on screen);
 *   8. a player from before the drop (the operator's seasonTier seed) is
 *      paid what they reached and told so once, in a toast; no page errors.
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
    rec.ok('the worker advertises the free spin and not the daily quests or the season (v2.3.3400: put away), and sends the state on join (v2.3.3181: the spin locked until the first quest)',
      caps.dailyspin === true && caps.dailyquests === false && caps.season === false && !!st0 && st0.spin.ready === 1 && st0.spin.locked === 1 && st0.spin.open === 0 && st0.dq.on === false
        && st0.season.on === 0
        && Array.isArray(st0.spin.prizes) && st0.spin.prizes.length === DAILY.SPIN.PRIZES.length,
      { caps: { dailyspin: caps.dailyspin, dailyquests: caps.dailyquests, season: caps.season }, spin: st0 && st0.spin });

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
    /* v2.3.3181: the spin opens with the Mayor's first quest -- shown locked,
       then the tutorial handed in (the dev op), then the fresh state */
    const lockedBox = await waitFor(() => P.page.evaluate(() => {
      const el = document.querySelector('[data-daily-spin]');
      const b = document.querySelector('[data-spin-btn]');
      return el && b ? { state: el.getAttribute('data-daily-spin'), btn: b.textContent || '', disabled: !!b.disabled,
        line: (document.querySelector('[data-spin-line]') || {}).textContent || '' } : null;
    }), 6000);
    await shot(P, 'den-locked');
    rec.ok('before the first quest the Den\'s spin is locked: says so, and its button does nothing',
      !!lockedBox && lockedBox.state === 'locked' && lockedBox.disabled && /first quest/i.test(lockedBox.btn) && /first quest/i.test(lockedBox.line), lockedBox);
    await H.devOp(wsPort, 'quests', id);   /* the tutorial handed in */
    await P.page.evaluate(() => window.__btDailyRewards && window.__btDailyRewards.ask && window.__btDailyRewards.ask());
    await waitFor(() => state().then((s) => (s && s.spin && s.spin.locked === 0 ? s : null)), 8000);
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
    const se5 = await state();
    rec.ok('neither spin put a star anywhere, and the state says the season is off (v2.3.3400: dropped; the free spin gave 3)',
      !!se5 && se5.season.on === 0 && se5.season.st === 0, se5 && { on: se5.season.on, st: se5.season.st });

    /* ── 6. nothing past the Den's spin ── */
    const denEnd = await P.page.evaluate(() => ({ spin: !!document.querySelector('[data-spin-btn]'), open: !!document.querySelector('[data-open-daily]') }));
    rec.ok('the Den has no button past its spin (it opened the season)', denEnd.spin && !denEnd.open, denEnd);
    await P.page.evaluate(() => { const b = document.querySelector('.bt-inspect-close'); if (b) b.click(); });
    await P.page.waitForTimeout(500);

    /* ── 7. the Quests tab's card, and the window it opens ── */
    let card = null;
    try {
      await H.openDest(P, 'Quests');
      card = await waitFor(() => P.page.evaluate(() => { const c = document.querySelector('[data-daily-card-open]'); return c ? (c.textContent || '').trim() : null; }), 6000);
    } catch (e) { card = null; }
    await shot(P, 'quests-card');
    rec.ok('the Quests tab\'s card says the day in words: the streak once the spin is taken, no stars, no quests',
      !!card && /Daily rewards/.test(card) && /\d+-day streak/.test(card) && !/★ \d/.test(card) && !/quest/i.test(card), { card });
    if (card) await P.page.evaluate(() => { const c = document.querySelector('[data-daily-card-open]'); if (c) { c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); c.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); } });
    const win = await waitFor(() => P.page.evaluate(() => {
      const w = document.querySelector('[data-daily-rewards="today"]');
      if (!w) return null;
      return { tab: w.getAttribute('data-daily-rewards'), tabs: document.querySelectorAll('[data-daily-tab]').length,
        quests: document.querySelectorAll('[data-daily-quest]').length, rerolls: document.querySelectorAll('[data-reroll]').length,
        words: /daily quest/i.test(w.textContent || ''), season: /season|★/i.test(w.textContent || ''),
        streak: !!document.querySelector('[data-daily-streak]'), spinrow: (document.querySelector('[data-daily-spinrow]') || { getAttribute: () => null }).getAttribute('data-daily-spinrow') };
    }), 10000);
    await shot(P, 'window-today');
    const toasts = await P.page.evaluate(() => (window.__btToastLog || []).map((t) => t.text || t));
    rec.ok('...which opens the window on Today alone: no tabs, the streak and the spin, no daily quest or season anywhere, and no "Daily quest done" toast ever came',
      !!win && win.tab === 'today' && win.tabs === 0 && win.streak && !!win.spinrow && win.quests === 0 && win.rerolls === 0 && !win.words && !win.season
        && !toasts.some((t) => /daily quest/i.test(String(t))), { win, toasts: toasts.slice(-6) });
    await P.page.setViewportSize(SIDEWAYS);
    await P.page.waitForTimeout(900);
    const fit = await P.page.evaluate(() => {
      const c = document.querySelector('[data-daily-card]');
      const x = document.querySelector('[data-daily-close]');
      const r = (el) => { const b = el.getBoundingClientRect(); return { t: Math.round(b.top), b: Math.round(b.bottom), l: Math.round(b.left), r: Math.round(b.right) }; };
      return { card: c && r(c), close: x && r(x), vh: window.innerHeight, vw: window.innerWidth };
    });
    await shot(P, 'window-sideways');
    rec.ok('on a phone on its side the window fits: its card and the close button on screen',
      !!fit.card && fit.card.t >= 0 && fit.card.b <= fit.vh && !!fit.close && fit.close.t >= 0 && fit.close.r <= fit.vw, fit);
    await P.page.setViewportSize(PHONE);
    await P.page.waitForTimeout(700);
    await P.page.evaluate(() => { const b = document.querySelector('[data-daily-close]'); if (b) b.click(); });
    await P.page.waitForTimeout(400);

    /* ── 8. a player from before the drop is paid what they reached ── */
    const cD = await coins();
    const exD = (await state()).spin.extra;
    await H.devOp(wsPort, 'daily', id, { seasonTier: 2 });
    const dropToast = await waitFor(() => P.page.evaluate(() => (window.__btToastLog || []).map((t) => String(t.text || t)).find((t) => /season has ended early/i.test(t)) || null), 8000);
    await P.page.waitForTimeout(800);
    const cD1 = await coins();
    const sD = await state();
    const t1coins = DAILY.SEASON.TIERS[0].filter((g) => g.kind === 'coins').reduce((a2, g) => a2 + g.n, 0);
    await shot(P, 'season-drop');
    rec.ok('a player from before the drop is paid the tiers they reached (tier 1\'s coins, tier 2\'s bonus spin) and told so once, in a toast',
      !!dropToast && /the 2 rewards/.test(dropToast) && cD1 - cD === t1coins && !!sD && sD.spin.extra === exD + 1 && sD.season.cl.join() === '1,2',
      { dropToast, got: cD1 - cD, want: t1coins, extra: sD && sD.spin.extra, cl: sD && sD.season.cl });

    stopAlive = true;
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
