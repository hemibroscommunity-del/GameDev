# On-chain score attestations (Hemi) — spec + operator runbook

**Version:** v2.3.1682 (guardian rotation, receipt-confirmed writes, chainstatus) · **Contract:** `contracts/BroTownScores.sol` ·
**Server:** `server/src/chainwriter.js` (signing/encoding),
`server/src/chainscore.js` (game integration),
`server/src/leaderboard.js` (the in-game board over the same series) ·
**Suites:** `server/test/chainwriter.test.mjs`, `server/test/chainscore.test.mjs`,
`server/test/hiscores.test.mjs`, `tools/qa/mp/mp-hiscores.mjs` ·
**Conformance:** `tools/dev/evm-conformance.mjs` (compiles the contract and
runs it in a local EVM; off the test path)

## What this is

BroTown writes a small, permanent, public record of player milestones to
**Hemi mainnet (chain 43111)**. Before this, the game's only chain contact was
read-only: `broverify.js` checks Hemi Bros NFT ownership to grant a cosmetic
badge. Nothing was ever written.

**What is attested (v2.3.1671):** every server-computed progression number —
the three trained combat skills (melee / bow / magic) from `ps.prog3.sk`, all
ten life skills from `ps.lifeSkills`, and `kills` from `svKills`. Fourteen
series, each a monotonic counter the server owns. Combat levels come from
`_prog3AwardXp`; life-skill levels from `_addLifeSkillXp` in gathering.js;
kills from `_resolveMonsterKill`, the same function that pays the XP and drops
the loot.

**What is deliberately NOT attested:** gold earned, playtime, dungeon clears.
Those leaderboard columns are still client-reported, and putting a
client-reported number on a permanent public ledger would make it *look*
verified while being worth exactly the client's word. Widen `_chainScoreSeries`
only when those become server-owned — the contract needs no change to accept a
new key.

**Known soft spot, recorded rather than hidden:** `join.js` can bootstrap
`lifeSkills` from a client-sent blob on a legacy record's *first* join (the
pre-server-ownership migration path). Everything after that first join is
server-computed. So a life-skill level is authoritative going forward but
could, on an old account, have started from a claim. Combat levels and kills
have no such path.

**When:** on combat-level milestones — 4, 10, 25, 50, 100, 150, 200, 250, 300.
(v2.3.1683: the first milestone is 4 — a fresh character is level 3, so the
very first level-up puts the run on-chain within minutes of play.)
Nine transactions per character, for the lifetime of the account. This is not
a per-kill ledger and must not become one; gas is real. Life-skill levels ride
along on those same nine writes rather than triggering their own — ten more
skills must not mean ten times the gas — and each write sends only the series
that actually *changed* since the last one.

## Two design decisions worth defending

### 1. Skills are names, not fields

The store is `player => skill => level`, where the skill key is its short name
written straight into a `bytes32` — `"melee"`, `"fishing"`, `"trapping"`.

The first draft of this contract had a fixed struct (`level`, `kills`). For
something that can never be upgraded, that was a mistake: adding per-skill
boards or the ten life skills would have meant deploying a **second** contract
and stranding every score already written at the old address. Naming the skills
instead means a skill added years from now needs no contract change at all —
the game starts signing a new name and it works. There is no id registry to
keep in sync, so the repo and the chain cannot disagree about what id 7 meant.
Short ASCII names are also mostly zero bytes (the cheap kind of calldata) and
render as readable text in a block explorer: a reader sees `fishing`, not
`skillId: 7`.

`kills` rides along as just another key. It is not a level, but it is a
server-computed monotonic counter, which is the only property the contract
cares about.

### 2. Submission is permissionless

`recordScore` is **permissionless**. The server signs an attestation
off-chain; *anyone* holding that signature can submit it. The server relays by
default and pays the gas, so playing stays free.

That matters because the honest description of BroTown is "the server is
authoritative." Given that, a contract that only the server may write is just
a database with worse latency. Making submission permissionless changes the
property being offered: once the server has signed a score, it can never
quietly retract it — any player who kept the signature can put it on-chain
themselves, forever. The contract has no owner, no pause, no upgrade path and
no withdrawal function. Scores are monotonic, so a compromised server could
inflate a score but never erase one.

The one moving part (v2.3.1682): a **guardian** — an address fixed forever at
deploy, held in the operator's personal wallet — can replace the *signing
key*, and can do nothing else. It exists because the signer's key must live
on a server to sign, and server keys can leak; before the guardian, a leak
meant fake scores at this address forever, with redeployment (and a stranded
history) as the only remedy. The guardian cannot touch a single recorded
score, so the trust statement stays one sentence: **nobody can change
anything except which key signs new scores, and only the guardian holds that
switch.**

## Failure posture (load-bearing)

A chain problem must never be a game problem. Every path is fire-and-forget
with the failure swallowed: RPC outage, unfunded relayer, missing secret,
reverted transaction — all end with nothing stored, the player noticing
nothing, and a retry on the next level-up. **Nothing in a combat path awaits
the chain.** The suite pins this explicitly.

While `SCORES_CONTRACT` or `RELAYER_KEY` is unset, the feature is simply off.

---

# Operator runbook — deploying to Hemi mainnet, no experience assumed

## The 5-minute path (v2.3.1684 — use this one)

Everything below in "the full walkthrough" still works, but it has been
compressed into ONE page served from the game's own domain:

> **https://gamedev-aix.pages.dev/deploy-scores.html**
> (open it INSIDE your wallet's browser — MetaMask app → browser tab)

The page does the compiling, the constructor fields, the key generation and
the read-back verification itself; it is proven headlessly by
`tools/qa/deploy-page.mjs`, which executes the exact transaction bytes the
page produces in a local EVM.  What's left for a human:

1. **Connect** (one tap — the page adds/switches to Hemi; your account
   becomes the guardian and pays two sub-dollar transactions).
2. **Create signing key** (one tap — generated on your device).  Copy the
   private key → Cloudflare dashboard → Workers & Pages → `brotown-server`
   → Settings → Variables and Secrets → Add → name `RELAYER_KEY`, type
   **Secret**, Save.
3. **Deploy** (one tap + one wallet approval).  The page waits for the
   receipt and reads `signer()`/`guardian()` back off the chain — both show
   ✓ or you find out on the spot.
4. **Send gas to the signing key** (one tap + one approval, prefilled
   0.002 ETH).
5. Copy the **contract address** → paste it to a Claude session, which
   commits it to `server/wrangler.toml` (never the dashboard — see the wipe
   warning below) and the auto-deploy switches the feature on.

Prerequisite: a little ETH on Hemi in your wallet.  Optional, any time
later: verify the contract source on explorer.hemi.xyz (settings for that
are in Step 4 of the full walkthrough below — solc 0.8.26, optimizer on,
runs 200).

---

## The full walkthrough (manual fallback — only if the page is unavailable)

Written for someone who has never deployed a contract. Every click is named.
Nothing on the happy path needs a terminal. Total time: about 30 minutes,
most of it waiting for MetaMask popups.

**What you will end up with:** two wallet accounts in MetaMask (one whose key
lives in Cloudflare and signs scores, one that stays yours and can replace
that key if it ever leaks), a contract on Hemi with its source publicly
verified, and a worker that writes real scores to it.

## Step 1 — Create TWO wallet accounts

Both are ordinary MetaMask accounts. They have different jobs; do not merge
them into one.

**The relayer** — signs score attestations and pays their gas. Its private
key goes into Cloudflare, which is exactly why it must be a fresh account
used for nothing else.

1. MetaMask → account menu → **Add account** → name it `brotown-relayer`.
2. Copy its **address** (`0x…`) somewhere handy — you'll need it twice.
3. Copy its **private key** (⋮ → Account details → Show private key). Treat
   it like a password: it goes into Cloudflare in Step 5 and NOWHERE else —
   never into a file in the repo, a chat message, or a commit.

**The guardian** — your personal switch. If the relayer key ever leaks, the
guardian is the one address allowed to replace it (and that is ALL it can
do — it cannot touch scores or funds). Its key never leaves your MetaMask.

1. MetaMask → **Add account** → name it `brotown-guardian`. Your existing
   main account works too, if you'd rather not add one.
2. Copy its **address**. You will never need this account's private key for
   anything in this runbook — the address alone goes into the contract.

## Step 2 — Add Hemi to MetaMask and fund the relayer

MetaMask → network picker → **Add a custom network**:

| Field | Value |
|---|---|
| Network name | Hemi |
| RPC URL | `https://rpc.hemi.network/rpc` |
| Chain ID | `43111` |
| Currency symbol | `ETH` |
| Explorer | `https://explorer.hemi.xyz` |

**The gas token is ETH.** (Hemi also has a HEMI governance token — that is a
different thing and cannot pay for transactions.) Get ETH onto Hemi by
bridging from Ethereum at **bridge.hemi.network**, or withdrawing from an
exchange that supports Hemi directly.

**How much:** load about **$5–10 of ETH**. The math: the most expensive
write the game can make (a brand-new player, all fourteen skills) is
~1.09 million gas, and Hemi's gas prices are L2-cheap — fractions of a cent
per write. $5 covers the deploy plus thousands of score writes. Before
moving on, confirm the balance actually shows in MetaMask **on the Hemi
network, in the relayer account** — an unfunded relayer fails silently by
design, which is the slowest possible way to discover it.

## Step 3 — Deploy the contract (browser only)

1. Open **https://remix.ethereum.org** (an in-browser Solidity IDE — nothing
   to install).
2. In the File Explorer (left edge), create a file `BroTownScores.sol` and
   paste the entire contents of `contracts/BroTownScores.sol` from this repo.
3. **Solidity Compiler** tab (the "S" icon):
   - Compiler: **0.8.26** — exactly. The contract's pragma is pinned to it
     and Remix will refuse anything else, which is intended.
   - Open **Advanced Configurations** → tick **Enable optimization**, runs
     **200**. (Write these down mentally — the explorer verification in
     Step 4 asks for the same two answers.)
   - **Compile BroTownScores.sol.** A green check appears on the icon.
4. **Deploy & Run Transactions** tab (Ethereum logo icon):
   - Environment: **Injected Provider – MetaMask**. A MetaMask popup asks to
     connect — use the **relayer or guardian, either is fine** (whoever
     deploys just pays this one fee), and check the network says **Hemi**.
   - Next to the orange **Deploy** button, expand the arrow. Two fields:
     - `_SIGNER`: the **relayer's address** (not its private key!)
     - `_GUARDIAN`: the **guardian's address**
   - **Deploy** → confirm in MetaMask.
5. The contract appears under "Deployed Contracts" at the bottom left.
   **Copy its address NOW** (copy icon beside the name) — Remix forgets this
   list when the tab closes, and this address is the single output of the
   whole step.

> Wrong `_SIGNER` or `_GUARDIAN`? Deploying again costs cents. What you
> cannot do is edit a deployed contract — check both fields before clicking.

## Step 4 — Verify the source on the explorer

This makes the contract's source code publicly readable at its address —
judges (and players) see the real code instead of raw bytecode, and it
unlocks the explorer's "Write Contract" tab, which the key-leak playbook
below depends on.

1. Open `https://explorer.hemi.xyz/address/<your contract address>`.
2. Find **Verify & Publish** (on Blockscout explorers it's under the
   Contract tab → "Verify & publish").
3. Choose **Solidity (single file)** and answer with the Step-3 settings:
   - Compiler: **v0.8.26**
   - Optimization: **Yes**, runs **200**
   - License: MIT
   - Paste the same complete source you pasted into Remix.
4. Submit. When it flips to verified, the Contract tab shows readable source
   plus **Read Contract** / **Write Contract** panels.

## Step 5 — Wire up the worker

Two values, two very different destinations. Getting these two backwards is
the classic failure, so: the ADDRESS goes in the repo, the KEY goes in the
dashboard.

1. **`SCORES_CONTRACT` (public, lives in the repo).** Paste the contract
   address from Step 3 into this session and it gets committed to
   `server/wrangler.toml` as a one-line PR for you to merge.

   > **Never set this in the Cloudflare dashboard.** Every auto-deploy
   > re-applies `wrangler.toml`'s `[vars]` block wholesale, so a
   > dashboard-set value is silently erased on the next merge to `main`
   > touching `server/**` — and the feature turns itself off with no error
   > anywhere. The same rule covers `CHAIN_ID` and `CHAIN_RPC`, which now
   > also live in the file. **Secrets are the one exception**: Cloudflare
   > preserves them across deploys, which is why the next step IS a
   > dashboard action.

2. **`RELAYER_KEY` (secret, never in the repo).** Cloudflare dashboard →
   **Workers & Pages** → `brotown-server` → **Settings** → **Variables and
   Secrets** → **Add** → name `RELAYER_KEY`, value = the relayer's private
   key from Step 1, type **Secret** → Save.
   (Terminal alternative, if you ever prefer it: `npx wrangler secret put
   RELAYER_KEY` from `server/`.)

The worker deploys automatically when the `SCORES_CONTRACT` PR merges
(`.github/workflows/deploy-worker.yml`). **Never deploy the worker from a
laptop** — see CLAUDE.md for the incident that rule comes from.

## Step 6 — Did it work? (three layers, friendliest first)

1. **The explorer.** Your contract's address page shows the deployment
   transaction immediately, and each score write appears as a `Record Score`
   call as they happen.
2. **The game.** Play a fresh character to **level 4** (the first
   milestone). Within a minute or so of the level-up, the client shows a
   "recorded on Hemi" receipt in the Hero sheet's **Records** section, with
   a link to the transaction. Since v2.3.1682 that receipt is trustworthy by
   construction: the server now waits for the transaction to actually
   CONFIRM on-chain before telling anyone — a reverted or stuck transaction
   shows nothing and retries itself on the next level-up.
3. **The status page** (diagnosis, if 1–2 disagree with you). The worker
   answers `GET /api/admin/chainstatus` with everything at once: whether
   both values are set, whether real contract code exists at the address,
   whether the contract's signer matches the key in Cloudflare, the
   relayer's ETH balance, and the last write. It needs the `ADMIN_KEY`
   bearer token, so the easy path is: **ask a Claude session to check
   chainstatus** and it will read it for you. (Direct form, for reference:
   `curl -H "Authorization: Bearer <ADMIN_KEY>"
   https://<worker>/api/admin/chainstatus`.)

   | `problem` says | It means | Fix |
   |---|---|---|
   | `contract-malformed` / `contract-zero` | `SCORES_CONTRACT` isn't a real address | Re-paste the address from Step 3 |
   | `no-contract-code` | The address has no contract on it (typo, or wrong network) | Check the address on the explorer; redo Step 5.1 |
   | `signer-mismatch` | The contract's signer ≠ the key in Cloudflare | Re-check Step 1/5.2 — or rotate the signer (below) to the address Cloudflare holds |
   | `missing: RELAYER_KEY` | The secret was never saved | Step 5.2 |
   | balance `0.0000` | The relayer has no gas | Step 2 |

## Cost

Nine transactions per character, lifetime. Measured against the compiled
contract in a local EVM (`tools/dev/evm-conformance.mjs`): a first-ever
fourteen-series write costs **1,088,021 gas**; later checkpoints send only
what changed, about **23,000**. On Hemi these are fractions of a cent. A
thousand players reaching level 10 is two thousand transactions — still
pocket change. The milestone list itself is the spending cap.

## When something goes wrong

### The relayer key leaks

Blast radius: the gas in that wallet, plus the ability to sign FAKE scores.
No player funds exist anywhere in this system, and no one — not even the
leaked key — can erase or roll back a score already written. Since
v2.3.1682 this is a rotation, not a redeploy:

1. MetaMask → **Add account** → `brotown-relayer-2`. Copy its address and
   private key.
2. Open your contract on the explorer → **Write Contract** → **Connect
   wallet** as the **guardian** → `rotateSigner` → paste the NEW relayer
   address → Write → confirm. The old key is now worthless at this
   contract: anything it signs is rejected.
3. Cloudflare dashboard → `brotown-server` → Settings → Variables and
   Secrets → edit `RELAYER_KEY` → paste the NEW private key.
4. In MetaMask, send the old relayer account's remaining ETH to the new one.

History is untouched throughout; scores keep flowing under the new key.

### A transaction seems stuck

Symptom: chainstatus shows the config healthy but a write never confirms.
Since v2.3.1682 nothing corrupts — an unconfirmed write is simply not
recorded and retries at the next level-up. If the relayer's transaction
queue itself is jammed (visible as a "pending" transaction for the relayer
address on the explorer), clear it from MetaMask: select the relayer
account → send **0 ETH to itself** → in the fee screen pick a higher/faster
fee → confirm. That replaces the stuck transaction and unclogs everything
behind it.

### The guardian wallet

It is the only thing that can replace the signing key, so treat its seed
phrase like the valuables drawer: written down offline, never typed into
anything except MetaMask itself. If you lose it, nothing breaks — you just
lose the ability to rotate, putting you back where the contract was before
v2.3.1682 (a future key leak would then need a redeploy).

### Adding a skill later

No contract change, no redeploy — that is the whole point of the
name-addressed design. Two lists to extend, both in this repo:
`LIFE_SKILL_KEYS` in `server/src/chainscore.js` (what gets attested) and
`CATS` in `src/ui/mobile/dash/LeaderboardPanel.jsx` (what the in-game board
shows). The chain accepts the new name the first time the server signs it.

### Testnet, if you ever want a rehearsal

Hemi Sepolia: chain ID `743111`, RPC `https://testnet.rpc.hemi.network/rpc`,
free gas from the Hemi faucet. Set `CHAIN_ID = "743111"` in
`server/wrangler.toml` (NOT the dashboard — same wipe rule as above), deploy
the contract there via Steps 3–4 on that network, and remember the repo has
ONE worker: pointing it at testnet points production at testnet, so flip
`CHAIN_ID` back in the same sitting.
