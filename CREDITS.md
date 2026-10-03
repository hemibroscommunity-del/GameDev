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
| Character / monster / weapon / NPC art and animation frames | `assets/character animations/`, `assets/monster animations/`, `assets/weapons/`, `assets/armor boards/`, `assets/skill-anim-src/`, `public/sprites/` (incl. `public/sprites/npc/`) | Generated with **OpenAI ChatGPT** image generation | Output is owned by the generating user under the OpenAI Terms of Use; commercial use permitted |
| UI icons | `public/icons/`, `public/ui/`, `assets/icons-source/` | Generated with **OpenAI ChatGPT** image generation | As above |
| Music | `public/audio/music/` (`village`, `forest`, `frost`, `desert`, `fire`, `world`, `login-theme`) | Generated with **Suno** on a paid plan | Paid-plan output carries full commercial rights, held by the account owner |

### Third-party assets

| Asset group | Path | Source | License |
|---|---|---|---|
| Sound effects, and creature / ambient audio | `public/sfx/`, `assets/sound effects/`, `public/audio/*.mp3` (`slime-idle`, `slime-death-v2`, `skeleton-death`, `snowman-death`, `tree-fall`, `wood-chop`) | **Pixabay** (https://pixabay.com) | [Pixabay Content License](https://pixabay.com/service/license-summary/) — free for commercial use, no attribution required. Credited here anyway. |
| Flip win / lose stings | `public/sfx/loot/flip-win.mp3`, `public/sfx/loot/flip-lose.mp3` | "Marimba Win F 2" and "Classic Game Action Negative 4" by **floraphonic** (ids 209688, 224418) — titles and the win/lose assignment both taken from the supplied filenames (`...marimba-win-f-2-209688`, `...classic-game-action-negative-4-224418`), and the assignment independently confirmed in-game by clip duration (2.544s on a win, 1.488s on a loss) — supplied by the repository owner (v2.3.2623, Ace's result) | **CONFIRM.** Same open question as the two coin rows: recorded here as the Pixabay Content License to match how the files were supplied, but the owner has not confirmed whether they came from Pixabay (Content License, no attribution required) or Freesound (where a clip may be CC0 or CC-BY). Both permit the use; only CC-BY would require an attribution line. |
| Coin flip sound | `public/sfx/loot/coin-flip.mp3` | "Coinflic1" by **freesound_community**, id 103339 — supplied by the repository owner (v2.3.2621, Ace's toss) | **CONFIRM.** Same open question as the coin-pickup row below, and the same uploader: recorded here as the Pixabay Content License to match how the file was supplied, but the owner has not confirmed whether it came from Pixabay (Content License, no attribution required) or from Freesound itself (where the clip may be CC0 or CC-BY). Both permit the use; only CC-BY would require an attribution line, which is why this row exists either way. |
| Coin pickup sound | `public/sfx/loot/coin-pickup.mp3` | "Spilled Coins" by **freesound_community**, id 101296 — supplied by the repository owner | **CONFIRM.** Recorded here as the Pixabay Content License, matching the row above and the way the file was supplied, but the owner has not yet confirmed which of the two possible origins it came from: Pixabay redistributes freesound_community uploads under the Pixabay Content License (no attribution required), while the same clip on Freesound itself may carry CC0 or CC-BY. Both permit the use; only CC-BY would require the attribution line, which is why this row exists either way. |
| Menu click / dialog close ticks | `public/sfx/ui/click.mp3`, `public/sfx/ui/close.mp3` | "Mouse Click" by **matthewvakaliuk73627**, id 290204 (the click) and "UI Close SFX" by **litupsubway**, id 513359 (the close) — uploader, title and id all read off the supplied filenames — supplied by the repository owner (v2.3.2658 for the click; the close shipped at v2.3.2637 under the general `public/sfx/` row above and is named here now that its filename is on record). Both trimmed losslessly at mp3 frame boundaries; no re-encode. | **CONFIRM.** Same open question as the four rows above: recorded here as the Pixabay Content License to match how the files were supplied, but the owner has not confirmed whether they came from Pixabay (Content License, no attribution required) or from Freesound (where a clip may be CC0 or CC-BY). Both permit the use; only CC-BY would require an attribution line. |
| Item equip / unequip tick | `public/sfx/ui/equip.mp3` | "Item Equip" by **freesound_community**, id 6904 — uploader, title and id read off the supplied filename — supplied by the repository owner (v2.3.2659). It REPLACES the sample that shipped at v2.3.2637 under the general `public/sfx/` row above. Trimmed losslessly at mp3 frame boundaries (MPEG-2 Layer III, 24 kHz); no re-encode. | **CONFIRM.** Same open question as the rows above: recorded here as the Pixabay Content License to match how the file was supplied, but the owner has not confirmed whether it came from Pixabay (Content License, no attribution required) or from Freesound (where a clip may be CC0 or CC-BY). Both permit the use; only CC-BY would require an attribution line. |

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
