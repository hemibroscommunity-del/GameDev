import React from 'react';
import { GearTab } from './GearTab.jsx';
import { WeaponBar } from './WeaponBar.jsx';
import { combatSkillLevel as _combatSkillLevel } from './combatSkill.js';

/* ═══ v2.3.4061: THE RESTING DASHBOARD IS THE GEAR TAB ═══
   This row held, since v2.3.1636, the bag (v2.3.1653: "the resting dashboard
   IS the bag", its five filter chips over it) beside the three combat-skill
   pills (Melee / Bow / Magic, v2.3.1648), in three shapes: the upright band
   (no props), the sideways column (`stacked`, `vwBasis`) and the computer's
   column (`desk`, v2.3.3687).

   The owner's new design (2026-11-02) makes it three panels -- INVENTORY |
   BRO | EQUIPMENT (GearTab.jsx, which says what each does).  What left, and
   where it went:
     the five chips     one filter pill and its menu (GearTab, itemCategory.js);
     the combat pills   each weapon cell's level badge and XP bar, the Gear
                        tab's STATS (the XP to the next level, Spend points),
                        and on a computer the weapon bar (WeaponBar.jsx).
                        Their reading rules -- the level off the prog3 blob
                        (v2.3.1922), the points this lane can spend (v2.3.2620),
                        the XP card the XP-fly lands on (v2.3.1874) -- moved
                        unchanged to combatSkill.js and the cells;
     the 8-slot rule    (v2.3.2163-2166: the sideways bag the upright one
                        rotated) -- the Gear tab lays itself out from its own
                        box, not the device: three across from 330 px, the bag
                        over BRO | EQUIPMENT narrower.
   The props are kept so BottomDashboard (another lane's file) is untouched:
   `desk` adds the weapon bar at the foot; `stacked` and `vwBasis` are read
   no more (the box decides).  v2.3.4081: nor is `box`, the one band's
   measured box (?oneband=1, OneBandColumns.jsx, v2.3.4072) -- the Gear tab
   measures the same box itself. */
export const DashColumns = ({ R, desk }) => <GearTab R={R} desk={!!desk} />;

/* v2.3.3769's chips at the foot of every page on a computer, now the weapon
   bar (WeaponBar.jsx); the name stays for BottomDashboard. */
export const DeskRailWeapons = WeaponBar;

/* v2.3.3769: shared with the folded rail; moved to combatSkill.js */
export const combatSkillLevel = _combatSkillLevel;
