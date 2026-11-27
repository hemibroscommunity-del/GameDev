/* ═══ v2.3.6689: BRO'S EQUIPMENT, A SHOWCASE (card UI2-gear PR 3, the build's step 5) ═══
 *
 * The card's reading 8: "Bro's Equipment door opens a SHOWCASE (the figure
 * and the nine worn cells in the same body shape, no bag; each cell opens the
 * one item page; "Manage Gear" for yourself, nothing to press for another
 * player)."  The specification's part 4.1: equipment under Bro is to LOOK AT
 * what is worn; managing it is Gear's (two panels, dash/GearPanels.jsx).
 *
 * A page of the frame ('broEquip', src/game/broHub.js BRO_HUB_PAGES; its
 * title "Equipment", Back to Bro).  Drawn:
 *   upright   the figure (CharacterView, the portrait compositor Gear's old
 *             middle column used), Manage Gear under it, and beside it the
 *             body: Gear's own EquippedBody, by the ONE shape table
 *             (src/game/gearShowcase.js GEAR_BODY), each cell Gear's own
 *             WornCell; a press opens the one item page
 *             (dash/itemPageOpen.js openItemPage, the same `cell` source as
 *             Gear's, so one item reads one set of facts);
 *   sideways  the figure, the body's one row, the button, in one line.
 * For another player (`who`; nothing opens one yet, step 9): no Manage Gear,
 * no figure (CharacterView draws YOUR wardrobe: a figure of you under their
 * name would be a lie), their name in the label, their cells read-only on the
 * item page.  The geometry: gearShowcase.js showcaseGeometry (every cell 44 px
 * or more); the box from a ResizeObserver's own entry (layout-reads way 5). */
import React from 'react';
import { Ui2Action, ui2RootClass } from '@/ui/kit/index.js';
import { CharacterView } from './CharacterView.jsx';
import { EquippedBody, useGearBox } from '../dash/GearPanels.jsx';
import { openItemPage } from '../dash/itemPageOpen.js';
import { getActiveWeapon } from '@/data/gameSystems.js';
import { showcaseOf, showcaseItemSource, showcaseGeometry } from '@/game/gearShowcase.js';
import { SAY } from '@/data/say/gearShowcase.js';
import { say } from '@/game/say.js';
import '../dash/gearPanels.css';

const safe = (f, d) => { try { const v = f(); return v == null ? d : v; } catch (e) { return d; } };

/**
 * S         the game's state, from the parent (BroCard's)
 * who       whose (null: yours)
 * onManage  Manage Gear's road (BroCard openGear)
 */
export function GearShowcase({ S, who, onManage }) {
  const sc = showcaseOf(who == null ? null : who);
  const R = sc.self ? ((S && S.rpg) || {}) : ((who && who.rpg) || {});
  const [ref, box] = useGearBox();
  const geo = showcaseGeometry(box.w, box.h, sc.manage);
  const tap = (cell) => { const src = showcaseItemSource(R, cell, sc.self ? null : who); if (src) openItemPage(src); };
  const weapon = sc.self ? safe(() => getActiveWeapon(R), null) : null;
  const manage = sc.manage ? (
    <Ui2Action c="gold" label={say(SAY, 'gearShowcase.manage')} aria-label={say(SAY, 'gearShowcase.manageAria')}
      data-gear-manage="" style={{ minHeight: 44, flex: 'none', whiteSpace: 'nowrap' }}
      onClick={(e) => { e.stopPropagation(); if (onManage) onManage(); }} />
  ) : null;
  const figure = sc.self && geo.fig >= 40 ? (
    <div data-gear-figure="" style={{ flex: 'none', width: geo.figW, height: geo.fig, overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
      <CharacterView size={geo.fig} weapon={weapon} shield={R.shield} dir="southwest" crop />
    </div>
  ) : null;
  const whose = sc.self ? null : (
    <div data-gear-whose="" style={{ flex: 'none', fontSize: 12, lineHeight: '16px', color: 'var(--ui2-text-ivory)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {say(SAY, 'gearShowcase.whose', { name: sc.owner || '?' })}
    </div>
  );
  const body = <EquippedBody R={R} ws={null} geo={{ short: geo.short, bodyCell: geo.bodyCell, torsoW: geo.torsoW }} tap={tap} />;
  return (
    <div ref={ref} className={ui2RootClass('u2-gp')} data-gear-showcase={sc.self ? 'self' : 'other'} data-gear-short={geo.short ? '1' : undefined}
      aria-label={say(SAY, 'gearShowcase.label')}
      style={{ height: '100%', minHeight: 0, boxSizing: 'border-box', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      {box.w > 0 ? (geo.short ? (
        <>
          {figure}{whose}
          <div data-gear-show-body="" style={{ flex: 'none', width: geo.bodyW, height: '100%' }}>{body}</div>
          {manage}
        </>
      ) : (
        <>
          <div data-gear-show-col="" style={{ flex: '1 1 auto', minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            {whose}{figure}{manage}
          </div>
          <div data-gear-show-body="" style={{ flex: 'none', width: geo.bodyW, height: '100%', display: 'flex', alignItems: 'center' }}>{body}</div>
        </>
      )) : null}
    </div>
  );
}

export default GearShowcase;
