/* ═══ v2.3.5762: TRAPS INTO GUARDS, THE WIRE (card V2 PR 3) ═══
 *
 * Grand plan step 8.2, card V2's third batch (the form: tools/guards/README.md,
 * "A trap held").  The census of what holds each trap:
 * docs/plan/census/traps.md.
 *
 * TRAPS §13 (the rule): no `Object.assign(<a player's state>, ...)`, no message (`msg`, `payload`, `data`...) spread into an object a player's state is given, and no message part spread into a field of it, in server/src/; today's honest places listed with why. Break: server/src/index.js: `Object.assign(ps, msg.data);` in the `track` case of _onMessage -> FAIL (tried 2026-11-17).
 * TRAPS §32 (the rule): precheck's town-gate as a guard (precheck keeps its copy): no send in src/ (`.send(` or the action door's `act('...')`) whose `if` within twelve lines above names `_serverMonsters`, but the combat damage and the door's events. Break: src/ui/panels/buildings/CookPanel.jsx: `if (S._serverMonsters) act('eat_request', ...)` -> FAIL (tried 2026-11-17).
 * TRAPS §75 (the rule): the page awaits the server at the loading screen: a ref is given `waitForServerReady()`, handed to IntroVideo as `waitForServer`, and IntroVideo's `serverRef` turns true only in that promise's `then` (no cap of its own). Break: src/ui/IntroVideo.jsx: `serverRef.current = true;` added to the 20-second hardCap -> FAIL (tried 2026-11-17).
 * TRAPS §264 (the rule): `new WebSocket(` in src/ only inside `connect()`. Break: wsClient.js: `function tryAgainNow() { ws = new WebSocket(WS_URL); }` beside connect -> FAIL (tried 2026-11-17).
 * TRAPS §285 (the rule): every `*_error` out row of the wire table (server/src/wire/out.js) has one case in the wire's client files whose body SHOWS its words (a popup, a toast, the chat log, its own error handler), or puts them where a window draws them (listed with the window); a silent one fails. Break: gameEvents.js: the clan_error case's `pushDmgPopup(...)` gone -> FAIL (tried 2026-11-17).
 * TRAPS §297 (the rule): each close code of 4000 and up the worker closes with (a literal, a module constant, or one handed to `_floodClose` or `_adminPutOut`) has one reason, but the listed ones; the codes with no row in docs/specs/one-socket.md's table are listed and only fall. Break: server/src/persistence.js: the character reset's `ws.close(4005, ...)` made `ws.close(4010, ...)` -> FAIL (tried 2026-11-17).
 * TRAPS §316 (the rule): the caps on the old long `caps: {` line of the join's state_sync, and on CAP_GATES's lines that hold more than one cap, are pinned: the sets only shrink (a new cap goes on its own line). Break: server/src/join.js: `newcap: 1,` at the front of the caps line -> FAIL (tried 2026-11-17).
 *
 * HOW IT READS.  §13 and §297 read the worker's files (card N's walker,
 * server/test/src-walk.mjs), comments dropped (lib/codeOnly.mjs), strings
 * blanked (lib/maskCode.mjs) where a name is searched, one function at a
 * time (lib/fnSpans.mjs).  §32 reads src/ line by line, as precheck does
 * (the window of twelve lines is precheck's).  §75 and §264 read the page's
 * code (comments dropped), §285 the wire's client files (lib/filesOf.mjs)
 * and the wire table itself.  §316 reads the lines themselves.  Card M holds
 * BroTown.jsx: §32 and §75 read it, by name; a move out of it into
 * another file is never a new place.
 *
 * §13, §297 AND §316 KEEP LISTS (the plan's rule 3): a place not listed
 * fails, and the lists only fall.  A cap that leaves the old line (moved to
 * its own, or gone) comes off its list.
 *
 * BREAK PROOF (rule 8), each tried by hand in a scratch copy, then undone:
 *   §13   index.js: `Object.assign(ps, msg.data);` in the track case   -> FAIL §13
 *   §32   CookPanel.jsx: `if (S._serverMonsters) act('eat_request', ...)` -> FAIL §32
 *   §75   IntroVideo.jsx: `serverRef.current = true;` in the hardCap     -> FAIL §75
 *         BroTown.jsx: `waitForServer: null,` handed to IntroVideo      -> FAIL §75
 *   §264  wsClient.js: a `new WebSocket(WS_URL)` outside connect()      -> FAIL §264
 *   §285  gameEvents.js: the clan_error case's popup gone               -> FAIL §285
 *   §297  persistence.js: the reset's close made 4010                   -> FAIL §297 (two reasons; 4005 off)
 *   §316  join.js: `newcap: 1,` first on the caps line                  -> FAIL §316
 *         DevPanel.jsx: `'newcap', ` first on CAP_GATES's first line    -> FAIL §316
 *
 * Run from the repository's root: node tools/guards/traps-wire.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from './lib/fourLines.mjs';
import { codeOf } from './lib/codeOnly.mjs';
import { maskCode } from './lib/maskCode.mjs';
import { readSystem } from './lib/filesOf.mjs';
import { spansOf, innerFn, closeOf } from './lib/fnSpans.mjs';
import { srcFiles } from '../../server/test/src-walk.mjs';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};
const census = (tag, what, found, known) => {
  const fresh = [...found].filter((k) => !Object.hasOwn(known, k)).sort();
  const gone = Object.keys(known).filter((k) => !found.has(k));
  check(`${tag}: ${what}: ${found.size} today, none new`, fresh.length === 0, fresh);
  check(`${tag}: every listed place is still there (a fixed one's name comes off)`, gone.length === 0, gone);
};
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

const SERVER = srcFiles().map((f) => 'server/src/' + f);
const built = codeOf(['server/src', 'src']);
const sCode = new Map(SERVER.map((f) => [f, built.get(f)]));
const sMasked = new Map(SERVER.map((f) => [f, maskCode(sCode.get(f))]));
const sSpans = new Map(SERVER.map((f) => [f, spansOf(sMasked.get(f))]));

/* ── §13: a message never written whole onto a player ── */

const PS = String.raw`(?:(?<![\w$.])(?:_?t?ps|ps[A-Z0-9][\w$]*|[\w$]+Ps)|this\.playerState\[[^\]]*\])`;
const MSG = String.raw`(?:msg|payload|data|m|cleanJoinData|[\w$]*[mM]sg|[\w$]*[pP]ayload)(?![\w$])`;
/* `function: form`, with why */
const ASSIGN_KNOWN = {
  '_handleJoin: spread into the state': 'join.js: `...cleanJoinData`, the join\'s ALLOWLISTED copy of the phone\'s data (_withoutRpgClaims, '
    + 'Object.create(null); TRAPS §13\'s second receipt, the wire\'s again at every join)',
  '_handleJoin: message part into a field': 'join.js: `lifeSkills = {...msg.data.rpgLifeSkills}`, the life skills a join with no record reads (shape-checked)',
  '_sparSpawn: Object.assign': 'spar.js: a sparring partner\'s own state, every value the server\'s (no message in it)',
};
{
  const found = new Set();
  for (const f of SERVER) {
    const m = sMasked.get(f);
    const { fns } = sSpans.get(f);
    const at = (i) => { const fn = innerFn(fns, i); return fn ? fn.name : '(top)'; };
    for (const x of m.matchAll(new RegExp('Object\\.assign\\(' + PS + ',', 'g'))) found.add(at(x.index) + ': Object.assign');
    for (const x of m.matchAll(new RegExp(PS + '=\\{', 'g'))) {
      const o = x.index + x[0].length - 1;
      if (new RegExp('\\.\\.\\.' + MSG).test(m.slice(o, closeOf(m, o)))) found.add(at(x.index) + ': spread into the state');
    }
    for (const x of m.matchAll(new RegExp(PS + '\\.[\\w$]+=[^;]{0,240}?\\{\\.\\.\\.' + MSG + '\\.', 'g'))) found.add(at(x.index) + ': message part into a field');
  }
  census('§13', 'places a player\'s state is given a message whole (or Object.assign)', found, ASSIGN_KNOWN);
}

/* ── §32: precheck's town-gate, as a guard ── */
{
  const ALLOWED = new Set(['monster_damage']);
  let townEvents = new Set();
  try {
    const door = await import(pathToFileURL(join(ROOT, 'src/game/actions.js')).href);
    townEvents = new Set(Object.keys(door.ACTIONS).filter((n) => door.ENV_OF_WAY[door.ACTIONS[n].way] === 'event'));
  } catch (e) { check('§32: the action door (src/game/actions.js) loads', false, String(e && e.message)); }
  const hits = [];
  let sends = 0;
  const walk = (dir) => {
    for (const ent of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const p2 = `${dir}/${ent.name}`;
      if (ent.isDirectory()) { walk(p2); continue; }
      if (!/\.(js|jsx|mjs)$/.test(ent.name) || p2.endsWith('/wsClient.js')) continue;   /* precheck's one file left out: the connection's own */
      const lines = read(p2).split('\n');
      for (let i = 0; i < lines.length; i++) {
        const viaDoor = /\bact\(\s*'/.test(lines[i]);
        if (!lines[i].includes('.send(') && !viaDoor) continue;
        sends++;
        let guard = null;
        for (let j = i; j > Math.max(-1, i - 12); j--) {
          const g = (viaDoor ? /if \(([^)]*_serverMonsters[^)]*)\)/ : /if \(([^)]*channel[^)]*)\)/).exec(lines[j]);
          if (g) { guard = g[1]; break; }
        }
        if (!guard || !/_serverMonsters/.test(guard)) continue;
        const m = viaDoor ? /\bact\(\s*'([a-z_0-9]+)'/.exec(lines[i]) : /type:\s*'([a-z_0-9]+)'/.exec(lines.slice(i, i + 7).join('\n'));
        if (m && (m[1] === 'broadcast' || ALLOWED.has(m[1]) || (viaDoor && townEvents.has(m[1])))) continue;
        hits.push(m ? m[1] : 'an unnamed send');
      }
    }
  };
  walk('src');
  check(`§32: the page's sends are read (${sends}) and the door's events (${townEvents.size})`, sends >= 100 && townEvents.size > 0, { sends, events: townEvents.size });
  check('§32: no send is gated on S._serverMonsters, which is false in town (use S.channel)', hits.length === 0, hits);
}

/* the page's code, comments dropped, strings kept */
const PAGE = [...built.keys()].filter((f) => f.startsWith('src/'));

/* ── §75: the loading screen waits for the server ── */
{
  const owners = PAGE.filter((f) => /\.current=waitForServerReady\(\)/.test(built.get(f)));
  check(`§75: one place gives a ref waitForServerReady() (${owners.join(', ')})`, owners.length === 1, owners);
  const ref = owners.length === 1 ? /([\w$]+)\.current=waitForServerReady\(\)/.exec(built.get(owners[0]))[1] : null;
  check('§75: that ref is handed to the loading screen as `waitForServer`',
    !!ref && new RegExp('waitForServer:' + ref.replace(/\$/g, '\\$') + '\\.current').test(built.get(owners[0])));
  const iv = PAGE.find((f) => /(?:const|function)\s*IntroVideo\s*=?/.test(built.get(f)) && /Promise\.resolve\(waitForServer\)/.test(built.get(f)));
  check('§75: the loading screen (IntroVideo) awaits `waitForServer`', !!iv);
  if (iv) {
    const c = built.get(iv);
    const sets = [...c.matchAll(/serverRef\.current=true/g)].map((x) => x.index);
    const then = c.indexOf('Promise.resolve(waitForServer)');
    const thenEnd = then < 0 ? -1 : closeOf(maskCode(c), c.indexOf('.then(', then) + 5);
    check('§75: its serverRef turns true only in that promise\'s then (no cap of its own)',
      sets.length === 1 && sets[0] > then && sets[0] < thenEnd, sets.length);
    check('§75: and the loading screen\'s finish reads it', /serverRef\.current&&|&&serverRef\.current|!serverRef\.current/.test(c));
  }
}

/* ── §264: one line, made by connect() ── */
{
  const places = [];
  for (const f of PAGE) {
    const c = built.get(f);
    if (!c.includes('new WebSocket(')) continue;
    const m = maskCode(c);
    const { fns } = spansOf(m);
    for (const x of m.matchAll(/new WebSocket\(/g)) {
      const around = fns.filter((fn) => fn.a < x.index && x.index < fn.b).map((fn) => fn.name);
      places.push({ f, inConnect: around.includes('connect') });
    }
  }
  check(`§264: \`new WebSocket(\` is written in the page (${places.length})`, places.length >= 1);
  check('§264: every one is inside connect() (only connect makes a line; it retires the old with retireSocket)',
    places.every((p) => p.inConnect), places.filter((p) => !p.inConnect).map((p) => p.f));
}

/* ── §285: a refusal's words reach the screen ── */

/* the cases that hand the words to a window's bus, by type: the bus call and the window that draws it */
const SHOWN_BY_WINDOW = {
  store_dm_error: { call: 'storeChatBus.setErr(', window: 'StoreChatPanel draws storeChatBus.err' },
  store_offer_error: { call: 'storeChatBus.setOfferErr(', window: 'StoreChatPanel draws storeChatBus.err' },
};
{
  const { WIRE_OUT } = await import(pathToFileURL(join(ROOT, 'server/src/wire/out.js')).href);
  const errs = WIRE_OUT.filter((r) => r.dir === 'out' && /_error$/.test(r.name)).map((r) => r.name);
  check(`§285: the wire table's *_error rows (${errs.length})`, errs.length >= 8, errs);
  const SHOW = /pushDmgPopup\(|[tT]oast\w*(?:\.push)?\(|setChatLog\(|handle\w*Error\w*\(|showNotice\w*\(/;
  const client = [...readSystem('wire', { only: /^src\/.*\.jsx?$/ }).keys()].filter((f) => built.has(f));
  const silent = [];
  for (const t of errs) {
    const bodies = [];
    for (const f of client) {
      const c = built.get(f);
      const m = maskCode(c);
      for (const x of c.matchAll(new RegExp('case"' + t + '":', 'g'))) {
        let k = x.index + x[0].length;
        for (let r; (r = /^case"[\w$]*":/.exec(c.slice(k, k + 80)));) k += r[0].length;   /* cases that share the body */
        const body = c[k] === '{' ? c.slice(k, closeOf(m, k) + 1) : c.slice(k, k + Math.max(0, c.slice(k).search(/break[;}]/)));
        bodies.push(body);
      }
    }
    if (bodies.length !== 1) { silent.push(t + ' (' + bodies.length + ' cases)'); continue; }
    const w = SHOWN_BY_WINDOW[t];
    if (SHOW.test(bodies[0]) || (w && bodies[0].includes(w.call))) continue;
    silent.push(t);
  }
  check('§285: each *_error the worker sends has one case that shows its words (or hands them to the window listed)', silent.length === 0, silent);
}

/* ── §297: a close code, one reason, one row ── */

/* the codes with more than one reason, each one row's meanings */
const CLOSE_MULTI = { 4011: 'one row: no join within the window, or a second join on the socket (`no join`, `already joined`)' };
/* closes whose code or reason is handed in, by function */
const CLOSE_HANDED = {
  _adminPutOut: 'admin.js: the levers\' close (its callers are read)', _floodClose: 'flood.js: the flood\'s close (its callers are read)',
  _authPutOut: 'devicelock.js: `why === \'key\' ? 4017 : DEVICE_LOCK.CLOSE`, the reason the refusal\'s own',
};
/* codes with no row in one-socket.md's table today: only falls */
const NO_ROW_KNOWN = [4003, 4004, 4005, 4006, 4008, 4009, 4010, 4014, 4015, 4016, 4017, 4018, 4023];
{
  /* the module constants: NAME = { KEY: number|'string' } */
  const consts = new Map();
  for (const f of SERVER) {
    const c = sCode.get(f);
    for (const x of c.matchAll(/(?:const|let)\s*([A-Z_][A-Z0-9_]*)=(?:Object\.freeze\()?\{/g)) {
      const o = x.index + x[0].length - 1;
      const lit = c.slice(o, closeOf(sMasked.get(f), o));
      for (const y of lit.matchAll(/[{,]([A-Z_][A-Z0-9_]*):(\d+|"[^"]*")/g)) consts.set(x[1] + '.' + y[1], y[2].startsWith('"') ? y[2].slice(1, -1) : Number(y[2]));
    }
  }
  const val = (s) => {
    s = s.trim();
    if (/^\d+(?:e\d+)?$/.test(s)) return Number(s);
    if (/^"[^"]*"$|^'[^']*'$/.test(s)) return s.slice(1, -1);
    if (consts.has(s)) return consts.get(s);
    return undefined;
  };
  const reasons = new Map();
  const handed = new Set();
  for (const f of SERVER) {
    const c = sCode.get(f);
    const m = sMasked.get(f);
    const { fns } = sSpans.get(f);
    for (const x of m.matchAll(/(?<![\w$])(close|_floodClose|_adminPutOut)\(/g)) {
      const o = x.index + x[0].length - 1;
      const e = closeOf(m, o);
      if (/^\s*\{/.test(m.slice(e + 1, e + 4))) continue;   /* the helper's own definition */
      const args = [];
      let d = 0, s = o + 1;
      for (let k = o + 1; k < e; k++) {
        const ch = m[k];
        if ('([{'.includes(ch)) d++; else if (')]}'.includes(ch)) d--;
        else if (ch === ',' && d === 0) { args.push(c.slice(s, k)); s = k + 1; }
      }
      args.push(c.slice(s, e));
      const [ca, ra] = x[1] === 'close' ? [args[0], args[1]] : [args[1], args[2]];
      if (ca === undefined || ca === '') continue;
      const code = val(ca);
      if (typeof code === 'number' && code < 4000) continue;
      const fn = innerFn(fns, x.index);
      const why = ra === undefined ? undefined : val(ra);
      if (typeof code !== 'number' || typeof why !== 'string') { handed.add(fn ? fn.name : '(top)'); continue; }
      if (!reasons.has(code)) reasons.set(code, new Set());
      reasons.get(code).add(why);
    }
  }
  check(`§297: the worker's close codes are read (${[...reasons.keys()].sort().join(', ')})`, reasons.size >= 10, reasons.size);
  const many = [...reasons].filter(([k, v]) => v.size > 1 && !Object.hasOwn(CLOSE_MULTI, k)).map(([k, v]) => k + ': ' + [...v].join(' | '));
  check('§297: each close code has one reason (a new reason gets a code no file uses)', many.length === 0, many);
  census('§297', 'closes whose code or reason the scan cannot read where it is written', handed, CLOSE_HANDED);
  const spec = read('docs/specs/one-socket.md');
  const rows = new Set([...spec.matchAll(/^\| (\d{4}) \|/gm)].map((x) => Number(x[1])));
  const noRow = [...reasons.keys()].filter((k) => !rows.has(k)).sort();
  const freshNoRow = noRow.filter((k) => !NO_ROW_KNOWN.includes(k));
  check(`§297: a code with no row in one-socket.md's table (${noRow.length}) is a listed one (a new code takes its row)`, freshNoRow.length === 0, freshNoRow);
  check('§297: every listed code with no row still lacks one (one given its row comes off NO_ROW_KNOWN)', NO_ROW_KNOWN.every((k) => noRow.includes(k)), NO_ROW_KNOWN.filter((k) => !noRow.includes(k)));
}

/* ── §316: the old caps lines only shrink ── */
const JOIN_OLD_LINE = [
  'abil', 'aceFlip', 'aceItems', 'achievements', 'alliance', 'amuletForge', 'areaChat', 'arena', 'arenaap',
  'arenaapfirst', 'armorforge', 'bagWeapons', 'bank', 'beastmaster', 'bigorb', 'blockScale', 'boards2',
  'bodyTake', 'botfp', 'bowvolley', 'broCount', 'broVerify', 'bundle', 'charLock', 'chatMute', 'clanparty',
  'clans', 'clientoff', 'codex', 'cookRows', 'cropeat', 'dailyChest', 'dailyquests', 'dailyspin', 'dice',
  'dungeon', 'dungeonLands', 'elemBurst', 'elemup', 'emotemoves', 'emotes', 'eventCapes', 'farm',
  'farmCrops', 'farmorders', 'fishheal', 'fishvariants', 'fishweigh', 'forgeladder', 'friends', 'gamble',
  'gatherhits', 'gatherreq', 'gearRef', 'gearlevel', 'gearq', 'gemExtract', 'gems', 'guilds', 'harden',
  'hardenedwood', 'hardenkeep', 'hardenmats', 'hardenwoodskill', 'heapburn', 'hitladder', 'hpEndGrids',
  'httpAuth', 'itemdrop', 'jackpot', 'killroll', 'laststand', 'loginspin', 'meals', 'milestonesRetired',
  'monsterhold', 'monstermoves', 'movediet', 'movepath', 'nearjoin', 'nmlchoice', 'nmlgroup', 'nmllock',
  'nmlnear', 'nmlsteps', 'nodehp', 'nomansland', 'nostatcap', 'oneformula', 'onelevel', 'onetoone', 'party',
  'partyChat', 'partydungeon', 'partykeep', 'pathall', 'petLoot', 'petbook', 'petfetch', 'pethouse',
  'petlevels', 'petshow', 'pettrade', 'petwards', 'pointsreset', 'potionBag', 'presence2', 'prog3',
  'prog3Chan', 'prog3elem', 'prog3rel', 'prog3shared', 'prog3x', 'pvpbalance', 'pvpbrew', 'pvpextras',
  'pvpheal', 'pvplunge', 'questTrack', 'quiet', 'race', 'rejoinResend', 'rest', 'revealbag', 'ride',
  'risechest', 'salvage', 'season', 'shardcrack', 'shieldgem', 'shieldwear', 'shockspark', 'smelting',
  'soakhit', 'spar', 'sponsor', 'sprint', 'store', 'storeChat', 'storeGear', 'storeGearRef', 'storeOffer',
  't2bench', 't2simple', 't2uniform', 'tierxp', 'tour', 'tourgear', 'trade', 'trade2', 'trade2Review',
  'trade2Weapons', 'trapcraft', 'trapping', 'weaponDrops', 'weapongem', 'wheeldungeons', 'wheelmonsters',
  'wheelnear', 'wheelnodes', 'wheelsize', 'whirlWindup', 'whisper', 'xpdecay',
];
const GATES_OLD_LINES = [
  'abil', 'aceFlip', 'aceItems', 'alliance', 'amuletForge', 'areaChat', 'arena', 'bagWeapons', 'bigorb',
  'blockScale', 'boards2', 'bodyTake', 'botfp', 'bowvolley', 'broCount', 'broVerify', 'charLock', 'chatMute',
  'clanparty', 'clans', 'clientoff', 'dailyChest', 'dungeon', 'elemBurst', 'eventCapes', 'fishvariants',
  'fishweigh', 'friends', 'gamble', 'gatherhits', 'gearRef', 'gearq', 'gemExtract', 'gems', 'guilds',
  'harden', 'hpEndGrids', 'jackpot', 'laststand', 'loginspin', 'milestonesRetired', 'monstermoves',
  'movepath', 'party', 'partyChat', 'partykeep', 'pathall', 'petLoot', 'potionBag', 'prog3', 'prog3Chan',
  'prog3elem', 'prog3rel', 'prog3shared', 'prog3x', 'questTrack', 'rejoinResend', 'revealbag', 'risechest',
  'smelting', 'sponsor', 'store', 'storeChat', 'storeGear', 'storeGearRef', 'storeOffer', 't2bench',
  't2simple', 't2uniform', 'trade', 'trade2', 'trade2Review', 'trade2Weapons', 'weaponDrops', 'whirlWindup',
  'whisper',
];
{
  const capsKeys = (s, from) => {
    const keys = new Set();
    let d = 0;
    for (let k = from; k < s.length; k++) {
      const ch = s[k];
      if (ch === "'" || ch === '"' || ch === '`') { const q = ch; k++; while (k < s.length && s[k] !== q) { if (s[k] === '\\') k++; k++; } continue; }
      if ('{[('.includes(ch)) { d++; continue; }
      if ('}])'.includes(ch)) { if (--d === 0) break; continue; }
      if (d === 1 && /[,{]\s*$/.test(s.slice(Math.max(0, k - 3), k))) { const r = /^\s*([\w$]+)\s*:/.exec(s.slice(k)); if (r) keys.add(r[1]); }
    }
    return keys;
  };
  const lines = [];
  for (const f of SERVER) for (const l of read(f).split('\n')) if (/^\s*caps: \{/.test(l)) lines.push(l.replace(/\/\*[\s\S]*?\*\//g, ''));
  check('§316: one old long `caps: {` line in the worker (the join\'s state_sync)', lines.length === 1, lines.length);
  const now = lines.length ? capsKeys(lines[0], lines[0].indexOf('caps: {') + 6) : new Set();
  const newOnJoin = [...now].filter((k) => !JOIN_OLD_LINE.includes(k));
  check(`§316: the caps line holds ${now.size} caps, none not on its pinned list (a new cap goes on its own line)`, now.size > 100 && newOnJoin.length === 0, newOnJoin);
  const leftJoin = JOIN_OLD_LINE.filter((k) => !now.has(k));
  check('§316: every pinned cap is still on the line (one moved or gone comes off JOIN_OLD_LINE)', leftJoin.length === 0, leftJoin);
  const gatesFile = PAGE.find((f) => /const CAP_GATES=\[/.test(built.get(f)));
  check('§316: CAP_GATES is found in the page', !!gatesFile);
  const src = gatesFile ? read(gatesFile) : '';
  const at = src.indexOf('const CAP_GATES = [');
  const multi = new Set();
  for (const l of src.slice(at).split('\n').slice(1)) {
    if (/^\s*\];/.test(l)) break;
    const names = [...l.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/'([\w$]+)'/g)].map((x) => x[1]);
    if (names.length > 1) for (const n of names) multi.add(n);
  }
  const newOnGates = [...multi].filter((k) => !GATES_OLD_LINES.includes(k));
  check(`§316: CAP_GATES's lines with more than one cap hold ${multi.size}, none not pinned`, multi.size > 50 && newOnGates.length === 0, newOnGates);
  const leftGates = GATES_OLD_LINES.filter((k) => !multi.has(k));
  check('§316: every pinned gate is still on such a line (one moved or gone comes off GATES_OLD_LINES)', leftGates.length === 0, leftGates);
}

process.exit(failed ? 1 : 0);
