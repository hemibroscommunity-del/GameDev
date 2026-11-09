import React, { useEffect, useRef, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';
import { BT_API_BASE } from '@/networking/index.js';
import { FishBoard } from './FishBoard.jsx';   /* v2.3.4036: the Biggest fish board (server fishlog.js) */
import { takeFishBoardWant, subscribeFishWeigh, fishWeighLive } from '@/game/fishWeigh.js';
import { BoardRow, BoardEmpty, useBoardFaces } from './BoardRow.jsx';   /* v2.3.4355: the face, the level, the record */
import { askSpinBoard, subscribeSpinBoard, spinBoardLive, spinRowLine } from '@/game/spinBoard.js';
import { aceFlipBus } from '../aceFlipBus.js';

/* v2.3.1671: a TRADITIONAL HISCORES BOARD — one ranking per skill.
   Owner: "a traditional high scores system that ranks each skill... I want
   all of the lifeskills to be added on the high scores too."

   Two things were wrong before this.

   1. THIS PANEL NEVER FETCHED ANYTHING.  It read `S._leaderboard[cat]`, and
      nothing in the entire client ever wrote `S._leaderboard`.  So the panel
      the player actually sees (BottomDashboard mounts THIS one; the desktop
      panel in ui/panels is behind the legacy menu) has been rendering its
      "No leaderboard data yet." empty state permanently.  It now fetches
      /api/leaderboard/top itself, per category, like the old panel did.
   2. THE COLUMNS WERE CLIENT-REPORTED.  Kills, Skills and Gold came out of
      the rpgData blob the client sends, so they were claims, not facts.  The
      categories below read the server's `series` — combat levels from prog3,
      life-skill levels from ps.lifeSkills, kills from svKills — which is the
      same object the on-chain attestation signs.  `gold` is gone from the
      list for exactly that reason; the legacy endpoints still serve it for
      the old desktop panel. */

/* ═══ v2.3.4355: THE LEADERBOARDS, EASIER TO GET AROUND, WITH FACES ═══
   The owner, 2026-11-09: "the leaderboards should be expanded and easier to
   navigate from mobile and include the character profile pic and level next
   to each record.  Also I want to have the 'daily spin' biggest wins and
   losses records."  And a button of its own on the dashboard's row (it was a
   tile under More: BottomDashboard RAIL_ORDER).

   WHAT WAS HARD.  Seventeen boards were one row of chips scrolled sideways:
   six showed on a phone, and nothing said there were eleven more, or that
   the fish were at the far end.  A row was a name and a number.

   NOW.  The boards are a LIST down the page's left edge, under three
   headings -- Ranks (your level, the three weapons, kills, achievement
   points), Records (the daily spin, Ace's coin flip, the biggest fish) and
   Skills (the ten life skills) -- scrolled with a thumb like any list, one
   tap to change board, the one showing lit.  The board fills the rest and
   scrolls by itself, so the list never leaves the screen.  Where the page is
   too narrow or too short for the two side by side (the old side column's
   ~214 px; a phone on its side, whose band is ~80 px tall) the list is the
   row of chips it was, the headings small between them.  Each row is BoardRow: rank, face, name, the name plate's level, the
   record; a deleted character's row grey with DELETED across the face.

   The Records boards have a WINS / LOSSES switch (the spin, the flip) or the
   species chips (the fish) on the board's own first line, never in the list:
   the list stays three rows long there.

   AP (v2.3.3527) is the worker's own number against a worker that says
   caps.achievements; its rows carry `ap`, not `value`, and a 0 is left off,
   as the per-skill boards leave off a skill nobody trained. */
const RANKS = [
  /* 'combat' is the level on the name plate: the highest of the three
     weapons (leaderboard.js seriesValue, v2.3.3538's one level) */
  { id: 'combat',       label: 'Level' },
  { id: 'melee',        label: 'Melee' },
  { id: 'bow',          label: 'Bow' },
  { id: 'magic',        label: 'Magic' },
  { id: 'kills',        label: 'Kills' },
];
const AP_CAT = { id: 'ap', label: 'AP', full: 'Achievement points' };
const SKILLS = [
  { id: 'woodcutting',  label: 'Woodcutting' },
  { id: 'fishing',      label: 'Fishing' },
  { id: 'mining',       label: 'Mining' },
  { id: 'farming',      label: 'Farming' },
  { id: 'cooking',      label: 'Cooking' },
  { id: 'blacksmithing', label: 'Blacksmithing' },
  { id: 'woodworking',  label: 'Woodworking' },
  { id: 'gemCutting',   label: 'Gem Cutting' },
  { id: 'enchanting',   label: 'Enchanting' },
  { id: 'trapping',     label: 'Trapping' },
];
/* the records: each asked of the room, not this page's fetch */
const SPIN_CAT = { id: 'spin', label: 'Daily spin', kind: 'spin' };
const FLIP_CAT = { id: 'flip', label: 'Coin flip', kind: 'flip' };
const FISH_CAT = { id: 'fish', label: 'Biggest fish', kind: 'fish' };

/** The list: `[{sec}, {id, label, kind?}, ...]`, by what this worker says it
 *  keeps (each cap read directly: caps-audit). */
export function boardList(S) {
  const caps = (S && S._serverCaps) || {};
  const records = [
    ...(spinBoardLive(S) ? [SPIN_CAT] : []),
    ...(caps.aceItems ? [FLIP_CAT] : []),
    ...(fishWeighLive(S) ? [FISH_CAT] : []),
  ];
  return [
    { sec: 'Ranks' }, ...RANKS, ...(caps.achievements ? [AP_CAT] : []),
    ...(records.length ? [{ sec: 'Records' }, ...records] : []),
    { sec: 'Skills' }, ...SKILLS,
  ];
}

const rowValue = (cat, r) => {
  if (cat === 'ap') { const v = Math.floor(Number(r.ap) || 0); return v > 0 ? [v.toLocaleString('en-US'), 'AP'] : ['-', '']; }
  const v = r.value ?? r.score;
  if (v == null) return ['-', ''];
  return cat === 'kills' ? [Number(v).toLocaleString('en-US'), ''] : ['Lv ' + v, ''];
};

/* v2.3.1235: every interactive element is 44 px tall at least; the chip's
   pill is the 32 px visual inside a transparent 44 px hit box. */
const chipHit = {
  flex: '0 0 auto', minHeight: 44, padding: 0, margin: 0, background: 'transparent', border: 'none',
  display: 'inline-flex', alignItems: 'center', cursor: 'pointer', touchAction: 'manipulation',
};
const chip = (active) => ({
  display: 'inline-flex', alignItems: 'center', height: 32, padding: '0 12px',
  background: active ? COL.accentFill : 'transparent',
  color: active ? COL.accent : COL.text2,
  border: `1px solid ${active ? COL.accent : COL.border}`,
  borderRadius: 999, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
});

/* the side list's width, and the smallest page it stands beside the board
   on: 118 + a board of ~220 wide (rank, face, a name of ten letters, the
   record), and tall enough to show three boards of the list at once -- a
   phone on its side has a band ~80 px tall, where a list would be one row
   and a half and the chips show five */
const RAIL_W = 118;
const SIDE_BY_SIDE = 330;
const LIST_MIN_H = 140;

/* the page's box, measured: [ref, width, height] */
function useBoxSize() {
  const [el, ref] = useState(null);
  const [size, setSize] = useState([0, 0]);
  useEffect(() => {
    if (!el) return undefined;
    const read = () => {
      const r = el.getBoundingClientRect();
      setSize((old) => (Math.abs(old[0] - r.width) < 1 && Math.abs(old[1] - r.height) < 1 ? old : [Math.round(r.width), Math.round(r.height)]));
    };
    read();
    let ro = null;
    try { ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(read) : null; } catch (_e) { ro = null; }
    if (ro) ro.observe(el);
    else window.addEventListener('resize', read);
    return () => { if (ro) ro.disconnect(); else window.removeEventListener('resize', read); };
  }, [el]);
  return [ref, size[0], size[1]];
}

/* the board you last looked at, kept while the game is open: closing the
   page to fight and coming back lands where you were */
let lastCat = 'combat';

/* ── a ranks board: fetched from the Leaderboard object ── */
function RankBoard({ cat }) {
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
      fetch(BT_API_BASE + '/api/leaderboard/top?category=' + encodeURIComponent(cat) + '&limit=50')
        .then(r => r.json())
        .then(d => {
          if (!alive || !d || !d.ok) return;
          setBoards(prev => { const next = Object.create(null); Object.assign(next, prev); next[cat] = d.results || []; return next; });
        })
        .catch(() => {})
        .finally(() => { if (alive) setLoading(false); });
    };
    setLoading(!boards[cat]);
    load();
    const id = setInterval(load, 20000);
    return () => { alive = false; clearInterval(id); };
  }, [cat]);

  const S = getState();
  const meId = S && S.myId;
  /* v2.3.3527: the AP board leaves off everyone at 0 */
  const board = (boards[cat] || []).filter((r) => cat !== 'ap' || Math.floor(Number(r && r.ap) || 0) > 0);
  const faces = useBoardFaces(board);
  if (board.length === 0) {
    return <BoardEmpty text={loading ? 'Loading…' : cat === 'ap' ? 'Nobody has achievement points yet.' : cat === 'kills' ? 'Nobody has a kill yet.' : 'Nobody has trained this yet.'} />;
  }
  return board.map((r, i) => {
    const [value, unit] = rowValue(cat, r);
    return (
      <BoardRow key={r.id || i} rank={i + 1} face={faces[i]} mine={!!meId && r.id === meId}
        /* the Level board's record IS the level: no second "Lv" beside the name */
        row={cat === 'combat' ? { ...r, lv: 0 } : r}
        value={value} unit={unit} />
    );
  });
}

/* ── a wins / losses board (the daily spin, Ace's flip) ── */
function WinLossBoard({ id, wins, losses, side, setSide, amountOf, lineOf, state, emptyWin, emptyLoss }) {
  const S = getState();
  const meId = S && S.myId;
  const rows = (side === 'losses' ? losses : wins) || [];
  const faces = useBoardFaces(rows);
  return (
    <div data-winloss-board={id} data-winloss-side={side}>
      <div role="tablist" style={{ display: 'flex', gap: 6, padding: '0 4px 2px' }}>
        {[['wins', 'Biggest wins'], ['losses', 'Biggest losses']].map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={side === k} data-winloss-tab={k} onClick={() => setSide(k)} style={{ ...chipHit, flex: '1 1 0', justifyContent: 'center' }}>
            <span style={{ ...chip(side === k), width: '100%', justifyContent: 'center', boxSizing: 'border-box' }}>{label}</span>
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <BoardEmpty text={state || (side === 'losses' ? emptyLoss : emptyWin)} />
      ) : rows.map((r, i) => (
        <BoardRow key={(r.pid || i) + ':' + side} rank={i + 1} row={r} face={faces[i]} mine={!!meId && r.pid === meId}
          line={lineOf ? lineOf(r, side === 'wins') : null}
          value={Math.max(0, Math.floor(Number(amountOf(r)) || 0)).toLocaleString('en-US')} unit="gold" />
      ))}
    </div>
  );
}

const REFRESH_MS = 30000;

function SpinBoard({ side, setSide }) {
  const [, setTick] = useState(0);
  useEffect(() => subscribeSpinBoard(() => setTick((x) => (x + 1) % 1000000)), []);
  useEffect(() => {
    const ask = () => askSpinBoard(getState());
    ask();
    const id = setInterval(ask, REFRESH_MS);
    return () => clearInterval(id);
  }, []);
  const S = getState();
  const sb = S && S._spinBoard;
  const state = !sb ? 'Loading…' : sb.off ? "The spin's records are closed for now." : sb.unavailable ? "The records can't be read right now." : null;
  return (
    <WinLossBoard id="spin" side={side} setSide={setSide} wins={sb && sb.wins} losses={sb && sb.losses} state={state}
      amountOf={(r) => r.n} lineOf={spinRowLine}
      emptyWin="Nobody has taken a pot from the daily spin yet."
      emptyLoss="Nobody has lost a pot to double or nothing yet." />
  );
}

function FlipBoard({ side, setSide }) {
  const [, setTick] = useState(0);
  useEffect(() => aceFlipBus.subscribe(() => setTick((x) => (x + 1) % 1000000)), []);
  useEffect(() => {
    const ask = () => {
      const S = getState();
      /* gamble.js _handleAceBoardRequest: the room answers `ace_board` */
      try { if (S && S.channel) S.channel.send({ type: 'broadcast', event: 'ace_board_request', payload: {} }); } catch (_e) { /* the next tick asks */ }
    };
    ask();
    const id = setInterval(ask, REFRESH_MS);
    return () => clearInterval(id);
  }, []);
  const b = aceFlipBus.board || {};
  return (
    <WinLossBoard id="flip" side={side} setSide={setSide} wins={(b.wins || []).filter(Boolean)} losses={(b.losses || []).filter(Boolean)}
      amountOf={(r) => r.amount} lineOf={(r, won) => (won ? 'Won from Ace on one flip' : 'Lost to Ace on one flip')}
      emptyWin="Nobody has won a flip against Ace yet."
      emptyLoss="Nobody has lost a flip to Ace yet." />
  );
}

export const LeaderboardPanel = () => {
  const S = getState();
  const list = boardList(S);
  const ids = list.filter((b) => b.id).map((b) => b.id);
  /* v2.3.4036: the weigh-in card's Records opens this on the fish board */
  const [fishWant, setFishWant] = useState(() => takeFishBoardWant());
  const [catRaw, setCatRaw] = useState(() => (fishWant ? 'fish' : lastCat));
  /* ...and when it is already open (a Records tap with the page up) */
  useEffect(() => subscribeFishWeigh(() => { const w = takeFishBoardWant(); if (w) { setFishWant(w); setCatRaw('fish'); } }), []);
  /* a board this worker does not keep (a switch thrown while it showed) falls back to Level */
  const cat = ids.includes(catRaw) ? catRaw : 'combat';
  const setCat = (id) => { lastCat = id; setCatRaw(id); };
  const cur = list.find((b) => b.id === cat) || RANKS[0];
  const [side, setSide] = useState('wins');
  const [boxRef, boxW, boxH] = useBoxSize();
  /* until the box is measured, the shape an upright phone gets */
  const sideBySide = boxW === 0 || (boxW >= SIDE_BY_SIDE && boxH >= LIST_MIN_H);
  /* the board showing is on screen in the list or the chips: the page opens
     on the one you last looked at, which may be far down */
  const navRef = useRef(null);
  useEffect(() => {
    const nav = navRef.current;
    const on = nav && nav.querySelector('[data-lb-cat="' + cat + '"]');
    try { if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (_e) { /* an old browser: the list is still a list */ }
  }, [cat, sideBySide]);

  const board = cur.kind === 'fish' ? <FishBoard key={fishWant || 'fish'} initial={fishWant} />
    : cur.kind === 'spin' ? <SpinBoard side={side} setSide={setSide} />
    : cur.kind === 'flip' ? <FlipBoard side={side} setSide={setSide} />
    : <RankBoard cat={cat} />;

  if (!sideBySide) {
    /* the narrow page: the chips it always was, the headings between them */
    return (
      <div ref={boxRef} data-lb-page="chips" data-lb-open={cat} style={panelStyle}>
        <div ref={navRef} data-lb-chips="" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, overflowX: 'auto', padding: '2px 0' }}>
          {list.map((b) => (b.sec ? (
            <span key={'s:' + b.sec} aria-hidden="true" style={{ flex: 'none', fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: COL.muted, padding: '0 2px 0 6px' }}>{b.sec}</span>
          ) : (
            <button key={b.id} type="button" data-lb-cat={b.id} aria-pressed={b.id === cat} onClick={() => setCat(b.id)} style={chipHit}>
              <span style={chip(b.id === cat)}>{b.label}</span>
            </button>
          )))}
        </div>
        {board}
      </div>
    );
  }

  return (
    <div ref={boxRef} data-lb-page="list" data-lb-open={cat} style={{
      ...panelStyle, overflow: 'hidden', display: 'flex', padding: '2px 4px 0',
      /* each side fades at its own foot (below): the page itself does not scroll */
      WebkitMaskImage: 'none', maskImage: 'none',
    }}>
      <div ref={navRef} data-lb-rail="" role="tablist" aria-label="Leaderboards" aria-orientation="vertical" style={{
        flex: 'none', width: RAIL_W, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', touchAction: 'pan-y',
        padding: '0 4px 18px 0', boxSizing: 'border-box', borderRight: `1px solid ${COL.divider}`,
        WebkitMaskImage: 'linear-gradient(180deg, #000 calc(100% - 18px), transparent)',
        maskImage: 'linear-gradient(180deg, #000 calc(100% - 18px), transparent)',
      }}>
        {list.map((b) => (b.sec ? (
          <div key={'s:' + b.sec} data-lb-sec={b.sec} style={{
            padding: '8px 6px 2px', fontSize: 11, fontWeight: 800, letterSpacing: '.10em', textTransform: 'uppercase', color: COL.muted,
          }}>{b.sec}</div>
        ) : (
          <button key={b.id} type="button" role="tab" aria-selected={b.id === cat} data-lb-cat={b.id}
            title={b.full || b.label} onClick={() => setCat(b.id)}
            style={{
              display: 'flex', alignItems: 'center', width: '100%', minHeight: 44, margin: 0, padding: '0 6px 0 8px', boxSizing: 'border-box',
              background: b.id === cat ? COL.accentFill : 'transparent',
              border: 'none', borderLeft: `3px solid ${b.id === cat ? COL.accent : 'transparent'}`, borderRadius: 6,
              color: b.id === cat ? COL.accent : COL.text, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, textAlign: 'left',
              cursor: 'pointer', touchAction: 'manipulation',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{b.label}</button>
        )))}
      </div>
      <div data-lb-board={cat} role="tabpanel" aria-label={cur.full || cur.label} style={{
        flex: 1, minWidth: 0, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', touchAction: 'pan-y',
        padding: '0 0 18px 4px', boxSizing: 'border-box',
        WebkitMaskImage: 'linear-gradient(180deg, #000 calc(100% - 18px), transparent)',
        maskImage: 'linear-gradient(180deg, #000 calc(100% - 18px), transparent)',
      }}>
        {board}
      </div>
    </div>
  );
};
