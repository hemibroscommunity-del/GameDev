/* ═══ v2.3.3944: THE QUEST JOURNAL, WIRED TO THE LIVE GAME ═══
 *
 * game/questJournal.js decides what every part of the journal says, with no
 * imports (a node suite reads it).  This hands it the live game: the quest
 * table, each quest's status (rpg._quests and its check), its steps, the land
 * names and which way each land lies from BroTown (ZONES.wheel.lands, read at
 * run time: never a coordinate written here), where each giver stands
 * (tour.js TOUR_MEET), the tracked quest, and what comes after a quest (the
 * giver's chain, then the town tour: questRoute.js tourOffer).  The pages
 * (dash/QuestsPanel.jsx, dash/QuestDetailPanel.jsx) draw what this returns.
 *
 * Read-only.  Taking and handing in quests stays with the givers and the
 * worker; nothing here sends a message.
 */
import { QUEST_CHAINS, QUEST_STATUS, questSteps, getNpcQuest } from '../../../data/gameSystems.js';
import { QUEST_AP_REWARD } from '../../../data/items.js';
import { ZONES } from '../../../data/zones.js';
import { TILE } from '../../../data/constants.js';
import { TOUR_MEET } from '../../../game/tour.js';
import { folkDisplayName } from '../../../data/folkNames.js';   /* v2.3.4021: the giver's nickname */
import { tourOffer } from '../../../game/questRoute.js';
import { isWheelTrialZone } from '../../../game/worldTrial.js';
import { deriveQuestLog, deriveQuestOffers, trackedQuestId } from './questModel.js';
import {
  journalPage, journalStatus, focusQuestId, activeOrder, questApTotal, offerWhere,
  journalCount, countText, compassWord,
} from '../../../game/questJournal.js';

/* the quest by its id (an own key only: an id comes from the bus or a save) */
export function questById(qid) {
  if (typeof qid !== 'string' || !Object.prototype.hasOwnProperty.call(QUEST_CHAINS, qid)) return null;
  return QUEST_CHAINS[qid] || null;
}

/* the land names and which way each lies from BroTown's middle.  Read at
   each call: the Wheel's geometry is set once the world loads (setWheelGeom) */
function landsCtx() {
  const names = Object.create(null);
  const dirs = Object.create(null);
  const z = ZONES && ZONES.wheel;
  const lands = (z && z.lands) || null;
  const c = z && z.w ? (z.w * TILE) / 2 : null;
  for (const id of Object.keys(ZONES || {})) {
    const row = ZONES[id];
    if (row && typeof row.name === 'string') names[id] = row.name;
  }
  if (lands && c !== null) {
    for (const id of Object.keys(lands)) {
      const p = lands[id];
      if (Array.isArray(p) && p.length >= 2) dirs[id] = compassWord(p[0] - c, p[1] - c);
    }
  }
  return { names, dirs, home: (z && z.name) || 'BroTown' };
}

/* the quests in hand, in the worker's order (the order they were taken) */
function inHandIds(R) {
  const qs = (R && R._quests) || {};
  return Object.keys(qs).filter((k) => (qs[k] === QUEST_STATUS.active || qs[k] === QUEST_STATUS.complete) && questById(k));
}

function readyOf(quest, R, S) {
  if (!quest) return false;
  const st = ((R && R._quests) || {})[quest.id];
  if (st === QUEST_STATUS.complete) return true;
  if (st !== QUEST_STATUS.active || typeof quest.check !== 'function') return false;
  try { return !!quest.check(R, S); } catch (_e) { return false; }
}

/** The journal's status for one quest, live. */
export function statusOf(S, qid) {
  const R = (S && S.rpg) || {};
  const q = questById(qid);
  if (!q) return 'locked';
  const st = ((R._quests) || {})[qid];
  const offered = !st && deriveQuestOffers(S).some((o) => o && o.id === qid);
  return journalStatus(st, readyOf(q, R, S), offered);
}

/** What follows `qid` once it is handed in (game/questJournal.js nextLine's
 *  `after`): the giver's next quest in the chain if he would offer it then,
 *  else the tour's next step, else a quest still in hand, else any offer. */
export function afterOf(S, qid) {
  const R = (S && S.rpg) || {};
  const q = questById(qid);
  if (!q) return null;
  const sim = Object.assign({}, R, { _quests: Object.assign({}, R._quests || {}, { [qid]: QUEST_STATUS.turnedIn }) });
  /* the chain: his own next one */
  if (q.next && q.npc) {
    let r = null;
    try { r = getNpcQuest(sim, q.npc); } catch (_e) { r = null; }
    if (r && r.status === QUEST_STATUS.available && r.quest && r.quest.id === q.next) {
      return { npc: q.npc, title: r.quest.title, meet: TOUR_MEET[q.npc] || '' };
    }
  }
  /* the tour (nothing else in hand) */
  let t = null;
  try { t = tourOffer(sim, S); } catch (_e) { t = null; }
  if (t && t.quest) return { npc: t.npc, title: t.quest.title, meet: TOUR_MEET[t.npc] || '', more: t.more || 0 };
  /* a quest still in hand: the tracked one first */
  const left = inHandIds(sim).filter((k) => k !== qid);
  if (left.length) {
    const tr = trackedQuestId();
    const pick = left.indexOf(tr) >= 0 ? tr : left[0];
    return { carryOn: (questById(pick) || {}).title || pick };
  }
  /* anyone with work at all */
  const offers = deriveQuestOffers(Object.assign({}, S, { rpg: sim }));
  if (offers.length) return { npc: offers[0].npc, title: offers[0].title, meet: TOUR_MEET[offers[0].npc] || '' };
  return null;
}

/* the quest the gold road leads to while nothing is in hand: the tour's
   suggestion (questRoute.js questRouteNpc) */
function roadOffer(S) {
  const R = (S && S.rpg) || null;
  let t = null;
  try { t = tourOffer(R, S); } catch (_e) { t = null; }
  return t && t.quest ? t.quest.id : null;
}

export function journalCtx(S) {
  const L = landsCtx();
  return {
    home: L.home,
    landNames: L.names,
    landDirs: L.dirs,
    meet: TOUR_MEET,
    /* the world map is the Wheel's (ui/WorldMapOverlay.jsx) */
    canMap: !!(S && isWheelTrialZone(S.currentZone)),
    roadTo: roadOffer(S),
  };
}

/** One quest's page (game/questJournal.js journalPage), or null. */
export function questJournalPage(S, qid, ctx) {
  const q = questById(qid);
  if (!q) return null;
  const R = (S && S.rpg) || {};
  const status = statusOf(S, qid);
  let steps = null;
  if (status === 'active' || status === 'ready') {
    try { steps = questSteps(q, R, S); } catch (_e) { steps = null; }
  }
  return journalPage({
    quest: q, status, rpg: R, steps, ap: QUEST_AP_REWARD,
    after: afterOf(S, qid), ctx: ctx || journalCtx(S),
  });
}

/** The journal's list: { apTotal, focusId, active, available, done }.
 *  `active` [{ id, title, ready, tracked, line }] in the order shown (the
 *  tracked one first); `available` [{ id, title, where }] the tour's
 *  suggestion first; `done` [{ id, title, ap }] newest first. */
export function questJournalList(S, ctx) {
  const R = (S && S.rpg) || {};
  const c = ctx || journalCtx(S);
  const log = deriveQuestLog(S);
  const tracked = trackedQuestId();
  const rows = log.active.map(({ quest, ready }) => {
    let line = quest.desc || '';
    if (!ready) {
      let st = null;
      try { st = questSteps(quest, R, S); } catch (_e) { st = null; }
      const cur = st && st.find((x) => x.current);
      if (cur) line = cur.label;
      const n = journalCount(quest, R);
      if (n) line += ' (' + countText(quest, n) + ')';
    } else line = 'Ready: hand it in to ' + folkDisplayName(quest.npc);
    return { id: quest.id, title: quest.title, ready, tracked: quest.id === tracked, line };
  });
  /* the worker's order, so "newest" is the last one taken */
  const order = inHandIds(R).filter((k) => rows.some((r) => r.id === k));
  const offers = deriveQuestOffers(S);
  const road = c.roadTo;
  offers.sort((a, b) => (a.id === road ? 0 : 1) - (b.id === road ? 0 : 1));
  const done = log.done.slice().reverse().map((q) => ({ id: q.id, title: q.title, ap: QUEST_AP_REWARD }));
  return {
    apTotal: questApTotal(R._quests, QUEST_AP_REWARD, QUEST_CHAINS),
    focusId: focusQuestId(order, tracked) || (offers[0] ? offers[0].id : null),
    active: activeOrder(rows, tracked),
    available: offers.map((q) => ({ id: q.id, title: q.title, where: offerWhere(q, c) })),
    done,
  };
}
