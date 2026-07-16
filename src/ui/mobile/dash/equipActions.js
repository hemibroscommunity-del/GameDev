/* v2.3.1330 (owner: one-tap Unequip in the Equipped tab's display
   pane): the four unequip flows, hoisted OUT of ItemDetailPopup's
   component closure into this shared module so the pane button and
   the popup's Unequip action run ONE implementation — the
   load-bearing details (weapon server-sync + active-slot repair
   v2.3.1159, the HP-neutral armor recalc + stats_update push
   v2.3.236, gearStash round-trip v2.3.685) live exactly once.
   A separate module (not exports on ItemDetailPopup) because the
   popup already imports thumbFor/iconFor/classify FROM
   InventoryPanel — importing back would create a cycle. */

import { getState } from './common.js';
import { GEAR_CATALOG, getEquip, setEquip } from '../../../rendering/gearCatalog.js';
import { recalcDerived } from '../../../data/gameSystems.js';

function persist(R) {
  try { if (typeof window !== 'undefined') localStorage.setItem('bt_rpg', JSON.stringify(R)); } catch (e) {}
}

/* v2.3.1159: mirror weapon equip/unequip/slot changes to the worker —
   local mutation is prediction; the worker echo is authoritative.
   Gate on _serverMonsters (offline/legacy solo has no worker). */
function syncWeaponSlot(msg) {
  const S = getState();
  if (S && S._serverMonsters && S.channel) {
    try { S.channel.send(msg); } catch (e) {}
  }
}

function gearName(slot, gearId) {
  const c = (GEAR_CATALOG[slot] || []).find((g) => g.id === gearId);
  return (c && c.name) || 'Armor';
}

export function unequipWeaponSlot(slot /* 'weapon' | 'ranged' | 'staff' */) {
  const S = getState();
  if (!S || !S.rpg) return;
  const R = S.rpg;
  const slotProp = slot === 'ranged' ? 'rangedWeapon'
                 : slot === 'staff'  ? 'staffWeapon'
                 : 'weapon';
  const cur = R[slotProp];
  if (!cur) return;
  if (!R.weaponStash) R.weaponStash = [];
  R.weaponStash.push(cur);
  R[slotProp] = null;
  syncWeaponSlot({ type: 'unequip_request', payload: { slot: slotProp } });
  if ((slotProp === 'rangedWeapon' && R.activeSlot === 'ranged')
      || (slotProp === 'staffWeapon' && R.activeSlot === 'staff')) {
    R.activeSlot = 'melee';
    syncWeaponSlot({ type: 'set_active_slot', payload: { slot: 'melee' } });
  }
  persist(R);
}

export function unequipShieldDirect() {
  const S = getState();
  if (!S || !S.rpg) return;
  const R = S.rpg;
  if (!R.shield) return;
  if (!R.shieldStash) R.shieldStash = [];
  R.shieldStash.push(R.shield);
  R.shield = null;
  persist(R);
}

/* Direct stats_update push — these flows mutate S.rpg without going
   through setRpgState, so BroTown's React-driven stats_update
   useEffect doesn't fire on its own.  Send the armor change (with
   current raw stats) so the server recomputes maxes correctly. */
export function syncArmorChange(R) {
  const S = getState();
  if (S && S.channel) {
    try {
      S.channel.send({ type: 'stats_update', payload: {
        armor: R.armor || null,
        maxHp: R.maxHp || 100,
        vitality: R.vitality || 0,
        power: R.power || 0,
        endurance: R.endurance || 0,
        agility: R.agility || 0,
        mind: R.mind || 0,
        /* v2.3.1155: the five retired T2 stats are off the wire. */
      }});
    } catch (e) {}
  }
}

export function unequipArmorDirect() {
  const S = getState();
  if (!S || !S.rpg) return;
  const R = S.rpg;
  if (!R.armor) return;
  if (!R.armorStash) R.armorStash = [];
  R.armorStash.push(R.armor);
  R.armor = null;
  recalcDerived(R);
  R.hp = Math.min(R.maxHp, R.hp);  // cap only, no delta-subtract (v2.3.236)
  persist(R);
  syncArmorChange(R);
}

export function unequipGearDirect(slot) {
  const S = getState();
  if (!S || !S.rpg) return;
  const R = S.rpg;
  const gearId = getEquip(slot);
  if (!gearId || gearId === 'none') return;
  if (!R.gearStash) R.gearStash = [];
  R.gearStash.push({ slot, gearId, name: gearName(slot, gearId) });
  setEquip(slot, 'none');
  persist(R);
}
