import { weaponSwapBus } from '@/ui/mobile/weaponSwapBus.js';
import { _objectSpread } from '@/lib/babelHelpers.js';

/* === weaponSwapSync — mirror weapon-swap-bus picks into rpgState ===
   v2.3.898: extracted verbatim from a BroTown.jsx useEffect (effect-pass;
   game-event wiring moves to src/game/). The WeaponSwapBar publishes the
   requested slot on weaponSwapBus; this mirrors it into rpgState so the
   rKnob emoji + getActiveWeapon callers pick up the change. (weaponSwapBus
   already mutates window._gameState directly, so game-loop logic flips
   immediately on tap — this is only the React-state mirror.) Behavior-
   frozen; returns the bus unsubscribe as cleanup. Call from a useEffect
   with an empty dep array. */
export function wireWeaponSwapSync(stateRef, setRpgState) {
  return weaponSwapBus.subscribe(function (slot) {
    var S = stateRef.current;
    if (!S || !S.rpg) return;
    S.rpg.activeSlot = slot;
    setRpgState(_objectSpread({}, S.rpg));
  });
}
