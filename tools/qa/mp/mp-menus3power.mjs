/* ═══ v2.3.6862: BRO · POWER IN THE NEW PANEL, PLAYED (card MN step 5) ═══
 *
 * The owner's Power (docs/design/menus3/; the card's step "Bro · Power"):
 * the face, the weapon bar and the Power tab open the new panel on Power;
 * four lanes with their levels; the lane's real upgrades as cards, each a
 * stage and a minus (44+, 8 px apart); a DRAFT that sends nothing until
 * Apply; ONE "Apply N points" that sends the game's existing request a
 * point at a time and lands them; the kinds of point told apart; a stop
 * said in plain words; the stats line opening the lane's real numbers and
 * DPS its breakdown; leaving with a draft drops it.
 *
 * The character: points dealt by the worker's own lever (the Test panel's
 * combat deal: Sword to level 5, its points, sword's and shared, waiting).
 *
 *   1. UPRIGHT (390 x 844, touch): the face opens Power on the hand's lane
 *      (Sword: it has points), the tab's and the lane's dots; the four lanes
 *      44+; six cards, each stage and minus 44+ and 8+ apart; two stages,
 *      a minus, the arrow: Apply's count follows and NOTHING is sent; a
 *      stage on Sword and one on Body: Apply 2, the kinds told apart; the
 *      line down (no socket): the stop said, nothing applied; Apply: both
 *      land (the worker's numbers), the draft empty; the stats line, DPS's
 *      breakdown, Back twice; a draft left by the Bag tab is dropped; the
 *      weapon bar opens the hand's lane; the free Reset is there, quiet;
 *   2. SIDEWAYS (844 x 390): the drawer; a card's stage and Apply inside it;
 *   3. A COMPUTER (1280 x 800, `wide: true`): the drawer; a stage, Apply
 *      within it; Esc closes and drops the draft.
 *
 * Pictures (deviceScaleFactor 1): tools/qa/out/menus3power-*.png. */
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as H from './harness.mjs';
export const lane = 'full';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = path.join(ROOT, 'tools', 'qa', 'out');

const box = (P, sel) => P.page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return r.width > 0 ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } : null; }, sel);
const boxes = (P, sel) => P.page.evaluate((s) => Array.from(document.querySelectorAll(s)).map((el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; }).filter((r) => r.w > 0), sel);
const probe = (P) => P.page.evaluate(() => { const p = window.__btMenus3Power; const s = window.__btMenus3.panelState(); return { open: s.open, section: s.section, page: p ? p.page : null, lane: p ? p.lane : null, total: p ? p.total : -1, draft: p ? p.draft : [], queue: p ? p.queue : null, note: p ? p.note : null, waiting: p ? p.waiting : null }; });
const pts = (P) => H.readState(P, (S) => { const p = (S.rpg && S.rpg.prog3) || {}; return { range: ((p.atk || {}).sword || {}).range || 0, dmg: ((p.atk || {}).sword || {}).dmg || 0, hp: (p.alloc || {}).hp || 0, sword: (p.poolBy || {}).sword || 0, shared: p.shared || 0, pool: p.pool || 0 }; });

async function tap(P, sel, touch) {
  const b = await box(P, sel);
  if (!b) return false;
  const x = b.x + b.w / 2, y = b.y + b.h / 2;
  if (touch) await P.page.touchscreen.tap(x, y); else await P.page.mouse.click(x, y);
  await P.page.waitForTimeout(450);
  return true;
}
async function shot(P, name) {
  try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: path.join(OUT, 'menus3power-' + name + '.png') }); } catch (e) { /* a picture only */ }
}
async function inWorld(P, rec, who) {
  await H.enterWorld(P);
  const w = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'in the world' }).catch(() => null);
  rec.ok(`${who}: in the world (BroTown)`, !!w, w);
  if (!w) return false;
  await P.page.waitForFunction(() => !!(window.__btMenus3 && window.__btMenus3.on()), null, { timeout: 30000 }).catch(() => {});
  await P.page.waitForTimeout(1500);
  return true;
}
/* points waiting: the worker's own lever deals Sword to level 5 (its points, sword's and shared) */
async function seed(P, wsPort, rec, who) {
  const id = await H.readState(P, (S) => S.myId);
  const dealt = await H.devOp(wsPort, 'combat', id, { skill: 'sword', level: 5, deal: true }).catch(() => null);
  let p = null;
  for (let i = 0; i < 20; i++) { p = await pts(P); if (p.sword > 0 && p.shared > 0) break; await P.page.waitForTimeout(300); }
  rec.ok(`${who}: points waiting in Sword and shared`, !!dealt && p.sword > 0 && p.shared > 0, { dealt: dealt && dealt.ok, p });
  return p;
}
const until = (P, fn, ok, ms, label) => H.waitFor(P, fn, ok, { timeout: ms, label }).catch(() => null);

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── 1. upright ── */
  const P = await H.newPlayer(browser, { name: 'Powerphone', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, query: 'menus3=1' });
  try {
    if (await inWorld(P, rec, 'upright')) {
      const p0 = await seed(P, wsPort, rec, 'upright');
      const faced = await tap(P, '[data-hudart-face]', true);
      if (!faced) await P.page.evaluate(() => window.__btMenus3.go('hud.face'));
      await P.page.waitForTimeout(600);
      let s = await probe(P);
      rec.ok('upright: the face opens the new panel on Power, the hand\'s lane (Sword)', s.open && s.section === 'power' && s.page === 'root' && s.lane === 'sword', { faced, s });
      rec.ok('upright: the dot on Power and on the lanes with points (Sword, Body)', !!(await box(P, '[data-menus3-dot="power"]')) && !!(await box(P, '[data-m3-lane="sword"] [data-m3-lane-dot]')) && !!(await box(P, '[data-m3-lane="body"] [data-m3-lane-dot]')) && !(await box(P, '[data-m3-lane="bow"] [data-m3-lane-dot]')), s.waiting);
      const lanes = await boxes(P, '[data-m3-lane]');
      rec.ok('upright: four lanes, each 44+ tall', lanes.length === 4 && lanes.every((b) => b.h >= 44 && b.w >= 44), lanes);
      rec.ok('upright: the overall level and XP at the top', !!(await box(P, '[data-m3-level]')), null);
      const adds = await boxes(P, '[data-m3-stage]');
      const subs = await boxes(P, '[data-m3-unstage]');
      const gaps = adds.map((a, i) => (subs[i] ? subs[i].x - (a.x + a.w) : -1));
      rec.ok('upright: Sword\'s six upgrades, each stage and minus 44+ and 8+ apart', adds.length === 6 && subs.length === 6 && adds.every((b) => b.h >= 44 && b.w >= 44) && subs.every((b) => b.h >= 44 && b.w >= 44) && gaps.every((g) => g >= 8), { adds: adds[0], subs: subs[0], gaps });
      await shot(P, 'upright-open');

      /* the draft: two stages, a minus, the arrow -- and nothing sent */
      await tap(P, '[data-m3-stage="range"]', true);
      await tap(P, '[data-m3-stage="range"]', true);
      s = await probe(P);
      const applyWord = await P.page.evaluate(() => (document.querySelector('[data-m3-apply]') || {}).textContent || '');
      rec.ok('upright: two stages: "Apply 2 points", both from Sword\'s own', s.total === 2 && /Apply 2 points/.test(applyWord) && s.draft.every((d) => d.from === 'weapon'), { s, applyWord });
      await shot(P, 'upright-draft');
      await tap(P, '[data-m3-unstage="range"]', true);
      s = await probe(P);
      rec.ok('upright: the minus takes one back', s.total === 1, s.total);
      await tap(P, '[data-m3-clear]', true);
      s = await probe(P);
      await P.page.waitForTimeout(1200);
      const p1 = await pts(P);
      rec.ok('upright: the arrow clears the draft; NOTHING was sent', s.total === 0 && p1.range === p0.range && p1.sword === p0.sword, { s: s.total, p0, p1 });

      /* a stage on Sword and one on Body: the kinds told apart */
      await tap(P, '[data-m3-stage="range"]', true);
      await tap(P, '[data-m3-lane="body"]', true);
      s = await probe(P);
      rec.ok('upright: the lane switch keeps the draft', s.lane === 'body' && s.total === 1, s);
      await tap(P, '[data-m3-stage="hp"]', true);
      s = await probe(P);
      const kinds = await P.page.evaluate(() => Array.from(document.querySelectorAll('[data-m3-kind]')).map((e) => e.getAttribute('data-m3-kind') + ':' + e.textContent));
      rec.ok('upright: Apply 2; the body\'s point drawn from the shared, Sword\'s from its own', s.total === 2 && s.draft[0].from === 'weapon' && s.draft[1].from === 'shared' && kinds.some((k) => /^shared:Shared points/.test(k)), { draft: s.draft, kinds });

      /* the line down: the stop said in plain words, nothing applied */
      await P.page.evaluate(() => { const S = window._gameState.current; S.__liveWas = S.channel.isLive; S.channel.isLive = () => false; S.channel.__reWas = S.channel.reconnectNow; S.channel.reconnectNow = () => 'reconnecting'; });
      await tap(P, '[data-m3-apply]', true);
      s = await probe(P);
      await P.page.evaluate(() => { const S = window._gameState.current; S.channel.isLive = S.__liveWas; S.channel.reconnectNow = S.channel.__reWas; });
      const p2 = await pts(P);
      rec.ok('upright: no line to the server: Apply stops at once, says so, sends nothing', s.note && s.note.kind === 'offline' && !s.queue.on && s.total === 2 && p2.range === p0.range && p2.hp === p0.hp, { note: s.note, p2 });

      /* Apply: one at a time, both land */
      await tap(P, '[data-m3-apply]', true);
      const done = await until(P, () => { const p = window.__btMenus3Power; return p ? { on: p.queue.on, placed: p.queue.placed, total: p.total, note: p.note && p.note.kind } : null; }, (v) => v && !v.on && v.note === 'applied', 20000, 'applied');
      const p3 = await pts(P);
      rec.ok('upright: Apply lands both, one after another (the worker\'s numbers)', !!done && done.placed === 2 && done.total === 0 && p3.range === p0.range + 1 && p3.hp === p0.hp + 1 && p3.sword === p0.sword - 1 && p3.shared === p0.shared - 1, { done, p0, p3 });
      await shot(P, 'upright-applied');

      /* the stats line: the lane's real numbers; DPS's breakdown; Back twice */
      await tap(P, '[data-m3-lane="sword"]', true);
      await tap(P, '[data-m3-statsline]', true);
      s = await probe(P);
      const rows = await P.page.evaluate(() => Array.from(document.querySelectorAll('[data-m3-statrow]')).map((e) => e.getAttribute('data-m3-statrow')));
      rec.ok('upright: the stats line opens Sword\'s numbers (today\'s All stats), Back in the header', s.page === 'stats' && rows.includes('dps') && rows.includes('crit') && rows.length >= 6 && !!(await box(P, '[data-menus3-back]')), { page: s.page, rows });
      await tap(P, '[data-m3-statrow="dps"]', true);
      s = await probe(P);
      const tree = await P.page.evaluate(() => (window.__btStatTree ? { depth: window.__btStatTree.depth, kids: window.__btStatTree.kids.length, mism: window.__btStatTree.mismatches } : null));
      rec.ok('upright: DPS opens its breakdown (today\'s tree) in the panel', s.page === 'tree' && !!(await box(P, '[data-stat-tree]')) && (!tree || tree.mism === 0), { page: s.page, tree });
      await shot(P, 'upright-tree');
      await tap(P, '[data-menus3-back]', true);
      await tap(P, '[data-menus3-back]', true);
      s = await probe(P);
      rec.ok('upright: Back twice: the upgrades, on Sword', s.page === 'root' && s.lane === 'sword', s);

      /* leaving with a draft drops it */
      await tap(P, '[data-m3-stage="dmg"]', true);
      await tap(P, '[data-menus3-tab="bag"]', true);
      await tap(P, '[data-menus3-tab="power"]', true);
      s = await probe(P);
      const p4 = await pts(P);
      rec.ok('upright: a draft left (the Bag tab) is dropped, nothing sent', s.section === 'power' && s.total === 0 && p4.dmg === p0.dmg, { s: s.total, dmg: p4.dmg });
      rec.ok('upright: the worker\'s free Reset is there, a quiet button', !!(await box(P, '[data-m3-reset="idle"]')), null);

      /* the weapon bar: the hand's lane */
      await P.page.evaluate(() => { try { document.querySelector('[data-menus3-x]').click(); } catch (e) { /* shut */ } });
      await P.page.waitForTimeout(400);
      const barred = await tap(P, '[data-hudart-bar]', true);
      s = await probe(P);
      const hand = await H.readState(P, (S) => (S.rpg && S.rpg.activeSlot) || 'melee');
      const want = hand === 'ranged' ? 'bow' : hand === 'staff' ? 'staff' : 'sword';
      if (barred) rec.ok('upright: the weapon bar opens Power on the hand\'s lane', s.open && s.section === 'power' && s.lane === want, { s, hand });
      else rec.ok('LISTED upright: no weapon bar on the HUD (hudart off)', true, null);
    }
  } finally { await P.page.context().close().catch(() => {}); }

  /* ── 2. sideways ── */
  const Q = await H.newPlayer(browser, { name: 'Powerside', wsPort, webPort, world: 'wheel', viewport: { width: 844, height: 390 }, touch: true, query: 'menus3=1' });
  try {
    if (await inWorld(Q, rec, 'sideways')) {
      await seed(Q, wsPort, rec, 'sideways');
      await Q.page.evaluate(() => window.__btMenus3.go('hud.face'));
      await Q.page.waitForTimeout(700);
      const pb = await box(Q, '[data-menus3-panel]');
      rec.ok('sideways: Power in the drawer, 40% wide on the right', !!pb && Math.abs(pb.w - Math.round(844 * 0.4)) <= 3 && Math.abs(pb.x + pb.w - 844) <= 3, pb);
      await tap(Q, '[data-m3-stage="dmg"]', true);
      const s = await probe(Q);
      const ab = await box(Q, '[data-m3-apply]');
      const sb = await box(Q, '[data-m3-stage="dmg"]');
      rec.ok('sideways: a stage and Apply inside the drawer, 44+', s.total === 1 && !!ab && ab.h >= 44 && ab.x >= pb.x && ab.x + ab.w <= 845 && !!sb && sb.h >= 44, { ab, sb, total: s.total });
      await shot(Q, 'sideways');
    }
  } finally { await Q.page.context().close().catch(() => {}); }

  /* ── 3. a computer ── */
  const D = await H.newPlayer(browser, { name: 'Powerdesk', wsPort, webPort, world: 'wheel', viewport: { width: 1280, height: 800 }, wide: true, query: 'menus3=1' });
  try {
    if (await inWorld(D, rec, 'computer')) {
      await seed(D, wsPort, rec, 'computer');
      await D.page.evaluate(() => window.__btMenus3.go('hud.face'));
      await D.page.waitForTimeout(700);
      const pb = await box(D, '[data-menus3-panel]');
      await tap(D, '[data-m3-stage="range"]', false);
      let s = await probe(D);
      rec.ok('computer: Power in the drawer; a click stages', !!pb && pb.x > 600 && s.section === 'power' && s.total === 1, { pb, total: s.total });
      await shot(D, 'computer');
      await D.page.keyboard.press('Escape');
      await D.page.waitForTimeout(600);
      s = await probe(D);
      const p = await pts(D);
      rec.ok('computer: Esc closes it; the draft is dropped, nothing sent', !s.open && p.range === 0, { open: s.open, range: p.range });
    }
  } finally { await D.page.context().close().catch(() => {}); }
}
