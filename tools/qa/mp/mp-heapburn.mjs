/* A BURNING HEAP SETS YOU ON FIRE -- v2.3.3748 (client game/heapBurn.js,
 * rendering/buildingFire.js burningAt / PersonFire; server heapburn.js).
 *
 * The owner, 2026-10-28: "if you stand in a burning pile of flames from a
 * building prop getting destroyed you get on fire and take damage (same flame
 * effect as the building)".
 *
 * On a phone in BroTown, against a real worker:
 *   1. a building brought down burning -- four of the game's own slime blasts
 *      at its face (wheelBreak's `blast`: six hits each, so it catches at the
 *      first and falls at the fourth), its heap's pieces burning where they lie;
 *   2. standing in a burning piece: the building's own flames on you
 *      (PersonFire, drawn from the campfire's atlas), and the worker's burn
 *      ticks -- `heapburn`, flame -- taking your health, as the worker says;
 *   3. walked out: the ticks stop and the flames on you go out;
 *   4. walked out, the building mended: its heap's fire is gone, and back where
 *      it lay nothing burns (it is never mended on top of you, so a heap
 *      burns on while you stand in it);
 *   5. a second building's heap, stayed in to the end (the owner: "Yeah let
 *      the fire finish you off"): burned to death ("BURNED TO DEATH",
 *      `monster:heap`), back in BroTown, the flames off;
 *   6. no page errors.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
/* the heap lies long enough for the checks, then is mended (step 5) */
const REPAIR_MS = 60000;
const BUILDINGS = ['saloon', 'hotel', 'gambling', 'post', 'store', 'bank', 'auction', 'sheriff', 'blacksmith', 'woodworker', 'gemcutter', 'cookhouse', 'feedseed', 'landoffice', 'guildhall'];

/* (mp-buildingfire's) the buildings near the player, nearest first */
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
const feetDy = (P) => P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g && Number.isFinite(g.y) ? g.y - S.player.y : 52; });
const heapTicks = (P, since) => P.page.evaluate((since) => (window.__btElemLog || []).filter((e) => e.at >= since && e.ability === 'heapburn'), since);

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = async (P, name) => {
    await P.page.evaluate(() => { for (const el of document.querySelectorAll('[data-coach-card], [data-coach-ring]')) el.style.visibility = 'hidden'; }).catch(() => {});
    return P.page.screenshot({ path: join(OUT, `heapburn-${name}.png`) });
  };
  const P = await H.newPlayer(browser, { name: 'Singed', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query: `repairms=${REPAIR_MS}` });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String(e && e.message || e).slice(0, 200)));
  await H.enterWorld(P);
  let zone = null;
  for (let i = 0; i < 120; i++) {
    zone = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
    if (zone === 'wheel') break;
    await P.page.waitForTimeout(500);
  }
  await P.page.waitForTimeout(2500);
  const myId = await H.readState(P, (S) => S.myId);
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();
  const caps = await H.readState(P, (S) => !!(S._serverCaps && S._serverCaps.heapburn));
  rec.ok(`setup: in the world (${zone}), the worker burns (caps.heapburn)`, zone === 'wheel' && caps);

  const dy = await feetDy(P);
  /* a building brought down burning: four of the game's own slime blasts at
     its face; its heap's burning, landed pieces */
  const bringDown = async (b) => {
    const cx = (b.box.x0 + b.box.x1) / 2;
    await H.hopTo(P, cx + 20, b.box.y1 + 220 - dy, { tries: 60 });
    await P.page.waitForTimeout(800);
    for (let i = 0; i < 4; i++) {
      await P.page.evaluate(({ x, y }) => window.__btWheelBreak.blast(x, y, 50), { x: cx, y: b.box.y1 + 12 });
      await P.page.waitForTimeout(700);
    }
    let pieces = [];
    for (let i = 0; i < 40; i++) {
      await P.page.waitForTimeout(300);
      pieces = await P.page.evaluate((oi) => window.__btBuildingFire.heapFires().filter((f) => f.oi === oi), b.oi);
      if (pieces.length && pieces.filter((f) => f.landed && f.heat > 0.15).length >= 4) break;
    }
    return pieces.filter((f) => f.landed && f.heat > 0.15);
  };
  /* your boots in one of them: the piece nearest the street first */
  const standIn = async (lit) => {
    const order = lit.slice().sort((a, b) => b.y - a.y);
    for (const pc of order.slice(0, 4)) {
      await H.hopTo(P, pc.x, pc.y - dy, { step: 60, gap: 200, tries: 20 });
      await P.page.waitForTimeout(500);
      const at = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return { x: S.player.x, y: g && Number.isFinite(g.y) ? g.y : S.player.y + 52 }; });
      if (await P.page.evaluate(({ x, y }) => window.__btBuildingFire.burningAt(x, y), at) >= 0) return { pc, at };
    }
    return null;
  };

  /* ── 1. a building brought down burning ── */
  const bld = (await targets(P, BUILDINGS, 2600))[0];
  if (!bld) { rec.ok('a building to bring down', false); stopAlive = true; return; }
  const lit = await bringDown(bld);
  const pieces = lit;
  await shot(P, '1-heap');
  rec.ok(`the ${bld.id} brought down burning: ${lit.length} of its heap's pieces burning where they lie`, lit.length >= 4, pieces);
  if (!lit.length) { rec.ok('no page errors', errors.length === 0, errors); stopAlive = true; await P.ctx.close().catch(() => {}); return; }

  /* ── 2. stand in one ── */
  const stood = await standIn(lit);
  rec.ok('your boots in a burning piece of the heap', !!stood, { lit, stood });
  if (!stood) { rec.ok('no page errors', errors.length === 0, errors); stopAlive = true; await P.ctx.close().catch(() => {}); return; }
  const sv0 = await H.serverPlayer(wsPort, myId).catch(() => null);
  const t0 = await P.page.evaluate(() => Date.now());
  let fire = null, ticks = [];
  for (let i = 0; i < 24; i++) {
    await P.page.waitForTimeout(300);
    fire = await P.page.evaluate(() => window.__btPersonFire || null);
    ticks = await heapTicks(P, t0);
    if (i === 6) await shot(P, '2-onfire');
    if (ticks.length >= 3 && fire && fire.flames > 0 && i >= 6) break;
  }
  const sv1 = await H.serverPlayer(wsPort, myId).catch(() => null);
  const uids = await P.page.evaluate(() => {
    const r = window._pixiRenderer, st = r && r.app && r.app.stage;
    const set = new Set(); let n = 0;
    const walk = (c, inside) => {
      if (!c) return;
      const here = inside || c.label === 'personFire';
      if (here && c.texture && c.texture.source && c.visible !== false) { set.add(c.texture.source.uid); n++; }
      for (const k of c.children || []) walk(k, here);
    };
    walk(st, false);
    return { n, uids: [...set], atlas: window.__btBuildingFire.atlas() };
  });
  rec.ok(`on fire: the building's own flames on you (${fire ? fire.flames : 0} flames, from the campfire's atlas: ${uids.uids.join(',')} = ${uids.atlas})`,
    !!fire && fire.visible && fire.flames > 0 && uids.uids.length === 1 && uids.uids[0] === uids.atlas, { fire, uids });
  const hp0 = sv0 && sv0.hp, hp1 = sv1 && sv1.hp;
  rec.ok(`the worker burns you: ${ticks.length} ticks (${ticks.map((t) => t.dmgTaken).join(', ')}), flame; health ${hp0} -> ${hp1}`,
    ticks.length >= 2 && ticks.every((t) => t.elem === 'flame' && t.dmgTaken > 0) && typeof hp0 === 'number' && hp1 < hp0, { ticks, hp0, hp1 });
  const gaps = ticks.slice(1).map((t, i) => t.at - ticks[i].at);
  rec.ok(`...at the worker's pace, about a second apart (${gaps.join(', ')} ms)`, gaps.every((g) => g >= 800), gaps);

  /* ── 3. walk out ── */
  await H.hopTo(P, stood.pc.x, stood.pc.y - dy + 260, { step: 60, gap: 200, tries: 20 });
  const out0 = await P.page.evaluate(() => Date.now());
  await P.page.waitForTimeout(1500);
  const t1 = await P.page.evaluate(() => Date.now());
  await P.page.waitForTimeout(3000);
  const late = await heapTicks(P, t1);
  let gone = null;
  for (let i = 0; i < 20; i++) {
    gone = await P.page.evaluate(() => window.__btPersonFire || null);
    if (gone && gone.flames === 0) break;
    await P.page.waitForTimeout(300);
  }
  const outAt = await P.page.evaluate(() => { const S = window._gameState.current; return { inIt: window.__btBuildingFire.burningAt(S.player.x, S.player.y + 52) }; });
  await shot(P, '3-out');
  rec.ok(`walked out: no more ticks (${late.length} after leaving) and the flames on you go out (${gone ? gone.flames : '?'} flames)`,
    outAt.inIt < 0 && late.length === 0 && !!gone && gone.flames === 0, { late, gone, outAt, out0 });

  /* ── 4. the building mended: its heap's fire is gone, and nothing burns
     where it lay.  (It is never mended on top of you -- wheelBreak waits
     while you stand in its footprint -- so its heap burns on while you stay
     in it; out of it, here, it mends on time.) ── */
  let mended = false, mendAt = 0;
  for (let i = 0; i < 160 && !mended; i++) {
    await P.page.waitForTimeout(500);
    const st = await P.page.evaluate((oi) => ({ broken: window.__btWheelBreak.broken().some((b) => b.oi === oi), now: Date.now() }), bld.oi);
    if (!st.broken) { mended = true; mendAt = st.now; }
  }
  /* back where the burning piece lay: the building's foot now */
  await H.hopTo(P, stood.pc.x, stood.pc.y - dy, { step: 60, gap: 200, tries: 20 });
  await P.page.waitForTimeout(4000);
  const after = await heapTicks(P, mendAt);
  const inIt = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return window.__btBuildingFire.burningAt(S.player.x, g && Number.isFinite(g.y) ? g.y : S.player.y + 52); });
  const left = await P.page.evaluate((oi) => window.__btBuildingFire.heapFires().filter((f) => f.oi === oi).length, bld.oi);
  await shot(P, '4-mended');
  rec.ok(`the ${bld.id} mended: its heap's fire gone (${left} burning pieces), nothing burning where it lay, no tick since (${after.length})`,
    mended && left === 0 && inIt < 0 && after.length === 0, { mended, left, inIt, after });

  /* ── 5. stay in it to the end, in a second building's heap (a death takes
     you out of the world, and your screen's heaps with it) ── */
  const bld2 = (await targets(P, BUILDINGS, 2600)).filter((b) => b.oi !== bld.oi)[0];
  const lit2 = bld2 ? await bringDown(bld2) : [];
  const stood2 = lit2.length ? await standIn(lit2) : null;
  rec.ok(`a second building (${bld2 ? bld2.id : 'none'}) brought down burning, and your boots in it`, !!stood2, { lit2 });
  if (!stood2) { rec.ok('no page errors', errors.length === 0, errors); stopAlive = true; await P.ctx.close().catch(() => {}); return; }
  await H.devOp(wsPort, 'vitals', myId, { heal: true, hp: 30 });
  const d0 = await P.page.evaluate(() => Date.now());
  let death = null;
  for (let i = 0; i < 60 && !death; i++) {
    await P.page.waitForTimeout(300);
    death = await P.page.evaluate((d0) => { const d = window.__btLastDeath; return d && d.at >= d0 ? d : null; }, d0);
  }
  const words = await P.page.evaluate(() => (window._gameState.current.dmgNumbers || []).map((p) => p.text).filter((t) => /DIED|BURNED/.test(t)));
  await shot(P, '5-burned');
  rec.ok(`stayed in to the end: burned to death (${death ? death.cause : 'no death'}; it reads ${JSON.stringify(words)})`,
    !!death && death.cause === 'monster:heap' && words.indexOf('BURNED TO DEATH') >= 0, { death, words });
  let back = null;
  for (let i = 0; i < 120; i++) {
    await P.page.waitForTimeout(500);
    back = await P.page.evaluate(() => { const S = window._gameState.current; return { zone: S._zoneLoading ? null : S.currentZone, dying: !!S._dying, hp: S.rpg ? S.rpg.hp : null, fire: window.__btPersonFire || null }; });
    if (back.zone === 'wheel' && !back.dying && back.hp > 0) break;
  }
  const sv2 = await H.serverPlayer(wsPort, myId).catch(() => null);
  await P.page.waitForTimeout(1500);
  const fire2 = await P.page.evaluate(() => window.__btPersonFire || null);
  rec.ok(`...back in BroTown, alive (${back && back.hp} HP), the flames off (${fire2 ? fire2.flames : '?'})`,
    !!back && back.zone === 'wheel' && !back.dying && back.hp > 0 && !!sv2 && !sv2.dead && !!fire2 && fire2.flames === 0, { back, sv: sv2 && { hp: sv2.hp, dead: sv2.dead }, fire2 });

  rec.ok('no page errors', errors.length === 0, errors);
  stopAlive = true;
  await P.ctx.close().catch(() => {});
}
