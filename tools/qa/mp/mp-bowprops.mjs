/* ═══ THE BOW SHOOTS PROPS, BUILDINGS INCLUDED (v2.3.3200) ═══
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
 *   E. a bench LEVEL with you (boots on its base line), aimed east: the gate
 *      reads it, the arrow stays IN its picture, not in the air over it, and
 *      three arrows break it -- after which the line has nothing on it and the
 *      bow stops;
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
   whole time -- a broken object takes its marks with it. */
const hold = (P, ang, ms, oi) => P.page.evaluate(({ ang, ms, oi }) => new Promise((resolve) => {
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
    if (t >= ms) {
      const shots = window.__qaShots;
      S.autoAttack = false; S._aiming = false;
      resolve({ shots, gate, beam, firstMark, damage: oi != null ? B.damage(oi) - d0 : null,
        broke: B.stats.breaks !== b0, brokeAt, shotsAtBreak, hitsAtBreak, hp, marks: marksOn().length });
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}), { ang, ms, oi });

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

  /* ── E. A BENCH LEVEL WITH YOU ── */
  await bootsAt(P, bench.box.x0 - 160, bench.box.y1 - 4, dy);
  const benchLine = (await firstOnLine(P, 0, 300)) === bench.oi;
  const e = await hold(P, 0, 4500, bench.oi);
  console.log(`    E bench: ${JSON.stringify(e)}`);
  rec.ok(`E: a bench level with you (boots on its base line), aimed east: the gate reads the BENCH (${e.gate && e.gate.id})`,
    benchLine && !!e.gate && e.gate.id === 'prop:' + bench.oi, { gate: e.gate, benchLine });
  const eMark = e.firstMark;
  /* (where it hit is lifted 0.7 of the picture, combatHelpers.propHitHeight;
     the stuck shaft is drawn a few px over that point) */
  rec.ok(`E: ...an arrow stays IN its picture, ${eMark ? (bench.box.y1 - eMark.y).toFixed(0) : '?'} px up a ${bench.h.toFixed(0)} px bench -- not in the air over it at your grip's ${(dy + 20).toFixed(0)}+`,
    !!eMark && bench.box.y1 - eMark.y > 4 && bench.box.y1 - eMark.y < bench.h - 2, { eMark, base: bench.box.y1, h: bench.h });
  /* hits, not shots: on a slow page more arrows are in the air when the third
     lands (a bench takes 3, wheelMaterials.js) */
  rec.ok(`E: ...and its ${e.hp} hits break it (${e.hitsAtBreak} arrows in it when it went, ${e.shotsAtBreak} fired)`,
    e.broke && e.hp != null && e.hitsAtBreak === e.hp, e);
  /* after it breaks: nothing left on the line within reach -> the bow stops */
  const after = await P.page.evaluate(() => ({ shots: window.__qaShots }));
  const lineAfter = await lineClear(P, 0, 760);
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
