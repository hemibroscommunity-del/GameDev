# The owner's chosen icons (v2.3.3481; the land scenes moved under the minimap, v2.3.3511)

The owner, 2026-10-19, uploaded thirteen ChatGPT sheets of game UI art. Most of
what is on them is ChatGPT redrawing pictures the game already shows (it drew
from the review screenshots), so a review page set the nine places where one of
them fills an empty spot or replaces a wrong picture beside what the game shows
today, at the size it would be drawn. The owner answered: *"Icon picks: 1b, 2a,
3, 4, 5, 6, 8, 9"*.

## What changed, place by place

| Pick | Where | Was | Now | Drawn at |
|---|---|---|---|---|
| 1b | Crossing into one of the Wheel's eight lands (the land banner) | The owner's animated ornaments for Frost Ridge, Flame Fields, Wind Dunes and Verdant Wilds; the name plate alone for the other four | Every land's **scene** from the sheet, all eight matching ("pick 1b and I'll use the sheet's eight for every land"): over the game's own name plate until v2.3.3511, small **under the minimap** since (below) | v2.3.3481: half the banner's width (~176-211 CSS px upright). v2.3.3511: one picture px a device px (~64 CSS px on a 3x phone), never more |
| 2a | The Gladiator Arena window's header (from the Sheriff's Office) | The Saloon's beer mug, left over from when the arena lived in the Saloon | The gladiator **helmet** | 24 x 28 CSS px |
| 3 | The trade request card, "*name* wants to trade" | No picture | The **handshake**, as the duel challenge card shows its swords | 40 x 26 CSS px |
| 4 | The quest marks over a townsperson | Drawn discs: a gold "!", a still yellow "?", a green disc with a drawn check | The owner's **pins**: a gold "!" pin, the "?" pin baked **grey** (still), a gold ring with a green check | 32 x 38 world px (the disc was 32) |
| 5 | The Gambling Den's weekly jackpot | Words only | The **sack of gold** beside the pool's number | 64 x 69 CSS px |
| 6 | The Pets page's "Pet House: 10 more places for ... gold" row | No picture | The **pet house** at the start of the row | 40 x 33 CSS px |
| 8 | The Daily Rewards window's free daily spin row | A small wheel drawn in code (`SpinGlyph`) | The **prize wheel** | 34 x 37 CSS px |
| 9 | The Journey page before you have done anything | The Journey button's own icon, 40 px, dimmed to 0.4 | The **treasure map**, not dimmed | 120 x 69 CSS px |
| (v2.3.3524) | The Blacksmith's Upgrade tab (the owner's playtest note: "Make the upgrade tab icon different for smithing.  Like a hammer") | The currency strip's gold gem | The **hammer** off the crafting sheet's gold "Craft" button, cut by the tool's `card` mode (the button is a gradient, so it is keyed row by row; docs/specs/blacksmith-2026-10-19.md) | 22 x 21 CSS px |

Not picked: **7**, the world map's compass (the owner kept today's). **10**, the
leg armour and the chest to match: not answered yet; a new entry in the cutter's
`PIECES` is all it would take.

Kept as they were:

- the closed lands' own zone banners (`?trial=off`, walking into Frost Ridge as a
  zone of its own) keep the animated ornaments;
- the Saloon's own window keeps its beer mug;
- the drawn wheel still marks a bonus spin elsewhere in the Daily Rewards window
  (a reward's picture, the season's lines), and every other trade drawer (open,
  waiting, review, receipt) has no picture;
- the No man's land banner is still the plain plate.

## How

- **Cut once, by a tool.** `tools/ui/cut-owner-icons.py` reads the thirteen
  sheets in `assets/icons-source/owner-2026-10-19/` (moved there from the top of
  the repo, their names lower case with hyphens) and writes WebP. It uses the
  review page's own cuts, which the owner approved by eye:
  - **alpha**, a piece on a transparent ground: its solid core grown a few px is
    its own region (which keeps its soft edge and drops a neighbour's glow), the
    alpha lifted from the background remover's ~250 to solid, the faint halo
    under 40 dropped;
  - **key**, an icon painted on a flat card (the helmet, the handshake): the
    card's fill is the median of a ring of points inside the box, and pixels near
    it turn see-through.
- **The lands' plate is cut off.** Each vignette is cut whole and only the scene
  above its painted plate is kept. The plate starts at the first row of its
  parchment under its dark top edge; the review measured four by eye (Stone
  Hollows 104, Poison Forest 89, Electric Foundry 101, Water Caves 98) and the
  tool refuses to write anything unless it measures the same four. The other four
  measure Flame Fields 104, Frost Ridge 107, Wind Dunes 98, Verdant Wilds 110.
  The dark row kept at the scene's foot reads as its ground line.
- **The helmet's box** is the review's, tightened: the review's took two pixels of
  the card's rounded corner (a speck at the top left) and cut the helmet's chin
  off five rows short of the line under it.
- **Sizes as drawn.** A window's picture is written at three times its CSS size
  (a 3x phone) but never stretched past the sheet's own pixels (a picture is held
  decoded at its own size, and stretching it adds nothing): the sack 191 x 207,
  the pet house 119 x 99, the prize wheel 102 x 110; the helmet (44 x 51), the
  handshake (80 x 53), the treasure map (256 x 148) and the land scenes (~190 x
  100) stay at the sheet's own size, the browser drawing them up. The quest pins
  are canvas textures, each one 72 x 86 frame (2.25 times their 32 x 38 world
  px, as the 64 px talk bubble is for 28 world px: a much bigger texture only
  shimmers as the view slides).
- **The grey "?" is baked**, its own file (`pin-waiting-grey.webp`, plain
  luminance, red, green and blue equal): the canvas never filters a picture. The
  gold "?" is on disk beside it and not loaded. The grey is neutral, not
  v2.3.3047's teal grey, which read as green on the grass; green is still only
  the ready pin's check.
- **A contact sheet** (`--contact out.png`) shows every cut on the game's slate
  and on a light ground. The tool refuses to overwrite a file without `--force`;
  `--dry` cuts and reports; `--only a,b` cuts those.
- **Where the game finds them:** `src/data/ownerIcons.js` (no imports):
  `LAND_SCENE` / `landSceneUrl` (a null-prototype table keyed by the land), the
  six window pictures in `OWNER_ICON` with the CSS size each is drawn at, and
  `QUEST_PIN` with `QUEST_PIN_WORLD`.

### The land banner

- (v2.3.3481) `noteWheelLand` (src/ui/zoneBannerOverlay.js) asked
  `playZoneBanner` for the land's `scene`, which stood 2 px over the plate, half
  the banner's width (~191 CSS px on a 390 phone).

### v2.3.3511: the land's emblem, small, under the minimap

The owner, after a playtest (2026-10-19): *"new land emblems look bad enlarged
(revert or show below minimap)"*. A scene is about 190 x 100 picture px; drawn
191 CSS px wide on a 3x phone it was three times its own pixels, soft, and the
painted plate's gold scroll ends showed at its foot. Of the two ways offered,
the second:

- **The banner is the plain plate again** for every land: the element icon and
  the name in the land's colour, docking into the minimap's plate
  (`playZoneBanner(region, S, { title, plain: true, icon, color })`). `plain` is
  the plate alone: never the ornament strip of the closed zone with the same id
  (the strips stay out of the Wheel: 15.7 MB), never a picture over it; the
  `.is-scene` rules are gone.
- **The scene is an emblem under the minimap** (src/ui/landEmblem.js), shown as
  the plate docks (`ZONE_BANNER_PLAY_MS + LAND_HOLD_MS`, 1.35 s; 0.9 s with
  reduced motion), for `EMBLEM_HOLD_MS` 3.6 s, then fading over 0.6 s:
  - its size is ONE PICTURE PX A DEVICE PX: its width over `devicePixelRatio`
    (~62-68 CSS px on a 3x phone, ~93-103 on a 2x), never wider than
    `EMBLEM_MAX_W` 112 (a computer at 1x draws it a little under its pixels),
    so it is never blown up (`emblemSize`);
  - its place: centred under the minimap's box, `EMBLEM_GAP` 8 px below it, on
    whole device px; where that lies on a control, beside the box at its top
    (sideways the attack disc is 34 px under the box);
    where neither is clear it is not shown, the plate naming the land
    (`emblemPlace`). A control is anything that takes a tap, the sticks, the
    sprint button, the quest card, a No man's land or party card, the coach, the
    map's own button, a prompt -- kept 6 px clear (its soft halo reaches that
    far); a control that comes up under it while it shows (or the minimap
    moving, or leaving the Wheel) sends it away at once;
  - transient, not a fixture, because the owner keeps the room round the
    minimap clear (*"It'll free up more room around the minimap"*, v2.3.3009;
    the plate made by shrinking the map *"rather than enlargen it further"*,
    v2.3.3108) and the plate already names the land; and it shows only when the
    banner does (not again within 45 s, not on a walk along a border);
  - a soft dark halo painted behind it (a radial gradient, no filter: TRAPS
    §42) so its thin outline reads on bright ground; z 21, takes no touch;
  - nothing new to load: the held, decoded scene and its own address
    (`landSceneHeld`), never a load of its own.
- **The scroll ends are cut off.** `cut-owner-icons.py` cuts each scene again
  just above them (`rim_cut`: in the outer quarter each side, the highest of the
  last nine rows holding a gold or brown px with the scene's dark outline right
  above it) and makes the new last row its dark ground line (`ground_line`);
  every land had them (ember's at rows 96-100, x 8-16). The eight files are
  smaller by 4-12 rows (186 x 96 to 205 x 103) at a new address
  (`SCENE_V` `?v=2.3.3511`).

### The quest pins

- The pin is a Sprite in the marker's container (entityRenderer.js `qmPin`),
  bound from `_questPinTex` each frame until its picture is in. The drawn disc and
  glyph stay as the fallback, so a picture that never came still marks the quest.
- 38 world px tall where the disc was 32, its tip 3 px over the hat as the disc's
  edge was; the talk bubble keeps the old disc's centre (`_talkBaseY`). Offer and
  ready still bob; waiting holds still.
- The zones' 52 px minimap (today's town, the farm, a dungeon) marks a waiting
  quest in the same neutral grey (`C_QUEST_WAIT`), as its comment promises the map
  and the world agree. The Wheel's maps draw no townsfolk pins.

## What loads where, and its memory

| What | Loaded | Let go | Files | Decoded |
|---|---|---|---|---|
| The eight land scenes | behind the Wheel's loading screen (`preloadZoneAssets('wheel')` -> `preloadLandScenes`, zoneBannerPreload.js), held | on leaving the Wheel (`freeLandScenes`) | 64 KB | 0.56 MB (v2.3.3511: cut above the scroll ends) |
| The four animated strips | **no longer in the Wheel**: only with the closed lands' own zones | as before | -- | **-15.7 MB in the Wheel** |
| The three quest pins | on the loading screen (`preloadWorldAnimations` `questPins`), global | -- | 9 KB | 0.07 MB |
| The handshake | warmed with the controls (`controlsPreload.js`): the card pops up mid-play | -- | 2.5 KB | 0.02 MB |
| The helmet, sack, pet house, prize wheel, treasure map (v2.3.3524: and the Upgrade tab's hammer, 2.4 KB, 0.02 MB) | with their window, as every window's pictures | with the window | 49 KB | 0.41 MB at most |

The Wheel held the four strips decoded (2,205 x 410 to 2,268 x 474 each, 15.7 MB)
while you walked it; it now holds eight scenes of about 190 x 100 (0.61 MB). They
are DOM images, not Pixi textures, so no line of the memory budget
(`tools/qa/mp/memory-budget.mjs`) measured them and none moves.

## Tests

- `server/test/owner-icons.test.mjs`: every file in place at its size (each window
  picture's CSS size its own shape, the pins one 72 x 86 frame, the grey "?"
  beside the gold), the thirteen sheets kept and none at the top of the repo,
  `landSceneUrl` for the eight lands and nothing else, each place using its
  picture (the Saloon keeping its mug, only the invite drawer with an icon, the
  drawn wheel kept for bonus spins, the disc kept as the pins' fallback), and the
  loading: the pins on the loading screen, the scenes behind the Wheel's and let
  go on leaving, no strips in the Wheel, the handshake warmed.
- `mp-wheelmap`: the Wheel holds the eight scenes and none of the strips; since
  v2.3.3511 Frost Ridge's banner, played again, is the plain plate (the icon and
  the name, no picture, no ornaments), and as it docks the frost emblem comes
  up under the minimap at one picture px a device px, centred under the box,
  on no control, and goes after its few seconds (`wheelmap-04c-emblem.png`);
  none of the eight pictures keeps a scroll end at its foot; and turned to 320,
  375, 390 and 430 wide and on its side (844 x 390, 667 x 375) the emblem
  never lands on a control -- under the box upright, beside it sideways
  (`wheelmap-04d-emblem-<size>.png`).
- `owner-icons` §4d/§4f/§5 (v2.3.3511): the plain plate, the emblem's size on
  every screen from 1x to 4x, its place and its time, the cut.
- `mp-questguide`: Mayor Bro's offer is the "!" pin (38 world px), the waiting
  mark the grey "?" pin, the ready mark the green check pin
  (`window.__btNpcMarks`: `badge` is now the pin's state, `badgeArt`, `badgeSrc`,
  `badgeH`; the fallback disc's colour moved to `badgeFill`).
- `node tools/qa/ui-review/capture.mjs --only=trade-request,building-arena,building-gamble,daily-rewards,more-pets,more-journey,near-mayor`
  retakes the screens these changed.
