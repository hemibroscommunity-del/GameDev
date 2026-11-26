/* ═══ v2.3.6683: BRO'S LANDING, SIX DOORS AND NOTHING ELSE (card UI2-bro, the build's step 3) ═══
 *
 * The owner, 2026-11-25: "Bro landing: Six buttons only under contextual
 * header. Character, Combat, Equipment / Life Skills, Feats, Pets. Remove the
 * redundant player/tap banner."  Six equal kit tiles from the frame's own
 * grid (dash/MenuGrid.jsx: three across and two down upright and on a
 * computer, one row of six on a phone on its side), each its picture and one
 * word; no portrait, no banner, no page marks.  The rules are
 * src/game/broHub.js's; this file only draws them and acts on a tap with
 * today's own roads.
 *
 * The game's state comes from the parent (open-hand.test): BroCard hands the
 * points waiting, Life Skills' "new", the worker's caps and whose page.
 * Another player's page (`who`, built for step 9; nothing opens it yet)
 * names its owner in one compact line over the grid and carries none of the
 * owner's marks. */
import React from 'react';
import { MenuGrid, doorWord } from '../dash/MenuGrid.jsx';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { infoPopupBus } from '../infoPopupBus.js';
import { broHubDoors, broHubMarks, broHubOpen, broHubWhose } from '@/game/broHub.js';
import { SAY } from '@/data/say/dashFrame.js';
import { say } from '@/game/say.js';
import { ui2RootClass } from '@/ui/kit/index.js';   /* the kit's look: the Bro page is a PANELS page, not the frame's own */

const GRID = 'bro';   /* the grid's QA name (data-dash-grid) */

function whoseWords(w) {
  if (!w) return null;
  return w.key === 'dashFrame.whose' ? say(SAY, 'dashFrame.whose', { name: w.name }) : say(SAY, 'dashFrame.whoseUnknown');
}

/**
 * points   the points waiting (yours: HeroExpanded's total)
 * lifeNew  a life skill's level-up not seen yet
 * caps     the worker's caps (S._serverCaps; null: not known yet)
 * who      whose page (null: yours)
 * onGear   Equipment's road (BroCard openGear)
 */
export function BroLanding({ points, lifeNew, caps, who, onGear }) {
  const doors = broHubDoors(caps);
  const marks = broHubMarks(points, lifeNew, who);
  const whose = whoseWords(broHubWhose(who));
  const onDoor = (d, from) => {
    if (d.locked) {
      try { infoPopupBus.open({ title: doorWord(d.word), body: say(SAY, 'dashFrame.notOffered') }); } catch (e) { /* no popup: the tile is greyed */ }
      return;
    }
    const o = broHubOpen(d.opens);
    if (!o) return;
    if (o.kind === 'gear') { if (onGear) onGear(); return; }
    dashboardPanelBus.go({ type: 'push', id: o.page, from, who: who == null ? undefined : who });
  };
  return (
    <div className={ui2RootClass()} data-bro-landing={who == null ? 'self' : 'other'} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, gap: 4, padding: 4, boxSizing: 'border-box' }}>
      {whose ? (
        <div data-bro-whose="" style={{ flex: 'none', fontSize: 12, lineHeight: '16px', color: 'var(--ui2-text-ivory)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 2px' }}>{whose}</div>
      ) : null}
      <div style={{ flex: 1, minHeight: 0 }}>
        <MenuGrid label={GRID} doors={doors} marks={marks} onDoor={onDoor} />
      </div>
    </div>
  );
}

export default BroLanding;
