/* ═══ v2.3.6309 (card RR PR 4): A GAP THE SOCKET CARRIED IS NOT A FREEZE ═══
 * (src/game/thawCarried.js; wsClient.js's alive timer)
 *
 * A page that misses the alive timer's beats for over 5 s was rejoined on
 * every such gap, so a slow device rejoined forever.  Now a gap is a freeze
 * only if the worker's pings from inside it did not all arrive:
 *   1. a slow page's gap, every ping inside it handled late: carried;
 *   2. a gap with its pings missing (the network slept): not carried, so the
 *      rejoin stands; one ping short of the count: not carried;
 *   3. no ping clock yet, or a gap of nothing: not carried (the old rule);
 *   4. the worker's clock offset maps its times onto the page's: pings sent
 *      before or after the gap are not counted;
 *   5. the count wanted: one ping a THAW.PING_MS, less one at an edge, at
 *      least one;
 *   6. the page wires it (wsClient.js, its SYNTAX TREE: tools/guards/lib/
 *      renderTables.mjs's babel): one judge on the worker's clock, each
 *      ping's time handed to it, and the decision NOT in wsClient: the alive
 *      timer's one thawBeat call (its resume handing the judge's gap and
 *      verdict straight to _resumeRecover), the open socket's one thawResume
 *      call (its own `carried`, untouched, and the rejoin its effect);
 *      `?thawjudge=0` judges nothing: every gap rejoins at once, main's path
 *      as before (the planning session, sitting 54's note);
 *   7. the judge: once, a beat on, on the offset as found; off; no clock;
 *   8. the road PLAYED (sitting 57's hold: "nothing plays pings missing ->
 *      the gap handed on -> _forceRejoin"): a page of beats on a fake clock,
 *      fake pings, thawBeat and thawResume as wsClient wires them, a spy for
 *      the rejoin: a gap carried, none; pings missing, exactly one, a beat
 *      on; a slow page's many gaps; the kept list's cap; the switch off; a
 *      short gap.
 *   9. the PAGE'S OWN CODE played (sitting 58's hold: §8 plays a copy of
 *      _resumeRecover, so a return planted before the real thawResume stayed
 *      green): the alive timer's body and _resumeRecover, lifted from
 *      wsClient's tree and RUN in one closure of stubs on a fake clock; what
 *      they DO is watched (the rejoins, the connects, the canvas check, the
 *      GL probe): a carried gap kept, the rest of the return still run;
 *      pings missing, one rejoin a beat on; a slow page; the switch off; a
 *      hidden tab; a short return; a hung-up page; a dead socket.
 *   v2.3.6311 (sitting 59's hold: no uncarried gap of 5 to 12 s was played,
 *      so a floor under 12 s was unseen): §8 and §9 play every gap of 4 to
 *      12 s on both sides of RESYNC_AWAY_MS, carried and not; a return iOS
 *      told of at the line and a millisecond past it; the dead pipe watched by
 *      the beats after the thaw's say (a page beating every 1 s and every
 *      3 s); §3, §4 and §7 the edges a mutation pass found unkilled (a 1 ms
 *      gap, a ping at the gap's very end, a ping time that is not a number,
 *      the probe's last verdict and window.__btThaw, thawResume's returns).
 * BREAK PROOF (rule 8), tried by hand once: thawCarried returning true for
 * an unknown clock -> FAIL 3; sitting 57's three plants and card LF's two
 * (the PR's "Plants"): every verdict made carried after due() -> FAIL 8;
 * the rejoin behind `carried` -> FAIL 8 (in wsClient's if: FAIL 6); KEEP's
 * shift dropped -> FAIL 8; `?thawjudge=0` noting instead of rejoining at
 * once -> FAIL 8; the ping not handed to the judge -> FAIL 6.
 * Sitting 58's (card LF, by hand, a scratch copy of wsClient, each -> FAIL 9):
 * `if (tag === 'thaw') return;` before thawResume; `_awayMs =
 * Math.min(_awayMs, _frozenMs)` before it; `Math.max(_hiddenMs, _frozenMs)`
 * with `awayMs || 0` dropped; `if (gap < 60000) gap = 0;` before thawBeat;
 * `visible`'s `&&` made `||`; and LF's own three: `&& tag !== 'thaw'` on the
 * status gate, `if (arguments[2]) return;` atop _resumeRecover (a carried
 * thaw skipping the canvases), `tag === 'thaw' ? 0 : (awayMs || 0)`.
 * Sitting 59's (card LF, v2.3.6311, each -> FAIL 8 and/or 9): a floor of
 * 10 s on an uncarried gap in thawResume, in due(), in thawBeat, before
 * wsClient's thawResume and in the timer's resume; LF's three not designed
 * for: the count wanted lowered under 12 s, `?thawjudge=0` handing its gap
 * on as carried, the gap's window widened back by a ping.  A mutation pass
 * over every line #2273 added in thawCarried.js and wsClient.js (each
 * number changed, condition negated, line deleted; 118 mutants, this suite
 * only) kills all but six equivalents (the PR's words).
 */
import { readSystem } from '../../tools/guards/lib/filesOf.mjs';
import { babel } from '../../tools/guards/lib/renderTables.mjs';
import { THAW, thawCarried, thawPingsWanted, makeThawJudge, thawBeat, thawResume } from '../../src/game/thawCarried.js';

let passed = 0, failed = 0;
const check = (name, ok, detail) => {
  if (ok) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail))); }
};

const OFF = 1234567;   /* worker clock minus the page's */
const pingsEvery = (fromPage, toPage, every) => {
  const out = [];
  for (let t = fromPage + every; t <= toPage; t += every) out.push(t + OFF);
  return out;
};

// ── 1. a slow page: every ping of the gap came ──
{
  const from = 100000, to = from + 12000;
  const pings = pingsEvery(from - 6000, to + 2000, 2000);
  check('1. a 12 s gap with a ping every 2 s, all handled late: carried', thawCarried(from, to, pings, OFF, true), { pings: pings.length });
  const slow = pingsEvery(from, to, 3300);
  check('1. ...and with the worker running late (a ping every 3.3 s): carried', thawCarried(from, to, slow, OFF, true), { n: slow.length, want: thawPingsWanted(to - from) });
  check('1. a 5.5 s gap with one ping in it: carried', thawCarried(0, 5500, [3000 + OFF], OFF, true));
}

// ── 2. a frozen socket: its pings missing ──
{
  const from = 100000, to = from + 30000;
  const before = pingsEvery(from - 10000, from, 2000);
  check('2. a 30 s gap with no ping inside it: not carried (the rejoin stands)', !thawCarried(from, to, before, OFF, true));
  const want = thawPingsWanted(to - from);
  const short = pingsEvery(from, to, 2000).slice(0, want - 1);
  check(`2. ...one ping short of the ${want} wanted: not carried`, !thawCarried(from, to, short, OFF, true), { n: short.length, want });
  check('2. ...exactly the count: carried', thawCarried(from, to, pingsEvery(from, to, 2000).slice(0, want), OFF, true));
}

// ── 3. no clock, no gap ──
{
  const pings = pingsEvery(0, 20000, 2000);
  check('3. no ping clock known yet: not carried (the old rule: rejoin)', !thawCarried(0, 20000, pings, OFF, false));
  check('3. a gap of nothing (or backwards): not carried', !thawCarried(5000, 5000, pings, OFF, true) && !thawCarried(6000, 5000, pings, OFF, true));
  check('3. no list, or a bad offset: not carried', !thawCarried(0, 20000, null, OFF, true) && !thawCarried(0, 20000, pings, NaN, true));
  /* v2.3.6311: the shortest gap there is, its one ping at its end, is a gap like any other */
  check('3. a gap of 1 ms with its ping at its end: carried', thawCarried(5000, 5001, [5001 + OFF], OFF, true));
}

// ── 4. the worker's times are mapped onto the page's ──
{
  const from = 50000, to = from + 10000;
  const pings = pingsEvery(from, to, 2000);
  check('4. read with the right offset: carried', thawCarried(from, to, pings, OFF, true));
  check('4. read as if the clocks agreed (offset 0): none of them falls in the gap', !thawCarried(from, to, pings, 0, true));
  const outside = [from - 1 + OFF, from + OFF, to + 1 + OFF, to + 5000 + OFF];
  check('4. pings before the gap (or at its very start) and after it are not counted', !thawCarried(from, to, outside, OFF, true));
  /* v2.3.6311: the gap's last moment is inside it: the count wanted, the last of them stamped at its very end */
  const g30 = pingsEvery(from, from + 30000, 2000), w30 = thawPingsWanted(30000);
  check('4. a ping at the gap\'s very end is counted (the count wanted, the last at the end)',
    thawCarried(from, from + 30000, g30.slice(-w30), OFF, true) && g30[g30.length - 1] === from + 30000 + OFF, { want: w30 });
}

// ── 5. the count wanted ──
check('5. a ping each THAW.PING_MS, less one at an edge, at least one',
  thawPingsWanted(5001) === 1 && thawPingsWanted(7000) === 1 && thawPingsWanted(10500) === 2 && thawPingsWanted(35000) === 9 && THAW.PING_MS === 3500,
  [thawPingsWanted(5001), thawPingsWanted(7000), thawPingsWanted(10500), thawPingsWanted(35000)]);
check('5. the page waits a beat (THAW.SETTLE_MS) before judging, and keeps enough pings for a long gap',
  THAW.SETTLE_MS >= 1000 && THAW.KEEP * 2000 >= 60000, THAW);

// ── 6. the page wires it: wsClient's syntax tree (its files by system: tools/guards/lib/filesOf.mjs) ──
{
  const wire = readSystem('wire', { only: /\.js$/ });
  const wsFile = [...wire.keys()].find((f) => /networking\/wsClient\.js$/.test(f));
  const { parse, traverse } = babel();
  const ast = parse(wire.get(wsFile), { sourceType: 'module', plugins: ['jsx'] });
  const isId = (n, name) => !!n && n.type === 'Identifier' && (name === undefined || n.name === name);
  const isStr = (n, v) => !!n && n.type === 'StringLiteral' && n.value === v;
  const isMember = (n, obj, prop) => !!n && n.type === 'MemberExpression' && !n.computed && isId(n.object, obj) && isId(n.property, prop);
  const calleeName = (c) => (isId(c.callee) ? c.callee.name : null);
  const ownBlock = (p) => p.parentPath && p.parentPath.isExpressionStatement() ? p.parentPath.parentPath : null;
  const imported = new Set();
  const calls = Object.create(null);   /* callee name -> [path] */
  const thawUses = [];                 /* every reference to _thaw but its declaration */
  let judgeDecl = null;
  traverse(ast, {
    ImportDeclaration(p) { if (p.node.source.value === '@/game/thawCarried.js') for (const s of p.node.specifiers) imported.add(s.local.name); },
    VariableDeclarator(p) { if (isId(p.node.id, '_thaw')) judgeDecl = p.node; },
    CallExpression(p) {
      const n = calleeName(p.node) || (p.node.callee.type === 'MemberExpression' && isId(p.node.callee.object) && isId(p.node.callee.property) ? p.node.callee.object.name + '.' + p.node.callee.property.name : null);
      if (n) (calls[n] || (calls[n] = [])).push(p);
    },
    Identifier(p) { if (p.node.name === '_thaw' && !p.parentPath.isVariableDeclarator()) thawUses.push(p); },
  });
  const one = (name) => (calls[name] || []).length === 1 ? calls[name][0] : null;

  check('6. wsClient imports the judge, the beat and the resume from game/thawCarried.js',
    ['makeThawJudge', 'thawBeat', 'thawResume'].every((n) => imported.has(n)), [...imported]);
  check('6. the connection makes one judge on the worker\'s clock',
    !!judgeDecl && judgeDecl.init && judgeDecl.init.type === 'CallExpression' && isId(judgeDecl.init.callee, 'makeThawJudge')
      && judgeDecl.init.arguments.length === 1 && isId(judgeDecl.init.arguments[0], 'workerClock') && (calls.makeThawJudge || []).length === 1);

  /* each ping's worker time, unconditionally, in the block that samples the worker's clock with it */
  const pingCall = one('_thaw.ping');
  const pingBlock = pingCall && ownBlock(pingCall);
  check('6. each ping\'s worker time is handed to the judge, in the block that samples the worker\'s clock',
    !!pingBlock && pingBlock.isBlockStatement() && pingCall.node.arguments.length === 1 && isMember(pingCall.node.arguments[0], 'msg', 'ts')
      && pingBlock.node.body.some((st) => {
        if (st.type !== 'IfStatement') return false;
        let x = st.test; while (x.type === 'LogicalExpression') x = x.left;   /* `workerClock.sample(msg.ts, ...) && ...` */
        return x.type === 'CallExpression' && isMember(x.callee, 'workerClock', 'sample') && isMember(x.arguments[0], 'msg', 'ts');
      }),
    { pings: (calls['_thaw.ping'] || []).length });

  /* the decision is the module's: wsClient never asks the judge itself */
  const thawRoles = thawUses.map((p) => {
    if (p.parentPath.isMemberExpression() && p.parentPath.node.object === p.node) return 'judge.' + (p.parentPath.node.property.name || '?');
    if (p.parentPath.isCallExpression() && p.parentPath.node.arguments[0] === p.node) return calleeName(p.parentPath.node) + '(judge)';
    return 'other';
  });
  check('6. wsClient keeps calls, not the decision: the judge reached only by ping, thawBeat and thawResume',
    thawRoles.slice().sort().join(',') === 'judge.ping,thawBeat(judge),thawResume(judge)', thawRoles);

  /* the alive timer: one thawBeat, a statement of its own body no return stands before */
  const beat = one('thawBeat');
  const beatStmt = beat && beat.parentPath.isExpressionStatement() ? beat.parentPath : null;
  const timerFn = beatStmt && beatStmt.parentPath.parentPath;
  const timerCall = timerFn && timerFn.parentPath;
  const isTimer = !!timerCall && timerCall.isCallExpression() && isId(timerCall.node.callee, 'setInterval') && timerCall.parentPath.isVariableDeclarator() && isId(timerCall.parentPath.node.id, '_aliveTimer');
  let returnsBefore = 0;
  if (isTimer) {
    const body = timerFn.get('body.body');
    for (const st of body.slice(0, body.findIndex((x) => x.node === beatStmt.node))) {
      if (st.isReturnStatement()) returnsBefore++;
      st.traverse({ ReturnStatement() { returnsBefore++; }, Function(q) { q.skip(); } });
    }
  }
  const [bJudge, bEnv, bFx] = beat ? beat.node.arguments : [];
  const prop = (o, k) => o && o.type === 'ObjectExpression' ? (o.properties.find((x) => isId(x.key, k)) || {}).value : undefined;
  const off = prop(bEnv, 'off');
  const envOk = isId(bJudge, '_thaw') && isId(prop(bEnv, 'now'), 'now') && isId(prop(bEnv, 'gap'), 'gap') && isId(prop(bEnv, 'awayMs'), 'RESYNC_AWAY_MS')
    && !!off && off.type === 'CallExpression' && isId(off.callee, 'sw') && isStr(off.arguments[0], 'thawjudge')
    && !!prop(bEnv, 'visible') && prop(bEnv, 'visible').type === 'LogicalExpression';
  check('6. the alive timer\'s one thawBeat, every beat (no return before it), on its own now and gap, `?thawjudge=0` its switch',
    isTimer && returnsBefore === 0 && envOk, { isTimer, returnsBefore, envOk });
  /* ...its resume hands the judge's gap and verdict, untouched, to _resumeRecover('thaw', ...) */
  const res = prop(bFx, 'resume');
  let resOk = false;
  if (res && res.type === 'FunctionExpression' && res.params.length === 2 && res.params.every((x) => isId(x))) {
    const [g, c] = res.params.map((x) => x.name);
    const rc = [], writes = [];
    const resPath = beat.get('arguments')[2].get('properties').find((q) => isId(q.node.key, 'resume')).get('value');
    resPath.traverse({
      CallExpression(q) { if (isId(q.node.callee, '_resumeRecover')) rc.push(q.node); },
      AssignmentExpression(q) { if (isId(q.node.left)) writes.push(q.node.left.name); },
      UpdateExpression(q) { if (isId(q.node.argument)) writes.push(q.node.argument.name); },
    });
    resOk = rc.length === 1 && rc[0].arguments.length === 3 && isStr(rc[0].arguments[0], 'thaw') && isId(rc[0].arguments[1], g) && isId(rc[0].arguments[2], c)
      && !writes.includes(g) && !writes.includes(c);
  }
  check('6. ...its resume hands the judge\'s gap and verdict, untouched, to _resumeRecover(\'thaw\', gap, carried), the only thaw resume',
    resOk && (calls._resumeRecover || []).filter((p) => isStr(p.node.arguments[0], 'thaw')).length === 1);

  /* the open socket: one thawResume, in _resumeRecover, on its own `carried`, the rejoin its effect */
  const rs = one('thawResume');
  const fn = rs && rs.getFunctionParent();
  const recover = fn && rs.findParent((q) => q.isFunctionDeclaration() && isId(q.node.id, '_resumeRecover'));
  const carriedB = recover && recover.scope.getBinding('carried');
  const a = rs ? rs.node.arguments : [];
  const rejoinFn = a[4];
  const rejoinOk = !!rejoinFn && rejoinFn.type === 'FunctionExpression' && rejoinFn.body.body.length === 1 && rejoinFn.body.body[0].type === 'ExpressionStatement'
    && rejoinFn.body.body[0].expression.type === 'CallExpression' && isId(rejoinFn.body.body[0].expression.callee, '_forceRejoin') && isStr(rejoinFn.body.body[0].expression.arguments[0], 'resume-resync');
  check('6. _resumeRecover\'s one thawResume: its own `carried` (a parameter nothing writes, read only there), away past RESYNC_AWAY_MS, the rejoin its effect',
    !!recover && recover.node.params.map((x) => x.name).join(',') === 'tag,awayMs,carried' && !!carriedB && carriedB.kind === 'param'
      && carriedB.constantViolations.length === 0 && carriedB.referencePaths.length === 1 && carriedB.referencePaths[0].node === a[3]
      && isId(a[0], '_thaw') && isId(a[1], '_awayMs') && isId(a[2], 'RESYNC_AWAY_MS') && rejoinOk
      && (calls._forceRejoin || []).filter((p) => isStr(p.node.arguments[0], 'resume-resync')).length === 1,
    { recover: !!recover, rejoinOk });
  /* ...unconditional in the open socket's branch, whose test asks the socket only */
  const rsBlock = rs && ownBlock(rs);
  const rsIf = rsBlock && rsBlock.parentPath;
  const t = rsIf && rsIf.isIfStatement() ? rsIf.node.test : null;
  check('6. ...a statement of the open socket\'s branch, its test `ws.readyState === 1` and nothing else (no verdict asked there)',
    !!t && rsIf.node.consequent === rsBlock.node && t.type === 'BinaryExpression' && t.operator === '===' && isMember(t.left, 'ws', 'readyState')
      && t.right.type === 'NumericLiteral' && t.right.value === 1, t && t.type);
}

// ── 7. the judge ──
{
  let off = OFF, known = true;
  const clock = { offset: () => off, known: () => known };
  const j = makeThawJudge(clock);
  for (const t of pingsEvery(90000, 112000, 2000)) j.ping(t);
  j.gap(110000, 10000);   /* 100000 .. 110000 */
  off = 0;                /* the late pings resample the clock: the judge keeps the offset as found */
  check('7. not judged before a SETTLE beat', j.due(110000 + THAW.SETTLE_MS - 1, false) === null);
  const d = j.due(110000 + THAW.SETTLE_MS, false);
  check('7. a beat on: the gap, carried (the offset as it was when the gap was found)', !!d && d.gap === 10000 && d.carried === true, d);
  check('7. ...judged once', j.due(130000, false) === null && j.stats().pending === false);
  j.gap(150000, 10000);
  const e = j.due(152000, true);
  check('7. `?thawjudge=0`: not carried (handed to the rejoin), counted', !!e && e.carried === false && j.stats().rejoined === 1, j.stats());
  const k = makeThawJudge({ offset: () => 0, known: () => false });
  k.gap(10000, 8000);
  check('7. no ping clock yet: not carried', (k.due(20000, false) || {}).carried === false);
  j.count('carried');
  check('7. count(\'carried\') and the probe\'s stats', j.stats().carried === 1 && typeof j.stats().last === 'object');
  /* v2.3.6311 (sitting 59: every line the PR added killed by a test) */
  check('7. the probe\'s last verdict is the last gap judged: its length, verdict and time',
    !!j.stats().last && j.stats().last.gap === 10000 && j.stats().last.carried === false && j.stats().last.at === 152000, j.stats().last);
  const q = makeThawJudge(clock);
  q.ping('soon'); q.ping(undefined); q.ping(NaN);
  check('7. a ping time that is not a number is not kept (it would take a real one\'s place)', q.stats().kept === 0, q.stats());
  const hadWin = Object.prototype.hasOwnProperty.call(globalThis, 'window'), oldWin = globalThis.window;
  globalThis.window = {};
  const w = makeThawJudge(clock);
  w.count('carried');
  const probe = globalThis.window.__btThaw;
  if (hadWin) globalThis.window = oldWin; else delete globalThis.window;
  check('7. on a page, window.__btThaw() is the judge\'s own stats (mp-comeback reads it)', typeof probe === 'function' && probe().carried === 1);
  const spy = [];
  const jr = makeThawJudge(clock);
  const rs = [thawResume(jr, 5000, 5000, false, () => spy.push(1)), thawResume(jr, 5001, 5000, true, () => spy.push(2)), thawResume(jr, 5001, 5000, false, () => spy.push(3))];
  check('7. thawResume: at the line nothing (null); past it, carried kept (\'carried\', counted); not carried, \'rejoin\' and the rejoin',
    rs.join() === ',carried,rejoin' && spy.join() === '3' && jr.stats().carried === 1, { rs, spy });
}

// ── 8. the road PLAYED: beats on a fake clock, fake pings, a spy for the rejoin ──
{
  const AWAY = 5000;   /* wsClient's RESYNC_AWAY_MS */
  /* a page as wsClient wires it: the alive timer's beat calls thawBeat; its
     resume is _resumeRecover's open socket (awayMs: the thaw's own measure,
     the frozen time being ~0 a beat after the gap), which calls thawResume
     with a spy for _forceRejoin('resume-resync') */
  const page = ({ off = false, known = true } = {}) => {
    const judge = makeThawJudge({ offset: () => OFF, known: () => known });
    const pg = { judge, now: 0, last: 0, rejoins: [], resumes: [], maxKept: 0 };
    pg.resume = (g, c) => { pg.resumes.push({ g, c, at: pg.now }); thawResume(judge, g, AWAY, c, () => pg.rejoins.push(pg.now)); };
    pg.ping = (pageT) => { judge.ping(pageT + OFF); pg.maxKept = Math.max(pg.maxKept, judge.stats().kept); };
    pg.beat = (t) => { pg.now = t; const gap = t - pg.last; pg.last = t; return thawBeat(judge, { now: t, gap, visible: true, off, awayMs: AWAY }, { resume: pg.resume }); };
    /* play to `t`, a beat a second and a ping every 2 s, on time */
    pg.play = (t) => { for (let x = pg.now + 1000; x <= t; x += 1000) { if (x % 2000 === 0) pg.ping(x); pg.beat(x); } };
    /* a freeze of `ms`: no beats; the pings sent inside it handled late (`carried`) or never */
    pg.freeze = (ms, carried) => {
      const from = pg.now, to = from + ms;
      const late = [];
      for (let x = from + 1; x <= to; x++) if (x % 2000 === 0) late.push(x);
      const did = pg.beat(to);
      if (carried) for (const x of late) pg.ping(x);
      return did;
    };
    return pg;
  };

  { const pg = page();
    pg.play(20000);
    const did = pg.freeze(12000, true);
    pg.play(45000);
    check('8. a 12 s gap the socket carried (its pings handled late): noted, judged a beat on, carried: no rejoin',
      did === 'noted' && pg.rejoins.length === 0 && pg.judge.stats().carried === 1 && pg.resumes.length === 1 && pg.resumes[0].c === true && pg.resumes[0].at === 33000,
      { did, rejoins: pg.rejoins, resumes: pg.resumes, stats: pg.judge.stats() }); }

  { const pg = page();
    pg.play(20000);
    pg.freeze(12000, false);
    check('8. a 12 s gap with its pings missing: no rejoin in the gap\'s own beat', pg.rejoins.length === 0);
    pg.play(33000);
    check('8. ...handed on a beat later, not carried: exactly one rejoin', pg.rejoins.length === 1 && pg.rejoins[0] === 33000 && pg.resumes[0].c === false,
      { rejoins: pg.rejoins, resumes: pg.resumes });
    pg.play(90000);
    check('8. ...and only one, the page playing on', pg.rejoins.length === 1 && pg.judge.stats().rejoined === 1 && pg.judge.stats().carried === 0, pg.judge.stats()); }

  { const pg = page();
    pg.play(10000);
    const gaps = [6000, 9000, 14000, 30000, 7000, 21000, 16000, 12000, 18000, 8000];
    for (let r = 0; r < 2; r++) for (const g of gaps) { pg.freeze(g, true); pg.play(pg.now + 2000); }
    check('8. a slow page (card RD\'s crowdfight): 20 gaps of 6-30 s, every ping late but there: not one rejoin',
      pg.rejoins.length === 0 && pg.judge.stats().carried === 20, { rejoins: pg.rejoins.length, stats: pg.judge.stats() });
    pg.freeze(15000, false); pg.play(pg.now + 3000);
    check('8. ...and its first gap with the pings missing: one rejoin', pg.rejoins.length === 1, pg.rejoins); }

  { const pg = page();
    pg.play(2000000);   /* 1000 pings */
    check(`8. the kept list never passes THAW.KEEP (${THAW.KEEP}) after a thousand pings`,
      pg.maxKept === THAW.KEEP && pg.judge.stats().kept === THAW.KEEP, { maxKept: pg.maxKept, kept: pg.judge.stats().kept });
    pg.freeze(30000, true); pg.play(pg.now + 3000);
    check('8. ...the oldest dropped, so a 30 s gap after them is still judged on its own pings: carried', pg.rejoins.length === 0 && pg.judge.stats().carried === 1, pg.judge.stats()); }

  { const pg = page({ off: true });
    pg.play(20000);
    const did = pg.freeze(12000, true);
    pg.play(60000);
    check('8. `?thawjudge=0`: main\'s path, the gap handed on in its own beat, unjudged: one rejoin, at once, its pings notwithstanding',
      did === 'at-once' && pg.rejoins.length === 1 && pg.rejoins[0] === 32000 && pg.resumes.length === 1 && pg.resumes[0].c === undefined && pg.judge.stats().carried === 0,
      { did, rejoins: pg.rejoins, resumes: pg.resumes }); }

  { const pg = page({ known: false });
    pg.play(20000); pg.freeze(12000, true); pg.play(40000);
    check('8. no ping clock yet: the gap rejoins (the old rule)', pg.rejoins.length === 1, pg.rejoins); }

  { const pg = page();
    pg.play(20000);
    const did = pg.freeze(4000, false);
    pg.play(30000);
    pg.resume(2000, undefined);   /* a return iOS told of (visibilitychange), 2 s away, the socket open */
    check('8. a gap under RESYNC_AWAY_MS, or a short return: nothing noted, no rejoin',
      did === null && pg.rejoins.length === 0 && pg.judge.stats().last === null, { did, rejoins: pg.rejoins });
    pg.resume(9000, undefined);   /* ...and a long one iOS told of: not judged, rejoined as before */
    check('8. a long return iOS told of (not the thaw\'s): rejoined as before', pg.rejoins.length === 1, pg.rejoins); }

  /* v2.3.6311 (sitting 59's hold: no uncarried gap of 5 to 12 s was played, so a
     floor under 12 s was unseen): every gap on both sides of the line, each on
     a page of its own, two beats played after it */
  const EDGE = [4000, 4999, 5000, 5001, 5499, 5500, 6000, 7000, 8000, 9000, 9999, 10000, 11000, 11999, 12000];
  for (const carried of [false, true]) {
    const got = EDGE.map((g) => {
      const pg = page();
      pg.play(20000);
      pg.freeze(g, carried);
      pg.beat(pg.now + 1000); pg.beat(pg.now + 1000);
      return pg.rejoins.length + (pg.judge.stats().last ? 'j' : '');   /* 'j': the gap was judged */
    });
    const want = EDGE.map((g) => (g > AWAY && !carried ? '1j' : g > AWAY ? '0j' : '0'));
    check(`8. every gap of 4 to 12 s, ${carried ? 'carried: none rejoins' : 'its pings missing: one rejoin each past 5 s, none at or under'}`,
      got.join() === want.join(), { gaps: EDGE, got, want });
  }
  { const pg = page();
    pg.play(20000);
    pg.resume(AWAY, undefined); const at = pg.rejoins.length;
    pg.resume(AWAY + 1, undefined);
    check('8. a return iOS told of: away exactly RESYNC_AWAY_MS keeps the socket, a millisecond more rejoins', at === 0 && pg.rejoins.length === 1, pg.rejoins); }
}

// ── 9. the PAGE'S OWN CODE played (sitting 58's hold, v2.3.6309: §8 plays a
//    copy of _resumeRecover, so `if (tag === 'thaw') return;` before the real
//    thawResume stayed green).  The alive timer's body and _resumeRecover are
//    lifted out of wsClient.js's syntax tree as they stand and RUN, sharing
//    one closure (a `with` over a stub table: the socket, S, the clock, the
//    canvas check, setTimeout, a spy for _forceRejoin and connect), on a fake
//    clock with fake pings.  What is watched is what the code DOES: the
//    rejoins, the connects, the canvas check and the GL probe it schedules. ──
{
  const wire = readSystem('wire', { only: /\.js$/ });
  const wsFile = [...wire.keys()].find((f) => /networking\/wsClient\.js$/.test(f));
  const src = wire.get(wsFile);
  const { parse, traverse } = babel();
  const ast = parse(src, { sourceType: 'module', plugins: ['jsx'] });
  let timerFn = null, recoverFn = null;
  const nums = Object.create(null);   /* the page's own numbers: RESYNC_AWAY_MS, DEAD_PIPE_MS, ... */
  traverse(ast, {
    VariableDeclarator(p) {
      const n = p.node;
      if (n.id.type === 'Identifier' && n.init && n.init.type === 'NumericLiteral') nums[n.id.name] = n.init.value;
      if (n.id.type === 'Identifier' && n.id.name === '_aliveTimer' && n.init && n.init.type === 'CallExpression' && n.init.callee.name === 'setInterval') timerFn = p.get('init.arguments.0');
    },
    FunctionDeclaration(p) { if (p.node.id && p.node.id.name === '_resumeRecover') recoverFn = p; },
  });
  /* its text, a dynamic import() made a stub's (the crash log), and every name it reads from outside itself */
  const lift = (fp) => {
    const at = fp.node.start, imports = [], free = new Set();
    fp.traverse({
      CallExpression(q) { if (q.node.callee.type === 'Import') imports.push(q.node.callee.start - at); },
      Identifier(q) {
        const left = (q.parentPath.isAssignmentExpression() && q.parentPath.node.left === q.node) || q.parentPath.isUpdateExpression();
        if (!q.isReferencedIdentifier() && !left) return;
        const b = q.scope.getBinding(q.node.name);
        if (!b || !(b.path.node === fp.node || b.path.findParent((x) => x.node === fp.node))) free.add(q.node.name);
      },
    });
    let text = src.slice(at, fp.node.end);
    for (const i of imports.sort((x, y) => y - x)) text = text.slice(0, i) + '__import' + text.slice(i + 'import'.length);
    return { text, free };
  };
  const timerL = timerFn && lift(timerFn), recoverL = recoverFn && lift(recoverFn);
  check('9. wsClient\'s alive timer body and _resumeRecover found in its tree, and the page\'s RESYNC_AWAY_MS',
    !!timerL && !!recoverL && nums.RESYNC_AWAY_MS === 5000, { timer: !!timerL, recover: !!recoverL, away: nums.RESYNC_AWAY_MS });

  const GLOBALS = new Set(['Math', 'Number', 'JSON', 'Object', 'Array', 'String', 'Boolean', 'isFinite', 'undefined', 'NaN', 'Infinity', 'arguments']);
  const STUBBED = ['Date', 'document', 'window', 'S', 'ws', 'sw', 'setTimeout', 'clearTimeout', 'connect', '_forceRejoin', '_resumeRecover',
    '_thaw', 'thawBeat', 'thawResume', '_hiddenAt', '_lastAliveAt', '_lastInboundAt', '_settleSentAt', '_connectAt', 'reconnectTimer', 'reconnectDelay',
    'checkWitnesses', 'noteCheckActed', 'EMPTIED_NEED', 'CANVAS_CHECK_OFF', '__import', 'RESYNC_AWAY_MS', 'DEAD_PIPE_MS', 'SETTLE_SILENT_MS', 'CONNECT_STALL_MS'];
  const unstubbed = timerL && recoverL ? [...new Set([...timerL.free, ...recoverL.free])].filter((n) => !GLOBALS.has(n) && !STUBBED.includes(n)) : ['(not found)'];
  check('9. every name the two read from outside themselves is one the stub table gives (or a plain global)', unstubbed.length === 0, unstubbed);

  /* a page: the real timer and _resumeRecover in one closure */
  const realPage = ({ off = false, known = true, status = 'connected' } = {}) => {
    const pg = { now: 0, rejoins: [], connects: 0, witnessed: 0, probes: 0, missing: new Set() };
    const env = {
      Date: { now: () => pg.now },
      document: { visibilityState: 'visible' },
      window: {},
      S: { _realtimeStatus: status },
      ws: { readyState: 1 },
      sw: (k) => (k === 'thawjudge' ? off : false),
      setTimeout: (fn, ms) => { if (ms === 600) pg.probes++; return 1; },
      clearTimeout: () => {},
      connect: () => { pg.connects++; env.ws = { readyState: 0 }; },
      _forceRejoin: (tag, why) => { pg.rejoins.push({ tag, why, at: pg.now }); env.ws = { readyState: 1 }; },
      _thaw: makeThawJudge({ offset: () => OFF, known: () => known }),
      thawBeat, thawResume,
      _hiddenAt: 0, _lastAliveAt: 0, _lastInboundAt: 0, _settleSentAt: 0, _connectAt: 0, reconnectTimer: null, reconnectDelay: 1000,
      checkWitnesses: () => { pg.witnessed++; return { emptied: 0, checked: 4, ms: 1 }; },
      noteCheckActed: () => {}, EMPTIED_NEED: 2, CANVAS_CHECK_OFF: false,
      __import: () => Promise.resolve({ recordCrash: () => {} }),
      RESYNC_AWAY_MS: nums.RESYNC_AWAY_MS, DEAD_PIPE_MS: nums.DEAD_PIPE_MS, SETTLE_SILENT_MS: nums.SETTLE_SILENT_MS, CONNECT_STALL_MS: nums.CONNECT_STALL_MS,
    };
    const scope = new Proxy(env, {
      has: (o, k) => typeof k === 'string',
      get: (o, k) => {
        if (typeof k !== 'string') return undefined;
        if (k in o) return o[k];
        if (GLOBALS.has(k) && k !== 'arguments') return globalThis[k];
        pg.missing.add(k); return undefined;
      },
      set: (o, k, v) => { o[k] = v; return true; },
    });
    // eslint-disable-next-line no-new-func
    const made = new Function('__scope', 'with (__scope) { return { timer: (' + timerL.text + '), recover: (' + recoverL.text + ') }; }')(scope);
    env._resumeRecover = made.recover;
    pg.env = env; pg.judge = env._thaw; pg.recover = made.recover;
    pg.beat = (t) => { pg.now = t; made.timer(); };
    pg.ping = (pageT, handledAt) => { env._thaw.ping(pageT + OFF); env._lastInboundAt = handledAt === undefined ? pageT : handledAt; };
    pg.play = (t) => { for (let x = pg.now + 1000; x <= t; x += 1000) { if (x % 2000 === 0) pg.ping(x); pg.beat(x); } };
    pg.freeze = (ms, carried) => {
      const from = pg.now, to = from + ms;
      pg.beat(to);
      if (carried) for (let x = from + 1; x <= to; x++) if (x % 2000 === 0) pg.ping(x, to);
    };
    return pg;
  };

  if (timerL && recoverL) {
    { const pg = realPage();
      pg.play(20000); pg.freeze(12000, true); pg.play(45000);
      check('9. the real page: a 12 s gap its socket carried keeps the socket (no rejoin, no connect), counted carried',
        pg.rejoins.length === 0 && pg.connects === 0 && pg.judge.stats().carried === 1, { rejoins: pg.rejoins, stats: pg.judge.stats(), missing: [...pg.missing] });
      check('9. ...and the rest of the return still runs for it: the canvas check once, the GL probe scheduled once',
        pg.witnessed === 1 && pg.probes === 1, { witnessed: pg.witnessed, probes: pg.probes }); }

    { const pg = realPage();
      pg.play(20000); pg.freeze(12000, false);
      check('9. the real page: a 12 s gap with its pings missing, no rejoin in its own beat', pg.rejoins.length === 0, pg.rejoins);
      pg.play(33000);
      const r = pg.rejoins[0];
      check('9. ...a beat on, the real _resumeRecover(\'thaw\') rejoins: exactly one _forceRejoin(\'resume-resync\', \'thaw away 12s\')',
        pg.rejoins.length === 1 && r.tag === 'resume-resync' && r.why === 'thaw away 12s' && r.at === 33000 && pg.witnessed === 1 && pg.probes === 1,
        { rejoins: pg.rejoins, witnessed: pg.witnessed, missing: [...pg.missing] });
      pg.play(90000);
      check('9. ...and only one, the page playing on (no dead pipe: its pings keep coming)', pg.rejoins.length === 1, pg.rejoins); }

    { const pg = realPage();
      pg.play(10000);
      const gaps = [6000, 9000, 14000, 30000, 7000, 21000, 16000, 12000, 18000, 8000];
      for (let r = 0; r < 2; r++) for (const g of gaps) { pg.freeze(g, true); pg.play(pg.now + 2000); }
      check('9. the real page, slow (card RD\'s crowdfight): 20 carried gaps of 6-30 s, not one rejoin', pg.rejoins.length === 0 && pg.judge.stats().carried === 20,
        { rejoins: pg.rejoins.length, stats: pg.judge.stats() });
      pg.freeze(15000, false); pg.play(pg.now + 3000);
      check('9. ...its first gap with the pings missing: one rejoin', pg.rejoins.length === 1 && pg.rejoins[0].why === 'thaw away 15s', pg.rejoins); }

    { const pg = realPage({ off: true });
      pg.play(20000); pg.freeze(12000, true);
      check('9. the real page, `?thawjudge=0`: the gap rejoins in its own beat, its pings notwithstanding (main\'s path)',
        pg.rejoins.length === 1 && pg.rejoins[0].at === 32000 && pg.rejoins[0].why === 'thaw away 12s', pg.rejoins); }

    { const pg = realPage();
      pg.play(20000);
      pg.env.document.visibilityState = 'hidden'; pg.env._hiddenAt = 20000;
      for (let t = 30000; t <= 80000; t += 10000) pg.beat(t);   /* a hidden tab's timer, throttled to one beat in 10 s, no pings */
      check('9. the real page, hidden (a tab switched away, its timer throttled): no gap judged, no rejoin', pg.rejoins.length === 0 && pg.judge.stats().last === null,
        { rejoins: pg.rejoins, last: pg.judge.stats().last });
      pg.env.document.visibilityState = 'visible'; pg.now = 81000;
      pg.recover('visible');   /* armResumeListeners' visibilitychange */
      check('9. ...back 61 s later, the return iOS told of rejoins as before (`visible`, not judged)',
        pg.rejoins.length === 1 && /^visible away 61s$/.test(pg.rejoins[0].why) && pg.env._hiddenAt === 0, pg.rejoins); }

    { const pg = realPage();
      pg.play(20000);
      pg.env._hiddenAt = 18000; pg.recover('visible');
      check('9. the real page: a 2 s return, the socket open, keeps it', pg.rejoins.length === 0 && pg.connects === 0, pg.rejoins); }

    { const pg = realPage({ status: 'superseded' });
      pg.play(20000); pg.freeze(12000, false); pg.play(30000);
      check('9. the real page, hung up (superseded, its banner up): a thaw never reconnects behind the banner', pg.rejoins.length === 0 && pg.connects === 0, pg.rejoins); }

    { const pg = realPage();
      pg.play(20000); pg.env.ws = { readyState: 3 }; pg.freeze(12000, false); pg.now += 1000; pg.beat(pg.now);
      check('9. the real page, its socket dead at the thaw: connected again at once, no forced rejoin', pg.connects === 1 && pg.rejoins.length === 0,
        { connects: pg.connects, rejoins: pg.rejoins }); }

    /* v2.3.6311 (sitting 59's hold): the real page, every gap on both sides of
       RESYNC_AWAY_MS, each on a page of its own: missing pings, one rejoin past
       the line and its why the gap's own seconds; carried, none */
    const EDGE = [4000, 4999, 5000, 5001, 5499, 5500, 6000, 7000, 8000, 9000, 9999, 10000, 11000, 11999, 12000];
    for (const carried of [false, true]) {
      const got = EDGE.map((g) => {
        const pg = realPage();
        pg.play(20000);
        pg.freeze(g, carried);
        pg.beat(pg.now + 1000); pg.beat(pg.now + 1000);
        return pg.rejoins.map((r) => r.tag + ':' + r.why).join('|');
      });
      const want = EDGE.map((g) => (g > nums.RESYNC_AWAY_MS && !carried ? 'resume-resync:thaw away ' + Math.round(g / 1000) + 's' : ''));
      check(`9. the real page, every gap of 4 to 12 s, ${carried ? 'carried: none rejoins' : 'its pings missing: one rejoin each past 5 s, none at or under'}`,
        got.join() === want.join(), { gaps: EDGE, got, want });
    }

    { const pg = realPage();
      pg.play(20000);
      pg.env._hiddenAt = pg.now - nums.RESYNC_AWAY_MS; pg.recover('visible'); const at = pg.rejoins.length;
      pg.env._hiddenAt = pg.now - nums.RESYNC_AWAY_MS - 1; pg.recover('visible');
      check('9. the real page, a return iOS told of: away exactly RESYNC_AWAY_MS keeps the socket, a millisecond more rejoins',
        at === 0 && pg.rejoins.length === 1 && pg.rejoins[0].why === 'visible away 5s', pg.rejoins); }

    /* the beats after the thaw's say still watch the socket (v2.3.3034's dead
       pipe): a page beating every second, then every 3 s (slow, not frozen),
       its socket gone quiet: rejoined as a dead pipe once it is silent past
       DEAD_PIPE_MS, never as a thaw */
    for (const every of [1000, 3000]) {
      const pg = realPage();
      pg.play(20000);
      for (let t = pg.now + every; t <= 20000 + nums.DEAD_PIPE_MS + 4 * every; t += every) pg.beat(t);   /* no pings */
      const r = pg.rejoins[0];
      check(`9. the real page, its socket silent while it beats every ${every / 1000} s: one dead-pipe rejoin past DEAD_PIPE_MS, no thaw`,
        pg.rejoins.length >= 1 && r.tag === 'dead-pipe' && r.at - 20000 > nums.DEAD_PIPE_MS && r.at - 20000 <= nums.DEAD_PIPE_MS + every && pg.judge.stats().last === null,
        { rejoins: pg.rejoins, last: pg.judge.stats().last });
    }
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
