/* Probe (review only, not a repo file): the sword's liar when its phone says `fs: 1` at join
   (join.js:1037 session.freeSwing = msg.fs; combat.js:1375 skips _swordSwingTake for it).
   Same bots, same world as claims-gain.test's `reach` row. */
const T = process.cwd().replace(/\/server$/, '') + '/server/test/';   /* run from the repository's root or its server/ */
const { seededClock } = await import(T + 'testroom.mjs');
const B = await import(T + 'claimbots.mjs');

const seedOf = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; };
const MS = 4 * B.MIN;
const blank = () => ({ kills: 0, xp: 0, ore: 0, cooked: 0, gold: 0, px: 0, points: 0, hurt: 0 });

async function run(name, bot, opts, { fs = 0, seed = '' } = {}) {
  const clock = seededClock({ seed: seedOf(seed + 'reach|' + name + '|gain') }).install();
  try {
    const W = await B.makeWorld(clock, { tickMs: 22, prep: B.nearField, recs: {} });
    if (fs) {
      const j = W.join;
      W.join = async (pid, data, ph) => { const ws = await j(pid, data, ph); const s = W.room.sessions.get(ws); if (s) s.freeSwing = fs; return ws; };
    }
    const ph = new B.Phone(W, null, null, MS);
    const take = blank();
    const q = { l: console.log, w: console.warn, e: console.error };
    console.log = () => {}; console.warn = () => {}; console.error = () => {};
    let threw = null;
    try { await bot(W, ph, take, opts || {}); } catch (e) { threw = (e && e.message) || String(e); }
    finally { console.log = q.l; console.warn = q.w; console.error = q.e; }
    const ms = W.clock.now() - ph.t0;
    const tally = W.room._hpCount ? { ...W.room._hpCount } : null;
    return { kills: Math.round(take.kills * 3600000 / ms), refusals: ph.refusals.length, threw, tally };
  } finally { clock.restore(); }
}

for (const seed of ['', 'a', 'b', 'c', 'd', 'e']) {
  const h0 = await run('honest', B.honestSword, {}, { seed });
  const h1 = await run('honest', B.honestSword, {}, { seed, fs: 1 });
  const l0 = await run('liar', B.liarSword, {}, { seed });
  const l1 = await run('liar', B.liarSword, {}, { seed, fs: 1 });
  const w0 = await run('liar', B.liarSword, { speed: 150 }, { seed });
  const w1 = await run('liar', B.liarSword, { speed: 150 }, { seed, fs: 1 });
  const best = Math.max(h0.kills, h1.kills);
  console.log(`seed '${seed}': honest ${h0.kills} (fs:1 ${h1.kills}, refusals ${h1.refusals}) | liar ${l0.kills} -> gain ${(l0.kills / h0.kills).toFixed(2)} | liar fs:1 ${l1.kills} -> gain over honest ${(l1.kills / h0.kills).toFixed(2)}, over best honest ${(l1.kills / best).toFixed(2)} | at an honest walk: liar ${w0.kills} (${(w0.kills / h0.kills).toFixed(2)}), fs:1 ${w1.kills} (${(w1.kills / best).toFixed(2)})` + (l1.threw ? ' THREW ' + l1.threw : ''));
}
