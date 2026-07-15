/* v2.3.1296 (round-5 Skills): which skill the SkillDetailPanel drill
   shows.  SkillsPanel selects, then pushes 'skillDetail' onto the
   sheet stack; module state (not a prop) because drill panels mount
   from the PANELS registry with no props. */

let key = null;

export const skillDetailBus = {
  select(k) { key = k; },
  selected() { return key; },
};
