import { coinArtFor, COIN_ONE } from '@/game/coinArt.js';   /* v2.3.3734: the owner's coin piles */
import React, { useEffect, useState } from 'react';
import { deskWords } from '@/game/deskWords.js';   /* v2.3.3785: "tap" reads "click" on a computer */
import { bankOn, bankOpen, bankMove, bankBusy, bankSubscribe, bankLastWords, bankAmount, BANK_CHIPS } from '@/game/bank.js';   /* v2.3.3785: the vault */
import { thumbFor, iconFor, ITEM_NAMES } from '@/ui/mobile/dash/InventoryPanel.jsx';   /* v2.3.3785: the bag's own pictures and names */

/* === BankPanel — buildingPanel === 'bank' sub-panel === */
/* v2.3.878: extracted verbatim from the buildingPanel === 'bank'
   clause in BroTown.jsx (the bank / equipped-gear summary view).
   Behavior-frozen UI decomposition; the gate stays in BroTown. 1 prop
   (rpgState) — read-only, no setters or data tables. 3 hoisted
   optional-chaining temps declared locally. */
/* v2.3.1232: Lantern Slate restyle (docs/LANTERN-SLATE-SPEC.md) —
   header strip + building icon, gold in a recessed well, equipment as
   a divided passive list. Style/JSX only; all data reads unchanged.
   The LS token block + header/gold builders are duplicated per
   building panel to keep the decomposed files dependency-free. */
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
/* v2.3.3734: `have` -- a balance (what you have) shows the owner's pile for
   it; without it the amount is a price and shows the one coin */
function lsGold(amount, size, have) {
  return React.createElement("span", {
    style: { display: 'inline-flex', alignItems: 'center', gap: 4, color: LS.brass, fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: size || 14 }
  }, React.createElement("img", {
    src: have != null ? coinArtFor(have) : COIN_ONE, alt: '', draggable: false,
    style: { width: 16, height: 16, objectFit: 'contain' },
    onError: function onError(e) { e.currentTarget.replaceWith(document.createTextNode('🪙')); }
  }), amount);
}
/* v2.3.3785: the window as it was, for a worker without a vault (caps.bank) */
function BankReadOnly(props) {
  var rpgState = props.rpgState;
  var _rpgState$armor, _rpgState$rangedWeapo, _rpgState$weapon;
  /* v2.3.1232: display-only string temps (identical optional chains to
     the pre-restyle inline expressions) so the 'None' state can dim. */
  var meleeName = ((_rpgState$weapon = rpgState.weapon) === null || _rpgState$weapon === void 0 ? void 0 : _rpgState$weapon.name) || 'None';
  var rangedName = ((_rpgState$rangedWeapo = rpgState.rangedWeapon) === null || _rpgState$rangedWeapo === void 0 ? void 0 : _rpgState$rangedWeapo.name) || 'None';
  var armorName = ((_rpgState$armor = rpgState.armor) === null || _rpgState$armor === void 0 ? void 0 : _rpgState$armor.name) || 'None';
  /* v2.3.3785: the worn shield too (lane A's judge pass: the list left it out) */
  var shieldName = (rpgState.shield && rpgState.shield.name) || 'None';
  var gearRow = function gearRow(label, value, isLast) {
    return React.createElement("div", {
      style: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        minHeight: 44, padding: '0 12px',
        borderBottom: isLast ? 'none' : '1px solid ' + LS.divider
      }
    }, React.createElement("span", { style: { fontSize: 12, color: LS.txt3 } }, label),
    React.createElement("span", {
      style: { fontSize: 13 /* v2.3.1235: batch-3 rollout — body 13, no half-sizes */, fontWeight: 600, textAlign: 'right', color: value === 'None' ? LS.dis : LS.txt1 }
    }, value));
  };
  return React.createElement("div", { style: LS_WRAP },
    lsHeader('bank', '🏦', "Bank", "Vault & equipment"),
    React.createElement("div", { style: LS_BODY },
      /* v2.3.1235: state-correction — the old copy claimed gold is "always
         safe", contradicting the actual death rule (monsterCombat.js:
         DEATH_GOLD_PENALTY = 10% of carried coins). Copy now matches code. */
      /* v2.3.3481: the 2026-10-19 UI review -- "The bank protects additional
         items from death scatter" promised storage this window does not have
         (it shows your gold and what you wear, and sends nothing), and
         "Equipped items are always safe" is not true for a red skull a player
         kills in No man's land (nomansland.js _nmlOnDeath, takeWorn). The
         line now says what the window is, with no promise; the death rule
         for gold is the line under the gold. */
      React.createElement("div", { style: { fontSize: 12, color: LS.txt2, marginBottom: 12, lineHeight: 1.5 } },
        "Your gold and what you wear. Nothing can be stored here yet."),
      React.createElement("div", { style: LS_MOD }, "Gold on hand"),
      React.createElement("div", {
        style: {
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          minHeight: 44, padding: '8px 12px', borderRadius: 8,
          background: LS.wellSoft, border: '1px solid ' + LS.wellBorder, marginBottom: 4
        }
      }, React.createElement("span", { style: { fontSize: 13 /* v2.3.1235: batch-3 rollout — body 13, no half-sizes */, color: LS.txt2 } }, "Gold"),
      lsGold(rpgState.coins, 18, rpgState.coins)),
      /* v2.3.2343: the worker owns coins and charges no death penalty, so
         the "10% is lost on death" line promised a loss that never happened
         (the client used to subtract it locally and the echo put it back). */
      /* v2.3.3481: the 2026-10-19 UI review -- true of an ordinary death, not
         of No man's land since v2.3.3316: a death there to a player under its
         rule gives your gold to the killer, and a red skull's death to
         anything takes it too (nomansland.js _nmlOnDeath: ps.coins = 0
         whenever the kill is the rule's or the skull is red). */
      React.createElement("div", { style: { fontSize: 11, color: LS.txt3, marginBottom: 12 } },
        "Kept when you die, unless a player kills you in No man's land or you die with a red skull."),
      React.createElement("div", { style: LS_MOD }, "Equipped"),
      React.createElement("div", {
        style: { borderRadius: 8, background: LS.wellSoft, border: '1px solid ' + LS.wellBorder }
      }, gearRow('Melee', meleeName, false),
      gearRow('Bow' /* v2.3.3481: was 'Ranged' -- the bow slot, named as the Gem Works' Set gems and the hero sheet name it (the 2026-10-19 UI review) */, rangedName, false),
      gearRow('Armor', armorName, false),
      gearRow('Shield', shieldName, true))));
}

/* ═══ v2.3.3785: THE VAULT ═══
   The owner: "Oh yeah make it so you can actually deposit and retrieve items
   and gold from the bank".  Against a worker that keeps vaults (caps.bank,
   server/src/bank.js) the window is the vault: your gold and the vault's, put
   in and taken out by 10, 100, All or a typed amount; "Your bag" (a tap puts
   an item in, a stack asks how many) and "The vault" (a tap takes it out).
   Nothing here moves anything: each tap ASKS the worker (game/bank.js), and
   the bag, the purse and the vault redraw from what it answers.  The
   equipped list of the old window is gone from here: the Character page is
   where what you wear lives, and the window's height is the vault's. */
function itemName(key) {
  if (!key) return '';
  if (ITEM_NAMES[key]) return ITEM_NAMES[key];
  return String(key)
    .replace(/^cooked_fish_/, 'Cooked ').replace(/^burnt_/, 'Burnt ').replace(/^fish_/, '')
    .replace(/^wood_/, '').replace(/^ore_/, '').replace(/^shard_/, '')
    .replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const BTN = {
  minHeight: 34, padding: '0 10px', borderRadius: 8, fontSize: 13, fontWeight: 700,
  border: '1px solid ' + LS.borderStrong, background: LS.raised, color: LS.txt1,
  cursor: 'pointer', touchAction: 'manipulation', whiteSpace: 'nowrap',
};
const BTN_MAIN = { ...BTN, background: LS.brass, color: LS.onBrass, border: '1px solid ' + LS.brass };
const BTN_OFF = { opacity: 0.45, cursor: 'default' };
const INPUT = {
  flex: '1 1 0', minWidth: 52, width: 0, minHeight: 34, padding: '0 8px', borderRadius: 8, boxSizing: 'border-box',
  border: '1px solid ' + LS.wellBorder, background: LS.well, color: LS.txt1,
  fontSize: 13, fontVariantNumeric: 'tabular-nums', touchAction: 'manipulation',
};

function Tile(props) {
  const { ikey, n, sel, onTap, side, dim } = props;
  const thumb = thumbFor(ikey);
  return React.createElement("button", {
    type: 'button', title: itemName(ikey) + ' x' + n,
    "data-bank-tile": side, "data-bank-key": ikey,
    onClick: dim ? undefined : onTap,
    style: {
      position: 'relative', width: '100%', aspectRatio: '1 / 1', padding: 0,
      borderRadius: 7, background: sel ? LS.brassFill : LS.well,
      border: '1px solid ' + (sel ? LS.brass : LS.wellBorder),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: dim ? 'default' : 'pointer', touchAction: 'manipulation', opacity: dim ? 0.4 : 1,
    }
  }, thumb
    ? React.createElement("img", { src: thumb, alt: '', draggable: false, style: { width: '78%', height: '78%', objectFit: 'contain', pointerEvents: 'none' } })
    : React.createElement("span", { style: { fontSize: 20, pointerEvents: 'none' } }, iconFor(ikey)),
  n > 1 ? React.createElement("span", {
    style: { position: 'absolute', right: 2, bottom: 1, fontSize: 11, fontWeight: 700, color: LS.txt1,
      fontVariantNumeric: 'tabular-nums', textShadow: '0 1px 2px #000', pointerEvents: 'none' }
  }, n > 9999 ? Math.floor(n / 1000) + 'k' : n) : null);
}

/* One row of amounts: the chips act at once, the box and its button act on
   what is typed.  `max` is what there is to move. */
function AmountRow(props) {
  const { label, max, act, busy, testid } = props;
  const [typed, setTyped] = useState('');
  const go = (n) => { if (!busy && n >= 1 && n <= max) act(n); };
  const off = (n) => busy || !(n >= 1 && n <= max);
  const typedN = bankAmount(typed, max);
  /* the label over its row, so the chips, the box and OK keep to one line in
     the phone's 360 px window (beside them, OK wrapped onto a line of its own) */
  return React.createElement("div", { "data-bank-row": testid, style: { marginTop: 8 } },
    React.createElement("div", { style: { fontSize: 12, color: LS.txt2, marginBottom: 4 } }, label),
    React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 6 } },
    BANK_CHIPS.map((c) => React.createElement("button", {
      key: c, type: 'button', "data-bank-chip": c, onClick: () => go(c), disabled: off(c),
      style: { ...BTN, ...(off(c) ? BTN_OFF : null) } }, c)),
    React.createElement("button", { type: 'button', "data-bank-chip": 'all', onClick: () => go(max), disabled: off(max),
      style: { ...BTN, ...(off(max) ? BTN_OFF : null) } }, 'All'),
    React.createElement("input", {
      type: 'text', inputMode: 'numeric', pattern: '[0-9]*', placeholder: 'Amount', value: typed,
      "data-bank-typed": testid, "aria-label": label + ' amount',
      onChange: (e) => setTyped(e.target.value.replace(/[^0-9]/g, '').slice(0, 10)),
      onKeyDown: (e) => { if (e.key === 'Enter' && typedN) { go(typedN); setTyped(''); } },
      style: INPUT }),
    React.createElement("button", { type: 'button', "data-bank-go": testid, onClick: () => { go(typedN); setTyped(''); }, disabled: off(typedN),
      style: { ...BTN_MAIN, ...(off(typedN) ? BTN_OFF : null) } }, 'OK')));
}

function BankVault(props) {
  const S = props.stateRef && props.stateRef.current;
  const rpg = props.rpgState || {};
  const [, force] = useState(0);
  const [sel, setSel] = useState(null);   /* { side: 'bag'|'vault', key } */
  useEffect(() => {
    const off = bankSubscribe(() => force((v) => v + 1));
    bankOpen(S);
    const id = setInterval(() => {
      /* a read that failed is asked again every few seconds (server/src/bank.js) */
      const b0 = S && S._bank;
      if (b0 && b0.failed && Date.now() - b0.at > 3000) bankOpen(S);
      force((v) => v + 1);
    }, 500);   /* the busy wait running out, the bag's echo */
    return () => { off(); clearInterval(id); };
  }, []);
  const b = (S && S._bank) || null;
  const busy = bankBusy(S);
  const coins = Math.max(0, Math.floor(Number((S && S.rpg && S.rpg.coins) != null ? S.rpg.coins : rpg.coins) || 0));
  const inv = (S && S.rpg && S.rpg.inventory) || rpg.inventory || {};
  const noBank = new Set(b ? b.noBank : []);
  const bag = Object.keys(inv).filter((k) => (Number(inv[k]) || 0) > 0).map((k) => ({ key: k, n: Math.floor(Number(inv[k])) }));
  const vault = b ? b.items : [];
  const words = b && b.last ? bankLastWords(b.last, itemName) : null;
  const move = (dir, kind, id, n) => bankMove(S, dir, kind, id, n);
  const selN = sel ? (sel.side === 'bag' ? (Math.floor(Number(inv[sel.key])) || 0) : ((vault.find((i) => i.key === sel.key) || {}).n || 0)) : 0;
  const tap = (side, key, n) => {
    if (busy) return;
    if (n === 1) { setSel(null); move(side === 'bag' ? 'in' : 'out', 'item', key, 1); return; }
    setSel(sel && sel.side === side && sel.key === key ? null : { side, key });
  };
  const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(46px, 1fr))', gap: 5 };
  const well = { borderRadius: 8, background: LS.wellSoft, border: '1px solid ' + LS.wellBorder, padding: 8 };
  const closed = b && (!b.on || !b.ok);
  const failed = !!(b && b.failed);
  return React.createElement("div", { style: LS_WRAP, "data-bank-vault": b ? (failed ? 'failed' : closed ? 'closed' : 'open') : 'loading' },
    lsHeader('bank', '🏦', "Bank", "Your vault"),
    React.createElement("div", { style: LS_BODY },
      React.createElement("div", { style: { fontSize: 12, color: LS.txt2, marginBottom: 10, lineHeight: 1.5 } },
        failed ? "The vault could not be opened just now. Trying again… What is in it stays safe."
          : closed ? "The vault is closed for now. What is in it stays safe."
          /* v2.3.3785: what goes in and why, plainly (the orchestrator, for the
             owner: so nobody is surprised that a sword stays in the bag) */
          : deskWords("Safe from death: what is in the vault stays here when you die. Materials, food and gold go in; weapons, armour and tools stay with you. Tap an item to put it in or take it out.")),
      /* ── gold ── */
      React.createElement("div", { style: LS_MOD }, "Gold"),
      React.createElement("div", { style: { ...well, marginBottom: 12 } },
        React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 } },
          React.createElement("span", { style: { fontSize: 13, color: LS.txt2 } }, "On you ", lsGold(coins.toLocaleString('en-US'), 15, coins)),
          React.createElement("span", { "data-bank-gold": b && !failed ? b.gold : '', style: { fontSize: 13, color: LS.txt2 } }, "In the vault ", lsGold(b && !failed ? b.gold.toLocaleString('en-US') : '…', 15, b && !failed ? b.gold : 0))),
        b && !closed ? React.createElement(AmountRow, { label: 'Put in', max: coins, busy, testid: 'gold-in', act: (n) => move('in', 'gold', null, n) }) : null,
        b && !closed ? React.createElement(AmountRow, { label: 'Take out', max: b.gold, busy, testid: 'gold-out', act: (n) => move('out', 'gold', null, n) }) : null),
      /* ── the line for the last move ── */
      words ? React.createElement("div", { "data-bank-last": words.ok ? 'ok' : 'no', style: { fontSize: 12, fontWeight: 600, color: words.ok ? '#7FC9A0' : '#E0A070', margin: '-4px 0 10px' } }, words.text) : null,
      /* ── a stack chosen: how many ── */
      sel && selN > 0 && b && !closed ? React.createElement("div", { "data-bank-pick": sel.side, style: { ...well, marginBottom: 12, border: '1px solid ' + LS.brass } },
        React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: LS.txt1 } },
          itemName(sel.key), React.createElement("span", { style: { color: LS.txt3, fontWeight: 600 } }, '  x' + selN)),
        React.createElement(AmountRow, { label: sel.side === 'bag' ? 'Put in' : 'Take out', max: selN, busy, testid: 'item-' + sel.side,
          act: (n) => { move(sel.side === 'bag' ? 'in' : 'out', 'item', sel.key, n); setSel(null); } })) : null,
      /* ── the vault ── */
      React.createElement("div", { style: LS_MOD }, "The vault ", React.createElement("span", { style: { letterSpacing: 0, textTransform: 'none' } }, b && !failed ? '(' + vault.length + ' of ' + b.slots + ')' : '')),
      React.createElement("div", { style: { ...well, marginBottom: 12 } },
        vault.length ? React.createElement("div", { style: grid }, vault.map((it) => React.createElement(Tile, {
          key: it.key, ikey: it.key, n: it.n, side: 'vault', dim: closed || busy,
          sel: !!(sel && sel.side === 'vault' && sel.key === it.key), onTap: () => tap('vault', it.key, it.n) })))
          : React.createElement("div", { style: { fontSize: 12, color: LS.txt3 } }, b && !failed ? "Nothing in the vault yet." : "Opening the vault…")),
      /* ── your bag ── */
      React.createElement("div", { style: LS_MOD }, "Your bag"),
      React.createElement("div", { style: well },
        bag.length ? React.createElement("div", { style: grid }, bag.map((it) => React.createElement(Tile, {
          key: it.key, ikey: it.key, n: it.n, side: 'bag', dim: closed || busy || noBank.has(it.key),
          sel: !!(sel && sel.side === 'bag' && sel.key === it.key), onTap: () => tap('bag', it.key, it.n) })))
          : React.createElement("div", { style: { fontSize: 12, color: LS.txt3 } }, "Your bag is empty."),
        noBank.size ? React.createElement("div", { style: { fontSize: 11, color: LS.txt3, marginTop: 6 } }, "Tools stay in your bag.") : null)));
}

export function BankPanel(props) {
  const S = props.stateRef && props.stateRef.current;
  return bankOn(S) ? React.createElement(BankVault, props) : React.createElement(BankReadOnly, props);
}
