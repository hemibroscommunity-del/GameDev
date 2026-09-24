/* v2.3.2871: the masked-body bake, byte-identical between two builds.
 * Equips four armour combinations, lets the equip prewarm finish, and prints
 * the fingerprint of every baked frame (__btMaskedHashes).  Run it against
 * the build before and after a bake change and diff the output.
 *   node tools/qa/qa-bake-ident.mjs $PWD dist > after.json */
const [repo, dist] = process.argv.slice(2);
process.env.QA_DIST = dist;
const H = await import(repo + '/tools/qa/mp/harness.mjs');
const WS = await H.freePort(), WEB = await H.freePort();
const srv = await H.serveDist(WEB);
const worker = await H.startWorker(WS);
const browser = await H.launch();
const out = {};
const COMBOS = [
  ['steelplate', 'steelgreaves'],
  ['steelplate', 'none'],
  ['none', 'steelgreaves'],
  ['copperplate', 'coppergreaves'],
];
try {
  for (const [c, l] of COMBOS) {
    const P = await H.newPlayer(browser, { name: 'Id' + c.slice(0, 3) + l.slice(0, 3), wsPort: WS, webPort: WEB });
    await H.enterWorld(P);
    await P.page.waitForTimeout(3000);
    const ok = await P.page.evaluate(({ c, l }) => {
      const g = window.__btGetGear;
      window.__btSetGear('chest', c); window.__btSetGear('legs', l);
      return [g('chest'), g('legs')];
    }, { c, l });
    /* let the equip prewarm run to completion: bake count stable for 4s */
    let last = -1, still = 0;
    for (let i = 0; i < 120 && still < 4; i++) {
      await P.page.waitForTimeout(1000);
      const n = await P.page.evaluate(() => (window.__btBakeStats || { count: 0 }).count);
      if (n === last) still++; else { still = 0; last = n; }
    }
    const hashes = await P.page.evaluate(() => window.__btMaskedHashes());
    out[c + '+' + l] = { worn: ok, bakes: last, n: hashes.length, hashes };
    await P.ctx.close().catch(() => {});
  }
} finally {
  await browser.close().catch(() => {});
  await H.stopWorker(worker).catch(() => {});
  try { srv.close(); } catch (e) {}
}
console.log(JSON.stringify(out));
process.exit(0);
