/* v2.3.1560: the quick bar's "what did I last use" memory (owner: an
   ultra-compact persistent row above the toolbar showing the first bag
   slots, the worn chest/legs/weapon, the last life skill used, and the
   last two combat skills trained).

   Nothing in the game tracked "last used" before this file — there is no
   event bus for a harvest or a stat gain — so this DERIVES recency by
   sampling the authoritative rpg state the dashboard already polls at
   200ms.  A life skill counts as USED the frame its xp/level rises; a
   combat skill counts as TRAINED the frame its level or _buildProg rises.
   That keeps the whole feature read-only against server-settled state
   (CLAUDE.md: the server is authoritative and the client mirrors), and it
   works no matter which code path granted the XP — farm, node, kill,
   quest reward or an offline mail settlement on rejoin.

   The first sample after a load only SEEDS the baseline; it never
   registers a use, or every reconnect would "use" whatever the server
   happened to send in its first player_state.  Cold start therefore falls
   back to the highest-level skill, which is the honest answer to "what
   have you been training" before this session recorded anything. */

import { LIFE_SKILLS } from '../../../data/lifeSkills.js';
import { COMBAT_SKILLS, skillLevel, skillProgress } from './heroModel.js';

const LIFE_KEY = 'bt_quickLife';
const COMBAT_KEY = 'bt_quickCombat';

const readStr = (k) => {
  try { return localStorage.getItem(k) || null; } catch (_e) { return null; }
};
const readArr = (k) => {
  try {
    const v = JSON.parse(localStorage.getItem(k));
    return Array.isArray(v) ? v.filter(x => typeof x === 'string') : [];
  } catch (_e) { return []; }
};
const write = (k, v) => {
  try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch (_e) {}
};

let lastLife = readStr(LIFE_KEY);
let lastCombat = readArr(COMBAT_KEY).slice(0, 2);

/* Previous sample.  null until the first sampleQuickbar call seeds it. */
let prevLife = null;
let prevCombat = null;

const lifeScore = (R, key) => {
  const s = (R.lifeSkills && R.lifeSkills[key]) || null;
  if (!s) return 0;
  /* level dominates so a level-up that resets xp still reads as a rise. */
  return (s.level || 0) * 1e9 + (s.xp || 0);
};
const combatScore = (R, key) => {
  const p = skillProgress(R, key) || { prog: 0 };
  return skillLevel(R, key) * 1e9 + (p.prog || 0);
};

/* Sample the state and update the recency memory.  Safe to call every
   tick — it only writes when a score actually rises. */
export function sampleQuickbar(R) {
  if (!R) return;
  const life = {};
  for (const k of LIFE_SKILLS) life[k] = lifeScore(R, k);
  const combat = {};
  for (const s of COMBAT_SKILLS) combat[s.key] = combatScore(R, s.key);

  if (prevLife && prevCombat) {
    /* Ties are impossible to order, so on a multi-skill jump (an offline
       settlement landing several gains at once) take the BIGGEST riser —
       an arbitrary object-key order would be a coin flip. */
    let bestK = null, bestD = 0;
    for (const k of LIFE_SKILLS) {
      const d = life[k] - (prevLife[k] || 0);
      if (d > bestD) { bestD = d; bestK = k; }
    }
    if (bestK && bestK !== lastLife) { lastLife = bestK; write(LIFE_KEY, bestK); }

    const risers = COMBAT_SKILLS
      .map(s => ({ key: s.key, d: combat[s.key] - (prevCombat[s.key] || 0) }))
      .filter(r => r.d > 0)
      .sort((a, b) => b.d - a.d);
    if (risers.length) {
      const next = [...risers.map(r => r.key), ...lastCombat]
        .filter((k, i, a) => a.indexOf(k) === i)
        .slice(0, 2);
      if (next.join() !== lastCombat.join()) { lastCombat = next; write(COMBAT_KEY, next); }
    }
  }
  prevLife = life;
  prevCombat = combat;
}

/* The life skill to show: last used, else the highest-level one, else
   null (the cell renders its empty pictogram rather than inventing a
   skill the player has never touched). */
export function quickLifeSkill(R) {
  if (lastLife) return lastLife;
  if (!R || !R.lifeSkills) return null;
  let best = null, bestLv = 0;
  for (const k of LIFE_SKILLS) {
    const lv = (R.lifeSkills[k] && R.lifeSkills[k].level) || 0;
    if (lv > bestLv) { bestLv = lv; best = k; }
  }
  return best;
}

/* The two combat skills to show: most-recently-trained first, topped up
   from the highest-level ones so the row is never half empty on a fresh
   character (every combat skill starts at a real level). */
export function quickCombatSkills(R) {
  const byLevel = COMBAT_SKILLS
    .map(s => ({ key: s.key, lv: R ? skillLevel(R, s.key) : 0 }))
    .sort((a, b) => b.lv - a.lv)
    .map(s => s.key);
  return [...lastCombat, ...byLevel]
    .filter((k, i, a) => a.indexOf(k) === i)
    .slice(0, 2);
}

/* Test seam: reset the module memory (no persistence write). */
export function _resetQuickbarMemory() {
  lastLife = null; lastCombat = []; prevLife = null; prevCombat = null;
}
