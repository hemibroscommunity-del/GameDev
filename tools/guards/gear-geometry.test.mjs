/* ═══ v2.3.6784: GEAR'S BAG IN WHOLE ROWS (card UI3-menus, readings 5 and 7) ═══
 *
 * The owner, 2026-11-26, 19:35 UTC: "the inventory slots don't fit neatly on
 * the new menu the third row gets cut off."  src/game/gearGeometry.js
 * gearPanelsGeometry(W, H) now gives the bag's whole `rows` and the
 * scroller's height `bagH` from the height too; tested at what it DOES over
 * W 300 to 900 and H 100 to 420 (every upright result):
 *   rows >= 1; bagCell >= 44; bagH <= below; below - bagH < bagCell + G (no
 *   room left for another whole row); rows >= 3 whenever below >= 138; and
 *   the label row 24 (the owner's "shrink their headers").
 * Sideways (one row): the row whole inside the page.
 *
 * THE DODGES, each planted below and seen red:
 *   D1  `ceil` or `round` for the rows (a row past the body);
 *   D2  the gap forgotten in bagH;
 *   D3  HEAD's old 30;
 *   D4  the 44 floor dropped (a 40 px square to squeeze a row in);
 *   D5  the height ignored (the square from the width alone: today's fault).
 *
 *   node tools/guards/gear-geometry.test.mjs */
import * as REAL from '../../src/game/gearGeometry.js';

let fails = 0;
const check = (name, ok, detail) => {
  if (ok) console.log('  ok   ' + name);
  else { fails += 1; console.log('  FAIL ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); }
};

const G = 3, MIN = 44, PAD = 4;
function rules(M) {
  /* one line a rule: red with its first failing case */
  const seen = new Map();
  const t = (name, ok, d) => { const r = seen.get(name); if (!r) seen.set(name, { name, ok: !!ok, d: ok ? undefined : d }); else if (r.ok && !ok) { r.ok = false; r.d = d; } };
  let upright = 0, sideways = 0;
  for (let W = 300; W <= 900; W += 7) {
    for (let H = 100; H <= 420; H += 1) {
      const g = M.gearPanelsGeometry(W, H);
      const below = H - M.GEAR_HEAD - 2 * PAD;
      if (g.short) {
        sideways += 1;
        t('S. sideways: one whole row (rows 1, bagH the square, inside the page)', g.rows >= 1 && g.bagH === g.rows * g.bagCell + (g.rows - 1) * G && g.bagH <= H - 2 * PAD && g.bagCell >= MIN || H - 2 * PAD < MIN, { W, H, g });
        continue;
      }
      upright += 1;
      t('U1. rows >= 1', g.rows >= 1, { W, H, rows: g.rows });
      t('U2. bagCell >= 44', g.bagCell >= MIN, { W, H, cell: g.bagCell });
      t('U3. bagH is the rows with their gaps', g.bagH === g.rows * g.bagCell + (g.rows - 1) * G, { W, H, g });
      t('U4. bagH <= below (no row past the body)', g.bagH <= below, { W, H, bagH: g.bagH, below });
      t('U5. below - bagH < bagCell + G (no room left for another whole row)', below - g.bagH < g.bagCell + G, { W, H, bagH: g.bagH, below, cell: g.bagCell });
      t('U6. rows >= 3 whenever below >= 138', below < 3 * MIN + 2 * G || g.rows >= 3, { W, H, rows: g.rows, below });
      t('U7. the square no wider than its panel lets it be', g.cols * g.bagCell + (g.cols - 1) * G <= g.invW - 2 * PAD || g.bagCell === MIN, { W, H, g });
    }
  }
  t('0. the label row is 24 px (the owner: "shrink their headers")', M.GEAR_HEAD === 24, M.GEAR_HEAD);
  t('0b. both shapes were tried', upright > 1000 && sideways > 100, { upright, sideways });
  /* the four phones' Gear (the room inside the frame, from the layout functions; mp-ui3menus reads the drawn box) */
  const p = M.gearPanelsGeometry(370, 172);
  t('P. 390 x 844: three whole rows', !p.short && p.rows >= 3, p);
  return Array.from(seen.values());
}

console.log('gear-geometry: the rule');
const res = rules(REAL);
for (const r of res) check(r.name, r.ok, r.d);
{
  const g = REAL.gearPanelsGeometry(370, 172);
  console.log(`  (390 x 844 room 370 x 172: ${g.rows} rows of ${g.bagCell} px, the scroller ${g.bagH} of ${g.below})`);
}

console.log('gear-geometry: the dodges, planted (each must turn a rule red)');
const plant = (id, over) => {
  const r = rules({ ...REAL, ...over });
  check(`plant ${id}: turns the rule red`, r.some((x) => !x.ok));
};
const withRows = (f) => (W, H) => { const g = REAL.gearPanelsGeometry(W, H); return g.short ? g : f(g, W, H); };
plant('D1 ceil', { gearPanelsGeometry: withRows((g) => { const rows = Math.ceil((g.below + G) / (g.bagCell + G)); return { ...g, rows, bagH: rows * g.bagCell + (rows - 1) * G }; }) });
plant('D1 round', { gearPanelsGeometry: withRows((g) => { const rows = Math.round((g.below + G) / (g.bagCell + G)); return { ...g, rows, bagH: rows * g.bagCell + (rows - 1) * G }; }) });
plant('D2', { gearPanelsGeometry: withRows((g) => ({ ...g, bagH: g.rows * g.bagCell })) });
plant('D3', { GEAR_HEAD: 30 });
plant('D4', { gearPanelsGeometry: withRows((g) => { const cell = Math.min(g.bagCell, Math.floor((g.below - 3 * G) / 4)); const rows = Math.max(1, Math.floor((g.below + G) / (cell + G))); return { ...g, bagCell: cell, rows, bagH: rows * cell + (rows - 1) * G }; }) });
plant('D5', { gearPanelsGeometry: withRows((g, W, H) => {
  const inner = Math.floor((W - 4) / 2) - 2 * PAD;
  const cell = Math.max(MIN, Math.min(64, Math.floor((inner - (g.cols - 1) * G) / g.cols)));
  const rows = Math.max(1, Math.floor((g.below + G) / (cell + G)));
  return { ...g, bagCell: cell, rows, bagH: rows * cell + (rows - 1) * G };
}) });

console.log(fails ? `\ngear-geometry: ${fails} FAIL` : '\ngear-geometry: all pass');
process.exit(fails ? 1 : 0);
