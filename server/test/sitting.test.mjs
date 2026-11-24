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
 *  7c. THROWN OFF AND ON, ONE SOCKET, NO REJOIN (sitting 60's review,
 *      v2.3.6484): a sitting counting, the flag thrown off through the
 *      live flags' route, a week, thrown on (cleared, or set true): its card
 *      counts nothing more (no week-long gap, no moves), the next join
 *      closes it whole; set on while on, or off while off, the card the
 *      join took goes on counting (liveops.js -> sitting.js sitFlagSet).
 *   8. A NEWER `_econ` (a rolled-back worker) is left whole: no card.
 *   9. THE ROOM'S OWN PATHS: judged moves and moves over the budget
 *      (movement.js), hits claimed, landed and refused by reason (combat.js,
 *      hitproof.js), gold by its road's class (gold.js) reach the card
 *      through one call each, and a move's, a hit's and the purse's outcome
 *      is the same with `sitting: false`.  The report's facts are not
 *      handed yet (report.js is card PH's: the orchestrator, 2026-11-23).
 *  10. A TEST-MODE CHARACTER'S MOVES are activity too (counted, never over).
 * 10b. (v2.3.6483) a test-mode move counted with no recording running.
 *  11. THE MEND (v2.3.6483, sitting 59's mend), each played in the room:
 *      a. a sitting longer than the gap, back inside it, goes on (the gap
 *         from the last touch, never the start);
 *      b. a body taken over with the flag ON: its card goes on, the new
 *         socket's actor on its stint (two characters);
 *      c. every refusal (noWeapon, far, rate, shot, swing) reaches the
 *         card by its reason, exactly the room's own count;
 *      d. gold of every class (mint, burn, move, escrow, a purse set);
 *      e. a leave is a touch: no active seconds, no hour of the day;
 *      f. `sitting: false` thrown mid-sitting and back on, no rejoin;
 *      g. two players in one room: each card its own;
 *      h. the touch's arithmetic exactly (IDLE_MS and +1 ms, a 1 ms gap,
 *         the longest gap past 1000 s, the hours, a reconnect at GAP_MS - 1
 *         and at GAP_MS, the network kept or updated);
 *      i. a clock behind the card's last touch moves nothing back;
 *      j. a brand-new character's card at its first join; two joins in one
 *         ms, two stints; the cap read at each join.
 *  12. THE HELPERS' EDGES (v2.3.6483): direct calls on what the room never
 *      hands them (no room, no record, no clock, a word or class not on the
 *      lists, the report's facts, the numbers).
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
 * ...and the reviewer's green plants of sitting 59, red since (v2.3.6483):
 *   sitting.js sitOpen: the gap from the start (`t - cur[C.t]`) -> FAIL 11a
 *     and 11h;
 *   join.js: the kept body's `_sitStint = _sitJoin(...)` taken out -> FAIL
 *     11b (and 7b);
 *   combat.js: `attackerPs` dropped from any one `_hpTally` -> FAIL 11c;
 *   gold.js econGold: sitGold moved below the mint/burn-only return -> FAIL
 *     11d;
 *   sitting.js sitTouch: `touch(..., true)` -> FAIL 11e.
 *   The mutation pass's other survivors are listed, with why, in the
 *   card's notes (sa-listed).
 */
import { makeStorage, openRoom, join, fakeWs, settle, seededClock, baseSession } from './testroom.mjs';
import { SIT, sitBlank, sitOneClean, sitCleanInto, sitOpen, sitMove, sitHit, sitGold, sitReport, sitTouch, sitRead, sitOff, sitForget } from '../src/sitting.js';
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

/* ══════════ 7c. THROWN OFF AND ON, ONE SOCKET, NO REJOIN (sitting 60's review) ══════════ */
for (const how of ['clear', 'true']) {
  const pid = 'bp_sit_flip_' + how;
  const st = makeStorage(seed([pid], 50));
  const room = await openRoom(st);
  room._adminLog = async () => {};
  const flag = (method, value) => room._liveopsRoutes(
    new Request('http://x/flags' + (method === 'DELETE' ? '?name=sitting' : ''), method === 'DELETE' ? { method } : { method, body: JSON.stringify({ name: 'sitting', value }) }),
    new URL('http://x/flags' + (method === 'DELETE' ? '?name=sitting' : '')), '/flags', (o) => o);
  const ws = fakeWs('flip' + how);
  await join(room, ws, pid, { loginTaken: true }); await settle();
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  const ps = live(room, pid);
  const mv = (x, y) => room.webSocketMessage(ws, JSON.stringify({ type: 'move', x, y, z: ps.z }));
  for (let i = 0; i < 3; i++) { clock.advance(1000); await mv(ps.x + 20, ps.y); }
  const card = ps._econ.s;
  check(`7c (${how}). the sitting counts before the switch`, card && sitRead(card).mv === 3, card && sitRead(card));
  /* set on while on: nothing forgotten */
  await flag('POST', true);
  clock.advance(1000); await mv(ps.x + 20, ps.y);
  check(`7c (${how}). \`sitting: true\` set while on: the card goes on counting`, ps._econ.s === card && sitRead(card).mv === 4, sitRead(card));
  if (how === 'clear') await flag('DELETE');
  const u0 = card[SIT.COL.u], g0 = card[SIT.COL.g], a0 = card[SIT.COL.a];
  await flag('POST', false);
  check(`7c (${how}). thrown off through the route`, sitOff(room) === true);
  clock.advance(7 * 86400e3);
  await mv(ps.x + 20, ps.y);
  await flag('POST', false);   /* off while off: nothing new */
  if (how === 'clear') await flag('DELETE'); else await flag('POST', true);
  check(`7c (${how}). thrown back on, the same socket, no rejoin`, sitOff(room) === false && live(room, pid) === ps);
  for (let i = 0; i < 3; i++) { clock.advance(1000); await mv(ps.x + 20, ps.y); }
  sitHit(room, ps, 'claim', clock.now()); sitTouch(room, ps, clock.now());
  const r = sitRead(card);
  check(`7c (${how}). ...the card counts nothing more: no move, no hit`, ps._econ.s === card && r.mv === 4 && r.hc === 0, r);
  check(`7c (${how}). ...no week-long gap, its last touch and active time unmoved`, card[SIT.COL.g] === g0 && g0 < 300 && card[SIT.COL.u] === u0 && card[SIT.COL.a] === a0, { g: card[SIT.COL.g], g0, u: card[SIT.COL.u] - u0, a: card[SIT.COL.a] - a0 });
  await close(room, ws);
  clock.advance(1000);
  const ws2 = fakeWs('flip2' + how);
  await join(room, ws2, pid, { loginTaken: true }); await settle();
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  const ps2 = live(room, pid);
  const sh = ps2._econ.sh || [];
  /* closed as its last save left it (a count after the last save is not kept: WHO's status, Found) */
  check(`7c (${how}). the next join closes it (no week-long gap) and opens a new one`, sh.length === 1 && sh[0][SIT.COL.t] === card[SIT.COL.t] && sh[0][SIT.COL.g] < 300 && ps2._econ.s && ps2._econ.s[SIT.COL.t] !== card[SIT.COL.t], { sh, s: ps2._econ.s });
  const mv2 = (x, y) => room.webSocketMessage(ws2, JSON.stringify({ type: 'move', x, y, z: ps2.z }));
  for (let i = 0; i < 2; i++) { clock.advance(1000); await mv2(ps2.x + 20, ps2.y); }
  check(`7c (${how}). ...which counts`, sitRead(ps2._econ.s).mv === 2, sitRead(ps2._econ.s));
  await close(room, ws2);
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
/* v2.3.6483 (sitting 59's mend; a plant of the WHO session's own stayed
   green): a test-mode move counts on the card whether or not a recording
   runs (playtrace.js).  §10 above always had one (its join begins it), so a
   count gated on `ps._trace` passed; here the recording is switched off
   (`playtrace: false`) and, on a second character, already ended. */
{
  const play = async (pid, flags, endFirst) => {
    const st = makeStorage(seed([pid], 0));
    st._store.set('testmode:' + pid, { v: 1, on: true, at: 1, name: 'tm' });
    const room = await openRoom(st, flags);
    const ws = fakeWs(pid);
    await join(room, ws, pid, { loginTaken: true }); await settle();
    if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
    const ps = live(room, pid);
    if (endFirst && ps._trace) delete ps._trace;   /* the recording over (its ten minutes, its size) */
    const mv = (x, y) => room.webSocketMessage(ws, JSON.stringify({ type: 'move', x, y, z: ps.z }));
    for (let i = 0; i < 4; i++) { clock.advance(1000); await mv(ps.x + 30, ps.y); }
    return { r: sitRead(ps._econ.s), rec: !!ps._trace };
  };
  const off = await play('bp_sit_tm_nr', { playtrace: false }, false);
  check('10b. `playtrace: false`: a test-mode sitting\'s moves still counted on its card', !off.rec && off.r && off.r.mv === 4 && off.r.a >= 4, off);
  const done = await play('bp_sit_tm_done', null, true);
  check('10b. ...and after its recording ended', !done.rec && done.r && done.r.mv === 4 && done.r.a >= 4, done);
}

/* ══════════ 11. THE MEND: EACH HOLD PLAYED IN THE ROOM (v2.3.6483) ══════════
   sitting 59's mend: the reviewer's green plants and the mutation pass's
   survivors, each driven through the real path in the running room (a
   join, a move, a hit, the gold door, a leave) and read off the card. */
const H = 3600e3;
const still = (room) => { if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; } };
/* the clock moved to `before` ms short of the next UTC hour */
const toHour = (before) => { let d = H - (clock.now() % H) - before; if (d <= 0) d += H; clock.advance(d); };
const bit = (t) => 1 << new Date(t).getUTCHours();
/* a join on a socket whose network is `asn` (index.js: request.cf.asn on the session) */
async function joinOn(room, ws, pid, asn) {
  await room.state.storage.put('cadence:login:' + pid, { period: room._cadencePeriodDaily(), streak: 1, ts: Date.now() });
  room.sessions.set(ws, Object.assign(baseSession(), asn ? { asn } : {}));
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: pid, name: pid.slice(3, 12), phrase: 'p-' + pid, protocolVersion: 2, ws: [1, 5], data: { x: 100, y: 100, z: 'town' } }));
  await settle(); still(room);
}
const mover = (room, ws, pid) => async (dx) => { const ps = live(room, pid); await room.webSocketMessage(ws, JSON.stringify({ type: 'move', x: ps.x + (dx || 20), y: ps.y, z: ps.z })); };
/* a monster of the player's zone, near (a sword reaches it) or far */
const monstersBy = (room, pid) => { const ps = live(room, pid); const near = { id: 'm_' + pid + '_near', x: ps.x + 10, y: ps.y, alive: true, hp: 1e6, maxHp: 1e6, level: 1 }; const far = { id: 'm_' + pid + '_far', x: ps.x + 20000, y: ps.y, alive: true, hp: 1e6, maxHp: 1e6, level: 1 }; room.monsters[ps.z] = (room.monsters[ps.z] || []).filter((m) => m.id !== near.id && m.id !== far.id).concat([near, far]); return { near, far }; };
const hitter = (room, ws, pid) => (id, slot) => room.webSocketMessage(ws, JSON.stringify({ type: 'monster_damage', payload: { monsterId: id, zone: live(room, pid).z, element: null, slot, special: false } }));
const BOW = () => ({ name: 'Pine Bow', type: 'bow', gearBase: 'ww_pine', quality: 'normal', tierMult: 1 });
const leaveSaved = async (room, ws, pid) => { live(room, pid)._regenDirty = true; await close(room, ws); };   /* the close's own save carries the card (§4) */

{
  /* 11a. A SITTING LONGER THAN THE GAP, back inside the gap: it goes on.
     The gap is measured from the card's last touch, never from its start
     (a plant measuring `t - cur[C.t]` was green: every reconnect in the
     suite came inside five minutes of the join). */
  const pid = 'bp_sit_long';
  const st = makeStorage(seed([pid], 50));
  const room = await openRoom(st);
  const ws = fakeWs('long1');
  await joinOn(room, ws, pid); 
  const stint = live(room, pid)._econ.s[C.t];
  const mv = mover(room, ws, pid);
  for (let i = 0; i < 13; i++) { clock.advance(30e3); await mv(); }   /* six and a half minutes of play */
  await leaveSaved(room, ws, pid);
  clock.advance(10e3);
  const ws2 = fakeWs('long2');
  await joinOn(room, ws2, pid);
  const e = live(room, pid)._econ;
  check('11a. a sitting of six and a half minutes, back 10 s after its leave: the same sitting (the gap from the last touch, not from the start)', e.s[C.t] === stint && sessOf(room, ws2).actor.stint === stint && !(e.sh && e.sh.length) && e.s[C.mv] === 13, { t: e.s[C.t], stint, sh: e.sh && e.sh.length, mv: e.s[C.mv] });
  check('11a. ...its longest gap the 30 s between moves (the reconnect\'s 10 s from the leave)', e.s[C.g] === 30, e.s[C.g]);
  await close(room, ws2);
}

{
  /* 11b. A BODY TAKEN OVER WITH THE FLAG ON (join.js's kept body): the
     sitting goes on, the new socket's actor on the card's stint, and the
     card still counts.  Two characters, one after the other (a plant
     deleting the kept body's `_sitStint = _sitJoin(...)` was green: only
     the flag-off takeover was played, §7b). */
  const ids = ['bp_sit_take1', 'bp_sit_take2'];
  const st = makeStorage(seed(ids, 50));
  const room = await openRoom(st);
  const got = [];
  for (const pid of ids) {
    const w1 = fakeWs(pid + '1'), w2 = fakeWs(pid + '2');
    await joinOn(room, w1, pid);
    const ps1 = live(room, pid), card = ps1._econ.s, s1 = sessOf(room, w1).actor.stint;
    const { near } = monstersBy(room, pid);
    clock.advance(1000); await mover(room, w1, pid)();
    clock.advance(1000); await hitter(room, w1, pid)(near.id, 'melee');   /* a claim and gold before the takeover... */
    room._goldGive(ps1, 5, 'quest_reward');
    clock.advance(1000);
    room._bodyTakeWants = () => true;   /* the takeover's one decision (bodytake.js), as §7b */
    await joinOn(room, w2, pid);
    delete room._bodyTakeWants;
    const ps2 = live(room, pid);
    const a2 = sessOf(room, w2).actor.stint;
    const mv2 = mover(room, w2, pid);
    for (let i = 0; i < 2; i++) { clock.advance(1000); await mv2(); }
    clock.advance(1000); await hitter(room, w2, pid)(near.id, 'melee');   /* ...and after it, into the card the takeover carried on */
    room._goldGive(ps2, 7, 'quest_reward');
    clock.advance(1000);
    const tLeave = clock.now(), cur = ps2._econ.s;
    await close(room, w2);
    got.push({ kept: ps2 === ps1, s1, a2, t: cur[C.t], was: card[C.t], mv: cur[C.mv], hc: cur[C.hc], mint: cur[C.gd][0], u: cur[C.u], tLeave });
    clock.advance(1000);
  }
  check('11b. a body taken over with the flag on: the kept body, its card goes on, the new socket\'s actor on the card\'s stint (each of two characters)', got.length === 2 && got.every((g) => g.kept && g.was === g.t && g.a2 === g.t && g.s1 === g.t) && got[0].t !== got[1].t, got);
  check('11b. ...and the card counts the moves, claims and gold of both sockets (1 + 2 moves, 1 + 1 claims, 5 + 7 minted)', got.every((g) => g.mv === 3 && g.hc === 2 && g.mint === 12), got.map((g) => [g.mv, g.hc, g.mint]));
  check('11b. ...and the second socket\'s leave touches the card it carried on', got.every((g) => g.u === g.tLeave), got.map((g) => [g.u, g.tLeave]));
}

{
  /* 11c. EVERY REFUSAL, BY ITS REASON, PLAYED IN THE ROOM (combat.js hands
     `attackerPs` to each `_hpTally`; hitproof.js hands it on): the card's
     `hr` is the room's own count of each, the claims all counted.  A plant
     dropping `attackerPs` from any one of the five was green but noWeapon's. */
  const pid = 'bp_sit_refuse';
  const st = makeStorage(seed([pid], 50));
  const room = await openRoom(st, { swordswing: true, bowshot: true });   /* the two opt-ins whose refusals are `swing` and `shot` */
  const ws = fakeWs('refuse');
  await joinOn(room, ws, pid);
  const ps = live(room, pid);
  const { near, far } = monstersBy(room, pid);
  const hit = hitter(room, ws, pid);
  const c0 = { ...(room._hpCount || {}) };
  let claims = 0;
  ps.rangedWeapon = null;
  await hit(near.id, 'ranged'); claims++;                        /* noWeapon */
  ps.rangedWeapon = BOW();
  clock.advance(1000); await hit(far.id, 'ranged'); claims++;    /* far */
  for (let i = 0; i < 20; i++) { await hit(near.id, 'ranged'); claims++; }   /* shot, then rate */
  clock.advance(5000);
  for (let i = 0; i < 6; i++) { await hit(near.id, 'melee'); claims++; }     /* swing */
  const r = sitRead(ps._econ.s);
  const room5 = Object.fromEntries(SIT.REFUSALS.map((k) => [k, ((room._hpCount || {})[k] || 0) - (c0[k] || 0)]));
  check('11c. each of the five refusals happened in the room', SIT.REFUSALS.every((k) => room5[k] > 0), room5);
  check('11c. ...and each reached the card by its reason, exactly the room\'s count', !!r && JSON.stringify(r.hr) === JSON.stringify(room5), { card: r && r.hr, room: room5 });
  check('11c. ...every claim counted', !!r && r.hc === claims, { hc: r && r.hc, claims });
  check('11c. ...and what landed (the claims not refused) counted landed', !!r && r.hl >= 1 && r.hl <= claims - SIT.REFUSALS.reduce((n, k) => n + room5[k], 0), r && r.hl);
  await close(room, ws);
}

{
  /* 11d. GOLD OF EVERY CLASS THROUGH THE DOOR (gold.js econGold hands the
     card every road's class before its mint/burn-only return): mint, burn,
     move and escrow, and a purse SET (its road's class).  A plant moving
     the sitGold call below that return was green: only mint and burn
     were played. */
  const pid = 'bp_sit_gold';
  const st = makeStorage(seed([pid], 500));
  const room = await openRoom(st);
  const ws = fakeWs('gold');
  await joinOn(room, ws, pid);
  const ps = live(room, pid);
  room._goldGive(ps, 40, 'quest_reward');      /* mint */
  room._goldTake(ps, 15, 'weapon_forge');      /* burn */
  room._goldTake(ps, 11, 'trade_window');      /* move */
  room._goldTake(ps, 7, 'bank_deposit');       /* escrow */
  room._goldGive(ps, 3, 'bank_withdraw');      /* escrow back */
  room._goldSet(ps, ps.coins - 5, 'nml_loss'); /* a purse set: its road's class, move */
  const r = sitRead(ps._econ.s);
  check('11d. gold of every class reaches the card by its road\'s class (mint 40, burn -15, move -16, escrow -4)', !!r && JSON.stringify(r.gd) === '{"mint":40,"burn":-15,"move":-16,"escrow":-4}', r && r.gd);
  check('11d. ...the purse paid as the door pays it', ps.coins === 500 + 40 - 15 - 11 - 7 + 3 - 5, ps.coins);
  await close(room, ws);
}

{
  /* 11e. A LEAVE IS A TOUCH, NOT AN ACTIVITY (leave.js sitTouch): its
     moment is the card's last touch and its gap counts, but it adds no
     active seconds and no hour of the day.  Played across an hour's turn:
     a move 20 s before it, the leave 30 s after the move. */
  const pid = 'bp_sit_leave';
  const st = makeStorage(seed([pid], 50));
  const room = await openRoom(st);
  const ws = fakeWs('leave');
  await joinOn(room, ws, pid);
  const ps = live(room, pid);
  toHour(20e3);
  await mover(room, ws, pid)();
  const tMove = clock.now(), a0 = ps._econ.s[C.a], hh0 = ps._econ.s[C.hh];
  clock.advance(30e3);
  const tLeave = clock.now();
  const card = ps._econ.s;
  await close(room, ws);
  check('11e. a leave 30 s after a move: the card\'s last touch is the leave\'s moment, its gap the 30 s', card[C.u] === tLeave && card[C.g] >= 30, { u: card[C.u], tLeave, g: card[C.g] });
  check('11e. ...no active seconds added by the leave', card[C.a] === a0, { a: card[C.a], a0 });
  check('11e. ...and no hour of the day (the leave\'s hour is the next one; only the move\'s is set)', card[C.hh] === hh0 && (card[C.hh] & bit(tMove)) !== 0 && (card[C.hh] & bit(tLeave)) === 0, card[C.hh].toString(2));
}

{
  /* 11f. THE FLAG THROWN MID-SITTING: `sitting: false` thrown while a card
     is the sitting's, then back on, with no rejoin.  Off: the real moves,
     claims, refusals, gold and the leave count nothing (each fact's own
     sitOff test); on again: the same card counts again. */
  const pid = 'bp_sit_mid';
  const st = makeStorage(seed([pid], 500));
  const room = await openRoom(st);
  const ws = fakeWs('mid');
  await joinOn(room, ws, pid);
  const ps = live(room, pid);
  const card = ps._econ.s;
  const mv = mover(room, ws, pid), hit = hitter(room, ws, pid);
  const { near } = monstersBy(room, pid);
  const play = async () => {
    clock.advance(2000); await mv();
    clock.advance(2000); await hit(near.id, 'melee');
    ps.rangedWeapon = null; await hit(near.id, 'ranged');   /* refused: noWeapon */
    room._goldGive(ps, 10, 'quest_reward');
  };
  await play();
  const k1 = JSON.stringify(card);
  room._liveFlags.sitting = false;
  await play();
  const k2 = JSON.stringify(card);
  check('11f. thrown off mid-sitting: a move, a claim, a refusal and gold count nothing (the card as it was, its last touch too)', k2 === k1 && ps._econ.s === card, { before: k1, after: k2 });
  delete room._liveFlags.sitting;
  await play();
  const r = sitRead(card);
  check('11f. thrown back on: the same card counts again (2 moves, 4 claims, 2 refused, 20 minted)', ps._econ.s === card && r.mv === 2 && r.hc === 4 && r.hr.noWeapon === 2 && r.gd.mint === 20, r);
  const u1 = card[C.u];
  room._liveFlags.sitting = false;
  clock.advance(5000);
  await close(room, ws);
  check('11f. ...and a leave while off touches nothing', card[C.u] === u1, { u: card[C.u], u1 });
  delete room._liveFlags.sitting;
  /* ...then back on, the same room: a rejoin and a leave touch again */
  clock.advance(1000);
  const wsf = fakeWs('mid2');
  await joinOn(room, wsf, pid);
  const cardF = live(room, pid)._econ.s;
  clock.advance(5000);
  const tF = clock.now();
  await close(room, wsf);
  check('11f. ...on again, a later leave in the same room touches its card', cardF[C.u] === tF, { u: cardF[C.u], tF });
}

{
  /* 11g. TWO PLAYERS IN ONE ROOM: each card counts its own player's moves,
     claims, refusals, gold and leave, never the other's. */
  const A = 'bp_sit_two_a', B = 'bp_sit_two_b';
  const st = makeStorage(seed([A, B], 500));
  const room = await openRoom(st);
  const wa = fakeWs('two_a'), wb = fakeWs('two_b');
  await joinOn(room, wa, A);
  await joinOn(room, wb, B);
  const pa = live(room, A), pb = live(room, B);
  const ma = mover(room, wa, A), mb = mover(room, wb, B), ha = hitter(room, wa, A), hb = hitter(room, wb, B);
  const na = monstersBy(room, A).near;
  for (let i = 0; i < 3; i++) { clock.advance(1000); await ma(); }
  for (let i = 0; i < 5; i++) { clock.advance(1000); await mb(); }
  clock.advance(1000); await ha(na.id, 'melee'); clock.advance(1000); await ha(na.id, 'melee');
  pb.rangedWeapon = null; await hb(na.id, 'ranged');
  room._goldGive(pa, 10, 'quest_reward'); room._goldTake(pb, 4, 'weapon_forge');
  const ub = pb._econ.s[C.u];
  clock.advance(1000);
  const tA = clock.now();
  const ca = pa._econ.s;
  await close(room, wa);
  const ra = sitRead(ca), rb = sitRead(pb._econ.s);
  check('11g. two players: A\'s card A\'s own (3 moves, 2 claims, none refused, 10 minted)', ra.mv === 3 && ra.hc === 2 && ra.hr.noWeapon === 0 && ra.gd.mint === 10 && ra.gd.burn === 0, ra);
  check('11g. ...B\'s card B\'s own (5 moves, 1 claim refused noWeapon, 4 burned)', rb.mv === 5 && rb.hc === 1 && rb.hr.noWeapon === 1 && rb.gd.burn === -4 && rb.gd.mint === 0, rb);
  check('11g. ...A\'s leave touched A\'s card alone', ca[C.u] === tA && pb._econ.s[C.u] === ub, { a: ca[C.u], tA, b: pb._econ.s[C.u], ub });
  check('11g. ...two cards, two stints', ca[C.t] !== pb._econ.s[C.t]);
  /* the flag read at each leave: A left with it on, B leaves with it off */
  room._liveFlags.sitting = false;
  const cb = pb._econ.s, ub2 = cb[C.u];
  clock.advance(1000);
  await close(room, wb);
  delete room._liveFlags.sitting;
  check('11g. ...B leaving after A, with the flag thrown off between: B\'s card not touched', cb[C.u] === ub2, { u: cb[C.u], ub2 });
}

{
  /* 11h. THE TOUCH'S ARITHMETIC, EXACTLY, IN THE ROOM: a gap of IDLE_MS is
     active and one of IDLE_MS + 1 is not; a 1 ms gap counts its ms; the
     longest gap past a thousand seconds; the hours of the day the moves'
     own; a reconnect GAP_MS - 1 after the leave goes on (its gap the
     longest, no hour of its own) and one GAP_MS after is a new sitting; the
     network kept by a socket that names none and updated by one that names
     another. */
  const pid = 'bp_sit_math';
  const st = makeStorage(seed([pid], 50));
  const room = await openRoom(st);
  let ws = fakeWs('math1');
  await joinOn(room, ws, pid, 64496);
  let ps = live(room, pid);
  const s = ps._econ.s;
  check('11h. the join\'s network on the card', s[C.n] === 64496, s[C.n]);
  let mv = mover(room, ws, pid);
  let a = s[C.a], hh = s[C.hh], g = s[C.g], last = s[C.u];
  /* a move `gap` ms after the last touch; `active` what the card must make of it */
  const step = async (gap, active) => { clock.advance(gap); await mv(); const d = clock.now() - last; if (active) a = a + d / 1000; g = Math.max(g, Math.floor(d / 1000)); hh = hh | bit(clock.now()); last = clock.now(); };
  await step(1000, true);
  await step(SIT.IDLE_MS, true);          /* exactly the idle line: active */
  await step(SIT.IDLE_MS + 1, false);     /* a ms past it: not */
  check('11h. a gap of IDLE_MS is active time, one of IDLE_MS + 1 is not (the card\'s seconds exactly)', s[C.a] === a, { a: s[C.a], want: a });
  check('11h. ...the longest gap so far IDLE_MS + 1 (whole seconds)', s[C.g] === Math.floor((SIT.IDLE_MS + 1) / 1000), s[C.g]);
  /* a 1 ms gap: a claim 1 ms after a move */
  const { near } = monstersBy(room, pid);
  const tm = clock.now();
  clock.advance(1); await hitter(room, ws, pid)(near.id, 'melee');
  a = a + 1 / 1000; last = clock.now();
  check('11h. a claim 1 ms after a move: the card touched at that ms, its ms active', s[C.u] === tm + 1 && s[C.a] === a, { u: s[C.u], want: tm + 1, a: s[C.a], wantA: a });
  /* the longest gap past a thousand seconds: 1000 s, then 1001 s */
  await step(1000e3, false);
  check('11h. an idle of 1000 s: the longest gap 1000', s[C.g] === 1000, s[C.g]);
  await step(1001e3, false);
  check('11h. ...then one of 1001 s: the longest 1001', s[C.g] === 1001, s[C.g]);
  check('11h. the hours of the day: exactly the moves\' own', s[C.hh] === hh, { hh: s[C.hh].toString(2), want: hh.toString(2) });
  /* a reconnect GAP_MS - 1 after the leave, across an hour's turn */
  toHour(1000);
  await step(0, false);   /* the idle up to a second before the hour: a gap of its own */
  check('11h. ...the longest gap and the hours as the moves made them', s[C.g] === g && s[C.hh] === hh, { g: s[C.g], want: g });
  const stint = s[C.t];
  await leaveSaved(room, ws, pid);
  clock.advance(SIT.GAP_MS - 1);
  ws = fakeWs('math2');
  await joinOn(room, ws, pid);   /* no network named: the card's kept */
  ps = live(room, pid);
  const s2 = ps._econ.s;
  a = Math.round(a);   /* the card as stored: whole seconds (sitOneClean at the save) */
  check('11h. back GAP_MS - 1 after the leave: the same sitting', s2[C.t] === stint && sessOf(room, ws).actor.stint === stint && !(ps._econ.sh && ps._econ.sh.length), { t: s2[C.t], stint });
  check('11h. ...the reconnect a touch at its moment: no active seconds, no hour of its own (the next hour\'s), the longest gap as it was', s2[C.u] === clock.now() && s2[C.a] === a && s2[C.hh] === hh && (s2[C.hh] & bit(clock.now())) === 0 && s2[C.g] === Math.max(g, Math.floor((SIT.GAP_MS - 1) / 1000)), { g: s2[C.g], wantG: g, a: s2[C.a], wantA: a, u: s2[C.u], now: clock.now(), hh: s2[C.hh].toString(2), was: hh.toString(2), bitNow: bit(clock.now()) });
  check('11h. ...a socket naming no network keeps the card\'s', s2[C.n] === 64496, s2[C.n]);
  await leaveSaved(room, ws, pid);
  clock.advance(1000);
  ws = fakeWs('math3');
  await joinOn(room, ws, pid, 13335);
  check('11h. ...one naming another network: the card\'s is updated, the sitting the same', live(room, pid)._econ.s[C.n] === 13335 && live(room, pid)._econ.s[C.t] === stint, live(room, pid)._econ.s);
  await leaveSaved(room, ws, pid);
  clock.advance(SIT.GAP_MS);
  ws = fakeWs('math4');
  await joinOn(room, ws, pid, 7922);
  const e4 = live(room, pid)._econ;
  check('11h. back exactly GAP_MS after the leave: the sitting closed, a new one opened on this socket\'s network', (e4.sh || []).length === 1 && e4.sh[0][C.t] === stint && e4.s[C.t] > stint && e4.s[C.t] === sessOf(room, ws).actor.stint && e4.s[C.n] === 7922, { sh: (e4.sh || []).map((c) => c[C.t]), s: e4.s });
  await close(room, ws);
}

{
  /* 11i. A CLOCK BEHIND THE CARD (a deploy onto a worker whose clock is
     behind the last one's): the stored card's last touch is in the future.
     The join goes on with it and moves nothing back; a move before that
     moment counts the move but no time. */
  const pid = 'bp_sit_skew';
  const held = sitBlank(clock.now() - 60e3, 1); held[C.u] = clock.now() + 30e3; held[C.a] = 12;
  const st = makeStorage(seed([pid], 50, { _econ: { v: 2, g: { m: 0, b: 0 }, i: {}, s: held } }));
  const room = await openRoom(st);
  const ws = fakeWs('skew');
  await joinOn(room, ws, pid);
  const s = live(room, pid)._econ.s;
  check('11i. a card touched "in the future": the join goes on with it, its last touch not moved back', s[C.t] === held[C.t] && s[C.u] === held[C.u] && s[C.g] === 0, s);
  clock.advance(1000); await mover(room, ws, pid)();
  check('11i. ...a move before that moment: counted, no seconds, no touch moved back', s[C.mv] === 1 && s[C.a] === 12 && s[C.u] === held[C.u] && s[C.g] === 0, s);
  await close(room, ws);
}

{
  /* 11j. A BRAND-NEW CHARACTER (no record stored) gets its card at its first
     join, written by that join's save; no closed list made up for it.  And
     two joins in one ms: two sittings, two stints (actor.js stintNext). */
  const st = makeStorage();
  const room = await openRoom(st);
  const w1 = fakeWs('new1'), w2 = fakeWs('new2');
  const t0 = clock.now();
  await joinOn(room, w1, 'bp_sit_fresh1');
  await joinOn(room, w2, 'bp_sit_fresh2');   /* the clock has not moved */
  const e1 = live(room, 'bp_sit_fresh1')._econ, e2 = live(room, 'bp_sit_fresh2')._econ;
  const se = storedEcon(st, 'bp_sit_fresh1');
  check('11j. a brand-new character: a card at its first join, its stint the actor\'s, stored by the join\'s save', !!e1 && Array.isArray(e1.s) && e1.s[C.t] >= t0 && e1.s[C.t] === sessOf(room, w1).actor.stint && !!se && Array.isArray(se.s) && se.s[C.t] === e1.s[C.t], { e1, se });
  check('11j. ...and no closed list (nothing closed)', !('sh' in e1) && !(se && 'sh' in se), e1);
  check('11j. two joins in one ms: two stints, one a ms apart, each the actor\'s', !!e2 && e2.s[C.t] === e1.s[C.t] + 1 && e2.s[C.t] === sessOf(room, w2).actor.stint, { s1: e1.s[C.t], s2: e2 && e2.s[C.t] });
  /* the cap read at each join: on, off, on (one room) */
  const w3 = fakeWs('new3'), w4 = fakeWs('new4');
  room._liveFlags.sitting = false;
  await joinOn(room, w3, 'bp_sit_fresh3');
  delete room._liveFlags.sitting;
  await joinOn(room, w4, 'bp_sit_fresh4');
  check('11j. the cap read at each join in one room: `sitting: 1`, none with the flag off, `sitting: 1` again', (capsOf(w1) || {}).sitting === 1 && !!capsOf(w3) && capsOf(w3).sitting === undefined && (capsOf(w4) || {}).sitting === 1, [capsOf(w1) && capsOf(w1).sitting, capsOf(w3) && capsOf(w3).sitting, capsOf(w4) && capsOf(w4).sitting]);
}

/* ══════════ 12. THE CARD'S HELPERS ON WHAT THE ROOM NEVER HANDS THEM ══════════
   v2.3.6483 (sitting 59's mend): direct calls, each a guard or a bound the
   room's own paths never reach (they validate first, or the report's facts
   are not handed yet), held so taking one out is red. */
{
  check('12. the numbers: 16 columns, a five-minute gap, a one-minute idle line, 32 kept, 24 build characters', SIT.LEN === 16 && SIT.GAP_MS === 300000 && SIT.IDLE_MS === 60000 && SIT.KEEP === 32 && SIT.BUILD_MAX === 24 && SIT.NUM_MAX === 1e15 && sitBlank(T0, 0).length === 16);
  check('12. sitOff: a flag only the flags\' prototype holds is not thrown', sitOff({ _liveFlags: Object.create({ sitting: false }) }) === false && sitOff(null) === false && sitOff({ _liveFlags: { sitting: 0 } }) === false);
  const nets = [Infinity, -5, NaN, '5', 0, 1, 1.7, 64496].map((n) => sitBlank(T0, n)[C.n]);
  check('12. sitBlank\'s network: a positive finite number, whole; anything else 0', nets.join() === '0,0,0,0,0,1,1,64496', nets);
  const long = sitBlank(T0, 1); long[C.b] = 'abcdefghijklmnopqrstuvwxyz0123';
  check('12. sitOneClean: a build of 30 characters keeps its first 24', sitOneClean(long)[C.b] === 'abcdefghijklmnopqrstuvwx', sitOneClean(long)[C.b]);
  const back = sitBlank(T0, 1); back[C.u] = T0 - 5000; back[C.sf] = 0; back[C.hh] = (1 << 24) | 5;
  const bc = sitOneClean(back);
  check('12. ...a last touch before the start read as the start; soft 0 kept; the hours 24 bits', bc[C.u] === T0 && bc[C.sf] === 0 && bc[C.hh] === 5, bc);
  check('12. sitCleanInto: nothing to read leaves `out` as it was (no throw)', JSON.stringify(sitCleanInto({ v: 2 }, null)) === '{"v":2}' && JSON.stringify(sitCleanInto({ v: 2 }, 'x')) === '{"v":2}' && sitCleanInto(null, { s: sitBlank(T0, 0) }) === null);
  /* no room, no record: no throw, nothing counted */
  const rec = { _econ: { v: 2, g: { m: 0, b: 0 }, i: {} } };
  let threw = null;
  try { sitForget(null, rec); sitForget({ _liveFlags: {} }, null); sitMove(null, rec, T0, false); sitHit(null, rec, 'claim', T0); sitGold(null, rec, 'mint', 5); sitTouch(null, rec, T0); sitReport(null, rec, { seen: 1 }); } catch (e) { threw = String(e); }
  check('12. no room, or no record: no throw', threw === null, threw);
  /* sitOpen: no stint maker, no clock */
  const r1 = { _liveFlags: {} }, rec1 = { _econ: { v: 2, g: { m: 0, b: 0 }, i: {} } };
  const tA = T0 + 12345;
  check('12. sitOpen with no stint maker: the stint is the join\'s clock', sitOpen(r1, rec1, null, tA) === tA && rec1._econ.s[C.t] === tA);
  const rec2 = { _econ: { v: 2, g: { m: 0, b: 0 }, i: {} } };
  check('12. ...with no clock (not a finite number): the worker\'s', sitOpen(r1, rec2, null, undefined) === clock.now() && sitOpen({ _liveFlags: {} }, { _econ: { v: 2 } }, null, NaN, (x) => x) === clock.now());
  check('12. ...a record with no `_econ`, or none at all: nothing opened (null)', sitOpen(r1, {}, null, tA) === null && sitOpen(r1, null, null, tA) === null && sitOpen(r1, { _econ: 'x' }, null, tA) === null);
  /* the facts with no clock: the worker's */
  const r3 = { _liveFlags: {} }, rec3 = { _econ: { v: 2, g: { m: 0, b: 0 }, i: {} } };
  sitOpen(r3, rec3, null, clock.now() - 5000, (x) => x);
  const s3 = rec3._econ.s;
  sitMove(r3, rec3, undefined, false);
  const uMove = s3[C.u];
  s3[C.u] = clock.now() - 2000; sitHit(r3, rec3, 'claim');
  const uClaim = s3[C.u];
  s3[C.u] = clock.now() - 2000; sitTouch(r3, rec3, 'x');
  check('12. a move, a claim and a touch with no clock: touched at the worker\'s', uMove === clock.now() && uClaim === clock.now() && s3[C.u] === clock.now(), { uMove, uClaim, u: s3[C.u], now: clock.now() });
  /* a word not a refusal, a class not a class, gold not a number: nothing, not even a stray key */
  sitHit(r3, rec3, 'paid'); sitHit(r3, rec3, undefined);
  sitGold(r3, rec3, 'mint', 9); sitGold(r3, rec3, 'set', 9); sitGold(r3, rec3, 'mint', NaN); sitGold(r3, rec3, 'mint', Infinity); sitGold(r3, rec3, 'mint', 0);
  check('12. sitHit: a word not a refusal counts nothing (the list\'s five places only)', Object.keys(s3[C.hr]).join() === '0,1,2,3,4' && s3[C.hr].join() === '0,0,0,0,0', Object.keys(s3[C.hr]));
  check('12. sitGold: a class not a class, NaN, Infinity or 0: nothing (mint 9 only; the four places only)', Object.keys(s3[C.gd]).join() === '0,1,2,3' && s3[C.gd].join() === '9,0,0,0', s3[C.gd]);
  /* the report's facts (report.js hands none yet: card PH's) */
  let threw2 = null;
  try { sitReport(r3, rec3, null); sitReport(r3, rec3, 'x'); } catch (e) { threw2 = String(e); }
  sitReport(r3, rec3, { soft: 0, build: 'abécd', seen: 4, drawn: 7 });
  sitReport(r3, rec3, { soft: 2, build: '', seen: 0, drawn: 0 });
  sitReport(r3, rec3, { soft: '1', build: 5, seen: -3, drawn: -2 });
  sitReport(r3, rec3, { seen: NaN, drawn: Infinity });
  sitReport(r3, rec3, { build: 'x'.repeat(30), seen: 1, drawn: 1 });
  const rr = sitRead(s3);
  check('12. sitReport: soft 0 kept and 2 or "1" not; an empty or non-string build not; seen and drawn summed from positive finite numbers only; the build short ASCII', threw2 === null && rr.sf === 0 && rr.b === 'x'.repeat(24) && rr.se === 5 && rr.dr === 8, { threw2, rr });
  const rb = { _liveFlags: {} }, recb = { _econ: { v: 2, g: { m: 0, b: 0 }, i: {} } };
  sitOpen(rb, recb, null, T0, (x) => x);
  sitReport(rb, recb, { build: 'abécd' });
  check('12. ...a build\'s characters past ASCII dropped', recb._econ.s[C.b] === 'abcd', recb._econ.s[C.b]);
  /* the report's flag read at each report, and its card the record's latest join's */
  const rf = { _liveFlags: {} }, recf = { _econ: { v: 2, g: { m: 0, b: 0 }, i: {} } };
  sitOpen(rf, recf, null, T0, (x) => x);
  sitReport(rf, recf, { seen: 1 });
  rf._liveFlags.sitting = false; sitReport(rf, recf, { seen: 2 });
  delete rf._liveFlags.sitting; sitReport(rf, recf, { seen: 4 });
  check('12. sitReport: the flag read at each report (on 1, off 2 not, on 4)', recf._econ.s[C.se] === 5, recf._econ.s[C.se]);
  const firstCard = recf._econ.s;
  sitOpen(rf, recf, null, T0 + SIT.GAP_MS + 1, (x) => x);   /* past the gap: a new card */
  sitReport(rf, recf, { seen: 8 }); sitHit(rf, recf, 'far'); sitGold(rf, recf, 'burn', -3); sitTouch(rf, recf, T0 + SIT.GAP_MS + 9);
  const nc = recf._econ.s;
  check('12. ...after a new card is opened for the same record, the facts go to the new card, none to the old', nc !== firstCard && nc[C.se] === 8 && nc[C.hr][1] === 1 && nc[C.gd][1] === -3 && nc[C.u] === T0 + SIT.GAP_MS + 9 && firstCard[C.se] === 5 && firstCard[C.hr][1] === 0, { nc, firstCard });
  sitReport(rf, recf, { seen: Infinity, drawn: Infinity });
  check('12. ...seen or drawn Infinity counts nothing', nc[C.se] === 8 && nc[C.dr] === 0, nc);
  /* sitRead reads the card as it is now (a read, a count, a read) */
  const before = sitRead(nc).mv; sitMove(rf, recf, T0 + SIT.GAP_MS + 10, false);
  check('12. sitRead: the card as it is at each read', sitRead(nc).mv === before + 1, { before, after: sitRead(nc).mv });
  /* sitRead */
  const fresh = sitBlank(T0, 0); const fr = sitRead(fresh);
  const ra = sitBlank(T0, 0); ra[C.a] = 1.4; const rb2 = sitBlank(T0, 0); rb2[C.a] = 1.6;
  check('12. sitRead: what is not a card is null; a card never touched is 0 s long; active seconds whole', sitRead(null) === null && sitRead([1]) === null && fr.long === 0 && sitRead(ra).a === 1 && sitRead(rb2).a === 2, { long: fr.long });
}

clock.uninstall && clock.uninstall();
console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
