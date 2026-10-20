/* A gem goes into a shield on the worker -- v2.3.3187 (server/src/shieldgem.js).
 *
 * The owner, on the overnight hunt's report: "Go recommended fixes" (its
 * decision 11).  The Enchanter's shield gem slot was the game's alone: the
 * gem was never taken from the worker's count (the next player_state gave it
 * back), and the Blacksmith's Take out found no gem on the worker's shield.
 *
 *   1. The flag: caps.shieldgem, under a kill-switch name; the receipt is
 *      privileged.
 *   2. A shield the worker made, on the arm: one polished gem taken from the
 *      worker's own count, the gem in, the shield renamed as the game names
 *      it, 400 Enchanting XP (v2.3.3513; 20 before), a player_state after the receipt, the ledger
 *      row following.
 *   3. It lasts: a reconnect keeps the gem, a claim of the same id is
 *      rebuilt WITH it, and the Blacksmith's Take out gives it back.
 *   4. A shield from before the ledger (no id), named by its signature: it
 *      takes the gem and KEEPS ITS NAME (the name is part of the signature
 *      both sides know it by), nothing is minted, and the same signature
 *      names it again.
 *   5. A shield in the worker's copy of the bag; a gem already in a shield
 *      is replaced and lost, as the game always said.
 *   6. Refused, nothing taken: no gem of that element, a junk element, no
 *      such shield, nothing named, a downed player, a guard's gear lock.
 *   7. The name rule (the game's own, every metal and element) and its
 *      prototype key; the elements the game offers; the kill switch.
 *   8. The QA levers (admin only): a Pine Shield, polished gems.
 */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
/* Loaded by hand, so the suite RUNS against a worker without the module (main
   before v2.3.3187) and fails there check by check -- not on a missing import. */
let SG = {};
try { SG = await import('../src/shieldgem.js'); } catch (e) { SG = {}; }
const SHIELD_GEM = SG.SHIELD_GEM || { XP: undefined, GID_MAX: 40 };
const shieldGemName = SG.shieldGemName || (() => null);
import { shieldSig } from '../src/shieldwear.js';
import { BLACKSMITH_TIER_LABELS, GEM_EXTRACT_BASE_COST } from '../src/data.js';
import { LIVEOPS } from '../src/liveops.js';
import { AMULET_GEMS } from '../src/data.js';
import { SHIELD_GEM_STATS as CLIENT_SHIELD_GEM_STATS } from '../../src/data/items.js';
import { BLACKSMITH_TIERS as CLIENT_BLACKSMITH_TIERS } from '../../src/data/gameSystems.js';

function makeState() {
  const store = new Map();
  return {
    _store: store,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, JSON.parse(JSON.stringify(v))); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
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
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id, data) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, data: { x: 0, y: 0, z: 'town', ...(data || {}) } }));
}
const PID = 'bp_shieldgem_a';
let ws = fakeWs();
await join(ws, PID);
const ps = () => room.playerState[PID];
/* v2.3.3515: gems live in the BAG (gems.js: `gem_raw_<e>`, `gem_<e>`); these
   checks read and set them in the old pouch's names -- the bag and any pouch
   left, as `raw_<e>` / `polished_<e>` */
const gemsOf = (p) => {
  const out = {};
  const add = (k, n) => { n = Math.floor(Number(n) || 0); if (n > 0) out[k] = (out[k] || 0) + n; };
  const inv = (p && p.inventory) || {};
  for (const k of Object.keys(inv)) {
    if (k.startsWith('gem_raw_')) add('raw_' + k.slice(8), inv[k]);
    else if (k.startsWith('gem_')) add('polished_' + k.slice(4), inv[k]);
  }
  const pouch = (p && p.lifeSkills && p.lifeSkills.gems) || {};
  for (const k of Object.keys(pouch)) add(k, pouch[k]);
  return out;
};
const gems = () => gemsOf(ps());
const setGems = (g) => {
  const p = ps();
  if (!p.inventory || typeof p.inventory !== 'object') p.inventory = {};
  for (const k of Object.keys(p.inventory)) if (k.startsWith('gem_')) delete p.inventory[k];
  p.lifeSkills = p.lifeSkills || {};
  p.lifeSkills.gems = {};
  /* ...and the cut ones stand for gems the player MADE: owed their XP
     (weapongem.js "THE XP, ONCE A GEM", v2.3.3515) */
  p.lifeSkills.gemsUnpaid = {};
  for (const k of Object.keys(g)) {
    if (k.startsWith('raw_')) p.inventory['gem_raw_' + k.slice(4)] = g[k];
    else if (k.startsWith('polished_')) { p.inventory['gem_' + k.slice(9)] = g[k]; p.lifeSkills.gemsUnpaid[k.slice(9)] = g[k]; }
  }
};
const enchXp = () => { const e = (ps().lifeSkills || {}).enchanting; return e && typeof e === 'object' ? (e.xp || 0) + 1e6 * ((e.level || 1) - 1) : 0; };
const rowOf = (gid) => ((room._gearProvOf(PID) || { list: [] }).list || []).find((r) => r.id === gid) || null;
const slot = async (payload) => {
  ws.sent.length = 0;
  await room.webSocketMessage(ws, JSON.stringify({ type: 'shield_gem', payload }));
  const m = ws.sent.filter((x) => x.type === 'shield_gem_result');
  return m.length ? m[m.length - 1].payload : null;
};
/* a shield the worker made for this player -- tut_1's Pine Shield, minted as
   quests.js mints it */
const mintShield = (extra) => room._gearProvRecord(PID, 'shield', { tier: 'common', tierMult: 1, gearBase: 'wood', name: 'Pine Shield', ...(extra || {}) }, 'quest');

// ── 1. The flag ──
{
  const sync = ws.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('caps.shieldgem is advertised', !!sync && sync.caps.shieldgem === true, sync && sync.caps.shieldgem);
  check('...under a name the liveflags route accepts (lower case: a kill switch)', LIVEOPS.FLAG_NAME_RE.test('shieldgem'));
  check('the receipt is privileged (a client cannot forge it on another screen)', PRIVILEGED_EVENTS.has('shield_gem_result'));
  /* v2.3.3513: GEM_SET_XP, 400 -- the owner's decision 11 (docs/GEM-PLAN.md), was the game's 20 */
  check('one slot pays 400 Enchanting XP (GEM_SET_XP, the owner\'s decision 11)', SHIELD_GEM.XP === 400);
}

// ── 2. A shield the worker made, on the arm ──
let P;
{
  P = mintShield();
  ps().shield = P;
  setGems({ polished_flame: 2, raw_flame: 3 });
  const xp0 = enchXp();
  const r = await slot({ gem: 'flame', gid: P.gid });
  check('a gem goes into the worn shield: answered ok, naming the shield', !!r && r.ok === true && r.gid === P.gid && r.worn === true && r.gem === 'flame', r);
  check('...ONE polished gem is taken from the worker\'s own count (the raw ones untouched)', gems().polished_flame === 1 && gems().raw_flame === 3, gems());
  check('...the worker\'s shield holds the gem', ps().shield.gem === 'flame');
  check('...renamed as the game names it ("Wood Flame Shield")', ps().shield.name === 'Wood Flame Shield' && r.name === 'Wood Flame Shield', ps().shield.name);
  check('...it is still the shield the worker made (same id, proven)', ps().shield.gid === P.gid && ps().shield.prov === 'minted');
  check('...400 Enchanting XP (v2.3.3513), and the receipt says so', enchXp() - xp0 === 400 && r.xp === 400, { got: enchXp() - xp0, r: r && r.xp });
  check('...the ledger row follows (a rebuild from it keeps the gem)', !!rowOf(P.gid) && rowOf(P.gid).p.gem === 'flame' && rowOf(P.gid).p.name === 'Wood Flame Shield', rowOf(P.gid) && rowOf(P.gid).p);
  check('...a player_state follows the receipt (the gem count and the XP)',
    ws.sent.findIndex((m) => m.type === 'player_state') > ws.sent.findIndex((m) => m.type === 'shield_gem_result'));
  const stored = state._store.get('rpg:' + PID);
  check('...and it is saved: the stored shield has the gem, the stored count is one', !!stored && stored.shield && stored.shield.gem === 'flame'
    && gemsOf(stored).polished_flame === 1, stored && { shield: stored.shield, gems: gemsOf(stored) });
  const last = await slot({ gem: 'flame', gid: P.gid });
  check('the last flame gem goes in too, and the count is gone, not zero', !!last && last.ok === true && !('polished_flame' in gems()), gems());
  const none = await slot({ gem: 'flame', gid: P.gid });
  check('...then there is none to give: refused ("no_gem")', !!none && none.ok === false && none.reason === 'no_gem', none);
}

// ── 3. It lasts, and it comes back out ──
{
  ws = fakeWs();
  await join(ws, PID, { rpgShield: { ...P, gem: null, name: 'Pine Shield' } });
  check('a reconnect keeps the gem in the shield (the worker\'s own copy wins)', !!ps().shield && ps().shield.gid === P.gid && ps().shield.gem === 'flame', ps().shield);
  const byRef = room._gearProvPieceByRef(PID, 'shield', P.gid);
  check('a claim of the same id is rebuilt from the row, gem and all', !!byRef && byRef.gem === 'flame' && byRef.name === 'Wood Flame Shield', byRef);
  ps().coins = 5000;
  const g0 = gems().polished_flame || 0;
  const c0 = ps().coins;
  ws.sent.length = 0;
  await room.webSocketMessage(ws, JSON.stringify({ type: 'amulet_forge_request', payload: { op: 'extract', target: 'shield' } }));
  check('the Blacksmith\'s Take out now finds the gem: it comes back to the count', (gems().polished_flame || 0) === g0 + 1, { before: g0, after: gems().polished_flame });
  check('...for the extract price (the shield\'s tierMult x the base)', c0 - ps().coins === Math.ceil(GEM_EXTRACT_BASE_COST * 1), c0 - ps().coins);
  check('...and the shield and its row are bare again', !!ps().shield && !ps().shield.gem && !!rowOf(P.gid) && !rowOf(P.gid).p.gem, { shield: ps().shield, row: rowOf(P.gid) && rowOf(P.gid).p });
}

// ── 4. A shield from before the ledger (no id), by its signature ──
{
  const L = { tier: 'common', tierMult: 1, gearBase: 'wood', name: 'Pine Shield', prov: 'legacy' };
  ps().shield = L;
  setGems({ polished_frost: 2 });
  const rows0 = (room._gearProvOf(PID) || { list: [] }).list.length;
  const sig0 = shieldSig(L);
  const r = await slot({ gem: 'frost', sig: sig0 });
  check('an old shield takes a gem by its signature', !!r && r.ok === true && r.gid === null && r.worn === true && ps().shield.gem === 'frost', r);
  check('...and KEEPS ITS NAME: its signature (which holds the name) is how both sides know it, so it must not change under the game',
    ps().shield.name === 'Pine Shield' && shieldSig(ps().shield) === sig0 && !!r && r.name === 'Pine Shield', ps().shield);
  check('...the receipt names it by that same signature', r && r.sig === sig0, r && r.sig);
  check('...one frost gem taken', gems().polished_frost === 1, gems());
  check('...nothing is minted: it stays unproven, no ledger row added', !ps().shield.gid && ps().shield.prov === 'legacy' && (room._gearProvOf(PID) || { list: [] }).list.length === rows0);
  const again = await slot({ gem: 'frost', sig: sig0 });
  check('...so the same signature names it again (a second gem replaces the first)', !!again && again.ok === true && !('polished_frost' in gems()) && ps().shield.gem === 'frost', again);
  const bySig = await slot({ gem: 'frost', sig: shieldSig(P) });
  check('...while a shield the worker made is named by its id, never by a signature', !!bySig && bySig.reason === 'not_held', bySig);
}

// ── 5. A shield in the bag; a gem replaced ──
{
  const worn = mintShield({ name: 'Arm Shield' });
  const carried = mintShield({ name: 'Bag Shield', gem: 'stone' });
  ps().shield = worn;
  ps().shieldStash = [carried];
  setGems({ polished_light: 1 });
  const r = await slot({ gem: 'light', gid: carried.gid });
  check('a shield in the worker\'s copy of the bag takes the gem too (not worn)', !!r && r.ok === true && r.worn === false && ps().shieldStash[0].gem === 'light', r);
  check('...the shield on the arm is untouched', !ps().shield.gem && ps().shield.name === 'Arm Shield', ps().shield);
  check('...the gem that was in it is replaced, and not given back (the game\'s "Slot new gem to replace")',
    !('polished_stone' in gems()) && !('polished_light' in gems()), gems());
  check('...its row follows', rowOf(carried.gid).p.gem === 'light');
}

// ── 6. Refused, nothing taken ──
{
  const S = mintShield();
  ps().shield = S;
  ps().shieldStash = [];
  setGems({ polished_venom: 1 });
  const snap = () => JSON.stringify([gems(), ps().shield, enchXp()]);
  const before = snap();
  const cases = [
    ['no gem of that element', { gem: 'storm', gid: S.gid }, 'no_gem'],
    ['an element that is not a gem', { gem: 'plasma', gid: S.gid }, 'bad_gem'],
    ['a prototype key for the element', { gem: '__proto__', gid: S.gid }, 'bad_gem'],
    ['a shield id the worker never made', { gem: 'venom', gid: 'g_nope' }, 'not_held'],
    ['a signature of no shield it holds', { gem: 'venom', sig: 'Godly Shield|wood|8|common' }, 'not_held'],
    ['the id of a shield it holds as a signature', { gem: 'venom', sig: shieldSig(S) }, 'not_held'],
    ['no shield named at all', { gem: 'venom' }, 'bad'],
    ['an over-long id', { gem: 'venom', gid: 'g'.repeat(SHIELD_GEM.GID_MAX + 1) }, 'bad'],
  ];
  for (const [what, payload, reason] of cases) {
    const r = await slot(payload);
    check('refused, ' + what + ' ("' + reason + '")', !!r && r.ok === false && r.reason === reason, r);
  }
  check('...and none of those took a gem, changed the shield or paid XP', snap() === before, { before, after: snap() });

  ps().dead = true;
  let r = await slot({ gem: 'venom', gid: S.gid });
  check('refused while down ("down")', !!r && r.ok === false && r.reason === 'down' && gems().polished_venom === 1, r);
  ps().dead = false;

  ps()._gearLockUntil = Date.now() + 60000;
  ps()._gearLockNotifAt = 0;
  r = await slot({ gem: 'venom', gid: S.gid });
  check('refused under a guard\'s gear lock ("locked"), the lock telling the game itself', !!r && r.ok === false && r.reason === 'locked'
    && ws.sent.some((m) => m.type === 'gear_locked') && gems().polished_venom === 1, r);
  ps()._gearLockUntil = 0;

  r = await slot({ gem: 'venom', gid: S.gid });
  check('...and once the lock is gone, it goes in', !!r && r.ok === true && ps().shield.gem === 'venom', r);
}

// ── 7. The name rule; the kill switch ──
{
  check('the name is the metal\'s label, the element, "Shield"', shieldGemName('iron', 'storm') === BLACKSMITH_TIER_LABELS.iron + ' Storm Shield', shieldGemName('iron', 'storm'));
  check('...an unknown metal is "Basic", as the game names it', shieldGemName('nope', 'wind') === 'Basic Wind Shield');
  check('...and a prototype key is unknown, not an inherited member', shieldGemName('__proto__', 'wind') === 'Basic Wind Shield' && shieldGemName('constructor', 'wind') === 'Basic Wind Shield');
  /* the game's own rule, at its slot site (EnchantPanel):
     (BLACKSMITH_TIERS[gearBase]?.label || 'Basic') + ' ' + Elem + ' Shield' */
  const clientName = (gb, gem) => ((CLIENT_BLACKSMITH_TIERS[gb] && CLIENT_BLACKSMITH_TIERS[gb].label) || 'Basic') + ' ' + gem.charAt(0).toUpperCase() + gem.slice(1) + ' Shield';
  const bases = Object.keys(CLIENT_BLACKSMITH_TIERS).concat(['nope']);
  const off = [];
  for (const gb of bases) for (const gem of AMULET_GEMS) if (shieldGemName(gb, gem) !== clientName(gb, gem)) off.push([gb, gem, shieldGemName(gb, gem), clientName(gb, gem)]);
  check('...the worker names every metal x element as the game does (so a shield\'s signature agrees on both sides)', off.length === 0, off.slice(0, 4));
  const cg = Object.keys(CLIENT_SHIELD_GEM_STATS).sort();
  check('the worker takes exactly the elements the game offers for a shield (SHIELD_GEM_STATS)', JSON.stringify(cg) === JSON.stringify([...AMULET_GEMS].sort()), { client: cg, server: [...AMULET_GEMS] });

  const S = mintShield();
  ps().shield = S;
  setGems({ polished_water: 1 });
  room._liveFlags = { ...(room._liveFlags || {}), shieldgem: false };
  const r = await slot({ gem: 'water', gid: S.gid });
  check('kill switch: shieldgem:false refuses ("off"), nothing taken', !!r && r.ok === false && r.reason === 'off' && gems().polished_water === 1 && !ps().shield.gem, r);
  ws = fakeWs();
  await join(ws, PID);
  const sync = ws.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('...and the next join is told it is off (the game keeps its old slot)', !!sync && sync.caps.shieldgem === false, sync && sync.caps.shieldgem);
  delete room._liveFlags.shieldgem;
}

// ── 8. The QA levers (admin only, devtools.js): a Pine Shield, polished gems ──
{
  ps().shield = null;
  setGems({ polished_flame: 1 });
  const g = room._devKit(PID, { what: 'gems', count: 2 });
  check('/dev/kit gems: +count polished gems of every element, onto the worker\'s count', !!g && g.ok && gems().polished_flame === 3
    && [...AMULET_GEMS].every((e) => (gems()['polished_' + e] || 0) >= 2), gems());
  const big = room._devKit(PID, { what: 'gems', count: 9999 });
  check('...at most 50 a press', !!big && big.ok && gems().polished_frost === 2 + 50, gems().polished_frost);
  const sh = room._devKit(PID, { what: 'shield' });
  check('/dev/kit shield: the tutorial\'s Pine Shield, minted into an empty arm as tut_1 mints it', !!sh && sh.shield === true && !!ps().shield
    && ps().shield.name === 'Pine Shield' && ps().shield.prov === 'minted' && !!rowOf(ps().shield.gid), ps().shield);
  const again = room._devKit(PID, { what: 'shield' });
  check('...never over a shield already worn (the quest\'s own rule)', !!again && again.shield === false);
  const before = JSON.stringify(gems());
  const all = room._devKit(PID, { what: 'all' });
  check('...and neither is part of the kit\'s "all" (the owner\'s button gives what it gave)', !!all && all.ok && JSON.stringify(gems()) === before && !('gems' in all) && !('shield' in all));
}

if (failures) { console.log(`\n${failures} FAILURE(S)`); process.exit(1); }
console.log('\nall shieldgem checks passed');
