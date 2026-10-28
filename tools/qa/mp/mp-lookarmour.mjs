/* ═══ THE BODY UNDER ARMOUR FROM THE COLOUR NUMBERS (v2.3.3752) ═══
 *
 * The owner: "The game needs to be extremely memory efficient."  Under a chest
 * plate or greaves the body was a recoloured, masked picture per look, per worn
 * set, per frame (maskedBake.js); it is now the shared colour numbers with a
 * bit a texel saying what the bake kept and a small residue sprite for what it
 * drew itself (rendering/lookArmour.js, docs/specs/look-palette.md "Armour").
 * On by default with the look palette; `?lookpalette=0` the old way.
 *
 * THE ORACLE -- the change must change nothing anyone can see:
 *   1. 4 looks (the ghost audit's green / pink / blue, a pale skin in red with
 *      blue eyes, a dark skin, the art's own look) x the full steel, iron,
 *      copper and black steel sets (+ chest alone, greaves alone and a mixed
 *      pair, BT_LA_EXTRA=0 leaves them out): every stand and jog frame in all
 *      eight facings that is masked under that set (the knight figure's frames
 *      are its own art both ways), drawn the old way (the bake over the look's
 *      own picture) and the new, 1:1 through the sharp read, compared texel
 *      for texel (premultiplied).
 *   2. the masked looks made, their palette rows and mask books, and no row
 *      or book refused (rowsFull, booksFull 0).
 *
 *   node tools/qa/mp/run.mjs lookarmour        (after npm run build)
 *   BT_LA_LOOKS=1 BT_LA_SETS=steel   a sample
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'tools/qa/mp/out');
const PHONE = { width: 390, height: 844 };
const LOOKS = [
  ['green', 'pink', 'blue', 'default'],
  ['alabaster', 'red', 'white', 'blue'],
  ['ebony', 'default', 'white', 'default'],
  ['default', 'default', 'default', 'default'],
];
const FULL = {
  steel: ['steelplate', 'steelgreaves'], iron: ['ironplate', 'irongreaves'],
  copper: ['copperplate', 'coppergreaves'], blacksteel: ['blacksteelplate', 'blacksteelgreaves'],
};
const EXTRA = { chest: ['steelplate', null], greaves: [null, 'coppergreaves'], mixed: ['copperplate', 'irongreaves'] };
/* the line: a texel more than OVER levels of 255 apart is a difference; the
   residue sprite blends with the body at its edge where the old picture
   blended inside one texture (docs/specs/look-palette.md "Where it is not exact") */
const OVER = 2;
const FULL_COPPER = ['copperplate', 'coppergreaves'], MIXED = ['copperplate', 'irongreaves'];

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  const nLooks = +(process.env.BT_LA_LOOKS || LOOKS.length);
  const pickSets = process.env.BT_LA_SETS ? process.env.BT_LA_SETS.split(',') : [...Object.keys(FULL), ...(process.env.BT_LA_EXTRA === '0' ? [] : Object.keys(EXTRA))];
  const sets = pickSets.map((k) => FULL[k] || EXTRA[k]).filter(Boolean);
  const P = await H.newPlayer(browser, { name: 'armourlooks', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', query: 'lookpalette=1' });
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e).slice(0, 300)));
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('the phone is in the Wheel (guard)', !!ok, ok);
    if (!ok) return;
    const st = await P.page.evaluate(() => ({ lp: window.__btLookPalette && window.__btLookPalette(), la: window.__btLookArmour && window.__btLookArmour(), oracle: !!window.__btArmourOracle }));
    rec.ok(`the look palette and its armour are on: ${JSON.stringify({ on: st.lp && st.lp.on, armour: st.la && st.la.on, oracle: st.oracle })}`,
      !!(st.lp && st.lp.on && st.la && st.la.on && st.oracle), st);
    /* the full oracle on the page's CPU canvas: a worker's canvas on this box's
       software chip is ~200x slower (BT_LA_WORKER=1 runs it all there); the
       worker is sampled below */
    if (process.env.BT_LA_WORKER !== '1') await P.page.evaluate(() => { window.__btLookBakeInline = true; });
    const report = [];
    let frames = 0, differ = 0, drawn = 0, worst = 0;
    for (const L of LOOKS.slice(0, nLooks)) {
      const t0 = Date.now();
      const r = await P.page.evaluate(([looks, s]) => window.__btArmourOracle.compare({ looks, sets: s }), [[L], sets]);
      for (const x of r) {
        report.push(x);
        frames += x.frames; differ += x.differ; drawn += x.drawn; worst = Math.max(worst, x.worst);
        console.log(`    ${x.look} in ${x.set}: ${x.frames} frames (${x.residues} with a residue), ${x.drawn} px, ${x.differ} over 1 apart, worst ${x.worst}`
          + `, ms old ${x.tOld} new ${x.tNew}, on the chip old ${x.oldKB} KB / residues ${x.residueKB} KB` + (x.notDecided ? `, ${x.notDecided} not decided` : '') + (x.oldPlain ? `, old plain ${x.oldPlain}` : '')
          + (x.differ ? ` ${JSON.stringify(x.badCells)} ${JSON.stringify(x.bad.slice(0, 2))}` : ''));
      }
      console.log(`    (${L.join('/')}: ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    }
    /* the worker, sampled: a look the oracle has not drawn, in full copper and
       in the mixed pair (every jog facing masked, the chain painted), the first
       three frames of each sheet */
    if (process.env.BT_LA_WORKER !== '1' && process.env.BT_LA_SAMPLE !== '0') {
      await P.page.evaluate(() => { window.__btLookBakeInline = false; });
      const t0 = Date.now();
      const r = await P.page.evaluate(([looks, s]) => window.__btArmourOracle.compare({ looks, sets: s, frames: 3 }), [[['purple', 'navy', 'tan', 'default']], [FULL_COPPER, MIXED]]);
      for (const x of r) {
        report.push({ ...x, worker: true });
        frames += x.frames; differ += x.differ; drawn += x.drawn; worst = Math.max(worst, x.worst);
        console.log(`    worker: ${x.look} in ${x.set}: ${x.frames} frames (${x.residues} with a residue), ${x.differ} over 1 apart, worst ${x.worst}` + (x.differ ? ` ${JSON.stringify(x.badCells)}` : ''));
      }
      console.log(`    (worker sample: ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    }
    /* the owner's side-by-side (tools/qa/mp/out/lookarmour.png; BT_LA_PICTURE=docs
       also writes docs/specs/look-armour/side-by-side.png): each row the old way
       with its armour, the new with its armour, then the body alone under each */
    {
      const G = LOOKS[0];
      const rows = [
        { look: G, set: FULL.copper, pose: 'stand', dir: 'south' },
        { look: G, set: FULL.copper, pose: 'jog', dir: 'northeast', f: 6 },
        { look: LOOKS[1], set: MIXED, pose: 'jog', dir: 'south', f: 4 },
        { look: LOOKS[2], set: EXTRA.chest, pose: 'jog', dir: 'east', f: 10 },
        { look: LOOKS[3], set: EXTRA.greaves, pose: 'stand', dir: 'east', mirror: true },
      ];
      const url = await P.page.evaluate((r) => window.__btArmourOracle.picture({ rows: r, scale: 3 }), rows);
      const png = Buffer.from(String(url).replace(/^data:image\/png;base64,/, ''), 'base64');
      writeFileSync(join(OUT, 'lookarmour.png'), png);
      if (process.env.BT_LA_PICTURE === 'docs') {
        mkdirSync(join(process.cwd(), 'docs/specs/look-armour'), { recursive: true });
        writeFileSync(join(process.cwd(), 'docs/specs/look-armour/side-by-side.png'), png);
      }
      rec.ok(`the side-by-side picture (${png.length} bytes)`, png.length > 1000);
    }
    const la = await P.page.evaluate(() => window.__btLookArmour());
    console.log(`    lookArmour: ${JSON.stringify(la)}`);
    writeFileSync(join(OUT, 'lookarmour.json'), JSON.stringify({ report, la }, null, 1));
    const over = report.reduce((a, x) => a + Object.entries(x.hist).filter(([m]) => +m > OVER).reduce((b, [, n]) => b + n, 0), 0);
    rec.ok(`the oracle: ${frames} armoured frames, ${drawn} px drawn both ways; ${over} px more than ${OVER} levels apart (worst ${worst})`,
      frames > 0 && over === 0 && report.every((x) => !x.notDecided), { frames, drawn, differ, over, worst });
    rec.ok(`no palette row or mask book refused (rows ${la.rows}, books ${la.books}, atlas ${la.atlasMB} MB): rowsFull ${la.rowsFull}, booksFull ${la.booksFull}`,
      la.rowsFull === 0 && la.booksFull === 0, la);
    rec.ok(`no page error (${errs.length})`, errs.length === 0, errs.slice(0, 4));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
