/* v2.3.2871: armour-equip stutter, measured.  Owner: "whenever I put on a piece
 * of armor like legs or torso the game would noticeably stutter".
 * Runs one player against a local worker, CPU throttled (default 4x), and
 * records every frame while running: once as a control, once straight after
 * equipping steel chest + legs, once more in the armour, once after taking it
 * off -- with the masked-body bake count and time (__btBakeStats) for each.
 *   node tools/qa/qa-equip-stutter.mjs $PWD [rate]      (QA_DIST=... for another build)
 *   PROF=out.cpuprofile ... also writes a CPU profile of the equip run. */
const repo = process.argv[2];
const RATE = +(process.argv[3] || 4);
const H = await import(repo + '/tools/qa/mp/harness.mjs');
const WS = await H.freePort(), WEB = await H.freePort();
const srv = await H.serveDist(WEB);
const worker = await H.startWorker(WS);
const browser = await H.launch();
const out = {};
try {
  const P = await H.newPlayer(browser, { name: 'Plate', wsPort: WS, webPort: WEB });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);
  await P.page.evaluate(() => { window.__btSetGear('chest', 'none'); window.__btSetGear('legs', 'none'); });
  await P.page.waitForTimeout(4000);
  const cdp = await P.page.context().newCDPSession(P.page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
  const arm = () => P.page.evaluate(() => {
    window.__fr = []; let last = performance.now(); window.__frOn = true;
    const bs = window.__btBakeStats || { count: 0, ms: 0 };
    window.__bs0 = { count: bs.count, ms: bs.ms };
    const tick = (t) => { if (!window.__frOn) return; window.__fr.push(t - last); last = t; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  const read = () => P.page.evaluate(() => {
    window.__frOn = false;
    const f = window.__fr.slice(2).sort((a, b) => a - b);
    const n = f.length, q = (p) => +f[Math.min(n - 1, Math.floor(p * n))].toFixed(1);
    const bs = window.__btBakeStats || { count: 0, ms: 0 };
    return { frames: n, p50: q(0.5), p95: q(0.95), p99: q(0.99), max: +f[n - 1].toFixed(1),
      over50: f.filter((x) => x > 50).length, over100: f.filter((x) => x > 100).length,
      longMs: Math.round(f.filter((x) => x > 50).reduce((a, b) => a + b, 0)),
      bakes: bs.count - window.__bs0.count, bakeMs: Math.round(bs.ms - window.__bs0.ms) };
  });
  const run = async () => { for (const k of ['w', 'd', 's', 'a', 'w', 'd']) await H.nudge(P, k, 1200); };
  /* control: the same run, nothing changed */
  await arm(); await run(); out.control = await read();
  /* equip both pieces, then the same run straight away */
  await arm();
  if (process.env.PROF) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start'); }
  await P.page.evaluate(() => { window.__btSetGear('chest', 'steelplate'); window.__btSetGear('legs', 'steelgreaves'); });
  await run(); out.equip = await read();
  if (process.env.PROF) {
    const { profile } = await cdp.send('Profiler.stop');
    (await import('node:fs')).writeFileSync(process.env.PROF, JSON.stringify(profile));
  }
  /* and a second run in the armour: has it settled? */
  await arm(); await run(); out.after = await read();
  /* off again (the bare body comes back) */
  await arm();
  await P.page.evaluate(() => { window.__btSetGear('chest', 'none'); window.__btSetGear('legs', 'none'); });
  await run(); out.unequip = await read();
  await P.ctx.close().catch(() => {});
} finally {
  await browser.close().catch(() => {});
  await H.stopWorker(worker).catch(() => {});
  try { srv.close(); } catch (e) {}
}
console.log(JSON.stringify({ repo: repo.split('/').pop(), rate: RATE, ...out }, null, 1));
process.exit(0);
