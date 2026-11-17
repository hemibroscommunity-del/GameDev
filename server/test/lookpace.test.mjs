/* ═══ v2.3.5721: THE LOOK RELAY PACED AND BOUNDED (card K2 PR 2) ═══
 *
 * The second red team's CRITICAL 2 (session "Grand plan red team review",
 * proved on the test room): `track` kept `rpgData` whole up to
 * TRACK_BLOB_MAX_BYTES and the look relay (lookrelay.js `_lookRelay`) sent
 * `player_update` to the room at once, outside the relay byte budget
 * (relay.js RELAY.BYTES_*): one socket made the room send about 0.9 MB a
 * second to every other phone.  This holds:
 *
 *   1. THE FLOOD: one socket sends a `track` 100 times a second for 10 s,
 *      each with a fresh 7 KB `rpgData`.  What another phone receives of it
 *      is under the relay budget (BYTES_PER_S a second and one BYTES_BURST),
 *      and at most one relay a second;
 *   2. THE HONEST PHONE: a look change (a shield put on) 2 s after the last
 *      track reaches another phone at once; one inside the second reaches
 *      it at the next slot (within about 1 s), the latest winning;
 *   3. THE FIELDS: every field a page reads of another player's `rpgData`
 *      (RPGDATA_READ) arrives as the page sent it; the eight no page reads
 *      of another player (power ... deaths) and anything else are left out;
 *      the player's own copy (playerState) keeps them all;
 *   4. the switch: `lookpace: false` relays at once and whole, as before.
 *
 * Red on main (v2.3.5719): 1 (some 0.7 MB a second, 100 relays a second)
 * and 3 (every field relayed). */
import { makeStorage, openRoom, fakeWs, join, seededClock, settle } from './testroom.mjs';
import * as LR from '../src/lookrelay.js';
import { RELAY } from '../src/relay.js';
import { readFileSync } from 'node:fs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const quiet = async (f) => { const w = console.warn, l = console.log; console.warn = () => {}; try { return await f(); } finally { console.warn = w; console.log = l; } };

/* a real phone's look (tools/qa/load/track-sample.json, mp-trackcapture), with every field the page sends */
const SAMPLE = JSON.parse(readFileSync(new URL('../../tools/qa/load/track-sample.json', import.meta.url), 'utf8'));
const RPG = Object.assign({}, SAMPLE.rpgData, {
  shield: null, svKills: 12, title: 'slayer', rarest: 'first_blood', clanTag: 'BRO', clanName: 'Bro Squad', clanColor1: '#D95C54',
  petInfo: { name: 'Rex', species: 'Wolf', level: 3, kind: 'wolf', stage: 2, gold: false },
});
const look = (o) => Object.assign(JSON.parse(JSON.stringify(SAMPLE)), { rpgData: JSON.parse(JSON.stringify(RPG)) }, o || {});
const ups = (ws, id) => ws.sent.filter((m) => m.type === 'player_update' && m.id === id);
const bytesOf = (list) => list.reduce((n, m) => n + JSON.stringify(m).length, 0);

async function room3(flags) {
  const clock = seededClock().install();
  const room = await openRoom(makeStorage(), flags);
  const wa = fakeWs('a'), wb = fakeWs('b'), wc = fakeWs('c');
  await join(room, wa, 'bp_lookpace_a', { loginTaken: true });
  await join(room, wb, 'bp_lookpace_b', { loginTaken: true });
  await join(room, wc, 'bp_lookpace_c', { loginTaken: true });
  const sa = room.sessions.get(wa);
  const track = async (data) => { await room.webSocketMessage(wa, JSON.stringify({ type: 'track', data })); };
  /* the held look's slot, as its timer would (the clock is the test's) */
  const flush = () => { if (room._lookFlush) room._lookFlush(sa, Date.now()); };
  return { clock, room, wa, wb, wc, sa, track, flush, done() { if (sa._lookTimer) clearTimeout(sa._lookTimer); sa._lookTimer = null; clock.restore(); } };
}

/* ── 1. the flood ── */
async function flood(flags) {
  const r = await room3(flags);
  await r.track(look());
  r.clock.advance(2000); r.flush();
  r.wb.sent.length = 0;
  const SECONDS = 10, RATE = 100;
  const t0 = Date.now();
  await quiet(async () => {
    for (let i = 0; i < SECONDS * RATE; i++) {
      r.clock.advance(1000 / RATE);
      const rd = Object.assign({}, RPG, { ['junk' + i]: 'x'.repeat(7000), weapon: 'Blade ' + i });
      await r.track(look({ rpgData: rd }));
      r.flush();
    }
  });
  const got = ups(r.wb, r.sa.id);
  const out = { relays: got.length, bytes: bytesOf(got), seconds: (Date.now() - t0) / 1000 };
  r.done();
  return out;
}
{
  const f = await flood();
  const perS = f.bytes / f.seconds;
  const line = RELAY.BYTES_PER_S + RELAY.BYTES_BURST / f.seconds;
  console.log('     (the flood: ' + f.relays + ' relays, ' + f.bytes + ' bytes to another phone in ' + f.seconds + ' s: ' + Math.round(perS) + ' B/s; the line ' + Math.round(line) + ')');
  check('1. a 10 s flood of fresh 7 KB looks: another phone receives under the relay budget (' + Math.round(line) + ' B/s)', perS <= line, { perS: Math.round(perS), relays: f.relays });
  check('1. ...and at most one look relay a second', f.relays <= f.seconds + 1, f.relays);
  const off = await flood({ lookpace: false });
  console.log('     (lookpace: false: ' + off.relays + ' relays, ' + Math.round(off.bytes / off.seconds) + ' B/s)');
  check('4. `lookpace: false`: every track relayed at once, whole, as before', off.relays > 10 * f.relays && off.bytes / off.seconds > 100 * 1024, { relays: off.relays, perS: Math.round(off.bytes / off.seconds) });
}

/* ── 2. the honest phone ── */
{
  const r = await room3();
  await r.track(look());
  r.clock.advance(2000); r.flush();
  r.wb.sent.length = 0;
  /* a shield put on, 2 s after the last track (the page's own pace) */
  await r.track(look({ rpgData: Object.assign({}, RPG, { shield: 'Oak Buckler' }) }));
  let got = ups(r.wb, r.sa.id);
  check('2. a shield put on 2 s after the last track reaches another phone at once', got.length === 1 && got[0].data.rpgData && got[0].data.rpgData.shield === 'Oak Buckler', got.map((m) => m.data));
  /* two changes inside the next second: held, the latest wins at the slot */
  r.clock.advance(300);
  await r.track(look({ rpgData: Object.assign({}, RPG, { shield: 'Iron Kite' }), eqc: 'iron' }));
  r.clock.advance(300);
  await r.track(look({ rpgData: Object.assign({}, RPG, { shield: 'Gold Tower' }), eqc: 'gold' }));
  got = ups(r.wb, r.sa.id);
  const heldNow = !LR.LOOK_PACE || got.length === 1;
  check('2. two changes inside the second: held (nothing more yet)', heldNow, got.length);
  r.clock.advance(400); r.flush();
  got = ups(r.wb, r.sa.id);
  const last = got[got.length - 1];
  check('2. ...at the slot (1 s after the last relay) the latest goes, once', got.length === 2 && last.data.rpgData.shield === 'Gold Tower' && last.data.eqc === 'gold', got.map((m) => m.data && m.data.eqc));
  /* the timer itself: a held look with no flush by hand goes out on its own */
  r.clock.advance(200);
  await r.track(look({ rpgData: Object.assign({}, RPG, { shield: 'Tin Cup' }), eqc: 'tin' }));
  r.clock.advance(1000);
  if (r.sa._lookTimer) await new Promise((res) => setTimeout(res, 1100));
  got = ups(r.wb, r.sa.id);
  check('2. ...and the slot\'s timer sends a held look by itself', got.length === 3 && got[2].data.eqc === 'tin', got.map((m) => m.data && m.data.eqc));
  check('2. the third phone saw the same', ups(r.wc, r.sa.id).length === ups(r.wb, r.sa.id).length + 1);
  r.done();
}

/* ── 3. the fields ── */
{
  const r = await room3();
  r.wb.sent.length = 0;
  const junk = Object.assign({}, RPG, { stuff: 'y'.repeat(3000), nested: { a: 1 } });
  r.clock.advance(70000);
  await r.track(look({ rpgData: junk }));
  const got = ups(r.wb, r.sa.id);
  const rd = got.length ? got[got.length - 1].data.rpgData : null;
  const READ = LR.RPGDATA_READ || {};
  const READ_KEYS = ['weapon', 'armor', 'shield', 'amulet', 'clanTag', 'clanName', 'clanColor1', 'title', 'rarest', 'ap', 'kills', 'svKills', 'quests', 'dungeons', 'goldEarned', 'lifeTotal', 'playtime', 'farmReady', 'combat', 'petInfo'];
  check('3. RPGDATA_READ names every field a page reads of another player', READ_KEYS.every((k) => Object.prototype.hasOwnProperty.call(READ, k)) && Object.keys(READ).length === READ_KEYS.length, Object.keys(READ));
  /* as the page sent it, after the worker's own stamps (ap, title, rarest: achievements.js), i.e. the player's own copy */
  const own = (r.room.playerState[r.sa.id] || {}).rpgData || {};
  const same = rd && READ_KEYS.every((k) => JSON.stringify(rd[k]) === JSON.stringify(own[k]));
  check('3. every field a page reads arrives as the page sent it (the worker\'s stamps kept)', !!same && rd.weapon === junk.weapon && JSON.stringify(rd.petInfo) === JSON.stringify(junk.petInfo), { rd, own });
  const left = ['power', 'vitality', 'endurance', 'agility', 'mind', 'pvpKills', 'pvpDeaths', 'deaths', 'stuff', 'nested'];
  check('3. the fields no page reads of another player, and anything else, are left out', rd && left.every((k) => !(k in rd)), rd && Object.keys(rd));
  const ps = r.room.playerState[r.sa.id];
  check('3. the player\'s own copy keeps them all (playerState)', ps && ps.rpgData && left.every((k) => k in ps.rpgData), ps && ps.rpgData && Object.keys(ps.rpgData));
  /* a change to a field nobody reads alone is no longer news */
  r.wb.sent.length = 0;
  r.clock.advance(2000);
  await r.track(look({ rpgData: Object.assign({}, junk, { power: 99, stuff: 'z' }) }));
  check('3. a change only to a field no page reads sends nothing', ups(r.wb, r.sa.id).length === 0, ups(r.wb, r.sa.id).map((m) => m.data));
  /* a text past TEXT_MAX is cut; a wrong form is left out */
  if (LR.rpgDataRelayed) {
    const c = LR.rpgDataRelayed({ weapon: 'w'.repeat(500), armor: 7, kills: 'many', combat: { melee: 3, bow: 'x', evil: 1 }, petInfo: [1], shield: null });
    check('3. a long text cut to TEXT_MAX, a wrong form left out, null kept', c.weapon.length === LR.LOOK_PACE.TEXT_MAX && !('armor' in c) && !('kills' in c) && JSON.stringify(c.combat) === '{"melee":3}' && !('petInfo' in c) && c.shield === null, c);
  } else check('3. a long text cut to TEXT_MAX, a wrong form left out, null kept', false, 'no rpgDataRelayed');
  r.done();
}

await settle();
console.log(failed === 0 ? '\nALL PASS (' + passed + ')' : '\n' + failed + ' FAILURE(S)');
process.exit(failed === 0 ? 0 : 1);
