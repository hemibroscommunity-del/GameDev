/* ═══ v2.3.5321: A PAGE MODULE, LOADED IN NODE (card V PR 2) ═══
 *
 * A guard that tests one of the page's rules (src/game/questRoute.js: no
 * road to the Mayor before the worker has spoken) imports the rule's own
 * module.  The page's modules import each other through vite's `@/` alias,
 * which node cannot resolve; so this bundles the module with esbuild (the
 * one parser GitHub's `test` job has: wrangler brings it), `@/` read as
 * src/, and imports the bundle from memory (a data: address, no file
 * written).  GitHub's job installs none of the root's packages (react,
 * pixi.js...), so each package a module reaches is a STAND-IN: an object
 * that answers every name, call and `new` with itself.  A rule that only
 * passes through such a module at its import loads; a rule that USES a
 * package gets the stand-in, never a real answer, so its test must ask for
 * a real value (a point, a name, a number), which the stand-in never is.
 *
 *   const { questRoutePoint } = await loadSrc('src/game/questRoute.js');
 *
 * Each call bundles afresh, so a module's own state starts clean.
 */
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { ROOT } from './fourLines.mjs';

function esbuild() {
  for (const pkg of ['server/package.json', 'package.json']) {
    try { return createRequire(join(ROOT, pkg))('esbuild'); } catch { /* the next */ }
  }
  throw new Error('esbuild not found: run `npm install` in server/ (wrangler brings it)');
}

/* every bare package name (not `./`, not `@/`, not an absolute path) */
const STAND_INS = {
  name: 'stand-ins',
  setup(b) {
    b.onResolve({ filter: /^[^./@]|^@[^/]+\/[^/]/ }, (a) => (a.path.startsWith('@/') ? undefined : { path: a.path, namespace: 'stand-in' }));
    b.onLoad({ filter: /.*/, namespace: 'stand-in' }, () => ({
      loader: 'js',
      contents: 'const h = { get: (t, k) => (k === "__esModule" ? false : k === Symbol.toPrimitive ? () => 0 : k === "then" ? () => p : p),'
        + ' apply: () => p, construct: () => p, getPrototypeOf: () => p }; const p = new Proxy(function () {}, h); module.exports = p;',
    }));
  },
};

export async function loadSrc(file) {
  const r = await esbuild().build({
    entryPoints: [join(ROOT, file)], bundle: true, write: false, format: 'esm', platform: 'neutral',
    target: 'esnext', logLevel: 'silent', mainFields: ['module', 'main'],
    alias: { '@': join(ROOT, 'src') },
    loader: { '.js': 'jsx', '.jsx': 'jsx', '.json': 'json' },
    plugins: [STAND_INS],
  });
  const code = r.outputFiles[0].text;
  return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
}
