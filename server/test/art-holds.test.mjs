/* WHO STILL HOLDS A PICTURE -- v2.3.4416
 * (the state-machine sweep of 2026-11-03, V17b R6-5, R11-1, R4-15).
 *
 * Three of the phone's streamed-art caches let a picture go at the wrong
 * time.  The rules (src/rendering/artHolds.js, no imports) run here in node,
 * and the renderer's OWN code is cut from src/ and replayed with stand-ins
 * for Pixi, so each part fails on the code before this version:
 *   1. a Wheel monster look that shares its sprite module with another (the
 *      rotcap's mire wisp and bog lurker) does not unload it while the other
 *      is still HELD -- near this tick or not; the last one to go does;
 *   2. a Wheel object page whose download failed is let go after a few
 *      seconds even while you stand near it, so it is asked for again; a
 *      page still loading, or ready and near, never is;
 *   3. another player who leaves the room takes every sprite of theirs out
 *      of the gesture layer, the three gear sprites included. */
import { readFileSync } from 'fs';
import { heldBySibling, pageDropDue, peerEntSprites, PAGE_RETRY_MS } from '../../src/rendering/artHolds.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const ROOT = new URL('../../', import.meta.url).pathname;
const read = (p) => readFileSync(ROOT + p, 'utf8');

/* the text from `start` to its block's closing brace (strings and comments
   in these blocks carry no braces that matter: checked by the parts below
   failing loudly if the cut is wrong) */
function cutBlock(src, start) {
  const at = src.indexOf(start);
  if (at < 0) throw new Error('not found: ' + start);
  let i = src.indexOf('{', at), depth = 0;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i + 2) + 1; continue; }
    if (c === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); continue; }
    if (c === "'" || c === '"' || c === '`') { const q = c; i++; while (i < src.length && src[i] !== q) { if (src[i] === '\\') i++; i++; } continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return src.slice(at, i + 1); }
  }
  throw new Error('unclosed: ' + start);
}

/* ── 1. the shared sprite module (R6-5) ── */
{
  const looks = new Map([['a', { state: 'ready' }], ['b', { state: 'ready' }], ['c', { state: 'failed' }], ['d', { state: 'loading' }]]);
  check('1a. a ready sibling on the same art holds it', heldBySibling('a', looks, (q) => q === 'b'));
  check('1b. a loading sibling holds it (its load shares the module)', heldBySibling('a', looks, (q) => q === 'd'));
  check('1c. a failed sibling holds nothing', !heldBySibling('a', looks, (q) => q === 'c'));
  check('1d. the look itself is no sibling', !heldBySibling('a', looks, (q) => q === 'a'));

  /* the renderer's own freeLook, run with the rotcap's two keys sharing one
     unload, as monsterVariantSprites.js has them */
  const WMA = read('src/rendering/wheelMonsterArt.js');
  const body = cutBlock(WMA, 'function freeLook(');
  const unloaded = [];
  const ROT = () => {};
  const VARIANT_SPRITES = { mireWisp: { unload: ROT }, bogLurker: { unload: ROT }, fireGoblin: { unload: () => {} } };
  const _looks = new Map();
  const make = new Function('VARIANT_SPRITES', '_looks', 'unloadVariantSprites', 'MONSTER_VARIANTS', 'recolorFamilyOf', 'freeMonsterRecolor', 'unloadSnowmanSprites', 'fx', 'heldBySibling',
    body + '\nreturn freeLook;');
  const freeLook = make(VARIANT_SPRITES, _looks, (ks) => { unloaded.push(...ks); return []; }, {}, () => null, () => {}, () => {}, () => Promise.resolve({}), heldBySibling);
  /* wheelArtTick: the mire wisp is let go while the bog lurker is held
     ('ready') but just past FREE_R -- not in this tick's keep */
  _looks.set('mireWisp', { state: 'ready' });
  _looks.set('bogLurker', { state: 'ready' });
  freeLook('mireWisp', new Set());
  _looks.delete('mireWisp');
  check('1e. letting the mire wisp go keeps the module the held bog lurker draws from', unloaded.length === 0, unloaded);
  freeLook('bogLurker', new Set());
  _looks.delete('bogLurker');
  check('1f. the last of the two to go unloads it', unloaded.length === 1 && unloaded[0] === 'bogLurker', unloaded);
  _looks.set('fireGoblin', { state: 'ready' });
  _looks.set('mireWisp', { state: 'ready' });
  freeLook('fireGoblin', new Set(['mireWisp']));
  check('1g. a look on art of its own is let go as before', unloaded.includes('fireGoblin'), unloaded);
  check('1h. the wiring: freeLook asks heldBySibling, not this tick\'s keep', /heldBySibling\(k, _looks,/.test(WMA) && !/keep\.has\(q\)/.test(body), null);
}

/* ── 2. the failed object page (R11-1) ── */
{
  const DROP_MS = 4000;
  /* the renderer's own drop loop (wheelObjects.js), replayed four times a
     second for 20 s with the page near the whole time */
  const WO = read('src/rendering/wheelObjects.js');
  const loop = cutBlock(WO, 'for (const [k, rec] of _pages) {');
  const run = new Function('_pages', 'keep', 'now', 'DROP_MS', 'pageDropDue', 'self', 'ix', loop.replace(/this\./g, 'self.'));
  const _pages = new Map();
  const asked = [];
  const self = { _dropPage: (ix, k) => _pages.delete(k) };
  let failOn = true, okAsks = 0;
  /* the want half, as the renderer has it: a page near with no record is
     asked for; this one fails while the network is down */
  const want = (now) => {
    if (_pages.has(7)) { _pages.get(7).wanted = now; return; }
    asked.push(now);
    if (!failOn) okAsks++;
    _pages.set(7, failOn ? { state: 'failed', wanted: now, failedAt: now } : { state: 'ready', wanted: now });
  };
  for (let now = 0; now <= 20000; now += 250) {
    if (now === 10000) failOn = false;   /* the network comes back */
    want(now);
    run(_pages, new Set([7]), now, DROP_MS, pageDropDue, self, null);
  }
  check('2a. a failed page near you is asked for again after a few seconds', asked.length >= 2 && asked[1] - asked[0] <= PAGE_RETRY_MS + 250, asked);
  check('2b. ...and comes in once the network is back', _pages.get(7) && _pages.get(7).state === 'ready', _pages.get(7));
  check('2c. ...and, ready and near, is kept (asked for once, not again)', okAsks === 1, { okAsks, asked });
  check('2d. no retry storm: at most one ask per PAGE_RETRY_MS', asked.every((t, i) => i === 0 || t - asked[i - 1] >= PAGE_RETRY_MS), asked);
  check('2e. a page still loading is never let go', !pageDropDue({ state: 'loading', wanted: 0 }, false, 1e9, DROP_MS));
  check('2f. a ready page none of whose objects is near goes after DROP_MS', pageDropDue({ state: 'ready', wanted: 0 }, false, DROP_MS + 1, DROP_MS) && !pageDropDue({ state: 'ready', wanted: 0 }, false, DROP_MS - 1, DROP_MS));
  check('2g. the wiring: a failure is stamped', /rec\.state = 'failed'; rec\.failedAt = performance\.now\(\)/.test(WO));
}

/* ── 3. the peer who left (R4-15) ── */
{
  /* stand-ins: a layer and its sprites, as far as the reap reads them */
  const layer = new Set();
  class Spr { constructor() { this.destroyed = false; layer.add(this); } destroy() { this.destroyed = true; layer.delete(this); } }
  const ent = {
    chop: new Spr(), cook: new Spr(), cookInk: new Spr(), fire: new Spr(), fireInk: new Spr(),
    traits: { hair: new Spr(), beard: new Spr(), species: new Spr(), eyestyle: new Spr(), eyewear: new Spr(), hat: null },
    gear: { legs: new Spr(), shirt: new Spr(), chest: new Spr() },
  };
  check('3a. every sprite of the entry is on the list', peerEntSprites(ent).length === layer.size, { listed: peerEntSprites(ent).length, held: layer.size });
  check('3b. an entry with nothing made yet lists nothing', peerEntSprites({}).length === 0 && peerEntSprites(null).length === 0);

  /* the renderer's own reap, cut from effectsRenderer.js */
  const ER = read('src/rendering/systems/effectsRenderer.js');
  const at = ER.indexOf('/* reap sprites for peers who left the room. */');
  const reap = cutBlock(ER.slice(at), 'for (const [id, ent] of pool) {');
  const run = new Function('pool', 'others', 'peerEntSprites', 'self', reap.replace(/this\./g, 'self.'));
  const pool = new Map([['bp_gone', ent]]);
  run(pool, {}, peerEntSprites, { _destroyPeerFarmer() {} });
  check('3c. a peer who left leaves nothing in the gesture layer, the gear included', layer.size === 0, { left: layer.size, gear: Object.values(ent.gear).map((g) => g.destroyed) });
  check('3d. ...and their entry is gone', !pool.has('bp_gone'));
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
