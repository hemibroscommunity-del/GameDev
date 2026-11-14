/* ═══ v2.3.5484: THE STAT BOARDS (server/src/statboards.js, card PW) ═══
 * docs/specs/stat-boards.md.
 *
 *   1. THE POINTS: a player's allocated points read off the worker's prog3
 *      record (every shared stat, and damage summed over the three weapons);
 *      a stored row's made safe; one board a shared stat, then `pts_dmg`.
 *   2. THE BOARDS: a row keeps them; `pts_<stat>` ranks by them, a 0 left
 *      off; a deleted character's stand-in keeps its own; the other boards
 *      are as they were.
 *   3. THE ROOM: `caps.statboards` is the count; a board report carries the
 *      record's points; a spend makes the next report due (inside the
 *      change signature) and the same points again write nothing; the
 *      phone's word never reaches them; `statboards: false`.
 */
import { GameRoom } from '../src/index.js';
import { Leaderboard } from '../src/leaderboard.js';
import { PROG3, prog3RespecPoints } from '../src/prog3.js';
import { STAT_BOARD_IDS, statOfBoard, statPointsOf, cleanStatPoints } from '../src/statboards.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail)); }
}
function makeState() {
  const store = new Map();
  const puts = [];
  return {
    _store: store, _puts: puts,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { puts.push(k); store.set(k, v); },
      delete: async (k) => { store.delete(k); },
      list: async (o) => { const out = new Map(); for (const [k, v] of store) if (!o || !o.prefix || k.startsWith(o.prefix)) out.set(k, v); return out; },
    },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
}
const settle = () => new Promise((r) => setTimeout(r, 15));
const record = (levels, alloc, dmg) => {
  const p3 = { sk: {} };
  for (const cat of PROG3.SKILLS) p3.sk[cat] = { level: levels[cat] || 1, xp: 0 };
  prog3RespecPoints(p3, false);
  Object.assign(p3.alloc, alloc || {});
  for (const cat of PROG3.SKILLS) p3.atk[cat].dmg = (dmg && dmg[cat]) || 0;
  return p3;
};

/* ═══ 1. THE POINTS ═══ */
console.log('1. the points');
{
  const body = Object.keys(PROG3.BODY);
  check('1a. one board a shared stat, in the table\'s order, then the weapons\' damage',
    JSON.stringify(STAT_BOARD_IDS) === JSON.stringify([...body.map((k) => 'pts_' + k), 'pts_dmg']), STAT_BOARD_IDS);
  check('1b. a board names its stat; anything else names none', statOfBoard('pts_def') === 'def' && statOfBoard('pts_dmg') === 'dmg'
    && statOfBoard('pts_luck') === null && statOfBoard('pts___proto__') === null && statOfBoard('level') === null && statOfBoard(null) === null);
  const ps = { prog3: record({ sword: 20, bow: 8 }, { hp: 9, def: 14, dodge: 3 }, { sword: 11, bow: 4, staff: 0 }) };
  const sp = statPointsOf(ps);
  check('1c. the points are the record\'s: each shared stat, and damage over the three weapons',
    sp.hp === 9 && sp.def === 14 && sp.dodge === 3 && sp.stam === 0 && sp.dmg === 15 && Object.keys(sp).length === body.length + 1, sp);
  check('1d. no prog3 record: none', statPointsOf({}) === null && statPointsOf(null) === null);
  const c = cleanStatPoints({ hp: 7.9, def: -3, dodge: 'x', dmg: 1e9, luck: 50, ['__proto__']: { hp: 1 } });
  check('1e. a stored row\'s points made safe: the known stats, whole, never below 0, bounded, nothing else',
    c.hp === 7 && c.def === 0 && c.dodge === 0 && c.dmg === 999 * 3 && !('luck' in c) && Object.keys(c).length === body.length + 1, c);
  check('1f. nothing to clean: none', cleanStatPoints(null) === null && cleanStatPoints(5) === null);
}

/* ═══ 2. THE BOARDS ═══ */
console.log('\n2. the boards');
{
  const L = new Leaderboard(makeState(), {});
  const t0 = Date.now();
  const pts = (o) => ({ hp: 0, def: 0, dodge: 0, stam: 0, eres: 0, mana: 0, move: 0, dmg: 0, ...o });
  await L.updatePlayer({ playerId: 'bp_sb_a', name: 'A', level: 20, series: { melee: 20 }, statPoints: pts({ def: 30, dmg: 12 }), ts: t0 });
  await L.updatePlayer({ playerId: 'bp_sb_b', name: 'B', level: 30, series: { bow: 30 }, statPoints: pts({ def: 45, hp: 20 }), ts: t0 });
  await L.updatePlayer({ playerId: 'bp_sb_c', name: 'C', level: 9, series: { magic: 9 }, ts: t0 });   /* none yet */
  await L.updatePlayer({ playerId: 'bp_sb_d', name: 'D', level: 5, series: { melee: 5 }, statPoints: pts({ dmg: 40 }), ts: t0 });
  const ids = async (cat) => (await L.getTop(cat, 50)).map((p) => [p.id, p.value]);
  check('2a. Defense: by the points, each value the points', JSON.stringify(await ids('pts_def')) === JSON.stringify([['bp_sb_b', 45], ['bp_sb_a', 30]]), await ids('pts_def'));
  check('2b. Damage: the weapons\' points summed', JSON.stringify(await ids('pts_dmg')) === JSON.stringify([['bp_sb_d', 40], ['bp_sb_a', 12]]), await ids('pts_dmg'));
  check('2c. a row with none in a stat, or no points at all, is off its board', JSON.stringify(await ids('pts_hp')) === JSON.stringify([['bp_sb_b', 20]]) && (await ids('pts_mana')).length === 0);
  const lv = await L.getTop('combat', 50);
  check('2d. the other boards are as they were', lv.length === 4 && lv[0].id === 'bp_sb_b', lv.map((p) => p.id));
  check('2e. an unknown pts_ category is no stat board (the level board, as before)', (await L.getTop('pts_luck', 50)).every((p) => !('value' in p)));
  await L.markGone({ playerId: 'bp_sb_d', ts: t0 });
  check('2f. a deleted character\'s stand-in keeps its points on the board', (await L.getTop('pts_dmg', 50)).some((p) => p.gone && p.value === 40));
}

/* ═══ 3. THE ROOM ═══ */
console.log('\n3. the room');
{
  const sent = [];
  const env = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async (req) => { sent.push(await req.clone().json().catch(() => null)); return new Response('{}'); } }) } };
  const joinIn = async (rm, id) => {
    const ws = { sent: [], send(x) { this.sent.push(JSON.parse(x)); }, close() {} };
    rm.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
    await rm.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'Sam', phrase: 'p-' + id, ws: [1, 5], data: { x: 0, y: 0, z: 'town', name: 'Sam' } }));
    await settle();
    return ws;
  };
  const R = new GameRoom(makeState(), env);
  clearInterval(R.tickInterval); R.tickInterval = null;
  const ws = await joinIn(R, 'bp_sb_p');
  const sync = ws.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('3a. caps.statboards is how many boards there are', sync && sync.caps.statboards === STAT_BOARD_IDS.length, sync && sync.caps.statboards);
  const ps = R.playerState.bp_sb_p;
  const sess = R._sessionById('bp_sb_p');
  ps.prog3 = record({ sword: 15 }, { def: 10, hp: 5 }, { sword: 8 });
  R._prog3Recompute(ps);
  sent.length = 0;
  await R.reportToLeaderboard(sess, true);
  check('3b. a board report carries the record\'s points', sent.length === 1 && JSON.stringify(sent[0].statPoints) === JSON.stringify(statPointsOf(ps)), sent[0] && sent[0].statPoints);
  /* the phone's word never reaches them: a track claiming points */
  await R.webSocketMessage(ws, JSON.stringify({ type: 'track', data: { x: 0, y: 0, statPoints: { def: 999 }, prog3: { alloc: { def: 999 } } } }));
  await settle();
  sent.length = 0;
  await R.reportToLeaderboard(sess, true);
  check('3c. a phone\'s claimed points never reach the report', sent.length === 1 && sent[0].statPoints.def === 10, sent[0] && sent[0].statPoints);
  /* a spend: inside the signature, so the next report the throttle lets through goes */
  ps.prog3.alloc.def = 13;
  sent.length = 0;
  sess._lbAt = Date.now() - 1000;
  await R.reportToLeaderboard(sess);
  check('3d. no report sooner than the throttle allows, spend or not', sent.length === 0);
  sess._lbAt = Date.now() - R.LEADERBOARD_MIN_MS - 1000;
  await R.reportToLeaderboard(sess);
  check('3e. a spend makes the next report due: it goes with the new points', sent.length === 1 && sent[0].statPoints.def === 13, sent.map((x) => x && x.statPoints));
  sent.length = 0;
  sess._lbAt = Date.now() - R.LEADERBOARD_MIN_MS - 1000;
  await R.reportToLeaderboard(sess);
  check('3f. the same points again: no report (the signature is unchanged)', sent.length === 0, sent.length);

  /* the kill switch */
  const R2 = new GameRoom(makeState(), env);
  clearInterval(R2.tickInterval); R2.tickInterval = null;
  R2._liveFlags = { statboards: false };
  const ws2 = await joinIn(R2, 'bp_sb_q');
  const sync2 = ws2.sent.find((m) => m.type === 'state_sync' && m.caps);
  R2.playerState.bp_sb_q.prog3 = record({ sword: 5 }, { def: 4 });
  sent.length = 0;
  await R2.reportToLeaderboard(R2._sessionById('bp_sb_q'), true);
  check('3g. `statboards: false`: no cap, and no report carries the points',
    sync2 && sync2.caps.statboards === undefined && sent.length === 1 && !('statPoints' in sent[0]), [sync2 && sync2.caps.statboards, sent]);
  R2._liveFlags = {};
  check('3g. ...cleared, it is on again', R2._statBoardsOn() && R2._statBoardsCap() === STAT_BOARD_IDS.length);
}

console.log('\n' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
