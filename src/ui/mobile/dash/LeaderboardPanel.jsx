import React, { useEffect, useRef, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';
import { BT_API_BASE } from '@/networking/index.js';
import { FishBoard } from './FishBoard.jsx';   /* v2.3.4036: the Biggest fish board (server fishlog.js) */
import { takeFishBoardWant, subscribeFishWeigh, fishWeighLive } from '@/game/fishWeigh.js';
import { BoardRow, BoardEmpty, useBoardFaces } from './BoardRow.jsx';   /* v2.3.4355: the face, the level, the record */
import { askSpinBoard, subscribeSpinBoard, spinBoardLive, spinRowLine } from '@/game/spinBoard.js';
import { aceFlipBus } from '../aceFlipBus.js';
import { useBoxSize, railHeading } from './railKit.js';   /* v2.3.4356: the measuring and the headings this page and the Quests page share */

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
   tap to change board, the one showing lit.  Each is a pill with its own
   picture (below).  The board fills the rest and
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
/* ═══ v2.3.4355: EVERY BOARD A PILL WITH ITS OWN PICTURE ═══
   The owner: "Also make each record category a pill shaped button and add
   icons that represent each category on them."  Each board in the list is a
   pill (the dashboard's own button: a quiet well, a brass rim and brass word
   when it is the one showing) with a picture the game already uses for that
   thing, so nothing new is drawn or loaded: the level-up star, the three
   weapons' own icons (the combat cards'), the sword and skull of the kills
   record, the achievements' medal, the owner's prize wheel, a gold coin, a
   trout, and each life skill's own icon (the Life Skills page's).
   `icon`: [src, the file's width, then its opaque box x0 y0 x1 y1] -- the
   pictures are drawn with a wide empty margin, so each is scaled by its
   opaque box to fill its 20 px (NavRail's NAV_TRIM way).
   "Smithing", not "Blacksmithing": the Life Skills page's own word for the
   skill (skillsModel META), and thirteen letters do not fit a pill. */
const U = '/icons/ui/';
const RANKS = [
  /* 'combat' is the level on the name plate: the highest of the three
     weapons (leaderboard.js seriesValue, v2.3.3538's one level) */
  { id: 'combat',       label: 'Level',  icon: [U + 'hero/rec-xp.webp', 256, 30, 40, 226, 215] },
  { id: 'melee',        label: 'Melee',  icon: [U + 'hero/melee.webp?v=2.3.1311', 256, 33, 30, 223, 226] },
  { id: 'bow',          label: 'Bow',    icon: [U + 'hero/bow.webp?v=2.3.1311', 256, 38, 29, 218, 225] },
  { id: 'magic',        label: 'Magic',  icon: [U + 'hero/magic.webp?v=2.3.1311', 256, 43, 29, 212, 225] },
  { id: 'kills',        label: 'Kills',  icon: [U + 'hero/rec-kills.webp', 256, 0, 9, 256, 246] },
];
const AP_CAT = { id: 'ap', label: 'AP', full: 'Achievement points', icon: ['/icons/achievements/achievements.webp', 150, 37, 21, 113, 129] };
const SKILLS = [
  { id: 'woodcutting',  label: 'Woodcutting', icon: [U + 'skill-woodcutting.webp?v=2.3.1224', 256, 52, 32, 204, 221] },
  { id: 'fishing',      label: 'Fishing',     icon: [U + 'skill-fishing.webp?v=2.3.1224', 256, 55, 40, 200, 216] },
  { id: 'mining',       label: 'Mining',      icon: [U + 'skill-mining.webp?v=2.3.1224', 256, 48, 52, 208, 223] },
  { id: 'farming',      label: 'Farming',     icon: [U + 'skill-farming.webp?v=2.3.1224', 256, 65, 73, 190, 223] },
  { id: 'cooking',      label: 'Cooking',     icon: [U + 'skill-cooking.webp?v=2.3.1224', 256, 41, 39, 215, 215] },
  { id: 'blacksmithing', label: 'Smithing', full: 'Blacksmithing', icon: [U + 'skill-blacksmithing.webp?v=2.3.1224', 256, 37, 33, 215, 221] },
  { id: 'woodworking',  label: 'Woodworking', icon: [U + 'skill-woodworking.webp?v=2.3.1224', 256, 33, 66, 223, 222] },
  { id: 'gemCutting',   label: 'Gem Cutting', icon: [U + 'skill-gemcutting.webp?v=2.3.1224', 256, 48, 57, 207, 209] },
  { id: 'enchanting',   label: 'Enchanting',  icon: [U + 'skill-enchanting.webp?v=2.3.1224', 256, 55, 42, 201, 204] },
  { id: 'trapping',     label: 'Trapping',    icon: [U + 'skill-trapping.webp?v=2.3.3331', 256, 43, 64, 213, 215] },
];
/* the records: each asked of the room, not this page's fetch */
const SPIN_CAT = { id: 'spin', label: 'Daily spin', kind: 'spin', icon: [U + 'prize-wheel.webp?v=2.3.3481', 102, 0, 0, 102, 110] };
const FLIP_CAT = { id: 'flip', label: 'Coin flip', kind: 'flip', icon: [U + 'cur-gold.webp', 256, 34, 32, 221, 223] };
const FISH_CAT = { id: 'fish', label: 'Biggest fish', kind: 'fish', icon: ['/icons/items/fish-trout.webp', 128, 1, 25, 127, 102] };

/** A board's picture in a `px` box: the file scaled so its opaque box fills
 *  the box, centred. */
export function CatIcon({ icon, px, dim }) {
  if (!icon) return null;
  const [src, size, x0, y0, x1, y1] = icon;
  const k = px / Math.max(x1 - x0, y1 - y0);
  return (
    <span data-lb-icon="" aria-hidden="true" style={{ position: 'relative', flex: 'none', width: px, height: px, overflow: 'hidden', display: 'block', opacity: dim ? 0.92 : 1 }}>
      <img src={src} alt="" draggable={false} style={{
        position: 'absolute', maxWidth: 'none', width: size * k, height: 'auto',
        left: px / 2 - ((x0 + x1) / 2) * k, top: px / 2 - ((y0 + y1) / 2) * k,
      }} />
    </span>
  );
}

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
  display: 'inline-flex', alignItems: 'center', gap: 5, height: 32, padding: '0 12px',
  background: active ? COL.accentFill : 'transparent',
  color: active ? COL.accent : COL.text2,
  border: `1px solid ${active ? COL.accent : COL.border}`,
  borderRadius: 999, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
});

/* the side list's width (122: "Woodworking", the longest word, whole in its
   pill beside a 20 px picture), and the smallest page it stands beside the
   board on: that + a board of ~220 wide (rank, face, a name of ten letters, the
   record), and tall enough to show three boards of the list at once -- a
   phone on its side has a band ~80 px tall, where a list would be one row
   and a half and the chips show five */
const RAIL_W = 122;
const SIDE_BY_SIDE = 330;
const LIST_MIN_H = 140;

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
            <span key={'s:' + b.sec} aria-hidden="true" style={railHeading(true)}>{b.sec}</span>
          ) : (
            <button key={b.id} type="button" data-lb-cat={b.id} aria-pressed={b.id === cat} title={b.full || b.label} onClick={() => setCat(b.id)} style={chipHit}>
              <span style={{ ...chip(b.id === cat), padding: '0 12px 0 8px' }}><CatIcon icon={b.icon} px={18} dim={b.id !== cat} />{b.label}</span>
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
        {list.map((b, bi) => (b.sec ? (
          /* v2.3.4356: a heading headlines its section (railKit railHeading) */
          <div key={'s:' + b.sec} data-lb-sec={b.sec} role="presentation" style={railHeading(false, bi === 0)}>{b.sec}</div>
        ) : (
          /* the button is the 44 px target; the pill inside it is what is seen
             (the chips' rule, v2.3.1235) */
          <button key={b.id} type="button" role="tab" aria-selected={b.id === cat} data-lb-cat={b.id}
            title={b.full || b.label} onClick={() => setCat(b.id)}
            style={{
              display: 'flex', alignItems: 'center', width: '100%', minHeight: 44, margin: 0, padding: 0,
              background: 'transparent', border: 'none', fontFamily: 'inherit', cursor: 'pointer', touchAction: 'manipulation',
            }}>
            <span data-lb-pill="" style={{
              display: 'flex', alignItems: 'center', gap: 5, width: '100%', height: 36, padding: '0 7px 0 6px', boxSizing: 'border-box',
              borderRadius: 999,
              /* a lit pill is a tint over the same well, never a hole (NavRail, v2.3.2176) */
              background: b.id === cat ? `linear-gradient(0deg, ${COL.accentFill}, ${COL.accentFill}), ${COL.wellSoft}` : COL.wellSoft,
              border: `1px solid ${b.id === cat ? COL.accent : COL.tileBor}`,
              color: b.id === cat ? COL.accent : COL.text, fontSize: 12.5, fontWeight: 700, textAlign: 'left',
            }}>
              <CatIcon icon={b.icon} px={20} dim={b.id !== cat} />
              <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.label}</span>
            </span>
          </button>
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
