/* ═══ v2.3.2965: SPRITE SHEETS — as many objects to a picture as fit ═══
 *
 * Owner, 2026-10-01: "I also want to fit as many things as I can on one
 * sprite sheet for objects as long as it stays organized."
 *
 * A picture is as tall as a ground swatch covers, 512 game px, so its
 * pixels come out the ground's size (prompts.js) -- and a set of four
 * barrels fills a tenth of it.  The rest was empty magenta.  So each land's
 * objects are PACKED: as many to a wide picture as fit at their true size,
 * in rows, each kind's ones together, read like a page -- left to right,
 * rows top to bottom.  That order is what keeps a sheet organized: the
 * studio names every object it cuts out by where it stands (app.js,
 * assignSheet), and the owner can put any it gets wrong right with a tap.
 *
 *   - The tallest kinds go first, each beside the kinds in the first row
 *     with room for it (first fit), so a sheet runs from its trees down to
 *     its pebbles and its rows pack tightly.
 *   - One flat background a sheet: the pink and purple things (catalog
 *     `key: 'green'`) get sheets of their own.
 *   - A kind too big for a row of a sheet (two giant jungle trees) keeps its
 *     own picture, as does a kind alone on a sheet: its own prompt says the
 *     same and more.
 *   - Buildings are never packed: each has its own long prompt, and two in
 *     one chat would blend.
 *
 * The sizes here are estimates (catalog `ar`): ChatGPT never draws to the
 * pixel, and the studio sizes every object exactly afterwards.  They only
 * have to say how much fits.
 */
import { HD_STYLE, KEY_MATCH, objectBackground, personScale } from '../style/bible.js';
import { objectCatalog, GROUPS } from './catalog.js';
import { FRAME_GAME_PX, sizeWords } from './prompts.js';

/* a wide picture, in game px: its margin round the edge, and the plain
   background kept between any two objects (about 80 of ChatGPT's px:
   plenty for the studio to tell them apart) */
export const SHEET = { w: FRAME_GAME_PX * 1.5, h: FRAME_GAME_PX, margin: 16, gap: 28 };
/* the most kinds one sheet asks for: past this ChatGPT starts losing count */
export const SHEET_KINDS = 7;

/* one object as drawn, in game px (an estimate) */
export function boxOf(e) {
  const ar = e.ar || 1;
  return e.fit === 'w' ? { w: e.size, h: e.size / ar } : { w: e.size * ar, h: e.size };
}
/* a kind's run: its `count` ones side by side */
export function runOf(e) {
  const b = boxOf(e);
  return { w: e.count * b.w + (e.count - 1) * SHEET.gap, h: b.h };
}

/* Every group's sheets: [{ id, group, key, n, of, rows: [[entry id, ...], ...] }],
   and `own`: the entries that keep a picture of their own. */
export function sheetsFor(cat = objectCatalog()) {
  const W = SHEET.w - 2 * SHEET.margin, H = SHEET.h - 2 * SHEET.margin;
  const byId = Object.create(null);
  for (const e of cat) byId[e.id] = e;
  const sheets = [], own = [];
  for (const g of GROUPS) {
    const mine = [];
    for (const key of ['magenta', 'green']) {
      const list = cat.filter((e) => e.group === g.id && e.kind !== 'building' && (e.key || 'magenta') === key);
      for (const e of list) if (runOf(e).w > W || runOf(e).h > H) own.push(e.id);
      const order = list.filter((e) => runOf(e).w <= W && runOf(e).h <= H)
        .map((e, i) => ({ e, i })).sort((a, b) => runOf(b.e).h - runOf(a.e).h || a.i - b.i).map((x) => x.e);
      /* first fit, tallest first: beside the kinds in the first row of any
         sheet with room, else a new row on the first sheet with room for
         it, else a new sheet */
      const sheetsHere = [];
      const kindsOf = (sh) => sh.rows.reduce((t, x) => t + x.ids.length, 0);
      for (const e of order) {
        const r = runOf(e);
        let placed = false;
        for (const sh of sheetsHere) {
          if (kindsOf(sh) >= SHEET_KINDS) continue;
          const row = sh.rows.find((x) => x.w + SHEET.gap + r.w <= W && r.h <= x.h);
          if (row) { row.ids.push(e.id); row.w += SHEET.gap + r.w; placed = true; break; }
        }
        if (placed) continue;
        let sh = sheetsHere.find((x) => kindsOf(x) < SHEET_KINDS && x.h + SHEET.gap + r.h <= H);
        if (!sh) { sh = { group: g.id, key, rows: [], h: -SHEET.gap }; sheetsHere.push(sh); }
        sh.rows.push({ ids: [e.id], w: r.w, h: r.h });
        sh.h += SHEET.gap + r.h;
      }
      mine.push(...sheetsHere);
    }
    /* a kind alone on a sheet keeps its own picture */
    for (const s of mine.filter((x) => x.rows.length === 1 && x.rows[0].ids.length === 1)) own.push(s.rows[0].ids[0]);
    const kept = mine.filter((x) => !(x.rows.length === 1 && x.rows[0].ids.length === 1));
    kept.forEach((s, i) => sheets.push({ id: `${g.id}-sheet-${i + 1}`, group: g.id, key: s.key, n: i + 1, of: kept.length, rows: s.rows.map((r) => r.ids) }));
  }
  return { sheets, own, byId };
}

const NUM = ['', 'one', 'two', 'three', 'four', 'five', 'six'];
/* a kind, as a sheet's row lists it: how many, what, how they differ, how big */
function runWords(e) {
  const size = sizeWords(e);
  return e.count === 1 ? `${e.what}, ${size}` : `${NUM[e.count]} ${e.what} (${e.ones}), each ${size}`;
}

/* The sheet's prompt.  Its rows are the order the studio reads it back in. */
export function sheetPrompt(sheet, byId) {
  const kinds = sheet.rows.flat().map((id) => byId[id]);
  const n = kinds.reduce((s, e) => s + e.count, 0);
  const props = kinds.some((e) => e.kind === 'prop');
  const signs = kinds.filter((e) => e.sign);
  const rows = sheet.rows.map((ids, i) => `Row ${i + 1}, left to right: ${ids.map((id) => runWords(byId[id])).join('; then ')}.`);
  return [
    `A wide picture (3:2, landscape): a SPRITE SHEET of ${n} objects for BroTown, a top-down 2D action RPG, laid out in ${sheet.rows.length === 1 ? 'one neat row, read left to right' : `${NUM[sheet.rows.length] || sheet.rows.length} neat rows and read like a page: each row left to right, the rows top to bottom`}. Every object stands on its own with plain background all round it: none touches another, and each kind's ones stay together, in the order given.`,
    rows.join('\n'),
    `Every object is drawn whole, at its true size beside the others, and stands on nothing: no ground, grass, path or shadow under or around it, the place where it meets the ground plain to see.${props ? ' Everything is built and used by Bros: well made, a little battered, with a proud repair or a dent here and there.' : ''}`,
    `${signs.length ? `${signs.map((e) => `The ${e.name.toLowerCase()}'s sign reads "${e.sign}" in chunky capital letters.`).join(' ')} No other words, letters or numbers anywhere.` : 'No text, letters or numbers anywhere.'} ${objectBackground(sheet.key)} No border.`,
    `Style: ${HD_STYLE}`,
    `${KEY_MATCH} Scale: ${personScale(SHEET.h)}; each object is the size given in its row.`,
  ].join('\n\n');
}
