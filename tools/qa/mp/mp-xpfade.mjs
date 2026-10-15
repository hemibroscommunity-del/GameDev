/* ═══ XP FADES 5+ LEVELS BELOW YOU, ON A PHONE (v2.3.3251) ═══
 *
 * The owner, 2026-10-14: "Yes adjust the xp.  Also make xp decay if you're
 * trying to harvest lower level things.  This also applies to combat.  Xp
 * should begin decaying starting at 5 levels below your current level.  It
 * should always be most efficient to harvest or fight things within your
 * current level."
 *
 * The worker's rule (server/src/xpdecay.js) and its tier XP are held by the
 * gather-hits suite's section 13 and xp-decay.test.mjs, and the game's copies
 * to the worker's by mirror-audit.  What only a browser shows:
 *   1. the worker advertises caps.tierxp and caps.xpdecay;
 *   2. Skills -> Mining says which resources pay full XP: at Mining 5 "Full
 *      XP  Copper Ore, Iron Ore, Black Steel Ore" and no Less XP line; at
 *      Mining 11 "Full XP  Titanium Ore" and "Less XP  Black Steel Ore 28% ·
 *      Iron Ore 15% …" -- whole, inside the screen;
 *   3. a copper vein mined at Mining 1, gesture and all: the "+N Mining XP"
 *      the game pops is the worker's own credit (harvest_credit), 163 x the
 *      gesture's grade;
 *   4. a copper vein mined at Mining 11, ten levels past it: the popped number
 *      is again the worker's credit, and it is ~15% of the full one;
 *   5. no page errors.
 * Pictures: tools/qa/mp/out/xpfade-skills-lv<L>.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const STAND_ORE = [0, -70];   /* where a miner stands to a vein (mp-wheelnodes STAND) */
const FADE10 = (1 / 3) * Math.pow(0.85, 5);   /* ten levels past: a third, then five steps of 15% less */

/* Before the game connects: keep every harvest_credit the worker sends, as
   the wire carries it (mp-farpeer's WebSocket wrapper). */
function tapCredits() {
  const Native = window.WebSocket;
  window.__qaCredits = [];
  function Tapped(url, protocols) {
    const ws = protocols === undefined ? new Native(url) : new Native(url, protocols);
    ws.addEventListener('message', (ev) => {
      const d = ev.data;
      if (typeof d !== 'string' || d.indexOf('"harvest_credit"') < 0) return;
      try { const m = JSON.parse(d); if (m && m.type === 'harvest_credit') window.__qaCredits.push(m.payload); } catch (e) { /* not ours */ }
    });
    return ws;
  }
  Tapped.prototype = Native.prototype;
  for (const k of ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']) Tapped[k] = Native[k];
  window.WebSocket = Tapped;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Fadebro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', init: tapCredits });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 30 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading, n: (S.gatherNodes || []).length }),
      (v) => v.zone === 'wheel' && !v.loading && v.n > 0, { timeout: 120000, label: 'into the Wheel, its nodes in' }).catch(() => null);
    rec.ok('in the Wheel, with its resources (guard)', !!inW, inW);
    if (!inW) return;

    /* ── 1. the caps ── */
    const caps = await H.readState(P, (S) => ({ tierxp: S._serverCaps && S._serverCaps.tierxp, xpdecay: S._serverCaps && S._serverCaps.xpdecay }));
    rec.ok('the worker advertises caps.tierxp and caps.xpdecay', caps.tierxp === true && caps.xpdecay === true, caps);
    const myId = await H.readState(P, (S) => S.myId);
    await H.grant(wsPort, myId, 'item', { invKey: 'mining_pickaxe', count: 1 }).catch(() => {});
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 });
    await closeTalk(P);

    /* ── 2. the Skills page ── */
    const pages = [
      { L: 5, full: 'Copper Ore, Iron Ore, Black Steel Ore', less: null },
      { L: 11, full: 'Titanium Ore', less: 'Black Steel Ore 28% · Iron Ore 15% …' },
    ];
    for (const c of pages) {
      const lv = await setMining(wsPort, myId, c.L);
      const got = await waitMining(P, c.L);
      rec.ok('the lever sets Mining ' + c.L + ' and the game hears it (guard)', !!lv && lv.ok === true && got === c.L, { lv, got });
      await openSkill(P, 'mining');
      const r = await readFade(P);
      rec.ok('Mining ' + c.L + ': "Full XP  ' + c.full + '"', r.at === String(c.L) && (r.rows[0] || {}).label === 'Full XP' && (r.rows[0] || {}).value === c.full, r);
      rec.ok('Mining ' + c.L + ': ' + (c.less ? '"Less XP  ' + c.less + '"' : 'no Less XP line (nothing 5+ below)'),
        c.less ? ((r.rows[1] || {}).label === 'Less XP' && (r.rows[1] || {}).value === c.less) : r.rows.length === 1, r);
      rec.ok('Mining ' + c.L + ': the lines are whole (no cut-off) and inside the screen',
        r.rows.length > 0 && r.rows.every((x) => !x.cut && x.left >= 0 && x.right <= x.vw), r.rows);
      await P.page.screenshot({ path: join(OUT, `xpfade-skills-lv${c.L}.png`) }).catch(() => {});
    }
    await P.page.evaluate(() => { try { window.__broDashPanelBus.clear(); } catch (e) { /* none open */ } });

    /* ── 3-4. two copper veins: at Mining 1 (full) and at Mining 11 (ten past) ── */
    const full = await harvestCopper(P, rec, wsPort, myId, 1);
    if (full) {
      rec.ok('Mining 1, copper: the "+N Mining XP" popped is the worker\'s own credit',
        full.pop !== null && full.credit !== null && full.pop === full.credit, full);
      rec.ok('Mining 1, copper: ...163 x the gesture\'s grade (full XP, nothing faded)', [163, 245, 326].includes(full.credit), full);
    }
    const faded = await harvestCopper(P, rec, wsPort, myId, 11);
    if (faded) {
      const want = [163, 245, 326].map((x) => Math.max(1, Math.round(x * FADE10)));
      rec.ok('Mining 11, copper (10 past it): the popped number is the worker\'s own credit',
        faded.pop !== null && faded.credit !== null && faded.pop === faded.credit, faded);
      rec.ok('Mining 11, copper: ...faded to ~15% (' + want.join(' / ') + ' by grade)', want.includes(faded.credit), { faded, want });
    }
    rec.ok('no page errors', errors.length === 0, errors);
  } finally {
    stopAlive = true;
    await P.ctx.close().catch(() => {});
  }
}

const setMining = (wsPort, id, level) => H.devOp(wsPort, 'lifeskill', id, { skill: 'mining', level }).catch((e) => ({ ok: false, e: String(e) }));
const waitMining = (P, level) => H.waitFor(P, (S) => {
  const ls = (S.rpg && S.rpg.lifeSkills) || {};
  return (ls.mining && ls.mining.level) || 0;
}, (v) => v === level, { timeout: 15000, label: 'Mining ' + level }).catch(() => null);

const pointerUp = (P, sel) => P.page.evaluate((s) => {
  const b = document.querySelector(s);
  if (!b) return false;
  b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  return true;
}, sel);

/* Skills, open on one skill's own page (mp-hitladder's). */
async function openSkill(P, key) {
  await P.page.evaluate(() => window.__broDashPanelBus.open('skills'));
  await P.page.waitForTimeout(500);
  for (let i = 0; i < 4; i++) {
    if (await pointerUp(P, `[data-skill="${key}"]`)) break;
    await P.page.evaluate(() => {
      const back = [...document.querySelectorAll('button')].find((b) => /All skills/.test(b.textContent || ''));
      if (back) back.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });
    await P.page.waitForTimeout(400);
  }
  await P.page.waitForTimeout(700);   /* the panel re-reads the game's state every 600 ms */
}

/* The XP fade's rows on the open skill page, and their fit. */
const readFade = (P) => P.page.evaluate(() => {
  const vw = window.innerWidth;
  const box = document.querySelector('[data-xp-fade]');
  const rows = box ? [...box.children].map((el) => {
    const spans = el.querySelectorAll(':scope > span');
    if (spans.length !== 2) return null;
    const v = spans[1], r = el.getBoundingClientRect();
    return { label: spans[0].textContent, value: v.textContent, cut: v.scrollWidth > v.clientWidth + 1,
      left: Math.round(r.left), right: Math.round(r.right), vw };
  }).filter(Boolean) : [];
  return { at: box ? box.getAttribute('data-xp-fade') : null, rows };
});

/* Mine the nearest live copper vein at Mining `level`, gesture and all, and
   say what the game popped and what the worker credited. */
async function harvestCopper(P, rec, wsPort, myId, level) {
  const tag = 'Mining ' + level + ', copper: ';
  const lv = await setMining(wsPort, myId, level);
  const got = await waitMining(P, level);
  rec.ok(tag + 'the lever sets the level (guard)', !!lv && lv.ok === true && got === level, { lv, got });
  const tool = await H.waitFor(P, (S) => (((S.rpg || {}).inventory || {}).mining_pickaxe || 0) > 0, (v) => v === true,
    { timeout: 15000, label: 'the pickaxe' }).catch(() => false);
  rec.ok(tag + 'the pickaxe is in the bag (guard)', tool === true, tool);
  await closeTalk(P);
  const vein = await P.page.evaluate(() => {
    const S = window._gameState.current, p = S.player;
    let best = null, d = Infinity;
    for (const n of S.gatherNodes || []) {
      if (n.nodeType !== 'oreVein' || !n.alive || (n.gatherLvl || 1) !== 1) continue;
      const dd = Math.hypot(n.x - p.x, n.y - p.y);
      if (dd < d) { d = dd; best = { id: n.id, x: n.x, y: n.y, d: Math.round(dd) }; }
    }
    return best;
  });
  rec.ok(tag + 'a live copper vein near town (guard)', !!vein, vein);
  if (!vein) return null;
  const there = await H.hopTo(P, vein.x + STAND_ORE[0], vein.y + STAND_ORE[1], { step: 90, gap: 260, tries: 80 });
  rec.ok(tag + 'walked to the vein (guard)', there === true, { vein });
  await P.page.waitForTimeout(600);
  await closeTalk(P);
  /* every "+N Mining XP" the game pops from here on */
  await P.page.evaluate(() => {
    const seen = window.__qaXpPops = [];
    const S = window._gameState.current;
    const mark = new WeakSet();
    window.__qaCredits.length = 0;
    window.__qaXpPopTimer = setInterval(() => {
      for (const p of S.dmgNumbers || []) {
        if (mark.has(p)) continue;
        mark.add(p);
        const m = /^\+(\d+) Mining XP$/.exec(String(p.text || ''));
        if (m) seen.push(Number(m[1]));
      }
    }, 30);
  });
  const started = await tapNode(P, vein.id, (S) => !!S._extraction && S._extraction.skill === 'mining');
  rec.ok(tag + 'tapping the vein starts a Mining harvest (guard)', started === true);
  if (!started) return null;
  const opened = await H.waitFor(P, (S) => (S._extraction ? S._extraction.status : null), (v) => v === 'ready',
    { timeout: 25000, label: 'the window opens' }).catch(() => null);
  rec.ok(tag + 'the hits land and the gesture window opens (guard)', opened === 'ready', { opened });
  if (opened !== 'ready') return null;
  const cue = await P.page.evaluate(() => (window.__btHarvest ? window.__btHarvest().cue : null));
  /* mp-gatherhits' stroke: moves 16 ms apart in one run on the page's thread
     (a phone's cadence; this box draws a frame in ~200-400 ms) */
  const g = await P.page.evaluate(([cx, cy]) => {
    const S = window._gameState.current;
    const ev = (t, x, y) => window.dispatchEvent(new PointerEvent(t, { pointerId: 9, clientX: x, clientY: y,
      pointerType: 'touch', bubbles: true, cancelable: true, isPrimary: true }));
    ev('pointerdown', cx, cy);
    const t0 = performance.now();
    let step = 0, lastProg = 0, next = t0;
    while (performance.now() - t0 < 12000) {
      while (performance.now() < next) { /* the phone's 16 ms */ }
      next += 16;
      const k = step % 12, v = k < 6 ? -26 + 52 * k / 6 : 26 - 52 * (k - 6) / 6;
      ev('pointermove', cx + Math.sin(step) * 3, cy + v);
      step++;
      const ex = S._extraction;
      if (ex) lastProg = ex.progress || 0;
      if (!ex || ex.status !== 'ready') break;
    }
    ev('pointerup', cx, cy);
    return { done: !S._extraction && lastProg >= 0.85, lastProg: +lastProg.toFixed(2) };
  }, [cue ? cue.x : 300, cue ? cue.y : 700]);
  rec.ok(tag + 'the gesture completes the harvest (guard)', g.done === true, g);
  if (!g.done) return null;
  const credit = await H.waitFor(P, () => (window.__qaCredits || []).slice(), (v) => v.length > 0,
    { timeout: 10000, label: 'harvest_credit' }).catch(() => []);
  await P.page.waitForTimeout(400);
  const pops = await P.page.evaluate(() => { clearInterval(window.__qaXpPopTimer); return window.__qaXpPops || []; });
  const c = credit[0] || null;
  rec.ok(tag + 'one "+N Mining XP" popped and one credit came (guard)', pops.length === 1 && !!c && c.skillName === 'mining', { pops, c });
  return { pop: pops.length === 1 ? pops[0] : null, credit: c ? c.xpAmt : null };
}

/* mp-wheelnodes' tap on a node, through the canvas as a finger would. */
async function tapNode(P, id, done, tries = 6) {
  for (let i = 0; i < tries; i++) {
    await P.page.evaluate((nid) => {
      const S = window._gameState.current;
      const n = (S.gatherNodes || []).find((g) => g.id === nid);
      if (!n) return;
      const cv = document.querySelector('canvas');
      const rc = cv.getBoundingClientRect();
      const x = rc.left + (n.x - S.camera.x) * (S._worldScaleX || 1);
      const y = rc.top + (n.y - 24 - S.camera.y) * (S._worldScaleY || 1);
      const mk = (t) => new TouchEvent(t, { bubbles: true, cancelable: true,
        touches: t === 'touchend' ? [] : [new Touch({ identifier: 77, target: cv, clientX: x, clientY: y })],
        changedTouches: [new Touch({ identifier: 77, target: cv, clientX: x, clientY: y })] });
      cv.dispatchEvent(mk('touchstart'));
      cv.dispatchEvent(mk('touchend'));
    }, id);
    await P.page.waitForTimeout(300);
    if (await H.readState(P, done)) return true;
  }
  return false;
}

/* mp-wheelnodes' way past the Mayor's welcome. */
async function closeTalk(P) {
  for (let i = 0; i < 10; i++) {
    await P.page.waitForTimeout(400);
    const scrim = P.page.locator('.bt-npcdlg-scrim').first();
    if (await scrim.isVisible().catch(() => false)) {
      await scrim.click({ position: { x: 20, y: 300 } }).catch(() => {});
      continue;
    }
    let hit = false;
    for (const t of ['Next', 'Close', 'Got it']) {
      const btn = P.page.locator('button:visible', { hasText: t }).first();
      if (await btn.isVisible().catch(() => false)) { await btn.click().catch(() => {}); hit = true; break; }
    }
    if (!hit) return;
  }
}
