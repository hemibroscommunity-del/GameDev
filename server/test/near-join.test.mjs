/* ═══ v2.3.3276: A JOIN IS TOLD THE PLAYERS AROUND IT (nearjoin.js) ═══
 *
 * A phone that joins with `nj: 1` (beside `pres: 2`) is sent the players
 * around it whole and everyone else as a list entry (`fa`); a player's whole
 * look comes in the tick that first sends them to it whole (`pl`), and on the
 * tick after it arrives somewhere.  Checked on a room with a fake clock, beside
 * a phone that did not opt in (the snapshot, player_join and ticks as before):
 *
 *   1. the snapshot: around it whole (its zone, its party far away, itself);
 *      everyone else a list entry -- the lists' fields, nothing of the look;
 *      the control phone everyone whole, as getAllPlayerData() always was;
 *   2. arriving in the Wheel: the next tick carries the look and the place of
 *      everyone around, standing still too; never twice; never to the control;
 *   3. a far player walking in: their look in the tick that first sends them
 *      whole, before... (in the same message); not again;
 *   4. a look relayed whole after the snapshot is held (no `pl`); a delta is not;
 *      the set of looks sent whole is pruned once a roster to the last minute's;
 *   5. player_join: whole to a phone the joiner is around, a list entry to one
 *      far off (and it no longer holds their look), whole to the control;
 *   6. `nearjoin: false`: the whole snapshot again, caps.nearjoin false; a phone
 *      that already got a near one keeps its `pl`s; v1 and pres-less joins
 *      never get one;
 *   7. A RANDOM ROOM, 3,000 ticks: players walking in and out of the phone's
 *      circle, changing their looks near and far, leaving and coming back --
 *      a model of each phone's merge (the snapshot, player_join, the relay,
 *      `pl`) shows, on every tick, every player sent to the near-join phone
 *      whole and around it in exactly the look the control phone (which gets
 *      everything) shows, never a list entry; and the tick builders agree;
 *   8. the phone's half: src/game/nearJoin.js parks a list entry, applies a
 *      `pl` (new and listed players), and wsClient.js calls them in order.
 */
import { GameRoom } from '../src/index.js';
import { FAR_PLAYERS } from '../src/tick.js';
import { NEAR_JOIN } from '../src/nearjoin.js';
import { LOOK_RELAY } from '../src/lookrelay.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900))); }
}

let NOW = 1_800_000_000_000;
Date.now = () => NOW;

function mockState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async () => new Map(),
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(s); }, close() {} }; }
function baseSession() { return { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' }; }

async function makeRoom() {
  const room = new GameRoom(mockState(), mockEnv);
  room.MAX_PLAYERS = 400;
  let tickFn = null;
  const realSetInterval = globalThis.setInterval;
  globalThis.setInterval = (fn, ms) => {
    if (ms === room.TICK_RATE && !tickFn) { tickFn = fn; return 1; }
    return realSetInterval(fn, ms);
  };
  room.startTickLoop();
  globalThis.setInterval = realSetInterval;
  return { room, tickFn };
}

/* a look like a real phone's (tools/qa/load/track-sample.json), its own colours */
const HEX = '0123456789abcdef';
function lookFor(i, v = 0) {
  const c = (k) => '#' + HEX[(i + k + v) % 16] + HEX[(i * 3 + k) % 16] + '00' + HEX[(v + k) % 16] + HEX[(i + v) % 16];
  const look = {
    color: c(1), avatar: null, aw: 0, bt: c(2), bl: c(3), hw: ['none', 'cap', 'beanie'][(i + v) % 3],
    fh: 'none', hr: ['none', 'short', 'long', 'mohawk'][(i + v) % 4], sk: ['default', 'tan', 'dark'][i % 3],
    hc: 'default', htc: 'default', ewc: 'default', fhc: 'default', ew: 'none', es: 'none', sc: 'none',
    st: v % 2 ? 'stripes' : 'none', stc: c(4), ec: 'default', eqc: 'none', eql: 'none', eqs: 'none', eqst: 'tshirt',
    pt: 'default', sh: 'default', rpgLv: 3 + (i % 7), rpgHp: 118, rpgMaxHp: 118, bs: 'slim',
    wpnType: ['greatsword', 'bow', 'staff'][(i + v) % 3], rep: 'neutral',
    rpgData: { weapon: 'Copper Great Sword', armor: 'Rags', shield: null, amulet: null, power: 1, vitality: 2,
      endurance: 0, agility: 0, mind: 0, ap: 3 + i, kills: 10 + i, pvpKills: 0, pvpDeaths: 0, deaths: 1, quests: 4,
      playtime: 30 + i, dungeons: i % 3, goldEarned: 500 + i, lifeTotal: 7 + i, clanTag: null, clanName: null, clanColor1: null,
      combat: { melee: 3, bow: 1, magic: 1 }, farmReady: 0 },
  };
  /* every third player has drawn a shirt (256 hex), the heavy part of a look */
  if (i % 3 === 0) look.sa = (HEX[(i + v) % 16] + HEX[i % 16]).repeat(128);
  return look;
}

const ARRIVAL = { x: 21504, y: 21792 };

async function join(room, id, { nj = false, pres = 2, pv = 2, at = null, look = null } = {}) {
  const ws = fakeWs();
  room.sessions.set(ws, baseSession());
  const msg = { type: 'join', id, name: 'N_' + id, data: { ...(look || {}), x: 1000, y: 1000, z: 'town' } };
  if (pv === 2) msg.protocolVersion = 2;
  if (pres !== undefined) msg.pres = pres;
  if (nj) msg.nj = 1;
  await room.webSocketMessage(ws, JSON.stringify(msg));
  const p = { ws, id, nj };
  if (at) await move(room, p, at.x, at.y, at.z || 'wheel');
  return p;
}
const sessionOf = (room, p) => room.sessions.get(p.ws);
async function move(room, p, x, y, z = 'wheel', vx = 0, vy = 0) {
  await room.webSocketMessage(p.ws, JSON.stringify({ type: 'move', x, y, d: 'south', f: 'south', z, vx, vy, dodging: false, blocking: false, ba: null, dead: false, ex: null }));
}
/* where a player stands, set on the worker as a move would (no speed cap) */
function place(room, p, x, y, moving = true) {
  const ps = room.playerState[p.id];
  ps.x = x; ps.y = y; ps.vx = moving ? 1 : 0; ps.vy = 0; ps.lastMoveAt = NOW;
  room.dirtyPlayers.add(p.id);
}
async function track(room, p, look) { await room.webSocketMessage(p.ws, JSON.stringify({ type: 'track', data: look })); }
const STEP_MS = 22;
function step(room, tickFn) {
  NOW += STEP_MS;
  for (const id of Object.keys(room.playerState)) {
    const s = room.playerState[id];
    if (s) { s.hp = Math.max(s.hp || 0, 1e6); s.maxHp = Math.max(s.maxHp || 0, 1e6); s.dead = false; s.dying = false; }
  }
  tickFn();
}
const msgsOf = (p, from = 0) => p.ws.sent.slice(from).map((s) => JSON.parse(s));
const ticksOf = (p, from = 0) => msgsOf(p, from).filter((m) => m.type === 'tick');
const syncOf = (p) => msgsOf(p).find((m) => m.type === 'state_sync');
const isPresence = (room) => (room.tickSeq - 1) % room.PRESENCE_REFRESH_TICKS === 0;
function toRoster(room, tickFn) { do step(room, tickFn); while (!isPresence(room)); }

/* the keys of a look that say what someone looks like (not where they are,
   nor the inspect card's counters a relay leaves for later -- LOOK_RELAY) */
const POS = new Set(['x', 'y', 'd', 'dir', 'z', 'zone', 'vx', 'vy', 'f', 'ex', 'bro', 'aw', ...LOOK_RELAY.LAZY]);
function lookSig(e) {
  if (!e) return null;
  const o = {};
  for (const k of Object.keys(e).sort()) {
    if (POS.has(k) || k === 'fa') continue;
    let v = e[k];
    if (k === 'rpgData' && v && typeof v === 'object') {
      const lazy = new Set(LOOK_RELAY.LAZY_IN.rpgData);
      v = Object.fromEntries(Object.keys(v).sort().filter((x) => !lazy.has(x)).map((x) => [x, v[x]]));
    }
    o[k] = v;
  }
  return JSON.stringify(o);
}

/* ── A MODEL OF A PHONE'S PEERS ─────────────────────────────────────────
   What wsClient.js keeps of each player, by wire key: the snapshot REPLACES
   the map, player_join replaces an entry, the relay (player_update) merges
   its keys, a tick's `pl` (applied first) merges a whole entry and makes it
   whole, its players only move them.  `pump()` reads what arrived since. */
class PhoneModel {
  constructor(p) { this.p = p; this.at = 0; this.others = new Map(); this.lastTick = null; }
  pump(onTick) {
    const ms = msgsOf(this.p, this.at);
    this.at = this.p.ws.sent.length;
    for (const m of ms) {
      if (m.type === 'state_sync') {
        this.others = new Map();
        for (const [id, e] of Object.entries(m.players || {})) if (id !== this.p.id) this.others.set(id, { ...e });
      } else if (m.type === 'player_join') {
        this.others.set(m.id, { ...(m.data || {}), name: m.name });
      } else if (m.type === 'player_update') {
        const o = this.others.get(m.id) || {};
        Object.assign(o, m.data || {});
        this.others.set(m.id, o);
      } else if (m.type === 'player_leave') {
        this.others.delete(m.id);
      } else if (m.type === 'tick') {
        if (m.pl) for (const [id, e] of Object.entries(m.pl)) {
          if (id === this.p.id) continue;
          const o = this.others.get(id) || {};
          Object.assign(o, e);
          delete o.fa;
          this.others.set(id, o);
        }
        if (m.players) for (const id of Object.keys(m.players)) if (id !== this.p.id && !this.others.has(id)) this.others.set(id, { fa: 1, placeholder: 1 });
        this.lastTick = m;
        if (onTick) onTick(m);
      }
    }
  }
}

/* ══ 1-6: a small room, step by step ════════════════════════════════════ */
const { room, tickFn } = await makeRoom();
room._tickShareVerify = { checked: 0, mismatched: 0, first: null };
room._liveFlags = { steadymovers: false };
/* the room before the phones: one in town, one near BroTown, one far off,
   one who will be the phone's party member, far away */
const T = await join(room, 'pt');
const C = await join(room, 'pcl', { at: { x: ARRIVAL.x + 600, y: ARRIVAL.y + 200 } });
const F = await join(room, 'pfar', { at: { x: ARRIVAL.x + 5000, y: ARRIVAL.y } });
const P = await join(room, 'ppty', { at: { x: ARRIVAL.x, y: ARRIVAL.y + 9000 } });
const others0 = [T, C, F, P];
for (let i = 0; i < others0.length; i++) await track(room, others0[i], lookFor(i + 1));
place(room, C, ARRIVAL.x + 600, ARRIVAL.y + 200, false);
place(room, F, ARRIVAL.x + 5000, ARRIVAL.y, false);
place(room, P, ARRIVAL.x, ARRIVAL.y + 9000, false);
/* the phone's party, as party.js keeps one (presence2.test.mjs) */
const party = { id: 'pty1', leader: 'pa', members: ['pa', P.id], meta: {} };
room._parties = new Map([[party.id, party]]);
room._partyByPlayer = new Map([['pa', party], [P.id, party]]);
step(room, tickFn);

const A = await join(room, 'pa', { nj: true });   /* the phone under test, joining in town */
const B = await join(room, 'pb');                 /* the control: pres 2, no nj */
const mA = new PhoneModel(A), mB = new PhoneModel(B);
mA.pump(); mB.pump();

/* ── 1. the snapshot ── */
{
  const sa = syncOf(A), sb = syncOf(B);
  check('0a the worker advertises nearjoin', !!sa && sa.caps && sa.caps.nearjoin === true, sa && sa.caps && sa.caps.nearjoin);
  check('0b the session took nj: 1; the control did not', sessionOf(room, A).nearJoin === true && sessionOf(room, B).nearJoin === false);
  check('0c NEAR_JOIN.R is the rosters\' circle (tick.js FAR_PLAYERS.NEAR_R)', NEAR_JOIN.R === FAR_PLAYERS.NEAR_R, [NEAR_JOIN.R, FAR_PLAYERS.NEAR_R]);
  const pa = sa.players, pb = sb.players;
  check('1a around it (town, its zone at the join) whole: the town player\'s look', pa.pt && !pa.pt.fa && pa.pt.hr === lookFor(1).hr && pa.pt.bt === lookFor(1).bt, pa.pt);
  check('1b its party member 9,000 px off in the Wheel: whole', pa.ppty && !pa.ppty.fa && pa.ppty.bt === lookFor(4).bt, pa.ppty);
  check('1c itself: whole', pa.pa && !pa.pa.fa, pa.pa);
  check('1d the Wheel players not around it: list entries, marked fa', pa.pcl && pa.pcl.fa === 1 && pa.pfar && pa.pfar.fa === 1, { c: pa.pcl, f: pa.pfar });
  const LIST = new Set(['fa', 'z', 'brn', 'rpgData', ...NEAR_JOIN.LIST_KEYS]);
  const extra = Object.keys(pa.pfar).filter((k) => !LIST.has(k));
  check('1e a list entry carries the lists\' fields only (no look: no hair, colours, drawings)', extra.length === 0 && !('hr' in pa.pfar) && !('bt' in pa.pfar), { extra, e: pa.pfar });
  check('1f ...its name, level and zone (the Wheel, from its state, not the join\'s town)',
    /* v2.3.3538: the level is the worker's own (prog3.js _levelStamp), never the join's claim */
    pa.pfar.name === 'N_pfar' && pa.pfar.rpgLv === room.playerState.pfar.level && pa.pfar.z === 'wheel', pa.pfar);
  const rd = pa.pfar.rpgData || {};
  check('1g ...and the inspect card\'s parts the lists read (kills, gold, playtime, clan) and no more',
    rd.kills === lookFor(3).rpgData.kills && rd.goldEarned === lookFor(3).rpgData.goldEarned && rd.playtime === lookFor(3).rpgData.playtime
    && !('weapon' in rd) && !('combat' in rd) && Object.keys(rd).every((k) => NEAR_JOIN.LIST_RPG_KEYS.includes(k)), rd);
  check('1h the control phone: everyone whole, no fa', Object.values(pb).every((e) => !e.fa) && pb.pfar.hr === lookFor(3).hr && pb.pcl.bt === lookFor(2).bt, Object.keys(pb));
  check('1i ...exactly what getAllPlayerData() gives (the old snapshot)', JSON.stringify(pb) === JSON.stringify(room.getAllPlayerData()), null);
  const lf = JSON.stringify(pa.pfar).length, wf = JSON.stringify(pb.pfar).length;
  const lc = JSON.stringify(pa.pcl).length, wc = JSON.stringify(pb.pcl).length;
  check('1j a list entry is a fraction of the whole entry (a quarter at most)', lf * 4 < wf && lc * 4 < wc, { lf, wf, lc, wc });
  check('1k it holds the looks it was sent whole -- and the control, who joined in town after it (a whole player_join)',
    [...sessionOf(room, A)._looks].sort().join() === ['pa', 'pb', 'ppty', 'pt'].sort().join(), [...sessionOf(room, A)._looks]);
  check('1l a whole entry says where they stand now (the state), not the join\'s x/y', pa.ppty.x === Math.round(room.playerState.ppty.x) && pa.ppty.y === Math.round(room.playerState.ppty.y), { e: [pa.ppty.x, pa.ppty.y], s: [room.playerState.ppty.x, room.playerState.ppty.y] });
}

/* ── 2. arriving in the Wheel ── */
{
  const at = A.ws.sent.length, atB = B.ws.sent.length;
  await move(room, A, ARRIVAL.x, ARRIVAL.y, 'wheel');
  await move(room, B, ARRIVAL.x + 5, ARRIVAL.y, 'wheel');
  check('2a a zone change marks the arrival', sessionOf(room, A)._nearArrive === true && !sessionOf(room, B)._nearArrive);
  step(room, tickFn);
  const t = ticksOf(A, at).find((m) => m.pl);
  check('2b the next tick carries the look of the player standing around where it arrived', !!t && t.pl.pcl && t.pl.pcl.bt === lookFor(2).bt && t.pl.pcl.hr === lookFor(2).hr, t && Object.keys(t.pl));
  check('2c ...and where they stand (the state)', !!t && t.pl.pcl.x === Math.round(room.playerState.pcl.x) && t.pl.pcl.z === 'wheel', t && t.pl.pcl);
  check('2d ...not the far player, nor the party member it already holds', !!t && !('pfar' in t.pl) && !('ppty' in t.pl) && !('pt' in t.pl), t && Object.keys(t.pl));
  check('2e the arrival is over', sessionOf(room, A)._nearArrive === false);
  for (let i = 0; i < 60; i++) step(room, tickFn);
  const again = ticksOf(A, at).filter((m) => m.pl && m.pl.pcl);
  check('2f ...sent once: not on the ticks and rosters after', again.length === 1, again.length);
  check('2g the control phone is never sent a pl', !ticksOf(B, atB).some((m) => m.pl), null);
  mA.pump(); mB.pump();
  check('2h the model: the arrival\'s player is whole and looks as the control shows', mA.others.get('pcl') && !mA.others.get('pcl').fa && lookSig(mA.others.get('pcl')) === lookSig(mB.others.get('pcl')), { a: lookSig(mA.others.get('pcl')), b: lookSig(mB.others.get('pcl')) });
}

/* ── 3. a far player walks in ── */
{
  const at = A.ws.sent.length;
  let first = -1;
  for (let i = 0; i < 40; i++) {
    place(room, F, ARRIVAL.x + 5000 - (i + 1) * 100, ARRIVAL.y, true);
    step(room, tickFn);
    const ts = ticksOf(A, at);
    if (first < 0) {
      const k = ts.findIndex((m) => m.players && m.players.pfar && !(Object.keys(m.players.pfar).join(',') === 'x,y,d,z,vx,vy'));
      if (k >= 0) first = k;
    }
  }
  const ts = ticksOf(A, at);
  const firstWhole = first >= 0 ? ts[first] : null;
  check('3a the tick that first sends them whole carries their look (pl) in the same message', !!firstWhole && !!firstWhole.pl && !!firstWhole.pl.pfar && firstWhole.pl.pfar.bt === lookFor(3).bt, firstWhole && { pl: firstWhole.pl && Object.keys(firstWhole.pl), players: Object.keys(firstWhole.players || {}) });
  check('3b ...and they were within the circle then', !!firstWhole && Math.hypot(room.playerState.pfar.x - room.playerState.pa.x, 0) <= NEAR_JOIN.R + 4100, null);
  check('3c ...once', ts.filter((m) => m.pl && m.pl.pfar).length === 1, ts.filter((m) => m.pl && m.pl.pfar).length);
  mA.pump(); mB.pump();
  check('3d the model: whole, the control\'s look', mA.others.get('pfar') && !mA.others.get('pfar').fa && lookSig(mA.others.get('pfar')) === lookSig(mB.others.get('pfar')), { a: lookSig(mA.others.get('pfar')), b: lookSig(mB.others.get('pfar')) });
}

/* ── 4. held by a whole relay; not by a delta ── */
{
  /* G joins far off after A's snapshot: a list player_join to A; its first
     track is a WHOLE relay to everyone -- held, so no pl when it walks in */
  const G = await join(room, 'pg', { at: { x: ARRIVAL.x - 6000, y: ARRIVAL.y } });
  await track(room, G, lookFor(7));
  /* H: joined BEFORE A? no -- make an H whose whole relay is older than a
     fresh near phone's snapshot: A2 joins now; H then sends a DELTA only */
  const H = await join(room, 'ph', { at: { x: ARRIVAL.x + 6000, y: ARRIVAL.y + 1000 } });
  await track(room, H, lookFor(8));
  place(room, G, ARRIVAL.x - 6000, ARRIVAL.y, false);
  place(room, H, ARRIVAL.x + 6000, ARRIVAL.y + 1000, false);
  step(room, tickFn);
  const A2 = await join(room, 'pa2', { nj: true, at: { x: ARRIVAL.x + 20, y: ARRIVAL.y } });
  const s2 = sessionOf(room, A2);
  check('4a a near phone joining in the Wheel: the far ones as list entries', syncOf(A2).players.pg.fa === 1 && syncOf(A2).players.ph.fa === 1, null);
  NOW += 1000;
  await track(room, H, { ...lookFor(8), hr: 'mohawk' });   /* a delta: H's whole relay was before A2's snapshot */
  NOW += LOOK_RELAY.FULL_EVERY_MS + 1000;
  await track(room, G, lookFor(7));                          /* a whole one again, after A2's snapshot */
  check('4b G is held by A2 (a whole relay after its snapshot); H is not (only a delta since)',
    room._nearJoinHeld(s2, 'pg', room.playerState.pg) === true && room._nearJoinHeld(s2, 'ph', room.playerState.ph) === false, null);
  const at = A2.ws.sent.length;
  for (let i = 0; i < 30; i++) {
    place(room, G, ARRIVAL.x - 6000 + (i + 1) * 200, ARRIVAL.y, true);
    place(room, H, ARRIVAL.x + 6000 - (i + 1) * 200, ARRIVAL.y + 1000, true);
    step(room, tickFn);
  }
  const ts = ticksOf(A2, at);
  check('4c walking in, G comes with no pl (A2 holds its look)', !ts.some((m) => m.pl && m.pl.pg) && ts.some((m) => m.players && m.players.pg), null);
  check('4d ...H with its look (A2 only had a delta on a list entry)', ts.filter((m) => m.pl && m.pl.ph).length === 1 && ts.find((m) => m.pl && m.pl.ph).pl.ph.hr === 'mohawk', ts.filter((m) => m.pl).map((m) => Object.keys(m.pl)));
}

/* ── 4e. the set of looks sent whole is pruned once a roster ── */
{
  const sa = sessionOf(room, A);
  check('4e A holds the stander\'s look in its set (sent by the arrival\'s pl)', sa._looks.has('pcl'));
  sessionOf(room, C)._look = null;          /* its next track goes whole, as once a minute */
  await track(room, C, lookFor(2));
  toRoster(room, tickFn);
  check('4f ...after their next whole relay and a roster, it is out of the set -- and still held (by the relay)',
    !sa._looks.has('pcl') && room._nearJoinHeld(sa, 'pcl', room.playerState.pcl) === true, [...sa._looks]);
  const sizes = [...room.sessions.values()].filter((x) => x.nearJoin).map((x) => x._looks.size);
  check('4g no near session\'s set holds more than the looks of its last minute', sizes.every((n) => n <= 6), sizes);
}

/* ── 5. player_join ── */
{
  const atA = A.ws.sent.length, atB = B.ws.sent.length;
  /* joins in town: not around A (in the Wheel) */
  const J = await join(room, 'pj');
  const ja = msgsOf(A, atA).find((m) => m.type === 'player_join' && m.id === 'pj');
  const jb = msgsOf(B, atB).find((m) => m.type === 'player_join' && m.id === 'pj');
  check('5a a joiner not around a near phone: a list entry (fa), no look', !!ja && ja.data.fa === 1 && !('bt' in ja.data) && ja.name === 'N_pj', ja);
  check('5b ...the control phone: their whole public look, as before', !!jb && !jb.data.fa && jb.data.x === 1000 && jb.data.z === 'town', jb);
  check('5c ...and the near phone does not hold it', !sessionOf(room, A)._looks.has('pj'));
  /* a near phone in town is around a joiner in town */
  const AT = await join(room, 'pat', { nj: true });
  const at2 = AT.ws.sent.length;
  const K = await join(room, 'pk');
  const jk = msgsOf(AT, at2).find((m) => m.type === 'player_join' && m.id === 'pk');
  check('5d a joiner around a near phone (both in town): whole, and held', !!jk && !jk.data.fa && jk.data.x === 1000 && sessionOf(room, AT)._looks.has('pk'), jk);
  /* the near phone goes down to the Wheel; K leaves and comes back in a new
     look (in its join, no track yet): a list join to AT, which must no longer
     hold K's look -- so when K walks up, its look comes in a pl */
  await move(room, AT, ARRIVAL.x - 300, ARRIVAL.y - 300, 'wheel');
  step(room, tickFn);
  await room.webSocketClose(K.ws);
  const mAT = new PhoneModel(AT); mAT.pump();
  const K2 = await join(room, 'pk', { look: lookFor(21, 3) });
  check('5e K back in town: a list join to AT (now in the Wheel), and AT no longer holds its look', !sessionOf(room, AT)._looks.has('pk'), [...sessionOf(room, AT)._looks]);
  const at5 = AT.ws.sent.length;
  await move(room, K2, ARRIVAL.x - 320, ARRIVAL.y - 280, 'wheel');
  for (let i = 0; i < 50; i++) step(room, tickFn);
  const kpl = ticksOf(AT, at5).find((m) => m.pl && m.pl.pk);
  mAT.pump();
  check('5f ...it walks up (no track since): its new look comes in a pl, and AT shows it',
    !!kpl && kpl.pl.pk.hr === lookFor(21, 3).hr && mAT.others.get('pk') && mAT.others.get('pk').hr === lookFor(21, 3).hr && !mAT.others.get('pk').fa, { pl: !!kpl, m: mAT.others.get('pk') });
  void J;
}

/* ── 6. the switch, v1, pres-less ── */
{
  room._liveFlags = { steadymovers: false, nearjoin: false };
  const X = await join(room, 'px', { nj: true });
  const sx = syncOf(X);
  check('6a nearjoin: false -- a new nj join gets the whole snapshot and caps.nearjoin false',
    sessionOf(room, X).nearJoin === false && sx.caps.nearjoin === false && Object.values(sx.players).every((e) => !e.fa), sx.caps.nearjoin);
  /* A still gets its pl: a new far player walks in to A */
  const L = await join(room, 'pl1', { at: { x: ARRIVAL.x + 5500, y: ARRIVAL.y - 300 } });
  await track(room, L, lookFor(11));
  NOW += 10;
  room._lookSeq = room._lookSeq;   /* (L's whole relay went after A's snapshot: held) */
  const A3 = sessionOf(room, A);
  A3._looks.delete('pl1');
  room.playerState.pl1._lookWholeSeq = 0;   /* as if A had never had it whole */
  const at = A.ws.sent.length;
  for (let i = 0; i < 40; i++) { place(room, L, ARRIVAL.x + 5500 - (i + 1) * 120, ARRIVAL.y - 300, true); step(room, tickFn); }
  check('6b ...a phone that already got a near snapshot keeps getting its pl', ticksOf(A, at).some((m) => m.pl && m.pl.pl1), null);
  room._liveFlags = { steadymovers: false };
  const V = await join(room, 'pv1', { nj: true, pv: 1 });
  const W = await join(room, 'pw1', { nj: true, pres: 0 });
  check('6c a v1 join and a pres-less join with nj get no near snapshot', !sessionOf(room, V).nearJoin && !sessionOf(room, W).nearJoin && Object.values(syncOf(W).players).every((e) => !e.fa), null);
  check('6d the tick builders agree byte for byte through all of it (pl is added to the phone\'s own copy)', room._tickShareVerify.checked > 100 && room._tickShareVerify.mismatched === 0, room._tickShareVerify);
}

/* ══ 7. A RANDOM ROOM ═══════════════════════════════════════════════════ */
{
  const { room: R, tickFn: tf } = await makeRoom();
  R._tickShareVerify = { checked: 0, mismatched: 0, first: null };
  R._liveFlags = { steadymovers: false };
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  const NP = 24;
  const ps = [];
  for (let i = 0; i < NP; i++) {
    const a = rnd() * Math.PI * 2, d = rnd() * 7000;
    const p = await join(R, 'r' + i, { at: { x: ARRIVAL.x + Math.cos(a) * d, y: ARRIVAL.y + Math.sin(a) * d } });
    p.i = i; p.v = 0; p.a = a; p.alive = true;
    await track(R, p, lookFor(i, 0));
    ps.push(p);
  }
  for (const p of ps) { const s = R.playerState[p.id]; place(R, p, s.x, s.y, false); }
  /* the phone under test and its control, joining in town and coming down
     to BroTown, then wandering about */
  const NA = await join(R, 'na', { nj: true });
  const NB = await join(R, 'nb');
  const ma = new PhoneModel(NA), mb = new PhoneModel(NB);
  await move(R, NA, ARRIVAL.x, ARRIVAL.y, 'wheel');
  await move(R, NB, ARRIVAL.x, ARRIVAL.y, 'wheel');
  let bad = 0, checkedEntries = 0, listShown = 0, firstBad = null, pls = 0, rejoins = 0, changes = 0, farChanges = 0;
  const sA = () => R.sessions.get(NA.ws);
  const party = () => null;
  let phoneRejoins = 0;
  for (let t = 0; t < 3000; t++) {
    /* every 400 ticks the two phones log out and back in (a fresh snapshot:
       every far look now older than it, so each comes by pl or a whole relay) */
    if (t > 0 && t % 400 === 0) {
      const me1 = R.playerState.na;
      const x = me1.x, y = me1.y;
      await R.webSocketClose(NA.ws); await R.webSocketClose(NB.ws);
      const na2 = await join(R, 'na', { nj: true }), nb2 = await join(R, 'nb');
      NA.ws = na2.ws; NB.ws = nb2.ws; ma.at = 0; mb.at = 0;
      await move(R, NA, x, y, 'wheel'); await move(R, NB, x + 3, y, 'wheel');
      phoneRejoins++;
    }
    /* the phones walk together (the control is the same phone, old) */
    if (t % 60 === 0) {
      const a = rnd() * Math.PI * 2, d = rnd() * 5000;
      const x = ARRIVAL.x + Math.cos(a) * d, y = ARRIVAL.y + Math.sin(a) * d;
      place(R, NA, x, y, true); place(R, NB, x + 3, y, true);
    }
    for (const p of ps) {
      if (!p.alive) {
        if (rnd() < 0.01) {   /* back, maybe in another look */
          const q = await join(R, p.id, { at: { x: ARRIVAL.x + (rnd() - 0.5) * 9000, y: ARRIVAL.y + (rnd() - 0.5) * 9000 } });
          p.ws = q.ws; p.alive = true; p.v += rnd() < 0.5 ? 1 : 0; rejoins++;
          await track(R, p, lookFor(p.i, p.v));
          const s = R.playerState[p.id]; place(R, p, s.x, s.y, false);
        }
        continue;
      }
      const s = R.playerState[p.id];
      if (rnd() < 0.3) { p.a += (rnd() - 0.5) * 0.6; place(R, p, s.x + Math.cos(p.a) * 60, s.y + Math.sin(p.a) * 60, true); }
      else if (rnd() < 0.05) place(R, p, s.x, s.y, false);
      if (rnd() < 0.004) {   /* a new look, near or far */
        p.v++; changes++;
        const me0 = R.playerState.na;
        if (Math.hypot(s.x - me0.x, s.y - me0.y) > NEAR_JOIN.R) farChanges++;
        await track(R, p, lookFor(p.i, p.v));
      }
      else if (rnd() < 0.01) await track(R, p, lookFor(p.i, p.v));                /* the same (a whole copy now and then) */
      if (rnd() < 0.002) { p.alive = false; await R.webSocketClose(p.ws); }      /* gone */
    }
    NOW += rnd() < 0.005 ? 4000 : 0;   /* now and then a lull: whole relays come due */
    /* nobody here is idle (the 2-minute idle logout reads lastRecv; tick.js) */
    for (const [, x] of R.sessions) x.lastRecv = NOW;
    step(R, tf);
    mb.pump();
    const sess = sA();
    const me = R.playerState.na;
    ma.pump((m) => {
      if (m.pl) pls += Object.keys(m.pl).length;
      if (!m.players) return;
      for (const [id, e] of Object.entries(m.players)) {
        if (id === 'na' || id === 'nb') continue;
        const slim = Object.keys(e).join(',') === 'x,y,d,z,vx,vy';
        const q = R.playerState[id];
        if (slim || !q || !R._nearJoinAround(sess, me, id, q, party())) continue;
        checkedEntries++;
        /* what the phone shows of them: its copy's look (a list entry's
           look keys are missing, so it differs from the control's whole one;
           a relay that came whole has filled it in, and then it is the same) */
        const a = ma.others.get(id), b = mb.others.get(id);
        if (!a || a.placeholder) { listShown++; if (!firstBad) firstBad = { t, id, why: 'unknown', b: !!b }; continue; }
        if (lookSig(a) !== lookSig(b)) { bad++; if (!firstBad) firstBad = { t, id, why: 'look differs', a: lookSig(a), b: lookSig(b) }; }
      }
    });
  }
  console.log('  (7: ' + checkedEntries + ' entries checked, ' + pls + ' looks sent in pl, ' + rejoins + ' rejoins, ' + changes + ' look changes, ' + farChanges + ' of them while far, the phones back ' + phoneRejoins + ' times)');
  check('7a 3,000 ticks: every player sent to the near phone whole and around it was one it knew', listShown === 0 && checkedEntries > 1000, { listShown, checkedEntries, firstBad });
  check('7b ...in exactly the look the control phone (sent everything) shows: never a list entry', bad === 0, { bad, firstBad });
  check('7c ...with looks sent as players came around (pl), and far fewer than the control was sent', pls > 0, { pls });
  check('7d the tick builders agree byte for byte', R._tickShareVerify.checked > 1000 && R._tickShareVerify.mismatched === 0, R._tickShareVerify);
}

/* ══ 8. the phone's half ════════════════════════════════════════════════ */
{
  const NJ = await import('../../src/game/nearJoin.js');
  const S = { myId: 'me', _serverCaps: { nearjoin: true }, player: { x: 1000, y: 1000 }, others: Object.create(null) };
  check('8a nearJoinOn reads caps.nearjoin', NJ.nearJoinOn(S) === true && NJ.nearJoinOn({ _serverCaps: {} }) === false && NJ.nearJoinOn(null) === false);
  const o = { x: 1100, y: 1000, _vx: 3, _vy: 1 };
  NJ.parkFar(S, o);
  check('8b parkFar: parked (out of sight, PARK_R off) and marked as having no look', o._away === true && o._lookFar === true && o._vx === 0 && Math.hypot(o.x - 1000, o.y - 1000) >= 2399, o);
  S.others.listed = { x: 5000, y: 5000, _away: true, _lookFar: true, name: 'L', _posBuffer: [1, 2], _jogOff: 0.3 };
  const build = (d) => ({ x: d.x, y: d.y, renderX: d.x, name: d.name, hair: d.hr || null });
  const made = NJ.applyPeerLooks(S, { listed: { x: 1200, y: 1010, name: 'L', hr: 'mohawk' }, fresh: { x: 900, y: 990, name: 'F', hr: 'long' }, me: { x: 1, y: 1 }, __proto__: null }, build);
  const L = S.others.listed, Fr = S.others.fresh;
  check('8c applyPeerLooks: a listed player takes the look and the place, keeps the rest, unparked',
    L.hair === 'mohawk' && L.x === 1200 && L.renderX === 1200 && L._away === false && L._lookFar === false && L._jogOff === 0.3 && L._posBuffer.length === 0, L);
  check('8d ...a new one is made, counted; yourself never', made === 1 && Fr && Fr.hair === 'long' && Fr._away === false && !('me' in S.others), { made, Fr });
  check('8e ...and nothing for a bad pl', NJ.applyPeerLooks(S, null, build) === 0 && NJ.applyPeerLooks(S, 'x', build) === 0);
  const { readFileSync } = await import('node:fs');
  const ws = readFileSync(new URL('../../src/networking/wsClient.js', import.meta.url), 'utf8');
  const tickAt = ws.indexOf("case 'tick':");
  const plAt = ws.indexOf('applyPeerLooks(S, msg.pl, peerFromSnapshot)', tickAt);
  const playersAt = ws.indexOf('if (msg.players) {', tickAt);
  check('8f wsClient.js joins with nj: 1 beside pres: 2', /pres: 2,[\s\S]{0,400}nj: 1,/.test(ws));
  check('8g ...applies a tick\'s pl BEFORE its players, only against a worker that says nearjoin',
    tickAt > 0 && plAt > tickAt && plAt < playersAt && /msg\.pl && nearJoinOn\(S\)/.test(ws), { tickAt, plAt, playersAt });
  check('8h ...builds a snapshot peer and a pl peer with one function, and parks a list entry from the snapshot and from player_join',
    /others\[_pid\] = peerFromSnapshot\(_data\);/.test(ws) && /_data\.fa && nearJoinOn\(S\)\) parkFar\(S, others\[_pid\]\)/.test(ws)
    && /msg\.data && msg\.data\.fa && nearJoinOn\(S\)\) parkFar\(S, S\.others\[msg\.id\]\)/.test(ws), null);
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
