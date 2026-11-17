/* ═══ v2.3.5621: THE OWNER'S SILENCE, AND A FREEZE THAT HOLDS THE DEVICE (card MOD PR 1) ═══
 *
 * The red team's RT-3 S1 (docs/security/rt3-findings.md; its proof
 * t4-ban.mjs, here as checks).  On card E's test room:
 *   1. The owner's routes: a silence set, listed and lifted with the key; a
 *      plain refusal without it.
 *   2. A silenced character's words reach nobody on any chat lane (room chat,
 *      area, whisper, party, a friend's message, a shop thread: the wire
 *      table's rows whose `text` is words); the speaker is told once a minute, in the game's
 *      voice, to its own socket only; another character still speaks.
 *   3. It plays on: a silenced character moves and is not put out.
 *   4. Lifted, or its minutes run out: it speaks again.  A deploy keeps it.
 *   5. `silence: false` in the live flags: every character speaks.
 *   6. A FREEZE HOLDS THE DEVICE: a NEW character on a frozen character's
 *      phone is refused `frozen` (t4-ban.mjs let it in); another phone is let
 *      in; the owner's own phone (a test-mode character's) is never held;
 *      `freezedevice: false` lets it in; an unfreeze lifts it.
 * v2.3.5621, the sitting 19 review: the device half is the owner's LEVER,
 * OFF until `freezedevice: true` (unset, a new character on a frozen phone
 * is let in); 129 freezes and more are read 128 a get (one get threw, and
 * it failed open); `minutes` is a positive whole number or left out (-60,
 * 0.5, 0 and a string are refused).  Break proofs (2026-11-16, each turned
 * its check red): the lever read as before (on unless false) -> FAIL 6 (OFF
 * by default); one get for every frozen record -> FAIL 6 (the 128 a get);
 * the old Math.max/floor parse -> FAIL 4 (`minutes`).
 * v2.3.5625 (card MOD PR 5): 5b, words outside the six lanes (a pet's,
 * an alliance's and a clan's name, an emote's quick line) dropped from a
 * silenced character, and every socket row with words decided (closed, or
 * open with why); the lanes are card K's CHAT_LANE_TYPES.
 * v2.3.5627 (card MOD PR 7; sitting 22's review): 6c, the owner's own
 * devices kept (`ownerdev:`): a computer whose botfp record has forgotten the
 * owner's character (its last 8) is still never held.  Break proof: the
 * `ownerdev:` list not read -> FAIL 6c (the computer held).  And the
 * planning session's call (2026-11-17): a held phone refuses only a NEW
 * character (no login, no record), never an existing one's join.  Break
 * proof: the record check taken out -> FAIL 6b (the friend refused).  Break proof: the
 * door's names line taken out -> FAIL 5b.  6b, the device's characters from botfp's
 * `device:` record (a device reached with a new key is held; the owner's
 * computer, so reached, is spared; the owner's character named by the join
 * is never held).  Break proofs: the record not read -> FAIL 6b (the laptop
 * let in); the owner's spare from the record dropped -> FAIL 6b (the shared
 * computer refused); the named spare dropped -> FAIL 6b (the owner refused).
 */
import { makeStorage, openRoom, fakeWs, baseSession, settle, seededClock, mockEnv } from './testroom.mjs';
import { SILENCE, SILENCE_LANES, SILENCE_WORDS, SILENCE_OPEN, wordRows } from '../src/silence.js';
import { CHAT_LANE_TYPES } from '../src/wire/lists.js';

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
  /* v2.3.5622: a name the name rules take ('mod_troll' reads as staff: card MOD PR 2) */
  await rm.webSocketMessage(ws, JSON.stringify({ type: 'join', id: pid, name: 'T' + pid.slice(7, 15), phrase: 'p-' + pid, protocolVersion: 2, ws: [1, 5],
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
    { type: 'chat', payload: { text: 'x' } }, { type: 'area_chat', payload: { text: 'x' } },
    { type: 'whisper', payload: { to: 'kind', text: 'x' } }, { type: 'party_chat', payload: { text: 'x' } },
    { type: 'friend_dm', payload: { to: 'bp_mod_kind', text: 'x' } }, { type: 'store_dm', payload: { text: 'x' } },
  ];
  check('2: the lanes are the wire table\'s rows whose `text` is words (made from the table, not typed)',
    ['chat', 'area_chat', 'whisper', 'party_chat', 'friend_dm', 'store_dm'].every((t) => SILENCE_LANES.has(t)) && !SILENCE_LANES.has('join') && !SILENCE_LANES.has('trade2_open'), [...SILENCE_LANES]);
  const open = lanes.filter((m) => !room._silenceDoor(sess, m)).map((m) => m.type);
  check('2: every chat lane (' + [...SILENCE_LANES].join(', ') + ') is closed to the silenced', open.length === 0, open);
  const kindOpen = lanes.filter((m) => room._silenceDoor(room.sessions.get(wb), m)).map((m) => m.type);
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
  /* v2.3.5621 (the sitting 19 review): minutes a positive whole number, or left out for until lifted */
  const badMinutes = [];
  for (const m of [-60, 0.5, 0, '10', 600000]) { const r = await admin('POST', '/silence', { playerId: 'bp_mod_troll', minutes: m }, KEY); if (r.status !== 400) badMinutes.push([m, r.status]); }
  check('4: `minutes` -60, 0.5, 0, a string or past a year is refused (400): they were "until lifted"', badMinutes.length === 0, badMinutes);
  await admin('POST', '/silence', { playerId: 'bp_mod_troll' }, KEY);
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

/* ── 5b. words outside the six lanes (v2.3.5625, card MOD PR 5; the sitting 19 review's low) ── */
{
  const wt = [...room.sessions.keys()][0];
  const troll = room.sessions.get(wt);
  const wk = await join('bp_mod_kind2', 'devkind002', room);
  const kind = room.sessions.get(wk);
  const rows = wordRows();
  const loose = rows.filter((n) => !SILENCE_LANES.has(n) && !SILENCE_WORDS.has(n) && !Object.prototype.hasOwnProperty.call(SILENCE_OPEN, n));
  check('5b: every socket row with words is a lane, a name a silence closes, or one it leaves open with why (' + rows.length + ')', loose.length === 0, loose);
  check('5b: the lanes are card K\'s CHAT_LANE_TYPES (wire/lists.js)', SILENCE_LANES === CHAT_LANE_TYPES && SILENCE_LANES.size === 6, [...SILENCE_LANES]);
  troll._silenceToldAt = 0;
  const shut = ['pet_name', 'alliance_name', 'clan_create', 'clan_invite'].filter((t) => room._silenceDoor(troll, { type: t, payload: { name: 'Owner Says Hi' } }) !== true);
  check('5b: a silenced character\'s pet, alliance and clan names are dropped (others read them)', shut.length === 0, shut);
  check('5b: ...told once, in words that say names', told(wt).some((m) => /give names others read/.test(m.payload.text)), told(wt).map((m) => m.payload.text));
  check('5b: an emote\'s quick line ("EZ") is dropped; an emoji and a move go on',
    room._silenceDoor(troll, { type: 'emote', payload: { emoji: 'EZ' } }) === true
    && room._silenceDoor(troll, { type: 'emote', payload: { emoji: '👋' } }) === false
    && room._silenceDoor(troll, { type: 'emote', payload: { move: 'wave' } }) === false);
  const before = room.eventBuffer.length;
  await send(wt, 'emote', { emoji: 'EZ' });
  await send(wk, 'emote', { emoji: 'EZ' });
  const emoted = room.eventBuffer.slice(before).filter((e) => e && (e.type === 'emote' || e.event === 'emote')).map((e) => (e.payload && e.payload.id) || e.from);
  check('5b: (played through the socket) the silenced character\'s "EZ" reaches nobody, the other\'s goes out', !emoted.includes('bp_mod_troll') && emoted.includes('bp_mod_kind2'), { emoted, buf: room.eventBuffer.slice(before).map((e) => e && (e.type || e.event)) });
  const kindShut = ['pet_name', 'alliance_name', 'clan_create', 'clan_invite', 'chat'].filter((t) => room._silenceDoor(kind, { type: t, payload: { name: 'Rex' } }) !== false)
    .concat(room._silenceDoor(kind, { type: 'emote', payload: { emoji: 'EZ' } }) !== false ? ['emote'] : []);
  check('5b: a character not silenced names its pet and says "EZ"', kindShut.length === 0, kindShut);
  check('5b: the silenced character still joins, moves and starts a dungeon (play is not words)',
    ['join', 'track', 'dungeon_start', 'move'].every((t) => room._silenceDoor(troll, { type: t, payload: {} }) === false));
}

/* ── 6. a freeze holds the device (t4-ban.mjs's proof): the owner's lever ── */
{
  /* v2.3.5621 (the sitting 19 review): OFF until the owner turns it on */
  const wpre = await join('bp_mod_pre', 'devpre', room);
  await admin('POST', '/freeze', { playerId: 'bp_mod_pre', note: 'x' }, KEY);
  const preAlt = await join('bp_mod_pre_alt', 'devpre', room);
  check('6: the device half lands OFF: unset, a new character on a frozen character\'s phone is let in', !preAlt.sent.some((m) => m.type === 'join_rejected'), preAlt.sent.map((m) => m.type).slice(0, 4));
  await admin('DELETE', '/freeze?id=bp_mod_pre', null, KEY);
  void wpre;
  room._liveFlags.freezedevice = true;
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
  room._liveFlags.freezedevice = true;
  /* v2.3.5621 (the sitting 19 review): 129 freezes and more are read 128 a get (one get of them threw, and it failed open) */
  for (let i = 0; i < SILENCE.GET_MAX + 5; i++) {
    const pid = 'bp_mod_many' + String(i).padStart(4, '0');
    await room.state.storage.put('frozen:' + pid, { at: Date.now(), note: 'many' });
    await room.state.storage.put('auth:' + pid, { id: pid, devs: [{ d: 'devmany' + i, at: Date.now() }] });
  }
  clock.advance(SILENCE.FROZEN_TTL_MS + 1);
  const gets = [];
  const get0 = room.state.storage.get.bind(room.state.storage);
  room.state.storage.get = async (k) => { if (Array.isArray(k)) gets.push(k.length); return get0(k); };
  const lastAlt = await join('bp_mod_many_alt', 'devmany' + (SILENCE.GET_MAX + 4), room);
  room.state.storage.get = get0;
  check('6: ' + (SILENCE.GET_MAX + 6) + ' frozen characters: read ' + SILENCE.GET_MAX + ' a get at most, and the last one\'s phone is still held',
    lastAlt.sent.some((m) => m.type === 'join_rejected' && m.reason === 'frozen') && gets.length >= 2 && gets.every((n) => n <= SILENCE.GET_MAX), { gets, sent: lastAlt.sent.map((m) => m.type).slice(0, 3) });
  for (let i = 0; i < SILENCE.GET_MAX + 5; i++) await room.state.storage.delete('frozen:bp_mod_many' + String(i).padStart(4, '0'));
  clock.advance(SILENCE.FROZEN_TTL_MS + 1);
  /* v2.3.5625 (card MOD PR 5; the sitting 19 review's MEDIUMs): the device's
     characters from botfp's `device:` record, beside the device lock's list */
  const wh = await join('bp_mod_roam', 'devroamhome', room);
  room._liveFlags.devicelock = false;   /* the laptop reached as a key reaches it: past the device lock, never on its list */
  const wl = await join('bp_mod_roam', 'devroamlaptop', room);
  delete room._liveFlags.devicelock;
  const roamAuth = await room.state.storage.get('auth:bp_mod_roam');
  await room.state.storage.put('auth:bp_mod_roam', { ...(roamAuth || { id: 'bp_mod_roam' }), devs: [{ d: 'devroamhome', at: Date.now() }] });   /* the laptop reached with a new key: never on the list */
  const rec = await room.state.storage.get('device:devroamlaptop');
  check('6b: (botfp\'s record has the character on the laptop; the device lock\'s list does not)', !!(rec && rec.ids.some((e) => e.id === 'bp_mod_roam')), rec);
  await admin('POST', '/freeze', { playerId: 'bp_mod_roam', note: 'x' }, KEY);
  const lapAlt = await join('bp_mod_roam_alt', 'devroamlaptop', room);
  check('6b: a new character on a device the frozen character reached with a new key is refused `frozen` (only the phone it was made on was held)',
    lapAlt.sent.some((m) => m.type === 'join_rejected' && m.reason === 'frozen'), lapAlt.sent.map((m) => m.type).slice(0, 4));
  /* v2.3.5627 (the planning session's call): a held phone refuses only a NEW character */
  room._liveFlags.devicelock = false;   /* the friend's key on the laptop: past the device lock */
  const friendOn = await join('bp_mod_kind', 'devroamlaptop', room);
  delete room._liveFlags.devicelock;
  check('6b: an EXISTING character (a friend\'s own) joining from a held phone is never refused `frozen` (only a new character is)',
    !friendOn.sent.some((m) => m.type === 'join_rejected' && m.reason === 'frozen'), friendOn.sent.map((m) => [m.type, m.reason]).slice(0, 4));
  const homeAlt = await join('bp_mod_roam_alt2', 'devroamhome', room);
  check('6b: ...and the phone it was made on still is', homeAlt.sent.some((m) => m.type === 'join_rejected' && m.reason === 'frozen'), homeAlt.sent.map((m) => m.type).slice(0, 4));
  /* the owner's spare, complete the same way: the owner's character on a shared computer, reached with a new key */
  await room.state.storage.put('testmode:bp_mod_boss', { v: 1, on: true, at: Date.now(), name: 'Boss' });
  await join('bp_mod_boss', 'devbossphone', room);
  room._liveFlags.devicelock = false;
  await join('bp_mod_boss', 'devshared', room);
  delete room._liveFlags.devicelock;
  const bossAuth = await room.state.storage.get('auth:bp_mod_boss');
  await room.state.storage.put('auth:bp_mod_boss', { ...(bossAuth || { id: 'bp_mod_boss' }), devs: [{ d: 'devbossphone', at: Date.now() }] });
  await join('bp_mod_boss_alt', 'devshared', room);   /* the owner's own alt, not in test mode */
  await admin('POST', '/freeze', { playerId: 'bp_mod_boss_alt', note: 'testing the freeze' }, KEY);
  clock.advance(SILENCE.FROZEN_TTL_MS + 1);
  const bossNew = await join('bp_mod_boss_new', 'devshared', room);
  check('6b: a computer the owner\'s own character played on (with a new key) is never held, a frozen alt on it or not',
    !bossNew.sent.some((m) => m.type === 'join_rejected'), bossNew.sent.map((m) => m.type).slice(0, 4));
  await room.state.storage.put('device:devroamhome', { v: 1, ids: [{ id: 'bp_mod_roam', lastSeen: Date.now() }] });
  const bossOnHeld = await join('bp_mod_boss', 'devroamhome', room);
  check('6b: the owner\'s own character, named by the join, is never held by a device (its key still decides)',
    !bossOnHeld.sent.some((m) => m.type === 'join_rejected' && m.reason === 'frozen'), bossOnHeld.sent.map((m) => m.type).slice(0, 4));
  await room.state.storage.delete('testmode:bp_mod_boss');
  /* v2.3.5627 (card MOD PR 7; sitting 22's review): the owner's own devices are KEPT (`ownerdev:`):
     botfp's record keeps a device's last 8 characters, so the owner's fell off it and the computer was held */
  await room.state.storage.put('testmode:bp_mod_chief', { v: 1, on: true, at: Date.now(), name: 'Chief' });
  room._liveFlags.devicelock = false;
  await join('bp_mod_chief', 'devcafe', room);
  await room.state.storage.delete('testmode:bp_mod_chief');   /* no test-mode character's auth names it either */
  for (let i = 0; i < 9; i++) await join('bp_mod_cafe' + i, 'devcafe', room);
  delete room._liveFlags.devicelock;
  const cafe = await room.state.storage.get('device:devcafe');
  check('6c: (botfp\'s record has forgotten the owner\'s character on the computer: its last 8 only)', !!cafe && !cafe.ids.some((e) => e.id === 'bp_mod_chief'), cafe && cafe.ids.map((e) => e.id));
  check('6c: (the device is kept as the owner\'s: `ownerdev:`)', !!(await room.state.storage.get(SILENCE.OWNER_DEV + 'devcafe')));
  await admin('POST', '/freeze', { playerId: 'bp_mod_cafe8', note: 'x' }, KEY);
  clock.advance(SILENCE.FROZEN_TTL_MS + 1);
  const cafeNew = await join('bp_mod_cafe_new', 'devcafe', room);
  check('6c: a computer the owner\'s own character joined from is never held, its record forgetting it or not',
    !cafeNew.sent.some((m) => m.type === 'join_rejected'), cafeNew.sent.map((m) => m.type).slice(0, 4));
  const puts0 = [];
  const put0 = room.state.storage.put.bind(room.state.storage);
  room.state.storage.put = async (k, v) => { if (String(k).startsWith(SILENCE.OWNER_DEV)) puts0.push(k); return put0(k, v); };
  await room.state.storage.put('testmode:bp_mod_chief', { v: 1, on: true, at: Date.now(), name: 'Chief' });
  room._liveFlags.devicelock = false;
  await join('bp_mod_chief', 'devcafe', room);
  await join('bp_mod_cafe0', 'devcafe2', room);
  delete room._liveFlags.devicelock;
  room.state.storage.put = put0;
  check('6c: the mark is written once a device (the owner\'s again: no put), and never for a character not in test mode', puts0.length === 0 && !(await room.state.storage.get(SILENCE.OWNER_DEV + 'devcafe2')), puts0);
  await room.state.storage.delete('testmode:bp_mod_chief');
  await admin('DELETE', '/freeze?id=bp_mod_cafe8', null, KEY);
  await admin('DELETE', '/freeze?id=bp_mod_boss_alt', null, KEY);
  await admin('DELETE', '/freeze?id=bp_mod_roam', null, KEY);
  void wh; void wl;
  delete room._liveFlags.freezedevice;
  await admin('DELETE', '/freeze?id=bp_mod_villain', null, KEY);
  clock.advance(SILENCE.FROZEN_TTL_MS + 1);
  room._liveFlags.freezedevice = true;
  const after = await join('bp_mod_villain_alt4', 'devvillain', room);
  delete room._liveFlags.freezedevice;
  check('6: unfrozen, the phone is free again at once', !after.sent.some((m) => m.type === 'join_rejected'), after.sent.map((m) => m.type).slice(0, 4));
}

clock.restore();
console.log(failures ? `\n${failures} FAILURE(S)` : '\nall silence checks passed');
process.exit(failures ? 1 : 0);
