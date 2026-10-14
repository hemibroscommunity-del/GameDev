/* ═══ v2.3.3240: A PLAYER'S LOOK IS RELAYED WHEN IT CHANGES, NOT EVERY 2 s ═══
 *
 * lookrelay.js relays a player's `track` to the others only when something
 * other than where they stand, their HP or their inspect card's counters
 * changed, and then only what changed (plus the build keys a phone assigns
 * unconditionally), with a whole copy every FULL_EVERY_MS.  Checked:
 *
 *   1. the rule on its own;
 *   2. THE PHONE SEES THE SAME PLAYER: random looks replayed through a model of
 *      the phone's merge (wsClient.js case 'player_update', copied below),
 *      one phone sent every track whole (the old way), one sent what the rule
 *      lets through -- after every track the two hold the same look, key for
 *      key, but for where the player stands (`x`, `y`, `dir`), which the ticks
 *      carry, HP (LAZY) and the card's counters (LAZY_IN), which match too once
 *      a relay goes.  The rest of the card (`rpgData`) must match after EVERY
 *      track: the phone draws a peer's slung shield from `rpgData.shield`;
 *   3. a room: two players, the second's relays of the first's look --
 *      the same look twice relays once, a change relays only the change, a
 *      whole copy every FULL_EVERY_MS, `lookdelta: false` relays every one
 *      whole, /dev/overview's `lookRelay` counts.
 */
import { GameRoom } from '../src/index.js';
import { LOOK_RELAY, lookDelta } from '../src/lookrelay.js';
import { readFileSync } from 'node:fs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 700))); }
}

let NOW = 1_760_000_000_000;
Date.now = () => NOW;

/* a real phone's look (tools/qa/load/track-sample.json, mp-trackcapture) */
const SAMPLE = JSON.parse(readFileSync(new URL('../../tools/qa/load/track-sample.json', import.meta.url), 'utf8'));
const look = (o) => Object.assign({ x: 1000, y: 1000, name: 'Bro' }, JSON.parse(JSON.stringify(SAMPLE)), o || {});

/* ── 1. the rule ───────────────────────────────────────────────────────── */
{
  const a = look();
  const r1 = lookDelta(a, null, NOW);
  check('1a. the first track goes out whole', r1.full === true && r1.data === a);
  const r2 = lookDelta(look(), r1.last, NOW + 2000);
  check('1b. the same look 2 s later: nothing goes out', r2.data === null && r2.full === false);
  const r3 = lookDelta(look({ x: 1300, y: 900, dir: 'left' }), r1.last, NOW + 2000);
  check('1c. only where they stand changed (x, y, dir): nothing goes out -- the ticks carry it', r3.data === null);
  const r4 = lookDelta(look({ eqc: 'iron', x: 1300 }), r1.last, NOW + 2000);
  check('1d. one key changed (new gear): only it, with x/y/dir riding along',
    r4.data && Object.keys(r4.data).sort().join() === ['dir', 'eqc', 'x', 'y'].sort().join() && r4.data.eqc === 'iron' && r4.data.x === 1300, r4.data);
  const hpOnly = lookDelta(look({ rpgHp: 40, rpgData: Object.assign({}, SAMPLE.rpgData, { kills: 99, svKills: 98, goldEarned: 5000, playtime: 77 }) }), r1.last, NOW + 2000);
  check('1e. HP and the inspect card\'s counters alone (LAZY, LAZY_IN): nothing goes', hpOnly.data === null);
  const r5 = lookDelta(look({ rpgHp: 40, rpgData: Object.assign({}, SAMPLE.rpgData, { kills: 99 }), eqc: 'iron' }), hpOnly.last, NOW + 4000);
  check('1e2. ...and they ride along with the next relay that goes: the card whole, the HP as it is now',
    r5.data && r5.data.rpgHp === 40 && r5.data.rpgData && r5.data.rpgData.kills === 99 && r5.data.eqc === 'iron', r5.data);
  const r6 = lookDelta(look(), r1.last, NOW + LOOK_RELAY.FULL_EVERY_MS);
  check('1f. FULL_EVERY_MS after the last whole copy: whole again, even unchanged', r6.full === true && r6.data && Object.keys(r6.data).length === Object.keys(look()).length);
  /* builds: hg and fr ride every relay while there, and their going is news */
  const b1 = lookDelta(look({ hg: 'tall', fr: 'broad' }), null, NOW);
  const b2 = lookDelta(look({ hg: 'tall', fr: 'broad', eqc: 'iron' }), b1.last, NOW + 2000);
  check('1g. a build (hg/fr) goes in every relay while it is there -- the phone sets it from each relay',
    b2.data && b2.data.hg === 'tall' && b2.data.fr === 'broad' && b2.data.eqc === 'iron', b2.data);
  const b3 = lookDelta(look({ fr: 'broad', eqc: 'iron' }), b2.last, NOW + 4000);
  check('1h. back to an average height (hg gone), nothing else new: a relay goes, without hg', b3.data && !('hg' in b3.data) && b3.data.fr === 'broad', b3.data);
  const b4 = lookDelta(look({ fr: 'broad', eqc: 'iron' }), b3.last, NOW + 6000);
  check('1i. ...and only once', b4.data === null);
  const b5 = lookDelta(look({ fr: 'broad', hg: 'tall', eqc: 'iron' }), b4.last, NOW + 8000);
  check('1j. the height back again: news', b5.data && b5.data.hg === 'tall');
  const d1 = lookDelta(look({ sa: 'A'.repeat(256) }), null, NOW);
  const d2 = lookDelta(look(), d1.last, NOW + 2000);
  check('1k. a drawing left out (rubbed out): nothing goes -- the phone kept it from a whole relay before too', d2.data === null);
  /* leaving a clan clears the tag on every phone by a relay of its own
     (clans.js {clanTag: null}); rejoining the same clan must put it back */
  const c1 = lookDelta(look({ clanTag: 'BRO', clanColor1: '#f00' }), null, NOW);
  const c2 = lookDelta(look(), c1.last, NOW + 2000);
  const c3 = lookDelta(look({ clanTag: 'BRO', clanColor1: '#f00' }), c2.last, NOW + 4000);
  check('1l. a key that went and came back the same (the clan left and rejoined): relayed -- something else may have cleared it',
    c2.data === null && c3.data && c3.data.clanTag === 'BRO' && c3.data.clanColor1 === '#f00', { c2: c2.data, c3: c3.data });
  /* the card is news but for its counters: the phone draws a peer's slung
     shield from rpgData.shield (entityRenderer), so a shield put on or taken
     off must go at once -- the first cut held all of rpgData back a minute */
  const s1 = lookDelta(look(), null, NOW);
  const s2 = lookDelta(look({ rpgData: Object.assign({}, SAMPLE.rpgData, { shield: 'Wooden Shield', kills: 5 }) }), s1.last, NOW + 2000);
  check('1m. a shield put on (rpgData.shield): rpgData relayed at once, whole, its counters with it',
    s2.data && s2.data.rpgData && s2.data.rpgData.shield === 'Wooden Shield' && s2.data.rpgData.kills === 5
      && JSON.stringify(s2.data.rpgData) === JSON.stringify(Object.assign({}, SAMPLE.rpgData, { shield: 'Wooden Shield', kills: 5 })), s2.data);
  const s3 = lookDelta(look({ rpgData: Object.assign({}, SAMPLE.rpgData, { shield: null, kills: 5 }) }), s2.last, NOW + 4000);
  check('1n. ...and taken off: relayed at once', s3.data && s3.data.rpgData && s3.data.rpgData.shield === null, s3.data);
  const s4 = lookDelta(look({ rpgData: Object.assign({}, SAMPLE.rpgData, { shield: null, kills: 9, playtime: 3 }) }), s3.last, NOW + 6000);
  check('1o. then only its counters: nothing', s4.data === null);
  const s5 = lookDelta(look({ rpgData: Object.assign({}, SAMPLE.rpgData, { shield: null, kills: 9, playtime: 3, weapon: 'Iron Sword' }) }), s4.last, NOW + 8000);
  check('1p. the weapon\'s name (the equipment sheet): relayed, with the counters that waited',
    s5.data && s5.data.rpgData && s5.data.rpgData.weapon === 'Iron Sword' && s5.data.rpgData.kills === 9 && s5.data.rpgData.playtime === 3, s5.data);
}

/* ── 2. the phone sees the same player ─────────────────────────────────── */
/* wsClient.js case 'player_update', the parts that write the peer: the
   payload's keys as they come (Object.assign; peerCosmetics maps each short
   key to its long name one to one, so the short keys stand for them here),
   the build set from every relay, and the equip rebuilt from the flat keys
   when any came, the rest kept */
function applyRelay(peer, data) {
  Object.assign(peer, data);
  peer.buildHeight = data.hg || null;
  peer.buildFrame = data.fr || null;
  if (data.eqc !== undefined || data.eql !== undefined || data.eqs !== undefined || data.eqst !== undefined) {
    const e = peer.equip || { chest: 'none', legs: 'none', shoulders: 'none' };
    peer.equip = {
      chest: data.eqc !== undefined ? (data.eqc || 'none') : e.chest,
      legs: data.eql !== undefined ? (data.eql || 'none') : e.legs,
      shoulders: data.eqs !== undefined ? (data.eqs || 'none') : e.shoulders,
      shirt: data.eqst !== undefined ? (data.eqst || 'none') : e.shirt,
    };
  }
}
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* What a phone may hold stale until the next relay goes -- the test's own
   word, not read from the module under test, so a rule that held back more
   than this fails here (and a change to the lists has to be made in both). */
const MAY_LAG = ['rpgHp', 'rpgMaxHp'];
const MAY_LAG_IN = { rpgData: ['kills', 'svKills', 'goldEarned', 'playtime'] };
check('2-. the module\'s lazy lists are the test\'s',
  JSON.stringify(LOOK_RELAY.LAZY) === JSON.stringify(MAY_LAG) && JSON.stringify(LOOK_RELAY.LAZY_IN) === JSON.stringify(MAY_LAG_IN),
  { LAZY: LOOK_RELAY.LAZY, LAZY_IN: LOOK_RELAY.LAZY_IN });
{
  const rnd = seeded(20261013);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const OPTIONAL = ['hg', 'fr', 'sa', 'sb', 'pa', 'ta', 'sp', 'pp', 'mask'];
  let mismatches = 0, firstBad = null, tracks = 0, relays = 0, steps = 0;
  for (let run = 0; run < 200; run++) {
    let cur = look({ name: 'P' + run });
    let last = null;
    const viaFull = {}, viaDelta = {};
    let t = NOW;
    for (let step = 0; step < 120; step++) {
      t += 2000;
      /* what changes between two tracks: mostly nothing, or where they
         stand; sometimes HP, the card, gear, a build, a drawing coming or
         going, the zone, the away flag */
      cur = JSON.parse(JSON.stringify(cur));
      const r = rnd();
      if (r < 0.5) { cur.x += Math.round((rnd() - 0.5) * 600); cur.y += Math.round((rnd() - 0.5) * 600); cur.dir = pick(['up', 'down', 'left', 'right']); }
      if (rnd() < 0.2) cur.rpgHp = Math.floor(rnd() * cur.rpgMaxHp);
      if (rnd() < 0.08) cur.rpgData = Object.assign({}, cur.rpgData, { kills: (cur.rpgData.kills || 0) + 1 });
      if (rnd() < 0.3) cur.rpgData = Object.assign({}, cur.rpgData, { playtime: (cur.rpgData.playtime || 0) + 1, svKills: (cur.rpgData.svKills || 0) + 2, goldEarned: (cur.rpgData.goldEarned || 0) + 10 });
      if (rnd() < 0.04) cur.rpgData = Object.assign({}, cur.rpgData, { shield: pick([null, 'Wooden Shield', 'Iron Shield']) });
      if (rnd() < 0.03) cur.rpgData = Object.assign({}, cur.rpgData, { weapon: pick(['Fists', 'Iron Sword', 'Pine Bow']), power: Math.floor(rnd() * 9) });
      if (rnd() < 0.05) cur.eqc = pick(['none', 'iron', 'copper', 'blacksteel']);
      if (rnd() < 0.05) cur.eqst = pick(['tshirt', 'none', 'hoodie']);
      if (rnd() < 0.04) cur.zone = pick(['wheel', 'town', 'dungeon_1']);
      if (rnd() < 0.04) cur.aw = cur.aw ? 0 : 1;
      if (rnd() < 0.03) {
        /* a clan joined, or left -- and leaving clears the tag on every phone
           by a relay of its own (clans.js), to both phones alike */
        if (cur.clanTag) {
          delete cur.clanTag; delete cur.clanColor1;
          /* clans.js: the clear carries the build keys the player has, and
             the next track goes whole (_lookForget) */
          const clear = { clanTag: null, clanColor1: null };
          if (cur.hg) clear.hg = cur.hg;
          if (cur.fr) clear.fr = cur.fr;
          applyRelay(viaFull, clear);
          applyRelay(viaDelta, clear);
          last = null;
        } else { cur.clanTag = pick(['BRO', 'HMI']); cur.clanColor1 = '#0f0'; }
      }
      if (rnd() < 0.06) {
        const k = pick(OPTIONAL);
        if (k in cur) delete cur[k];
        else cur[k] = k === 'hg' ? pick(['tall', 'short']) : k === 'fr' ? pick(['broad', 'lean']) : k.length === 2 && k[1] === 'p' ? 'stripes' : 'X'.repeat(256);
      }
      tracks++;
      applyRelay(viaFull, cur);
      const res = lookDelta(cur, last, t);
      last = res.last;
      if (res.data) { relays++; applyRelay(viaDelta, res.data); }
      steps++;
      /* the same peer, but for where they stand -- and, while nothing has
         gone since they changed, HP (LAZY) and the card's counters (LAZY_IN) */
      for (const k of new Set([...Object.keys(viaFull), ...Object.keys(viaDelta)])) {
        if (k === 'x' || k === 'y' || k === 'dir') continue;
        if (!res.data && MAY_LAG.includes(k)) continue;
        let a = viaFull[k], b = viaDelta[k];
        if (!res.data && MAY_LAG_IN[k] && a && b && typeof a === 'object' && typeof b === 'object') {
          a = Object.assign({}, a); b = Object.assign({}, b);
          for (const c of MAY_LAG_IN[k]) { delete a[c]; delete b[c]; }
        }
        if (JSON.stringify(a) !== JSON.stringify(b)) {
          mismatches++;
          if (!firstBad) firstBad = { run, step, k, full: viaFull[k], delta: viaDelta[k] };
        }
      }
    }
  }
  check('2a. 24,000 tracks of random looks: the phone holds the same player both ways after every one, key for key (but where they stand; HP and the card\'s counters once a relay goes)', mismatches === 0, firstBad);
  check(`2b. ...with far fewer relays: ${relays} of ${tracks} tracks went out (${(100 * relays / tracks).toFixed(0)}%)`, relays < tracks * 0.6, { relays, tracks });
}

/* ── 3. a room ─────────────────────────────────────────────────────────── */
function mockState() {
  const store = new Map();
  return {
    storage: { get: async (k) => store.get(k), put: async (k, v) => { store.set(k, v); }, list: async () => new Map(), delete: async (k) => { store.delete(k); } },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(s); }, close() {} }; }
function baseSession() { return { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' }; }
async function join(room, id) {
  const ws = fakeWs();
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, protocolVersion: 2, data: { x: 1000, y: 1000, z: 'town' } }));
  return ws;
}
const updatesOf = (ws, id) => ws.sent.map((s) => { try { return JSON.parse(s); } catch { return null; } })
  .filter((m) => m && m.type === 'player_update' && m.id === id);
async function track(room, ws, data) { await room.webSocketMessage(ws, JSON.stringify({ type: 'track', data })); }
{
  const room = new GameRoom(mockState(), mockEnv);
  room._liveFlags = {};
  const A = await join(room, 'la');
  const B = await join(room, 'lb');
  B.sent.length = 0;
  const base = look({ name: 'la' });
  await track(room, A, base);
  NOW += 2000; await track(room, A, base);
  NOW += 2000; await track(room, A, Object.assign({}, base, { x: 1500, dir: 'left' }));
  let u = updatesOf(B, 'la');
  check('3a. a room: the same look three times (once walked), one relay -- the first, whole', u.length === 1 && Object.keys(u[0].data).length >= Object.keys(SAMPLE).length - 2, u.map((m) => Object.keys(m.data).length));
  B.sent.length = 0;
  NOW += 2000; await track(room, A, Object.assign({}, base, { rpgHp: 12 }));
  u = updatesOf(B, 'la');
  check('3b. HP changed alone: no relay (it rides along later)', u.length === 0, u.map((m) => m.data));
  NOW += 2000; await track(room, A, Object.assign({}, base, { rpgHp: 12, eqc: 'iron' }));
  u = updatesOf(B, 'la');
  check('3b2. new gear: one relay of the gear, the HP riding along, nothing else of the look',
    u.length === 1 && u[0].data.eqc === 'iron' && u[0].data.rpgHp === 12 && !('sk' in u[0].data) && !('rpgData' in u[0].data), u.map((m) => m.data));
  base.eqc = 'iron';
  B.sent.length = 0;
  NOW += LOOK_RELAY.FULL_EVERY_MS; await track(room, A, Object.assign({}, base, { rpgHp: 12 }));
  u = updatesOf(B, 'la');
  check('3c. FULL_EVERY_MS later, unchanged: one whole copy', u.length === 1 && 'sk' in u[0].data && 'rpgData' in u[0].data);
  check('3d. the sender is never sent its own', updatesOf(A, 'la').length === 0);
  const info = room._lookInfo();
  check('3e. /dev/overview lookRelay counts the tracks and what went out', info.on === true && info.tracks === 6 && info.full === 2 && info.delta === 1 && info.none === 3, info);
  /* the kill switch */
  room._liveFlags = { lookdelta: false };
  B.sent.length = 0;
  NOW += 2000; await track(room, A, Object.assign({}, base, { rpgHp: 12 }));
  NOW += 2000; await track(room, A, Object.assign({}, base, { rpgHp: 12 }));
  u = updatesOf(B, 'la');
  check('3f. lookdelta: false -- every track relayed whole again', u.length === 2 && u.every((m) => 'sk' in m.data && 'rpgData' in m.data) && room._lookInfo().on === false);
  room._liveFlags = {};
  B.sent.length = 0;
  NOW += 2000; await track(room, A, Object.assign({}, base, { rpgHp: 12 }));
  u = updatesOf(B, 'la');
  check('3g. switched back on: the first relay after is whole (nothing assumed of what was sent while off)', u.length === 1 && 'rpgData' in u[0].data);
  /* a rejoin is a new session: whole again */
  const A2 = await join(room, 'la');
  B.sent.length = 0;
  await track(room, A2, Object.assign({}, base, { rpgHp: 12 }));
  u = updatesOf(B, 'la');
  check('3h. a rejoin starts whole', u.length === 1 && 'rpgData' in u[0].data);
}

console.log(`\nlook-relay: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
