# Hemi Bros ARPG — Architecture Map & Engineering Roadmap

> **Updated v2.3.766 (2026-06-12):** the stale "Game loop" and "Networking"
> rows below were corrected — the dead duplicate files they pointed at
> (`src/game/gameLoop.js`, `src/game/createInitialState.js`,
> `src/game/index.js`, the old `setupWebSocket` in
> `src/networking/wsClient.js`) were deleted in REBUILD-PLAN Phase 1.
> For the current decomposition state and roadmap see `docs/REBUILD-PLAN.md`;
> for the wire protocol see `docs/WIRE-PROTOCOL.md`; for the `S` object see
> `docs/STATE-SCHEMA.md`. As always: trust the code over any doc.

Written 2026-06-10 (v2.3.689) after a deep audit + cleanup session. Intended as
the onboarding map for any future work session. Corrections welcome — trust
the code over this doc where they disagree.

## System map

| Area | Entry points | Notes |
|---|---|---|
| Boot | `src/index.html` (vite root is `src/`) → `src/main.jsx` → `GameApp.jsx` → `BroTown.jsx` | GameApp also seeds a mock inventory for the Equip menu |
| Game loop | **inline in `src/ui/BroTown.jsx`** (banner `═══ GAME LOOP ═══`) | tick + collision + combat; scans `S.monsters` ~7×/frame. Extraction is REBUILD-PLAN Phase 6+ |
| Rendering | `src/rendering/systems/entityRenderer.js` (4.4k) | Pixi 8; per-dir body scale `BODY_DIR_SCALE`; armor masking `_maskedBodyFrame` |
| Gear/armor | `src/rendering/gearCatalog.js` (equip stores, localStorage `bt-gear-v2-*`) | steel set is "indestructible": `reconcileGearStash()` |
| Body/skins | `src/rendering/playerSkins.js` | sheet-level retint (skin/pants/shoes/shirt), cached per combo |
| Networking | **inline WS client in `src/ui/BroTown.jsx`** → Cloudflare Durable Object (`brotown-server.…workers.dev`); see `docs/WIRE-PROTOCOL.md` | `S.channel` is a Supabase-shaped shim; `btRpc()` is a dead no-op kept for legacy call sites. `src/networking/wsClient.js` now only holds the NET-overlay tick buffers (Phase 5 moves the live client there) |
| Combat helpers | `src/game/combatHelpers.js` | build progression, peer damage smoothing, shield arc, lifesteal tracking (extracted v2.3.765) |
| Server | `server/src/index.js` (in-repo since the protocol-v2 monorepo merge; `server/test/`, auto-deploy workflow) | DO authority: coins/inventory/lifeSkills/combat. Deploys independently → keep changes back-compat. Anti-cheat plan: `docs/ANTICHEAT-SPEC.md` |
| Tier-2 builds | `src/data/gameSystems.js` `WEAPON_CHANNELS` + `DEFENSE_CHANNELS`; `src/ui/mobile/dash/T2Panel.jsx` | per-category trained skills (sword/bow/staff + Defense); +5 pts/lvl into channels; **client-side only today** (see anti-cheat spec server TODO) |
| UI (live) | `src/ui/mobile/BottomDashboard.jsx` + `dash/*` panels, `EquippedTab` via `inventoryBus` | popup actions in `dash/ItemDetailPopup.jsx` |
| RPG state | `src/data/gameSystems.js` (6.8k) | `S.rpg` persisted to localStorage `bt_rpg`; stashes: weapon/shield/armor/gear |
| Sprite pipeline | `tools/` (26 scripts) | `make_pose_sheet.py` → hand-drawn `*-mannequin-armored.png` → `import_gear_from_sheet.py` → `fill_gear_gaps.py` (belt) → `preview_armor_frames.py` (verification; **mirrors the renderer — keep in sync**) |

## The armor render pipeline (hardest-won knowledge)

`_maskedBodyFrame(bodyTex, worn, dilate)` bakes a per-frame body texture:
1. **Cover erase**: body erased under gear silhouette dilated by 6px
   (separable box dilation since v2.3.689). Cached in `_maskedBodyCache`
   (cap 256 textures), keyed by body uid + worn keys + dilate.
2. **Neck restore** (top 33% of figure) — head/face always visible.
3. **Ghost-hand blend** (FULL SET ONLY since v2.3.686): recolors/erases the
   bare fist poking past the gauntlet; hue-samples skin/pants/shoes from the
   body itself. Includes the v2.3.650 pant-restore for halo-eaten pants.
4. **Silhouette confinement** (v2.3.681): body may only show inside the
   filled gear silhouette +2px… with carve-outs:
   - **waist band** (v2.3.682/684): rows 0.38–0.64 of figure height, body
     allowed within the gear's per-row span (backs the see-through chain belt);
   - **partial wear** (v2.3.684): per-row rule — only rows where gear pixels
     ≥85% of original body pixels are confined; uncovered rows keep the body
     AND restore what the cover halo ate.

Gotchas that bit us repeatedly:
- The **belt is baked into the chest sheets** (chain over the waist gap;
  backless — the body shows through links).
- Per-direction scale: only `BODY_DIR_SCALE` (stand/jog) is live. The
  per-axis stretch maps were neutralized v2.3.645 and deleted v2.3.688 —
  if idle/jog sizes drift, re-measure (see PR #9: south stand 1.136→1.051).
- The shirt bake is skipped only under the FULL set (v2.3.686).
- `tools/preview_armor_frames.py` must mirror renderer changes or its
  previews lie (it shipped stale stretch maps for 40 versions).

## Two inventory systems (unification needed)

- **A: `S.rpg`** (gameSystems) — weapon/shield/armor objects + stashes;
  dashboard Loadout + Bag read this. Persisted `bt_rpg`; partially
  server-bootstrapped.
- **B: `inventoryBus`** (ui/mobile) — `equipped {weapon,chest,legs,pet,tool}` +
  mock-seeded `items`; drives EquippedTab. GameApp force-syncs gearCatalog
  from B on every bus event.
- gearCatalog is the renderer's source of truth for chest/legs; A's
  `gearStash` + `reconcileGearStash()` keep pieces from being lost.

**Unify on A + gearCatalog.** B should become a thin view (or be deleted with
EquippedTab folded into the dashboard). Kill the GameApp mock seeding last —
it currently feeds the Equip menu's item list.

## Prioritized roadmap

1. **BroTown.jsx decomposition** (32.9k lines, pre-transpiled var/_slicedToArray
   style). Extract leaf systems first, behavior-frozen, one PR each:
   zone/map gen → chat → quests → combat handlers → connection lifecycle.
   Re-transpile to modern JSX only per extracted module. Verify each step by
   playing on the branch deploy (no tests exist).
2. **Inventory unification** (above).
3. **Perf, measured**: extend `src/debug/perfHud.js` to break frame time into
   tick / render / bake phases before optimizing further. Known candidates:
   merge the ~7 per-frame `S.monsters` passes in gameLoop; `Date.now()` ×257
   per tick → single `now`; ~~index.html CSS extraction~~ (done: the 1.5MB root index.html was a pre-extraction fossil, deleted v2.3.691; `src/index.html` is the real 2KB entry).
4. **Tooling**: no lint/tests. Cheapest wins: `npx knip` for dead exports;
   eslint with `no-unused-vars` only; a smoke test that boots the game headless.
5. (resolved v2.3.691) the 1.5MB root index.html was the pre-extraction
   fossil app — deleted; `src/index.html` (2KB) is the real vite entry.

## Working agreements

- Version-bump `package.json` every change; bump `GEAR_VERSION`
  (gearSheets.js) whenever gear PNGs change (cache-bust).
- Sheet edits: never regenerate whole sheets to fix one frame — patch the
  frame (`fill_gear_gaps.py --frames i,j --patch --no-backing`).
- Every PR phase must build green (`npm run build`) and deploy via the
  Cloudflare Pages branch preview before merging.
- Commits document the WHY at length — keep doing this; it's the only
  institutional memory this repo has.
