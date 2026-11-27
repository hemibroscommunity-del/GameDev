# Diego sells a lost shield (v2.3.6800, card SHOP)

The owner, 2026-11-26: *"Also make the store keeper sell shield I lost
mine"*. A player's only first shield is the Pine Shield `tut_1` gives on
accept, and nothing crafts one (the forge was removed). A shield can leave a
player three ways: an auction-house listing, a death in No man's land, or
the stash cap's cut at join. After any of them the player had no way to get
one back. Now Diego sells one back.

## The rule

- **What**: the very piece `tut_1` mints. `SHIELD_ITEM` (`server/src/shop.js`)
  is read off the quest table's shield row. Its shape comes from the one
  mint, `questShieldMint` (`server/src/quests.js`), which the quest's grant
  calls too. A provenance row (`src: 'shop'`) gives it its `gid`, the way
  the quest's piece gets one (`src: 'quest'`).
- **Price**: 100 coins, the tools' price, burnt (gold road `shop_shield`).
  The worker's number; any price a message names is never read.
- **To whom** (`shieldWhyNot`, a pure function): a player a quest gave a
  shield (`shieldEarned`: a shield in a quest's `grantOnAccept` once it is
  accepted or turned in) who owns NONE, i.e. nothing on the arm (`ps.shield`)
  and nothing in the bag (`ps.shieldStash`). The reasons are in lower case:
  `off` (switched off), `have` (owns one), `quest` (not yet given one), and
  at the buy `coins` (short of coins).
- **A shield at the auction house**: a listed shield is in escrow and is in
  neither list, so, by the tool shelf's own rule (what you hold), it does not
  count. The player may buy a second Pine Shield for 100 burnt coins. That is
  not a hole: no road pays coins for a shield (Diego buys none), and the
  piece is always the tier-1 one.
- **Where it lands**: in the BAG, through the stashes' door (stash road
  `shop_shield`), which is where the quest's piece ends up too. The worker
  puts that one on `ps.shield`; the phone then moves it to its bag and
  reports the arm empty (`wsClient.js` and `shieldwear.js`). `shop_result`
  carries the piece (`shield`), and the phone adds it to its copy of the bag
  once (`gameEvents.js`, only with the cap).
- **A lost answer loses nothing** (the gatekeeper's hold, sitting 71: the
  phone learned of the piece ONLY from `shop_result.shield`, so a lost answer
  left the player 100 coins down, the shield unseen, and every buy refused
  "You already have one"). The worker is the authority, so the phone now
  adds, by `gid`, every recorded shield the worker holds for it that it holds
  nowhere (`src/game/shieldAdopt.js`; add, never take; a piece with no id is
  never adopted, and an old copy with no id and the same signature counts
  as held): from `player_state.shieldStash` (wsClient.js, after the worn
  shield; the join's full state and a re-sent request's resend carry it),
  from `shop_result.shield`, and from `held`, which a shield's "have" quote
  and refusal now carry (`shop.js` `shieldHeld`: the arm's and the bag's
  pieces with an id, at most 48). After a "have" adopts a piece the phone
  says its arm again (`shieldWear.js`), as the worn-shield adoption does.
  Only with the cap; `shieldshop: false` stops this too (the worker keeps
  the piece, and the phone sees it when the switch is back).
- **One write**: the give, the take, the provenance row and the save are one
  synchronous run with no await between, and the record is saved before
  `shop_result` and `shop_state` go. A second send of the same buy is refused
  `have` (the first one's shield is in the bag), and the action door's
  request id acts once (`reqonce.js`).

## Either side ships first

- Cap `shieldshop`, on its own line of `join.js`'s caps above `accuracy`,
  and in `CAP_GATES`. The panel shows the row only with the cap, and only to
  a player who holds no shield, worn or spare. An older worker never lists
  it; an older game ignores a row it does not know (`shield: true`, no
  count).
- Kill switch: `shieldshop: false` in the live flags (present and false is
  off; absent is on) takes it off the shelf and refuses every buy.

## The page

`ShopkeeperPanel.jsx` draws the row as it draws a tool's: the bag's own
shield picture (`/icons/items/shield.webp`, no new art), its name and
"100g". It uses the tools' words ("A replacement, if yours was lost", "You
have one", "Mayor Bro's quest gives the first"), which already go through
`deskWords()`. The buy leaves through `act('shop_buy')`.

## Tests

- `server/test/shop.test.mjs`, the section "A LOST SHIELD, BOUGHT BACK". It
  runs in a running room, on a v1 and a v2 phone. It covers: sold; refused
  (worn, spare, never given, 99 coins, switched off) with nothing moved; the
  same buy twice; no shield bought back; one synchronous run; the cap's own
  line, read off the syntax tree.
- Each mistake in the card was planted and seen red: an await between the
  give and the take; the road named `shop_tool`; the owns-one check reading
  only the arm; the price read from the message; the switch read as "true is
  on"; the cap put on the old long line.
- A hand mutation pass over the added lines of `shop.js` left two survivors,
  both unreachable today: the turn-in branch of `shieldEarned` (no shipped
  quest gives a shield on turn-in) and the refusal when the stashes' door
  refuses the give (the bag is empty when the rule says yes, so its cap
  cannot refuse).
- `tools/qa/mp/mp-shieldshop.mjs` plays it on a phone: the row and its
  price, the buy, the bag, the row gone after, and no row for a character
  with a shield.

## Seen, not mended here

Ways a shield leaves without the player choosing: the join's stash-cap cut
(`gearstash.js`) and a worn shield listed off the arm (`gearprov.js`). These
are reported to the orchestrator, not changed here.
