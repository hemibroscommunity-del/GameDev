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

---

# The item wager, double or nothing (v2.3.2619)

Owner: *"you should be able to wager as many items as you want for double or
nothing too. Same 45% chance win odds."*

`ps.inventory` is a `{itemKey: qty}` map of **stackables**, so "double" is
literally `qty * 2` on a win and the stack removed on a loss. No unique gear is
minted, so the gear-provenance ledger (`gearprov.js`) is never touched — the
wager is confined to the stackable bag and refuses anything else.

| | |
|---|---|
| Player wins | **45%** — same odds as the coin, as asked |
| Win | every staked stack **doubles** |
| Loss | every staked stack is **removed** (a partial stake leaves the remainder) |
| Caps | 24 distinct stacks per wager, 10000 per stack |
| Cooldown | shares `_lastAceFlipAt` with the coin flip |

### The stake is the server's bag, not the request

Rule 16. The request only *names* stacks and asks for quantities; what is
actually risked is `min(asked, held)`. A key the player does not hold is
ignored entirely. Asking for 999 oak when you hold 3 stakes 3.

### Proto safety

**The keys come off the wire into a plain `{}`** — CLAUDE.md rule 4, fixed
three times in one day (duel.away v2.3.1175, party meta v2.3.1185, amulet tiers
v2.3.1192). A wager naming `__proto__` would silently no-op the write and read
back a truthy qty from `Object.prototype`. Every key is checked with
`hasOwnProperty` against the server's own inventory and the three dangerous
names are rejected outright. `gamble.test.mjs` §17 pins it, including that
`Object.prototype` is left unpolluted.

### Wire surface

| Type | Direction | Payload |
|---|---|---|
| `ace_item_flip_request` | client → server | `{items: {key: qty}}` |
| `ace_item_flip_result` | server → client | `{won, items, kinds, total}` — **privileged** |
| `state_sync.caps.aceItems` | server → client | `true` |

`caps.aceItems` is its own flag, not a widening of `aceFlip`: a v2.3.2618
worker advertises the coin flip and has no case for this type, so it would
rebroadcast a bag full of item keys to the room while settling nothing.

---

# The hall of fame (v2.3.2619)

Owner: *"leaderboards of biggest wins and biggest losses (single). Have it list
the player pfp next to the record too."*

Two boards of ten: the biggest single **win** and biggest single **loss** at
the coin flip. Stored under one bounded `ace_board` key in GameRoom storage —
not the Leaderboard DO, because the board is written inside the same event that
settles the flip and a cross-DO write there would be an await that *opens* the
input gate (rule 9).

**One row per player per board**, keeping only their best — otherwise one rich
player fills all ten rows and it stops being a leaderboard. `amount` is always
positive; which board it lands on is the outcome, so a biggest loss of 900
reads as 900, not −900.

The flip handler is `await`ed by the router (like `join`, the arena and trade2
handlers) because the board is a read-modify-write: a storage await holds the
input gate closed, which is what stops two players' flips interleaving and
losing a record.

### The pfp is a look, not an image

The client already renders any player's portrait from their cosmetics through
one shared recipe (`portraitOptsFromPeer` → `portraitDataUrl`, as
`InspectPlayerPanel` and the trade window do). A record therefore stores the
`look` snapshotted off `char:<pid>` and the client draws it with that same
recipe: no image bytes in storage, no second portrait path to drift, and a row
still renders for a player who is offline or has since changed clothes.
Snapshotted rather than looked up live **on purpose** — the board is a record
of a moment, and the face beside it should be the face that took the bet.

**The stored look is in WIRE KEYS and must be renamed first.** `char:<pid>.look`
is built from `JOIN_COSMETIC_KEYS` — the short names `sk`, `hr`, `hw`, `fh`,
`st` — while `portraitOptsFromPeer` and `portraitHasSubject` both read the long
renderer fields (`skin`, `hair`, `headwear`, `facialhair`, `shirt`). Handing the
stored look straight to them fails every test in `portraitHasSubject`, so every
row would have shown a letter tile forever and the feature would have looked
simply broken rather than wrong. `peerCosmeticsFromWire` is the one rename
table for exactly this, and is what the panel uses. A row whose look is genuinely
empty (a legacy record) falls back to a letter tile, which is the honest answer
rather than a default body that is nobody.

### Gold only

The boards are measured in **gold**, so an item wager does not appear on them —
an item count and a coin amount are different units and one board cannot hold
both honestly. The item handler carries a comment saying so, as a deliberate
non-action, so the next reader does not "fix" it by pushing a count onto a board
of coins. An items board would be its own pair of lists.

### Wire surface

| Type | Direction | Payload |
|---|---|---|
| `ace_board_request` | client → server | `{}` |
| `ace_board` | server → client | `{wins:[], losses:[]}` — **privileged**; a forged one would let any client write the names, faces and numbers on a public record |

Pushed on join (beside the jackpot), after every coin flip, and on request when
the Records tab is opened.

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
