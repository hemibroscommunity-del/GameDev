import { LIFE_SKILLS, FISHING_TIERS, WOODCUTTING_TIERS, MINING_TIERS } from '../../../data/lifeSkills.js';

/* v2.3.1286: shared roster for the Skills destination.
   v2.3.1296 (ChatGPT round-5, owner-approved): the roster carries per-
   skill presentation + progression metadata now:
   - group: 'gather' (top compact row) vs 'process' (bottom row) — the
     canonical DISPLAY order is gathering row then processing row, and
     it NEVER reorders (spatial memory beats recency).
   - accent: one restrained identifying color per skill (hairline use
     only; tiles stay dark and quiet).
   - iconScale: optical-size compensation — the brown tool icons
     (woodcutting/mining/smithing/woodworking) carry more transparent
     padding than the rest and blended together at equal px.
   - earnHint: one honest sentence on how the skill gains XP.
   - tiers: the REAL unlock ladder from data/lifeSkills.js where one
     exists (fishing/woodcutting/mining) — the detail view derives
     "current / next unlock" from it; skills without a data ladder
     show level + XP + earnHint only (no invented unlocks).
   Owner: keep TWO placeholder cells for future skills 11 and 12. */

const META = {
  woodcutting:   { icon: '🪓', name: 'Woodcutting',  iconSrc: '/icons/ui/skill-woodcutting.webp?v=2.3.1224',  group: 'gather',  accent: '#8FBF6A', iconScale: 1.15, tiers: WOODCUTTING_TIERS, tierNoun: (t) => t.tree, earnHint: 'Chop trees in the wild — higher-level trees give more XP.' },
  fishing:       { icon: '🎣', name: 'Fishing',      iconSrc: '/icons/ui/skill-fishing.webp?v=2.3.1224',      group: 'gather',  accent: '#5B99DE', iconScale: 1.0,  tiers: FISHING_TIERS,     tierNoun: (t) => t.name, earnHint: 'Cast at fishing spots and win the reel minigame.' },
  mining:        { icon: '⛏',  name: 'Mining',       iconSrc: '/icons/ui/skill-mining.webp?v=2.3.1224',       group: 'gather',  accent: '#B0885A', iconScale: 1.15, tiers: MINING_TIERS,      tierNoun: (t) => t.name, earnHint: 'Break ore veins — deeper zones hold richer ore.' },
  farming:       { icon: '🌾', name: 'Farming',      iconSrc: '/icons/ui/skill-farming.webp?v=2.3.1224',      group: 'gather',  accent: '#D8C05A', iconScale: 1.0,  earnHint: 'Plant, tend and harvest crops on your plot.' },
  trapping:      { icon: '🪤', name: 'Trapping',     iconSrc: '/icons/ui/skill-trapping.webp?v=2.3.1224',     group: 'gather',  accent: '#C08A5A', iconScale: 1.0,  earnHint: 'Set traps for small creatures and collect the catch.' },
  cooking:       { icon: '🍳', name: 'Cooking',      iconSrc: '/icons/ui/skill-cooking.webp?v=2.3.1224',      group: 'process', accent: '#E0955A', iconScale: 1.0,  earnHint: 'Cook raw food at a campfire — perfect timing pays.' },
  blacksmithing: { icon: '🔨', name: 'Smithing',     iconSrc: '/icons/ui/skill-blacksmithing.webp?v=2.3.1224', group: 'process', accent: '#9AA6B0', iconScale: 1.15, earnHint: 'Smelt ore and forge gear at the blacksmith.' },
  woodworking:   { icon: '🛠',  name: 'Woodworking',  iconSrc: '/icons/ui/skill-woodworking.webp?v=2.3.1224',  group: 'process', accent: '#B09A6A', iconScale: 1.15, earnHint: 'Turn lumber into planks, handles and furniture.' },
  gemCutting:    { icon: '💎', name: 'Gem Cutting',  iconSrc: '/icons/ui/skill-gemcutting.webp?v=2.3.1224',   group: 'process', accent: '#7AC0D8', iconScale: 1.0,  earnHint: 'Cut rough gems at the gem cutter — steady hands.' },
  enchanting:    { icon: '✨', name: 'Enchanting',   iconSrc: '/icons/ui/skill-enchanting.webp?v=2.3.1224',   group: 'process', accent: '#A98AD8', iconScale: 1.0,  earnHint: 'Infuse gear with elemental shards.' },
};

/* Canonical DATA order (lifeSkills.js) — XP/persistence key order. */
export const SKILL_ROSTER = LIFE_SKILLS.map(key => ({ key, ...META[key] })).filter(s => s.name);

/* Canonical DISPLAY order (round-5): gathering row, then processing
   row, each padded to six with a placeholder for future skills. */
const gather = SKILL_ROSTER.filter(s => s.group === 'gather');
const process_ = SKILL_ROSTER.filter(s => s.group === 'process');
const placeholder = (i) => ({ key: `future-${i}`, placeholder: true });
export const SKILL_DISPLAY_12 = [
  ...gather, ...Array.from({ length: 6 - gather.length }, (_, i) => placeholder(i)),
  ...process_, ...Array.from({ length: 6 - process_.length }, (_, i) => placeholder(i + 3)),
];

/* v2.3.1296: unlock ladder helpers for the detail view — from the real
   tier tables only.  Returns null for skills without a data ladder. */
export function skillUnlocks(sd, level) {
  if (!sd || !sd.tiers) return null;
  const noun = sd.tierNoun || ((t) => t.name);
  const current = sd.tiers.filter(t => t.lvl <= level);
  const upcoming = sd.tiers.filter(t => t.lvl > level);
  return {
    current: current.slice(-2).map(noun),          /* latest unlocked */
    next: upcoming[0] ? { name: noun(upcoming[0]), lvl: upcoming[0].lvl } : null,
    later: upcoming[1] ? { name: noun(upcoming[1]), lvl: upcoming[1].lvl } : null,
  };
}

/* v2.3.1296: level-up badge — the Skills toolbar button shows a dot
   only for UNVIEWED level-ups (round-5: never badge ordinary XP).
   Last-seen levels persist per browser; opening Skills EXPANDED marks
   everything seen. */
const SEEN_KEY = 'bt_skillsSeenLv';
const readSeen = () => {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY)) || {}; } catch { return {}; }
};
export function hasUnseenLevelUps(R) {
  const ls = (R && R.lifeSkills) || {};
  const seen = readSeen();
  return SKILL_ROSTER.some(s => ((ls[s.key] && ls[s.key].level) || 0) > (seen[s.key] ?? ((ls[s.key] && ls[s.key].level) || 0)));
}
export function markSkillsSeen(R) {
  const ls = (R && R.lifeSkills) || {};
  const seen = {};
  for (const s of SKILL_ROSTER) seen[s.key] = (ls[s.key] && ls[s.key].level) || 0;
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch {}
}
