/* v2.3.1298 (round-5 Quests): which quest the QuestDetailPanel drill
   shows — module state because drill panels mount from the PANELS
   registry with no props (same pattern as skillDetailBus). */

let id = null;

export const questDetailBus = {
  select(qid) { id = qid; },
  selected() { return id; },
};

/* v2.3.4390: QA's handle on a quest's own page (the UI review's
   dash-quest-detail): the pinned quest card's road (ui/QuestCard.jsx: select,
   then the drill), since the Quests page opens a quest beside its list now */
if (typeof window !== 'undefined') {
  window.__btQuestDetail = {
    open(qid) {
      id = qid;
      const bus = window.__broDashPanelBus;
      if (bus) { bus.open('quests'); bus.push('questDetail'); }
    },
  };
}
