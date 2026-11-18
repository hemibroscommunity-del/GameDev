/* ═══ v2.3.6202: THE TOWNSFOLK'S BAKED SHEETS OFF THE CHIP FAR FROM TOWN (card EN PR 3) ═══
 *
 * The few townsfolk whose looks the shared colour numbers refuse are drawn
 * from sheets baked behind the loading screen (entityRenderer.js
 * prewarmFolkBodies).  Each went up to the graphics chip at its first draw
 * and stayed for the visit: 13-14 MB of them on the chip at the memory
 * check's fights in the Flame Fields, where no townsperson is drawn.  Now
 * their chip copies are let go of far from town (TextureSource.unload: the
 * baked pictures stay in the page, nothing is baked or loaded again, and a
 * facing goes up again at its next draw); `?folksheets=0` keeps them, as
 * before.  This suite plays the decision with the switch on and thrown
 * (`?folksheets=0`), and holds the two call sites to their shape:
 *
 *   1. on: every townsperson FOLK_SHEETS_FREE_PX past the view for
 *      FOLK_SHEETS_FREE_MS lets go once, never sooner, never twice;
 *   2. thrown (`?folksheets=0`): never lets go, however long;
 *   3. back within the distance: on the chip again (it may let go again on
 *      the next trip); a step closer only resets the clock;
 *   4. nobody measured (a dungeon, a zone between: Infinity) holds, and
 *      resets the clock;
 *   5. the renderer asks it every frame from _updateNPCs, reads the switch
 *      through the page's reader, and lets go of each key once (a Set) with
 *      the keys the draw itself would ask (bodyKeysAsked);
 *   6. playerSkins.js: bodyKeysAsked answers a key BEFORE any bake or cache
 *      read, and unloadBodySheets unloads (never destroys) a baked source.
 *
 * The leaf imports the player's sprites (Pixi), which a server suite cannot
 * load on GitHub (only server/'s packages), so the function and its two
 * constants are cut from the leaf's text and run in a vm, as loader-retries
 * does.
 *
 * BREAK PROOF (rule 8), tried by hand 2026-11-18:
 *   entity-townsfolk.js: `if (!on) return false;` taken out        -> FAIL 2
 *   entity-townsfolk.js: `st.onChip && ` taken out                 -> FAIL 1 and 3 (lets go every frame)
 *   entity-townsfolk.js: `nearest === Infinity || ` taken out      -> FAIL 4
 *   entityRenderer.js: `new Set(` taken out of the let-go          -> FAIL 5
 *   playerSkins.js: `src.unload()` made `src.destroy()`            -> FAIL 6
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
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
const cut = (text, name) => braced(text, new RegExp('(?:export\\s+)?function\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{')).replace(/^export\s+/, '');
const constOf = (text, name) => { const m = new RegExp('export const ' + name + ' = (\\d+);').exec(text); return m ? Number(m[1]) : NaN; };

const LEAF = src('src/rendering/leaves/entity-townsfolk.js');
const FREE_PX = constOf(LEAF, 'FOLK_SHEETS_FREE_PX');
const FREE_MS = constOf(LEAF, 'FOLK_SHEETS_FREE_MS');
const fnText = cut(LEAF, 'folkSheetsStep');
const ctx = { FOLK_SHEETS_FREE_PX: FREE_PX, FOLK_SHEETS_FREE_MS: FREE_MS };
vm.createContext(ctx);
vm.runInContext(fnText + '\nthis.folkSheetsStep = folkSheetsStep;', ctx);
const step = ctx.folkSheetsStep;
check('0. the leaf holds folkSheetsStep and its two numbers', typeof step === 'function' && FREE_PX > 0 && FREE_MS > 0, { FREE_PX, FREE_MS, cut: fnText.length });

/* a walk: [ms, nearest] pairs; the frames on which it let go */
function walk(on, frames) {
  const st = { onChip: true, farSince: 0 };
  const lets = [];
  for (const [t, d] of frames) if (step(st, on, t, d)) lets.push(t);
  return { lets, st };
}
const far = FREE_PX + 1000;
const ticks = (from, to, d, every = 100) => { const a = []; for (let t = from; t <= to; t += every) a.push([t, d]); return a; };

/* 1. on: once, after the wait, never twice */
{
  const r = walk(true, ticks(1000, 1000 + FREE_MS + 5000, far));
  check(`1. on: far ${FREE_MS / 1000} s lets go once, after the wait (${r.lets.join(', ')})`,
    r.lets.length === 1 && r.lets[0] > 1000 + FREE_MS && r.lets[0] <= 1000 + FREE_MS + 200 && r.st.onChip === false, r);
  const short = walk(true, ticks(1000, 1000 + FREE_MS - 500, far));
  check('1. ...and not before it', short.lets.length === 0, short);
  const edge = walk(true, ticks(1000, 1000 + FREE_MS + 5000, FREE_PX));
  check(`1. ...and at ${FREE_PX} px exactly, never (past it, not at it)`, edge.lets.length === 0, edge);
}

/* 2. thrown: `?folksheets=0` */
{
  const r = walk(false, ticks(1000, 1000 + 10 * FREE_MS, far));
  check('2. thrown (?folksheets=0): never lets go, however long', r.lets.length === 0 && r.st.onChip === true, r);
}

/* 3. back near: on the chip again, and a second trip lets go again */
{
  const t1 = 1000 + FREE_MS + 1000;
  const frames = [...ticks(1000, t1, far), [t1 + 100, 0], ...ticks(t1 + 200, t1 + 200 + FREE_MS + 1000, far)];
  const r = walk(true, frames);
  check(`3. home again: on the chip again, and the next trip lets go again (${r.lets.length} let-gos)`, r.lets.length === 2, r);
  const blip = walk(true, [...ticks(1000, 1000 + FREE_MS - 1000, far), [1000 + FREE_MS - 900, FREE_PX - 1], ...ticks(1000 + FREE_MS - 800, 1000 + FREE_MS + 2000, far)]);
  check('3. ...a step back within the distance starts the wait again', blip.lets.length === 0, blip);
}

/* 4. nobody measured */
{
  const r = walk(true, ticks(1000, 1000 + 5 * FREE_MS, Infinity));
  check('4. nobody measured (a dungeon, a zone between): held, however long', r.lets.length === 0 && r.st.onChip === true, r);
  const mixed = walk(true, [...ticks(1000, 1000 + FREE_MS - 1000, far), [1000 + FREE_MS - 900, Infinity], ...ticks(1000 + FREE_MS - 800, 1000 + FREE_MS + 2000, far)]);
  check('4. ...and a frame with nobody starts the wait again', mixed.lets.length === 0, mixed);
}

/* 5. the renderer's call sites */
{
  const ER = src('src/rendering/systems/entityRenderer.js');
  const own = cut(ER, '_folkSheetsStep');
  check("5. the switch is read through the page's reader: `!sw('folksheets')`", /const _FOLK_SHEETS_ON = !sw\('folksheets'\);/.test(ER));
  check('5. _folkSheetsStep asks the leaf with the switch and lets go of each key once (a Set of the keys the draw asks)',
    /folkSheetsStep\(_folkSheets, _FOLK_SHEETS_ON, now, nearest\)/.test(own)
      && /unloadBodySheets\(new Set\(bodyKeysAsked\(\(\) => \{ prewarmFolkBodies\(jobs\); \}\)\)\)/.test(own), own.slice(0, 400));
  const upd = braced(ER, /\n  _updateNPCs\(S, now\) \{/);
  check('5. _updateNPCs measures the nearest townsperson and asks it every frame',
    /if \(_past < _folkNearest\) _folkNearest = _past;/.test(upd) && /_folkSheetsStep\(now, _folkNearest\);/.test(upd), upd.length);
  check('5. prewarmFolkBodies keeps the jobs it baked', /_folkJobs = jobs;/.test(cut(ER, 'prewarmFolkBodies')));
}

/* 6. playerSkins.js */
{
  const PS = src('src/rendering/playerSkins.js');
  const gbf = cut(PS, 'getBodyFrame');
  const ask = gbf.indexOf('if (_askOnly) { _askOnly.push(sheetKey); return null; }');
  check('6. bodyKeysAsked: getBodyFrame answers the key before it reads the cache or bakes',
    ask > 0 && ask < gbf.indexOf('const entry = _bodySheets[sheetKey];') && ask > gbf.indexOf('const sheetKey = bodySheetKey('), { ask });
  const unl = cut(PS, 'unloadBodySheets');
  check('6. unloadBodySheets unloads a baked source and never destroys it (the picture stays in the page)',
    /src\.unload\(\)/.test(unl) && !/\.destroy\(|releaseCanvasSource|delete _bodySheets/.test(unl), unl.slice(0, 300));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
