# Proof of every version (v2.3.3308)

The owner, 2026-10-17: "make something that can prove ownership of my game
because I suspect others will clone my game engine or game entirely and try to
pass it off as their own. They'll use AI to remove any kind of detection for
this (one pass). This is just a reasonable assumption."

## The idea in one paragraph

Anything hidden inside the code -- a comment, an odd name, a watermark -- is
what one AI pass over a copy removes. So the proof does not live in the code.
It lives in two public records nobody can change afterwards, the owner
included: **Bitcoin**, through OpenTimestamps, which says *when*, and
**GitHub's signing log** (Sigstore), which says *whose*. Every version of
`main` is fingerprinted -- every file in it, the art, sounds, maps and data as
much as the code -- and the fingerprint goes into both. A copy can be renamed,
reformatted and rewritten; it cannot be dated before our record of the
original.

## What it proves, and what it does not

**It proves:**

- these exact files existed **no later than** a Bitcoin block's time (a
  timestamp cannot be made with an earlier date than it was made);
- **this repository's own workflow** (`hemibroscommunity-del/GameDev`,
  `.github/workflows/provenance.yml`) made the fingerprint, at a time GitHub's
  signing service recorded in a public log;
- the whole history before each version too: a commit's id is a hash of
  everything before it, and the id is in the fingerprint.

**It does not:**

- **stop anyone copying.** The code is MIT licensed (see "The license" below);
  copying it with the copyright notice kept is allowed.
- **find a copy by itself.** That is the "When you find a copy" section.
- **make anyone the legal author.** It is evidence of *who had it first*, the
  question every dispute starts with. What the law then says depends on where,
  and on the questions in "Beyond this" below.

## Where the proofs are

On the **`provenance` branch** (no game code, written only by the workflow),
in `proofs/<year-month>/` (the commit's month, in UTC), three files per commit
of `main`:

| File | What it is |
|---|---|
| `<commit>.json` | The **fingerprint**: the commit, its tree, date and subject, how many files and bytes, and `listingSha256`, the SHA-256 of the **listing** (one line per file: its own SHA-256, two spaces, its path, sorted by the path's bytes). |
| `<commit>.json.ots` | Its **Bitcoin timestamp**. "Pending" for a few hours after it is made, until a Bitcoin block confirms it; a later run finishes it. |
| `<commit>.sigstore.json` | **GitHub's signature** of the fingerprint: an artifact attestation (SLSA provenance), also in Sigstore's public transparency log. |

Never delete, rewrite or force-push this branch: each file is only worth its
date, and a new one cannot be made with an old date.

## Checking a proof

Anyone can do all three, with or without our code.

1. **When: the timestamp.** Go to <https://opentimestamps.org>, drop the
   `.json.ots` file on the page, then the `.json` file. It names the Bitcoin
   block that attests to the fingerprint and that block's date. (With a
   Bitcoin node of your own, `ots verify <commit>.json.ots` says the same.)
2. **Whose: the signature.** With the GitHub command-line tool:

   ```
   gh attestation verify <commit>.json --repo hemibroscommunity-del/GameDev
   ```

   or, without asking GitHub for its copy, add
   `--bundle <commit>.sigstore.json`. It checks the signature was made by a
   workflow of this repository, and when.
3. **What: that the fingerprint is the game's files.** In a copy of the
   repository, `node tools/provenance/listing.mjs --verify <commit>.json`
   prints `MATCH`. **Checking without our code:** in a clean download of that
   commit (on GitHub: the commit, then Browse files, then Code, then Download
   ZIP), one line of standard tools prints the fingerprint's `listingSha256`:

   ```
   find . -type f ! -path './.git/*' -printf '%P\0' | LC_ALL=C sort -z | xargs -0 sha256sum | sha256sum
   ```

   (In a git checkout, `git ls-files -z | LC_ALL=C sort -z | xargs -0 sha256sum
   | sha256sum` is the same.) The listing's lines are exactly what `sha256sum`
   prints, so `node tools/provenance/listing.mjs <commit> --listing` gives every
   file's own line too.

**One file:** to show a particular picture, sound or source file was in a
stamped version, find its line in that version's listing (`--listing | grep
<path>`) and `sha256sum` the file: the same number, in a listing whose
fingerprint is timestamped.

## When you find a copy

A web game has to send its code and its art to every player's browser, so a
copy that is played online cannot hide what it is made of.

1. **Write down what you saw**, with the date: the address, screenshots, and
   where it was advertised. Save the pages (a browser's "Save page as", or the
   Internet Archive's "Save Page Now" at <https://web.archive.org>, which dates
   it for you).
2. **Send Claude the address.** A session can download what their site serves
   and compare it with these stamped versions:
   - files copied as they are (most art is): `node
     tools/provenance/listing.mjs <commit> --has <their files>` names every one
     that is byte for byte ours;
   - art that was re-saved, resized or recoloured: compared by how it looks,
     which survives all three (not built yet: built the first time it is
     needed, against these same stamped files);
   - code an AI rewrote: what a rewrite keeps because the game needs it to
     work -- the world's layout (every tree, rock and monster's place comes
     from fixed numbers), the hundreds of tuned numbers, the message names and
     the server's answers.
3. **Then the platform.** Hosts, app stores and GitHub act on a copyright
   complaint (in the US a DMCA notice) that shows the original and its date;
   these proofs are that. A lawyer decides the rest.

## Beyond this: the owner's decisions

Not built, each the owner's call:

- **The license.** The code is MIT (`LICENSE`, added for the Hemi Arcade
  contest, which asks for MIT or ISC and a public repository). MIT lets anyone
  copy the code and sell it, if they keep the copyright notice -- so a copy
  that strips the notice breaks the license, and that is where these proofs
  matter. The license's note says it covers the SOURCE CODE; the game's own
  art, music, world and names are not said to be MIT, but nothing says they
  are reserved either. A plain "all rights reserved" line for them, and a
  different license for future versions after the contest, are the owner's
  choice (a version already published stays MIT for whoever has it).
- **Only the real site may use the real server.** Today any site can connect
  to `wss://api.brotown.net`, so a copy could reuse our server and our players
  under another name. The worker could accept only brotown.net, its previews
  and local tests (a browser always says which site it is on, and a web page
  cannot lie about it). Not built: it needs the owner's list of addresses.
- **Registering.** A copyright registration (US Copyright Office, about $45-65
  online) is needed before suing in the US, and earlier registration allows
  more damages. A trademark on the name stops others using it. Both are the
  owner's, with a lawyer: the Copyright Office does not register what an AI
  made without enough human authorship, and much of this game's code and art
  was made with AI at the owner's direction -- how much of it, and the owner's
  design and selection of it, is a question for an IP lawyer.

## How it runs

`.github/workflows/provenance.yml`:

- **on every push to `main`**, four times a day, and by hand (Actions, then
  Provenance, then Run workflow: how many of main's latest commits to look at,
  or one older commit to stamp);
- one run at a time; every run CATCHES UP (`tools/provenance/proofs.mjs
  plan`): it fingerprints whichever of main's last 30 commits have none,
  stamps every fingerprint with no timestamp, finishes the timestamps Bitcoin
  has confirmed, and signs what is not signed -- so a run that fails, or is
  replaced in the queue by a newer one, loses nothing (at most 200 stamps, 200
  finishes and 50 signatures a run);
- a failed timestamp or signature leaves the fingerprint on the branch, and the
  next run does it;
- its commits start with `[CF-Pages-Skip]`, so Cloudflare Pages does not try to
  build the branch (TRAPS §193);
- free: OpenTimestamps and GitHub's attestations for a public repository cost
  nothing, and the run takes a few minutes of Actions time, free for a public
  repository. If the repository is made private, the signatures stop (GitHub
  signs private repositories only on Enterprise plans) and the timestamps go on.

## Files and checks

- `tools/provenance/listing.mjs` -- the fingerprint; `--listing`,
  `--manifest`, `--verify`, `--has`. Reads git's own objects, never the working
  folder, so it is the committed bytes exactly.
- `tools/provenance/proofs.mjs` -- what a run still has to do (`plan`), the
  signature kept beside what it signed (`keep`), the commit message
  (`message`).
- `tools/provenance/selftest.mjs` -- 29 checks on a repository made for it:
  every awkward file (empty, binary, hundreds, a space and accents, a symlink,
  a big file read in pieces), the same number as `sha256sum`, a run that is
  finished by the next. Each of seven deliberate bugs makes it fail.
- `tools/provenance/BRANCH-README.md` -- the branch's own README, copied each
  run.
- A pull request that changes the workflow or this folder gets a **dry run**:
  the selftest, then a real timestamp and a real signature of its own commit,
  checked as a stranger would (`gh attestation verify`), into a folder that is
  never pushed.
