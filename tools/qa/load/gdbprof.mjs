/* ═══ v2.3.3203: WHAT THE RUNTIME'S OWN THREAD IS DOING, WHILE A LOAD TEST RUNS ═══
 *
 * cdpprof.mjs sees the room's JavaScript; the runtime's own C++ -- compressing
 * every message, framing it, writing it to the socket -- shows there only as
 * "(program)".  This samples the busiest workerd process's threads with gdb
 * (workerd ships with its symbols) and counts what the busy thread was in:
 *
 *   node tools/qa/load/load.mjs --steps 150 --hold 120 &
 *   node tools/qa/load/gdbprof.mjs 30          # during the hold
 *
 * Each sample stops the process for a moment, so the numbers are shares, not
 * timings.  At 150 players a third of the room's thread was zlib's deflate
 * (deflate_slow, longest_match, compress_block), on the room's own thread:
 * docs/specs/steady-movers.md.  Local only: it attaches to a process on this
 * machine and nothing else.
 */
import { execFileSync } from 'node:child_process';

const N = Math.max(1, +(process.argv[2] || 30));
const ps = execFileSync('ps', ['-eo', 'pid,pcpu,comm'], { encoding: 'utf8' }).split('\n')
  .map((l) => l.trim().split(/\s+/)).filter((c) => c[2] === 'workerd').sort((a, b) => +b[1] - +a[1]);
if (!ps.length) { console.error('gdbprof.mjs: no workerd process running'); process.exit(1); }
const pid = ps[0][0];
console.log(`sampling workerd pid ${pid} (${ps[0][1]}% cpu), ${N} times ...`);
const threads = new Map();
for (let i = 0; i < N; i++) {
  let out = '';
  try {
    out = execFileSync('gdb', ['-p', pid, '-batch', '-nx', '-ex', 'set pagination off', '-ex', 'thread apply all bt 14'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 20000 });
  } catch (e) { out = (e && e.stdout) || ''; }
  let cur = null;
  for (const l of out.split('\n')) {
    const t = /^Thread \d+ \(Thread 0x[0-9a-f]+ \(LWP (\d+)\) "([^"]*)"\)/.exec(l);
    if (t) { const k = t[1] + ' ' + t[2]; if (!threads.has(k)) threads.set(k, []); cur = []; threads.get(k).push(cur); continue; }
    const f = /^#\d+\s+(?:0x[0-9a-f]+ in )?(.+?)(?: \(.*)?$/.exec(l);
    if (f && cur) cur.push(f[1].replace(/\(.*$/, '').replace(/<[^<>]*>/g, '').slice(0, 100));
  }
}
const idle = /epoll_wait|FutexWaiter|futex_wait|CondVar::Wait|pthread_cond|__lll_lock_wait|nanosleep|syscall$|WaitCommon|park/;
const groups = [
  ['zlib deflate (compressing what is sent)', /deflate|longest_match|compress_block|build_tree|fill_window|_tr_flush/],
  ['zlib inflate (what the phones send)', /inflate/],
  ['writing to sockets', /writev|__libc_write|::write\b/],
  ['reading from sockets', /recv|::read\b/],
  ['JSON parse', /JsonParser/],
  ['JSON stringify', /JsonStringifier/],
  ['garbage collection', /Heap::|Scavenge|MarkCompact|GCTracer/],
];
for (const [k, stacks] of threads) {
  const busy = stacks.filter((s) => s.length && !idle.test(s.slice(0, 3).join(' ')));
  if (busy.length < N / 3) continue;
  console.log(`\nthread ${k}: busy in ${busy.length} of ${stacks.length} samples`);
  const count = new Map();
  for (const s of busy) {
    const j = s.join(' ');
    const g = groups.find(([, re]) => re.test(s.slice(0, 6).join(' ')));
    const key = g ? g[0] : 'everything else (the room\'s JavaScript, the runtime\'s events)';
    count.set(key, (count.get(key) || 0) + 1);
    void j;
  }
  for (const [key, n] of [...count].sort((a, b) => b[1] - a[1])) console.log(`  ${String(Math.round(100 * n / busy.length)).padStart(3)}%  ${key}`);
}
