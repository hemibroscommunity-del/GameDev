/* ═══ v2.3.5621: THE OWNER'S SILENCE, AND A FREEZE THAT HOLDS THE DEVICE (card MOD PR 1) ═══
 *
 * The red team's RT-3 S1 (docs/security/rt3-findings.md; its proof
 * t4-ban.mjs, here as checks).  On card E's test room:
 *   1. The owner's routes: a silence set, listed and lifted with the key; a
 *      plain refusal without it.
 *   2. A silenced character's words reach nobody on any chat lane (room chat,
 *      area, whisper, party, a friend's message, a shop thread, and a relayed
 *      frame by its `event`); the speaker is told once a minute, in the game's
 *      voice, to its own socket only; another character still speaks.
 *   3. It plays on: a silenced character moves and is not put out.
 *   4. Lifted, or its minutes run out: it speaks again.  A deploy keeps it.
 *   5. `silence: false` in the live flags: every character speaks.
 *   6. A FREEZE HOLDS THE DEVICE: a NEW character on a frozen character's
 *      phone is refused `frozen` (t4-ban.mjs let it in); another phone is let
 *      in; the owner's own phone (a test-mode character's) is never held;
 *      `freezedevice: false` lets it in; an unfreeze lifts it.
 */
import { makeStorage, openRoom, fakeWs, baseSession, settle, seededClock, mockEnv } from './testroom.mjs';
import { SILENCE, SILENCE_LANES } from '../src/silence.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 400) : ''); }
}

const KEY = 'owner-key-silence';
const clock = seededClock({ seed: 21 }).install();
const S = makeStorage();
let room = await openRoom(S);
room.env = { ...mockEnv, ADMIN_KEY: KEY };

async function join(pid, device, r) {
  const rm = r || room;
  const ws = fakeWs(pid);
  rm.sessions.set(ws, baseSession());
  await rm.webSocketMessage(ws, JSON.stringify({ type: 'join', id: pid, name: pid.slice(3, 12), phrase: 'p-' + pid, protocolVersion: 2, ws: [1, 5],
    device: { id: device }, data: { x: 100, y: 100, z: 'town' } }));
  await settle();
  return ws;
}
const send = async (ws, type, payload, r) => { await (r || room).webSocketMessage(ws, JSON.stringify({ type, payload: payload || {} })); await settle(); };
const admin = (method, path, body, key, r) => (r || room).fetch(new Request('https://worker.test/api/admin' + path, {
  method, headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: 'Bearer ' + key } : {}) }, body: body ? JSON.stringify(body) : undefined,
}));
const chatsFrom = (pid, r) => (r || room).eventBuffer.filter((e) => e && (e.type === 'chat' || e.event === 'chat') && ((e.payload && (e.payload.id === pid || e.payload.from === pid)) || e.id === pid));
const told = (ws) => ws.sent.filter((m) => m.type === 'server_announce' && /silenced/.test((m.payload && m.payload.text) || ''));

const wa = await join('bp_mod_troll', 'devtroll01');
const wb = await join('bp_mod_kind', 'devkind001');

/* ── 1. the owner's routes ── */
{
  const noKey = await admin('POST', '/silence', { playerId: 'bp_mod_troll', minutes: 60 });
  const wrong = await admin('POST', '/silence', { playerId: 'bp_mod_troll', minutes: 60 }, 'guess');
  check('1: without the owner\'s key a silence is refused', noKey.status >= 400 && wrong.status >= 400, [noKey.status, wrong.status]);
  const set = await (await admin('POST', '/silence', { playerId: 'bp_mod_troll', minutes: 60, note: 'slurs in chat' }, KEY)).json();
  check('1: the owner silences a character for an hour', set.ok === true && set.until > Date.now() && set.online === true, set);
  const list = await (await admin('GET', '/silence', null, KEY)).json();
  check('1: ...and lists it', list.ok && list.silenced.some((s) => s.playerId === 'bp_mod_troll' && s.note === 'slurs in chat'), list);
  check('1: kept as a row (`silenced:<pid>`)', !!(await room.state.storage.get(SILENCE.KEY + 'bp_mod_troll')));
}

/* ── 2. every lane closed to the silenced, and only to them ── */
{
  room.eventBuffer.length = 0;
  await send(wa, 'chat', { text: 'a slur' });
  check('2: room chat from the silenced reaches nobody', chatsFrom('bp_mod_troll').length === 0, room.eventBuffer.map((e) => e.type));
  check('2: ...and the speaker is told, in the game\'s voice, to its own socket', told(wa).length === 1 && told(wb).length === 0, told(wa));
  await send(wa, 'chat', { text: 'again' });
  check('2: ...told once a minute, not once a line', told(wa).length === 1, told(wa).length);
  await send(wb, 'chat', { text: 'hello all' });
  check('2: another character still speaks (control)', chatsFrom('bp_mod_kind').length === 1 || room.eventBuffer.some((e) => e && e.type === 'chat'), room.eventBuffer.map((e) => e.type));
  const sess = room.sessions.get(wa);
  const lanes = [
    { type: 'chat', payload: { text: 'x' } }, { type: 'broadcast', event: 'chat', payload: { text: 'x' } },
    { type: 'area_chat', payload: { text: 'x' } }, { type: 'broadcast', event: 'area_chat', payload: { text: 'x' } },
    { type: 'whisper', payload: { to: 'kind', text: 'x' } }, { type: 'party_chat', payload: { text: 'x' } },
    { type: 'friend_dm', payload: { to: 'bp_mod_kind', text: 'x' } }, { type: 'store_dm', payload: { text: 'x' } },
  ];
  const open = lanes.filter((m) => !room._silenceDoor(sess, m)).map((m) => m.event || m.type);
  check('2: every chat lane (' + [...SILENCE_LANES].join(', ') + ') is closed to the silenced, a relayed frame by its event', open.length === 0, open);
  const kindOpen = lanes.filter((m) => room._silenceDoor(room.sessions.get(wb), m)).map((m) => m.event || m.type);
  check('2: ...and open to everyone else', kindOpen.length === 0, kindOpen);
  /* a whisper end to end */
  wb.sent.length = 0;
  await send(wa, 'whisper', { to: 'mod_kind', text: 'a slur in private' });
  check('2: a whisper from the silenced never reaches its target', !wb.sent.some((m) => JSON.stringify(m).includes('a slur in private')), wb.sent.map((m) => m.type));
}

/* ── 3. it plays on ── */
{
  const sess = room.sessions.get(wa);
  const notChat = ['move', 'trade2_open', 'party_invite', 'duel_request', 'emote', 'pong'].filter((t) => room._silenceDoor(sess, { type: t, payload: {} }));
  check('3: a silenced character still moves, trades, invites and emotes (only the chat lanes close)', notChat.length === 0, notChat);
  check('3: ...and is not put out', !wa.closed && room.sessions.has(wa), wa.closed);
}

/* ── 4. lifted, run out, and kept across a deploy ── */
{
  const del = await (await admin('DELETE', '/silence?id=bp_mod_troll', null, KEY)).json();
  room.eventBuffer.length = 0;
  await send(wa, 'chat', { text: 'sorry everyone' });
  check('4: lifted, the character speaks again', del.ok === true && del.was === true && room.eventBuffer.some((e) => e && e.type === 'chat'), { del, buf: room.eventBuffer.map((e) => e.type) });
  await admin('POST', '/silence', { playerId: 'bp_mod_troll', minutes: 10 }, KEY);
  check('4: a 10-minute silence holds...', room._silenceDoor(room.sessions.get(wa), { type: 'chat' }) === true);
  clock.advance(10 * 60000 + 1);
  check('4: ...and ends by itself when its minutes run out', room._silenceDoor(room.sessions.get(wa), { type: 'chat' }) === false);
  await admin('POST', '/silence', { playerId: 'bp_mod_troll', minutes: 0 }, KEY);
  /* a deploy: a new room on the same storage, the troll joins again */
  const room2 = await openRoom(S);
  room2.env = { ...mockEnv, ADMIN_KEY: KEY };
  const wa2 = await join('bp_mod_troll', 'devtroll01', room2);
  check('4: a silence until lifted survives a deploy (loaded at the next join)', room2._silenceDoor(room2.sessions.get(wa2), { type: 'chat' }) === true, room2._silences && [...room2._silences.keys()]);
  room = room2;
}

/* ── 5. the kill switch ── */
{
  const wa3 = [...room.sessions.keys()][0];
  room._liveFlags.silence = false;
  check('5: `silence: false` in the live flags: every character speaks (the silences kept)', room._silenceDoor(room.sessions.get(wa3), { type: 'chat' }) === false && !!(await room.state.storage.get(SILENCE.KEY + 'bp_mod_troll')));
  delete room._liveFlags.silence;
  check('5: ...put back, the silence holds again', room._silenceDoor(room.sessions.get(wa3), { type: 'chat' }) === true);
}

/* ── 6. a freeze holds the device (t4-ban.mjs's proof) ── */
{
  const wv = await join('bp_mod_villain', 'devvillain', room);
  check('6: (the villain plays on its phone)', room.sessions.has(wv) && !wv.closed);
  const fr = await (await admin('POST', '/freeze', { playerId: 'bp_mod_villain', note: 'harassment' }, KEY)).json();
  check('6: (the owner freezes the villain)', fr.ok === true, fr);
  const again = await join('bp_mod_villain', 'devvillain', room);
  check('6: the frozen character is refused, as before', again.sent.some((m) => m.type === 'join_rejected' && m.reason === 'frozen'), again.sent.map((m) => m.type));
  const alt = await join('bp_mod_villain_alt', 'devvillain', room);
  check('6: a NEW character on the frozen character\'s phone is refused `frozen` (t4-ban.mjs: it was let in)',
    alt.sent.some((m) => m.type === 'join_rejected' && m.reason === 'frozen') && alt.closed && alt.closed.code === 4004, alt.sent.map((m) => m.type));
  check('6: ...and nothing about it was written (refused before the key)', !(await room.state.storage.get('auth:bp_mod_villain_alt')));
  const other = await join('bp_mod_villain_alt2', 'devnewphone', room);
  check('6: another phone is let in (the account check is that wall: the owner\'s to turn on)', !other.sent.some((m) => m.type === 'join_rejected'), other.sent.map((m) => m.type).slice(0, 5));
  /* the owner's own phone is never held */
  await room.state.storage.put('testmode:bp_mod_owner', { v: 1, on: true, at: Date.now(), name: 'Owner' });
  const auth = await room.state.storage.get('auth:bp_mod_owner');
  await room.state.storage.put('auth:bp_mod_owner', { ...(auth || { id: 'bp_mod_owner' }), devs: [{ d: 'devvillain', at: Date.now() }] });
  clock.advance(SILENCE.FROZEN_TTL_MS + 1);
  const ownerAlt = await join('bp_mod_owner_new', 'devvillain', room);
  check('6: a phone a test-mode character (the owner\'s) has played on is never held', !ownerAlt.sent.some((m) => m.type === 'join_rejected'), ownerAlt.sent.map((m) => m.type).slice(0, 4));
  await room.state.storage.delete('testmode:bp_mod_owner');
  clock.advance(SILENCE.FROZEN_TTL_MS + 1);
  room._liveFlags.freezedevice = false;
  const off = await join('bp_mod_villain_alt3', 'devvillain', room);
  check('6: `freezedevice: false`: a new character on the phone is let in, as before', !off.sent.some((m) => m.type === 'join_rejected'), off.sent.map((m) => m.type).slice(0, 4));
  delete room._liveFlags.freezedevice;
  await admin('DELETE', '/freeze?id=bp_mod_villain', null, KEY);
  clock.advance(SILENCE.FROZEN_TTL_MS + 1);
  const after = await join('bp_mod_villain_alt4', 'devvillain', room);
  check('6: unfrozen, the phone is free again at once', !after.sent.some((m) => m.type === 'join_rejected'), after.sent.map((m) => m.type).slice(0, 4));
}

clock.restore();
console.log(failures ? `\n${failures} FAILURE(S)` : '\nall silence checks passed');
process.exit(failures ? 1 : 0);
