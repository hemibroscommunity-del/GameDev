import React, { useEffect, useState } from 'react';
import { COL } from './common.js';
import { portraitDataUrl, portraitOptsFromPeer, portraitHasSubject } from '@/rendering/characterPortrait.js';
import { peerCosmeticsFromWire } from '@/networking/peerCosmetics.js';

/* ═══ v2.3.4389: ONE ROW FOR EVERY BOARD -- THE FACE, THE LEVEL, THE RECORD ═══
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
        portraitDataUrl(portraitOptsFromPeer(cos), true).then((u) => {
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

/* ═══ v2.3.4389: THE FIRST FIVE PLACES WEAR THE OWNER'S TROPHIES ═══
 * The owner, of the first pictures of this page: "This is looking good.  Add
 * these trophies to the left of the ranks.  Add a cool code based effect for
 * shine or slight sparkling."  His sheet: a crowned gold cup (1), a silver
 * cup (2), a bronze cup (3), a yellow rosette (4), a pink rosette (5), each
 * with its number on it (tools/ui/cut-rank-trophies.py -> /icons/ui/
 * rank-<n>.webp, 120 px, 256 colours).
 *
 * IN THE RANK'S PLACE, at the row's left edge: the trophy carries its number,
 * so "#1" beside it would say it twice, and a phone's row has no 40 px to
 * spare (the name beside "10,000 gold" would be four letters).  From sixth
 * place down the column is the "#6" it was, the same width, so the faces
 * stay in one line.
 *
 * THE SHINE AND THE SPARKLE ARE CODE (game.css .bt-rank-*), nothing drawn or
 * loaded: a band of light crosses the picture every few seconds, cut to the
 * trophy's own shape (the picture is its own CSS mask), and small four-point
 * stars wink on its rim -- three on the gold cup, two on the silver and the
 * bronze, one on each rosette, each in its metal's light.  Transforms and
 * opacity only; each place starts a beat after the one above, so a board's
 * top five glint down the column in turn rather than all at once.  Still
 * under `prefers-reduced-motion`, and on a deleted character's row, whose
 * trophy is grey like the rest of it. */
const RANK_ART = (n) => '/icons/ui/rank-' + n + '.webp?v=2.3.4355';
export const RANK_TROPHIES = 5;
/* where each place's stars sit on its picture (percent of the 40 px box), and
   how big: on the cup's lip and handles, the rosette's upper petals */
const SPARKS = {
  1: [[22, 16, 9], [78, 34, 7], [50, 4, 6]],
  2: [[24, 22, 8], [76, 40, 6]],
  3: [[70, 24, 8], [28, 44, 6]],
  4: [[72, 18, 8]],
  5: [[28, 18, 8]],
};
/* the page's five pictures asked for as its script loads (this file is in the
   Leaderboards' own chunk), so the first board's rows do not pop them in */
try {
  if (typeof Image !== 'undefined') for (let n = 1; n <= RANK_TROPHIES; n++) { const im = new Image(); im.decoding = 'async'; im.src = RANK_ART(n); }
} catch (_e) { /* a row's own <img> loads it */ }

/** The rank column: the trophy for the first five places, "#N" below. */
export function RankMark({ rank, gone }) {
  if (!(rank >= 1 && rank <= RANK_TROPHIES)) {
    return (
      <span data-rank-mark="number" style={{
        width: 40, flex: 'none', textAlign: 'center', fontSize: 15, fontWeight: 800,
        color: gone ? COL.disabled : COL.muted, fontVariantNumeric: 'tabular-nums',
      }}>#{rank}</span>
    );
  }
  const art = RANK_ART(rank);
  return (
    <span className={'bt-rank-trophy bt-rank-' + rank + (gone ? ' bt-rank-gone' : '')} data-rank-mark="trophy" data-rank-trophy={rank}
      role="img" aria-label={'Rank ' + rank}
      style={{ '--rank-art': 'url(' + art + ')', '--rank-delay': ((rank - 1) * 0.35).toFixed(2) + 's' }}>
      <img src={art} alt="" draggable={false} />
      {gone ? null : <span className="bt-rank-shine" aria-hidden="true" />}
      {gone ? null : SPARKS[rank].map((s, i) => (
        <span key={i} className="bt-rank-spark" aria-hidden="true"
          style={{ left: s[0] + '%', top: s[1] + '%', width: s[2], height: s[2], animationDelay: ((rank - 1) * 0.35 + 0.9 + i * 1.1).toFixed(2) + 's' }} />
      ))}
    </span>
  );
}

/** The picture tile: the bust, or the name's initial; grey with DELETED
 *  across it for a deleted character. */
export function BoardFace({ src, name, gone }) {
  const initial = String(name || '?').trim().slice(0, 1).toUpperCase() || '?';
  return (
    <span data-board-face={gone ? 'gone' : src ? 'bust' : 'initial'} style={{
      position: 'relative', flex: 'none', width: FACE_PX, height: FACE_PX, display: 'block',
    }}>
      <span style={{
        position: 'absolute', inset: 0, borderRadius: 9, overflow: 'hidden',
        background: COL.wellSoft, border: `1px solid ${gone ? COL.border : COL.borderStrong}`, boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        /* the stand-in: desaturated and dimmed, never hidden */
        filter: gone ? 'grayscale(1)' : 'none', opacity: gone ? 0.5 : 1,
      }}>
        {src ? (
          <img src={src} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} />
        ) : (
          <span aria-hidden="true" style={{ fontSize: 18, fontWeight: 800, color: COL.text2 }}>{initial}</span>
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

/** One row.  `rank` 1-based; `row` {name, lv, gone}; `face` its bust (or
 *  none); `line` the words under the name (a node or a string, optional);
 *  `value` the record, `unit` a small word after it; `mine` lights it. */
export function BoardRow({ rank, row, face, line, value, unit, mine, hook }) {
  const gone = !!(row && row.gone);
  const name = (row && (row.name || row.id || row.pid)) || 'Bro';
  const lv = Math.floor(Number(row && row.lv) || 0);
  return (
    <div {...(hook || null)} data-board-row={rank} data-board-gone={gone ? '1' : undefined}
      aria-label={gone ? name + ', a deleted character' : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, minHeight: 52, padding: '0 8px 0 4px',
        borderBottom: `1px solid ${COL.divider}`,
        /* Finding yourself on a fifty-row board is the whole reason to open
           it; without this you scan every name. */
        background: mine ? COL.accentFill : 'transparent',
      }}>
      <RankMark rank={rank} gone={gone} />
      <BoardFace src={face} name={name} gone={gone} />
      <span style={{ flex: 1, minWidth: 0, display: 'block' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span data-board-name="" style={{
            minWidth: 0, fontSize: 15, fontWeight: 700, color: gone ? COL.muted : COL.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{name}</span>
          {/* the name plate's level, as the world draws it beside a name */}
          {lv > 0 ? (
            <span data-board-lv={lv} title={'Level ' + lv} style={{
              flex: 'none', minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, boxSizing: 'border-box',
              background: gone ? 'transparent' : COL.well, border: `1px solid ${gone ? COL.border : COL.edgeWarm}`,
              color: gone ? COL.muted : COL.accent, fontSize: 12, fontWeight: 800, lineHeight: '16px', textAlign: 'center',
              fontVariantNumeric: 'tabular-nums',
            }}><span style={{ fontWeight: 700, opacity: 0.8 }}>Lv </span>{lv}</span>
          ) : null}
        </span>
        {line ? (
          <span data-board-line="" style={{
            display: 'block', marginTop: 1, fontSize: 12.5, fontWeight: 600, color: gone ? COL.disabled : COL.text2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{line}</span>
        ) : null}
      </span>
      {/* the record: last in the row, so a row reads "#1 name ... value" */}
      <span data-lb-value="" style={{
        flex: 'none', textAlign: 'right', fontSize: 16, fontWeight: 800, color: gone ? COL.muted : COL.text,
        fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
      }}>{value}{unit ? <span style={{ fontSize: 12, fontWeight: 700, color: gone ? COL.disabled : COL.text2 }}> {unit}</span> : null}</span>
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
