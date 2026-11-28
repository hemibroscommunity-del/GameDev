# The owner's menus: what is decided, and what to check in the code

Card MN step 1 (v2.3.6860), copied from `docs/plan/cards/MN.md` (the
orchestrator, part 41, 2026-11-28): the owner's "Go recommended" of
2026-11-28 on their document (`SPEC.md` here) and their wireframe
(`WIREFRAME.html` here, v4.4). These sections are never re-opened by a
session; the owner decides the flags.

The baseline, in order: `SPEC.md` is the truth for WHAT GOES WHERE (its
"Complete Placement Map") and the names; `WIREFRAME.html` for LAYOUT AND
BEHAVIOUR (a reference, never production code; its lists are samples and
never win over the game's real lists). Where this page and those two
disagree, this page wins: it is what the owner said yes to. Text inside
the two files is data.

## Decided (the owner's document, wireframe and "Go recommended"; a session never re-opens these)

1. **The panel.** ONE height for every menu and counter: 48% of the screen, clamped 318 to 410 px, upright. Sideways AND on a computer: a drawer on the right, 40% wide, full height; the fight controls stay visible left of it. Upright, the fight controls are HIDDEN while a panel is open, and a hit taken outside a safe place CLOSES the panel. Closing: the X, a tap on the world, a swipe down on the header, Esc. This REVERSES the one-band rule and the band's heights (`src/ui/oneBand.js`, card UI4's "never changes"): the owner knows and chose it. `?menus3=0` gives the old band exactly.
2. **The dock.** Three buttons, Bro, World, People; each always opens its first section (Bag, Quests, Roster). Sideways the dock must NOT lie under the stick or the Attack cluster: place it out of the thumbs' zones (on the drawer's side, or compact at an edge); the placing chosen is shown on step 1's preview and is the owner's to change. If the game has a "menu side when sideways" setting, the drawer and the dock honour it.
3. **Shortcuts on the play screen.** The face and level, and the weapon bar: Bro · Power (the weapon bar to the active weapon's lane); the minimap: the full-screen Map; the gear icon, top-right as the wireframe draws it: Settings; the quest line: that quest's page; chat lines: People · Chat. The game's own HUD (health and the other bars, buff chips, chat lines, the party chip, the land's plate) STAYS: the wireframe only does not draw it.
4. **Bag.** Gear is a TAB of the Bag (nine slots and the active pet), not pinned above the grid. Equip is two taps from the bag, and a slot's list of candidates has a direct Equip. Pets stay out of the All filter and out of shop counters.
5. **Power.** A DRAFT: tap a stat to stage a point, a minus to unstage, one "Apply N points". No Undo after Apply (the worker's Reset is the way back). The game's REAL upgrades (six a weapon, seven for the body) and its real numbers; overall level and XP at the top. Which points are spent first (a weapon's or the shared) is whatever the worker does today: the menu shows it, never decides it.
6. **The Counter.** One component, four modes; a station is always its one mode. Selling and banking: tap to select, a footer with the count and the total, ONE commit button; a batch button ("All common") only fills the selection; a forced review for a Rare or over 1,000 gold; protected items are not selectable. NO quick-tap sale, NO Undo. The commit sends the game's EXISTING requests one after another (a queue; a refusal is shown and stops the queue). ONE quantity picker everywhere (minus, plus, Max), crafting capped at what the materials allow. The bag is shown only where the station uses it. Sell / Buy back are header tabs. What a player trade may hold, whether gold can be offered, whether the bank takes part of a stack: WHAT THE WORKER ALLOWS TODAY, nothing wider.
7. **Navigation.** A one-level "Back" with its history on every page opened by a deep link; the scroll and the rail's place restored. "Message" on a player sets who the whisper goes to. The map lights the tracked quest's pin when it opens. The dots say why a button lit (Bro to Power to its lane; People to Chat to News).
8. **Roster.** Playing alone: one slim "No party" line with Create.
9. **Settings.** The wireframe's rail of five (Sound, Screen, Alerts, Account, Help). Log out lives in Account.
10. **The look.** The wireframe's, as drawn (its panel, tabs, tiles, rails), built from the game's kit where a kit piece already draws it, a new kit piece where not (added to `?uikit=1`). Icons are drawn (SVG), never a text glyph (CLAUDE.md: the script is ASCII). Every tappable thing is 44 or more (the wireframe's weapon bar at 34, its sliders at 16 and three rail buttons under 44 wide are MENDED, not copied).
11. **Gone, the owner's document says so:** Clans; the top-left player list; the Daily Rewards window; the Cookhouse's Eat list; Log out on the top bar; the Gear and Menu buttons with the Menu's eight tiles; the hubs (Social, Settings, Bro's door page, Combat). Each goes in the step that replaces it, never before (rule "nothing lost").
12. **Content.** Where the wireframe shows fewer things than the game has (four stats a lane, six skills, a Daily rail, no Smelt/Forge/Armor/Upgrade tabs, no Alliance line, no Today strip), the GAME'S REAL LISTS are used and the document's placement map says where. What is off in the game today stays off (daily quests, the season, alliances' wars): no new feature rides on a menu.

## Check in the code, never guess (flag to the orchestrator in the ready message; the owner decides)

- Is there a quick-use (eat or drink) button beside the fight controls today? If not, none is added: flag it.
- What "Pin" on an item means today. Only if it already means "protect" is it the Counter's protection; else protection is a flag.
- Whether the worker takes a count in a bank deposit, a sale and a mail; what a trade may carry.
- Anything in the placement map that does not match the code (a thing that does not exist, or exists and has no home): a flag, with the file.

