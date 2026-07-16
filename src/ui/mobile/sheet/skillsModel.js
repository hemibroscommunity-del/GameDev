import { LIFE_SKILLS, FISHING_TIERS, WOODCUTTING_TIERS, MINING_TIERS } from '../../../data/lifeSkills.js';
import { BLACKSMITH_TIERS, WOODWORKING_TIERS, GEM_CUT_TIERS, COOKING_RECIPES } from '../../../data/gameSystems.js';

/* v2.3.1312: normalize the four crafting unlock tables that always
   existed in gameSystems.js but were never wired to the skills UI —
   the detail view's "next unlock" now works for 7 of 10 skills
   instead of 3.  minLvl-keyed objects -> the same {lvl, name} shape
   the lifeSkills.js tier arrays use.  Farming, trapping and
   enchanting genuinely have no level-keyed table (verified) — they
   keep the honest no-ladder fallback, never an invented one. */
const _fromMinLvl = (table) => Object.values(table)
  .map(t => ({ lvl: t.minLvl, name: t.label }))
  .sort((a, b) => a.lvl - b.lvl);
const SMITH_LADDER = _fromMinLvl(BLACKSMITH_TIERS);
const WOODWORK_LADDER = _fromMinLvl(WOODWORKING_TIERS);
const GEMCUT_LADDER = _fromMinLvl(GEM_CUT_TIERS);
const COOK_LADDER = COOKING_RECIPES
  .map(r => ({ lvl: r.cookLvl, name: r.name }))
  .sort((a, b) => a.lvl - b.lvl);

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
   - tiers: the REAL unlock ladder — lifeSkills.js tables for the
     gather trio, plus (v2.3.1312) the normalized gameSystems.js
     crafting tables; skills without a data ladder (farming/trapping/
     enchanting) show level + XP + earnHint only (no invented unlocks).
   - where / passive (v2.3.1312): real locations (the three node zones
     + the farm) and real formula-backed benefit lines only. */

const META = {
  woodcutting:   { icon: '🪓', name: 'Woodcutting',  iconSrc: '/icons/ui/skill-woodcutting.webp?v=2.3.1224',  group: 'gather',  accent: '#8FBF6A', iconScale: 1.15, tiers: WOODCUTTING_TIERS, tierNoun: (t) => t.tree, where: 'Frozen Shore', passive: (lvl) => 'Node extraction opens 0.25s sooner per level above its tier', earnHint: 'Chop trees in the wild — higher-level trees give more XP.' },
  fishing:       { icon: '🎣', name: 'Fishing',      iconSrc: '/icons/ui/skill-fishing.webp?v=2.3.1224',      group: 'gather',  accent: '#5B99DE', iconScale: 1.0,  tiers: FISHING_TIERS,     tierNoun: (t) => t.name, where: 'Starting Meadow', passive: (lvl) => 'Node extraction opens 0.25s sooner per level above its tier', earnHint: 'Cast at fishing spots and win the reel minigame.' },
  mining:        { icon: '⛏',  name: 'Mining',       iconSrc: '/icons/ui/skill-mining.webp?v=2.3.1224',       group: 'gather',  accent: '#B0885A', iconScale: 1.15, tiers: MINING_TIERS,      tierNoun: (t) => t.name, where: 'Deep Hollows', passive: (lvl) => 'Node extraction opens 0.25s sooner per level above its tier', earnHint: 'Break ore veins — deeper zones hold richer ore.' },
  farming:       { icon: '🌾', name: 'Farming',      iconSrc: '/icons/ui/skill-farming.webp?v=2.3.1224',      group: 'gather',  accent: '#D8C05A', iconScale: 1.0,  where: 'Your farm plots', earnHint: 'Plant, tend and harvest crops on your plot.' },
  trapping:      { icon: '🪤', name: 'Trapping',     iconSrc: '/icons/ui/skill-trapping.webp?v=2.3.1224',     group: 'gather',  accent: '#C08A5A', iconScale: 1.0,  earnHint: 'Set traps for small creatures and collect the catch.' },
  cooking:       { icon: '🍳', name: 'Cooking',      iconSrc: '/icons/ui/skill-cooking.webp?v=2.3.1224',      group: 'process', accent: '#E0955A', iconScale: 1.0,  tiers: COOK_LADDER, earnHint: 'Cook raw food at a campfire — perfect timing pays.', passive: (lvl) => `Cook timing window +${Math.min(30, lvl * 0.4).toFixed(1)}%` },
  blacksmithing: { icon: '🔨', name: 'Smithing',     iconSrc: '/icons/ui/skill-blacksmithing.webp?v=2.3.1224', group: 'process', accent: '#9AA6B0', iconScale: 1.15, tiers: SMITH_LADDER, earnHint: 'Smelt ore and forge gear at the blacksmith.' },
  woodworking:   { icon: '🛠',  name: 'Woodworking',  iconSrc: '/icons/ui/skill-woodworking.webp?v=2.3.1224',  group: 'process', accent: '#B09A6A', iconScale: 1.15, tiers: WOODWORK_LADDER, earnHint: 'Turn lumber into planks, handles and furniture.' },
  gemCutting:    { icon: '💎', name: 'Gem Cutting',  iconSrc: '/icons/ui/skill-gemcutting.webp?v=2.3.1224',   group: 'process', accent: '#7AC0D8', iconScale: 1.0,  tiers: GEMCUT_LADDER, earnHint: 'Cut rough gems at the gem cutter — steady hands.' },
  enchanting:    { icon: '✨', name: 'Enchanting',   iconSrc: '/icons/ui/skill-enchanting.webp?v=2.3.1224',   group: 'process', accent: '#A98AD8', iconScale: 1.0,  earnHint: 'Infuse gear with elemental shards.' },
};

/* Canonical DATA order (lifeSkills.js) — XP/persistence key order. */
export const SKILL_ROSTER = LIFE_SKILLS.map(key => ({ key, ...META[key] })).filter(s => s.name);

/* Canonical DISPLAY order.  v2.3.1312 (owner, reversing the v2.3.1296
   keep-placeholders call): the two SOON cells are GONE — 'they consume
   space, make the game look unfinished, and force six narrow columns.'
   Five columns, gathering row then crafting row, never resorted
   (spatial memory beats recency). */
export const SKILL_GATHER = SKILL_ROSTER.filter(s => s.group === 'gather');
export const SKILL_CRAFT = SKILL_ROSTER.filter(s => s.group === 'process');
export const SKILL_DISPLAY_10 = [...SKILL_GATHER, ...SKILL_CRAFT];

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
