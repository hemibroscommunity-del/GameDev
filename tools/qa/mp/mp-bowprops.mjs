/* ═══ THE BOW SHOOTS PROPS, BUILDINGS INCLUDED (v2.3.3206) ═══
 *
 * Owner: "Make the bow able to shoot at any props including buildings".
 *
 * The arrow already stopped at a prop and the Wheel's objects already took
 * arrows (v2.3.2730, v2.3.2995) -- mp-wheelbreak proves that with arrows it
 * puts in the air itself.  What a PLAYER could not do was shoot one: the bow
 * looses only when its line is ON something (v2.3.2473), and that gate asked
 * about monsters alone.  Measured on main, a bow held on the Town Hall from
 * 70 px, from point blank, and on a bench level with you: no arrow, the line
 * drawn straight through.  And the arrow's own prop test ran 52 px above the
 * boots (the body's centre), so point blank it started INSIDE the Town Hall's
 * footprint and would have flown through it anyway.
 *
 * So every shot here is a REAL one: the bow in hand, the attack HELD and aimed
 * the way the right stick aims it (S._aiming / _aimAngle), the game's own fire
 * gate deciding, the game's own arrows flying.  On a phone in the Wheel's
 * BroTown, against a real worker:
 *   A. CONTROL: aimed where no prop stands in reach -- no arrow, no target
 *      (the gate still waits for something);
 *   B. the Town Hall from 120 px: the gate reads the HALL, the drawn line
 *      stops at its face, arrows go, the hall takes them (wheelBreak) and one
 *      stays in its wall where it flew;
 *   C. the Town Hall POINT BLANK (boots 14 px off its face): the same --
 *      main's arrow started inside its footprint;
 *   D. a monster in front of the hall is still the target, not the wall;
 *   I. a LOW thing (a bench, a barrel, a fence: what you can jump) in front
 *      of something tall: the arrows fly OVER it -- the owner, asked: "I want
 *      arrows to fly over low things" -- and the tall thing takes them, the
 *      low one none;
 *   K. ...and the staff's bolts the same;
 *   J. a monster behind a bench: the gate reads the MONSTER, it takes the
 *      arrows, the bench none;
 *   E. the same bench with nothing else on the line, LEVEL with you (boots on
 *      its base line): it is what the bow is aimed at, so the gate reads it,
 *      the arrow stays IN its picture, not in the air over it, and three
 *      arrows break it -- after which the line has nothing on it and the bow
 *      stops;
 *   F. a tree's trunk from the side, level with it: it takes the arrows (the
 *      old track ran 52 px behind it);
 *   H. the Town Hall 460 px off to the side, past the screen's edge where an
 *      arrow comes down, is not a target: the bow does not fire;
 *   G. no page errors.
 * Pictures in tools/qa/mp/out/bowprops-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const WHEELISH = (z) => z === 'wheel';
/* Mended after a minute, not three: E breaks a bench and the run must not
   find it gone (or back) at the wrong moment */
const REPAIR_MS = 60000;

/* The Wheel's objects near the player whose footprint is in the walk test now
   (so a shot can meet them), nearest first: { oi, id, x, y, w, h, box, d }. */
const objectsNear = (P, r = 1600) => P.page.evaluate((r) => {
  const S = window._gameState.current, W = window.__btWheelObjects;
  const boxes = W.blockers();
  const out = [];
  for (const o of W.near(S.player.x, S.player.y, r)) {
    if (!o.ready) continue;
    const box = boxes.find((b) => b.oi === o.i);
    if (!box) continue;
    out.push({ oi: o.i, id: o.id, x: o.x, y: o.y, w: o.w, h: o.h, box, d: Math.hypot(o.x - S.player.x, o.y - S.player.y) });
  }
  return out.sort((a, b) => a.d - b.d);
}, r);

/* Your boots are this far below your position (the body's centre). */
const bootsDy = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, g = window.__btPlayerGround ? window.__btPlayerGround() : null;
  return g ? g.y - S.player.y : 52;
});

/* A bow in hand, the attack let go, every shot the game fires counted (its
   broadcast to the other players: one a shot). */
const armBow = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, R = S.rpg, F = window._gameFns || {};
  const t = ((F.WOODWORKING_TIERS || {}).pine) || { tierMult: 1 };
  R.rangedWeapon = { type: 'bow', tierMult: t.tierMult, gearBase: 'pine', name: 'Pine Bow', tier: 'common' };
  R.activeSlot = 'ranged';
  S.lockedTarget = null;
  S.autoAttack = false;
  window.__qaShots = 0;
  const ch = S.channel;
  if (ch && !ch.__qaCounted) {
    const send = ch.send.bind(ch);
    ch.send = (m) => { try { if (m && m.event === 'player_projectile') window.__qaShots++; } catch (e) { /* counting only */ } return send(m); };
    ch.__qaCounted = true;
  }
  return { slot: R.activeSlot, wpn: R.rangedWeapon.type };
});

/* HOLD the attack aimed along `ang` for `ms`.  The gate and the drawn line
   are read together in one frame partway through (mp-bowgate's rule: two
   reads are two frames), and every arrow mark on object `oi` is watched the
   whole time -- a broken object takes its marks with it.  `until`, when
   given: let go as soon as object `oi` has taken that many hits (a staff bolt
   flies 5 px a tick, and on a page drawing two frames a second it needs
   seconds to cross 150 px). */
const hold = (P, ang, ms, oi, until = 0) => P.page.evaluate(({ ang, ms, oi, until }) => new Promise((resolve) => {
  const S = window._gameState.current, B = window.__btWheelBreak;
  window.__qaShots = 0;
  S.arrows = []; S.swingTimer = 0; S.lockedTarget = null;
  S._aimAngle = ang; S._aiming = true; S._lastAimAngle = ang; S.autoAttack = true;
  const d0 = oi != null ? B.damage(oi) : 0, b0 = B.stats.breaks, h0 = B.stats.hits;
  const hp = oi != null && B.kind(oi) ? B.kind(oi).hp : null;
  const t0 = performance.now();
  let gate = null, beam = null, firstMark = null, shotsAtBreak = null, hitsAtBreak = null, brokeAt = null;
  const marksOn = () => (window.__btPropMarks ? window.__btPropMarks() : [])
    .filter((m) => oi != null && m.kind === 'arrow' && (m.key === 'wobj:' + oi + ':front' || m.key === 'wobj:' + oi + ':back'));
  const tick = () => {
    const t = performance.now() - t0;
    if (!gate && t > 250) {
      const g = S._bowSight;
      const b = window.__btSightBeam ? window.__btSightBeam() : null;
      gate = g ? { d: g.d, id: g.id } : { none: true };
      beam = b ? { visible: b.visible, clipped: b.clipped, len: b.len, sightD: b.sightD } : null;
    }
    if (!firstMark) { const m = marksOn(); if (m.length) firstMark = m[0]; }
    if (brokeAt == null && B.stats.breaks !== b0) { brokeAt = t; shotsAtBreak = window.__qaShots; hitsAtBreak = B.stats.hits - h0; }
    if (t >= ms || (until > 0 && oi != null && B.damage(oi) - d0 >= until)) {
      const shots = window.__qaShots;
      S.autoAttack = false; S._aiming = false;
      resolve({ shots, gate, beam, firstMark, damage: oi != null ? B.damage(oi) - d0 : null,
        broke: B.stats.breaks !== b0, brokeAt, shotsAtBreak, hitsAtBreak, hp, marks: marksOn().length });
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}), { ang, ms, oi, until });

/* Put your BOOTS at (x, y). */
/* Put your BOOTS at (x, y), and wait for the camera to come round to you:
   a plain arrow comes down at the screen's edge, so the bow's sight looks only
   that far (monsterCombat _viewEdgeDist), and on a page drawing a few frames a
   second the camera trails a long hop by hundreds of px. */
const bootsAt = async (P, x, y, dy) => {
  await H.hopTo(P, x, y - dy, { tries: 80 });
  await P.page.waitForTimeout(600);
  for (let i = 0; i < 40; i++) {
    const off = await P.page.evaluate(() => {
      const S = window._gameState.current;
      if (!S.camera || !(S._viewW > 0)) return 0;
      return Math.abs(S.camera.x + S._viewW / 2 - S.player.x);   /* across: the side shots (E, F, H) */
    });
    if (off < 40) break;
    await P.page.waitForTimeout(250);
  }
  return P.page.evaluate(() => { const S = window._gameState.current; const g = window.__btPlayerGround(); return { x: S.player.x, y: S.player.y, boots: g }; });
};

/* What the ground line from your boots along `ang` meets first within
   `len`: the object number, or null.  The game's own sweep (worldProps
   sweepBlockPoint), so a scenario never asserts its own geometry. */
const firstOnLine = (P, ang, len) => P.page.evaluate(({ ang, len }) => {
  const S = window._gameState.current, g = window.__btPlayerGround();
  const r = window.__btSweepBlockPoint(S.currentZone, g.x, g.y, g.x + Math.cos(ang) * len, g.y + Math.sin(ang) * len);
  return r ? (r.box && r.box.oi != null ? r.box.oi : -1) : null;
}, { ang, len });

/* Is the ground line from your boots along `ang` clear of every footprint
   for `len`?  The game's own sweep (worldProps sweepBlockPoint). */
const lineClear = (P, ang, len) => P.page.evaluate(({ ang, len }) => {
  const S = window._gameState.current, g = window.__btPlayerGround();
  return !window.__btSweepBlockPoint(S.currentZone, g.x, g.y, g.x + Math.cos(ang) * len, g.y + Math.sin(ang) * len);
}, { ang, len });

/* What a GAME shot's ground line from your boots along `ang` meets within
   `len`: `stop`, the first thing it stops at, flying over the low things
   (projectiles.js shotSkip), and `low`, the first low thing on it -- object
   numbers (-1 for a footprint that is not one of the Wheel's objects), with
   how far.  The game's own sweep and its own test of what is low. */
const lineFacts = (P, ang, len) => P.page.evaluate(({ ang, len }) => {
  const S = window._gameState.current, g = window.__btPlayerGround();
  const x1 = g.x + Math.cos(ang) * len, y1 = g.y + Math.sin(ang) * len;
  const over = (b) => window.__btShotFliesOver(b, null);
  const st = window.__btSweepBlockPoint(S.currentZone, g.x, g.y, x1, y1, over);
  const lo = window.__btSweepBlockPoint(S.currentZone, g.x, g.y, x1, y1, (b) => !over(b));
  const key = (r) => (r ? (r.box && r.box.oi != null ? r.box.oi : -1) : null);
  return { stop: key(st), stopD: st ? st.t * len : null, low: key(lo), lowD: lo ? lo.t * len : null };
}, { ang, len });

/* How far a plain arrow flies along `ang` before the screen's edge, from your
   position (the v2.3.1095 rule, as monsterCombat _viewEdgeDist measures it). */
const edgeReach = (P, ang) => P.page.evaluate((ang) => {
  const S = window._gameState.current, cam = S.camera;
  if (!cam || !(S._viewW > 0) || !(S._viewH > 0)) return 300;
  const m = 24, ox = S.player.x, oy = S.player.y;
  const x0 = cam.x + m, x1 = cam.x + S._viewW - m, y0 = cam.y + m, y1 = cam.y + S._viewH - m;
  const c = Math.cos(ang), sn = Math.sin(ang);
  let t = Infinity;
  if (c > 1e-9) t = Math.min(t, (x1 - ox) / c); else if (c < -1e-9) t = Math.min(t, (x0 - ox) / c);
  if (sn > 1e-9) t = Math.min(t, (y1 - oy) / sn); else if (sn < -1e-9) t = Math.min(t, (y0 - oy) / sn);
  return Math.max(0, t);
}, ang);

/* No live monster within `r` of you (BroTown's commons has none; a check, so a
   wandering one cannot become the target of a shot meant for a prop). */
const noMonstersNear = (P, r = 900) => P.page.evaluate((r) => {
  const S = window._gameState.current;
  return !(S.monsters || []).some((m) => m && m.alive && Math.hypot(m.x - S.player.x, m.y - S.player.y) < r);
}, r);

/* A Wheel object's hits so far (wheelBreak), and every hit on any of them. */
const hitsOn = (P, oi) => P.page.evaluate((oi) => ({ d: window.__btWheelBreak.damage(oi), all: window.__btWheelBreak.stats.hits, breaks: window.__btWheelBreak.stats.breaks }), oi);

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `bowprops-${name}.png`) });
  const P = await H.newPlayer(browser, { name: 'Bowman', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query: `repairms=${REPAIR_MS}` });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String(e && e.message || e).slice(0, 200)));
  await H.enterWorld(P);
  let zone = null;
  for (let i = 0; i < 120; i++) {
    zone = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
    if (WHEELISH(zone)) break;
    await P.page.waitForTimeout(500);
  }
  await P.page.waitForTimeout(2500);
  const armed = await armBow(P);
  const dy = await bootsDy(P);
  const near = await objectsNear(P);
  const hall = near.find((o) => o.id === 'townhall');
  const bench = near.filter((o) => o.id === 'bench').sort((a, b) => a.d - b.d)[0];
  const tree = near.find((o) => o.id === 'orchard' || o.id === 'oak');
  rec.ok(`setup: in the Wheel (${zone}) with a bow, your boots ${dy.toFixed(0)} px under you, and a Town Hall, a bench and a tree near`,
    WHEELISH(zone) && armed.wpn === 'bow' && dy > 30 && !!hall && !!bench && !!tree,
    { zone, armed, dy, hall: hall && hall.box, bench: bench && bench.box, tree: tree && { id: tree.id, box: tree.box } });
  if (!hall || !bench || !tree) { await P.ctx.close().catch(() => {}); return; }

  /* ── A. CONTROL: nothing in reach ── */
  const hx = (hall.box.x0 + hall.box.x1) / 2 + 18;
  await bootsAt(P, hx, hall.box.y1 + 120, dy);
  let clearAng = null;
  for (let k = 0; k < 32 && clearAng == null; k++) {
    const a = Math.PI / 2 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 16);
    if (await lineClear(P, a, 760)) clearAng = a;
  }
  if (clearAng != null) {
    const a = await hold(P, clearAng, 1400, null);
    rec.ok(`A (control): aimed where no prop stands in reach (${clearAng.toFixed(2)} rad), the bow waits -- no target, no arrow`,
      a.gate && (a.gate.none || a.gate.d == null) && a.shots === 0, a);
  } else {
    rec.ok('A (control): a line clear of every prop for the bow\'s reach (guard)', false, { at: hx });
  }

  /* ── B. THE TOWN HALL FROM 120 PX ── */
  const b = await hold(P, -Math.PI / 2, 1800, hall.oi);
  console.log(`    B hall at 120 px: ${JSON.stringify(b)}`);
  rec.ok(`B: aimed at the Town Hall from 120 px, the gate reads the HALL (${b.gate && b.gate.id}) at its face (d ${b.gate && b.gate.d != null ? b.gate.d.toFixed(1) : '?'})`,
    !!b.gate && b.gate.id === 'prop:' + hall.oi && Math.abs(b.gate.d - 120) < 8, b.gate);
  rec.ok('B: ...the drawn line stops there', !!b.beam && b.beam.clipped === true && Math.abs(b.beam.len - b.gate.d) < 1, b.beam);
  rec.ok(`B: ...the bow fires (${b.shots} arrows) and the hall takes them (${b.damage} hits)`, b.shots >= 2 && b.damage >= 1, b);
  /* where it flew: the bow's grip, 20-33 px over your position -- a building
     is far taller than that, so the arrow is not lowered */
  const bMark = b.firstMark;
  rec.ok(`B: ...an arrow stays in its wall where it flew, ${bMark ? (hall.box.y1 - bMark.y).toFixed(0) : '?'} px up its face (your grip's height, ${(dy + 20).toFixed(0)}-${(dy + 34).toFixed(0)})`,
    !!bMark && bMark.headless && hall.box.y1 - bMark.y >= dy + 14 && hall.box.y1 - bMark.y <= dy + 40
      && bMark.x > hall.box.x0 && bMark.x < hall.box.x1, { bMark, face: hall.box.y1 });
  await shot(P, 'hall');

  /* ── C. POINT BLANK ── */
  await bootsAt(P, hx, hall.box.y1 + 14, dy);
  const c = await hold(P, -Math.PI / 2, 1800, hall.oi);
  console.log(`    C point blank: ${JSON.stringify(c)}`);
  rec.ok(`C: POINT BLANK (boots 14 px off its face), the gate still reads the hall (d ${c.gate && c.gate.d != null ? c.gate.d.toFixed(1) : '?'})`,
    !!c.gate && c.gate.id === 'prop:' + hall.oi && c.gate.d < 24, c.gate);
  rec.ok(`C: ...and it takes the arrows (${c.shots} fired, ${c.damage} hits) -- on main they started inside its footprint and flew through`,
    c.shots >= 2 && c.damage >= 1, c);

  /* ── D. A MONSTER IN FRONT OF THE HALL IS STILL THE TARGET ── */
  await bootsAt(P, hx, hall.box.y1 + 260, dy);
  const d = await P.page.evaluate((k) => new Promise((resolve) => {
    const S = window._gameState.current, F = window._gameFns || {};
    const serverWas = S._serverMonsters;
    S._serverMonsters = false;
    const g = window.__btPlayerGround();
    /* 80 px in front of the face, on the line north from your boots, 180 px
       off them */
    const m = F.createMonster('qa-bp-front', 'fodder', 2, g.x, k.face + 80, null);
    m.alive = true; m.curHp = m.maxHp = 900000; m.spd = 0; m.vx = 0; m.vy = 0; m.renderX = m.x; m.renderY = m.y;
    const keep = S.monsters;
    S.monsters = [m];
    S._aimAngle = -Math.PI / 2; S._aiming = true; S._lastAimAngle = -Math.PI / 2; S.lockedTarget = null;
    setTimeout(() => {
      const gg = S._bowSight;
      const out = { gate: gg ? { d: gg.d, id: gg.id } : null, mid: m.id };
      S._aiming = false; S.monsters = keep || []; S._serverMonsters = serverWas;
      resolve(out);
    }, 400);
  }), { face: hall.box.y1 });
  rec.ok(`D: a monster 80 px in front of the hall: the gate reads the MONSTER (${d.gate && d.gate.id}), not the wall behind it`,
    !!d.gate && d.gate.id === d.mid, d);

  /* ── I. A LOW THING IN FRONT OF SOMETHING TALL: OVER IT ──
     A low thing (projectiles.js shotSkip: what you can jump) with a building,
     a tree or a lamp post 60-260 px behind it; your boots 120 px on the near
     side, on the line through both.  The game's own sweeps pick the spot: the
     first low thing on the line is that one, and the first thing a shot stops
     at is the tall one, past it and inside the arrow's reach.  Buildings first
     (24+ hits), so the target outlasts I and K. */
  const pairs = await P.page.evaluate(() => {
    const S = window._gameState.current, W = window.__btWheelObjects, B = window.__btWheelBreak;
    const boxes = W.blockers();
    const over = (b) => window.__btShotFliesOver(b, null);
    const c = (b) => ({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 });
    const lows = boxes.filter((b) => b.oi != null && over(b));
    const talls = boxes.filter((b) => b.oi != null && !over(b) && B.kind(b.oi));
    const out = [];
    for (const L of lows) {
      const lc = c(L);
      for (const T of talls) {
        const tc = c(T);
        const d = Math.hypot(tc.x - lc.x, tc.y - lc.y);
        if (d < 60 || d > 260) continue;
        const ux = (lc.x - tc.x) / d, uy = (lc.y - tc.y) / d;
        const bx = lc.x + ux * 120, by = lc.y + uy * 120;
        if (boxes.some((b) => bx >= b.x0 - 8 && bx <= b.x1 + 8 && by >= b.y0 - 8 && by <= b.y1 + 8)) continue;
        out.push({ L: L.oi, Lid: L.id, T: T.oi, Tid: T.id, tc, bx, by, hp: B.kind(T.oi).hp,
          dPlayer: Math.hypot(bx - S.player.x, by - S.player.y) });
      }
    }
    return out.sort((a, b) => (b.hp >= 20) - (a.hp >= 20) || a.dPlayer - b.dPlayer).slice(0, 24);
  });
  let iAt = null;
  for (const c of pairs.slice(0, 10)) {
    const at = await bootsAt(P, c.bx, c.by, dy);
    const ang = Math.atan2(c.tc.y - at.boots.y, c.tc.x - at.boots.x);
    const reach = await edgeReach(P, ang);
    const lf = await lineFacts(P, ang, Math.min(reach, 675));
    if (lf.low === c.L && lf.stop === c.T && lf.lowD < lf.stopD && (await noMonstersNear(P))) { iAt = { ...c, ang, reach, lf }; break; }
  }
  rec.ok(`I: a low thing in front of something tall, on one line from your boots (guard)${iAt ? `: a ${iAt.Lid} ${iAt.lf.lowD.toFixed(0)} px off, a ${iAt.Tid} at ${iAt.lf.stopD.toFixed(0)}` : ''}`,
    !!iAt, { tried: pairs.length });
  if (iAt) {
    const l0 = await hitsOn(P, iAt.L);
    const i = await hold(P, iAt.ang, 2000, iAt.T);
    const l1 = await hitsOn(P, iAt.L);
    console.log(`    I over a ${iAt.Lid} at a ${iAt.Tid}: ${JSON.stringify(i)} low ${l1.d - l0.d}`);
    rec.ok(`I: ...the gate reads the ${iAt.Tid} (${i.gate && i.gate.id}) at ${i.gate && i.gate.d != null ? i.gate.d.toFixed(0) : '?'} px, past the ${iAt.Lid}`,
      !!i.gate && i.gate.id === 'prop:' + iAt.T, i.gate);
    rec.ok(`I: ...the arrows fly OVER the ${iAt.Lid} (${l1.d - l0.d} hits on it) and the ${iAt.Tid} takes them (${i.shots} fired, ${i.damage} hits)`,
      l1.d - l0.d === 0 && i.shots >= 2 && i.damage >= 1, { i, low: [l0, l1] });
    await shot(P, 'over-low');

    /* ── K. ...AND THE STAFF'S BOLTS THE SAME ── */
    await P.page.evaluate(() => {
      const S = window._gameState.current, R = S.rpg, F = window._gameFns || {};
      const t = ((F.WOODWORKING_TIERS || {}).pine) || { tierMult: 1 };
      R.staffWeapon = { type: 'staff', tierMult: t.tierMult, gearBase: 'pine', name: 'Pine Staff', tier: 'common' };
      R.activeSlot = 'staff';
    });
    const k0 = await hitsOn(P, iAt.L);
    const k = await hold(P, iAt.ang, 15000, iAt.T, 1);
    const k1 = await hitsOn(P, iAt.L);
    console.log(`    K staff over a ${iAt.Lid}: ${JSON.stringify(k)} low ${k1.d - k0.d}`);
    rec.ok(`K: the staff's bolts fly over the ${iAt.Lid} too (${k1.d - k0.d} hits on it) and the ${iAt.Tid} takes them (${k.shots} cast, ${k.damage} hits)`,
      k1.d - k0.d === 0 && k.shots >= 1 && k.damage >= 1, { k, low: [k0, k1] });
    await armBow(P);
  }

  /* ── J and E: A BENCH WITH NOTHING ELSE ON THE LINE ──
     The first bench (and side) where, from a level line 160 px off it, the
     bench is the first low thing and nothing a shot stops at stands within
     the arrow's reach. */
  let eAt = null;
  for (const bn of near.filter((o) => o.id === 'bench').slice(0, 6)) {
    for (const side of [-1, 1]) {
      await bootsAt(P, side < 0 ? bn.box.x0 - 160 : bn.box.x1 + 160, bn.box.y1 - 4, dy);
      const ang = side < 0 ? 0 : Math.PI;
      const reach = await edgeReach(P, ang);
      const lf = await lineFacts(P, ang, Math.min(reach, 675));
      if (lf.low === bn.oi && lf.stop == null && (await noMonstersNear(P))) { eAt = { bn, ang, reach, lf }; break; }
    }
    if (eAt) break;
  }
  rec.ok(`J/E: a bench level with you, 160 px off, nothing a shot stops at behind it within the arrow's reach (guard)${eAt ? ` (${eAt.reach.toFixed(0)} px)` : ''}`,
    !!eAt, { benches: near.filter((o) => o.id === 'bench').length });
  if (!eAt) { rec.ok('G: no page errors', errors.length === 0, errors); await P.ctx.close().catch(() => {}); return; }
  const bench2 = eAt.bn;

  /* ── J. A MONSTER BEHIND THE BENCH ──
     Its body on the arrow's line (feet a little under the grip, where the line
     runs: a monster level with your SHOT stands ~55 px north of your boots, so
     the bench is in front of it on the ground) and 70 px past the bench. */
  const j = await P.page.evaluate(({ ang, benchOi, bx }) => new Promise((resolve) => {
    const S = window._gameState.current, F = window._gameFns || {}, B = window.__btWheelBreak;
    window.__qaShots = 0;
    S.arrows = []; S.swingTimer = 0; S.lockedTarget = null; S.autoAttack = false;
    S._aimAngle = ang; S._aiming = true; S._lastAimAngle = ang;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const gy = S._bowSight && isFinite(S._bowSight.oy) ? S._bowSight.oy : S.player.y - 26;
      const serverWas = S._serverMonsters;
      S._serverMonsters = false;
      const m = F.createMonster('qa-bp-behind', 'fodder', 2, bx, gy + 12, null);
      m.alive = true; m.curHp = m.maxHp = 900000; m.spd = 0; m.vx = 0; m.vy = 0; m.renderX = m.x; m.renderY = m.y;
      const keep = S.monsters;
      S.monsters = [m];
      const d0 = B.damage(benchOi), t0 = performance.now();
      let gate = null;
      S.autoAttack = true;
      const tick = () => {
        const t = performance.now() - t0;
        if (S.monsters.indexOf(m) < 0) S.monsters = [m];
        if (!gate && t > 250) { const g = S._bowSight; gate = g ? { d: g.d, id: g.id } : { none: true }; }
        if (t >= 1800) {
          S.autoAttack = false; S._aiming = false;
          const out = { gate, mid: m.id, shots: window.__qaShots, monsterHits: m.maxHp - m.curHp, benchHits: B.damage(benchOi) - d0, gripY: gy, feetY: m.y };
          S.monsters = keep || []; S._serverMonsters = serverWas;
          resolve(out);
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }));
  }), { ang: eAt.ang, benchOi: bench2.oi, bx: eAt.ang === 0 ? bench2.box.x1 + 70 : bench2.box.x0 - 70 });
  console.log(`    J monster behind the bench: ${JSON.stringify(j)}`);
  rec.ok(`J: a monster 70 px behind the bench: the gate reads the MONSTER (${j.gate && j.gate.id}), not the bench`,
    !!j.gate && j.gate.id === j.mid, j);
  rec.ok(`J: ...the arrows fly over the bench (${j.benchHits} hits on it) into the monster (${j.shots} fired, ${j.monsterHits} damage)`,
    j.benchHits === 0 && j.shots >= 2 && j.monsterHits > 0, j);
  await P.page.waitForTimeout(800);   /* the last arrows land */

  /* ── E. THE BENCH ALONE ── */
  const e = await hold(P, eAt.ang, 4500, bench2.oi);
  console.log(`    E bench: ${JSON.stringify(e)}`);
  rec.ok(`E: nothing else on the line, the bench is what the bow is aimed at: the gate reads the BENCH (${e.gate && e.gate.id})`,
    !!e.gate && e.gate.id === 'prop:' + bench2.oi, { gate: e.gate, lf: eAt.lf });
  const eMark = e.firstMark;
  /* (where it hit is lifted 0.7 of the picture, combatHelpers.propHitHeight;
     the stuck shaft is drawn a few px over that point) */
  rec.ok(`E: ...an arrow stays IN its picture, ${eMark ? (bench2.box.y1 - eMark.y).toFixed(0) : '?'} px up a ${bench2.h.toFixed(0)} px bench -- not in the air over it at your grip's ${(dy + 20).toFixed(0)}+`,
    !!eMark && bench2.box.y1 - eMark.y > 4 && bench2.box.y1 - eMark.y < bench2.h - 2, { eMark, base: bench2.box.y1, h: bench2.h });
  /* hits, not shots: on a slow page more arrows are in the air when the third
     lands (a bench takes 3, wheelMaterials.js) */
  rec.ok(`E: ...and its ${e.hp} hits break it (${e.hitsAtBreak} arrows in it when it went, ${e.shotsAtBreak} fired)`,
    e.broke && e.hp != null && e.hitsAtBreak === e.hp, e);
  /* after it breaks: nothing left on the line within reach -> the bow stops */
  const after = await P.page.evaluate(() => ({ shots: window.__qaShots }));
  const lineAfter = await lineClear(P, eAt.ang, 760);
  if (lineAfter) {
    rec.ok(`E: ...and once it is rubble the line is empty and the bow stops (${e.shots} shots in all, ${e.shotsAtBreak} by the break)`,
      e.broke && e.shots - e.shotsAtBreak <= 1, { e, after });
  }
  await shot(P, 'bench');

  /* ── F. A TREE'S TRUNK FROM THE SIDE ── */
  /* the first tree (and side) whose trunk is the first thing on a level line
     200 px off it */
  let fAt = null;
  for (const t of near.filter((o) => o.id === 'orchard' || o.id === 'oak').slice(0, 6)) {
    for (const side of [-1, 1]) {
      const ty = t.box.y1 - 3;
      await bootsAt(P, side < 0 ? t.box.x0 - 200 : t.box.x1 + 200, ty, dy);
      const ang = side < 0 ? 0 : Math.PI;
      if ((await firstOnLine(P, ang, 300)) === t.oi) { fAt = { t, ang }; break; }
    }
    if (fAt) break;
  }
  rec.ok('F: a tree whose trunk is the first thing on a level line 200 px off it (guard)', !!fAt, { tree: tree.box });
  if (!fAt) { rec.ok('G: no page errors', errors.length === 0, errors); await P.ctx.close().catch(() => {}); return; }
  const tree2 = fAt.t;
  const f = await hold(P, fAt.ang, 2200, tree2.oi);
  console.log(`    F tree: ${JSON.stringify(f)}`);
  rec.ok(`F: a ${tree2.id}'s trunk from the side, level with it: the gate reads the TREE (${f.gate && f.gate.id}) and it takes the arrows (${f.shots} fired, ${f.damage} hits)`,
    !!f.gate && f.gate.id === 'prop:' + tree2.oi && f.shots >= 1 && f.damage >= 1, f);
  await shot(P, 'tree');

  /* ── H. A PROP PAST THE SCREEN'S EDGE IS NOT A TARGET ──
     A plain arrow comes down at the edge of the screen (projectiles.js, the
     v2.3.1095 range rule), so the Town Hall 460 px east of an upright phone's
     archer -- inside the bow's 675 px, past the view's ~320 px half width --
     is out of its reach, and the bow must not start firing at it. */
  let hRes = null;
  for (const yy of [hall.box.y1 - 30, hall.box.y1 - 90, hall.box.y0 + 40]) {
    await bootsAt(P, hall.box.x0 - 460, yy, dy);
    const first = await firstOnLine(P, 0, 675);
    const half = await P.page.evaluate(() => { const S = window._gameState.current; return S._viewW / 2; });
    if (first === hall.oi && 460 > half + 60) { hRes = await hold(P, 0, 1600, hall.oi); hRes.half = half; break; }
  }
  rec.ok('H: the Town Hall is the first thing on a level line, 460 px off and past the screen\'s edge (guard)', !!hRes, { box: hall.box });
  if (hRes) {
    rec.ok(`H: ...and the bow does not fire at it (${hRes.shots} arrows, the gate ${hRes.gate && hRes.gate.id})`,
      hRes.shots === 0 && !!hRes.gate && (hRes.gate.none || hRes.gate.d == null), hRes);
  }

  rec.ok('G: no page errors', errors.length === 0, errors);
  await P.ctx.close().catch(() => {});
}
