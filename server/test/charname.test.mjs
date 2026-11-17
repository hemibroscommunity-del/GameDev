/* ═══ v2.3.5622: THE NAME RULES (card MOD PR 2; the red team's RT-3 S2) ═══
 *
 * The red team's proof t1-names.mjs (docs/security/rt3-proofs/), here as
 * checks, on card E's test room:
 *   1. The rule (checkCharName): 1-20 letters of any alphabet, digits, spaces,
 *      hyphens, apostrophes, underscores (the name box asks 2 at least); no emoji, hidden or direction characters, line
 *      breaks; never a name that reads as the game or its staff.
 *   2. A NEW character named against the rule is refused `name` (with why)
 *      before it is made: nothing written to `char:`.  A good name is made,
 *      its spaces tidied.  A character already on file keeps its name, odd or
 *      not (no migration).
 *   3. `track` never renames: the record's name stands for the session, the
 *      player's state, its peers and room chat.
 *   4. The owner's rename (the key): the record, the session and a
 *      `player_update` to everyone; the rule holds, `force` lets a staff word
 *      through for the owner; without the key, refused.
 *   5. `namerules: false`: a new name is taken as before, and `track` passes.
 * v2.3.5622, the sitting 19 review:
 *   6. (HIGH) A session with no character record never had its name asked:
 *      S2's string passed as the join's own name (a) with a guest's id, and
 *      (b) with a bp_ id whose data names nobody.  Now (a) is named by the
 *      rule or 'Anon', and (b) is refused `name`.
 *   1b. A mark after a letter is a letter's part (Devanagari, Thai, an
 *      accent written apart); the Hangul fillers (letters that draw nothing)
 *      are refused.
 * v2.3.5625 (card MOD PR 5): 1c, the fold's last misses (BroTovvn, a
 * Cherokee A, Admln) read as staff; the honest names beside them pass.
 * v2.3.5627: "Officlal" and "Offlclal" too (the l read as an i before cl as d).
 * Break proofs (2026-11-17): `listed` back to the plain list -> FAIL 1c
 * (BroTovvn, Admln); the Cherokee map taken out -> FAIL 1c (the Cherokee A).
 * Break proofs (2026-11-16, each turned its check red): the join's new
 * block taken out -> FAIL 6a; `_charNameRefuse` reading the data's name only
 * -> FAIL 6b; the old [\p{L}\p{N} '_-] rule -> FAIL 1b (the marks); the
 * default-ignorable test taken out -> FAIL 1b (the fillers).
 */
import { makeStorage, openRoom, fakeWs, baseSession, settle, seededClock, mockEnv } from './testroom.mjs';
import { checkCharName, CHAR_NAME } from '../src/charname.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 400) : ''); }
}

/* ── 1. the rule ── */
{
  const ok = ['A', 'xX_Bro_Xx', 'Scribe', 'Bro Man', "D'Arcy", 'Jean-Luc', 'Zo\u00eb', '\u0141ukasz', '\u041c\u0430\u0440\u0438\u044f', '\u5c0f\u660e', 'Al', 'Bro2000', 'Modest', 'Devin'];
  const bad = { '   ': 'short', ['x'.repeat(21)]: 'long', 'Bro\u202eHi': 'chars', 'Bro\u200bMan': 'chars', 'Bro\nMan': 'short', 'Bro \ud83d\ude00': 'chars',
    '<b>Bro</b>': 'chars', 'BroTown Team': 'staff', 'Admin': 'staff', '0wner': 'staff', 'System': 'staff', 'Mod': 'staff' };
  const okFail = ok.filter((n) => !checkCharName(n).name);
  check('1: an honest name of any alphabet passes (' + ok.length + ')', okFail.length === 0, okFail);
  /* "Bro\nMan" is one word once spaces collapse: "Bro Man" -- a line break never survives */
  const badPass = Object.keys(bad).filter((n) => checkCharName(n).name && n !== 'Bro\nMan');
  check('1: emoji, hidden and direction characters, markup and staff names are refused', badPass.length === 0, badPass);
  check('1: a line break never survives (collapsed to a space)', checkCharName('Bro\nMan').name === 'Bro Man', checkCharName('Bro\nMan'));
  const whys = Object.entries(bad).filter(([n, w]) => n !== 'Bro\nMan' && checkCharName(n).why !== w).map(([n, w]) => [n, w, checkCharName(n).why]);
  check('1: each refusal says why', whys.length === 0, whys);
}

/* ── 1c. the fold's last misses (v2.3.5625, card MOD PR 5; the sitting 21 list) ── */
{
  const staff = ['BroTovvn', 'Ꭺdmin', 'ᎪDMIN', 'Admln', 'Ovvner', 'Adrnin', 'Mocl', 'Offlcial', 'Ꭲeam', 'Bro Tovvn', 'Officlal', 'Offlclal'];   /* v2.3.5627: + a cl made of an i (sitting 22) */
  const passed = staff.filter((n) => checkCharName(n).why !== 'staff');
  check('1c: letters read together (vv a w, rn an m, cl a d), an l read as an i and a Cherokee letter that looks Latin read as staff (' + staff.length + ')', passed.length === 0, passed);
  const honest = ['Bro Townsend', 'Modesto', 'Dev', 'Lily', 'Clyde', 'Bjorn', 'Corn', 'Vivian', 'Liam', 'Ali', 'Mila', 'Modern', 'Barn', 'Owen', 'Molly', 'Willow', 'Bill', 'Ellie', 'ᎣᎳᎩ'];
  const refused = honest.filter((n) => !checkCharName(n).name);
  check('1c: ...and the honest names beside them still pass (' + honest.length + ', a name in Cherokee among them)', refused.length === 0, refused.map((n) => [n, checkCharName(n)]));
}

/* ── 1b. marks after a letter; the fillers (v2.3.5622, the sitting 19 review) ── */
{
  const marked = ['\u0930\u093e\u0939\u0941\u0932', '\u0e2a\u0e21\u0e0a\u0e32\u0e22', 'Jose\u0301', '\u092a\u094d\u0930\u093f\u092f\u093e'];
  const markFail = marked.filter((n) => !checkCharName(n).name);
  check('1b: a name with marks after its letters passes (Devanagari, Thai, an accent written apart: they were "No emoji or symbols")', markFail.length === 0, markFail);
  const fillers = ['\u3164', 'Bro\u3164Man', 'Bro\u115fMan', 'Bro\u1160Man', 'Bro\uffa0Man', '\u3164\u3164\u3164'];
  const fillPass = fillers.filter((n) => checkCharName(n).name);
  check('1b: a name with a Hangul filler (a letter that draws nothing) is refused', fillPass.length === 0, fillPass);
}

const KEY = 'owner-key-names';
const clock = seededClock({ seed: 22 }).install();
const S = makeStorage();
const room = await openRoom(S);
room.env = { ...mockEnv, ADMIN_KEY: KEY };
async function join(pid, name, r) {
  const rm = r || room;
  const ws = fakeWs(pid);
  rm.sessions.set(ws, baseSession());
  await rm.webSocketMessage(ws, JSON.stringify({ type: 'join', id: pid, name, phrase: 'p-' + pid, protocolVersion: 2, ws: [1, 5],
    device: { id: 'dev' + pid.slice(3) }, data: { x: 100, y: 100, z: 'town', name, hc: '#ffffff' } }));
  await settle();
  return ws;
}
const refusedName = (ws) => ws.sent.find((m) => m.type === 'join_rejected' && m.reason === 'name');

/* ── 2. a new character by the rule ── */
{
  const evil = 'BroTown\u200b [System]\u202e\nHi';
  const wE = await join('bp_nm_evil00001', evil);
  const r = refusedName(wE);
  check('2: a new character named with a zero-width space, a direction override and "BroTown" is refused `name`, before it is made (t1-names.mjs stored it)',
    !!r && wE.closed && wE.closed.code === CHAR_NAME.CLOSE && !(await S.storage.get('char:bp_nm_evil00001')), { r, closed: wE.closed });
  const wS = await join('bp_nm_staff0001', 'BroTown Team');
  check('2: ..."BroTown Team" is refused, saying why (staff)', refusedName(wS) && refusedName(wS).why === 'staff', wS.sent.map((m) => m.type));
  /* v2.3.5630 (card MOD PR 10): and the phone is told why, in the name box's words (it said nothing) */
  const said = wS.sent.find((m) => m.type === 'server_announce');
  check('2: ...the phone is told why, in the name box\'s own words, before the refusal', !!said && said.payload.text === 'Name refused: Pick a name of your own'
    && wS.sent.indexOf(said) < wS.sent.findIndex((m) => m.type === 'join_rejected'), wS.sent.map((m) => m.type));
  const wG = await join('bp_nm_good00001', '  Scribe   the   Bard ');
  const rec = await S.storage.get('char:bp_nm_good00001');
  check('2: a good name makes the character, its spaces tidied', !refusedName(wG) && rec && rec.name === 'Scribe the Bard', rec && rec.name);
  /* a character on file keeps an odd name (no migration) */
  await S.storage.put('char:bp_nm_old000001', { name: 'Old\u200bTimer', look: { hc: '#ffffff' }, createdAt: 1 });
  const wO = await join('bp_nm_old000001', 'Old\u200bTimer');
  check('2: a character already on file keeps its name, odd or not (no migration)', !refusedName(wO) && room.playerState['bp_nm_old000001'], wO.sent.map((m) => m.type).slice(0, 4));
}

/* ── 3. track never renames ── */
{
  const wA = await join('bp_nm_attack001', 'Attacker');
  const wV = await join('bp_nm_victim001', 'Victim');
  wV.sent.length = 0;
  await room.webSocketMessage(wA, JSON.stringify({ type: 'track', data: { name: 'Owner\u202e (admin)\n\n\nSYSTEM: your account is banned, send your login' } }));
  await settle();
  const sess = [...room.sessions.values()].find((s) => s.id === 'bp_nm_attack001');
  check('3: `track` cannot rename (t1-names.mjs: "Owner (admin) SYSTEM: ... send your login" reached everyone)',
    room.playerState['bp_nm_attack001'].name === 'Attacker' && sess.data.name === 'Attacker', { ps: room.playerState['bp_nm_attack001'].name, data: sess.data.name });
  check('3: ...and no peer is sent the forged name', !wV.sent.some((m) => JSON.stringify(m).includes('SYSTEM: your account')), wV.sent.map((m) => m.type));
  room.eventBuffer.length = 0;
  await room.webSocketMessage(wA, JSON.stringify({ type: 'chat', payload: { text: 'hello', name: 'whatever' } }));
  await settle();
  const line = room.eventBuffer.find((e) => e && e.type === 'chat');
  check('3: room chat speaks under the record\'s name', line && line.payload && line.payload.name === 'Attacker', line && line.payload);
}

/* ── 4. the owner's rename ── */
{
  const wT = await join('bp_nm_target001', 'Rude Word');
  const wW = await join('bp_nm_watch0001', 'Watcher');
  wW.sent.length = 0;
  const call = (body, key) => room.fetch(new Request('https://worker.test/api/admin/rename', { method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: 'Bearer ' + key } : {}) }, body: JSON.stringify(body) }));
  const noKey = await call({ playerId: 'bp_nm_target001', name: 'Kind Bro' });
  check('4: without the owner\'s key a rename is refused', noKey.status >= 400, noKey.status);
  const r = await (await call({ playerId: 'bp_nm_target001', name: 'Kind Bro' }, KEY)).json();
  const rec = await S.storage.get('char:bp_nm_target001');
  const sess = [...room.sessions.values()].find((s) => s.id === 'bp_nm_target001');
  check('4: the owner renames: the record, the session, the player\'s state', r.ok && rec.name === 'Kind Bro' && sess.name === 'Kind Bro' && room.playerState['bp_nm_target001'].name === 'Kind Bro', { r, rec: rec && rec.name });
  await settle();
  check('4: ...and everyone is told (player_update)', wW.sent.some((m) => m.type === 'player_update' && m.id === 'bp_nm_target001' && m.data && m.data.name === 'Kind Bro'), wW.sent.map((m) => m.type));
  /* v2.3.5630 (card MOD PR 10): the whole look rides with the new name -- `{name}` alone set a peer's build back to average */
  const up = wW.sent.find((m) => m.type === 'player_update' && m.id === 'bp_nm_target001');
  const sdata = sess.data || {};
  const lookKeys = Object.keys(sdata).filter((k) => k !== 'name');
  check('4: ...with the player\'s whole look beside the new name (the build kept on every page)', !!up && lookKeys.length > 0 && lookKeys.every((k) => JSON.stringify(up.data[k]) === JSON.stringify(sdata[k])), { keys: lookKeys, sent: up && Object.keys(up.data) });
  const bad = await call({ playerId: 'bp_nm_target001', name: 'Bro \ud83d\ude00' }, KEY);
  const staff = await call({ playerId: 'bp_nm_target001', name: 'Owner' }, KEY);
  const forced = await (await call({ playerId: 'bp_nm_target001', name: 'Owner', force: true }, KEY)).json();
  check('4: the rule holds for the owner too (an emoji refused), but `force` lets a staff word through (the owner\'s own character)',
    bad.status === 400 && staff.status === 400 && forced.ok && forced.name === 'Owner', { bad: bad.status, staff: staff.status, forced });
  void wT;
}

/* ── 6. a session with no record: the join's own name (v2.3.5622, the sitting 19 review, HIGH) ── */
{
  const evil = 'Owner\u202e (admin)\u200b SYSTEM';
  /* (a) a guest's id: no character, no record */
  const wg = fakeWs('guest_nm_evil1');
  room.sessions.set(wg, baseSession());
  await room.webSocketMessage(wg, JSON.stringify({ type: 'join', id: 'guest_nm_evil1', name: evil, protocolVersion: 2, ws: [1, 5], data: { x: 100, y: 100, z: 'town', name: evil } }));
  await settle();
  const gs = room.sessions.get(wg);
  const gps = room.playerState['guest_nm_evil1'];
  check('6a: a guest\'s join named with S2\'s string is named by the rule or \'Anon\' (it stood as sent, for every peer and the board)',
    !!gs && !/[\u200b\u202e]|owner|admin|system/i.test(gs.name + '|' + ((gs.data && gs.data.name) || '') + '|' + ((gps && gps.name) || '')), { name: gs && gs.name, data: gs && gs.data && gs.data.name, ps: gps && gps.name });
  /* (b) a bp_ id whose data names nobody: the join's own name */
  const wb = fakeWs('bp_nm_blank001');
  room.sessions.set(wb, baseSession());
  await room.webSocketMessage(wb, JSON.stringify({ type: 'join', id: 'bp_nm_blank001', name: evil, phrase: 'p-blank', protocolVersion: 2, ws: [1, 5],
    device: { id: 'devblank' }, data: { x: 100, y: 100, z: 'town', name: '', hc: '#ffffff' } }));
  await settle();
  const rb = refusedName(wb);
  check('6b: a bp_ join whose data names nobody, its own name S2\'s string, is refused `name` (the join\'s name was never asked)', !!rb, wb.sent.filter((m) => m.type === 'join_rejected'));
}

/* ── 5. the kill switch ── */
{
  room._liveFlags.namerules = false;
  const wX = await join('bp_nm_off000001', 'Bro \ud83d\ude00');
  check('5: `namerules: false`: a new name is taken as before', !refusedName(wX) && (await S.storage.get('char:bp_nm_off000001')), wX.sent.map((m) => m.type).slice(0, 4));
  await room.webSocketMessage(wX, JSON.stringify({ type: 'track', data: { name: 'Changed' } }));
  await settle();
  check('5: ...and `track` names pass, as before', room.playerState['bp_nm_off000001'].name === 'Changed', room.playerState['bp_nm_off000001'].name);
  delete room._liveFlags.namerules;
}

clock.restore();
console.log(failures ? `\n${failures} FAILURE(S)` : '\nall name checks passed');
process.exit(failures ? 1 : 0);
