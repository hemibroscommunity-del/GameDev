/* ═══ v2.3.6872: THE COUNTER'S MAKE -- THE BLACKSMITH (card MN step 13) ═══
 *
 * v2.3.6873 (card MN step 13b): the queue and the body moved to Menus3Bench.jsx, as
 * they were, for the other benches; this file is the Blacksmith's rows.
 *
 * Today's Blacksmith (panels/buildings/SmithyPanel.jsx) in the Counter: its
 * six tabs (Smelt, Forge, Armor, Upgrade, Amulet, Salvage), each shown on the
 * same caps (src/game/menus3Counter.js smithTabs); every recipe, cost, lock,
 * chip and word its rows show (its own pieces, BenchParts.jsx, and its own
 * words, data/say/smithy.js); every request it sends, with the SAME payload.
 *
 * The wireframe's Make, its order of things: the tabs on a rail, the recipes
 * (a tap SELECTS one: the card's Decided 6, no quick-tap), and the foot: the
 * chosen recipe's whole order (each cost times the number), the ONE quantity
 * picker (Menus3Qty.jsx, capped at what the materials allow) and ONE commit.
 * No Undo.  A number over one is the bench's own request sent one after
 * another (the queue, menus3Counter.js): each waits for the character to
 * change, a silence is the bench's own refusal word and stops the rest.  The
 * smelter's request takes a count ("Smelt all" today), so a smelt is that one
 * request, in pieces of the worker's 50.  Hardening, taking a gem out and
 * crafting an amulet are one at a time, as today: a crafted amulet REPLACES
 * the worn one (server amulet.js), so a queue of them would only burn the
 * first.  Salvage is today's tab as it is (its two taps, "Sure?", are its
 * review; nothing in it takes a number).
 *
 * The worker decides every make; the page only asks.  Gold is spent by
 * Forge (each tier's gold), Harden (500 x 2^H), the Amulet's craft and
 * taking a gem out; the rest spend materials only. */
import React from 'react';
import {
  AMULET_TIERS, BLACKSMITH_TIERS, NUGGETS_PER_BAR, SMELT_RECIPES, smeltRecipe, WEAPON_STASH_MAX,
  gemExtractCost, ARMOR_FORGE_RECIPES, getArmorPieceDr, armorDefReq,
} from '@/data/index.js';
import { armorIconFor } from '@/rendering/gearVariants.js';
import { BAR_THUMBS, thumbFor } from '@/ui/mobile/dash/InventoryPanel.jsx';
import { SMITH_STRIKE_MS } from '@/game/smithing.js';
import { essenceIcon } from '@/data/salvage.js';
import { isGearOnLevel } from '@/data/oneFormula.js';
import { hardenTierOf, hardenCost, hardenLevelFor } from '@/data/hardenCosts.js';
import { forgeLevelFor, forgeOffered, forgeStatReq } from '@/data/forgeLadder.js';
import { OWNER_ICON } from '@/data/ownerIcons.js';
import { C, COIN, XP, Icon, Chip, Lock } from '../panels/buildings/BenchParts.jsx';
import { SalvageTab, weaponIcon, TYPE_LABEL } from '../panels/buildings/SmithyPanel.jsx';
import { act } from '@/game/actions.js';
import { SAY as SAY_S } from '@/data/say/smithy.js';
import { say, sayPieces } from '@/game/say.js';
import { smithTabs, SMELT_PER_REQUEST } from '@/game/menus3Counter.js';
import { Menus3Bench } from './Menus3Bench.jsx';   /* v2.3.6873: the one Make's body (card MN step 13b) */

const GOLDBAR = '/icons/ui/cur-goldbar.webp';
const NUGGET = '/icons/ui/cur-nugget.webp';
const GEM = '/icons/ui/cur-gem.webp';
const WTYPE = 'greatsword';
const H_ODDS = [80, 20, 5, 1, 0.5];   /* SmithyPanel's */

/* the tabs' words and pictures, today's (SmithyPanel.jsx `tabs`) */
const TAB_LOOK = {
  smelt: () => ({ label: say(SAY_S, 'smithy.tabSmelt'), icon: BAR_THUMBS.bar_copper }),
  forge: () => ({ label: say(SAY_S, 'smithy.forgeButton'), icon: '/icons/ui/tab-forge.webp?v=2.3.3526' }),   /* today's tab writes the word in place (owner-icons reads it there); the same word from the table */
  armor: () => ({ label: say(SAY_S, 'smithy.tabArmor'), icon: '/icons/items/chest-plate-copper.webp' }),
  upgrade: () => ({ label: say(SAY_S, 'smithy.tabUpgrade'), icon: OWNER_ICON.smithHammer.src }),
  amulet: () => ({ label: say(SAY_S, 'smithy.tabAmulet'), icon: '/icons/items/amulet.webp' }),
  salvage: () => ({ label: say(SAY_S, 'smithy.tabSalvage'), icon: essenceIcon('essence_rare_iron') }),
};

const inv = (S, k) => Math.floor((S && S.rpg && S.rpg.inventory && S.rpg.inventory[k]) || 0);

/* ── the recipes, a tab's rows: each what today's row shows, and the request it sends ──
   A row: { key, icon, fallback, title, badge, costs [{icon, have, need}] (one make),
   room (an extra cap), ok (the locks today's row checks), lock (its words), chips (facts),
   multi (takes a number), per (one request holds), verb, send(count), sig(), kind, workMs(n), done, fail } */
function smeltRows(S, R, lvl) {
  const I = R.inventory || {};
  return Object.keys(SMELT_RECIPES).map((key) => {
    const r = smeltRecipe(key, !!(S._serverCaps && S._serverCaps.onetoone));
    const locked = lvl < r.minLvl;
    return {
      key, icon: BAR_THUMBS[key], title: <>{r.name} <span data-smelt-have={key} style={{ color: '#8D9B98', fontWeight: 700 }}>×{Math.floor(I[key] || 0)}</span></>,
      name: r.name, costs: [{ icon: thumbFor(r.ore), have: Math.floor(I[r.ore] || 0), need: r.oreCost }],
      ok: !locked, lock: locked ? say(SAY_S, 'smithy.needSmithing', { lvl: r.minLvl }) : null,
      chips: [<Chip key="xp" icon={XP} color="#9FD3F0">+{r.xp}</Chip>],
      multi: true, per: SMELT_PER_REQUEST, verb: locked ? say(SAY_S, 'smithy.locked') : say(SAY_S, 'smithy.smeltButton'),
      send: (n) => act('smelt_bar', { barKey: key, count: n }),
      sig: () => String(inv(S, key)), kind: 'smelt', workMs: (n) => SMITH_STRIKE_MS * Math.min(6, 2 + n),
      done: null, fail: say(SAY_S, 'smithy.smeltFail'),
    };
  });
}

function forgeRows(S, R, lvl) {
  const old = !(S._serverCaps && S._serverCaps.forgeladder);
  const keys = Object.keys(BLACKSMITH_TIERS).filter((k) => forgeOffered(k, old));
  let shown = keys.filter((k) => forgeLevelFor(k, old) <= lvl);
  const next = keys.find((k) => forgeLevelFor(k, old) > lvl);
  if (next) shown = shown.concat([next]);
  const stash = (R.weaponStash || []).length;
  const stashFull = !!R.weapon && stash >= WEAPON_STASH_MAX;
  /* the weapon bag's room: the new blade goes in hand, the one held into the bag */
  const room = Math.max(0, WEAPON_STASH_MAX - stash + (R.weapon ? 0 : 1));
  const I = R.inventory || {};
  return shown.map((key) => {
    const bt = BLACKSMITH_TIERS[key];
    const resKey = bt.bar ? bt.bar : bt.wood ? 'wood_' + bt.wood : 'ore_' + bt.oreName + '_ore';
    const resNeed = bt.bar ? bt.bars : bt.oreCost;
    const req = forgeStatReq(WTYPE, key, R, old);
    const meets = req.value === 0 || (req.prog3 ? req.met : (R[req.stat] || 0) >= req.value);
    const needLvl = forgeLevelFor(key, old);
    const skillOk = lvl >= needLvl;
    const ic = weaponIcon(WTYPE, key);
    const name = bt.label + ' ' + TYPE_LABEL[WTYPE];
    const xp = bt.xp || (bt.minLvl || 1) * 5;
    return {
      key, icon: ic.src, fallback: ic.fallback, title: name, name, badge: bt.slots > 1 ? bt.slots + '◆' : null,
      costs: [{ icon: bt.bar ? BAR_THUMBS[bt.bar] : thumbFor(resKey), have: Math.floor(I[resKey] || 0), need: resNeed },
        { icon: COIN, have: R.coins || 0, need: bt.goldCost }],
      room, ok: skillOk && meets && !stashFull,
      lock: !skillOk ? say(SAY_S, 'smithy.needSmithing', { lvl: needLvl }) : !meets ? req.label + ' ' + req.value : null,
      chips: [<span key="xp" data-forge-xp={xp} style={{ display: 'contents' }}><Chip icon={XP} color="#9FD3F0">+{xp}</Chip></span>],
      multi: true, per: 1, verb: say(SAY_S, 'smithy.forgeButton'),
      send: () => act('forge_weapon', { weaponType: WTYPE, tierKey: key, isWoodwork: false }),
      sig: () => { const w = S.rpg && S.rpg.weapon; return w ? w.gearBase + ':' + w.type + ':' + (S.rpg.weaponStash || []).length : ''; },
      kind: 'forge', workMs: () => SMITH_STRIKE_MS * 4,
      done: say(SAY_S, 'smithy.forgedDone', { name }), fail: say(SAY_S, 'smithy.forgeFail'),
    };
  });
}

function armorRows(S, R, lvl) {
  const keys = Object.keys(ARMOR_FORGE_RECIPES);
  const nextLvl = keys.map((k) => ARMOR_FORGE_RECIPES[k].minLvl).filter((m) => m > lvl).sort((a, b) => a - b)[0];
  const shown = keys.filter((k) => ARMOR_FORGE_RECIPES[k].minLvl <= lvl || ARMOR_FORGE_RECIPES[k].minLvl === nextLvl);
  const I = R.inventory || {};
  return shown.map((key) => {
    const r = ARMOR_FORGE_RECIPES[key];
    const locked = lvl < r.minLvl;
    const legs = r.slot === 'legsArmor';
    const piece = { name: r.name, mat: r.mat, slot: r.slot, tierMult: r.tierMult };
    const dr = Math.round(getArmorPieceDr(piece, legs ? 'legs' : 'chest') * 1000) / 10;
    const def = armorDefReq(piece);
    const icon = armorIconFor(legs ? 'legs' : 'chest', r.mat);
    const chips = [<Chip key="dr" icon="/icons/ui/stat-defense.webp" color="#CFE3D8">-{dr}%</Chip>, <Chip key="xp" icon={XP} color="#9FD3F0">+{r.xp}</Chip>];
    if (def > 0) chips.push(<Chip key="def">{isGearOnLevel() ? say(SAY_S, 'smithy.wearLevel', { def }) : say(SAY_S, 'smithy.wearDefense', { def })}</Chip>);
    return {
      key, icon, fallback: icon, title: r.name, name: r.name,
      costs: [{ icon: BAR_THUMBS[r.bar], have: Math.floor(I[r.bar] || 0), need: r.bars }],
      ok: !locked, lock: locked ? say(SAY_S, 'smithy.needSmithing', { lvl: r.minLvl }) : null, chips,
      multi: true, per: 1, verb: locked ? say(SAY_S, 'smithy.locked') : say(SAY_S, 'smithy.forgeButton'),
      send: () => act('forge_armor', { recipe: key }),
      sig: () => String(inv(S, r.bar)), kind: 'armor', workMs: () => SMITH_STRIKE_MS * 4,
      done: null, fail: say(SAY_S, 'smithy.forgeFail'),
    };
  });
}

function upgradeRows(S, R, lvl) {
  const rows = [];
  const w = R.weapon;
  const coins = R.coins || 0;
  if (S._serverCaps && S._serverCaps.harden && w) {
    const h = typeof w.hardness === 'number' ? w.hardness : 0;
    const maxed = h >= 5;
    const hc = hardenCost(w, h, !!(S._serverCaps && S._serverCaps.hardenmats), !!(S._serverCaps && S._serverCaps.hardenedwood), 'weapon');
    const ic = weaponIcon(w.type, w.gearBase);
    const needLvl = (S._serverCaps && S._serverCaps.forgeladder) ? hardenLevelFor(w, 'weapon') : hardenTierOf(w) * 5;
    const skillOk = lvl >= needLvl;
    const costs = [];
    if (!maxed && hc.material) costs.push({ icon: thumbFor(hc.material), have: Math.floor(((R.inventory || {})[hc.material]) || 0), need: hc.amount, mat: hc.material });
    if (!maxed) costs.push({ icon: COIN, have: coins, need: hc.gold });
    const chips = [];
    if (!maxed) chips.push(<Chip key="odds" color={H_ODDS[h] >= 20 ? C.good : '#E5B36A'}>{H_ODDS[h]}%</Chip>);
    if (!maxed && h > 0) chips.push(<Chip key="keep" color={C.mute}>{(S._serverCaps && S._serverCaps.hardenkeep) ? say(SAY_S, 'smithy.hardenFailKeeps', { h }) : say(SAY_S, 'smithy.hardenFailDrops')}</Chip>);
    rows.push({
      key: 'harden', icon: w.type === 'bow' ? '/icons/items/bow.webp' : w.type === 'staff' ? '/icons/items/staff.webp' : ic.src, fallback: ic.fallback,
      badge: say(SAY_S, 'smithy.hardenBadge', { h }), name: w.name,
      title: maxed ? say(SAY_S, 'smithy.hardenMaxTitle', { name: w.name }) : say(SAY_S, 'smithy.hardenStepTitle', { h, next: h + 1 }),
      costs, ok: !maxed && skillOk, lock: !maxed && !skillOk ? say(SAY_S, 'smithy.needSmithing', { lvl: needLvl }) : null, chips,
      none: maxed, multi: false, per: 1, verb: say(SAY_S, 'smithy.hardenButton'),
      send: () => act('harden_weapon', { slot: 'weapon' }),
      /* harden_result (gameEvents) says win or lose; this only ends the wait */
      sig: () => { const x = S.rpg && S.rpg.weapon; return x ? String(x.hardness || 0) + ':' + (x.temper || 0) + ':' + (S.rpg.coins || 0) + ':' + (hc.material ? ((S.rpg.inventory || {})[hc.material] || 0) : '') : ''; },
      kind: 'harden', workMs: () => SMITH_STRIKE_MS * 3, done: null, fail: null,
    });
  }
  if (S._serverCaps && S._serverCaps.gemExtract) {
    const gemOf = (item, slot) => (slot === 'weapon' ? !!(item && (item.element1 || item.element2)) : !!(item && item.gem));
    const slots = [
      { slot: 'weapon', item: R.weapon, icon: R.weapon ? weaponIcon(R.weapon.type, R.weapon.gearBase) : null },
      { slot: 'amulet', item: R.amulet, icon: { src: '/icons/items/amulet.webp' } },
      { slot: 'shield', item: R.shield, icon: { src: '/icons/items/shield.webp' } },
    ];
    for (const s of slots) {
      if (!gemOf(s.item, s.slot)) continue;
      const title = say(SAY_S, 'smithy.extractTitle', { name: s.item.name || s.slot });
      rows.push({
        key: 'extract-' + s.slot, icon: (s.icon && s.icon.src) || GEM, fallback: s.icon && s.icon.fallback, badge: '◆', title, name: title,
        costs: [{ icon: COIN, have: coins, need: gemExtractCost(s.item) }], ok: true, lock: null, chips: [],
        multi: false, per: 1, verb: say(SAY_S, 'smithy.extractButton'),
        send: () => act('amulet_forge_request', { op: 'extract', target: s.slot }),
        sig: () => JSON.stringify([S.rpg && S.rpg[s.slot] && (S.rpg[s.slot].gem || S.rpg[s.slot].element1 || S.rpg[s.slot].element2), S.rpg && S.rpg.coins]),
        kind: 'extract', workMs: () => SMITH_STRIKE_MS * 2, done: say(SAY_S, 'smithy.extractDone'), fail: say(SAY_S, 'smithy.extractFail'),
      });
    }
  }
  return rows;
}

function amuletRows(S, R, lvl) {
  const nug = R.goldNuggets || 0;
  const bars = R.goldBars || 0;
  const coins = R.coins || 0;
  const rows = [{
    key: 'goldbar', icon: GOLDBAR, title: <>{say(SAY_S, 'smithy.goldBar')} <span style={{ color: '#8D9B98', fontWeight: 700 }}>×{bars}</span></>, name: say(SAY_S, 'smithy.goldBar'),
    costs: [{ icon: NUGGET, have: nug, need: NUGGETS_PER_BAR }], ok: true, lock: null, chips: [],
    multi: true, per: 1, verb: say(SAY_S, 'smithy.smeltButton'),
    send: () => act('amulet_forge_request', { op: 'smelt' }),
    sig: () => String((S.rpg && S.rpg.goldBars) || 0), kind: 'smelt', workMs: () => SMITH_STRIKE_MS * 2,
    done: say(SAY_S, 'smithy.goldBarDone'), fail: say(SAY_S, 'smithy.smeltFail'),
  }];
  for (const key of Object.keys(AMULET_TIERS)) {
    const at = AMULET_TIERS[key];
    const skillOk = lvl >= at.minLvl;
    const worn = R.amulet && R.amulet.tier === key;
    rows.push({
      key, icon: '/icons/items/amulet.webp', name: at.label,
      title: say(SAY_S, 'smithy.amuletTitle', { tier: at.label, worn: worn ? say(SAY_S, 'smithy.amuletWornTail') : '' }),
      costs: [{ icon: GOLDBAR, have: bars, need: at.bars }, { icon: COIN, have: coins, need: at.goldCost }],
      ok: skillOk, lock: skillOk ? null : say(SAY_S, 'smithy.needSmithing', { lvl: at.minLvl }), chips: [],
      multi: false, per: 1, verb: say(SAY_S, 'smithy.craftButton'),
      send: () => act('amulet_forge_request', { op: 'craft', tierKey: key }),
      sig: () => JSON.stringify([S.rpg && S.rpg.amulet && S.rpg.amulet.tier, S.rpg && S.rpg.goldBars]),
      kind: 'amulet', workMs: () => SMITH_STRIKE_MS * 4,
      done: say(SAY_S, 'smithy.amuletDone', { tier: at.label }), fail: say(SAY_S, 'smithy.amuletFail'),
    });
  }
  return rows;
}

const ROWS = { smelt: smeltRows, forge: forgeRows, armor: armorRows, upgrade: upgradeRows, amulet: amuletRows };

/* v2.3.6873 (card MN step 13b): the Blacksmith as a bench of the one Make (Menus3Bench.jsx):
   its queue and its rows' look moved there as they were */
const BLACKSMITH = Object.freeze({
  id: 'blacksmith',
  skill: 'blacksmithing',
  skillIcon: '/icons/ui/skill-blacksmithing.webp?v=2.3.1224',
  level: (lvl) => say(SAY_S, 'smithy.level', { lvl }),
  levelProps: (lvl) => ({ 'data-smithy-level': lvl }),
  rootProps: { 'data-smithy': 'menus3' },
  tabProp: 'data-smithy-tab',
  railAlways: true,
  tabs: (S, R) => smithTabs(S._serverCaps, R),
  look: (t) => TAB_LOOK[t](),
  rows: (tab, S, R, lvl) => (ROWS[tab] ? ROWS[tab](S, R, lvl) : []),
  /* Salvage is today's tab as it is */
  body: (tab, S, R) => (tab === 'salvage' ? <SalvageTab S={S} R={R} inv={R.inventory || {}} /> : null),
  above: (tab, S, R, rows) => {
    const cur = tab === 'forge' && R.weapon && (R.weapon.type === 'greatsword' || R.weapon.type === 'sword') ? R.weapon : null;
    const stashFull = !!R.weapon && (R.weaponStash || []).length >= WEAPON_STASH_MAX;
    return (
      <>
        {cur ? (
          <div className="m3-line m3-make-holding">
            <Icon {...weaponIcon(cur.type, cur.gearBase)} size={18} />
            <span>{sayPieces(SAY_S, 'smithy.holding', { name: <b key="name">{cur.name}</b> })}</span>
            {stashFull ? <Lock>{say(SAY_S, 'smithy.weaponBagFull')}</Lock> : null}
          </div>
        ) : null}
        {tab === 'upgrade' && !rows.length ? <div className="m3-line">{say(SAY_S, 'smithy.upgradeEmpty')}</div> : null}
      </>
    );
  },
  /* smelting and the armour celebrate from their own receipts (wsClient); the rest here, as today */
  celebrates: (row) => row.kind !== 'smelt' && row.kind !== 'armor',
  /* the anvil's ring, as today: a smelt, the armour and a hardening are heard from their own answers */
  ring: (row) => (row.kind !== 'smelt' && row.kind !== 'armor' && row.kind !== 'harden' ? 'forge' : null),
  fail: say(SAY_S, 'smithy.forgeFail'),
});

export function Menus3Make({ R, getS }) {
  return <Menus3Bench R={R} getS={getS} bench={BLACKSMITH} />;
}
