/* HARDENING TAKES BARS, AND ITS GOLD DOUBLES (v2.3.3139)
 *
 * The owner: "I think hardening should cost 1 bar per level (hardening lvl 1
 * cost 1 bar, hardening lvl 2 costs 2 bars, and a doubling gold cost per
 * level)", then "I meant 1000 for lvl 2, 2000 for lvl 3, etc".
 *
 * A phone in the Wheel's BroTown, against a real worker, through the real
 * doors:
 *   1. the worker advertises caps.hardenbars (and caps.harden);
 *   2. sixty copper ore smelted at the Blacksmith (Smithing 5, twelve bars),
 *      a wooden greatsword forged into the hand -- the wood tier, so copper
 *      bars;
 *   3. the Upgrade tab's Harden row: the copper bar's picture "12/1" beside
 *      the gold "/500" and the 80%;
 *   4. Harden until the bars run short: before every attempt the row shows
 *      the ladder's price for its level (H+1 bars, 500 x 2^H gold), and the
 *      worker takes exactly that -- its answer says the same bars; a failure's
 *      words over the smith name the bars too;
 *   5. bars short: the chip reads "have/need" in red and Harden is off; the
 *      worker's bag agrees with the game's;
 *   6. the Woodworker: a pine bow in hand, its Harden button says what the
 *      next attempt takes or the bars it is short ("Need 1 Copper Bar more"),
 *      and with bars granted, "Attempt H1 (500G + 1 Copper Bar · 80%)" -- the
 *      worker takes one bar and 500 gold for the bow;
 *   7. no page errors.
 * Pictures: tools/qa/mp/out/hardenbars-*.png.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const shot = (P, name) => P.page.screenshot({ path: `tools/qa/mp/out/hardenbars-${name}.png` }).catch(() => {});
const ladderGold = (h) => 500 * Math.pow(2, h);
const ladderBars = (h) => h + 1;

/* the worker's harden answers, in order (mp-smithy's hook) */
const recordReplies = () => {
  try {
    const d = {};
    for (const k of ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle', 'blockRanged', 'attack', 'special', 'chatTap', 'passkey']) d[k] = true;
    localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  } catch (e) { /* private mode */ }
  window.__hardenReplies = [];
  const OrigWS = window.WebSocket;
  window.WebSocket = function (...a) {
    const ws = new OrigWS(...a);
    ws.addEventListener('message', (ev) => {
      try {
        const m = JSON.parse(ev.data);
        const look = (e) => { if (e && e.type === 'harden_result') window.__hardenReplies.push(e.payload); };
        look(m);
        if (m && Array.isArray(m.events)) m.events.forEach(look);
        if (m && Array.isArray(m.batch)) m.batch.forEach(look);
      } catch (e) { /* not JSON */ }
    });
    return ws;
  };
  window.WebSocket.prototype = OrigWS.prototype;
  Object.assign(window.WebSocket, { OPEN: OrigWS.OPEN, CLOSED: OrigWS.CLOSED, CONNECTING: OrigWS.CONNECTING, CLOSING: OrigWS.CLOSING });
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Hardener', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel', init: recordReplies });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 300)));
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();
  try {
    await body({ P, wsPort, rec, errors });
  } finally {
    stopAlive = true;
    await P.ctx.close().catch(() => {});
  }
}

async function body({ P, wsPort, rec, errors }) {
  await H.enterWorld(P);
  const inWheel = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
    { timeout: 120000, label: 'into the Wheel' }).catch(() => null);
  rec.ok('in the Wheel (guard)', !!inWheel, inWheel);
  if (!inWheel) return;
  if (await P.page.$('[data-chest-window]')) { await P.page.click('text=Later').catch(() => {}); await P.page.waitForTimeout(300); }
  const me = await H.readState(P, (S) => S.myId);

  /* ── 1. caps ── */
  const caps = await H.readState(P, (S) => ({ harden: !!(S._serverCaps && S._serverCaps.harden), bars: !!(S._serverCaps && S._serverCaps.hardenbars) }));
  rec.ok('the worker advertises caps.hardenbars (and caps.harden)', caps.harden && caps.bars, caps);
  if (!(caps.harden && caps.bars)) return;
  /* every quest handed in, so no one stops us in the street */
  await H.devOp(wsPort, 'quests', me, {});
  await P.page.waitForFunction(() => { const q = (window._gameState.current.rpg || {})._quests || {}; return q.tut_1 === 'turnedIn'; }, null, { timeout: 8000 }).catch(() => {});
  await H.closeNpcDialogue(P).catch(() => {});
  await H.grant(wsPort, me, 'item', { invKey: 'ore_copper_ore', count: 60 });
  await H.grant(wsPort, me, 'item', { invKey: 'wood_pine_log', count: 3 });
  await H.grant(wsPort, me, 'gold', { amount: 30000 });
  await P.page.waitForFunction(() => { const R = window._gameState.current.rpg || {}; return ((R.inventory || {}).ore_copper_ore || 0) >= 60 && (R.coins || 0) >= 30000; }, null, { timeout: 8000 }).catch(() => {});

  const doors = await H.waitFor(P, () => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []), (d) => d.length > 0,
    { timeout: 20000, label: 'the town\'s doors' }).catch(() => []);
  const door = (id) => doors.find((d) => d.id === id) || null;
  const standAt = async (x, bootsY) => {
    for (let k = 0; k < 4; k++) {
      const dy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g.y - S.player.y; });
      await H.hopTo(P, x, bootsY - dy, { step: 100, gap: 260, tries: 90 });
      await P.page.waitForTimeout(800);
      const g = await P.page.evaluate(() => window.__btPlayerGround());
      if (Math.hypot(g.x - x, g.y - bootsY) < 14) return true;
    }
    return false;
  };
  const enter = async (d, sel) => {
    await standAt(d.x, d.y + 30);
    await P.page.waitForTimeout(600);
    await P.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')); if (b) b.click(); });
    return P.page.waitForSelector(sel, { timeout: 6000 }).then(() => true).catch(() => false);
  };
  const shut = async () => {
    await P.page.keyboard.press('Escape').catch(() => {});
    await P.page.waitForTimeout(500);
  };
  const tab = async (id) => { await P.page.click(`[data-smithy-tab="${id}"]`); await P.page.waitForTimeout(300); };
  const bag = () => H.readState(P, (S) => ({ bars: ((S.rpg.inventory || {}).bar_copper) || 0, coins: S.rpg.coins || 0,
    w: S.rpg.weapon ? { h: S.rpg.weapon.hardness || 0, t: S.rpg.weapon.temper || 0, gb: S.rpg.weapon.gearBase } : null,
    bow: S.rpg.rangedWeapon ? { h: S.rpg.rangedWeapon.hardness || 0, gb: S.rpg.rangedWeapon.gearBase } : null }));

  /* ── 2. bars and a blade ── */
  const smith = door('blacksmith');
  if (!smith) { rec.ok('the Blacksmith has a door in the Wheel (guard)', false, doors.map((d) => d.id)); return; }
  const opened = await enter(smith, '[data-smithy]');
  rec.ok('the Blacksmith\'s door opens its panel', opened);
  if (!opened) { await shot(P, 'no-smithy'); return; }
  await tab('smelt');
  await P.page.click('[data-smelt-all="bar_copper"]').catch(() => {});
  await P.page.waitForFunction(() => {
    const R = window._gameState.current.rpg || {};
    return ((R.inventory || {}).bar_copper || 0) >= 12 && (((R.lifeSkills || {}).blacksmithing || {}).level || 0) >= 5;
  }, null, { timeout: 10000 }).catch(() => {});
  await P.page.waitForTimeout(800);
  await tab('forge');
  await P.page.click('[data-forge-go="wood"]').catch(() => {});
  await P.page.waitForFunction(() => { const w = window._gameState.current.rpg.weapon; return w && w.gearBase === 'wood'; }, null, { timeout: 8000 }).catch(() => {});
  const b0 = await bag();
  const lvl = await H.readState(P, (S) => ((S.rpg.lifeSkills || {}).blacksmithing || {}).level || 0);
  rec.ok(`setup: twelve copper bars smelted (Smithing ${lvl}), a wooden greatsword in hand at H0`, b0.bars === 12 && lvl >= 5 && !!b0.w && b0.w.gb === 'wood' && b0.w.h === 0, { b0, lvl });
  if (!(b0.w && b0.w.gb === 'wood')) return;

  /* ── 3. the Harden row ── */
  await tab('upgrade');
  await P.page.waitForSelector('[data-harden-row]', { timeout: 4000 }).catch(() => {});
  const readRow = () => P.page.evaluate(() => {
    const row = document.querySelector('[data-harden-row]');
    if (!row) return null;
    const chip = row.querySelector('[data-harden-bars] > span');
    const nums = Array.from(row.innerText.matchAll(/(\d+)\/(\d+)/g)).map((m) => [Number(m[1]), Number(m[2])]);
    const go = row.querySelector('[data-harden-go]');
    return {
      text: row.innerText.replace(/\s+/g, ' ').trim(),
      bar: (row.querySelector('[data-harden-bars]') || {}).getAttribute ? row.querySelector('[data-harden-bars]').getAttribute('data-harden-bars') : null,
      chip: chip ? chip.innerText.trim() : null,
      chipImg: !!(chip && chip.querySelector('img') && chip.querySelector('img').naturalWidth > 0),
      chipColor: chip ? getComputedStyle(chip).color : null,
      barsHave: nums[0] ? nums[0][0] : null, barsNeed: nums[0] ? nums[0][1] : null,
      goldNeed: nums[1] ? nums[1][1] : null,
      on: !!(go && !go.disabled),
    };
  });
  const r0 = await readRow();
  rec.ok(`the row: the copper bar's picture "${r0 && r0.chip}" beside the gold "/${r0 && r0.goldNeed}" and 80% ("${r0 && r0.text}")`,
    !!r0 && r0.bar === 'bar_copper' && r0.chip === '12/1' && r0.chipImg && r0.goldNeed === 500 && /80%/.test(r0.text) && r0.on, r0);
  await shot(P, 'row');

  /* ── 4. harden until the bars run short ── */
  const attempts = [];
  let failWords = null;
  for (let i = 0; i < 16; i++) {
    const r = await readRow();
    const before = await bag();
    if (!r || !r.on) break;
    const nReplies = await P.page.evaluate(() => window.__hardenReplies.length);
    await P.page.click('[data-harden-go]');
    await P.page.waitForFunction((n) => window.__hardenReplies.length > n, nReplies, { timeout: 8000 }).catch(() => {});
    const reply = await P.page.evaluate((n) => window.__hardenReplies[n] || null, nReplies);
    /* the bag and the purse come back on the worker's player_state */
    let after = before;
    for (let k = 0; k < 20; k++) {
      after = await bag();
      if (after.coins !== before.coins && after.bars !== before.bars) break;
      await P.page.waitForTimeout(250);
    }
    if (reply && reply.success === false && !reply.error && !failWords) {
      failWords = await P.page.evaluate(() => ((window._gameState.current.dmgNumbers) || []).map((d) => d && d.text).filter((t) => /Hardening failed/.test(t || '')).pop() || null);
    }
    attempts.push({ h: before.w.h, shownBars: r.barsNeed, shownGold: r.goldNeed, reply, tookBars: before.bars - after.bars, tookGold: before.coins - after.coins, to: after.w && after.w.h });
    /* the row comes back when the smith's busy state clears on the change */
    const nb = await bag();
    if (nb.bars < ladderBars(nb.w.h)) break;
    await P.page.waitForFunction(() => { const g = document.querySelector('[data-harden-go]'); return !!g && !g.disabled; }, null, { timeout: 6000 }).catch(() => {});
    await P.page.waitForTimeout(300);
  }
  const bad = attempts.filter((a) => !(a.reply && a.reply.success !== undefined && !a.reply.error
    && a.shownBars === ladderBars(a.h) && a.shownGold === ladderGold(a.h)
    && a.reply.cost === ladderGold(a.h) && a.reply.bars === ladderBars(a.h) && a.reply.bar === 'bar_copper'
    && a.tookBars === ladderBars(a.h) && a.tookGold === ladderGold(a.h)));
  rec.ok(`${attempts.length} attempts, each shown at the ladder's price for its level and charged exactly that (${attempts.map((a) => 'H' + a.h + ':' + a.tookBars + 'b/' + a.tookGold + 'g' + (a.reply && a.reply.success ? '✓' : '✗')).join(' ')})`,
    attempts.length >= 2 && bad.length === 0, { attempts, bad });
  const levels = Array.from(new Set(attempts.map((a) => a.h))).sort();
  rec.ok(`...at ${levels.length} levels (H${levels.join(', H')}): the bars go up one a level and the gold doubles`, levels.length >= 1, levels);
  if (failWords) rec.ok(`a failure's words name the bars: "${failWords}"`, /-\d+ Copper Bars?\)/.test(failWords), failWords);
  else rec.ok('(no attempt failed this run, so there were no failure words to read)', true);

  /* ── 5. short of bars ── */
  await P.page.waitForTimeout(600);
  const rEnd = await readRow();
  const bEnd = await bag();
  const srv = await H.adminPlayer(wsPort, me).catch(() => null);
  const srvBars = srv && srv.rpg && srv.rpg.inventory ? (srv.rpg.inventory.bar_copper || 0) : null;
  /* C.bad, #D8635D, SmithyPanel's "not enough" */
  rec.ok(`short of bars: the chip reads "${rEnd && rEnd.chip}" in red and Harden is off`,
    !!rEnd && rEnd.barsHave === bEnd.bars && rEnd.barsNeed === ladderBars(bEnd.w.h) && rEnd.barsHave < rEnd.barsNeed && !rEnd.on
      && rEnd.chipColor === 'rgb(216, 99, 93)', { rEnd, bEnd });
  rec.ok(`...and the worker's bag says the same (${srvBars} copper bars)`, srvBars === bEnd.bars, { srvBars, client: bEnd.bars });
  await shot(P, 'short');
  await shut();

  /* ── 6. the Woodworker, a bow ── */
  await H.devOp(wsPort, 'kit', me, { what: 'weapons' });
  await P.page.waitForFunction(() => (window._gameState.current.rpg.weaponStash || []).some((w) => w && w.type === 'bow'), null, { timeout: 8000 }).catch(() => {});
  await H.equipWeapon(P, 'bow', 'rangedWeapon', 'ranged');
  await P.page.waitForFunction(() => { const b = window._gameState.current.rpg.rangedWeapon; return b && b.gearBase === 'ww_pine'; }, null, { timeout: 8000 }).catch(() => {});
  const ww = door('woodworker');
  const wOpen = ww ? await enter(ww, 'button[data-harden-go]') : false;
  await P.page.waitForTimeout(800);
  const wwBtn = () => P.page.evaluate(() => {
    const b = document.querySelector('button[data-harden-go]');
    return b ? { text: b.textContent.trim(), on: !b.disabled, cost: (b.querySelector('[data-harden-cost]') || { getAttribute: () => null }).getAttribute('data-harden-cost') } : null;
  });
  const bw = await bag();
  const w0 = await wwBtn();
  const shortBy = 1 - bw.bars;   /* the bow is at H0: one copper bar */
  rec.ok(`the Woodworker's Harden button for the pine bow: "${w0 && w0.text}"`,
    wOpen && !!w0 && !!bw.bow && bw.bow.gb === 'ww_pine'
      && (shortBy > 0 ? (w0.text === 'Need 1 Copper Bar more' && !w0.on) : (/^Attempt H1 \(500G \+ 1 Copper Bar · 80%\)$/.test(w0.text) && w0.on)), { w0, bw });
  await H.grant(wsPort, me, 'item', { invKey: 'bar_copper', count: 3 });
  await P.page.waitForFunction((n) => ((window._gameState.current.rpg.inventory || {}).bar_copper || 0) >= n + 3, bw.bars, { timeout: 8000 }).catch(() => {});
  await P.page.waitForTimeout(500);
  const w1 = await wwBtn();
  rec.ok(`...with bars: "${w1 && w1.text}"`, !!w1 && w1.text === 'Attempt H1 (500G + 1 Copper Bar · 80%)' && w1.on && w1.cost === 'bar_copper:1', w1);
  await P.page.evaluate(() => { const b = document.querySelector('button[data-harden-go]'); if (b) b.scrollIntoView({ block: 'center' }); });
  await P.page.waitForTimeout(300);
  await shot(P, 'woodworker');
  const before = await bag();
  const nR = await P.page.evaluate(() => window.__hardenReplies.length);
  await P.page.click('button[data-harden-go]').catch(() => {});
  await P.page.waitForFunction((n) => window.__hardenReplies.length > n, nR, { timeout: 8000 }).catch(() => {});
  const wr = await P.page.evaluate((n) => window.__hardenReplies[n] || null, nR);
  let after = before;
  for (let k = 0; k < 20; k++) { after = await bag(); if (after.bars !== before.bars) break; await P.page.waitForTimeout(250); }
  rec.ok(`...and the worker took one copper bar and 500 gold for the bow (${before.bars} -> ${after.bars} bars, ${before.coins} -> ${after.coins} gold)`,
    !!wr && wr.slot === 'rangedWeapon' && wr.bar === 'bar_copper' && wr.bars === 1 && wr.cost === 500 && before.bars - after.bars === 1 && before.coins - after.coins === 500, { wr, before, after });
  await shut();

  /* ── 7. ── */
  rec.ok(`no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
}
