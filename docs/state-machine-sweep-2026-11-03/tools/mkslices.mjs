// Builds the sweep's slice manifests from lines.tsv and checks every in-scope file is in exactly one slice.
import fs from 'node:fs';
const SP = '/tmp/claude-0/-home-user-GameDev/1ce7f958-f168-5491-938e-aa5095f58949/scratchpad';
const rows = fs.readFileSync(`${SP}/lines.tsv`, 'utf8').trim().split('\n').map(l => l.split('\t')).map(([d, n, p]) => ({ p, n: +n }));
const inScope = rows.filter(r => /^(src\/|server\/src\/|public\/tools\/)/.test(r.p) && !r.p.startsWith('server/src/vendor/'));
const size = Object.fromEntries(inScope.map(r => [r.p, r.n]));
const sv = a => a.map(f => `server/src/${f}.js`), gm = a => a.map(f => `src/game/${f}.js`);
const BT = 7860, ER = 9300, EF = 9250;
const SL = {
  S1: sv(['index','relay','bundle','clientoff','presence2','httpauth','origin','linger']),
  S2: sv(['join','persistence','migrations','devicelock','loginkeys','verify','account','broverify','testmode','lastplace','nearjoin','wheelnear','hidden','liveops','admin','devtools']),
  S3: sv(['tick','tickpace','movement','movepath','steadymovers','monstermoves','monsterstatus','spawnscale','wheelspawns','wheelspawns1','wheeltables','wheelzone','grids','aggrogrid','threat','cadence','depth','ride','sprint','staminaregen','rest','race']),
  S4: sv(['combat','hits','abilities','telegraph','elemental','arrowblast','burst','firetrail','flood','heapburn','hitproof','killroll','itemdrop','safeheal','slimeboss','statcap','oneformula','shieldgem','shieldwear','weapongem','xpdecay']),
  S5: sv(['arena','duel','spar','gladiator','pvpbalance','pvpextras','pvplunge','dungeon','dungeonreward','wheeldungeon','nomansland','chainscore','eventcapes','eventplace']),
  S6: sv(['market','marketplace','trade','trade2','store','storechat','storegear','storeoffer','shop','bank','inbox','gamble','dice','revealbag','salvage','onchain','chainwriter','gscopper']),
  S7: sv(['farm','farmorders','cooking','gathering','smelting','trapping','fishlog','hardening','hardenedwood','armorforge','forgeladder','swordconvert','shardcrack','gems','gear','gearprov','gearstash','amulet','props']),
  S8: sv(['party','clans','clanparty','alliance','friends','guilds','chatguard','chatlanes','chatmod','emotes','poses','keywords','lookrelay','feedback','leaderboard','botfp','botsig','botstats']),
  S9: sv(['quests','achievements','dailyrewards','dailychest','prog3','codex','petbook','pets','pointsreset','data']),
  N1: ['wsClient','index','serverReady','rosterCookie','charRoster','broWallet'].map(f => `src/networking/${f}.js`),
  N2: ['gameEvents','monsterMoveEvents','nodeSync','peerCosmetics'].map(f => `src/networking/${f}.js`).concat(['src/debug/']),
  G1: gm(['monsterCombat','projectiles','combatHelpers','targeting']),
  G2: gm(['playerActions','abilities','dodge','jump','jumpActions','tapJump','climb','climbActions','sprint','ride','rideGround','rideSound','wheelSwim','shieldToggle','shieldGem','shieldWear','deskShield','desktopControls','deskCombos','deskKeys','deskKeyList','deskWords','gesturePose','emoteMoves','emotes','legSync','avatarHold','elemHits','elemWindup','deathBlow','pvpSwing','peerShots','shotGround','arrowEdge','bowVolley','killRoll','killXp','weaponGem','weaponSlots','quickEat','fightFood','respawn','deathCard']),
  G3: gm(['zoneTransitions','zoneMechanics','worldTrial','wheelTrial','worldViewport','wheelBreak','wheelDungeons','wheelHome','wheelMusic','wheelNoticeboard','wheelSize','wheelTownDoors','dungeonWaves','dungeonClear','dungeonArt','noMansLand','nmlAsk','nmlExplainOnce','nearJoin','presence2','buildingRooms','buildWatch','timeOfDay','season','placeSafety','plateSafety','tooFar','viewCap','crowdCap','mapPins','mapPinPlaces','pinSlots','tour','welcomeBanner','interactions','race']),
  G4: gm(['quests','questJournal','questRoute','questWays','questFly','questComplete','questCard','questPins','questTrailStyle','trackedQuest','achievements','dailyRewards','levelCelebration','xpBar','xpPop','mastery','lifeSkillRewards','farmFeedback','farmTrip','farmWalk','farmWork','trapping','fishWeigh','smithing','salvage','shardCrack','tierOre','tierTrees','groundLoot','itemDrop','dropLines','dropLook','revealBag','bank','postOffice','heapBurn','bossChest']),
  G5: ['src/game/'],                       // the rest of src/game
  U1: [`src/ui/BroTown.jsx:1-${BT}`, 'src/ui/GameApp.jsx', 'src/main.jsx'],
  U2: [`src/ui/BroTown.jsx:${BT + 1}-15722`, ...['loadingGate','lazyPanel','lazyPanels','keepSwitches','onboardingPace'].map(f => `src/ui/${f}.js`)],
  U3: ['src/ui/TOP', 'src/ui/account/', 'src/ui/reveal/'],
  P1: ['src/ui/panels/buildings/'],
  P2: ['TradeWindowPanel','TradePanel','IncomingTradePanel','DuelRequestPanel','ClanPanel','ClanInviteCard','GuildPanel','SocialPanel','PartyHUD','PlayerListPanel','PlayerProfilePanel','InspectPlayerPanel','ChatPanel','LeaderboardPanel','ShopkeeperPanel','WarBanner','ThreatIncomingPanel','NpcDialogue','QuestOfferPanel','QuestPanel','QuestBannerLayer','questArt','AchievementBanner','UpdateBanner','FeedbackPanel'].map(f => `src/ui/panels/${f}.jsx`).concat(['src/ui/panels/playerProfile.js']),
  P3: ['AbilityButtons','AceFlipPanel','JumpButton','QuickEatButton','RideButton','ShieldButton','SpecialButton','SprintButton','TouchControls','TrapButton','TrapCatchCard','WeaponPill','controlSkin','MenuBar','KeyboardHintsPanel','EmotePanel','FishWeighCard','NewMonsterCard','InventoryPanel','InfoPanel','StatScreenPanel','SkillsPanel','PetHousePanel','FurniturePanel','EncyclopediaPanel','LoginScreen'].map(f => `src/ui/panels/${f}.jsx`),
  P4: ['src/ui/panels/'],                  // the rest of panels: creator, paint, dev tools
  M1: ['QuestCoach.jsx','ControlsTutorial.jsx','controlsTutorialBus.js','QuestStepNudge.jsx','BottomDashboard.jsx','dashboardPanelBus.js','dashMinBus.js','modalGuardBus.js','uiBusyBus.js','actionBus.js','ZoneHeader.jsx','zoneTitle.js','placeName.js','playViewport.js','DeathCard.jsx','deathStripPlace.js','DungeonClearHud.jsx','RaceHud.jsx','ChestReveal.jsx','DailyRewardsWindow.jsx','MasteryNotification.jsx','XpTrack.jsx','xpBarArt.js','InstallHint.jsx','installHintBus.js','StoreToast.jsx','storeToastBus.js','sheetStamp.js','NmlAskCard.jsx','NmlBadge.jsx','ElementBurstButton.jsx','SpecialChargePie.jsx','aceFlipBus.js','blockRingBus.js','capeStatusBus.js','gearFlash.js','FarmBedPrompt.jsx','farmBus.js','firemakingBus.js','eatBus.js','wheelBus.js'].map(f => `src/ui/mobile/${f}`),
  M2: ['InventoryPanel.jsx','ItemDetailPopup.jsx','GearTab.jsx','equipActions.js','itemActions.js','bagLife.js','bagModel.js','bagFilterBus.js','BagFilterChips.jsx','inventoryLocks.js','gearSellLocal.js','gearSellReason.js','gearStats.js','gearTabBus.js','itemCategory.js','itemDetailBus.js','WeaponBar.jsx','combatSkill.js','common.js'].map(f => `src/ui/mobile/dash/${f}`)
      .concat(['InventorySurface.jsx','InventoryTile.jsx','ItemArt.jsx','ItemTooltip.jsx','inventoryBus.js','inventoryStyles.js','mockItems.js','mockProfile.js','EquippedTab.jsx','tradeBagBus.js','shopBus.js'].map(f => `src/ui/mobile/${f}`)),
  M3: ['src/ui/mobile/sheet/'],
  M4: ['src/ui/mobile/'],                  // the rest of mobile: chat, info, social, the other dash panels
  R1: [`src/rendering/systems/entityRenderer.js:1-${ER}`],
  R2: [`src/rendering/systems/entityRenderer.js:${ER + 1}-18589`],
  R3: [`src/rendering/systems/effectsRenderer.js:1-${EF}`],
  R4: [`src/rendering/systems/effectsRenderer.js:${EF + 1}-18492`],
  R5: ['src/rendering/systems/', ...['pixiRenderer','pixiApp','preloadAnimations','chestPreload','controlsPreload','gestureCuePreload','levelUpBurstPreload','questArtPreload','statDemoPreload','xpBarPreload','zoneBannerPreload'].map(f => `src/rendering/${f}.js`)],
  R6: ['paletteTex','paletteLoad','paletteDraw','p256','png8Decode','png8Worker','heldNumbers','gpuOnly','keepAsImage','releaseCanvasTexture','texturePoolTrim','textRelease','maskedBake','maskedBakeWorker','maskedEvict','picsOnce','picsNumbers','retryLooks','webpImage','canvasWitness','bindGroupFix','fillBatch','drawLists','depthSort','layerUniforms','gfxLean','sharpPixels','quietClear','renderHeal','zoneTextures','chunkGround','tiledMaps','wheelMonsterArt','lookBake','lookExpand','photoSheet','spriteScale'].map(f => `src/rendering/${f}.js`).concat(['src/rendering/lightfx/']),
  R7: ['playerSkins','playerDecal','playerSprites','playerAnchors','playerDeathSprites','characterPortrait','hemiBust','hemiBustCore','hemiLook','hemiAtlasIndex','lookArmour','lookArmourProbe','lookFolk','lookPalette','lookPaletteProbe','lookShirt','lookShirtFrame','lookShirtProbe','gearSheets','gearCatalog','gearVariants','gearVersion'].map(f => `src/rendering/${f}.js`).concat(['src/rendering/lookSets/']),
  R8: ['standIns','standInGarb','standInInk','garmentConfine','hairClip','headCrowns','headFrames','flipHead','earSides','fistMasks','jogWaist','bowTorsoCut','swordTorsoCut','blockArm','backShield','capeSprites','shieldSprites','weaponSprites','combatGear','toolRecolor','toolWood','formShade','folkPose','npcSprites','nftAvatars','fighterCapture','petSprites','traitCategories','traitThumbs'].map(f => `src/rendering/${f}.js`).concat(['src/rendering/traits/']),
  R9: ['monsterDeathFx','monsterDeathZonesFx','monsterRecolor','monsterShotArt','monsterShotFx','monsterSilhouette','monsterVariantSprites','mummySprites','rockmonsterSprites','skeletonSprites','slimeSprites','slimeSplat','snowmanSprites','fireGoblinSprites','fishmanSprites','deathCrumble','hitMaterialFx','arrowPin','arrowWound','aimCaret','lockReticle'].map(f => `src/rendering/${f}.js`),
  R10: ['hotArrowFx','staffCastFx','elemWindup','elemWindupShapes','emoteFx','jumpFx','rideFx','swimFx','trapFx','fxStrips','sootMarks','worldFx','worldFxTextures','worldLife','wheelLife','buildingFire','campfireArt','campfireFx','grottoFx','landAuras'].map(f => `src/rendering/${f}.js`),
  R11: ['src/rendering/'],                 // the rest of rendering: wheel objects, ground, water, doors, farm/arena worlds
  D1: ['src/data/gameSystems.js', 'src/data/A-K'],
  D2: ['src/data/'],                       // gameDisplay.js + the rest of src/data
  T1: ['public/tools/world/'],
  T2: ['public/tools/'],
};
const owner = {};          // file -> slice (whole files)
const ranges = [];         // split files
const order = Object.keys(SL);
// pass 1: exact files and ranges; pass 2: prefixes in declared order (first claim wins), so "rest" buckets come last.
for (const id of order) for (const e of SL[id]) {
  const m = e.match(/^(.*\.(?:js|jsx|mjs)):(\d+)-(\d+)$/);
  if (m) { ranges.push({ id, p: m[1], a: +m[2], b: +m[3] }); owner[m[1]] = owner[m[1]] || 'SPLIT'; continue; }
  if (/\.(js|jsx|mjs)$/.test(e)) { if (!(e in size)) console.log('MISSING FILE', id, e); else if (owner[e]) console.log('DOUBLE', e, owner[e], id); else owner[e] = id; }
}
for (const id of order) for (const e of SL[id]) {
  if (/\.(js|jsx|mjs)(:\d+-\d+)?$/.test(e)) continue;
  for (const p of Object.keys(size)) {
    if (owner[p]) continue;
    let hit = false;
    if (e === 'src/ui/TOP') hit = /^src\/ui\/[^/]+$/.test(p);
    else if (e === 'src/data/A-K') hit = /^src\/data\/[a-k][^/]*$/i.test(p) && p !== 'src/data/gameDisplay.js';
    else hit = p.startsWith(e) && (e.endsWith('/') ? (e === 'src/game/' || e === 'src/ui/panels/' || e === 'src/ui/mobile/' || e === 'src/rendering/' || e === 'src/data/' || e === 'public/tools/' || e === 'src/rendering/systems/' ? true : true) : false);
    if (hit) owner[p] = id;
  }
}
const un = Object.keys(size).filter(p => !owner[p]);
if (un.length) console.log('UNASSIGNED', un);
const out = {};
for (const id of order) out[id] = { files: [], lines: 0 };
for (const [p, id] of Object.entries(owner)) if (id !== 'SPLIT') { out[id].files.push(p); out[id].lines += size[p]; }
for (const r of ranges) { out[r.id].files.unshift(`${r.p}:${r.a}-${r.b}`); out[r.id].lines += r.b - r.a + 1; }
let tot = 0;
for (const id of order) {
  const o = out[id]; o.files.sort((x, y) => (x.includes(':') ? -1 : y.includes(':') ? 1 : x.localeCompare(y)));
  tot += o.lines;
  fs.writeFileSync(`${SP}/sm/slices/${id}.txt`, `# slice ${id}: ${o.files.length} files, ${o.lines} lines (paths relative to /home/user/GameDev)\n` + o.files.map(f => (f.includes(':') ? f : `${f}  (${size[f]} lines)`)).join('\n') + '\n');
  console.log(id.padEnd(4), String(o.lines).padStart(6), 'lines', String(o.files.length).padStart(4), 'files');
}
console.log('TOTAL', tot, 'lines across', order.length, 'slices; in-scope files', Object.keys(size).length);
