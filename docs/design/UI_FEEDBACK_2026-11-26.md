# The menus: the owner's suggestions of 2026-11-26 (after the master specification)

The owner, 18:3x UTC 2026-11-26, in the orchestrator's session, after playing
the new dashboard (the frame, Bro, Character, Combat, Gear, the item page):
*"Also here are further suggestions to improve the menus"*, then the text
below, WHOLE and unchanged. It arrived as text only: its small mock-up
pictures came through as their labels (the runs of single words and numbers
under parts 2, 3, 5 and 6 are those labels, in reading order). It is the
owner's word after `UI_MASTER_SPEC.md` (2026-11-25): where the two differ,
this is the later. Their standing rule still holds: *"keep my game content
over the mockup stuff"*, so the names, numbers and tiles in the mock-ups are
examples, and the game's own content fills them.

---

I think the biggest problem with the new BroTown menus is everything is competing for the same level of attention. Almost every piece of information has its own large beveled button, even when it isn't an actionable or particularly important piece of information.

The new combat control panel looks considerably more polished than the dashboard beneath it. I'd bring some of that same design discipline into the menus without increasing the dashboard height or sacrificing gameplay visibility.

## 1. Persistent character HUD

I strongly agree with moving the character portrait into the top-left corner. It gives players a persistent sense of identity and progression, regardless of which menu they have open.

Conceptual HUD layout: positioned opposite the minimap, with the tracked quest immediately underneath.

* Portrait: Always visible and tappable.
* Name and combat level: Immediately adjacent to the portrait.
* XP bar: Persistent gold progression bar.
* Quest: Smaller, single-line tracker underneath.
* Online player count: Relocate to the Social menu or a small indicator in the top navigation.

Since combat level is determined by the highest weapon level, I would display the XP progress of whichever weapon is closest to increasing the overall combat level. Label the XP bar with that weapon so players understand the relationship.

Tapping the portrait should immediately open the character dashboard.

## 2. Consolidate Character and Bro into one menu

I don't think you need separate Bro and Character landing menus anymore. Moving the identity information into the persistent HUD eliminates much of the reason for having two screens.

I'd turn the Bro menu into a unified character management dashboard.

(mock-up labels) ‹ Menu / Character / Combat / Equipment / Life Skills / Feats / Pets / Journey / AP 415 / Quests 0 / Clan: Party of 3 / Guilds: View ›

One unified character dashboard. Existing game icons would replace these illustrative icons.

Titles could live within Feats. Weapon levels would live within Combat. Clan and guild management could link directly into Social.

This eliminates the large redundant portrait, combat level banner, three weapon level buttons and separate oversized informational boxes.

## 3. Establish a consistent visual hierarchy

Right now, your buttons, statistics and informational containers all have nearly identical visual weight. I would establish three distinct component styles and use them throughout the entire game.

* **Navigation buttons** (mock-up: "Combat"): Raised, beveled, prominent. Reserved for destinations and actions.
* **Important statistics** (mock-up: "120.5 DPS"): Recessed surfaces with large numbers. No heavy beveling.
* **Supporting information** (mock-up: "Damage 26–44"): Flat, aligned within shared containers. No individual heavy borders.

This change alone would make nearly every menu look less cluttered while preserving your preference for organized, contained information rather than free-floating text.

## 4. Changes I'd make to each existing menu

**Gear.** Actually one of your better layouts. Standardize the inventory and equipment slot styling, shrink their headers, and make the gold balance a compact pill. Preserve the side-by-side structure.

**Main menu.** Keep the four-by-two layout. Enlarge the icons by approximately 25%, reduce the button bevels and shadows, and use the same typography across all navigation buttons.

**Combat.** The three weapon cards have too much empty space and surprisingly small weapon icons. Make the weapons visually dominant, enlarge the level numbers and only show available points prominently when there are points to spend.

**Weapon attributes.** Currently the messiest menu. Eliminate the left-side Attributes column, consolidate the combat statistics into one summary strip, and give the six attributes a full-width three-by-two grid.

**Life Skills.** Enlarge the icons and cards to occupy the unused vertical space. Put level indicators inside the cards instead of having badges protrude from them. Match the rest of the game's typography.

**Leaderboards.** Generally good information density. Reduce the metallic gradients across the first three rows while retaining the gold, silver and bronze medals. Highlight the player's own row regardless of rank.

## 5. Redesign the weapon attribute menu

This is how I'd consolidate the Sword menu specifically, with Bow and Staff following the identical template.

(mock-up labels) ‹ Combat / Sword / Menu / Lv 23 / 4,393 / 7,333 XP / 120.5 DPS › / Damage 26–44 / Critical 38% / Speed 2.10/s / Range 2.9 / Attributes: 0 points available / Range 12 / Power 17 / Speed 11 / Luck 11 / Special 12 / Element 3

Same information, but with a much clearer progression from level → performance → attributes.

When points become available, the attributes can receive a small gold plus indicator and the available points counter can become gold.

## 6. Unify the color palette

I would keep the navy and gold aesthetic. It works particularly well with your new control panel. The dashboard's muted blue-gray background is what makes it feel somewhat disconnected.

| Use | Colour |
|---|---|
| Dashboard base | #14232F |
| Navigation | #223D53 |
| Recessed panels | #0E1D29 |
| Subtle borders | #4B6275 |
| Primary text | #F1F0E9 |
| Gold accents | #EAC474 |

Use consistent off-white text throughout, gold for progression and important numbers, and other colors only when they communicate something meaningful. I'd also retain your existing illustrated game icons instead of replacing them.

## My recommended priorities

* Introduce the persistent character HUD.
* Merge the Bro and Character menus.
* Standardize buttons, statistic panels and informational containers.
* Consolidate the combat attribute menus.
* Apply consistent colors, typography and spacing globally.
* Refine individual menus after those global changes.

I wouldn't overhaul the new combat control panel or change the dashboard dimensions. Both are working well.

The overall design philosophy should be that the upper HUD tells you who you are and how you're progressing, while the bottom dashboard lets you manage your character. Those two areas shouldn't unnecessarily repeat each other's information. That distinction would give BroTown a much more cohesive and intentional interface.
