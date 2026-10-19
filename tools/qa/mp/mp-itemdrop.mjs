/* DROP AN ITEM (v2.3.3473, docs/specs/item-drop.md)
 *
 * The owner: "add an option to "drop" items in game. After about a minute
 * they become visible to other players. After 2 minutes it begins flashing
 * and disappears".  Two phones in the Wheel's BroTown, the dropper and a
 * watcher a few steps away:
 *
 *   1. the bag's card offers Drop; "How many" up to 2 and "Drop 2" sends ONE
 *      item_drop; the bag 5 -> 3 logs; the pile at the dropper's feet, drawn
 *      as the log's own bag picture with "×2"; on the watcher's screen
 *      nothing at all (the worker never sent it);
 *   2. standing on it, the dropper does not pick it straight back up;
 *   3. a minute on (/dev/dropage: a minute is long on this box): the watcher's
 *      screen draws it, the log's picture and "×2";
 *   4. the watcher walks onto it: their bag +2 logs, the pile gone from both
 *      screens;
 *   5. a drop two minutes on: it flashes on both screens (on and off), and
 *      ten seconds later it is gone from both, in nobody's bag;
 *   6. a drop the dropper walks away from and back onto is theirs again;
 *   7. no page errors.
 *
 *   node tools/qa/mp/run.mjs itemdrop
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

const drops = (P) => P.page.evaluate(() => (window.__btDrops ? window.__btDrops().piles : null));
const held = (P, key) => P.page.evaluate((k) => {
  const S = window._gameState.current;
  return ((S && S.rpg && S.rpg.inventory) || {})[k] || 0;
}, key);

async function inWheel(P) {
  for (let i = 0; i < 120; i++) {
    const z = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
    if (z === 'wheel') return true;
    await P.page.waitForTimeout(500);
  }
  return false;
}

/* open the bag's card for `key` and drop `n` of it through the real buttons */
async function dropThroughCard(P, key, n, shot) {
  await P.page.evaluate(() => { try { window.__broDashPanelBus.open('bag'); } catch (e) { /* the band */ } });
  await P.page.waitForTimeout(900);
  const tile = await P.page.$(`[data-inv-key="${key}"]`);
  if (!tile) return { step: 'tile' };
  await tile.dispatchEvent('pointerup');
  const drop = await P.page.waitForSelector('button[data-item-drop=""]', { timeout: 6000 }).catch(() => null);
  if (!drop) return { step: 'drop button' };
  /* the card's row of buttons, each wholly inside the card and on one line */
  const row = await P.page.evaluate(() => {
    const b = document.querySelector('button[data-item-drop=""]');
    const row = b && b.parentElement;
    const card = row && row.parentElement;
    if (!row || !card) return null;
    const cb = card.getBoundingClientRect();
    return [...row.querySelectorAll('button')].map((x) => {
      const r = x.getBoundingClientRect();
      return { text: x.textContent.trim(), inside: r.left >= cb.left - 0.5 && r.right <= cb.right + 0.5, w: Math.round(r.width), h: Math.round(r.height) };
    });
  });
  if (shot) await shot(P, 'card-' + key);
  await drop.click();
  const sheet = await P.page.waitForSelector('[data-drop-sheet]', { timeout: 6000 }).catch(() => null);
  if (!sheet) return { step: 'sheet', row };
  for (let i = 1; i < n; i++) {
    const more = await P.page.$('[data-drop-more]');
    if (!more) return { step: 'more', row };
    await more.click();
    await P.page.waitForTimeout(120);
  }
  if (shot) await shot(P, 'sheet-' + key);
  const shown = await P.page.$eval('[data-drop-qty]', (el) => +el.getAttribute('data-drop-qty')).catch(() => (n === 1 ? 1 : null));
  const label = await P.page.$eval('[data-drop-confirm]', (el) => el.textContent.trim()).catch(() => null);
  await P.page.click('[data-drop-confirm]');
  await P.page.waitForTimeout(300);
  const cardGone = !(await P.page.$('[data-drop-sheet]'));
  await P.page.evaluate(() => { try { window.__broDashPanelBus.clear(); } catch (e) { /* the band */ } });
  return { step: 'done', shown, label, cardGone, row };
}

async function waitDrop(P, pred, timeout = 15000) {
  const t0 = Date.now();
  let last = null;
  while (Date.now() - t0 < timeout) {
    last = await drops(P);
    if (last && pred(last)) return last;
    await P.page.waitForTimeout(250);
  }
  return last;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `itemdrop-${name}.png`) }).catch(() => {});
  const errs = [];
  const A = await H.newPlayer(browser, { name: 'Dropper', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
  const B = await H.newPlayer(browser, { name: 'Finder', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, guest: true });
  for (const P of [A, B]) P.page.on('pageerror', (e) => errs.push(P.name + ': ' + String(e && e.message || e).slice(0, 200)));
  await H.enterWorld(A);
  await H.enterWorld(B);
  const okA = await inWheel(A), okB = await inWheel(B);
  const stopA = H.keepAlive(A), stopB = H.keepAlive(B);
  try {
    await A.page.waitForTimeout(2000);
    const aId = await H.readState(A, (S) => S.myId);
    const bId = await H.readState(B, (S) => S.myId);
    const caps = await H.readState(A, (S) => !!(S._serverCaps && S._serverCaps.itemdrop));
    rec.ok('setup: both in the Wheel, the worker advertises caps.itemdrop', okA && okB && caps, { okA, okB, caps });
    if (!(okA && okB && caps)) return;

    /* the dropper a little west of the arrival, the watcher 150 px east of them */
    const a0 = await H.readState(A, (S) => ({ x: S.player.x, y: S.player.y }));
    const spot = { x: Math.round(a0.x - 90), y: Math.round(a0.y + 40) };
    await H.hopTo(A, spot.x, spot.y, { step: 60 });
    await H.hopTo(B, spot.x + 150, spot.y, { step: 60 });
    await H.waitMutualSight(A, B).catch(() => null);
    await H.grant(wsPort, aId, 'item', { invKey: 'wood_pine_log', count: 5 });
    await H.grant(wsPort, aId, 'item', { invKey: 'ore_copper_ore', count: 2 });
    await H.grant(wsPort, aId, 'item', { invKey: 'fish_trout', count: 2 });
    await H.waitFor(A, (S) => (S.rpg && S.rpg.inventory) || {}, (inv) => inv.wood_pine_log >= 5 && inv.ore_copper_ore >= 2 && inv.fish_trout >= 2, { label: 'the granted items' });
    await H.instrumentWire(A);
    await H.instrumentWire(B);

    /* ── 1. THE CARD'S DROP ── */
    const w0 = (await H.wireCounts(A)).item_drop || 0;
    const r1 = await dropThroughCard(A, 'wood_pine_log', 2, shot);
    rec.ok('1a the bag\'s card offers Drop, "How many" up to 2, and its button says "Drop 2"', r1.step === 'done' && r1.shown === 2 && r1.label === 'Drop 2', r1);
    rec.ok('1a2 ...the card\'s buttons (Light fire, Sell, Drop, X) each inside the card, none under 44 px tall', Array.isArray(r1.row) && r1.row.length >= 3
      && r1.row.some((b) => b.text === 'Drop') && r1.row.every((b) => b.inside && b.h >= 44), r1.row);
    rec.ok('1b ...and the card closes at the tap', r1.cardGone === true, r1);
    const mine = await waitDrop(A, (ps) => ps.some((p) => p.key === 'wood_pine_log' && p.picture));
    const p1 = (mine || []).find((p) => p.key === 'wood_pine_log');
    rec.ok('1c ONE item_drop on the wire', ((await H.wireCounts(A)).item_drop || 0) - w0 === 1, await H.wireCounts(A));
    rec.ok('1d the bag 5 -> 3 logs', await held(A, 'wood_pine_log') === 3, await held(A, 'wood_pine_log'));
    rec.ok('1e the pile just in front of the dropper\'s feet, drawn as the log\'s own bag picture, "×2"',
      !!p1 && p1.picture && /wood/.test(p1.url || '') && p1.count === '×2' && p1.dropBy === aId
        && Math.abs(p1.x - spot.x) < 30 && p1.y - spot.y > 0 && p1.y - spot.y < 70 && p1.pictureWorldPx > 50 /* v2.3.3486: 60 world px, 1.5x the first cut's 40 */, p1);
    rec.ok('1f yours alone for a minute: about 60 s to its opening, 120 to its flashing, 130 to its end',
      !!p1 && p1.openInMs > 50000 && p1.openInMs <= 60000 && p1.flashInMs > 110000 && p1.goneInMs > 120000 && p1.goneInMs <= 130000, p1);
    await shot(A, '1-dropped');
    await B.page.waitForTimeout(1500);
    const bSees1 = await drops(B);
    const bRaw1 = await B.page.evaluate(() => (window._gameState.current.groundLoot || []).filter((l) => l && l.dropped).length);
    rec.ok('1g on the watcher\'s screen nothing at all: no pile drawn, none held (the worker never sent it)', Array.isArray(bSees1) && bSees1.length === 0 && bRaw1 === 0, { bSees1, bRaw1 });

    /* ── 2. NOT PICKED STRAIGHT BACK UP ── */
    const pick0 = (await H.wireCounts(A)).loot_pickup || 0;
    await A.page.waitForTimeout(3000);
    const still = await drops(A);
    rec.ok('2 standing on it, the dropper does not pick it straight back up (3 s, no loot_pickup)',
      (still || []).some((p) => p.lootId === (p1 && p1.lootId)) && await held(A, 'wood_pine_log') === 3 && ((await H.wireCounts(A)).loot_pickup || 0) === pick0,
      { still, sent: ((await H.wireCounts(A)).loot_pickup || 0) - pick0 });

    /* ── 3. A MINUTE ON: EVERYONE'S ── */
    const aged = await H.devOp(wsPort, 'dropage', aId, { ms: 61000 });
    const seen = await waitDrop(B, (ps) => ps.some((p) => p.lootId === (p1 && p1.lootId) && p.picture));
    const pb = (seen || []).find((p) => p.lootId === (p1 && p1.lootId));
    rec.ok('3 a minute on, the watcher\'s screen draws it: the log\'s picture and "×2", open to anyone', !!pb && pb.picture && /wood/.test(pb.url || '') && pb.count === '×2' && pb.openInMs <= 0, { aged, pb });
    await shot(B, '3-watcher-sees');

    /* ── 4. THE WATCHER TAKES IT ── */
    if (pb) await H.hopTo(B, pb.x, pb.y + 15, { step: 50 });
    const bLogs = await H.waitFor(B, (S) => ((S.rpg && S.rpg.inventory) || {}).wood_pine_log || 0, (n) => n >= 2, { label: 'the watcher\'s logs', timeout: 15000 }).catch(() => 0);
    const goneA = await waitDrop(A, (ps) => !ps.some((p) => p.lootId === (p1 && p1.lootId)));
    const goneB = await waitDrop(B, (ps) => !ps.some((p) => p.lootId === (p1 && p1.lootId)));
    rec.ok('4 the watcher walks onto it: their bag +2 logs, the pile gone from both screens',
      bLogs === 2 && !!goneA && !!goneB && !goneA.some((p) => p.lootId === p1.lootId) && !goneB.some((p) => p.lootId === p1.lootId) && await held(A, 'wood_pine_log') === 3,
      { bLogs, goneA, goneB });
    await H.hopTo(B, spot.x + 150, spot.y, { step: 60 });

    /* ── 5. TWO MINUTES ON: IT FLASHES, THEN IT IS GONE ── */
    const r5 = await dropThroughCard(A, 'ore_copper_ore', 1);
    const m5 = await waitDrop(A, (ps) => ps.some((p) => p.key === 'ore_copper_ore' && p.picture));
    const p5 = (m5 || []).find((p) => p.key === 'ore_copper_ore');
    rec.ok('5a one copper ore dropped through the card ("Drop it"), drawn as the ore\'s picture with no count', r5.step === 'done' && r5.label === 'Drop it' && !!p5 && /ore/.test(p5.url || '') && p5.count === null, { r5, p5 });
    await H.devOp(wsPort, 'dropage', aId, { ms: 121000 });
    const flashB = await waitDrop(B, (ps) => ps.some((p) => p.lootId === (p5 && p5.lootId) && p.flashing));
    const flashA = await waitDrop(A, (ps) => ps.some((p) => p.lootId === (p5 && p5.lootId) && p.flashing));
    /* on and off: sample its alpha for a second and a half */
    const alphas = { A: new Set(), B: new Set() };
    for (let i = 0; i < 12; i++) {
      for (const [k, P] of [['A', A], ['B', B]]) {
        const ps = await drops(P);
        const p = (ps || []).find((q) => q.lootId === (p5 && p5.lootId));
        if (p && p.alpha != null) alphas[k].add(p.alpha);
      }
      await A.page.waitForTimeout(110);
    }
    const onOff = (s) => [...s].some((a) => a >= 0.9) && [...s].some((a) => a <= 0.3);
    await shot(B, '5-flashing');
    rec.ok('5b two minutes on, it flashes on both screens: on and off', !!flashA && !!flashB && onOff(alphas.A) && onOff(alphas.B),
      { A: [...alphas.A], B: [...alphas.B] });
    const end5A = await waitDrop(A, (ps) => !ps.some((p) => p.lootId === (p5 && p5.lootId)), 20000);
    const end5B = await waitDrop(B, (ps) => !ps.some((p) => p.lootId === (p5 && p5.lootId)), 20000);
    rec.ok('5c ...and ten seconds later it is gone from both screens, in nobody\'s bag',
      !!end5A && !!end5B && !end5A.some((p) => p.lootId === p5.lootId) && !end5B.some((p) => p.lootId === p5.lootId)
        && await held(A, 'ore_copper_ore') === 1 && await held(B, 'ore_copper_ore') === 0, { end5A, end5B });

    /* ── 6. WALK AWAY, WALK BACK: YOURS AGAIN ── */
    await dropThroughCard(A, 'fish_trout', 1);
    const m6 = await waitDrop(A, (ps) => ps.some((p) => p.key === 'fish_trout'));
    const p6 = (m6 || []).find((p) => p.key === 'fish_trout');
    rec.ok('6a a trout dropped (the bag 2 -> 1)', !!p6 && await held(A, 'fish_trout') === 1, p6);
    if (p6) {
      await H.hopTo(A, p6.x - 110, p6.y + 15, { step: 50 });
      await A.page.waitForTimeout(800);
      await H.hopTo(A, p6.x, p6.y + 15, { step: 50 });
    }
    const back = await H.waitFor(A, (S) => ((S.rpg && S.rpg.inventory) || {}).fish_trout || 0, (n) => n >= 2, { label: 'the trout back', timeout: 15000 }).catch(() => 0);
    const gone6 = await waitDrop(A, (ps) => !ps.some((p) => p.lootId === (p6 && p6.lootId)));
    rec.ok('6b walked away from and back onto, it is the dropper\'s again: the bag 1 -> 2, the pile gone', back === 2 && !!gone6 && !gone6.some((p) => p.lootId === (p6 && p6.lootId)), { back, gone6 });

    /* ── 7. ── */
    rec.ok('7 no page errors', errs.length === 0, errs.slice(0, 5));
    void bId;
  } finally {
    stopA(); stopB();
    await A.ctx.close().catch(() => {});
    await B.ctx.close().catch(() => {});
  }
}
