/* ═══ v2.3.6741: THE BUILD'S PLUGIN THAT STAMPS EVERY WRITTEN-OUT ADDRESS (card KEEP, PR 2) ═══
 *
 * vite.config.js registers it (`...keepVersions()`).  What it stamps and what
 * it leaves is tools/assets/stamp.mjs's to say; the versions are
 * tools/assets/versions.mjs's (the first 10 characters of the SHA-256 of a
 * file's bytes, from tools/assets/shipped.json).
 *
 * THE BYTES WIN.  "Never immutable on a file that quietly changes" (the
 * card's laws): an address may only be kept long if its version is its
 * bytes'.  shipped.mjs's own guard fails a file whose row lags its bytes, but
 * a build must never trust that alone, so every file this stamps is hashed
 * again here; where the table disagrees, the build says so and stamps the
 * BYTES' version (the census then reads it as 'hand', which keeps its folder
 * from being kept a year: the card's rule 2).
 *
 * First, one pass over every script for the addresses that must stay as
 * they are everywhere (stamp.mjs, 'alike'); then three hooks, one table:
 *   - a script (src/**.js|jsx|mjs), after the build has turned JSX into JS:
 *     its syntax tree, by the build's own parser (`this.parse`);
 *   - a style sheet (src/**.css), BEFORE Vite reads it: its url() tokens;
 *   - index.html, first: the href, src and poster of its tags.
 * At the end, one line: how many were stamped and how many left;
 * KEEP_STAMP_REPORT=<file> writes every one, with its file and line.
 *
 * Build only (`apply: 'build'`): `npm run dev` asks for files bare, as before;
 * `KEEP_STAMP=0 npm run build` builds the game as it was (a census's "before").
 * The page's workers are built apart and are not stamped here (the card's PR
 * 3 hands them their addresses).
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { ROOT, versionTable } from './versions.mjs';
import { stampScript, stampCss, stampHtml, topFolders, unstampable } from './stamp.mjs';

/* A LOADER THAT JOINS ITS OWN KEY to a stamped address (npcArtUrl's
   `+ '?v=' + NPC_ART_VERSION`, the item icons' ITEMS_V, p256Twin's query)
   asks for 'x.webp?v=<10>?v=<key>' until the card's PR 3 moves it to
   assetUrl and its key goes.  Nothing is held back for it: that request
   carried a hand key before and still does (the census reads it 'hand', and
   lists it under "doubled"), the file it names is the same, and every
   caller of that loader asks for the same address, so nothing is downloaded
   twice (the census compares each file's requests before and after).
   A list of families held bare by hand was tried and dropped: the census
   found eight such loaders where a reading of the code found five. */

const SCRIPT = /\.(?:js|jsx|mjs)$/;
const STYLE = /\.css$/;

export function keepVersions({ root = ROOT, report = process.env.KEEP_STAMP_REPORT || '', on = process.env.KEEP_STAMP !== '0' } = {}) {
  /* KEEP_STAMP=0 npm run build: the build as it was (the census's "before") */
  if (!on) return [];
  let table = null, folders = null;
  const alike = new Set();            /* stamped nowhere: a script builds, compares or derives it (stamp.mjs 'alike') */
  const checked = new Map();          /* address -> the version its bytes give */
  const stamped = [], left = [], disagree = [];
  const srcDir = join(root, 'src') + sep;

  const load = () => {
    if (table) return;
    table = versionTable({ root });
    folders = topFolders(table);
  };
  /* the table's version, held to the file's own bytes (the header) */
  const versionOf = (address) => {
    const want = table.get(address);
    if (!want) return null;
    if (checked.has(address)) return checked.get(address);
    let v = want;
    const file = join(root, 'public', address);
    if (existsSync(file)) {
      const own = createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, want.length);
      if (own !== want) { disagree.push(address); v = own; }
    }
    checked.set(address, v);
    return v;
  };
  const note = (id, r) => {
    const file = relative(root, id).split(sep).join('/');
    for (const s of r.stamped) stamped.push({ file, ...s });
    for (const l of r.left) left.push({ file, ...l });
  };
  /* THE FIRST PASS: every script under src/, turned into plain JS the way
     the build turns it (esbuild, JSX included) and read by the build's own
     parser, for the addresses some place builds, compares or derives
     (stamp.mjs unstampable).  Those are stamped nowhere, in the scripts, the
     style sheets or the page.  About a second, once a build. */
  async function firstPass(ctx) {
    load();
    const { transform } = await import('esbuild');
    const files = [];
    (function walk(dir) {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.name === 'node_modules') continue;
        const full = join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (SCRIPT.test(e.name)) files.push(full);
      }
    })(srcDir);
    for (const f of files) {
      const code = readFileSync(f, 'utf8');
      if (!/["'`]\/[^"'`\s]+\.[A-Za-z0-9]/.test(code)) continue;
      let js;
      try { js = (await transform(code, { loader: 'jsx', jsx: 'automatic', format: 'esm' })).code; }
      catch { continue; }   /* the build itself will say what is wrong with it */
      for (const a of unstampable(js, ctx.parse(js), versionOf, folders)) alike.add(a);
    }
  }

  const mine = (id) => typeof id === 'string' && !id.includes('?') && !id.includes('\0')
    && id.startsWith(srcDir) && !id.includes(`${sep}node_modules${sep}`);

  return [
    {
      name: 'keep-versions-css',
      apply: 'build',
      enforce: 'pre',
      async buildStart() { await firstPass(this); },
      transform(code, id) {
        if (!mine(id) || !STYLE.test(id)) return null;
        load();
        const r = stampCss(code, versionOf, folders, alike);
        note(id, r);
        return r.code === code ? null : { code: r.code, map: null };
      },
    },
    {
      name: 'keep-versions',
      apply: 'build',
      transformIndexHtml: {
        order: 'pre',
        handler(html, ctx) {
          load();
          const r = stampHtml(html, versionOf, folders, alike);
          note(ctx && ctx.filename ? ctx.filename : join(root, 'src', 'index.html'), r);
          return r.html;
        },
      },
      transform(code, id) {
        if (!mine(id) || !SCRIPT.test(id)) return null;
        /* cheap first look: no '/' and a dot in a string, nothing to read */
        if (!/["'`]\/[^"'`\s]+\.[A-Za-z0-9]/.test(code)) return null;
        load();
        const r = stampScript(code, this.parse(code), versionOf, folders, alike);
        note(id, r);
        return r.code === code ? null : { code: r.code, map: null };
      },
      buildEnd() {
        if (!table) return;
        const by = (list, k) => { const m = new Map(); for (const x of list) m.set(x[k], (m.get(x[k]) || 0) + 1); return [...m].map(([a, n]) => `${a} ${n}`).join(', '); };
        console.log(`[keep-versions] ${stamped.length} written-out addresses carry their file's version (${by(stamped, 'was')}); ${left.length} left (${by(left, 'why') || 'none'})`
          + (report ? `: ${report}` : ': KEEP_STAMP_REPORT=<file> lists them'));
        for (const a of disagree) this.warn(`${a}: its bytes are not shipped.json's row; stamped with the bytes' version (node tools/assets/shipped.mjs --write)`);
        if (report) writeFileSync(report, JSON.stringify({ stamped, left, disagree }, null, 1) + '\n');
      },
    },
  ];
}
