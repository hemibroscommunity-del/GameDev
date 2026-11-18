/* ═══ v2.3.5943: TRAPS INTO GUARDS, THE PAGE: DRAWING, LOOKS, MEMORY AND LOADING, ONE CASE TO THE RULE (card V4 PR 4) ═══
 *
 * Grand plan step 8.2, card V4's fourth batch (the form: tools/guards/README.md,
 * "A trap held").  Each trap below was held by a node suite for ONE case (its
 * row in docs/plan/census/traps.md); this guard holds its RULE, over every
 * file of the page (src/).  §246 (the art's holes, a flood over every monster
 * sheet) is its sister guard, traps-page-holes.test.mjs, for the time.
 *
 * TRAPS §100 (the rule): every frame of body-tops.json, through headCrown, moves the crown at most CROWN_JUMP px from the frame before it (a fist's topmost pixel is a jump of 77), and no code under src/ reads the table by a frame's key but headCrown (a standing frame's `stand-` key excepted). Break: src/rendering/headCrowns.js: the 'hit-north-3' row of HEAD_CROWNS gone -> FAIL (tried 2026-11-17).
 * TRAPS §115 (the rule): a container placed on a thing at `y = X.y + 1` under src/rendering/ is in a function that names its host (`_ridesOn`), or is listed (the list only falls); depthSort keys a rider at its host's + 0.25. Break: src/rendering/worldLife.js: `if (r.c._ridesOn !== host) r.c._ridesOn = host;` gone from _updateBuildings -> FAIL (tried 2026-11-17).
 * TRAPS §192 (the rule): a Text under src/ hidden with `visible = false` (by any name a `new Text(` was put in) is listed by its function, with why; the list only falls: words gone for good are destroyed. Break: effectsRenderer.js: in _updateChatBubbles, a gone bubble's `entry.container.destroy({ children: true });` made `entry.txt.visible = false;` -> FAIL (tried 2026-11-17).
 * TRAPS §250 (the rule): a texture made from a canvas under src/ is in a function that witnesses it (`witnessCanvas`, or through `packTrimmed`), or is listed (counts only fall); every `_rebuildRenderer` asks `checkWitnesses` first; the page makes its renderer in one listed place. Break: src/rendering/gearSheets.js: sliceCropped's `const packed = packTrimmed(cv, fw, fh, n);` made `const packed = null;` -> FAIL (tried 2026-11-17).
 * TRAPS §252 (the rule): a figure's body sprite under src/rendering/ is tinted only from the listed sources (white, its look's own tint, the hit flash), and a sprite drawn over a body with the body's own texture is a one-colour fill (`_btFill`) or tinted near black. Break: entityRenderer.js: _whirlGlow's `g._btFill = true;` made `g.tint = 0xffa030;` -> FAIL (tried 2026-11-17).
 * TRAPS §259 (the rule): lookPaletteChoice over a grid of devices (Windows in three browsers, a Mac, an iPad as a Mac, phones, Linux, the address) and the closed list of functions under src/ that build a WebGL program: a new one names the Windows compile it was measured with. Break: src/game/lookPaletteChoice.js: `if (v === '0' || v === '1') return` made `if (v === '1') return` -> FAIL (tried 2026-11-17).
 * TRAPS §266 (the rule): a `.catch(` under src/ whose callback schedules a retry with setTimeout returns its next try's promise, and an async function's `catch {}` that waits does `await` the wait; today's exceptions listed. Break: src/rendering/playerSkins.js: _buildBodySheetPage's catch `return new Promise(...).then(() => buildBodySheet(...))` made `setTimeout(() => buildBodySheet(...), ms); return;` -> FAIL (tried 2026-11-17).
 * TRAPS §267 (the rule): a loop over a cache's keys under src/rendering/ that matches them by a prefix builds the prefix by a call (the key's own builder), never by hand; today's hand-built ones listed. Break: src/rendering/playerSkins.js: _pickupHeadCap's `_localPrefix = _headComboPrefix(...)` spelt `_skinStore.get() + '|' + _pantsStore.get() + '|' + _shoesStore.get()` by hand -> FAIL (tried 2026-11-17).
 * TRAPS §268 (the rule): every load-once latch under src/ (a top-level variable that keeps a promise and hands it back) drops a failure where it fails (`X = null` in a catch or a failure function) or retries on a clock, or is listed; the list only falls. Break: src/game/wheelTrial.js: wheelStart's `if (_initP && !(_initP === _failP && Date.now() >= _retryAt)) return _initP;` made `if (_initP) return _initP;` -> FAIL (tried 2026-11-17).
 * TRAPS §279 (the rule): no load under src/ is raced against a flat timer (`Promise.race` with a `setTimeout` promise in it) and no download is cut by a whole-trip limit (`AbortSignal.timeout`, a timer that aborts), but the listed ones; the zone gate's cap is gateCap and the ground's limit DL_STALL_MS counts silence. Break: src/game/zoneTransitions.js: preloadZoneAssets raced against `new Promise(function (r) { setTimeout(r, 15000); })` in place of gateCap( -> FAIL (tried 2026-11-17).
 * TRAPS §281 (the rule): the callers of the body baker that bakes on first sight (`getBodyFrame`) under src/ are a closed list (a new fixed cast drawn from it names its prewarm); prewarmFolkBodies asks lookBodyRefused; the page's bakes say their name (`noteMade`). Break: entityRenderer.js: prewarmFolkBodies' `if (!lookBodyRefused(j.pose, dir, art, look.eyeStyle)) continue;` made `if (false) continue;` -> FAIL (tried 2026-11-17).
 * TRAPS §294 (the rule): no function under src/ reads a `var` above where it first sets it (a read the same call runs before the set, outside a loop that holds both and outside an inner function), but the listed ones; the list only falls. Break: BroTown.jsx: the pet block's `now: _petNow` made `now: now` (the loop's, set below) -> FAIL (tried 2026-11-17).
 * TRAPS §299 (the rule): a component under src/ui/ that hides itself by `return null` and starts a live thing in an effect (an interval, an animation frame, a microphone) has that effect watch what hides it, and lets go of a microphone or a stream (`dictationClose`, an abort) in an effect that watches the hide, not only at unmount, or is listed; the list only falls. Break: src/ui/mobile/ChatBubble.jsx: the open effect's `if (dictationClose(recRef)) setMicState('idle');` gone (left to the unmount cleanup) -> FAIL (tried 2026-11-17).
 * TRAPS §300 (the rule): elemFxLive answers for every status in ELEM_STATUSES and every status field the draw that asks it reads, and no file under src/ keeps its own list of the statuses (a chain of three `_xUntil` reads, a list of their names). Break: src/game/elemHits.js: `|| R._wobbleUntil > now` gone from elemFxLive -> FAIL (tried 2026-11-17).
 * TRAPS §306 (the rule): every file under src/ that makes its own Web Audio nodes outside BT_AUDIO compares the context it made them in with BT_AUDIO's, and every bulk load into `_samples` (a `load...` that calls loadSample) is asked again in _rebuildContext or listed. Break: src/game/slimeAudio.js: `if (!slot.ctx || slot.ctx === BT_AUDIO.ctx) return;` gone -> FAIL (tried 2026-11-17).
 *
 * NOT HELD HERE: §305 ("a fix never turns on something nobody has seen") is a
 * judgement at the time of a fix; no scan can tell a mended dormant thing from
 * a new one (zone-leftovers.test still pins its one case).
 *
 * HOW IT READS.  The code of every file under src/ (comments dropped:
 * lib/codeOnly.mjs; strings blanked: lib/maskCode.mjs), one function at a
 * time (lib/fnSpans.mjs; an arrow or a `name = function` is named by what it
 * is put in).  Lists name a function (and a name in it), never a file and
 * line.  Card M holds BroTown.jsx and card M2 the two renderers
 * (entityRenderer.js, effectsRenderer.js): this guard READS them, and only
 * by name, so a move between their files is never a new place.  It imports
 * three pure modules of the page (headCrowns.js, lookPaletteChoice.js,
 * elemHits.js); body-tops.json is read off the disk.
 *
 * THE LISTS (the plan's rule 3): a place not listed fails, the lists only
 * fall, and a listed place that is gone fails until its name comes off.
 * Each listed place is under Found in docs/plan/status/V4.md.
 *
 * BREAK PROOF (rule 8), each tried by hand in a scratch worktree, then undone:
 *   §100  headCrowns.js: the 'hit-north-3' row gone                    -> FAIL §100 (hit-north-3: 82 px, hit-north-4: 74 px)
 *         headCrown renamed headCrown2                                 -> FAIL §100 (defined once; a read outside headCrown)
 *   §115  worldLife.js _updateBuildings: the `_ridesOn = host` line gone -> FAIL §115 (_updateBuildings new)
 *   §192  effectsRenderer.js _updateChatBubbles: a gone bubble hidden
 *         (`entry.txt.visible = false`) in place of destroyed          -> FAIL §192 (_updateChatBubbles:txt new; destroys)
 *   §250  gearSheets.js sliceCropped: `packed = null` (no packTrimmed)  -> FAIL §250 (sliceCropped new)
 *         gearSheets.js packTrimmed: its witnessCanvas line gone       -> FAIL §250 (packTrimmed witnesses)
 *         BroTown.jsx _rebuildRenderer: `checkWitnesses()` made `{ emptied: 0 }` -> FAIL §250 (asks checkWitnesses)
 *   §252  entityRenderer.js _whirlGlow: `sb.tint = 0xffa030` on the body -> FAIL §252 (_whirlGlow: 16752688 new)
 *         _whirlGlow: `g._btFill = true` made `g.tint = 0xffa030`       -> FAIL §252 (_whirlGlow not a fill)
 *   §259  lookPaletteChoice.js: only `lookpalette=1` read               -> FAIL §259 (?lookpalette=0 on Windows: windows)
 *         deviceProfile.js onWindows: the user agent's test `return false` -> FAIL §259 (winChrome, winEdge, winFirefox built)
 *         sharpPixels.js: a new `sharpShader2` with `GlProgram.from(`  -> FAIL §259 (sharpShader2 new)
 *   §266  playerSkins.js _buildBodySheetPage: `setTimeout(retry); return;` -> FAIL §266 (_buildBodySheetPage: .catch new)
 *         playerSprites.js loadSheet: the catch's wait not awaited     -> FAIL §266 (loadSheet: catch new)
 *   §267  playerSkins.js _pickupHeadCap: the prefix spelt by hand       -> FAIL §267 (_pickupHeadCap new; _headComboPrefix)
 *   §268  wheelTrial.js wheelStart: `if (_initP) return _initP;`         -> FAIL §268 (wheelStart:_initP new)
 *   §279  zoneTransitions.js: gateCap( made a flat 15 s setTimeout race -> FAIL §279 (handleZoneTransitions new; gateCap)
 *   §281  entityRenderer.js prewarmFolkBodies: its lookBodyRefused ask gone -> FAIL §281
 *   §294  BroTown.jsx: the pet block's `now: _petNow` made `now: now`    -> FAIL §294 (gameLoop:now 3 > 2)
 *   §299  ChatBubble.jsx: dictationClose gone from the open effect       -> FAIL §299 (ChatBubble:open: dictationClose( new)
 *         ChatBubble.jsx: the online poll's deps `[chatBubbleBus.open]` made `[]` -> FAIL §299 (ChatBubble:open new)
 *   §300  elemHits.js elemFxLive: `|| R._wobbleUntil > now` gone        -> FAIL §300 (wobble; _wobbleUntil)
 *         effectsRenderer.js: the peer filter's elemFxLive made its own three-field chain -> FAIL §300 (a chain)
 *         elemFxLive renamed elemFxLive2                               -> FAIL §300 (defined once)
 *   §306  slimeAudio.js: `if (!slot.ctx || slot.ctx === BT_AUDIO.ctx) return;` made `if (!slot.ctx) return;` -> FAIL §306 (slimeAudio.js)
 *         gameDisplay.js _rebuildContext: the ground steps' ask gone   -> FAIL §306 (loadGroundSteps new)
 *         _rebuildContext renamed _rebuildContext2                     -> FAIL §306 (found)
 *
 * Run from the repository's root: node tools/guards/traps-page-rules.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from './lib/fourLines.mjs';
import { codeOf, sourceFiles } from './lib/codeOnly.mjs';
import { maskCode } from './lib/maskCode.mjs';
import { spansOf, innerFn, closeOf } from './lib/fnSpans.mjs';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, process.env.TRAPS_DUMP ? 1e6 : 900)));
};
/* a census: found against known, by key; a count per key when found is a Map */
function census(tag, what, found, known) {
  const counts = found instanceof Map ? found : new Map([...found].map((k) => [k, 1]));
  const fresh = [];
  for (const [k, n] of counts) {
    if (!Object.hasOwn(known, k)) fresh.push(k);
    else if (typeof known[k] === 'object' && known[k].n !== undefined && n > known[k].n) fresh.push(`${k} (${n} > ${known[k].n})`);
  }
  const gone = Object.keys(known).filter((k) => !counts.has(k));
  if (process.env.TRAPS_DUMP) console.log('DUMP', tag, JSON.stringify(Object.fromEntries([...counts].sort())));
  check(`${tag}: ${what}: ${counts.size} today, none new`, fresh.length === 0, fresh.sort());
  check(`${tag}: every listed place is still there (a fixed one's name comes off)`, gone.length === 0, gone);
}
const esc = (s) => s.replace(/[$]/g, '\\$');

const code = codeOf(['src']);
const PAGE = [...code.keys()];
const masked = new Map();
const spans = new Map();
const M = (f) => { if (!masked.has(f)) { const m = maskCode(code.get(f)); masked.set(f, m); spans.set(f, spansOf(m)); } return masked.get(f); };
const F = (f) => { M(f); return spans.get(f).fns; };
const base = (f) => f.split('/').pop();
/* the files that define a function by its name (a move between files is not a new place) */
const definers = (name) => PAGE.filter((f) => code.get(f).includes(name) && new RegExp('(?:function\\s+' + esc(name) + '\\s*\\(|(?<![\\w$.])' + esc(name) + '\\s*\\([^()]*\\)\\s*\\{|(?:const|let|var)\\s+' + esc(name) + '\\s*=\\s*(?:async\\s*)?(?:function|\\(|[\\w$]+\\s*=>)|(?<![\\w$.])' + esc(name) + '\\s*:\\s*function)').test(M(f)));

/* v2.3.5943: an arrow or an anonymous function is named by what it is put in
   (`const X = (...) =>`, `X: function (...)`, `B.X = function`), else the
   nearest named one round it */
function label(f, p) {
  const m = M(f);
  let best = null;
  for (const s of F(f)) {
    if (!(s.a < p && p < s.b) || (best && s.a < best.a)) continue;
    let name = s.name;
    if (name === '=>' || name === 'function') {
      const pre = m.slice(Math.max(0, s.a - 240), s.a);
      const a = /([\w$]+)\s*[=:]\s*(?:async\s*)?(?:function\s*[\w$]*\s*)?\([^()]*\)\s*(?:=>\s*)?$/.exec(pre)
        || /([\w$]+)\s*[=:]\s*(?:async\s*)?[\w$]+\s*=>\s*$/.exec(pre)
        || /(?:memo|forwardRef)\(\s*(?:function\s*)?([\w$]+)?\s*\([^()]*\)\s*$/.exec(pre);
      name = a && a[1] ? a[1] : null;
    }
    if (name) best = { a: s.a, name };
  }
  return best ? best.name : '(top)';
}
/* the innermost function span round p (named or not) */
const spanAt = (f, p) => innerFn(F(f), p);
/* the body of the labelled function round p */
function bodyAt(f, p) {
  const m = M(f);
  const want = label(f, p);
  let s = null;
  for (const x of F(f)) if (x.a < p && p < x.b && (!s || x.a > s.a) && label(f, x.a + 1) === want) s = x;
  return s ? { a: s.a, b: s.b, text: m.slice(s.a, s.b) } : { a: 0, b: m.length, text: m };
}

/* the body of the function (or method) named `name` in file f, or '' */
function fnBody(f, name) {
  const s = F(f).find((x) => x.name === name);
  if (s) return M(f).slice(s.a, s.b);
  const m = M(f);
  const i = m.search(new RegExp('(?<![\\w$.])' + esc(name) + '\\s*[=:]\\s*(?:async\\s*)?(?:function\\s*[\\w$]*\\s*)?\\([^()]*\\)\\s*(?:=>\\s*)?\\{'));
  if (i < 0) return '';
  const o = m.indexOf('{', m.indexOf(')', i));
  return m.slice(o, closeOf(m, o) + 1);
}

/* ── §100: the crown is the head's, on every frame ── */
const CROWN_JUMP = 45;   /* px a frame: the body's own moves reach 37 (hit-southwest); the fist of #100 jumped 77-82 */
{
  const hcFile = definers('headCrown');
  check(`§100: headCrown is defined once under src/ (${hcFile.map(base)})`, hcFile.length === 1, hcFile);
  if (hcFile.length === 1) {
    const { headCrown, HEAD_CROWNS } = await import(pathToFileURL(join(ROOT, hcFile[0])).href);
    const tops = JSON.parse(readFileSync(join(ROOT, 'public/sprites/player/body-tops.json'), 'utf8'));
    const by = new Map();
    for (const k of Object.keys(tops)) {
      const x = /^(.*)-([a-z]+)-(\d+)$/.exec(k);
      if (!x) continue;
      const pd = x[1] + '|' + x[2];
      if (!by.has(pd)) by.set(pd, []);
      by.get(pd).push(+x[3]);
    }
    const jumps = [];
    let pairs = 0;
    for (const [pd, frames] of by) {
      const [pose, dir] = pd.split('|');
      frames.sort((a, b) => a - b);
      for (let i = 1; i < frames.length; i++) {
        const a = headCrown(tops, pose, dir, frames[i - 1]), b = headCrown(tops, pose, dir, frames[i]);
        pairs++;
        const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (d > CROWN_JUMP) jumps.push(`${pose}-${dir}-${frames[i]}: ${Math.round(d)} px`);
      }
    }
    check(`§100: body-tops' frames are read (${Object.keys(tops).length}, ${pairs} steps; HEAD_CROWNS ${Object.keys(HEAD_CROWNS).length})`, pairs > 150);
    check(`§100: through headCrown no frame's crown jumps more than ${CROWN_JUMP} px from the one before (a jump is the topmost pixel on a fist, not the head)`, jumps.length === 0, jumps);
  }
  const lk = definers('_lookupBodyTop');
  check('§100: _lookupBodyTop (the renderers\' one reader) answers through headCrown', lk.length === 1
    && /headCrown\(/.test(fnBody(lk[0], '_lookupBodyTop')), lk);
  const reads = [];
  let n = 0;
  for (const f of PAGE) {
    const m = M(f);
    const c = code.get(f);
    if (/body-tops\.json/.test(c) && !/[bB]odyTops/.test(m)) reads.push(base(f) + ': fetches body-tops.json into a name the scan cannot read');
    for (const x of m.matchAll(/(?<![\w$.])_?[bB]odyTops\[/g)) {
      n++;
      if (label(f, x.index) === 'headCrown') continue;
      if (/^\[`stand-/.test(c.slice(x.index + x[0].length - 1))) continue;
      reads.push(label(f, x.index) + ': ' + c.slice(x.index, x.index + 40));
    }
  }
  check(`§100: every read of the body-tops table by a frame's key goes through headCrown (${n} reads)`, n >= 2 && reads.length === 0, reads);
}

/* ── §115: a rider names its host ── */
const RIDE_KNOWN = {
  step: 'buildingFire.js: a spark\'s halo at its own spark\'s y + 1, inside the fire\'s root, which rides its building (ride())',
  _propOverlay: 'effectsRenderer.js: the marks and stuck arrows of §104 still sort at +1 (TRAPS §115 "Not yet covered")',
  _updateGlints: 'worldLife.js: a glint\'s container put in its prop\'s layer at y + 1 with no _ridesOn (Found)',
};
{
  const ds = definers('applyGroundSort');
  check(`§115: depthSort's applyGroundSort is found (${ds.map(base)})`, ds.length === 1, ds);
  if (ds.length === 1) {
    const m = M(ds[0]);
    check('§115: it keys a rider (`_ridesOn`) at its host\'s ground + 0.25', /=[\w$.]*_ridesOn/.test(m) && /\+\s*\.25(?![\d])/.test(m));
  }
  const found = new Set();
  let n = 0;
  for (const f of PAGE.filter((p) => p.startsWith('src/rendering/'))) {
    const m = M(f);
    for (const x of m.matchAll(/\.y=[^;,]*?(?<![\w$])[\w$.]+\.y\+1(?![\d.\w$*])/g)) {
      n++;
      if (/_ridesOn/.test(bodyAt(f, x.index).text)) continue;
      found.add(label(f, x.index));
    }
  }
  check(`§115: the placements at a thing's y + 1 are read (${n})`, n >= 3, n);
  census('§115', 'containers placed at y + 1 on a thing in a function that names no host (_ridesOn)', found, RIDE_KNOWN);
}

/* ── §192: a Text that is gone is destroyed ── */
/* each a Text hidden and shown again: its picture stays on the chip while it
   is hidden (Found: one gone for good is destroyed or set to '') */
const TEXT_HIDDEN_KNOWN = {
  '_attachNamePill:lvlNumT': 'entityRenderer.js: a name pill\'s level number, hidden while it has none',
  '_layout:lv': 'nodeLabels.js: a node\'s level label, hidden while not shown',
  '_layout:name': 'nodeLabels.js: a node\'s name label, hidden while not shown',
  '_renderCoinOverlay:_pixiCoinLabel': 'effectsRenderer.js: the coin pile\'s label, hidden between piles',
  '_renderOwnerLabel:_pixiOwnerLabel': 'effectsRenderer.js: a pile\'s owner label, hidden between piles',
  '_updateGroundLoot:_pixiLabel': 'effectsRenderer.js: a ground drop\'s label, hidden while far',
  '_updateGroundLoot:_pixiRareLabel': 'effectsRenderer.js: a rare drop\'s label, hidden while far',
  '_updateGroundLoot:_pixiWpnLabel': 'effectsRenderer.js: a weapon drop\'s label, hidden while far',
  '_updateNPCs:nameText': 'entityRenderer.js: a townsperson\'s name, hidden while far',
  'createOtherPlayerDisplay:nameText': 'entityRenderer.js: another player\'s name, hidden until set',
  'createPlayerDisplay:stunTimerText': 'entityRenderer.js: the stun timer, hidden until stunned',
  'mk:t': 'entityRenderer.js (_updatePlayerHud): a HUD number, hidden while empty',
  'mkSpent:t': 'entityRenderer.js (_updatePlayerHud): a HUD number, hidden while empty',
  'rebuild:t': 'tileRenderer.js: a tile\'s label, hidden on a rebuild',
};
{
  const found = new Set();
  let texts = 0;
  for (const f of PAGE) {
    if (!/new (?:PIXI\.)?Text\(/.test(code.get(f))) continue;
    const m = M(f);
    const names = new Set();
    for (const x of m.matchAll(/(?:(?<![\w$])|\.)([\w$]+)=new (?:PIXI\.)?Text\(/g)) { names.add(x[1]); texts++; }
    for (const nm of names) {
      for (const x of m.matchAll(new RegExp('(?<![\\w$])' + esc(nm) + '\\.visible=(?:false|!1)', 'g'))) found.add(label(f, x.index) + ':' + nm);
    }
  }
  check(`§192: the page's Texts are read (${texts} made)`, texts >= 30, texts);
  census('§192', 'Texts hidden (visible = false) and kept, by function and name', found, TEXT_HIDDEN_KNOWN);
  const cb = definers('_updateChatBubbles');
  check('§192: _updateChatBubbles (#192\'s bubbles) destroys a bubble that goes', cb.length === 1
    && /\.destroy\(/.test(fnBody(cb[0], '_updateChatBubbles')), cb);
}

/* ── §250: a picture kept on a canvas is witnessed ── */
/* by function, with how many textures from a canvas it makes unwitnessed:
   each one comes back blank if Safari empties its canvas in a parked tab and
   a facing or a rebuild first uploads it then (Found) */
const CANVAS_KNOWN = {
  _buildSheet: { n: 1, why: 'gearSheets.js' },
  _croppedTexture: { n: 1, why: 'entityRenderer.js' },
  _fishTopFrame: { n: 1, why: 'entityRenderer.js' },
  _placeLocal: { n: 1, why: 'wheelMinimap.js' },
  _placeUnder: { n: 2, why: 'wheelGround.js, wheelMinimap.js' },
  _stripFrames: { n: 1, why: 'zoneTextures.js' },
  _texFrom: { n: 1, why: 'speciesArt.js' },
  add: { n: 1, why: 'wheelShatter.js' },
  atlas: { n: 2, why: 'campfireFx.js, hitMaterialFx.js' },
  bakeChipsFrom: { n: 1, why: 'hitMaterialFx.js' },
  build: { n: 6, why: 'eyeStyleColorCatalog.js, eyewearColorCatalog.js, facialHairColorCatalog.js, hairColorCatalog.js, hatColorCatalog.js, shirtColorCatalog.js' },
  buildHotArrowArt: { n: 1, why: 'hotArrowFx.js' },
  canvasTexture: { n: 2, why: 'landAuras.js, wheelLife.js' },
  debrisDotTex: { n: 1, why: 'effectsRenderer.js' },
  done: { n: 2, why: 'nodeLabels.js' },
  footprintTexture: { n: 1, why: 'tileRenderer.js' },
  getNftTextures: { n: 2, why: 'nftAvatars.js' },
  glowTex: { n: 1, why: 'staffCastFx.js' },
  groundDecalTex: { n: 1, why: 'effectsRenderer.js' },
  hardDotTex: { n: 1, why: 'effectsRenderer.js' },
  loadMonsterRecolor: { n: 1, why: 'monsterRecolor.js' },
  lootBeamTexture: { n: 1, why: 'lootIcons.js' },
  makeBeamTexture: { n: 1, why: 'effectsRenderer.js' },
  makeMoteTexture: { n: 1, why: 'effectsRenderer.js' },
  mint: { n: 1, why: 'weaponFeelFx.js' },
  mintFxSheet: { n: 1, why: 'worldLife.js' },
  mintGrottoFx: { n: 1, why: 'grottoFx.js' },
  mk: { n: 1, why: 'ambientFx.js' },
  onload: { n: 2, why: 'farmWorld.js, wheelSignposts.js' },
  packImages: { n: 1, why: 'monsterShotFx.js' },
  propSlashTex: { n: 1, why: 'effectsRenderer.js' },
  puffTex: { n: 1, why: 'wheelShatter.js' },
  reference: { n: 1, why: 'entityRenderer.js' },
  shrink: { n: 2, why: 'dropIcons.js, lootIcons.js' },
  softBake: { n: 1, why: 'weaponSprites.js' },
  softPuff: { n: 1, why: 'hitMaterialFx.js' },
  softShadow: { n: 1, why: 'hitMaterialFx.js' },
  splinterTex: { n: 1, why: 'effectsRenderer.js' },
  sqTex: { n: 1, why: 'staffCastFx.js' },
  toTex: { n: 1, why: 'worldFxTextures.js' },
  warmElemWindup: { n: 1, why: 'elemWindup.js' },
  warmSootMarks: { n: 1, why: 'sootMarks.js' },
  warmStormSparks: { n: 1, why: 'stormSparksFx.js' },
  warmWaterAttack: { n: 1, why: 'waterAttackFx.js' },
  wheelBuildingIconTexture: { n: 1, why: 'wheelBuildingIcons.js' },
  wheelScorch: { n: 1, why: 'wheelObjects.js' },
};
{
  const SITE = /\bTexture\.from\(\s*([^)]{0,80})|\bnew\s+CanvasSource\s*\(/g;
  const FILE_LIKE = /img|image|url|src|bitmap|video|['"`]/i;   /* lib/canvasPictures.mjs's reading: a file's texture is not a canvas's */
  const found = new Map();
  let sites = 0, witnessed = 0;
  for (const f of PAGE) {
    const c = code.get(f);
    for (const x of c.matchAll(SITE)) {
      if (x[1] !== undefined) {
        const first = x[1].trim().split(/[\s,)?:]/)[0];
        if (!first || FILE_LIKE.test(first) || /createImageBitmap/.test(x[1])) continue;
      }
      sites++;
      if (/witnessCanvas\(|packTrimmed\(/.test(bodyAt(f, x.index).text)) { witnessed++; continue; }
      const k = label(f, x.index);
      found.set(k, (found.get(k) || 0) + 1);
    }
  }
  check(`§250: the page's textures from a canvas are read (${sites}, ${witnessed} witnessed)`, sites >= 50 && witnessed >= 5, { sites, witnessed });
  census('§250', 'functions that make a texture from a canvas with no witness', found, CANVAS_KNOWN);
  const pt = definers('packTrimmed');
  check(`§250: packTrimmed witnesses what it packs (${pt.map(base)})`, pt.length === 1 && /witnessCanvas\(/.test(fnBody(pt[0], 'packTrimmed')), pt);
  /* every way of bringing the graphics back asks the witnesses first */
  const rebuilds = [];
  for (const f of PAGE) {
    const m = M(f);
    for (const x of m.matchAll(/_rebuildRenderer=(?:async\s*)?(?:function\s*[\w$]*\s*\([^()]*\)|\([^()]*\)\s*=>)\s*\{/g)) {
      const o = x.index + x[0].length - 1;
      rebuilds.push({ f: base(f), asks: /checkWitnesses\(/.test(m.slice(o, closeOf(m, o))) });
    }
  }
  check(`§250: every _rebuildRenderer asks checkWitnesses before it uploads again (${rebuilds.length})`, rebuilds.length >= 1 && rebuilds.every((r) => r.asks), rebuilds);
  const apps = new Set();
  for (const f of PAGE) for (const x of M(f).matchAll(/new Application(?![\w$])|(?<![\w$.])autoDetectRenderer\(/g)) apps.add(label(f, x.index));
  check(`§250: the page makes its renderer in one place (${[...apps]}): a second one asks the witnesses too, and is listed here`,
    apps.size === 1 && apps.has('createPixiApp'), [...apps]);
}

/* ── §252: a tint multiplies; one colour is a fill ── */
/* the sources a figure's body is tinted from, by function: white, its look's
   own colour, the hit flash (multiplied: it only takes colour away) */
const BODY_TINT_KNOWN = {
  '_drawFolk: 16777215': 'entityRenderer.js: a townsperson, white (no tint)',
  '_updateMonsters: wheelStageTint': 'entityRenderer.js: a monster\'s stage colour over its variant\'s (its look)',
  '_updateMonsters: wantTintV': 'entityRenderer.js: the hit flash (0xff8080) or the variant\'s own',
  '_updateMonsters: wantTintS': 'entityRenderer.js: the hit flash (0xff8080) or the slime\'s own',
  '_updateMonsters: wantTintN': 'entityRenderer.js: the hit flash (0xff8080) or the kind\'s own',
  '_updateOtherPlayers: 16777215': 'entityRenderer.js: another player, white',
  '_updateOtherPlayers: _fsTintR': 'entityRenderer.js: another player\'s full-set colour (_fullsetTint, the armour\'s look)',
  '_updatePlayer: 16777215': 'entityRenderer.js: you, white',
  '_updatePlayer: _fsTint': 'entityRenderer.js: your full-set colour (_fullsetTint, the armour\'s look)',
};
{
  const found = new Set();
  let n = 0;
  for (const f of PAGE.filter((p) => p.startsWith('src/rendering/'))) {
    const m = M(f);
    const c = code.get(f);
    for (const x of m.matchAll(/(?<![\w$])(?:[\w$]+\.)*(?:_spriteBody|spriteBody|sb)\.tint=(?!=)/g)) {
      n++;
      const rhs = c.slice(x.index + x[0].length).match(/^[\w$.]+/);
      found.add(label(f, x.index) + ': ' + (rhs ? rhs[0] : '?'));
    }
  }
  check(`§252: the tints put on a figure's body sprite are read (${n})`, n >= 8, n);
  census('§252', 'tints put on a figure\'s body, by function and source', found, BODY_TINT_KNOWN);
  /* a sprite drawn over a body with the body's own texture */
  const overs = [];
  const bad = [];
  for (const f of PAGE.filter((p) => p.startsWith('src/rendering/'))) {
    const m = M(f);
    const c = code.get(f);
    for (const x of m.matchAll(/\.texture=(?:[\w$]+\.)*(?:_spriteBody|sb)\.texture/g)) {
      const fn = label(f, x.index);
      overs.push(fn);
      if (/_btFill=(?:true|!0)/.test(bodyAt(f, x.index).text)) continue;
      /* or tinted near black: a multiply to black reads black on any monster */
      const t = /(?<![\w$.])TINT=(\d+)/.exec(c);
      const v = t ? +t[1] : -1;
      if (v >= 0 && /\.tint=TINT/.test(m) && ((v >> 16) & 255) <= 0x20 && ((v >> 8) & 255) <= 0x20 && (v & 255) <= 0x20) continue;
      bad.push(fn);
    }
  }
  check(`§252: the sprites drawn over a body with its own texture are read (${overs.join(', ')})`, overs.length >= 2 && overs.includes('_whirlGlow'), overs);
  check('§252: each is a one-colour fill (`_btFill`, fillBatch.js) or tinted near black, never a colour by tint', bad.length === 0, bad);
}

/* ── §259: a program grows only with its Windows compile measured ── */
/* each builds a WebGL program (or filter); a new one, or one grown, has its
   compile measured on a Windows computer first (ANGLE's FXC inlines) */
const PROGRAM_BUILDERS = {
  alphaClipShader: 'hairClip.js: the stencil clip that keeps half-there texels',
  batchShader: 'paletteTex.js: the colour numbers\' batch',
  clipBatchShader: 'paletteTex.js: the colour numbers\' clip',
  clipShader: 'hairClip.js: the hair mask\'s clip',
  fillBatchShader: 'paletteTex.js: the colour numbers\' one-colour fill',
  fillShader: 'fillBatch.js: the one-colour fill (TRAPS §252)',
  lookShader: 'lookPalette.js: the look palette (NOT built on Windows or a Mac: TRAPS §259)',
  lookSheenShader: 'lookPalette.js: the look palette with the shine (built with it)',
  makeGlintFilter: 'lightfx/glint.js: the glint filter',
  makeShadowFilter: 'lightfx/shadows.js: the shadow filter',
  meshShader: 'paletteTex.js: the colour numbers on a mesh',
  oneShader: 'paletteTex.js: the one sprite program (ONE_BATCHER)',
  palProgram: 'wheelWater.js: the water over colour numbers (two: all and one)',
  program: 'wheelWater.js: the water (two: all and one)',
  shadeProgram: 'lightfx/shadows.js: the shade quad',
  sharpShader: 'sharpPixels.js: the sharp pixels batch',
  sheenShader: 'lightfx/sheenBatch.js: the shine batch',
};
{
  const lpc = definers('lookPaletteChoice');
  check(`§259: lookPaletteChoice is defined once (${lpc.map(base)})`, lpc.length === 1, lpc);
  if (lpc.length === 1) {
    const { lookPaletteChoice } = await import(pathToFileURL(join(ROOT, lpc[0])).href);
    const UA = {
      winChrome: ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36', undefined, 0],
      winEdge: ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0', undefined, 0],
      winFirefox: ['Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0', undefined, 0],
      winPlatform: ['Mozilla/5.0', 'Windows', 0],
      macSafari: ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15', undefined, 0],
      macChrome: ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36', 'macOS', 0],
      macFirefox: ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0', undefined, 0],
      iphone: ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1', undefined, 5],
      ipadAsMac: ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15', undefined, 5],
      android: ['Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36', undefined, 5],
      linux: ['Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36', undefined, 0],
    };
    const want = { winChrome: 'windows', winEdge: 'windows', winFirefox: 'windows', winPlatform: 'windows', macSafari: 'mac', macChrome: 'mac', macFirefox: 'mac', iphone: 'default', ipadAsMac: 'default', android: 'default', linux: 'default' };
    const wrong = [];
    for (const [k, [ua, plat, touch]] of Object.entries(UA)) {
      const c = lookPaletteChoice('', ua, plat, touch);
      if (c.why !== want[k] || c.on !== (want[k] === 'default')) wrong.push({ k, got: c });
      for (const [q, on] of [['?lookpalette=0', false], ['?world=wheel&lookpalette=1', true]]) {
        const a = lookPaletteChoice(q, ua, plat, touch);
        if (a.on !== on || a.why !== 'address') wrong.push({ k, q, got: a });
      }
    }
    check(`§259: the look palette is built on no Windows and no Mac computer, on every phone and tablet, and the address first (${Object.keys(UA).length} devices x 3)`, wrong.length === 0, wrong);
  }
  const lp = definers('prewarmProgram');
  check('§259: the look palette\'s prewarm (prewarmProgram) asks the choice before it builds', lp.length === 1
    && /(?<![\w$.])_wanted(?![\w$])/.test(fnBody(lp[0], 'prewarmProgram'))
    && (() => { const w = /(?<![\w$.])_wanted=([\w$]+)\(/.exec(M(lp[0])); return !!w && /lookPaletteChoice\(/.test(fnBody(lp[0], w[1])); })(), lp);
  const found = new Set();
  for (const f of PAGE) for (const x of M(f).matchAll(/(?<![\w$])(?:GlProgram\.from|new GlProgram|compileHighShaderGlProgram|Filter\.from|new Filter)\(/g)) found.add(label(f, x.index));
  census('§259', 'functions that build a WebGL program or filter', found, PROGRAM_BUILDERS);
}

/* ── §266: a retry on the loading screen's road returns its promise ── */
const RETRY_KNOWN = {
  'constructor: .catch': 'effectsRenderer.js: the skill crowns (crowns.json) retried on a timer; `_crowns(0)` is never awaited, so no loading screen waits on it',
};
{
  const found = new Set();
  let n = 0;
  for (const f of PAGE) {
    const m = M(f);
    for (const x of m.matchAll(/\.catch\(/g)) {
      const o = x.index + x[0].length - 1;
      const body = m.slice(o, closeOf(m, o));
      if (!/(?<![\w$.])setTimeout\(/.test(body)) continue;
      n++;
      if (/return new Promise|return [\w$]/.test(body)) continue;
      found.add(label(f, x.index) + ': .catch');
    }
    for (const x of m.matchAll(/(?<![\w$.])catch(?:\([\w$]*\))?\{/g)) {
      const o = x.index + x[0].length - 1;
      const body = m.slice(o, closeOf(m, o));
      if (!/(?<![\w$.])setTimeout\(/.test(body)) continue;
      const s = spanAt(f, x.index);
      if (!s || !/async\s*(?:function\s*[\w$]*\s*)?(?:\([^()]*\)\s*(?:=>\s*)?|[\w$]+\s*=>\s*)$|async\s+[\w$]+\s*\([^()]*\)\s*$/.test(m.slice(Math.max(0, s.a - 200), s.a))) continue;
      n++;
      if (/await new Promise\([^]*?setTimeout\(/.test(body)) continue;
      found.add(label(f, x.index) + ': catch');
    }
  }
  check(`§266: the retries scheduled in a failure's handler are read (${n})`, n >= 6, n);
  census('§266', 'retries scheduled in a .catch that hand back no promise (or an async catch that does not await its wait)', found, RETRY_KNOWN);
}

/* ── §267: a cache key and its matcher share one builder ── */
const PREFIX_KNOWN = {
  _dropCache: 'framePack.js: `src.uid + \':\'`, spelt again by hand where the key is made (Found)',
  framePackHeld: 'framePack.js: the same prefix by hand (Found)',
  touchArt: 'gearSheets.js: `\'shirtart/\' + oldest + \'/\'` by hand (Found)',
};
{
  const found = new Set();
  let n = 0;
  for (const f of PAGE.filter((p) => p.startsWith('src/rendering/'))) {
    const m = M(f);
    const c = code.get(f);
    for (const x of m.matchAll(/(?<![\w$])([\w$]+)\.startsWith\(/g)) {
      const r = x[1];
      const body = bodyAt(f, x.index).text;
      /* a loop over a cache's keys: `for (const k of ...)` / `for (const [k, v] of ...)` */
      if (!new RegExp('for\\((?:const|let|var)\\s*(?:' + esc(r) + '|\\[' + esc(r) + ',[^\\]]*\\])\\s*of ').test(body)) continue;
      const o = x.index + x[0].length - 1;
      const arg = c.slice(o + 1, closeOf(m, o)).trim();
      if (/^["'][^"'`+]*["']$/.test(arg)) continue;   /* a fixed word (a probe's `__bt`) is not a key's prefix */
      n++;
      /* v2.3.5943: the prefix is a builder's when it is ONE call (`b(...)`), or
         a name set to one call, with at most fixed separators after it
         (`_localPrefix + '|'`); a call joined to other parts (`a.get() + '|' +
         b.get()`) is spelt by hand */
      const oneCall = (t) => { t = t.trim(); const k = /^[\w$.]+\(/.exec(t); return !!k && closeOf(t, k[0].length - 1) === t.length - 1; };
      const am = maskCode(arg);
      const parts = am.split('+').map((q) => q.trim());
      const rest = parts.slice(1).every((q) => /^(["'`]).*\1$/.test(q));
      let ok = false;
      if (rest && oneCall(parts[0])) ok = true;
      else if (rest && /^[\w$]+$/.test(parts[0])) {
        const d = new RegExp('(?<![\\w$.])' + esc(parts[0]) + '=(?!=)([^;]*)').exec(body);
        ok = !!d && oneCall(d[1]);
      }
      if (ok) continue;
      found.add(label(f, x.index));
    }
  }
  check(`§267: the prefix matches over a cache's keys are read (${n})`, n >= 3, n);
  census('§267', 'loops over a cache\'s keys that build the prefix they match by hand', found, PREFIX_KNOWN);
  const hk = definers('_headComboPrefix');
  check('§267: the head cache\'s key (_headSheetKey) and its guard (_pickupHeadCap) both call _headComboPrefix', hk.length === 1
    && /_headComboPrefix\(/.test(fnBody(hk[0], '_headSheetKey')) && /_headComboPrefix\(/.test(fnBody(hk[0], '_pickupHeadCap')), hk);
}

/* ── §268: a load-once latch lets a failure go ── */
/* each keeps its first start's promise for the page: whether that can
   reject, or resolve with a gap a later ask never fills, is Found (the
   rule: drop a failure where it fails, try again after a wait, as
   wheelTrial.js wheelStart does) */
const LATCH_KNOWN = {
  '(top):_mode': 'chatChannel.js: the scan\'s guess (a channel mode, not a download)',
  '_ensureBodyData:_bodyDataPromise': 'entityRenderer.js: the body\'s anchors and tops (its fetches retry inside)',
  'bakeBlueSlime:_blueBaking': 'statDemoPreload.js: the blue slime\'s bake',
  'ensureArrowBlastTex:_arrowBlastLoad': 'effectsRenderer.js: the arrow blast\'s strip',
  'ensureSnowballBurstTex:_snowballBurstLoad': 'effectsRenderer.js: the snowball burst\'s strip',
  'loadBodyTops:_bodyTopsPromise': 'characterPortrait.js: body-tops for the portrait (a failure kept as null)',
  'loadFireGoblinSprites:loadPromise': 'fireGoblinSprites.js',
  'loadLevelUpNumbers:_first': 'levelUpBurstNumbers.js',
  'loadMummySprites:loadPromise': 'mummySprites.js',
  'loadNpcSprites:_done': 'npcSprites.js',
  'loadPlayerAnchors:loadPromise': 'playerAnchors.js (allSettled: a failed file kept for the page)',
  'loadPlayerSprites:loadPromise': 'playerSprites.js (its sheets retry inside)',
  'loadRockGolemSprites:loadPromise': 'rockGolemSprites.js',
  'loadRotcapSprites:loadPromise': 'rotcapSprites.js',
  'loadShieldSprites:loadPromise': 'shieldSprites.js',
  'loadSignpostIcons:_iconsLoading': 'wheelSignposts.js',
  'loadSkeletonSprites:loadPromise': 'skeletonSprites.js',
  'loadSlimePins:_loading': 'slimePins.js',
  'loadSlimeSingles:singlesPromise': 'slimeSprites.js',
  'loadSnowmanSprites:loadPromise': 'snowmanSprites.js',
  'loadStormEyeSprites:loadPromise': 'stormEyeSprites.js',
  'loadWalkabilityMaps:_walkPromise': 'tiledMaps.js',
  'loadWaterFrogSprites:loadPromise': 'waterFrogSprites.js',
  'loadWeaponSprites:loadPromise': 'weaponSprites.js',
  'loadWheelBuildingIcons:_loading': 'wheelBuildingIcons.js',
  'openSoundStudio:_opening': 'soundStudio.js: the studio\'s import',
  'preloadCoinPiles:_p': 'coinPileArt.js',
  'preloadDailyChest:_p': 'chestPreload.js',
  'preloadFarmArt:_loadP': 'farmWorld.js',
  'preloadLootIcons:_p': 'lootIcons.js',
  'preloadNodeLabelIcons:_p': 'nodeLabels.js',
  'selfTestReady:_allDone': 'selfTest.js: the self-tests\' end (not a download)',
  'sheet:_imgReady': 'petPortrait.jsx: the pet sheet\'s image',
  'whenPaletteDecided:_decided': 'p256.js: the palette\'s choice (not a download)',
};
{
  const PROM = /^(?:fetch\(|import\(|new Promise|Promise\.|[\w$.]*(?:load|Load|start|Start|warm|Warm)[\w$]*\(|[^;]*\.then\()/;
  const found = new Set();
  let latches = 0;
  for (const f of PAGE) {
    const m = M(f);
    const fns = F(f);
    const tops = new Set();
    for (const x of m.matchAll(/(?:^|[;}])let ([^;]+)/g)) {
      if (innerFn(fns, x.index)) continue;
      for (const d of x[1].split(',')) { const nm = /^\s*([\w$]+)/.exec(d); if (nm) tops.add(nm[1]); }
    }
    if (!tops.size) continue;
    const fails = [];
    for (const x of m.matchAll(/\.catch\(/g)) { const o = x.index + x[0].length - 1; fails.push([o, closeOf(m, o)]); }
    for (const x of m.matchAll(/(?<![\w$.])catch(?:\([\w$]*\))?\{/g)) { const o = x.index + x[0].length - 1; fails.push([o, closeOf(m, o)]); }
    for (const s of fns) if (/fail|Fail|reject|Reject/.test(s.name)) fails.push([s.a, s.b]);
    for (const X of tops) {
      const e = esc(X);
      const asg = [...m.matchAll(new RegExp('(?<![\\w$.])' + e + '(?:=|\\|\\|=|\\?\\?=)(?!=)', 'g'))]
        .filter((a) => PROM.test(m.slice(a.index + a[0].length).trimStart()));
      if (!asg.length) continue;
      if (!new RegExp('return ' + e + '(?![\\w$.])|' + e + '\\|\\|\\(' + e + '=|' + e + '\\?\\?=').test(m)) continue;
      latches++;
      const drops = [...m.matchAll(new RegExp('(?<![\\w$.])' + e + '=(?:null|void 0|undefined|false)(?![\\w$])', 'g'))].map((d) => d.index);
      if (drops.some((p) => fails.some(([a, b]) => a < p && p < b))) continue;
      /* or retried on a clock: the hand-back asks the time */
      if (new RegExp('if\\(' + e + '&&[^)]*(?:Date\\.now\\(\\)|performance\\.now\\(\\))[^)]*\\)\\)?return ' + e).test(m)) continue;
      found.add(label(f, asg[0].index) + ':' + X);
    }
  }
  check(`§268: the page's load-once latches are read (${latches})`, latches >= 20, latches);
  census('§268', 'load-once latches that keep what their first start gave (no drop where it fails, no clock)', found, LATCH_KNOWN);
}

/* ── §279: slow is not hung ── */
/* each judged on this box, where every file is there at once: on a thin
   line a flat limit lets go of a load still arriving (Found) */
const FLAT_KNOWN = {
  '_fetchLimited: a timer that aborts': 'entityRenderer.js: the body data\'s fetch, 15 s in all (BODY_DATA_TIMEOUT_MS) (Found)',
  '_fetchTraitMeta: a timer that aborts': 'entityRenderer.js: a trait\'s meta, 15 s in all (Found)',
  'checkAccountLogin: AbortSignal.timeout': 'networking/index.js: a login POST, 8 s (an answer, not a download)',
  'enterArenaWithLooks: a race against a flat timer': 'dungeonArt.js: the arena\'s slime look, 8 s (Found)',
  'fetchSheet: a timer that aborts': 'maskedBakeWorker.js: a sheet for a bake, 4 s in all (Found)',
  'fetchWithTimeout: a timer that aborts': 'DevPanel.jsx: the owner\'s admin levers, 12 s',
  'holdFarmUntilReady: a race against a flat timer': 'farmTrip.js: the farm held FARM_HOLD_CAP_MS (Found)',
  'postWithin: a timer that aborts': 'storeAnswer.js: a store POST given up on (an answer, not a download)',
  'preloadWheel: a race against a flat timer': 'worldTrial.js: the folk bakes and the ground steps waited a flat time (Found)',
  'processGameEvent: a race against a flat timer': 'gameEvents.js: a dungeon\'s looks and floor, 8 s (Found)',
  'resetAccountCharacter: AbortSignal.timeout': 'networking/index.js: a reset POST, 8 s (an answer, not a download)',
  'restoreAllPictures: a race against a flat timer': 'picsOnce.js: a rebuild\'s pictures, behind its veil (Found)',
  'syncTownScenery: a race against a flat timer': 'zoneTransitions.js: the town\'s scenery, a flat 15 s (Found)',
  'wheelObjectsWarm: a race against a flat timer': 'wheelObjects.js: the objects\' pages, PAGE_WAIT_MS (Found)',
};
{
  const found = new Set();
  let races = 0, cuts = 0;
  for (const f of PAGE) {
    const m = M(f);
    for (const x of m.matchAll(/Promise\.race\(/g)) {
      races++;
      const o = x.index + x[0].length - 1;
      const args = m.slice(o, closeOf(m, o));
      if (/new Promise\(\s*(?:function\s*)?\(?[\w$]+\)?\s*(?:=>\s*)?\{?\s*setTimeout\(/.test(args)) found.add(label(f, x.index) + ': a race against a flat timer');
    }
    for (const x of m.matchAll(/AbortSignal\.timeout\(/g)) { cuts++; found.add(label(f, x.index) + ': AbortSignal.timeout'); }
    for (const x of m.matchAll(/setTimeout\(\s*\(\)\s*=>\s*\{?\s*(?:try\s*\{\s*)?(?:if\s*\([\w$]+\)\s*)?[\w$]+\.abort\(\)/g)) { cuts++; found.add(label(f, x.index) + ': a timer that aborts'); }
  }
  check(`§279: the page's races and download limits are read (${races} races, ${cuts} limits)`, races >= 8 && cuts >= 4, { races, cuts });
  census('§279', 'loads raced against a flat timer, and downloads cut by a whole-trip limit', found, FLAT_KNOWN);
  const zg = definers('gateCap');
  check(`§279: the zone gate's cap is gateCap (${zg.map(base)}), and the zone's way in races preloadZoneAssets against it`, zg.length === 1
    && PAGE.some((f) => /Promise\.race\(\[[^\]]*preloadZoneAssets\([^\]]*gateCap\(/.test(M(f))), zg);
  /* the ground's worker (public/tools/world/): its download's cut is re-armed by every part that comes */
  const gw = sourceFiles(['public/tools/world']).filter((f) => /(?:const|let|var)\s+DL_STALL_MS\s*=/.test(readFileSync(join(ROOT, f), 'utf8')));
  const gm = gw.length === 1 ? maskCode(readFileSync(join(ROOT, gw[0]), 'utf8')) : '';
  check(`§279: the ground's download limit counts silence: DL_STALL_MS (${gw}) is re-armed by each part that arrives`, gw.length === 1
    && /clearTimeout\(([\w$]+)\);\s*\1\s*=\s*setTimeout\([\w$]+,\s*DL_STALL_MS\)/.test(gm), gw);
}

/* ── §281: a fixed cast drawn live is baked first ── */
/* the callers of the body baker that bakes on first sight: each a figure
   whose looks are baked behind a loading screen, or a probe */
const BODY_FRAME_CALLERS = {
  '__btLegsPeek': 'a QA probe (window.__btLegsPeek)',
  '__btMaskedCoverage': 'a QA probe (window.__btMaskedCoverage)',
  '_drawFolk': 'the townsfolk: prewarmFolkBodies bakes their refused looks behind the loading screen (folk-bakes.test)',
  '_placeSouthBlockLegs': 'you and the players: the masked body\'s legs (prewarmMaskedBodyFrames)',
  '_updateOtherPlayers': 'other players: not a fixed cast (their looks come and go with them)',
  '_updatePlayer': 'you: prewarmMaskedBodyFrames and prewarmAltWornSets behind the loading screen',
  'getFishFrame': 'the fishing pose\'s body (playerSkins.js)',
  'installArmourProbe': 'a QA probe (lookArmourProbe.js)',
  'installLookProbe': 'a QA probe (lookPaletteProbe.js)',
  'prewarmAltWornSets': 'a prewarm (behind the loading screen)',
  'prewarmFolkBodies': 'a prewarm (behind the loading screen)',
  'prewarmMaskedBodyFrames': 'a prewarm (behind the loading screen)',
};
{
  const found = new Set();
  for (const f of PAGE) for (const x of M(f).matchAll(/(?<![\w$.])getBodyFrame\(/g)) {
    if (/function\s*$/.test(M(f).slice(Math.max(0, x.index - 10), x.index))) continue;
    found.add(label(f, x.index));
  }
  census('§281', 'callers of getBodyFrame (a bake on first sight)', found, BODY_FRAME_CALLERS);
  const pf = definers('prewarmFolkBodies');
  check('§281: prewarmFolkBodies asks lookBodyRefused for the townsfolk\'s looks', pf.length === 1 && /lookBodyRefused\(/.test(fnBody(pf[0], 'prewarmFolkBodies')), pf);
  const made = new Set();
  for (const f of PAGE) for (const x of M(f).matchAll(/(?<![\w$.])noteMade\(/g)) made.add(label(f, x.index));
  const MADE = ['_buildBodySheetPage', '_buildSheet', 'packTrimmed', 'stripTurn'];
  check(`§281: the page's bakes on first sight say their name (noteMade in ${MADE.join(', ')})`, MADE.every((n) => made.has(n)), MADE.filter((n) => !made.has(n)));
}

/* ── §294: a var is read below where it is set ── */
const VAR_EARLY_KNOWN = {
  'BroTown2:showLogin': { n: 1, why: 'BroTown.jsx: an effect\'s deps `[showLogin]` read before its useState line sets it (Found)' },
  'gameLoop:now': { n: 2, why: 'BroTown.jsx: the trail above the pet block reads the loop\'s `now` ~800 lines above its set (TRAPS §294: "left for later") (Found)' },
};
{
  const found = new Map();
  let vars = 0;
  for (const f of PAGE) {
    const m = M(f);
    if (!/(?<![\w$.])var /.test(m)) continue;
    const fns = F(f);
    const loops = [];
    for (const x of m.matchAll(/(?<![\w$.])(?:for|while)\(/g)) {
      const o = x.index + x[0].length - 1;
      let k = closeOf(m, o) + 1;
      while (/\s/.test(m[k])) k++;
      loops.push([x.index, m[k] === '{' ? closeOf(m, k) : m.indexOf(';', k)]);
    }
    for (const x of m.matchAll(/(?<![\w$.])do\{/g)) loops.push([x.index, m.indexOf('while(', closeOf(m, x.index + 2)) + 6]);
    const declAt = new Set();
    const decls = [];
    for (const d of m.matchAll(/(?<![\w$.])var ([^;]*)/g)) {
      const fn = innerFn(fns, d.index);
      if (!fn) continue;
      const list = d[1];
      let dep = 0, from = 0;
      const parts = [];
      for (let i = 0; i <= list.length; i++) {
        const ch = list[i];
        if (ch === undefined || (ch === ',' && dep === 0)) { parts.push(from); from = i + 1; }
        else if ('([{'.includes(ch)) dep++;
        else if (')]}'.includes(ch)) { if (--dep < 0) break; }
      }
      for (const a of parts) {
        const n = /^\s*([\w$]+)/.exec(list.slice(a));
        if (n) { declAt.add(d.index + 4 + a + n.index + n[0].length - n[1].length); decls.push([n[1], fn]); }
      }
    }
    for (const [X, fn] of decls) {
      vars++;
      const e = esc(X);
      let first = Infinity;
      for (const s of m.slice(fn.a, fn.b).matchAll(new RegExp('(?<![\\w$.])' + e + '=(?!=)', 'g'))) {
        const p = fn.a + s.index;
        if (innerFn(fns, p) === fn) { first = p; break; }
      }
      if (first === Infinity) continue;
      for (const r of m.slice(fn.a, first).matchAll(new RegExp('(?<![\\w$.])' + e + '(?![\\w$])(?!=(?!=))', 'g'))) {
        const p = fn.a + r.index;
        if (declAt.has(p) || innerFn(fns, p) !== fn) continue;
        if (/[{,]/.test(m[p - 1]) && m[p + X.length] === ':') continue;   /* an object's key */
        if (loops.some(([a, b]) => a < p && p < b && a < first && first < b)) continue;   /* last time round the loop's */
        const k = label(f, p) + ':' + X;
        found.set(k, (found.get(k) || 0) + 1);
      }
    }
  }
  check(`§294: the page's vars are read (${vars})`, vars >= 3000, vars);
  census('§294', 'vars read above where their function first sets them (undefined there, not last frame\'s)', found, VAR_EARLY_KNOWN);
}

/* ── §299: a component that hides itself lets go of what is live ── */
/* a poll that decides whether the thing shows cannot stop while it is hidden;
   the rest run while hidden for the page's life (Found) */
const HIDDEN_LIVE_KNOWN = {
  'AbilityButtons:live': 'AbilityButtons.jsx: a poll that decides whether it shows',
  'AceFlipPanel:open': 'AceFlipPanel.jsx: its timer watches the spin, not open (Found)',
  'DungeonClearHud:v': 'DungeonClearHud.jsx: a poll that decides whether it shows',
  'ElemStatusChips:chips': 'ElemStatusChips.jsx: a poll that decides whether it shows',
  'InstallHint:show': 'InstallHint.jsx: a timer from mount (Found)',
  'LoginSpinWindow:open': 'LoginSpinWindow.jsx: one effect of four not watching open (Found)',
  'QuestCoach:view': 'QuestCoach.jsx: a poll that decides whether it shows',
  'QuickEatButton:view': 'QuickEatButton.jsx: a poll that decides whether it shows',
  'RideButton:view': 'RideButton.jsx: a poll that decides whether it shows',
  'SalvageToast:toastQueue': 'ItemTooltip.jsx: a poll of the toast queue',
  'SprintButton:view': 'SprintButton.jsx: a poll that decides whether it shows',
  'TradeWindowPanel:trade2': 'TradeWindowPanel.jsx: a timer from mount (Found)',
  'TrapButton:v': 'TrapButton.jsx: a poll that decides whether it shows',
  'WeaponPill:view': 'WeaponPill.jsx: a poll that decides whether it shows',
  'WorldMapOverlay:inWheel': 'WorldMapOverlay.jsx: a poll that decides whether it shows',
  'XpFlyOverlay:S': 'XpFlyOverlay.jsx: a frame loop from mount (Found)',
  'XpFlyOverlay:pops': 'XpFlyOverlay.jsx: the same loop, the second hide (Found)',
  'ZoneHeader:S': 'ZoneHeader.jsx: a timer and a frame loop from mount (Found)',
};
{
  const LIVE = /(?<![\w$.])(?:setInterval|getUserMedia|requestAnimationFrame)\(|\.start\(\)/;
  const RELEASE = /(?<![\w$.])dictationClose\(|\.abort\(\)|\.getTracks\(\)/g;
  const found = new Set();
  let comps = 0, effects = 0;
  const keyedReleases = [];
  for (const f of PAGE.filter((p) => p.startsWith('src/ui/'))) {
    const m = M(f);
    const fns = F(f);
    for (const x of m.matchAll(/if\(!([\w$.]+)\)return null/g)) {
      const fn = innerFn(fns, x.index);
      if (!fn) continue;
      comps++;
      const cond = x[1].split('.');
      const key = cond[cond.length - 1] === 'length' ? cond[cond.length - 2] : cond[cond.length - 1];
      const releases = new Map();   /* a release's kind -> [in an effect that watches the hide] */
      for (const u of m.slice(fn.a, fn.b).matchAll(/(?<![\w$])(?:React\.)?use(?:Layout)?Effect\(/g)) {
        const o = fn.a + u.index + u[0].length - 1;
        if (innerFn(fns, o) !== fn) continue;
        const args = m.slice(o + 1, closeOf(m, o));
        const deps = /,\s*(\[[^\]]*\])\s*$/.exec(args);
        const watches = !!deps && new RegExp('(?<![\\w$])' + esc(key) + '(?![\\w$])').test(deps[1]);
        for (const r of args.matchAll(RELEASE)) { if (!releases.has(r[0])) releases.set(r[0], []); releases.get(r[0]).push(watches); }
        if (!LIVE.test(args)) continue;
        effects++;
        if (watches) continue;
        found.add(label(f, x.index) + ':' + key);
      }
      /* a microphone, a recogniser, a stream: let go where the hide is watched, not only at unmount */
      for (const [r, w] of releases) if (w.some(Boolean)) keyedReleases.push(label(f, x.index) + ': ' + r);
      for (const [r, w] of releases) if (!w.some(Boolean)) found.add(label(f, x.index) + ':' + key + ': ' + r);
    }
  }
  check(`§299: the components that hide by returning null are read (${comps}; ${effects} effects start a live thing)`, comps >= 50 && effects >= 15, { comps, effects });
  check(`§299: the releases in an effect that watches the hide are read (${keyedReleases.join(', ')})`, keyedReleases.some((r) => /dictationClose/.test(r)), keyedReleases);
  census('§299', 'hidden components whose live effect does not watch what hides them', found, HIDDEN_LIVE_KNOWN);
}

/* ── §300: the filter before a draw reads the draw's list ── */
{
  const eh = definers('elemFxLive');
  check(`§300: elemFxLive is defined once (${eh.map(base)})`, eh.length === 1, eh);
  if (eh.length === 1) {
    const { elemFxLive, ELEM_STATUSES } = await import(pathToFileURL(join(ROOT, eh[0])).href);
    const now = 1e6;
    const fieldOf = (s) => (s === 'gust' ? '_gustAt' : '_' + s + 'Until');
    const blind = [];
    for (const s of [...ELEM_STATUSES, 'frozen', 'wobble']) {
      const R = { [fieldOf(s)]: s === 'gust' ? now - 10 : now + 500 };
      if (!elemFxLive(R, now, 1000)) blind.push(s);
    }
    check(`§300: elemFxLive answers for every status (${ELEM_STATUSES.length} in ELEM_STATUSES, and the freeze and the wobble)`, blind.length === 0 && elemFxLive({}, now, 1000) === false, blind);
    /* every status field the draw that asks it reads */
    const askers = [];
    const unseen = [];
    for (const f of PAGE) {
      const m = M(f);
      for (const x of m.matchAll(/(?<![\w$.])elemFxLive\(/g)) {
        if (/function\s*$/.test(m.slice(Math.max(0, x.index - 10), x.index))) continue;
        const b = bodyAt(f, x.index);
        askers.push(label(f, x.index));
        for (const r of b.text.matchAll(/(?<![\w$])([\w$]+)\.(_\w+Until)(?![\w$])/g)) {
          if (r[1] === 'S' || r[1] === 'this') continue;   /* your own (the page's state), not the peer's */
          if (!elemFxLive({ [r[2]]: now + 500 }, now, 1000) && !unseen.includes(r[2])) unseen.push(r[2]);
        }
      }
    }
    check(`§300: elemFxLive is asked before a draw (${askers.join(', ')}), and answers for every status field that draw reads`, askers.length >= 1 && unseen.length === 0, unseen);
  }
  const own = [];
  for (const f of PAGE) {
    if (eh.includes(f)) continue;
    const c0 = code.get(f);
    if ((c0.match(/Until/g) || []).length < 3 && !/["'](?:chill|burn|gust|stuck|daze|shock|soak|poison|slow|fracture|thorn|frozen|wobble)["']/.test(c0)) continue;
    const m = M(f);
    for (const x of m.matchAll(/(?:[\w$.]+\._\w+Until\s*[<>]=?\s*[\w$.]+\s*\|\|\s*\(?\s*){2,}[\w$.]+\._\w+Until/g)) own.push(label(f, x.index) + ': a chain');
    const c = code.get(f);
    for (const x of c.matchAll(/\[\s*(?:["'](?:chill|burn|gust|stuck|daze|shock|soak|poison|slow|fracture|thorn|frozen|wobble)["']\s*,\s*){2,}/g)) own.push(label(f, x.index) + ': a list of names');
  }
  check('§300: no other file keeps its own list of the statuses (three or more in a chain or a list)', own.length === 0, own);
}

/* ── §306: a rebuilt sound engine brings every sound back ── */
const SAMPLE_LOAD_KNOWN = {
  'load': 'rideSound.js: asked again by its own ensure while the ride wants it (_samples read each tick)',
  'loadCriticalSfx': 'gameDisplay.js: manifest cues only, which loadSfxManifest (asked in _rebuildContext) loads again',
};
{
  const NODE = /\.create(?:Gain|BufferSource|Oscillator|BiquadFilter|StereoPanner|DynamicsCompressor|MediaElementSource|Convolver|Analyser|Panner|Delay|WaveShaper)\(/;
  const core = definers('_rebuildContext');
  check(`§306: BT_AUDIO's _rebuildContext is found (${core.map(base)})`, core.length === 1, core);
  const makers = PAGE.filter((f) => !core.includes(f) && NODE.test(M(f)));
  const blind = makers.filter((f) => !/\.ctx\s*(?:!==|===|!=|==)|(?:!==|===|!=|==)\s*[\w$.]*\.ctx(?![\w$])/.test(M(f)));
  check(`§306: the files that make their own Web Audio nodes (${makers.map(base).join(', ')}) each compare the context they made them in with BT_AUDIO's`, makers.length >= 4 && blind.length === 0, blind.map(base));
  if (core.length === 1) {
    const rb = fnBody(core[0], '_rebuildContext');
    const found = new Set();
    let calls = 0;
    for (const f of PAGE) for (const x of M(f).matchAll(/\.loadSample\(/g)) {
      calls++;
      const fn = label(f, x.index);
      if (!/^_?(?:pre)?[lL]oad/.test(fn) || fn === 'loadSample') continue;   /* an on-demand ask is asked again by its next play */
      if (new RegExp('(?<![\\w$])' + esc(fn) + '\\(').test(rb)) continue;
      found.add(fn);
    }
    check(`§306: the asks of loadSample are read (${calls})`, calls >= 8, calls);
    census('§306', 'bulk loads into _samples not asked again in _rebuildContext', found, SAMPLE_LOAD_KNOWN);
  }
}

process.exit(failed ? 1 : 0);
