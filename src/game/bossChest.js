/* ═══ v2.3.3565: THE BOSS'S CHEST, ON THE CLEAR'S CARD ═══
 *
 * The worker pays a world dungeon's clear with the boss's chest (gold, three
 * of the land's shards, one time in ten a Rare Gem) and puts the clear's XP
 * into the weapons you fought with there (server/src/dungeonreward.js).  It
 * says so on dungeon_complete as `chest: {gold, items: [{key, n}]}` and
 * `skillXp: {sword|bow|staff: n}`; gameEvents.js keeps them on the clear
 * (game/dungeonClear.js) and ui/mobile/DungeonClearHud.jsx lists them.
 *
 * Nothing here pays anything: the coins and the bag come on the worker's own
 * echo, whatever this shows.
 *
 * No imports: the rules run in node (server/test/dungeon-reward.test.mjs §8).
 */

const SKILL_NAME = Object.freeze({ sword: 'Sword', bow: 'Bow', staff: 'Staff' });
const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

/** The card's lines, in order: the chest's gold, each item with its count,
    then each weapon's XP.  `nameOf(key)` names an item (the caller's: the
    shard table, the bag's words).  Each line: {text, key?, skill?, n}. */
export function chestLines(chest, skillXp, nameOf) {
  const out = [];
  if (chest && typeof chest === 'object') {
    const gold = Math.floor(Number(chest.gold) || 0);
    if (gold > 0) out.push({ key: 'gold', n: gold, text: '+' + gold.toLocaleString('en-US') + ' gold' });
    for (const it of Array.isArray(chest.items) ? chest.items : []) {
      const key = it && typeof it.key === 'string' && it.key ? it.key : null;
      const n = Math.floor(Number(it && it.n) || 0);
      if (!key || n <= 0) continue;
      const name = (typeof nameOf === 'function' && nameOf(key)) || key.replace(/_/g, ' ');
      out.push({ key, n, text: n === 1 ? name : name + ' ×' + n });
    }
  }
  if (skillXp && typeof skillXp === 'object') {
    for (const k of Object.keys(SKILL_NAME)) {
      if (!own(skillXp, k)) continue;
      const n = Math.floor(Number(skillXp[k]) || 0);
      if (n > 0) out.push({ skill: k, n, text: '+' + n.toLocaleString('en-US') + ' ' + SKILL_NAME[k] + ' XP' });
    }
  }
  return out;
}
