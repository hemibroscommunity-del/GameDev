/* Chat-moderation suite (v2.3.1981, chatmod.js).  Muting and reporting
 * as SERVER facts: the mute list is Durable Object storage keyed to the
 * stable `bp_` identity and enforced on the FAN-OUT, and a report is a
 * durable record quoting the server's own copy of the chat.  Checks:
 *   1. caps.chatMute advertised + chat_mute_list delivered on join.
 *   2. Mute: stored under chat_mute:<pid>, echoed back as a list, and
 *      LOADED on a later join (the cross-device property); unmute
 *      removes it; a self-mute and a junk id are dropped; the list cap
 *      answers 'list-full' instead of growing.
 *   3. '__proto__' as a muted id is inert (rule H / TRAPS #6): it lands
 *      in the doc as an own key and does not poison Object.prototype.
 *   4. Fan-out: the muter's tick frame carries no chat/emote from the
 *      muted player, an unmuted bystander in the same group still gets
 *      it, and a NON-chat relay from the same player still arrives
 *      (mute is a chat control, not an invisible interaction block).
 *   5. Party chat: a muted member's line is not sent to the muter and
 *      still reaches everyone else.
 *   6. Report: stored under chat_report: with the SERVER's copy of the
 *      lines (a client-supplied `text`/`lines` is ignored), reporter and
 *      target names resolved server-side, reason clamped to the
 *      allowlist; unknown target refused; self-report refused; the
 *      duplicate window and the hourly rate limit both refuse.
 *   7. Admin: GET /api/admin/reports needs the key, returns newest-first
 *      and filters by target; DELETE dismisses one; both fail closed
 *      when ADMIN_KEY is unset.
 *   8. Forgery: chat_mute_list / chat_report_ack are privileged, so a
 *      client cannot rebroadcast either (rule 13).
 */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { CHATMOD, REPORT_REASONS } from '../src/chatmod.js';

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
  };
}
const mockEnv = {
  LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) },
};
function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}
const msgsOfType = (ws, type) => ws.sent.filter((m) => m.type === type);
const lastOfType = (ws, type) => { const r = msgsOfType(ws, type); return r[r.length - 1] && r[r.length - 1].payload; };

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), protocolVersion: 2 });
async function join(room2, ws, id, name) {
  room2.sessions.set(ws, baseSession());
  await room2.webSocketMessage(ws, JSON.stringify({
    type: 'join', id, name: name || 'T', phrase: 'p-' + id,
    protocolVersion: 2, data: { x: -90000, y: -90000, z: 'town' },
  }));
}
const P = (n) => 'bp_cm_' + n;
const cmd = (ws, type, payload) => room.webSocketMessage(ws, JSON.stringify({ type, payload: payload || {} }));

const wss = {};
for (const n of ['a', 'b', 'c']) {
  wss[n] = fakeWs(n);
  await join(room, wss[n], P(n), n.toUpperCase());
}

// ── 1. caps + join echo ──
{
  const sync = wss.a.sent.find((m) => m.type === 'state_sync');
  check('state_sync advertises caps.chatMute', !!(sync && sync.caps && sync.caps.chatMute === true), sync && sync.caps && Object.keys(sync.caps).length);
  const list = lastOfType(wss.a, 'chat_mute_list');
  check('chat_mute_list delivered on join (empty, settled)', !!list && Array.isArray(list.list) && list.list.length === 0 && list.settled === true, list);
}

// ── 2. mute / unmute / persistence ──
{
  wss.a.sent.length = 0;
  await cmd(wss.a, 'chat_mute', { target: P('b'), on: true, name: 'B' });
  const stored = await state.storage.get('chat_mute:' + P('a'));
  check('mute persisted under chat_mute:<pid>', !!(stored && stored.list && stored.list[P('b')]), stored);
  const echo = lastOfType(wss.a, 'chat_mute_list');
  check('mute echoes the list with the server-known name', !!echo && echo.list.length === 1 && echo.list[0].id === P('b') && echo.list[0].name === 'B', echo);
  check('in-memory set is live for the fan-out', room._chatModMuted(P('a'), P('b')) === true);
  check('mute is one-directional (B does not mute A)', room._chatModMuted(P('b'), P('a')) === false);

  await cmd(wss.a, 'chat_mute', { target: P('a'), on: true });
  const selfDoc = await state.storage.get('chat_mute:' + P('a'));
  check('self-mute is dropped', !selfDoc.list[P('a')], Object.keys(selfDoc.list));
  await cmd(wss.a, 'chat_mute', { target: 123, on: true });
  await cmd(wss.a, 'chat_mute', { target: 'x'.repeat(CHATMOD.ID_MAX + 1), on: true });
  const junkDoc = await state.storage.get('chat_mute:' + P('a'));
  check('non-string / oversized target ids are dropped', Object.keys(junkDoc.list).length === 1, Object.keys(junkDoc.list));

  // Cross-device: a FRESH room (a deploy / another device) reloads it.
  const room2 = new GameRoom(state, mockEnv);
  const ws2 = fakeWs('a2');
  await join(room2, ws2, P('a'), 'A');
  check('mute list survives a DO restart and reloads on join', room2._chatModMuted(P('a'), P('b')) === true);
  const reload = lastOfType(ws2, 'chat_mute_list');
  check('...and is echoed to the reconnecting client', !!reload && reload.list.length === 1 && reload.list[0].id === P('b'), reload);

  // List cap: a full list refuses the next mute rather than growing.
  {
    const full = {};
    for (let i = 0; i < CHATMOD.MUTE_MAX; i++) full['bp_cm_fill' + i] = { name: 'F', at: 1 };
    await state.storage.put('chat_mute:' + P('a'), { list: full, at: 1 });
    wss.a.sent.length = 0;
    await cmd(wss.a, 'chat_mute', { target: 'bp_cm_onemore', on: true });
    const capEcho = lastOfType(wss.a, 'chat_mute_list');
    check("a full mute list answers 'list-full' and does not grow",
      !!capEcho && capEcho.error === 'list-full' && capEcho.list.length === CHATMOD.MUTE_MAX
      && !(await state.storage.get('chat_mute:' + P('a'))).list['bp_cm_onemore'], capEcho && capEcho.error);
    // Restore the single-entry list the checks below expect.
    await state.storage.put('chat_mute:' + P('a'), { list: { [P('b')]: { name: 'B', at: 2 } }, at: 2 });
    room._chatModCache(P('a'), { [P('b')]: { name: 'B', at: 2 } });
  }

  wss.a.sent.length = 0;
  await cmd(wss.a, 'chat_mute', { target: P('b'), on: false });
  check('unmute clears storage + memory', !(await state.storage.get('chat_mute:' + P('a'))).list[P('b')] && room._chatModMuted(P('a'), P('b')) === false);
  check('unmute echoes an empty list', (lastOfType(wss.a, 'chat_mute_list') || {}).list.length === 0);
}

// ── 3. '__proto__' as a muted id is inert (rule H / TRAPS #6) ──
{
  await cmd(wss.c, 'chat_mute', { target: '__proto__', on: true, name: 'evil' });
  const doc = await state.storage.get('chat_mute:' + P('c'));
  check("'__proto__' lands as an OWN key, not through the prototype",
    Object.prototype.hasOwnProperty.call(doc.list, '__proto__'), Object.keys(doc.list));
  check('...and Object.prototype is untouched', ({}).name === undefined && ({}).at === undefined);
  check('...and the fan-out lookup answers for it', room._chatModMuted(P('c'), '__proto__') === true);
  await cmd(wss.c, 'chat_mute', { target: '__proto__', on: false });
}

// ── 4. fan-out: a muted line never reaches the muter's socket ──
{
  const st = makeState();
  const rm = new GameRoom(st, mockEnv);
  const wa = fakeWs('mA'); const wb = fakeWs('mB'); const wc = fakeWs('mC');
  await join(rm, wa, P('fa'), 'FA');   // muter
  await join(rm, wb, P('fb'), 'FB');   // the flooder
  await join(rm, wc, P('fc'), 'FC');   // bystander, same zone/protocol group
  await rm.webSocketMessage(wa, JSON.stringify({ type: 'chat_mute', payload: { target: P('fb'), on: true } }));
  // Relay a chat + an emote + a non-chat broadcast from the muted player,
  // through the REAL default branch (which stamps msg.from server-side).
  await rm.webSocketMessage(wb, JSON.stringify({ type: 'chat', payload: { text: 'you are all terrible', name: 'spoofed', id: 'spoofed' } }));
  await rm.webSocketMessage(wb, JSON.stringify({ type: 'emote', payload: { emoji: '🤡' } }));
  await rm.webSocketMessage(wb, JSON.stringify({ type: 'player_shield', payload: { up: true } }));
  const relayed = rm.eventBuffer.filter((e) => e.from === P('fb'));
  check('relay stamps the sender server-side (payload.id is not consulted)',
    relayed.length === 3 && relayed[0].payload.id === P('fb'), relayed.map((e) => e.type));
  wa.sent.length = 0; wc.sent.length = 0;
  rm.startTickLoop();
  await new Promise((r) => setTimeout(r, rm.TICK_RATE * 6));
  clearInterval(rm.tickInterval); rm.tickInterval = null;
  const evOf = (ws) => ws.sent.filter((m) => m.type === 'tick' && Array.isArray(m.events))
    .flatMap((m) => m.events).filter((e) => e.from === P('fb'));
  const aEvents = evOf(wa), cEvents = evOf(wc);
  check('muter receives NO chat from the muted player', !aEvents.some((e) => e.type === 'chat'), aEvents.map((e) => e.type));
  check('muter receives NO emote from the muted player', !aEvents.some((e) => e.type === 'emote'), aEvents.map((e) => e.type));
  check('muter STILL receives their non-chat relays (mute != block)', aEvents.some((e) => e.type === 'player_shield'), aEvents.map((e) => e.type));
  check('bystander in the same group still receives the chat', cEvents.some((e) => e.type === 'chat'), cEvents.map((e) => e.type));
  check('bystander still receives the emote', cEvents.some((e) => e.type === 'emote'), cEvents.map((e) => e.type));
  check('the muted text never appeared on the muter socket at all',
    !JSON.stringify(wa.sent).includes('you are all terrible'));
  check('...and it did appear on the bystander socket (guard: the line was really sent)',
    JSON.stringify(wc.sent).includes('you are all terrible'));
  check('the server remembered the line for the report path',
    rm._chatModRecentLines(P('fb')).some((l) => l.text === 'you are all terrible'), rm._chatModRecentLines(P('fb')));
}

// ── 5. party chat honours the mute at its own send loop ──
{
  const st = makeState();
  const rm = new GameRoom(st, mockEnv);
  const wa = fakeWs('pA'); const wb = fakeWs('pB'); const wc = fakeWs('pC');
  await join(rm, wa, P('pa'), 'PA');
  await join(rm, wb, P('pb'), 'PB');
  await join(rm, wc, P('pc'), 'PC');
  await rm.webSocketMessage(wb, JSON.stringify({ type: 'party_invite', payload: { target: P('pa') } }));
  await rm.webSocketMessage(wa, JSON.stringify({ type: 'party_accept', payload: { target: P('pb') } }));
  await rm.webSocketMessage(wb, JSON.stringify({ type: 'party_invite', payload: { target: P('pc') } }));
  await rm.webSocketMessage(wc, JSON.stringify({ type: 'party_accept', payload: { target: P('pb') } }));
  const inParty = !!rm._partyOf(P('pa')) && !!rm._partyOf(P('pc'));
  check('party formed (guard for the party-chat case below)', inParty);
  await rm.webSocketMessage(wa, JSON.stringify({ type: 'chat_mute', payload: { target: P('pb'), on: true } }));
  wa.sent.length = 0; wc.sent.length = 0;
  await rm.webSocketMessage(wb, JSON.stringify({ type: 'party_chat', payload: { text: 'party abuse' } }));
  check('muter gets no party_chat from the muted member', msgsOfType(wa, 'party_chat').length === 0, wa.sent.map((m) => m.type));
  check('other member still gets it', msgsOfType(wc, 'party_chat').length === 1, wc.sent.map((m) => m.type));
  check('party lines are remembered for reports too',
    rm._chatModRecentLines(P('pb')).some((l) => l.text === 'party abuse' && l.lane === 'party'));
}

// ── 6. reports ──
{
  const st = makeState();
  const rm = new GameRoom(st, mockEnv);
  const wr = fakeWs('rep'); const wt = fakeWs('tgt');
  await join(rm, wr, P('ra'), 'Reporter');
  await join(rm, wt, P('rb'), 'Offender');
  await rm.webSocketMessage(wt, JSON.stringify({ type: 'chat', payload: { text: 'buy gold at evil.example' } }));
  wr.sent.length = 0;
  await rm.webSocketMessage(wr, JSON.stringify({
    type: 'chat_report',
    payload: {
      target: P('rb'), reason: 'spam',
      // Everything below is a lie the client is trying to plant:
      text: 'something they never said', lines: [{ text: 'framed!' }],
      byName: 'Admin', targetName: 'Someone Else', at: 1,
    },
  }));
  const ack = lastOfType(wr, 'chat_report_ack');
  check('report acked ok', !!ack && ack.ok === true && !!ack.id, ack);
  const keys = [...(await st.storage.list({ prefix: 'chat_report:' })).keys()];
  check('exactly one report stored under chat_report:', keys.length === 1, keys);
  const rec = await st.storage.get(keys[0]);
  check('report records the server-known reporter + target ids', rec.by === P('ra') && rec.target === P('rb'), rec);
  check('report names are SERVER-resolved, not the claim', rec.byName === 'Reporter' && rec.targetName === 'Offender', { by: rec.byName, target: rec.targetName });
  check("report quotes the SERVER's copy of the chat", rec.lines.length === 1 && rec.lines[0].text === 'buy gold at evil.example', rec.lines);
  check('the client-supplied text/lines are nowhere in the record', !JSON.stringify(rec).includes('framed') && !JSON.stringify(rec).includes('never said'), rec);
  check('reason kept when allowlisted', rec.reason === 'spam', rec.reason);
  check('zone + timestamp recorded', rec.zone === 'town' && typeof rec.at === 'number' && rec.at > 1, { zone: rec.zone, at: rec.at });

  // Reason clamped to the allowlist.
  wr.sent.length = 0;
  rm._chatReportLog.set(P('ra'), []); // clear the dup window for this probe
  await rm.webSocketMessage(wr, JSON.stringify({ type: 'chat_report', payload: { target: P('rb'), reason: 'ADMIN_BACKDOOR' } }));
  const keys2 = [...(await st.storage.list({ prefix: 'chat_report:' })).keys()];
  const rec2 = await st.storage.get(keys2.find((k) => k !== keys[0]));
  check('unknown reason codes clamp to "other"', rec2.reason === 'other', rec2.reason);
  check('REPORT_REASONS is an allowlist, not free text', !REPORT_REASONS.has('ADMIN_BACKDOOR') && REPORT_REASONS.has('abuse'));

  // Refusals.
  wr.sent.length = 0;
  await rm.webSocketMessage(wr, JSON.stringify({ type: 'chat_report', payload: { target: P('ra') } }));
  check('self-report refused', (lastOfType(wr, 'chat_report_ack') || {}).error === 'bad-target', lastOfType(wr, 'chat_report_ack'));
  wr.sent.length = 0;
  await rm.webSocketMessage(wr, JSON.stringify({ type: 'chat_report', payload: { target: 'bp_cm_ghost' } }));
  check('report on an id nobody has ever held is refused', (lastOfType(wr, 'chat_report_ack') || {}).error === 'not-found', lastOfType(wr, 'chat_report_ack'));
  wr.sent.length = 0;
  await rm.webSocketMessage(wr, JSON.stringify({ type: 'chat_report', payload: { target: P('rb') } }));
  check('a second report on the same target inside the dup window is refused',
    (lastOfType(wr, 'chat_report_ack') || {}).error === 'duplicate', lastOfType(wr, 'chat_report_ack'));

  // Hourly rate limit: age the dup window out, keep the hour window.
  const now = Date.now();
  rm._chatReportLog.set(P('ra'), Array.from({ length: CHATMOD.REPORT_PER_HOUR }, (_, i) => ({ ts: now - (CHATMOD.REPORT_DUP_MS + 1000 + i), target: P('rb') })));
  wr.sent.length = 0;
  const before = [...(await st.storage.list({ prefix: 'chat_report:' })).keys()].length;
  await rm.webSocketMessage(wr, JSON.stringify({ type: 'chat_report', payload: { target: P('rb') } }));
  check('hourly rate limit refuses', (lastOfType(wr, 'chat_report_ack') || {}).error === 'rate-hour', lastOfType(wr, 'chat_report_ack'));
  check('...and writes nothing', [...(await st.storage.list({ prefix: 'chat_report:' })).keys()].length === before);

  // ── 7. admin surface ──
  const adminReq = (method, qs, key) => new Request('https://x/api/admin/reports' + (qs || ''), {
    method, headers: key ? { Authorization: 'Bearer ' + key } : {},
  });
  const noKeyRoom = rm; // env has no ADMIN_KEY yet
  let res = await noKeyRoom._adminFetch(adminReq('GET', '', 'whatever'));
  check('reports 404 while ADMIN_KEY is unconfigured (fail-closed)', res.status === 404, res.status);
  rm.env = { ...mockEnv, ADMIN_KEY: 'sekrit' };
  res = await rm._adminFetch(adminReq('GET', '', 'wrong-key'));
  check('wrong key is 401', res.status === 401, res.status);
  res = await rm._adminFetch(adminReq('GET', '?limit=10', 'sekrit'));
  let body = await res.json();
  check('operator can list reports', body.ok === true && body.reports.length === 2, body.reports && body.reports.length);
  check('newest first', body.reports[0].at >= body.reports[1].at, body.reports.map((r) => r.at));
  check('report rows carry their key so one can be dismissed', typeof body.reports[0].key === 'string' && body.reports[0].key.startsWith('chat_report:'), body.reports[0].key);
  res = await rm._adminFetch(adminReq('GET', '?target=' + P('rb'), 'sekrit'));
  body = await res.json();
  check('target filter works', body.reports.length === 2 && body.reports.every((r) => r.target === P('rb')));
  res = await rm._adminFetch(adminReq('GET', '?target=bp_cm_nobody', 'sekrit'));
  body = await res.json();
  check('...and excludes everything else', body.reports.length === 0);
  const dismissKey = keys[0];
  res = await rm._adminFetch(adminReq('DELETE', '?id=' + encodeURIComponent(dismissKey), 'sekrit'));
  body = await res.json();
  check('operator can dismiss a handled report', body.ok === true && !(await st.storage.get(dismissKey)), body);
  const alog = (await st.storage.get('admin_log')) || [];
  check('the dismissal is written to admin_log', alog.some((e) => e.op === 'report_dismiss'), alog.map((e) => e.op));
  res = await rm._adminFetch(adminReq('DELETE', '?id=chat_report:nope', 'sekrit'));
  check('dismissing an unknown report is 404', res.status === 404, res.status);

  // Retention prune on read.
  await st.storage.put('chat_report:ancient', { at: Date.now() - CHATMOD.RETAIN_MS - 1000, by: P('ra'), target: P('rb') });
  res = await rm._adminFetch(adminReq('GET', '', 'sekrit'));
  body = await res.json();
  check('reports past RETAIN_MS are pruned on the admin read', body.pruned >= 1 && !(await st.storage.get('chat_report:ancient')), body.pruned);
}

// ── 8. forgery (rule 13) ──
{
  wss.b.sent.length = 0;
  room.eventBuffer.length = 0;
  await cmd(wss.a, 'chat_mute_list', { list: [] });
  await cmd(wss.a, 'chat_report_ack', { ok: true });
  check('chat_mute_list is privileged (never rebroadcast)', PRIVILEGED_EVENTS.has('chat_mute_list'));
  check('chat_report_ack is privileged (never rebroadcast)', PRIVILEGED_EVENTS.has('chat_report_ack'));
  check('...and neither reached the event buffer', room.eventBuffer.length === 0, room.eventBuffer.map((e) => e.type));
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
