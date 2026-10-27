/* A MONSTER'S ELEMENT, SEEN AS IT WINDS UP -- v2.3.3619
 * (src/data/elemWindup.js, src/game/elemWindup.js, src/rendering/elemWindup.js,
 * src/rendering/elemWindupShapes.js).
 *
 * The owner, 2026-10-26: "It would be cool if you could telegraph the attacks
 * of each monster (briefly) using code to represent their elements. Maybe a
 * brief snow swirl effect before a snowman throws a snowball for instance.
 * This will promote blocking and more skilled play."
 *   1. One look for each element the worker's hits carry (monsterstatus.js
 *      ELEM_HITS), every shape it names drawn, each piece big enough for a
 *      phone, and never more pieces than the pool holds for the monsters drawn.
 *   2. Every shape draws (on a stand-in canvas) without throwing, and draws
 *      something.
 *   3. The pieces: as many as the look says, alpha 0..1, finite, near the
 *      body, the same for the same monster at the same moment, another
 *      monster's swirl not the same, and moving from one moment to the next.
 *   4. Each element's own motion: the snow swirls IN as the blow comes; sparks
 *      rise; the storm's crackle jumps and flickers; a pebble hops.
 *   5. Strength: up within FADE_IN_MS, strongest as the blow comes; a boss's
 *      pieces bigger, within reason.
 *   6. The wiring: the entity renderer stamps the monsters it drew; the
 *      effects renderer draws on the particles layer and clears with the zone;
 *      the picture is made on the loading screen; `?nowindupfx`; the probe;
 *      the worker's monster carries its element; and the pool is never
 *      added to, removed from, hidden or re-blended after it is made
 *      (TRAPS §218). */
import { readFileSync } from 'node:fs';
import { ELEM_WINDUP, WINDUP_SHAPES, WINDUP_FX, windupPieceCount } from '../../src/data/elemWindup.js';
import { windupPieces, windupPieceList, seedOfId, hash01, windupSizeK, windupStrength } from '../../src/game/elemWindup.js';
import { SHAPE_DRAW } from '../../src/rendering/elemWindupShapes.js';
import { ELEM_HITS } from '../src/monsterstatus.js';

let failures = 0;
function check(name, ok, detail) {
  if (ok) console.log('PASS ' + name);
  else { failures++; console.log('FAIL ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); }
}
const R = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const BODY = { R: 32, H: 40, k: 1 };

/* ── 1. the table ── */
{
  const els = Object.keys(ELEM_WINDUP).sort(), hits = Object.keys(ELEM_HITS).sort();
  check(`1: a look for each of the worker's ${hits.length} elements, and no other`, els.join() === hits.join(), { els, hits });
  const named = new Set();
  for (const e of els) for (const [shape] of ELEM_WINDUP[e].pieces) named.add(shape);
  check('1: every shape a look names is a cell of the picture', [...named].every((s) => WINDUP_SHAPES.includes(s)), [...named].filter((s) => !WINDUP_SHAPES.includes(s)));
  check('1: every cell of the picture is drawn by a shape', WINDUP_SHAPES.every((s) => typeof SHAPE_DRAW[s] === 'function')
    && Object.keys(SHAPE_DRAW).length === WINDUP_SHAPES.length, WINDUP_SHAPES.filter((s) => typeof SHAPE_DRAW[s] !== 'function'));
  check('1: every cell is used by some look', WINDUP_SHAPES.every((s) => named.has(s)), WINDUP_SHAPES.filter((s) => !named.has(s)));
  const most = Math.max(...els.map((e) => windupPieceCount(ELEM_WINDUP[e])));
  check(`1: the pool (${WINDUP_FX.POOL}) holds ${WINDUP_FX.MAX_MONSTERS} monsters of the biggest look (${most})`, most * WINDUP_FX.MAX_MONSTERS <= WINDUP_FX.POOL, { most });
  const small = [];
  for (const e of els) for (const [shape, , k] of ELEM_WINDUP[e].pieces) if (ELEM_WINDUP[e].size * (k || 1) < 14) small.push([e, shape, ELEM_WINDUP[e].size * (k || 1)]);
  check('1: every piece at least 14 world px (a phone at 0.6 scale: 8.5 CSS px), the main ones 18+', small.length === 0
    && els.every((e) => ELEM_WINDUP[e].size >= 18), small);
  check('1: the snowman\'s is a swirl of snow (the owner\'s example)', ELEM_WINDUP.frost.kind === 'swirl' && ELEM_WINDUP.frost.pieces[0][0] === 'flake');
  {
    const ps = windupPieceList(ELEM_WINDUP.wind, BODY, 100, 0.5, 7);
    const st = ps.find((p) => p.shape === 'streak'), sa = ps.find((p) => p.shape === 'sand');
    check('1: a piece\'s own size against its look\'s (a grain of sand a third of a streak)', !!st && !!sa && sa.s < st.s * 0.6, { st: st && st.s, sa: sa && sa.s });
  }
  check('1: each look says what it is', els.every((e) => typeof ELEM_WINDUP[e].words === 'string' && ELEM_WINDUP[e].words.length > 4));
}

/* ── 2. every shape draws ── */
{
  const calls = [];
  const grad = { addColorStop() {} };
  const ctx = new Proxy({}, {
    get(t, k) {
      if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => grad;
      if (typeof k === 'string' && /^(fill|stroke|fillRect|arc|lineTo|moveTo|quadraticCurveTo|bezierCurveTo)$/.test(k)) return () => calls.push(k);
      return () => {};
    },
    set() { return true; },
  });
  const bad = [], empty = [];
  for (const s of WINDUP_SHAPES) {
    calls.length = 0;
    try { SHAPE_DRAW[s](ctx, WINDUP_FX.CELL); } catch (e) { bad.push([s, String(e && e.message)]); continue; }
    if (!calls.some((c) => c === 'fill' || c === 'stroke' || c === 'fillRect')) empty.push(s);
  }
  check(`2: all ${WINDUP_SHAPES.length} shapes draw without throwing`, bad.length === 0, bad);
  check('2: ...and each draws something', empty.length === 0, empty);
}

/* ── 3. the pieces ── */
{
  const seed = seedOfId('wm-frost-t1-3');
  const bad = [];
  for (const e of Object.keys(ELEM_WINDUP)) {
    const look = ELEM_WINDUP[e];
    for (const [age, t] of [[0, 0], [35, 0.1], [180, 0.5], [340, 0.97], [900, 0.99]]) {
      const ps = windupPieceList(look, BODY, age, t, seed);
      if (ps.length !== windupPieceCount(look)) { bad.push([e, age, 'count', ps.length]); continue; }
      for (const p of ps) {
        if (![p.dx, p.dy, p.a, p.s, p.r].every(Number.isFinite)) { bad.push([e, age, 'nan', p]); break; }
        if (p.a < 0 || p.a > 1) { bad.push([e, age, 'alpha', p.a]); break; }
        if (Math.abs(p.dx) > 2.6 * BODY.R || p.dy < -(3.5 * BODY.H + 60) || p.dy > BODY.R + 12) { bad.push([e, age, 'far', p]); break; }
        if (!(p.s > 0)) { bad.push([e, age, 'size', p.s]); break; }
      }
    }
  }
  check('3: every element, every moment: as many pieces as its look, alpha 0..1, finite, near the body', bad.length === 0, bad.slice(0, 6));
  const a = JSON.stringify(windupPieceList(ELEM_WINDUP.frost, BODY, 120, 0.3, seed));
  check('3: the same monster at the same moment: the same pieces (every phone sees one swirl)', a === JSON.stringify(windupPieceList(ELEM_WINDUP.frost, BODY, 120, 0.3, seed)));
  check('3: another monster\'s are not the same', a !== JSON.stringify(windupPieceList(ELEM_WINDUP.frost, BODY, 120, 0.3, seedOfId('wm-frost-t1-4'))));
  const still = [];
  for (const e of Object.keys(ELEM_WINDUP)) {
    const p0 = windupPieceList(ELEM_WINDUP[e], BODY, 100, 0.3, seed), p1 = windupPieceList(ELEM_WINDUP[e], BODY, 220, 0.6, seed);
    let moved = 0;
    for (let i = 0; i < p0.length; i++) moved += Math.hypot(p1[i].dx - p0[i].dx, p1[i].dy - p0[i].dy) + Math.abs(p1[i].a - p0[i].a) * 20;
    if (moved / p0.length < 3) still.push([e, Math.round(moved / p0.length * 10) / 10]);
  }
  check('3: every element\'s pieces move from one moment to the next', still.length === 0, still);
  /* the reused buffer: no garbage a frame, and a smaller look after a bigger one reads only its own */
  const buf = [];
  const n1 = windupPieces(ELEM_WINDUP.frost, BODY, 50, 0.2, seed, buf);
  const kept = buf[0];
  const n2 = windupPieces(ELEM_WINDUP.storm, BODY, 50, 0.2, seed, buf);
  check('3: the renderer\'s buffer is used again (the same objects), the count says how many are this look\'s',
    n1 === windupPieceCount(ELEM_WINDUP.frost) && n2 === windupPieceCount(ELEM_WINDUP.storm) && buf[0] === kept && buf.length === n1, { n1, n2, len: buf.length });
  check('3: a number from an id is the same every time, and spreads', seedOfId('a') === seedOfId('a') && seedOfId('a') !== seedOfId('b')
    && hash01(1, 2) === hash01(1, 2) && hash01(1, 2) !== hash01(1, 3) && hash01(5, 9) >= 0 && hash01(5, 9) < 1);
}

/* ── 4. each element's own motion ── */
{
  const seed = seedOfId('wm-test-1');
  const meanR = (ps) => ps.reduce((s, p) => s + Math.hypot(p.dx, (p.dy + BODY.H) / 0.45), 0) / ps.length;
  const early = meanR(windupPieceList(ELEM_WINDUP.frost, BODY, 30, 0.05, seed));
  const late = meanR(windupPieceList(ELEM_WINDUP.frost, BODY, 330, 0.95, seed));
  check(`4: the snow swirls IN as the blow comes (${Math.round(early)} -> ${Math.round(late)} px from its middle)`, late < early * 0.6, { early, late });
  const embers = (age) => windupPieceList(ELEM_WINDUP.flame, BODY, age, 0.5, seed).filter((p) => p.shape === 'ember');
  let rose = 0;
  const e0 = embers(100), e1 = embers(130);
  for (let i = 0; i < e0.length; i++) if (e1[i].dy < e0[i].dy) rose++;
  check(`4: the goblin's sparks rise (${rose} of ${e0.length} higher 30 ms later)`, rose >= e0.length - 2, { rose });
  const lit = (age) => windupPieceList(ELEM_WINDUP.storm, BODY, age, 0.5, seed).map((p) => (p.a > 0 ? 1 : 0) + ',' + Math.round(p.dx)).join('|');
  check('4: the storm crackles: its sparks jump to new places every 70 ms', lit(10) !== lit(80) && lit(10) === lit(60));
  const hops = windupPieceList(ELEM_WINDUP.stone, BODY, 105, 0.5, seed).filter((p) => p.shape === 'pebble');
  check('4: the rock monster\'s pebbles hop off the ground', hops.some((p) => p.dy < -10), hops.map((p) => Math.round(p.dy)));
  const g = windupPieceList(ELEM_WINDUP.wind, BODY, 200, 0.5, seed).filter((p) => p.shape === 'streak');
  check('4: the mummy\'s gust circles it: streaks on both sides of it', g.some((p) => p.dx > 10) && g.some((p) => p.dx < -10), g.map((p) => Math.round(p.dx)));
}

/* ── 5. strength and size ── */
{
  check('5: nothing before it starts, up within FADE_IN_MS, strongest as the blow comes',
    windupStrength(0, 0) === 0 && windupStrength(WINDUP_FX.FADE_IN_MS, 0.2) >= 0.8 && windupStrength(400, 1) === 1
      && windupStrength(400, 1) > windupStrength(400, 0.3));
  check('5: an ordinary monster\'s pieces their size; a boss\'s bigger, never past 2.4x', windupSizeK(1) === 1 && windupSizeK(4.6) === 2.4 && windupSizeK(0.2) === 0.7 && windupSizeK(undefined) === 1);
}

/* ── 6. the wiring ── */
{
  const ent = R('src/rendering/systems/entityRenderer.js');
  const wf = ent.slice(ent.indexOf('const _windupFx = () => {'), ent.indexOf("try { _windupFx(); }"));
  check('6: the entity renderer stamps a monster it drew winding up (after the end, before the throb)',
    /if \(now >= until\) \{[\s\S]*?return;\s*\}[\s\S]*?m\._tgSeen = now;[\s\S]*?const from = m\._tgFrom/.test(wf), wf.slice(0, 400));
  const fx = R('src/rendering/systems/effectsRenderer.js');
  check('6: the effects renderer makes it on the projectiles layer (over what stands: a monster south of you is drawn over the particles), draws it each frame and clears it with the zone',
    /this\._elemWindup = new ElemWindupFx\(this\.projectileLayer\)/.test(fx) && /this\._elemWindup\.update\(S, now\)/.test(fx) && /this\._elemWindup\.clear\(\)/.test(fx));
  check('6: the picture is made on the loading screen (preloadWorldAnimations)', /elemWindup: Promise\.resolve\(warmElemWindup\(\)\)/.test(R('src/rendering/preloadAnimations.js')));
  const own = R('src/rendering/elemWindup.js');
  check('6: `?nowindupfx` leaves it out; the probe is there', /has\('nowindupfx'\)/.test(own) && /window\.__btElemWindup = /.test(own));
  check('6: only a monster drawn THIS frame, and only while its wind-up runs', /m\._tgSeen !== now/.test(own) && /until > now/.test(own));
  const after = own.slice(own.indexOf('update(S, now)'));
  check('6: the pool is made with the renderer, after the projectiles layer it goes in is set',
    /this\.projectileLayer = layers\.projectiles;[\s\S]*this\._elemWindup = new ElemWindupFx\(this\.projectileLayer\)/.test(fx) && own.slice(own.indexOf('constructor(layer)'), own.indexOf('  _make() {')).includes('this._make();'));
  check('6: the pool is never added to, removed from, hidden or re-blended after it is made (TRAPS §218)',
    !/addChild|removeChild|\.destroy\(|\.visible\s*=|blendMode|renderable\s*=/.test(after), after.match(/addChild|removeChild|\.destroy\(|\.visible\s*=|blendMode|renderable\s*=/g));
  check('6: every piece is cut from ONE picture (one source)', /new Texture\(\{ source: base\.source, frame:/.test(own) && (own.match(/Texture\.from\(/g) || []).length === 1);
  check('6: the worker\'s monster carries its element to the phone', /element: m\.element/.test(R('server/src/spawnscale.js')));
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
