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
  freshpoints: () => import('./mp-freshpoints.mjs'), /* v2.3.1860: a new character has nothing to spend */
  bandsummary: () => import('./mp-bandsummary.mjs'), /* v2.3.1848: the band's compact summary */
  itemcard: () => import('./mp-itemcard.mjs'), /* v2.3.1845: the item card's art, name and rarity */
  arrowdt: () => import('./mp-arrowdt.mjs'), /* v2.3.1770: arrows fly at a speed */
  movespeed: () => import('./mp-movespeed.mjs'), /* v2.3.1769: speed is per second, not per frame */
  hairclip: () => import('./mp-hairclip.mjs'), /* v2.3.1776: the swing clips the hair too */
  minimap: () => import('./mp-minimap.mjs'), /* v2.3.1781: the corner minimap is pinned to the real world */
  backshield: () => import('./mp-backshield.mjs'), /* v2.3.1782: the slung shield, and the z-order that killed it */
  swordcarry: () => import('./mp-swordcarry.mjs'), /* v2.3.1786: the carried blade points up and forward */
  standinskin: () => import('./mp-standinskin.mjs'), /* v2.3.1788: attack stand-ins wear the walking skin */
  blockstance: () => import('./mp-blockstance.mjs'), /* v2.3.1798: shield size, planted stance, caret */
  blockarm: () => import('./mp-blockarm.mjs'), /* v2.3.1789: the raised shield is held by an arm */
  southshirt: () => import('./mp-southshirt.mjs'), /* v2.3.1873: shirt/skin sliver on the jog */
  xpfly: () => import('./mp-xpfly.mjs'), /* v2.3.1874: XP flies from the bro to its skill card */
  blockweapon: () => import('./mp-blockweapon.mjs'), /* v2.3.1864: the equipped weapon rides in the block's off hand */
  road2: () => import('./mp-road2.mjs'), /* v2.3.1866: just the Create->Continue pop-up road */
  contblack: () => import('./mp-contblack.mjs'), /* v2.3.1865: "continue my character" -> black screen; measures the SCREEN on all three roads back in */
  peershield: () => import('./mp-peershield.mjs'), /* v2.3.1790: other bros wear their shield on their back */
  peersword: () => import('./mp-peersword.mjs'), /* v2.3.1791: peers carry the sword the way you do */
  entitydt: () => import('./mp-entitydt.mjs'), /* v2.3.1771: monsters, NPCs + remotes move per second too */
  coppergear: () => import('./mp-coppergear.mjs'), /* v2.3.1772: every worn copper combo, in every pose */
  blacksmith: () => import('./mp-blacksmith.mjs'), /* v2.3.1773: the smith at the fountain */
  townprops: () => import('./mp-townprops.mjs'), /* v2.3.1775: anvil, stall, storekeeper */
  logout: () => import('./mp-logout.mjs'), /* v2.3.1840: log out lands on the login door */
  southsword: () => import('./mp-southsword.mjs'), /* v2.3.1839: the south idle blade off his face */
  tutspecial: () => import('./mp-tutspecial.mjs'), /* v2.3.1838: a REAL special, shield slung not held */
  idleface: () => import('./mp-idleface.mjs'), /* v2.3.1837: idle keeps the last TURN, not the last walk */
  turnshield: () => import('./mp-turnshield.mjs'), /* v2.3.1836: shield side while turning */
  hudface: () => import('./mp-hudface.mjs'), /* v2.3.1835: the HUD portrait tracks the worn cosmetics */
  specshield: () => import('./mp-specshield.mjs'), /* v2.3.1834: shield layering during a special */
  scalesheet: () => import('./mp-scalesheet.mjs'), /* v2.3.1830: size per direction, both poses */
  bodysize: () => import('./mp-bodysize.mjs'), /* v2.3.1826: the same character in every direction */
  slimebase: () => import('./mp-slimebase.mjs'), /* v2.3.1824: the blob's base is the monster's position */
  hatrim: () => import('./mp-questui.mjs').then((m) => ({ run: m.hatRim })), /* v2.3.1829 */
  questloop: () => import('./mp-questloop.mjs'), /* v2.3.1828: the hand-in must not repeat */
  keylogin: () => import('./mp-keylogin.mjs'), /* v2.3.1823: the login door joins you */
  ccload: () => import('./mp-ccload.mjs'), /* v2.3.1818: the creator opens with a character, and no keyboard */
  zonegate: () => import('./mp-zonegate.mjs'), /* v2.3.1817: a zone opens when a quest sends you there */
  arrowhead: () => import('./mp-arrowhead.mjs'),   /* v2.3.1879: only an ARRIVED arrow loses its head */
  charfit: () => import('./mp-charfit.mjs'),   /* v2.3.1878: the character tab fits on a phone */
  heroview: () => import('./mp-heroview.mjs'), /* v2.3.1815: the equip screen's character view */
  charlock: () => import('./mp-charlock.mjs'), /* v2.3.1814: permanent name+look, and the login door in front of the creator */
  townmap: () => import('./mp-townmap.mjs'), /* v2.3.1777: the clifftop plateau + its edges */
  townbuildings: () => import('./mp-townbuildings.mjs'), /* v2.3.1778: the buildings, solid, with doors */
  solorate: () => import('./mp-solorate.mjs'),
  statpeek: () => import('./mp-statpeek.mjs'), /* v2.3.1766: the allocation tooltip tells the truth */
  spawnfx: () => import('./mp-spawnfx.mjs'), /* v2.3.1765: the respawn silhouette */
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
  windup: () => import('./mp-windup.mjs'), /* v2.3.1811: the monster tells you */
  minishot: () => import('./mp-minishot.mjs'), /* v2.3.1810: glyph shapes are all distinct */
  fps: () => import('./mp-fps.mjs'), /* v2.3.1808: frame time, measured */
  ctltut: () => import('./mp-ctltut.mjs'), /* v2.3.1803: no tour step goes missing */
  questcoach: () => import('./mp-questcoach.mjs'), /* v2.3.1796: the questline's coach marks */
  questui: () => import('./mp-questui.mjs'), /* v2.3.1681: the world dialogue's art + the offer filter */
  hpbar: () => import('./mp-hpbar.mjs'), /* v2.3.1682: the contextual player HP bar */
  questclaim: () => import('./mp-questclaim.mjs'), /* v2.3.1884: the claim opens when it becomes claimable under your feet */
  freshquest: () => import('./mp-freshquest.mjs'),
  deathshield: () => import('./mp-deathshield.mjs'),
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
  zonechurn: () => import('./mp-zonechurn.mjs'), /* v2.3.1741: does touring zones leak */
  questbanner: () => import('./mp-questbanner.mjs'), /* v2.3.1745: QUEST ACCEPTED! / QUEST COMPLETED! over the dialogue */
  zonefx: () => import('./mp-zonefx.mjs'), /* v2.3.1748: what follows you through an exit, and what leaks in */
  remoteanim: () => import('./mp-remoteanim.mjs'), /* v2.3.1749: what the other player sees you doing */
  gearown: () => import('./mp-gearown.mjs'), /* v2.3.1750: armour you have not earned is not offered */
  pine: () => import('./mp-pine.mjs'), /* v2.3.1763: the first wood tier */
  unequip: () => import('./mp-unequip.mjs'), /* v2.3.1762: taking armour off */
  layer: () => import('./mp-layer.mjs'), /* v2.3.1764: hair order, swing metal, redeem button */
  material: () => import('./mp-material.mjs'), /* v2.3.1757: one art set, many metals */
  desktopbox: () => import('./mp-desktopbox.mjs'), /* v2.3.1768: desktop is the same view, blown up — sits by `viewport` (its phone-side counterpart) rather than at the top of the list, so it does not collide with the frame-rate PRs' registry lines */
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
