/* ═══ v2.3.3525: THE TOUR'S BUTTONS ═══
 *
 * The tour (gameSystems.js QUEST_CHAINS, the header above farm_1) sends a new
 * player round the town's givers, and half its steps are done AT the giver's own
 * building: Blacksmith Bro's forge, Woodworker Bro's bench, Farmer Bro's
 * Feed & Seed (whose window holds Visit Your Farm).  So the giver's "how's it
 * going" line carries a button that opens it -- the quest's `opens`, the plot
 * he stands at -- through the very door a player walks to (BroTown
 * openWheelPlot -> interactions.js enterWheelDoor): the same window, the same
 * visit counted.  Lil Bro's carries Race! (game/race.js).
 *
 * No button once the objective is met (his line is the claim then), outside
 * the Wheel (where the plots are), or for Race! against a worker that runs no
 * race (caps.race).
 */
import { questObjectiveDone } from '@/data/gameSystems.js';
import { raceOn, raceLive } from '@/game/race.js';

/* the button's words, by the plot it opens */
export const OPENS_LABEL = Object.freeze({
  blacksmith: 'Open the forge',
  woodworker: 'Open the bench',
  feedseed: 'Open the Feed & Seed',
  cookhouse: 'Open the Cookhouse',
});

/* where each of the tour's givers stands, for the pinned card's "Next:" line
   between two steps (BroTown, questRoute.js tourOffer) */
export const TOUR_MEET = Object.freeze({
  'Mayor Bro': 'at the Town Hall',
  'Farmer Bro': 'at the Feed & Seed',
  'Blacksmith Bro': 'at the forge',
  'Woodworker Bro': 'at the Woodworker',
  'Diego': 'at the General Store',
  'Lil Bro': 'on the town square',
  'Beastmaster Bro': 'by the Woodworker',
});

/** Does the worker know the tour's quests?  (caps.tour; `tour: false` in its
 *  live flags un-advertises it, and the tour's two new townsfolk stay away) */
export function tourOn(S) {
  return !!(S && S._serverCaps && S._serverCaps.tour);
}

/** The button on a giver's line for `quest` at `status`, or null:
 *  { kind: 'race' | 'open', label, plot? } */
export function questAction(quest, status, S) {
  if (!quest || status !== 'active' || !S) return null;
  if (questObjectiveDone(quest, S)) return null;
  if (S.currentZone !== 'wheel') return null;
  if (quest.race) return (raceOn(S) && !raceLive(S)) ? { kind: 'race', label: 'Race!' } : null;
  const plot = quest.opens;
  if (plot && OPENS_LABEL[plot]) return { kind: 'open', plot, label: OPENS_LABEL[plot] };
  return null;
}

/** The weapons a hand-in's trade could take (wood_2: a pine bow or staff),
 *  read as the worker reads them (quests.js _questTradePick): the one in your
 *  hands, else one in the bag.  [{ type, where: 'hand' | 'bag' }] */
export function tradeChoices(quest, rpg) {
  const tr = quest && quest.trade;
  if (!tr || !Array.isArray(tr.types) || !rpg) return [];
  const from = 'ww_' + tr.from;
  const slotOf = { bow: 'rangedWeapon', staff: 'staffWeapon' };
  const stash = Array.isArray(rpg.weaponStash) ? rpg.weaponStash : [];
  const out = [];
  for (const t of tr.types) {
    const worn = slotOf[t] ? rpg[slotOf[t]] : null;
    if (worn && typeof worn === 'object' && worn.type === t && worn.gearBase === from) { out.push({ type: t, where: 'hand' }); continue; }
    if (stash.some((w) => !!w && typeof w === 'object' && w.type === t && w.gearBase === from)) out.push({ type: t, where: 'bag' });
  }
  return out;
}
