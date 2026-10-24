/* ═══ v2.3.3553: THE OLD MAP IS RETIRED -- A TEST NEVER LANDS THERE BY ACCIDENT ═══
 *
 * The owner, 2026-10-21, seeing a test's screenshot of today's town ("Town" on
 * the top bar, the old fountain, Ace and Lil Bro where they used to stand):
 * "Hold on you're in the old map (this was retired).  You keep making that
 * mistake so flag it in a way you won't accidentally do that anymore."
 *
 * The world is the Wheel's (CLAUDE.md, "The Wheel is the world", v2.3.2990):
 * players start in its BroTown, and the old lands are closed.  But the phone
 * harness was written for the old map, so a player opened with no `world` has
 * played it (`trial=off&nospawn`) ever since -- and a NEW scenario that forgot
 * `world: 'wheel'` quietly tested a map no player sees.  So:
 *
 *   world: 'wheel'  the world, exactly as a player gets it.  EVERY NEW TEST.
 *   world: 'old'    the retired map, on purpose: only a test OF it.
 *   no world        allowed only for a scenario below, written for the old map
 *                   before 2026-10-21.  Any other scenario run by run.mjs is
 *                   REFUSED: newPlayer throws, naming the fix (harness.mjs).
 *
 * And every picture a test saves from the old map is stamped "OLD MAP ·
 * RETIRED" (harness.mjs, a page.screenshot with a `path`), so it can never be
 * mistaken for the world.  tools/dev/precheck.mjs refuses, before a push, a
 * scenario file not on this list that opens a player without `world`.
 *
 * THIS LIST ONLY EVER SHRINKS.  Never add a name to it: move a scenario to the
 * world (`world: 'wheel'`) when you touch it, and take its name off.
 * server/test/old-map.test.mjs holds it to that (it can only lose names).
 */

/* the scenarios (run.mjs keys) written for the old map, frozen 2026-10-21 */
export const OLD_MAP_LEGACY = Object.freeze(new Set([
  'a2hs', 'ability', 'abilslot', 'afk', 'ahshot', 'aimpath', 'ambient',
  'animparity', 'arena', 'armcapsule', 'armorforge', 'armorgrade',
  'armorloss', 'arrowblast', 'arrowdt', 'arrowhead', 'arrowshot',
  'arrowsnap', 'arrowwound', 'arules', 'authority', 'backprev', 'backshield',
  'bandsummary', 'basicwindup', 'bigtown', 'blacksmith', 'bladesoft',
  'block', 'blockarm', 'blockstance', 'blockweapon', 'bodyink', 'bodysize',
  'bootstall', 'botflags', 'bowedge', 'bowgate', 'bowmark', 'bowshield',
  'bowside', 'bowvolley', 'brobadge', 'btnlayout', 'btnmove', 'btnskin',
  'build', 'burst', 'burstdmg', 'campfire', 'campfirelife', 'cape',
  'capeattack', 'capehair', 'capekill', 'cardreach', 'ccbuttons',
  'ccfeet', 'ccjoin', 'cckb', 'ccload',
  'ccshades', 'ccspin', 'ccstand', 'charlock', 'chat',
  'chatbubble', 'chatcompose', 'chatfeed', 'chatfont', 'chatjoy',
  'chatlanes', 'chatlayer', 'chatpicker', 'chopink', 'chopyield', 'clan',
  'coachearly', 'codexfit', 'contblack', 'cookink', 'cookpeer', 'cooktap',
  'copperfeet', 'coppergear', 'cosmpose', 'cosmrelay', 'critpreview',
  'crowd', 'crowdsoak', 'ctltut', 'cueshow', 'dashhit', 'dashreal',
  'dashroll', 'deaddoor', 'deathcut', 'deathgold', 'deathshield',
  'deathstrip', 'deathtex', 'designs', 'deskplace', 'desktopbox', 'devarmor',
  'devflags', 'devicelock', 'devpanel', 'devstall', 'devwarp', 'dice',
  'dmgicon', 'dodgetime', 'dodgetrail', 'drillback', 'drinkcrash', 'drops',
  'duel', 'duelblock', 'duelfeel', 'dunedepth', 'dunes', 'emotemoves',
  'emotes', 'engage', 'entitydt', 'equipstale', 'exitmark',
  'eyestyle', 'facebow', 'facetat', 'facingside', 'fakenum', 'farm', 'feel',
  'fightfood', 'fightsoak', 'figscale', 'figureseam', 'firegear', 'fireink',
  'firepeer', 'firetrail', 'fishhand', 'formshade', 'fps', 'freshbuild',
  'freshpoints', 'freshquest', 'friends', 'gatherhits', 'gatherspot', 'gcue',
  'gearown', 'gearstash', 'geartrim', 'goldrail', 'greaveslegs',
  'groundline', 'hairclip', 'hairmask', 'halloween', 'harvest', 'harvestink',
  'hatrim', 'hatrun', 'headink', 'hiscores', 'hitmat',
  'hitmatrix', 'hitreal', 'hitsweep', 'hitvoices', 'hotarrow', 'hpbar',
  'hpscale', 'hubspawn', 'hudface', 'idleface', 'infopop', 'inkback',
  'inkframes', 'inkplace', 'inkreach', 'inkreset', 'introfit', 'itemcard',
  'jetstream', 'jogsides', 'joinflicker', 'joingate', 'joyfade', 'keylogin',
  'landdash', 'landrotate', 'landview', 'layer', 'lifeskill', 'lightfx',
  'lilbro', 'listingdm', 'listingoffer', 'listweek', 'liveness', 'lockaim',
  'lockchip', 'lockrings', 'loginkey', 'logout', 'lookrestore', 'lootbob',
  'lootcue', 'lootland', 'lootmagnet', 'lootsize', 'lootzone', 'market',
  'marketonly', 'material', 'minimap', 'minishot', 'moncue',
  'monsterplate', 'monstershots', 'monstertrim', 'monwatch', 'movespeed',
  'newkey', 'notifbell', 'nozoom', 'npctap', 'offgrid', 'orbline',
  'orbrange', 'originlock', 'partpool', 'party', 'partymap', 'pathstyle',
  'peerattackink', 'peerblock', 'peercolours', 'peerprints', 'peershield',
  'peersword', 'perfdrift', 'petdraw', 'pettrade', 'pickerrestart', 'pine',
  'plazaplate', 'pointsglow', 'polish', 'portalbeam', 'poseskin', 'potions',
  'presence', 'previewweapon', 'prog3', 'proj', 'projlook', 'propdepth',
  'propfx', 'propshots', 'pvpextras', 'pvplunge', 'pvpnumbers', 'pvpshield',
  'questbanner', 'questchain', 'questclaim', 'questcoach', 'questkill',
  'questlegs', 'questloop', 'questmsg', 'questroad',
  'queststar', 'questui', 'questwall', 'questwin', 'questxp', 'rbutton',
  'rehearsal', 'remnant', 'remoteanim', 'reports', 'resbars', 'road2',
  'rollbake', 'rollweapon', 'roomfull', 'roster', 'rosterink', 'salvage',
  'scalesheet', 'seacover', 'sellcue', 'sellericon', 'sellsheet',
  'shapelayer', 'sharppixels', 'sheen', 'sheenall', 'sheenbatch',
  'shieldbonk', 'shirtarm', 'shirtjog', 'shirtkeyline',
  'shotland', 'sightrock', 'skeleton', 'skillapps', 'skillup', 'skinink',
  'skinworld', 'slimebase', 'slimeburst', 'slimeorb', 'slimewave', 'smelt',
  'smithy', 'snowburrow', 'snowman', 'soak', 'social', 'socialgrief',
  'solorate', 'solospecial', 'southshirt', 'southsword', 'spawnfx',
  'specialart', 'specshield', 'spinfeet', 'staffcast',
  'standalone', 'standinart', 'standinskin', 'statcols', 'statdemo',
  'statpeek', 'store', 'stuckarrow', 'swingsfx', 'switchbro', 'swordcarry',
  'tapswing', 'target', 'tattoos', 'teeshield', 'texdrift', 'textfloor',
  'toolshelf', 'townbuildings', 'townexit', 'townforge', 'townhill',
  'townlock', 'townmap', 'townmeal', 'townprops', 'townrim', 'townscenery',
  'trade', 'tradeatk', 'tradetap', 'turnshield', 'tutgrant', 'tutorial',
  'tutskip', 'tutspecial', 'uisfx', 'uisfx2', 'uisfx3', 'unequip',
  'vendorprompt', 'verify', 'weaponloss', 'wheellife', 'wheelmap',
  'wheelmonsters', 'wheelnet', 'wheelobjects', 'wheelsteps', 'wheeltrial',
  'wheelwater', 'wheelwaves', 'whirlwind', 'windup', 'worldchat', 'worldfx',
  'worldshadow', 'worldtext', 'worldtrial', 'worldwalk', 'wvglass', 'wvlens',
  'wvscale', 'xpfly', 'zonebanner', 'zonechurn', 'zonedecor', 'zoneflip',
  'zonefx', 'zonegate', 'zoomshot',
]));

/* how many it had when it was frozen: old-map.test.mjs fails if it grows */
export const OLD_MAP_LEGACY_FROZEN_AT = 419;

/** The words a refused scenario is stopped with. */
export function oldMapRefusal(scenario) {
  return 'OLD MAP REFUSED: scenario "' + scenario + '" opened a player with no `world`, which plays the RETIRED '
    + 'old map (today\'s town, "Town" on the top bar), not the world players see.  Pass world: \'wheel\' '
    + '(the game as a player gets it), or world: \'old\' only to test the retired map itself '
    + '(tools/qa/mp/oldMap.mjs).';
}

/** Every newPlayer(...) / joinPair(...) call's argument text in a file's
 *  source (the function's own definition left out). */
export function playerCalls(src) {
  const out = [];
  const re = /\b(?:newPlayer|joinPair)\(/g;
  let m;
  while ((m = re.exec(src))) {
    if (/function\s+$/.test(src.slice(Math.max(0, m.index - 20), m.index))) continue;
    let i = m.index + m[0].length, depth = 1;
    while (i < src.length && depth) { const c = src[i]; if (c === '(') depth++; else if (c === ')') depth--; i++; }
    out.push(src.slice(m.index + m[0].length, i - 1));
  }
  return out;
}

/** The calls in a file's source that name no `world`. */
export function callsWithoutWorld(src) {
  return playerCalls(src).filter((a) => !/\bworld\s*:/.test(a));
}

/* The stamp on a saved picture of the old map: drawn just before the shot and
   taken away just after, over everything, catching no touch. */
export const OLD_MAP_STAMP_ID = 'qa-old-map-stamp';
export function stampOn(id) {
  try {
    if (document.getElementById(id)) return;
    const d = document.createElement('div');
    d.id = id;
    /* two lines, sized to the page: it must read whole on a 320 px phone */
    d.innerHTML = '<div style="font:900 clamp(18px,7vw,34px)/1.05 system-ui,sans-serif;letter-spacing:.06em">OLD MAP \u00b7 RETIRED</div>'
      + '<div style="font:800 clamp(11px,3.6vw,16px)/1.25 system-ui,sans-serif;margin-top:4px">not the world players see</div>';
    d.setAttribute('style', 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-8deg);'
      + 'z-index:2147483647;pointer-events:none;box-sizing:border-box;max-width:88vw;padding:10px 14px;'
      + 'border:4px solid #fff;border-radius:10px;background:rgba(190,20,20,.88);color:#fff;text-align:center;'
      + 'box-shadow:0 0 0 4px rgba(190,20,20,.88)');
    document.body.appendChild(d);
  } catch (e) { /* a page with no body: nothing to stamp */ }
}
export function stampOff(id) {
  try { const d = document.getElementById(id); if (d) d.remove(); } catch (e) { /* gone already */ }
}
