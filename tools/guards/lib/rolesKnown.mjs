/* v2.3.6840 (card UI4 PR 1): the kit pieces that ask for a role (Ui2Action, Ui2Tile, Ui2Stat, Ui2Fact) made
   with NO `intent`, per file, on main when the role table came.  Each is given its role from its props by
   src/game/uiRoles.js ui2Role (yesterday's look, unchanged); a screen's own card names the intents as it is
   rebuilt (card UI4 PRs 4 to 6).  tools/guards/ui4-roles.test.mjs: a count only falls (`--write` lowers one
   that fell), the total never rises past its ceiling, and a file not listed has none. */
export const ROLES_KNOWN = Object.freeze({
  'src/ui/kit/Showcase.jsx': 1,
  'src/ui/kit/UiKitPage.jsx': 25,
  'src/ui/mobile/dash/CodexPage.jsx': 1,
  'src/ui/mobile/dash/DashHeader.jsx': 2,
  'src/ui/mobile/dash/MenuGrid.jsx': 1,
  'src/ui/mobile/dash/MonsterShowcase.jsx': 3,
  'src/ui/mobile/dash/PetsPage.jsx': 6,
  'src/ui/mobile/dash/RankStandings.jsx': 2,
  'src/ui/mobile/dash/questViews.jsx': 2,
  'src/ui/mobile/dash/rankViews.jsx': 1,
  'src/ui/mobile/sheet/BroStrip.jsx': 1,
  'src/ui/mobile/sheet/FeatsPage.jsx': 4,
  'src/ui/mobile/sheet/GearShowcase.jsx': 1,
  'src/ui/mobile/sheet/LifeSkillPage.jsx': 9,
  'src/ui/mobile/sheet/LifeSkillsPage.jsx': 1,
  'src/ui/mobile/sheet/LifeUnlocks.jsx': 1,
  'src/ui/mobile/sheet/MedalPage.jsx': 7,
  'src/ui/mobile/sheet/MedalTiers.jsx': 2,
  'src/ui/mobile/sheet/attrTemplate.jsx': 2,
});
