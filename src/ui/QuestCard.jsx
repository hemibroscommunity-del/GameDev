/* ═══ v2.3.3918: THE PINNED QUEST CARD, TOP LEFT ═══
 *
 * Moved out of BroTown.jsx (where it was `data-quest-hud`, v2.3.1665 on) so
 * the card's rules live in one small file.  What it says is
 * src/game/questCard.js's (the owner's "[Into the Wild · 3/5 · Defeat 5
 * monsters]"); this file only draws it.
 *
 *   - a quest in hand: the title, "3/5" at its right, the objective line; the
 *     green check (QUEST_ART.check, v2.3.3048) ONLY once it is ready, with
 *     "Done! Go back to <giver>".  A tap opens that quest's page (the quest
 *     page's Track picks which quest this is: game/trackedQuest.js).
 *   - between two quests: the tour's next step and who gives it (v2.3.3525,
 *     unchanged), taking no taps.
 *
 * v2.3.3918: the v2.3.1714 tap-to-fold is retired -- the owner's tracker is
 * "tappable" to open the quest, and a compact card no longer needs folding.
 * The old 'bt_quest_hud_collapsed' preference is simply no longer read.
 *
 * Placed at top: var(--bt-hud-top, 56px), so a frame above it (the top bar's
 * player status) can push it down by setting the variable.
 */
import React from 'react';
import {
  QUEST_CHAINS, QUEST_STATUS, questObjectiveDone, questSteps,
} from '@/data/gameSystems.js';
import { tourOffer } from '@/game/questRoute.js';
import { TOUR_MEET } from '@/game/tour.js';
import { folkDisplayName } from '@/data/folkNames.js';   /* v2.3.4021: the giver's nickname */
import { trackedFirst } from '@/game/trackedQuest.js';
import { questCardWords } from '@/game/questCard.js';
import { QUEST_ART } from '@/ui/panels/questArt.jsx';
import { questDetailBus } from '@/ui/mobile/sheet/questDetailBus.js';
import { dashboardPanelBus } from '@/ui/mobile/dashboardPanelBus.js';

const GOLD = '#D8A94D';
const GREEN = '#59BF91';

const boxStyle = (extra) => ({
  position: 'absolute',
  top: 'var(--bt-hud-top, 56px)',
  left: 8,
  zIndex: 17,
  background: 'rgba(17,25,29,.85)',
  padding: '4px 10px',
  borderRadius: 6,
  /* v2.3.1711: 248 keeps the objective to one or two lines on a 390px phone */
  maxWidth: 248,
  ...extra,
});
const markStyle = { width: 18, height: 18, flex: '0 0 auto', objectFit: 'contain' };
const titleRow = (color) => ({
  fontSize: 13, fontWeight: 700, lineHeight: 1.25,
  display: 'flex', alignItems: 'center', gap: 6, color,
});
/* v2.3.1711: .72 white clears 4.5:1 on the slate */
const subLine = { fontSize: 11, lineHeight: 1.3, marginTop: 1, color: 'rgba(255,255,255,.72)' };

/* v2.3.3918: the card's tap -- the quest's own page in the quest screens.
   One place, so a move of the quest pages (under the "Bro" tab) changes it
   once. */
export function openQuestPage(qid) {
  try {
    questDetailBus.select(qid);
    dashboardPanelBus.open('quests');
    dashboardPanelBus.push('questDetail');
  } catch (e) { /* a sheet not mounted yet: nothing to open */ }
}

export default function QuestCard({ rpgState, live }) {
  if (!rpgState) return null;
  const liveRpg = (live && live.rpg) || rpgState;
  let active = Object.entries(rpgState._quests || {})
    .filter(([, status]) => status === QUEST_STATUS.active)
    .map(([qid]) => QUEST_CHAINS[qid])
    .filter(Boolean);

  if (active.length === 0) {
    /* v2.3.3525: between two steps of the tour, who is next (questRoute.js
       tourOffer); the gold road leads to him.  Takes no taps. */
    let to = null;
    try { to = tourOffer(liveRpg, live); } catch (e) { to = null; }
    if (!to) return null;
    return (
      <div data-quest-hud="1" data-quest-hud-next={to.quest.id}
        style={boxStyle({ pointerEvents: 'none', border: '1px solid rgba(216,169,77,.35)' })}>
        <div style={titleRow(GOLD)}>
          <img src="/icons/ui/panel-quests.webp" alt="Quest" draggable={false} style={markStyle} />
          <span style={{ flex: 1, minWidth: 0 }}>{'Next: ' + to.quest.title}</span>
        </div>
        <div style={subLine}>{'Talk to ' + folkDisplayName(to.npc) + (TOUR_MEET[to.npc] ? ' ' + TOUR_MEET[to.npc] : '')}</div>
        {/* v2.3.3525: others have work too, and where they show */}
        {to.more > 0 && (
          <div data-quest-hud-more={to.more} style={{ ...subLine, color: 'rgba(216,169,77,.85)' }}>
            {'+' + to.more + ' more: look for a gold ! on your map'}
          </div>
        )}
      </div>
    );
  }

  /* v2.3.3522: the quest you TRACK first, else the first */
  active = trackedFirst(active.map((q) => ({ qid: q.id, q }))).map((e) => e.q);
  const q = active[0];
  /* v2.3.1914: the live rpg, so the count and the check agree */
  const done = questObjectiveDone(q, live, rpgState);
  let steps = null;
  try { steps = questSteps(q, rpgState, live); } catch (e) { steps = null; }
  const w = questCardWords(q, { done, steps, rpg: liveRpg });

  return (
    <div
      /* v2.3.3481: the quest coach finds this card by it (QuestCoach.jsx) */
      data-quest-hud="1"
      data-quest-hud-quest={q.id}
      data-quest-hud-ready={done ? '1' : '0'}
      role="button"
      title="Open this quest"
      /* v2.3.1714: the world listens for taps under the HUD; stop the press
         here or the tap also walks the bro to the top-left corner */
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); openQuestPage(q.id); }}
      style={boxStyle({
        /* an ancestor turns pointer events off so the world stays tappable */
        pointerEvents: 'auto',
        cursor: 'pointer',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        border: '1px solid ' + (done ? 'rgba(61,220,151,.3)' : 'rgba(255,255,255,.1)'),
        /* UI-BIBLE Part 2: a 44pt hit area even when the card looks smaller */
        minHeight: 44,
        boxSizing: 'border-box',
      })}
    >
      <div style={titleRow(done ? GREEN : GOLD)}>
        {/* v2.3.3048: the owner's green check -- now ONLY when ready (v2.3.3918) */}
        <img
          src={done ? QUEST_ART.check : '/icons/ui/panel-quests.webp'}
          alt={done ? 'Ready to hand in' : 'Quest'}
          draggable={false}
          data-quest-hud-mark={done ? 'ready' : 'quest'}
          className={done ? 'bt-quest-hud-ready' : undefined}
          style={markStyle}
        />
        <span style={{ flex: 1, minWidth: 0 }}>{w.title}</span>
        {w.count && (
          <span data-quest-hud-count={w.count}
            style={{ flex: '0 0 auto', fontVariantNumeric: 'tabular-nums', color: done ? GREEN : '#fff' }}>
            {w.count}
          </span>
        )}
      </div>
      <div data-quest-hud-line="1" style={done ? { ...subLine, color: GREEN, fontWeight: 700 } : subLine}>
        {w.line}
      </div>
    </div>
  );
}
