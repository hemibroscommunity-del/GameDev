# The review: money, accounts and players' safety (card RV, v2.3.5800)

Card RV (`docs/plan/cards/RV.md`), PR 1: the review written down. **No code
changes in this PR.** Read on `main` at 297b098d8 (2026-11-17, with every
card SEC PR merged and card K2's PRs 1 to 4, 6 and 7).

**How it was read.** Four readers, one an area (the doors' roads; the
settlements between players; accounts; players' safety), each following
every row from the wire door (`server/src/wire/door.js`) through
`index.js` `_onMessage` or `routeHttp` to its handler and its door. A
finding marked **shown** was played on the in-process test room
(`server/test/testroom.mjs`) by a throwaway script kept outside the
repository: the fix PR's own suite is the proof that stays (the card: no
proof tools beyond that suite). A finding marked **read** is from the code
alone. Nothing was run against the live game or any deployed copy.

**What was read: all of it the card names.**

- Every road of card E's census: `GOLD_ROADS` (47 rows), `BAG_ROADS` (71),
  `STASH_ROADS` (36), each from its caller to its door; `PLAYER_ROADS` (14
  settlements) and `ESCROW_PLACES` (12 places). A script checked that every
  row's name is in the coverage below (none missing).
- Every account and social row of the wire table: the socket rows about
  joining, keys, characters, names, reports, chat, whispers, friends,
  parties, clans, alliances, duels, spars, trades, the arena, mutes and
  presence; all 26 relay rows; the HTTP routes about accounts, the owner's
  routes (the whole `/api/admin/*` and `/api/botstat*` family answers
  through `admin.js` `_adminFetch`, which asks `_adminAuth` before any
  route: a digest compare with a time-out an address), the store, market,
  arena, board and feedback reads. The socket rows not named in the
  coverage are money rows read by their road (`shop_buy`, `forge_weapon`,
  ...: part A.1) or rows outside the three areas (combat, movement,
  harvesting).
- The first red team's lists (RT-1, RT-3, on their own branches) were read
  again against `main`: most of RT-3's safety rows are closed since (trade,
  friend and party invites paced, MOD; names held, `charname.js`; the crash
  feed keyed; a board's `lastSeen` to the hour). What is still open is
  below.

**How bad.** High: value copied or taken from another player, or another
player's account or record touched. Medium: a player harmed, or a bounded
loss of value. Low: hygiene, a narrow window, or words.

**Whose.** *RV*: fixed by this card, in the PR named in part 2. *Held*:
already held (the test or guard named). *Card X*: in a file another card
holds; written here and sent to the planning session, not fixed by RV.
*Owner*: a cost, what a player sees, or a rule of play.

## 1. The findings

### Money

| Id | What goes wrong | File and function | How bad | Whose |
|---|---|---|---|---|
| MS-2 | The General Store's order book files a SELL under the category, kind and tier the request names, not the weapon's own. A copper blade filed as "godly" fills a waiting godly buy order at once, at the buyer's price: the buyer pays thousands for a copper blade, with no step to look. The honest Exchange panel can do it by mistake too (the tier row is picked apart from the weapon). Known since v2.3.1971 ("written up rather than guessed at"), never closed. **Shown.** | `market.js` `_mktPlaceOrder` (the sell branch) | high | RV (PR 2) |
| MS-4 | A General Store cancel or expiry gives the escrow back, then deletes the order in a later write. A restart between the two leaves the order on file with only its `refund:` stamp to say so; the stamp prune (48 h) does not wait for it (`_mktSettleWait` waits for a crossing's notes only), so after a quiet 48 h the order comes back on the book and a second cancel pays it again: a weapon or the gold twice. **Shown.** | `market.js` `_mktCancelOrder`, `_mktSweep`, `_mktScanPage` | high (rare: a deploy at one await, then 48 h with no market request) | RV (PR 2) |
| MD-1 | The chest on a rise pays once a character only by its `oplog:` stamp, which the prune deletes at 48 h; then the same character opens it again: 400 coins every two days, and every free throwaway character takes it too (TRAPS §146: "the oplog is not the record"). **Shown.** | `risechest.js` `_handleRiseChest`; `inbox.js` `_opPruneMaybe` | medium | RV (PR 3); the quest gate the daily spin has (`_dqUnlocked`) is a rule of play: Owner |
| MS-3 | Goods credited in a player's five dying seconds land in the bag and the respawn's wipe takes them. The trade window's confirm does not refuse a dying side (opening one does), so a player who readied, then died to a monster, pays and keeps nothing. Any live goods credit then (an Auction House leg, the mail) is lost the same way. The death-pile pickup has had this check since v2.3.3476. **Shown.** | `trade2.js` `_handleTrade2Confirm`; `inbox.js` `_creditLiveTogether`, `_creditPlayerOnce` | medium | RV (PR 4) |
| MS-1 | No man's land: the victim's purse and stashes are emptied and saved in one write, the killer paid in later fire-and-forget credits. A restart between them destroys the loot (nothing copied: the killer is never paid). **Shown.** | `nomansland.js` `_nmlOnDeath` (its `credit`) | medium | RV (PR 5) |
| MS-6 | Three more leftovers known only by their stamps, which the prune does not wait for: a duel's pot (`duelpot:`), an arena's entries (`arenapot:`), a trade window's weapons (`trade2wpn:`). Their sweeps run on joins; a leftover no sweep reaches in 48 h is refunded on top of what was paid. **Read.** | `duel.js` `_duelEscrowSweep`; `gladiator.js` `_arenaEntrySweep`; `trade2.js` `_trade2WpnSweep` | low | RV (PRs 6, 9) |
| MD-2 | The same gap open only to a restart: the daily spin's pot, the login spin and a season's tiers save their "paid" mark in a later write than the credit. A restart between, then 48 h, pays again. **Read.** | `dailyrewards.js` `_spinPay` and `_handleSeasonClaim`; `loginspin.js` `_loginSpinSettle` | low | RV (PR 10) |
| MS-5 | An Auction House offer's "Yes" does not ask about a bid half made; a bid whose request failed after taking the gold is then never given back. **Read.** | `storeoffer.js` `_stOfferReply` | low | RV (PR 9) |
| MD-3 | The jackpot deposit checks the purse, awaits twice, then takes with no second check (the door clamps a short take, so tickets for less gold). Nothing can come between today: every await is storage. **Read.** | `cadence.js` `_handleJackpotDeposit` | low | RV (PR 13) |
| MD-4 | The gold and bag doors clamp a take that is short to 0 rather than refuse it. Every caller checks first today. **Read.** | `gold.js` `_goldTake`; `bag.js` `bagTake` | low | RV (a guard, PR 13, if the doors' tables allow it; else listed) |
| SEC-F2 | A join's claims for a shield, a cosmetic and an amulet are not held as armour and legs are by `gearheld` (card SEC's Found, by the planning session). **To be shown in its PR.** | `gearstash.js` (the join's claims) | medium until shown | RV (PR 11) |

Held, and by what: every other road (part A.1, A.2). The ones a reader
pressed hardest: Diego's buy and sell (the bag read again after the await;
his buy at most half his ask), the gambles (stakes floored, held to the
purse), the bank (whole numbers, an op id a move, one write), the forge,
salvage, smelting and traps (costs taken first; no output worth more than
its inputs), the farm (the bed's state), quests and guilds (their state
moves once), the daily chest (the key read again after the awaits), loot
(`claimedBy`), the mail (paid and stamped in one run), a new character's
join (its `rpg*` claims dropped), the trade window's last-second swap, a
duel's stake raised after the card, two tabs of one id (the second join
takes over the first). Not counted: a dropped item's pile gone with a
deploy, and the threat levy's two writes (known; threats are off).

### Accounts

| Id | What goes wrong | File and function | How bad | Whose |
|---|---|---|---|---|
| ACC-1 | A join for an id with no `auth:` record (a guest) gets in with no key, and ids are public: naming an online guest's id takes over its body and purse, and a join that brings a phrase registers the id to the stranger. Real phones always join with a key. **Shown.** | `join.js` `_verifyJoinAuthNow` (no record) | low (medium if guests were offered to players) | Card K2 (`join.js` until its PR 10); RV after |
| ACC-2 | A keyless join naming a made-up `bp_` id writes a `char:` row nobody removes (`guestlazy` does not cover it). **Shown.** | `join.js` `_handleJoin` → `_loadOrCreateCharacter` | low | Card K2 (`join.js`); RV after |
| SEC-F1 | A join with no id is let in as `session.id` undefined (card SEC's Found). **Read.** | `join.js` | low | Card K2 (`join.js`); RV after |
| SEC-F5 | The after-join check of an old key asks `devicelock` only, not `oldkeyheld`: under `devicelock: false` a device forgotten while the join ran is not put out. The join itself is held (`_deviceLockJoin`, v2.3.5716). **Read.** | `loginkeys.js` `_keysAfterJoinNow` | low | RV (PR 8) |
| ACC-5 | A friendship can be one-sided: when one list is full at the accept, that side can be messaged forever and cannot remove the other. **Read.** | `friends.js` `_friendAcceptCore`, `_handleFriendDm`, `_handleFriendRemove` | low | RV (PR 12) |
| SEC-F4 | Friend requests received never expire (card SEC's Found; the 50 ceiling is SEC's PR 10). | `friends.js` | low | RV (PR 12), with no new write: a request past its age is dropped where the record is written anyway |
| ACC-3 | With `seathold: true` (off today), a socket naming another player's held seat, never joining, keeps the real holder out until the hold runs out. **Read.** | `seathold.js` `_seatGate` | low | Card K2 (`seathold.js`) |
| ACC-4 | The room rewind puts back the login records: a key taken back, a device forgotten and a silence since the time chosen all come back, and its plan's words do not say so (they say it of freezes). **Read.** | `restore.js` `alsoBack`, `rewindDo` | low | Owner (words in the Test panel) |
| SEC-F6 | The Test panel's "Let one new device in" says more than `oldkeyheld` now allows (a pass admits a new key only). | `src/ui/panels/DevPanel.jsx` | low | Owner (words) |
| SEC-F3 | The phone's 49th chest piece, which the worker never holds (card SEC's Found). | `src/networking/wsClient.js` | low | Card L |

Held, and by what: no way was found for one player to log in as another,
become the owner, put themselves in test mode (only the admin route writes
`testmode:`; the join sets `_testMode` from storage after its allowlisted
copy), or write another player's `rpg:`, `auth:`, `bank:`, `inbox:` or
`pets:`. The owner's routes: one key check (above). The market, store and
arena writes over HTTP: the live session's `x-bt-auth` token
(`httpauth.js`). An old key from an unlisted device: refused with the
switch thrown and inside a pass (card SEC PR 17, `oldkeyheld`), which also
holds the account reset (`_deviceLockCheck`). Part A.3 lists every row.

### Players' safety

| Id | What goes wrong | File and function | How bad | Whose |
|---|---|---|---|---|
| S1 | A duel challenge has no pace, no check that the two stand in one place or that the target exists, and no mute: 40 cards, each with its sound, reached a player in 10 s from across the world (the relay bucket is the only bound). Trade, friend and party invites have had a 5 s pace since card MOD; the duel was missed. **Shown.** | `duel.js` `_interceptDuel` | medium | RV (PR 6); sending the challenge to the target alone instead of the room (bystanders see it today) is what others see: Owner |
| S2 | A player's `avatar` (512 characters) and `color` (64) can be any text: the page draws `avatar` as a picture and `color` as a CSS background, so a player can put a small picture of their choice on other screens, or make every phone that opens the player list, a player card or the board fetch from a server of theirs (each viewer's address and when they looked). The board keeps `color`, so it works while they are away. The store already holds both to a form (`store.js` `_stColor`, `_stAvatar`). **Shown** (the worker relays it); the page's use **read**. | `join.js` `_sanitizeJoinData`; `index.js` `case 'track'`; `leaderboard.js` (the row's `color`); the page: `PlayerIcon.jsx`, `InspectPlayerPanel.jsx`, `LeaderboardPanel.jsx` | medium | RV (PR 7: the board and the page); the join's and `track`'s halves are in `join.js` (card K2) and `index.js` (K2, then card L): asked |
| S5 | A muted buyer's lines in a shop thread are stored and shown to the seller when they open it; the mute holds only the live send. The file's own header promises the opposite. **Shown.** | `storechat.js` `_handleStoreDm`, `_handleStoreDmOpen` | medium | RV (PR 6b, its own PR) |
| S4 | A `duel_decline` with no challenge behind it is still relayed, its `reason` with it: "Duel declined" or "Saving is paused for a moment" on anyone's screen, four a second. The same class as card K2's PR 5, which did not name the duel. **Shown.** | `duel.js` `_interceptDuel` | low | RV (PR 6) |
| S3 | The look relay's `rpgData` text (clan tag, clan name, pet name) is any 96 characters on other screens, past the cleaner and the staff-name rule; the board takes the player's own `rpgData.clanTag`, never the worker's stamp. **Shown.** | `lookrelay.js` `rpgDataRelayed`; `index.js` `reportToLeaderboard` | low | RV (`lookrelay.js`, PR 7); `index.js`: card K2, then L |
| S6 | The chat cleaner passes a line of braille blanks (a blank bubble) and some invisible characters (Unicode tags, U+FFF9 to U+FFFB, U+0600 to U+0605). **Shown.** | `chatguard.js` `cleanChatText` | low | RV (PR 14) |
| S7 | Pet names, alliance names and alliance tags skip the character-name rule: blank names (the Hangul filler), stacked accents, and staff words ("Admin Team", the tag "GM"). **Shown.** | `petbook.js` `cleanPetName`; `alliance.js` `allyName`, `allyTagOk` | low | RV for the invisible characters (PR 14); refusing staff words is a refusal a player meets: Owner |
| S8 | Who is online and where is no secret: every zone to every phone each 30 s, everyone on the world map (the design); a whisper and a party invite answer whether a named player is here, even to someone they muted. **Read** (the whisper **shown**). | `presence2.js`; `chatlanes.js` `_handleWhisper`; `party.js` `_handlePartyInvite`; `gladiator.js` `_arenaStatusFor` | low | Owner (what the map shows) |
| — | `GET /api/store/mine?playerId=` answers anyone with a player's listings and bids (RT-3 P1). Nothing new: the public browse carries each listing's top bidder. | `store.js` `_storeFetch` | low | Held (public by design); Owner if bids should be private |
| — | Block is the phone's own list; the worker delivers everything from a blocked player and the page drops it. Mute (chat only) is the one thing the worker keeps, which makes S1 and S5 matter more. | `src/game/blockedAsks.js` | — | Card Q (step 10.9: a block the server keeps) |

Held, and by what: chat, whispers and names through the cleaner and
`checkCharName` (no hidden characters, staff names refused); emote and pose
ids from fixed lists; the dice the worker's roll; a report's sums only;
invites to trade, friend and party paced (5 s a pair, card MOD); no markup
anywhere (the page never sets HTML from a player's words). Part A.4 lists
every row.

## 2. The fix PRs, in order (tags 5801 onward, a group of files a PR)

Ranked by how bad. Each: a suite red on `main` first and green with the fix;
a lower-case kill switch, default ON, where an honest player could ever meet
the change (named in `server/src/testmode.js`'s header and
`docs/specs/test-mode.md`); no new write, message or stored shape; nothing a
player sees changes except the wrong thing the finding is.

| PR | Tag | Files | Findings | Switch |
|---|---|---|---|---|
| 2 | 5801 | `market.js`, `inbox.js` (`_creditWith`) | MS-2 (a sell filed under its weapon's own tier and kind); MS-4 (a refund and its order's delete in one write: `inbox.js` `_creditWith` learns a weapon) | `mkttier`, `mktheal` |
| 3 | 5802 | `risechest.js`, `inbox.js` (the prune) | MD-1 (the chest's stamp is the record and is kept: the prune passes over its range, no new row) | `risekeep` |
| 4 | 5803 | `inbox.js` | MS-3 (goods credited in the dying seconds join the death's shield, which the respawn keeps; no refusal, nothing new on screen) | `dyingkeep` |
| 5 | 5804 | `nomansland.js` | MS-1 (the killer's gold and weapons paid in the victim's own write, through `_creditLiveTogether`; gear and a killer gone from the room keep the old road) | `nmlonewrite` |
| 6 | 5805 | `duel.js` | S1 (a challenger's cards to one target: two, then one each 5 s; nobody in the room, or a target who muted the challenger: no card; the record still written, so a re-sent stake behaves as before; another zone left to the accept's refusal), S4 (a decline only of a real challenge, `{target, from}` only), MS-6's duel pot (the pot and its escrow's delete one write) | `duelpace`, `duelonewrite` |
| 6b | 5806 | `storechat.js`, `chatlanes.js`, `party.js`, `chatmod.js` (the switches) | S5 (a muted sender's lines not shown on open, still stored as the haggle's record); S8's decided part (a player who mutes you reads as away: a whisper's and a party invite's answer) | `storemute`, `mutehides` |
| 7 | 5807 | `server/src/lookform.js` (new, the forms), `leaderboard.js`, `src/game/lookForm.js` (new, the page's copy), `PlayerIcon.jsx`, `InspectPlayerPanel.jsx`, `LeaderboardPanel.jsx`, `SocialPanel.jsx` | S2 (the board keeps `color` only as a colour; the page draws an `avatar` only in the proxy form it builds, a `color` only as a hex colour). The join's half is card K2's (its PR 11 imports `lookform.js`); `track`'s and S3 wait for `index.js` (a later RV PR) | `?lookform=0` (page); the board's switch comes with `index.js`'s half (the board learns flags only from the room's report) |
| 8 | 5808 | `loginkeys.js` | SEC-F5 | `oldkeyheld` (the existing one) |
| 9 | 5809 | `storeoffer.js`, `gladiator.js`, `trade2.js`, `inbox.js` (the switch) | MS-5 (a Yes waits for a bid or an offer half made); MS-6's arena and trade leftovers (the payment and its escrow's delete one write) | `offerpend`, `leftoverheal` |
| 10 | 5810 | `dailyrewards.js`, `loginspin.js` | MD-2 (the paid mark in the credit's own run). **Not built yet:** the daily record would be put twice for a payout (once in the credit's run, once by the caller's own save), a new write; it waits until it can be done without one, or the owner says | `paidmark` |
| 11 | 5811 | `friends.js` | ACC-5 (an accept is both sides or neither; a one-sided friendship ended by the side it names), SEC-F4 (a request received 30 days ago let go where the record is written anyway) | `friendfix` |
| — | — | `gearstash.js` | SEC-F2: read, not built. A join's shield and cosmetic claims are still merged each join, but a claimed piece has no `gid`, so it is `legacy`: never sellable or tradeable (`gearprov.js` `_gearSellable`), no money in it; the gap is wearing a shield the worker never handed out. Closing it can drop an honest phone-only shield, a player's item: **the owner's call** | — |
| 13 | 5813 | `cadence.js` (+ a door guard) | MD-3, MD-4 | `jackcheck` |
| 14 | 5814 | `chatguard.js`, `petbook.js`, `alliance.js`, `charname.js` (the switch) | S6 (braille blanks, annotation marks, loose tags; a tag flag kept); S7 (a NEW pet name, alliance name or tag held to the character name's rule: nothing that draws nothing, no stacked marks, no staff words; a stored one never touched, and, sitting 44's review decided for the owner while away, an alliance whose stored name now reads as staff keeps it and may change its tag) | `cleanmore`, `namestaff` |

The switch names are a first choice, checked free in the switch table at
each PR. A PR whose fix turns out to need a new write, a new message or a
stored shape stops and asks (the card).

**Sent to other cards** (one message to the planning session): ACC-1,
ACC-2, SEC-F1 and S2's join half (`join.js`, card K2 until its PR 10);
ACC-3 (`seathold.js`, K2); S2's `track` half and S3's board report
(`index.js`, K2 then L); SEC-F3 (`wsClient.js`, card L).

**The owner's calls, listed, never decided here:** the rise chest's quest
gate (MD-1); who sees a duel challenge (S1); staff words in pet and
alliance names (S7); presence on the map and the whisper's answer (S8);
whether bids are private (`/store/mine`); the rewind's words (ACC-4); the
Test panel's pass words (SEC-F6); a block the server keeps (card Q).

### The owner's calls, decided by RV's recommendation (v2.3.5801)

The owner, 2026-11-17, by the planning session: *"Go recommended on all"*.
Each is built behind its own switch in the PR named, under "Decided for the
owner while away" in that PR's words. Never decided this way: anything that
adds a write or a cost, or deletes a player's record or items.

| Call | RV's recommendation | Where | Switch |
|---|---|---|---|
| The rise chest's quest gate (MD-1) | **No gate.** Paid once a character for good (PR 3), the chest is 400 coins a new character can take once, the same kind as the start gold; a fleet of throwaways is RT-3 B1's question (the account check, card Q), not one chest's. Nothing is built. | none | none |
| Who sees a duel challenge (S1) | **The target alone.** A bystander's phone already drops a challenge not addressed to it (`gameEvents.js`: `payload.target === S.myId`), so nobody sees a change; the room stops hearing "X challenged Y for N gold" and the worker sends fewer messages. It needs `relay.js` (the relay's rebuild in the sender's name), card K2's: **sent to K2**, not built by RV. | card K2 | `duelquiet` |
| Staff words in pet and alliance names (S7) | **Refused, as a character's name is** (`charname.js` `nameReadsAsStaff`, its own refusal words). A pet named "Mod" is refused as a character named "Mod" already is. | PR 14 | `namestaff` |
| Presence on the map, and the whisper's answer (S8) | **The map stays** (it is the feature). **A player who muted you reads as away to you**: a whisper to them answers `no-such-player`, a party invite `target-gone`, as for someone not here, so a muted harasser cannot test whether they are on. | PR 6b | `mutehides` |
| Whether bids are private (`/api/store/mine`) | **Leave as is.** The public browse shows each listing's top bidder by design (the Auction House is an open auction); hiding one route hides nothing. | none | none |
| The rewind's words (ACC-4) | **Say it.** The rewind's plan lists the owner's own login actions since the time chosen (a key taken back, a device forgotten, a silence), read from the admin log before the rewind (the log goes back too), and tells the owner to repeat them, as it already does for freezes. Words in the owner's Test panel only. | `restore.js`, a PR of its own | `rewindsays` |
| The Test panel's pass words (SEC-F6) | **Match the rule.** "Let one new device in" says what `oldkeyheld` allows now: the next new key from any device, never an old key. Words in the owner's Test panel only. | `DevPanel.jsx`, a PR of its own (asked of the planning session: the file is card A's and L's list) | none (words) |

## Appendix A. What was read, row by row

Each line: the row or route, where it is handled, and what holds it, or
the finding. Written by the four readers; the ids above are theirs.

### A.1 The doors' roads (GOLD_ROADS 47, BAG_ROADS 71, STASH_ROADS 36)

Doors:
- gold.js _goldGive/_goldTake/_goldSet -> wholeGold floors and never below 0; take clamps (MD-4); set heals; roadFor throws on an unknown road / wrong verb; econ booking per class -> ok but for MD-4
- bag.js bagGive/bagTake/bagSet -> wholeCount own-key read; ECON_BAD keys skipped; take clamps (MD-4); quest cap honoured -> ok but for MD-4
- stash.js stashGive/stashTake/stashSet -> give refused at the cap (false), take/set index Number.isInteger in range, weapon gid minted -> ok

GOLD_ROADS (47):
- join_stored -> join.js _handleJoin -> ok (stored purse healed by wholeGold, a LOAD: no econ)
- join_new -> join.js _handleJoin -> ok (rpg* claims dropped when no record, v2.3.3138; capped 2000 as second line)
- restore -> playerrestore.js restoredCharacter -> ok (admin.js POST /restore, admin key + admin_log)
- restore_vault -> playerrestore.js bookVault -> ok (same)
- amulet_craft -> amulet.js _handleAmuletForge craft -> ok (own-key tier, bars+coins checked; fightlocktable)
- gem_extract -> amulet.js _handleAmuletForge extract -> ok (coins checked; pays only gems set by a paid gem road / minted shield row)
- weapon_forge -> gear.js _handleForgeWeapon -> ok (own-key tier, coins+mats checked, stash room before cost)
- harden -> hardening.js _handleHardenWeapon -> ok (coins+mats checked before take)
- tonic_buy -> cooking.js _handleShopPurchase -> ok (DIEGO_SHELF only, coins checked)
- tonic_refund -> cooking.js _handleShopPurchase -> ok (refunds exactly finalCost just taken)
- farm_buy -> farm.js _handleFarmBuy -> ok (count clampInt 1..BUY_MAX, coins checked, one run)
- pet_house -> petbook.js _handlePetHouseBuy -> ok (stale-cap guard, coins checked, one run)
- clan_create -> clans.js _handleClanCreate -> ok (coins checked after the awaits)
- arena_entry -> gladiator.js _arenaJoin -> settlement: see money-settle
- shop_tool -> shop.js _shopBuy -> ok (purse checked, own-table key)
- shop_staple -> shop.js _shopBuy -> ok (qty 1..100, unit*qty checked)
- shop_pile -> shop.js _shopBuy -> ok (stock read after await, cost checked, saved with the pile)
- shop_sell -> shop.js _shopSell -> ok (bag re-read after the stock await, decaying price <= half his ask, MIN_BUY 1: no flip; fightlock)
- weapon_sell -> gear.js _handleSellWeapon -> ok (index checked; at most ceil(8*13.44*0.5)=54, below any forge cost)
- quest_reward -> quests.js _handleQuestTurnIn -> ok ('active' -> 'turnedIn' in one run, objective checked, no abandon road)
- guild_rung -> guilds.js _handleGuildTurnIn -> ok (claim put and save in one run; next rung's level gate)
- farm_order -> farmorders.js _handleFarmOrder -> ok (done[slot] stamped in the run, day/id stale check, own-table key)
- daily_chest -> dailychest.js _handleChestOpen -> ok (chest key re-checked after awaits; stamp before save is benign: a restart leaves the key in the bag, never two prizes)
- dungeon_clear -> dungeon.js _dungeonComplete -> ok (server cfg clamped; Workshop share; noted)
- boss_chest -> dungeonreward.js _dungeonReward -> ok (Wheel dungeons only, in the clear's run)
- loot_gold -> index.js _handleLootPickup -> ok (claimedBy per player, share of a server pile)
- loot_weapon_sold -> index.js _handleLootPickup -> ok (weaponClaimed flag, full bag only)
- mail_gold -> inbox.js _applyCreditToPs -> ok (server-made amount floored >=0; _opInFlight + stamp in the pay's run); its callers: risechest -> finding MD-1; spinpot/loginspin/season -> finding MD-2; dq (one write via _creditLiveTogether) ok; settlement words -> see money-settle
- ace_flip_win / ace_flip_loss -> gamble.js _handleAceFlipRequest -> ok (stake floored, 3x stake <= purse, 45%, fightlocktable)
- gamble_win / gamble_loss -> gamble.js _handleGambleRequest -> ok (10..10000, purse checked, 40%)
- jackpot_ticket -> cadence.js _handleJackpotDeposit -> finding MD-3 (low)
- gift_trade -> trade.js _interceptTrade -> settlement: see money-settle
- trade_window -> trade2.js _handleTrade2Confirm -> settlement: see money-settle
- threat_levy -> threat.js _interceptThreat -> settlement: see money-settle
- nml_loss / nml_lost -> nomansland.js _nmlOnDeath -> settlement: see money-settle
- bank_deposit / bank_withdraw -> bank.js _handleBankMove -> ok (wholeN 1..1e9 integers only, reqId/opId in the vault's ops, purse/vault checked, one write, at the door)
- market_order / market_unwind -> market.js -> settlement: see money-settle
- ah_offer_back / ah_offer -> storeoffer.js _soPlaceOneWrite -> settlement: see money-settle
- escrow_debit / escrow_debit_stored -> inbox.js _escrowDebitGold -> door side ok (amount floored >0, purse checked, take+save+stamp one run); callers settlement: see money-settle
- escrow_debit_group -> inbox.js _escrowDebitGoldTogether -> door side ok (every purse checked before any take, one run); callers settlement: see money-settle

BAG_ROADS (71):
- eat_meal / eat_fish -> cooking.js _handleEatRequest -> ok (own DISHES key / cooked_fish_ prefix, count checked, effect before take)
- firemaking -> cooking.js _handleFiremakingRequest -> ok (wood_ prefix, count checked)
- drink -> cooking.js _handleDrinkRequest -> ok (own-key gate, effect before take)
- shop_item_trap -> cooking.js _applyShopItem -> ok (bought item, paid)
- cook_ingredient -> cooking.js _consumeIngredient -> ok (dry run first, min(have, left))
- cook_recipe -> cooking.js _handleCookRecipe -> ok (Number.isInteger idx, level gate, ingredients consumed first)
- cook_fish_used / cook_fish_cooked / cook_burnt -> cooking.js _handleCookRequest -> ok (fish_ key held, rate + floor; `kind` a known claim)
- armor_forge -> armorforge.js _handleForgeArmor -> ok
- weapon_forge -> gear.js _handleForgeWeapon -> ok
- harden_mats -> hardening.js _handleHardenWeapon -> ok
- hardwood_logs / hardwood_made -> hardenedwood.js _handleMakeHardenedWood -> ok (count clamped to logs; output priced below input x2)
- smelt_ore / smelt_bar -> smelting.js _handleSmeltBar -> ok (count 1..MAX, floor(have/cost))
- salvage_bars / salvage_essence -> salvage.js _handleSmithSalvage -> ok (weapon by idx+sig, armour by ledger; 2 bars of 5; essence conserved)
- essence_apply -> salvage.js _handleEssenceApply -> ok
- trap_logs / trap_made -> trapping.js _handleMakeTraps -> ok
- trap_sprung -> trapping.js _trapRollOnKill -> ok
- trap_legacy_out / trap_legacy_in -> trapping.js _trapJoinConvert -> ok (one for one, idempotent)
- gem_take / gem_give -> gems.js gemTake/gemGive (amulet, weapongem, shieldgem, shardcrack, salvage, devtools) -> ok (gemCount checked by each caller; shield gem overwrite is documented)
- shard_crack / rare_gem_combine -> shardcrack.js -> ok
- harvest / harvest_shard -> gathering.js _handleNodeStrike -> ok (node dies before the pay)
- fish_catch_plain / fish_catch -> fishlog.js _fishCatch -> ok
- farm_plant / farm_feed / farm_harvest -> farm.js _handleFarmAct -> ok (bed state is the replay guard, changed before pay; seeds read after the await)
- farm_buy -> farm.js _handleFarmBuy -> ok
- farm_order -> farmorders.js _handleFarmOrder -> ok
- shop_sell / shop_tool / shop_staple / shop_pile -> shop.js -> ok
- chest_key / chest_prize -> dailychest.js _handleChestOpen -> ok
- boss_chest_item -> dungeonreward.js _dungeonReward -> ok
- quest_collect -> quests.js _collectConsume -> ok (min(have,left), after the objective check)
- quest_item -> quests.js _grantQuestItem -> ok (`have >= cap` refused before the capped give)
- cape_ticket -> eventcapes.js _claimCapeTicket -> ok (cap and one per account in the sync claim)
- cape_ticket_spent / cape_trophy -> eventcapes.js _handleCapeRedeem -> ok (re-check after await; ledger+bag one run; trophy cosmetic)
- loot_death_items / loot_skull / loot_shard / loot_gem -> index.js _handleLootPickup -> ok (claimedBy, inventoryClaimed, pile despawned; death pile row in the save's run) [death piles' settlement: money-settle]
- ace_items_win / ace_items_loss -> gamble.js _handleAceItemFlipRequest -> ok (stake from own bag keys, tickets refused)
- gift_trade -> trade.js -> settlement: see money-settle
- trade_window -> trade2.js -> settlement: see money-settle
- item_drop -> itemdrop.js _handleItemDrop -> ok (own key, qty min(ask, have), take+pile+save one run; a restart loses the pile: documented)
- bank_deposit / bank_withdraw -> bank.js _handleBankMove -> ok
- ah_listing -> store.js _stCreateListing -> settlement: see money-settle
- mail_item -> inbox.js _applyCreditToPs -> ok (Object.prototype names refused, count >=1 server-made)
- escrow_item / escrow_item_stored -> inbox.js _escrowTakeItem -> door side ok (own-key count checked, take+save+stamp one run); callers settlement: see money-settle
- restore / restore_vault -> playerrestore.js -> ok (admin route)
- dev_shards / dev_traps / dev_logs -> devtools.js -> ok (owner's /dev/* behind the admin key)
- fish_dev -> fishlog.js _fishDev -> ok (devtools /dev/fish, admin key)

STASH_ROADS (36):
- join_stored -> join.js _handleJoin -> ok (stored bag sanitized, cut to WEAPON_STASH_CAP_NEW)
- join_new -> join.js _handleJoin -> ok (claims dropped for a new record; strict sanitize strips quality/hardness/gid)
- quest_reward -> quests.js _grantQuestItem -> ok (full bag: unfit list -> mail with deterministic opId)
- quest_wood -> quests.js _questTradeApply -> ok (same weapon remade in place, after every gate)
- reveal_dev / gear_reveal -> revealbag.js _revealBagDev -> ok (owner's dev route)
- loot_weapon -> index.js _handleLootPickup -> ok (weaponClaimed; room checked)
- mail_weapon -> inbox.js _applyCreditToPs -> ok (sanitized; full bag stays in the mail)
- market_sell / market_back -> market.js -> settlement: see money-settle
- store_list -> store.js _stCreateListing -> settlement: see money-settle
- trade_put -> trade2.js _handleTrade2StageWeapon -> settlement: see money-settle
- nml_weapons / nml_gear -> nomansland.js _nmlOnDeath -> settlement: see money-settle
- salvage_weapon -> salvage.js _handleSmithSalvage -> ok
- weapon_sell -> gear.js _handleSellWeapon -> ok
- forge_swap -> gear.js _handleForgeWeapon -> ok (room checked before the cost)
- unequip_weapon -> gear.js _handleUnequipRequest -> ok (full bag refused and echoed)
- equip_swap / equip_take -> gear.js _handleEquipRequest -> ok (weapon slot only, type fits, swap in place)
- gear_join_own / gear_join_claim / gear_migrate -> gearstash.js -> ok for money (claim merge resolved by the ledger; described-not-held: already SEC 16)
- gear_quest -> quests.js _grantQuestItem -> ok (one-time on the quest state)
- gear_forge -> armorforge.js -> ok
- gear_chest -> dailychest.js -> ok
- gear_loot -> index.js _handleLootPickup -> ok (armorClaimed)
- gear_swap_off / gear_swap_on -> grids.js _gridsApplyArmor -> ok for money (fight lock, ledger; already SEC 16)
- gear_unequip -> gear.js _handleUnequipRequest -> ok
- gear_mail -> storegear.js _stGearApplyCredit -> settlement: see money-settle (door side: refused at the cap, stays in the mail)
- gear_list -> gearprov.js _gearProvTake -> settlement: see money-settle
- shield_off / shield_swap_off / shield_on -> shieldwear.js _handleShieldWear -> ok (one copy leaves the list; dedup by samePiece; note on the full list above)
- restore -> playerrestore.js -> ok (admin route)

Other files in the brief with no door road: rest.js, pets.js, forgeladder.js, swordconvert.js, dice.js -> no gold/bag/stash writes (grep) -> ok. loginspin.js / risechest.js / dailyrewards.js pay only through mail_gold/mail_item (above).

### A.2 The settlements (PLAYER_ROADS 14, ESCROW_PLACES 12)

Background read for every row: two sockets of one bp_ id never act at once -- a second join
evicts the first (join.js v2.3.702 `takeover` / v2.3.4432 `takeoverFight`, leave.js
LEAVE_WAYS), the new playerState is re-read from `rpg:` after the old one's dirty part is
saved, and every value op writes the WHOLE blob (persistence.js `_saveRpg` issues its put
before its first await), so a two-tab race reduces to "old socket gone, new one acts" and to
the restart cases below. Messages are serialized by the input gate (testroom roomQueue).

#### PLAYER_ROADS (playerroads.js), all 14
- trade_window -> trade2.js `_handleTrade2Confirm` (+ Open/Set/Ready/Pets/StageWeapon/UnstageWeapon/Cancel, `_t2RefundWeapons`, `_trade2WpnSweep`) -> ok for: double confirm / cancel vs confirm (`_t2To` single writer, session deleted in the swap's run); both sides' debits+credits+weapon records+xfer row in ONE run (`_creditLiveTogether` + `wpnRecords`, owed weapons `to`); stale switch (ready+2.5 s cooldown, every edit resets); prototype keys (`_sanitizeTradeOffer`, `_invCount`); gold 1..999999, counts 1..9999 floored; staged weapon escrowed in the stash save's run (v2.3.3294); pets re-checked at commit (`_petSellable`, room); reconnect keeps the window (takeover), a close cancels; fight lock. FINDING MS-3 (confirm does not refuse a dying side).
- gift_trade -> trade.js `_interceptTrade` -> ok (closed while trade2 is on: `_giftClosed`; single-shot accept; validate-at-commit; one write via `_creditLiveTogether`; reject voids the offer; fight lock).
- nml_loss -> nomansland.js `_nmlOnDeath` (from index.js `_handlePlayerDeath`) -> FINDING MS-1 (restart after the victim's save loses the loot; never a dupe: victim emptied and saved first).
- market -> market.js `_mktPlaceOrder`, `_mktSettleRun`, `_mktSettleHeal`, `_mktCancelOrder`, `_mktRefund`, `_mktSweep`, `_mktUnwind`, `_mktEnsureIndex`, `_mktScanPage` -> ok for: escrow+order put one run; crossing note in the taker's escrow run (v2.3.4505); own orders skipped (self-trade); price floored 1..999999; taxonomy bounded; httpauth; reqonce (`reqId` on the order); fight lock. FINDING MS-2 (sell order's tier is the seller's word: theft from resting buy orders). FINDING MS-4 (refund leftover + 48 h prune -> second refund).
- auction_sale -> store.js `_stCreateListing`, `_stBuyNow`, `_stSettle`, `_stConverge`, `_stHealStuck` -> ok for: goods and listing put in one run (item/weapon/gear via `_gearProvTake`/pet via `_petbookTake`, all synchronous puts); buy-now's debit+stamp+`paid:true` one run (`_escrowDebitGoldTogether`); own listing refused; price/qty bounds; `releasing`/`sale` markers converge; prune waits for the shelf load (`_stSettleWait`). Dying buyer: see MS-3.
- auction_bid -> store.js `_stPlaceBid`, `_stPromoteBid`, `_stAcceptBid` -> ok (pendBid marker, debit+stamp one write, outbid refund idempotent by seq, own listing refused, bid >= ask is a buy-now). MS-5 touches it (offer Yes ignores pendBid).
- auction_offer -> storeoffer.js `_stOfferPlace`, `_soPlaceOneWrite`, `_soRefundOne`, `_stOfferReply`, `_soReleaseAll`, `_soSweepRec` -> ok for: offer/raise in one write, refund+listing via `_creditWith`, a refunded offer's Yes refused, `_soGold` whole/positive/refused-not-clamped, own listing refused, fight lock (`store_offer` row), paced. FINDING MS-5.
- duel_pot -> duel.js `_interceptDuel`, `_resolveDuel`, `_duelEscrowSweep` -> ok for: both stakes + `duelEscrow:` one run; stake never above what the accepter was shown; single-shot challenge; same zone; fight lock; sync double-resolution guard; pot opId `duelpot:<id>`. FINDING MS-6 (stamp-only leftover, low).
- arena_entries -> gladiator.js `_arenaJoin`, `_arenaLeave`, `_arenaRefundEntry`, `_arenaLazyTick`, `_arenaStart`, `_arenaCrown`, `_arenaEntrySweep` -> ok for: fee+stamp+record+queue one run; per-entry `n` suffix (rejoin not free); only a gathering tournament; house mint bounded per hour (HOUSE_GOLD_PER_HOUR, documented faucet); httpauth. FINDING MS-6 (low).
- arena_stakes -> gladiator.js `_handleArenaSponsor`, `_arenaSettleStakes`, `_arenaStakeFinish`, `_arenaStakeSweep` -> ok (stake+record one run; pool not house money, floors summed with the leftover to the fighter: exactly what was staked; plan record in one run; prune waits for open plans; own match refused; 10..5000 floored; fight lock).
- threat_bounty -> threat.js `_interceptThreat`, `_bountyOnDeath`, `_bountySweep` -> ok/shut: the levy and its bounty are two batches (chaos-restart's header already names it), but threats are shut (`OPEN_PVP` false, index.js) so no new bounty is made; payout opId `bountypay:<victim>:<ts>`; duel and same-clan kills excluded.
- jackpot -> cadence.js `_handleJackpotDeposit`, `_jackpotMaybeResolve` -> ok (debit save and pool put in one run; amount floored, bounds, multiple of a ticket; own-property entries; win opId per period; fight lock row `jackpot_deposit`).
- ground -> index.js `_handlePlayerDeath` / `_handleLootPickup`, deathpile.js `_deathPileSave`/`_deathPileGone`/`_deathPilesEnsure`, itemdrop.js `_handleItemDrop` -> ok (death pile row in the death's save run, deleted in the taker's save run; taken whole; pickup refuses dying/dead/disconnected; a drop is bag-out + pile in one run, qty integer >= 1 capped, prototype keys refused, fight lock). By design and documented: a DROPPED item's pile is memory-only, so a deploy within its minutes destroys it (deathpile.js header) -- the owner's call, not reported.
- diego_pile -> shop.js `_shopSell`, `_shopBuy`, `_shopStock`, `_shopSaveStock` -> ok (seller/buyer save and the pile put in one run; bag re-read after the stock read; he buys at <= half his flat asking price, floor 1, so no buy-sell loop; staples/food/tonics/unpriced refused; qty 1..100; fight lock).

#### ESCROW_PLACES (gold.js), all 12
- bank: -> bank.js `_handleBankMove` -> ok (purse/bag and vault in one run; `ops` repeat list; whole numbers; MAX_N; place gate; paced). Own value only (OWN_ROADS).
- mkt_order: -> market.js (see `market`) -> MS-2, MS-4.
- store_listing: -> store.js / storeoffer.js / storegear.js `_stGearEscrow` (see the three auction rows) -> MS-5; gear escrow takes the provenance row (`_gearProvTake`, synchronous save).
- duelEscrow: -> duel.js -> MS-6 (low).
- arena_entry: -> gladiator.js -> MS-6 (low).
- arena_stake: -> gladiator.js -> ok.
- bounty: -> threat.js -> ok/shut (see threat_bounty).
- jackpot:draw -> cadence.js -> ok.
- trade2wpn: -> trade2.js `_handleTrade2StageWeapon` / Unstage / `_t2RefundWeapons` / `_trade2WpnSweep` / confirm's `wpnRecords` -> ok (stash save + record one run; refund and sweep share the `wpnrefund` opId; owed records delivered, never refunded; paced). MS-6 (low) for the prune.
- death_pile: -> deathpile.js -> ok.
- inbox: -> inbox.js `_creditPlayer`/`_creditPlayerOnce`/`_creditLiveTogether`/`_creditWith`/`_inboxAppend`/`_inboxSerial`/`_drainInbox(Now)`/`_applyCreditToPs`/`_escrowDebitGold(Together)`/`_escrowTakeItem` -> ok for: stamp in the payment's run; one call per opId in flight (`_opInFlight`); mailbox read-modify-write serialized; drain's save and box rewrite in one run; full stash keeps a weapon/gear/pet queued; prototype item keys refused. MS-3 (a dying recipient counts as live).
- shop_stock -> shop.js -> ok (see diego_pile).

#### Other files in the slice
- marketplace.js, arena.js -> retired DO classes kept for their bindings; index.js routes `/api/market` and the arena to the GameRoom (no road).
- storechat.js -> no value moves (threads only; `_scDropThreads` before a listing's delete).
- race.js -> no gold or goods (a quest objective only).
- party.js / clanparty.js -> no shares move value between players (every share is a mint; the spec's "not roads").
- xfer.js -> the ledger rows only, issued in each settlement's run; no value.
- reqonce.js -> ok (keyed by pid + reqId; the door's repeat drop; record-keeping routes find their order/listing after a restart).
- leave.js `_playerLeaves` -> ok for the slice: `takeover` saves the dirty part and keeps the trade/duel by design; a close cancels the trade (weapons refunded), starts the duel's 15 s clock, marks the party away.
- restore.js / playerrestore.js -> owner-only (admin key, player out of the room); between-player records never rewound and reported as `between`/`moved` (SEC 20 / `restore moved`, not repeated here).
- pets (traded) -> trade2 pet lane and store pet listings -> ok (book written synchronously in the swap/listing run; re-checked at commit; `pettrade` switch).
- weapons/gear moved twice -> a weapon leaves the stash at stage/list/order time (stashTake in the escrow's run), so it cannot be staged, listed and ordered at once; gear goes by its provenance row (`_gearSellable`: worn/in_mail/legacy refused; SEC 16 covers described-not-held).
- Price edge cases (0, negative, fraction, huge, NaN, string) -> every road floors and bounds its number (trade 1..999999 / 1..9999, duel 0..999999, market 1..999999, store 1..MAX_PRICE and qty 1..MAX_QTY, offer `_soGold`, stake 10..5000, jackpot ticket multiples, bank `wholeN`, shop 1..100, drop integer >= 1) and the gold door's one sum clamps the purse at 0 (gold.js `goldOneSum`).

### A.3 Accounts (the wire table's account rows and routes)

#### Socket rows (server/src/wire/in.js) about joining, keys, characters, reports, cross-player
- join -> join.js `_handleJoin` -> ok, held by: MAGIC_IDS and `joinIdMalformed` (SEC); `_seatJoinRefused`; `_frozenDeviceRefuse`; `_verifyJoinAuth` in `_authSerial` (old key = SHA-256 of `btv1|phrase` compared with ===: a digest compare, fine; new key = `_keyJoinCheck` against `auth.keys`; lockout 5/60 s per id, `_oldKeyHolder` lets the rightful holder through; device lock `_deviceLockJoin`); `frozen:`; `_charNameRefuse`; the eviction runs only after auth; `_sanitizeJoinData` allowlist (`_testMode` is set after the spread, from storage only); no record -> every `rpg*` claim dropped (v2.3.3138). Except the keyless road -> findings ACC-1, ACC-2.
- join (`data.rpg*` claims for a stored character) -> join.js / amulet.js `_gemsAdoptOnJoin` / gearstash.js -> ok for my area (the one-time captures are stamped by `gemsCaptured` / `gearStashCaptured`, written in the same put); gear claims already SEC 16.
- join (`httpAuth`, the token) -> httpauth.js `_httpAuthMint` -> ok (a UUID per join; the victim's own join decides enforcement, so a stranger cannot downgrade it; the token goes in that socket's state_sync only).
- join (`verify`) -> verify.js `_verifyToken` -> ok (asked only before a new id is registered; Turnstile siteverify with secret + remoteip; fails closed; the seam URL only on localhost).
- join (`device`) -> devicelock.js `cleanDevice` -> ok (a client token of 64 random bits; sent to no other player: no outbound path carries `session.device`).
- join (`kv: 2`, the new key handed out) -> loginkeys.js `_keysAfterJoinNow` -> ok under the lock (its record is re-read in `_authSerial`; a Forget or key-new since puts the join out); under `devicelock: false` -> already SEC 17 (see Noted).
- character_reset -> persistence.js `_handleCharacterReset` -> `_resetCharacterData` -> ok (only `session.id`, `confirm === true`, fightlockreset; one write SEC PR 10; playerState dropped before the leave, so no save brings it back; listings SEC 20).
- report -> report.js `_reportTake` -> ok (one per socket per PACE_MS, at most CELLS_A_SOCKET cells; sums only, the sender's id dropped; worst case is telemetry noise from many sockets, paced per address).
- pong -> index.js `_onMessage` -> ok (only its own session's rtt).
- feedback (socket) -> index.js `_onMessage` -> ok (reads; boards2).
- bro_nonce -> broverify.js `_handleBroNonce` -> ok (a nonce on the session, 5 min).
- bro_verify -> broverify.js `_handleBroVerify` / `_broVerifyWallet` -> ok (the nonce is spent before the await; the signed text names the player id and chain; the result writes only `bro_link:<session.id>`; `bro` / `broN` are cosmetic, read only by tick/nearjoin/state_sync). One wallet can badge any character whose holder signs for it: cosmetic.
- chat_report (report) -> chatmod.js `_handleChatReport` -> ok (validId, the target must exist or have been heard, the report gate; writes only `chat_report:<new id>`).
- chat_mute -> chatmod.js `_handleChatMute` -> ok (writes only `chat_mute:<me>`).
- friend_request -> friends.js `_handleFriendRequest` -> ok (writes the target's `friends:` reqIn under REQ_IN_MAX, already SEC; the name shown to the target is the server's).
- friend_accept / friend_decline -> friends.js -> ok (only against a stored reqIn from that id).
- friend_remove -> friends.js `_handleFriendRemove` -> finding ACC-5 (the one-sided case); otherwise ok.
- friend_dm -> friends.js `_handleFriendDm` -> finding ACC-5; otherwise ok (lane allowance, per-sender box cap, the mute drops it).
- whisper, party_invite/accept/decline/kick, clan_join_accept/kick, trade2_open, store_offer_reply (buyerId), arena_sponsor (targetId), nml_attack/lock_ask/lock_allow (target), ability(_use) targetId -> read only to see whether they write another player's account record: none writes `rpg:` / `auth:` / `bank:` / `inbox:` of the target outside its own economy door or a consent the target gives. Their value and safety rules are the other readers'.

#### HTTP rows (server/src/wire/http.js) and their auth in routeHttp / GameRoom.fetch
- http:/* OPTIONS -> index.js routeHttp -> ok (CORS preflight only).
- http:/ws -> routeHttp (`roomNameFor`, `originAllowed`: brotown.net and its subdomains, `*.gamedev-aix.pages.dev`, local hosts, no Origin) then GameRoom.fetch (seat gate, flood per address) -> ok. The origin lock is anti-copy, not auth: the account check is the join's. Seat claim -> finding ACC-3.
- http:/api/account/login -> account.js `_accountLogin` -> ok (read-only; per-address 20/min with /64 and /56; per-id lockout shared with the join; new key found via `keyidx:` then the record decides; device answered, never refused; the digest compared with ===).
- http:/api/account/reset -> account.js `_accountReset` -> ok while the lock is on (authenticated by `_accountLogin`, a device of 'unknown' refused, fightlockreset, the same `_resetCharacterData`); under a pass or `devicelock: false` -> already SEC 17 (see Noted).
- http:/api/account/* -> account.js `_accountFetch` -> ok (404).
- http:/api/botstat?id, ?flagged, (base) -> botfp.js `_botfpAdminFetch` -> ok (`_adminAuth(request, true)`: Bearer or x-admin-key, digests compared, counted toward ADMIN_LOCK; 404 otherwise).
- http:/api/admin/*#nokey -> admin.js `_adminAuth` -> ok (no secret -> 404; SHA-256 of both strings compared, so plain === is safe; ADMIN_LOCK time-out per address/64; the edge refuses a request with no key first, K2 7). Rotating /64s is inherent, already noted in review-z19.
- http:/api/admin/overview, economy, loot, player, export, grant, kick, freeze POST, freeze DELETE, rename, silence GET/POST/DELETE, restore, rewind, log, device-pass, device-forget, key-new, flags GET/POST/DELETE, announce POST/DELETE, capes GET/DELETE, chainstatus, reports GET/DELETE, admin/* -> admin.js `_adminFetch` (and the sub-routes devicelock `_deviceLockAdminRoute`, silence `_silenceAdminRoute`, charname `_charNameAdminRoute`, liveops, eventcapes, chainscore, chatmod) -> ok: every one sits after the single `_adminAuth` check at the top of `_adminFetch`. export never pages `auth:` / `keyidx:` / hidden (`exportAllowed`). rewind -> finding ACC-4. restore -> playerrestore.js `playerRestore` (refused while the player is online or in the world; the snapKey must start `rpgsnap:<pid>:`; newer refused) ok.
- http:/api/admin/dev/state, goldlog, botflags, hidden GET/POST/DELETE, testmodes, apinfo, looks, accuracy, daybook, econcard, lookseen, kit, vitals, quests, tour, questcount, clearwave, hurt, daily, farmripe, trapping, codex, fish, achv, killroll, lifeskill, combat, botflag, spar, testmode, dropage, revealbag, lookwipe, dev/* -> devtools.js `_devFetch` -> ok: called only from `_adminFetch` after the key check (grep: no other caller, no socket case reaches a dev lever).
- http:/api/admin/dev/testmode (CAN A PLAYER PUT THEMSELVES IN TEST MODE?) -> testmode.js `_testModeSet` -> NO. Only this admin route writes `testmode:`. The join reads it from storage into `ps._testMode` after the allowlisted spread. No handler copies client keys onto `ps` (grep `ps[k] =`: none from a payload). `_saveRpg`'s fixed list does not carry it. Restore leaves `testmode:` alone, and a restart deletes it.
- http:/api/feedback/crashes, ticket DELETE, sweep DELETE -> feedback.js `_ownerKey` -> ok (asks the room's admin door with the caller's key and address, so misses are counted).
- http:/health/room -> health.js -> ok (up/down for anyone; the numbers only with `_adminAuth` 'ok').
- http:/api/leaderboard/update, gone, faceless, faces (room rows) -> leaderboard.js -> ok (POST only, and routeHttp answers 405 to any non-GET on the public route: reached only through the binding).
- http:/api/market/my, store/mine, arena/status (?playerId of anyone) -> market.js / store.js / gladiator.js -> ok for accounts: they read another player's listings, top bids and arena status, all already public in the browse answers (`_stPublic` carries topBid.bidderId).
- http:/api/market/place, cancel, store/list, buy, bid, accept, cancel, store/* POST, arena/join, leave -> httpauth.js `_httpAuthCheck` -> ok (the playerId must have a live session, and a presented `x-bt-auth` must equal that session's token; enforcement follows the victim's own join). Their value rules are the economy reader's.
- export / delete of a character: there is no server route that deletes a character. The picker's "delete" is client-only (the roster's tombstone, rosterCookie.js, already SEC 19). Export is the admin `/export` above.

#### Files read for my slice
- join.js (auth gate, eviction, char record, new-character claim strip, test-mode read) -> ok except ACC-1, ACC-2.
- account.js -> ok (see the rows).
- loginkeys.js -> ok (keys hashed `btk2|`, an index whose record decides, in `_authSerial`); SEC 17 under the lock off.
- devicelock.js -> ok (decide / remember / fill / admin tools, all in `_authSerial`); pass and off -> SEC 17.
- admin.js -> ok (above); rewind -> ACC-4.
- devtools.js -> ok (admin-only).
- httpauth.js -> ok (the token is a UUID compared with ===, over the network: no practical timing leak).
- testmode.js -> ok (above).
- charname.js, reservednames.js -> ok (the rule at creation; `track` cannot rename; the owner's rename is behind the key).
- persistence.js `_saveRpg` -> ok (a fixed field list built from `ps`; nothing the client names is written except through handlers and the join's clamped captures; the newer-record spread is already SEC); `_handleCharacterReset` / `_resetCharacterData` -> ok (above).
- playerrestore.js, restore.js -> ok (owner-only); restore.js wording -> ACC-4.
- leave.js -> ok (one door; a refused join drops the session, and a joined one runs the full leave with `refusejoined`).
- seathold.js -> ACC-3.
- origin.js -> ok (see /ws).
- verify.js -> ok (see join).
- broverify.js, onchain.js (as used by broverify: `verifyBroOwnership`, `verifyBroWallet`, `balanceOf`, `ownerOf`) -> ok, cosmetic only.
- migrations.js -> ok for accounts (touches no `auth:` / `char:`; a newer worker's save is refused, already SEC).
- report.js -> ok (above).
- silence.js `_frozenDeviceRefuse` / `_ownerDeviceNote` -> ok (the device is the client's own token, and a stranger cannot name another's. Only a test-mode character's device is noted as the owner's, and only the admin key sets test mode).
- index.js routeHttp, GameRoom.fetch, the `join` case (one join per socket: a second is a flood close) -> ok.
- Client: src/networking/index.js (the old key is 4 of 50 words + 0..98 and its id carries words 1-2: see Noted; the device token is 64 random bits from crypto; keys sit in localStorage `bt_passphrase`, `bt_key_ids`) and rosterCookie.js (mirrors keys in `bt_chars`, already SEC 19) -> read only, nothing new.

### A.4 Players' safety (the wire table's social rows, every relay row)

Wire door for every row below: server/src/wire/door.js (prototype keys, numbers
finite, `words` a string under 2000, reqId form) -> index.js `_onMessage` (the
silence door, silence.js `_silenceDoor`, right after) -> the case named.

#### Socket rows (server/src/wire/in.js)
- join (the name others read) -> join.js _handleJoin / charname.js _charNameRefuse, tidyCharName -> ok (held by checkCharName: no hidden characters, staff names refused; guests tidied); `avatar`/`color` -> finding S2
- track (look relay) -> index.js case 'track' + lookrelay.js _lookRelay -> name ok (charname.js _stampRecordName); clanTag/clanColor1 ok (clans.js _clanStampTag); `avatar`/`color` -> finding S2; `rpgData` texts -> finding S3; flood K2 2
- report (field report) -> report.js _reportTake -> ok (numbers only, into the day's book, never to another player; paced REPORT.PACE_MS)
- map_watch -> presence2.js _presence2Watch -> ok as designed (boolean only); what it reveals -> finding S8
- pose -> poses.js _handlePose -> ok (id from POSE.IDS only)
- dice -> dice.js _handleDice -> ok (worker's roll, server name, GAP_MS pace, mutable via dice_roll)
- achv_title -> achievements.js _achvTitle -> ok (an achievement id; the page shows the table's title)
- feedback (socket) -> index.js _onMessage -> ok (reads only); the board's text: feedback.js (cleanChatText, nameReadsAsStaff; SEC/RT-3)
- pet_name -> petbook.js _handlePetName / cleanPetName -> finding S7 (silence covers it: SILENCE_WORDS)
- store_dm -> storechat.js _handleStoreDm -> text ok (_scText: clamp, strip, cleanChatText; _scAllow 5/2 s; silence lane); mute -> finding S5
- store_dm_open -> storechat.js _handleStoreDmOpen -> finding S5 (no mute filter); a buyer reads only their own thread: ok
- store_offer / store_offer_cancel / store_offer_reply -> storeoffer.js -> social side ok (seller-only reply checked by listing's sellerId; no free text); value side: the economy reader's
- arena_sponsor -> gladiator.js _handleArenaSponsor -> ok for safety (a stake, no text, no message to the target)
- trade2_open -> trade2.js _handleTrade2Open -> ok (target online and alive; invite pace 5 s a pair, `invitepace`; accepted only by the target's own open). Note: no place check, a trade can be asked from anywhere in the world (low, by design)
- trade2_set / ready / confirm / cancel / stage_weapon / unstage_weapon / pets -> trade2.js -> social side ok (only the two in the open session act; nothing reaches a third player); value side: the economy reader's
- party_invite -> party.js _handlePartyInvite -> ok (target online; INVITE_REPEAT_MS 5 s a pair); not mute-gated (by design: mute is chat); oracle -> finding S8
- party_accept -> party.js _handlePartyAccept -> ok (only against inviter>accepter recorded from the inviter's socket, INVITE_TTL; nobody joins for another)
- party_decline -> party.js _handlePartyDecline -> ok (a notice only for a real pending invite)
- party_leave -> party.js _handlePartyLeave -> ok
- party_kick -> party.js _handlePartyKick -> ok (leader only, member only)
- party_chat -> party.js _handlePartyChat -> ok (clamp, strip, cleanChatText, social allowance, mute per member, server-stamped sender)
- alliance_name -> alliance.js _handleAllianceName -> leader-only ok; the name/tag rule -> finding S7
- alliance_war -> alliance.js _handleAllianceWar -> ok (leader only; a war on another alliance by tag is the design; no text)
- alliance_board -> alliance.js _handleAllianceBoard -> ok (reads the stored rows)
- friend_request -> friends.js _handleFriendRequest -> ok (target exists; REQ_OUT 25, REQ_IN 50 (SEC 10); 5 s card pace (MOD PR 4); target sees the server's name; not mute-gated: card Q's block)
- friend_accept -> friends.js _friendAcceptCore -> ok (only against a stored reqIn)
- friend_decline -> friends.js _handleFriendDecline -> ok (silent to the requester)
- friend_remove -> friends.js _handleFriendRemove -> ok (both sides cut)
- friend_dm -> friends.js _handleFriendDm -> ok (friends only; clamp, strip, cleanChatText; lane bucket; mute drops, never backlogged; backlog per-sender cap)
- clan_create -> clans.js _handleClanCreate -> ok (refused while clanparty is on: dormant)
- clan_join_accept -> clans.js _handleClanJoinAccept -> ok (refused while clanparty is on; with it off, only against a recorded leader's invite)
- clan_leave -> clans.js _handleClanLeave -> ok
- clan_kick -> clans.js _handleClanKick -> ok (leader only, member only)
- clan_war_declare -> clans.js _handleClanWarDeclare -> ok (refused while clanparty is on)
- area_chat -> chatlanes.js _handleAreaChat -> ok (clamp, strip, cleanChatText, repeat filter, lane bucket, zone only, mute per recipient); cleaner gaps -> finding S6
- whisper -> chatlanes.js _handleWhisper -> ok (clamp, strip, cleanChatText, bucket, ambiguous names refused, mute silent); oracle -> finding S8
- chat_mute -> chatmod.js _handleChatMute -> ok (own list; MUTE_MAX 200; null-proto; bad keys; PACE.MUTE writes). What it covers: chat, emote, dice_roll relays (tick.js fan-out), area, whisper, party, friend DM, store DM live -> gaps: findings S1 (duel), S5 (store thread)
- chat_report -> chatmod.js _handleChatReport -> ok (reason allowlist; quotes only the server's own lines; target must exist or be heard; 5/h, 20/day, same target 60 s; reqonce)
- nml_lock_ask -> nomansland.js _handleNmlLockAsk -> ok (only while locked from that player; LOCK_ASK_MS 60 s a pair; to that player only)
- nml_lock_allow -> nomansland.js _handleNmlLockAllow -> ok (only the one beaten lifts the lock on their beater)

#### Relay rows (server/src/wire/relays.js; index.js `_onMessage` default branch -> relay.js `_relayAllowed`, `_relayBuild` (K2), relay bucket / social allowance, `_relayBytesDrop` (K2))
- chat -> index.js _sanitizeChatRelay -> ok (payload rebuilt {id,name,text,color}; clamp, strip, cleanChatText, repeat filter, social allowance 5/2 s, colour #hex, mutable, silence lane); cleaner gaps -> finding S6
- emote -> emotes.js _sanitizeEmoteRelay -> ok (listed emoji / lines / moves only, rebuilt, placed near the sender, mutable, quick lines silenced)
- duel_request / duel_wager_request -> duel.js _interceptDuel -> finding S1 (no pace, no place, no mute, room-wide)
- duel_accept -> duel.js _interceptDuel -> ok (only against the challenger's own recorded challenge, TTL; same zone; fight lock; stake <= what the accepter was shown; both stakes in one write)
- duel_decline -> duel.js _interceptDuel -> finding S4 (relayed with no challenge, `reason` rides)
- trade_offer / trade_accept / trade_reject -> trade.js _interceptTrade -> ok (the gift is closed while trade2 is on; offer sanitised; accept only against a live offer; names rebuilt); trade_reject's words: K2 5
- clan_invite -> index.js default (clanparty on: dropped before any fan-out) -> ok (dormant); with clanparty off, clanName/clanTag words relayed as sent (dormant; silence covers it)
- pvp_threat / threat_response -> threat.js _interceptThreat -> ok (OPEN_PVP false: every one dropped)
- campfire_lit / campfire_out / gather_node / monster_dmg_at / player_died_to_monster / player_dodge / player_hurt_by_monster / player_jump / player_projectile / player_respawned / player_shield / player_swing / pvp_confirmed / stunned -> index.js default, `_relayBuild` -> no player text reaches another screen except what K2 5 already names (monster_dmg_at dmg text, pvp_confirmed); the fields are 'look' claims drawn through the page's catalogs (K2 4/5 typing)

#### HTTP rows (server/src/wire/http.js) that list players, positions or a player's words
- http:/api/lobby -> index.js routeHttp -> ok (no player named)
- http:/health, /health/room, /_room_count, /_room_health -> ok (numbers only; room numbers behind the owner's key)
- http:/api/leaderboard/top -> leaderboard.js getTop -> name ok (the room's), lastSeen to the hour (OPS); `color` -> finding S2; `clanTag` -> finding S3
- http:/api/leaderboard/update (room only) -> leaderboard.js updatePlayer -> finding S2 (color kept as any 32 chars), S3 (clanTag as reported)
- http:/api/store/browse -> store.js _stBrowse/_stPublic -> ok (seller name snapshot, colour #hex, avatar https-only); live avatar as an online flag -> finding S8
- http:/api/store/mine -> store.js _storeFetch -> ok (no auth, but every field is already on the public browse: topBid's bidder id and name)
- http:/api/market/orders, /api/market/my, /api/market/history -> market.js -> ok for safety (names held by #1947 / MOD; public by design)
- http:/api/arena/tournament -> gladiator.js _arenaWire -> ok (names are the characters', MOD PR 10)
- http:/api/arena/status -> gladiator.js _arenaStatusFor -> any id's arena status (finding S8, low)
- http:/api/arena/join -> gladiator.js _arenaJoin -> ok (x-bt-auth; the bracket name is the character's)
- http:/api/feedback/list -> feedback.js -> ok (served cleaned, staff names refused; SEC/RT-3)
- http:/api/admin/reports GET/DELETE, /api/admin/silence, /api/admin/rename -> chatmod.js / silence.js / charname.js -> ok (admin key)

#### Files in the slice
- chatguard.js -> finding S6; SOCIAL allowance ok
- chatlanes.js -> ok; finding S8 (whisper oracle)
- chatmod.js -> ok (mute list, reports); mute scope gaps findings S1, S5
- words.js -> ok (templates; a player's words are parts, never the sentence)
- reservednames.js -> ok for character names; not applied to pets/alliances: finding S7
- charname.js -> ok
- silence.js -> ok (lanes, names, quick-line emotes); `track` left open on purpose, so S2/S3 text and pictures pass a silence too
- storechat.js -> finding S5
- emotes.js -> ok
- friends.js -> ok
- party.js -> ok
- clanparty.js -> ok (clans turned into parties once; names kept clamped)
- clans.js -> ok (dormant behind clanparty; stamps the top-level tag)
- guilds.js -> not social (guild_quest_turn_in: a quest, no other player); ok
- alliance.js -> finding S7
- duel.js -> findings S1, S4
- spar.js -> ok (the owner's Test panel only; a clone fights only its owner)
- pvpbalance.js / pvpextras.js / pvplunge.js -> combat numbers; no invite, no text: ok
- trade2.js -> ok (invite pace); trade.js -> ok (gift closed)
- gladiator.js -> ok (no player-to-player challenge exists; names the character's); status read -> S8
- report.js -> ok (numbers only)
- presence2.js -> finding S8 (design)
- wheelnear.js -> ok (monsters only, no player data)
- nearjoin.js -> ok (what far players' list entries carry is what the lists show; `avatar`/`color` in them -> S2)
- tick.js fields about players -> PEER_PUBLIC_KEYS (index.js) only: look keys, place, `bro`, `allyTag` -> ok; S2/S3 ride the look keys
- relay.js / send.js / flood.js (K2's) -> read for the default branch only; S4 noted as K2-class
