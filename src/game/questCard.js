/* ═══ v2.3.3918: THE PINNED QUEST CARD'S WORDS ═══
 *
 * The owner: "I'm not confident about the current quest objective of the top
 * left."  The design review they adopted: "The green checkmark next to 'Into
 * the Wild' makes the objective look completed, while the instruction below
 * still says to kill five monsters.  There's also no visible progress count.
 * I'd change it to a single compact, tappable tracker [Into the Wild · 3/5 ·
 * Defeat 5 monsters] ... One primary objective, with meaningful progress, is
 * enough."
 *
 * So the card says, for ONE quest (the tracked one, else the first):
 *   - in progress: the title, "3/5" at its right (any quest with a `need`),
 *     and the objective line (or a stepped quest's next step) -- NO check;
 *   - ready to hand in: the check, and "Done! Go back to Mayor Bro" -- the
 *     card used to fall back to the plain objective here, which read as no
 *     progress, and nothing said to go back.
 *
 * No imports, so node reads it (server/test/quest-card.test.mjs).  The count
 * is read the way gameSystems' questCountText reads it: `need.progress` is
 * the worker's own counter (_questKills), `need.key` what the bag holds.
 */

/* { have, n } for a quest that counts, else null.  Never past n. */
export function questCount(quest, rpg) {
  var nd = quest && quest.need;
  if (!nd || !(nd.n > 0)) return null;
  var have;
  if (nd.progress) {
    var k = rpg && rpg._questKills;
    have = (k && Number(k[quest.id])) || 0;
  } else if (nd.key) {
    have = Number(((rpg && rpg.inventory) || {})[nd.key]) || 0;
  } else return null;
  return { have: Math.max(0, Math.min(have, nd.n)), n: nd.n };
}

/* The card's lines.  `done` is questObjectiveDone's answer (the caller reads
   it off the LIVE rpg, as the count is); `steps` questSteps' list, or null. */
export function questCardWords(quest, opts) {
  if (!quest) return null;
  var o = opts || {};
  var c = questCount(quest, o.rpg);
  var ready = !!o.done;
  var line;
  if (ready) {
    line = 'Done! Go back to ' + (quest.npc || 'the quest giver');
  } else {
    var cur = Array.isArray(o.steps) ? o.steps.find(function (s) { return s && s.current; }) : null;
    line = cur ? 'Next: ' + cur.label : String(quest.desc || '');
  }
  return {
    title: String(quest.title || quest.id || 'Quest'),
    /* ready shows the full count ("5/5") beside the check: the two agree */
    count: c ? (ready ? c.n : c.have) + '/' + c.n : '',
    line: line,
    ready: ready,
  };
}
