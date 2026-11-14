/* RT-3: what one script mints with throwaway characters and funnels to a main,
 * against the real GameRoom in memory (card E's test room).  Local only. */
import { makeStorage, openRoom, fakeWs, baseSession, settle, seededClock } from '../../../server/test/testroom.mjs';
const N = Number(process.argv[2] || 40);
const clock = seededClock({ seed: 7 }).install();
const S = makeStorage();
const room = await openRoom(S.storage ? { storage: S.storage, getWebSockets: () => [], acceptWebSocket: () => {} } : S);
let msgs = 0;
const send = async (ws, type, payload) => { msgs++; await room.webSocketMessage(ws, JSON.stringify({ type, payload: payload || {} })); await settle(); };
async function join(pid, dev, name) {
  const ws = fakeWs(pid); room.sessions.set(ws, baseSession()); msgs++;
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: pid, name, phrase: 'p-' + pid, protocolVersion: 2, ws: [1, 5],
    device: { id: dev }, data: { x: 100, y: 100, z: 'town' } }));
  await settle(); return ws;
}
const coins = (pid) => room.playerState[pid]?.coins ?? null;
const main = 'bp_mainacct01';
const wsM = await join(main, 'devmain0001', 'Mainbro');
const m0 = coins(main);
let minted = 0, moved = 0, refused = {};
for (let i = 0; i < N; i++) {
  const pid = 'bp_throw' + String(i).padStart(4, '0');
  const ws = await join(pid, 'devthrow' + String(i).padStart(4, '0'), 'Alt' + i);
  if (!room.playerState[pid]) { refused.join = (refused.join || 0) + 1; continue; }
  const c0 = coins(pid);
  await send(ws, 'loginspin_ask'); await send(ws, 'loginspin_go');
  await send(ws, 'loginspin_collect', { k: 0 });
  clock.advance(1000);
  await send(ws, 'daily_spin'); /* the Gambling Den's free spin */
  const dsp = [...ws.sent].reverse().find((m) => /daily_spin/.test(m.type));
  if (dsp && dsp.payload && dsp.payload.k !== undefined) await send(ws, 'daily_spin', { take: true, k: dsp.payload.k });
  await settle();
  const c1 = coins(pid); minted += (c1 - 0);
  /* the trade window to the main */
  await send(ws, 'trade2_open', { target: main }); await send(wsM, 'trade2_open', { target: pid });
  await send(ws, 'trade2_set', { offer: { _gold: c1 } });
  await send(ws, 'trade2_ready', { ready: true }); await send(wsM, 'trade2_ready', { ready: true });
  clock.advance(10000);
  await send(ws, 'trade2_confirm'); await send(wsM, 'trade2_confirm');
  const c2 = coins(pid);
  if (c2 === c1) { const st = [...ws.sent].reverse().find((m) => m.type === 'trade2_state'); refused[st?.payload?.reason || 'unknown'] = (refused[st?.payload?.reason || 'unknown'] || 0) + 1; if (i < 2) console.log('no move', JSON.stringify(st?.payload).slice(0, 300)); }
  moved += c1 - c2;
  if (i < 3) console.log(pid, 'start', c0, 'after spins', c1, 'after trade', c2, 'main now', coins(main), 'types', [...new Set(ws.sent.map((m) => m.type))].filter((t) => /spin|daily|trade2/.test(t)).join(','));
  await room.webSocketClose?.(ws, 1000, 'bye', true).catch?.(() => {});
}
console.log(JSON.stringify({ N, mainGain: coins(main) - m0, perAlt: Math.round((coins(main) - m0) / N), mintedPerAlt: Math.round(minted / N), moved, msgs, msgsPerAlt: Math.round(msgs / N), refused, rows: S._store.size }));
clock.restore();
process.exit(0);
