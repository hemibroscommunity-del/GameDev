# The quest journal: which quest, what it asks, where, who, what you get, and what is next (v2.3.3944)

Owner, 2026-11-02:

> Make the 'quest' button in the menu actually useful. Right now it's just a
> confusing menu with barely any utility and it's not very easy to read. Make
> it a place that makes it clear which quest they are on, what's required,
> where to go, who was talked to and what to do next, etc. show rewards
> preview, what was handed during the quest too. Also keep track of
> achievement points gained from each quest (make each quest give them).

And the first-session problem behind it: *"After finishing mayor bro quest
that awards sword and shield it wasn't apparent what to do next."*

Client only: no message, no cap, no kill switch, no storage key. Taking and
handing in a quest stays with its giver in the world and the worker (no
Accept, no Turn In on these pages: v2.3.1704, v2.3.2195).

## Where it lives

| File | Job |
|---|---|
| `src/game/questJournal.js` | The rules: every word each part says. No imports (`server/test/quest-journal.test.mjs` runs it in node with the real quest table). |
| `src/ui/mobile/sheet/questJournalModel.js` | Hands the rules the live game: the quest table, each quest's status, its steps, the land names and which way each land lies (read from `ZONES.wheel.lands` at run time), where each giver stands (`tour.js` `TOUR_MEET`), the tracked quest, what comes after a quest. |
| `src/ui/mobile/dash/QuestJournalPage.jsx` | Draws one quest's page, laid out from its measured box. |
| `src/ui/mobile/dash/QuestsPanel.jsx` | The Quests destination: the points, the page it opens on, the list. |
| `src/ui/mobile/dash/QuestDetailPanel.jsx` | A quest's own page (`questDetail`, chosen through `questDetailBus`), and Track. |
| `src/ui/mobile/sheet/questModel.js` | `deriveQuestOffers(S)`: every giver's offer, untrimmed (`deriveQuestLog` still trims it for its other readers). |

## The Quests page

Top to bottom:

1. **"Achievement Points from quests: N"**: every quest handed in (`rpg._quests`
   `turnedIn`, only ids that are quests) times `QUEST_AP_REWARD` (5).
2. **The quest you are on**, in full (the six parts below), headed "Your quest ·
   In progress". Which quest: the tracked one while it is in hand, else the
   newest one in hand (the last in the worker's `_quests` order, the order they
   were taken), else the first offer ("Your next quest · Available": the tour's
   suggestion first). With none, a line: look for a gold ! in BroTown.
3. The **Daily rewards** card (v2.3.3140; under the quest page since v2.3.3944,
   so the page opens on the quest you are on).
4. **Active**: every quest in hand, the tracked one first, then the ready ones,
   then the rest. A row is its title and its current step or objective with its
   count ("(0/4 Slime Remains)"), or "Ready: hand it in to Mayor Bro"; a 48 px
   ★ / ☆ beside it tracks it (`data-quest-row-track`).
5. **Available**: every giver standing in the world with a quest for you
   (`getNpcQuest`, the source of the gold "!" over heads and on the maps), the
   tour's suggestion first, each with who and where ("Farmer Bro, at the Feed &
   Seed"). Before the Mayor's first quest is handed in his is the only one.
6. **Done**: newest first, each "✓ title" and "+5 AP".

A row opens that quest's own page (`questDetailBus.select(qid)`, then
`dashboardPanelBus.push('questDetail')`). The pinned quest card's tap (PR F1)
opens the same page.

On a box at least 760 px wide (a wide band) the page and the list sit side by
side; a quest's page goes two columns from 560 px. Both read the panel's own
measured width (a ResizeObserver), never the window's.

## A quest's page

Header: the title (19 px) and its status ("In progress", "Ready to hand in",
"Available", "Done", "Not open yet"), with "★ Tracked" when it is.

| Part | Says | From |
|---|---|---|
| **NOW** | The one thing to do: a quest with steps, its current step with the objective under it; else the objective. The count ("0/4 Slime Remains") and a bar, brass while you work, green when it is all there. Ready: "You have it all: hand it in to Mayor Bro." An offer: "Talk to Mayor Bro to take this quest." Done: "Done: handed in to Mayor Bro ✓". | `need` (`key`: the bag's count; `progress`: the worker's `rpg._questKills[id]`), capped at `n`, the same numbers `questCountText` prints; the noun read off the objective after its number ("Slime Remains"), or `need.label`. |
| **WHERE** | In hand: the land and which way it lies ("Earth Forest, west of BroTown"), a resource ("Ore rocks, just outside BroTown"), a door ("At the forge, in BroTown"), "Any building in BroTown", "Out in the lands, past BroTown's safe ground", a dungeon ("A dungeon in the Earth Forest, west of BroTown"), the giver ("Lil Bro, on the town square"), or "Wherever you are" for a step done anywhere. Ready or on offer: the giver and where he stands. Done: nothing. **Show on map** under it. | The quest's `zone`, or its current step's `node` / `way` (`questWays.js`'s words), or the quest's own. The compass word from the land's middle against the world's middle, eight 45-degree slices. |
| **WHO** | The giver's face and name; "Talked to Mayor Bro ✓" once the quest is taken ("Talk to Mayor Bro to start it" before); "Hand it in to Mayor Bro" when ready, "Handed in to Mayor Bro ✓" when done; each step with ✓ done, ▶ next, • later. | Nothing records a conversation: taking the quest is talking to him. `questSteps`. |
| **GIVEN TO YOU** | What the giver hands over for saying yes, pictured, in every state, with "Mayor Bro gave you these when you said yes." (or "hands you these when you say yes." on offer). | `gives` with `when: 'accept'` (held to the worker's `grantOnAccept` by mirror-audit). |
| **REWARD** ("You got" when done) | Gold with its coin, XP when there is any, the items pictured (or the reward's name when no picture exists), **"★ +5 Achievement Points"**, and "Paid by Mayor Bro when you hand this quest in." | `reward`, `gives` `when: 'complete'`, `QUEST_AP_REWARD`. |
| **NEXT** | One line of what follows the hand-in ("Then:" ahead of it, "Next:" once done): "talk to Blacksmith Bro at the forge for “Heavy Metal”.", "carry on with “Box Traps”.", or that it is the last quest for now; under it "N more people have quests: look for a gold ! on your map." | Worked out as if this quest were handed in: the giver's `next` if he would offer it then (`getNpcQuest`), else the tour's next step (`questRoute.js` `tourOffer`, with its `more`), else a quest still in hand (the tracked one first), else any offer. |

Then, for a quest in hand, **"☆ Track this quest"** (`data-quest-track`) and,
once tracked, "Your map's gold star follows this quest."
(`data-quest-track-note`).

## Show on map

`showQuestOnMap(page)`: a quest in hand that is not tracked is tracked first
(the world map's road and the minimap's star follow the tracked quest,
`trackedQuest.js`), then the world map opens through its own opener
(`WorldMapOverlay.jsx` `openWorldMap`, the one the Town Hall's World map row
uses). An offer has the button only when it is the one the road leads to with
nothing in hand (the tour's suggestion). Only where the world map is (the
world's own zone).

## The points

Every hand-in has paid +5 achievement points since before this (server
`quests.js`, `this.QUEST_AP_REWARD` in `index.js`); the phone's copy is
`QUEST_AP_REWARD` in `src/data/items.js`, which the hand-in's prediction
already read. `mirror-audit` holds the two together now ("quest AP"). The
journal shows it on every REWARD, every Done row and in the total.

## Words

Plain and short; "Remains", never "remnants"; the world is "BroTown", never
the code's name for it; "tap" reads "click" on a computer (`deskWords`, on
NOW, WHERE, the steps and NEXT). Body text 15-16 px, section labels 13 px brass
capitals; nothing under 13 px (the node suite reads the sources' sizes,
mp-questjournal the drawn ones).

## Tests

- `server/test/quest-journal.test.mjs`: the compass, the counts (against
  `questCountText` for every counting quest), the nouns, the status, the focus,
  the order, Into the Blue's page taken / ready / done / on offer, where each
  kind of quest leads, every quest in every state in plain words, the points,
  and the wiring.
- `server/test/mirror-audit.test.mjs` "quest AP".
- `tools/qa/mp/mp-questjournal.mjs` (`node tools/qa/mp/run.mjs questjournal`):
  a phone takes Into the Blue; the page opens on it with 0/4 Slime Remains,
  the Earth Forest and Show on map, "Talked to Mayor Bro ✓", the sword and
  shield, +5 Achievement Points and a NEXT line; Show on map opens the world
  map with the road on it; 4/4 then handed in: Done with +5 AP, the total 5,
  NEXT naming who is next, and the page opening on that quest.
- `mp-trackquest` (the rows and Track) still passes; the UI review's
  `dash-quests` and `dash-quest-detail`.
