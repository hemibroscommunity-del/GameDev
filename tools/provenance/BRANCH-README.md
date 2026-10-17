# BroTown provenance proofs

This branch holds proof that each version of BroTown existed, file for file,
no later than a stated time, and that it was published from this repository.
It is written only by `.github/workflows/provenance.yml` on `main` and holds
no game code. (This file is copied from `tools/provenance/BRANCH-README.md` on
every run; edit it there.)

For each commit on `main`, in `proofs/<year-month>/` (the commit's month, UTC):

| File | What it is |
|---|---|
| `<commit>.json` | The **fingerprint**: the SHA-256 of every file in the commit, and one SHA-256 of that whole list. |
| `<commit>.json.ots` | Its **Bitcoin timestamp** (OpenTimestamps). It proves the fingerprint existed no later than a Bitcoin block. Nobody can make one with an earlier date, the owner included. |
| `<commit>.sigstore.json` | **GitHub's signature** of the fingerprint (an artifact attestation, logged in Sigstore's public log). It proves this repository's own workflow made it, and when. |

A new timestamp is "pending" for a few hours until Bitcoin confirms it; the
workflow finishes it on a later run.

## Checking a proof

1. **The timestamp.** Open <https://opentimestamps.org>, drop the `.json.ots`
   file on the page, then drop the `.json` file. It says which Bitcoin block
   attests to it and that block's date.
2. **The signature.** With the GitHub CLI: `gh attestation verify
   <commit>.json --repo hemibroscommunity-del/gamedev` (or `--bundle
   <commit>.sigstore.json` to check it without GitHub's copy).
3. **That the fingerprint is the game's files.** In a copy of the repository:
   `node tools/provenance/listing.mjs --verify <commit>.json` prints `MATCH`.
   Or with no code of ours, in a clean download of that commit (GitHub's
   "Download ZIP" of it works):

   ```
   find . -type f ! -path './.git/*' -printf '%P\0' | LC_ALL=C sort -z | xargs -0 sha256sum | sha256sum
   ```

   prints the fingerprint's `listingSha256`.

Every step is explained in `docs/specs/provenance.md` on `main`.
