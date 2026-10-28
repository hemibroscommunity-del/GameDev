/* ═══ v2.3.3707: A MONSTER HIDDEN BEHIND A THING IS SEEN AS ITS SILHOUETTE ═══
 *
 * The owner: "have a monster shadows silhouette appear behind props if
 * they're hiding behind them."
 *
 * A monster whose feet are north of a building's is drawn under it
 * (depthSort.js); now, where the building's picture covers it, its own frame
 * is drawn over the building as a dark see-through shape
 * (rendering/monsterSilhouette.js), clipped by the stencil to the building's
 * picture.
 *
 * One phone (390 x 844), in BroTown, a slime of the page's own (the worker's
 * monsters set aside for the while, as mp-sightrock does) put by a building:
 *   1. setup: in the world, the silhouettes on, a building's picture drawn
 *      and the slime drawn (guard);
 *   2. BEHIND the building, its feet 40 px north of the building's: one
 *      silhouette, of that slime, riding on the building -- in its layer and
 *      drawn after it;
 *   3. ...and it is SEEN: the slime's box on the screen darker with the
 *      silhouettes on than off, in hundreds of pixels (every pixel counted
 *      darker in each of three pictures with them on than in each of three
 *      with them off);
 *   4. HALF OUT past the building's right edge: darker only over the
 *      building, not one pixel past its picture's edge (the stencil clip);
 *   5. IN FRONT of the building (its feet 40 px south): no silhouette, and
 *      the one held is let go within KEEP_MS (none held);
 *   6. BESIDE it, behind its line but clear of its picture: no silhouette;
 *   7. no page errors.
 *
 *   node tools/qa/mp/run.mjs silhouette
 * On the build before it, step 2 finds no probe (and with `?nosilhouette`, no
 * silhouette).  Pictures: tools/qa/mp/out/silhouette-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const MID = 'qa-sil-slime';

/* the page's own slime, re-asserted every frame (the worker's monsters set
   aside), its feet's ground line put at (x, gy) */
const putSlime = (P, x, gy) => P.page.evaluate(({ x, gy, MID }) => new Promise((resolve) => {
  const S = window._gameState.current, F = window._gameFns || {};
  const q = window.__qaSil || (window.__qaSil = { m: null, keep: null, server: null, loop: false });
  if (!q.m) {
    q.keep = S.monsters; q.server = S._serverMonsters;
    q.m = F.createMonster(MID, 'fodder', 2, x, gy, null);   /* the green slime */
    q.m.alive = true; q.m.curHp = q.m.maxHp = 900000; q.m.spd = 0;
  }
  const m = q.m;
  m.x = x; m.y = gy; m.vx = 0; m.vy = 0; m.renderX = m.x; m.renderY = m.y;
  if (!q.loop) {
    q.loop = true;
    const tick = () => {
      if (!q.loop) return;
      S._serverMonsters = false;
      if (S.monsters.length !== 1 || S.monsters[0] !== m) S.monsters = [m];
      m.vx = 0; m.vy = 0;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  /* a few frames drawn, then its ground line read back off its display, and
     the slime moved by what it is off (its feet are not its y) */
  let n = 0;
  const step = () => {
    n++;
    const d = window.__btSilhouettes.monster(MID);
    if (d && d.drawn && n >= 6) {
      const off = gy - d.gy;
      if (Math.abs(off) > 0.5 && n < 40) { m.y += off; m.renderY = m.y; requestAnimationFrame(step); return; }
      resolve(d);
      return;
    }
    if (n > 240) { resolve(d); return; }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}), { x, gy, MID });

const releaseSlime = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, q = window.__qaSil;
  if (!q) return;
  q.loop = false;
  S.monsters = q.keep || [];
  S._serverMonsters = q.server;
  window.__qaSil = null;
});

/* a few frames, then the probe */
const settle = (P, frames = 8) => P.page.evaluate((frames) => new Promise((resolve) => {
  let n = 0;
  const go = () => { if (++n >= frames) resolve(window.__btSilhouettes()); else requestAnimationFrame(go); };
  requestAnimationFrame(go);
}), frames);

/* world -> screen (CSS px), as the harness's figureBox does */
const toScreen = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const r = document.querySelector('canvas').getBoundingClientRect();
  return { left: r.left, top: r.top, cx: S.camera.x, cy: S.camera.y, k: S._worldScaleX || 1, ky: S._worldScaleY || 1 };
});
const sx = (v, x) => v.left + (x - v.cx) * v.k;
const sy = (v, y) => v.top + (y - v.cy) * v.ky;

/* three pictures of `clip` (CSS px) */
const shots = async (P, clip) => {
  const out = [];
  for (let i = 0; i < 3; i++) {
    out.push(await H.screenshotPixels(P, clip));
    await P.page.waitForTimeout(160);
  }
  return out;
};
const lum = (p, x, y) => { const c = p.at(x, y); return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]; };
/* each pixel darker by a fifth (and 4 levels) in every "on" picture than in
   every "off" one, counted left and right of `splitX` (device px in the clip) */
function darker(ons, offs, splitX) {
  const W = ons[0].width, Hh = ons[0].height;
  let left = 0, right = 0;
  for (let y = 0; y < Hh; y++) {
    for (let x = 0; x < W; x++) {
      let onMax = 0, offMin = 255;
      for (const p of ons) onMax = Math.max(onMax, lum(p, x, y));
      for (const p of offs) offMin = Math.min(offMin, lum(p, x, y));
      if (onMax < offMin * 0.8 - 4) { if (splitX != null && x >= splitX) right++; else left++; }
    }
  }
  return { left, right, w: W, h: Hh };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Peeker', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stopAlive = H.keepAlive(P, 20000);
  try {
    await H.enterWorld(P);
    await H.waitFor(P, (S) => (S._zoneLoading ? null : S.currentZone), (z) => z === 'wheel', { timeout: 60000, label: 'in the world' });
    await P.page.waitForTimeout(2500);
    const id = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', id, { heal: true, god: true, godMinutes: 15 }).catch(() => {});

    /* the nearest building with its picture in */
    const pick = async () => P.page.evaluate(() => {
      const S = window._gameState.current, W = window.__btWheelObjects;
      if (!W) return null;
      const all = W.near(S.player.x, S.player.y, 1600).filter((o) => o.ready && o.h >= 150 && o.w >= 150);
      all.sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y));
      return all[0] || null;
    });
    const b0 = await pick();
    if (b0) await H.glideTo(P, b0.x, b0.y + 230, { speed: 450, timeoutMs: 30000 });
    await P.page.waitForTimeout(1500);
    const bld = b0 ? await P.page.evaluate((i) => {
      const W = window.__btWheelObjects, s = W.sprite(i);
      if (!s) return null;
      /* its picture's box in the world: anchored at (ax, 1), mirrored if flipped */
      const ax = s.flip ? 1 - s.ax : s.ax;
      return { i, x: s.x, foot: s.y, x0: s.x - ax * s.w, x1: s.x + (1 - ax) * s.w, y0: s.y - s.h, y1: s.y, layer: s.layer };
    }, b0.i) : null;
    const on0 = await P.page.evaluate(() => (window.__btSilhouettes ? window.__btSilhouettes().on : null));
    let behind = null;
    if (bld) behind = await putSlime(P, Math.round((bld.x0 + bld.x1) / 2), bld.foot - 40);
    rec.ok(`1. setup: in the world, the silhouettes on, a building's picture drawn (${b0 ? b0.id : '?'}, ${bld ? `${Math.round(bld.x1 - bld.x0)} x ${Math.round(bld.y1 - bld.y0)}` : '?'}) and the slime drawn (guard)`,
      on0 === true && !!bld && !!behind && behind.drawn, { on0, b0, bld, behind });
    if (!bld || !behind || !behind.drawn) return;

    /* ── 2-3. behind it ── */
    const p2 = await settle(P, 10);
    const mine = (p2.drawn || []).find((d) => d.id === MID);
    const ride = (p2.riding || []).find((r) => r.id === MID);
    console.log(`    behind: ${JSON.stringify({ behind, drawn: p2.drawn, riding: p2.riding, held: p2.held })}`);
    rec.ok(`2. behind the building (the slime's feet ${Math.round(bld.foot - behind.gy)} px north of its): one silhouette, of the slime, on the building ("${mine && mine.thing}", cover ${mine && mine.cover}), riding in its layer (${ride && ride.layer}) and drawn after it`,
      p2.drawn.length === 1 && !!mine && mine.thing === 'wheelObject' && mine.cover >= 0.5 && !!ride && ride.visible && ride.sameParent && ride.after === true, p2);

    const v = await toScreen(P);
    const box = behind.box;
    const pad = 6;
    const clip = { x: Math.round(sx(v, box.x0) - pad), y: Math.round(sy(v, box.y0) - pad) };
    clip.width = Math.round(sx(v, box.x1) + pad) - clip.x;
    clip.height = Math.round(sy(v, box.y1) + pad) - clip.y;
    const onShots = await shots(P, clip);
    await P.page.evaluate(() => window.__btSilhouettes.set(false));
    await settle(P, 6);
    const offShots = await shots(P, clip);
    await P.page.evaluate(() => window.__btSilhouettes.set(true));
    const p3 = await settle(P, 6);
    const d3 = darker(onShots, offShots, null);
    writeFileSync(join(OUT, 'silhouette-behind-on.png'), await P.page.screenshot({ clip }));
    await P.page.evaluate(() => window.__btSilhouettes.set(false));
    await settle(P, 6);
    writeFileSync(join(OUT, 'silhouette-behind-off.png'), await P.page.screenshot({ clip }));
    await P.page.evaluate(() => window.__btSilhouettes.set(true));
    await settle(P, 6);
    console.log(`    behind, the pictures: ${JSON.stringify({ clip, darker: d3, again: p3.drawn.length })}`);
    rec.ok(`3. ...and it is seen: ${d3.left} px of the slime's box (${d3.w} x ${d3.h}) darker with the silhouettes on than off, in all six pictures`,
      d3.left >= 300 && p3.drawn.length === 1, { clip, d3 });

    /* ── 4. half out past the building's right edge ── */
    const half = await putSlime(P, Math.round(bld.x1), bld.foot - 40);
    const p4 = await settle(P, 10);
    const v4 = await toScreen(P);
    const hb = half.box;
    const clip4 = { x: Math.round(sx(v4, hb.x0) - pad), y: Math.round(sy(v4, hb.y0) - pad) };
    clip4.width = Math.round(sx(v4, hb.x1) + pad) - clip4.x;
    clip4.height = Math.round(sy(v4, hb.y1) + pad) - clip4.y;
    /* the building's right edge in the clip, in device px (+2 CSS px: the
       picture's own edge pixel blends) */
    const dpr = onShots[0].width / clip.width;
    const edge = Math.round((sx(v4, bld.x1) + 2 - clip4.x) * dpr);
    const on4 = await shots(P, clip4);
    await P.page.evaluate(() => window.__btSilhouettes.set(false));
    await settle(P, 6);
    const off4 = await shots(P, clip4);
    await P.page.evaluate(() => window.__btSilhouettes.set(true));
    await settle(P, 6);
    const d4 = darker(on4, off4, edge);
    writeFileSync(join(OUT, 'silhouette-half.png'), await P.page.screenshot({ clip: clip4 }));
    const m4 = (p4.drawn || []).find((d) => d.id === MID);
    console.log(`    half out: ${JSON.stringify({ half, drawn: p4.drawn, clip4, edge, darker: d4 })}`);
    rec.ok(`4. half out past the building's right edge: a silhouette (cover ${m4 && m4.cover}), darker over the building (${d4.left} px) and not one pixel past its picture's edge (${d4.right})`,
      !!m4 && d4.left >= 60 && d4.right === 0, { m4, d4, edge });

    /* ── 5. in front ── */
    await putSlime(P, Math.round((bld.x0 + bld.x1) / 2), bld.foot + 40);
    const p5 = await settle(P, 10);
    await P.page.waitForTimeout(2200);   /* past KEEP_MS (1.5 s) */
    const p5b = await settle(P, 4);
    rec.ok(`5. in front of the building (its feet 40 px south): no silhouette (${p5.drawn.length}), and the one held let go (held ${p5b.held}, ${p5b.freed} freed in all)`,
      p5.drawn.length === 0 && p5b.held === 0 && p5b.freed >= 1, { p5, p5b });

    /* ── 6. beside it, behind its line ── */
    await putSlime(P, Math.round(bld.x1 + 90), bld.foot - 40);
    const p6 = await settle(P, 12);
    rec.ok(`6. beside the building, behind its line but clear of its picture: no silhouette (${p6.drawn.length})`,
      p6.drawn.length === 0, p6);

    await releaseSlime(P);
    rec.ok('7. no page errors', errors.length === 0, errors);
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}
