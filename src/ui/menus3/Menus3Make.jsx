/* ═══ v2.3.6872: THE COUNTER'S MAKE -- THE BLACKSMITH (card MN step 13) ═══
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
  AMULET_TIERS, BLACKSMITH_TIERS, LIFE_SKILL_XP, NUGGETS_PER_BAR, SMELT_RECIPES, smeltRecipe, WEAPON_STASH_MAX,
  gemExtractCost, ARMOR_FORGE_RECIPES, getArmorPieceDr, armorDefReq,
} from '@/data/index.js';
import { armorIconFor } from '@/rendering/gearVariants.js';
import { BAR_THUMBS, thumbFor } from '@/ui/mobile/dash/InventoryPanel.jsx';
import { pushDmgPopup } from '@/game/combatHelpers.js';
import { cue } from '@/game/eventSounds.js';
import { celebrateLifeSkillLevel } from '@/game/levelCelebration.js';
import { startSmithing, SMITH_STRIKE_MS } from '@/game/smithing.js';
import { essenceIcon } from '@/data/salvage.js';
import { isGearOnLevel } from '@/data/oneFormula.js';
import { hardenTierOf, hardenCost, hardenLevelFor } from '@/data/hardenCosts.js';
import { forgeLevelFor, forgeOffered, forgeStatReq } from '@/data/forgeLadder.js';
import { OWNER_ICON } from '@/data/ownerIcons.js';
import { C, COIN, XP, Icon, Cost, Chip, Lock } from '../panels/buildings/BenchParts.jsx';
import { SalvageTab, weaponIcon, TYPE_LABEL } from '../panels/buildings/SmithyPanel.jsx';
import { act } from '@/game/actions.js';
import { SAY as SAY_S } from '@/data/say/smithy.js';
import { SAY } from '@/data/say/menus3Counter.js';
import { say, sayPieces } from '@/game/say.js';
import { frameTap } from '@/ui/mobile/dash/DashHeader.jsx';
import { qtyMax, qtyClamp, qtyTimes } from '@/game/menus3Qty.js';
import { smithTabs, smithTab, makePlan, makeIdle, makeBegin, makeSend, makeRead, makeRefused, makeCut, MAKE_WAIT_MS, SMELT_PER_REQUEST } from '@/game/menus3Counter.js';
import { Menus3Qty } from './Menus3Qty.jsx';
import { Ui2Action } from '../kit/Action.jsx';

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

/* how many a row can make now (0: greyed) */
function rowMax(r) {
  if (!r || r.none || !r.ok) return 0;
  const m = qtyMax(r.costs, r.room == null ? null : r.room);
  return r.multi ? m : Math.min(1, m);
}

/* ── the queue, one for the bench (the page's; the rule's verbs, menus3Counter.js) ── */
function useMakeQueue(S, lvl) {
  const [q, setQ] = React.useState(makeIdle);
  const job = React.useRef(null);
  const timer = React.useRef(0);
  const qRef = React.useRef(q);
  qRef.current = q;
  const lvlSeen = React.useRef(lvl);
  const popup = (text, color) => { try { const P = S.player; if (P) pushDmgPopup(S, P.x, P.y - 34, text, color || C.brass); } catch (e) { /* popup only */ } };
  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = 0; } };
  const sendNext = (cur) => {
    const j = job.current;
    if (!j || !S.channel) { setQ(makeRefused(cur)); return; }
    const r = makeSend(cur, j.row.sig());
    if (r.count == null) { setQ(r.q); return; }
    try { j.row.send(r.count); } catch (e) { setQ(makeRefused(r.q)); return; }
    setQ(r.q);
    startSmithing(S, j.row.workMs(r.count), j.row.kind);
    clear();
    timer.current = setTimeout(() => {
      timer.current = 0;
      const now = qRef.current;
      if (!now.on || !now.waiting) return;
      const jj = job.current;
      if (jj && jj.row.fail) { popup(jj.row.fail, C.bad); cue('forgeFail'); }
      setQ(makeRefused(now));
    }, MAKE_WAIT_MS);
  };
  /* every new reading of the character: has the send in flight landed? */
  React.useEffect(() => {
    const cur = qRef.current;
    const j = job.current;
    if (cur.on && cur.waiting && j) {
      const r = makeRead(cur, j.row.sig());
      if (r.then !== 'wait') {
        clear();
        if (j.row.done) popup(j.row.done);
        /* the anvil's ring, as today: a smelt, the armour and a hardening are heard from their own answers */
        if (j.row.kind !== 'smelt' && j.row.kind !== 'armor' && j.row.kind !== 'harden') cue('forge');
        if (r.then === 'landed') sendNext(r.q); else setQ(r.q);
      }
    }
    if (lvl > lvlSeen.current) {
      /* smelting and the armour celebrate from their own receipts (wsClient); the rest here, as today */
      if (!(j && (j.row.kind === 'smelt' || j.row.kind === 'armor'))) { try { celebrateLifeSkillLevel(S, 'blacksmithing', lvl, lvlSeen.current); } catch (e) { /* visual */ } }
    }
    lvlSeen.current = lvl;
  });
  /* leaving the bench: nothing more is sent (the send in flight is the worker's) */
  React.useEffect(() => () => { clear(); qRef.current = makeCut(qRef.current); }, []);
  const start = (row, n) => {
    if (qRef.current.on || !S.channel) return;
    job.current = { row, n };
    sendNext(makeBegin(makePlan(n, row.per)));
  };
  return { q, start, job };
}

let _tabKept = null;
export function Menus3Make({ R, getS }) {
  const S = getS() || {};
  const Rr = R || {};
  const smith = (Rr.lifeSkills && Rr.lifeSkills.blacksmithing) || { level: 1, xp: 0 };
  const lvl = smith.level || 1;
  const tabs = smithTabs(S._serverCaps, Rr);
  const [want, setWant] = React.useState(() => _tabKept);   /* the tab is remembered for the load, as today's bench remembers its own */
  const tab = smithTab(want, tabs);
  const [pick, setPick] = React.useState(null);
  const [n, setN] = React.useState(1);
  const { q, start, job } = useMakeQueue(S, lvl);
  const rows = ROWS[tab] ? ROWS[tab](S, Rr, lvl) : [];
  const sel = rows.find((r) => r.key === pick) || null;
  const busy = q.on;
  const need = LIFE_SKILL_XP(lvl);
  const pct = Math.max(0, Math.min(1, (smith.xp || 0) / need));
  const go = (t) => { _tabKept = t; setWant(t); setPick(null); setN(1); };
  const max = rowMax(sel);
  const num = sel && sel.multi ? qtyClamp(n, max) : 1;
  const commit = () => { if (sel && max > 0 && !busy) { start(sel, num); setN(1); } };

  /* the queue's line: a run of more than one, said in plain words */
  let line = null;
  const j = job.current;
  const total = j ? j.n : 0;
  if (j && total > 1) {
    if (q.on) line = say(SAY, 'menus3Counter.working', { made: q.made, n: total });
    else if (q.stop === 'done') line = say(SAY, 'menus3Counter.made', { made: q.made, n: total });
    else if (q.stop === 'refused') line = say(SAY, 'menus3Counter.stopped', { fail: j.row.fail || say(SAY_S, 'smithy.forgeFail'), made: q.made, n: total });
  }

  const cur = tab === 'forge' && Rr.weapon && (Rr.weapon.type === 'greatsword' || Rr.weapon.type === 'sword') ? Rr.weapon : null;
  const stashFull = !!Rr.weapon && (Rr.weaponStash || []).length >= WEAPON_STASH_MAX;
  return (
    <div className="m3-page m3-make" data-menus3-make="blacksmith" data-smithy="menus3">
      <div className="m3-make-level">
        <Icon src="/icons/ui/skill-blacksmithing.webp?v=2.3.1224" size={22} />
        <span data-smithy-level={lvl}>{say(SAY_S, 'smithy.level', { lvl })}</span>
        <i className="m3-make-bar"><i style={{ width: `${pct * 100}%` }} /></i>
      </div>
      <div className="m3-rail" role="tablist" aria-label={say(SAY, 'menus3Counter.tabsAria')}>
        {tabs.map((t) => {
          const look = TAB_LOOK[t]();
          return (
            <button key={t} type="button" role="tab" aria-selected={t === tab} className={'u2-raised u2-ctl m3-pill m3-make-tab' + (t === tab ? ' is-selected' : '')}
              data-smithy-tab={t} data-on={t === tab ? '1' : '0'} {...frameTap(() => go(t))}>
              <Icon src={look.icon} size={20} /><span>{look.label}</span>
            </button>
          );
        })}
      </div>
      {line ? <div className="m3-line" data-menus3-make-line={q.on ? 'working' : q.stop} aria-live="polite">{line}</div> : null}
      {tab === 'salvage' ? <SalvageTab S={S} R={Rr} inv={Rr.inventory || {}} /> : (
        <>
          {cur ? (
            <div className="m3-line m3-make-holding">
              <Icon {...weaponIcon(cur.type, cur.gearBase)} size={18} />
              <span>{sayPieces(SAY_S, 'smithy.holding', { name: <b key="name">{cur.name}</b> })}</span>
              {stashFull ? <Lock>{say(SAY_S, 'smithy.weaponBagFull')}</Lock> : null}
            </div>
          ) : null}
          {tab === 'upgrade' && !rows.length ? <div className="m3-line">{say(SAY_S, 'smithy.upgradeEmpty')}</div> : null}
          {rows.map((r) => {
            const m = rowMax(r);
            return (
              <button key={r.key} type="button" className={'u2-raised u2-ctl m3-make-row' + (r.key === pick ? ' is-selected' : '') + (m > 0 ? '' : ' is-dim')}
                aria-pressed={r.key === pick} data-menus3-recipe={tab + ':' + r.key} data-menus3-can={m}
                {...frameTap(() => { setPick(r.key); setN(1); })}>
                <span className="m3-make-art">
                  <Icon src={r.icon} size={36} fallback={r.fallback} />
                  {r.badge ? <i className="m3-make-badge">{r.badge}</i> : null}
                </span>
                <span className="m3-make-words">
                  <span className="m3-make-name">{r.title}</span>
                  <span className="m3-make-chips">
                    {r.lock ? <Lock>{r.lock}</Lock> : null}
                    {r.costs.map((c, i) => <Cost key={i} icon={c.icon} have={c.have} need={c.need} />)}
                    {r.chips}
                  </span>
                </span>
              </button>
            );
          })}
          <div className="m3-foot m3-make-foot" data-menus3-make-foot={sel ? sel.key : ''}>
            {sel ? (
              <>
                <div className="m3-make-order">
                  {qtyTimes(sel.costs, num).map((c, i) => <Cost key={i} icon={c.icon} have={c.have} need={c.need} />)}
                  {!sel.multi && !sel.none ? <span className="m3-why">{say(SAY, 'menus3Counter.one')}</span> : null}
                </div>
                <div className="m3-make-go">
                  {sel.multi ? <Menus3Qty n={num} max={max} off={busy} onChange={setN} /> : null}
                  <Ui2Action intent="commit" style={{ flex: '1 1 auto', minHeight: 44 }} disabled={max <= 0} pending={busy}
                    label={sel.multi ? say(SAY, 'menus3Counter.go', { verb: sel.verb, n: num }) : sel.verb}
                    data-menus3-make-go={tab + ':' + sel.key} onClick={commit} />
                </div>
              </>
            ) : <div className="m3-why">{say(SAY, 'menus3Counter.pick')}</div>}
          </div>
        </>
      )}
    </div>
  );
}
