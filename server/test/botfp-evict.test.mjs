/* v2.3.4379: the anti-bot record is not erased by a busy day
 * (docs/specs/anticheat-botfp.md, "the cap never evicts a player who is
 * still playing"; the state-machine sweep's S8-21, 2026-11-03).
 *
 * The room keeps a botfp record for up to BOTFP.MAP_CAP (128) players.  Until
 * this version the 128th new identity since the room started evicted the
 * oldest by lastStrikeAt, online or not, and only a join reads botstat: back:
 * the player's next cook, strike, hit or start recreated the record EMPTY and
 * its first write replaced the stored one -- the owner's flags, the counters,
 * the score and the hour's counts gone, and a cook scripted past the hour cap
 * given a fresh hour.  This suite replays that road against the real GameRoom:
 *   1. a flagged player P, already at the hour's cook cap, joins and stays;
 *      129 more players join and leave (the busy day).
 *   2. P's record is the same one: flags, score, counters and the hour's count
 *      survive, and P's next cook is still over the cap (fish kept, a clamp).
 *   3. the write that follows (P's close) keeps the flags in botstat:.
 *   4. the map stays bounded: the players who left were evicted.
 *   5. the eviction reads no storage and writes nothing for P.
 *   6. the kill switch `botrecordkeep: false` (thrown through the operator's
 *      real route) brings back the old eviction: P is dropped and recreated
 *      empty, and the cap restarts.  Kept here, not in liveops.test, so the
 *      lanes of one batch do not all write into one file. */
import { GameRoom } from '../src/index.js';
import { BOTFP } from '../src/botfp.js';
import { flagNameOk } from '../src/liveops.js';

function makeState() {
  const store = new Map();
  const log = { gets: [], puts: [] };
  return {
    storage: {
      get: async (k) => { log.gets.push(k); return store.get(k); },
      /* real DO storage keeps a COPY of what was put (botfp.test §9b) */
      put: async (k, v) => { log.puts.push(k); store.set(k, JSON.parse(JSON.stringify(v))); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { for (const x of (Array.isArray(k) ? k : [k])) store.delete(x); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
    _log: log,
  };
}
const mockEnv = {
  LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) },
  ADMIN_KEY: 'test-admin-key',
};
function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const P = 'bp_evict_p';
const seed = (now) => ({
  v: 1, updatedAt: now, deviceId: null, deviceEnv: null,
  counters: { strikes: 0, noFpStrikes: 0, syntheticStrikes: 0, entFloorHits: 0, replayHits: 3,
              taplessCooks: 0, cooks: BOTFP.COOK_HOUR_CAP, capClamps: 0, noFpPerfect: 0, startless: 0 },
  /* scripted to the cap inside this hour */
  hour: { hourStart: now - 60000, bySkill: { cooking: BOTFP.COOK_HOUR_CAP } },
  hRing: ['h-a', 'h-b'], welford: { n: 0, entMean: 0, entM2: 0, vcMean: 0, vcM2: 0 },
  score: 15, lastFlagAt: now - 60000,
  flags: [{ kind: 'suspicion-threshold', at: now - 120000, detail: { via: 'cook' } },
          { kind: 'suspicion-threshold', at: now - 60000, detail: { via: 'cook' } }],
});

/* one busy day, against one fresh room: P joins with a record on file and
   stays; `others` more join and leave; then P cooks once */
async function busyDay(flags) {
  const state = makeState();
  const room = new GameRoom(state, mockEnv);
  const join = async (ws, id) => {
    room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
    await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, ws: [1, 5],
      data: { x: -100000, y: -100000, z: 'town' } }));
  };
  if (flags) {
    for (const [name, value] of Object.entries(flags)) {
      const r = await room.fetch(new Request('https://x/api/admin/flags', {
        method: 'POST', headers: { Authorization: 'Bearer test-admin-key' }, body: JSON.stringify({ name, value }),
      }));
      check('setup: POST /flags takes ' + name + ': ' + value, r.status === 200, r.status);
    }
  }
  const now = Date.now();
  state._store.set('botstat:' + P, seed(now));
  const wsP = fakeWs('p');
  await join(wsP, P);
  const recAtJoin = room._botfp.get(P);
  const atJoin = { flags: recAtJoin.flags.length, cooking: recAtJoin.hour.bySkill.cooking };
  for (let i = 0; i <= BOTFP.MAP_CAP; i++) {
    const ws = fakeWs('o' + i);
    const id = 'bp_evict_o' + i;
    await join(ws, id);
    await room.webSocketClose(ws);
  }
  const recAfter = room._botfp.get(P) || null;
  const ps = room.playerState[P];
  ps.inventory = { fish_minnow: 5 };
  const gets0 = state._log.gets.length;
  const putsP0 = state._log.puts.filter((k) => k === 'botstat:' + P).length;
  await room.webSocketMessage(wsP, JSON.stringify({ type: 'cook_request', payload: { fishKey: 'fish_minnow', kind: 'cooked', taps: [] } }));
  const recCook = room._botfp.get(P);
  const cookGets = state._log.gets.slice(gets0).filter((k) => k.startsWith('botstat:'));
  const cookPutsP = state._log.puts.filter((k) => k === 'botstat:' + P).length - putsP0;
  const fishAfterCook = ps.inventory.fish_minnow;
  await room.webSocketClose(wsP);
  return { room, state, recAtJoin, atJoin, recAfter, recCook, fishAfterCook, cookGets, cookPutsP,
           stored: state._store.get('botstat:' + P) };
}

// ── 0. the switch's name ──
check('0. botrecordkeep is a lower-case name the flags route takes', flagNameOk('botrecordkeep'));

// ── 1-5. today: the online player's record survives the busy day ──
{
  const d = await busyDay(null);
  check('1. setup: P\'s record was read at the join (2 flags, the cap reached)',
    d.atJoin.flags === 2 && d.atJoin.cooking === BOTFP.COOK_HOUR_CAP, d.atJoin);
  check('2. after 129 more joiners P\'s record is still the one read at the join', d.recAfter === d.recAtJoin);
  check('2. ...flags, score and counters survive',
    d.recCook.flags.length === 2 && d.recCook.score > 10 && d.recCook.counters.replayHits === 3,
    { flags: d.recCook.flags.length, score: d.recCook.score, counters: d.recCook.counters });
  check('2. ...the hour count does not restart: P\'s next cook is over the cap (fish kept, one clamp)',
    d.fishAfterCook === 5 && d.recCook.counters.capClamps === 1 && d.recCook.hour.bySkill.cooking > BOTFP.COOK_HOUR_CAP,
    { fish: d.fishAfterCook, clamps: d.recCook.counters.capClamps, hour: d.recCook.hour.bySkill });
  check('3. the write at P\'s close keeps the flags, the score and the hour in botstat:',
    d.stored && d.stored.flags.length === 2 && d.stored.score > 10 && d.stored.hour.bySkill.cooking > BOTFP.COOK_HOUR_CAP,
    d.stored && { flags: d.stored.flags.length, score: d.stored.score, hour: d.stored.hour });
  check('4. the map stays bounded (the players who left were evicted)',
    d.room._botfp.size <= BOTFP.MAP_CAP, d.room._botfp.size);
  check('5. the cook read no botstat: from storage', d.cookGets.length === 0, d.cookGets);
  check('5. ...and wrote P\'s botstat: once, the first clamp\'s forced write as before', d.cookPutsP === 1, d.cookPutsP);
}

// ── 6. the kill switch brings back the old eviction ──
{
  const d = await busyDay({ botrecordkeep: false });
  check('6. botrecordkeep: false: P\'s record is evicted by the busy day', d.recAfter !== d.recAtJoin);
  check('6. ...and the cook recreates it empty: no flags, a fresh hour, the cook granted',
    d.recCook.flags.length === 0 && d.recCook.hour.bySkill.cooking === 1 && d.fishAfterCook === 4,
    { flags: d.recCook.flags.length, hour: d.recCook.hour.bySkill, fish: d.fishAfterCook });
  check('6. ...whose write replaces the stored flags (today\'s harm, kept only behind the switch)',
    d.stored && d.stored.flags.length === 0, d.stored && d.stored.flags);
}

if (failures) { console.log('\n' + failures + ' FAILED'); process.exit(1); }
console.log('\nall botfp-evict checks passed');
