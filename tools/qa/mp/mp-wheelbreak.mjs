/* ═══ THE WHEEL'S OBJECTS TAKE HITS, BREAK, AND ARE MENDED (v2.3.2995) ═══
 *
 * Owner, 2026-10-03: "change the sound if projectiles hit props to be more
 * appropriate for the type of material it is ... Also destructive props
 * would be cool.  Maybe after too many shots it shatters into pieces using
 * code.  It would be cool if there were burn marks from magic or arrows
 * stuck in it if using bow ... on the client side you could destroy
 * buildings before having them repaired in a few minutes".
 *
 * On a phone viewport, against a real worker, in the Wheel's Brotown, with
 * `repairms=` so a mending comes in seconds, not three minutes.  Shots are
 * real projectiles in S.arrows, flown by the game's own arrow simulation
 * (projectiles.js) at real objects' footprints:
 *   1. an arrow into a wooden thing: the wood sound (the owner's hatchet),
 *      its pieces cut from its own picture, a shake, one hit counted -- and
 *      the arrow STAYS in it, headless, on its face, past the old 2 s;
 *   2. a bolt into it: a burn mark of its own pixels, its heat fading;
 *   3. a lamp rings as metal, a rock as stone (the pickaxe), a tree throws
 *      its crown's leaves;
 *   4. enough hits and it shatters: its sprite gone, shards of its picture
 *      flying, falling, landing on its footprint, the break sound, its marks
 *      gone with it, and its footprint gone from the walk test -- the next
 *      arrow flies through where it stood, and you can stand there;
 *   5. a few seconds later (repairms) it is mended: the shards fade, it
 *      fades back in, its footprint is back -- but not while you stand in it;
 *   6. a building takes ~24 arrows and collapses (the timed cut of its shards);
 *   7. no page errors.
 * Pictures in tools/qa/mp/out/wheelbreak-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
/* long enough that a slow headless screenshot (several seconds under load)
   cannot outlast it between two checks of the broken state */
/* v2.3.3000: 25 s (was 15): the steps between the break and the mending --
   the shards' fall, an arrow through -- run in a headless page's slow motion,
   and with the Wheel's shadows on they ran past 15 s */
const REPAIR_MS = 25000;
const WHEELISH = (z) => z === 'worldview' || z === 'wheel';
const BOW_H = 30;     /* a shot flies this far above the ground line (the bow grip) */

/* The objects of kind `ids` near the player whose footprint is in the walk
   test now (so a shot can meet them), nearest first: { oi, id, x, y, box }. */
const targets = (P, ids, r = 900) => P.page.evaluate(({ ids, r }) => {
  const S = window._gameState.current, W = window.__btWheelObjects;
  const boxes = W.blockers();
  const out = [];
  for (const o of W.near(S.player.x, S.player.y, r)) {
    if (ids.indexOf(o.id) < 0 || !o.ready) continue;
    const box = boxes.find((b) => b.oi === o.i);
    if (!box) continue;
    out.push({ oi: o.i, id: o.id, x: o.x, y: o.y, w: o.w, h: o.h, box, d: Math.hypot(o.x - S.player.x, o.y - S.player.y) });
  }
  return out.sort((a, b) => a.d - b.d);
}, { ids, r });

/* Stand south of `t`'s footprint, clear of it, square in front of it. */
async function standBefore(P, t, gap = 70) {
  const dy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g ? g.y - S.player.y : 52; });
  const x = (t.box.x0 + t.box.x1) / 2;
  await H.hopTo(P, x + 18, t.box.y1 + gap - dy, { tries: 60 });
  await P.page.waitForTimeout(500);
}

/* One real shot from just south of `t`'s footprint, straight at its south
   face, at bow height: resolved when it is spent, stuck or gone. */
const shootAt = (P, t, o = {}) => P.page.evaluate(({ t, o, BOW_H }) => new Promise((resolve) => {
  const S = window._gameState.current;
  const gx = (t.box.x0 + t.box.x1) / 2 + (o.dx || 0), gy = t.box.y1 + (o.from || 46);
  const ang = -Math.PI / 2;
  if (S.rpg) S.rpg.activeSlot = o.staff ? 'staff' : 'ranged';
  S.lockedTarget = null;
  S._aiming = true; S._aimAngle = ang; S._lastAimAngle = ang;
  const a = {
    ang, dist: 0, fromGrip: false, dmg: 1, life: 400, maxLife: 400,
    hitIds: new Set((S.monsters || []).map((m) => m.id)),
    isStaff: !!o.staff, speedPx: o.speed || 10, _bornTs: Date.now() - 500, _released: true,
    _qaId: 'qa-wb-' + Math.random(), _pathX: gx, _pathY: gy - BOW_H, _ox: 0, _oy: -BOW_H,
  };
  S.arrows = (S.arrows || []).filter((x) => x._qaId == null);
  S.arrows.push(a);
  let n = 0;
  const t0 = performance.now();
  /* the moment it lands on the target -- a hit counted, or the break -- is
     the moment to read: an arrow that breaks what it hits flies on through
     the pieces (projectiles.js) and may hit something else behind */
  const B = window.__btWheelBreak;
  const d0 = B.damage(t.oi), b0 = B.stats.breaks;
  const tick = () => {
    const alive = (S.arrows || []).indexOf(a) >= 0;
    const landed = !o.through && (B.damage(t.oi) !== d0 || B.stats.breaks !== b0);
    if (landed || !alive || a.planted || a.planting || ++n > 400 || performance.now() - t0 > 6000) {
      const A = window.BT_AUDIO;
      resolve({ alive, planted: !!a.planted, inProp: a._inProp || null, y: a._renderY, ms: Math.round(performance.now() - t0),
        landed, sound: A && A._lastProp ? { ...A._lastProp } : null });
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}), { t, o, BOW_H });

const marksOn = (P, oi) => P.page.evaluate((oi) => (window.__btPropMarks ? window.__btPropMarks() : []).filter((m) => m.key === 'wobj:' + oi + ':front' || m.key === 'wobj:' + oi + ':back'), oi);
const debrisFor = (P, key) => P.page.evaluate((key) => (window.__qaWb || []).filter((b) => b.monsterId === key), key);
const state = (P, oi) => P.page.evaluate((oi) => {
  const W = window.__btWheelObjects, B = window.__btWheelBreak;
  return { damage: B.damage(oi), broken: B.broken().some((b) => b.oi === oi), drawn: W.drawn(oi), shaking: W.shaking(oi),
    fading: W.fading(oi), box: W.blockers().some((b) => b.oi === oi), heap: W.shards().find((h) => h.oi === oi) || null, stats: { ...B.stats } };
}, oi);

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `wheelbreak-${name}.png`) });
  const P = await H.newPlayer(browser, { name: 'Wrecker', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query: `repairms=${REPAIR_MS}` });
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
  /* every burst the game queues, kept for the checks (the renderer drains the queue) */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    window.__qaWb = [];
    if (!S._debrisBursts) S._debrisBursts = [];
    const q = S._debrisBursts, orig = q.push;
    q.push = function (e) { try { window.__qaWb.push({ monsterId: e.monsterId, kind: e.kind, oi: e.oi, weapon: e.weapon, crown: !!e.crown }); } catch (_) {} return orig.apply(this, arguments); };
  });
  const probes = await P.page.evaluate(() => ({ wo: !!window.__btWheelObjects, wb: !!window.__btWheelBreak, marks: typeof window.__btPropMarks === 'function',
    audio: !!window.BT_AUDIO, repairMs: window.__btWheelBreak ? window.__btWheelBreak.repairMs : null }));
  rec.ok(`setup: in the Wheel (${zone}), its objects and their probes there, the mending ${probes.repairMs} ms for this test`,
    WHEELISH(zone) && probes.wo && probes.wb && probes.marks && probes.audio && probes.repairMs === REPAIR_MS, probes);

  /* ── 1. an arrow into wood ── */
  let wood = (await targets(P, ['barrel', 'crate', 'bench', 'trough', 'hitch', 'signpost', 'noticeboard', 'cart']))[0];
  if (!wood) wood = (await targets(P, ['barrel', 'crate', 'bench', 'trough', 'hitch', 'signpost', 'noticeboard', 'cart'], 1600))[0];
  rec.ok(`setup: a wooden thing to shoot near the arrival (${wood ? wood.id : 'none'})`, !!wood, wood);
  if (!wood) return;
  await standBefore(P, wood);
  wood = (await targets(P, [wood.id], 400)).find((t) => t.oi === wood.oi) || wood;
  await shot(P, '0-before');
  const s1 = await shootAt(P, wood);
  await P.page.waitForTimeout(60);
  const st1 = await state(P, wood.oi);
  const lp1 = s1.sound;
  const d1 = await debrisFor(P, 'wobj:' + wood.oi);
  rec.ok(`an arrow into the ${wood.id}: the WOOD sound (${lp1 ? lp1.key : 'none'}), not the stone clang`,
    !!lp1 && lp1.what === 'hit' && lp1.mat === 'wood' && (lp1.key === 'axe-chop' || lp1.key === 'wood-chop'), { lp1, s1 });
  rec.ok('...its pieces are wood, thrown off that one object (not every one of its kind)', d1.length >= 1 && d1[0].kind === 'wood' && d1[0].oi === wood.oi, d1);
  rec.ok('...it shakes, and one hit is counted', st1.shaking && st1.damage === 1, st1);
  await P.page.waitForTimeout(400);
  const deb = await P.page.evaluate(() => (window.__btDebris ? window.__btDebris() : []).filter((b) => b.fx === 'wood'));
  rec.ok(`...and the burst is drawn as wood, its pieces cut from the picture (${deb.length ? deb[deb.length - 1].parts : 0} pieces)`, deb.length >= 1 && deb[deb.length - 1].parts >= 1, deb.slice(-1));
  const m1 = await marksOn(P, wood.oi);
  const arrow1 = m1.filter((m) => m.kind === 'arrow');
  rec.ok('...and the arrow STAYS in it: headless, on its face, drawn in the overlay that sorts with it, not a projectile any more',
    !s1.alive && arrow1.length === 1 && arrow1[0].headless && arrow1[0].visible && arrow1[0].y < wood.box.y1 - 10, { m1, s1 });
  await P.page.waitForTimeout(2600);
  const m1b = await marksOn(P, wood.oi);
  rec.ok('...still there 3 s later (the old stuck arrow went at 2 s)', m1b.filter((m) => m.kind === 'arrow' && m.alpha > 0.9).length === 1, m1b);

  /* ── 2. a bolt into it: a burn mark ── */
  const s2 = await shootAt(P, wood, { staff: true, dx: -6, speed: 6 });
  await P.page.waitForTimeout(150);
  const m2 = await marksOn(P, wood.oi);
  const sc = m2.filter((m) => m.kind === 'scorch'), gl = m2.filter((m) => m.kind === 'glow');
  rec.ok('a bolt into it leaves a BURN MARK of its own pixels on its face, glowing hot',
    sc.length === 1 && sc[0].visible && gl.length === 1 && gl[0].alpha > 0.2, { m2, s2 });
  await shot(P, '1-marks');
  await P.page.waitForTimeout(2200);
  const m2b = await marksOn(P, wood.oi);
  rec.ok('...its heat gone in a couple of seconds, the mark itself staying', m2b.filter((m) => m.kind === 'scorch').length === 1 && !m2b.some((m) => m.kind === 'glow'), m2b);
  const st2 = await state(P, wood.oi);
  rec.ok(`...two hits counted now (${st2.damage})`, st2.damage === 2, st2);

  /* ── 4. enough hits: it shatters ── */
  const lastHp = await P.page.evaluate((oi) => window.__btWheelBreak.kind(oi).hp, wood.oi);
  let s3 = null;
  for (let k = st2.damage; k < lastHp; k++) s3 = await shootAt(P, wood, { dx: 4 });
  await P.page.waitForTimeout(250);
  const st4 = await state(P, wood.oi);
  const lp4 = s3 && s3.sound;
  await shot(P, '2-shatter');
  rec.ok(`after its ${lastHp} hits the ${wood.id} BREAKS: its sprite gone, its shards flying (${st4.heap ? st4.heap.shards : 0} of them)`,
    st4.broken && !st4.drawn && !!st4.heap && st4.heap.shards >= 4, st4);
  rec.ok(`...with the break sound (${lp4 ? lp4.key : 'none'})`, !!lp4 && lp4.what === 'break' && lp4.mat === 'wood', lp4);
  const m4 = await marksOn(P, wood.oi);
  rec.ok('...its arrow and its burn mark gone with it', m4.length === 0, m4);
  rec.ok('...and its footprint gone from the walk test', !st4.box, st4);
  /* and you can stand there -- asked straight away (v2.3.3000): asked after
     the shards' fall and the next arrow, on a slow page it came after the
     mending, when the footprint is rightly back */
  const walk = await P.page.evaluate(({ b }) => {
    const S = window._gameState.current, f = window.__btPropFeetBlocked;
    const dy = (window.__btPlayerGround() || {}).y - S.player.y || 52;
    const x = (b.x0 + b.x1) / 2, y = (b.y0 + b.y1) / 2 - dy;
    return { blocked: f ? f(x, y + 30, x, y) : null };
  }, { b: wood.box });
  rec.ok('...and you can walk where it stood', walk.blocked === false, walk);
  let st4b = null;
  for (let i = 0; i < 30; i++) {
    /* (a headless page runs at a few frames a second: the shards fall in
       slow motion, so they are waited for, not timed) */
    await P.page.waitForTimeout(200);
    st4b = await state(P, wood.oi);
    if (!st4b.heap || st4b.heap.landed === st4b.heap.shards) break;
  }
  rec.ok(`...the shards have come down and lie on its footprint (${st4b.heap ? st4b.heap.landed : 0}/${st4b.heap ? st4b.heap.shards : 0} landed), sorted with the scene`,
    !!st4b.heap && st4b.heap.landed === st4b.heap.shards && st4b.heap.spanY[0] >= wood.box.y0 - 30 && st4b.heap.spanY[1] <= wood.box.y1 + 40
      && st4b.heap.layers.every((l) => l === 'entities' || l === 'gatherNodesFront'), st4b.heap);
  await shot(P, '3-rubble');
  /* the next arrow flies through where it stood */
  const s4 = await shootAt(P, wood, { through: true });
  rec.ok('...the next arrow flies on through where it stood (it does not stop there)', s4.inProp == null && (s4.y == null || s4.y < wood.box.y0 - BOW_H - 4), s4);


  /* ── 5. mended ── */
  let st5 = null;
  for (let i = 0; i < Math.ceil((REPAIR_MS + 5000) / 200); i++) {
    st5 = await state(P, wood.oi);
    if (!st5.broken) break;
    await P.page.waitForTimeout(200);
  }
  await P.page.waitForTimeout(150);
  st5 = await state(P, wood.oi);
  rec.ok(`${REPAIR_MS / 1000} s on it is MENDED: drawn again, fading in (${st5.fading}), its footprint back, its shards fading away`,
    !st5.broken && st5.drawn && st5.fading != null && st5.fading < 1 && st5.box && (!st5.heap || st5.heap.fading), st5);
  await P.page.waitForTimeout(1800);
  const st5b = await state(P, wood.oi);
  rec.ok('...whole again: fully drawn, the shards gone, the count back to nothing', st5b.drawn && st5b.fading == null && !st5b.heap && st5b.damage === 0, st5b);
  await shot(P, '4-mended');

  /* ── 3. other materials ── */
  const lamp = (await targets(P, ['lamp'], 1400))[0];
  if (lamp) {
    await standBefore(P, lamp, 60);
    const sh = await shootAt(P, (await targets(P, ['lamp'], 400)).find((t) => t.oi === lamp.oi) || lamp);
    await P.page.waitForTimeout(80);
    const lp = sh.sound;
    const dl = await debrisFor(P, 'wobj:' + lamp.oi);
    rec.ok(`a lamp post rings as METAL (${lp ? lp.key : 'none'}) and sparks`, !!lp && lp.mat === 'metal' && /^armor-hit/.test(lp.key) && dl.some((b) => b.kind === 'metal'), { lp, dl });
  } else rec.ok('a lamp near the arrival', false, null);
  const well = (await targets(P, ['well', 'stone', 'stonewall'], 1600))[0];
  if (well) {
    await standBefore(P, well, 60);
    const sh = await shootAt(P, (await targets(P, [well.id], 400)).find((t) => t.oi === well.oi) || well);
    await P.page.waitForTimeout(80);
    const lp = sh.sound;
    rec.ok(`the ${well.id} rings as STONE: the pickaxe on rock (${lp ? lp.key : 'none'})`, !!lp && lp.mat === 'stone' && lp.key === 'mine-strike', lp);
  } else rec.ok('a stone thing near the arrival', false, null);
  let tree = (await targets(P, ['oak', 'orchard'], 2600))[0];
  if (!tree) {
    /* the commons' trees stand out past the town's edge: walk out to the
       nearest one, then ask again (its page loads as you come) */
    const far = await P.page.evaluate(() => {
      const S = window._gameState.current, W = window.__btWheelObjects;
      return W.near(S.player.x, S.player.y, 4000).filter((o) => o.id === 'oak' || o.id === 'orchard')
        .sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y))[0] || null;
    });
    if (far) {
      await H.hopTo(P, far.x + 20, far.y + 80, { tries: 80 });
      await P.page.waitForTimeout(1500);
      tree = (await targets(P, ['oak', 'orchard'], 800)).find((q) => q.oi === far.i) || (await targets(P, ['oak', 'orchard'], 800))[0];
    }
  }
  if (tree) {
    await standBefore(P, tree, 60);
    const sh = await shootAt(P, (await targets(P, [tree.id], 400)).find((t) => t.oi === tree.oi) || tree);
    await P.page.waitForTimeout(120);
    const lp = sh.sound;
    const dt = await debrisFor(P, 'wobj:' + tree.oi + ':c');
    const sway = await state(P, tree.oi);
    rec.ok(`a tree (${tree.id}) answers as wood, sways, and its crown lets go of leaves`, !!lp && lp.mat === 'wood' && dt.some((b) => b.kind === 'canopy' && b.crown) && sway.shaking, { lp, dt, sway });
    await P.page.waitForTimeout(700);
    await shot(P, '5-tree');
  } else rec.ok('a tree near town', false, null);

  /* ── 5b. a mending waits while you stand in its footprint ── */
  const small = (await targets(P, ['barrel', 'crate', 'bench', 'trough', 'hitch', 'bush', 'stump', 'stone', 'haybale', 'signpost', 'fence'], 2600))[0];
  if (small) {
    await standBefore(P, small, 60);
    const t = (await targets(P, [small.id], 400)).find((q) => q.oi === small.oi) || small;
    const hp = await P.page.evaluate((oi) => window.__btWheelBreak.kind(oi).hp, t.oi);
    for (let k = 0; k < hp; k++) await shootAt(P, t);
    await P.page.waitForTimeout(300);
    const broke = await state(P, t.oi);
    /* step onto where it stood, and wait past its mending */
    const dy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g ? g.y - S.player.y : 52; });
    await H.hopTo(P, (t.box.x0 + t.box.x1) / 2, (t.box.y0 + t.box.y1) / 2 - dy, { tries: 30 });
    await P.page.waitForTimeout(REPAIR_MS + 1200);
    const held = await state(P, t.oi);
    const waited = await P.page.evaluate((oi) => window.__btWheelBreak.broken().find((b) => b.oi === oi) || null, t.oi);
    rec.ok(`while you stand where the ${t.id} stood, it is not mended over you (still broken ${((REPAIR_MS + 1200) / 1000).toFixed(1)} s on, waiting)`,
      broke.broken && held.broken && !!waited && waited.waited, { broke, held, waited });
    await H.hopTo(P, (t.box.x0 + t.box.x1) / 2, t.box.y1 + 90 - dy, { tries: 30 });
    await P.page.waitForTimeout(900);
    const freed = await state(P, t.oi);
    rec.ok('...step out and it is mended', !freed.broken && freed.drawn, freed);
  } else rec.ok('a small thing to break', false, null);

  /* ── 6. a building ── */
  const bld = (await targets(P, ['saloon', 'hotel', 'gambling', 'post', 'store', 'bank', 'auction', 'assay', 'sheriff', 'blacksmith', 'woodworker', 'gemcutter', 'cookhouse', 'feedseed', 'landoffice', 'guildhall'], 2600))[0];
  if (bld) {
    await standBefore(P, bld, 80);
    const t = (await targets(P, [bld.id], 600)).find((q) => q.oi === bld.oi) || bld;
    const k = await P.page.evaluate((oi) => window.__btWheelBreak.kind(oi), t.oi);
    let sl = null;
    for (let i = 0; i < k.hp; i++) sl = await shootAt(P, t, { dx: ((i % 5) - 2) * 30 });
    await P.page.waitForTimeout(300);
    const sb = await state(P, t.oi);
    const lp = sl && sl.sound;
    const cut = await P.page.evaluate(() => window.__btWheelObjects.shatterStats());
    await shot(P, '6-collapse');
    rec.ok(`the ${t.id} takes ${k.hp} arrows and COLLAPSES into ${sb.heap ? sb.heap.shards : 0} shards of its picture (cut in ${cut ? cut.cutMs : '?'} ms), with the building's crash (${lp ? lp.key : 'none'})`,
      sb.broken && !!sb.heap && sb.heap.shards >= 10 && !!lp && lp.what === 'break' && cut && cut.cutMs < 400, { sb, lp, cut });
    let sb2 = null;
    for (let i = 0; i < 40; i++) {
      await P.page.waitForTimeout(200);
      sb2 = await state(P, t.oi);
      if (!sb2.heap || sb2.heap.landed === sb2.heap.shards) break;
    }
    rec.ok(`...its pieces come down into a heap where it stood (${sb2.heap ? sb2.heap.landed : 0}/${sb2.heap ? sb2.heap.shards : 0})`,
      !!sb2.heap && sb2.heap.landed >= sb2.heap.shards - 1, sb2.heap);
    await shot(P, '7-ruins');
  } else rec.ok('a building to bring down', false, null);

  rec.ok('no page errors', errors.length === 0, errors);
}
