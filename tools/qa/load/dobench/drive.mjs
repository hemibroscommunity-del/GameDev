/* ═══ v2.3.3208: DRIVE dobench (see src/index.js) ═══
 *
 *   node tools/qa/load/dobench/drive.mjs
 *
 * Starts the worker with `wrangler dev --local` (tracing off: TRAPS §168),
 * times each way of sending at about 100 B, 2 KB and 40 KB, with and without
 * the world parsing what it got, prints a table and stops the worker.
 */
import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PlainWS } from '../plainws.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const port = 8790 + Math.floor(Math.random() * 100);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const state = await mkdtemp(join(tmpdir(), 'dobench-'));
const env = Object.assign({}, process.env, { X_LOCAL_OBSERVABILITY: 'false', X_LOCAL_EXPLORER: 'false' });
const proc = spawn('npx', ['wrangler', 'dev', '--port', String(port), '--local', '--ip', '127.0.0.1', '--persist-to', state], { cwd: here, env, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
let log = ''; proc.stdout.on('data', (d) => { log += d; }); proc.stderr.on('data', (d) => { log += d; });
const base = `http://127.0.0.1:${port}`;
let up = false;
for (let i = 0; i < 120 && !up; i++) { await sleep(1000); try { const r = await fetch(base + '/'); up = r.ok; } catch {} }
if (!up) { console.log('not up', log.slice(-2000)); process.kill(-proc.pid, 'SIGKILL'); process.exit(1); }
const get = async (p) => (await fetch(base + p)).json();
const rows = [];
async function phone(kind, n, size, parse) {
  await fetch(`${base}/world/reset?parse=${parse ? 1 : 0}`);
  const url = `ws://127.0.0.1:${port}/world/ws`;
  const ws = kind === 'plain' ? new PlainWS(url) : new WebSocket(url);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws error')); });
  const s = JSON.stringify({ t: 'b', d: 'x'.repeat(Math.max(0, size - 20)) });
  const t0 = Date.now();
  for (let i = 0; i < n; i++) ws.send(s);
  let st;
  for (let k = 0; k < 4000; k++) { st = await get('/world/stats'); if (st.n >= n) break; await sleep(5); }
  const ms = Date.now() - t0;
  ws.close();
  return { mode: 'phone-' + kind, n, size: s.length, parse, wallMs: ms, perMsgUs: (1000 * ms) / n, worldGot: st.n, worldSpanMs: st.ms };
}
for (const size of [100, 2000, 40000]) {
  const n = size >= 40000 ? 500 : 4000;
  for (const parse of [false, true]) {
    // warm
    await get(`/door?mode=rpc&n=200&size=${size}`);
    for (const mode of ['rpc-seq', 'rpc', 'ws']) rows.push(await get(`/door?mode=${mode}&n=${n}&size=${size}&parse=${parse ? 1 : 0}`));
    rows.push(await phone('deflate', n, size, parse));
    rows.push(await phone('plain', n, size, parse));
  }
}
console.log('mode          | size B | parse | n    | wall ms | us a message | world got | world span ms');
for (const r of rows) console.log(`${r.mode.padEnd(13)} | ${String(r.size).padStart(6)} | ${String(r.parse).padEnd(5)} | ${String(r.n).padStart(4)} | ${String(r.wallMs).padStart(7)} | ${r.perMsgUs.toFixed(1).padStart(12)} | ${String(r.worldGot).padStart(9)} | ${String(r.worldSpanMs).padStart(6)}`);
try { process.kill(-proc.pid, 'SIGKILL'); } catch {}
process.exit(0);
