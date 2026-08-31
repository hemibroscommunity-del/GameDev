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
import { existsSync, statSync, readdirSync } from 'node:fs';   /* v2.3.1998: dist staleness check */
import { join } from 'node:path';

const WS = await H.freePort(), WEB = await H.freePort();

const SCENARIOS = {
  a2hs: () => import('./mp-a2hs.mjs'), /* v2.3.2159: the install instruction finds the right player */
  standalone: () => import('./mp-standalone.mjs'), /* v2.3.2185: the installed web app -- the home-indicator inset every other scenario runs at zero */
  landdash: () => import('./mp-landscape-dash.mjs'), /* v2.3.2157: the 48px strip, the side sheet, and playing with menus open */
  landrotate: () => import('./mp-landscape-rotate.mjs'), /* v2.3.2157: rotation is a clean handoff both ways */
  landview: () => import('./mp-landscape-view.mjs'), /* v2.3.2156: the view rule switches axes; portrait is pinned */
  pathstyle: () => import('./mp-pathstyle.mjs'), /* v2.3.2141: the quest path can be turned off, and it has a shape */
  wvglass: () => import('./mp-wvglass.mjs'), /* v2.3.2141: the World View figure is small again, and the glass is centred on him */
  inkreset: () => import('./mp-inkreset.mjs'), /* v2.3.2114: do Reset and Randomize clear the tattoos — all four of them? */
  rollbake: () => import('./mp-rollbake.mjs'), /* v2.3.2083: is the dodge roll baked before you roll? */
  inkplace: () => import('./mp-inkplace.mjs'), /* v2.3.2082: does a tattoo stay in the same place while you move? */
  townforge: () => import('./mp-townforge.mjs'), /* v2.3.2077: forging in town reaches the worker */
  townmeal: () => import('./mp-townmeal.mjs'), /* v2.3.2077: eating + cooking in town reach the worker */
  plazaplate: () => import('./mp-plazaplate.mjs'), /* v2.3.2071: a plate on every townsperson, benches facing the water */
  portalbeam: () => import('./mp-portalbeam.mjs'), /* v2.3.2070: the light shaft over a zone exit */
  lilbro: () => import('./mp-lilbro.mjs'), /* v2.3.2064: the second walking NPC */
  potions: () => import('./mp-potions.mjs'), /* v2.3.2062: the mana + speed draughts */
  drinkcrash: () => import('./mp-drinkcrash.mjs'), /* v2.3.2151: drinking must not take the app down */
  ccstand: () => import('./mp-ccstand.mjs'), /* v2.3.2151: the bro stands mid-pedestal */
  ccbuttons: () => import('./mp-ccbuttons.mjs'), /* v2.3.2151: the name label + the two action buttons */
  townhill: () => import('./mp-townhill.mjs'), /* v2.3.2061: the fountain + the house on the hill */
  questxp: () => import('./mp-questxp.mjs'), /* v2.3.2154: the XP chooser's type, and your own plate */
  notifbell: () => import('./mp-notifbell.mjs'), /* v2.3.2155: the corner rests as a bell */
  shopkeeper: () => import('./mp-shopkeeper.mjs'), /* v2.3.2050: trading with Shopkeeper Bro, and the pile being public */
  facingside: () => import('./mp-facingside.mjs'), /* v2.3.2042: a face tattoo does not revolve to the back of a head */
  cosmpose: () => import('./mp-cosmpose.mjs'), /* v2.3.2041: do tattoos + clothing patterns survive every activity, on both screens? */
  rehearsal: () => import('./mp-rehearsal.mjs'), /* v2.3.2040: four characters, every interaction, every frame scanned for a black band */
  chatcompose: () => import('./mp-chatcompose.mjs'), /* v2.3.2039: selection, the dictation wait, and seeing your message */
  loginkey: () => import('./mp-loginkey.mjs'), /* v2.3.2038: can you get your login key back from inside the game? */
  roomfull: () => import('./mp-roomfull.mjs'), /* v2.3.1982: the 61st player is told why, waits visibly, and walks in when a seat opens */
  hairmask: () => import('./mp-hairmask.mjs'), /* v2.3.1993: a hat presses the hair down, it does not shave the head */
  firstrun: () => import('./mp-firstrun.mjs'), /* v2.3.1975: a first-time player gets a whole screen, not a strip */
  shapelayer: () => import('./mp-shapelayer.mjs'), /* v2.3.1967: a placed shape can be picked up again, and layers move in the ART */
  crowd: () => import('./mp-crowd.mjs'), /* v2.3.1973: what a crowd in one zone costs the PHONE (BT_CROWD=n) */
  socialgrief: () => import('./mp-socialgrief.mjs'), /* v2.3.1970: chat length + forged senders, and the party invites nobody answers */
  skinworld: () => import('./mp-skinworld.mjs'), /* v2.3.1994: the widened skin boxes, measured on the character in the world */
  skinink: () => import('./mp-skinink.mjs'), /* v2.3.1994: the skin editor IS the shirt editor, the zoom stays put, and every skin pixel takes ink */
  inkback: () => import('./mp-inkback.mjs'), /* v2.3.2148: the torso's back is its own canvas */
  bodyink: () => import('./mp-bodyink.mjs'), /* v2.3.1965: ink lands where the finger was, at any zoom */
  cosmrelay: () => import('./mp-cosmrelay.mjs'), /* v2.3.1961: a peer's look after the join frame — the self-heal, and a cosmetic changed mid-session */
  build: () => import('./mp-build.mjs'), /* v2.3.1953: height x frame — the shape, the boots, the plate, and the wire */
  facetat: () => import('./mp-facetat.mjs'), /* v2.3.1991: does the face tattoo survive the run? */
  questmsg: () => import('./mp-questmsg.mjs'), /* v2.3.1985: the quest-complete floater has to outlive a glance */
  shirtarm: () => import('./mp-shirtarm.mjs'), /* v2.3.2066: the tee's TRAILING sleeve while jogging east, measured */
  jogsides: () => import('./mp-jogsides.mjs'), /* v2.3.2134: east and west are ONE mirrored sheet -- so an east-only bare shoulder is in the renderer, not the art */
  chatfeed: () => import('./mp-chatfeed.mjs'), /* v2.3.1980: players-online count + the world chat feed */
  lockaim: () => import('./mp-lockaim.mjs'), /* v2.3.1979: a locked-on bow shot has to actually hit */
  lockon: () => import('./mp-lockon.mjs'), /* v2.3.1952: locking on raises block/dodge/special around the right joystick */
  tattoos: () => import('./mp-tattoos.mjs'), /* v2.3.1949: face + arm tattoos survive both server gates, end to end */
  roster: () => import('./mp-roster.mjs'), /* v2.3.1923: the device's character list — order, delete, the ten cap */
  drops: () => import('./mp-drops.mjs'), /* v2.3.1924: iron pieces to the bag, the gem to the glass */
  drillback: () => import('./mp-drillback.mjs'), /* v2.3.1922: the drill back-chip is not under the gold, and is paid for once */
  bootstall: () => import('./mp-bootstall.mjs'), /* v2.3.1921: a worker that never answers must not strand the login door */
  duelfeel: () => import('./mp-duelfeel.mjs'), /* v2.3.1918: play-test — TTK, blocking, weapon switching */
  monsterplate: () => import('./mp-monsterplate.mjs'), /* v2.3.1918: monsters get the player's name plate */
  chatfont: () => import('./mp-chatfont.mjs'), /* v2.3.1912: the chat font, measured on the glass */
  afk: () => import('./mp-afk.mjs'), /* v2.3.1913: idle characters log out after 2 min */
  tutgrant: () => import('./mp-tutgrant.mjs'), /* v2.3.1901: the first quest's sword + shield */
  skillup: () => import('./mp-skillup.mjs'), /* v2.3.1915: life-skill level banner */
  fishhand: () => import('./mp-fishhand.mjs'), /* v2.3.1914: the reeling hand over the shirt */
  previewweapon: () => import('./mp-previewweapon.mjs'), /* v2.3.1914: the preview follows the active weapon */
  questchain: () => import('./mp-questchain.mjs'), /* v2.3.1914: proximity turn-in across the whole chain */
  questroad: () => import('./mp-questroad.mjs'), /* v2.3.2121: the gold road on the ground + the first-join welcome */
  crowdsoak: () => import('./mp-crowdsoak.mjs'), /* v2.3.2122: the demo's load — peers + zone changes — which mp-soak does not drive */
  armorloss: () => import('./mp-armorloss.mjs'), /* v2.3.2122: where a dropped chest piece goes, and whether it comes back */
  weaponloss: () => import('./mp-weaponloss.mjs'), /* v2.3.2123: does a weapon survive a full stash? */
  fightsoak: () => import('./mp-fightsoak.mjs'), /* v2.3.2124: a long soak against the WORKER's monsters — the path mp-soak never drives */
  monwatch: () => import('./mp-monwatch.mjs'), /* v2.3.2126: do the worker's monsters come back? */
  chatpicker: () => import('./mp-chatpicker.mjs'), /* v2.3.2139: pick a lane without a slash command */
  chatlanes: () => import('./mp-chatlanes.mjs'), /* v2.3.2136: @area / @user across two real clients */
  deaddoor: () => import('./mp-deaddoor.mjs'), /* v2.3.2135: the depth door that cannot open */
  infopop: () => import('./mp-infopop.mjs'), /* v2.3.2131: tap a thing, find out what it is */
  coachearly: () => import('./mp-coachearly.mjs'), /* v2.3.2130: is anything taught in the first minute? */
  wvlens: () => import('./mp-wvlens.mjs'), /* v2.3.2137: the magnifier draws a lens, not a line */
  figscale: () => import('./mp-figscale.mjs'), /* v2.3.2123: is the character smaller outside town? */
  chatjoy: () => import('./mp-chatjoy.mjs'), /* v2.3.2123: the world chat sitting on the joystick */
  dunes: () => import('./mp-dunes.mjs'), /* v2.3.2122: the Wind Dunes arrival you cannot walk out of */
  queststar: () => import('./mp-queststar.mjs'), /* v2.3.1906: the star after the objective is done */
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
  shirtkeyline: () => import('./mp-shirtkeyline.mjs'), /* v2.3.1995: the tee's black outlines on the character preview */
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
  townprops: () => import('./mp-townprops.mjs'), /* v2.3.1775: anvil, stall, the man at it */
  logout: () => import('./mp-logout.mjs'), /* v2.3.1840: log out lands on the login door */
  southsword: () => import('./mp-southsword.mjs'), /* v2.3.1839: the south idle blade off his face */
  tutspecial: () => import('./mp-tutspecial.mjs'), /* v2.3.1838: a REAL special, shield slung not held */
  idleface: () => import('./mp-idleface.mjs'), /* v2.3.1837: idle keeps the last TURN, not the last walk */
  turnshield: () => import('./mp-turnshield.mjs'), /* v2.3.1836: shield side while turning */
  hudface: () => import('./mp-hudface.mjs'), /* v2.3.1835: the HUD portrait tracks the worn cosmetics */
  capekill: () => import('./mp-capekill.mjs'), /* v2.3.2100: does a real KILL roll for the ticket? */
  cape: () => import('./mp-cape.mjs'),
  capehair: () => import('./mp-capehair.mjs'),   /* v2.3.2186 */
  specshield: () => import('./mp-specshield.mjs'), /* v2.3.1834: shield layering during a special */
  scalesheet: () => import('./mp-scalesheet.mjs'), /* v2.3.1830: size per direction, both poses */
  bodysize: () => import('./mp-bodysize.mjs'), /* v2.3.1826: the same character in every direction */
  slimebase: () => import('./mp-slimebase.mjs'), /* v2.3.1824: the blob's base is the monster's position */
  hatrim: () => import('./mp-questui.mjs').then((m) => ({ run: m.hatRim })), /* v2.3.1829 */
  questloop: () => import('./mp-questloop.mjs'), /* v2.3.1828: the hand-in must not repeat */
  keylogin: () => import('./mp-keylogin.mjs'), /* v2.3.1823: the login door joins you */
  ccsize: () => import('./mp-ccsize.mjs'), /* v2.3.2035: creator icon sizes + the Default colour button, MEASURED at 390x844 */
  worldchat: () => import('./mp-worldchat.mjs'), /* v2.3.2037 */
  ccload: () => import('./mp-ccload.mjs'), /* v2.3.1818: the creator opens with a character, and no keyboard */
  zonegate: () => import('./mp-zonegate.mjs'), /* v2.3.1817: a zone opens when a quest sends you there */
  arrowhead: () => import('./mp-arrowhead.mjs'),   /* v2.3.1879: only an ARRIVED arrow loses its head */
  resbars: () => import('./mp-resbars.mjs'), /* v2.3.1895: mp/energy spend bars */
  charfit: () => import('./mp-charfit.mjs'),   /* v2.3.1878: the character tab fits on a phone */
  heroview: () => import('./mp-heroview.mjs'), /* v2.3.1815: the equip screen's character view */
  charlock: () => import('./mp-charlock.mjs'), /* v2.3.1814: permanent name+look, and the login door in front of the creator */
  townmap: () => import('./mp-townmap.mjs'), /* v2.3.1777: the clifftop plateau + its edges */
  townbuildings: () => import('./mp-townbuildings.mjs'), /* v2.3.1778: the buildings, solid, with doors */
  solorate: () => import('./mp-solorate.mjs'),
  statpeek: () => import('./mp-statpeek.mjs'), /* v2.3.1766: the allocation tooltip tells the truth */
  spawnfx: () => import('./mp-spawnfx.mjs'), /* v2.3.1765: the respawn silhouette */
  presence: () => import('./mp-presence.mjs'),
  tradetap: () => import('./mp-tradetap.mjs'), /* v2.3.2145: can you tap the trade window with chat open? */
  trade: () => import('./mp-trade.mjs'),
  tradeatk: () => import('./mp-tradeatk.mjs'), /* v2.3.1971: the trade window attacked — prototype-key offers, coin/item conservation, replayed confirms, a tab that dies mid-handshake */
  duelblock: () => import('./mp-duelblock.mjs'), /* v2.3.2145: is there a block button in a duel? */
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
  petdraw: () => import('./mp-petdraw.mjs'), /* v2.3.2078: an active pet is actually drawn */
  dodgetrail: () => import('./mp-dodgetrail.mjs'), /* v2.3.2078: your own dodge leaves a trail too */
  worldwalk: () => import('./mp-worldwalk.mjs'), /* v2.3.2078: the world map's pink lines are walls */
  townexit: () => import('./mp-townexit.mjs'), /* v2.3.2078: you spawn clear of the fountain and can leave town */
  cardreach: () => import('./mp-cardreach.mjs'), /* v2.3.2078: the inspect card's buttons on a phone */
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
  questwall: () => import('./mp-questwall.mjs'), /* v2.3.1972: what he offers after the last quest he can be paid for */
  questkill: () => import('./mp-questkill.mjs'), /* v2.3.1972: the objective EARNED — kill it, and see the drop land */
  harvest: () => import('./mp-harvest.mjs'), /* v2.3.1704: extraction_start reaches the worker + the shield ends */
  ability: () => import('./mp-ability.mjs'), /* v2.3.1733: the stamina abilities reach the worker, and stay locked until their milestone */
  firegear: () => import('./mp-firegear.mjs'), /* v2.3.1723: the fire-lighter's clothes sit on their body */
  burst: () => import('./mp-burst.mjs'),
  soak: () => import('./mp-soak.mjs'), /* v2.3.1741: does anything grow while you play */
  zonechurn: () => import('./mp-zonechurn.mjs'), /* v2.3.1741: does touring zones leak */
  questbanner: () => import('./mp-questbanner.mjs'), /* v2.3.1745: QUEST ACCEPTED! / QUEST COMPLETED! over the dialogue */
  zonefx: () => import('./mp-zonefx.mjs'), /* v2.3.1748: what follows you through an exit, and what leaks in */
  firepeer: () => import('./mp-firepeer.mjs'), /* v2.3.2146: is the peer DRAWN while lighting a fire? */
  remoteanim: () => import('./mp-remoteanim.mjs'), /* v2.3.1749: what the other player sees you doing */
  gearown: () => import('./mp-gearown.mjs'), /* v2.3.1750: armour you have not earned is not offered */
  pine: () => import('./mp-pine.mjs'), /* v2.3.1763: the first wood tier */
  unequip: () => import('./mp-unequip.mjs'), /* v2.3.1762: taking armour off */
  layer: () => import('./mp-layer.mjs'), /* v2.3.1764: hair order, swing metal, redeem button */
  material: () => import('./mp-material.mjs'), /* v2.3.1757: one art set, many metals */
  desktopbox: () => import('./mp-desktopbox.mjs'), /* v2.3.1768: desktop is the same view, blown up — sits by `viewport` (its phone-side counterpart) rather than at the top of the list, so it does not collide with the frame-rate PRs' registry lines */
  viewport: () => import('./mp-viewport.mjs'), /* v2.3.1740: the game fills the phone */ /* v2.3.1734: element_burst survives the shim; the special costs the flat 25 */
};

/* ═══ v2.3.1998: IS dist/ OLDER THAN THE THING YOU CHANGED? ═══
 *
 * serveDist serves `dist`, NOT `public` and NOT `src`.  So a scenario run
 * without a rebuild silently measures the PREVIOUS build, and it does not look
 * like a stale test -- it looks like your change did not work.
 *
 * Cost, the day this was written: the v2.3.1995 shirt art was merged and the
 * keyline scenario came back with three failures whose numbers were EXACTLY
 * the pre-fix ones (12.4 / 16.3 / 12.6% black), because dist still held the
 * old sheets.  Ten minutes went into "did the merge lose the art" before the
 * md5s were compared.  Art is the worst case -- a source edit at least tends
 * to fail loudly -- but the trap is the same for any file dist copies.
 *
 * Deliberately a WARNING and not a rebuild: `npm run build` is ~11s and some
 * runs genuinely want the current dist (bisecting a build, or testing what
 * shipped).  It names the newest offending file so the warning is actionable
 * rather than a thing to scroll past. */
function _distStaleness() {
  /* v2.3.2078: honour QA_DIST, so a verification run pointed at a second
     build is not told its own fresh bundle is stale. */
  const _root = process.env.QA_DIST
    ? (process.env.QA_DIST.startsWith('/') ? process.env.QA_DIST : join(H.REPO, process.env.QA_DIST))
    : join(H.REPO, 'dist');
  const dist = join(_root, 'index.html');
  if (!existsSync(dist)) return { missing: true };
  const built = statSync(dist).mtimeMs;
  let newest = null, newestAt = 0, n = 0;
  const skip = new Set(['node_modules', '.git', 'dist', 'dist-verify', '.wrangler', 'out']);
  const walk = (d) => {
    let ents; try { ents = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      if (e.name.startsWith('.') || skip.has(e.name)) continue;
      const full = join(d, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      let st; try { st = statSync(full); } catch { continue; }
      if (st.mtimeMs > built) { n++; if (st.mtimeMs > newestAt) { newestAt = st.mtimeMs; newest = full; } }
    }
  };
  for (const root of ['public', 'src']) walk(join(H.REPO, root));
  return { missing: false, n, newest, ageS: (Date.now() - built) / 1000 };
}
const _stale = _distStaleness();
if (_stale.missing) {
  console.log('\n  !! dist/index.html does not exist — run `npm run build` first.\n');
} else if (_stale.n > 0) {
  console.log(`\n  !! dist/ IS STALE: ${_stale.n} file(s) under public/ or src/ are newer than the last build.`);
  console.log(`     newest: ${_stale.newest.replace(H.REPO + '/', '')}`);
  console.log('     Scenarios serve dist/, so this run measures the PREVIOUS build.');
  console.log('     Run `npm run build` unless you meant to test what is already built.\n');
}

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
