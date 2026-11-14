/* ═══ v2.3.5214: THE HARVEST DOOR -- THE GATHER RECORD'S ONE WRITER (card L PR 5) ═══
 * (docs/specs/harvest-door.md)
 *
 * A harvest's phase on the worker is its record, `this.extractions[pid]`
 * (none, or started; mining, woodcutting and fishing alike, so fishing's row
 * is the same door).  Its one writer is gathering.js _harvestTo, by a way of
 * HARVEST_WAYS (start; strike, end, sweep to none).  A started record carries
 * its start (a finite startedAt), so the sweep can always end it (live flag
 * `harvestdoor: false` writes any record, as the old line did).  This suite:
 *
 *   1. the door's own rules: the ways, a record without its start refused, a
 *      way to none of no record writes nothing, a hostile id, the switch;
 *   2. A SECOND WRITER FAILS: a write of one of this.extractions' keys (or a
 *      new map for it) anywhere in server/src outside _harvestTo, but its
 *      birth in the room's constructor.  The phase table's guard reads the
 *      same off the syntax tree (tools/guards/phase-table.test.mjs §2, its
 *      DOOR_SUITES line, `keyed`);
 *   3. every way through the real room, in the Wheel: a start (mining and
 *      fishing), a strike in its window (paid, the record gone), an attack's
 *      end, a stuck arrow's late chip (the record kept), the sweep;
 *   4. step 1 changes nothing: a strike too early keeps the record; the
 *      record outlives its socket (leave.js, v2.3.3322); a cook asks for its
 *      hits and is given no record.
 *
 * Break proofs, tried by hand: `this.extractions[session.id] = rec;` put back
 * in _handleExtractionStart -> FAIL 2 (and the guard's §2); a second
 * `this.extractions = Object.create(null);` in index.js -> FAIL 2.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { gatheringMethods, HARVEST_WAYS } from '../src/gathering.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

/* ── 1. the door's own rules ── */
{
  check('1. the ways: start begins a record; strike, end and sweep end it',
    JSON.stringify(HARVEST_WAYS) === JSON.stringify({ start: 'started', strike: 'none', end: 'none', sweep: 'none' }));
  const door = Object.assign(Object.create(null), gatheringMethods, { _liveFlags: {}, extractions: Object.create(null) });
  const rec = () => ({ nodeId: 'n1', zone: 'wheel', skill: 'mining', startedAt: 1000 });
  const r1 = rec();
  check('1. a start writes the record', door._harvestTo('bp_a', r1, 'start') === true && door.extractions.bp_a === r1);
  const r2 = rec();
  check('1. a second start replaces it (a re-tap restarts, as before)', door._harvestTo('bp_a', r2, 'start') === true && door.extractions.bp_a === r2);
  for (const way of ['strike', 'end', 'sweep']) {
    door._harvestTo('bp_a', rec(), 'start');
    const ok = door._harvestTo('bp_a', null, way);
    if (!ok || 'bp_a' in door.extractions) { check('1. ' + way + ' ends it', false, { ok, has: 'bp_a' in door.extractions }); break; }
  }
  check('1. strike, end and sweep each end it', !('bp_a' in door.extractions));
  check('1. a way to none of no record writes nothing', door._harvestTo('bp_a', null, 'strike') === false && !('bp_a' in door.extractions));
  door._harvestTo('bp_a', rec(), 'start');
  check('1. a way to none takes no record (null only)', door._harvestTo('bp_a', rec(), 'end') === false && !!door.extractions.bp_a);
  check('1. an unknown way, or one off the prototype, is refused',
    door._harvestTo('bp_a', null, 'nope') === false && door._harvestTo('bp_a', null, 'toString') === false && !!door.extractions.bp_a);
  check('1. no id, or one that is no string, is refused',
    door._harvestTo('', rec(), 'start') === false && door._harvestTo(7, rec(), 'start') === false && door._harvestTo(null, rec(), 'start') === false);
  check('1. a start with no record is refused', door._harvestTo('bp_b', null, 'start') === false && door._harvestTo('bp_b', 7, 'start') === false && !('bp_b' in door.extractions));
  let bad = 0;
  for (const s of [undefined, null, NaN, Infinity, '1000', {}]) {
    if (door._harvestTo('bp_b', { nodeId: 'n1', zone: 'wheel', skill: 'mining', startedAt: s }, 'start') !== false || 'bp_b' in door.extractions) bad++;
  }
  check('1. a record without its start (a finite startedAt) is refused: the sweep could never end it', bad === 0, bad);
  check('1. a hostile id is a key like any other (the map has no prototype)',
    door._harvestTo('__proto__', rec(), 'start') === true && Object.prototype.hasOwnProperty.call(door.extractions, '__proto__')
    && door._harvestTo('__proto__', null, 'sweep') === true && !Object.prototype.hasOwnProperty.call(door.extractions, '__proto__'));
  door._liveFlags = { harvestdoor: false };
  check('1. harvestdoor: false writes a record without its start, as the old line would have',
    door._harvestTo('bp_b', { nodeId: 'n1' }, 'start') === true && !!door.extractions.bp_b);
  check('1. ...but never a way to none with a record, nor an unknown way', door._harvestTo('bp_b', rec(), 'strike') === false && door._harvestTo('bp_b', rec(), 'nope') === false);
  door._liveFlags = { harvestdoor: true };
  check('1. harvestdoor: true is the default', door._harvestTo('bp_c', { nodeId: 'n1' }, 'start') === false);
}

/* ── 2. no second writer ── */
{
  /* a birth is its whole line, and stands ONCE: a second
     `this.extractions = Object.create(null);` (a reset of every player's
     record) is no birth (the guard also holds it to the constructor, `fn`) */
  const BIRTHS = [
    { file: 'server/src/index.js', re: /^\s*this\.extractions = Object\.create\(null\);/, text: 'this.extractions = Object.create(null);', once: true, why: 'the map\'s birth, empty, in the room\'s constructor' },
  ];
  const births = new Map();
  const ROOT = new URL('../../', import.meta.url);
  const files = [];
  (function walk(rel) {
    for (const n of readdirSync(new URL(rel, ROOT))) {
      const r = rel + n;
      if (statSync(new URL(r, ROOT)).isDirectory()) { if (n !== 'vendor') walk(r + '/'); }
      else if (/\.(js|mjs)$/.test(n)) files.push(r);
    }
  })('server/src/');
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
  /* the map itself, or one of its keys: assigned, updated, deleted, assigned into */
  const WRITE = /\.extractions\s*(?:\[[^\]]*\]\s*)?(?:[-+*/]?=(?!=)|\+\+|--)|delete\s+[\w$.]*\.extractions\s*\[|Object\.assign\(\s*[\w$.]*\.extractions\b/;
  const outside = [];
  const seen = new Set();
  let doorWrites = 0;
  for (const f of files) {
    const raw = readFileSync(new URL(f, ROOT), 'utf8');
    if (!raw.includes('extractions')) continue;
    const lines = strip(raw).split('\n');
    let inDoor = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (f === 'server/src/gathering.js') {
        if (/^\s{2}_harvestTo\(pid, rec, way\) \{/.test(l)) inDoor = true;
        else if (inDoor && /^\s{2}\},?\s*$/.test(l)) inDoor = false;
      }
      if (!WRITE.test(l)) continue;
      if (inDoor) { doorWrites++; continue; }
      const b = BIRTHS.find((x) => x.file === f && x.re.test(l) && !(x.once && births.get(x)));
      if (b) { seen.add(b); births.set(b, (births.get(b) || 0) + 1); continue; }
      outside.push(f + ':' + (i + 1) + '  ' + l.trim().slice(0, 100));
    }
  }
  check('2. _harvestTo writes the record (a set and a delete)', doorWrites === 2, doorWrites);
  check('2. no write of this.extractions or its keys in server/src outside _harvestTo but its birth', outside.length === 0, outside);
  const stale = BIRTHS.filter((x) => !seen.has(x)).map((x) => x.file + ' "' + x.text + '"');
  check('2. the birth still writes (a stale one is deleted)', stale.length === 0, stale);
  const src = readFileSync(new URL('server/src/gathering.js', ROOT), 'utf8');
  const ways = [...src.matchAll(/this\._harvestTo\([^,]+,\s*[^,]+,\s*'([a-z]+)'\)/g)].map((m) => m[1]).sort();
  check('2. every way has its one caller: end, start, strike, sweep', ways.join() === 'end,start,strike,sweep', ways);
}

/* ── 3 and 4. through the real room, in the Wheel ── */
function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async (opts) => { const out = new Map(); for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v); return out; },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
}
const env = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
{
  const room = new GameRoom(makeState(), env);
  clearInterval(room.tickInterval); room.tickInterval = null;
  room._fishRand = () => 0.5;
  room._liveFlags = {};
  const ws = fakeWs();
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: 'bp_hd', name: 'Harvester', protocolVersion: 2, ws: [1, 5], data: { z: 'wheel' } }));
  clearInterval(room.tickInterval); room.tickInterval = null;
  const ps = room.playerState.bp_hd;
  check('setup: one player joined', !!ps);
  ps.z = 'wheel';
  ps.inventory = { woodcutting_axe: 1, fishing_pole: 1, mining_pickaxe: 1 };
  ps.lifeSkills = { mining: { level: 1, xp: 0 }, fishing: { level: 1, xp: 0 }, woodcutting: { level: 1, xp: 0 } };
  const nodes = room._ensureZoneNodes('wheel');
  const byType = (t) => nodes.find((n) => n.nodeType === t && (n.tierLvl || 1) === 1);
  const send = (type, payload) => room.webSocketMessage(ws, JSON.stringify({ type, payload }));
  const stand = (n) => { n.alive = true; n.respawnAt = 0; ps.x = n.x; ps.y = n.y; };
  const ore = byType('oreVein'), fish = byType('fishSpot'), tree = byType('tree');
  check('setup: the Wheel has an ore vein, a fishing spot and a tree', !!(ore && fish && tree));

  /* a start, then a strike too early (kept), then in its window (paid, gone) */
  stand(ore);
  await send('extraction_start', { nodeId: ore.id, zone: 'wheel', skill: 'mining' });
  const rec = room.extractions.bp_hd;
  check('3. a start begins the record, with its start', !!rec && rec.nodeId === ore.id && rec.skill === 'mining' && Number.isFinite(rec.startedAt), rec);
  await send('node_strike', { id: ore.id, zone: 'wheel', accuracy: 'good' });
  check('4. a strike too early is refused and keeps the record (as before)',
    room.extractions.bp_hd === rec && ore.alive === true && (room._lastStrikeFor('bp_hd') || {}).why === 'too-early', room._lastStrikeFor('bp_hd'));
  rec.startedAt = Date.now() - rec.openDelayBase;
  await send('node_strike', { id: ore.id, zone: 'wheel', accuracy: 'good' });
  check('3. a strike in its window is paid, and ends the record', ore.alive === false && !('bp_hd' in room.extractions), room._lastStrikeFor('bp_hd'));

  /* fishing: the same door */
  stand(fish);
  await send('extraction_start', { nodeId: fish.id, zone: 'wheel', skill: 'fishing' });
  const frec = room.extractions.bp_hd;
  check('3. fishing starts the same record (fishing\'s row is this door)', !!frec && frec.skill === 'fishing' && frec.nodeId === fish.id, frec);
  frec.startedAt = Date.now() - frec.openDelayBase;
  await send('node_strike', { id: fish.id, zone: 'wheel', accuracy: 'good' });
  check('3. ...and its paid strike ends it', fish.alive === false && !('bp_hd' in room.extractions), room._lastStrikeFor('bp_hd'));

  /* an attack ends it; a stuck arrow's late chip keeps it */
  stand(tree);
  await send('extraction_start', { nodeId: tree.id, zone: 'wheel', skill: 'woodcutting' });
  check('3. a chop starts it', !!room.extractions.bp_hd);
  room._endExtraction('bp_hd', true);
  check('3. a stuck arrow\'s late chip (keepRecord) keeps it', !!room.extractions.bp_hd);
  room._endExtraction('bp_hd');
  check('3. an attack ends it', !('bp_hd' in room.extractions));

  /* the sweep */
  await send('extraction_start', { nodeId: tree.id, zone: 'wheel', skill: 'woodcutting' });
  const t0 = room.extractions.bp_hd && room.extractions.bp_hd.startedAt;
  room._sweepStaleExtractions(t0 + room.EXTRACTION_TIMEOUT_MS - 1);
  check('3. the sweep leaves a record inside its time', !!room.extractions.bp_hd);
  room._sweepStaleExtractions(t0 + room.EXTRACTION_TIMEOUT_MS + 1);
  check('3. the sweep ends one past EXTRACTION_TIMEOUT_MS', !('bp_hd' in room.extractions));

  /* the record outlives its socket (leave.js, v2.3.3322) */
  await send('extraction_start', { nodeId: tree.id, zone: 'wheel', skill: 'woodcutting' });
  const kept = room.extractions.bp_hd;
  await room.webSocketClose(ws, 1006, 'gone', false);
  check('4. the record outlives its socket (no leave way)', room.extractions.bp_hd === kept && !!kept);
}
{
  /* a cook asks for its hits and is given no record */
  const room = new GameRoom(makeState(), env);
  clearInterval(room.tickInterval); room.tickInterval = null;
  room._liveFlags = {};
  const ws = fakeWs();
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: 'bp_hc', name: 'Cook', protocolVersion: 2, ws: [1, 5], data: { z: 'wheel' } }));
  clearInterval(room.tickInterval); room.tickInterval = null;
  await room.webSocketMessage(ws, JSON.stringify({ type: 'extraction_start', payload: { skill: 'cooking', hitSeq: 2 } }));
  check('4. a cook is given no record (its phase is the claim, the cook door)', !('bp_hc' in room.extractions));
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
