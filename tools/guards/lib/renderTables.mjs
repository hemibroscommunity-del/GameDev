/* ═══ v2.3.5344: THE RENDERERS' TABLES, COUNTED (grand plan step 5.5, card M PR 5) ═══
 *
 * The one reader of the two renderers' top level (src/rendering/systems/
 * entityRenderer.js and effectsRenderer.js) for card M's tables: the
 * census (docs/plan/census/M-tables.md, written by
 * `node tools/guards/render-tables.test.mjs --write`) and the guard
 * (tools/guards/render-tables.test.mjs) both read it, so the page and the
 * line count the same things (the plan's rule 2).
 *
 * THE RULES, PINNED (card M, line 5, and the owner's review, 2026-11-17):
 *   - A TABLE is a top-level `const` whose value is an object or array
 *     literal made of literals only: numbers (a minus sign included),
 *     strings, template strings with no `${}`, booleans, null, arithmetic
 *     over them and Math's constants (`-Math.PI / 4`: REST_ANG, the card's
 *     own example of a table), nested
 *     object and array literals, and names of other tables in the same file
 *     (a spread of one too).  No call (an `Object.freeze(...)` around it is
 *     a call: it is listed apart, never counted), no other name, no
 *     function, no computed key that is not a literal.
 *   - A TABLE THE CODE WRITES INTO is not a table: it stays, and is listed
 *     apart.  Written into: assigned (`T[k] = v`, `T.a.b = v`, `T = v`),
 *     counted up or down, deleted from, or handed to a method that changes
 *     it in place (`push`, `splice`, `sort`, `set`, ... on T or below it;
 *     `Object.assign(T, ...)` and its kin), where `T` is the top-level
 *     name, never a local of the same name.
 *   - A TABLE HANDED ON may be written where it goes, unseen here: the name
 *     itself given away -- aliased (`const a = T`), an argument (`f(T)`),
 *     an element of a literal (`[T, url]`, `{ into: T }`), or returned --
 *     through `&&`, `||`, `?:` and `( , )`.  Listed apart, never counted.
 *     (A part of it given away, `f(T.frames)`, is not followed: a read.)
 *   - A LONE CONSTANT is a top-level `const` whose value is a literal, or
 *     arithmetic over literals and Math's constants only (`2 * 16`,
 *     `Math.PI * 0.85`): a number, a string, a boolean.  Each is marked TUNED when its name says it is a scale, an
 *     offset or an anchor of the art: a word of its name is in
 *     TUNED_WORDS and none in UNTUNED_WORDS (below), else not; the owner's review: the tuned ones leave with the
 *     tables.
 *   - A SYSTEM (from the map: tools/guards/lib/systems.mjs): a counted
 *     table's is read by hand (TABLE_SYSTEM below); any other's is the system
 *     whose `words` its name holds most; a name with none, the comment
 *     just above it; neither, `render` (the map's home for src/rendering/).
 *     A tie goes to the system first in the map.  A word counts when a word
 *     of the name is it, or starts with it (four letters or more:
 *     `armoured` is `armour`).
 *   - THE SUITES THAT READ IT BY ITS TEXT: a suite (server/test/,
 *     tools/guards/) whose text holds the name as a whole word and reads the
 *     renderers (names either file, or asks filesOf/readSystem/findIn for
 *     `render`).
 *
 * It loads @babel/parser and @babel/traverse from the root's packages, else
 * server/'s (GitHub's `test` job installs only server/'s).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { SYSTEMS } from './systems.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/* the two files, found by the map's system (tests-by-system: a guard names
   no big file by its path) */
export const RENDER_FILES = Object.freeze(['entityRenderer.js', 'effectsRenderer.js']);

let _babel = null;
export function babel() {
  if (_babel) return _babel;
  for (const pkg of ['package.json', 'server/package.json']) {
    try {
      const req = createRequire(join(ROOT, pkg));
      const t = req('@babel/traverse');
      _babel = { parse: req('@babel/parser').parse, traverse: t.default || t };
      return _babel;
    } catch { /* the next */ }
  }
  throw new Error('renderTables: @babel/parser and @babel/traverse load from neither the root nor server/ (npm install in one of them)');
}

/* the words of a name: FOO_BAR, fooBar, _fooBar -> ['foo', 'bar'] */
export const nameWords = (n) => String(n).replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/* TUNED: a scale, an offset or an anchor of the art, by the name's words */
export const TUNED_WORDS = Object.freeze([
  'scale', 'mul', 'frac', 'ratio', 'aspect', 'offset', 'dx', 'dy', 'ox', 'oy', 'x', 'y', 'anchor', 'pivot', 'origin',
  'lift', 'rise', 'drop', 'sink', 'shift', 'nudge', 'tilt', 'lean', 'ang', 'angle', 'arc', 'rot', 'w', 'h', 'width',
  'height', 'size', 'px', 'top', 'bottom', 'foot', 'feet', 'row', 'rows', 'neck', 'waist', 'head', 'chin', 'hip',
  'shoulder', 'grip', 'tip', 'cell', 'mid', 'inset', 'pad', 'gap', 'r', 'radius', 'len', 'k', 'ds',
]);
const TUNED = new Set(TUNED_WORDS);
/* words that make a name NOT the art's shape: a time, a count, a distance
   in the world, a colour, a font's or a page's bake, a text's layout */
export const UNTUNED_WORDS = Object.freeze([
  'ms', 's', 'sec', 'hz', 'fps', 'ttl', 'max', 'min', 'cap', 'count', 'n', 'limit', 'rounds', 'budget', 'ver', 'url',
  'id', 'chance', 'rate', 'reach', 'range', 'margin', 'match', 'tint', 'color', 'colour', 'col', 'alpha', 'fill',
  'ink', 'flash', 'page', 'bake', 'font', 'wrap', 'edge', 'lines',
]);
const UNTUNED = new Set(UNTUNED_WORDS);
export function tunedName(name) {
  const w = nameWords(name);
  if (w.some((x) => UNTUNED.has(x))) return false;
  return w.some((x) => TUNED.has(x));
}

const MUTATORS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin', 'set', 'delete', 'clear', 'add']);
const OBJ_WRITERS = new Set(['assign', 'defineProperty', 'defineProperties', 'setPrototypeOf']);

/* the top-level name a member chain starts from (T.a[b].c -> T), or null */
function rootName(node) {
  let n = node;
  while (n && (n.type === 'MemberExpression' || n.type === 'OptionalMemberExpression')) n = n.object;
  return n && n.type === 'Identifier' ? n.name : null;
}

/* is this value made of literals (and the names in `tables`) only? */
function literalOnly(node, tables, used) {
  if (!node) return false;
  switch (node.type) {
    case 'NumericLiteral': case 'StringLiteral': case 'BooleanLiteral': case 'NullLiteral': return true;
    case 'TemplateLiteral': return node.expressions.length === 0;
    case 'UnaryExpression': case 'BinaryExpression': case 'MemberExpression': case 'ParenthesizedExpression': return loneValue(node);
    case 'Identifier': if (tables.has(node.name)) { used.add(node.name); return true; } return false;
    case 'ArrayExpression': return node.elements.every((e) => e === null || (e.type === 'SpreadElement' ? literalOnly(e.argument, tables, used) : literalOnly(e, tables, used)));
    case 'ObjectExpression': return node.properties.every((p) => {
      if (p.type === 'SpreadElement') return literalOnly(p.argument, tables, used);
      if (p.type !== 'ObjectProperty') return false;   /* a method, a getter */
      if (p.computed && !['NumericLiteral', 'StringLiteral'].includes(p.key.type)) return false;
      return literalOnly(p.value, tables, used);
    });
    default: return false;
  }
}

/* Math's own constants are numbers (REST_ANG's `-Math.PI / 4`, the card's own example) */
const MATH_CONSTS = new Set(['PI', 'E', 'SQRT2', 'SQRT1_2', 'LN2', 'LN10', 'LOG2E', 'LOG10E']);

/* a lone constant: a literal, or arithmetic over literals only */
function loneValue(node) {
  if (!node) return false;
  switch (node.type) {
    case 'NumericLiteral': case 'StringLiteral': case 'BooleanLiteral': return true;
    case 'TemplateLiteral': return node.expressions.length === 0;
    case 'UnaryExpression': return (node.operator === '-' || node.operator === '+') && loneValue(node.argument);
    case 'BinaryExpression': return ['+', '-', '*', '/', '%', '**', '<<', '>>', '|', '&'].includes(node.operator) && loneValue(node.left) && loneValue(node.right);
    case 'ParenthesizedExpression': return loneValue(node.expression);
    case 'MemberExpression': return !node.computed && node.object.type === 'Identifier' && node.object.name === 'Math' && MATH_CONSTS.has(node.property.name);
    default: return false;
  }
}

/* v2.3.5344: each counted table's system, READ BY HAND (2026-11-17) from its
   own comment and its readers: what it draws.  The map's words were made for
   file names: on a table's name they mislead (`hidden` is server-core's,
   `rest` movement's, `frame` page-thread's), so a table here is the map's
   system by its meaning; a table not here (a new one) takes the word guess
   below.  look: the body, its gear, hats, hair, capes; combat: the weapon
   in the hand, its swing and block, arrows and bolts; skills: the gathering
   and making poses, their stand-ins and nodes; economy: loot on the ground;
   ui: bars and plates over a figure; townsfolk, preload, render as named. */
export const TABLE_SYSTEM = Object.freeze({
  GRIP_NUDGE_X: 'combat', NPC_DIRS_8: 'townsfolk', TRAIT_RETRY_LATER_MS: 'look', _TRAIT_RETRY_MS: 'look',
  MIRROR_SCREEN_DIR: 'look', JOG_FOOT_FRAMES: 'look', BODY_DIR_SCALE: 'look', BODY_ROWS: 'look',
  JOG_EW_HAT_TUNE: 'look', STAND_HAT_TUNE: 'look', FULLSET_CROWN: 'look', FULLSET_HEAD_RES: 'look',
  FULLSET_HEAD_SEAT: 'look', _GEAR_SLOTS: 'look', _CAPE_HIDDEN_POSES: 'look', _CAPE_JOG_TILT: 'look',
  _CAPE_JOG_DX: 'look', PREWARM_POSES: 'preload', _REGION_SPR: 'look', SECTORS: 'render',
  GRIP_HOLE_FACINGS: 'combat', GRIP_HOLE_R_BY_FACING: 'combat', REST_ANG: 'combat', NECK_ROWS: 'look',
  BLOCK_ARM_SHOULDER: 'combat', SOUTH_BLOCK_OFFHAND: 'combat', SOUTH_BLOCK_OFFHAND_BY_TYPE: 'combat',
  RES_FILL: 'ui', RES_GHOST: 'ui', RES_GHOST_HEX: 'ui',
  CHOP_INK_KEYS: 'skills', COOK_URL: 'skills', SECTORS8: 'combat', FARM_GEAR: 'skills', FARM_PEER_LAYERS: 'skills',
  GEAR_STRIP_TWIN: 'skills', DRESSED_ONE_FRAME: 'skills', FIRE_LOG_BAND: 'skills', _STAND_IN_TRAIT_KEYS: 'look',
  FIRE_GEAR_REG: 'skills', BOW_AIM_SECTORS: 'combat', MAGIC_BOLT_ANCHOR: 'combat', SWORD_FEEL_FLIP: 'combat',
  NODE_SPRITE_HEIGHT_BASE: 'skills', NODE_SPRITE_ANCHOR_Y: 'skills', NODE_ART_BASE: 'skills', NODE_HPBAR_AT: 'skills',
  NODE_LABEL_TOP: 'skills', NODE_TIER_TINT: 'skills', LOOT_Z: 'economy', LOOT_BEAMS_BY_RANK: 'economy',
  BEAM_SLOTS: 'economy', RARE_KINDS: 'economy', HOP_KEYS: 'economy',
});

/* the system from the map's words (a table not read by hand above) */
const SYS_WORDS = Object.entries(SYSTEMS).map(([k, v]) => [k, (v.words || []).filter((w) => /^[a-z]+$/.test(w))]);
export function systemOf(name, comment) {
  const best = (ws) => {
    let k0 = null, score = 0;
    for (const [k, words] of SYS_WORDS) {
      const sc = words.reduce((a, w) => a + ws.filter((x) => x === w || (w.length >= 4 && x.startsWith(w))).length, 0);
      if (sc > score) { k0 = k; score = sc; }
    }
    return k0;
  };
  return best(nameWords(name)) || best(nameWords(comment || '')) || 'render';
}

/** Scan one file's text: { tables, written, handed, frozen, lone } (rows in order). */
export function scanText(src, file) {
  const { parse, traverse } = babel();
  const ast = parse(src, { sourceType: 'module', plugins: ['jsx'], attachComment: true });
  const lineStarts = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === '\n') lineStarts.push(i + 1);
  /* the top-level consts, in order */
  const decls = [];
  for (let st of ast.program.body) {
    const exported = st.type === 'ExportNamedDeclaration' && !!st.declaration;
    const lead = st.leadingComments || [];
    if (exported) st = st.declaration;
    if (st.type !== 'VariableDeclaration') continue;
    st.declarations.forEach((d, i) => {
      if (d.id.type !== 'Identifier') return;
      const comment = i === 0 && lead.length ? lead[lead.length - 1].value : '';
      decls.push({ name: d.id.name, kind: st.kind, init: d.init, line: d.loc.start.line, endLine: d.loc.end.line, exported, comment });
    });
  }
  /* tables: a fixpoint (a table may name a table declared above it) */
  const tables = new Set();
  const uses = new Map();
  for (let changed = true; changed;) {
    changed = false;
    for (const d of decls) {
      if (d.kind !== 'const' || tables.has(d.name) || !d.init) continue;
      if (d.init.type !== 'ObjectExpression' && d.init.type !== 'ArrayExpression') continue;
      const used = new Set();
      if (literalOnly(d.init, tables, used)) { tables.add(d.name); uses.set(d.name, [...used]); changed = true; }
    }
  }
  /* written into: by the top-level binding only */
  const written = new Map();
  const note = (name, path, how) => {
    if (!tables.has(name)) return;
    const b = path.scope.getBinding(name);
    if (!b || b.scope.block.type !== 'Program') return;
    if (!written.has(name)) written.set(name, `${how} (line ${path.node.loc.start.line})`);
  };
  /* handed on: the name itself given away (an alias, an argument, an element
     of a literal, a return value), through && || ?: and ( , ) */
  const handed = new Map();
  const tableDecl = new Set(decls.filter((d) => tables.has(d.name)).map((d) => d.init));
  const hand = (name, path) => {
    const b = path.scope.getBinding(name);
    if (!b || b.scope.block.type !== 'Program') return;
    let c = path;
    while (c.parentPath && ['LogicalExpression', 'ConditionalExpression', 'SequenceExpression', 'ParenthesizedExpression'].includes(c.parentPath.node.type)
      && !(c.parentPath.node.type === 'ConditionalExpression' && c.parentPath.node.test === c.node)
      && !(c.parentPath.node.type === 'SequenceExpression' && c.parentPath.node.expressions.at(-1) !== c.node)) c = c.parentPath;
    const par = c.parentPath && c.parentPath.node;
    if (!par) return;
    let how = null;
    if (par.type === 'VariableDeclarator' && par.init === c.node) how = 'aliased';
    else if (par.type === 'AssignmentExpression' && par.right === c.node) how = 'aliased';
    else if ((par.type === 'CallExpression' || par.type === 'NewExpression' || par.type === 'OptionalCallExpression') && par.arguments.includes(c.node)) how = 'an argument';
    else if (par.type === 'ArrayExpression' || (par.type === 'ObjectProperty' && par.value === c.node)) {
      /* a table inside another table's literal is the table's own (above) */
      if (c.findParent((q) => tableDecl.has(q.node))) return;
      how = 'in a literal';
    } else if (par.type === 'ReturnStatement' || (par.type === 'ArrowFunctionExpression' && par.body === c.node)) how = 'returned';
    if (how && !handed.has(name)) handed.set(name, `${how} (line ${path.node.loc.start.line})`);
  };
  traverse(ast, {
    Identifier(p) { if (tables.has(p.node.name) && p.isReferencedIdentifier()) hand(p.node.name, p); },
    AssignmentExpression(p) { const r = p.node.left.type === 'Identifier' ? p.node.left.name : rootName(p.node.left); if (r) note(r, p, 'assigned'); },
    UpdateExpression(p) { const r = p.node.argument.type === 'Identifier' ? p.node.argument.name : rootName(p.node.argument); if (r) note(r, p, 'counted'); },
    UnaryExpression(p) { if (p.node.operator === 'delete') { const r = rootName(p.node.argument); if (r) note(r, p, 'deleted from'); } },
    CallExpression(p) {
      const c = p.node.callee;
      if (c.type === 'MemberExpression' && !c.computed && c.property.type === 'Identifier') {
        if (MUTATORS.has(c.property.name)) { const r = rootName(c.object) || (c.object.type === 'Identifier' ? c.object.name : null); if (r) note(r, p, `.${c.property.name}()`); }
        if (c.object.type === 'Identifier' && c.object.name === 'Object' && OBJ_WRITERS.has(c.property.name) && p.node.arguments[0]) {
          const a = p.node.arguments[0];
          const r = a.type === 'Identifier' ? a.name : rootName(a);
          if (r) note(r, p, `Object.${c.property.name}()`);
        }
      }
    },
  });
  const rows = { tables: [], written: [], handed: [], frozen: [], lone: [] };
  for (const d of decls) {
    const base = { name: d.name, file, line: d.line, lines: d.endLine - d.line + 1, exported: d.exported };
    if (tables.has(d.name)) {
      const row = { ...base, system: Object.hasOwn(TABLE_SYSTEM, d.name) ? TABLE_SYSTEM[d.name] : systemOf(d.name, d.comment), byHand: Object.hasOwn(TABLE_SYSTEM, d.name), names: uses.get(d.name) };
      if (written.has(d.name)) rows.written.push({ ...row, how: written.get(d.name) });
      else if (handed.has(d.name)) rows.handed.push({ ...row, how: handed.get(d.name) });
      else rows.tables.push(row);
      continue;
    }
    if (d.kind === 'const' && d.init && d.init.type === 'CallExpression' && d.init.callee.type === 'MemberExpression'
      && d.init.callee.object.name === 'Object' && d.init.callee.property.name === 'freeze' && d.init.arguments[0]
      && literalOnly(d.init.arguments[0], tables, new Set())) {
      rows.frozen.push({ ...base, system: systemOf(d.name, d.comment) });
      continue;
    }
    if (d.kind === 'const' && loneValue(d.init)) rows.lone.push({ ...base, system: systemOf(d.name, d.comment), tuned: tunedName(d.name) });
  }
  return rows;
}

/** The two renderers' paths, from the map (render's files with those names). */
export async function renderPaths() {
  const { filesOf } = await import('./filesOf.mjs');
  return RENDER_FILES.map((n) => {
    const p = filesOf('render').find((f) => f.endsWith('/' + n));
    if (!p) throw new Error(`renderTables: the map gives render no ${n}`);
    return p;
  });
}

/** Both files scanned: { tables, written, handed, frozen, lone }, each a list of rows. */
export async function scanRenderers(root = ROOT) {
  const out = { tables: [], written: [], handed: [], frozen: [], lone: [] };
  for (const p of await renderPaths()) {
    const r = scanText(readFileSync(join(root, p), 'utf8'), p);
    for (const k of Object.keys(out)) out[k].push(...r[k]);
  }
  return out;
}

/** The suites that read the renderers and hold a name as a whole word: Map(name -> [suite]). */
export function suitesNaming(names, root = ROOT) {
  const out = new Map(names.map((n) => [n, []]));
  for (const d of ['server/test', 'tools/guards']) {
    let files = [];
    try { files = readdirSync(join(root, d)).filter((f) => f.endsWith('.test.mjs')).sort(); } catch { continue; }
    for (const f of files) {
      if (f === 'render-tables.test.mjs') continue;   /* the census's own guard */
      const s = readFileSync(join(root, d, f), 'utf8');
      const readsRender = /(effects|entity)Renderer\b/.test(s) || /(filesOf|readSystem|findIn)\(\s*['"]render['"]/.test(s);
      if (!readsRender) continue;
      for (const n of names) if (new RegExp(`(?<![\\w$])${n.replace(/\$/g, '\\$')}(?![\\w$])`).test(s)) out.get(n).push(`${d}/${f}`);
    }
  }
  return out;
}
