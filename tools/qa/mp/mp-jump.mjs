/* ═══ JUMPING (v2.3.3014) ═══
 *
 * Owner, 2026-10-03: "start working on real jumping.  Might be able to just
 * use the jog directions instead of a custom jump animation", its button
 * "beneath the right joystick".
 *
 * game/jump.js's rules are pinned in node (tools/world/test-world-core.mjs
 * "jumping").  This is the half only a real client can show, in the Wheel, on
 * a phone-sized TOUCH page against a real worker:
 *   1. the JUMP button is centred under the attack disc, 44 px or more, clear
 *      of the disc, the dashboard and every other control, its word inside --
 *      upright and sideways;
 *   2. a press lifts the body by the jump's height and holds the jog's leaping
 *      frame for the way it faces, while the feet the depth pass and the
 *      shadows read stay on the ground (the shadow's pivot does not rise);
 *      no step is heard in the air, one at take-off and one at touch-down,
 *      and the touch-down raises dust;
 *   3. in the air a second press, a roll and an attack all wait;
 *   4. another player sees it: the relay lands and their copy of you is
 *      lifted;
 *   5. walking into a fence stops you; jumping it carries you over, and you
 *      come down clear of it;
 *   6. a tree's trunk stops you in the air as on the ground;
 *   7. in the water there is no button and no jump;
 *   8. no page errors.
 * The test machine draws a frame every ~200 ms and the game's clock runs slow
 * below 20 fps (BroTown's 3-frame cap), so a 560 ms jump is three frames
 * here: the player's page is opened with `?jumpms=1800`, the same jump made
 * long enough to watch.  Pictures: tools/qa/mp/out/jump-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const SIDEWAYS = { width: 844, height: 390 };
const AIR_MS = 1800;      /* ?jumpms= */
const PEAK = 34;          /* JUMP_PEAK (game/jump.js) */
const HS = 10;            /* the walk box's half-width (hs in BroTown.jsx) */
const FRAME = { east: 1, north: 8, northeast: 4, south: 7, southwest: 6 };   /* JUMP_FRAME */
const OVER = ['fence'];   /* a long straight one, easiest to cross square-on */
const TREES = ['oak', 'pine', 'birch', 'orchard'];

/* the button, the attack disc, and every other control that could share the
   corner: small fixed boxes over the world, drawn */
const LAYOUT = (P) => P.page.evaluate(() => {
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
  const btn = document.querySelector('[data-jump]');
  const disc = document.querySelector('[data-disc="R"]');
  const lab = btn && btn.querySelector('[data-jump-label]');
  const dashH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dash-h')) || 0;
  const others = [];
  if (btn) {
    for (const el of document.querySelectorAll('body *')) {
      if (el === btn || btn.contains(el) || el.contains(btn)) continue;
      if (el.closest('[data-joyzone]') || el.closest('[data-disc]')) continue;
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05 || cs.pointerEvents === 'none') continue;
      const b = el.getBoundingClientRect();
      if (b.width < 20 || b.height < 20 || b.width > 160 || b.height > 160) continue;
      others.push({ cls: String(el.className || '').slice(0, 40), aria: el.getAttribute('aria-label'), ...r(el) });
    }
  }
  return { btn: r(btn), disc: r(disc), label: r(lab), vw: innerWidth, vh: innerHeight, dashH, others };
});
const overlap = (a, b) => !!a && !!b && a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;

/* a finger on the button: the press is the jump (JumpButton jumps on touchstart) */
const press = (P) => P.page.evaluate(() => {
  const btn = document.querySelector('[data-jump]');
  if (!btn) return false;
  const b = btn.getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2;
  const mk = (t) => new TouchEvent(t, { bubbles: true, cancelable: true,
    touches: t === 'touchend' ? [] : [new Touch({ identifier: 41, target: btn, clientX: x, clientY: y })],
    changedTouches: [new Touch({ identifier: 41, target: btn, clientX: x, clientY: y })] });
  btn.dispatchEvent(mk('touchstart'));
  btn.dispatchEvent(mk('touchend'));
  return true;
});

const steps = (P) => P.page.evaluate(() => {
  const c = (window.BT_AUDIO && window.BT_AUDIO._stepCounts) || {};
  let n = 0; for (const k in c) n += c[k];
  return n;
});

/* the walk test's footprints (Wheel objects) round the player */
const blockers = (P) => P.page.evaluate(() => (window.__btWheelObjects ? window.__btWheelObjects.blockers() : []));

/* worker-agreed walking (mp-wheelnodes travel): hops of 100 px, stepped back
   to where the worker has you if it falls behind */
async function travel(P, wsPort, myId, tx, ty) {
  const tEnd = Date.now() + 90000;
  for (let leg = 0; leg < 300 && Date.now() < tEnd; leg++) {
    const a = await H.adminPlayer(wsPort, myId).catch(() => null);
    const L = (a && a.live) || {};
    const c = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    if (typeof L.x === 'number' && Math.hypot(L.x - c.x, L.y - c.y) > 60) {
      await P.page.evaluate(({ x, y }) => { const S = window._gameState.current; S.player.x = x; S.player.y = y; S.player.vx = 0; S.player.vy = 0; }, { x: L.x, y: L.y });
      await P.page.waitForTimeout(500);
      continue;
    }
    if (Math.hypot(tx - c.x, ty - c.y) < 6) return true;
    await H.hopTo(P, tx, ty, { tries: 4 });
  }
  return false;
}

/* hold a key and sample the feet until `until` or ms */
async function walk(P, key, ms, until, mid) {
  const out = [];
  const t0 = Date.now();
  await P.page.keyboard.down(key);
  while (Date.now() - t0 < ms) {
    const s = await P.page.evaluate(() => {
      const S = window._gameState.current, g = window.__btPlayerGround ? window.__btPlayerGround() : null;
      const fx = window.__btJumpFx ? window.__btJumpFx().self : null;
      return { x: S.player.x, y: S.player.y, fy: g ? g.y : null, air: !!(window.__btJumpBtn && window.__btJumpBtn().air), lift: fx ? fx.lift : 0 };
    });
    out.push(s);
    if (mid) await mid(out);
    if (until && until(out)) break;
    await P.page.waitForTimeout(60);
  }
  await P.page.keyboard.up(key);
  return out;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (Q, name, clip) => Q.page.screenshot({ path: join(OUT, `jump-${name}.png`), clip }).catch(() => {});
  const P = await H.newPlayer(browser, { name: 'Jumper', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel', query: `jumpms=${AIR_MS}` });
  const Q = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, viewport: PHONE, guest: true, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push('P ' + String((e && e.message) || e).slice(0, 200)));
  Q.page.on('pageerror', (e) => errors.push('Q ' + String((e && e.message) || e).slice(0, 200)));
  try {
    await body({ P, Q, wsPort, rec, shot, errors });
  } finally {
    await P.ctx.close().catch(() => {});
    await Q.ctx.close().catch(() => {});
  }
}

async function body({ P, Q, wsPort, rec, shot, errors }) {
  await H.enterWorld(P);
  await H.enterWorld(Q);
  for (const X of [P, Q]) await X.page.evaluate(() => { window.__btProbe = true; });
  const inWheel = async (X) => H.waitFor(X, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
    { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
  const pw = await inWheel(P), qw = await inWheel(Q);
  rec.ok('both players are in the Wheel (guard)', !!pw && !!qw, { pw, qw });
  if (!pw || !qw) return;
  const myId = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 20 });
  await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
  await P.page.waitForTimeout(1500);

  /* ── 1. where the button is ── */
  const L1 = await LAYOUT(P);
  const lay = (L) => {
    if (!L.btn || !L.disc) return { ok: false, why: 'no button or disc', L };
    const cx = (L.btn.l + L.btn.r) / 2, dcx = (L.disc.l + L.disc.r) / 2;
    const hits = L.others.filter((o) => overlap(L.btn, o));
    const bandTop = L.vh - L.dashH;
    const inside = !!L.label && L.label.l >= L.btn.l && L.label.r <= L.btn.r && L.label.t >= L.btn.t && L.label.b <= L.btn.b;
    return {
      ok: L.btn.w >= 44 && L.btn.h >= 44 && Math.abs(cx - dcx) <= 2 && L.btn.t >= L.disc.b + 2 && L.btn.b <= bandTop - 8 && hits.length === 0 && inside,
      size: Math.round(L.btn.w), centreOff: +(cx - dcx).toFixed(1), belowDisc: Math.round(L.btn.t - L.disc.b), aboveBand: Math.round(bandTop - L.btn.b),
      hits, inside,
    };
  };
  const l1 = lay(L1);
  rec.ok(`upright, JUMP is centred under the attack disc (${l1.centreOff} px), ${l1.belowDisc} px below it and ${l1.aboveBand} px above the dashboard, ${l1.size} px, on no other control, its word inside`, l1.ok, l1);
  if (L1.btn) await shot(P, 'layout', { x: Math.max(0, L1.btn.l - 120), y: Math.max(0, L1.disc ? L1.disc.t - 20 : L1.btn.t - 160), width: 250, height: Math.min(380, L1.vh - Math.max(0, L1.disc ? L1.disc.t - 20 : L1.btn.t - 160)) });

  /* ── 2. a jump, where both players arrived ──
     Recorded by each page itself, every frame (its frames are ~200 ms
     apart here; a sample taken from outside misses the top of the jump and
     the relay's arrival), then read back. */
  const before = await P.page.evaluate(() => {
    const S = window._gameState.current, g = window.__btPlayerGround();
    return { x: S.player.x, y: S.player.y, groundY: g.y, feetDy: g.y - S.player.y };
  });
  const RECORD = (X, peerId) => X.page.evaluate((peerId) => {
    window.__qaRec = []; window.__qaRecOn = true;
    const steps = () => { const c = (window.BT_AUDIO && window.BT_AUDIO._stepCounts) || {}; let n = 0; for (const k in c) n += c[k]; return n; };
    const f = () => {
      if (!window.__qaRecOn) return;
      try {
        const S = window._gameState.current;
        const fx = window.__btJumpFx ? window.__btJumpFx() : null;
        const g = window.__btPlayerGround ? window.__btPlayerGround() : null;
        const lf = window.__btLightFx ? window.__btLightFx.probe() : null;
        const sh = lf && lf.shadows && lf.shadows.self;
        const o = peerId && S.others ? S.others[peerId] : null;
        window.__qaRec.push({ t: Date.now(), air: !!(window.__btJumpBtn && window.__btJumpBtn().air), self: fx && fx.self ? { ...fx.self } : null,
          peers: fx ? fx.peers : 0, groundY: g ? g.y : null, py: S.player.y, shadowPy: sh ? sh.py : null, lightOn: !!(lf && lf.on),
          peerJump: !!(o && o._jump), steps: steps(), dust: window.__btWorldFx ? window.__btWorldFx().landDust : null });
      } catch (e) { /* a frame's trouble is its own */ }
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  }, peerId || null);
  const STOP = (X) => X.page.evaluate(() => { window.__qaRecOn = false; return window.__qaRec || []; });
  await RECORD(P, null);
  await RECORD(Q, myId);
  const t0 = Date.now();
  const pressed = await press(P);
  /* a picture near the top: AIR_MS/2 in, give or take a frame */
  await P.page.waitForTimeout(Math.max(0, AIR_MS / 2 - 250));
  const clip = await P.page.evaluate(() => {
    const S = window._gameState.current, cv = document.querySelector('canvas'), rc = cv.getBoundingClientRect();
    const sx = rc.left + (S.player.x - S.camera.x) * (S._worldScaleX || 1), sy = rc.top + (S.player.y - S.camera.y) * (S._worldScaleY || 1);
    return { x: Math.max(0, sx - 100), y: Math.max(0, sy - 120), width: 200, height: 200 };
  });
  await shot(P, 'air', clip);
  await H.waitFor(P, () => window.__btJumpBtn().air, (v) => v === false, { timeout: AIR_MS + 4000, label: 'down again' }).catch(() => null);
  await P.page.waitForTimeout(700);
  const recP = await STOP(P), recQ = await STOP(Q);
  const airS = recP.filter((r) => r.self && r.t >= t0);
  const maxLift = Math.max(0, ...airS.map((r) => r.self.lift));
  rec.ok(`a press takes off: in the air ${airS.length} frames, the body lifted ${maxLift.toFixed(1)} px at the most (the peak is ${PEAK})`,
    pressed && airS.length >= 4 && maxLift > PEAK * 0.85 && maxLift <= PEAK + 0.01, { pressed, n: airS.length, lifts: airS.map((r) => r.self.lift) });
  const poses = [...new Set(airS.map((r) => `${r.self.pose}/${r.self.dir}/${r.self.frame}`))];
  rec.ok(`...holding the jog's leaping frame for the way he faces (${poses.join(', ')})`,
    airS.length > 0 && airS.every((r) => r.self.pose === 'jog' && r.self.frame === FRAME[r.self.dir]), poses);
  /* the feet, from his position, all through the air: one number (the
     leaping frame's own drop -- a few px off standing's, as the jog's is)
     while the lift runs from nothing to the peak */
  const offs = airS.map((r) => r.groundY - r.py), lifts = airS.map((r) => r.self.lift);
  const drift = offs.length ? Math.max(...offs) - Math.min(...offs) : Infinity;
  const liftSpan = lifts.length ? Math.max(...lifts) - Math.min(...lifts) : 0;
  rec.ok(`...while the feet the depth pass reads stay on the ground: ${drift.toFixed(2)} px of play under a lift that ran ${liftSpan.toFixed(1)} px`,
    airS.length >= 2 && drift < 1 && liftSpan > 15, { offs, lifts, standing: before.feetDy });
  const lit = airS.filter((r) => r.lightOn && r.shadowPy != null);
  if (lit.length) {
    const sd = Math.max(...lit.map((r) => Math.abs(r.shadowPy - r.groundY)));
    rec.ok(`...and his shadow is cast from the ground under him, not from the air (pivot off by ${sd.toFixed(2)} px over ${lit.length} frames)`, sd < 1.5, { sd });
  }
  const preSteps = recP.filter((r) => r.t < t0).map((r) => r.steps);
  const st0 = preSteps.length ? preSteps[preSteps.length - 1] : (recP[0] ? recP[0].steps : 0);
  const airSteps = [...new Set(airS.filter((r) => r.t > t0 + 300).map((r) => r.steps))];
  const stEnd = recP.length ? recP[recP.length - 1].steps : null;
  rec.ok(`...and lands: one step to take off and one to come down, none in the air (${st0} -> [${airSteps.join(',')}] -> ${stEnd})`,
    airSteps.length === 1 && airSteps[0] === st0 + 1 && stEnd === st0 + 2, { st0, airSteps, stEnd });
  const dust = recP.length ? recP[recP.length - 1].dust : null;
  rec.ok('...with a ring of dust where he came down', !!dust && dust.n >= 6 && dust.at > 0, dust);
  const qHas = recQ.some((r) => r.peerJump), qLift = recQ.some((r) => r.peers >= 1);
  rec.ok(`another player sees it: the relay lands and their copy of him is lifted (${recQ.filter((r) => r.peers >= 1).length} of their frames)`, qHas && qLift, { frames: recQ.length, qHas, qLift });

  /* ── 3. in the air, the rest waits ──
     take off, and in the SAME turn of the page (its frames are ~200 ms
     apart here) press again, roll (Space) and tap the attack zone */
  await P.page.waitForTimeout(400);
  const waited = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const tap = (el, id, fx, fy) => {
      const b = el.getBoundingClientRect(), x = b.left + b.width * fx, y = b.top + b.height * fy;
      const mk = (t) => new TouchEvent(t, { bubbles: true, cancelable: true,
        touches: t === 'touchend' ? [] : [new Touch({ identifier: id, target: el, clientX: x, clientY: y })],
        changedTouches: [new Touch({ identifier: id, target: el, clientX: x, clientY: y })] });
      el.dispatchEvent(mk('touchstart')); el.dispatchEvent(mk('touchend'));
    };
    const btn = document.querySelector('[data-jump]');
    tap(btn, 41, 0.5, 0.5);
    const midAir = { air: window.__btJumpBtn().air, count: window.__btJumpBtn().count, swing: S.swingTimer || 0 };
    tap(btn, 42, 0.5, 0.5);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', key: ' ', bubbles: true }));
    const z = document.querySelector('[data-joyzone="R"]');
    if (z) tap(z, 52, 0.5, 0.4);
    return { midAir, air: window.__btJumpBtn().air, count: window.__btJumpBtn().count, why: window.__btJumpBtn().why, roll: !!S._dodgeRoll, swing: S.swingTimer || 0 };
  });
  await P.page.waitForTimeout(300);
  const later = await P.page.evaluate(() => ({ roll: !!window._gameState.current._dodgeRoll, swing: window._gameState.current.swingTimer || 0, air: window.__btJumpBtn().air }));
  rec.ok('in the air a second press, a roll and an attack all wait',
    waited.midAir.air && waited.air && waited.count === waited.midAir.count && waited.why === 'airborne' && !waited.roll && !later.roll
      && waited.swing === waited.midAir.swing && (later.swing === waited.midAir.swing || !later.air),
    { waited, later });
  await H.waitFor(P, () => window.__btJumpBtn().air, (v) => v === false, { timeout: AIR_MS + 3000, label: 'down again' }).catch(() => null);
  /* the attack zone's tap may have left a held attack or an aim: let go */
  await P.page.evaluate(() => { const S = window._gameState.current; S.autoAttack = false; S._aiming = false; S.isSwinging = false; S.stickX = 0; S.stickY = 0; });
  console.log('    (section 3 done)');

  /* ── 5. a fence: stopped walking, cleared jumping ── */
  await P.page.evaluate(() => { window._gameState.current.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } }); });
  await P.page.waitForTimeout(800);
  const fence = await findLane(P, wsPort, myId, OVER, 'south');
  rec.ok(`a fence with clear ground both sides to cross (guard)`, !!fence, fence ? { id: fence.b.id, box: fence.b } : null);
  if (fence) {
    const b = fence.b, x = fence.x, feetDy = fence.feetDy;
    /* 1: walking into it from the north stops the feet at its edge */
    await travel(P, wsPort, myId, x, b.y0 - 60 - feetDy);
    await P.page.waitForTimeout(500);
    const w1 = await walk(P, 's', 5000, (o) => o.length > 6 && Math.abs(o[o.length - 1].y - o[o.length - 4].y) < 0.3);
    const f1 = w1.length ? w1[w1.length - 1].y + feetDy : null;
    rec.ok(`walking into the fence stops the feet at it (${f1 != null ? (f1 + HS - b.y0).toFixed(1) : '?'} px into it)`, f1 != null && f1 + HS <= b.y0 + 1.5, { f1, top: b.y0 });
    await shot(P, 'fence-stopped');
    /* 2: the same walk with a jump carries him over, and down clear of it */
    let jumped = false;
    const w2 = await walk(P, 's', AIR_MS + 4000, (o) => jumped && !o[o.length - 1].air && o.length > 4 && (o[o.length - 1].y + feetDy) > b.y1 + HS + 4,
      async (o) => {
        if (!jumped) { jumped = true; await press(P); }
        const last = o[o.length - 1];
        if (last.air && last.lift > PEAK * 0.6 && !o._pic) { o._pic = true; await shot(P, 'fence-over'); }
      });
    const fEnd = w2.length ? w2[w2.length - 1].y + feetDy : null;
    const landedIn = await P.page.evaluate(({ h }) => {
      const S = window._gameState.current, g = window.__btPlayerGround();
      const fy = g.y, x = S.player.x;
      const bx = window.__btWheelObjects.blockers();
      return bx.filter((b) => x + h > b.x0 && x - h < b.x1 && fy + h > b.y0 && fy - h < b.y1).map((b) => b.id);
    }, { h: HS });
    rec.ok(`jumping the fence carries him over it, and he comes down clear of it (feet ${fEnd != null ? (fEnd - HS - b.y1).toFixed(1) : '?'} px past)`,
      fEnd != null && fEnd - HS >= b.y1 && landedIn.length === 0, { fEnd, bottom: b.y1, landedIn, n: w2.length });
    await shot(P, 'fence-over-landed');
  }

  /* ── 6. a tree's trunk stops a jump ── */
  const tree = await findLane(P, wsPort, myId, TREES, 'north');
  rec.ok('a tree with clear ground south of it (guard)', !!tree, tree ? { id: tree.b.id } : null);
  if (tree) {
    const b = tree.b, feetDy = tree.feetDy;
    await travel(P, wsPort, myId, tree.x, b.y1 + 50 - feetDy);
    await P.page.waitForTimeout(500);
    let jumped = false;
    const w3 = await walk(P, 'w', AIR_MS + 2500, (o) => jumped && !o[o.length - 1].air && o.length > 6,
      async () => { if (!jumped) { jumped = true; await press(P); } });
    const minFeet = Math.min(...w3.map((s) => s.y + feetDy));
    rec.ok(`a tree's trunk stops him in the air as on the ground (${b.id}; feet ${(b.y1 - (minFeet - HS)).toFixed(1)} px into it at the most)`,
      w3.some((s) => s.air) && minFeet - HS >= b.y1 - 1.5, { minFeet, bottom: b.y1 });
  }

  /* ── 7. in the water: no button, no jump ── */
  const wet = await P.page.evaluate(() => {
    const S = window._gameState.current, p = S.player;
    let best = null, d = Infinity;
    for (const n of S.gatherNodes || []) {
      if (n.nodeType !== 'fishSpot') continue;
      const dd = Math.hypot(n.x - p.x, n.y - p.y);
      if (dd < d) { d = dd; best = { x: n.x, y: n.y }; }
    }
    return best;
  });
  if (wet) {
    const feetDy = await P.page.evaluate(() => { const S = window._gameState.current; return window.__btPlayerGround().y - S.player.y; });
    await travel(P, wsPort, myId, wet.x + 52, wet.y - 43);
    await P.page.evaluate(({ x, y }) => { const S = window._gameState.current; S.player.x = x; S.player.y = y; S.player.vx = 0; S.player.vy = 0; },
      { x: wet.x - 50, y: wet.y + 10 - feetDy });
    const sw = await H.waitFor(P, (S) => !!(S._wheelSwim && S._wheelSwim.on), (v) => v === true, { timeout: 6000, label: 'swimming' }).catch(() => false);
    await P.page.waitForTimeout(400);
    const c0 = await P.page.evaluate(() => window.__btJumpBtn().count);
    await P.page.keyboard.press('x');
    await P.page.waitForTimeout(200);
    const inWater = await P.page.evaluate(() => ({ btn: window.__btJumpBtn(), shown: !!document.querySelector('[data-jump]') }));
    rec.ok('in the water there is no JUMP button, and X does nothing ("swimming")', sw === true && !inWater.shown && !inWater.btn.shown && inWater.btn.count === c0 && inWater.btn.why === 'swimming', { sw, inWater });
  }

  /* ── X on a keyboard, on dry ground ── */
  {
    const c0 = await P.page.evaluate(() => window.__btJumpBtn().count);
    await travel(P, wsPort, myId, before.x, before.y);
    await P.page.waitForTimeout(800);
    await P.page.keyboard.press('x');
    const kx = await H.waitFor(P, () => window.__btJumpBtn(), (v) => v.air === true, { timeout: 3000, label: 'X' }).catch(() => null);
    rec.ok('X on a keyboard jumps too', !!kx && kx.count === c0 + 1, kx);
    await H.waitFor(P, () => window.__btJumpBtn().air, (v) => v === false, { timeout: AIR_MS + 3000, label: 'down' }).catch(() => null);
  }

  /* ── 1b. sideways ── */
  await P.page.setViewportSize(SIDEWAYS);
  await P.page.waitForTimeout(1500);
  const l2 = lay(await LAYOUT(P));
  rec.ok(`sideways too: centred under the disc (${l2.centreOff} px), ${l2.belowDisc} px below it, ${l2.aboveBand} px above the dashboard, ${l2.size} px, on nothing`, l2.ok, l2);
  await P.page.setViewportSize(PHONE);

  rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
}

/* A footprint of one of `ids` near the arrival with clear, walkable ground
   on the side `from` (and past it, for a crossing): the lane down its middle,
   ~100 px either way, touches no other footprint and no water.  Looked for
   in rings round the arrival, going out to each candidate. */
async function findLane(P, wsPort, myId, ids, from) {
  const tStop = Date.now() + 240000;
  const home = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
  const feetDy = await P.page.evaluate(() => { const S = window._gameState.current; return window.__btPlayerGround().y - S.player.y; });
  const cands = await P.page.evaluate(({ x, y, ids }) => (window.__btWheelObjects.near(x, y, 2600) || [])
    .filter((o) => ids.includes(o.id)).map((o) => ({ ...o, d: Math.hypot(o.x - x, o.y - y) }))
    .sort((a, b) => a.d - b.d).slice(0, 14), { x: home.x, y: home.y, ids });
  console.log(`    ${ids.join('/')}: ${cands.length} near (${cands.slice(0, 5).map((c) => Math.round(c.d)).join(', ')} px)`);
  for (const c of cands) {
    if (Date.now() > tStop) { console.log('      out of time looking'); break; }
    const got = await travel(P, wsPort, myId, c.x, c.y - (from === 'south' ? 160 : -170) - feetDy);
    if (!got) { console.log(`      ${c.id} at ${Math.round(c.d)} px: could not get there`); continue; }
    await P.page.waitForTimeout(700);
    const pick = await P.page.evaluate(({ c, from, h, feetDy, ids }) => {
      const bx = window.__btWheelObjects.blockers();
      const mine = bx.filter((b) => b.oi === c.i && ids.includes(b.id));
      if (!mine.length) return null;
      /* the widest box of it (a fence is one long box; a tree its trunk) */
      const b = mine.sort((p, q) => (q.x1 - q.x0) - (p.x1 - p.x0))[0];
      const x = (b.x0 + b.x1) / 2;
      const y0 = from === 'south' ? b.y0 - 110 : b.y1 + 2, y1 = from === 'south' ? b.y1 + 110 : b.y1 + 110;
      for (const o of bx) {
        if (o === b || o.oi === b.oi) continue;
        if (x + h + 6 > o.x0 && x - h - 6 < o.x1 && y1 > o.y0 && y0 < o.y1) return null;
      }
      for (let fy = y0; fy <= y1; fy += 8) {
        if (fy > b.y0 - h && fy < b.y1 + h) continue;
        if (window.__btIsSolid(x, fy - feetDy)) return null;
        const at = window.__btSwimAt ? window.__btSwimAt(x, fy) : null;
        if (at && at.water) return null;
      }
      /* nothing living in the lane either */
      const S = window._gameState.current;
      if ((S.npcs || []).some((n) => Math.abs(n.x - x) < 60 && n.y + 50 > y0 - 40 && n.y < y1 + 40)) return null;
      return { b: { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1, id: b.id, oi: b.oi }, x };
    }, { c, from, h: HS, feetDy, ids });
    console.log(`      ${c.id} at ${Math.round(c.d)} px: ${pick ? 'clear lane' : 'no clear lane'}`);
    if (pick) return { ...pick, feetDy };
  }
  return null;
}
