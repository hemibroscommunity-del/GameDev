/* ═══ v2.3.3205: THE ROOM'S MEMORY, WHILE A LOAD TEST RUNS ═══
 *
 * Cloudflare holds each Durable Object to 128 MB of memory, and a room that
 * goes over is reset -- every player in it disconnected at once.  Before the
 * player cap is raised, this reads how much JavaScript heap the room really
 * uses with that many players in it, through the local runtime's own debugger
 * (the Chrome DevTools protocol, as cdpprof.mjs):
 *
 *   node tools/qa/load/load.mjs --steps 60,120,150 --hold 60 --inspector-port 9230
 *   node tools/qa/load/heapprobe.mjs 9230 600 15     # every 15 s for 10 minutes
 *
 * Each line: the heap in use, the heap V8 has reserved, and -- every other
 * sample -- the heap left after a full garbage collection (what the room
 * really keeps).  Local only: anything but 127.0.0.1 is refused.
 */
import { PlainWS } from './plainws.mjs';

const port = +process.argv[2];
const secs = +(process.argv[3] || 120);
const every = +(process.argv[4] || 10);
if (!port) { console.error('heapprobe.mjs <inspector port> [seconds] [every seconds]'); process.exit(2); }

const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
if (!Array.isArray(targets) || !targets.length) { console.error('no debugger targets on', port); process.exit(1); }
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

const mb = (b) => (b / 1048576).toFixed(1);
const t0 = Date.now();
let k = 0, peakUsed = 0, peakAfterGc = 0;
while (Date.now() - t0 < secs * 1000) {
  const gc = k % 2 === 1;
  if (ws.readyState !== 1) { console.log('the debugger closed (the load test is over)'); break; }
  if (gc) { try { await call('HeapProfiler.collectGarbage'); } catch { /* not every runtime has it */ } }
  let h;
  try { h = await call('Runtime.getHeapUsage'); } catch { console.log('the debugger closed (the load test is over)'); break; }
  peakUsed = Math.max(peakUsed, h.usedSize);
  if (gc) peakAfterGc = Math.max(peakAfterGc, h.usedSize);
  const at = Math.round((Date.now() - t0) / 1000);
  console.log(`${String(at).padStart(4)} s  heap used ${mb(h.usedSize).padStart(6)} MB of ${mb(h.totalSize).padStart(6)} MB${gc ? '  (after a full GC)' : ''}`);
  k++;
  await new Promise((r) => setTimeout(r, every * 1000));
}
console.log(`peak in use ${mb(peakUsed)} MB; peak kept after a full GC ${mb(peakAfterGc)} MB`);
ws.close();
process.exit(0);
