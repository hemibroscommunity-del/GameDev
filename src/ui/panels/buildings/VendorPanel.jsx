import React from 'react';
import { BT_AUDIO } from '@/data/index.js';
import { _objectSpread } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
/* === VendorPanel — buildingPanel === 'shop' sub-panel === */
/* v2.3.882: extracted verbatim from the buildingPanel === 'shop'
   clause in BroTown.jsx (the in-building Vendor view: basic supplies
   for starting adventurers). Named VendorPanel to avoid colliding with
   the separate town-shop modal ShopPanel (panels/ShopPanel.jsx, the
   showShop overlay). Behavior-frozen UI decomposition; the gate stays
   in BroTown. 3 props (rpgState, stateRef, setRpgState). BT_AUDIO
   verified real export; the _objectSpread babel helper imported; no
   hoisted temps. This is the last buildingPanel sub-panel. */
/* v2.3.1232: Lantern Slate restyle (docs/LANTERN-SLATE-SPEC.md) —
   header strip + building icon, stock as 44px well rows with
   gold-icon price buttons. Style/JSX only; the purchase handler is
   byte-identical (server-authoritative shop_purchase + local
   prediction). LS token block duplicated per building panel to keep
   the decomposed files dependency-free. */
/* v2.3.1235: batch-3 rollout — correction-pass token remap (game.css
   :root). The v2.3.1232 literals were the superseded v2.3.1227
   palette; same roles, approved values. Four depth roles only, so
   wellSoft folds into the well, and the off-token .08/.14 hairlines
   fold into the approved .11 line (.20 borderStrong added for
   secondary buttons). Header strip adopts the #27393F header token. */
var LS = {
  txt1: '#F4F0E7', txt2: '#B6C1BE', txt3: '#8D9B98', dis: '#667875',
  panel: '#1E2E34', strip: '#27393F', raised: '#293B41', well: '#111E23', wellSoft: '#111E23',
  border: 'rgba(229,237,233,.11)', borderStrong: 'rgba(229,237,233,.20)', divider: 'rgba(229,237,233,.11)', wellBorder: 'rgba(229,237,233,.11)',
  brass: '#D8AA58', brassFill: 'rgba(216,170,88,.15)', onBrass: '#172126'
};
/* v2.3.1232: -20 margin counters .bt-inspect-card's 20px padding so the
   panel owns its full surface (header strip flush to the card edge). */
var LS_WRAP = { margin: -20, background: LS.panel, borderRadius: 14, overflow: 'hidden', textAlign: 'left' };
var LS_BODY = { padding: '12px 14px 14px' };
var LS_MOD = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: LS.txt3, margin: '0 0 6px' }; /* v2.3.1235: batch-3 rollout — section headers are 11/700 .14em muted per the locked contract */
function lsHeader(icon, emoji, title, subtitle) {
  return React.createElement("div", {
    style: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 40px 12px 16px', background: LS.strip, borderBottom: '1px solid ' + LS.border }
  }, /* v2.3.1224 pattern: UI Bible icon with emoji fallback */
  React.createElement("img", {
    src: '/icons/ui/bldg-' + icon + '.webp', alt: '', draggable: false,
    style: { width: 26, height: 26, objectFit: 'contain', flexShrink: 0 },
    onError: function onError(e) { e.currentTarget.replaceWith(document.createTextNode(emoji)); }
  }), React.createElement("div", { style: { minWidth: 0 } },
    React.createElement("div", { style: { fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.10em', color: LS.txt1 } }, title),
    subtitle ? React.createElement("div", { style: { fontSize: 11, color: LS.txt3, marginTop: 1 } }, subtitle) : null));
}
function lsGold(amount, size) {
  return React.createElement("span", {
    style: { display: 'inline-flex', alignItems: 'center', gap: 4, color: LS.brass, fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: size || 14 }
  }, React.createElement("img", {
    src: '/icons/popups/gold.webp', alt: '', draggable: false,
    style: { width: 16, height: 16, objectFit: 'contain' },
    onError: function onError(e) { e.currentTarget.replaceWith(document.createTextNode('🪙')); }
  }), amount);
}
export function VendorPanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    setRpgState = props.setRpgState;
  return React.createElement("div", { style: LS_WRAP },
    lsHeader('vendor', '🛒', "Vendor", "Basic supplies for starting adventurers"),
    React.createElement("div", { style: LS_BODY },
      React.createElement("div", {
        style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 }
      }, React.createElement("span", { style: { fontSize: 12, color: LS.txt2 } }, "Your gold"),
      lsGold(rpgState.coins, 16) /* v2.3.1235: batch-3 rollout — key numbers are 16-18/700 tabular */),
      React.createElement("div", { style: { fontSize: 11, color: LS.txt3, marginBottom: 12, lineHeight: 1.5 } },
        "For healing, cook fish at the Kitchen! For buffs, cook herb recipes."),
      React.createElement("div", { style: LS_MOD }, "Stock"),
      [{
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
        var canAfford = rpgState.coins >= item.cost;
        return /*#__PURE__*/React.createElement("div", {
          key: item.id,
          /* v2.3.1235: batch-3 rollout — divided list rows replace the
             per-row well cards (contract: dividers over per-row cards);
             the first row's top hairline doubles as the rule under the
             module header. Item glyphs are game data and stay. */
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 2px',
            minHeight: 44,
            borderTop: '1px solid ' + LS.divider
          }
        }, /*#__PURE__*/React.createElement("span", {
          style: {
            fontSize: 20,
            flexShrink: 0
          }
        }, item.icon), /*#__PURE__*/React.createElement("div", {
          style: {
            flex: 1,
            minWidth: 0
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 13 /* v2.3.1235: batch-3 rollout — body 13, no half-sizes */,
            fontWeight: 600,
            color: LS.txt1
          }
        }, item.name), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 11,
            color: LS.txt3,
            marginTop: 1
          }
        }, item.desc)), /*#__PURE__*/React.createElement("button", {
          /* v2.3.1235: batch-3 rollout — secondary recipe (raised +
             strong hairline, 10px radius — 11 is off the approved set)
             and the 44px hitbox floor (was 36). Unaffordable state
             stays readable: quiet outline + disabled text, and the
             price shown IS the requirement. */
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '8px 12px',
            minHeight: 44,
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            background: canAfford ? LS.raised : 'transparent',
            border: '1px solid ' + (canAfford ? LS.borderStrong : LS.border),
            color: canAfford ? LS.brass : LS.dis,
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
            pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, item.icon + ' Used!', '#59BF91');
          }
        }, /*#__PURE__*/React.createElement("img", {
          src: '/icons/popups/gold.webp',
          alt: '',
          draggable: false,
          style: { width: 16, height: 16, objectFit: 'contain', opacity: canAfford ? 1 : 0.55 /* v2.3.1235: batch-3 rollout — unaffordable rows stay readable, .55 opacity floor */ },
          onError: function onError(e) { e.currentTarget.replaceWith(document.createTextNode('🪙')); }
        }), item.cost));
      })));
}
