/* A STUCK ARROW'S LATE CHIP DOES NOT END A HARVEST (v2.3.4385).
 *
 * The state-machine sweep's V9a S4-28 (review R2 W1.14).  A bow volley's
 * arrows stick in a monster and chip it every 500 ms for 2.5 s; each chip is a
 * monster_damage (special false, noKb true, no part) and went through
 * combat.js's _endExtraction, so a harvest begun in that window lost its
 * record, its strike was refused 'no-start' and counted toward the bot flag.
 * gathering.js _volleyChipKeeps has the rule; what this suite pins, against
 * the real GameRoom:
 *   1. volley, harvest, the chips: the record stays, the strike is paid, the
 *      monster took the chips, the bot record's startless count untouched;
 *   2. the kill switch `volleychip: false`: today's harm, exactly (the record
 *      gone, the strike refused 'no-start', counted startless); its name is
 *      one the live flags route takes;
 *   3. a NEW shot still ends the harvest: a plain arrow, a volley's own arrow,
 *      the chips of a volley paid AFTER the harvest began, a chip with no
 *      paid volley at all, a melee hit in the chip's shape;
 *   4. the cook and fire shield under the same call: a chip still zeroes its
 *      stamp (unchanged), and a fresh shot still does. */
import { GameRoom } from '../src/index.js';
import { flagNameOk } from '../src/liveops.js';

const REAL_NOW = Date.now;
let T = 1_800_000_000_000;
Date.now = () => T;

function makeState(liveflags) {
  const store = new Map();
  if (liveflags) store.set('liveflags', liveflags);
  return {
    store,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) store.set(kk, vv); } else store.set(k, v); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { if (Array.isArray(k)) { for (const kk of k) store.delete(kk); } else store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const env = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const ZONE = 'meadow';
const TOOLS = { woodcutting_axe: 1, fishing_pole: 1, mining_pickaxe: 1 };
const SKILL = { oreVein: 'mining', tree: 'woodcutting', fishSpot: 'fishing' };
const FP = { len: 640, ent: 0.42, dur: 1400, n: 48, tv: 120, vc: 0.31, h: 'a1b2c3' };

/* A player joined on a socket of their own, standing in the meadow with all
   three tools; the zone's nodes forced alive. */
async function join(room, id, label) {
  const ws = fakeWs(label || id);
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({
    type: 'join', id, name: 'Gatherer', phrase: 'p-' + id, protocolVersion: 2,
    data: { x: 500, y: 500, z: ZONE },
  }));
  const ps = room.playerState[id];
  ps.z = ZONE;
  ps.inventory = Object.assign({}, TOOLS);
  ps.lifeSkills = {};
  const send = (type, payload) => room.webSocketMessage(ws, JSON.stringify({ type, payload }));
  return { ws, ps, send, session: room.sessions.get(ws) };
}
async function setup(liveflags, id) {
  const state = makeState(liveflags);
  const room = new GameRoom(state, env);
  /* v2.3.4375: a plain fish every time.  A fish strike rolls its variant
     (fishlog.js: 0.1% large, 1% albino), which goes in the bag under its own
     key, so bagOf's plain key read 0 about 1 run in 90 (CI, §3) */
  room._fishDice = () => 0.5;
  const p = await join(room, id || 'bp_hp');
  const nodes = room._ensureZoneNodes(ZONE);
  for (const n of nodes) { n.alive = true; n.respawnAt = 0; }
  return { state, room, nodes, ...p };
}
const nodesOf = (nodes, type) => nodes.filter((n) => n.nodeType === type);
const stand = (ps, n) => { ps.x = n.x; ps.y = n.y; };
const bagOf = (room, ps, n) => ps.inventory[room._harvestInvKey(n.nodeType, n.tierLvl)] || 0;
const why = (room, id) => (room._lastStrikeFor(id) || {}).why;
const revive = (nodes) => { for (const n of nodes) { n.alive = true; n.respawnAt = 0; } };

/* one honest harvest: the start with a hitSeq, the plan's hits swung out, then
   the strike `extraMs` past the window's opening */
async function harvest(room, p, n, extraMs, accuracy, fp) {
  stand(p.ps, n);
  await p.send('extraction_start', { nodeId: n.id, zone: ZONE, skill: SKILL[n.nodeType], hitSeq: 1 + (p.seq = (p.seq || 0) + 1) });
  const rec = room.extractions[p.session.id];
  T += (rec ? rec.openDelayBase : 0) + (extraMs == null ? 1500 : extraMs);
  await p.send('node_strike', Object.assign({ id: n.id, zone: ZONE, accuracy: accuracy || 'good' }, fp ? { swipeFp: fp } : {}));
}
const strikeBare = (p, n, accuracy, fp) => { stand(p.ps, n); return p.send('node_strike', Object.assign({ id: n.id, zone: ZONE, accuracy: accuracy || 'good' }, fp ? { swipeFp: fp } : {})); };

async function bowSetup(liveflags, id) {
  const S = await setup(liveflags, id);
  const [tree] = nodesOf(S.nodes, 'tree');
  stand(S.ps, tree);
  S.ps.rangedWeapon = { type: 'bow', tierMult: 1 };
  S.ps.activeSlot = 'ranged';
  const mon = S.room._ensureZoneMonsters(ZONE)[0];
  mon.alive = true; mon.hp = mon.maxHp = 100000; mon.x = tree.x + 120; mon.y = tree.y;
  S.tree = tree; S.mon = mon;
  /* the first strike with no start is a recovery strike: spend it, so a lost
     record shows as the refusal an honest player meets */
  if (!S.room._harvestRecoverAt) S.room._harvestRecoverAt = new Map();
  S.room._harvestRecoverAt.set(id, T);
  return S;
}
const start = (S) => { S.ps.ex = 'chop'; /* the phone's move packet says it harvests */ return S.send('extraction_start', { nodeId: S.tree.id, zone: ZONE, skill: 'woodcutting', hitSeq: 2 }); };
const chip = (S, extra) => S.send('monster_damage', Object.assign({ monsterId: S.mon.id, zone: ZONE, element: null, slot: 'ranged', special: false, noKb: true }, extra || {}));
/* the volley's swipe, as index.js _handleAbilityUse stamps a paid one */
const payVolley = (S) => S.room._pveSpecialPaid(S.ps, Date.now());
/* the five chips of 2.5 s, 500 ms apart */
async function chips(S, n) { for (let i = 0; i < (n || 5); i++) { T += 500; await chip(S); } }
async function strikeOut(S) {
  const rec = S.room.extractions[S.session.id];
  T += (rec ? rec.openDelayBase : 0) + 1500;
  await strikeBare(S, S.tree);
}
const startless = (S, id) => { const r = S.room._botfp && S.room._botfp.get(id); return (r && r.counters && r.counters.startless) || 0; };

// ── 1. volley, harvest, the chips: the harvest goes on and pays ──
{
  const id = 'bp_vc1';
  const S = await bowSetup(null, id);
  payVolley(S);
  T += 300;
  await start(S);
  const hp0 = S.mon.hp;
  await chips(S);
  check('1. the stuck arrows\' chips land on the monster', S.mon.hp < hp0, { hp0, hp: S.mon.hp });
  check('1. ...and the harvest begun after the volley keeps its record', !!S.room.extractions[id]);
  check('1. ...so its shield holds through them', S.room._extractionShielded(id, T) === true);
  await strikeOut(S);
  check('1. its strike is paid against its own start', why(S.room, id) === 'paid' && bagOf(S.room, S.ps, S.tree) === 1,
    { why: why(S.room, id), bag: bagOf(S.room, S.ps, S.tree) });
  check('1. ...and the bot record counts nothing startless', startless(S, id) === 0, startless(S, id));
}

// ── 2. the kill switch: today's behaviour ──
{
  const id = 'bp_vc2';
  const S = await bowSetup({ volleychip: false }, id);
  payVolley(S);
  T += 300;
  await start(S);
  await chips(S, 1);
  check('2. volleychip:false -- one chip ends the harvest, as before', !S.room.extractions[id]);
  await strikeOut(S);
  check('2. ...its strike is refused no-start, nothing paid', why(S.room, id) === 'no-start' && bagOf(S.room, S.ps, S.tree) === 0,
    { why: why(S.room, id), bag: bagOf(S.room, S.ps, S.tree) });
  check('2. ...and counted startless', startless(S, id) === 1, startless(S, id));
  check('2. the switch\'s name is one the live flags route takes', flagNameOk('volleychip') === true);
}

// ── 3. a new shot still ends the harvest ──
{
  const cases = [
    ['a plain arrow', async (S) => { payVolley(S); T += 300; await start(S); T += 500; await chip(S, { noKb: undefined }); }],
    ['a volley\'s own arrow (a special with its part)', async (S) => { payVolley(S); T += 300; await start(S); T += 500; await chip(S, { special: true, part: 3 }); }],
    ['the chips of a volley paid AFTER the start', async (S) => { await start(S); T += 300; payVolley(S); T += 500; await chip(S); }],
    ['a chip with no paid volley at all', async (S) => { await start(S); T += 500; await chip(S); }],
    ['a chip after its volley\'s window closed', async (S) => { payVolley(S); T += 300; await start(S); T += 4500; await chip(S); }],
    ['a melee hit in the chip\'s shape', async (S) => { payVolley(S); T += 300; await start(S); T += 500; await chip(S, { slot: 'melee' }); }],
  ];
  let i = 0;
  for (const [name, run] of cases) {
    const id = 'bp_vc3_' + (i++);
    const S = await bowSetup(null, id);
    await run(S);
    check('3. ' + name + ' ends the harvest', !S.room.extractions[id]);
  }
}

// ── 4. the cook and fire shield under the same call: unchanged ──
{
  for (const kind of ['cook', 'fire']) {
    const id = 'bp_vc4_' + kind;
    const S = await bowSetup(null, id);
    payVolley(S);
    T += 300;
    S.ps.ex = kind; S.ps._exAt = T; S.ps._exX = S.ps.x; S.ps._exY = S.ps.y;
    check('4. ' + kind + ': shielded before the chip', S.room._extractionShielded(id, T) === true);
    T += 500; await chip(S);
    check('4. ' + kind + ': a chip zeroes its stamp, as before', S.ps._exAt === 0 && S.room._extractionShielded(id, T) === false);
    S.ps._exAt = T;
    T += 500; await chip(S, { noKb: undefined });
    check('4. ' + kind + ': a fresh shot zeroes it, as before', S.ps._exAt === 0);
  }
  /* a node harvest's record survives the chip, and its stamp is zeroed with it as before */
  const S = await bowSetup(null, 'bp_vc4_node');
  payVolley(S); T += 300; await start(S);
  S.ps._exAt = T;
  T += 500; await chip(S);
  check('4. a node harvest: the record kept, the cook stamp zeroed as ever', !!S.room.extractions.bp_vc4_node && S.ps._exAt === 0);
}

Date.now = REAL_NOW;
if (failures) { console.log(`\n${failures} FAILED`); process.exit(1); }
console.log('\nvolley-chip: all passed');
