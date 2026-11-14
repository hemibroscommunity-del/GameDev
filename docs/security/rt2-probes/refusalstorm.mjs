/* v2.3.5586: RT-2 probe: what a full room's refusals cost the runtime's thread.  LOCAL ONLY.
 *   node refusalstorm.mjs [rates 50,100,200,400] [seconds 12]
 * One player holds the only seat (cap 1); then refused joins arrive at each
 * rate (a phone's room_full retry, ?rf=1) and the busiest workerd thread's CPU
 * is read from /proc.  Local workerd runs the outer worker AND the object on
 * one process, so this is an upper bound for the object's own share. */
import { spawn } from 'node:child_process';
import { mkdtemp, cp, readFile, writeFile, symlink, readdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const RATES = String(process.argv[2] || '50,100,200,400').split(',').map(Number);
const SECS = +(process.argv[3] || 12);
const REPO = '/home/user/GameDev';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dir = await mkdtemp(join(tmpdir(), 'rt2-rf-'));
await cp(join(REPO, 'server/src'), join(dir, 'src'), { recursive: true });
for (const f of ['wrangler.toml', 'package.json']) await cp(join(REPO, 'server', f), join(dir, f));
await symlink(join(REPO, 'server/node_modules'), join(dir, 'node_modules'));
const idx = join(dir, 'src/index.js');
await writeFile(idx, (await readFile(idx, 'utf8')).replace(/this\.MAX_PLAYERS = (\d+);/, 'this.MAX_PLAYERS = 1;'));
const port = 8900 + Math.floor(Math.random() * 90);
const state = await mkdtemp(join(tmpdir(), 'rt2-rf-state-'));
const proc = spawn('npx', ['wrangler', 'dev', '--port', String(port), '--local', '--ip', '127.0.0.1',
  '--local-upstream', `127.0.0.1:${port}`, '--persist-to', state], {
  cwd: dir, env: { ...process.env, X_LOCAL_OBSERVABILITY: 'false', X_LOCAL_EXPLORER: 'false' },
  stdio: ['ignore', 'pipe', 'pipe'], detached: true,
});
proc.stdout.on('data', () => {}); proc.stderr.on('data', () => {});
const kill = () => { try { process.kill(-proc.pid, 'SIGKILL'); } catch {} };
process.on('exit', kill);
for (let i = 0; i < 120; i++) {
  await sleep(1000);
  try { const r = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(2000) }); if (r.status) break; } catch {}
}
const URL_ = `ws://127.0.0.1:${port}/ws?room=loadtest&rf=1`;

/* threads of workerd in the group */
function stat(p) { try { const s = readFileSync(p, 'utf8'); const r = s.slice(s.lastIndexOf(')') + 2).split(' '); return { comm: s.slice(s.indexOf('(') + 1, s.lastIndexOf(')')), pgrp: +r[2], ticks: +r[11] + +r[12] }; } catch { return null; } }
async function threads() {
  const out = new Map();
  for (const d of await readdir('/proc')) {
    if (!/^\d+$/.test(d)) continue;
    const st = stat(`/proc/${d}/stat`);
    if (!st || st.pgrp !== proc.pid || !/workerd/.test(st.comm)) continue;
    for (const t of await readdir(`/proc/${d}/task`)) { const ts = stat(`/proc/${d}/task/${t}/stat`); if (ts) out.set(d + '/' + t, ts.ticks); }
  }
  return out;
}
async function busiest(ms) {
  const a = await threads(); await sleep(ms); const b = await threads();
  let best = 0, total = 0;
  for (const [k, v] of b) { const d = v - (a.get(k) || 0); total += d; if (d > best) best = d; }
  return { busiestPct: (best / (ms / 10)) * 100, totalPct: (total / (ms / 10)) * 100 };
}

/* one player in, keeping its seat with a keepalive */
const p = new WebSocket(URL_);
let inside = false;
p.onopen = () => p.send(JSON.stringify({ type: 'join', id: 'ltholder_' + Date.now().toString(36), name: 'Holder', protocolVersion: 2, httpAuth: true, ws: [1, 5], data: { x: 1000, y: 1000, d: 'south', z: 'town', name: 'Holder' } }));
p.onmessage = (e) => { if (typeof e.data === 'string' && e.data.startsWith('{"type":"state_sync"')) inside = true; };
setInterval(() => { try { p.send(JSON.stringify({ type: 'ping', t: Date.now() })); } catch {} }, 1000);
await sleep(4000);
console.log('holder inside:', inside);
const idle = await busiest(5000);
console.log(`idle (1 player): busiest workerd thread ${idle.busiestPct.toFixed(1)}%  all workerd ${idle.totalPct.toFixed(1)}%`);

const rows = [];
for (const rate of RATES) {
  let sent = 0, refused = 0, other = 0, open = 0;
  const lat = [];
  const iv = setInterval(() => {
    for (let i = 0; i < rate / 20; i++) {
      const t0 = performance.now();
      let ws; try { ws = new WebSocket(URL_); } catch { other++; continue; }
      sent++; open++;
      ws.onmessage = (e) => { if (typeof e.data === 'string' && e.data.startsWith('{"type":"room_full"')) { refused++; lat.push(performance.now() - t0); } };
      ws.onclose = () => { open--; };
      ws.onerror = () => { other++; };
    }
  }, 50);
  await sleep(2000);
  const m = await busiest(SECS * 1000);
  clearInterval(iv);
  await sleep(2500);
  lat.sort((a, b) => a - b);
  const row = { rate, sent, refused, errors: other, busiestPct: +m.busiestPct.toFixed(1), allWorkerdPct: +m.totalPct.toFixed(1), refusalMsP50: lat.length ? +lat[Math.floor(lat.length / 2)].toFixed(1) : null, refusalMsP95: lat.length ? +lat[Math.floor(lat.length * 0.95)].toFixed(1) : null };
  rows.push(row);
  console.log(JSON.stringify(row));
}
console.log('holder still inside:', inside && p.readyState === 1);
kill();
process.exit(0);
