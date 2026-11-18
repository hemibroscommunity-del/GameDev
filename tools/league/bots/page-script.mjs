#!/usr/bin/env node
/* ═══ v2.3.6122: THE LEAGUE'S RUNG 3 -- THE REAL PAGE, DRIVEN BY A SCRIPT (GRAND-PLAN 10.7; card LG PR 3) ═══
 *
 *   npm run build && node tools/league/bots/page-script.mjs [--harvests N] [--only bot|human]
 *
 * Boots the worker (`wrangler dev --local`) and the built page through the
 * phone harness (tools/qa/mp/harness.mjs, read only: H.*), and plays the
 * Wheel (`world: 'wheel'`, `wide: true`: a computer) twice, in two
 * characters, one after the other, recording every frame each page sends
 * and when:
 *
 *   BOT    (rung 3)  the page's own controls driven at machine pace: a dead
 *          straight glide at the walk's speed onto the line through each
 *          vein's centre, E pressed the instant it stands, the same mouse
 *          gesture the instant the window opens, every time;
 *   HUMAN  (the honest trace)  the same controls at a person's pace: the
 *          arrow keys held in short presses toward the vein (the keyboard's
 *          8 headings, never judged), a look round before E, a pause before
 *          the gesture, a gesture of its own size and speed each time.
 *
 * Writes tools/league/traces/page-bot.json and honest-harvest.json (what the
 * page sent: the moves, starts and strikes, each with its time; and for each
 * strike, `after`, the person's time past the window), and prints what the
 * LIVE worker flagged (`/dev/botflags`).  replay.mjs plays the traces back at
 * 60, 30, 20 and 4 frames a second and through a deploy; score.mjs scores
 * rung 3 by its trace.  One browser at a time (CLAUDE.md §3); reaped after.
 *
 * A tool, never a phone test: it asserts nothing (run.mjs never runs it). */
import { writeFileSync } from 'node:fs';
import * as H from '../../qa/mp/harness.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const HARVESTS = Number(arg('--harvests', 6));
const ONLY = arg('--only', null);   /* bot | human: one of the two */
const DESK = { width: 1280, height: 800 };
/* the messages a detector reads (docs/specs/honest-trouble.md): the rest
   (pings, the track, looks) are the page's own and never judged */
const KEEP = new Set(['move', 'extraction_start', 'node_strike', 'cook_request', 'monster_damage', 'ability_use', 'player_projectile', 'firemaking_request']);
const OUT = new URL('../traces/', import.meta.url);

/* ══════════ THE RECORDER: what the page sends, and the plans it is sent ══════════ */
function record(P) {
  const sent = [], got = [];
  const t0 = Date.now();
  P.page.on('websocket', (ws) => {
    ws.on('framesent', (f) => { if (typeof f.payload === 'string') sent.push({ t: Date.now() - t0, p: f.payload }); });
    ws.on('framereceived', (f) => { if (typeof f.payload === 'string' && f.payload.includes('gather_hits')) got.push({ t: Date.now() - t0, p: f.payload }); });
  });
  return { sent, got, t0 };
}
const flat = (p) => { try { const v = JSON.parse(p); return Array.isArray(v) ? v : [v]; } catch { return []; } };

/* frames into a trace: the kept messages in order, times from the first;
   each strike's `after` = its time less the start's and the plan's
   (gathering.js HONEST_CYCLE: 90 ms lead, a 650 ms swing a hit after the
   first, 220 ms settle) */
function toTrace(name, what, R, start) {
  const evs = [];
  for (const f of R.sent) for (const m of flat(f.p)) if (m && KEEP.has(m.type)) evs.push({ t: f.t, m });
  const plans = R.got.flatMap((f) => flat(f.p).filter((m) => m && m.type === 'gather_hits').map((m) => ({ t: f.t, hits: (m.payload && m.payload.hits) || [] })));
  let st = null;
  for (const e of evs) {
    if (e.m.type === 'extraction_start') st = e.t;
    if (e.m.type === 'node_strike' && st != null) {
      const plan = plans.filter((p) => p.t >= st && p.t <= e.t).pop();
      const n = plan ? plan.hits.length : 1;
      e.after = Math.max(0, e.t - (st + 90 + Math.max(0, n - 1) * 650 + 220));
      st = null;
    }
  }
  const first = evs.length ? evs[0].t : 0;
  for (const e of evs) e.t -= first;
  return { v: 1, name, what, kind: 'harvest', recorded: new Date().toISOString().slice(0, 10), by: 'tools/league/bots/page-script.mjs', start, events: evs };
}

/* ══════════ THE PAGE'S CONTROLS ══════════ */
const ST = (P, fn, a) => P.page.evaluate(fn, a);
const me = (P) => ST(P, () => { const p = window._gameState.current.player; return { x: p.x, y: p.y }; });
const veins = (P, skip) => ST(P, (sk) => (window._gameState.current.gatherNodes || []).filter((n) => n.nodeType === 'oreVein' && n.alive && (n.gatherLvl || 1) === 1 && !sk.includes(n.id)).map((n) => ({ id: n.id, x: n.x, y: n.y })), skip);
const extraction = (P) => ST(P, () => { const ex = window._gameState.current._extraction; return ex ? ex.status : null; });
async function waitStatus(P, want, ms = 30000) {
  const t = Date.now();
  while (Date.now() - t < ms) { const s = await extraction(P); if (want(s)) return s; await P.page.waitForTimeout(60); }
  return 'timeout';
}
/* the person's walk: arrow keys held in short presses toward (tx, ty) */
async function keysTo(P, tx, ty, rnd) {
  for (let i = 0; i < 400; i++) {
    const p = await me(P);
    const dx = tx - p.x, dy = ty - p.y;
    if (Math.hypot(dx, dy) < 14) return true;
    const keys = [];
    if (dx > 8) keys.push('ArrowRight'); else if (dx < -8) keys.push('ArrowLeft');
    if (dy > 8) keys.push('ArrowDown'); else if (dy < -8) keys.push('ArrowUp');
    for (const k of keys) await P.page.keyboard.down(k);
    await P.page.waitForTimeout(Math.round(140 + rnd() * 320));
    for (const k of keys) await P.page.keyboard.up(k);
    if (rnd() < 0.25) await P.page.waitForTimeout(Math.round(120 + rnd() * 500));
  }
  return false;
}
/* a gesture on the world (the mouse's, up and down: mining), in the page */
const gesture = (P, { x, y, amp, period, stepMs, ms }) => ST(P, async (o) => {
  const S = window._gameState.current;
  const tgt = document.querySelector('canvas.brotown-canvas');
  const fire = (t, px, py) => tgt.dispatchEvent(new PointerEvent(t, { pointerId: 1, clientX: px, clientY: py, pointerType: 'mouse', bubbles: true, cancelable: true, isPrimary: true, buttons: t === 'pointerup' ? 0 : 1 }));
  const t0 = performance.now();
  let step = 0, next = t0;
  while (performance.now() - t0 < o.ms) {
    while (performance.now() < next) { /* the step */ }
    next += o.stepMs;
    const k = step % o.period, v = k < o.period / 2 ? -o.amp + (2 * o.amp * k) / (o.period / 2) : o.amp - (2 * o.amp * (k - o.period / 2)) / (o.period / 2);
    fire('pointermove', o.x + Math.sin(step) * 3, o.y + v);
    step++;
    const ex = S._extraction;
    if (!ex || ex.status !== 'ready') break;
  }
  return step;
}, { x, y, amp, period, stepMs, ms });
const worldPoint = (P, dx, dy) => ST(P, ([a, b]) => {
  const S = window._gameState.current;
  const cv = document.querySelector('canvas.brotown-canvas').getBoundingClientRect();
  return { x: Math.round(cv.left + (S.player.x - S.camera.x) * S._worldScaleX + a), y: Math.round(cv.top + (S.player.y - S.camera.y) * S._worldScaleY + b) };
}, [dx, dy]);

async function harvestOnce(P, mode, used, rnd) {
  const p = await me(P);
  const v = (await veins(P, used)).filter((n) => Math.hypot(n.x - p.x, n.y - p.y) > 80).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
  if (!v) return false;
  used.push(v.id);
  if (mode === 'bot') {
    /* onto the line through the vein's centre, 40 px short, at the walk's own speed */
    const d = Math.hypot(v.x - p.x, v.y - p.y);
    await H.glideTo(P, v.x - ((v.x - p.x) / d) * 40, v.y - ((v.y - p.y) / d) * 40, { speed: 150 });
  } else {
    await keysTo(P, v.x, v.y - 60, rnd);
    await P.page.waitForTimeout(Math.round(300 + rnd() * 900));
  }
  await P.page.keyboard.press('e');
  if ((await waitStatus(P, (s) => s === 'ready' || s == null)) !== 'ready') return true;
  if (mode === 'human') await P.page.waitForTimeout(Math.round(150 + rnd() * 600));
  const at = await worldPoint(P, mode === 'bot' ? -70 : -50 - rnd() * 60, mode === 'bot' ? -30 : -10 - rnd() * 40);
  await P.page.mouse.move(at.x, at.y);
  await P.page.mouse.down();
  const g = mode === 'bot' ? { amp: 30, period: 12, stepMs: 16 } : { amp: 20 + rnd() * 25, period: 8 + Math.floor(rnd() * 10), stepMs: 14 + Math.floor(rnd() * 8) };
  await gesture(P, { x: at.x, y: at.y, ...g, ms: 9000 });
  await P.page.mouse.up();
  await waitStatus(P, (s) => s == null, 15000);
  await P.page.waitForTimeout(mode === 'bot' ? 100 : Math.round(400 + rnd() * 1200));
  return true;
}

async function play(browser, ports, mode, name) {
  const P = await H.newPlayer(browser, { name, wsPort: ports.ws, webPort: ports.web, viewport: DESK, world: 'wheel', wide: true });
  const R = record(P);
  const stop = H.keepAlive(P, 15000);
  try {
    await H.enterWorld(P);
    const myId = await H.readState(P, (S) => S.myId);
    await H.waitFor(P, (S) => ({ z: S.currentZone, n: (S.gatherNodes || []).length, l: !!S._zoneLoading }), (s) => s.z === 'wheel' && s.n > 0 && !s.l, { timeout: 150000, label: 'the Wheel' });
    await H.grant(ports.ws, myId, 'item', { invKey: 'mining_pickaxe', count: 1 });
    await H.devOp(ports.ws, 'vitals', myId, { heal: true, god: true, godMinutes: 30 });
    await H.waitFor(P, (S) => ((S.rpg || {}).inventory || {}).mining_pickaxe || 0, (n) => n > 0, { timeout: 20000, label: 'the pickaxe' });
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    const start = await me(P);
    let s = 1234567;
    const rnd = () => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return s / 4294967296; };
    const used = [];
    let done = 0;
    for (let i = 0; i < HARVESTS * 2 && done < HARVESTS; i++) if (await harvestOnce(P, mode, used, rnd)) done++;
    const flags = await (await fetch(`http://127.0.0.1:${ports.ws}/api/admin/dev/botflags`, { headers: { Authorization: 'Bearer ' + H.ADMIN_KEY } })).json().catch(() => null);
    const mine = flags && Array.isArray(flags.flagged) ? flags.flagged.filter((f) => f.playerId === myId || f.id === myId) : [];
    return { R, start: { x: Math.round(start.x), y: Math.round(start.y), z: 'wheel' }, done, liveFlags: mine };
  } finally { stop && stop(); await P.page.context().close().catch(() => {}); }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const web = await H.freePort();
  const srv = await H.serveDist(web);
  const ws = await H.freePort();
  const worker = await H.startWorker(ws);
  const browser = await H.launch();
  H.setScenario('league-page', { lane: 'full' });
  let code = 0;
  try {
    for (const [mode, file, name, what] of [
      ['bot', 'page-bot.json', 'Leaguebot', 'rung 3: the real page driven at machine pace (straight glides through each vein\'s centre, one gesture)'],
      ['human', 'honest-harvest.json', 'Leaguehand', 'a scripted-but-human-paced play: arrow keys in short presses, pauses, a gesture of its own each time'],
    ]) {
      if (ONLY && ONLY !== mode) continue;
      const r = await play(browser, { ws, web }, mode, name);
      const tr = toTrace(file.replace('.json', ''), what, r.R, r.start);
      writeFileSync(new URL(file, OUT), JSON.stringify(tr) + '\n');
      console.log(`${mode}: ${r.done} harvests, ${tr.events.length} messages kept -> traces/${file}; the live worker flagged: ${r.liveFlags.length ? JSON.stringify(r.liveFlags.map((f) => f.lastFlag || f.kind || f)) : 'nothing'}`);
    }
  } catch (e) { console.error(e); code = 1; }
  finally {
    H.setScenario(null);
    await browser.close().catch(() => {});
    srv.close();
    await H.stopWorker(worker);
  }
  process.exit(code);
}
