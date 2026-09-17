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
| Flip win / lose stings | `public/sfx/loot/flip-win.mp3`, `public/sfx/loot/flip-lose.mp3` | "Marimba Win" and "Classic Game Action Negative 4" by **floraphonic** (ids 209688, 224418) — supplied by the repository owner (v2.3.2623, Ace's result) | **CONFIRM.** Same open question as the two coin rows: recorded here as the Pixabay Content License to match how the files were supplied, but the owner has not confirmed whether they came from Pixabay (Content License, no attribution required) or Freesound (where a clip may be CC0 or CC-BY). Both permit the use; only CC-BY would require an attribution line. |
| Coin flip sound | `public/sfx/loot/coin-flip.mp3` | "Coinflic1" by **freesound_community**, id 103339 — supplied by the repository owner (v2.3.2621, Ace's toss) | **CONFIRM.** Same open question as the coin-pickup row below, and the same uploader: recorded here as the Pixabay Content License to match how the file was supplied, but the owner has not confirmed whether it came from Pixabay (Content License, no attribution required) or from Freesound itself (where the clip may be CC0 or CC-BY). Both permit the use; only CC-BY would require an attribution line, which is why this row exists either way. |
| Coin pickup sound | `public/sfx/loot/coin-pickup.mp3` | "Spilled Coins" by **freesound_community**, id 101296 — supplied by the repository owner | **CONFIRM.** Recorded here as the Pixabay Content License, matching the row above and the way the file was supplied, but the owner has not yet confirmed which of the two possible origins it came from: Pixabay redistributes freesound_community uploads under the Pixabay Content License (no attribution required), while the same clip on Freesound itself may carry CC0 or CC-BY. Both permit the use; only CC-BY would require the attribution line, which is why this row exists either way. |

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
