# Card KEEP: a returning phone keeps its pictures, and a changed one shows at once

**The owner's words (2026-11-26):** "Keeping pictures a long time or indefinitely will be a big boost how do I do that", and, told what it takes and what it is worth: "Yes do it".

**Purpose.** Two faults with one cause. (1) A phone that comes back after more than 4 hours asks the server again about every picture and sound it already holds. (2) A changed picture can show its OLD self for up to 4 hours on a phone that has it, the owner's included, right after a merge. The cause: most pictures have no version in their address, so the browser cannot be told "keep this for good" (it would keep a changed one for good too), and Cloudflare's own default for the domain fills the gap with 4 hours. Give every file's address a version made from the file's own bytes, then keep them a year.

**What was measured first** (`docs/plan/census/PRT-findings.md` row 9, in #2384; all on brotown.net with `curl`, 2026-11-26):
- `/sprites/trees/wood-cedar.png` answers `cache-control: public, max-age=14400, must-revalidate`; `public/_headers` has no rule for it. `/world/objects/manifest.json` answers `max-age=0`. A preview address (`*.pages.dev`) has no 4-hour rule.
- A long rule written in the repo IS honoured over that default: `/assets/index-*.js` answers `max-age=31536000, immutable`. Nothing in Cloudflare's dashboard needs changing.
- Asked again with its etag, a sprite answers `304`, no body. 1,750 of the game's files re-checked 100 at a time: 2.5 s from the test box (6 at a time: 51.7 s). **So the speed gain is small**: about 2.5 s of the loading screen, more on a weak signal, and only after 4 hours away. The owner was told so and still wants it, for the stale picture as much as for the wait.
- In `src/`, of the written-out addresses under `/sprites`, `/ui`, `/sfx`, `/audio`, `/icons`: 423 carry a `?v=`, 623 do not (a rough grep). 39 `Assets.load(`, 59 `new Image()`, 59 `new Audio(` or `fetch(`.

**The table already exists.** `tools/assets/shipped.json` (the asset door, v2.3.5241): one row for every file under `public/` that is a picture, a sound, a video or data, with the SHA-256 of its bytes; written by `node tools/assets/shipped.mjs --write`, held by its guard. A file's version is the first 10 characters of that hash. Never a number kept by hand, never the build's version (the game is built several times a day: a build's number in every address would make every phone download everything again at every merge).

**Tags:** 6740 to 6759. Register the block in the card's first PR (`"KEEP": [[6740, 6759]]`, nextBlock 6760). Two cards started the same day hold the blocks before it and may not be on main yet: TD has 6700 to 6719 (#2380 to #2383) and PRT 6720 to 6739 (#2384). Never take a number of theirs; a gap in `tools/dev/tag-blocks.json` is fine (only the start-up brief reads nextBlock), and whoever merges later merges main first. One tag a PR, in order.
**You hold:** `public/_headers` (NEW blocks only, after the `/world/farm/*` block; never the `/*` block, which is the site's protection), `vite.config.js`, a new `tools/assets/versions.mjs`, a new `src/game/assetUrl.js`, the loaders named below, new guards. NOT `.github/`, NOT `server/wrangler.toml`, no server file (no deploy).
**Laws:** CLAUDE.md §7 MEMORY (the table on the page is heap: say its MB, and the heap line reads 41.1 of 42.5 today), PRELOADING (nothing moves on or off the loading screen), §4 REPO SAFETY (`_headers`). TRAPS and `docs/OPTIMIZATION-ROADMAP.md` on "never immutable on a file that quietly changes": that is the whole danger here, and rule 3 below is its answer.
**Browser:** light. `playable`, `memory-budget`, `mp-coldload` (it already lists every request of a load), the new census.

## The three rules of this card

1. **The version is made by the build, never typed.** Two ways an address gets it:
   - an address WRITTEN OUT in `src/` (`'/ui/x.png'`, in JS, JSX or CSS): a Vite plugin (in `vite.config.js`, its table from `shipped.json`) rewrites it at build to `'/ui/x.png?v=<10 of its hash>'`, replacing any hand-kept `?v=` it carried. No source file is edited for these.
   - an address BUILT from parts (`'/sprites/gear/' + id + '.png'`): one function, `assetUrl(path)` in `src/game/assetUrl.js` (no imports but the generated table), called by the loader that fetches it. The families with a hand-kept key today (`GEAR_VERSION`, `VERSION`, `TRAIT_VER`, the music's) move to it and their constants go.
   - a worker that fetches (`png8Worker.js`, `bodyBakeWorker.js`, the ground worker's objects) is handed addresses that already carry the version, or the table.
2. **A folder is kept a year only when the count of its unversioned requests is 0.** PR 1 makes the count; a folder's `_headers` block lands in the PR that brings its count to 0, never before. The block is the same text as `/world/placed5/*`'s.
3. **The build fails on a hole.** A guard reads the build's output and the census: every request to a kept folder carries `v=` and it equals the table's hash for that file; a file under a kept folder that changed without its row changing fails `shipped.mjs`'s own guard already. A kept folder with one bare request is a FAIL, not a warning.

## PRs, in order

1. **(6740) The census, no change to the game.** `tools/assets/versions.mjs` (path to its 10 characters, from `shipped.json`; node tests it) and a census in `mp-coldload` (or a new `mp-keepcensus`): for one load and one short tour (the town, a walk into a land, one fight, three windows), every request by folder: versioned by the table, versioned by hand, or bare. Written to `docs/plan/census/KEEP-requests.md`. Done when the table of counts by folder is in the PR body.
2. **(6741) The written-out addresses.** The Vite plugin and its guard (a fixture: a literal that names a shipped file gains its version; one that names none is left and listed; a hand `?v=` is replaced; a string that merely looks like a path in a comment or a message is not touched: it rewrites only strings that ARE a shipped file's address, whole). Done when the census's "bare" falls by what the plugin reached, `playable` and `memory-budget` green, and the page's script is no more than 60 KB larger (say the number).
3. **(6742 onward) The built addresses, a family a PR, biggest first** as PR 1's census ranks them (expect: traits, gear, player, monsters' strips through `zoneTextures.js loadTrackedStrip`, sounds, `/world/objects` through its manifest's `made`, which already works that way for the ground). Each PR: the family's loader calls `assetUrl`, its hand key goes, the census's count for its folder reaches 0, and ONLY THEN its `_headers` block is added in the same PR.
4. **(last) The guard that keeps it** (rule 3) in `tools/guards/`, with its plants: a bare literal under a kept folder; a built address that skips `assetUrl`; a `_headers` block for a folder whose count is not 0; a changed file whose row did not change.

Stop after the folders the loading screen fetches are kept (`/sprites`, `/ui`, `/sfx`, `/icons`, `/world/objects`). `/audio` (music, streamed), `/maps`, `/intro`: only if their counts are easy; say what is left.

## Readings chosen for you
- Nothing a player sees changes, except that a changed picture shows on the next load everywhere and a returning phone's loading screen is a little shorter.
- **A year, with `immutable`**, the same as the game's script. Not "for ever": a year is the customary longest, and the version makes it safe.
- **No service worker.** It would do the same job with more to go wrong; the owner asked for the pictures to be kept, and the browser's own cache keeps them.
- The page's table holds only the files a BUILT address can name (the plugin has written the others into the script already). If it is over 0.3 MB of heap, load it as its own small file instead and say so.
- A phone test that answers a request by its path (a route on `/sprites/...png`) must still match with a `?v=` on it: mend the test's pattern, never drop the version.
- The `.webp` twins (`webpImage.js` compares the PATH only, by design): the twin's own hash is its version.
- A file a tool writes while the game is being made (the studios under `public/tools/`) is not the game's: out of scope.
- What is honest to claim: the count of requests a second load makes (0 for kept folders, read by the census with a browser that has the first load's files), and that a changed file's address changes. Seconds saved on a phone are not claimed: they were not measured there.
- The strong model, high. A PR a part: each part is a fresh session on its own branch, stacked on the part before it; a part stops after its push and its one ready message.
