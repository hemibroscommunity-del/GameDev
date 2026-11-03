# Five dashboard buttons: Gear, Bro, Quests, Codex, More (v2.3.4071)

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
- **Life Skills and Achievements are Bro's tabs.**  `dashboardPanelBus`
  sends `open/push/toggle('skills' | 'achievements')` to `open('hero')` with
  `heroSectionBus.request('Skills' | 'Achievements')`, so every old road (the
  L key, the top bar's AP medal, a card's title chip, tests) lands there.
- **Bro** (`sheet/HeroExpanded.jsx`): five tabs, `Me`, `Build` (Points),
  `Skills`, `Achievements` (only with `caps.achievements`), `Overview`
  (Equipment, last).  It opens on Me.  Me, Skills and Achievements are pages
  of their own under the shared tab row (`sheet/BroMe.jsx`,
  `dash/SkillsPanel.jsx`, `dash/AchievementsPanel.jsx`, each its own
  scroller); Points and Equipment scroll under the sticky row as before.
  Sideways the row wraps onto two lines (`tabBankH`), and what pins under it
  reads that height.  The Skills tab wears L on a computer
  (`data-key-at="inline"`) and a dot for an unseen level-up; the Bro button
  shows the points count, or a dot for an unseen level-up.
  `heroSectionBus.shown` is the tab on screen (L's second press closes it,
  `deskKeys.navKey`); `window.__btHeroSection` is QA's handle.
- **Me** (`sheet/BroMe.jsx`): portrait, name, title, level, "Achievement
  Points: N" (opens the Achievements tab), the three combat skills with bars,
  six core stats from `heroStatPills` (the Equipment tab's own reader).
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
  tip says "Tap Bro"; the Login Key lesson says "More > Account"; the keys
  list says Gear and Bro.

## Kill switch, caps

None: a client-only layout change, no wire, no server behaviour.

## Tests

- `notifbell` (rewritten): the corner empty while shut, the count on More and
  its tile, the page, Show on screen, a tap folds it, a new line counts.
- `codexfit`, `goldrail`, `bandsummary`, `deskkeys`, `deskwide`,
  `achievements`, `loginkey` (Account and its confirm), `rehearsal`,
  `landscape-dash`, `weaponswap`, `chatlayer`, `coachdesk`: moved to five
  buttons, the handle, Bro's tabs and the bell in More.
- Scenarios that opened the Character page for its Equipment tab ask for it
  (`__btHeroSection.request('Overview')`); `H.openDest(P, 'Character')` does
  the same and maps Dashboard → Gear, Friends → Social; `H.openWorldChat`
  walks More → Notifications → Show on screen.
- `server/test/points-tips`, `achievements-client` hold the words and Bro's
  Achievements tab.
- UI review: `dash-bro`, `dash-bro-points`, `dash-bro-skills`,
  `dash-bro-skill-detail`, `dash-bro-achievements`, `dash-bro-equipment`,
  `more-account`, `more-notifications`.
