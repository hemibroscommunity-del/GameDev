/* ═══ v2.3.6692: A BOARD'S STANDINGS UNDER THE NEW DASHBOARD (card UI2-ranks, the build's step 6) ═══
 *
 * The owner's master specification, 2026-11-25, part 7: "Specific leaderboard
 * is a simple aligned standings list: Rank | Player (portrait/name) | metric
 * for this leaderboard. No unrelated combat level when ranking a different
 * skill. Clearly label metric units/category."; "Conditional pinned personal
 * standing only when the player's actual row is outside the visible list; no
 * duplicate row when visible."; "Tapping a player opens universal character
 * inspection. Back returns to the same ranking category and scroll
 * position."  And 2026-11-26: "Highlight the player's own row regardless of
 * rank."
 *
 * The frame page `ranksBoard` (BottomDashboard's PANELS; its entry's `sel` the
 * board and its choice: src/game/ranksPage.js ranksOpens, rankSel).  The rows
 * are the worker's (today's fetch, handed in as `parts.useRows`, or the
 * room's records: the spin, the flip, the fish).  Your row: marked wherever it
 * stands, and pinned at the foot ONLY while the real one is out of the list's
 * view (ranksPage.js youPinned, from the scroll read at the frame's top and the
 * list's size from its ResizeObserver: docs/specs/layout-reads.md, never a
 * measure in a tap or a frame).  A tap on a row opens that player (yours: the
 * one Bro page; theirs: Character, fed only by the row).  Back comes here:
 * the frame keeps this visit's scroll (dash/dashScroll.js) and gives it back.
 * The drawing is rankViews.jsx's. */
import React, { useEffect, useRef, useState } from 'react';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { dashNavView } from '@/game/dashNav.js';
import { beforeDraw } from '@/game/framePacer.js';
import { act } from '@/game/actions.js';
import { ranksBoardHeads, youRow, youPinned, ranksOpens, medalOf, rankAnswer } from '@/game/ranksPage.js';
import { askSpinBoard, subscribeSpinBoard } from '@/game/spinBoard.js';
import { aceFlipBus } from '../aceFlipBus.js';
import { askFishBoard, subscribeFishWeigh } from '@/game/fishWeigh.js';
import { FISH_SPECIES, fishKg } from '@/data/fishVariants.js';
import { useBoardFaces, RankMark, BoardFace } from './BoardRow.jsx';
import { StandingsView } from './rankViews.jsx';
import { Ui2Tile } from '@/ui/kit/index.js';
import { useRoom } from '../sheet/CharacterPage.jsx';
import { rankWord, rankBoardWord } from './rankWords.js';
import { SAY } from '@/data/say/leaderboard.js';
import { SAY as SAY_F } from '@/data/say/fishBoard.js';
import { say } from '@/game/say.js';
import { assetUrl } from '@/game/assetUrl.js';   /* v2.3.6692: a fish icon's address by KEEP's helper (its file's version), never by hand */

/* a row and its 2 px gap: the rule's pitch (ranksUi2.css .u2-rk-row, .u2-rk-list's gap) */
export const RANK_PITCH = 46;
const REFRESH_MS = 30000;
const amount = (v) => Math.max(0, Math.floor(Number(v) || 0)).toLocaleString('en-US');

/* ── a ranks board's rows: fetched from the Leaderboard object (v2.3.6692: moved here from
   LeaderboardPanel.jsx, which imports it back for today's boards) ──
   v2.3.5503: one hook, the old page's RankBoard's and the Ranks page's
   (RanksPage.jsx) table's: `{ rows, loading }`, the AP board's 0s left off */
export function useRankRows(cat) {
  const [boards, setBoards] = useState(() => Object.create(null));
  const [loading, setLoading] = useState(true);
  /* Fetch per category, cache per category, refresh on a slow timer.  A
     hiscores page is not a live readout — the server's own report throttle
     means a row changes at most once a minute — so 20s is generous.
     `boards` is Object.create(null): the keys are category ids that ride in
     from a fetch response, and a plain {} silently no-ops on '__proto__'
     (CLAUDE.md — three incidents in one day). */
  useEffect(() => {
    let alive = true;
    const load = () => {
      act('http:/api/leaderboard/top', {}, { query: 'category=' + encodeURIComponent(cat) + '&limit=50' })   /* v2.3.5191: through the action door (actions.js) */
        .then(r => r.json())
        .then(d => {
          if (!alive || !d || !d.ok) return;
          setBoards(prev => { const next = Object.create(null); Object.assign(next, prev); next[cat] = d.results || []; return next; });
        })
        .catch(() => {})
        .finally(() => { if (alive) setLoading(false); });   /* today's page's `loading`; the new board waits on `answer` (v2.3.6692) */
    };
    setLoading(!boards[cat]);
    load();
    const id = setInterval(load, 20000);
    return () => { alive = false; clearInterval(id); };
  }, [cat]);
  /* v2.3.3527: the AP board leaves off everyone at 0 */
  const rows = (boards[cat] || []).filter((r) => cat !== 'ap' || Math.floor(Number(r && r.ap) || 0) > 0);
  /* v2.3.6692 (the mend of sitting 72): `answer` is null until the worker has
     answered (a failed fetch is no answer: `loading` goes false on it, so the
     new board never reads `loading` as "answered") */
  return { rows, loading, answer: boards[cat] === undefined ? null : rows };
}

/* the room's records, each asked for while its board is up (today's SpinBoard,
   FlipBoard and FishBoard ask the same) */
function useAsk(ask, subscribe) {
  const [, setTick] = useState(0);
  useEffect(() => (subscribe ? subscribe(() => setTick((x) => (x + 1) % 1e6)) : undefined), []);
  useEffect(() => {
    ask();
    const id = setInterval(ask, REFRESH_MS);
    return () => clearInterval(id);
  }, []);
}
/* v2.3.6692 (the mend of sitting 72: the Coin flip board said "Nobody has won a
   flip against Ace yet." before the answer came): every source hands the
   worker's answer, or null while there is none, to the rule (ranksPage.js
   rankAnswer), and the page waits on the rule's `waiting`; no source says it
   is loaded on its own */
const SPIN_STATE = { off: 'leaderboard.spinClosed', unavailable: 'leaderboard.spinUnreadable' };
const FISH_STATE = { off: 'fishBoard.off', unavailable: 'fishBoard.unavailable' };
function useSpin(getS, side) {
  useAsk(() => askSpinBoard(getS()), subscribeSpinBoard);
  const a = rankAnswer('spin', (getS() && getS()._spinBoard) || null, side);
  return { ...a, state: a.state ? say(SAY, SPIN_STATE[a.state]) : null, value: (r) => amount(r.n),
    empty: side === 'losses' ? say(SAY, 'leaderboard.spinEmptyLoss') : say(SAY, 'leaderboard.spinEmptyWin') };
}
/* The flip's store (aceFlipBus.js) starts as an EMPTY board, `{ wins: [],
   losses: [] }`, before the worker has said anything; its answer
   (`setBoard`, on join and after each ask or flip) is always a new object.
   So the board the store held when this module first ran is "no answer"
   (this module is loaded with the Ranks window, lazily: if an answer had
   already come by then, the board waits for its own ask's, never the other
   way round). */
const FLIP_UNANSWERED = aceFlipBus.board;
function useFlip(getS, side) {
  useAsk(() => { const S = getS(); try { if (S && S.channel) act('ace_board_request', {}); } catch (e) { /* the next ask */ } },
    (fn) => aceFlipBus.subscribe(fn));
  const b = aceFlipBus.board;
  const a = rankAnswer('flip', b === FLIP_UNANSWERED ? null : b, side);
  return { ...a, value: (r) => amount(r.amount),
    empty: side === 'losses' ? say(SAY, 'leaderboard.flipEmptyLoss') : say(SAY, 'leaderboard.flipEmptyWin') };
}
function useFish(getS, sp) {
  useAsk(() => askFishBoard(getS()), subscribeFishWeigh);
  const a = rankAnswer('fish', (getS() && getS()._fishBoard) || null, sp);
  const name = (FISH_SPECIES.find((f) => f.id === sp) || {}).name || say(SAY_F, 'fishBoard.someFish');
  return { ...a, state: a.state ? say(SAY_F, FISH_STATE[a.state]) : null, value: (r) => fishKg(r.g),
    tag: (r) => (r.v === 'albino' ? { id: 'albino', word: say(SAY_F, 'fishBoard.albino') } : r.v === 'large' ? { id: 'large', word: say(SAY_F, 'fishBoard.large') } : null),
    empty: say(SAY_F, 'fishBoard.empty', { name }) };
}
function useRanked(parts, board) {
  const a = rankAnswer('ranked', parts.useRows(board).answer, null);
  return { ...a, value: (r) => parts.valueOf(board, r), empty: parts.emptyOf(board) };
}
/* one source a board kind (the component is keyed by the board, so its hooks never change order) */
function useSource(kind, parts, board, choice, getS) {
  if (kind === 'spin') return useSpin(getS, choice);
  if (kind === 'flip') return useFlip(getS, choice);
  if (kind === 'fish') return useFish(getS, choice);
  return useRanked(parts, board);
}

/* the list's scroll, read at the top of the game's frame after a scroll (layout-reads way 3) */
function useListScroll(start) {
  const [scroll, setScroll] = useState(start || 0);
  const el = useRef(null);
  const asked = useRef(false);
  const read = () => { asked.current = false; const n = el.current; if (n && n.isConnected) setScroll(n.scrollTop); };
  const onScroll = () => { if (!asked.current) { asked.current = true; beforeDraw(read); } };
  const ref = (n) => {
    if (el.current === n) return;
    if (el.current) el.current.removeEventListener('scroll', onScroll);
    el.current = n;
    if (n) n.addEventListener('scroll', onScroll, { passive: true });
  };
  return [ref, scroll];
}

const SIDES = ['wins', 'losses'];
/** The choice a board keeps in its top zone (the spin's and the flip's
 *  sides, the fish's kinds), or null; `onChoice` keeps it in the entry. */
function Choice({ kind, choice, onChoice }) {
  if (kind === 'spin' || kind === 'flip') {
    return SIDES.map((k) => (
      <Ui2Tile key={k} size="compact" selected={choice === k} label={k === 'wins' ? say(SAY, 'leaderboard.winsTab') : say(SAY, 'leaderboard.lossesTab')}
        data-rank-side={k} onClick={() => onChoice(k)} />
    ));
  }
  if (kind === 'fish') {
    return FISH_SPECIES.map((f) => (
      <Ui2Tile key={f.id} size="compact" selected={choice === f.id} art={assetUrl('/icons/items/fish-' + f.id + '.webp')} label={f.name}
        data-rank-fish={f.id} onClick={() => onChoice(f.id)} />
    ));
  }
  return null;
}

/* the board kinds that ask the room (their rows keyed `pid`) and their first choice */
const RECORD_FIRST = { spin: 'wins', flip: 'wins', fish: 'minnow' };

/**
 * board   the board's row of today's list (LeaderboardPanel.jsx: id, kind)
 * choice  its kept choice (the entry's sel after ':'), or null
 * parts   LeaderboardPanel's: { me, useRows, valueOf, emptyOf }
 * getS    the game's state, read when drawn (handed: QuestsPanel's way)
 */
export function RankStandings({ board, choice: kept, parts, getS }) {
  const kind = board.kind || null;
  const record = Object.prototype.hasOwnProperty.call(RECORD_FIRST, kind);
  const okChoice = kind === 'fish' ? FISH_SPECIES.some((f) => f.id === kept) : SIDES.includes(kept);
  const [choice, setChoice] = useState(record ? (okChoice ? kept : RECORD_FIRST[kind]) : null);
  const top = dashNavView(dashboardPanelBus.nav()).top;
  const [listRef, scroll] = useListScroll(top && top.id === 'ranksBoard' ? top.scroll : 0);
  const [roomRef, room] = useRoom();
  const [zoneRef, zone] = useRoom();
  const src = useSource(kind, parts, board.id, choice, getS);
  const key = record ? 'pid' : 'id';
  const meId = parts.me.id;
  const heads = ranksBoardHeads(board.id);
  const unit = rankWord(heads.metric);
  const label = rankBoardWord(board.id);
  const faces = useBoardFaces(src.rows);
  const you = youRow(src.rows, meId, key);
  const keepChoice = (c) => {
    setChoice(c);
    const t = dashNavView(dashboardPanelBus.nav()).top;
    if (t && t.id === 'ranksBoard') dashboardPanelBus.go({ type: 'keep', key: t.key, sel: board.id + ':' + c });
  };
  const rowOf = (r, i) => {
    const name = (r && (r.name || r[key])) || say(SAY, 'leaderboard.unnamed');
    const value = src.value(r);
    const mine = !!meId && r[key] === meId;
    const gone = !!r.gone;
    const aria = gone ? say(SAY, 'leaderboard.deletedRow', { name })
      : mine ? say(SAY, 'leaderboard.youRankRow', { rank: i + 1, name, value, unit })
      : say(SAY, 'leaderboard.rowAria', { rank: i + 1, name, value, unit });
    return { key: (r[key] || i) + ':' + i, rank: i + 1, name, face: faces[i], value, mine, gone, door: !gone && !!r[key], aria, medal: medalOf(i + 1), tag: src.tag ? src.tag(r) : null };
  };
  const rows = src.rows.map(rowOf);
  /* the list's kept size: its zone's own observer (the list fills it) */
  const pinned = youPinned(you.rank, scroll, RANK_PITCH, zone.h) ? rows[you.rank - 1] : null;
  const open = (r) => {
    const o = ranksOpens({ kind: 'row', row: r, meId, key, board: { label, value: src.value(r) } });
    if (!o) return;
    const t = dashNavView(dashboardPanelBus.nav()).top;
    if (t && t.id === o.id && (!o.who || (t.who && t.who.id === o.who.id))) return;   /* a second tap of the same row */
    dashboardPanelBus.go({ type: 'push', id: o.id, sel: o.sel, who: o.who || undefined });
  };
  return (
    <div ref={roomRef} style={{ flex: '1 1 auto', height: '100%', minHeight: 0, minWidth: 0, display: 'flex' }}>
      <StandingsView board={board.id} short={room.short}
        heads={{ rank: say(SAY, 'leaderboard.rankHead'), player: say(SAY, 'leaderboard.playerHead'), metric: unit }}
        rows={rows} pinned={pinned} notRanked={!you.rank && !src.waiting && rows.length > 0}
        loading={src.waiting} empty={src.state || src.empty}
        choice={record ? <Choice kind={kind} choice={choice} onChoice={keepChoice} /> : null}
        words={{ you: say(SAY, 'leaderboard.you'), deleted: say(SAY, 'leaderboard.deletedWord'), notRanked: say(SAY, 'leaderboard.notRanked') }}
        Medal={RankMark} Face={BoardFace} pitch={RANK_PITCH} listRef={listRef} zoneRef={zoneRef}
        onRow={(i) => open(src.rows[i])} onPinned={() => open(src.rows[you.rank - 1])} />
    </div>
  );
}
