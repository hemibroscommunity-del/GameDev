import React, { useEffect, useState } from 'react';
import { COL } from './common.js';
import { portraitDataUrl, portraitOptsFromPeer, portraitHasSubject } from '@/rendering/characterPortrait.js';
import { peerCosmeticsFromWire } from '@/networking/peerCosmetics.js';

/* ═══ v2.3.4393: ONE ROW FOR EVERY BOARD -- THE FACE, THE LEVEL, THE RECORD ═══
 * The owner: "include the character profile pic and level next to each
 * record", and "stand-in (deleted character) rows ... still include their
 * profile pic and level but just grayed out with the deleted label over it".
 *
 * Every board on the Leaderboards page (the ranks, the daily spin, Ace's
 * flips, the biggest fish) draws this row:
 *
 *   [cup]  [face]  Name [12]              12,800 gold
 *                  a line about the record
 *
 * (the owner's trophy for the first five places, "#6" from there down:
 * RankMark, below)
 *
 * THE FACE IS A LOOK, NOT AN IMAGE (server boards.js; the Ace board's rule):
 * the row carries the short cosmetic ids the worker stamped when the record
 * was set, and the bust is drawn here by the one recipe every portrait of
 * somebody else uses (portraitOptsFromPeer -> portraitDataUrl, the Hemi Bro
 * bust, whose layers are behind the loading screen: preloadAnimations.js
 * hemiBust).  A row with no look (a record from before this, a guest) gets
 * its initial on a tile, the honest answer rather than a default body that
 * is nobody.
 *
 * THE LEVEL IS THE NAME PLATE'S: a small pill after the name, as the world
 * draws "Reviewer 1" over a head -- so a board that ranks something else
 * (Fishing, a pot of gold) never shows two numbers that both read "Lv".
 *
 * A DELETED CHARACTER'S ROW (`gone`): the same row in grey -- the face
 * desaturated and dimmed, a DELETED stamp across it, the name and the record
 * muted -- still holding its place until someone beats it.
 *
 * MEMORY: a bust is a ~1 KB data URL; they are kept by look in FACES, capped
 * (FACE_CAP), oldest out, so a long evening of board-flipping holds a fixed
 * handful (the bust's own cache, hemiBust.js, is capped the same way). */
const FACE_CAP = 120;
const FACES = new Map();   /* JSON look -> data URL */
const faceKey = (look) => { try { return JSON.stringify(look); } catch (_e) { return ''; } };
/* ═══ v2.3.4874: ONE FACE A TURN ═══
   A board asked for every face it had at once, and their drawing (a bust
   recoloured for each look) landed in one piece: 140 to 149 ms held as a
   board of 56 faces opened (held-budget.mjs `portrait`, mp-crowdsweep
   g-boards).  Now the faces are drawn one at a time, FACE_SLICE_MS of them,
   then the next frame first (or FACE_WAIT_MS with no frame coming); a row
   shows the plain circle until its face is in, as it always did while one
   drew.  The faces drawn stay in FACES (FACE_CAP), so a board seen again
   draws none. */
const FACE_WAIT_MS = 100;
let _faceLine = Promise.resolve();
const _faceAfterFrame = () => new Promise((res) => {
  let done = false;
  const go = () => { if (!done) { done = true; res(); } };
  try { requestAnimationFrame(() => setTimeout(go, 0)); } catch (_e) { /* the timer below */ }
  setTimeout(go, FACE_WAIT_MS);
});
const FACE_SLICE_MS = 6;   /* a bust is 1 to 3 ms: two or three a frame */
let _faceT0 = 0;
const _faceNext = () => {
  const now = performance.now();
  if (now - _faceT0 < FACE_SLICE_MS) return undefined;   /* this slice has room: the next face now */
  return _faceAfterFrame().then(() => { _faceT0 = performance.now(); });
};
function _faceInTurn(job) {
  /* a line that sat idle starts a fresh slice */
  const start = () => { const now = performance.now(); if (now - _faceT0 > 50) _faceT0 = now; return job(); };
  const p = _faceLine.then(start, start);
  _faceLine = p.then(_faceNext, _faceNext);
  return p;
}

/** The busts of `rows` (each `{look}`), by row index: { i: url }.  Drawn as
 *  they come; a row whose look is missing or blank has no entry. */
export function useBoardFaces(rows) {
  const [, bump] = useState(0);
  const sig = rows.map((r) => (r && r.look ? faceKey(r.look) : '')).join('|');
  useEffect(() => {
    let alive = true;
    rows.forEach((r) => {
      if (!r || !r.look || typeof r.look !== 'object') return;
      const key = faceKey(r.look);
      if (!key || FACES.has(key)) return;
      const cos = peerCosmeticsFromWire(r.look);
      if (!portraitHasSubject(cos)) return;
      FACES.set(key, '');   /* asked for: not asked again while it draws */
      try {
        _faceInTurn(() => portraitDataUrl(portraitOptsFromPeer(cos), true)).then((u) => {
          if (u) {
            FACES.delete(key); FACES.set(key, u);   /* newest last */
            while (FACES.size > FACE_CAP) FACES.delete(FACES.keys().next().value);
            if (alive) bump((n) => (n + 1) % 1000000);
          } else FACES.delete(key);
        }).catch(() => { FACES.delete(key); });
      } catch (_e) { FACES.delete(key); /* a portrait is never worth taking the board down for */ }
    });
    return () => { alive = false; };
  }, [sig]);
  const out = {};
  rows.forEach((r, i) => { if (r && r.look) { const u = FACES.get(faceKey(r.look)); if (u) out[i] = u; } });
  return out;
}

const FACE_PX = 40;

/* ═══ v2.3.5501: THE LEADERBOARDS' NEW LOOK (card LB; docs/specs/leaderboard-look.md) ═══
 * The owner, 2026-11-14: "I'd also like something more like this for
 * leaderboards (mockup and art assets attached)", and of the second mockup,
 * "This pic is better mock representation".  The pieces are the owner's
 * sheet cut by tools/ui/cut-leaderboard.mjs (v2.3.5500) into
 * public/ui/leaderboard/, each at 2 picture px a CSS px on 256 colours.
 *
 * THE MEMORY MAP'S SLOT ("a window's own art, bigger than an icon"): the
 * pieces are files in the page, shown by <img> and CSS backgrounds only while
 * the window is open.  They are asked for as LeaderboardPanel.jsx loads (the
 * Leaderboards' own piece, loaded the first time the window opens: lazyPanels.js
 * DashLeaderboardPanel), as the trophies were, so the first board does not pop
 * them in; nothing holds them once the window is gone but the browser's own
 * cache.  Not behind the loading screen: a window's own art loads with its
 * window (lazyPanels.js's rule). */
export const LB_ART = (name) => '/ui/leaderboard/' + name + '.webp?v=2.3.5500';
/* every piece the window draws (the trophies, rosettes, title frame and the
   silver divider are cut but not drawn: the mockups do not use them).  Asked
   for by LeaderboardPanel.jsx as its script loads, never here: the Test
   panel (DevWatch.jsx) imports this file for its faces and must not fetch
   the pieces (the gatekeeper's sitting 10). */
export const LB_PIECES = ['laurel-left', 'laurel-right', 'crown', 'shield-silver', 'shield-gold', 'shield-bronze',
  'medal-1', 'medal-2', 'medal-3', 'pill-gold', 'pill-plain', 'bar-gold', 'bar-silver', 'bar-bronze', 'bar-plain',
  'tile-crown', 'tile-sword', 'tile-bow', 'tile-staff', 'divider-gold'];

/* THE BARS AND PILLS are kept as their two round ends and a strip of middle
   (96 px wide; `ends` 40 px, cut-leaderboard.mjs), so a row or a pill of any
   width wears one as a CSS border-image: the ends whole, the middle stretched.
   Its own span behind the content (absolute, inset 0), so the border it
   needs never pushes the content in.  `h` is the picture's height. */
const BAR_H = { 'bar-gold': 63, 'bar-silver': 63, 'bar-bronze': 61, 'bar-plain': 65, 'pill-gold': 70, 'pill-plain': 63 };
export function BarBack({ name, dim }) {
  const h = BAR_H[name] || 63;
  const v = Math.floor(h / 2) - 1;   /* the slice's top and bottom: the ends' whole curve, a pixel of middle */
  return (
    <span aria-hidden="true" data-lb-bar={name} style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', boxSizing: 'border-box',
      borderStyle: 'solid', borderColor: 'transparent', borderWidth: `${v / 2}px 20px`,
      borderImage: `url(${LB_ART(name)}) ${v} 40 ${v} 40 fill / ${v / 2}px 20px stretch`,
      opacity: dim ? 0.55 : 1,
    }} />
  );
}

/* ═══ THE RANK: the laurel medals for the first three, the number below ═══
 * (v2.3.4393's trophies for the first five, the owner's 2026-11-09 sheet,
 * give way to the new sheet's medals 1-3, as both mockups show.)  The
 * medal's shine and sparkle are v2.3.4393's code (game.css .bt-rank-*: a band
 * of light cut to the picture's own shape, small stars on the rim), moved onto
 * the medals: the stars on the laurel's leaves.  From fourth place down the
 * column is the plain number.  A deleted character's medal is grey and still. */
export const RANK_MEDALS = 3;
const MEDAL_PX = { 1: [32, 25], 2: [30, 24], 3: [30, 23] };
const MEDAL_PX_SMALL = { 1: [28, 22], 2: [27, 21], 3: [27, 21] };   /* a table's 28 px column */
const SPARKS = {
  1: [[16, 24, 7], [84, 30, 6], [50, 4, 5]],
  2: [[18, 28, 6], [82, 40, 5]],
  3: [[80, 26, 6], [20, 46, 5]],
};

/** The rank column: the medal for the first three places, the number below.
 *  `w` the column's width. */
export function RankMark({ rank, gone, w = 34 }) {
  if (!(rank >= 1 && rank <= RANK_MEDALS)) {
    return (
      <span data-rank-mark="number" style={{
        position: 'relative', width: w, flex: 'none', textAlign: 'center', fontSize: 14, fontWeight: 800,
        color: gone ? COL.disabled : COL.text2, fontVariantNumeric: 'tabular-nums',
      }}>{rank}</span>
    );
  }
  const art = LB_ART('medal-' + rank);
  const [mw, mh] = (w < 32 ? MEDAL_PX_SMALL : MEDAL_PX)[rank];
  return (
    <span style={{ position: 'relative', width: w, flex: 'none', display: 'flex', justifyContent: 'center' }}>
      <span className={'bt-rank-trophy bt-rank-' + rank + (gone ? ' bt-rank-gone' : '')} data-rank-mark="medal" data-rank-medal={rank}
        role="img" aria-label={'Rank ' + rank}
        style={{ width: mw, height: mh, '--rank-art': 'url(' + art + ')', '--rank-delay': ((rank - 1) * 0.35).toFixed(2) + 's' }}>
        <img src={art} alt="" draggable={false} />
        {gone ? null : <span className="bt-rank-shine" aria-hidden="true" />}
        {gone ? null : SPARKS[rank].map((s, i) => (
          <span key={i} className="bt-rank-spark" aria-hidden="true"
            style={{ left: s[0] + '%', top: s[1] + '%', width: s[2], height: s[2], animationDelay: ((rank - 1) * 0.35 + 0.9 + i * 1.1).toFixed(2) + 's' }} />
        ))}
      </span>
    </span>
  );
}

/* the row's bar: gold, silver and bronze for the first three, your own row
   the plain bar, every other row none (the second mockup's plain rows) */
export const rowBar = (rank, mine) => (rank === 1 ? 'bar-gold' : rank === 2 ? 'bar-silver' : rank === 3 ? 'bar-bronze' : mine ? 'bar-plain' : null);
/* your own row in the first three has its metal's bar like the others: a
   light ring round it marks it yours (the gatekeeper's sitting 10).  An
   outline follows the row's round ends and takes no room. */
export const mineRing = (mine, rank) => (mine && rank <= 3 ? { outline: '2px solid #F4F0E7', outlineOffset: -1 } : null);

/** The picture tile: the bust, or the name's initial; grey with DELETED
 *  across it for a deleted character. */
export function BoardFace({ src, name, gone, px = FACE_PX }) {
  const initial = String(name || '?').trim().slice(0, 1).toUpperCase() || '?';
  return (
    <span data-board-face={gone ? 'gone' : src ? 'bust' : 'initial'} style={{
      position: 'relative', flex: 'none', width: px, height: px, display: 'block',
    }}>
      <span style={{
        position: 'absolute', inset: 0, borderRadius: Math.round(px * 0.22), overflow: 'hidden',
        background: COL.wellSoft, border: `1px solid ${gone ? COL.border : COL.borderStrong}`, boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        /* the stand-in: desaturated and dimmed, never hidden */
        filter: gone ? 'grayscale(1)' : 'none', opacity: gone ? 0.5 : 1,
      }}>
        {src ? (
          <img src={src} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} />
        ) : (
          <span aria-hidden="true" style={{ fontSize: Math.round(px * 0.45), fontWeight: 800, color: COL.text2 }}>{initial}</span>
        )}
      </span>
      {gone ? (
        <span data-board-deleted="" style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%) rotate(-10deg)',
          /* 9 px: the one word on the page under the 11 px floor, on purpose
             -- it is a stamp across a 40 px picture (wider, it runs over the
             rank and the name), and the grey row and its spoken name say the
             same thing */
          padding: '0 3px', borderRadius: 4,
          background: 'rgba(11, 22, 27, 0.92)', border: `1px solid ${COL.muted}`,
          color: '#E6ECEA', fontSize: 9, fontWeight: 900, letterSpacing: '.03em', lineHeight: '13px',
          whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>DELETED</span>
      ) : null}
    </span>
  );
}

/* the name plate's level, as the world draws it beside a name: a small pill */
export function LvPill({ lv, gone, value, small, text }) {
  if (!(lv > 0) && !text) return null;
  return (
    <span {...(text ? { 'data-lb-pill-value': '' } : { 'data-board-lv': lv })} {...(value ? { 'data-lb-value': '' } : null)} title={text ? undefined : 'Level ' + lv} style={{
      flex: 'none', minWidth: 18, height: small ? 16 : 18, padding: small ? '0 4px' : '0 5px', borderRadius: 9, boxSizing: 'border-box',
      background: gone ? 'transparent' : 'rgba(11, 22, 27, 0.72)', border: `1px solid ${gone ? COL.border : COL.edgeWarm}`,
      color: gone ? COL.muted : COL.text, fontSize: small ? 10.5 : 11.5, fontWeight: 800, lineHeight: small ? '14px' : '16px', textAlign: 'center',
      fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
    }}>{text || 'Lv ' + lv}</span>
  );
}

/** One row.  `rank` 1-based; `row` {name, lv, gone}; `face` its bust (or
 *  none); `line` the words under the name (a node or a string, optional);
 *  `value` the record, `unit` a small word after it; `mine` lights it.
 *  v2.3.5501: the new look's row -- the medal, the bar under the first three
 *  (and your own), a crown by the first name.  The records' boards (the spin,
 *  Ace's flips, the fish) draw this one; the ranks' boards draw TableRow. */
export function BoardRow({ rank, row, face, line, value, unit, mine, hook }) {
  const gone = !!(row && row.gone);
  const name = (row && (row.name || row.id || row.pid)) || 'Bro';
  const lv = Math.floor(Number(row && row.lv) || 0);
  const bar = gone ? null : rowBar(rank, mine);
  return (
    <div {...(hook || null)} data-board-row={rank} data-board-gone={gone ? '1' : undefined} data-board-mine={mine ? '1' : undefined}
      aria-label={gone ? name + ', a deleted character' : undefined}
      style={{
        position: 'relative', display: 'flex', alignItems: 'center', gap: 8, minHeight: 48, padding: '2px 12px 2px 6px', margin: '0 0 3px',
        borderBottom: bar ? 'none' : `1px solid ${COL.divider}`,
        /* Finding yourself on a fifty-row board is the whole reason to open
           it; without this you scan every name.  (Below the first three your
           own row wears the plain bar too.) */
        background: mine ? COL.accentFill : 'transparent', borderRadius: bar ? 999 : 0,
        ...mineRing(mine, rank),
      }}>
      {bar ? <BarBack name={bar} /> : null}
      <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
        <RankMark rank={rank} gone={gone} />
        <BoardFace src={face} name={name} gone={gone} px={36} />
        <span style={{ flex: 1, minWidth: 0, display: 'block' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
            <span data-board-name="" style={{
              minWidth: 0, fontSize: 14, fontWeight: 700, color: gone ? COL.muted : COL.text,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: bar ? '0 1px 2px rgba(0,0,0,.7)' : 'none',
            }}>{name}</span>
            {rank === 1 && !gone ? <Crown /> : null}
            <LvPill lv={lv} gone={gone} />
          </span>
          {line ? (
            <span data-board-line="" style={{
              display: 'block', marginTop: 1, fontSize: 12, fontWeight: 600, color: gone ? COL.disabled : COL.text2,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{line}</span>
          ) : null}
        </span>
        {/* the record: last in the row, so a row reads "1 name ... value" */}
        <span data-lb-value="" style={{
          flex: 'none', textAlign: 'right', fontSize: 15, fontWeight: 800, color: gone ? COL.muted : rank <= 3 ? '#FFE7A6' : COL.text,
          fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', textShadow: bar ? '0 1px 2px rgba(0,0,0,.7)' : 'none',
        }}>{value}{unit ? <span style={{ fontSize: 11.5, fontWeight: 700, color: gone ? COL.disabled : COL.text2 }}> {unit}</span> : null}</span>
      </span>
    </div>
  );
}

/** the crown by the first name (the second mockup) */
export function Crown() {
  return <img data-lb-crown="" src={LB_ART('crown')} alt="" aria-hidden="true" draggable={false} style={{ flex: 'none', width: 15, height: 'auto', display: 'block' }} />;
}

/** One row of a ranks board's table (v2.3.5501): the rank, the face, the name
 *  (a crown by the first), then `cells` [{ key, text, strong, value, w }]:
 *  the columns the board's head names (TableHead), each `w` px wide, `value`
 *  marking the one the board ranks by.  The level is a cell too (`lv`). */
export function TableRow({ rank, row, face, cells, mine, cols }) {
  const gone = !!(row && row.gone);
  const name = (row && (row.name || row.id || row.pid)) || 'Bro';
  const bar = gone ? null : rowBar(rank, mine);
  return (
    <div data-board-row={rank} data-board-gone={gone ? '1' : undefined} data-board-mine={mine ? '1' : undefined}
      aria-label={gone ? name + ', a deleted character' : mine ? name + ', you' : undefined}
      style={{
        position: 'relative', display: 'grid', gridTemplateColumns: cols, alignItems: 'center', columnGap: 3,
        minHeight: 30, padding: '0 9px 0 1px', margin: '0 0 2px',
        borderBottom: bar ? 'none' : `1px solid ${COL.divider}`,
        background: mine && !bar ? COL.accentFill : 'transparent', borderRadius: bar ? 999 : 0,
        ...mineRing(mine, rank),
      }}>
      {bar ? <BarBack name={bar} /> : null}
      <RankMark rank={rank} gone={gone} w={28} />
      <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
        <BoardFace src={face} name={name} gone={gone} px={22} />
        {/* the whole name: on two lines where one is too narrow (an upright
            375 px phone), cut only past the second (the gatekeeper's sitting 10) */}
        <span data-board-name="" style={{
          minWidth: 0, fontSize: 12, fontWeight: 700, lineHeight: '13px', color: gone ? COL.muted : COL.text,
          display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden', overflowWrap: 'anywhere',
          textShadow: bar ? '0 1px 2px rgba(0,0,0,.7)' : 'none',
        }}>{name}</span>
        {rank === 1 && !gone ? <Crown /> : null}
      </span>
      {cells.map((c) => (c.key === 'lv' ? (
        <span key="lv" style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}><LvPill lv={c.lv} gone={gone} value={c.value} small /></span>
      ) : (
        <span key={c.key} data-lb-col={c.key} {...(c.value ? { 'data-lb-value': '' } : null)} style={{
          position: 'relative', textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
          fontSize: c.strong ? 13 : 11.5, fontWeight: c.strong || c.value ? 800 : 600,
          color: gone ? COL.muted : c.strong ? '#FFE7A6' : c.value ? COL.text : COL.text2,
          textShadow: bar ? '0 1px 2px rgba(0,0,0,.7)' : 'none',
        }}>{c.text}</span>
      )))}
    </div>
  );
}

/** A board with nothing on it: the icon at .4 and one line (the empty-state
 *  contract, v2.3.1235). */
export function BoardEmpty({ text }) {
  return (
    <div data-board-empty="" style={{ textAlign: 'center', padding: '14px 8px' }}>
      <img src="/icons/ui/panel-leaderboard.webp?v=2.3.1224" alt="" draggable={false}
        style={{ width: 36, height: 36, objectFit: 'contain', opacity: 0.4, margin: '0 auto' /* img{display:block} in game.css defeats textAlign centering */ }}
        onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      <div style={{ fontSize: 13, fontWeight: 700, color: COL.text2, marginTop: 6, lineHeight: 1.4 }}>{text}</div>
    </div>
  );
}
