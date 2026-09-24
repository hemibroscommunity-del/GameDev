import React from 'react';
import {
  AMULET_TIERS, BLACKSMITH_TIERS, WOODWORKING_TIERS, BT_AUDIO, LIFE_SKILL_XP, NUGGETS_PER_BAR,
  SMELT_RECIPES, WEAPON_STASH_MAX, gemExtractCost, getGearStatReq,
} from '@/data/index.js';
import { BAR_THUMBS, thumbFor } from '@/ui/mobile/dash/InventoryPanel.jsx';
import { metalIconPath, weaponMaterial } from '@/rendering/traits/materialTints.js';
import { pushDmgPopup } from '@/game/combatHelpers.js';
import { celebrateLifeSkillLevel } from '@/game/levelCelebration.js';
import { startSmithing, SMITH_STRIKE_MS } from '@/game/smithing.js';

/* ═══ v2.3.2826: THE BLACKSMITH, REBUILT ═══
 *
 * Owner: "I hate the blacksmithing menu.  I almost want to Delete it and
 * start from scratch.  Nobody wants to read a novel to know how it works."
 *
 * So it was deleted (ForgePanel.jsx, 1,488 lines) and this replaces it.
 *
 * THE RULES THIS PANEL KEEPS
 *   - Pictures and numbers, not sentences.  Every cost is a chip: the thing's
 *     icon and HAVE/NEED, green when you have it, red when you don't.  A lock
 *     is a chip that names the one thing missing ("Smithing 6").
 *   - One job per tab: Smelt, Forge, Upgrade, Amulet.  The old panel stacked
 *     all of them in one scroll with a paragraph above each.
 *   - Only what the WORKER settles.  The old panel also offered Reforge, the
 *     legacy "Harden" affix, shield forging and Salvage -- all four ran only
 *     in the browser (they wrote localStorage; the server has no handler for
 *     any of them), so the next player_state quietly undid them, or never
 *     knew they happened.  They are gone rather than restyled: a button that
 *     lies is worse than no button.  Server-settled and kept: smelt_bar,
 *     forge_weapon, harden_weapon (H0-H5), amulet_forge_request
 *     (smelt / craft / extract).
 *   - No local prediction.  Each press asks the worker and the panel waits
 *     for the player_state it answers with; `watch` below turns the change it
 *     sees into the popup ("Forged Copper Sword!"), or says so if nothing came
 *     back.  Nothing can be shown that the worker did not do.
 *   - The panel sits LOW (BroTown gives the forge card the bottom of the
 *     screen), so the smith is visible above it while he works
 *     (game/smithing.js).
 *
 * Test hooks: data-smithy-tab, data-smelt-*, data-forge-row / data-forge-go,
 * data-harden-go, data-amulet-row. */

const C = {
  sheet: '#1E2E34', well: '#111E23', raised: '#293B41', card: '#24363C',
  text: '#F4F0E7', sub: '#B6C1BE', mute: '#8D9B98', faint: '#667875',
  brass: '#D8AA58', good: '#55B98A', bad: '#D8635D', line: 'rgba(229,237,233,.11)',
};
const ITEMS_V = '?v=2.3.1774';
const COIN = '/icons/ui/cur-gold.webp';
const XP = '/icons/ui/cur-xp.webp';
const GOLDBAR = '/icons/ui/cur-goldbar.webp';
const NUGGET = '/icons/ui/cur-nugget.webp';
const GEM = '/icons/ui/cur-gem.webp';

const Icon = ({ src, size = 18, fallback }) => (
  <img src={src} alt="" draggable={false} style={{ width: size, height: size, objectFit: 'contain', flex: 'none' }}
    onError={(e) => { if (fallback && e.currentTarget.src.indexOf(fallback) < 0) e.currentTarget.src = fallback; else e.currentTarget.style.visibility = 'hidden'; }} />
);

/* A cost: icon + have/need, green or red. */
function Cost({ icon, have, need, fallback }) {
  const ok = have >= need;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px 2px 4px', borderRadius: 999,
      background: C.well, fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: ok ? C.good : C.bad }}>
      <Icon src={icon} size={16} fallback={fallback} />{Math.floor(have)}/{need}
    </span>
  );
}
/* A plain fact chip (XP paid, odds). */
function Chip({ icon, children, color }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px 2px 4px', borderRadius: 999,
      background: C.well, fontSize: 12, fontWeight: 700, color: color || C.sub }}>
      {icon ? <Icon src={icon} size={16} /> : null}{children}
    </span>
  );
}
function Lock({ children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 999,
      background: 'rgba(216,99,93,.14)', fontSize: 12, fontWeight: 700, color: '#E59A94' }}>
      <span className="ls-lock" />{children}
    </span>
  );
}
function Btn({ on, onClick, children, primary, ...rest }) {
  return (
    <button disabled={!on} onClick={() => { if (on) onClick(); }} {...rest}
      style={{ minHeight: 44, minWidth: 84, padding: '0 14px', borderRadius: 10, fontSize: 13, fontWeight: 800,
        fontFamily: 'inherit', flex: 'none', cursor: on ? 'pointer' : 'default',
        border: on ? (primary ? '1px solid #EAC675' : '1px solid rgba(229,237,233,.20)') : `1px solid ${C.line}`,
        background: on ? (primary ? 'linear-gradient(180deg,#E2B765,#D2A14D)' : C.raised) : '#1A292F',
        color: on ? (primary ? '#172126' : C.text) : C.mute }}>
      {children}
    </button>
  );
}
function Row({ icon, iconFallback, title, badge, children, action, ...rest }) {
  return (
    <div {...rest} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', background: C.card,
      borderRadius: 12, marginBottom: 8 }}>
      <div style={{ width: 48, height: 48, borderRadius: 10, background: C.well, display: 'grid', placeItems: 'center', flex: 'none', position: 'relative' }}>
        <Icon src={icon} size={40} fallback={iconFallback} />
        {badge ? <span style={{ position: 'absolute', right: -4, bottom: -4, padding: '0 5px', borderRadius: 8, background: C.raised,
          border: `1px solid ${C.line}`, fontSize: 11, fontWeight: 800, color: C.text }}>{badge}</span> : null}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{children}</div>
      </div>
      {action}
    </div>
  );
}

const weaponIcon = (type, tierKey) => {
  const base = type === 'greatsword' ? '/icons/items/great-sword.webp' : '/icons/items/sword.webp';
  return { src: metalIconPath(base, weaponMaterial(type, tierKey)) + ITEMS_V, fallback: base };
};
const TYPE_LABEL = { greatsword: 'Greatsword', sword: 'Sword' };

export function SmithyPanel({ rpgState, stateRef }) {
  const S = stateRef.current || {};
  const caps = S._serverCaps || {};
  const R = rpgState || {};
  const inv = R.inventory || {};
  const coins = R.coins || 0;
  const smith = (R.lifeSkills && R.lifeSkills.blacksmithing) || { level: 1, xp: 0 };
  const lvl = smith.level || 1;

  /* Each surface is drawn only against a worker that settles it (rule 19);
     read straight off S._serverCaps so the caps-audit can see every gate. */
  const SC = S._serverCaps || {};
  const tabs = [
    SC.smelting && { id: 'smelt', label: 'Smelt', icon: BAR_THUMBS.bar_copper },
    { id: 'forge', label: 'Forge', icon: '/icons/items/great-sword-copper.webp' + ITEMS_V },
    (S._serverCaps && (S._serverCaps.harden || S._serverCaps.gemExtract)) && { id: 'upgrade', label: 'Upgrade', icon: GEM },
    (S._serverCaps && S._serverCaps.amuletForge) && { id: 'amulet', label: 'Amulet', icon: '/icons/items/amulet.webp' + ITEMS_V },
  ].filter(Boolean);
  const [tab, setTabState] = React.useState(() => (S._smithyTab && tabs.some((t) => t.id === S._smithyTab)) ? S._smithyTab : tabs[0].id);
  const setTab = (id) => { S._smithyTab = id; setTabState(id); };
  const [wtype, setWtypeState] = React.useState(() => S._bsType === 'sword' ? 'sword' : 'greatsword');
  const setWtype = (t) => { S._bsType = t; setWtypeState(t); };

  /* ── what the worker did ──
     A press records what it expects to change; when the player_state that
     answers it lands and the thing HAS changed, say so.  3.5s of silence is
     a refusal (the worker drops a request it will not settle). */
  const pending = React.useRef(null);
  const [busy, setBusy] = React.useState(null);
  const lvlSeen = React.useRef(lvl);
  const say = (text, color) => { try { const P = S.player; if (P) pushDmgPopup(S, P.x, P.y - 34, text, color || C.brass); } catch (e) { /* popup only */ } };
  React.useEffect(() => {
    const p = pending.current;
    if (p && p.sig() !== p.before) {
      pending.current = null; setBusy(null);
      if (p.done) say(p.done);
      try { BT_AUDIO.collect(); } catch (e) { /* sound only */ }
    }
    if (lvl > lvlSeen.current) {
      /* Smelting celebrates from its own receipt (wsClient smelt_result);
         everything else the panel does celebrates here. */
      if (!(p && p.kind === 'smelt')) { try { celebrateLifeSkillLevel(S, 'blacksmithing', lvl, lvlSeen.current); } catch (e) { /* visual */ } }
    }
    lvlSeen.current = lvl;
  });
  React.useEffect(() => {
    if (!busy) return undefined;
    const t = setTimeout(() => {
      const p = pending.current;
      if (p && p.fail) say(p.fail, C.bad);
      pending.current = null; setBusy(null);
    }, 3500);
    return () => clearTimeout(t);
  }, [busy]);
  const ask = (key, msg, { sig, done, fail, kind, workMs }) => {
    if (!S.channel || busy) return;
    try { S.channel.send(msg); } catch (e) { return; }
    pending.current = { key, sig, before: sig(), done, fail, kind };
    setBusy(key);
    startSmithing(S, workMs || SMITH_STRIKE_MS * 3, kind);
  };

  const need = LIFE_SKILL_XP(lvl);
  const pct = Math.max(0, Math.min(1, (smith.xp || 0) / need));

  return (
    <div data-smithy="1" style={{ margin: -20, background: C.sheet, borderRadius: 14, fontFamily: "'Source Sans 3',sans-serif",
      display: 'flex', flexDirection: 'column', maxHeight: '100%', textAlign: 'left' }}>
      {/* header: who you are at this bench */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 44px 10px 14px', flex: 'none' }}>
        <Icon src="/icons/ui/skill-blacksmithing.webp?v=2.3.1224" size={30} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.10em', textTransform: 'uppercase', color: C.text }}>Blacksmith</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <span data-smithy-level={lvl} style={{ fontSize: 12, fontWeight: 800, color: C.brass }}>Lv {lvl}</span>
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.well, overflow: 'hidden' }}>
              <div style={{ width: `${pct * 100}%`, height: '100%', background: 'linear-gradient(90deg,#C9923E,#EAC675)' }} />
            </div>
          </div>
        </div>
      </div>
      {/* tabs */}
      <div style={{ display: 'flex', gap: 3, margin: '0 12px 10px', padding: 3, borderRadius: 10, background: C.well, flex: 'none' }}>
        {tabs.map((t) => (
          <button key={t.id} data-smithy-tab={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, minHeight: 48, border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
              background: tab === t.id ? C.raised : 'transparent', boxShadow: tab === t.id ? `inset 0 -2px 0 ${C.brass}` : 'none',
              color: tab === t.id ? C.text : C.mute, fontSize: 11, fontWeight: 800 }}>
            <Icon src={t.icon} size={22} />{t.label}
          </button>
        ))}
      </div>
      <div className="ls-scrollbody" style={{ overflowY: 'auto', touchAction: 'pan-y', flex: '1 1 auto', minHeight: 0, padding: '0 12px 12px' }}>
        {tab === 'smelt' && <SmeltTab {...{ S, inv, lvl, ask, busy }} />}
        {tab === 'forge' && <ForgeTab {...{ S, R, inv, coins, lvl, ask, busy, wtype, setWtype }} />}
        {tab === 'upgrade' && <UpgradeTab {...{ S, R, coins, lvl, caps, ask, busy }} />}
        {tab === 'amulet' && <AmuletTab {...{ S, R, coins, lvl, ask, busy }} />}
      </div>
    </div>
  );
}

/* ── Smelt: ore -> bars (server smelting.js) ── */
function SmeltTab({ S, inv, lvl, ask, busy }) {
  return (
    <div data-smelt-section="1">
      {Object.keys(SMELT_RECIPES).map((key) => {
        const r = SMELT_RECIPES[key];
        const ore = Math.floor(inv[r.ore] || 0);
        const can = Math.floor(ore / r.oreCost);
        const locked = lvl < r.minLvl;
        const on = !locked && can > 0 && !busy;
        const go = (n) => ask('smelt', { type: 'smelt_bar', payload: { barKey: key, count: n } }, {
          kind: 'smelt', workMs: SMITH_STRIKE_MS * Math.min(6, 2 + n),
          sig: () => String((S.rpg && S.rpg.inventory && S.rpg.inventory[key]) || 0),
          fail: 'Could not smelt',
        });
        return (
          <Row key={key} data-smelt-row={key} icon={BAR_THUMBS[key]}
            title={<>{r.name} <span data-smelt-have={key} style={{ color: '#8D9B98', fontWeight: 700 }}>×{Math.floor(inv[key] || 0)}</span></>}
            action={
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Btn on={on} primary data-smelt-one={key} onClick={() => go(1)}>{locked ? 'Locked' : 'Smelt'}</Btn>
                {can > 1 && <Btn on={on} data-smelt-all={key} onClick={() => go(can)}>All ({can})</Btn>}
              </div>
            }>
            <Cost icon={thumbFor(r.ore)} have={ore} need={r.oreCost} />
            <Chip icon={XP} color="#9FD3F0">+{r.xp}</Chip>
            {locked && <Lock>Smithing {r.minLvl}</Lock>}
          </Row>
        );
      })}
    </div>
  );
}

/* ── Forge: melee weapons (server gear.js forge_weapon) ── */
function ForgeTab({ S, R, inv, coins, lvl, ask, busy, wtype, setWtype }) {
  const keys = Object.keys(BLACKSMITH_TIERS);
  /* Everything you can make now, plus the NEXT one you can't -- the goal.
     The old list ran ten levels ahead; a wall of locks is not information. */
  let shown = keys.filter((k) => BLACKSMITH_TIERS[k].minLvl <= lvl);
  const next = keys.find((k) => BLACKSMITH_TIERS[k].minLvl > lvl);
  if (next) shown = shown.concat([next]);
  const stashFull = !!R.weapon && (R.weaponStash || []).length >= WEAPON_STASH_MAX;
  const cur = R.weapon && (R.weapon.type === 'greatsword' || R.weapon.type === 'sword') ? R.weapon : null;
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {['greatsword', 'sword'].map((t) => {
          const ic = weaponIcon(t, 'copper');
          return (
            <button key={t} data-forge-type={t} onClick={() => setWtype(t)}
              style={{ flex: 1, minHeight: 44, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 800,
                border: wtype === t ? '1px solid #D8AA58' : `1px solid ${C.line}`, background: wtype === t ? C.raised : C.card,
                color: wtype === t ? C.text : C.mute }}>
              <Icon src={ic.src} fallback={ic.fallback} size={24} />{TYPE_LABEL[t]}
            </button>
          );
        })}
      </div>
      {cur && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.mute, margin: '0 2px 8px' }}>
          <Icon {...(() => { const ic = weaponIcon(cur.type, cur.gearBase); return { src: ic.src, fallback: ic.fallback }; })()} size={18} />
          <span>Holding <b style={{ color: C.sub }}>{cur.name}</b></span>
          {stashFull && <Lock>Weapon bag full</Lock>}
        </div>
      )}
      {shown.map((key) => {
        const bt = BLACKSMITH_TIERS[key];
        const resKey = bt.wood ? 'wood_' + bt.wood : 'ore_' + bt.oreName + '_ore';
        const have = Math.floor(inv[resKey] || 0);
        const idx = keys.indexOf(key);
        const req = getGearStatReq(wtype, idx, R);
        const meets = req.value === 0 || (req.prog3 ? req.met : (R[req.stat] || 0) >= req.value);
        const skillOk = lvl >= bt.minLvl;
        const ok = skillOk && meets && have >= bt.oreCost && coins >= bt.goldCost && !stashFull;
        const ic = weaponIcon(wtype, key);
        const name = bt.label + ' ' + TYPE_LABEL[wtype];
        return (
          <Row key={key} data-forge-row={key} icon={ic.src} iconFallback={ic.fallback} title={name}
            badge={bt.slots > 1 ? bt.slots + '◆' : null}
            action={<Btn on={ok && !busy} primary data-forge-go={key} onClick={() => ask('forge', {
              type: 'forge_weapon', payload: { weaponType: wtype, tierKey: key, isWoodwork: false },
            }, {
              kind: 'forge', workMs: SMITH_STRIKE_MS * 4,
              sig: () => { const w = S.rpg && S.rpg.weapon; return w ? w.gearBase + ':' + w.type + ':' + (S.rpg.weaponStash || []).length : ''; },
              done: 'Forged ' + name + '!', fail: 'Could not forge',
            })}>Forge</Btn>}>
            {!skillOk && <Lock>Smithing {bt.minLvl}</Lock>}
            {skillOk && !meets && <Lock>{req.label} {req.value}</Lock>}
            <Cost icon={thumbFor(resKey)} have={have} need={bt.oreCost} />
            <Cost icon={COIN} have={coins} need={bt.goldCost} />
          </Row>
        );
      })}
    </div>
  );
}

/* ── Upgrade: hardening H0-H5 (server hardening.js) + taking a gem out
   (server amulet.js op:'extract') ── */
const H_ODDS = [80, 20, 5, 1, 0.5];
/* The worker's access gate (hardening.js _weaponTierIndex): a weapon of
   material tier i (1-based in its own table) needs Smithing i x 5.  Mirrored
   so the lock is shown instead of a button the worker will refuse. */
function hardenTier(w) {
  const gb = w && typeof w.gearBase === 'string' ? w.gearBase : '';
  const ww = gb.indexOf('ww_') === 0;
  const keys = Object.keys(ww ? WOODWORKING_TIERS : BLACKSMITH_TIERS);
  const i = keys.indexOf(ww ? gb.slice(3) : gb);
  if (i >= 0) return i + 1;
  const tm = (w && w.tierMult) || 1;
  return Math.max(1, Object.values(BLACKSMITH_TIERS).filter((t) => t.tierMult <= tm).length);
}
function UpgradeTab({ S, R, coins, lvl, caps, ask, busy }) {
  const w = R.weapon;
  const rows = [];
  if (S._serverCaps && S._serverCaps.harden && w) {
    const h = typeof w.hardness === 'number' ? w.hardness : 0;
    const maxed = h >= 5;
    const cost = 500 * Math.pow(4, h);
    const ic = weaponIcon(w.type, w.gearBase);
    const needLvl = hardenTier(w) * 5;
    const skillOk = lvl >= needLvl;
    rows.push(
      <Row key="harden" data-harden-row="1" icon={w.type === 'bow' ? '/icons/items/bow.webp' : w.type === 'staff' ? '/icons/items/staff.webp' : ic.src}
        iconFallback={ic.fallback} badge={'H' + h} title={maxed ? w.name + ' · max' : 'H' + h + ' → H' + (h + 1)}
        action={!maxed && <Btn on={skillOk && coins >= cost && !busy} primary data-harden-go="1" onClick={() => ask('harden', {
          type: 'broadcast', event: 'harden_weapon', payload: { slot: 'weapon' },
        }, {
          kind: 'harden', workMs: SMITH_STRIKE_MS * 3,
          /* harden_result (gameEvents) says win or lose; this only clears the busy state */
          sig: () => { const x = S.rpg && S.rpg.weapon; return x ? String(x.hardness || 0) + ':' + (x.temper || 0) + ':' + (S.rpg.coins || 0) : ''; },
        })}>Harden</Btn>}>
        {!maxed && !skillOk && <Lock>Smithing {needLvl}</Lock>}
        {!maxed && <Cost icon={COIN} have={coins} need={cost} />}
        {!maxed && <Chip color={H_ODDS[h] >= 20 ? C.good : '#E5B36A'}>{H_ODDS[h]}%</Chip>}
        {!maxed && h > 0 && <Chip color={C.mute}>Fail → H0</Chip>}
      </Row>,
    );
  }
  if (S._serverCaps && S._serverCaps.gemExtract) {
    const gemOf = (item, slot) => (slot === 'weapon' ? !!(item && (item.element1 || item.element2)) : !!(item && item.gem));
    const slots = [
      { slot: 'weapon', item: R.weapon, icon: R.weapon ? weaponIcon(R.weapon.type, R.weapon.gearBase) : null },
      { slot: 'amulet', item: R.amulet, icon: { src: '/icons/items/amulet.webp' + ITEMS_V } },
      { slot: 'shield', item: R.shield, icon: { src: '/icons/items/shield.webp' + ITEMS_V } },
    ];
    for (const s of slots) {
      if (!gemOf(s.item, s.slot)) continue;
      /* No tier tables, on purpose: the worker's _gemExtractCost mirrors the
         one-argument call (amulet.js), so this is the price it will charge. */
      const cost = gemExtractCost(s.item);
      rows.push(
        <Row key={'gem-' + s.slot} data-extract-row={s.slot} icon={(s.icon && s.icon.src) || GEM} iconFallback={s.icon && s.icon.fallback}
          badge="◆" title={'Take gem out of ' + (s.item.name || s.slot)}
          action={<Btn on={coins >= cost && !busy} onClick={() => ask('extract-' + s.slot, {
            type: 'amulet_forge_request', payload: { op: 'extract', target: s.slot },
          }, {
            kind: 'extract', workMs: SMITH_STRIKE_MS * 2,
            sig: () => JSON.stringify([S.rpg && S.rpg[s.slot] && (S.rpg[s.slot].gem || S.rpg[s.slot].element1 || S.rpg[s.slot].element2), S.rpg && S.rpg.coins]),
            done: 'Gem removed', fail: 'Could not remove the gem',
          })}>Take out</Btn>}>
          <Cost icon={COIN} have={coins} need={cost} />
        </Row>,
      );
    }
  }
  if (!rows.length) {
    return <div style={{ padding: '18px 8px', textAlign: 'center', color: C.mute, fontSize: 13 }}>Hold a weapon to upgrade it.</div>;
  }
  return <div>{rows}</div>;
}

/* ── Amulet: gold nuggets -> gold bars -> amulets (server amulet.js) ── */
function AmuletTab({ S, R, coins, lvl, ask, busy }) {
  const nug = R.goldNuggets || 0;
  const bars = R.goldBars || 0;
  return (
    <div>
      <Row data-goldbar-row="1" icon={GOLDBAR} title={<>Gold Bar <span style={{ color: '#8D9B98', fontWeight: 700 }}>×{bars}</span></>}
        action={<Btn on={nug >= NUGGETS_PER_BAR && !busy} onClick={() => ask('goldbar', {
          type: 'amulet_forge_request', payload: { op: 'smelt' },
        }, {
          kind: 'smelt', workMs: SMITH_STRIKE_MS * 2,
          sig: () => String((S.rpg && S.rpg.goldBars) || 0), done: '+1 Gold Bar', fail: 'Could not smelt',
        })}>Smelt</Btn>}>
        <Cost icon={NUGGET} have={nug} need={NUGGETS_PER_BAR} />
      </Row>
      {Object.keys(AMULET_TIERS).map((key) => {
        const at = AMULET_TIERS[key];
        const skillOk = lvl >= at.minLvl;
        const ok = skillOk && bars >= at.bars && coins >= at.goldCost;
        const worn = R.amulet && R.amulet.tier === key;
        return (
          <Row key={key} data-amulet-row={key} icon={'/icons/items/amulet.webp' + ITEMS_V} title={at.label + ' Amulet' + (worn ? ' · worn' : '')}
            action={<Btn on={ok && !busy} primary onClick={() => ask('amulet', {
              type: 'amulet_forge_request', payload: { op: 'craft', tierKey: key },
            }, {
              kind: 'amulet', workMs: SMITH_STRIKE_MS * 4,
              sig: () => JSON.stringify([S.rpg && S.rpg.amulet && S.rpg.amulet.tier, S.rpg && S.rpg.goldBars]),
              done: 'Crafted ' + at.label + ' Amulet!', fail: 'Could not craft',
            })}>Craft</Btn>}>
            {!skillOk && <Lock>Smithing {at.minLvl}</Lock>}
            <Cost icon={GOLDBAR} have={bars} need={at.bars} />
            <Cost icon={COIN} have={coins} need={at.goldCost} />
          </Row>
        );
      })}
    </div>
  );
}
