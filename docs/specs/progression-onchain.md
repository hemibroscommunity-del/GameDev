# On-chain score attestations (Hemi) — spec + operator runbook

**Version:** v2.3.1664 · **Contract:** `contracts/BroTownScores.sol` ·
**Server:** `server/src/chainwriter.js` (signing/encoding),
`server/src/chainscore.js` (game integration) ·
**Suites:** `server/test/chainwriter.test.mjs`, `server/test/chainscore.test.mjs`

## What this is

BroTown writes a small, permanent, public record of player milestones to
**Hemi mainnet (chain 43111)**. Before this, the game's only chain contact was
read-only: `broverify.js` checks Hemi Bros NFT ownership to grant a cosmetic
badge. Nothing was ever written.

**What is attested:** character level and kill count. Both are
server-computed — level from `_prog3Recompute` (the sum of trained skills),
kills from `svKills`, incremented in `_resolveMonsterKill`, the same function
that pays the XP and drops the loot.

**What is deliberately NOT attested:** gold earned, playtime, dungeon clears.
Those leaderboard columns are still client-reported, and putting a
client-reported number on a permanent public ledger would make it *look*
verified while being worth exactly the client's word. Widen the attestation
only when those become server-owned.

**When:** on level milestones — 5, 10, 25, 50, 100, 150, 200, 250, 300. Nine
transactions per character, for the lifetime of the account. This is not a
per-kill ledger and must not become one; gas is real.

## The design decision worth defending

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

## Failure posture (load-bearing)

A chain problem must never be a game problem. Every path is fire-and-forget
with the failure swallowed: RPC outage, unfunded relayer, missing secret,
reverted transaction — all end with nothing stored, the player noticing
nothing, and a retry on the next level-up. **Nothing in a combat path awaits
the chain.** The suite pins this explicitly.

While `SCORES_CONTRACT` or `RELAYER_KEY` is unset, the feature is simply off.

---

# Operator runbook

Do the testnet rehearsal first. It costs nothing and catches a wrong address
or an unfunded wallet before mainnet does.

## Step 1 — Create the relayer wallet

Make a **brand-new wallet used for nothing else**. It signs score
attestations and pays their gas. It never holds player funds, and the
contract has no withdrawal function, so the only value at risk is the gas you
put in it.

1. In MetaMask: account menu → **Add account** → name it `brotown-relayer`.
2. Copy its **address** (`0x…`) — you'll fund this.
3. Copy its **private key** (⋮ → Account details → Show private key). Treat
   this like a password: it goes into Cloudflare and nowhere else. Never
   paste it into a file in the repo, a chat, or a commit.

## Step 2 — Add Hemi to MetaMask and fund the relayer

| | Mainnet | Testnet (rehearsal) |
|---|---|---|
| Network name | Hemi | Hemi Sepolia |
| RPC URL | `https://rpc.hemi.network/rpc` | `https://testnet.rpc.hemi.network/rpc` |
| Chain ID | `43111` | `743111` |
| Explorer | `https://explorer.hemi.xyz` | (testnet explorer) |

Send a **small** amount of gas to the relayer address — a couple of dollars
is far more than nine transactions per player will need. For testnet, use the
Hemi faucet.

## Step 3 — Deploy the contract (browser, no terminal)

1. Open **https://remix.ethereum.org**.
2. In the File Explorer, create `BroTownScores.sol` and paste the contents of
   `contracts/BroTownScores.sol` from this repo.
3. **Solidity Compiler** tab → compiler **0.8.20 or newer** → **Compile**.
4. **Deploy & Run** tab → Environment: **Injected Provider – MetaMask** →
   confirm MetaMask is on **Hemi** (or Hemi Sepolia for the rehearsal).
5. Next to the orange **Deploy** button there is a `_SIGNER` field. Paste the
   **relayer's address** (the `0x…` from Step 1, *not* the private key).
6. **Deploy**, confirm in MetaMask, and copy the deployed contract address.

> The signer is immutable. Deploying with the wrong address means deploying
> again — cheap, but check it now.

## Step 4 — Configure the Worker

1. `server/wrangler.toml` → set `SCORES_CONTRACT = "0x…"` to the address from
   Step 3, and commit that (it's public data).
2. Add the private key as an **encrypted secret** — never in the repo:
   - Cloudflare dashboard → Workers & Pages → `brotown-server` → **Settings**
     → **Variables and Secrets** → **Add** → name `RELAYER_KEY`, value the
     private key, type **Secret** → Save.
   - Or: `npx wrangler secret put RELAYER_KEY` from `server/`.
3. For the testnet rehearsal only, also add `CHAIN_ID = 743111`. Remove it
   for mainnet (it defaults to 43111).

Deploys happen automatically on merge to `main` (`.github/workflows/deploy-worker.yml`).
**Never deploy the worker from a laptop** — see CLAUDE.md.

## Step 5 — Verify

1. Play until a character reaches **level 5** (the first milestone).
2. The client shows a receipt with a block-explorer link.
3. Open the link: the transaction should be a `recordScore` call to your
   contract that succeeded.
4. In Remix, expand the deployed contract and call `playerCount` — it should
   read `1`. Call `scores` with the player key to read the row back.

If nothing happens, the feature failed **silently by design**. Check, in
order: is `SCORES_CONTRACT` set and non-empty; is `RELAYER_KEY` present and a
valid 32-byte hex key; does the relayer address hold gas on the right
network; does the Worker's `CHAIN_ID` match the network the contract is on.

## Cost

Nine transactions per character over its whole lifetime. On an OP-Stack L2
like Hemi these are fractions of a cent. A thousand players reaching level 10
is two thousand transactions — still trivial. If you ever want a hard ceiling,
add a daily cap in `chainscore.js`; there is intentionally none today because
the milestone list already bounds it.

## If the relayer key leaks

The blast radius is the gas in that wallet plus the ability to sign fake
scores. There is no player-fund exposure and nothing to drain. Response:
deploy a new contract with a new signer address and update
`SCORES_CONTRACT`. Old attestations stay on-chain (that is the point); new
ones are written under the new key.
