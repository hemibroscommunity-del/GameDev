import { getEquip, onEquipChange } from '@/rendering/gearCatalog.js';

/* === gearWornSync — keep the gearWorn React flag in sync with equipped gear ===
   v2.3.895: extracted verbatim from a BroTown.jsx useEffect (the first
   effect-body extraction; game-system wiring moves to src/game/). Subscribes
   to chest/legs/shirt equip changes and pushes a {chest,legs,shirt} "is
   something worn" map into React state via setGearWorn. Behavior-frozen — the
   subscription set, the recompute-all-three handler, and the unsubscribe
   cleanup are unchanged. Call from a useEffect with an empty dep array and
   return its result as the cleanup. */
export function wireGearWornSync(setGearWorn) {
  var offs = ['chest', 'legs', 'shirt'].map(function (slot) {
    return onEquipChange(slot, function () {
      setGearWorn({ chest: getEquip('chest') !== 'none', legs: getEquip('legs') !== 'none', shirt: getEquip('shirt') !== 'none' });
    });
  });
  return function () { offs.forEach(function (off) { off(); }); };
}
