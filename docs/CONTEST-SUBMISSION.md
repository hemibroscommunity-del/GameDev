# Hemi Arcade submission — checklist, drafts, and the open question

**Deadline:** entries must be in `#game-contest` and fully playable before
**00:00 EST on Aug 13** (so realistically end of Aug 12). Judging Aug 13,
20:00 UTC. Office hours **Aug 12, 15:00 UTC** — a good place to ask the
question below in person.

---

## 1. Ask this FIRST — the eligibility question

The rules say entries must be *"original games created for this contest"*
and prohibit *"submitting an existing or previously published project."*
BroTown predates the July 28 start and is already live. That is a real
disqualification risk, and the rules explicitly invite pre-submission
questions, so ask rather than assume. Post in `#game-contest` or raise it at
office hours:

> Hey — quick eligibility check before I put more work in. I've been
> building an onchain mobile ARPG (Hemi Bros themed — it already verifies
> Hemi Bros NFT ownership on Hemi mainnet for an in-game badge). It predates
> the contest announcement, so it isn't "created for this contest" in the
> strictest reading, but everything I've built for the Arcade specifically is
> new work: an onchain score-attestation contract on Hemi mainnet, a full
> tutorial arc so the demo is completable, MIT licensing, and a bunch of
> onboarding fixes.
>
> Is a pre-existing project eligible if the onchain component and the
> contest-facing work are new, or is this limited to games started after
> July 28? Happy either way — I'd just rather know before the deadline than
> after. Repo: https://github.com/hemibroscommunity-del/GameDev

Be straightforward about the history. Getting told "no" now costs a day;
getting disqualified after judging costs the entry and looks worse.

---

## 2. Pre-submission checklist

| Requirement | State |
|---|---|
| Free to play | ✅ No payment code anywhere; on-chain writes are server-paid |
| Onchain, **Hemi mainnet** | ⚠️ Code ready and hardened (v2.3.1682: guardian key-rotation, receipt-confirmed writes), **contract not deployed yet** — follow the beginner runbook in `docs/specs/progression-onchain.md`: two wallet accounts → fund with ETH → Remix (solc 0.8.26, optimizer 200, TWO constructor addresses) → **verify the source on explorer.hemi.xyz** (the submission links judges there — unverified bytecode looks abandoned) → SCORES_CONTRACT into wrangler.toml + RELAYER_KEY secret |
| Open source on GitHub | ✅ Public |
| MIT or ISC | ✅ MIT (`LICENSE`) |
| Hosted on Cloudflare | ✅ Pages (client) + Workers (server) |
| JS / TS / Solidity | ✅ JavaScript + Solidity |
| Fully playable & completable | ✅ Five-quest tutorial arc, verified end-to-end in the headless suite |
| Third-party assets licensed + credited | ✅ All recorded in `CREDITS.md` — art (ChatGPT), music (Suno paid plan), SFX (Pixabay); the unused village tileset was deleted outright (v2.3.1670) |
| Permission to feature in future HAIR Games | State it in the post (below) |
| One entry per person | ✅ |

### The two things still blocking

1. **Deploy the contract to Hemi mainnet.** Runbook:
   `docs/specs/progression-onchain.md`. Do the testnet rehearsal first.
   Until `SCORES_CONTRACT` and `RELAYER_KEY` are set the feature is simply
   off, and "onchain" would rest on the read-only NFT check alone — thin
   against the Aug 9 clarification.
2. **Two rows left in `CREDITS.md`.** The owner confirmed the art is
   ChatGPT-generated and the music is Suno on a paid plan (full commercial
   rights) — both are recorded and both are the project's own work, not
   third-party material. Two groups are still open:
   - the **village tileset** (`public/assets/tilesets/village/`), whose
     `TX_*` naming says downloaded pack rather than generated art — it looks
     like Cainos' *Pixel Art Top Down — Basic*, which is commercially free
     **but requires crediting the author by name**;
   - the **sound effects** (`public/sfx/`, the creature/ambient `.mp3`s),
     which the music answer does not cover.

   If either turns out to be unlicensed, replace it — Kenney.nl and
   OpenGameArt (CC0) are the fastest substitutions. An MIT license over art
   you don't own is a bigger problem than a missing asset.

---

## 3. Draft submission post

> **BroTown — a mobile-first onchain ARPG on Hemi**
>
> 🎮 Play: https://<your-pages-domain>
> 📦 Source (MIT): https://github.com/hemibroscommunity-del/GameDev
> ⛓️ Contract: https://explorer.hemi.xyz/address/<contract>
>
> A real-time multiplayer ARPG built for phones — touch controls, 50
> players to a room, and a server that's authoritative for every hit,
> drop and level.
>
> **What's onchain.** The game writes score attestations to Hemi mainnet
> at level milestones. The interesting part isn't that scores are stored,
> it's *how*: the server signs an attestation off-chain, and
> `recordScore` is **permissionless** — anyone holding a valid signature
> can post it. The server relays and pays the gas, so playing is free,
> but once a score is signed the operator can never quietly retract it.
> The contract has no owner, no pause, no upgrade path and no withdrawal
> function, and scores are monotonic. Only server-computed numbers are
> attested (level, kills) — client-reported stats are deliberately left
> off, because putting them onchain would make them *look* verified when
> they aren't. It also verifies Hemi Bros NFT ownership for an in-game
> badge.
>
> **Try it in ~10 minutes:** make a character, follow Mayor Bro's quest
> arc through four zones, earn your armor and your first real weapon, and
> watch your level land onchain with a block-explorer link in your
> Records tab.
>
> Built solo with AI assistance. Happy for it to feature in future HAIR
> Games seasons.
>
> Feedback very welcome — especially on phones, which is the target.

Fill in the domain and contract address before posting. Submit early: the
rules encourage work-in-progress entries and community feedback counts
toward the Community Award.

---

## 4. Which categories to aim at

- **Best Onchain Game** — the strongest fit. The permissionless-relay design
  and the deliberate refusal to attest client-reported data are both real
  answers to "verifiability," and worth saying out loud in the post.
- **Most Fun** — needs judges to actually play; the tutorial arc is what
  makes that possible. Ten minutes to a finished arc is the pitch.
- **Most Original** — weakest fit. It's an ARPG, and the rules explicitly
  say they don't want to be reminded of Final Fantasy. Don't lead with this.
- **Community Award** — post early, take feedback, iterate publicly.

## 5. Known rough edges (say them before a judge finds them)

Being upfront about a demo's limits reads as confidence, not weakness.

- Town buildings (shop, marketplace, arena panels) have no entry point —
  their systems work but aren't reachable from the world.
- Some zones have collision gaps where you can walk through scenery.
- Controls are not fully self-explanatory; there's a replayable tutorial
  under Settings → Controls.
- The GDD in `README.md` is historical and describes a lot that was never
  built, including a monetization section that is design-only. The banner
  at the top says so.
