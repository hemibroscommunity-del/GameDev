/* ═══ THE WORLD MAP'S MARKS, PICTURES OF WHAT THEY ARE (v2.3.3780) ═══
 *
 * The owner, 2026-10-28: "Also the legend icons for the map are terrible.
 * Those all need different colors and shapes that actually more closely align
 * with what it's describing / To be clear I'm referring to this screenshot
 * where monster is red dot, fish is white dot, etc".
 *
 * The world map's marks are glyphs now (src/ui/mapGlyphs.js): a house, a
 * tent, two peaks, an arch, a flag, a horned head, a fish, a tree, a rock
 * with a fleck of metal, a person.  On a real page in the world -- an
 * upright phone (390 x 844), the same phone sideways (844 x 390) and a
 * computer (1280 x 800, the wide layout) -- at Frost Ridge's first snowmen:
 *   1. opened and zoomed out, the key shows the places' glyphs (town, camp,
 *      pass, gate, landmark), each a picture (an svg path), every one a
 *      different shape, and the map draws the town's house and the gates'
 *      arches;
 *   2. zoomed in on you, the key adds the monster, ore, tree and fish
 *      glyphs, and the map draws monsters and resources as their glyphs (the
 *      probe counts each kind drawn), the key inside the screen;
 *   3. no page errors.
 * Pictures for the owner: tools/qa/mp/out/maplegend-<before|after>-<view>-
 * <wide|close>.png.  With BT_MAPLEGEND_SHOTS=before only the pictures are
 * taken (of a build from before this change, QA_DIST).
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const VIEWS = [
  { id: 'upright', viewport: { width: 390, height: 844 }, touch: true },
  { id: 'sideways', viewport: { width: 844, height: 390 }, touch: true },
  { id: 'computer', viewport: { width: 1280, height: 800 }, wide: true },
];
const OUT = join(H.REPO, 'tools/qa/mp/out');
const BEFORE = process.env.BT_MAPLEGEND_SHOTS === 'before';
const TAG = BEFORE ? 'before' : 'after';
const shot = async (P, name) => { try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: join(OUT, `maplegend-${TAG}-${name}.png`) }); } catch (e) { /* a picture only */ } };

const probe = (P) => P.page.evaluate(() => {
  const w = window.__btWorldMap || {};
  const keys = [...document.querySelectorAll('[data-world-map-key]')].map((k) => {
    const p = k.querySelector('svg path');
    return { kind: k.getAttribute('data-world-map-key'), d: p ? p.getAttribute('d') : null };
  });
  const lg = document.querySelector('[data-world-map-legend]');
  const r = lg ? lg.getBoundingClientRect() : null;
  return { open: !!w.open, rel: w.rel, glyphs: w.more ? w.more.glyphs : null, nodes: w.more ? w.more.nodes : 0, monsters: w.more ? w.more.monsters : 0, keys,
    legend: r ? { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) } : null, vw: innerWidth, vh: innerHeight };
});
const click = (P, sel) => P.page.evaluate((s) => { const b = document.querySelector(s); if (b) b.click(); return !!b; }, sel);

export async function run({ browser, wsPort, webPort, rec }) {
  const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
  const at = WHEEL_SPAWNS.frost && WHEEL_SPAWNS.frost.points[0];
  for (const V of VIEWS) {
    const P = await H.newPlayer(browser, { name: 'Map' + V.id.slice(0, 4), wsPort, webPort, world: 'wheel', viewport: V.viewport, touch: !!V.touch, wide: !!V.wide });
    const errors = [];
    P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
    try {
      await H.enterWorld(P);
      await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l,
        { timeout: 150000, label: 'into the world' }).catch(() => null);
      await H.closeNpcDialogue(P).catch(() => {});
      await P.page.addStyleTag({ content: '*:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
      const me = await H.readState(P, (S) => S.myId);
      await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
      /* a crowded stretch: Frost Ridge's first snowmen, among its trees and stones */
      await H.hopTo(P, at[0] + 150, at[1] + 220, { tries: 260 });
      await P.page.waitForTimeout(2500);

      /* ── 1. zoomed out ── */
      await P.page.evaluate(() => window.__btWorldMapOpen && window.__btWorldMapOpen(true));
      await P.page.waitForTimeout(1500);
      for (let i = 0; i < 16; i++) { const w = await probe(P); if (w.rel != null && w.rel <= 1.6) break; await click(P, '[data-world-map-zoom-out]'); await P.page.waitForTimeout(250); }
      await P.page.waitForTimeout(800);
      const w1 = await probe(P);
      await shot(P, `${V.id}-wide`);
      /* ── 2. close in, on you ── */
      await click(P, '[data-world-map-me]');
      await P.page.waitForTimeout(600);
      for (let i = 0; i < 16; i++) { const w = await probe(P); if (w.rel != null && w.rel >= 4.5) break; await click(P, '[data-world-map-zoom-in]'); await P.page.waitForTimeout(250); }
      await P.page.waitForTimeout(1200);
      const w2 = await probe(P);
      await shot(P, `${V.id}-close`);
      if (BEFORE) { rec.ok(`${V.id}: the pictures of the build before (no checks)`, w1.open); continue; }

      const PLACES = ['town', 'camp', 'pass', 'gate', 'landmark'];
      const k1 = Object.fromEntries(w1.keys.map((k) => [k.kind, k.d]));
      rec.ok(`${V.id} 1. zoomed out (${w1.rel && w1.rel.toFixed(1)}): the key's places are glyphs (${PLACES.filter((k) => k1[k]).join(', ')}), each its own shape`,
        w1.open && PLACES.every((k) => !!k1[k]) && new Set(PLACES.map((k) => k1[k])).size === PLACES.length, w1.keys);
      rec.ok(`${V.id} 1. ...and the map draws the town's house and the gates' arches (${JSON.stringify(w1.glyphs)})`,
        !!w1.glyphs && w1.glyphs.town === 1 && w1.glyphs.gate >= 1, w1.glyphs);
      const LIFE = ['monster', 'ore', 'tree', 'fish', 'bro'];
      const k2 = Object.fromEntries(w2.keys.map((k) => [k.kind, k.d]));
      const lifeKeys = LIFE.filter((k) => k2[k]);
      rec.ok(`${V.id} 2. zoomed in (${w2.rel && w2.rel.toFixed(1)}): the key adds ${lifeKeys.join(', ')}, every key a different shape`,
        ['monster', 'ore', 'tree', 'fish'].every((k) => !!k2[k]) && new Set(w2.keys.filter((k) => k.d).map((k) => k.d)).size === w2.keys.filter((k) => k.d).length, w2.keys);
      rec.ok(`${V.id} 2. ...the map draws the monsters and resources as their glyphs (${JSON.stringify(w2.glyphs)}; ${w2.monsters} monsters, ${w2.nodes} resources)`,
        !!w2.glyphs && w2.glyphs.monster === w2.monsters && w2.monsters >= 1 && (w2.glyphs.ore + w2.glyphs.tree + w2.glyphs.fish) === w2.nodes && w2.nodes >= 1, w2);
      rec.ok(`${V.id} 2. ...the key inside the screen (${JSON.stringify(w2.legend)})`, !!w2.legend && w2.legend.l >= 0 && w2.legend.t >= 0 && w2.legend.r <= w2.vw && w2.legend.b <= w2.vh, w2.legend);
      rec.ok(`${V.id} 3. no page errors`, errors.length === 0, errors.slice(0, 3));
    } finally {
      await P.ctx.close().catch(() => {});
    }
  }
}
