/* Headless MULTIPLAYER test runner — v2.3.1609.
 *
 * Owner: "headlessly test all UI interactions in multiplayer (trading, duel,
 * party, etc)."
 *
 * Starts ONE worker, ONE static server and ONE browser, then runs each
 * scenario with its own freshly-joined pair of players.  Scenarios are
 * deliberately isolated from each other by identity, not by cleanup: every
 * scenario creates new browser contexts, so it gets new bp_ passphrases and
 * therefore untouched server-side players.  Nothing a scenario does can make a
 * later one pass — which is the property that makes "the trade settled" mean
 * something.
 *
 *   node tools/qa/mp/run.mjs                 # everything
 *   node tools/qa/mp/run.mjs trade duel      # named scenarios only
 *
 * Exits non-zero if any assertion failed, so it can gate a push.
 */
import * as H from './harness.mjs';

const WS = await H.freePort(), WEB = await H.freePort();

const SCENARIOS = {
  presence: () => import('./mp-presence.mjs'),
  trade: () => import('./mp-trade.mjs'),
  duel: () => import('./mp-duel.mjs'),
  party: () => import('./mp-party.mjs'),
  social: () => import('./mp-social.mjs'),
  friends: () => import('./mp-friends.mjs'),
  chat: () => import('./mp-chat.mjs'),
  clan: () => import('./mp-clan.mjs'),
  market: () => import('./mp-market.mjs'),
  arena: () => import('./mp-arena.mjs'),
  prog3: () => import('./mp-prog3.mjs'), /* v2.3.1660: trained-skill rebuild */
  tutorial: () => import('./mp-tutorial.mjs'), /* v2.3.1665: the completable arc */
  onboarding: () => import('./mp-onboarding.mjs'), /* v2.3.1668: the first-run greeting */
  hiscores: () => import('./mp-hiscores.mjs'), /* v2.3.1671: the per-skill board */
  mayorart: () => import('./mp-mayorart.mjs'), /* v2.3.1672: the mayor's real art */
  townlock: () => import('./mp-townlock.mjs'), /* v2.3.1676: unarmed start + town gate */
  proj: () => import('./mp-proj.mjs'), /* v2.3.1678: the snowball is visible */
  lifeskill: () => import('./mp-lifeskill.mjs'), /* v2.3.1680: tool-gated gathering */
  questui: () => import('./mp-questui.mjs'), /* v2.3.1681: the world dialogue's art + the offer filter */
  hpbar: () => import('./mp-hpbar.mjs'), /* v2.3.1682: the contextual player HP bar */
  questprox: () => import('./mp-questprox.mjs'), /* v2.3.1701: the giver's dialogue opens on approach */
  questlegs: () => import('./mp-questlegs.mjs'), /* v2.3.1701: the quest greaves equip to the LEGS */
  authority: () => import('./mp-authority.mjs'), /* v2.3.1702: ability spends, firemaking + local-AI HP */
  hubspawn: () => import('./mp-hubspawn.mjs'), /* v2.3.1703: leaving town does not put you back in town */
  block: () => import('./mp-block.mjs'), /* v2.3.1705: the shield is directional, and the cone is the hitbox */
  questline: () => import('./mp-questline.mjs'), /* v2.3.1707: the WHOLE line, start to finish, through the dialogue */
  harvest: () => import('./mp-harvest.mjs'), /* v2.3.1704: extraction_start reaches the worker + the shield ends */
  ability: () => import('./mp-ability.mjs'), /* v2.3.1733: the stamina abilities reach the worker, and stay locked until their milestone */
  firegear: () => import('./mp-firegear.mjs'), /* v2.3.1723: the fire-lighter's clothes sit on their body */
  burst: () => import('./mp-burst.mjs'),
  soak: () => import('./mp-soak.mjs'), /* v2.3.1741: does anything grow while you play */
  viewport: () => import('./mp-viewport.mjs'), /* v2.3.1740: the game fills the phone */ /* v2.3.1734: element_burst survives the shim; the special costs the flat 25 */
};

const want = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const names = want.length ? want : Object.keys(SCENARIOS);
for (const n of names) {
  if (!SCENARIOS[n]) { console.error(`unknown scenario "${n}"; have: ${Object.keys(SCENARIOS).join(', ')}`); process.exit(2); }
}

console.log(`booting worker + dist for ${names.length} scenario(s): ${names.join(', ')}`);
const t0 = Date.now();
const worker = await H.startWorker(WS);
const srv = await H.serveDist(WEB);
const browser = await H.launch();
/* A crash or a Ctrl-C must not leave wrangler + workerd holding the port. */
let cleaned = false;
const cleanup = () => { if (!cleaned) { cleaned = true; try { H.stopWorker(worker); } catch { /* best effort */ } } };
process.on('SIGINT', () => { cleanup(); process.exit(130); });
process.on('SIGTERM', () => { cleanup(); process.exit(143); });
process.on('uncaughtException', (e) => { console.error(e); cleanup(); process.exit(1); });
console.log(`up in ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);

const all = [];
for (const name of names) {
  const rec = H.recorder(name);
  const started = Date.now();
  console.log(`── ${name} ──────────────────────────────────`);
  try {
    const mod = await SCENARIOS[name]();
    await mod.run({ browser, wsPort: WS, webPort: WEB, rec });
  } catch (e) {
    /* A thrown scenario is a failure with a name, not a crashed run: record it
       and keep going, so one broken flow never hides the state of the rest. */
    rec.ok('scenario completed', false, String(e).slice(0, 400));
  }
  console.log(`   (${((Date.now() - started) / 1000).toFixed(0)}s)\n`);
  all.push(...rec.rows());
}

await browser.close();
srv.close();
await H.stopWorker(worker);

const skipped = all.filter((r) => r.skip);
const failed = all.filter((r) => !r.pass && !r.skip);
const checks = all.filter((r) => !r.skip);
console.log('═══════════════════════════════════════════');
console.log(`${checks.length} assertions, ${checks.length - failed.length} passed, ${failed.length} failed`
  + (skipped.length ? `, ${skipped.length} skipped` : '')
  + `  (${((Date.now() - t0) / 1000).toFixed(0)}s total)`);
for (const f of failed) console.log(`  FAIL  ${f.suite} :: ${f.name}  ${JSON.stringify(f.detail)}`);
/* Skips are printed at the end too — a screen with no way in is a finding, and
   burying it in the scroll is how it stays unnoticed. */
for (const s of skipped) console.log(`  SKIP  ${s.suite} :: ${s.name}  — ${s.detail}`);
process.exit(failed.length ? 1 : 0);
