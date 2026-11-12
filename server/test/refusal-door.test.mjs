/* EVERY REFUSAL ANSWERS THE PHONE -- v2.3.4791 (the refusal door).
 *
 * The state-machine sweep (2026-11-03) kept finding the same bug: the worker
 * refuses a phone's request with a bare `return`, nothing reaches the phone,
 * and what the phone drew when it asked (coins, a quest, a weapon in the
 * hand, a harvest's XP, a card's lock) stays wrong until the next login.
 * Fixed one by one (#1486 quest_echo, #1500 silent-refusals, #1504
 * duel-drops and store-answer, #1496, #1537 strikesnap and gearresend; TRAPS
 * §284, §313).  This suite keeps them fixed, and catches the next one at
 * review time:
 *
 *   1. THE MAP: every message type of _onMessage's switch is read, and every
 *      method a case calls is a handler the reader reads or is listed as
 *      INFRA (refusal-door-list.mjs) with why it refuses nothing;
 *   2. THE NET: every exit of every handler that answers nothing
 *      (refusal-scan.mjs: a `return` under a guard with no send in it, the
 *      v2 delta `_sendPlayerState` counting as no send) is on the closed
 *      list with its reason, and every line on the list is still an exit in
 *      the code: a new silent refusal fails here, and so does a fixed one
 *      left on the list;
 *   3. THE LIST ONLY SHRINKS: never more lines, nor more `known` ones, than
 *      when it was frozen, and every code is one of CODES;
 *   4. THE READER: it flags a bare return, a return answered only by the
 *      delta, and nothing that answers (a send, a close, a room event, a
 *      sender method, a local answer, a resend), so it cannot go blind;
 *   5. THE MONEY AND QUEST PATHS, DRIVEN: a real GameRoom on protocol v2,
 *      each request sent in a state the worker must refuse, and the asker's
 *      own socket must receive a frame.  The ones still silent today are
 *      marked `known` and must match a `known` line of the list: when one
 *      starts answering, this says so, and its line comes off. */
import { GameRoom } from '../src/index.js';
import { readdirSync, readFileSync } from 'node:fs';
import { readRoom, switchCases, silentExits, callsOf, senderSet, blank, locate, DELTA } from './refusal-scan.mjs';
import { ALLOW, CODES, STRUCTURAL, HANDLERS, INFRA, SWALLOWED, FROZEN } from './refusal-door-list.mjs';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 1500) : ''); }
}

const room = readRoom(GameRoom);
const cases = switchCases(room);
const types = cases.flatMap((c) => c.types);
const isHandler = (m) => /^_handle/.test(m) || HANDLERS.EXTRA.has(m) || HANDLERS.VALUE.has(m);

/* ── 1. the map ── */
{
  check(`1: the switch is read: ${types.length} message types in ${cases.length} cases (guard)`,
    cases.length > 120 && types.includes('quest_turn_in') && types.includes('shop_buy') && types.includes('(default)'), types.length);
  check('1: the reader knows who sends: the farm, the bank, a resend; the v2 delta does not count',
    room.senders.has('_farmSend') && room.senders.has('_bankSend') && room.senders.has('_resendPlayerState')
    && !room.senders.has('_sendPlayerState') && DELTA.has('_sendPlayerState'));
  const unknown = [];
  const called = new Set();
  for (const c of cases) {
    for (const m of callsOf(c.bl)) {
      if (!room.src[m]) continue;
      called.add(m);
      if (!isHandler(m) && !Object.prototype.hasOwnProperty.call(INFRA, m)) unknown.push(c.types[0] + ' -> ' + m);
    }
  }
  check('1: every method a case calls is a handler the net reads, or INFRA with its reason (refusal-door-list.mjs)', unknown.length === 0, unknown);
  const staleInfra = Object.keys(INFRA).filter((m) => !called.has(m));
  check('1: every INFRA name is still called by a case (take a gone one off)', staleInfra.length === 0, staleInfra);
  const empty = cases.filter((c) => !blank(c.bl).replace(/\s|break;?/g, '').length).map((c) => c.types.join('|'));
  check('1: a case with no code is a type swallowed on purpose, listed in SWALLOWED',
    JSON.stringify(empty.sort()) === JSON.stringify(Object.keys(SWALLOWED).sort()), empty);
}

/* ── 2. the net ── */
const found = Object.create(null);   /* unit -> { key: {kw, line} } */
{
  const seen = new Set();
  const add = (unit, exits, method, lineBase) => {
    const n = new Map();
    for (const x of exits) {
      x.method = method; x.lineIn = lineBase + x.line - 1;
      if (STRUCTURAL.has(x.guard)) continue;
      const c = (n.get(x.guard) || 0) + 1;
      n.set(x.guard, c);
      const key = c > 1 ? x.guard + ' #' + c : x.guard;
      (found[unit] || (found[unit] = Object.create(null)))[key] = x;
    }
  };
  for (const c of cases) {
    add('case ' + c.types.join('|'), silentExits(c.bl, c.raw, 0, room.senders), '_onMessage', room.src._onMessage.slice(0, c.at).split('\n').length);
    for (const m of callsOf(c.bl)) {
      if (!room.src[m] || seen.has(m) || !isHandler(m)) continue;
      seen.add(m);
      add(m, silentExits(room.bl[m], room.src[m], 1, room.senders, HANDLERS.VALUE.has(m)), m, 1);
    }
  }
  check(`2: the net reads ${seen.size} handlers (guard)`, seen.size > 120, seen.size);
  const fresh = [];
  let files = null;
  for (const unit in found) {
    for (const key in found[unit]) {
      if (!(ALLOW[unit] && Object.prototype.hasOwnProperty.call(ALLOW[unit], key))) {
        const x = found[unit][key];
        if (!files) {
          const dir = new URL('../src/', import.meta.url);
          files = readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => ['server/src/' + f, readFileSync(new URL(f, dir), 'utf8')]);
        }
        fresh.push(`${unit} (${locate(files, room.src[x.method], x.lineIn)}): ${x.kw} under \`${key}\``);
      }
    }
  }
  check('2: no NEW silent refusal -- answer the phone (its error or result message, or '
    + '_resendPlayerState for the fields it drew; TRAPS §284), or list it in refusal-door-list.mjs with its reason',
    fresh.length === 0, fresh);
  const stale = [];
  for (const unit in ALLOW) {
    for (const key in ALLOW[unit]) if (!(found[unit] && found[unit][key])) stale.push(unit + ': ' + key);
  }
  check('2: every listed exit is still silent in the code -- a fixed or moved one comes off the list (and FROZEN down)', stale.length === 0, stale);
}

/* ── 3. the list only shrinks ── */
{
  let listed = 0, known = 0;
  const bad = [];
  for (const unit in ALLOW) {
    for (const key in ALLOW[unit]) {
      listed++;
      const v = ALLOW[unit][key];
      const m = /^([a-z ]+?)(?::\s*(.+))?$/.exec(v);
      const codes = m ? m[1].trim().split(/\s+/) : [];
      if (!m || !codes.length || codes.some((c) => !Object.prototype.hasOwnProperty.call(CODES, c))) bad.push(unit + ': ' + key + ' -> ' + v);
      if (codes.includes('known')) {
        known++;
        if (codes.length !== 1 || !m[2] || m[2].length < 8) bad.push(unit + ': ' + key + ' -> a known line stands alone with its note');
      }
      if (STRUCTURAL.has(key.replace(/ #\d+$/, ''))) bad.push(unit + ': ' + key + ' is structural, never listed');
    }
  }
  check('3: every line names codes from CODES (a known one alone, with its note)', bad.length === 0, bad);
  check(`3: no more lines than when frozen (${listed} <= ${FROZEN.listed})`, listed <= FROZEN.listed, listed);
  check(`3: no more known-silent refusals than when frozen (${known} <= ${FROZEN.known})`, known <= FROZEN.known, known);
  check('3: the frozen numbers are the list\'s own (lower FROZEN when a line comes off)', listed === FROZEN.listed && known === FROZEN.known, { listed, known });
  check('3: the structural set is the one frozen with it (20 spellings)', STRUCTURAL.size === 20, STRUCTURAL.size);
}

/* ── 4. the reader ── */
{
  const P = {
    _x: 'function () { ws.send(1); }',
    _farmSend: 'function () { this._x(); }',
    _sendPlayerState: 'function () { ws.send(2); }',
    _resendPlayerState: 'function () { this._sendPlayerState(); }',
    _quiet: 'function () { this.n++; }',
  };
  const bl = Object.create(null);
  for (const k in P) bl[k] = blank(P[k]);
  const senders = senderSet(bl);
  check('4: senders close under calls, the delta is not one, a resend is',
    senders.has('_farmSend') && !senders.has('_sendPlayerState') && senders.has('_resendPlayerState') && !senders.has('_quiet'));
  const read = (body, valueRule) => {
    const src = 'function h(session, p) {\n' + body + '\n}';
    return silentExits(blank(src), src, 1, senders, valueRule).map((x) => x.guard);
  };
  const flagged = read([
    'if (!p.a) return;',
    "if (p.b < 1) { this.log('no'); return; }",
    'if (p.c) { this._sendPlayerState(ws, id); return; }',
    "if (p.d) return this._quiet(); // a 'string' with } and { in it",
    'if (p.e) { return; } else { return; }',
    'const xs = p.list.map((y) => { if (y) return 1; return 2; });',
    'return;',
  ].join('\n'));
  check('4: a bare return, a log, the delta alone, a quiet call and an else are flagged; a nested function and the end are not',
    JSON.stringify(flagged) === JSON.stringify(['if (!p.a)', 'if (p.b < 1)', 'if (p.c)', 'if (p.d)', 'if (p.e)', 'else { return; }']), flagged);
  const answered = read([
    "if (!p.a) { ws.send('x'); return; }",
    "if (!p.b) return this._farmSend(session.id, { err: 'coins' });",
    "if (!p.c) { this._resendPlayerState(ws, id, ['coins']); return; }",
    'if (!p.d) { ws.close(4000); return; }',
    "if (!p.e) { this.eventBuffer.push({ type: 'x' }); return; }",
    "const refuse = (why) => this._farmSend(session.id, { err: why });",
    "if (!p.f) return refuse('f');",
    'if (!this._farmSend(session.id, 1)) return;',
    'if (!p.g) return this._later(session, refuse);',
  ].join('\n'));
  check('4: a send, a sender method, a resend, a close, a room event, a local answer (called or handed on) and an answer in the guard all count',
    answered.length === 0, answered);
  const valueRead = read(['if (!p.a) return null;', 'if (p.b) return msg;', 'if (p.c) return false;'].join('\n'), true);
  check('4: for a VALUE method, only a return of nothing, null or false is a drop',
    JSON.stringify(valueRead) === JSON.stringify(['if (!p.a)', 'if (p.c)']), valueRead);
  const caseSrc = "if (!session.id) break;\nfor (const m of xs) { if (m) break; }\nthis._quiet();\nbreak;";
  const caseRead = silentExits(blank(caseSrc), caseSrc, 0, senders).map((x) => x.guard);
  check('4: in a case, a guarded break is an exit; a loop\'s break and the case\'s own end are not',
    JSON.stringify(caseRead) === JSON.stringify(['if (!session.id)']), caseRead);
}

/* ── 5. the money and quest paths, driven ── */
{
  const REAL_NOW = Date.now;
  let T = 1_800_000_000_000;
  Date.now = () => T;
  const mkState = () => {
    const store = new Map();
    return {
      storage: {
        get: async (k) => store.get(k),
        put: async (k, v) => { if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) store.set(kk, vv); } else store.set(k, v); },
        list: async (o) => { const out = new Map(); for (const [k, v] of store) if (!o?.prefix || k.startsWith(o.prefix)) out.set(k, v); return out; },
        delete: async (k) => { if (Array.isArray(k)) { for (const kk of k) store.delete(kk); } else store.delete(k); },
      },
      getWebSockets: () => [], acceptWebSocket: () => {},
    };
  };
  const env = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
  const R = new GameRoom(mkState(), env);
  const ws = { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() { this.closed = true; } };
  const ID = 'bp_refusal_door';
  R.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await R.webSocketMessage(ws, JSON.stringify({ type: 'join', id: ID, name: 'Door', protocolVersion: 2, ws: [1, 5], data: { x: 1000, y: 1000, z: 'town' } }));
  const ps = R.playerState[ID];
  check('5: setup: a v2 player joined', !!ps && ws.sent.some((m) => m.type === 'state_sync'));

  /* Each row: the state that must be refused, the request, and whether the
     worker answers today.  `known` names the list line the silence is. */
  const ROWS = [
    { type: 'shop_buy', why: 'not enough gold', set: (p) => { p.coins = 0; }, payload: { key: 'health_potion', qty: 1 } },
    { type: 'shop_sell', why: 'nothing of that in the bag', set: (p) => { p.inventory = {}; }, payload: { key: 'ore_copper', qty: 1 } },
    { type: 'quest_turn_in', why: 'a goal not met', set: (p) => { p.coins = 0; }, payload: { questId: 'mayor_3' } },
    { type: 'farm_buy', why: 'not enough gold for seeds', set: (p) => { p.coins = 0; }, payload: { item: 'compost', count: 1 } },
    { type: 'arena_sponsor', why: 'no tournament to bet on', set: (p) => { p.coins = 1000; }, payload: { targetId: 'bp_nobody', amount: 100 } },
    { type: 'bank_withdraw', why: 'away from the bank, more than is banked', set: () => {}, payload: { kind: 'coins', n: 500, opId: 'door-b1' } },
    { type: 'trade2_open', why: 'a trade with a player who is not here', set: () => {}, payload: { target: 'bp_nobody_here' } },
    { type: 'quest_accept', why: 'a quest out of its order', set: () => {}, payload: { questId: 'mayor_3' } },
    /* v2.3.4880: the workshop's refusals answer now (the refusal door's lane) */
    { type: 'forge_weapon', why: 'no gold or bars for the copper greatsword', set: (p) => { p.coins = 0; p.inventory = {}; }, payload: { weaponType: 'greatsword', tierKey: 'copper', isWoodwork: false } },
    { type: 'smelt_bar', why: 'no ore to smelt', set: (p) => { p.inventory = {}; }, payload: { barKey: 'bar_copper', count: 1 } },
    { type: 'forge_armor', why: 'no bars for the torso', set: (p) => { p.inventory = {}; }, payload: { recipe: 'copper_torso' } },
    { type: 'amulet_forge_request', why: 'no nuggets to smelt', set: (p) => { p.goldNuggets = 0; }, payload: { op: 'smelt' } },
    /* v2.3.4884: a fire lit with no log answers now */
    { type: 'firemaking_request', why: 'no such log in the bag', set: (p) => { p.inventory = {}; }, payload: { invKey: 'wood_pine' } },
    { type: 'cook_request', why: 'no such fish in the bag (answered only by the delta)', set: (p) => { p.inventory = {}; }, payload: { fishKey: 'fish_trout', kind: 'cooked', taps: [] },
      ok: (p) => { p.inventory = { fish_trout: 1 }; },
      known: ['_handleCookRequest', 'if ((ps.inventory[fishKey] || 0) <= 0)'] },
    /* v2.3.4882: the purses answer now */
    { type: 'gamble_request', why: 'a wager above the purse', set: (p) => { p.coins = 5; }, payload: { wager: 100 } },
    { type: 'jackpot_deposit', why: 'a deposit above the purse', set: (p) => { p.coins = 0; }, payload: { amount: 100 } },
    { type: 'ace_flip_request', why: 'a stake whose loss is above the purse', set: (p) => { p.coins = 0; p._lastAceFlipAt = 0; }, payload: { stake: 1000 } },
    { type: 'ace_item_flip_request', why: 'none of the staked items in the bag', set: (p) => { p.inventory = {}; p._lastAceFlipAt = 0; }, payload: { items: { ore_copper_ore: 3 } } },
    /* v2.3.4883: the weapon stash answers now */
    { type: 'sell_weapon', why: 'no weapon at that stash place', set: (p) => { p.weaponStash = [{ name: 'Old Sword', type: 'sword', gearBase: 'bronze', tierMult: 1 }]; }, payload: { stashIdx: 3 } },
    { type: 'equip_request', why: 'no weapon at that stash place', set: (p) => { p.weaponStash = []; }, payload: { stashIdx: 2, slot: 'weapon' } },
    { type: 'unequip_request', why: 'the weapon bag is full', set: (p) => { p.weapon = { name: 'copper greatsword', type: 'greatsword', gearBase: 'copper', tierMult: 1 }; p.weaponStash = Array.from({ length: R.WEAPON_STASH_CAP }, () => ({ name: 'Old Sword', type: 'sword', gearBase: 'bronze', tierMult: 1 })); }, payload: { slot: 'weapon' } },
    /* v2.3.4881: the points, the chest, the capes and the reroll answer now */
    { type: 'stat_allocate', why: 'no stat point to spend', set: (p) => { p.unspentT2 = 0; }, payload: { stat: 'power' } },
    { type: 'chest_open', why: 'no chest in the bag', set: (p) => { p.inventory = {}; }, payload: { invKey: 'daily_chest', opId: 'door-1' } },
    { type: 'prog3_allocate', why: 'no shared point to spend', set: (p) => { if (p.prog3) { p.prog3.pool = 0; p.prog3.shared = 0; p.prog3.poolBy = { sword: 0, bow: 0, staff: 0 }; } }, payload: { stat: 'def' } },
  ];
  const results = [];
  const ask = async (type, payload) => {
    T += 60_000;
    ps.dead = false; ps.dying = false; ps.disconnected = false;
    /* the phone holds the true state: the delta's baseline is today's */
    R._sendPlayerState(ws, ID);
    ws.sent.length = 0;
    await R.webSocketMessage(ws, JSON.stringify({ type, payload }));
    await new Promise((r) => setTimeout(r, 5));
    return ws.sent.map((m) => m.type);
  };
  for (const row of ROWS) {
    row.set(ps);
    const got = await ask(row.type, row.payload);
    results.push(row.type + ': ' + (got.join(',') || '(nothing)'));
    if (!row.known) {
      check(`5: ${row.type} refused (${row.why}) answers the phone`, got.length > 0, got);
    } else {
      const [unit, key] = row.known;
      const line = ALLOW[unit] && ALLOW[unit][key];
      check(`5: ${row.type} refused (${row.why}) is the listed silence ${unit}: ${key}`, typeof line === 'string' && /^(known|delta)\b/.test(line), line);
      check(`5: ${row.type} is still silent (answered now? take its line off the list)`, got.length === 0, got);
      /* the control: the same request once the state allows it IS answered,
         so the silence above was that guard's and not an earlier one's */
      row.ok(ps);
      const okGot = await ask(row.type, row.okPayload || row.payload);
      check(`5: ...and allowed, the same ${row.type} is answered (the silence was that guard's)`, okGot.length > 0, okGot);
    }
  }
  console.log('     driven: ' + results.join(' | '));
  Date.now = REAL_NOW;
}

if (failures) { console.log(`\n${failures} TEST(S) FAILED`); process.exit(1); }
console.log('\nrefusal-door: all passed');
