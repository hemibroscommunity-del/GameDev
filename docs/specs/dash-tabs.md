# Five dashboard buttons: Gear, Bro, Quests, Codex, More (v2.3.4082)

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
Gear-tab lane's (v2.3.3940); the top bar's door, medal and gold come off in
the top-bar lane once this is on main; one layout on every screen is B3.

## What changed

- **The row** (`BottomDashboard.jsx` `RAIL_ITEMS`, `dash/NavRail.jsx`): Gear
  (id `dashboard`, I), Bro (id `hero`, P), Quests (`quests`, J), Codex
  (`encyclopedia`, K), More (`more`, O).  The ids stay (tests, the coach and
  the guide arrow key on them; TRAPS §29); the words are the aria-label and
  title, the buttons icon-only as before.  The Skills button is gone.  The
  five share the row (`sheetGeometry` `RAIL_COUNT` 5, `IDENTITY_MIN_LINE` 0,
  ceiling 80): 70 px at 390, 64 at 360.  Sideways the dock buttons go 26 → 31
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
- **Bro is your own inspect card** (`sheet/BroCard.jsx`).  The owner, on the
  first cut (five tabs): "I wanted the bro tab to be like what it looks like
  when you inspect another player.  PFP clan, achievements, all the base
  character stats, primary combat skills, place where you can tap to open
  points spend window, etc".  So it is `ui/panels/PlayerProfilePanel.jsx`
  (the Inspect card behind another player's portrait) drawn `embedded` in the
  dashboard from `profileFromSelf` (with the level, the worker's AP and the
  combat bars on top: `broProfile`), no tab row.  The card's own layout:
  portrait, name, LV, AP (a door to Achievements), quests, leaderboard; title
  and clan ("No Clan"; a door to the clan's page); Melee / Bow / Magic with a
  bar each; the six worn slots (a door to Equipment); lifetime kills, rarest
  achievement, the Homestead.  What only your card adds, through the card's
  `slots`: your stats after the slots (HP, stamina, mana; the offense and
  defense pills from `heroStatPills`, each its explainer), an Achievements row
  (AP, "n of 33", the latest three badges; only with `caps.achievements`) and
  a Life Skills row (total level, the unseen dot, L on a computer) after the
  showcase, and **"Spend points (N)"** in the command dock's place (another
  player's Party / Trade / Duel): sticky at the card's bottom edge, so on the
  phone's ~190 px page it is always on screen; gold and glowing (`bt-pts-glow`)
  while N > 0; `data-section="Build"`, so the coach, the guide arrow ("Tap
  Spend points") and the points bubbles (`pointsFly.js`) aim at it.
  "The five points stats" (Power, Vitality, Endurance, Agility, Mind) are the
  retired tier-1 stats (StatScreenPanel v2.3.1236): the card shows what points
  buy now.
- **The card component, shared** (`PlayerProfilePanel`): five optional props,
  none passed by an inspect window, which is unchanged: `embedded` (no ✕, the
  frame from `.bt-pin.is-embedded`; the window's sideways two-column grid is
  undone there), `slots` ({ afterTags, afterEquip, end, dock }), `onAp`,
  `onClan`, `onEquipment`; and a profile's `combatPct` draws the bars.  The
  coach's "stand down under a card" rule skips the embedded one
  (`body:has(.bt-pcard:not(.is-embedded))`).
- **Points and Equipment are windows over the card** (`sheet/HeroExpanded.jsx`
  `SECTIONS = ['Card', 'Build', 'Overview']`): the same two screens in the
  same scroller, framed, under a title row (`data-bro-popup-head`, where the
  tab row stood, the same height) with a close (`data-bro-popup-close`,
  `data-esc`) back to the card.  The card is not mounted under a window (one
  `data-section="Build"` on the page).  The Points title carries the glow
  while points wait (v2.3.3004's "until all points are spent").  Equipment
  stays here, reached from the card's slots, until the Gear button's lane
  (v2.3.3940) is on main.  `heroSectionBus.shown` is 'Card', 'Build' or
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
- **The handle** (`dash/BandGrip.jsx`): upright only, on the band's top edge,
  a 36 x 5 bar on a 56 px tab, the tap area 64 x 44 from 40 px above the band
  to 4 px into it (the nav row's top air, so it never takes the middle
  button's press).  Same tap as CLOSE / OPEN, `data-dash-fold="open|min"`
  kept, `swallowTapClick` (TRAPS §247).  Sideways and on a computer the fold
  chip stays (B3).
- **Words**: the coach's "Tap OPEN" lines say "Tap the handle"; the points
  tip says "Tap Bro", then "Your N points are waiting. Tap Spend points."; the
  guide arrow "Tap Spend points"; the Login Key lesson says "More > Account";
  the keys list says Gear and Bro.

## Kill switch, caps

None: a client-only layout change, no wire, no server behaviour.

## Tests

- `notifbell` (rewritten): the corner empty while shut, the count on More and
  its tile, the page, Show on screen, a tap folds it, a new line counts.
- `brocard` (new): the card (portrait, name, LV, AP, clan, three combat
  skills with bars, the stats, the rows), Spend points lit and on screen after
  a real level-up, its window and close, the slots' Equipment window, Life
  Skills / Achievements / the clan under Bro, an old road, a computer (P, a
  click, Esc).  Pictures: `docs/shots/bro-tab*.webp`.
- `codexfit`, `goldrail`, `bandsummary`, `deskkeys`, `deskwide`,
  `achievements`, `loginkey` (Account and its confirm), `rehearsal`,
  `landscape-dash`, `weaponswap`, `chatlayer`, `coachdesk`, `pointstips`,
  `pointsglow`, `statpeek`, `statdemo`, `nozoom`, `infopop`: moved to five
  buttons, the handle, the Bro card and its windows, and the bell in More.
- Scenarios that opened the Character page for its Equipment tab ask for that
  window (`__btHeroSection.request('Overview')`); `H.openDest(P, 'Character')`
  does the same and maps Dashboard → Gear, Friends → Social.  Scenarios that
  wanted Points open Bro (`'Bro'`, or `request('Card')`) and press the card's
  Spend points (`[data-section="Build"]`, a button: a click).
  `H.openWorldChat` walks More → Notifications → Show on screen.
- `server/test/points-tips`, `guide-arrow`, `achievements-client` hold the
  words, the Spend points door and Achievements under Bro.
- UI review: `dash-bro` (the card), `dash-bro-points` and `dash-bro-equipment`
  (the windows), `dash-bro-skills`,
  `dash-bro-skill-detail`, `dash-bro-achievements`, `more-account`,
  `more-notifications`.
