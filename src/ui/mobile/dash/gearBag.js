/* ═══ GEAR'S BAG, AS ITS SQUARES SHOW IT ═══
 * v2.3.6688 (card UI2-gear PR 2): out of GearTab.jsx (where v2.3.4233 wrote it), shared by today's Gear
 * (`?ui2=0`) and the two panels (GearPanels.jsx). */
import { shownUnrevealed } from '@/game/revealBag.js';   /* v2.3.4233: a "?" piece never stacks */

/* v2.3.4233, the owner: "Armor should be able to stack right? The only way it
   comes different is if the rarity tier or the hardness tier is different."
   Identical spare armour (same kind, material, quality, hardness, all
   revealed) shows as ONE cell with its count, like ore.  Display only: the
   server keeps every piece; the cell stands for the first of the group, so
   Equip and Drop act on one piece.  Weapons never stack. */
const PIECE_ID_KEY = /^(id|gid|uid|serial|stamp|seq|t|at|ts|time|created|acquired|slotIndex|index)/i;
export function groupSpare(entries) {
  const seen = new Map();
  const out = [];
  for (const e of entries) {
    if (!/^stash(Shield|Armor|Legs|Gear)$/.test(e.kind) || !e.obj || shownUnrevealed(e.kind, e.index, e.obj)) { out.push(e); continue; }
    const sig = e.kind + '|' + Object.keys(e.obj).filter((k) => !PIECE_ID_KEY.test(k)).sort()
      .map((k) => k + '=' + JSON.stringify(e.obj[k])).join('|');
    const first = seen.get(sig);
    if (first) { first.count = (first.count || 1) + 1; continue; }
    const g = { ...e, count: 1 };
    seen.set(sig, g);
    out.push(g);
  }
  return out;
}

