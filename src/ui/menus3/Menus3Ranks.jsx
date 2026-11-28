/* ═══ v2.3.6870: PEOPLE · RANKS IN THE NEW PANEL (card MN step 11) ═══
 *
 * The wireframe v4.4's Ranks (a rail of the kinds, the standings under it, a
 * row's name the player's page) from today's boards: the groups today's
 * Ranks keeps (src/game/ranksPage.js ranksGroups: Combat, Life Skills,
 * Feats -- the records, the spin's, the flip's, the fish's, are Feats' own),
 * a second rail of the group's boards (src/game/menus3Chat.js ranksRail: the
 * stat boards at the end of Combat's), and the board's standings as today's
 * Ranks draws them (dash/RankStandings.jsx: the worker's rows, your row
 * marked and pinned when out of view, the record boards' choices), held in
 * this panel: its scroll and its choice kept on the panel's page for Back,
 * a row's tap the ONE Player page (Menus3Roster.jsx menus3OpenPlayer, the
 * row's name and its own card -- today's Character page -- kept for a player
 * the phone does not hold).  Your own row opens Bro · Power, as today's row
 * opened Bro's page.  Its script loads the first time Ranks opens (the
 * boards' own lazy piece, dash/LeaderboardPanel.jsx), as today's page did. */
import React, { useEffect, useState } from 'react';
import { boardList, ui2RankParts } from '@/ui/mobile/dash/LeaderboardPanel.jsx';
import { RankStandings } from '@/ui/mobile/dash/RankStandings.jsx';
import { rankBoardWord, rankGroupWord } from '@/ui/mobile/dash/rankWords.js';
import { ranksGroups, rankListWaiting } from '@/game/ranksPage.js';
import { ranksRail, ranksPick, ranksKeep } from '@/game/menus3Chat.js';
import { takeFishBoardWant } from '@/game/fishWeigh.js';
import { Ui2Empty, Ui2Loading } from '@/ui/kit/index.js';
import { ui2RootClass } from '@/ui/kit/shine.js';
import { menus3Bus, menus3Go } from './menus3Wire.js';
import { menus3OpenPlayer } from './Menus3Roster.jsx';
import { SAY } from '@/data/say/menus3Chat.js';
import { say } from '@/game/say.js';

function Root({ top, getS }) {
  const [, force] = useState(0);
  const S = getS();
  const boards = boardList(S).filter((b) => b.id);
  const rail = ranksRail(ranksGroups(boards.map((b) => b.id)));
  /* the weigh-in card's Records, if it asked: Feats, Biggest fish at the kind weighed (today's) */
  const [fishWant] = useState(() => takeFishBoardWant());
  const kept = top.rail || (fishWant && boards.some((b) => b.id === 'fish') ? 'feats|fish|' + fishWant : '');
  const pick = ranksPick(rail, kept);
  useEffect(() => {
    try { window.__btMenus3Ranks = { groups: rail.map((g) => g.id), boards: pick ? rail.find((g) => g.id === pick.group).boards.slice() : [], pick }; } catch (e) { /* no window */ }
  });
  /* the worker's list not here yet: today's wait, never "nobody" (ranksPage.js rankListWaiting) */
  useEffect(() => { if (pick) return undefined; const t = setInterval(() => force((v) => (v + 1) % 1e9), 1000); return () => clearInterval(t); }, [!!pick]);
  if (!pick) {
    return rankListWaiting((S && S._serverCaps) || null)
      ? <div className={ui2RootClass()} data-m3-ranks="" data-rank-loading=""><Ui2Loading rows={3} /></div>
      : <div className={ui2RootClass()} data-m3-ranks=""><Ui2Empty title={say(SAY, 'menus3Chat.ranksNone')} /></div>;
  }
  const group = rail.find((g) => g.id === pick.group);
  const board = boards.find((b) => b.id === pick.board) || null;
  const set = (p) => { menus3Bus.keep({ rail: ranksKeep(p), scroll: 0 }); menus3Bus.bump(); };
  const parts = ui2RankParts(S, null);
  const nav = {
    scroll: top.scroll || 0,
    onScroll: (y) => menus3Bus.keep({ scroll: y }),
    keep: (sel) => {
      const i = String(sel).indexOf(':');
      set({ group: pick.group, board: pick.board, choice: i < 0 ? null : String(sel).slice(i + 1) });
    },
    open: (r, o) => {
      if (o && o.id === 'hero') { menus3Go('hud.face'); return; }   /* your own row: Bro · Power (today's: Bro's page) */
      if (o && o.who && o.who.id) menus3OpenPlayer(o.who.id, { name: o.who.name, who: o.who });
    },
  };
  return (
    <div className="m3-ranks" data-m3-ranks={pick.group} data-m3-rank-board={pick.board}>
      <div className="m3-rail" role="tablist" aria-label={say(SAY, 'menus3Chat.ranksGroupsAria')}>
        {rail.map((g) => (
          <button key={g.id} type="button" role="tab" className={'u2-raised u2-ctl m3-pill' + (g.id === pick.group ? ' is-selected' : '')}
            data-m3-rgroup={g.id} aria-selected={g.id === pick.group} onClick={() => set({ group: g.id, board: g.boards[0], choice: null })}>
            {rankGroupWord(g.id)}
          </button>
        ))}
      </div>
      {group.boards.length > 1 ? (
        <div className="m3-rail m3-rboards" role="tablist" aria-label={say(SAY, 'menus3Chat.ranksBoardsAria')}>
          {group.boards.map((id) => (
            <button key={id} type="button" role="tab" className={'u2-raised u2-ctl m3-pill is-small' + (id === pick.board ? ' is-selected' : '')}
              data-m3-rboard={id} aria-selected={id === pick.board} onClick={() => set({ group: pick.group, board: id, choice: null })}>
              {rankBoardWord(id)}
            </button>
          ))}
        </div>
      ) : null}
      <div className="m3-rstand">
        {board ? <RankStandings key={board.id + ':' + (pick.choice || '')} board={board} choice={pick.choice} parts={parts} getS={getS} nav={nav} /> : null}
      </div>
    </div>
  );
}

/** People · Ranks: the panel's body for the section. */
export function Menus3Ranks({ top, getS }) {
  if (!top || top.page !== 'root') return null;   /* a row's Player page is the panel's (Menus3Panel.jsx) */
  return <Root top={top} getS={getS} />;
}

export default Menus3Ranks;
