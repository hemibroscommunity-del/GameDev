# Five dashboard buttons: Gear, Bro, Quests, Codex, More (v2.3.4162)

The owner, 2026-11-02: "I want to consolidate the dashboard area as much as
possible (limit lots of buttons to switch between different context) I have
the bag, character, quest, lifeskills, bestiary, and more (the ellipses
button)".  His table:

| Button | Holds |
|---|---|
| Gear | inventory, character preview, equipped items, stats, gold |
| Bro | PFP, player card (titles, etc), combat stats and combat skills, point allocation, quests completed, achievements, achievement points |
| Codex | bestiary, catalog of all items, discoveries |
| More | map, social features, settings, account, character switching |

Asked, he chose **five** buttons: Quests keeps its own ("the quest journal is
the main 'what do I do next' help for new players, so it stays one tap
away"); Life Skills move inside Bro.  From the review of the dashboard he
adopted: "remove the large OPEN/CLOSE button taking up a full navigation
slot. A slim, centered handle at the top of the dashboard would communicate
that the panel can be expanded or collapsed"; "Switch character / logout:
More → Account"; "The notification bell could also move to More, retaining an
unread badge"; "Achievement points: ... an explicit 'Achievement Points: 40'
... in player profiles".

This PR is the shell (the dashboard lane's B2).  Gear's own contents are the
Gear-tab lane's (v2.3.4151, #1388, on main); the top bar's door, medal and gold come off in
the top-bar lane once this is on main; one layout on every screen is B3.

## What changed

- **The row** (`BottomDashboard.jsx` `RAIL_ITEMS`, `dash/NavRail.jsx`): Gear
  (id `dashboard`, I), Bro (id `hero`, P), Quests (`quests`, J), Codex
  (`encyclopedia`, K), More (`more`, O).  The ids stay (tests, the coach and
  the guide arrow key on them; TRAPS §29).  The Skills button is gone.
  **CLOSE at the left, and the words** (the owner's drawing of the row,
  `61C354F2-F323-4048-921E-654578D99AD6.png`, and of the Bro page,
  `D474F679-6893-4890-823A-3BC96F817184.png`, in the repo root; "Keep the 5
  buttons"): upright, `BandClose` (`dash/BandGrip.jsx`, `data-dash-close`,
  56 px, `sheetGeometry` `BAND_CLOSE_W`) stands first in the row and does the
  handle's tap (with a page open: close it and fold; at rest: fold; folded it
  reads OPEN and unfolds).  The five share the rest (`RAIL_COUNT` 5,
  `IDENTITY_MIN_LINE` 60, ceiling 96): 58 px at 390, 52 at 360, 44 at 320.
  Each button wears its word where it fits at 11 px (`NavRail`
  `navLabelMode`, from its real width, measured: the side dock's buttons
  flex): beside the picture from 86 px (a tablet, a computer's one band),
  under it from 46 (an upright phone, a computer's side column), the picture
  alone below (a 320 px phone, a phone on its side); `data-nav-words` on the
  rail says which.  Sideways the fold chip says CLOSE / OPEN on a phone too
  (it showed ▾ / ▴).  Sideways the dock buttons go 26 → 31
  px so the dock (`landscapeNavGroupW`) and the side column stay 214 px, to
  the pixel.  A tap on Gear on a folded upright band unfolds it (B1's
  v2.3.3897 rule, carried here).
- **Life Skills and Achievements are pages under Bro.**  `dashboardPanelBus`
  (`BRO_PAGES`) puts `open/push/toggle('skills' | 'achievements')` at stack
  `['hero', id]` (a push from a page already under Bro goes on top of it), so
  every old road (the L key, the top bar's AP medal, a card's title chip,
  tests) lands there, with the page's drilled header and a back chip to the
  Bro card.  L opens Life Skills, and again (it showing) closes it
  (`deskKeys.navKey`: `bus.current() === 'skills'`).
- **Bro, as the owner drew it** (`sheet/BroCard.jsx`).  The first card was
  your own inspect card (`PlayerProfilePanel` drawn `embedded`); the owner:
  "I'll need to change the layout of the bro tab, it reads like an old PC
  menu", then the drawing and "One different thing is the xp bar near
  profile portrait (no general combat xp)", "No don't change todays dashboard
  height", and of the portrait the top-left frame lost: "I'm wanting the
  portrait in the bro section".  `PlayerProfilePanel` is back as on main.
  Three panels (`data-bro-panel` id | stats | rows):
  - **you**: `portraitSrc` in a gold frame, name, "Lv N" (`prog3CharLevel`),
    no XP bar; the worn title (`S._achv.t`) as a gold ribbon or "No title";
    the clan line (`[TAG]`, "No clan" / "No party"; a door to the clan); the
    AP (`achvApTotal`; a door to Achievements); tiles Achievements n / total
    (`achvSummary`) and Lifetime Kills (`profileFromSelf`).
  - **the weapon's stats** (`sheet/broStats.js` `broWeaponStats(R, cat)`,
    pure, `server/test/bro-stats.test.mjs`): Sword | Bow | Staff, starting on
    `prog3ActiveCat`, kept while the page is visited.  Thirteen rows: Damage
    and DPS (`calcDisplayDmgRange` / `calcDisplayDps` for that slot's weapon),
    Attack Speed (1000 / `statSim.autoSwingMs`, "/s"), Range
    (`statSim.reachOf`, tiles), then `heroStatPills` worked out with
    `activeSlot` set to that weapon: Crit Chance, Crit Damage, Special Damage,
    Element Power (the weapon's `element1`, then the lane's power), Defense,
    Armor, Dodge, Resist, Move Speed.  An empty slot: "No bow equipped", the
    weapon's four rows dashes.
  - **the doors** (`data-bro-row`): Achievements, Life Skills (in the
    drawing's "Attributes" place: no STR / AGI / INT exists), Points
    (`data-section="Build"`, glowing while N > 0: the coach's "Tap Points",
    the guide arrow and the points bubbles aim at it), Equipment (the Gear tab, v2.3.4151, on
    main since #1388: `openGear`, the Gear button's own road -- the band at
    rest, unfolded; sideways the 'dashboard' page), Homestead (`farmPlotsReady`; no farm window
    away from the farm, so a tap explains the Feed & Seed), Pet (More's Pets
    page), Titles (`askTitlePicker`: the Achievements page opens on the row
    you would pick a title from), Clan.
  The shape is the box's width, measured (`data-bro-cols`): 3 side by side
  from 600 px, each panel its own scroller; 2 (you | the doors, the stats
  under them) from 340, one scroller: upright the Points door must be on
  screen when the page opens; 1 below (sideways, ~220 px).  A taller box
  shows more.  `window.__btBroCard` is QA's `{cols, weapon}`.
- **The guide arrow and the bubbles skip what is scrolled away**
  (`guideArrow.js` `scrolledAway`, `questFly.js` `shownRect`): an element
  whose middle is outside a box that clips it is not "on the screen" (the
  Points row scrolls with the page now).
- **Points and Equipment are windows over the card** (`sheet/HeroExpanded.jsx`
  `SECTIONS = ['Card', 'Build', 'Overview']`): the same two screens in the
  same scroller, framed, under a title row (`data-bro-popup-head`, where the
  tab row stood, the same height) with a close (`data-bro-popup-close`,
  `data-esc`) back to the card.  The card is not mounted under a window (one
  `data-section="Build"` on the page).  The Points title carries the glow
  while points wait (v2.3.3004's "until all points are spent").  Equipment
  stays here, reached only by name since the Gear tab (`request('Overview')`:
  the stat families, the figure and the item cards are not on Gear yet, and
  ten phone tests read them).  `heroSectionBus.shown` is 'Card', 'Build' or
  'Overview'; a request for 'Me' shows the card; `window.__btHeroSection` is
  QA's handle.
- **More** (`dash/MorePanel.jsx`): Map (closes the dashboard, opens the World
  map; the Map page where there is none), Social, Party/Clan, Guild, Pets,
  Journey, Leaderboards, Settings, Account, Notifications (unread badge),
  Feedback, About.  Page titles follow (`PANELS`: Social, Leaderboards,
  Account).
- **Account** (`dash/AccountPanel.jsx`): Log out / Switch character first:
  the top bar door's confirm window, words and "more than one bro" rule
  (`rosterCount() > 1`), its dim and spinner, its one-shot `bt_open_list`, and
  GameApp's address (`noresume` + `login`, the page's switches kept).  Then
  the Login Key card and form.
- **The bell** (`WorldChatFeed.jsx`, `notifBus.js`,
  `dash/NotificationsPanel.jsx`): shut, the feed draws nothing in the world's
  corner.  `notifBus` holds the shut flag (the same `bt_worldchat_shut` key)
  and the seen mark; `notifUnread(S)` is the count on the More button and the
  tile.  More → Notifications lists the lines newest first, marks them seen,
  and "Show on screen" opens the feed; a tap on the feed folds it (v2.3.2325).
- **The handle** (`dash/BandGrip.jsx` `BandGrip`): upright only, on the band's top edge,
  a 36 x 5 bar on a 56 px tab, the tap area the tab, 64 x 20, from 16 px
  above the band to 4 px into it (it was 64 x 44 until CLOSE came back: that
  patch took the centre of the weapon pill) (the nav row's top air, so it never takes the middle
  button's press).  Same tap as CLOSE / OPEN, `data-dash-fold="open|min"`
  kept, `swallowTapClick` (TRAPS §247).  Sideways and on a computer the fold
  chip stays (B3).  CLOSE in the row does the same tap (above).
- **Words**: the coach's "Tap OPEN" lines say "Tap the handle"; the points
  tip says "Tap Bro", then "Your N points are waiting. Tap Points."; the
  guide arrow "Tap Points"; the Login Key lesson says "More > Account";
  the keys list says Gear and Bro.

## Kill switch, caps

None: a client-only layout change, no wire, no server behaviour.

## Tests

- `notifbell` (rewritten): the corner empty while shut, the count on More and
  its tile, the page, Show on screen, a tap folds it, a new line counts.
- `brocard` (new; Equipment opens the Gear tab and the Bro button brings
  the card back): the row (CLOSE first, the five with their words, none
  cut, 44 x 44, touch-action), the card's three panels (portrait, name, Lv,
  no XP bar, No title, No clan, AP, the tiles; the thirteen stats starting on
  the weapon out, Bow changing them; the doors), Points lit and on screen
  after a real level-up, every door to its page or window and back, the left
  panel's doors, an old road, CLOSE folding and OPEN unfolding, a 320 px phone
  (pictures alone), a tablet (three panels side by side), sideways (one
  column, the chip's CLOSE), a computer (P, a click on Points, Esc, L and L).
  Pictures: `docs/shots/bro-tab-v2*.webp`.
- `bandshots` (new): the band open on Gear and on Bro on a computer
  (1280 x 720 and 1920 x 1080, wide), a phone on its side and upright: Gear's
  tab at rest (never the old bag page), the Bro card filling the centred
  `data-band-box` and no more, CLOSE first in the row.  Pictures:
  `docs/shots/band-{gear,bro}-{desk,side,up}.webp`.
- `server/test/bro-stats` (new): the thirteen rows, one reader with the
  Equipment window's pills, a lane's own points, an empty slot, the start,
  junk, the Titles ask.
- `codexfit`, `goldrail`, `bandsummary`, `deskkeys`, `deskwide`,
  `achievements`, `loginkey` (Account and its confirm), `rehearsal`,
  `landscape-dash`, `weaponswap`, `chatlayer`, `coachdesk`, `pointstips`,
  `pointsglow`, `statpeek`, `statdemo`, `nozoom`, `infopop`: moved to five
  buttons, the handle, the Bro card and its windows, and the bell in More.
- Scenarios that opened the Character page for its Equipment tab ask for that
  window (`__btHeroSection.request('Overview')`); `H.openDest(P, 'Character')`
  does the same and maps Dashboard → Gear, Friends → Social.  Scenarios that
  wanted Points open Bro (`'Bro'`, or `request('Card')`) and press the card's
  Points row (`[data-section="Build"]`, a button: a click).
  `H.openWorldChat` walks More → Notifications → Show on screen.
- `server/test/points-tips`, `guide-arrow`, `achievements-client` hold the
  words, the Points door and Achievements under Bro.
- UI review: `dash-bro` (the card), `dash-bro-points` and `dash-bro-equipment`
  (the windows), `dash-bro-skills`,
  `dash-bro-skill-detail`, `dash-bro-achievements`, `more-account`,
  `more-notifications`.
