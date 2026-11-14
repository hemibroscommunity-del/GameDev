/* ═══ v2.3.5062: THE WIRE TABLE HOLDS TO THE CODE (grand plan 4.1; card N) ═══
 *
 * server/src/wire/ is one row for every message a phone and the worker trade
 * and every HTTP route (card N's PR 2, from card C's census).  v2.3.5181
 * (card K, step 4.1 step 2): the worker's lists are MADE from it
 * (server/src/wire/lists.js): PRIVILEGED_EVENTS from the `out` rows,
 * RELAY.TYPES from the `relay` rows, wire-audit's echo list from the rows
 * marked `privileged: 'echo'`; wire-audit.test holds the `out` rows to every
 * type the worker sends.  This guard keeps the rest true.  It counts every
 * key from the code, as the census's part 8 counted it, and fails:
 *
 *   1. a key with no row: a case of the router (`_onMessage`'s switch); and
 *      a list the worker keeps by hand beside a made one (a literal
 *      PRIVILEGED_EVENTS, RELAY.TYPES or echo list: "never both");
 *   2. a row with no key;
 *   3. two rows for one name and direction;
 *   4. a value off its column's closed list (server/src/wire/columns.js;
 *      a drop's code from server/test/refusal-door-list.mjs CODES);
 *   5. a case of the phone's direct switch (wsClient.js `ws.onmessage`)
 *      that is not the name of an `out` or `relay` row; and an `out` row
 *      whose `at` names the other switch;
 *   6. THE HTTP ROUTES: a lister finds every path a handler tests (`path ===`,
 *      `!==`, `.startsWith(` with a '/...' literal, in the files the
 *      census's part 2.4 names, each under its mount); a path with no row
 *      fails, and a route row whose path no handler tests fails unless its
 *      `at` says `(fall-through)` (a handler's last answer, or a gate before
 *      any route: the lister does not look for those).
 *
 *   7. (v2.3.5181, card K PR 1 only: PR 2 takes it out) a made list that is
 *      not today's: TODAY below is each list as it stood on main 9fd5e58,
 *      written by hand in the one place it may be, for one PR;
 *   8. a row added to the table that does not reach its list with no other
 *      edit (`wireLists` with a probe row of each kind).
 *
 * The plan's rule 3 (a census table fails only when its count of unlisted
 * things rises): that count is 0 today, so any key with no row fails.  A new
 * message, a new relay, a new route lands WITH its row in server/src/wire/.
 *
 * BREAK PROOF (rule 8), each tried by hand, 2026-11-14:
 *   1. server/src/index.js: a `case 'zz_probe':` above `case 'pose':`  -> FAIL 1
 *   2. server/src/wire/in.js: `name: 'pose'` -> `name: 'posex'`         -> FAIL 1 and 2
 *   3. server/src/wire/out.js: a copy of the `tick` row                 -> FAIL 3
 *   4. server/src/wire/in.js: the first `mayStart: 'never-helper'` -> 'robot' -> FAIL 4
 *   5. the phone's wsClient.js: a `case 'zz_probe':` above `case 'tick':` -> FAIL 5
 *   6. server/src/market.js: `if (request.method === 'GET' && path.startsWith('/zz')) {}` -> FAIL 6
 *   7. server/src/wire/out.js: a note `"the phone reads type: 'tick'"` on a row -> FAIL 4
 *      (v2.3.5062, the gatekeeper's review: tried by hand, 2026-11-14)
 *   8. server/src/index.js: `export const PRIVILEGED_EVENTS = new Set(['tick']);`
 *      for its import from ./wire/lists.js                                 -> FAIL 1
 *   9. server/src/wire/out.js: `privileged: 'echo',` on the `tick` row     -> FAIL 4 (no echo note), 7 and 8
 *  10. server/src/wire/lists.js: `out.filter((r) => !isEcho(r))` -> `out.filter((r) => isEcho(r))` -> FAIL 2, 7 and 8
 *      (v2.3.5181: 8 to 10 tried by hand, 2026-11-14)
 *
 * Run from the repository's root: node tools/guards/wire-table.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { readSystem } from './lib/filesOf.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = (f) => readFileSync(join(ROOT, f), 'utf8');
let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail)));
};
/* Comments out, one pass, line numbers kept: a quoted name in a comment is
   not a key, and a `//` comment that says `/api/market/*` must not open a
   block comment.  Strings are kept (they are the keys). */
function stripC(s) {
  let out = '', i = 0, q = null;
  while (i < s.length) {
    const c = s[i], d = s[i + 1];
    if (q) { out += c; if (c === '\\') { out += d || ''; i += 2; continue; } if (c === q) q = null; i++; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; out += c; i++; continue; }
    if (c === '/' && d === '/') { while (i < s.length && s[i] !== '\n') { out += ' '; i++; } continue; }
    if (c === '/' && d === '*') { const e = s.indexOf('*/', i + 2); const end = e < 0 ? s.length : e + 2; out += s.slice(i, end).replace(/[^\n]/g, ' '); i = end; continue; }
    out += c; i++;
  }
  return out;
}

const W = (f) => new URL('../../server/src/wire/' + f, import.meta.url);
const { WIRE_COLUMNS: C } = await import(W('columns.js'));
const { WIRE_IN } = await import(W('in.js'));
const { WIRE_RELAY } = await import(W('relays.js'));
const { WIRE_OUT } = await import(W('out.js'));
const { WIRE_HTTP } = await import(W('http.js'));
const { CODES } = await import(new URL('../../server/test/refusal-door-list.mjs', import.meta.url));
const ROWS = [...WIRE_IN, ...WIRE_RELAY, ...WIRE_OUT, ...WIRE_HTTP];
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/* ── the keys, from the code ── */
/* a switch's cases: every `case '<type>':` one indent in from the
   `switch (msg.type) {` that follows `start`, up to its `default:`, in the
   file of the `wire` system that holds `start` (read by system, never by a
   path: v2.3.5062, card B's tests-by-system) */
function switchCases(start) {
  for (const [file, src] of readSystem('wire', { only: /\.m?jsx?$/ })) {
    const lines = src.split('\n');
    const at = lines.findIndex((l) => start.test(l));
    if (at < 0) continue;
    const sw = lines.findIndex((l, i) => i > at && /switch \(msg\.type\) \{/.test(l));
    if (sw < 0) continue;
    const ind = /^(\s*)/.exec(lines[sw])[1].length + 2;
    const caseRe = new RegExp('^ {' + ind + "}case '([a-z0-9_]+)':");
    const endRe = new RegExp('^ {' + ind + '}default:');
    const out = [];
    let i = sw + 1;
    for (; i < lines.length && !endRe.test(lines[i]); i++) { const m = caseRe.exec(lines[i]); if (m) out.push(m[1]); }
    return { file, cases: out, found: i < lines.length };
  }
  return { file: null, cases: [], found: false };
}
/* v2.3.5181: the worker's lists, as lists.js makes them from the rows */
const { wireLists, PRIVILEGED_EVENTS: MADE_PRIV, RELAY_TYPES: MADE_RELAY, RELAY_ECHOES: MADE_ECHOES } = await import(W('lists.js'));
const router = switchCases(/^ {2}async _onMessage\(/);
const PRIV = [...MADE_PRIV];
const RELAY = [...MADE_RELAY];
const echoes = [...MADE_ECHOES.keys()];
const OUT_EXTRA = echoes.filter((t) => !RELAY.includes(t));
const direct = switchCases(/ws\.onmessage\s*=/);
check('0: the counts read (the router\'s switch, the two lists, the echo list, the phone\'s switch)',
  router.found && router.cases.length > 100 && PRIV.length > 100 && RELAY.length > 10 && echoes.length > 3 && direct.found && direct.cases.length > 50,
  { router: router.cases.length, priv: PRIV.length, relay: RELAY.length, echoes: echoes.length, direct: direct.cases.length });

/* ── 1. never both: the worker's lists are the made ones, and no list is
   written by hand beside them (v2.3.5181; the card's reading: "the old
   literal goes in the PR that makes it") ── */
{
  const idx = stripC(read('server/src/index.js')), rel = stripC(read('server/src/relay.js'));
  const audit = stripC(read('server/test/wire-audit.test.mjs'));
  const byHand = [];
  if (/PRIVILEGED_EVENTS\s*=\s*new Set\(/.test(idx)) byHand.push('index.js: PRIVILEGED_EVENTS = new Set(');
  if (!/import \{[^}]*\bPRIVILEGED_EVENTS\b[^}]*\} from '\.\/wire\/lists\.js'/.test(idx)) byHand.push('index.js: PRIVILEGED_EVENTS not taken from ./wire/lists.js');
  if (/TYPES:\s*Object\.freeze\(new Set\(/.test(rel) || !/TYPES:\s*Object\.freeze\(RELAY_TYPES\)/.test(rel)) byHand.push('relay.js: RELAY.TYPES is not lists.js\'s RELAY_TYPES');
  if (/RELAY_ECHO_ALLOWLIST\s*=\s*new Map\(/.test(audit) || !/RELAY_ECHO_ALLOWLIST\s*=\s*RELAY_ECHOES\b/.test(audit)) byHand.push('wire-audit.test: RELAY_ECHO_ALLOWLIST is not lists.js\'s RELAY_ECHOES');
  check('1: the worker\'s lists are the ones server/src/wire/lists.js makes from the table, and none is written by hand beside it', byHand.length === 0, byHand);
}

const KEYS = { in: router.cases, relay: RELAY, out: [...PRIV, ...OUT_EXTRA] };
const socketRows = { in: WIRE_IN, relay: WIRE_RELAY, out: WIRE_OUT };

/* ── 1, 2. every key a row, every row a key ── */
for (const dir of ['in', 'relay', 'out']) {
  const names = new Set(socketRows[dir].map((r) => r.name));
  const keys = new Set(KEYS[dir]);
  check(`1: every ${dir} key has a row (${keys.size} keys)`, [...keys].every((k) => names.has(k)), [...keys].filter((k) => !names.has(k)));
  check(`2: every ${dir} row has a key`, [...names].every((n) => keys.has(n)), [...names].filter((n) => !keys.has(n)));
  check(`2: every row of WIRE_${dir.toUpperCase()} says dir '${dir}'`, socketRows[dir].every((r) => r.dir === dir), socketRows[dir].filter((r) => r.dir !== dir).map((r) => r.name));
}
check('2: every HTTP row is an in row named http:/...', WIRE_HTTP.every((r) => r.dir === 'in' && /^http:\//.test(r.name) && r.envelope === 'http'),
  WIRE_HTTP.filter((r) => !(r.dir === 'in' && /^http:\//.test(r.name) && r.envelope === 'http')).map((r) => r.name));

/* ── 3. one row a key ── */
{
  const seen = new Map(), twice = [];
  for (const r of ROWS) { const k = r.name + ' ' + r.dir; if (seen.has(k)) twice.push(k); seen.set(k, r); }
  check(`3: one row for each name and direction (${ROWS.length} rows)`, twice.length === 0, twice);
}

/* ── 4. the closed lists ── */
{
  const bad = [];
  const e = (r, m) => bad.push(r.name + ' [' + r.dir + ']: ' + m);
  const arr = (v) => (Array.isArray(v) ? v : [v]);
  const answers = new Set([...C.answer, ...KEYS.in, ...KEYS.out, ...KEYS.relay]);   /* any row's name: ping is answered by pong */
  for (const r of ROWS) {
    const keys = Object.keys(r);
    const want = C.ORDER.filter((k) => !C.OPTIONAL.includes(k) || own(r, k));
    if (keys.join() !== want.join()) e(r, 'columns ' + keys.join());
    /* v2.3.5181: the machine's `privileged` column (lists.js), on an out or
       relay row only, and an echo says why in a note that opens `echo: ` */
    if (own(r, 'privileged')) {
      if (!(r.dir === 'out' || r.dir === 'relay') || !C.privileged.includes(r.privileged)) e(r, 'privileged ' + r.privileged);
      if (r.privileged === 'echo' && !(Array.isArray(r.note) && r.note.some((n) => typeof n === 'string' && /^echo: \S/.test(n)))) e(r, 'privileged echo with no `echo: ` note saying why');
    }
    if (!C.dir.includes(r.dir)) e(r, 'dir ' + r.dir);
    if (typeof r.at !== 'string' || !r.at) e(r, 'at');
    const many = r.dir === 'out';
    for (const [col, list] of [['wayIn', C.wayIn], ['envelope', C.envelope[r.dir] || []]]) {
      if (Array.isArray(r[col]) && !many) e(r, col + ' is a list');
      for (const v of arr(r[col])) if (!list.includes(v)) e(r, col + ' ' + v);
    }
    if (!Array.isArray(r.phase) || !r.phase.length) e(r, 'phase');
    else if (r.phase.includes(C.phase.NONE)) { if (r.phase.length !== 1) e(r, 'phase: none checked and more'); }
    else for (const p of r.phase) {
      const m = /^([a-z]+):(!?)([a-z]+)$/.exec(p);
      const states = m && (Array.isArray(C.phase[m[1]]) ? C.phase[m[1]] : own(C.phase.IMPLICIT, m[1]) ? C.phase.IMPLICIT[m[1]] : null);
      if (!states || !states.includes(m[3])) e(r, 'phase ' + p);
    }
    if (!C.mayStart.includes(r.mayStart)) e(r, 'mayStart ' + r.mayStart);
    if (!Array.isArray(r.doesWhat) || !r.doesWhat.length || r.doesWhat.some((d) => !C.doesWhat.includes(d))) e(r, 'doesWhat ' + r.doesWhat);
    if (!(C.reqId.includes(r.reqId) || C.REQ_FIELD.test(r.reqId))) e(r, 'reqId ' + r.reqId);
    if (!r.trust || typeof r.trust !== 'object' || Array.isArray(r.trust)) e(r, 'trust');
    else for (const k of Object.keys(r.trust)) if (!(C.trust.includes(r.trust[k]) || C.TRUST_BOUNDED.test(r.trust[k]))) e(r, 'trust ' + k + ' ' + r.trust[k]);
    if (typeof r.absent !== 'string') e(r, 'absent');
    else for (const cl of r.absent.split('; ')) if (!C.absent.some((a) => cl === a || cl.startsWith(a + ': '))) e(r, 'absent: ' + cl);
    if (!Array.isArray(r.bad)) e(r, 'bad');
    else for (const b of r.bad) { const m = /^dropped:(\w+)$/.exec(b); if (!(C.bad.includes(b) || (m && own(CODES, m[1])))) e(r, 'bad ' + b); }
    for (const a of arr(r.answer)) if (!answers.has(a)) e(r, 'answer ' + a);
    if (own(r, 'note') && (!Array.isArray(r.note) || !r.note.length || !r.note.every((n) => typeof n === 'string' && n))) e(r, 'note');
  }
  check('4: every value is on its column\'s closed list (columns.js; CODES)', bad.length === 0, bad.slice(0, 20));
}

/* ── 4b. the table reads to wire-audit as data, never as a send ──
   v2.3.5062 (the gatekeeper's review, sitting 4): wire-audit gathers every
   `type: '<name>'` and `_xxxSend(x, '<name>'` in server/src as a message the
   worker sends.  A field named `type` is written quoted (`'type':`), but a
   note quoting `type: 'tick'` would add a send nobody makes, and could let
   that suite pass for a type nothing sends. */
{
  const said = [];
  for (const [file, src] of readSystem('wire', { only: /^server\/src\/wire\// })) {
    src.split('\n').forEach((ln, i) => {
      if (/\btype:\s*['"][a-z_0-9]+['"]/.test(ln) || /_[A-Za-z0-9]+Send\([^,)]+,\s*'[a-z_0-9]+'/.test(ln)) said.push(file + ':' + (i + 1));
    });
  }
  check('4: no line of the table reads to wire-audit as a message sent (`type: \'<name>\'`, `_xxxSend(x, \'<name>\'`)', said.length === 0, said);
}

/* ── 5. the phone's direct switch ── */
{
  const outOrRelay = new Set([...WIRE_OUT, ...WIRE_RELAY].map((r) => r.name));
  check(`5: every case of the phone's direct switch (${direct.cases.length}) is an out or relay row`, direct.cases.every((c) => outOrRelay.has(c)), direct.cases.filter((c) => !outOrRelay.has(c)));
  const dset = new Set(direct.cases);
  const wrong = WIRE_OUT.filter((r) => /; phone: wsClient direct$/.test(r.at) !== dset.has(r.name)).map((r) => r.name);
  check('5: an out row\'s `at` names the phone\'s switch that takes it (direct, or processGameEvent)', wrong.length === 0, wrong);
}

/* ── 6. the HTTP routes ── */
/* The files the census's part 2.4 names, each under its mount (index.js
   tests whole paths; the rest test what is left after the mount).  The
   retired Marketplace and Arena objects (marketplace.js, arena.js) keep only
   their bindings: no route reaches them, so they are not read. */
const MOUNTS = {
  'server/src/index.js': '', 'server/src/market.js': '/api/market', 'server/src/store.js': '/api/store',
  'server/src/gladiator.js': '/api/arena', 'server/src/account.js': '/api/account', 'server/src/botfp.js': '/api/botstat',
  'server/src/leaderboard.js': '/api/leaderboard', 'server/src/feedback.js': '/api/feedback',
  'server/src/admin.js': '/api/admin', 'server/src/devicelock.js': '/api/admin', 'server/src/liveops.js': '/api/admin',
  'server/src/eventcapes.js': '/api/admin', 'server/src/chainscore.js': '/api/admin', 'server/src/chatmod.js': '/api/admin',
  'server/src/devtools.js': '/api/admin', 'server/src/hidden.js': '/api/admin',
};
const tested = new Map();   // path -> where
for (const [file, mount] of Object.entries(MOUNTS)) {
  const lines = stripC(read(file)).split('\n');
  lines.forEach((ln, i) => {
    const note = (p) => { const full = (mount + p).replace(/\/$/, '') || '/'; if (!tested.has(full)) tested.set(full, file.slice(11) + ':' + (i + 1)); };
    for (const m of ln.matchAll(/\b(?:path|url\.pathname)\s*(?:===|!==)\s*'(\/[^']*)'/g)) note(m[1]);
    for (const m of ln.matchAll(/\b(?:path|url\.pathname)\.startsWith\('(\/[^']*)'\)/g)) note(m[1]);
    /* the worker's own door: a method it answers on any path */
    if (mount === '' && /request\.method === '[A-Z]+'/.test(ln) && !/pathname|\bpath\b/.test(ln)) note('/*');
  });
}
check('6: the lister finds the routes (guard)', tested.size > 60 && tested.has('/api/store/buy') && tested.has('/api/admin/dev/kit'), tested.size);
{
  const pathOf = (name) => name.slice(5).split(' ')[0].replace(/[?#].*$/, '');
  const rowPaths = new Set(WIRE_HTTP.map((r) => pathOf(r.name)));
  /* a path a handler tests has a row: that path, or (a mount) a row below it */
  const orphan = [...tested.keys()].filter((p) => !rowPaths.has(p) && ![...rowPaths].some((q) => q.startsWith(p + '/')));
  check(`6: every path a handler tests has a row (${tested.size} paths)`, orphan.length === 0, orphan.map((p) => p + ' (' + tested.get(p) + ')'));
  const unseen = WIRE_HTTP.filter((r) => !/\(fall-through\)$/.test(r.at) && !tested.has(pathOf(r.name))).map((r) => r.name);
  check('6: every route row is a path a handler tests, or says (fall-through) in its `at`', unseen.length === 0, unseen);
}

/* ── 7. today's lists (v2.3.5181, card K PR 1 ONLY: card K's PR 2 takes this
   copy out, and from then the table's rows are the lists) ──
   Each list as it stood, written by hand on main 9fd5e58 (index.js's
   PRIVILEGED_EVENTS, relay.js's RELAY.TYPES, wire-audit.test's
   RELAY_ECHO_ALLOWLIST), sorted.  The made list equals it: the move changed
   nothing. */
{
  const TODAY = {
    PRIVILEGED_EVENTS: [
      'ability_rejected', 'ability_windup', 'acc_state', 'ace_board', 'ace_flip_result',
      'ace_item_flip_result', 'achv_state', 'alliance_error', 'alliance_rows', 'alliance_war_end',
      'area_chat', 'arena_match_result', 'arena_match_start', 'arena_stake_board',
      'arena_stake_error', 'arena_stake_placed', 'arena_stake_result', 'arena_tournament_complete',
      'arrow_boom', 'bank_state', 'body_place', 'bro_nonce', 'bro_verify_result', 'cape_status',
      'chain_score_recorded', 'character_reset_done', 'character_reset_refused', 'chat_mute_list',
      'chat_report_ack', 'chest_opened', 'clan_error', 'clan_state', 'clan_war_end', 'clan_war_kill',
      'client_off', 'codex_state', 'combat_credit', 'daily_progress', 'dice_roll', 'draw_gather',
      'duel_end', 'duel_resume', 'dungeon_boss', 'dungeon_boss_ability', 'dungeon_complete',
      'dungeon_error', 'dungeon_started', 'dungeon_wave', 'eat_refused', 'element_nova',
      'essence_result', 'farm_state', 'fire_trail', 'firemaking_refused', 'fish_board', 'fish_weight',
      'forge_armor_result', 'free_swing', 'friend_accepted', 'friend_dm', 'friend_dm_backlog',
      'friend_error', 'friend_request_in', 'friend_sync', 'gamble_result', 'gather_hits',
      'gear_locked', 'gem_combine_result', 'gem_cut_result', 'guild_quest_error',
      'guild_quest_result', 'harden_result', 'hardened_wood_result', 'harvest_credit',
      'inbox_delivered', 'item_drop_result', 'item_reveal', 'jackpot_result', 'jackpot_state',
      'join_rejected', 'key_new', 'lifesteal_credit', 'linger_wait', 'loginspin_result',
      'loginspin_round', 'loginspin_state', 'loot_claimed', 'loot_credit', 'loot_despawn',
      'loot_drop', 'loot_pickup_rejected', 'make_traps_result', 'monster_ability', 'monster_attack',
      'monster_hit', 'monster_kill', 'monster_projectile', 'monster_transform', 'move_path',
      'nml_lock', 'nml_lock_ask', 'nml_loss', 'nml_skull', 'nml_take', 'parry', 'party_chat',
      'party_error', 'party_invited', 'party_state', 'pet_capture_result', 'pets_state', 'ping',
      'player_count', 'player_died', 'player_join', 'player_leave', 'player_state', 'player_update',
      'points_reset_result', 'prog3_allocated', 'prog3_level', 'pvp_hit', 'quest_reward_stashed',
      'race_cp', 'race_end', 'race_state', 'rest_result', 'rewards_state', 'ride_state', 'rise_chest',
      'room_full', 'server_announce', 'shard_crack_result', 'shield_gem_result', 'shop_quoted',
      'shop_result', 'shop_state', 'smelt_result', 'smith_salvage_result', 'spar_state', 'spin_board',
      'stat_allocated', 'state_sync', 'store_dm', 'store_dm_error', 'store_dm_thread',
      'store_offer_error', 'store_offer_state', 'test_mode', 'threat_expired', 'threat_penalty',
      'tick', 'trade2_invite', 'trade2_state', 'trap_armed', 'trap_result', 'weapon_gem_result',
      'whisper', 'whisper_error', 'zone_loot', 'zone_monsters', 'zone_nodes', 'zone_state',
    ],
    RELAY_TYPES: [
      'campfire_lit', 'campfire_out', 'chat', 'clan_invite', 'duel_accept', 'duel_decline',
      'duel_request', 'duel_wager_request', 'emote', 'gather_node', 'monster_dmg_at',
      'player_died_to_monster', 'player_dodge', 'player_hurt_by_monster', 'player_jump',
      'player_projectile', 'player_respawned', 'player_shield', 'player_swing', 'pvp_confirmed',
      'pvp_threat', 'stunned', 'threat_response', 'trade_accept', 'trade_offer', 'trade_reject',
    ],
    RELAY_ECHOES: [
      'clan_war_declare', 'duel_decline', 'player_died_to_monster', 'player_dodge',
      'player_projectile', 'player_respawned', 'player_shield', 'player_swing', 'trade_reject',
    ],
  };
  const same = (a, b) => { const x = [...a].sort(), y = [...b].sort(); return x.length === y.length && x.every((v, i) => v === y[i]); };
  const diff = (a, b) => ({ more: [...a].filter((v) => !b.includes(v)), less: b.filter((v) => ![...a].includes(v)) });
  check(`7: PRIVILEGED_EVENTS made from the table is today's (${TODAY.PRIVILEGED_EVENTS.length})`, same(MADE_PRIV, TODAY.PRIVILEGED_EVENTS), diff(MADE_PRIV, TODAY.PRIVILEGED_EVENTS));
  check(`7: RELAY.TYPES made from the table is today's (${TODAY.RELAY_TYPES.length})`, same(MADE_RELAY, TODAY.RELAY_TYPES), diff(MADE_RELAY, TODAY.RELAY_TYPES));
  check(`7: wire-audit's echo list made from the table is today's (${TODAY.RELAY_ECHOES.length})`, same(MADE_ECHOES.keys(), TODAY.RELAY_ECHOES), diff(MADE_ECHOES.keys(), TODAY.RELAY_ECHOES));
}

/* ── 8. a row added to the table reaches its list with no other edit ── */
{
  const probe = (name, dir, extra = {}) => ({ ...WIRE_OUT[0], name, dir, ...extra });
  const L = wireLists({
    out: [...WIRE_OUT, probe('zz_probe_out', 'out'), probe('zz_probe_echo', 'out', { privileged: 'echo', note: ['echo: a probe'] })],
    relay: [...WIRE_RELAY, probe('zz_probe_relay', 'relay')],
  });
  check('8: a new out row is privileged with no other edit (deny by default)', L.PRIVILEGED_EVENTS.has('zz_probe_out') && !MADE_PRIV.has('zz_probe_out'));
  check('8: a new relay row is a type a phone may relay', L.RELAY_TYPES.has('zz_probe_relay') && !L.PRIVILEGED_EVENTS.has('zz_probe_relay'));
  check('8: a row marked echo is on the echo list with its why, and not privileged', L.RELAY_ECHOES.get('zz_probe_echo') === 'a probe' && !L.PRIVILEGED_EVENTS.has('zz_probe_echo'));
  check('8: every echo has its why (the row\'s `echo:` note)', [...MADE_ECHOES.values()].every((w) => typeof w === 'string' && w.length > 10), [...MADE_ECHOES].filter(([, w]) => !w).map(([k]) => k));
}

const by = {};
for (const r of ROWS) { const k = r.dir + (r.envelope === 'http' ? ' (http)' : ''); by[k] = (by[k] || 0) + 1; }
console.log(`     ${ROWS.length} rows: ` + Object.entries(by).map(([k, v]) => v + ' ' + k).join(', ') + `; ${ROWS.filter((r) => own(r, 'note')).length} with a note`);
process.exit(failed ? 1 : 0);
