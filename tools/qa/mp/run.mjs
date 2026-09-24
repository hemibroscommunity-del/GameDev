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
  devarmor: () => import('./mp-devarmor.mjs'), /* v2.3.2875: the admin kit hands out the copper and iron armour sets, into the right bags, wearable */
  monstertrim: () => import('./mp-monstertrim.mjs'), /* v2.3.2870: monster strips load cropped -- byte-identical, drawn, freed on the way out, loadable again */
  sheen: () => import('./mp-sheen.mjs'), /* v2.3.2864: a permanent soft shine on metal -- on every frame, copper stays copper, the jogging full-set knight too; pictures and its cost.  v2.3.2887: on by default, ?sheen=0 turns it off */
  sheenall: () => import('./mp-sheenall.mjs'), /* v2.3.2887: the shine on EVERY armour animation, yours and another player's, in steel, iron, copper and a mixed set -- found by the art file each sprite draws, checked on every frame */
  peerattackink: () => import('./mp-peerattackink.mjs'), /* v2.3.2863: another player's swing and bow shot wear their drawings -- both sides, the back from behind, and the bow no longer borrows the sword's frames */
  poseskin: () => import('./mp-poseskin.mjs'), /* v2.3.2861: hit, mining and dodge wear the walking skin on a player who never picked one -- body and the head drawn over armour, baked before the first hit */
  headink: () => import('./mp-headink.mjs'), /* v2.3.2862: the face tattoo stays on under the head overlays -- pickup, a hit or mining in armour, the full-steel knight, both sides and the back of the head, and a watcher's view */
  townscenery: () => import('./mp-townscenery.mjs'), /* v2.3.2859: town's NPCs + buildings load and free with town, and town is never seen without them */
  harvestink: () => import('./mp-harvestink.mjs'), /* v2.3.2854: tattoos stay on while fishing -- on both screens, the rod untouched, and a pink chest tattoo never lifted over the shirt */
  chopink: () => import('./mp-chopink.mjs'), /* v2.3.2855: ...and while chopping -- your lumberjack and a watcher's view of it, both sides of the tree, the axe untouched, the whole figure in your skin */
  fireink: () => import('./mp-fireink.mjs'), /* v2.3.2858: ...and while lighting a fire -- the same layer over the shared fire-lighter, own screen and a watcher's, nothing on the flame, the fist cupped at it in your skin */
  cookink: () => import('./mp-cookink.mjs'), /* v2.3.2856: ...and while cooking -- on a layer of their own over the shared cook, on both screens, never on a plain player's cook, the fish and pan untouched, the fingers in your skin */
  hotarrow: () => import('./mp-hotarrow.mjs'), /* v2.3.2847: the bow special is the pine arrow white-hot -- glowing, animated, sparking in flight; smouldering and flaring on its ticks once stuck; the painted sheet never downloaded; the hit capsule unchanged; a peer sees it too */
  projlook: () => import('./mp-projlook.mjs'), /* v2.3.2919: a peer's arrow is tipped in their element and fades as theirs does; their bolt glows in their element */
  bowvolley: () => import('./mp-bowvolley.mjs'), /* v2.3.2848: the bow special as three white-hot arrows on a real worker -- three part:3 sends, one shove, all three settled, one burn, no blast */
  hitmat: () => import('./mp-hitmat.mjs'), /* v2.3.2843: every monster throws its own material (snow, slime, blood + char, ashy dust, bone, stone), shaped by the weapon -- an arrow's jet, a bolt's blast, a blade's sheet -- and the pieces land */
  shotland: () => import('./mp-shotland.mjs'), /* v2.3.2844: a bolt or an arrow is drawn landing IN the body -- round its centre, spread over its core -- not on the ring its hit test registers on; the hit itself still registers there */
  staffcast: () => import('./mp-staffcast.mjs'), /* v2.3.2841: the staff cast -- the crystal charges on the cooldown, the bolt leaves it and rejoins its real line, the staff stands head-up and kicks, a peer sees it */
  campfire: () => import('./mp-campfire.mjs'), /* v2.3.2846: the lit-log campfire in pixel art -- the strike stands on the ground, the fire is lit at your boots, burns (sparks, smoke, charring logs), sorts around you, still cooks on a tap, dies down to embers */
  campfirelife: () => import('./mp-campfirelife.mjs'), /* v2.3.2917: a cooking peer's fire stays lit on the watcher's screen as long as it does on theirs, and goes out on the same schedule */
  geartrim: () => import('./mp-geartrim.mjs'), /* v2.3.2750 (+ v2.3.2774 combat strips): gear frames cropped to their art -- under a third of the bytes, and every layer still lands exactly on the body, own screen and peer's */
  liveness: () => import('./mp-liveness.mjs'), /* v2.3.2811-2815: trees sway, signs swing, flags wave, the forge smokes, people breathe, and the bag comes alive -- all still under the calm switch */
  shirtjog: () => import('./mp-shirtjog.mjs'), /* v2.3.2747: the tee's keyline holds on every frame the game draws while running, all eight directions -- the owner's "static" */
  arrowsnap: () => import('./mp-arrowsnap.mjs'), /* v2.3.2731: one arrow in eight snaps on what it hits -- same damage, a different picture */
  monstershots: () => import('./mp-monstershots.mjs'), /* v2.3.2732: slime goo in the thrower's colour, goblin fire, drawn in code */
  propfx: () => import('./mp-propfx.mjs'), /* v2.3.2730: a hit on a prop -- the arrow stands in the rock, the bolt crashes on it, the sword cuts it, and a peer sees all three */
  lightfx: () => import('./mp-lightfx.mjs'), /* v2.3.2710: map-lit shadows + metal glint behind ?lightfx=1 -- off costs nothing, the shadow hangs off the feet along the map's light and survives a swing; before/after pictures for the owner */
  propdepth: () => import('./mp-propdepth.mjs'), /* v2.3.2748: in front of a prop or behind it by where your FEET are and where its art meets the ground; props stop your feet from behind; the owner's four screenshots as cases, each checked against the old rule */
  worldshadow: () => import('./mp-worldshadow.mjs'), /* v2.3.2749: props, trees and every monster on screen cast a shadow in each sunlit zone, and a building's shadow falls on its shaded side; pictures off/on */
  rosterink: () => import('./mp-rosterink.mjs'), /* v2.3.2690: one character's face tattoo on every saved character -- the picker's faces, a switch seen by a peer, and a new character's blank face */
  species: () => import('./mp-species.mjs'), /* v2.3.2682: the monkey in the Skin tab, tan muzzle on any fur, and a peer sees it */
  eyestyle: () => import('./mp-eyestyle.mjs'), /* v2.3.2643: the Eyes tab picks a shape AND a colour, the styles land on the eye line, and glasses go over them */
  ahshot: () => import('./mp-ahshot.mjs'), /* v2.3.2626: pictures of the Auction House art on the plaza, four viewports */
  listingoffer: () => import('./mp-listingoffer.mjs'), /* v2.3.2623: a real gold offer between two players -- escrowed on offer, settled on accept */
  listingdm: () => import('./mp-listingdm.mjs'), /* v2.3.2621: the chat icon on a listing, and a line typed by one player arriving on the other player's screen */
  sellericon: () => import('./mp-sellericon.mjs'), /* v2.3.2620: the seller icon on a listing, and the player list it was extracted from */
  listweek: () => import('./mp-listweek.mjs'), /* v2.3.2619: every listing runs a week and NOTHING asks -- the control must not exist */
  marketonly: () => import('./mp-marketonly.mjs'), /* v2.3.2618: Market is the only button in the vendor building, the shelf matches the mockup, and Shopkeeper Bro still stocks all five staples */
  vendorprompt: () => import('./mp-vendorprompt.mjs'), /* v2.3.2617: the Enter VENDOR prompt must not survive its own tap -- real finger taps at four viewports, asked of elementFromPoint (TRAPS §67) */
  exitmark: () => import('./mp-exitmark.mjs'), /* v2.3.2605: can you see the way out of a spoke -- measured against sand AND snow, at four viewports */
  sellcue: () => import('./mp-sellcue.mjs'), /* v2.3.2606: a server-settled sale rings the coin sound, a refused one does not, and the sound setting silences it */
  sellsheet: () => import('./mp-sellsheet.mjs'), /* v2.3.2612: why tapping Sell reads as nothing happening -- disabled variant, covered button, or a price sheet below the fold */
  zonebanner: () => import('./mp-zonebanner.mjs'), /* v2.3.2596: the zone-entry banner plays its nine beats, docks into the top bar, frees its strip on the way out -- and stays silent in the ten zones with no art */
  worldfx: () => import('./mp-worldfx.mjs'), /* v2.3.2712: time of day, dust, blood, the crumbling corpse; v2.3.2713: the exploding one */
  catgrid: () => import('./mp-catgrid.mjs'), /* v2.3.2597: the Points screen is four category buttons; drill into one at a time */
  zoneflip: () => import('./mp-zoneflip.mjs'), /* v2.3.2541: the front/back switch is in front of the zone frames AND keeps its own taps */
  bowgate: () => import('./mp-bowgate.mjs'), /* v2.3.2543: the bow's fire gate tests the ray the player is SHOWN -- measured after the player walks, which is when the two used to drift apart */
  gearstash: () => import('./mp-gearstash.mjs'), /* v2.3.2523: the gear stashes move server-side -- the frame, the stored blob, and no double-adopt on reconnect */
  copperfeet: () => import('./mp-copperfeet.mjs'), /* v2.3.2519: the body's boot showing past the leg armour on a jog east */
  teeshield: () => import('./mp-teeshield.mjs'), /* v2.3.2516: is the bare jog-east shoulder the shield's arm capsule, or the artist's unsleeved frames? */
  facebow: () => import('./mp-facebow.mjs'), /* v2.3.2516: the face tattoo reaches the jaw on a moving bow shot */
  arules: () => import('./mp-arules.mjs'), /* v2.3.2516: the sprite-art RULE fixes -- cape on the roll and the loot bend, and the cape the south block used to lose */
  store: () => import('./mp-store.mjs'), /* v2.3.2476: the auction house -- list from the bag, walk to the door, see it on the shelf */
  stuckarrow: () => import('./mp-stuckarrow.mjs'), /* v2.3.2511: one arrow sticks, and it sticks in the body */
  inkframes: () => import('./mp-inkframes.mjs'), /* v2.3.2470: a drawing must not pulse or spill as he runs */
  backprev: () => import('./mp-backprev.mjs'), /* v2.3.2467: the pedestal preview turns round and so do the drawings */
  solospecial: () => import('./mp-solospecial.mjs'), /* v2.3.2465: the swipe fires the special alone -- no ordinary shot leading or trailing it -- and the three magic orbs are evenly spaced */
  offgrid: () => import('./mp-inkoffgrid.mjs'), /* v2.3.2463: a placed design drags off the edge and is clipped */
  textfloor: () => import('./mp-textfloor.mjs'), /* v2.3.2466: the 11px floor, and that nothing got cut off reaching it */
  inkreach: () => import('./mp-inkreach.mjs'), /* v2.3.2461: the pants squares ARE the trousers, and the shirt's run further down */
  devstall: () => import('./mp-devstall.mjs'), /* v2.3.2440: the panel answers even when the admin surface never does -- and names an off capability with no key at all */
  joingate: () => import('./mp-joingate.mjs'), /* v2.3.2439: the world waits for the server -- a dead room, a not-ready room and a dropped socket all hold the player out */
  hitreal: () => import('./mp-hitreal.mjs'), /* v2.3.2435: every weapon and special against the monsters the WORKER owns, moves and settles */
  spinfeet: () => import('./mp-spinfeet.mjs'),
  hitmatrix: () => import('./mp-hitmatrix.mjs'), /* v2.3.2435: does EVERY weapon and special register its hits, on a PINNED monster (the control for hitreal) and in a duel */
  hitsweep: () => import('./mp-hitsweep.mjs'), /* v2.3.2426: how accurate IS ranged hit detection -- measured hit rate vs the real per-frame step */
  standinart: () => import('./mp-standinart.mjs'), /* v2.3.2429: a swing and a raised shield wear your drawings */
  designs: () => import('./mp-designs.mjs'), /* v2.3.2436: the ready-made design gallery, and what picking one puts on the character */
  lookrestore: () => import('./mp-lookrestore.mjs'), /* v2.3.2444: your drawings, patterns and eye colour follow you to a new phone */
  ccink: () => import('./mp-ccink.mjs'), /* v2.3.2414: the inline ink card replaces the Design button nobody noticed */
  ccfit: () => import('./mp-ccfit.mjs'), /* v2.3.2395: the monocle hangs off the eye in SW; the golden glasses stop overhanging the head in S */
  ewcolour: () => import('./mp-ewcolour.mjs'), /* v2.3.2424: the eyewear swatch, and which part it paints */
  switchbro: () => import('./mp-switchbro.mjs'), /* v2.3.2421: the door says what it does, in both directions */
  ccspin: () => import('./mp-ccspin.mjs'), /* v2.3.2391: the drag-to-spin cue, and that it does not eat the drag */
  cckb: () => import('./mp-cckb.mjs'), /* v2.3.2391: the iOS keyboard no longer shoves the creator */
  ccshades: () => import('./mp-ccshades.mjs'), /* v2.3.2390: the Thug Life south frame does not bow upward at the temples */
  ccjoin: () => import('./mp-ccjoin.mjs'), /* v2.3.2388: the join button explains its refusal; the diamond rail is gone */
  orbrange: () => import('./mp-orbrange.mjs'), /* v2.3.2387: a magic orb reaches as far as an arrow (675px, was 340) */
  jetstream: () => import('./mp-jetstream.mjs'), /* v2.3.2398: the bow's arrows lay the aim line now, and the sight beam they replaced is dark */
  fakenum: () => import('./mp-fakenum.mjs'), /* v2.3.2350-2352: the client stops billing damage the worker never dealt */
  brobadge: () => import('./mp-brobadge.mjs'), /* v2.3.2345: the verified-Bro badge has art in it -- Texture.from is a lookup, so the icon rides the manifest */
  equipstale: () => import('./mp-equipstale.mjs'), /* v2.3.2341: Equip from a popup that outlived its bag must reach the worker or do nothing */
  lootcue: () => import('./mp-lootcue.mjs'), /* v2.3.2545: the pile's last call, the ask that fires when the magnet takes it, and the position that ask is judged against */
  lootmagnet: () => import('./mp-lootmagnet.mjs'), /* v2.3.2490: the magnet stops PUSHING the pile away, and a drifted pile is re-homed */
  lootzone: () => import('./mp-lootzone.mjs'), /* v2.3.2342: a loot pile dropped in Ember does not land on Frost's ground */
  partpool: () => import('./mp-partpool.mjs'), /* v2.3.2331: the particle field is pooled sprites, not re-tessellated polygons */
  lootbob: () => import('./mp-lootbob.mjs'), /* v2.3.2329: the snowman's wreck, coin and shard bob + pulse like every other pile */
  deathtex: () => import('./mp-deathtex.mjs'), /* v2.3.2328: dying releases the zone's art, like walking out does */
  btnmove: () => import('./shot-btnmove.mjs'), /* v2.3.2574: the combat-button layout, measured and photographed before/after -- prints a gap table, asserts nothing */
  abilslot: () => import('./mp-abilslot.mjs'), /* v2.3.2327: bash moves down-left of the disc; whirl is the sword's */
  bowside: () => import('./mp-bowside.mjs'), /* v2.3.2325: the idle bow mirrors when the body does (SE is a mirrored SW) */
  goldrail: () => import('./mp-goldrail.mjs'), /* v2.3.2320: the purse moves to the zone rail and the nav buttons take its room */
  arrowblast: () => import('./mp-arrowblast.mjs'), /* v2.3.2279: the bow special's blast finale, end to end; v2.3.2848: run behind the bowvolley kill switch, where it still exists */
  chatlayer: () => import('./mp-chatlayer.mjs'), /* v2.3.2276: chat paints under the menus, and its composer stands down for them */
  ambient: () => import('./mp-ambient.mjs'), /* v2.3.2762: the maps' ambient life -- the worldview's five features and the four spokes, counted and photographed */
  formshade: () => import('./mp-formshade.mjs'), /* v2.3.2767: light from above on figures and props -- on/off diff, darker not brighter, stills for a human */
  lootland: () => import('./mp-lootland.mjs'), /* v2.3.2771: loot piles land with a bounce per item, rarest on top, RARE DROP! + shine */
  sharppixels: () => import('./mp-sharppixels.mjs'), /* v2.3.2770: character sprites sampled sharp -- shader compiles, sprites routed, edge contrast rises */
  cueshow: () => import('./mp-cueshow.mjs'), /* v2.3.2760: mining, chopping and fishing through the new cue gesture in a real zone -- wind-up, frozen at ready, gesture + effects, resource -- with screenshots */
  gcue: () => import('./mp-gcue.mjs'), /* v2.3.2384; v2.3.2760: the character freezes at `ready`, the mini-tool cue sits still and flashes, the gesture drives the swing forward and fills in ~3s */
  cooktap: () => import('./mp-cooktap.mjs'), /* v2.3.2274: a REAL tap on your own fire cooks, and does not open chat */
  chopyield: () => import('./mp-chopyield.mjs'), /* v2.3.2273: a finished harvest actually pays -- the one step mp-harvest stops short of */
  texdrift: () => import('./mp-texdrift.mjs'), /* v2.3.2272: does zone art come back when you leave the zone */
  perfdrift: () => import('./mp-perfdrift.mjs'), /* v2.3.2271: does the frame rate actually drift, and what grows with it */
  lockrings: () => import('./mp-lockrings.mjs'), /* v2.3.2263: how many rings are on the target, and whose they are */
  moncue: () => import('./mp-moncue.mjs'),       /* v2.3.2295: the notice "!" and the red plate, against REAL server monsters */
  engage: () => import('./mp-engage.mjs'), /* v2.3.2246: engaged movement is target-relative, and the attack indicator is painted */
  freshbuild: () => import('./mp-freshbuild.mjs'), /* v2.3.2237: a resumed app takes the new build; a live game is only offered it */
  lootsize: () => import('./mp-lootsize.mjs'), /* v2.3.2316: ground loot and coins draw at 2x */
  lockchip: () => import('./mp-lockchip.mjs'), /* v2.3.2313: the lock-on chip sits above the sprite, on a snowman and a slime */
  slimeorb: () => import('./mp-slimeorb.mjs'), /* v2.3.2310: the blue slime's ball is drawn at the size it is meant to be */
  snowburrow: () => import('./mp-snowburrow.mjs'), /* v2.3.2309: the burrowing snowman is still drawn on the second visit to frost */
  devwarp: () => import('./mp-devwarp.mjs'), /* v2.3.2308: the test panel's zone chips, pressed for real, from anywhere */
  devpanel: () => import('./mp-devpanel.mjs'), /* v2.3.2240: the owner's test panel */
  devflags: () => import('./mp-devflags.mjs'), /* v2.3.2412: live flags in that panel -- the operator surface that needed a computer */
  firetrail: () => import('./mp-firetrail.mjs'), /* v2.3.2238: the fire goblin's burning ground, drawn and felt */
  burstdmg: () => import('./mp-burstdmg.mjs'), /* v2.3.2235: the slime blast floats a damage number on YOU */
  bowmark: () => import('./mp-bowmark.mjs'), /* v2.3.2234: a REAL bow shot, and the mark on its number */
  remnant: () => import('./mp-remnant.mjs'), /* v2.3.2233: one monster leaves ONE claimable remnant, not dozens */
  skeleton: () => import('./mp-skeleton.mjs'), /* v2.3.2229: one hit unwraps the mummy, and the skeleton is bigger and faster */
  dmgicon: () => import('./mp-dmgicon.mjs'), /* v2.3.2232: the damage number names the weapon that dealt it */
  statdemo: () => import('./mp-statdemo.mjs'), /* v2.3.2230: the stat explainer's scene faces the slime, and the +1 lands on your head */
  critpreview: () => import('./mp-critpreview.mjs'), /* v2.3.2213: crit vs normal on demand, no playthrough */
  basicwindup: () => import('./mp-basicwindup.mjs'), /* v2.3.2215: every monster tells you before it hits */
  feel: () => import('./mp-feel.mjs'), /* v2.3.2200: contact-synced hits, universal recoil, ground marks */
  slimeburst: () => import('./mp-slimeburst.mjs'), /* v2.3.2228: the blue slime's death burst plays, at peak size */
  introfit: () => import('./mp-introfit.mjs'), /* v2.3.2199: the loading bar is painted into the film, so the clip must not be cropped */
  capeattack: () => import('./mp-capeattack.mjs'), /* v2.3.2190: the cape stays on while you attack, anchored on the head */
  a2hs: () => import('./mp-a2hs.mjs'), /* v2.3.2159: the install instruction finds the right player */
  tutskip: () => import('./mp-tutskip.mjs'), /* v2.3.2890: Skip tutorial on the welcome, and no pop-ups after */
  standalone: () => import('./mp-standalone.mjs'), /* v2.3.2185: the installed web app -- the home-indicator inset every other scenario runs at zero */
  landdash: () => import('./mp-landscape-dash.mjs'), /* v2.3.2157: the 48px strip, the side sheet, and playing with menus open */
  landrotate: () => import('./mp-landscape-rotate.mjs'), /* v2.3.2157: rotation is a clean handoff both ways */
  landview: () => import('./mp-landscape-view.mjs'), /* v2.3.2156: the view rule switches axes; portrait is pinned */
  hatrun: () => import('./shot-hatrun.mjs'), /* v2.3.2896: every hat on the head standing and mid-jog, both sideways directions -- a contact sheet for the eye, asserts only that it could take the pictures */
  townrim: () => import('./mp-townrim.mjs'), /* v2.3.2896: the rocks round town are a wall -- walked into from seven sides, boots stop on the ground at the edge; the stairs still lead out */
  pathstyle: () => import('./mp-pathstyle.mjs'), /* v2.3.2141: the quest path can be turned off, and it has a shape; v2.3.2896: + the on/off switch in the Quests panel */
  wvglass: () => import('./mp-wvglass.mjs'), /* v2.3.2141: the World View figure is small again, and the glass is centred on him */
  inkreset: () => import('./mp-inkreset.mjs'), /* v2.3.2114: do Reset and Randomize clear the tattoos — all four of them? */
  rollbake: () => import('./mp-rollbake.mjs'), /* v2.3.2083: is the dodge roll baked before you roll? */
  inkplace: () => import('./mp-inkplace.mjs'), /* v2.3.2082: does a tattoo stay in the same place while you move? */
  townforge: () => import('./mp-townforge.mjs'), /* v2.3.2077: forging in town reaches the worker */
  townmeal: () => import('./mp-townmeal.mjs'), /* v2.3.2077: eating + cooking in town reach the worker */
  plazaplate: () => import('./mp-plazaplate.mjs'), /* v2.3.2071: a plate on every townsperson, benches facing the water */
  polish: () => import('./mp-polish.mjs'), /* v2.3.2820: demo-audit polish -- feedback that arrives, volume sliders, live mute, party chip, daily toast, About page */
  smelt: () => import('./mp-smelt.mjs'), /* v2.3.2822: ore into bars at the blacksmith */
  smithy: () => import('./mp-smithy.mjs'), /* v2.3.2826: the Blacksmith rebuilt + the smith at work */
  whirlwind: () => import('./mp-whirlwind.mjs'), /* v2.3.2824: the 2s aimable windup ring */
  portalbeam: () => import('./mp-portalbeam.mjs'), /* v2.3.2070: the light shaft over a zone exit */
  lilbro: () => import('./mp-lilbro.mjs'), /* v2.3.2064: the second walking NPC */
  potions: () => import('./mp-potions.mjs'), /* v2.3.2062: the mana + speed draughts */
  drinkcrash: () => import('./mp-drinkcrash.mjs'), /* v2.3.2151: drinking must not take the app down */
  ccstand: () => import('./mp-ccstand.mjs'), /* v2.3.2151: the bro stands mid-pedestal */
  ccfeet: () => import('./mp-ccfeet.mjs'), /* v2.3.2378: the lion backplate does not cover his boots, on the phone-with-toolbars viewport */
  statcols: () => import('./mp-statcols.mjs'), /* v2.3.2382: the point rows go two abreast at 375+, one column below it, nothing clipped */
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
  bowshield: () => import('./mp-bowshield.mjs'), /* v2.3.2542: a bow HAS a shield button (D8), and the right control's double tap is bound to nothing -- neither the weapon swap nor the retired guard */
  swingsfx: () => import('./mp-swingsfx.mjs'), /* v2.3.2450: one whoosh leading the blade, one hit on contact, alternating pitch */
  rbutton: () => import('./mp-rbutton.mjs'), /* v2.3.2242: the right control is a button — hold to attack, swipe for special, a shield toggle beneath it */
  target: () => import('./mp-target.mjs'), /* v2.3.2243: the targeting perimeter, the lock that holds, the switch arrows, magic splash = arrow */
  tattoos: () => import('./mp-tattoos.mjs'), /* v2.3.1949: face + arm tattoos survive both server gates, end to end */
  roster: () => import('./mp-roster.mjs'), /* v2.3.1923: the device's character list — order, delete, the ten cap */
  drops: () => import('./mp-drops.mjs'), /* v2.3.1924: iron pieces to the bag, the gem to the glass */
  drillback: () => import('./mp-drillback.mjs'), /* v2.3.1922: the drill back-chip is not under the gold, and is paid for once */
  bootstall: () => import('./mp-bootstall.mjs'), /* v2.3.1921: a worker that never answers must not strand the login door */
  duelfeel: () => import('./mp-duelfeel.mjs'), /* v2.3.1918: play-test — TTK, blocking, weapon switching */
  hpscale: () => import('./mp-hpscale.mjs'), /* v2.3.2572: every HP readout reads the same number */
  monsterplate: () => import('./mp-monsterplate.mjs'), /* v2.3.1918: monsters get the player's name plate */
  chatfont: () => import('./mp-chatfont.mjs'), /* v2.3.1912: the chat font, measured on the glass */
  chatbubble: () => import('./mp-chatbubble.mjs'), /* v2.3.2896: no Send button (the phone's key sends), a long word wraps inside the bubble, and the point sits over the name plate -- both screens */
  afk: () => import('./mp-afk.mjs'), /* v2.3.1913: idle characters log out after 2 min */
  tutgrant: () => import('./mp-tutgrant.mjs'), /* v2.3.1901: the first quest's sword + shield */
  skillup: () => import('./mp-skillup.mjs'), /* v2.3.1915: life-skill level celebration; re-aimed v2.3.2591 at the owner art burst + the skill icon in the medallion */
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
  btnlayout: () => import('./mp-btnlayout.mjs'), /* v2.3.2254: no combat button hides under the dashboard */
  arrowshot: () => import('./mp-arrowshot.mjs'), /* v2.3.2253: what the target arrows look like, yellow and red */
  zoomshot: () => import('./mp-zoomshot.mjs'), /* v2.3.2249: what the bro LOOKS like at a given zoom — driven by sweep-zoom.mjs */
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
  slimewave: () => import('./mp-slimewave.mjs'), /* v2.3.2912: the slime burst draws a shockwave at its real radius, and shakes only the players inside it */
  deathcut: () => import('./mp-deathcut.mjs'), /* v2.3.2913: monsters die sliced, beheaded, legless or the normal way -- pieces fall and settle, then go */
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
  zonedecor: () => import('./mp-zonedecor.mjs'), /* v2.3.2651: frost's decor loads per-zone, draws, sorts, and is freed on the way out */
  propshots: () => import('./mp-propshots.mjs'), /* v2.3.2699: a snowball and an arrow visibly STOP at a prop, watched on the real frame clock */
  shieldbonk: () => import('./mp-shieldbonk.mjs'), /* v2.3.2700: a shield bonk pops the burrowing snowman up -- the powder and the star ring, as drawn */
  uisfx: () => import('./mp-uisfx.mjs'), /* v2.3.2637: the owner's three sounds decode */
  uisfx2: () => import('./mp-uisfx2.mjs'), /* v2.3.2638: the sound actually FIRES */
  uisfx3: () => import('./mp-uisfx3.mjs'), /* v2.3.2658: click vs close routing, and no doubles */
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
  dodgetime: () => import('./mp-dodgetime.mjs'), /* v2.3.2916: a peer's roll plays over THEIR window (250-700 ms), frame for frame with their own screen, and ends when theirs does */
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
  dunedepth: () => import('./mp-dunedepth.mjs'), /* v2.3.2745: Wind Dunes perspective depth preview — smaller and slower going north */
  wvscale: () => import('./mp-wvscale.mjs'), /* v2.3.2287: your own art shrinks on the vista, and nothing changes off it */
  tapswing: () => import('./mp-tapswing.mjs'), /* v2.3.2285: tap a monster, walk there -- does the swing ever start? */
  deathgold: () => import('./mp-deathgold.mjs'), /* v2.3.2343: dying charges no gold, and the HUD agrees with the worker */
  deathstrip: () => import('./mp-deathstrip.mjs'), /* v2.3.2281: what is painted ON the corpse, from the screen's side rather than the display's */
  questprox: () => import('./mp-questprox.mjs'), /* v2.3.1701: the giver's dialogue opens on approach */
  questlegs: () => import('./mp-questlegs.mjs'), /* v2.3.1701: the quest greaves equip to the LEGS */
  authority: () => import('./mp-authority.mjs'), /* v2.3.1702: ability spends, firemaking + local-AI HP */
  hubspawn: () => import('./mp-hubspawn.mjs'), /* v2.3.1703: leaving town does not put you back in town */
  block: () => import('./mp-block.mjs'), /* v2.3.1705: the shield is directional, and the cone is the hitbox */
  questline: () => import('./mp-questline.mjs'), /* v2.3.1707: the WHOLE line, start to finish, through the dialogue */
  questwall: () => import('./mp-questwall.mjs'), /* v2.3.1972: what he offers after the last quest he can be paid for */
  questkill: () => import('./mp-questkill.mjs'), /* v2.3.1972: the objective EARNED — kill it, and see the drop land */
  harvest: () => import('./mp-harvest.mjs'), /* v2.3.1704: extraction_start reaches the worker + the shield ends */
  ability: () => import('./mp-ability.mjs'), /* v2.3.1733: the stamina abilities reach the worker (v2.3.2662: no milestone gate -- the ladder is gone) */
  joyfade: () => import('./mp-joyfade.mjs'), /* v2.3.2260: both sticks appear on input and fade after 2s; the right one stays while contextual */
  dashhit: () => import('./mp-dashhit.mjs'), /* v2.3.2261: does the lunge hurt a SERVER-driven monster? */
  dashreal: () => import('./mp-dashreal.mjs'), /* v2.3.2418: a REAL finger on the disc, with the lock left to the game itself */
  dashroll: () => import('./mp-dashroll.mjs'), /* v2.3.2463: the lunge tumbles instead of gliding */
  snowman: () => import('./mp-snowman.mjs'), /* v2.3.2419: does a snowman attack in each of its three bands? */
  worldtext: () => import('./mp-worldtext.mjs'), /* v2.3.2262: the dashboard zoom is a keeper, and in-world text must not shrink with it */
  aimpath: () => import('./mp-aimpath.mjs'), /* v2.3.2260: bow and magic fly where you point, not along an axis */
  orbline: () => import('./mp-orbline.mjs'), /* v2.3.2259: the magic special is one line of three, and bow/staff start at 80% of the melee starter */
  firegear: () => import('./mp-firegear.mjs'), /* v2.3.1723: the fire-lighter's clothes sit on their body */
  burst: () => import('./mp-burst.mjs'),
  soak: () => import('./mp-soak.mjs'), /* v2.3.1741: does anything grow while you play */
  zonechurn: () => import('./mp-zonechurn.mjs'), /* v2.3.1741: does touring zones leak */
  questbanner: () => import('./mp-questbanner.mjs'), /* v2.3.1745: QUEST ACCEPTED! / QUEST COMPLETED! over the dialogue */
  zonefx: () => import('./mp-zonefx.mjs'), /* v2.3.1748: what follows you through an exit, and what leaks in */
  firepeer: () => import('./mp-firepeer.mjs'), /* v2.3.2146: is the peer DRAWN while lighting a fire? */
  cookpeer: () => import('./mp-cookpeer.mjs'), /* v2.3.2303: ...and do they wear their clothes while cooking and chopping? */
  gatherspot: () => import('./mp-gatherspot.mjs'), /* v2.3.2915: a peer's lumberjack stands at the tree and their cook at the fire, where their own screen draws them */
  npctap: () => import('./mp-npctap.mjs'), /* v2.3.2305: tapping a character to talk -- and NOT hitting him */
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
  /* v2.3.2228: a throw inside the render loop is caught and logged by
     pixiRenderer rather than crashing, so nothing else in this harness would
     ever notice it -- see takeRenderThrows.  Charged to whichever scenario
     was running, because that is the one that can reproduce it. */
  const _rt = H.takeRenderThrows();
  if (_rt.length) rec.ok('the render loop did not throw', false, { threw: _rt.slice(0, 3) });
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
