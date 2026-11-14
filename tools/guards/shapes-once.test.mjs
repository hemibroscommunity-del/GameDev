/* ═══ v2.3.5104: A SHAPE IS DESIGNED ONCE (rule 2's guard; card B PR 5) ═══
 *
 * The grand plan's rule 2: "Before a step adds an id, a record, a wire
 * column or a feed, it gives it one row in docs/SHAPES.md: its one writer,
 * its readers, its cost in rows.  A guard fails a second definition."
 * docs/SHAPES.md part 10 says what this guard reads, in five holds:
 *
 *   1. each NEW name of SHAPES part 8 ("Chosen") is defined in exactly one
 *      file of server/src or src, and that file is its row's Where (NAMES);
 *   2. no code writes a storage key with a prefix of that page (`daybook:`,
 *      `xfer:`, `play_trace:`, `permit:`) outside its row's one writer
 *      (PREFIXES);
 *   3. nothing but the action door (src/game/actions.js, step 5.8) makes a
 *      `reqId`;
 *   4. no `kind`, `wayIn` or `permit` is read off a message as an actor's;
 *   5. deviceProfile.js is the one file that returns a `devClass` field (the
 *      other half, "the one file that asks the device a question", is held
 *      by server/test/device-profile.test.mjs §3: rule 2, never a second
 *      guard; this checks that it still says so).
 *
 * A HOLD WHOSE SHAPE IS NOT BUILT YET passes with a line saying so, and
 * starts holding when it is.  The day a name first appears in the code, its
 * row below has no Where yet: the guard fails until the builder writes the
 * one file it lives in (part 8 named the names; most rows had no file yet).
 * That write is the shape's registration: a second file is then a FAIL.
 *
 * WHAT "DEFINES" MEANS (pinned).  The code is read without its comments
 * (lib/codeOnly.mjs: esbuild's output).  A file defines a name when it
 * declares it (`const|let|var|function|class NAME`), gives it as an object's
 * key (`{ NAME: ...`, `, NAME: ...`, quoted too) or sets it (`.NAME = `).  A
 * read (`x.NAME`, `const { NAME } = msg`) is not a definition.  A key given
 * by shorthand (`{ NAME }`) is not seen: a known gap, written down.
 * A storage key is WRITTEN with a prefix where a string or template starting
 * with it appears in server/src.
 *
 * BREAK PROOF (rule 8), each tried by hand, 2026-11-14:
 *   1. `export const liarGain = 1;` in server/src/data.js          -> FAIL 1 (no Where)
 *   2. `const k = 'xfer:' + pid;` in server/src/gold.js            -> FAIL 2
 *   3. `const o = { reqId: 1 };` in src/game/quests.js             -> FAIL 3 (and 1)
 *   4. `const w = payload.wayIn;` in server/src/join.js            -> FAIL 4
 *   5. `export const x = { devClass: 'a' };` in src/game/xpPop.js  -> FAIL 5 (and 1)
 *
 *   (v2.3.5104, again at main 0c83972: card A's report carries devClass and
 *   drawLane as its fields, and card E's daybook.js writes `daybook:`; the
 *   five above still turn red, and a `{ 'daybook:': 1 }` key, a name, does not)
 *
 * Run from the repository's root: node tools/guards/shapes-once.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { codeOf } from './lib/codeOnly.mjs';
import { ROOT } from './lib/fourLines.mjs';

/* SHAPES part 8, "Chosen", and each row's one file (null: not placed yet;
   the builder writes it here in the PR that first defines the name) */
const NAMES = Object.freeze({
  actor: { part: 1, where: null },
  principal: { part: '1, 2', where: null },
  stint: { part: '1, 2', where: null },
  wayIn: { part: '1, 5', where: 'server/src/wire/columns.js', carriers: ['server/src/wire/in.js', 'server/src/wire/relays.js', 'server/src/wire/out.js', 'server/src/wire/http.js'] },   /* v2.3.5061 (card N): the column's closed list; each row file carries its values */
  permit: { part: '1, 7', where: null },
  /* the action door (step 5.8; part 10).  Read in src/ only: the worker
     echoes a request's reqId in its answer, which carries it, not makes it */
  reqId: { part: 2, where: 'src/game/actions.js', scope: 'src/' },
  /* v2.3.5104: `carriers` are a shape's own listed readers that carry it
     as a field of THEIR shape, by SHAPES' design: the report's fields are
     `devClass` and `drawLane` (part 4; part 6 lists the report as a reader),
     and until card O builds lanes `drawLane` is the one value 'full' */
  devClass: { part: 6, where: 'src/game/deviceProfile.js', carriers: ['src/debug/report.js', 'server/src/wire/in.js'] },   /* part 6's row; v2.3.5062: the wire table's `report` row names it as a field (card N) */
  drawLane: { part: '4, 6', where: null, carriers: ['src/debug/report.js', 'server/src/wire/in.js'] },   /* card O's one function, when built; v2.3.5062: the wire table's `report` row names it as a field (card N) */
  mayStart: { part: 5, where: 'server/src/wire/columns.js', carriers: ['server/src/wire/in.js', 'server/src/wire/relays.js', 'server/src/wire/out.js', 'server/src/wire/http.js'] },   /* v2.3.5061 (card N): the column's closed list; each row file carries its values */
  doesWhat: { part: 5, where: 'server/src/wire/columns.js', carriers: ['server/src/wire/in.js', 'server/src/wire/relays.js', 'server/src/wire/out.js', 'server/src/wire/http.js'] },   /* v2.3.5061 (card N): the column's closed list; each row file carries its values */
  liarGain: { part: 7, where: null },
});
/* the storage prefixes of the page, and each one's writer (null: not built) */
const PREFIXES = Object.freeze({
  'daybook:': { part: 7, writer: 'server/src/daybook.js' },   /* v2.3.5080, card E: bookAdd, the one door */
  'xfer:': { part: 7, writer: null },
  'play_trace:': { part: 7, writer: null },
  'permit:': { part: 7, writer: null },
});
const ACTION_DOOR = 'src/game/actions.js';
const PROFILE = 'src/game/deviceProfile.js';
/* the names the worker gives a message in its handlers ((session, payload)
   110 times, (session, msg) 29, data once, `m` in the router) */
const MSG = '(?:payload|msg|data|m|body)';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};
const notBuilt = (what) => console.log('ok   ' + what + ' (not built yet: holds from the day it is)');

const code = codeOf(['src', 'server/src']);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function definesRe(name) {
  const n = esc(name);
  return new RegExp(`(?:\\b(?:const|let|var|function|class)\\s+${n}\\b|[{,]\\s*(?:${n}|"${n}"|'${n}')\\s*:|\\.${n}\\s*=(?!=))`);
}
const definers = (name) => [...code].filter(([, c]) => definesRe(name).test(c)).map(([f]) => f);

/* ── 1. each new name: one file, its Where ── */
for (const [name, row] of Object.entries(NAMES)) {
  const carriers = row.carriers || [];
  const files = definers(name).filter((f) => (!row.scope || f.startsWith(row.scope)) && !carriers.includes(f));
  if (!files.length) { notBuilt(`1: \`${name}\` (SHAPES part ${row.part})` + (carriers.length ? `, carried by ${carriers.join(', ')}` : '')); continue; }
  if (!row.where) { check(`1: \`${name}\` is defined, so its row needs its one file: write it as NAMES.${name}.where in tools/guards/shapes-once.test.mjs (rule 2)`, false, files); continue; }
  check(`1: \`${name}\` is defined in one file, its Where (${row.where})`, files.length === 1 && files[0] === row.where, files);
}

/* ── 2. storage prefixes: only their one writer ── */
for (const [prefix, row] of Object.entries(PREFIXES)) {
  /* v2.3.5104: a string that is an object's KEY names the prefix (the
     storage registry's marks, storagemarks.js), it writes nothing */
  const re = new RegExp(`["'\`]${esc(prefix)}[^"'\`]*["'\`](?!\\s*:)`);
  const files = [...code].filter(([f, c]) => f.startsWith('server/src/') && re.test(c)).map(([f]) => f);
  if (!files.length) { notBuilt(`2: the storage prefix \`${prefix}\``); continue; }
  if (!row.writer) { check(`2: \`${prefix}\` is written, so its row needs its one writer: write it as PREFIXES['${prefix}'].writer (and its key in ARCHITECTURE-HANDOFF's registry)`, false, files); continue; }
  check(`2: \`${prefix}\` is written by its one writer only (${row.writer})`, files.length === 1 && files[0] === row.writer, files);
}

/* ── 3. only the action door makes a reqId ── */
{
  const files = definers('reqId').filter((f) => f.startsWith('src/'));
  if (!files.length && !existsSync(join(ROOT, ACTION_DOOR))) notBuilt('3: the action door and its `reqId`');
  else check(`3: nothing but the action door (${ACTION_DOOR}) makes a \`reqId\``, files.every((f) => f === ACTION_DOOR), files.filter((f) => f !== ACTION_DOOR));
}

/* ── 4. an actor's kind, wayIn and permit never come off a message ── */
{
  const off = [];
  for (const [f, c] of code) {
    if (!f.startsWith('server/src/')) continue;
    if (new RegExp(`\\b${MSG}\\.(?:wayIn|permit)\\b`).test(c)) off.push(`${f}: reads wayIn or permit off a message`);
    /* an actor made with a field taken off the message */
    for (const m of c.matchAll(/\bactor\s*[:=]\s*\{([^{}]*)\}/g)) {
      if (new RegExp(`\\b(?:kind|wayIn|permit)\\s*:\\s*${MSG}\\.`).test(m[1])) off.push(`${f}: an actor's kind, wayIn or permit from a message`);
    }
  }
  if (!definers('actor').length && !off.length) notBuilt('4: the actor (no kind, wayIn or permit off a message)');
  else check('4: no kind, wayIn or permit is read off a message as an actor\'s', off.length === 0, off);
}

/* ── 5. the device profile ── */
{
  const files = definers('devClass').filter((f) => !(NAMES.devClass.carriers || []).includes(f));
  if (!files.length) notBuilt('5: `devClass`, only in deviceProfile.js');
  else check(`5: only ${PROFILE} returns a \`devClass\` field`, files.every((f) => f === PROFILE), files.filter((f) => f !== PROFILE));
  const suite = readFileSync(join(ROOT, 'server/test/device-profile.test.mjs'), 'utf8');
  check('5: device-profile.test still holds "the one file that asks the device" (its §3, ONE PLACE)', /3\. ONE PLACE/.test(suite) && /deviceProfile\.js/.test(suite));
}

/* ── 6. the finder reads as pinned ── */
{
  const t = (src) => definesRe('reqId').test(src);
  check('6: a declaration, a key, a quoted key and a set define; a read and a comparison do not',
    t('const reqId=1') && t('f({a:1,reqId:2})') && t('x={"reqId":1}') && t('o.reqId=3')
    && !t('g(o.reqId)') && !t('if(o.reqId===1)') && !t('const{reqId}=msg') && !t('a?reqId:b'));
}

console.log(failed ? `\n${failed} FAILED` : '\nall green');
process.exit(failed ? 1 : 0);
