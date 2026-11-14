/* v2.3.5586: RT-2 probe: what one GET /api/leaderboard/top costs the Leaderboard object
 * as the number of rows grows (every player who ever joined has a row; rows
 * are filtered by age only when read, never deleted).  In-process, the real
 * Leaderboard class with a Map standing in for its storage.
 *   node --expose-gc boardtop.mjs [20000]                                  */
import { Leaderboard } from '../../../server/src/leaderboard.js';
const N = +(process.argv[2] || 20000);
const store = new Map();
const storage = {
  get: async (k) => store.get(k), put: async (k, v) => { store.set(k, v); }, delete: async (k) => store.delete(k),
  list: async ({ prefix } = {}) => { const m = new Map(); for (const [k, v] of store) if (!prefix || k.startsWith(prefix)) m.set(k, v); return m; },
};
const lb = new Leaderboard({ storage }, {});
const look = { b: 'bro', sk: 3, hc: 2, hs: 4, ey: 1, sh: 7, pa: 2, bt: 1, hat: 0 };
for (let i = 0; i < N; i++) {
  await lb.updatePlayer({ playerId: 'bp_' + i.toString(36).padStart(8, '0') + '_word_word', name: 'Bro' + i, color: '#5b52ff', level: 1 + (i % 40),
    look, ts: Date.now(), rpgData: { kills: i % 500, goldEarned: i * 10, playtime: i * 60, lifeTotal: i % 99, ap: i % 300 },
    series: { melee: i % 40, bow: i % 35, magic: i % 30, mining: i % 20, fishing: i % 20, woodcutting: i % 20, cooking: i % 20, kills: i % 500 } });
}
const bytes = [...store.values()].reduce((a, v) => a + v.length, 0);
globalThis.gc && gc();
const h0 = process.memoryUsage().heapUsed;
for (const cat of ['level', 'combat', 'ap', 'power']) {
  const t0 = performance.now();
  let peak = 0;
  const iv = setInterval(() => { peak = Math.max(peak, process.memoryUsage().heapUsed); }, 1);
  const r = await lb.getTop(cat, 50);
  clearInterval(iv);
  peak = Math.max(peak, process.memoryUsage().heapUsed);
  console.log(JSON.stringify({ rows: N, storedMB: +(bytes / 1048576).toFixed(1), category: cat, ms: Math.round(performance.now() - t0), heapAboveRestMB: +((peak - h0) / 1048576).toFixed(1), got: r.length }));
  globalThis.gc && gc();
}
