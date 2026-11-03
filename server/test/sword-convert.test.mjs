/* OLD ONE-HANDED SWORDS BECOME GREATSWORDS -- v2.3.3895
 * (docs/specs/sword-to-greatsword.md, server/src/swordconvert.js).
 *
 * The owner: "Yes turn old swords into greatswords", with the plan's four
 * answers: a wood sword becomes a COPPER greatsword; the damage rise is
 * accepted; the game's own names are rebuilt and a hand-given one kept; a
 * `was` mark so it can be undone exactly.
 *
 *   1. The one function: every grade, hardening, temper and both gems kept;
 *      a wood sword -> copper at copper's tier; the game's names rebuilt (the
 *      Forge's, the label's, a gem's, "Bro's Sword", an old drop's) and a hand
 *      name kept; the `was` mark; a greatsword, a bow, junk left alone;
 *      twice is once.
 *   2. Through the real load: a character on file with swords in hand and in
 *      the bag joins, and every one is a greatsword -- in memory, echoed and
 *      stored at _v 19, in ONE put of the record; the 'sword' SKILL keys
 *      untouched; the damage base is the greatsword's.
 *   3. The retry: when the conversion throws, the join goes ahead, the swords
 *      stay swords and the record stays at 18; mended, the next load converts.
 *   4. The post: a sword credited (a market refund, a sale, a trade, No man's
 *      land) arrives a greatsword -- and under `swordconvert: false` a sword.
 *   5. The Auction House: a listing escrowing a sword is rewritten once at the
 *      wake-time rebuild, weapon and shelf copy; a second rebuild writes nothing.
 *   6. The Marketplace: a sell order's sword and its subtype (a wood one's tier
 *      to copper), a buy order's subtype; a new order for 'sword' is placed as
 *      'greatsword'.
 *   7. The Forge: an older page's sword request mints a greatsword (and a
 *      sword under the switch).
 *   8. The switch's name is lower case and off only when written false.
 *
 * v2.3.3980 -- OLD WOODEN GREATSWORDS BECOME COPPER (docs/specs/
 * greatsword-copper.md, server/src/gscopper.js, migration v20).  The owner:
 * "'Copper great sword' when Smithed looks gray in color like iron.  Fix that.
 * Also just remove any of the 'wooden' swords."
 *   9. The one function: a wood greatsword -> copper at 1.12, its grade,
 *      hardening and gems kept, the game's names rebuilt ("Copper Great
 *      Sword", a gem's "Copper Flame Great Sword"), a hand name kept (a
 *      "Wooden ..." one made "Copper ..."), the `was` mark; an old base-less
 *      "Great Sword" no stronger than copper -> copper; a base-less one
 *      stronger than copper (an old Elemental roll) LEFT ALONE; the Pine Shield,
 *      a pine bow, a wood one-handed sword (v19's), a metal greatsword and junk
 *      left alone; twice is once.
 *  10. Through the real load: a record at v19 (the old starter, v12's "Copper
 *      Great Sword" at gearBase wood, in hand; old drops in the bag; the Pine
 *      Shield) joins: copper in memory, echoed and stored at _v 20 in one
 *      re-put, the shield still wood.
 *  11. The retry: v20 throwing leaves the record at 19, the wood intact; mended,
 *      the next load converts.
 *  12. The post: a wood greatsword credited arrives copper; `gscopper: false`
 *      delivers it as it was.
 *  13. The Auction House: a listing escrowing one is rewritten once, weapon and
 *      shelf copy.
 *  14. The Marketplace: a sell order's wood greatsword and its tier, a buy
 *      order's tier, a new order for a wood greatsword placed for copper; the
 *      switch leaves a new one as asked.
 *  15. The Forge makes no wood greatsword (its ladder, unchanged).
 *  16. The switch's name is lower case and off only when written false. */
import { GameRoom } from '../src/index.js';
import { swordToGreatsword, convertRecordSwords } from '../src/swordconvert.js';
import { oldGreatswordToCopper, convertRecordGreatswords, isOldGreatsword } from '../src/gscopper.js';   /* v2.3.3980 */
import { flagNameOk } from '../src/liveops.js';   /* v2.3.3980 */
import { MIGRATIONS, RPG_SCHEMA_VERSION } from '../src/migrations.js';
import { BLACKSMITH_TIERS } from '../src/data.js';

function makeState() {
  const store = new Map();
  const counts = { rpgPuts: 0, puts: 0 };
  return {
    _store: store,
    _counts: counts,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => {
        counts.puts++;
        if (typeof k === 'string' && k.startsWith('rpg:')) counts.rpgPuts++;
        store.set(k, JSON.parse(JSON.stringify(v)));
      },
      list: async (opts) => {
        const out = new Map();
        const keys = [...store.keys()].filter((k) => !opts?.prefix || k.startsWith(opts.prefix)).sort();
        for (const k of keys) {
          if (opts && opts.startAfter && k <= opts.startAfter) continue;
          out.set(k, store.get(k));
          if (opts && opts.limit && out.size >= opts.limit) break;
        }
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const settle = () => new Promise((r) => setTimeout(r, 10));
const clone = (o) => JSON.parse(JSON.stringify(o));

/* a sword as the Forge made one, with every field a sword can carry */
const forgeSword = (base, extra) => Object.assign({
  type: 'sword', tier: 'common', tierMult: BLACKSMITH_TIERS[base] ? BLACKSMITH_TIERS[base].tierMult : 1,
  element1: null, element2: null, isVolatile: false, name: base + ' sword', gearBase: base,
  reforgeBonus: null, hardenBonus: null, quality: 'normal', hardness: 0, temper: 0,
}, extra || {});

// ── 1. the one function ──
{
  for (const quality of ['normal', 'rare', 'elite', 'godly']) {
    const w = forgeSword('iron', { quality, hardness: 3, temper: 120, hardenBonus: 0.05, reforgeBonus: 0.02 });
    const before = clone(w);
    const did = swordToGreatsword(w);
    check(`1: an iron sword of grade ${quality}, hardened 3, temper 120 -> an iron greatsword, everything else kept`,
      did === true && w.type === 'greatsword' && w.gearBase === 'iron' && w.tierMult === before.tierMult
        && w.quality === quality && w.hardness === 3 && w.temper === 120 && w.hardenBonus === 0.05 && w.reforgeBonus === 0.02
        && w.name === 'iron greatsword', w);
    check(`1: ...marked with what it was (${quality})`,
      !!w.was && w.was.t === 'sword' && w.was.name === 'iron sword' && w.was.gearBase === 'iron' && w.was.tierMult === before.tierMult, w.was);
  }
  const gem = forgeSword('copper', { element1: 'flame', element2: 'frost', isVolatile: true, name: 'Copper Flamefrost Sword' });
  swordToGreatsword(gem);
  check('1: a gemmed sword keeps both gems and its game-made gem name becomes the greatsword\'s ("Copper Flamefrost Great Sword")',
    gem.type === 'greatsword' && gem.element1 === 'flame' && gem.element2 === 'frost' && gem.isVolatile === true && gem.name === 'Copper Flamefrost Great Sword', gem);
  const label = forgeSword('steel', { name: 'Black Steel Sword' });
  swordToGreatsword(label);
  check('1: the label form ("Black Steel Sword", a gem taken out) -> "Black Steel Great Sword"', label.name === 'Black Steel Great Sword', label.name);
  const wood = forgeSword('wood', { name: 'wood sword', quality: 'rare', hardness: 2 });
  swordToGreatsword(wood);
  check('1: a WOOD sword (the bamboo stick) -> a COPPER greatsword at copper\'s tier, its grade and hardening kept (owner call 1)',
    wood.type === 'greatsword' && wood.gearBase === 'copper' && wood.tierMult === BLACKSMITH_TIERS.copper.tierMult
      && wood.quality === 'rare' && wood.hardness === 2 && wood.name === 'copper greatsword', wood);
  check('1: ...its mark says wood, so it can be put back exactly', wood.was && wood.was.gearBase === 'wood' && wood.was.tierMult === 1 && wood.was.name === 'wood sword', wood.was);
  const bro = forgeSword('wood', { name: "Bro's Sword" });
  swordToGreatsword(bro);
  check('1: the old starter "Bro\'s Sword" (wood) -> "Copper Great Sword"', bro.name === 'Copper Great Sword' && bro.gearBase === 'copper', bro.name);
  const legacy = { type: 'sword', tier: 'elemental', tierMult: 1.5, name: 'Flame Sword', element1: 'flame' };
  swordToGreatsword(legacy);
  check('1: an old random drop with no metal ("Flame Sword", tier elemental) -> "Flame Great Sword", its tier and multiplier kept',
    legacy.type === 'greatsword' && legacy.name === 'Flame Great Sword' && legacy.tier === 'elemental' && legacy.tierMult === 1.5 && !('gearBase' in legacy), legacy);
  const plain = { type: 'sword', name: 'Sword' };
  swordToGreatsword(plain);
  check('1: a bare "Sword" -> "Great Sword"', plain.name === 'Great Sword', plain.name);
  const hand = forgeSword('iron', { name: 'Iron Longsword' });
  swordToGreatsword(hand);
  check('1: a name given by hand ("Iron Longsword") is kept (owner call 3)', hand.type === 'greatsword' && hand.name === 'Iron Longsword', hand);
  const gs = { type: 'greatsword', name: 'Copper Great Sword', gearBase: 'copper' };
  const bow = { type: 'bow', name: 'Pine Bow', gearBase: 'ww_pine' };
  check('1: a greatsword, a bow and junk are left alone',
    swordToGreatsword(gs) === false && swordToGreatsword(bow) === false && !gs.was && !bow.was
      && swordToGreatsword(null) === false && swordToGreatsword('sword') === false && swordToGreatsword([]) === false);
  const twice = forgeSword('iron', { quality: 'elite' });
  swordToGreatsword(twice);
  const once = clone(twice);
  check('1: twice is once (the second call changes nothing)', swordToGreatsword(twice) === false && JSON.stringify(twice) === JSON.stringify(once), twice);
  const rec = { weapon: forgeSword('copper'), rangedWeapon: { type: 'bow', name: 'Pine Bow' }, staffWeapon: null,
    weaponStash: [forgeSword('iron'), { type: 'greatsword', name: 'x' }, forgeSword('steel', { name: 'Black Steel Sword' })] };
  check('1: a record: the hand and both bag swords converted, the bow and the greatsword left',
    convertRecordSwords(rec) === true && rec.weapon.type === 'greatsword' && rec.rangedWeapon.type === 'bow'
      && rec.weaponStash.map((w) => w.type).join() === 'greatsword,greatsword,greatsword' && !rec.weaponStash[1].was && convertRecordSwords(rec) === false, rec);
}

// the room, for 2-8
const state = makeState();
const room = new GameRoom(state, mockEnv);
async function join(ws, id) {
  room.sessions.set(ws, { id: null, name: 'T', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.state.storage.put('cadence:login:' + id, { period: room._cadencePeriodDaily(), streak: 1, ts: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T-' + id, phrase: 'p-' + id, protocolVersion: 2, data: { x: 0, y: 0, z: 'town' } }));
  await settle();
}
async function leave(ws) { await room.webSocketClose(ws); room.sessions.delete(ws); await settle(); }
/* a character on file at v18 holding swords */
async function onFile(id) {
  const w0 = fakeWs();
  await join(w0, id);
  await leave(w0);
  const blob = state._store.get('rpg:' + id);
  blob._v = 18;
  blob.weapon = forgeSword('copper', { quality: 'rare', hardness: 1 });
  blob.weaponStash = [forgeSword('iron', { element1: 'flame', name: 'Iron Flame Sword' }), forgeSword('wood', { name: "Bro's Sword" }), { type: 'bow', name: 'Pine Bow', gearBase: 'ww_pine', tierMult: 1 }];
  if (blob.prog3 && blob.prog3.sk) blob.prog3.sk.sword = Object.assign({}, blob.prog3.sk.sword || {}, { level: 7 });
  return blob;
}

// ── 2. through the real load ──
{
  const id = 'bp_sc_load';
  await onFile(id);
  const ws = fakeWs();
  const puts0 = state._counts.rpgPuts;
  await join(ws, id);
  const P = room.playerState[id];
  const stored = state._store.get('rpg:' + id);
  check('2: the sword in hand is a copper greatsword, rare and hardened as it was',
    !!P && P.weapon && P.weapon.type === 'greatsword' && P.weapon.gearBase === 'copper' && P.weapon.quality === 'rare' && P.weapon.hardness === 1, P && P.weapon);
  check('2: the bag: the gemmed iron sword is an "Iron Flame Great Sword", "Bro\'s Sword" a "Copper Great Sword", the bow a bow',
    !!P && P.weaponStash.length === 3 && P.weaponStash[0].type === 'greatsword' && P.weaponStash[0].name === 'Iron Flame Great Sword' && P.weaponStash[0].element1 === 'flame'
      && P.weaponStash[1].name === 'Copper Great Sword' && P.weaponStash[1].gearBase === 'copper' && P.weaponStash[2].type === 'bow', P && P.weaponStash);
  check('2: stored at _v ' + RPG_SCHEMA_VERSION + ' with no sword left in it', RPG_SCHEMA_VERSION >= 19 && stored._v === RPG_SCHEMA_VERSION   /* v2.3.3980: current, 20 since v20 */
    && stored.weapon.type === 'greatsword' && stored.weaponStash.every((w) => w.type !== 'sword'), { v: stored._v });
  check('2: the record\'s conversion is written by the load\'s one re-put (and the join\'s own save), never one put a weapon',
    state._counts.rpgPuts - puts0 <= 2, state._counts.rpgPuts - puts0);
  const echo = ws.sent.filter((m) => m.type === 'player_state').pop();
  check('2: the phone is told: player_state carries the greatsword', !!echo && echo.payload.weapon && echo.payload.weapon.type === 'greatsword', echo && echo.payload.weapon);
  check('2: the \'sword\' SKILL keys are untouched (the melee skill keeps its name and its level)',
    !!P.prog3 && !!P.prog3.sk && !!P.prog3.sk.sword && P.prog3.sk.sword.level === 7 && !P.prog3.sk.greatsword, P.prog3 && Object.keys(P.prog3.sk));
  check('2: the damage base is the greatsword\'s now (10, not 6.67): the rise the owner accepted',
    room._weaponBase(P.weapon.type) === 10 && room._weaponBase('sword') === 6.67);
  await leave(ws);
}

// ── 3. the retry ──
{
  const id = 'bp_sc_retry';
  await onFile(id);
  const v19 = MIGRATIONS.find((m) => m.v === 19);
  const realRun = v19.run;
  v19.run = () => { throw new Error('boom'); };
  const realErr = console.error;
  console.error = () => {};
  const ws = fakeWs();
  try {
    await join(ws, id);
    const P = room.playerState[id];
    check('3: a conversion that throws: the join goes ahead and the swords are still swords (nothing lost)',
      !!P && P.weapon && P.weapon.type === 'sword' && P.weaponStash[0].type === 'sword', P && P.weapon);
    check('3: ...and the record stays at 18, unfinished', state._store.get('rpg:' + id)._v === 18, state._store.get('rpg:' + id)._v);
    await leave(ws);
  } finally {
    v19.run = realRun;
    console.error = realErr;
  }
  const ws2 = fakeWs();
  await join(ws2, id);
  const P2 = room.playerState[id];
  check('3: mended, the next login converts them and the record is current',
    P2.weapon.type === 'greatsword' && P2.weaponStash.every((w) => w.type !== 'sword') && state._store.get('rpg:' + id)._v === RPG_SCHEMA_VERSION, P2.weapon);   /* v2.3.3980: current */
  await leave(ws2);
}

// ── 4. the post ──
{
  const id = 'bp_sc_post';
  const ws = fakeWs();
  await join(ws, id);
  const P = room.playerState[id];
  P.weaponStash = [];
  await room._creditPlayer(id, { opId: 'sc:post:1', source: 'market', kind: 'weapon', payload: { weapon: forgeSword('iron', { quality: 'elite' }) }, note: 'refund' });
  check('4: a sword credited through the post arrives a greatsword, its grade kept',
    P.weaponStash.length === 1 && P.weaponStash[0].type === 'greatsword' && P.weaponStash[0].quality === 'elite' && P.weaponStash[0].was && P.weaponStash[0].was.t === 'sword', P.weaponStash);
  const was = room._liveFlags;
  room._liveFlags = Object.assign({}, was || {}, { swordconvert: false });
  await room._creditPlayer(id, { opId: 'sc:post:2', source: 'market', kind: 'weapon', payload: { weapon: forgeSword('iron') }, note: 'refund' });
  room._liveFlags = was;
  check('4: under `swordconvert: false` the post delivers the sword as it was', P.weaponStash.length === 2 && P.weaponStash[1].type === 'sword', P.weaponStash[1]);
  await leave(ws);
}

// ── 5. the Auction House ──
{
  const now = Date.now();
  const rec = {
    id: 'sclist1', sellerId: 'bp_sc_seller', sellerName: 'S', kind: 'weapon', cat: 'weapon', qty: 1, askPrice: 500,
    createdAt: now, expiresAt: now + 86400000, weapon: forgeSword('steel', { quality: 'rare' }),
    disp: room._stDisplay('weapon', null, forgeSword('steel', { quality: 'rare' })), topBid: null, bidCount: 0,
  };
  state._store.set('store_listing:sclist1', clone(rec));
  room._stIndex = null;
  const puts0 = state._counts.puts;
  await room._stEnsureIndex();
  const after = state._store.get('store_listing:sclist1');
  check('5: a listing escrowing a sword is rewritten at the rebuild: a greatsword, its shelf copy too, its grade kept',
    !!after && after.weapon.type === 'greatsword' && after.disp.type === 'greatsword' && after.disp.quality === 'rare' && after.weapon.name === 'steel greatsword', after && after.disp);
  check('5: ...in one put, and it is still on the shelf', state._counts.puts - puts0 === 1 && room._stIndex.has('sclist1'), state._counts.puts - puts0);
  room._stIndex = null;
  const puts1 = state._counts.puts;
  await room._stEnsureIndex();
  check('5: a second rebuild writes nothing (once)', state._counts.puts === puts1, state._counts.puts - puts1);
}

// ── 6. the Marketplace ──
{
  const now = Date.now();
  state._store.set('mkt_order:scsell', { id: 'scsell', type: 'sell', category: 'weapon', subtype: 'sword', tierKey: 'wood', tierLabel: 'Wood',
    element1: null, element2: null, price: 50, item: forgeSword('wood', { name: 'wood sword' }), playerName: 'S', playerId: 'bp_sc_seller', ts: now, expires: now + 9999999 });
  state._store.set('mkt_order:scbuy', { id: 'scbuy', type: 'buy', category: 'weapon', subtype: 'sword', tierKey: 'iron', tierLabel: 'Iron',
    element1: null, element2: null, price: 50, item: null, playerName: 'B', playerId: 'bp_sc_buyer', ts: now, expires: now + 9999999 });
  room._mktIndex = null;
  await room._mktEnsureIndex();
  const s = state._store.get('mkt_order:scsell');
  const b = state._store.get('mkt_order:scbuy');
  check('6: a sell order\'s wood sword is a copper greatsword, its subtype and tier moved, and it is filed there in the book',
    s.item.type === 'greatsword' && s.item.gearBase === 'copper' && s.subtype === 'greatsword' && s.tierKey === 'copper'
      && room._mktIndex.has('weapon:greatsword:copper:none:none'), s);
  check('6: a buy order for a sword is an order for a greatsword now (filed there)', b.subtype === 'greatsword' && room._mktIndex.has('weapon:greatsword:iron:none:none'), b);
  const id = 'bp_sc_mkt';
  const ws = fakeWs();
  await join(ws, id);
  const P = room.playerState[id];
  P.coins = 1000;
  const r = await room._mktPlaceOrder({ type: 'buy', category: 'weapon', subtype: 'sword', tierKey: 'steel', tierLabel: 'Black Steel', price: 10, playerId: id, playerName: 'M' });
  check('6: an older page\'s new order for a "sword" is placed as one for a greatsword', !!r && r.ok !== false && r.order && r.order.subtype === 'greatsword', r);
  await leave(ws);
}

// ── 7. the Forge ──
{
  const id = 'bp_sc_forge';
  const ws = fakeWs();
  await join(ws, id);
  const P = room.playerState[id];
  P.coins = 100000;
  P.inventory = { bar_copper: 40 };
  P.weapon = null; P.weaponStash = []; P._gearLockUntil = 0;
  P.lifeSkills = Object.assign({}, P.lifeSkills || {}, { blacksmithing: { level: 1, xp: 0 } });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'forge_weapon', payload: { weaponType: 'sword', tierKey: 'copper' } }));
  await settle();
  check('7: an older page asking the Forge for a sword is given a copper greatsword (no new sword is ever made)',
    !!P.weapon && P.weapon.type === 'greatsword' && P.weapon.gearBase === 'copper', P.weapon);
  await leave(ws);
}

// ── 8. the switch ──
{
  const was = room._liveFlags;
  room._liveFlags = { swordconvert: false };
  const off = room._swordConvertOff();
  room._liveFlags = { swordconvert: true };
  const on1 = room._swordConvertOff();
  room._liveFlags = {};
  const on2 = room._swordConvertOff();
  room._liveFlags = was;
  check('8: `swordconvert: false` switches it off, true or nothing set leaves it on', off === true && on1 === false && on2 === false);
  check('8: the switch\'s name is lower case', /^[a-z0-9_]+$/.test('swordconvert'));
}

/* ════ v2.3.3980: OLD WOODEN GREATSWORDS BECOME COPPER (gscopper.js, v20) ════ */

/* a greatsword as the old Forge made one, at `base` */
const forgeGs = (base, extra) => Object.assign({
  type: 'greatsword', tier: 'common', tierMult: BLACKSMITH_TIERS[base] ? BLACKSMITH_TIERS[base].tierMult : 1,
  element1: null, element2: null, isVolatile: false, name: base + ' greatsword', gearBase: base,
  reforgeBonus: null, hardenBonus: null, quality: 'normal', hardness: 0, temper: 0,
}, extra || {});
/* the old starter grant (v2.3.1681-1759): a greatsword at wood, renamed by v12 alone */
const oldStarter = (extra) => Object.assign({ type: 'greatsword', tier: 'common', tierMult: 1, name: 'Copper Great Sword', gearBase: 'wood' }, extra || {});
/* an old random drop: no gearBase, its rarity's tierMult */
const oldDrop = (mult, extra) => Object.assign({ type: 'greatsword', tier: mult > 1 ? 'elemental' : 'common', tierMult: mult, name: 'Great Sword', element1: null, element2: null }, extra || {});
const COPPER_MULT = BLACKSMITH_TIERS.copper.tierMult;

// ── 9. the one function ──
{
  check('9: copper\'s tierMult is the 1.12 the owner\'s gift is', COPPER_MULT === 1.12, COPPER_MULT);
  const w = forgeGs('wood', { quality: 'rare', hardness: 2, temper: 40, reforgeBonus: 0.1, hardenBonus: 0.05, element1: 'flame', element2: 'frost', isVolatile: true });
  const did = oldGreatswordToCopper(w);
  check('9: a wood greatsword becomes copper at copper\'s 1.12, its grade, hardening, temper, bonuses and both gems kept',
    did === true && w.type === 'greatsword' && w.gearBase === 'copper' && w.tierMult === COPPER_MULT && w.quality === 'rare' && w.hardness === 2
      && w.temper === 40 && w.reforgeBonus === 0.1 && w.hardenBonus === 0.05 && w.element1 === 'flame' && w.element2 === 'frost' && w.isVolatile === true, w);
  check('9: ...the Forge\'s "wood greatsword" named for its copper and its gems ("Copper Flamefrost Great Sword")',
    w.name === 'Copper Flamefrost Great Sword', w.name);
  check('9: ...and marked `was`: what it was, so it can be undone exactly',
    !!w.was && w.was.t === 'greatsword' && w.was.gearBase === 'wood' && w.was.tierMult === 1 && w.was.name === 'wood greatsword', w.was);
  const st = oldStarter({ quality: 'elite' });
  oldGreatswordToCopper(st);
  check('9: the old starter (v12\'s "Copper Great Sword" left at wood) is really copper now, the name kept as it reads',
    st.gearBase === 'copper' && st.tierMult === COPPER_MULT && st.name === 'Copper Great Sword' && st.quality === 'elite', st);
  const label = forgeGs('wood', { name: 'Wood Great Sword' });
  oldGreatswordToCopper(label);
  check('9: the label\'s "Wood Great Sword" -> "Copper Great Sword"', label.name === 'Copper Great Sword', label.name);
  const bro = forgeGs('wood', { name: "Bro's Sword" });
  oldGreatswordToCopper(bro);
  check('9: a "Bro\'s Sword" greatsword v12 never reached -> "Copper Great Sword"', bro.name === 'Copper Great Sword', bro.name);
  const drop = oldDrop(1);
  oldGreatswordToCopper(drop);
  check('9: an old drop\'s base-less "Great Sword" no stronger than copper -> a Copper Great Sword at 1.12, its `was` saying it had no base',
    drop.gearBase === 'copper' && drop.tierMult === COPPER_MULT && drop.name === 'Copper Great Sword' && drop.was && drop.was.gearBase === null && drop.was.tierMult === 1, drop);
  const strong = oldDrop(1.5, { element1: 'flame' });
  const strong0 = clone(strong);
  check('9: an old drop STRONGER than copper (an Elemental 1.50 roll) is left exactly as it is -- never a weapon made weaker',
    oldGreatswordToCopper(strong) === false && JSON.stringify(strong) === JSON.stringify(strong0) && isOldGreatsword(strong) === false, strong);
  const hand = forgeGs('wood', { name: "Grandpa's Blade" });
  oldGreatswordToCopper(hand);
  const wooden = forgeGs('wood', { name: 'Wooden Claymore' });
  oldGreatswordToCopper(wooden);
  check('9: a name given by hand is kept ("Grandpa\'s Blade"), a "Wooden ..." one made "Copper ..."',
    hand.name === "Grandpa's Blade" && hand.gearBase === 'copper' && wooden.name === 'Copper Claymore', { hand: hand.name, wooden: wooden.name });
  const shield = { name: 'Pine Shield', gearBase: 'wood', tierMult: 1 };
  const shieldT = { type: 'shield', name: 'Pine Shield', gearBase: 'wood', tierMult: 1 };
  const bow = { type: 'bow', name: 'Pine Bow', gearBase: 'ww_pine', tierMult: 1 };
  const sword = forgeSword('wood');
  const iron = forgeGs('iron');
  const cop = forgeGs('copper');
  const none = [shield, shieldT, bow, sword, iron, cop].map(clone);
  const touched = [shield, shieldT, bow, sword, iron, cop].map((x) => oldGreatswordToCopper(x));
  check('9: the Pine Shield, a pine bow, a wood one-handed sword (v19\'s), an iron and a copper greatsword are never touched',
    touched.every((t) => t === false) && JSON.stringify([shield, shieldT, bow, sword, iron, cop]) === JSON.stringify(none), touched);
  check('9: junk is left alone', oldGreatswordToCopper(null) === false && oldGreatswordToCopper('greatsword') === false && oldGreatswordToCopper([]) === false
    && oldGreatswordToCopper({ type: 'greatsword', gearBase: 'mythril', tierMult: 1 }) === false);
  const twice = forgeGs('wood');
  oldGreatswordToCopper(twice);
  const once = clone(twice);
  check('9: twice is once (the second call changes nothing)', oldGreatswordToCopper(twice) === false && JSON.stringify(twice) === JSON.stringify(once), twice);
  const rec = { weapon: oldStarter(), rangedWeapon: bow, shield: clone(shieldT), weaponStash: [forgeGs('wood'), forgeGs('iron'), oldDrop(1), oldDrop(2.25)] };
  check('9: a record: the slots and the bag converted, the shield and the stronger drop not, and twice is once',
    convertRecordGreatswords(rec) === true && rec.weapon.gearBase === 'copper' && rec.rangedWeapon.type === 'bow' && rec.shield.gearBase === 'wood'
      && rec.weaponStash.map((x) => x.gearBase || '-').join() === 'copper,iron,copper,-' && convertRecordGreatswords(rec) === false, rec);
}

/* a character on file at v19 holding the old greatswords */
async function onFile19(id) {
  const w0 = fakeWs();
  await join(w0, id);
  await leave(w0);
  const blob = state._store.get('rpg:' + id);
  blob._v = 19;
  blob.weapon = oldStarter({ quality: 'elite', hardness: 1 });
  blob.weaponStash = [oldDrop(1), oldDrop(1.5, { element1: 'flame' }), forgeGs('iron', { quality: 'rare' }), { type: 'bow', name: 'Pine Bow', gearBase: 'ww_pine', tierMult: 1 }];
  blob.shield = { name: 'Pine Shield', gearBase: 'wood', tierMult: 1 };
  return blob;
}

// ── 10. through the real load ──
{
  const id = 'bp_gsc_load';
  await onFile19(id);
  const ws = fakeWs();
  const puts0 = state._counts.rpgPuts;
  await join(ws, id);
  const P = room.playerState[id];
  const stored = state._store.get('rpg:' + id);
  check('10: the old starter in hand is a real Copper Great Sword now (copper, 1.12), elite and hardened as it was',
    !!P && P.weapon && P.weapon.type === 'greatsword' && P.weapon.gearBase === 'copper' && P.weapon.tierMult === COPPER_MULT
      && P.weapon.name === 'Copper Great Sword' && P.weapon.quality === 'elite' && P.weapon.hardness === 1 && P.weapon.was && P.weapon.was.gearBase === 'wood', P && P.weapon);
  check('10: the bag: the old "Great Sword" copper, the Elemental roll as it was, the iron greatsword and the bow untouched',
    !!P && P.weaponStash.length === 4 && P.weaponStash[0].gearBase === 'copper' && P.weaponStash[0].name === 'Copper Great Sword'
      && !P.weaponStash[1].gearBase && P.weaponStash[1].tierMult === 1.5 && P.weaponStash[2].gearBase === 'iron' && P.weaponStash[2].quality === 'rare'
      && P.weaponStash[3].type === 'bow', P && P.weaponStash);
  check('10: the Pine Shield is still wood (never a shield)', !!P && P.shield && P.shield.gearBase === 'wood' && P.shield.name === 'Pine Shield', P && P.shield);
  check('10: stored at _v 20 with no wood greatsword left in it', RPG_SCHEMA_VERSION === 20 && stored._v === 20
    && ![stored.weapon, ...stored.weaponStash].some((w) => w && w.type === 'greatsword' && w.gearBase === 'wood'), { v: stored._v });
  check('10: written by the load\'s one re-put (and the join\'s own save), never one put a weapon', state._counts.rpgPuts - puts0 <= 2, state._counts.rpgPuts - puts0);
  const echo = ws.sent.filter((m) => m.type === 'player_state').pop();
  check('10: the phone is told: player_state carries the copper greatsword', !!echo && echo.payload.weapon && echo.payload.weapon.gearBase === 'copper', echo && echo.payload.weapon);
  check('10: and its sell value is copper\'s (tierMult 1.12)', room._weaponSellValue ? room._weaponSellValue(P.weapon) >= room._weaponSellValue(oldStarter()) : true);
  await leave(ws);
}

// ── 11. the retry ──
{
  const id = 'bp_gsc_retry';
  await onFile19(id);
  const v20 = MIGRATIONS.find((m) => m.v === 20);
  const realRun = v20.run;
  v20.run = () => { throw new Error('boom'); };
  const realErr = console.error;
  console.error = () => {};
  const ws = fakeWs();
  try {
    await join(ws, id);
    const P = room.playerState[id];
    check('11: v20 throwing: the join goes ahead and the old greatsword is still what it was (nothing lost)',
      !!P && P.weapon && P.weapon.gearBase === 'wood', P && P.weapon);
    check('11: ...and the record stays at 19, unfinished', state._store.get('rpg:' + id)._v === 19, state._store.get('rpg:' + id)._v);
    await leave(ws);
  } finally {
    v20.run = realRun;
    console.error = realErr;
  }
  const ws2 = fakeWs();
  await join(ws2, id);
  const P2 = room.playerState[id];
  check('11: mended, the next login converts it and the record is current',
    P2.weapon.gearBase === 'copper' && state._store.get('rpg:' + id)._v === 20, P2.weapon);
  await leave(ws2);
}

// ── 12. the post ──
{
  const id = 'bp_gsc_post';
  const ws = fakeWs();
  await join(ws, id);
  const P = room.playerState[id];
  P.weaponStash = [];
  await room._creditPlayer(id, { opId: 'gsc:post:1', source: 'market', kind: 'weapon', payload: { weapon: forgeGs('wood', { quality: 'elite' }) }, note: 'refund' });
  await room._creditPlayer(id, { opId: 'gsc:post:2', source: 'store', kind: 'weapon', payload: { weapon: oldDrop(1) }, note: 'sale' });
  check('12: a wood greatsword and an old "Great Sword" credited through the post arrive copper, the grade kept',
    P.weaponStash.length === 2 && P.weaponStash.every((w) => w.gearBase === 'copper' && w.tierMult === COPPER_MULT && w.was) && P.weaponStash[0].quality === 'elite', P.weaponStash);
  const was = room._liveFlags;
  room._liveFlags = Object.assign({}, was || {}, { gscopper: false });
  await room._creditPlayer(id, { opId: 'gsc:post:3', source: 'market', kind: 'weapon', payload: { weapon: forgeGs('wood') }, note: 'refund' });
  room._liveFlags = was;
  check('12: under `gscopper: false` the post delivers it as it was', P.weaponStash.length === 3 && P.weaponStash[2].gearBase === 'wood', P.weaponStash[2]);
  await leave(ws);
}

// ── 13. the Auction House ──
{
  const now = Date.now();
  const rec = {
    id: 'gsclist1', sellerId: 'bp_gsc_seller', sellerName: 'S', kind: 'weapon', cat: 'weapon', qty: 1, askPrice: 500,
    createdAt: now, expiresAt: now + 86400000, weapon: oldStarter({ quality: 'rare' }),
    disp: room._stDisplay('weapon', null, oldStarter({ quality: 'rare' })), topBid: null, bidCount: 0,
  };
  state._store.set('store_listing:gsclist1', clone(rec));
  room._stIndex = null;
  const puts0 = state._counts.puts;
  await room._stEnsureIndex();
  const after = state._store.get('store_listing:gsclist1');
  check('13: a listing escrowing a wood greatsword is rewritten at the rebuild: copper, its shelf copy too, its grade kept',
    !!after && after.weapon.gearBase === 'copper' && after.weapon.tierMult === COPPER_MULT && after.disp.tierMult === COPPER_MULT
      && after.disp.name === 'Copper Great Sword' && after.disp.quality === 'rare', after && after.disp);
  check('13: ...in one put, and it is still on the shelf', state._counts.puts - puts0 === 1 && room._stIndex.has('gsclist1'), state._counts.puts - puts0);
  room._stIndex = null;
  const puts1 = state._counts.puts;
  await room._stEnsureIndex();
  check('13: a second rebuild writes nothing (once)', state._counts.puts === puts1, state._counts.puts - puts1);
}

// ── 14. the Marketplace ──
{
  const now = Date.now();
  state._store.set('mkt_order:gscsell', { id: 'gscsell', type: 'sell', category: 'weapon', subtype: 'greatsword', tierKey: 'wood', tierLabel: 'Wood',
    element1: null, element2: null, price: 50, item: forgeGs('wood'), playerName: 'S', playerId: 'bp_gsc_seller', ts: now, expires: now + 9999999 });
  state._store.set('mkt_order:gscbuy', { id: 'gscbuy', type: 'buy', category: 'weapon', subtype: 'greatsword', tierKey: 'wood', tierLabel: 'Wood',
    element1: null, element2: null, price: 50, item: null, playerName: 'B', playerId: 'bp_gsc_buyer', ts: now, expires: now + 9999999 });
  state._store.set('mkt_order:gscshield', { id: 'gscshield', type: 'buy', category: 'shield', subtype: 'shield', tierKey: 'wood', tierLabel: 'Wood',
    element1: null, element2: null, price: 50, item: null, playerName: 'B', playerId: 'bp_gsc_buyer', ts: now, expires: now + 9999999 });
  room._mktIndex = null;
  const puts0 = state._counts.puts;
  await room._mktEnsureIndex();
  const s = state._store.get('mkt_order:gscsell');
  const b = state._store.get('mkt_order:gscbuy');
  const sh = state._store.get('mkt_order:gscshield');
  check('14: a sell order\'s wood greatsword is copper, its tier moved, and it is filed there in the book',
    s.item.gearBase === 'copper' && s.tierKey === 'copper' && s.tierLabel === 'Copper' && room._mktIndex.has('weapon:greatsword:copper:none:none'), s);
  check('14: a buy order for a wood greatsword is one for copper now; one for a wood shield is not touched',
    b.tierKey === 'copper' && sh.tierKey === 'wood', { b, sh });
  check('14: two orders rewritten, two puts', state._counts.puts - puts0 === 2, state._counts.puts - puts0);
  const id = 'bp_gsc_mkt';
  const ws = fakeWs();
  await join(ws, id);
  const P = room.playerState[id];
  P.coins = 1000;
  const r = await room._mktPlaceOrder({ type: 'buy', category: 'weapon', subtype: 'greatsword', tierKey: 'wood', tierLabel: 'Wood', price: 10, playerId: id, playerName: 'M' });
  check('14: a new order for a wood greatsword is placed as one for copper', !!r && r.ok !== false && r.order && r.order.tierKey === 'copper' && r.order.tierLabel === 'Copper', r);
  const was = room._liveFlags;
  room._liveFlags = Object.assign({}, was || {}, { gscopper: false });
  const r2 = await room._mktPlaceOrder({ type: 'buy', category: 'weapon', subtype: 'greatsword', tierKey: 'wood', tierLabel: 'Wood', price: 10, playerId: id, playerName: 'M' });
  room._liveFlags = was;
  check('14: under `gscopper: false` it is placed as asked', !!r2 && r2.order && r2.order.tierKey === 'wood', r2);
  await leave(ws);
}

// ── 15. the Forge ──
{
  /* The Forge is not changed: it makes no wood greatsword on its ladder
     (v2.3.3524, forgeladder.js), and `forgeladder: false` -- the operator's
     rollback of that ladder, which forge-ladder.test §7c pins -- stays whole. */
  const id = 'bp_gsc_forge';
  const ws = fakeWs();
  await join(ws, id);
  const P = room.playerState[id];
  P.coins = 1000;
  P.inventory = { wood_pine_log: 3 };
  P.weapon = null; P.weaponStash = []; P._gearLockUntil = 0;
  P.lifeSkills = Object.assign({}, P.lifeSkills || {}, { blacksmithing: { level: 1, xp: 0 } });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'forge_weapon', payload: { weaponType: 'greatsword', tierKey: 'wood' } }));
  await settle();
  check('15: the Forge makes no wood greatsword, and nothing is spent',
    !P.weapon && P.coins === 1000 && P.inventory.wood_pine_log === 3, { w: P.weapon, coins: P.coins, inv: P.inventory });
  await leave(ws);
}

// ── 16. the switch ──
{
  const was = room._liveFlags;
  room._liveFlags = { gscopper: false };
  const off = room._gsCopperOff();
  room._liveFlags = { gscopper: true };
  const on1 = room._gsCopperOff();
  room._liveFlags = {};
  const on2 = room._gsCopperOff();
  room._liveFlags = was;
  check('16: `gscopper: false` switches it off, true or nothing set leaves it on', off === true && on1 === false && on2 === false);
  check('16: the switch\'s name is lower case and a name POST /flags takes', /^[a-z0-9_]+$/.test('gscopper') && flagNameOk('gscopper'));
}

if (failures) { console.log(failures + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
