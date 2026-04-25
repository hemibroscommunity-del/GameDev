// Inspect card bus: open state + which subject to display.
// "subject" is a player profile object (self or another player). The bus is
// agnostic — anyone can call setSubject() with a profile and open() to show it.

const listeners = new Set();
const emit = () => { for (const fn of listeners) fn(); };

const state = {
  open: false,
  subject: null,    // profile object — see CANONICAL SHAPE below
  expanded: new Set(),  // section ids currently expanded
  hintShown: false, // first-time tooltip discovery hint
};

// CANONICAL SUBJECT SHAPE
// {
//   name: 'Mason',
//   level: 42,
//   archetype: 'Berserker',
//   pole: 'flame',                 // light|dark|flame|flora|stone|wind|volt
//   clanTag: 'WOLVES',             // optional
//   questLine: 'Find the relic in the ash valley',
//   recentJourneyLine: '"You walk lightly for a stranger." — Reed',
//   logo: null,                    // optional cosmetic mark URL
//   stats: { power: 30, vitality: 45, endurance: 28, agility: 18, mind: 12 },
//   tier2: { ferocity: { crit: 0.18, mult: 1.6 }, fortification: 240, ... },
//   vows: [],                      // [{ stat: 'power', days: 46, partner: 'Mason' }]
//   weapon: <item>,
//   armor:  <item>,
//   pet:    <item>,
//   skills: { cooking: 42, fishing: 99, farming: 18, blacksmithing: 80, ...10 keys },
//   history: { displayedTitle: 'Ash-walker', titles: [], capstones: [],
//              zonesCleared: 14, apexKills: 3, ascendant: false },
//   journey: { count: 142, folklore: 'They say her shadow lingers near the old well.',
//              entries: [{ ts, text }] },
// }

export const inspectCardBus = {
  state,
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  open(subject) {
    state.subject = subject;
    state.open = true;
    state.expanded = new Set();
    emit();
  },
  close() { state.open = false; emit(); },
  toggleExpanded(sectionId) {
    if (state.expanded.has(sectionId)) state.expanded.delete(sectionId);
    else state.expanded.add(sectionId);
    emit();
  },
  markHintSeen() { state.hintShown = true; emit(); },
};

if (typeof window !== 'undefined') window.inspectCardBus = inspectCardBus;
