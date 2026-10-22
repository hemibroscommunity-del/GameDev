/* The dungeons in the owner's pictures (v2.3.3566, docs/specs/dungeon-art.md):
 * the Goo Grotto's entrance, walls and things inside, and the boss's chest,
 * cut from the owner's ChatGPT pictures by tools/world/add-dungeon-art.mjs
 * into src/data/dungeonArt.js, and stood in its arena by
 * src/data/dungeonArena.js.  Checks:
 *   1. THE CUT: every picture the table names is on disk, a palette PNG of
 *      the size the table says; every frame inside its picture, its foot
 *      inside the frame; the mouth's foot inside it; the chest shut and open.
 *   2. THE ARENA'S NUMBERS are the ones the arena is built with: its size,
 *      the way out and the arrival (src/game/wheelDungeons.js wheelArenaMap,
 *      by data/wheelDungeons.js WHEEL_ARENA), the waves' ground (the worker's
 *      WHEEL_DUNGEON).
 *   3. WHERE EACH THING STANDS: every one named in the art, inside the floor
 *      (clear of the walls as drawn), none that stops you in the fight's
 *      middle, by the arrival or on the way out; the torch posts either side
 *      of the way out; the puddles flat and stopping nobody.
 *   4. THE FOOTPRINTS: the walls' five leave the way out open (a gap as wide
 *      as its two tiles and more) and the floor between them open; a thing's
 *      footprint is its own, a low one ('stone', 'scrap') one a jump clears.
 *   5. THE SOURCES are kept (assets/prop-source/dungeons/), so the tool can
 *      be run again.
 *   6. v2.3.3567, WHERE EACH PICTURE MOVES (rendering/grottoFx.js, the owner's
 *      "a bit more animated for the water effects and such ... a little
 *      Breeze for the ferns"): each picture's slime colours, darkest first;
 *      the mouth's drips inside it, hanging above its floor with room to
 *      fall, its wet spots on its floor and its spill; its four ferns cut out
 *      into its file under the picture, each standing where it was cut from
 *      on its own base; the wall's drips inside the strip with room to fall;
 *      a torch's basket at its top, a puddle's, the heap's and a mushroom's
 *      points inside their frames; and what sways in the arena a fern that
 *      stops nobody.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DUNGEON_ART, BOSS_CHEST_ART, DUNGEON_ART_V } from '../../src/data/dungeonArt.js';
import { DUNGEON_ARENA, arenaThings, arenaBlockers, arenaWallBlockers, ARENA_W, ARENA_H, ARENA_EXIT, ARENA_ARRIVAL, ARENA_WAVES, ARENA_WALLS } from '../../src/data/dungeonArena.js';
import { WHEEL_ARENA, WHEEL_DUNGEON_HOMES } from '../../src/data/wheelDungeons.js';
import { WHEEL_DUNGEON } from '../src/wheeldungeon.js';
import { JUMP_OVER } from '../../src/game/jump.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('ok  ', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

/* a PNG's size and colour type, off its IHDR */
function pngInfo(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), colourType: b[25] };
}
const pub = (url) => path.join(REPO, 'public', url);
const inside = (f, w, h) => f.x >= 0 && f.y >= 0 && f.x + f.w <= w && f.y + f.h <= h;
const footIn = (f) => f.foot[0] >= 0 && f.foot[0] <= f.w && f.foot[1] >= 0 && f.foot[1] <= f.h;

/* ── 1. the cut ── */
check('the art table has a stamp (the ?v= every picture is asked for at)', typeof DUNGEON_ART_V === 'string' && !isNaN(Date.parse(DUNGEON_ART_V)), DUNGEON_ART_V);
for (const [home, A] of Object.entries(DUNGEON_ART)) {
  check(`${home}: a land the worker opens a dungeon in`, WHEEL_DUNGEON_HOMES.includes(home), home);
  const pics = [['mouth', A.mouth], ['wall front', A.walls.front], ['wall top', A.walls.top], ['inside', A.inside]];
  for (const [what, p] of pics) {
    const f = pub(p.url);
    const info = fs.existsSync(f) ? pngInfo(f) : null;
    /* v2.3.3567: the mouth's file is its picture with its ferns under it */
    const [fw, fh] = p.file || [p.w, p.h];
    check(`${home}: its ${what} is on disk, ${fw} x ${fh}, a palette PNG`, !!info && info.w === fw && info.h === fh && info.colourType === 3, { url: p.url, info });
  }
  check(`${home}: the mouth's foot is inside it, below its middle (the cave's floor, not its roof)`,
    A.mouth.foot[0] > 0 && A.mouth.foot[0] < A.mouth.w && A.mouth.foot[1] > A.mouth.h / 2 && A.mouth.foot[1] < A.mouth.h, A.mouth);
  check(`${home}: each wall strip is wider than it is tall (it repeats along its length)`,
    A.walls.front.w > A.walls.front.h && A.walls.top.w > A.walls.top.h, A.walls);
  const ids = A.inside.frames.map((f) => f.id);
  check(`${home}: every thing inside its picture, its foot inside it, no id twice`,
    A.inside.frames.every((f) => inside(f, A.inside.w, A.inside.h) && footIn(f)) && new Set(ids).size === ids.length, A.inside.frames.filter((f) => !inside(f, A.inside.w, A.inside.h) || !footIn(f)));
}
{
  const C = BOSS_CHEST_ART;
  const info = C && fs.existsSync(pub(C.url)) ? pngInfo(pub(C.url)) : null;
  const ids = C ? C.frames.map((f) => f.id).sort().join(',') : '';
  check('the boss\'s chest: on disk, a palette PNG, shut and open, each inside it with its foot',
    !!info && info.w === C.w && info.h === C.h && info.colourType === 3 && ids === 'open-1,shut-1'
      && C.frames.every((f) => inside(f, C.w, C.h) && footIn(f)), { C, info });
  const sh = C && C.frames.find((f) => f.id === 'shut-1'), op = C && C.frames.find((f) => f.id === 'open-1');
  check('...the open one, its lid up, taller than the shut one and about as wide', !!sh && !!op && op.h > sh.h && Math.abs(op.w - sh.w) < sh.w * 0.2, { sh, op });
}

/* ── 2. the arena's numbers ── */
{
  const exitRow = WHEEL_ARENA.H - WHEEL_ARENA.BOTTOM_WALL - 1, mx = Math.floor(WHEEL_ARENA.W / 2), T = 32;
  check('the arena is the one wheelArenaMap builds (36 x 52 of 32)', ARENA_W === WHEEL_ARENA.W * T && ARENA_H === WHEEL_ARENA.H * T, { ARENA_W, ARENA_H, WHEEL_ARENA });
  check('the way out is its two tiles in the last row of floor', ARENA_EXIT.x === mx * T && ARENA_EXIT.y0 === exitRow * T && ARENA_EXIT.y1 === (exitRow + 1) * T, ARENA_EXIT);
  check('you arrive where wheelArenaMap puts you', ARENA_ARRIVAL.x === mx * T && ARENA_ARRIVAL.y === (exitRow - WHEEL_ARENA.SPAWN_UP) * T + T / 2, ARENA_ARRIVAL);
  check('the bottom wall begins where the map\'s does', ARENA_WALLS.BOTTOM === (WHEEL_ARENA.H - WHEEL_ARENA.BOTTOM_WALL) * T, ARENA_WALLS);
  check('the waves stand where the worker puts them (server/src/wheeldungeon.js)',
    ARENA_WAVES.x0 === 3 * T && ARENA_WAVES.x1 === (WHEEL_DUNGEON.WIDTH - 3) * T && ARENA_WAVES.y0 === WHEEL_DUNGEON.TOP_ROW * T && ARENA_WAVES.y1 === (WHEEL_DUNGEON.HEIGHT / 2) * T, ARENA_WAVES);
  check('the wall\'s front stands in the rows nobody\'s middle reaches and the waves begin at (it ends at or under row 6)', ARENA_WALLS.FACE_FOOT <= 6 * T && ARENA_WALLS.FACE_FOOT >= WHEEL_DUNGEON.TOP_ROW * T, ARENA_WALLS);
}

/* ── 3. where each thing stands ── */
const middle = { x0: ARENA_WALLS.SIDE + 200, x1: ARENA_W - ARENA_WALLS.SIDE - 200, y0: ARENA_WALLS.FACE_FOOT + 150, y1: ARENA_WALLS.BOTTOM - 250 };
for (const home of Object.keys(DUNGEON_ARENA)) {
  const A = DUNGEON_ART[home];
  const things = arenaThings(home);
  check(`${home}: a land with art`, !!A, home);
  if (!A) continue;
  const frame = (t) => A.inside.frames.find((f) => f.id === t.art);
  check(`${home}: every thing on the sheet stands in the arena once, and nothing not on it`,
    things.length === A.inside.frames.length && things.every((t) => !!frame(t)) && new Set(things.map((t) => t.art)).size === things.length,
    { placed: things.map((t) => t.art), cut: A.inside.frames.map((f) => f.id) });
  const out = things.filter((t) => {
    const f = frame(t);
    if (!f) return true;
    const half = (f.w / 2) * 0.5;
    return t.x - half < ARENA_WALLS.SIDE - 12 || t.x + half > ARENA_W - ARENA_WALLS.SIDE + 12 || t.y < ARENA_WALLS.FACE_FOOT + 20 || t.y > ARENA_WALLS.BOTTOM;
  });
  check(`${home}: every one inside the floor, clear of the walls as drawn`, out.length === 0, out);
  const blocking = things.filter((t) => t.block);
  const inMiddle = blocking.filter((t) => t.x > middle.x0 && t.x < middle.x1 && t.y > middle.y0 && t.y < middle.y1);
  check(`${home}: nothing that stops you stands in the fight's middle`, inMiddle.length === 0, inMiddle);
  const byArrival = blocking.filter((t) => Math.hypot(t.x - ARENA_ARRIVAL.x, t.y - ARENA_ARRIVAL.y) < 220);
  check(`${home}: nor within 220 px of where you arrive`, byArrival.length === 0, byArrival);
  const onWay = blocking.filter((t) => Math.abs(t.x - ARENA_EXIT.x) < ARENA_WALLS.GAP + 12 + t.block[0] / 2 && t.y > ARENA_ARRIVAL.y);
  check(`${home}: nor on the way out, between you and it`, onWay.length === 0, onWay);
  const torches = things.filter((t) => /^torch-/.test(t.art));
  check(`${home}: the torch posts stand either side of the way out, at its row`,
    torches.length === 2 && torches.some((t) => t.x < ARENA_EXIT.x) && torches.some((t) => t.x > ARENA_EXIT.x)
      && torches.every((t) => Math.abs(t.x - ARENA_EXIT.x) < 120 && t.y >= ARENA_EXIT.y0 && t.y <= ARENA_WALLS.BOTTOM), torches);
  const puddles = things.filter((t) => /^puddle-/.test(t.art));
  check(`${home}: the puddles lie flat and stop nobody`, puddles.length > 0 && puddles.every((t) => t.flat && !t.block), puddles);
  check(`${home}: a thing that stops you says how tall it is drawn (a hit on it is shown on the picture)`,
    blocking.every((t) => t.h > 0 && Math.abs(t.h - frame(t).h * 0.5) <= 1), blocking.map((t) => [t.art, t.h, frame(t) && frame(t).h * 0.5]));
}

/* ── 4. the footprints ── */
{
  const walls = arenaWallBlockers();
  const hit = (b, x, y) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1;
  const exitClear = [-24, 0, 24].every((dx) => !walls.some((b) => hit(b, ARENA_EXIT.x + dx, (ARENA_EXIT.y0 + ARENA_EXIT.y1) / 2 + 40)));
  check('the walls\' footprints leave the way out open, its two tiles and your feet in it', exitClear && ARENA_WALLS.GAP >= 32 + 10, ARENA_WALLS);
  const floorClear = !walls.some((b) => hit(b, ARENA_ARRIVAL.x, ARENA_ARRIVAL.y) || hit(b, ARENA_W / 2, ARENA_WALLS.FACE_FOOT + 40) || hit(b, ARENA_WALLS.SIDE + 10, ARENA_H / 2) || hit(b, ARENA_W - ARENA_WALLS.SIDE - 10, ARENA_H / 2));
  check('...and the floor between them open, to the walls\' feet', floorClear, walls);
  check('...five of them: the front, the two sides, the bottom either side of the way out', walls.length === 5 && walls.every((b) => b.id === 'wall' && b.h > 0), walls);
  for (const home of Object.keys(DUNGEON_ARENA)) {
    const all = arenaBlockers(home), mine = all.slice(walls.length);
    const things = arenaThings(home).filter((t) => t.block);
    check(`${home}: each thing that stops you has its footprint, at its foot, as wide as it says`,
      mine.length === things.length && mine.every((b, i) => Math.abs((b.x0 + b.x1) / 2 - things[i].x) < 0.01 && b.y1 === things[i].y && Math.abs(b.x1 - b.x0 - things[i].block[0]) < 0.01), mine);
    /* by what they ARE (their picture), not their id: an id is the claim */
    const low = things.filter((t) => /^(boulder|heap)-/.test(t.art));
    check(`${home}: the low ones (boulders, the heap) are ones a jump clears and an arrow flies over`, low.length > 0 && low.every((t) => JUMP_OVER.has(t.id) && t.h < 87), low);
    const tall = things.filter((t) => /^(pillar|torch)-/.test(t.art));
    check(`${home}: the tall ones (pillars, torch posts) are not`, tall.length > 0 && tall.every((t) => !JUMP_OVER.has(t.id)), tall);
  }
}

/* ── 5. the sources ── */
for (const home of Object.keys(DUNGEON_ART)) {
  const want = ['entrance', 'walls', 'inside'].map((k) => path.join(REPO, 'assets/prop-source/dungeons', `${home}-${k}.png`));
  check(`${home}: its three pictures are kept to cut again`, want.every((f) => fs.existsSync(f)), want);
}
check('the chest\'s picture is kept to cut again', fs.existsSync(path.join(REPO, 'assets/prop-source/dungeons/chest.png')));

/* ── 6. v2.3.3567: where each picture moves ── */
const lumOf = (c) => 0.299 * ((c >> 16) & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255);
const isBlue = (c) => (c & 255) > ((c >> 16) & 255) + 40 && (c & 255) > ((c >> 8) & 255);
const slimeOk = (sl) => Array.isArray(sl) && sl.length === 4 && sl.every(isBlue) && sl.every((c, i) => i === 0 || lumOf(c) >= lumOf(sl[i - 1]));
const ptIn = (p, w, h) => p[0] >= 0 && p[0] < w && p[1] >= 0 && p[1] < h;
for (const [home, A] of Object.entries(DUNGEON_ART)) {
  const M = A.mouth, fy = M.foot[1];
  check(`${home}: the mouth's, the wall's and the things' slime colours, four blues from darkest to lightest`,
    slimeOk(M.slime) && slimeOk(A.walls.front.slime) && slimeOk(A.inside.slime), { m: M.slime, w: A.walls.front.slime, i: A.inside.slime });
  check(`${home}: the mouth's drips hang inside it, above its floor, each with room to fall to a row no lower than its foot`,
    M.drips.length >= 3 && M.drips.every(([x, y, land]) => ptIn([x, y], M.w, M.h) && y < fy - 20 && land >= y + 8 && land <= fy), M.drips);
  check(`${home}: its wet spots lie on its floor and the slime spilling out (below the foot's row less 40)`,
    M.wet.length >= 6 && M.wet.every((p) => ptIn(p, M.w, M.h) && p[1] >= fy - 40), M.wet);
  const F = M.ferns || [];
  const fernIds = F.map((f) => f.id);
  check(`${home}: its four ferns are cut into its file, under the picture, each its own frame`,
    F.length === 4 && new Set(fernIds).size === 4 && !!M.file && M.file[0] >= M.w && M.file[1] > M.h
      && F.every((f) => f.x >= 0 && f.y >= M.h && f.x + f.w <= M.file[0] && f.y + f.h <= M.file[1]), { F, file: M.file });
  check(`${home}: ...each standing where it was cut from, inside the picture, on its own base (its bottom row's middle)`,
    F.every((f) => f.at[0] >= 0 && f.at[1] >= 0 && f.at[0] + f.w <= M.w && f.at[1] + f.h <= M.h
      && f.base[0] >= f.at[0] && f.base[0] <= f.at[0] + f.w && f.base[1] === f.at[1] + f.h), F);
  const big = F.filter((f) => f.base[1] > fy), high = F.filter((f) => f.base[1] < fy);
  check(`${home}: ...two big ones in front of the mound's corners, two up on its shoulders`,
    big.length === 2 && high.length === 2 && big.some((f) => f.base[0] < M.w / 3) && big.some((f) => f.base[0] > (2 * M.w) / 3), F);
  const W = A.walls.front;
  check(`${home}: the wall's drips run down its front, inside the strip, each with 10 px to fall at least`,
    W.drips.length >= 3 && W.drips.every((p) => ptIn(p, W.w, W.h) && p[1] <= W.h - 10 && p[1] >= W.h * 0.25), W.drips);
  const fr = (re) => A.inside.frames.filter((f) => re.test(f.id));
  const torches = fr(/^torch-/);
  check(`${home}: each torch post's basket is in its top fifth, its flame as wide as a basket can be`,
    torches.length === 2 && torches.every((f) => f.fire && f.fire[1] > 0 && f.fire[1] <= f.h * 0.2 && f.fire[0] > 0 && f.fire[0] < f.w && f.fire[2] >= 8 && f.fire[2] <= f.w), torches);
  const inF = (f, pts) => Array.isArray(pts) && pts.every((p) => ptIn(p, f.w, f.h));
  check(`${home}: each puddle bubbles at 3 spots or more inside its frame`, fr(/^puddle-/).every((f) => f.wet && f.wet.length >= 3 && inF(f, f.wet)), fr(/^puddle-/));
  check(`${home}: the heap's slime and its coins inside its frame`, fr(/^heap-/).every((f) => f.wet && f.wet.length >= 2 && inF(f, f.wet) && f.gold && f.gold.length >= 1 && inF(f, f.gold)), fr(/^heap-/));
  check(`${home}: each mushroom cluster's caps inside its frame`, fr(/^mushroom-/).every((f) => f.caps && f.caps.length >= 2 && inF(f, f.caps)), fr(/^mushroom-/));
  check(`${home}: nothing else says it moves`, A.inside.frames.filter((f) => !/^(torch|puddle|heap|mushroom)-/.test(f.id)).every((f) => !f.fire && !f.wet && !f.caps && !f.gold));
}
for (const home of Object.keys(DUNGEON_ARENA)) {
  const sways = arenaThings(home).filter((t) => t.sway);
  check(`${home}: what sways in the arena is a fern, standing, that stops nobody`,
    sways.length >= 1 && sways.every((t) => /^fern-/.test(t.art) && !t.flat && !t.block), sways);
}

if (failures) { console.log(`\n${failures} FAILED`); process.exit(1); }
console.log('\ndungeon-art: all passed');
