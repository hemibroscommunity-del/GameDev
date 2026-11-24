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

const keyName = (p) => (p.key.type === 'Identifier' ? p.key.name : p.key.type === 'StringLiteral' ? p.key.value : null);

/* an object literal's keys (null when the const is not one) */
export function objectKeys(node) {
  if (!node || node.type !== 'ObjectExpression') return null;
  return node.properties.filter((p) => p.type === 'ObjectProperty' || p.type === 'ObjectMethod').map(keyName).filter((k) => k !== null);
}

/* { key: [strings] } of an object literal whose values are string arrays */
export function objectOfLists(node) {
  if (!node || node.type !== 'ObjectExpression') return null;
  const out = Object.create(null);
  for (const p of node.properties) {
    if (p.type !== 'ObjectProperty' || p.value.type !== 'ArrayExpression') continue;
    out[keyName(p)] = p.value.elements.filter((e) => e && e.type === 'StringLiteral').map((e) => e.value);
  }
  return out;
}

/* a number const (a guard's line), or null */
export function constNumber(ast, name) {
  const n = ast && constInit(ast, name);
  return n && n.type === 'NumericLiteral' ? n.value : null;
}
