/* Privacy red-team proof (read-only: imports the repo's server code, writes nothing in the repo).
   A STRANGER (no admin key, no session token, no socket) calls the public HTTP routes
   through GameRoom.fetch / Feedback.fetch / Leaderboard.fetch -- the same objects the
   worker's router hands requests to (index.js routeHttp). */
import { GameRoom, Feedback, Leaderboard } from '../../../server/test/../src/index.js';
import { makeStorage, openRoom, join, fakeWs, settle } from '../../../server/test/testroom.mjs';

const out = (label, obj) => console.log('\n=== ' + label + ' ===\n' + JSON.stringify(obj, null, 1).slice(0, 1400));

/* ---- 1. the room: a seller and a bidder, then a stranger reads their activity ---- */
const st = makeStorage();
const room = await openRoom(st);
const S = 'bp_alice_seller', B = 'bp_bob_bidder';
const wsS = fakeWs('S'), wsB = fakeWs('B');
await join(room, wsS, S, { name: 'AliceReal', loginTaken: true, data: { x: 100, y: 100, z: 'wheel' } });
await join(room, wsB, B, { name: 'BobReal', loginTaken: true, data: { x: 100, y: 100, z: 'wheel' } });
room.playerState[S].inventory = { slime_gel: 5 };
room.playerState[B].coins = 1000;
await room._saveRpg(S, room.playerState[S]);
await room._saveRpg(B, room.playerState[B]);
await room._stEnsureIndex();
const made = await room._stCreateListing({ playerId: S, kind: 'item', invKey: 'slime_gel', qty: 1, price: 500 });
await settle();
const bid = made && made.listing ? await room._stPlaceBid(made.listing.id, B, 100) : null;
await settle();
console.log('setup listing ok:', !!(made && made.ok), 'bid:', bid && (bid.ok || bid.error || bid.reason));

const stranger = (path, init) => new Request('https://api.example/' + path.replace(/^\//, ''), init);
let r = await room.fetch(stranger('/api/store/browse'));
out('GET /api/store/browse (no auth) status ' + r.status, await r.json());
r = await room.fetch(stranger('/api/store/mine?playerId=' + B));
out('GET /api/store/mine?playerId=<Bob> (no auth, stranger) status ' + r.status, await r.json());
r = await room.fetch(stranger('/api/market/my?playerId=' + S));
out('GET /api/market/my?playerId=<Alice> (no auth) status ' + r.status, await r.json());
r = await room.fetch(stranger('/api/arena/status'));
out('GET /api/arena/status (no auth) status ' + r.status, await r.json());
r = await room.fetch(stranger('/api/botstat?id=' + B));
console.log('\n=== GET /api/botstat (no key) status', r.status, '(expected 404 when no ADMIN_KEY / wrong key) ===');
r = await room.fetch(stranger('/api/admin/player?id=' + B));
console.log('=== GET /api/admin/player (no key) status', r.status, '===');

/* ---- 2. the Feedback object: crash reports are world-readable ---- */
const fbStore = makeStorage();
const fb = new Feedback(fbStore, {});
await fb.fetch(stranger('/api/feedback/crash', { method: 'POST', body: JSON.stringify({ sid: 'abc12345', v: '2.3.9', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) Safari/604.1', zone: 'wheel', log: [{ t: '2026-11-14T10:00:00Z', kind: 'error', msg: 'TypeError at https://brotown.net/?some=query' }] }) }));
await fb.fetch(stranger('/api/feedback/submit', { method: 'POST', body: JSON.stringify({ playerId: 'bp_anyone', playerName: 'BobReal', category: 'bug', topic: 'combat', text: 'words put in Bob\'s mouth by a stranger' }) }));
await settle();
r = await fb.fetch(stranger('/api/feedback/crashes'));
out('GET /api/feedback/crashes (no auth) status ' + r.status, await r.json());
r = await fb.fetch(stranger('/api/feedback/list?sort=new'));
out('GET /api/feedback/list after a STRANGER posted as "BobReal" status ' + r.status, await r.json());

/* ---- 3. the Leaderboard: ids, last-seen and playtime for anyone ---- */
const lbStore = makeStorage();
const lb = new Leaderboard(lbStore, {});
await lb.updatePlayer({ playerId: B, name: 'BobReal', level: 7, ts: Date.now() - 3600000, rpgData: { playtime: 123456, kills: 9, clanTag: 'BRO' }, series: { melee: 7 } });
await settle();
r = await lb.fetch(stranger('/api/leaderboard/top?category=combat&limit=100'));
out('GET /api/leaderboard/top?category=combat (no auth) status ' + r.status, await r.json());

process.exit(0);
