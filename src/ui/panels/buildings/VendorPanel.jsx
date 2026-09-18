import React from 'react';
import { storeEnabled } from '@/ui/storeApi.js';   /* v2.3.2476 */
/* v2.3.2618: BT_AUDIO, _objectSpread and pushDmgPopup went with the
   shopkeeper's shelf -- they were the purchase handler's, and nothing else
   in this panel used them. */
/* === VendorPanel — buildingPanel === 'auctionhouse' sub-panel === */
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
/* ═══ v2.3.2627: THE ROOM YOU WALKED INTO ═══
 *
 * Owner's auction-house interior painting, with a clerk behind the counter.
 *
 * WHY IT IS NOT THE GENERAL STORE.  v2.3.2624 put the owner's GENERAL STORE
 * interior here, and then the building stopped being a general store: #686
 * renamed it to the Auction House (worldProps.js, new exterior art and a new
 * position on the plaza) and #678 took the shopkeeper's stock list out of
 * this panel entirely -- the potions moved to Shopkeeper Bro, who walks the
 * plaza.  A shopkeeper minding a shelf that is no longer here, in a room that
 * is not the building you just walked into, is worse than no room at all, so
 * the painting was swapped rather than the header re-worded.  The old
 * general-store art is NOT kept unused: nothing references it, and a 1.4 MB
 * orphan on the preload gate is the kind of thing nobody deletes later.
 *
 * WHERE "INDOORS" IS.  BroTown has no walk-in interior: enterBuilding()
 * (game/interactions.js) opens a panel, and the AUCTION HOUSE prop's
 * `action: 'auctionhouse'` (worldProps.js) opens THIS one.  So this panel IS
 * the inside of the building, and until now it was a list on a flat slate.
 * The art goes at the top of it, above the Market button, which is where you
 * would be standing.
 *
 * EVERY NUMBER BELOW WAS MEASURED, none eyeballed (tools/qa/art/
 * measure-auction-interior.mjs prints them, and TRAPS §80 is about exactly
 * the kind of "looks about right" that does not survive a second screen):
 *
 *   room PNG      1288x773, fully opaque -- no alpha margin, so the bbox IS
 *                 the canvas.  It ships PRE-CROPPED: the owner's 1448x1086
 *                 raw runs on down to the floorboards and the rug, 20% of
 *                 its height that this panel never shows, and those rows
 *                 would have cost ~300 KB on the loading-screen gate for
 *                 pixels behind the Market button.
 *   keeper strip  2172x724 = SIX 362x724 frames; frame art occupies
 *                 y200..580, so the figure is cropped at the forearms
 *
 * THE CROP IS THE POINT.  The strip is cut off at his forearms, so he cannot
 * be composited *between* the back wall and the counter -- the room is one
 * flat painting, there is no layer to slide him into.  He is drawn ON TOP
 * with that cut landing on the counter's top surface, which reads as a man
 * leaning on it.  Drawn behind the painting he is simply invisible; that was
 * the first attempt on the old room and the preview showed an empty shop.
 *
 * WHERE HE STANDS, AND WHY THERE.  12% of the room's width, centred at 37%,
 * forearms on 77% -- the row the counter's top surface runs along.  This room
 * is a fully dressed composition, unlike the general store's, so the question
 * was whether a figure fits at all rather than how big to draw him; four
 * placements were rendered and looked at:
 *   cx 45%  he leans over the open ledger and buries its left page
 *   cx 40%  the lantern sits directly behind his head and pokes out of his hair
 *   cx 27%  he is cramped into the window bay and covers the quill and crown
 *   cx 37%  THIS ONE -- between the inkwell and the ledger, lantern clear
 *           beside his head, ledger and gavel both readable to his right
 * At 18% wide he swallows the shelf behind him and reads as a giant against
 * the counter; 12% keeps him in proportion to it.
 *
 * The geometry is expressed in ROOM PX and converted to percentages here, so
 * the scene scales with the panel and cannot drift between phone widths:
 * measured at 320/360/390/430 the box shows the identical slice.
 */
var ROOM_SRC = '/sprites/props/auction-house-interior.png';
var KEEPER_SRC = '/sprites/npc/storekeeper-bro-idle.png';
var RM = { imgW: 1288, x0: 0, y0: 0, w: 1288, h: 773 };   /* opaque: bbox = canvas */
var SCENE_H = 773;                                         /* rows of RM.h shown */
var KF = { cell: 362, cellH: 724, x0: 18, y0: 200, x1: 361, y1: 580 }; /* frame 0 art */
/* The three placement numbers, as fractions of the room's own box. See
   "WHERE HE STANDS" above for the three placements that were rejected. */
var KEEP_W = 0.12;    /* painted width */
var KEEP_CX = 0.37;   /* centre of that width */
var KEEP_BASE = 0.77; /* the row his forearms rest on: the counter's top
                         surface, read off the 5%% ruler the measure tool
                         draws rather than guessed at. */
var KEEP = (function () {
  var cw = KF.x1 - KF.x0 + 1;                 /* 344 painted px across */
  var scale = (KEEP_W * RM.w) / cw;
  return {
    w: KF.cell * scale,                        /* the whole CELL, art is inset */
    h: KF.cellH * scale,
    left: KEEP_CX * RM.w - (KF.x0 + cw / 2) * scale,
    top: KEEP_BASE * RM.h - (KF.y1 + 1) * scale,
  };
})();
var pc = function pc(v, of) { return (v / of * 100).toFixed(4) + '%'; };

function roomScene() {
  return React.createElement("div", {
    style: {
      position: 'relative', width: '100%', aspectRatio: RM.w + ' / ' + SCENE_H,
      overflow: 'hidden', background: LS.panel,
      borderBottom: '1px solid ' + LS.border,
    }
  },
    React.createElement("img", {
      src: ROOM_SRC, alt: '', draggable: false,
      style: {
        position: 'absolute', width: pc(RM.imgW, RM.w), height: 'auto',
        left: pc(-RM.x0, RM.w), top: pc(-RM.y0, SCENE_H),
      },
      /* The room failing to load must not leave a tall empty slab above the
         goods: the scene collapses and the panel reads as it did before. */
      onError: function onError(e) {
        var box = e.currentTarget.parentNode;
        if (box && box.style) box.style.display = 'none';
      }
    }),
    React.createElement("div", {
      className: 'bt-auction-keeper',
      style: {
        position: 'absolute',
        width: pc(KEEP.w, RM.w), height: pc(KEEP.h, SCENE_H),
        left: pc(KEEP.left, RM.w), top: pc(KEEP.top, SCENE_H),
        backgroundImage: 'url(' + KEEPER_SRC + ')',
        backgroundSize: '600% 100%',      /* six frames across */
        backgroundPosition: '0% 0%',
        backgroundRepeat: 'no-repeat',
        pointerEvents: 'none',
      }
    }));
}

export function VendorPanel(props) {
  var rpgState = props.rpgState,
    setBuildingPanel = props.setBuildingPanel;
  /* ═══ v2.3.2618: MARKET IS THE ONLY BUTTON ═══
     Owner: "This is only going to be a player marketplace so make that the
     only button."

     What came out is the SHOPKEEPER'S SHELF -- the five-row Stock list with
     its gold price buttons, and the `shop_purchase` handler behind it.  What
     did NOT come out is the shop DATA: SHOP_ITEMS (server/src/data.js) stays
     exactly as it is, because it is load-bearing twice over --
       1. the BAG's potion filter is keyed off it (POTION_KEYS ->
          POTION_THUMBS, src/ui/mobile/dash/InventoryPanel.jsx, via
          server/src/store.js), so deleting the table empties that filter;
       2. `shopStaples()` (server/src/shop.js) maps over EVERY key of it, so
          the table IS Shopkeeper Bro's permanent shelf.

     That second one is why nothing is lost by removing this list. Bro sells
     all five of these at the SAME prices (`sell: st.cost`), server-side and
     for real -- whereas this panel's own v2.3.2062 note records that its
     purchases were a local illusion for months, because the gate it used
     (`_serverMonsters`) is false in town, which is where this door is. The
     better of the two shopkeeper surfaces is the one that survives.

     The mirror-audit suite extracts SHOP_ITEMS against this file's path
     (server/src/data.js's header, v2.3.1151). The table is still here, still
     at that path, just no longer rendered -- see SHOP_STOCK below. */
  var storeOn = storeEnabled();
  return React.createElement("div", { style: LS_WRAP },
    lsHeader('auctionhouse', '⚖', "Auction House", "Buy and sell with players"),
    roomScene(),    /* v2.3.2627: the room, and the clerk behind the counter */
    React.createElement("div", { style: LS_BODY },
      React.createElement("div", {
        style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }
      }, React.createElement("span", { style: { fontSize: 12, color: LS.txt2 } }, "Your gold"),
      lsGold(rpgState.coins, 16)),
      /* The one tile, in the mockup's own words. Gated on the store cap and
         read through storeEnabled() so it cannot appear against a worker
         with no store to open -- if that ever happens the panel says so
         rather than offering a button that leads nowhere. */
      storeOn && setBuildingPanel ? React.createElement("button", {
        type: 'button',
        onClick: function onClick() { setBuildingPanel('store'); },
        style: {
          width: '100%', minHeight: 72, padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 12,
          borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          border: '1px solid ' + LS.brass, background: LS.brassFill,
          WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation'
        }
      }, React.createElement("img", {
        src: '/icons/ui/bldg-exchange.webp', alt: '', draggable: false,
        style: { width: 34, height: 34, objectFit: 'contain', flexShrink: 0 },
        onError: function onError(e) { e.currentTarget.style.display = 'none'; }
      }), React.createElement("span", { style: { minWidth: 0 } },
        React.createElement("span", {
          style: { display: 'block', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: LS.brass }
        }, "Market"),
        React.createElement("span", {
          style: { display: 'block', fontSize: 11, color: LS.txt2, marginTop: 2 }
        }, "Buy, sell, and bid with players"))
      ) : React.createElement("div", {
        style: { fontSize: 12, color: LS.txt2, lineHeight: 1.5 }
      }, "The market is not open on this world yet. It arrives with the next server update."),
      React.createElement("div", {
        style: { fontSize: 11, color: LS.txt3, marginTop: 12, lineHeight: 1.5 }
      }, "Potions and supplies are on Shopkeeper Bro's shelf, out in the plaza.")));
}

/* ═══ v2.3.2618: THE SHELF THAT USED TO BE DRAWN HERE ═══
 * Kept as data, not as UI, for the mirror-audit suite and for whoever wants
 * the building shop back: test/mirror-audit.test.mjs extracts SHOP_ITEMS
 * against THIS path (server/src/data.js header, v2.3.1151), and these are the
 * labels/art/copy that went with each id. The prices and effects themselves
 * live server-side in SHOP_ITEMS and are unchanged; Shopkeeper Bro renders
 * them from there. Nothing imports this -- it is a record, deliberately. */
export const SHOP_STOCK = [
  { id: 'cookedMinnow', name: 'Cooked Minnow', icon: '\uD83D\uDC1F', cost: 8, desc: 'Heals 23 HP (pre-cooked)', effect: 'healFish', power: 23 },
  { id: 'staminaSalts', art: '/icons/items/potion-stamina.webp', name: 'Stamina Salts', icon: '\u26A1', cost: 12, desc: 'Restore 60 Stamina', effect: 'stamina' },
  { id: 'manaShard', art: '/icons/items/potion-mana.webp', name: 'Mana Draught', icon: '\uD83D\uDCA0', cost: 30, desc: 'Cast specials nonstop for 3 min', effect: 'manaSurge' },
  { id: 'swiftDraught', art: '/icons/items/potion-antidote.webp', name: 'Swift Draught', icon: '\uD83C\uDF3F', cost: 30, desc: '1.5x run speed for 3 min', effect: 'spdBuff' },
  { id: 'whetstone', art: '/icons/items/potion-fury.webp', name: 'Fury Tonic', icon: '\uD83E\uDDEA', cost: 35, desc: 'Double damage for 3 min', effect: 'dmgBuff' },
];
