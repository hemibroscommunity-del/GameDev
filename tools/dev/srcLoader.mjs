/* ═══ v2.3.3792: THE GAME'S SOURCE, LOADABLE BY NODE ═══
 *
 *   import '../dev/srcLoader.mjs';   // first, then `await import(...)` src/
 *
 * The checks precheck runs are node only (no vite), but the modules they load
 * from src/ are written for vite, which resolves two things node does not:
 *   - `@/x` -- vite's alias for src/x (vite.config.js `resolve.alias`): node
 *     reads it as a package named "@/x" and stops with ERR_MODULE_NOT_FOUND
 *     ("Cannot find package '@/game' imported from src/rendering/
 *     picsNumbers.js", test-world-core --check on main, 2026-10-29);
 *   - `import X from './y.json'` -- node 22 wants `with { type: 'json' }`,
 *     which vite adds in the app build, so the source cannot carry it
 *     (v2.3.3776's check-hairmask-parity hook).
 * One hook for both, registered once, so a third check never copies it again.
 *
 * Hooks apply to modules loaded AFTER registration: a check imports this file
 * before anything that reaches src/, and loads src/ with `await import()` (a
 * static import is resolved before this file runs). */
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const SRC = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src') + '/').href;

register('data:text/javascript,' + encodeURIComponent(
  'const SRC = ' + JSON.stringify(SRC) + ';\n'
  + 'export async function resolve(s, c, next) {\n'
  + '  if (s.startsWith("@/")) s = SRC + s.slice(2);\n'
  + '  const r = await next(s, c);\n'
  + '  if (/\\.json(\\?|$)/.test(r.url)) return { ...r, importAttributes: { type: "json" } };\n'
  + '  return r;\n'
  + '}\n'));
