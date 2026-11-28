# Menus from scratch: the design (2026-11-28)

A DESIGN, not a build. Nothing here is in the game. It waits for the owner's
"go" and their answers to the six choices in part 6. The owner's page (the
same design, drawn, for a phone, with a tap-through of the menus at real
size) is the private artifact "Menus From Scratch":
https://claude.ai/artifact/KpgDThAbtDWG9RieyYWYcR (a later session updates
THAT page: Artifact read with its url, then publish with `url`).

**The owner's words.** 08:33 UTC 2026-11-28: *"Also I want you to design the
menu system from scratch. Consolidate as many elements into as few menus as
possible while staying coherent."* Corrected at 08:40, after the
orchestrator's first reading kept too much: *"No I mean everything from
scratch menus. Nothing built stays. I want the most consolidated menus from
just lists of what already exists in the game and how to group the taxonomy
together."*

**So this design's rules.** (1) Nothing built is an input to the STRUCTURE:
not today's screens, not `UI_MASTER_SPEC.md`, not the V17 handoff, not the
kit or its look. (2) The input is lists of what exists in the game, taken
from the code by seven reading lanes (the appendix); today's screens are
only the cross-check that nothing was missed. (3) The heart is the taxonomy:
how the lists group, and why. (4) The drawings are neutral wireframes; the
look is a flag for the owner, not assumed. (5) Kept as LIMITS, not as
inputs: the rules of play (the server's), and CLAUDE.md's standing laws
(touch targets of 44 or more; talking is a tap; "BroTown", never "Wheel";
nothing new that loads art in play; the one band at the bottom; a menu never
covers the fight controls it does not need to). Where a limit might itself
be part of "nothing built stays" (the band's height), it is a choice put to
the owner (choice 3), not settled here.

**Out of scope:** the fight controls, how the world is drawn, the character
creator and its drawing editor, the Dungeon Workshop, the first-time
teaching, the owner's Test panel.

## 1. The proposal in one paragraph

Today: 9 top places behind two buttons (Gear, and the Menu's eight tiles),
about 46 pages under them (some six taps deep), 7 more windows opened from
the play screen, and 20 town windows each built its own way. Proposed:
**4 menus with 13 sections**, one town **counter** in four kinds, and one
**card**. Every thing in the game is at most three taps away: the menu, the
section, the thing.

| Menu | The question it answers | Sections |
|---|---|---|
| **Bro** | "What have I got, and how strong am I?" You and everything you carry. | Bag, Power, Skills, Pets |
| **Journal** | "Where next?" What to do, where it is, what is out there, what you earned. | Quests, Map, Codex, Feats |
| **People** | "Who is around?" Everything that needs another player. | Chat, Friends, Party, Ranks |
| **Settings** | "Change the game itself." | one scrolling page: Sound, Screen and controls, Notifications, Account, Help |

Two things are not menus, because the player does not open them: they come
to the player.

- **The counter** (in town): every shop, bench, bank and game is one shape,
  their side above the band, the player's real bag in the band. Four kinds:
  **Make** (Blacksmith, Woodworker, Gem Works, Cookhouse), **Trade** (Diego,
  Feed & Seed, the General Store's market, the Auction House, a trade with a
  player), **Keep** (Bank, Post Office, Pet House), **Play** (Gambling Den,
  Ace, the Arena, the daily spin).
- **The card**: a townsperson talking, a quest offered, an invite (party,
  trade, duel, friend, "Attack?"), a result (level up, new monster, a
  mystery piece, a weigh-in, a chest, a pin reached), dying, a
  confirmation. One small shape, two buttons at most.

## 2. The taxonomy, and why each branch holds together

- **Bro: you, and what you carry.** One menu because it is all one bro: in
  a fight a player reaches for what they hold and what they are in the same
  breath. (The owner, 2026-11-26: *"a unified character management
  dashboard."*)
  - **Bag**: the bag, what is worn (nine cells: Sword, Bow, Staff, Cape,
    Chest, Legs, Shield, Amulet, Gem), the spare weapons and armour, and
    the ONE item page. *Why:* every item action starts from an item, so all
    of them start here: wear, eat, drop, and (standing at a counter) sell,
    bank, forge.
  - **Power**: Sword, Bow, Staff and Body as four lanes on ONE page: level,
    points, upgrades, and the numbers they make. *Why:* it is all the same
    act (spend a point, see a number move), today spread over five screens
    (the Combat hub, a weapon page, Shared Attributes, the Points window,
    "All stats").
  - **Skills**: the ten life skills, and on each skill its guild rank and
    rewards. *Why:* levels earned by doing, with no points to spend; a
    guild is that skill's ladder, not a group of players.
  - **Pets**: the one out, the ones owned, every kind. *Why:* the only
    living things a player owns.
- **Journal: the world, and what to do in it.** One menu because its four
  questions run into each other: what should I do, where is it, what will I
  meet there, what did I get for it.
  - **Quests**: ONE list: Today (the free spin, the farm's orders; daily
    quests and the Season when they are turned on), your quests (the
    tracked one first), on offer, done. *Why:* everything that says what to
    do next.
  - **Map**: the world map, the pins, and Places (the Town Board's list of
    things to do by place). *Why:* where. The one section that fills the
    screen (the existing full-screen exception).
  - **Codex**: Monsters, Items, Resources, Townsfolk, Lands, Pets, and How
    it works (every "?" explainer, the element wheel, dying, No man's
    land). The shelves are a row of filters, not a page before the page.
    *Why:* what is out there, and every rule the game explains in one
    place.
  - **Feats**: medals by tier, AP and where it came from, titles to wear,
    lifetime records. *Why:* what you have done and what is left to chase.
    (The owner, 2026-11-26: *"Titles could live within Feats."*)
- **People: other players.** One menu because none of it means anything
  alone.
  - **Chat**: All, Area, Party, Whispers, News; emotes behind the smiley.
    *Why:* talking; game news is the same stream, so it is a lane, not a
    page.
  - **Friends**: one list: near you, friends, requests, blocked. Any name
    opens the ONE player page (their bro, read-only, and Invite, Trade,
    Duel, Message, Add friend, Mute, Block, Report). *Why:* who.
  - **Party**: members, leader, invite, leave (an alliance's line when
    alliances are shown). *Why:* your group right now.
  - **Ranks**: one row picks the board; a row of the board opens that
    player. *Why:* how you stand against the others.
- **Settings: the game itself.** Nothing in it is about the bro or the
  world. One scrolling page, no hub.
- **The counter** and **the card**: part 1.

**The depth rule.** Menu, section, thing: never a fourth level. A page that
only leads to pages does not exist. One page a KIND of thing, wherever it is
reached from: an item, a skill, a pet, a quest, a Codex entry, a medal, a
player (seven).

**The memory rule.** A menu opens at the section the player left; a section
at the place they left. The shortcuts open a menu AT a section: the
portrait, Bro · Power; the minimap, Journal · Map; the quest line, that
quest; your own bro or the chat lines, People · Chat; the top bar's spin
icon (only while a spin waits), Today.

## 3. The frame, in the band

One row, three states (drawn at real size on the owner's page):

- **Closed:** `[Bro] [Journal] [People] [gear]`: the four buttons ARE the
  closed band (52 px).
- **Open:** `[Bro v] [Bag] [Power] [Skills] [Pets] [X]`: the chosen menu
  folds to one chip (a tap gives the four back) and its sections take the
  row. The page under it keeps today's 191 px: the design adds no second
  row of chrome.
- **On a thing:** `[< Back] Title [X]`.

**Upright (first):** as above; 3 whole rows of 44 px squares fit the page,
as today. **Sideways (844x390, 82 px of page):** the same row; every
section becomes ONE row that slides sideways (the Bag: what you wear, then
the bag); it rests closed, as today. **A computer:** the same band, centred
and wider (more squares, not bigger ones). Every key in `deskKeys.js` keeps
working and lands on its section: I Bag, P Power, L Skills, J Quests, M
Map, K Codex, U Ranks, C chat, B emotes; O (today's Menu) would open
People; Esc closes.

## 4. Before and after

| Counted | Today | Proposed |
|---|---|---|
| Menus | 9 (Gear + the Menu's eight) | 4 |
| Pages that only lead to pages | 6 (Menu, the Social and Settings hubs, the Combat hub, Ranks' landing, the Auction House's front) | 0 |
| Pages and sections reached from the play screen | about 46 | 13 sections, and one page a kind of thing (7) |
| Other windows on the play screen | 7 (map, chat, emotes, spin, daily rewards, log out, No man's land's rules) | 0 (the map is a section) |
| Things to press on the play screen that open a menu | 8 | 4 buttons, 4 shortcuts into the same menus |
| Town windows | 20 (18 buildings, Diego, Ace) | 1 shape, 4 kinds |
| The deepest thing | 6 taps | 3 taps |

Taps, upright, from plain play ("today" counted from the code by the lanes):

| To | Today | Proposed |
|---|---|---|
| Wear a piece from the bag | 2 (3 if folded) | 2 (3 if closed) |
| Eat | 1 when hurt (quick eat), else 2 | the same |
| Spend a point | 5 to 6 | 3 (portrait, upgrade, Spend) |
| See my numbers | 3 to 4 | 1 to 2 |
| Read my quest's steps | 1 (the quest line) | 1 |
| Open the map | 1 (the minimap) | 1 |
| See my life skills | 3 to 4 | 2 |
| Look up a monster's drops | 5 | 3 |
| See a leaderboard | 4 | 2 to 3 |
| See my friends | 3 | 2 |
| Change the music volume | 3, then slide | 1, then slide |
| Sell to Diego (standing at him) | tap him, the item, Sell | the same |
| Log out | 2 | 3 (it leaves the top bar: the one thing that gets longer) |

## 5. Where every thing went

93 kinds of thing, each with ONE home, or "gone" with why.

### You

*Everything here is a fact about your bro that play changes.*

| What exists | Its new home | Note |
|---|---|---|
| Your name, face and level | The corner of the play screen (not a menu). A tap opens Bro · Power. |  |
| Sword, Bow and Staff levels, with their XP | Bro · Power | The three weapons and your body are four lanes on one page. |
| Points waiting to be spent (a weapon's own, and the shared ones) | Bro · Power | A dot on the Bro button and on your face while any wait. |
| The six upgrades of each weapon: Range, Power, Speed, Luck, Special, Element | Bro · Power, that weapon's lane |  |
| The seven body upgrades: Max HP, Defense, Max Mana, Stamina, Dodge, Speed, Resist | Bro · Power, the Body lane |  |
| The numbers that result: DPS, Damage, Attack speed, Crit chance, Crit damage, Special damage, Element power, Range, Defense, Armor, Dodge, Move, Resist | Bro · Power, under the lane they belong to | No number is shown that the game does not have (no "effective health"). |
| Why a number is what it is (the layers under DPS) | Bro · Power: tap the number |  |
| Reset points | Bro · Power, a quiet button |  |
| What you can do in a fight: Special, dash, Shield Bash, Whirlwind, roll, Burst, sprint, jump, block | No menu: they are the fight buttons | What each one does is read in Journal · Codex · How it works. |
| Your element, the element wheel, the eight statuses | Yours: Bro · Power (the weapon's Element and the Gem you wear). The wheel and statuses: Journal · Codex · How it works |  |
| Buffs with a clock: Well Rested, a meal, a brew | Chips on the play screen (not a menu) |  |
| The title you wear | Journal · Feats · Titles | Your words, 26 Nov: "Titles could live within Feats." |
| Your look: hair, hat, skin, eyes, eyewear, beard, shirt, pants, shoes, your drawings | Making your bro, before the world | The game has no way to change a look later, so no menu holds one. Flag 6. |
| Shirt on or off | The shirt's own item page |  |
| The ten life skills: level, XP, what unlocks next, how it works | Bro · Skills, then a skill |  |
| Each skill's guild: your rank, the next reward, its quests | Bro · Skills, on that skill's page | A guild is a skill's ladder, not a group of players, so it left Social. |
| Pets: the one with you, the ones you own, every kind; rename, put away, release | Bro · Pets, then a pet |  |
| The skateboard | A play-screen button (not a menu) |  |

### What you carry

*Every item action starts from an item, so all of them start in one place.*

| What exists | Its new home | Note |
|---|---|---|
| Gold | The top bar, always in sight, and on every counter |  |
| The bag, with its filters | Bro · Bag |  |
| What you wear: Sword, Bow, Staff, Cape, Chest, Legs, Shield, Amulet, Gem | Bro · Bag, beside the bag | No separate Equipment page: the bag shows what you wear. |
| Spare weapons (8) and spare armour (32 of each kind) | Bro · Bag, under the Weapons and Armor filters, with the count |  |
| An item's facts: grade, material, hardness, gems set, numbers, how it compares with what you wear, a fish's weight | The item page, from any square anywhere | One item page for the bag, a counter, the Codex and another player. |
| Equip, Unequip, Eat, Drink, Light fire, Reveal, Claim, Pin, Drop, weigh a fish | The item's quick look (one lead action) and its page (all of them) |  |
| Sell, put in the bank, list for sale, mail, smelt, forge, harden, salvage, set a gem, cook, trade | The same item page, live while you stand at that counter | Away from the counter the action stays in its place, greyed, and says where to go. |
| Plant a seed, arm a trap | The world's own button, at a bed or a monster |  |
| The bank vault | Counter: Keep (the Bank) |  |
| The Pet House | Counter: Keep (the barn on your farm) | The list of pets itself is Bro · Pets. |
| Mail | Counter: Keep (the Post Office) | A line in People · Chat · News when something arrives. |

### What to do

*A goal, where it is, what is there, and what you earned for it are read together.*

| What exists | Its new home | Note |
|---|---|---|
| Your quests: the tracked one, the active ones, the ones ready to hand in | Journal · Quests, then a quest | The quest line on the play screen opens its quest directly. |
| Quests on offer: who has one and where | Journal · Quests, under "On offer" | Each has Show on map. |
| Finished quests | Journal · Quests, under "Done" |  |
| A quest: steps done, the step you are on, rewards, Track, Show on map | The quest page | Future steps stay hidden, as today. |
| The free daily spin and the login streak | Journal · Quests, the Today row | Also at the Gambling Den. The top bar's icon stays while a spin waits. |
| The farm's three orders a day | Journal · Quests, the Today row (to read) | Delivered at the Feed & Seed. |
| Daily quests and the Season | Off in the game today | Their place is the Today row when you turn them on. Flag 5. |
| Feats: medals by tier, your AP | Journal · Feats, then a medal |  |
| Where your AP came from | Journal · Feats, the AP line |  |
| Lifetime records: kills, deaths, gold, XP, duels won, deepest zone | Journal · Feats · Records | The separate Journey page goes. |
| The weekly jackpot, the arena's prize, Lil Bro's race | Where they happen: Counter: Play, and Lil Bro |  |

### The world

*Where things are and what they are answer the same question: where next?*

| What exists | Its new home | Note |
|---|---|---|
| The world map: lands and their levels, buildings, dungeons, resources, monsters | Journal · Map, full screen | A tap on the small map opens it, as today. |
| Map pins: set, replace, remove, reached | On the map; small cards |  |
| Things to do by place (the Town Board's list) | Journal · Map · Places | The noticeboard in the square opens the same list. |
| The Codex: Monsters, Items, Resources, Townsfolk, Lands, Pets | Journal · Codex, then an entry | The shelves are a row of filters, not a page before the page. |
| A monster: drops with their odds, how it fights, where it lives, its story | The Codex entry, drops first | "Where it lives" opens the map there. |
| "New monster" | A card that opens its entry |  |
| How things work: the "?" explainers, the elements, dying, No man's land | Journal · Codex · How it works | One shelf for every rule the game explains. |
| The small map, the land's name plate | The play screen (not a menu) |  |

### Other players

*Everything here needs another player to mean anything.*

| What exists | Its new home | Note |
|---|---|---|
| Chat: All, Area, Party, Whisper | People · Chat | A tap on your own bro still opens it. |
| Messages from friends | People · Chat, under Whispers |  |
| Emotes: emoji, quick lines, moves, poses | People · Chat, the smiley | B on a computer. |
| Game news and the unread count | People · Chat · News | The count sits on the People button. The separate Notifications page goes. |
| Friends, requests, blocked players, Add friend, the invite link | People · Friends |  |
| Players near you | People · Friends, under "Nearby" | The small player list at the top left goes. |
| A player: levels, what they wear, title, AP, kills; Invite, Trade, Add friend, Duel, Message, Mute, Block, Report | The player page, from any name or a tap on the player | One page where today there are a card, a profile and five read-only pages. "Message" is new: today a whisper can only be started from the chat. Flag 7. |
| Your party: members, leader, invite, leave | People · Party | The party chip on the play screen opens it. |
| Alliances | People · Party, one line | Flag 5: say whether alliances are meant to be seen yet. |
| Clans | Gone | Your words: "skip clans altogether and just go from party to alliances". |
| Ranks: combat, life skills, feats, the record boards | People · Ranks, then a board | A row opens that player's page. |
| A duel challenge, a trade invite, a party invite, a friend request, "Attack?" | Cards |  |
| Trading with a player | Counter: Trade (your bag and theirs) |  |
| The Arena: sign up, the bracket, backing a fighter, the hall of fame | Counter: Play (the Sheriff's Office) |  |
| No man's land's plate and skulls | The play screen | The rules are in How it works. |

### In town

*Each is a place you walk to, and each is your bag meeting something across a counter.*

| What exists | Its new home | Note |
|---|---|---|
| Blacksmith: Smelt, Forge, Armor, Upgrade, Amulet, Salvage | Counter: Make |  |
| Woodworker: Bow, Staff, Hardened, Upgrade, Traps | Counter: Make |  |
| Gem Works: Cut gems, Set gems | Counter: Make |  |
| Cookhouse: the recipes | Counter: Make | Its "Eat" list goes: you eat from the bag beside it. |
| Diego: buys materials, sells back lost tools and the shield | Counter: Trade |  |
| Feed & Seed: seeds, compost, delivering orders | Counter: Trade |  |
| General Store: the market's orders for weapons and gear | Counter: Trade | Flag 9: two markets stay two. |
| Auction House: the shelf, your listings, your bids | Counter: Trade | The one-tile menu in front of it goes. |
| Bank | Counter: Keep |  |
| Post Office | Counter: Keep |  |
| Gambling Den: the spin, the wager, the jackpot. Ace's coin flip | Counter: Play |  |
| Sheriff's Office | Its door opens the Arena | "Duel a player" opens People · Friends · Nearby. Flag 10. |
| Saloon | Its door opens People · Party | Flag 10. |
| Guild Hall | Its door opens Bro · Skills | Flag 10. |
| Town Board (the noticeboard) | Opens Journal · Map · Places |  |
| Hotel: rest | A card with one button |  |
| Land Office: travel to your farm | A card with one button |  |
| A dungeon's mouth; the end of a dungeon (chest, leave) | Cards |  |
| The Dungeon Workshop | A full-screen maker, like making your bro | Unchanged. |
| Farm beds: dig, plant, water, fertilize, harvest | The world's own button |  |
| The furniture workshop | Not in the game today | No home until you say what a home is for. Flag 4. |

### The game itself

*None of it is about your bro or the world: it is about the app.*

| What exists | Its new home | Note |
|---|---|---|
| Sound on or off, music, effects | Settings · Sound |  |
| Menu side when the phone is sideways, play full screen, replay the controls lesson, the keys on a computer | Settings · Screen and controls |  |
| Silence notifications; show the chat feed on the play screen | Settings · Notifications |  |
| Login Key, Log out or switch bro, continue another character, Restart character | Settings · Account | The Log Out chip leaves the top bar. |
| Feedback: send, browse | Settings · Help, then the Feedback page |  |
| About: privacy, rules, credits, smoothness reports | Settings · Help, then the About page |  |
| The first lessons: welcome, the controls lesson, the quest coach, the gold arrow, the install hint | Teaching cards (not menus) | Unchanged. |
| The login door, picking a bro, making a bro, the drawing editor | Before the world | Unchanged. |
| The Test panel and your other owner tools | Yours only, behind the long press | Not part of this design. |

### Gone, and why

| What goes | Why |
|---|---|
| The Gear and Menu buttons, and the Menu's eight tiles | The four menus are the buttons. |
| The Social hub and the Settings hub | They were pages that only led to pages. |
| The Bro page of doors and its strip | Its doors became Bro's four sections. |
| The Combat hub, a page a weapon, the Shared page, the Points window, the "All stats" door | One Power page with four lanes. |
| The Equipment showcase | The bag already shows what you wear. |
| The Homestead page | It only said where the farm is. Plots ready is a line under Farming and in Today. |
| The Journey page | Its six records are in Feats. |
| The Notifications page | News is a lane of the chat; its two switches are in Settings. |
| The Account, About and Feedback tiles | Account is a group of Settings; About and Feedback are two pages from it. |
| The Guilds page and the old guild window | A guild is on its skill's page. |
| The Clan pages | Your words: skip clans. |
| The player list, the player card, the Inspect card, the five read-only pages of another player | One player page. |
| The emote card as its own window | It opens from the chat's smiley. |
| The daily rewards window | Today is a row in Quests; the Season is off. |
| The Log Out chip on the top bar | Log out is in Settings · Account, one tap further. |
| The Auction House's front menu, the Cookhouse's Eat list, the hall cards of the Sheriff, Saloon and Guild Hall | Each led to something a menu already holds. |
| Twenty differently built town windows | One counter in four kinds. |
| Old screens nobody can reach any more | They have no button today. |

## 6. The owner's choices (the recommendation first; one word answers each)

1. **Four menus, or five?** *Four* (recommended: the fewest that hold
   together). *Five*: Journal splits into Quests (quests, today, feats) and
   World (map, Codex).
2. **How many buttons on the play screen?** *Menus* (recommended: one a
   menu; the bag is Bro's first section and Bro opens where it was left).
   *Bag*: the bag gets its own button beside them. *One*: a single Menu
   button that opens the last menu.
3. **Where does a menu open?** *Strip* (recommended: the bottom band at
   today's height, the owner's own repeated rule). *Tall*: a menu rises
   over most of the world, about three times the room, and the fight goes
   out of sight.
4. **Do the shops and benches stay in town?** *Stay* (recommended: a rule
   of play, unchanged). *Anywhere*: the bag sells, banks and crafts from
   anywhere; it changes the economy and needs the server.
5. **Feats: in Journal, or in Bro?** *Journal* (recommended: beside the
   quests, where most AP comes from). *Bro*: Feats, titles and records
   become Bro's fifth section.
6. **The names.** Three words are new: Journal, People (today "Social"),
   Power (today "Combat", "Points", "Shared Attributes"). *Names ok*
   (recommended), or the owner's own words.

**The stopped card's open choices dissolve here:** a separate Combat menu
(there is one Power page); Gear sideways as two panels or a strip (every
section is one sliding row sideways); Gear's Details as go or inspect (the
quick look has one lead action and "More"; what a button looks like is flag
1); the bro's quiet strip (gone: its doors are sections); shared build
points (flag 3: the menus show the game's truth).

## 7. Flags (unresolved; never invented)

1. **The look.** The drawings are plain boxes; colours, pictures and button
   shapes are assumed from nothing built. The owner, about 02:10 UTC
   2026-11-28, on the combat pages: *"Too confusing for first time player
   and doesn't use visuals first."* Power is where that matters most.
2. **Spending a point.** Drawn as: tap an upgrade, tap Spend, one point.
   Today a stepper opens at zero and "+" is pressed first. The rule of play
   is the same; the path is shorter. The owner may want the stepper.
3. **Shared points.** The menus show what the game does (shared points on
   the best weapon's level-up); the V17 handoff said three a weapon level.
   Unchanged.
4. **The farm ("Homestead").** No menu: nothing about it is done away from
   it. "Plots ready" is a line under Farming and in Today. Homes and
   furniture (the furniture workshop is dormant) need the owner's word on
   what a home is for.
5. **Built but off:** daily quests, the Season, alliance wars, the cape
   contest, bounties. Each has a place waiting (Today, Party); turning one
   on is the owner's.
6. **Changing a look in play** does not exist in the game, so no menu has
   it.
7. **Another player's page:** the worker sends part of another player
   today; a fuller page is a worker change. "Message" on that page is new
   (a whisper starts only from the chat today).
8. **Abilities:** nothing to choose (they come with the weapon); explained
   in the Codex, no page.
9. **Two markets** (the General Store's and the Auction House) share the
   counter's shape and stay two; joining them is a change to the game.
10. **Doors that open a menu:** the Sheriff's Office (the Arena; "Duel a
    player" opens Nearby), the Saloon (Party), the Guild Hall (Skills), the
    Town Board (Places). The owner may prefer they keep small windows.
11. **Sideways** has 82 px of page: one row. If too little, choice 3.
12. **Two chat boxes** (a phone's and a computer's) exist today; the design
    has one.
13. **Not confirmed reachable by the lanes:** map pins (given a place), the
    body-ink page and the furniture workshop (left out).

## 8. What building it would take (each one PR)

Thirteen are screen-only; two touch money SCREENS (no worker change
expected) and go the gatekeeper's way.

1. The frame: four buttons, the one row, "opens where you left it", the
   keys; today's pages sit inside the new sections until theirs is built.
2. Bro · Bag with the one item page.
3. Bro · Power as one page.
4. Bro · Skills and Pets.
5. Journal · Quests with Today.
6. Journal · Map and Codex, with How it works.
7. Journal · Feats with titles and records.
8. People · Chat with emotes and news.
9. People · Friends, Party, Ranks and the one player page.
10. Settings as one page.
11. The counter, first for Make (four benches).
12. The counter for Trade (Diego, Feed & Seed, two markets, a player's
    trade): money screens.
13. The counter for Keep and Play (Bank, Post Office, Den, Ace, Arena):
    money screens.
14. The one card.
15. Take the old screens and their switches away.

The worker is needed only if the owner chooses it: counters anywhere
(choice 4), a fuller page for another player (flag 7), joining the markets
(flag 9), turning on what is off (flag 5).

---

# Appendix: the inventory (2026-11-28, main at a28549d4)

Seven reading lanes took these from the code; each wrote its own file, kept
here whole. Where a lane cites old work by its version, it is written
"tag N" (the v2.3.N of that work): this document is a design on a branch
with no PR, and claims no tag of its own. They are the lanes' words: "(unsure)" marks what a lane could
not confirm. A1 is the design's INPUT (things, not screens); A2 to A6 are
today's screens, used only as the cross-check; A7 is what the earlier
design documents said, for whoever builds.

## A1. What exists in the game (things, not screens)

#### What exists in BroTown (things, not screens)
Source: docs/GDD-AS-BUILT.md (2026-10 baseline, parts 2-13), checked against src/data/say/*, src/data/achievements.js, src/game/feats.js, SettingsPanel.jsx, MorePanel say strings, server/src file list. Status: live unless marked. HP and damage show to players divided by 5.

##### 1. THE CHARACTER
- Identity: a character = a server record, no email or password. Login Key = eight words, shown once. Up to 10 characters on one device roster (portrait, name, level, "Played 3d ago"). Name 2-20 chars, name roller. Hemi Bros "verified" badge + Bro count (wallet signature, read-only, live); worn-Bro avatar dormant.
- Levels: three weapon skills Melee, Bow, Magic, each 1-100, trained by use only. Character level = best weapon's level (1-100). Quest XP is paid flat into a chosen skill (tour quests pay none). XP fades vs much weaker monsters (grey plate). Level-ups celebrate; "recorded on Hemi" receipts at levels 2/5/10/20/30/40/50/75/100.
- Ten life-skill levels (see list 3).
- Pools: HP (bar), Stamina (bar), Mana (bar). Bars are 5-10 "blocks"; every special/roll/bash/whirlwind costs one block.
- Point kinds (2 pools): lane points (3 per weapon-skill level-up, stamped to that weapon, buy only that weapon's 6 offense stats) and shared points (3 per CHARACTER level-up, buy the 7 body stats). Free "Reset points" (refused in a fight / within a minute). No cap on a stat. Unspent points make the Character tab glow. AP (Achievement Points) is a separate score that buys nothing (no sink).
- Per-weapon stats (x3 weapons): Power, Luck (crit chance+damage), Special, Elemental, Speed, Range.
- Shared stats (7): Max HP, Defense, Dodge, Resist, Stamina, Max Mana, Move Speed.
- Derived stat pills (14): HP, Stamina, Mana bars; Damage, Range, Attack Speed, Crit Chance, Crit Dmg, Special Dmg, Elem Power (+DPS); Defense, Armor, Dodge, Move, Resist.
- Weapons (3 carried at once): Great Sword (Melee), Bow, Staff (Magic); Fists when unarmed. Held-weapon button/cycle.
- Abilities: weapon Special (sword spin 4.5x / bow 3 arrows / staff big bolt), Sword dash (auto), Shield Bash, Whirlwind (melee, in fight), Dodge roll (+lunge), Element Burst (needs gem), Sprint, Jump (+flip), Block/Shield (toggle), Quick Eat, Trap (arm a trap), Skateboard (see below), Rest in hay/Hotel.
- Elements: 10 exist (flame, frost, water, venom, storm, stone, wind, flora = 8 in play; dark, light = no gem/effect, dormant). Element wheel (beats = x1.25). 8 gem statuses: burn, freeze, soak, root, shock, fracture, slow, thorn. 45 collision bursts (Steam, Wildfire, Shatter...).
- Titles: a title = an earned achievement's name; you Equip one (worn title shows on card/plate). Rank titles Novice..Legendary/Transcendent per life skill guild (Guild page).
- Achievements ("Feats"): 25+ defs by tier Common 10 AP / Rare 100 / Arena 500 / Super-rare 1000 (first_blood, Blooded, Into the Dark, Gotcha, Farmhand, Duelist, Outlaw, Storyteller, Know Thy Enemy, Delver, Natural One, Gladiator, Perfectly Tempered, Godly, Breaking the House, Centurion...) + 10 Albino-fish and 10 Large-fish ones (5/10 AP). Super-rares shown before earned. Banner+sound on rare+.
- Feats screen doors: Achievements (medals by tier), Titles, Quests (AP history), Records (Journey). AP tree 3 layers.
- Journey / records: Kills, Deaths, Lifetime Gold, Lifetime XP, Duels Won, Deepest Zone, on-chain receipt. (More tile says "Journey = kills + duels"; the older "travel log" part is dormant: nothing writes it.)
- Looks (cosmetic only, all permanent from the creator): Hair (none+8, 14 colours), Hats (none+39, 12 colours), Skin (Human/Monkey, 13 tones + 12 novelty), Eyes (5 styles, 9 colours), Eyewear (none+8), Beard (none/beard, 8 colours), Shirt (none/T-shirt, 13 colours, 9 patterns), Pants (14), Shoes (8). Drawing card: 16x16 pixel editor for skin/shirt/pants/shoes, 37 ready designs in 8 categories. Randomize, Reset. Shirt can come off/on from its item card. Body ink panel (BodyInk.jsx) exists (unsure whether reachable).
- Worn visuals from play: armour (grade edge colour), capes (event cape, off), amulet, shield.
- Pets: see list 3 (collection; one out with you; Pet House).
- Mount-like: Skateboard ("ride"), BroTown safe ground only, faster than sprint; tap button / Z. Live.
- Status buffs shown as chips with seconds: Well Rested (+10% XP 30 min), meals (30 min), brews (3-5 min), element statuses, skulls (red/white in No man's land), veil/provoked states.
- Death: "YOU DIED" card, 5 s, respawn BroTown stairs; bag drops as a pile (see list 8).

##### 2. THINGS OWNED
- Currency: gold (coins), start 50. Only currency. Achievement Points are a score, not spent. Hemi-chain ETH for supporter pass = not built. Shards/gems are items, not currencies.
- THE BAG: unlimited kinds/counts of ordinary items; filters All / Weapon / Armor / Consumable / Crafting (unknown = Crafting). Newest first; pinned ("anchored") items front.
- Kinds in the bag: ore (copper, iron, black steel, titanium, obsidian), bars (copper, iron, black steel, gold bar; gold nugget), logs (pine, softwood, hardwood, cedar, maple), hardened wood, raw fish (minnow, clownfish, trout, salmon, pike; + albino/large variants), cooked fish, crops (16), seeds (16), compost, dishes (10), box traps, campfire log use, shards (8, one per land), raw gems (8), elemental gems (8 + Rare Gem), essences (rare/elite/godly by metal), monster Remains, quest items, gathering tools (pickaxe, hatchet, fishing pole), tickets (event), dropped loot.
- Separate stores: weapon bag (8 spare weapons), server stashes of 32 each for armour (torso), greaves, shields, amulets; outfits/shirt/cape worn looks; BANK vault (48 item kinds + up to 1B gold, safe from every death, live); Pet House (30 places, grows to 120); mail inbox; auction/exchange escrow. Gem "cell" = gems are plain bag items (no cell).
- Gear slots: 3 weapon slots (melee, bow, staff), torso, greaves, shield, amulet, cape, cosmetic shirt/plate looks. (6 gear slots on Equipment tab: weapons x3? + torso/greaves/shield/amulet by tab; unsure exact count.)
- Weapons by kind: Great Sword (old one-handed Sword converted), Bow, Staff. 20 material rungs, only 6 craftable (rungs 0-5): copper/iron/black steel/titanium/obsidian swords; pine/softwood/hardwood/cedar/maple/ironbark bows+staffs. Armour: copper/iron/black steel torso + greaves.
- Item properties: material rung, grade (Normal / Rare blue / Elite orange / Godly rainbow), Hardness H0-H5, gem slots (1, or 2 from mythril = unreachable), gems set, level/skill gate to wear, server ledger id (provenance), "too old to salvage" flag, price, caption, stats vs worn comparison. Fish: weight (Inspect), albino/large.
- Things you can DO to an item: Equip, Eat, Drink, Light fire, Sell (to Diego / list on auction), Drop (never gear; 60 s yours), Pin/Unpin, Inspect (fish weigh), Smelt, Forge, Harden/Upgrade (H1-H5), Salvage (2 bars + essence), Set/Take out gems, Crack shards, Combine gems, Put in/out of Bank, Trade (window), Gift, Mail, List on Exchange (weapons) / Auction (stackables, weapons, minted gear, pets), Bid/offer, Cook, Plant (seeds), Arm (trap), Cut/Set at Gem Works, Compare to worn.
- Not for sale/trade: tools can be bought back (100 g); can't drop gear; shield can't be sold by Diego.

##### 3. LIFE SKILLS / ACTIVITIES
- Ten life skills, each 1-150ish (no cap coded), shared curve: Woodcutting, Fishing, Mining, Farming, Trapping, Cooking, Smithing, Woodworking, Gem Cutting, Enchanting. Guild ladders per skill (8 rungs: AP+gold at 5/15/30/50/70/90/100/150), rank titles.
- Mining (pickaxe, ore veins: pump gesture), Woodcutting (hatchet, trees: chop), Fishing (rod, spots: reel circle, rare albino/large fish), Cooking (campfire fish flip game; Cookhouse recipes), Farming, Trapping, Smithing, Woodworking, Gem Cutting, Enchanting (setting gems). Firemaking = "Light fire" action only, not a skill (unsure).
- Smithing: Smelt (ore->bar), Forge (greatswords), Armor (torso/greaves), Upgrade (hardening H1-H5), Amulet (Simple/Ornate/Regal/Mythic), Salvage.
- Woodworker: Bow, Staff, Traps, Harden (logs->hardened wood).
- Gem Works: Cut gems (crack shards, combine 3 raw), Set gems (weapon/amulet/shield).
- Cookhouse: 10 dishes: Herb Bread, Stamina Tonic, Zoom Juice, Root Stew, Garden Stew, Mana Draught, Swift Draught, Firebloom Tea, Pumpkin Pie, Fury Tonic (meals 30 min, brews 3-5 min; one meal + one brew at once).
- Farm (zone, reached from Feed & Seed / Land Office): 6 free beds (25 allowed, no purchase built); steps Dig, Plant, Water, Fertilize (compost), Harvest; 16 crops; 3 farm Orders a day (gold+XP); sleep in hay (rest); barn = Pet House; notice board = Dungeon Workshop. Crops grow offline.
- Homestead/house/furniture: FurniturePanel.jsx exists (old furniture crafting) but no live house (unsure; treat as dormant).
- Pets & Trapping: box traps (Woodworker), arm a trap at a monster, TRAP button shows odds; 9 kinds (+recolours; golden / big); pet levels, wards its element, picks up loot, copies poses; rename 2-16 chars; put away/release; Pet House slots; trade/auction/mail pets.
- Gathering extras: Perfect/Good/Ok gesture grades; skill tiles show "Each hit" odds and unlocks.

##### 4. QUESTS AND GOALS
- Story quests (the tour): ~16 live: Into the Blue (Mayor, first), Carrot Comeback, Heavy Metal, Some Assembly Required, Knock on Wood, Branching Out, Something Fishy, Zoom Juice, Race Day, Box Traps, Set and Spring, Cold Reception, Bad Wind, Bro Ascendant, A Trapper's Eye, Your Own Beast, Into the Wild, Dungeon Delver. 22 more for absent givers = dormant. Givers: Mayor Bro, Farmer Bro, Blacksmith Bro, Woodworker Bro, Diego, Lil Bro, Beastmaster Bro.
- Quest states: Available (giver has an offer), Active, Tracked (one pinned star), Ready to hand in (green check), Done. Each hand-in +5 AP. Pinned quest card with next step + count; gold road on minimap; "Show on map"; "Track this quest".
- Guild ladders = quests-by-level (gold + AP).
- Free daily spin (Daily Rewards, unlocked after first quest): lump sum then double-or-nothing; login streak (+10%/day to +60%, freezes). Daily quests + 28-day season (25 tiers) = built, OFF. Login chest/gold = removed. Dungeon boss chest (on clear). Farm Orders (3/day). Lil Bro's race. Weekly jackpot (tickets). Arena (prize 500 AP first win). Feats (achievements). Albino/large fish firsts. Codex completion.

##### 5. THE WORLD AND KNOWLEDGE
- The Wheel (called "BroTown"/"the world"): hub town + safe commons (2,937 px), 8 land spokes by element, levels 1-40 populated (41-80 drawn only; Dark/Light realms not reachable): Frost Ridge, Flame Fields, Wind Dunes, Stone Hollows, Electric Foundry, Water Caves, Poison Forest, Earth Forest. Each: 4 stages, camps, 16 passes (only scenery).
- BroTown buildings (16): Guild Hall, Blacksmith, Post Office & Telegraph, Woodworker, Saloon, Gambling Den, Hotel, Sheriff's Office, Cookhouse, Feed & Seed, Land Office, General Store, Bank, Gem Works, Auction House, Town Hall (Leaderboard + World map). Townsfolk: Mayor Bro, Lil Bro, Diego, Ace, Blacksmith Bro, Beastmaster Bro, Woodworker Bro, Farmer Bro.
- Places with a door: dungeon mouths (Goo Grotto, Great Cave, Foundry Dome, Buried City), farm gate, shop doors, Rail Depot (scenery).
- Minimap (top right): you, bros green, monsters red, party blue, resources glyphs, building icons, quest pins, gold road, home badge, land name plate + level band, "safe". World map (tap minimap or M): full-screen, zoom, names/gates/camps/resources/monsters by zoom. No fast travel built; player map pins exist in code (mapPins.js, unsure whether reachable).
- Codex (monster encyclopedia): 9 monster cards (silhouette until 1 kill): header, Drops (with roll odds), Info (live stage demo, tips, story, elder form), Locations. "NEW MONSTER" card. Also an Encyclopedia/Glossary panel (EncyclopediaPanel, infoGlossary.js, InfoPopup "?" explainers) and stat explainers in Points; Codex item cards. No item codex / feats-of-knowledge page (unsure).
- Help/tutorials: Controls tutorial (replayable in Settings), Welcome plate + Skip tutorial, quest coach cards, "Swipe to swing" hints, keyboard hints strip (H), install hint (iOS), signposts at gates, No man's land rules card.
- Time of day: always day in the Wheel.

##### 6. PEOPLE
- Chat lanes: All (room), Area (zone), Party (/p), Whisper (by name), friend DMs (280 chars, queued 50), auction listing threads. Bell feed (last 40 lines). Commands /roll /flip. Mute (server), Block (device list), Report (2 taps, reason).
- Emotes: 30 emoji, 12 quick lines, 6 moves (wave, laugh, flex, shrug, facepalm, cheer), 7 poses (sit, sleep, flop, 3 dances, Zombie Shuffle in Halloween week).
- Friends: mutual request/accept, 100 max, online status; Friends list (Social page).
- Player list (top left); player card: Invite to Party / Trade / Add Friend / Duel; Inspect card (checkmark, AP, 3 combat levels, 6 gear pictures, kills, title).
- Party: up to 50, persistent, invite 60 s, leader, party strip, party blue on map, dungeon pulls 3 nearest. Alliance (party of 20 active; name 3-16, tag 1-4, wars, board) built. Clans = retired into parties ("Clans are parties"); Guilds = the ten skill guilds (live), no player guilds (unsure).
- Trading: gift + trade window (items, gold, 4 weapons, 4 pets), Exchange (weapon order book), Auction House (7-day listings, bid, offers, threads). Mail/Post Office (last 30 deliveries + friend messages).
- Duels: only from a player card, no stakes (UI), 10-min cap. Arena (Sheriff): 100 gold entry, bracket of 8, spectators back a fighter (10-5,000). Sparring clones = owner tool.
- No man's land: PvP outside safe ground, number = monster level; "Attack <name>?" prompt, skulls red/white, full-carry loss on death; rematch lock. Badge opens rules.
- Race: Lil Bro's square race (4 flags, 3-2-1).
- Ranks (leaderboards): Ranks board (Combat level, Melee, Bow, Magic, Kills, each of 10 life skills), Records (daily-spin biggest wins/losses, Ace's flip hall of fame, Biggest fish per species), Skills, alliances board.
- Notifications panel (world chat + game news; unread count), Silence-all toggle. Hemi-checkmark badge.
- Capes / Golden Ticket contest: off. Threats/bounties: coded, off.

##### 7. BUYING AND SELLING
- Diego (General Store): sells ONLY lost tools (pickaxe/hatchet/rod) and a lost Pine Shield at 100 g (burnt); buys ores, logs, fish, bars, hardened wood, shards, remains, gems, essences, traps, seeds/crops/compost at a shared sliding price (half base into empty pile). Buys no food, gear, shield.
- Feed & Seed: seeds (16), compost 4 g, Orders board.
- Exchange (General Store): weapon order book, 24 h, 10 orders.
- Auction House: stackables, weapons, gear, pets; 1-999,999 gold; 7 days; 10 listings each.
- Player trade window; Ace's coin flip (stake x3, 45%), Gambling Den wager (10-10,000, 40%), weekly jackpot (50 g tickets), free spin double-or-nothing.
- Blacksmith/Woodworker/Gem Works charge gold for crafts; Hotel rest free; Pet House slots (1,000+); Bank (free); Arena entry 100.
- Real money: nothing. Supporter pass ($2/30 days via ETH): designed, NOT BUILT. Hemi Bros NFT: read-only check.

##### 8. DUNGEONS AND FIGHTS
- 4 dungeons (Goo Grotto Lv16 2-3 players, Great Cave, Foundry Dome, Buried City); enter within 200 px (E/Enter); 3 waves + boss; party of up to 4; boss chest on clear (gold, shards, 1/10 Rare Gem); 30 s loot window + "Leave now"; death returns you to BroTown, bag kept. 8 runs open max.
- Dungeon Workshop/creator (farm notice board): 1-10 waves, groups, boss, terrain; paid packs dormant; no shard drops.
- Bosses: dungeon bosses (Giant Blue Slime / Storm Slime split 3x, Amethyst Golem, Gilded Mummy). No overworld bosses (no snowman boss).
- Monsters: 9 kinds x2 stages (Snowman, Fire Goblin, Mummy/Skeleton, Rock Golem, Storm Eye, Water Frog, Rotcap/Lurker/Wisp, Blue/Storm Slime, Fishman...); plates by level colour; drops with roll numbers.
- Death choices: ordinary = pile at death spot, respawn after 5 s (no choice; "YOU DIED" card). No man's land death loses all carried; duel/arena death loses nothing. Linger countdown when leaving mid-PvP. Pick up your pile (60 s yours).
- Healing: Quick Eat (one bite / 15 s in fight), fish and dishes, Hotel / hay rest.

##### 9. THE SYSTEM
- Settings rows (player-visible): Audio on/off; Music volume; Effects volume; Quest path style (off/other chips, put away behind a switch); Landscape menu side (Auto / Left / Right); Silence all notifications (toggle); Login Key (save it / continue a character); Controls (replay tutorial); Play full screen (iOS browser only, install hint); Feedback; About (privacy, rules, credits); Restart character (typed confirm, Level 1).
- Other: Account panel (Log out / switch bro / Login Key words + Copy; guest tab note), character roster (CONTINUE / CREATE / USE LOGIN KEY; per-card Restart, Remove from device), name rename (owner-only? unsure), keyboard hints (computer), install hint, Speed test (Test panel), Sound Studio (owner), debug overlay (dev only).
- More menu tiles (labels): Quests, Life Skills, Journey, Achievements, Codex, Social, Clan (party), Party, Guild, Pets, Settings, Account, Map, Notifications, Feedback, About; plus Ranks and Friends.
- Bottom-band buttons: Dashboard (bag + 3 weapon cards), Character (your face), Quests, Life Skills, Codex, More; later "Bro" landing (Character, Combat, Equipment, Life Skills, Feats, Pets) being rebuilt (UI2/UI3 cards).
- Always-on HUD: top bar (place name, gold, door chip Log Out/Switch Bro), minimap, pinned quest, weapon button, stick, attack disc, sprint, special, whirlwind, block, burst, quick eat, trap, ride, jump, bell/chat, enter, NML badge, OPEN/CLOSE pill.
- Computer keys: WASD, Space, X, Shift, Z board, E use, Q shield, F burst, R whirlwind, T trap, V eat, Tab/1-3 weapons, C chat, B emotes, I bag, P character, J quests, L skills, K codex, O more, U ranks, M map, H keys, Enter/Esc.
- Feedback: send message to developers (in game); owner sees list. Reports of players.
- OWNER/DEV ONLY (long press on place name + admin key): Test panel: kit and levels, life-skill and combat levers, Tour jump-to, farm ripe, codex and kill-roll levers, sparring clones, bot flags, test mode, player logins (device pass, forget, new key), chat reports with Kick/Freeze, Speed test, Sound Studio, usage meter, owner switches (`?name=` flags), debug overlay (DEV_MODE). Live-ops flags (~109 kill switches) server-side.
- Unsure / not found: titles list beyond achievements; any "wardrobe/outfit" screen (outfits kept through death; no UI found); player guilds; fast travel; real house/housing.


## A2. The play screen and its entry points today

#### Inventory A: the play screen and its entry points (read from code, 2026-11-28)

Live state: the one band is ON everywhere (oneBand.js, default since tag 4152) and the new frame
`ui2` is ON (ui2Frame.js, tag 6681; `?ui2=0` gives the old six-button row, dash/NavRail.jsx +
dash/MorePanel.jsx, still in code). Everything below is the ui2 frame unless marked OLD.
Words: src/data/say/*.js. Fight controls (joystick, Attack disc, abilities, Shield, Special, Jump, Sprint,
Dodge, Element Burst, Quick-eat "Eat", Ride, Trap, weapon pill) are out of scope, named in one line at the end.

##### 1. On screen while playing (upright iPhone)

| button | where | opens | key | up/side/comp |
|---|---|---|---|---|
| LOGOUT (chip) | top bar, left (ZoneHeader) | confirm card "Leave the world?" (Cancel / Log Out) -> title screen | none | all three |
| Character HUD: portrait + name + level + weapon XP bar (whole box is one button) | top left (ui/hud/CharacterHud.jsx; `?hud=0` off) | Bro page via dashboardPanelBus.open('hero') | none (P does same) | all three (own CSS per view) |
| Zone title (centre of top bar; drawn clear in BroTown) | top bar centre | hold 1.2 s opens the Test panel (DevPanel, owner/dev tool); no visible tap | none | all |
| BroTown logo / XP bar / TEST MODE tag | top bar centre | not pressable (display) | - | all |
| Gold (coin + number) | top bar right | not pressable (tag 6786) | - | all |
| Free daily spin (wheel icon) | top bar, far right; only when worker has `loginspin` cap and the window is shut | LoginSpinWindow (the daily wheel); spent: a note of when next | none | all |
| Minimap (see-through button over the canvas minimap) | top right, Wheel only (WorldMapOverlay.jsx) | World map overlay (zoom +/-, "back to you" target, pins, Esc closes) | M | all (wears "M" on computer) |
| Minimap plate / No man's land skull (NmlBadge) | on the minimap plate | InfoPopup explaining No man's land / Outlaw | none | all |
| Pinned quest card (QuestCard) | upper left under HUD (unsure exact spot) | the quest's page in Quests (openQuestPage) | none | all |
| Party chip / list (PartyHUD) | side, only while in a party | the party roster; fold; Join / Decline invite card | none | all |
| Status chips (ElemStatusChips: snowflake, flame, slime) | HUD column | display only | - | all |
| World Chat feed header (lower left, above band) | above band, left | shows/hides the chat feed (fold); notification bell moved to Menu | none | all |
| Your own bro (tap the character in the world) | the world | Chat composer (ChatBubble); its smiley opens the Emote picker (EmotePanel) | B = emotes | all |
| Gear (slim row button, band closed/resting) | band, bottom | Gear workspace (bag + worn) | I | all |
| Menu (slim row button) | band, bottom | Menu directory (8 doors) | O | all |
| Band handle (BandGrip, 64x20 tab on band top edge) | top edge of band | fold / unfold the band | I at rest | upright (sideways: CLOSE/fold chip) |
| Near a door / thing: interact prompt, Enter button, ContextButton (CHOP etc.) | above band, centre | talk / enter building / harvest | Enter, E | all |
| NPC dialogue tap: townsfolk (tap only) | world | NpcDialogue / QuestOfferPanel / building windows | Enter | all |
| Weapon pill (WeaponPill, centred above band) | above band | pick melee / bow / staff | 1 2 3 | all (computer also has WeaponBar in band: WeaponBar.jsx) |
| Keyboard hints strip "Controls" | computer only (pointer:fine) | toggles the key list ("more") | H | computer only |
| UpdateBanner (stale build): Reload / Dismiss | top | reload page | none | all, rare |
| InstallHint (iOS Safari browser only): Dismiss | over world | none (instruction card) | none | iPhone browser |
| DUEL chip, DeathCard, NmlAskCard, trade/duel/clan invites, DungeonClearHud, RaceHud | transient cards | their own decisions | Enter/Esc | all, only on events |

Not on the play screen any more (owner removed): top-right player card, bell in corner, More's overlay (MoreOverlay unmounted),
the player frame (HP/energy; HP lives on the Character HUD / over the bro's head), Feedback button, daily-rewards button (opened from Quests > Daily and the Gambling Den only).
No standalone floating buttons exist for: party (chip only in a party), emotes (via chat smiley or B), world map (the minimap itself), settings gear (inside Menu), notifications (inside Settings hub), Test panel (hidden 1.2 s hold).

##### 2. The bottom dashboard (the "one band")

- Same band every screen (oneBand.js, class `bt-one-band`; Test panel row "Side column (old layout)" / `?oneband=0` is the only way back to the old side column). Upright height: 243 px at 390x844 (52 header row + 191 columns row; ONE_BAND_MAX_H, sheetGeometry.js barHeight); never taller; on wider screens min(243, a third of height); world gets bars at its sides past the world rule.
- Header row (kit Ui2Header, DashHeader.jsx), by state (src/game/dashNav.js: one state `ws` gear|menu, `shown`, a stack per workspace):
  - closed ("slim row"): [ Gear ] [ Menu ]  (I / O keys)
  - Gear root: [Close]  Gear  [Menu >]
  - Menu root: [< Gear]  Menu  [Close]
  - any page: [< Back (names target: page under / Gear / Menu / World)]  title  [Menu] [Close]  (Menu = the directory root; Esc = Close)
- Gear and Menu keep independent remembered states; Close hides without resetting; Menu resumes its last page. Fold state remembered (`bt_dash_min`, dashMinBus).
- Gear root (GearTab.jsx via DashColumns/OneBandColumns): panels "Inventory" (filter pill "Filter: ...", gold tile, bag grid) | "Equipped" (worn cells) | "Details" (item stats, compare, "..." more); tap an item = the one item page (ItemPage). Computer adds WeaponBar. Bro > Equipment door goes to Gear.
- How other panels open: all through dashboardPanelBus (open / go push / toBar / key), page table PANELS + FRAME_PAGES in BottomDashboard.jsx; dash pages are lazy (lazyPanels.js: Dash* panels loaded on first open; "Couldn't open this" card on failure). Old windows (BroTown.jsx setShow*) are lazy too and only open from buildings/players.
- Sideways (bandSideways.js): phone wider than tall, h <= 500, no mouse. Rests FOLDED to the button row (130 px), a button opens its page and unfolds; controls hide while band is open (`bt-band-side-open`); fold is the moment's, not remembered. Menu grid becomes ONE row of 8 (menuGridShape). Computer / iPad on its side keep the band open.
- OLD (`?ui2=0`): row = CLOSE + six buttons (RAIL_ITEMS in BottomDashboard.jsx): Gear (I), Bro (P), Quests (J), Ranks (U, title "Leaderboards"), Codex (K), More (O); L = Life Skills page under Bro. DESTINATIONS also holds Bag, Life Skills ("skills"), Friends ("social") not on the rail.

###### Menu directory (MENU_DESTS, dashDests.js; 4x2 grid, upright/computer; 1x8 sideways)
Bro (P) | Quests (J) | Social | Ranks (U) | Codex (K) | Homestead | Map (M, opens World map, no page) | Settings
Marks: points glow on Bro tile and on the Menu button; ready quest dot on Quests; codex count; Social requests; bell count on Settings.

##### 3. Parent -> children tree
- Gear (I): item page (ItemPage), filter menu, gold tile, worn slot -> item page / Equipment via Bro
- Menu (O)
  - Bro (P): six doors Combat | Equipment | Life Skills (L) | Feats | Pets | Journey, plus a strip (AP, Quests, Clan or Party, Guilds)
    - Combat: Sword, Bow, Staff pages (each -> DPS stat tree layers, 7), Shared Attributes, Points (spend; SpendPointConfirm popup)
    - Equipment: showcase (nine worn cells, Manage Gear -> Gear)
    - Life Skills: 10 skill pages (Woodcutting, Fishing, Mining, Farming, Trapping, Cooking, Smithing, Woodworking, Gem Cutting, Enchanting), each -> All unlocks, How it works
    - Feats (cap `achievements`): medals by tier, tier gallery, one medal, AP sources, Quest History, Titles (Equip)
    - Pets (cap `petbook`): owned / one pet / all (Pets pages)
    - Journey: lifetime records
    - another player's Bro: Character page (from Ranks tap / inspect)
  - Quests (J): landing rows (your quests) + doors Daily (opens DailyRewardsWindow, only when shown), Completed (n), On offer; quest page, Rewards, journey; quest "Map" pin -> World map
  - Social hub: Friends | Party (Clan when in clan) | Guilds
  - Ranks (U): landing Combat | Life Skills | Feats -> boards (Woodcutting etc., Daily spin, Points placed, Biggest fish)
  - Codex (K): shelves Monsters | Items | Resources | Townsfolk | Lands | Pets (Pets -> pet journal); monster page doors Combat | Loot | Habitat | Story
  - Homestead: farm plots page
  - Map (M): World map overlay (not a page)
  - Settings hub: Settings | Notifications | Account | Feedback | About
    - Settings page rows: Audio, Music, Effects, Quest path (hidden unless `?questpath`), Landscape menu side, Notifications silence-all, Login Key (-> Account), Controls (replays ControlsTutorial), Play full screen (iOS Safari browser only; InstallHint), Feedback, About, Restart character (confirm screen)
    - Account: Login Key, continue a character; Feedback: message devs; About: privacy, rules, credits
- World-only doors: Chat composer (-> Emotes), World map (-> pins), Test panel (DevPanel, hold title), LoginSpin, buildings' windows (Exchange, Gamble, Party/Saloon, Smithy, Woodwork, Gem Works, Cook, Farm, Store, Vendor, Bank, Land Office, Pet House, Furniture, Dungeon Creator, Wheel halls), Inspect player card / Player list / Trade / Duel / Clan invite.
- Old-map-style windows still lazy-registered but reached only from buildings/players: LeaderboardPanel, FeedbackPanel, ClanPanel, EncyclopediaPanel, StatScreenPanel (unsure whether any live road opens these under ui2).

##### 4. Counts
- Upright entry buttons always on screen in play: 8 pressable (LOGOUT, Character HUD, daily spin [conditional], minimap, chat-feed header, Gear, Menu, band handle) + the world taps (your bro = chat, NPCs) + the pinned quest card and NML plate (conditional). Pressable only when present: party chip, interact/Enter/context button, weapon pill. (Computer adds hints strip + WeaponBar.)
- Menu doors: 8. Hub tiles: 3 (Social) + 5 (Settings). Bro doors: 6. Total distinct dashboard pages I counted: ~ 8 menu + 8 hub/bro-level (Friends, Party, Guilds, Settings, Notifications, Account, Feedback, About) + 6 Bro doors + 3 weapon pages + Shared + Points + 10 life skills + Unlocks/How + Feats sub-pages (~6) + Quests sub-pages (4) + Ranks (3 groups + boards) + Codex (6 shelves + monster page) + Homestead + Gear/Item page = roughly 70-80 distinct screens (approximate; boards and life skills multiply). Top-level windows outside the dashboard: World map, Chat, Emotes, Daily spin, Daily rewards, Controls tutorial, Info popup, Test panel + ~16 building/player windows.

##### 5. Dormant / dev-only / old
- DEV: DevPanel (Test panel, 1.2 s hold), DebugOverlay + BuildBadge (`?dev=1`), "Debug overlay (D)" toggle in Settings (DEV_MODE).
- OLD behind `?ui2=0`: RAIL_ITEMS row, MorePanel's fifteen tiles (Quests, Life Skills, Journey, Achievements, Codex, Pets, Social, Clan, Guild, Settings, Account, Map, Notifications, Feedback, About; MORE_ROADS maps each to its new road), NavRail.jsx. `?oneband=0` old side column. `?hud=0` old top left, `?topgold=0` hides gold.
- Unmounted: MoreOverlay, InventorySurface, InspectCard, MasteryNotification; notification bell corner (moved to Settings hub).
- Not mounted but in tree: ChatLauncher (not found), RideButton "Ride the skateboard" (Z), QuickEatButton "Eat", TrapButton ("TRAP" over a targeted monster), ElementBurstButton (L6 + enchanted weapon).
- Fight controls (out of scope): joystick(s), Attack disc, AbilityButtons, ShieldButton, SpecialButton, JumpButton (X), SprintButton (Shift), WeaponPill, ContextButton.
- Computer keys (deskKeys.js NAV_KEYS + MAP_KEY): I Gear, P Bro, J Quests, L Life Skills, K Codex, O Menu, U Ranks, M map, B emotes, H hints, Z ride, 1-3 weapons, Enter dialogue button, Esc window X. Under ui2 I = Gear, O = Menu, others open their page; pressed again closes.


## A3. The character pages today

#### Inv-B: the bottom dashboard's tabs (what is on main, read from code + docs/UI-DESIGN-NOTES.md, 2026-11-28)

##### Frame (src/game/dashNav.js, dashDests.js, ui/mobile/dash/DashHeader.jsx, MenuGrid.jsx)
- No tab strip any more (`?ui2=0` brings the old CLOSE/Gear/Bro/Quests/Ranks/Codex/More row back; dormant). Two workspaces under ONE header: **Gear** and **Menu**. Header: Gear root `[Close] Gear [Menu >]`; Menu root `[< Gear] Menu [Close]`; a page `[< Back-target] Name [Menu] [Close]`. Back follows real history; Close hides, resets nothing.
- Resting state upright: the band is open on Gear (two panels) unless folded (`bt_dash_min`, remembered; a brand-new player and a sideways phone start folded). Folded = slim row with only **Gear** and **Menu** buttons. Sideways: no band; 44 px chip opens a column beside the world.
- **Menu root = 8 equal tiles (4x2)**: Bro, Quests, Social, Ranks, Codex, Homestead, Map, Settings. Marks: points glow on Bro tile + count on Menu button; quest-ready, Codex new pages, requests, bell unread.
  - Social hub: Friends, Party (Clan), Guilds. Settings hub: Settings, Notifications, Account, Feedback, About. Homestead = small info page (plots ready, where the farm is). Map = opens the World map over the game.
- Also reachable by HUD: top-left Character HUD (portrait, name, combat level, gold XP bar) = ONE button that opens Bro (`dashboardPanelBus.open('hero')`); pinned one-line quest tracker opens that quest's page (Back says "World"); weapon pill (sword|bow|staff) at foot of world swaps the weapon in hand.

###### Gear (workspace root; computer key I)
- Two panels side by side, no middle column (src/ui/mobile/dash/GearPanels.jsx, src/game/workspace.js). Left **Inventory**, right **Equipped**.
- Inventory: label row with **Filter** pill (accordion menu: All items; Weapons {sword,bow,staff}; Armour {chest,legs,cape,shield,amulet}; Gems & shards; Ore & bars; Wood; Crops & seeds; Fish; Food & drinks; Potions; Quest items; Other; shows "weapons n/max"; Esc/close), an "All" clear button when filtered, empty-state "No {x} in your bag" + **Show all**. Grid 3 across, whole rows, scrolls, snaps to row; each square = item art, count, pin mark, "?" for unrevealed, big-fish mark. Spare identical armour stacks (count). Gold coin pill only when `?topgold=0` (otherwise gold is on the top bar). Computer (840 band): up to 8 columns.
- Equipped: body-shaped, 9 cells: Sword, Bow, Staff (left); Cape, Chest, Legs (middle); Shield, Amulet, Gem (right). Pale green ground (`?equiplook=0` off). The weapon in hand is framed ("In hand"). Sideways: one row of 3x3 groups.
- **Quick look** (tap a bag square or a worn cell; the OPPOSITE panel becomes its summary; source never moves; tap same square or x / Esc to leave): picture, name, headline fact, "Now / If equipped" comparison (signed deltas with words, e.g. DPS, Damage cut, Block), up to 2 more rows, plain-words tradeoff line, requirement reason when Equip is off ("Sword level 18, requires 25"); buttons: **Details** + ONE lead action (Equip / Unequip / Eat / Drink / Reveal / Light fire / Claim / Open Golden Ticket, depending on item). A "?" piece: "Rare or better", Reveal + Equip, no numbers.
- **Details = the one item page** (header: kind, e.g. Sword/Chest/Item; ItemPage.jsx): picture in grade slot (Normal/Rare/Elite/Godly + stars), full name, grade, where ("In your bag"/"Worn"), 3-across facts (Damage, DPS on YOUR char, Attack speed, Range, Block, Damage cut, Hardness, Gems, Requires, You hold), full action row from `dash/itemActions.js`: Light fire, Eat, Open Golden Ticket, Claim, Drink, Inspect (fish weigh-in), Equip/Unequip (cape too), Reveal, Sell (OFF with reason except in a shop; never from Gear), **Drop** (red; hands to ItemDetailPopup's own sheet: how many, then confirm; blocked in some zones with a reason), **Pin/Unpin** (lock). No "destroy"/trash/compare button other than the quick-look comparison (grep found none).
- Tapping Equipped cell Gem: presses nothing on item page (gems live on the weapon page) (unsure beyond notes).
- Dormant/old under `?ui2=0`: GearTab.jsx three panels with a bro card in the middle (bro/vitals EN bar).

###### Menu > Bro (page id `hero`; key P; or tap the HUD portrait)
- Switches (all ON by default, `=0` off-ramp, remembered): `?v17bro` (BroV17.jsx), `?v17combat`, `?v17gear`, `?v17look`, `?v17wide`. With `?v17bro=0` the previous BroLanding.jsx (six tiles + strip) shows.
- V17 page (sheet/BroV17.jsx, src/game/broV17.js): **Sword, Bow, Staff** level tiles (art, `Lv n`, XP bar, points-to-spend only when >0, words "In hand" / "Worn" / "Not worn"; tile opens that weapon's page) -> row of doors **Shared Attributes** (with its points + the seven pictures on the hub) and **Pets** -> two quiet facts: held weapon DPS, Max HP (no effective health) -> ONE quiet paged strip (more button "1/2"): **Equipment, Life Skills, Feats, Journey**, then **AP, Quests (done), Clan/Party, Guilds**. Locked doors (worker cap missing) keep their place, popup "Not open on this server yet". No portrait/name/level (HUD has them).
- Old six-door landing (`?v17bro=0`): Combat, Equipment, Life Skills, Feats, Pets, Journey + strip AP / Quests done / Clan or "Party of 3" / Guilds ("Skill guilds").
- **Combat hub** (sheet/CombatHub.jsx; reached by the HUD weapon pill tap path or `?v17bro=0`): Sword, Bow, Staff tiles (art, level, XP bar, "n points" only when >0), Shared Attributes door.
- **Weapon page (Sword / Bow / Staff)**, one template (attrTemplate.jsx, WeaponPage.jsx): "Attributes" line with "n {Weapon} points to spend" (gold when >0) -> six attribute tiles with art: **Range, Power, Speed, Luck, Special, Element** (+ gold "+" only when points; tile shows "n placed" or "n / cap") -> level + "x / y XP" + road line ("Each Sword level gives 3 Sword points") -> **DPS** stat (chevron opens the stat tree) -> Damage, Attack speed, Crit chance, Range (beside DPS on a computer, else behind an **All stats** door on phones). Sideways: one row.
- **Attribute preview window** (sheet/statWindow.jsx + InfoPopup.jsx, StatDemo): what one point does, before/after, DPS row, fight scene, **stepper (- / n / +) opens at 0**, lane tabs (Sword/Bow/Staff + Shared) each with its pool count, **Spend** (gold commit, greyed at 0, window stays after). Read-only for other players.
- **DPS stat tree**: 7 one-layer pages titled "DPS" (DPS = damage a swing / seconds a swing...; rows are tiles; a raised row opens the next layer or the worn weapon's item page); Back returns layer by layer.
- **Shared Attributes page** (SharedPage.jsx): Max HP headline (tap explains), Defense, "n shared points to spend", the seven: **Max HP, Defense, Max Mana, Stamina, Dodge, Speed (move), Resist** (4+3), same preview window. Rule shown: "+3 each level of your best weapon" (>= 360 px wide).
- **Equipment** (showcase, `broEquip`): your figure + **Manage Gear** (opens Gear) + 9 worn cells in Gear's body shape; each cell opens the item page; another player's: no figure, read-only.
- **Life Skills** (key L; page `skills`): "Total level" stat; ten raised tiles (gather: Woodcutting, Fishing, Mining, Farming, Trapping; craft: Cooking, Smithing, Woodworking, Gem Cutting, Enchanting) each art + "Lv N" + thin XP bar + new-level dot. A skill's page: level + XP, facts (next unlock, latest unlock, guild line -> Guilds), doors **All unlocks (n)** (full ladder Got/Next/Later) and **How it works**.
- **Feats** (page `achievements`, cap `achievements`): AP (large stat, a door to AP sources tree: achievements by tier + "quests, guild rungs and the arena"), four doors: **Achievements ("n of 33"), Titles ("Wearing: ..."), Quest History, Lifetime Records** (= Journey page); medal tiers Common, Rare, Arena, Super-rare galleries; a medal's page (tier, AP, date, requirement, progress hint, title door). **Titles page**: Equip / Remove with pending mark, worn title's requirement.
- **Pets** (cap `petbook`): companion landing (pet out, name, kind/stage, Golden/Big badges, XP bar), doors **Owned ("2 of 30")** and **All ("2 of 18 caught")**; Owned: collection, "More room" at the Pet House's price (confirm), cards ("With you"); a pet's page actions: Take out/Put away, Rename, Release (asks: red Release / Keep), Sell (only where a store buys). All = journal (Levels 1-20 / 21-40), card opens monster in Codex.
- **Journey**: record cards (kills, deaths, lifetime gold, lifetime XP) (unsure of exact list in code).
- Another player's Bro: "Character" page, read-only (face, name, levels, AP, kills, clan tag; title/quests "Not shared"); opened from Ranks rows / player card.

###### Menu > Quests (key J)
- Landing: rows of active quests (giver face, name, count "0/4", green "Ready", gold star = tracked; tracked first); doors under rows: **Daily** (only when daily rewards card shows), **Completed (n)**, **On offer (n)**. Empty = kit empty state + same doors.
- Quest page ("Quest"): giver face, name, state; completed steps (green tick) scroll; **NOW** box (picture, what to do, count + bar, place); "The adventure continues"; actions **Track** (toggle, tells "Your map's gold star follows this quest"), **Show on map** (absent where unmappable), **Rewards** door (page of reward tiles). No future steps, no step count, no percent, no Story door (no text exists). Completed quest = whole history + "Next:" line. Offer = talk to giver + Show on map.

###### Menu > Ranks (key U)
- Landing three doors: Combat, Life Skills, Feats; a group = board doors (Combat: Overall, Sword, Bow, Staff, Combat level, Points placed; Life Skills: the ten; Feats: Kills, AP, Daily spin, Coin flip, Biggest fish). A board = standings (Rank | Player | unit), your row marked "You" + pinned; tap row opens that player's Character page.

###### Menu > Codex (key K), Social, Settings, Homestead, Map (key M)  [only listed; other lanes own detail]
- Codex (encyclopedia: monsters/items/pets doors; item drops open the one item page). Social: Friends, Party/Clan, Guilds. Settings hub as above. (unsure: inner contents not read.)

##### Taps from plain play (dashboard at rest = Gear workspace open upright; add 1 if the band is folded: tap Gear)
| # | Task | Taps |
|---|---|---|
| 1 | Equip gear from bag | 2: bag square, **Equip** (quick look). +1 Gear if folded. Filter first = +2. Unequip: worn cell, Unequip. |
| 2 | Spend a build point | 6 via Menu: Menu, Bro, weapon tile, attribute tile, **+** (stepper opens at 0), **Spend**. 5 via the HUD portrait (portrait, weapon tile, attribute, +, Spend). Shared stats: same, Shared Attributes door instead of weapon tile. Key P on a computer saves one. |
| 3 | Read current quest's steps | 1 from play: the pinned one-line tracker opens the quest page (steps + NOW). Via dashboard: Menu, Quests, row = 3 (2 if Menu resumes on Quests). |
| 4 | Eat food / potion | 1 if QuickEatButton shows (over movement stick, only while missing HP and carrying a heal; V on computer). Bag route: bag square, **Eat/Drink** = 2 (eatBus consumes at once; one-bite rule "Eat again in Ns" in PvP). |
| 5 | See my stats (damage, defence...) | DPS + Max HP quiet facts on Bro page = 2 (Menu, Bro) or 1 (portrait/P). Damage / Attack speed / Crit chance / Range: Bro, weapon tile, (phone: All stats) = 3-4 (+Menu = 4-5). Defense: Bro, Shared Attributes = 3 via Menu (2 via portrait). Item-based numbers: quick look comparison = 1 tap from rest. |
| 6 | Change equipped weapon | In-hand swap among worn weapons: 1 tap on the weapon pill (or 1/2/3 keys). Put a different sword/bow/staff on: bag square, Equip = 2 (weapons bag cap shown "n/max"). |
| 7 | Change ability/loadout | NOT in the dashboard: no loadout/ability picker exists. Abilities (Whirlwind, Shield Bash, Block, Special, Element Burst) are on-screen buttons; element = the weapon item's own element + the Element attribute points (Bro > weapon page). "Loadout" art is only Equipment's door picture. (unsure whether another screen picks abilities) |
| 8 | Drop / destroy an item | 4 + confirm: bag square, **Details**, **Drop**, (quantity) confirm = 4-5. Destroy/trash: none; Sell only in a shop (shop window's own flow). Pin first to protect (Details, Pin). |
| 9 | See my skills' levels | Life Skills: Menu, Bro, Life Skills strip door (strip is paged: may need the "more" press) = 3-4; via portrait/P: 2-3; key L = 1. Combat levels: Bro page itself (tiles) = 2 via Menu, 1 via portrait. A skill's XP detail +1. |
| 10 | See gold / currencies | 0 taps: gold on the top bar (between BroTown and the daily spin; `?topgold=0` puts a coin pill in the bag's label row). Only currency is coins; AP = Bro strip/Feats (2-3). Bag coin pill is not a button. |

##### Computer keys (src/game/deskKeys.js NAV_KEYS; worn by buttons as `data-key`)
- I = Gear (toggle; pressed again closes), O = Menu, P = Bro, J = Quests, U = Ranks, K = Codex, L = Life Skills (opens page under Bro; toggles), M = World map. 1/2/3 weapons (weapon bar), V quick eat, Z skateboard, B emotes. Esc = the front-most data-esc (x/Close/summary x/filter menu), Enter = data-enter. Never with Ctrl/Cmd/Alt. Items, attributes, quests rows, pets etc. have no keys of their own.
- Social, Homestead, Settings: no key (only O to the Menu).
- Sideways: one row layouts (weapon tiles, DPS, six attributes as doors with their word+points, no pictures; four extra stats collapse to "All stats" unless ~900 px page); Gear Equipped as one row of three groups, bag one row with filter beside; Bro puts facts (and Pets on 667x375/740x360) in the strip; sideways column is a side panel beside the world (never over it), band folded at rest, Dynamic Island side kept.
- Computer: upright layout always (band at bottom), 840 band under `?v17wide` (more bag columns, Bro in one row; never larger art/text); keys; Combat DPS beside the 4 facts; HUD buttons say "click".

##### Owner's quoted constraints (UI-DESIGN-NOTES / docs/design)
- 2026-11-25: "Completely retire the old CLOSE / Gear / Bro / Quests / Codex / More persistent tab strip ... no duplicate secondary global nav."; "Keep the existing mobile dashboard height."
- 2026-11-26: Main menu "Keep the four-by-two layout. Enlarge the icons by approximately 25% ... retain your existing illustrated game icons".
- 2026-11-26: "Gear. Actually one of your better layouts ... Preserve the side-by-side structure."; "the third row gets cut off" (bag whole rows); slots never under 44.
- 2026-11-26: "only show available points prominently when there are points to spend."
- 2026-11-26: "I don't think you need separate Bro and Character landing menus anymore ... a unified character management dashboard."
- 2026-11-26: "remove the pull handle on the dashboard ... implies stretching" (no handle/bar on the band's edge).
- 2026-11-26: "Quest: Smaller, single-line tracker underneath."; "Move gold amount in between daily spin and brotown on top bar" (gold never back on the band, no second gold count).
- 2026-11-27/28: Gear: "Remove the coins from bag and slide filter over."; "Equipped has whiteish background not green."; "Inventory slots are awkwardly spaced on the sides."
- 2026-11-28 ~02:10: "Don't like combat menu or primary skill/shared attribute menus. Too confusing for first time player and doesn't use visuals first."
- 2026-11-27: V17 "labels centered": "I'd prefer centered." 
- Standing: "keep my game content over the mockup stuff"; "Do not compromise readability, available screen space, gameplay visibility or device fairness"; "Flag unresolved requirements rather than inventing solutions"; quests must not show future steps / step totals / percent.
- 2026-11-02: filter "tiny accordion style pill ... expands downward"; 2026-07: no play caps; talking to NPCs is a tap.
- Don't suggest (notes): a page taller than the band, round tiles, a Bag button, a persistent tab row, a bigger Menu tile, worn gear / HP / XP numbers back on the band, gold on the band.

##### Dormant / flagged / dev-only
- `?ui2=0` old frame + old pages (GearTab 3-panel, Points window, BroCard tabs, CharacterPage passport, Achievements page, MorePanel of 15 tiles, `?questpages=0` older quests list). `?uikit=1` UI kit showcase page (dev). `?v17*=0`, `?ui2look=0`, `?ui2shine=0`, `?dashgrow=0`, `?bandgrip=1` (handle back), `?hud=0`, `?topgold=0`, `?equiplook=0`.
- ItemTooltip.jsx / InventorySurface.jsx: not mounted anywhere (bag surface left); InspectCard.jsx opened only by GameApp (player profile / mock via QA command), not by dashboard tabs.
- ItemDetailPopup.jsx still drawn for Sell / Drop sheets (flow handed from the item page); InfoPopup = "what is this" popups (stat info, XP numbers, locked door).
- Feats: no Discoveries door (worker keeps none); Quests: no Story door; Combat/Shared: no effective-health number (owner question F1); Shared points rule differs from V17's (flag Q1); Pet stats not invented; Social/Notifications/About have no art.
- Another-player pages (Character, Equipment, Pets, Feats, Life Skills) are built, read-only; opened only from Ranks rows / player card.


## A4. The windows of the world and the economy today

#### Inventory C: windows of the world and the economy (read-only, code is truth)

Opening rules common to all building windows (UI-DESIGN-NOTES "Building doors", "Building windows"): walk to the foot of a building's steps, a small "Enter <SIGN NAME>" button comes up over the bro's head (also E on a computer, or a tap on the right stick showing a door picture); it opens on finger LIFT. Taps from plain play: walking to the door is required, then 1 tap (Enter). Nobody walks inside. All are cards 360 px wide (470 on a big computer), room painting as back layer, one big X top-right (data-esc), fade at the bottom, stops above the dashboard band; lazy-loaded (a "Couldn't open this / Reload / Close" card if the code fails). The Town Hall board (opened from the square's noticeboard) is the only "menu of everything". Sideways phone: room picture dropped.

Words come from `src/data/say/*.js` tables (player-facing strings exact below).

##### ECONOMY: shops / market / trade / stash
| window | opened by (taps) | kind | holds | status |
|---|---|---|---|---|
| **Diego** (shop; title "Diego", motto "The more I have, the less I pay.") | tap/click on Diego the shopkeeper (he walks; opens within 90 px of HIM; NOT from a door); 1 tap once near | window of its own, no room; attaches to the real bag band | "His shelf" (always-in-stock staples, tools: "You have one" / "Mayor Bro's quest gives the first" / "A replacement, if yours was lost"), your bag below; tap shelf to buy, tap bag to sell; qty stepper "One fewer"/"One more"; "Bro has N / you have N"; buttons "BUY {price}" / "SELL {price}"; states "Not enough gold", "He won't buy", "Not yet", "Not for sale"; "His shelf is bare. Sell him something."; Close | live (shopBus, ShopkeeperPanel) |
| **Marketplace** (General Store door; plot `store`, TOWN id `marketplace`, action `exchange`) | Enter at General Store door | building card | head: "Marketplace", gold wallet, link "Auction House / Buy now or bid ›", hint "Trade by gear type · Orders last 24h · Refunds by mail"; tabs **Buy / Sell / My Orders**; Category and Type pickers; "Filters:" chips ("Any element", Material Tier, Element (optional), Any, Done); price "Max you'll pay" / "Ask Price" + "Est. value: ~NG"; Sell: "Select Item from Stash" ("No items in stash to sell"); big button "Place Buy Order (NG)" / "List for Sale (NG)"; "Order Book - {tier} {type}" with SELL ORDERS (lowest first) / BUY ORDERS (highest first) rows, "(you)"; "Your Active Orders (N)" with BUY/SELL badge, "Nm left", cancel. Board tile: "General Store / Player weapon exchange" | live (weapon-gear exchange) |
| **Auction House** (door `auction`; `auctionhouse`) | Enter at Auction House door. Opens VendorPanel first (title "Auction House", "Individual item listings and bids", "Your gold", one tile "Market / Buy, sell, and bid with players", note "Meals and drinks are cooked at the Cookhouse, from what the farm grows."), tap tile opens StorePanel | building card then own window (no room) | StorePanel: "Auction House / What everyone is selling"; tabs **Shelf / My Listings / My Bids**; category chips (CATEGORIES + "Pets"); listing rows: icon, name, x qty, "Seller: name", "Top bid: Ng"/"No bids", time left ("expiring", "Nm/Nh/Nd left"), pet badges (Lv, Golden, Big, owners), H hardness; buttons "Buy Ng", "Bid" + amount + "Place", "Take Ng" (sold), "Take down"; "Message the seller" / "Messages about your listing" (StoreChatPanel); "+ List an Item" (opens bag; Sell is chosen in the bag); "N of M slots used"; footer "Listings last one week..."; empty states; closed note "The store is not open on this world yet." Clerk drawn in its room | live (cap-gated: storeEnabled) |
| **Bank** (door `bank`) | Enter at Bank door | building card | old: "Bank / Vault & equipment": "Gold on hand", "Equipped" (Melee, Bow, Armor, Shield). Vault version (cap, "Your vault"): "Safe from death" intro, "On you" / "In the vault" lists, "Your bag", "The vault (used of slots)", tiles with count, chips "All", "Amount" + OK, buttons "Put in" / "Take out", "Tools stay in your bag."; closed text "The vault is closed for now." Board sub: "Gold & gear overview" or "Store gold & items" | live; vault part cap-gated (bankOn) |
| **Trade window** ("Trade", "Trading with {name}") | request from a player's card (Trade button; also NML ask card "Trade"); phone-side invite card first | window; stages items from the REAL bag band (tradeBagBus) | invite card "{name} wants to trade" [Open trade] [Decline]; "Trade request sent - waiting..." [Cancel]; "You offer" / "{name} offers" lists; "Your weapons", "Your pets" chips, bag tiles, "Gold" row with presets ("Presets subtract/add gold", "Offer no gold", "Clear", "Offer N more gold"), steppers (One fewer/One more/Remove); buttons "Ready to trade" -> "Confirm trade" -> review "Confirm with {name}" with YOU GIVE / YOU RECEIVE, "Accept" / "Accept (large trade)" (needs two taps + "Wait Ns..."), "Back", "Leave this trade?" ["Keep Trading"/"Leave Trade"]; receipt "Trade complete" ("You received", "You sent", "Balance"); refusals ("Not while one of you is fighting a player...") | live |
| **Incoming Trade** card | automatic when a trade request arrives | small card | "Incoming Trade", "{name} wants to trade. They offer:", [Open trade] [Decline], "Trade accepted!" | live (IncomingTradePanel; the TradeWindow invite is the newer twin; unsure which draws in the Wheel) |
| **Sale notice** (StoreToast) | automatic on an Auction sale | toast (above band, tap to dismiss) | "You sold X for Y" | live |
| **Post Office** (hall `post`) | Enter at Post Office | hall card | "Your mail" (rows "N x name": sales, refunds, trade payouts, rewards; "Nothing yet this visit..."), "Messages from friends" ("Write to a friend. They read it when they next come in.") | live (hall; also Social panel) |

##### MAKING: farm / cooking / fishing / crafting
| window | opened by | kind | holds | status |
|---|---|---|---|---|
| **Blacksmith** (door `blacksmith`; or tap Blacksmith Bro) | Enter / tap keeper | building card sits LOW (so your bro is seen at the anvil), slim room | "Blacksmith"; tabs Smelt, Forge (weapons, "Greatsword"/"Sword" types), **Armor**, **Upgrade** (Harden "H1 -> H2" w/ "Fail keeps H" / "Fail -> H0", and "Take gem out of {name}" [Take out]), **Amulet** (only if you hold nugget/bar/amulet; [Craft]), **Salvage** ([Salvage], "Sure?" confirm, "Essences" [Use]); a tab shows only if the server can do it; every cost a chip HAVE/NEED red/green, XP pill star, locks "Smithing 5"; shows next tier locked only | live |
| **Woodworker** (door) | Enter | building card | "Woodworker"; tabs Bow, Staff, Hardened, Upgrade, Traps (BenchParts shared with forge; "H1 -> H2") | live |
| **Gem Works** (door `gemcutter`) | Enter | ONE window two tabs | tabs **Cut gems** ("Raw to polished"; also shard cracking "Shards" [Crack]/[All N], "Raw gems" [Combine], "Rare Gem" cut into elemental, "Your gems") and **Set gems** ("Polished into gear"; Enchanter: gems into weapon/shield/amulet; titles "Gem Cutter", "Enchanter") | live |
| **Cookhouse** (door `cookhouse`; id `cooking`) | Enter | building card | "Cookhouse", "Cooking Lv N", recipe rows with 4 states (ok / missing "Firebloom 0/1" + "Need herb" / level-locked lock glyph), note "Raw fish are cooked at a campfire, not here..." (fish game REMOVED), "Cooked - Ready to Eat" list with [Eat] | live (cooking recipes; fish minigame removed) |
| **Feed & Seed** (door `feedseed`; panel FeedSeedPanel via FarmPanel when cap `farm`) | Enter | building card | "Feed & Seed", "Farming N"; tabs **Buy / Deliver**; "Your plots" (N ready to harvest / N growing), seeds with level locks, "What you can buy", "Today's orders" (Goods, "You have N", [Deliver], "Delivered", "New orders in Nm"), compost (+50% harvest), key line grow/water/harvest times, [Visit Your Farm]; old FarmPanel ("Plots", "Plant seeds") fallback vs old worker | live (worker-run farm; old panel dormant fallback) |
| **Land Office** (door `landoffice`; `farmhome`) | Enter | building card (panel in card) | "Land Office", "Your own farm", [Travel to Farm], [Cancel] | live |
| **Farm bed prompt** (FarmBedPrompt) | stand at a bed on your farm (zone `farm_home`): one button in the Enter slot, 1 tap | HUD button over band | one next step: "Dig", "Plant <crop>", "Water", "Fertilize", "Harvest" with the step's picture; with several seed kinds, seed pictures to pick the one to plant | live |
| **Furniture Workshop** | on your farm, walk near your house: button "Furniture Workshop" (click only) | inspect-style card (FurniturePanel) | "Craft", "Placed:", "Woodworking Lv"/"WC Lv" requirements | live but only on the personal farm (unsure how reachable in Wheel) |
| **Dungeon Workshop** (DungeonCreatorPanel) | farm zone, near workshop: purple prompt (E on computer), or `_desktopOpenWorkshop` | full window | "Dungeon Workshop / Design custom dungeons - Max monster level: N"; Width, Height, Waves (max), Monster Level (max), HP x, Terrain Theme, Terrain Packs (Owned), Monster Packs, "Add Monsters" with "Count:", "Total per wave:", "Dungeon Element (optional)", "Dungeon Name", "Saved Dungeons (N)" ("No saved dungeons yet", "Edit", "My Dungeon"), "Not enough gold!" | live only at the farm workshop (unsure it is reachable now; old-map legacy feel) |
| **Pet House** | farm zone near pet house: orange prompt "Pet House" -> opens dashboard Pets page when cap `petbook`, else old PetHousePanel | prompt + dashboard page (old panel = fallback) | see dashboard lane (Pets) | live (old panel dormant with new worker) |
| **Weigh-in** (FishWeighCard) | bag Inspect on a fish -> worker weighs | small card near top, stays until X/Esc/STAY_MS | "Weigh-in", "Weighing your {name}...", "Your heaviest {name} yet!", "Your best: N kg" "#rank on the board", "N more to weigh", [Records] (More -> Ranks, Biggest fish), X | live |
| **Trap catch card** (TrapCatchCard) | automatic when a trap snaps | small card over world | "Caught!", "A golden one!"/"A big one!", Lv, pet portrait, "Name your {kind}" input, [Name it] / [Done]; "You can name it later on the Pets page" | live |
| **Harvest prompts** (woodcut/mine/fish) | walk near node; right button reads HARVEST | HUD button | not a window (see UI-DESIGN-NOTES "Harvesting") | live |

##### FIGHTING: dungeon / arena / NML / race / death
| window | opened by | kind | holds | status |
|---|---|---|---|---|
| **Dungeon entry** ("Enter the Great Cave" etc.) | walk to a dungeon mouth in a land: prompt "Enter <name>" (1 tap); Town Board tiles pin to it | prompt over band | button only; Goo Grotto Lv 10+ party 2-3, Great Cave / Foundry Dome Lv 26+, Buried City Lv 41+ | live |
| **Dungeon clear card** (DungeonClearHud) | automatic after "DUNGEON CLEARED!" | small card top, countdown | "Dungeon cleared!", "Pick up your loot - out in N s", boss chest opening with gold/items/weapon XP, [Leave now] | live |
| **Gladiator Arena** (PartyPanel; `arena`) | Sheriff's Office hall row "The arena - Sign up for the gladiator arena" | window of its own, no room | "Gladiator Arena", "Your gold", entry line "100G entry - Up to 8 fighters - Single elimination", [Enter Arena - 100G], queue: "In Queue", position, "Bracket starts in Ns", [Leave Queue (refund 100G)]; bracket: "Tournament - Round N/M", "Current Matches", "Recent Results", "Spectator Betting" (bet 10-5000G, [Place Bet]), "Spectator Stakes", "GLADIATOR CHAMPION" (+gold, AP, "Gladiator" title), "Hall of Fame"; "FIGHT! Round N", "Eliminated" | live |
| **Sheriff's Office** hall | Enter | hall card | rows: "Duel a player" (Pick a player, then tap Duel on their card), "The arena" | live |
| **Duel Challenge** (DuelRequestPanel) | automatic on a challenge (sent from a player card) | small card | "Duel Challenge", "{name} challenges you!", "Wager: Ng (winner takes all)", rules line, [Accept] / [Accept (Ng)], [Decline]; "Duel challenge expired" | live |
| **Attack <name>?** (NmlAskCard) | automatic when a player in NML hits/taps/approaches | small card top, under minimap, never over thumbs | red skull + (i) info; "Attack {name}?" / "Hit back {name}?" / "{name} beat you"; buttons Attack, Party, Trade, Ignore; "Ask for a rematch", "Let {name} attack you again" | live |
| **NML badge / plate** (NmlBadge) | always while in NML, tap plate for "The rules" | HUD plate + info popup | "No man's land {ring} - Lv lo-hi", rules (Who, How, Attack first, Get attacked, Keep things safe), skull timers "red skull N min left", "Outlaw" | live |
| **Race HUD** (RaceHud) | start by talking to Lil Bro (tap) or tour race_1 | HUD strip | countdown 3-2-1 "GO!"; pill "Flags N/4" + clock + "Lil Bro {time}"; result card "You beat Lil Bro!"/"Lil Bro wins!", times, hint, [Race again] [OK] | live |
| **Death card** (DeathCard) | automatic on death (~5 s) | notice strip, no taps (pointer-events none) | "You died", what killed you, "Back in BroTown in N" | live |
| **Party / Saloon** (door `party`) | Enter | hall card | "Saloon / Team up with other bros": "Your party" list, "Invite a player" | live (social lane may own) |

##### REWARDS & STORY
| window | opened by | kind | holds | status |
|---|---|---|---|---|
| **Gambling Den** (door `gambler`) | Enter | building card | "Gambling Den / Free daily spin, a gold wager & the weekly jackpot"; "Free daily spin" (DailySpin: "Pot", [Spin - free] / [Use a bonus spin (N)], [Take Ng], [Double or nothing] 50%, "House limit", streak "N-day streak +pct%", buttons "Daily quests & season"/"Season rewards"); "Wager - Double or Nothing" (chips, [Roll - NG]); "Weekly Jackpot" (pool, tickets, [Deposit NG]); "Gambling Stats" (Total wagered/won/lost, Net) | live |
| **Free daily spin wheel** (LoginSpinWindow) | automatic after world ready + not during first steps (once a day) | full window, wheel art | "Free daily spin", "Tap SPIN: one free spin a day", [SPIN], lands "{pot} gold!", [COLLECT], "Double or nothing?" [YES]/[NO], X (closing with pot = NO) | live (owner 2026-11-05) |
| **Daily rewards** (DailyRewardsWindow; card in Quests tab) | Quests-tab card, or Gambling Den button; never by itself | window | tabs **Today / Season**; "N-day streak", freezes, spin state, (daily quests put away), Season N: stars, 25 tiers [Claim] / [Claim all (N)] | live (daily quests part hidden unless worker flag) |
| **Daily chest** (ChestReveal) | bag's Claim button only | window | "Daily chest": offer [Claim]/[Later], shake, open, prize ("+N coins", "N Cooked Fish", "A Rare Gem", armour), [Claim next (N)] [Done] | live (only if a chest is held) |
| **NPC dialogue** (NpcDialogue; title is his nickname) | TAP on a townsperson (never walk-up) | window, big head on left, text chunks one at a time | his portrait, text split on blank lines, tap to go on; optional `action` second button on last line; scrim | live |
| **Quest offer / claim** (QuestOfferPanel) | after dialogue | window | kicker "New Quest" / "Quest Complete", "He hands you now" / "For finishing...", "Your rewards", items + "+N XP to skill", [Accept Quest] / [Claim Rewards], [Not now], "Rewards claimed!" | live |
| **Quest HUD card + coach** (QuestCard, QuestCoach, QuestStepNudge, QuestBannerLayer, guideArrow) | automatic with first steps; QuestCard in HUD | HUD card + highlight rings + toasts | card "Quest" / "Ready to hand in", "Next: ...", "+N more: look for a gold ! on your map", [Open quest >] (to dashboard quest page); coach rings on controls/Mayor; nudge toast "Next: ..." once per step; big guide arrow | live |
| **Mayor greeting** (MayorGreeting) | once per browser after intro, new character | small talking-head video window over band, no scrim, auto-dismiss ~6 s | caption + voice | live (once) |
| **Town Hall board** | the square's NOTICEBOARD (prompt "Read THE TOWN BOARD"); Town Hall door itself has no button | wide window (800 px max) | header picture; nav chips per heading; tiles by heading: **Quests** (Mayor's Story, Town Quests, Guild Hall), **Explore the Lands** (8 lands), **Dungeons** (Goo Grotto, Great Cave, Foundry Dome, Buried City), **Fight** (The Arena, No man's land, Duels), **Craft & Grow** (Blacksmith, Woodworker, Gem Works, Cookhouse, Feed & Seed, Your Farm, Pets), **Trade & Bank** (General Store, Diego's Shop, Auction House, Bank), **Gambling** (Gambling Den, Ace's Coin Flip), **Town Life** (Saloon, Post Office, Hotel, Lil Bro's Race, Skateboard); badges (quest counts, "Spin ready"); each tile page: what/where/level + Red pin / Blue pin buttons (or one action: "Open Quests", "Ride now"); foot: Leaderboard, World map, shortcuts Codex, Journey | live |
| **Ace's Coin Flip** (AceFlipPanel) | tap Ace (beside Gambling Den; not from door) | window of its own, no room | "Ace / Gambler"; tabs **Gold / Items / Records**; Gold: "Your stake" slider (Max), "Bag N", "Win (45%)" / "Lose (55%)", [Flip for Ng], coin sprite animation, "YOU WON!"/"YOU LOST!"; Items: bag tiles + "All", [Clear], "Double or nothing - N"; Records: Biggest wins / Biggest losses; Close | live (odds 45% player) |
| **Hotel** (hall `hotel`) | Enter | hall card | "You are Well Rested: +N% combat XP for N more", [Rest] / "Rest again", "Full health, stamina and mana, then Well Rested" | live (cap-gated WHEEL_HALL_CAPS; else "Shut for now") |
| **Guild Hall** (hall `guildhall`) | Enter | hall card | rows: "Party", "Skill guilds", "Your clan" / "Clans", "Invite waiting: [tag] name, from X" | live |
| **Clan invite card**, **Threat incoming**, **War banners**, **Achievement banner** | automatic | toast/banner | achievement: "Gladiator - +500 AP" tiered ring, ~3 s, no taps; war banners (active/ended) (unsure details) | live (unsure: threat/war details not read) |
| **Controls tutorial / install hint** | automatic | cards | (first-run) not read in detail | live (unsure) |

##### KNOWLEDGE
| window | opened by | kind | holds | status |
|---|---|---|---|---|
| **World map** (WorldMapOverlay) | tap the minimap box (invisible button), key M; also Town Board foot | full overlay | "Open the world map", "World map (M)", title "BroTown", "You are in {where}", X "Close the map", "North is up", zoom +/-, "Back to you" (target), pinch/drag; labels by zoom (8 lands + levels, stages, gates, camps "camp - Lv N", passes, landmarks, roads); key legend (town/camp/pass/gate/landmark/road/river/quest/bro/monster/ore/tree/fish); pins with "Remove pin" | live |
| **New Monster card** | automatic on a first-of-kind kill | small card (no scrim, only the card takes taps), ANNOUNCE_MS | "NEW MONSTER", picture + name, "Tap to see it in the Codex" -> dashboard Codex on that monster | live |
| **Encyclopedia** (old EncyclopediaPanel) | only `window.__broLegacyUI.encyclopedia()` (utility wheel); no player button found | full window | discovery tabs (monsters, materials, collisions, zones) | DORMANT (replaced by dashboard Codex; unsure whether `__broLegacyUI` has any visible caller) |
| **StatScreenPanel / InfoPanel / KeyboardHintsPanel** | legacy toggles / help | windows | (not read) | legacy-dormant for StatScreen (same `__broLegacyUI`); others unsure |
| **Character picker "CHOOSE YOUR BRO"** (CharacterPicker; BodyInk is in the creator) | automatically by login screen when device has characters; button "Continue" | full window | roster rows (name, LEVEL N, "Played Nh ago", portrait) "N / max", "Options for {name}": "Restart at level 1" ("Keeps the name and the face. Everything earned is gone."), "Remove from this device" (Login Key still brings them back), confirm "Are you sure?" type "yes"; "Playing on another device?" [USE LOGIN KEY]; [Back] | live (pre-world) |
| **Dev-only** | | | EconCard, DevPanel, DevWatch, UsageMeter, DesignGallery, SoundStudio (Test panel) | dev-only |

##### Reaching QA names (states.mjs): daily-rewards, login-spin, fish-weigh, fish-board, near-door, building-townhall(-page/-action), shop-diego, ace-flip, world-map(-pin), nml-ask-tap, trade-request, duel-request, death-card, near-mayor, mayor-dialogue, quest-offer, nml-popup, harvest-*, dev-econ-card. Not captured (no state): Gambling Den window, Auction House, Bank, Cookhouse, Feed&Seed detail, chest reveal, race, dungeon clear (building-* generic covers building cards).

##### Owner's quoted constraints
- "Yes I like your idea of interacting with the building's NPC instead of having the building interiors. Have it open up as backgrounds behind the different buildings menus instead of literally going into a building" (tag 3258). No walking inside.
- "Vendor menus need a more prominent escape icon in the corner" (tag 3522): big 40 px disc X, 44 px press, on every shop window.
- "I hate the blacksmithing menu. I almost want to Delete it and start from scratch. Nobody wants to read a novel to know how it works." (tag 2826): one job per tab, pictures and chips, not sentences.
- 2026-10-28 (Town board): "...a big menu board of all the things to do (dungeon, gambling, arena, woodworking, etc) with a page that describes what each thing does and pin drop you can put on the map... (two pins can be active at once - red pin and blue pin)"; "use better icons for each one" (tag 3779); "it should be classified by 'dungeon' not by 'fight'" (tag 3779).
- "Remove the town hall menu for now. It's too confusing when trying to turn in mayor bro quests. It keeps popping up..." (tag 3899): board moved to the noticeboard.
- "get rid of the vendor pop up button after you tap it because it's staying on even when you're in the vendor marketplace menus" (tag 2617): prompts hide while a window is open.
- "Remove cookhouse fish game" (tag 3481); "Remove the daily quests" (tag 3400).
- "I find the login page with the chest intrusive" (2026-10-06): daily windows never open by themselves (spin wheel excepted: owner 2026-11-05 "a 'free daily spin' you can see the gold amounts on the wheel").
- "I don't want the game to just be reading a bunch of boring menus" (farm bed button, tag 3136).
- "change the player to player trade menu to be like the shopkeeper trade menu where it just attaches to the player bag." (tag 2149).
- NPC talk: "an NPC message window that has a larger picture of him on the left side ... just the text of what he's saying in sequential order chunks. Then a new 'Accept quest' window pops up" (tag 1820); "just the head of Mayor bro" (tag 1828).
- NML ask: "I want the window itself to be small" (2026-10-14), at top, never under thumbs.
- Codex: "Make the new codex entry for monsters as a 'new monster' announcement ... and have it jump to the codex area." (tag 3336).
- CLAUDE.md rules: talking to townsfolk is a tap, never walk-up; computer words say "click" (deskWords); a new window's X takes `data-esc`, a dialogue's button `data-enter`; Lantern Slate: dark slate, brass only for selected/main action, NO blur/frosted backgrounds; players never read "Wheel" (say "BroTown", "World map"); "Remains" not "remnants"; every screen plays the upright layout (band at the bottom); new screens go in `states.mjs` + UI-DESIGN-NOTES; touch controls `touch-action: manipulation`; closing on pointerup calls `swallowTapClick(e)`; server is authority for all economy (client popups are predictions); a dormant system is the owner's question before building on it.


## A5. Social, system, settings and owner tools today

#### Inventory D: social, system, settings, dev menus (read-only, from code at 2026-11-28)

Frame facts (code): `?ui2` frame is ON by default under the one band (ui2Frame.js; `?ui2=0` = old More grid). Closed row = Gear + Menu. Menu root = 8 doors (MENU_DESTS, dashDests.js): Bro(P) Quests(J) Social Ranks(U) Codex(K) Homestead Map(M) Settings. Hubs: Social -> Friends / Party(or Clan) / Guilds. Settings hub -> Settings / Notifications / Account / Feedback / About. Taps below count from plain play: Menu button = 1.
Keys (deskKeys.js): I Gear, P Bro, J Quests, L Life Skills, K Codex, O More/Menu, U Ranks, M Map, Z ride; C chat, B emotes, H hide controls strip, Esc = a window's data-esc, Enter = data-enter. Computer-only.

##### TALK
| window | opened by (taps) | kind | holds | status |
|---|---|---|---|---|
| Chat box (ChatBubble.jsx; composer + ChatChannelChips) | phone: tap your own bro (1); computer: also used with the smiley | small card over bro (phone: high box w/ tail) | textarea "Say something..."; lane chips All / Area / Whisper (+ "who?" name field) / Party (only in a party; cap-gated); mic button (only where speech-to-text exists); smiley "Emotes" (B) -> EmotePanel; no Send button on phone (keyboard send closes it) | live |
| Chat bar (panels/ChatPanel.jsx, legacy composer) | computer: C (1) | HUD bar near top | X (Esc), input "Click to type...", lane chips, Send | live on computer (unsure if ChatBubble also shows there) |
| Speech bubble | automatic on a sent line | toast over head | white bubble/black text, 5 s; whispers draw none | live |
| World Chat feed (WorldChatFeed.jsx) | automatic, bottom-left over the stick; shut by default, shown via Notifications > "Show on screen" | HUD strip | last 40 lines, newest bottom, not scrollable; one tap folds it | live (off by default) |
| Emotes (EmotePanel.jsx) | chat smiley (2) or B (1) | small card | header "Emotes" + X; tabs "Moves" (Wave, Laugh, Flex, Shrug, Facepalm, Cheer; holds Sit, Sleep, Flop, Bro Bounce, Robot, Sprinkler, + Zombie Shuffle in Halloween week) and "Emoji & lines" (30 emoji + 12 quick lines). Slash: /wave /sit /dance /roll /flip. Tab choice kept (bt_emote_tab) | live (cap `emotes`/moves gated) |

##### PEOPLE
| window | opened by | kind | holds | status |
|---|---|---|---|---|
| Social > Friends (dash/SocialPanel.jsx) | Menu > Social > Friends (3); old: More > Social | dashboard page | header "N online"; "Add Friend" (explains: tap a player to view profile; no add-by-name) + "Share Invite Link"; blocked-players toggle "Blocked (N)"; tabs "Friends (N)" / "Requests (N)"; "Search friends"; row: status ring, name, Lv, zone/last seen, unread, ••• menu = Profile / Message / Invite / Remove / Block; inline message thread w/ "Send"; Requests rows Accept / Decline / pending | live (cap `friends`) |
| Party page "Clan" tile (dash/ClanPanel.jsx) | Menu > Social > Party (3) | dashboard page | party-now view: tag/alliance line, party size, how-to text, brass "Invite a player" -> player list. If kill switch `clanparty` off: clan view: member list (max 10) + "Make a clan"/open-window button -> legacy ClanPanel | live (party mode); clan mode dormant (unsure) |
| Guilds (dash/GuildPanel.jsx) | Menu > Social > Guilds (3) | dashboard page | "Skill guilds", one row per life-skill guild: icon, name, rank title, Lv; button "Titles and guild quests" -> legacy GuildPanel window | live |
| Guild window (panels/GuildPanel.jsx) | button above; Guild Hall door | window | titles + guild quests (not read in detail) | live (unsure of contents) |
| Party chip + list (PartyHUD.jsx) | automatic when in a party; tap chip | HUD chip (top-left), opens list | chip "3/4" + health pips; list: names, Lv, HP bars, leader crown, offline/away, "+N more", fold (^), Leave party (two taps), leader Kick (two taps "Kick?") | live |
| Party Invite card | automatic on invite | small card top-centre | "<name> invites you (n in party)", Join / Decline | live |
| Player list (PlayerListPanel.jsx) | Saloon "Invite a player"/Sheriff "Duel a player"/Party page button | small list top-left | icon + name (+ "N Hemi Bros"), tap row -> player card; X/Esc | live (no direct button on play screen) |
| Player card (InspectPlayerPanel.jsx) | tap another player in the world (1); in No man's land a tap opens the "Attack <name>?" window instead | small card | portrait (magnifier door -> Inspect card/PlayerProfilePanel), name, "LV n", Friend/In party badge; tiles Invite to Party, Trade, Add Friend (tap to remove if friend), Duel; Invite to [tag] (clan, unsure live); Threat (code present; docs say removed, unsure); Mute, Block, Report (reason chips Spam / Abuse / Harassment / Cheating, Cancel). NO Whisper button (whisper is a chat lane) | live |
| Inspect/profile page (PlayerProfilePanel.jsx) | magnifier on card; also Ranks row tap opens "<name>'s Bro" (Character page) | window | name + Hemi Bro check, LV, AP, Hemi Bro count, quests, title, clan tag, Melee/Bow/Magic levels, equipment icons, Lifetime Kills, rarest achievement, Homestead, Pet, Codex, Leaderboard button; dock Invite / Trade / Duel (none on self) | live |
| "Attack <name>?" window (NmlAskCard) | tap a player in No man's land | small card | Attack / Party / Trade / Ignore | live |
| Duel Challenge (DuelRequestPanel) | automatic | small centred card | "<name> challenges you!", rules line, Accept / Decline (backdrop does nothing) | live |
| Incoming Trade + Trade drawer (IncomingTradePanel, TradeWindowPanel) | automatic / player card Trade | drawer on bag | "Open trade"/"Decline"; live trade: piles, +/- , gold ladder, ready, Confirm screen, receipt (economy lane owns detail) | live |
| Clan invite card (ClanInviteCard) | automatic | small card | "Clan invite", Accept / "Not now" | dormant-ish (clans = parties; unsure) |
| Ranks / Leaderboards (dash/LeaderboardPanel, RanksLanding, RankStandings) | U (1) or Menu > Ranks (2); Town Hall row | dashboard pages | landing: Combat / Life Skills / Feats doors; group = board doors (Overall, Melee/Sword, Bow, Magic/Staff, Level, Damage + "Points placed" -> 8 stat boards; 10 life skills; Kills, AP, Daily spin, Coin flip, Biggest fish); board = Rank / Player / value list, own row marked "You" + pinned, medals 1-3; tap row -> their Character page. Old (`?ui2=0`): boards list w/ Stats/Records/Skills headings, "Show the total"/"Show Melee, Bow and Magic", "What Power means" | live |
| Legacy panels/LeaderboardPanel, FeedbackPanel, SocialPanel, InfoPanel | only `window.__broLegacyUI`/`_uiPanels` (QA); wheelBus 'social'/'clan' never fires | windows | old tabs Level/Skills/AP/Kills/Dungeons/Gold/Time etc. | dormant (unreachable by players) |

##### SYSTEM
| window | opened by | kind | holds | status |
|---|---|---|---|---|
| Menu root (MenuGrid) | Menu button (1) / O | dashboard page, 4x2 tiles | see frame facts; marks: points glow/count on Bro, ready-quest dot, codex count, requests on Social, unread on Settings | live |
| Settings (dash/SettingsPanel.jsx) | Menu > Settings > Settings (3) | dashboard page, 44 px rows | SEE FULL LIST BELOW | live |
| Notifications (NotificationsPanel) | Menu > Settings > Notifications (3); unread count on Menu/Settings door | dashboard page | blurb; chip "Hide from screen"/"Show on screen" (World Chat feed); lines newest first (lane icon, name, text); empty "Nothing yet..."; footer says how to silence; opening clears unread | live |
| Account (AccountPanel + ui/account/AccountKeyCard + AccountLoginForm) | Menu > Settings > Account (3); Settings "Login Key" row | dashboard page | button "Log out" (or "Switch character" if >1 bro) -> confirm card (Cancel / Switch|Log out); "Your Login Key": 8 numbered words, "Copy Login Key", warning "only way ... no email recovery"; guest tab: "Guest session - no Login Key"; form "Continue a character from another device": field "type your Login Key...", "Log in", preview "Continue as your Lv N character?" Continue/Cancel | live |
| About (AboutPanel) | Menu > Settings > About (3); Settings row | dashboard page | game blurb; "What we keep, and why" (character, scrambled key, device id, crash reports, feedback, reported chat, wallet); "Smoothness reports" row with toggle button "On: turn off"/"Off: turn on"; Rules (5 lines, age 13+); Credits; "Questions or problems? Send feedback" -> Feedback | live |
| Feedback (dash/FeedbackPanel) | Menu > Settings > Feedback (3); Settings row; About link | dashboard page | tabs Submit / Browse. Submit: box "Tell us what's working or broken...", "What kind?" chips (Bug, Balance, Remove, Add, Improve, Praise), "About" chips (Combat, Arena, Guilds, Pets, Crafting, Marketplace, Dungeons, Clans, PvP, Zones, Farm, UI/Controls, Social, Progression), "Send" (Sending.../Sent); footer link private GitHub security report. Browse: Newest / Most liked, up-vote rows, Retry | live |
| Controls tutorial (ControlsTutorial.jsx) | Settings "Controls - replay the tutorial" (4); also first-play | overlay, stepped | "Step n of N": Move, Attack, target/sight line, Shield, Bag, Toolbar, Swipe/Dodge; Back / Next / Done / "Close tutorial" | live |
| Keyboard Controls list (KeyboardHintsPanel: BandKeys / DeskKeysList / strip) | automatic on computers; H hides/shows | HUD strip/column | groups Move, Fight, Other, Menus; essential rows by default, "More keys"/"Fewer keys"; rows follow gear (Whirl, Trap...) ; fold button | live, mouse devices only |
| Install hint (InstallHint.jsx) | auto ~8 s after world on iPhone/iPad Safari browser; Settings "Play full screen - hide the browser bar" | small card | share-glyph drawn + steps; dismissed once (bt_a2hs_hint_done) | live (iOS Safari non-standalone only) |
| Info popup (InfoPopup, infoGlossary.js) | tap a stat/info (i) on Bro/Shared/stat pages | small popup | title, body, note, stat; "Got it"/Close; stat-spend variant: -/+ points, "Spend n points", "At its cap" | live |
| Legacy InfoPanel (panels/InfoPanel.jsx) | no opener (setShowInfo true never called; hidden toolbar removed tag 4672) | window | "N online", build line, Mute/Unmute, Hemi Bro verify ("Verify my Hemi Bros"), Close | dormant |
| Top-bar LOGOUT pill (ZoneHeader) | always on play screen (1) | pill | "LOGOUT" -> confirm | live; also "TEST MODE" chip (owner test mode), XP bar, daily spin, gold |
| Login door (LoginScreen.jsx) | every load | full screen | logo, Continue, Create Character, "Your Login Key lets you access your character on any device.", tagline, version/build; "This device is full" card | live |
| Choose your bro (CharacterPicker) | Continue | full screen list | "CHOOSE YOUR BRO", n/10, rows (portrait, name, LEVEL, Played ago); ••• = Restart at level 1 / Remove from this device / Cancel (type "yes" to confirm); "USE LOGIN KEY" | live |
| Name + creator (NameModal.jsx, PlayerPaint, DesignGallery) | Create Character | full screen | tabs Bro type, Hair, Hats, Skin, Eyes, Eyewear, Beard, Shirt, Pants, Shoes, Build; BRO NAME field + random; Randomize Bro, Reset, Enter BroTown, Back; paint editor + Design Gallery (APPLY designs, no save) | live (pre-game; other lane may own) |
| Restart Character confirm | Settings row "Restart character" | in-panel confirm | "Restart Character?" Keep playing / Restart at Lv 1 (states Connecting/Restarting/offline/refused) | live |
| Update banner (UpdateBanner) | automatic when tab runs old build | banner under top bar | stale-build notice | live |
| Toasts/banners | automatic: AchievementBanner, StoreToast, WarBanner, QuestBanner, XpFly, LevelUpBurst | toast | not detailed (other lanes) | live |

###### Settings: FULL list (SettingsPanel.jsx, in order)
1. Audio (toggle on/off; localStorage brotown_audio_off)
2. Music (slider 0-100%, step 5; disabled when Audio off)
3. Effects (slider 0-100%)
4. [dev mode only `?dev=1`] "Debug overlay (D)" toggle + line "Tap the floating D button..."
5. Quest path (chips Footprints / Arrows / Ribbon / Beads / Off) - HIDDEN unless `?questpath` (road on ground put away tag 2992)
6. Landscape menu side (chips Auto / Left / Right)
7. "Notifications - silence all of them" (row, toggles to "SILENCED, tap to turn them back on")
8. "Login Key - save it, or continue a character" (-> Account)
9. "Controls - replay the tutorial"
10. "Play full screen - hide the browser bar" (iOS Safari browser only)
11. "Feedback - message the developers"
12. "About - privacy, rules and credits" (About holds the Smoothness reports toggle)
13. red "Restart character - start over at Level 1" (confirm screen)
No other settings anywhere in the code (no language, graphics or control-skin toggles in UI; those are `?name=` switches, e.g. ?ui2, ?oneband, ?padskin, ?manual, ?onebatch).

##### DEV-ONLY / OWNER-ONLY
| window | opened by | kind | holds | status |
|---|---|---|---|---|
| Test panel (DevPanel.jsx) | 1.2 s press-and-hold on the top-bar centre (old zone-name spot) | full window | needs the owner's ADMIN_KEY for all actions ("Admin key" box, "Remember on this device"). Sections: This worker (caps, keyless), Speed test, Loading times, Sound studio, Side column (old layout), Controls two sticks/two buttons, Admin key, Character (kit, grants, Pets Golden/Big), Achievements, Rare fish, Test mode, Sparring (PvP practice), Key, Resources, Memory savers, Message diet, Expo Wi-Fi, Live flags (+SetSwitchRow), Player logins, Player AP, Bot flags, Hidden settings, Chat reports (Kick/Freeze/Unfreeze/Dismiss, SilenceButtons, RenameRow), ReportTable, UsageMeter, EconCard, DevWatch (PlayerDrawings, AccuracyDays), FeedbackOwnerRows | owner-only (visible to anyone who holds 1.2 s, but inert without key) |
| EconCard | inside Test panel button | box in panel | per-day gold/items made vs destroyed, room row, five economy numbers | owner-only |
| DevWatch | inside Test panel | boxes | "Player drawings" (Mark all seen, Remove drawings two-tap), accuracy per day | owner-only |
| Sound Studio (SoundStudio.jsx) | Test panel > Sound studio, or `?sounds` | full window | tabs "All sounds", "Heard just now", "Music"; sections by moment, play buttons, sample chips, search | dev/owner |
| DesignGallery | paint editor (creator) | second window | tattoo designs, APPLY only | live (player-facing, creator) |
| UI kit page (ui/kit/UiKitPage.jsx) | `?uikit=1` | page over game | every kit piece + two samples | behind flag |
| DebugOverlay + BuildBadge | `?dev=1` | overlay chips | D button, version badge, FPS | behind flag |
| Version text | login door (v<game> . sha, "Built <time>"), creator ("v<game>") | text | - | live |

##### Other src/ui/panels not above (one line each)
Combat/touch HUD: AbilityButtons, SpecialButton, ShieldButton, SprintButton, JumpButton, RideButton, TrapButton, ChargeButton, QuickEatButton, ContextButton, TouchControls, WeaponPill, controlSkin/PadHousings/padSpot/padTier/thumbSpot. Other lanes (named only): InventoryPanel, SkillsPanel, StatScreenPanel, EncyclopediaPanel, QuestPanel, QuestOfferPanel, QuestBannerLayer, NpcDialogue, ShopkeeperPanel, AceFlipPanel, FurniturePanel, PetHousePanel, DungeonCreatorPanel, FishWeighCard, NewMonsterCard, TrapCatchCard, ThreatIncomingPanel, buildings/ (Smithy, Woodwork, GemWorks, Cook, Farm, Store, Vendor, Bank, LandOffice, Exchange, Gamble, Arena PartyPanel, WheelHallPanel/Saloon). Legacy: TradePanel (old trade). Creator: BodyInk, PlayerPaint, paintTools. Test-panel parts: ReportTable, UsageMeter, SetSwitchRow, RenameRow, SilenceButtons.

##### Owner's quoted constraints (quote, date where known)
- "Instead of having a send button at all, just remove it." (chat, tag 2896). Do not add Send on phone.
- Chat/emote: no always-on button; chat opens by tapping your bro (tag 1283; emotes live in the chat box, tag 3391).
- "A mute switch is worth less than being able to walk." Nothing over the bottom-left (movement stick); silence lives in Settings (tag 2147).
- Bell moved: "The notification bell could also move to More, retaining an unread badge" (tag 4172).
- "More: map, social features, settings, account, character switching" (tag 4172); "Switch character / logout: More -> Account".
- "I want to consolidate the dashboard area as much as possible (limit lots of buttons...)" (tag 4172); Leaderboards got own button 2026-11-09.
- Menu: "Keep the four-by-two layout. Enlarge the icons by approximately 25%, reduce the bevels and shadows, same typography" (2026-11-26); "without increasing the dashboard height".
- Ranks: "Actual leaderboard categories must come from implemented rankings" (master spec part 7, 2026-11-25); rows 1-3 same surface, medal only (2026-11-26); "Leaderboards menu cuts off headers" (2026-11-28).
- Player card: "least amount of time to make the other player understand..." ; "party should be moved to the top part of the modal" (tag 1743); keep corner brackets and diamond dividers (owner drew them); remove Threat ("remove the option to kill other players for now", tag 1917); "Do not turn this into a giant character-stat screen"; Report takes two taps.
- Trade: drawer on the bag, no backdrop; "boxes within boxes" rejected; own pile on LEFT/bottom.
- Duel card backdrop must do nothing (tag 2289).
- Party: "is partying unobtrusive right now?" -> folded chip (tag 3768).
- Login door: owner's painted art, not web-form buttons; "Player should need to tap continue or create a character" (tag 2447); "I like CHOOSE YOUR BRO here"; no delete/create in picker; 8 short words key; top-left pill says LOGOUT (2026-11-04).
- Keys: "put the letter next to the icon... in a tasteful way" (tag 3407); controls list: "just essential commands should stay listed" (tag 4198).
- Settings choices show as chips with every value visible, never a dropdown; no debug switch for players; no Quest path row while road is hidden.
- Feedback: security holes to GitHub privately, footer only, box first (2026-11-17).
- Clans: "skip clans altogether and just go from party to alliances" (tag 3321).
- Players never read "Wheel" (use BroTown/world map); "tap" reads "click" on computers (deskWords); a window's X takes data-esc; touch controls need 44 px.
- Never ask the owner to run terminal commands (CLAUDE.md).


## A6. The review's list of screens (the cross-check)

#### inv-F: states.mjs master list (tools/qa/ui-review/states.mjs, 2374 lines, ~150 states)
Legend: bus(open X) = `window.__broDashPanelBus.open(X)`; go(push Y) = `.go({type:'push',id:Y})`; probe = a `window.__bt*` handle. Views: portrait, landscape (sideways phone), tablet, desktop; all unless noted.

##### Before the game (pre: true, run before enterWorld)
login-door | The login door (create / Login Key) | wait for [data-tut=login-create] | pre-world
creator | Character creator (Trait Picker, name, ENTER BRO TOWN) | click login-create | pre-world
creator-tab-{species(Bro type),hair,hat,skin,eyes,eyewear,beard,shirt,pants,shoes} | creator tabs, 10 variants folded | click button.bt-cc-tab | pre-world
creator-paint | Drawing editor (tattoo from Skin tab; also Shirt/Pants) | Skin tab, then .bt-cc-ink button | pre-world
creator-paint-designs | Pants editor, two Flame designs placed | Pants tab > ink > Draw > Designs button x2 | pre-world

##### Arriving / HUD (the world, nothing open)
welcome | Welcome plate + Skip tutorial | wait [data-quest-banner=welcome]; after: clicks "skip tutorial" | first seconds only
hud | "BroTown, nothing open" (top bar, minimap, folded band) | none | the baseline screen
charhud / charhud-side / charhud-desk | Character HUD top left (face, name, Lv, weapon XP bar) | none | portrait / landscape / desktop variants (UI3 PR2; ?hud=0 off)
hudart / hudart-side | same HUD in owner's pictures (steel ring, gold badge) | none | ?hudart=0 old
topbar-gold | Top bar gold between logo and daily spin | none | ?topgold=0 off
hud-pvp | Minimap plate: "No man's land 1" | window.__btPlaceHold={nml:1} | staged, dev hold
nml-popup | Plate's window (No man's land rules, Bank hint) | PlaceHold + click [data-plate-tap] | staged
hud-outlaw | Minimap plate "Outlaw - 18 min" | PlaceHold {red:18} | staged
hud-band | Dashboard band unfolded (bag, equipped, skills) | unfoldBand: tap [data-dash-fold]/[data-land-fold] | 
hud-folded | Dashboard closed to button row | foldBand | 
hud-controls | Movement stick / contextual button in use | real CDP touch held on left half | portrait, landscape, tablet only
hud-weapons | Weapon pill (sword/bow/staff, bow in hand) | writes R.rangedWeapon/staffWeapon/activeSlot on page state | staged
near-mayor | Near Mayor Bro (! badge, name plates) | sets player x/y next to NPC | world state
guide-arrow | Big gold arrow after first weapon quest | waits [data-guide-arrow] | needs sword+shield unworn

##### Talking (from the world: a townsperson)
mayor-dialogue | NPC dialogue (portrait, lines, Next) | H.approachNpc / talkToNpc (tap on NPC) | keep
quest-offer | Quest offer (rewards, Accept) | H.advanceNpcDialogue | keep, [.bt-qoffer]
quest-accepted | QUEST ACCEPTED banner + pinned objective | H.confirmQuestOffer | automatic banner

##### Dashboard frame (new dashboard, ui2): band closed / Menu / Gear
dash-frame-closed | Closed band: slim row Gear + Menu | fold chip | 
dash (id 'more') -> dash-more | Menu root: 8 tiles (Bro, Quests, Social, Ranks, Codex, Homestead, Map, Settings) | bus(open more) | "More" under ?ui2=0
dash-frame-gear | Gear root under the one header | bus Gear | 
dash-frame-social | Social hub (Friends, Party/Clan, Guilds) | bus open more; go push socialHub |
dash-frame-settings | Settings hub (6 tiles: Settings, Notifications, Account, Feedback, About, Journey) | push settingsHub |
dash-frame-homestead | Homestead page (farm picture) | push homestead |

##### Character: Bro
dash-bro | Bro Overview (old 3-page Bro card; ?bropages) | __btHeroSection.request('Card'), bus open hero, __btBroCard.to overview | pre-UI3 page
dash-bro-combat | Bro: Combat stats (13 stats) | tap [data-bro-details] |
dash-bro-bow | Combat on the Bow | tap [data-bro-skill=bow] |
dash-bro-progress | Progress page (counters, door tiles) | tap [data-bro-progress] |
dash-bro-equipment | Equipment window (reached by name only) | request('Overview') | window, no button opens it
dash-bro-points | Points window (spend skill points) | tap [data-section=Build] | window over card
dash-bro-skills (dash 'skills') | Life Skills page under Bro | bus(open skills) | old-style page
dash-bro-skill-detail | A life skill's "How it works" | tap [data-life-how]/clickText mining |
ui2-bro-landing | Bro: one page, six doors and the strip (UI3 Bro) | open more; push hero |
ui4-bro | Bro with the three weapons first (V17) | push hero |
v17wide-bro | Open band 840 wide (computer/tablet) | push hero | desktop only
ui2-bro-character | Another player's Character | push broCharacter {who} | reached from Ranks (step 9, not yet wired)
ui2-bro-titles | Titles | push broTitles |
ui2-bro-equipment | Equipment showcase (figure, 9 cells, Manage Gear) | push hero,broEquip |
ui2-life-landing / ui2-life-skill (Fishing) / ui2-life-unlocks | Life Skills under new dashboard: total+ten, a skill, All unlocks | bus open skills; tap [data-life-door=fishing], [data-life-all] | 3 states
dash-pets-companion / owned / one / release / all | Pets: companion, Owned grid, one pet, Release confirm, All journal | devOp trapping seeds pets; bus open pets; push petsOwned/petsOne/petsAll | 5 states, dev lever
(more-pets) | Pets, empty landing | more(pets) |

##### Combat (weapon pages)
ui2-bro-combat | Combat hub | push hero,broCombat |
ui2-combat-weapon | Weapon page (Sword; one template for Bow/Staff) | push broSword |
ui2-combat-tree / tree-deep | Stat tree: Sword DPS first layer / deeper (Hit base) | push chain, taps |
ui2-combat-shared | Shared Attributes | push broShared |
ui4-combat-hub / weapon / shared | same three with V17 look (upgrades first) | push chain | ?v17combat default on

##### Items and gear
dash-bag | The bag (band at rest / dashboard column sideways) | openBag: unfold band | 
item-card | An item card (sell flow) | window._itemDetailBus.open |
gear-tab | The Gear tab (band) | openGear | 
gear-slot-selected / gear-compare / gear-more / gear-material / gear-filter-open / gear-filter-empty | Gear tab variants: slot tap, weapon compare, "..." menu, material, filter menu, empty filter | tapSel [data-gear-cell], [data-bag-key], [data-gear-filter]; __btGearTab.bus.pickFilter | devOp kit weapons (gearKit)
dash-item-page | The one item page (Details of worn sword) | tap [data-gear-cell=sword] then [data-gear-details] |
dash-gear-panels / look-bag / look-worn / look-thing | Gear two panels (Inventory left, Equipped right) + three "look" states | bus go rest; tap bag cell/worn cell/material | UI2-gear
fish-weigh | Fish weigh-in card | devOp fish give albino trout; tap bag, [data-fish-inspect] | dev lever
bag-unrevealed | Mystery piece in bag (Reveal) | devOp revealbag; tap [data-unrevealed] | dev lever
dash-codex-loot / dash-codex-item | Codex monster's Loot / drop's item page (read-only) | push codexMonster/codexLoot; tap [data-cx-drop] | devOp codex

##### Quests
ui2-quest-landing | Quests: your quests as rows | bus(open quests) |
ui2-quest-page | A quest's journey page | click [data-quest-row] |
ui2-quest-rewards | A quest's Rewards | tap [data-quest-door=rewards] |
ui2-quest-road | Quest page opened from the world | window.__btQuestDetail.open(qid) | probe
building-townhall* (see Buildings) | Town Board lists town quests |

##### Codex
dash-encyclopedia | Codex (kinds row; Monsters chosen) | bus(open encyclopedia) |
dash-codex-monster | Codex: a monster | devOp codex; clickText snowman/slime/... |

##### Ranks / Feats / Journey
ui2-ranks-landing / group / board / spin / points | Ranks: groups, Combat boards, Woodcutting board, Daily spin, Points placed | bus open leaderboard; tap [data-rank-tile] | 5 states
fish-board | Leaderboards: Biggest fish | rank tiles + [data-rank-fish=trout] |
dash-bro-achievements | Feats landing (old: Achievements) | devOp achv; bus open achievements |
ui2-feats-tiers / gallery / medal / ap / quests | Feats: medals by tier, a tier's badges, one medal, AP sources, Quest History | busGo push featsMedals/featsCommon/featsMedal/featsAp0/featsQuests | 5 states
more-journey | Journey (kills, deaths, gold, XP) | more() push journey |

##### Map and chat
world-map | World map | window.__btWorldMapOpen(true) | probe
world-map-pin | World map with two pins | __btMapPin.set |
map-pin-replace | "Replace which pin?" | tap map canvas with 2 pins set |
map-pin-arrive | "You reached a pin" card | __btMapPin.open('arrive') | automatic on arrival
map-pin-remove | Remove a pin (from the minimap) | __btMapPin.open('remove') |
chat | Chat box (phone: tap own bro; computer: C bar) | chatBubbleBus / key | per device

##### Social / other players
more-social | Social (friends, messages) | more() push social |
player-list | Player list | __broLegacyUI.playersOpen() | legacy UI probe
player-card | Another player's card | devOp spar add clone; tap it |
nml-ask-tap | Tap on a player in No man's land | __btNmlAsk.hold |
party-hud / party-hud-open | Party chip folded / list open | partyStub (_uiPanels.party stand-in) | staged
inspect-self | Inspect card (your own) | (unsure: probe) |
trade-request | Trade invite drawer over bag | _uiPanels.trade2({invite}) | automatic (incoming), staged
duel-request | Duel challenge Accept/Decline | _uiPanels.duelRequest | automatic (incoming), staged

##### Buildings (BroTown; opened by its door's Enter button, here by __btBuildingWindow.open(id))
near-door | At a building's door (Enter button) | walk to door via __btWheelTownDoors | world trigger
building-forge | Blacksmith | 
building-woodwork | Woodworker |
building-gemcut / enchant | Gem Works: Cut gems tab / Set gems tab | (gemcut: devOp kit shards+gems) |
building-cook | Cookhouse |
building-gamble | Gambling Den |
daily-rewards | Daily rewards | __btDailyRewards.open('today') | probe
login-spin | Free daily spin (login wheel) | __btLoginSpinBus.open() | also auto at login (unsure)
building-farm / farmhome | Feed & Seed / Land Office |
building-bank | Bank vault |
building-exchange | General Store (market, order book) |
building-auctionhouse | Auction House |
building-party | Saloon | building-post | Post Office | building-sheriff | Sheriff's Office | building-guildhall | Guild Hall
building-townhall / -page / -action | Town Board, a page, a page with one action | open('townhall') | on the square's noticeboard (not the Town Hall door)
building-hotel | Hotel (free rest) | building-arena | Gladiator Arena (from Sheriff)
shop-diego | Diego's shop (NPC, outside General Store) | __broShopBus.setOpen | NPC tap
ace-flip | Ace's coin flip (NPC, outside Gambling Den) | __btAceFlipBus.setOpen | NPC tap

##### Making / harvesting
harvest-near | At a tree with an axe (name, right button) | nearestNode + standAt |
harvest-windup / harvest-ready | Chopping: hits land / the gesture | chop in progress | keep
(forge/cook/gem/woodwork are under Buildings)

##### Fighting
spar-fight | A fight vs sparring clone | devOp spar; armForFight; sparCloneId |
lock-reticle | Locked-on monster | | (unsure how: a lock tap)
pad-controller | The controller shell on the band | | portrait, landscape
two-buttons / -sighted / -reach / -hold / ctx-tree / ctx-talk | Two-button controls variants (nothing, monster in sight, in reach, Attack held, CHOP under tree, talk pill) | staged | portrait, landscape; needs ?manual=5 (unsure)
death-card | "You died" card, 5 s countdown | stages S._deathCard | automatic, no tap

##### System / settings (under Menu)
more-settings | Settings (sound, graphics, controls) | more(): bus open more; bus push settings |
more-account | Account (Log out, Login Key) | push account |
more-notifications | Notifications (world chat/news, bell) | push notifications |
more-about | About & privacy | more-feedback | Feedback
lazy-cantopen | "Couldn't open this" card (window failed to load) | open more; push settings, with load blocked | staged fault

##### Dev (owner's Test panel; opened by long-press on the top-bar title; admin key)
dev-econ-card | owner's economy card | dev-usage-meter | usage meter | dev-set-switch | Test panel sets a switch | dev-rename | rename a character | dev-feedback-owner | feedback board with Show newest posts | all DEV ONLY (H.ADMIN_KEY)
ui2-kit | New dashboard kit page | goto ?uikit=1 | dev only
ui4-kit-{roles,tab,stepper,inspect,compare,overlay,leveltile,strip} | kit plates | ?uikit=1 | dev only, 8 states
ui4-look-before | kit roles pre-V17 | ?uikit=1&v17look=0 | dev only

#### 2. Counts (approximate; my judgement of "distinct window/panel")
Distinct windows/pages/panels: about 82 player-facing (excluding creator-tab variants, gear/combat/pet/feats sub-state variants, dev, kit):
- Opened from a button on the play screen (dashboard band/Menu/HUD/top bar/chat/minimap/map): ~46 (Gear, bag, Menu, Bro and its 7 subpages [Combat hub, Weapon, Shared, Equipment, Titles, Points, Life Skills +skill, Progress], Quests +quest page/rewards, Codex +monster/loot, Ranks (+boards), Feats (+4), Journey, Social, Pets (+4), Settings, Account, Notifications, About, Feedback, Homestead, World map, Chat, Player list, minimap plate window, item page, item card, weigh-in card)
- Opened from the world (townsperson or building, ~27): 18 building windows (forge, woodwork, gemcut, enchant, cook, gamble, farm, farmhome, bank, exchange, auctionhouse, party/Saloon, post, sheriff, guildhall, townhall, hotel, arena), daily rewards/login spin, Diego, Ace, Mayor dialogue, quest offer, player card, map pin cards
- Automatic (~9): welcome plate, quest-accepted banner, guide arrow, death card, trade invite, duel challenge, map-pin arrive, No man's land plate/outlaw states, mystery-piece Reveal (needs tap) (unsure)
- Pre-world (2): login door, creator (+ drawing editor).
- Dev only: 5 Test panel states + 10 kit states.
(Counts unsure: the states file does not mark the opener, derived from run() scripts and notes.)

#### 3. UI-DESIGN-NOTES.md headings vs states
Headings with NO state (names only): How to read these notes; The short version; The look: Lantern Slate; Phone first..; The login wheel (partly: login-spin); Your portrait: a Hemi Bro (retired, ?hemiface=1); The quest log (old page, ?ui2=0); Townsfolk, quest badges and keepers (partly near-mayor); Harvesting (partial); The controller/two-button (partial); Dying (death-card exists, so covered); Test panel sections (Test panel keeps its key; silences from a chat report; usage meter exists); Feed & Seed layout, key caps, farm exit; Splash tagline; Gear tab: a pick is a menu; First-time teaching on a computer; Manual combat draws nothing; Readiness on the weapon (sword feel); Bro: one page / Bro under new dashboard six doors (covered by ui2-bro-landing); A computer's open band (v17wide-bro); Combat stat tree (covered); The Monster Codex (covered); Rare fish (covered); A window that could not open (covered); "A mystery piece" (covered); Building doors (near-door); Building windows: the room behind the menu (covered in building()); The usage meter covered; Your party on the screen (party-hud covered); The map pins' cards (covered).
Genuinely uncovered in states.mjs (unsure, based on names): Test panel keeps its key; silences from a chat report; Feed & Seed layout/farm exit; Splash tagline; First-time teaching on a computer; Gear tab "a pick is a menu"; Manual combat draws nothing; Readiness on the weapon; the Hemi portrait; the login wheel beyond login-spin; the quest log old page; Achievements old page (dash-bro-achievements shows Feats instead); Bank/Market sub-states; farm itself (the Feed & Seed only opens the shop, not the farm view).
States with no matching heading (by name): ui2-kit, ui4-kit-*, ui4-look-before ("The new dashboard kit" + "The kit's roles" headings exist, so these are covered); dash-frame-* (Dashboard frame; heading "The dashboard: band, five buttons and pages" is the old frame, no heading for the Menu hub/Closed band (unsure)); hud-weapons (weapon pill: no own heading, under HUD (unsure)); pad-controller (heading "The controller"); creator-paint-designs (under creator); lazy-cantopen ("A window that could not open" yes).


## A7. What the design documents said before this one

#### inv-E: digest of the menu design docs (read-only lane, 2026-11-28)

NOTE ON NAMES: "V17" is NOT docs/design/UI_MASTER_SPEC.md (that is the owner's 2026-11-25 baseline, "MS"). V17 is the owner's
2026-11-27 handoff, docs/design/v17/MASTER-IMPLEMENTATION.md (172 lines; cited "V17:N"). V17 is the later word; MS 2026-11-25 < FB 2026-11-26 < V17 2026-11-27.
Standing rule (owner 2026-11-25): "Yeah my game content over the mockup stuff" (then "Keep*"): the game's own names/numbers beat any mockup.

##### 1. V17's STRUCTURE (V17 = 2026-11-27)
- Two workspaces, no persistent tab strip: GEAR (default gameplay workspace) and MENU (universal exploration). Closed band = handle + two buttons Gear, Menu.
  Each workspace remembers its own state. Close hides the dashboard without resetting. Menu shortcut on a deep screen goes to the directory root; ordinary Menu entry resumes.
- One contextual header per screen: root = [Close] title [Menu] (Gear root: Close, Gear, Menu>; Menu root: <Gear, Menu, Close); deep = [< Back (names origin)] Title [Menu] [X]. No duplicate global nav.
- Back follows the real journey, restores filter/scroll/selection. (V17:53: siblings REPLACE the route, no history added; MS: Back = actual history: flagged Q12.)
- Contextual entries bypass the directory: HUD portrait -> Bro; minimap -> map; quest tracker -> tracked quest; item -> item page; close returns to actual origin.
- Drill-down motion (owner Q47, MS): selected container EXPANDS into the next screen, contracts back; no horizontal slide (~200-250 ms; reduced-motion honoured).
- V17 DIRECTORY (V17:53), ten tiles, equal weight, stable positions, no group labels, landscape one row:
    row1 Bro | Gear | Quests | Map ; row2 Skills | Achievements | Monsters ; row3 Social | Rankings | Settings.
  (MS had 4x2: Bro, Quests, Social, Ranks, Codex, Homestead, Map, Settings. Homestead dropped in V17; farming links from Skills.)
- BRO (V17:55): Sword / Bow / Staff first (art, level, XP bar, available points), then Character stats (shared) and Pets, then quieter active-weapon damage + health. Held weapon marked apart from a merely worn one. No portrait/name/level banner (HUD carries identity). Combat "consolidated into Bro". (MS had six tiles: Character, Combat, Equipment, Life Skills, Feats, Pets.)
- WEAPON PAGE (V17:55 / FB part 5): upgrades + points FIRST (six attributes Range, Power, Speed, Luck, Special, Element, 3x2 full-width), then level/XP, then actual weapon damage (DPS tap -> stat tree up to seven layers). FB mock: header "< Combat | Sword | Menu", Lv 23, XP 4,393/7,333, 120.5 DPS, summary strip Damage 26-44 / Critical 38% / Speed 2.10/s / Range 2.9, "Attributes: 0 points available", then six cells. Tap an attribute = existing preview (before/after + cost) + explicit Spend; at zero points explanation still opens, no plus.
- SHARED page (V17:55): Health, Defense, Mana, Stamina, Dodge, Move speed, Resistance; upgrades first, current strength below (upright) / to the right (sideways). No effective-health number (owner must define).
- GEAR (V17:57): two panels upright/desktop (bag | worn); source panel stays, opposite panel becomes summary (identity, source, projected whole-character delta beside the eligible action, Details). Nine slots: Sword/Bow/Staff; Torso/Greaves/Cape; Shield/Amulet/Jewel. Empty slot opens exact filter. Full name in Details, quick look 2 lines max, buttons fixed, position kept on return. SIDEWAYS: bag STRIP + "Equipped" switch + horizontal inspection (V17) vs the game's two panels in one row.
- QUESTS: Active / Daily / Completed; detail tabs Now / Steps / Rewards; objective art + action first; no future steps. SKILLS: ten visible, next training action + real level benefit. ACHIEVEMENTS = Feats + titles + records. MONSTERS: collection, discovered drops first, probability + map action. SOCIAL: Friends / Party / Chat siblings. RANKINGS: one grouped selector, aligned scroll rows. SETTINGS: five destinations (Sound & controls, Account, Notifications, Feedback, About). MS had: Social as living network (you centre; Friends, Clan, Party, Nearby circles, label at TOP of circle), Map Geography/Connections, Homestead miniature, Codex illustrated cards, Settings quick-settings first (sound on top).
- Town windows (shop, bank, benches...) = overlays above the band: fixed header+close, scrolling body; landscape ~496-510 wide, portrait modest insets, desktop <= ~600; map/login/creator/drawing are full-screen exceptions. Diego: bag = prepare listing, NO instant gold.
- PER SHAPE: upright 390x844: band 390x243, header 52, page 390x191, inner 378x179. Small 375x667: band 235, header 48, page 187. Landscape 844x390: band 130, header 48, page 82, inner 72: ONE horizontal content row (two stacked 44px controls do not fit); short sibling tabs/points go in spare header width. Desktop 1440x900: band 840x243 centred, header 52, page 191; extra width = MORE entries, not bigger art/text/world. Closed band never changes.

##### 2. BUILT on main vs NOT (card UI4 = first slice; status docs/plan/status/UI4.md)
BUILT (all behind ON-by-default switches, `=0` gives the day before):
- UI2 steps 1-7 (2026-11-25/26): kit, Gear/Menu frame + one header + history, Bro six doors, Combat hub/weapon/shared/stat tree, Gear two panels + item page + comparison, Quests/Ranks/Codex/Life/Feats/Pets, Social/Map/Notify/Home/Settings pages. UI3 (11-26/27): HUD top-left (face, name, Lv, weapon XP bar, art from owner's sheet), three weights, serif->Source Sans 3, Menu 4x2 icons +25%.
- UI4 PR1 kit roles (6840): `intent` prop with nine roles (info, inspect, go, selected, adjust, commit, danger, disabled, slot) one table `src/game/uiRoles.js`; new Tab, Stepper, InspectStat, Comparison, Overlay.
- PR2 look (6841, `?v17look`): V17 colours by role; smallest word 12 where it fits (Bro, Sword page, Shared, stat tree keep 11).
- PR3 fit (6842, `?v17wide`, mp-v17fit): measured table; computer 840 block (only >=1360 px windows). Not built: inner 179 vs 172, keyboard, small-phone 235, camera tolerance.
- PR4 Bro (6843, `?v17bro`): three weapons first + Character stats + Pets, quiet strip of other doors (Equipment, Life Skills, Feats, Journey, AP, Quests, Clan, Guilds) below.
- PR5 combat (6844, `?v17combat`, #2435 ready): upgrades first on weapon page and Shared. PR6 gear (6845, `?v17gear`): Gear KEPT, roles + small rules mended.
NOT BUILT: V17's ten-tile directory (Q3); Skills/Achievements/Monsters renames; Quests Now/Steps/Rewards redesign; buildings/overlays/Diego listings; creator; camera parity gate; effective health; two labels/radar; clan/guild profile; Homestead construction/visits; real-player tests. Card STOPS after PR6 for owner's phone review.

##### 3. OPEN CHOICES of the stopped card (UI4-facts section 7b, UI4.md "Flagged")
(a) Separate Combat menu? V17:86 "Consolidated into Bro" (Bro shows weapons directly). Game: Bro leads with weapons (one tap to a weapon page); Combat hub still reachable by old routes + `?v17bro=0`. Status: owner to say whether the hub stays beside V17's Bro (Q4).
(b) Gear sideways: game's two panels in one row (kept) vs V17's bag strip + Equipped switch. Switch costs a tap, strip shows more bag. 667x375 summary only 122px beside nine cells (listed). Owner chooses; pictures in PR6.
(c) Gear Details "go" vs "inspect": SHIPPED as `go` (the roles table names Details/item-page doors go; Equip commit, Drop danger, Show all adjust). Whether it should read as "inspect" (recessed + #91A9B9 border + chevron) is not listed as a numbered Q (unsure; V17:39-40 sample puts "item inspection"/"Details" under Inspection).
(d) Bro's "quiet strip": strip pages by whole entries on a phone; owner decides whether strip or directory (Q3) holds Equipment, Life Skills, Feats, Journey, AP, Quests, Clan, Guilds.
(e) Shared points Q1: V17+MS say each weapon level = 3 weapon + 3 shared points. Game: shared points come only when the BEST weapon levels (server/src/prog3.js:26-33; owner agreement 2026-10-21 tag 3538). Menu tells game's truth; changing it = worker change, owner's call.
Other questions: Q2 Jewel (V17) vs Gem cell (game; kept). Q3 ten tiles & where Homestead goes. Q4 V17 Bro vs six tiles chosen 11-26. Q5 button colours (V17 gold=commit only, red #753439, no green/blue; game had five light faces). Q6 selected tab (slate+gold underline vs pushed-in). Q7 point cue: gold plus (FB) vs non-gold (V17:20). Q8 quest line top-left removed 11-27 but V17:11 still names tracker tap. Q9 desktop 840 vs 480; inner 179 vs 172. Q10 keyboard subtracted (V17) vs ignored (game). Q11 smallest word 12 vs 11. Q12 Back history vs siblings replace. Q13 words: V17 Health/Move speed/Torso/Greaves/Jewel/Monsters/Rankings vs game Max HP/Speed/Chest/Legs/Gem/Codex/Ranks (game kept). Q14 small phone 235/667=35.2% and camera tolerance (owner's number). Also: F1 EHP formula, F2 other-player full page needs worker, F3 where shop/bank/benches/trade live (windows now), F4 anything changing a rule of play, F5 specialization labels/radar/clan-guild profile. reference/original-feature-inventory.md missing from zip. Diego market rules unresolved.

##### 4. OWNER'S STANDING DECISIONS (exact quotes)
- 2026-11-25 "Yeah my game content over the mockup stuff" ("Keep*").
- 2026-11-25 (MS) "Do not wait for pixel-perfect approval of every menu or restart the questionnaire." / "Flag significant architectural or gameplay conflicts for my review, but independently resolve ordinary visual and implementation decisions."
- 2026-11-25 (MS) Retire the old CLOSE / Gear / Bro / Quests / Codex / More tab strip; "Clarity is the highest priority... hand a phone to a child, give them a specific task".
- 2026-11-25 (MS) "Keep the existing mobile dashboard height... Never hide primary actions behind scrolling or enlarge the dashboard to fit a mockup."
- 2026-11-25 (MS) Bro landing: "Six buttons only under contextual header... Remove the redundant player/tap banner."; Feats replaces Accomplishments. Menu "equal-weight directory... 4x2 if eight retained"; "Do not create unsupported functionality just to fill the grid."
- 2026-11-25 Codex: complete encyclopedia, not discovery-gated; no future quest steps shown; attribute allocation preview must be preserved; inventory explicitly scrolls.
- 2026-11-26 (FB) "the biggest problem with the new BroTown menus is everything is competing for the same level of attention. Almost every piece of information has its own large beveled button, even when it isn't an actionable or particularly important piece of information."
- 2026-11-26 FB: "I'd turn the Bro menu into a unified character management dashboard." / "Titles could live within Feats. Weapon levels would live within Combat. Clan and guild management could link directly into Social."
- 2026-11-26 FB: three styles: Navigation buttons "Raised, beveled, prominent. Reserved for destinations and actions."; Important statistics "Recessed surfaces with large numbers. No heavy beveling."; Supporting information "Flat, aligned within shared containers. No individual heavy borders."
- 2026-11-26 FB Gear: "Actually one of your better layouts. Standardize the inventory and equipment slot styling, shrink their headers, and make the gold balance a compact pill. Preserve the side-by-side structure."
- 2026-11-26 FB Main menu: "Keep the four-by-two layout. Enlarge the icons by approximately 25%, reduce the button bevels and shadows, and use the same typography across all navigation buttons."
- 2026-11-26 FB Combat: "three weapon cards have too much empty space and surprisingly small weapon icons. Make the weapons visually dominant, enlarge the level numbers and only show available points prominently when there are points to spend."
- 2026-11-26 FB Weapon attributes: "Currently the messiest menu. Eliminate the left-side Attributes column, consolidate the combat statistics into one summary strip, and give the six attributes a full-width three-by-two grid."
- 2026-11-26 FB Life Skills: "Enlarge the icons and cards to occupy the unused vertical space. Put level indicators inside the cards instead of having badges protrude from them."
- 2026-11-26 FB Leaderboards: "Reduce the metallic gradients across the first three rows while retaining the gold, silver and bronze medals. Highlight the player's own row regardless of rank."
- 2026-11-26 FB: "I wouldn't overhaul the new combat control panel or change the dashboard dimensions." / "the upper HUD tells you who you are and how you're progressing, while the bottom dashboard lets you manage your character. Those two areas shouldn't unnecessarily repeat each other's information."
- 2026-11-26 FB HUD: portrait top-left, "Always visible and tappable"; "Tapping the portrait should immediately open the character dashboard."; later "Use these art assets for a new compact hud in top left and weapon xp bar"; XP bar follows "Weapon in hand".
- 2026-11-26 (~19:45 UTC) "swap out the typography (font style) on all menus to be same as the 'logout' font" -> Source Sans 3. (~19:35) "the third row gets cut off" (bag in whole rows).
- 2026-11-26 FB palette: "I would keep the navy and gold aesthetic." dashboard base #14232F, navigation #223D53, recessed #0E1D29, borders #4B6275, text #F1F0E9, gold #EAC474.
- 2026-11-27 (10:xx tag 6790) "Leave only character hud in top left corner" (quest line off top-left; quoted in UI4.md Q8 as the 11-27 decision; exact wording from decision log, unsure of time).
- 2026-11-27 (V17 handoff) "Do not compromise readability, available screen space, gameplay visibility or device fairness to accommodate a design. Flag unresolved requirements rather than inventing solutions." / "Some things may be better designed as already in the game like probably the bag menu and character design but maybe not".
- 2026-11-28 02:10 UTC (two tests, UI4 PR5): "Too confusing for first time player and doesn't use visuals first".
- relayed 22:20 UTC (date unsure, ~11-26): "I'd prefer centered" (a label alone in its box centred).
- 2026-11-05 (computer, desktop width): "Simply make the container areas smaller (like they appear on mobile) they don't need a bunch of extra dark space to make them appear wider" (V17 later asks 840 centred).
- 2026-11-28 (this task): "design the menu system from scratch; consolidate as many elements into as few menus as possible while staying coherent".
- CLAUDE.md: owner is only player; "no play caps"; talking to townsfolk is a tap; owner new to coding.
- V17 owner requirements (not dated quotes, owner's handoff 11-27): "Clearly distinguish passive facts, inspectable facts, navigation/preparation, selected controls and commitments"; "Do not make information compete with actions"; "Gold is not a generic primary-navigation color"; "color alone must not communicate meaning"; "Available points deserve a priority cue but not commit-style gold"; "Use explicit semantic role props at component creation".

##### 5. HARD LAWS for any menu design
- Band heights NEVER change: closed 52/48; open 243 (390x844), 235 (375x667), 130 (844x390), 143 (932x430), 257 (430x932); no overlay to dodge the budget; world and camera independent of menu CSS (no zoom-out).
- ONE band at the bottom on every screen incl. computers (src/ui/oneBand.js); desktop band block 840 (V17) / 480 (today). Landscape rests FOLDED; a button opens the page.
- Min tap target 44x44 CSS px (UI-BIBLE 44pt; ONE_BAND_TILE_MIN); primary actions visible WITHOUT scrolling; lists may scroll in bounded areas. Page height after header: 191/187/82; inner content only 172/168/63 (pads 19px, 4px side pad). Landscape: ONE row; never two stacked 44 controls in 63-72 px.
- Nothing tappable in the home-indicator safe area (34 px upright, ~21 sideways); iOS input 16px; keyboard policy open (Q10).
- Text: Source Sans 3; floor 11 px (12 under V17 look where it fits); 10 px only caption/count badge; contrast >= 4.5:1; tabular numerals; no global shrink-to-fit; numbers exact, full names in details.
- Kit-only: build from src/ui/kit + ui2Tokens; missing piece goes INTO the kit (+ ?uikit=1), never styled in a screen; chrome is code (CSS gradients), no baked panel art; no backdrop-filter/blur/filter/mask; no perpetual animation except Godly ring; reduced motion.
- Every new screen: states.mjs entry + UI-DESIGN-NOTES section; `data-esc` on Close X (Esc); `data-enter` on dialogue button; keys in deskKeys.js worn by `data-key`; desktop words say "click" (deskWords()); touch-action: manipulation; swallowTapClick when a control closes on pointerup; overlays position:fixed use fixedBox(layer); layout reads only via winVw/playVw/beforeDraw/ResizeObserver.
- Fight controls: menus are in the band, below the world; the world view and joystick/attack discs stay uncovered; critical confirmations may block, ordinary notifications may not; no modal may trigger combat/movement.
- Words: "BroTown" (never "Wheel"), "World map", "Remains" (never "remnants"). Game's own words win: Max HP, Speed, Chest, Legs, Gem, Codex, Ranks; rarity Normal/Rare/Elite/Godly (never common/epic/legendary) with 1-4 stars as non-colour cue; achievements Common/Rare/Arena/Super-rare. Weapons: Sword, Bow, Staff. "Attack speed"/"Move speed" where "Speed" is ambiguous.
- Server authoritative; no invented mechanics/numbers (no EHP); unsupported planned features get an honest "not in the game yet"; disabled action keeps place + visible reason; no future quest steps; one weapon's points never spent on another; confirm only consequential/irreversible actions.
- Memory/perf: art 256-colour, freed on leave; no per-frame work; every visible change has an ON-default `?name=0` switch; CLAUDE.md demo rule.
- Colour never the sole signal (stars, signed text, underline for selected).

##### 6. THE LOOK (LANTERN-SLATE-SPEC tag 1240 base; superseded in the new dashboard by the kit's blue-slate, owner palette 11-26 and V17 roles)
Lantern Slate base tokens: band top/mid/bottom #253239 / #202C32 / #172126; panel-strong #182227; raised #2B3940 (high #34444B); well #121B20; well-soft #19252A; slot occupied #243137; toolbar #10181D; dashboard tray #2E4754, panel/well #10222A, ribbon #10232A, button #1A2D36 (active #162A33); text-1 #F7F2E7, text-2 #B9C1BF, text-3 #96A2A0, disabled #687575, dashboard text #F2F3EF/#DDE3E1; border rgba(238,242,235,.14) (strong .24, divider .10); accent brass #D8A85F (pressed #B88643, fill #3B3427), focus ring #F0C878, text-on-accent #20170D; invert (other party's light card) #C8D2CF; semantic HP #D95C54, Mana #4D86D5, Stamina #D8A94D, XP #61B06B, Positive #59BF91, Info #5D93D2, Magic #9A76D3.
CURRENT KIT PALETTE (UI_MASTER_SPEC_NOTES section 4, game.css): band #26383E/#20333A/#1A292F; sheet #1E2E34; raised #293B41 (high #32454C); well #111E23 (soft #16262C; deep #0B161B); slot #24363C; toolbar #0E191E; brass #D8AA58 (pressed #C2924A), highlight #EAC675; text #F4F0E7, 2nd #B6C1BE, muted #8D9B98, disabled #667875; hairline white-green 11%/20%; text-on-accent #172126; good/bad/info #55B98A/#D8635D/#599FE5; hp #E35D5B, mana #4F8FDE, stamina #DFAE4E, xp #58B97B, magic #9A78D0.
OWNER'S 11-26 NAVY SET (in kit to the digit): base #14232F, navigation #223D53, recessed #0E1D29, borders #4B6275, text #F1F0E9, gold #EAC474.
V17 ROLE COLOURS: passive #0A1620 recessed; inspect border #91A9B9 + chevron; navigation raised slate #294963 edge #698397; selected tab slate + gold border/underline + text cue; adjust neutral slate #203644; commit solid gold #E4BA68 text #141D22; danger #753439 (light text, edge #EE958A); disabled #20303B/#BCC8CC; text ivory #F1F0E9, supporting #BCC8CC, base #14232F; point cue #F5CF83/#BC9B60 (not commit gold).
RARITY: Normal none (stars 1); Rare #5B99DE (2); Elite #E8893A (3); Godly rainbow #FF6B6B #FFD166 #6BFF95 #5CB8FF #C77DFF, gold #F0C45F (4), turning ring. Selection = separate 2px inner #F0C878 ring.
FONTS: Source Sans 3 (400/600/700) everywhere; Baloo 2 few headings; Press Start 2P wordmark only. Sizes: V17 headline 22-26, title 17-19, primary labels 14-16, supporting 13-14, metadata 12-13, badge 10-11. Lantern: panel title 13/700 caps .10em, module header 11/600 caps, body 13.5, compact 12, value 14/700 tabular, large 18/700, caption 10/600, button 13/700, toolbar label 10.5/600.
SHAPE: radii band top/panel 14, card/module 10, slot/stat cell 8, button 10-11, pill 999. Borders 1px (rarity 2px). Shadows: raised inset 0 1px 0 rgba(255,255,255,.08) + 0 6px 14px rgba(5,8,10,.18); well inset 0 2px 4px rgba(0,0,0,.44); pressed inset 0 3px 7px rgba(0,0,0,.46). Bevel now 1px (owner: reduce). Press scale .97/.98, 90 ms.
COMPONENT SHAPES: header 44-52px = Back 44 (names target) | centred title 13/700 caps | Menu | Close 44; tab = segmented, 36px, active slate + 2px gold bottom edge (V17: gold border/underline + text cue); chip 32px pill; primary button 44px min, gold gradient #E2B765->#D2A14D, 1px #EAC675 edge, radius 10, dark text 13 bold; destructive #753439/light text; slot = 8px radius dark socket, rarity edge, empty = ghost glyph 28% opacity, stack count 10/700 bottom-right; progress = recessed track #0B1216 radius 999, flat fill + 20% top gloss, 3px (card)/8px (HUD)/10px (panel); panel = well on raised tray, spacing not cards; no vertical dividers, no nested cards.

##### 7. KIT components (src/ui/kit/index.js)
Ui2Frame (dashboard frame) | Ui2Header (the one header: Back/title/Menu/Close) | Ui2Tile (raised destination tile) | Ui2Group, Ui2Value, Ui2Stat (recessed info group; large-number stat, pill size) | Ui2Facts, Ui2Fact (flat aligned rows in one sunk container) | Ui2Action, Ui2ActionRow, Ui2Disabled (buttons by role; row; disabled with reason) | Ui2Slot (item slot with rarity) | Ui2Progress | Ui2Badge | Ui2Loading | Ui2Zones (zones of a screen) | Ui2Actions (bottom action row) | Ui2Empty (empty/locked state) | Ui2Confirm (the one confirmation) | Ui2TwoPanel (side-by-side panels) | Ui2ItemGrid, Ui2ItemCell (one grid of item cells) | Ui2Collection, Ui2CollectionCard (illustrated cards by kind) | Ui2Showcase (entry large + doors) | Ui2Tabs, Ui2Tab (selected semantics) | Ui2Stepper (quantity) | Ui2InspectStat (stat you can open) | Ui2Comparison (before/after + signed delta in words+colour) | Ui2Overlay (town-window frame) | Ui2LevelTile (weapon door: level, bar, points) | Ui2Strip (quiet strip paging by whole entries). Helpers: ui2RootClass, ui2LookWas, v17LookOn. Preview page `?uikit=1`.
Nine roles table: src/game/uiRoles.js (prop `intent`). Tokens: src/game/ui2Tokens.js.

