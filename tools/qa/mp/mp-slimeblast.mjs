/* ═══ A SLIME'S BLAST BREAKS THE TREES NEAR IT AND LEAVES SOOT (v2.3.3679) ═══
 *
 * The owner, 2026-10-27: "It would be fun to make the slime explosions destroy
 * any nearby props (trees)" and "It would also be funny if the slime
 * explosions left black soot explosion mark on the ground for a while".
 *
 * On a phone (390 x 844, 2x) in the world, against a real worker, a blue
 * slime's blast through the game's own handler (a monster_ability burst
 * `execute`, the worker's middle and radius -- mp-slimewave's way), with
 * `?sootms=6000` so the soot's minute is six seconds:
 *   1. on BroTown's open ground: a soot mark lies at the blast, on the ground
 *      layer, its width the blast's 2.3 radii, lying flat (0.6 as tall), at
 *      its full strength -- and on the screen the ground just south of its
 *      middle is darker than it was (read after the shockwave);
 *   2. out in the Verdant Wilds' trees: the tree it went off beside breaks
 *      (wheelBreak's own list), and so does every object whose footprint is
 *      in the radius; one well outside it stands (the soot lies there too,
 *      under the ferns and bushes, which stand over the ground);
 *   3. after its time the soot is gone;
 *   4. no page errors.
 * Pictures: tools/qa/mp/out/slimeblast-{before,after}.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const HOME = process.env.BLAST_HOME || 'verdant';
const SOOT_MS = 6000, R = 110;

/* the ground's mean luminance in a box (CSS px) */
function lum(buf) {
  const png = H.decodePng(buf);
  const ch = png.channels || Math.round(png.data.length / (png.width * png.height));
  let sum = 0, n = 0;
  for (let i = 0; i < png.data.length; i += ch) { sum += 0.299 * png.data[i] + 0.587 * png.data[i + 1] + 0.114 * png.data[i + 2]; n++; }
  return n ? sum / n : 0;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Boomer', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel', query: 'sootms=' + SOOT_MS });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the world' }).catch(() => null);
    rec.ok('in the world (guard)', !!inW, inW);
    if (!inW) return;
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 30 });
    await H.devOp(wsPort, 'quests', me);
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});

    const screenAt = (x, y) => P.page.evaluate(([wx, wy]) => {
      const S = window._gameState.current;
      const c = document.querySelector('canvas').getBoundingClientRect();
      return { x: c.left + (wx - S.camera.x) * (S._worldScaleX || 1), y: c.top + (wy - S.camera.y) * (S._worldScaleY || 1), k: S._worldScaleX || 1 };
    }, [x, y]);
    const blast = (x, y) => P.page.evaluate(([bx, by, r]) => {
      const S = window._gameState.current;
      window.__btDispatch({ type: 'monster_ability', payload: { monsterId: 'qa-slime', zone: S.currentZone, ability: 'burst', phase: 'execute', ax: bx, ay: by, radius: r } });
      return Date.now();
    }, [x, y, R]);
    const soot = () => P.page.evaluate(() => (window._pixiRenderer && window._pixiRenderer.sootProbe ? window._pixiRenderer.sootProbe() : null));

    /* ── 1. on BroTown's open ground (south-east of where you arrive: the
       square's paving and the street, nothing standing) ── */
    const me0 = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    const tx = me0.x + 120, ty = me0.y + 160;
    const c1 = await screenAt(tx, ty);
    const band1 = { x: Math.round(c1.x - 30 * c1.k), y: Math.round(c1.y + 10 * c1.k), width: Math.max(8, Math.round(60 * c1.k)), height: Math.max(6, Math.round(24 * c1.k)) };
    const before1 = lum(await P.page.screenshot({ clip: band1 }));
    const view1 = { x: Math.max(0, Math.round(c1.x - 150)), y: Math.max(0, Math.round(c1.y - 150)), width: Math.min(300, PHONE.width - Math.max(0, Math.round(c1.x - 150))), height: 300 };
    await P.page.screenshot({ path: join(OUT, 'slimeblast-town-before.png'), clip: view1 }).catch(() => {});
    await blast(tx, ty);
    await P.page.waitForTimeout(400);
    const s1 = await soot();
    const mk = s1 && s1.marks && s1.marks[0];
    rec.ok(`1. a soot mark lies at the blast on the ground (${mk ? Math.round(mk.x) + ',' + Math.round(mk.y) + ', ' + mk.w + ' x ' + mk.h + ' px, alpha ' + mk.alpha + ', on ' + (s1.layer && s1.layer.label) : 'none'})`,
      !!s1 && s1.texture && s1.marks.length === 1 && Math.abs(mk.x - tx) < 2 && Math.abs(mk.y - ty) < 2 && mk.visible && mk.inLayer && mk.zone === 'wheel'
        && Math.abs(mk.w - 2.3 * R) < 0.08 * 2.3 * R && mk.h < 0.75 * mk.w && mk.alpha > 0.8 && s1.layer && s1.layer.label === 'groundDetails', s1);
    await P.page.waitForTimeout(1400);
    const after1 = lum(await P.page.screenshot({ clip: band1 }));
    await P.page.screenshot({ path: join(OUT, 'slimeblast-town-after.png'), clip: view1 }).catch(() => {});
    rec.ok(`...and on the screen the ground just south of its middle is darker: luminance ${before1.toFixed(0)} -> ${after1.toFixed(0)}`, after1 < before1 * 0.7, { before1, after1, band1 });

    /* ── 2. out to the land's trees ── */
    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const at = WHEEL_SPAWNS[HOME] && WHEEL_SPAWNS[HOME].points[0];
    await H.hopTo(P, at[0] + 160, at[1] + 160, { tries: 260 });
    await P.page.waitForTimeout(2500);
    /* the nearest tree drawn, and an object well outside the blast to watch */
    const pick = await P.page.evaluate((r) => {
      const S = window._gameState.current;
      const near = window.__btWheelObjects ? window.__btWheelObjects.near(S.player.x, S.player.y, 900) : [];
      const trees = [];
      for (const o of near) {
        const k = window.__btWheelBreak.kind(o.i);
        if (k && k.canopy && o.ready) trees.push({ i: o.i, id: o.id, x: o.x, y: o.y, hp: k.hp, d: Math.hypot(o.x - S.player.x, o.y - S.player.y) });
      }
      trees.sort((a, b) => a.d - b.d);
      const t = trees[0];
      if (!t) return { n: near.length };
      const far = near.filter((o) => Math.hypot(o.x - t.x, o.y - t.y) > r + 320 && Math.hypot(o.x - t.x, o.y - t.y) < r + 700)[0] || null;
      return { tree: t, far: far ? { i: far.i, id: far.id, x: far.x, y: far.y } : null, n: near.length };
    }, R);
    rec.ok(`a tree of the land drawn near you to blast (guard): ${pick && pick.tree ? pick.tree.id + ' at ' + Math.round(pick.tree.x) + ',' + Math.round(pick.tree.y) : 'none'} of ${pick && pick.n} objects`, !!(pick && pick.tree), pick);
    if (!pick || !pick.tree) return;
    const T = pick.tree;
    /* you stand off to the east, out of the picture */
    await H.hopTo(P, T.x + 300, T.y + 30, { tries: 40 });
    await P.page.waitForTimeout(1500);
    const bx = T.x + 20, by = T.y + 12;
    const c0 = await screenAt(bx, by);
    const view = { x: Math.max(0, Math.round(c0.x - 150)), y: Math.max(0, Math.round(c0.y - 200)), width: 300, height: 300 };
    await P.page.screenshot({ path: join(OUT, 'slimeblast-before.png'), clip: view }).catch(() => {});
    const t0 = await blast(bx, by);
    await P.page.waitForTimeout(400);
    const br = await P.page.evaluate(([ti, fi]) => {
      const B = window.__btWheelBreak;
      const list = B.broken();
      return { tree: list.some((b) => b.oi === ti), far: fi != null ? list.some((b) => b.oi === fi) : null, n: list.length,
        blasts: B.stats.blasts || 0, broke: B.stats.blastBroke || 0, ids: list.map((b) => b.id) };
    }, [T.i, pick.far ? pick.far.i : null]);
    const s2 = await soot();
    rec.ok(`2. the blast broke the tree it went off beside (${T.id}); ${br.broke} object(s) broken by the two blasts; one well outside it stands (${pick.far ? pick.far.id : 'none near'}); its soot lies there (${s2 && s2.marks.length} mark(s))`,
      br.tree && br.broke >= 1 && br.blasts === 2 && br.far !== true && !!s2 && s2.marks.some((m) => Math.abs(m.x - bx) < 2 && Math.abs(m.y - by) < 2), { br, s2 });
    await P.page.waitForTimeout(1400);
    await P.page.screenshot({ path: join(OUT, 'slimeblast-after.png'), clip: view }).catch(() => {});
    /* 3. gone after its time */
    const left = SOOT_MS - (await P.page.evaluate(() => Date.now()) - t0) + 900;
    if (left > 0) await P.page.waitForTimeout(left);
    const gone = await soot();
    rec.ok(`3. after its time (${SOOT_MS} ms here, a minute in play) the soot is gone (${gone && gone.marks.length} left)`, !!gone && gone.marks.length === 0, gone);
    rec.ok('4. no page errors', errors.length === 0, errors.slice(0, 3));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
