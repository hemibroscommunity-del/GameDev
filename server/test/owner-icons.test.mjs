/* ═══ v2.3.3481: THE OWNER'S CHOSEN ICONS (src/data/ownerIcons.js) ═══
 *
 * The owner's answer to the review of their thirteen icon sheets: "Icon picks:
 * 1b, 2a, 3, 4, 5, 6, 8, 9" (docs/specs/owner-icons.md).
 *   1. the files: every picture the game names is in public/ at the size the
 *      cutter writes (tools/ui/cut-owner-icons.py), each DOM icon's CSS size
 *      its picture's own shape, the quest pins one 72 x 86 frame with the grey
 *      "?" beside the gold; the thirteen sheets kept in assets/, none left at
 *      the top of the repo;
 *   2. landSceneUrl: the eight lands, and nothing else (a null-prototype map);
 *   3. the places (v2.3.3524: + the Blacksmith's Upgrade tab's hammer): the arena's helmet (the Saloon keeps its mug), the trade
 *      request's handshake (only that card), the jackpot's sack, the Pet
 *      House row's house, the free spin's wheel (the bonus spins keep the drawn
 *      one), the empty Journey page's map, the quest pins over the townsfolk
 *      (the drawn disc kept as the fallback);
 *   4. the loading: the pins on the loading screen, the handshake warmed with
 *      the controls; and since v2.3.3609 (the owner: "I also don't like the
 *      intro graphics to each zone.  The older ones were better.") the Wheel
 *      holds the four animated strips again, behind its loading screen, and
 *      lets them go on leaving it; the lands' scenes are not loaded;
 *   5. (v2.3.3511's emblem under the minimap, gone in v2.3.3609) a land's
 *      banner plays the owner's ornaments where it has them, the plaque alone
 *      where not; nothing draws a scene, over the plaque or under the minimap;
 *      landEmblem.js and its CSS are gone; the plate's scroll ends still cut
 *      off the kept pictures.
 *   6. v2.3.3526 ("Go recommended on everything"): the bag's legs and chest
 *      the sheet's, every metal made from them; card 11's clearer five -- the
 *      orange paw, the party's crown and pin, the auction gavel, the creator's
 *      none sign -- under new names the code points at.
 *   7. v2.3.3526, card 11 as the owner picked it ("Icon picks: ... T3.3 ...
 *      T129.1"): every one of the owner's 72 codes is in the cutter's list,
 *      already in the game, or set aside with its reason; every file the
 *      cutter wrote is still the one it wrote (its SHA-256 recorded: a re-run
 *      of process_icon_sheets.py, cut-small-icons.py or another older tool
 *      fails here), at the size its rule says; the Forge tab's anvil and the
 *      chat box's smiley are pointed at; Jump and the generic Special drawn
 *      as faces; the party's crown the owner's T112.2.
 *   9. v2.3.3609: the element icons as the element itself (the owner: "Some
 *      zones (like wind) have a strange rune representing the element.  It
 *      should just be a pure icon of the element"): wind, storm and stone
 *      drawn by tools/ui/draw-element-icons.py, pinned here by SHA-256, and
 *      never cut from sheet F again (process_icon_sheets.py DRAWN_IN_CODE).
 *   8. v2.3.3571: the owner's painted copper ore and pickaxe ("Ok change the
 *      art style of the copper ore and the pickaxe to this"), as
 *      tools/ui/cut-owner-items.py cut them, on today's canvases, the rock's
 *      label cropped at the pickaxe's measured box, a broken copper rock
 *      popping the bag's copper, the other ores still from the old lump; and
 *      the bag's bow the pine one again, the owner's card 11 bow the menu's
 *      own file ("I only wanted it to replace the menu art for the bow").
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

const OI = await import('../../src/data/ownerIcons.js');
const root = new URL('../../', import.meta.url);
const pub = (url) => new URL('public' + url.split('?')[0], root);
const src = (p) => readFileSync(new URL(p, root), 'utf8');
/* a webp's own size, from its header (small-icons.test.mjs) */
const dims = (u) => { const b = readFileSync(pub(u)); const i = b.indexOf('VP8'); if (b[i + 3] === 0x58) return [1 + b.readUIntLE(i + 12, 3), 1 + b.readUIntLE(i + 15, 3)];
  if (b[i + 3] === 0x4c) { const v = b.readUInt32LE(i + 9); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)]; } return [b.readUInt16LE(i + 14) & 0x3fff, b.readUInt16LE(i + 16) & 0x3fff]; };
const LANDS = ['frost', 'ember', 'sky', 'hollows', 'thunder', 'tidal', 'mist', 'verdant'];

/* ── 1. the files ── */
{
  const scenes = LANDS.map((l) => OI.LAND_SCENE[l]);
  const missing = scenes.filter((u) => !u || !existsSync(pub(u)));
  check('1a every land has its scene, a file in public/ui/banners/', scenes.length === 8 && missing.length === 0
    && scenes.every((u) => /^\/ui\/banners\/land-[a-z]+\.webp\?v=2\.3\.\d+$/.test(u)), missing);
  const sd = missing.length ? [] : scenes.map((u) => dims(u));
  /* the sheet's own px, never stretched: each about 190 x 100 */
  check('1b each scene at the sheet\'s own size (~190 x 100, wider than tall), under 0.1 MB decoded',
    sd.length === 8 && sd.every(([w, h]) => w >= 180 && w <= 215 && h >= 80 && h <= 112 && w > h && w * h * 4 < 100 * 1024), sd);
  const icons = Object.entries(OI.OWNER_ICON);
  const gone = icons.filter(([, v]) => !existsSync(pub(v.src))).map(([k]) => k);
  /* v2.3.3524: seven -- the Blacksmith's Upgrade tab's hammer */
  check(`1c the seven window icons are files in public/icons/ui/ (${icons.map(([k]) => k).join(', ')})`, icons.length === 7 && gone.length === 0, gone);
  /* each drawn at its picture's own shape, written at up to 3x its CSS size and never stretched */
  const shape = gone.length ? [] : icons.map(([k, v]) => { const [w, h] = dims(v.src); return { k, w, h, css: [v.w, v.h], off: Math.abs(w / h - v.w / v.h) / (w / h) }; });
  check('1d ...each one\'s CSS size is its picture\'s shape (within 6%) and its file no bigger than 3x it',
    shape.length === 7 && shape.every((s) => s.off < 0.06 && s.w <= 3 * s.css[0] + 1 && s.h <= 3 * s.css[1] + 1), shape);
  const pins = Object.values(OI.QUEST_PIN);
  check('1e the three quest pins, one 72 x 86 frame each, drawn 32 x 38 world px', pins.length === 3 && pins.every((u) => existsSync(pub(u)) && dims(u).join('x') === '72x86')
    && OI.QUEST_PIN_WORLD.w === 32 && OI.QUEST_PIN_WORLD.h === 38, pins);
  check('1f the waiting pin the game loads is the GREY "?" (the gold one beside it on disk, not loaded)',
    /\/ui\/quest\/pin-waiting-grey\.webp/.test(OI.QUEST_PIN.waiting) && existsSync(pub('/ui/quest/pin-waiting.webp'))
    && /pin-offer\.webp/.test(OI.QUEST_PIN.offer) && /pin-ready\.webp/.test(OI.QUEST_PIN.ready));
  const SHEETS = ['brotown-pixel-ui-asset-sheet-2.png', 'brotown-rpg-ui-asset-sheet-1.png', 'brotown-rpg-ui-icon-sheet-2.png',
    'colorful-rpg-game-ui-asset-sheet.png', 'fantasy-blacksmith-ui-component-sheet-2.png', 'fantasy-game-ui-icon-collection.png',
    'fantasy-rpg-crafting-ui-asset-sheet-1.png', 'fantasy-rpg-game-ui-asset-sheet-1.png', 'fantasy-rpg-ui-asset-sheet-1.png',
    'fantasy-rpg-ui-asset-sheet-2.png', 'overflowing-sack-of-gold-coins-3.png', 'pixel-style-character-creator-ui-sheet.png',
    'rpg-harvesting-and-combat-asset-sheet.png'];
  const kept = SHEETS.filter((f) => existsSync(new URL('assets/icons-source/owner-2026-10-19/' + f, root)));
  const top = readdirSync(root).filter((f) => /sheet|sack of gold/i.test(f) && /\.png$/i.test(f));
  check('1g the owner\'s thirteen sheets are kept in assets/icons-source/owner-2026-10-19/, none at the top of the repo', kept.length === 13 && top.length === 0, { kept: kept.length, top });
  const cut = src('tools/ui/cut-owner-icons.py');
  check('1h the cutter refuses to overwrite without --force and holds the review\'s four plate measures',
    /refusing to overwrite \(pass --force/.test(cut) && /REVIEW_PLATE_TOP = \{'hollows': 104, 'mist': 89, 'thunder': 101, 'tidal': 98\}/.test(cut));
}

/* ── 2. landSceneUrl ── */
{
  const t = OI.landSceneUrl;
  check('2a each of the eight lands gives its own scene', LANDS.every((l) => t(l) === OI.LAND_SCENE[l] && t(l).indexOf('/ui/banners/land-' + l + '.webp') === 0));
  check('2b the town, the commons, the sea, an unknown id or a prototype key: no scene',
    ['town', 'commons', 'sea', 'nml-1', '', '__proto__', 'toString', 'constructor'].every((k) => t(k) === null) && t(null) === null && t(undefined) === null && t(3) === null);
}

/* ── 3. the places ── */
{
  const pp = src('src/ui/panels/buildings/PartyPanel.jsx');
  const wh = src('src/ui/panels/buildings/WheelHallPanel.jsx');
  check('3a the arena window wears the helmet (its emoji fallback kept), not the Saloon\'s beer mug; the Saloon keeps its mug',
    /src: OWNER_ICON\.arenaHelmet\.src,/.test(pp) && !/bldg-tavern/.test(pp) && /\\uD83C\\uDFDF\\uFE0F/.test(pp)
    && /icon\('\/icons\/ui\/bldg-tavern\.webp', '🍺', 26\)/.test(wh));
  const tw = src('src/ui/panels/TradeWindowPanel.jsx');
  check('3b the trade request card leads with the handshake, and no other trade drawer wears an icon',
    /<TradeDrawer [^>]*title=\{`\$\{trade2\.fromName\} wants to trade`\}[^>]*icon=\{OWNER_ICON\.tradeHandshake\}[^>]*>/.test(tw)   /* other props may sit beside it (the invite's `kind`, v2.3.3481) */
    && (tw.match(/<TradeDrawer [^>]*icon=/g) || []).length === 1 && /\{icon && <img src=\{icon\.src\}/.test(tw));
  const gp = src('src/ui/panels/buildings/GamblePanel.jsx');
  check('3c the weekly jackpot\'s pool wears the sack of gold', /"data-jackpot-pool": ""/.test(gp) && /src: OWNER_ICON\.jackpotSack\.src/.test(gp));
  const pt = src('src/ui/mobile/dash/PetsPanel.jsx');
  const at = pt.indexOf('<div data-pet-house={cap}');
  const row = at >= 0 ? pt.slice(at, at + 900) : '';
  check('3d the Pet House row starts with the pet house', /<img src=\{OWNER_ICON\.petHouse\.src\}/.test(row), row.slice(0, 300));
  const dr = src('src/ui/mobile/DailyRewardsWindow.jsx');
  const spin = dr.slice(dr.indexOf('data-daily-spinrow='), dr.indexOf('{/* the quests */}'));
  check('3e the free daily spin row wears the prize wheel; the drawn wheel stays for the bonus spins elsewhere',
    /<img src=\{OWNER_ICON\.prizeWheel\.src\}/.test(spin) && !/<SpinGlyph/.test(spin) && (dr.match(/<SpinGlyph size=/g) || []).length >= 2, { spin: spin.slice(0, 200) });
  const jp = src('src/ui/mobile/dash/JourneyPanel.jsx');
  check('3f the empty Journey page shows the treasure map, not dimmed (its emoji fallback kept)',
    /<img src=\{OWNER_ICON\.journeyMap\.src\}/.test(jp) && !/nav-journey/.test(jp) && !/opacity: 0\.4/.test(jp) && /createTextNode\('🧭'\)/.test(jp));
  const er = src('src/rendering/systems/entityRenderer.js');
  check('3g the townsfolk wear the owner\'s pins, 38 tall, the drawn disc kept as the fallback',
    /const qmPin = new Sprite\(Texture\.EMPTY\);/.test(er) && /const t = _questPinTex\(display\._qmState\);/.test(er)
    && /pin\.width = QUEST_PIN_WORLD\.w; pin\.height = QUEST_PIN_WORLD\.h;/.test(er) && /const MARK_PX = QUEST_PIN_WORLD\.h;/.test(er)
    && /_drawQuestBadge\(display\._qmBadge, display\._qmFill, _ready\);/.test(er) && /display\._qmState = _ready \? 'ready' : _wait \? 'waiting' : 'offer';/.test(er));
  const mm = src('src/rendering/systems/minimapRenderer.js');
  check('3h the zones\' minimap marks a waiting quest grey too (a neutral grey: red, green and blue equal)', /const C_QUEST_WAIT = 0xb0b0b0;/.test(mm));
  /* v2.3.3524: the owner: "Make the upgrade tab icon different for smithing.
     Like a hammer" -- the hammer, not the currency strip's gold gem */
  const sp = src('src/ui/panels/buildings/SmithyPanel.jsx');
  const up = sp.slice(sp.indexOf("id: 'upgrade'"), sp.indexOf("id: 'upgrade'") + 120);
  check('3i the Blacksmith\'s Upgrade tab wears the hammer, not the gem', /icon: OWNER_ICON\.smithHammer\.src/.test(up) && !/icon: GEM/.test(up), up);
  const cut = src('tools/ui/cut-owner-icons.py');
  check('3j ...cut off the crafting sheet\'s gold "Craft" button by the gradient card\'s own key (`card`)',
    /name='icons\/ui\/smith-hammer', src='fantasy-rpg-crafting-ui-asset-sheet-1\.png', mode='card'/.test(cut) && /def cut_card\(/.test(cut));
}

/* ── 4. the loading ── */
{
  const pa = src('src/rendering/preloadAnimations.js');
  check('4a the quest pins load on the loading screen (never on first sight)', /questPins: preloadQuestPinTextures\(\)/.test(pa));
  /* v2.3.3609: the four strips again (v2.3.3024's wheelBannerLands), loaded
     behind the Wheel's loading screen and let go on leaving it; no scenes */
  check('4b the Wheel loads the four lands\' animated strips behind its loading screen and lets them go on leaving, and no scenes',
    /function wheelBannerLands\(\) \{ return WHEEL_LANDS\.filter\(\(l\) => !!bannerStripFor\(l\)\); \}/.test(pa)
    && /if \(zoneId === 'wheel'\) for \(const land of wheelBannerLands\(\)\) tasks\.push\(Promise\.resolve\(preloadZoneBanner\(land\)\)/.test(pa)
    && /for \(const land of wheelBannerLands\(\)\) \{\s*try \{ bannersFreed = bannersFreed\.concat\(freeZoneBanner\(land, toZoneId\)\); \}/.test(pa)
    && !/LandScenes/.test(pa));
  const zb = await import('../../src/data/zoneBanner.js');
  const wl = await import('../../src/data/wheelLands.js');
  const withArt = wl.WHEEL_LANDS.filter((l) => !!zb.bannerStripFor(l));
  check('4b2 ...those four are Frost Ridge, the Flame Fields, the Wind Dunes and the Verdant Wilds, the owner\'s own art',
    withArt.join(',') === 'frost,ember,sky,verdant', withArt);
  const zp = src('src/rendering/zoneBannerPreload.js');
  check('4c the banner preloader holds no scenes any more (the strips only, released with their src emptied)',
    !/LAND_SCENE|landSceneUrl|_scenes|preloadLandScenes|landSceneHeld|freeLandScenes|landScenesResident/.test(zp)
    && /img\.src = '';/.test(zp.slice(zp.indexOf('export function freeZoneBanner'))));
  const zo = src('src/ui/zoneBannerOverlay.js');
  /* v2.3.3609: a land's strip plays when the Wheel holds it (`plain` only the
     plaque's fallback), and nothing shows a scene */
  check('4d a land\'s banner plays its own strip when held, the plaque alone otherwise -- no scene, no emblem',
    /playZoneBanner\(region, S, \{ title, plain: true, icon: look\.icon,/.test(zo) && !/scene: region/.test(zo)
    && /const art = bannerStripFor\(zoneId\);/.test(zo) && /const strip = art && zoneBannerReady\(zoneId\) \? art : null;/.test(zo)
    && /const plain = !strip && !!opts\.plain;/.test(zo)
    && !/landSceneHeld|LandEmblem|landEmblem\.js'|landScenesResident/.test(zo));
  const cp = src('src/rendering/controlsPreload.js');
  check('4e the trade request\'s handshake is warmed with the controls (the card pops up mid-play)', /urls\.push\(OWNER_ICON\.tradeHandshake\.src\);/.test(cp));
  const css = src('src/styles/game.css');
  /* v2.3.3511 took the enlarged scene's rules out; v2.3.3609 the emblem's */
  check('4f the banner draws no scene, and the emblem under the minimap is gone from the CSS',
    !/\.bt-zone-banner\.is-scene\{/.test(css) && !/\.bt-zone-banner__scene\{/.test(css) && !/\.bt-land-emblem[^{]*\{/.test(css));
}

/* ── 5. the emblem under the minimap (v2.3.3511), gone in v2.3.3609 ── */
{
  const files = [];
  const walk = (d) => { for (const f of readdirSync(new URL(d, root), { withFileTypes: true })) {
    if (f.isDirectory()) walk(d + f.name + '/'); else if (/\.(js|jsx)$/.test(f.name)) files.push(d + f.name);
  } };
  walk('src/');
  /* code, not the comments that tell its history */
  const users = files.filter((f) => /from ['"][^'"]*landEmblem\.js['"]|\b(show|hide)LandEmblem\(|\b(preload|free)LandScenes\(|\blandSceneHeld\(|window\.__btLandEmblem/.test(src(f)));
  check('5a src/ui/landEmblem.js is gone, and nothing in the game names it, its emblem or the scenes\' loading',
    !existsSync(new URL('src/ui/landEmblem.js', root)) && users.length === 0, users);
  const cut = src('tools/ui/cut-owner-icons.py');
  check('5b the kept scenes still have the plate\'s scroll ends cut off (rim_cut) and a dark ground line in their place',
    /def rim_cut\(im\):/.test(cut) && /def ground_line\(im\):/.test(cut) && /im = ground_line\(im\.crop\(\(0, 0, im\.width, rim\)\)\)/.test(cut)
    && /SCENE_V = '\?v=2\.3\.3511'/.test(src('src/data/ownerIcons.js')));
}

/* ── 6. v2.3.3526: "Go recommended on everything" -- the legs and chest
   (card 10) and card 11's clearer five ── */
{
  /* the bag's steel legs and chest are the sheet's, framed as today's were
     (the art's larger side 0.89 / 0.78 of a square), and every metal made from
     them (make-metal-icons.mjs: the same size, the renderer's multiply) */
  const chest = dims('/icons/items/chest-plate.webp');
  const metals = ['copper', 'iron', 'blacksteel'];
  const sameSize = metals.every((m) => dims('/icons/items/chest-plate-' + m + '.webp').join('x') === chest.join('x'));
  check('6a the chest is the sheet\'s (square, ~110-125 px, not the old 256), each metal made from it at its size',
    chest[0] === chest[1] && chest[0] >= 100 && chest[0] <= 130 && sameSize, { chest, sameSize });
  /* v2.3.3608: the LEGS are the former pictures again -- the owner,
     2026-10-26: "I liked the former leg armor better than the new icon.
     Replace it." -- the four from before v2.3.3526, byte for byte */
  const sha = (u) => createHash('sha256').update(readFileSync(pub(u))).digest('hex');
  const LEGS = {
    '/icons/items/greaves.webp': '54be7ee1cec2da46dad69eebeeb07becf3842c53c763c31c0b1c2c63c05c1dcc',
    '/icons/items/greaves-copper.webp': 'eaef2f53506c1be6df31696acd6b6c8e0cfa0c22984040bdc0f25535713497b9',
    '/icons/items/greaves-iron.webp': '894bc24e31e3b44b4b03eea702ccff962684823e9445f4156d835c5d05145240',
    '/icons/items/greaves-blacksteel.webp': 'b8617888532023934fdde6101367989619dfa94bebb2e8ea82724309f4cf5090',
  };
  const legsOff = Object.keys(LEGS).filter((u) => !existsSync(pub(u)) || sha(u) !== LEGS[u]);
  check('6a2 the legs are the former four pictures again (v2.3.3608), byte for byte', legsOff.length === 0, legsOff);
  const cut = src('tools/ui/cut-owner-icons.py');
  check('6b the cutter writes the chest (and says to run its metals after), and never the legs', !/name='icons\/items\/greaves'/.test(cut) && /name='icons\/items\/chest-plate'/.test(cut)
    && /make-metal-icons\.mjs --only chest-plate/.test(cut));
  /* each under a NEW name the code points at, so a re-run of the tool that
     made today's can never put the old one back */
  const NEW = { paw: '/icons/ui/pets-paw.webp', crown: '/icons/ui/party-crown.webp', pin: '/icons/ui/party-pin.webp',
    gavel: '/icons/ui/bldg-auction-gavel.webp', none: '/ui/welcome/cc/cc-none.webp' };
  const absent = Object.entries(NEW).filter(([, u]) => !existsSync(pub(u))).map(([k]) => k);
  check('6c the five are files in public/', absent.length === 0, absent);
  const SI = await import('../../src/data/smallIcons.js');
  check('6d the party window\'s leader and elsewhere marks are the crown and the pin, 64 x 64 as every small mark',
    /party-crown\.webp/.test(SI.SMALL_ICON.partyLeader) && /party-pin\.webp/.test(SI.SMALL_ICON.partyAway)
    && dims(NEW.crown).join('x') === '64x64' && dims(NEW.pin).join('x') === '64x64', SI.SMALL_ICON);
  const more = src('src/ui/mobile/dash/MorePanel.jsx'), pets = src('src/ui/mobile/dash/PetsPanel.jsx'), house = src('src/ui/panels/PetHousePanel.jsx');
  check('6e the orange paw on More\'s Pets tile, the Pets page and the Pet House; the brown one nowhere',
    [more, pets, house].every((t) => t.indexOf('/icons/ui/pets-paw.webp') >= 0 && t.indexOf('evt-pets.webp') < 0));
  const bl = src('src/data/buildings.js'), vp = src('src/ui/panels/buildings/VendorPanel.jsx');
  check('6f the Auction House\'s door and window wear the gavel', /iconSrc: '\/icons\/ui\/bldg-auction-gavel\.webp/.test(bl)
    && /lsHeader\('auction-gavel'/.test(vp) && !/lsHeader\('auctionhouse'/.test(vp));
  const bt = src('src/ui/BroTown.jsx');
  /* v2.3.3592: the owner: "the 'None' option should show a thumbnail of what
     that means - for example human should just show a hemi bro head (maybe the
     one without the eyes to focus on just the shape)" -- the collection's plain
     bro (tools/ui/make_none_tiles.py) takes v2.3.3526's no-entry sign's place */
  check('6g the creator\'s None tile is the collection\'s plain bro: with its Normal Eyes on the Eyes and eyewear strips, without them elsewhere',
    /\(cat === 'eyestyle' \|\| cat === 'eyewear'\) \? '\/ui\/welcome\/cc\/cc-none-eyes\.png\?v=' : '\/ui\/welcome\/cc\/cc-none-bro\.png\?v='/.test(bt)
      && existsSync(pub('/ui/welcome/cc/cc-none-eyes.png')) && existsSync(pub('/ui/welcome/cc/cc-none-bro.png')));
}

/* ── 7. v2.3.3526: card 11, the owner's own picks ── */
{
  /* the owner's message, word for word (1b and 2a were #1020's) */
  const OWNER = ('T3.3, T20.2, T54.4, T61.1, T64.1, T98.3, T103.2, T105.1, T106.1, T112.2, T114.2, T116.1, T124.1, T129.1, '
    + 'T6.1, T7.2, T9.4, T11.1, T29.1, T30.1, T104.3, T8.3, T19.2, T24.1, T26.1, T31.1, T32.1, T33.1, T36.1, T37.1, T38.2, '
    + 'T50.2, T51.1, T52.2, T55.2, T59.1, T60.1, T62.1, T63.2, T65.2, T69.1, T69.2, T70.2, T71.2, T72.2, T74.2, T75.2, T76.2, '
    + 'T77.1, T78.1, T84.3, T85.3, T90.3, T91.3, T92.1, T97.4, T99.2, T100.3, T101.3, T102.1, T107.2, T108.2, T109.1, T111.1, '
    + 'T113.1, T115.3, T118.1, T121.1, T123.1, T125.1, T127.1, T128.1').split(', ');
  const spec = JSON.parse(src('tools/ui/owner-picks-card11.json'));
  const inList = new Set(spec.picks.map((e) => e.code));
  const accounted = OWNER.filter((c) => inList.has(c) || (spec.done && c in spec.done) || (spec.dropped && c in spec.dropped)
    || (spec.replaced && c in spec.replaced));
  const extra = [...inList].filter((c) => OWNER.indexOf(c) < 0);
  /* v2.3.3571: T36.1, the pickaxe, REPLACED by the owner's own painted one
     (§8, tools/ui/cut-owner-items.py), so the cutter no longer writes it */
  check('7a every one of the owner\'s 72 codes is cut, already in the game (5 from the first cut), set aside with its reason (T69.1, the same star as T69.2), or replaced by the owner\'s own later picture (T36.1, v2.3.3571)',
    OWNER.length === 72 && accounted.length === 72 && extra.length === 0 && Object.keys(spec.done).length === 5 && Object.keys(spec.dropped).join() === 'T69.1'
    && Object.keys(spec.replaced || {}).join() === 'T36.1' && !inList.has('T36.1'),
    { missing: OWNER.filter((c) => accounted.indexOf(c) < 0), extra });

  const sums = Object.create(null);
  for (const line of src('tools/ui/owner-picks-card11.sha256').split('\n')) {
    const m = line.match(/^([0-9a-f]{64})\s+(\S+)$/);
    if (m) sums[m[2]] = m[1];
  }
  const fileOf = (e, grey) => 'public/' + e.name + (grey ? '-grey' : '') + '.' + (e.ext || 'webp');
  const want = [];
  for (const e of spec.picks) { want.push([e, fileOf(e)]); if (e.grey) want.push([e, fileOf(e, true)]); }
  const changed = want.filter(([, f]) => !sums[f] || !existsSync(new URL(f, root))
    || createHash('sha256').update(readFileSync(new URL(f, root))).digest('hex') !== sums[f]).map(([e, f]) => e.code + ' ' + f);
  /* v2.3.3571: 70 -- the pickaxe is §8's now, and T3.3 is written to the menu
     bow's own file (icons/ui/equip-bow), not over the bag's */
  check(`7b all ${want.length} files the cutter wrote are still the owner's picks, byte for byte (another tool writing over one fails here: run tools/ui/cut-owner-icons.py --force --only <code>)`,
    want.length === 70 && changed.length === 0, changed);

  /* each is the size its rule says (a PNG's from its IHDR) */
  const size = (f) => {
    const b = readFileSync(new URL(f, root));
    if (f.endsWith('.png')) return [b.readUInt32BE(16), b.readUInt32BE(20)];
    return dims(f.slice('public'.length));
  };
  const wrong = [];
  for (const e of spec.picks) {
    const [w, h] = size(fileOf(e));
    const o = e.out;
    const ok = o.frame ? (w === o.frame[0] && h === o.frame[1])
      : o.disc ? (w === o.disc && h === o.disc)
        : o.tight ? Math.max(w, h) === o.tight : false;
    if (!ok) wrong.push({ code: e.code, file: fileOf(e), w, h, out: o });
  }
  check('7c each at its rule\'s size: today\'s canvas (frame), a square disc, or tight to its larger side', wrong.length === 0, wrong);

  const smithy = src('src/ui/panels/buildings/SmithyPanel.jsx'), chat = src('src/ui/mobile/ChatBubble.jsx');
  check('7d the Forge tab wears the anvil (not the copper sword, an item\'s own picture), the chat box the owner\'s smiley (not the drawn one)',
    /id: 'forge', label: 'Forge', icon: '\/icons\/ui\/tab-forge\.webp/.test(smithy) && /src="\/icons\/ui\/chat-emotes\.webp/.test(chat)
    && !/<circle cx="9" cy="10" r="1\.2"/.test(chat) && existsSync(pub('/icons/ui/tab-forge.webp')) && existsSync(pub('/icons/ui/chat-emotes.webp')));

  const cs = src('src/ui/panels/controlSkin.jsx'), sb = src('src/ui/panels/SpecialButton.jsx'), jb = src('src/ui/panels/JumpButton.jsx');
  /* v2.3.3721: the Jump button no longer wears its round picture -- the owner,
     "the icon now for jump looks like a special ability" -- but a plain mark
     drawn in SVG (controlSkin JumpGlyph); the file stays on disk */
  check('7e the generic Special is a round picture drawn as the button\'s face (AbilityFace), at a new address, its grey beside it; Jump wears its plain mark (v2.3.3721)',
    /export function AbilityFace\(props\)/.test(cs) && /AbilityFace, \{ size: size, name: 'special', grey: grey \}/.test(sb)
    && /React\.createElement\(JumpGlyph, \{/.test(jb) && !/AbilityFace/.test(jb) && /const ABILITY_ART_V = '2\.3\.3526'/.test(cs)
    && /const SPECIAL_ART_V = '2\.3\.3526'/.test(cs) && !/JumpIcon|StarburstIcon/.test(cs + sb + jb)
    && ['jump', 'special', 'burst', 'special-sword', 'special-bow'].every((n) => existsSync(pub('/ui/controls/abil-' + n + '-grey.webp'))));
  const cut = src('tools/ui/cut-owner-icons.py');
  check('7f the party leader\'s crown is the owner\'s T112.2 (sheet 3\'s), not the first sheet\'s',
    /name='icons\/ui\/party-crown', src='brotown-rpg-ui-icon-sheet-2\.png', mode='alpha',\s*box=\(1160, 540, 1256, 620\)/.test(cut));
  const rd = ['talk', 'door', 'sleep', 'farm-dig', 'farm-plant', 'farm-water', 'farm-feed', 'farm-harvest'];
  check('7g the right stick\'s eight pictures are asked for at a new address', rd.every((n) => cs.indexOf("'/ui/controls/" + n + ".webp?v=2.3.3526'") >= 0));
}

/* ── 8. v2.3.3571: the owner's copper ore and pickaxe, and the bag's bow pine again ── */
{
  /* "Ok change the art style of the copper ore and the pickaxe to this." */
  const items = JSON.parse(src('tools/ui/owner-items.json'));
  const files = Object.keys(items);
  const sha = (f) => createHash('sha256').update(readFileSync(new URL(f, root))).digest('hex');
  const notCut = files.filter((f) => !existsSync(new URL(f, root)) || sha(f) !== items[f].sha256);
  check('8a the copper ore and the pickaxe are the owner\'s picture as tools/ui/cut-owner-items.py cut it, byte for byte (another tool writing over one fails here: run it again)',
    files.join() === 'public/icons/items/ore-copper.webp,public/icons/items/mining-pickaxe.webp' && notCut.length === 0
    && files.every((f) => existsSync(new URL(items[f].src, root))), notCut);
  check('8b each on today\'s canvas: the ore 256 x 256 as every bag item, the pickaxe 192 x 192 as the tools',
    dims('/icons/items/ore-copper.webp').join('x') === '256x256' && dims('/icons/items/mining-pickaxe.webp').join('x') === '192x192'
    && items['public/icons/items/ore-copper.webp'].size.join('x') === '256x256'
    && items['public/icons/items/mining-pickaxe.webp'].size.join('x') === '192x192');
  /* the label over a rock crops the pickaxe at its own opaque box */
  const nl = src('src/rendering/nodeLabels.js');
  const m = nl.match(/oreVein:\s*\{ url: '\/icons\/items\/mining-pickaxe\.webp',\s*box: \[(\d+), (\d+), (\d+), (\d+)\]/);
  check('8c the label over every rock crops the pickaxe at the box the cutter measured',
    !!m && m.slice(1).map(Number).join() === items['public/icons/items/mining-pickaxe.webp'].box.join(), m && m.slice(1));
  /* a broken copper rock pops the bag's copper, as the other tiers pop theirs */
  const fx = src('src/rendering/systems/effectsRenderer.js');
  check('8d a broken copper rock pops the bag\'s copper ore (the owner\'s), not the old pixel nugget',
    /_fxLoad\('\/icons\/items\/ore-copper\.webp'\)\.then\(\(tex\) => \{\s*if \(tex\) \{ tex\.source\.scaleMode = 'linear'; ORE_ICON_TEX = tex;/.test(fx)
    && fx.indexOf("'/icons/ore/ore-copper.webp'") < 0);
  /* the other ores stay recoloured from the OLD lump */
  const tier = src('tools/make_tier_art.py');
  check('8e make_tier_art.py recolours the iron, black steel, titanium and obsidian ores from the OLD copper lump, kept in assets/, never the owner\'s',
    /ORE_LUMP = 'assets\/icons-source\/ore-copper-lump\.webp'/.test(tier) && (tier.match(/Image\.open\(ORE_LUMP\)/g) || []).length === 2
    && tier.indexOf("ICONS + 'ore-copper.webp'") < 0 && existsSync(new URL('assets/icons-source/ore-copper-lump.webp', root)));

  /* "revert the inventory art of the bow back to the original one (pine) ...
     I only wanted it to replace the menu art for the bow" */
  /* the pine bow as it was before v2.3.3526 (git show 923bd63f1^:public/icons/items/bow.webp) */
  const PINE_BOW_SHA = '8c47885d06397402d31c91d01f6fd5375d817918bdfd8f61b36fbea71c5c388c';
  const bowSha = sha('public/icons/items/bow.webp');
  check('8f the bag\'s bow is the pine bow again (the file v2.3.3526 wrote over, back byte for byte), and the owner\'s card 11 bow is the menu\'s own file',
    bowSha === PINE_BOW_SHA && sha('public/icons/ui/equip-bow.webp') === '91ff0bd0d1746b4075e58e9d59421ef47f0153892792bd5480cf8defa057d877'
    && dims('/icons/ui/equip-bow.webp').join('x') === '256x256', bowSha);
  const eq = src('src/ui/mobile/sheet/equipModel.js');
  const bag = src('src/ui/mobile/dash/InventoryPanel.jsx'), card = src('src/ui/mobile/dash/ItemDetailPopup.jsx');
  const reveal = src('src/ui/reveal/RevealOverlay.jsx'), loot = src('src/rendering/lootIcons.js');
  check('8g the menu (the Equipment slot, the weapon button and the player card, all wpnIconSrc) wears the new bow; the bag, its card, a drop\'s reveal and loot on the ground the pine one',
    /return wpn\.type === 'bow' \? '\/icons\/ui\/equip-bow\.webp\?v=2\.3\.3571'/.test(eq)
    && /obj\.type === 'bow'\s*\? `\/icons\/items\/bow\.webp\$\{ITEMS_V\}`/.test(bag)
    && /if \(wpn\.type === 'bow'\)\s*return `\/icons\/items\/bow\.webp\$\{ITEMS_V\}`/.test(card)
    && /r\.itemType === 'bow' \? '\/icons\/items\/bow\.webp'/.test(reveal) && /bow: '\/icons\/items\/bow\.webp'/.test(loot)
    && src('src/ui/panels/WeaponSwapButton.jsx').indexOf('wpnIconSrc(R, wpn)') >= 0);
}

/* ── 9. v2.3.3609: the element icons as the element itself ── */
{
  /* the owner, 2026-10-26: "Some zones (like wind) have a strange rune
     representing the element.  It should just be a pure icon of the element
     (like wind lines or something)." -- wind, storm and stone drawn by
     tools/ui/draw-element-icons.py (a gust's three lines, a lightning bolt, a
     boulder), each file as the drawing tool writes it: a re-run of
     process_icon_sheets.py, or any other tool, fails here */
  const sha9 = (p) => createHash('sha256').update(readFileSync(new URL(p, root))).digest('hex');
  const DRAWN = {
    wind: '23487bc21ac56f2d2da9d1a4e6a324f08d6939dc00a9a943d9eb2dc850529a17',
    storm: '55e565a2fbcd890fe9ac0d142fad2f89ed27b2fa4af7381e58e9c763ae736786',
    stone: '49672c88e4fe94e60d3e6b4bfe45dbb4145a50fca1bbf694caaedb76083439a8',
  };
  const got = Object.keys(DRAWN).map((k) => ({ k, sha: sha9('public/icons/ui/elem-' + k + '.webp'), size: dims('/icons/ui/elem-' + k + '.webp').join('x') }));
  check('9a wind, storm and stone are the drawn icons (wind lines, a lightning bolt, a boulder), 256 x 256 like the other seven',
    got.every((g) => g.sha === DRAWN[g.k] && g.size === '256x256'), got);
  const dr = src('tools/ui/draw-element-icons.py');
  check('9b ...drawn by tools/ui/draw-element-icons.py, which writes exactly those three',
    /\('elem-wind', draw_wind\), \('elem-storm', draw_storm\), \('elem-stone', draw_stone\)/.test(dr) && /def draw_wind\(\)/.test(dr)
    && /def draw_storm\(\)/.test(dr) && /def draw_stone\(\)/.test(dr));
  const ps = src('tools/process_icon_sheets.py');
  check('9c ...and the sheet slicer never cuts sheet F\'s rune, star or tile over them again',
    /DRAWN_IN_CODE = \{'elem-wind', 'elem-storm', 'elem-stone'\}/.test(ps) && /if name in DRAWN_IN_CODE:\s*\n\s*print\(/.test(ps));
  const lands = await import('../../src/data/wheelLands.js');
  check('9d the Wind Dunes, the Stone Hollows and the Electric Foundry wear them (the top bar, the minimap\'s plate, the banner, the signposts)',
    lands.landLook('sky').icon === '/icons/ui/elem-wind.webp' && lands.landLook('hollows').icon === '/icons/ui/elem-stone.webp'
    && lands.landLook('thunder').icon === '/icons/ui/elem-storm.webp');
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
