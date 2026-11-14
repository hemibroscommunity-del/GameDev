/* ═══ v2.3.5322: TRAPS INTO GUARDS, THE FIGHT (card V PR 3) ═══
 *
 * Grand plan step 8.2, card V's third batch (the form: tools/guards/README.md,
 * "A trap held").  The fourth trap of the batch, §43, is a mirror and is held
 * in server/test/mirror-audit.test.mjs §8f.  The census of what holds each
 * trap: docs/plan/census/traps.md.
 *
 * TRAPS §79 (the rule): the whirl is "engaged" on a lock the auto rule made while S._engaged is false, and not on S._engaged or a held thumb alone; and S._engaged ("did I tap this one") has a closed list of readers. Break: src/game/abilities.js: `var engaged = !NEEDS_LOCK[kind] || !!S._engaged || ...` in place of monsterLock(S) -> FAIL (tried 2026-11-14).
 * TRAPS §222 (the rule): every arrow the page shoots that is not the staff's leaves from the bow's grip (`fromGrip`, or the live grip as `_ox`/`_oy`), and between shots the effects renderer predicts the grip the pose would draw. Break: src/game/playerActions.js: the volley's `_ox: _vGrip ? _vgx : undefined` line gone -> FAIL (tried 2026-11-14).
 * TRAPS §262 (the rule): nothing that stops the walk (a `finalSpd = 0` hold, or a helper its condition calls) names S._wheelDungeonOpening: the worker still has you in the Wheel while a dungeon opens. Break: BroTown.jsx: `|| S._wheelDungeonOpening` added to the hold that sets finalSpd = 0 -> FAIL (tried 2026-11-14).
 *
 * HOW IT READS.  §79 loads src/game/abilities.js in node (lib/loadSrc.mjs)
 * and asks abilityStatus(S, 'whirl'), and lists the files whose code reads
 * `._engaged`.  §222 and §262 read the code of every file under src/
 * (comments dropped: lib/codeOnly.mjs), by the rule's own names, never a
 * line or a file's path: the shots are `arrows.push({...})`, the volley's
 * origin `S._bowGripDX`, the predictor `_predictBowGrip`, the hold
 * `finalSpd=0`.  Card M (the frame as steps) will move what §222 and §262
 * read out of BroTown.jsx and the effects renderer: the names travel with
 * it, and a name that goes leaves a check red (each one asks that what it
 * reads is there), never green.
 *
 * Not held: §222's landing (which arrow a sight lets go hits first) needs
 * the page; the retreat shot (dodge.js, `retreatShot`) leaves from your
 * centre on purpose: it is fired at a lock, re-aimed from its own origin at
 * release (projectiles.js), and no sight gates it.
 *
 * BREAK PROOF (rule 8), each tried by hand in a scratch copy, then undone:
 *   §79   abilities.js: `!!S._engaged` in place of `!!monsterLock(S)`        -> FAIL §79 whirl
 *         abilities.js: `|| !!S.autoAttack` added (engagedStance's reading)  -> FAIL §79 whirl
 *         a new reader: `if (S._engaged) ...` in src/game/abilities.js      -> FAIL §79 readers
 *   §222  playerActions.js: the volley's `_ox`/`_oy` lines gone             -> FAIL §222 shots
 *         monsterCombat.js: `fromGrip: !isStaff` gone from the plain shot   -> FAIL §222 shots
 *         the effects renderer: the between-shots `_predictBowGrip(S)` call gone -> FAIL §222 predict
 *   §262  BroTown.jsx: `|| S._wheelDungeonOpening` in the finalSpd = 0 hold -> FAIL §262
 *         through a helper: `|| raceHeld(S)` where raceHeld reads it          -> FAIL §262
 *
 * Run from the repository's root: node tools/guards/traps-fight.test.mjs
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
const base = (f) => f.slice(f.lastIndexOf('/') + 1);

const code = codeOf(['src']);
const masked = new Map([...code].map(([f, c]) => [f, maskCode(c)]));

/* the balanced (...) or {...} that opens at `open` in masked code m: its end */
function closeOf(m, open) {
  let d = 0;
  for (let k = open; k < m.length; k++) {
    const c = m[k];
    if (c === '(' || c === '{' || c === '[') d++;
    else if ((c === ')' || c === '}' || c === ']') && --d === 0) return k;
  }
  return m.length;
}
/* the top-level `key:` of an object literal (masked), with its value's text */
function literalKeys(m, open, c) {
  const end = closeOf(m, open);
  const out = new Map();
  let d = 0;
  for (let k = open; k <= end; k++) {
    const ch = m[k];
    if (ch === '(' || ch === '{' || ch === '[') { d++; continue; }
    if (ch === ')' || ch === '}' || ch === ']') { d--; continue; }
    if (d === 1 && (m[k - 1] === '{' || m[k - 1] === ',')) {
      const r = /^([A-Za-z_$][\w$]*)(:|,|})/.exec(m.slice(k, k + 60));
      if (!r) continue;
      let v = k + r[1].length + 1, e = v, dd = 0;
      if (r[2] === ':') { for (; e < end; e++) { const x = m[e]; if ('([{'.includes(x)) dd++; else if (')]}'.includes(x)) { if (dd-- === 0) break; } else if (x === ',' && dd === 0) break; } }
      out.set(r[1], r[2] === ':' ? c.slice(v, e) : r[1]);
    }
  }
  return out;
}

/* ── §79: the whirl's "engaged" is the lock, not S._engaged ── */
{
  globalThis.window = globalThis.window || { location: { search: '' }, addEventListener() {}, removeEventListener() {} };
  globalThis.localStorage = globalThis.localStorage || { getItem: () => null, setItem() {}, removeItem() {} };
  globalThis.document = globalThis.document || { cookie: '', addEventListener() {}, removeEventListener() {}, createElement: () => ({ getContext: () => null, style: {} }) };
  const keep = [console.error, console.warn, console.log];
  console.error = console.warn = console.log = () => {};
  let A;
  try { A = await loadSrc('src/game/abilities.js'); } finally { [console.error, console.warn, console.log] = keep; }
  const R = { level: 30, weapon: { type: 'greatsword', tierMult: 1 }, activeSlot: 'melee', stamina: 100, prog3: null };
  const mon = { id: 'm1', x: 100, y: 100, hp: 10, alive: true };
  const ask = (S) => A.abilityStatus({ rpg: R, player: { x: 90, y: 90 }, ...S }, 'whirl');
  const auto = ask({ lockedTarget: { type: 'monster', ref: mon, id: 'm1', src: 'auto' }, _engaged: false, autoAttack: true });
  check('§79 whirl: engaged on a lock the auto rule made, while S._engaged is false (a kill re-pointed it; the desktop path)',
    auto && auto.engaged === true, auto);
  const tapped = ask({ lockedTarget: null, _engaged: true, autoAttack: false });
  check('§79 whirl: ...not on S._engaged alone, with no lock (the grace after a kill, nothing in reach)',
    tapped && tapped.engaged === false, tapped);
  const thumb = ask({ lockedTarget: null, _engaged: false, autoAttack: true });
  check('§79 whirl: ...nor on a held thumb over an empty field (engagedStance\'s reading)',
    thumb && thumb.engaged === false, thumb);

  /* the readers of S._engaged: a new one is a question for the trap first */
  const READERS = {
    'targeting.js': 'its owner: _updateEngagement writes and clears it',
    'monsterCombat.js': 'the auto-engage swing, gated !S.autoAttack: a tapped fight with the thumb up',
  };
  const readers = [...code].filter(([, c]) => /\._engaged(?![\w$])/.test(c)).map(([f]) => f);
  const unlisted = readers.filter((f) => !Object.hasOwn(READERS, base(f)));
  check(`§79 readers: S._engaged ("did I tap this one", never "am I in combat") is read only where listed (${readers.map(base).join(', ')})`,
    unlisted.length === 0, unlisted);
  const gone = Object.keys(READERS).filter((b) => !readers.some((f) => base(f) === b));
  check('§79 readers: ...and every listed reader still reads it (a gone one comes off the list)', gone.length === 0, gone);
}

/* ── §222: a shot the sight lets go leaves from the grip ── */
{
  const shots = [];
  for (const [f, c] of code) {
    const m = masked.get(f);
    for (const x of m.matchAll(/arrows\.push\(\{/g)) shots.push({ f, keys: literalKeys(m, x.index + x[0].length - 1, c) });
  }
  const staff = (s) => /^\s*(true|!0)\s*$/.test(s.keys.get('isStaff') || '');
  const fromGrip = (s) => s.keys.has('fromGrip') || (s.keys.has('_ox') && s.keys.has('_oy'));
  const retreat = (s) => s.keys.has('retreatShot');
  const bad = shots.filter((s) => !staff(s) && !fromGrip(s) && !retreat(s)).map((s) => `${base(s.f)}: {${[...s.keys.keys()].join(', ')}}`);
  check(`§222 shots: every arrow the page shoots that is not the staff's leaves from the grip (${shots.length} shots: ${shots.filter(staff).length} staff, ${shots.filter(fromGrip).length} from the grip, ${shots.filter(retreat).length} retreat)`,
    shots.length >= 4 && shots.some((s) => s.keys.has('volley')) && bad.length === 0, bad);
  const volley = shots.filter((s) => s.keys.has('volley') && !staff(s));
  const volleyFile = volley[0] && code.get(volley[0].f);
  check('§222 volley: the bow\'s volley carries the live grip (S._bowGripDX / S._bowGripDY) as _ox / _oy',
    volley.length >= 1 && volley.every((s) => s.keys.has('_ox') && s.keys.has('_oy'))
      && /S\._bowGripDX/.test(volleyFile) && /S\._bowGripDY/.test(volleyFile), volley.map((s) => [...s.keys.keys()]));
  /* the plain shot's `fromGrip` is read where arrows fly: its nock is the grip */
  const nock = [...code].filter(([, c]) => /\.fromGrip&&/.test(c) && /\._ox=/.test(c) && /S\._bowGripX/.test(c)).map(([f]) => base(f));
  check('§222 nock: a `fromGrip` arrow takes its _ox / _oy from the grip where arrows fly', nock.length >= 1, nock);
  /* between shots, the grip the pose WOULD draw is published */
  const pred = [...code].filter(([, c]) => /_predictBowGrip\(S\)\{/.test(c)
    && /!S\._bowShowing\)this\._predictBowGrip\(S\)/.test(c)).map(([f]) => base(f));
  const writes = pred.length && (() => { const c = code.get([...code.keys()].find((f) => base(f) === pred[0])); const a = c.indexOf('_predictBowGrip(S){'); const b = closeOf(masked.get([...code.keys()].find((f) => base(f) === pred[0])), a + '_predictBowGrip(S)'.length); const body = c.slice(a, b); return /S\._bowGripDX=/.test(body) && /S\._bowGripDY=/.test(body); })();
  check('§222 predict: the effects renderer predicts the grip between shots (_predictBowGrip while the bow is not drawn, writing S._bowGripDX / DY)',
    pred.length === 1 && writes, pred);
}

/* ── §262: no hold of the walk while a Wheel dungeon opens ── */
{
  const holds = [];
  for (const [f, c] of code) {
    const m = masked.get(f);
    for (const x of m.matchAll(/(?<![\w$.])if\(/g)) {
      const end = closeOf(m, x.index + 2);
      if (!/^finalSpd(?:=0|\*=0)(?![.\d])/.test(m.slice(end + 1, end + 14))) continue;
      holds.push({ f, cond: c.slice(x.index + 3, end) });
    }
  }
  /* a helper the condition calls is read too: one level */
  const defs = new Map();
  for (const [f, c] of code) {
    const m = masked.get(f);
    for (const x of m.matchAll(/(?:function ([A-Za-z_$][\w$]*)\([^)]*\)\{|(?<![\w$.])([A-Za-z_$][\w$]*)=function\([^)]*\)\{)/g)) {
      const name = x[1] || x[2];
      const open = x.index + x[0].length - 1;
      if (!defs.has(name)) defs.set(name, []);
      defs.get(name).push(c.slice(open, closeOf(m, open) + 1));
    }
  }
  const named = [];
  for (const h of holds) {
    if (/_wheelDungeonOpening/.test(h.cond)) named.push(`${base(h.f)}: if(${h.cond})`);
    for (const x of h.cond.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\(/g)) {
      for (const body of defs.get(x[1]) || []) if (/_wheelDungeonOpening/.test(body)) named.push(`${base(h.f)}: if(${h.cond}) -> ${x[1]}() reads it`);
    }
  }
  check(`§262: the holds that stop the walk are found (${holds.length})`, holds.length >= 2, holds.map((h) => h.cond));
  check('§262: none of them holds you while a Wheel dungeon opens (S._wheelDungeonOpening): the worker still has you in the Wheel',
    named.length === 0, named);
}

process.exit(failed ? 1 : 0);
