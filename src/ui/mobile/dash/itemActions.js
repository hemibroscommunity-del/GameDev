/* ═══ v2.3.3940: WHAT YOU CAN DO WITH AN ITEM, IN ONE LIST ═══
 *
 * The Gear tab (GearTab.jsx) shows a tapped bag item in its middle panel with
 * that item's buttons; the item card (ItemDetailPopup.jsx) shows the same
 * item's buttons on its own row.  They are ONE list, built here by ONE
 * function (itemActionList) and run by ONE function (runItemAction), so a new
 * action -- Lane M's "Inspect" for a fish -- is a line in each and appears on
 * both screens, and a rule (a gate, a refusal) cannot be on one and not the
 * other.
 *
 * What the item ALLOWS is still the card's own answer: resolveTarget in
 * ItemDetailPopup builds `actions` (every server-gated flag read off caps
 * there, where the caps-audit reads them) and `sellWhy` / `dropWhy`.  This
 * file turns that answer into an ordered list of buttons and runs one.  Sell
 * and Drop open the item card's own sheets (how many, the price), so the Gear
 * tab's Sell and Drop hand over to the card with `flow` set (ui.sell /
 * ui.drop); everything else runs here.
 */
import { dishFor } from '@/data/dishes.js';
import { isInstantHeal, pvpHealWaitMs, pvpHealWaitText, noteInstantHeal } from '@/game/fightFood.js';
import { pushDmgPopup } from '@/game/combatHelpers.js';
import { cue } from '@/game/eventSounds.js';
import { getState } from './common.js';
import { eatBus } from '../eatBus.js';
import { firemakingBus } from '../firemakingBus.js';
import { chestRevealBus } from '../ChestReveal.jsx';
import { lock as lockItem, unlock as unlockItem, isLocked as itemIsLocked } from './inventoryLocks.js';
import {
  unequipWeaponSlot, unequipShieldDirect, unequipArmorDirect, unequipGearDirect,
  equipArmorFromStash, equipLegsFromStash, equipStashWeapon, equipStashShield, equipStashGear,
} from './equipActions.js';

/** A bag entry (bagModel) as the item card's target -- the same shapes
 *  InventoryPanel's tiles open the card with. */
export function entryTarget(e) {
  if (!e) return null;
  switch (e.kind) {
    case 'item': return { kind: 'inventory', key: e.key, count: e.count || 0 };
    case 'stashWeapon': return { kind: 'stashWeapon', wpn: e.obj, index: e.index };
    case 'stashShield': return { kind: 'stashShield', shield: e.obj, index: e.index };
    case 'stashArmor': return { kind: 'stashArmor', armor: e.obj, index: e.index };
    case 'stashLegs': return { kind: 'stashLegs', armor: e.obj, index: e.index };
    case 'stashGear': return { kind: 'stashGear', gear: e.obj, index: e.index };
    default: return null;
  }
}

/** The buttons for `target`, from its card (resolveTarget's answer), in the
 *  order they are drawn.  Each { id, label, tone ('primary' | 'danger' |
 *  undefined), off (greyed, with `why`), attrs (test handles) }.
 *  `lock` is last: the item card draws its own pin in its header and leaves
 *  it out; the Gear tab draws it as a button. */
export function itemActionList(target, card) {
  const a = (card && card.actions) || {};
  const out = [];
  const add = (id, label, tone, extra) => out.push({ id, label, tone, off: false, why: '', attrs: null, ...(extra || null) });
  if (a.light) add('light', 'Light fire', 'primary');
  if (a.eat) add('eat', 'Eat', 'primary');
  if (a.open) add('open', 'Open Golden Ticket', 'primary');
  if (a.openChest) add('openChest', 'Claim', 'primary', { attrs: { 'data-open-chest': '' } });
  if (a.drink) add('drink', 'Drink', 'primary');
  if (a.capeOn) add('capeOn', 'Equip', 'primary');
  if (a.capeOff) add('capeOff', 'Unequip', 'danger');
  if (a.equip) add('equip', 'Equip', 'primary');
  if (a.unequip) add('unequip', 'Unequip', 'danger');
  if (a.sell) {
    const why = (card && card.sellWhy) || '';
    add('sell', 'Sell', undefined, { off: !!why, why });
  }
  if (a.drop) {
    const why = (card && card.dropWhy) || '';
    add('drop', 'Drop', undefined, { off: !!why, why, attrs: { 'data-item-drop': why ? 'off' : '' } });
  }
  if (card && card.lockKey) {
    add('lock', itemIsLocked(card.lockKey) ? 'Unpin' : 'Pin', undefined, { attrs: { 'data-item-pin': '' } });
  }
  return out;
}

/* v2.3.2109 (moved from the card): the cape's worn state is the worker's; the
   toggle asks, the echo answers. */
function sendCapeWorn(worn) {
  const S = getState();
  if (!S || !S.channel) return;
  try { S.channel.send({ type: 'cape_equip', payload: { worn } }); } catch (e) { /* socket gone */ }
}

/** Run one of the list's actions on `target`.  `ui`: { close(), sell(),
 *  drop() } -- what the screen running it does to close itself and to open
 *  the card's own Sell and Drop sheets.  `opts.equip` passes through to
 *  equipStashWeapon ({ activate } -- see there). */
export function runItemAction(id, target, card, ui, opts) {
  const close = () => { try { if (ui && ui.close) ui.close(); } catch (e) { /* the screen went */ } };
  if (!target) return;
  switch (id) {
    /* v2.3.853: logs no longer cook directly -- they light a campfire. */
    case 'light': firemakingBus.open(target.key); close(); return;
    case 'eat': eatBus.open(target.key); close(); return;
    /* v2.3.2103: SEND AND WAIT -- the consume, the grant and the echo are all
       the worker's; the opId makes a retry converge instead of redeeming
       twice. */
    case 'open': {
      const S = getState();
      if (!S || !S.channel) return;
      const opId = target.key + ':' + (S.playerId || 'me') + ':' + Date.now();
      try { S.channel.send({ type: 'cape_redeem', payload: { invKey: target.key, opId } }); } catch (e) { /* still in the bag */ }
      close(); return;
    }
    /* v2.3.2820: Claim opens the chest's claim window straight into the claim */
    case 'openChest': chestRevealBus.open(true); close(); return;
    /* v2.3.2127: one bottle per press; the worker validates, applies and
       echoes.  v2.3.3133: an instant heal waits its turn in a fight. */
    case 'drink': {
      const S = getState();
      if (S && isInstantHeal(target.key, dishFor(target.key))) {
        const wait = pvpHealWaitMs(S);
        if (wait > 0) {
          const P = S.player;
          if (P) pushDmgPopup(S, P.x, P.y - 30, pvpHealWaitText(wait), '#B9C1BF');
          cue('denied');   /* v2.3.3462: a refusal is heard */
          close(); return;
        }
        noteInstantHeal(S);
      }
      try { S.channel.send({ type: 'potion_drink', payload: { invKey: target.key } }); } catch (e) { /* no socket */ }
      cue('gulp');   /* v2.3.3462 */
      close(); return;
    }
    case 'capeOn': sendCapeWorn(true); close(); return;
    case 'capeOff': sendCapeWorn(false); close(); return;
    case 'equip': {
      if (target.kind === 'stashShield') equipStashShield(target.shield);
      else if (target.kind === 'stashArmor') equipArmorFromStash(target.armor);
      else if (target.kind === 'stashLegs') equipLegsFromStash(target.armor);
      else if (target.kind === 'stashGear') equipStashGear(target.gear);
      else if (target.kind === 'stashWeapon') equipStashWeapon(target.wpn, target.index, opts && opts.equip);
      close(); return;
    }
    case 'unequip': {
      if (target.kind === 'shield') unequipShieldDirect();
      else if (target.kind === 'armor') unequipArmorDirect();
      else if (target.kind === 'gear') unequipGearDirect(target.slot);
      else unequipWeaponSlot(target.slot);
      close(); return;
    }
    case 'sell': if (ui && ui.sell) ui.sell(); return;
    case 'drop': if (ui && ui.drop) ui.drop(); return;
    case 'lock': {
      const lk = card && card.lockKey;
      if (!lk) return;
      if (itemIsLocked(lk)) unlockItem(lk); else lockItem(lk);
      return;
    }
    default: return;
  }
}
