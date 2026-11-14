/* ═══ v2.3.5211: THE DUEL DOOR (card L PR 5; docs/specs/duel-door.md) ═══
 *
 * A duel's phase is one field, `d.status` ('active', then 'resolved'),
 * written only by duel.js _duelTo, by a way of DUEL_WAYS; the end is final
 * (live flag `dueldoor: false` lets a resolved duel be written again, as the
 * old line would have).  This suite:
 *
 *   1. the door's own rules: the way goes to its phase and no other; a
 *      resolved duel stays resolved; the kill switch;
 *   2. A SECOND WRITER FAILS: a write of `.status` anywhere in server/src
 *      that is not _duelTo's, nor one of NOT_A_DUEL (other records' status,
 *      each with why).  The phase table's guard reads the same off the
 *      syntax tree (tools/guards/phase-table.test.mjs §2, DOOR_SUITES);
 *   3. every way a duel ends, played through the real room: a challenge and
 *      its accept (born 'active'), a clean kill, a death to a monster, the
 *      away clock's forfeit, and the time running out (all 'resolved');
 *   4. step 1 changes nothing: a second resolve of a resolved duel pays and
 *      sends nothing (its old guard), and a challenge is still no duel.
 *
 * Break proof, tried by hand: `duel.status = 'resolved';` put back in
 * _resolveDuel -> FAIL 2 (and the guard's §2).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { duelMethods, DUEL_PHASES, DUEL_WAYS, DUEL } from '../src/duel.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

/* ── 1. the door's own rules ── */
{
  check('1. the phases are active, resolved', DUEL_PHASES.join() === 'active,resolved');
  check('1. the one way: resolve -> resolved', DUEL_WAYS.resolve === 'resolved' && Object.keys(DUEL_WAYS).length === 1);
  const door = Object.assign(Object.create(null), duelMethods, { _liveFlags: {} });
  let d = { status: 'active' };
  check('1. active -> resolved by resolve', door._duelTo(d, 'resolved', 'resolve') === true && d.status === 'resolved');
  d = { status: 'active' };
  check('1. a way names its own phase only (resolve -> active refused)', door._duelTo(d, 'active', 'resolve') === false && d.status === 'active');
  check('1. an unknown way, or one off the prototype, is refused', door._duelTo(d, 'resolved', 'nope') === false && door._duelTo(d, undefined, 'toString') === false && d.status === 'active');
  check('1. no duel, no write', door._duelTo(null, 'resolved', 'resolve') === false && door._duelTo(7, 'resolved', 'resolve') === false);
  d = { status: 'resolved' };
  check('1. a resolved duel stays resolved', door._duelTo(d, 'resolved', 'resolve') === false);
  door._liveFlags = { dueldoor: false };
  check('1. dueldoor: false writes over a resolved duel, as the old line would have', door._duelTo(d, 'resolved', 'resolve') === true && d.status === 'resolved');
  check('1. ...but never by a wrong way', door._duelTo(d, 'active', 'resolve') === false && d.status === 'resolved');
  door._liveFlags = { dueldoor: true };
  check('1. dueldoor: true is the default', door._duelTo(d, 'resolved', 'resolve') === false);
}

/* ── 2. no second writer ── */
{
  /* other records' `status`: each named, with why */
  const NOT_A_DUEL = [
    { file: 'server/src/alliance.js', text: 'w.status = ', why: 'an alliance war\'s end, its own record' },
    { file: 'server/src/clans.js', text: 'war.status = ', why: 'a clan war\'s end, its own record' },
    { file: 'server/src/gladiator.js', text: ' t.status = ', why: 'an arena tournament: the phase table\'s `arena` row (the space before `t` keeps out `mt.status =`)' },
    { file: 'server/src/arena.js', text: 'tournament.status = ', why: 'the old Arena object\'s tournament (kept for its binding)' },
  ];
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
  const WRITE = /(?:\.status|\[\s*['"]status['"]\s*\])\s*(?:[-+*/]?=(?!=)|\+\+|--)|delete\s+[\w$.]+\.status\b|Object\.assign\(\s*[\w$.]+\s*,[^)]*\{[^}]*\bstatus\s*:/;
  const outside = [];
  const seen = new Set();
  let doorWrites = 0;
  for (const f of files) {
    const raw = readFileSync(new URL(f, ROOT), 'utf8');
    if (!raw.includes('status')) continue;
    const lines = strip(raw).split('\n');
    let inDoor = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (f === 'server/src/duel.js') {
        if (/^\s{2}_duelTo\(d, to, way\) \{/.test(l)) inDoor = true;
        else if (inDoor && /^\s{2}\},?\s*$/.test(l)) inDoor = false;
      }
      if (!WRITE.test(l)) continue;
      if (inDoor) { doorWrites++; continue; }
      const nb = NOT_A_DUEL.find((x) => x.file === f && l.includes(x.text));
      if (nb) { seen.add(nb); continue; }
      outside.push(f + ':' + (i + 1) + '  ' + l.trim().slice(0, 100));
    }
  }
  check('2. _duelTo writes the phase (one write)', doorWrites === 1, doorWrites);
  check('2. no write of .status in server/src outside _duelTo but NOT_A_DUEL\'s', outside.length === 0, outside);
  const stale = NOT_A_DUEL.filter((x) => !seen.has(x)).map((x) => x.file + ' "' + x.text + '"');
  check('2. every NOT_A_DUEL entry still writes (a stale one is deleted)', stale.length === 0, stale);
  const src = readFileSync(new URL('server/src/duel.js', ROOT), 'utf8');
  check('2. a duel is born active, once, in _makeDuel', (src.match(/\{ status: 'active', away: Object\.create\(null\)/g) || []).length === 1);
  check('2. the old line goes through the door', /this\._duelTo\(duel, 'resolved', 'resolve'\)/.test(src));
  const gl = readFileSync(new URL('server/src/gladiator.js', ROOT), 'utf8');
  check('2. the arena makes its match through _makeDuel, with no status of its own', /this\._makeDuel\(\{/.test(gl) && !/_makeDuel\(\{[^}]*status/.test(gl));
}

/* ── 3. every way a duel ends, through the real room ── */
function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
const room = new GameRoom(makeState(), mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
const A = 'bp_ddoor_a', B = 'bp_ddoor_b';
for (const [id, lab] of [[A, 'a'], [B, 'b']]) {
  const ws = fakeWs(lab);
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: lab.toUpperCase(), phrase: 'p-' + id, data: { x: 0, y: 0, z: 'town' } }));
  room.playerState[id].coins = 100;
}
const chal = (target, wager) => ({ type: 'duel_wager_request', payload: { target, fromName: 'A', wager } });
const acc = (target, wager) => ({ type: 'duel_accept', payload: { target, wager } });
async function startDuel(wager) {
  await room._interceptDuel(A, chal(B, wager));
  const challenge = room._duelChallenges && [...room._duelChallenges.values()].length > 0;
  const noDuel = !room._duelFor(A);
  await room._interceptDuel(B, acc(A, wager));
  return { d: room._duelFor(A), challenge, noDuel };
}
const ends = () => room.eventBuffer.filter((e) => e.type === 'duel_end');
{
  let r = await startDuel(10);
  check('3. a challenge is no duel: no record until the accept (step 1)', r.noDuel);
  check('3. the accept makes a duel, born active', r.d && r.d.status === 'active', r.d && r.d.status);

  /* a clean kill */
  room._duelOnDeath(B, 'pvp:' + A);
  check('3. a clean kill resolves it (and it leaves the map)', r.d.status === 'resolved' && !room._duels.has(r.d.id));

  /* a death to a monster */
  r = await startDuel(0);
  room._duelOnDeath(A, 'monster:slime');
  check('3. a death to a monster resolves it', r.d.status === 'resolved' && !room._duels.has(r.d.id));

  /* the away clock's forfeit */
  r = await startDuel(0);
  room._duelOnDisconnect(B);
  check('3. a leave starts the away clock, not an end (away is no phase)', r.d.status === 'active' && r.d.away[B] > Date.now());
  r.d.away[B] = Date.now() - 1;
  room._tickDuels(Date.now());
  check('3. the away clock run out forfeits it: resolved', r.d.status === 'resolved' && !room._duels.has(r.d.id));

  /* the time running out */
  r = await startDuel(0);
  r.d.expiresAt = Date.now() - 1;
  room._tickDuels(Date.now());
  check('3. the time running out resolves it', r.d.status === 'resolved' && !room._duels.has(r.d.id));

  /* ── 4. step 1: a second resolve does nothing, as before ── */
  r = await startDuel(0);
  room._duelOnDeath(B, 'pvp:' + A);
  const n = ends().length;
  room._resolveDuel(r.d, B, A, 'kill');
  check('4. a second resolve of a resolved duel sends nothing and keeps it resolved (its old guard)', r.d.status === 'resolved' && ends().length === n);
  check('4. DUEL.GRACE_MS is the away clock\'s length, untouched', DUEL.GRACE_MS === 15000);
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
