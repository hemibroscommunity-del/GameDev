/* ═══ v2.3.5104: THE CODE, WITHOUT ITS COMMENTS (card B PR 5) ═══
 *
 * A guard that searches the source for a name must not find it in a comment
 * (the comments are the project's memory and say every name there is:
 * `permit` is a verb in gathering.js's).  esbuild, the parser GitHub's
 * `test` job has (wrangler brings it), compiles each file as it is, JSX
 * turned to calls, comments dropped, names kept: a search of its output is a
 * search of the code.  One build for every file (a call a file is seconds).
 *
 *   codeOf(['src', 'server/src'])  -> Map(path from the root -> code)
 */
import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { createRequire } from 'node:module';
import { ROOT } from './fourLines.mjs';

function esbuild() {
  for (const pkg of ['server/package.json', 'package.json']) {
    try { return createRequire(join(ROOT, pkg))('esbuild'); } catch { /* the next */ }
  }
  throw new Error('esbuild not found: run `npm install` in server/ (wrangler brings it)');
}

export function sourceFiles(dirs) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(join(ROOT, d), { withFileTypes: true })) {
      const p = d + '/' + e.name;
      if (e.isDirectory()) walk(p);
      else if (/\.(js|jsx|mjs)$/.test(e.name)) out.push(p);
    }
  };
  for (const d of dirs) walk(d);
  return out.sort();
}

export function codeOf(dirs) {
  const files = sourceFiles(dirs);
  const OUT = join(ROOT, '.code-only-out');
  const r = esbuild().buildSync({
    entryPoints: files.map((f) => join(ROOT, f)), outbase: ROOT, outdir: OUT, write: false, bundle: false,
    format: 'esm', target: 'esnext', jsx: 'transform', legalComments: 'none', logLevel: 'silent',
    minifyWhitespace: true,   /* drops the doc comments esbuild otherwise keeps before a property; names stay */
    loader: { '.js': 'jsx', '.jsx': 'jsx', '.mjs': 'jsx' }, outExtension: { '.js': '.js' },
  });
  const byOut = new Map(r.outputFiles.map((o) => [relative(OUT, o.path).split(sep).join('/'), o.text]));
  const out = new Map();
  for (const f of files) {
    const code = byOut.get(f.replace(/\.(jsx|mjs)$/, '.js'));
    if (code === undefined) throw new Error('esbuild gave no output for ' + f);
    out.set(f, code);
  }
  return out;
}
