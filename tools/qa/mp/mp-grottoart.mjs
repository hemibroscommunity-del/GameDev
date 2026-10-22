/* ═══ THE GOO GROTTO IN THE OWNER'S PICTURES, ON A PHONE (v2.3.3566, docs/specs/dungeon-art.md) ═══
 *
 * The owner sent the first four of the dungeons' ChatGPT pictures ("Here's the
 * first 4"): the Goo Grotto's entrance, its walls, the things inside its
 * arena, and the boss's chest.  One real player against a real worker, on a
 * phone (390 x 844, touch), in the world:
 *   1. walked toward the Goo Grotto, its mouth is the owner's picture: the
 *      mound standing in the depth-sorted layer at its foot line, 440 game px
 *      wide, the slime before it lying flat on the ground (the picture split
 *      at its `foot`);
 *   2. walking north into it, your boots stop at the cave's lip (the mound's
 *      footprint, handed to the walk test with the Wheel's objects');
 *   3. in through its Enter button, the arena is walled with the owner's
 *      strips (tileRenderer's `walls: 'art'`) and furnished with all 17
 *      things, where data/dungeonArena.js puts them -- the puddles flat on the
 *      ground, the rest standing -- and its footprints are the walls' five and
 *      the nine that stop you;
 *   4. walking north into the tall pillar, your boots stop at its base;
 *   5. the waves and the boss cleared, the chest lands where the boss stood,
 *      shut, and opens; the clear's card shows the same chest, open;
 *   6. out by Leave now, back at the mouth, and the arena's pictures let go;
 *   7. no page errors.
 * Pictures: tools/qa/mp/out/grotto-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const { WHEEL_DOORS } = await import(H.REPO + '/server/src/wheelspawns.js');
  const { DUNGEON_ART } = await import(H.REPO + '/src/data/dungeonArt.js');
  const { arenaThings, arenaBlockers, ARENA_WALLS, ARENA_W } = await import(H.REPO + '/src/data/dungeonArena.js');
  const G = WHEEL_DOORS.verdant;
  const A = DUNGEON_ART.verdant;
  /* one big boss: the test is about the chest, not the splits */
  await H.liveFlag(wsPort, 'slimeboss', false);
  const P = await H.newPlayer(browser, { name: 'Grottobro', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 2 });
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
    const me = () => H.readState(P, (S) => ({ x: S.player.x, y: S.player.y, z: S.currentZone }));
    await waitZone((z) => z === 'wheel');
    const id = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'quests', id);
    await H.devOp(wsPort, 'vitals', id, { god: true, godMinutes: 30 });

    /* 1: the mouth, the owner's picture */
    await H.hopTo(P, G.at[0], G.at[1] + 260, { step: 100, gap: 260 });
    const art = await poll(() => P.page.evaluate(() => (window.__btWheelDoorsArt || []).find((d) => d.id === 'verdant') || null), 20000);
    await P.page.waitForTimeout(600);
    await P.page.screenshot({ path: join(OUT, 'grotto-mouth.png') }).catch(() => {});
    const wantW = Math.round(A.mouth.w / 2), wantH = Math.round(A.mouth.foot[1] / 2), wantApron = Math.round((A.mouth.h - A.mouth.foot[1]) / 2);
    rec.ok(`1: the Goo Grotto's mouth is the owner's picture -- standing ${art && art.w} x ${art && art.h} in ${art && art.layer}, its slime ${art && art.apronH} px lying flat before it`,
      !!art && art.x === G.at[0] && art.y === G.at[1] && Math.abs(art.w - wantW) <= 1 && Math.abs(art.h - wantH) <= 1
        && Math.abs(art.apronH - wantApron) <= 1 && (art.layer === 'entities' || art.layer === 'gatherNodesFront'), { art, wantW, wantH, wantApron });

    /* 2: the mound stops your boots at the cave's lip -- the game's own feet
       test (BroTown.jsx propFeetBlocked, its probe), then a walk from just
       south of it (this box draws a few frames a second: a long walk covers
       little ground) */
    await H.hopTo(P, G.at[0], G.at[1] + 20, { step: 60, gap: 260 });
    await P.page.waitForTimeout(800);
    const feet = await P.page.evaluate(({ x, y }) => {
      const f = window.__btPropFeetBlocked;
      return f ? { into: f(x, y + 20, x, y - 60), beside: f(x, y + 20, x + 320, y - 60), before: f(x, y + 20, x, y + 60) } : null;
    }, { x: G.at[0], y: G.at[1] });
    const y0 = (await me()).y;
    for (let i = 0; i < 4; i++) await H.nudge(P, 'w', 700);
    const lip = await me();
    await P.page.screenshot({ path: join(OUT, 'grotto-lip.png') }).catch(() => {});
    rec.ok(`2: the mound stops your boots at the cave's lip -- a step into it refused (${feet && feet.into}), one beside it or before it not (${feet && feet.beside}, ${feet && feet.before}); walking north you stop with your middle ${Math.round(lip.y - G.at[1])} px from its foot line (from ${Math.round(y0 - G.at[1])})`,
      !!feet && feet.into === true && feet.beside === false && feet.before === false
        && lip.z === 'wheel' && lip.y < y0 - 10 && lip.y > G.at[1] - 90, { feet, lip, y0, at: G.at });

    /* 3: in -- the walls and the things */
    await H.hopTo(P, G.at[0], G.at[1] + 60, { step: 60, gap: 260 });
    for (let i = 0; i < 20; i++) {
      if (await P.page.evaluate(() => !!document.querySelector('[data-wheel-door]'))) break;
      await P.page.waitForTimeout(300);
    }
    const b = await P.page.evaluate(() => { const el = document.querySelector('[data-wheel-door]'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    if (b) await P.page.touchscreen.tap(Math.round(b.x), Math.round(b.y));
    const z1 = await waitZone((z) => /^dungeon:/.test(z), 30000);
    await P.page.waitForTimeout(1500);
    const inside = await P.page.evaluate(() => ({ floor: window.__btArenaFloor || null, world: window.__btArenaWorld ? window.__btArenaWorld() : null }));
    const things = arenaThings('verdant');
    const W = inside.world;
    const placed = W ? W.things : [];
    const where = (t) => placed.find((p) => p.art === t.art);
    const allThere = things.every((t) => { const p = where(t); return !!p && p.x === t.x && p.y === t.y && (t.flat ? p.layer === 'groundDetails' : p.layer === 'entities' || p.layer === 'gatherNodesFront'); });
    await P.page.screenshot({ path: join(OUT, 'grotto-arena-exit.png') }).catch(() => {});
    rec.ok(`3: in the Goo Grotto (${z1}) the walls are the owner's (${inside.floor && inside.floor.walls}) and all ${placed.length} things stand where they go -- the puddles flat, the rest standing -- with ${W && W.blockers} footprints`,
      /^dungeon:/.test(z1 || '') && !!inside.floor && inside.floor.walls === 'art' && !!W && placed.length === things.length && allThere
        && W.blockers === arenaBlockers('verdant').length, { inside, want: things.length });

    /* the north wall, and the two east corners, as a phone sees them */
    await H.hopTo(P, ARENA_W / 2, 420, { step: 120, gap: 260 });
    await P.page.waitForTimeout(900);
    await P.page.screenshot({ path: join(OUT, 'grotto-arena-north.png') }).catch(() => {});
    await H.hopTo(P, ARENA_W - 160, 420, { step: 120, gap: 260 });
    await P.page.waitForTimeout(900);
    await P.page.screenshot({ path: join(OUT, 'grotto-arena-ne.png') }).catch(() => {});
    await H.hopTo(P, ARENA_W - 160, 1300, { step: 120, gap: 260 });
    await P.page.waitForTimeout(900);
    await P.page.screenshot({ path: join(OUT, 'grotto-arena-se.png') }).catch(() => {});

    /* 4: the tall pillar stops your boots at its base */
    const pil = things.find((t) => t.art === 'pillar-1');
    await H.hopTo(P, pil.x, pil.y - 10, { step: 60, gap: 260 });
    await P.page.waitForTimeout(700);
    const pf = await P.page.evaluate(({ x, y }) => {
      const f = window.__btPropFeetBlocked;
      return f ? { into: f(x, y + 40, x, y - 60), beside: f(x, y + 40, x + 90, y - 60) } : null;
    }, { x: pil.x, y: pil.y });
    const p0 = (await me()).y;
    for (let i = 0; i < 3; i++) await H.nudge(P, 'w', 700);
    const atPil = await me();
    await P.page.screenshot({ path: join(OUT, 'grotto-pillar.png') }).catch(() => {});
    rec.ok(`4: the tall pillar stops your boots at its base -- a step into it refused (${pf && pf.into}), one beside it not (${pf && pf.beside}); walking north you stop with your middle ${Math.round(atPil.y - pil.y)} px from its foot (from ${Math.round(p0 - pil.y)})`,
      !!pf && pf.into === true && pf.beside === false && atPil.y < p0 - 5 && atPil.y > pil.y - 90 && Math.abs(atPil.x - pil.x) < 30, { pf, atPil, p0, pil });

    /* 5: the waves, the boss, the chest */
    await H.hopTo(P, ARENA_W / 2, 1000, { step: 120, gap: 260 });
    let boss = null;
    for (let k = 0; k < 6 && !boss; k++) {
      await H.devOp(wsPort, 'clearwave', id);
      boss = await poll(() => P.page.evaluate(() => {
        const m = ((window._gameState.current || {}).monsters || []).find((q) => q.alive !== false && q.boss);
        return m ? { id: m.id, x: m.x, y: m.y } : null;
      }), 3000, 250);
    }
    await P.page.waitForTimeout(600);
    const bossAt = await P.page.evaluate(() => { const w = window.__btArenaWorld ? window.__btArenaWorld() : null; return w && w.bossAt; });
    const r = boss ? await H.devOp(wsPort, 'hurt', id, { boss: true, dmg: 10000000 }) : null;
    const landed = await poll(() => P.page.evaluate(() => { const w = window.__btArenaWorld ? window.__btArenaWorld() : null; return w && w.chest; }), 15000, 100);
    const opened = await poll(() => P.page.evaluate(() => { const w = window.__btArenaWorld ? window.__btArenaWorld() : null; return w && w.chest && w.chest.opened ? w.chest : null; }), 6000, 100);
    const card = await poll(() => P.page.evaluate(() => {
      const f = document.querySelector('[data-boss-chest] [data-chest-frame]');
      return f && f.getAttribute('data-chest-frame') === 'open' ? 'open' : null;
    }), 6000, 100);
    /* the card's chest, then the world's from a step north of it (the cards
       at the top of the screen would cover it from the south) */
    await P.page.screenshot({ path: join(OUT, 'grotto-chest-card.png') }).catch(() => {});
    if (opened) await H.hopTo(P, opened.x, opened.y - 260, { step: 120, gap: 200 });
    await P.page.waitForTimeout(500);
    await P.page.screenshot({ path: join(OUT, 'grotto-chest.png') }).catch(() => {});
    const clampX = (x) => Math.max(ARENA_WALLS.SIDE + 70, Math.min(ARENA_W - ARENA_WALLS.SIDE - 70, x));
    const near = !!(landed && bossAt) && Math.abs(landed.x - clampX(bossAt.x)) < 40;
    rec.ok(`5: the boss killed (${r && r.dealt} dealt), the chest lands where it stood (${landed && Math.round(landed.x)}, ${landed && Math.round(landed.y)}; the boss at ${bossAt && Math.round(bossAt.x)}, ${bossAt && Math.round(bossAt.y)}), shut, then opens -- and the card's chest opens with it (${card})`,
      !!r && r.ok && !!landed && landed.frame === 'shut-1' && !!opened && opened.frame === 'open-1' && near && card === 'open', { r, landed, opened, bossAt, card });

    /* 6: out, and the arena's pictures go */
    const leave = await P.page.evaluate(() => { const el = document.querySelector('[data-dungeon-leave]'); if (!el) return null; const q = el.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; });
    if (leave) await P.page.touchscreen.tap(Math.round(leave.x), Math.round(leave.y));
    const z2 = await waitZone((z) => z === 'wheel', 40000);
    const out = await me();
    const freed = await poll(() => P.page.evaluate(() => { const L = window.__btDungeonArtLive ? window.__btDungeonArtLive() : null; return L && L.length === 0 ? 'none' : null; }), 8000, 250);
    rec.ok(`6: out by Leave now, back at the mouth (${z2}, ${Math.round(Math.hypot(out.x - G.at[0], out.y - G.at[1]))} px from it), and the arena's pictures let go (${freed})`,
      z2 === 'wheel' && Math.hypot(out.x - G.at[0], out.y - G.at[1]) < 400 && freed === 'none', { out, freed });

    rec.ok(`7: no page errors${errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''}`, errs.length === 0, { errs });
  } finally {
    await H.liveFlag(wsPort, 'slimeboss', null);
    await P.ctx.close().catch(() => {});
  }
}
