/* EACH DROP A COLUMN OVER THE MONSTER -- v2.3.3616 (src/game/dropColumns.js,
 * src/rendering/dropColumns.js).
 *
 * The owner, 2026-10-26: "show each drop in columns of the floating icon
 * rising with the quantity beneath it and the rarity beneath that. So
 * example: upon monster death and dropping gold with remains, show gold icon,
 * number 5 beneath it, and "Normal" beneath the number."
 *   1. A pile's columns: gold (this player's share), the remains, the shard,
 *      the rare gem, armour, the weapon -- and the killing blow's nugget, which
 *      is on no pile; every kill's first, the rarest last.
 *   2. The rarity: a piece of gear its grade ("Mystery" when the worker says it
 *      is worth a reveal, else "Normal"); anything else how often it drops, by
 *      the codex's own chances.
 *   3. The two messages meet: the credit before the pile (the usual order) or
 *      after it; a nugget with no pile shows by itself; a pile that is not
 *      this player's shows nothing, nor a death pile or a dropped item.
 *   4. Every picture a column can show is preloaded (the codex's tables).
 *   5. The wiring: the kill and the pile reach it, the renderer draws it, the
 *      loading screen loads its pictures, and the dice roll over the monster is
 *      held back while the columns are up (`?dropcols=0` brings it back). */
import { readFileSync } from 'node:fs';
import {
  columnsFor, rarityOf, monsterIdOfLoot, noteKillCredit, noteLootDrop, dropColumnIconUrls,
  RARITY_TIERS, DROP_COLS, dropColumnsLive,
} from '../../src/game/dropColumns.js';
import { codexDropsFor, CODEX_DROP_RATES } from '../../src/data/codexDrops.js';
import { CODEX_ENTRIES } from '../../src/data/monsterCodex.js';

let failures = 0;
function check(name, ok, detail) {
  if (ok) console.log('PASS ' + name);
  else { failures++; console.log('FAIL ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); }
}
const ids = (cols) => cols.map((c) => c.id);
const row = (cols, id) => cols.find((c) => c.id === id) || null;

/* ── 1. a pile's columns ── */
{
  const pile = { lootId: 'mk-wm-frost-3-17', recipients: ['me'], coins: 5, skull: 'snowman', x: 100, y: 200 };
  const c = columnsFor('snowling', pile, null);
  check('1: the owner\'s example -- gold with remains: two columns, the gold 5 "Normal", the remains 1 "Normal"',
    ids(c).join() === 'gold,remnant' && row(c, 'gold').qty === 5 && row(c, 'gold').label === 'Normal'
      && row(c, 'remnant').qty === 1 && row(c, 'remnant').label === 'Normal', c);
  check('1: each wears the codex\'s picture (the gold coin, the snowman\'s remains)',
    /cur-gold/.test(row(c, 'gold').icon) && /remnants-snowman/.test(row(c, 'remnant').icon), c.map((x) => x.icon));
  const all = columnsFor('snowling', Object.assign({}, pile, { shard: 'shard_frost', gem: 'rare_gem',
    armor: [{ slot: 'armor', name: 'Iron Torso', mystery: true }], hasWeapon: true, weaponMystery: false }), 'nugget');
  check('1: everything a kill can drop, every kill\'s first and the rarest last',
    ids(all).join() === 'gold,remnant,shard,raregem,irontorso,irongreatsword,nugget', ids(all));
  check('1: no gold column when the share is 0, no remains without a skull',
    ids(columnsFor('snowling', { coins: 0, skull: null, shard: 'shard_frost' }, null)).join() === 'shard');
  check('1: a monster with no codex page still shows its gold? (no table: nothing, never a wrong picture)',
    columnsFor('nope', pile, null).length === 0);
}

/* ── 2. the rarity ── */
{
  const rows = codexDropsFor('snowling', { crack: true });
  const by = (id) => rows.find((r) => r.id === id);
  check('2: gold and remains (every kill) "Normal"', rarityOf(by('gold')).label === 'Normal' && rarityOf(by('remnant')).label === 'Normal');
  check(`2: the shard (${CODEX_DROP_RATES.shard}) "Uncommon"`, rarityOf(by('shard')).label === 'Uncommon', rarityOf(by('shard')));
  check(`2: the rare gem (${CODEX_DROP_RATES.rareGem}) "Rare"`, rarityOf(by('raregem')).label === 'Rare', rarityOf(by('raregem')));
  check('2: the gold nugget (1 in 10,000) "Very rare"', rarityOf(by('nugget')).label === 'Very rare', rarityOf(by('nugget')));
  check('2: gear is its grade: "Mystery" when its grade is worth a reveal, else "Normal"',
    rarityOf(by('irontorso'), true).label === 'Mystery' && rarityOf(by('irontorso'), false).label === 'Normal'
      && rarityOf(by('irongreatsword'), true).label === 'Mystery');
  check('2: four tiers, each its own colour', RARITY_TIERS.length === 4 && new Set(RARITY_TIERS.map((t) => t.color)).size === 4);
  const w = columnsFor('snowling', { hasWeapon: true, weaponMystery: true, armor: [{ slot: 'legsArmor', name: 'Iron Greaves', mystery: false }] }, null);
  check('2: the weapon\'s and each armour piece\'s own bit', row(w, 'irongreatsword').label === 'Mystery' && row(w, 'irongreaves').label === 'Normal', w);
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
  check('3: credit first (the usual order): one group, the nugget in it, over the monster\'s bar',
    !!g && ids(g.cols).join() === 'gold,remnant,nugget' && g.x === 100 && g.y === 200 - 150 - DROP_COLS.LIFT && S._dropCols.length === 1, g);
  S = mk();
  const g2 = noteLootDrop(S, pile, 'me', 1000);
  noteKillCredit(S, { monsterId: 'wm-frost-3', cx: { k: 'snowling' }, rh: 'nugget' }, 1020);
  check('3: the pile first: the nugget joins its group (redrawn)', !!g2 && ids(g2.cols).join() === 'gold,remnant,nugget' && g2.dirty === true && S._dropCols.length === 1, g2);
  S = mk();
  check('3: a pile that is not this player\'s shows nothing', noteLootDrop(S, Object.assign({}, pile, { recipients: ['other'] }), 'me', 1000) === null && !(S._dropCols && S._dropCols.length));
  check('3: nor a death pile, nor a dropped item',
    noteLootDrop(S, Object.assign({}, pile, { isDeathDrop: true }), 'me', 1000) === null
      && noteLootDrop(S, Object.assign({}, pile, { dropped: true }), 'me', 1000) === null);
  S = mk();
  for (let i = 0; i < DROP_COLS.MAX_GROUPS + 3; i++) noteLootDrop(S, Object.assign({}, pile, { lootId: 'mk-wm-frost-3-' + i }), 'me', 1000 + i);
  check(`3: a big fight keeps the newest ${DROP_COLS.MAX_GROUPS} groups`, S._dropCols.length === DROP_COLS.MAX_GROUPS, S._dropCols.length);
  check('3: on unless ?dropcols=0 (no window here: on)', dropColumnsLive() === true);
}

/* ── 4. the pictures ── */
{
  const urls = dropColumnIconUrls(Object.keys(CODEX_ENTRIES));
  const need = new Set();
  for (const k of Object.keys(CODEX_ENTRIES)) for (const r of (codexDropsFor(k, { crack: true }) || [])) if (r.icon) need.add(r.icon);
  check(`4: every picture a column can show is preloaded (${urls.length})`, urls.length === need.size && urls.every((u) => need.has(u)) && urls.length >= 10, urls);
  const R = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
  check('4: ...on the loading screen (preloadWorldAnimations)', /dropColumns: preloadDropColumnIcons\(\)/.test(R('src/rendering/preloadAnimations.js')));
}

/* ── 5. the wiring ── */
{
  const R = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
  check('5: the kill reaches it (wsClient combat_credit)', /noteKillCredit\(S, cc\)/.test(R('src/networking/wsClient.js')));
  check('5: the pile reaches it (gameEvents loot_drop, a new pile)', /noteLootDrop\(S, _newPile, S\.myId\)/.test(R('src/networking/gameEvents.js')));
  check('5: the renderer draws it each frame and clears it with the zone',
    /this\._dropCols\.update\(S, now, popupZoomK\(S\)\)/.test(R('src/rendering/systems/effectsRenderer.js'))
      && /this\._dropCols\.clear\(\)/.test(R('src/rendering/systems/effectsRenderer.js')));
  check('5: the dice roll over the monster is held back while the columns are up',
    /const shown = !dropColumnsLive\(\);\s*if \(shown\) pushDmgPopup/.test(R('src/game/killRoll.js')));
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
