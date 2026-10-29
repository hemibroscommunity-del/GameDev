/* ═══ UNDER THE CANOPY, STILL SEEN (v2.3.3815) ═══
 *
 * Lane A's judge pass, 2026-10-29: in the Earth Forest the bro and the slimes
 * vanish entirely under a tree's canopy, their name plates too -- a judge
 * walking the first quest lost his own character.
 *
 * A phone (390 x 844 at 3x) in the Wheel walks to the Earth Forest's slimes,
 * finds the nearest crowned tree (wheelMaterials.js `canopy`) and stands
 * behind it, boots a third of its height up its picture: the crown over his
 * body.  Then:
 *   1. the tree eases see-through over him (wheelObjects.js, v2.3.2999's
 *      rule: SEE_ALPHA), and back to solid once he steps out in front;
 *   2. the monsters hidden by the woods are drawn as silhouettes
 *      (monsterSilhouette.js), read off its probe;
 *   3. what was drawn, photographed behind and in front, and the frame
 *      sampled under the crown (8 s of perfTracker).
 * BT_QA_QUERY passes switches (`nofade`: the canopy stays solid).
 * Pictures: tools/qa/mp/out/canopy-*.png. */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const CROWNS = ['oak', 'orchard', 'pine', 'birch', 'deadtree', 'palm', 'slimetree', 'mangrove', 'jungletree', 'wildfruit'];

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const tag = (process.env.BT_QA_QUERY || 'default').replace(/[^a-z0-9]+/gi, '-');
  const P = await H.newPlayer(browser, { name: 'Canopy', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel' });
  let alive = true;
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!ok, ok);
    if (!ok) return;
    const myId = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'quests', myId).catch(() => null);
    await P.page.evaluate(() => {
      setInterval(() => {
        const S = window._gameState && window._gameState.current, R = S && S.rpg;
        if (R) { if (!R._quests || typeof R._quests !== 'object') R._quests = {}; if (!R._quests.tut_1) R._quests.tut_1 = true; }
      }, 100);
    });
    (async () => {
      while (alive) {
        await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 8 }).catch(() => null);
        await P.page.keyboard.press('Control').catch(() => {});
        for (let i = 0; i < 4 && alive; i++) await P.page.waitForTimeout(500).catch(() => {});
      }
    })();
    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const at = WHEEL_SPAWNS.verdant.points[0];
    await H.glideTo(P, at[0], at[1]);
    await P.page.waitForTimeout(3000);
    /* the nearest crowned tree, its picture loaded and tall */
    const tree = await P.page.evaluate((CROWNS) => {
      const S = window._gameState.current, W = window.__btWheelObjects;
      const near = W.near(S.player.x, S.player.y, 1400).map((o) => ({ ...o, s: W.sprite(o.i) }))
        .filter((o) => o.s && CROWNS.includes(o.id) && o.h > 180);
      near.sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y));
      return near[0] ? { x: near[0].x, y: near[0].y, h: near[0].h, i: near[0].i, id: near[0].id } : null;
    }, CROWNS);
    rec.ok(`a crowned tree near the Earth Forest's slimes (${tree && tree.id}, ${tree && tree.h} px tall) (guard)`, !!tree, tree);
    if (!tree) return;
    const feetDy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround ? window.__btPlayerGround() : null; return g ? g.y - S.player.y : 50; });
    const read = () => P.page.evaluate((i) => {
      const s = window.__btWheelObjects.sprite(i);
      const sil = window.__btSilhouettes ? window.__btSilhouettes() : null;
      return { alpha: s ? +s.alpha.toFixed(2) : null, seeThrough: window.__btWheelObjects.stats.seeThrough, sil };
    }, tree.i);
    /* behind: boots a third of its height up its picture */
    await H.hopTo(P, tree.x, tree.y - tree.h * 0.3 - feetDy, { tries: 40 });
    await P.page.waitForTimeout(900);
    const behind = await read();
    await P.page.screenshot({ path: join(OUT, `canopy-${tag}-behind.png`) });
    /* the frame, sampled under the crown (perfTracker, renderFrame.js; this
       box draws in software, so read it against ?nofade's, not as a phone's) */
    await P.page.evaluate(() => { window.perfTracker && window.perfTracker.reset(); });
    await P.page.waitForTimeout(8000);
    const frame = await P.page.evaluate(() => {
      const t = window.perfTracker, rows = (t && t.getSamples()) || [];
      const col = (k) => rows.map((r) => r[k]).filter((v) => typeof v === 'number').sort((a, b) => a - b);
      const q = (a, p) => (a.length ? +a[Math.min(a.length - 1, Math.floor(a.length * p))].toFixed(2) : null);
      return { frames: rows.length, workP50: q(col('workMs'), 0.5), workP95: q(col('workMs'), 0.95), renderP50: q(col('renderMs'), 0.5) };
    });
    console.log(`    frame under the crown (8 s): ${JSON.stringify(frame)}`);
    rec.ok(`the frame under the crown was sampled (${frame.frames} frames, work p50 ${frame.workP50} ms, p95 ${frame.workP95} ms, drawing p50 ${frame.renderP50} ms)`, frame.frames > 0, frame);
    await H.hopTo(P, tree.x, tree.y + 90 - feetDy, { tries: 40 });
    await P.page.waitForTimeout(900);
    const front = await read();
    await P.page.screenshot({ path: join(OUT, `canopy-${tag}-front.png`) });
    console.log(`    behind ${JSON.stringify(behind)}\n    front ${JSON.stringify(front)}`);
    if (!/nofade/.test(process.env.BT_QA_QUERY || '')) {
      rec.ok(`standing behind the ${tree.id} under its crown, it eases see-through over the bro (${behind.alpha}), and back once he steps out in front (${front.alpha})`,
        behind.alpha != null && behind.alpha < 0.6 && front.alpha > 0.95, { behind, front });
    } else {
      rec.ok(`with ?nofade the ${tree.id} stays solid behind (${behind.alpha}) and in front (${front.alpha})`, behind.alpha === 1 && front.alpha === 1, { behind, front });
    }
    const pageErrors = P.logs.filter((l) => /pageerror/.test(l));
    rec.ok('no page errors', pageErrors.length === 0, pageErrors.slice(0, 4));
  } finally {
    alive = false;
    await P.ctx.close().catch(() => {});
  }
}
