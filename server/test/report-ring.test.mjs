/* ═══ v2.3.5623: A REPORT QUOTES WHAT THE REPORTER RECEIVED (card MOD PR 3) ═══
 *
 * The red team's RT-3 S4 (docs/security/rt3-findings.md; its proof
 * t5-evidence.mjs, here as checks): a report quoted the speaker's last 3
 * lines in ANY lane, so two abusive whispers followed by three harmless lines
 * to someone else left the report holding "nice weather / lol / gg".  Card
 * K's design: each remembered line keeps whom it was for (chatmod.js
 * _chatModRemember's `to`), the ring holds 20 a speaker, and a report takes
 * the speaker's lines the REPORTER could have received.  On card E's room:
 *   1. The flush: two whispers to the victim, three to someone else, and the
 *      victim's report holds the two, not the three.
 *   2. Room chat (everyone hears it) is quoted; a private line to someone
 *      else is not, and is in that one's own report; an area line in the
 *      reporter's zone is.
 *   3. `reportring: false`: the last 3 lines, any lane, as before.
 */
import { makeStorage, openRoom, fakeWs, join, settle, seededClock } from './testroom.mjs';
import { CHATMOD } from '../src/chatmod.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 400) : ''); }
}

const clock = seededClock({ seed: 23 }).install();
const S = makeStorage();
const room = await openRoom(S);
const A = fakeWs('A'), V = fakeWs('V'), F = fakeWs('F');
await join(room, A, 'bp_rr_harasser', { name: 'Harry', data: { x: 100, y: 100, z: 'town', name: 'Harry', hc: '#ffffff' } });
await join(room, V, 'bp_rr_victim01', { name: 'Vicky', data: { x: 100, y: 100, z: 'town', name: 'Vicky', hc: '#ffffff' } });
await join(room, F, 'bp_rr_friend01', { name: 'Fred', data: { x: 100, y: 100, z: 'town', name: 'Fred', hc: '#ffffff' } });
const send = async (ws, type, payload) => { clock.advance(2100); await room.webSocketMessage(ws, JSON.stringify({ type, payload })); await settle(); };
const reports = () => [...S._store].filter(([k]) => k.startsWith('chat_report:')).map(([, v]) => v);
const lastReport = () => reports().sort((a, b) => a.at - b.at).pop();

/* ── 1. the flush (t5-evidence.mjs) ── */
{
  await send(A, 'whisper', { to: 'Vicky', text: 'ABUSIVE LINE 1' });
  await send(A, 'whisper', { to: 'Vicky', text: 'ABUSIVE LINE 2' });
  for (const t of ['nice weather', 'lol', 'gg']) await send(A, 'whisper', { to: 'Fred', text: t });
  await send(V, 'chat_report', { target: 'bp_rr_harasser', reason: 'harassment' });
  const r = lastReport();
  const texts = r ? r.lines.map((l) => l.text) : [];
  check('1: the victim\'s report holds the two whispers it received (t5-evidence.mjs: it held "nice weather / lol / gg")',
    texts.includes('ABUSIVE LINE 1') && texts.includes('ABUSIVE LINE 2'), texts);
  check('1: ...and not the lines whispered to someone else', !texts.some((t) => ['nice weather', 'lol', 'gg'].includes(t)), texts);
}

/* ── 2. what the reporter could have received ── */
{
  clock.advance(CHATMOD.REPORT_DUP_MS + 1);
  await send(A, 'chat', { text: 'a room line everyone heard' });
  await send(A, 'whisper', { to: 'Fred', text: 'a private line to Fred' });   /* (a friend_dm needs friends first: a whisper is the private lane any two share) */
  await send(A, 'area_chat', { text: 'an area line in town' });
  clock.advance(CHATMOD.REPORT_DUP_MS + 1);
  await send(V, 'chat_report', { target: 'bp_rr_harasser', reason: 'harassment' });
  const texts = lastReport().lines.map((l) => l.text);
  check('2: room chat (everyone heard it) is quoted', texts.includes('a room line everyone heard'), texts);
  check('2: an area line in the reporter\'s zone is quoted', texts.includes('an area line in town'), texts);
  check('2: a private line to someone else is not', !texts.includes('a private line to Fred'), texts);
  check('2: at most REPORT_LINES lines', texts.length <= CHATMOD.REPORT_LINES, texts.length);
  /* Fred, who received the private line, gets it in HIS report */
  clock.advance(CHATMOD.REPORT_DUP_MS + 1);
  await send(F, 'chat_report', { target: 'bp_rr_harasser', reason: 'harassment' });
  const fred = lastReport().lines.map((l) => l.text);
  check('2: the friend who received the private line has it in his own report', fred.includes('a private line to Fred') && !fred.includes('ABUSIVE LINE 1'), fred);
}

/* ── 3. the kill switch ── */
{
  room._liveFlags.reportring = false;
  for (const t of ['one', 'two', 'three']) await send(A, 'whisper', { to: 'Fred', text: t });
  clock.advance(CHATMOD.REPORT_DUP_MS + 1);
  await send(V, 'chat_report', { target: 'bp_rr_harasser', reason: 'harassment' });
  const texts = lastReport().lines.map((l) => l.text);
  check('3: `reportring: false`: the last 3 lines, any lane, as before', JSON.stringify(texts) === JSON.stringify(['one', 'two', 'three']), texts);
  delete room._liveFlags.reportring;
}

clock.restore();
console.log(failures ? `\n${failures} FAILURE(S)` : '\nall report-ring checks passed');
process.exit(failures ? 1 : 0);
