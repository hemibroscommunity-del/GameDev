/* ═══ v2.3.5723: A MOVE'S FIELDS HELD TO THEIR FORM (card K2 PR 4) ═══
 *
 * The second red team: a move's `d`, `f`, `eqc`, `eql`, `eqs`, `vx` and `vy`
 * (movement.js) were stored as sent and ticked to everyone near: a 10 KB
 * string or an object in a worn piece, `vx: 1e308`, went to every phone
 * around the sender with every tick; and `{"toString": 1}` in any of them
 * made the AFK signature (index.js _moveActivitySig) throw before the
 * handler, so the whole move was lost.  This holds:
 *
 *   1. a move with every field out of its form still moves the player, and
 *      each bad field is dropped (the facing and the pieces kept as they
 *      were, the velocity 0);
 *   2. `{ toString: 1 }` in a field: the move is not lost;
 *   3. an honest page's move (BroTown.jsx: 'left', 'northwest', 'none' or a
 *      piece's id, the velocity x 100) is stored exactly as before, a null
 *      facing keeps the last one and a null piece is taken;
 *   4. what the room keeps for the tick carries none of the bad values;
 *   5. `movefields: false`: stored as sent, as before.
 *
 * Red on main (v2.3.5719): 1, 2 and 4. */
import { makeStorage, openRoom, fakeWs, join, settle, seededClock } from './testroom.mjs';
import { MOVE_FIELDS } from '../src/movement.js';
import { LAST_PLACE } from '../src/lastplace.js';
import { wheelTable } from '../src/wheeltables.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
const quiet = async (f) => { const e = console.error, w = console.warn; console.error = () => {}; console.warn = () => {}; try { return await f(); } finally { console.error = e; console.warn = w; } };

const C = wheelTable(5).WHEEL_CENTRE;
const ARR = { x: C[0], y: C[1] + LAST_PLACE.ARRIVAL_DY };
const TEXT_MAX = (MOVE_FIELDS && MOVE_FIELDS.TEXT_MAX) || 48;

async function mover(flags) {
  const clock = seededClock().install();
  const room = await openRoom(makeStorage(), flags);
  const ws = fakeWs('m');
  await join(room, ws, 'bp_mf_a', { loginTaken: true, data: { x: ARR.x, y: ARR.y, z: 'wheel' } });
  const ps = room.playerState.bp_mf_a;
  ps.x = ARR.x; ps.y = ARR.y; ps.z = 'wheel';
  let x = ARR.x;
  const move = async (extra) => {
    clock.advance(100);
    x += 20;
    let threw = null;
    await quiet(async () => { try { await room.webSocketMessage(ws, JSON.stringify(Object.assign({ type: 'move', x, y: ARR.y, z: 'wheel' }, extra))); } catch (e) { threw = String(e && e.message); } });
    await settle();
    return { threw, x };
  };
  return { room, ps, move, done: () => clock.restore() };
}
const HONEST = { d: 'left', f: 'northwest', eqc: 'iron_chest', eql: 'none', eqs: 'leather_pads', vx: -350, vy: 600 };

/* ── 1 and 4. every field out of its form ── */
{
  const m = await mover();
  await m.move(HONEST);
  const BAD = { d: 'x'.repeat(4000), f: { a: 1 }, eqc: 'y'.repeat(4000), eql: { big: 'z'.repeat(4000) }, eqs: [1, 2, 3], vx: 1e308, vy: -99999 };   /* under the 16 KB frame (MAX_INBOUND_BYTES) */
  const r = await m.move(BAD);
  check('1. a move with every field out of its form still moves the player', m.ps.x === r.x, { x: m.ps.x, want: r.x });
  check('1. ...the facing kept as it was (d, f)', m.ps.d === 'left' && m.ps.f === 'northwest', { d: String(m.ps.d).slice(0, 20), f: m.ps.f });
  check('1. ...the worn pieces kept as they were (eqc, eql, eqs)', m.ps.eqc === 'iron_chest' && m.ps.eql === 'none' && m.ps.eqs === 'leather_pads', { eqc: String(m.ps.eqc).slice(0, 20), eql: m.ps.eql, eqs: m.ps.eqs });
  check('1. ...the velocity 0 (vx past V_MAX, vy past -V_MAX)', m.ps.vx === 0 && m.ps.vy === 0, { vx: m.ps.vx, vy: m.ps.vy });
  const kept = JSON.stringify({ d: m.ps.d, f: m.ps.f, eqc: m.ps.eqc, eql: m.ps.eql, eqs: m.ps.eqs, vx: m.ps.vx, vy: m.ps.vy });
  check('4. what the room keeps for the tick carries none of the bad values (under 200 bytes)', kept.length < 200, kept.length);
  /* a text one past the cap, and one at it */
  await m.move({ eqc: 'a'.repeat(TEXT_MAX + 1) });
  check('1. a piece one character past TEXT_MAX is dropped', m.ps.eqc === 'iron_chest');
  await m.move({ eqc: 'a'.repeat(TEXT_MAX) });
  check('1. ...one at TEXT_MAX is taken', m.ps.eqc === 'a'.repeat(TEXT_MAX));
  m.done();
}

/* ── 2. { toString: 1 } ── */
{
  const m = await mover();
  await m.move(HONEST);
  for (const k of ['d', 'f', 'eqc', 'eql', 'eqs', 'vx', 'vy']) {
    const r = await m.move({ [k]: { toString: 1 } });
    check('2. { toString: 1 } in `' + k + '`: the move is not lost (the player moves)', !r.threw && m.ps.x === r.x, { threw: r.threw, x: m.ps.x - r.x });
  }
  check('2. ...and nothing of it kept', typeof m.ps.d === 'string' && typeof m.ps.f === 'string' && typeof m.ps.eqc === 'string' && m.ps.vx === 0, { d: typeof m.ps.d, eqc: typeof m.ps.eqc, vx: m.ps.vx });
  m.done();
}

/* ── 3. an honest page ── */
{
  const m = await mover();
  await m.move(HONEST);
  check('3. an honest move is stored exactly (facing, pieces, velocity x 100)', m.ps.d === 'left' && m.ps.f === 'northwest' && m.ps.eqc === 'iron_chest' && m.ps.eql === 'none' && m.ps.eqs === 'leather_pads' && m.ps.vx === -350 && m.ps.vy === 600,
    { d: m.ps.d, f: m.ps.f, eqc: m.ps.eqc, vx: m.ps.vx, vy: m.ps.vy });
  await m.move({ d: 'down', f: null, eqc: null, vx: 0, vy: 0 });
  check('3. a null facing keeps the last one; a null piece is taken (as before)', m.ps.d === 'down' && m.ps.f === 'northwest' && m.ps.eqc === null);
  await m.move({ vx: 600, vy: -600 });
  check('3. a dodge\'s velocity (600) is taken', m.ps.vx === 600 && m.ps.vy === -600);
  await m.move({});
  check('3. a move with no velocity is 0, as before', m.ps.vx === 0 && m.ps.vy === 0);
  m.done();
}

/* ── 5. the switch ── */
{
  const m = await mover({ movefields: false });
  await m.move({ eqc: 'y'.repeat(1000), vx: 1e6 });
  check('5. `movefields: false`: stored as sent, as before', m.ps.eqc === 'y'.repeat(1000) && m.ps.vx === 1e6, { eqc: String(m.ps.eqc).length, vx: m.ps.vx });
  m.done();
}

console.log(failed === 0 ? '\nALL PASS (' + passed + ')' : '\n' + failed + ' FAILURE(S)');
process.exit(failed === 0 ? 0 : 1);
