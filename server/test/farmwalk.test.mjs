/* The farm you walk -- v2.3.3136 (docs/specs/farm-walk.md).
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
 *   1. the farmer's moves (v2.3.3411, the owner's three sheets cut by
 *      tools/make_farm_anims.py into src/data/farmAnims.js): each step plays
 *      its own -- the hoe, the watering can, the kneel -- every frame of it,
 *      from the rest pose to the rest pose, the work landing on the frames
 *      where it does; every strip on disk at the size the data says (the man,
 *      the man under greaves, his tool, his shirt, plate and greaves), his
 *      boots, his crown and the work inside it; and (v2.3.3411) every frame
 *      of every garment there and on him, the man under greaves the man
 *      trimmed;
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
  FARM_STEPS, FARM_WORK_MS, FARM_STEP_ANIM, FARM_ANIM_TURN, FARM_ANIM_BEATS, farmAnimOf, farmWorkFrame, farmWorkBeats,
  bedNext, farmClock, bedAt, seedToPlant, seedsInHand, cropStageOf, soilOf,
  farmExCode, parseFarmEx, FARM_BEAT_SOUND,
} from '../../src/game/farmWork.js';
import {
  FARM_ZONE, FARM_GROUND, FARM_BEDS, FARM_BED_REACH, FARM_KNEEL_DY, FARM_KNEEL_DX, FARM_CROP_FOOT_DY, FARM_SPOTS, FARM_GATE,
  FARM_ARRIVE, FARM_FROM_WORKSHOP, FARM_THINGS, FARM_EDGE, farmBlockers,
} from '../../src/data/farmLayout.js';
import { FARM_ART } from '../../src/data/farmArt.js';
import { FARM_ANIMS, FARM_ANIM_HEAD } from '../../src/data/farmAnims.js';
import { decodePNG } from '../../tools/world/png.mjs';   /* v2.3.3411: what the farmer's strips hold */
import { splitSkinBySeeds, framePieces } from '../../src/rendering/playerDecal.js';   /* v2.3.3411: where his drawings go */
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

// ── 1. the farmer's moves ──
{
  const anims = Object.keys(FARM_ANIMS);
  check(`every step plays one of the owner's three (${FARM_STEPS.map((st) => st + ':' + farmAnimOf(st)).join(' ')}): the hoe digs, the can waters, the kneel plants, feeds and harvests`,
    FARM_STEPS.every((st) => !!FARM_ANIMS[FARM_STEP_ANIM[st]] && farmAnimOf(st) === FARM_STEP_ANIM[st])
      && FARM_STEP_ANIM.dig === 'hoe' && FARM_STEP_ANIM.water === 'water'
      && ['plant', 'feed', 'harvest'].every((st) => FARM_STEP_ANIM[st] === 'kneel'), FARM_STEP_ANIM);
  for (const st of FARM_STEPS) {
    const T = FARM_WORK_MS[st];
    const a = farmAnimOf(st), A = FARM_ANIMS[a];
    const turn = FARM_ANIM_TURN[a];
    const frames = [];
    for (let t = 0; t < T; t += 5) frames.push(farmWorkFrame(st, t, T));
    const beats = farmWorkBeats(st, T);
    const seen = new Set(frames);
    let turns = 0;
    for (let i = 1; i < frames.length; i++) if (frames[i] < frames[i - 1]) turns++;
    check(`${st}: ${T} ms of the ${a}, every one of its ${A.n} frames in order, from the first to the last (${turns + 1} turn${turns ? 's' : ''})`,
      T >= 900 && T <= 2000 && turn.length === A.n && seen.size === A.n && frames[0] === 0 && frames[frames.length - 1] === A.n - 1
        && farmWorkFrame(st, T, T) === A.n - 1 && frames.every((f, i) => i === 0 || f === frames[i - 1] || f === frames[i - 1] + 1 || (f === 0 && frames[i - 1] === A.n - 1)),
      frames.join(''));
    const beatFrames = FARM_ANIM_BEATS[a];
    check(`...the work lands ${beats.length} time${beats.length === 1 ? '' : 's'}, each as a frame where it does begins (${beatFrames.join(', ')})`,
      beats.length >= 1 && beats.every((b) => b > 0 && b < T && beatFrames.includes(farmWorkFrame(st, b, T)) && farmWorkFrame(st, b - 1, T) !== farmWorkFrame(st, b, T)),
      { beats, at: beats.map((b) => farmWorkFrame(st, b, T)) });
  }
  check('the hoe swings twice in a dig, the strike each time', farmWorkBeats('dig', FARM_WORK_MS.dig).length === 2);
  check('nonsense times are the first frame, and no time is no beats',
    farmWorkFrame('dig', -5, 1000) === 0 && farmWorkFrame('plant', NaN, 1000) === 0 && farmWorkFrame('water', 10, 0) === 0
      && farmWorkBeats('dig', 0).length === 0 && farmAnimOf('nonsense') === 'kneel');

  /* the strips on disk, at the size the data says */
  const fileOf = (url) => path.join(REPO, 'public', url.split('?')[0]);
  const sizeOf = (url) => { const f = fileOf(url); return fs.existsSync(f) ? pngSize(f) : null; };
  /* v2.3.3411: the garments, cut from the owner's sheets drawn again in the
     game's white tee and steel armour */
  const GARMENTS = [['shirt', 'tshirt'], ['chest', 'steelplate'], ['legs', 'steelgreaves']];
  for (const a of anims) {
    const A = FARM_ANIMS[a];
    const body = sizeOf(A.url), under = A.under ? sizeOf(A.under) : null, prop = A.prop ? sizeOf(A.prop) : null;
    const gear = {};
    for (const [slot, item] of GARMENTS) gear[slot] = sizeOf('/sprites/gear/' + slot + '/' + item + '/' + A.pose + '-south.png');
    const want = { w: A.fw * A.n, h: A.fh };
    const same = (z) => !!z && z.w === want.w && z.h === want.h;
    check(`the ${a}: ${A.n} frames of ${A.fw}x${A.fh} -- the man, the man under greaves${A.prop ? ', his tool' : ''}, his shirt, plate and greaves, each ${want.w}x${want.h}`,
      same(body) && same(under) && GARMENTS.every(([slot]) => same(gear[slot])) && (!A.prop || same(prop)) && (a !== 'kneel') === !!A.prop,
      { body, under, prop, gear, want });
    /* v2.3.3411: what each frame holds.  Every garment has something in every
       frame (an empty one would show him bare for a frame) and lies on the man:
       the tee over his body, the armour mostly so -- its shoulder plates stand
       out of his outline (81% over it at the can, measured).  The man under
       greaves is the man with his trousers and boots trimmed, never more. */
    if (same(body) && same(under) && GARMENTS.every(([slot]) => same(gear[slot]))) {
      const img = (url) => decodePNG(fs.readFileSync(fileOf(url)));
      const B = img(A.url), U = img(A.under);
      const G = {};
      for (const [slot, item] of GARMENTS) G[slot] = img('/sprites/gear/' + slot + '/' + item + '/' + A.pose + '-south.png');
      const op = (im, i) => im.data[i * 4 + 3] > 127;
      const FLOOR = { shirt: [1000, 0.98], chest: [2000, 0.75], legs: [1000, 0.85] };
      const bad = [];
      for (let f = 0; f < A.n; f++) {
        let nB = 0, nU = 0, out = 0;
        const n = { shirt: 0, chest: 0, legs: 0 }, on = { shirt: 0, chest: 0, legs: 0 };
        for (let y = 0; y < A.fh; y++) {
          for (let x = f * A.fw; x < (f + 1) * A.fw; x++) {
            const i = y * want.w + x, b = op(B, i), u = op(U, i);
            if (b) nB++;
            if (u) { nU++; if (!b) out++; }
            for (const [slot] of GARMENTS) if (op(G[slot], i)) { n[slot]++; if (b) on[slot]++; }
          }
        }
        if (out || nU >= nB) bad.push({ f, under: nU, body: nB, out });
        for (const [slot] of GARMENTS) {
          const share = n[slot] ? on[slot] / n[slot] : 0;
          if (n[slot] < FLOOR[slot][0] || share < FLOOR[slot][1]) bad.push({ f, slot, px: n[slot], on: +share.toFixed(3) });
        }
      }
      check(`...every frame of his shirt, plate and greaves there and on him; the man under greaves the man trimmed`, !bad.length, bad);
      /* v2.3.3411: and under greaves nothing of his trousers or boots peeks
         out: no piece of 12+ olive or boot-grey px of that body below the
         greaves' top that the greaves leave bare (the classes are the tool's
         body_classes: the game repaints exactly these your trousers' and
         boots' colours).  The kneel's boot and the can's toe once did, 45 and
         34 px, two specks in the owner's colours. */
      const peek = [];
      for (let f = 0; f < A.n; f++) {
        let top = A.fh;
        const at = (x, y) => y * want.w + f * A.fw + x;
        for (let y = 0; y < A.fh && top === A.fh; y++) for (let x = 0; x < A.fw; x++) if (op(G.legs, at(x, y))) { top = y; break; }
        const hit = new Uint8Array(A.fw * A.fh);
        for (let y = top; y < A.fh; y++) {
          for (let x = 0; x < A.fw; x++) {
            const i = at(x, y);
            if (!op(U, i) || op(G.legs, i)) continue;
            const r = U.data[i * 4], g = U.data[i * 4 + 1], b = U.data[i * 4 + 2];
            const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
            const pants = Math.abs(r - g) < 30 && g - b > 25 && r > 60 && r < 170 && g > 55;
            const grey = mx - mn < 28 && mx >= 45 && mx < 150;
            if (pants || grey) hit[y * A.fw + x] = 1;
          }
        }
        /* its pieces, 8-connected */
        const seen = new Uint8Array(hit.length);
        for (let k = 0; k < hit.length; k++) {
          if (!hit[k] || seen[k]) continue;
          let n = 0;
          const q = [k];
          seen[k] = 1;
          while (q.length) {
            const c = q.pop();
            n++;
            const cx = c % A.fw, cy = (c - cx) / A.fw;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
              const nx = cx + dx, ny = cy + dy;
              if (nx < 0 || ny < 0 || nx >= A.fw || ny >= A.fh) continue;
              const j = ny * A.fw + nx;
              if (hit[j] && !seen[j]) { seen[j] = 1; q.push(j); }
            }
          }
          if (n >= 12) peek.push({ f, px: n, at: [k % A.fw, Math.floor(k / A.fw)] });
        }
      }
      check(`...under greaves, nothing of his trousers or boots peeks out round them`, !peek.length, peek);
      /* v2.3.3411: where your drawings go on him (A.ink, the tool's
         ink_regions): the game's own split (playerDecal splitSkinBySeeds) run
         on each strip's skin as the bake finds it -- playerSkins _isSkin in
         4-connected pieces of FARM_MIN_BLOB (12, effectsRenderer) or more --
         the arm cuts taken out, and the arms measured piece by piece as the
         stamp measures them (framePieces).  On the man and on the man under
         greaves: nothing of his face under his chin (the head's flood once
         ran down his jaw into the chest drawing's box), a chest in the
         chest's box, and two arms, one each side of his head's middle (the
         hoe's strike once joined them at the hands into one piece, and one
         arm drawing was fitted over both). */
      const I = A.ink;
      const table = !!I && I.fw === A.fw && I.fh === A.fh && [I.seeds, I.face, I.torso, I.armCuts].every((l) => Array.isArray(l) && l.length === A.n);
      check(`...where your drawings go on him: a table for his ${A.fw}x${A.fh} frames, every frame in it`, table, I && { fw: I.fw, fh: I.fh });
      if (table) {
        for (const [who, IM] of [['the man', B], ['under greaves', U]]) {
          const W = IM.width, Hh = IM.height, px = W * Hh;
          const sk = new Uint8Array(px);
          for (let i = 0; i < px; i++) {
            const r = IM.data[i * 4], g = IM.data[i * 4 + 1], b = IM.data[i * 4 + 2], al = IM.data[i * 4 + 3];
            if (al > 40 && r > g && g >= b && r - b > 30 && r > 90 && r - g > 25) sk[i] = 1;
          }
          const skin = new Uint8Array(px);
          for (let f = 0; f < A.n; f++) {
            for (const c of framePieces(sk, W, Hh, f * A.fw, (f + 1) * A.fw, null, 0)) {
              if (c.length >= 12) for (const i of c) skin[i] = 1;
            }
          }
          const reg = splitSkinBySeeds(skin, W, Hh, A.fw, I.seeds);
          for (let f = 0; f < A.n; f++) {
            for (const [x, y0, y1] of I.armCuts[f]) for (let y = y0; y <= y1; y++) reg.arms[y * W + f * A.fw + x] = 0;
          }
          const bad = [];
          for (let f = 0; f < A.n; f++) {
            const fb = I.face[f], tb = I.torso[f], mid = A.crowns[f][0];
            let under = 0, beside = 0, face = 0, chest = 0;
            for (let y = 0; y < Hh; y++) {
              for (let x = 0; x < A.fw; x++) {
                const i = y * W + f * A.fw + x;
                if (reg.face[i]) {
                  if (y > fb[3]) under++;
                  else if (x < fb[0] || x > fb[1] || y < fb[2]) beside++;
                  else face++;
                }
                if (reg.torso[i] && x >= tb[0] && x <= tb[1] && y >= tb[2] && y <= tb[3]) chest++;
              }
            }
            const arms = framePieces(reg.arms, W, Hh, f * A.fw, (f + 1) * A.fw, null, I.pieceKeep);
            const sides = arms.map((c) => {
              let sx = 0;
              for (const i of c) sx += (i % W) - f * A.fw;
              return sx / c.length < mid ? 'L' : 'R';
            }).sort().join('');
            if (under || beside > 8 || face < 1500 || chest < 300 || sides !== 'LR') bad.push({ f, under, beside, face, chest, arms: arms.map((c) => c.length), sides });
          }
          check(`...${who}, as the game splits him: his face in its box and none of it under his chin, his chest in its box, two arms, one each side`, !bad.length, bad);
        }
      }
    }
    const inF = (p) => p[0] >= 0 && p[0] <= A.fw && p[1] >= 0 && p[1] <= A.fh;
    check(`...his boots (${A.foot.join(', ')}) and the work (${A.work.join(', ')}) inside the frame, near its bottom; every crown inside it and over the boots`,
      inF(A.foot) && inF(A.work) && A.foot[1] > A.fh * 0.85 && A.work[1] > A.fh * 0.6
        && A.crowns.length === A.n && A.crowns.every((c) => inF(c) && c[1] < A.foot[1] - FARM_ANIM_HEAD && Math.abs(c[0] - A.foot[0]) < FARM_ANIM_HEAD), A.crowns);
  }
}

// ── 1c. v2.3.3411: what the others see -- the step as your move's `ex` ──
{
  const codes = FARM_STEPS.map((st, i) => farmExCode(st, i * 37));
  check(`every step names itself on the wire (${codes.join(' ')}) and reads back as the same step and move`,
    codes.every((c, i) => /^farm:[a-z]+:\d{1,2}$/.test(c) && c.length <= 16 && JSON.stringify(parseFarmEx(c))
      === JSON.stringify({ step: FARM_STEPS[i], anim: FARM_STEP_ANIM[FARM_STEPS[i]], ms: FARM_WORK_MS[FARM_STEPS[i]] })), codes);
  check('two steps alike in a row read differently (the count), and the count stays two digits',
    farmExCode('dig', 1) !== farmExCode('dig', 2) && farmExCode('dig', 199) === 'farm:dig:99' && farmExCode('dig', -3) === 'farm:dig:3');
  /* it is relayed, so anything a player could send */
  const odd = ['farm:__proto__:1', 'farm:constructor:1', 'farm:toString:1', 'farm:hasOwnProperty', 'farm::1', 'farm:', 'farm:Dig:1',
    'farm:dig:12345678901', 'chop', 'cook', '', null, undefined, 7, {}, ['farm:dig:1'], { toString: () => 'farm:dig:1' }];
  check('nothing else reads as a step: no prototype name, no other code, nothing longer, nothing but a string',
    odd.every((c) => parseFarmEx(c) === null), odd.filter((c) => parseFarmEx(c) !== null));
  check('...and nothing that is no step is named', farmExCode('__proto__', 1) === null && farmExCode('constructor', 1) === null && farmExCode('', 1) === null);
  check('each step has its sound where its work lands (the table yours and the others\' play from)',
    FARM_STEPS.every((st) => FARM_BEAT_SOUND[st] && typeof FARM_BEAT_SOUND[st].key === 'string' && FARM_BEAT_SOUND[st].vol > 0 && FARM_BEAT_SOUND[st].vol <= 1));
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

// ── 3b. v2.3.3411: the step on the wire, through a real room ──
/* the code is a move's `ex`, which the worker keeps and hands every player
   in the zone in its tick, verbatim (protocol-v2's harvest-activity checks);
   here a farm code goes the same way, and gives no harvest's damage shield */
{
  const room = new GameRoom(makeState(), mockEnv);
  const join = async (pid) => {
    const w = fakeWs();
    room.sessions.set(w, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
    await room.webSocketMessage(w, JSON.stringify({ type: 'join', id: pid, name: pid, phrase: 'p-' + pid, protocolVersion: 2, data: { x: 700, y: 700, z: 'farm_home' } }));
    await settle();
    return w;
  };
  const wa = await join('bp_farmex_a');
  const wb = await join('bp_farmex_b');
  const pa = room.playerState.bp_farmex_a;
  const code = farmExCode('dig', 5);
  await room.webSocketMessage(wa, JSON.stringify({ type: 'move', x: pa.x, y: pa.y, z: 'farm_home', ex: code }));
  check(`a move carrying ${code} is kept as the mover's harvest code`, pa.ex === code, pa.ex);
  check('...and buys no harvest\'s damage shield (no node, not a cook or a fire)', room._extractionShielded('bp_farmex_a', Date.now()) === false);
  wb.sent.length = 0;
  room.startTickLoop();
  await new Promise((r) => setTimeout(r, 90));
  clearInterval(room.tickInterval); room.tickInterval = null;
  const seen = wb.sent.filter((m) => m.type === 'tick' && m.players && m.players.bp_farmex_a).map((m) => m.players.bp_farmex_a.ex);
  check(`the other player on the farm gets it in the tick, as sent (${JSON.stringify(seen[0])})`, seen.length > 0 && seen[0] === code, seen.slice(0, 3));
  await room.webSocketMessage(wa, JSON.stringify({ type: 'move', x: pa.x, y: pa.y, z: 'farm_home', ex: null }));
  check('...and the step over, it is cleared', pa.ex === null, pa.ex);
}

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
    /* v2.3.3279: the owner's painted pictures (were SVG) */
    if (!fs.existsSync(path.join(REPO, 'public/ui/controls', 'farm-' + st + '.webp'))) missing.push('farm-' + st + '.webp');
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
