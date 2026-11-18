/* ═══ v2.3.5733: A JOIN'S COLOUR AND AVATAR HELD TO THEIR FORMS (card K2 PR 14; `lookjoin`) ═══
 *
 * Card RV's review, S2, the join's half (lookform.js is RV's, #2112).  A
 * join's `color` and `avatar` were any text, sent to every phone and drawn
 * there as a CSS colour and an <img>.  This holds (join.js
 * _sanitizeJoinData, and the record's stored look laid over the join):
 *
 *   1. the reader: on with no flag, off only with `lookjoin: false`;
 *   2. a colour that is not a hex colour, and an avatar that is not the
 *      page's own proxied address, are dropped; the other cosmetics stay;
 *   3. every honest form goes through exactly: `#rgb` to `#rrggbbaa`, the
 *      page's wsrvUrl (src/networking/index.js), and an empty one;
 *   4. a room: what every phone is sent of a joiner (its state) carries no
 *      bad colour or avatar, and the honest ones exactly;
 *   5. a character record's stored look: a bad stored avatar or colour is
 *      not laid over the join, a good one is;
 *   6. `lookjoin: false`: as before (cut to length, kept).
 *
 * Red on main (v2.3.5732): 1, 2, 4 and 5. */
import { makeStorage, openRoom, fakeWs, baseSession, settle } from './testroom.mjs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
/* the page's own avatar address (src/networking/index.js wsrvUrl) */
const wsrv = (url, size) => `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${size}&h=${size}&fit=cover&output=png`;
const GOOD_AVATAR = wsrv('https://i.seadn.io/gcs/files/abc123.png?w=500&auto=format', 64);
const BAD = {
  color: ['url(https://evil.example/c.png)', 'red', '#12345', '#ggg', 'javascript:alert(1)', '#fff; background:url(x)'],
  avatar: ['https://evil.example/a.png', 'data:image/png;base64,iVBORw0KGgo=', 'https://wsrv.nl/?url=x" onerror="y', 'https://wsrv.nl.evil.example/?url=x', 'https://wsrv.nl/?url=a b'],
};

async function joinWith(room, id, data) {
  const ws = fakeWs(id);
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, phrase: 'p-' + id, protocolVersion: 2, ws: [1, 5], data: { x: 100, y: 100, z: 'town', ...data } }));
  await settle();
  return ws;
}
const dataOf = (room, id) => { for (const s of room.sessions.values()) if (s.id === id) return s.data || {}; return null; };

/* ── 1. the reader ── */
{
  const a = await openRoom(makeStorage());
  const b = await openRoom(makeStorage(), { lookjoin: false });
  check('1. `lookjoin` is on with no flag', typeof a._lookJoinOn === 'function' && a._lookJoinOn() === true);
  check('1. ...off with `lookjoin: false`', typeof b._lookJoinOn === 'function' && b._lookJoinOn() === false);
}

const room = await openRoom(makeStorage());

/* ── 2. off its form: dropped ── */
{
  const kept = [];
  for (const c of BAD.color) { const o = room._sanitizeJoinData({ color: c, hr: 'hr_3' }); if ('color' in o) kept.push(c); }
  check('2. a colour that is not a hex colour is dropped (' + BAD.color.length + ' shapes)', kept.length === 0, kept);
  const keptA = [];
  for (const a of BAD.avatar) { const o = room._sanitizeJoinData({ avatar: a }); if ('avatar' in o) keptA.push(a); }
  check('2. an avatar that is not the page\'s own proxied address is dropped (' + BAD.avatar.length + ' shapes)', keptA.length === 0, keptA);
  const o = room._sanitizeJoinData({ color: 'url(x)', avatar: 'https://evil.example/a.png', hr: 'hr_3', sk: 'sk_2', name: 'Ada' });
  check('2. ...and the other cosmetics stay', o.hr === 'hr_3' && o.sk === 'sk_2' && o.name === 'Ada', o);
}

/* ── 3. every honest form, exactly ── */
{
  const colors = ['#abc', '#abcd', '#D95C54', '#D95C54cc'];
  const o = colors.map((c) => room._sanitizeJoinData({ color: c }).color);
  check('3. every hex colour the creator makes goes through exactly', JSON.stringify(o) === JSON.stringify(colors), o);
  const a = room._sanitizeJoinData({ avatar: GOOD_AVATAR });
  check('3. the page\'s own avatar address goes through exactly', a.avatar === GOOD_AVATAR, a);
  const e = room._sanitizeJoinData({ avatar: '', color: '' });
  check('3. an empty avatar or colour is left as it was', e.avatar === '' && e.color === '', e);
}

/* ── 4. a room ── */
{
  await joinWith(room, 'bp_lj_bad', { color: 'url(https://evil.example/c.png)', avatar: 'https://evil.example/a.png', hr: 'hr_1' });
  await joinWith(room, 'bp_lj_good', { color: '#D95C54', avatar: GOOD_AVATAR });
  const bad = dataOf(room, 'bp_lj_bad'), good = dataOf(room, 'bp_lj_good');
  check('4. what the room keeps of a joiner (sent to every phone) has no bad colour or avatar', !!bad && !('color' in bad) && !('avatar' in bad) && bad.hr === 'hr_1', bad);
  check('4. ...and the honest ones exactly', !!good && good.color === '#D95C54' && good.avatar === GOOD_AVATAR, good);
}

/* ── 5. a character record's stored look ── */
{
  const st = makeStorage();
  const r = await openRoom(st);
  await r.state.storage.put('char:bp_lj_old', { name: 'Old', look: { avatar: 'https://evil.example/old.png', color: 'url(x)', hr: 'hr_2' }, createdAt: 1 });
  await r.state.storage.put('char:bp_lj_ok', { name: 'Ok', look: { avatar: GOOD_AVATAR, color: '#123456' }, createdAt: 1 });
  await joinWith(r, 'bp_lj_old', { color: '#abcdef' });
  await joinWith(r, 'bp_lj_ok', {});
  const d = dataOf(r, 'bp_lj_old'), k = dataOf(r, 'bp_lj_ok');
  check('5. a bad stored avatar or colour is not laid over the join (the phone\'s good one stays)', !!d && d.avatar === undefined && d.color === '#abcdef' && d.hr === 'hr_2', d);
  check('5. ...a good stored one is', !!k && k.avatar === GOOD_AVATAR && k.color === '#123456', k);
}

/* ── 6. the switch ── */
{
  const r = await openRoom(makeStorage(), { lookjoin: false });
  const o = r._sanitizeJoinData({ color: 'url(x)', avatar: 'https://evil.example/a.png' });
  check('6. `lookjoin: false`: as before, kept', o.color === 'url(x)' && o.avatar === 'https://evil.example/a.png', o);
}

console.log(failed === 0 ? '\nALL PASS (' + passed + ')' : '\n' + failed + ' FAILURE(S)');
process.exit(failed === 0 ? 0 : 1);
