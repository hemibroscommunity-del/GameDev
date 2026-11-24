/* ═══ v2.3.6463: THE ROADS' LEVERS SAY WHAT THEY ARE (card BK PR 4; grand plan step 10.5) ═══
 *
 * Every road between players (server/src/playerroads.js PLAYER_ROADS) has a
 * `fee`, a `hold` and a `pace`, all 0 by the owner's call 12.  Nothing reads
 * them: a `fee: 0` is not "no fee is charged", it is "no fee is ever
 * looked at".  LEVERS (playerroads.js) marks each `wired: false` with its
 * why, and this guard holds the marks to the source.  It fails:
 *
 *   1. A LEVER MARKED NOT WIRED THAT A FILE READS: a file of server/src that
 *      can reach a row (it imports PLAYER_ROADS, or the module whole, from
 *      playerroads.js) and reads `.fee`, `.hold` or `.pace` (a member, a
 *      computed member by its name, or a destructured key) -- off the
 *      syntax tree (@babel), never a pattern of text (the plan's part 5,
 *      rule 2).  Wiring one is the PR that builds its reader and a test that
 *      sets it and sees it applied, on the owner's word: it turns the mark
 *      to `wired: true`;
 *   2. A LEVER MARKED WIRED THAT NOTHING READS: a mark is no claim;
 *   3. A ROW REACHED ANOTHER WAY: a file of server/src that passes
 *      PLAYER_ROADS on (`export { PLAYER_ROADS }`, `export * from`), so a
 *      reader could hold a row without importing it from the table;
 *   4. THE SCAN IS WHOLE: every file of server/src (server/test/src-walk.mjs,
 *      the doors' list) parses, and the three levers are the table's;
 *   5. THE SCAN SEES A PLANT: the scan, run on planted source, finds a read
 *      by member, by destructuring, through the module whole, and a pass-on.
 *
 * Its scope, said once: a file that imports only `playerRoadsBy` (xfer.js:
 * the rows' keys, never a row) cannot hold a row, so its own `.fee` is not
 * the table's.  A file that does import the rows is read whole: any `.fee`
 * in it counts, the table's or not -- a reason to keep the rows' readers few.
 *
 * BREAK PROOF (rule 8), tried by hand 2026-11-24:
 *   - in server/src/xfer.js, `import { PLAYER_ROADS } from './playerroads.js';`
 *     and `export const _f = PLAYER_ROADS.market.fee;`          -> FAIL 1
 *   - `fee: Object.freeze({ wired: true, ...` in playerroads.js LEVERS
 *                                                               -> FAIL 2
 *
 * Run: node tools/guards/road-levers.test.mjs (from the repository's root;
 * server/test/run.mjs runs it with every guard). */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const { srcFiles, SRC_PATH } = await import(new URL('../../server/test/src-walk.mjs', import.meta.url));
const { LEVERS, PLAYER_ROADS } = await import(new URL('../../server/src/playerroads.js', import.meta.url));

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};

let babel = null;
for (const pkg of ['package.json', 'server/package.json']) {
  try {
    const req = createRequire(join(ROOT, pkg));
    const t = req('@babel/traverse');
    babel = { parser: req('@babel/parser'), traverse: t.default || t };
    break;
  } catch { /* the next */ }
}
if (!babel) { console.log('FAIL 4. @babel/parser and @babel/traverse are installed (npm install at the root)'); process.exit(1); }

const NAMES = Object.keys(LEVERS);
const fromTable = (src) => typeof src === 'string' && /(^|\/)playerroads\.js$/.test(src);

/* one file's source: the levers it reads (if it can reach a row) and what it
   passes on */
function scan(code, file) {
  const ast = babel.parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });
  let reaches = false;
  const passes = [];
  const reads = [];
  for (const n of ast.program.body) {
    if (n.type === 'ImportDeclaration' && fromTable(n.source.value)) {
      for (const s of n.specifiers) {
        if (s.type === 'ImportNamespaceSpecifier' || s.type === 'ImportDefaultSpecifier') reaches = true;
        else if (s.imported && (s.imported.name || s.imported.value) === 'PLAYER_ROADS') reaches = true;
      }
    }
    if (n.type === 'ExportAllDeclaration' && fromTable(n.source && n.source.value)) passes.push(file + ': export * from the table');
    if (n.type === 'ExportNamedDeclaration') {
      for (const s of n.specifiers || []) {
        const local = s.local && (s.local.name || s.local.value);
        if (local === 'PLAYER_ROADS' || (s.type === 'ExportNamespaceSpecifier' && fromTable(n.source && n.source.value))) passes.push(file + ': passes PLAYER_ROADS on');
      }
    }
  }
  if (reaches) {
    const keyOf = (node, computed) => (!computed && node.type === 'Identifier' ? node.name : node.type === 'StringLiteral' ? node.value : null);
    babel.traverse(ast, {
      'MemberExpression|OptionalMemberExpression'(p) {
        const k = keyOf(p.node.property, p.node.computed);
        if (NAMES.includes(k)) reads.push({ lever: k, at: file + ':' + p.node.loc.start.line });
      },
      ObjectPattern(p) {
        for (const prop of p.node.properties) {
          if (prop.type !== 'ObjectProperty') continue;
          const k = keyOf(prop.key, prop.computed);
          if (NAMES.includes(k)) reads.push({ lever: k, at: file + ':' + prop.loc.start.line });
        }
      },
    });
  }
  return { reaches, passes, reads };
}

/* ══════════ THE SCAN ══════════ */
const files = srcFiles().filter((f) => f !== 'playerroads.js');
const broken = [];
const readers = Object.fromEntries(NAMES.map((k) => [k, []]));
const passed = [];
const reaching = [];
for (const f of files) {
  let r;
  try { r = scan(readFileSync(join(SRC_PATH, f), 'utf8'), f); }
  catch (e) { broken.push(f + ': ' + ((e && e.message) || e)); continue; }
  if (r.reaches) reaching.push(f);
  passed.push(...r.passes);
  for (const x of r.reads) readers[x.lever].push(x.at);
}

/* 4. the scan is whole */
check(`4. every file of server/src parses (${files.length} files)`, broken.length === 0 && files.length > 100, broken);
check('4. ...the levers are the table\'s three, each a row\'s field', NAMES.sort().join() === 'fee,hold,pace'
  && Object.values(PLAYER_ROADS).every((row) => NAMES.every((k) => typeof row[k] === 'number')), NAMES);

/* 1, 2. the marks against the readers */
for (const k of NAMES) {
  if (LEVERS[k].wired) check(`2. \`${k}\` is marked wired, and is read (${readers[k].length})`, readers[k].length > 0, 'nothing reads it: a mark is no claim');
  else check(`1. \`${k}\` is marked not wired, and no file that holds a row reads it (${reaching.length} hold the rows${reaching.length ? ': ' + reaching.join(', ') : ''})`, readers[k].length === 0, readers[k]);
}
/* 3. no row reached another way */
check('3. no file of server/src passes PLAYER_ROADS on', passed.length === 0, passed);

/* 5. the scan sees a plant */
const P = (code) => scan(code, 'plant.js');
const p1 = P("import { PLAYER_ROADS } from './playerroads.js';\nexport const f = PLAYER_ROADS.market.fee;");
const p2 = P("import * as R from './playerroads.js';\nconst { hold } = R.PLAYER_ROADS.duel; export { hold };");
const p3 = P("import { PLAYER_ROADS as T } from './playerroads.js';\nexport const p = (k) => T[k]['pace'];");
const p4 = P("import { playerRoadsBy } from './playerroads.js';\nexport const f = (o) => o.fee + playerRoadsBy('xfer').length;");
const p5 = P("export { PLAYER_ROADS } from './playerroads.js';");
check('5. the scan finds a planted read: by member, by destructuring through the module whole, by a computed name under another name',
  p1.reads.some((x) => x.lever === 'fee') && p2.reads.some((x) => x.lever === 'hold') && p3.reads.some((x) => x.lever === 'pace'), { p1, p2, p3 });
check('5. ...and none in a file that holds no row (its scope), and a pass-on', p4.reads.length === 0 && p5.passes.length === 1, { p4, p5 });

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
