/* ═══ THE TOWN MAP NAMES EVERY BUILDING, THE TOWN HALL TOO (v2.3.3814) ═══
 *
 * Lane A's judge pass, 2026-10-29: "the town map (the world map up close)
 * names every building except the Town Hall".
 *
 * A phone in BroTown, the world map opened and zoomed in on the town until its
 * buildings are drawn (WorldMapOverlay AT.town):
 *   1. every building drawn on the screen is named (window.__btWorldMap's
 *      more.named / more.unnamed), the Town Hall among them;
 *   2. the same sideways (a computer's layout);
 *   3. no page errors.
 * Pictures: tools/qa/mp/out/townnames-{upright,wide}.png. */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

async function townMap(P, OUT, name, rec) {
  await H.enterWorld(P);
  let zone = null;
  for (let i = 0; i < 120; i++) {
    zone = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
    if (zone === 'wheel') break;
    await P.page.waitForTimeout(500);
  }
  await P.page.waitForTimeout(2500);
  await P.page.evaluate(() => window.__btWorldMapOpen && window.__btWorldMapOpen(true));
  await P.page.waitForTimeout(800);
  const wm = () => P.page.evaluate(() => (window.__btWorldMap ? JSON.parse(JSON.stringify(window.__btWorldMap)) : null));
  let w = await wm();
  for (let i = 0; i < 14 && !(w && w.more && w.more.buildingsAt > 0); i++) {
    await P.page.evaluate(() => { const b = document.querySelector('[data-world-map-zoom-in]'); if (b) b.click(); });
    await P.page.waitForTimeout(500);
    w = await wm();
  }
  /* one more step in, as a player looking at the town would */
  await P.page.evaluate(() => { const b = document.querySelector('[data-world-map-zoom-in]'); if (b) b.click(); });
  await P.page.waitForTimeout(900);
  w = await wm();
  await P.page.screenshot({ path: join(OUT, `townnames-${name}.png`) });
  const more = (w && w.more) || {};
  const named = more.named || [], unnamed = more.unnamed || [], offEdge = more.offEdge || [];
  rec.ok(`${name}: in ${zone}, zoomed in on the town, every building on the screen is named (${named.length} named, ${unnamed.length} not: ${unnamed.join(', ') || 'none'}; ${offEdge.length} just past the edge), the Town Hall among them`,
    zone === 'wheel' && named.length >= 8 && unnamed.length === 0 && named.includes('townhall'), { zoom: w && w.zoom, named, unnamed, offEdge, at: more.buildingsAt });
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const errors = [];
  const A = await H.newPlayer(browser, { name: 'Mapbro', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, world: 'wheel' });
  A.page.on('pageerror', (e) => errors.push(String(e && e.message || e).slice(0, 200)));
  try { await townMap(A, OUT, 'upright', rec); } finally { await A.ctx.close().catch(() => {}); }
  const C = await H.newPlayer(browser, { name: 'Deskmap', wsPort, webPort, world: 'wheel', wide: true });
  C.page.on('pageerror', (e) => errors.push(String(e && e.message || e).slice(0, 200)));
  try { await townMap(C, OUT, 'wide', rec); } finally { await C.ctx.close().catch(() => {}); }
  rec.ok('no page errors', errors.length === 0, errors);
}
