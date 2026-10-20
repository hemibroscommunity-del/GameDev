/* ═══ v2.3.3279: THE OWNER'S SMALL ICONS (src/data/smallIcons.js) ═══
 *
 *   1. chatLaneOf: a party, area or whisper line's leading mark (game/chat.js)
 *      is read as its lane, with or without a variation selector, the rest of
 *      the name kept; an ordinary name is no lane;
 *   2. every picture the game names is a file in public/ -- the DOM icons, the
 *      canvas's 64 px copies, the ability art lit and grey, the right stick's
 *      eight, the popup's shield -- and the cutter's source sheets are kept;
 *   3. the places use them: no 🎉 written into a party member's name, no emoji
 *      left in the buff badges, the party window or the Defense popup, the chat
 *      feed reads the lane, the stick's pictures are the new files, the canvas
 *      copies are preloaded on the loading screen.
 */
import { readFileSync, existsSync } from 'node:fs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

const SI = await import('../../src/data/smallIcons.js');
const root = new URL('../../', import.meta.url);
const pub = (url) => new URL('public' + url.split('?')[0], root);
const src = (p) => readFileSync(new URL(p, root), 'utf8');

/* ── 1. chatLaneOf ── */
{
  const t = (n) => SI.chatLaneOf(n);
  const party = t('\u{1F6E1} Pal'), partyVs = t('\u{1F6E1}\uFE0F Pal'), area = t('\u{1F4CD} Pal'), wh = t('\u2709 to Ana'), whSys = t('\u2709 Whisper');
  check('1a a party line: lane party, the name after the mark', party && party.lane === 'party' && party.rest === 'Pal', party);
  check('1b ...with a variation selector too', partyVs && partyVs.lane === 'party' && partyVs.rest === 'Pal', partyVs);
  check('1c an area line and a whisper (sent, and the lane\'s own system line)',
    area && area.lane === 'area' && area.rest === 'Pal' && wh && wh.lane === 'whisper' && wh.rest === 'to Ana' && whSys && whSys.rest === 'Whisper', { area, wh, whSys });
  check('1d an ordinary name, an empty one or none: no lane', t('Pal') === null && t('') === null && t(null) === null && t('Pal \u{1F6E1}') === null);
  check('1e each lane has its picture', ['party', 'area', 'whisper'].every((k) => typeof SI.CHAT_LANE_ICON[k] === 'string' && SI.CHAT_LANE_ICON[k].indexOf('/icons/ui/chat-' + k) === 0));
}

/* ── 2. the files ── */
{
  const dom = SI.smallIconDomUrls();
  const missing = dom.filter((u) => !existsSync(pub(u)));
  check(`2a every DOM icon is a file in public/ (${dom.length}: the party's four, the chat's three, eight buffs)`, dom.length === 15 && missing.length === 0, missing);
  const tex = Object.values(SI.SMALL_TEX).filter((u) => !existsSync(pub(u)));
  check('2b the canvas\'s three too, and the page never warms those two as <img>', Object.keys(SI.SMALL_TEX).length === 3 && tex.length === 0
    && dom.indexOf(SI.SMALL_ICON.threatSkull) < 0 && dom.indexOf(SI.SMALL_ICON.npcTalk) < 0, tex);
  /* each cut at the size it is drawn (cut-small-icons.py size_of): the webp's own header */
  const dims = (u) => { const b = readFileSync(pub(u)); const i = b.indexOf('VP8'); if (b[i + 3] === 0x58) return [1 + b.readUIntLE(i + 12, 3), 1 + b.readUIntLE(i + 15, 3)];
    if (b[i + 3] === 0x4c) { const v = b.readUInt32LE(i + 9); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)]; } return [b.readUInt16LE(i + 14) & 0x3fff, b.readUInt16LE(i + 16) & 0x3fff]; };
  const small = dom.concat(Object.values(SI.SMALL_TEX)).map((u) => dims(u).join('x'));
  check('2b2 the small marks are 64 x 64, the buttons 160, the shield 128', small.every((d) => d === '64x64')
    && dims('/ui/controls/abil-whirl.webp').join('x') === '160x160' && dims('/ui/controls/talk.webp').join('x') === '160x160'
    && dims(SI.DEFENSE_POPUP_SRC).join('x') === '128x128', { small: [...new Set(small)], whirl: dims('/ui/controls/abil-whirl.webp') });
  /* v2.3.3522: and the Block button's (the owner's painted shield, the disc
     inside its ring: tools/ui/cut-owner-icons.py), 160 like the rest */
  const abil = ['whirl', 'special', 'bash', 'jump', 'burst', 'block'].flatMap((n) => ['/ui/controls/abil-' + n + '.webp', '/ui/controls/abil-' + n + '-grey.webp']);
  check('2c the six ability pictures, lit and grey (Block\'s since v2.3.3522)', abil.every((u) => existsSync(pub(u))), abil.filter((u) => !existsSync(pub(u))));
  check('2c2 the Block button\'s pair is 160 x 160, as the buttons are',
    ['/ui/controls/abil-block.webp', '/ui/controls/abil-block-grey.webp'].every((u) => existsSync(pub(u)) && dims(u).join('x') === '160x160'));
  const stick = ['talk', 'door', 'sleep', 'farm-dig', 'farm-plant', 'farm-water', 'farm-feed', 'farm-harvest'].map((n) => '/ui/controls/' + n + '.webp');
  check('2d the right stick\'s eight, and none of the SVGs they replace', stick.every((u) => existsSync(pub(u)))
    && !stick.some((u) => existsSync(pub(u.replace('.webp', '.svg')))), stick);
  check('2e the popup\'s shield', existsSync(pub(SI.DEFENSE_POPUP_SRC)) && SI.DEFENSE_POPUP_KEY === 'defense');
  check('2f the four source sheets the cutter reads are kept', ['1-party', '2-abilities', '3-stick', '4-buffs']
    .every((k) => existsSync(new URL('assets/icons-source/sheet-small-' + k + '.png', root))));
}

/* ── 3. the places ── */
{
  const er = src('src/rendering/systems/entityRenderer.js');
  check('3a a party member\'s name has no 🎉 written into it; the plate wears the badge instead',
    !/_inParty \? '\\u\{1F389\} '/.test(er) && /'gold', !!_inParty\)/.test(er) && /_bindSmallTex\(pb, 'partyMember'\)/.test(er));
  check('3b the threat skull is the owner\'s picture (both skulls), not the 💀 Text',
    !/new Text\(\{ text: '\\u\{1F480\}'/.test(er) && (er.match(/new Sprite\(_smallTex\('threatSkull'\)\)/g) || []).length === 2);
  check('3c the townsfolk wear the talk bubble where the quest badge goes, never both, not the ★',
    !/text: '★'/.test(er) && /const showTalk = !qm\.visible;/.test(er));
  const bt = src('src/ui/BroTown.jsx');
  const chips = bt.slice(bt.indexOf("if (S._cursedUntil && Date.now() < S._cursedUntil)"), bt.indexOf('if (effects.length === 0) return null;'));
  check('3d the buff badges: every one the owner\'s picture, no emoji left',
    (chips.match(/icon: BUFF_ICON\.\w+/g) || []).length === 8 && !/icon: '/.test(chips) && /data-buff-chip/.test(bt));
  const ph = src('src/ui/panels/PartyHUD.jsx');
  check('3e the party window: no 🎟️ 👑 💀 📍 left, its marks the owner\'s pictures',
    !/"🎟️ PARTY "|'👑 '|'💀 '|'📍 '/.test(ph) && /SMALL_ICON\.partyLeader/.test(ph) && /SMALL_ICON\.partyAway/.test(ph));
  const feed = src('src/ui/mobile/WorldChatFeed.jsx');
  check('3f the chat feed draws the lane\'s picture', /chatLaneOf\(m\.name\)/.test(feed) && /CHAT_LANE_ICON\[lane\.lane\]/.test(feed));
  const def = ['src/game/monsterCombat.js', 'src/game/projectiles.js', 'src/networking/gameEvents.js'].map(src).join('\n');
  check('3g "Defense Lv N" wears the shield, four places, no 🛡️',
    (def.match(/'Defense Lv ' \+ _defUp\w+\.level, '#60a5fa', \{ ts: Date\.now\(\) \+ 2, iconKey: 'defense', iconLead: true \}/g) || []).length === 4
    && !/'🛡️ Defense Lv '/.test(def));
  const cs = src('src/ui/panels/controlSkin.jsx');
  /* v2.3.3526: the eight are the owner's card 11 picks now, at a new
     address (owner-icons.test §6) -- what this pins is the webp, not its ?v= */
  check('3h the stick\'s pictures and the ability art are the new files', /'\/ui\/controls\/talk\.webp\?v=2\.3\.\d+'/.test(cs)
    && /abilityArtUrl\(name, !!props\.grey\)/.test(cs) && !/talk\.svg|farm-dig\.svg/.test(cs));
  const pa = src('src/rendering/preloadAnimations.js'), cp = src('src/rendering/controlsPreload.js');
  check('3i nothing on first use: the canvas copies on the loading screen, the DOM ones warmed there',
    /smallIcons: preloadSmallIconTextures\(\)/.test(pa) && /urls\.push\(\.\.\.ABILITY_ART_URLS, \.\.\.smallIconDomUrls\(\)\)/.test(cp));
  /* v2.3.3522: the owner -- "Block button needs a new icon": it wears the
     owner's painted shield (BlockFace), warmed with the other ability art,
     and the world's 64 px wood-shield sprite is no longer a control picture */
  const sb = src('src/ui/panels/ShieldButton.jsx');
  check('3j the Block button wears the owner\'s shield (BlockFace, lit and grey warmed), not the wood sprite',
    /React\.createElement\(BlockFace, \{ size: size, grey: onCd \}\)/.test(sb) && !/'\/sprites\/shields\/wood-shield/.test(cs)
      && /\.concat\(\[blockArtUrl\(false\), blockArtUrl\(true\)\]\)/.test(cs) && /'\/ui\/controls\/abil-block'/.test(cs)
      && !/ICON_URL\.shield/.test(cp + sb));
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
