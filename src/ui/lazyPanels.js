/* v2.3.3717: the windows a player opens now and then, each its own small
   script, loaded the first time it is opened (v2.3.3736: the default; with
   the page, as before, under `?codelazy=0`) -- lazyPanel.js says how and why.  Only
   windows no fight uses; each module here is imported by nothing else that
   is in the main script, or vite would keep it there.
   v2.3.3736: the old windows name their own close (the third argument), for
   the "Couldn't open this" card when a window's script cannot come
   (lazyPanel.js): closed, the game is no longer "busy" behind it.  The
   buildings' windows sit in BroTown's card, whose backdrop closes it, and the
   dashboard's pages under its own back; neither needs one. */
import { lazyPanel } from './lazyPanel.js';

/* the old windows, BroTown.jsx */
export const LeaderboardPanel = lazyPanel(() => import('./panels/LeaderboardPanel.jsx'), 'LeaderboardPanel', (p) => p.setShowLeaderboard(false));
export const FeedbackPanel = lazyPanel(() => import('./panels/FeedbackPanel.jsx'), 'FeedbackPanel', (p) => p.setShowFeedback(false));
export const ClanPanel = lazyPanel(() => import('./panels/ClanPanel.jsx'), 'ClanPanel', (p) => p.setShowClanPanel(false));
export const PetHousePanel = lazyPanel(() => import('./panels/PetHousePanel.jsx'), 'PetHousePanel', (p) => p.setShowPetHouse(false));
export const FurniturePanel = lazyPanel(() => import('./panels/FurniturePanel.jsx'), 'FurniturePanel', (p) => p.setShowFurniture(false));
export const DungeonCreatorPanel = lazyPanel(() => import('./panels/DungeonCreatorPanel.jsx'), 'DungeonCreatorPanel', (p) => p.setShowDungeonCreator(false));
export const EncyclopediaPanel = lazyPanel(() => import('./panels/EncyclopediaPanel.jsx'), 'EncyclopediaPanel', (p) => p.setShowEncyclopedia(false));
export const StatScreenPanel = lazyPanel(() => import('./panels/StatScreenPanel.jsx'), 'StatScreenPanel', (p) => p.setShowStatScreen(false));
export const TradeWindowPanel = lazyPanel(() => import('./panels/TradeWindowPanel.jsx'), 'TradeWindowPanel', (p) => p.setTrade2(null));
/* a player's card and profile (PlayerProfilePanel.jsx comes with it) */
export const InspectPlayerPanel = lazyPanel(() => import('./panels/InspectPlayerPanel.jsx'), 'InspectPlayerPanel', (p) => p.setInspectPlayer(null));
/* the buildings' windows: the exchange, the gambling den (DailySpin.jsx with
   it), the arena's */
export const ExchangePanel = lazyPanel(() => import('./panels/buildings/ExchangePanel.jsx'), 'ExchangePanel');
export const GamblePanel = lazyPanel(() => import('./panels/buildings/GamblePanel.jsx'), 'GamblePanel');
export const PartyPanel = lazyPanel(() => import('./panels/buildings/PartyPanel.jsx'), 'PartyPanel');
/* ...and the town's other buildings, opened standing in them: the
   Blacksmith and the Woodworker (BenchParts.jsx shared), the Gem Works (the
   Gem Cutter, the Enchanter, the shard cracking), the cook, the farm (its
   feed and seeds), the auction house and its chat, the shop, the bank, the
   Land Office */
export const SmithyPanel = lazyPanel(() => import('./panels/buildings/SmithyPanel.jsx'), 'SmithyPanel');
export const WoodworkPanel = lazyPanel(() => import('./panels/buildings/WoodworkPanel.jsx'), 'WoodworkPanel');
export const GemWorksPanel = lazyPanel(() => import('./panels/buildings/GemWorksPanel.jsx'), 'GemWorksPanel');
export const CookPanel = lazyPanel(() => import('./panels/buildings/CookPanel.jsx'), 'CookPanel');
export const FarmPanel = lazyPanel(() => import('./panels/buildings/FarmPanel.jsx'), 'FarmPanel');
export const StorePanel = lazyPanel(() => import('./panels/buildings/StorePanel.jsx'), 'StorePanel');
export const VendorPanel = lazyPanel(() => import('./panels/buildings/VendorPanel.jsx'), 'VendorPanel');
export const BankPanel = lazyPanel(() => import('./panels/buildings/BankPanel.jsx'), 'BankPanel');
export const LandOfficePanel = lazyPanel(() => import('./panels/buildings/LandOfficePanel.jsx'), 'LandOfficePanel');

/* the dashboard's pages, BottomDashboard.jsx: the codex (MonsterCodex.jsx and
   its stage, CodexStage.jsx, with it), achievements, ranks, the clan,
   feedback, settings */
export const DashAchievementsPanel = lazyPanel(() => import('./mobile/dash/AchievementsPanel.jsx'), 'AchievementsPanel');
export const DashAchievementsHead = lazyPanel(() => import('./mobile/dash/AchievementsPanel.jsx'), 'AchievementsHead', null, true);   /* v2.3.3736: quiet: its page says it */
export const DashEncyclopediaPanel = lazyPanel(() => import('./mobile/dash/EncyclopediaPanel.jsx'), 'EncyclopediaPanel');
export const DashLeaderboardPanel = lazyPanel(() => import('./mobile/dash/LeaderboardPanel.jsx'), 'LeaderboardPanel');
export const DashClanPanel = lazyPanel(() => import('./mobile/dash/ClanPanel.jsx'), 'ClanPanel');
export const DashFeedbackPanel = lazyPanel(() => import('./mobile/dash/FeedbackPanel.jsx'), 'FeedbackPanel');
export const DashSettingsPanel = lazyPanel(() => import('./mobile/dash/SettingsPanel.jsx'), 'SettingsPanel');

/* the debug overlay (?dev=1 only), GameApp.jsx */
export const DebugOverlay = lazyPanel(() => import('../debug/DebugOverlay.jsx'), 'DebugOverlay');
