/* v2.3.5782: THE CENSUS of the page's ✕ buttons Esc does not press (no
   `data-esc`, not `.bt-inspect-close`), as ./closeButtons.mjs reads them, on
   main at 2026-11-17.  A census (the plan's rule 3): the TOTAL only falls (a
   ✕ moved to another file by a split is the same ✕); the files are for the
   reader.  `node tools/guards/screens-listed.test.mjs --write` takes the
   gone ones off; it never adds one.  Never add a line by hand: a new
   window's ✕ takes `data-esc`. */
export const KNOWN = Object.freeze({
  'src/debug/DebugOverlay.jsx': 1,
  'src/ui/BroTown.jsx': 2,
  'src/ui/mobile/InstallHint.jsx': 1,
  'src/ui/mobile/InventorySurface.jsx': 1,
  'src/ui/mobile/QuestCoach.jsx': 1,
  'src/ui/mobile/dash/GearTab.jsx': 1,
  'src/ui/mobile/dash/InventoryPanel.jsx': 1,
  'src/ui/panels/DungeonCreatorPanel.jsx': 1,
  'src/ui/panels/EncyclopediaPanel.jsx': 1,
  'src/ui/panels/InventoryPanel.jsx': 1,
  'src/ui/panels/PartyHUD.jsx': 2,
  'src/ui/panels/SocialPanel.jsx': 1,
  'src/ui/panels/TradeWindowPanel.jsx': 1,
  'src/ui/panels/UpdateBanner.jsx': 1,
  'src/ui/panels/buildings/CookPanel.jsx': 1,
  'src/ui/panels/buildings/ExchangePanel.jsx': 1,
});
