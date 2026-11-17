/* ═══ v2.3.5624: INVITE PACE (card MOD PR 4; the red team's RT-3 S5) ═══
 *
 * The red team's proof t6-invites.mjs (docs/security/rt3-proofs/), here as
 * checks: a pest pressing Trade at a victim ten times a second for ten
 * seconds put 100 invite cards on the victim's screen, each a popup and a
 * sound; party invites were paced (party.js INVITE_REPEAT_MS: 2 got
 * through).  Now trade2.js's open and friends.js's request keep the party's
 * rule: one card per inviter per target per 5 s.  On card E's room:
 *   1. Trade: 100 opens in 10 s (each cancelled, so the next is fresh) put at
 *      most 3 cards on the victim; a real trade still opens (the mutual
 *      open), and another target is not held back.
 *   2. Friends: a request, its decline and the request again, over and over,
 *      put at most 3 cards up; the answers stay (already friends, a duplicate).
 *   3. `invitepace: false`: every card goes, as before.
 */
import { makeStorage, openRoom, fakeWs, join, settle, seededClock } from './testroom.mjs';
import { TRADE2 } from '../src/trade2.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 400) : ''); }
}

const clock = seededClock({ seed: 24 }).install();
const S = makeStorage();
const room = await openRoom(S);
const A = fakeWs('A'), V = fakeWs('V'), W = fakeWs('W');
await join(room, A, 'bp_ip_pest0001', { name: 'Pest', data: { x: 100, y: 100, z: 'town', name: 'Pest', hc: '#ffffff' } });
await join(room, V, 'bp_ip_victim01', { name: 'Vicky', data: { x: 100, y: 100, z: 'town', name: 'Vicky', hc: '#ffffff' } });
await join(room, W, 'bp_ip_other001', { name: 'Willa', data: { x: 100, y: 100, z: 'town', name: 'Willa', hc: '#ffffff' } });
const send = async (ws, type, payload) => { await room.webSocketMessage(ws, JSON.stringify({ type, payload: payload || {} })); await settle(); };
const cards = (ws, t) => ws.sent.filter((m) => m.type === t).length;

/* ── 1. trade ── */
{
  for (let i = 0; i < 100; i++) {
    clock.advance(100);
    await send(A, 'trade2_open', { target: 'bp_ip_victim01' });
    await send(A, 'trade2_cancel', {});
  }
  const n = cards(V, 'trade2_invite');
  check('1: 100 trade opens in 10 s (each cancelled) put at most 3 cards on the victim (t6-invites.mjs: 100)', n <= 3 && n >= 1, n);
  await send(A, 'trade2_open', { target: 'bp_ip_other001' });
  check('1: ...another target is not held back', cards(W, 'trade2_invite') === 1, cards(W, 'trade2_invite'));
  clock.advance(TRADE2.INVITE_REPEAT_MS + 1);
  await send(A, 'trade2_cancel', {});
  await send(A, 'trade2_open', { target: 'bp_ip_victim01' });
  await send(V, 'trade2_open', { target: 'bp_ip_pest0001' });
  const st = [...V.sent].reverse().find((m) => m.type === 'trade2_state');
  check('1: a real trade still opens (the mutual open)', st && st.payload && st.payload.state === 'open', st && st.payload);
  await send(A, 'trade2_cancel', {});
  /* a real trade opened: the pair's pace starts over, so a second trade right after shows its card */
  const before = cards(V, 'trade2_invite');
  clock.advance(500);
  await send(A, 'trade2_open', { target: 'bp_ip_victim01' });
  check('1: right after a real trade, the next invite still shows its card (the pace starts over when a trade opens)', cards(V, 'trade2_invite') === before + 1, { before, after: cards(V, 'trade2_invite') });
  await send(A, 'trade2_cancel', {});
}

/* ── 2. friends ── */
{
  V.sent.length = 0;
  for (let i = 0; i < 50; i++) {
    clock.advance(200);
    await send(A, 'friend_request', { target: 'bp_ip_victim01', name: 'Vicky' });
    await send(V, 'friend_decline', { from: 'bp_ip_pest0001' });
  }
  const n = cards(V, 'friend_request_in');
  check('2: a request, its decline and the request again for 10 s put at most 3 cards up', n <= 3 && n >= 1, n);
  /* the answers stay: a duplicate is still a no-op, already-friends still answers */
  clock.advance(10000);
  await send(A, 'friend_request', { target: 'bp_ip_other001', name: 'Willa' });
  await send(W, 'friend_accept', { from: 'bp_ip_pest0001' });
  A.sent.length = 0;
  await send(A, 'friend_request', { target: 'bp_ip_other001', name: 'Willa' });
  const err = [...A.sent].reverse().find((m) => m.type === 'friend_error');
  check('2: ...and a re-request of a friend still answers already-friends, at once', err && err.payload && err.payload.reason === 'already-friends', A.sent.map((m) => m.type));
}

/* ── 3. the kill switch ── */
{
  room._liveFlags.invitepace = false;
  V.sent.length = 0;
  for (let i = 0; i < 10; i++) {
    clock.advance(100);
    await send(A, 'trade2_open', { target: 'bp_ip_victim01' });
    await send(A, 'trade2_cancel', {});
  }
  check('3: `invitepace: false`: every card goes, as before', cards(V, 'trade2_invite') === 10, cards(V, 'trade2_invite'));
  delete room._liveFlags.invitepace;
}

clock.restore();
console.log(failures ? `\n${failures} FAILURE(S)` : '\nall invite-pace checks passed');
process.exit(failures ? 1 : 0);
