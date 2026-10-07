/* Worn armour shows its grade (v2.3.3127; docs/specs/armor-grade-look.md).
 *
 * Owner: "the armor should be visibly different if you're wearing rare,
 * elite, or godly ... rare is blue, elite is orange, godly is prismatic".
 * The game draws it (src/rendering/lightfx/glint.js GRADE_LOOK); for ANOTHER
 * player's armour it needs the grade from the worker, which sends it as `eqg`
 * on that player's tick entry: two letters, the torso's then the greaves'
 * (n / r / e / g).  What is held here:
 *   1. the letters: n / r / e / g, junk n, and godly only on a piece the
 *      worker minted (combat.js's own rule) -- else e;
 *   2. the wire: NO `eqg` at all in plain armour (everyone's tick unchanged);
 *      'rn' for a rare torso over plain greaves; a described godly piece
 *      (the legacy lane) goes out as e, and a claimed `prov` is stripped;
 *   3. the admin kit's `quality`: the pieces are minted in that grade into
 *      the ledger and the bag, and worn by their ids they go out as 'ee' --
 *      godly as 'gg', proven;
 *   4. a swap that changes only the grade marks the player for the next
 *      tick (the look the client relays does not change);
 *   5. `eqg` is derived, never saved with the character.
 */
import { GameRoom } from '../src/index.js';
import { wornGradeLetter, armourGradeWire } from '../src/gearprov.js';

const KEY = 'test-admin-key-0123456789';
function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, JSON.parse(JSON.stringify(v))); },
      list: async (opts) => {
        const out = new Map();
        for (const k of [...store.keys()].filter((x) => !opts?.prefix || x.startsWith(opts.prefix)).sort()) out.set(k, store.get(k));
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) }, ADMIN_KEY: KEY };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
const authed = (path, body) => new Request('https://w/api/admin' + path, {
  method: 'POST', headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail)); }
}

// ── 1. the letters ────────────────────────────────────────────────────────────
{
  check('letters: no piece, or a normal one, is n', wornGradeLetter(null) === 'n' && wornGradeLetter({ name: 'Iron Torso' }) === 'n'
    && wornGradeLetter({ quality: 'normal' }) === 'n');
  check('letters: rare r, elite e', wornGradeLetter({ quality: 'rare' }) === 'r' && wornGradeLetter({ quality: 'elite' }) === 'e');
  check('letters: godly g only when the worker minted it; a godly it cannot prove is e (combat.js\'s rule)',
    wornGradeLetter({ quality: 'godly', prov: 'minted' }) === 'g' && wornGradeLetter({ quality: 'godly' }) === 'e'
    && wornGradeLetter({ quality: 'godly', prov: 'legacy' }) === 'e');
  check('letters: junk is n (an unknown grade, __proto__, a number, not an object)',
    wornGradeLetter({ quality: 'mythic' }) === 'n' && wornGradeLetter({ quality: '__proto__' }) === 'n'
    && wornGradeLetter({ quality: 3 }) === 'n' && wornGradeLetter('elite') === 'n');
  check('the wire: nothing for plain armour (null), else the two letters, torso first',
    armourGradeWire({ armor: null, legsArmor: null }) === null && armourGradeWire({ armor: { quality: 'normal' } }) === null
    && armourGradeWire({ armor: { quality: 'rare' }, legsArmor: null }) === 'rn'
    && armourGradeWire({ armor: null, legsArmor: { quality: 'elite' } }) === 'ne'
    && armourGradeWire({ armor: { quality: 'godly', prov: 'minted' }, legsArmor: { quality: 'godly', prov: 'minted' } }) === 'gg'
    && armourGradeWire(null) === null);
}

// ── the room ──────────────────────────────────────────────────────────────────
const state = makeState();
const room = new GameRoom(state, mockEnv);
const sockets = {};
async function join(id) {
  const w = fakeWs(id);
  sockets[id] = w;
  room.sessions.set(w, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(w, JSON.stringify({ type: 'join', id, name: id.toUpperCase(), protocolVersion: 2, data: { x: 1000, y: 1000, z: 'town' } }));
  return room.playerState[id];
}
const send = (id, type, payload) => room.webSocketMessage(sockets[id], JSON.stringify({ type, payload: payload || {} }));
const A = await join('p1');
const B = await join('p2');
B.x = A.x + 60; B.y = A.y;
/* the defence points the iron pieces ask, so no swap is refused by the
   equip gate (_prog3EquipOk) -- this suite is about the grade */
if (A.prog3) { A.prog3.points = Object.assign({}, A.prog3.points, { defense: 50 }); }
/* one real tick, as player p2 receives it: p1's entry, or null */
const tickOnce = async (mark = true) => {
  sockets.p2.sent.length = 0;
  if (mark) room.dirtyPlayers.add('p1');
  room.startTickLoop();
  await new Promise((r) => setTimeout(r, room.TICK_RATE * 3));
  clearInterval(room.tickInterval); room.tickInterval = null;
  const ticks = sockets.p2.sent.filter((m) => m.type === 'tick' && m.players && m.players.p1);
  return ticks.length ? ticks[ticks.length - 1].players.p1 : null;
};

// ── 2. the wire ───────────────────────────────────────────────────────────────
{
  A.armor = null; A.legsArmor = null;
  const plain = await tickOnce();
  check('wire: plain (or no) armour -- p1\'s entry carries no `eqg` at all', !!plain && !('eqg' in plain), plain);
  A.armor = { name: 'Iron Torso', mat: 'iron', tierMult: 2, quality: 'rare' };
  const rare = await tickOnce();
  check('wire: a rare torso over no greaves -- `eqg` "rn"', !!rare && rare.eqg === 'rn', rare);
  /* the legacy lane: a piece the client DESCRIBES, grade and a forged prov */
  await send('p1', 'stats_update', { armor: { name: 'Copper Torso', mat: 'copper', tierMult: 1, quality: 'godly', prov: 'minted' } });
  check('wire: a described godly torso is worn with its claimed prov stripped (the legacy lane)',
    !!A.armor && A.armor.quality === 'godly' && A.armor.prov !== 'minted', A.armor);
  const legacy = await tickOnce();
  check('wire: ...and goes out as elite, "en" -- as combat counts it, never godly unproven', !!legacy && legacy.eqg === 'en', legacy);
}

// ── 3. the admin kit's grade, worn by its ids ─────────────────────────────────
{
  sockets.p1.sent.length = 0;
  const r = await room._adminFetch(authed('/dev/kit', { playerId: 'p1', what: 'armor', quality: 'elite' }));
  const body = await r.json();
  check('kit: quality "elite" hands out the four armour pieces', r.status === 200 && body.ok && body.armor === 4, body);
  const stashed = sockets.p1.sent.filter((m) => m.type === 'quest_reward_stashed').map((m) => m.payload && (m.payload.item || m.payload));
  check('kit: ...each told to the bag with its grade (quest_reward_stashed)',
    stashed.length >= 4 && stashed.every((p) => p && p.quality === 'elite' && typeof p.gid === 'string'), stashed);
  const ledger = room._gearProvOf('p1') || {};
  const rows = (Array.isArray(ledger.list) ? ledger.list : []).filter((x) => x && x.p && x.p.quality === 'elite');
  check('kit: ...minted into the ledger as elite (so a godly one would be provable)', rows.length >= 4, rows.length);
  const torso = stashed.find((p) => p.name === 'Iron Torso'), legs = stashed.find((p) => p.name === 'Iron Greaves');
  await send('p1', 'stats_update', { armorRef: torso && torso.gid, legsArmorRef: legs && legs.gid });
  check('kit: worn by their ids, both pieces are the minted elite ones',
    !!A.armor && A.armor.quality === 'elite' && A.armor.prov === 'minted' && !!A.legsArmor && A.legsArmor.quality === 'elite' && A.legsArmor.prov === 'minted',
    { armor: A.armor, legs: A.legsArmor });
  const worn = await tickOnce();
  check('kit: ...and go out as "ee"', !!worn && worn.eqg === 'ee', worn);
  /* godly, proven */
  sockets.p1.sent.length = 0;
  await room._adminFetch(authed('/dev/kit', { playerId: 'p1', what: 'armor', quality: 'godly' }));
  const g = sockets.p1.sent.filter((m) => m.type === 'quest_reward_stashed').map((m) => m.payload && (m.payload.item || m.payload));
  const gt = g.find((p) => p && p.name === 'Copper Torso'), gl = g.find((p) => p && p.name === 'Copper Greaves');
  await send('p1', 'stats_update', { armorRef: gt && gt.gid, legsArmorRef: gl && gl.gid });
  const godly = await tickOnce();
  check('kit: a godly pair the worker minted goes out as "gg"', !!godly && godly.eqg === 'gg', { wire: godly, armor: A.armor });
  check('kit: junk `quality` is a plain kit (no grade)', await (async () => {
    sockets.p1.sent.length = 0;
    await room._adminFetch(authed('/dev/kit', { playerId: 'p1', what: 'armor', quality: '__proto__' }));
    const j = sockets.p1.sent.filter((m) => m.type === 'quest_reward_stashed').map((m) => m.payload && (m.payload.item || m.payload));
    return j.length >= 4 && j.every((p) => p && !('quality' in p && p.quality && p.quality !== 'normal'));
  })());
}

// ── 4. a swap that changes only the grade is sent at once ─────────────────────
{
  const ledger = room._gearProvOf('p1') || {};
  const all = (Array.isArray(ledger.list) ? ledger.list : []).filter((x) => x && x.p && x.p.name === 'Copper Torso');
  const plainCopper = all.find((x) => !x.p.quality || x.p.quality === 'normal');
  room.dirtyPlayers.clear();
  await send('p1', 'stats_update', { armorRef: plainCopper && plainCopper.id });
  check('swap: a godly copper torso for a plain one (the same look) marks p1 for the next tick',
    !!plainCopper && !!A.armor && (!A.armor.quality || A.armor.quality === 'normal') && room.dirtyPlayers.has('p1'), { row: plainCopper && plainCopper.id, armor: A.armor });
  const after = await tickOnce(false);
  check('swap: ...and that tick carries the new grade, "ng"', !!after && after.eqg === 'ng', after);
}

// ── 5. never saved ────────────────────────────────────────────────────────────
{
  await room._saveRpg && room._saveRpg('p1');
  const saved = JSON.stringify(state._store.get('rpg:p1') || {});
  check('eqg is derived, never saved with the character', !/"eqg"/.test(saved));
}

console.log(failures === 0 ? '\nall armour grade checks passed' : `\n${failures} armour grade check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
