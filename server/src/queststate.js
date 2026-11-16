/* ═══ v2.3.5284: QUEST STATE'S DOOR (grand plan step 4.3, card R PR 5) ═══
 * (spec docs/specs/quest-door.md; pinned by server/test/quest-door.test.mjs)
 *
 * What a quest's state holds, and every change to it through one door, as
 * gold, the bag, the stashes and the build points have theirs.  Before this
 * the state was written by hand in about thirty places across three files
 * (quests.js, devtools.js, join.js), each making the map when it was missing
 * its own way.  Card K's quest hand-in claim (step 4.2) waits for it.
 *
 * WHAT IT HOLDS (a character's, `ps` or a stored record):
 *   _quests       each quest's STATE (the hand-in): 'available' (opened for
 *                 you), 'active' (accepted), 'turnedIn' (handed in) -- the
 *                 closed list QUEST_STATES; keyed by a quest's id (a map
 *                 with no prototype: rule 4)
 *   _questKills   each quest's PROGRESS (the track: the worker is its one
 *                 writer since caps.questTrack, v2.3.1120), 0 to
 *                 QUEST_COUNT_MAX
 *   _questFlags   the flags an objective of type 'flag' reads; written only
 *                 at the join (the server writes none: data.js's note)
 *   the KEPT LISTS, in memory only, never saved: a quest's armour that did
 *   not fit (`_questGrantOverflow`, announced at the hand-in) and its weapon
 *   that did not fit the bag (`_questWeaponUnfit`, sent by the mail)
 *
 * SEVEN VERBS, each call naming its road (QUEST_ROADS):
 *   questStateSet(rec, qid, state, road)    a quest's state made `state`
 *   questCountAdd(rec, qid, n, road)        progress added, capped; returns it
 *   questCountSet(rec, qid, n, road)        progress made `n` (the owner's kit)
 *   questForget(rec, qid, road)             a quest's state and progress gone
 *   questLoad(rec, parts, road)             the three maps as a join loads them
 *   questKeep(rec, list, piece, road)       a piece kept aside on a kept list
 *   questKeptTake(rec, list, road)          a kept list read and emptied: its
 *                                           pieces, or null
 * A map is made with no prototype when it is missing.  A wrong road, a road
 * of another verb, a state off the list or a kept list the road does not
 * name throws, the state untouched.  A new way to change quest state is a
 * row here and one call that names it.
 *
 * No imports: node tests it bare. */

export const QUEST_STATES = Object.freeze(['available', 'active', 'turnedIn']);
export const QUEST_FIELDS = Object.freeze(['_quests', '_questKills', '_questFlags']);
export const QUEST_KEPT = Object.freeze(['_questGrantOverflow', '_questWeaponUnfit']);
export const QUEST_VERBS = Object.freeze(['state', 'count', 'countSet', 'forget', 'load', 'keep', 'kept']);
/* the progress cap the counter always had (quests.js, v2.3.1120) */
export const QUEST_COUNT_MAX = 99999;

const R = (verb, at, list = null) => Object.freeze({ verb, at, list });
const GRANT = '_questGrantOverflow', UNFIT = '_questWeaponUnfit';

export const QUEST_ROADS = Object.freeze({
  /* ── the game's own ── */
  accept:            R('state', 'quests.js _handleQuestAccept: a quest accepted'),
  turn_in:           R('state', 'quests.js _handleQuestTurnIn: a quest handed in'),
  chain_next:        R('state', 'quests.js _handleQuestTurnIn: the chain\'s next step opened'),
  progress:          R('count', 'quests.js _creditQuestObjective: an objective\'s signal'),
  grant_overflow:    R('keep', 'quests.js _grantQuestItem: a quest\'s armour that did not fit', GRANT),
  weapon_unfit:      R('keep', 'quests.js _grantQuestItem: a quest\'s weapon that did not fit the bag', UNFIT),
  turn_in_clear:     R('kept', 'quests.js _handleQuestTurnIn: the armour list emptied before the grant', GRANT),
  turn_in_announce:  R('kept', 'quests.js _handleQuestTurnIn: the armour that did not fit, announced', GRANT),
  unfit_drain:       R('kept', 'quests.js _questDrainUnfitWeapons: the weapons that did not fit, to the mail', UNFIT),
  join_stored:       R('load', 'join.js _handleJoin: the stored character\'s quests'),
  join_new:          R('load', 'join.js _handleJoin: a new character\'s first join (its claim, capped)'),

  /* ── the owner's kit (devtools.js, behind the admin key) ── */
  dev_finish_all:    R('state', 'devtools.js _devFinishQuests: every quest handed in'),
  dev_count:         R('countSet', 'devtools.js _devQuestCount: a quest\'s progress set'),
  dev_tour_done:     R('state', 'devtools.js _devTour: a tour step before the chosen one, handed in'),
  dev_tour_reset:    R('forget', 'devtools.js _devTour: the chosen step and those after, back to nothing'),
  dev_tour_open:     R('state', 'devtools.js _devTour: the chosen step, opened'),
  dev_kit_weapons:   R('kept', 'devtools.js _devKit: the weapons that did not fit, cleared', UNFIT),
  dev_kit_armor_clear: R('kept', 'devtools.js _devKit: the armour list emptied before the kit', GRANT),
  dev_kit_armor:     R('kept', 'devtools.js _devKit: the kit\'s armour that did not fit, announced', GRANT),
});

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

function roadFor(road, verb) {
  const row = typeof road === 'string' && own(QUEST_ROADS, road) ? QUEST_ROADS[road] : null;
  if (!row) throw new Error('quest door: no road "' + road + '" (queststate.js QUEST_ROADS)');
  if (row.verb !== verb) throw new Error('quest door: road "' + road + '" is a ' + row.verb + ', not a ' + verb);
  return row;
}
/* the map, made with no prototype when missing (rule 4: keyed by a quest's id) */
function mapOf(rec, field) {
  if (!rec[field] || typeof rec[field] !== 'object') rec[field] = Object.create(null);
  return rec[field];
}
const qidOk = (qid) => typeof qid === 'string' && qid.length > 0;

/** A quest's state made `state` (QUEST_STATES). */
export function questStateSet(rec, qid, state, road) {
  roadFor(road, 'state');
  if (!QUEST_STATES.includes(state)) throw new Error('quest door: "' + state + '" is not a quest\'s state (' + QUEST_STATES.join(', ') + ')');
  if (!qidOk(qid)) throw new Error('quest door: no quest id');
  mapOf(rec, '_quests')[qid] = state;
}

/** Progress added (a whole number, at least 0), capped at QUEST_COUNT_MAX.
 *  Returns the quest's progress after. */
export function questCountAdd(rec, qid, n, road) {
  roadFor(road, 'count');
  if (!qidOk(qid)) throw new Error('quest door: no quest id');
  const m = mapOf(rec, '_questKills');
  m[qid] = Math.min(QUEST_COUNT_MAX, (m[qid] || 0) + n);
  return m[qid];
}

/** Progress made `n` (the caller has clamped it). */
export function questCountSet(rec, qid, n, road) {
  roadFor(road, 'countSet');
  if (!qidOk(qid)) throw new Error('quest door: no quest id');
  mapOf(rec, '_questKills')[qid] = n;
}

/** A quest's state and its progress gone. */
export function questForget(rec, qid, road) {
  roadFor(road, 'forget');
  if (rec._quests && typeof rec._quests === 'object') delete rec._quests[qid];
  if (rec._questKills && typeof rec._questKills === 'object') delete rec._questKills[qid];
}

/** The maps as a join loads them (`parts`: any of QUEST_FIELDS, each the
 *  caller's own copy). */
export function questLoad(rec, parts, road) {
  roadFor(road, 'load');
  for (const f of QUEST_FIELDS) if (own(parts, f)) rec[f] = parts[f];
}

/** A piece kept aside on `list` (one of QUEST_KEPT, the road's own). */
export function questKeep(rec, list, piece, road) {
  const row = roadFor(road, 'keep');
  if (row.list !== list) throw new Error('quest door: road "' + road + '" keeps on ' + row.list + ', not ' + list);
  if (!Array.isArray(rec[list])) rec[list] = [];
  rec[list].push(piece);
}

/** `list` read and emptied: its pieces, or null when it held none. */
export function questKeptTake(rec, list, road) {
  const row = roadFor(road, 'kept');
  if (row.list !== list) throw new Error('quest door: road "' + road + '" takes from ' + row.list + ', not ' + list);
  const out = Array.isArray(rec[list]) ? rec[list] : null;
  rec[list] = null;
  return out;
}
