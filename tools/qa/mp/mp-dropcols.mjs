/* ═══ EACH DROP A COLUMN OVER THE MONSTER, ON A PHONE (v2.3.3616) ═══
 *
 * The owner, 2026-10-26: "Instead of showing the dice roll for each drop I
 * think it would be better to show each drop in columns of the floating icon
 * rising with the quantity beneath it and the rarity beneath that. So
 * example: upon monster death and dropping gold with remains, show gold icon,
 * number 5 beneath it, and "Normal" beneath the number. If two items are
 * dropped it will be spaced apart as two columns appearing simultaneously.
 * Rising briefly then disappearing."
 *
 * A real player in the world, a real worker, real kills at Frost Ridge's first
 * snowmen (the test lever /dev/killroll: `next` the kill's roll, `kill`
 * through the path every kill takes -- mp-killroll's way):
 *   1. the columns' pictures were loaded behind the loading screen;
 *   2. a kill that drops gold and remains: two columns over the snowman, side
 *      by side -- the gold coin, its amount (the gold the worker put on the
 *      pile for you), "Normal"; the remains, 1, "Normal" -- each its picture
 *      drawn, the amount under the picture and the rarity under the amount;
 *      and the dice roll is NOT drawn over it any more (it is on the codex);
 *   3. a kill on the Frost Shard's numbers: three columns, the shard's
 *      "Uncommon" in green;
 *   4. on the nugget's number: its column, "Very rare" (the nugget is on no
 *      pile: the killing blow's own);
 *   5. the columns rise and go: higher after a second, gone after their life;
 *   6. a kill off your screen shows its columns over you;
 *   7. no page errors.
 * Pictures: tools/qa/mp/out/dropcols-*.png. */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

/* the page's clock held still for a picture (mp-killroll's snap) */
const snap = async (P, path) => {
  await P.page.evaluate(() => { if (!window.__qaRealNow) { const t = Date.now(); window.__qaRealNow = Date.now; Date.now = () => t; } });
  try { await P.page.screenshot({ path }); }
  finally { await P.page.evaluate(() => { if (window.__qaRealNow) { Date.now = window.__qaRealNow; window.__qaRealNow = null; } }); }
};
const drawn = (P) => P.page.evaluate(() => (window.__btDropCols ? window.__btDropCols() : null));
async function waitGroup(P, monsterId, n, ms = 8000) {
  for (const t0 = Date.now(); Date.now() - t0 < ms;) {
    const d = await drawn(P);
    const g = d && d.find((x) => x.monsterId === monsterId && x.cols.length >= n);
    if (g) return g;
    await P.page.waitForTimeout(80);
  }
  const d = await drawn(P);
  return (d && d.find((x) => x.monsterId === monsterId)) || null;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Dropbro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String(e && e.message || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the world (guard)', !!inW, inW);
    if (!inW) return;
    const me = await H.readState(P, (S) => S.myId);

    /* ── 1 ── */
    const pics = await P.page.evaluate(() => (window.__btDropColIcons ? window.__btDropColIcons() : null));
    rec.ok(`1. the columns' pictures loaded behind the loading screen (${pics})`, pics >= 10, pics);

    await H.devOp(wsPort, 'vitals', me, { god: true, godMinutes: 30 }).catch(() => {});
    await H.devOp(wsPort, 'quests', me, {}).catch(() => {});
    await H.waitFor(P, (S) => !!(S.rpg && S.rpg._quests && S.rpg._quests.tut_1), (v) => v, { timeout: 8000, label: 'the quests done' }).catch(() => null);
    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const at = WHEEL_SPAWNS.frost && WHEEL_SPAWNS.frost.points[0];
    await H.hopTo(P, at[0] + 150, at[1] + 220, { tries: 260 });
    await P.page.waitForTimeout(1500);
    const near = () => P.page.evaluate(() => {
      const S = window._gameState.current, p = S.player;
      return (S.monsters || []).filter((m) => m && m.alive !== false && m.home === 'frost' && !m.tier)
        .map((m) => ({ id: m.id, x: Math.round(m.x), y: Math.round(m.y), d: Math.round(Math.hypot(m.x - p.x, m.y - p.y)) }))
        .sort((a, b) => a.d - b.d);
    });
    const close = await near();
    rec.ok(`at Frost Ridge's first snowmen (${close.length} in sight)`, close.length >= 3, close.slice(0, 4));
    if (close.length < 3) return;
    const used = new Set();
    const nextNear = async () => {
      const m = (await near()).filter((q) => !used.has(q.id))[0];
      if (!m) return null;
      used.add(m.id);
      await H.hopTo(P, m.x, m.y + 200, { tries: 30 });
      await P.page.waitForTimeout(400);
      return m;
    };

    /* ── 2 ── gold and remains */
    const m1 = await nextNear();
    await H.devOp(wsPort, 'killroll', me, { next: 7431, kill: m1.id });
    const g1 = await waitGroup(P, m1.id, 2);
    await snap(P, join(OUT, 'dropcols-1-gold-remains.png'));
    const pile1 = await H.readState(P, (S) => {
      const l = (S.groundLoot || []).filter((x) => x && typeof x.lootId === 'string' && x.lootId.indexOf('mk-') === 0).pop();
      return l ? { coins: l.coins, skull: l.skull } : null;
    });
    const c1 = g1 ? g1.cols : [];
    const gold = c1.find((c) => c.id === 'gold'), rem = c1.find((c) => c.id === 'remnant');
    rec.ok(`2. two columns over the snowman: gold ${gold && gold.qty} "${gold && gold.label}", remains ${rem && rem.qty} "${rem && rem.label}" (the pile's gold for you: ${pile1 && pile1.coins})`,
      !!g1 && c1.length === 2 && !!gold && !!rem && gold.label === 'Normal' && rem.label === 'Normal' && rem.qty === '1'
        && !!pile1 && String(pile1.coins) === gold.qty && Number(gold.qty) > 0, { g1, pile1 });
    rec.ok('2. ...each its picture drawn, the amount under the picture and the rarity under the amount, side by side',
      c1.length === 2 && c1.every((c) => c.icon && c.qtyY > c.iconY && c.labelY > c.qtyY) && Math.abs(c1[0].x - c1[1].x) > 40 && c1[0].x < c1[1].x, c1);
    const rolled = await P.page.evaluate((id) => {
      const S = window._gameState.current;
      const r = (window.__btKillRolls || []).find((x) => x.monsterId === id);
      return { logged: !!r, shown: r ? r.shown : null, popup: (S.dmgNumbers || []).some((d) => d && d.roll) };
    }, m1.id);
    rec.ok('2. ...and the dice roll is not drawn over it any more (the roll still counted, for the codex)',
      rolled.logged && rolled.shown === false && rolled.popup === false, rolled);

    /* ── 3 ── the shard */
    const m2 = await nextNear();
    await H.devOp(wsPort, 'killroll', me, { next: 640, kill: m2.id });
    const g2 = await waitGroup(P, m2.id, 3);
    /* ── 5 ── they rise (measured BEFORE the picture: a picture holds the
       page's clock still for ~3 s on this box, and lets it go all at once) */
    const y0 = g2 ? g2.y : null;
    await P.page.waitForTimeout(600);
    const later = (await drawn(P) || []).find((x) => x.monsterId === m2.id);
    await snap(P, join(OUT, 'dropcols-2-shard.png'));
    const sh = g2 && g2.cols.find((c) => c.id === 'shard');
    rec.ok(`3. on the Frost Shard's numbers: ${g2 && g2.cols.length} columns, the shard "${sh && sh.label}" in ${sh && sh.color}`,
      !!g2 && g2.cols.map((c) => c.id).join() === 'gold,remnant,shard' && !!sh && sh.label === 'Uncommon' && sh.color === '#7EE0A8' && sh.icon, g2);
    rec.ok(`5. the columns rise (${y0} -> ${later && later.y})`, !!later && later.y < y0, { y0, later });
    await P.page.waitForTimeout(2600);
    const gone = (await drawn(P) || []).find((x) => x.monsterId === m2.id);
    rec.ok('5. ...and are gone after their life', !gone, gone);

    /* ── 4 ── the nugget, the killing blow's own */
    const m3 = await nextNear();
    if (m3) {
      await H.devOp(wsPort, 'killroll', me, { next: 1, kill: m3.id });
      const g3 = await waitGroup(P, m3.id, 3);
      const nug = g3 && g3.cols.find((c) => c.id === 'nugget');
      rec.ok(`4. on the nugget's number: its column, "${nug && nug.label}"`, !!nug && nug.label === 'Very rare' && nug.qty === '1' && nug.icon, g3);
    } else rec.ok('4. a third snowman for the nugget (guard)', false);

    /* ── 6 ── a kill off your screen: over you */
    const far = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const m = (S.monsters || []).find((x) => x && x.home === 'tidal' && x.alive !== false);
      return m ? m.id : 'wm-tidal-0';
    });
    const k6 = await H.devOp(wsPort, 'killroll', me, { next: 7431, kill: far }).catch(() => null);
    let over = null;
    for (const t0 = Date.now(); Date.now() - t0 < 6000;) {
      over = await P.page.evaluate((id) => (window.__btDropColLog || []).find((x) => x.monsterId === id) || null, far);
      if (over) break;
      await P.page.waitForTimeout(100);
    }
    rec.ok(`6. a kill off your screen (${far}) shows its columns over you (${over && over.over})`, !!k6 && !!over && over.over === 'you', { k6, over });

    rec.ok('7. no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
