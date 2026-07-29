import React, { useRef } from 'react';
import { COL } from './dash/common.js';
import { getBagEntries } from './dash/bagModel.js';
import { BagTile } from './dash/InventoryPanel.jsx';
import { itemDetailBus } from './dash/itemDetailBus.js';
import { getEquippedSlots, GHOST_SRC } from './sheet/equipModel.js';
import { SKILL_ROSTER } from './sheet/skillsModel.js';
import { COMBAT_SKILLS, skillLevel } from './sheet/heroModel.js';
import { quickLifeSkill, quickCombatSkills } from './sheet/quickbarModel.js';
import { skillDetailBus } from './sheet/skillDetailBus.js';
import { dashboardPanelBus } from './dashboardPanelBus.js';
import { requestT2Category } from './dash/T2Panel.jsx';
import { STAT_TO_WEAPON_CAT } from '../../data/gameSystems.js';
import { quickCellSize } from './sheet/sheetGeometry.js';
import { actionBus } from './actionBus.js';

/* v2.3.1560 (owner): the ULTRA-COMPACT QUICK BAR — a persistent nine-cell
   row sitting directly above the toolbar icons, inside the bottom
   dashboard band.  Nine cells, fixed order, never resorted (the same
   spatial-memory rule the Skills grid follows):

     1-3  the first three bag entries (bagModel order: anchored first,
          then most-recent) — tap opens the item's detail popup
     4-5  the worn CHEST / LEGS — tap opens that slot's loadout picker,
          exactly like the Bag's Equipped cards
     6    the WEAPON — tap SWAPS to your next weapon, press-and-hold opens
          the picker (v2.3.1562, owner)
     7    the last life skill you gained XP in — tap opens Skills on that
          skill's detail view
     8-9  the last two combat skills you trained — tap opens that
          parent's tier-2 spend screen

   "All cells have their normal tap behavior" (owner): every cell routes
   into the SAME bus call its full-size counterpart uses, so there is no
   second implementation of equip/inspect/spend to drift.  The row is
   read-only state plus a bus call; nothing here can change game state on
   its own.

   The row hides while a panel is expanded — the open destination already
   shows these cells at full size, and keeping the strip would have cost
   the Bag its third item row (v2.3.1352 fought for that row).  It is
   persistent in the sense that matters: it is always there in the
   resting state you actually play in. */

const cellBase = {
  background: COL.tile,
  border: '1px solid rgba(139, 150, 149, 0.55)',
  borderRadius: 6,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  cursor: 'pointer',
  touchAction: 'manipulation',
  flex: 'none',
  overflow: 'hidden',
};

/* Shared pointer handler: hand the cell's own rect to the popup so it
   anchors beside the tapped cell (the ItemTile/Equipped convention). */
const withAnchor = (fn) => (e) => {
  e.stopPropagation();
  let anchor = null;
  try {
    const r = e.currentTarget.getBoundingClientRect();
    anchor = { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
  } catch (_e) {}
  fn(anchor);
};

/* v2.3.1562: the weapon cell is the one cell with two actions — a tap
   swaps, a hold opens the picker.  Weapon swap moved here off the left
   joystick's double-tap (owner): the gesture existed since v2.3.97 and
   the game's own owner did not know it was there, which is the verdict on
   hidden timing gestures.  It also had to be classified in under 220ms
   against the movement thumb's own taps and drags — the window was cut
   from 350ms in v2.3.98 precisely because "a quick re-press to start
   moving after a swap was being counted as a second tap".  A visible
   button has no window to miss and no gesture to lose a race with.
   The double-tap still works; it is now a shortcut, not the only way. */
const HOLD_MS = 420;

/* v2.3.1572: the row's grouping rhythm.  Mirrored by sheetGeometry's
   `fixed` width budget — change one and change the other. */
const GAP_WITHIN = 1;
const GAP_BETWEEN = 13;
const groupStyle = { display: 'flex', alignItems: 'center', gap: GAP_WITHIN, flex: 'none' };

const WeaponCell = ({ src, size, slotLabel, onHold }) => {
  const timer = useRef(null);
  const held = useRef(false);
  const anchorRef = useRef(null);
  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  const rectOf = (el) => {
    try {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    } catch (_e) { return null; }
  };
  return (
    <div
      title={slotLabel ? `${slotLabel} — tap to swap, hold to change` : 'Weapon'}
      onPointerDown={(e) => {
        e.stopPropagation();
        held.current = false;
        anchorRef.current = rectOf(e.currentTarget);
        clear();
        timer.current = setTimeout(() => {
          held.current = true;
          timer.current = null;
          if (onHold) onHold(anchorRef.current);
        }, HOLD_MS);
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        clear();
        /* The hold already fired — a tap must not ALSO swap behind the
           open picker. */
        if (held.current) return;
        actionBus.cycleWeapon();
      }}
      /* Cancel and leave both abort: sliding off the cell is how a player
         backs out of a press they didn't mean. */
      onPointerCancel={() => { clear(); held.current = true; }}
      onPointerLeave={() => { clear(); held.current = true; }}
      style={{ ...cellBase, width: size, height: size }}>
      {src
        ? <img src={src} alt="" draggable={false}
            style={{ width: '82%', height: '82%', objectFit: 'contain', pointerEvents: 'none' }} />
        : <span style={{ fontSize: Math.round(size * 0.42), opacity: 0.3, pointerEvents: 'none' }}>◇</span>}
      {/* The affordance marker.  Without it this reads as "the weapon you
          have" rather than "the weapon you can change" — which is the
          discoverability failure the double-tap gesture had. */}
      <span aria-hidden="true" style={{
        position: 'absolute', right: 1, bottom: 0,
        fontSize: 10, lineHeight: 1.2, fontWeight: 800,
        color: COL.accent || '#D8A94D',
        textShadow: '0 1px 2px rgba(9,14,17,.95)',
        pointerEvents: 'none',
      }}>⇄</span>
    </div>
  );
};

const IconCell = ({ src, alt, size, onTap, badge, dim, title }) => (
  <div onPointerUp={onTap ? withAnchor(onTap) : undefined} title={title || alt}
    style={{ ...cellBase, width: size, height: size, cursor: onTap ? 'pointer' : 'default' }}>
    {src
      ? <img src={src} alt="" draggable={false}
          style={{ width: '82%', height: '82%', objectFit: 'contain', opacity: dim ? 0.3 : 1, pointerEvents: 'none' }} />
      : <span style={{ fontSize: Math.round(size * 0.42), opacity: 0.3, pointerEvents: 'none' }}>◇</span>}
    {badge != null && (
      <span aria-hidden="true" style={{
        position: 'absolute', right: 1, bottom: 0,
        fontSize: 9, fontWeight: 800, lineHeight: 1.3,
        color: COL.text2, textShadow: '0 1px 2px rgba(9,14,17,.9)',
        fontVariantNumeric: 'tabular-nums', pointerEvents: 'none',
      }}>{badge}</span>
    )}
  </div>
);

export const QuickBar = ({ R }) => {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 390;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 844;
  const size = quickCellSize(vw, vh);

  const bag = getBagEntries(R).slice(0, 3);
  const equipped = getEquippedSlots(R || {});
  const bySlot = (s) => equipped.find(e => e.slot === s);
  /* Owner's order: chest, legs, weapon.  Weapon is last so the cell with
     the extra action sits at the group's edge, next to the divider —
     hardest cell to hit by accident when reaching for the one beside it. */
  const gear = ['chest', 'legs'].map(bySlot).filter(Boolean);
  const wpnSlot = bySlot('weapon');

  const lifeKey = quickLifeSkill(R);
  const lifeSkill = lifeKey ? SKILL_ROSTER.find(s => s.key === lifeKey) : null;
  const combatKeys = quickCombatSkills(R);

  const openPicker = (slot) => (anchor) => {
    const st = itemDetailBus.state;
    if (st && st.open && st.target && st.target.kind === 'loadout' && st.target.slot === slot) {
      itemDetailBus.close();
      return;
    }
    itemDetailBus.open({ kind: 'loadout', slot, anchor, panel: null });
  };

  return (
    <div className="bt-quickbar" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      /* v2.3.1572 (owner: "group the different groups of icons more
         closely together so it's visually more easy to differentiate"):
         PROXIMITY carries the grouping now.  The row used to be an even
         2px gap end to end with two hairlines doing the separating, which
         reads as nine identical cells with lines in it — the eye counts
         nine, not three.  Cells inside a group nearly touch and the
         groups sit 13px apart, so the three functions separate before you
         have looked at a single icon.  The hairlines are gone: with the
         gap doing the work they were a second, weaker signal saying the
         same thing.  GAP_BETWEEN must match sheetGeometry's width
         budget or the ninth cell falls off the right edge. */
      gap: GAP_BETWEEN, padding: '4px 6px', boxSizing: 'border-box',
      /* The bottom rule is the ONLY chrome — the row must read as part of
         the band, not as a second floating widget over the world. */
      borderBottom: `1px solid ${COL.divider}`,
    }}>
      {/* 1-3: bag.  BagTile carries the real tap behavior (detail popup,
          anchor badge, quantity badge) for both inventory and stash
          kinds; the style override drops its 100%-width aspect box for
          this row's fixed cell. */}
      <div style={groupStyle}>
        {[0, 1, 2].map(i => (
          bag[i]
            ? <div key={`q-bag-${i}`} style={{ width: size, height: size, flex: 'none' }}>
                <BagTile entry={bag[i]} style={{ width: size, height: size, aspectRatio: 'auto' }} />
              </div>
            : <IconCell key={`q-bag-${i}`} size={size} src={null} alt="Empty bag slot"
                onTap={() => dashboardPanelBus.open('bag')} title="Bag" />
        ))}
      </div>

      {/* 4-6: worn chest / legs / weapon — ghost pictogram when empty,
          and the ghost still opens the picker (that IS the empty slot's
          normal behavior in the Bag). */}
      <div style={groupStyle}>
      {gear.map(sl => (
        <IconCell key={`q-eq-${sl.slot}`} size={size}
          src={sl.iconSrc || GHOST_SRC[sl.slot]} dim={sl.ghost}
          alt={sl.label} title={sl.label}
          onTap={sl.pickerSlot ? openPicker(sl.pickerSlot) : undefined} />
      ))}

      {/* v2.3.1562: weapon — tap swaps, hold opens the picker.  With no
          weapon at all there is nothing to swap TO, so it falls back to
          the plain picker cell. */}
      {wpnSlot && !wpnSlot.ghost ? (
        <WeaponCell size={size} src={wpnSlot.iconSrc}
          slotLabel={R && R.activeSlot === 'ranged' ? 'Bow'
            : R && R.activeSlot === 'staff' ? 'Staff' : 'Melee'}
          onHold={openPicker('weapon')} />
      ) : (
        <IconCell size={size} src={GHOST_SRC.weapon} dim
          alt="Weapon" title="Weapon" onTap={openPicker('weapon')} />
      )}
      </div>

      <div style={groupStyle}>
      {/* 7: last life skill used. */}
      <IconCell size={size}
        src={lifeSkill ? lifeSkill.iconSrc : null}
        alt={lifeSkill ? lifeSkill.name : 'Life skills'}
        title={lifeSkill ? lifeSkill.name : 'Life skills'}
        badge={lifeSkill && R && R.lifeSkills && R.lifeSkills[lifeSkill.key]
          ? (R.lifeSkills[lifeSkill.key].level || 0) : null}
        onTap={() => {
          if (lifeSkill) skillDetailBus.open(lifeSkill.key);
          dashboardPanelBus.open('skills');
        }} />

      {/* 8-9: last two combat skills trained.  Same route the Hero
          tiles take — request the tier-2 category, then push the spend
          screen onto Hero (open first so the back-chip lands on Hero,
          not on whatever destination happened to be armed). */}
      {combatKeys.map((k, i) => {
        const s = COMBAT_SKILLS.find(c => c.key === k);
        if (!s) return <IconCell key={`q-cs-${i}`} size={size} src={null} alt="Combat skill" />;
        const cat = s.key === 'defense' ? 'defense'
          : s.key === 'vitality' ? 'hp'
          : s.key === 'endurance' ? 'endurance'
          : STAT_TO_WEAPON_CAT[s.key];
        return (
          <IconCell key={`q-cs-${s.key}`} size={size} src={s.iconSrc}
            alt={s.label} title={s.label}
            badge={R ? skillLevel(R, s.key) : null}
            onTap={() => {
              dashboardPanelBus.open('hero');
              if (cat) { requestT2Category(cat); dashboardPanelBus.push('t2'); }
            }} />
        );
      })}
      </div>
    </div>
  );
};
