/* ═══ v2.3.6691: THE QUESTS LANDING UNDER THE NEW DASHBOARD (card UI2-quests, the build's step 6) ═══
 *
 * The owner's master specification, 2026-11-25, part 6: "Landing page shows
 * active quests first, as direct selectable rows/destinations. No tiny
 * dropdown or three-dot pagination. Daily quests and Completed quests are
 * secondary destinations. Keep long lists scrollable within the dashboard."
 *
 * Under the one header ("Quests"): your quests in hand as rows (the giver's
 * face, the quest's name, its count where it counts, a ready mark once it can
 * be handed in, the star on the one you track; the tracked one first), which
 * scroll inside their zone; and under them, never behind the scroll, the
 * doors: Daily (only when the game shows it today), Completed (n), On offer
 * (n) when someone has a quest for you.  No tabs, no page marks, no picker.
 * A row opens the quest's own page (QuestPage.jsx, the page `questDetail`);
 * a door its frame page (src/game/dashDests.js FRAME_PAGES).  Nothing in hand:
 * the kit's empty state with the game's own line, and the same doors; the
 * worker's answer not in yet: the kit's placeholder rows, never "no quest".
 * Sideways (a band about 63 px tall) the doors sit at the rows' end.
 *
 * The drawing is dash/questViews.jsx's (node renders it); the rules are
 * src/game/questPages.js questLanding and questOpens; the words
 * the journal's and data/say/questPages.js.  `?ui2=0` draws today's tab
 * (QuestPages.jsx; `?ui2=0&questpages=0` the older list): QuestsPanel.jsx
 * chooses. */
import React, { useEffect } from 'react';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { useClock, useRoom } from '../sheet/CharacterPage.jsx';
import { questJournalList, questJournalPage, journalCtx } from '../sheet/questJournalModel.js';
import { questDetailBus } from '../sheet/questDetailBus.js';
import { npcPortrait } from './QuestJournalPage.jsx';
import { trackedQuestId } from '@/game/trackedQuest.js';
import { dailyRewardsBus, questsLive, spinLive } from '@/game/dailyRewards.js';
import { questLanding, questOpens } from '@/game/questPages.js';
import { QuestsLandingView } from './questViews.jsx';   /* the drawing (node renders it) */

/* what moves the landing: the rows, their counts and marks, the doors */
function landOf(S) {
  const ctx = journalCtx(S);
  const L = questJournalList(S, ctx);
  const counts = Object.create(null);
  for (const r of L.active) {
    let p = null;
    try { p = questJournalPage(S, r.id, ctx); } catch (e) { p = null; }
    if (p && p.now && p.now.count) counts[r.id] = p.now.count;
  }
  return questLanding(L, {
    known: !!(S && S._serverCaps),
    dailyOn: !!dailyRewardsBus.get() && (questsLive() || spinLive()),
    tracked: trackedQuestId(),
    counts,
  });
}
const landKey = (land) => land.kind + '|' + land.rows.map((r) => [r.id, r.ready ? 1 : 0, r.tracked ? 1 : 0, r.count ? r.count.have + '/' + r.count.n : ''].join(':')).join(',')
  + '|' + land.doors.map((d) => d.id + (d.n == null ? '' : d.n)).join(',');

/** The landing (BottomDashboard's PANELS `quests`, chosen by QuestsPanel.jsx under the frame). */
export function QuestsLanding({ getS }) {
  useClock(() => landKey(landOf(getS())), 1000);
  const [ref, room] = useRoom();
  const land = landOf(getS());
  useEffect(() => {
    try { window.__btQuestsUi2 = { kind: land.kind, rows: land.rows.map((r) => r.id), doors: land.doors.map((d) => d.id) }; } catch (e) { /* no window */ }
  });
  useEffect(() => () => { try { window.__btQuestsUi2 = null; } catch (e) { /* no window */ } }, []);
  const go = (tap) => {
    const a = questOpens(tap);
    if (!a) return;
    if (a.sel) questDetailBus.select(a.sel);   /* the page's fallback (the pinned card's road carries no sel) */
    dashboardPanelBus.go(a);
  };
  return (
    <QuestsLandingView land={land} short={room.short} faceOf={npcPortrait} boxRef={ref}
      onRow={(r) => go({ kind: 'row', id: r.id })} onDoor={(d) => go({ kind: 'door', door: d.id })} />
  );
}
