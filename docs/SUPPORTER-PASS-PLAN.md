# The supporter pass: plan and decisions (on the backlog, v2.3.3256)

> Owner, 2026-10-14: *"I was thinking the 'monthly supporter pass' would just
> be $2 for the month. I wanted this to be a very simple contract where if you
> send stablecoins to it it will let your account (with up to your 10
> characters) have access for a 30 day period where the timer begins when
> activation occurs. I want the contract to be unsophisticated though because
> it needs a low surface area to withstand Sophisticated AI cyberattacks."*
>
> Then, on the recommendation below: *"Yeah USDC on hemi. I think I should
> create an address specifically intended for supporter pass payments so I
> haven't done that yet. It can be put on the backlog though. Dont ship any
> caps yet"*

## Status

**On the backlog. Nothing is built.** It waits on one thing: the owner's own
dedicated receiving address for pass payments.

**No play caps.** The owner: "Dont ship any caps yet". Free play has no time
limit, and the 2-hours-a-day idea in `docs/WORLD-ARCHITECTURE.md` §11 stays
unbuilt.

## Decided

| What | The owner's answer |
|---|---|
| Price | $2 for 30 days |
| Paid in | USDC on Hemi (chain 43111) |
| When the 30 days start | When the player **activates** the pass, not when they pay |
| What it covers | The account, up to 10 characters |
| Play caps | None for now |
| Receiving address | A new address made only for pass payments (not made yet) |

## The design: no contract at all

Recommended to the owner on 2026-10-14. The owner chose the coin on that
recommendation, and the address is pending.

**The smallest attack surface is no code on the chain.** A player pays with a
plain USDC transfer of 2 USDC from their linked wallet to the pass address. The
game's server READS that payment on the chain, the same way the Hemi Bro check
reads the collection (`server/src/onchain.js`, v2.3.1576 / v2.3.3255):

- **Nothing to attack on the chain.** There is no contract: nothing deployed
  that lives forever and can't be patched.
- **The money never touches the game.** It goes straight to the owner's
  address, and the server never holds a key to it. A full break-in to the
  game's server could hand out free passes, but it could not move a cent.
- **Players never "approve" a spender**, the step most wallet drains abuse. It
  is one ordinary transfer.

### The account is the wallet

The game has no accounts. Each character is its own login key, and the
10-character limit is per DEVICE (`src/networking/charRoster.js`). So the
wallet becomes the account:

- Each character links to the wallet once, with the same free signature as the
  Hemi Bro check (`bro_link:<pid>`, v2.3.3255).
- A wallet links at most 10 characters.
- The pass belongs to the wallet, so every character linked to it has the pass.

### Buying, holding, activating

1. **Buy.** The game opens the player's wallet with the transfer already filled
   in, from the linked wallet: USDC `transfer(pass address, 2000000)` (USDC has
   6 decimals). The player approves once.
2. **Credit.** The phone tells the server the transaction's hash. The server
   checks it (below) and credits ONE pass to the wallet, held unused.
3. **Activate.** The player taps Activate when they want it, and the 30 days
   start then. Activating while a pass is running adds 30 days to its end, so
   nothing is wasted.
4. **"Check for my payment".** This covers a phone closed before it told the
   server: the server looks for transfers from the linked wallet to the pass
   address in recent blocks.

### What the server checks (all of it, or nothing is credited)

- **The transaction succeeded** (its receipt says so) and has enough
  confirmations.
- **The transfer came from the REAL USDC contract on Hemi**, at its exact
  address, pinned in the server. Anyone can make a token called "USDC".
- **From the linked wallet, to the pass address.** The pass address is pinned
  in the server's own config and never taken from a phone.
- **At least 2 USDC.**
- **Never credited before.** The (transaction hash, log index) pair is stored
  once, under the repo's opId rule (ARCHITECTURE-HANDOFF rule 5).
- **A chain the server can't reach credits nothing.** The player tries again
  later.

### Safety switches

- `caps.supporterPass` on the server; `supporterPass: false` in the live flags
  turns it off.
- The phone shows the Buy button only against a worker that advertises the cap
  (rule 19).

## Before it can be built

- **The pass address.** The owner makes a dedicated one. A hardware wallet or a
  multisig is safest. Only its PUBLIC address goes in the server's config.
- **USDC's contract address on Hemi.** Confirm it from Hemi's docs or explorer
  before building. The build sandbox can't reach Hemi, so it was never checked
  from here.

## Known limits, to say plainly in the game

- **Pay from your linked wallet.** A payment withdrawn from an exchange comes
  from the exchange's wallet, so it can't be matched to a player. A mistaken
  payment would be credited by hand (an admin tool).
- **A little ETH on Hemi is needed** to pay the transfer's network fee.
- **With no play caps, the pass unlocks nothing yet.** Until the owner adds caps
  or perks, it's a way to support the game, plus a "Supporter" mark if wanted.
  That's the owner's call.
- **Sales tax or VAT can still apply** to a digital pass paid in crypto.

## Build order, once the address exists

1. **The wallet as the account.** Link up to 10 characters, building on
   `bro_link`.
2. **The pass.**
   - Its record: `supporter:<wallet>`, registered in ARCHITECTURE-HANDOFF
     rule 2.
   - Buying by transaction hash, Activate, and "Check for my payment".
   - The kill switch.
   - A server suite and a phone scenario.
3. **A "Supporter" mark on the profile**, if the owner wants one.
4. **Play caps only if the owner asks for them.**
