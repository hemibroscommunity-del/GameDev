# Credits and third-party licenses

BroTown's **source code** is MIT licensed — see [LICENSE](./LICENSE).

This file records everything in the repository that the project did not write
itself, and the terms it arrives under. Where an asset carries its own
license, that license governs the asset regardless of the MIT terms on the
code.

## Code

| What | Where | License | Notes |
|---|---|---|---|
| **noble-secp256k1** (Paul Miller) | `server/src/vendor/noble-secp256k1.js` | MIT | Vendored verbatim with its license header. Used to sign on-chain score attestations in the Cloudflare Worker — Web Crypto does not implement secp256k1, and vendoring keeps the server test suite dependency-free. Upstream: https://github.com/paulmillr/noble-secp256k1 |
| **keccak-256** | `server/src/onchain.js` | MIT (this project) | Written for this project; verified against the canonical private-key-1 → `0x7E5F…95BdF` address vector. |
| **EFF Long Wordlist** (Electronic Frontier Foundation, 2016) | `server/src/keywords.js` | [CC BY 3.0 US](https://creativecommons.org/licenses/by/3.0/us/) | The words a new Login Key is made of (v2.3.3355): the list's 1,477 words of five letters or fewer, with 55 removed (brand names, illness and body words, insults, and one containing a dash). Source: https://www.eff.org/dice |
| React, PixiJS, Vite, Wrangler | `package.json`, `server/package.json` | MIT / respective | Standard dependencies, unmodified, installed from npm. |

## Fonts

Loaded from Google Fonts at runtime (`src/index.html`); not redistributed in
this repository.

| Font | License |
|---|---|
| Baloo 2 | SIL Open Font License 1.1 |
| Press Start 2P | SIL Open Font License 1.1 |
| Source Sans 3 | SIL Open Font License 1.1 |

## Art and audio

Most of the game's art and audio was **generated for this project** with AI
tools whose terms assign the output to the person who generated it and permit
commercial use. Those assets are the project's own work, not third-party
material licensed in — but the tool is credited here anyway, because saying
where something came from costs nothing and guessing later costs a lot.

| Asset group | Path | Source | Terms |
|---|---|---|---|
| Character / monster / weapon / NPC art and animation frames | `assets/character animations/`, `assets/monster animations/`, `assets/weapons/`, `assets/armor boards/`, `assets/skill-anim-src/`, `public/sprites/` (incl. `public/sprites/npc/`, but not its `*-head.webp` portraits, nor the Golden Glasses and Golden Monocle under `traits/eyewear/` since v2.3.3587: the Hemi Bros row below) | Generated with **OpenAI ChatGPT** image generation | Output is owned by the generating user under the OpenAI Terms of Use; commercial use permitted |
| UI icons | `public/icons/`, `public/ui/`, `assets/icons-source/` | Generated with **OpenAI ChatGPT** image generation | As above |
| The townsfolk's dialogue portraits (v2.3.3580) | `public/sprites/npc/*-head.webp`; the trait layers in `assets/portrait-source/hemi-bros/` | Built by `tools/qa/nft_portraits.py` from the trait art of **Hemi Bros**, the NFT collection the game is named for (github.com/hemibroscommunity-del/Hemi-Bros-catalogue, the same GitHub organisation as this repository), whose art was made by an artist or a team based in Mongolia, at the repository owner's direction (2026-10-23: "model the portraits as close as you can to something found here"); since v2.3.3585 dressed by the same tool in each townsperson's in-game shirt, long beard and monocle glass, drawn on the collection's pieces (the owner: "modify the existing portraits to look like how you designed them in the game"); since v2.3.3587 also the game's **Golden Glasses** and **Golden Monocle** (`public/sprites/traits/eyewear/golden-glasses/`, `golden-monocle/`), drawn by `tools/ui/make_collection_eyewear.py` from the same collection's pieces (the owner: "Game matches collection") | No terms of its own (v2.3.3581, the owner, 2026-10-23: "Yes you can credit Hemi bros as source of portrait art. No terms."). Hemi Bros is credited here as the portraits' source. |
| Music | `public/audio/music/` (`village`, `forest`, `frost`, `desert`, `fire`, `rock`, `water`, `murky`, `skirmish`, `minigame`, `farm`, `world`, `login-theme`); since v2.3.3610 the owner's score of 2026-10-26 (`village`, `forest`, `frost`, `desert`, `fire` replaced, `rock`, `water`, `murky`, `skirmish`, `minigame` new), its masters in `assets/music-source/2026-10-26/`; since v2.3.3672 `farm` (the owner's "Homestead Morning" of 2026-10-27, its master in `assets/music-source/2026-10-27/`) | Generated with **Suno** on a paid plan, by the repository owner (the tracks' own tags: "made with suno") | Paid-plan output carries full commercial rights, held by the account owner |

### Third-party assets

| Asset group | Path | Source | License |
|---|---|---|---|
| Sound effects, and creature / ambient audio | `public/sfx/`, `assets/sound effects/`, `public/audio/*.mp3` (`slime-idle`, `slime-death-v2`, `skeleton-death`, `snowman-death`, `tree-fall`, `wood-chop`) | **Pixabay** (https://pixabay.com) | [Pixabay Content License](https://pixabay.com/service/license-summary/) — free for commercial use, no attribution required. Credited here anyway. |
| Flip win / lose stings | `public/sfx/loot/flip-win.mp3`, `public/sfx/loot/flip-lose.mp3` | "Marimba Win F 2" and "Classic Game Action Negative 4" by **floraphonic** (ids 209688, 224418) — titles and the win/lose assignment both taken from the supplied filenames (`...marimba-win-f-2-209688`, `...classic-game-action-negative-4-224418`), and the assignment independently confirmed in-game by clip duration (2.544s on a win, 1.488s on a loss) — supplied by the repository owner (v2.3.2623, Ace's result) | **CONFIRM.** Same open question as the two coin rows: recorded here as the Pixabay Content License to match how the files were supplied, but the owner has not confirmed whether they came from Pixabay (Content License, no attribution required) or Freesound (where a clip may be CC0 or CC-BY). Both permit the use; only CC-BY would require an attribution line. |
| Monster noises (v2.3.3340) | `public/sfx/monster/noise-goblin-rawr.mp3`, `noise-skeleton-rattle.mp3`, `noise-slime-bounce.mp3`, `noise-snowman-snarl.mp3`; sources in `assets/sfx-source/monsters/` | "Growl and Roar" (id 102417, the fire goblin's), "Rattling Bones" (id 105394, the skeleton's) and "Beast Snarling" (id 82801, the snowman's) by **freesound_community**, and "Bouncy Jelly Creature Movement" by **yodguard** (id 387892, the slime's) -- uploader, title and id read off the supplied filenames -- supplied by the repository owner (v2.3.3340). About one second of each cut, mono, by `tools/audio/cut_monster_noises.py`. | **CONFIRM.** Same open question as the rows below: recorded here as the Pixabay Content License to match how the files were supplied (Pixabay's uploader-title-id filenames), but the owner has not confirmed whether they came from Pixabay (Content License, no attribution required) or from Freesound (where a clip may be CC0 or CC-BY). Both permit the use; only CC-BY would require an attribution line. Should any turn out to be CC BY-NC it must come out (no NC, v2.3.2970). |
| The owner's recordings for the sounds still needed (v2.3.3462) | `public/sfx/player/` (`hurt-1`, `hurt-2`, `heartbeat`, `munch`, `gulp`, `swim-splash`), `public/sfx/ui/` (`chat-pop`, `chime`, `denied`, `points-spent`), `public/sfx/emote/` (`laugh`, `snore`), `public/sfx/world/war-horn.mp3`, `public/sfx/monster/` (`boss-roar`, `explosion`), `public/sfx/npc/voices.mp3`, `public/audio/ambient/` (`sea-surf`, `forest`, `lava`, `town-crowd`, `fire-crackle`), `public/audio/music/dance-beat.mp3`; sources in `assets/sfx-source/{player,ui,emote,world,npc,voice}/` | "Male Hurt 7" (48124), "Angry Grunt" (103204; the sprint's grunt since v2.3.3523, `public/sfx/voice/sprint-grunt.mp3`), "Grunt 1" (85280; the second hurt grunt, `public/sfx/player/hurt-2.mp3`, since v2.3.3523 -- the sprint's push-off before it), "Eating Chocolate" (67566), "Gulping Noises Drinking Noises" (37758), "Hmm Ahh" (6426), "Forest 3" (26722), "Lava Loop 1" (67307) and "Crowd Murmuring" (60721) by **freesound_community**; "Thudding Heartbeat" (372487), "Epic Dragon Roar" (364481), "Loud Explosion" (425457) and "Fire Crackling" (356123) by **dragon-studio**; "New Notification 010" (352755), "Error Notification 05" (199276) and "Funny Snore" (250959) by **universfield**; "New Message Pop" by **virtual_vibes** (464675); "Laugh Like Crazy" by **chieuk** (257881); "War Horn and Drums" by **soundmarker33** (512545); "Gentle Ocean Waves 4" by **mightuser** (300840); "Club Beat 120 Bmin" by **prdbyd** (294045) -- uploader, title and id read off the supplied filenames -- supplied by the repository owner (2026-10-18, "I have the rest of the sounds"); and, sent after them the same day, "Water Splash" by **universfield** (229315; `public/sfx/player/swim-splash.mp3`, getting into and out of the water) and "Cute Level Up 1" by **floraphonic** (189852; `public/sfx/ui/points-spent.mp3`, points spent), in `assets/sfx-source/player/` and `ui/`. Each cut to the moment the game wants, mono, by `tools/audio/cut_owner_sounds.py` (the munch high-passed, the heartbeat's own overtones laid over it; the loops made seamless). | **CONFIRM.** The same open question as the monster noises' row: recorded here as the Pixabay Content License to match how the files were supplied (Pixabay's uploader-title-id filenames), but the owner has not confirmed whether they came from Pixabay (Content License, no attribution required) or from Freesound (where a clip may be CC0 or CC-BY). Both permit the use; only CC-BY would require an attribution line. Should any turn out to be CC BY-NC it must come out (no NC, v2.3.2970). |
| Sprint grunt (v2.3.3455) and tired breath (v2.3.3475) | `public/sfx/voice/sprint-grunt.mp3`, `public/sfx/voice/sprint-breath.mp3`; sources in `assets/sfx-source/player/` (the grunt) and `assets/sfx-source/voice/` (the breath) | "Angry Grunt" by **freesound_community** (id 103204; since v2.3.3523, the owner's "effort grunt" -- until then "Grunt 1", id 85280, which is now the second hurt grunt in the row above) and "Out of Breath Male" by **voicebosch** (id 176715) -- uploader, title and id read off the supplied filenames -- supplied by the repository owner (v2.3.3455, the sprint's sound; v2.3.3475, "Here's the out of breath", every other sprint that runs dry). The grunt's 0.22 s (high-passed at 220 Hz) and two breaths out of the breath (1.51-3.23 s), mono, by `tools/audio/cut_sprint_voice.py`. | **CONFIRM.** Same open question as the monster noises above: recorded here as the Pixabay Content License to match how the files were supplied, but the owner has not confirmed whether they came from Pixabay (Content License, no attribution required) or from Freesound (where a clip may be CC0 or CC-BY). Both permit the use; only CC-BY would require an attribution line. Should either turn out to be CC BY-NC it must come out (no NC, v2.3.2970). |
| Coin flip sound | `public/sfx/loot/coin-flip.mp3` | "Coinflic1" by **freesound_community**, id 103339 — supplied by the repository owner (v2.3.2621, Ace's toss) | **CONFIRM.** Same open question as the coin-pickup row below, and the same uploader: recorded here as the Pixabay Content License to match how the file was supplied, but the owner has not confirmed whether it came from Pixabay (Content License, no attribution required) or from Freesound itself (where the clip may be CC0 or CC-BY). Both permit the use; only CC-BY would require an attribution line, which is why this row exists either way. |
| Coin pickup sound | `public/sfx/loot/coin-pickup.mp3` | "Spilled Coins" by **freesound_community**, id 101296 — supplied by the repository owner | **CONFIRM.** Recorded here as the Pixabay Content License, matching the row above and the way the file was supplied, but the owner has not yet confirmed which of the two possible origins it came from: Pixabay redistributes freesound_community uploads under the Pixabay Content License (no attribution required), while the same clip on Freesound itself may carry CC0 or CC-BY. Both permit the use; only CC-BY would require the attribution line, which is why this row exists either way. |
| Menu click / dialog close ticks | `public/sfx/ui/click.mp3`, `public/sfx/ui/close.mp3` | "Mouse Click" by **matthewvakaliuk73627**, id 290204 (the click) and "UI Close SFX" by **litupsubway**, id 513359 (the close) — uploader, title and id all read off the supplied filenames — supplied by the repository owner (v2.3.2658 for the click; the close shipped at v2.3.2637 under the general `public/sfx/` row above and is named here now that its filename is on record). Both trimmed losslessly at mp3 frame boundaries; no re-encode. | **CONFIRM.** Same open question as the four rows above: recorded here as the Pixabay Content License to match how the files were supplied, but the owner has not confirmed whether they came from Pixabay (Content License, no attribution required) or from Freesound (where a clip may be CC0 or CC-BY). Both permit the use; only CC-BY would require an attribution line. |
| Item equip / unequip tick | `public/sfx/ui/equip.mp3` | "Item Equip" by **freesound_community**, id 6904 — uploader, title and id read off the supplied filename — supplied by the repository owner (v2.3.2659). It REPLACES the sample that shipped at v2.3.2637 under the general `public/sfx/` row above. Trimmed losslessly at mp3 frame boundaries (MPEG-2 Layer III, 24 kHz); no re-encode. | **CONFIRM.** Same open question as the rows above: recorded here as the Pixabay Content License to match how the file was supplied, but the owner has not confirmed whether it came from Pixabay (Content License, no attribution required) or from Freesound (where a clip may be CC0 or CC-BY). Both permit the use; only CC-BY would require an attribution line. |
| Ore crack (a mining harvest completing) | `public/sfx/mining/ore-crack.mp3` | Cut at v2.3.3040 from the audio of `public/minigames/mining/extract-success.mp4` (2.24-2.96 s, the third crack: the rock splitting open), a clip the repository owner added at v2.3.2888 for the mining minigame and never used. Mono, loudness-normalised to -16 LUFS, re-encoded to 96 kb/s mp3 with ffmpeg. | **CONFIRM.** The clip arrived with no source recorded. If it was generated for the project (as the other minigame clips were), it is the project's own; if it came from a stock site, its terms apply and this row should name them. |

#### Footsteps, one sound per kind of ground (v2.3.2967)

`public/sfx/footstep/step-*.mp3`, cut by `tools/audio/cut_footsteps.py` from
recordings the repository owner supplied (Freesound downloads, named
`<id>__<user>__<title>.wav`). Every clip is **changed**: cut into single
steps, brought to the level of the game's own step, and re-encoded. The licenses were looked up on 2026-10-02; Freesound
itself could not be reached from the build machine, so the ones marked
**CONFIRM** came from search results, or not at all, and want a look at the
sound's own page. All three Freesound licenses (CC0, CC BY, CC BY-NC) allow
use in the game, but **CC BY-NC forbids commercial use** -- which the
supporter pass is -- so a CONFIRM that turns out to be NC must be replaced.

| Ground | File | Source | License |
|---|---|---|---|
| snow | `step-snow.mp3` | "Walking Through Snow.wav" by **Percy Duke**, Freesound 420559 | **CC BY 3.0 -- attribution required.** Credited in the game's About panel. |
| ice | `step-ice.mp3` | "Running, Ice, A.wav" by **InspectorJ** (www.jshaw.co.uk), Freesound 416967 | **CC BY 4.0 -- attribution required**, in the uploader's requested form. Credited in the game's About panel. |
| metal | `step-metal.mp3` | "Metal Steps" by **Phil25**, Freesound 208101 | CC0 |
| stone | `step-stone.mp3` | "Dry Footsteps Loop" by **qubodup**, Freesound 816017 | CC0 |
| sand | `step-sand.mp3` | "Steps_Fine_Snow_Or_Sand_Strong_29" by **BlondPanda**, Freesound 778568 (v2.3.2970; until then "Footsteps on sand" by amholma, 376797) | **CONFIRM** -- likely CC0: a search result gives another step of the same series (778546, "..._Strong_08") as CC0. |
| grass | `step-grass.mp3` (also the forest floor's, for now) | "Right Grassgrassy Footstep 4" by **Ali_6868**, Freesound 384869 | **CONFIRM** -- likely CC0: Pixabay carries this uploader's footsteps as freesound_community, which it does for CC0 sounds. |
| gravel | `step-gravel.mp3` | "Right Gravel Footstep 5" by **Ali_6868**, Freesound 384880 | **CONFIRM**, as the row above. |
| mud | `step-mud.mp3` | "Walking In Mud" by **lukiacostello**, Freesound 446257 | **CONFIRM** -- not found. |
| ash | `step-ash.mp3` | "powder_softimpact_006" by **jazzkdh**, Freesound 768596 | **CONFIRM** -- not found. |
| wood | `step-wood.mp3` | "wood step sample 4" by **notarget**, Freesound 434759 | **CONFIRM** -- not found. |

Dirt stays `footstep-v3.mp3`, under the general `public/sfx/` row above. The
About panel credits every uploader by name either way, so a CC BY among the
CONFIRM rows is already attributed.

**Also hit sounds (v2.3.3001).** Slices of the snow, mud, stone, ash and grass
clips (and `footstep-v3`) now also sound hits: a snowman's crunch, a slime's
squelch, a rock monster's knock, a plant's rustle, a tree's crown, a snowball
or a slime's glob breaking (`src/data/gameDisplay.js` HIT_VOICES, PROP_SOUNDS,
CROWN_SOUNDS, SHOT_SOUNDS; docs/specs/material-hit-sounds.md).  The same
files, so the same licenses and credits as above -- nothing new is shipped --
but a CONFIRM row that turns out to be NC now has more uses to replace.

**Not used:** the owner's second mud recording, "walking in the mud" by
**arnaud coutancier** (Freesound 582400, v2.3.2970). Search results give the
uploader's sounds as Attribution NonCommercial (CC BY-NC 3.0), which the
supporter pass rules out (above). Its cut is kept, commented out, in
`cut_footsteps.py`, should the license ever allow it.

#### The owner's recordings of 2026-10-27 (v2.3.3664)

Eleven Freesound downloads the repository owner uploaded on 2026-10-27, kept
as supplied in `assets/sfx-source/2026-10-27/` (its README names each, by the
`<id>__<user>__<title>` Freesound gives a download). Every one is **changed**:
cut to the moment the game wants and levelled by
`tools/audio/cut_owner_sounds.py` (some high-passed, the fire's with its own
overtones laid over it), mono, re-encoded. Freesound itself could not be
reached from the build machine (as for the footsteps), and no search result
named these licenses, so every row is **CONFIRM**: a look at each sound's page
(`freesound.org/s/<id>/`). CC0 and CC BY allow the use (CC BY wants the credit
the About panel already gives, by uploader); **CC BY-NC forbids commercial use,
which the supporter pass is, so a row that turns out to be NC must come out.**

| What it plays | File | Source | License |
|---|---|---|---|
| Coins picked up | `public/sfx/loot/coins.mp3` | "coins-05" by **anthousai**, Freesound 336571 | **CONFIRM** |
| Anything going into the bag | `public/sfx/ui/bag-close.mp3` | "closebag" by **triqystudio**, Freesound 467605 | **CONFIRM** |
| Lil Bro's voice | `public/sfx/npc/lil-bro-hmm.mp3` | "hmm" by **roses1401**, Freesound 482422 | **CONFIRM** |
| Fertilizing a bed (the clay) | `public/sfx/farm/farm-mould.mp3` | "molding" by **manuelaurreaf**, Freesound 490099 | **CONFIRM** |
| Digging a bed (the hoe) | `public/sfx/farm/farm-hoe.mp3` | "hoe work" by **16hpanskadvorakova_aneta**, Freesound 497987 | **CONFIRM** |
| A campfire lit | `public/sfx/world/fire-light.mp3` | "light fire sound" by **wdomino**, Freesound 507724 | **CONFIRM** |
| Watering a bed (the can) | `public/sfx/farm/farm-water.mp3` | "Grab & Can Watering" by **wyronroberth**, Freesound 516257 | **CONFIRM** |
| The forge's hammer (smelting, forging, the anvil in town) | `public/sfx/craft/forge-strike.mp3` | "Hitting Flat hoe with Hammer" by **theboulder3400**, Freesound 636098 | **CONFIRM** |
| A town building's door | `public/sfx/world/door-open.mp3` | "Waves Audio Door Open SFX" by **mavom22**, Freesound 740271 | **CONFIRM** |
| The Woodworker's knife (bows, staffs, hardened wood, traps) | `public/sfx/craft/wood-carve.mp3` | "wood carve 5" by **frostnox**, Freesound 796658 | **CONFIRM** |
| A crop harvested | `public/sfx/farm/farm-harvest.mp3` | "Harvest - Cozy Game SFX" by **heyheytheree**, Freesound 872487 | **CONFIRM** -- its title says "free" |
| The dodge roll (v2.3.3680) | `public/sfx/player/roll-tumble.mp3` | "goblin fall" by **kneeling**, Freesound 502553 | **CONFIRM** |
| The double jump's flip (v2.3.3682) | `public/sfx/player/jump-flip.mp3` | "sfx jump flip" by **catthulu**, Freesound 563530 | **CONFIRM** |

> **Note on the Pixabay license.** It permits commercial use and modification
> without attribution, but it does *not* permit redistributing the audio "as a
> standalone file" for others to download. Bundling the clips inside a game is
> squarely the intended use. A public source repository is a greyer area, since
> the `.mp3`s are individually fetchable from it — this is worth knowing, not
> worth panicking over, and it is the reason the clips are credited by source
> rather than passed off as original work.

### Removed rather than credited

The game previously used a purchased **32×32 pixel-art village tileset**
(`TX_Tileset_Grass`, `TX_Village_Building_-_House_*`, …). That art belonged to
an earlier version of the game and was wholly replaced by the painted
single-image zone maps. Its render branch had been unreachable for a long time
while the files were still downloaded at startup, so as of **v2.3.1670** both
the art and its loader (`src/rendering/tileAssets.js`) are deleted from the
repository. Nothing in the shipped game draws from it, and there is no
third-party art here to license.

Contest note: the Hemi Arcade rules require that "all third-party assets (art,
audio, music, fonts, and similar materials) must be properly licensed and
credited where required." Every asset group in the repository is now accounted
for above.
