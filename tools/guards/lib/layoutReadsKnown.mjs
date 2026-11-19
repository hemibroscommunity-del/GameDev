/* v2.3.6360: THE LIST of the page's layout reads found on main before the
   guard (tools/guards/layout-reads.test.mjs; docs/specs/layout-reads.md),
   frozen: card LR PR 1, 2026-11-18.  A row is a file, the function a read
   sits in (lib/layoutReads.mjs says how it is named), the KIND read and how
   many there are; `hb` is its row in docs/plan/census/HB-holds.md when it
   has one (a hold a slow phone was measured to feel).  The count only falls
   (the plan's rule 3): a fix that takes a read away runs
   `node tools/guards/layout-reads.test.mjs --write`, which lowers the row
   and LINE; it never adds one.  NEVER ADD A ROW BY HAND: a new read goes
   through the ways the spec names.  A read that truly must stay (a size
   read once at start, the window's own resize) is a row with its `why`,
   added only with the planning session's yes, in a PR that says so. */
export const LINE = 331;   /* 331 reads in 72 files */

export const KNOWN = Object.freeze([
  /* src/debug/DebugOverlay.jsx */
  { file: 'src/debug/DebugOverlay.jsx', fn: 'ConsolePanel', kind: 'scrollHeight', n: 1 },
  { file: 'src/debug/DebugOverlay.jsx', fn: 'ConsolePanel', kind: 'scrollTop', n: 1 },
  { file: 'src/debug/DebugOverlay.jsx', fn: 'PerfPanel', kind: 'innerHeight', n: 1 },
  { file: 'src/debug/DebugOverlay.jsx', fn: 'PerfPanel', kind: 'innerWidth', n: 1 },
  { file: 'src/debug/DebugOverlay.jsx', fn: 'cssEnv', kind: 'getComputedStyle', n: 1 },
  /* src/game/characterCreatorEffects.js */
  { file: 'src/game/characterCreatorEffects.js', fn: 'blit', kind: 'getBoundingClientRect', n: 1 },
  /* src/game/deskKeys.js */
  { file: 'src/game/deskKeys.js', fn: 'frontControl', kind: 'elementFromPoint', n: 1 },
  { file: 'src/game/deskKeys.js', fn: 'frontControl', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/game/deskKeys.js', fn: 'frontControl', kind: 'innerHeight', n: 2 },
  { file: 'src/game/deskKeys.js', fn: 'frontControl', kind: 'innerWidth', n: 2 },
  { file: 'src/game/deskKeys.js', fn: 'frontControl', kind: 'querySelectorAll', n: 1 },
  /* src/game/lifeSkillRewards.js */
  { file: 'src/game/lifeSkillRewards.js', fn: 'bagFlightTarget', kind: 'innerHeight', n: 1 },
  { file: 'src/game/lifeSkillRewards.js', fn: 'bagFlightTarget', kind: 'innerWidth', n: 1 },
  { file: 'src/game/lifeSkillRewards.js', fn: 'canvasPageRect', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/game/lifeSkillRewards.js', fn: 'shown', kind: 'getBoundingClientRect', n: 1 },
  /* src/game/questFly.js */
  { file: 'src/game/questFly.js', fn: 'fallbackRect', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/game/questFly.js', fn: 'fallbackRect', kind: 'innerHeight', n: 1 },
  { file: 'src/game/questFly.js', fn: 'fallbackRect', kind: 'innerWidth', n: 1 },
  { file: 'src/game/questFly.js', fn: 'flyPicture', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/game/questFly.js', fn: 'pulse', kind: 'offsetWidth', n: 1 },
  { file: 'src/game/questFly.js', fn: 'questFlyTarget', kind: 'querySelectorAll', n: 1 },
  { file: 'src/game/questFly.js', fn: 'shownRect', kind: 'getBoundingClientRect', n: 2 },
  { file: 'src/game/questFly.js', fn: 'shownRect', kind: 'getComputedStyle', n: 2 },
  { file: 'src/game/questFly.js', fn: 'shownRect', kind: 'innerHeight', n: 1 },
  { file: 'src/game/questFly.js', fn: 'shownRect', kind: 'innerWidth', n: 1 },
  /* src/game/speedTest.js */
  { file: 'src/game/speedTest.js', fn: 'runSpeedTest', kind: 'innerHeight', n: 1 },
  { file: 'src/game/speedTest.js', fn: 'runSpeedTest', kind: 'innerWidth', n: 1 },
  /* src/rendering/pixiApp.js */
  { file: 'src/rendering/pixiApp.js', fn: 'createPixiApp', kind: 'clientHeight', n: 1 },
  { file: 'src/rendering/pixiApp.js', fn: 'createPixiApp', kind: 'clientWidth', n: 1 },
  /* src/rendering/systems/ambientFx.js */
  { file: 'src/rendering/systems/ambientFx.js', fn: '_seamFrac', kind: 'getBoundingClientRect', n: 2 },
  /* src/rendering/systems/effectsRenderer.js */
  { file: 'src/rendering/systems/effectsRenderer.js', fn: '_renderChatBubble', kind: 'measureText', n: 1 },
  { file: 'src/rendering/systems/effectsRenderer.js', fn: '_updateCatchFlights', kind: 'getBoundingClientRect', n: 1 },
  /* src/rendering/systems/minimapRenderer.js */
  { file: 'src/rendering/systems/minimapRenderer.js', fn: '_measureTopInset', kind: 'getBoundingClientRect', n: 2 },
  /* src/rendering/systems/wheelMinimap.js */
  { file: 'src/rendering/systems/wheelMinimap.js', fn: 'update', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/rendering/systems/wheelMinimap.js', fn: 'update', kind: 'innerWidth', n: 1 },
  /* src/rendering/tiledMaps.js */
  { file: 'src/rendering/tiledMaps.js', fn: 'loadTiledMap', kind: 'querySelectorAll', n: 2 },
  /* src/rendering/worldLife.js */
  { file: 'src/rendering/worldLife.js', fn: '__btWorldLifeRects', kind: 'getBoundingClientRect', n: 1 },
  /* src/ui/BroTown.jsx */
  { file: 'src/ui/BroTown.jsx', fn: 'BroTown', kind: 'getBoundingClientRect', n: 5 },
  { file: 'src/ui/BroTown.jsx', fn: 'BroTown', kind: 'getComputedStyle', n: 1 },
  { file: 'src/ui/BroTown.jsx', fn: 'BroTown', kind: 'innerHeight', n: 4 },
  { file: 'src/ui/BroTown.jsx', fn: 'BroTown', kind: 'innerWidth', n: 1 },
  { file: 'src/ui/BroTown.jsx', fn: '_gameLoop', kind: 'clientWidth', n: 1 },
  { file: 'src/ui/BroTown.jsx', fn: '_gameLoop', kind: 'getBoundingClientRect', n: 2 },
  { file: 'src/ui/BroTown.jsx', fn: '_gameLoop', kind: 'getComputedStyle', n: 1 },
  { file: 'src/ui/BroTown.jsx', fn: '_gameLoop', kind: 'getPropertyValue', n: 1 },
  { file: 'src/ui/BroTown.jsx', fn: '_gameLoop', kind: 'querySelectorAll', n: 3 },
  { file: 'src/ui/BroTown.jsx', fn: '_scrollableUp', kind: 'clientHeight', n: 1 },
  { file: 'src/ui/BroTown.jsx', fn: '_scrollableUp', kind: 'getComputedStyle', n: 1 },
  { file: 'src/ui/BroTown.jsx', fn: '_scrollableUp', kind: 'scrollHeight', n: 1 },
  { file: 'src/ui/BroTown.jsx', fn: 'bM', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/ui/BroTown.jsx', fn: 'clientToCanvas', kind: 'getBoundingClientRect', n: 1, hb: '14' },
  { file: 'src/ui/BroTown.jsx', fn: 'onClick', kind: 'getBoundingClientRect', n: 3 },
  { file: 'src/ui/BroTown.jsx', fn: 'onClick', kind: 'scrollTop', n: 1 },
  { file: 'src/ui/BroTown.jsx', fn: 'onDoubleClick', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/ui/BroTown.jsx', fn: 'onMouseDown', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/ui/BroTown.jsx', fn: 'onMouseMove', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/ui/BroTown.jsx', fn: 'onTouchEnd', kind: 'getBoundingClientRect', n: 1, hb: '14' },
  { file: 'src/ui/BroTown.jsx', fn: 'relock', kind: 'innerHeight', n: 2 },
  /* src/ui/ExtractionSwipeLayer.jsx */
  { file: 'src/ui/ExtractionSwipeLayer.jsx', fn: 'buttonCueScreenPos', kind: 'getBoundingClientRect', n: 2 },
  /* src/ui/LevelUpBurst.jsx */
  { file: 'src/ui/LevelUpBurst.jsx', fn: 'LevelUpBurst', kind: 'clientHeight', n: 1 },
  { file: 'src/ui/LevelUpBurst.jsx', fn: 'LevelUpBurst', kind: 'clientWidth', n: 1 },
  { file: 'src/ui/LevelUpBurst.jsx', fn: 'LevelUpBurst', kind: 'getBoundingClientRect', n: 2 },
  { file: 'src/ui/LevelUpBurst.jsx', fn: 'fireBubbles', kind: 'getBoundingClientRect', n: 1 },
  /* src/ui/PinCards.jsx */
  { file: 'src/ui/PinCards.jsx', fn: 'otherCardUp', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/ui/PinCards.jsx', fn: 'otherCardUp', kind: 'querySelectorAll', n: 1 },
  /* src/ui/WorldMapOverlay.jsx */
  { file: 'src/ui/WorldMapOverlay.jsx', fn: 'draw', kind: 'measureText', n: 2, hb: '4' },
  { file: 'src/ui/WorldMapOverlay.jsx', fn: 'firstView', kind: 'clientHeight', n: 1 },
  { file: 'src/ui/WorldMapOverlay.jsx', fn: 'firstView', kind: 'clientWidth', n: 1 },
  { file: 'src/ui/WorldMapOverlay.jsx', fn: 'label', kind: 'measureText', n: 2, hb: '4' },
  { file: 'src/ui/WorldMapOverlay.jsx', fn: 'loop', kind: 'clientHeight', n: 1 },
  { file: 'src/ui/WorldMapOverlay.jsx', fn: 'loop', kind: 'clientWidth', n: 1 },
  { file: 'src/ui/WorldMapOverlay.jsx', fn: 'onMove', kind: 'clientHeight', n: 1 },
  { file: 'src/ui/WorldMapOverlay.jsx', fn: 'onMove', kind: 'clientWidth', n: 1 },
  { file: 'src/ui/WorldMapOverlay.jsx', fn: 'onMove', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/ui/WorldMapOverlay.jsx', fn: 'onUp', kind: 'clientHeight', n: 2 },
  { file: 'src/ui/WorldMapOverlay.jsx', fn: 'onUp', kind: 'clientWidth', n: 2 },
  { file: 'src/ui/WorldMapOverlay.jsx', fn: 'onUp', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/ui/WorldMapOverlay.jsx', fn: 'onWheel', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/ui/WorldMapOverlay.jsx', fn: 'size', kind: 'clientHeight', n: 1 },
  { file: 'src/ui/WorldMapOverlay.jsx', fn: 'size', kind: 'clientWidth', n: 1 },
  { file: 'src/ui/WorldMapOverlay.jsx', fn: 'zoomAt', kind: 'clientHeight', n: 4 },
  { file: 'src/ui/WorldMapOverlay.jsx', fn: 'zoomAt', kind: 'clientWidth', n: 4 },
  { file: 'src/ui/WorldMapOverlay.jsx', fn: 'zoomBtn', kind: 'clientHeight', n: 1 },
  { file: 'src/ui/WorldMapOverlay.jsx', fn: 'zoomBtn', kind: 'clientWidth', n: 1 },
  /* src/ui/XpFlyOverlay.jsx */
  { file: 'src/ui/XpFlyOverlay.jsx', fn: 'XpFlyToCard', kind: 'innerHeight', n: 1 },
  { file: 'src/ui/XpFlyOverlay.jsx', fn: 'XpFlyToCard', kind: 'innerWidth', n: 1 },
  { file: 'src/ui/XpFlyOverlay.jsx', fn: 'playerScreenPoint', kind: 'getBoundingClientRect', n: 1, hb: '11' },
  { file: 'src/ui/XpFlyOverlay.jsx', fn: 'topBarXpPoint', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/ui/XpFlyOverlay.jsx', fn: 'worldScreenPoint', kind: 'getBoundingClientRect', n: 1 },
  /* src/ui/deskTeach.js */
  { file: 'src/ui/deskTeach.js', fn: 'attackTick', kind: 'innerWidth', n: 1, hb: '36' },
  { file: 'src/ui/deskTeach.js', fn: 'attackTick', kind: 'offsetWidth', n: 1, hb: '36' },
  { file: 'src/ui/deskTeach.js', fn: 'harvestTick', kind: 'innerWidth', n: 1 },
  { file: 'src/ui/deskTeach.js', fn: 'harvestTick', kind: 'offsetHeight', n: 1 },
  { file: 'src/ui/deskTeach.js', fn: 'harvestTick', kind: 'offsetWidth', n: 1 },
  { file: 'src/ui/deskTeach.js', fn: 'resourceTick', kind: 'innerHeight', n: 1, hb: '36' },
  { file: 'src/ui/deskTeach.js', fn: 'resourceTick', kind: 'innerWidth', n: 1, hb: '36' },
  { file: 'src/ui/deskTeach.js', fn: 'toScreen', kind: 'getBoundingClientRect', n: 1 },
  /* src/ui/deskWide.js */
  { file: 'src/ui/deskWide.js', fn: '__btDeskWide', kind: 'clientHeight', n: 1 },
  { file: 'src/ui/deskWide.js', fn: '__btDeskWide', kind: 'clientWidth', n: 1 },
  { file: 'src/ui/deskWide.js', fn: '__btDeskWide', kind: 'innerHeight', n: 1 },
  { file: 'src/ui/deskWide.js', fn: '__btDeskWide', kind: 'innerWidth', n: 1 },
  /* src/ui/fixedBox.js */
  { file: 'src/ui/fixedBox.js', fn: 'fixedBox', kind: 'getBoundingClientRect', n: 2 },
  { file: 'src/ui/fixedBox.js', fn: 'fixedBox', kind: 'innerHeight', n: 1 },
  { file: 'src/ui/fixedBox.js', fn: 'fixedBox', kind: 'innerWidth', n: 1 },
  /* src/ui/guideArrow.js */
  { file: 'src/ui/guideArrow.js', fn: 'firstShown', kind: 'querySelectorAll', n: 1 },
  { file: 'src/ui/guideArrow.js', fn: 'onTop', kind: 'elementFromPoint', n: 1, hb: '18' },
  { file: 'src/ui/guideArrow.js', fn: 'place', kind: 'innerWidth', n: 1 },
  { file: 'src/ui/guideArrow.js', fn: 'place', kind: 'offsetWidth', n: 2 },
  { file: 'src/ui/guideArrow.js', fn: 'scrolledAway', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/ui/guideArrow.js', fn: 'scrolledAway', kind: 'getComputedStyle', n: 1 },
  { file: 'src/ui/guideArrow.js', fn: 'shownRect', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/ui/guideArrow.js', fn: 'shownRect', kind: 'getComputedStyle', n: 1 },
  { file: 'src/ui/guideArrow.js', fn: 'shownRect', kind: 'innerHeight', n: 1 },
  { file: 'src/ui/guideArrow.js', fn: 'shownRect', kind: 'innerWidth', n: 1 },
  { file: 'src/ui/guideArrow.js', fn: 'shown', kind: 'querySelectorAll', n: 1, hb: '18' },
  { file: 'src/ui/guideArrow.js', fn: 'spotOf', kind: 'innerWidth', n: 1 },
  { file: 'src/ui/guideArrow.js', fn: 'sweepStrays', kind: 'querySelectorAll', n: 1, hb: '18' },
  /* src/ui/mayorScreen.js */
  { file: 'src/ui/mayorScreen.js', fn: 'mayorScreenRect', kind: 'innerHeight', n: 1 },
  { file: 'src/ui/mayorScreen.js', fn: 'mayorScreenRect', kind: 'innerWidth', n: 1 },
  /* src/ui/mobile/BottomDashboard.jsx */
  { file: 'src/ui/mobile/BottomDashboard.jsx', fn: 'BottomDashboard', kind: 'innerHeight', n: 3 },
  { file: 'src/ui/mobile/BottomDashboard.jsx', fn: 'Tooltip', kind: 'innerHeight', n: 1 },
  { file: 'src/ui/mobile/BottomDashboard.jsx', fn: 'onMove', kind: 'getComputedStyle', n: 1 },
  { file: 'src/ui/mobile/BottomDashboard.jsx', fn: 'recompute', kind: 'innerHeight', n: 2, hb: '7' },
  /* src/ui/mobile/ChatBubble.jsx */
  { file: 'src/ui/mobile/ChatBubble.jsx', fn: 'grow', kind: 'getBoundingClientRect', n: 2 },
  { file: 'src/ui/mobile/ChatBubble.jsx', fn: 'grow', kind: 'scrollHeight', n: 1 },
  /* src/ui/mobile/ControlsTutorial.jsx */
  { file: 'src/ui/mobile/ControlsTutorial.jsx', fn: 'measureEl', kind: 'getBoundingClientRect', n: 1 },
  /* src/ui/mobile/DeathCard.jsx */
  { file: 'src/ui/mobile/DeathCard.jsx', fn: 'DeathCard', kind: 'innerWidth', n: 1 },
  /* src/ui/mobile/ItemTooltip.jsx */
  { file: 'src/ui/mobile/ItemTooltip.jsx', fn: 'onTouchEnd', kind: 'offsetHeight', n: 1 },
  /* src/ui/mobile/LoginSpinWindow.jsx */
  { file: 'src/ui/mobile/LoginSpinWindow.jsx', fn: 'coinBurst', kind: 'clientHeight', n: 1 },
  /* src/ui/mobile/NmlAskCard.jsx */
  { file: 'src/ui/mobile/NmlAskCard.jsx', fn: 'clearOfTopCards', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/ui/mobile/NmlAskCard.jsx', fn: 'clearOfYou', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/ui/mobile/NmlAskCard.jsx', fn: 'frameRect', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/ui/mobile/NmlAskCard.jsx', fn: 'frameRect', kind: 'innerWidth', n: 1 },
  /* src/ui/mobile/NmlBadge.jsx */
  { file: 'src/ui/mobile/NmlBadge.jsx', fn: 'clearOfThumbs', kind: 'getBoundingClientRect', n: 1, hb: '34' },
  /* src/ui/mobile/QuestCoach.jsx */
  { file: 'src/ui/mobile/QuestCoach.jsx', fn: '_markTooBig', kind: 'innerHeight', n: 1 },
  { file: 'src/ui/mobile/QuestCoach.jsx', fn: '_markTooBig', kind: 'innerWidth', n: 1 },
  { file: 'src/ui/mobile/QuestCoach.jsx', fn: '_topBelowCoach', kind: 'elementFromPoint', n: 1, hb: '32' },
  { file: 'src/ui/mobile/QuestCoach.jsx', fn: '_topBelowCoach', kind: 'elementsFromPoint', n: 1, hb: '32' },
  { file: 'src/ui/mobile/QuestCoach.jsx', fn: 'measure', kind: 'getBoundingClientRect', n: 1, hb: '32' },
  { file: 'src/ui/mobile/QuestCoach.jsx', fn: 'measure', kind: 'innerHeight', n: 2, hb: '32' },
  { file: 'src/ui/mobile/QuestCoach.jsx', fn: 'worldRect', kind: 'getBoundingClientRect', n: 1, hb: '10, 12' },
  /* src/ui/mobile/RaceHud.jsx */
  { file: 'src/ui/mobile/RaceHud.jsx', fn: 'middle', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/ui/mobile/RaceHud.jsx', fn: 'middle', kind: 'innerHeight', n: 1 },
  { file: 'src/ui/mobile/RaceHud.jsx', fn: 'middle', kind: 'innerWidth', n: 1 },
  /* src/ui/mobile/WorldChatFeed.jsx */
  { file: 'src/ui/mobile/WorldChatFeed.jsx', fn: 'WorldChatFeed', kind: 'scrollHeight', n: 1 },
  { file: 'src/ui/mobile/WorldChatFeed.jsx', fn: 'WorldChatFeed', kind: 'scrollTop', n: 1 },
  { file: 'src/ui/mobile/WorldChatFeed.jsx', fn: 'inShell', kind: 'getBoundingClientRect', n: 1 },
  /* src/ui/mobile/XpTrack.jsx */
  { file: 'src/ui/mobile/XpTrack.jsx', fn: 'XpTrack', kind: 'getComputedStyle', n: 1 },
  /* src/ui/mobile/dash/AchievementsPanel.jsx */
  { file: 'src/ui/mobile/dash/AchievementsPanel.jsx', fn: 'AchievementsPanel', kind: 'getBoundingClientRect', n: 2 },
  { file: 'src/ui/mobile/dash/AchievementsPanel.jsx', fn: 'AchievementsPanel', kind: 'scrollTop', n: 1 },
  /* src/ui/mobile/dash/GearTab.jsx */
  { file: 'src/ui/mobile/dash/GearTab.jsx', fn: 'FitInfo', kind: 'clientHeight', n: 1 },
  { file: 'src/ui/mobile/dash/GearTab.jsx', fn: 'FitInfo', kind: 'scrollHeight', n: 1 },
  { file: 'src/ui/mobile/dash/GearTab.jsx', fn: 'FitName', kind: 'clientWidth', n: 1 },
  { file: 'src/ui/mobile/dash/GearTab.jsx', fn: 'FitName', kind: 'offsetHeight', n: 1 },
  { file: 'src/ui/mobile/dash/GearTab.jsx', fn: 'FitName', kind: 'scrollWidth', n: 1 },
  { file: 'src/ui/mobile/dash/GearTab.jsx', fn: 'GearTab', kind: 'clientHeight', n: 1 },
  { file: 'src/ui/mobile/dash/GearTab.jsx', fn: 'GearTab', kind: 'scrollHeight', n: 1 },
  { file: 'src/ui/mobile/dash/GearTab.jsx', fn: 'GearTab', kind: 'scrollTop', n: 2 },
  { file: 'src/ui/mobile/dash/GearTab.jsx', fn: 'anchorOf', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/ui/mobile/dash/GearTab.jsx', fn: 'read', kind: 'getBoundingClientRect', n: 1 },
  /* src/ui/mobile/dash/InventoryPanel.jsx */
  { file: 'src/ui/mobile/dash/InventoryPanel.jsx', fn: 'InventoryPanel', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/ui/mobile/dash/InventoryPanel.jsx', fn: 'handleTap', kind: 'getBoundingClientRect', n: 2 },
  { file: 'src/ui/mobile/dash/InventoryPanel.jsx', fn: 'measure', kind: 'clientHeight', n: 2 },
  /* src/ui/mobile/dash/ItemDetailPopup.jsx */
  { file: 'src/ui/mobile/dash/ItemDetailPopup.jsx', fn: 'place', kind: 'offsetHeight', n: 1 },
  { file: 'src/ui/mobile/dash/ItemDetailPopup.jsx', fn: 'place', kind: 'offsetWidth', n: 1 },
  { file: 'src/ui/mobile/dash/ItemDetailPopup.jsx', fn: 'place', kind: 'scrollHeight', n: 1 },
  { file: 'src/ui/mobile/dash/ItemDetailPopup.jsx', fn: 'positionFor', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/ui/mobile/dash/ItemDetailPopup.jsx', fn: 'positionFor', kind: 'innerHeight', n: 1 },
  /* src/ui/mobile/dash/LeaderboardPanel.jsx */
  { file: 'src/ui/mobile/dash/LeaderboardPanel.jsx', fn: 'fitName', kind: 'getComputedStyle', n: 1 },
  { file: 'src/ui/mobile/dash/LeaderboardPanel.jsx', fn: 'fitName', kind: 'measureText', n: 1 },
  /* src/ui/mobile/dash/MonsterCodex.jsx */
  { file: 'src/ui/mobile/dash/MonsterCodex.jsx', fn: 'barInset', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/ui/mobile/dash/MonsterCodex.jsx', fn: 'barInset', kind: 'getComputedStyle', n: 1 },
  { file: 'src/ui/mobile/dash/MonsterCodex.jsx', fn: 'fit', kind: 'clientHeight', n: 1 },
  { file: 'src/ui/mobile/dash/MonsterCodex.jsx', fn: 'fit', kind: 'clientWidth', n: 1 },
  { file: 'src/ui/mobile/dash/MonsterCodex.jsx', fn: 'reveal', kind: 'clientHeight', n: 1 },
  { file: 'src/ui/mobile/dash/MonsterCodex.jsx', fn: 'reveal', kind: 'getBoundingClientRect', n: 2 },
  { file: 'src/ui/mobile/dash/MonsterCodex.jsx', fn: 'reveal', kind: 'scrollTop', n: 3 },
  { file: 'src/ui/mobile/dash/MonsterCodex.jsx', fn: 'scrollBox', kind: 'getComputedStyle', n: 1 },
  /* src/ui/mobile/dash/NavRail.jsx */
  { file: 'src/ui/mobile/dash/NavRail.jsx', fn: 'measure', kind: 'clientWidth', n: 1, hb: '3, 5' },
  /* src/ui/mobile/dash/OneBandColumns.jsx */
  { file: 'src/ui/mobile/dash/OneBandColumns.jsx', fn: 'read', kind: 'clientHeight', n: 1, hb: '3' },
  { file: 'src/ui/mobile/dash/OneBandColumns.jsx', fn: 'read', kind: 'clientWidth', n: 1, hb: '3' },
  /* src/ui/mobile/dash/QuestJournalPage.jsx */
  { file: 'src/ui/mobile/dash/QuestJournalPage.jsx', fn: 'read', kind: 'getBoundingClientRect', n: 1 },
  /* src/ui/mobile/dash/bagLife.js */
  { file: 'src/ui/mobile/dash/bagLife.js', fn: 'play', kind: 'offsetWidth', n: 1 },
  { file: 'src/ui/mobile/dash/bagLife.js', fn: 'tick', kind: 'querySelectorAll', n: 1 },
  { file: 'src/ui/mobile/dash/bagLife.js', fn: 'visible', kind: 'elementFromPoint', n: 1 },
  { file: 'src/ui/mobile/dash/bagLife.js', fn: 'visible', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/ui/mobile/dash/bagLife.js', fn: 'visible', kind: 'innerHeight', n: 1 },
  { file: 'src/ui/mobile/dash/bagLife.js', fn: 'visible', kind: 'innerWidth', n: 1 },
  /* src/ui/mobile/dash/railKit.js */
  { file: 'src/ui/mobile/dash/railKit.js', fn: 'read', kind: 'getBoundingClientRect', n: 1 },
  /* src/ui/mobile/deathStripPlace.js */
  { file: 'src/ui/mobile/deathStripPlace.js', fn: 'deathStripPlace', kind: 'getBoundingClientRect', n: 2 },
  { file: 'src/ui/mobile/deathStripPlace.js', fn: 'deathStripPlace', kind: 'getComputedStyle', n: 1 },
  { file: 'src/ui/mobile/deathStripPlace.js', fn: 'deathStripPlace', kind: 'innerWidth', n: 1 },
  /* src/ui/mobile/gearFlash.js */
  { file: 'src/ui/mobile/gearFlash.js', fn: 'shown', kind: 'getBoundingClientRect', n: 1, hb: '24' },
  { file: 'src/ui/mobile/gearFlash.js', fn: 'shown', kind: 'querySelectorAll', n: 1, hb: '24' },
  { file: 'src/ui/mobile/gearFlash.js', fn: 'tick', kind: 'querySelectorAll', n: 1, hb: '24' },
  /* src/ui/mobile/playViewport.js */
  { file: 'src/ui/mobile/playViewport.js', fn: 'panelVw', kind: 'getComputedStyle', n: 1 },
  { file: 'src/ui/mobile/playViewport.js', fn: 'panelVw', kind: 'getPropertyValue', n: 1 },
  /* src/ui/mobile/sheet/BroCard.jsx */
  { file: 'src/ui/mobile/sheet/BroCard.jsx', fn: 'BroCard', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/ui/mobile/sheet/BroCard.jsx', fn: 'BroCard', kind: 'querySelectorAll', n: 1 },
  { file: 'src/ui/mobile/sheet/BroCard.jsx', fn: 'measure', kind: 'clientWidth', n: 1 },
  /* src/ui/mobile/sheet/HeroExpanded.jsx */
  { file: 'src/ui/mobile/sheet/HeroExpanded.jsx', fn: 'HeroExpanded', kind: 'clientHeight', n: 1 },
  { file: 'src/ui/mobile/sheet/HeroExpanded.jsx', fn: 'HeroExpanded', kind: 'getBoundingClientRect', n: 2 },
  { file: 'src/ui/mobile/sheet/HeroExpanded.jsx', fn: 'HeroExpanded', kind: 'getComputedStyle', n: 1 },
  { file: 'src/ui/mobile/sheet/HeroExpanded.jsx', fn: 'HeroExpanded', kind: 'scrollHeight', n: 1 },
  { file: 'src/ui/mobile/sheet/HeroExpanded.jsx', fn: 'HeroExpanded', kind: 'scrollTop', n: 3 },
  { file: 'src/ui/mobile/sheet/HeroExpanded.jsx', fn: 'onClick', kind: 'getBoundingClientRect', n: 1 },
  /* src/ui/mobile/sheet/StatCaption.jsx */
  { file: 'src/ui/mobile/sheet/StatCaption.jsx', fn: 'StatCaption', kind: 'clientWidth', n: 3 },
  { file: 'src/ui/mobile/sheet/StatCaption.jsx', fn: 'StatCaption', kind: 'scrollWidth', n: 1 },
  { file: 'src/ui/mobile/sheet/StatCaption.jsx', fn: 'textWidth', kind: 'getComputedStyle', n: 1 },
  { file: 'src/ui/mobile/sheet/StatCaption.jsx', fn: 'textWidth', kind: 'measureText', n: 1 },
  /* src/ui/mobile/sheet/StatDemo.jsx */
  { file: 'src/ui/mobile/sheet/StatDemo.jsx', fn: 'measure', kind: 'clientWidth', n: 1 },
  { file: 'src/ui/mobile/sheet/StatDemo.jsx', fn: 'measure', kind: 'offsetLeft', n: 1 },
  /* src/ui/mobile/sheet/scrollTap.js */
  { file: 'src/ui/mobile/sheet/scrollTap.js', fn: 'onTouchEnd', kind: 'scrollTop', n: 1 },
  { file: 'src/ui/mobile/sheet/scrollTap.js', fn: 'onTouchStart', kind: 'scrollTop', n: 1 },
  { file: 'src/ui/mobile/sheet/scrollTap.js', fn: 'scrollerOf', kind: 'clientHeight', n: 1 },
  { file: 'src/ui/mobile/sheet/scrollTap.js', fn: 'scrollerOf', kind: 'getComputedStyle', n: 1 },
  { file: 'src/ui/mobile/sheet/scrollTap.js', fn: 'scrollerOf', kind: 'scrollHeight', n: 1 },
  /* src/ui/mobile/sheetStamp.js */
  { file: 'src/ui/mobile/sheetStamp.js', fn: 'stampSheetH', kind: 'getComputedStyle', n: 1 },
  { file: 'src/ui/mobile/sheetStamp.js', fn: 'stampSheetH', kind: 'getPropertyValue', n: 1 },
  /* src/ui/oneBand.js */
  { file: 'src/ui/oneBand.js', fn: '__btOneBand', kind: 'getComputedStyle', n: 1 },
  { file: 'src/ui/oneBand.js', fn: '__btOneBand', kind: 'innerHeight', n: 1 },
  { file: 'src/ui/oneBand.js', fn: '__btOneBand', kind: 'innerWidth', n: 1 },
  { file: 'src/ui/oneBand.js', fn: 'px', kind: 'getPropertyValue', n: 1 },
  { file: 'src/ui/oneBand.js', fn: 'r', kind: 'getBoundingClientRect', n: 1 },
  /* src/ui/panels/BodyInk.jsx */
  { file: 'src/ui/panels/BodyInk.jsx', fn: 'BodyInk', kind: 'clientHeight', n: 1 },
  { file: 'src/ui/panels/BodyInk.jsx', fn: 'BodyInk', kind: 'clientWidth', n: 1 },
  { file: 'src/ui/panels/BodyInk.jsx', fn: 'BodyInk', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/ui/panels/BodyInk.jsx', fn: 'cellCenter', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/ui/panels/BodyInk.jsx', fn: 'move', kind: 'getBoundingClientRect', n: 1 },
  /* src/ui/panels/KeyboardHintsPanel.jsx */
  { file: 'src/ui/panels/KeyboardHintsPanel.jsx', fn: 'sideRoom', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/ui/panels/KeyboardHintsPanel.jsx', fn: 'sideRoom', kind: 'innerHeight', n: 2 },
  { file: 'src/ui/panels/KeyboardHintsPanel.jsx', fn: 'sideRoom', kind: 'innerWidth', n: 1 },
  /* src/ui/panels/NameModal.jsx */
  { file: 'src/ui/panels/NameModal.jsx', fn: 'NameModal', kind: 'scrollTop', n: 2 },
  { file: 'src/ui/panels/NameModal.jsx', fn: '_measureMore', kind: 'clientHeight', n: 2 },
  { file: 'src/ui/panels/NameModal.jsx', fn: '_measureMore', kind: 'scrollHeight', n: 2 },
  { file: 'src/ui/panels/NameModal.jsx', fn: '_measureMore', kind: 'scrollTop', n: 2 },
  { file: 'src/ui/panels/NameModal.jsx', fn: 'onR', kind: 'innerHeight', n: 1 },
  { file: 'src/ui/panels/NameModal.jsx', fn: 'onScroll', kind: 'scrollLeft', n: 2 },
  { file: 'src/ui/panels/NameModal.jsx', fn: 'onScroll', kind: 'scrollTop', n: 2 },
  /* src/ui/panels/NewMonsterCard.jsx */
  { file: 'src/ui/panels/NewMonsterCard.jsx', fn: 'NewMonsterCard', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/ui/panels/NewMonsterCard.jsx', fn: 'NewMonsterCard', kind: 'innerHeight', n: 1 },
  /* src/ui/panels/PlayerPaint.jsx */
  { file: 'src/ui/panels/PlayerPaint.jsx', fn: 'WornPreview', kind: 'clientHeight', n: 1 },
  { file: 'src/ui/panels/PlayerPaint.jsx', fn: 'WornPreview', kind: 'clientWidth', n: 1 },
  { file: 'src/ui/panels/PlayerPaint.jsx', fn: 'cellAt', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/ui/panels/PlayerPaint.jsx', fn: 'onHandle', kind: 'getBoundingClientRect', n: 1 },
  /* src/ui/panels/QuestOfferPanel.jsx */
  { file: 'src/ui/panels/QuestOfferPanel.jsx', fn: 'Claimed', kind: 'querySelectorAll', n: 1 },
  /* src/ui/panels/TradeWindowPanel.jsx */
  { file: 'src/ui/panels/TradeWindowPanel.jsx', fn: 'TradeWindowPanel', kind: 'querySelectorAll', n: 1 },
  { file: 'src/ui/panels/TradeWindowPanel.jsx', fn: 'landingRect', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/ui/panels/TradeWindowPanel.jsx', fn: 'tossToBag', kind: 'getBoundingClientRect', n: 1 },
  /* src/ui/panels/TrapButton.jsx */
  { file: 'src/ui/panels/TrapButton.jsx', fn: 'TrapButton', kind: 'innerWidth', n: 1 },
  /* src/ui/panels/buildings/DailySpin.jsx */
  { file: 'src/ui/panels/buildings/DailySpin.jsx', fn: 'applyRot', kind: 'querySelectorAll', n: 1 },
  { file: 'src/ui/panels/buildings/DailySpin.jsx', fn: 'read', kind: 'getComputedStyle', n: 1 },
  /* src/ui/panels/buildings/EnchantPanel.jsx */
  { file: 'src/ui/panels/buildings/EnchantPanel.jsx', fn: 'EnchantPanel', kind: 'clientHeight', n: 1 },
  { file: 'src/ui/panels/buildings/EnchantPanel.jsx', fn: 'EnchantPanel', kind: 'scrollHeight', n: 1 },
  { file: 'src/ui/panels/buildings/EnchantPanel.jsx', fn: 'EnchantPanel', kind: 'scrollTop', n: 1 },
  /* src/ui/panels/buildings/GamblePanel.jsx */
  { file: 'src/ui/panels/buildings/GamblePanel.jsx', fn: 'GamblePanel', kind: 'clientHeight', n: 1 },
  { file: 'src/ui/panels/buildings/GamblePanel.jsx', fn: 'GamblePanel', kind: 'scrollHeight', n: 1 },
  { file: 'src/ui/panels/buildings/GamblePanel.jsx', fn: 'GamblePanel', kind: 'scrollTop', n: 1 },
  /* src/ui/panels/buildings/TownBoard.jsx */
  { file: 'src/ui/panels/buildings/TownBoard.jsx', fn: 'TownBoard', kind: 'offsetHeight', n: 1 },
  { file: 'src/ui/panels/buildings/TownBoard.jsx', fn: 'TownBoard', kind: 'querySelectorAll', n: 2 },
  /* src/ui/pointsFly.js */
  { file: 'src/ui/pointsFly.js', fn: 'flyPointsBubbles', kind: 'getBoundingClientRect', n: 1 },
  /* src/ui/starCue.js */
  { file: 'src/ui/starCue.js', fn: 'done', kind: 'querySelectorAll', n: 1 },
  { file: 'src/ui/starCue.js', fn: 'play', kind: 'innerHeight', n: 1 },
  { file: 'src/ui/starCue.js', fn: 'play', kind: 'innerWidth', n: 1 },
  /* src/ui/zoneBannerOverlay.js */
  { file: 'src/ui/zoneBannerOverlay.js', fn: 'onScreen', kind: 'getBoundingClientRect', n: 1 },
  { file: 'src/ui/zoneBannerOverlay.js', fn: 'onScreen', kind: 'querySelectorAll', n: 1 },
  { file: 'src/ui/zoneBannerOverlay.js', fn: 'playZoneBanner', kind: 'getBoundingClientRect', n: 2 },
  { file: 'src/ui/zoneBannerOverlay.js', fn: 'playZoneBanner', kind: 'querySelectorAll', n: 1 },
  { file: 'src/ui/zoneBannerOverlay.js', fn: 'pulseTitle', kind: 'offsetWidth', n: 1 },
  { file: 'src/ui/zoneBannerOverlay.js', fn: 'titleRect', kind: 'getBoundingClientRect', n: 1 },
]);
