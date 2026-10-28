/* EACH DROP A LINE OF WORDS, RISING OVER THE MONSTER -- v2.3.3627
 * (src/game/dropLines.js, src/rendering/dropLines.js).
 *
 * v2.3.3692: "Coins x5", each with its picture first (the owner: "maybe the
 * icon first then the name then the quantity in the message popup").
 *
 * The owner, 2026-10-27: "I just want the name of the item to float upwards
 * with quantity in parenthesis and the color of the font indicating rarity.
 * So normal would just be white. So coins (5) rising and disappearing in
 * white, slime remains (1) rising beneath that message then disappearing in
 * white (as a example)"
 *   1. A pile's lines: "Coins (n)" (this player's share), the remains by the
 *      pile's own key, the shard by its key, the rare gem, armour, the weapon
 *      -- and the killing blow's nugget, which is on no pile; every kill's
 *      first, the rarest last.
 *   2. The colour is the rarity: a piece of gear its grade (purple when the
 *      worker says it is worth a reveal, else white); anything else how often
 *      it drops, by the codex's own chances -- Normal pure white.
 *   3. The two messages meet: the credit before the pile (the usual order) or
 *      after it; a nugget with no pile shows by itself; a pile that is not
 *      this player's shows nothing, nor a death pile or a dropped item.
 *   4. The lines start on the monster's body (under the killing blow's own
 *      number, which starts over its bar), each line under the one before
 *      and a little after it.
 *   5. The wiring: the kill and the pile reach it, the renderer draws it at a
 *      message's size, the columns' pictures are no longer loaded, and the
 *      dice roll over the monster is held back (`?droplines=0` brings it
 *      back). */
import { readFileSync } from 'node:fs';
import {
  linesFor, rarityOf, dropLineText, monsterIdOfLoot, noteKillCredit, noteLootDrop,
  RARITY_TIERS, GRADE_WORDS, DROP_LINES, dropLinesLive, dropGroupMs,
} from '../../src/game/dropLines.js';
import { codexDropsFor, CODEX_DROP_RATES } from '../../src/data/codexDrops.js';

let failures = 0;
function check(name, ok, detail) {
  if (ok) console.log('PASS ' + name);
  else { failures++; console.log('FAIL ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); }
}
const ids = (ls) => ls.map((l) => l.id);
const texts = (ls) => ls.map((l) => l.text);
const row = (ls, id) => ls.find((l) => l.id === id) || null;
const WHITE = '#FFFFFF';

/* ── 1. a pile's lines ── */
{
  const slime = { lootId: 'mk-wm-verdant-3-17', recipients: ['me'], coins: 5, skull: 'slime-remnants', x: 100, y: 200 };
  const c = linesFor('dewdrop', slime, null);
  /* v2.3.3692: the owner: "the (x5) or whatever number format with the "x"
     quantity preceding the number looks better" */
  check('1: the owner\'s example -- "Coins x5" over "Slime Remains x1", both white',
    texts(c).join(' | ') === 'Coins x5 | Slime Remains x1' && c.every((l) => l.color === WHITE), c);
  check('1: the text is the name, then x and the amount (v2.3.3692; it was in brackets)', dropLineText('Coins', 5) === 'Coins x5' && dropLineText('Rare Gem', 0) === 'Rare Gem x1');
  /* v2.3.3692: "maybe the icon first then the name then the quantity" */
  check('1: each line carries its drop\'s picture, the codex\'s own (the coin, the slime\'s remains)',
    /\/icons\/ui\/cur-gold\.webp/.test(c[0].icon || '') && /\/icons\/items\/remnants-slime\.webp/.test(c[1].icon || ''), c.map((l) => l.icon));
  const snow = { lootId: 'mk-wm-frost-3-17', recipients: ['me'], coins: 12, skull: 'snowman' };
  check('1: the remains are named by the pile\'s own key ("Snowman Remains")', texts(linesFor('snowling', snow, null)).join(' | ') === 'Coins x12 | Snowman Remains x1');
  const all = linesFor('snowling', Object.assign({}, snow, { shard: 'shard_frost', gem: 'rare_gem',
    armor: [{ slot: 'armor', name: 'Iron Torso', mystery: true }], hasWeapon: true, weaponMystery: false }), 'nugget');
  check('1: everything a kill can drop, every kill\'s first and the rarest last',
    ids(all).join() === 'gold,remnant,shard,raregem,irontorso,irongreatsword,nugget', ids(all));
  check('1: ...each by its name: the shard by its key, the rest by the codex',
    texts(all).join(' | ') === 'Coins x12 | Snowman Remains x1 | Frost Shard x1 | Rare Gem x1 | Iron Torso x1 | Iron Great Sword x1 | Gold Nugget x1', texts(all));
  check('1: ...and each its own picture: the shard its land\'s, the gem, the torso, the greatsword, the nugget',
    all.every((l) => typeof l.icon === 'string' && l.icon.startsWith('/icons/'))
      && /shard_frost\.webp/.test(row(all, 'shard').icon) && /cur-gem\.webp/.test(row(all, 'raregem').icon)
      && /chest-plate-iron\.webp/.test(row(all, 'irontorso').icon) && /great-sword-iron\.webp/.test(row(all, 'irongreatsword').icon)
      && /cur-nugget\.webp/.test(row(all, 'nugget').icon), all.map((l) => [l.id, l.icon]));
  check('1: no coins line when the share is 0, no remains without a key',
    ids(linesFor('snowling', { coins: 0, skull: null, shard: 'shard_frost' }, null)).join() === 'shard');
  check('1: a monster with no codex page shows nothing (never a wrong name)', linesFor('nope', snow, null).length === 0);
}

/* ── 2. the colour is the rarity ── */
{
  const rows = codexDropsFor('snowling', { crack: true });
  const by = (id) => rows.find((r) => r.id === id);
  check('2: Normal is pure white, the owner\'s "normal would just be white"', RARITY_TIERS[0].label === 'Normal' && RARITY_TIERS[0].color === WHITE && GRADE_WORDS.normal.color === WHITE);
  check('2: coins and remains (every kill) white', rarityOf(by('gold')).color === WHITE && rarityOf(by('remnant')).color === WHITE);
  check(`2: the shard (${CODEX_DROP_RATES.shard}) green, "Uncommon"`, rarityOf(by('shard')).label === 'Uncommon' && rarityOf(by('shard')).color === '#7EE0A8', rarityOf(by('shard')));
  check(`2: the rare gem (${CODEX_DROP_RATES.rareGem}) blue, "Rare"`, rarityOf(by('raregem')).label === 'Rare' && rarityOf(by('raregem')).color === '#7FB2FF', rarityOf(by('raregem')));
  check('2: the gold nugget (1 in 10,000) orange, "Very rare"', rarityOf(by('nugget')).label === 'Very rare' && rarityOf(by('nugget')).color === '#FFB25A', rarityOf(by('nugget')));
  check('2: gear is its grade: purple when its grade is worth a reveal, else white',
    rarityOf(by('irontorso'), true).color === '#D9A6FF' && rarityOf(by('irontorso'), false).color === WHITE
      && rarityOf(by('irongreatsword'), true).color === '#D9A6FF');
  check('2: four tiers, each its own colour', RARITY_TIERS.length === 4 && new Set(RARITY_TIERS.map((t) => t.color)).size === 4);
  const w = linesFor('snowling', { hasWeapon: true, weaponMystery: true, armor: [{ slot: 'legsArmor', name: 'Iron Greaves', mystery: false }] }, null);
  check('2: the weapon\'s and each armour piece\'s own bit', row(w, 'irongreatsword').color === '#D9A6FF' && row(w, 'irongreaves').color === WHITE && row(w, 'irongreaves').text === 'Iron Greaves x1', w);
}

/* ── 3. the two messages ── */
{
  /* a Wheel monster carries its land (`home`): the pile alone finds its kind
     by it (data/trapping.js petKindOfMonster) */
  const mk = () => ({ monsters: [{ id: 'wm-frost-3', home: 'frost', x: 100, y: 200, _popupTopOff: -150 }], myId: 'me' });
  const pile = { lootId: 'mk-wm-frost-3-17', recipients: ['me'], coins: 5, skull: 'snowman', x: 100, y: 200 };
  check('3: the pile names its monster', monsterIdOfLoot('mk-wm-frost-3-17') === 'wm-frost-3' && monsterIdOfLoot('death-1') === null);
  let S = mk();
  noteKillCredit(S, { monsterId: 'wm-frost-3', cx: { k: 'snowling' }, rh: 'nugget' }, 1000);
  const g = noteLootDrop(S, pile, 'me', 1010);
  check('3: credit first (the usual order): one group, the nugget in it',
    !!g && ids(g.lines).join() === 'gold,remnant,nugget' && S._dropLines.length === 1, g);
  S = mk();
  const g2 = noteLootDrop(S, pile, 'me', 1000);
  noteKillCredit(S, { monsterId: 'wm-frost-3', cx: { k: 'snowling' }, rh: 'nugget' }, 1020);
  check('3: the pile first: the nugget joins its group (redrawn)', !!g2 && ids(g2.lines).join() === 'gold,remnant,nugget' && g2.dirty === true && S._dropLines.length === 1, g2);
  S = mk();
  check('3: a pile that is not this player\'s shows nothing', noteLootDrop(S, Object.assign({}, pile, { recipients: ['other'] }), 'me', 1000) === null && !(S._dropLines && S._dropLines.length));
  check('3: nor a death pile, nor a dropped item',
    noteLootDrop(S, Object.assign({}, pile, { isDeathDrop: true }), 'me', 1000) === null
      && noteLootDrop(S, Object.assign({}, pile, { dropped: true }), 'me', 1000) === null);
  S = mk();
  for (let i = 0; i < DROP_LINES.MAX_GROUPS + 3; i++) noteLootDrop(S, Object.assign({}, pile, { lootId: 'mk-wm-frost-3-' + i }), 'me', 1000 + i);
  check(`3: a big fight keeps the newest ${DROP_LINES.MAX_GROUPS} groups`, S._dropLines.length === DROP_LINES.MAX_GROUPS, S._dropLines.length);
  check('3: on unless ?droplines=0 (no window here: on)', dropLinesLive() === true);
}

/* ── 4. where, and when ── */
{
  const S = { monsters: [{ id: 'wm-frost-3', home: 'frost', x: 100, y: 200, _popupTopOff: -150 }], myId: 'me' };
  const g = noteLootDrop(S, { lootId: 'mk-wm-frost-3-1', recipients: ['me'], coins: 5, skull: 'snowman', x: 100, y: 200 }, 'me', 1000);
  check('4: the first line starts on the monster\'s body, halfway up to its bar (under the kill\'s own number)',
    !!g && g.x === 100 && g.y === 200 - 75 && g.over === 'monster', g);
  check(`4: each line comes ${DROP_LINES.STAGGER_MS} ms after the one above, the group living ${DROP_LINES.TTL_MS} ms and that much more a line`,
    dropGroupMs(1) === DROP_LINES.TTL_MS && dropGroupMs(3) === DROP_LINES.TTL_MS + 2 * DROP_LINES.STAGGER_MS);
  const R = readFileSync(new URL('../../src/rendering/dropLines.js', import.meta.url), 'utf8');
  check('4: the renderer lays each line under the one before (over you, over the spot), staggered, and keeps a group inside the screen\'s sides',
    /row\.y = g\.over === 'you' \? -\(n - 1 - i\) \* pitch : i \* pitch/.test(R) && /const la = t - l\.i \* stag/.test(R) && /Math\.min\(cam\.x \+ vw - pad, Math\.max\(cam\.x \+ pad, x\)\)/.test(R));
  /* v2.3.3692: the picture before the words, from the dropped items' own
     cache, held while shown and let go after, its room kept until decoded */
  check('4: a line is its picture then its words, the row centred; the picture from the drop cache, held and let go',
    /acquireDropIcon\(url\)/.test(R) && /releaseDropIcon\(l\.url\)/.test(R) && /dropIconTexture\(l\.url\)/.test(R)
      && /t\.x = -whole \/ 2 \+ \(ic \? iconPx \+ gap : 0\)/.test(R) && /if \(ic\) ic\.x = -whole \/ 2;/.test(R));
}

/* ── 5. the wiring ── */
{
  const R = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
  check('5: the kill reaches it (wsClient combat_credit)', /noteKillCredit\(S, cc\)/.test(R('src/networking/wsClient.js')) && /from '@\/game\/dropLines\.js'/.test(R('src/networking/wsClient.js')));
  check('5: the pile reaches it (gameEvents loot_drop, a new pile)', /noteLootDrop\(S, _newPile, S\.myId\)/.test(R('src/networking/gameEvents.js')) && /from '@\/game\/dropLines\.js'/.test(R('src/networking/gameEvents.js')));
  const E = R('src/rendering/systems/effectsRenderer.js');
  check('5: the renderer draws it each frame at a message\'s size and outline, and clears it with the zone',
    /new DropLinesFx\(this\.dmgLayer, \{ fontPx: MSG_FONT_PX, strokePx: DMG_STROKE_PX \* DMG_SCALE \}\)/.test(E)
      && /this\._dropLines\.update\(S, now, popupZoomK\(S\)\)/.test(E) && /this\._dropLines\.clear\(\)/.test(E));
  check('5: the columns\' pictures are no longer loaded on the loading screen', !/preloadDropColumnIcons|dropColumns/.test(R('src/rendering/preloadAnimations.js')));
  check('5: the dice roll over the monster is held back while the lines are up',
    /const shown = !dropLinesLive\(\);\s*if \(shown\) pushDmgPopup/.test(R('src/game/killRoll.js')));
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
