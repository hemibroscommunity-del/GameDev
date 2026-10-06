/* ═══ THE FEED & SEED'S ORDER BOARD, ON A PHONE (v2.3.3109) ═══
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
 *   5. no page errors.
 * Pictures: tools/qa/mp/out/farmorders-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { drawFarmOrders, farmOrderById } from '../../../server/src/farmorders.js';

const PHONE = { width: 390, height: 844 };

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
    await A.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')); if (b) b.click(); });

    const tap = (sel) => A.page.evaluate((s) => { const e = document.querySelector(s); if (e && !e.disabled) { e.click(); return true; } return false; }, sel);
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
        reset: reset ? (reset.textContent || '').trim() : null, pending: !!(F && F.pending) };
    });
    const until = async (pred, ms = 8000) => {
      let v = null;
      for (let t0 = Date.now(); Date.now() - t0 < ms;) { v = await board(); if (pred(v)) return v; await A.page.waitForTimeout(200); }
      return v;
    };

    /* ── 1. the Orders tab ── */
    await until((v) => v.tab, 10000);
    await tap('[data-farm-tab="orders"]');
    const v1 = await until((v) => v.shown && v.board && v.rows.length === 3);
    await shot(A, 'board');
    const day = v1.board && v1.board.day;
    const want = drawFarmOrders(id, day, 1, 1);
    rec.ok(`"${enter}", then Orders: today's three orders (${v1.board && v1.board.ids.join(', ')}), exactly the board the worker drew for this player and day`,
      !!enter && v1.shown && v1.rows.length === 3 && JSON.stringify(v1.board.ids) === JSON.stringify(want), { v1, want });
    rec.ok(`...each row saying what it wants and pays ("${v1.rows[0] && v1.rows[0].text}")`,
      v1.rows.length === 3 && v1.rows.every((r, i) => { const o = farmOrderById(want[i]); return o && r.text.includes(String(o.n)) && r.text.includes('+' + o.gold) && r.text.includes('+' + o.xp); }), v1.rows);
    rec.ok(`...and when they turn over ("${v1.reset}")`, /^New orders in \d/.test(v1.reset || ''), v1.reset);

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

    rec.ok('no page errors', errors.length === 0, errors);
  } finally {
    stopAlive = true;
    await A.ctx.close().catch(() => {});
  }
}
