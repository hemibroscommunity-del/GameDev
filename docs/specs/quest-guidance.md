# The first quest's guidance: Mayor Bro's mark, the quest card's check, the gear flashes (v2.3.3047–v2.3.3049)

Owner, 2026-10-05:

> When you've accepted a quest from mayor bro and he's waiting for you to get
> the items make it turn into a gray question mark. When you have all the items
> make it turn into a green checkmark above his head (not emoji).

> Make the quest notification turn to a green checkmark if you have everything
> you need to complete the quest.

> After accepting first quest make "OPEN" on dashboard flash. Then make sword
> and shield both flash. ... After receiving staff and bow from first quest make
> "OPEN" on dashboard flash (if not already open) and make both weapons flash.

## Mayor Bro's mark (v2.3.3047)

The badge over a quest-giver's head (entityRenderer `_drawQuestBadge`: a dark
hairline, a thick white ring, a coloured disc) now has three states, and none
of them is an emoji:

| `npc._questMarker` | Means | Drawn |
|---|---|---|
| `'❗'` | he has a quest for you | gold disc, dark "!", bobbing |
| `'❔'` (new) | accepted, he is waiting on you | **grey** disc, white "?", **still** |
| `'❓'` | you have everything; hand it in | **green** disc with a **drawn check** (two strokes of one path, dark under white), bobbing |

The wire values stay emoji only as keys; the badge draws plain ASCII or lines,
because a colour-emoji font ignores `fill`. Waiting used to wear no badge at
all, and ready wore a "?".

A giver whose whole chain is handed in now wears **nothing**. The old `'✅'`
drew a green badge, the colour that now means "hand it in".

The old map's minimap pins follow one for one (minimapRenderer `questWait`, a
grey "?"; `questDone`, a drawn check). The Wheel's minimap draws no NPC pins.
Its quest star still leads to Mayor Bro when a quest is ready (unchanged).

## The quest card's check (v2.3.3048)

The pinned card at the top left (BroTown.jsx, the active quest's title and
next step) led with a scroll emoji and closed on a small text "✓". It now
leads with a picture:

- while you work, the Quests button's scroll (`/icons/ui/panel-quests.webp`);
- once `questObjectiveDone` says everything is in hand, the quest windows'
  painted green check (`QUEST_ART.check`, preloaded at the loading gate). It
  pops once as it turns (`bt-quest-hud-ready`, transform only).

## The gear flashes (v2.3.3049)

`src/ui/mobile/gearFlash.js`, mounted with the dashboard band. Mayor Bro's
first quest (tut_1) hands over a sword and a shield when you accept it, and a
bow and a staff when you hand it in. All four go into the bag, not your hands.
Until each is worn, the controls that lead to it flash:

- **Band folded:** the OPEN chip (portrait) or the arrow chip (landscape).
- **Band open, the bag on show:** the tiles themselves, the sword **and** the
  shield, then the bow **and** the staff, and nothing else in the bag
  (`data-gear` on each stash tile, InventoryPanel.jsx).
- **Band open on another tab:** the rail's Dashboard button.

Rules:

- A piece flashes while its **slot is empty** and the bag holds one for it:
  no melee weapon worn and a sword in the bag; no shield and a shield in the
  bag; the bow and the staff once tut_1 is handed in. Equipping one stops its
  flash, and a spare kept beside a worn weapon never flashes.
- Only from accepting tut_1 until tut_2 is handed in. It is the first quest's
  lesson, not a nag for the rest of the game.
- It is the controls themselves lighting up (`data-flash="1"`, game.css
  `bt-gear-flash`: a glow, box-shadow only, never a filter, a transform or a
  position), not a card. So
  the onboarding referee's 20 s gap and "Skip tutorial" do not hold it back:
  like QUEST ACCEPTED!, it answers what the player just did.
- The coach's `equip`, `dashAfterTurnIn` and `equipAll` cards are unchanged.
  They still say in words what to do when their turn comes.

## Tests

- `mp-questguide` (phone, the Wheel, real worker) runs the whole first quest:
  1. '❗', then '❔' once accepted, then '❓' with four snowmen, then '❗' for
     the next quest;
  2. the card's scroll, then the painted check;
  3. OPEN flashing on the folded band, then exactly the sword and the shield;
  4. the shield alone once the sword is on;
  5. the bow and the staff after the hand-in.
- `mp-minimap` counts the waiting pin. `mp-blacksmith` still sees the mayor
  marked and the blacksmith not.
