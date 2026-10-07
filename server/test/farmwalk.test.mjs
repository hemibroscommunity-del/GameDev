/* The farm you walk -- v2.3.3124 (docs/specs/farm-walk.md).
 *
 * The owner, 2026-10-06: "I want your character to be able to walk around on
 * the farm.  I want the planting process to happen by your character taking
 * action on the plot of ground.  You dig, you water, you fertilize, etc. ...
 * Make the timer appear above the crop that was planted and any next steps it
 * needs (next in sequence like 'Needs Watering') etc".  Then: "Cooking
 * animation might be better.  You can use something to occlude the part
 * where the pan or log is."
 *
 * The client's rules for it (src/game/farmWork.js, src/data/farmLayout.js --
 * no imports, so node runs them) against the worker's own:
 *   1. the kneel: the cook strip's frames where the pan is held out, to and
 *      fro, the hands pushing out at its far end; and what stands where the
 *      pan is (src/data/farmCovers.js): a cover for every step, each on disk
 *      at the size it says, right of the hands, round the pan's area, its
 *      mouth in its top half (the pixel-by-pixel check is the tool's own:
 *      tools/world/make_farm_covers.py fails if one pixel of the pan shows);
 *   2. a bed's next step and its words, its timer, its crop's stage, its soil;
 *   3. THE STEP THE GAME OFFERS IS ONE THE WORKER TAKES: a bed walked from
 *      grass to the bag through the real farm handler, each step the one
 *      bedNext names, each answered did.n === 1 -- and nothing offered while a
 *      crop only waits, when the worker would do nothing;
 *   4. the seed a dug bed is planted with, and the bed your boots reach;
 *   5. the farm's layout: its size the zone's, every picture it names on disk
 *      (the owner's farm art, the Wheel's sheets, every crop's every stage),
 *      the ground picture at the art law's 2 picture px a game px, beds clear
 *      of each other and of every footprint, the kneel spot open;
 *   6. WALKED: from where a visit arrives, your boots reach every bed's kneel
 *      spot, your bed for the night, the Dungeon Workshop, the Pet House and
 *      the gate -- the walk test's own boxes (farmBlockers), boots-sized;
 *   7. the zone's tile grid: the gate's exit tiles under the gate and nothing
 *      else (the old farm's path and plot tiles changed your walking speed),
 *      the three places where the layout puts them, and every way onto the
 *      farm arriving out of the exit's reach.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameRoom } from '../src/index.js';
import { FARM } from '../src/farm.js';
import {
  FARM_STEPS, FARM_WORK_MS, FARM_KNEEL_FRAME_MS, farmWorkFrame, farmWorkBeats, bedNext, farmClock, bedAt,
  seedToPlant, seedsInHand, cropStageOf, soilOf,
} from '../../src/game/farmWork.js';
import {
  FARM_ZONE, FARM_GROUND, FARM_BEDS, FARM_BED_REACH, FARM_KNEEL_DY, FARM_KNEEL_DX, FARM_CROP_FOOT_DY, FARM_SPOTS, FARM_GATE,
  FARM_ARRIVE, FARM_FROM_WORKSHOP, FARM_THINGS, FARM_EDGE, farmBlockers,
} from '../../src/data/farmLayout.js';
import { FARM_ART } from '../../src/data/farmArt.js';
import { FARM_COVERS, FARM_STEP_COVER, FARM_KNEEL_ORDER, FARM_PAN_BOX, FARM_FIGURE_X, FARM_COVER_FRAME } from '../../src/data/farmCovers.js';
import { generateZoneMap } from '../../src/data/gameDisplay.js';
import { ZONES } from '../../src/data/zones.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
/* a PNG's size, off its own header (IHDR) */
function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 1, 4) !== 'PNG') return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
const TILE = 32;
const FOOT_DY = 52;   /* a body's middle to its boots, on a zone with no perspective (entityRenderer standFootDy) */

// ── 1. the kneel ──
{
  const order = FARM_KNEEL_ORDER;
  const far = Math.max(...order);
  check(`the farmer plays the cook strip's frames ${order.join(', ')}, to and fro: frames of its 24, each one in the order's middle twice`,
    order.length >= 3 && order.every((f) => Number.isInteger(f) && f >= 0 && f < 24) && order[0] === Math.min(...order)
      && order.indexOf(far) === order.length / 2, order);
  for (const step of FARM_STEPS) {
    const T = FARM_WORK_MS[step];
    const frames = [];
    for (let t = 0; t < T; t += 10) frames.push(farmWorkFrame(t, T));
    const beats = farmWorkBeats(T);
    check(`${step}: ${T} ms of kneeling, ${beats.length} times the hands push out`, T >= 900 && T <= 2000 && beats.length >= 2, { T, beats });
    check('...only the order\'s frames, all of them, a frame every ' + FARM_KNEEL_FRAME_MS + ' ms',
      frames.every((f) => order.includes(f)) && order.every((f) => frames.includes(f))
        && farmWorkFrame(0, T) === order[0] && farmWorkFrame(FARM_KNEEL_FRAME_MS, T) === order[1], frames.join(','));
    check('...each push the moment the hands reach the far end', beats.every((b) => farmWorkFrame(b, T) === far && farmWorkFrame(b - 1, T) !== far && b < T), beats);
  }
  check('nonsense times are the first frame', farmWorkFrame(-5, 1000) === order[0] && farmWorkFrame(NaN, 1000) === order[0] && farmWorkFrame(10, 0) === order[0] && farmWorkBeats(0).length === 0);

  /* what stands where the pan is */
  const F = FARM_COVER_FRAME;
  const [px0, py0, px1, py1] = FARM_PAN_BOX;
  const steps = FARM_STEPS.map((st) => st + ':' + FARM_STEP_COVER[st]);
  check(`every step has a cover (${steps.join(' ')})`, FARM_STEPS.every((st) => !!FARM_COVERS[FARM_STEP_COVER[st]]), FARM_STEP_COVER);
  for (const key of Object.keys(FARM_COVERS)) {
    const c = FARM_COVERS[key];
    const file = c.url ? path.join(REPO, 'public', c.url.split('?')[0]) : path.join(REPO, 'public/world/farm', c.art + '.png');
    const size = fs.existsSync(file) ? pngSize(file) : null;
    const [x0, y0, x1, y1] = c.box;
    check(`the ${key} cover: ${c.url ? c.url.split('?')[0] : 'the farm picture ' + c.art}, ${size && size.w}x${size && size.h} as it says, its box (${c.box.join(',')}) round the pan's area (${FARM_PAN_BOX.join(',')}), right of the hands, standing on the ground and not on the figure's feet, its mouth (${c.mouth.join(',')}) in its top half`,
      !!size && size.w === c.w && size.h === c.h && (c.art ? !!FARM_ART[c.art] : true)
        && x0 <= px0 && y0 <= py0 && x1 >= px1 && y1 >= py1 && x0 >= 118 && y1 <= F.h - 20
        && c.mouth[0] > x0 + (x1 - x0) * 0.3 && c.mouth[0] < x1 && c.mouth[1] > y0 && c.mouth[1] < y0 + (y1 - y0) * 0.5
        && Math.abs((x1 - x0) / (y1 - y0) - c.w / c.h) < 0.03, { key, size, box: c.box });
  }
  check(`the figure stands on its boots' middle (x ${FARM_FIGURE_X} of ${F.w}), left of its cell's middle: the cell is wide for the pan`,
    FARM_FIGURE_X > 20 && FARM_FIGURE_X < F.w / 2);
}

// ── 2. a bed's next step, its words, its timer, its look ──
{
  const t0 = 1_000_000;
  const rough = bedNext({ s: 'rough' }, t0), tilled = bedNext({ s: 'tilled' }, t0);
  const g = { s: 'planted', crop: 'carrot', plantedAt: t0, readyAt: t0 + 480000, water: 0, feed: 0 };
  const dry = bedNext(g, t0 + 60000);
  const wet = bedNext({ ...g, water: 1 }, t0 + 60000);
  const both = bedNext({ ...g, water: 1, feed: 1 }, t0 + 60000);
  const ripe = bedNext({ ...g, water: 1, feed: 1 }, t0 + 480000);
  const ripeDry = bedNext(g, t0 + 999999);
  check('grass: "Needs Digging", the spade', rough.step === 'dig' && rough.words === 'Needs Digging' && rough.left === null, rough);
  check('dug: "Needs Planting"', tilled.step === 'plant' && tilled.words === 'Needs Planting', tilled);
  check('planted: its timer and "Needs Watering" -- the owner\'s own words', dry.step === 'water' && dry.words === 'Needs Watering' && dry.left === 420000, dry);
  check('watered: "Needs Fertilizer"', wet.step === 'feed' && wet.words === 'Needs Fertilizer', wet);
  check('both: the timer alone, nothing to do', both.step === null && both.words === null && both.left === 420000, both);
  check('ripe (the worker\'s clock): "Ready to Harvest!", whatever was skipped', ripe.step === 'harvest' && ripe.words === 'Ready to Harvest!' && ripe.ripe && ripeDry.step === 'harvest', { ripe, ripeDry });
  check('a bed of nothing, or of a shape it does not know, is grass to dig', bedNext(null, t0).step === 'dig' && bedNext({ s: 'weird' }, t0).step === 'dig');
  check('the timer counts in hours, minutes and seconds', farmClock(4 * 60000 + 12000) === '4m 12s' && farmClock(5 * 60000) === '5m' && farmClock(9000) === '9s'
    && farmClock(3600000 + 20 * 60000) === '1h 20m' && farmClock(2 * 3600000) === '2h' && farmClock(-5) === '0s' && farmClock(1) === '1s',
    [farmClock(252000), farmClock(300000), farmClock(9000), farmClock(4800000), farmClock(7200000), farmClock(-5), farmClock(1)]);
  const stage = (f) => cropStageOf(g, t0 + f * 480000);
  check('a crop is sprout, young and nearly grown a third of its time each, then ripe', stage(0) === 'sprout' && stage(0.3) === 'sprout' && stage(0.34) === 'young'
    && stage(0.66) === 'young' && stage(0.67) === 'grown' && stage(0.99) === 'grown' && stage(1) === 'ripe', [0, 0.3, 0.34, 0.66, 0.67, 0.99, 1].map(stage));
  check('its soil: the plot\'s stakes on grass, then dug -- darker watered, worked fertilized, or both',
    soilOf({ s: 'rough' }) === 'plot' && soilOf({ s: 'tilled' }) === 'bed-dug' && soilOf(g) === 'bed-dug' && soilOf({ ...g, water: 1 }) === 'bed-wet'
      && soilOf({ ...g, feed: 1 }) === 'bed-fed' && soilOf({ ...g, water: 1, feed: 1 }) === 'bed-wetfed' && soilOf(null) === 'plot');
}

// ── 3. the step offered is the step the worker takes ──
function makeState() {
  const store = new Map();
  return {
    _store: store,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, JSON.parse(JSON.stringify(v))); },
      list: async (opts) => { const out = new Map(); for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v); return out; },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
const realNow = Date.now;
let skew = 0;
Date.now = () => realNow() + skew;
const settle = () => new Promise((r) => setTimeout(r, 10));
{
  const room = new GameRoom(makeState(), mockEnv);
  const ws = fakeWs();
  const PID = 'bp_farmwalk_a';
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: PID, name: 'T', phrase: 'p-' + PID, data: { x: 0, y: 0, z: 'farm_home' } }));
  await settle();
  const farm = async (type, payload) => {
    ws.sent.length = 0;
    room._farmRate = new Map();
    await room.webSocketMessage(ws, JSON.stringify({ type, payload }));
    await settle();
    const all = ws.sent.filter((m) => m.type === 'farm_state');
    return all.length ? all[all.length - 1].payload : null;
  };
  let v = await farm('farm_open', {});
  const ps = room.playerState[PID];
  ps.coins = 100;
  await farm('farm_buy', { item: 'seed_carrot', count: 2 });
  await farm('farm_buy', { item: 'compost', count: 1 });
  v = await farm('farm_open', {});
  const walked = [];
  let bad = null;
  for (let guard = 0; guard < 8; guard++) {
    const n = bedNext(v.plots[0], v.now);
    if (!n.step) break;
    const a = await farm('farm_act', n.step === 'plant' ? { op: 'plant', beds: [0], crop: 'carrot' } : { op: n.step, beds: [0] });
    walked.push(n.step);
    if (!a || !a.did || a.did.n !== 1) { bad = { step: n.step, a }; break; }
    v = a;
  }
  check(`a bed walked from grass by the steps the game offers -- ${walked.join(', ')} -- each one taken by the worker`,
    !bad && walked.join(',') === 'dig,plant,water,feed' && v.plots[0].s === 'planted' && v.plots[0].water === 1 && v.plots[0].feed === 1, { walked, bad, plot: v.plots[0] });
  const waiting = bedNext(v.plots[0], v.now);
  const tries = [];
  for (const op of ['dig', 'water', 'feed', 'harvest']) {
    const a = await farm('farm_act', { op, beds: [0] });
    tries.push(op + ':' + (a && a.did ? a.did.n : '?'));
  }
  check(`...and while it only grows the game offers nothing (${waiting.step}), as the worker would do nothing with any step (${tries.join(' ')})`,
    waiting.step === null && waiting.left > 0 && tries.every((t) => t.endsWith(':0')), { waiting, tries });
  skew += 10 * 60000;
  v = await farm('farm_open', {});
  const ripeN = bedNext(v.plots[0], v.now);
  const h = await farm('farm_act', { op: ripeN.step, beds: [0] });
  check(`ripe by the worker's clock, the game offers "${ripeN.step}" and the worker pays it (${h && h.did && h.did.items && h.did.items.crop_carrot} carrots)`,
    ripeN.step === 'harvest' && !!h && h.did.n === 1 && h.did.items.crop_carrot === 3 && h.plots[0].s === 'rough' && bedNext(h.plots[0], h.now).step === 'dig', h && h.did);
  /* a crop left dry and ripe: harvest, not water (the worker would not water a ripe crop) */
  await farm('farm_act', { op: 'dig', beds: [1] });
  await farm('farm_act', { op: 'plant', beds: [1], crop: 'carrot' });
  skew += 10 * 60000;
  v = await farm('farm_open', {});
  const dryRipe = bedNext(v.plots[1], v.now);
  const w = await farm('farm_act', { op: 'water', beds: [1] });
  check('a crop left dry until ripe is offered for harvest, never water -- which the worker refuses on a ripe crop', dryRipe.step === 'harvest' && !!w && w.did.n === 0, { dryRipe, w: w && w.did });
}
Date.now = realNow;

// ── 4. the seed planted, the bed in reach ──
{
  const order = ['carrot', 'wheat', 'firebloom', 'potato'];
  const bag = { carrot: 2, wheat: 1, firebloom: 0, potato: 4 };
  const have = (id) => bag[id] || 0;
  const open = (id) => id !== 'potato';   /* Farming 1: no potatoes yet */
  check('the seed you chose, while you hold it', seedToPlant(order, 'wheat', 'carrot', have, open) === 'wheat');
  check('...else the last you planted', seedToPlant(order, 'firebloom', 'carrot', have, open) === 'carrot');
  check('...else the first you hold in the crop order, never one your level cannot plant', seedToPlant(order, null, 'potato', have, open) === 'carrot');
  check('...and none when you hold none you can plant', seedToPlant(order, 'potato', 'potato', (id) => (id === 'potato' ? 3 : 0), open) === null);
  check('the picker shows the seeds you could plant now, in the crop order', JSON.stringify(seedsInHand(order, have, open)) === '["carrot","wheat"]');
  const b = { x: 100, y: 100, w: 98, h: 72 };
  const beds = [b, { x: 300, y: 100, w: 98, h: 72 }];
  check('your boots inside a bed, or within its reach, are at it; further away, at none',
    bedAt(beds, 149, 136, 46) === 0 && bedAt(beds, 149, 60, 46) === 0 && bedAt(beds, 149, 50, 46) === -1 && bedAt(beds, 349, 175, 46) === 1 && bedAt(beds, NaN, 1, 46) === -1);
  check('...between two in reach, the nearer', bedAt([{ x: 0, y: 0, w: 98, h: 72 }, { x: 120, y: 0, w: 98, h: 72 }], 110, 36, 46) === 1
    && bedAt([{ x: 0, y: 0, w: 98, h: 72 }, { x: 120, y: 0, w: 98, h: 72 }], 106, 36, 46) === 0);
}

// ── 5. the layout: size, pictures, beds ──
const blockers = farmBlockers();
const inBox = (x, y, half) => blockers.find((b) => x + half > b.x0 && x - half < b.x1 && y + half > b.y0 && y - half < b.y1) || null;
{
  check(`the farm is ${FARM_ZONE.tiles.join(' x ')} tiles (${FARM_ZONE.w} x ${FARM_ZONE.h}), the zone's own size`,
    ZONES.farm_home.w === FARM_ZONE.tiles[0] && ZONES.farm_home.h === FARM_ZONE.tiles[1] && FARM_ZONE.w === FARM_ZONE.tiles[0] * TILE && FARM_ZONE.h === FARM_ZONE.tiles[1] * TILE,
    { zone: [ZONES.farm_home.w, ZONES.farm_home.h], FARM_ZONE });
  /* the ground: a lossless WebP whose size is read off its own header */
  const buf = fs.readFileSync(path.join(REPO, 'public', FARM_GROUND.picture));
  let gw = 0, gh = 0;
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP' && buf.toString('ascii', 12, 16) === 'VP8L') {
    const b0 = buf[21], b1 = buf[22], b2 = buf[23], b3 = buf[24];
    gw = 1 + (((b1 & 0x3f) << 8) | b0);
    gh = 1 + (((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
  }
  check(`the ground picture (${FARM_GROUND.picture}) is ${gw} x ${gh}: 2 picture px a game px, the art law's`, gw === FARM_ZONE.w * 2 && gh === FARM_ZONE.h * 2, { gw, gh });
  const tiled = fs.readFileSync(path.join(REPO, 'src/rendering/tiledMaps.js'), 'utf8');
  check('...and it is the map tiledMaps.js draws for farm_home', tiled.includes(`farm_home: '${FARM_GROUND.picture}'`));
  /* every picture named */
  const missing = [];
  const sheets = new Map();
  for (const t of FARM_THINGS) {
    if (t.art.startsWith('farm:')) {
      const n = t.art.slice(5);
      if (!FARM_ART[n] || !fs.existsSync(path.join(REPO, 'public/world/farm', n + '.png'))) missing.push(t.art);
    } else if (t.art.startsWith('obj:')) {
      const [sheet, frame] = t.art.slice(4).split('/');
      if (!sheets.has(sheet)) {
        const f = path.join(REPO, 'public/world/objects', sheet + '.json');
        sheets.set(sheet, fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
      }
      const j = sheets.get(sheet);
      if (!j || !j.frames || !j.frames[frame]) missing.push(t.art);
    } else missing.push(t.art);
  }
  check(`every one of the farm's ${FARM_THINGS.length} things names a picture on disk (the owner's farm art, the Wheel's sheets)`, missing.length === 0, missing);
  const crops = Object.keys(FARM.CROPS);
  const noStage = [];
  for (const c of crops) for (const st of ['sprout', 'young', 'grown', 'ripe']) if (!FARM_ART[c + '-' + st]) noStage.push(c + '-' + st);
  for (const s of ['plot', 'bed-dug', 'bed-wet', 'bed-fed', 'bed-wetfed']) if (!FARM_ART[s]) noStage.push(s);
  check(`every crop the worker grows (${crops.length}) has the owner's four stages, and every soil its picture`, noStage.length === 0, noStage);
  for (const st of FARM_STEPS) {
    if (!fs.existsSync(path.join(REPO, 'public/ui/controls', 'farm-' + st + '.svg'))) missing.push('farm-' + st + '.svg');
  }
  check('each step has its picture for the stick and the beds', missing.length === 0, missing);
  /* beds */
  const overlaps = [];
  FARM_BEDS.forEach((b, i) => {
    FARM_BEDS.forEach((c, j) => { if (j > i && b.x < c.x + c.w && c.x < b.x + b.w && b.y < c.y + c.h && c.y < b.y + b.h) overlaps.push(i + '/' + j); });
    blockers.forEach((k) => { if (b.x < k.x1 && k.x0 < b.x + b.w && b.y < k.y1 && k.y0 < b.y + b.h) overlaps.push(i + ':' + k.id); });
  });
  check(`the ${FARM_BEDS.length} beds -- the worker's free deed (${FARM.FREE_BEDS}) -- lie clear of each other and of every footprint`,
    FARM_BEDS.length === FARM.FREE_BEDS && overlaps.length === 0, overlaps);
  const kneels = FARM_BEDS.map((b, i) => ({ i, x: b.x + b.w / 2 + FARM_KNEEL_DX, y: b.y + FARM_KNEEL_DY, in: inBox(b.x + b.w / 2 + FARM_KNEEL_DX, b.y + FARM_KNEEL_DY, 10) }));
  check('each bed\'s kneel spot (your boots just inside its back edge, left of its middle) is open ground, inside the bed', kneels.every((k, i) => !k.in && k.x > FARM_BEDS[i].x && k.x < FARM_BEDS[i].x + FARM_BEDS[i].w), kneels.filter((k) => k.in));
  check('what grows stands inside its bed', FARM_BEDS.every((b) => FARM_CROP_FOOT_DY > 0 && FARM_CROP_FOOT_DY < b.h));
}

// ── 6. walked: the arrival reaches every bed, the three places and the gate ──
{
  /* boots on an 8 px grid; a step is open when a 20 x 20 box round the boots
     (BroTown propFeetBlocked's) touches no box, and the body stays inside
     the zone's clamp (BroTown: x, y within the zone, y <= h - 80) */
  const G = 8, W = FARM_ZONE.w, H = FARM_ZONE.h;
  const cols = Math.ceil(W / G), rows = Math.ceil(H / G);
  const open = (cx, cy) => {
    const x = cx * G + G / 2, y = cy * G + G / 2;
    if (x < 10 || x > W - 10 || y - FOOT_DY < 60 || y - FOOT_DY > H - 80) return false;
    return !inBox(x, y, 10);
  };
  const seen = new Uint8Array(cols * rows);
  const sx = Math.floor(FARM_ARRIVE.x / G), sy = Math.floor((FARM_ARRIVE.y + FOOT_DY) / G);
  const q = [[sx, sy]];
  if (open(sx, sy)) seen[sy * cols + sx] = 1;
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || seen[ny * cols + nx] || !open(nx, ny)) continue;
      seen[ny * cols + nx] = 1;
      q.push([nx, ny]);
    }
  }
  const reach = (x, y) => seen[Math.floor(y / G) * cols + Math.floor(x / G)] === 1;
  const anyIn = (x0, y0, x1, y1) => {
    for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y += G) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x += G) if (reach(x, y)) return true;
    return false;
  };
  check('a visit arrives on open ground', open(sx, sy), { sx, sy });
  const bedsReached = FARM_BEDS.map((b, i) => (reach(b.x + b.w / 2 + FARM_KNEEL_DX, b.y + FARM_KNEEL_DY) || anyIn(b.x - FARM_BED_REACH, b.y - FARM_BED_REACH, b.x + b.w + FARM_BED_REACH, b.y - 1) ? i : -1));
  check(`from there your boots reach every bed (${bedsReached.filter((i) => i >= 0).length} of ${FARM_BEDS.length})`, bedsReached.every((i) => i >= 0), bedsReached);
  /* the three places: BroTown's own proximity boxes, on your body's middle */
  const map = generateZoneMap('farm_home');
  const Z = ZONES.farm_home;
  const placeBox = (r, padX, padUp, padDown) => [r.x - padX, r.y - padUp + FOOT_DY, r.x + r.w + padX, r.y + r.h + padDown + FOOT_DY];
  const places = {
    sleep: placeBox(Z._house, TILE, TILE, TILE),
    workshop: placeBox(Z._workshop, 2 * TILE, TILE, 2 * TILE),
    petHouse: placeBox(Z._petHouse, 2 * TILE, TILE, 2 * TILE),
  };
  const placesReached = Object.keys(places).filter((k) => anyIn(...places[k]));
  check(`...your bed for the night, the Dungeon Workshop and the Pet House (${placesReached.join(', ')})`, placesReached.length === 3, places);
  const near = (k) => { const [x0, y0, x1, y1] = places[k]; const s = FARM_SPOTS[k]; return s.x >= x0 && s.x <= x1 && s.y + 30 >= y0 && s.y - 10 <= y1; };
  check('...each where the layout stands it (the haystack, the notice board, the barn\'s door)', near('sleep') && near('workshop') && near('petHouse'), { places, FARM_SPOTS });
  /* the gate: the exit tiles, as zoneTransitions reads them (within 2 tiles,
     Manhattan, of your body's tile) */
  const exits = [];
  map.forEach((row, ty) => row.forEach((v, tx) => { if (v === 9) exits.push([tx, ty]); }));
  let gate = false;
  for (let y = 0; y < H && !gate; y += G) for (let x = 0; x < W && !gate; x += G) {
    if (!reach(x, y)) continue;
    const bx = Math.floor(x / TILE), by = Math.floor((y - FOOT_DY) / TILE);
    if (exits.some(([ex, ey]) => Math.abs(ex - bx) + Math.abs(ey - by) <= 2)) gate = true;
  }
  check(`...and the gate out (${exits.length} exit tiles)`, gate, exits);
  check('the workshop\'s way back in arrives on open ground, joined to the rest', reach(FARM_FROM_WORKSHOP.x, FARM_FROM_WORKSHOP.y + FOOT_DY), FARM_FROM_WORKSHOP);

  // ── 7. the tile grid ──
  const other = [];
  map.forEach((row, ty) => row.forEach((v, tx) => { if (v !== 0 && v !== 9) other.push([tx, ty, v]); }));
  check(`the grid is ${map[0].length} x ${map.length}, open ground but for the exit -- no path or plot tiles changing your walking speed`,
    map.length === FARM_ZONE.tiles[1] && map[0].length === FARM_ZONE.tiles[0] && other.length === 0, other.slice(0, 5));
  check('the exit tiles are the bottom row under the gate', exits.length >= 2 && exits.every(([tx, ty]) => ty === map.length - 1
    && tx * TILE >= FARM_GATE.x - FARM_GATE.halfW - TILE && (tx + 1) * TILE <= FARM_GATE.x + FARM_GATE.halfW + TILE), exits);
  const far = (p) => { const bx = Math.floor(p.x / TILE), by = Math.floor(p.y / TILE); return exits.every(([ex, ey]) => Math.abs(ex - bx) + Math.abs(ey - by) > 2); };
  check('a visit, and the way back from a dungeon, arrive out of the exit\'s reach (or you would leave as you came)', far(FARM_ARRIVE) && far(FARM_FROM_WORKSHOP));
  check('the walk test\'s edge leaves the gate open and nothing else', blockers.filter((b) => b.id === 'edge').length === 5
    && !inBox(FARM_GATE.x, FARM_ZONE.h - FARM_EDGE.bottom + 4, 4));
}

// ── 8. every way onto the farm lands where the layout says, and waits for it ──
{
  const src = (f) => fs.readFileSync(path.join(REPO, f), 'utf8');
  const sites = ['src/ui/panels/buildings/FeedSeedPanel.jsx', 'src/ui/panels/buildings/FarmPanel.jsx', 'src/ui/BroTown.jsx',
    'src/networking/gameEvents.js', 'src/game/dungeonWaves.js', 'src/game/zoneTransitions.js'];
  const old = sites.filter((f) => /\(_?fz\.h - 4\) \* TILE|fz\.h \* TILE \/ 2/.test(src(f)));
  const holds = sites.filter((f) => /holdFarmUntilReady\(/.test(src(f)));
  check('no way onto the farm puts you where the old cave farm did', old.length === 0, old);
  check(`...each holds you under the farm's loading screen until it is all there (${holds.length} of ${sites.length})`, holds.length === sites.length, sites.filter((f) => !holds.includes(f)));
}

if (failures) { console.log(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nall farm-walk checks passed');
