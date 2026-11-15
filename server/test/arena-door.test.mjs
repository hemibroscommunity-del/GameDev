/* ═══ v2.3.5522: THE ARENA DOOR -- ONE WRITER OF THE TOURNAMENT (card L PR 5) ═══
 * (docs/specs/arena-door.md)
 *
 * The Gladiator tournament is one field, `this._arena` (none, or its record,
 * whose `status` goes gathering, running, complete), written only by
 * server/src/gladiator.js _arenaTo, by a way of ARENA_WAYS.  Its rules are
 * the callers' own checks (`arenadoor: false` in the live flags lifts them).
 * This suite:
 *
 *   1. the door's own rules: each way's phase, an open only where none is
 *      (with its id, queue and gather deadline), a start only from
 *      gathering, a crown only from running and with its champion, an
 *      empty or a cancel only while gathering, a clear only when complete,
 *      the switch;
 *   2. A SECOND WRITER FAILS: a write of `this._arena` (`._arena`) anywhere
 *      in server/src outside _arenaTo, or of a tournament's `status` in
 *      gladiator.js outside it; every way has its caller in its function;
 *      a player's match (`ps._arenaMatch`) is written only where a match
 *      goes live and where it is resolved.  The phase table's guard reads
 *      the same off the syntax tree (tools/guards/phase-table.test.mjs §2,
 *      DOOR_SUITES);
 *   3. through the real room: the first entry opens it, the last to leave
 *      empties it, too few at the deadline cancel it (refunded), two start
 *      it, a kill crowns its champion, and 60 s later it is cleared;
 *   4. step 1 changes nothing: an entry while it runs is still refused, a
 *      second entry still joins the same tournament.
 *
 * Break proofs, tried by hand: `this._arena = null;` put back in
 * _tickArena -> FAIL 2 (and the guard's §2); `t.status = 'running';` back
 * in _arenaStart -> FAIL 2 (and the guard's §2, by the duel line).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { ARENA, ARENA_WAYS, arenaMethods } from '../src/gladiator.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

/* ── 1. the door's own rules ── */
{
  check('1. the ways and their phases',
    JSON.stringify(ARENA_WAYS) === JSON.stringify({ open: 'gathering', start: 'running', crown: 'complete', empty: 'none', cancel: 'none', clear: 'none' }));
  const door = Object.assign({ _arena: null, _liveFlags: {} }, arenaMethods);
  const rec = (o) => Object.assign({ id: 't1', status: 'gathering', queue: [], gatherDeadline: 1000, round: 0, players: [], matches: [], champion: null }, o || {});
  check('1. none at first; no way but open writes from none',
    door._arenaPhase() === 'none' && ['start', 'crown', 'empty', 'cancel', 'clear'].every((w) => door._arenaTo(null, w) === false) && door._arena === null);
  check('1. an open with no id, no queue or no deadline is refused',
    door._arenaTo(rec({ id: 5 }), 'open') === false && door._arenaTo(rec({ queue: null }), 'open') === false && door._arenaTo(rec({ gatherDeadline: NaN }), 'open') === false && door._arena === null);
  check('1. an open of another status is refused', door._arenaTo(rec({ status: 'running' }), 'open') === false);
  check('1. the first entry opens it: gathering', door._arenaTo(rec(), 'open') === true && door._arenaPhase() === 'gathering');
  const t = door._arena;
  check('1. ...and only where none is', door._arenaTo(rec({ id: 't2' }), 'open') === false && door._arena === t);
  check('1. no crown nor clear while gathering', door._arenaTo(null, 'crown') === false && door._arenaTo(null, 'clear') === false && door._arenaPhase() === 'gathering');
  check('1. a way to a record takes none (start, crown, the ends: null only)', door._arenaTo(rec(), 'start') === false && door._arenaTo(rec(), 'empty') === false);
  check('1. the start: running, in place (the same record)', door._arenaTo(null, 'start') === true && door._arena === t && door._arenaPhase() === 'running');
  check('1. no empty, cancel or second start while running', ['empty', 'cancel', 'start'].every((w) => door._arenaTo(null, w) === false) && door._arenaPhase() === 'running');
  check('1. no crown without its champion', door._arenaTo(null, 'crown') === false && door._arenaPhase() === 'running');
  t.champion = { playerId: 'bp_x', playerName: 'X', prize: 500 };
  check('1. the crown: complete, in place', door._arenaTo(null, 'crown') === true && door._arena === t && door._arenaPhase() === 'complete');
  check('1. the clear: none', door._arenaTo(null, 'clear') === true && door._arena === null);
  door._arenaTo(rec({ id: 't3' }), 'open');
  check('1. the queue emptied: none', door._arenaTo(null, 'empty') === true && door._arena === null);
  door._arenaTo(rec({ id: 't4' }), 'open');
  check('1. too few at the deadline: none', door._arenaTo(null, 'cancel') === true && door._arena === null);
  check('1. an unknown way, or one off the prototype, is refused', door._arenaTo(null, 'nope') === false && door._arenaTo(null, 'toString') === false);
  door._liveFlags = { arenadoor: false };
  door._arenaTo(rec({ id: 't5' }), 'open');
  check('1. arenadoor: false: an open over one, a clear while gathering, a crown with no champion, as the old lines could have',
    door._arenaTo(rec({ id: 't6', gatherDeadline: NaN }), 'open') === true && door._arena.id === 't6'
    && door._arenaTo(null, 'crown') === true && door._arenaPhase() === 'complete' && door._arenaTo(null, 'cancel') === true && door._arena === null);
  check('1. ...but an open still carries its gathering status', door._arenaTo(rec({ status: 'complete' }), 'open') === false);
  door._liveFlags = { arenadoor: true };
  door._arenaTo(rec({ id: 't7' }), 'open');
  check('1. arenadoor: true is the default', door._arenaTo(rec({ id: 't8' }), 'open') === false && door._arena.id === 't7');
}

/* ── 2. no second writer ── */
{
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
  const WRITE = /(?:\._arena|\[\s*['"`]_arena['"`]\s*\])\s*(?:\?\?|\|\||&&|\*\*|[-+*/%])?=(?!=)|delete\s+[\w$.]+\._arena\b|Object\.assign\(\s*[\w$.]+\s*,[^)]*\{[^}]*\b_arena\s*:/;
  const outside = [];
  let doorWrites = 0, doorStatus = 0;
  const gl = 'server/src/gladiator.js';
  for (const f of files) {
    const raw = readFileSync(new URL(f, ROOT), 'utf8');
    if (!raw.includes('_arena')) continue;
    const lines = strip(raw).split('\n');
    let inDoor = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (f === gl) {
        if (/^ {2}_arenaTo\(rec, way\) \{/.test(l)) inDoor = true;
        else if (inDoor && /^ {2}\},?\s*$/.test(l)) inDoor = false;
      }
      const st = f === gl && /\.status\s*=(?!=)/.test(l);
      if (!WRITE.test(l) && !st) continue;
      if (inDoor) { if (st) doorStatus++; else doorWrites++; continue; }
      outside.push(f + ':' + (i + 1) + '  ' + l.trim().slice(0, 100));
    }
  }
  check('2. _arenaTo writes the tournament (a record, none) and turns its status', doorWrites === 2 && doorStatus === 1, { doorWrites, doorStatus });
  check('2. no write of this._arena in server/src, nor of a tournament\'s status in gladiator.js, outside _arenaTo', outside.length === 0, outside);
  const src = strip(readFileSync(new URL(gl, ROOT), 'utf8'));
  const body = (name) => { const at = src.indexOf('\n  ' + name + '('); const at2 = at >= 0 ? at : src.indexOf('\n  async ' + name + '('); return at2 < 0 ? '' : src.slice(at2, src.indexOf('\n  },', at2)); };
  /* up to the way's word: the open's record has calls in it (crypto.randomUUID()) */
  const asks = (name) => [...body(name).matchAll(/this\._arenaTo\((?:null|\{[\s\S]*?\}),\s*'([a-z]+)'\)/g)].map((m) => m[1]).join();
  check('2. every way has its caller: open in _arenaJoin, empty in _arenaLeave, cancel in _arenaLazyTick, start in _arenaStart, crown in _arenaCrown, clear in _tickArena',
    asks('_arenaJoin') === 'open' && asks('_arenaLeave') === 'empty' && asks('_arenaLazyTick') === 'cancel' && asks('_arenaStart') === 'start' && asks('_arenaCrown') === 'crown' && asks('_tickArena') === 'clear',
    { join: asks('_arenaJoin'), leave: asks('_arenaLeave'), lazy: asks('_arenaLazyTick'), start: asks('_arenaStart'), crown: asks('_arenaCrown'), tick: asks('_tickArena') });
  /* a player's match, the note beside the door */
  const marks = [];
  for (const f of files) {
    const lines = strip(readFileSync(new URL(f, ROOT), 'utf8')).split('\n');
    lines.forEach((l, i) => { if (/_arenaMatch\s*=(?!=)|delete\s+[\w$.]+\._arenaMatch\b/.test(l)) marks.push(f + ':' + (i + 1)); });
  }
  check('2. a player\'s match is written in gladiator.js alone, at its going live and its resolution',
    marks.length === 2 && marks.every((m) => m.startsWith(gl + ':')) && /psA\._arenaMatch = m\.id; psB\._arenaMatch = m\.id;/.test(body('_arenaTryActivate')) && /delete ps\._arenaMatch/.test(body('_arenaOnMatchResolved')), marks);
}

/* ── 3 and 4. through the real room ── */
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
    _store: store,
  };
}
{
  const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
  const room = new GameRoom(makeState(), mockEnv);
  const fakeWs = () => ({ sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} });
  const P = (n) => 'bp_ad_' + n;
  for (const n of ['a', 'b', 'c']) {
    const ws = fakeWs();
    room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
    await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: P(n), name: n.toUpperCase(), phrase: 'p-' + n, data: { x: 0, y: 0, z: 'town' } }));
    room.playerState[P(n)].coins = 1000;
  }
  const settle = () => new Promise((r) => setTimeout(r, 25));

  const j = await room._arenaJoin(P('a'), 'A');
  check('3. the first entry opens it (gathering)', j.ok === true && room._arenaPhase() === 'gathering' && room._arena.queue.length === 1, j);
  const tid = room._arena.id;
  await room._arenaJoin(P('b'), 'B');
  check('4. a second entry joins the same tournament', room._arena.id === tid && room._arena.queue.length === 2);
  await room._arenaLeave(P('b'));
  await room._arenaLeave(P('a'));
  check('3. the last to leave empties it (none)', room._arena === null && room._arenaPhase() === 'none');

  await room._arenaJoin(P('a'), 'A');
  room._arena.gatherDeadline = Date.now() - 1;
  room._arenaLazyTick(Date.now());
  await settle();
  check('3. too few at the deadline cancel it, refunded', room._arena === null && room.playerState[P('a')].coins === 1000, room.playerState[P('a')].coins);

  await room._arenaJoin(P('a'), 'A');
  await room._arenaJoin(P('b'), 'B');
  room._arena.gatherDeadline = Date.now() - 1;
  room._arenaLazyTick(Date.now());
  await settle();
  const t = room._arena;
  check('3. two at the deadline start it (running), their match live', room._arenaPhase() === 'running' && t.matches.length === 1 && room.playerState[P('a')]._arenaMatch === t.matches[0].id);
  const late = await room._arenaJoin(P('c'), 'C');
  check('4. an entry while it runs is still refused, as before', late.ok === false && late.error === 'Tournament in progress' && room.playerState[P('c')].coins === 1000, late);

  const psB = room.playerState[P('b')];
  psB.hp = 0;
  room._handlePlayerDeath(psB, P('b'), 'pvp:' + P('a'));
  await settle();
  check('3. a kill crowns its champion (complete, the same record)', room._arena === t && room._arenaPhase() === 'complete' && t.champion && t.champion.playerId === P('a') && !room.playerState[P('a')]._arenaMatch, t.champion);
  room._tickArena(Date.now());
  check('3. it is kept for the completion poll', room._arenaPhase() === 'complete');
  room._tickArena(Date.now() + 61000);
  check('3. ...and cleared 60 s on (none)', room._arena === null);
  check('4. the entry fee is as before', ARENA.ENTRY_FEE === 100);
}

console.log(`\narena-door: ${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
