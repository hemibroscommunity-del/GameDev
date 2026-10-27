/* ═══ WHAT THE HEAP GAINS ON EACH TRIP (v2.3.3650) ═══
 *
 * mp-membudget's heap line read 30.3 -> 31.7 -> 33.4 MB at the Flame Fields'
 * fight on three trips running (2026-10-27, #1130's run), 30.3 -> 31.0 -> 32.6
 * home again: a climb of ~1.5 MB a trip that had not settled by the third.
 * This repeats that trip -- BroTown, the Flame Fields' inner end, a fight,
 * home -- TRIPS times, reading the JS heap after forced collections each
 * time, and takes a full heap snapshot home again after trip SNAP_A and trip
 * SNAP_B.  The two are compared object type by object type (the snapshot's
 * node type and name: a constructor, a closure, an array, a string), and the
 * ones that gained the most are printed: what is made on a trip and never let
 * go.  mp-soak's PROBE (every array and map on the game state, the Pixi
 * pools, the scene graph) is read each trip too.
 *
 *   node tools/qa/mp/run.mjs heapdiff
 *   BT_HD_TRIPS=6  BT_HD_A=2  BT_HD_B=5
 *   BT_HD_IDLE=120  each "trip" is that many seconds standing in BroTown
 *                   instead: what grows with TIME alone, not with play
 *
 * Writes tools/qa/mp/out/heapdiff.json and heapdiff.md; the snapshots are
 * written to the scratch dir only (they are tens of MB).
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync, createWriteStream, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MEM_INIT } from './memprobe.mjs';
/* v2.3.3650: the Web Audio nodes the game makes per sound, counted from their
   making until the browser COLLECTS them (a FinalizationRegistry) -- the soak
   counted made minus disconnected, and a finished sound that is never
   disconnected is collected all the same, so that count only ever climbed */
const AUDIO_INIT = `(() => {
  const A = window.__audioLive = { made: 0, live: 0 };
  const gone = new FinalizationRegistry(() => { A.live--; });
  if (!window.AudioContext) return;
  for (const name of ['createBufferSource', 'createGain', 'createBiquadFilter', 'createStereoPanner', 'createPanner', 'createOscillator']) {
    const orig = window.AudioContext.prototype[name];
    if (typeof orig !== 'function') continue;
    window.AudioContext.prototype[name] = function (...a) {
      const n = orig.apply(this, a);
      A.made++; A.live++;
      try { gone.register(n, 0); } catch (e) { /* counting only */ }
      return n;
    };
  }
})();`;
import { PROBE } from './mp-soak.mjs';

const PHONE = { width: 390, height: 844 };
const TRIPS = +(process.env.BT_HD_TRIPS || 6);
const SNAP_A = +(process.env.BT_HD_A || 2);
const SNAP_B = +(process.env.BT_HD_B || 5);
const FIGHT_MS = 10000;
const IDLE_S = +(process.env.BT_HD_IDLE || 0);
const HOME_MS = 14000;

const near = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  if (!S || !S.player) return null;
  let m = null, d = Infinity;
  for (const x of S.monsters || []) {
    if (!x || x.alive === false || x.dead) continue;
    const dd = Math.hypot(x.x - S.player.x, x.y - S.player.y);
    if (dd < d) { d = dd; m = { x: x.x, y: x.y, d: dd }; }
  }
  return { px: S.player.x, py: S.player.y, m };
});
const tapSel = (P, sel, id, fx = 0.5, fy = 0.5) => P.page.evaluate(({ sel, id, fx, fy }) => {
  const el = document.querySelector(sel);
  if (!el) return false;
  const b = el.getBoundingClientRect(), x = b.left + b.width * fx, y = b.top + b.height * fy;
  const mk = (t) => new TouchEvent(t, { bubbles: true, cancelable: true,
    touches: t === 'touchend' ? [] : [new Touch({ identifier: id, target: el, clientX: x, clientY: y })],
    changedTouches: [new Touch({ identifier: id, target: el, clientX: x, clientY: y })] });
  el.dispatchEvent(mk('touchstart'));
  el.dispatchEvent(mk('touchend'));
  return true;
}, { sel, id, fx, fy });
async function stepToward(P, dx, dy, ms) {
  const keys = [];
  if (dy < -12) keys.push('w'); else if (dy > 12) keys.push('s');
  if (dx < -12) keys.push('a'); else if (dx > 12) keys.push('d');
  for (const k of keys) await P.page.keyboard.down(k);
  await P.page.waitForTimeout(ms);
  for (const k of keys) await P.page.keyboard.up(k);
}
async function fight(P, ms) {
  const t0 = Date.now();
  let swings = 0;
  while (Date.now() - t0 < ms) {
    const s = await near(P).catch(() => null);
    if (!s || !s.m || s.m.d > 900) { await P.page.waitForTimeout(400); continue; }
    if (s.m.d > 70) await stepToward(P, s.m.x - s.px, s.m.y - s.py, Math.min(450, 60 + s.m.d * 1.2));
    else {
      if (await tapSel(P, '[data-joyzone="R"]', 52, 0.5, 0.4)) swings++;
      await P.page.waitForTimeout(220);
    }
  }
  return swings;
}

/* a heap snapshot of the page, streamed to a file */
async function snapshot(cdp, file) {
  await cdp.send('HeapProfiler.collectGarbage');
  const out = createWriteStream(file);
  const onChunk = (e) => out.write(e.chunk);
  cdp.on('HeapProfiler.addHeapSnapshotChunk', onChunk);
  await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false, captureNumericValue: false });
  cdp.off('HeapProfiler.addHeapSnapshotChunk', onChunk);
  await new Promise((r) => out.end(r));
}
/* a snapshot, read: its nodes by type and name ({ key: [count, selfBytes] }),
   and what is needed to find who holds a node */
function load(file) {
  const j = JSON.parse(readFileSync(file, 'utf8'));
  const meta = j.snapshot.meta, F = meta.node_fields, N = F.length;
  const types = meta.node_types[0];
  const iT = F.indexOf('type'), iN = F.indexOf('name'), iS = F.indexOf('self_size'), iI = F.indexOf('id'), iE = F.indexOf('edge_count');
  const out = new Map();
  const nodes = j.nodes, strings = j.strings;
  const keyOf = (i) => {
    const type = types[nodes[i + iT]];
    let name = strings[nodes[i + iN]] || '';
    if (type === 'string' || type === 'concatenated string' || type === 'sliced string') name = '(string)';
    else if (type === 'number' || type === 'hidden' || type === 'code') name = '(' + type + ')';
    else if (name.length > 80) name = name.slice(0, 80);
    return type + ':' + name;
  };
  for (let i = 0; i < nodes.length; i += N) {
    const k = keyOf(i);
    const v = out.get(k) || [0, 0];
    v[0]++; v[1] += nodes[i + iS];
    out.set(k, v);
  }
  return { j, N, iI, iE, keyOf, tally: out };
}
/* the ids in a snapshot */
function idsOf(S) {
  const ids = new Set();
  const nodes = S.j.nodes;
  for (let i = 0; i < nodes.length; i += S.N) ids.add(nodes[i + S.iI]);
  return ids;
}
/* for the nodes of B whose key is one of `keys` and whose id is not in A:
   who holds them (the holder's key and the edge's name), most common first */
function holders(B, oldIds, keys) {
  const want = new Set(keys);
  const nodes = B.j.nodes, edges = B.j.edges, strings = B.j.strings;
  const EF = B.j.snapshot.meta.edge_fields, EN = EF.length;
  const etypes = B.j.snapshot.meta.edge_types[0];
  const eT = EF.indexOf('type'), eNm = EF.indexOf('name_or_index'), eTo = EF.indexOf('to_node');
  const target = new Map();   /* node index -> key */
  for (let i = 0; i < nodes.length; i += B.N) {
    const k = B.keyOf(i);
    if (want.has(k) && !oldIds.has(nodes[i + B.iI])) target.set(i, k);
  }
  const res = Object.create(null);
  let e = 0;
  for (let i = 0; i < nodes.length; i += B.N) {
    const ec = nodes[i + B.iE];
    for (let x = 0; x < ec; x++, e += EN) {
      const to = edges[e + eTo];
      const k = target.get(to);
      if (!k) continue;
      const et = etypes[edges[e + eT]];
      if (et === 'weak') continue;
      const nm = (et === 'element' || et === 'hidden') ? '[' + et + ']' : String(strings[edges[e + eNm]] || edges[e + eNm]);
      const hk = B.keyOf(i) + ' .' + nm.slice(0, 40);
      const r = res[k] || (res[k] = Object.create(null));
      r[hk] = (r[hk] || 0) + 1;
    }
  }
  const out = {};
  for (const k of Object.keys(res)) {
    out[k] = Object.entries(res[k]).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }
  return { held: out, newCount: target.size };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  const SCR = process.env.BT_HD_DIR || '/tmp';
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'heapdiff', wsPort, webPort, viewport: PHONE, touch: true, dpr: 1, world: 'wheel', init: MEM_INIT + '\n' + AUDIO_INIT });
  let stopAlive = false;
  const res = { trips: [] };
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the world (guard)', !!ok, ok);
    if (!ok) return;
    const myId = await H.readState(P, (S) => S.myId);
    /* past the Mayor's gate, kept open: the worker's player_state replaces the
       page's quest list whenever one lands, so the worker hands the quests in
       (no rewards), and the page's flag is put back if anything takes it
       (mp-membudget, v2.3.3644) */
    await H.devOp(wsPort, 'quests', myId).catch(() => null);
    await P.page.evaluate(() => {
      const keep = () => {
        const S = window._gameState && window._gameState.current, R = S && S.rpg;
        if (!R) return;
        if (!R._quests || typeof R._quests !== 'object') R._quests = {};
        if (!R._quests.tut_1) R._quests.tut_1 = true;
      };
      keep();
      window.__qaGateOpen = setInterval(keep, 100);
    });
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 }).catch(() => null);
    (async () => {
      while (!stopAlive) {
        await P.page.keyboard.press('Control').catch(() => {});
        for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
      }
    })();
    await P.page.waitForTimeout(8000);
    const cdp = await P.ctx.newCDPSession(P.page);
    await cdp.send('HeapProfiler.enable');
    const heap = async () => {
      await cdp.send('HeapProfiler.collectGarbage');
      await P.page.waitForTimeout(300);
      await cdp.send('HeapProfiler.collectGarbage');
      const h = await cdp.send('Runtime.getHeapUsage');
      return +((h.usedSize || 0) / 1048576).toFixed(2);
    };
    const probe = () => P.page.evaluate((src) => new Function('return (' + src + ')')()(), PROBE.toString());
    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const at = WHEEL_SPAWNS.ember.points[0];
    const home = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    res.arrival = { heap: await heap(), probe: await probe() };
    console.log(`    arrival: heap ${res.arrival.heap} MB`);
    const snaps = {};
    for (let k = 1; k <= TRIPS; k++) {
      let swings = 0, hFight = null;
      if (IDLE_S > 0) {
        /* standing still in BroTown: only time passes */
        await P.page.waitForTimeout(IDLE_S * 1000);
      } else {
        await H.hopTo(P, at[0], at[1] + 40, { tries: 220, step: 140, gap: 200 });
        swings = await fight(P, FIGHT_MS);
        hFight = await heap();
        await H.hopTo(P, home.x, home.y, { tries: 220, step: 140, gap: 200 });
        await P.page.waitForTimeout(HOME_MS);
      }
      const hHome = await heap();
      const pr = await probe();
      /* the finalizers run a moment after the collections */
      await P.page.waitForTimeout(300);
      const audio = await P.page.evaluate(() => (window.__audioLive ? { ...window.__audioLive } : null));
      res.trips.push({ k, swings, fight: hFight, home: hHome, probe: pr, audio });
      console.log(`    trip ${k}: ${swings} swings, heap at the fight ${hFight} MB, home ${hHome} MB, audio nodes ${audio ? audio.live + ' live of ' + audio.made + ' made' : '-'}`);
      if (k === SNAP_A || k === SNAP_B) {
        const f = join(SCR, `heapdiff-${k}.heapsnapshot`);
        await snapshot(cdp, f);
        snaps[k] = f;
      }
    }
    /* what grew between the two snapshots */
    if (snaps[SNAP_A] && snaps[SNAP_B]) {
      const SA = load(snaps[SNAP_A]);
      const oldIds = idsOf(SA);
      const a = SA.tally;
      SA.j = null;
      const SB = load(snaps[SNAP_B]);
      const b = SB.tally;
      const keys = new Set([...a.keys(), ...b.keys()]);
      const rows = [];
      for (const k of keys) {
        const x = a.get(k) || [0, 0], y = b.get(k) || [0, 0];
        rows.push({ k, dn: y[0] - x[0], db: y[1] - x[1], n: y[0], b: y[1] });
      }
      rows.sort((p, q) => q.db - p.db);
      res.grewBytes = rows.slice(0, 40);
      res.grewCount = rows.slice().sort((p, q) => q.dn - p.dn).slice(0, 40);
      const tot = rows.reduce((s, r) => s + r.db, 0);
      res.totalGrowthMB = +(tot / 1048576).toFixed(2);
      /* who holds the new objects of the types that grew most (not the
         engine's own: compiled code, numbers, hidden) */
      const pick = rows.filter((r) => r.dn > 20 && !/^(code|number|hidden|string|concatenated string|sliced string|object shape):/.test(r.k))
        .sort((p, q) => q.db - p.db).slice(0, 12).map((r) => r.k);
      res.holders = holders(SB, oldIds, pick);
    }
    /* the game-state counters that grew trip over trip */
    const first = res.trips[1] ? res.trips[1].probe : res.arrival.probe, last = res.trips[res.trips.length - 1].probe;
    res.probeGrew = Object.keys(last).map((k) => [k, (first[k] || 0), last[k]]).filter((x) => x[2] > x[1]).sort((p, q) => (q[2] - q[1]) - (p[2] - p[1])).slice(0, 30);
    const md = ['# Heap, trip by trip', '', '| trip | swings | heap at the fight (MB) | heap home (MB) |', '|---|---|---|---|'];
    for (const t of res.trips) md.push(`| ${t.k} | ${t.swings} | ${t.fight} | ${t.home} |`);
    md.push('', `Between the snapshots after trips ${SNAP_A} and ${SNAP_B}: ${res.totalGrowthMB} MB of objects more.`, '', '| type:name | count change | bytes change | count now |', '|---|---|---|---|');
    for (const r of res.grewBytes || []) md.push(`| ${r.k} | ${r.dn} | ${r.db} | ${r.n} |`);
    md.push('', 'By count:', '');
    for (const r of res.grewCount || []) md.push(`- ${r.k}: ${r.dn} (${r.db} bytes)`);
    if (res.holders) {
      md.push('', `Who holds the new objects (${res.holders.newCount} of the types below):`, '');
      for (const [k, list] of Object.entries(res.holders.held)) {
        md.push(`- ${k}`);
        for (const [hk, n] of list) md.push(`  - ${n} x held by ${hk}`);
      }
    }
    md.push('', 'Game-state counters that grew (trip 2 -> last):', '');
    for (const [k, a2, b2] of res.probeGrew) md.push(`- ${k}: ${a2} -> ${b2}`);
    writeFileSync(join(OUT, 'heapdiff.md'), md.join('\n') + '\n');
    writeFileSync(join(OUT, 'heapdiff.json'), JSON.stringify(res, null, 1));
    const climb = res.trips.length >= 3 ? +(res.trips[res.trips.length - 1].home - res.trips[1].home).toFixed(2) : null;
    rec.ok(`the heap home again, trip 2 -> trip ${res.trips.length}: ${climb} MB (report: heapdiff.md)`, climb != null && climb < 3, res.trips.map((t) => t.home));
  } finally {
    stopAlive = true;
    await P.ctx.close().catch(() => {});
  }
}
