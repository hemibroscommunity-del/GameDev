/* ═══ THE FEED & SEED'S ORDER BOARD, ON A PHONE (v2.3.3134) ═══
 *
 * Owner: "Farming needs a purpose. I think the best purpose it can serve are
 * temporary buffs (boss fights, PvP, dueling, etc) and source of income."
 * (docs/specs/farm-orders.md)
 *
 * One real player, on a phone, in the Wheel's Brotown, against a real worker:
 *   1. "Enter" at the Feed & Seed, then the Orders tab (caps.farmorders):
 *      today's three orders, exactly the board the worker drew for this
 *      player and day, and when they turn over;
 *   2. with nothing in the bag every Deliver is off, and the row says what
 *      you have;
 *   3. given the goods for the first order, its Deliver lights; a tap pays
 *      the order's gold and Farming XP and takes exactly its goods -- the
 *      worker's own copy of the bag and purse say so -- the row reads
 *      "Delivered", and the words over the player say what it paid;
 *   4. the delivered order has no button any more, and the worker refuses it
 *      if asked again (sent by hand), paying nothing;
 *   5. v2.3.3134 (review): at midnight the open window asks for the new board
 *      by itself -- "New orders are on their way…", every Deliver dark --
 *      and when that ask is lost, a Try again brings it;
 *   6. v2.3.3134 (review): `farmorders: false` thrown while the window is open:
 *      a Deliver tap is refused and the tab says the board is closed (it used
 *      to keep the board, Deliver lit, or show "…" forever);
 *   7. no page errors.
 * Every tap is a real one (page.tap: hit-tested, TRAPS §67), the rows' words
 * are checked against the names a player reads, and the countdown against the
 * worker's own turnover time.
 * Pictures: tools/qa/mp/out/farmorders-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { drawFarmOrders, farmOrderById } from '../../../server/src/farmorders.js';

const PHONE = { width: 390, height: 844 };
/* What each order's goods are called in the bag -- independent of the
   window's own tables, so a row reading "Goods" fails. */
const NAME = {
  crop_carrot: 'Carrot', herb_firebloom: 'Firebloom', meal_herb_bread: 'Herb Bread', staminaSalts: 'Stamina Tonic',
  herb_rock_vine: 'Rock Vine', crop_potato: 'Potato', meal_garden_stew: 'Garden Stew', herb_cloudpetal: 'Cloudpetal',
  crop_pumpkin: 'Pumpkin', meal_root_stew: 'Root Stew', meal_pumpkin_pie: 'Pumpkin Pie',
};
const flag = (wsPort, name, value) => fetch(`http://127.0.0.1:${wsPort}/api/admin/flags`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${H.ADMIN_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, value }),
}).then((r) => r.json()).catch(() => null);

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `farmorders-${name}.png`) }).catch(() => {});

  const A = await H.newPlayer(browser, { name: 'Orderbro', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
  const errors = [];
  A.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await A.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await A.page.waitForTimeout(500).catch(() => {});
    }
  })();
  try {
    await H.enterWorld(A);
    const wa = await H.waitFor(A, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the Wheel' }).catch(() => null);
    rec.ok('the player is in the Wheel (guard)', !!wa, wa);
    if (!wa) return;
    const id = await H.readState(A, (S) => S.myId);
    await H.devOp(wsPort, 'quests', id);
    await H.devOp(wsPort, 'vitals', id, { god: true, godMinutes: 30 });
    await A.page.evaluate(() => { setInterval(() => { const S = window._gameState && window._gameState.current; if (S) S._isDesktop = false; }, 120); });
    await A.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});

    const caps = await H.readState(A, (S) => !!(S._serverCaps && S._serverCaps.farmorders));
    rec.ok('the worker advertises caps.farmorders', caps === true, caps);

    /* ── to the Feed & Seed's steps (mp-farm's walk) ── */
    const standAt = async (x, bootsY) => {
      for (let k = 0; k < 4; k++) {
        const dy = await A.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g.y - S.player.y; });
        await H.hopTo(A, x, bootsY - dy, { step: 100, gap: 260, tries: 90 });
        await A.page.waitForTimeout(800);
        const g = await A.page.evaluate(() => window.__btPlayerGround());
        if (Math.hypot(g.x - x, g.y - bootsY) < 12) return true;
      }
      return false;
    };
    let doors = [];
    for (let i = 0; i < 40 && doors.length < 17; i++) {
      doors = await A.page.evaluate(() => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []));
      if (doors.length < 17) await A.page.waitForTimeout(500);
    }
    const fs = doors.find((d) => d.id === 'feedseed');
    rec.ok('the Feed & Seed has a door (guard)', !!fs, doors.map((d) => d.id));
    if (!fs) return;
    await standAt(fs.x, fs.y + 30);
    let enter = null;
    for (let i = 0; i < 16 && !enter; i++) {
      enter = await A.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')); return b ? (b.textContent || '').trim() : null; });
      if (!enter) await A.page.waitForTimeout(250);
    }
    /* A real finger: a touch at the middle of the button, which the page
       delivers to whatever is on top there -- so a button under something
       else fails (TRAPS §67).  Not locator.tap(): it waits for a button to
       stop moving, and the Enter button breathes. */
    const fingerTap = async (sel, text) => {
      const at = await A.page.evaluate(({ s, t }) => {
        const e = Array.from(document.querySelectorAll(s)).find((q) => !t || (q.textContent || '').includes(t));
        if (!e) return null;
        const r = e.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }, { s: sel, t: text || null });
      if (!at) return false;
      await A.page.touchscreen.tap(at.x, at.y);
      return true;
    };
    const tap = (sel) => fingerTap(sel);
    const cover = await H.coveringElement(A, A.page.locator('button.bt-interact-prompt', { hasText: 'Enter' }).first());
    await fingerTap('button.bt-interact-prompt', 'Enter ');
    const board = () => A.page.evaluate(() => {
      const F = window.__btFarm;
      const b = F && F.orders;
      const rows = Array.from(document.querySelectorAll('[data-farm-order]')).map((r) => {
        const btn = r.querySelector('[data-farm-deliver]');
        return { slot: Number(r.getAttribute('data-farm-order')), done: r.getAttribute('data-farm-order-done') === '1',
          text: (r.textContent || '').replace(/\s+/g, ' ').trim(), btn: btn ? { disabled: !!btn.disabled } : null };
      });
      const reset = document.querySelector('[data-farm-orders-reset]');
      return { tab: !!document.querySelector('[data-farm-tab="orders"]'), shown: !!document.querySelector('[data-farm-orders]'),
        board: b ? { day: b.day, ids: b.list.map((o) => o.id), list: b.list } : null, rows,
        reset: reset ? (reset.textContent || '').trim() : null, pending: !!(F && F.pending),
        old: (document.querySelector('[data-farm-orders]') || { getAttribute: () => null }).getAttribute('data-farm-orders-old') === '1',
        closed: !!document.querySelector('[data-farm-status="orders-closed"]'),
        retry: Array.from(document.querySelectorAll('[data-farm-orders] button')).some((q) => /Try again/.test(q.textContent || '')),
        left: b ? b.resetsAt - F.serverNow() : null };
    });
    const until = async (pred, ms = 8000) => {
      let v = null;
      for (let t0 = Date.now(); Date.now() - t0 < ms;) { v = await board(); if (pred(v)) return v; await A.page.waitForTimeout(200); }
      return v;
    };

    /* ── 1. the Orders tab ── */
    const vt = await until((v) => v.tab, 10000);
    rec.ok('a finger on "Enter" opens the Feed & Seed (guard)', vt.tab, cover);
    await tap('[data-farm-tab="orders"]');
    const v1 = await until((v) => v.shown && v.board && v.rows.length === 3);
    await shot(A, 'board');
    const day = v1.board && v1.board.day;
    const want = drawFarmOrders(id, day, 1, 1);
    rec.ok(`"${enter}", then Orders: today's three orders (${v1.board && v1.board.ids.join(', ')}), exactly the board the worker drew for this player and day`,
      !!enter && v1.shown && v1.rows.length === 3 && JSON.stringify(v1.board.ids) === JSON.stringify(want), { v1, want });
    rec.ok(`...each row saying what it wants, by name, and what it pays ("${v1.rows[0] && v1.rows[0].text}")`,
      v1.rows.length === 3 && v1.rows.every((r, i) => { const o = farmOrderById(want[i]); return o && r.text.includes(o.n + ' × ' + NAME[o.key]) && r.text.includes('+' + o.gold) && r.text.includes('+' + o.xp); }), v1.rows);
    /* "New orders in 5h 45m", against the worker's own turnover time. */
    const mm = /^New orders in (?:(\d+)h)? ?(?:(\d+)m)?$/.exec(v1.reset || '');
    const shownMin = mm ? (Number(mm[1] || 0) * 60 + Number(mm[2] || 0)) : NaN;
    const wantMin = Math.ceil((v1.left || 0) / 60000);
    rec.ok(`...and when they turn over ("${v1.reset}", the worker says ${wantMin} min)`, !!mm && Math.abs(shownMin - wantMin) <= 1, { reset: v1.reset, wantMin });

    /* ── 2. an empty bag ── */
    rec.ok('with nothing in the bag every Deliver is off, and the row says "You have 0"',
      v1.rows.every((r) => r.btn && r.btn.disabled && /You have 0/.test(r.text)), v1.rows);

    /* ── 3. the goods for the first order ── */
    const o0 = farmOrderById(want[0]);
    await H.grant(wsPort, id, 'item', { invKey: o0.key, count: o0.n + 1 });
    const v3 = await until((v) => v.rows[0] && v.rows[0].btn && !v.rows[0].btn.disabled, 8000);
    rec.ok(`given ${o0.n + 1} ${o0.key}, the first order's Deliver lights`, v3.rows[0] && v3.rows[0].btn && !v3.rows[0].btn.disabled, v3.rows[0]);
    const before = ((await H.adminPlayer(wsPort, id)) || {}).rpg || {};
    const xp0 = ((before.lifeSkills || {}).farming || {});
    const seen = [];
    await tap('[data-farm-deliver="0"]');
    for (let i = 0; i < 10; i++) {
      for (const t of await H.readState(A, (S) => (S.dmgNumbers || []).map((p) => String(p.text)))) seen.push(t);
      await A.page.waitForTimeout(150);
    }
    const v4 = await until((v) => v.rows[0] && v.rows[0].done, 8000);
    await shot(A, 'delivered');
    const after = ((await H.adminPlayer(wsPort, id)) || {}).rpg || {};
    const xp1 = ((after.lifeSkills || {}).farming || {});
    rec.ok(`a tap delivers: the worker pays its ${o0.gold} gold (${before.coins} -> ${after.coins})`, after.coins === before.coins + o0.gold, { before: before.coins, after: after.coins });
    rec.ok(`...and takes exactly ${o0.n} ${o0.key} (one left)`, (after.inventory || {})[o0.key] === 1, after.inventory && after.inventory[o0.key]);
    rec.ok(`...and pays ${o0.xp} Farming XP`, (xp1.level || 1) > (xp0.level || 1) || (xp1.xp || 0) === (xp0.xp || 0) + o0.xp, { xp0, xp1 });
    rec.ok('...the row reads "Delivered", with no button', v4.rows[0] && v4.rows[0].done && !v4.rows[0].btn && /Delivered/.test(v4.rows[0].text), v4.rows[0]);
    const uniq = [...new Set(seen)];
    rec.ok(`...and the words over the player say what it paid (${uniq.join(' | ')})`,
      uniq.includes('Order delivered') && uniq.includes('+' + o0.gold + ' gold') && uniq.includes('+' + o0.xp + ' Farming XP'), uniq);

    /* ── 4. asked again, by hand ── */
    await H.grant(wsPort, id, 'item', { invKey: o0.key, count: o0.n });
    await A.page.waitForTimeout(800);
    const c0 = (((await H.adminPlayer(wsPort, id)) || {}).rpg || {}).coins;
    await A.page.evaluate(({ d, oid }) => { const S = window._gameState.current; S.channel.send({ type: 'farm_order', payload: { slot: 0, day: d, id: oid } }); }, { d: day, oid: o0.id });
    await A.page.waitForTimeout(1200);
    const c1 = (((await H.adminPlayer(wsPort, id)) || {}).rpg || {}).coins;
    const last = await A.page.evaluate(() => window.__btFarm && window.__btFarm.last && window.__btFarm.last.err);
    rec.ok('the same order sent again by hand is refused by the worker ("order-done"), paying nothing', c1 === c0 && last === 'order-done', { c0, c1, last });

    /* ── 5. midnight, with the window open ── */
    await A.page.evaluate(() => {
      const S = window._gameState.current;
      window.__qaAsks = [];
      window.__qaDrop = true;
      if (!S.channel.__qaWrapped) {
        const orig = S.channel.send.bind(S.channel);
        S.channel.send = (m) => { if (m && m.type === 'farm_open') { window.__qaAsks.push(Date.now()); if (window.__qaDrop) return; } return orig(m); };
        S.channel.__qaWrapped = true;
      }
      const F = window.__btFarm;
      F.orders = Object.assign({}, F.orders, { resetsAt: F.serverNow() - 1000 });
      F.rev += 1;
    });
    const v5 = await until((v) => v.old && /on their way/.test(v.reset || ''), 6000);
    const asked = await A.page.evaluate(() => window.__qaAsks.length);
    rec.ok(`past midnight the window asks for the new board by itself (${asked} ask), saying "${v5.reset}", every Deliver dark`,
      asked >= 1 && v5.old && /New orders are on their way/.test(v5.reset || '') && v5.rows.every((r) => !r.btn || r.btn.disabled), { asked, v5 });
    const v5b = await until((v) => v.retry, 8000);
    const asked2 = await A.page.evaluate(() => window.__qaAsks.length);
    rec.ok('...asks once, and when that ask goes unanswered, offers Try again', v5b.retry && asked2 === 1, { retry: v5b.retry, asked2 });
    await A.page.evaluate(() => { window.__qaDrop = false; });
    await fingerTap('[data-farm-orders] button', 'Try again');
    const v5c = await until((v) => !v.old && /^New orders in \d/.test(v.reset || '') && v.rows.length === 3, 8000);
    rec.ok(`...which brings the board back ("${v5c.reset}")`, !v5c.old && /^New orders in \d/.test(v5c.reset || '') && v5c.board && v5c.board.day === day, v5c);
    await shot(A, 'midnight');

    /* ── 6. the board switched off under an open window ── */
    const open1 = v5c.rows.findIndex((r) => r.btn && !r.done);
    const o1 = open1 >= 0 ? farmOrderById(v5c.board.ids[open1]) : null;
    if (o1) await H.grant(wsPort, id, 'item', { invKey: o1.key, count: o1.n });
    const v6a = await until((v) => v.rows[open1] && v.rows[open1].btn && !v.rows[open1].btn.disabled, 8000);
    rec.ok('another order\'s goods in the bag: its Deliver lights (guard)', !!o1 && !!v6a.rows[open1] && !v6a.rows[open1].btn.disabled, v6a.rows[open1]);
    const off = await flag(wsPort, 'farmorders', false);
    const c6 = (((await H.adminPlayer(wsPort, id)) || {}).rpg || {}).coins;
    await tap(`[data-farm-deliver="${open1}"]`);
    const v6 = await until((v) => v.closed, 8000);
    const c7 = (((await H.adminPlayer(wsPort, id)) || {}).rpg || {}).coins;
    await shot(A, 'closed');
    rec.ok('farmorders:false thrown with the window open: the tap is refused and the tab says the board is closed, nothing paid',
      !!(off && off.ok) && v6.closed && v6.rows.length === 0 && c7 === c6, { off: off && off.ok, closed: v6.closed, c6, c7 });
    await flag(wsPort, 'farmorders', true);

    rec.ok('no page errors', errors.length === 0, errors);
  } finally {
    stopAlive = true;
    await A.ctx.close().catch(() => {});
  }
}
