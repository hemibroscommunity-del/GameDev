/* ═══ v2.3.6763: THE SPARE ARMOUR SETS BAKE AFTER THE LOADING SCREEN (card LOAD part 3b) ═══
 *
 * The owner's yes (2026-11-27, to "may the spare armour sets finish preparing
 * after the loading screen lifts?": "Yes").  src/game/spareLater.js broChain
 * is the bro's chain after the loads (pixiRenderer.js preloadPlayerAssets);
 * src/game/loadTimes.js and DevPanel.jsx's words are the readout.
 *
 *   1. by default, a spare bake that NEVER ends does not hold the screen: the
 *      screen's promise settles with masks, upload, gear, done noted, and the
 *      spare sets are not begun before their time (spareTime) has come;
 *   2. ...and once it has, they run, and their end is noted (`alt`) last;
 *   3. `?sparelater=0` (later false): the old order, masks, alt, upload,
 *      gear, done, and a slow spare bake holds the screen as it always did;
 *   4. a step that throws or rejects is passed over, as the old chain's catch;
 *   5. the readout: with the spare sets after the screen, `bro-alt` is listed
 *      after `bro-done`, and its line says it was after the loading screen;
 *      the old order and the old words with the switch off; "Why it lifted"
 *      unchanged; whenMarked settles at the mark (at once if it was noted);
 *   6. the wiring, read from the source: the loading screen is given the
 *      `screen` promise; the spare pass is `later` and waits for the screen
 *      to be gone; the switch is `sparelater`; the loading bar plans no spare
 *      families when they are after the screen.
 *
 * BREAK PROOF, each tried by hand, 2026-11-27:
 *   a. broChain chains alt into the screen whatever `later` says -> FAIL 1a, 1b, 1d, 2b, 4
 *   b. the spare sets start without waiting for spareTime     -> FAIL 1d
 *   c. the loading screen given the `spare` promise            -> FAIL 6a
 *   d. the old order lost (alt never in the screen)            -> FAIL 3a, 3b
 *   e. bro-alt left in its old place with later on             -> FAIL 5a, 5b
 *   f. the panel's old words for the spare sets with later on  -> FAIL 5b
 *
 * Run from the repository's root: node tools/guards/sparelater.test.mjs
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { broChain } from '../../src/game/spareLater.js';
import { markLoad, markLift, whenMarked, noteSpareLater, loadTimes } from '../../src/game/loadTimes.js';
import { readSystem } from './lib/filesOf.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600)));
};
const tick = (n = 20) => new Promise((r) => { let i = 0; const go = () => (++i >= n ? r() : setImmediate(go)); go(); });
const settled = (p) => { let s = false; p.then(() => { s = true; }, () => { s = true; }); return () => s; };

/* a chain whose steps are noted as they run, the spare one never ending
   unless let go, and its time let go by hand */
const rig = (later) => {
  const notes = [], ran = [];
  let altGo = null, timeGo = null;
  const steps = {
    masks: () => { ran.push('masks'); },
    alt: () => { ran.push('alt'); return new Promise((r) => { altGo = r; }); },
    upload: () => { ran.push('upload'); return Promise.resolve(); },
    gear: () => { ran.push('gear'); },
    warm: () => { ran.push('warm'); },
    spareTime: () => { ran.push('spareTime'); return new Promise((r) => { timeGo = r; }); },
  };
  const c = broChain(later, steps, (k) => notes.push(k));
  return { c, notes, ran, altGo: () => altGo && altGo(), timeGo: () => timeGo && timeGo() };
};

/* ── 1, 2 ── */
{
  const R = rig(true);
  const screenDone = settled(R.c.screen), spareDone = settled(R.c.spare);
  await tick();
  check('1a: later: the screen settles though the spare bake has not begun or ended', screenDone() === true, R.notes);
  check('1b: ...masks, upload, gear, done noted, in that order', R.notes.join(',') === 'masks,upload,gear,done', R.notes);
  check('1c: ...and the spare sets not noted', R.notes.indexOf('alt') < 0 && spareDone() === false, R.notes);
  check('1d: the spare sets wait for their time: not begun before it has come', R.ran.indexOf('alt') < 0 && R.ran.indexOf('spareTime') > R.ran.indexOf('warm'), R.ran);
  R.timeGo();
  await tick();
  check('2a: their time come, they begin', R.ran[R.ran.length - 1] === 'alt' && spareDone() === false, R.ran);
  R.altGo();
  await tick();
  check('2b: ...and their end is noted, last', R.notes.join(',') === 'masks,upload,gear,done,alt' && spareDone() === true, R.notes);
}

/* ── 3 ── */
{
  const R = rig(false);
  const screenDone = settled(R.c.screen);
  await tick();
  check('3a: ?sparelater=0: a slow spare bake holds the screen, as before', screenDone() === false && R.notes.join(',') === 'masks', R.notes);
  R.altGo();
  await tick();
  check('3b: ...then masks, alt, upload, gear, done, and no spare time asked', screenDone() === true && R.notes.join(',') === 'masks,alt,upload,gear,done' && R.ran.indexOf('spareTime') < 0, { notes: R.notes, ran: R.ran });
}

/* ── 4 ── */
{
  const notes = [];
  const c = broChain(true, {
    masks: () => { throw new Error('a step of its own'); },
    upload: () => Promise.reject(new Error('no chip')),
    gear: null,
    alt: () => Promise.reject(new Error('no worker')),
  }, (k) => notes.push(k));
  await c.spare;
  check('4: a step that throws or rejects (or is missing) is passed over', notes.join(',') === 'masks,upload,gear,done,alt', notes);
}

/* ── 5 ── */
const panel = readFileSync(join(ROOT, 'src/ui/panels/DevPanel.jsx'), 'utf8');
const m = panel.match(/const BRO_STEP_WORDS = [\s\S]*?\nexport function loadTimesLines\(L\) \{[\s\S]*?\n {2}return out;\n\}/);
check('5 (guard): DevPanel.jsx still holds the words and loadTimesLines as one block', !!m);
const loadTimesLines = m ? new Function(m[0].replace('export function', 'function') + '\nreturn loadTimesLines;')() : () => [];
{
  let early = false;
  whenMarked('world').then(() => { early = true; });
  await tick(3);
  const before = early;
  markLoad('world');
  await tick(3);
  let late = false;
  whenMarked('world').then(() => { late = true; });
  await tick(3);
  check('5c: whenMarked settles at the mark, and at once for one noted before', before === false && early === true && late === true, { before, early, late });
  for (const k of ['bro-loads', 'bro-masks', 'bro-upload', 'bro-gear', 'bro-done']) markLoad(k);
  markLift(false, 20000);
  noteSpareLater(true);
  let L = loadTimes();
  check('5a: later: bro-alt listed after bro-done, not reached yet (--)', L.spareLater === true && L.bro.map((b) => b.key).join(',') === 'bro-loads,bro-masks,bro-upload,bro-gear,bro-done,bro-alt' && L.bro[5].at == null, L.bro);
  markLoad('bro-alt');
  L = loadTimes();
  const lines = loadTimesLines(L);
  const altLine = lines.find((l) => /spare armour sets/.test(l)) || '';
  check('5b: ...its line says it was after the loading screen, with its time', /after the loading screen/.test(altLine) && /\d s {2}/.test(altLine) && lines.indexOf(altLine) > lines.findIndex((l) => /The bro was ready/.test(l)), lines);
  check('5d: "Why it lifted" reads ready for a screen the chain let go', lines[0] === 'Why it lifted: ready', lines[0]);
  noteSpareLater(false);
  L = loadTimes();
  const old = loadTimesLines(L);
  check('5e: the switch off: the old order and the old words', L.bro.map((b) => b.key).join(',') === 'bro-loads,bro-masks,bro-alt,bro-upload,bro-gear,bro-done'
    && old.some((l) => /\d s {2}The spare armour sets were baked$/.test(l)), old);
}

/* ── 6 ── */
{
  const RENDER = [...readSystem('render').values()].join('\n');   /* the renderers, read by system */
  const st = readFileSync(join(ROOT, 'src/game/spareTime.js'), 'utf8');
  const fn = (RENDER.match(/function _broChain\(results\) \{[\s\S]*?\n\}/) || [''])[0];
  check('6a: the loading screen is given the chain\'s `screen`, the order from the switch', /broChain\(later,/.test(fn) && /const later = spareLaterOn\(\)/.test(fn) && /return screen\.then\(\(\) => results\)/.test(fn) && !/spare\b.*then\(\(\) => results\)/.test(fn), fn.slice(0, 200));
  check('6b: after the screen the spare pass is `later` and its end the first one run to it', /prewarmAltWornSets\(\{ later: true \}\)/.test(fn) && /whenSpareSetsBaked\(\)/.test(fn) && /prewarmAltWornSets\(\{ fast: true \}\)/.test(fn), fn.slice(0, 200));
  check('6c: the spare time is the screen gone (the world mark), opening the pass\'s gate', /whenMarked\('world'\)/.test(fn) && /openSpareTime\(\)/.test(fn));
  const alt = (RENDER.match(/export async function prewarmAltWornSets\(opts\) \{[\s\S]*?\n\}/) || [''])[0];
  check('6d: a spare pass in play waits for the gate; the switch is `sparelater`', /await spareTime\(later\);/.test(alt) && /spareSetsRan\(fast\)/.test(alt) && /!sw\('sparelater'\)/.test(st) && /SPARE_LATER \? new Promise/.test(st), alt.slice(0, 120));
  check('6e: the loading bar plans no spare families when they are after the screen', /const families = SPARE_LATER \? 0 : _catalogWornSets\(\)\.length;/.test(RENDER));
  check('6f: a piece put on stops the spare pass (later only)', /if \(SPARE_LATER\) for \(const _sl of \['chest', 'legs'\]\) onEquipChange\(_sl, \(\) => \{ _altPrewarmSeq\+\+; _ownedSig = ''; \}\);/.test(RENDER));
}

console.log(failed ? `\n${failed} FAILED` : '\nall ok');
process.exit(failed ? 1 : 0);
