# BroTown UI Spec: Menus From Scratch (3×3 Architecture)

**Status:** Ready to build · Drop-in orchestrator spec · Zero server changes required unless explicitly flagged.

Today the game has 9 top-level hubs behind two buttons, about 46 nested pages, 7 floating play-screen windows, and 20 bespoke town windows. This specification replaces all of them with **3 bottom menus (9 sections)**, **2 direct HUD overlays (`Map` and `Settings`)**, **1 unified town `Counter`**, and **1 universal `Card`**.

Every primary action is deterministic (no stateful "opens where you left it" surprises) and capped at **1–3 taps**. All 93 audited game systems keep a single canonical home.

---

## Before & After

| Metric / Action | Today | 4×13 Draft | 3×3 Final Spec |
| :--- | :--- | :--- | :--- |
| **Bottom dock buttons** | 2 (hiding 9 hubs) | 4 | **3** (`⚙` moves to corner) |
| **Total sections** | ~46 pages + 7 windows | 13 | **9** (3×3) + HUD `Map` |
| **Pages that only lead to other pages** | 6 | 0 | **0** |
| **Town windows** | 20 bespoke builds | 1 shape, 4 modes | **1 shape, 4 modes** + Quick-Tap & Batch |
| **Landscape usable rows** | ~1 row | 1 row (82px strip) | **4–5 rows** (right-side drawer) |
| **Deepest thing** | 6 taps | 3 taps | **3 taps** (most common actions: 1–2) |
| **Equip from bag (closed)** | 2–3 taps | 2–3 (4 if wrong tab) | **2 taps guaranteed** |
| **Spend a combat point** | 5–6 taps | 3 taps | **2 taps** (Face → `+`) |
| **Sell 10 items at Diego** | ~21–31 taps | ~21–31 taps | **2–11 taps** (Batch / Quick-Tap) |
| **Invite nearby to party** | 3–4 taps | 4+ taps (2 tabs) | **2–3 taps** (1 Roster screen) |
| **Check quest monster drops** | 5 taps | 3 taps | **1 tap** (Quest deep-link) |
| **Change music volume** | 3 taps + slide | 1 tap + slide | **1 tap + slide** (`⚙`) |

---

## Core Architectural Rules

1. **Deterministic Entry Points:** Every dock button and HUD shortcut always opens the exact same default section so players build pure muscle memory.
   * `Bro` → **Bag**
   * `World` → **Quests**
   * `People` → **Roster**
   * HUD Face / Level → **Bro · Power**
   * HUD Minimap → **Map Overlay** (full screen)
   * HUD `⚙` → **Settings** (single scrolling page)
   * HUD Quest line → **Active Quest Page**
   * HUD Chat lines → **People · Chat**
2. **Adaptive Responsive Container (Fixes the 82px Landscape Bottleneck):**
   * **Portrait phone:** Bottom strip (~38% viewport height). Combat and world remain visible above.
   * **Landscape phone & Desktop:** Right-side drawer (~38–42% width, full height). Character, enemies, and movement controls stay unobstructed on the left 60%, giving grids (`Bag`, `Codex`, `Counter`) 4–5 usable rows instead of a cramped 1-row horizontal strip.
   * **Desktop hotkeys:** `I` Bag · `P` Power · `L` Skills · `J` Quests · `M` Map · `K` Codex · `F` Feats · `R` Roster · `U` Ranks · `C` Chat · `B` Emotes · `Esc` Close.
3. **One Counter, Four Modes (`Make`, `Trade`, `Keep`, `Play`):** Every town station renders the station on top and the player's real `Bag` below (or side-by-side in landscape/desktop) with **Quick-Tap** execution, auto-sorted usable items, a 1-tap `Undo` toast, and one contextual batch button.
4. **One Card:** All NPC dialogue, offers, invites, rewards, death prompts, and confirmations share one compact card with at most 2 buttons.
5. **Universal Deep-Links:** Any monster, item, resource, place, or player name in Quests, Chat, Counters, Ranks, or Cards is tappable and jumps straight to its `Codex` entry, `Item Page`, `Map` pin, or `Player Page`.

---

## The 3×3 Menu Map + HUD Overlays

| Entry Point | Location | Default Section | Sections / Scope |
| :--- | :--- | :--- | :--- |
| **Bro** | Bottom Dock (1) | **Bag** | **Bag** (9 gear slots + 10th active Pet slot + inventory + `Pets` filter) · **Power** (Sword, Bow, Staff, Body) · **Skills** (10 life skills + inline Guild ranks/quests/rewards) |
| **World** | Bottom Dock (2) | **Quests** | **Quests** (`Today` strip + Active / On Offer / Done) · **Codex** (Monsters, Items, Resources, Townsfolk, Lands, Pets, `How it works`) · **Feats** (Medals, AP, Titles, Lifetime Records) |
| **People** | Bottom Dock (3) | **Roster** | **Roster** (sticky Party/Alliance bar + `Nearby \| Friends \| Requests \| Blocked`) · **Chat** (All, Area, Party, Whispers, News + Emotes smiley) · **Ranks** (All leaderboards) |
| **Map** | Top-Right Minimap | Full-Screen Overlay | World map, land levels, buildings, dungeons, `Pins`, and `Places` (Town Board directory) |
| **Settings** | Top-Right `⚙` | Single Scrolling Page | Sound · Screen & Controls · Notifications · Account · Help (Feedback, About) |

---

## Screen Wireframes

### 1. Play Screen HUD (Portrait) & Landscape / Desktop Drawer

```text
PORTRAIT (MENU CLOSED)                 LANDSCAPE / DESKTOP (DRAWER OPEN)
+-------------------------------+      +---------------------------+---------------------+
| [Face Lv14•]     Gold: 4,210  |      | [Face] Gold: 4,210  [Map] | Bro: [Bag] Pwr Skl X|
|  -> Power        [Minimap][⚙] |      | ★ Quest line              |---------------------|
| ★ Kill 8 Slimes  [Buffs 12m]  |      |                           | EQUIPPED (9 + Pet)  |
|                               |      |                           | [Sw][Bw][St][Cp][Ch]|
|          THE WORLD            |      |        THE WORLD          | [Lg][Sh][Am][Gm][Pt]|
|     (fight controls kept)     |      |     (60% unobstructed     |---------------------|
|                               |      |      combat viewport)     | [All|Wpn|Arm|Pets]  |
| [Chat preview lines -> Chat]  |      |                           | [ ][ ][ ][ ][ ]     |
|-------------------------------|      |                           | [ ][ ][ ][ ][ ]     |
|  [  Bro  ] [ World ] [People] |      | [Fight Controls]   [Chat] | [ ][ ][ ][ ][ ]     |
+-------------------------------+      +---------------------------+---------------------+
• Dot on [Face] & [Bro] when upgrade points wait. Unread News dot on [People].
```

### 2. Visual-First `Bro · Power`

Opens directly to the active weapon (or whichever lane has unspent points). No zero-counters and no separate "Spend" confirmation step—tap `+` to spend immediately, with a live `Undo` button while the panel stays open.

```text
+-------------------------------------------------------------------+
| Bro ▾   Bag   [Power]   Skills                              [ ✕ ] |
|-------------------------------------------------------------------|
|  [ ⚔ Sword (2) ]   [ 🏹 Bow ]   [ 🪄 Staff ]   [ ♥ Body (1) ]      |
|   Lv 14 · 62% XP    Lv 9         Lv 4           Shared pts: 1     |
|-------------------------------------------------------------------|
|  SWORD UPGRADES  (2 Sword pts · 1 Shared pt)    [Undo]   [Reset]  |
|                                                                   |
|  Range    [■■■■□□□□]  4/8   [+]   |  Luck     [■■□□□□□□]  2/8 [+] |
|  Power    [■■■■■□□□]  5/8   [+]   |  Special  [■■■□□□□□]  3/8 [+] |
|  Speed    [■■■□□□□□]  3/8   [+]   |  Element  [🔥 Fire ]  2/8 [+] |
|                                                                   |
|-------------------------------------------------------------------|
|  ▸ Stats (DPS 142 · Dmg 38 · Crit 18% · Range 2.4)  [Expand ▾]    |
+-------------------------------------------------------------------+
• Expanding [Stats ▾] reveals all 13 real game numbers for the active lane.
• Tapping any individual stat shows its formula/layer breakdown.
• Tapping [Undo] reverts points spent during the current open session.
```

### 3. Unified Town `Counter` with Quick-Tap & Batch Mode

Replaces all 20 bespoke town windows. Usable items automatically float to the top of the bag grid; unusable items dim to the bottom.

```text
TRADE MODE (e.g. Diego / Bank)         MAKE MODE (e.g. Blacksmith)
+-------------------------------+      +-------------------------------+
| Diego · Trade   Gold: 4,210 ✕ |      | Blacksmith · Make   4,210g  ✕ |
| [Sell]  [Buy Back Lost Gear]  |      | Smelt · [Forge] · Armor · Upg |
|-------------------------------|      |-------------------------------|
| STAGED / QUICK-SELL           |      | [⚔ Iron Sword]  3x Ore, 1xWd  |
| Last: Sold 4x Slime Gel (+80g)|      | [🛡 Iron Shield] 4x Ore        |
|                      [ Undo ] |      | [⛏ Steel Pick]  2x Bar, 2xWd  |
|-------------------------------|      |        [ Repeat Last ]        |
| YOUR BAG (usable lit first)   |      |-------------------------------|
| [Gel][Ore][Hide][Log][Bone]   |      | YOUR BAG (mats lit first)     |
| [Swd][Pot][Food] (dimmed)     |      | [Ore][Bar][Wd][Gem][Coal]     |
| [ Sell All Materials (+340g) ]|      | [Pot][Food][Swd] (dimmed)     |
+-------------------------------+      | Tap recipe -> Craft (1 tap)   |
                                       +-------------------------------+
• Single-tap a lit bag item = execute primary counter action immediately
  (Sell / Deposit / Stage in Trade) + show 1-tap [Undo] toast.
• Long-press or tap [ⓘ] on any item = open full Item Page.
• Batch buttons by counter:
  - Diego: [Sell All Materials]
  - Bank: [Deposit Matching] (stacks already in vault)
  - Make benches: [Repeat Last]
```

### 4. Merged `People · Roster` & Full-Screen `Map` Overlay

```text
PEOPLE · ROSTER                        HUD MINIMAP -> MAP OVERLAY
+-------------------------------+      +-------------------------------+
| People ▾ [Roster] Chat Ranks ✕|      | World Map              [ ✕ ]  |
|-------------------------------|      |-------------------------------|
| PARTY (2/4) · Leader: You     |      |                               |
| [You] [Mira]  [+Inv] [Leave]  |      |   Lands, levels, buildings,   |
| Alliance: None (off)          |      |   dungeons, pins, quest road  |
|-------------------------------|      |                               |
| [Nearby (6)] Friends Req Blk  |      |                               |
| • Kael   Lv12  [Inv] [Trd]    |      |                               |
| • Sol    Lv18  [Inv] [Trd]    |      |-------------------------------|
| • Rex    Lv09  [Inv] [Trd]    |      | [ Places ]  [ Pins ]  [Zoom]  |
+-------------------------------+      +-------------------------------+
• Tapping any player name opens the unified Player Page (includes Whisper).
• "Show on map" from Quests or Codex jumps straight to Map Overlay focused on target.
```

### 5. Universal `Card`

```text
+---------------------------------------+
|  Mira wants to trade.                 |
|  [ Decline ]             [ Accept ]   |
+---------------------------------------+
Used for: NPC talk, quest offers, party/trade/duel/friend invites,
rewards, "New monster" (taps into Codex), death prompt, Hotel rest,
Land Office travel, dungeon entry/exit, and destructive confirmations.
```

---

## Complete Placement Map (All 93 Game Things)

Every item from the codebase audit retains a single canonical home.

### You (18 items)
* **Name, face, level:** Top-left HUD corner; tap opens `Bro · Power`.
* **Sword, Bow, Staff levels & XP:** `Bro · Power` (top lane selector icons).
* **Unspent points (weapon + shared):** `Bro · Power` (glowing dot on HUD Face, `Bro`, and lane icon).
* **6 weapon upgrades (Range, Power, Speed, Luck, Special, Element):** `Bro · Power` (selected weapon lane).
* **7 body upgrades (Max HP, Defense, Max Mana, Stamina, Dodge, Speed, Resist):** `Bro · Power` (Body lane).
* **Derived stats (13 real game numbers; no synthetic stats like EHP):** `Bro · Power` (`Stats ▾` collapsible drawer).
* **Stat breakdown (layers under DPS):** `Bro · Power` (tap any number inside `Stats ▾`).
* **Reset points:** `Bro · Power` (quiet button in header).
* **Combat actions (Special, dash, Shield Bash, Whirlwind, roll, Burst, sprint, jump, block):** Fight buttons (no menu); explanations live in `World · Codex · How it works`.
* **Element, element wheel, 8 statuses:** Yours in `Bro · Power`; wheel & statuses in `World · Codex · How it works`.
* **Timed buffs (Well Rested, meal, brew):** Play-screen HUD chips.
* **Equipped title:** `World · Feats · Titles`.
* **Character look (hair, hat, skin, eyes, eyewear, beard, shirt, pants, shoes, drawings):** Character creation before the world (no menu).
* **Shirt on/off:** The shirt's own Item Page.
* **10 life skills (level, XP, unlocks, how it works):** `Bro · Skills` → skill.
* **Skill guilds (rank, next reward, quests):** `Bro · Skills` → inline on that skill's page.
* **Pets (active, owned, species; rename, put away, release):** Active pet = 10th companion slot in `Bro · Bag`; owned pets = `Pets` filter pill in `Bro · Bag` (tap opens Pet Page); full catalog = `World · Codex · Pets`.
* **Skateboard:** Play-screen button (not a menu).

### What You Carry (11 items)
* **Gold:** Top bar (always visible) + every Counter header.
* **Bag & filters:** `Bro · Bag` (`All | Weapons | Armor | Consumables | Materials | Pets`).
* **Equipped gear (9 slots: Sword, Bow, Staff, Cape, Chest, Legs, Shield, Amulet, Gem):** `Bro · Bag` (pinned beside/above bag with active Pet slot).
* **Spare weapons (8) & spare armor (32 per kind):** `Bro · Bag` under Weapons / Armor filters with count.
* **Item facts (grade, material, hardness, gems set, stats, equipped comparison, fish weight):** Unified Item Page (tap in Bag/Codex/Player; long-press or `ⓘ` at a Counter).
* **Bag actions (Equip, Unequip, Eat, Drink, Light fire, Reveal, Claim, Pin, Drop, weigh fish):** Quick action + Item Page.
* **Counter actions (Sell, bank, list, mail, smelt, forge, harden, salvage, set gem, cook, trade):** Single-tap Quick-Tap when standing at that Counter; greyed with location hint on Item Page away from town.
* **Plant seed, arm trap:** World context button at farm bed / monster.
* **Bank vault:** `Counter: Keep` (Bank).
* **Pet House:** `Counter: Keep` (farm barn).
* **Mail:** `Counter: Keep` (Post Office); arrival line in `People · Chat · News`.

### What To Do (11 items)
* **Your quests (tracked, active, ready to hand in):** `World · Quests` (HUD quest line jumps straight to tracked quest).
* **Quests on offer (who & where):** `World · Quests` ("On offer" section, each with `Show on map`).
* **Finished quests:** `World · Quests` ("Done" section).
* **Quest page (completed/current steps, rewards, Track, Show on map; future steps hidden):** Quest Page (monster/item/place names deep-link to `Codex` / `Map`).
* **Free daily spin & login streak:** `World · Quests` (`Today` strip) + Gambling Den; top-bar indicator while a spin waits.
* **Farm's 3 daily orders:** `World · Quests` (`Today` strip to read; delivered at Feed & Seed).
* **Daily quests & Season:** Off today; slot reserved in `Today` strip when enabled.
* **Feats (medals by tier, AP):** `World · Feats`.
* **AP source breakdown:** `World · Feats` (AP header line).
* **Lifetime records (kills, deaths, gold, XP, duels won, deepest zone):** `World · Feats · Records`.
* **Weekly jackpot, arena prize, Lil Bro's race:** Where they happen (`Counter: Play`, Lil Bro).

### The World (8 items)
* **World map (lands, levels, buildings, dungeons, resources, monsters):** HUD Minimap → Full-Screen `Map Overlay`.
* **Map pins (set, replace, remove, reached):** `Map Overlay` (`Pins` toggle + cards).
* **Things to do by place (Town Board):** `Map Overlay` (`Places` drawer) & town noticeboard.
* **Codex (Monsters, Items, Resources, Townsfolk, Lands, Pets):** `World · Codex` (inline filter pills + search; no hub page before entries).
* **Monster entry (drops + odds first, behavior, habitat, lore):** Codex entry ("Where it lives" opens `Map Overlay` centered there).
* **"New monster":** `Card` → deep-links directly to Codex entry.
* **How things work (`?` explainers, elements, dying, No man's land):** `World · Codex · How it works`.
* **Small map & land nameplate:** Play-screen HUD.

### Other Players (15 items)
* **Chat (All, Area, Party, Whisper):** `People · Chat` (HUD chat lines or tapping own bro opens it; unified single chat box across mobile & desktop).
* **Friend messages:** `People · Chat · Whispers`.
* **Emotes (emoji, quick lines, moves, poses):** `People · Chat` (smiley button; `B` on desktop).
* **Game news & unread count:** `People · Chat · News` (badge on `People` dock button).
* **Friends, requests, blocked, Add friend, invite link:** `People · Roster` (`Friends | Requests | Blocked`).
* **Players near you:** `People · Roster` (`Nearby` segment; top-left mini player list removed).
* **Unified Player Page (levels, gear, title, AP, kills; Invite, Trade, Add friend, Duel, Message, Mute, Block, Report):** From any player tap or name (`Message` starts a whisper directly).
* **Party (members, leader, invite, leave):** `People · Roster` (pinned top bar; HUD party chip opens it).
* **Alliances:** `People · Roster` (1 line below Party bar; hidden until switched on).
* **Clans:** Removed (go directly from Party to Alliances).
* **Ranks (combat, life skills, feats, records):** `People · Ranks` (row opens that player's Player Page).
* **Challenges & invites (duel, trade, party, friend, "Attack?"):** `Card`.
* **Player-to-player trade:** `Counter: Trade` (your bag + theirs).
* **Arena (sign up, bracket, backing, hall of fame):** `Counter: Play` (Sheriff's Office).
* **No man's land plate & skulls:** Play-screen HUD (rules live in `World · Codex · How it works`).

### In Town (21 items)
* **Blacksmith (Smelt, Forge, Armor, Upgrade, Amulet, Salvage):** `Counter: Make`.
* **Woodworker (Bow, Staff, Hardened, Upgrade, Traps):** `Counter: Make`.
* **Gem Works (Cut gems, Set gems):** `Counter: Make`.
* **Cookhouse (Recipes):** `Counter: Make` (standalone "Eat" list removed; eat directly from bag).
* **Diego (Buys materials, sells back lost tools & shield):** `Counter: Trade`.
* **Feed & Seed (Seeds, compost, delivering orders):** `Counter: Trade`.
* **General Store (Market orders for weapons & gear):** `Counter: Trade` (stays separate from Auction House).
* **Auction House (Shelf, listings, bids):** `Counter: Trade` (one-tile front menu removed).
* **Bank:** `Counter: Keep`.
* **Post Office:** `Counter: Keep`.
* **Gambling Den (Spin, wager, jackpot) & Ace's coin flip:** `Counter: Play`.
* **Sheriff's Office:** Door opens Arena (`Counter: Play`); "Duel a player" opens `People · Roster · Nearby`.
* **Saloon:** Door opens `People · Roster`.
* **Guild Hall:** Door opens `Bro · Skills`.
* **Town Board:** Opens `Map Overlay · Places`.
* **Hotel (rest), Land Office (travel to farm), Dungeon mouth / exit:** `Card` (1–2 buttons).
* **Dungeon Workshop:** Full-screen maker (unchanged).
* **Farm beds (dig, plant, water, fertilize, harvest):** World context button.
* **Furniture workshop:** Omitted until homes have a defined gameplay role.

### The Game Itself (9 items)
* **Sound (mute, music, effects):** `Settings · Sound`.
* **Screen & Controls (landscape drawer side, full screen, replay controls lesson, desktop keys):** `Settings · Screen and controls`.
* **Notifications (silence alerts, show play-screen chat feed):** `Settings · Notifications`.
* **Account (Login Key, Log out / switch bro, continue another character, Restart character):** `Settings · Account` (Log Out chip leaves top bar).
* **Help (Feedback send/browse; About privacy, rules, credits, smoothness reports):** `Settings · Help`.
* **First lessons (welcome, controls lesson, quest coach, gold arrow, install hint):** Teaching cards (unchanged).
* **Login door, picking a bro, making a bro, drawing editor:** Before the world (unchanged).
* **Test panel & owner tools:** Behind long press (unchanged).

---

## Deprecated Screens Removed

* Gear and Menu buttons, plus the Menu's 8 tiles.
* Social hub, Settings hub, Bro door page, and Combat hub (plus individual weapon pages, Shared page, Points modal, and "All stats" door).
* Equipment showcase, Homestead page, Journey page, Notifications page, Account/About/Feedback tiles, Guilds page, and Clan pages.
* Top-left player list, player card, Inspect card, and the 5 read-only pages of another player.
* Standalone Emote window, Daily Rewards window, and top-bar Log Out chip.
* Auction House front menu, Cookhouse Eat list, and intermediate hall cards for Sheriff, Saloon, and Guild Hall.
* All 20 differently built town windows and unreachable legacy screens.

---

## Locked Decisions & Engineering Flags

### Locked Decisions
1. **Menu count:** **3** bottom menus (`Bro`, `World`, `People`) + HUD `Map` + corner `⚙`.
2. **Play-screen buttons:** **3** deterministic dock buttons (`Bro` always opens `Bag`).
3. **Container placement:** **Hybrid** — bottom strip in portrait, right-side drawer in landscape and desktop.
4. **Town counters:** **Stay in town** (preserves economy and zero-server scope), upgraded with Quick-Tap + Batch buttons.
5. **Feats placement:** Inside **World** (`Quests`, `Codex`, `Feats`).
6. **Final names:** `Bro` (`Bag`, `Power`, `Skills`) · `World` (`Quests`, `Codex`, `Feats`) · `People` (`Roster`, `Chat`, `Ranks`) · `Map` · `Settings`.

### Flags & Scope Guardrails
* **Visual style:** Plain wireframes here define hierarchy and layout only; visual-first art direction should prioritize `Bro · Power` first.
* **Shared points rule:** Preserves live game behavior (shared points granted when highest weapon levels up).
* **Server-gated features (stay off / unchanged unless explicitly requested):** Full remote Player Page data, merging General Store & Auction House, Daily quests / Season / Alliance wars / Cape contest / Bounties, Homes / Furniture, and remote crafting/banking.
* **Untouched systems:** Fight controls, world rendering, character creation, Dungeon Workshop, first-run teaching cards, and owner Test panel.
* **Audit edge cases:** Map pins are included on the `Map Overlay`; unconfirmed legacy screens (body-ink page, furniture workshop) remain excluded.

---

## Phased Build Plan (14 Independent Steps)

Steps 1–11 and 14 are **screen-only**; steps 12–13 touch economy/inventory flows and require careful verification (still zero server changes required).

1. **Responsive Shell & HUD:** 3-button bottom dock (portrait bottom strip + landscape/desktop right-side drawer), corner `⚙`, deterministic routing, HUD shortcuts, and desktop hotkeys. Temporarily mount legacy screens inside the new slots. *(screen)*
2. **Bro · Bag + Pets Integration:** 9 gear slots + 10th active Pet slot, `Pets` filter pill, unified Item Page & Pet Page. *(screen)*
3. **Bro · Power (Visual-First):** 4-icon lane selector, 1-tap `+` spending with live session `Undo`, collapsible `Stats ▾` drawer, and stat formula inspector. *(screen)*
4. **Bro · Skills:** 10 life skills with inline Guild rank, quests, and rewards. *(screen)*
5. **World · Quests & Today:** `Today` strip, Active / On Offer / Done lists, Quest Page with tappable entity deep-links. *(screen)*
6. **HUD Map Overlay & World · Codex:** Full-screen `Map` (`Places`, `Pins`, deep-link focus) + unified `Codex` filter/search bar (`How it works` shelf). *(screen)*
7. **World · Feats:** Medals, AP breakdown, Titles, Lifetime Records. *(screen)*
8. **People · Roster & Unified Player Page:** Sticky Party/Alliance bar, `Nearby | Friends | Requests | Blocked`, unified Player Page with direct `Message`. *(screen)*
9. **People · Chat & Ranks:** Single cross-platform Chat box (All, Area, Party, Whispers, News + Emotes smiley) and Leaderboards. *(screen)*
10. **Settings & Universal Card:** Single scrolling `Settings` page (from `⚙`) + one `Card` component for all talks, invites, rewards, and prompts. *(screen)*
11. **Counter — Make:** Blacksmith, Woodworker, Gem Works, Cookhouse with lit-item auto-sort and `Repeat Last`. *(screen)*
12. **Counter — Trade:** Diego (`Sell All Materials`), Feed & Seed, General Store, Auction House, Player Trade with Quick-Tap + `Undo` toast. *(money screens)*
13. **Counter — Keep & Play:** Bank (`Deposit Matching`), Post Office, Pet House, Gambling Den, Ace, Arena. *(money screens)*
14. **Cleanup:** Remove all deprecated hubs, duplicate windows, old town modals, and dead routes. *(screen)*