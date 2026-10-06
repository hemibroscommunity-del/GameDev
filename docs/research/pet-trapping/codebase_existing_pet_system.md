# Existing pet & trapping system — audit notes (read-only)

Repo at f337dfa (v2.3.3101, 2026-10-06). All claims cite file:line.
Status: COMPLETE — sections 0-7 plus owner-update items (a) overkill and (b) other pet sources.

## 0. Baseline (verified)
- server/src/pets.js (201 lines): PETS config pets.js:41-65; PET_NAMES/PERSONALITIES/ELEMENTS pets.js:67-69;
  _sanitizePets pets.js:83-102; _petsAdoptOnJoin pets.js:110-128; _handlePetCapture pets.js:132-200.
- Capture validation order pets.js:135-151 (not-now, no-monster via _monsterDamageable, too-healthy, too-far, slots-full, no-trap);
  trap consumed pets.js:154-155; chance pets.js:157-161; escape +5 XP pets.js:163-168; success builds pet from m.arch/m.element/m.level/m.emoji/m.color pets.js:170-181;
  monster killed for all, respawn via _monsterRespawnMs, no loot/XP/quest pets.js:191-196.
- Spec docs/specs/pets.md (111 lines) matches.

## 1. Server routing, caps, storage, items (DONE)

### Routing
- Import: server/src/index.js:79-83 (`import { petMethods, PETS } from './pets.js'`); mixin index.js:5799-5800 (`Object.assign(GameRoom.prototype, petMethods)`).
- Dispatch: `case 'pet_capture':` index.js:5299-5307 → `this._handlePetCapture(session, msg.payload || msg)` (sync, only if session.id).
- PRIVILEGED_EVENTS (index.js:379 Set) contains `'pet_capture_result'` at index.js:498-499 (comment "pet-capture outcomes are server-rolled + private"). No other pet event types exist; capture success arrives as `pet_capture_result` + the `lifeSkills` field of `player_state`.
- Client send path: ONLY src/ui/panels/MenuBar.jsx:258 (`S.channel.send({type:'broadcast', event:'pet_capture', payload:{monsterId}})`). The shim forwards non-move broadcast events as `{type: msg.event, payload}` through the batched input buffer / PRIORITY_EVENTS (src/networking/wsClient.js:4443-4456), so it would reach the worker. Tests also send it: server/test/pets.test.mjs:73, server/test/burrow.test.mjs:224.

### Caps + kill switches
- `caps.pets: true` and `caps.petLoot: true` are baked into the state_sync caps literal at server/src/join.js:1422 (comment for petLoot at join.js:1384-1389); `..._liveFlags` is spread LAST over that literal (end of join.js:1422; flags loaded join.js:1317).
- NO server-side kill switch: `_handlePetCapture` (pets.js:132-200) and the viaPet branch of `_handleLootPickup` (index.js:4268-4280) read no live flag.
- `pets: false` in liveflags (a legal lower-case name per liveops FLAG_NAME_RE, docs/TRAPS.md:4764-4790) would only un-advertise the cap — and the client's response to a missing cap is to RUN THE LEGACY LOCAL ROLL (MenuBar.jsx:256-311: local Math.random, local createPet, local XP, local `m.alive=false`). So the "kill switch" re-enables client theatre, it does not disable capture.
- `petLoot` is camelCase → cannot be thrown via POST /api/admin/flags at all (TRAPS §117, docs/TRAPS.md:4764-4790). Un-advertising it would also fall back to the legacy client self-credit vacuum (BroTown.jsx:6545-6609).

### Storage
- Pets live INSIDE the rpg blob: `rpg:<playerId>` → `lifeSkills` (persistence.js:179-183 `_saveRpg` writes `lifeSkills: ps.lifeSkills || {}`; same at persistence.js:447 in the echo). Shape `lifeSkills.pets: Pet[]`, `lifeSkills.activePet: number|null` (client default src/data/gameSystems.js:1124-1126).
- Handoff rule 1 (docs/ARCHITECTURE-HANDOFF.md:43-51): never add a field to the rpg blob; registry row docs/ARCHITECTURE-HANDOFF.md:57. Pets are inside the existing `lifeSkills` field, so adding pet sub-fields is "inside lifeSkills" (not a new blob field) — but `_sanitizePets` WHITELISTS fields at every join (pets.js:83-102), so any new pet field is silently stripped unless the whitelist changes.
- Size: a sanitized pet = 10 short fields (pets.js:89-99), ~200-250 bytes JSON; 6 pets ≈ 1.5 KB. Fine vs DO's 128 KiB per-value limit, but the whole lifeSkills object is ALSO echoed in player_state (persistence.js:447) and v2 delta re-sends the ENTIRE lifeSkills object whenever any life skill changes (persistence.js:571-579, JSON compare per top-level key) — every gather/cook XP tick re-sends all pets too.
- Join load: stored record → `ps.lifeSkills = stored.lifeSkills` (join.js:723) + `healLifeSkillLevels` (join.js:724). First connect: lifeSkills taken WHOLESALE from the client payload `msg.data.rpgLifeSkills` (join.js:853), then `healLifeSkills` (array/{} heal, migrations.js:62-75) + `healLifeSkillLevels` (level 0→1 only, migrations.js:88-98). NO clamp on life-skill LEVELS at bootstrap (grep found none) → a fresh identity can claim trapping/woodcutting Lv 999 (chance then saturates at the 0.95 clamp, pets.js:159-161).
- `_petsAdoptOnJoin` called at join.js:1265-1267 (after gear lock / NML skull load, before clans).
- Migrations: migrations.js:56-75 heals `pets` object→array and `activePet` {}→null (v2.3.769 corruption); LIFE_SKILL_KEYS incl. 'trapping' migrations.js:88. No pet-specific registry migration.
- Character reset deletes `rpg:<pid>` (persistence.js:315-345) — the only way pets ever disappear server-side.

### Trapping XP / levels
- `_addLifeSkillXp` server/src/gathering.js:487-499; threshold `ceil(LIFE_SKILL_XP_BASE × 1.08^(L−1))` gathering.js:481-483 with LIFE_SKILL_XP_BASE = 1000 (gathering.js:178, doubled from 500 at v2.3.3090). No level cap (while loop).
- Trapping pays +5 per escape (pets.js:164) and +15 + 2×monsterLvl per capture (pets.js:196): Lv1→2 needs 1000 XP ≈ 59 captures of Lv1 monsters. Compare gathering: `ceil(((tierLvl×1.5)+5)×25)` ≈ 163 XP per tier-1 harvest swing (gathering.js:474) — trapping XP was never given the 25x life-skill boost.
- HARD CEILING: the server never removes a pet (grep: no code shrinks `lifeSkills.pets` outside sanitize/reset) and `slots-full` is checked BEFORE the trap is spent (pets.js:150), so after 6 captures every attempt is refused with no XP. A player can earn at most ~6 captures' + escapes' XP for life.
- Trapping is also a leaderboard category (server/src/leaderboard.js:67) and in chainscore's skill list (server/src/chainscore.js:61).

### ARCHETYPES (server/src/data.js:295-304; client mirror src/data/gameSystems.js:4966-5041)
| key | hpMult | dmgMult | spdMult | emoji | color | used by (server ZONES, data.js:342-374 + _variantForArchInZone index.js:1308-1324) |
|---|---|---|---|---|---|---|
| fodder | 0.6 | 0.8 | 1.0 | 🟢 | #3dd497 | meadow, ember (variant fireGoblin), thunder, mist (mireWisp), verdant (blueSlime) |
| brute | 1.5 | 1.3 | 0.7 | 🪨 | #6b6b6b | hollows, tidal, mist (bogLurker), verdant→thornShambler mapping |
| swarm | 0.4 | 0.6 | 1.2 | 🦇 | #9333ea | no zone spawns it today |
| sentinel | 1.0 | 1.0 | 1.0 | 🛡️ | #e8e8e8 | no zone spawns it today |
| volatile | 0.8 | 1.0 | 1.0 | 💥 | #ea580c | sky (drawn as mummy) |
| stalker | 0.7 | 1.2 | 1.3 | 👁️ | #2C3E50 | sky (drawn as mummy) |
| hexer | 0.9 | 0.8 | 1.0 | 💀 | #8E44AD | sky (drawn as mummy) |
| snowman | 1.3 | 1.1 | 0.8 | ⛄ | #b0d8f0 | frost |
- Client has a 9th, `fireGoblin` (🔥 #ea580c, spdMult 3.0) at gameSystems.js:4985-4991; server has no such archetype (it is a VARIANT of fodder server-side). Archetypes are stat templates (hp/dmg/speed multipliers) + an emoji/colour; the visible creature is the zone's VARIANT.
- `_makeZoneMonster` (index.js:1512-1582) stamps every monster with `arch`, `variant`, `level`, `element: zone.element`, `emoji: a.emoji`, `color: a.color` (index.js:1551-1576). So emoji/colour are ARCHETYPE values, not the look.

### Trap item + shop
- Item key in bag: `basic_trap` (consumed pets.js:151-155; granted by the `trap` effect in cooking.js:473-475 `_applyShopItem`).
- Server shop: REMOVED from `SHOP_ITEMS` at v2.3.2069 (server/src/data.js:468-488, owner: "Remove the 20g trap from the shop it has no effect in the game currently"; the comment says to put it back "the day the capture UI exists"). It was `basicTrap` cost 20, effect 'trap'.
- Diego's buy-back table still prices `basictrap: 20` (server/src/shop.js:138; he buys at BUY_RATE 0.5 → ~10g). shop.js:176-183 notes traps were "genuinely only in the retired shop".
- Client: `SHOP_ITEMS_FOR_SALE` [{key:'trap_basic', 'Basic Trap 🪤', cost 20, 'Capture weakened monsters'}, whetstone, antidote] at src/data/gameSystems.js:6226-6241 — exported but imported by NOTHING (only referenced in a comment, src/ui/mobile/dash/InventoryPanel.jsx:337). VendorPanel's SHOP_STOCK (src/ui/panels/buildings/VendorPanel.jsx:254-260) has no trap.
- Icons: '🪤' glyph for `trap_basic`/`basictrap`/`basic_trap` (src/ui/mobile/dash/InventoryPanel.jsx:348-353), TradeWindowPanel `basic_trap: '🪤'` (src/ui/panels/TradeWindowPanel.jsx:97). No art file for a trap item found.
- TODAY THERE IS NO SOURCE of basic_trap (grep: only pets.js and cooking.js reference it server-side). Only legacy bags (or trades of legacy traps) hold any.
- Other trap/pet items: searched cage, net, bait, lure, collar, leash, treat, pet food, egg, tame/taming, companion, familiar, mount → NOTHING pet-related in code. Hits were unrelated (e.g. `taming` is a fake skill in src/ui/mobile/mockProfile.js:38 / InspectCard.jsx:290-296; GameApp.jsx:101 reads a non-existent `taming` level; combat.js:468 "big-hit taming"). Pet item type 'pet' exists only in the mobile mock inventory model (src/ui/mobile/mockItems.js:7, inventoryBus.js:13/28, EquippedTab.jsx:10/213, ItemArt.jsx:82, ItemTooltip.jsx:106/231/294/305) — mock UI scaffolding, no real data source.

### Quests (dormant)
- Beastmaster Kai chain kai_1 (capture 1 pet), kai_2 (3 pets), kai_3 (`_questFlags.petLootCount >= 20`) at src/data/gameSystems.js:7088-7154; unlock strings 'pet_combat', 'pet_loot_upgrade', 'trapping_cap_50' are consumed by NOTHING (grep). Server rewards kai_1..3 at server/src/data.js:731-733 with no `objective` → client-trusted completion (data.js:529-540 explains: "pet counts only exist client-side").
- Beastmaster Kai NPC is not spawned: NPC_DATA emptied (src/data/gameDisplay.js:5285-5291; the Ace naming note gameDisplay.js:5546-5553 warns reusing 'Beastmaster Kai' would switch the dormant chain on). Guild "Beastmaster's Lodge" (Guildmaster Claw, 🪤, #f97316) exists in the guild table src/data/gameSystems.js:1566-1572.

## 2. How a capture is triggered TODAY — reachability (DONE)

VERDICT: capture is UNREACHABLE for a normal player (phone or desktop). No source of traps exists either.
- The ONLY client sender of `pet_capture` is the 🪤 button in MenuBar.jsx:234-312 (server path MenuBar.jsx:256-261; legacy local roll MenuBar.jsx:262-311).
- MenuBar IS mounted (src/ui/BroTown.jsx:122 import, BroTown.jsx:14046 `React.createElement(MenuBar, {...})`) but its root div is `display: 'none'` (MenuBar.jsx:62-67: "Legacy bottom toolbar — replaced by the utility wheel (§1.7d). Hidden in v14.x"). The button is in the DOM but invisible and untappable. Server-side confirmation of the same finding: server/src/data.js:476-482 (v2.3.2069).
- No other path: grep of src/ for `pet_capture` returns only MenuBar.jsx:258; no trap/capture action in src/game/desktopControls.js, src/ui/panels/TouchControls.jsx, src/ui/mobile/actionBus.js, the utility-wheel bindings (src/ui/GameApp.jsx:390-411), the mobile dashboard (src/ui/mobile/dash/* — no `pets`/`activePet` reference at all), or BroTown.jsx.
- Even if the button were visible, a capture needs `ps.inventory.basic_trap >= 1` (pets.js:151) and nothing sells or grants traps since v2.3.2069 (§1 "Trap item + shop"). Copy still says "Need a trap! (Vendor sells them)" (src/networking/gameEvents.js:4248) — stale.
- UX of the old button (for reference): requires a hard lock-on `S.lockedTarget.type === 'monster'` (MenuBar.jsx:240-243), sends `{monsterId: m.id}` when `S._serverCaps.pets && S._serverMonsters && S.channel && m.id` (MenuBar.jsx:256). Feedback comes from `pet_capture_result` (gameEvents.js:4225-4259): success popups "Captured <name>!" and "<emoji> <archetype> Lv<n>" + three beeps; errors mapped to text; failure "Escaped!". No trapping level-up celebration on the server path (the MenuBar local path had one, MenuBar.jsx:295-296); the level arrives silently via the lifeSkills echo.

### PetHousePanel reachability
- Opened ONLY at the farm: `S._nearPetHouse` is true only when `S.currentZone === 'farm_home'` and the player is inside `ZONES.farm_home._petHouse` ± 2 tiles (BroTown.jsx:5462-5468). The rect is set by the procedural `generateZoneMap('farm_home')` (src/data/gameDisplay.js:851-866: x=(3+2)×TILE, y=(19+1)×TILE, 4×3 tiles), which runs on every farm entry (gameEvents.js:892, BroTown.jsx:11982). Openers: the "🐾 Pet House" interact-prompt button (BroTown.jsx:13504-13530) and desktop E (src/game/desktopControls.js:128-133). Also `window._uiPanels.petHouse` (BroTown.jsx:3036) — used by QA screenshot tools (tools/qa/qa-ui-shots.mjs:64, tools/qa/mp/mp-textfloor.mjs:43), no gameplay caller.
- The farm's ground is a painted map now (`farm_home: '/maps/farm_v1.webp'`, src/rendering/tiledMaps.js:78; walk mask tiledMaps.js:194). Whether the painting shows a pet house at that trigger rect is NOT verifiable from code (not checked visually).
- Reachable from the Wheel: Land Office door → 'farmhome' (src/data/wheelBuildingDoors.js:41) and Feed & Seed → 'farm' panel (wheelBuildingDoors.js:40, FarmPanel.jsx:109 `rememberFarmTrip`); the farm gate leads back to the Wheel (BroTown.jsx:11980). So: Wheel → Land Office → farm → walk to the pet-house rect → panel. With zero pets the panel says "No pets yet. Weaken monsters to <20% HP and tap 🪤!" (PetHousePanel.jsx:153) — pointing at a button nobody can see.
- Other pet lists: legacy InventoryPanel pet grid (src/ui/panels/InventoryPanel.jsx:1080-1174, set-active on tap at 1125-1133) and legacy SkillsPanel (src/ui/panels/SkillsPanel.jsx:256-260 "Capture weakened monsters as pets") are opened only by the hidden MenuBar (MenuBar.jsx:177, 182) or `window.__broLegacyUI.inventory/skills` (BroTown.jsx:8413-8429), which no gameplay code calls (GameApp.jsx:403-411 wires only social/clan/encyclopedia). Effectively unreachable.
- Reachable read-only surfaces: dashboard Skills (Trapping tile, icon /icons/ui/skill-trapping.webp, earnHint "Set traps for small creatures and collect the catch." — describes a mechanic that does not exist; src/ui/mobile/sheet/skillsModel.js:55, no level ladder per skillsModel.js:7-9/44-46), Leaderboard 'trapping' category (src/ui/mobile/dash/LeaderboardPanel.jsx:39; server leaderboard.js:67), PlayerProfilePanel pet card (src/ui/panels/PlayerProfilePanel.jsx:153-154, 287-296), SelfPanel "Pet: <name>" (src/ui/mobile/dash/SelfPanel.jsx:61), Guild Hall's skill guilds include Trapping / "Beastmaster's Lodge" (gameSystems.js:1566-1572; server GUILD_SKILLS data.js:821-824).
- PROFILE PLACEHOLDER: when you (or a peer whose relay landed) have NO pet, the profile shows the owner's mockup pet "Glacier, Frost Fox, rare 🦊" (src/ui/panels/playerProfile.js:58, used at playerProfile.js:185 and 221-228, `preview: true` → `data-preview` attr at PlayerProfilePanel.jsx:290). Every player appears to own a Frost Fox.

## 3. Client pet logic (DONE)

### Data (src/data/gameSystems.js)
- `createDefaultLifeSkills` holds `trapping:{level:1,xp:0}` (gameSystems.js:1111-1114), `pets: []`, `activePet: null` (1124-1126); `migrateLifeSkills` heals pets/activePet shape (1131-1142) and level 0→1 (1180-1187).
- Constants: `PET_LOOT_RADIUS = 80`, `MAX_PET_SLOTS = 6`, `TRAP_HP_THRESHOLD = 0.20` (1191-1194).
- Evolution: `PET_EVOLUTION_TIERS ['Base','Evolved','Ascended','Mythic']`, `PET_EVOLVE_LEVEL_REQ [1,10,25,50]` (1197-1198; the REQ is imported by nothing — no gate), `evolvePet(p1,p2)` (1200-1231): consumes two pets, new pet level = max+2, tier+1, `secondaryArchetype`, `secondaryElement`, `combatPower`, `enchantSlots = 1+tier`, keeps p1's emoji/colour/personality.
- Enchant: `PET_ENCHANT_COST {common:{gem:1,gold:50}, rare:{gem:3,gold:200}, epic:{gem:5,gold:500}}` (1234-1247, imported by nothing), `enchantPet(pet, element)` pushes `{element, power: 10+2·lvl+15·tier}` into `pet._enchants` up to `enchantSlots`, sets `enchantElement` (1248-1260).
- `createPet(monster)` (gameSystems.js:2004-2019): archetype from `monster.archetype || monster.type || 'fodder'` (the server uses `m.arch`, pets.js:170 — field names differ), id random 0-999, personality one of 5. Only caller: MenuBar's legacy path (MenuBar.jsx:286).
- No feeding, happiness, hunger, XP, levelling, abilities, buffs, rarity, or species tables for pets anywhere (grep). Personality and element exist as data only.

### BroTown.jsx — what an active pet actually does (BroTown.jsx:6454-6663, every frame, LOCAL PLAYER ONLY)
1. FOLLOW: seeds at player −30/+20 when `!S._petX` (6461-6464); steps 2.0 px/FRAME toward the player when >50 px away, drifts out 0.5 px/frame when <25 px (6466-6481). Frame-rate dependent (no dt). `S._petX` is reset only by the set-active taps (PetHousePanel.jsx:179, InventoryPanel.jsx:1129) — NOT on zone change, death, respawn or dungeon entry (grep of src/ for `_petX`), so after any teleport the pet walks from its old coordinates at 2 px/frame (~120 px/s at 60 fps; across the 43,008 px Wheel that is minutes).
2. PERSONALITY: idle jitter only — playful sin/cos wobble, curious x-sway, anxious random jitter; lazy/bold do nothing (6483-6493).
3. LOOT VACUUM: for each ground pile within `PET_LOOT_RADIUS` 80 px of the PET's position (6496-6499): with `caps.petLoot` and a server pile, sends `loot_pickup {lootId, zone, viaPet:true}` with its own in-flight flag + 5 s watchdog (6512-6545); otherwise the legacy local self-credit (weapons equip/stash/auto-sell, coins, shard) (6546-6609) — stomped by the next echo against a real worker. Client-side recipient pre-check mirrors the server (6520-6521). Credit popup "PET +N G" at the pet (src/networking/wsClient.js:3103-3109) and `R._questFlags.petLootCount++` (wsClient.js:3105-3106; BroTown.jsx:6606-6607).
4. "PET COMBAT" (6613-6662): every 1.5 s, the nearest alive monster within 40 px of the pet takes `ceil(weaponDmg × 0.15 × (1 + 0.02·petLvl))` via `nearestM.curHp -= petDmg` (6630-6636) with a popup "<emoji> -N" and particles. PURE CLIENT THEATRE: no message is sent, and the local hit paths are otherwise gated on `!S._serverMonsters` precisely because the server owns monster HP (wsClient.js:993-997); `curHp` is overwritten by the next server delta (wsClient.js:855). Players see fake damage numbers; the local HP bar can read lower than the server's (which then confuses the ≤20% capture gate). Runs regardless of the dormant kai_1 'pet_combat' unlock. Precedence bug in its guard: `if (S.monsters && !S._petAtkCd || Date.now() > (S._petAtkCd || 0))` (6615) — evaluates `S.monsters.forEach` even when S.monsters is falsy (latent; S.monsters is never nulled in src).
- Level: only scales the fake combat damage (+2%/lvl) — no server effect. Element/enchant/evolution/combatPower/secondary fields: displayed only (PetHousePanel), no gameplay effect anywhere.

### PetHousePanel.jsx (540 lines) — every action is a CLIENT-ONLY blob edit
- Pets tab: tap = `R.lifeSkills.activePet = isActive ? null : pi`, `_petX = null`, localStorage `bt_rpg` (PetHousePanel.jsx:176-184). Not sent to the server.
- Evolve tab: `evolvePet(p1,p2)`, splice both, push the result, remap activePet, popup + levelUp sound, localStorage (PetHousePanel.jsx:365-397). No cost, no level gate, not sent.
- Enchant tab: `R.coins -= 50` locally then `enchantPet(p, key)` for any non-endgame ELEMENT (PetHousePanel.jsx:497-516). No gem cost; coins never charged server-side (the echo restores them).
- There is NO rename and NO release anywhere (grep). Header: "N/6 pets · Trapping Lv N" (PetHousePanel.jsx:111).
- WHAT HAPPENS TO THESE EDITS: the server never accepts pets/activePet after the first-ever join (only `_petsAdoptOnJoin`, pets.js:110-128, and first-connect bootstrap join.js:853). When the server next echoes `lifeSkills` (any life-skill XP change, any rejoin — v2 delta sends the whole lifeSkills object, persistence.js:571-579) the client's per-key merge OVERWRITES `pets` and `activePet` with the server's copy (src/networking/wsClient.js:1853-1870). So an evolve/enchant/active-switch survives only in localStorage until the next echo, then silently reverts. Re-join also re-sanitizes and strips every non-whitelisted field (evolutionTier, _enchants, combatPower, ...) (pets.js:83-102) and REGENERATES pet ids each join (pets.js:90).
- Consequence for the vacuum: the server's `activePet` is only ever 0 (first pet) or the index set at first capture (pets.js:116-117, 124-125, 183-185) — switching pets has no server meaning; switching the pet OFF locally still leaves the server treating you as having an active pet (the client just stops sending viaPet).

### Rendering (src/rendering/systems/entityRenderer.js)
- `_updatePet(S, now)` (entityRenderer.js:14937-14993), called every frame (8226): a Container in `entityLayer` with a shadow ellipse, the pet's EMOJI as a 15 px `Text`, and its name in a 7 px Text, bobbing; falls back to a 6 px coloured disc if no emoji. No textures, no monster look, no animation frames — "No asset load is involved" (14929-14933). It does NOT depend on the monster's look being loaded. History: invisible until v2.3.2078 (read the never-written `S._activePet`, comment 14913-14936).
- World scale: since VIEW_OUT 0.77 the Wheel draws at ~0.606 on the QA phone (CLAUDE.md v2.3.3020), so the 15 px emoji is ~9 CSS px and the 7 px name ~4 CSS px — tiny.
- A Wheel pet looks like its ARCHETYPE emoji: fire goblin / storm slime / blue slime / mire wisp = 🟢 green (fodder); rock golem / fishman / bog lurker = 🪨 (brute); snowman = ⛄; Buried City mummies = 👁️/💀/💥 (stalker/hexer/volatile); a Wheel-dungeon boss = BOSS_EMOJI or 🐉 in red (dungeon.js:396-397). The pet record keeps neither `variant` nor `home` (pets.js:171-181), so the creature's real look and land are lost at capture.

### Other players
- Only the LOCAL pet is drawn in the world (no peer pet code in src/rendering; `_updatePet` reads `S.rpg`).
- Peers learn your pet only through the client-claimed 2 s `track` relay: `pet: <active pet emoji>` (BroTown.jsx:7465) — relayed by the server's TRACK_COSMETIC_KEYS (server/src/index.js:709), not on the join road (join.js:57) — plus `rpgData.petInfo {name, species, level}` (src/ui/panels/playerProfile.js:97-112). Shown in InspectPlayerPanel as a text chip (src/ui/panels/InspectPlayerPanel.jsx:410-412) and the PlayerProfilePanel pet card (playerProfile.js:120-135, 185). All of it is unverified client claim (any emoji ≤64 chars).
- `src/ui/GameApp.jsx:96` reads `rpg.pet` (does not exist → always null); the mobile InventorySurface/InspectCard with a 'pet' equip slot are NOT mounted (GameApp.jsx:689-691) and are fed only by mock data (src/ui/mobile/mockItems.js, mockProfile.js).

### Networking handlers
- `pet_capture_result`: src/networking/gameEvents.js:4225-4259 (popups/sounds only; pet arrives via the lifeSkills merge).
- lifeSkills merge: src/networking/wsClient.js:1821-1871 (per top-level key, arrays copied, heals `pets` object→array at 1867).
- `bt_sync_rpg`: `syncRpgToServer` builds a payload incl. `pets`/`activePet` (src/networking/index.js:190-235) but `btRpc` is a no-op stub (`export async function btRpc(fnName, params) { return null; }`, src/networking/index.js:27). Dead; pets.md:109-111 cites stale line numbers.

### Items
- No pet items exist. Trap item icon is an emoji only ('🪤'); no ItemArt/ItemTooltip handling of `basic_trap` beyond the dash inventory glyph (src/ui/mobile/dash/InventoryPanel.jsx:348-353) and the trade window glyph (TradeWindowPanel.jsx:97).

## 4. The Wheel, zone changes, death, dungeons, farm, No man's land (DONE)

### Would capture work in the Wheel (zone 'wheel')?
- Server: YES mechanically. `_handlePetCapture` looks the monster up in `this.monsters[ps.z]` (pets.js:137); Wheel monsters live in `monsters['wheel']`, built by `_makeZoneMonster(home, ZONES[home], spawn, ...)` (wheelzone.js:201, 230-231) so they DO carry `arch`, `variant`, `level`, `element` (= the HOME zone's element), `emoji` and `color` (= ARCHETYPE emoji/colour, index.js:1551-1576), plus `home` and (past tier 1) `tier` (wheelzone.js:204, 233-234).
- Respawn after a Wheel capture: `_monsterRespawnMs('wheel')` → `_spawnScalableZone('wheel')` is false (no zone config, spawnscale.js:136-140) → flat `RESPAWN_TIME` 18,750 ms (index.js:937); respawn resets hp/statuses/dmgByPlayer (index.js:1866-1905).
- NOT checked by capture: Wheel safe ground (`_wheelSafeAt`/`_wheelSheltered`, wheelzone.js:166-170, 327) — a player standing in the commons/Brotown can trap any monster within 200 px; No man's land rules; party/ownership (anyone can trap a monster others weakened, deleting their XP/gold shares — the capture never pays `dmgByPlayer` contributors, pets.js:191-196); `m.home`/`m.tier` are discarded.
- Level penalty bites hard in the Wheel: monsters run Lv 1-40 (wheelzone.js header 54-80); chance −0.05 per level above you (pets.js:161) → a Lv7 player vs a Lv17 monster is at the 0.10 floor.
- ELEMENT BUG: verdant's element is 'flora' (server/src/data.js:360) but PET_ELEMENTS whitelist is ['flame','venom','frost','storm','stone','wind','water'] (pets.js:69). Capture copies `m.element` unchecked (pets.js:174) → a verdant pet is stored 'flora', then nulled by `_sanitizePets` at the next join (pets.js:92). Meadow monsters have element null (data.js:342).
- What a captured Wheel monster's pet looks like: archetype emoji (🟢 for fire goblins, storm slimes, blue slimes, mire wisps; 🪨 for rock golems/fishmen/bog lurkers; ⛄ snowmen; 👁️/💀/💥 for the Buried City's mummies), archetype colour, random name from 15 (pets.js:67), random personality. The stage look past Lv20 (src/data/wheelStageLooks.js tint + names like "Glacier Snowman") and the variant are not recorded, so a "Cinder Goblin" and a meadow slime become the same 🟢 fodder pet.
- Client: the 🪤 button is hidden everywhere (§2). The local pet follows/vacuums/"fights" in the Wheel like anywhere (BroTown.jsx:6454-6663, zone-agnostic). Wheel monster looks load by land as you walk (wheelMonsterArt.js, CLAUDE.md looks clause) but the pet needs no textures (emoji Text), so no memory/preload interaction today. A future SPRITE pet of a monster kind WOULD need that monster's look loaded wherever the pet goes (today the Wheel deliberately unloads other lands' looks), and the preload law / memory budget (CLAUDE.md Conventions) would apply.

### Zone change / death / respawn / dungeons / farm
- Server: nothing pet-related happens on zone change, death or respawn (no pet code outside pets.js/join/loot pickup — §1 grep). Pets live in lifeSkills, which survives every death; only character reset deletes them (persistence.js:315-345).
- Client: the active pet is zone-agnostic; `S._petX/_petY` are NOT reset on zone change/respawn/dungeon entry (only by set-active taps, PetHousePanel.jsx:179, InventoryPanel.jsx:1129), so the pet visibly lags and walks back from its old coordinates at 2 px/frame (BroTown.jsx:6466-6474). The vacuum radius is measured from that stale pet position (BroTown.jsx:6498-6499) while the server measures from the player (index.js:4276-4280), so vacuum is effectively off until the pet catches up.
- Traps: `basic_trap` is an ordinary bag item — every death wipes it (death keeps only gather tools + quest items, server/src/gathering.js:577-605) and it drops into the death pile.
- No man's land: pets are NEVER lost (nomansland.js never touches lifeSkills; its loss list is bag items, spare weapons/armour/shields, and for red skulls worn gear + gold — nomansland.js:50-80). Traps in the bag ARE lost to the killer's pile. Pet vacuum works on death piles too (viaPet shares the death-drop branch, index.js:4247-4300 + 4268-4280): after a pile's owner window, a pet owner grabs from 240 px vs 160 px manual — a small PvP looting edge.
- Dungeons (dungeon.js, wheeldungeon.js): capture works inside a 'dungeon:<id>' zone (same `monsters[ps.z]` lookup). Wave monsters and the BOSS are capturable (no `_dungeonBoss` check; pets.js:144 only asks `_monsterDamageable`). A captured monster is `alive=false` with `respawnAt=0` (noRespawn, pets.js:194; wheeldungeon.js:132-136), and `_tickDungeons` advances/completes on `list.every(m => !m.alive)` (dungeon.js:823-840) → **trapping the boss at ≤20% HP completes the dungeon and pays `_dungeonComplete` gold/XP to everyone present (dungeon.js:762-783), skipping the last fifth of the fight, and yields a boss-level pet** (Wheel boss: land's last spawn kind +5 levels, `emoji = BOSS_EMOJI[...] || '🐉'`, colour '#ff5e6c', dungeon.js:388-397; wheeldungeon.js:168-172). pets.md:77-79 calls "a captured wave member counts as cleared" intentional; the boss case is not discussed.
- Farm: Pet House panel lives there (§2); pets follow you in.

## (a) OVERKILL — what in today's flow makes "weaken to ≤20%" worse or better (owner update)
WORSE
- No indication of the window anywhere: `TRAP_HP_THRESHOLD` is read only by the legacy local path (MenuBar.jsx:263); the server path sends blind and the worker answers 'too-healthy' (pets.js:145). The button was never conditional on HP — it is a static toolbar item validated on press (MenuBar.jsx:234-261). No HP-bar marker at 20% (grep).
- No client prediction of the window on the server path; HP truth arrives via monster deltas (`localM.curHp = md.hp`, wsClient.js:855) after the server rolls each hit, so the player cannot see a hit coming that will skip the window.
- No non-lethal attack mode against monsters (grep: nonlethal/subdue/knockout → nothing). The only "leave at 1 HP" rule protects PLAYERS (Last Stand, server/src/combat.js:476-485). No per-hit cap on player→monster damage: MAX_HIT_PCT 0.5 exists only for monster/boss→player hits (dungeon.js:89, telegraph.js:94).
- Hits-to-kill shrink fast with progression (measured in docs/specs/damage-scale-design.md:118-133): Lv1 sword vs fodder 7.47 hits (~13%/hit, window landable), Lv1 staff 4.00, Lv10 greatsword 4.93, Lv20 staff vs brute 3.33, Lv50 sword 2.54, Lv100 staff 2.29; and a godly iron greatsword at Melee 8 kills an at-level brute in 1.15 hits (docs/specs/hardening.md:61-62). Once a hit is >~40% of max HP, landing in a 20% band is luck; once it is ≥100% it is impossible.
- Many things finish a weakened monster without the player choosing to: held auto-attack (fires continuously), splash/cleave/volley/burst AoE, elemental DoTs (burn/poison ticks via `_applyMonsterDot`, index.js:3116), thorn reflects (telegraph.js:956), crits, slime burst, other players and party members in the shared room (and no capture reservation — anyone can trap or kill your weakened target).
- Over-levelled = monsters die faster but capture is EASIER (penalty only when monster > player, pets.js:161); under-levelled players who can actually land the window get the 0.10 floor.
BETTER (things a new design can lean on)
- Monsters do not regenerate HP out of combat (only respawn resets hp, index.js:1866-1868; the lone heal is a dungeon boss ability, dungeon.js:682), so a weakened monster stays weakened.
- The server already gates by its own HP and range at press time (pets.js:144-147) and repeats the damageable/phase gate (pets.js:139-144) — a sound authoritative pattern.
- Monster STUN exists end to end and is non-lethal: Shield Bash stamps `m._stunUntil` (abilities.js:893-895), the snowman's post-burrow daze too (telegraph.js:836); `_tickMonsters` honours it (index.js:1986) and tick.js puts it on the wire as `st` (tick.js:428) which every client draws as a star ring (wsClient.js:856-870). A stun/daze/"held" state is a ready-made non-lethal capture window.
- Player-side precedent for "cannot die below X" (Last Stand) and for statuses that hold a target in place (the flora "hold" on players, monsterstatus.js) — patterns a "subdue" mechanic could mirror on monsters.

## (b) EVERY OTHER way a pet can come into existence (besides server pet_capture)
1. MenuBar legacy local roll → `createPet(m)` (MenuBar.jsx:262-311; gameSystems.js:2004-2019) — runs only when caps.pets is absent; toolbar hidden. Client-only; would be adopted by the server only if the server list is empty (see 3).
2. PetHousePanel EVOLVE → `evolvePet(p1,p2)` mints a new pet object (PetHousePanel.jsx:365-397; gameSystems.js:1200-1231). Client-only; reverted on echo; sanitized away on join.
3. JOIN ADOPTION: `_petsAdoptOnJoin` adopts up to 6 SANITIZED client-supplied pets whenever the server's list is empty (pets.js:110-128) — on EVERY join while empty, not just once. The first-ever join also takes `rpgLifeSkills` wholesale (join.js:853). So any client can forge 6 pets (any whitelisted archetype, level 1-100, any ≤24-char name, any ≤8-char emoji, any hex colour; pets.js:83-102) on a fresh character. The join path's last `_saveRpg` (join.js:1199) runs BEFORE adoption (join.js:1267); the pets reach storage on the next save of any kind.
4. Operator restore of an `rpgsnap:` snapshot (server/src/admin.js:357 `/restore`) restores the whole blob, pets included.
5. Test-only injections: tools/qa/mp/mp-petdraw.mjs:55-64 writes `S.rpg.lifeSkills.pets = [{name:'Biscuit', emoji:'🐕', ...}]` in the page; tools/qa/qa-soak.mjs:16-22 writes a corrupted pets object; server/test/pets.test.mjs drives the real handler.
- NOT found (searched): quest rewards that grant a pet (kai_1..3 pay gold/XP only, server/src/data.js:731-733), monster drops, eggs, shop/vendor pets, event/anniversary/cape rewards (eventcapes.js has no pet), daily chest, store/market/trade/inbox transfer of pets (no pet handling in trade2.js/market.js/store.js/inbox.js), dev/admin "give pet" tools (server devtools.js none; client DevPanel only lists the `pets`/`petLoot` caps, src/ui/panels/DevPanel.jsx:154).
- Pet "kinds" that are NOT monsters (all placeholder/mock, none reachable as real data):
  - "Glacier", a rare "Frost Fox" 🦊 — the owner's profile mockup shown when you have no pet (src/ui/panels/playerProfile.js:58), with a PET_RARITY scale normal/rare/elite/godly (playerProfile.js:46-51) that no real pet carries.
  - Mock inventory pets 'Bramble', 'Tinder', 'Mist', 'Pebble', 'Dusk', 'Cinder' with atk/def stats (src/ui/mobile/mockItems.js:7, 29, 91; mockProfile.js:66) and a generic pet SVG (src/ui/mobile/ItemArt.jsx:62, 82) — unmounted surfaces (GameApp.jsx:689-691).
  - QA's 'Biscuit' 🐕 (mp-petdraw.mjs:35).
  - GDD (STALE) species Imp / Skeleton / Eye (README.md:7454) and a "pacifist rabbit" (README.md:5858).
  - Not a pet but adjacent: NPC "companion follow" (§19.1 `npc.followZones`, BroTown.jsx:6666) and the farm's "pet pen" grass next to the Pet House (src/data/gameDisplay.js:856-860).
- Pet achievements that read pets: 'pet_evolve' Metamorphosis (needs `_compStats.petsEvolved`, which NOTHING increments → unearnable) and 'pet_mythic' Mythic Tamer (evolutionTier ≥3, reachable only through the client-only evolve) — src/data/gameDisplay.js:5187-5202, fed at BroTown.jsx:8161-8166.

## 5. History, docs, GDD (DONE)

NOTE: the local clone is SHALLOW (`git rev-parse --is-shallow-repository` → true; 50 commits, oldest 2026-10-03), so `git log --grep=pet --grep=trap` locally returns only 9 unrelated recent commits. The timeline below comes from the GitHub commit search (read-only, mcp search_commits on hemibroscommunity-del/GameDev, default branch; 22 hits for "pet") plus version tags in code comments.

### Dated timeline
- 2026-03-22 → April: the repo begins as uploaded single-file builds ("Add files via upload", "Rename combat_v8.html to index.html"). The §18.1 pet system (trap button, createPet, follow + auto-loot, Pet House on the farm, evolve/enchant, Beastmaster Kai chain) predates the modular history; first commit-message mention 05e45f4c0 2026-04-09 ("Activate PixiJS WebGL renderer ... shield, pet, ambient particles").
- 2026-04-29 aa08f1bf8: skill list takes the GDD names incl. Trapping, "replaces the prior alchemy/tailoring/taming entries".
- "v14.x" (pre-June, exact date not in history): the bottom toolbar holding the 🪤 button is hidden (`display:'none'`, MenuBar.jsx:64-67) — capture becomes unreachable from here on.
- 2026-05-16 3342a7f0a v2.1.78: Pet House interact-prompt button on mobile.
- 2026-05-18 48eee34be v2.3.30: pet auto-loot also hands over elemental shards.
- 2026-05-19 4f4939f68 v2.3.71: lifeSkill XP mirrored server-side; client merge keeps farmPlots/pets.
- 2026-05-22 3bebcad4d v2.3.124: pet pickup gold popup → gold icon.
- 2026-06-07 1abaf7943 v2.3.604: mobile inventoryBus gets a `pet` equip slot (mock UI, never fed real data).
- v2.3.767-769 (June): the player_state merge object-spread `pets[]` into `{0:..}` and crashed the achievements timer ("black world / kicked"); shape preserved + heal (wsClient.js:1855-1870; migrations.js:56-75; registry migration 1, docs/specs/migrations.md:52).
- 2026-06-14 25c9087ea v2.3.861 (#70): PetHousePanel extracted from BroTown, behaviour-frozen. 2026-06-14 c4aaa8c77 v2.3.883: legacy InventoryPanel (pet grid) extracted. 2026-06-15 1965aa056 v2.3.894 (#103): MenuBar (trap button) extracted, already hidden.
- 2026-07-02 e21f2e581 v2.3.1123: ARCHITECTURE-HANDOFF names pet capture backlog item G.
- 2026-07-03 bec4988ee v2.3.1130 (#192): SERVER-VALIDATED CAPTURE — pets.js, trap consumed per attempt, server roll, monster removed for everyone, sanitize/adopt on join, `pet_capture_result` privileged, `caps.pets`, pets suite (19 checks), docs/specs/pets.md. Commit says the old flow was "100% client theatre" and traps were never consumed.
- 2026-07-07 6458cf5c1 v2.3.1200 (#231): pet loot vacuum server-credited (`loot_pickup {viaPet:true}`, VACUUM_RANGE 240, `caps.petLoot`, +6 assertions).
- 2026-07-11 8bb0b4b4f v2.3.1224: UI-Bible icons incl. skill-trapping. 2026-07-15 da84475f6 v2.3.1312: Trapping in the GATHERING row, honestly shown with no unlock ladder. 2026-08-12 0cd251552 v2.3.1671: hiscores per skill incl. "trapping".
- 2026-08-28 c3117c116 v2.3.2069: THE TRAP IS TAKEN OFF THE SHELF (owner: "it has no effect in the game currently"); the commit records that capture's only trigger has been the hidden MenuBar "for hundreds of versions"; pets.test now places the trap directly and pins that the vendor does NOT sell one.
- 2026-08-28 6dc649b25 v2.3.2078: "your pet was invisible" — renderer read the never-written `S._activePet`; fixed; mp-petdraw scenario.
- 2026-09-01 b2056595a v2.3.2216-2221 (#534): snowman snow pile; capture repeats the `_monsterDamageable` phase gate (a pile could otherwise be trapped).
- 2026-09-14 03103e49c v2.3.2490: the pet vacuum gets its own in-flight flag (a `no-pet` refusal had blocked manual pickups for 5 s; BACKLOG-TRIAGE-2026-09-14 L1).
- 2026-09-15 ecfafb58a v2.3.2506/2521: pet hit popup put on the display damage scale.
- 2026-09-20 c59e51b2d v2.3.2635: the pet joins depth sorting (`entities` layer).
- 2026-09-25 fd26f2c44 v2.3.2926 (#763): Player/Inspect cards; `petInfo` added to the rpgData relay; Frost Fox mock placeholder.
- 2026-10-05 v2.3.3041 (no level-0 life skills), v2.3.3066 (Guild Hall opens skill guilds incl. Beastmaster's Lodge in the Wheel), 2026-10-06 v2.3.3090 (every life-skill level costs 2x XP, trapping included).

### Abandoned / dormant / reverted
- The capture UI: hidden with the toolbar (v14.x) and never re-homed to the utility wheel or the mobile dashboard; trap then pulled from sale (v2.3.2069).
- Beastmaster Kai NPC deleted from NPC_DATA (gameDisplay.js:5285-5291) → kai_1..3 dormant; their unlocks (pet_combat, pet_loot_upgrade, trapping_cap_50) were never implemented.
- Evolve/enchant never moved server-side (pets.md "attach points", docs/specs/pets.md:99-104); `bt_sync_rpg` RPC stubbed to a no-op (src/networking/index.js:27).
- GDD v12.47 "retired" pet enchantment (README.md:4904) — the client Enchant tab still exists.

### What the docs plan or defer (docs/ grep for pet|trapping|tame|taming|capture|companion)
- ARCHITECTURE-HANDOFF: item G shipped (docs/ARCHITECTURE-HANDOFF.md:580-581); the v2 successor backlog (from :295) has NO pet item. DEPTH-ROADMAP.md, ART-WISHLIST.md, WORLD-BIBLE.md, WORLD-ARCHITECTURE.md, MEMORY-PLAN.md: no pet/trapping mention (searched, none).
- docs/specs/pets.md:99-111: successor attach points — a server `pet_evolve` handler "following this module's pattern"; bt_sync_rpg is profile-DB only.
- docs/specs/control-redesign.md:322 (§5.18): CAPTURE_RANGE 200 < the Attack lock perimeter 220 → a monster locked at 200-220 px is refused "too far"; "fix ... belongs to the pets system" (CAPTURE_RANGE ≥ 220 or dim Capture past 200).
- docs/specs/gathering-hits.md:288-296: the first-connect bootstrap takes `lifeSkills` wholesale ("the blob can carry pets and gems"); the fix is "a sanitizer for the whole bootstrap lifeSkills (levels, pets, gems)", pending an owner decision on a cap for migrating veterans.
- docs/specs/snowman-snow-pile.md:45, 115-117: capture is "the one removal that is not an hp write" — every invulnerability phase must gate it too.
- docs/skill-animation-pipeline.md:44: planned trapping "set trap" pose = the `shoot` (draw + release) archetype.
- docs/UI-BIBLE.md:334 skill-trapping icon prompt ("a simple box trap with its door propped on a stick"), :397 pets icon (paw print with a heart pad), :157 pet tiers in DOM UI, :579 alchemy/tailoring/taming don't exist.
- docs/specs/wheel-and-card.md:198-220, 319, 364 and docs/specs/inventory.md (PET equip slot, green border, Weapon/Armor/Pet/Tool silhouette) — UI specs for a pet tile/slot that real data never fills.
- docs/WIRE-PROTOCOL.md:288 (`pet` cosmetic truncation), :459 (`pet_capture_result`), :496-502 (vacuum).
- docs/BACKLOG-TRIAGE-2026-09-14.md:203, 232, 511-512 + docs/triage-2026-09-14/loot-persist-audio.md:19-24, 59 (pet path in the loot triage; fixed v2.3.2490). docs/triage-2026-09-18/town-extent.md:177 (Pet House "Enchant" is pet enchanting, distinct from gear).

### GDD README.md — pets/trapping (STALE: early design thinking, NOT a blueprint; CLAUDE.md "Doc trust")
- §18 table: "Trapping — Capture pet companions (combat + loot) — Active" (README.md:4783).
- §18.1 Pets (Monster Capture) (README.md:4894-4904): capture below 20% HP, trap consumed, a "QTE breakpoint" (never built), success creates a pet; pets are NON-combat loot vacuums (PET_LOOT_RADIUS 15u), one active, 6 slots; Trapping level drives success and deeper monsters need more Trapping; zone-specific pets with element idle behaviours; pet enchantment RETIRED at v12.47.
- §40 Expressive Pet Evolution (README.md:7444-7520+): merge two pets of the SAME species and tier; 8 Base → 4 Evolved → 2 Ascended → 1 Mythic; purely cosmetic; deterministic trait inheritance (colour palette, texture pattern, shape elements), lineage record, Mythic non-tradeable while lower tiers trade on the marketplace; species Imp / Skeleton / Eye.
- Beastmaster Kai capstone (README.md:5793, 5856-5860): moral branches — release a pet (zone creatures turn passive), absurd pet names + rename cooldown, sacrifice a pet at the Enchanter.
- Content pipeline `pets.json` (archetype, element, zone_id, capture_level_req, idle_behavior) (README.md:4985, 5021); Journey Log first-species captures (README.md:5996); roadmap rows README.md:119, 326, 360, 446.
- CODE vs GDD: code pets "fight" (client-only), evolve into `combatPower` + enchant slots — the opposite of §40's cosmetic rule; no species, no QTE, no lineage, no trading.

## 6. Tests and QA (DONE)
- server/test/pets.test.mjs (266 lines, in `npm test`, server/package.json:8). Sections (pets.test.mjs:1-28, 82-263): 1 caps.pets + trap placed directly + vendor refuses to sell one (v2.3.2069); 2 every rejection (no-monster, too-healthy, too-far, slots-full, no-trap) costs no trap; 3 forced success (one trap, sanitized pet, activePet, monster dead with respawnAt, XP, result carries pet); 4-5 forced fail + exact chance formula; 6 dungeon-instance capture keeps respawnAt 0; 7 forged 7-pet join list → 6 sanitized, activePet 0, server list wins on rejoin; 8 forged `pet_capture_result` not rebroadcast; 9 vacuum: caps.petLoot, 200 px viaPet credits where manual is out-of-range, shared claimedBy (no double credit), beyond 240 rejected, no-pet rejected, recipient gate holds. All in the old 'meadow' zone.
- server/test/burrow.test.mjs:214-228 §7: a snowman in his pile phase at 1 HP cannot be captured.
- server/test/persistence.test.mjs:144-151 and migrations.test.mjs:54-69, 106, 121: pets/activePet shape heal (object → array, {} → null), idempotent, re-persisted.
- NOT covered: capture in 'wheel' (safe ground, home/tier/element 'flora'), boss capture completing a dungeon, the 6-slot XP dead end, repeated join adoption while the server list is empty, any client set-active/evolve/enchant (none reach the server), kill-steal of contributors' shares.
- QA (tools/qa): tools/qa/mp/mp-petdraw.mjs (131 lines, v2.3.2078; run.mjs:403): injects a pet into `S.rpg` in the page, asserts it is drawn with its emoji/name at `S._petX/_petY`, follows the player, hides when deactivated — runs in today's town, not the Wheel; no capture. tools/qa/qa-ui-shots.mjs:64 and tools/qa/mp/mp-textfloor.mjs:43 open the `petHouse` panel for screenshots/text-size checks. tools/qa/qa-soak.mjs:16-22 seeds a corrupted pets object. No scenario sends `pet_capture` or touches traps.

## 7. Gaps, bugs and exploit risks (if trapping became a front-line feature) (DONE)

### Server / economy (would matter the moment pets carry value)
1. REPEATABLE PET MINT AT JOIN: `_petsAdoptOnJoin` adopts up to 6 client-supplied pets on EVERY join while the server list is empty (pets.js:110-128) — there is no "captured" stamp (unlike gems' `gemsCaptured`, persistence.js:189-195). The client sends `rpgLifeSkills` (incl. pets) on every join (src/networking/wsClient.js:497-506, whose comment wrongly says it only matters on first connect). Today nearly every character has zero server pets (capture unreachable), so anyone can edit localStorage `bt_rpg` and join with six Lv100 pets of any archetype, emoji (≤8 chars) and name. Harmless only while pets do nothing but cosmetics + the 240 px vacuum.
2. FIRST-CONNECT LIFE SKILLS UNCLAMPED: join.js:853 takes `rpgLifeSkills` wholesale (only shape/level-0 heals, migrations.js:62-98) → forged Trapping/Woodcutting levels push capture chance to the 0.95 cap; the same hole pays every life-skill guild ladder (guilds.js:44-58 trusts `ps.lifeSkills[skill].level`). Known: docs/specs/gathering-hits.md:288-296.
3. NO SERVER KILL SWITCH: neither `_handlePetCapture` nor the viaPet branch reads a flag; `pets:false` in liveflags only un-advertises the cap, which makes the client fall back to the LOCAL theatre roll (MenuBar.jsx:256-311); `petLoot` is camelCase and cannot be thrown via the admin route (docs/TRAPS.md §117).
4. BOSS SKIP: trapping a dungeon boss at ≤20% completes the run and pays `_dungeonComplete` (dungeon.js:762-783, 823-840; pets.js:144-196 has no `_dungeonBoss` check), plus mints a boss-level pet.
5. KILL-STEAL / GRIEF: capture is not a kill — it voids everyone's `dmgByPlayer` shares, loot, XP, quest credit (pets.js:186-196). Anyone in range (200 px) can trap a monster other players weakened; the capturer needs to have dealt no damage at all. Also allowed from Wheel safe ground (no `_wheelSheltered` check).
6. TRAPPING SKILL IS A DEAD END: no release/sell/trade of pets anywhere (grep), `slots-full` refuses before XP (pets.js:150) → at most 6 captures' XP per character, ever; capture XP (15+2·lvl, pets.js:52-53) ≈ 1/9 of a tier-1 harvest swing (~163, gathering.js:474) while levels cost 1000×1.08^(L−1) (gathering.js:481-483). Trapping guild ladder (checkLvl 5,15,30,…, server/src/data.js:825-830) and the trapping leaderboard are unreachable legitimately. kai_3 promised "Trapping skill cap raised to Lv50" (gameSystems.js:7148-7152) — no cap exists.
7. DATA LOSS AT CAPTURE: pet keeps `archetype`, `element`, archetype `emoji`/`color` only — not `variant`, `home`, `tier`, stage look (pets.js:171-181). All fodder variants (fire goblin, storm slime, blue slime, mire wisp) become the same 🟢 pet; can't later render the real creature without a migration.
8. ELEMENT WHITELIST DRIFT: 'flora' (verdant, data.js:360) captured as-is (pets.js:174) then nulled at next join (pets.js:92, 69).
9. IDS NOT STABLE: `_sanitizePets` regenerates every pet id on every join (pets.js:90) — any future server message addressing a pet by id (set-active, release, rename, feed) must first make ids stable.
10. FIELD WHITELIST: `_sanitizePets` keeps 10 fields (pets.js:89-99); anything new (xp, bond, species, traits, lineage) is silently stripped at the next join unless the whitelist changes — and per handoff rule 1 new persistent state should arguably get its own storage key rather than grow `rpg:<pid>.lifeSkills`.
11. NO PER-ACTION SERVER SURFACE: set-active, evolve, enchant, rename, release, feed — none exists server-side; server `activePet` only ever becomes 0 or the first capture's index (pets.js:116-117, 124-125, 183-185).
12. ECHO WEIGHT: the whole `lifeSkills` object (pets + gems + resources + farmPlots...) is re-sent on any life-skill change (persistence.js:571-579 compares per top-level key).
13. CAPTURE RANGE vs LOCK: CAPTURE_RANGE 200 < lock perimeter 220 (docs/specs/control-redesign.md:322).
14. PvP looting edge: viaPet works on death piles too (index.js:4247-4300 shared branch) — 240 px vs 160 px after the owner window, including No man's land piles.

### Client (theatre, legacy and UX)
15. "PET COMBAT" IS FAKE: `nearestM.curHp -= petDmg` with damage popups (BroTown.jsx:6613-6662), never sent; contradicts the server-authority rule (CLAUDE.md Wire protocol) and can make the HP bar read below the server's (confusing a ≤20% gate). Guard precedence bug at BroTown.jsx:6615.
16. CLIENT-ONLY BLOB EDITS: PetHousePanel set-active/evolve/enchant (PetHousePanel.jsx:176-184, 365-397, 497-516) and InventoryPanel set-active (InventoryPanel.jsx:1125-1133) are local mutations + localStorage, reverted by the next lifeSkills echo (wsClient.js:1853-1870) and stripped at join (pets.js:83-102). Enchant "charges" 50 G locally only (the coins echo restores it); `PET_ENCHANT_COST` gem costs and `PET_EVOLVE_LEVEL_REQ` gates are unused. Achievement 'pet_evolve' is unearnable (`_compStats.petsEvolved` never incremented); 'pet_mythic' only via client-only evolve (gameDisplay.js:5187-5202, BroTown.jsx:8161-8166).
17. LEGACY LOCAL CAPTURE STILL IN CODE: MenuBar.jsx:262-311 mints pets, awards XP and kills the monster locally when caps.pets is absent — per the 100%-server directive (CLAUDE.md "What this repo is") this is a remnant to delete, not a mode.
18. A CAPTURE LOOKS LIKE A KILL ON EVERY SCREEN: the alive→dead delta makes each client play the monster's death sound and drop a CLIENT-LOCAL remnant skull pile with a client-rolled shard for remnant-skull types (src/networking/wsClient.js:990-1017; `isRemnantSkull`, src/data/monsterVariants.js:689-691); such a local pile is "picked up" by local self-credit (src/game/groundLoot.js:270ff) that the echo stomps — phantom loot on a monster that was captured, not killed.
19. FOLLOW: frame-rate dependent (2 px/frame), never re-seeded on zone change/respawn/dungeon/teleport (§3), so the pet trails in from its old coordinates (minutes across the Wheel) and the vacuum (measured from the pet) is effectively off meanwhile.
20. RENDERING: emoji Text 15 px + 7 px name (entityRenderer.js:14937-14993) → ~9 px / ~4 px CSS at the Wheel's scale; peers never see your pet in the world; peers' pet info is unverified client claim (BroTown.jsx:7465; playerProfile.js:97-112).
21. COPY/UX DEBT: "Need a trap! (Vendor sells them)" (gameEvents.js:4248) — nobody sells them; "No pets yet ... tap 🪤!" points at a hidden button (PetHousePanel.jsx:153; InventoryPanel.jsx:1094); dashboard Trapping earnHint "Set traps for small creatures and collect the catch." (skillsModel.js:55) describes a different mechanic; profile shows a fake "Frost Fox" pet for everyone without one (playerProfile.js:58, 185, 221-228); `GameApp.jsx:96` reads a non-existent `rpg.pet`.
22. QUEST TALLY NOT PERSISTED: `petLootCount` is only incremented client-side (wsClient.js:3105-3106; BroTown.jsx:6606-6607) and is overwritten whenever the server echoes `_questFlags` (wsClient.js:2124; server never writes it, join.js:782/960). Kai chain dormant anyway; kai rewards are client-trusted (server/src/data.js:529-540, 731-733).
23. DEAD SYNC: `syncRpgToServer`/`bt_sync_rpg` lists pets but `btRpc` is a no-op (src/networking/index.js:27, 190-235); pets.md:109-111 cites stale lines.
24. NO TRAP SOURCE + STALE ITEM TABLES: basic_trap has no source since v2.3.2069; `SHOP_ITEMS_FOR_SALE.trap_basic` (gameSystems.js:6226-6231) unused; Diego still buys `basictrap` at 20 (shop.js:138); no trap art.
