import React from 'react';
import { COL } from './common.js';
import { WEAPON_SKILLS, combatSkillState } from './combatSkill.js';
import { gearCell } from './itemCategory.js';
import { gearTabBus } from './gearTabBus.js';
import { wpnIconSrc } from '../sheet/equipModel.js';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { actionBus } from '../actionBus.js';
import { getState } from './common.js';
import { WEAPON_KEYS } from '@/game/deskKeys.js';

/* ═══ v2.3.3940: THE COMPUTER'S WEAPON BAR ═══
   The owner, playing on a computer: "The weapon equipping system is
   confusing... make a hotbar here for left hand weapon, armor, right hand etc".
   These three chips (DeskRailWeapons since v2.3.3769, at the foot of every
   page and of the Gear tab) showed each combat skill's picture and level, and
   a click only opened the dashboard -- the confusion.  Now each is a WEAPON:
   its picture (the weapon in that slot, or the skill's faint mark when the
   slot is empty), its key (1, 2, 3 -- deskKeys.js WEAPON_KEYS, worn through
   data-key), its skill's level, and the one in your hand ringed in gold.  A
   click takes that weapon up: the 1/2/3 keys' own pick (_desktopSelectSlot,
   through actionBus), which tells the worker (set_active_slot).  A click on
   an empty slot opens the Gear tab on that cell, the bag filtered to what
   fits it.  Phone weapon switching is the swap button's (WeaponSwapButton),
   untouched. */
const CELL_FOR = { power: 'sword', agility: 'bow', mind: 'staff' };

export const WeaponBar = ({ R, w, row }) => {
  const rpg = R || {};
  const hand = rpg.activeSlot || 'melee';
  return (
    <div data-weapon-bar="" style={row ? { display: 'flex', flexDirection: 'row', gap: 4 } : { display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
      {WEAPON_SKILLS.map((s) => {
        const st = combatSkillState(rpg, s);
        const cell = gearCell(CELL_FOR[s.key]);
        const wpn = rpg[cell.field] || null;
        const on = hand === cell.active;
        const key = WEAPON_KEYS[cell.active];
        const pic = wpn ? wpnIconSrc(rpg, wpn) : s.iconSrc;
        const name = wpn ? (wpn.name || cell.label) : `No ${cell.label.toLowerCase()}`;
        return (
          <div key={s.key}
            role="button"
            data-rail-weapon={s.key}
            data-weapon-slot={cell.active}
            data-weapon-on={on ? '1' : undefined}
            data-key={key}
            aria-pressed={on}
            aria-label={`${name}, ${s.label} level ${st.lvl}`}
            title={`${name} (${key}) — ${s.label} Lv ${st.lvl}`}
            onPointerUp={(e) => {
              e.stopPropagation();
              if (!wpn) {
                if (!(gearTabBus.state.sel && gearTabBus.state.sel.cell === cell.id)) gearTabBus.tapCell(cell.id);
                dashboardPanelBus.open('dashboard');
                return;
              }
              if (on) return;
              if (!actionBus.selectSlot(cell.active)) {
                /* the game is not mounted: the pick, told to the worker, alone */
                const S = getState();
                if (S && S.rpg) {
                  S.rpg.activeSlot = cell.active;
                  try { if (S.channel) S.channel.send({ type: 'set_active_slot', payload: { slot: cell.active } }); } catch (err) { /* offline */ }
                }
              }
            }}
            style={{
              ...(row ? { flex: '1 1 0', minWidth: 0, height: 48, flexDirection: 'row', gap: 8 } : { width: w, height: 52, flexDirection: 'column', gap: 1 }),
              boxSizing: 'border-box', position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: on ? 'rgba(234,198,117,.12)' : COL.wellSoft,
              border: `1px solid ${on ? COL.focus : COL.tileBor}`,
              boxShadow: on ? `inset 0 0 0 1px ${COL.focus}` : undefined,
              borderRadius: 11,
              cursor: 'pointer', touchAction: 'manipulation',
            }}>
            <img src={pic} alt="" draggable={false}
              style={{ width: 28, height: 28, objectFit: 'contain', pointerEvents: 'none', opacity: wpn ? 1 : 0.35 }} />
            <span style={{ fontSize: row ? 13 : 11, fontWeight: 800, color: COL.text, lineHeight: 1, letterSpacing: '.04em', pointerEvents: 'none' }}>LV {st.lvl}</span>
            {st.unspent > 0 && (
              <span aria-hidden="true" style={{
                position: 'absolute', top: 2, left: 4, fontSize: 11, fontWeight: 900, lineHeight: 1,
                color: COL.accent, textShadow: '0 1px 2px rgba(9,14,17,.85)', pointerEvents: 'none',
              }}>+{st.unspent}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};
