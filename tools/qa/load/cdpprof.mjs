/* ═══ v2.3.3203: A CPU PROFILE OF THE REAL ROOM, WHILE A LOAD TEST RUNS ═══
 *
 * load-wheel.mjs profiles the room's own code in Node; this profiles it where
 * it really runs -- the local runtime (workerd), sockets, compression and all
 * -- through the runtime's own debugger (the Chrome DevTools protocol):
 *
 *   node tools/qa/load/load.mjs --steps 150 --hold 90 --inspector-port 9230
 *   node tools/qa/load/cdpprof.mjs 9230 15 /tmp/room.cpuprofile   # during the hold
 *
 * The profile opens in Chrome's DevTools (Performance > load) or any
 * .cpuprofile reader.  Time spent in the runtime's own C++ (compressing,
 * framing, the socket) shows against the JavaScript call that asked for it
 * (`send`), or as "(program)".  Local only: anything but 127.0.0.1 is
 * refused, like the rest of these tools.
 */
import { writeFileSync } from 'node:fs';
import { PlainWS } from './plainws.mjs';   /* Node's own WebSocket will not open this socket */

const port = +process.argv[2];
const secs = +(process.argv[3] || 10);
const out = process.argv[4] || 'room.cpuprofile';
if (!port) { console.error('cdpprof.mjs <inspector port> [seconds] [out.cpuprofile]'); process.exit(2); }

const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
if (!Array.isArray(targets) || !targets.length) { console.error('no debugger targets on', port); process.exit(1); }
for (const t of targets) console.log('target:', t.title || t.id, t.url || '');
const target = targets.find((t) => /brotown|index|worker|core/i.test((t.title || '') + (t.url || ''))) || targets[0];
const url = target.webSocketDebuggerUrl.replace('localhost', '127.0.0.1');
if (!/^ws:\/\/127\.0\.0\.1[:/]/.test(url)) { console.error('refusing a non-local debugger:', url); process.exit(2); }

const ws = new PlainWS(url);
let n = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id);
    pending.delete(m.id);
    if (m.error) p.rej(new Error(JSON.stringify(m.error))); else p.res(m.result);
  }
};
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('debugger socket error')); });
const call = (method, params = {}) => new Promise((res, rej) => {
  const id = ++n;
  pending.set(id, { res, rej });
  ws.send(JSON.stringify({ id, method, params }));
});

await call('Profiler.enable');
await call('Profiler.setSamplingInterval', { interval: 500 });   /* µs */
await call('Profiler.start');
console.log(`profiling ${secs} s ...`);
await new Promise((r) => setTimeout(r, secs * 1000));
const { profile } = await call('Profiler.stop');
writeFileSync(out, JSON.stringify(profile));
console.log('written', out, (JSON.stringify(profile).length / 1024).toFixed(0), 'KB');
ws.close();
process.exit(0);
