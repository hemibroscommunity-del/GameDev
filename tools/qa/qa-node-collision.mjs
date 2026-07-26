/* v2.3.1501: does resource collision match the art?  Measured in the running
 * game, not derived on paper.
 *
 * The owner reported blocked areas not matching the sprites -- ore and trees
 * wrong, ponds right -- and guessed the cause exactly: "where the image sits
 * relative to where you're measuring from".  Two rounds of arithmetic had
 * already been wrong about it, so this stops reasoning and measures.
 *
 * For each node type it walks a grid over the sprite's box.  At every cell it
 * drops the player there and pushes them toward the node centre: if they cannot
 * move, that cell is BLOCKED.  It then samples the source texture's alpha at
 * the same cell.  Comparing the two maps answers the actual question -- is the
 * solid area the shape of the drawn thing?
 *
 * Reports, per type:
 *   covered   how much of the ARTWORK is solid   (low = you can walk over it)
 *   spill     how much of the SOLID area is empty canvas (high = invisible wall)
 * plus an ASCII map: # solid+art, o solid but no art, . art but walkable.
 *
 * Runs fully OFFLINE -- the client reaches town with no worker, so nothing here
 * touches the live game.
 *
 * Prereqs:  npm run build && npx vite preview --port 4173
 * Usage:    node tools/qa/qa-node-collision.mjs
 */
import { chromium } from 'playwright-core';

const EXE = process.env.QA_CHROME
  || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const CASES = [
  { type: 'oreVein', lvl: 1, art: '/sprites/world/ore-vein.webp' },
  { type: 'oreVein', lvl: 91, art: '/sprites/world/ore-vein.webp' },
  { type: 'tree', lvl: 1, art: '/sprites/trees/tree-pine.webp' },
  { type: 'tree', lvl: 91, art: '/sprites/trees/tree-pine.webp' },
  { type: 'fishSpot', lvl: 1, art: '/sprites/world/fish-spot.webp' },
];
const N = 19;          // grid resolution across the sprite box
const SETTLE = 90;     // ms of push per cell

const browser = await chromium.launch({
  executablePath: EXE, headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--mute-audio'],
});
const ctx = await browser.newContext({ viewport: { width: 480, height: 900 }, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => { const s = String(e); if (!/EncodingError/.test(s)) errors.push(s.slice(0, 140)); });
await page.addInitScript(`window.BROTOWN_WS_URL='ws://127.0.0.1:8799'`);   // no worker: stays offline
await page.goto('http://127.0.0.1:4173/?noresume=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(9000);
await page.locator('input').first().fill('CollideQA', { timeout: 20000 });
await page.locator('input').first().press('Enter');
await page.waitForFunction(
  () => { const S = window._gameState && window._gameState.current; return !!(S && S.player && S.currentZone); },
  { timeout: 45000 });
await page.waitForTimeout(2000);

const HOME = await page.evaluate(() => {
  const S = window._gameState.current;
  S.monsters = [];                    // monsters are solid too -- keep them out of it
  return { x: Math.round(S.player.x), y: Math.round(S.player.y) };
});

let anyFail = false;
for (const c of CASES) {
  const r = await page.evaluate(async ({ c, HOME, N, SETTLE }) => {
    const S = window._gameState.current, P = S.player;
    const sleep = ms => new Promise(res => setTimeout(res, ms));
    S.gatherNodes = [{
      id: 'qa', x: HOME.x, y: HOME.y, alive: true, hp: 5, maxHp: 5, respawnTime: 30000,
      name: 'QA', resourceType: 'x', nodeType: c.type, gatherLvl: c.lvl,
      skill: c.type === 'tree' ? 'woodcutting' : c.type === 'fishSpot' ? 'fishing' : 'mining',
      _tier: { streakColor: '#b08050', canopyColor: '#3a7' }, _tierIdx: 0,
    }];
    await sleep(700);
    const n = S.gatherNodes[0], sp = n._pixiSprite;
    if (!sp || sp.destroyed) return { err: 'no sprite' };
    const ax = sp.anchor ? sp.anchor.x : 0.5, ay = sp.anchor ? sp.anchor.y : 0.5;
    const box = { l: sp.x - sp.width * ax, t: sp.y - sp.height * ay, w: sp.width, h: sp.height };

    /* the texture's own alpha, sampled on the same grid */
    const img = await new Promise((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = c.art;
    });
    const cv = document.createElement('canvas');
    cv.width = N; cv.height = N;
    const cx2 = cv.getContext('2d', { willReadFrequently: true });
    cx2.drawImage(img, 0, 0, N, N);
    const alpha = cx2.getImageData(0, 0, N, N).data;

    const cells = [];
    for (let gy = 0; gy < N; gy++) {
      for (let gx = 0; gx < N; gx++) {
        const wx = box.l + box.w * (gx + 0.5) / N;
        const wy = box.t + box.h * (gy + 0.5) / N;
        /* push toward the node centre; if we cannot move, this cell is solid */
        const cxw = box.l + box.w / 2, cyw = box.t + box.h / 2;
        let ux = cxw - wx, uy = cyw - wy;
        const m = Math.hypot(ux, uy);
        /* the dead-centre cell has no direction to push in -- nudge it off-axis
           rather than recording a stationary player as solid */
        if (m < 1) { ux = 0.7071; uy = 0.7071; } else { ux /= m; uy /= m; }
        P.x = wx; P.y = wy; P.vx = P.vy = 0;
        await sleep(16);
        const x0 = P.x, y0 = P.y;
        S.stickX = ux; S.stickY = uy;
        await sleep(SETTLE);
        S.stickX = 0; S.stickY = 0;
        const moved = Math.hypot(P.x - x0, P.y - y0);
        cells.push({ blocked: moved < 2.5, art: alpha[(gy * N + gx) * 4 + 3] > 24 });
      }
    }
    S.gatherNodes = [];
    return { box: { l: Math.round(box.l - HOME.x), t: Math.round(box.t - HOME.y), w: Math.round(box.w), h: Math.round(box.h) }, cells };
  }, { c, HOME, N, SETTLE });

  const tier = Math.min(10, Math.max(1, Math.ceil(c.lvl / 10)));
  console.log(`── ${c.type} (lvl ${c.lvl}, tier ${tier})`);
  if (r.err) { console.log('   ' + r.err); anyFail = true; continue; }
  const art = r.cells.filter(x => x.art).length;
  const solid = r.cells.filter(x => x.blocked).length;
  const both = r.cells.filter(x => x.art && x.blocked).length;
  const spill = r.cells.filter(x => !x.art && x.blocked).length;
  const covered = art ? both / art : 0;
  const spillFrac = solid ? spill / solid : 0;
  console.log(`   sprite box ${r.box.w}x${r.box.h} at ${r.box.l},${r.box.t} relative to the node`);
  for (let gy = 0; gy < N; gy++) {
    let row = '';
    for (let gx = 0; gx < N; gx++) {
      const c2 = r.cells[gy * N + gx];
      row += c2.blocked ? (c2.art ? '#' : 'o') : (c2.art ? '.' : ' ');
    }
    console.log('   |' + row + '|');
  }
  console.log(`   artwork solid: ${(covered * 100).toFixed(0)}%   `
    + `invisible wall: ${(spillFrac * 100).toFixed(0)}% of the solid area`);
  let ok, why;
  if (c.type === 'tree') {
    /* Trunk-only is the REQUIREMENT here, so coverage is the wrong measure --
       a correct tree blocks almost none of its art.  What matters is that the
       solid part is confined to the foot and the canopy is walk-under. */
    const rows = r.cells.map((x, i) => (x.blocked ? Math.floor(i / N) : -1)).filter(v => v >= 0);
    const lowest = Math.min(...rows);
    ok = rows.length > 0 && lowest >= N - 4;
    why = rows.length
      ? `solid rows ${lowest}..${Math.max(...rows)} of ${N} (must all be in the bottom 4)`
      : 'nothing solid at all';
  } else {
    ok = covered >= 0.9 && spillFrac <= 0.55;
    why = `art must be >=90% solid, spill <=55%`;
  }
  if (!ok) anyFail = true;
  console.log(`   ${ok ? 'OK' : 'PROBLEM'} — ${why}\n`);
}

/* The ore blocker covers the whole rock, which moved the mining stand-spot.
   Prove the vein is still harvestable from where the player physically ends up
   when they walk into it -- that is the thing the blocker could have broken. */
for (const lvl of [1, 91]) {
  const reach = await page.evaluate(async ({ HOME, lvl }) => {
    const S = window._gameState.current, P = S.player;
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    S.gatherNodes = [{ id: 'qa', x: HOME.x, y: HOME.y, alive: true, hp: 5, maxHp: 5,
      respawnTime: 30000, name: 'QA', resourceType: 'ore', nodeType: 'oreVein',
      gatherLvl: lvl, skill: 'mining', _tier: { streakColor: '#b08050' }, _tierIdx: 0 }];
    await sleep(700);
    P.x = HOME.x; P.y = HOME.y - 400; P.vx = P.vy = 0;      // approach from the north
    await sleep(100);
    S.stickX = 0; S.stickY = 1;
    await sleep(3000);
    S.stickX = 0; S.stickY = 0;
    await sleep(400);
    const near = !!S._proxNode;
    const dy = Math.round(P.y - HOME.y);
    S.gatherNodes = [];
    return { dy, near };
  }, { HOME, lvl });
  const tier = Math.min(10, Math.max(1, Math.ceil(lvl / 10)));
  console.log(`ore tier ${tier}: walked in from the north, stopped ${reach.dy}px from the node — `
    + `in harvest range there: ${reach.near ? 'YES' : 'NO'}`);
  if (!reach.near) anyFail = true;
}
console.log();

console.log('page errors:', errors.length ? JSON.stringify(errors.slice(0, 3)) : 'none');
await browser.close();
process.exit(anyFail ? 1 : 0);
