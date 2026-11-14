import { startTransition } from 'react';
import { getEquip, onEquipChange } from '@/rendering/gearCatalog.js';

/* === gearWornSync — keep the gearWorn React flag in sync with equipped gear ===
   v2.3.895: extracted verbatim from a BroTown.jsx useEffect (the first
   effect-body extraction; game-system wiring moves to src/game/). Subscribes
   to chest/legs/shirt equip changes and pushes a {chest,legs,shirt} "is
   something worn" map into React state via setGearWorn. Behavior-frozen — the
   subscription set, the recompute-all-three handler, and the unsubscribe
   cleanup are unchanged. Call from a useEffect with an empty dep array and
   return its result as the cleanup. */
/* ═══ v2.3.5046: AN EQUIP REDRAWS THE GAME'S ROOT AS A TRANSITION, AND ONLY WHEN A FLAG CHANGED ═══
   held-budget.mjs `other: R > J`: React's scheduler working through one
   redraw in one piece, 15 to 17.5 ms at the held sweep's `armour` station.
   The redraw is this: `gearWorn` is BroTown's own state, so every equip
   change re-rendered the game's root and everything under it (a development
   build's profile of six equips: BroTown, the GearTab, the band's keys, the
   ride button, the quest coach...), as a blocking update, in one piece (the
   production stacks: performConcurrentWorkOnRoot > performUnitOfWork, 13 ms
   of it in one go).  And it re-rendered for every equip, though only the
   inventory panel reads the flags, and they change only when a slot goes
   from bare to worn or back.  Now:
     - a change that leaves the three flags as they were (one plate for
       another) sets nothing, and redraws nothing;
     - a change of a flag is a transition (startTransition): React renders
       it in pieces of about 5 ms and lets a frame in between, as the band's
       beat is drawn (docs/specs/held-sweep.md fix 6).  The inventory panel's
       worn toggles follow a frame or two later.
   `?equipredraw=0`: every change set at once, as before. */
const _NOW = (() => { try { return typeof location !== 'undefined' && /[?&]equipredraw=0\b/.test(location.search || ''); } catch (e) { return false; } })();
function _flags() {
  return { chest: getEquip('chest') !== 'none', legs: getEquip('legs') !== 'none', shirt: getEquip('shirt') !== 'none' };
}
export function wireGearWornSync(setGearWorn) {
  var last = _flags();
  var offs = ['chest', 'legs', 'shirt'].map(function (slot) {
    return onEquipChange(slot, function () {
      var next = _flags();
      if (_NOW) { setGearWorn(next); return; }
      if (next.chest === last.chest && next.legs === last.legs && next.shirt === last.shirt) return;
      last = next;
      startTransition(function () { setGearWorn(next); });
    });
  });
  return function () { offs.forEach(function (off) { off(); }); };
}
