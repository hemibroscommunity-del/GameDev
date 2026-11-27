/* ═══ v2.3.6784: THE MENU'S PICTURE, AS BIG AS THE BAND LETS IT BE (card UI3-menus, reading 1) ═══
 *
 * src/game/menuTile.js menuTileArt(box, shape): the picture's side from the
 * grid's OWN measured box (its ResizeObserver entry), the tile's padding 2,
 * its edge 1, the word's line 15 and the gap 2; capped at 58 upright and 35
 * sideways (the owner's "approximately 25%" over 46 and 28); before the first
 * entry, yesterday's 46 / 28.  Tested at what it DOES: the four phones, a
 * computer, Bro's six (three by two) and a hub's one row of three, and a box
 * the band could hold less in.
 *
 * THE DODGES, each planted below and seen red:
 *   M1  the window's size read instead of the grid's box;
 *   M2  the word's 15 px forgotten (gives 73 at 390 x 844);
 *   M3  the padding counted on one side only;
 *   M4  no cap (a hub's one row grows the picture past 58);
 *   M5  Math.round or ceil (1 px over its room in a box of a fraction);
 *   M6  sideways left at 28;
 *   M7  a 0 box before the first entry giving 0.
 *
 *   node tools/guards/menu-tile.test.mjs */
import * as REAL from '../../src/game/menuTile.js';

let fails = 0;
const check = (name, ok, detail) => {
  if (ok) console.log('  ok   ' + name);
  else { fails += 1; console.log('  FAIL ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); }
};

/* the rooms: the grid's content box (the notes' table, from the layout functions; the computer's from mp-ui3menus) */
const ROOMS = [
  { tag: '390x844', box: { width: 370, height: 172 }, shape: { cols: 4, rows: 2, short: false }, win: [390, 844] },
  { tag: '375x667', box: { width: 355, height: 168 }, shape: { cols: 4, rows: 2, short: false }, win: [375, 667] },
  { tag: '844x390', box: { width: 824, height: 63 }, shape: { cols: 8, rows: 1, short: true }, win: [844, 390] },
  { tag: '667x375', box: { width: 647, height: 58 }, shape: { cols: 8, rows: 1, short: true }, win: [667, 375] },
  { tag: 'computer', box: { width: 420, height: 172 }, shape: { cols: 4, rows: 2, short: false }, win: [1280, 800] },
  { tag: "Bro's six", box: { width: 370, height: 172 }, shape: { cols: 3, rows: 2, short: false }, win: [390, 844] },
  { tag: 'a hub of three', box: { width: 370, height: 172 }, shape: { cols: 3, rows: 1, short: false }, win: [390, 844] },
  { tag: 'a box of less (150 tall)', box: { width: 370, height: 150 }, shape: { cols: 4, rows: 2, short: false }, win: [390, 844] },
  { tag: 'a box of a fraction (167.4 tall)', box: { width: 355, height: 167.4 }, shape: { cols: 4, rows: 2, short: false }, win: [375, 667] },
];
/* the arithmetic written out apart from the module (the card's): the room inside a tile, floored, capped */
const want = (r) => {
  const { cols, rows, short } = r.shape;
  const tw = (r.box.width - (cols - 1) * 6) / cols - 2 * 2 - 2 * 1;
  const th = (r.box.height - (rows - 1) * 6) / rows - 2 * 2 - 2 * 1 - 15 - 2;
  return Math.min(short ? 35 : 58, Math.floor(Math.min(tw, th)));
};

function rules(M, tagged) {
  const out = [];
  const t = (name, ok, d) => out.push({ name, ok: !!ok, d });
  for (const r of ROOMS) {
    globalThis.innerWidth = r.win[0]; globalThis.innerHeight = r.win[1];
    const a = M.menuTileArt(r.box, r.shape);
    t(`1. ${r.tag}: the picture is the largest that fits, capped (${want(r)})`, a === want(r), { got: a, want: want(r) });
    /* and it never draws past its room: the tile's flex would squash it */
    const { cols, rows } = r.shape;
    const roomH = (r.box.height - (rows - 1) * 6) / rows - 6 - 17;
    t(`2. ${r.tag}: never past its room`, a <= roomH + 1e-9, { got: a, room: roomH });
  }
  t('3. upright 390 x 844 and 375 x 667: 58 (46 x 1.25)', M.menuTileArt(ROOMS[0].box, ROOMS[0].shape) === 58 && M.menuTileArt(ROOMS[1].box, ROOMS[1].shape) === 58);
  t('4. sideways 844 x 390 and 667 x 375: 35 (28 x 1.25)', M.menuTileArt(ROOMS[2].box, ROOMS[2].shape) === 35 && M.menuTileArt(ROOMS[3].box, ROOMS[3].shape) === 35);
  t('5. a hub\'s one row capped at 58', M.menuTileArt(ROOMS[6].box, ROOMS[6].shape) === 58);
  const before = [M.menuTileArt(null, { cols: 4, rows: 2, short: false }), M.menuTileArt({ width: 0, height: 0 }, { cols: 4, rows: 2, short: false }),
    M.menuTileArt(undefined, { cols: 8, rows: 1, short: true }), M.menuTileArt({ width: 0, height: 0 }, { cols: 8, rows: 1, short: true })];
  t('6. before the first entry: yesterday\'s 46 upright and 28 sideways, never 0', before.join() === '46,46,28,28', before);
  return tagged ? out : out;
}

console.log('menu-tile: the rule');
for (const r of rules(REAL)) check(r.name, r.ok, r.ok ? undefined : r.d);

console.log('menu-tile: the dodges, planted (each must turn a rule red)');
const plant = (id, fn) => {
  const res = rules({ ...REAL, menuTileArt: fn });
  check(`plant ${id}: turns the rule red`, res.some((r) => !r.ok));
};
const roomOf = (box, shape, o) => {
  const s = shape || {};
  const w = (box.width - ((s.cols | 0) - 1) * 6) / s.cols - (o.pad1 ? 2 : 4) - 2;
  const h = (box.height - ((s.rows | 0) - 1) * 6) / s.rows - (o.pad1 ? 2 : 4) - 2 - (o.noLabel ? 0 : 15) - 2;
  return Math.min(w, h);
};
plant('M1', (box, shape) => REAL.menuTileArt({ width: globalThis.innerWidth - 20, height: globalThis.innerHeight * 0.2 }, shape));
plant('M2', (box, shape) => (box && box.width ? Math.min(shape.short ? 35 : 58, Math.floor(roomOf(box, shape, { noLabel: true }))) : (shape.short ? 28 : 46)));
plant('M3', (box, shape) => (box && box.width ? Math.min(shape.short ? 35 : 58, Math.floor(roomOf(box, shape, { pad1: true }))) : (shape.short ? 28 : 46)));
plant('M4', (box, shape) => (box && box.width ? Math.floor(roomOf(box, shape, {})) : (shape.short ? 28 : 46)));
plant('M5', (box, shape) => (box && box.width ? Math.min(shape.short ? 35 : 58, Math.round(roomOf(box, shape, {}))) : (shape.short ? 28 : 46)));
plant('M5c', (box, shape) => (box && box.width ? Math.min(shape.short ? 35 : 58, Math.ceil(roomOf(box, shape, {}))) : (shape.short ? 28 : 46)));
plant('M6', (box, shape) => (box && box.width ? Math.min(shape.short ? 28 : 58, Math.floor(roomOf(box, shape, {}))) : (shape.short ? 28 : 46)));
plant('M7', (box, shape) => (box && box.width ? REAL.menuTileArt(box, shape) : 0));

console.log(fails ? `\nmenu-tile: ${fails} FAIL` : '\nmenu-tile: all pass');
process.exit(fails ? 1 : 0);
