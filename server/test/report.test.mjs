/* The field report, the worker's side -- v2.3.5123 (server/src/report.js; the
 * phone's half src/debug/report.js; the shape docs/SHAPES.md part 4; the
 * grand plan's step 1.1, card A's PR 4).
 *
 * Every phone sends, every five minutes, how smoothly the game ran on it.
 * The worker checks each field, keeps it in the day's book by cell, and the
 * report loses its player there.  This suite holds:
 *
 *   1. THE LISTS: the worker's closed lists are the phone's (the device
 *      class, the savers, the places, the bins, the holds' names);
 *   2. THE CHECKS: a report as a phone builds it adds to its cell; a value
 *      off its range or list is dropped (a field), or the report is (no
 *      cell); free text and `__proto__` reach nothing;
 *   3. THROUGH THE ROOM: a join is told caps.report; a report lands in the
 *      day's book's `dev` part with nothing of the player in it (no id, no
 *      name, no address); nothing is sent back;
 *   4. THE PACE: one a socket a PACE_MS (the phone's every five minutes
 *      pass);
 *   5. THE KILL SWITCH `report: false`: un-advertised, and a report that
 *      still comes is dropped;
 *   6. THE WORKER'S OWN: the round trip's waver kept at each pong, and
 *      `delay` and `waver` summed from the session, never the message;
 *   7. THE BOOK'S ROOM: one cell with every field, against the part's line
 *      (daybook.js PART_BYTES), so a day holds several devices and builds;
 *   8. v2.3.5125: THE SPEED TEST'S CARD: its steps are the Speed test's own,
 *      its model a place in the phone's list; checked, and into the book's
 *      `speed` part by model, class and build;
 *   9. THE BOOK'S ONE ADMIN ROUTE (GET /dev/daybook) and the Test panel's
 *      "Copy table" text, with nothing of a player in either;
 *  10. v2.3.5127, THE GATEKEEPER'S REVIEW (sitting 3), a test each: the
 *      first frame after a hidden spell is not a freeze; the switch back on
 *      sends nothing of the time it was off; the build in a cell is the
 *      worker's call (a preview is `preview`); hidden time is not play time;
 *      a report is not the player's input (the AFK clock); `near` is the
 *      near circle's;
 *  11. v2.3.5127, SITTING 4'S REVIEW: a cell half its size (section 7's
 *      floor, 16 a day); a socket's reports reach at most two cells; `died`
 *      only on a socket's first report; a thawed page's spell is a return
 *      and not seen; another tab's switch off throws the open report away;
 *  12. v2.3.5127, THE SPEED CARD'S OWN CAP AND SWITCH (sitting 4): caps.report
 *      2 takes the card, `reportspeed: false` 1 (the card dropped, the report
 *      counted); the phone sends it only to 2, and says why not.
 *  13. v2.3.5221, CARD O'S LANES (step 2.1; src/game/drawLanes.js): caps.report
 *      3 takes a lane but `full` -- `thirty` and `light` each in a cell of its
 *      own -- the governor's `rung` and the self-test's `self`; an unknown
 *      lane is dropped; `reportlanes: false` advertises 2, drops a lane other
 *      than `full` and the two fields; the phone sends a lane but `full` only
 *      to 3.
 *  14. v2.3.5222, THE GOVERNOR (card O PR 2): `late` by the pacer's one rule
 *      (framePacer.js lateOver) on EVERY screen it knows -- at 60 and 30 now,
 *      not only past 70 -- and `split` with it; absent where the refresh is
 *      not known; the phone's `rung` (the most rungs taken, the seconds
 *      below the row) goes to caps.report 3 alone.
 *
 * BREAK PROOF (rule 8), each tried by hand, 2026-11-14:
 *   2. report.js: drop `!HOLD_NAMES.includes(name) ||`          -> FAIL 2
 *   3. report.js: `tree[session.id + '|' + r.cell] = r.sums`      -> FAIL 3
 *   4. report.js: `PACE_MS: 0`                                    -> FAIL 4
 *   5. join.js: `report: 1,` in place of the method's answer      -> FAIL 5
 *   8. report.js speedSums: drop `|| has(s, r[0])` (a step twice)  -> FAIL 8
 *   9. devtools.js: the /dev/daybook route's path `/dev/book`        -> FAIL 9
 *  10. src/debug/report.js addFrames: drop `if (spansShow) continue;` -> FAIL 10
 *      report.js: `(o.site === 'live' ? build : 'preview')` as `build` -> FAIL 10
 *      index.js: `msg.type === 'pong'` alone (a report stamps the AFK clock) -> FAIL 10
 *  11. report.js: `CELLS_A_SOCKET: 99`                             -> FAIL 11
 *      report.js: `if (o.first && Array.isArray(msg.died)` without `o.first &&` -> FAIL 2
 *  12. report.js _reportTake: `if (r.speed)` (no switch)            -> FAIL 12.2
 *      report.js _reportCap: `return 1;` (the old cap)              -> FAIL 3
 *      src/debug/report.js buildReport: `if (_speed)` alone         -> FAIL 12.3
 *  13. (v2.3.5221, tried 2026-11-14)
 *      report.js reportSums: drop `if (!lanes && msg.drawLane !== 'full') return null;` -> FAIL 13.4
 *      report.js _reportCap: `return this._reportLanesOff() ? 2 : 2;` -> FAIL 3, 13.1 (and 13.2)
 *      report.js reportSums: `if (true) {` for `if (lanes) {` (rung and self always) -> FAIL 13.4
 *      src/debug/report.js buildReport: `drawLane: drawLane(cls),`  -> FAIL 13.6
 *  14. (v2.3.5222, tried 2026-11-14)
 *      src/debug/report.js addFrames: `const judging = !!(pace && pace.refresh && pace.refresh < 14);` -> FAIL 14.1
 *      src/debug/report.js buildReport: `if (true) r.rung = ...` for `if (takesLanes(_S)) r.rung = ...` -> FAIL 14.3
 */
import { readFileSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { REPORT, DEV_CLASS, SAVERS, WHERE, GAP_BINS, HOLD_NAMES as W_HOLDS, DRAW_LANES, SELF_PROGRAMS, RUNG,
  reportSums, swCell, holdKey, classOfReport, rttWaverNext, reportSiteOf, SPEED_STEPS, SPEED_MODELS_N, speedSums } from '../src/report.js';
import { DAYBOOK, bookBytes, bookRead } from '../src/daybook.js';
import { flagNameOk } from '../src/liveops.js';
import { DEV_CLASS as P_CLASS } from '../../src/game/deviceProfile.js';
import { CLIENT_SAVERS } from '../../src/game/clientOff.js';
import { HOLD_NAMES as P_HOLDS } from '../../src/debug/holdNames.js';
import { WHERE as P_WHERE, GAP_EDGES, takesReports, gapBin, whereOf, buildOf, addFrames, blankBins,
  SPEED_STEPS as P_STEPS, SPEED_MODELS, speedCardOf, bookTableText, takesSpeed, queueSpeedCard, takesLanes } from '../../src/debug/report.js';
import { LANE_NAMES, PROGRAM_NAMES, ladderDepth } from '../../src/game/drawLanes.js';   /* v2.3.5221: card O's lanes */
import { lateOver } from '../../src/game/framePacer.js';   /* v2.3.5222: the pacer's one rule */

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 600) : ''); }
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function makeState() {
  const store = new Map();
  const puts = [];
  const clone = (v) => (v === undefined ? undefined : structuredClone(v));
  return {
    _store: store, _puts: puts,
    storage: {
      async get(k) { return clone(store.get(k)); },
      async put(k, v) { puts.push(k); store.set(k, clone(v)); },
      async delete(k) { for (const x of (Array.isArray(k) ? k : [k])) store.delete(x); },
      async list(o) {
        let keys = [...store.keys()].filter((k) => !o?.prefix || k.startsWith(o.prefix)).sort();
        if (o?.startAfter) keys = keys.filter((k) => k > o.startAfter);
        if (o?.reverse) keys.reverse();
        if (o?.limit) keys = keys.slice(0, o.limit);
        const out = new Map();
        for (const k of keys) out.set(k, clone(store.get(k)));
        return out;
      },
    },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => new Response('{}') }) } };
const fakeWs = () => ({ sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} });
let clock = 1800000000000;
Date.now = () => clock;
const settle = () => new Promise((r) => setTimeout(r, 15));

/* a report as the phone built it on the QA box (src/debug/report.js, 2026-11-14), then made whole */
const PHONE = () => ({
  type: 'report', v: 1,
  devClass: { gl: 2, soft: 1, maxTex: 8192, prec: 16, units: 32, mp: 1, dpr: 2, hz: 'other', fill: 'none', input: 'touch', frame: 0, cores: 4 },
  drawLane: 'full', sw: [], build: 5122, secs: 46, seen: 46, drawn: 105, gaps: [0, 0, 0, 0, 0, 0, 0, 0, 0, 105],
  holds: [['body-bake', 115, 'other', 0], ['body-bake', 97, 'town', 0], ['screen-check', 91, 'town', 1]],
  where: 'town', near: 1, mem: [47, 54, 18], lost: [0, 0], died: ['no'],
});
const KEY = '2-1-8192-16-32-1-2-other-none-touch-0-4';

/* ── 1. THE LISTS ── */
{
  check('1. the device class\'s lists are the phone\'s (deviceProfile.js DEV_CLASS), in its order', same(DEV_CLASS, P_CLASS), { here: DEV_CLASS, phone: P_CLASS });
  check('1. the savers are the phone\'s (clientOff.js CLIENT_SAVERS)', same(SAVERS, CLIENT_SAVERS.map((c) => c.id)), { here: SAVERS });
  check('1. the places are the phone\'s (report.js WHERE)', same(WHERE, P_WHERE));
  check('1. the gaps\' bins are the phone\'s (one past its ' + GAP_EDGES.length + ' edges)', GAP_BINS === GAP_EDGES.length + 1 && gapBin(0) === 0 && gapBin(16.7) === 3 && gapBin(500) === GAP_BINS - 1);
  check('1. the holds\' names are the one list (holdNames.js HOLD_NAMES)', same(W_HOLDS, P_HOLDS));
  check('1. the lanes are the phone\'s (v2.3.5221: card O\'s, drawLanes.js LANE_NAMES)', same(DRAW_LANES, LANE_NAMES), { here: DRAW_LANES, phone: LANE_NAMES });
  check('1. every hold name makes a key the day\'s book takes', W_HOLDS.every((n) => /^[A-Za-z0-9_.:|,+=-]+$/.test(holdKey(n)) && holdKey(n).length <= DAYBOOK.KEY_MAX));
  check('1. the phone\'s where: a dungeon, the farm, a region of the world, else other',
    whereOf('dungeon:x', null) === 'dungeon' && whereOf('farm_home', null) === 'farm' && whereOf('wheel', 'ember') === 'ember' && whereOf('wheel', 'sea') === 'other' && whereOf('town', 'town') === 'other');
  check('1. the phone\'s build: the N of 2.3.N', buildOf('2.3.5123') === 5123 && buildOf('dev') === 0);
  check('1. the phone sends only to a worker that says caps.report', takesReports({ _serverCaps: { report: 1 } }) && !takesReports({ _serverCaps: {} }) && !takesReports(null));
}

/* ── 2. THE CHECKS ── */
{
  const r = reportSums(PHONE(), { delay: 80, waver: 12, site: 'live', first: true });
  check('2. a phone\'s report makes its cell: the shape, the class\'s key, the lane, the switches, the build',
    r && r.cell === '1|' + KEY + '|full|none|5122', r && r.cell);
  const s = r && r.sums;
  check('2. ...and its sums: one report, its seconds, its gaps, where it was (a map), near (a sum), memory, lost, died',
    s && s.n === 1 && s.secs === 46 && same(s.gaps, [0, 0, 0, 0, 0, 0, 0, 0, 0, 105]) && same({ ...s.where }, { town: 46 })
      && s.near === 1 && same(s.mem, [47, 54, 18]) && same(s.lost, [0, 0]) && same(s.died, [1, 0, 0]) && Object.getPrototypeOf(s.where) === null, s);
  check('2. the holds by name: [times, ms in all]', s && same(s.holds[holdKey('body-bake')], [2, 212]) && same(s.holds[holdKey('screen-check')], [1, 91]), s && s.holds);
  check('2. the worker\'s own delay and waver, summed: [delay, waver]', s && same(s.line, [80, 12]), s && s.line);
  check('2. no late where the pacer gave no verdict, and no split', s && !('late' in s) && !('split' in s));
  check('2. the seen seconds are the time played (v2.3.5127); `drawn` is the card\'s, not added', s && s.seen === 46 && !('drawn' in s));

  const drop = (mut) => { const m = PHONE(); mut(m); return reportSums(m, {}); };
  check('2. no cell, no report: a class off its list (a chip\'s name in a field)', drop((m) => { m.devClass.gl = 'Apple GPU'; }) === null);
  check('2. ...a class missing a field', drop((m) => { delete m.devClass.cores; }) === null && classOfReport(null) === null);
  check('2. ...a lane off its list', drop((m) => { m.drawLane = 'lite'; }) === null);
  check('2. ...a build that is not a whole number', drop((m) => { m.build = '5122'; }) === null && drop((m) => { m.build = 1e9; }) === null);
  check('2. ...no seconds, or past a day', drop((m) => { m.secs = 0; }) === null && drop((m) => { m.secs = REPORT.SECS_MAX + 1; }) === null);
  check('2. ...another shape number', drop((m) => { m.v = 2; }) === null);
  const f = (mut) => { const m = PHONE(); mut(m); return reportSums(m, { first: true }).sums; };
  check('2. gaps that do not add up to the frames drawn are dropped', !('gaps' in f((m) => { m.gaps[0] = 7; })));
  check('2. more frames than 250 a second: the frames and gaps dropped', !('gaps' in f((m) => { m.drawn = m.secs * 300; m.gaps = [0, 0, 0, 0, 0, 0, 0, 0, 0, m.drawn]; })));
  check('2. late over judged is dropped', !('late' in f((m) => { m.late = [9, 4]; })));
  {
    const a = f((m) => { m.late = [4, 90]; m.split = [10, 1, 2, 3, 0, 5, 40]; });
    const b = f((m) => { m.late = [4, 90]; m.split = [10, 1, 2, 3, 0, 5, 30, 10]; });
    check('2. a split of seven adds outside; of eight, busy and wait and their sum as outside',
      same(a.late, [4, 90]) && same(a.split, [10, 1, 2, 3, 0, 5, 40, 0, 0]) && same(b.split, [10, 1, 2, 3, 0, 5, 40, 30, 10]), [a.split, b.split]);
    check('2. a split of another length, or a fraction, is dropped',
      !('split' in f((m) => { m.late = [1, 9]; m.split = [1, 2]; })) && !('split' in f((m) => { m.late = [1, 9]; m.split = [1.5, 0, 0, 0, 0, 0, 0]; })));
  }
  {
    const s2 = f((m) => { m.holds = [['__proto__', 50, 'town', 0], ['gc', 50, 'Paris', 0], ['gc', 50.5, 'town', 0], ['gc', 30, 'town', 2], ['gc', 20, 'town', 1]]; });
    check('2. holds: a name off the list, a place off the list, a fraction are dropped; the rest add up',
      s2.holds && Object.keys(s2.holds).length === 1 && same(s2.holds[holdKey('gc')], [2, 50]) && Object.getPrototypeOf(s2.holds) === null, s2.holds);
    check('2. ...free text as a name reaches nothing', !('holds' in f((m) => { m.holds = [['DROP TABLE', 50, 'town', 0], ['body-bake jog-east', 40, 'town', 0]]; })));
    const many = f((m) => { m.holds = new Array(40).fill(['gc', 5, 'town', 0]); });
    check('2. at most five holds are read', many.holds[holdKey('gc')][0] === REPORT.HOLDS_MAX);
  }
  check('2. free text where a place goes is dropped (no `where`)', !('where' in f((m) => { m.where = 'my house'; })));
  check('2. memory past its line, or not three numbers, is dropped', !('mem' in f((m) => { m.mem = [1, 2, 99999]; })) && !('mem' in f((m) => { m.mem = [1, 2]; })));
  check('2. the switches: none, the one saver, or many; an id off the list is dropped',
    swCell([]) === 'none' && swCell(['onecopy']) === 'onecopy' && swCell(['onecopy', 'viewcap']) === 'many' && swCell(['onecopy', 'rm -rf', '__proto__']) === 'onecopy' && swCell('onecopy') === 'none');
  {
    const k = f((m) => { m.died = ['killed', 230, 14, 1, 'ember']; });
    check('2. a page that died: its kind, its numbers and where', same(k.died, [0, 1, 0]) && same(k.diedMem, [230, 14, 1]) && same({ ...k.diedAt }, { ember: 1 }), k);
    check('2. `died` counts only on a socket\'s first report (once a page; v2.3.5127)', !('died' in reportSums({ ...PHONE(), died: ['killed', 230, 14, 1, 'ember'] }, {}).sums));
    check('2. a death off its shape is dropped', !('died' in f((m) => { m.died = ['killed', 230]; })) && !('died' in f((m) => { m.died = ['murdered']; })) && !('died' in f((m) => { m.died = ['killed', 1, 2, 3, 'Paris']; })));
  }
}

/* ── 3. THROUGH THE ROOM ── */
const state = makeState();
const room = new GameRoom(state, mockEnv);
room._liveFlags = {};
async function join(id, name) {
  const ws = fakeWs();
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), ip: '203.0.113.7', site: 'live' });
  await room.webSocketMessage(ws, JSON.stringify({
    type: 'join', id, name, phrase: 'p-' + id, device: { id: 'dev' + id }, ws: [1, 5],
    data: { x: 0, y: 0, z: 'town', name, sk: 'tan', hr: 'mop' },
  }));
  await settle();
  return ws;
}
/* the day's `dev` part through the book's own reader: what is stored and what waits (the first add is written at once) */
const devPart = async () => {
  if (room._daybook && room._daybook.putting) await room._daybook.putting;
  const r = await bookRead(room, 1);
  return r.ok && r.days[0] ? r.days[0].dev : null;
};
const bookText = () => JSON.stringify([...state._store.entries()].filter(([k]) => k.startsWith(DAYBOOK.PREFIX))) + JSON.stringify(room._daybook ? [...room._daybook.days.values()] : null);
const send = async (ws, msg) => { await room.webSocketMessage(ws, JSON.stringify(msg)); await settle(); };
const A = await join('bp_rep_a', 'Repo');
{
  const sync = A.sent.find((m) => m.type === 'state_sync');
  check('3. a join is told caps.report (3: the Speed test\'s card too, v2.3.5127; card O\'s lanes too, v2.3.5221)', sync && sync.caps && sync.caps.report === 3, sync && sync.caps && sync.caps.report);
  const before = A.sent.length;
  await send(A, PHONE());
  const dev = await devPart();
  const cell = dev && dev['1|' + KEY + '|full|none|5122'];
  check('3. the report is in the day\'s book, `dev` part, by its cell', cell && cell.n === 1 && cell.secs === 46, dev);
  check('3. ...written to `daybook:<day>` (the book\'s first add goes at once)', state._puts.some((k) => k.startsWith(DAYBOOK.PREFIX)), state._puts.filter((k) => k.startsWith('day')));
  const book = bookText();
  check('3. nothing of the player reaches the book: no id, name, address or device', book.includes(KEY) && !/bp_rep_a|Repo|203\.0\.113|devbp/.test(book), book.slice(0, 300));
  check('3. nothing is sent back', A.sent.length === before, A.sent.slice(before).map((m) => m.type));
  const before2 = A.sent.length;
  await send(A, { type: 'report', v: 1, junk: 'x'.repeat(2000) });
  check('3. a report the worker cannot read goes nowhere, and nothing is sent back', A.sent.length === before2);
}

/* ── 4. THE PACE ── */
{
  const S = room.sessions.get(A);
  clock += 10 * 1000;
  check('4. a second report 10 s later is paced off', room._reportTake(S, PHONE(), clock) === 'pace');
  clock += REPORT.PACE_MS;
  check('4. one PACE_MS on, it is taken', room._reportTake(S, PHONE(), clock) === 'ok');
  const cell = (await devPart())['1|' + KEY + '|full|none|5122'];
  check('4. ...and adds: two reports in the cell', cell.n === 2 && cell.secs === 92, cell);
  check('4. the pace lets the phone\'s cadence through (a minute after the join, then every five)', REPORT.PACE_MS <= 60 * 1000 && REPORT.PACE_MS >= 30 * 1000);
  const ghost = { id: null };
  check('4. a socket that never joined is refused', room._reportTake(ghost, PHONE(), clock) === 'who');
}

/* ── 5. THE KILL SWITCH ── */
{
  check('5. `report` is a name POST /flags takes', flagNameOk('report'));
  room._liveFlags = { report: false };
  const B = await join('bp_rep_b', 'Offy');
  const sync = B.sent.find((m) => m.type === 'state_sync');
  check('5. `report: false`: a join is not told caps.report', sync && sync.caps && !sync.caps.report, sync && sync.caps && sync.caps.report);
  clock += REPORT.PACE_MS;
  const n0 = (await devPart())['1|' + KEY + '|full|none|5122'].n;
  const why = room._reportTake(room.sessions.get(B), PHONE(), clock);
  check('5. ...and a report that still comes is dropped', why === 'off' && (await devPart())['1|' + KEY + '|full|none|5122'].n === n0, why);
  room._liveFlags = {};
  check('5. nothing set: on', room._reportOn() === true);
}

/* ── 6. THE WORKER'S OWN ── */
{
  const S = room.sessions.get(A);
  const pong = async (rt) => { S.lastPing = clock - rt; await send(A, { type: 'pong', ts: S.lastPing }); };
  S.rtt = 80; S.rttWaver = undefined;
  await pong(80); await pong(80); await pong(80);
  const steady = S.rttWaver;
  await pong(200); await pong(20); await pong(220); await pong(30);
  check('6. a steady line wavers little, a jumpy one much (kept at each pong)', typeof steady === 'number' && steady < 30 && S.rttWaver > 40, { steady, jumpy: S.rttWaver });
  check('6. the waver is capped as the round trip is', rttWaverNext(0, 1e6, 0, 0.3, 300) === 300 && rttWaverNext(undefined, 50, 50, 0.3, 300) === 0);
  const r = reportSums({ ...PHONE(), delay: 1, waver: 1, line: [1, 1] }, { delay: 260.4, waver: 3 });
  check('6. delay and waver are the session\'s, never the message\'s', same(r.sums.line, [260, 3]), r.sums.line);
}

/* ── 7. THE BOOK'S ROOM ── */
{
  const m = PHONE();
  m.late = [40, 900]; m.split = [100, 20, 30, 40, 5, 60, 900, 700, 200];
  m.split = m.split.slice(0, 8);
  m.holds = [['body-bake', 115, 'town', 3], ['strip-made', 20, 'ember', 1], ['other: BT_AUDIO$1._fold > foldToMono', 19, 'farm', 0], ['screen-check', 30, 'commons', 0], ['gc', 40, 'frost', 9]];
  m.died = ['killed', 230, 14, 1, 'ember'];
  /* v2.3.5221: card O's two (the governor's rung, two programs failed) */
  m.drawLane = 'thirty'; m.rung = [5, 120]; m.self = ['sheen', 'shadow'];
  const r = reportSums(m, { delay: 80, waver: 12, site: 'live', first: true, lanes: true });
  const tree = { [r.cell]: r.sums };
  const bytes = bookBytes(tree);
  const cells = Math.floor(DAYBOOK.PART_BYTES / bytes);
  console.log(`     one cell with every field: ${bytes} bytes as the book reckons it; the part holds ${cells} such a day`);
  /* v2.3.5127 (sitting 4): was 2,392 bytes and 10 cells; the day filled in about six live builds of two devices */
  check('7. a cell with every field leaves room for at least sixteen cells a day (devices times builds)', cells >= 16, { bytes, cells });
}

/* ── 8. THE SPEED TEST'S CARD (v2.3.5125) ── */
{
  const st = readFileSync(new URL('../../src/game/speedTest.js', import.meta.url), 'utf8');
  const ks = [...st.matchAll(/\{ k: '([a-z0-9]+)'/g)].map((m) => m[1]);
  check('8. the card\'s steps are the Speed test\'s own (speedTest.js steps()), in its order, on both sides',
    same(ks, [...P_STEPS]) && same(SPEED_STEPS, P_STEPS), { speedTest: ks, phone: P_STEPS });
  check('8. the worker keeps the models\' count, the phone their names (only a place is sent)', SPEED_MODELS_N === SPEED_MODELS.length && SPEED_MODELS[0] === 'Not said');
  check('8. the speed test hands its result to the report (queueSpeedCard)', /queueSpeedCard\(result\)/.test(st));
  const result = { rows: [
    { k: 'all', fps: 59.6, p50: 16.7, p95: 18.3, work: 2.4 }, { k: 'noshadow', fps: 60, p50: 16.6, p95: 17.1, work: null },
    { k: 'bare', fps: 61, p50: 16.4, p95: 16.9, work: 1.9 }, { k: 'all', fps: 1 }, { k: 'my step', fps: 1 },
  ] };
  const card = speedCardOf(result, 7);
  check('8. the phone\'s card: whole numbers, -1 for work not measured, a step once, off-list steps gone',
    same(card, { model: 7, rows: [['all', 60, 17, 18, 2], ['noshadow', 60, 17, 17, -1], ['bare', 61, 16, 17, 2]] }), card);
  const r = reportSums({ ...PHONE(), speed: card }, { site: 'live' });
  check('8. a report with a card: its speed key is the model, the class and the build',
    r && r.speed && r.speed.key === '1|7|' + KEY + '|5122', r && r.speed);
  check('8. ...and its sums: [runs, fps, p50, p95, work, runs with no work] a step',
    r && same(r.speed.sums.all, [1, 60, 17, 18, 2, 0]) && same(r.speed.sums.noshadow, [1, 60, 17, 17, 0, 1]) && r.speed.sums.n === 1, r && r.speed.sums);
  const bad = (sp) => speedSums(sp, KEY, 5122);
  check('8. a card off its shape is dropped whole: a model past the list, a step off it or twice, a fraction, a short row',
    bad({ model: SPEED_MODELS_N, rows: card.rows }) === null && bad({ model: 1, rows: [['warp', 1, 1, 1, 1]] }) === null
      && bad({ model: 1, rows: [['all', 1, 1, 1, 1], ['all', 2, 2, 2, 2]] }) === null && bad({ model: 1, rows: [['all', 1.5, 1, 1, 1]] }) === null
      && bad({ model: 1, rows: [['all', 1, 1, 1]] }) === null && bad({ model: 'iPhone', rows: card.rows }) === null && bad(null) === null);
  check('8. ...and the report itself still counts', reportSums({ ...PHONE(), speed: { model: 99, rows: [] } }, {}).speed === null);
  /* through the room */
  const S = room.sessions.get(A);
  clock += REPORT.PACE_MS;
  check('8. through the room: taken', room._reportTake(S, { ...PHONE(), speed: card }, clock) === 'ok');
  if (room._daybook && room._daybook.putting) await room._daybook.putting;
  const r2 = await bookRead(room, 1);
  const sp = r2.days[0] && r2.days[0].speed;
  check('8. ...into the book\'s `speed` part', sp && sp['1|7|' + KEY + '|5122'] && sp['1|7|' + KEY + '|5122'].n === 1, sp);
}

/* ── 9. THE ONE ADMIN ROUTE, AND THE TABLE ── */
{
  const json = (o, status) => new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json' } });
  const res = await room._devFetch(new Request('http://x/dev/daybook?days=1'), '/dev/daybook', json);
  const body = res ? await res.json() : null;
  check('9. GET /dev/daybook reads the book: the day\'s `dev` and `speed` parts', body && body.ok && body.days.length === 1
    && Object.keys(body.days[0].dev).length >= 1 && Object.keys(body.days[0].speed).length >= 1, body);
  const text = bookTableText(body ? body.days : []);
  /* v2.3.5127 (sitting 4): the smaller cell as the owner reads it */
  check('9. the table reads the smaller cell: places as a map, the line\'s means, holds by name',
    /\n  where \(seen secs\) town \d+\n/.test(text) && /\n  line mean ms: delay \d+(\.\d)?, waver \d+(\.\d)?\n/.test(text)
      && /\n  holds \(name: times, ms in all\) body-bake \d+x \d+ms; screen-check \d+x \d+ms\n/.test(text) && !/bins <25|near bins/.test(text), text.slice(0, 1200));
  check('9. the table as text: the cell, its gaps, the model\'s name and each step\'s means',
    text.includes('1|' + KEY + '|full|none|5122') && /gaps 0 0 0 0 0 0 0 0 0 \d+/.test(text) && text.includes('(iPhone 14 Pro or Pro Max)')
      && /\n  all  60 17 18 2\n/.test(text) && /noshadow  60 17 17 0  \(work not measured in 1\)/.test(text), text.slice(0, 900));
  check('9. nothing of a player in the route\'s answer or the table', !/bp_rep|Repo|Offy|203\.0\.113/.test(JSON.stringify(body) + text));
  check('9. an empty book is a table that says so', /0 cell\(s\)/.test(bookTableText([{ day: '20270101', dev: {}, speed: {} }])) && bookTableText(null).length > 0);
}

/* ── 10. THE GATEKEEPER'S REVIEW (v2.3.5127, sitting 3) ── */
{
  /* (1) the first frame after a hidden spell spans the spell: not a freeze */
  const a = blankBins(0);
  const frames = [];
  let t = 1000;
  for (let i = 0; i < 30; i++) { t += 16.7; frames.push({ t, totalMs: 16.7, workMs: 3, others: 2 }); }
  const backAt = t + 40000;   /* hidden 40 s, back in view at backAt */
  t = backAt + 5; frames.push({ t, totalMs: t - frames[frames.length - 1].t, workMs: 3, others: 2 });
  for (let i = 0; i < 10; i++) { t += 16.7; frames.push({ t, totalMs: 16.7, workMs: 3, others: 3 }); }
  const out = addFrames(a, frames, 0, [backAt], null);
  check('10.1 the first frame after a hidden spell is not counted (no freeze in the bins); the rest are',
    a.drawn === 40 && a.gaps[GAP_BINS - 1] === 0 && a.gaps[gapBin(16.7)] === 40 && out.lastT === t && a.near === 3, { drawn: a.drawn, gaps: a.gaps });
  const b = blankBins(0);
  addFrames(b, frames, 0, [], null);
  check('10.1 ...and without the return\'s mark it would have been one (the fault, shown)', b.drawn === 41 && b.gaps[GAP_BINS - 1] === 1);
  /* (2) the switch back on: a fresh report, nothing of the time it was off */
  const ph = readFileSync(new URL('../../src/debug/report.js', import.meta.url), 'utf8');
  check('10.2 the switch turned off throws the open report away, and the poll starts a fresh one from the rings\' newest',
    /export function setReportOn[\s\S]{0,600}?\n {2}_a = null;\n\}/.test(ph) && /if \(!_a\) _restart\(now\);/.test(ph)
      && /function _restart\(now\) \{\s*_reset\(now\);[\s\S]{0,200}_lastFrameT = fr\[fr\.length - 1\]\.t;[\s\S]{0,80}_lastHoldT = ex\[ex\.length - 1\]\.t;/.test(ph));
  /* (3) the build is the worker's call */
  const live = reportSums(PHONE(), { site: 'live' }), prev = reportSums(PHONE(), { site: 'preview' }), none = reportSums(PHONE(), {});
  check('10.3 the build in a cell: the page\'s on the game\'s own site, `preview` anywhere else',
    live.cell.endsWith('|5122') && prev.cell.endsWith('|preview') && none.cell.endsWith('|preview'), [live.cell, prev.cell]);
  const many = new Set();
  for (let bld = 4000; bld < 4100; bld++) many.add(reportSums({ ...PHONE(), build: bld }, { site: 'preview' }).cell);
  check('10.3 a hundred preview builds make one cell, not a hundred', many.size === 1);
  check('10.3 the site from the Origin: brotown.net (and www.) live; a preview, a local page, a look-alike or none, preview',
    reportSiteOf('https://brotown.net') === 'live' && reportSiteOf('https://www.brotown.net') === 'live'
      && reportSiteOf('https://abc123.gamedev-aix.pages.dev') === 'preview' && reportSiteOf('http://localhost:5173') === 'preview'
      && reportSiteOf('https://gamedev-aix.pages.dev') === 'live' && reportSiteOf('https://claude-x.gamedev-aix.pages.dev') === 'preview'   /* v2.3.5127, sitting 4: production's Pages name is live */
      && reportSiteOf('https://brotown.net.evil.com') === 'preview' && reportSiteOf(null) === 'preview' && reportSiteOf('not a url') === 'preview');
  /* (4) hidden time is not play time */
  const h = reportSums({ ...PHONE(), secs: 300, seen: 30, drawn: 105 }, { site: 'live' });
  check('10.4 a report of 300 s with 30 seen: 30 is the time played and the time in its place, 300 the time covered',
    h && h.sums.seen === 30 && h.sums.secs === 300 && h.sums.where.town === 30, h && h.sums);
  check('10.4 seen past secs, or none, drops the report; frames past the seen time drop the frames',
    reportSums({ ...PHONE(), seen: 47 }, {}) === null && reportSums({ ...PHONE(), seen: undefined }, {}) === null
      && !('gaps' in reportSums({ ...PHONE(), secs: 300, seen: 1, drawn: 600, gaps: [0, 0, 0, 0, 0, 0, 0, 0, 0, 600] }, {}).sums));
  check('10.4 the phone sends a report only with MIN_SECS seen', /const ok = r\.seen >= REPORT\.MIN_SECS/.test(ph));
}
{
  /* (5) a report is not the player's input: the AFK clock stands */
  const S = room.sessions.get(A);
  S.lastRecv = clock - 90000;
  const was = S.lastRecv;
  clock += REPORT.PACE_MS;
  await send(A, PHONE());
  check('10.5 a report leaves the AFK clock where it was (an idle tab is still let go of)', S.lastRecv === was, { was, now: S.lastRecv });
  /* (6) near: the near circle's */
  const rf = readFileSync(new URL('../../src/game/renderFrame.js', import.meta.url), 'utf8');
  check('10.6 the frame\'s `others` (the report\'s `near`) counts only this zone\'s players within the near circle',
    /others: nearOthers\(S\)/.test(rf) && /r2 = QUIET\.NEAR_R \* QUIET\.NEAR_R/.test(rf) && /p\.zone !== z/.test(rf) && /dx \* dx \+ dy \* dy > r2/.test(rf));
}

/* ── 11. SITTING 4'S REVIEW (v2.3.5127) ── */
{
  /* a socket's reports reach at most two cells */
  const ws = await join('bp_rep_cells', 'Celly');
  const S = room.sessions.get(ws);
  const cls = (over) => ({ ...PHONE(), devClass: { ...PHONE().devClass, ...over } });
  const take = (m) => { clock += REPORT.PACE_MS; return room._reportTake(S, m, clock); };
  const a = take(cls({})), b = take(cls({ hz: 120 })), c = take(cls({ hz: 60 })), d = take(cls({}));
  check('11.1 a socket\'s reports reach at most two cells (its rate settling, a window resized), then the third is refused',
    a === 'ok' && b === 'ok' && c === 'cells' && d === 'ok' && REPORT.CELLS_A_SOCKET === 2, [a, b, c, d]);
  /* died: the socket's first report only */
  const ws2 = await join('bp_rep_died', 'Diedy');
  const S2 = room.sessions.get(ws2);
  const dev0 = async () => { const dd = await devPart(); return (dd && dd['1|' + KEY + '|full|none|5122'] && dd['1|' + KEY + '|full|none|5122'].died) || [0, 0, 0]; };
  const before = (await dev0()).slice();
  clock += REPORT.PACE_MS; room._reportTake(S2, { ...PHONE(), died: ['killed', 200, 9, 0, 'ember'] }, clock);
  clock += REPORT.PACE_MS; room._reportTake(S2, { ...PHONE(), died: ['killed', 200, 9, 0, 'ember'] }, clock);
  const after = await dev0();
  check('11.2 `died` counts once a socket: its first report, not a second that says it again', after[1] - before[1] === 1, { before, after });
  /* the phone: a thaw, and the other tab's switch */
  const ph = readFileSync(new URL('../../src/debug/report.js', import.meta.url), 'utf8');
  check('11.3 a poll far past its time (a page frozen with no word) marks a return and takes the spell off the seen time; `pageshow` marks one too',
    /const late = now - a\.lastPoll - REPORT\.POLL_MS;\s*if \(late > REPORT\.THAW_MS && _visSince != null\) \{\s*_markShow\(_lastPollP \+ REPORT\.POLL_MS\);\s*a\.seenMs -= /.test(ph)
      && /addEventListener\('pageshow', _onVisibility\)/.test(ph));
  check('11.4 switched off anywhere (another tab\'s switch), the open report is thrown away at the poll', /if \(!reportOn\(\)\) \{ _a = null; return; \}/.test(ph));
}

/* ── 12. THE SPEED CARD'S OWN CAP AND SWITCH (v2.3.5127, sitting 4's review) ── */
{
  check('12.1 `reportspeed` is a name POST /flags takes', flagNameOk('reportspeed'));
  room._liveFlags = { reportspeed: false };
  const ws = await join('bp_rep_spd', 'Speedy');
  const sync = ws.sent.find((m) => m.type === 'state_sync');
  check('12.1 `reportspeed: false`: a join is told caps.report 1 (the reports, not the card)', sync && sync.caps && sync.caps.report === 1, sync && sync.caps && sync.caps.report);
  const S = room.sessions.get(ws);
  const card = { model: 3, rows: [['all', 60, 17, 18, 2]] };
  const spKey = '1|3|' + KEY + '|5122';
  const spN = async () => { if (room._daybook && room._daybook.putting) await room._daybook.putting; const r = await bookRead(room, 1); const sp = r.days[0] && r.days[0].speed; return (sp && sp[spKey] && sp[spKey].n) || 0; };
  const devN = async () => { const dd = await devPart(); return (dd && dd['1|' + KEY + '|full|none|5122'] && dd['1|' + KEY + '|full|none|5122'].n) || 0; };
  const sp0 = await spN(), dv0 = await devN();
  clock += REPORT.PACE_MS;
  const why = room._reportTake(S, { ...PHONE(), speed: card }, clock);
  check('12.2 ...and a card that still comes is dropped, the report itself counted', why === 'ok' && (await spN()) === sp0 && (await devN()) === dv0 + 1, { why, sp0, dv0 });
  room._liveFlags = {};
  clock += REPORT.PACE_MS;
  room._reportTake(S, { ...PHONE(), speed: card }, clock);
  check('12.2 switched back on: the card is taken again', (await spN()) === sp0 + 1);
  room._liveFlags = { report: false, reportspeed: true };
  check('12.1 `report: false` wins: no cap at all', room._reportCap() === undefined);
  room._liveFlags = {};
  /* the phone: only to a worker that takes it, and the card says why not */
  check('12.3 the phone sends the card only to caps.report 2 (takesSpeed)',
    takesSpeed({ _serverCaps: { report: 2 } }) && !takesSpeed({ _serverCaps: { report: 1 } }) && !takesSpeed({ _serverCaps: {} }) && !takesSpeed(null));
  const ph = readFileSync(new URL('../../src/debug/report.js', import.meta.url), 'utf8');
  check('12.3 ...the card waits for one (never put on a report to a worker without it, never cleared by that send)',
    /if \(_speed && takesSpeed\(_S\)\) r\.speed = /.test(ph) && /if \(!reportOn\(\) \|\| !takesSpeed\(_S\)\) return false;/.test(ph)
      && queueSpeedCard({ rows: [{ k: 'all', fps: 60, p50: 16, p95: 18, work: 2 }] }) === false);
  const st = readFileSync(new URL('../../src/game/speedTest.js', import.meta.url), 'utf8');
  check('12.3 ...and the Speed card tells the player it was not sent, and why', /r\.unsent === 'server' \? 'Not sent: the game\\'s server does not take Speed cards right now\.'/.test(st));
}

/* ── 13. CARD O'S LANES (v2.3.5221) ── */
{
  const lane = (l, over) => ({ ...PHONE(), drawLane: l, ...(over || {}) });
  const cellOf = (r) => r && r.cell;
  /* 13.1 the cap and its switch's name */
  check('13.1 `reportlanes` is a name POST /flags takes', flagNameOk('reportlanes'));
  check('13.1 caps.report is 3 with nothing thrown', room._reportCap() === 3);
  /* 13.2 thirty and light in their own cells */
  const t = reportSums(lane('thirty'), { lanes: true }), l = reportSums(lane('light'), { lanes: true }), f = reportSums(lane('full'), { lanes: true });
  check('13.2 `thirty` and `light` each make a cell of their own, beside `full`\'s',
    cellOf(t) === '1|' + KEY + '|thirty|none|preview' && cellOf(l) === '1|' + KEY + '|light|none|preview' && cellOf(f) === '1|' + KEY + '|full|none|preview',
    [cellOf(t), cellOf(l), cellOf(f)]);
  const ws = await join('bp_rep_lane', 'Lanie');
  const S = room.sessions.get(ws);
  clock += REPORT.PACE_MS;
  const why = room._reportTake(S, lane('thirty'), clock);
  const dev = await devPart();
  check('13.2 ...through the room: a `thirty` report is in the book in its own cell', why === 'ok' && dev['1|' + KEY + '|thirty|none|5122'] && dev['1|' + KEY + '|thirty|none|5122'].n === 1, { why, keys: Object.keys(dev) });
  /* 13.3 an unknown lane */
  check('13.3 a lane off the list is dropped, lanes taken or not', reportSums(lane('lite'), { lanes: true }) === null && reportSums(lane('30'), { lanes: true }) === null && reportSums(lane(30), { lanes: true }) === null);
  /* 13.5 rung and self (card O's PRs 2 and 14: learned now, one deploy for the card) */
  const rs = reportSums(lane('full', { rung: [4, 30], self: ['sheen', 'water', 'sheen', 'DROP TABLE'] }), { lanes: true });
  check('13.5 `rung` sums beside the cell: [reports with one, the most rungs, seconds below]', rs && same(rs.sums.rung, [1, 4, 30]), rs && rs.sums.rung);
  check('13.5 `self`: each program of the list once, free text dropped', rs && same({ ...rs.sums.self }, { sheen: 1, water: 1 }), rs && rs.sums.self);
  const bad = (over) => reportSums(lane('full', over), { lanes: true }).sums;
  check('13.5 a rung past the worker\'s bound, or more seconds below than the report covers, or a fraction, is dropped (the report counts)',
    !('rung' in bad({ rung: [RUNG.MAX + 1, 0] })) && !('rung' in bad({ rung: [1, 47] })) && !('rung' in bad({ rung: [1.5, 2] })) && !('rung' in bad({ rung: [1] })) && bad({ rung: [99, 0] }).n === 1);
  check('13.5 a `self` of no program on the list, or longer than the list, is dropped',
    !('self' in bad({ self: ['bt-one-batch'] })) && !('self' in bad({ self: new Array(SELF_PROGRAMS.length + 1).fill('one') })) && !('self' in bad({ self: 'one' })));
  check('13.5 the worker\'s lists are card O\'s: the programs, and a rung bound over the page\'s ladder',
    same(SELF_PROGRAMS, PROGRAM_NAMES) && ladderDepth() <= RUNG.MAX, { here: SELF_PROGRAMS, phone: PROGRAM_NAMES, depth: ladderDepth(), max: RUNG.MAX });
  /* 13.4 the kill switch */
  room._liveFlags = { reportlanes: false };
  const ws2 = await join('bp_rep_nolane', 'Nolan');
  const sync = ws2.sent.find((m) => m.type === 'state_sync');
  check('13.4 `reportlanes: false`: a join is told caps.report 2', sync && sync.caps && sync.caps.report === 2, sync && sync.caps && sync.caps.report);
  const S2 = room.sessions.get(ws2);
  clock += REPORT.PACE_MS;
  const w1 = room._reportTake(S2, lane('light'), clock);
  clock += REPORT.PACE_MS;
  const w2 = room._reportTake(S2, lane('full'), clock);
  check('13.4 ...a lane other than `full` is dropped; `full` is taken', w1 === 'bad' && w2 === 'ok', [w1, w2]);
  const off = reportSums(lane('full', { rung: [4, 30], self: ['sheen'] }), { lanes: false });
  check('13.4 ...and `rung` and `self` are dropped from a report that still comes', off && !('rung' in off.sums) && !('self' in off.sums) && off.sums.n === 1, off && off.sums);
  room._liveFlags = { reportspeed: false };
  check('13.4 `reportspeed: false` is 1, and takes no lane either', room._reportCap() === 1 && reportSums(lane('thirty'), { lanes: room._reportCap() >= 3 }) === null);
  room._liveFlags = {};
  /* 13.6 the phone */
  check('13.6 the phone sends a lane but `full` only to caps.report 3 (takesLanes)',
    takesLanes({ _serverCaps: { report: 3 } }) && !takesLanes({ _serverCaps: { report: 2 } }) && !takesLanes({ _serverCaps: {} }) && !takesLanes(null));
  const ph = readFileSync(new URL('../../src/debug/report.js', import.meta.url), 'utf8');
  check('13.6 ...and `full`, as every page before lanes, to a worker below 3', /drawLane: takesLanes\(_S\) \? drawLane\(cls\) : 'full'/.test(ph));
}

/* ── 14. THE GOVERNOR'S ONE VERDICT (v2.3.5222) ── */
{
  const frames = (gaps) => { let t = 1000; return gaps.map((g) => { t += g; return { t, totalMs: g, workMs: 4, simMs: 1, tileMs: 1, entityMs: 1, effectsMs: 0, fpsMs: 0, appMs: 1 }; }); };
  /* a 60 screen: frames of one refresh, and of two (33 ms: late), and of three */
  const a60 = blankBins(0);
  addFrames(a60, frames([16.7, 16.7, 33.3, 16.7, 50, 16.7]), 0, [], { refresh: 1000 / 60, every: 1 });
  check('14.1 at 60 a second the report has `late` now: the frames more than half a refresh past theirs (two of six), by the pacer\'s rule',
    a60.judged === 6 && a60.late === 2 && lateOver(1000 / 60, 1) === 25, { judged: a60.judged, late: a60.late });
  check('14.1 ...and its `split` with it (the late frames\' own work, and the rest outside)', a60.split[0] === 2 && a60.split[6] === 33.3 + 50 - 8, a60.split);
  const a30 = blankBins(0);
  addFrames(a30, frames([33.3, 66.7, 33.3]), 0, [], { refresh: 1000 / 30, every: 1 });
  check('14.2 at 30 a second too (Low Power Mode): a missed refresh is late', a30.judged === 3 && a30.late === 1, { judged: a30.judged, late: a30.late });
  const ax = blankBins(0);
  addFrames(ax, frames([400, 600, 500]), 0, [], { refresh: null, every: 1 });
  check('14.2 ...and absent where the pacer knows no refresh (the QA box\'s few frames a second)', ax.judged === 0 && ax.drawn === 3);
  const ph = readFileSync(new URL('../../src/debug/report.js', import.meta.url), 'utf8');
  check('14.1 one rule, never a copy: the report imports the pacer\'s lateOver and writes no lateness of its own',
    /import \{ PACE_BREAK_MS, lateOver \} from '\.\.\/game\/framePacer\.js';/.test(ph) && /const lateMs = judging \? lateOver\(pace\.refresh, pace\.every \|\| 1\) : Infinity;/.test(ph) && !/refresh \/ 2/.test(ph));
  check('14.3 the governor\'s `rung` goes to a worker that takes lanes alone: [the most rungs taken, the seconds seen below the row]',
    /if \(takesLanes\(_S\)\) r\.rung = \[_w\(a\.rungMax\), Math\.min\(secs, _w\(a\.belowMs \/ 1000\)\)\];/.test(ph) && /if \(depth > 0\) a\.belowMs \+= seenD;/.test(ph) && blankBins(0).rungMax === 0);
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
