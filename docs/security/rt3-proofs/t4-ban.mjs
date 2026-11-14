// Proof: an owner freeze is keyed on the bp_ id only; the same device + same address walks back in as a new character.
import { makeStorage, openRoom, fakeWs, baseSession, settle } from '/home/user/GameDev/server/test/testroom.mjs';
const st = makeStorage();
const room = await openRoom(st);
const j = async (ws, id, dev) => {
  room.sessions.set(ws, { ...baseSession(), ip: '203.0.113.7' });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'Troll', phrase: 'p-' + id, protocolVersion: 2, ws: [1, 5], device: { id: dev }, data: { x: 100, y: 100, z: 'town', name: 'Troll', hc: '#fff' } }));
  await settle();
  return ws;
};
const a = await j(fakeWs('a'), 'bp_troll0000001', 'dev-troll-phone');
console.log('first join ok:', !!room.playerState['bp_troll0000001']);
// owner freezes (what /api/admin/freeze writes)
await st.storage.put('frozen:bp_troll0000001', { ts: Date.now(), note: 'slurs' });
for (const [ws, s] of room.sessions) if (s.id === 'bp_troll0000001') { await room._adminPutOut(ws, 4004, 'frozen'); }
const b = await j(fakeWs('b'), 'bp_troll0000001', 'dev-troll-phone');
console.log('frozen id again:', b.sent.find(m => m.type === 'join_rejected')?.reason || 'let in');
const c = await j(fakeWs('c'), 'bp_troll0000002', 'dev-troll-phone');
console.log('new id, SAME device + SAME address:', c.sent.find(m => m.type === 'join_rejected')?.reason || ('let in, ps=' + !!room.playerState['bp_troll0000002']));
console.log('turnstile configured:', room._verifyConfigured());
process.exit(0);
