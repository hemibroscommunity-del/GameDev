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
import { t1StatsPayload } from '@/game/t1Sync.js'; /* v2.3.1633: one gate, every sender */
import { GEAR_CATALOG, getEquip, setEquip, syncArmorLayers } from '../../../rendering/gearCatalog.js';
import { recalcDerived } from '../../../data/gameSystems.js';

function persist(R) {
  try { if (typeof window !== 'undefined') localStorage.setItem('bt_rpg', JSON.stringify(R)); } catch (e) {}
}

/* v2.3.1159: mirror weapon equip/unequip/slot changes to the worker —
   local mutation is prediction; the worker echo is authoritative.
   Gate on _serverMonsters (offline/legacy solo has no worker). */
/* v2.3.1687: `_serverMonsters` removed — see the long note on the twin of
   this helper in ItemDetailPopup.jsx.  Short version: it is false in town,
   these are town screens, so every loadout change made here was applied
   locally and told the worker nothing. */
function syncWeaponSlot(msg) {
  const S = getState();
  if (S && S.channel) {
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
/* v2.3.1701: `opts.legs` adds the LEGS piece to the push.  It is opt-in
   rather than always-on for the reason spelled out in t1Sync.js: a field
   this client has not learned yet must be OMITTED, not reported as null —
   `_handleStatsUpdate` skips absent keys, so a chest swap made before the
   first player_state echo cannot wipe a legs piece the server is holding.
   Only the legs flows, which by definition know what they just equipped,
   send it. */
export function syncArmorChange(R, opts) {
  const S = getState();
  if (S && S.channel) {
    try {
      /* v2.3.1633: the five raw stats ride the SHARED gate now.  This
         push is a second, direct sender (these flows mutate S.rpg
         without setRpgState, so BroTown's React-driven stats_update
         never fires for them) and it reported the stats unconditionally
         -- so a client that had not yet learned them wiped the character
         by doing nothing more than unequipping a piece of armour, on any
         worker without the v2.3.1624 server-side guard.  See
         src/game/t1Sync.js. */
      S.channel.send({ type: 'stats_update', payload: {
        armor: R.armor || null,
        maxHp: R.maxHp || 100,
        ...(opts && opts.legs ? { legsArmor: R.legsArmor || null } : null),
        ...t1StatsPayload(S, R),
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
  syncArmorLayers(R); /* v2.3.1703: the plate comes OFF the character too */
  persist(R);
  syncArmorChange(R);
}

/* v2.3.1703: the LEGS twin.  There was no unequip for a stat legs piece at
   all — v2.3.1701 shipped the equip side only, because the loadout cell's
   legs button was toggling the COSMETIC layer and looked like it already
   worked.  With the layer derived from this field, that button has to move
   the field, so the flow has to exist.  Mirrors unequipArmorDirect exactly,
   including the `legs: true` push without which the worker keeps the piece
   and the next full player_state puts it back on. */
export function unequipLegsDirect() {
  const S = getState();
  if (!S || !S.rpg) return;
  const R = S.rpg;
  if (!R.legsArmor) return;
  if (!R.legsStash) R.legsStash = [];
  R.legsStash.push(R.legsArmor);
  R.legsArmor = null;
  recalcDerived(R);
  R.hp = Math.min(R.maxHp, R.hp);
  syncArmorLayers(R);
  persist(R);
  syncArmorChange(R, { legs: true });
}

/* ═══ v2.3.1762: PUTTING A STAT PIECE ON, FROM ONE PLACE ═══
   Owner: "Unequipping the copper torso plate armor doesn't remove it from the
   equipped status on character chest piece and also still keeps the mitigation
   percentage of wearing the plate active."

   The loadout picker's row was toggling the COSMETIC layer only — it pushed a
   {slot, gearId} entry into gearStash and called setEquip(slot,'none').  Since
   v2.3.1703 that layer is DERIVED from the stat piece, so the row took the art
   off while the piece stayed worn: the worker kept mitigating, the cell kept
   reading equipped (it counts R.armor), and the next armour echo put the art
   straight back.

   The equip half lived as a closure inside ItemDetailPopup, bound to the card's
   own target, so the picker could not reuse it.  Both halves live here now and
   both callers share them — the alternative is a second copy of "wear a piece"
   that drifts from this one the first time either is touched. */
export function equipArmorFromStash(piece) {
  const S = getState();
  if (!S || !S.rpg || !piece) return false;
  const R = S.rpg;
  if (!R.armorStash) R.armorStash = [];
  const idx = R.armorStash.indexOf(piece);
  if (idx >= 0) R.armorStash.splice(idx, 1);
  if (R.armor) R.armorStash.push(R.armor);
  R.armor = piece;
  recalcDerived(R);
  R.hp = Math.min(R.maxHp, R.hp);  /* cap only, no delta-heal */
  syncArmorLayers(R);
  persist(R);
  syncArmorChange(R);
  return true;
}

export function equipLegsFromStash(piece) {
  const S = getState();
  if (!S || !S.rpg || !piece) return false;
  const R = S.rpg;
  if (!R.legsStash) R.legsStash = [];
  const idx = R.legsStash.indexOf(piece);
  if (idx >= 0) R.legsStash.splice(idx, 1);
  if (R.legsArmor) R.legsStash.push(R.legsArmor);
  R.legsArmor = piece;
  recalcDerived(R);
  R.hp = Math.min(R.maxHp, R.hp);
  syncArmorLayers(R);
  persist(R);
  /* `legs: true` or the worker never learns and the next echo takes it off. */
  syncArmorChange(R, { legs: true });
  return true;
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
