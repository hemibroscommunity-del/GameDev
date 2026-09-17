# Ace's coin flip (v2.3.2618)

Owner: *"Add a new dialog for him. You can triple your money or lose 3x of
your bag (you can only bet what you can lose 3x of). The odds are 55% him
winning, 45% you winning."*

A second gambling game, run by **Ace** (NPC `card_sharp`, plate "Ace /
Gambler") on the town plaza. It is not a building and has no Gambling Den
attached to it — see *Why it is not in the Gambling Den* below.

## The bet

| | |
|---|---|
| Minimum stake | 10g (`ACE_FLIP_MIN_STAKE`) |
| Maximum stake | `floor(coins / 3)` (`aceFlipMaxStake`) |
| Player wins | 45% (`ACE_FLIP_WIN_CHANCE`) — coin lands blue heads |
| Ace wins | 55% — coin lands red skull |
| Win pays | `+3 × stake` |
| Loss takes | `−3 × stake` |
| Cooldown | 2000ms between flips |

**The bound is the LOSS, not the stake.** A stake of S risks 3S, so the gate
is `3S <= coins`. That is what the owner's "you can only bet what you can lose
3x of" means, and it is why a loss can never drive a bag below zero without a
clamp. A handler gating on `stake <= coins` would let a player with 100g stake
100 and owe 300; `gamble.test.mjs` pins that case explicitly, along with the
boundary one (a stake of exactly `coins/3` is legal and loses to exactly 0).

**The edge is in the coin, not the payout.** The payout is symmetric at 3×
both ways; only the odds are tilted. EV = `0.45·3S − 0.55·3S = −0.3S`, a 10%
rake on the amount at risk.

## Wire surface

| Type | Direction | Payload | Notes |
|---|---|---|---|
| `ace_flip_request` | client → server | `{stake}` | Sent as a `broadcast` event, same shape as `gamble_request`, so it needs no `channelShim` allowlist line |
| `ace_flip_result` | server → client | `{won, stake, risk, delta}` | **Private** (sent on the asking socket only) and listed in `PRIVILEGED_EVENTS` |
| `state_sync.caps.aceFlip` | server → client | `true` | Deploy-order gate |

`delta` is signed and authoritative. The **coins move on the `player_state`
echo**, not on this event (ARCHITECTURE-HANDOFF rule 20) — `ace_flip_result`
only says which way the coin fell, so the panel can play the right strip.

### Why it is privileged

`ace_flip_result` is in `PRIVILEGED_EVENTS` for the same reason
`gamble_result` is, and with worse consequences if it were not: the panel
animates a **win** off this event, so a forged one broadcast at the room would
show every player a payout that no coins echo backs.

### Why its own cap flag

`caps.aceFlip` is narrow on purpose and is **not** a widening of
`caps.gamble`. A v2.3.1124 worker advertises the Gamble Hall and has no case
for `ace_flip_request`, so the message would fall to the default branch and be
**rebroadcast to the room while settling nothing** — the player would watch a
coin land and never be paid. The client therefore gates both its button and
its send on `aceFlip`; against an older worker Ace says he is not taking bets
today. Against a new worker, an old client simply never sends one. Safe in
either deploy order (rule 19). This is the `caps.gems` lesson (TRAPS #9).

## Settlement shape

One event, one mutation, nothing escrowed — rule 7 (gambling is an
instantaneous single-event mutation, so validate-at-commit; a deploy loses
nothing) and rule 8 (one `coins` delta, no debit…credit crash window, so no
sweep is needed). There is no `opId`: a resent request is legitimately a new
flip, bounded by the 2s rate limit, exactly as the Gamble Hall's is.

`ps._lastAceFlipAt` is deliberately **not** in the `_saveRpg` field list, so
the rate-limit window is in-memory only and a deploy reset loses nothing.

Invalid requests are **ignored silently** rather than answered: the panel's
own gates keep a legitimate client from sending one, and answering an invalid
request turns the handler into a probe oracle.

## Client

- `src/ui/mobile/aceFlipBus.js` — state outside React, because the thing that
  opens the dialog (the NPC proximity check in the game loop) and the thing
  that resolves it (a WebSocket handler) both live outside the component tree.
- `src/ui/panels/AceFlipPanel.jsx` — the dialog. It sends a stake and draws
  what comes back; it never rolls and never credits.
- Opened by **both NPC doors** (walk-up proximity and tap), sharing the one
  `_npcProxLatch` — without the latch the proximity opener reopens the dialog
  the instant you close it while still standing on him (the v2.3.1701 lesson).

### The coin

Two 11-frame strips at 128×192, cut by `tools/import_coin_flip.py` from the
owner's contact sheets: `coinflip-win.webp` (lands blue heads) and
`coinflip-lose.webp` (lands red skull).

Played as a **CSS sprite walk** — one `background-position` step per frame off
one image — rather than a GIF or a per-frame `<img>` swap, and it **stops on
the last frame** because the last frame *is* the answer. While the request is
in flight the coin spins through the **edge-on frames only** (1–6): the face
frames are the answer, and showing one before the server has spoken would be
the panel guessing.

Both strips are registered in `NPC_DIALOG_FX` (`src/rendering/npcSprites.js`)
and ride the intro gate, per CLAUDE.md's animation-preloading law. They are
DOM `<img>`/CSS backgrounds rather than Pixi textures, so the preload warms
the HTTP cache — which is the point: fetching the win strip at the moment the
coin lands is exactly the first-use hitch the law forbids.

## Why it is not in the Gambling Den

The obvious home was the GAMBLING DEN building. **It does not exist as art.**
Its `TOWN_BUILDINGS` row is a collision rectangle whose own header says the
rectangles need not line up with the town image; `town_v17` is a bare cobble
plaza with no buildings painted into it; and every building a player can see
is a prop in `worldProps.js` — which has a mayor's house, forge, general
store, fountain, market stall, bank and enchanter, and no den. Ace carries the
game himself, on the plaza, where he can be walked into.

## Tests

`server/test/gamble.test.mjs` §7–13 (the Hall's suite, extended rather than
duplicated — same mixin, same wire family):

7. `caps.aceFlip` advertised in `state_sync`.
8. Forced win pays `+3×`; forced loss takes `−3×`; exactly one result each.
9. **The bound is the loss** — a stake affordable as a stake but not as a 3×
   loss is refused; the maximum legal stake loses to exactly zero, never below.
10. Stake clamps: under minimum, zero, negative, non-numeric.
11. Rate limit; 12. dead players; 13. a forged `ace_flip_result` is not
    rebroadcast.
