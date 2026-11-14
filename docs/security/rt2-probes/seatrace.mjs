/* v2.3.5586: RT-2 probe: who keeps their seat across a "deploy" when the room is full
 * and others are waiting?  LOCAL ONLY (a copy of server/ under wrangler dev).
 *
 *   node seatrace.mjs [cap 6] [waiters 30] [mode reload|abort]
 *
 * Players reconnect as wsClient.js does after an ordinary drop: 1000 ms flat,
 * then x1.5 (scheduleReconnect).  Waiters retry as wsClient.js _rfDelay does
 * on room_full: retryMs 5000 x (0.8..1.2).  A "deploy" = the worker copy's
 * code changes (wrangler reloads workerd; every socket drops), which is what a
 * real deploy does to a Durable Object.
 */
import { spawn } from 'node:child_process';
import { mkdtemp, cp, readFile, writeFile, symlink, appendFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CAP = +(process.argv[2] || 6);
const WAITERS = +(process.argv[3] || 30);
const MODE = process.argv[4] || 'reload';
const REPO = '/home/user/GameDev';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const dir = await mkdtemp(join(tmpdir(), 'rt2-seat-'));
await cp(join(REPO, 'server/src'), join(dir, 'src'), { recursive: true });
for (const f of ['wrangler.toml', 'package.json']) await cp(join(REPO, 'server', f), join(dir, f));
await symlink(join(REPO, 'server/node_modules'), join(dir, 'node_modules'));
const idx = join(dir, 'src/index.js');
let _src = (await readFile(idx, 'utf8')).replace(/this\.MAX_PLAYERS = (\d+);/, `this.MAX_PLAYERS = ${CAP};`);
/* the copy only: an instant restart of the object, as a deploy's cut-over does */
_src = _src.replace("  async fetch(request) {\n    // Internal lobby probe", "  async fetch(request) {\n    if (new URL(request.url).searchParams.get('rt2abort') === '1') { setTimeout(() => this.state.abort('rt2 deploy'), 5); return new Response('aborting'); }\n    // Internal lobby probe");
if (!_src.includes('rt2abort')) throw new Error('abort hook not placed');
await writeFile(idx, _src);
const port = 8800 + Math.floor(Math.random() * 100);
const state = await mkdtemp(join(tmpdir(), 'rt2-seat-state-'));
const proc = spawn('npx', ['wrangler', 'dev', '--port', String(port), '--local', '--ip', '127.0.0.1',
  '--local-upstream', `127.0.0.1:${port}`, '--persist-to', state], {
  cwd: dir, env: { ...process.env, X_LOCAL_OBSERVABILITY: 'false', X_LOCAL_EXPLORER: 'false' },
  stdio: ['ignore', 'pipe', 'pipe'], detached: true,
});
let log = '';
proc.stdout.on('data', (d) => { log += d; });
proc.stderr.on('data', (d) => { log += d; });
const kill = () => { try { process.kill(-proc.pid, 'SIGKILL'); } catch {} };
process.on('exit', kill);
for (let i = 0; i < 120; i++) {
  await sleep(1000);
  try { const r = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(2000) }); if (r.status) break; } catch {}
}
const URL_ = `ws://127.0.0.1:${port}/ws?room=loadtest&rf=1`;
let stopping = false;
const T0 = Date.now();
const t = () => ((Date.now() - T0) / 1000).toFixed(1);

function mk(kind, k) {
  const id = ('lt' + kind[0] + k + '_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).slice(0, 22);
  return { kind, k, id, ws: null, inside: false, delay: 1000, fulls: 0, lostSeatAt: null };
}
function connect(c) {
  let ws;
  try { ws = new WebSocket(URL_); } catch { return later(c, 'err'); }
  c.ws = ws;
  let full = false;
  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'join', id: c.id, name: 'RT' + c.kind + c.k, protocolVersion: 2, httpAuth: true, ws: [1, 5],
      data: { x: 1000, y: 1000, d: 'south', z: 'town', name: 'RT' + c.kind + c.k } }));
  };
  ws.onmessage = (ev) => {
    if (typeof ev.data !== 'string') return;
    if (ev.data.startsWith('{"type":"room_full"')) { full = true; return; }
    if (ev.data.startsWith('{"type":"state_sync"')) { c.inside = true; c.delay = 1000; }
  };
  ws.onclose = (ev) => {
    c.ws = null;
    const was = c.inside;
    c.inside = false;
    if (stopping) return;
    if (full || ev.code === 4009) { c.fulls++; return later(c, 'full'); }
    later(c, 'drop', was);
  };
  ws.onerror = () => {};
}
function later(c, why) {
  let d;
  if (why === 'full') d = Math.round(5000 * (0.8 + Math.random() * 0.4));   /* wsClient _rfDelay */
  else { d = c.delay; c.delay = Math.min(c.delay * 1.5, 10000); }          /* wsClient scheduleReconnect */
  setTimeout(() => { if (!stopping) connect(c); }, d);
}

const players = Array.from({ length: CAP }, (_, k) => mk('player', k));
for (const p of players) { connect(p); await sleep(150); }
await sleep(4000);
console.log(`[${t()}s] players inside: ${players.filter((p) => p.inside).length}/${CAP}`);
const waiters = Array.from({ length: WAITERS }, (_, k) => mk('waiter', k));
for (const w of waiters) { connect(w); await sleep(5000 / WAITERS); }   /* spread over a cycle, as a crowd arriving over time */
await sleep(12000);
const before = { p: players.filter((p) => p.inside).length, w: waiters.filter((w) => w.inside).length };
console.log(`[${t()}s] before the deploy: players inside ${before.p}/${CAP}, waiters inside ${before.w}/${WAITERS}, waiter refusals so far ${waiters.reduce((a, w) => a + w.fulls, 0)}`);

/* THE DEPLOY: change the code; wrangler reloads, the object restarts, every socket drops */
const tDeploy = Date.now();
if (MODE === 'abort') { try { const r = await fetch(`http://127.0.0.1:${port}/api/market/orders?room=loadtest&rt2abort=1`); console.log('abort answer', r.status, (await r.text()).slice(0, 40)); } catch (e) { console.log('abort fetch', e.message); } }
else await appendFile(idx, `\n/* rt2 deploy ${Date.now()} */\n`);
console.log(`[${t()}s] code changed (a deploy)`);
const samples = [];
for (let s = 0; s < 40; s++) {
  await sleep(1000);
  const p = players.filter((x) => x.inside).length, w = waiters.filter((x) => x.inside).length;
  samples.push({ s: s + 1, p, w });
  if (s % 5 === 4) console.log(`[${t()}s] +${s + 1}s after: players inside ${p}/${CAP}, waiters inside ${w}`);
}
const after = samples[samples.length - 1];
console.log(JSON.stringify({ cap: CAP, waiters: WAITERS, before, after, lostSeats: CAP - after.p }));
stopping = true;
for (const c of [...players, ...waiters]) { try { c.ws && c.ws.close(); } catch {} }
const reload = /Reloading|reload/i.test(log);
console.log('wrangler log mentions a reload:', reload);
kill();
process.exit(0);
