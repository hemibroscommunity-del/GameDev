/* ═══ v2.3.4098: TOWNSFOLK NEVER BLOCK YOU -- on a phone and a computer ═══
 *
 * The owner, 2026-11-03: "I walked into Npc who walked into me and I got
 * stuck."  (docs/specs/living-town.md, "Townsfolk never block you".)  Until
 * v2.3.4098 a townsperson was solid to your walk (BroTown isSolid: a 14 px
 * radius about his feet tested at each corner of your box), and a walker
 * who stopped 22 px off your feet (his bump) left a corner of yours inside
 * it with your centre outside the never-trap pass: every step of yours was
 * solid, and his next step was a bump.  Both held for good.
 *
 * In the world's BroTown, a phone (390 x 844, touch: the left joystick, by
 * touches on the page) and a computer (1280 x 800, the sideways layout: held
 * keys), each:
 *   1. finds a WALKING keeper or local (window.__btFolkWalk: not a quest
 *      giver, who stands for you);
 *   2. HEAD-ON: stands ahead of him on his way and walks straight at him, by
 *      the game's own input (no write of S.player.x while walking), and the
 *      player keeps moving: past him (30 px beyond his feet, along the walk)
 *      within a second of meeting him (scaled up for a slow page by the
 *      walk speed this page measured), and never standing still beside him;
 *      the walker never stepped into you (within his 22 px bump of your feet,
 *      a step of his toward you): he waited (bumpsTotal counts it);
 *   3. SIDEWAYS: walks across his way just ahead of him: the same;
 *   4. no page errors.
 * Placing the player before each walk is a write (hopTo, steps of 100 px a
 * move gap apart, so the worker keeps pace); the walk itself is real input,
 * so a block anywhere in it would show.
 * Run after `npm run build`: node tools/qa/mp/run.mjs folkpass
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const WIDE = { width: 1280, height: 800 };
const HIDE = '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }';
/* the player starts this far from him (head-on: ahead on his way) or from his
   way (sideways), world px, feet.  Close on purpose: this box walks the
   player at 15-45 px a second (a few frames a second) while his loop's clock
   walks him at 80, so from further off he has turned a corner first. */
const START_D = { 'head-on': 40, sideways: 30 };
const MEET_PX = 26;       /* feet to feet: met (the old block stopped you at 14-24) */
const PAST_PX = 30;       /* past him: this far beyond his feet, along your walk */
const TRIES = 5;

/* the eight ways, as unit vectors (+y south) */
const DIRS8 = Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return { x: Math.cos(a), y: Math.sin(a) }; });
const q8 = (x, y) => { let best = DIRS8[0], bd = -Infinity; for (const d of DIRS8) { const v = d.x * x + d.y * y; if (v > bd) { bd = v; best = d; } } return best; };

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  /* BT_FOLKPASS_ONLY=phone|computer: one of the two (a rerun) */
  const only = process.env.BT_FOLKPASS_ONLY || '';
  for (const kind of ['phone', 'computer'].filter((k) => !only || k === only)) {
    const phone = kind === 'phone';
    const P = await H.newPlayer(browser, phone
      ? { name: 'Passbro', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true }
      : { name: 'Passdesk', wsPort, webPort, world: 'wheel', viewport: WIDE, wide: true });
    const errors = [];
    P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
    const stopAlive = H.keepAlive(P);
    try {
      await one(P, kind, phone, { wsPort, rec, OUT });
    } catch (e) {
      rec.ok(`${kind}: the scenario ran to its end`, false, String((e && e.stack) || e).slice(0, 400));
    } finally {
      stopAlive();
      rec.ok(`${kind}: 4. no page errors`, errors.length === 0, errors.slice(0, 4));
      await P.ctx.close().catch(() => {});
    }
  }
}

async function one(P, kind, phone, { wsPort, rec, OUT }) {
  await H.enterWorld(P);
  const inWheel = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
    (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the world' }).catch(() => null);
  rec.ok(`${kind}: in the world (guard)`, !!inWheel, inWheel);
  if (!inWheel) return;
  const id = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'vitals', id, { god: true, godMinutes: 30 }).catch(() => null);
  await P.page.addStyleTag({ content: HIDE }).catch(() => {});
  await P.page.waitForTimeout(2500);
  const f0 = await H.waitFor(P, () => (window.__btFolkWalk ? window.__btFolkWalk() : null), (v) => !!v && v.on && v.folk.length >= 10,
    { timeout: 30000, label: 'their days' }).catch(() => null);
  rec.ok(`${kind}: 1. the townsfolk walk here (${f0 ? f0.folk.length : 0}, on ${f0 && f0.on})`, !!f0 && f0.on, f0 && { on: f0.on, n: f0.folk.length });
  if (!f0 || !f0.on) return;
  /* your body's centre to your feet (playerGroundDy), flat in town */
  const drop = await P.page.evaluate(() => {
    const g = window.__btPlayerGround && window.__btPlayerGround();
    const S = window._gameState.current;
    return g && Number.isFinite(g.y) ? g.y - S.player.y : 52;
  });

  /* ── the walk, by the game's own input ── */
  const keysOf = (a) => [a.x > 0.3 ? 'd' : a.x < -0.3 ? 'a' : null, a.y > 0.3 ? 's' : a.y < -0.3 ? 'w' : null].filter(Boolean);
  /* hold the input `a` for ms, sampling you and townsperson `nid` every 40 ms */
  const walk = async (a, ms, nid) => {
    await P.page.evaluate(({ nid, drop }) => {
      const S = window._gameState.current;
      const out = [];
      window.__fpSamples = out;
      const t0 = performance.now();
      window.__fpTimer = setInterval(() => {
        const n = (S.npcs || []).find((q) => q && q.id === nid);
        const fw = window.__btFolkWalk ? window.__btFolkWalk() : null;
        out.push({ t: performance.now() - t0, px: S.player.x, py: S.player.y + drop, nx: n ? n.x : NaN, ny: n ? n.y : NaN, b: fw ? fw.bumpsTotal : 0 });
      }, 40);
    }, { nid, drop });
    if (phone) {
      await P.page.evaluate(async ({ ax, ay, ms }) => {
        const disc = document.querySelector('.bt-joystick-base') || document.querySelector('[data-joyzone="L"]');
        const d = disc.getBoundingClientRect();
        const cx = d.left + d.width / 2, cy = d.top + d.height / 2;
        const t = (x, y) => [new Touch({ identifier: 7, target: document.elementFromPoint(cx, cy) || document.body, clientX: x, clientY: y, pageX: x, pageY: y })];
        const el = document.elementFromPoint(cx, cy) || document.body;
        const fire = (type, x, y) => el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true,
          touches: type === 'touchend' ? [] : t(x, y), targetTouches: type === 'touchend' ? [] : t(x, y), changedTouches: t(x, y) }));
        fire('touchstart', cx, cy);
        for (let i = 1; i <= 8; i++) fire('touchmove', cx + ax * i * 5, cy + ay * i * 5);
        await new Promise((r) => setTimeout(r, ms));
        fire('touchend', cx + ax * 40, cy + ay * 40);
      }, { ax: a.x, ay: a.y, ms });
    } else {
      const keys = keysOf(a);
      for (const k of keys) await P.page.keyboard.down(k);
      await P.page.waitForTimeout(ms);
      for (const k of keys) await P.page.keyboard.up(k);
    }
    return P.page.evaluate(() => { clearInterval(window.__fpTimer); return window.__fpSamples || []; });
  };
  /* is the walk from feet (x, y) along a for len px clear of everything but
     townsfolk (the walk test and the footprints, your box's corners)? */
  const clearLine = (x, y, a, len) => P.page.evaluate(({ x, y, ax, ay, len, drop }) => {
    if (!window.__btIsSolid || !window.__btPropFeetBlocked) return false;
    const hs = 10;
    let px = x, py = y - drop;
    for (let s = 0; s <= len; s += 6) {
      const nx = x + ax * s, ny = y - drop + ay * s;
      for (const [cx, cy] of [[-hs, -hs], [hs, -hs], [-hs, hs], [hs, hs]]) if (window.__btIsSolid(nx + cx, ny + cy)) return false;
      if (s > 0 && window.__btPropFeetBlocked(px, py, nx, ny)) return false;
      px = nx; py = ny;
    }
    return true;
  }, { x, y, ax: a.x, ay: a.y, len, drop });

  /* the walk speed of this page, in clear ground (the slow box draws a few
     frames a second: the second's grace is scaled by it, TRAPS §200) */
  let speed = null;
  const cal = { clear: [], samples: 0, frame: await H.hopGap(P).catch(() => null) };
  for (const a of DIRS8) {
    const me = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    const ok = await clearLine(me.x, me.y + drop, a, 260);
    cal.clear.push(ok ? 1 : 0);
    if (!ok) continue;
    await walk(a, 800, '__none__');   /* a first walk is slow while the ground round you streams in */
    const s = await walk({ x: -a.x, y: -a.y }, 1500, '__none__');
    const mid = s.filter((q) => q.t > 300);
    cal.samples = s.length; cal.dir = [+a.x.toFixed(2), +a.y.toFixed(2)];
    if (mid.length > 2) speed = Math.hypot(mid[mid.length - 1].px - mid[0].px, mid[mid.length - 1].py - mid[0].py) / ((mid[mid.length - 1].t - mid[0].t) / 1000);
    break;
  }
  cal.speed = speed;
  /* a slow page walks slowly (this box: a few frames a second) -- only "it moves" here */
  rec.ok(`${kind}: the walk works here (${speed ? Math.round(speed) : 0} px a second)`, !!speed && speed > 5, cal);
  if (!speed) return;
  /* the second's grace, for a page this slow: three times the time to walk
     from meeting him to past him at the pace of your walk there (two figures
     overlapping draw a little slower on this box: seen 2.7 s against 3.1) */
  const graceOf = (v) => Math.max(1000, Math.round(3 * (MEET_PX + PAST_PX) / v * 1000));

  const folk = () => P.page.evaluate(() => (window.__btFolkWalk ? window.__btFolkWalk() : null));
  const npcAt = (nid) => P.page.evaluate((nid) => { const S = window._gameState.current; const q = (S.npcs || []).find((m) => m && m.id === nid); return q ? { x: q.x, y: q.y } : null; }, nid);
  for (const way of ['head-on', 'sideways']) {
    let done = null, lastWhy = null;
    const tried = new Set();
    for (let k = 0; k < TRIES && !done; k++) {
      /* 1. a walker: a keeper or local, the nearest not tried yet */
      const me = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
      const f = await folk();
      const cands = ((f && f.folk) || []).filter((n) => !n.giver && !tried.has(n.id))
        .sort((p, q) => Math.hypot(p.x - me.x, p.y - me.y) - Math.hypot(q.x - me.x, q.y - me.y));
      const pick = cands[0];
      if (!pick) { lastWhy = 'no keeper or local'; break; }
      tried.add(pick.id);
      await H.hopTo(P, pick.x, pick.y + 200 - drop, { step: 100, gap: 260, tries: 90 });
      /* wait for him to walk (two samples, 300 ms apart) */
      let u = null, v = 0;
      const end = Date.now() + 40000;
      while (Date.now() < end) {
        const a0 = await npcAt(pick.id);
        await P.page.waitForTimeout(300);
        const a1 = await npcAt(pick.id);
        const d = a0 && a1 ? Math.hypot(a1.x - a0.x, a1.y - a0.y) : 0;
        if (d > 6) { u = { x: (a1.x - a0.x) / d, y: (a1.y - a0.y) / d }; v = d / 300; break; }
      }
      if (!u) { lastWhy = `${pick.name} did not walk`; continue; }
      /* 2/3. where you start and which way you walk: head-on, ahead of him
         on his way, walking at him; sideways, beside his way where he will be
         as you reach it (his pace times the time to get there) */
      const startFor = (nAt, o) => {
        /* the last hop's move gap; sideways, a little more: you reach his way
           as he does (he pauses before he steps into you, so a near miss
           still meets him) */
        const lead = v * 300 + (way === 'sideways' ? 10 : 0);
        const meet = { x: nAt.x + u.x * lead, y: nAt.y + u.y * lead };
        return { x: meet.x - o.x * START_D[way], y: meet.y - o.y * START_D[way] };
      };
      const n0 = await npcAt(pick.id);
      let a = null, start = null;
      const options = way === 'head-on' ? [q8(-u.x, -u.y)] : [q8(-u.y, u.x), q8(u.y, -u.x)];
      for (const o of options) {
        const st = startFor(n0, o);
        if (await clearLine(st.x, st.y, o, START_D[way] + PAST_PX + 40)) { a = o; start = st; break; }
      }
      if (!a) { lastWhy = `no clear line to ${pick.name}`; continue; }
      await H.hopTo(P, start.x, start.y - drop, { step: 100, gap: 260, tries: 30 });
      /* he walked on while you got there: the last hop (under 100 px, one
         move gap) puts you where he is now */
      const n1 = await npcAt(pick.id);
      const st1 = startFor(n1, a);
      if (Math.hypot(st1.x - start.x, st1.y - start.y) < 100 && await clearLine(st1.x, st1.y, a, START_D[way] + PAST_PX + 40)) {
        await H.hopTo(P, st1.x, st1.y - drop, { step: 100, gap: 260, tries: 3 });
      }
      const holdMs = Math.min(12000, Math.round((START_D[way] + PAST_PX + 40) / speed * 1000) + graceOf(speed));
      const s = await walk(a, holdMs, pick.id);
      /* the reading */
      const along = (q) => (q.px - q.nx) * a.x + (q.py - q.ny) * a.y;   /* + once you are past his feet */
      const iMeet = s.findIndex((q) => Math.hypot(q.px - q.nx, q.py - q.ny) < MEET_PX);
      /* your pace on the way to him (after the first 300 ms), for the grace
         and the next try's lead */
      const app = s.filter((q, i) => q.t > 300 && (iMeet < 0 || i <= iMeet));
      const vYou = app.length > 3 ? Math.hypot(app[app.length - 1].px - app[0].px, app[app.length - 1].py - app[0].py) / ((app[app.length - 1].t - app[0].t) / 1000) : speed;
      if (vYou > 5) speed = vYou;
      const graceMs = graceOf(speed);
      /* a step of his INTO you: both samples within his bump of your feet,
         and he moved toward your feet by half a px or more */
      let into = 0;
      for (let i = 1; i < s.length; i++) {
        const p0 = s[i - 1], p1 = s[i];
        const d0 = Math.hypot(p0.px - p0.nx, p0.py - p0.ny), d1 = Math.hypot(p1.px - p1.nx, p1.py - p1.ny);
        if (!(d0 < 22 && d1 < 22)) continue;
        /* toward where you were AND where you are (you walking past him
           between two samples is not his step into you) */
        const mx = p1.nx - p0.nx, my = p1.ny - p0.ny;
        if ((mx * (p0.px - p0.nx) + my * (p0.py - p0.ny)) / (d0 || 1) >= 0.5 && (mx * (p1.px - p0.nx) + my * (p1.py - p0.ny)) / (Math.hypot(p1.px - p0.nx, p1.py - p0.ny) || 1) >= 0.5) into++;
      }
      if (iMeet < 0) {
        const closest = Math.min(...s.map((q) => Math.hypot(q.px - q.nx, q.py - q.ny)).filter(Number.isFinite));
        lastWhy = `never met ${pick.name} (closest ${Math.round(closest)} px)`;
        continue;
      }
      const iPast = s.findIndex((q, i) => i >= iMeet && along(q) >= PAST_PX);
      /* standing still beside him: a 400 ms stretch between meeting and passing with under 3 px walked */
      let stall = 0;
      const until = iPast >= 0 ? iPast : s.length - 1;
      for (let i = iMeet; i <= until; i++) {
        let j = i;
        while (j <= until && s[j].t - s[i].t < 400) j++;
        if (j > until) break;
        const w = Math.hypot(s[j].px - s[i].px, s[j].py - s[i].py);
        if (w < 3) stall = Math.max(stall, s[j].t - s[i].t);
      }
      done = { who: pick.name, way, kind, meetAt: Math.round(s[iMeet].t), pastMs: iPast >= 0 ? Math.round(s[iPast].t - s[iMeet].t) : null,
        stallMs: Math.round(stall), into, closest: Math.round(Math.min(...s.map((q) => Math.hypot(q.px - q.nx, q.py - q.ny)).filter(Number.isFinite))), speed: Math.round(speed), bumps: s[s.length - 1].b - s[0].b, walkedPx: Math.round(Math.hypot(s[s.length - 1].px - s[0].px, s[s.length - 1].py - s[0].py)),
        heWalked: Math.round(Math.hypot(s[s.length - 1].nx - s[0].nx, s[s.length - 1].ny - s[0].ny)), dir: [+a.x.toFixed(2), +a.y.toFixed(2)], his: [+u.x.toFixed(2), +u.y.toFixed(2)], graceMs, tries: k + 1 };
    }
    const tag = way === 'head-on' ? '2' : '3';
    if (!done) { rec.ok(`${kind}: ${tag}. ${way}: met a walking townsperson`, false, lastWhy); continue; }
    await P.page.screenshot({ path: join(OUT, `folkpass-${kind}-${way}.png`) }).catch(() => {});
    rec.ok(`${kind}: ${tag}. ${way} into ${done.who}, walking: you keep moving, past him ${done.pastMs} ms after meeting him (within ${done.graceMs} ms)`,
      done.pastMs != null && done.pastMs <= done.graceMs, done);
    rec.ok(`${kind}: ...never standing still beside him (the longest stop ${done.stallMs} ms)`, done.stallMs < 400, done);
    rec.ok(`${kind}: ...and he never stepped into you: he waited (${done.bumps} frames held; closest ${done.closest} px)`, done.into === 0, done);
  }
}
