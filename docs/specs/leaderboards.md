# The Leaderboards: their own button, faces, the daily spin's records, deleted stand-ins (v2.3.4393)

> The owner, 2026-11-09: *"I want to reorganize the 'quests' section and make
> room for a new 'leaderboards' button on the dashboard (I think this is
> already in the 'more' button). But the leaderboards should be expanded and
> easier to navigate from mobile and include the character profile pic and
> level next to each record. Also I want to have the 'daily spin' biggest wins
> and losses records. Additionally is it possible to have stand-in (deleted
> character) rows if the record was made by a deleted character? Maybe still
> include their profile pic and level but just grayed out with the deleted
> label over it."*

## What a player sees

- **A sixth button on the dashboard's row: Ranks**, between Quests and the
  Codex (Gear, Bro, Quests, Ranks, Codex, More). It opens the Leaderboards.
  On a computer its key is **U**. More has eleven tiles now: the Leaderboards'
  tile is gone, as Quests' and the Codex's went when they got buttons.
- **The page is a list of boards down the left and the board beside it.**
  - **Ranks**: Level, Melee, Bow, Magic, Kills, AP.
  - **Records**: Daily spin, Coin flip, Biggest fish.
  - **Skills**: the ten life skills.

  One tap changes board; the list and the board scroll by themselves. On a
  page too narrow or too short for both (a phone on its side) the list is a
  row of chips over the board.
- **The headings (Ranks, Records, Skills) headline their sections**: brass,
  13 px, heavy, with a brass rule under each (v2.3.4394; they were small grey
  captions).
- **Each board is a pill-shaped button with its own picture**: the level-up
  star, the sword, the bow, the staff, the sword and skull (Kills), the
  achievements' medal (AP), the prize wheel (Daily spin), a gold coin (Coin
  flip), a trout (Biggest fish), and each life skill's own icon. The fish
  board's kinds (Minnow, Clownfish, ...) wear their fish too.
- **Every row**: the rank, the character's **face** (a Hemi Bro bust), the
  name, the **level** in a small pill beside it, a short line about the
  record, and the record. Your own row is lit.
- **The first five places wear the owner's trophies** where the rank was: a
  crowned gold cup, a silver cup, a bronze cup, a yellow rosette and a pink
  one, each with its number on it. From sixth place down the column says
  "#6". Each trophy **shines and sparkles**: a band of light crosses it every
  few seconds and small stars wink on its rim, the top five glinting down the
  column in turn. A deleted character's trophy is grey and still.
- **Daily spin** has two buttons, **Biggest wins** and **Biggest losses**:
  - a win is a pot paid from the daily spin: taken, kept for you at the day's
    end, or paid at the house limit (100,000);
  - a loss is a pot lost to a double or nothing;
  - the ten biggest of each, one row a player (their best);
  - the line under the name: "No doubles", "3 doubles", "On the 2nd double";
  - both spins count: the FREE DAILY SPIN on the top bar and the Gambling
    Den's.
- **A deleted character keeps its rows**, grey: the face dimmed under a
  DELETED stamp, the name, level and record muted. If the player starts again,
  the new character's records are rows of their own beside it.
  - On the **Records** boards a stand-in stays until it is beaten.
  - On the **Ranks** boards it stays 7 days, as a player who stopped playing
    does.
  - "Deleted" means restarted for good ("deleted forever": Settings, or the
    character list's Restart). Removing a character from one device's list
    deletes nothing: its Login Key still reaches it, so its rows stay live.

## How it is built

### The server (`server/src/boards.js`, mixed into GameRoom)

- **The face is a look, never an image** (the Ace board's rule, v2.3.2619).
  `boardFace(look)` keeps the short ids a bust is drawn from (`FACE_KEYS`:
  `sk hr hc hw htc fh fhc ew ewc es ec sc st stc sp`) and drops everything
  else: no 256-character drawing reaches a board row.
- **`_boardWho(pid)`**: `{name, lv, look}` of a player who is here. `lv` is
  the name plate's level (`_prog3CharLevel`), `look` from the session's
  character record. `_boardWhoStored(pid, hint)` for one who has left: the
  name and face off `char:<pid>`, the level the spin stamped.
- **`spin_board`** (one GameRoom key): `{v, w, l}`, two lists of ten, each
  row `{pid, name, n, k, at, lv, look?, gone?}`. `_spinBoardEnsure` reads it
  once a worker's life; a newer `v` or a failed read locks it (shown as
  unavailable, never written). `_spinBoardEnter` is synchronous: one row a
  player a list, ties keep the earlier row above, a spin that takes no place
  writes nothing. `_spinBoardRecord(pid, n, won, k, hint)` is what the spins
  call, **after** the spin is settled and saved, inside a `try`: a record is
  never allowed to cost a pot.
  - `loginspin.js`: `_loginSpinSettle` records the pot paid; a lost double
    records what the pot held; the spin stamps `nm`, `lv` into `lspin:<acct>`
    so a pot paid after the spinner left (the idle timer, another character's
    ask) still has its name and level.
  - `dailyrewards.js`: `_spinPay` records the pot paid (not for a `dup`); a
    lost double records `news.lost` once the run is saved.
- **The other boards carry the same two fields.** `fishlog.js`
  `_fishBoardEnter` stamps `lv` and `look`; `gamble.js` `_aceBoardRecord`
  stamps `lv` (its row has carried the whole look since v2.3.2619).
- **The ranks** (`leaderboard.js`, the Leaderboard object): the room's report
  carries `look` (in its change signature; a look is written once, so it never
  causes a write by itself); `getTop` adds `lv`, the highest of the three
  combat levels, to every row whatever the board ranks.
- **A deleted character** (`persistence.js` `_resetCharacterData` calls
  `_boardsGone(pid)` after the state is dropped and before the socket closes):
  - `retireRows(rows, pid, at)`: every live row of that id becomes
    `{...row, pid: '<pid>#<at>', gone: at}`. Applied to `fish_board`,
    `spin_board` and `ace_board` (`_fishBoardRetire`, `_aceBoardRetire`).
    Every "is this my row" test skips `gone` rows, so the next life's record is
    a row of its own.
  - the Leaderboard object's `POST /gone {playerId, ts}` (`markGone`): moves
    `player:<pid>` to `gone:<pid>:<ts>` with `gone` set and the id
    `<pid>#<ts>`; `getTop` lists both prefixes; stand-ins older than 7 days
    are pruned by the next delete. Reachable only over the object binding:
    the public `/api/leaderboard` route is GET-only (index.js).
  - the session is marked `_lbGone` first, so a `track` let in while those
    writes run reports nothing of the old life.
  - Best-effort, piece by piece: a board that cannot be read keeps its row
    live, which never fails a restart.

### The wire

| message | direction | what |
|---|---|---|
| `spin_board_request {}` | phone to worker | the daily spin's records, under `caps.boards2` |
| `spin_board {wins, losses}` \| `{off: true}` \| `{unavailable: true}` | worker to phone, PRIVILEGED | the two lists |
| `/api/leaderboard/top` rows | HTTP | now with `lv`, `look?`, `gone?` |
| `fish_board` rows | worker to phone | now with `lv?`, `look?`, `gone?` |
| `ace_board` rows | worker to phone | now with `lv?`, `gone?` |

### Caps and the kill switch

- **`caps.boards2`**: the phone shows the Daily spin board and asks for it
  only against a worker that says so. Faces, levels and stand-ins draw
  wherever a row carries them, so either side may ship first: an old worker's
  rows show the name's initial and no pill.
- **`boards2: false`** in the live flags: un-advertises the cap, records no
  spin, stamps no face or level on a new row, puts no look in the ranks
  report, retires no row. What is already on the boards stays.

### The phone

- `src/ui/mobile/dash/LeaderboardPanel.jsx`: `boardList(S)` (the list, by the
  worker's caps), the list and the board side by side from 330 px wide and
  140 px tall, the chips below that; `RankBoard` (the fetch, 20 s),
  `SpinBoard` and `FlipBoard` (`WinLossBoard`, asked every 30 s while open),
  `FishBoard`. The board showing is remembered while the game is open.
- `src/ui/mobile/dash/BoardRow.jsx`: `BoardRow`, `BoardFace`, `BoardEmpty`,
  `useBoardFaces(rows)`. A bust is drawn by the one recipe every portrait of
  somebody else uses (`peerCosmeticsFromWire` then `portraitOptsFromPeer` then
  `portraitDataUrl`); its layers are behind the loading screen already
  (`preloadAnimations.js` `hemiBust`), so nothing loads on first use. The
  busts are data URLs of about 1 KB kept by look in a map capped at 120,
  oldest out (MEMORY IS BUDGETED: a cache has a cap).
- The pills: `LeaderboardPanel.jsx` `CatIcon` and each board's `icon` (a
  picture the game already uses, scaled by its opaque box to fill 20 px:
  nothing new is drawn or loaded). "Smithing" is the Life Skills page's own
  word for Blacksmithing; thirteen letters do not fit a pill.
- The trophies: `BoardRow.jsx` `RankMark`; the pictures
  `public/icons/ui/rank-1..5.webp` (120 px, 256 colours, about 5 KB each), cut
  from the owner's sheet (`assets/icons-source/rank-trophies-2026-11-09/`) by
  `tools/ui/cut-rank-trophies.py`. The shine and the stars are CSS
  (`game.css` `.bt-rank-shine`, `.bt-rank-spark`): the picture is its own
  mask for the band of light, the stars are a `clip-path`; transforms and
  opacity only, nothing under `prefers-reduced-motion`, nothing loaded.
- `src/game/spinBoard.js`: the ask, the answer kept on `S._spinBoard`
  (`window.__btSpinBoard` for QA), the rows' words.
- The row: `BottomDashboard.jsx` `DESTINATIONS` / `RAIL_ORDER`,
  `sheetGeometry.js` `RAIL_COUNT` 6, `bandCloseW`, `LAND_NAV_BTN_W` 26,
  `NavRail.jsx` `NAV_WORDS_STACK` 45 and the button's `title`,
  `deskKeys.js` `NAV_KEYS.leaderboard` U, `dashboardPanelBus.js` `OWN_PAGES`.

## Costs

- **Writes**: `spin_board` only when a spin takes a place (at most one row a
  spin; a player has one free spin a day and a few bonus ones). A character
  delete: one write a board it was on, one move in the Leaderboard object.
  The ranks report writes as often as it did.
- **Bytes**: a look is about 150 bytes; fifty rows of a board about 8 KB more.
- **Memory**: about 1 KB a face shown, 120 at most.

## Not built

- A "you are #37" line under a board when you are below what it shows.
- When each record was set.
- A server-side delete from the character list's "Remove from this device"
  (today it only forgets the key on that device).

## Tests

- `server/test/boards.test.mjs`: the cap and the privileged event; the face
  is a look; the login wheel's wins and losses; a pot paid after the player
  left; the Gambling Den's spin; the fish and Ace rows; a deleted character on
  every board and its next life; the ranks object by itself (look, `lv`,
  `markGone`, the 7-day prune, the read-only public route); the kill switch;
  cost and a stored board made safe.
- `node tools/qa/mp/run.mjs boards` (`mp-boards.mjs`): a phone in the Wheel
  and three plain-socket players who really spin (one takes the pot, one
  doubles until it is lost, one takes it and deletes the character): the six
  buttons, the page, faces and levels, the win, the loss, the grey DELETED
  rows, sideways, 375 / 360 / 320 px. Pictures: `docs/shots/leaderboards-*.webp`.
- UI review states `dash-leaderboard`, `leaderboard-spin`, `fish-board`.

## Rows from before a row carried a face (v2.3.4480)

A row gets its look when its record is set, so a row set before v2.3.4393, by
a player who had not been back, showed an initial. Once a worker's life the
room gives the ranks' and the biggest fish's faceless rows the face their
character's record draws (`boards.js _boardsFaceFill`; char-watch.md has the
rules). A guest's row keeps its initial.
