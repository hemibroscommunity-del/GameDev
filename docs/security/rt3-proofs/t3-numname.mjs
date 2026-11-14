// Proof: a `track` that sets name to a NUMBER breaks every whisper in the room.
import { makeStorage, openRoom, fakeWs, join, settle } from '../../../server/test/testroom.mjs';
const st = makeStorage();
const room = await openRoom(st);
const A = fakeWs('A'), B = fakeWs('B'), C = fakeWs('C');
await join(room, A, 'bp_attacker00001', { name: 'Atk', data: { x: 100, y: 100, z: 'town', name: 'Atk', hc: '#fff' } });
await join(room, B, 'bp_bob000000001', { name: 'Bob', data: { x: 100, y: 100, z: 'town', name: 'Bob', hc: '#fff' } });
await join(room, C, 'bp_carol00000001', { name: 'Carol', data: { x: 100, y: 100, z: 'town', name: 'Carol', hc: '#fff' } });
const whisper = async () => {
  C.sent.length = 0; B.sent.length = 0;
  let err = null;
  try { await room.webSocketMessage(B, JSON.stringify({ type: 'whisper', payload: { to: 'Carol', text: 'hi carol' } })); } catch (e) { err = e.message; }
  await settle();
  return { carolGot: C.sent.filter(m => m.type === 'whisper').length, bobErr: B.sent.filter(m=>m.type==='whisper_error').map(m=>m.payload.reason), thrown: err };
};
console.log('before:', JSON.stringify(await whisper()));
await room.webSocketMessage(A, JSON.stringify({ type: 'track', data: { name: 12345 } }));
await settle();
console.log('attacker ps.name =', JSON.stringify(room.playerState['bp_attacker00001'].name), typeof room.playerState['bp_attacker00001'].name);
await new Promise(r => setTimeout(r, 1100)); // refill
console.log('after :', JSON.stringify(await whisper()));
process.exit(0);
