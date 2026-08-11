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

## Art and audio — ⚠️ PROVENANCE TO BE COMPLETED BY THE PROJECT OWNER

**This section is deliberately unfinished, and it must be completed before the
repository can be represented as fully licensed.**

The repository contains art and audio whose origin is not documented anywhere
in the source tree. Nothing here should be read as a claim that these assets
are owned by this project or licensed for redistribution. Each row below needs
its actual source and license filled in — or the asset removed and replaced.

| Asset group | Path | Source | License | Status |
|---|---|---|---|---|
| Village tileset (`TX_*` naming) | `public/assets/tilesets/village/` | *(to be filled)* | *(to be filled)* | ❓ unverified |
| Character / monster / weapon animations | `assets/`, `public/sprites/` | *(to be filled)* | *(to be filled)* | ❓ unverified |
| UI icons | `public/icons/` | *(to be filled)* | *(to be filled)* | ❓ unverified |
| Sound effects | `public/sfx/`, `assets/sound effects/` | *(to be filled)* | *(to be filled)* | ❓ unverified |
| Music | `public/audio/music/` | *(to be filled)* | *(to be filled)* | ❓ unverified |
| Monster / ambient audio | `public/audio/` | *(to be filled)* | *(to be filled)* | ❓ unverified |

For each group, record one of:

- **Original work** — created for this project (by the owner, or generated with
  an AI tool whose terms permit commercial/open release). Say which.
- **Licensed pack** — name the pack, the author, the store link and the license
  (e.g. CC0, CC-BY 4.0, Kenney, an itch.io asset licence). CC-BY requires the
  author be credited *by name* here.
- **Unknown / unlicensed** — must be replaced before release. CC0 sources like
  Kenney.nl and OpenGameArt are the fastest substitutions.

Contest note: the Hemi Arcade rules require that "all third-party assets (art,
audio, music, fonts, and similar materials) must be properly licensed and
credited where required." An unverified row is a submission risk, not a
formality.
