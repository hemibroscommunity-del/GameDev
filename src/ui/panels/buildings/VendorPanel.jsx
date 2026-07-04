import React from 'react';
import { BT_AUDIO } from '@/data/index.js';
import { _objectSpread } from '@/lib/babelHelpers.js';

/* === VendorPanel — buildingPanel === 'shop' sub-panel === */
/* v2.3.882: extracted verbatim from the buildingPanel === 'shop'
   clause in BroTown.jsx (the in-building Vendor view: basic supplies
   for starting adventurers). Named VendorPanel to avoid colliding with
   the separate town-shop modal ShopPanel (panels/ShopPanel.jsx, the
   showShop overlay). Behavior-frozen UI decomposition; the gate stays
   in BroTown. 3 props (rpgState, stateRef, setRpgState). BT_AUDIO
   verified real export; the _objectSpread babel helper imported; no
   hoisted temps. This is the last buildingPanel sub-panel. */
export function VendorPanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    setRpgState = props.setRpgState;
  return React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#3dd497',
      marginBottom: 4
    }
  }, "\uD83D\uDED2 Vendor"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 4
    }
  }, "\uD83D\uDCB0 ", rpgState.coins, " gold \xB7 Basic supplies for starting adventurers."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.25)',
      marginBottom: 8
    }
  }, "For healing, cook fish at the Kitchen! For buffs, cook herb recipes."), [{
    id: 'cookedMinnow',
    name: 'Cooked Minnow',
    icon: '🐟',
    cost: 8,
    desc: 'Heals 23 HP (pre-cooked)',
    effect: 'healFish',
    power: 23
  }, {
    id: 'basicTrap',
    name: 'Basic Trap',
    icon: '🪤',
    cost: 20,
    desc: 'Capture weakened monsters',
    effect: 'trap'
  }, {
    id: 'staminaSalts',
    name: 'Stamina Salts',
    icon: '⚡',
    cost: 12,
    desc: 'Restore 60 Stamina',
    effect: 'stamina'
  }, {
    id: 'manaShard',
    name: 'Mana Shard',
    icon: '💠',
    cost: 18,
    desc: 'Restore 40 Mana',
    effect: 'mana'
  }, {
    id: 'whetstone',
    name: 'Whetstone',
    icon: '🪨',
    cost: 35,
    desc: '+15% damage for 60s',
    effect: 'dmgBuff'
  }].map(function (item) {
    return /*#__PURE__*/React.createElement("div", {
      key: item.id,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
        padding: '6px 8px',
        borderRadius: 8,
        background: 'rgba(255,255,255,.04)',
        border: '1px solid rgba(255,255,255,.08)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 20
      }
    }, item.icon), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: '#fff'
      }
    }, item.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.4)'
      }
    }, item.desc)), /*#__PURE__*/React.createElement("button", {
      style: {
        padding: '4px 10px',
        borderRadius: 6,
        border: 'none',
        fontSize: 9,
        fontWeight: 700,
        background: rpgState.coins >= item.cost ? '#3dd497' : 'rgba(255,255,255,.1)',
        color: rpgState.coins >= item.cost ? '#000' : 'rgba(255,255,255,.3)',
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        var S = stateRef.current;
        /* v2.3.1155: the §2.6 Influence discount retired with the stat
           (always 0 for live players since v2.3.910) — server mirror
           deleted in lockstep. */
        var finalCost = Math.max(1, Math.floor(item.cost));
        if (R.coins < finalCost) return;
        /* Server-authoritative shop in MP: worker mirrors the 5-item
           table, validates coins, applies effect
           (pool restore / inventory grant), emits player_state.  Local
           mutation stays as snappy visual prediction; server's view
           overwrites on the next player_state. */
        R.coins -= finalCost;
        if (!R._questFlags) R._questFlags = {};
        R._questFlags.boughtItem = true;
        if (item.effect === 'healFish') R.hp = Math.min(R.maxHp, R.hp + (item.power || 23));
        if (item.effect === 'mana') R.mana = Math.min(R.maxMana, (R.mana || 0) + 40);
        if (item.effect === 'stamina') R.stamina = Math.min(R.maxStamina, (R.stamina || 0) + 60);
        if (item.effect === 'cleanse') {/* clear all statuses */}
        if (item.effect === 'trap') {
          if (!R.inventory) R.inventory = {};
          R.inventory.basic_trap = (R.inventory.basic_trap || 0) + 1;
        }
        if (S._serverMonsters && S.channel) {
          try { S.channel.send({ type: 'shop_purchase', payload: { itemId: item.id } }); } catch (e) {}
        }
        if (item.effect === 'dmgBuff') {
          stateRef.current._dmgBuff = Date.now() + 60000;
        }
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
        BT_AUDIO.collect();
        stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 30,
          text: item.icon + ' Used!',
          color: '#3dd497',
          ts: Date.now()
        });
      }
    }, item.cost, "g"));
  }));
}
