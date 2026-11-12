/* ═══ v2.3.4452: A PICTURE THAT FAILED ONCE IS ASKED FOR AGAIN, AND ONE LEFT
 *     BEHIND IS LET GO OF ═══
 *
 * The state-machine sweep (2026-11-03, cluster VC) found phone art loaders
 * that remembered a failure for the whole visit, or waited for ever on a
 * request that never answered (VC-1), and pictures still held after the
 * place that used them was left (VC-2).  Each fix's real code is cut out of
 * src/ and run here with stubs and a fake clock, so a fix that is undone in
 * the source is a FAIL line:
 *   1. retryLooks.timeLimit: a stall counts as a failure; a late answer is
 *      handed over, never lost.
 *   2. loadSetLater.start()/took: the loading screen's wait ends at the time
 *      limit; a late or retried picture is taken once.
 *   3. capes, weapons, shields and the plate icons are loadSetLater sets,
 *      asked again from where they are drawn.
 *   4. a stand-in's gear strip (effectsRenderer _gearStripFrame): a failure
 *      and a stall are asked for again, ten rounds at most, `?gearretry=0`
 *      off.
 *   5. a hat's hair mask: a stall is a failure; a late copy is let go.
 *   6. the body's placement tables: a time limit, and ten later rounds.
 *   7. picsOnce: a blank chip copy's failed restore is asked for again.
 *   8. look-palette sets: a time limit, and no sheet built into a failed set.
 *   9. the stat scene's blue slime is baked once a page, not once a join.
 *  10. a farm picture that lands after you left is let go of.
 *  11. a monster recolour freed while it loaded makes nothing.
 *  12. the dungeon mouth's picture is swept by a rebuilt renderer too.
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
/* a section that throws is a FAIL line, and the rest still run */
async function section(n, fn) {
  try { await fn(); } catch (e) { check(n + '! section ' + n + ' ran to the end', false, String((e && e.message) || e)); }
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };

/* the text from `start` (a regex) through its brace-matched body */
function braced(text, start) {
  const m = start.exec(text);
  if (!m) return '';
  const i = text.indexOf('{', m.index + m[0].length - 1);
  let depth = 0;
  for (let j = i; j < text.length; j++) {
    const c = text[j];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return text.slice(m.index, j + 1); }
  }
  return '';
}
/* a top-level function (export stripped), or '' */
const cut = (text, name) => braced(text, new RegExp('(?:export\\s+)?(?:async\\s+)?function\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{')).replace(/^export\s+/, '');
/* a class method at two spaces, as `name(...) {...}` */
const cutMethod = (text, name) => braced(text, new RegExp('\\n  ' + name + '\\([^)]*\\)\\s*\\{')).trim();
/* a module's code with its imports and exports taken off, to run in a vm */
const bare = (text) => text.replace(/^import[^\n]*\n/gm, '').replace(/^export\s+(?=(const|let|function|async|class))/gm, '');

/* a fake clock: setTimeout and Date.now run by hand */
function fakeClock() {
  let now = 1000000, seq = 0;
  const q = [];
  const clock = {
    now: () => now,
    setTimeout: (fn, ms) => { const id = ++seq; q.push({ id, at: now + (ms || 0), fn }); return id; },
    clearTimeout: (id) => { const i = q.findIndex((t) => t.id === id); if (i >= 0) q.splice(i, 1); },
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        q.sort((a, b) => a.at - b.at || a.id - b.id);
        if (!q.length || q[0].at > end) break;
        const t = q.shift();
        now = t.at;
        t.fn();
        await flush();
      }
      now = end;
      await flush();
    },
    pending: () => q.length,
  };
  clock.Date = class extends Date { static now() { return now; } };
  return clock;
}
/* a vm context with the fake clock, `location.search`, and the given stubs */
function context(clock, search, stubs) {
  const ctx = vm.createContext({
    setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout, Date: clock.Date,
    location: { search: search || '' }, Promise, Map, Set, Object, Array, Math, Error, String, Number, RegExp, JSON, console,
    ...stubs,
  });
  return ctx;
}
const RETRY = bare(src('src/rendering/retryLooks.js'));
const LSL = bare(src('src/rendering/loadSetLater.js'));

/* a load the test answers by hand: load(url) is a promise kept in `asked` */
function handLoads() {
  const asked = [];
  const load = (url) => new Promise((res, rej) => { asked.push({ url, res, rej }); });
  return { asked, load };
}

/* ── 1. timeLimit ── */
await section(1, async () => {
  const clock = fakeClock();
  const ctx = context(clock, '');
  vm.runInContext(RETRY, ctx);
  check('1a retryLooks.js has timeLimit', typeof ctx.timeLimit === 'function');
  if (typeof ctx.timeLimit === 'function') {
    let res = null, late = null, out = 'pending';
    const p = new Promise((r) => { res = r; });
    ctx.timeLimit(p, 20000, (v) => { late = v; }).then(() => { out = 'in'; }, (e) => { out = 'failed: ' + e.message; });
    await clock.advance(19999);
    check('1b a request still waiting at 19.999 s is still waiting', out === 'pending', out);
    await clock.advance(1);
    check('1c at its limit it has failed (a stall comes to the retries)', out === 'failed: time limit', out);
    res('the picture'); await flush();
    check('1d its late answer is handed over, not lost', late === 'the picture', late);
    let out2 = 'pending';
    ctx.timeLimit(Promise.resolve(7), 20000).then((v) => { out2 = v; });
    await flush();
    check('1e an answer in time passes through, its timer cleared', out2 === 7 && clock.pending() === 0, { out2, pending: clock.pending() });
    const raw = Promise.resolve(1);
    check('1f a limit of 0 is no limit (the off switch): the promise itself', ctx.timeLimit(raw, 0) === raw);
  }
});

/* ── 2. loadSetLater: start() and took ── */
await section(2, async () => {
  const clock = fakeClock();
  const ctx = context(clock, '');
  vm.runInContext(RETRY + '\n' + LSL, ctx);
  check('2a loadSetLater is there', typeof ctx.loadSetLater === 'function');
  if (typeof ctx.loadSetLater === 'function') {
    const L = handLoads();
    const into = {};
    const took = [];
    const unloaded = [];
    const set = ctx.loadSetLater({ files: { a: '/a.png', b: '/b.png' }, into, load: L.load, unload: (u) => unloaded.push(u), took: (k, v) => took.push(k + '=' + v) });
    check('2b the set has start()', typeof set.start === 'function');
    let gate = 'waiting';
    (set.start ? set.start() : Promise.reject(new Error('no start'))).then(() => { gate = 'open'; }, () => { gate = 'broken'; });
    await flush();
    L.asked[0].res('A');   /* a arrives; b's request never answers */
    await flush();
    check('2c the gate waits while one first load is out', gate === 'waiting', gate);
    check('2d took(a) ran once the picture was in its slot', into.a === 'A' && took.join() === 'a=A', { into, took });
    await clock.advance(20000);
    check('2e at the time limit the gate opens (a stall never holds the loading screen)', gate === 'open', gate);
    await clock.advance(5000);
    set.ensure();   /* drawn and missing: its first later round is due */
    const again = L.asked.filter((x) => x.url.indexOf('/b.png') === 0);
    check('2f b is asked for again 5 s on, past the cache (?g=1)', again.length === 2 && again[1].url === '/b.png?g=1', again.map((x) => x.url));
    again[0].res('B-late');   /* the first request answers at last */
    await flush();
    check('2g the late answer is taken while the slot is empty', into.b === 'B-late' && took.indexOf('b=B-late') >= 0, { into, took });
    again[1].res('B-second');
    await flush();
    check('2h the retry\'s copy is let go of, and not "took" again', into.b === 'B-late' && unloaded.join() === '/b.png?g=1' && took.length === 2, { unloaded, took });
  }
});

/* ── 3. capes, weapons, shields and the plate icons are sets asked again ── */
await section(3, async () => {
  const cape = src('src/rendering/capeSprites.js');
  check('3a capes: preloadCapes is a loadSetLater set (`?caperetry=0`), awaited through start()',
    /loadSetLater\(\{[\s\S]*?switchName: 'caperetry'/.test(cape) && /await set\.start\(\)/.test(cape));
  check('3b capes: no load-once latch left (`_loading[key]`), and getCapeTexture asks again',
    !/_loading\[/.test(cape) && /export function getCapeTexture[\s\S]{0,200}_ensureCapes\(\)/.test(cape));
  const wpn = src('src/rendering/weaponSprites.js');
  check('3c weapons: a loadSetLater set (`?weaponretry=0`), asked again in getWeaponTexture, a late sheet softened',
    /switchName: 'weaponretry'/.test(wpn) && /export function getWeaponTexture[\s\S]{0,120}_set\.ensure\(\)/.test(wpn) && /if \(_softened\) softenBlades\(\)/.test(wpn));
  const sh = src('src/rendering/shieldSprites.js');
  check('3d shields: a loadSetLater set (`?shieldretry=0`), asked again in getShieldFrame',
    /switchName: 'shieldretry'/.test(sh) && /export function getShieldFrame[\s\S]{0,80}_set\.ensure\(\)/.test(sh));
  const ER = src('src/rendering/systems/entityRenderer.js');
  check('3e the Bro badge, small icons and quest pins: sets (`?iconretry=0`), asked again only where looked up and missing',
    /switchName: 'iconretry'/.test(ER) && /_broBadgeSet\.ensure\(\)/.test(ER) && /_smallSet\.ensure\(\)/.test(ER) && /_pinSet\.ensure\(\)/.test(ER)
    && !/Assets\.load\(SMALL_TEX\[k\]\)/.test(ER) && !/Assets\.load\(QUEST_PIN\[k\]\)/.test(ER));
  /* and the weapons run: a stalled sheet, then its later round */
  const clock = fakeClock();
  const L = handLoads();
  const ctx = context(clock, '', { Assets: { load: L.load, unload: () => Promise.resolve() }, Texture: {}, window: { location: { search: '?bladesoft=off' } } });
  const W = wpn.replace(/^import[^\n]*\n/gm, '').replace(/^export\s+/gm, '');
  try {
    vm.runInContext(RETRY + '\n' + LSL + '\n' + W + '\n;globalThis.__w = { loadWeaponSprites, getWeaponTexture, SHEETS };', ctx);
  } catch (e) { check('3f weaponSprites.js runs in node', false, String(e)); }
  const w = ctx.__w;
  if (w) {
    let gate = 'waiting';
    w.loadWeaponSprites().then(() => { gate = 'open'; });
    await flush();
    const types = Object.keys(w.SHEETS);
    const urls = [...new Set(types.map((t) => w.SHEETS[t].url))];
    check('3f each weapon file is asked once (twins share one)', L.asked.length === urls.length, { asked: L.asked.length, urls: urls.length });
    const swordUrl = w.SHEETS.sword && w.SHEETS.sword.url;
    for (const a of L.asked) if (a.url !== swordUrl) a.res({ tex: a.url });
    await clock.advance(20000);
    check('3g a stalled sword sheet opens the gate at its time limit', gate === 'open' && !w.getWeaponTexture('sword'), gate);
    await clock.advance(5000);
    w.getWeaponTexture('sword');   /* drawn: its round is due */
    const again = L.asked.filter((a) => a.url.indexOf(swordUrl + '&g=1') === 0 || a.url === swordUrl + '&g=1');
    check('3h the sword is asked for again 5 s on, past the cache', again.length === 1, L.asked.slice(-2).map((a) => a.url));
    if (again.length) { again[0].res({ tex: 'sword' }); await flush(); }
    const same = types.filter((t) => w.SHEETS[t].url === swordUrl);
    check('3i once in, every weapon sharing that file draws it', same.every((t) => w.SHEETS[t].tex && w.SHEETS[t].tex.tex === 'sword'), same);
  }
});

/* ── 4. a stand-in's gear strip ── */
async function gearRun(search) {
  const ES = src('src/rendering/systems/effectsRenderer.js');
  const method = cutMethod(ES, '_gearStripFrame');
  const clock = fakeClock();
  const images = [];
  class Img { constructor() { images.push(this); } set src(v) { this._src = v; if (v) this.url = v; } get src() { return this._src; } }
  const ctx = context(clock, search, {
    Image: Img, gearArtSafe: (s, i) => i, gearStripFrames: () => null /* v2.3.4998: the old strip */, GEAR_STRIP_TWIN: {}, GEARLAYER_VER: '1', GEAR_STRIP_TIMEOUT_MS: 20000,
    packTrimmed: () => null, Texture: class { static from() { return { source: {} }; } }, Rectangle: class {}, registerGearSource: () => {},
    keepOnGpuOnly: () => {}, _fxPreload: [], _combatTrimStats: [], _combatTrimFrames: new Map(),
  });
  vm.runInContext(RETRY, ctx);
  const mk = vm.runInContext('(function(){ return ({ ' + method + ' }); })', ctx)();
  const r = {
    _gearStrips: {}, _bakes: new Set(), _destroyed: false,
    _gearStripLater: vm.runInContext("laterRounds('gearretry')", ctx), _gearStripRound: Object.create(null),
    _noteGreavesShape() {},
  };
  r._gearStripFrame = mk._gearStripFrame;
  return { r, clock, images, ok: !!method };
}
await section(4, async () => {
  const { r, clock, images, ok } = await gearRun('');
  check('4a _gearStripFrame is found in effectsRenderer.js', ok);
  const ask = () => r._gearStripFrame('chest', 'steelplate', 'swing', 'south', 128, 0);
  ask();
  images[0].onerror && images[0].onerror(new Error('x'));
  await flush();
  check('4b a failed strip is [] meanwhile (nothing drawn, as before)', Array.isArray(r._gearStrips['chest/steelplate/swing/south']) && !r._gearStrips['chest/steelplate/swing/south'].length);
  await clock.advance(5000);
  ask(); ask();
  check('4c drawn 5 s on, it is asked for again, once, past the cache (&g=1)', images.length === 2 && /&g=1$/.test(images[1].url || ''), images.map((i) => i.url));
  /* the second request never answers: the time limit makes it a failure */
  await clock.advance(20000);
  check('4d a request that never answers has failed at its limit', Array.isArray(r._gearStrips['chest/steelplate/swing/south']) && !r._gearStrips['chest/steelplate/swing/south'].length, r._gearStrips);
  await clock.advance(10000);
  ask(); ask();
  check('4e ...and its next round comes (&g=2)', images.length === 3 && /&g=2$/.test(images[2].url || ''), images.map((i) => i.url));
  /* the stalled one lands late, its slot empty again only between rounds: the third answers */
  images[2].width = 1280; images[2].height = 256; images[2].naturalWidth = 1280; images[2].naturalHeight = 256;
  images[2].onload();
  await flush();
  const e = r._gearStrips['chest/steelplate/swing/south'];
  check('4f once a round lands, the strip is drawn', Array.isArray(e) && e.length === 10, e && e.length);
  /* the cap: a strip that never ships is asked ten later rounds at most */
  const g = await gearRun('');
  const ask2 = () => g.r._gearStripFrame('legs', 'nope', 'cook', 'west', 128, 0);
  ask2();
  for (let i = 0; i < 40; i++) {
    const last = g.images[g.images.length - 1];
    if (last.onerror) last.onerror(new Error('404'));
    await g.clock.advance(61000);
    ask2(); ask2();
  }
  check('4g a strip that never ships: the first load and ten rounds, then no more', g.images.length === 11, g.images.length);
  const off = await gearRun('?gearretry=0');
  off.r._gearStripFrame('chest', 'steelplate', 'swing', 'south', 128, 0);
  off.images[0].onerror(new Error('x'));
  await flush();
  await off.clock.advance(120000);
  off.r._gearStripFrame('chest', 'steelplate', 'swing', 'south', 128, 0);
  off.r._gearStripFrame('chest', 'steelplate', 'swing', 'south', 128, 0);
  check('4h `?gearretry=0`: the game as it was (one load, no limit, never again)', off.images.length === 1 && off.clock.pending() === 0, { n: off.images.length, timers: off.clock.pending() });
});

/* ── 5. a hat's hair mask ── */
await section(5, async () => {
  const ER = src('src/rendering/systems/entityRenderer.js');
  const code = [cut(ER, '_ensureHairMaskLoaded'), cut(ER, '_takeHairMask'), cut(ER, '_loadHairMaskDir')].join('\n');
  check('5a the hair mask\'s loader is found', /function _loadHairMaskDir/.test(code) && /function _takeHairMask/.test(code));
  const clock = fakeClock();
  const L = handLoads();
  const unloaded = [];
  const ctx = context(clock, '', { Assets: { load: L.load, unload: (u) => { unloaded.push(u); return Promise.resolve(); } },
    TRAIT_VER: '1', TRAIT_LOAD_TIMEOUT_MS: 20000, TRAIT_RETRY_LATER_MS: [5000, 10000, 20000, 40000, 60000], _traitRetryOn: true, _looksRetryOn: true });
  vm.runInContext(RETRY + '\nconst _hairMaskCache = {};\nconst HAIR_MASK_ROUNDS = 10;\n' + code + '\n;globalThis.__h = { _ensureHairMaskLoaded };', ctx);
  const h = ctx.__h;
  const e = h._ensureHairMaskLoaded('cowboy');
  let gate = 'waiting';
  e.ready.then(() => { gate = 'open'; });
  for (const a of L.asked) if (!/north\.png/.test(a.url)) a.res({ source: {}, n: a.url });
  await clock.advance(20000);
  check('5b a north mask that never answers has failed at its limit: the loading screen goes on', gate === 'open' && !e.tex.north, gate);
  await clock.advance(5000);
  h._ensureHairMaskLoaded('cowboy');
  const again = L.asked.filter((a) => /north\.png.*&g=1$/.test(a.url));
  check('5c ...and it is asked for again on the head pieces\' rounds (&g=1)', again.length === 1, L.asked.map((a) => a.url));
  again[0].res({ source: {}, n: 'round1' });
  await flush();
  L.asked.find((a) => /north\.png\?v=1$/.test(a.url)).res({ source: {}, n: 'late' });
  await flush();
  check('5d the round\'s mask is drawn; the late first answer is let go of, not held twice',
    e.tex.north && e.tex.north.n === 'round1' && unloaded.length === 1 && /north\.png\?v=1$/.test(unloaded[0]), { tex: e.tex.north, unloaded });
});

/* ── 6. the body's placement tables ── */
await section(6, async () => {
  const ER = src('src/rendering/systems/entityRenderer.js');
  const code = [cut(ER, '_fetchLimited'), cut(ER, '_ensureBodyData')].join('\n');
  check('6a _ensureBodyData fetches through a time limit (_fetchLimited)', /_fetchLimited\(url/.test(code) && /function _fetchLimited/.test(code));
  const clock = fakeClock();
  const fetches = [];
  class AC { constructor() { this.signal = { aborted: false, fire: null }; } abort() { this.signal.aborted = true; if (this.signal.fire) this.signal.fire(); } }
  const fetch = (url, opt) => new Promise((res, rej) => {
    const f = { url, res, rej };
    fetches.push(f);
    if (opt && opt.signal) opt.signal.fire = () => rej(new Error('aborted'));
  });
  const ctx = context(clock, '', { fetch, AbortController: AC, recordCrash: () => {}, TRAIT_VER: '1', RETRY_ROUNDS: 10, _traitRetryOn: true, _looksRetryOn: true });
  vm.runInContext('let _bodyAnchors = null, _bodyTops = null, _bodyDataPromise = null, _bodyDataRounds = 0; const BODY_DATA_TIMEOUT_MS = 15000;\n' + code
    + '\n;globalThis.__b = { _ensureBodyData, has: () => !!(_bodyAnchors && _bodyTops), rounds: () => _bodyDataRounds };', ctx);
  const b = ctx.__b;
  let done = 'waiting';
  b._ensureBodyData().then(() => { done = 'settled'; });
  await flush();
  fetches.find((f) => /body-tops/.test(f.url)).res({ ok: true, json: () => ({ tops: 1 }) });
  await clock.advance(15000 + 2000 + 15000 + 6000 + 15000);
  check('6b a stalled anchors request is a failure, into its two retries, and the round settles', done === 'settled' && !b.has(), { done, n: fetches.length });
  /* a long outage: every later round fails for 30 minutes -- and the rounds
     go on (left without an end on purpose: nothing is placed without them) */
  for (let i = 0; i < 30; i++) {
    for (const f of fetches.splice(0)) f.rej(new Error('down'));
    await clock.advance(60000);
    b._ensureBodyData();
  }
  const roundsInOutage = b.rounds();
  /* the line is back: the next round's answers come */
  for (let i = 0; i < 4 && !b.has(); i++) {
    for (const f of fetches.splice(0)) f.res({ ok: true, json: () => ({ anchors: 1 }) });
    await clock.advance(60000);
    b._ensureBodyData();
    await flush();
  }
  check('6c the later rounds keep going through a long outage, and the tables come back after it (no cap: v2.3.3689\'s recovery kept)', roundsInOutage > 11 && b.has(), { roundsInOutage, has: b.has() });
});

/* ── 6d. the Bro badge's loading report still sees a failure ── */
await section(13, async () => {
  const ER = src('src/rendering/systems/entityRenderer.js');
  const pre = cut(ER, 'preloadBroBadge'), look = cut(ER, '_broBadgeTexture');
  const setLine = /const _iconSet = [\s\S]*?switchName: 'iconretry' \}\);/.exec(ER);
  check('6d the Bro badge\'s loader and its set are found', !!pre && !!look && !!setLine);
  if (!pre || !setLine) return;
  const clock = fakeClock();
  const L = handLoads();
  const ctx = context(clock, '', { Assets: { load: L.load, unload: () => Promise.resolve(), cache: { has: () => false } }, Texture: { EMPTY: 'EMPTY' } });
  vm.runInContext(RETRY + '\n' + LSL + "\nconst BRO_BADGE_URL = '/icons/ui/verified-bro-small.webp';\nlet _broBadgeTex = null;\n" + setLine[0]
    + '\nlet _broBadgeSet = null;\nconst _broBadgeGot = Object.create(null);\n' + pre + '\n' + look + '\n;globalThis.__bb = { preloadBroBadge, _broBadgeTexture };', ctx);
  let out = 'waiting';
  ctx.__bb.preloadBroBadge().then(() => { out = 'resolved'; }, () => { out = 'rejected'; });
  await flush();
  L.asked[0].rej(new Error('offline'));
  await flush();
  check('6e a badge that failed: the gate settles at once, and REJECTS (the loading report says so)', out === 'rejected', out);
  await clock.advance(5000);
  ctx.__bb._broBadgeTexture();   /* looked up and missing: its round */
  const again = L.asked.filter((a) => /g=1/.test(a.url));
  check('6f ...and its later round still runs', again.length === 1, L.asked.map((a) => a.url));
  if (again.length) { again[0].res('BADGE'); await flush(); }
  check('6g once in, it is drawn', ctx.__bb._broBadgeTexture() === 'BADGE');
});

/* ── 7. picsOnce: a blank copy's restore is asked for again ── */
await section(7, async () => {
  const P = src('src/rendering/picsOnce.js');
  const fn = cut(P, 'restoreAgainIn');
  check('7a picsOnce.js has the rule restoreAgainIn', !!fn);
  if (fn) {
    const ctx = vm.createContext({ RETRY_LATER_MS: [5000, 10000, 20000, 40000, 60000], RETRY_ROUNDS: 10 });
    vm.runInContext(fn + '; globalThis.f = restoreAgainIn;', ctx);
    const f = ctx.f;
    check('7b a failed restore with a blank copy on the chip is asked again 5 s, 10, 20 s ... on', f(true, 0, true) === 5000 && f(true, 1, true) === 10000 && f(true, 7, true) === 60000);
    check('7c ten rounds at most; none with no blank copy, or with the switch off', f(true, 10, true) === -1 && f(false, 0, true) === -1 && f(true, 0, false) === -1);
  }
  const restore = cut(P, 'restore');
  check('7d restore has a time limit, busts the cache on a later round, and schedules through the rule',
    /RESTORE_TIMEOUT_MS/.test(restore) && /'g=' \+ st\.rounds/.test(restore) && /restoreAgainIn\(/.test(restore));
});

/* ── 8. look-palette sets ── */
await section(8, async () => {
  const LP = src('src/rendering/lookPalette.js');
  const ls = cut(LP, 'loadSet');
  const mf = cut(LP, 'manifestOf');   /* v2.3.4993: the manifest fetched once there (the atlas plans from every set's) */
  check('8a a set\'s manifest, its body and each sheet have a time limit',
    /timeLimit\(fetch\(/.test(mf) && /timeLimit\(res\.json\(\)/.test(mf) && /manifestOf\(s\)/.test(ls) && /timeLimit\(loadPng\(/.test(ls));
  check('8b a set that failed builds no sheet that lands after', /if \(dead\) return;\s*buildSheet\(/.test(ls) && /catch \(e\) \{\s*dead = true;/.test(ls));
});

/* ── 9. the stat scene's blue slime: once a page ── */
await section(9, async () => {
  const S = src('src/rendering/statDemoPreload.js');
  const clock = fakeClock();
  let images = 0, blobs = 0;
  class Img { constructor() { images++; } set src(v) { this._s = v; Promise.resolve().then(() => this.onload && this.onload()); } }
  const ctx = context(clock, '', {
    Image: Img, document: {}, URL: { createObjectURL: () => 'blob:' + (++blobs), revokeObjectURL: () => {} },
    STAT_DEMO_URLS: ['/a.png', '/b.png'], SLIME: { idle: { url: '/idle.png' }, death: { url: '/death.png' } },
    setBlueSlimeSheets: () => {}, MONSTER_VARIANTS: { blueSlime: { recolor: [0, 0, 255] } },
    retintToCanvas: () => ({ toBlob: (cb) => cb({}) }),
  });
  vm.runInContext(bare(S) + '\n;globalThis.__s = { preloadStatDemo, statDemoWarmCount };', ctx);
  await ctx.__s.preloadStatDemo(); await flush();
  const first = { images, blobs, held: ctx.__s.statDemoWarmCount() };
  await ctx.__s.preloadStatDemo(); await flush();
  await ctx.__s.preloadStatDemo(); await flush();
  check('9a joining again bakes no new blue slime and holds no new pictures', blobs === first.blobs && images === first.images && ctx.__s.statDemoWarmCount() === first.held,
    { first, then: { images, blobs, held: ctx.__s.statDemoWarmCount() } });
});

/* ── 10. a farm picture that lands after you left ── */
await section(10, async () => {
  const F = src('src/rendering/farmWorld.js');
  const code = [cut(F, 'preloadFarmArt'), cut(F, 'freeFarmArt')].join('\n');
  const clock = fakeClock();
  const L = handLoads();
  const unloaded = [];
  const ctx = context(clock, '', {
    Assets: { load: (u) => L.load(typeof u === 'string' ? u : u.src), unload: (u) => { unloaded.push(u); return Promise.resolve(); } },
    farmNames: () => ['barn'], FARM_STEPS: [], objAtlases: () => [], farmArtUrl: (n) => '/farm/' + n + '.png',
    loadStepIcon: () => Promise.resolve({ destroy() {} }), releaseShadowTextures: () => {}, performance: { now: () => 0 },
    OBJ_BASE: '/o/', OBJ_QUERY: '', OBJ_PREFIX: 'p/',
  });
  vm.runInContext('const _tex = new Map(), _sheets = new Map(); let _loadP = null, _ready = false, _gen = 0; const farmArtStats = { loaded: 0, failed: 0, ms: null };\n'
    + code + '\n;globalThis.__f = { preloadFarmArt, freeFarmArt };', ctx);
  const f = ctx.__f;
  f.preloadFarmArt();
  f.freeFarmArt();   /* left before the barn came */
  L.asked[0].res({ barn: 1 });
  await flush();
  check('10a a farm picture that lands after you left is let go of at once', unloaded.indexOf('/farm/barn.png') >= 0, unloaded);
  /* left and came back while it loaded: the new visit keeps it */
  unloaded.length = 0;
  f.preloadFarmArt();      /* visit 2 */
  f.freeFarmArt();         /* left */
  f.preloadFarmArt();      /* visit 3, the same picture in flight */
  L.asked[1].res({ barn: 2 });
  await flush();
  check('10b ...but not while a new visit is loading it (Pixi hands that visit the same texture)', unloaded.length === 0, unloaded);
});

/* ── 11. a recolour freed while it loaded ── */
await section(11, async () => {
  const M = src('src/rendering/monsterRecolor.js');
  const code = [cut(M, 'loadMonsterRecolor'), cut(M, 'freeMonsterRecolor')].join('\n');
  const clock = fakeClock();
  let made = 0;
  let land = null;
  const unloadedBundles = [];
  const ctx = context(clock, '', {
    SHEET_SETS: { slime: { idle: '/idle.png' } }, keyOf: (f, rgb) => f + rgb.join(','), recolorFamilyOf: () => 'slime',
    loadImg: () => new Promise((r) => { land = r; }), retintToCanvas: () => ({ width: 128 }), FRAME_W: 64, FRAME_H: 64,
    Texture: class { constructor() { made++; } static from() { made++; return { source: {} }; } }, Rectangle: class {},
    releaseCanvasSource: () => {},
    /* v2.3.4470: the recolour asks the strip door first (its palette retinted, read off the page's thread); here
       the door has no way in for this sheet (null), so the canvas's way is the one under test.  Letting the colour
       go lets its bundle go too. */
    loadTrackedStripRetinted: () => Promise.resolve(null), unloadBundle: (b) => { unloadedBundles.push(b); },
  });
  vm.runInContext('const _cache = new Map();\n' + code + '\n;globalThis.__m = { loadMonsterRecolor, freeMonsterRecolor };', ctx);
  ctx.__m.loadMonsterRecolor('slime', [0, 0, 255]);
  await flush();   /* the door has answered: the picture is asked for */
  ctx.__m.freeMonsterRecolor({ recolor: [0, 0, 255] });   /* the zone was left */
  land({});
  await flush();
  check('11a a recolour freed while its sheet loaded makes no canvas texture or frames', made === 0, made);
  check('11b ...and its bundle of numbers is let go with it (a strip still being read is dropped as it arrives)', unloadedBundles.length === 1 && /^recolor\|/.test(unloadedBundles[0]), unloadedBundles);
});

/* ── 12. the dungeon mouth's picture after a rebuild off the Wheel ── */
await section(12, async () => {
  const ES = src('src/rendering/systems/effectsRenderer.js');
  check('12a the mouth sweep runs while a picture is held, even with no WheelDoors on this renderer',
    /if \(_doors \|\| \(this\._wheelDoors && this\._wheelDoors\.size\) \|\| wheelDoorPicturesHeld\(\)\)/.test(ES));
});

console.log(`\nloader-retries: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
