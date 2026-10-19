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
 *   3. the places (v2.3.3485: + the Blacksmith's Upgrade tab's hammer): the arena's helmet (the Saloon keeps its mug), the trade
 *      request's handshake (only that card), the jackpot's sack, the Pet
 *      House row's house, the free spin's wheel (the bonus spins keep the drawn
 *      one), the empty Journey page's map, the quest pins over the townsfolk
 *      (the drawn disc kept as the fallback);
 *   4. the loading: the pins on the loading screen, the land scenes behind the
 *      Wheel's and let go on leaving it, the four animated strips no longer the
 *      Wheel's, the handshake warmed with the controls; a land's banner never
 *      uses a closed zone's strip.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';

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
  /* v2.3.3485: seven -- the Blacksmith's Upgrade tab's hammer */
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
  /* v2.3.3485: the owner: "Make the upgrade tab icon different for smithing.
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
  check('4b the Wheel loads its lands\' scenes behind its loading screen and lets them go on leaving, not the four strips',
    /if \(zoneId === 'wheel'\) tasks\.push\(Promise\.resolve\(preloadLandScenes\(\)\)/.test(pa) && /freeLandScenes\(\)/.test(pa)
    && !/wheelBannerLands\(\)\)/.test(pa) && !/function wheelBannerLands/.test(pa));
  const zp = src('src/rendering/zoneBannerPreload.js');
  check('4c the scenes are held decoded, cache-only to the banner, and released with their src emptied',
    /export function preloadLandScenes\(\)/.test(zp) && /export function landSceneHeld\(land\)/.test(zp) && /export function freeLandScenes\(\)/.test(zp)
    && /img\.src = '';/.test(zp.slice(zp.indexOf('export function freeLandScenes'))));
  const zo = src('src/ui/zoneBannerOverlay.js');
  check('4d a land\'s banner asks for its scene, and never a closed zone\'s strip of the same id',
    /playZoneBanner\(region, S, \{ title, plain: true, scene: region,/.test(zo) && /const art = opts\.scene \? null : bannerStripFor\(zoneId\);/.test(zo)
    && /const scene = !strip && opts\.scene \? landSceneHeld\(opts\.scene\) : null;/.test(zo));
  const cp = src('src/rendering/controlsPreload.js');
  check('4e the trade request\'s handshake is warmed with the controls (the card pops up mid-play)', /urls\.push\(OWNER_ICON\.tradeHandshake\.src\);/.test(cp));
  const css = src('src/styles/game.css');
  check('4f the scene\'s look: half the banner wide, over the plaque, transform and opacity only',
    /\.bt-zone-banner\.is-scene\{\s*--zb-scene-w:calc\(var\(--zb-w\) \* \.5\);/.test(css) && /\.bt-zone-banner__scene\{/.test(css)
    && !/\.bt-zone-banner__scene\{[^}]*filter/.test(css));
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
