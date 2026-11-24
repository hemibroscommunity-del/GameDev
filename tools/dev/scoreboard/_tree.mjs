/* v2.3.6524 (card WL PR 5): what the counters read off a file's syntax tree
   (finish.md part 5, rule 2: a tree, never a pattern of text).  A guard's
   own table (state-ledger's OWNED, chaos-restart's DRIVERS, a guard's line)
   is a const inside a test that runs when it is imported, so it is read,
   never imported.  Not a row: the scoreboard loads only files named by a
   row's id, and no id starts with `_`. */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadBabel } from '../../guards/lib/openHand.mjs';

/* the tree of a repo file, or null when the file or the parser is not here */
export function treeOf(root, rel) {
  const file = join(root, rel);
  if (!existsSync(file)) return null;
  const babel = loadBabel(root);
  if (!babel) return null;
  return babel.parser.parse(readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
}

/* every `const NAME = <init>` in the tree, at any depth (DRIVERS sits in a
   block): its init with Object.freeze(...) taken off, or null */
export function constInit(ast, name) {
  let found = null;
  const walk = (n) => {
    if (found || !n || typeof n.type !== 'string') return;
    if (n.type === 'VariableDeclarator' && n.id && n.id.type === 'Identifier' && n.id.name === name) { found = n.init; return; }
    for (const k of Object.keys(n)) {
      if (k === 'loc' || k === 'start' || k === 'end' || k === 'comments' || k === 'leadingComments' || k === 'trailingComments') continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') walk(v);
    }
  };
  walk(ast.program);
  while (found && found.type === 'CallExpression' && found.callee.type === 'MemberExpression'
    && found.callee.object.name === 'Object' && found.callee.property.name === 'freeze') found = found.arguments[0] || null;
  return found;
}

/* v2.3.6524 (sitting 58: `objectKeys` skipped a SpreadElement silently, so
   a table with `...MORE` in it printed a wrong number, not "not measured"):
   a literal is read whole or not at all.  A key it cannot read (a spread, a
   computed key that is not a written string, a method's computed name) or,
   for a list, a value that is not a list of written strings makes the whole
   answer null, and the row says "not measured": never a short count.
   Tried 2026-11-24: `...MORE_OWNED` in state-ledger's OWNED, `[_k]: [..]`
   and a list holding a name, and `...MORE_DRIVERS` in chaos-restart's
   DRIVERS: each row says "not measured" (it printed the short count). */
const keyName = (p) => (p.computed ? (p.key.type === 'StringLiteral' ? p.key.value : null)
  : (p.key.type === 'Identifier' ? p.key.name : (p.key.type === 'StringLiteral' || p.key.type === 'NumericLiteral' ? String(p.key.value) : null)));

/* an object literal's keys (null when the const is not one, or holds a key it cannot read) */
export function objectKeys(node) {
  if (!node || node.type !== 'ObjectExpression') return null;
  const out = [];
  for (const p of node.properties) {
    if (p.type !== 'ObjectProperty' && p.type !== 'ObjectMethod') return null;   /* a spread */
    const k = keyName(p);
    if (k === null) return null;
    out.push(k);
  }
  return out;
}

/* { key: [strings] } of an object literal whose values are string arrays (null when any entry is
   not: a spread, a key it cannot read, a value that is not a list, an element that is not a
   written string) */
export function objectOfLists(node) {
  if (!node || node.type !== 'ObjectExpression') return null;
  const out = Object.create(null);
  for (const p of node.properties) {
    if (p.type !== 'ObjectProperty' || p.value.type !== 'ArrayExpression') return null;
    const k = keyName(p);
    if (k === null) return null;
    const list = [];
    for (const e of p.value.elements) {
      if (!e || e.type !== 'StringLiteral') return null;
      list.push(e.value);
    }
    out[k] = list;
  }
  return out;
}

/* a number const (a guard's line), or null */
export function constNumber(ast, name) {
  const n = ast && constInit(ast, name);
  return n && n.type === 'NumericLiteral' ? n.value : null;
}
