import React from 'react';
import { LIFE_SKILL_XP, WEAPON_STASH_MAX, WOODWORKING_TIERS, getGearStatReq, getEquipReqLabel, STAT_LABELS } from '@/data/index.js';
import { thumbFor } from '@/ui/mobile/dash/InventoryPanel.jsx';
import { pushDmgPopup } from '@/game/combatHelpers.js';
import { cue } from '@/game/eventSounds.js'; /* v2.3.3343: the woodworker's results heard */
import { celebrateLifeSkillLevel } from '@/game/levelCelebration.js'; /* v2.3.2591: a crafting level gets the same celebration as a gathering one */
import { TrapsTab } from './TrapsTab.jsx'; /* v2.3.3120: box traps from logs */
import { HardenedWoodTab } from './HardenedWoodTab.jsx'; /* v2.3.3139: five logs into one hardened wood */
import { hardenCost, hardenIsWood, hardenTierOf, hardenLevelFor } from '@/data/hardenCosts.js'; /* v2.3.3139 / v2.3.3481 / v2.3.3524 */
import { weaponDisplayName } from '@/ui/mobile/sheet/equipModel.js';
import { TRAP_ICON_URL } from '@/rendering/controlsPreload.js';
import { OWNER_ICON } from '@/data/ownerIcons.js';
import { C, ITEMS_V, COIN, XP, Icon, Cost, Chip, Lock, Btn, Row } from './BenchParts.jsx';

/* ═══ v2.3.3657: THE WOODWORKER, REBUILT AFTER THE BLACKSMITH ═══
 *
 * The owner: "I also want the woodworking menu rehauled and modeled after the
 * blacksmith menu."  The Blacksmith's window was rebuilt in v2.3.2826 ("Nobody
 * wants to read a novel to know how it works"); this one had kept the older
 * layout: a sentence over a two-by-two block of choices, a list of rows each
 * ending in three lines of small print, and the hardening box under the list.
 * It is now the Blacksmith's window, part for part (BenchParts.jsx: the same
 * Row, Cost, Chip, Lock and Btn):
 *   - the header: the skill's picture, "WOODWORKER", its level and XP bar;
 *   - a row of tabs with pictures: Bow, Staff, Hardened (the hardened wood),
 *     Upgrade (hardening the bow and staff you hold) and Traps;
 *   - each recipe a row: its picture, its name, a chip a cost (the wood and
 *     the gold, HAVE/NEED in green or red), the XP it pays, the one thing that
 *     locks it, and one button;
 *   - what you can make now and the NEXT wood, locked, as the goal (the
 *     Blacksmith's rule; v2.3.3481 here).
 * And it keeps the Blacksmith's rule about the worker: NOTHING IS PREDICTED.
 * The old window took the wood and gold out of the bag, built the bow and put
 * it in your hand in the browser before the worker answered, which an answer
 * that never came left standing until the next update.  A press now asks
 * (forge_weapon, harden_weapon) and waits for the player_state that answers
 * it: the change it sees becomes "Made Pine Bow!", or it says so if nothing
 * came back in 3.5 s.
 *
 * Shown against the worker's caps, read straight off S._serverCaps so the caps
 * audit sees each gate: hardenedwood (the Hardened tab), harden (Upgrade),
 * trapcraft (Traps), tourgear (a bow or staff of hardened wood, and the gate
 * wearing it asks), hardenmats / hardenwoodskill / forgeladder / hardenkeep
 * (what hardening takes and asks).
 *
 * Test hooks: data-woodwork, data-ww-type (the tabs; mp-hardenbars),
 * data-ww-row / data-ww-go / data-ww-holding, data-harden-row (bow / staff) /
 * data-harden-go / data-harden-mat / data-harden-gate, and the two tabs' own
 * (data-hw-*, data-traps-*). */

const BOW_ICON = '/icons/items/bow.webp' + ITEMS_V;
const STAFF_ICON = '/icons/items/staff.webp' + ITEMS_V;
const TYPE_WORD = { bow: 'Bow', staff: 'Staff' };
const SLOT_OF = { bow: 'rangedWeapon', staff: 'staffWeapon' };
const H_ODDS = [80, 20, 5, 1, 0.5];

export function WoodworkPanel({ rpgState, stateRef }) {
  const S = stateRef.current || {};
  const R = rpgState || {};
  const inv = R.inventory || {};
  const coins = R.coins || 0;
  const ww = (R.lifeSkills && R.lifeSkills.woodworking) || { level: 1, xp: 0 };
  const lvl = ww.level || 1;

  const tabs = [
    { id: 'bow', label: 'Bow', icon: BOW_ICON },
    { id: 'staff', label: 'Staff', icon: STAFF_ICON },
    (S._serverCaps && S._serverCaps.hardenedwood) && { id: 'hardwood', label: 'Hardened', icon: thumbFor('hardened_pine') },
    (S._serverCaps && S._serverCaps.harden) && { id: 'upgrade', label: 'Upgrade', icon: OWNER_ICON.smithHammer.src },
    (S._serverCaps && S._serverCaps.trapcraft) && { id: 'traps', label: 'Traps', icon: TRAP_ICON_URL },
  ].filter(Boolean);
  /* the tab is kept on S, as the old window kept its choice (`_wwType`) */
  const [tabWant, setTabState] = React.useState(() => (S._wwType && tabs.some((t) => t.id === S._wwType)) ? S._wwType : tabs[0].id);
  const setTab = (id) => { S._wwType = id; setTabState(id); };
  const tab = tabs.some((t) => t.id === tabWant) ? tabWant : tabs[0].id;

  /* ── what the worker did (SmithyPanel's own pattern) ──
     A press records what it expects to change; when the player_state that
     answers it lands and the thing HAS changed, say so.  3.5 s of silence is a
     refusal (the worker drops a request it will not settle). */
  const pending = React.useRef(null);
  const [busy, setBusy] = React.useState(null);
  const lvlSeen = React.useRef(lvl);
  const say = (text, color) => { try { const P = S.player; if (P) pushDmgPopup(S, P.x, P.y - 34, text, color || C.brass); } catch (e) { /* popup only */ } };
  React.useEffect(() => {
    const p = pending.current;
    if (p && p.sig() !== p.before) {
      pending.current = null; setBusy(null);
      if (p.done) say(p.done);
      /* a hardening is heard from its own answer (gameEvents.js harden_result:
         hardenOk / hardenFail) */
      if (p.kind === 'craft') {
        cue('woodwork');
        /* the old window set this before the worker answered; a dormant chain
           still reads it (gameSystems.js bron_3) -- now only once it did */
        try { const RR = S.rpg; if (RR) { if (!RR._questFlags) RR._questFlags = {}; RR._questFlags.craftedWoodWeapon = true; } } catch (e) { /* a flag */ }
      }
    }
    if (lvl > lvlSeen.current) {
      /* the Hardened and Traps tabs' makes celebrate from their own receipts
         (wsClient hardened_wood_result, game/trapping.js); a craft here */
      if (p && p.kind === 'craft') { try { celebrateLifeSkillLevel(S, 'woodworking', lvl, lvlSeen.current); } catch (e) { /* visual */ } }
    }
    lvlSeen.current = lvl;
  });
  React.useEffect(() => {
    if (!busy) return undefined;
    const t = setTimeout(() => {
      const p = pending.current;
      if (p && p.fail) { say(p.fail, C.bad); cue('forgeFail'); }
      pending.current = null; setBusy(null);
    }, 3500);
    return () => clearTimeout(t);
  }, [busy]);
  const ask = (key, msg, { sig, done, fail, kind }) => {
    if (!S.channel || busy) return;
    try { S.channel.send(msg); } catch (e) { return; }
    pending.current = { key, sig, before: sig(), done, fail, kind };
    setBusy(key);
  };

  const need = LIFE_SKILL_XP(lvl);
  const pct = Math.max(0, Math.min(1, (ww.xp || 0) / need));

  return (
    <div data-woodwork="1" style={{ margin: -20, background: C.sheet, borderRadius: 14, fontFamily: "'Source Sans 3',sans-serif",
      display: 'flex', flexDirection: 'column', maxHeight: '100%', textAlign: 'left' }}>
      {/* header: who you are at this bench */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 44px 10px 14px', flex: 'none' }}>
        <Icon src="/icons/ui/skill-woodworking.webp?v=2.3.1224" size={30} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.10em', textTransform: 'uppercase', color: C.text }}>Woodworker</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <span data-woodwork-level={lvl} style={{ fontSize: 12, fontWeight: 800, color: C.brass }}>Lv {lvl}</span>
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.well, overflow: 'hidden' }}>
              <div style={{ width: `${pct * 100}%`, height: '100%', background: 'linear-gradient(90deg,#C9923E,#EAC675)' }} />
            </div>
          </div>
        </div>
      </div>
      {/* tabs */}
      <div data-ww-tabs={tabs.length} style={{ display: 'flex', gap: 3, margin: '0 12px 10px', padding: 3, borderRadius: 10, background: C.well, flex: 'none' }}>
        {tabs.map((t) => (
          <button key={t.id} data-ww-type={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, minHeight: 48, border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
              background: tab === t.id ? C.raised : 'transparent', boxShadow: tab === t.id ? `inset 0 -2px 0 ${C.brass}` : 'none',
              color: tab === t.id ? C.text : C.mute, fontSize: 11, fontWeight: 800 }}>
            <Icon src={t.icon} size={22} />{t.label}
          </button>
        ))}
      </div>
      <div className="ls-scrollbody" style={{ overflowY: 'auto', touchAction: 'pan-y', flex: '1 1 auto', minHeight: 0, padding: '0 12px 12px' }}>
        {(tab === 'bow' || tab === 'staff') && <CraftTab {...{ S, R, inv, coins, lvl, ask, busy, type: tab }} />}
        {tab === 'hardwood' && <HardenedWoodTab rpgState={R} stateRef={stateRef} />}
        {tab === 'upgrade' && <UpgradeTab {...{ S, R, coins, lvl, ask, busy }} />}
        {tab === 'traps' && <TrapsTab rpgState={R} stateRef={stateRef} />}
      </div>
    </div>
  );
}

/* ── Bow / Staff: a weapon of each wood (server gear.js forge_weapon) ──
   Every wood you can work now, plus the NEXT one -- the goal.  Against a worker
   with the tour's gear rules (caps.tourgear) a wood that has a hardened wood is
   made from five of it (the tier's `hardened`, `hardenedCost`) and the bench
   asks what WEARING the piece asks (getEquipReqLabel, the equip gate's own
   badge); an older worker takes the logs and asks tierIndex x 5. */
function CraftTab({ S, R, inv, coins, lvl, ask, busy, type }) {
  const tg = !!(S._serverCaps && S._serverCaps.tourgear);
  const keys = Object.keys(WOODWORKING_TIERS);
  let shown = keys.filter((k) => WOODWORKING_TIERS[k].minLvl <= lvl);
  const next = keys.find((k) => WOODWORKING_TIERS[k].minLvl > lvl);
  if (next) shown = shown.concat([next]);
  const slot = SLOT_OF[type];
  const cur = R[slot] || null;
  const stashFull = !!cur && (R.weaponStash || []).length >= WEAPON_STASH_MAX;
  const word = TYPE_WORD[type];
  const icon = type === 'bow' ? BOW_ICON : STAFF_ICON;
  return (
    <div data-ww-section={type}>
      {cur && (
        <div data-ww-holding={cur.gearBase || ''} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.mute, margin: '0 2px 8px' }}>
          <Icon src={icon} size={18} />
          <span>Holding <b style={{ color: C.sub }}>{weaponDisplayName(cur)}</b></span>
          {stashFull && <Lock>Weapon bag full</Lock>}
        </div>
      )}
      {shown.map((key) => {
        const wt = WOODWORKING_TIERS[key];
        const hw = tg && wt.hardened ? wt.hardened : null;
        const resKey = hw || ('wood_' + wt.wood);
        const resNeed = hw ? wt.hardenedCost : wt.woodCost;
        const have = Math.floor(inv[resKey] || 0);
        let req = getGearStatReq(type, keys.indexOf(key), R);
        if (tg) {
          const eq = getEquipReqLabel({ type, gearBase: 'ww_' + key, tierMult: wt.tierMult }, 'weapon', R);
          req = eq ? { stat: eq.stat, label: eq.label, value: eq.req, met: eq.met !== false, prog3: !!eq.prog3 }
            : { stat: type, label: '', value: 0, met: true, prog3: true };
        }
        const meets = req.value === 0 || (req.prog3 ? req.met : (R[req.stat] || 0) >= req.value);
        const skillOk = lvl >= wt.minLvl;
        const ok = skillOk && meets && have >= resNeed && coins >= wt.goldCost && !stashFull;
        const name = wt.label + ' ' + word;
        /* the worker pays a tier's `xp`, else 5 x its level (gear.js) */
        const xp = wt.xp || (wt.minLvl || 1) * 5;
        return (
          <Row key={key} data-ww-row={key} icon={icon} title={name}
            badge={wt.slots > 1 ? wt.slots + '◆' : null}
            action={<Btn on={ok && !busy} primary data-ww-go={key} onClick={() => ask('craft-' + key, {
              type: 'forge_weapon', payload: { weaponType: type, tierKey: key, isWoodwork: true },
            }, {
              kind: 'craft',
              sig: () => { const w = S.rpg && S.rpg[slot]; return w ? w.gearBase + ':' + w.type + ':' + (S.rpg.weaponStash || []).length : ''; },
              done: 'Made ' + name + '!', fail: 'Could not make it',
            })}>{skillOk ? 'Make' : 'Locked'}</Btn>}>
            {!skillOk && <Lock>Woodworking {wt.minLvl}</Lock>}
            {skillOk && !meets && <Lock>{req.prog3 ? req.label : (STAT_LABELS[req.stat] || req.stat)} {req.value}</Lock>}
            <Cost icon={thumbFor(resKey)} have={have} need={resNeed} />
            <Cost icon={COIN} have={coins} need={wt.goldCost} />
            <span data-ww-xp={xp} style={{ display: 'contents' }}><Chip icon={XP} color="#9FD3F0">+{xp}</Chip></span>
          </Row>
        );
      })}
    </div>
  );
}

/* ── Upgrade: hardening the bow and the staff you hold, H0-H5 (server
   hardening.js harden_weapon) ──
   The Blacksmith's Upgrade tab, for the two weapons this bench makes: a row
   each, its cost the bow's or staff's own wood's HARDENED WOOD and gold
   (data/hardenCosts.js, the worker's ladder), the odds, and what a failure
   costs.  Against caps.hardenwoodskill a bow's or staff's hardening asks
   WOODWORKING (the owner, 2026-10-19: "Do woodworking"), at the level that
   makes the wood (caps.forgeladder; else 5 x its tier) -- the row's lock and
   `data-harden-gate`; an older worker gates it on Blacksmithing and says so in
   its refusal. */
function UpgradeTab({ S, R, coins, lvl, ask, busy }) {
  const SC = S._serverCaps || {};
  const rows = [];
  for (const type of ['bow', 'staff']) {
    const slot = SLOT_OF[type];
    const w = R[slot];
    if (!w) continue;
    const h = typeof w.hardness === 'number' ? w.hardness : 0;
    const maxed = h >= 5;
    const hc = hardenCost(w, h, !!SC.hardenmats, !!SC.hardenedwood, slot);
    const haveMats = hc.material ? Math.floor(((R.inventory || {})[hc.material]) || 0) : 0;
    const matsOk = !hc.material || haveMats >= hc.amount;
    /* read straight off S._serverCaps, so the caps audit sees the gate */
    const byWood = !!(S._serverCaps && S._serverCaps.hardenwoodskill) && hardenIsWood(w, slot);
    const needLvl = byWood ? (SC.forgeladder ? hardenLevelFor(w, slot) : hardenTierOf(w) * 5) : 0;
    const skillOk = lvl >= needLvl;
    const keep = !!SC.hardenkeep;
    rows.push(
      <Row key={type} data-harden-row={type} data-harden-gate={byWood ? 'woodworking:' + needLvl : 'blacksmithing'}
        icon={type === 'bow' ? BOW_ICON : STAFF_ICON} badge={'H' + h}
        title={maxed ? weaponDisplayName(w) + ' · max' : weaponDisplayName(w) + ' · H' + h + ' → H' + (h + 1)}
        action={!maxed && <Btn on={skillOk && coins >= hc.gold && matsOk && !busy} primary data-harden-go={type} onClick={() => ask('harden-' + type, {
          type: 'broadcast', event: 'harden_weapon', payload: { slot },
        }, {
          kind: 'harden',
          /* harden_result (gameEvents) says win or lose; this only clears the busy state */
          sig: () => { const x = S.rpg && S.rpg[slot]; return x ? String(x.hardness || 0) + ':' + (x.temper || 0) + ':' + (S.rpg.coins || 0) + ':' + (hc.material ? ((S.rpg.inventory || {})[hc.material] || 0) : '') : ''; },
        })}>Harden</Btn>}>
        {!maxed && !skillOk && <Lock>Woodworking {needLvl}</Lock>}
        {!maxed && hc.material && <span data-harden-mat={hc.material} style={{ display: 'contents' }}><Cost icon={thumbFor(hc.material)} have={haveMats} need={hc.amount} /></span>}
        {!maxed && <Cost icon={COIN} have={coins} need={hc.gold} />}
        {!maxed && <Chip color={H_ODDS[h] >= 20 ? C.good : '#E5B36A'}>{H_ODDS[h]}%</Chip>}
        {/* v2.3.3529: against caps.hardenkeep a failure keeps the level, the
            gold and the hardened wood still spent; an older worker drops it
            back */}
        {!maxed && h > 0 && <Chip color={C.mute}>{keep ? 'Fail keeps H' + h : 'Fail → H0'}</Chip>}
      </Row>,
    );
  }
  if (!rows.length) {
    return <div style={{ padding: '18px 8px', textAlign: 'center', color: C.mute, fontSize: 13 }}>Hold a bow or a staff to upgrade it.</div>;
  }
  return <div>{rows}</div>;
}

export default WoodworkPanel;
