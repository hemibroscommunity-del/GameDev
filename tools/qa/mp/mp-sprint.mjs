/* ═══ THE SPRINT (v2.3.3006) ═══
 *
 * Owner, 2026-10-03: "Also adding a sprint button by the left joystick that
 * drains down stamina but makes you run about 33% faster until it drains out.
 * Maybe just to the right of the left joystick".
 *
 * A real player against a real worker, in the Wheel as players get it, on a
 * phone-sized TOUCH page:
 *   1. the button is just north of the ATTACK disc, centred over it (v2.3.3106,
 *      the owner: "near the right joystick instead of the left maybe just
 *      north of it"; it was right of the movement stick), 44 px or more, in
 *      the attack half, on no other control, its boot inside its rim --
 *      upright and sideways;
 *   2. a TAP turns it on and off, and the tap is only that: no roll, no walk,
 *      no swing, aim or jump (the attack half of the screen is under it);
 *   3. sprinting he runs SPRINT_MULT (1.33) times his walk, over the same
 *      ground, and his legs keep up (the jog loop 1.33 times quicker);
 *   4. the WORKER bills it: every sprinting move it gets is a paid step,
 *      billed DRAIN_PER_S for the time between them; the client's bar shows
 *      the worker's, and every sprinting move is accepted (its copy of him is
 *      where he is -- a refused move would leave it behind);
 *   4b. THE PHONE'S WAY: a thumb holding the stick (two real touches, CDP),
 *      a second finger's tap turns it on, and he runs 1.33 times the stick's
 *      walk -- no roll;
 *   5. standing still ends it;
 *   6. run dry, it ends on its own, the button fades, and a tap then is
 *      refused with "Not enough energy!" and a shake;
 *   7. Shift held is the keyboard's sprint, let go it stops;
 *   8. an attack ends it;
 *   9. no page errors.
 * Speeds are the game's own per-frame ones (S.player.vx): the test machine
 * draws a few frames a second and the game's clock runs slow below 20
 * (BroTown's _dtScale cap), so speeds off the wall clock would mislead.
 * Pictures: tools/qa/mp/out/sprint-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const SIDEWAYS = { width: 844, height: 390 };
const HS = 10;            /* the walk box's half-width (hs in BroTown.jsx) */
const MULT = 1.33;        /* SPRINT_MULT (game/sprint.js) */
const DRAIN = 11;         /* SPRINT_DRAIN_PER_S */

/* the button, the movement disc, and every other control that could share
   the corner: small fixed boxes over the world, drawn */
const LAYOUT = (P) => P.page.evaluate(() => {
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
  const btn = document.querySelector('[data-sprint]');
  const stick = document.querySelector('.bt-joystick-zone');
  /* v2.3.3106: the button is over the ATTACK disc now */
  const disc = document.querySelector('.bt-rjoy-base');
  /* v2.3.3018: the owner's mockup draws Sprint as the boot alone -- the word
     went -- so what has to sit inside the ring is the PICTURE */
  const lab = btn && btn.querySelector('[data-icon="boot"]');
  const ringEl = btn && btn.querySelector('.bt-skin-ringc');
  const others = [];
  if (btn) {
    for (const el of document.querySelectorAll('body *')) {
      if (el === btn || btn.contains(el) || el.contains(btn)) continue;
      if (el.closest('[data-joyzone]') || el.closest('.bt-joystick-zone')) continue;
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05 || cs.pointerEvents === 'none') continue;
      const b = el.getBoundingClientRect();
      if (b.width < 20 || b.height < 20 || b.width > 160 || b.height > 160) continue;
      others.push({ tag: el.tagName, cls: String(el.className || '').slice(0, 40), aria: el.getAttribute('aria-label'), ...r(el) });
    }
  }
  return { vw: innerWidth, vh: innerHeight, btn: r(btn), label: r(lab), ring: ringEl ? +ringEl.getAttribute('stroke-width') : null,
    state: btn ? btn.getAttribute('data-sprint') : null, disc: r(disc), stick: r(stick), others };
});
const overlaps = (a, b, pad) => a.l < b.r + pad && a.r > b.l - pad && a.t < b.b + pad && a.b > b.t - pad;

function checkLayout(rec, L, label) {
  const b = L.btn, d = L.disc;
  if (!b || !d) { rec.ok(`${label}: the sprint button is drawn`, false, L); return; }
  const gap = d.t - b.b;
  const dx = (b.l + b.r) / 2 - (d.l + d.r) / 2;
  const hit = L.others.filter((o) => overlaps(b, o, 2));
  console.log(`    ${label}: ${JSON.stringify({ btn: b, disc: d, gap: +gap.toFixed(1), dx: +dx.toFixed(1), vw: L.vw, others: L.others.length, hit })}`);
  /* sideways it steps left, clear of the Wheel's minimap (sprintAnchor's
     SPRINT_MAP_CLEAR): still over the disc's top, up and to its left */
  const side = L.vw > L.vh;
  rec.ok(side
    ? `${label}: just north of the attack disc (${gap.toFixed(0)} px clear of its top), up and to its left, clear of the minimap (${dx.toFixed(1)} px left of centre, right edge ${b.r.toFixed(0)} over the disc's ${d.l.toFixed(0)}-${d.r.toFixed(0)})`
    : `${label}: just north of the attack disc (${gap.toFixed(0)} px clear of its top), centred over it (${dx.toFixed(1)} px off)`,
    gap >= 8 && gap <= 14 && (side ? dx <= 0 && b.r > d.l : Math.abs(dx) <= 2), { gap, dx });
  rec.ok(`${label}: a thumb's size (${b.w}x${b.h}, Apple's 44 at least)`, b.w >= 44 && b.h >= 44, b);
  rec.ok(`${label}: in the attack half of the screen (left edge ${b.l.toFixed(0)} of ${L.vw / 2})`, b.l >= L.vw / 2, { l: b.l, half: L.vw / 2 });
  rec.ok(`${label}: on no other control (${L.others.length} checked)`, hit.length === 0, hit);
  /* the word inside the rim (3 px) at every corner of its box: the first cut
     lost the S and the T to the circle's edge.
     v2.3.3018: the word went for the boot (the owner's mockup), so the
     picture is what must sit inside the ring: centred on the button, and no
     wider than the face inside the ring (a picture's transparent corners are
     not the picture, so its box's CORNERS are not the test the word's were). */
  const lb = L.label;
  if (lb) {
    const cx = (b.l + b.r) / 2, cy = (b.t + b.b) / 2;
    const ring = L.ring || 4;
    const face = b.w - 2 * ring;
    const off = Math.hypot((lb.l + lb.r) / 2 - cx, (lb.t + lb.b) / 2 - cy);
    rec.ok(`${label}: the boot sits in the middle, inside the ring (${lb.w.toFixed(0)} px wide in a ${face.toFixed(0)} px face, ${off.toFixed(1)} px off centre)`,
      lb.w <= face + 0.5 && lb.h <= face + 0.5 && off <= 1, { pic: lb, face, off });
  } else rec.ok(`${label}: the boot is drawn`, false, null);
}

/* A straight lane east, `len` px of open land under the boots, nothing
   standing in it, 3 cells deep -- nearest first.  In boots' coordinates (the
   walk grid's); the player stands feetDy above them. */
const FIND_LANE = (P, len) => P.page.evaluate(({ len, hs }) => {
  const S = window._gameState.current;
  const g = S._tiledWalkable && S._tiledWalkable[S.currentZone];
  const Z = window.__btZones && window.__btZones[S.currentZone];
  const at = window.__btSwimAt;
  if (!g || !g.length || !Z) return { error: 'no grid', zone: S.currentZone };
  const rows = g.length, cols = g[0].length, cell = (Z.h * 32) / rows;
  const open = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols && g[r][c] !== false && !(at && at((c + 0.5) * cell, (r + 0.5) * cell).swim);
  const W = window.__btWheelObjects;
  const bx = W && W.blockers ? W.blockers() : [];
  const n = Math.ceil(len / cell);
  const fy = S.player.y + 52, c0 = Math.floor(S.player.x / cell), r0 = Math.floor(fy / cell);
  const out = [];
  for (let r = r0 - 60; r <= r0 + 60; r++) {
    for (let c = c0 - 60; c <= c0 + 60; c += 3) {
      let ok = true;
      for (let k = 0; ok && k < n; k++) for (let rr = r - 1; ok && rr <= r + 1; rr++) if (!open(rr, c + k)) ok = false;
      if (!ok) continue;
      const x0 = (c + 0.5) * cell, x1 = x0 + len, y = (r + 0.5) * cell;
      if (bx.some((b) => b.x1 > x0 - hs - 8 && b.x0 < x1 + hs + 8 && b.y1 > y - hs - 8 && b.y0 < y + hs + 8)) continue;
      if ((S.npcs || []).some((m) => m && m.x > x0 - 40 && m.x < x1 + 40 && Math.abs(m.y + 52 - y) < 50)) continue;
      /* how many pictures are drawn over him along it (a building's roof in
         front of him): none is wanted, for the pictures */
      let cover = 0;
      for (let k = 0; k <= len; k += 100) {
        const x = x0 + k;
        cover += (W && W.near ? W.near(x, y, 700) : []).filter((o) => o.y > y && Math.abs(o.x - x) < o.w / 2 + 30 && o.y - o.h < y + 10).length;
      }
      out.push({ x0, y, cover, d: Math.hypot(x0 - S.player.x, y - fy) });
    }
  }
  out.sort((a, b) => (a.cover - b.cover) || (a.d - b.d));
  return { cell, list: out.slice(0, 8) };
}, { len, hs: HS });

const sprintState = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const b = window.__btSprintBtn ? window.__btSprintBtn() : null;
  return { x: S.player.x, y: S.player.y, vx: S.player.vx || 0, roll: !!S._dodgeRoll, stick: Math.hypot(S.stickX || 0, S.stickY || 0),
    st: S.rpg ? S.rpg.stamina : null, btn: b, jog: window.__btJogCyc || null,
    aim: !!S._aiming, auto: !!S.autoAttack, jumps: S._jumpCount || 0 /* v2.3.3106: the attack half is under it now */ };
});

/* hold `key`, sampling every ~100 ms for `ms` (or until `until`); `each`
   is asked of every sample */
async function hold(P, key, ms, until, each) {
  const out = [];
  const t0 = Date.now();
  await P.page.keyboard.down(key);
  while (Date.now() - t0 < ms) {
    const s = await sprintState(P);
    s.t = Date.now() - t0;
    if (each) await each(s);
    out.push(s);
    if (until && until(out)) break;
    await P.page.waitForTimeout(90);
  }
  await P.page.keyboard.up(key);
  return out;
}
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const centre = (b) => ({ x: (b.l + b.r) / 2, y: (b.t + b.b) / 2 });

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  /* dpr 1: a quarter of the pixels, so the test machine (no GPU) draws more
     frames a second -- the game sends one move a frame */
  const P = await H.newPlayer(browser, { name: 'Sprinter', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 1 });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  await H.enterWorld(P);
  const myId = await H.readState(P, (S) => S.myId);
  /* The idle logout wants a real key now and then; Control is input to the
     window and nothing in the game (Shift is the sprint). */
  let alive = true;
  const keep = (async () => { while (alive) { await P.page.keyboard.press('Control').catch(() => {}); await P.page.waitForTimeout(20000); } })();
  const done = async () => { alive = false; await keep.catch(() => {}); await P.ctx.close().catch(() => {}); };
  const inWheel = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading, grid: !!(S._tiledWalkable && S._tiledWalkable.wheel && S._tiledWalkable.wheel.length), caps: !!(S._serverCaps && S._serverCaps.sprint) }),
    (v) => v.zone === 'wheel' && !v.loading && v.grid, { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
  rec.ok('in the Wheel, its walk grid there (guard)', !!inWheel, inWheel);
  if (!inWheel) { await done(); return; }
  rec.ok('the worker advertises caps.sprint', !!inWheel.caps, inWheel);
  await H.devOp(wsPort, 'quests', myId);
  await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 20 });
  await P.page.waitForTimeout(1500);
  const feetDy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround ? window.__btPlayerGround() : null; return g ? g.y - S.player.y : 52; });

  /* ── 1. where it is ── */
  checkLayout(rec, await LAYOUT(P), 'upright');
  await P.page.setViewportSize(SIDEWAYS);
  await P.page.waitForTimeout(1200);
  checkLayout(rec, await LAYOUT(P), 'sideways');
  await P.page.screenshot({ path: join(OUT, 'sprint-sideways.png') });
  await P.page.setViewportSize(PHONE);
  await P.page.waitForTimeout(1200);

  /* ── 2. a tap is a tap ── */
  {
    const L = await LAYOUT(P);
    const c = centre(L.btn);
    await P.page.touchscreen.tap(c.x, c.y);
    await P.page.waitForTimeout(250);
    const on = await sprintState(P);
    const L2 = await LAYOUT(P);
    rec.ok('a tap turns it on (lit)', !!(on.btn && on.btn.armed) && L2.state === 'on', { btn: on.btn, state: L2.state });
    rec.ok('...and is only a tap: no roll, no walk, no aim, swing or jump from the attack half underneath',
      !on.roll && on.stick === 0 && !on.aim && !on.auto && on.jumps === 0, on);
    await P.page.touchscreen.tap(c.x, c.y);
    await P.page.waitForTimeout(250);
    const off = await sprintState(P);
    rec.ok('a second tap turns it off', !!off.btn && !off.btn.armed && off.btn.why === 'tap', off.btn);
  }

  /* ── 3/4. the speed, and the bill ── */
  const lanes = await FIND_LANE(P, 900);
  console.log(`    lanes: ${JSON.stringify({ cell: lanes.cell, n: (lanes.list || []).length, near: (lanes.list || []).slice(0, 2), error: lanes.error })}`);
  rec.ok('a clear lane east near town (guard)', !!(lanes.list && lanes.list.length), lanes.error || null);
  if (!(lanes.list && lanes.list.length)) { await done(); return; }
  let lane = null;
  for (const l of lanes.list) {
    await H.hopTo(P, l.x0, l.y - feetDy, { tries: 200 });
    await P.page.waitForTimeout(800);
    const here = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    if (Math.abs(here.x - l.x0) < 8 && Math.abs(here.y - (l.y - feetDy)) < 8) { lane = l; break; }
  }
  rec.ok('standing at the lane\'s start (guard)', !!lane, null);
  if (!lane) { await done(); return; }
  const start = { x: lane.x0, y: lane.y - feetDy };
  /* walking the lane... */
  const walked = await hold(P, 'd', 2200);
  /* ...and back to its start to sprint the same ground */
  await H.hopTo(P, start.x, start.y, { tries: 200 });
  await P.page.waitForTimeout(1500);
  const btnC = centre((await LAYOUT(P)).btn);
  const srv0 = await H.serverPlayer(wsPort, myId);
  /* every move the game hands its channel from here, before any batching:
     when, and whether he was sprinting */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    window.__sprBcasts = [];
    if (S.channel && !S.channel.__sprWrapped) {
      const cs = S.channel.send;
      S.channel.send = function (m) {
        try { if (m && m.event === 'move' && window.__sprBcasts) window.__sprBcasts.push({ t: performance.now(), sp: window.__btSprintBtn ? window.__btSprintBtn().running : null }); } catch (e) { /* not ours */ }
        return cs.apply(this, arguments);
      };
      S.channel.__sprWrapped = true;
    }
  });
  await P.page.touchscreen.tap(btnC.x, btnC.y);
  const t0 = Date.now();
  const ran = await hold(P, 'd', 2200);
  const tRun = (Date.now() - t0) / 1000;
  await P.page.waitForTimeout(150);
  const srv1 = await H.serverPlayer(wsPort, myId);
  const me1 = await sprintState(P);
  {
    const wv = walked.filter((s) => s.t > 300 && s.vx > 0).map((s) => s.vx);
    const rv = ran.filter((s) => s.t > 300 && s.vx > 0 && s.btn && s.btn.running).map((s) => s.vx);
    const ratio = mean(wv) && mean(rv) ? mean(rv) / mean(wv) : null;
    console.log(`    speeds (px a frame): ${JSON.stringify({ walk: mean(wv), sprint: mean(rv), ratio, nWalk: wv.length, nRun: rv.length, walkX: [walked[0].x, walked[walked.length - 1].x], runX: [ran[0].x, ran[ran.length - 1].x] })}`);
    rec.ok(`sprinting he runs ${ratio != null ? ratio.toFixed(3) : '?'} times his walk over the same ground (the owner's "about 33% faster": ${MULT})`,
      ratio != null && Math.abs(ratio - MULT) < 0.03 && rv.length >= 3, { wv, rv });
    const jw = walked.filter((s) => s.t > 300 && s.jog).map((s) => s.jog.cyc);
    const jr = ran.filter((s) => s.t > 300 && s.jog && s.btn && s.btn.running).map((s) => s.jog.cyc);
    const jk = mean(jw) && mean(jr) ? mean(jw) / mean(jr) : null;
    rec.ok(`...and his legs keep up: the jog loop ${jk != null ? jk.toFixed(3) : '?'} times quicker`, jk != null && Math.abs(jk - MULT) < 0.02, { jw: jw.slice(0, 3), jr: jr.slice(0, 3) });
    const bc = await P.page.evaluate(() => window.__sprBcasts || []);
    console.log(`    moves broadcast: ${JSON.stringify({ n: bc.length, running: bc.filter((m) => m.sp).length, gaps: bc.slice(1).map((m, i) => Math.round(m.t - bc[i].t)) })}`);
    const fps = await P.page.evaluate(() => { const S = window._gameState.current; return { dtScale: S._dtScale }; });
    console.log(`    frame: ${JSON.stringify(fps)}`);
    const spent = srv0 && srv1 ? srv0.stamina - srv1.stamina : null;
    /* What the worker saw of the run: moves, marked ones, sprint steps it
       allowed, paid ones, and the time it billed.  A phone sends a move every
       22-66 ms, so the run's billed time is the run; THIS machine draws ~3
       frames a second and its client drops every other move, so the worker
       sees a move every ~800 ms and the run's two ends (unbilled) are most of
       it.  So the check is the rule -- every sprinting move it got was a paid
       step, billed DRAIN_PER_S for the time between them -- and the rate
       itself is the sprint suite's (100 ms and 450 ms cadences). */
    const t0s = (srv0 && srv0.sprint) || { moves: 0, marked: 0, steps: 0, paid: 0, still: 0, ms: 0 };
    const t1s = (srv1 && srv1.sprint) || t0s;
    const tal = {}; for (const k of Object.keys(t1s)) tal[k] = t1s[k] - (t0s[k] || 0);
    const want = DRAIN * tal.ms / 1000;
    console.log(`    bill: ${JSON.stringify({ srv0: srv0 && srv0.stamina, srv1: srv1 && srv1.stamina, spent, tRun, client: me1.st, run: tal, want: +want.toFixed(1) })}`);
    rec.ok(`the worker took every sprinting move it got as a paid sprint step (${tal.marked} marked, ${tal.steps} allowed, ${tal.paid} paid)`,
      tal.marked >= 2 && tal.steps === tal.marked && tal.paid === tal.marked, tal);
    rec.ok(`...and billed them ${DRAIN} a second: ${spent} stamina for the ${(tal.ms / 1000).toFixed(2)} s between them (${want.toFixed(1)})`,
      spent != null && spent > 0 && Math.abs(spent - want) <= 1.5, { spent, want, run: tal });
    /* the worker's echo reaches a page this slow a frame or two late: give
       it up to 3 s to land, then compare */
    let bar = null;
    for (let i = 0; i < 15; i++) {
      const sv = await H.serverPlayer(wsPort, myId);
      const cl = await H.readState(P, (S) => (S.rpg ? S.rpg.stamina : null));
      bar = { client: cl, server: sv && sv.stamina };
      if (cl != null && sv && Math.abs(cl - sv.stamina) <= 1.5) break;
      await P.page.waitForTimeout(200);
    }
    rec.ok(`...and the bar on the phone is the worker's (${bar.client != null ? bar.client.toFixed(1) : '?'} against ${bar.server})`,
      bar.client != null && bar.server != null && Math.abs(bar.client - bar.server) <= 1.5, bar);
    const lag = srv1 ? Math.hypot(srv1.x - me1.x, srv1.y - me1.y) : null;
    rec.ok(`every sprinting move was accepted: the worker has him where he is (${lag != null ? lag.toFixed(0) : '?'} px apart; a refused move leaves it behind)`,
      lag != null && lag < 60, { srv: srv1 && { x: srv1.x, y: srv1.y }, me: { x: me1.x, y: me1.y } });
  }

  /* ── 4b. the phone's way: one thumb on the stick, the other taps SPRINT ──
     Two touches at once, through the browser's own touch input (CDP): the
     stick's touch goes down in the movement half and is dragged east, and
     while it is held a second finger taps the button and lets go. */
  {
    await H.hopTo(P, start.x, start.y, { tries: 200 });
    await H.devOp(wsPort, 'vitals', myId, { heal: true });
    await P.page.waitForTimeout(900);
    const L = await LAYOUT(P);
    const b = centre(L.btn);
    const cdp = await P.ctx.newCDPSession(P.page);
    const stick = { id: 1, x: L.stick.l + 30, y: L.stick.b - 20 };
    const held = { id: 1, x: stick.x + 40, y: stick.y };
    const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q) => ({ x: q.x, y: q.y, id: q.id })) });
    await touch('touchStart', [stick]);
    await P.page.waitForTimeout(60);
    await touch('touchMove', [held]);
    const walk2 = [];
    for (let i = 0; i < 8; i++) { await P.page.waitForTimeout(110); walk2.push(await sprintState(P)); }
    await touch('touchStart', [held, { id: 2, x: b.x, y: b.y }]);
    await P.page.waitForTimeout(80);
    /* the second finger lifts, the thumb stays: CDP's touchEnd releases the
       points it names, and only those */
    await touch('touchEnd', [{ id: 2, x: b.x, y: b.y }]);
    const run2 = [];
    for (let i = 0; i < 10; i++) { await P.page.waitForTimeout(110); run2.push(await sprintState(P)); }
    const L2 = await LAYOUT(P);
    const disc = await P.page.evaluate(() => { const d = document.querySelector('.bt-joystick-zone'); return d ? +getComputedStyle(d).opacity : null; });
    await P.page.screenshot({ path: join(OUT, 'sprint-phone.png') });
    await P.page.screenshot({ path: join(OUT, 'sprint-closeup.png'), clip: { x: Math.max(0, L.btn.l - 100), y: Math.max(0, L.btn.t - 60), width: Math.min(200, L.vw - Math.max(0, L.btn.l - 100)), height: 260 } });
    await touch('touchEnd', [held]);
    const wv2 = walk2.filter((q) => q.vx > 0 && !(q.btn && q.btn.running)).map((q) => q.vx);
    const rv2 = run2.filter((q) => q.vx > 0 && q.btn && q.btn.running).map((q) => q.vx);
    const k2 = mean(wv2) && mean(rv2) ? mean(rv2) / mean(wv2) : null;
    console.log(`    two thumbs: ${JSON.stringify({ stick, button: b, walk: mean(wv2), sprint: mean(rv2), ratio: k2, nWalk: wv2.length, nRun: rv2.length, state: L2.state, disc, roll: run2.some((q) => q.roll) })}`);
    rec.ok('the phone\'s way: with a thumb holding the stick, a second finger\'s tap turns it on (lit), no roll',
      L2.state === 'running' && run2.every((q) => !q.roll) && disc > 0.5, { state: L2.state, disc });
    rec.ok(`...and he runs ${k2 != null ? k2.toFixed(3) : '?'} times the stick's walk`, k2 != null && Math.abs(k2 - MULT) < 0.03 && rv2.length >= 3, { wv2, rv2 });
    await P.page.waitForTimeout(1500);
  }

  /* ── 5. standing still ends it ── */
  await P.page.waitForTimeout(1200);
  {
    const s = await sprintState(P);
    rec.ok('standing still ends it', !!s.btn && !s.btn.armed && s.btn.why === 'still', s.btn);
  }

  /* ── 6. run dry ── */
  {
    await H.hopTo(P, start.x, start.y, { tries: 200 });
    await H.devOp(wsPort, 'vitals', myId, { heal: true, stamina: 12 });
    await P.page.waitForTimeout(700);
    const s0 = await sprintState(P);
    const c = centre((await LAYOUT(P)).btn);
    await P.page.touchscreen.tap(c.x, c.y);
    /* the worker's own bar, every sample: it refills a second after the last
       paid step, so read once at the end it has already climbed again */
    let srvMin = Infinity;
    const dry = await hold(P, 'd', 12000, (o) => { const l = o[o.length - 1]; return !!(l.btn && !l.btn.armed); },
      async () => { const sv = await H.serverPlayer(wsPort, myId); if (sv && typeof sv.stamina === 'number') srvMin = Math.min(srvMin, sv.stamina); });
    const end = dry[dry.length - 1];
    await P.page.waitForTimeout(200);   /* the button reads the state every 100 ms */
    const L = await LAYOUT(P);
    await P.page.touchscreen.tap(centre(L.btn).x, centre(L.btn).y);
    await P.page.waitForTimeout(150);
    const refused = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const b = window.__btSprintBtn();
      return { b, note: S.dmgNumbers.filter((p) => p.text === 'Not enough energy!').length, shake: !!document.querySelector('[data-sprint] .bt-sprint-nope') };
    });
    const srv = await H.serverPlayer(wsPort, myId);
    console.log(`    dry: ${JSON.stringify({ from: s0.st, end: end.btn, ms: end.t, stateAfter: L.state, refused, server: srv && srv.stamina })}`);
    rec.ok(`run dry it ends on its own (from ${s0.st != null ? s0.st.toFixed(0) : '?'} stamina, after ${(end.t / 1000).toFixed(1)} s), the worker's bar down to ${srvMin}`,
      !!end.btn && !end.btn.armed && end.btn.why === 'empty' && srvMin <= 1, { end: end.btn, srvMin, now: srv && srv.stamina });
    rec.ok('...the button fades', L.state === 'tired', L.state);
    rec.ok('...and a tap then is refused, with "Not enough energy!" over his head and a shake',
      !!refused.b && !refused.b.armed && refused.b.why === 'tired' && refused.note >= 1 && refused.shake, refused);
  }

  /* ── 7. Shift ── */
  {
    await H.devOp(wsPort, 'vitals', myId, { heal: true });
    await H.hopTo(P, start.x, start.y, { tries: 200 });
    await P.page.waitForTimeout(700);
    await P.page.keyboard.down('Shift');
    const kr = await hold(P, 'd', 1400);
    const mid = kr.filter((s) => s.t > 300 && s.btn && s.btn.running);
    await P.page.keyboard.up('Shift');
    await P.page.waitForTimeout(200);
    const after = await sprintState(P);
    rec.ok('Shift held is the keyboard\'s sprint', mid.length >= 3 && mid.every((s) => s.btn.how === 'key'), kr.map((s) => s.btn && s.btn.how));
    rec.ok('...let go, it stops', !!after.btn && !after.btn.armed && after.btn.why === 'key', after.btn);
  }

  /* ── 8. an attack ends it ── */
  {
    const c = centre((await LAYOUT(P)).btn);
    await P.page.touchscreen.tap(c.x, c.y);
    await P.page.waitForTimeout(200);
    const r = await P.page.evaluate(async () => {
      const S = window._gameState.current;
      const on = window.__btSprintBtn().armed;
      S.autoAttack = true;
      await new Promise((res) => setTimeout(res, 300));
      S.autoAttack = false;
      return { on, after: window.__btSprintBtn() };
    });
    rec.ok('an attack ends it', r.on && !r.after.armed && r.after.why === 'attack', r);
  }

  rec.ok(`no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  await done();
}
