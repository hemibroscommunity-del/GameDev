# BroTown V17 — Definitive menu redesign and implementation specification

**Audience:** Claude / BroTown engineering. **Design baseline:** `prototype.html` (V17), with the historical feature inventory in `reference/original-feature-inventory.md` and the owner's later corrections. This consolidated specification incorporates V17 and takes precedence over any older prototype or reference image. The existing production repository is authoritative for actual mechanics, except explicit owner changes. This replaces the earlier incremental design documents for implementation decisions. The original inventory remains the feature-parity source, except where explicitly superseded below. The HTML is a design and local interaction prototype, not production code or a source of gameplay rules. Do not copy the prototype's accumulated JS, temporary fixtures, screenshot crops or sample formulas into the game.

## 1. Non-negotiable owner requirements

- Blank-slate navigation organized around what players want to do, not current component or route names. Preserve all actual game functionality and existing in-world prerequisites. The original fixed eight-tile directory is superseded.
- Every meaningful state must answer the two most likely questions of a momentarily confused player. Design hypotheses must be tested; do not add the questions as permanent UI text. Use ordinary language a child can understand, spell out Damage per second when space allows, retain familiar Lvl and XP, avoid pervasive tiny explanatory text. Information should flow from recognizable actions or objectives to decision-critical context, then supporting facts and on-demand detail.
- Clearly distinguish passive facts, inspectable facts, navigation/preparation, selected controls and commitments throughout every menu. Do not make information compete with actions.
- Fixed menu allocation. Adaptive layouts may change arrangement and number of visible inventory entries, not gameplay scale or world visibility advantage. Keep comparable world coverage and apparent object sizes with only minor variation, across mobile, landscape and desktop.
- Character HUD tap opens Bro; minimap tap opens the map. Quest tracker opens tracked quest. Keep Gear and Menu directly accessible. Diego uses the player's bag to put items up for sale; **listing does not immediately sell the item or credit gold**. This overrides the old instant-sale description in source §3.17.

### Visual-first, action-first hierarchy (latest owner requirement)

1. Recognizable visual choices and the most relevant available action or objective first.
2. Decision-critical context alongside the action: requirements, costs, effects, progress, risks and projected improvement. Never hide information needed for an informed commitment.
3. Supporting read-only information, visually quieter and later in the reading order.
4. Detailed formulas, historical records and less frequently used information on demand.

Use actual BroTown artwork, recognizable icons, progress bars, quantities and directional cues with short readable labels. Do not substitute unfamiliar unlabeled symbols for unfamiliar terminology; color alone must not communicate meaning. Do not add decorative visuals merely to fill space. Available points deserve a priority cue but not commit-style gold. A zero-point state still allows inspection. For inherently informational menus (e.g. rankings), the requested information itself is the goal; do not manufacture actions. Review every screen and player state for these rules, including screens not revised in V17.

## 2. Hard geometry and adaptation

| Reference | Viewport | Open band | Header | Page | Inner content |
|---|---|---|---|---|---|
| Portrait | 390 × 844 | 390 × 243 | 52 | 390 × 191 | 378 × 179 |
| Small portrait | 375 × 667 | 375 × 235 | 48 | 375 × 187 | 363 × 175 |
| Landscape | 844 × 390 | 844 × 130 | 48 | 844 × 82 | 832 × 72 |
| Desktop | 1440 × 900 | 840 × 243 centered | 52 | 840 × 191 | 828 × 179 |

Units are logical CSS px/points, not physical pixels. Original 235/667 is 35.2%, inconsistent with the source's one-third limit. Preserve explicit prototype reference pending owner decision; do not silently ship either interpretation. Subtract actual safe areas and keyboard intrusion. Keep closed band at existing size, no extra toolbar rows. Never grow an ordinary dashboard or use an overlay to evade its budget. Minimum 44 × 44 interactive target; primary actions visible without scrolling; lists and detailed facts may scroll. Preserve exact large numbers, full names in details, fixed action positions. No global shrink-to-fit. In landscape use one horizontal content row (72 high cannot fit two stacked 44 controls); put short sibling tabs or available-points context in spare header width, not extra height. In desktop use extra horizontal space for additional entries, not larger art, text or gameplay view. Use container measurements and test intermediate widths, not just four hardcoded mockups.

**Camera fairness:** Keep camera independent of menu CSS, do not zoom out to compensate for overlays. Compare actual world units left/right/up/down, total visible area, occlusion by controller/HUD/menus, sprite scale and entity visibility at edges with the same player position and camera center. Test portrait, landscape, desktop, resize, rotation, keyboard and menu open/closed separately. Equal area alone is insufficient (landscape may see further horizontally). If exact parity requires neutral margins or bounded aperture, prototype those with owner; don't stretch pixel art or expose extra playable world in desktop margins. Numerical tolerance and canonical aperture are not approved. HTML measures screen rectangles only, not actual world units.

## 3. Visual grammar and shared components

| Role | Treatment | Examples |
|---|---|---|
| Passive information | Recessed #0A1620 or flat aligned facts; no button border or affordance | Max health, XP, balances, quantities |
| Inspection | Recessed, restrained contrasting border #91A9B9, chevron or explicit Details | Damage calculation, item inspection, earned achievement details |
| Navigation/preparation | Raised slate #294963, edge #698397; action verb/recognizable destination | See quest, Open chat, Power +, select a recipe, Find on map, prepare listing |
| Selected tab/filter | Slate with gold border/underline, persistent text cue and selected semantics | Drops, Active quests, Chat channel |
| Adjust/toggle/dismiss | Neutral slate, clear control state; not gold merely because interactive | Quantity stepper, cancel, audio on/off |
| Commit | Solid gold #E4BA68, dark text #141D22; explicit effect | Equip, spend point, craft, accept quest, list for sale |
| Destructive/high-risk commit | Red #753439, clear light text and confirmation as appropriate | Drop item, final attack confirmation |
| Disabled | Muted but readable, reason available; no misleading emphasis | Locked recipe, zero points, invalid listing |
| Item slot | Preserve rarity and selected cues; separate empty silhouette; tapping inspects or prepares, not instant mutation except existing low-risk authorized flow | Gear, bank, Diego bag |

Use explicit semantic role props at component creation (not runtime regex/classification as in the prototype). No two identical appearances for a passive metric and a spend action. Gold is not a generic primary-navigation color. Positive/negative deltas use signed text and color; never color alone. Keep base ivory #F1F0E9 and supporting #BCC8CC on dark #14232F; no unnecessary text color changes; dark ink on light gold. Source Sans 3; headline 22–26, title 17–19, primary labels 14–16, supporting 13–14, metadata 12–13, count badge 10–11 only as exception. Verify contrast, keyboard focus, screen reader labels and touch targets in real implementation. Align facts without grids/borders around every number. Shared components: Header, Facts, Stat, InspectStat, NavigationTile, Tab, Action, Stepper, Slot, Comparison, Progress, EmptyState, Overlay, Confirmation. Use real button/selection semantics; no fake clickable text, demo controls or disabled decoration masquerading as actionable controls.

## 4. Navigation and screen contracts

Main directory: row 1 Bro / Gear / Quests / Map; row 2 Skills / Achievements / Monsters; row 3 Social / Rankings / Settings. Landscape one row. Keep positions stable; no extra group labels. Back returns to origin with filter/scroll/selection intact; siblings replace current route instead of adding history. Root opened from play has Close + Menu, no redundant Back to world. Nested pages retain Back. Contextual links (map, item, upgrade, relevant bag filter) bypass directory; close returns to actual origin. Menu always predictable. No stale map destination from prior quest. Do not introduce teleports or bypass world-only actions.

**Bro and combat:** HUD carries identity, do not repeat portrait and combat level unnecessarily. Bro presents recognizable Sword/Bow/Staff artwork, levels/progress and available points first, then Character stats and Pets, with active weapon damage and health afterward. Distinguish equipped weapon from in-hand weapon. Tap weapon to see actionable upgrades and available points first, then level/progress and actual weapon damage. Use recognizable artwork and readable labels for the six attributes (Range, Power, Speed, Luck, Special, Element). Shared Health, Defense, Mana, Stamina, Dodge, Move speed, Resistance: upgrade choices and available points first, supporting current strength below in portrait or to the right in landscape. Owner clarified each weapon level grants three weapon-specific and three shared points; combat level is highest weapon level, not sum. Verify current repo. Upgrade preview shows actual before/after effect and cost, explicitly spend, independent point pools. When no points, still inspect explanation; don't show actionable plus. Preserve actual stat calculation tree up to seven layers and links to contributing gear. Do not fabricate effective health or damage formulas.

**Gear:** actual bag and equipment two panels in portrait/desktop, bag strip/Equipped switch and horizontal inspection in landscape. Nine slots: Sword/Bow/Staff; Torso/Greaves/Cape; Shield/Amulet/Jewel. Empty slot opens exact relevant filter. Selecting item preserves source panel, replaces opposite panel with preview: identity, source, actual projected character performance/delta beside the eligible action, and Details. Full name in details, two-line quick-look max, fixed buttons. Preserve position on return. Item details reused from loot, crafting, shops and stats with source-specific permitted actions, all actual rarity, effects, requirements and existing restrictions. Real item IDs and capacity checks, atomic equip/unequip, no unowned equip. Use actual whole-character stat calculation, not an invented DPS proxy for armor. Inventory gold/materials shared across all menus.

**Quests:** objective artwork and action → location/progress and map/tracking; history and rewards secondary. Active, Daily, Completed; Now, Steps, Rewards detail tabs. Empty guides to actual quest giver; completed collection guides to hand-in NPC. Accept and hand in within world; tracker reflects real state. Town Board discovery route only, no new quest mechanics.

**Skills and achievements:** ten skills visible, next training action and real level benefit together; farming links to farm, skill guilds to actual guild hall. Achievements combines Feats, titles and records (not every achievement necessarily unlocks a wearable title; real eligibility). Earned/locked, realistic next milestone, actual criteria. Pets empty explains catch steps with location; owned state shows active pet and summon/recall, preserve journal and capacity rules. Rankings one grouped selector, aligned scroll rows, personal ranking only if known. Monsters collection, discovered drops first, actual probability and map action; preserve hidden discovery rules. Social opens Friends, Party and Chat/news siblings. Player profile reused; report/block/mute and combat interactions distinctly labeled. Settings five named destinations (Sound & controls, Account, Notifications, Feedback, About); protect login keys, preserve all feedback categories and actual preferences.

## 5. Buildings, overlays and transactions

Town windows above band, shared fixed header/close and scrollable supporting body, actual content-sized. Landscape bounded window (~496–510 wide in V14 sample), not full-width; portrait modest insets; desktop capped around 600 for ordinary overlays. These are candidate budgets: real safe areas/controller collision must be checked. Do not use hardcoded overlays to conceal ordinary menu overflow. No camera zoom compensation. Critical confirmation intentionally blocks input; ordinary notifications don't. Verify world-input policy for NPC/shop cards and actual multiplayer risk; don't let a modal unintentionally trigger combat or movement. Map, login, creator and drawing are deliberate full-screen exceptions. Chat nonmodal, clear channel and transcript, existing keyboard send, emote and voice. Test actual iOS visualViewport and keyboard; inputs normally 16 px to avoid zoom. Keep original NPC dialogue and quest offer distinct, show objective and rewards before accepting. Preserve original death notice duration (5 seconds) unless owner changes it.

Crafting browse → inspect → commit; recognizable recipe/output art, actual ingredients have/need and output/cost beside the fixed stepper and commit; XP and other supporting facts later. Hide category tabs only during selected recipe, Back restores list. Receipt indicates added to bag and links to actual item. Bank uses actual bag and vault; carried/stored, actual death rules, quantity and capacity. General Store order book distinct from Auction House listing/bid. Preserve all building services, restrictions and live catalogue, no fabricated quests or unlocks. Pet House capacity and price subject to live rules. Daily spin has one destination; keep existing eligibility, rewards, truthful odds and no new gambling mechanics.

**Diego (owner correction):** shelf is for buying tools; player bag is for preparing sale listings. Keep inventory in the existing band, select item then preview quantity and actual permitted price/proceeds, explicitly List for sale. No immediate gold credit. Show listing status and actual settlement when sold, not promise payout on submission. Reservation/escrow, partial fills, fees, price entry, cancellation/return capacity and where to collect proceeds are unresolved mechanics: inspect repo and confirm with owner. Prototype manually enters price and holds stack, but that does not authorize these rules. Handle server failures without losing item or claiming sale. Old source instant-sale rule and V11 instant-sale logic are superseded.

**Trading:** give/receive exact items and gold, both acceptance states, changes invalidate acceptance; actual server validates latest offer revision, ownership, capacity and atomic settlement. Safety actions distinct from friendly actions; no sample acceptance states shipped. Login/account, creator groups Body/Face/Style while retaining ten actual customization options and advanced drawing features; real server and key security. Tutorial at moment of need, retain original timing and eligibility, skip already-understood action.

## 6. Two-question and parity checklist by original feature family

Below are the source-family review hypotheses consolidated from the V10 audit, with the latest Diego correction. “Open” means live data, route, or implementation still needs validation; “Revised” means an earlier prototype change, not production parity. These questions guide design, not extra copy in each screen. Revisit separately for beginner, returning, empty, locked, loading, failure, crowded and disconnected states.

| Source section / destination | Most frequent confusion 1 | Most frequent confusion 2 | Design direction / status |
|---|---|---|---|
| 1.1 HUD | How am I doing? | How do I see my quest or map? | Persistent portrait/Bro, minimap/map, quest shortcut; real HUD, camera and combat states **Open** |
| 1.2 Controller | How do I attack? | How do I defend or swap weapon? | Stable control placement and combat-context controls; full live interaction **Open** |
| 1.3 Context interaction | What can I interact with? | What happens when I tap? | Contextual action verb, avoid obstructing world; live triggers **Open** |
| 1.4 Two-button trial | Where is my bag? | Where are other features? | Gear and Menu shortcuts; **Retain/test** |
| 2.1 Menu | Where is the feature? | How do I return to play? | Stable labeled destinations; **Retain/test** |
| 2.2 Gear | What do I own/wear? | Is this item better? | Compare projected performance; fixed actions; landscape scroll restoration **Revised**; real bag, stack and armor effects open |
| 2.3 Item page | What does it do? | What can I do with it? | Context-based actions, full name and comparison; **Open** for every item type and source |
| 2.4 Bro | How strong am I? | How can I improve? | Weapon artwork, levels and available points first; damage and health secondary; EHP calculation **Open** |
| 2.5 Combat hub | Which weapon do I improve? | How do I spend shared points? | Consolidated into Bro; **Retain/test** |
| 2.6 Weapon page | How strong is this weapon? | What upgrade helps? | Weapon-specific stats/points; unmodeled previews blocked **Revised** |
| 2.7 Stat tree | Why is the number this high? | What affects it? | Aligned sample factors, item and upgrade links **Revised**; actual seven-level tree **Open** |
| 2.8 Shared attributes | How tough am I? | What can I improve? | Upgrades first, supporting summary second **Revised**; real values/preview open |
| 2.9 Equipment showcase | What am I wearing? | How do I change it? | Gear equipment panel; verify character appearance functionality is not lost **Open** |
| 2.10 Life Skills | How do I train? | What do I unlock? | Ten fixed tiles, next milestone detail **Revised**; nine skill curves missing |
| 2.11 Feats | What have I earned? | How do I earn the next one? | Achievements and criteria; full 33 entries, rarity and title eligibility **Open** |
| 2.12 Pets | How do I catch one? | How do I summon one? | Empty/owned action states **Revised**; full catalogue and capacity purchase open |
| 2.13 Journey | What have I accomplished? | What record matters to me? | Records under Achievements; real lifetime totals **Open** |
| 2.14 Titles | Which titles can I wear? | How do I wear/remove one? | Earned achievement action; **Retain/test**; verify full title selection |
| 2.15 Other player's character | Who is this? | What can I learn/do? | Unified public profile; exact visible equipment/privacy **Open** |
| 2.16 Quests | What do I do now? | Where do I go? | Objective, progress, map, empty state **Revised**; real steps, next quest and hand-in in world |
| 2.17 Social | How do I add someone? | How do we play together? | Friends/Party/Chat; skill guild path separate; **Retain/test** |
| 2.18 Friends | Who is online? | How do I contact/add them? | Requests and contextual player actions; real friends/online list **Open** |
| 2.19 Ranks | What is ranked? | Where do I rank? | One selector and personal row; real board definitions and entries **Open** |
| 2.20 Codex | What drops? | Where does it spawn? | Drops and map **Revised**; catalogue/location and locked states open |
| 2.21 Homestead | What is growing? | How do I reach my farm? | Farming path and map location **Revised**; actual crop status/travel open |
| 2.22 Settings | Where is the setting? | How do I return? | Five named destinations; **Retain/test** |
| 2.23 Sound/settings | How do I change it? | Did it apply? | Toggles/sliders; live prefs and side choice **Open** |
| 2.24 Notifications | What can I hide? | Will important alerts remain? | Clear named preferences; live policies **Open** |
| 2.25 Account | How do I keep access? | How do I switch/log out? | Demo key, switch and logout **Revised**; real account security/flows open |
| 2.26 Feedback | How do I report an issue? | Was it sent? | Form and honest sample status; live submit **Open** |
| 2.27 About/privacy | Where do I get help? | What happens to my data? | Link real terms/privacy, version/help; **Open** |
| 3.0 Building frame | What can I do here? | How do I exit? | Consistent header/close, body scroll; validate every size and keyboard **Open** |
| 3.1 Blacksmith | What can I make? | What am I missing? | Have/need, XP and level locks; real recipes incl. possible Amulet tab **Open** |
| 3.2 Woodworker | Can I make a bow or tool? | What is missing? | Same craft pattern; recipes/materials **Open** |
| 3.3 Gem Works | Which gem can I get/use? | What will it cost? | Odds, input/output, explicit bulk confirm; real server outcomes/set rules **Open** |
| 3.4 Cookhouse | What can I cook? | What does it do? | Benefits/ingredients and campfire distinction; meal effects **Open** |
| 3.5 Gambling/Daily rewards | Is free reward ready? | What are the risks/rules? | Eligibility and accurate outcomes; wheel and reward state **Open** |
| 3.6 Feed & Seed | What can I plant? | How much does it cost? | Price/yield/eligibility, delivery; full seeds **Open** |
| 3.7 Land Office | How do I reach my farm? | What happens when I travel? | World-authorized travel; no teleport from menu unless game supports it **Open** |
| 3.8 Bank | What is safe? | How do I deposit/withdraw? | Balances/amounts, exact death rules and actual vault capacity **Open** |
| 3.9 General Store | What is available? | What will I pay/receive? | Order book first; real reserve/order/cancel mechanics **Open** |
| 3.10 Auction House | What can I bid on? | What will I pay? | Listing detail and review; bid lifecycle, settlement **Open** |
| 3.11 Saloon | How do I join others? | What is the difference between party/alliance? | Status and clear routes; real alliance board **Open** |
| 3.12 Post Office | What is waiting? | How do I collect? | Claim rows and all; actual inventory/claim handling **Open** |
| 3.13 Sheriff/Arena | What can I compete in? | What are the rules? | Entry cost/requirements; real player list and sign-up **Open** |
| 3.14 Guild Hall | What guild can I join? | What do I gain? | Actual guild benefits and requirements **Open** |
| 3.15 Hotel | What does resting do? | Does it cost anything? | Recovery, benefit, free rest; actual effect/cooldown **Open** |
| 3.16 Town Board | What could I do? | Where do I start? | Activities and map/pins; real board destinations **Open** |
| 3.17 Diego | How do I list an item from my bag? | How much gold will I receive if it sells? | Actual bag-linked listing preparation, quantity, gross proceeds, explicit List for sale; no instant payout; production economics **Open** |
| 3.18 Ace | What are the odds? | What could I lose? | Accurate odds/stake/review; gold/items/records implementation **Open** |
| 4.1 NPC/quest offer | What does this NPC want? | What happens if I accept? | Dialogue, objective and rewards; world-only acceptance/hand-in **Open** |
| 4.2 Map | Where am I going? | Is it safe there? | Schematic destination only; actual geography, risk and pins **Open** |
| 4.3 Pin cards | Which pin is this? | How do I remove or replace it? | Named pin actions, real coordinate mapping **Open** |
| 4.4 Chat | Who hears me? | How do I send or mute? | Channel and input, emotes/voice; safety and live keyboard **Open** |
| 4.5 Player list | Who is nearby? | How do I interact? | Names/level and player card; live list **Open** |
| 4.6 Player card | Who is this? | How can I interact/protect myself? | Profile and safety controls; real actions **Open** |
| 4.7 Attack confirmation | Am I attacking this person? | What risk am I taking? | Explicit target, actual PvP rules and safe alternatives **Open** |
| 4.8 Inspect | What is this player's strength? | What gear do they use? | Consistent profile and allowed data; **Open** |
| 4.9 Party chip | Who is in my party? | How do I leave or manage it? | Member state/permissions and confirmation **Open** |
| 4.10 Trade request | Who wants to trade? | What will I give/get? | Optional prompt, exact offer, accept reset on changes; atomic server commit **Open** |
| 4.11 Daily spin | Can I spin now? | What can I win/lose? | Eligibility and real wheel/reward rules **Open** |
| 4.12 Fish weigh-in | How large was my catch? | Was it a record? | Concise result and records route; actual data **Open** |
| 4.13 Death | What happened? | What did I lose and where next? | Five-second notification; real death/respawn **Open** |
| 4.14 Window failure | Why didn't this open? | How do I recover? | Clear error/retry; genuine recovery **Open** |
| 4.15 Unseen windows | What is happening? | What can I do? | Source lacks full screenshots; inspect repository **Open** |
| 5.1 Login | How do I continue? | How do I start a new bro? | Continue/create with key security; actual loading **Open** |
| 5.2 Creator | How do I change appearance? | How do I enter? | Persistent preview/name and grouped choices; actual editor options **Open** |
| 5.3 Drawing | How do I draw? | How do I save or undo? | Editor, controls and state; real palette/tools/art save **Open** |
| 5.4 Welcome | What do I do first? | How do I skip/recover help? | Contextual tutorial and action; live triggers, timing **Open** |
| 6 Owner tools | What does this tool do? | Will this change the live world? | Separate owner-only review; do not merge with player interface **Open** |

## 7. Authoritative data and failure handling

Keep current React/Pixi/game/server architecture and actual rules. Shared inventory, bank, listings, crafting, equipment, points, quests, map and social state; no duplicate sample balances or local formulas. Use stable instance IDs and stack quantities, server preview when required, pending and explicit success/error, idempotent request/authoritative commit. Never display a fabricated actual value; unavailable data gets a short accurate explanation. Preserve current visibility/privacy and permissions. Do not replace feature logic that wasn't captured in the original screenshots. Owner tools remain permission-gated and must not leak into public menus.

## 8. Implementation order and release checklist

1. Inspect current repository and original source families. Build feature/route crosswalk, reconcile pending changes, list gaps and conflicts before deleting old routes. Treat V17 HTML as design reference only.
2. Implement shared primitives, geometry, explicit intent props, close/back semantics and focus. Test with actual UI before building each menu family. Implement only the shared foundation, Bro, Combat and Gear first; test in the actual game and obtain owner review before rolling out Quests, progression/social/settings, buildings/overlays/onboarding.
3. Test all routes/states at actual reference sizes plus intermediate widths, safe areas, orientation and iPhone Safari keyboard. Measure full viewport, band, header, content, hit target, primary action visibility and text clipping. Verify overlay/controller collisions and no hidden content merely because a geometry check passes. Use screenshots and actual taps. No global text shrinking. Preserve performance while game remains active.
4. Test end-to-end tasks: equip missing bow, inspect & spend points, craft and find output, bank/withdraw same stack, Diego list/cancel/settlement without instant credit, quest objective/map/hand-in, monster loot location, pet, party/trade, settings, death recovery. Test failed, pending, full inventory, long name, large number, zero points, locked and latency states. Confirm actual account/owner permissions.
5. Camera parity separate gate: measure directional and total world extent, sprite scale and occlusion at equivalent gameplay states. Resolve numerical tolerance with owner; no material device advantage. Do not mark pass from CSS.
6. Test real players without teaching routes, including appropriately supervised younger players and experienced players. Measure correct first destination, successful task completion, time, mis-taps, confusion questions, accidental commitment and return-path errors. Aspirational target ≥95% first-choice and task completion on core flows, zero clipped controls/accidental commitments or meaningful device advantage; not measured results. Mandatory gates: fit, readability, intent distinction, answers both questions, predictable navigation, functionality parity, fairness. Failure of one prevents sign-off.

## 9. Prototype evidence and limitations (historical, not production approval)

V15 is a styling/semantic pass on V14, no new game mechanics or geometry budget. Scripted Chromium scan covered 38 dashboard landing states, 19 town entry points and 11 requested overlay entries at standard portrait (not every name necessarily resolves to an independently implemented overlay). No unclassified visible button in the sampled scan, which uses a heuristic classification and is not proof of correctness or full coverage. Geometry regression: 38 dashboard states × four exact viewports = 152 checks; no reported target/clipping/size failures or page errors in this run. Does not establish legibility, touch ergonomics, real controller collisions, actual iPhone Safari, intermediate widths, production parity, player comprehension or camera fairness. Remaining open work includes complete stat tree, full item/skill/achievement/pet/ranking catalogues, live map/farm data, trade and listing economics, advanced drawing, production controls and keyboard. Earlier spec conflicts are explicitly overridden above, except unresolved small-phone height and camera tolerance. Do not call this a finished 10/10 interface; validate in the game.


V17 is the latest visual-first/action-first design revision. It updates Bro, weapon upgrades, character upgrades, quest detail and skill detail; remaining screens retain V16 patterns and require the same semantic and visual-priority review. The earlier V15/V16 geometry runs reported 152 sampled checks; V17 reported 20 sampled checks for the updated core screens across four reference sizes. These are prior prototype results, not fresh validation of production or of every V17 screen. The character attribute artwork is provisional. Portrait backdrops and cropped item artwork are visualization aids; use actual production assets. Landscape and desktop are schematic, not camera-parity evidence.

## 10. First engineering deliverable

Read this specification and inspect the current repository before editing. Reconcile any concurrent changes. Produce a short feature crosswalk and list of unresolved conflicts; then implement reusable semantic components, adaptive shell, Bro, Combat and Gear on a reviewable branch. Preserve existing gameplay functionality and server authority. Do not mass-replace all menus at once. Provide actual screenshots and measured layout results at each reference size, test results for core player journeys and a list of gaps requiring owner input. Resolve the small-phone band conflict, camera tolerances and Diego's unsettled market mechanics with the owner rather than inventing rules. Await owner review of the core implementation before expanding the rollout.
