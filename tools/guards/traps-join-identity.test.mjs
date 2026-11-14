/* ═══ v2.3.5321: TRAPS INTO GUARDS, WHO A PLAYER IS AT THE JOIN (card V PR 2) ═══
 *
 * Grand plan step 8.2, card V's second batch (the form: tools/guards/README.md,
 * "A trap held").  The census of what holds each trap:
 * docs/plan/census/traps.md.
 *
 * TRAPS §216 (the rule): no call in src/ that keeps an id beside a key (rememberChar, ensureChar, rememberKeyId, setActiveKey) is handed S.myId, a name copied from it, or an id worked out from the key; the roster's heartbeat hands it the join's (S._joinedId). Break: BroTown.jsx: the roster heartbeat's `id: S._joinedId` -> `id: S.myId` -> FAIL (tried 2026-11-14).
 * TRAPS §109 (one case): two of the three first-join surfaces wait for the worker's first player_state (S._rpgFromServer): the road to the Mayor (questRoute.js, every map's and the hint's) and the welcome plate (welcomeBanner.js). The coach (QuestCoach.jsx) needs the page: no node test. Break: src/game/questRoute.js: delete `if (S && S._rpgFromServer === false) return null;` in _wantNpc -> FAIL (tried 2026-11-14).
 *
 * §216, HOW IT READS.  The code of every file under src/ (comments dropped:
 * lib/codeOnly.mjs; strings blanked: lib/maskCode.mjs), every call of the
 * four writers of a key's id, and its arguments.  A call fails when they
 * name `myId`, a name the same file copied from `.myId` (`const g =
 * S.myId`), `passphraseToId(` or `getBtPlayerId(`: an id the page worked out
 * is nobody's for a new key (the worker's, loginkeys.js), and kept beside the
 * key it sends the next join to nobody.  The roster itself cannot tell a
 * guess from the worker's id (both are `bp_...`), so the hold is at the
 * callers.  And a node test of networking/index.js's own roster: a new key's
 * id is never worked out, only kept.
 *
 * §109, HOW IT READS.  questRoute.js and welcomeBanner.js are loaded in node
 * (lib/loadSrc.mjs: bundled, `@/` read as src/, packages stand-ins), asked
 * with a blank level-1 character (the warm start's createDefaultRpg) before
 * and after the worker has spoken.  The road is asked in the world (the
 * Wheel's BroTown, its Mayor where he stands) and in the town's old road;
 * the welcome on a clock the guard runs (its 20 s wait, in no time).
 *
 * BREAK PROOF (rule 8), each tried by hand in a scratch copy, then undone:
 *   §216  BroTown.jsx heartbeat `id: S._joinedId` -> `id: S.myId`            -> FAIL §216 callers, heartbeat
 *         renamed: `var _g = S.myId;` and `id: _g`                         -> FAIL §216 callers
 *         index.js idForKey: `return passphraseToId(phrase)` for a new key -> FAIL §216 roster
 *   §109  questRoute.js _wantNpc: the `_rpgFromServer === false` line gone -> FAIL §109 road
 *         welcomeBanner.js check(): `const synced = true;`               -> FAIL §109 welcome
 *
 * Run from the repository's root: node tools/guards/traps-join-identity.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { codeOf } from './lib/codeOnly.mjs';
import { maskCode } from './lib/maskCode.mjs';
import { loadSrc } from './lib/loadSrc.mjs';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};

/* the page's globals the modules touch at load: a storage, a window, a cookie jar */
const store = new Map();
const quiet = async (fn) => {   /* the renderer's art loads fail in node, loudly and harmlessly */
  const keep = [console.error, console.warn, console.log];
  console.error = console.warn = console.log = () => {};
  try { return await fn(); } finally { [console.error, console.warn, console.log] = keep; }
};
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k), clear: () => store.clear() };
globalThis.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.window = { location: { search: '', hostname: 'localhost', href: 'http://localhost/', pathname: '/' }, addEventListener() {}, removeEventListener() {} };
globalThis.document = { cookie: '', addEventListener() {}, removeEventListener() {}, createElement: () => ({ getContext: () => null, style: {} }) };

/* ── §216: the callers of the writers of a key's id ── */
{
  const WRITERS = /(?<![\w$.])(rememberChar|ensureChar|rememberKeyId|setActiveKey)\(/g;
  const code = codeOf(['src']);
  const calls = [];
  for (const [file, c] of code) {
    const m = maskCode(c);
    /* names this file copies from `.myId` (a rename must not dodge it) */
    const copies = new Set();
    for (const x of m.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)=(?:[^;,=]{0,40}[?&|])?[\w$.]*\.myId(?![\w$])/g)) copies.add(x[1]);
    for (const x of m.matchAll(WRITERS)) {
      if (/function\s*$|[\w$]$/.test(m.slice(Math.max(0, x.index - 9), x.index))) continue;   /* the definition, not a call */
      let d = 0, k = x.index + x[0].length - 1;
      for (; k < m.length; k++) { if (m[k] === '(') d++; else if (m[k] === ')' && --d === 0) break; }
      const args = m.slice(x.index + x[0].length, k);
      const bad = /(?<![\w$])myId(?![\w$])|(?<![\w$.])(?:passphraseToId|getBtPlayerId)\(/.test(args)
        || [...copies].some((n) => new RegExp('(?<![\\w$.])' + n.replace(/\$/g, '\\$') + '(?![\\w$])').test(args));
      calls.push({ file, fn: x[1], args: c.slice(x.index + x[0].length, k).slice(0, 140), bad });
    }
  }
  const bad = calls.filter((c) => c.bad);
  check(`§216 callers: no call of a writer of a key's id is handed S.myId, a copy of it, or a worked-out id (${calls.length} calls)`,
    calls.length >= 10 && bad.length === 0, bad.map((c) => `${c.file}: ${c.fn}(${c.args})`));
  const beat = calls.filter((c) => c.fn === 'rememberChar' && /(?<![\w$])id:/.test(c.args));
  check('§216 heartbeat: the roster\'s rememberChar that carries an id carries the join\'s, S._joinedId',
    beat.length >= 1 && beat.some((c) => /(?<![\w$])id:S\._joinedId(?![\w$])/.test(c.args)), beat.map((c) => `${c.file}: ${c.args}`));
}

/* ── §216: the roster in networking/index.js keeps a new key's id, never works it out ── */
{
  const N = await quiet(() => loadSrc('src/networking/index.js'));
  store.clear();
  const NEW = 'amber-bolt-dusk-echo-flare-ghost-haze-iron';   /* eight words: a new key */
  check('§216 roster: a new key\'s id is unknown until the worker says it (never worked out from the key)',
    N.isNewKey(NEW) && N.idForKey(NEW) === null, N.idForKey(NEW));
  N.rememberKeyId(NEW, 'not-an-id');
  check('§216 roster: ...and what is kept beside it is a player id', N.idForKey(NEW) === null, N.idForKey(NEW));
  N.rememberKeyId(NEW, 'bp_theworkers');
  check('§216 roster: ...the worker\'s id, once told, is the key\'s', N.idForKey(NEW) === 'bp_theworkers', N.idForKey(NEW));
  check('§216 roster: an old key\'s id is still worked out from it', N.idForKey('blaze-frost-nova-titan-42') === N.passphraseToId('blaze-frost-nova-titan-42'));
}

/* ── §109: the road to the Mayor waits for the worker ── */
{
  const Q = await quiet(() => loadSrc('src/game/questRoute.js'));
  const blank = { level: 1, xp: 0, _quests: {} };   /* the warm start's blank (createDefaultRpg) */
  const mayor = { name: 'Mayor Bro', x: 4321, y: 1234 };
  const S = (synced) => ({ _rpgFromServer: synced, npcs: [mayor], player: { x: 4000, y: 1500 }, currentZone: 'wheel' });
  const before = Q.questRoutePoint('wheel', blank, S(false));
  const after = Q.questRoutePoint('wheel', blank, S(true));
  check('§109 road: in the world, no road to the Mayor before the worker\'s first player_state', before === null, before);
  check('§109 road: ...and the road to him once it has said the character is new',
    !!after && after.npc === 'Mayor Bro' && after.x === mayor.x && after.y === mayor.y, after);
  const t0 = Q.questRoutePoint('town', blank, S(false));
  check('§109 road: the town\'s road waits too', t0 === null, t0);
}

/* ── §109: the welcome plate waits for the worker ── */
{
  /* a clock the guard runs: the plate polls every 250 ms for 20 s */
  const realST = globalThis.setTimeout, realNow = Date.now;
  let now = 1e12;
  let timers = [];
  globalThis.setTimeout = (fn, ms) => { timers.push({ at: now + (ms || 0), fn }); return timers.length; };
  Date.now = () => now;
  const run = (ms) => {
    const end = now + ms;
    for (;;) {
      timers.sort((a, b) => a.at - b.at);
      if (!timers.length || timers[0].at > end) break;
      const t = timers.shift();
      now = Math.max(now, t.at);
      t.fn();
    }
    now = end;
  };
  const shown = [];
  globalThis.window._setQuestMsg = (m) => shown.push(m && m.kind);
  try {
    const blank = { level: 1, xp: 0, _quests: {} };
    /* a returning player whose page is still on the blank: the worker never answers in time */
    store.clear(); globalThis.document.cookie = ''; timers = []; shown.length = 0;
    let W = await quiet(() => loadSrc('src/game/welcomeBanner.js'));
    const s1 = { _rpgFromServer: false, rpg: blank };
    W.maybeShowWelcome(() => s1);
    run(25000);
    check('§109 welcome: no plate while the worker has not spoken (the 20 s wait, then nothing)', shown.length === 0, shown);
    /* the same blank, and the worker then says it is a returning character */
    store.clear(); globalThis.document.cookie = ''; timers = []; shown.length = 0;
    W = await quiet(() => loadSrc('src/game/welcomeBanner.js'));
    const s2 = { _rpgFromServer: false, rpg: blank };
    W.maybeShowWelcome(() => s2);
    run(3000);
    s2.rpg = { level: 9, _quests: { tut_1: { status: 'complete' } } }; s2._rpgFromServer = true;
    run(5000);
    check('§109 welcome: ...nor once the worker says the character is a returning one', shown.length === 0, shown);
    /* and a new one is welcomed, once the worker has said so */
    store.clear(); globalThis.document.cookie = ''; timers = []; shown.length = 0;
    W = await quiet(() => loadSrc('src/game/welcomeBanner.js'));
    const s3 = { _rpgFromServer: false, rpg: blank };
    W.maybeShowWelcome(() => s3);
    run(3000);
    const early = shown.length;
    s3._rpgFromServer = true;
    run(5000);
    check('§109 welcome: a new character is welcomed once the worker has spoken, not before',
      early === 0 && shown.length === 1 && shown[0] === 'welcome', { early, shown });
  } finally {
    globalThis.setTimeout = realST; Date.now = realNow;
  }
}

process.exit(failed ? 1 : 0);
