/* ═══ v2.3.2896: TOWN'S ROCK RING IS A WALL ═══
 *
 * Owner: "can you make it so the player can't walk over the giant gray rocks
 * surrounding the town?  Watch the borders for detecting walkability since
 * there have been issues before with that."
 *
 * Since v2.3.1794 town has blocked on PROPS only (the owner rejected the
 * hue-derived mask -- tiledMaps.js WALK_MASK_ZONES has the history), so the
 * plateau had no edge at all: you could walk up the cliff faces, along the
 * tops of the columns and out into the forest.
 *
 * ── WHAT THIS IS ──
 * ONE closed outline of the ground inside the ring, in world px, plus the one
 * rock outcrop that stands inside it (east of the mayor's alcove).  It is the
 * FEET's boundary: the line where the ground you can stand on meets the rock
 * -- the foot of the cliff to the north, east and west, the lip of the column
 * tops to the south -- and the stairs down to the World View stay open.
 *
 * ── WHY IT IS NOT THE MASK THE OWNER REJECTED ──
 * That mask classified every cell by colour at runtime, so every misread
 * pixel became a wall or a hole under your feet.  This outline was traced
 * ONCE, offline (tools/maps/build_town_rim.py, which says exactly what it
 * counts as rock and why), reduced to plain numbers, looked at over the art,
 * and is checked by tools/dev/check-town-rim.mjs for what has to stay true:
 * the spawn, every NPC, every building door, the World View arrival and the
 * exit stairs are all inside it and all reachable on foot from one another.
 * Nothing inside the ring is a wall: the plaza, the grass, the flower beds,
 * the fences and the pine groves are walkable exactly as before.  Only the
 * rocks, and everything past them, are not.
 *
 * ── FEET, NOT THE BODY CENTRE ──
 * A player's position is the body's CENTRE; the boots are playerGroundDy
 * (52 px in town) below it.  The collision grid is read at the centre (four
 * corners of a 20 px box, BroTown's movement step), so townRimGrid bakes the
 * feet offset in: a cell is open when the FEET of a body centred on it stand
 * inside the outline.  Tested at the centre instead, you would stop with your
 * boots 52 px out on the south rim and your head 52 px short of the north
 * wall -- the v2.3.2748 "props stop your waist, not your feet" bug, again.
 *
 * ── STALE MAP, NO WALL ──
 * The outline was traced on town_v17 at 68x72 tiles.  If the art is re-fused
 * (TOWN_MAP_V moves) or the zone is resized, the numbers below describe some
 * other map, and spriteSheets.js leaves the rim OFF rather than walling
 * players into the wrong shape -- a missing wall is the bug we have today; a
 * wall in the wrong place is a trap.  Re-run the builder for the new map.
 */

/* @generated:begin -- tools/maps/build_town_rim.py --write; do not hand-edit */
export const TOWN_RIM_MAP_V = 17;
export const TOWN_RIM_WORLD = { w: 2176, h: 2304 };
export const TOWN_RIM = [
  [1390, 145], [1378, 146], [1350, 177], [1307, 187], [1280, 159], [1271, 126], [1250, 120], [1224, 148],
  [1214, 188], [1192, 197], [1175, 176], [1183, 155], [1178, 133], [1156, 123], [1140, 154], [1116, 162],
  [1108, 188], [1083, 196], [1050, 233], [999, 222], [982, 264], [955, 275], [932, 262], [913, 216],
  [895, 214], [870, 233], [850, 213], [834, 212], [819, 245], [791, 272], [762, 266], [748, 275],
  [719, 333], [697, 397], [702, 423], [694, 455], [720, 489], [723, 524], [756, 558], [755, 595],
  [804, 602], [812, 632], [834, 643], [876, 640], [882, 654], [875, 683], [915, 692], [956, 737],
  [985, 737], [999, 717], [1025, 707], [1042, 713], [1043, 803], [1033, 849], [1015, 881], [1026, 903],
  [1020, 923], [982, 914], [948, 953], [923, 946], [904, 952], [886, 942], [886, 926], [919, 877],
  [906, 841], [872, 837], [858, 804], [826, 803], [812, 778], [783, 776], [759, 752], [746, 719],
  [719, 708], [716, 682], [696, 665], [681, 622], [687, 598], [678, 578], [636, 556], [639, 511],
  [656, 481], [640, 464], [615, 462], [583, 492], [573, 524], [548, 519], [527, 499], [505, 499],
  [494, 510], [496, 528], [480, 547], [476, 572], [426, 573], [416, 613], [399, 635], [400, 661],
  [344, 683], [323, 721], [317, 763], [288, 786], [280, 848], [262, 852], [245, 816], [220, 814],
  [183, 886], [173, 932], [154, 945], [139, 973], [143, 993], [134, 1018], [148, 1030], [172, 1030],
  [192, 1063], [178, 1087], [176, 1116], [110, 1148], [122, 1191], [140, 1206], [120, 1232], [115, 1258],
  [139, 1312], [140, 1336], [172, 1362], [165, 1401], [177, 1410], [204, 1403], [266, 1453], [266, 1468],
  [243, 1493], [259, 1520], [284, 1517], [310, 1527], [319, 1507], [344, 1487], [364, 1504], [388, 1506],
  [406, 1528], [396, 1558], [318, 1568], [304, 1580], [298, 1606], [312, 1628], [312, 1648], [338, 1653],
  [350, 1672], [385, 1691], [386, 1715], [404, 1743], [398, 1758], [361, 1767], [328, 1759], [318, 1781],
  [343, 1786], [360, 1810], [391, 1801], [434, 1820], [447, 1835], [482, 1818], [557, 1874], [587, 1871],
  [612, 1880], [647, 1923], [739, 1912], [759, 1980], [743, 2005], [754, 2023], [778, 2023], [785, 2001],
  [796, 1995], [846, 2007], [858, 1990], [852, 1967], [860, 1958], [907, 1973], [914, 2010], [900, 2050],
  [883, 2063], [889, 2088], [853, 2199], [1089, 2199], [1100, 2069], [1115, 2048], [1162, 2026], [1188, 2035],
  [1219, 2029], [1244, 2014], [1251, 1992], [1291, 1961], [1328, 1960], [1342, 1937], [1376, 1918], [1423, 1923],
  [1441, 1896], [1470, 1880], [1538, 1887], [1568, 1857], [1576, 1825], [1595, 1813], [1605, 1792], [1637, 1777],
  [1667, 1781], [1700, 1758], [1728, 1758], [1747, 1717], [1788, 1701], [1804, 1682], [1806, 1665], [1792, 1647],
  [1803, 1608], [1847, 1584], [1871, 1509], [1915, 1494], [1942, 1465], [1940, 1445], [1960, 1433], [1955, 1419],
  [1941, 1416], [1947, 1392], [2052, 1390], [2060, 1372], [2039, 1355], [2038, 1338], [2082, 1329], [2093, 1315],
  [2093, 1297], [2069, 1255], [2093, 1210], [2054, 1176], [2069, 1139], [2042, 1077], [2021, 1066], [1987, 995],
  [1961, 981], [1935, 951], [1899, 937], [1899, 915], [1878, 895], [1879, 869], [1856, 857], [1836, 797],
  [1805, 779], [1813, 753], [1804, 727], [1766, 716], [1754, 691], [1725, 677], [1732, 653], [1726, 629],
  [1711, 624], [1684, 633], [1662, 597], [1681, 568], [1653, 527], [1652, 493], [1624, 446], [1590, 449],
  [1577, 433], [1549, 427], [1521, 340], [1475, 304], [1454, 302], [1439, 289], [1412, 243],
];
export const TOWN_RIM_HOLES = [
  [
    [1350, 284], [1393, 320], [1402, 411], [1412, 426], [1407, 457], [1436, 479], [1440, 497], [1410, 515],
    [1367, 518], [1354, 500], [1353, 474], [1332, 471], [1309, 501], [1303, 531], [1259, 543], [1251, 553],
    [1252, 596], [1300, 608], [1305, 628], [1289, 636], [1250, 629], [1222, 689], [1181, 705], [1124, 706],
    [1091, 630], [1108, 578], [1162, 538], [1167, 521], [1190, 509], [1195, 489], [1219, 466], [1243, 464],
    [1273, 432], [1306, 423], [1329, 390], [1330, 292],
  ],
];
/* @generated:end */

/** Is (x, y) -- a FEET position, world px -- on the ground inside the ring?
 *  Even-odd over the outline and its holes. */
export function townRimInside(x, y) {
  let inside = false;
  const ring = (pts) => {
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
  };
  ring(TOWN_RIM);
  for (const h of TOWN_RIM_HOLES) ring(h);
  return inside;
}

/** The ring as a collision grid in isSolid()'s convention (bool[gh][gw],
 *  true = open) for a zone mw x mh world px: a cell is open when the FEET of a
 *  body centred on the cell's centre -- `feetDy` below it -- are inside.
 *
 *  A scanline fill, not a point test per cell: one pass over the outline's
 *  edges per ROW finds where that row crosses it, and the cells between
 *  alternate crossings are the inside.  ~150 rows x ~300 edges, where testing
 *  every one of ~20,000 cells would be ~6M edge tests at load on a phone. */
export function townRimGrid(gw, gh, mw, mh, feetDy) {
  const rings = [TOWN_RIM].concat(TOWN_RIM_HOLES);
  const cw = mw / gw, ch = mh / gh;
  const grid = [];
  for (let gy = 0; gy < gh; gy++) {
    const y = (gy + 0.5) * ch + feetDy;
    const xs = [];
    for (const pts of rings) {
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const yi = pts[i][1], yj = pts[j][1];
        if ((yi > y) !== (yj > y)) xs.push(pts[i][0] + (pts[j][0] - pts[i][0]) * (y - yi) / (yj - yi));
      }
    }
    xs.sort((a, b) => a - b);
    const row = new Array(gw).fill(false);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      /* cells whose CENTRE x = (gx + 0.5) * cw lies in [xs[k], xs[k+1]) */
      const a = Math.max(0, Math.ceil(xs[k] / cw - 0.5));
      const b = Math.min(gw - 1, Math.ceil(xs[k + 1] / cw - 0.5) - 1);
      for (let gx = a; gx <= b; gx++) row[gx] = true;
    }
    grid.push(row);
  }
  return grid;
}
