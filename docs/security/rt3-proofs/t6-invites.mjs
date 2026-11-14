// Proof: how many request cards one player can push at another in ~10 s (server side; the phone's block is local only).
import { makeStorage, openRoom, fakeWs, join, settle } from '../../../server/test/testroom.mjs';
const st = makeStorage();
const room = await openRoom(st);
const A = fakeWs('A'), V = fakeWs('V');
await join(room, A, 'bp_pest00000001', { name: 'Pest', data: { x: 100, y: 100, z: 'town', name: 'Pest', hc: '#fff' } });
await join(room, V, 'bp_victim000001', { name: 'Vicky', data: { x: 100, y: 100, z: 'town', name: 'Vicky', hc: '#fff' } });
const T = 'bp_victim000001';
const send = (type, payload) => room.webSocketMessage(A, JSON.stringify({ type, payload }));
let t0 = Date.now();
// 10 s of a pest pressing buttons 10x a second, alternating the request kinds
for (let i = 0; i < 100; i++) {
  await send('trade2_open', { target: T });
  // cancel own invite so the next open is a fresh one
  await send('trade2_cancel', {});
  await send('party_invite', { target: T });
  await send('duel_wager_request', { target: T, wager: 0 });
  await new Promise(r => setTimeout(r, 100));
  if (i % 5 === 0 && room._tick) { try { await room._tick(); } catch (e) {} }
}
await settle();
// relays go out on the tick; flush what the event buffer holds
const buf = (room.eventBuffer || []).filter(e => e.type === 'duel_wager_request');
const c = (t) => V.sent.filter(m => m.type === t).length;
console.log('elapsed s', ((Date.now() - t0) / 1000).toFixed(1));
console.log('trade2_invite cards to victim:', c('trade2_invite'));
console.log('party_invited cards to victim:', c('party_invited'));
console.log('duel_wager_request relays queued (+ delivered):', buf.length, '+', V.sent.filter(m => m.type === 'tick' ? false : m.type === 'duel_wager_request').length);
process.exit(0);
