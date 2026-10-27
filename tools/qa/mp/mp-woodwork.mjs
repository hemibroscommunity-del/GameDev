/* ═══ v2.3.3667: THE WOODWORKER, REBUILT AFTER THE BLACKSMITH ═══
 *
 * The owner: "I also want the woodworking menu rehauled and modeled after the
 * blacksmith menu."  WoodworkPanel.jsx is now drawn from the Blacksmith's own
 * parts (BenchParts.jsx), and asks the worker instead of guessing.
 *
 * In the world, upright on a 390 x 844 phone, through the Woodworker's door:
 *   1. the window is the Blacksmith's: "WOODWORKER" over its level and XP
 *      bar, one row of picture tabs (Bow, Staff, Hardened, Upgrade, Traps),
 *      and the Bow tab's rows -- the Pine Bow from five Hardened Pine Wood
 *      (its chip "0/5" in red) and the gold, its XP chip "+1000", Make off --
 *      and the next wood, Softwood, locked "Woodworking 5";
 *   2. NOTHING PREDICTED: with the hardened wood and the gold in the bag, Make
 *      asks the worker, and the bag, the hand and the XP change only when its
 *      answer comes -- the old bow into the weapon bag, a new Pine Bow in hand,
 *      five hardened wood and the gold taken, +1000 Woodworking XP, "Made Pine
 *      Bow!" over your head, the worker's own record the same;
 *   3. the Staff tab lists staffs, the Upgrade tab a row for the bow and one
 *      for the staff you hold, the Traps tab its own rows;
 *   4. sideways: the five tabs in one row, none cut off;
 *   5. no page errors.
 * Pictures: tools/qa/mp/out/woodwork-*.png.
 *
 *   node tools/qa/mp/run.mjs woodwork
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const OUT = join(H.REPO, 'tools/qa/mp/out');
const shot = (P, name) => P.page.screenshot({ path: join(OUT, `woodwork-${name}.png`) }).catch(() => {});

const INIT = () => {
  try {
    const d = {};
    for (const k of ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle', 'blockRanged', 'attack', 'special', 'chatTap', 'passkey']) d[k] = true;
    localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  } catch (e) { /* private mode */ }
  /* the forge_weapon messages the page sends, to prove what Make asks */
  window.__wwSent = [];
  const OrigWS = window.WebSocket;
  window.WebSocket = function (...a) {
    const ws = new OrigWS(...a);
    const send = ws.send.bind(ws);
    ws.send = (data) => {
      try {
        const m = JSON.parse(data);
        const look = (e) => { if (e && e.type === 'forge_weapon') window.__wwSent.push(e.payload); };
        if (Array.isArray(m)) m.forEach(look); else look(m);
      } catch (e) { /* not JSON */ }
      return send(data);
    };
    return ws;
  };
  window.WebSocket.prototype = OrigWS.prototype;
  Object.assign(window.WebSocket, { OPEN: OrigWS.OPEN, CLOSED: OrigWS.CLOSED, CONNECTING: OrigWS.CONNECTING, CLOSING: OrigWS.CLOSING });
};

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Carver', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel', init: INIT });
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
  const me = await H.readState(P, (S) => S.myId);
  /* every quest handed in, so no one stops us in the street; the weapons kit
     for a bow and a staff in hand */
  await H.devOp(wsPort, 'quests', me, {});
  await P.page.waitForFunction(() => { const q = (window._gameState.current.rpg || {})._quests || {}; return q.tut_1 === 'turnedIn'; }, null, { timeout: 8000 }).catch(() => {});
  await H.closeNpcDialogue(P).catch(() => {});
  const armed = await H.armWorker(P, wsPort, me, ['bow', 'staff']).catch(() => []);
  rec.ok(`a bow and a staff in hand, the worker's (${armed.join(', ')}) (guard)`, armed.length === 2, armed);

  const doors = await H.waitFor(P, () => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []), (d) => d.length > 0,
    { timeout: 20000, label: 'the town\'s doors' }).catch(() => []);
  const door = doors.find((d) => d.id === 'woodworker') || null;
  if (!door) { rec.ok('the Woodworker has a door in the Wheel (guard)', false, doors.map((d) => d.id)); return; }
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
  await standAt(door.x, door.y + 30);
  await P.page.waitForTimeout(600);
  await P.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')); if (b) b.click(); });
  const opened = await P.page.waitForSelector('[data-woodwork]', { timeout: 6000 }).then(() => true).catch(() => false);
  rec.ok('the Woodworker\'s door opens the rebuilt window (guard)', opened);
  if (!opened) { await shot(P, 'not-opened'); return; }
  await P.page.waitForTimeout(600);
  const tab = async (id) => { await P.page.click(`[data-ww-type="${id}"]`).catch(() => {}); await P.page.waitForTimeout(300); };
  const row = (sel) => P.page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const go = el.querySelector('button');
    const chips = Array.from(el.querySelectorAll('span')).filter((s) => /^\d+\/\d+$/.test(s.innerText.trim()))
      .map((s) => ({ t: s.innerText.trim(), c: getComputedStyle(s).color }));
    return { text: el.innerText.replace(/\s+/g, ' ').trim(), chips, go: go ? { t: go.textContent.trim(), on: !go.disabled } : null };
  }, sel);

  /* ── 1. the Blacksmith's window ── */
  const head = await P.page.evaluate(() => {
    const w = document.querySelector('[data-woodwork]');
    const tabs = Array.from(document.querySelectorAll('[data-ww-type]')).map((b) => {
      const r = b.getBoundingClientRect(); const im = b.querySelector('img');
      return { t: b.getAttribute('data-ww-type'), y: Math.round(r.top), h: Math.round(r.height), img: !!(im && im.complete && im.naturalWidth > 0) };
    });
    return { title: w ? w.innerText.split('\n')[0] : null, level: (w.querySelector('[data-woodwork-level]') || {}).textContent || null, tabs };
  });
  rec.ok(`1. the header: "${head.title}" over "${head.level}" and its XP bar`, /WOODWORKER/i.test(head.title || '') && /^Lv \d+$/.test(head.level || ''), head);
  rec.ok(`...one row of picture tabs: ${head.tabs.map((t) => t.t).join(', ')}`,
    head.tabs.map((t) => t.t).join() === 'bow,staff,hardwood,upgrade,traps' && new Set(head.tabs.map((t) => t.y)).size === 1
      && head.tabs.every((t) => t.img && t.h >= 44), head.tabs);
  const pine0 = await row('[data-ww-row="pine"]');
  const soft0 = await row('[data-ww-row="softwood"]');
  const xp0 = await P.page.$eval('[data-ww-row="pine"] [data-ww-xp]', (e) => e.getAttribute('data-ww-xp')).catch(() => null);
  rec.ok(`...the Bow tab's Pine Bow: "${pine0 && pine0.text}", its hardened wood "0/5" in red, the XP +${xp0}, Make off`,
    !!pine0 && /Pine Bow/.test(pine0.text) && pine0.chips.length >= 1 && pine0.chips[0].t === '0/5' && pine0.chips[0].c === 'rgb(216, 99, 93)'
      && xp0 === '1000' && pine0.go && pine0.go.t === 'Make' && !pine0.go.on, { pine0, xp0 });
  rec.ok(`...and the next wood, Softwood, locked: "${soft0 && soft0.text}"`,
    !!soft0 && /Softwood Bow/.test(soft0.text) && /Woodworking 5/.test(soft0.text) && soft0.go && soft0.go.t === 'Locked' && !soft0.go.on, soft0);
  await shot(P, 'bow-tab');

  /* ── 2. Make, and nothing until the worker answers ── */
  await H.grant(wsPort, me, 'item', { invKey: 'hardened_pine', count: 5 });
  await H.grant(wsPort, me, 'gold', { amount: 500 });
  await P.page.waitForFunction(() => ((window._gameState.current.rpg.inventory || {}).hardened_pine || 0) >= 5, null, { timeout: 8000 }).catch(() => {});
  await P.page.waitForTimeout(500);
  const pine1 = await row('[data-ww-row="pine"]');
  rec.ok(`2. with five Hardened Pine Wood the chip reads "${pine1 && pine1.chips[0] && pine1.chips[0].t}" in green and Make is on`,
    !!pine1 && pine1.chips[0] && pine1.chips[0].t === '5/5' && pine1.chips[0].c === 'rgb(85, 185, 138)' && pine1.go && pine1.go.on, pine1);
  const bag = () => H.readState(P, (S) => ({ hw: (S.rpg.inventory || {}).hardened_pine || 0, coins: S.rpg.coins || 0,
    stash: (S.rpg.weaponStash || []).length, bow: S.rpg.rangedWeapon ? S.rpg.rangedWeapon.gearBase : null,
    xp: (((S.rpg.lifeSkills || {}).woodworking) || {}).xp || 0, lvl: (((S.rpg.lifeSkills || {}).woodworking) || {}).level || 1 }));
  const b0 = await bag();
  /* the press and the bag in the same moment: the old window took the wood
     and the gold in the browser here, before the worker had said anything */
  const atPress = await P.page.evaluate(async () => {
    const b = document.querySelector('[data-ww-go="pine"]');
    if (b) b.click();
    const R = window._gameState.current.rpg;
    const at = { hw: (R.inventory || {}).hardened_pine || 0, coins: R.coins || 0, stash: (R.weaponStash || []).length };
    /* the page sends on a microtask (wsClient's outbox, one frame a moment):
       let it run, never a task, so the worker's answer cannot come in between */
    for (let i = 0; i < 4; i++) await null;
    return { ...at, sent: window.__wwSent.slice() };
  });
  rec.ok(`...Make asks the worker (forge_weapon ${JSON.stringify(atPress.sent[atPress.sent.length - 1] || null)}) and takes nothing itself (${atPress.hw} hardened, ${atPress.coins} gold at the press)`,
    atPress.sent.length >= 1 && atPress.sent[atPress.sent.length - 1].weaponType === 'bow' && atPress.sent[atPress.sent.length - 1].tierKey === 'pine'
      && atPress.sent[atPress.sent.length - 1].isWoodwork === true && atPress.hw === b0.hw && atPress.coins === b0.coins && atPress.stash === b0.stash, { atPress, b0 });
  await P.page.waitForFunction((n) => (window._gameState.current.rpg.weaponStash || []).length > n, b0.stash, { timeout: 8000 }).catch(() => {});
  await P.page.waitForTimeout(600);
  const b1 = await bag();
  const said = await P.page.evaluate(() => ((window._gameState.current.dmgNumbers) || []).map((d) => d && d.text).filter(Boolean));
  const totalXp = (x) => x.xp + (x.lvl >= 2 ? 1000 : 0);
  rec.ok(`...and the worker's answer: the old bow into the weapon bag (${b0.stash} -> ${b1.stash}), a Pine Bow in hand, five hardened wood and 8 gold taken (${b0.hw} -> ${b1.hw}, ${b0.coins} -> ${b1.coins}), +1000 Woodworking XP`,
    b1.stash === b0.stash + 1 && b1.bow === 'ww_pine' && b1.hw === b0.hw - 5 && b0.coins - b1.coins === 8 && totalXp(b1) - totalXp(b0) === 1000, { b0, b1 });
  rec.ok(`..."Made Pine Bow!" said over your head`, said.some((t) => /Made Pine Bow!/.test(t)), said.slice(-6));
  const srv = await H.adminPlayer(wsPort, me).catch(() => null);
  const sr = (srv && srv.rpg) || {};
  rec.ok('...the worker\'s own record the same (the hardened wood gone, the bow in hand)',
    !((sr.inventory || {}).hardened_pine) && !!sr.rangedWeapon && sr.rangedWeapon.gearBase === 'ww_pine', { hw: (sr.inventory || {}).hardened_pine, bow: sr.rangedWeapon && sr.rangedWeapon.gearBase });
  await shot(P, 'made');

  /* ── 3. the other tabs ── */
  await tab('staff');
  const staffRow = await row('[data-ww-row="pine"]');
  rec.ok(`3. the Staff tab: "${staffRow && staffRow.text}"`, !!staffRow && /Pine Staff/.test(staffRow.text), staffRow);
  await tab('upgrade');
  const up = await P.page.evaluate(() => Array.from(document.querySelectorAll('[data-harden-row]')).map((r) => ({ k: r.getAttribute('data-harden-row'), text: r.innerText.replace(/\s+/g, ' ').trim() })));
  rec.ok(`...the Upgrade tab: a row for the bow and one for the staff (${up.map((u) => u.k).join(', ')})`,
    up.map((u) => u.k).join() === 'bow,staff' && up.every((u) => /H0 → H1/.test(u.text) && /80%/.test(u.text)), up);
  await shot(P, 'upgrade-tab');
  /* a box trap is one log of any kind: with none in the bag the tab says so,
     and with a pine log it has the pine log's row */
  await tab('traps');
  const noLogs = await P.page.$$eval('[data-traps-nologs]', (els) => els.length).catch(() => 0);
  await H.grant(wsPort, me, 'item', { invKey: 'wood_pine_log', count: 2 });
  await P.page.waitForFunction(() => ((window._gameState.current.rpg.inventory || {}).wood_pine_log || 0) >= 2, null, { timeout: 8000 }).catch(() => {});
  await P.page.waitForTimeout(400);
  const traps = await P.page.$$eval('[data-traps-row]', (els) => els.map((e) => e.getAttribute('data-traps-row'))).catch(() => []);
  rec.ok(`...the Traps tab: no logs, it says so (${noLogs}); two pine logs, their row (${traps.join(', ')})`, noLogs === 1 && traps.includes('wood_pine_log'), { noLogs, traps });

  /* ── 4. sideways ── */
  await P.page.setViewportSize({ width: 844, height: 390 });
  await P.page.waitForTimeout(1200);
  const side = await P.page.evaluate(() => {
    const vw = window.innerWidth;
    return Array.from(document.querySelectorAll('[data-ww-type]')).map((b) => { const r = b.getBoundingClientRect(); return { t: b.getAttribute('data-ww-type'), l: Math.round(r.left), r: Math.round(r.right), y: Math.round(r.top), vw }; });
  });
  rec.ok(`4. sideways the five tabs are still one row, none cut off (${side.map((s) => s.t + ' ' + s.l + '-' + s.r).join(', ')})`,
    side.length === 5 && new Set(side.map((s) => s.y)).size === 1 && side.every((s) => s.l >= 0 && s.r <= s.vw), side);
  await shot(P, 'sideways');
  await P.page.setViewportSize(PHONE);
  await P.page.waitForTimeout(600);

  /* ── 5. ── */
  rec.ok(`5. no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
}
