/* ═══ v2.3.4792: A PICTURE LOAD HAS A TIME LIMIT AND A RETRY, OR IT IS ON THE LIST ═══
 *
 * #1495 (v2.3.4415, renderer-life: the health bars' pictures) and #1505
 * (v2.3.4452, loader-retries: capes, weapons, shields, the badges over heads,
 * armour mid-swing, the hat's hair clip, the head-piece tables...) fixed one
 * loader after another whose download could fail or never answer and then
 * stayed broken for the visit.  TRAPS §257 wrote the rule ("every load the
 * game waits on has a TIME LIMIT that counts as a failure, into the same
 * retries... a new loader takes a timeout too, or says why a stall cannot
 * happen"), but nothing held the NEXT loader to it.  This suite does, the way
 * strip-door.test holds the monsters' strips and hit-door.test the hits:
 *
 *   THE DOORS (a time limit AND a retry, each checked here from its source):
 *     - loadSetLater (src/rendering/loadSetLater.js): a set of pictures, each
 *       with its 20 s limit and retryLooks.js's later rounds;
 *     - timeLimit (src/rendering/retryLooks.js) with the loader's own rounds
 *       after it (laterRounds): only in the files listed in TIMED_AND_RETRIED,
 *       since a time limit alone is half the rule;
 *     - loadTraitImg (src/rendering/traits/traitImg.js): a head piece's
 *       picture, 20 s and two more asks;
 *     - startFetch (public/tools/world/core/startFetch.js): the ground
 *       worker's start lists, 20 s and three tries.
 *   A load written inside one of those calls passes.
 *
 *   EVERY OTHER PICTURE LOAD in the game's code -- Pixi's `Assets.load`, a
 *   `new Image()`, a `fetch()` (bar the server's own /api/) -- in src/ and in
 *   the ground worker's modules (public/tools/world/core/ground-worker.js and
 *   what it imports: the only code under public/ the game runs), is on the
 *   CLOSED list below by file and by the function it sits in, with what it
 *   lacks or why it needs nothing.  The list can only SHRINK: a new load
 *   there fails this suite with the rule; a load fixed or gone fails it too
 *   until its line comes off (or its count goes down).
 *
 *   THE SHARED LOADERS WITH NO LIMIT OR RETRY OF THEIR OWN (loadWebpOrPng,
 *   warmOnce, loadCroppedStrip, loadTrackedStrip, loadTracked) have a closed
 *   list of the files that call them, as strip-door.test's packers do: a new
 *   caller brings its own time limit and retry, or goes on the list with why.
 *
 * Not counted, on purpose: `Texture.from(url)` (in Pixi 8 a cache LOOKUP, never
 * a load: entityRenderer v2.3.1576's note); `createImageBitmap` (it decodes
 * bytes a fetch already brought: the fetch is counted); Pixi's own loader
 * parsers (`loadTextures.load` inside paletteLoad.js / p256.js run under an
 * Assets.load that is counted); an <img> written in JSX (the browser's own,
 * shown as it comes).  Pixi's Assets.load itself has neither a time limit nor
 * a retry (its Loader's default strategy is 'throw', and nothing in src/ sets
 * another).
 *
 * The kinds on the list:
 *   own     its own time limit AND retry, written by hand (not through a door);
 *   retry   asked again, but with NO time limit: a request that never answers
 *           is never retried (TRAPS §257's stall) -- a candidate;
 *   limit   a time limit, but no retry -- a candidate;
 *   once    neither -- a candidate;
 *   warm    only warms the browser's cache (or holds a decoded copy) for a
 *           picture whose real use loads it again; a failure costs a pop-in;
 *   kept    the picture is already held; a failed load keeps it;
 *   local   not a download: a picture made from bytes already on the device
 *           (a blob or a canvas);
 *   off     not in the game players play: a QA probe, an offline bake, the
 *           retired world trial (`?trial=world`);
 *   shared  inside a shared loader whose callers are listed in SHARED below;
 *   notpic  a fetch that is not a picture (a sound, the server, a CSV).
 * The candidates (retry, limit, once) are a later fix lane's list: a fix that
 * turns on a retry nobody has seen is the owner's call where players would
 * see it change (TRAPS §305).
 *
 * Checked:
 *   1. the doors keep their time limit and their retry (run where node can,
 *      read from the source where they need a browser);
 *   2. the scanner on made-up code: a raw load is found, one inside a door
 *      is not, nor one in a comment or a string, nor a call to the server;
 *      a new raw load in a new file or a new function is a FAIL;
 *   3. every picture load in the game's code is through a door or on the
 *      list, and every line on the list still matches a load;
 *   4. the shared loaders' callers are the known ones;
 *   5. the list itself: each line a known kind and a reason.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 1600))); }
}
async function section(n, fn) {
  try { await fn(); } catch (e) { check(n + '! section ' + n + ' ran to the end', false, String((e && e.stack) || e)); }
}
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf8');
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const relOf = (f) => relative(ROOT, f).split('\\').join('/');

/* ═══ THE SCANNER ═══ */

/* comments, and the insides of strings, template literals and regex literals,
   blanked (the same length, newlines kept): a load named in a comment or a
   string is not a load, and a bracket inside one never upsets the counting */
function blank(t) {
  let out = '', i = 0, prev = '';
  const n = t.length;
  while (i < n) {
    const c = t[i], d = t[i + 1];
    if (c === '/' && d === '*') { const e = t.indexOf('*/', i + 2); const j = e < 0 ? n : e + 2; out += t.slice(i, j).replace(/[^\n]/g, ' '); i = j; continue; }
    if (c === '/' && d === '/') { const e = t.indexOf('\n', i); const j = e < 0 ? n : e; out += ' '.repeat(j - i); i = j; continue; }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < n && t[j] !== c) { if (t[j] === '\\') j++; else if (c !== '`' && t[j] === '\n') break; j++; }
      out += c + t.slice(i + 1, j).replace(/[^\n]/g, ' ') + (j < n ? c : '');
      i = j + 1; prev = c; continue;
    }
    if (c === '/' && (prev === '' || /[(,=:[!&|?{};+\-*%<>~^]/.test(prev) || /\b(return|typeof|case|in|of)\s*$/.test(out.slice(-8)))) {
      let j = i + 1, cls = false;
      while (j < n && t[j] !== '\n') {
        if (t[j] === '\\') { j += 2; continue; }
        if (t[j] === '[') cls = true; else if (t[j] === ']') cls = false; else if (t[j] === '/' && !cls) break;
        j++;
      }
      if (j < n && t[j] === '/') { out += '/' + ' '.repeat(j - i - 1) + '/'; i = j + 1; while (i < n && /[a-z]/.test(t[i])) { out += t[i]; i++; } prev = '/'; continue; }
    }
    out += c;
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return out;
}
/* the innermost NAMED function around offset `at` ('(top)': none) */
const NOT_NAMES = new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'with', 'else', 'do', 'try', 'finally']);
const ARGS = '\\((?:[^()]|\\((?:[^()]|\\([^()]*\\))*\\))*\\)';
const NAMED = [
  new RegExp('function\\s*\\*?\\s*([A-Za-z_$][\\w$]*)\\s*' + ARGS + '\\s*$'),
  new RegExp('([A-Za-z_$][\\w$]*)\\s*[:=]\\s*(?:async\\s*)?(?:function\\s*[\\w$]*\\s*)?' + ARGS + '\\s*(?:=>\\s*)?$'),
  /([A-Za-z_$][\w$]*)\s*[:=]\s*(?:async\s+)?[A-Za-z_$][\w$]*\s*=>\s*$/,
  new RegExp('(?:^|[\\s;}])(?:async\\s+)?(?:static\\s+)?(?:get\\s+|set\\s+)?([A-Za-z_$][\\w$]*)\\s*' + ARGS + '\\s*$'),
];
function ownerAt(b, at) {
  let depth = 0;
  for (let i = at - 1; i >= 0; i--) {
    const c = b[i];
    if (c === '}') depth++;
    else if (c === '{') {
      if (depth > 0) { depth--; continue; }
      const before = b.slice(Math.max(0, i - 240), i);
      for (const re of NAMED) { const m = re.exec(before); if (m) { if (!NOT_NAMES.has(m[1])) return m[1]; break; } }
    }
  }
  return '(top)';
}
/* the names of the calls whose argument list holds offset `at`, innermost first */
function callsAround(b, at) {
  const out = [];
  let depth = 0;
  for (let i = at - 1; i >= 0; i--) {
    const c = b[i];
    if (c === ')') depth++;
    else if (c === '(') {
      if (depth > 0) { depth--; continue; }
      const m = /([A-Za-z_$][\w$]*)\s*$/.exec(b.slice(Math.max(0, i - 60), i));
      out.push(m ? m[1] : '');
    }
  }
  return out;
}
function closeOf(b, open) {
  let depth = 0;
  for (let i = open; i < b.length; i++) {
    if (b[i] === '(') depth++;
    else if (b[i] === ')') { depth--; if (!depth) return i; }
  }
  return b.length;
}
/* a door's own body: a load written inside the function that IS the door */
function bodyOf(b, name) {
  const m = new RegExp('function\\s+' + name + '\\s*' + ARGS + '\\s*\\{').exec(b);
  if (!m) return null;
  let depth = 0;
  for (let i = m.index + m[0].length - 1; i < b.length; i++) {
    if (b[i] === '{') depth++;
    else if (b[i] === '}') { depth--; if (!depth) return [m.index, i]; }
  }
  return null;
}

const RAW = /\bAssets\s*\.\s*(?:load|loadBundle|backgroundLoad|backgroundLoadBundle)\s*\(|\bnew\s+Image\s*\(|(?<![.\w$])fetch\s*\(/g;
/* the doors: a load inside a call to one (or inside its own body) has a time
   limit and a retry.  timeLimit counts only where its file retries after it. */
const DOOR_CALLS = ['loadSetLater', 'startFetch', 'loadTraitImg'];
const DOOR_BODIES = { 'src/rendering/traits/traitImg.js': 'loadTraitImg', 'public/tools/world/core/startFetch.js': 'startFetch' };
const TIMED_AND_RETRIED = {
  'src/rendering/systems/entityRenderer.js': "the hat's hair mask (_loadHairMaskDir): its catch sets the next round (HAIR_MASK_ROUNDS, TRAIT_RETRY_LATER_MS)",
};

/** Every picture load in one file: [{ line, owner, what, door }] (door: the door it goes through, or null). */
function loadsIn(rel, text) {
  const b = blank(text);
  const own = DOOR_BODIES[rel] ? bodyOf(b, DOOR_BODIES[rel]) : null;
  const out = [];
  RAW.lastIndex = 0;
  let m;
  while ((m = RAW.exec(b))) {
    const open = m.index + m[0].length - 1;
    const what = /^new/.test(m[0]) ? 'new Image' : /^fetch/.test(m[0]) ? 'fetch' : 'Assets.load';
    if (what === 'fetch' && /\/api\/|API_BASE/.test(text.slice(open, closeOf(b, open)))) continue;   /* the server's API, not a picture */
    const calls = callsAround(b, m.index);
    let door = calls.find((c) => DOOR_CALLS.includes(c)) || null;
    if (!door && calls.includes('timeLimit') && TIMED_AND_RETRIED[rel]) door = 'timeLimit';
    if (!door && own && m.index > own[0] && m.index < own[1]) door = DOOR_BODIES[rel];
    out.push({ line: b.slice(0, m.index).split('\n').length, owner: ownerAt(b, m.index), what, door });
  }
  return out;
}
/** The files that call `name(` (its definition not counted). */
function callersOf(texts, name) {
  const re = new RegExp('(?<![\\w$])' + name + '\\s*\\(', 'g');
  const def = new RegExp('function\\s+' + name + '\\s*\\(');
  const out = [];
  for (const [rel, t] of texts) {
    const b = blank(t);
    let n = 0, m;
    re.lastIndex = 0;
    while ((m = re.exec(b))) { if (!def.test(b.slice(Math.max(0, m.index - 12), m.index + name.length + 1))) n++; }
    if (n) out.push(rel);
  }
  return out.sort();
}
/* a list line: [kind, how many, why], or several of them for one function */
const entries = (e) => (Array.isArray(e[0]) ? e : [e]);
/** Compare what is found with the list: { fresh: loads not listed, over: owners with more than listed, under: listed but fewer/none }. */
function judge(found, LIST) {
  const fresh = [], over = [], under = [];
  const counts = new Map();   /* 'file > owner' -> n */
  for (const [rel, loads] of found) {
    for (const s of loads) {
      if (s.door) continue;
      const L = LIST[rel];
      const key = L && L['*'] ? '*' : s.owner;
      const k = rel + ' > ' + key;
      counts.set(k, (counts.get(k) || 0) + 1);
      if (!L || !L[key]) fresh.push(rel + ':' + s.line + ' ' + s.what + ' in ' + s.owner + '()');
    }
  }
  for (const [rel, L] of Object.entries(LIST)) {
    for (const [owner, e] of Object.entries(L)) {
      const n = counts.get(rel + ' > ' + owner) || 0, want = entries(e).reduce((a, x) => a + x[1], 0);
      if (n > want) over.push(rel + ' > ' + owner + ': ' + n + ' loads, the list says ' + want);
      if (n < want) under.push(rel + ' > ' + owner + ': ' + n + ' loads, the list says ' + want);
    }
  }
  return { fresh, over, under };
}

/* ═══ THE LIST (it only shrinks) ═══
   file -> the function the load sits in ('*': the whole file) -> [kind, how many, why]. */
const LIST = {
  /* -- not pictures -- */
  'src/data/gameDisplay.js': { '*': ['notpic', 5, 'sounds: the music deck and the sound cache'] },
  'src/debug/crashTrap.js': { '*': ['notpic', 1, 'the crash report, sent'] },
  'src/game/buildWatch.js': { '*': ['notpic', 1, 'version.json: is a newer build out'] },
  'src/game/slimeAudio.js': { '*': ['notpic', 1, "the slime's idle sound"] },
  'src/ui/GameApp.jsx': { '*': ['notpic', 1, 'the NFT list (a CSV)'] },
  'src/ui/panels/DevPanel.jsx': { '*': ['notpic', 1, "the Test panel's admin levers (fetchWithTimeout)"] },
  'src/ui/panels/buildings/ExchangePanel.jsx': { '*': ['notpic', 1, "the market's API"] },
  'src/ui/storeApi.js': { '*': ['notpic', 1, "the General Store's API (postWithin)"] },

  /* -- their own time limit and retry, by hand -- */
  'public/tools/world/core/ground-worker.js': { fetchFile: ['own', 1, 'a ground picture: cut after DL_STALL_MS without a byte (DL_MAX_MS in all), asked again by chase()'] },
  'src/rendering/picsOnce.js': {
    restore: ['own', 1, "the memory saver's restore: RESTORE_TIMEOUT_MS, then later rounds (picsretry, #1505)"],
    swapBitmap: ['kept', 1, 'the memory saver swapping a held bitmap for an <img> of the same file: a failure keeps the bitmap'],
  },
  'src/rendering/systems/entityRenderer.js': {
    _fetchTraitMeta: ['own', 1, "a head piece's meta.json: aborted at 15 s, into the pieces' rounds"],
    _fetchLimited: ['own', 1, "the body's placement tables: BODY_DATA_TIMEOUT_MS, retried by _ensureBodyData's rounds"],
    _ensureTraitTextures: ['once', 3, "the NFT trait's meta.json and pictures and the mannequin's: no time limit, no retry"],
  },

  /* -- the candidates and the rest -- */
  'src/game/buildingRooms.js': { '*': ['warm', 2, "the rooms' pictures warmed ahead of the window; the window's own <img> loads its picture"] },
  'src/game/characterCreatorEffects.js': { '*': ['warm', 1, "the intro video's poster, warmed"] },
  'src/game/dungeonArt.js': { load: ['once', 1, "a dungeon arena's walls, things and chest: no time limit, no retry (a failure is null)"] },
  'src/game/wheelDungeons.js': { loadDungeonFloor: ['once', 2, "a dungeon's floor picture and the ground manifest read before it: no time limit, no retry"] },
  /* v2.3.4676: worldTrial.js's two loads and chunkGround.js went with `?trial=world` (the island trial, deleted) */
  'src/rendering/characterPortrait.js': {
    loadImage: ['once', 1, "the portrait's pictures: no time limit; a failure stays in the cache"],
    loadMeta: ['once', 1, "a head piece's meta.json for the portrait: no time limit; a failure is null for the page"],
    loadBodyTops: ['once', 1, "body-tops.json for the portrait: no time limit; a failure is null for the page"],
  },
  'src/rendering/chestPreload.js': { warm: ['warm', 1, "the chest's art, warmed and held for the loading screen"] },
  'src/rendering/coinPileArt.js': { load: ['once', 1, 'the coin piles: no time limit, no retry (the drawn stand-in shows)'] },
  'src/rendering/dropIcons.js': { load: ['once', 1, 'the dropped-item icons: no time limit, no retry (the stand-in mark shows)'] },
  'src/rendering/farmWorld.js': {
    loadStepIcon: ['once', 1, "the farm's step icons: no time limit, no retry"],
    preloadFarmArt: ['once', 2, "the farm's pictures and object atlases: no time limit, no retry"],
  },
  'src/rendering/fxStrips.js': { '(top)': ['once', 2, 'the portal beam and the block bars: asked once a page, no time limit'] },
  'src/rendering/gearSheets.js': { loadCroppedStrip: ['shared', 1, 'loadCroppedStrip (SHARED below)'] },
  'src/rendering/hemiBust.js': { atlasRgba: [['once', 1, "the Hemi bust's atlas: no time limit, no retry"], ['local', 1, 'the same atlas from its own bytes (a blob URL), where the numbers cannot be read']] },
  /* v2.3.4930: the body bake's worker */
  'src/rendering/bodyBake.js': { bakeOnWorker: ['local', 1, "the worker's packed body or head sheet as an <img> (a blob URL of its own bytes)"] },
  'src/rendering/bodyBakeWorker.js': { loadBitmap: ['limit', 1, "a body sheet for the body bake's worker: bounded by the page's 20 s (bodyBake.js WORKER_MS), then the page bakes it itself, with its retries and later rounds"] },
  'src/rendering/keepAsImage.js': { keepAsImage: ['local', 1, "a canvas's own pixels as an <img> (a blob URL)"] },
  'src/rendering/levelUpBurstPreload.js': { warmPortrait: ['warm', 1, 'the level-up portrait, warmed; the <img> loads it at use'] },
  'src/rendering/loginSpinPreload.js': { preloadLoginSpin: ['warm', 1, "the login spin's art, fetched into the browser's cache"] },
  'src/rendering/lookPalette.js': {
    loadPng: ['limit', 1, "a look set's sheet: under timeLimit (60 s) in loadSet, no retry: a failed set is drawn the old way (asking again is the owner's call, #1505)"],
    manifestOf: ['limit', 1, "a look set's roles.json: the same 60 s limit, no retry (v2.3.4993: fetched once, the atlas plans every set's pages from them first)"],
  },
  'src/rendering/gearLookProbe.js': { '*': ['off', 1, "a QA probe (`?lookprobe`, v2.3.4998): the armour's oracle loads each combat strip the old way"] },
  'src/rendering/lookSets/gear.js': { '*': ['off', 1, 'the offline role bake (tools/art/role-bake.mjs, v2.3.4998)'] },
  'src/rendering/lookPaletteProbe.js': { '*': ['off', 2, 'a QA probe (`?lookprobe`): the stand-ins\' and (v2.3.4961) the body heads\' manifests'] },
  'src/rendering/lookSets/standinlegs.js': { '*': ['off', 1, 'the offline role bake (tools/art/role-bake.mjs)'] },
  'src/rendering/lootIcons.js': { load: ['once', 1, 'the loot icons: no time limit, no retry (the ring and label show)'] },
  'src/rendering/monsterRecolor.js': { loadImg: ['once', 1, "a monster's recolour reference: no time limit, no retry"] },
  'src/rendering/nftAvatars.js': { loadImage: ['once', 1, 'the NFT avatars: no time limit, no retry'] },
  'src/rendering/nodeLabels.js': { load: ['once', 1, "the gathering nodes' label icons: no time limit, no retry"] },
  'src/rendering/npcSprites.js': { loadNpcSprites: ['once', 1, "the townsfolk's sheets: asked once a page, no time limit (the emoji stands in)"] },
  'src/rendering/p256.js': { loadImage: ['once', 1, "an effect's 256-colour twin, loaded whole: no time limit, no retry"] },
  'src/rendering/petSprites.js': { loadPetSheet: ['retry', 1, "the pet's sheet: a failure is asked again at the next use; no time limit"] },
  'src/rendering/playerAnchors.js': { loadPlayerAnchors: ['once', 2, "the weapon's hand anchors and handles: asked once a page, no time limit"] },
  'src/rendering/playerDeathSprites.js': { loadPlayerDeathSprites: ['once', 1, "the player's death strip: asked once a page, no time limit"] },
  'src/rendering/png8Worker.js': { onmessage: ['limit', 4, "the reader's worker: a strip's read is bounded by the page's 20 s (stripRead READ_MS, then the page loads it itself); the other reads (palette pictures, object pages) by nothing; no retry"] },
  'src/rendering/rideFx.js': { preloadRideArt: ['once', 1, "the ride's effects: no time limit, no retry"] },
  'src/rendering/slimeSprites.js': { loadSheet: ['once', 1, "the slime's sheets (behind the first loading screen): no time limit, no retry"] },
  'src/rendering/statDemoPreload.js': {
    bakeBlueSlime: ['once', 1, "the stat scene's blue slime: baked once a page (v2.3.4452), no time limit"],
    warm: ['warm', 1, "the stat scene's pictures, warmed and held"],
  },
  'src/rendering/systems/effectsRenderer.js': {
    _fxLoad: ['once', 1, "the effects' pictures (about 25: projectiles, nodes, icons; the popup icons retry twice in _loadPopupIcon): no time limit"],
    _loadStandInImg: ['once', 1, "the stand-ins' strips (cook, fire, farm, chop): a time limit only for a peer's figure (PEER_FIG_LOAD_MS, asked again after PEER_FIG_RETRY_MS)"],
    _makeChop: ['once', 2, "the chop's two strips: no time limit, no retry"],
    constructor: ['retry', 1, 'crowns.json: retried at 2, 6, then every 20 s; no time limit'],
    _gearStripFrame: ['own', 1, "a stand-in's gear strip: GEAR_STRIP_TIMEOUT_MS, then later rounds (gearretry, #1505)"],
    _greavesShapeOnce: ['own', 1, "the greaves' shape from the legs' swing or bow strip, the strip itself drawn from the colour numbers (v2.3.4998): failed at GEAR_STRIP_TIMEOUT_MS, asked again at its next draw"],
    _dressedShirtFrame: ['once', 1, "a stand-in's dressed shirt: a failure is an empty entry, never asked again; no time limit"],
    _makeFarm: ['once', 1, "the farm animations' props: no time limit, no retry"],
  },
  'src/rendering/systems/tileRenderer.js': {
    _loadMapInto: ['once', 2, "a painted zone's map: no time limit, no retry"],
    rebuild: ['once', 1, "the video town's still underlay: no time limit, no retry"],
  },
  'src/rendering/tiledMaps.js': {
    loadImageZoneMaps: ['once', 1, "the painted zones' maps: no time limit, no retry"],
    preloadStartZoneMap: ['once', 1, "the starting zone's map: no time limit, no retry"],
    _loadWalkabilityMapsOnce: ['once', 1, 'the walk grids: no time limit, no retry'],
    _loadImage: ['once', 1, "a Tiled tileset's picture: no time limit, no retry"],
    _loadTileset: ['once', 1, 'a Tiled tileset: no time limit, no retry'],
    loadTiledMap: ['once', 1, 'a Tiled map: no time limit, no retry'],
  },
  'src/rendering/traitThumbs.js': { preloadTraitThumbs: ['warm', 1, "the character creator's thumbnails, warmed; each <img> loads its own"] },
  'src/rendering/traits/speciesArt.js': {
    _loadImg: ['retry', 1, "a species' picture: two more asks on an error (1.5 s, 5 s) and later rounds (_retryMissing); no time limit"],
    loadSpeciesArt: ['retry', 1, "a species' meta.json: a failure is asked again at the next use; no time limit"],
  },
  'src/rendering/warmOnce.js': { warm: ['shared', 1, 'warmOnce (SHARED below)'] },
  'src/rendering/webpImage.js': { _img: ['shared', 1, 'loadWebpOrPng (SHARED below)'] },
  'src/rendering/wheelBuildingIcons.js': { loadOne: ['once', 1, "the buildings' icons on the minimap: no time limit, no retry"] },
  'src/rendering/wheelDoors.js': { wantPicture: ['once', 1, "a dungeon mouth's picture: a failure stays 'failed' until the picture is let go of; no time limit"] },
  'src/rendering/wheelObjects.js': {
    readPageBottoms: ['local', 1, "a page's own bytes, as a blob"],
    asPicture: ['retry', 1, "an object page loaded whole: a failed page is dropped and asked again (pageDropDue, TRAPS §302); no time limit"],
  },
  'src/rendering/wheelSignposts.js': { loadOne: ['once', 1, "the signposts' land icons: no time limit, no retry"] },
  'src/rendering/worldLife.js': { preloadWorldLife: ['once', 1, "the props' moving parts: no time limit, no retry"] },
  'src/rendering/zoneBannerPreload.js': { warm: ['warm', 1, "a zone's banner, warmed and held; a failure enters the zone without it"] },
  'src/rendering/zoneTextures.js': {
    loadTracked: ['shared', 1, 'loadTracked (SHARED below)'],
    _stripByImage: ['shared', 1, "loadTrackedStrip's page way (SHARED below)"],
    __btStripCompare: ['off', 1, 'a QA probe'],
  },
  'src/ui/BroTown.jsx': {
    _callee3: ['notpic', 1, 'the NFT list (a CSV)'],
    loadAvatarImg: ['once', 1, "an NFT avatar's picture: no time limit, no retry"],
  },
  'src/ui/WorldMapOverlay.jsx': { pinImg: ['once', 1, "the world map's quest pins: an <img> asked once, never again"] },
  'src/ui/mobile/ChestReveal.jsx': { warmPrizeIcons: ['warm', 1, "the chest's prize icons, warmed; each <img> loads its own"] },
  'src/ui/mobile/DungeonClearHud.jsx': { '*': ['warm', 1, "the dungeon-clear pictures, warmed; each <img> loads its own"] },
  'src/ui/mobile/LoginSpinWindow.jsx': { LoginSpinWindow: ['warm', 1, "the login spin's art, warmed"] },
  'src/ui/mobile/dash/BoardRow.jsx': { '*': ['warm', 1, "the leaderboard's trophies, warmed; each row's <img> loads its own"] },
  'src/ui/mobile/dash/CodexStage.jsx': { loadImg: ['once', 1, "the codex stage's pictures: no time limit, no retry"] },
  'src/ui/mobile/sheet/slimePins.js': { stripFrames: ['once', 1, "the sheet's slime pins: no time limit, no retry"] },
  'src/ui/panels/AchievementBanner.jsx': { iconReady: ['once', 1, "an achievement's icon: waited ICON_WAIT_MS, then shown as it is; never asked again"] },
  'src/ui/panels/SprintButton.jsx': { SprintButton: ['warm', 1, "the sprint icon, warmed"] },
  'src/ui/petPortrait.jsx': { sheet: ['retry', 1, "the pet portrait's sheet: a failure is asked again at the next use; no time limit"] },
  'src/ui/worldMapDetail.js': { load: ['retry', 1, "the world map's detail tiles: a failed tile is asked again later (failedAt); no time limit"] },
};

/* ═══ THE SHARED LOADERS WITH NO LIMIT OR RETRY OF THEIR OWN: their callers ═══ */
const SHARED = {
  loadWebpOrPng: {
    why: 'webpImage.js: WebP or PNG, no time limit, no retry',
    callers: {
      'src/rendering/gearSheets.js': 'the gear sheets: later rounds (_retryGivenUp), NO time limit',
      'src/rendering/playerSkins.js': 'the recoloured bodies and heads: later rounds (bodyretry), NO time limit',
      'src/rendering/playerSprites.js': 'the base body sheets: two more asks and later rounds (bodyretry), NO time limit',
      'src/rendering/systems/effectsRenderer.js': "the stand-ins' bodies (_loadImg): no time limit",
      'src/rendering/lookPaletteProbe.js': 'off: a QA probe',
      'src/rendering/lookSets/body.js': 'off: the offline role bake',
      'src/rendering/lookSets/standin.js': 'off: the offline role bake',
      'src/rendering/lookSets/standinlegs.js': 'off: the offline role bake',
      'src/rendering/lookSets/bodyheads.js': 'off: the offline role bake',   /* v2.3.4961 */
    },
  },
  warmOnce: {
    why: 'warmOnce.js (v2.3.4652): a warm-up held once a URL; a failed warm is tried by the next loading screen; NO time limit',
    callers: {
      'src/rendering/controlsPreload.js': "the controls' icons", 'src/rendering/gestureCuePreload.js': 'the gesture cues',
      'src/rendering/levelUpBurstPreload.js': 'the level-up burst', 'src/rendering/questArtPreload.js': "the quest window's art",
      'src/rendering/xpBarPreload.js': "the XP bar's icons",
    },
  },
  loadCroppedStrip: {
    why: 'gearSheets.js: a time limit only when the caller passes timeoutMs; no retry of its own',
    callers: {
      'src/rendering/systems/entityRenderer.js': 'the head pieces: timeoutMs (TRAIT_LOAD_TIMEOUT_MS) and their rounds',
      'src/rendering/systems/effectsRenderer.js': 'the effect bursts and the gesture tools: no time limit, no retry',
      'src/rendering/fxStrips.js': 'the stun stars, the whirl and the fire trail: no time limit, no retry',
      'src/rendering/npcSprites.js': "the townsfolk's strips: no time limit, no retry",
    },
  },
  loadTrackedStrip: {
    why: "zoneTextures.js, the monsters' door (strip-door.test): the reader's 20 s limit, then the page's own load with none; no retry",
    callers: Object.fromEntries(['fireGoblinSprites', 'mummySprites', 'rockGolemSprites', 'rotcapSprites', 'skeletonSprites', 'snowmanSprites', 'stormEyeSprites', 'waterFrogSprites']
      .map((m) => ['src/rendering/' + m + '.js', "a monster's strips: no retry"])),
  },
  loadTracked: {
    why: 'zoneTextures.js: Assets.load recorded in a bundle; no time limit, no retry',
    callers: {
      'src/rendering/footprintSprites.js': "a zone's footprints (behind its overlay): no time limit, no retry",
      'src/rendering/fireGoblinSprites.js': "the fire goblin's fireball and Remains: no time limit, no retry",
      'src/rendering/skeletonSprites.js': "the skeleton's Remains: no time limit, no retry",
      'src/rendering/snowmanSprites.js': "the snowman's snowball and Remains: no time limit, no retry",
      'src/rendering/npcSprites.js': "the townsfolk's stills and the town's decor: no time limit, no retry",
    },
  },
};

const KINDS = new Set(['own', 'retry', 'limit', 'once', 'warm', 'kept', 'local', 'off', 'shared', 'notpic']);
const CANDIDATE = new Set(['retry', 'limit', 'once']);

/* the game's code: src/, and the ground worker with what it imports (the only code under public/ the game runs) */
function gameFiles() {
  const out = walk(join(ROOT, 'src')).filter((f) => /\.(js|jsx|mjs)$/.test(f));
  const seen = new Set(), q = [join(ROOT, 'public/tools/world/core/ground-worker.js')];
  while (q.length) {
    const f = q.pop();
    if (seen.has(f) || !existsSync(f)) continue;
    seen.add(f);
    const t = readFileSync(f, 'utf8');
    for (const m of t.matchAll(/(?:^|\n)\s*import\s[^'"]*['"](\.{1,2}\/[^'"]+)['"]/g)) q.push(resolve(dirname(f), m[1]));
    for (const m of t.matchAll(/import\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g)) q.push(resolve(dirname(f), m[1]));
  }
  return out.concat([...seen]);
}

/* 1: the doors */
await section(1, async () => {
  const RL = await import(pathToFileURL(join(ROOT, 'src/rendering/retryLooks.js')).href);
  /* a hand-run clock */
  const clock = () => { const q = []; return { q, set: (fn, ms) => { q.push({ fn, ms }); return q.length; }, clr: (h) => { if (q[h - 1]) q[h - 1].fn = null; }, fire() { for (const t of q.splice(0)) if (t.fn) t.fn(); } }; };
  const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
  {
    const c = clock();
    let answer, lateGot = null, err = null;
    const p = RL.timeLimit(new Promise((r) => { answer = r; }), 20000, (v) => { lateGot = v; }, c.set, c.clr);
    p.catch((e) => { err = e; });
    check('1. timeLimit: its clock is the limit it is given', c.q.length === 1 && c.q[0].ms === 20000);
    c.fire(); await flush();
    answer('late'); await flush();
    check('1b. ...a request that never answers rejects at it ("time limit"), and a late answer is handed over, never lost', !!err && /time limit/.test(err.message) && lateGot === 'late');
  }
  {
    const LSL = await import(pathToFileURL(join(ROOT, 'src/rendering/loadSetLater.js')).href);
    const c = clock(), asked = [], into = {};
    let gave = null;
    const later = { gaveUp: (k, again) => { gave = again; }, due: () => false };
    const set = LSL.loadSetLater({ files: { bar: '/bar.png' }, into, later, setTimer: c.set, clearTimer: c.clr,
      load: (u) => { asked.push(u); return asked.length === 1 ? new Promise(() => {}) : Promise.resolve('tex'); } });
    let started = false;
    set.start().then(() => { started = true; });
    await flush();
    check('1c. loadSetLater: each file has its time limit (LOAD_SET_TIMEOUT_MS, 20 s)', c.q.length === 1 && c.q[0].ms === LSL.LOAD_SET_TIMEOUT_MS && LSL.LOAD_SET_TIMEOUT_MS === 20000);
    c.fire(); await flush();
    check('1d. ...a file that never answers settles the loading screen\'s wait and goes to the later rounds', started && typeof gave === 'function');
    gave(1); await flush();
    check('1e. ...whose round asks again past the cache and fills the slot', asked[1] === '/bar.png?g=1' && into.bar === 'tex', { asked, into });
  }
  {
    const SF = await import(pathToFileURL(join(ROOT, 'public/tools/world/core/startFetch.js')).href);
    let n = 0;
    const fetchStub = () => { n++; return n === 1 ? new Promise(() => {}) : Promise.resolve({ status: 200, ok: true, v: 'ok' }); };
    const v = await SF.startFetch('/x', (r) => r.v, { ms: 30, pauses: [1], fetch: fetchStub });
    check('1f. startFetch: a try that never answers is cut at its time limit and tried again (20 s, three tries)', v === 'ok' && n === 2 && SF.START_FETCH.ms === 20000 && SF.START_FETCH.tries === 3);
  }
  {
    /* loadTraitImg needs an <img>: its own code, run in a box with a stand-in Image and a hand-run clock */
    const vm = await import('node:vm');
    const text = src('src/rendering/traits/traitImg.js').replace(/^export\s+/gm, '');
    const timers = [], made = [];
    class Img {
      constructor() { made.push(this); }
      set src(u) { this._src = u; if (made.length >= 2 && u) Promise.resolve().then(() => { if (this.onload) this.onload(); }); }
      get src() { return this._src; }
    }
    const box = { Image: Img, location: { search: '' }, setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, clearTimeout: (h) => { if (timers[h - 1]) timers[h - 1].fn = null; }, Promise, Error, Math, Number };
    vm.createContext(box);
    vm.runInContext(text + '\nthis.__f = loadTraitImg; this.__ms = TRAIT_LOAD_TIMEOUT_MS;', box);
    let got = null;
    box.__f('/sprites/traits/hat/a/north.png').then((im) => { got = im; });
    const limit = timers.find((t) => t.ms === box.__ms);
    check('1g. loadTraitImg: a time limit (TRAIT_LOAD_TIMEOUT_MS, 20 s)', box.__ms === 20000 && !!limit);
    if (limit) limit.fn();
    await flush();
    const again = timers.find((t) => t.fn && t.ms === 2000);
    if (again) again.fn();
    await flush();
    check('1h. ...a picture that never answers is let go and asked for again past the cache', !!again && !!made[1] && got === made[1] && /[?&]r=1$/.test(made[1].src), { timers: timers.map((t) => t.ms), src: made[1] && made[1].src });
  }
});

/* 2: the scanner on made-up code */
await section(2, async () => {
  const one = (code, rel = 'src/rendering/madeUp.js') => loadsIn(rel, code);
  const raw = (code, rel) => one(code, rel).filter((s) => !s.door);
  check('2. a bare Assets.load is a load, named by the function it sits in', JSON.stringify(raw('export function loadThing(u) {\n  return Assets.load(u).then((t) => t);\n}\n').map((s) => [s.owner, s.what, s.line])) === '[["loadThing","Assets.load",2]]');
  check('2b. ...so are a new Image() and a fetch of a picture, wherever they sit (a method, an arrow, a wrapper that is no door)',
    raw('class R {\n  _make() { const im = new Image(); im.src = "/a.png"; }\n}\nconst get = async (u) => { const r = await fetch("/sprites/a.json"); };\nPromise.all(urls.map((u) => Assets.load(u)));\n').map((s) => s.owner).join() === '_make,get,(top)');
  check('2c. one inside a door is not: loadSetLater, startFetch, loadTraitImg',
    raw('const s = loadSetLater({ files, into, load: (u) => Assets.load(u) });\nconst b = startFetch(u, (r) => r.blob(), { fetch: (x, i) => fetch(x, i) });\nloadTraitImg(fetch(u));\n').length === 0
    && one('const s = loadSetLater({ files, into, load: (u) => Assets.load(u) });').length === 1);
  check('2d. timeLimit counts as a door only where its file retries after it (TIMED_AND_RETRIED)',
    raw('function f(u) { return timeLimit(Assets.load(u), 9).catch(again); }').length === 1
    && raw('function f(u) { return timeLimit(Assets.load(u), 9).catch(again); }', 'src/rendering/systems/entityRenderer.js').length === 0);
  check('2e. not a load: one in a comment or a string, the server\'s API, Texture.from(url), a property called fetch, a regex',
    raw('/* Assets.load(u) */\n// new Image()\nconst s = "fetch(\'/a.png\')";\nconst t = `Assets.load(${u})`;\nfetch(BT_API_BASE + \'/api/x\');\nfetch(\n  API_BASE + "/api/y");\nTexture.from(url);\nthis.fetch(u);\nconst re = /new Image\\(/;\n').length === 0);
  check('2f. a brace or bracket in a string or a regex does not move a load into the wrong function',
    raw('function a() { const s = "}"; const r = /[{(]/; }\nfunction b() {\n  const x = "(";\n  return Assets.load(u);\n}\n').map((s) => s.owner).join() === 'b');
  /* a new raw load in a new file, or in a listed file's new function, against today's list */
  const pet = 'src/rendering/petSprites.js';
  const petList = { [pet]: LIST[pet] };
  const found = new Map([['src/rendering/newLoader.js', one('export function loadNew(u) { return Assets.load(u); }')],
    [pet, [...loadsIn(pet, src(pet)), ...one('function loadPetHat() { return Assets.load(HAT); }', pet)]]]);
  const j = judge(found, petList);
  check('2g. against the list: a new raw load in a new file, and one in a listed file\'s new function, are each a FAIL; the listed one still passes',
    j.fresh.length === 2 && j.fresh.some((x) => /newLoader\.js:1 Assets\.load in loadNew\(\)/.test(x)) && j.fresh.some((x) => /petSprites\.js:\d+ Assets\.load in loadPetHat\(\)/.test(x)) && !j.under.length && !j.over.length, j);
  const j2 = judge(new Map([[pet, [...loadsIn(pet, src(pet)), ...one('function loadPetSheet() { return Assets.load(B); }', pet)]]]), petList);
  const j3 = judge(new Map([[pet, []]]), petList);
  check('2h. ...a second load in a listed function is a FAIL too (the count), and a load fixed is a FAIL until its line comes off',
    j2.over.length === 1 && j3.under.length === 1, { j2, j3 });
});

/* 3: the game's code */
const files = gameFiles();
const texts = new Map(files.map((f) => [relOf(f), readFileSync(f, 'utf8')]));
await section(3, async () => {
  const found = new Map();
  let all = 0, doors = 0;
  for (const [rel, t] of texts) {
    const l = loadsIn(rel, t);
    if (!l.length) continue;
    found.set(rel, l);
    all += l.length;
    doors += l.filter((s) => s.door).length;
  }
  const j = judge(found, LIST);
  check(`3. every one of the ${all} picture loads in the game's code (${files.length} files) goes through a door (${doors} do) or is on the list.  A NEW load: give it a time limit that counts as a failure AND a retry (TRAPS §257) -- load it through loadSetLater, or timeLimit plus laterRounds (retryLooks.js) -- or put it on this suite's LIST with why it needs neither`,
    j.fresh.length === 0, j.fresh);
  check('3b. ...and no listed function holds more loads than its line says (a second load in it is a new one)', j.over.length === 0, j.over);
  check('3c. ...and a load fixed (now through a door) or gone comes off the list, or its count goes down: the list only shrinks', j.under.length === 0, j.under);
  const doorFiles = [...found].filter(([, l]) => l.some((s) => s.door)).map(([f, l]) => f + ':' + l.filter((s) => s.door).map((s) => s.door).join('+')).sort();
  check('3d. the doors are where they are said to be: capes, shields, weapons, the health bars, the badges and the hat\'s hair mask, the head pieces\' pictures, the ground worker\'s start lists',
    JSON.stringify(doorFiles) === JSON.stringify(['public/tools/world/core/startFetch.js:startFetch', 'src/rendering/capeSprites.js:loadSetLater', 'src/rendering/shieldSprites.js:loadSetLater',
      'src/rendering/systems/entityRenderer.js:loadSetLater+timeLimit+loadSetLater', 'src/rendering/traits/traitImg.js:loadTraitImg', 'src/rendering/weaponSprites.js:loadSetLater']), doorFiles);
  const timed = [...texts].filter(([, t]) => /(?<![\w$.])timeLimit\s*\(/.test(blank(t))).map(([f]) => f).filter((f) => f !== 'src/rendering/retryLooks.js').sort();
  check('3e. the callers of timeLimit are the known ones (a new one says where its retry is, in TIMED_AND_RETRIED, or its loads go on the list)',
    JSON.stringify(timed) === JSON.stringify(['src/rendering/lookPalette.js', 'src/rendering/systems/entityRenderer.js']), timed);
});

/* 4: the shared loaders' callers */
await section(4, async () => {
  for (const [name, h] of Object.entries(SHARED)) {
    const callers = callersOf(texts, name);
    const want = Object.keys(h.callers).sort();
    const fresh = callers.filter((f) => !want.includes(f)), gone = want.filter((f) => !callers.includes(f));
    check(`4. ${name} (${h.why}): its ${callers.length} callers are the known ones.  A NEW caller gets no time limit or retry from it: wrap the load in a door, or add the caller here with what it lacks`, fresh.length === 0, { fresh });
    check(`4b. ...and a caller that is gone comes off the list (${name})`, gone.length === 0, { gone });
  }
});

/* 5: the list itself */
await section(5, async () => {
  const bad = [], cands = [];
  const tally = Object.create(null);
  for (const [rel, L] of Object.entries(LIST)) {
    for (const [owner, e] of Object.entries(L)) {
      for (const [kind, n, why] of entries(e)) {
        if (!KINDS.has(kind) || !(n >= 1) || typeof why !== 'string' || why.length < 8) bad.push(rel + ' > ' + owner);
        tally[kind] = (tally[kind] || 0) + n;
        if (CANDIDATE.has(kind)) cands.push(kind + '  ' + rel + ' > ' + owner + (n > 1 ? ' (' + n + ')' : ''));
      }
    }
  }
  check('5. every line on the list is a known kind, a count, and why', bad.length === 0, bad);
  check('5b. every file on the list is in the game\'s code', Object.keys(LIST).every((f) => texts.has(f)), Object.keys(LIST).filter((f) => !texts.has(f)));
  console.log('     the list: ' + Object.entries(tally).map(([k, n]) => k + ' ' + n).join(', ') + '; ' + cands.length + ' lines are candidates for a fix (retry, limit, once):');
  for (const c of cands) console.log('       ' + c);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
