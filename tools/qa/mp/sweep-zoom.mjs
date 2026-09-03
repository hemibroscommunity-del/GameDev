#!/usr/bin/env node
/* ═══ RENDER THE BRO AT EVERY CANDIDATE ZOOM (v2.3.2249) ═══
 *
 * Owner: "Can you actually simulate at different sizes so I don't have to do a
 * bunch of guesswork."
 *
 * For each candidate FIGURE_SCALE_FLOOR it rewrites the constant, REBUILDS the
 * client, and runs mp-zoomshot against a real worker.  A rebuild per value and
 * not a runtime override, because a runtime override would prove that the
 * override works -- the thing being judged is what the shipped build draws.
 *
 * Restores the original constant on the way out, including on a crash.
 *
 *   node tools/qa/mp/sweep-zoom.mjs 0.349 0.45 0.50 0.55 0.667
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const VP = `${REPO}/src/game/worldViewport.js`;
const OUT = `${REPO}/tools/qa/mp/out/zoomsweep`;
const RE = /export const FIGURE_SCALE_FLOOR = [0-9.]+;/;

const values = process.argv.slice(2).length ? process.argv.slice(2) : ['0.349', '0.45', '0.50', '0.55', '0.667'];
const original = readFileSync(VP, 'utf8');
if (!RE.test(original)) { console.error('FIGURE_SCALE_FLOOR not found in worldViewport.js'); process.exit(1); }

mkdirSync(OUT, { recursive: true });
const results = [];

const restore = () => { try { writeFileSync(VP, original); } catch (e) {} };
process.on('SIGINT', () => { restore(); process.exit(130); });

try {
  for (const v of values) {
    const tag = String(v).replace('.', 'p');
    console.log(`\n═══ FIGURE_SCALE_FLOOR = ${v} ═══`);
    writeFileSync(VP, original.replace(RE, `export const FIGURE_SCALE_FLOOR = ${v};`));
    execFileSync('npm', ['run', 'build'], { cwd: REPO, stdio: 'pipe' });
    const out = execFileSync('node', ['tools/qa/mp/run.mjs', 'zoomshot'], {
      cwd: REPO, encoding: 'utf8',
      env: { ...process.env, BT_ZOOM_TAG: tag, BT_ZOOM_OUT: OUT },
    });
    const m = out.match(/ZOOMSHOT (\{.*\})/);
    if (m) { const r = JSON.parse(m[1]); results.push({ floor: +v, ...r }); console.log('   ', m[1]); }
    else { console.log(out.split('\n').slice(-12).join('\n')); results.push({ floor: +v, error: 'no ZOOMSHOT line' }); }
  }
} finally {
  restore();
  console.log('\nworldViewport.js restored to its committed value.');
}

console.log('\n═══ SUMMARY ═══');
console.log('floor   scale    bro (CSS px)   viewport      shot');
for (const r of results) {
  if (r.error) { console.log(`${r.floor}  ERROR ${r.error}`); continue; }
  console.log(`${String(r.floor).padEnd(7)} ${String(r.scale).padEnd(8)} ${String(r.figureCssPx).padEnd(14)} ${(r.viewW + 'x' + r.viewH).padEnd(13)} ${r.shot}`);
}
writeFileSync(`${OUT}/summary.json`, JSON.stringify(results, null, 2));
console.log(`\n${OUT}/summary.json`);
