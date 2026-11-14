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
 *      `delay` and `waver` binned from the session, never the message;
 *   7. THE BOOK'S ROOM: one cell with every field, against the part's line
 *      (daybook.js PART_BYTES), so a day holds several devices and builds;
 *  10. v2.3.5127, THE GATEKEEPER'S REVIEW (sitting 3), a test each: the
 *      first frame after a hidden spell is not a freeze; the switch back on
 *      sends nothing of the time it was off; the build in a cell is the
 *      worker's call (a preview is `preview`); hidden time is not play time;
 *      a report is not the player's input (the AFK clock); `near` is the
 *      near circle's.
 *
 * BREAK PROOF (rule 8), each tried by hand, 2026-11-14:
 *   2. report.js: drop `!HOLD_NAMES.includes(name) ||`          -> FAIL 2
 *   3. report.js: `tree[session.id + '|' + r.cell] = r.sums`      -> FAIL 3
 *   4. report.js: `PACE_MS: 0`                                    -> FAIL 4
 *   5. join.js: `report: 1,` in place of the method's answer      -> FAIL 5
 *  10. src/debug/report.js addFrames: drop `if (spansShow) continue;` -> FAIL 10
 *      report.js: `(o.site === 'live' ? build : 'preview')` as `build` -> FAIL 10
 *      index.js: `msg.type === 'pong'` alone (a report stamps the AFK clock) -> FAIL 10
 */
import { readFileSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { REPORT, DEV_CLASS, SAVERS, WHERE, GAP_BINS, HOLD_NAMES as W_HOLDS, DRAW_LANES, DELAY_EDGES, WAVER_EDGES,
  reportSums, swCell, holdKey, classOfReport, rttWaverNext, reportSiteOf } from '../src/report.js';
import { DAYBOOK, bookBytes, bookRead } from '../src/daybook.js';
import { flagNameOk } from '../src/liveops.js';
import { DEV_CLASS as P_CLASS } from '../../src/game/deviceProfile.js';
import { CLIENT_SAVERS } from '../../src/game/clientOff.js';
import { HOLD_NAMES as P_HOLDS } from '../../src/debug/holdNames.js';
import { WHERE as P_WHERE, GAP_EDGES, DRAW_LANE, takesReports, gapBin, whereOf, buildOf, addFrames, blankBins } from '../../src/debug/report.js';

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
  check('1. the lane is the phone\'s one', same(DRAW_LANES, [DRAW_LANE]));
  check('1. every hold name makes a key the day\'s book takes', W_HOLDS.every((n) => /^[A-Za-z0-9_.:|,+=-]+$/.test(holdKey(n, 'town')) && holdKey(n, 'town').length <= DAYBOOK.KEY_MAX));
  check('1. the phone\'s where: a dungeon, the farm, a region of the world, else other',
    whereOf('dungeon:x', null) === 'dungeon' && whereOf('farm_home', null) === 'farm' && whereOf('wheel', 'ember') === 'ember' && whereOf('wheel', 'sea') === 'other' && whereOf('town', 'town') === 'other');
  check('1. the phone\'s build: the N of 2.3.N', buildOf('2.3.5123') === 5123 && buildOf('dev') === 0);
  check('1. the phone sends only to a worker that says caps.report', takesReports({ _serverCaps: { report: 1 } }) && !takesReports({ _serverCaps: {} }) && !takesReports(null));
}

/* ── 2. THE CHECKS ── */
{
  const r = reportSums(PHONE(), { delay: 80, waver: 12, site: 'live' });
  check('2. a phone\'s report makes its cell: the shape, the class\'s key, the lane, the switches, the build',
    r && r.cell === '1|' + KEY + '|full|none|5122', r && r.cell);
  const s = r && r.sums;
  check('2. ...and its sums: one report, its seconds, its gaps, where it was, the near bin, memory, lost, died',
    s && s.n === 1 && s.secs === 46 && same(s.gaps, [0, 0, 0, 0, 0, 0, 0, 0, 0, 105]) && s.where[WHERE.indexOf('town')] === 46
      && same(s.near, [0, 1, 0, 0, 0, 0]) && same(s.mem, [47, 54, 18]) && same(s.lost, [0, 0]) && same(s.died, [1, 0, 0]), s);
  check('2. the holds by name and place: [count, ms, near]', s && same(s.holds[holdKey('body-bake', 'other')], [1, 115, 0]) && same(s.holds[holdKey('screen-check', 'town')], [1, 91, 1]), s && s.holds);
  check('2. the worker\'s own delay and waver, binned', s && same(s.delay, [0, 0, 1, 0, 0, 0, 0]) && same(s.waver, [0, 0, 1, 0, 0, 0]), s && [s.delay, s.waver]);
  check('2. no late where the pacer gave no verdict, and no split', s && !('late' in s) && !('split' in s));
  check('2. the seen seconds are the time played (v2.3.5127); `drawn` is the card\'s, not added', s && s.seen === 46 && !('drawn' in s));

  const drop = (mut) => { const m = PHONE(); mut(m); return reportSums(m, {}); };
  check('2. no cell, no report: a class off its list (a chip\'s name in a field)', drop((m) => { m.devClass.gl = 'Apple GPU'; }) === null);
  check('2. ...a class missing a field', drop((m) => { delete m.devClass.cores; }) === null && classOfReport(null) === null);
  check('2. ...a lane off its list', drop((m) => { m.drawLane = 'lite'; }) === null);
  check('2. ...a build that is not a whole number', drop((m) => { m.build = '5122'; }) === null && drop((m) => { m.build = 1e9; }) === null);
  check('2. ...no seconds, or past a day', drop((m) => { m.secs = 0; }) === null && drop((m) => { m.secs = REPORT.SECS_MAX + 1; }) === null);
  check('2. ...another shape number', drop((m) => { m.v = 2; }) === null);
  const f = (mut) => { const m = PHONE(); mut(m); return reportSums(m, {}).sums; };
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
      s2.holds && Object.keys(s2.holds).length === 1 && same(s2.holds[holdKey('gc', 'town')], [2, 50, 3]) && Object.getPrototypeOf(s2.holds) === null, s2.holds);
    check('2. ...free text as a name reaches nothing', !('holds' in f((m) => { m.holds = [['DROP TABLE', 50, 'town', 0], ['body-bake jog-east', 40, 'town', 0]]; })));
    const many = f((m) => { m.holds = new Array(40).fill(['gc', 5, 'town', 0]); });
    check('2. at most five holds are read', many.holds[holdKey('gc', 'town')][0] === REPORT.HOLDS_MAX);
  }
  check('2. free text where a place goes is dropped (no `where`)', !('where' in f((m) => { m.where = 'my house'; })));
  check('2. memory past its line, or not three numbers, is dropped', !('mem' in f((m) => { m.mem = [1, 2, 99999]; })) && !('mem' in f((m) => { m.mem = [1, 2]; })));
  check('2. the switches: none, the one saver, or many; an id off the list is dropped',
    swCell([]) === 'none' && swCell(['onecopy']) === 'onecopy' && swCell(['onecopy', 'viewcap']) === 'many' && swCell(['onecopy', 'rm -rf', '__proto__']) === 'onecopy' && swCell('onecopy') === 'none');
  {
    const k = f((m) => { m.died = ['killed', 230, 14, 1, 'ember']; });
    check('2. a page that died: its kind, its numbers and where', same(k.died, [0, 1, 0]) && same(k.diedMem, [230, 14, 1]) && k.diedAt[WHERE.indexOf('ember')] === 1, k);
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
  check('3. a join is told caps.report', sync && sync.caps && sync.caps.report === 1, sync && sync.caps && sync.caps.report);
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
  const r = reportSums({ ...PHONE(), delay: 1, waver: 1 }, { delay: 260, waver: 3 });
  check('6. delay and waver are the session\'s, never the message\'s', same(r.sums.delay, [0, 0, 0, 0, 0, 1, 0]) && same(r.sums.waver, [1, 0, 0, 0, 0, 0]), [r.sums.delay, r.sums.waver]);
  check('6. their bins', DELAY_EDGES.length + 1 === 7 && WAVER_EDGES.length + 1 === 6);
}

/* ── 7. THE BOOK'S ROOM ── */
{
  const m = PHONE();
  m.late = [40, 900]; m.split = [100, 20, 30, 40, 5, 60, 900, 700, 200];
  m.split = m.split.slice(0, 8);
  m.holds = [['body-bake', 115, 'town', 3], ['strip-made', 20, 'ember', 1], ['other: BT_AUDIO$1._fold > foldToMono', 19, 'farm', 0], ['screen-check', 30, 'commons', 0], ['gc', 40, 'frost', 9]];
  m.died = ['killed', 230, 14, 1, 'ember'];
  const r = reportSums(m, { delay: 80, waver: 12, site: 'live' });
  const tree = { [r.cell]: r.sums };
  const bytes = bookBytes(tree);
  const cells = Math.floor(DAYBOOK.PART_BYTES / bytes);
  console.log(`     one cell with every field: ${bytes} bytes as the book reckons it; the part holds ${cells} such a day`);
  check('7. a cell with every field leaves room for at least six cells a day (devices times builds)', cells >= 6, { bytes, cells });
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
      && reportSiteOf('https://brotown.net.evil.com') === 'preview' && reportSiteOf(null) === 'preview' && reportSiteOf('not a url') === 'preview');
  /* (4) hidden time is not play time */
  const h = reportSums({ ...PHONE(), secs: 300, seen: 30, drawn: 105 }, { site: 'live' });
  check('10.4 a report of 300 s with 30 seen: 30 is the time played and the time in its place, 300 the time covered',
    h && h.sums.seen === 30 && h.sums.secs === 300 && h.sums.where[WHERE.indexOf('town')] === 30, h && h.sums);
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

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
