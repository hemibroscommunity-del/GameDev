# The hero sheet: stat pills, the points grid, the point bubbles, the Max HP preview (v2.3.3050–v2.3.3053)

From the owner's notes of 2026-10-05. Four changes to the character sheet
(the dashboard's Hero destination). Each has its own version tag.

## The stats as pills (v2.3.3053)

> Add pill design for hero equipment menu stats. See screenshot

The mockup (the Equipment tab redrawn by ChatGPT) shows:

- every stat in its own rounded **pill**: its picture, its name, its value;
- **OFFENSE** in gold, with the **DPS** pill beside the heading;
- **PLAYER** in blue;
- the three vitals as **coloured pills** of their own (HP red, EN gold, MP
  blue), with the picture, letters and numbers inside.

### What is drawn

| Group | Pills (picture) | Value read from |
|---|---|---|
| Vitals | HP (heart), EN (bolt), MP (drop) | the bars' own numbers; the pill IS the bar (VitalBar), so it drains |
| OFFENSE heading | DPS (crossed swords) | `deriveHeroStats().dps` |
| OFFENSE | Damage, Range, Attack Speed, Crit Chance, Crit Dmg, Special Dmg, Elem Power | the active weapon's lane |
| PLAYER | Defense, Armor, Stamina, Dodge, Move, Resist | the body stats and worn armour |

The tab showed seven stats until now. The mockup adds seven more, and all of
them are real: each is a Points stat the worker already settles.

- `src/ui/mobile/sheet/heroStatPills.js` reads each one through **the same
  reader the Points tab prints it with**, so the two tabs never disagree.
- The pictures are the Points tab's own where the stat is a Points stat. The
  hero set supplies DPS, Damage and Crit Dmg, and the bag's armour piece is
  Armor (the mockup drew a chest plate).
- A tap on any pill opens its explainer with your own value (v2.3.2131's
  behaviour, now on all fourteen).

Two words differ from the mockup on purpose:

- **"Elem Power +12", not "Element Dmg +12%".** The stat is elemental
  *power*, a number that burns, roots and combos grow with, not a percent.
- **Attack Speed reads "+25%"** where the Points cell reads "1.25". It is one
  number, `swingCooldownMultFor`, worded the mockup's way.

### Where they go, and why the tab scrolls again

The mockup cannot be drawn at a phone's size. It is the 390 px sheet drawn
1536 px wide, about 4x, so its words would be about 6 px tall. The sheet's
window is about 150 px tall upright (one height, always, since v2.3.1638), and
fourteen readable pills plus three vitals need about 330 px. So the tab
scrolls, and the panel's bottom fade is on to say so (v2.3.1815). That keeps
v2.3.1878's lesson: the problem then was stats below a fold that **nothing
cued**.

**Upright (portrait): two columns that run on down**, the mockup's two pill
columns under what each belongs with.

- Left: the character and the gear, then **PLAYER**.
- Right: the three vitals, then **OFFENSE**, its heading carrying DPS.
- The first screen, with no scroll, still shows the character, the six gear
  slots, the vitals, and OFFENSE with DPS and Damage.

**Sideways (landscape):** the figure and gear first, then the vitals, then
OFFENSE and PLAYER stacked at the pane's full width. Two abreast, each would
be about 95 px, and "Attack Speed" alone wants about 70 of that.

**A selected slot** still opens its item card over the vitals (v2.3.1843). The
card keeps the figure row's height, and OFFENSE runs on below it, so the
numbers stay in view while you compare.

### Colours

The gold is the lantern brass (`COL.accent` family) and the blue the mana /
info blue. No new hue is added. A gold border on a stat is the eighth
documented LANTERN-SLATE exception (docs/LANTERN-SLATE-SPEC.md), bounded to
these pills.

### Two earlier calls this undoes, both the owner's

- v2.3.1890: "every stat is being treated as its own card ... switch to a
  character-sheet/list format".
- v2.3.1883b: "Don't use any icons to represent the stats to save room".

What those two bought was room. The mockup is the newer ask, and the room is
paid for with the scroll above.

## The points grid follows the weapon in your hand (v2.3.3051)

> Make the points allocation screen ... show the point distribution based on
> your active equipped weapon. So if you have melee equipped show the points
> you've allocated for melee. If bow show for bow.

The grid already opened on the held weapon. But a lane picked in the spend
window's tabs stuck while the sheet stayed open, and swapping weapons never
moved it. Now:

- the window's tabs aim only the window;
- a change of weapon brings the grid back to the held lane (`heldCatRef`);
- only the dashboard's own Melee / Bow / Magic pill, which asks for a lane by
  name, still shows that lane until you swap.

The held lane wears a small brass plate (`data-prog3-held`). Tested by
`mp-catgrid`.

## The point bubbles breathe (v2.3.3052)

> Make the bubble points for all 3 weapons and for the character glow and grow
> and shrink if there are still points that need to be allocated

The Points tab's per-weapon and character bubbles carry `bt-pts-bubble` while
their count is above zero:

- a warm glow behind each (opacity only);
- a swell of the bubble itself (transform only), in step with the tab's own
  glow (1.6 s);
- never a `filter`, per the iOS rule;
- with reduced motion, lit and still.

Tested by `mp-catgrid` (which pauses the animation to measure) and
`mp-pointsglow`.

## Max HP in the spend window says what the bar will say (v2.3.3050)

> Max hp in the stat confirmation preview window is showing 48hp for 6 points
> but the preview animation shows ... 37/37 ... (I spent the points and it was
> actually 37)

The window's row printed the points' bonus (6 x 8 = 48), and in the worker's
raw HP. The scene beside it, and every bar in the game, shows the total in
display HP: `floor(100 + 6 x level + 8 x pts)`, shown divided by 5 and rounded
up. For a level-6 character that is 136 raw (28) now and 184 raw (37) after.

- The three pool stats (Max HP, Stamina, Max Mana) now read the pool itself,
  through `recalcDerived` on a copy, HP in display units, as the bar does
  (`statPreview.js` `POOL_STAT`, `pooled`, `poolShown`).
- The window and the scene share that one copy of the arithmetic.
- `statsim` §9 pins "28 -> 37".

## Tests

- `mp-charfit`, rewritten for this layout, at 390x844, 375x667 and 844x390:
  - every pill is there;
  - the first screen holds the character, the gear and the vitals, plus (upright)
    OFFENSE, DPS and Damage;
  - the bottom fade is on while there is more;
  - the last pill of each group can be scrolled fully into view;
  - no name or value is cut short and nothing spills sideways;
  - the values are real readouts;
  - a tapped slot's card takes the vitals' place at the figure row's height,
    with OFFENSE still below it.
- `mp-heroview` looks for the card's stat inside the card (the sheet's own
  Armor and Damage pills are on screen beside it now).
- `mp-prog3` finds the Armor pill and counts all fourteen.
- `mp-landscape-dash` accepts PLAYER beside OFFENSE.
- `mp-infopop` taps the Defense pill for its explainer.
- `mp-catgrid`, `mp-pointsglow`, `statsim` §9.
