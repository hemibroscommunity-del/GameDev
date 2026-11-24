/* ═══ v2.3.6441: THE SHARED SCANNER CATCHES EVERY SPELLING (card DG PR 2) ═══
 *
 * tools/guards/lib/writesOf.mjs is what every "one door" test (gold, bag,
 * stash, life, points, quest, experience, the hit door, the session door,
 * the send door) asks "who writes this field?" and "who calls this door?".
 * The shape review of 2026-11-23 planted the spellings a tired programmer
 * writes (tools/dev/plants/plants1-4.json) and the text patterns let 44 of 47
 * walk past.  Each is planted here, in a function of its own, and must be
 * found; the reads beside them must not be.  A spelling the scanner cannot
 * know (a key computed from data at run time) is the running room's
 * (server/test/testroom.mjs, card DG PR 1).
 *
 * v2.3.6446 (sitting 59): 6. THE ALLOW LIST (opts.handout) -- a container
 * handed where the scan cannot follow (a function of another file, a return,
 * an object or a list written out, a spread, a callback, a piece when its
 * items are objects) is red, its allowed forms are not; 7. opts.getters (a
 * Map's item and the key put on it) and opts.unknownKeys (a key the tree
 * cannot know on a record holding a guarded field); 8. msgReadsOf (what a
 * handler reads off a message: wire-hostile section 5). */
import { writesOf, refsOf, doorWrites, doorCalls, msgReadsOf } from './lib/writesOf.mjs';

let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + JSON.stringify(detail).slice(0, 1500))); }
}
const inFn = (body) => 'export const room = {\n  _turnIn(session, ps, reward, ws) {\n' + body + '\n  },\n};\n';
const W = (body, opts) => writesOf(inFn(body), opts);

/* ── 1. a field written, however it is spelled ── */
const GOLD = { fields: ['coins'] };
const XP = { fields: ['xp', 'level', 'lifeSkills'] };
const HP = { fields: ['hp', 'dead', 'dying', 'life'] };
const POINTS = { fields: ['pool', 'shared', 'prog3'], containers: ['poolBy', 'alloc'] };
const FIELD_PLANTS = [
  ['the obvious spelling', 'ps.coins = (ps.coins || 0) + 5;', GOLD, 'coins'],
  ['a sum', 'ps.coins += 5;', GOLD, 'coins'],
  ['++', 'ps.coins++;', GOLD, 'coins'],
  ['a bracket and a string', "ps['coins'] -= 1;", GOLD, 'coins'],
  ['GOLD-1 Object.assign', 'Object.assign(ps, { coins: (ps.coins || 0) + (reward.bonusGold || 0) });', GOLD, 'coins'],
  ['GOLD-2 ||=', 'ps.coins ||= reward.gold || 0;', GOLD, 'coins'],
  ['??=', 'ps.coins ??= 5;', GOLD, 'coins'],
  ['GOLD-3 a key from a list', "for (const k of ['coins', 'goldNuggets']) ps[k] = (ps[k] || 0) + (reward[k] || 0);", GOLD, 'coins'],
  ['a key in a const', "const K = 'coins'; ps[K] = 1;", GOLD, 'coins'],
  ['a key from a ternary', "ps[reward.big ? 'coins' : 'gems'] = 1;", GOLD, 'coins'],
  ['a key from a template', 'ps[`coins`] = 1;', GOLD, 'coins'],
  ['a computed key in Object.assign', "const k = 'coins'; Object.assign(ps, { [k]: 5 });", GOLD, 'coins'],
  ['Reflect.set', "Reflect.set(ps, 'coins', 5);", GOLD, 'coins'],
  ['Object.defineProperty', "Object.defineProperty(ps, 'coins', { value: 5 });", GOLD, 'coins'],
  ['optional chaining is still a write', 'if (ps) ps.coins = 1;', GOLD, 'coins'],
  ['a destructuring assignment', '[ps.coins, ps.x] = [1, 2];', GOLD, 'coins'],
  ['XP-1 Object.assign of two', 'Object.assign(ps, { xp: (ps.xp || 0) + (reward.xp || 0), level: Math.max(ps.level || 1, reward.minLevel || 1) });', XP, 'xp'],
  ['XP-2 ||= and ??=', 'ps.level ||= reward.minLevel || 1; ps.xp ??= reward.xp;', XP, 'level'],
  ['XP-3 a track through a destructure', '{ const { lifeSkills } = ps; const t = lifeSkills.mining; if (t) [t.xp, t.level] = [0, t.level + 1]; }', XP, 'xp'],
  ['a track rebuilt and put back', 'ps.lifeSkills.mining = { level: 1, xp: 0 };', XP, 'xp'],
  ['XP-5 every life skill wiped', 'ps.lifeSkills = {};', XP, 'lifeSkills'],
  ['HP-1 Object.assign', 'Object.assign(ps, { hp: ps.maxHp, dead: false });', HP, 'hp'],
  ['HP-2 a player named m', 'for (const id of (reward.partyIds || [])) { const m = this.playerState[id]; if (m) { m.hp = m.maxHp; m.dead = false; } }', HP, 'hp'],
  ['HP-3 delete the phase', 'delete ps.dying; delete ps.dead;', HP, 'dead'],
  ['HP-4 ||=', 'ps.hp ||= ps.maxHp;', HP, 'hp'],
  ['POINTS-1 Object.assign onto a destructured block', '{ const { prog3 } = ps; if (prog3) Object.assign(prog3, { pool: (prog3.pool || 0) + 1 }); }', POINTS, 'pool'],
  ['POINTS-2 ||=', 'if (ps.prog3) ps.prog3.shared ||= 3;', POINTS, 'shared'],
  ['a whole block put', 'ps.prog3 = { pool: 9 };', POINTS, 'prog3'],
  ['a record rebuilt with a spread and put back', 'this.playerState[session.id] = { ...ps, coins: 5 };', GOLD, 'coins'],
  ['the same, held in a name first', 'const next = { ...ps, coins: 5 }; this.playerState[session.id] = next;', GOLD, 'coins'],
  /* v2.3.6441: sitting 57's plants (review-z57.md, #2295) */
  ['Z57 Object.assign of a patch held in a name', 'const patch = { coins: (ps.coins || 0) + 5 }; Object.assign(ps, patch);', GOLD, 'coins'],
  ['Z57 ...a patch filled after', "let patch = {}; patch['coins'] = 5; Object.assign(ps, { ...patch });", GOLD, 'coins'],
  ['Z57 ...a patch from a ternary', 'const a = { coins: 1 }, b = { gems: 1 }; Object.assign(ps, reward.big ? a : b);', GOLD, 'coins'],
  ['Z57 a helper handed the record and the key', "function bump(o, k, n) { o[k] = (o[k] || 0) + n; } bump(ps, 'coins', 5);", GOLD, 'coins'],
  ['Z57 ...the key handed on twice', "function put(o, k, v) { o[k] = v; } function bump(o, k, n) { put(o, k, (o[k] || 0) + n); } bump(ps, 'coins', 5);", GOLD, 'coins'],
];
for (const [name, body, opts, field] of FIELD_PLANTS) {
  const got = W(body, opts);
  check('1. ' + name + ': found as a write of ' + field, got.some((w) => w.field === field && ['_turnIn', 'bump', 'put'].includes(w.fn) && w.line === 3), got.map((w) => [w.line, w.field, w.how]));
}

/* ── 2. a container's contents written, through any alias ── */
const BAG = { containers: ['inventory'], makers: { bagOf: 'inventory' } };
const QUEST = { containers: ['_quests', '_questKills'] };
const STASH = { containers: ['weaponStash', 'armorStash', 'shieldStash'], words: { STASH_FIELDS: ['weaponStash', 'armorStash', 'shieldStash'], GEAR_PROV_FIELD: ['armorStash', 'shieldStash'] } };
const CONTAINER_PLANTS = [
  ['a count by the dot', 'ps.inventory[reward.item] = (ps.inventory[reward.item] || 0) + 1;', BAG, 'inventory'],
  ['a count deleted', 'delete ps.inventory[reward.item];', BAG, 'inventory'],
  ['a count by --', 'ps.inventory.wood--;', BAG, 'inventory'],
  ['an alias', 'const inv = ps.inventory; inv[reward.item] = 1;', BAG, 'inventory'],
  ['an alias of an alias', 'const a = ps.inventory; const b = a; b.wood += 1;', BAG, 'inventory'],
  ['an alias made later', 'let inv; inv = ps.inventory; inv.wood = 1;', BAG, 'inventory'],
  ['a maker', 'const bag = bagOf(ps, true); bag.wood = 1;', BAG, 'inventory'],
  ['BAG-1 a destructured bag', '{ const { inventory } = ps; inventory[reward.item] = (inventory[reward.item] || 0) + 1; }', BAG, 'inventory'],
  ['BAG-2 Object.assign onto the bag', 'Object.assign(ps.inventory, { [reward.item]: (ps.inventory[reward.item] || 0) + 1 });', BAG, 'inventory'],
  ['BAG-3 a helper handed the bag', 'function addTo(items, k, n) { items[k] = (items[k] || 0) + n; } addTo(ps.inventory, reward.item, 1);', BAG, 'inventory'],
  ['BAG-4 ||=', 'ps.inventory[reward.item] ||= 1;', BAG, 'inventory'],
  ['BAG-5 the whole bag emptied', 'ps.inventory = {};', BAG, 'inventory'],
  ['BAG-6 the whole bag rebuilt from a spread', 'ps.inventory = { ...ps.inventory, [reward.item]: 99 };', BAG, 'inventory'],
  ['QUEST-1 a destructured map, renamed', "{ const { _quests: qs } = ps; qs[reward.next] = 'active'; }", QUEST, '_quests'],
  ['QUEST-2 a helper handed the map', "function mark(q, id, st) { q[id] = st; } mark(ps._quests, reward.next, 'active');", QUEST, '_quests'],
  ['QUEST-3 a spread put back', "Object.assign(ps, { _quests: { ...ps._quests, [reward.next]: 'active' } });", QUEST, '_quests'],
  ['STASH-1 a destructured stash pushed', '{ const { weaponStash } = ps; if (reward.weapon) weaponStash.push(reward.weapon); }', STASH, 'weaponStash'],
  ['STASH-2 Object.assign with a spread', 'Object.assign(ps, { weaponStash: [...(ps.weaponStash || []), reward.weapon] });', STASH, 'weaponStash'],
  ['a stash spliced through an alias', 'const bag = ps.shieldStash; bag.splice(0, 1);', STASH, 'shieldStash'],
  ['a stash\'s length cut', 'ps.weaponStash.length = 0;', STASH, 'weaponStash'],
  ['a stash by a field from another file\'s map', 'const field = GEAR_PROV_FIELD.shield; ps[field].push(reward.piece);', STASH, 'armorStash|shieldStash'],
  ['every stash, over another file\'s list', 'for (const f of STASH_FIELDS) ps[f].length = 0;', STASH, 'weaponStash|armorStash|shieldStash'],
  ['a stash item changed in place', 'ps.weaponStash[0].lvl = 99;', STASH, 'weaponStash'],
  ['a stash item held in a name, changed', 'const w = ps.weaponStash[0]; w.lvl = 99;', STASH, 'weaponStash'],
  ['every stash item changed over a loop', 'for (const w of ps.weaponStash) w.lvl = 99;', STASH, 'weaponStash'],
  ['a stash item\'s field deleted', 'delete ps.weaponStash[0].gems;', STASH, 'weaponStash'],
  /* v2.3.6441: sitting 57's plants (an item changed through .find / forEach) */
  ['Z57 a stash item found, then changed', 'const w = ps.weaponStash.find((x) => x.id === reward.id); if (w) w.lvl = 99;', STASH, 'weaponStash'],
  ['Z57 ...changed where it is found', 'ps.weaponStash.find((x) => x.id === reward.id).lvl = 99;', STASH, 'weaponStash'],
  ['Z57 ...at(i)', 'ps.shieldStash.at(-1).lvl = 99;', STASH, 'shieldStash'],
  ['Z57 every stash item changed in a forEach', 'ps.weaponStash.forEach((w) => { w.lvl = 99; });', STASH, 'weaponStash'],
  ['Z57 ...over a filtered copy', 'ps.weaponStash.filter((w) => w.lvl < 5).forEach(function (w) { delete w.gems; });', STASH, 'weaponStash'],
  ['Z57 ...through an alias, in a map', 'const list = ps.weaponStash; list.map((w) => { w.lvl = 1; return w; });', STASH, 'weaponStash'],
  ['Z57 ...reduce\'s item', 'ps.weaponStash.reduce((n, w) => { w.seen = 1; return n + 1; }, 0);', STASH, 'weaponStash'],
  /* v2.3.6441: sitting 58's plant (review-z58.md, #2295) and the class
     around it -- a binding followed through EVERY form (a list pattern, a
     nested one, a key that is a number, a rest, a parameter's pattern, a
     loop's, a callback's, a copy, a member of something else, a function's
     answer, an object holding it), and a form the scanner cannot follow is
     a write (deny by default) */
  ['Z58 a list pattern written through', 'const [first] = ps.weaponStash; first.lvl = 99;', STASH, 'weaponStash'],
  ['Z58 ...nested under the stash\'s key', 'const { weaponStash: [w0] } = ps; w0.lvl = 99;', STASH, 'weaponStash'],
  ['Z58 ...an item\'s number as a key', 'const { 0: first } = ps.weaponStash; first.lvl = 99;', STASH, 'weaponStash'],
  ['Z58 ...a pattern put, not declared', 'let w; [w] = ps.weaponStash; w.lvl = 99;', STASH, 'weaponStash'],
  ['Z58 ...a rest of the items', 'const [, ...rest] = ps.weaponStash; rest[0].lvl = 99;', STASH, 'weaponStash'],
  ['Z58 ...a loop\'s pattern over entries()', 'for (const [, w] of ps.weaponStash.entries()) w.lvl = 99;', STASH, 'weaponStash'],
  ['Z58 ...a callback\'s pattern', 'ps.weaponStash.forEach(({ gems }) => { gems.length = 0; });', STASH, 'weaponStash'],
  ['Z58 ...a parameter\'s pattern', 'function give({ weaponStash }) { weaponStash.push(reward.weapon); } give(ps);', STASH, 'weaponStash'],
  ['Z58 ...a loop over records, a pattern', 'for (const { weaponStash } of [ps]) weaponStash.push(reward.weapon);', STASH, 'weaponStash'],
  ['Z58 a copy\'s item written', 'const all = [...ps.weaponStash]; all[0].lvl = 99;', STASH, 'weaponStash'],
  ['Z58 ...Object.values', 'Object.values(ps.weaponStash)[0].lvl = 99;', STASH, 'weaponStash'],
  ['Z58 ...a filtered copy held in a name', 'const live = ps.weaponStash.filter(Boolean); live[0].lvl = 99;', STASH, 'weaponStash'],
  ['Z58 an item put into a member, written there', 'this._cur = ps.weaponStash[0]; this._cur.lvl = 99;', STASH, 'weaponStash'],
  ['Z58 a function of the file that hands back an item', 'const pick = () => ps.weaponStash[0]; pick().lvl = 99;', STASH, 'weaponStash'],
  ['Z58 an object holding the stash under another key', 'const o = { list: ps.weaponStash }; o.list.push(reward.weapon);', STASH, 'weaponStash'],
  ['Z58 DENY: a key the tree cannot know, in a pattern', 'const { [reward.k]: s } = ps; s.push(reward.weapon);', STASH, 'weaponStash|armorStash|shieldStash'],
  ['Z58 DENY: an item put into a member of a call\'s answer', 'this.slot().w = ps.weaponStash[0];', STASH, 'weaponStash'],
];
for (const [name, body, opts, field] of CONTAINER_PLANTS) {
  const got = W(body, opts);
  check('2. ' + name + ': found as a write of ' + field, got.some((w) => w.field === field && w.line === 3), got.map((w) => [w.line, w.field, w.how]));
}

/* ── 3. a read is no write ── */
const READS = [
  ['a compare', 'if (ps.coins >= 5 && ps.inventory.wood === 1) return ps.level;', { fields: ['coins', 'level'], containers: ['inventory'] }],
  ['a copy made from the bag', 'const keep = Object.keys(ps.inventory); const n = { ...ps.inventory }; n.wood = 1;', BAG],
  ['a literal handed out', 'this._send(ws, { type: "x", payload: { coins: ps.coins, xp: ps.xp } }); return { level: 1 };', { fields: ['coins', 'xp', 'level'] }],
  ['a name put again', 'let inv = ps.inventory; inv = {}; const q = ps._quests; const n = q.length;', { containers: ['inventory', '_quests'] }],
  ['another field', 'ps.coinsSeen = 1; ps.levelUpAt = 2; ps.x.hpBar = 3;', { fields: ['coins', 'level', 'hp'] }],
  ['the bag\'s own count read through an alias', 'const inv = ps.inventory; const n = inv.wood || 0; return n + 1;', BAG],
  ['a copy of the record sent or saved, not put back', 'const out = { ...ps, coins: 0 }; this._send(ws, { type: "x", payload: { ...ps, coins: 1 } }); return out;', GOLD],
  ['a stash item read in a loop', 'let best = 0; for (const w of ps.weaponStash) best = Math.max(best, w.lvl); return best;', STASH],
  /* v2.3.6441: beside sitting 57's plants, the reads stay reads */
  ['a stash item found and read, a forEach that reads', 'const w = ps.weaponStash.find((x) => x.id === 1); let n = w ? w.lvl : 0; ps.weaponStash.forEach((x) => { n += x.lvl; }); return n;', STASH],
  ['a patch of other fields, a helper handed another key', "const patch = { name: 'x' }; Object.assign(ps, patch); function bump(o, k, n) { o[k] = (o[k] || 0) + n; } bump(ps, 'gems', 1);", GOLD],
  ['a copy made from a found item', 'const w = { ...ps.weaponStash.find((x) => x.id === 1) }; w.lvl = 99; return w;', STASH],
  /* v2.3.6441: beside sitting 58's, a copy's own slots and order, an item read through a pattern */
  ['a copy sorted and cut', 'const sorted = [...ps.weaponStash].sort((a, b) => a.lvl - b.lvl); sorted.length = 1; const ids = ps.weaponStash.map((w) => w.id); ids.push(0); return sorted;', STASH],
  ['an item read through a list pattern', 'const [first] = ps.weaponStash; const { lvl } = ps.weaponStash[0]; return first ? first.lvl + lvl : 0;', STASH],
  ['a session\'s own field, the map shallow', 'for (const [w, s] of this.sessions) s.seen = 1; const one = this.sessions.get(ws); one.x = 1;', { containers: ['sessions'], shallow: ['sessions'] }],
];
for (const [name, body, opts] of READS) {
  const got = W(body, opts);
  check('3. ' + name + ': no write', got.length === 0, got.map((w) => [w.line, w.field, w.how]));
}

/* ── 4. a door's method referred to, by any receiver, in any position ── */
const DOOR = ['_goldGive', '_hpSet', '_lifeTo', 'send'];
const REF_PLANTS = [
  ['a plain call', "this._goldGive(ps, 5, 'shop_sell');", 'call', '_goldGive', 'shop_sell'],
  ['PAY2-1 bound to a name', "{ const give = this._goldGive.bind(this); give(ps, paid, 'shop_sell'); }", 'bind', '_goldGive'],
  ['.call', "this._goldGive.call(this, ps, 5, 'shop_sell');", 'call.call', '_goldGive', 'shop_sell'],
  ['.apply', "this._goldGive.apply(this, [ps, 5, 'shop_sell']);", 'apply', '_goldGive'],
  ['a name made of it', 'const g = this._goldGive; g(ps, 5);', 'alias', '_goldGive'],
  ['a destructure', 'const { _goldGive } = this; _goldGive.call(this, ps, 5);', 'destructure', '_goldGive'],
  ['handed on as a value', 'later(this._goldGive);', 'value', '_goldGive'],
  ['HP-5 another receiver name', "{ const room = this; room._hpSet(ps, ps.maxHp, 'rest'); room._lifeTo(ps, 'alive', 'respawn'); }", 'call', '_hpSet', 'rest'],
  ['a key in a string', "this['_goldGive'](ps, 5, 'quest_reward');", 'call', '_goldGive', 'quest_reward'],
  ['SEND-1 the socket\'s send bound', '{ const out = ws.send.bind(ws); out("{}"); }', 'bind', 'send'],
];
for (const [name, body, how, nm, road] of REF_PLANTS) {
  const got = refsOf(inFn(body), DOOR);
  const hit = got.find((r) => r.name === nm && r.how === how && r.line === 3);
  check('4. ' + name + ': a ' + how + ' of ' + nm + (road ? ' on road ' + road : ''), !!hit && (!road || (hit.args && hit.args.includes(road))), got);
}
{
  const got = refsOf(inFn('if (this._goldGive) this._goldGive(ps, 5, "x"); const ok = typeof this._hpSet === "function";'), DOOR);
  check('4. only asking whether a door is there is a test, never a caller', got.filter((r) => r.how === 'test').length === 2 && got.filter((r) => r.how === 'call').length === 1, got.map((r) => [r.name, r.how]));
}

/* ── 5. the door tests' two questions ── */
{
  const code = {
    'gold.js': inFn('ps.coins = 1;'),
    'a.js': inFn('ps.coins += 1;'),
    'b.js': inFn('lost.coins = ps.coins;'),
  };
  const r = doorWrites(code, { skip: ['gold.js'], fields: ['coins'], listed: [{ file: 'b.js', fn: '_turnIn', field: 'coins', n: 1, why: 'a note' }] });
  check('5. doorWrites: the door\'s file is skipped, a listed row is kept, the rest is found', r.found.length === 1 && r.found[0].file === 'a.js' && r.stale.length === 0, r);
  const r2 = doorWrites({ ...code, 'b.js': inFn('lost.coins = ps.coins; Object.assign(lost, { coins: 2 });') }, { skip: ['gold.js'], fields: ['coins'], listed: [{ file: 'b.js', fn: '_turnIn', field: 'coins', n: 1, why: 'a note' }] });
  check('5. ...a second spelling in a listed function is one too many (its count)', r2.stale.length === 1 && r2.stale[0].seen === 2, r2.stale);
  let threw = false;
  try { doorWrites(code, { fields: ['coins'], listed: [{ file: '*', fn: '_turnIn', field: 'coins', n: 1 }] }); } catch { threw = true; }
  check('5. ...a row for every file (\'*\') is refused: a row names its file', threw);
  const c = doorCalls({ 'a.js': inFn("this._goldGive(ps, 1, 'a'); room._goldGive(ps, 1, 'b'); const g = this._goldGive.bind(this);") }, { names: ['_goldGive'] });
  check('5. doorCalls: every receiver\'s call with its road, a bind as odd', c.calls.map((x) => x.road).join() === 'a,b' && c.odd.length === 1 && c.odd[0].how === 'bind', c);
}

/* ── 6. THE ALLOW LIST (v2.3.6446, sitting 59) ── */
/* `tuneFirst(ps.weaponStash)` with tuneFirst in ANOTHER file stayed green:
   the scan enumerated the spellings of a write and followed a container
   within one file.  opts.handout: every appearance of a container is in a
   form the scan knows, or it is a write it cannot follow (`out: true`). */
{
  const HO = { containers: ['weaponStash', 'inventory'], handout: { doors: ['stashGive', 'bagGive'], objects: ['weaponStash'] } };
  const outs = (body) => W(body, HO).filter((w) => w.out);
  const RED = [
    ['Z59 a function of another file', 'tuneFirst(ps.weaponStash);'],
    ['a method of another file handed a piece', 'this._polish(ps.weaponStash[0]);'],
    ['a return', 'return ps.inventory;'],
    ['an arrow\'s answer', 'const f = () => ps.weaponStash; f();'],
    ['a property of an object written out', 'send({ list: ps.weaponStash });'],
    ['an element of a list written out', 'keep([ps.inventory]);'],
    ['a spread into a call', 'keep(...ps.weaponStash);'],
    ['a copy of a list of pieces handed out', 'keep(ps.weaponStash.slice(0, 3));'],
    ['an entry of Object.entries handed out', 'for (const [, w] of Object.entries(ps.weaponStash)) fix(w);'],
    ['a callback of another file', 'ps.weaponStash.forEach(fix);'],
    ['a method it cannot know', 'ps.weaponStash[reward.how](1);'],
    ['new', 'const m = new Map(ps.inventory);'],
    ['an alias handed out', 'const bag = ps.inventory; this._tally(bag);'],
    ['a found piece handed out', 'const w = ps.weaponStash.find((x) => x.lvl > 1); fix(w);'],
  ];
  for (const [name, body] of RED) { const got = outs(body); check('6. ' + name + ': red (cannot follow)', got.length > 0 && got.every((w) => /^cannot follow: /.test(w.how)), got.map((w) => [w.line, w.field, w.how])); }
  const OK = [
    ['a read, a length, a test, a compare', 'const n = ps.weaponStash.length; if (!ps.weaponStash || ps.inventory.wood > 1) return; return n === 1;'],
    ['a count of the bag anywhere (its items are numbers)', 'log(ps.inventory.wood, ps.inventory[reward.k]); return ps.inventory.wood;'],
    ['a field of a piece anywhere', 'log(ps.weaponStash[0].name); return ps.weaponStash[0].lvl;'],
    ['the door\'s own call, a pure global', 'stashGive(ps, "weaponStash", ps.weaponStash[0]); bagGive(ps.inventory, "w", 1); JSON.stringify(ps.weaponStash); Array.isArray(ps.inventory); Object.keys(ps.inventory); Math.max(ps.inventory.wood, 1);'],
    ['a read-only method, a callback written out', 'ps.weaponStash.includes(x); ps.weaponStash.indexOf(x); ps.weaponStash.forEach((w) => log(w.name)); ps.weaponStash.some((w) => w.lvl > 1);'],
    ['a function of the same file', 'look(ps.weaponStash);\n  },\n  look(l) {\n    return l.length;'],
    ['a copy of the bag (its values are numbers)', 'send({ bag: { ...ps.inventory } }); keep(Object.values(ps.inventory));'],
    ['used as a key, a loop, a name followed', 'const t = T[ps.weaponStash[0].type]; for (const w of ps.weaponStash) log(w.name); const l = ps.weaponStash; return l.length;'],
  ];
  for (const [name, body] of OK) { const got = outs(body); check('6. ' + name + ': no hand-out', got.length === 0, got.map((w) => [w.line, w.field, w.how])); }
  const r = doorWrites({ 'a.js': inFn('tuneFirst(ps.weaponStash);'), 'b.js': inFn('tuneFirst(ps.weaponStash); ps.weaponStash.lvl = 1;') }, { ...HO, listed: [{ file: 'b.js', fn: '_turnIn', field: 'weaponStash', out: true, n: 1, why: 'a note' }] });
  check('6. doorWrites: a hand-out row (`out: true`) holds hand-outs only, a write beside it is still found', r.found.length === 2 && r.found.every((w) => (w.file === 'a.js') === !!w.out) && r.stale.length === 0, r);
}

/* ── 7. a map's item, its key; a key the tree cannot know on a record (v2.3.6446) ── */
{
  const S = { containers: ['sessions'], getters: ['get'] };
  const got = W('const s = this.sessions.get(ws); s.id = null; s.lastPing = 1; s[reward.k] = 2;', S);
  check('7. opts.getters: an item got from a Map (`.get`) is followed, each write with the key it puts (unknown: null)',
    got.length === 3 && JSON.stringify(got.map((w) => w.key)) === JSON.stringify([['id'], ['lastPing'], null]), got.map((w) => [w.how, w.key]));
  const U = { fields: ['coins'], unknownKeys: true };
  const u = (body) => W(body, U).filter((w) => w.field === '[?]').length;
  check('7. opts.unknownKeys: a key the tree cannot know on a record holding a guarded field is a write of \'[?]\'',
    u('if (ps.coins) ps[reward.k] = 1;') === 1 && u('this.playerState[ws][reward.k] = 1;') === 1 && u('const me = ps; ps.coins = 1; me[reward.k] = 0;') === 1 && u('delete ps[reward.k]; return ps.coins;') === 1);
  check('7. ...and not on a record of no guarded field, nor a known key, nor a read',
    u('const o = {}; o[reward.k] = 1; ps["gems"] = 1; const v = ps[reward.k]; return ps.coins;') === 0);
}

/* ── 8. v2.3.6446 (sitting 59): what a handler reads off a message (msgReadsOf) ──
   wire-hostile's section 5 asks it of every handler the router hands a
   message to; each spelling here, in a handler of its own: a read of a
   field however it is written, a read no case of a running room would
   reach, a read that is no read (after a return, a name nothing uses), and
   every other form of the message a fault (deny by default). */
{
  const ROUTER = "export const r = {\n  async _onMessage(ws, session, msg) {\n    switch (msg.type) {\n      case 'a': await this._h(session, msg); break;\n"
    + "      case 'b': this._g(session, msg.payload || msg); break;\n    }\n  },\n};\n";
  const run = (body, extra = '') => msgReadsOf({
    'index.js': ROUTER,
    'h.js': "import { far } from './f.js';\nconst own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);\nfunction helper(m) { return m.x; }\n" + extra
      + 'export const h = {\n  async _h(session, msg) {\n' + body + '\n  },\n  _g(session, p) { return p.g; },\n};\n',
    'f.js': 'export function far(m) { return m.x; }\nexport const o = { _other(m) { return m.x; } };\n',
  }, { entry: { file: 'index.js', fn: '_onMessage', param: 2 }, types: ['a', 'b'] });
  const readsOf = (res, field) => res.reads.filter((x) => x.field === field && x.types.has('a'));
  const READS = [
    ['a member', 'void msg.x;'], ['a bracket', "void msg['x'];"], ['a key in a const', "const k = 'x'; void msg[k];"],
    ['optional', 'void msg?.x;'], ['a destructure', 'const { x } = msg; void x;'], ['a renamed destructure', 'const { x: y = 1 } = msg; void y;'],
    ['the payload, or the message', 'const p = msg.payload || msg; void p.x;'], ['a nested destructure of the payload', 'const { payload: { x } } = msg; void x;'],
    ['own(msg, k)', "void own(msg, 'x');"], ['`in`', "void ('x' in msg);"], ['Object.hasOwn', "void Object.hasOwn(msg, 'x');"],
    ['a function of the file', 'void helper(msg);'], ['a function it imports', 'void far(msg);'], ['a method of the room in another file', 'void this._other(msg);'],
    ['a key put together', "void msg['x' + ''];"], ['an alias of an alias', 'const a = msg; const b = a; void b.x;'],
  ];
  for (const [n, body] of READS) { const r = readsOf(run(body), 'x'); check('8. a read: ' + n, r.length >= 1 && r.some((x) => x.live), run(body)); }
  const len = readsOf(run('if (msg.length) return;'), 'length');
  check('8. msg.length is a read of a field named length (sitting 59: NOT_A_FIELD held it to nothing)', len.length === 1);
  const gate = run("if (msg.type === 'b') void msg.z; void msg.w;");
  check('8. which types reach a read: a test of msg.type the case cannot pass reaches none', gate.reads.find((x) => x.field === 'z').types.size === 0 && gate.reads.find((x) => x.field === 'w').types.has('a'));
  check('8. ...and the other case\'s handler is read for its own type', run('').reads.some((x) => x.field === 'g' && x.types.has('b') && !x.types.has('a')));
  const DEAD = [
    ['after a return', 'return; void msg.x;'],
    ['a destructure whose name nothing uses (sitting 59: quests.js)', 'const { x } = msg;'],
    ['a destructure whose names are used only after a return', 'const { x } = msg; return; void x;'],
    ['a value bound to a name nothing uses', 'const v = msg.x;'],
  ];
  for (const [n, body] of DEAD) { const r = readsOf(run(body), 'x'); check('8. no read: ' + n, r.length >= 1 && r.every((x) => !x.live), r); }
  const FAULTS = [
    ['a key the tree cannot know', 'void msg[Date.now()];'], ['a spread', 'const c = { ...msg };'], ['Object.keys', 'Object.keys(msg);'],
    ['a rest', 'const { x, ...r } = msg; void x; void r;'], ['stored on the room', 'this.box = msg;'], ['handed to a list', 'const l = []; l.push(msg);'],
    ['JSON', 'JSON.stringify(msg);'], ['for-in', 'for (const k in msg) void k;'], ['awaited', 'await msg;'], ['a write', 'msg.x = 1;'],
    ['a template', 'void `${msg}`;'], ['handed to what it cannot find', 'globalThis.fn(msg);'], ['stored in an object', 'const o = { m: msg };'],
    ['an inner function hands it back', 'const f = () => msg; void f;'], ['a computed key of a destructure', 'const { [Date.now()]: q } = msg; void q;'],
    ['arguments', 'void arguments[1];'],
  ];
  for (const [n, body] of FAULTS) { const r = run(body); check('8. a fault: ' + n, r.faults.some((f) => f.types.has('a')), r.faults); }
  check('8. a clean handler has no fault', run('void msg.x; const { y } = msg; void y;').faults.length === 0, run('void msg.x;').faults);
}

if (failed) { console.log(failed + ' FAILED'); process.exit(1); }
console.log('writes-of: all passed');
