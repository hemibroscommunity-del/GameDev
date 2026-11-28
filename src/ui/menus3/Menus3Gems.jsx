/* ═══ v2.3.6877: THE COUNTER'S MAKE -- THE GEM WORKS (card MN step 13c) ═══
 *
 * Today's Gem Works (panels/buildings/GemWorksPanel.jsx: Cut gems,
 * ShardCrackPanel.jsx; Set gems, EnchantPanel.jsx) as a bench of the one Make
 * (Menus3Bench.jsx): its two tabs, each door opening its own; every row,
 * count, lock, chip and word today's two tabs show (their own words,
 * data/say/shardCrack.js and enchant.js); every ask the same, through the
 * same functions (each one's own wait and answer):
 *
 *   Cut gems   shard_crack { land, count }       askShardCrack: today's own count
 *                                                (its "All"), in pieces of 50;
 *              gem_combine { element }           askGemCombine: three raw into one,
 *                                                one after another;
 *              gem_combine { element, rare }     the Rare Gem into the gem you pick,
 *                                                one after another;
 *   Set gems   weapon_gem { slot, gem }          askWeaponGem: one at a time (a slot);
 *              amulet_forge_request { op: 'gem', gem }   one at a time (it REPLACES the gem);
 *              shield_gem { gem, ... }           askShieldGem: one at a time (it replaces);
 *              amulet_forge_request { op: 'extract', target }   askWeaponGemOut, Take out:
 *                                                one at a time, its gold.
 *
 * The Counter opens only against a worker that settles all of them
 * (src/game/menus3Counter.js gemWorksReady): with a kill switch thrown today's
 * window opens, with its old local paths.  The answers speak for themselves
 * (game/shardCrack.js, weaponGem.js, shieldGem.js: the popup, the sound, the
 * level's celebration, the quests' flags); the queue waits for each answer and
 * stops at once on a no.  The amulet's gem has no answer of its own: today's
 * window predicted it; the Counter waits for the worker's amulet instead and
 * then says today's "+n", plays today's sound and sets today's flag. */
import React from 'react';
import { ELEMENTS, RARITY_TIERS, AMULET_GEM_STATS, AMULET_TIERS, SHIELD_GEM_STATS, BLACKSMITH_TIERS, getAmuletBonus, getShieldBonus } from '@/data/index.js';
import { gemExtractCost } from '@/data/items.js';
import { ZONE_SHARDS, SHARD_GEM_ELEMENT, RAW_PER_GEM, SHARD_CRACK_MAX, shardCrackChance, shardCrackNextStep } from '@/data/shards.js';
import { WEAPON_GEMS, SECOND_SLOT_LVL, FUSION_BASES, isVolatilePair, isWeaponGem, weaponGemEffect, weaponGemEdge, weaponGemSlots } from '@/data/weaponGems.js';
import { GEM_ELEMENTS, gemCount, gemColor, gemElementName, gemIcon, gemRawKey, gemCutKey, gemXpOwedTotal } from '@/data/gems.js';
import { thumbFor } from '@/ui/mobile/dash/InventoryPanel.jsx';
import { askShardCrack, askGemCombine, shardCrackBus, shardCrackReasonText, shardCrackOnServer } from '@/game/shardCrack.js';
import { askWeaponGem, askWeaponGemOut, weaponGemBus, weaponGemOnServer, weaponGemReasonText, monsterHoldOn } from '@/game/weaponGem.js';
import { askShieldGem, shieldGemBus, shieldGemOnServer, shieldGemReasonText } from '@/game/shieldGem.js';
import { amuletGemSettable } from '@/game/amuletGem.js';
import { pushDmgPopup } from '@/game/combatHelpers.js';
import { cue } from '@/game/eventSounds.js';
import { act } from '@/game/actions.js';
import { C, COIN, Icon, Chip, Lock } from '../panels/buildings/BenchParts.jsx';
import { Reveal, useCrackSounds } from '../panels/buildings/ShardCrackPanel.jsx';
import { SAY as SAY_G } from '@/data/say/gemWorks.js';
import { SAY as SAY_X } from '@/data/say/shardCrack.js';
import { SAY as SAY_E } from '@/data/say/enchant.js';
import { SAY } from '@/data/say/menus3Counter.js';
import { say, sayPieces } from '@/game/say.js';
import { GEM_TABS, gemFirstTab, weaponGemSlotsRead } from '@/game/menus3Counter.js';
import { Menus3Bench } from './Menus3Bench.jsx';

const CUT_ICON = '/icons/ui/bldg-gemcut.webp';
const SET_ICON = '/icons/ui/bldg-enchant.webp';
const TAB_LOOK = {
  gemcut: () => ({ label: say(SAY_G, 'gemWorks.cut'), icon: CUT_ICON }),
  enchant: () => ({ label: say(SAY_G, 'gemWorks.set'), icon: SET_ICON }),
};
const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const count = (inv, k) => (inv && own(inv, k) ? Math.max(0, Math.floor(Number(inv[k]) || 0)) : 0);
const gcLevel = (R) => { const g = R.lifeSkills && R.lifeSkills.gemCutting; return Math.max(1, Math.floor(Number(g && typeof g === 'object' ? g.level : 1) || 1)); };
const enLevel = (R) => { const g = R.lifeSkills && R.lifeSkills.enchanting; return Math.max(1, Math.floor(Number(g && typeof g === 'object' ? g.level : 1) || 1)); };

/* ── each ask's answer: the queue's reading and its no ── */
let _sentAt = 0;
const mark = () => { _sentAt = Date.now(); };
/* a new yes moves the reading (its time; the crack's and the combine's count too) */
const answered = (bus) => () => { const l = bus.get(); return l && l.ok ? String(l.at) + ':' + (l.seq || 0) : '0'; };
/* the worker said no to the ask just sent (its words already said: the popup and the note) */
const refusedOn = (bus) => () => { const l = bus.get(); return !!l && !l.ok && l.at >= _sentAt; };
const sent = (x) => { if (!x) throw new Error('not sent'); };   /* an ask its own function would not send: the queue stops */
/* a refusal under what it was about, as today (8 s) */
const recentNo = (bus, pred) => { const l = bus.get(); return l && !l.ok && Date.now() - l.at < 8000 && (!pred || pred(l)) ? l : null; };

const Head = ({ sec, children }) => (
  <>
    {sec ? <b className="m3-make-sec">{sec}</b> : null}
    {children}
  </>
);
const note = (key, head, extra) => Object.assign({ key, note: true, head, costs: [] }, extra || {});

/* ── Cut gems: shards, raw gems, the Rare Gem, your gems (today's ShardCrackPanel) ── */
function cutRows(S, R, crack) {
  const inv = R.inventory || {};
  const lvl = gcLevel(R);
  const chance = shardCrackChance(lvl);
  const next = shardCrackNextStep(lvl);
  const on = shardCrackOnServer(S);
  const rows = [note('cut-intro', (
    <span className="m3-make-sub">
      {say(SAY_G, 'gemWorks.cutShards')} · {say(SAY_X, 'shardCrack.intro', { per: RAW_PER_GEM })}{' '}
      {say(SAY_X, 'shardCrack.eachShard', { chance, next: next ? say(SAY_X, 'shardCrack.nextStep', { pct: next.pct, lvl: next.minLvl }) : '' })}
    </span>
  ))];
  /* a land's row stays while its crack is playing, its last shard gone */
  const lands = Object.keys(SHARD_GEM_ELEMENT).filter((land) => ZONE_SHARDS[land] && (count(inv, 'shard_' + land) > 0 || (crack && crack.land === land)));
  if (!lands.length) rows.push(note('cut-noshards', <Head sec={say(SAY_X, 'shardCrack.shards')}><span className="m3-make-sub">{say(SAY_X, 'shardCrack.noShards')}</span></Head>));
  lands.forEach((land, i) => {
    const shard = ZONE_SHARDS[land];
    const have = count(inv, 'shard_' + land);
    const el = SHARD_GEM_ELEMENT[land];
    rows.push({
      key: 'crack-' + land, head: i === 0 ? <Head sec={say(SAY_X, 'shardCrack.shards')} /> : null,
      icon: thumbFor(shard.key), title: <span style={{ color: shard.color }}>{shard.label}</span>, name: shard.label,
      sub: <span data-crack-have={have}>{say(SAY_X, 'shardCrack.shardRow', { have, chance, element: gemElementName(el) })}</span>,
      costs: [{ icon: thumbFor(shard.key), have, need: 1 }], ok: on && have > 0, lock: null, chips: null,
      multi: true, per: SHARD_CRACK_MAX, verb: say(SAY_X, 'shardCrack.crack'),
      send: (n) => { mark(); sent(askShardCrack(S, land, n)); },
      sig: answered(shardCrackBus), refused: refusedOn(shardCrackBus), kind: null, workMs: () => 0, done: null, fail: null,
    });
    /* the worker's rolls, a tile a shard, under the row that was cracked (today's) */
    if (crack && crack.land === land) rows.push(note('crack-show-' + land, <Reveal res={crack} />));
  });

  const raws = GEM_ELEMENTS.map((e) => ({ e, have: gemCount(R, e, true) })).filter((r) => r.have > 0);
  if (!raws.length) rows.push(note('cut-noraw', <Head sec={say(SAY_X, 'shardCrack.rawGems')}><span className="m3-make-sub">{say(SAY_X, 'shardCrack.noRaw')}</span></Head>));
  raws.forEach((r, i) => {
    const can = r.have >= RAW_PER_GEM;
    const name = say(SAY_X, 'shardCrack.rawName', { element: gemElementName(r.e) });
    rows.push({
      key: 'combine-' + r.e, head: i === 0 ? <Head sec={say(SAY_X, 'shardCrack.rawGems')} /> : null,
      icon: gemIcon(gemRawKey(r.e)), title: <span style={{ color: gemColor(r.e) }}>{name}</span>, name,
      sub: can ? say(SAY_X, 'shardCrack.combineReady', { have: r.have, per: RAW_PER_GEM, element: gemElementName(r.e) })
        : say(SAY_X, 'shardCrack.combineMore', { have: r.have, more: RAW_PER_GEM - (r.have % RAW_PER_GEM), element: gemElementName(r.e) }),
      costs: [{ icon: gemIcon(gemRawKey(r.e)), have: r.have, need: RAW_PER_GEM }], ok: on, lock: null, chips: null,
      multi: true, per: 1, verb: can ? say(SAY_X, 'shardCrack.combine') : say(SAY_X, 'shardCrack.need', { per: RAW_PER_GEM }),
      send: () => { mark(); sent(askGemCombine(S, r.e, false)); },
      sig: answered(shardCrackBus), refused: refusedOn(shardCrackBus), kind: null, workMs: () => 0, done: null, fail: null,
    });
  });

  const rare = count(inv, 'rare_gem');
  if (rare > 0) {
    WEAPON_GEMS.forEach((e, i) => {
      const name = say(SAY_X, 'shardCrack.cutInto', { element: gemElementName(e) });
      rows.push({
        key: 'rare-' + e,
        head: i === 0 ? <Head sec={say(SAY_X, 'shardCrack.rare')}><span className="m3-make-sub">{say(SAY_X, 'shardCrack.rareHow', { count: rare })}</span></Head> : null,
        icon: gemIcon(gemCutKey(e)), title: <span style={{ color: gemColor(e) }}>{name}</span>, name,
        costs: [{ icon: thumbFor('rare_gem'), have: rare, need: 1 }], ok: on, lock: null, chips: null,
        multi: true, per: 1, verb: say(SAY, 'menus3Counter.gemCut'),
        send: () => { mark(); sent(askGemCombine(S, e, true)); },
        sig: answered(shardCrackBus), refused: refusedOn(shardCrackBus), kind: null, workMs: () => 0, done: null, fail: null,
      });
    });
  }

  const gems = GEM_ELEMENTS.map((e) => ({ e, have: gemCount(R, e, false) })).filter((g) => g.have > 0);
  rows.push(note('cut-gems', (
    <Head sec={say(SAY_X, 'shardCrack.yourGems')}>
      {gems.length ? (
        <>
          <span className="m3-make-chips">
            {gems.map((g) => (
              <span key={g.e} data-gem-have={g.e} style={{ display: 'contents' }}>
                <Chip icon={gemIcon(gemCutKey(g.e))} color={gemColor(g.e)}>{say(SAY_X, 'shardCrack.gemHave', { element: gemElementName(g.e), count: g.have })}</Chip>
              </span>
            ))}
          </span>
          <span className="m3-make-sub">{say(SAY_X, 'shardCrack.setThem')}</span>
        </>
      ) : <span className="m3-make-sub">{say(SAY_X, 'shardCrack.noGems')}</span>}
    </Head>
  )));
  const no = recentNo(shardCrackBus);
  if (no) rows.push(note('cut-no', <span className="m3-make-no" data-crack-refused={no.reason || 'bad'}>{shardCrackReasonText(no.reason, no.kind === 'combine' ? no : null)}</span>));
  return rows;
}

/* ── Set gems: the three weapons, the amulet, the shield (today's EnchantPanel) ── */
const WEAPONS = [
  { key: 'weapon', label: () => say(SAY_E, 'enchant.melee') },
  { key: 'rangedWeapon', label: () => say(SAY_E, 'enchant.bow') },
  { key: 'staffWeapon', label: () => say(SAY_E, 'enchant.staff') },
];
const ELEM_KEYS = () => Object.keys(ELEMENTS);

function weaponRows(S, R, slot, label) {
  const wpn = R[slot] || null;
  const lvl = enLevel(R);
  const caps = S._serverCaps || {};
  const fx = { elemup: !!caps.elemup, soakhit: !!caps.soakhit, shockspark: !!caps.shockspark };
  const hold = monsterHoldOn(S);
  const on = weaponGemOnServer(S);
  const rd = weaponGemSlotsRead(wpn, {
    max: wpn ? weaponGemSlots(wpn) : 0, lvl, second: SECOND_SLOT_LVL, fusion: !!wpn && FUSION_BASES.indexOf(wpn.gearBase) >= 0,
    elements: ELEM_KEYS(), offers: isWeaponGem, have: (e) => gemCount(R, e, false), volatile: isVolatilePair,
  });
  const tier = wpn ? RARITY_TIERS[wpn.tier] : null;
  const head = (
    <Head sec={label}>
      <span className="m3-make-name" style={{ color: wpn ? undefined : C.mute }}>{wpn ? wpn.name : say(SAY_E, 'enchant.none')}</span>
      {wpn ? (
        <span className="m3-make-chips">
          <span style={{ color: (tier && tier.color) || C.mute }}>{(tier && tier.label) || say(SAY_E, 'enchant.common')}</span>
          {[wpn.element1, wpn.element2].filter(Boolean).map((e) => <Chip key={e} icon={gemIcon(gemCutKey(e))} color={ELEMENTS[e] && ELEMENTS[e].color}>{e}</Chip>)}
          {wpn.isVolatile ? <span style={{ color: '#D95C54', fontWeight: 700 }}>{say(SAY_E, 'enchant.volatile')}</span> : null}
        </span>
      ) : null}
      <span className="m3-make-sub">
        {say(SAY_E, 'enchant.slots', { used: rd.used, max: rd.max })}
        {rd.max === 0 ? say(SAY_E, 'enchant.slotsNone') : null}
        {wpn && wpn.element1 && !wpn.element2 && rd.max >= 2 && lvl < SECOND_SLOT_LVL ? say(SAY_E, 'enchant.slotsSecond') : null}
      </span>
      {wpn ? [wpn.element1, wpn.element2].filter(Boolean).map((e) => (
        <span key={'fx-' + e} className="m3-make-sub" data-weapon-gem-effect={e}>
          <b style={{ color: ELEMENTS[e] && ELEMENTS[e].color }}>{e}</b> · {weaponGemEffect(e, hold, fx)}{weaponGemEdge(e, fx) ? ' · ' + weaponGemEdge(e, fx) : ''}
        </span>
      )) : null}
      {rd.state === 'pick' ? <span className="m3-make-sub">{say(SAY_E, rd.second ? 'enchant.chooseSecond' : 'enchant.chooseFirst')}</span> : null}
      {wpn && rd.state !== 'pick' ? <span className="m3-make-chips"><Lock>{say(SAY_E, rd.state === 'noGems' ? 'enchant.noGems' : rd.state === 'locked' ? 'enchant.locked' : 'enchant.noSlot')}</Lock></span> : null}
    </Head>
  );
  const rows = [];
  if (!rd.picks.length) rows.push(note('set-' + slot, head));
  rd.picks.forEach((p, i) => {
    const name = say(SAY_E, 'enchant.gemName', { gem: p.e });
    rows.push({
      key: 'set-' + slot + '-' + p.e, head: i === 0 ? head : null,
      icon: gemIcon(gemCutKey(p.e)), title: <span style={{ color: ELEMENTS[p.e] && ELEMENTS[p.e].color }}>{name}</span>, name,
      costs: [{ icon: gemIcon(gemCutKey(p.e)), have: p.have, need: 1 }],
      ok: on && !p.blocked, lock: p.blocked ? say(SAY_E, 'enchant.volatileTip') : null, chips: null,
      multi: false, per: 1, verb: say(SAY, 'menus3Counter.gemSet'),
      send: () => { mark(); sent(askWeaponGem(S, slot, p.e)); },
      sig: answered(weaponGemBus), refused: refusedOn(weaponGemBus), kind: null, workMs: () => 0, done: null, fail: null,
    });
  });
  const no = recentNo(weaponGemBus, (l) => l.slot === slot);
  if (no) rows.push(note('set-no-' + slot, <span className="m3-make-no" data-weapon-gem-refused={no.reason || 'bad'}>{weaponGemReasonText(no.reason)}</span>));
  /* Take out, here too: the Blacksmith's own ask, its price; the gem comes back */
  if (on && caps.gemExtract && wpn && (wpn.element1 || wpn.element2)) {
    const cost = gemExtractCost(wpn);
    rows.push({
      key: 'out-' + slot, icon: SET_ICON, title: say(SAY_E, 'enchant.takeOut') + ' · ' + wpn.name, name: say(SAY_E, 'enchant.takeOut'),
      sub: say(SAY_E, 'enchant.outCost', { cost }),
      costs: [{ icon: COIN, have: R.coins || 0, need: cost }], ok: true, lock: null, chips: null,
      multi: false, per: 1, verb: say(SAY_E, 'enchant.takeOut'),
      send: () => { mark(); sent(askWeaponGemOut(S, slot)); },
      sig: () => { const w = S.rpg && S.rpg[slot]; return w ? (w.element1 || '') + ':' + (w.element2 || '') : ''; },
      kind: null, workMs: () => 0, done: null, fail: null,
    });
  }
  return rows;
}

function amuletRows(S, R) {
  const am = R.amulet || null;
  if (!am) return [note('amulet-none', <Head sec={say(SAY_E, 'enchant.amulet')}><span className="m3-make-sub">{say(SAY_E, 'enchant.noAmulet')}</span></Head>)];
  const bonus = am.gem ? getAmuletBonus(am) : null;
  const elems = ELEM_KEYS().filter((e) => AMULET_GEM_STATS[e] && gemCount(R, e, false) > 0);
  const head = (
    <Head sec={say(SAY_E, 'enchant.amulet')}>
      <span className="m3-make-name">{am.name}{bonus ? <span style={{ color: C.good }}> · {bonus.label} +{bonus.value}{bonus.unit}</span> : null}</span>
      <span className="m3-make-sub">{am.gem
        ? sayPieces(SAY_E, 'enchant.amuletSlotted', { gem: <b key="gem" style={{ color: ELEMENTS[am.gem] && ELEMENTS[am.gem].color }}>{say(SAY_E, 'enchant.gemName', { gem: am.gem })}</b> })
        : say(SAY_E, 'enchant.amuletEmpty')}</span>
      {!elems.length ? <span className="m3-make-chips"><Lock>{say(SAY_E, 'enchant.noGems')}</Lock></span> : null}
    </Head>
  );
  if (!elems.length) return [note('amulet', head)];
  const tierData = AMULET_TIERS[am.tier];
  return elems.map((e, i) => {
    const st = AMULET_GEM_STATS[e];
    const val = Math.round((st.base + st.perPower * ((tierData && tierData.basePower) || 1)) * 10) / 10;
    const name = say(SAY_E, 'enchant.gemName', { gem: e });
    const settable = amuletGemSettable(am, e);
    return {
      key: 'amulet-' + e, head: i === 0 ? head : null,
      icon: gemIcon(gemCutKey(e)), title: <span style={{ color: ELEMENTS[e] && ELEMENTS[e].color }}>{name}</span>, name,
      costs: [{ icon: gemIcon(gemCutKey(e)), have: gemCount(R, e, false), need: 1 }],
      ok: settable && !!(S._serverCaps && S._serverCaps.amuletForge && S.channel), lock: null,
      chips: [<Chip key="v" color={C.good}>+{val}{st.unit}</Chip>],
      multi: false, per: 1, verb: say(SAY, 'menus3Counter.gemSet'), kind: 'amulet',
      send: () => {
        const RR = S.rpg;
        /* read live, as today: the gem already set is not set again, and one must be there */
        if (!RR || !amuletGemSettable(RR.amulet, e) || gemCount(RR, e, false) < 1) throw new Error('not settable');
        act('amulet_forge_request', { op: 'gem', gem: e });
      },
      sig: () => { const RR = S.rpg; return RR && RR.amulet ? String(RR.amulet.gem || '') + ':' + gemCount(RR, e, false) : ''; },
      workMs: () => 0, done: null, fail: null,
      /* today's window said this and set this the moment it asked; the Counter once the worker's amulet has it */
      landed: () => {
        try { const P = S.player; if (P) pushDmgPopup(S, P.x, P.y - 30, st.label + ' +' + val + st.unit, ELEMENTS[e] && ELEMENTS[e].color); } catch (x) { /* popup only */ }
        const RR = S.rpg; if (RR) { if (!RR._questFlags) RR._questFlags = {}; RR._questFlags.slottedGem = true; }
      },
    };
  });
}

function shieldRows(S, R) {
  const sh = R.shield || null;
  if (!sh) return [note('shield-none', <Head sec={say(SAY_E, 'enchant.shield')}><span className="m3-make-sub">{say(SAY_E, 'enchant.noShield')}</span></Head>)];
  const bonus = sh.gem ? getShieldBonus(sh) : null;
  const elems = ELEM_KEYS().filter((e) => SHIELD_GEM_STATS[e] && gemCount(R, e, false) > 0);
  const head = (
    <Head sec={say(SAY_E, 'enchant.shield')}>
      <span className="m3-make-name">{sh.name}{bonus ? <span style={{ color: C.good }}> · {bonus.label} +{bonus.value}{bonus.unit}</span> : null}</span>
      <span className="m3-make-sub">{sh.gem
        ? sayPieces(SAY_E, 'enchant.shieldSlotted', { gem: <b key="gem" style={{ color: ELEMENTS[sh.gem] && ELEMENTS[sh.gem].color }}>{say(SAY_E, 'enchant.gemName', { gem: sh.gem })}</b> })
        : say(SAY_E, 'enchant.shieldEmpty')}</span>
      {!elems.length ? <span className="m3-make-chips"><Lock>{say(SAY_E, 'enchant.noGems')}</Lock></span> : null}
    </Head>
  );
  const rows = !elems.length ? [note('shield', head)] : elems.map((e, i) => {
    const st = SHIELD_GEM_STATS[e];
    const bt = BLACKSMITH_TIERS[sh.gearBase];
    const val = Math.round((st.base + st.perPower * ((bt && bt.tierMult) || 1)) * 10) / 10;
    const name = say(SAY_E, 'enchant.gemName', { gem: e });
    return {
      key: 'shield-' + e, head: i === 0 ? head : null,
      icon: gemIcon(gemCutKey(e)), title: <span style={{ color: ELEMENTS[e] && ELEMENTS[e].color }}>{name}</span>, name,
      costs: [{ icon: gemIcon(gemCutKey(e)), have: gemCount(R, e, false), need: 1 }],
      ok: shieldGemOnServer(S), lock: null, chips: [<Chip key="v" color={C.good}>+{val}{st.unit}</Chip>],
      multi: false, per: 1, verb: say(SAY, 'menus3Counter.gemSet'),
      send: () => { mark(); sent(askShieldGem(S, e)); },
      sig: answered(shieldGemBus), refused: refusedOn(shieldGemBus), kind: null, workMs: () => 0, done: null, fail: null,
    };
  });
  const no = recentNo(shieldGemBus);
  if (no) rows.push(note('shield-no', <span className="m3-make-no" data-shield-gem-refused={no.reason || 'bad'}>{shieldGemReasonText(no.reason)}</span>));
  return rows;
}

function setRows(S, R) {
  const owed = gemXpOwedTotal(R);
  const rows = [note('set-intro', (
    <span className="m3-make-sub">
      {say(SAY_G, 'gemWorks.setGems')} · {say(SAY_E, 'enchant.intro')}
      {owed === null ? null : <span data-gem-xp-owed={owed}>{' '}{owed > 0 ? say(SAY_E, 'enchant.xpOwed', { owed }) : say(SAY_E, 'enchant.xpHow')}</span>}
    </span>
  ))];
  for (const w of WEAPONS) rows.push(...weaponRows(S, R, w.key, w.label()));
  rows.push(...amuletRows(S, R));
  rows.push(...shieldRows(S, R));
  return rows;
}

function makeBench(openedAt) {
  /* only a crack answered while the Counter is open is played (as today's tab) */
  const crackNow = () => {
    const l = shardCrackBus.get();
    return l && l.at >= openedAt.current && l.kind === 'crack' && l.ok && l.rolls.length ? l : null;
  };
  return Object.freeze({
    id: 'gemworks',
    skill: (tab) => (tab === 'enchant' ? 'enchanting' : 'gemCutting'),
    skillIcon: (tab) => (tab === 'enchant' ? '/icons/ui/skill-enchanting.webp?v=2.3.1232' : '/icons/ui/skill-gemcutting.webp?v=2.3.1232'),
    level: (lvl, tab) => (tab === 'enchant' ? say(SAY_E, 'enchant.level', { lvl }) : say(SAY_X, 'shardCrack.level', { lvl, chance: shardCrackChance(lvl) })),
    levelProps: (lvl, tab) => ({ 'data-gem-level': tab + ':' + lvl }),
    rootProps: { 'data-gem-works': 'menus3' },
    tabProp: 'data-gem-tab',
    tabs: () => GEM_TABS.slice(),
    look: (t) => TAB_LOOK[t](),
    rows: (tab, S, R) => (tab === 'enchant' ? setRows(S, R) : cutRows(S, R, crackNow())),
    crackNow,
    /* every level here is celebrated by its own answer (game/shardCrack.js, weaponGem.js) */
    celebrates: () => false,
    /* the amulet's gem has no answer to play its sound: the Counter does, as today's window did */
    ring: (row) => { if (row.kind === 'amulet') cue('gemSet'); },
    fail: say(SAY, 'menus3Counter.gemFail'),
  });
}

export function Menus3Gems({ R, getS, station }) {
  const openedAt = React.useRef(Date.now());
  const bench = React.useMemo(() => makeBench(openedAt), []);
  const [, bump] = React.useReducer((x) => x + 1, 0);
  /* each answer redraws (the reveal, a refusal, the counts the next player_state brings) */
  React.useEffect(() => {
    const offs = [shardCrackBus.subscribe(bump), weaponGemBus.subscribe(bump), shieldGemBus.subscribe(bump)];
    return () => { for (const off of offs) off(); };
  }, []);
  useCrackSounds(bench.crackNow());
  return <Menus3Bench R={R} getS={getS} bench={bench} first={gemFirstTab(station && station.id)} />;
}
