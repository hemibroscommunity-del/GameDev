/* ═══ v2.3.5724: THE RELAY'S FIELDS TYPED, AND THE ROOM'S SEND (card K2 PR 5) ═══
 *
 * The second red team: `_relayBuild` (relay.js) copied every field a phone
 * put in a relay, each as sent -- `monster_dmg_at`'s `dmg` reached every
 * screen in the zone as text, and a `trade_reject` / `pvp_confirmed` could
 * be made to speak in the game's voice -- and `_sendRoom` (send.js) sent the
 * room's traffic to a socket that never joined.  This holds:
 *
 *   1. the forms table names exactly each relay row's fields (the wire
 *      table's `trust`), no more, no fewer, every form a known one;
 *   2. a field out of its form is dropped, the relay kept: `dmg` as text, a
 *      `died` as a word, an id past 64, a nested object where a number goes;
 *   3. a field the row does not name goes no further: `reason: 'paused'` on
 *      a trade_reject or a duel_decline, words on a pvp_confirmed;
 *   4. every honest page's relay (one of each sender's shapes, from the
 *      census of src/) goes through EXACTLY as sent, the flags sent as 1
 *      included, the sender's id and name stamped as before;
 *   5. the room's send reaches only sockets whose player joined;
 *   6. `relaytyped: false`: every field as sent, every socket, as before.
 *
 * Red on main (v2.3.5719): 1 (no table), 2, 3 and 5. */
import { makeStorage, openRoom, fakeWs, join } from './testroom.mjs';
import * as RL from '../src/relay.js';
import { WIRE_RELAY } from '../src/wire/relays.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 500))); }
}
const FORMS = RL.RELAY_FORMS || null;
const KNOWN = /^(id|num|int|bool|text|offer|ints2|ints5|str\d+\??)$/;

/* ── 1. the table is the rows ── */
{
  check('1. the relay forms table exists (RELAY_FORMS)', !!FORMS);
  const rows = new Map(WIRE_RELAY.map((r) => [r.name, Object.keys(r.trust || {}).sort().join(',')]));
  const forms = FORMS || {};
  const off = [];
  for (const [name, fields] of rows) {
    const f = forms[name] ? Object.keys(forms[name]).sort().join(',') : null;
    if (f !== fields) off.push({ name, row: fields, forms: f });
  }
  for (const name of Object.keys(forms)) if (!rows.has(name)) off.push({ name, row: null });
  check('1. ...one entry a relay row, naming exactly the row\'s fields (' + rows.size + ' rows)', !!FORMS && off.length === 0, off.slice(0, 4));
  const bad = [];
  for (const [t, f] of Object.entries(forms)) for (const [k, v] of Object.entries(f)) if (!KNOWN.test(v)) bad.push(t + '.' + k + ':' + v);
  check('1. ...every form a known one', bad.length === 0, bad);
}

const room = await openRoom(makeStorage());
const wa = fakeWs('a'), wb = fakeWs('b');
await join(room, wa, 'bp_rt_a', { loginTaken: true, name: 'Alice' });
await join(room, wb, 'bp_rt_b', { loginTaken: true, name: 'Bob' });
const sa = room.sessions.get(wa);
const build = (type, payload, r = room) => r._relayBuild(r.sessions.get(wa), { type, payload }).payload;

/* ── 2. out of form: dropped, the relay kept ── */
{
  const p = build('monster_dmg_at', { x: 100, y: 200, dmg: 'You have been banned', isCrit: true });
  check('2. monster_dmg_at with `dmg` as text: the text is dropped, x, y and isCrit kept', p.dmg === undefined && p.x === 100 && p.y === 200 && p.isCrit === true, p);
  const q = build('pvp_confirmed', { target: 'bp_rt_b', died: 'yes, by the owner', dmg: { toString: 1 }, srv: true });
  check('2. pvp_confirmed with `died` as words and `dmg` an object: both dropped', q.died === undefined && q.dmg === undefined && q.target === 'bp_rt_b' && q.srv === true, q);
  const r = build('trade_accept', { target: 'x'.repeat(65) });
  check('2. a target past 64 characters is dropped', r.target === undefined, r);
  const s = build('player_projectile', { x: 1, y: 2, ang: 0.5, lp: [1, 2, 3], gf: 'nope', tg: 7, volley: 'yes' });
  check('2. a projectile\'s lp of 3, gf as text, tg as a number, volley as a word: dropped', s.lp === undefined && s.gf === undefined && s.tg === undefined && s.volley === undefined && s.ang === 0.5, s);
  const o = build('trade_offer', { target: 'bp_rt_b', offer: { ore: 'all', _gold: 5 } });
  check('2. a trade offer with a count that is not a whole number is dropped', o.offer === undefined && o.target === 'bp_rt_b', o);
}

/* ── 3. a field the row does not name ── */
{
  const a = build('trade_reject', { target: 'bp_rt_b', reason: 'paused' });
  check('3. trade_reject with reason \'paused\' (the game\'s "Saving is paused" words): the reason goes no further', !('reason' in a) && a.target === 'bp_rt_b', a);
  const b = build('duel_decline', { target: 'bp_rt_b', reason: 'paused' });
  check('3. ...nor on a duel_decline', !('reason' in b), b);
  const c = build('pvp_confirmed', { target: 'bp_rt_b', died: true, dmg: 12, srv: true, words: 'Owner: send your login key', text: 'x' });
  check('3. ...nor words on a pvp_confirmed', !('words' in c) && !('text' in c) && c.dmg === 12, c);
  const d = build('campfire_out', { zone: 'wheel', anything: 1 });
  check('3. a row that names no field relays the id alone', Object.keys(d).join() === 'id' && d.id === 'bp_rt_a', d);
}

/* ── 4. every honest shape, exactly ── */
{
  const HONEST = [
    ['trade_accept', { target: 'bp_rt_b', from: 'bp_rt_a' }],
    ['trade_offer', { target: 'bp_rt_b', from: 'bp_rt_a', offer: { copper_ore: 3, oak_log: 1, _gold: 0 } }],
    ['trade_reject', { target: 'bp_rt_b', from: 'bp_rt_a' }],
    ['clan_invite', { target: 'bp_rt_b', from: 'bp_rt_a', fromName: 'Alice', clanName: 'Bro Squad', clanTag: 'BRO' }],
    ['duel_accept', { target: 'bp_rt_b', from: 'bp_rt_a', fromName: 'Alice', wager: 0 }],
    ['duel_decline', { target: 'bp_rt_b', from: 'bp_rt_a' }],
    ['duel_wager_request', { target: 'bp_rt_b', from: 'bp_rt_a', fromName: 'Alice', wager: 0 }],
    ['pvp_threat', { target: 'bp_rt_b', from: 'bp_rt_a', fromName: 'Alice', fromLevel: 7 }],
    ['threat_response', { target: 'bp_rt_b', from: 'bp_rt_a', action: 'guards' }],
    ['chat', { text: 'hello bros', color: '#D95C54' }],
    ['emote', { emoji: '👋' }],
    ['emote', { move: 'wave' }],
    ['campfire_lit', { x: 12000.5, y: 9000, zone: 'wheel', expiresAt: 1790000045000 }],
    ['gather_node', { node: null, x: 10, y: 20, zone: 'wheel' }],
    ['gather_node', { node: 'oak_12', x: 10, y: 20, zone: 'wheel' }],
    ['monster_dmg_at', { x: 10, y: 20, dmg: 12.5, isCrit: false }],
    ['player_died_to_monster', { x: 10, y: 20 }],
    ['player_dodge', { kind: 'dodge', angle: 1.25, dur: 400, walk: false }],
    ['player_dodge', { kind: 'dash', angle: -2, dur: 300 }],
    ['player_hurt_by_monster', { dmg: 0 }],
    ['player_jump', { dur: 520, peak: 34 }],
    ['player_jump', { dur: 700, peak: 40, flip: 1, h0: 3, v: 0.12345, g: 0.0001234, ang: 1.571 }],
    ['player_projectile', { ts: 1790000000000, isStaff: false, x: 100, y: 200, ang: 0.785, life: 60, speedPx: 5, el: 'fire', big: true, isSpecial: true, dr: 0, ga: 1200 }],
    ['player_projectile', { ts: 1790000000001, isStaff: true, x: 1, y: 2, ang: 3, life: 40, delayMs: 200, volley: 1, pc: 1, retreat: 1, tg: 'bp_rt_b', lp: [10, 20], gf: [1, 2, 30, 4, 5] }],
    ['player_shield', { up: true }],
    ['player_swing', { ang: 0.4, wpn: 'greatsword' }],
    ['player_swing', { ang: 0.4, wpn: 'sword', special: true, bash: false, whirl: true, r: 140 }],
    ['pvp_confirmed', { target: 'bp_rt_b', died: false, dmg: 13.7, srv: true }],
    ['stunned', { target: 'bp_rt_b', duration: 2000 }],
  ];
  const bad = [];
  for (const [type, payload] of HONEST) {
    const want = { ...payload, id: 'bp_rt_a' };
    if ('from' in want) want.from = 'bp_rt_a';
    if ('fromName' in want) want.fromName = room._relayName(sa);
    const got = build(type, payload);
    const a = JSON.stringify(Object.keys(want).sort().map((k) => [k, want[k]]));
    const b = JSON.stringify(Object.keys(got).sort().map((k) => [k, got[k]]));
    if (a !== b) bad.push({ type, want, got });
  }
  check('4. every honest page\'s relay (' + HONEST.length + ' shapes, 26 types) goes through exactly as sent, id and name stamped', bad.length === 0, bad.slice(0, 2));
}

/* ── 5. the room's send ── */
{
  const r = await openRoom(makeStorage());
  const wj = fakeWs('j'), wn = fakeWs('n');
  await join(r, wj, 'bp_rt_j', { loginTaken: true });
  r.sessions.set(wn, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });   /* opened, never joined */
  wj.sent.length = 0; wn.sent.length = 0;
  r.broadcastAll({ type: 'shop_state', payload: { n: 1 } });
  check('5. the room\'s send reaches a socket whose player joined', wj.sent.some((m) => m.type === 'shop_state'));
  check('5. ...and not one that opened and never joined', !wn.sent.some((m) => m.type === 'shop_state'), wn.sent.map((m) => m.type));
}

/* ── 6. the switch ── */
{
  const r = await openRoom(makeStorage(), { relaytyped: false });
  const w1 = fakeWs('s1'); await join(r, w1, 'bp_rt_s', { loginTaken: true });
  const p = r._relayBuild(r.sessions.get(w1), { type: 'monster_dmg_at', payload: { x: 1, y: 2, dmg: 'text', extra: 'x' } }).payload;
  check('6. `relaytyped: false`: every field as sent, as before', p.dmg === 'text' && p.extra === 'x', p);
  const wn = fakeWs('n2');
  r.sessions.set(wn, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  r.broadcastAll({ type: 'shop_state', payload: { n: 1 } });
  check('6. ...and the room\'s send reaches every socket, as before', wn.sent.some((m) => m.type === 'shop_state'));
}

console.log(failed === 0 ? '\nALL PASS (' + passed + ')' : '\n' + failed + ' FAILURE(S)');
process.exit(failed === 0 ? 0 : 1);
