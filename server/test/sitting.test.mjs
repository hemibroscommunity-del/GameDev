/* ═══ v2.3.6481: THE SITTING'S CARD (grand plan step 10.2; card WHO PR 2) ═══
 *
 *   1. THE SHAPE: a fixed array of SIT.LEN columns (about 120 bytes as
 *      JSON); made safe by sitOneClean (types, bounds, short ASCII build);
 *      `_econ`'s shape number is 2 (gold.js ECON_V, migrations.js ECON.V);
 *      econClean keeps `s` and `sh` (the last 32), reads a v1 record as
 *      before, keeps a NEWER one whole; the gap is the anti-bot's break.
 *   2. THE JOIN OPENS IT: a card with the actor's stint, the socket's
 *      network, written by the join's own save (no put of its own).
 *   3. THE COUNTS: moves and moves over the budget, hits claimed, landed and
 *      refused by reason, gold by road class (signed), the report's facts,
 *      active seconds (gaps of at most IDLE_MS), the longest gap, the hours
 *      of the day.
 *   4. CUT BY A RESTART HALFWAY (the card's "done when"): a sitting played
 *      in the shared room, the room restarted (a deploy: memory gone) and
 *      the character back inside the gap, goes on with the SAME stint; back
 *      after the gap, the card is closed at its last saved moment with the
 *      right sums (both halves), ONE closed card, and a new one opened.
 *   5. THE LAST 32: forty sittings keep the newest 32 closed cards.
 *   6. COST: a sitting's moves, hits and gold write nothing of their own:
 *      the room's puts are the same with the card on as with `sitting:
 *      false` (cost-guard's lines are unchanged).
 *   7. THE KILL SWITCH `sitting: false`: nothing opened, closed or counted;
 *      what a record holds kept through a save; the stint one a socket
 *      again; the cap `sitting` not advertised (on: `sitting: 1`).
 *  7b. THROWN OFF, A WEEK, THROWN ON (sitting 59's bug, v2.3.6481): a
 *      record holding a week-old open card joins with the flag off, the flag
 *      is thrown on mid-sitting: the real moves and every counter count
 *      nothing into it; the next join closes it whole and opens a new one;
 *      a join that opens nothing (sitOpen off, or a body taken over with
 *      the flag off: join.js's sitForget) leaves the earlier card uncounted.
 *   8. A NEWER `_econ` (a rolled-back worker) is left whole: no card.
 *   9. THE ROOM'S OWN PATHS: judged moves and moves over the budget
 *      (movement.js), hits claimed, landed and refused by reason (combat.js,
 *      hitproof.js), gold by its road's class (gold.js) reach the card
 *      through one call each, and a move's, a hit's and the purse's outcome
 *      is the same with `sitting: false`.  The report's facts are not
 *      handed yet (report.js is card PH's: the orchestrator, 2026-11-23).
 *
 * BREAK PROOF (rule 8), tried by hand 2026-11-23:
 *   sitting.js sitOpen: `t - cur[C.u] < SIT.GAP_MS` made `false` -> FAIL 4
 *     (a restart inside the gap begins a new sitting);
 *   sitting.js sitOpen: the `sh.push(cur)` line taken out -> FAIL 4 and 5
 *     (no closed card);
 *   migrations.js econClean: `return sitCleanInto(out, raw)` back to
 *     `return out` -> FAIL 1 and 2 (the card is dropped at the save);
 *   join.js: the `_sitStint` handed to actorSocket taken out -> FAIL 4 (the
 *     actor's stint is not the sitting's);
 *   sitting.js touch: `d <= SIT.IDLE_MS` taken out -> FAIL 3 (an idle gap
 *     counted active);
 *   sitting.js sitCleanInto: `.slice(-SIT.KEEP)` taken out -> FAIL 1;
 *   sitting.js sitOpen: `e.sh = sh` (no slice) -> FAIL 5 (the live list);
 *   leave.js: the sitTouch line taken out -> FAIL 4 (the gap from the move);
 *   join.js _sitJoin: the `ECON.V` test taken out -> FAIL 8;
 *   sitting.js sitMove: the sitOff test taken out -> FAIL 7;
 *   movement.js: either sitMove call taken out -> FAIL 9 (the moves);
 *   movement.js: the test-mode sitMove taken out -> FAIL 10;
 *   combat.js: the `claim` or the `landed` call taken out, or `attackerPs`
 *     not handed to `_hpTally('noWeapon')` -> FAIL 9; hitproof.js
 *     _hpTally's sitHit line taken out -> FAIL 9;
 *   gold.js econGold: the sitGold line taken out -> FAIL 9;
 *   sitting.js sitMove: the card deciding a move (`rec._mvBudget = 0`) ->
 *     FAIL 9 (the path differs from `sitting: false`'s).
 */
import { makeStorage, openRoom, join, fakeWs, settle, seededClock } from './testroom.mjs';
import { SIT, sitBlank, sitOneClean, sitCleanInto, sitOpen, sitMove, sitHit, sitGold, sitReport, sitTouch, sitRead, sitOff } from '../src/sitting.js';
import { ECON, econClean } from '../src/migrations.js';
import { ECON_V } from '../src/gold.js';
import { BOTSIG } from '../src/botsig.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 700) : ''); }
}

const T0 = Date.UTC(2026, 10, 23, 12, 0, 0);
const clock = seededClock({ start: T0, seed: 7 }).install();
const C = SIT.COL;
const seed = (pids, coins, extra) => new Map(pids.map((p) => ['rpg:' + p, { _v: 22, coins, inventory: {}, level: 5, hp: 100, maxHp: 100, _econ: { v: 1, g: { m: 0, b: 0 }, i: {} }, ...(extra || {}) }]));
const sessOf = (room, ws) => room.sessions.get(ws);
const capsOf = (ws) => { const m = ws.sent.find((x) => x && x.type === 'state_sync'); return m ? (m.caps || (m.payload && m.payload.caps) || null) : null; };
const storedEcon = (st, pid) => { const r = st._store.get('rpg:' + pid); return r && r._econ; };
const close = async (room, ws) => { await room.webSocketClose(ws, 1000, 'bye', true); await settle(); };
const live = (room, pid) => room.playerState[pid];

/* ══════════ 1. THE SHAPE ══════════ */
{
  const b = sitBlank(T0, 13335);
  check('1. a blank card: SIT.LEN columns, its stint and network, the refusals and classes zeroed, soft unknown', Array.isArray(b) && b.length === SIT.LEN && b[C.t] === T0 && b[C.u] === T0 && b[C.n] === 13335 && b[C.hr].length === 5 && b[C.gd].length === 4 && b[C.sf] === -1 && b[C.b] === '', b);
  const full = sitBlank(T0, 13335);
  full[C.u] = T0 + 3600e3; full[C.a] = 3412; full[C.g] = 610; full[C.b] = '2.3.6481-abcdef'; full[C.mv] = 45120; full[C.mo] = 120;
  full[C.hc] = 8120; full[C.hl] = 7900; full[C.hr] = [1, 30, 190, 4, 2]; full[C.gd] = [12000, -4500, 3000, -200]; full[C.hh] = 0xffffff; full[C.sf] = 0; full[C.se] = 3400; full[C.dr] = 98000;
  const bytes = JSON.stringify(full).length;
  check('1. a full hour\'s card is about 120 bytes as JSON (at most 160)', bytes <= 160, { bytes, card: full });
  const dirty = full.slice(); dirty[C.mv] = -5; dirty[C.a] = NaN; dirty[C.b] = 'xéy'.repeat(20); dirty[C.hr] = 'no'; dirty[C.sf] = 7; dirty[C.hh] = 2 ** 30;
  const cl = sitOneClean(dirty);
  check('1. sitOneClean: negatives and NaN to 0, a short ASCII build, a bad list zeroed, an unknown soft -1, 24 hour bits', cl && cl[C.mv] === 0 && cl[C.a] === 0 && cl[C.b].length <= SIT.BUILD_MAX && /^[\x20-\x7e]*$/.test(cl[C.b]) && cl[C.hr].join() === '0,0,0,0,0' && cl[C.sf] === -1 && cl[C.hh] === 0, cl);
  check('1. ...and what is not a card is null', sitOneClean(null) === null && sitOneClean([1, 2]) === null && sitOneClean({ t: 1 }) === null && sitOneClean(sitBlank(0, 0)) === null);
  check('1. `_econ`\'s shape number is 2, one number in two places', ECON_V === 2 && ECON.V === 2);
  const v1 = econClean({ v: 1, g: { m: 5, b: -2 }, i: { log_pine: { m: 3, b: 0 } } });
  check('1. econClean reads a v1 record as before, as v2, no card', v1.v === 2 && v1.g.m === 5 && v1.g.b === -2 && v1.i.log_pine.m === 3 && !('s' in v1) && !('sh' in v1), v1);
  const sh = []; for (let i = 0; i < 40; i++) sh.push(sitBlank(T0 + i * 1000, 0));
  const v2 = econClean({ v: 2, g: { m: 1, b: 0 }, i: {}, s: full, sh, junk: 1 });
  check('1. econClean keeps the open card and the newest 32 closed ones, and nothing unknown', Array.isArray(v2.s) && v2.s[C.mv] === 45120 && v2.sh.length === 32 && v2.sh[0][C.t] === T0 + 8000 && v2.sh[31][C.t] === T0 + 39000 && !('junk' in v2), { s: !!v2.s, n: v2.sh && v2.sh.length });
  const newer = { v: 3, s: 'whatever', future: 1 };
  check('1. a NEWER `_econ` is kept whole', econClean(newer) === newer);
  check('1. the gap is the anti-bot\'s break (botsig.js BOTSIG.BREAK_MS)', SIT.GAP_MS === BOTSIG.BREAK_MS);
  check('1. sitCleanInto: a card list of junk keeps nothing', Object.keys(sitCleanInto({}, { s: 5, sh: [1, null, 'x'] })).length === 0);
}

/* ══════════ 2. THE JOIN OPENS IT ══════════ */
{
  const st = makeStorage(seed(['bp_sit_a'], 50));
  const room = await openRoom(st);
  const ws = fakeWs('a');
  const t0 = clock.now();
  await join(room, ws, 'bp_sit_a', { loginTaken: true });
  await settle();
  const s = live(room, 'bp_sit_a')._econ.s;
  const a = sessOf(room, ws).actor;
  check('2. the join opened a card whose stint is the actor\'s, the worker\'s clock at the join', Array.isArray(s) && s[C.t] === t0 && a && a.stint === t0, { s, a });
  const se = storedEcon(st, 'bp_sit_a');
  check('2. ...written by the join\'s own save, inside `_econ` (v2)', se && se.v === 2 && Array.isArray(se.s) && se.s[C.t] === t0, se);
  check('2. the cap `sitting: 1` is advertised', (capsOf(ws) || {}).sitting === 1, capsOf(ws));
}

/* ══════════ 3. THE COUNTS ══════════ */
{
  const rec = { _econ: { v: 2, g: { m: 0, b: 0 }, i: {} } };
  const room = { _liveFlags: {} };
  const t0 = T0 + 7 * 3600e3;   /* 19:00 UTC */
  sitOpen(room, rec, { asn: 64496 }, t0, () => t0);
  sitMove(room, rec, t0 + 1000, false);
  sitMove(room, rec, t0 + 2000, true);
  sitMove(room, rec, t0 + 2000 + 90e3, false);   /* a 90 s idle gap: not active */
  sitMove(room, rec, t0 + 3600e3 + 10e3, false); /* an hour on: a second hour of the day, a long gap */
  sitHit(room, rec, 'claim', t0 + 3600e3 + 11e3);
  sitHit(room, rec, 'claim', t0 + 3600e3 + 12e3);
  sitHit(room, rec, 'landed');
  for (const r of ['far', 'rate', 'rate', 'noWeapon', 'shot', 'swing', 'nonsense']) sitHit(room, rec, r);
  sitGold(room, rec, 'mint', 100); sitGold(room, rec, 'burn', -30); sitGold(room, rec, 'move', -20); sitGold(room, rec, 'move', 5); sitGold(room, rec, 'escrow', -7); sitGold(room, rec, 'set', 99);
  sitReport(room, rec, { soft: 1, build: '2.3.6481', seen: 50, drawn: 2400 });
  sitReport(room, rec, { seen: 10, drawn: 600 });
  const r = sitRead(rec._econ.s);
  check('3. moves 4, one over the budget', r.mv === 4 && r.mo === 1, r);
  check('3. hits claimed 2, landed 1, refused by reason (an unknown word counts nothing)', r.hc === 2 && r.hl === 1 && JSON.stringify(r.hr) === '{"noWeapon":1,"far":1,"rate":2,"shot":1,"swing":1}', r.hr);
  check('3. gold by road class, signed net (a word not a class counts nothing)', JSON.stringify(r.gd) === '{"mint":100,"burn":-30,"move":-15,"escrow":-7}', r.gd);
  check('3. active seconds: the gaps of at most a minute (1 + 1 + 1 + 1), not the idle ones', r.a === 4, r.a);
  check('3. the longest gap, in seconds', r.g === Math.floor((3600e3 + 10e3 - 92e3) / 1000), r.g);
  check('3. the hours of the day played: 19:00 and 20:00 UTC', r.hh === ((1 << 19) | (1 << 20)), r.hh.toString(2));
  check('3. the report\'s facts: soft, the build, seen and drawn summed', r.sf === 1 && r.b === '2.3.6481' && r.se === 60 && r.dr === 3000, r);
  check('3. the network', r.n === 64496);
  check('3. how long: first to last touch', r.long === 3612, r.long);
}

/* ══════════ 4. CUT BY A RESTART HALFWAY ══════════ */
{
  const pid = 'bp_sit_cut';
  const st = makeStorage(seed([pid], 50));
  let room = await openRoom(st);
  let ws = fakeWs('cut1');
  const t0 = clock.now();
  await join(room, ws, pid, { loginTaken: true });
  const stint = sessOf(room, ws).actor.stint;
  /* the first half: moves and gold, then a save the record makes anyway (a paced tap, the regen drain) */
  for (let i = 0; i < 10; i++) { clock.advance(500); sitMove(room, live(room, pid), clock.now(), i === 3); }
  sitGold(room, live(room, pid), 'mint', 40);
  await room._saveRpg(pid, live(room, pid)); await settle();
  const savedAt = clock.now();
  /* unsaved play, lost with the deploy (memory) */
  clock.advance(500); sitMove(room, live(room, pid), clock.now(), false);
  /* THE RESTART: a new room on the same storage, as a deploy leaves it */
  clock.advance(60e3);
  room = await openRoom(st);
  ws = fakeWs('cut2');
  await join(room, ws, pid, { loginTaken: true });
  check('4. back inside the gap after a restart: the same sitting (the actor\'s stint is the first join\'s)', sessOf(room, ws).actor.stint === stint && live(room, pid)._econ.s[C.t] === stint, { stint, now: sessOf(room, ws).actor.stint });
  check('4. ...its counts are the saved half\'s (10 moves, 1 over, 40 minted)', live(room, pid)._econ.s[C.mv] === 10 && live(room, pid)._econ.s[C.mo] === 1 && live(room, pid)._econ.s[C.gd][0] === 40, live(room, pid)._econ.s);
  check('4. ...and the restart\'s gap is the longest (60 s and more)', live(room, pid)._econ.s[C.g] >= 60, live(room, pid)._econ.s[C.g]);
  /* the second half */
  for (let i = 0; i < 5; i++) { clock.advance(1000); sitMove(room, live(room, pid), clock.now(), false); }
  sitGold(room, live(room, pid), 'burn', -12);
  await room._saveRpg(pid, live(room, pid)); await settle();
  const lastSaved = live(room, pid)._econ.s[C.u];
  clock.advance(1000); sitMove(room, live(room, pid), clock.now(), false);   /* never saved */
  /* a crash: no leave, no save; the room gone */
  clock.advance(SIT.GAP_MS + 1000);
  room = await openRoom(st);
  ws = fakeWs('cut3');
  await join(room, ws, pid, { loginTaken: true }); await settle();
  const e = live(room, pid)._econ;
  const closed = e.sh || [];
  check('4. back after the gap: ONE closed card, the first sitting\'s', closed.length === 1 && closed[0][C.t] === stint, closed);
  const c = sitRead(closed[0]);
  check('4. ...closed at its last saved moment', c.u === lastSaved, { u: c.u, lastSaved });
  check('4. ...with the right sums: 15 moves, 1 over, gold minted 40 and burned 12 (the unsaved moves lost)', c.mv === 15 && c.mo === 1 && c.gd.mint === 40 && c.gd.burn === -12, c);
  check('4. a new sitting opened, its stint this join\'s, and the actor\'s', e.s[C.t] > stint && e.s[C.t] === sessOf(room, ws).actor.stint && e.s[C.mv] === 0);
  check('4. both written by the join\'s own save', (storedEcon(st, pid).sh || []).length === 1 && storedEcon(st, pid).s[C.t] === e.s[C.t]);
  check('4. (the first save was at the first half\'s end)', savedAt > t0);
  /* a reconnect inside the gap after a leave: the gap measured from the leave */
  clock.advance(1000); sitMove(room, live(room, pid), clock.now(), false);
  clock.advance(40e3);
  live(room, pid)._regenDirty = true;   /* the close's own save has something to write (regen pending): the card rides it */
  await close(room, ws);
  clock.advance(20e3);
  const ws4 = fakeWs('cut4');
  await join(room, ws4, pid, { loginTaken: true });
  check('4. a move, a leave 40 s later and a reconnect 20 s after it: the same sitting, its longest gap 40 s (the reconnect\'s 20 measured from the leave), the move kept by the close\'s save', sessOf(room, ws4).actor.stint === e.s[C.t] && live(room, pid)._econ.s[C.g] === 40 && live(room, pid)._econ.s[C.mv] === 1, live(room, pid)._econ.s);
}

/* ══════════ 5. THE LAST 32 ══════════ */
{
  const rec = { _econ: econClean(null) };
  const room = { _liveFlags: {} };
  let t = T0;
  const stints = [];
  for (let i = 0; i < 41; i++) { t += SIT.GAP_MS + 5000; stints.push(sitOpen(room, rec, {}, t, (x) => x)); sitMove(room, rec, t + 100, false); }
  const sh = econClean(rec._econ).sh;
  check('5. forty-one sittings: the newest 32 closed cards kept, oldest first', sh.length === 32 && sh[31][C.t] === stints[39] && sh[0][C.t] === stints[8] && rec._econ.s[C.t] === stints[40], { n: sh.length });
  check('5. ...the live record holds no more than 32 either (between saves)', rec._econ.sh.length === 32 && rec._econ.sh[0][C.t] === stints[8], rec._econ.sh.length);
}

/* ══════════ 6. COST: NOTHING WRITTEN OF ITS OWN ══════════ */
{
  const play = async (flags) => {
    const pid = 'bp_sit_cost';
    const st = makeStorage(seed([pid], 50));
    const room = await openRoom(st, flags);
    const ws = fakeWs('cost');
    await join(room, ws, pid, { loginTaken: true }); await settle();
    const b0 = st.batches();
    for (let i = 0; i < 200; i++) { clock.advance(100); sitMove(room, live(room, pid), clock.now(), i % 7 === 0); sitHit(room, live(room, pid), 'claim', clock.now()); }
    await settle();
    const during = st.batches() - b0;
    await close(room, ws);
    return { during, total: st.batches() };
  };
  const on = await play(null), off = await play({ sitting: false });
  check('6. two hundred moves and hits write nothing (no write a move)', on.during === 0, on);
  check('6. the sitting\'s puts are the same with the card as without it (no new row a sitting)', on.total === off.total, { on, off });
}

/* ══════════ 7. THE KILL SWITCH ══════════ */
{
  const pid = 'bp_sit_off';
  const held = sitBlank(T0 - 10 * 60e3, 1); held[C.mv] = 9;
  const st = makeStorage(seed([pid], 50, { _econ: { v: 2, g: { m: 0, b: 0 }, i: {}, s: held, sh: [sitBlank(T0 - 3600e3, 1)] } }));
  const room = await openRoom(st, { sitting: false });
  check('7. sitOff reads the lower-case flag', sitOff(room) === true && sitOff({ _liveFlags: {} }) === false);
  const ws = fakeWs('off');
  const t0 = clock.now();
  await join(room, ws, pid, { loginTaken: true }); await settle();
  const e = live(room, pid)._econ;
  check('7. `sitting: false`: nothing opened or closed (the held card as it was)', e.s && e.s[C.t] === held[C.t] && e.s[C.mv] === 9 && e.sh.length === 1, e);
  sitMove(room, live(room, pid), clock.now(), false); sitGold(room, live(room, pid), 'mint', 5); sitHit(room, live(room, pid), 'claim'); sitReport(room, live(room, pid), { seen: 5 }); sitTouch(room, live(room, pid), clock.now() + 5);
  check('7. ...nothing counted', e.s[C.mv] === 9 && e.s[C.gd][0] === 0 && e.s[C.hc] === 0 && e.s[C.se] === 0 && e.s[C.u] === held[C.u]);
  check('7. ...what the record holds kept through the save', storedEcon(st, pid).s[C.mv] === 9 && storedEcon(st, pid).sh.length === 1, storedEcon(st, pid));
  check('7. ...the actor\'s stint one a socket again (this join\'s clock)', sessOf(room, ws).actor.stint >= t0 && sessOf(room, ws).actor.stint !== held[C.t]);
  check('7. ...the cap not advertised', capsOf(ws) && capsOf(ws).sitting === undefined, capsOf(ws));
}

/* ══════════ 7b. THROWN OFF, A WEEK, THROWN ON (sitting 59's bug) ══════════
   A record holds an open card a week old.  It joins with `sitting: false`
   (nothing opened, nothing closed), and the flag is thrown back on in the
   middle of the sitting: the week-old card must count NOTHING (it is not
   this sitting's), and the next join closes it whole and opens a new one. */
{
  const pid = 'bp_sit_week';
  const WEEK = 7 * 86400e3;
  const held = sitBlank(T0 - WEEK - 3600e3, 1); held[C.u] = T0 - WEEK; held[C.mv] = 4;
  const st = makeStorage(seed([pid], 50, { _econ: { v: 2, g: { m: 0, b: 0 }, i: {}, s: held, sh: [] } }));
  const room = await openRoom(st, { sitting: false });
  const ws = fakeWs('week');
  await join(room, ws, pid, { loginTaken: true }); await settle();
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  const ps = live(room, pid);
  const old = ps._econ.s;
  check('7b. joined with `sitting: false`: the week-old card held as it was', old && old[C.t] === held[C.t] && old[C.mv] === 4 && old[C.u] === held[C.u], old);
  delete room._liveFlags.sitting;   /* thrown back on, mid-sitting */
  check('7b. the flag thrown back on', sitOff(room) === false);
  const mv = (x, y) => room.webSocketMessage(ws, JSON.stringify({ type: 'move', x, y, z: ps.z }));
  for (let i = 0; i < 4; i++) { clock.advance(1000); await mv(ps.x + 20, ps.y); }
  sitMove(room, ps, clock.now(), true); sitHit(room, ps, 'claim', clock.now()); sitHit(room, ps, 'landed'); sitHit(room, ps, SIT.REFUSALS[0]); sitGold(room, ps, SIT.CLASSES[0], 7); sitReport(room, ps, { seen: 3, drawn: 2, soft: 1, build: 'x' }); sitTouch(room, ps, clock.now());
  const r = sitRead(ps._econ.s);
  check('7b. the real moves and every counter: nothing into the week-old card', ps._econ.s === old && r.mv === 4 && r.mo === 0 && r.hc === 0 && r.hl === 0 && r.hr[SIT.REFUSALS[0]] === 0 && r.gd[SIT.CLASSES[0]] === 0 && r.se === 0 && r.dr === 0 && r.sf === -1 && r.b === '', r);
  check('7b. ...its last touch and longest gap unmoved (not reopened)', old[C.u] === held[C.u] && old[C.g] === 0 && !(Array.isArray(ps._econ.sh) && ps._econ.sh.length), { u: old[C.u], g: old[C.g], sh: ps._econ.sh });
  await close(room, ws);
  clock.advance(1000);
  const ws2 = fakeWs('week2');
  const t1 = clock.now();
  await join(room, ws2, pid, { loginTaken: true }); await settle();
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  const ps2 = live(room, pid);
  const sh = ps2._econ.sh || [];
  check('7b. the next join (on) closes the week-old card whole', sh.length === 1 && sh[0][C.t] === held[C.t] && sh[0][C.mv] === 4 && sh[0][C.u] === held[C.u], sh);
  check('7b. ...and opens a new one at this join (its stint the actor\'s)', ps2._econ.s && ps2._econ.s[C.t] >= t1 && ps2._econ.s[C.t] === sessOf(room, ws2).actor.stint, { s: ps2._econ.s && ps2._econ.s[C.t], a: sessOf(room, ws2).actor });
  const mv2 = (x, y) => room.webSocketMessage(ws2, JSON.stringify({ type: 'move', x, y, z: ps2.z }));
  for (let i = 0; i < 3; i++) { clock.advance(1000); await mv2(ps2.x + 20, ps2.y); }
  check('7b. ...which counts this sitting\'s moves', sitRead(ps2._econ.s).mv === 3, sitRead(ps2._econ.s));
  /* and a join that opens nothing forgets the card the last one took */
  room._liveFlags.sitting = false;
  sitOpen(room, ps2, null, clock.now());
  delete room._liveFlags.sitting;
  sitMove(room, ps2, clock.now(), false);
  check('7b. a join with the flag off: the card the last join took counts no more', sitRead(ps2._econ.s).mv === 3, sitRead(ps2._econ.s));
  /* the whole of it through the room: a sitting on (its card taken), the
     socket gone, a rejoin with the flag off, the flag on again, moves */
  const ws3 = fakeWs('week3');
  await close(room, ws2); clock.advance(1000);
  await join(room, ws3, pid, { loginTaken: true }); await settle();
  const ps3 = live(room, pid);
  const mv3 = (x, y) => room.webSocketMessage(ws3, JSON.stringify({ type: 'move', x, y, z: ps3.z }));
  clock.advance(1000); await mv3(ps3.x + 20, ps3.y);
  const card3 = ps3._econ.s, n3 = sitRead(card3).mv;
  check('7b. a rejoin with the flag on: its card counts', n3 >= 1, sitRead(card3));
  const ws4 = fakeWs('week4');
  clock.advance(1000);   /* the socket not closed first: a second phone takes the body over (join.js's kept body) */
  room._liveFlags.sitting = false;
  room._bodyTakeWants = () => true;   /* the takeover's one decision (bodytake.js: a phone that can be placed, a body in a fight) */
  await join(room, ws4, pid, { loginTaken: true }); await settle();
  delete room._bodyTakeWants;
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  delete room._liveFlags.sitting;
  const ps4 = live(room, pid);
  const mv4 = (x, y) => room.webSocketMessage(ws4, JSON.stringify({ type: 'move', x, y, z: ps4.z }));
  const n4 = sitRead(ps4._econ.s).mv;
  for (let i = 0; i < 3; i++) { clock.advance(1000); await mv4(ps4.x + 20, ps4.y); }
  check('7b. ...then the body taken over with the flag off, thrown on: its card counts nothing more', ps4 === ps3 && ps4._econ.s === card3 && sitRead(card3).mv === n4 && n4 === n3, { kept: ps4 === ps3, same: ps4._econ.s === card3, mv: sitRead(ps4._econ.s).mv, n4, n3 });
  await close(room, ws4);
}

/* ══════════ 8. A NEWER `_econ` ══════════ */
{
  const pid = 'bp_sit_new';
  const st = makeStorage(seed([pid], 50, { _econ: { v: 3, future: { x: 1 } } }));
  const room = await openRoom(st);
  const ws = fakeWs('new');
  await join(room, ws, pid, { loginTaken: true }); await settle();
  const e = live(room, pid)._econ;
  check('8. a NEWER `_econ` (a rolled-back worker): left whole, no card opened', e.v === 3 && !('s' in e) && JSON.stringify(e) === '{"v":3,"future":{"x":1}}', e);
  sitMove(room, live(room, pid), clock.now(), false);
  check('8. ...and nothing counted into it', JSON.stringify(e) === '{"v":3,"future":{"x":1}}');
  check('8. ...the actor takes a stint of its own', typeof sessOf(room, ws).actor.stint === 'number');
}

/* ══════════ 9. THE ROOM'S OWN PATHS HAND IT THEIR FACTS ══════════
   (the orchestrator's yes for movement.js, combat.js + hitproof.js, gold.js:
   one call each, memory only, deciding nothing) */
{
  const play = async (flags) => {
    const pid = 'bp_sit_room';
    const st = makeStorage(seed([pid], 500));
    const room = await openRoom(st, flags);
    const ws = fakeWs('room');
    await join(room, ws, pid, { loginTaken: true }); await settle();
    if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
    const ps = live(room, pid);
    const mv = (x, y) => room.webSocketMessage(ws, JSON.stringify({ type: 'move', x, y, z: ps.z }));
    const path = [];
    for (let i = 0; i < 12; i++) { clock.advance(100); await mv(ps.x + 30, ps.y); path.push([Math.round(ps.x), Math.round(ps.y)]); }
    clock.advance(100); await mv(ps.x + 5000, ps.y);   /* past what the budget covers */
    path.push([Math.round(ps.x), Math.round(ps.y)]);
    /* a hit: claimed on a monster of the player's zone, far away (refused: `far`) */
    const near = { id: 'm_sit_near', x: ps.x + 10, y: ps.y, alive: true, hp: 50, maxHp: 50, level: 1 };
    room.monsters[ps.z] = [near];
    const m = near;
    const hpBefore = near.hp;
    const hit = (id, slot) => room.webSocketMessage(ws, JSON.stringify({ type: 'monster_damage', payload: { monsterId: id, zone: ps.z, element: null, slot, special: false } }));
    ps.rangedWeapon = null;
    await hit(near.id, 'ranged');   /* no bow in the worker's own slot: refused `noWeapon` (hitproof.js) */
    clock.advance(1000); await hit(near.id, 'melee');
    room._goldGive(ps, 40, 'quest_reward');
    room._goldTake(ps, 15, 'weapon_forge');
    return { room, ps, path, m: !!m, monsterHp: [hpBefore, 0, near.hp], coins: ps.coins, st };
  };
  const on = await play(null), off = await play({ sitting: false });
  const r = sitRead(on.ps._econ.s);
  check('9. thirteen judged moves counted by movement.js, one over the budget', r && r.mv === 13 && r.mo === 1, r);
  check('9. a move\'s outcome is the same with `sitting: false` as with the card (the same path, place by place)', JSON.stringify(on.path) === JSON.stringify(off.path), { on: on.path.slice(-2), off: off.path.slice(-2) });
  check('9. a monster to claim a hit on is in the world', on.m);
  check('9. two hits claimed, the bow with no bow refused `noWeapon` (combat.js, hitproof.js)', r && r.hc === 2 && r.hr.noWeapon === 1, r);
  check('9. ...the near one landed: counted landed, and the monster hurt', r && r.hl === 1 && on.monsterHp[2] < 50, { hl: r && r.hl, hp: on.monsterHp });
  check('9. ...the hits\' outcomes the same without the card (the refused one nothing, the other landed: its roll is the dice\'s)', on.monsterHp[0] === off.monsterHp[0] && (on.monsterHp[2] < 50) === (off.monsterHp[2] < 50), { on: on.monsterHp, off: off.monsterHp });
  check('9. gold through the door, by its road\'s class (gold.js): 40 minted, 15 burned', r && r.gd.mint === 40 && r.gd.burn === -15, r && r.gd);
  check('9. ...the purse the same without the card', on.coins === off.coins, { on: on.coins, off: off.coins });
  check('9. `sitting: false`: none of it counted', !Array.isArray(off.ps._econ.s));
  check('9. the report\'s facts (soft, build, seen, drawn) are not handed yet: report.js is card PH\'s (the orchestrator, 2026-11-23)', r && r.sf === -1 && r.b === '' && r.se === 0 && r.dr === 0);
}

/* ══════════ 10. A TEST-MODE CHARACTER'S MOVES ARE ACTIVITY TOO ══════════
   (the orchestrator's yes, 2026-11-24: test mode judges no move, so before
   this the owner's sittings counted no active second from walking) */
{
  const pid = 'bp_sit_tm';
  const st = makeStorage(seed([pid], 0));
  st._store.set('testmode:' + pid, { v: 1, on: true, at: 1, name: 'tm' });
  const room = await openRoom(st, null);
  const ws = fakeWs('tm');
  await join(room, ws, pid, { loginTaken: true }); await settle();
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  const ps = live(room, pid);
  const mv = (x, y) => room.webSocketMessage(ws, JSON.stringify({ type: 'move', x, y, z: ps.z }));
  for (let i = 0; i < 6; i++) { clock.advance(1000); await mv(ps.x + 30, ps.y); }
  clock.advance(1000); await mv(ps.x + 5000, ps.y);   /* far: test mode takes it, and no budget to be over */
  const r = sitRead(ps._econ.s);
  check('10. the character is in test mode (its moves judged by nothing)', room._testMode(ps) === true);
  check('10. seven test-mode moves counted, none over a budget', r && r.mv === 7 && r.mo === 0, r);
  check('10. ...and their seconds active (a second apart: six, the first move\'s from the join\'s touch)', r && r.a >= 6, r && r.a);
}

clock.uninstall && clock.uninstall();
console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
