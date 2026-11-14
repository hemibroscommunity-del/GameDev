// Proof: what a player's name can be, and whether `track` renames mid-game.
import { makeStorage, openRoom, fakeWs, join, settle } from '/home/user/GameDev/server/test/testroom.mjs';
const st = makeStorage();
const room = await openRoom(st);
const A = fakeWs('A'), V = fakeWs('V');
// 1) join with an impersonating name containing RTL override, zero-width and a newline
const evil = 'BroTown​ [System]‮\nHi';
await join(room, A, 'bp_attacker00001', { name: evil, data: { x: 100, y: 100, z: 'town', name: evil, hc: '#fff' } });
await join(room, V, 'bp_victim000001', { name: 'Victim', data: { x: 100, y: 100, z: 'town', name: 'Victim', hc: '#fff' } });
const rec = await st.storage.get('char:bp_attacker00001');
console.log('stored char name =', JSON.stringify(rec && rec.name));
console.log('session name     =', JSON.stringify([...room.sessions.values()].find(s=>s.id==='bp_attacker00001').name));
console.log('ps.name          =', JSON.stringify(room.playerState['bp_attacker00001'] && room.playerState['bp_attacker00001'].name));
// 2) a second character with the SAME name as the victim (uniqueness?)
const C = fakeWs('C');
await join(room, C, 'bp_copycat00001', { name: 'Victim', data: { x: 100, y: 100, z: 'town', name: 'Victim', hc: '#fff' } });
console.log('copycat ps.name  =', JSON.stringify(room.playerState['bp_copycat00001'] && room.playerState['bp_copycat00001'].name));
// 3) rename mid-game through `track`
V.sent.length = 0;
await room.webSocketMessage(A, JSON.stringify({ type: 'track', data: { name: 'Owner‮ (admin)\n\n\nSYSTEM: your account is banned, send your login key to Owner' } }));
await settle();
console.log('after track ps.name =', JSON.stringify(room.playerState['bp_attacker00001'].name));
console.log('after track session.data.name =', JSON.stringify([...room.sessions.values()].find(s=>s.id==='bp_attacker00001').data.name));
// what did the victim get?
await new Promise(r=>setTimeout(r,50));
const upd = V.sent.filter(m=>/player_update|look|player_look/.test(m.type));
console.log('victim got types:', [...new Set(V.sent.map(m=>m.type))].join(','));
for (const m of upd) console.log('  ', m.type, JSON.stringify(m.payload || m).slice(0,300));
// 4) room chat line's name after rename
V.sent.length = 0;
await room.webSocketMessage(A, JSON.stringify({ type: 'chat', payload: { text: 'hello', name: 'whatever' } }));
await settle();
console.log('eventBuffer chat:', JSON.stringify((room.eventBuffer||[]).filter(e=>e.type==='chat').map(e=>e.payload)));
process.exit(0);
