/* ═══ A BUILDING YOU KEEP HITTING CATCHES FIRE (v2.3.3230) ═══
 *
 * Owner, 2026-10-14: "When attacking buildings add flame effects on the
 * building after getting hit a while in the location where the building is
 * getting struck and make the flames grow higher the closer it gets to falling
 * apart. Keep the flames going as the building in pieces."
 *
 * On a phone viewport, against a real worker, in the Wheel's BroTown, with
 * `repairms=` so the mending comes in under a minute.  Shots are real arrows
 * in S.arrows, flown by the game's own arrow code (projectiles.js) into a real
 * building's footprint, as mp-wheelbreak's:
 *   1. two hits: the fire knows where they landed, and nothing burns yet;
 *   2. the third: it smoulders (smoke, no flames);
 *   3. the sixth (a quarter of its 24): it CATCHES, where the arrows struck,
 *      on its face between its foot and its top;
 *   4. hits on its other side: a second fire there, none between;
 *   5. on to the 23rd: the flames grow higher and more at every stage, the
 *      building darkens with soot, and the fire sorts a quarter step after the
 *      building in its layer (over it, under a player in front of it);
 *   6. every fire sprite draws from the campfire's atlas (nothing new loaded);
 *   7. the 24th: it collapses and its pieces fall BURNING, riding the shards;
 *   8. landed, they burn on, charred; later still burning, steadier;
 *   9. mended: the fires go out with the heap, nothing of them left;
 *  10. hit again and left alone: its fire sinks and is out when the count is
 *      forgotten (HEAL_MS), the soot gone with it;
 *  11. no page errors.
 * Pictures in tools/qa/mp/out/buildingfire-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
/* long enough for the rubble's checks and pictures between the break and the
   mending, on this box's slow headless frames */
const REPAIR_MS = 45000;
const WHEELISH = (z) => z === 'worldview' || z === 'wheel';
const BOW_H = 30;     /* a shot flies this far above the ground line (the bow grip) */
const BUILDINGS = ['saloon', 'hotel', 'gambling', 'post', 'store', 'bank', 'auction', 'sheriff', 'blacksmith', 'woodworker', 'gemcutter', 'cookhouse', 'feedseed', 'landoffice', 'guildhall'];

/* (mp-wheelbreak's) the objects of kind `ids` near the player whose footprint
   is in the walk test now, nearest first */
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

async function standBefore(P, t, gap = 70) {
  const dy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g ? g.y - S.player.y : 52; });
  const x = (t.box.x0 + t.box.x1) / 2;
  await H.hopTo(P, x + 18, t.box.y1 + gap - dy, { tries: 60 });
  await P.page.waitForTimeout(500);
}

/* (mp-wheelbreak's) one real arrow from just south of `t`'s footprint,
   straight at its south face, `dx` across it: resolved when it lands */
const shootAt = (P, t, o = {}) => P.page.evaluate(({ t, o, BOW_H }) => new Promise((resolve) => {
  const S = window._gameState.current;
  const gx = (t.box.x0 + t.box.x1) / 2 + (o.dx || 0), gy = t.box.y1 + (o.from || 46);
  const ang = -Math.PI / 2;
  if (S.rpg) S.rpg.activeSlot = 'ranged';
  S.lockedTarget = null;
  S._aiming = true; S._aimAngle = ang; S._lastAimAngle = ang;
  const a = {
    ang, dist: 0, fromGrip: false, dmg: 1, life: 400, maxLife: 400,
    hitIds: new Set((S.monsters || []).map((m) => m.id)),
    isStaff: false, speedPx: 10, _bornTs: Date.now() - 500, _released: true,
    _qaId: 'qa-bf-' + Math.random(), _pathX: gx, _pathY: gy - BOW_H, _ox: 0, _oy: -BOW_H,
  };
  S.arrows = (S.arrows || []).filter((x) => x._qaId == null);
  S.arrows.push(a);
  let n = 0;
  const t0 = performance.now();
  const B = window.__btWheelBreak;
  const d0 = B.damage(t.oi), b0 = B.stats.breaks;
  const tick = () => {
    const alive = (S.arrows || []).indexOf(a) >= 0;
    const landed = B.damage(t.oi) !== d0 || B.stats.breaks !== b0;
    if (landed || !alive || a.planted || a.planting || ++n > 400 || performance.now() - t0 > 6000) {
      resolve({ landed, x: a._renderX, y: a._renderY, ms: Math.round(performance.now() - t0) });
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}), { t, o, BOW_H });

const fireOf = (P, oi) => P.page.evaluate((oi) => (window.__btWheelObjects.fires() || []).find((f) => f.oi === oi) || null, oi);
const damageOf = (P, oi) => P.page.evaluate((oi) => window.__btWheelBreak.damage(oi), oi);
/* every Container the fires draw in, anywhere in the scene, and the pictures
   their sprites draw from */
const fireScene = (P) => P.page.evaluate(() => {
  const r = window._pixiRenderer;
  const st = r && r.app && r.app.stage;
  const roots = [], uids = new Set();
  let sprites = 0;
  const walk = (n, inFire) => {
    if (!n) return;
    const here = inFire || n.label === 'buildingFire';
    if (n.label === 'buildingFire') roots.push({ visible: n.visible !== false, layer: n.parent ? n.parent.label || '?' : null });
    if (here && n.texture && n.texture.source) { sprites++; uids.add(n.texture.source.uid); }
    for (const c of n.children || []) walk(c, here);
  };
  walk(st, false);
  return { roots: roots.length, visibleRoots: roots.filter((x) => x.visible).length, sprites, uids: [...uids], atlas: window.__btBuildingFire.atlas() };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  /* (the first lesson's card, put away so the pictures show the building) */
  const shot = async (P, name) => {
    await P.page.evaluate(() => {
      for (const el of document.querySelectorAll('[data-coach-card], [data-coach-ring]')) el.style.visibility = 'hidden';
    }).catch(() => {});
    return P.page.screenshot({ path: join(OUT, `buildingfire-${name}.png`) });
  };
  const P = await H.newPlayer(browser, { name: 'Firebug', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query: `repairms=${REPAIR_MS}` });
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
  const probes = await P.page.evaluate(() => ({
    fires: !!(window.__btWheelObjects && window.__btWheelObjects.fires), on: !!(window.__btBuildingFire && window.__btBuildingFire.on),
    rules: window.__btBuildingFire ? window.__btBuildingFire.rules : null, repairMs: window.__btWheelBreak ? window.__btWheelBreak.repairMs : null,
    healMs: window.__btWheelBreak ? window.__btWheelBreak.healMs : null, atlas: window.__btBuildingFire ? window.__btBuildingFire.atlas() : null,
  }));
  rec.ok(`setup: in the Wheel (${zone}), the buildings' fire on, its probes there, the mending ${probes.repairMs} ms for this test`,
    WHEELISH(zone) && probes.fires && probes.on && probes.repairMs === REPAIR_MS && probes.healMs === 30000 && probes.atlas != null, probes);
  const R = probes.rules || {};

  const bld = (await targets(P, BUILDINGS, 2600))[0];
  if (!bld) { rec.ok('a building to set alight', false, null); rec.ok('no page errors', errors.length === 0, errors); return; }
  await standBefore(P, bld, 80);
  const t = (await targets(P, [bld.id], 600)).find((q) => q.oi === bld.oi) || bld;
  const k = await P.page.evaluate((oi) => window.__btWheelBreak.kind(oi), t.oi);
  const hp = k.hp;
  const cx = (t.box.x0 + t.box.x1) / 2;
  const LEFT = -90, RIGHT = 80;
  const hits = [];
  const fire = async (n, dx) => { for (let i = 0; i < n; i++) hits.push({ dx, ...(await shootAt(P, t, { dx })) }); };
  /* the picture's box: the fire must be on it */
  const pic = { x0: t.x - t.w / 2, x1: t.x + t.w / 2, top: t.y - t.h, foot: t.y };

  /* ── 1. two hits: noted, nothing burns ── */
  await fire(2, LEFT);
  await P.page.waitForTimeout(600);
  const f1 = await fireOf(P, t.oi);
  rec.ok(`two arrows into the ${t.id} (${hp} to bring it down): the fire knows where they struck (${f1 ? f1.spots.length : 0} spot), and nothing burns or smokes yet`,
    !!f1 && f1.spots.length === 1 && Math.abs(f1.spots[0].x - (cx + LEFT)) < 40 && f1.flames === 0 && f1.smoke === 0 && hits.every((h) => h.landed),
    { f1, hits });

  /* ── 2. the third: it smoulders ── */
  await fire(1, LEFT);
  let f2 = null;
  /* v2.3.3482: up to 10 s for the first puff, not ten looks.  The fire's
     clock moves at most 0.1 s a frame (buildingFire.js `dt`), and a smoulder
     puffs 0.4 + 1.6 x its level a second from a random start, so on a machine
     drawing ~3 frames a second the first puff can take 3-9 s; ten looks
     (~2.5-5 s) missed it (the sweep of 2026-10-19: smoulder 0.42, no puff yet,
     TRAPS §200).  Never as long as the 12 s after which a smoulder sinks. */
  for (const t0 = Date.now(); Date.now() - t0 < 10000;) { await P.page.waitForTimeout(250); f2 = await fireOf(P, t.oi); if (f2 && f2.smoke > 0) break; }
  await shot(P, '1-smoulder');
  rec.ok(`the third (${(3 / hp * 100).toFixed(0)}% of the way to breaking, past ${R.SMOULDER * 100}%): it SMOULDERS -- smoke from where it was hit (${f2 ? f2.smoke : 0} puffs), no flames`,
    !!f2 && f2.smoke > 0 && f2.flames === 0, f2);

  /* ── 3. the sixth: it catches, where it was struck ── */
  const catchAt = Math.ceil(R.IGNITE * hp);
  await fire(catchAt - 3, LEFT);
  let f3 = null;
  for (let i = 0; i < 10; i++) { await P.page.waitForTimeout(250); f3 = await fireOf(P, t.oi); if (f3 && f3.flames > 0) break; }
  await P.page.waitForTimeout(400);
  f3 = await fireOf(P, t.oi);
  await shot(P, '2-caught');
  const sp3 = f3 && f3.spots[0];
  rec.ok(`hit ${catchAt} of ${hp}: it CATCHES -- ${f3 ? f3.flames : 0} flame(s), ${f3 ? f3.tallest : 0} px tall, where the arrows struck (the spot ${sp3 ? Math.round(sp3.x - cx) : '?'} px across, the shots at ${LEFT})`,
    !!f3 && f3.flames > 0 && f3.tallest > 8 && !!sp3 && Math.abs(sp3.x - (cx + LEFT)) < 40, f3);
  rec.ok(`...on the building's face: between its foot (${Math.round(pic.foot)}) and its top (${Math.round(pic.top)}), inside its width`,
    !!sp3 && sp3.y < pic.foot && sp3.y > pic.top && sp3.x > pic.x0 && sp3.x < pic.x1 && f3.top != null && f3.top > pic.top - 200, { sp3, pic, top: f3 && f3.top });

  /* ── 4. its other side: a second fire there, none between ── */
  const half = Math.round(hp / 2);
  await fire(half - catchAt, RIGHT);
  await P.page.waitForTimeout(700);
  const f4 = await fireOf(P, t.oi);
  await shot(P, '3-half');
  const right = f4 && f4.spots.find((s) => Math.abs(s.x - (cx + RIGHT)) < 40);
  const between = f4 && f4.spots.find((s) => Math.abs(s.x - cx) < 30);
  rec.ok(`hits on its other side: a second fire there (${right ? 'burning, heat ' + right.heat : 'none'}), none in the middle where nothing struck (${f4 ? f4.spots.length : 0} spots)`,
    !!f4 && f4.spots.length === 2 && !!right && right.heat > 0 && !between, f4);

  /* ── 5. on to the last hit before the break: higher, and more ── */
  const stages = [{ hit: catchAt, f: f3 }, { hit: half, f: f4 }];
  const three = Math.round(hp * 0.75);
  await fire(three - half, LEFT);
  await P.page.waitForTimeout(700);
  const f5 = await fireOf(P, t.oi);
  stages.push({ hit: three, f: f5 });
  await shot(P, '4-three-quarters');
  await fire(hp - 1 - three, RIGHT);
  await P.page.waitForTimeout(700);
  const f6 = await fireOf(P, t.oi);
  stages.push({ hit: hp - 1, f: f6 });
  await shot(P, '5-about-to-fall');
  const rows = stages.map((s) => ({ hit: s.hit, flames: s.f ? s.f.flames : 0, tallest: s.f ? s.f.tallest : 0, top: s.f ? s.f.top : null, heat: s.f ? s.f.heat : 0 }));
  let grows = true;
  for (let i = 1; i < rows.length; i++) {
    if (!(rows[i].tallest >= rows[i - 1].tallest && rows[i].top <= rows[i - 1].top && rows[i].flames >= rows[i - 1].flames && rows[i].heat > rows[i - 1].heat)) grows = false;
  }
  rec.ok(`the flames grow HIGHER the nearer it is to falling: ${rows.map((r) => `hit ${r.hit}: ${r.flames} flames, ${r.tallest} px, top ${r.top != null ? Math.round(pic.foot - r.top) : '?'} px up`).join('; ')}`,
    grows && rows[rows.length - 1].tallest >= rows[0].tallest * 2 && (pic.foot - rows[rows.length - 1].top) - (pic.foot - rows[0].top) >= 100, rows);
  rec.ok(`...the fire sorts with the building: in its layer (${f6 ? f6.layer : '?'}), a quarter step after it (${f6 ? f6.dz : '?'}): over the building, under you in front of it`,
    !!f6 && f6.layer === f6.hostLayer && f6.dz === 0.25, f6 && { layer: f6.layer, hostLayer: f6.hostLayer, dz: f6.dz });
  const tint = f6 && f6.tint;
  rec.ok(`...and the building darkens with soot (tint ${tint != null ? '#' + tint.toString(16) : '?'})`,
    tint != null && tint !== 0xffffff && ((tint >> 16) & 255) < 240, { tint });
  const sc = await fireScene(P);
  rec.ok(`every fire sprite (${sc.sprites}) draws from the campfire's own atlas: nothing new loaded or made`,
    sc.sprites > 10 && sc.uids.length === 1 && sc.uids[0] === sc.atlas, sc);

  /* ── 7. the break: its pieces fall burning ── */
  await fire(1, LEFT);
  const brokeAt = Date.now();
  await P.page.waitForTimeout(250);
  const f7 = await fireOf(P, t.oi);
  await shot(P, '6-collapse');
  const onShards = f7 ? f7.rubble.filter((r) => r.onShard).length : 0;
  rec.ok(`hit ${hp}: it collapses and its pieces fall BURNING -- ${f7 ? f7.rubble.length : 0} fires riding ${onShards} of its shards`,
    !!f7 && f7.mode === 'rubble' && f7.rubble.length >= 6 && onShards >= 6, f7 && { mode: f7.mode, rubble: f7.rubble });

  /* ── 8. landed, they burn on, charred; later, steadier ── */
  let f8 = null, heapLanded = null;
  for (let i = 0; i < 40; i++) {
    await P.page.waitForTimeout(250);
    const heap = await P.page.evaluate((oi) => window.__btWheelObjects.shards().find((h) => h.oi === oi) || null, t.oi);
    heapLanded = heap;
    if (heap && heap.landed >= heap.shards - 1) break;
  }
  await P.page.waitForTimeout(600);
  f8 = await fireOf(P, t.oi);
  await shot(P, '7-rubble');
  const burning8 = f8 ? f8.rubble.filter((r) => r.flames > 0) : [];
  const landedBurnt = f8 ? f8.rubble.filter((r) => r.landed && r.burnt).length : 0;
  rec.ok(`landed in a heap, the pieces burn on (${burning8.length} burning, ${landedBurnt} of them charred and lying where they fell; the heap's ${heapLanded ? heapLanded.burnt : 0} burnt pieces)`,
    burning8.length >= 6 && landedBurnt >= 6 && !!heapLanded && heapLanded.burnt >= 6, { f8: f8 && f8.rubble, heap: heapLanded });
  const sortedRubble = f8 ? f8.rubble.filter((r) => r.onShard && r.dz === 0.25 && r.layer === r.hostLayer).length : 0;
  rec.ok(`...each burning piece sorts with its own piece (${sortedRubble} of ${f8 ? f8.rubble.length : 0} a quarter step after it)`,
    !!f8 && sortedRubble >= f8.rubble.filter((r) => r.onShard).length && sortedRubble >= 6, f8 && f8.rubble.map((r) => ({ dz: r.dz, layer: r.layer, host: r.hostLayer })));
  await P.page.waitForTimeout(Math.max(0, (R.SETTLE_MS || 14000) + 1500 - (Date.now() - brokeAt)));
  const f9 = await fireOf(P, t.oi);
  await shot(P, '8-rubble-later');
  const burning9 = f9 ? f9.rubble.filter((r) => r.flames > 0) : [];
  const meanHeat = burning9.length ? burning9.reduce((s, r) => s + r.heat, 0) / burning9.length : 0;
  rec.ok(`${Math.round((R.SETTLE_MS || 14000) / 1000)} s on, still burning in pieces, steadier (${burning9.length} fires, mean heat ${meanHeat.toFixed(2)} of the collapse's 1)`,
    burning9.length >= 6 && meanHeat > 0.15 && meanHeat < 0.85, f9 && f9.rubble.map((r) => r.heat));

  /* ── 9. mended: the fires go out with the heap ── */
  let f10 = 'x', mended = false;
  for (let i = 0; i < 160; i++) {
    await P.page.waitForTimeout(500);
    const st = await P.page.evaluate((oi) => ({ broken: window.__btWheelBreak.broken().some((b) => b.oi === oi), drawn: window.__btWheelObjects.drawn(oi) }), t.oi);
    if (!st.broken && st.drawn) { mended = true; break; }
  }
  for (let i = 0; i < 24; i++) {
    await P.page.waitForTimeout(250);
    f10 = await fireOf(P, t.oi);
    if (!f10) break;
  }
  await P.page.waitForTimeout(300);
  const scene10 = await fireScene(P);
  await shot(P, '9-mended');
  const tint10 = await P.page.evaluate((oi) => { const s = window.__btWheelObjects.sprite(oi); return s ? s : null; }, t.oi);
  rec.ok(`mended: its fires go out with the heap -- no fire left for it (${f10 ? f10.mode : 'none'}) and nothing of them in the scene (${scene10.roots} fire containers)`,
    mended && !f10 && scene10.roots === 0, { mended, f10, scene10, tint10 });

  /* ── 10. hit again and left alone: it sinks and goes out ── */
  await P.page.waitForTimeout(1800);   /* (faded back in) */
  const again = Math.ceil(hp / 3);
  await fire(again, LEFT);
  await P.page.waitForTimeout(1500);
  const g1 = await fireOf(P, t.oi);
  const leftAt = Date.now();
  await P.page.waitForTimeout(Math.max(0, 21000 - (Date.now() - leftAt)));
  const g2 = await fireOf(P, t.oi);
  await shot(P, '10-cooling');
  rec.ok(`hit again (${again} arrows) and left alone: from ${Math.round((R.COOL_START || 12000) / 1000)} s its fire sinks (heat ${g1 ? g1.heat : '?'} -> ${g2 ? g2.heat : '?'} at 21 s)`,
    !!g1 && g1.flames > 0 && !!g2 && g2.heat < g1.heat * 0.8, { g1: g1 && { heat: g1.heat, flames: g1.flames }, g2: g2 && { heat: g2.heat, flames: g2.flames } });
  let g3 = 'x';
  for (let i = 0; i < 40; i++) {
    await P.page.waitForTimeout(500);
    g3 = await fireOf(P, t.oi);
    if (!g3 && Date.now() - leftAt > 30000) break;
  }
  const dmg3 = await damageOf(P, t.oi);
  const scene11 = await fireScene(P);
  const tint11 = await P.page.evaluate((oi) => {
    const W = window.__btWheelObjects;
    /* the drawn sprite's tint, read off the scene */
    const r = window._pixiRenderer, st = r && r.app && r.app.stage;
    let found = null;
    const walk = (n) => { if (!n || found) return; if (n._wheelObject === oi) { found = n; return; } for (const c of n.children || []) walk(c); };
    walk(st);
    return found ? found.tint : (W.drawn(oi) ? 'drawn?' : null);
  }, t.oi);
  await shot(P, '11-out');
  rec.ok(`...and is OUT once the hits are forgotten (${Math.round((probes.healMs || 30000) / 1000)} s): no fire, its count gone (${dmg3}), no soot left (tint ${typeof tint11 === 'number' ? '#' + tint11.toString(16) : tint11}), nothing of it in the scene (${scene11.roots})`,
    !g3 && dmg3 === 0 && tint11 === 0xffffff && scene11.roots === 0, { g3, dmg3, tint11, scene11 });

  rec.ok('no page errors', errors.length === 0, errors);
}
