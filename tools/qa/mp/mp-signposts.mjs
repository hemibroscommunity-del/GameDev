/* ═══ BROTOWN'S SIGNPOSTS, NAMED (v2.3.3062) ═══
 *
 * The owner, on the recommendations for finding your way round the Wheel:
 * "Continue building recommended" -- signposts naming the lands among them.
 *
 * On a phone (390 x 844, 3x) in the Wheel, against a real worker:
 *   1. the town's four signposts found, one at each gate, and the eight
 *      lands' icons loaded behind the Wheel's loading screen;
 *   2. from the square, none of their plates is up (the screen stays quiet);
 *   3. at each gate, its two plates fade in over the signpost: the land
 *      straight on down that road first, then the land whose trail forks off
 *      it -- each named as the map names it, with its icon, its arrow
 *      pointing the way the land lies, and (v2.3.3089) the levels its land
 *      holds, "Lv 1–20";
 *   4. walking away, they fade out and go;
 *   5. (v2.3.3145, the owner: "Change the signage in the town to proximity
 *      based so it only pops up when you get close") they are CLOSE ones: on
 *      the street ~450 px short of each signpost -- on screen, where the old
 *      640 px had them fully up -- none of its plates is up, and at the gate
 *      they have popped up to their full size;
 *   6. no page errors.
 * Pictures: tools/qa/mp/out/signposts-{north,east,south,west}.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { PLAN, SPOKES } from '../../../public/tools/world/plan.js';
import { buildBlueprint } from '../../../public/tools/world/core/layout.js';
import { wheelMap } from '../../../public/tools/world/core/wheelmap.js';
import { landLevelsText, SIGNPOST_SHOW_R } from '../../../src/data/wheelSignposts.js';

const PHONE = { width: 390, height: 844 };
const WANT = { north: ['ember', 'frost'], east: ['hollows', 'sky'], south: ['tidal', 'thunder'], west: ['verdant', 'mist'] };
/* the way each land lies, screen angle (north up): its plan direction */
const COMPASS = { E: 0, SE: Math.PI / 4, S: Math.PI / 2, SW: 3 * Math.PI / 4, W: Math.PI, NW: -3 * Math.PI / 4, N: -Math.PI / 2, NE: -Math.PI / 4 };
const DIR = Object.fromEntries(SPOKES.map((id) => [id, COMPASS[PLAN.regions[id].dir]]));
const angDiff = (a, b) => { let d = Math.abs(a - b) % (2 * Math.PI); return d > Math.PI ? 2 * Math.PI - d : d; };

/* mp-harvestbar's walk: H.hopTo's hops, checked against the worker */
async function travel(P, wsPort, myId, tx, ty) {
  const worker = async () => {
    const a = await H.adminPlayer(wsPort, myId).catch(() => null);
    return (a && a.live) || {};
  };
  const here = () => H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
  const apart = (L, c) => typeof L.x === 'number' && Math.hypot(L.x - c.x, L.y - c.y) > 60;
  for (let leg = 0; leg < 300; leg++) {
    const L = await worker();
    const c = await here();
    if (apart(L, c)) {
      await P.page.waitForTimeout(900);
      const L2 = await worker();
      const c2 = await here();
      if (apart(L2, c2) && Math.hypot(L2.x - L.x, L2.y - L.y) < 2) {
        await P.page.evaluate(({ x, y }) => { const S = window._gameState.current; S.player.x = x; S.player.y = y; S.player.vx = 0; S.player.vy = 0; }, { x: L2.x, y: L2.y });
        await P.page.waitForTimeout(500);
      }
      continue;
    }
    if (Math.hypot(tx - c.x, ty - c.y) < 6) return true;
    await H.hopTo(P, tx, ty, { tries: 4 });
  }
  return false;
}

const signs = (P) => P.page.evaluate(() => ({ posts: window.__btGatePosts || null, drawn: window.__btSignposts || [], icons: window.__btSignpostIcons || 0 }));

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Signbro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', init: 'window.__btProbe = true;' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();
  try {
    await H.enterWorld(P);
    const myId = await H.readState(P, (S) => S.myId);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!inW, inW);
    if (!inW) return;
    await P.page.addStyleTag({ content:
      '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 });
    let s0 = null;
    for (let i = 0; i < 40; i++) { s0 = await signs(P); if (s0.posts && s0.posts.length) break; await P.page.waitForTimeout(500); }
    const posts = (s0 && s0.posts) || [];
    rec.ok(`the town's four signposts found, one at each gate (${posts.map((p) => p.gate).join(', ')}), and the lands' icons loaded behind the loading screen (${s0 && s0.icons} of 8)`,
      posts.length === 4 && new Set(posts.map((p) => p.gate)).size === 4 && s0.icons === 8, s0);
    rec.ok('...from the square, none of their plates is up', s0 && s0.drawn.every((d) => !d.visible), s0 && s0.drawn);

    /* v2.3.3145: the street's middle a little over a screen-half short of each
       post, town-side -- Main Street runs north-south through the town's
       middle, Market Row east-west -- ~450 px from it */
    const town = wheelMap(PLAN, buildBlueprint(PLAN)).hub.town;
    const SHORT = 430;
    const shortOf = (p) => (p.gate === 'north' ? { x: town.x, y: p.y + SHORT } : p.gate === 'south' ? { x: town.x, y: p.y - SHORT }
      : p.gate === 'east' ? { x: p.x - SHORT, y: town.y } : { x: p.x + SHORT, y: town.y });
    for (const gate of ['north', 'east', 'south', 'west']) {
      const p = posts.find((q) => q.gate === gate);
      if (!p) { rec.ok(`${gate} gate: a signpost (guard)`, false, posts); continue; }
      /* v2.3.3145: a screen away, on the street, none of its plates is up */
      const st = shortOf(p);
      await travel(P, wsPort, myId, st.x, st.y);
      await P.page.waitForTimeout(900);
      const far = await P.page.evaluate(({ x, y }) => {
        const S = window._gameState.current;
        const ws = S._worldScaleX || 1, hs = S._worldScaleY || 1;
        const sx = (x - S.camera.x) * ws, sy = (y - S.camera.y) * hs;
        return { d: Math.round(Math.hypot(S.player.x - x, S.player.y - y)), onScreen: sx > 0 && sx < 390 && sy > 0 && sy < 844,
          drawn: (window.__btSignposts || []).filter((e) => Math.abs(e.x - x) < 2 && Math.abs(e.y - y) < 2) };
      }, p);
      /* (the north and south posts are on screen from here; the east and west
         ones just off its side -- a phone is narrow -- with the old 640 px
         plates, ~300 px wide, reaching into it) */
      rec.ok(`${gate} gate: ${far.d} px short of it on the street${far.onScreen ? ', its signpost on screen' : ''}, none of its plates is up (they come up within ${SIGNPOST_SHOW_R}; the old ${640 - 160} had them all up)`,
        far.d > SIGNPOST_SHOW_R + 60 && far.d < 640 - 160 && far.drawn.every((e) => !e.visible && e.alpha === 0), far);
      /* stand a little to its south and town-side, with it and its plates over you */
      await travel(P, wsPort, myId, p.x - 40, p.y + 130);
      let d = null;
      for (let i = 0; i < 20; i++) {
        const s = await signs(P);
        d = s.drawn.find((x) => x.gate === gate) || null;
        if (d && d.alpha >= 0.99) break;
        await P.page.waitForTimeout(250);
      }
      const want = WANT[gate];
      const names = d ? d.plates.map((pl) => pl.name) : [];
      /* v2.3.3089: and each ends in the levels its land holds ("Lv 1–20") */
      const okPlates = !!d && d.plates.length === 2 && d.plates.every((pl, k) => pl.land === want[k] && pl.name === PLAN.regions[want[k]].name && pl.icon
        && angDiff(pl.rot, DIR[want[k]]) < 0.02 && pl.lv === landLevelsText()) && d.plates[0].y < d.plates[1].y;
      rec.ok(`${gate} gate: its plates pop up to their full size (${d && d.scale}) -- "${names.join('" over "')}" -- each with its icon, its arrow the way the land lies and "${landLevelsText()}"`,
        !!d && d.visible && d.alpha >= 0.99 && d.scale >= 0.995 && okPlates, d);
      const scr = await P.page.evaluate(({ x, y }) => {
        const S = window._gameState.current;
        const cv = document.querySelector('canvas').getBoundingClientRect();
        return { x: cv.left + (x - S.camera.x) * (S._worldScaleX || 1), y: cv.top + (y - S.camera.y) * (S._worldScaleY || 1) };
      }, p);
      const W = 360, Hh = 330;
      await P.page.screenshot({ path: join(OUT, `signposts-${gate}.png`),
        clip: { x: Math.max(0, Math.min(PHONE.width - W, Math.round(scr.x - W / 2))), y: Math.max(0, Math.min(PHONE.height - Hh, Math.round(scr.y - 260))), width: W, height: Hh } }).catch(() => {});
    }

    /* walking away: they fade out and go */
    const north = posts.find((q) => q.gate === 'north');
    await travel(P, wsPort, myId, north.x, north.y + 1100);
    await P.page.waitForTimeout(1500);
    const s9 = await signs(P);
    rec.ok(`walking away, they go (${s9.drawn.length} drawn)`, s9.drawn.every((x) => !x.visible), s9.drawn);
    rec.ok(`no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  } finally {
    stopAlive = true;
    await P.ctx.close().catch(() => {});
  }
}
