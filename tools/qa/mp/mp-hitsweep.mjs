/* HOW ACCURATE IS RANGED HIT DETECTION? (v2.3.2426)
 *
 * Owner: "Also check hit detection I'm not sure it's accurate."
 *
 * ═══ WHAT DECIDES A RANGED PvP HIT ═══
 * Entirely the attacker's own client.  The impact test in projectiles.js is
 * what emits player_attack at all; the worker only CLAMPS that claim (the
 * range/arc caps in _resolvePvPAttack) and never re-simulates the projectile.
 * So a miss here is final — no server correction, no lag compensation.
 *
 * And the test is a POINT-IN-CIRCLE, evaluated once per frame:
 *
 *     dist(target_centre, arrow_render_pos) < 22        (34 for staff)
 *
 * while the arrow ADVANCES  8 * _rangeMult * _dtScale  px between frames.
 * _dtScale is clamped to 3 (BroTown.jsx) and bowRangeMult caps at 2.0 —
 * "arrows fly twice as far/fast at the cap" (gameSystems.js) — so the step
 * spans 8px to 48px against a 22px radius.  When the step is longer than the
 * chord the path cuts through the hitbox, the arrow is sampled on both sides
 * of the target and the hit is never seen.  That is tunnelling.
 *
 * ═══ WHY THIS MEASURES PATHS, NOT FRAME RATES ═══
 * The first cut of this file swept a nominal `speedPx` and labelled the
 * columns in px/frame.  Those labels were WRONG: the real advance is
 * speedPx * _dtScale, and _dtScale on a headless box with no GPU rides its
 * own clamp — so the table measured something real against numbers that were
 * not the step.  A measurement whose axis is a guess is worse than none.
 *
 * So this records where each arrow ACTUALLY WAS on every frame and asks a
 * question that needs no frame-rate theory at all:
 *
 *     of the shots whose PATH passed through the hitbox,
 *     how many did the game register as hits?
 *
 *   pathMin  — closest approach of the swept polyline (what the arrow really
 *              flew through; what a segment test would see)
 *   pointMin — closest approach of any per-frame SAMPLE (what the shipped
 *              point test sees)
 *
 * pathMin < R and pointMin >= R is a shot that visibly went through the
 * target and did not count.  That is not a balance call, it is a defect, and
 * it is the only thing this file asserts.  The rest it prints.
 *
 * ═══ THE FIXTURE ═══
 * Arrows are pushed straight into S.arrows with the shape monsterCombat gives
 * them.  The SPAWN is not under test — projectiles.js's update is — and
 * pushing them directly is the only way to hold aim and speed still.
 * fromGrip:false so they release on frame one (no 110ms nock to race).
 *
 * PHASE is swept: with a point test, whether a given shot lands depends on
 * where the per-frame samples happen to fall relative to the target, so one
 * shot proves nothing.  Each batch spreads its arrows evenly across one step
 * of launch offset.  OFFSET is swept too — a shot through the middle has the
 * longest chord (2R), a grazing one almost none, and grazing shots are the
 * ones a player calls a miss that should have hit.
 */
import * as H from './harness.mjs';

const SHOTS = 10;                     /* phase samples per cell */
const SPEEDS = [8, 16, 24, 32, 48];   /* nominal px/frame before _dtScale */
const OFFSETS = [0, 12, 18];          /* px perpendicular: centre -> grazing */
const R_PVP = 22;                     /* the PLAYER body radius (projectiles.js) */
/* v2.3.2431: the arrow drawn half-thickness, so its effective radius is
   22 + 6.6 = 28.6.  These two bracket it: a shot 26px off centre is inside the
   drawn arrow reach and must land; one 34px off is outside it and must not.
   BOTH are needed -- a hitbox that should match the sprite is satisfiable by
   making the hitbox enormous, and only the second assertion forbids that. */
const ARROW_HALF = 6.6;
const HIT_BAND = 26;                  /* > 22, < 28.6: lands only since v2.3.2431 */
const MISS_BAND = 34;                 /* > 28.6: must still miss */

/* Fire a batch and sample every arrow's real position on every frame. */
const volley = (P, opts) => P.page.evaluate(({ tid, speed, offset, shots, frames }) => new Promise((resolve) => {
  const S = window._gameState.current;
  const P0 = S.player;
  const o = S.others[tid];
  if (!o) return resolve({ error: 'peer not visible' });
  const tx = (typeof o.renderX === 'number') ? o.renderX : o.x;
  const ty = ((typeof o.renderY === 'number') ? o.renderY : o.y) - 24;
  /* Offset is applied PERPENDICULAR to the shot line, so it is a true miss
     distance from the hitbox centre rather than a change of range. */
  const range = Math.hypot(tx - P0.x, ty - P0.y);
  const ang = Math.atan2(ty - P0.y, tx - P0.x) + Math.atan2(offset, range);
  window.__btPvpProj = { gated: 0, noTarget: 0, tested: 0, hits: 0, closest: 1e9 };
  S.arrows = [];
  const tracks = new Map();
  for (let i = 0; i < shots; i++) {
    const a = {
      ang,
      dist: (i * speed) / shots,   /* the phase sweep */
      fromGrip: false,
      dmg: 5,
      life: 400, maxLife: 400,
      hitIds: new Set(),
      isStaff: false,
      speedPx: speed,              /* v2.3.2262's per-projectile override */
      _bornTs: Date.now() - 500,
      _released: true,
      _qaId: i,
    };
    S.arrows.push(a);
    tracks.set(i, []);
  }
  /* Sample on the SAME clock the simulation runs on: one record per arrow per
     animation frame is exactly the sequence of positions the point test is
     evaluated at. */
  let n = 0;
  const tick = () => {
    for (const a of (S.arrows || [])) {
      if (a._qaId == null || a._renderX == null) continue;
      const t = tracks.get(a._qaId);
      if (t) t.push([a._renderX, a._renderY]);
    }
    if (++n < frames) return requestAnimationFrame(tick);
    /* Distance from a point to a segment — the swept test, written out. */
    const segDist = (px, py, ax, ay, bx, by) => {
      const dx = bx - ax, dy = by - ay;
      const L = dx * dx + dy * dy;
      if (L === 0) return Math.hypot(px - ax, py - ay);
      let t = ((px - ax) * dx + (py - ay) * dy) / L;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
    };
    const shotsOut = [];
    let stepSum = 0, stepN = 0, stepMax = 0;
    for (const [id, t] of tracks) {
      let pointMin = 1e9, pathMin = 1e9;
      for (let k = 0; k < t.length; k++) {
        const d = Math.hypot(tx - t[k][0], ty - t[k][1]);
        if (d < pointMin) pointMin = d;
        if (k > 0) {
          const s = segDist(tx, ty, t[k - 1][0], t[k - 1][1], t[k][0], t[k][1]);
          if (s < pathMin) pathMin = s;
          const adv = Math.hypot(t[k][0] - t[k - 1][0], t[k][1] - t[k - 1][1]);
          if (adv > 0.01) { stepSum += adv; stepN++; if (adv > stepMax) stepMax = adv; }
        }
      }
      if (t.length === 1) pathMin = pointMin;
      shotsOut.push({ id, samples: t.length, pointMin: +pointMin.toFixed(2), pathMin: +pathMin.toFixed(2) });
    }
    resolve({ shots: shotsOut, range: +range.toFixed(0),
      stepMean: stepN ? +(stepSum / stepN).toFixed(1) : 0,
      stepMax: +stepMax.toFixed(1),
      dtScale: +(S._dtScale || 1).toFixed(2),
      probeHits: (window.__btPvpProj || {}).hits || 0 });
  };
  requestAnimationFrame(tick);
}), opts);

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Archer', nameB: 'Dummy' });
  const bId = await H.readState(B, (S) => S.myId);
  await A.page.waitForTimeout(1500);

  /* Apart, so an arrow has room to fly.  hopTo moves for real — movement.js
     rejects a teleport and then rejects everything after it (harness note). */
  await H.hopTo(A, H.TOWN_CLEAN_SPOT.x, H.TOWN_CLEAN_SPOT.y).catch(() => {});
  await H.hopTo(B, H.TOWN_CLEAN_SPOT.x + 220, H.TOWN_CLEAN_SPOT.y).catch(() => {});
  await A.page.waitForTimeout(800);

  /* The client's PvP gate is consent OR a lock; a duel is the consent form.
     Set on the ATTACKER only — the attacker's own impact test is the whole
     subject, and the worker's consent gate is mp-duel's promise, not this
     file's. */
  await A.page.evaluate((tid) => { window._gameState.current._inDuel = { opponent: tid }; }, bId);

  const seesPeer = await H.waitFor(A, (S) => !!(S.others && S.others[Object.keys(S.others)[0]]),
    (v) => v === true, { timeout: 15000, label: 'A can see B' }).then(() => true).catch(() => false);
  rec.ok('the attacker can see the target (guard)', seesPeer);
  if (!seesPeer) { await A.ctx.close().catch(() => {}); await B.ctx.close().catch(() => {}); return; }

  const rows = [];
  let crossed = 0, registered = 0, lost = [];
  for (const offset of OFFSETS) {
    for (const speed of SPEEDS) {
      const r = await volley(A, { tid: bId, speed, offset, shots: SHOTS, frames: 90 });
      if (r.error) { rec.skip(`offset ${offset} speed ${speed}`, r.error); continue; }
      /* EVERY shot in the batch should hit, and that is geometry rather than
         judgement: the aim is built by rotating off the bearing to the target
         by atan2(offset, range), so the perpendicular miss distance of the
         flight line IS `offset` -- 0, 12 and 18px, all inside the 22px
         hitbox.  Ten arrows aimed through a stationary target should be ten
         hits; anything less is the frame step straddling it.

         The count comes from the renderer's own probe rather than from the
         recorded samples, because an arrow that HITS is consumed -- so a
         sample-derived "did it cross" can only ever see the misses, which
         would make the ratio circular.  __btPvpProj.hits is incremented at
         the real impact site, once per arrow. */
      crossed += SHOTS; registered += r.probeHits;
      for (const sh of r.shots) {
        if (sh.pointMin >= R_PVP && sh.pathMin < R_PVP) lost.push({ offset, speed, ...sh, step: r.stepMean });
      }
      rows.push({ offset, speed, step: r.stepMean, stepMax: r.stepMax,
        crossed: SHOTS, hit: r.probeHits, of: SHOTS,
        rate: Math.round((r.probeHits / SHOTS) * 100) });
    }
  }

  console.log('\n    ── ranged PvP hit rate.  EVERY shot below is aimed so its flight line');
  console.log(`       passes within ${R_PVP}px of the target centre -- i.e. through the hitbox.`);
  console.log('       Correct is 100% in every row. ──');
  console.log('    miss-dist  nominal  REAL step/frame   hits/10   rate');
  for (const r of rows) {
    console.log(`      ${String(r.offset + 'px').padStart(7)}  ${String(r.speed).padStart(7)}  ${String(r.step).padStart(15)}  ${String(r.hit + '/' + r.of).padStart(8)}  ${String(r.rate + '%').padStart(5)}`);
  }
  const dt = await H.readState(A, (S) => +(S._dtScale || 1).toFixed(2));
  console.log(`    (REAL step = the measured per-frame advance; _dtScale here ${dt}.`);
  console.log('     In production the step is 8*bowRangeMult*_dtScale: 8px at 60fps base,');
  console.log('     up to 48px with maxed Longshot at the 20fps _dtScale cap.)');
  console.log(`    TOTAL: ${registered}/${crossed} shots aimed THROUGH the target were counted as hits.\n`);
  if (lost.length) {
    console.log('    Traced misses -- where the arrow actually was, frame by frame:');
    for (const l of lost.slice(0, 10)) {
      console.log(`      miss-dist ${l.offset}px, step ${l.step}px: flight line passed ${l.pathMin}px from centre (inside ${R_PVP}px), but the nearest FRAME SAMPLE was ${l.pointMin}px away`);
    }
    console.log('');
  }

  /* ═══ v2.3.2431: THE HITBOX IS THE SPRITE, AND ONLY THE SPRITE ═══
     Two bands either side of the drawn arrow's edge, fired at a step slow
     enough that tunnelling cannot be what decides either one. */
  const band = async (offset) => {
    const r = await volley(A, { tid: bId, speed: 8, offset, shots: SHOTS, frames: 90 });
    if (r.error) return null;
    /* volley already waits out the flight and reports the renderer probe. */
    return { offset, hits: r.probeHits, of: SHOTS, step: r.stepMean };
  };
  const inBand = await band(HIT_BAND);
  const outBand = await band(MISS_BAND);
  console.log('\n    sprite band: ' + HIT_BAND + 'px off -> ' + (inBand ? inBand.hits : '?') + '/' + SHOTS
    + '    ' + MISS_BAND + 'px off -> ' + (outBand ? outBand.hits : '?') + '/' + SHOTS);
  console.log('    (the drawn arrow is 52.5 x 13.1px, so its reach is '
    + R_PVP + ' + ' + ARROW_HALF + ' = ' + (R_PVP + ARROW_HALF).toFixed(1) + 'px)\n');
  rec.ok('a shot ' + HIT_BAND + 'px off centre lands — the drawn arrow reaches that far ('
    + (inBand ? inBand.hits : '?') + '/' + SHOTS + ')',
    !!inBand && inBand.hits === SHOTS, inBand);
  rec.ok('...and one ' + MISS_BAND + 'px off still MISSES — the hitbox grew to the sprite, not past it ('
    + (outBand ? outBand.hits : '?') + '/' + SHOTS + ')',
    !!outBand && outBand.hits === 0, outBand);

  rec.ok('there were shots through the hitbox to judge (guard)', crossed > 0, { crossed });
  /* THE ONLY ASSERTION.  Where the hitbox should sit is a design call; whether
     a shot that flew through it counts is not. */
  rec.ok(`every shot aimed through the target registered as a hit (${registered}/${crossed})`,
    crossed > 0 && registered === crossed, { registered, crossed, lost: lost.slice(0, 8) });

  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
