/* ═══ v2.3.6692: RANKS UNDER THE NEW DASHBOARD: THE LANDING, A GROUP, A BOARD (card UI2-ranks, step 6) ═══
 *
 * The owner's master specification, 2026-11-25, part 7: "Mirror character
 * inspection categories for competitive comparison: Combat, Life Skills,
 * Feats, Equipment where valid metrics exist. Actual leaderboard categories
 * must come from implemented rankings, not hypothetical metrics."  Its
 * acceptance task: "Find Woodcutting rankings; identify the ranked value, find
 * personal position, inspect another player, and return to the same list
 * position."
 *
 * Which page the frame's entry is (BottomDashboard's PANELS; the entry's `sel`):
 *   leaderboard  the landing: three equal doors, Combat, Life Skills, Feats,
 *                each with the picture of Bro's door of that name (no
 *                Equipment: the worker keeps no gear board; a group it keeps
 *                nothing of is left out);
 *   ranksGroup   a group's boards as doors (sel 'combat' | 'life' | 'feats'):
 *                Combat holds Overall, Sword, Bow, Staff, Combat level and one
 *                door, Points placed, to the eight stat boards;
 *   ranksPoints  the stat boards;
 *   ranksBoard   a board's standings (RankStandings.jsx; sel the board and its
 *                choice).
 * The groups are src/game/ranksPage.js ranksGroups (nothing dropped), what a
 * tap opens ranksOpens; the drawing rankViews.jsx.  The weigh-in card's
 * Records lands on Biggest fish at the kind weighed, under Feats (its Back:
 * Feats, then Ranks). */
import React, { useEffect } from 'react';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { dashNavView } from '@/game/dashNav.js';
import { ranksGroups, ranksOpens, rankSel, rankListWaiting } from '@/game/ranksPage.js';
import { BRO_HUB_DOORS } from '@/game/broHub.js';
import { LB_ART } from './BoardRow.jsx';
import { RankTilesView } from './rankViews.jsx';
import { RankStandings } from './RankStandings.jsx';
import { useRoom } from '../sheet/CharacterPage.jsx';
import { Ui2Empty, Ui2Loading, ui2RootClass } from '@/ui/kit/index.js';
import { rankBoardWord, rankGroupWord, rankWord } from './rankWords.js';
import { SAY } from '@/data/say/leaderboard.js';
import { say } from '@/game/say.js';

/* each group wears the picture of Bro's door of its name (src/game/broHub.js BRO_HUB_DOORS) */
const BRO_DOOR = { combat: 'combat', life: 'skills', feats: 'feats' };
const groupArt = (g) => { const d = BRO_HUB_DOORS.find((x) => x.id === BRO_DOOR[g]); return d ? d.art : null; };
/** A board's picture as a file: its own frame, the first of a cropped sheet, or its tile of the owner's sheet. */
export const boardArt = (b) => (!b ? null : typeof b.icon === 'string' ? b.icon : Array.isArray(b.icon) ? b.icon[0] : b.art ? LB_ART(b.art) : null);

function go(o) {
  if (o) dashboardPanelBus.go({ type: 'push', id: o.id, sel: o.sel, who: o.who || undefined });
}

/** The tiles of one page, upright at most five across (two rows hold ten), sideways one row. */
function Tiles({ kind, group, tiles }) {
  const [ref, room] = useRoom();
  const cols = kind === 'landing' ? tiles.length : room.short ? tiles.length : Math.min(5, tiles.length);
  return (
    <div ref={ref} style={{ flex: '1 1 auto', height: '100%', minHeight: 0, minWidth: 0, display: 'flex' }}>
      <RankTilesView kind={kind} group={group} tiles={tiles} cols={cols} short={room.short}
        onTile={(t) => go(ranksOpens(t.tap))} />
    </div>
  );
}

/**
 * boards    the boards this worker keeps (LeaderboardPanel.jsx boardList's rows)
 * parts     LeaderboardPanel's: { me, useRows, valueOf, emptyOf, fishWant }
 * getS      the game's state, read when drawn
 */
export function RanksUi2({ boards, parts, getS }) {
  const top = dashNavView(dashboardPanelBus.nav()).top;
  const page = top && (top.id === 'ranksGroup' || top.id === 'ranksPoints' || top.id === 'ranksBoard') ? top.id : 'leaderboard';
  const ids = boards.map((b) => b.id);
  const groups = ranksGroups(ids);
  const byId = (id) => boards.find((b) => b.id === id) || null;
  /* the weigh-in card's Records: Feats, then Biggest fish at the kind weighed */
  const want = parts.fishWant;
  useEffect(() => {
    if (!want || !ids.includes('fish')) return;
    const t = dashNavView(dashboardPanelBus.nav()).top;
    if (t && t.id === 'ranksBoard' && rankSel(t.sel).board === 'fish') { dashboardPanelBus.go({ type: 'keep', key: t.key, sel: 'fish:' + want }); return; }
    if (!t || t.id !== 'ranksGroup' || t.sel !== 'feats') go(ranksOpens({ kind: 'group', group: 'feats' }));
    go(ranksOpens({ kind: 'board', board: 'fish', choice: want }));
  }, [want]);

  /* v2.3.6692 (the mend of sitting 72): a page the list lacks waits for the
     worker's list (ranksPage.js rankListWaiting) before it says "nobody" */
  const absent = (mark) => (rankListWaiting((getS() && getS()._serverCaps) || null)
    ? <div className={ui2RootClass()} {...mark} data-rank-loading="" style={{ flex: 1 }}><Ui2Loading rows={3} /></div>
    : <div className={ui2RootClass()} {...mark} style={{ flex: 1 }}><Ui2Empty title={say(SAY, 'leaderboard.emptyBoard')} /></div>);
  if (page === 'ranksBoard') {
    const { board, choice } = rankSel(top.sel);
    const b = byId(board);
    if (!b) return absent({ 'data-rank-board': '' });
    return <RankStandings key={top.key + ':' + b.id + ':' + (b.kind === 'fish' ? choice : '')} board={b} choice={choice} parts={parts} getS={getS} />;
  }
  if (page === 'ranksPoints') {
    const g = groups.find((x) => x.id === 'combat');
    const tiles = (g ? g.points : []).map((id) => ({ id, label: rankBoardWord(id), art: boardArt(byId(id)), tap: { kind: 'board', board: id } }));
    return <Tiles kind="points" group="points" tiles={tiles} />;
  }
  if (page === 'ranksGroup') {
    const g = groups.find((x) => x.id === top.sel);
    if (!g) return absent({ 'data-ranks-ui2': 'group' });
    const tiles = g.boards.map((id) => ({ id, label: rankBoardWord(id), art: boardArt(byId(id)), tap: { kind: 'board', board: id } }));
    if (g.points.length) tiles.push({ id: 'points', label: rankWord('leaderboard.pointsDoor'), art: boardArt(byId(g.points[0])), tap: { kind: 'points' } });
    return <Tiles kind="group" group={g.id} tiles={tiles} />;
  }
  const tiles = groups.map((g) => ({ id: g.id, label: rankGroupWord(g.id), art: groupArt(g.id), tap: { kind: 'group', group: g.id } }));
  return <Tiles kind="landing" tiles={tiles} />;
}
