/* The relay -- v2.3.3304 (server/src/relay.js).
 *
 * The router's default branch relays a phone's message to the others in the
 * room.  It relayed ANY type that was not privileged, and the others' pages
 * read the PAYLOAD's `id` (and its `from` / `fromName`) before the worker's
 * `from`, so a script could relay "Bob died" or "Bob invites you to his clan"
 * in Bob's name.  Now the relay is an allowlist (RELAY.TYPES), and every
 * relay is rebuilt in the worker's name for the sender.
 *
 *   1. every relay type an honest phone sends goes through, stamped;
 *   2. any other type does not: an unknown one, a privileged one;
 *   3. the payload is in the sender's name: id, from, playerId, fromName,
 *      playerName, name; nothing else on the message goes out; no payload,
 *      an array or a __proto__ key are harmless;
 *   4. the handshakes the worker settles on the way through still work, in
 *      the sender's name (a trade, a duel, a threat, a clan invite);
 *   5. `relaylist: false` relays every unprivileged type again (stamped), and
 *      a dropped type costs no relay budget;
 *   6. the list is the phone's: every broadcast in src/ is a router case, a
 *      relay or a type the worker drops on purpose; every relay is sent by a
 *      phone and drawn by one;
 *   7. the phone reads the worker's `from` before the payload's id.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { RELAY } from '../src/relay.js';

const mockState = () => ({
  storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
  getWebSockets: () => [], acceptWebSocket: () => {},
});
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail)); }
}

const room = new GameRoom(mockState(), mockEnv);
const ws = Object.create(null);
for (const [pid, name] of [['bp_rl_amy', 'Amy'], ['bp_rl_bob', 'Bob']]) {
  ws[pid] = fakeWs(pid);
  room.sessions.set(ws[pid], { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws[pid], JSON.stringify({ type: 'join', id: pid, name, protocolVersion: 2, data: { x: 1000 + (pid === 'bp_rl_bob' ? 60 : 0), y: 1000, z: 'town' } }));
}
const A = 'bp_rl_amy', B = 'bp_rl_bob';
check('setup: two players joined', !!room.playerState[A] && !!room.playerState[B]);
const NAME_A = room._relayName(room.sessions.get(ws[A]));
check('setup: the worker\'s name for the sender', NAME_A === 'Amy', NAME_A);

/* send one message from A; what went into the room's relay */
async function relay(msg, from = A) {
  const s = room.sessions.get(ws[from]);
  s.relayTokens = room.RELAY_BURST; s.relayAt = Date.now();
  room.eventBuffer.length = 0;
  await room.webSocketMessage(ws[from], typeof msg === 'string' ? msg : JSON.stringify(msg));
  return room.eventBuffer.slice();
}
const one = (evs, type) => evs.filter((e) => e.type === type);

// ── 1. every relay an honest phone sends goes through, stamped ──
/* the handshakes the worker settles need state of their own (section 4) */
const SETTLED = new Set(['trade_offer', 'trade_accept', 'trade_reject', 'duel_request', 'duel_wager_request', 'duel_accept', 'duel_decline', 'pvp_threat', 'threat_response', 'clan_invite']);
for (const type of RELAY.TYPES) {
  if (SETTLED.has(type)) continue;
  const payload = type === 'chat' ? { id: A, text: 'hello' } : { id: A, x: 1010, y: 1000, zone: 'town', ts: Date.now() };
  const evs = one(await relay({ type, payload }), type);
  check('1. ' + type + ': relayed once, from the sender, in the sender\'s name',
    evs.length === 1 && evs[0].from === A && evs[0].payload && evs[0].payload.id === A, evs);
}

// ── 2. any other type is not relayed ──
{
  const junk = await relay({ type: 'zz_not_a_relay', payload: { id: A, text: 'x' } });
  check('2. a type no phone relays goes nowhere (it was fanned out to every socket)', junk.length === 0, junk);
  for (const type of ['player_state', 'combat_credit', 'monster_hit', 'server_announce']) {
    const evs = await relay({ type, payload: { id: B, hp: 0 } });
    check('2. a privileged type (' + type + ') goes nowhere, as before', !evs.some((e) => e.type === type), evs);
  }
  const proto = await relay({ type: '__proto__', payload: {} });
  check('2. "__proto__" as a type goes nowhere', proto.length === 0, proto);
}

// ── 3. the payload is in the sender's name ──
{
  const died = one(await relay({ type: 'player_died_to_monster', payload: { id: B, x: 5, y: 6 } }), 'player_died_to_monster');
  check('3. "Bob died", sent by Amy, is Amy\'s knockout (the payload\'s id was read first)',
    died.length === 1 && died[0].payload.id === A && died[0].from === A && died[0].payload.x === 5, died);
  const swing = one(await relay({ type: 'player_swing', payload: { id: B, ts: 1, wpn: 'sword', ang: 0.5 } }), 'player_swing');
  check('3. a swing in Bob\'s name is Amy\'s, the rest of it unchanged',
    swing.length === 1 && swing[0].payload.id === A && swing[0].payload.wpn === 'sword' && swing[0].payload.ang === 0.5, swing);
  const conf = one(await relay({ type: 'pvp_confirmed', payload: { from: B, name: 'Bob', target: A, dmg: 3 } }), 'pvp_confirmed');
  check('3. from and name are the sender\'s (pvp_confirmed)',
    conf.length === 1 && conf[0].payload.from === A && conf[0].payload.name === NAME_A && conf[0].payload.target === A, conf);
  const bet = one(await relay({ type: 'arena_bet', payload: { playerId: B, playerName: 'Bob', targetPlayerId: B, targetName: 'Bob', amount: 5 } }), 'arena_bet');
  check('3. playerId and playerName are the sender\'s (an arena bet); the target is left alone',
    bet.length === 1 && bet[0].payload.playerId === A && bet[0].payload.playerName === NAME_A
    && bet[0].payload.targetPlayerId === B && bet[0].payload.targetName === 'Bob', bet);
  const noFrom = one(await relay({ type: 'emote', payload: { emoji: '👋' } }), 'emote');
  check('3. a sender key the phone left out is not added (only id is always set)',
    noFrom.length === 1 && noFrom[0].payload.id === A && !('from' in noFrom[0].payload) && !('fromName' in noFrom[0].payload), noFrom);
  const extra = one(await relay({ type: 'emote', id: B, from: B, events: [{ type: 'player_state' }], payload: { id: A, emoji: '👋' } }), 'emote');
  check('3. nothing else on the message goes out: type, from and payload only',
    extra.length === 1 && Object.keys(extra[0]).sort().join(',') === 'from,payload,type' && extra[0].from === A, extra);
  const bare = one(await relay({ type: 'emote', id: B, emoji: '👋' }), 'emote');
  check('3. no payload: an empty one in the sender\'s name (the phone read the message itself as the payload)',
    bare.length === 1 && bare[0].payload.id === A && !('emoji' in bare[0].payload) && !('id' in bare[0]), bare);
  const arr = one(await relay({ type: 'emote', payload: [B, 'x'] }), 'emote');
  check('3. an array for a payload: an empty one in the sender\'s name', arr.length === 1 && !Array.isArray(arr[0].payload) && arr[0].payload.id === A, arr);
  const pol = one(await relay('{"type":"emote","payload":{"__proto__":{"polluted":1},"emoji":"x"}}'), 'emote');
  check('3. a "__proto__" key in the payload pollutes nothing', pol.length === 1 && ({}).polluted === undefined && pol[0].payload.id === A, pol);
  const chat = one(await relay({ type: 'chat', payload: { id: B, name: 'Bob', text: 'it was me' } }), 'chat');
  check('3. chat, as since v2.3.1970: the worker\'s id and name', chat.length === 1 && chat[0].payload.id === A && chat[0].payload.name === NAME_A && chat[0].payload.text === 'it was me', chat);
  /* the copy is a copy: what the phone sent is not what is relayed */
  const sent = { type: 'emote', payload: { id: B, emoji: '👋' } };
  room.eventBuffer.length = 0;
  room._relayBuild(room.sessions.get(ws[A]), sent);
  check('3. the rebuild leaves the message it was given as it was (a copy)', sent.payload.id === B);
}

// ── 4. the handshakes the worker settles still work, in the sender's name ──
{
  const offer = one(await relay({ type: 'trade_offer', payload: { target: B, from: B, fromName: 'Bob', offer: { _gold: 5 } } }), 'trade_offer');
  check('4. a trade offer relays, in the sender\'s name', offer.length === 1 && offer[0].payload.from === A && offer[0].payload.fromName === NAME_A && offer[0].payload.target === B, offer);
  const rec = room._pendingTradeOffers && room._pendingTradeOffers.get(A + '>' + B);
  check('4. ...and the offer the worker keeps names the sender as the worker knows them (a trade\'s note)', !!rec && rec.fromName === NAME_A, rec);
  const duel = one(await relay({ type: 'duel_wager_request', payload: { target: B, from: B, fromName: 'Bob', wager: 0 } }), 'duel_wager_request');
  check('4. a duel challenge relays, from the sender (the challenged page answers `from`)',
    duel.length === 1 && duel[0].payload.from === A && duel[0].payload.fromName === NAME_A, duel);
  const dec = one(await relay({ type: 'duel_decline', payload: { target: A, from: A } }, B), 'duel_decline');
  check('4. ...declined by its target, in the target\'s name', dec.length >= 1 && dec.some((e) => e.from === B && e.payload.from === B), dec);
  /* v2.3.3317: clans are parties now (clanparty.js) -- no clan invite is
     relayed; the kill switch `clanparty: false` keeps the old relay */
  const inv = { type: 'clan_invite', payload: { target: B, from: B, fromName: 'Bob', clanName: 'X', clanTag: 'X' } };
  const gone = one(await relay(inv), 'clan_invite');
  check('4. a clan invite is not relayed: clans are parties now (v2.3.3317)', gone.length === 0, gone);
  const flags0 = room._liveFlags;
  room._liveFlags = Object.assign({}, flags0 || {}, { clanparty: false });
  const clan = one(await relay(inv), 'clan_invite');
  room._liveFlags = flags0;
  check('4. ...and under `clanparty: false` it relays, from the sender', clan.length === 1 && clan[0].payload.from === A && clan[0].payload.fromName === NAME_A, clan);
}

// ── 5. the kill switch, and the budget ──
{
  const flags0 = room._liveFlags;
  room._liveFlags = Object.assign(Object.create(null), flags0 || {}, { relaylist: false });
  const old = one(await relay({ type: 'zz_not_a_relay', id: B, payload: { id: B } }), 'zz_not_a_relay');
  check('5. `relaylist: false`: any unprivileged type relays again, still in the sender\'s name',
    old.length === 1 && old[0].payload.id === A && old[0].from === A, old);
  const priv = await relay({ type: 'player_state', payload: { hp: 0 } });
  check('5. ...never a privileged one', priv.length === 0, priv);
  room._liveFlags = flags0;
  const s = room.sessions.get(ws[A]);
  s.relayTokens = 1; s.relayAt = Date.now();
  room.eventBuffer.length = 0;
  await room.webSocketMessage(ws[A], JSON.stringify({ type: 'zz_not_a_relay', payload: {} }));
  await room.webSocketMessage(ws[A], JSON.stringify({ type: 'emote', payload: { emoji: 'x' } }));
  check('5. a dropped type costs no relay budget: the last token still carries an emote',
    room.eventBuffer.length === 1 && room.eventBuffer[0].type === 'emote', room.eventBuffer.map((e) => e.type));
}

// ── 6. the list is the phone's ──
{
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const walk = (d, out) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p, out);
      else if (/\.(js|jsx|mjs)$/.test(e.name)) out.push(p);
    }
    return out;
  };
  const files = walk(join(root, 'src'), []);
  const sent = new Map();
  for (const f of files) {
    for (const m of readFileSync(f, 'utf8').matchAll(/event:\s*'([a-z_0-9]+)'/g)) {
      if (!sent.has(m[1])) sent.set(m[1], new Set());
      sent.get(m[1]).add(relative(root, f));
    }
  }
  check('6. setup: the phone\'s broadcasts found (a floor, so a rename cannot make this vacuous)', sent.size >= 40, sent.size);
  const idx = readFileSync(join(root, 'server/src/index.js'), 'utf8');
  const body = idx.slice(idx.indexOf('async _onMessage('), idx.indexOf('async webSocketClose('));
  const cases = new Set([...body.matchAll(/case\s+'([a-z_0-9]+)'\s*:/g)].map((m) => m[1]));
  check('6. setup: the router\'s cases found', cases.size >= 80 && cases.has('move') && cases.has('player_attack'), cases.size);
  /* the phone still sends these two, and the worker drops them on purpose:
     the worker settles clan wars itself now and sends both (clans.js) */
  const DROPPED = new Set(['clan_war_end', 'clan_war_kill']);
  const lost = [...sent.keys()].filter((t) => !cases.has(t) && !RELAY.TYPES.has(t) && !DROPPED.has(t));
  check('6. every broadcast in src/ is a router case, a relay, or dropped on purpose -- a new relay goes in RELAY.TYPES or it never reaches anyone',
    lost.length === 0, lost.map((t) => t + ' (' + [...sent.get(t)].join(' ') + ')'));
  check('6. the two dropped on purpose are privileged (and so never relayed either way)', [...DROPPED].every((t) => PRIVILEGED_EVENTS.has(t)));
  const noSender = [...RELAY.TYPES].filter((t) => !sent.has(t) && t !== 'duel_request');
  check('6. every relay is sent by a phone (duel_request: an older phone\'s plain duel)', noSender.length === 0, noSender);
  const ge = readFileSync(join(root, 'src/networking/gameEvents.js'), 'utf8');
  const drawn = new Set([...ge.matchAll(/case\s+'([a-z_0-9]+)'\s*:/g)].map((m) => m[1]));
  const undrawn = [...RELAY.TYPES].filter((t) => !drawn.has(t));
  check('6. every relay is handled by the others\' pages (processGameEvent)', undrawn.length === 0, undrawn);
  const both = [...RELAY.TYPES].filter((t) => cases.has(t) || PRIVILEGED_EVENTS.has(t));
  check('6. no relay is also a router case or privileged (it could never reach the relay)', both.length === 0, both);
}

// ── 7. the phone reads the worker's `from` first ──
{
  const src = readFileSync(new URL('../../src/networking/wsClient.js', import.meta.url), 'utf8');
  check('7. the tick\'s events: payload.id = _evt.from || payload.id', /payload\.id = _evt\.from \|\| payload\.id;/.test(src) && !/payload\.id = payload\.id \|\| _evt\.from/.test(src));
  check('7. a direct message: _payload.id = msg.from || _payload.id', /_payload\.id = msg\.from \|\| _payload\.id;/.test(src) && !/_payload\.id = _payload\.id \|\| msg\.from/.test(src));
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
