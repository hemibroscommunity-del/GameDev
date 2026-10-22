/* ═══ THE GOO GROTTO MOVES, ON A PHONE (v2.3.3567, docs/specs/grotto-life.md) ═══
 *
 * The owner, of their four Goo Grotto pictures in the game: "You can use code
 * to make those a bit more animated for the water effects and such. Maybe a
 * little Breeze for the ferns?"  One real player against a real worker, on a
 * phone (390 x 844, touch), in the world, with the QA harness's calm switch
 * OFF (window.__btAmbienceOff = false) so the world moves:
 *   1. at the mouth, its four ferns stand as sprites of their own on their
 *      bases, its seven drips and twelve wet spots are drawn, and over a while
 *      drops form, fall and splash, and its pools bubble and glint
 *      (window.__btGrottoFx, sampled);
 *   2. its ferns sway in the wind -- their lean changes, their base never;
 *   3. under the calm switch it all holds still: nothing showing, every fern
 *      upright;
 *   4. inside, both torches burn (their flames step through frames), each
 *      fire's holder one px north of its post, in its layer and drawn before
 *      it (the basket's front bars over the flame); the puddles and the heap
 *      bubble and glint, the mushrooms' spores rise, drops run down the north
 *      wall, and the two ferns sway;
 *   5. none of it rebuilds a layer's draw list: with the arena cleared and the
 *      player still, the world's layers rebuild no more a frame with the
 *      effects running than held still (TRAPS §218);
 *   6. out by Leave now, the arena's effects go with it (no fire or spores
 *      left; the mouth's own two sets are back);
 *   7. no page errors.
 * Pictures: tools/qa/mp/out/grotto-life-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

/* the draw-list rebuilds, by render group (the root's label), counted while
   `on` -- Pixi's RenderGroupSystem _buildInstructions, as mp-phoneframe does */
const BUILDS_INSTALL = () => {
  const app = window._pixiRenderer && window._pixiRenderer.app;
  const sys = app && app.renderer && app.renderer.renderGroup;
  if (!sys || typeof sys._buildInstructions !== 'function') return false;
  const st = window.__glBuilds || (window.__glBuilds = { on: false, n: Object.create(null), frames: 0 });
  if (!sys.__glHook) {
    sys.__glHook = true;
    const b = sys._buildInstructions;
    sys._buildInstructions = function (g) {
      if (st.on) { const k = (g && g.root && g.root.label) || '?'; st.n[k] = (st.n[k] || 0) + 1; }
      return b.apply(this, arguments);
    };
    const tick = () => { if (st.on) st.frames++; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
  return true;
};

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const { WHEEL_DOORS } = await import(H.REPO + '/server/src/wheelspawns.js');
  const { DUNGEON_ART } = await import(H.REPO + '/src/data/dungeonArt.js');
  const { arenaThings, ARENA_W } = await import(H.REPO + '/src/data/dungeonArena.js');
  const G = WHEEL_DOORS.verdant;
  const A = DUNGEON_ART.verdant;
  /* one big boss: quick to clear for the quiet check */
  await H.liveFlag(wsPort, 'slimeboss', false);
  const P = await H.newPlayer(browser, { name: 'Lifebro', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 2 });
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  try {
    await H.enterWorld(P);
    const zoneNow = () => H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
    const waitZone = async (pred, ms = 60000) => {
      const t0 = Date.now();
      while (Date.now() - t0 < ms) {
        const z = await zoneNow();
        if (z && pred(z)) return z;
        await P.page.waitForTimeout(400);
      }
      return await zoneNow();
    };
    const poll = async (fn, ms, step = 200) => {
      const t0 = Date.now();
      let v = null;
      while (Date.now() - t0 < ms) {
        v = await fn();
        if (v) return v;
        await P.page.waitForTimeout(step);
      }
      return v;
    };
    const fx = () => P.page.evaluate(() => (window.__btGrottoFx ? window.__btGrottoFx() : null));
    /* the most of each the probe saw in `ms`, sampled every `step` */
    const watch = async (ms, step, extra) => {
      const most = {};
      const seen = [];
      const t0 = Date.now();
      while (Date.now() - t0 < ms) {
        const o = await fx();
        if (o) for (const [k, v] of Object.entries(o)) if (typeof v === 'number') most[k] = Math.max(most[k] || 0, v);
        if (extra) seen.push(await extra());
        await P.page.waitForTimeout(step);
      }
      return { most, seen };
    };
    await waitZone((z) => z === 'wheel');
    const id = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'quests', id);
    await H.devOp(wsPort, 'vitals', id, { god: true, godMinutes: 30 });
    await P.page.evaluate(() => { window.__btAmbienceOff = false; });

    /* 1: the mouth, moving */
    await H.hopTo(P, G.at[0], G.at[1] + 230, { step: 100, gap: 260 });
    const art = await poll(() => P.page.evaluate(() => (window.__btWheelDoorsArt || []).find((d) => d.id === 'verdant') || null), 20000);
    const fernsAt = () => P.page.evaluate(() => { const d = (window.__btWheelDoorsArt || []).find((q) => q.id === 'verdant'); return d ? d.ferns : null; });
    const m1 = await watch(16000, 150, fernsAt);
    await P.page.screenshot({ path: join(OUT, 'grotto-life-mouth.png') }).catch(() => {});
    const M = m1.most;
    rec.ok(`1: at the mouth its ${art && art.ferns.length} ferns stand on their own, ${art && art.drips} drips and ${art && art.pools} wet spots drawn -- and in 16 s drops formed (${M.forming || 0}), fell (${M.falling || 0}) and splashed (${M.splashing || 0}), bubbles rose (${M.bubbles || 0}) and glinted (${M.glints || 0}), up to ${M.shown || 0} pieces showing at once`,
      !!art && art.ferns.length === A.mouth.ferns.length && art.drips === A.mouth.drips.length && art.pools === A.mouth.wet.length
        && M.forming > 0 && M.falling > 0 && M.splashing > 0 && M.bubbles > 0 && M.glints > 0 && M.shown > 0, { art, most: M });

    /* 2: the ferns sway about their bases */
    const rows = m1.seen.filter(Boolean);
    const per = (A.mouth.ferns || []).map((_, i) => {
      const sk = rows.map((r) => r[i] && r[i].skew).filter((v) => typeof v === 'number');
      const xs = rows.map((r) => r[i] && r[i].x), ys = rows.map((r) => r[i] && r[i].y);
      return { range: sk.length ? +(Math.max(...sk) - Math.min(...sk)).toFixed(4) : 0, still: new Set(xs).size === 1 && new Set(ys).size === 1 };
    });
    rec.ok(`2: the ferns sway in the wind -- their lean moved by ${per.map((q) => (q.range * 57.3).toFixed(2) + '°').join(', ')} -- and their bases never moved (${per.every((q) => q.still)})`,
      per.length === 4 && per.every((q) => q.range > 0.002 && q.range < 0.12 && q.still), { per, samples: rows.length });

    /* 3: under the calm switch, still */
    await P.page.evaluate(() => { window.__btAmbienceOff = true; });
    await P.page.waitForTimeout(1500);
    const calm = await fx();
    const calmFerns = await fernsAt();
    /* still, the picture as painted: no seam at its foot line (v2.3.3567:
       the flat slime shaded on from the mound's foot) */
    await P.page.screenshot({ path: join(OUT, 'grotto-life-mouth-still.png') }).catch(() => {});
    rec.ok(`3: under the calm switch it holds still -- ${calm && calm.shown} pieces showing, the ferns' lean ${calmFerns && calmFerns.map((f) => f.skew).join(', ')}`,
      !!calm && calm.calm === true && calm.shown === 0 && !!calmFerns && calmFerns.every((f) => f.skew === 0), { calm, calmFerns });
    await P.page.evaluate(() => { window.__btAmbienceOff = false; });

    /* 4: inside */
    await H.hopTo(P, G.at[0], G.at[1] + 60, { step: 60, gap: 260 });
    for (let i = 0; i < 20; i++) {
      if (await P.page.evaluate(() => !!document.querySelector('[data-wheel-door]'))) break;
      await P.page.waitForTimeout(300);
    }
    const b = await P.page.evaluate(() => { const el = document.querySelector('[data-wheel-door]'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    if (b) await P.page.touchscreen.tap(Math.round(b.x), Math.round(b.y));
    const z1 = await waitZone((z) => /^dungeon:/.test(z), 30000);
    await P.page.waitForTimeout(1500);
    const life = () => P.page.evaluate(() => { const w = window.__btArenaWorld ? window.__btArenaWorld() : null; return w && w.life; });
    const L0 = await life();
    /* stand by the way out, between the torches, to watch them */
    const things = arenaThings('verdant');
    const t1 = things.find((t) => t.art === 'torch-1'), t2 = things.find((t) => t.art === 'torch-2');
    await H.hopTo(P, (t1.x + t2.x) / 2, t1.y - 140, { step: 120, gap: 260 });
    const m4 = await watch(14000, 150, life);
    await P.page.screenshot({ path: join(OUT, 'grotto-life-torches.png') }).catch(() => {});
    const lifes = m4.seen.filter(Boolean);
    const frames = (i) => new Set(lifes.map((l) => l.torches[i] && l.torches[i].frame)).size;
    const sway = (i) => { const v = lifes.map((l) => l.swayers[i] && l.swayers[i].skew).filter((q) => typeof q === 'number'); return v.length ? Math.max(...v) - Math.min(...v) : 0; };
    const kinds = (L0 && L0.fx || []).reduce((o, k) => { o[k] = (o[k] || 0) + 1; return o; }, {});
    const I = m4.most;
    const torchesOk = !!L0 && L0.torches.length === 2 && L0.torches.every((t) => t.dy === 1 && t.sameLayer && t.before);
    rec.ok(`4: in ${z1}: ${kinds.fire || 0} torch fires (frames seen ${frames(0)}, ${frames(1)}; each holder 1 px north, drawn before its post: ${torchesOk}), ${kinds.bubbles || 0} pools bubbling (${I.bubbles || 0}) and glinting (${I.glints || 0}), ${kinds.spores || 0} mushrooms' spores (${I.spores || 0}), the wall's ${L0 && L0.wallDrips} drips falling (${I.falling || 0}), sparks (${I.sparks || 0}), the ferns' lean moving ${(sway(0) * 57.3).toFixed(2)}° and ${(sway(1) * 57.3).toFixed(2)}°`,
      /^dungeon:/.test(z1 || '') && kinds.fire === 2 && kinds.bubbles === 4 && kinds.spores === 3 && kinds.drips === 1 && torchesOk
        && frames(0) > 2 && frames(1) > 2 && I.bubbles > 0 && I.glints > 0 && I.spores > 0 && I.falling > 0 && I.sparks > 0
        && L0.wallDrips > 0 && L0.swayers.length === 2 && sway(0) > 0.002 && sway(1) > 0.002
        && L0.riders.length === 4 && L0.riders.every((r) => r.rides && r.sameLayer), { L0, most: I });

    /* pictures: the torches up close, a corner with a puddle and mushrooms,
       the north wall */
    await H.hopTo(P, 300, 700, { step: 120, gap: 260 });
    await P.page.waitForTimeout(1200);
    await P.page.screenshot({ path: join(OUT, 'grotto-life-west.png') }).catch(() => {});
    await H.hopTo(P, ARENA_W / 2, 380, { step: 120, gap: 260 });
    await P.page.waitForTimeout(1200);
    await P.page.screenshot({ path: join(OUT, 'grotto-life-wall.png') }).catch(() => {});

    /* 5: clear it, stand still, and count the draw lists' rebuilds held still
       and moving */
    for (let k = 0; k < 6; k++) {
      await H.devOp(wsPort, 'clearwave', id);
      const boss = await poll(() => P.page.evaluate(() => ((window._gameState.current || {}).monsters || []).some((q) => q.alive !== false && q.boss) || null), 3000, 250);
      if (boss) { await H.devOp(wsPort, 'hurt', id, { boss: true, dmg: 10000000 }); break; }
    }
    await poll(() => P.page.evaluate(() => { const w = window.__btArenaWorld ? window.__btArenaWorld() : null; return w && w.chest && w.chest.opened; }), 15000, 200);
    await P.page.waitForTimeout(2500);
    const hooked = await P.page.evaluate(BUILDS_INSTALL);
    const count = async (calmOn) => {
      await P.page.evaluate((c) => { window.__btAmbienceOff = c; }, calmOn);
      await P.page.waitForTimeout(800);
      await P.page.evaluate(() => { const s = window.__glBuilds; s.n = Object.create(null); s.frames = 0; s.on = true; });
      await P.page.waitForTimeout(4000);
      return P.page.evaluate(() => { const s = window.__glBuilds; s.on = false; return { frames: s.frames, n: Object.assign({}, s.n) }; });
    };
    const still = await count(true);
    const moving = await count(false);
    const rate = (c, k) => (c.frames ? (c.n[k] || 0) / c.frames : 0);
    const layers = ['entities', 'gatherNodesFront', 'groundDetails'];
    const diff = layers.map((k) => ({ k, still: +rate(still, k).toFixed(3), moving: +rate(moving, k).toFixed(3) }));
    rec.ok(`5: none of it rebuilds a draw list -- a frame, held still / moving: ${diff.map((d) => `${d.k} ${d.still} / ${d.moving}`).join(', ')} (${still.frames} and ${moving.frames} frames)`,
      hooked && still.frames > 3 && moving.frames > 3 && diff.every((d) => d.moving <= d.still + 0.05), { still, moving, diff });

    /* 6: out, and the arena's effects go with it */
    const leave = await P.page.evaluate(() => { const el = document.querySelector('[data-dungeon-leave]'); if (!el) return null; const q = el.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; });
    if (leave) await P.page.touchscreen.tap(Math.round(leave.x), Math.round(leave.y));
    const z2 = await waitZone((z) => z === 'wheel', 40000);
    const after = await poll(async () => { const o = await fx(); return o && o.fires === 0 && o.spores === 0 && o.sets === 2 ? o : null; }, 15000, 300);
    rec.ok(`6: out by Leave now (${z2}), the arena's effects went with it -- ${after ? after.fires : '?'} fires, ${after ? after.spores : '?'} spores, ${after ? after.sets : '?'} sets (the mouth's drips and pools)`,
      z2 === 'wheel' && !!after, { after });

    rec.ok(`7: no page errors${errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''}`, errs.length === 0, { errs });
  } finally {
    await H.liveFlag(wsPort, 'slimeboss', null);
    await P.ctx.close().catch(() => {});
  }
}
