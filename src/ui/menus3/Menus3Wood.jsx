/* ═══ v2.3.6873: THE COUNTER'S MAKE -- THE WOODWORKER (card MN step 13b) ═══
 *
 * Today's Woodworker (panels/buildings/WoodworkPanel.jsx, with its two tabs
 * HardenedWoodTab.jsx and TrapsTab.jsx) as a bench of the one Make
 * (Menus3Bench.jsx): its five tabs on the same caps (src/game/menus3Counter.js
 * woodTabs), every recipe, cost, lock, chip and word its rows show (its own
 * pieces, BenchParts.jsx, and its own words, data/say/woodwork.js), every
 * request it sends with the SAME payload.
 *
 *   Bow, Staff   forge_weapon { weaponType, tierKey, isWoodwork: true }, one a
 *                make (the weapon in hand goes into the weapon bag: the bag's
 *                room caps the number, as the Blacksmith's Forge);
 *   Hardened     make_hardened_wood { key, count }: today's own count (its
 *                "All"), sent in pieces of the worker's 50;
 *   Upgrade      harden_weapon { slot }: one at a time, as today (a roll);
 *   Traps        make_traps { log, count }: today's count (its x10 and "All"),
 *                in pieces of the worker's 50.
 *
 * Gold is spent by a bow or a staff (each wood's gold) and a hardening; the
 * hardened wood and the traps take logs only.  The hardened wood and the
 * traps celebrate a level and speak from their own receipts (wsClient
 * hardened_wood_result, game/trapping.js), a hardening from harden_result;
 * a bow or a staff here, as today (its "Made Pine Bow!", the woodworker's
 * sound, and the flag a dormant chain reads). */
import React from 'react';
import { WEAPON_STASH_MAX, WOODWORKING_TIERS, getGearStatReq, getEquipReqLabel, STAT_LABELS } from '@/data/index.js';
import { HARDENED_WOOD_RECIPES, HARDENED_WOOD_MAX_PER_REQUEST, hardenedWoodRecipe } from '@/data/hardenedWood.js';
import { TRAPPING } from '@/data/trapping.js';
import { thumbFor } from '@/ui/mobile/dash/InventoryPanel.jsx';
import { hardenCost, hardenIsWood, hardenTierOf, hardenLevelFor } from '@/data/hardenCosts.js';
import { weaponDisplayName } from '@/ui/mobile/sheet/equipModel.js';
import { TRAP_ICON_URL } from '@/rendering/controlsPreload.js';
import { OWNER_ICON } from '@/data/ownerIcons.js';
import { SMITH_STRIKE_MS } from '@/game/smithing.js';
import { C, COIN, XP, Icon, Chip, Lock } from '../panels/buildings/BenchParts.jsx';
import { NAMES as TRAP_LOG_NAMES } from '../panels/buildings/TrapsTab.jsx';
import { act } from '@/game/actions.js';
import { SAY as SAY_W } from '@/data/say/woodwork.js';
import { SAY } from '@/data/say/menus3Counter.js';
import { say, sayPieces } from '@/game/say.js';
import { woodTabs } from '@/game/menus3Counter.js';
import { Menus3Bench } from './Menus3Bench.jsx';

const BOW_ICON = '/icons/items/bow.webp';
const STAFF_ICON = '/icons/items/staff.webp';
const TYPE_WORD = { bow: say(SAY_W, 'woodwork.bow'), staff: say(SAY_W, 'woodwork.staff') };
const SLOT_OF = { bow: 'rangedWeapon', staff: 'staffWeapon' };
const H_ODDS = [80, 20, 5, 1, 0.5];   /* WoodworkPanel's */

/* the tabs' words and pictures, today's (WoodworkPanel.jsx `tabs`) */
const TAB_LOOK = {
  bow: () => ({ label: say(SAY_W, 'woodwork.tabBow'), icon: BOW_ICON }),
  staff: () => ({ label: say(SAY_W, 'woodwork.tabStaff'), icon: STAFF_ICON }),
  hardwood: () => ({ label: say(SAY_W, 'woodwork.tabHardened'), icon: thumbFor('hardened_pine') }),
  upgrade: () => ({ label: say(SAY_W, 'woodwork.tabUpgrade'), icon: OWNER_ICON.smithHammer.src }),
  traps: () => ({ label: say(SAY_W, 'woodwork.tabTraps'), icon: TRAP_ICON_URL }),
};

const inv = (S, k) => Math.floor(Number(S && S.rpg && S.rpg.inventory && S.rpg.inventory[k]) || 0);

/* ── Bow / Staff: every wood you can work now, plus the NEXT one, the goal (today's CraftTab) ── */
function craftRows(S, R, lvl, type) {
  const tg = !!(S._serverCaps && S._serverCaps.tourgear);
  const keys = Object.keys(WOODWORKING_TIERS);
  let shown = keys.filter((k) => WOODWORKING_TIERS[k].minLvl <= lvl);
  const next = keys.find((k) => WOODWORKING_TIERS[k].minLvl > lvl);
  if (next) shown = shown.concat([next]);
  const slot = SLOT_OF[type];
  const cur = R[slot] || null;
  const stash = (R.weaponStash || []).length;
  const stashFull = !!cur && stash >= WEAPON_STASH_MAX;
  /* the weapon bag's room: the new one goes in hand, the one held into the bag */
  const room = Math.max(0, WEAPON_STASH_MAX - stash + (cur ? 0 : 1));
  const word = TYPE_WORD[type];
  const icon = type === 'bow' ? BOW_ICON : STAFF_ICON;
  const I = R.inventory || {};
  return shown.map((key) => {
    const wt = WOODWORKING_TIERS[key];
    const hw = tg && wt.hardened ? wt.hardened : null;
    const resKey = hw || ('wood_' + wt.wood);
    const resNeed = hw ? wt.hardenedCost : wt.woodCost;
    let req = getGearStatReq(type, keys.indexOf(key), R);
    if (tg) {
      const eq = getEquipReqLabel({ type, gearBase: 'ww_' + key, tierMult: wt.tierMult }, 'weapon', R);
      req = eq ? { stat: eq.stat, label: eq.label, value: eq.req, met: eq.met !== false, prog3: !!eq.prog3 }
        : { stat: type, label: '', value: 0, met: true, prog3: true };
    }
    const meets = req.value === 0 || (req.prog3 ? req.met : (R[req.stat] || 0) >= req.value);
    const skillOk = lvl >= wt.minLvl;
    const name = wt.label + ' ' + word;
    /* the worker pays a tier's `xp`, else 5 x its level (gear.js) */
    const xp = wt.xp || (wt.minLvl || 1) * 5;
    return {
      key, icon, title: name, name, badge: wt.slots > 1 ? wt.slots + '◆' : null,
      costs: [{ icon: thumbFor(resKey), have: Math.floor(I[resKey] || 0), need: resNeed }, { icon: COIN, have: R.coins || 0, need: wt.goldCost }],
      room, ok: skillOk && meets && !stashFull,
      lock: !skillOk ? sayPieces(SAY_W, 'woodwork.needSkill', { lvl: wt.minLvl }) : !meets ? (req.prog3 ? req.label : (STAT_LABELS[req.stat] || req.stat)) + ' ' + req.value : null,
      chips: [<span key="xp" data-ww-xp={xp} style={{ display: 'contents' }}><Chip icon={XP} color="#9FD3F0">+{xp}</Chip></span>],
      multi: true, per: 1, verb: say(SAY_W, skillOk ? 'woodwork.make' : 'woodwork.locked'),
      send: () => act('forge_weapon', { weaponType: type, tierKey: key, isWoodwork: true }),
      sig: () => { const w = S.rpg && S.rpg[slot]; return w ? w.gearBase + ':' + w.type + ':' + (S.rpg.weaponStash || []).length : ''; },
      kind: 'craft', workMs: () => SMITH_STRIKE_MS * 4,
      done: say(SAY_W, 'woodwork.made', { name }), fail: say(SAY_W, 'woodwork.couldNot'),
      /* the old window set this before the worker answered; a dormant chain still reads it
         (gameSystems.js bron_3) -- today only once it did, and so here */
      landed: () => { const RR = S.rpg; if (RR) { if (!RR._questFlags) RR._questFlags = {}; RR._questFlags.craftedWoodWeapon = true; } },
    };
  });
}

/* ── Hardened: one row a wood, its logs into hardened wood (today's HardenedWoodTab) ── */
function hardwoodRows(S, R, lvl) {
  const I = R.inventory || {};
  return Object.keys(HARDENED_WOOD_RECIPES).map((key) => {
    /* one log a piece against a worker that says so, five without */
    const r = hardenedWoodRecipe(key, !!(S._serverCaps && S._serverCaps.onetoone));
    const have = Math.floor(Number(I[key]) || 0);
    const locked = lvl < r.minLvl;
    return {
      key, icon: thumbFor(key) || thumbFor(r.log), fallback: thumbFor(r.log),
      title: <>{r.name} <span data-hw-have={have} style={{ color: C.mute, fontWeight: 700 }}>×{have}</span></>, name: r.name,
      costs: [{ icon: thumbFor(r.log), have: Math.floor(Number(I[r.log]) || 0), need: r.logCost }],
      ok: !locked, lock: locked ? say(SAY_W, 'woodwork.needSkill', { lvl: r.minLvl }) : null,
      chips: [<Chip key="xp" icon={XP} color="#9FD3F0">+{r.xp}</Chip>],
      multi: true, per: HARDENED_WOOD_MAX_PER_REQUEST, verb: say(SAY_W, locked ? 'woodwork.locked' : 'woodwork.make'),
      send: (n) => act('make_hardened_wood', { key, count: n }),
      sig: () => String(inv(S, key)), kind: 'hardwood', workMs: (n) => SMITH_STRIKE_MS * Math.min(6, 2 + n),
      done: null, fail: null,
    };
  });
}

/* ── Upgrade: hardening the bow and the staff you hold, H0-H5 (today's UpgradeTab) ── */
function upgradeRows(S, R, lvl) {
  const SC = S._serverCaps || {};
  const coins = R.coins || 0;
  const rows = [];
  for (const type of ['bow', 'staff']) {
    const slot = SLOT_OF[type];
    const w = R[slot];
    if (!w) continue;
    const h = typeof w.hardness === 'number' ? w.hardness : 0;
    const maxed = h >= 5;
    const hc = hardenCost(w, h, !!SC.hardenmats, !!SC.hardenedwood, slot);
    /* read straight off S._serverCaps, so the caps audit sees the gate */
    const byWood = !!(S._serverCaps && S._serverCaps.hardenwoodskill) && hardenIsWood(w, slot);
    const needLvl = byWood ? (SC.forgeladder ? hardenLevelFor(w, slot) : hardenTierOf(w) * 5) : 0;
    const skillOk = lvl >= needLvl;
    const costs = [];
    if (!maxed && hc.material) costs.push({ icon: thumbFor(hc.material), have: Math.floor(((R.inventory || {})[hc.material]) || 0), need: hc.amount });
    if (!maxed) costs.push({ icon: COIN, have: coins, need: hc.gold });
    const chips = [];
    if (!maxed) chips.push(<Chip key="odds" color={H_ODDS[h] >= 20 ? C.good : '#E5B36A'}>{H_ODDS[h]}%</Chip>);
    if (!maxed && h > 0) chips.push(<Chip key="keep" color={C.mute}>{SC.hardenkeep ? say(SAY_W, 'woodwork.failKeeps', { h }) : say(SAY_W, 'woodwork.failDrops')}</Chip>);
    rows.push({
      key: 'harden-' + type, icon: type === 'bow' ? BOW_ICON : STAFF_ICON, badge: say(SAY_W, 'woodwork.hardness', { h }), name: weaponDisplayName(w),
      title: maxed ? say(SAY_W, 'woodwork.titleMax', { name: weaponDisplayName(w) }) : say(SAY_W, 'woodwork.titleStep', { name: weaponDisplayName(w), h, next: h + 1 }),
      costs, ok: !maxed && skillOk, lock: !maxed && !skillOk ? sayPieces(SAY_W, 'woodwork.needSkill', { lvl: needLvl }) : null, chips,
      none: maxed, multi: false, per: 1, verb: say(SAY_W, 'woodwork.harden'),
      send: () => act('harden_weapon', { slot }),
      /* harden_result (gameEvents) says win or lose; this only ends the wait */
      sig: () => { const x = S.rpg && S.rpg[slot]; return x ? String(x.hardness || 0) + ':' + (x.temper || 0) + ':' + (S.rpg.coins || 0) + ':' + (hc.material ? ((S.rpg.inventory || {})[hc.material] || 0) : '') : ''; },
      kind: 'harden', workMs: () => SMITH_STRIKE_MS * 3, done: null, fail: null,
    });
  }
  return rows;
}

/* ── Traps: one log of any kind makes one box trap (today's TrapsTab): a row a log you hold ── */
function trapRows(S, R) {
  const I = R.inventory || {};
  return Object.keys(TRAPPING.LOGS).filter((k) => Math.floor(Number(I[k]) || 0) > 0).map((log) => ({
    key: log, icon: thumbFor(log), title: TRAP_LOG_NAMES[log] || log, name: TRAP_LOG_NAMES[log] || log,
    costs: [{ icon: thumbFor(log), have: Math.floor(Number(I[log]) || 0), need: TRAPPING.LOGS[log] }],
    ok: true, lock: null, chips: [<Chip key="xp" icon={XP} color="#9FD3F0">{say(SAY, 'menus3Counter.trapXp', { xp: TRAPPING.MAKE_XP })}</Chip>],
    multi: true, per: TRAPPING.MAX_PER_REQUEST, verb: say(SAY_W, 'woodwork.make'),
    send: (n) => act('make_traps', { log, count: n }),
    sig: () => String(inv(S, TRAPPING.TRAP)), kind: 'traps', workMs: (n) => SMITH_STRIKE_MS * Math.min(6, 2 + n),
    done: null, fail: null,
  }));
}

const WOODWORKER = Object.freeze({
  id: 'woodworker',
  skill: 'woodworking',
  skillIcon: '/icons/ui/skill-woodworking.webp?v=2.3.1224',
  level: (lvl) => say(SAY_W, 'woodwork.level', { lvl }),
  levelProps: (lvl) => ({ 'data-woodwork-level': lvl }),
  rootProps: { 'data-woodwork': 'menus3' },
  tabProp: 'data-ww-type',
  tabs: (S) => woodTabs(S._serverCaps),
  look: (t) => TAB_LOOK[t](),
  rows: (tab, S, R, lvl) => {
    if (tab === 'bow' || tab === 'staff') return craftRows(S, R, lvl, tab);
    if (tab === 'hardwood') return hardwoodRows(S, R, lvl);
    if (tab === 'upgrade') return upgradeRows(S, R, lvl);
    if (tab === 'traps') return trapRows(S, R);
    return [];
  },
  above: (tab, S, R, rows) => {
    if (tab === 'bow' || tab === 'staff') {
      const cur = R[SLOT_OF[tab]] || null;
      if (!cur) return null;
      const stashFull = (R.weaponStash || []).length >= WEAPON_STASH_MAX;
      return (
        <div className="m3-line m3-make-holding" data-ww-holding={cur.gearBase || ''}>
          <Icon src={tab === 'bow' ? BOW_ICON : STAFF_ICON} size={18} />
          <span>{sayPieces(SAY_W, 'woodwork.holding', { name: <b key="name">{weaponDisplayName(cur)}</b> })}</span>
          {stashFull ? <Lock>{say(SAY_W, 'woodwork.bagFull')}</Lock> : null}
        </div>
      );
    }
    if (tab === 'upgrade' && !rows.length) return <div className="m3-line">{say(SAY_W, 'woodwork.holdOne')}</div>;
    if (tab === 'traps') {
      const traps = inv(S, TRAPPING.TRAP);
      return (
        <>
          <div className="m3-line m3-make-holding" data-traps-have={traps}>
            <Icon src={TRAP_ICON_URL} size={22} />
            <span><b>{say(SAY, 'menus3Counter.trapName', { n: traps })}</b> · {say(SAY, 'menus3Counter.trapHow')}</span>
          </div>
          {!rows.length ? <div className="m3-line" data-traps-nologs="1">{say(SAY, 'menus3Counter.trapNoLogs')}</div> : null}
        </>
      );
    }
    return null;
  },
  /* the hardened wood and the traps celebrate from their own receipts; a bow or a staff here, as today */
  celebrates: (row) => row.kind === 'craft',
  ring: (row) => (row.kind === 'craft' ? 'woodwork' : null),
  fail: say(SAY_W, 'woodwork.couldNot'),
});

export function Menus3Wood({ R, getS }) {
  return <Menus3Bench R={R} getS={getS} bench={WOODWORKER} />;
}
