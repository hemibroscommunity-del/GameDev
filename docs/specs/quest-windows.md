# The quest windows in the owner's painted art (v2.3.3030)

> *"Add these for the new quest windows."* — the owner, 2026-10-04, with three
> sheets of painted frames, buttons and ornaments, a mockup of the new
> completion flow, and a screenshot of the old window.

## The flow

The mockup drew six panels: a completion banner, a reward decision window
("only shown when the player has a choice to make"), a claim confirmation
("shows what was received; items and XP animate to inventory/HUD"), a compact
banner, an auto-reward example ("for quests with no choices: banner only,
rewards go directly to the HUD"), and a rarity example. In the game:

1. **He talks** (NpcDialogue, unchanged) and his last button is *Claim reward*.
2. **If there is a choice** -- the quest pays XP and the character trains
   Melee, Bow and Magic (prog3), so the XP has to go somewhere -- the **claim
   window** opens: QUEST COMPLETE, the quest's title, *+25 Gold +30 XP* with
   the HUD's own coin and XP pictures, the items *for finishing* it in painted
   slots, the three skill chips on the owner's green panel, and the claim
   button, the owner's grey bar until a chip is chosen and their gold bar
   after.
3. **A tap on Claim Rewards** pays, exactly as before (`quest_turn_in`, the
   prediction, the fanfare, the XP flying to its skill's card), and the window
   turns into the **confirmation**: *Rewards claimed!*, the slots glowing,
   *+30 XP to Bow*. The coins fly into the purse and the items into the bag.
   QUEST COMPLETE! rises at the top of the screen. After 1.9 s, or at a tap,
   he offers his next quest, as since v2.3.1713.
4. **If there is nothing to choose** (no XP, or a pre-prog3 character), there
   is no window at all: *Claim reward* pays at once, QUEST COMPLETE! wears the
   laurel check on its crest, the coins and items fly from the banner, and he
   offers his next quest.

The NEW QUEST window (accepting) is the same component in the same frame. It
was one component with the claim window on purpose (v2.3.1820: "two files
drift the moment one gets a tweak").

## The pieces

The owner's sheets are kept as lossless webp in `tools/ui/quest-art/` (with
the mockup). `bash tools/ui/cut-quest-art.sh` cuts them into
`public/ui/quest/` (about 0.35 MB in all), and `src/ui/panels/questArt.jsx`
draws them.

| Piece | From | Used for |
|---|---|---|
| The framed navy panel with the crest | sheet 1 | every quest window, as ten pieces (below) |
| Glowing green banner with the crest | sheet 1 | QUEST COMPLETE! (smaller at the top while the confirmation is up) |
| Thin glowing green banner | sheet 1 | QUEST ACCEPTED! |
| Flat green banner, laurel crest | sheet 3 | QUEST REWARD (an armour piece stashed in the bag) |
| Plain green panel | sheet 1 | the XP choice; *Rewards claimed!* |
| Gold bar: gold, glowing, grey | sheet 2 | the claim / accept button (grey = can't yet, glowing = under a finger) |
| Round X, round check | sheet 2 | close; *Rewards claimed!* |
| Weapon chips (sword, bow, staff), the sword chip selected | sheet 2 | Melee / Bow / Magic; the selected one's gold ring is lifted off and worn by any chip |
| Item slot, glowing slot | sheet 2 | each reward; glowing on the confirmation |
| Laurel check badge | sheet 3 | the auto reward's banner |
| Gold and green sparkles, the gold burst | sheet 3 | the banners' arrival, *Rewards claimed!* |
| Divider rod, flourish, corners, brackets, the gold and XP pills, the X's glowing state | sheets 2-3 | cut and kept, not used yet (the HUD's own coin and XP are drawn instead of the pills: they are what the rewards fly into) |

**Fitting any size without bending the art.**

- **The frame** is a 9-slice that keeps the crest whole. The four corner
  ornaments and the crest (with its wood band and brackets) are drawn at one
  scale, `--qs`, and only plain band and plain fill stretch between them. So a
  window can be as tall as its content and as wide as the screen. On a
  sideways phone `--qs` is smaller.
- **States that swap** (a button's three bars, a chip and its ring, a slot and
  its glow) were drawn by the owner at slightly different sizes. The cutter
  re-fits each family onto one canvas with its frame in the same place, so a
  state change swaps a picture and nothing moves.
- **The slot frame** is the slot's CSS background, not an `<img>`: the only
  picture in a reward is the reward (mp-questui counts them).
- **A banner's words** sit under its crest and inside its bottom gold line,
  both measured off the picture (game.css `.bt-qw-banner-text`, the rows in
  its comment), and their sizes are shares of the banner's width. The first
  cut ran the text block to the line itself, and in the game's own font the
  thin banner's title and the flat one's last line sat on it.

**Sideways** (`orientation: landscape` and `max-height: 560px`), each window
is two columns:

- The title and items are on the left; the choice and the button are on the
  right.
- The offer's two item groups sit side by side.
- The banners are smaller and higher.
- The confirmation sits below the claim's banner.

Everything fits a 390 px-tall screen.

**No filter anywhere** (TRAPS §42). The glows and sparkles are pictures, and
the motion is transform and opacity only, played once. Lantern Slate's seventh
documented exception has the bounds of this look.

## The flights

`src/game/questFly.js`: each reward picture is a fixed `<img>` at z 1200,
flown on an arc by the Web Animations API (transform and opacity only).

- **Destinations:** the purse (`[data-purse]`) for gold. For items, the gear
  stash's tile when the dashboard is open, else the dashboard's fold chip, else
  its button.
- **Landing:** the target gives a small bump (`.bt-qw-landed`; not the purse,
  which bumps itself when the coins rise).
- **Coins:** three to five, depending on the amount.
- **XP:** not flown here. It already flies to its skill's card (XpFlyOverlay,
  v2.3.1874).
- **Reduced motion:** the flights are skipped.
- **QA probe:** `window.__btQuestFly` (`flown`, `landed`, `last`).

## The banner was under the dialogue

`.brotown-wrap` is position:fixed, so it is its own stacking context. The
quest banner lived inside it, at z 71, while the quest window's scrim is a
body portal at z 44. 71 inside the wrap never beats 44 outside it (TRAPS §20).
So QUEST COMPLETED! drew *under* the dark scrim of the very dialogue it
announced. mp-questbanner compared the two numbers and passed.

`QuestBannerLayer.jsx` now portals the banner to the body. mp-questbanner
asks whether the banner is out of the wrap (TRAPS §134). The first-join
WELCOME plate keeps its own look and place: it is the one banner with a
button on it.

## What the tests read, kept

Several things are pinned by the quest scenarios (mp-questline is CI's
*playable* job), and all of them are still there:

- the classes `.bt-qoffer`, `.bt-qoffer-kicker`, `-title`, `-pay` and `-go`,
  and `.bt-quest-turnin`;
- `[data-tut="qoffer-confirm"]` with `aria-disabled`;
- `[data-gives]` with its caption first;
- `[data-qa="dlg-close"]` with its aria-label;
- `[data-xp-skill]` with its label as the button's own text node, at 14 px, on
  one line, 44 px tall; and `[data-xp-caption]` at 13 px, never ellipsised;
- the words *Accept Quest*, *Claim Rewards* (drawn in small caps, so the page
  keeps its case), *Quest Complete* and *For finishing “…”*.

Two tests were changed:

- The banner reads QUEST COMPLETE! (the mockup's words), so mp-questline and
  mp-questbanner match /QUEST COMPLETE/.
- The reward is drawn as *+25 Gold*, so the sub-line check is /\+\d+\s*g/i.

**The confirmation** carries neither `.bt-qoffer` nor `.bt-npcdlg`, on
purpose: every helper reads `.bt-qoffer` as "an offer is up, act on it". It is
marked `data-qw-stage="done"`, and the harness's `advanceNpcDialogue` and
`npcDialogueOpen` wait it out (`waitClaimedDone`).

**Checked by:**

- `mp-questwin`: the first quest through every window on a phone, with real
  taps.
- `src/quest-harness.html`: every window and banner in the game's own
  components. `node tools/qa/quest-sheet-shot.mjs <dir> [390|844]` saves them.

## Judgement calls

- **No "Choose 1 reward".** The mockup let the player take the bow *or* the
  staff. Quest one gives both, by the owner's own rule (v2.3.1692: "all three
  combat styles land on quest one"), and the worker pays both. So the window
  shows both under *For finishing “Cold Reception”*, and the only choice is
  where the XP goes. A real one-of-two reward would be a server change.
- **The banner comes with the claim**, not before the window as the mockup's
  arrows drew it. It celebrates the payout itself, at the top of the screen
  above the confirmation, and the player is never kept waiting 1.5–2 s before
  they can choose.
- **Rarity** is the game's own quality ladder (rare / elite / godly, the
  bag's colours), shown when a reward carries a `quality`. Every quest reward
  today is a plain *normal* item, which the bag also leaves unlabelled. So no
  rarity tag shows yet, rather than a new "Common" label only these windows
  would use.
- **The welcome plate and the NPC's dialogue box** keep their look. The
  owner's pieces are for the quest windows.
