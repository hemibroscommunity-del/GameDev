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
| Character / monster / weapon art and animation frames | `assets/character animations/`, `assets/monster animations/`, `assets/weapons/`, `assets/armor boards/`, `assets/skill-anim-src/`, `public/sprites/` | Generated with **OpenAI ChatGPT** image generation | Output is owned by the generating user under the OpenAI Terms of Use; commercial use permitted |
| UI icons | `public/icons/`, `public/ui/`, `assets/icons-source/` | Generated with **OpenAI ChatGPT** image generation | As above |
| Music | `public/audio/music/` (`village`, `forest`, `frost`, `desert`, `fire`, `world`, `login-theme`) | Generated with **Suno** on a paid plan | Paid-plan output carries full commercial rights, held by the account owner |

### ⚠️ Still to confirm

Two groups are **not** covered by the above and still need their origin
recorded before the repository can be represented as fully licensed:

| Asset group | Path | Why it is flagged |
|---|---|---|
| Village tileset (`TX_*`) | `public/assets/tilesets/village/Texture/` | The `TX_Tileset_Grass` / `TX_Village_Props` / `TX_Village_Building` naming scheme matches a **downloaded pixel-art tileset pack**, not generated art. It appears to be *Pixel Art Top Down — Basic* by **Cainos**, which is free to use commercially **but requires the author be credited by name**. This has not been confirmed by the owner, so it is recorded as a question, not a fact. |
| Sound effects and creature/ambient audio | `public/sfx/`, `assets/sound effects/`, `public/audio/*.mp3` (`slime-idle`, `slime-death-v2`, `skeleton-death`, `snowman-death`, `tree-fall`, `wood-chop`) | Not covered by the Suno music answer, and no source is documented anywhere in the tree. |

For each, record one of:

- **Original work** — created for this project, or generated with an AI tool
  whose terms permit commercial release. Say which tool.
- **Licensed pack** — name the pack, the author, the store link and the
  license (CC0, CC-BY 4.0, a Kenney or itch.io asset licence). CC-BY requires
  the author be credited *by name* in this file.
- **Unknown / unlicensed** — replace it before release. Kenney.nl and
  OpenGameArt (CC0) are the fastest substitutions.

Contest note: the Hemi Arcade rules require that "all third-party assets (art,
audio, music, fonts, and similar materials) must be properly licensed and
credited where required." An unconfirmed row is a submission risk, not a
formality.
