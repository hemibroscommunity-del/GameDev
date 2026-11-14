// Proof: a report quotes only the speaker's last 3 lines in ANY lane; three harmless lines elsewhere wipe the evidence.
import { makeStorage, openRoom, fakeWs, join, settle } from '/home/user/GameDev/server/test/testroom.mjs';
const st = makeStorage();
const room = await openRoom(st);
const A = fakeWs('A'), V = fakeWs('V'), F = fakeWs('F');
await join(room, A, 'bp_harasser00001', { name: 'Harry', data: { x: 100, y: 100, z: 'town', name: 'Harry', hc: '#fff' } });
await join(room, V, 'bp_victim0000001', { name: 'Vicky', data: { x: 100, y: 100, z: 'town', name: 'Vicky', hc: '#fff' } });
await join(room, F, 'bp_friend0000001', { name: 'Fred', data: { x: 100, y: 100, z: 'wheel_zz', name: 'Fred', hc: '#fff' } });
const send = (ws, type, payload) => room.webSocketMessage(ws, JSON.stringify({ type, payload })).then(settle);
await send(A, 'whisper', { to: 'Vicky', text: 'ABUSIVE LINE 1 (stand-in for a threat)' });
await send(A, 'whisper', { to: 'Vicky', text: 'ABUSIVE LINE 2' });
console.log('victim received whispers:', V.sent.filter(m => m.type === 'whisper').map(m => m.payload.text));
// three harmless lines in another lane
for (const t of ['nice weather', 'lol', 'gg']) { await new Promise(r => setTimeout(r, 1600)); await send(A, 'whisper', { to: 'Fred', text: t }); }
await send(V, 'chat_report', { target: 'bp_harasser00001', reason: 'harassment' });
const ack = V.sent.filter(m => m.type === 'chat_report_ack').pop();
console.log('report ack:', JSON.stringify(ack && ack.payload));
const recs = [...st._store].filter(([k]) => k.startsWith('chat_report:')).map(([, v]) => v.lines.map(l => l.lane + ': ' + l.text));
console.log('evidence stored with the report:', JSON.stringify(recs));
process.exit(0);
