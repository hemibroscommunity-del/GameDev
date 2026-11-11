# The old map's phone tests, deleted (v2.3.4674)

The owner, 2026-11-11: *"You can also delete the old unused code (old map etc)"*, and, asked what
should happen to the phone tests that still played the retired old map: **"Delete, keep a list"**.

These **397 scenarios** (396 files, about 106,000 lines) were frozen on 2026-10-21 as written for the
old map (`tools/qa/mp/oldMap.mjs`, TRAPS §244). Every one opened its players with `trial=off`: the
old town, the old World View and the old lands, a map no player sees. None of them ran on a pull
request (the two that do, `playable` and `memory-budget`, play the world).

Below is what each one checked, in its own note from `run.mjs`. The feature may still be in the game
and still worth a test; this list is where to look. **To bring one back**, find the commit that
deleted its file (`git log --diff-filter=D --format=%h -1 -- tools/qa/mp/<file>`), print the file
as it was just before (`git show <that commit>^:tools/qa/mp/<file>`), and rebuild it on the world:
`world: 'wheel'` on every `H.newPlayer` / `H.joinPair`, and its line back in `run.mjs`'s
`SCENARIOS`. (The soak's probe lives on in `tools/qa/mp/soakProbe.mjs`: `mp-longplay` and
`mp-heapdiff` use it.)

| Scenario | File | What it checked |
|---|---|---|
| `a2hs` | `mp-a2hs.mjs` | v2.3.2159: the install instruction finds the right player |
| `ability` | `mp-ability.mjs` | v2.3.1733: the stamina abilities reach the worker (v2.3.2662: no milestone gate -- the ladder is gone) |
| `abilslot` | `mp-abilslot.mjs` | v2.3.2327: bash moves down-left of the disc; whirl is the sword's |
| `afk` | `mp-afk.mjs` | v2.3.1913: idle characters log out after 2 min |
| `ahshot` | `mp-ahshot.mjs` | v2.3.2626: pictures of the Auction House art on the plaza, four viewports |
| `aimpath` | `mp-aimpath.mjs` | v2.3.2260: bow and magic fly where you point, not along an axis |
| `ambient` | `mp-ambient.mjs` | v2.3.2762: the maps' ambient life -- the worldview's five features and the four spokes, counted and photographed |
| `animparity` | `mp-animparity.mjs` | v2.3.2921: a peer's sword swing and bow shot are drawn the size, and on the boots, its owner sees -- every facing, several frames |
| `armcapsule` | `mp-armcapsule.mjs` | v2.3.3520: the armour rides the east jog's arm capsule -- a copper torso alone, copper with iron greaves, black steel with copper greaves: the capsule lays the plate back over its own arm (next to no pixel changes; without the armour's clones hundreds, bare skin over the plate); a full iron set j... |
| `armorforge` | `mp-armorforge.mjs` | v2.3.3092: bars into armor at the blacksmith -- the Armor tab beside Forge (copper's two pieces to make, iron's locked "Smithing 5", each row its bars, what it stops and its XP), a Copper Torso forged from five bars into the bag with the worker's id, metal and grade ("BAG: Copper Torso", +1000 Sm... |
| `armorloss` | `mp-armorloss.mjs` | v2.3.2122: where a dropped chest piece goes, and whether it comes back |
| `arrowblast` | `mp-arrowblast.mjs` | v2.3.2279: the bow special's blast finale, end to end; v2.3.2848: run behind the bowvolley kill switch, where it still exists |
| `arrowdt` | `mp-arrowdt.mjs` | v2.3.1770: arrows fly at a speed |
| `arrowhead` | `mp-arrowhead.mjs` | v2.3.1879: only an ARRIVED arrow loses its head |
| `arrowshot` | `mp-arrowshot.mjs` | v2.3.2253: what the target arrows look like, yellow and red |
| `arrowsnap` | `mp-arrowsnap.mjs` | v2.3.2731: one arrow in eight snaps on what it hits -- same damage, a different picture |
| `arrowwound` | `mp-arrowwound.mjs` | v2.3.2929b: arrow hit sites -- the monster's own art, a torn hole and a fine keyline; a close picture per material |
| `arules` | `mp-arules.mjs` | v2.3.2516: the sprite-art RULE fixes -- cape on the roll and the loot bend, and the cape the south block used to lose |
| `authority` | `mp-authority.mjs` | v2.3.1702: ability spends, firemaking + local-AI HP |
| `backprev` | `mp-backprev.mjs` | v2.3.2467: the pedestal preview turns round and so do the drawings |
| `backshield` | `mp-backshield.mjs` | v2.3.1782: the slung shield, and the z-order that killed it |
| `bandsummary` | `mp-bandsummary.mjs` | v2.3.1848: the band's compact summary |
| `basicwindup` | `mp-basicwindup.mjs` | v2.3.2215: every monster tells you before it hits |
| `bigtown` | `mp-bigtown.mjs` | v2.3.2982: the big-town preview (?trial=wheel&bigtown) -- the town laid for buildings twice the size, drawn so, 13 of 17, Mayor Bro beside the bigger Town Hall, the Hotel's bigger porch stopping your feet, pictures of the square and the streets |
| `blacksmith` | `mp-blacksmith.mjs` | v2.3.1773: the smith at the fountain |
| `bladesoft` | `mp-bladesoft.mjs` | v2.3.2927: the held blade at the body's resolution -- soft bake by default, ?bladesoft=0 sharp; pictures of both |
| `block` | `mp-block.mjs` | v2.3.1705: the shield is directional, and the cone is the hitbox |
| `blockarm` | `mp-blockarm.mjs` | v2.3.1789: the raised shield is held by an arm |
| `blockstance` | `mp-blockstance.mjs` | v2.3.1798: shield size, planted stance, caret |
| `blockweapon` | `mp-blockweapon.mjs` | v2.3.1864: the equipped weapon rides in the block's off hand |
| `bodyink` | `mp-bodyink.mjs` | v2.3.1965: ink lands where the finger was, at any zoom |
| `bodysize` | `mp-bodysize.mjs` | v2.3.1826: the same character in every direction |
| `bootstall` | `mp-bootstall.mjs` | v2.3.1921: a worker that never answers must not strand the login door |
| `botflags` | `mp-botflags.mjs` | v2.3.3323: bot flags in that panel -- the anti-bot review's fix 9 |
| `bowedge` | `mp-bowedge.mjs` | v2.3.3489: an arrow comes down where the aiming line says -- in frost on a phone with a real bow held: by the map's east edge (the camera stopped), the bow inside the band the old rule dropped arrows in at once, a snowman 150 px south along the edge is the gate's and takes the arrows; a snowman o... |
| `bowgate` | `mp-bowgate.mjs` | v2.3.2543: the bow's fire gate tests the ray the player is SHOWN -- measured after the player walks, which is when the two used to drift apart |
| `bowmark` | `mp-bowmark.mjs` | v2.3.2234: a REAL bow shot, and the mark on its number |
| `bowshield` | `mp-bowshield.mjs` | v2.3.2542: a bow HAS a shield button (D8), and the right control's double tap is bound to nothing -- neither the weapon swap nor the retired guard |
| `bowside` | `mp-bowside.mjs` | v2.3.2325: the idle bow mirrors when the body does (SE is a mirrored SW) |
| `bowvolley` | `mp-bowvolley.mjs` | v2.3.2848: the bow special as three white-hot arrows on a real worker -- three part:3 sends, one shove, all three settled, one burn, no blast |
| `brobadge` | `mp-brobadge.mjs` | v2.3.2345: the verified-Bro badge has art in it -- Texture.from is a lookup, so the icon rides the manifest |
| `btnlayout` | `mp-btnlayout.mjs` | v2.3.2254: no combat button hides under the dashboard |
| `btnmove` | `shot-btnmove.mjs` | v2.3.2574: the combat-button layout, measured and photographed before/after -- prints a gap table, asserts nothing |
| `btnskin` | `mp-btnskin.mjs` | v2.3.3018: the touch controls in the owner's mockup's look -- every control a gold-ringed button with a picture and no word (the attack disc's label still says ATTACK in the DOM), the movement stick a dark well with four arrows, no CSS filter anywhere; the fight's hot disc see-through with the sw... |
| `build` | `mp-build.mjs` | v2.3.1953: height x frame — the shape, the boots, the plate, and the wire |
| `burst` | `mp-burst.mjs` | (no note) |
| `burstdmg` | `mp-burstdmg.mjs` | v2.3.2235: the slime blast floats a damage number on YOU |
| `campfire` | `mp-campfire.mjs` | v2.3.2846: the lit-log campfire in pixel art -- the strike stands on the ground, the fire is lit at your boots, burns (sparks, smoke, charring logs), sorts around you, still cooks on a tap, dies down to embers |
| `campfirelife` | `mp-campfirelife.mjs` | v2.3.2917: a cooking peer's fire stays lit on the watcher's screen as long as it does on theirs, and goes out on the same schedule |
| `cape` | `mp-cape.mjs` | (no note) |
| `capeattack` | `mp-capeattack.mjs` | v2.3.2190: the cape stays on while you attack, anchored on the head |
| `capehair` | `mp-capehair.mjs` | v2.3.2186 |
| `capekill` | `mp-capekill.mjs` | v2.3.2100: does a real KILL roll for the ticket? |
| `cardreach` | `mp-cardreach.mjs` | v2.3.2078: the inspect card's buttons on a phone |
| `ccbuttons` | `mp-ccbuttons.mjs` | v2.3.2151: the name label + the two action buttons |
| `ccfeet` | `mp-ccfeet.mjs` | v2.3.2378: the lion backplate does not cover his boots, on the phone-with-toolbars viewport |
| `ccjoin` | `mp-ccjoin.mjs` | v2.3.2388: the join button explains its refusal; the diamond rail is gone |
| `cckb` | `mp-cckb.mjs` | v2.3.2391: the iOS keyboard no longer shoves the creator |
| `ccload` | `mp-ccload.mjs` | v2.3.1818: the creator opens with a character, and no keyboard |
| `ccshades` | `mp-ccshades.mjs` | v2.3.2390: the Thug Life south frame does not bow upward at the temples |
| `ccspin` | `mp-ccspin.mjs` | v2.3.2391: the drag-to-spin cue, and that it does not eat the drag |
| `ccstand` | `mp-ccstand.mjs` | v2.3.2151: the bro stands mid-pedestal |
| `charlock` | `mp-charlock.mjs` | v2.3.1814: permanent name+look, and the login door in front of the creator |
| `chat` | `mp-chat.mjs` | (no note) |
| `chatcompose` | `mp-chatcompose.mjs` | v2.3.2039: selection, the dictation wait, and seeing your message |
| `chatfeed` | `mp-chatfeed.mjs` | v2.3.1980: players-online count + the world chat feed |
| `chatfont` | `mp-chatfont.mjs` | v2.3.1912: the chat font, measured on the glass |
| `chatjoy` | `mp-chatjoy.mjs` | v2.3.2123: the world chat sitting on the joystick |
| `chatlanes` | `mp-chatlanes.mjs` | v2.3.2136: @area / @user across two real clients |
| `chatlayer` | `mp-chatlayer.mjs` | v2.3.2276: chat paints under the menus, and its composer stands down for them |
| `chatpicker` | `mp-chatpicker.mjs` | v2.3.2139: pick a lane without a slash command |
| `chopink` | `mp-chopink.mjs` | v2.3.2855: ...and while chopping -- your lumberjack and a watcher's view of it, both sides of the tree, the axe untouched, the whole figure in your skin |
| `chopyield` | `mp-chopyield.mjs` | v2.3.2273: a finished harvest actually pays -- the one step mp-harvest stops short of |
| `clan` | `mp-clan.mjs` | (no note) |
| `coachearly` | `mp-coachearly.mjs` | v2.3.2130: is anything taught in the first minute? |
| `codexfit` | `mp-codexfit.mjs` | v2.3.3215: the codex on the short sheet -- its own button on the dashboard's row, every button on the screen and none overlapping; how much of the monster list and of each tab of a monster's page shows without scrolling, and how far each scrolls; numbers in out/codexfit.json |
| `contblack` | `mp-contblack.mjs` | v2.3.1865: "continue my character" -> black screen; measures the SCREEN on all three roads back in |
| `cookink` | `mp-cookink.mjs` | v2.3.2856: ...and while cooking -- on a layer of their own over the shared cook, on both screens, never on a plain player's cook, the fish and pan untouched, the fingers in your skin |
| `cookpeer` | `mp-cookpeer.mjs` | v2.3.2303: ...and do they wear their clothes while cooking and chopping? |
| `cooktap` | `mp-cooktap.mjs` | v2.3.2274: a REAL tap on your own fire cooks, and does not open chat |
| `copperfeet` | `mp-copperfeet.mjs` | v2.3.2519: the body's boot showing past the leg armour on a jog east |
| `coppergear` | `mp-coppergear.mjs` | v2.3.1772: every worn copper combo, in every pose |
| `cosmpose` | `mp-cosmpose.mjs` | v2.3.2041: do tattoos + clothing patterns survive every activity, on both screens? |
| `cosmrelay` | `mp-cosmrelay.mjs` | v2.3.1961: a peer's look after the join frame — the self-heal, and a cosmetic changed mid-session |
| `critpreview` | `mp-critpreview.mjs` | v2.3.2213: crit vs normal on demand, no playthrough |
| `crowd` | `mp-crowd.mjs` | v2.3.1973: what a crowd in one zone costs the PHONE (BT_CROWD=n) |
| `crowdsoak` | `mp-crowdsoak.mjs` | v2.3.2122: the demo's load — peers + zone changes — which mp-soak does not drive |
| `ctltut` | `mp-ctltut.mjs` | v2.3.1803: no tour step goes missing |
| `cueshow` | `mp-cueshow.mjs` | v2.3.2760: mining, chopping and fishing through the new cue gesture in a real zone -- wind-up, frozen at ready, gesture + effects, resource -- with screenshots |
| `dashhit` | `mp-dashhit.mjs` | v2.3.2261: does the lunge hurt a SERVER-driven monster? |
| `dashreal` | `mp-dashreal.mjs` | v2.3.2418: a REAL finger on the disc, with the lock left to the game itself |
| `dashroll` | `mp-dashroll.mjs` | v2.3.2463: the lunge tumbles instead of gliding |
| `deaddoor` | `mp-deaddoor.mjs` | v2.3.2135: the depth door that cannot open |
| `deathcut` | `mp-deathcut.mjs` | v2.3.2913: monsters die sliced, beheaded, legless or the normal way -- pieces fall and settle, then go |
| `deathgold` | `mp-deathgold.mjs` | v2.3.2343: dying charges no gold, and the HUD agrees with the worker |
| `deathshield` | `mp-deathshield.mjs` | (no note) |
| `deathstrip` | `mp-deathstrip.mjs` | v2.3.2281: what is painted ON the corpse, from the screen's side rather than the display's |
| `deathtex` | `mp-deathtex.mjs` | v2.3.2328: dying releases the zone's art, like walking out does |
| `designs` | `mp-designs.mjs` | v2.3.2436: the ready-made design gallery, and what picking one puts on the character |
| `deskplace` | `mp-deskplace.mjs` | v2.3.3470: on a computer what is drawn over the game is placed where the game is -- the "Tap OPEN" ring round the OPEN button inside the column (it was the column's left edge too far right, cut off), a click at its middle reaching it, its card over it; a real click answering it; the gear lesson's... |
| `desktopbox` | `mp-desktopbox.mjs` | v2.3.1768: desktop is the same view, blown up — sits by `viewport` (its phone-side counterpart) rather than at the top of the list, so it does not collide with the frame-rate PRs' registry lines |
| `devarmor` | `mp-devarmor.mjs` | v2.3.2875: the admin kit hands out the copper and iron armour sets, into the right bags, wearable |
| `devflags` | `mp-devflags.mjs` | v2.3.2412: live flags in that panel -- the operator surface that needed a computer |
| `devicelock` | `mp-devicelock.mjs` | v2.3.3344: a character's key works on the devices it is played on -- made on its phone and playing; its key on a new phone: its row tapped, "This character is played on another device" with its code over the whole screen, one socket, the key kept, the phone at home still playing; the owner's pass... |
| `devpanel` | `mp-devpanel.mjs` | v2.3.2240: the owner's test panel |
| `devstall` | `mp-devstall.mjs` | v2.3.2440: the panel answers even when the admin surface never does -- and names an off capability with no key at all |
| `devwarp` | `mp-devwarp.mjs` | v2.3.2308: the test panel's zone chips, pressed for real, from anywhere |
| `dice` | `mp-dice.mjs` | v2.3.3393: /roll and /flip rolled by the worker -- "/roll" typed in the chat box asks once, both phones show the same "🎲 rolled N (1-100)" in the roller's name and the number over his head, "/roll" itself is not posted; a second inside 5 s is held with words; /flip heads or tails and /roll 20 the... |
| `dmgicon` | `mp-dmgicon.mjs` | v2.3.2232: the damage number names the weapon that dealt it |
| `dodgetime` | `mp-dodgetime.mjs` | v2.3.2916: a peer's roll plays over THEIR window (250-700 ms), frame for frame with their own screen, and ends when theirs does |
| `dodgetrail` | `mp-dodgetrail.mjs` | v2.3.2078: your own dodge leaves a trail too |
| `drillback` | `mp-drillback.mjs` | v2.3.1922: the drill back-chip is not under the gold, and is paid for once |
| `drinkcrash` | `mp-drinkcrash.mjs` | v2.3.2151: drinking must not take the app down |
| `drops` | `mp-drops.mjs` | v2.3.1924: iron pieces to the bag, the gem to the glass |
| `duel` | `mp-duel.mjs` | (no note) |
| `duelblock` | `mp-duelblock.mjs` | v2.3.2145: is there a block button in a duel? |
| `duelfeel` | `mp-duelfeel.mjs` | v2.3.1918: play-test — TTK, blocking, weapon switching |
| `dunedepth` | `mp-dunedepth.mjs` | v2.3.2745: Wind Dunes perspective depth preview — smaller and slower going north |
| `dunes` | `mp-dunes.mjs` | v2.3.2122: the Wind Dunes arrival you cannot walk out of |
| `emotemoves` | `mp-emotemoves.mjs` | v2.3.3392: your bro moves -- the picker's Moves tab (twelve tiles), a real finger's Wave sends one relay, tilts the bro about his feet with his name plate held exactly still, the other phone draws it; Sit sends one pose the worker keeps (po), drawn 70% tall on both phones for as long as he sits,... |
| `emotes` | `mp-emotes.mjs` | v2.3.3391: emotes you can see -- the chat box's smiley opens the picker (a real finger), one tap sends ONE emote (TRAPS §131), the emoji pops over your head ~30 CSS px above the band and over yours on the other phone, gone when its 2.6 s are up; a quick line is your bubble; an unlisted relay draw... |
| `engage` | `mp-engage.mjs` | v2.3.2246: engaged movement is target-relative, and the attack indicator is painted |
| `entitydt` | `mp-entitydt.mjs` | v2.3.1771: monsters, NPCs + remotes move per second too |
| `equipstale` | `mp-equipstale.mjs` | v2.3.2341: Equip from a popup that outlived its bag must reach the worker or do nothing |
| `exitmark` | `mp-exitmark.mjs` | v2.3.2605: can you see the way out of a spoke -- measured against sand AND snow, at four viewports |
| `eyestyle` | `mp-eyestyle.mjs` | v2.3.2643: the Eyes tab picks a shape AND a colour, the styles land on the eye line, and glasses go over them |
| `facebow` | `mp-facebow.mjs` | v2.3.2516: the face tattoo reaches the jaw on a moving bow shot |
| `facetat` | `mp-facetat.mjs` | v2.3.1991: does the face tattoo survive the run? |
| `facingside` | `mp-facingside.mjs` | v2.3.2042: a face tattoo does not revolve to the back of a head |
| `fakenum` | `mp-fakenum.mjs` | v2.3.2350-2352: the client stops billing damage the worker never dealt |
| `farm` | `mp-farm.mjs` | v2.3.3127 + v2.3.3136: the Feed & Seed on a phone -- Enter opens it on its Seeds tab, no beds or tools in it any more (they are worked on your farm: mp-farmwalk), Visit Your Farm at the top and a line saying how your beds are doing; the Seeds tab sells carrot seeds and compost for the worker's co... |
| `feel` | `mp-feel.mjs` | v2.3.2200: contact-synced hits, universal recoil, ground marks |
| `fightfood` | `mp-fightfood.mjs` | v2.3.3133: in a duel the worker puts the brew on (nb:1), a special swing says so, one bite at a time |
| `fightsoak` | `mp-fightsoak.mjs` | v2.3.2124: a long soak against the WORKER's monsters — the path mp-soak never drives |
| `figscale` | `mp-figscale.mjs` | v2.3.2123: is the character smaller outside town? |
| `figureseam` | `mp-figureseam.mjs` | v2.3.2922: the armour's collar holds its place on the neck while the camera slides -- a figure's stacked sprites are no longer snapped to the pixel one by one (the NE/NW jog flicker); ?figround=1 shows the old jump |
| `fireink` | `mp-fireink.mjs` | v2.3.2858: ...and while lighting a fire -- the same layer over the shared fire-lighter, own screen and a watcher's, nothing on the flame, the fist cupped at it in your skin |
| `firepeer` | `mp-firepeer.mjs` | v2.3.2146: is the peer DRAWN while lighting a fire? |
| `firetrail` | `mp-firetrail.mjs` | v2.3.2238: the fire goblin's burning ground, drawn and felt |
| `fishhand` | `mp-fishhand.mjs` | v2.3.1914: the reeling hand over the shirt |
| `formshade` | `mp-formshade.mjs` | v2.3.2767: light from above on figures and props -- on/off diff, darker not brighter, stills for a human |
| `fps` | `mp-fps.mjs` | v2.3.1808: frame time, measured |
| `freshbuild` | `mp-freshbuild.mjs` | v2.3.2237: a resumed app takes the new build; a live game is only offered it |
| `freshpoints` | `mp-freshpoints.mjs` | v2.3.1860: a new character has nothing to spend |
| `freshquest` | `mp-freshquest.mjs` | (no note) |
| `friends` | `mp-friends.mjs` | (no note) |
| `gatherhits` | `mp-gatherhits.mjs` | v2.3.2956: mining, chopping and fishing as worker-rolled HITS on the node's HP bar -- exact plan, numbers on the blow, window on the last hit, paid -- plus the three ways back to the timer (no answer, old client, kill switch) |
| `gatherspot` | `mp-gatherspot.mjs` | v2.3.2915: a peer's lumberjack stands at the tree and their cook at the fire, where their own screen draws them |
| `gcue` | `mp-gcue.mjs` | v2.3.2384; v2.3.2760: the character freezes at `ready`, the mini-tool cue sits still and flashes, the gesture drives the swing forward and fills in ~3s |
| `gearown` | `mp-gearown.mjs` | v2.3.1750: armour you have not earned is not offered |
| `gearstash` | `mp-gearstash.mjs` | v2.3.2523: the gear stashes move server-side -- the frame, the stored blob, and no double-adopt on reconnect |
| `geartrim` | `mp-geartrim.mjs` | v2.3.2750 (+ v2.3.2774 combat strips): gear frames cropped to their art -- under a third of the bytes, and every layer still lands exactly on the body, own screen and peer's |
| `goldrail` | `mp-goldrail.mjs` | v2.3.2320: the purse moves to the zone rail and the nav buttons take its room |
| `greaveslegs` | `mp-greaveslegs.mjs` | v2.3.3010: under greaves alone the body's plain trousers and shoes are gone below the waist band (the owner's east jog: hundreds of px a frame before), the arms all kept, every other facing running and standing no worse, and the full set untouched |
| `groundline` | `mp-groundline.mjs` | v2.3.3501: an aimed shot is judged from your feet to its target's -- in frost at its rock ridge on a phone: your boots on the ridge's edge line past its east end, a snowman just inside that end on your side, north of it: the staff's bolts and the bow's arrows reach it (the bolts burst on the ridg... |
| `hairclip` | `mp-hairclip.mjs` | v2.3.1776: the swing clips the hair too |
| `hairmask` | `mp-hairmask.mjs` | v2.3.1993: a hat presses the hair down, it does not shave the head |
| `halloween` | `mp-halloween.mjs` | v2.3.3395: Halloween week -- in season the Moves tab's thirteenth tile is the Zombie Shuffle (twelve out of it); a finger on it, the bro lurches, held, the worker keeps it; a phone out of season still sees him shuffle and his pumpkin; his bubble is pumpkin-coloured on his phone, plain on the othe... |
| `harvest` | `mp-harvest.mjs` | v2.3.1704: extraction_start reaches the worker + the shield ends |
| `harvestink` | `mp-harvestink.mjs` | v2.3.2854: tattoos stay on while fishing -- on both screens, the rod untouched, and a pink chest tattoo never lifted over the shirt |
| `hatrim` | `mp-questui.mjs` | v2.3.1829 |
| `hatrun` | `shot-hatrun.mjs` | v2.3.2896: every hat on the head standing and mid-jog, both sideways directions -- a contact sheet for the eye, asserts only that it could take the pictures |
| `headink` | `mp-headink.mjs` | v2.3.2862: the face tattoo stays on under the head overlays -- pickup, a hit or mining in armour, the full-steel knight, both sides and the back of the head, and a watcher's view |
| `hiscores` | `mp-hiscores.mjs` | v2.3.1671: the per-skill board |
| `hitmat` | `mp-hitmat.mjs` | v2.3.2843: every monster throws its own material (snow, slime, blood + char, ashy dust, bone, stone), shaped by the weapon -- an arrow's jet, a bolt's blast, a blade's sheet -- and the pieces land |
| `hitmatrix` | `mp-hitmatrix.mjs` | v2.3.2435: does EVERY weapon and special register its hits, on a PINNED monster (the control for hitreal) and in a duel |
| `hitreal` | `mp-hitreal.mjs` | v2.3.2435: every weapon and special against the monsters the WORKER owns, moves and settles |
| `hitsweep` | `mp-hitsweep.mjs` | v2.3.2426: how accurate IS ranged hit detection -- measured hit rate vs the real per-frame step |
| `hitvoices` | `mp-hitvoices.mjs` | v2.3.3001: hits sound like what they hit -- every Wheel monster x sword, arrow and bolt plays its material's voice (snow, goo, ember, stone, bone, wet, mud) at the weapon's level, the snowman one hit not two; a teammate's blow and your own Shield Bash heard quieter, never twice, never across the... |
| `hotarrow` | `mp-hotarrow.mjs` | v2.3.2847: the bow special is the pine arrow white-hot -- glowing, animated, sparking in flight; smouldering and flaring on its ticks once stuck; the painted sheet never downloaded; the hit capsule unchanged; a peer sees it too |
| `hpbar` | `mp-hpbar.mjs` | v2.3.1682: the contextual player HP bar |
| `hpscale` | `mp-hpscale.mjs` | v2.3.2572: every HP readout reads the same number |
| `hubspawn` | `mp-hubspawn.mjs` | v2.3.1703: leaving town does not put you back in town |
| `hudface` | `mp-hudface.mjs` | v2.3.1835: the HUD portrait tracks the worn cosmetics |
| `idleface` | `mp-idleface.mjs` | v2.3.1837: idle keeps the last TURN, not the last walk |
| `infopop` | `mp-infopop.mjs` | v2.3.2131: tap a thing, find out what it is |
| `inkback` | `mp-inkback.mjs` | v2.3.2148: the torso's back is its own canvas |
| `inkframes` | `mp-inkframes.mjs` | v2.3.2470: a drawing must not pulse or spill as he runs |
| `inkplace` | `mp-inkplace.mjs` | v2.3.2082: does a tattoo stay in the same place while you move? |
| `inkreach` | `mp-inkreach.mjs` | v2.3.2461: the pants squares ARE the trousers, and the shirt's run further down |
| `inkreset` | `mp-inkreset.mjs` | v2.3.2114: do Reset and Randomize clear the tattoos — all four of them? |
| `introfit` | `mp-introfit.mjs` | v2.3.2199: the loading bar is painted into the film, so the clip must not be cropped |
| `itemcard` | `mp-itemcard.mjs` | v2.3.1845: the item card's art, name and rarity |
| `jetstream` | `mp-jetstream.mjs` | v2.3.2398: the bow's arrows lay the aim line now, and the sight beam they replaced is dark |
| `jogsides` | `mp-jogsides.mjs` | v2.3.2134: east and west are ONE mirrored sheet -- so an east-only bare shoulder is in the renderer, not the art |
| `joinflicker` | `mp-joinflicker.mjs` | v2.3.3520: your bro's layers in the first seconds after coming back in (a reload, straight in): none blinks off and on, none swaps its picture back and forth |
| `joingate` | `mp-joingate.mjs` | v2.3.2439: the world waits for the server -- a dead room, a not-ready room and a dropped socket all hold the player out |
| `joyfade` | `mp-joyfade.mjs` | v2.3.2260: both sticks appear on input and fade after 2s; the right one stays while contextual |
| `keylogin` | `mp-keylogin.mjs` | v2.3.1823: the login door joins you |
| `landdash` | `mp-landscape-dash.mjs` | v2.3.2157: the 48px strip, the side sheet, and playing with menus open |
| `landrotate` | `mp-landscape-rotate.mjs` | v2.3.2157: rotation is a clean handoff both ways |
| `layer` | `mp-layer.mjs` | v2.3.1764: hair order, swing metal, redeem button |
| `lifeskill` | `mp-lifeskill.mjs` | v2.3.1680: tool-gated gathering |
| `lightfx` | `mp-lightfx.mjs` | v2.3.2710: map-lit shadows + metal glint behind ?lightfx=1 -- off costs nothing, the shadow hangs off the feet along the map's light and survives a swing; before/after pictures for the owner |
| `lilbro` | `mp-lilbro.mjs` | v2.3.2064: the second walking NPC |
| `listingdm` | `mp-listingdm.mjs` | v2.3.2621: the chat icon on a listing, and a line typed by one player arriving on the other player's screen |
| `listingoffer` | `mp-listingoffer.mjs` | v2.3.2623: a real gold offer between two players -- escrowed on offer, settled on accept |
| `listweek` | `mp-listweek.mjs` | v2.3.2619: every listing runs a week and NOTHING asks -- the control must not exist |
| `liveness` | `mp-liveness.mjs` | v2.3.2811-2815: trees sway, signs swing, flags wave, the forge smokes, people breathe, and the bag comes alive -- all still under the calm switch |
| `lockaim` | `mp-lockaim.mjs` | v2.3.1979: a locked-on bow shot has to actually hit |
| `lockchip` | `mp-lockchip.mjs` | v2.3.2313: the lock-on chip sits above the sprite, on a snowman and a slime |
| `lockrings` | `mp-lockrings.mjs` | v2.3.2263: how many rings are on the target, and whose they are |
| `loginkey` | `mp-loginkey.mjs` | v2.3.2038: can you get your login key back from inside the game? |
| `logout` | `mp-logout.mjs` | v2.3.1840: log out lands on the login door |
| `lookrestore` | `mp-lookrestore.mjs` | v2.3.2444: your drawings, patterns and eye colour follow you to a new phone |
| `lootbob` | `mp-lootbob.mjs` | v2.3.2329: the snowman's wreck, coin and shard bob + pulse like every other pile |
| `lootcue` | `mp-lootcue.mjs` | v2.3.2545: the pile's last call, the ask that fires when the magnet takes it, and the position that ask is judged against |
| `lootland` | `mp-lootland.mjs` | v2.3.2771: loot piles land with a bounce per item, rarest on top, RARE DROP! + shine |
| `lootmagnet` | `mp-lootmagnet.mjs` | v2.3.2490: the magnet stops PUSHING the pile away, and a drifted pile is re-homed |
| `lootsize` | `mp-lootsize.mjs` | v2.3.2316: ground loot and coins draw at 2x |
| `lootzone` | `mp-lootzone.mjs` | v2.3.2342: a loot pile dropped in Ember does not land on Frost's ground |
| `market` | `mp-market.mjs` | (no note) |
| `marketonly` | `mp-marketonly.mjs` | v2.3.2618: Market is the only button in the vendor building, the shelf matches the mockup, and Shopkeeper Bro still stocks all five staples |
| `material` | `mp-material.mjs` | v2.3.1757: one art set, many metals |
| `minimap` | `mp-minimap.mjs` | v2.3.1781: the corner minimap is pinned to the real world |
| `minishot` | `mp-minishot.mjs` | v2.3.1810: glyph shapes are all distinct |
| `moncue` | `mp-moncue.mjs` | v2.3.2295: the notice "!" and the red plate, against REAL server monsters |
| `monsterplate` | `mp-monsterplate.mjs` | v2.3.1918: monsters get the player's name plate |
| `monstershots` | `mp-monstershots.mjs` | v2.3.2732: slime goo in the thrower's colour, goblin fire, drawn in code |
| `monstertrim` | `mp-monstertrim.mjs` | v2.3.2870: monster strips load cropped -- byte-identical, drawn, freed on the way out, loadable again |
| `monwatch` | `mp-monwatch.mjs` | v2.3.2126: do the worker's monsters come back? |
| `movespeed` | `mp-movespeed.mjs` | v2.3.1769: speed is per second, not per frame |
| `newkey` | `mp-newkey.mjs` | v2.3.3355: new Login Keys made by the worker -- a character an older phone made, played on its own device by this build, is handed eight words (the Account card shows them; the old key kept until the new one gets in); the new key typed at a new phone's door plays with no pass, the old key there i... |
| `nozoom` | `mp-nozoom.mjs` | v2.3.3454: no double-tap zoom -- with the stat window open from the Points screen, no element on the page is touch-action auto, no chain inside the window up to the box that scrolls it carries one, the canvas, html and body keep none and the window's buttons manipulation, and the stepper still steps |
| `npctap` | `mp-npctap.mjs` | v2.3.2305: tapping a character to talk -- and NOT hitting him |
| `offgrid` | `mp-inkoffgrid.mjs` | v2.3.2463: a placed design drags off the edge and is clipped |
| `orbline` | `mp-orbline.mjs` | v2.3.2259: the magic special is one line of three, and bow/staff start at 80% of the melee starter |
| `orbrange` | `mp-orbrange.mjs` | v2.3.2387: a magic orb reaches as far as an arrow (675px, was 340) |
| `originlock` | `mp-originlock.mjs` | v2.3.3312: only the game's own sites open a socket -- a page at localhost plays; a copy at http://clone.example (a second browser finding that name at 127.0.0.1, so the Origin is the browser's own) gets "This isn't the official BroTown" with a button to https://brotown.net and its own address in... |
| `partpool` | `mp-partpool.mjs` | v2.3.2331: the particle field is pooled sprites, not re-tessellated polygons |
| `party` | `mp-party.mjs` | (no note) |
| `partymap` | `mp-partymap.mjs` | v2.3.3277: your party on the minimap and the world map -- a real phone and a bare socket in a party: beside you their mark in the box in the party's blue; 3,000 px east it rides the box's east edge, level with them; the world map at its first zoom draws and names them, its key saying party; leavi... |
| `pathstyle` | `mp-pathstyle.mjs` | v2.3.2141: the quest path can be turned off, and it has a shape; v2.3.2896: + the on/off switch in the Quests panel; v2.3.2992: all of it with ?questpath, the ground road put away -- and without it, nothing on the ground, the minimap's gold road to the Mayor, neither control shown |
| `peerattackink` | `mp-peerattackink.mjs` | v2.3.2863: another player's swing and bow shot wear their drawings -- both sides, the back from behind, and the bow no longer borrows the sword's frames |
| `peerblock` | `mp-peerblock.mjs` | v2.3.2920: another player's block and Shield Bash look as they do on their own screen -- the pose, the shield in the hand (or behind them facing away), the weapon in the other hand, nothing slung; no sword swing for a bash |
| `peercolours` | `mp-peercolours.mjs` | v2.3.3314: another player cooks, lights a fire and chops in THEIR skin, trousers and boots on your screen (it was yours, and the unpainted art for the lumberjack) -- every drawn frame's recoloured pixels read against the shipped strip, their walking body standing in while their figure bakes, the... |
| `peerprints` | `mp-peerprints.mjs` | v2.3.2918: another player's walk through the snow leaves the trail their own screen lays -- from where the walk began, along the same line, spaced by the same rule; a roll with a direction held lays prints on both screens, one with nothing held on neither |
| `peershield` | `mp-peershield.mjs` | v2.3.1790: other bros wear their shield on their back |
| `peersword` | `mp-peersword.mjs` | v2.3.1791: peers carry the sword the way you do |
| `perfdrift` | `mp-perfdrift.mjs` | v2.3.2271: does the frame rate actually drift, and what grows with it |
| `petdraw` | `mp-petdraw.mjs` | v2.3.2078: an active pet is actually drawn |
| `pettrade` | `mp-pettrade.mjs` | v2.3.3122: pets change hands on two phones -- caps.pettrade; the Pets page says which may go (not the one out with you) and offers Sell; the trade window's pet lane lists only those, the buyer sees the offered pet by kind and level, the review screen lists it, both accept and it is the buyer's (s... |
| `pickerrestart` | `mp-pickerrestart.mjs` | v2.3.3138: the picker's restart of the bro this device plays clears the device's copy too -- nothing old comes back on screen or into the record |
| `pine` | `mp-pine.mjs` | v2.3.1763: the first wood tier |
| `plazaplate` | `mp-plazaplate.mjs` | v2.3.2071: a plate on every townsperson, benches facing the water |
| `pointsglow` | `mp-pointsglow.mjs` | v2.3.3004: points waiting make the Character tab and the Points tab glow -- none on a new bro, a real level-up lights the Character tab and its light flashes, a real tap still opens the sheet, the Points tab (only) glows there and stays lit while points wait, sideways too, reduced motion lit and... |
| `polish` | `mp-polish.mjs` | v2.3.2820: demo-audit polish -- feedback that arrives, volume sliders, live mute, party chip, daily toast, About page |
| `portalbeam` | `mp-portalbeam.mjs` | v2.3.2070: the light shaft over a zone exit |
| `poseskin` | `mp-poseskin.mjs` | v2.3.2861: hit, mining and dodge wear the walking skin on a player who never picked one -- body and the head drawn over armour, baked before the first hit |
| `potions` | `mp-potions.mjs` | v2.3.2062: the mana + speed draughts |
| `presence` | `mp-presence.mjs` | (no note) |
| `previewweapon` | `mp-previewweapon.mjs` | v2.3.1914: the preview follows the active weapon |
| `prog3` | `mp-prog3.mjs` | v2.3.1660: trained-skill rebuild |
| `proj` | `mp-proj.mjs` | v2.3.1678: the snowball is visible |
| `projlook` | `mp-projlook.mjs` | v2.3.2919: a peer's arrow is tipped in their element and fades as theirs does; their bolt glows in their element |
| `propdepth` | `mp-propdepth.mjs` | v2.3.2748: in front of a prop or behind it by where your FEET are and where its art meets the ground; props stop your feet from behind; the owner's four screenshots as cases, each checked against the old rule |
| `propfx` | `mp-propfx.mjs` | v2.3.2730: a hit on a prop -- the arrow stands in the rock, the bolt crashes on it, the sword cuts it, and a peer sees all three |
| `propshots` | `mp-propshots.mjs` | v2.3.2699: a snowball and an arrow visibly STOP at a prop, watched on the real frame clock |
| `pvpextras` | `mp-pvpextras.mjs` | v2.3.3264: what a hit does to a monster it does to a player, on three phones -- a wind gem rides the page's own swing claim and slows the target (x0.4, its chip, drawn on every screen), a flame gem's burn ticks drawn as ticks (the flame on the number, no pvp_confirmed a tick), a shield bash dazes... |
| `pvplunge` | `mp-pvplunge.mjs` | v2.3.3262: the sword's opening lunge at a player on two phones -- refused in town with no duel; in a duel from ~300 px it dashes to contact, the worker lands the hit (ability sworddash) and dazes 500 ms; B's phone is dazed for stMs (its walk stopped with a key held, its own lunge refused), A's dr... |
| `pvpnumbers` | `mp-pvpnumbers.mjs` | v2.3.3263: a hit on a player reads as a hit on a monster on three phones -- the striker's number amber with the weapon's mark and the monster branch's figure, the target's red with the heart, an onlooker's the taken red over the target, a block "Blocked!" and its stamina, and a watcher in another... |
| `pvpshield` | `mp-pvpshield.mjs` | v2.3.3260: the shield against a player on two phones -- for the sword, the bow and the staff, no button before the fight and one the moment a player's blow lands; with a monster planted behind, a tap raises the guard facing the ATTACKER; the next blow is blocked by the worker; with the blow forgo... |
| `questbanner` | `mp-questbanner.mjs` | v2.3.1745: QUEST ACCEPTED! / QUEST COMPLETED! over the dialogue |
| `questchain` | `mp-questchain.mjs` | v2.3.1914: proximity turn-in across the whole chain |
| `questclaim` | `mp-questclaim.mjs` | v2.3.1884: the claim opens when it becomes claimable under your feet |
| `questcoach` | `mp-questcoach.mjs` | v2.3.1796: the questline's coach marks |
| `questkill` | `mp-questkill.mjs` | v2.3.1972: the objective EARNED — kill it, and see the drop land |
| `questlegs` | `mp-questlegs.mjs` | v2.3.1701: the quest greaves equip to the LEGS |
| `questloop` | `mp-questloop.mjs` | v2.3.1828: the hand-in must not repeat |
| `questmsg` | `mp-questmsg.mjs` | v2.3.1985: the quest-complete floater has to outlive a glance |
| `questroad` | `mp-questroad.mjs` | v2.3.2121: the gold road on the ground + the first-join welcome; v2.3.2992: the road with ?questpath (put away), the welcome naming the map |
| `queststar` | `mp-queststar.mjs` | v2.3.1906: the star after the objective is done |
| `questui` | `mp-questui.mjs` | v2.3.1681: the world dialogue's art + the offer filter |
| `questwall` | `mp-questwall.mjs` | v2.3.1972: what he offers after the last quest he can be paid for |
| `questwin` | `mp-questwin.mjs` | v2.3.3030: the quest windows in the owner's painted art -- the NEW QUEST window's frame (ten pieces, decoded, no filter) and painted slots; QUEST ACCEPTED! on its banner out of .brotown-wrap; v2.3.3335: the first quest's claim is the AUTO REWARD (no XP, so no window and no chips; the laurel check... |
| `questxp` | `mp-questxp.mjs` | v2.3.2154: the XP chooser's type, and your own plate |
| `rbutton` | `mp-rbutton.mjs` | v2.3.2242: the right control is a button — hold to attack, swipe for special, a shield toggle beneath it |
| `rehearsal` | `mp-rehearsal.mjs` | v2.3.2040: four characters, every interaction, every frame scanned for a black band |
| `remnant` | `mp-remnant.mjs` | v2.3.2233: one monster leaves ONE claimable remnant, not dozens |
| `remoteanim` | `mp-remoteanim.mjs` | v2.3.1749: what the other player sees you doing |
| `reports` | `mp-reports.mjs` | v2.3.3398: chat reports in the owner's Test panel on a phone -- empty says so; a report from the player's card listed by name, online, "Spam · reported by", with the server's copy of what they said; Kick; Freeze in two taps, the row and the worker frozen; Unfreeze; Dismiss; fits the phone |
| `resbars` | `mp-resbars.mjs` | v2.3.1895: mp/energy spend bars |
| `road2` | `mp-road2.mjs` | v2.3.1866: just the Create->Continue pop-up road |
| `rollbake` | `mp-rollbake.mjs` | v2.3.2083: is the dodge roll baked before you roll? |
| `rollweapon` | `mp-rollweapon.mjs` | v2.3.2925: no weapon in a roll -- hidden while the tumble plays, yours and a watcher's view, back after |
| `roomfull` | `mp-roomfull.mjs` | v2.3.1982: the 61st player is told why, waits visibly, and walks in when a seat opens |
| `roster` | `mp-roster.mjs` | v2.3.1923: the device's character list — order, delete, the ten cap |
| `rosterink` | `mp-rosterink.mjs` | v2.3.2690: one character's face tattoo on every saved character -- the picker's faces, a switch seen by a peer, and a new character's blank face |
| `salvage` | `mp-salvage.mjs` | v2.3.3141: salvage at the blacksmith -- four bars a piece (five since v2.3.3525), two back, Sure? before it goes, an essence raising a piece of its metal and coming back when that piece is salvaged, a weapon from the weapon bag |
| `scalesheet` | `mp-scalesheet.mjs` | v2.3.1830: size per direction, both poses |
| `seacover` | `mp-seacover.mjs` | v2.3.3452: the ground under open sea is not drawn -- at the Wind Dunes' first coast on a phone: open-sea pieces hidden while their water covers them whole, one held frame the same to the bit hidden and drawn (and with the quads away the hidden ground leaves holes), the water's live switch shows t... |
| `sellcue` | `mp-sellcue.mjs` | v2.3.2606: a server-settled sale rings the coin sound, a refused one does not, and the sound setting silences it |
| `sellericon` | `mp-sellericon.mjs` | v2.3.2620: the seller icon on a listing, and the player list it was extracted from |
| `sellsheet` | `mp-sellsheet.mjs` | v2.3.2612: why tapping Sell reads as nothing happening -- disabled variant, covered button, or a price sheet below the fold |
| `shapelayer` | `mp-shapelayer.mjs` | v2.3.1967: a placed shape can be picked up again, and layers move in the ART |
| `sharppixels` | `mp-sharppixels.mjs` | v2.3.2770: character sprites sampled sharp -- shader compiles, sprites routed, edge contrast rises |
| `sheen` | `mp-sheen.mjs` | v2.3.2864: a permanent soft shine on metal -- on every frame, copper stays copper, the jogging full-set knight too; pictures and its cost. v2.3.2887: on by default, ?sheen=0 turns it off |
| `sheenall` | `mp-sheenall.mjs` | v2.3.2887: the shine on EVERY armour animation, yours and another player's, in steel, iron, copper and a mixed set -- found by the art file each sprite draws, checked on every frame |
| `sheenbatch` | `mp-sheenbatch.mjs` | v2.3.3453: the ordinary metal shine drawn in the frame, not in a pass a piece -- on a 3x phone in iron plate, greaves and a greatsword: all three in the frame and none filtered, the batcher built behind the loading screen; one held frame drawn in the frame, in a pass a piece and in the frame agai... |
| `shieldbonk` | `mp-shieldbonk.mjs` | v2.3.2700: a shield bonk pops the burrowing snowman up -- the powder and the star ring, as drawn |
| `shirtarm` | `mp-shirtarm.mjs` | v2.3.2066: the tee's TRAILING sleeve while jogging east, measured |
| `shirtjog` | `mp-shirtjog.mjs` | v2.3.2747: the tee's keyline holds on every frame the game draws while running, all eight directions -- the owner's "static" |
| `shirtkeyline` | `mp-shirtkeyline.mjs` | v2.3.1995: the tee's black outlines on the character preview |
| `shotland` | `mp-shotland.mjs` | v2.3.2844: a bolt or an arrow is drawn landing IN the body -- round its centre, spread over its core -- not on the ring its hit test registers on; the hit itself still registers there |
| `sightrock` | `mp-sightrock.mjs` | v2.3.3485: the bow's line is not on a monster behind a rock -- in frost at its snowbank, on a phone with a real bow held: your boots 12 px south of the bank's face and a snowman just north of it on the bow's line, the gate reads the BANK, not the snowman, the drawn line stops at it and the arrows... |
| `skeleton` | `mp-skeleton.mjs` | v2.3.2229: one hit unwraps the mummy, and the skeleton is bigger and faster |
| `skillapps` | `mp-skillapps.mjs` | v2.3.3522: the owner's "Make the lifeskills menu look more like iPhone apps instead of elongated pills": ten 52 px tiles five across in two rows on one screen at 390 and 360, the unseen level-up's dot, a tap to the skill and back, three across sideways |
| `skinink` | `mp-skinink.mjs` | v2.3.1994: the skin editor IS the shirt editor, the zoom stays put, and every skin pixel takes ink |
| `skinworld` | `mp-skinworld.mjs` | v2.3.1994: the widened skin boxes, measured on the character in the world |
| `slimebase` | `mp-slimebase.mjs` | v2.3.1824: the blob's base is the monster's position |
| `slimeburst` | `mp-slimeburst.mjs` | v2.3.2228: the blue slime's death burst plays, at peak size |
| `slimeorb` | `mp-slimeorb.mjs` | v2.3.2310: the blue slime's ball is drawn at the size it is meant to be |
| `slimewave` | `mp-slimewave.mjs` | v2.3.2912: the slime burst draws a shockwave at its real radius, and shakes only the players inside it |
| `smithy` | `mp-smithy.mjs` | v2.3.2826: the Blacksmith rebuilt + the smith at work |
| `snowburrow` | `mp-snowburrow.mjs` | v2.3.2309: the burrowing snowman is still drawn on the second visit to frost |
| `snowman` | `mp-snowman.mjs` | v2.3.2419: does a snowman attack in each of its three bands? |
| `soak` | `mp-soak.mjs` | v2.3.1741: does anything grow while you play |
| `social` | `mp-social.mjs` | (no note) |
| `socialgrief` | `mp-socialgrief.mjs` | v2.3.1970: chat length + forged senders, and the party invites nobody answers |
| `solorate` | `mp-solorate.mjs` | (no note) |
| `solospecial` | `mp-solospecial.mjs` | v2.3.2465: the swipe fires the special alone -- no ordinary shot leading or trailing it -- and the three magic orbs are evenly spaced |
| `southshirt` | `mp-southshirt.mjs` | v2.3.1873: shirt/skin sliver on the jog |
| `southsword` | `mp-southsword.mjs` | v2.3.1839: the south idle blade off his face |
| `spawnfx` | `mp-spawnfx.mjs` | v2.3.1765: the respawn silhouette |
| `specialart` | `mp-specialart.mjs` | v2.3.3336: the owner's special attacks on the Special button -- with the kit's great sword, bow and staff in hand in turn, that weapon's picture, decoded, filling the face inside the game's ring, the star gone; its grey copy cooling down (the blue arc round it) and with no mana; the press's shade... |
| `specshield` | `mp-specshield.mjs` | v2.3.1834: shield layering during a special |
| `spinfeet` | `mp-spinfeet.mjs` | (no note) |
| `staffcast` | `mp-staffcast.mjs` | v2.3.2841: the staff cast -- the crystal charges on the cooldown, the bolt leaves it and rejoins its real line, the staff stands head-up and kicks, a peer sees it |
| `standalone` | `mp-standalone.mjs` | v2.3.2185: the installed web app -- the home-indicator inset every other scenario runs at zero |
| `standinart` | `mp-standinart.mjs` | v2.3.2429: a swing and a raised shield wear your drawings |
| `standinskin` | `mp-standinskin.mjs` | v2.3.1788: attack stand-ins wear the walking skin |
| `statcols` | `mp-statcols.mjs` | v2.3.2382: the point rows go two abreast at 375+, one column below it, nothing clipped |
| `statdemo` | `mp-statdemo.mjs` | v2.3.2230: the stat explainer's scene faces the slime, and the +1 lands on your head |
| `statpeek` | `mp-statpeek.mjs` | v2.3.1766: the allocation tooltip tells the truth |
| `store` | `mp-store.mjs` | v2.3.2476: the auction house -- list from the bag, walk to the door, see it on the shelf |
| `stuckarrow` | `mp-stuckarrow.mjs` | v2.3.2511: one arrow sticks, and it sticks in the body |
| `swingsfx` | `mp-swingsfx.mjs` | v2.3.2450: one whoosh leading the blade, one hit on contact, alternating pitch |
| `swordcarry` | `mp-swordcarry.mjs` | v2.3.1786: the carried blade points up and forward |
| `tapswing` | `mp-tapswing.mjs` | v2.3.2285: tap a monster, walk there -- does the swing ever start? |
| `target` | `mp-target.mjs` | v2.3.2243: the targeting perimeter, the lock that holds, the switch arrows, magic splash = arrow |
| `tattoos` | `mp-tattoos.mjs` | v2.3.1949: face + arm tattoos survive both server gates, end to end |
| `teeshield` | `mp-teeshield.mjs` | v2.3.2516: is the bare jog-east shoulder the shield's arm capsule, or the artist's unsleeved frames? |
| `texdrift` | `mp-texdrift.mjs` | v2.3.2272: does zone art come back when you leave the zone |
| `textfloor` | `mp-textfloor.mjs` | v2.3.2466: the 11px floor, and that nothing got cut off reaching it |
| `toolshelf` | `mp-toolshelf.mjs` | v2.3.3316: a lost tool bought back from Diego -- his shelf shows the axe, rod and pickaxe at their price; the player the quest gave them buys one each, never a second ("You have one"); a player no quest gave one is told so and refused; pictures |
| `townbuildings` | `mp-townbuildings.mjs` | v2.3.1778: the buildings, solid, with doors |
| `townexit` | `mp-townexit.mjs` | v2.3.2078: you spawn clear of the fountain and can leave town |
| `townforge` | `mp-townforge.mjs` | v2.3.2077: forging in town reaches the worker |
| `townhill` | `mp-townhill.mjs` | v2.3.2061: the fountain + the house on the hill |
| `townlock` | `mp-townlock.mjs` | v2.3.1676: unarmed start + town gate |
| `townmap` | `mp-townmap.mjs` | v2.3.1777: the clifftop plateau + its edges |
| `townmeal` | `mp-townmeal.mjs` | v2.3.2077: eating + cooking in town reach the worker |
| `townprops` | `mp-townprops.mjs` | v2.3.1775: anvil, stall, the man at it |
| `townrim` | `mp-townrim.mjs` | v2.3.2896: the rocks round town are a wall -- walked into from seven sides, boots stop on the ground at the edge; the stairs still lead out |
| `townscenery` | `mp-townscenery.mjs` | v2.3.2859: town's NPCs + buildings load and free with town, and town is never seen without them |
| `trade` | `mp-trade.mjs` | (no note) |
| `tradeatk` | `mp-tradeatk.mjs` | v2.3.1971: the trade window attacked — prototype-key offers, coin/item conservation, replayed confirms, a tab that dies mid-handshake |
| `tradetap` | `mp-tradetap.mjs` | v2.3.2145: can you tap the trade window with chat open? |
| `turnshield` | `mp-turnshield.mjs` | v2.3.1836: shield side while turning |
| `tutgrant` | `mp-tutgrant.mjs` | v2.3.1901: the first quest's sword + shield |
| `tutorial` | `mp-tutorial.mjs` | v2.3.1665: the completable arc |
| `tutskip` | `mp-tutskip.mjs` | v2.3.2890: Skip tutorial on the welcome, and no pop-ups after |
| `tutspecial` | `mp-tutspecial.mjs` | v2.3.1838: a REAL special, shield slung not held |
| `uisfx` | `mp-uisfx.mjs` | v2.3.2637: the owner's three sounds decode |
| `uisfx2` | `mp-uisfx2.mjs` | v2.3.2638: the sound actually FIRES |
| `uisfx3` | `mp-uisfx3.mjs` | v2.3.2658: click vs close routing, and no doubles |
| `unequip` | `mp-unequip.mjs` | v2.3.1762: taking armour off |
| `vendorprompt` | `mp-vendorprompt.mjs` | v2.3.2617: the Enter VENDOR prompt must not survive its own tap -- real finger taps at four viewports, asked of elementFromPoint (TRAPS §67) |
| `verify` | `mp-verify.mjs` | v2.3.3275: the account check -- a new character is asked once (the gate, the widget, the verifier), one on file never, a refused token brings the gate back and a good one gets in |
| `weaponloss` | `mp-weaponloss.mjs` | v2.3.2123: does a weapon survive a full stash? |
| `wheellife` | `mp-wheellife.mjs` | v2.3.2983: the buildings' life -- smoke, lamps, sparks and glints drawn in code over each building near you, cheap, moved with it by the depth pass, none with ?nolife |
| `wheelmonsters` | `mp-wheelmonsters.mjs` | v2.3.2978: the Wheel's own zone 'wheel' -- every element zone's monsters at the inner end of its spoke, skinned as at home, their art loaded on the way in, none drawn from Brotown's square (far off screen), a fire goblin fought and killed for XP, none held back in town, its art let go |
| `wheelnet` | `mp-wheelnet.mjs` | v2.3.2959: the Wheel on a slow, unreliable connection -- every ground picture late, one never coming, one failing once: the way in lifts, the ground keeps coming on the walk, pieces short a picture are laid without it and laid again, failed downloads tried again, pictures at a keepable ?v= address |
| `wheelobjects` | `mp-wheelobjects.mjs` | v2.3.2975: the Wheel's objects -- placed and the arrival's sheets loaded on the way in, the town standing round you, Mayor Bro beside the Town Hall's steps answering a tap, a building stopping your feet at its porch and drawn over you from behind, Frost Ridge's own trees out there with the town's... |
| `wheelsteps` | `mp-wheelsteps.mjs` | v2.3.2967: each ground its own footstep -- dirt in town, the Wheel's ten clips decoded on the way in and every step window whole in Chromium's decoder, each foot plant the sound of the ground drawn under it (square, commons grass, Frost Ridge snow), dirt again at home and the clips let go |
| `wheeltrial` | `mp-wheeltrial.mjs` | v2.3.2943: ?trial=wheel -- the World View as the Wheel at full size, its ground laid on the device from the Ground Studio's own swatches by a worker; a swatch planted in the studio's storage is under your feet, the sea stops you, pieces laid ahead and freed behind, the worker stopped after you leave |
| `wheelwater` | `mp-wheelwater.mjs` | v2.3.2984: the owner's water pictures in the Wheel -- both fetched, a coast drawn as sand, the shallows' turquoise shelf and the deep sea from the pictures, the river by the Mill Bridge from the shallows' picture until fresh water is made |
| `wheelwaves` | `mp-wheelwaves.mjs` | v2.3.3019: the Wheel's water moves -- its program built behind the loading screen; at a coast lines of light and glints over the water, surf riding in and the shore's foam lapping, drawn only on the water; two moments differ over the water many times more than with it off; the Sweetwater River's... |
| `whirlwind` | `mp-whirlwind.mjs` | v2.3.2824: the aimable windup ring (1s since v2.3.2928); v2.3.3499: and the marks on the monsters it will catch |
| `windup` | `mp-windup.mjs` | v2.3.1811: the monster tells you |
| `worldchat` | `mp-worldchat.mjs` | v2.3.2037 |
| `worldfx` | `mp-worldfx.mjs` | v2.3.2712: time of day, dust, blood, the crumbling corpse; v2.3.2713: the exploding one |
| `worldshadow` | `mp-worldshadow.mjs` | v2.3.2749: props, trees and every monster on screen cast a shadow in each sunlit zone, and a building's shadow falls on its shaded side; pictures off/on |
| `worldtext` | `mp-worldtext.mjs` | v2.3.2262: the dashboard zoom is a keeper, and in-world text must not shrink with it |
| `worldtrial` | `mp-worldtrial.mjs` | v2.3.2932: ?trial=world -- the World View as the whole island at full size, streamed in pieces; the way in timed, memory bounded across a walk, the worker following, sea and river solid, every piece freed on the way out |
| `worldwalk` | `mp-worldwalk.mjs` | v2.3.2078: the world map's pink lines are walls |
| `wvglass` | `mp-wvglass.mjs` | v2.3.2141: the World View figure is small again, and the glass is centred on him |
| `wvlens` | `mp-wvlens.mjs` | v2.3.2137: the magnifier draws a lens, not a line |
| `wvscale` | `mp-wvscale.mjs` | v2.3.2287: your own art shrinks on the vista, and nothing changes off it |
| `xpfly` | `mp-xpfly.mjs` | v2.3.1874: XP flies from the bro to its skill card |
| `zonebanner` | `mp-zonebanner.mjs` | v2.3.2596: the zone-entry banner plays its nine beats, docks into the top bar, frees its strip on the way out -- and stays silent in the ten zones with no art |
| `zonechurn` | `mp-zonechurn.mjs` | v2.3.1741: does touring zones leak |
| `zonedecor` | `mp-zonedecor.mjs` | v2.3.2651: frost's decor loads per-zone, draws, sorts, and is freed on the way out |
| `zoneflip` | `mp-zoneflip.mjs` | v2.3.2541: the front/back switch is in front of the zone frames AND keeps its own taps |
| `zonefx` | `mp-zonefx.mjs` | v2.3.1748: what follows you through an exit, and what leaks in |
| `zonegate` | `mp-zonegate.mjs` | v2.3.1817: a zone opens when a quest sends you there |
| `zoomshot` | `mp-zoomshot.mjs` | v2.3.2249: what the bro LOOKS like at a given zoom — driven by sweep-zoom.mjs |
