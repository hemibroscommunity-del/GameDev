import { SKILL_ROSTER } from './mobile/sheet/skillsModel.js';
import { portraitSrc, PORTRAIT_FALLBACK_SRC } from './mobile/sheet/portraitStore.js'; /* v2.3.2610: a CHARACTER level wears the character */

/* ═══ SKILL -> ICON ═══
 * Object.create(null), never a plain {}: this is keyed by skill ids that
 * arrive over the wire, and CLAUDE.md records three separate incidents in one
 * day from '__proto__' silently no-opping on a plain object (duel.away
 * v2.3.1175, party meta v2.3.1185, amulet tiers v2.3.1192).
 *
 * The life-skill half is DERIVED from SKILL_ROSTER (skillsModel.js) rather
 * than retyped, so it covers all ten of LIFE_SKILLS by construction and a
 * skill added there arrives here with its icon already attached.  Note
 * `gemCutting` is camelCase in the data and `skill-gemcutting.webp` on disk —
 * one more reason to take the path from the roster instead of deriving it. */
const SKILL_ICON = Object.create(null);
const SKILL_LABEL = Object.create(null);
for (const s of SKILL_ROSTER) {
  if (!s.iconSrc) continue;
  SKILL_ICON[s.key] = s.iconSrc;
  SKILL_LABEL[s.key] = s.name;
}
/* Combat.  The keys the worker actually sends are prog3's — `sword`, `bow`,
   `staff` (PROG3_SKILL_META in src/data/prog3.js) — NOT melee/magic, which is
   what the icon FILES are called.  Both spellings are mapped because
   StatScreenPanel and the older weapon-skill code use the file spelling. */
const _COMBAT = [
  ['sword',   'Melee',   '/icons/ui/combat-melee.webp?v=2.3.1232'],
  ['melee',   'Melee',   '/icons/ui/combat-melee.webp?v=2.3.1232'],
  ['bow',     'Bow',     '/icons/ui/combat-bow.webp?v=2.3.1232'],
  ['staff',   'Magic',   '/icons/ui/combat-magic.webp?v=2.3.1232'],
  ['magic',   'Magic',   '/icons/ui/combat-magic.webp?v=2.3.1232'],
  ['defense', 'Defense', '/icons/ui/combat-defense.webp?v=2.3.1232'],
];
for (const [k, label, src] of _COMBAT) { SKILL_ICON[k] = src; SKILL_LABEL[k] = label; }

/* ═══ THE FALLBACK IS NOT OPTIONAL ═══
 * A character level-up that is not attributed to any one skill is the NORMAL
 * case on several paths (combat_credit, the legacy client loop, a Build-sheet
 * point spend), so there is always something with no icon of its own — and a
 * level-up rendering an empty circle, or a broken-image glyph, is worse than
 * the notification this replaces.  Every skill that can level is covered by
 * the two tables above; this is for "levelled, but not as a skill". */
const FALLBACK_ICON = '/icons/ui/hero/xp.webp?v=2.3.1694';

export function levelUpIconFor(skill) {
  const k = typeof skill === 'string' ? skill : '';
  return (k && SKILL_ICON[k]) || FALLBACK_ICON;
}

/* ═══ v2.3.2610: WHAT GOES IN THE CIRCLE ═══
 * Owner: "if it's combat level just show the character portrait in the center
 * of the new level up animation."
 *
 * A SKILL level-up seats that skill's icon — v2.3.2591's rule, unchanged.  A
 * CHARACTER level-up has no skill to seat, and the fallback it used to get was
 * a generic XP glyph, which is the least informative thing the medallion can
 * hold at the most important moment it has.  The character's own bust says
 * whose level it is, and it is already drawn: BottomDashboard renders it from
 * the live cosmetics into portraitStore, which is where the Shared column in
 * the points panel reads it too.  One source, read through portraitSrc — not a
 * second generator, and not a second fallback chain.
 *
 * `S` is threaded through for the middle step of that chain (S.myAvatar), the
 * same way HeroExpanded threads it. */
export function levelUpMedallionSrc(msg, S) {
  if (msg && msg.kind === 'char') return portraitSrc(S);
  return levelUpIconFor(msg && msg.skill);
}
export function levelUpLabelFor(msg) {
  if (!msg) return '';
  if (msg.skillLabel) return msg.skillLabel;                 /* prog3 sends one */
  const k = typeof msg.skill === 'string' ? msg.skill : '';
  if (k && SKILL_LABEL[k]) return SKILL_LABEL[k];
  if (msg.label) return msg.label;                           /* life-skill path */
  return '';
}

/* Every distinct icon URL the burst can render, for the preloader.  Built
   from the same two tables, so an icon added above is warmed without anyone
   having to remember a second list. */
export const LEVELUP_ICON_URLS = Array.from(new Set([
  ...Object.keys(SKILL_ICON).map((k) => SKILL_ICON[k]),
  FALLBACK_ICON,
  /* v2.3.2610: the character medallion's LAST resort.  The first two steps of
     portraitSrc are data already in memory (a canvas data URL, or the avatar
     the session joined with) and cost no fetch; this one is a file, so under
     the preloading law it warms with the rest of the burst's art rather than
     being fetched on the frame a player first levels their character. */
  PORTRAIT_FALLBACK_SRC,
]));
