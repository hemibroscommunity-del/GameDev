/* THE CLIFFTOP TOWN, AND ITS EDGES (v2.3.1777).
 *
 * Owner: "I want the first 2 images to be the town map ... Not walkable."
 *
 * The town was a square map you could walk anywhere on.  It is now a plateau
 * ringed by cliffs with a painted valley beyond, which makes collision a
 * requirement rather than a nicety: without it you walk off the edge and stand
 * in the sky.
 *
 * The walk grid is DERIVED from the map art (tools/maps/build-town-v16.mjs),
 * so what is worth testing is not the grid's contents — that is generated —
 * but the two things a generated grid can still get wrong in play:
 *
 *   1. it must actually be LOADED for town, and only for town.  Every other
 *      zone's mask has been off since v2.3.1693 because the hand-painted ones
 *      drifted, and one zone getting collision back must not hand it to seven.
 *   2. it must be REACHABLE as a place.  The first build classified the
 *      shadowed stairs as blocked, which left the upper courtyard walkable and
 *      unreachable — correct cell by cell, broken as a town.
 *
 * So this walks the edges and walks the stairs, rather than reading the JSON.
 */
import * as H from './harness.mjs';

const ZONE_W = 96, ZONE_H = 30, TILE = 32;

const pos = (P) => H.readState(P, (S) => ({ x: Math.round(S.player.x), y: Math.round(S.player.y) }));
const put = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState.current;
  S.player.x = px; S.player.y = py; S.player.vx = 0; S.player.vy = 0;
}, { px: x, py: y });

async function hold(P, key, ms) {
  await P.page.keyboard.down(key);
  await P.page.waitForTimeout(ms);
  await P.page.keyboard.up(key);
  await P.page.waitForTimeout(250);
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Surveyor', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2000);

  const zone = await H.readState(P, (S) => {
    const z = (window.__btZones || {})[S.currentZone] || null;
    return { id: S.currentZone, w: z && z.w, h: z && z.h };
  }).catch(() => null);

  const grids = await H.readState(P, (S) => Object.keys(S._tiledWalkable || {}));
  rec.ok('town loads a walkability grid', grids.includes('town'), grids);
  /* The allowlist, stated as a test: the other zones' masks are still wrong
     and must stay off.  Without this, someone "fixing" the flag re-enables
     seven broken masks and this file would not notice. */
  rec.ok('...and it is the ONLY zone that does', grids.length === 1, grids);

  const spawn = await pos(P);
  rec.ok('you spawn on the plateau, inside the new bounds',
    spawn.x > 0 && spawn.x < ZONE_W * TILE && spawn.y > 0 && spawn.y < ZONE_H * TILE, spawn);

  /* ── 1. the cliff stops you ──
     Walked into, not read: the grid could be perfect and never consulted.

     THE THRESHOLDS DISCRIMINATE, which the first version of this did not.
     It walked for 3s and asserted x > 60 — true whether or not collision
     exists, because 3s does not even cross the plateau, so it passed with the
     mask switched off.  The hold is now long enough to reach the zone bound,
     and the bar sits at the CLIFF, measured off the grid: at y=700 the
     walkable plateau runs x 672..2664, so stopping anywhere above ~400 means
     the cliff stopped you and anywhere near 10 means you walked to the edge
     of the map through thin air. */
  await put(P, 1400, 700);
  await P.page.waitForTimeout(300);
  const beforeW = await pos(P);
  await hold(P, 'a', 9000);           /* far enough west to reach the map edge */
  const afterW = await pos(P);
  rec.ok('walking west actually moved the player (guard)', afterW.x < beforeW.x - 200, { beforeW, afterW });
  rec.ok('the west cliff stops you — you do not walk off the plateau',
    afterW.x > 400, { afterW, plateauStartsAt: 672 });

  /* North, into the cliff above the open eastern plateau: walkable y starts
     at 208 for x=2000, so a stop above ~120 is the cliff and not the bound. */
  await put(P, 2000, 800);
  await P.page.waitForTimeout(300);
  await hold(P, 'w', 9000);
  const afterN = await pos(P);
  rec.ok('the north cliff stops you too', afterN.y > 120, { afterN, plateauStartsAt: 208 });

  /* ── 2. the stairs are a way up, not a picture of one ── */
  await put(P, 985, 560);             /* plaza, at the foot of the steps */
  await P.page.waitForTimeout(300);
  const footOfSteps = await pos(P);
  await hold(P, 'w', 4000);
  const upTop = await pos(P);
  rec.ok('the stairs carry you up into the walled courtyard',
    upTop.y < 330, { from: footOfSteps, to: upTop });

  /* ── 3. everything placed in town stands on ground you can reach ── */
  const placed = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const out = [];
    for (const n of (S.npcs || [])) out.push({ id: n.id, x: n.x, y: n.y });
    for (const p of (window.__btWorldProps ? window.__btWorldProps() : [])) out.push({ id: p.id, x: p.x, y: p.y });
    return out;
  });
  const offGrid = placed.filter((p) => p.x <= 0 || p.y <= 0 || p.x >= ZONE_W * TILE || p.y >= ZONE_H * TILE);
  rec.ok('every NPC and prop is inside the new zone bounds', offGrid.length === 0, { offGrid, placed });

  /* Each of them is somewhere the player can actually stand next to. */
  const stuck = [];
  for (const p of placed) {
    await put(P, p.x, p.y + 60);
    await P.page.waitForTimeout(120);
    const at = await pos(P);
    if (Math.abs(at.x - p.x) > 200) stuck.push({ p, at });
  }
  rec.ok('...and none of them is stranded off the walkable plateau',
    stuck.length === 0, stuck);

  await P.ctx.close().catch(() => {});
}
