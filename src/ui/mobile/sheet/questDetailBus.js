/* v2.3.1298 (round-5 Quests): which quest the QuestDetailPanel drill
   shows — module state because drill panels mount from the PANELS
   registry with no props (same pattern as skillDetailBus). */

let id = null;

export const questDetailBus = {
  select(qid) { id = qid; },
  selected() { return id; },
};
