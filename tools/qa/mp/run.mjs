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
  farm: () => import('./mp-farm.mjs'), /* v2.3.3111: the farm on a phone -- Enter at the Feed & Seed opens the worker's farm (six beds of grass, the tool on Dig); one finger across three beds digs them in one message; the Seeds tab sells carrot seeds and compost for the worker's coins; the tool moves to Plant, Plant all sows; Water re-times a bed 8 -> 6 min, Feed composts it; ripened by the dev op, Harvest all pays 7 carrots and 75 Farming XP, the worker's bag agreeing; reopened, the farm is the worker's; pictures */
  tapact: () => import('./mp-tapact.mjs'), /* v2.3.3105: the right stick shows what a tap does and the tap does it -- a DOOR at the bank's steps (the bank opens), a speech BUBBLE beside Ace (his coin flip opens), the JUMP arrow with nothing about (a jump) */
  tapprop: () => import('./mp-tapprop.mjs'), /* v2.3.3105: beside a prop a tap on the right stick jumps (zone, disc, or on the prop) and a hold toward it swings and lands blows; the stick wears the JUMP picture while a tap would jump, the weapon under a lock */
  tapjump: () => import('./mp-tapjump.mjs'), /* v2.3.3105: a tap on the right stick jumps when nothing else wants it -- the old button gone; an empty tap jumps; a lock lets go, a busy disc, a drag and a tap on yourself do not jump */
  createflag: () => import('./mp-createflag.mjs'), /* v2.3.3046: a crash's reload never lands a player in the creator -- once in the world the address carries no ?create=1; reloaded from an old tab's ?create=1 with a character on the key, the flag reads stale and the ordinary road is taken; a new key with the flag still gets the creator */
  questguide: () => import('./mp-questguide.mjs'), /* v2.3.3047-v2.3.3049: the first quest's guidance on a phone in the Wheel -- Mayor Bro offers ('!'), waits on you (a grey '?') and is ready (a drawn green check); the quest card leads with the quest picture, then the painted check; the folded band's OPEN flashes, then the sword AND the shield tiles and nothing else, the shield alone once the sword is on; handed in, the bow AND the staff flash; pictures */
  nomansland: () => import('./mp-nomansland.mjs'), /* v2.3.3058: No man's land on two screens -- out on a Lv 6-10 ring each player is told (banner, chat, the top bar's red line -- v2.3.3107: the skull badge over the dashboard's middle, whose tap explains); a tap AIMS at the other (no card); a swing lands and the attacker wears a RED skull, the one hit a WHITE one, each seeing the other's; the killing blow takes the wanderer's spare greatsword to the raider's bag, leaves the shield, and drops the minnows in a pile that is the raider's; pictures */
  nodelabels: () => import('./mp-nodelabels.mjs'), /* v2.3.3038 + v2.3.3040 + v2.3.3059: the label over each resource on a phone -- every one its tool's picture (grey for a level you lack), only the nearest within 260 px its bag name and level (gold "Lv 1" on the commons), ~20 CSS px at any zoom, over the art, none of the old tier dot / emoji / tips; a clownfish spot "Lv 5" in red with a grey rod, and a tap on it TRIES -- three blows, a 0 off the spot on each, "Requires Fishing Lv 5", its label aside, nothing sent to the worker, over by itself -- then its name pill slid clear of you; a copper vein's label aside while mined, and it cracks as it splits; pictures */
  signposts: () => import('./mp-signposts.mjs'), /* v2.3.3062: Brotown's four signposts, named -- found one at each gate, the lands' icons loaded behind the loading screen, none up from the square; at each gate its two plates fade in, the land straight on and the one whose trail forks off that road, named as the map names them with their icons and arrows the way they lie; walking away they go; pictures */
  landmusic: () => import('./mp-landmusic.mjs'), /* v2.3.3064: each land of the Wheel its own music -- before (?nolandmusic) the Wheel's own key and the game's theme everywhere; Brotown the town's track; Frost Ridge frost.mp3 after its banner; a step back onto the commons keeps the land's music, the town's back only after 8 s there; the Flame Fields fire.mp3, the Wind Dunes desert.mp3 with its wind, the Stone Hollows (no track) the theme with the wind let go, the Verdant Wilds forest.mp3; a death brings the town's track back without the theme over the Wheel */
  north: () => import('./mp-north.mjs'), /* v2.3.3065: north on the Wheel's maps -- the minimap's frame carries a brass N bead at the middle of its top band, drawn, the frame either side unchanged; the world map has a compass at its top left (the N and the needle's brass north half), clear of the zoom buttons, taking no taps; pictures */
  wheelhalls: () => import('./mp-wheelhalls.mjs'), /* v2.3.3066: the Wheel's halls on phones -- the Guild Hall (Clans and Skill guilds open their panels, a clan founded there), a clan invite raising its own card and Accept putting the other player in the clan, the Sheriff's Office (the player list for a duel, the arena's sign-up), the Hotel still shut, the Post Office (your mail as the worker delivered it, and Messages from friends) */
  wheelfolk: () => import('./mp-wheelfolk.mjs'), /* v2.3.3067: the rest of town's cast in the Wheel's Brotown on a phone -- Mayor Bro, Diego, Ace, Blacksmith Bro and Lil Bro each where WHEEL_TOWNSFOLK puts him, their pictures in behind the loading screen (none fetched after arriving) and what they hold, Lil Bro on screen where you arrive, each drawn a man's height facing the street, a tap on Ace opening his coin flip and a flip settled by the worker, E opening it too, a tap on Lil Bro answering */
  gpuaudit: () => import('./mp-gpuaudit.mjs'), /* v2.3.3037: what the GPU holds in the Wheel, named (window.__btGpuTex: pictures from a file, canvases, render textures, by folder, biggest first) -- on arrival, after standing, at a fight and back from a death through today's town -- with the GPU's own count and its PEAK on the way in and on the death trip (a shim on WebGL's calls) beside the asset cache; the owner's "are there any quick wins when it comes to freeing up memory?" */
  zombietex: () => import('./mp-zombietex.mjs'), /* v2.3.3069: a destroyed texture lets go of its pixels even where Pixi still points at it (pooled batches, hidden sprites' draw data) -- a phone tours four lands and comes home; after a GC none of the destroyed sources still alive holds its picture (main: ~22 MB of freed object sheets and canvases) */
  harvestbar: () => import('./mp-harvestbar.mjs'), /* v2.3.3035: the harvest's bar on a phone in the Wheel, for a tree, a copper vein and a minnow spot -- up on the worker's hits, GREEN, reading "<hp>/<HP>"; at the resource (over the crown, sitting on the rock's top, over the spot's school), not over your head; "0/<HP>" at ready; the gesture still pays; pictures mid-hits */
  worldmapfree: () => import('./mp-worldmapfree.mjs'), /* v2.3.3070: the world map's canvas (the screen at the device's pixels, 11.3 MB on a 3x phone) emptied as the map closes -- opened and closed five times on a phone, no closed map canvas holds pixels without waiting for a GC (main: 3 of 5 holding, 31.4 MB), and the map still opens and draws */
  recoverpay: () => import('./mp-recoverpay.mjs'), /* v2.3.3034: after each of the game's ways back from a black screen (the renderer rebuilt in place, the recovery reload, a lost and restored context) a point spent and a tree chopped are still settled by the worker */
  burstfree: () => import('./mp-burstfree.mjs'), /* v2.3.3071: a snowball burst playing when the frost art is handed back (freeFrostImpactTex: leaving the frost zone or the Wheel's frost land) is retired before the frame draws -- the burst started, the art freed mid-burst, no render throw and the burst gone; the art loaded again, a new burst plays */
  dmgsize: () => import('./mp-dmgsize.mjs'), /* v2.3.3033: damage numbers 1.5-2x bigger -- a plain hit and a crit drawn at DMG_SCALE times their old 21 / 38 px (the crit still 1.8x the plain one), the icon cap, the gap after the digits and the stack spacing scaled with them, a hit on you the same size and clear of your band, a kill's XP and gold above the number, a special's halo and thorns' emoji number (classic text) in step, a hit on a real fire goblin clear of its bar, and the words ("Blocked!", "Dodged", "+12", "+30 XP") the size they were; pictures */
  wheeldoors: () => import('./mp-wheeldoors.mjs'), /* v2.3.3032: the Wheel's buildings have doors -- the town's 17 known from the worker, the 12 that open a building each walked to ("Enter" and the name on the sign, a tap opening the old town's own panel), no button a step before, the 4 shut ones saying what they will be for, 12 visits counted, Diego at the General Store (his window shut at the door, open when you walk up to him), the Land Office and Feed & Seed sending you to your farm and its gate leading back out to the Wheel at the door you left by */
  nodepth: () => import('./mp-nodepth.mjs'), /* v2.3.3072: the screen has no depth buffer -- the game's WebGL context asked for and made with depth false and its stencil kept, every other attribute the ?depthbuf page's; DEPTH_TEST never turned on through a fight, a swim (the stencil mask) and a renderer rebuild on a fresh canvas, whose context has no depth buffer either; the world draws after (on an iPhone ~11 MB of GPU memory, a packed depth + stencil buffer become a byte-a-pixel stencil) */
  questwin: () => import('./mp-questwin.mjs'), /* v2.3.3030: the quest windows in the owner's painted art -- the NEW QUEST window's frame (ten pieces, decoded, no filter) and painted slots; QUEST ACCEPTED! on its banner out of .brotown-wrap; the CLAIM window (only for a choice): +25 Gold / +30 XP, the bow and staff in slots, the three chips, the claim grey then gold; a real tap -> "Rewards claimed!", the slots glowing, "+30 XP to Bow", QUEST COMPLETE! at the top and not over it, coins flying to the purse and items to the bag, his next quest; the worker paid; the auto reward's laurel check; sideways it fits */
  btnskin: () => import('./mp-btnskin.mjs'), /* v2.3.3018: the touch controls in the owner's mockup's look -- every control a gold-ringed button with a picture and no word (the attack disc's label still says ATTACK in the DOM), the movement stick a dark well with four arrows, no CSS filter anywhere; the fight's hot disc see-through with the sword at full strength, a bow showing the bow; Cooldown arcs, Disabled with no mana or stamina, the shield up and the sprint on lit and glowing, Pressed under a real finger, the ghost over a monster; pictures portrait and sideways */
  musicstream: () => import('./mp-musicstream.mjs'), /* v2.3.3073: the music streamed from its files through one <audio> on the music bus, not decoded -- music plays from the deck and is heard at its tap with no music-length AudioBuffer alive (?musicdecode holds the old way's tens of MB); a zone with a track takes the deck, one without hands it back to the session track; the loop; the mute and slider; a rebuilt AudioContext gets a deck of its own; a failed deck falls back to decoding, never silence */
  wheelwaves: () => import('./mp-wheelwaves.mjs'), /* v2.3.3019: the Wheel's water moves -- its program built behind the loading screen; at a coast lines of light and glints over the water, surf riding in and the shore's foam lapping, drawn only on the water; two moments differ over the water many times more than with it off; the Sweetwater River's streaks running the way it flows; ?nowaves keeps it still; every field let go in town; GIFs of the coast and the river */
  groundcopy: () => import('./mp-groundcopy.mjs'), /* v2.3.3076: the Wheel's ground is kept on the GPU only -- a phone reads pieces back from the GPU and finds them exactly as the worker laid them, standing, after a walk across the commons and after a black screen's rebuild, while the page keeps none of their colours after a forced GC (main: one copy a piece, 34 MB standing) */
  firefight: () => import('./mp-firefight.mjs'), /* v2.3.3017: the owner's black screen, hunted -- a phone in the Wheel fights a land's first monsters (FF_HOME, ember) through the real controls, jumping, burning, dying and coming back, while the page records every half second what the screen shows (zone, veils, renderer errors, textures) and screenshots are measured from outside; any dark moment not behind a loading veil or a death fails, with its picture */
  glrestore: () => import('./mp-glrestore.mjs'), /* v2.3.3017: the owner's black screen -- the world gone to the canvas's own navy with only the bro's sword drawn (an iOS graphics reset; made here by hiding the stage) read 100% LIT to the black-screen watchdog, so it never struck; now it reads dark, two strikes ask for a rebuild (in the crash log), nothing is judged behind a loading veil, and the rebuild brings the world back */
  wdsample: () => import('./mp-wdsample.mjs'), /* v2.3.3068: the black-screen watchdog's 32 x 18 sample shrunk on the GPU (blitFramebuffer) instead of copying the whole canvas out with drawImage -- both ways in one animation frame on a phone: the drawn world lit (Brotown, the Tidal land) within 3 points of the old way, the owner's navy screen dark both ways, lit again after; the GPU's way a fraction of the old one's cost */
  killedpage: () => import('./mp-killedpage.mjs'), /* v2.3.3017: a page that died open is reported by the next one -- the alive mark with zone, place and textures; a second tab beside a live one reports nothing; a page that died open (its storage carried to where nobody answers for its mark, as an iOS kill leaves it) is reported 'killed', ON SCREEN, and reaches the worker's crash feed; a page closed properly leaves no mark */
  wheelmem: () => import('./mp-wheelmem.mjs'), /* v2.3.3017: what the Wheel holds on the way to a fight -- a phone (dpr 3) walks from Brotown to a land's first monsters, measuring at each stop the asset cache (__btTex) and every texture and renderbuffer WebGL allocated (a shim on its calls), today and at ?zoom=0.8; against iPhone Safari's ~250 MB */
  memledger: () => import('./mp-memledger.mjs'), /* v2.3.3075: everything the page holds, not only its textures -- decoded sound (BT_AUDIO.decodedMB against the buffers alive), every 2D canvas alive, the JS heaps (the page's and each worker's) -- on a phone arriving in the Wheel, then two laps of the eight lands asserting the second ends where the first did (cache, canvases, heap); and a rebuild's crash entry carries what the page held (docs/MEMORY-PLAN.md) */
  membudget: () => import('./mp-membudget.mjs'), /* v2.3.3101: the memory budget on every PR (.github/workflows/memory.yml) -- a phone in the Wheel's BroTown, at a fight at the Flame Fields and home again, twice: each kind of memory's highest reading (the asset cache, the GPU's textures, 2D canvases, decoded sound, the page's heap and buffers, the workers) within its line in memory-budget.mjs, and the second trip ending where the first did */
  weaponswap: () => import('./mp-weaponswap.mjs'), /* v2.3.3005: the weapon button under the movement stick -- bottom-left above the band, beneath the disc, clear of the edge guard, the bell one place right; the weapon in hand's picture and a dot per weapon; real taps cycle sword -> bow -> staff without walking or locking, a drag does not swap, one weapon shakes, empty hands are the faint slot; above an open sheet, sideways, and the open chat feed beside it */
  hitvoices: () => import('./mp-hitvoices.mjs'), /* v2.3.3001: hits sound like what they hit -- every Wheel monster x sword, arrow and bolt plays its material's voice (snow, goo, ember, stone, bone, wet, mud) at the weapon's level, the snowman one hit not two; a teammate's blow and your own Shield Bash heard quieter, never twice, never across the map, three at most at once; a monster's ball breaks in its material on you, your shield and the ground, and the worker's blow for it is not a sword's */
  bakeleak: () => import('./mp-bakeleak.mjs'), /* v2.3.3074: a black screen's recovery and a designer stroke give back what they replace -- three renderer rebuilds and then eight strokes on a phone in the Wheel, the asset cache and the 2D canvases flat (main: 172 -> 303 MB of cache over three rebuilds, +92 MB for eight strokes), every WebGL context but the live one lost, the figure still drawn from live frames (TRAPS §139) */
  wheelbreak: () => import('./mp-wheelbreak.mjs'), /* v2.3.2995: the Wheel's objects take hits -- each its material's sound (wood, metal, stone) and pieces cut from its own picture, a shake, arrows that stay in, a bolt's burn mark; enough hits and it shatters into shards of its picture, its footprint gone, mended a few minutes later (repairms= in the test), never over you; a building collapsing */
  wheelshadows: () => import('./mp-wheelshadows.mjs'), /* v2.3.3000: the old map's shadows and air on the Wheel -- a sun, you and every object casting (buildings column by column), the shade side never the sun side, objects shaded toward their foot, trees and bushes swaying with their foot still, Frost Ridge's blue shade, its snow in the air and prints at the boots in its snow, ground-coloured dust, and a long walk across the lands with no page error; pictures off and on */
  gpuonly: () => import('./mp-gpuonly.mjs'), /* v2.3.3088: pictures kept on the graphics chip only -- two phones in the Wheel, one with ?gpucopies: the combat poses' gear strips and the damage numbers' font pages let go of once on the GPU (2D canvases that much lower), what the GPU draws for every strip the same byte for byte and a number's glyphs the same; after a black screen's rebuild the strips cut and let go of again, the font installed afresh and drawing the same, the canvases staying let go of */
  wheelnodes: () => import('./mp-wheelnodes.mjs'), /* v2.3.3012: the Wheel's resources on a phone -- none drawn without tools, the quest's road to the nearest fishing spot, fish swimming in real water by a dry seat, a swimmer who taps the spot climbs out onto its bank to fish, fished out they go and the road moves to a tree, no chop from the water, only the nodes near the view drawn, an iron vein in its own picture that pays iron ore, and the Wheel's nodes dropped at the flip up to town */
  rendergroups: () => import('./mp-rendergroups.mjs'), /* v2.3.3079: the world and the screen are Pixi render groups (the owner's yes to smoother frames, a 1-px shift accepted) -- on a phone in Brotown and at a fight the same held frame drawn with and without them: twice with them identical, without them under 1% of the screen's pixels apart (edges a pixel over), back on identical again; ?norendergroups the scene as it was; pictures out/rendergroups-*.png */
  jump: () => import('./mp-jump.mjs'), /* v2.3.3017: jumping -- the JUMP button centred under the attack disc, clear of the disc, the dashboard and every control, upright and sideways; a press lifts the body by the jump's height holding the jog's leaping frame while the feet the depth pass and the shadow read stay on the ground; one step at take-off and one at touch-down, none in the air, dust where he lands; in the air a second press, a roll and an attack wait; another player sees it; walking into a fence stops you, jumping it carries you over and down clear of it; a tree's trunk stops a jump; no button and no jump in the water; X on a keyboard (?jumpms=1800: the slow test machine's frames) */
  sprint: () => import('./mp-sprint.mjs'), /* v2.3.3006: the sprint button just right of the movement stick, level with it, on no other control, the word inside its rim, upright and sideways; a tap is only a tap (no roll, no walk); 1.33x the walk over the same ground with the legs keeping up; with a thumb on the stick a second finger's tap sprints; the worker pays every sprinting move it gets at 11 stamina a second and accepts them all; standing still ends it; run dry it ends, fades, and refuses a tap with "Not enough energy!"; Shift held on a keyboard; an attack ends it */
  wheeldungeon: () => import('./mp-wheeldungeon.mjs'), /* v2.3.3016: the Wheel's dungeons on a phone -- the three mouths known from the Wheel's map, the Great Cave's drawn and its Enter button at it only, a tap into the Stone Hollows' own monsters behind a loading screen, three waves and the boss (the dev op clearwave), the clear paying and bringing you back out at the mouth, and out again by its door */
  wheelseats: () => import('./mp-wheelseats.mjs'), /* v2.3.3013: every fishing spot of the Wheel's, walked to on a phone: the spot and its school in drawn water, the angler's seat dry, open ground -- the v2.3.3012 survey, run after any re-bake */
  sprintpeer: () => import('./mp-sprintpeer.mjs'), /* v2.3.3015: a sprint seen and heard -- the runner's push-off sound and dust at every footfall; the watcher told by the worker that they sprint, their legs 1.33x quicker and kicking up dust; walking again, their copy walks */
  wheelswim: () => import('./mp-wheelswim.mjs'), /* v2.3.3003: swimming in the Wheel -- off a pond's bank into the water (it stopped you before), only your head out of it, sunk and cut at the neck; about 0.55 of your walk in strokes you hear, a glide when you let go, no footsteps; no swing, special or roll and a held attack lets go, "Swimming!" saying why; another player drawn swimming beside you; out again whole with a drip; the open sea past the shallows still a wall; pictures */
  wheelshore: () => import('./mp-wheelshore.mjs'), /* v2.3.2999: the Wheel's water stops your BOOTS, not your middle -- at a river's north bank walking south and its south bank walking north, his boots stop on the bank at its edge (they went ~45 px in, or stopped 52 px short, at the body's centre), and the game's own walk test answers by the boots; pictures of both */
  placing2: () => import('./mp-placing2.mjs'), /* v2.3.2999: placing v2, the `?placing=2` preview -- the worker places with v2 when asked and v1 when not, no slower than the phone can take, its things drawn and their pages loaded on four lands as v1's are; pictures of each spot both ways */
  zoomout: () => import('./mp-zoomout.mjs'), /* v2.3.2997: the view 25% further out and the town at 1.15x -- the scale x0.8, the view 1.25x across, the bro 0.8 the size, the buildings 1.15x their pictures, the ground laid under the wider view, what it costs; pictures of both.  v2.3.3011: another 25% (VIEW_OUT 0.64), against `?zoom=0.8&bigtown=1.5` (the view before it, and the old town).  v2.3.3020: back in to 0.77, the bro 64 CSS px folded, against `?zoom=0.64` */
  elemhits: () => import('./mp-elemhits.mjs'), /* v2.3.2996: a monster's hit carries its element -- a snowman's chill walks you at half pace, a slime's goo holds you (no roll), a mummy's gust shoves you and the worker agrees where you landed, a fire goblin's burn ticks with the flame; each element's icon on its number, its chip in the HUD, its look drawn round you; then the real monsters of all four lands */
  wheeldeep: () => import('./mp-wheeldeep.mjs'), /* v2.3.3013: past level 5 -- every land's monsters in its first four stretches (192), the deeper ones at levels 6-10, 11-15, 16-20 on the client too (not clamped to their home's 1-2); out on Frost Ridge's third stretch the top bar says Lv 11-15, the snowmen are drawn from live art with their own levels on the danger border; one fought and killed for its level's XP */
  wheelpast20: () => import('./mp-wheelpast20.mjs'), /* v2.3.3093: past level 20 -- every land's second stage (tiers 5-8, levels 21-40, 24 a land) on the client with its own levels; out past the first pass on Frost Ridge's 21-25 the top bar says so, and its snowmen are GLACIER SNOWMEN, the land's own live art tinted icy blue and named so on their plates; back in the first stage a snowman is still white and a Snowman */
  wheelmonsters: () => import('./mp-wheelmonsters.mjs'), /* v2.3.2978: the Wheel's own zone 'wheel' -- every element zone's monsters at the inner end of its spoke, skinned as at home, their art loaded on the way in, none drawn from Brotown's square (far off screen), a fire goblin fought and killed for XP, none held back in town, its art let go */
  wheelhome: () => import('./mp-wheelhome.mjs'), /* v2.3.2990: the Wheel is the world -- a new character starts in its Brotown without walking a step, an unarmed one stays on the safe commons until the Wheel's Mayor Bro arms them, dying brings you back there, the marker still leads to today's town, ?trial=off is the old World View; v2.3.2992: the minimap's gold road leads the way, nothing on the ground */
  wheelwater: () => import('./mp-wheelwater.mjs'), /* v2.3.2984: the owner's water pictures in the Wheel -- both fetched, a coast drawn as sand, the shallows' turquoise shelf and the deep sea from the pictures, the river by the Mill Bridge from the shallows' picture until fresh water is made */
  wheellife: () => import('./mp-wheellife.mjs'), /* v2.3.2983: the buildings' life -- smoke, lamps, sparks and glints drawn in code over each building near you, cheap, moved with it by the depth pass, none with ?nolife */
  bigtown: () => import('./mp-bigtown.mjs'), /* v2.3.2982: the big-town preview (?trial=wheel&bigtown) -- the town laid for buildings twice the size, drawn so, 13 of 17, Mayor Bro beside the bigger Town Hall, the Hotel's bigger porch stopping your feet, pictures of the square and the streets */
  wheelobjects: () => import('./mp-wheelobjects.mjs'), /* v2.3.2975: the Wheel's objects -- placed and the arrival's sheets loaded on the way in, the town standing round you, Mayor Bro beside the Town Hall's steps answering a tap, a building stopping your feet at its porch and drawn over you from behind, Frost Ridge's own trees out there with the town's sheets let go, everything let go back in town */
  wheelnet: () => import('./mp-wheelnet.mjs'), /* v2.3.2959: the Wheel on a slow, unreliable connection -- every ground picture late, one never coming, one failing once: the way in lifts, the ground keeps coming on the walk, pieces short a picture are laid without it and laid again, failed downloads tried again, pictures at a keepable ?v= address */
  wheelsteps: () => import('./mp-wheelsteps.mjs'), /* v2.3.2967: each ground its own footstep -- dirt in town, the Wheel's ten clips decoded on the way in and every step window whole in Chromium's decoder, each foot plant the sound of the ground drawn under it (square, commons grass, Frost Ridge snow), dirt again at home and the clips let go */
  wheelmap: () => import('./mp-wheelmap.mjs'), /* v2.3.2966: the Wheel's own minimap (bigger, the land, its roads, where you are in words) and the labelled world map a tap on it opens -- lands, stages, camps and passes as you zoom, drag, back to you, close; today's minimap back in town */
  wheeltrial: () => import('./mp-wheeltrial.mjs'), /* v2.3.2943: ?trial=wheel -- the World View as the Wheel at full size, its ground laid on the device from the Ground Studio's own swatches by a worker; a swatch planted in the studio's storage is under your feet, the sea stops you, pieces laid ahead and freed behind, the worker stopped after you leave */
  worldtrial: () => import('./mp-worldtrial.mjs'), /* v2.3.2932: ?trial=world -- the World View as the whole island at full size, streamed in pieces; the way in timed, memory bounded across a walk, the worker following, sea and river solid, every piece freed on the way out */
  devarmor: () => import('./mp-devarmor.mjs'), /* v2.3.2875: the admin kit hands out the copper and iron armour sets, into the right bags, wearable */
  monstertrim: () => import('./mp-monstertrim.mjs'), /* v2.3.2870: monster strips load cropped -- byte-identical, drawn, freed on the way out, loadable again */
  sheen: () => import('./mp-sheen.mjs'), /* v2.3.2864: a permanent soft shine on metal -- on every frame, copper stays copper, the jogging full-set knight too; pictures and its cost.  v2.3.2887: on by default, ?sheen=0 turns it off */
  sheenall: () => import('./mp-sheenall.mjs'), /* v2.3.2887: the shine on EVERY armour animation, yours and another player's, in steel, iron, copper and a mixed set -- found by the art file each sprite draws, checked on every frame */
  figureseam: () => import('./mp-figureseam.mjs'), /* v2.3.2922: the armour's collar holds its place on the neck while the camera slides -- a figure's stacked sprites are no longer snapped to the pixel one by one (the NE/NW jog flicker); ?figround=1 shows the old jump */
  peerattackink: () => import('./mp-peerattackink.mjs'), /* v2.3.2863: another player's swing and bow shot wear their drawings -- both sides, the back from behind, and the bow no longer borrows the sword's frames */
  animparity: () => import('./mp-animparity.mjs'), /* v2.3.2921: a peer's sword swing and bow shot are drawn the size, and on the boots, its owner sees -- every facing, several frames */
  poseskin: () => import('./mp-poseskin.mjs'), /* v2.3.2861: hit, mining and dodge wear the walking skin on a player who never picked one -- body and the head drawn over armour, baked before the first hit */
  headink: () => import('./mp-headink.mjs'), /* v2.3.2862: the face tattoo stays on under the head overlays -- pickup, a hit or mining in armour, the full-steel knight, both sides and the back of the head, and a watcher's view */
  townscenery: () => import('./mp-townscenery.mjs'), /* v2.3.2859: town's NPCs + buildings load and free with town, and town is never seen without them */
  harvestink: () => import('./mp-harvestink.mjs'), /* v2.3.2854: tattoos stay on while fishing -- on both screens, the rod untouched, and a pink chest tattoo never lifted over the shirt */
  chopink: () => import('./mp-chopink.mjs'), /* v2.3.2855: ...and while chopping -- your lumberjack and a watcher's view of it, both sides of the tree, the axe untouched, the whole figure in your skin */
  gatherposes: () => import('./mp-gatherposes.mjs'), /* v2.3.3077: the gathering poses made the first time each can be wanted, not on the loading screen -- on a phone in the Wheel none of the three on arrival; the lumberjack made walking up to a tree with the axe, before the tap, and drawn with the body put away; the fire-lighter asked for by a log in the bag and, held back by a slow download, a fire lit before he is made showing the walking body (never an empty spot, never both), the next fire drawing him; the cook made by the fire it lit and drawn at a tap; what the three hold made (the loading screen's saving) */
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
  peerprints: () => import('./mp-peerprints.mjs'), /* v2.3.2918: another player's walk through the snow leaves the trail their own screen lays -- from where the walk began, along the same line, spaced by the same rule; a roll with a direction held lays prints on both screens, one with nothing held on neither */
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
  arrowwound: () => import('./mp-arrowwound.mjs'), /* v2.3.2929b: arrow hit sites -- the monster's own art, a torn hole and a fine keyline; a close picture per material */
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
  gatherhits: () => import('./mp-gatherhits.mjs'), /* v2.3.2956: mining, chopping and fishing as worker-rolled HITS on the node's HP bar -- exact plan, numbers on the blow, window on the last hit, paid -- plus the three ways back to the timer (no answer, old client, kill switch) */
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
  pathstyle: () => import('./mp-pathstyle.mjs'), /* v2.3.2141: the quest path can be turned off, and it has a shape; v2.3.2896: + the on/off switch in the Quests panel; v2.3.2992: all of it with ?questpath, the ground road put away -- and without it, nothing on the ground, the minimap's gold road to the Mayor, neither control shown */
  wvglass: () => import('./mp-wvglass.mjs'), /* v2.3.2141: the World View figure is small again, and the glass is centred on him */
  inkreset: () => import('./mp-inkreset.mjs'), /* v2.3.2114: do Reset and Randomize clear the tattoos — all four of them? */
  rollbake: () => import('./mp-rollbake.mjs'), /* v2.3.2083: is the dodge roll baked before you roll? */
  inkplace: () => import('./mp-inkplace.mjs'), /* v2.3.2082: does a tattoo stay in the same place while you move? */
  townforge: () => import('./mp-townforge.mjs'), /* v2.3.2077: forging in town reaches the worker */
  townmeal: () => import('./mp-townmeal.mjs'), /* v2.3.2077: eating + cooking in town reach the worker */
  plazaplate: () => import('./mp-plazaplate.mjs'), /* v2.3.2071: a plate on every townsperson, benches facing the water */
  polish: () => import('./mp-polish.mjs'), /* v2.3.2820: demo-audit polish -- feedback that arrives, volume sliders, live mute, party chip, daily toast, About page */
  smelt: () => import('./mp-smelt.mjs'), /* v2.3.2822: ore into bars at the blacksmith */
  armorforge: () => import('./mp-armorforge.mjs'), /* v2.3.3092: bars into armor at the blacksmith -- the Armor tab beside Forge (copper's two pieces to make, iron's locked "Smithing 5", each row its bars, what it stops and its XP), a Copper Torso forged from five bars into the bag with the worker's id, metal and grade ("BAG: Copper Torso", +1000 Smithing XP), the greaves from three, Forge off at 0/5, the new bars' pictures */
  smithy: () => import('./mp-smithy.mjs'), /* v2.3.2826: the Blacksmith rebuilt + the smith at work */
  whirlwind: () => import('./mp-whirlwind.mjs'), /* v2.3.2824: the aimable windup ring (1s since v2.3.2928) */
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
  meals: () => import('./mp-meals.mjs'), /* v2.3.3105: the Cookhouse cooks into the bag; eat a meal, drink a brew beside it; Diego's two staples */
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
  questroad: () => import('./mp-questroad.mjs'), /* v2.3.2121: the gold road on the ground + the first-join welcome; v2.3.2992: the road with ?questpath (put away), the welcome naming the map */
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
  pointsglow: () => import('./mp-pointsglow.mjs'), /* v2.3.3004: points waiting make the Character tab and the Points tab glow -- none on a new bro, a real level-up lights the Character tab and its light flashes, a real tap still opens the sheet, the Points tab (only) glows there and stays lit while points wait, sideways too, reduced motion lit and still, and spending every point through prog3_allocate puts both out with the count */
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
  bladesoft: () => import('./mp-bladesoft.mjs'), /* v2.3.2927: the held blade at the body's resolution -- soft bake by default, ?bladesoft=0 sharp; pictures of both */
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
  peerblock: () => import('./mp-peerblock.mjs'), /* v2.3.2920: another player's block and Shield Bash look as they do on their own screen -- the pose, the shield in the hand (or behind them facing away), the weapon in the other hand, nothing slung; no sword swing for a bash */
  peersword: () => import('./mp-peersword.mjs'), /* v2.3.1791: peers carry the sword the way you do */
  entitydt: () => import('./mp-entitydt.mjs'), /* v2.3.1771: monsters, NPCs + remotes move per second too */
  coppergear: () => import('./mp-coppergear.mjs'), /* v2.3.1772: every worn copper combo, in every pose */
  greaveslegs: () => import('./mp-greaveslegs.mjs'), /* v2.3.3010: under greaves alone the body's plain trousers and shoes are gone below the waist band (the owner's east jog: hundreds of px a frame before), the arms all kept, every other facing running and standing no worse, and the full set untouched */
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
  rollweapon: () => import('./mp-rollweapon.mjs'), /* v2.3.2925: no weapon in a roll -- hidden while the tumble plays, yours and a watcher's view, back after */
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
