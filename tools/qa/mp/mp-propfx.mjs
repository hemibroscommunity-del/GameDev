/* ═══ A HIT ON A PROP LOOKS LIKE ONE  (v2.3.2702) ═══
 *
 * Owner: "Can you also make it so that subtle debris comes off the props once
 * they're hit by a player projectile and still make sure the snowballs explode
 * if they hit the props? ... I still want the bolt projectiles to explode even
 * if they hit props with debris, arrow stuck in (with debris), and sword slash
 * marks on the props (with debris)."
 *
 * Everything here runs the REAL client on a real frame clock in frost, against
 * the rock ridge (x 329..531, y 528..570), and asks the game's own probes:
 *
 *   ARROW   fired into the ridge the way mp-propshots fires one.  It must end
 *           PLANTED ON THE FACE -- not dropped to the ground below it -- be
 *           drawn headless INSIDE A PROP OVERLAY (the container that sorts with
 *           the rock), and have queued a stone burst from that face.
 *   BOLT    the same line with a staff bolt: spent on the face, with the crash
 *           rings drawn there and a 'bolt' burst.
 *   SWORD   a real swing started the way swingAttack starts one, aimed at the
 *           town FOUNTAIN from under it: a SLASH drawn on the south face at
 *           blade height, and a 'sword' burst.  Its CONTROL is the same swing
 *           aimed away, which must leave the fountain alone.  In town because
 *           a melee swing takes its angle from the auto-lock before the aim,
 *           and frost's snowmen took it: the first run swung at one.
 *   PEER    a second real player stands under the fountain; the first
 *           player's client receives that player's shot and swing through the
 *           real event path (__btDispatch) and must draw the same things.
 *
 * Debris is read off the queue the renderer drains (S._debrisBursts), wrapped
 * the way mp-propshots wraps the snowball-burst queue, because both the
 * current renderer and the hit-materials rewrite consume that one queue and
 * what is being claimed is that a PROP now feeds it.
 *
 * DEPTH is the claim a screenshot cannot make, so it is asserted on the scene
 * graph: the overlay is a child of the same layer as the ridge's own sprite and
 * sits AFTER it, i.e. is painted over the rock.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const RIDGE = { id: 'frost-rock-ridge', x0: 329, x1: 531, y0: 528, y1: 570 };
/* 30px under the south face: inside the sword's 72px reach, outside the
   player's 10px collision pad, and clear of the pine pair (x < 419.5 below
   y 644) and every other frost footprint. */
const UNDER = { x: 450, y: 600 };
/* The town fountain (x 831..1083, y 1426..1521), and a spot 30px under its
   south face on open cobble. */
const FOUNT = { id: 'fountain', x0: 831, x1: 1083, y0: 1426, y1: 1521 };
const PLAZA = { x: 957, y: 1551 };

/* Record every push onto the two queues this scenario reads, from now on. */
const wrapQueues = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  window.__qaDebris = [];
  window.__qaRings = [];
  const wrap = (key, sink) => {
    if (!S[key]) S[key] = [];
    const q = S[key];
    if (q.__qaWrapped) return;
    const orig = q.push;
    q.push = function (e) { try { window[sink].push(Object.assign({}, e)); } catch (_) {} return orig.apply(this, arguments); };
    q.__qaWrapped = true;
  };
  wrap('_debrisBursts', '__qaDebris');
  wrap('_impactRings', '__qaRings');
  return true;
});
/* The renderer REPLACES some arrays on zone entry; re-wrap before each case. */
const resetQueues = (P) => P.page.evaluate(() => { window.__qaDebris = []; window.__qaRings = []; });

/* One real projectile, frozen launch point (see mp-propshots' fireArrow for
   why _pathX is stamped), followed until it plants or is spent. */
const shoot = (P, o) => P.page.evaluate((o) => new Promise((resolve) => {
  const S = window._gameState.current;
  /* A staff bolt re-aims EVERY frame at the lock, else at the live aim
     (projectiles.js: magic homes, the bow flies straight), so both are set to
     the shot's own line -- with a ranged slot out, which does not auto-lock.
     The first cut of this left the sword test's aim (south) standing, and the
     bolt turned round and never reached the rock. */
  if (S.rpg) S.rpg.activeSlot = o.staff ? 'staff' : 'ranged';
  S.lockedTarget = null;
  S._aiming = true; S._aimAngle = o.ang; S._lastAimAngle = o.ang;
  const a = {
    ang: o.ang, dist: 0, fromGrip: false, dmg: 1, life: 400, maxLife: 400,
    hitIds: new Set((S.monsters || []).map((m) => m.id)),
    isStaff: !!o.staff, speedPx: o.speed, _bornTs: Date.now() - 500, _released: true,
    _qaId: 'qa-fx-' + o.tag, _pathX: o.x, _pathY: o.y,
  };
  S.arrows = (S.arrows || []).filter((x) => x._qaId == null);
  S.arrows.push(a);
  const track = []; let n = 0;
  /* Rings are SAMPLED, not wrapped: stateCleanup replaces S._impactRings
     with a filtered copy, so a wrapped push is lost within a second (the
     first run of this file caught no rings at all for that reason). */
  const seen = new Set(); const rings = [];
  const sampleRings = () => {
    for (const r of (S._impactRings || [])) {
      if (seen.has(r)) continue;
      seen.add(r); rings.push({ x: r.x, y: r.y, maxR: r.maxR, color: r.color });
    }
  };
  let doneAt = 0;
  const tick = () => {
    sampleRings();
    if (!doneAt && a._renderX != null) track.push([+a._renderX.toFixed(1), +a._renderY.toFixed(1)]);
    const alive = (S.arrows || []).indexOf(a) >= 0;
    if (!doneAt && (a.planted || a.planting || !alive || ++n >= 150)) doneAt = performance.now();
    if (doneAt && performance.now() - doneAt > 120) {
      resolve({ alive, planted: !!a.planted, planting: !!a.planting,
        plant: a.planted ? [a._plantX, a._plantY] : null, inProp: a._inProp || null,
        ang: a.ang, track, rings });
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}), o);

const marks = (P) => P.page.evaluate(() => (window.__btPropMarks ? window.__btPropMarks() : null));
const drained = (P) => P.page.evaluate(() => ({ debris: window.__qaDebris.slice(), rings: window.__qaRings.slice() }));

/* Is the ridge's overlay in the ridge sprite's own layer, and drawn after it?
   Read off the renderer's probe (effectsRenderer.propDepthProbe), which walks
   the overlay's own parent for the rock's sprite by its label. */
const depthOf = (P, id) => P.page.evaluate((id) => (window.__btPropDepth ? window.__btPropDepth(id) : { none: true }), id);

/* Walk at a pace the worker accepts.  H.hopTo's 100px every 260ms is fine for a
   player whose OWN screen is all that matters, but the second player here is
   seen through the worker, which snaps back a step that fast -- the first run
   of this file waited 15s for a peer the worker had never let leave spawn.
   60px per 300ms is under what mp-hitreal's placer walks at. */
async function walkTo(P, x, y) {
  for (let i = 0; i < 60; i++) {
    const done = await P.page.evaluate(({ x, y }) => {
      const S = window._gameState.current;
      const dx = x - S.player.x, dy = y - S.player.y, d = Math.hypot(dx, dy);
      if (d < 5) { S.player.vx = 0; S.player.vy = 0; return true; }
      const k = Math.min(60, d);
      S.player.x += (dx / d) * k; S.player.y += (dy / d) * k;
      return false;
    }, { x, y });
    if (done) return true;
    await P.page.waitForTimeout(300);
  }
  return false;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'PropFx', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  const probes = await P.page.evaluate(() => ({
    marks: typeof window.__btPropMarks === 'function',
    depth: typeof window.__btPropDepth === 'function',
    swing: typeof window.__btPropSwingContact === 'function',
    dispatch: typeof window.__btDispatch === 'function',
    zone: window._gameState.current.currentZone,
  }));
  rec.ok('setup: the probes this scenario reads exist, and we start in town', probes.marks && probes.depth
    && probes.swing && probes.dispatch && probes.zone === 'town', probes);
  await wrapQueues(P);

  /* ════════ TOWN: THE SWORD, AND A SECOND PLAYER ════════ */
  await H.hopTo(P, PLAZA.x, PLAZA.y);
  await P.page.waitForTimeout(700);
  const at = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y, monsters: (S.monsters || []).length }));
  rec.ok('setup: standing under the fountain, with no monster to steal the swing', Math.abs(at.x - PLAZA.x) < 14
    && Math.abs(at.y - PLAZA.y) < 14 && at.monsters === 0, at);

  /* ── 1. A SWORD LEAVES A SLASH ── */
  const swing = async (ang) => {
    await resetQueues(P);
    await P.page.evaluate((ang) => {
      const S = window._gameState.current;
      const R = S.rpg;
      if (R && !R.weapon) R.weapon = { type: 'sword', name: 'QA Sword', tierMult: 1 };
      if (R) R.activeSlot = 'melee';
      S.lockedTarget = null;
      S._aiming = true; S._aimAngle = ang;
      S._facing = ang < -1 ? 'up' : ang > 1 ? 'down' : 'right';
      S.swingTimer = Date.now();
      S.isSwinging = true;
    }, ang);
    await P.page.waitForTimeout(450);
    return P.page.evaluate(() => ({ swingAng: window._gameState.current._swingAng }));
  };
  const slashesOn = (list, id) => (list || []).filter((m) => m.kind === 'slash' && m.key === id + ':front');
  const sw = await swing(-Math.PI / 2);
  await P.page.waitForTimeout(60);
  const m3 = await marks(P);
  const cut = slashesOn(m3, FOUNT.id);
  rec.ok('sword: the swing ran north, at the fountain (guard)', typeof sw.swingAng === 'number' && Math.sin(sw.swingAng) < -0.9, sw);
  rec.ok('sword: a SLASH is drawn on the fountain\'s south face, square in front, at blade height',
    cut.length === 1 && cut[0].visible && Math.abs(cut[0].x - PLAZA.x) < 1
      && cut[0].y < FOUNT.y1 - 20 && cut[0].y > FOUNT.y1 - 40, m3);
  rec.ok('sword: ...cut ACROSS the swing (near level on a face you stand in front of), not along it',
    cut.length === 1 && Math.abs(Math.sin(cut[0].rot)) < 0.6, cut.length ? { rot: cut[0].rot } : null);
  const q3 = await drained(P);
  const deb3 = q3.debris.filter((b) => b.monsterId === 'prop:' + FOUNT.id);
  rec.ok('sword: ...with a stone burst of the SWORD shape, from blade height, landing at the face\'s foot',
    deb3.length === 1 && deb3[0].kind === 'stone' && deb3[0].weapon === 'sword'
      && Math.abs(deb3[0].gy - FOUNT.y1) < 0.6 && deb3[0].y < deb3[0].gy - 20, deb3);
  const d3 = await depthOf(P, FOUNT.id);
  rec.ok('sword: ...and the cut is painted OVER the fountain -- same layer, after it, sorted by its ground line',
    d3.sameParent && d3.ovIdx > d3.rockIdx && d3.ovZ >= d3.rockZ, d3);
  /* CONTROL: the same swing, the other way */
  await P.page.waitForTimeout(500);
  const before = slashesOn(await marks(P), FOUNT.id).length;
  const sw2 = await swing(Math.PI / 2);
  await P.page.waitForTimeout(60);
  const after = slashesOn(await marks(P), FOUNT.id).length;
  const q3b = await drained(P);
  rec.ok('control: the same swing aimed AWAY from the fountain leaves it alone -- no slash, no chips',
    Math.sin(sw2.swingAng) > 0.9 && after === before && !q3b.debris.some((b) => b.monsterId === 'prop:' + FOUNT.id),
    { before, after, swingAng: sw2.swingAng, debris: q3b.debris.map((b) => b.monsterId) });

  /* ── 2. WHAT A SECOND PLAYER SEES ──
     A second browser CONTEXT, not ?guest=1 -- two contexts already have two
     identities (joinPair's note) -- joining only once the first is in, and
     both nudged until each sees the other (waitMutualSight). */
  const Q = await H.newPlayer(browser, { name: 'PropPeer', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(Q);
  await Q.page.waitForTimeout(1500);
  const qid = await H.readState(Q, (S) => S.myId);
  await P.page.evaluate((id) => { window.__qaQid = id; }, qid);
  let sight = null;
  try { sight = await H.waitMutualSight(P, Q); } catch (e) { sight = { error: String(e).slice(0, 160) }; }
  const QAT = { x: PLAZA.x + 60, y: PLAZA.y + 8 };
  await walkTo(Q, QAT.x, QAT.y);
  await walkTo(P, PLAZA.x - 80, PLAZA.y + 40);   /* out of the way of the peer's line */
  let seen = null, lastSeen = null;
  for (let i = 0; i < 40 && !seen; i++) {
    lastSeen = await H.readState(P, (S) => {
      const o = S.others && S.others[window.__qaQid];
      return o ? { x: o.renderX != null ? o.renderX : o.x, y: o.renderY != null ? o.renderY : o.y } : null;
    }).catch(() => null);
    if (lastSeen && Math.abs(lastSeen.x - QAT.x) < 30 && Math.abs(lastSeen.y - QAT.y) < 30) seen = lastSeen;
    else await P.page.waitForTimeout(400);
  }
  const qSelf = await H.readState(Q, (S) => ({ x: Math.round(S.player.x), y: Math.round(S.player.y) }));
  rec.ok('peer: the first player sees the second one standing under the fountain (guard)', !!seen,
    { qid, sight, lastSeen, qSelf });
  if (seen) {
    await resetQueues(P);
    await P.page.evaluate((qid) => {
      window.__btDispatch({ type: 'player_projectile', payload: { id: qid, x: 0, y: 0, ang: -Math.PI / 2, isStaff: false, ts: Date.now() } });
    }, qid);
    await P.page.waitForTimeout(700);
    const m4 = await marks(P);
    const pa = (m4 || []).filter((m) => m.kind === 'arrow' && m.key === FOUNT.id + ':front');
    /* x within reach of where the peer was seen, not on it: a peer's shot is
       drawn from where the peer is drawn EACH FRAME (visualSystems), and the
       interpolated peer drifted 17px while the first run's arrow flew */
    /* up the face at bow height (visualSystems REMOTE_SHOT_H), not in the dirt
       at its foot -- a peer's shot is drawn from the peer's feet */
    rec.ok('peer: their arrow stands in the fountain on MY screen too, headless, up the face',
      pa.length === 1 && pa[0].headless && pa[0].y < FOUNT.y1 - 15 && pa[0].y > FOUNT.y1 - 40
        && Math.abs(pa[0].x - seen.x) < 40 && pa[0].x > FOUNT.x0 && pa[0].x < FOUNT.x1, { m4, seen });
    const q4 = await drained(P);
    rec.ok('peer: ...with the fountain\'s chips', q4.debris.some((b) => b.monsterId === 'prop:' + FOUNT.id && b.weapon === 'arrow'), q4.debris);

    await resetQueues(P);
    const ringsBefore = await P.page.evaluate(() => (window._gameState.current._impactRings || []).length);
    await P.page.evaluate((qid) => {
      window.__qaPeerRings = [];
      const S = window._gameState.current;
      const seenR = new Set((S._impactRings || []));
      const t0 = performance.now();
      const tick = () => {
        for (const r of (S._impactRings || [])) if (!seenR.has(r)) { seenR.add(r); window.__qaPeerRings.push({ x: r.x, y: r.y, maxR: r.maxR }); }
        if (performance.now() - t0 < 1200) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      window.__btDispatch({ type: 'player_projectile', payload: { id: qid, x: 0, y: 0, ang: -Math.PI / 2, isStaff: true, ts: Date.now() } });
    }, qid);
    await P.page.waitForTimeout(1400);
    const pr = await P.page.evaluate(() => window.__qaPeerRings.slice());
    const q5 = await drained(P);
    rec.ok('peer: their bolt CRASHES on the fountain on my screen -- the rings and the chips',
      pr.filter((r) => r.y < FOUNT.y1 - 15 && r.y > FOUNT.y1 - 40).length === 2
        && q5.debris.some((b) => b.monsterId === 'prop:' + FOUNT.id && b.weapon === 'bolt'), { pr, ringsBefore, debris: q5.debris });

    await P.page.waitForTimeout(300);
    const n0 = slashesOn(await marks(P), FOUNT.id).length;
    await P.page.evaluate((qid) => {
      window.__btDispatch({ type: 'player_swing', payload: { id: qid, ts: Date.now(), wpn: 'sword', ang: -Math.PI / 2 } });
    }, qid);
    await P.page.waitForTimeout(150);
    const n1 = slashesOn(await marks(P), FOUNT.id).length;
    rec.ok('peer: their sword swing at the fountain leaves a slash on my screen', n1 === n0 + 1, { n0, n1 });
    await P.page.evaluate((qid) => {
      window.__btDispatch({ type: 'player_swing', payload: { id: qid, ts: Date.now(), wpn: 'sword', ang: -Math.PI / 2, bash: true } });
    }, qid);
    await P.page.waitForTimeout(150);
    const n2 = slashesOn(await marks(P), FOUNT.id).length;
    rec.ok('control: a peer\'s SHIELD BASH is a shove, and leaves no cut', n2 === n1, { n1, n2 });
  }
  await Q.ctx.close().catch(() => {});

  /* ════════ FROST: THE ARROW AND THE BOLT, ON THE ROCK RIDGE ════════ */
  const seeded = await H.warpToZone(P, { wsPort, label: 'Frost Ridge', zoneId: 'frost' });
  rec.ok('setup: every zone is open on the worker',
    seeded.ok && seeded.zones && Object.values(seeded.zones).every(Boolean), seeded.zones);
  /* The owner's test kit's bounded god mode (the same call mp-hitreal makes):
     frost's snowmen come for anyone standing still under the ridge, and one
     run's closing picture was of a skeleton. */
  const pid = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'vitals', pid, { heal: true, god: true, godMinutes: 10 }).catch(() => null);
  await H.hopTo(P, UNDER.x, UNDER.y);
  await P.page.waitForTimeout(900);
  const me = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y, zone: S.currentZone }));
  rec.ok('setup: standing under the rock ridge in frost',
    me.zone === 'frost' && Math.abs(me.x - UNDER.x) < 14 && Math.abs(me.y - UNDER.y) < 14, me);
  await wrapQueues(P);

  /* ── 3. AN ARROW STICKS IN THE ROCK ── */
  await resetQueues(P);
  const ar = await shoot(P, { tag: 'arrow', x: UNDER.x, y: UNDER.y, ang: -Math.PI / 2, speed: 20 });
  rec.ok('arrow: it PLANTED -- and never took the spent drop to the ground',
    ar.planted && !ar.planting, { planted: ar.planted, planting: ar.planting });
  rec.ok('arrow: ...ON the ridge\'s south face, where it hit, not at the foot of the face',
    !!ar.plant && Math.abs(ar.plant[1] - RIDGE.y1) < 0.6 && Math.abs(ar.plant[0] - UNDER.x) < 0.6,
    { plant: ar.plant, face: RIDGE.y1 });
  rec.ok('arrow: ...and knows it is in the ridge, on its south face',
    !!ar.inProp && ar.inProp.id === RIDGE.id && ar.inProp.face === 's', ar.inProp);
  rec.ok('arrow: ...keeping the angle it flew at (it is standing in the rock, not lying on the ground)',
    Math.abs(ar.ang - (-Math.PI / 2)) < 1e-6, { ang: ar.ang });
  await P.page.waitForTimeout(120);
  const m1 = await marks(P);
  const stuck = (m1 || []).filter((m) => m.kind === 'arrow' && m.key === RIDGE.id + ':front');
  rec.ok('arrow: it is DRAWN in the ridge\'s overlay, headless, visible, at the hit',
    stuck.length === 1 && stuck[0].headless && stuck[0].visible
      && Math.abs(stuck[0].x - UNDER.x) < 1 && Math.abs(stuck[0].y - RIDGE.y1) < 1, m1);
  const d1 = await depthOf(P, RIDGE.id);
  rec.ok('arrow: ...and that overlay is painted OVER the ridge -- same layer, after it, sorted by the rock\'s ground line',
    d1.sameParent && d1.ovIdx > d1.rockIdx && d1.ovZ >= d1.rockZ, d1);
  const q1 = await drained(P);
  const deb1 = q1.debris.filter((b) => b.monsterId === 'prop:' + RIDGE.id);
  rec.ok('arrow: the ridge threw a STONE burst from the face it was hit on',
    deb1.length === 1 && deb1[0].kind === 'stone' && deb1[0].weapon === 'arrow' && deb1[0].prop
      && Math.abs(deb1[0].gy - RIDGE.y1) < 0.6, deb1);
  rec.ok('arrow: ...coming BACK off the face, toward the shooter (south)',
    deb1.length === 1 && Math.sin(deb1[0].ang) > 0.9, deb1.length ? { ang: deb1[0].ang } : null);
  rec.ok('arrow: ...and asking for the SUBTLE version (fewer, smaller chunks)',
    deb1.length === 1 && deb1[0].scale < 1 && deb1[0].parts > 0 && deb1[0].parts < 7, deb1.length ? { scale: deb1[0].scale, parts: deb1[0].parts } : null);
  /* ...and it goes when its planted life does (2 s) */
  await P.page.waitForTimeout(2300);
  const m1b = await marks(P);
  rec.ok('arrow: ...and is gone again when its 2 s are up (no sprite left behind)',
    !(m1b || []).some((m) => m.kind === 'arrow' && m.key === RIDGE.id + ':front'), m1b);

  /* ── 4. A BOLT EXPLODES ON THE ROCK ── */
  await resetQueues(P);
  const bo = await shoot(P, { tag: 'bolt', staff: true, x: UNDER.x, y: UNDER.y, ang: -Math.PI / 2, speed: 12 });
  const q2 = await drained(P);
  const lastY = bo.track.length ? bo.track[bo.track.length - 1][1] : null;
  console.log('    bolt: ' + JSON.stringify({ alive: bo.alive, n: bo.track.length, tail: bo.track.slice(-3), rings: bo.rings.length }));
  rec.ok('bolt: it was spent ON the face -- its last drawn point is the face -- never inside or past it',
    !bo.alive && lastY !== null && Math.abs(lastY - RIDGE.y1) < 0.6
      && Math.min(...bo.track.map((t) => t[1])) >= RIDGE.y1 - 0.6,
    { alive: bo.alive, lastY, n: bo.track.length });
  /* where the BOLT ended, not where it was aimed: a staff bolt steers toward
     a monster in flight (magic homes, the bow does not), and the first run's
     bolt bent 10px toward a snowman on its way to the rock */
  const boX = bo.track.length ? bo.track[bo.track.length - 1][0] : null;
  const rings = bo.rings.filter((r) => Math.abs(r.y - RIDGE.y1) < 1 && boX !== null && Math.abs(r.x - boX) < 2
    && r.x > RIDGE.x0 && r.x < RIDGE.x1);
  rec.ok('bolt: ...and CRASHED there: both rings of the monster-hit crash, on the face where it ended',
    rings.length === 2 && rings.some((r) => r.maxR === 26) && rings.some((r) => r.maxR === 14), { rings: bo.rings, boX });
  const deb2 = q2.debris.filter((b) => b.monsterId === 'prop:' + RIDGE.id);
  rec.ok('bolt: ...with a stone burst of the BOLT shape',
    deb2.length === 1 && deb2[0].kind === 'stone' && deb2[0].weapon === 'bolt', deb2);

  /* ── 5. A PICTURE, for the owner ──
     Marks stand for seconds, and a screenshot here takes about two (TRAPS
     §102), so the picture uses long-lived marks queued through the same record
     the game queues -- one stuck arrow and two slashes -- rather than racing a
     real one. */
  await P.page.evaluate((r) => {
    const S = window._gameState.current;
    if (!S._propMarks) S._propMarks = [];
    const t0 = Date.now();
    /* at bow height, where a real arrow from the grip lands */
    S._propMarks.push({ kind: 'arrow', id: r.id, x: 470, y: r.y1 - 32, gy: r.y1, face: 's', ang: -Math.PI / 2 - 0.25, ttl: 12000, zone: 'frost', t0 });
    S._propMarks.push({ kind: 'slash', id: r.id, x: 420, y: r.y1 - 30, gy: r.y1, face: 's', ang: -0.42, ttl: 12000, zone: 'frost', t0 });
    S._propMarks.push({ kind: 'slash', id: r.id, x: 436, y: r.y1 - 24, gy: r.y1, face: 's', ang: 0.4, ttl: 12000, zone: 'frost', t0 });
  }, RIDGE);
  await P.page.waitForTimeout(250);
  const clip = await P.page.evaluate((r) => {
    const S = window._gameState.current;
    const cv = document.querySelector('canvas');
    const b = cv.getBoundingClientRect();
    const sx = S._worldScaleX || 1, sy = S._worldScaleY || sx;
    const cx = b.left + (((r.x0 + r.x1) / 2) - S.camera.x) * sx, cy = b.top + ((r.y1 - 40) - S.camera.y) * sy;
    const x = Math.max(0, Math.round(cx - 150)), y = Math.max(0, Math.round(cy - 110));
    return { x, y, width: Math.min(300, window.innerWidth - x), height: Math.min(220, window.innerHeight - y) };
  }, RIDGE);
  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/propfx-ridge.png`, clip }).catch(() => {});

  await P.ctx.close().catch(() => {});
}
