/* ═══ v2.3.5185: THE ACTION DOOR HOLDS (grand plan step 5.8; card K PR 5) ═══
 *
 * src/game/actions.js is the one way a request leaves the page: one row a
 * request, its way (alone, priority, the 33 ms batch, a rider, a route...)
 * and its flags, and act(), which makes a value request's id.  The page's
 * channel shim (wsClient.js, system wire) is its transport and reads the
 * rows: its pass-through, PRIORITY_EVENTS and SETTLED_SENDS were three lists
 * kept by hand (TRAPS §18: a type the pass-through forgot was dropped in
 * silence).  The door never imports the worker's table (it would carry every
 * row and its notes into a phone's memory), so this guard holds the two
 * together.  It fails:
 *
 *   1. a door row that is not an `in`, `relay` or `http` row of the wire
 *      table (server/src/wire/), but a `legacy` row: a type sent for an
 *      older worker, an `out` row today's worker drops;
 *   2. a type, event or route the page sends (a literal in src/: a
 *      `.send({ type: 'x'`, a broadcast's `event: 'x'`, an `act('x'`, a
 *      fetch of '/api/...') with no row;
 *   3. a row whose `req` is not its table row's: a request that moves value
 *      out or cannot be undone (`doesWhat` holds `value-out` or `final`) gets
 *      a request id, and no other does;
 *   4. a list of the shim's kept by hand again (a `msg.type === '<name>'`
 *      pass-through, a literal PRIORITY_EVENTS or SETTLED_SENDS);
 *   5. act() not taking each way as the shim does: a direct type in its
 *      `payload` (or at the top, `body: 'top'`), an event as a broadcast, a
 *      route with its method and the session's token, a request id on a
 *      `req` row in SHAPES' form, a name with no row refused and counted;
 *   6. (v2.3.5185, card K PR 5 ONLY: PR 7's first takes it out) a name whose
 *      way is not today's: TODAY below is the shim's way for each name as it
 *      stood on main 82fb78d, made from its source once;
 *   7. THE CENSUS (the plan's rule 3): a send to the socket (`channel.send(`)
 *      or a fetch of '/api/' anywhere but the door, counted against LINE.
 *      It only falls: card K's PR 7 moves the page's sends to act(), a
 *      family a PR.  The exceptions, named: src/debug/crashTrap.js and
 *      src/networking/index.js (they run before a session), and wsClient.js's
 *      fetch of /api/lobby (the connection's own).
 *
 * BREAK PROOF (rule 8), each tried by hand 2026-11-14:
 *   1. src/game/chat.js: `S.channel.send({ type: 'zz_probe' })`          -> FAIL 2 (and 7)
 *   2. src/game/actions.js: `cape_redeem: A('alone', { req: 1 })` -> no req -> FAIL 3
 *   3. the shim (wsClient.js): `if (msg.type === 'zz_probe') { wsOut(msg); return; }` in the shim -> FAIL 4
 *   4. src/game/actions.js: `stunned: A('priority')` -> A('batch')    -> FAIL 6
 *   5. src/game/actions.js: `item_drop`'s `body: 'top'` taken off      -> FAIL 2b (v2.3.5185, sitting 14)
 *
 * Run from the repository's root: node tools/guards/action-door.test.mjs
 * (cd server && npm test runs it with every other guard).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { filesOf } from './lib/filesOf.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = (f) => readFileSync(join(ROOT, f), 'utf8');
let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 700)));
};

const D = await import(new URL('../../src/game/actions.js', import.meta.url));
const { ACTIONS, ENV_OF_WAY, REQ_ID_RE } = D;
const W = (f) => new URL('../../server/src/wire/' + f, import.meta.url);
const { WIRE_IN } = await import(W('in.js'));
const { WIRE_RELAY } = await import(W('relays.js'));
const { WIRE_OUT } = await import(W('out.js'));
const { WIRE_HTTP } = await import(W('http.js'));
const TAKES = new Map([...WIRE_IN, ...WIRE_RELAY, ...WIRE_HTTP].map((r) => [r.name, r]));
const OUT = new Set(WIRE_OUT.map((r) => r.name));
const names = Object.keys(ACTIONS);

/* ── 1. every row is a row of the table ── */
{
  const off = names.filter((n) => !TAKES.has(n) && !(ACTIONS[n].legacy && OUT.has(n)));
  const legacyWrong = names.filter((n) => ACTIONS[n].legacy && TAKES.has(n));
  check(`1: every door row (${names.length}) is an in, relay or http row of the wire table (or a legacy out row)`, off.length === 0 && legacyWrong.length === 0, { off, legacyWrong });
  const ways = names.filter((n) => !Object.prototype.hasOwnProperty.call(ENV_OF_WAY, ACTIONS[n].way));
  check('1: every row\'s way is one of the door\'s', ways.length === 0, ways);
  const http = names.filter((n) => ACTIONS[n].way === 'http');
  const badHttp = http.filter((n) => !/^http:\//.test(n) || !/^(GET|POST|DELETE)$/.test(ACTIONS[n].method || '') || !/^\/api\//.test(ACTIONS[n].path || ''));
  check(`1: every route row (${http.length}) is named http:/..., with its method and path`, badHttp.length === 0, badHttp);
}

/* ── 2. what the page sends, each a row ── */
const files = [];
const walk = (d) => { for (const e of readdirSync(join(ROOT, d), { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) walk(p); else if (/\.(js|jsx|mjs)$/.test(e.name)) files.push(p); } };
walk('src');
const SRC = new Map(files.map((f) => [f, read(f)]));
const lineOf = (s, i) => s.slice(0, i).split('\n').length;
const sent = new Map();   /* name -> where */
const note = (n, f, s, i) => { if (!sent.has(n)) sent.set(n, f + ':' + lineOf(s, i)); };
for (const [f, s] of SRC) {
  if (f === 'src/game/actions.js') continue;
  for (const m of s.matchAll(/\.send\(\s*\{\s*type:\s*'([a-z_0-9]+)'/g)) if (m[1] !== 'broadcast') note(m[1], f, s, m.index);
  for (const m of s.matchAll(/type:\s*'broadcast',\s*event:\s*'([a-z_0-9]+)'/g)) note(m[1], f, s, m.index);
  if (/import\s*\{[^}]*\bact\b[^}]*\}\s*from\s*'[^']*actions\.js'/.test(s)) for (const m of s.matchAll(/\bact\(\s*'([^']+)'/g)) note(m[1], f, s, m.index);
}
/* a fetch of a route: its path, matched to the row that answers it */
const routeRows = names.filter((n) => ACTIONS[n].way === 'http');
const fetches = [];
for (const [f, s] of SRC) {
  for (const m of s.matchAll(/fetch\(([^\n]{0,200})/g)) {
    const pm = /'(\/api\/[a-z_/]*)/.exec(m[1]) || (/fetch\(\(u, i\)/.test(m[0]) ? /'\/api\/store'/.exec(m[1]) : null);
    if (!pm && !/\/api\//.test(m[1])) continue;
    fetches.push({ f, line: lineOf(s, m.index), path: pm ? pm[1] : null });
  }
}
/* the shim's file, found by what it holds among the wire system's files, never
   by its path (tests-by-system: a big file is read by system) */
const SHIM_FILE = filesOf('wire').find((f) => SRC.has(f) && SRC.get(f).includes('var channelShim = {'));
const EXCEPT = (x) => x.f === 'src/debug/crashTrap.js' || x.f === 'src/networking/index.js' || (x.f === SHIM_FILE && x.path === '/api/lobby');
{
  const missing = [...sent].filter(([n]) => !Object.prototype.hasOwnProperty.call(ACTIONS, n)).map(([n, w]) => n + ' (' + w + ')');
  check(`2: every type and event the page sends by name (${sent.size}) has a row`, missing.length === 0, missing);
  const routeless = fetches.filter((x) => !EXCEPT(x) && x.path && x.path !== '/api/store' && !routeRows.some((n) => ACTIONS[n].path === x.path.replace(/\/$/, '') || ACTIONS[n].path.startsWith(x.path.replace(/\/$/, '') + '/')));
  check(`2: every route the page fetches (${fetches.length}, less the exceptions) has a row`, routeless.length === 0, routeless.map((x) => x.path + ' (' + x.f + ':' + x.line + ')'));
}

/* ── 2b (v2.3.5185, the gatekeeper's note, sitting 14). a direct send the
   page writes with its fields at the message's top (`{ type: 'x', k: ... }`,
   k not `payload`) is a `body: 'top'` row, so act() sends it the same way
   (item_drop and report were not) ── */
{
  const topless = [];
  for (const [f, s] of SRC) {
    if (f === 'src/game/actions.js') continue;
    /* block comments blanked first, line for line (a comment may sit between `{` and `type`) */
    const sc = s.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
    for (const m of sc.matchAll(/\{\s*type:\s*'([a-z_0-9]+)',\s*([A-Za-z_$][\w$]*)\s*[:,}]/g)) {
      const r = Object.prototype.hasOwnProperty.call(ACTIONS, m[1]) ? ACTIONS[m[1]] : null;
      if (!r || ENV_OF_WAY[r.way] !== 'direct' || m[2] === 'payload' || r.body === 'top') continue;
      topless.push(m[1] + ' (' + f + ':' + lineOf(s, m.index) + ', `' + m[2] + '` at the top)');
    }
  }
  check('2b: a direct send written with its fields at the top is a `body: \'top\'` row', topless.length === 0, topless);
}

/* ── 3. a request id exactly where the table says value goes out or cannot come back ── */
{
  const wrong = names.filter((n) => {
    const r = ACTIONS[n];
    if (r.way === 'own' || r.legacy) return !!r.req;
    const t = TAKES.get(n);
    const want = !!(t && (t.doesWhat.includes('value-out') || t.doesWhat.includes('final')));
    return !!r.req !== want;
  });
  check(`3: every row's req is its table row's (value-out or final): ${names.filter((n) => ACTIONS[n].req).length} rows`, wrong.length === 0, wrong);
}

/* ── 4. the shim keeps no list by hand ── */
{
  const ws = SHIM_FILE ? SRC.get(SHIM_FILE) : '';
  const from = ws.indexOf('var channelShim = {'), to = ws.indexOf('track: function track(', from);
  const shim = from >= 0 && to > from ? ws.slice(from, to) : '';
  const literal = [...shim.matchAll(/msg\.type === '([a-z_0-9]+)'/g)].map((m) => m[1]).filter((t) => t !== 'broadcast' && t !== 'node_strike');
  check('4: the shim\'s pass-through is the door\'s rows (no `msg.type === \'<name>\'` kept by hand)', shim.length > 0 && literal.length === 0 && /actionWay\(msg\.type\)/.test(shim), literal);
  check('4: PRIORITY_EVENTS and SETTLED_SENDS are made from the rows', /var PRIORITY_EVENTS = namesOfWay\('priority'\);/.test(ws) && /var SETTLED_SENDS = settledSends\(\);/.test(ws));
}

/* ── 5. act() takes each way as the shim does ── */
{
  const sentOut = [];
  D.setActionTransport({ send: (m) => { sentOut.push(m); return true; }, http: (path, init) => { sentOut.push({ path, init }); return 'http'; }, token: () => 'tok' });
  const before = D.doorCounts().total;
  const ok = [];
  D.act('cape_equip', { on: true }); ok.push(JSON.stringify(sentOut.pop()) === JSON.stringify({ type: 'cape_equip', payload: { on: true } }));
  D.act('dice', { kind: 'flip' }); ok.push(JSON.stringify(sentOut.pop()) === JSON.stringify({ kind: 'flip', type: 'dice' }));
  D.act('emote', { e: 1 }); ok.push(JSON.stringify(sentOut.pop()) === JSON.stringify({ type: 'broadcast', event: 'emote', payload: { e: 1 } }));
  D.act('cape_redeem', { code: 'x' }); const red = sentOut.pop(); ok.push(red.type === 'cape_redeem' && REQ_ID_RE.test(red.payload.reqId) && red.payload.code === 'x');
  D.act('http:/api/store/buy', { listingId: 'L' }, { query: 'room=brotown-1' }); const h = sentOut.pop();
  ok.push(h.path === '/api/store/buy?room=brotown-1' && h.init.method === 'POST' && h.init.headers['x-bt-auth'] === 'tok' && REQ_ID_RE.test(JSON.parse(h.init.body).reqId));
  ok.push(D.act('join', {}) === false && D.act('zz_no_row', {}) === false && sentOut.length === 0 && D.doorCounts().total === before + 2);
  ok.push([1, 2, 3].map(() => D.makeReqId()).every((r, i, a) => REQ_ID_RE.test(r) && a.indexOf(r) === i));
  check('5: act() sends each way as the shim does, makes a request id in SHAPES\' form on a req row, and refuses (counts) a name with no row', ok.every(Boolean), ok);
}

/* ── 6. today's way for every name (card K PR 5 only) ──
   The shim's way for each name, from main 82fb78d's wsClient.js: its
   pass-through chain (alone; monster_damage `claim`; loot_pickup and
   ability `aftermove`), PRIORITY_EVENTS, SETTLED_SENDS, and its broadcast
   tail (move, player_attack, gather_node; every other event the batch). */
{
  const TODAY_ALONE = 'cape_redeem cape_equip chest_open loginspin_ask loginspin_go loginspin_double loginspin_collect rewards_get daily_spin daily_reroll season_claim smelt_bar farm_open farm_act farm_buy farm_order make_hardened_wood race_start ride rest_request bank_open bank_deposit bank_withdraw heap_burn make_traps trap_arm pet_active pet_name pet_release pet_house_buy forge_armor smith_salvage essence_apply reveal_item shield_wear pose dice item_drop achv_title fish_inspect fish_board_request spin_board_request acc_request rise_chest_open shield_gem weapon_gem shard_crack gem_combine map_watch nml_attack nml_lock_ask nml_lock_allow alliance_name alliance_war alliance_board potion_drink extraction_start node_strike arrow_blast shop_list shop_sell shop_buy shop_quote store_offer store_offer_cancel store_offer_reply store_dm store_dm_open stat_allocate prog3_allocate points_reset cook_request stats_update ability_use eat_request element_burst gem_cut_request amulet_forge_request build_point_earned firemaking_request shop_purchase cook_recipe equip_request unequip_request sell_weapon forge_weapon quest_accept character_reset quest_turn_in set_active_slot report'.split(' ');
  const TODAY_PRIORITY = 'pvp_confirmed stunned duel_accept duel_decline duel_wager_request pvp_threat threat_response trade_offer trade_accept trade_reject clan_war_kill clan_war_end clan_war_declare clan_invite trade2_open trade2_set trade2_ready trade2_confirm trade2_cancel trade2_stage_weapon trade2_unstage_weapon trade2_pets party_invite party_accept party_decline party_leave party_kick party_chat clan_leave area_chat whisper'.split(' ');
  const TODAY_SETTLED = 'node_strike extraction_start prog3_allocate stat_allocate cook_request farm_open farm_act farm_buy farm_order'.split(' ');
  const today = new Map();
  for (const n of TODAY_ALONE) today.set(n, 'alone');
  today.set('monster_damage', 'claim'); today.set('loot_pickup', 'aftermove'); today.set('ability', 'aftermove');
  for (const n of TODAY_PRIORITY) today.set(n, 'priority');
  today.set('move', 'move'); today.set('player_attack', 'attack'); today.set('gather_node', 'rider');
  const todayOf = (n) => (today.has(n) ? today.get(n) : null);
  /* every name the door or today knows; an event today knows is the batch,
     a direct type it does not is dropped: the door's `batch` and no row */
  const all = new Set([...names, ...today.keys(), ...sent.keys()]);
  const diff = [];
  for (const n of all) {
    const r = ACTIONS[n];
    if (r && (r.way === 'own' || r.way === 'http')) continue;
    const t = todayOf(n) || (r && r.way === 'batch' ? 'batch' : null);
    const d = r ? r.way : null;
    if (t !== d) diff.push(n + ': today ' + t + ', door ' + d);
    if (!!(r && r.settled) !== TODAY_SETTLED.includes(n)) diff.push(n + ': settled today ' + TODAY_SETTLED.includes(n));
  }
  check(`6: every name takes today's way through the door (${all.size} names: ${TODAY_ALONE.length + 3} alone, ${TODAY_PRIORITY.length} priority, the batch, the rest)`, diff.length === 0, diff);
}

/* ── 7. the census: sends and fetches outside the door ── */
const LINE = { sends: 203, fetches: 25 };
{
  let sends = 0; const byFile = new Map();
  for (const [f, s] of SRC) {
    if (f === 'src/game/actions.js') continue;
    const n = (s.match(/channel\.send\(/g) || []).length;
    if (n) { sends += n; byFile.set(f, n); }
  }
  const fx = fetches.filter((x) => !EXCEPT(x) && x.f !== 'src/game/actions.js').length;
  check(`7: sends outside the door (${sends}, in ${byFile.size} files) are at or under the line (${LINE.sends})`, sends <= LINE.sends, sends);
  check(`7: fetches of /api/ outside the door (${fx}) are at or under the line (${LINE.fetches})`, fx <= LINE.fetches, fx);
  if (sends < LINE.sends || fx < LINE.fetches) console.log(`NOTE the census fell (sends ${sends}, fetches ${fx}): lower LINE in this guard in the PR that moved them`);
}
process.exit(failed ? 1 : 0);
