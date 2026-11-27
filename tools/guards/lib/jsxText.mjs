/* ═══ v2.3.6691: A PAGE'S DRAWING, RUN IN NODE WITHOUT REACT (card UI2-quests) ═══
 *
 * The required check installs only the server's packages (server/
 * package-lock.json: esbuild, never React), so a guard that must see what a
 * page DRAWS (finish.md part 5, rule 2: the running room, never a pattern of
 * text) bundles the page's own drawing with esbuild and runs it against a
 * stand-in for React: an element is { type, props }, a function component is
 * called with its props (a drawing with no hooks: the kit's pieces and a
 * page's view), and the tree is written out as markup.  Its callers:
 * tools/guards/quests-ui2.test.mjs.
 *
 *   loadEsbuild(root)               esbuild from the root's or the server's packages, or null
 *   bundleViews(root, entry, over)  the module of `entry` (a JS text of exports), with
 *                                   `over` { [rel]: planted text } read in place of a file
 *   html(el)                        an element tree as markup (handlers and styles left out)
 *   textOf(markup)                  the words a player reads (no tags, no attributes) */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

export function loadEsbuild(root) {
  for (const pkg of ['package.json', 'server/package.json']) {
    try { return createRequire(path.join(root, pkg))('esbuild'); } catch (e) { /* the next */ }
  }
  return null;
}

/* the stand-in: React's names a module may import, none of them called while drawing a view */
const REACT_STUB = `
export const Fragment = Symbol.for('jsxText.fragment');
export function createElement(type, props, ...kids) { const p = { ...(props || {}) }; if (kids.length) p.children = kids.length === 1 ? kids[0] : kids; return { $el: 1, type, props: p }; }
export function jsx(type, props, key) { return { $el: 1, type, props: props || {} }; }
export const jsxs = jsx;
export const jsxDEV = jsx;
const no = (n) => () => { throw new Error('jsxText: a view called React.' + n + ' (a drawing with hooks is not a view)'); };
export const useState = no('useState'), useEffect = no('useEffect'), useLayoutEffect = no('useLayoutEffect'), useRef = no('useRef'),
  useMemo = no('useMemo'), useCallback = no('useCallback'), useContext = no('useContext'), useReducer = no('useReducer'), useId = no('useId'),
  useTransition = no('useTransition'), useSyncExternalStore = no('useSyncExternalStore'), forwardRef = (f) => f, memo = (f) => f,
  createContext = () => ({ Provider: (p) => p.children }), startTransition = (f) => f(), Children = { toArray: (c) => [].concat(c || []) };
export default { Fragment, createElement, useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, useContext, useReducer, useId,
  useTransition, useSyncExternalStore, forwardRef, memo, createContext, startTransition, Children };
`;

export async function bundleViews(root, entry, over) {
  const esbuild = loadEsbuild(root);
  if (!esbuild) throw new Error('esbuild not found (npm install in the root or server/)');
  const planted = Object.create(null);
  for (const [rel, text] of Object.entries(over || {})) planted[path.join(root, rel)] = text;
  const plugin = {
    name: 'jsxText',
    setup(b) {
      b.onResolve({ filter: /^react(\/jsx-runtime|\/jsx-dev-runtime)?$/ }, () => ({ path: 'react-stub', namespace: 'jsxText' }));
      b.onLoad({ filter: /.*/, namespace: 'jsxText' }, () => ({ contents: REACT_STUB, loader: 'js' }));
      b.onResolve({ filter: /^@\// }, (a) => b.resolve('./' + a.path.slice(2), { resolveDir: path.join(root, 'src'), kind: a.kind }));
      b.onLoad({ filter: /\.(jsx?|mjs)$/ }, (a) => (planted[a.path] !== undefined ? { contents: planted[a.path], loader: 'jsx', resolveDir: path.dirname(a.path) } : undefined));
    },
  };
  const r = await esbuild.build({
    stdin: { contents: entry, resolveDir: root, loader: 'js' },
    bundle: true, write: false, format: 'esm', platform: 'node', jsx: 'automatic', logLevel: 'silent',
    loader: { '.js': 'jsx', '.css': 'empty', '.webp': 'empty', '.png': 'empty', '.json': 'json' },
    plugins: [plugin],
  });
  const code = r.outputFiles[0].text;
  return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const FRAG = Symbol.for('jsxText.fragment');
export function html(el) {
  if (el === null || el === undefined || el === false || el === true) return '';
  if (Array.isArray(el)) return el.map(html).join('');
  if (typeof el !== 'object') return esc(el);
  if (!el.$el) return '';
  const { type, props } = el;
  if (type === FRAG) return html(props.children);
  if (typeof type === 'function') return html(type(props));
  let attrs = '';
  for (const [k, v] of Object.entries(props)) {
    if (k === 'children' || k === 'key' || k === 'ref' || k === 'style' || typeof v === 'function' || v === undefined || v === null || v === false) continue;
    attrs += ' ' + (k === 'className' ? 'class' : k) + '="' + esc(v === true ? '' : v) + '"';
  }
  return '<' + type + attrs + '>' + html(props.children) + '</' + type + '>';
}
export function textOf(markup) { return String(markup).replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim(); }
