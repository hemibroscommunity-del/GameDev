/* mp-stafffeel (v2.3.4803): THE STAFF'S FEEL on a phone in the Wheel.
 *
 * The owner, 2026-11-11: "The staff building power and blasting the orb" --
 * and of magic's timing window, "For magic I think it should be skipped".
 * The rules are server/test/staff-feel.test.mjs (and the worker's
 * draw-gather.test); this plays the page, an upright phone with nothing
 * chosen (the game's own combat), a staff the WORKER holds, in the world --
 *   1. the feel is on (the worker's caps.staffGather, a staff in hand);
 *   2. THE GATHER STARTS ON THE TOUCH: a real finger down on the right half
 *      -- gathering at once, the spark (its stage landed), the bro planted;
 *      the crystal and the orb drawn;
 *   3. THE THREE STAGES and their crossings, each once, in order, as the
 *      gather passes the worker's thresholds (held by the page's clock);
 *      the finger's drag aims (the orb leans that way);
 *   4. THE LIFT BLASTS: one bolt, its relay carrying `ga` (the gather) and a
 *      sphere's slow speed, the push back a step;
 *   5. A TAP FIRES A SPARK: a small `ga`, a quick speed;
 *   6. A REAL HIT on a snowman at Frost Ridge: the claim names its shot
 *      (`sw` on monster_damage) and the worker's `gs` (the stage) and `pw`
 *      (the share) come back on monster_hit -- a sphere's and a spark's;
 *   7. THE BUDGET: the feel's own work a frame, a small part of
 *      held-budget.mjs's frame line (the whole game: mp-heldsweep);
 *   8. a computer (wide): the left button held gathers, its release blasts
 *      at the cursor;
 *   9. `?stafffeel=0` on one phone: today's held staff (bolts with no `ga`);
 *  10. no page errors.
 * The times that matter are held by the page's clock in one task (this box
 * draws a few frames a second: TRAPS §200). */
import * as H from './harness.mjs';
import { FRAME_JS_MAX_MS, HOLD_MAX_MS } from './held-budget.mjs';

const PHONE = { width: 390, height: 844 };
const FEEL_MAX_MS = FRAME_JS_MAX_MS / 4;
const FEEL_MEAN_MS = FRAME_JS_MAX_MS / 50;

const PAGE_TOOLS = `
  window.__stTouch = (el, type, x, y, id) => {
    const t = new Touch({ identifier: id, target: el, clientX: x, clientY: y });
    const end = type === 'touchend' || type === 'touchcancel';
    el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: end ? [] : [t], targetTouches: end ? [] : [t], changedTouches: [t] }));
  };
  window.__stSpin = (until) => { while (Date.now() < until) { /* the clock, not a timer */ } };
  window.__stZone = () => { const el = document.querySelector('[data-joyzone="R"]'); if (!el) return null; const b = el.getBoundingClientRect(); return { el, x: b.left + b.width * 0.5, y: b.top + b.height * 0.45 }; };
  /* what the phone sends: the bolts' relays and their claims */
  window.__stWire = function () {
    const S = window._gameState.current;
    if (!S || !S.channel) return false;
    if (S.channel.__stWrapped) return true;
    window.__stLog = [];
    const orig = S.channel.send.bind(S.channel);
    S.channel.send = (m) => {
      try {
        const k = m && (m.event || m.type), p = (m && m.payload) || {};
        if (k === 'player_projectile' && p.isStaff) window.__stLog.push({ k, t: Date.now(), ga: p.ga, ts: p.ts, sp: p.speedPx, life: p.life, special: !!p.isSpecial });
        else if (k === 'monster_damage' && p.slot === 'staff') window.__stLog.push({ k, t: Date.now(), sw: p.sw, id: String(p.monsterId), special: !!p.special });
        if (window.__stLog.length > 200) window.__stLog.shift();
      } catch (e) { /* never break the game */ }
      return orig(m);
    };
    S.channel.__stWrapped = true;
    return true;
  };
`;

const inWheel = (P) => H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'in the Wheel' }).catch(() => null);
const bolts = (P, since) => P.page.evaluate((t) => (window.__stLog || []).filter((e) => e.k === 'player_projectile' && e.t >= t && !e.special), since);
const nearSnow = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, p = S.player;
  return (S.monsters || []).filter((m) => m && m.alive !== false && (m.curHp == null || m.curHp > 0) && m.home === 'frost')
    .map((m) => ({ id: String(m.id), x: m.renderX != null ? m.renderX : m.x, y: m.renderY != null ? m.renderY : m.y, d: Math.hypot(m.x - p.x, m.y - p.y) })).sort((a, b) => a.d - b.d);
});

export async function run({ browser, wsPort, webPort, rec }) {
  const errors = [];
  const P = await H.newPlayer(browser, { name: 'Orbbro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query: 'manual=default' });   /* the game's own combat: nothing chosen */
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stop = H.keepAlive(P);
  try {
    await H.enterWorld(P);
    const inW = await inWheel(P);
    rec.ok('stafffeel: in the Wheel (guard)', !!inW, inW);
    if (!inW) return;
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
    const armed = await H.armWorker(P, wsPort, me, ['staff']);
    await P.page.waitForTimeout(1500);
    await P.page.evaluate(PAGE_TOOLS);
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    await P.page.evaluate(() => { const S = window._gameState.current; S.rpg.activeSlot = 'staff'; S.lockedTarget = null; S.autoAttack = false; S.rpg.mana = S.rpg.maxMana = 900; });

    /* ── 1 ── */
    const on = await H.waitFor(P, () => (window.__btStaffFeel ? window.__btStaffFeel() : {}), (v) => v.on, { timeout: 15000, label: 'the feel' }).catch(() => null);
    const one = await P.page.evaluate(() => ({ free: window.__btManual.free(), cap: (window._gameState.current._serverCaps || {}).staffGather, wire: window.__stWire() }));
    rec.ok('1 the game\'s own combat, a staff the worker holds, a worker with caps.staffGather: the staff\'s feel is on',
      !!on && armed.includes('staff') && one.free && one.cap === 1 && one.wire, { on, armed, one });
    if (!on) return;

    /* ── 2 + 3 ── a real finger down on the right half, the gather held by the page's clock */
    const g = await P.page.evaluate(() => {
      const F = window.__btStaffFeel, z = window.__stZone();
      if (!z) return { err: 'no zone' };
      window.__stSpin(Date.now() + 400);   /* clear of the last bolt's gap */
      const s0 = F().stats || { stages: [0, 0, 0] };
      const t0 = Date.now();
      window.__stTouch(z.el, 'touchstart', z.x, z.y, 71);
      const touch = F();
      window.__stSpin(t0 + 200); F.tick();
      const spark = F();
      /* the finger drags up: the aim (the stick's own rJoyAim), the orb leaning that way */
      window.__stTouch(z.el, 'touchmove', z.x, z.y - 30, 71);
      window.__stTouch(z.el, 'touchmove', z.x, z.y - 60, 71);
      window.__stSpin(t0 + 420); F.tick();
      const orb = F();
      window.__stSpin(t0 + 780); F.tick();
      const sphere = F();
      window.__stSpin(t0 + 1100); F.tick();
      const full = F();
      return { t0, s0: s0.stages, touch, spark, orb, sphere, full };
    });
    const d = (v) => v && v.stats ? v.stats.stages.map((n, i) => n - g.s0[i]) : null;
    rec.ok('2 THE GATHER STARTS ON THE TOUCH: gathering at once, the spark landed (its note and pulse), the bro planted (his walk slowed)',
      !!g.touch && g.touch.gathering && g.touch.view && g.touch.view.gathering && g.touch.view.stage === 0 && JSON.stringify(d(g.touch)) === '[1,0,0]' && g.touch.moveK < 1, g.touch);
    rec.ok('3 THE STAGES AND THEIR CROSSINGS: a spark at 200 ms, the orb landing past 0.4 of the full gather, the sphere past 0.8, each once and in order; held on past full, nothing more',
      g.spark.view.stage === 0 && g.orb.view.stage === 1 && g.sphere.view.stage === 2 && g.full.view.stage === 2 && g.full.view.r === 1
      && JSON.stringify(d(g.orb)) === '[1,1,0]' && JSON.stringify(d(g.sphere)) === '[1,1,1]' && JSON.stringify(d(g.full)) === '[1,1,1]'
      && g.orb.full > 0 && g.orb.now.claim >= g.orb.full * 0.4, { spark: g.spark.view, orb: g.orb.view, sphere: g.sphere.view, full: g.full.full });
    rec.ok('3 the drag aims while gathering: the orb leans up the screen (the finger\'s way)', Math.abs(g.sphere.view.aim + Math.PI / 2) < 0.05, g.sphere.view);
    /* the gather drawn for a few of the page's own frames, still held */
    const drawn = await P.page.evaluate(() => new Promise((res) => {
      const out = []; let n = 0;
      const f = () => { out.push({ fx: window.__btStaffFeelFx(), staff: window.__btStaffFx ? window.__btStaffFx() : null }); if (++n >= 4) res(out); else requestAnimationFrame(f); };
      requestAnimationFrame(f);
    }));
    const lastD = drawn[drawn.length - 1];
    rec.ok('2 ...drawn: the sphere at the staff\'s crystal (the feel\'s layer), and the crystal charged full (its specks pulled inward)',
      !!lastD.fx && lastD.fx.orbDrawn > 0 && lastD.fx.lastOrb && lastD.fx.lastOrb.stage === 2 && !!lastD.staff && lastD.staff.charge > 0.95 && lastD.staff.rhythm === 1, lastD);

    /* ── 4 ── the lift */
    const lift = await P.page.evaluate(() => {
      const z = window.__stZone(), t = Date.now();
      window.__stTouch(z.el, 'touchend', z.x, z.y - 60, 71);
      return { t, after: window.__btStaffFeel() };
    });
    const b4 = await H.waitFor(P, () => (window.__stLog || []).filter((e) => e.k === 'player_projectile' && !e.special).slice(-1)[0] || null, (v) => !!v && v.t >= lift.t, { timeout: 8000, label: 'the blast' }).catch(() => null);
    const shot4 = await P.page.evaluate(() => window.__btStaffFeel());
    rec.ok('4 THE LIFT BLASTS ONE BOLT: its relay carries `ga` (the whole gather, thumb down to lift) and a sphere\'s heavy, slow speed; the bro pushed back a step',
      !!b4 && b4.ga >= 1000 && b4.sp < 5 && !lift.after.gathering && shot4.lastShot && shot4.lastShot.stage === 2 && shot4.lastShot.ga === b4.ga && shot4.moveK === 1, { b4, lastShot: shot4.lastShot, recoil: shot4.recoil, fx: await P.page.evaluate(() => window.__btStaffFeelFx()) });

    /* ── 5 ── a tap */
    const tap = await P.page.evaluate(() => {
      const z = window.__stZone(); window.__stSpin(Date.now() + 300);
      const t = Date.now();
      window.__stTouch(z.el, 'touchstart', z.x, z.y, 72);
      window.__stSpin(t + 60);
      window.__stTouch(z.el, 'touchend', z.x, z.y, 72);
      return { t };
    });
    const b5 = await H.waitFor(P, () => (window.__stLog || []).filter((e) => e.k === 'player_projectile' && !e.special).slice(-1)[0] || null, (v) => !!v && v.t >= tap.t, { timeout: 8000, label: 'the spark' }).catch(() => null);
    const shot5 = await P.page.evaluate(() => window.__btStaffFeel().lastShot);
    rec.ok('5 A QUICK TAP FIRES A SMALL FAST SPARK: a small `ga`, quicker than the staff\'s bolt, drawn small',
      !!b5 && b5.ga >= 40 && b5.ga < 200 && b5.sp > 5 && shot5 && shot5.stage === 0 && shot5.sizeK < 1, { b5, shot5 });
    const twoBolts = (await bolts(P, g.t0)).length;
    rec.ok('5 ...and nothing else left: two bolts in all (the held thumb fired none)', twoBolts === 2, { twoBolts });

    /* ── 6 ── a real hit: the snowmen at Frost Ridge */
    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const at = WHEEL_SPAWNS.frost.points[0];
    await H.hopTo(P, at[0] + 150, at[1] + 220, { tries: 260 });
    await P.page.waitForTimeout(1500);
    let hit = { sphere: null, spark: null, claims: [] };
    for (let i = 0; i < 24 && !(hit.sphere && hit.spark); i++) {
      const m = (await nearSnow(P))[0];
      if (!m) { await P.page.waitForTimeout(800); continue; }
      if (m.d > 140) { await H.hopTo(P, m.x, m.y + 90, { tries: 20 }); continue; }
      const want = hit.sphere ? 'spark' : 'sphere';
      const r = await P.page.evaluate(({ m, want }) => {
        const S = window._gameState.current, z = window.__stZone();
        const p = S.player, a = Math.atan2(m.y - 20 - p.y, m.x - p.x);
        window.__stSpin(Date.now() + 300);
        const t0 = Date.now();
        window.__stTouch(z.el, 'touchstart', z.x, z.y, 73);
        window.__stTouch(z.el, 'touchmove', z.x + Math.cos(a) * 30, z.y + Math.sin(a) * 30, 73);
        window.__stTouch(z.el, 'touchmove', z.x + Math.cos(a) * 60, z.y + Math.sin(a) * 60, 73);
        window.__stSpin(t0 + (want === 'sphere' ? 950 : 90));
        window.__btStaffFeel.tick();
        window.__stTouch(z.el, 'touchend', z.x + Math.cos(a) * 60, z.y + Math.sin(a) * 60, 73);
        return { t0, want };
      }, { m, want });
      const v = await H.waitFor(P, () => window.__btStaffFeel().lastHit, (h) => !!h && h.at >= Date.now() - 2500 && h.gs === (want === 'sphere' ? 2 : 0), { timeout: 3500, label: 'the hit' }).catch(() => null);
      if (v) {
        hit[want] = v;
        hit.claims = await P.page.evaluate((t) => (window.__stLog || []).filter((e) => e.k === 'monster_damage' && e.t >= t), r.t0);
      }
    }
    const tsOf = await P.page.evaluate(() => (window.__stLog || []).filter((e) => e.k === 'player_projectile').map((e) => e.ts));
    const claims = await P.page.evaluate(() => (window.__stLog || []).filter((e) => e.k === 'monster_damage' && !e.special));
    rec.ok('6 A REAL HIT NAMES ITS SHOT: each claim of a gathered bolt carries `sw`, its relay\'s `ts`',
      claims.length > 0 && claims.every((c) => typeof c.sw === 'number' && tsOf.includes(c.sw)), { claims: claims.slice(-4) });
    rec.ok('6 ...AND THE WORKER\'S VERDICT COMES BACK on monster_hit: a sphere\'s stage 2 and full share; a spark\'s stage 0 and a small share',
      !!hit.sphere && hit.sphere.gs === 2 && hit.sphere.pw >= 0.8 && !!hit.spark && hit.spark.gs === 0 && hit.spark.pw > 0 && hit.spark.pw < 0.4, hit);
    const ring = await P.page.evaluate(() => ({ imp: window.__btStaffFeel().lastImpact, n: window.__btStaffFeel().stats.impacts, fx: window.__btWeaponFeelFx ? window.__btWeaponFeelFx().stats : null }));
    rec.ok('6 ...its ring of force drawn where it landed (the worker shoves the snowmen)', ring.n >= 1 && !!ring.imp && ring.fx && ring.fx.pulses > 0, ring);

    /* ── 7 ── the budget */
    const seven = await P.page.evaluate(() => ({ feel: window.__btStaffFeel().cost, fx: window.__btWeaponFeelFx ? window.__btWeaponFeelFx().stats.maxMs : null }));
    rec.ok(`7 THE PAGE'S BUDGET: the feel's own work a frame is at most ${FEEL_MAX_MS} ms (a quarter of held-budget's ${FRAME_JS_MAX_MS} ms frame line, far from its ${HOLD_MAX_MS} ms hold) and ${FEEL_MEAN_MS} ms on average; the feel's layer the same`,
      !!seven.feel && seven.feel.n > 10 && seven.feel.max < FEEL_MAX_MS && seven.feel.mean < FEEL_MEAN_MS && seven.fx != null && seven.fx < FEEL_MAX_MS, seven);
  } finally {
    stop();
    await P.ctx.close().catch(() => {});
  }

  /* ── 8 ── a computer: the left button */
  const C = await H.newPlayer(browser, { name: 'Deskorb', wsPort, webPort, viewport: { width: 1280, height: 800 }, wide: true, world: 'wheel', query: 'manual=default' });
  C.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stopC = H.keepAlive(C);
  try {
    await H.enterWorld(C);
    if (!(await inWheel(C))) rec.ok('8 a computer: in the Wheel (guard)', false);
    else {
      const meC = await H.readState(C, (S) => S.myId);
      const armedC = await H.armWorker(C, wsPort, meC, ['staff']);
      await C.page.waitForTimeout(1500);
      await C.page.evaluate(PAGE_TOOLS);
      await C.page.evaluate(() => { const S = window._gameState.current; S.rpg.activeSlot = 'staff'; S.lockedTarget = null; window.__stWire(); });
      await H.waitFor(C, () => window.__btStaffFeel(), (v) => v.on, { timeout: 15000, label: 'the feel (computer)' }).catch(() => null);
      /* a point on empty ground to the bro's right, clear of anything a click would use */
      const pt = await C.page.evaluate(() => {
        const S = window._gameState.current, cv = document.querySelector('canvas.brotown-canvas').getBoundingClientRect();
        return { x: Math.round(cv.left + (S.player.x + 160 - S.camera.x) * S._worldScaleX), y: Math.round(cv.top + (S.player.y - 10 - S.camera.y) * S._worldScaleY) };
      });
      await C.page.mouse.move(pt.x, pt.y);
      const t0 = await C.page.evaluate(() => Date.now());
      await C.page.mouse.down();
      const held = await C.page.evaluate(() => { const v = window.__btStaffFeel(); return { gathering: v.gathering, moveK: v.moveK }; });
      await C.page.waitForTimeout(700);
      await C.page.mouse.up();
      const b8 = await H.waitFor(C, () => (window.__stLog || []).filter((e) => e.k === 'player_projectile' && !e.special).slice(-1)[0] || null, (v) => !!v && v.t >= t0, { timeout: 8000, label: 'the blast (computer)' }).catch(() => null);
      const aim = await C.page.evaluate(() => ({ ang: window._gameState.current._lastAimAngle, shot: window.__btStaffFeel().lastShot }));
      rec.ok('8 A COMPUTER: the left button held gathers (the bro planted), its release blasts one bolt carrying `ga`, at the cursor (to his right)',
        armedC.includes('staff') && held.gathering && held.moveK < 1 && !!b8 && b8.ga >= 500 && aim.ang != null && Math.abs(aim.ang) < 0.5, { armedC, held, b8, aim });
    }
  } finally {
    stopC();
    await C.ctx.close().catch(() => {});
  }

  /* ── 9 ── `?stafffeel=0`: today's held staff */
  const Q = await H.newPlayer(browser, { name: 'Heldbro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query: 'manual=default&stafffeel=0' });
  Q.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stopQ = H.keepAlive(Q);
  try {
    await H.enterWorld(Q);
    if (!(await inWheel(Q))) rec.ok('9 `?stafffeel=0`: in the Wheel (guard)', false);
    else {
      await Q.page.waitForTimeout(2000);
      await Q.page.evaluate(PAGE_TOOLS);
      await Q.page.evaluate(() => {
        const S = window._gameState.current, R = S.rpg;
        R.staffWeapon = { type: 'staff', tierMult: 1, gearBase: 'pine', name: 'Pine Staff', tier: 'common' };
        R.activeSlot = 'staff'; S.lockedTarget = null; window.__stWire();
      });
      const t0 = await Q.page.evaluate(() => { const z = window.__stZone(); const t = Date.now(); window.__stTouch(z.el, 'touchstart', z.x, z.y, 74); window.__stTouch(z.el, 'touchmove', z.x + 40, z.y, 74); return t; });
      await Q.page.waitForTimeout(2600);
      await Q.page.evaluate(() => { const z = window.__stZone(); window.__stTouch(z.el, 'touchend', z.x + 40, z.y, 74); });
      const v = await Q.page.evaluate(() => window.__btStaffFeel());
      const held = await bolts(Q, t0);
      rec.ok('9 `?stafffeel=0` on one phone: today\'s held staff -- bolts while the thumb is held, none carrying a gather; no feel',
        !v.on && !v.wanted && !v.gathering && held.length >= 1 && held.every((b) => b.ga === undefined), { v: { on: v.on, wanted: v.wanted }, held });
    }
  } finally {
    stopQ();
    await Q.ctx.close().catch(() => {});
  }
  rec.ok('10 no page errors', errors.length === 0, errors);
}
