/* ═══ THE WHEEL'S SHADOWS, SHADE, WIND AND AIR (v2.3.3000) ═══
 *
 * Owner, 2026-10-03: "I liked the old shadows (and any other visual effect
 * enhancements?) of the old map put that on this wheel world too".
 *
 * On a phone, in the Wheel, against a real worker:
 *   1. the Wheel has a sun (lightfx/zoneLight.js WHEEL_SUN), so you cast, and
 *      so does every object drawn -- trees and rocks as billboards, buildings
 *      column by column (wheelObjects.js wheelObjectCasters);
 *   2. a shadow falls on the shade side and never the sun side: below and to
 *      the right of a tree's foot the ground darkens when the world casts,
 *      left of its foot it does not (the same frame, the world's casting off
 *      and on, as mp-worldshadow);
 *   3. every object is shaded toward its foot (formShade), and the trees and
 *      bushes sway in the wind (worldLife.js _updateWheelSway) with their foot
 *      held still;
 *   4. the shade, the air and the dust follow the land: Frost Ridge's shadows
 *      ease to its blue, snow hangs in its air, and walking its snow leaves
 *      prints at the boots; the commons kicks up dust the colour of its grass;
 *   5. walking far across the lands (sheets freed behind you) and home to town
 *      and back costs no page error.
 * Pictures, each spot with the world's shadows off and on:
 * tools/qa/mp/out/wheelshadows-<spot>-{off,on}.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const probe = (P) => P.page.evaluate(() => (window.__btLightFx ? window.__btLightFx.probe() : null));
const frames = (P, n = 3) => P.page.evaluate((k) => new Promise((res) => {
  let i = 0; const f = () => { if (++i >= k) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f);
}), n);
const setWorld = (P, on) => P.page.evaluate((v) => { window.__btLightFx.world(v); }, on);
const toScreen = (P, wx, wy) => P.page.evaluate(({ wx, wy }) => {
  const R = window._pixiRenderer;
  const find = (n, label) => { if (n.label === label) return n; for (const c of (n.children || [])) { const f = find(c, label); if (f) return f; } return null; };
  const tiles = find(R.app.stage, 'tiles');
  const world = tiles && tiles.parent;
  const g = world.toGlobal({ x: wx, y: wy });
  const g2 = world.toGlobal({ x: wx + 100, y: wy });
  const r = document.querySelector('canvas').getBoundingClientRect();
  return { x: r.left + g.x, y: r.top + g.y, k: (g2.x - g.x) / 100 };
}, { wx, wy });
function meanLum(img, box) {
  const s = img.width / PHONE.width;
  let sum = 0, n = 0;
  for (let y = Math.max(0, Math.round(box.y * s)); y < Math.min(img.height, Math.round((box.y + box.h) * s)); y++) {
    for (let x = Math.max(0, Math.round(box.x * s)); x < Math.min(img.width, Math.round((box.x + box.w) * s)); x++) {
      const [r, g, b] = img.at(x, y);
      sum += 0.299 * r + 0.587 * g + 0.114 * b; n++;
    }
  }
  return n ? sum / n : 0;
}
/* a land's spot a stage in, beside its road on dry ground (as mp-placing2) */
const SPOT = async (land, tier) => {
  const { PLAN } = await import(H.REPO + '/public/tools/world/plan.js');
  const { buildBlueprint, C } = await import(H.REPO + '/public/tools/world/core/layout.js');
  const { wheelInfo, spokePoint } = await import(H.REPO + '/public/tools/world/core/wheel.js');
  const { gridInfo } = await import(H.REPO + '/public/tools/world/core/grid.js');
  const bp = buildBlueprint(PLAN), W = wheelInfo(PLAN), g = gridInfo(PLAN), WPA = PLAN.worldPxPerArtPx;
  const cellG = bp.scale * WPA;
  const dry = (x, y) => {
    for (let v = -4; v <= 4; v++) for (let u = -4; u <= 4; u++) {
      const c = bp.cls[Math.floor(y / cellG + v) * bp.w + Math.floor(x / cellG + u)];
      if (c === C.water || c === C.river || c === C.ocean) return false;
    }
    const c = bp.cls[Math.floor(y / cellG) * bp.w + Math.floor(x / cellG)];
    return c === C.ground || c === C.obstacle;
  };
  for (const side of [0.7, -0.7, 0.45, -0.45, 1, -1]) for (const dt of [0, 0.15, -0.15, 0.3]) {
    const [sx, sy] = spokePoint(W.byId[land], W.tierMid(tier + dt), side);
    const p = { x: Math.round((g.cx + sx * g.P - bp.x0) * WPA), y: Math.round((g.cy + sy * g.P - bp.y0) * WPA) };
    if (dry(p.x, p.y)) return p;
  }
  return null;
};

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Sunwalker', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  await H.enterWorld(P);
  const myId = await H.readState(P, (S) => S.myId);
  let alive = true;
  const keep = (async () => { while (alive) { await P.page.keyboard.press('Shift').catch(() => {}); await P.page.waitForTimeout(20000); } })();
  const settle = async (n = 80) => {
    let v = null;
    for (let i = 0; i < n; i++) {
      v = await P.page.evaluate(() => {
        const S = window._gameState.current, W = window.__btWheelObjects;
        return { zone: S.currentZone, loading: !!S._zoneLoading, pagesLoading: W ? W.stats.loading : -1, drawn: W ? W.stats.drawn : 0 };
      });
      if (v.zone === 'wheel' && !v.loading && v.pagesLoading === 0 && v.drawn > 0) return v;
      await P.page.waitForTimeout(500);
    }
    return v;
  };
  const inWheel = await settle(120);
  rec.ok('in the Wheel, its objects drawn (guard)', !!inWheel && inWheel.zone === 'wheel' && inWheel.drawn > 0, inWheel);
  if (!inWheel || inWheel.zone !== 'wheel') { alive = false; await keep.catch(() => {}); await P.ctx.close().catch(() => {}); return; }
  await H.devOp(wsPort, 'quests', myId);
  await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 15 });
  await frames(P, 6);

  /* ── 1. the sun, and everything casts ── */
  const p1 = await probe(P);
  const drawn1 = await P.page.evaluate(() => window.__btWheelObjects.stats.drawn);
  const keys1 = (p1 && p1.shadows && p1.shadows.keys) || [];
  const wk = keys1.filter((k) => k.indexOf('w:') === 0).length;
  rec.ok(`the Wheel has a sun (${p1 && p1.light ? `lx ${p1.light.lx} ly ${p1.light.ly}, alpha ${p1.light.alpha}, ${p1.light.region || 'no land yet'}` : 'none'}) and you cast`,
    !!(p1 && p1.light && p1.light.lx === 0.5 && p1.light.ly === 0.34 && keys1.indexOf('self') >= 0), p1 && { light: p1.light, keys: keys1.slice(0, 8) });
  rec.ok(`every object drawn casts: ${wk} casting of ${drawn1} drawn (some only for their shadow)`, wk > 5 && wk >= drawn1 * 0.9, { wk, drawn1, casters: p1 && p1.shadows && p1.shadows.casters });
  /* a building near the arrival casts, column by column */
  const bld = await P.page.evaluate(() => {
    const S = window._gameState.current, W = window.__btWheelObjects;
    const B = ['townhall', 'bank', 'hotel', 'saloon', 'store', 'blacksmith', 'gemcutter', 'post', 'gambling', 'church', 'school', 'stable', 'mill', 'depot', 'jail', 'doctor', 'sheriff'];
    const near = W.near(S.player.x, S.player.y, 1600).filter((o) => B.indexOf(o.id) >= 0 && W.sprite(o.i));
    return near.map((o) => ({ i: o.i, id: o.id }));
  });
  const keySet1 = new Set(keys1);
  const bCast = bld.filter((b) => keySet1.has('w:' + b.i));
  rec.ok(`the town's buildings cast too: ${bCast.length} of the ${bld.length} drawn round the arrival (${bCast.map((b) => b.id).join(', ')})`, bld.length > 0 && bCast.length === bld.length, { bld });

  /* ── 3. shaded toward the ground ── */
  const look = await P.page.evaluate(() => {
    const S = window._gameState.current, W = window.__btWheelObjects;
    const near = W.near(S.player.x, S.player.y, 1400).map((o) => ({ ...o, s: W.sprite(o.i) })).filter((o) => o.s);
    return { n: near.length, shaded: near.filter((o) => o.s.shade).length };
  });
  rec.ok(`every object is shaded toward its foot (${look.shaded} of ${look.n})`, look.n > 0 && look.shaded === look.n, look);

  /* ── the commons' dust is the colour of its grass ── */
  const walkKeys = async (key, ms) => { await P.page.keyboard.down(key); await P.page.waitForTimeout(ms); await P.page.keyboard.up(key); };
  await P.page.mouse.click(5, PHONE.height / 2).catch(() => {});
  await walkKeys('d', 900); await walkKeys('a', 900);
  const dust = await P.page.evaluate(() => (window.__btWorldFx ? window.__btWorldFx() : null));
  rec.ok(`a walk kicks up dust the colour of the ground under it (${dust && dust.lastDust ? '#' + (dust.lastDust.ground >>> 0).toString(16) : 'none'})`,
    !!(dust && dust.lastDust && dust.lastDust.ground > 0), dust && dust.lastDust);
  for (const [tag, spot] of [['town', null]]) {
    void spot;
    await setWorld(P, false); await frames(P, 4);
    await P.page.screenshot({ path: join(OUT, `wheelshadows-${tag}-off.png`) });
    await setWorld(P, true); await frames(P, 4);
    await P.page.screenshot({ path: join(OUT, `wheelshadows-${tag}-on.png`) });
  }

  /* ── 4. Frost Ridge: a pine's shadow on the snow, its blue, the wind,
        snow in the air, prints in the snow ── */
  const frost = await SPOT('frost', 2);
  let fr = null, side = null, sway = null;
  if (frost) {
    await H.hopTo(P, frost.x, frost.y, { tries: 200 });
    await settle(60);
    await P.page.waitForTimeout(2500);
    /* the shade side, never the sun side: a pine (or any broad thing) with
       nothing up and to its left whose shadow could fall in the boxes --
       with the air still (the harness's calm), so a drifting flake cannot
       land in a box */
    const pick = await P.page.evaluate(() => {
      const S = window._gameState.current, W = window.__btWheelObjects;
      const all = W.near(S.player.x, S.player.y, 900);
      const cands = all.filter((o) => o.h > 110 && o.w > 50 && W.sprite(o.i)).map((o) => {
        const crowd = all.filter((q) => q.i !== o.i && q.h > 30 && Math.abs(q.x - o.x) < 260 && q.y < o.y + 140 && q.y > o.y - 320).length;
        return { i: o.i, id: o.id, x: o.x, y: o.y, h: o.h, w: o.w, crowd };
      });
      cands.sort((a, b) => a.crowd - b.crowd || b.h - a.h);
      return cands.slice(0, 6);
    });
    for (const c of pick) {
      const shade = await toScreen(P, c.x + 0.5 * 0.4 * c.h, c.y + 0.34 * 0.4 * c.h);
      const lit = await toScreen(P, c.x - c.w * 0.5 - 30, c.y - 4);
      const box = (q) => ({ x: q.x - 8, y: q.y - 8, w: 16, h: 16 });
      if (shade.x < 12 || shade.y < 70 || shade.x > PHONE.width - 12 || shade.y > PHONE.height - 130 || lit.x < 12 || lit.y < 70) continue;
      await setWorld(P, false); await frames(P, 4);
      const off = H.decodePng(await P.page.screenshot({ path: join(OUT, 'wheelshadows-tree-off.png') }));
      await setWorld(P, true); await frames(P, 4);
      const on = H.decodePng(await P.page.screenshot({ path: join(OUT, 'wheelshadows-tree-on.png') }));
      side = { obj: c, shade: { off: meanLum(off, box(shade)), on: meanLum(on, box(shade)) }, lit: { off: meanLum(off, box(lit)), on: meanLum(on, box(lit)) } };
      break;
    }
    /* the wind back on (the harness stills it for pixel tests) */
    await P.page.evaluate(() => { window.__btAmbienceOff = false; });
    await P.page.waitForTimeout(1200);
    const sw = await P.page.evaluate(() => {
      const S = window._gameState.current, W = window.__btWheelObjects;
      return W.near(S.player.x, S.player.y, 1100).map((o) => ({ i: o.i, id: o.id, s: W.sprite(o.i) })).filter((o) => o.s && o.s.sway).slice(0, 6).map((o) => ({ i: o.i, id: o.id }));
    });
    if (sw.length) {
      const sk = [];
      for (let k = 0; k < 10; k++) {
        sk.push(await P.page.evaluate((ids) => ids.map((i) => { const s = window.__btWheelObjects.sprite(i); return s ? { skew: s.skew, x: s.x, y: s.y } : null; }), sw.map((o) => o.i)));
        await P.page.waitForTimeout(250);
      }
      const life = await P.page.evaluate(() => (window.__btWorldLife ? window.__btWorldLife() : null));
      sway = { wheelSway: life && life.wheelSway, moved: sw.map((o, j) => {
        const v = sk.map((f) => f[j]).filter(Boolean), skews = v.map((q) => q.skew);
        return { id: o.id, range: v.length ? +(Math.max(...skews) - Math.min(...skews)).toFixed(4) : 0, footMoved: v.length ? +Math.max(...v.map((q) => Math.hypot(q.x - v[0].x, q.y - v[0].y))).toFixed(2) : 0 };
      }) };
    }
    const p2 = await probe(P);
    const fx = await P.page.evaluate(() => (window.__btWorldFx ? window.__btWorldFx() : null));
    /* prints: a spot of snow in view, by the game's own ground under it */
    const snow = await P.page.evaluate(() => {
      const S = window._gameState.current, T = window.__btWorldTrial, g0 = window.__btPlayerGround();
      const dy = g0.y - S.player.y;
      let best = null;
      for (let r = 0; r <= 600 && !best; r += 40) for (let a = 0; a < 16 && !best; a++) {
        const x = g0.x + Math.cos(a * Math.PI / 8) * r, y = g0.y + Math.sin(a * Math.PI / 8) * r;
        const ok = [0, 60, 120, 180].every((d) => { const c = T.ground(x + d, y); return c && c.step === 'snow'; });
        if (ok) best = { x, y: y - dy };
      }
      return { best, here: T.ground(g0.x, g0.y) };
    });
    let prints = null, n0 = 0;
    if (snow.best) {
      await H.hopTo(P, snow.best.x, snow.best.y, { tries: 30 });
      await P.page.waitForTimeout(600);
      n0 = await H.readState(P, (S) => (S.footprints || []).length);
      const a0 = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
      /* a print every 46 px walked: a pine in the way stops the first try, so
         each way in turn until one walk lays some */
      const trace = [];
      for (const k of ['d', 'a', 's', 'w']) {
        await P.page.keyboard.down(k);
        /* ~2 s each: a headless page draws ~17 frames a second, and a 1.1 s
           walk came out 45 px -- a print is every 46 */
        for (let t = 0; t < 11; t++) {
          await P.page.waitForTimeout(180);
          trace.push(await P.page.evaluate((k) => {
            const S = window._gameState.current, g = window.__btPlayerGround(), c = window.__btWorldTrial.ground(g.x, g.y);
            return { k, x: Math.round(S.player.x), y: Math.round(S.player.y), vx: +(S.player.vx || 0).toFixed(2), vy: +(S.player.vy || 0).toFixed(2),
              step: c ? c.step : null, anchor: S._printLast ? 1 : 0, n: (S.footprints || []).length, zone: S.currentZone };
          }, k));
        }
        await P.page.keyboard.up(k);
        if ((await H.readState(P, (S) => (S.footprints || []).length)) > n0) break;
      }
      console.log('    print walk: ' + JSON.stringify(trace));
      prints = await P.page.evaluate((a0) => {
        const S = window._gameState.current, g = window.__btPlayerGround(), c = window.__btWorldTrial.ground(g.x, g.y);
        return { n: (S.footprints || []).length, last: (S.footprints || []).slice(-1)[0] || null, art: window.__btFootprints ? window.__btFootprints() : null,
          moved: Math.round(Math.hypot(S.player.x - a0.x, S.player.y - a0.y)), under: c ? c.step : null, anchor: S._printLast || null };
      }, a0);
    }
    fr = { light: p2 && p2.light, motes: fx && { kind: fx.moteKind, n: fx.motes }, prints, n0, snow };
    await P.page.evaluate(() => { window.__btAmbienceOff = true; });
    await setWorld(P, false); await frames(P, 4);
    await P.page.screenshot({ path: join(OUT, 'wheelshadows-frost-off.png') });
    await setWorld(P, true); await frames(P, 4);
    await P.page.screenshot({ path: join(OUT, 'wheelshadows-frost-on.png') });
  }
  console.log(`    frost: ${JSON.stringify({ ...fr, side })}`);
  const drop = (q) => (q && q.off > 0 ? 1 - q.on / q.off : 0);
  rec.ok(`a tree's shadow falls below and right of its foot (${side ? `${side.obj.id}: the snow there ${(drop(side.shade) * 100).toFixed(1)}% darker` : 'no tree in view'}), not on its sunlit left (${side ? (drop(side.lit) * 100).toFixed(1) : '?'}%)`,
    !!side && drop(side.shade) > 0.08 && Math.abs(drop(side.lit)) < 0.03, side);
  rec.ok(`the trees and bushes sway in the wind, their foot held still (${sway ? sway.moved.map((m) => `${m.id} ${m.range}`).join(', ') : 'none in view'})`,
    !!sway && sway.wheelSway > 0 && sway.moved.some((m) => m.range > 0.003) && sway.moved.every((m) => m.footMoved < 0.5), sway);
  rec.ok(`in Frost Ridge the shadows take its blue (${fr && fr.light ? `${fr.light.region} #${(fr.light.color >>> 0).toString(16)}` : '?'})`,
    !!(fr && fr.light && fr.light.region === 'frost' && Math.abs(((fr.light.color >> 16) & 255) - 0x1a) <= 3 && Math.abs((fr.light.color & 255) - 0x52) <= 3), fr && fr.light);
  rec.ok(`...snow hangs in its air (${fr && fr.motes ? `${fr.motes.kind}, ${fr.motes.n} flakes` : '?'})`, !!(fr && fr.motes && fr.motes.kind === 'snow' && fr.motes.n > 0), fr && fr.motes);
  rec.ok(`...and a walk on its snow leaves prints at the boots (${fr && fr.prints ? fr.prints.n - fr.n0 : 0} new, ${fr && fr.prints && fr.prints.last ? Math.round(fr.prints.last.fdy) : '?'} px below the body)`,
    !!(fr && fr.prints && fr.prints.n > fr.n0 && fr.prints.last && Math.abs(fr.prints.last.fdy - 52) < 4 && (fr.prints.art || []).indexOf('wheel') >= 0), fr && { prints: fr.prints, snow: fr.snow });

  /* ── the dunes, for the pictures ── */
  const dunes = await SPOT('sky', 2);
  if (dunes) {
    await H.hopTo(P, dunes.x, dunes.y, { tries: 220 });
    await settle(60);
    await P.page.waitForTimeout(2500);
    const p3 = await probe(P);
    console.log(`    dunes: ${JSON.stringify(p3 && p3.light)}`);
    await setWorld(P, false); await frames(P, 4);
    await P.page.screenshot({ path: join(OUT, 'wheelshadows-dunes-off.png') });
    await setWorld(P, true); await frames(P, 4);
    await P.page.screenshot({ path: join(OUT, 'wheelshadows-dunes-on.png') });
  }

  /* ── 5. far across the lands and home: sheets freed behind you, no error ── */
  const home = await P.page.evaluate(() => { const S = window._gameState.current; return { x: S.player.x, y: S.player.y }; });
  void home;
  const verdant = await SPOT('verdant', 3);
  if (verdant) { await H.hopTo(P, verdant.x, verdant.y, { tries: 260 }); await settle(60); await P.page.waitForTimeout(1500); }
  const after = await probe(P);
  rec.ok(`after the walk across the lands the shadows still cast (${after && after.shadows ? after.shadows.casters : 0} casters) with no page error`, !!(after && after.shadows && after.shadows.casters > 3) && errors.length === 0, { errors: errors.slice(0, 5), shadows: after && after.shadows && { casters: after.shadows.casters, pieces: after.shadows.pieces, pool: after.shadows.pool } });
  rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  alive = false;
  await keep.catch(() => {});
  await P.ctx.close().catch(() => {});
}
