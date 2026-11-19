/* ═══ v2.3.3254: THE QUIET PHONE, ON A PHONE ═══
 *
 * Every frame a real game page sends is counted off its socket (each frame is
 * one message to Cloudflare, whatever it carries) while it:
 *   1. STANDS in the Wheel's BroTown with another player beside it, 16 s: the
 *      quiet phone sends a frame now and then (the stop's one copy, one ping
 *      answer in four), where the old phone sent ~1.8 a second (a keepalive a
 *      second, its look every 2 s, every ping's answer) -- and the other
 *      player still sees it every second (the worker's roster);
 *   2. WALKS a straight line beside the other player: about 15 frames a
 *      second, and the look and the ping's answers ride on them (no frame of
 *      their own);
 *   3. WALKS turning all the time beside the other player: every batch, as
 *      before (nothing is held from a player who can see you);
 *   4. WALKS turning all the time with the other player 5,000 px away: at most
 *      15 a second (66 ms: nobody near can see you);
 *   5. a damage claim made with a move waiting goes in ONE frame with it;
 *   6. no page errors.
 * Against a worker without caps.quiet (main) it only measures and says so:
 * the numbers for docs/specs/quiet-phone.md's "before".
 *
 * The page's frames are few on this box (it draws in software), so the walks
 * are the game's own move broadcast written every 16 ms from a page timer with
 * the game's drawing slowed to a frame a second, as mp-movediet does; what is
 * under test is the socket's frames.
 *
 *   node tools/qa/mp/run.mjs quietphone
 */
import * as H from './harness.mjs';
import { QUIET } from '../../../src/game/quietPhone.js';   /* v2.3.6310: the near radius, the game's own */
export const lane = 'full';

const VIEW = { width: 900, height: 700 };
const ROOM = 'quietphone';
const SPEED = 165;

function peer(wsPort) {
  const p = { ws: null, synced: false, watch: null, n: 0 };
  p.id = 'qppeer' + Math.random().toString(36).slice(2, 10);
  p.open = () => new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${wsPort}/ws?room=${ROOM}&rf=1`);
    p.ws = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: 'join', id: p.id, name: 'Peer', protocolVersion: 2, httpAuth: true,
      data: { x: 1000, y: 1000, d: 'down', z: 'town', name: 'Peer' } }));
    ws.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return;
      if (ev.data.startsWith('{"type":"ping"')) { try { ws.send(JSON.stringify({ type: 'pong', ts: JSON.parse(ev.data).ts })); } catch {} return; }
      if (!p.synced && ev.data.startsWith('{"type":"state_sync"')) { p.synced = true; resolve(); }
      if (p.watch && ev.data.startsWith('{"type":"tick"') && ev.data.indexOf('"' + p.watch + '":') >= 0) p.n++;
    };
    ws.onerror = () => reject(new Error('peer socket error'));
  });
  const mv = (x, y, z) => p.ws.send(JSON.stringify({ type: 'move', x, y, d: 'down', f: 'south', eqc: 'none', eql: 'none', eqs: 'none', ex: null, z,
    vx: 0, vy: 0, dodging: false, blocking: false, ba: null, dead: false }));
  p.place = async (x, y) => { p.x = x; p.y = y; mv(1000, 1000, 'town'); await new Promise((r) => setTimeout(r, 300)); mv(x, y, 'wheel'); };
  p.keep = setInterval(() => { try { if (p.ws && p.ws.readyState === 1 && p.x) mv(p.x, p.y, 'wheel'); } catch {} }, 1000);
  p.close = () => { clearInterval(p.keep); try { p.ws.close(); } catch {} };
  return p;
}

/* On the page, before the game connects: every frame on the wire -- when, and
   the messages in it */
function countFrames() {
  window.__qpFrames = [];
  const send = WebSocket.prototype.send;
  WebSocket.prototype.send = function (d) {
    try {
      if (typeof d === 'string' && window.__qpFrames.length < 20000) {
        const v = JSON.parse(d);
        const types = Array.isArray(v) ? v.map((m) => (m && m.type) || '?') : [(v && v.type) || '?'];
        window.__qpFrames.push({ t: performance.now(), types });
      }
    } catch (e) { /* not ours */ }
    return send.call(this, d);
  };
}

/* v2.3.6310 (card RR; the planning session's answer, 2026-11-19): two passes.
   Since v2.3.3744 every phone is on the message diet's path (caps.pathall,
   the owner's "Just turn the message diet on now"), and on the path a move
   that TURNED goes on the very next batch (wsClient.js flushInputBuffer,
   pathTurned), near or alone: so with the defaults, a phone turning all the
   time with nobody near sends no more than it does beside a player -- that
   is step 4's promise now.  The quiet phone's own saving (at most 15 a
   second alone, ALONE_GAP_MS) still holds with the path off, and a second,
   short pass plays steps 3 and 4 under `?diet=0` to hold it there.  Step 4
   had asked the quiet phone's 15 of the defaults, and was red on every run
   (20-22 a second alone, 21-22 near). */
export async function run(ctx) {
  await pass(ctx, 'default');
  await pass(ctx, 'diet0');
}

async function pass({ browser, wsPort, webPort, rec: recAll }, mode) {
  const d0 = mode === 'diet0';
  /* the second pass's lines carry its address */
  const rec = d0 ? { ok: (n, c, d) => recAll.ok('?diet=0: ' + n, c, d), skip: (n, w) => recAll.skip('?diet=0: ' + n, w) } : recAll;
  const A = await H.newPlayer(browser, { name: d0 ? 'Quietd0' : 'Quiet', wsPort, webPort, world: 'wheel', viewport: VIEW, query: 'room=' + ROOM + (d0 ? '&diet=0' : ''), init: countFrames });
  await H.enterWorld(A);
  let inWheel = false;
  for (let i = 0; i < 120 && !inWheel; i++) {
    inWheel = (await H.readState(A, (S) => (S._zoneLoading ? null : S.currentZone))) === 'wheel';
    if (!inWheel) await A.page.waitForTimeout(500);
  }
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await A.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await A.page.waitForTimeout(500).catch(() => {});
    }
  })();
  await A.page.waitForTimeout(2000);
  const a0 = await H.readState(A, (S) => ({ x: S.player.x, y: S.player.y, id: S.myId, caps: S._serverCaps || {} }));
  const quiet = !!(a0.caps.quiet && a0.caps.bundle);
  const P = peer(wsPort);
  await P.open();
  await P.place(a0.x - 150, a0.y);
  await A.page.waitForTimeout(2500);
  const seen = await A.page.evaluate((id) => !!(window._gameState.current.others || {})[id], P.id);
  if (d0) rec.ok('the page is off the message diet\'s path (?diet=0) (guard)', (await A.page.evaluate(() => (window.__btMoveDiet ? window.__btMoveDiet().path : null))) === false);
  rec.ok(`setup: a phone in the Wheel's BroTown with another player beside it (${quiet ? 'the quiet phone: caps.quiet and caps.bundle' : 'NO caps.quiet: measuring only'})`,
    inWheel && seen && typeof a0.id === 'string', { inWheel, seen, caps: { quiet: a0.caps.quiet, bundle: a0.caps.bundle } });

  const frames = (from, to) => A.page.evaluate(({ from, to }) => window.__qpFrames.filter((f) => f.t >= from && f.t < to), { from, to });
  const nowP = () => A.page.evaluate(() => performance.now());
  const byType = (fs) => {
    const o = {};
    for (const f of fs) for (const t of f.types) o[t] = (o[t] || 0) + 1;
    return o;
  };
  const report = {};

  /* ── 1. standing still ── */
  if (!d0) {
    await A.page.waitForTimeout(1500);
    P.watch = a0.id; P.n = 0;
    const t0 = await nowP();
    await A.page.waitForTimeout(16000);
    const t1 = await nowP();
    const fs = await frames(t0, t1);
    const secs = (t1 - t0) / 1000;
    const rate = fs.length / secs;
    report.standing = { frames: fs.length, perSec: +rate.toFixed(2), byType: byType(fs), peerSaw: P.n };
    if (quiet) {
      rec.ok(`standing 16 s: ${fs.length} frames (${rate.toFixed(2)} a second; the old phone ~1.8): ${JSON.stringify(byType(fs))}`, rate <= 0.4, report.standing);
    } else {
      rec.ok(`standing 16 s (before): ${fs.length} frames, ${rate.toFixed(2)} a second: ${JSON.stringify(byType(fs))}`, true, report.standing);
    }
    rec.ok(`standing: the other player still saw it in ${P.n} ticks (the worker's roster, every second)`, P.n >= 10, { n: P.n });
  }

  /* the walk: the game's own move broadcast every 16 ms, its place by the time
     that really passed; the game's own moves held off the wire */
  const walk = (ms, turnDegPerS) => A.page.evaluate(({ ms, turnDegPerS, speed }) => new Promise((resolve) => {
    const S = window._gameState.current;
    const ch = S.channel;
    if (!ch.__qaWrapped) {
      const orig = ch.send;
      ch.send = function (m) {
        if (window.__qaOwnMoves && m && m.event === 'move' && !(m.payload && m.payload.__qa)) return undefined;
        return orig.apply(this, arguments);
      };
      ch.__qaWrapped = true;
    }
    window.__qaOwnMoves = true;
    if (!window.__qaRaf) window.__qaRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 1000);
    const t0 = performance.now();
    let x = S.player.x, y = S.player.y, last = t0, ang = Math.PI;   /* west, away from nothing */
    const timer = setInterval(() => {
      const now = performance.now();
      const dt = now - last; last = now;
      ang += turnDegPerS * Math.PI / 180 * dt / 1000;
      const ux = Math.cos(ang), uy = Math.sin(ang);
      x += ux * speed * dt / 1000; y += uy * speed * dt / 1000;
      const done = now - t0 >= ms;
      const vx = done ? 0 : Math.round(ux * speed / 60 * 100), vy = done ? 0 : Math.round(uy * speed / 60 * 100);
      ch.send({ type: 'broadcast', event: 'move', payload: { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, d: 'left', f: 'west', z: 'wheel', vx, vy, __qa: 1 } });
      if (done) {
        clearInterval(timer);
        setTimeout(() => {
          window.__qaOwnMoves = false;
          window.requestAnimationFrame = window.__qaRaf;
          resolve({ from: t0, to: now, secs: (now - t0) / 1000 });
        }, 150);
      }
    }, 16);
  }), { ms, turnDegPerS, speed: SPEED });

  /* ── 2. a straight walk beside the other player ── */
  if (!d0) {
    const w = await walk(4000, 0);
    const fs = await frames(w.from, w.to);
    const rate = fs.length / w.secs;
    const lone = fs.filter((f) => f.types.length === 1 && (f.types[0] === 'track' || f.types[0] === 'pong')).length;
    report.straight = { frames: fs.length, perSec: +rate.toFixed(2), byType: byType(fs), loneTrackOrPong: lone };
    if (quiet) {
      rec.ok(`a straight walk beside the other player: ${rate.toFixed(1)} frames a second (at most 15), the look and the ping's answers riding (${lone} alone)`,
        rate <= 16 && lone === 0, report.straight);
    } else {
      rec.ok(`a straight walk (before): ${rate.toFixed(1)} frames a second, ${lone} of them a look or a ping's answer alone: ${JSON.stringify(byType(fs))}`, true, report.straight);
    }
  }
  await A.page.waitForTimeout(1500);

  /* ── 3. turning all the time, the other player beside ── */
  let nearRate = 0;
  {
    const w = await walk(4000, 360);
    const fs = await frames(w.from, w.to);
    nearRate = fs.length / w.secs;
    report.turningNear = { frames: fs.length, perSec: +nearRate.toFixed(2), byType: byType(fs) };
    rec.ok(`turning all the time beside the other player: ${nearRate.toFixed(1)} frames a second (every batch this box's timers manage; a phone's 30)`, nearRate >= 12, report.turningNear);
  }
  await A.page.waitForTimeout(1500);

  /* ── 4. turning all the time, the other player 5,000 px away ── */
  {
    const me = await H.readState(A, (S) => ({ x: S.player.x, y: S.player.y }));
    await A.page.evaluate((id) => { window.__qpPeerId = id; }, P.id);
    await P.place(me.x + 5000, me.y);
    /* v2.3.6310 (card RR; docs/plan/census/RR-reds.md): the step is about a
       phone with NOBODY near, so it waits until this page's own copy of the
       other player stands past the game's near radius (QUIET.NEAR_R), as the
       game reads it (quietPhone.js peerNear) -- up to 30 s, the wait named.
       It waited a fixed 3 s for "a roster", and on a session box the copy
       was still beside the phone when the walk began: the game rightly sent
       at the near pace (33 ms), ~21 frames a second, and the check went red
       on every run. */
    const farFrom = Date.now();
    const parked = await H.waitFor(A, (S) => {
      const o = (S.others || {})[window.__qpPeerId], p = S.player;
      if (!o) return { gone: true };
      const ox = Number.isFinite(o.x) ? o.x : o.renderX, oy = Number.isFinite(o.y) ? o.y : o.renderY;
      return { d: Math.round(Math.hypot(ox - p.x, oy - p.y)), away: !!o._away, zone: o.zone || o.z || null };
    }, (v) => !!v && (v.gone || v.away || v.d > QUIET.NEAR_R), { timeout: 30000, label: 'the far copy past the near radius' }).catch(() => null);
    report.parkedMs = Date.now() - farFrom;
    report.parked = parked;
    rec.ok(`turning all the time with nobody near: the other player's copy is past the near radius (${QUIET.NEAR_R} px) before the walk (after ${(report.parkedMs / 1000).toFixed(1)} s) (guard)`, !!parked, { parked, ms: report.parkedMs });
    await A.page.waitForTimeout(500);
    const w = await walk(4000, 360);
    const fs = await frames(w.from, w.to);
    const rate = fs.length / w.secs;
    report.turningAlone = { frames: fs.length, perSec: +rate.toFixed(2), byType: byType(fs) };
    const onPath = await A.page.evaluate(() => (window.__btMoveDiet ? window.__btMoveDiet().path : null));
    report.turningAlone.path = onPath;
    if (quiet && onPath) {
      /* v2.3.6310: the path's promise: a turn goes on the next batch, near
         or alone, so alone never more than beside a player (15% for this
         box's timers) */
      rec.ok(`turning all the time with nobody near, on the message diet's path: ${rate.toFixed(1)} frames a second, no more than beside the other player (${nearRate.toFixed(1)})`,
        rate <= Math.max(16, nearRate * 1.15), report.turningAlone);
    } else if (quiet) {
      rec.ok(`turning all the time with nobody near: ${rate.toFixed(1)} frames a second (at most 15, every 66 ms; ${nearRate.toFixed(1)} beside the other player)`,
        rate <= 16 && rate <= nearRate * 0.8, report.turningAlone);
    } else {
      rec.ok(`turning with nobody near (before): ${rate.toFixed(1)} frames a second`, true, report.turningAlone);
    }
    await P.place(me.x - 150, me.y);
    await A.page.waitForTimeout(2500);
  }

  /* ── 5. a damage claim with a move waiting ── */
  if (!d0) {
    const r = await A.page.evaluate(() => new Promise((resolve) => {
      const S = window._gameState.current;
      const ch = S.channel;
      setTimeout(() => {
        const t0 = performance.now();
        ch.send({ type: 'broadcast', event: 'move', payload: { x: S.player.x + 1, y: S.player.y, d: 'left', f: 'west', z: 'wheel', vx: 0, vy: 0, __qa: 1 } });
        ch.send({ type: 'monster_damage', monsterId: 'qa-none', damage: 1, zone: 'wheel' });
        setTimeout(() => resolve(window.__qpFrames.filter((f) => f.t >= t0).slice(0, 3)), 300);
      }, 200);
    }));
    const first = r[0] || { types: [] };
    report.claim = r;
    if (quiet) {
      rec.ok(`a damage claim with a move waiting: one frame, ${JSON.stringify(first.types)}`, first.types.length >= 2 && first.types.indexOf('move') >= 0 && first.types.indexOf('monster_damage') > first.types.indexOf('move'), r);
    } else {
      rec.ok(`a damage claim with a move waiting (before): ${r.length} frames, ${JSON.stringify(r.map((f) => f.types))}`, true, r);
    }
  }

  const q = await A.page.evaluate(() => (window.__btQuiet ? window.__btQuiet() : null));
  report.quietStats = q;
  console.log('[quietphone] ' + JSON.stringify(report));
  P.close();
  stopAlive = true;
  const errs = A.logs.filter((l) => /pageerror/.test(l));
  rec.ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
  await A.ctx.close().catch(() => {});
}
