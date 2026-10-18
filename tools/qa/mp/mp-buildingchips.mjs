/* ═══ A BUILDING SHOWS EVERY HIT (v2.3.3467) ═══
 *
 * Owner, 2026-10-18: "add wood chip effect when you attack buildings so you
 * get instant feedback that the building is getting damaged (not just when you
 * attack for a while and start to see flames)".
 *
 * A building's hit was thrown as a prop's -- under half the pieces (about two
 * small splinters an arrow) -- and the weapon's way, which for a wall is INTO
 * it, where a piece north of the hit's ground line is drawn under the
 * building's own picture.  Now a building throws half as many pieces again as
 * a plain hit of its material, bigger, out of the face that was hit toward the
 * camera (hitMaterialFx.js, A BUILDING SHOWS EVERY HIT).
 *
 * On a computer (1280 x 800), against a real worker, in the Wheel's BroTown.
 * Shots are real arrows in S.arrows flown by the game's own arrow code into a
 * real building's footprint (mp-buildingfire's), and a swing is a real click:
 *   1. one arrow into a WOODEN building: at least 6 wood pieces (splinters)
 *      and its sawdust, nearly all of them drawn in front of the building, and
 *      landing on the camera's side of the wall
 *   2. a sword's swing at it (a real mouse click): the same, out of the face
 *      it struck, toward you
 *   3. one arrow into a STONE building: its chips and dust, in front
 *   4. a barrel (a prop, not a building) is unchanged: a few pieces only
 *   5. no page errors
 */
import * as H from './harness.mjs';

const DESK = { width: 1280, height: 800 };
const BOW_H = 30;     /* a shot flies this far above the ground line (the bow grip) */
const WOODEN = ['saloon', 'hotel', 'gambling', 'post', 'cookhouse', 'feedseed', 'landoffice', 'guildhall', 'woodworker'];
const STONE = ['bank', 'sheriff', 'blacksmith', 'gemcutter', 'store', 'auction'];

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
  await P.page.waitForTimeout(800);
}

/* (mp-buildingfire's) one real arrow from just south of `t`'s footprint,
   straight at its south face, `dx` across it: resolved when it lands */
const shootAt = (P, t, o = {}) => P.page.evaluate(({ t, o, BOW_H }) => new Promise((resolve) => {
  const S = window._gameState.current;
  const gx = (t.box.x0 + t.box.x1) / 2 + (o.dx || 0), gy = t.box.y1 + (o.from || 46);
  const ang = -Math.PI / 2;
  S.lockedTarget = null;
  const a = {
    ang, dist: 0, fromGrip: false, dmg: 1, life: 400, maxLife: 400,
    hitIds: new Set((S.monsters || []).map((m) => m.id)),
    isStaff: false, speedPx: 10, _bornTs: Date.now() - 500, _released: true,
    _qaId: 'qa-bc-' + Math.random(), _pathX: gx, _pathY: gy - BOW_H, _ox: 0, _oy: -BOW_H,
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

/* the first burst of `fx` after `id0`, read once it is `age` ms old: its
   pieces out of the wall, its dust (600 ms at the least) still in the air */
const lastId = (P) => P.page.evaluate(() => (window.__btDebris ? window.__btDebris() : []).reduce((m, b) => Math.max(m, b.id), 0));
async function burstAfter(P, id0, fx, age = 400) {
  for (let i = 0; i < 60; i++) {
    const all = await P.page.evaluate(() => (window.__btDebris ? window.__btDebris() : []));
    const b = all.find((x) => x.id > id0 && x.fx === fx);
    if (b && b.age >= age) return b;
    await P.page.waitForTimeout(100);
  }
  return null;
}
const inFront = (b) => (b && (b.front + b.back) > 0 ? b.front / (b.front + b.back) : 0);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Chipper', wsPort, webPort, viewport: DESK, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stopAlive = H.keepAlive(P, 15000);
  try {
    await H.enterWorld(P);
    const zone = await H.waitFor(P, (S) => (S._zoneLoading ? null : S.currentZone), (z) => z === 'wheel', { timeout: 120000, label: 'in the Wheel' }).catch(() => null);
    await P.page.waitForTimeout(2500);
    const myId = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'quests', myId).catch(() => {});
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
    await H.devOp(wsPort, 'kit', myId, { what: 'weapons' }).catch(() => {});
    await P.page.waitForTimeout(1500);
    const sw = await H.equipWeapon(P, 'greatsword', 'weapon', 'melee');
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    rec.ok('setup: a computer in the Wheel with a sword (guard)', zone === 'wheel' && !!sw.ok, { zone, sw });

    /* ── 1. an arrow into a wooden building ── */
    const wood = (await targets(P, WOODEN, 2600))[0];
    if (!wood) { rec.ok('a wooden building to hit', false, null); return; }
    await standBefore(P, wood, 80);
    const tw = (await targets(P, [wood.id], 600)).find((q) => q.oi === wood.oi) || wood;
    let id0 = await lastId(P);
    const s1 = await shootAt(P, tw, { dx: -30 });
    const b1 = await burstAfter(P, id0, 'wood');
    rec.ok(`1. one arrow into the ${tw.id} (landed ${s1.landed}) throws ${b1 && b1.parts} splinters and ${b1 && b1.dust} sawdust, ${Math.round(inFront(b1) * 100)}% drawn in front of it, landing ${b1 && b1.meanDy} px toward the camera (was about 2, mostly behind it)`,
      s1.landed && !!b1 && b1.parts >= 6 && b1.dust >= 2 && inFront(b1) >= 0.85 && b1.meanDy > 0, { s1, b1 });

    /* ── 2. a sword's swing at it, a real click ── */
    {
      const dy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g ? g.y - S.player.y : 52; });
      await H.hopTo(P, (tw.box.x0 + tw.box.x1) / 2 + 10, tw.box.y1 + 34 - dy, { tries: 60 });
      await P.page.waitForTimeout(900);
      const at = await P.page.evaluate((b) => {
        const S = window._gameState.current;
        const cv = document.querySelector('canvas.brotown-canvas').getBoundingClientRect();
        const wx = (b.x0 + b.x1) / 2 + 10, wy = b.y1 - 40;
        const x = cv.left + (wx - S.camera.x) * S._worldScaleX, y = cv.top + (wy - S.camera.y) * S._worldScaleY;
        const top = document.elementFromPoint(x, y);
        return { x: Math.round(x), y: Math.round(y), top: top ? top.tagName : null };
      }, tw.box);
      id0 = await lastId(P);
      const d0 = await P.page.evaluate((oi) => window.__btWheelBreak.damage(oi), tw.oi);
      await P.page.mouse.move(at.x, at.y);
      await P.page.waitForTimeout(200);
      await P.page.mouse.down();
      await P.page.waitForTimeout(450);
      await P.page.mouse.up();
      const b2 = await burstAfter(P, id0, 'wood');
      const d1 = await P.page.evaluate((oi) => window.__btWheelBreak.damage(oi), tw.oi);
      rec.ok(`2. a sword's swing at it (a real click on the ${at.top}: ${d1 - d0} hit) throws ${b2 && b2.parts} splinters, ${Math.round(inFront(b2) * 100)}% in front, landing ${b2 && b2.meanDy} px toward the camera`,
        at.top === 'CANVAS' && d1 > d0 && !!b2 && b2.parts >= 6 && inFront(b2) >= 0.85 && b2.meanDy > 0, { at, d0, d1, b2 });
    }

    /* ── 3. an arrow into a stone building ── */
    const stone = (await targets(P, STONE, 3200))[0];
    if (stone) {
      await standBefore(P, stone, 80);
      const ts = (await targets(P, [stone.id], 600)).find((q) => q.oi === stone.oi) || stone;
      const k = await P.page.evaluate((oi) => window.__btWheelBreak.kind(oi), ts.oi);
      id0 = await lastId(P);
      const s3 = await shootAt(P, ts, { dx: 20 });
      const b3 = await burstAfter(P, id0, 'stone');
      rec.ok(`3. one arrow into the ${ts.id} (${k && k.mat}) throws ${b3 && b3.parts} chips and ${b3 && b3.dust} dust, ${Math.round(inFront(b3) * 100)}% in front of it`,
        s3.landed && !!b3 && b3.parts >= 5 && inFront(b3) >= 0.85, { s3, b3, k });
    } else {
      rec.ok('3. a stone building to hit', false, null);
    }

    /* ── 4. a barrel is a prop, unchanged ── */
    const barrel = (await targets(P, ['barrel', 'crate'], 2600))[0];
    if (barrel) {
      await standBefore(P, barrel, 70);
      const tb = (await targets(P, [barrel.id], 600)).find((q) => q.oi === barrel.oi) || barrel;
      id0 = await lastId(P);
      const s4 = await shootAt(P, tb);
      const b4 = await burstAfter(P, id0, 'wood');
      rec.ok(`4. a ${tb.id} (a prop, not a building) is unchanged: ${b4 && b4.parts} splinters an arrow`,
        s4.landed && !!b4 && b4.parts >= 1 && b4.parts <= 4, { s4, b4 });
    } else {
      rec.ok('4. a barrel or crate to hit', false, null);
    }
    rec.ok('5. no page errors', errors.length === 0, errors.slice(0, 4));
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}
