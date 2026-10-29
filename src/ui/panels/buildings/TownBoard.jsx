import React from 'react';
import { deskWords } from '@/game/deskWords.js';
import { GROUPS, boardEntry, boardPinnable, boardName } from '@/data/townBoard.js';
import { boardRows, boardLandNames, boardSub, boardBadge } from '@/game/mapPinPlaces.js';
import { dailyRewardsBus } from '@/game/dailyRewards.js';   /* v2.3.3803: the spin's badge follows the worker's daily state */
import { loadPins, pinsOn, PIN_CSS } from '@/game/mapPins.js';
import { BoardPage, BoardFoot } from './TownBoardPage.jsx';   /* v2.3.3801: a page and the foot, apart from the grid */

/* ═══ v2.3.3766: THE TOWN HALL'S BOARD ═══
 *
 * The owner: "at the town hall it was just a big menu board of all the things
 * to do (dungeon, gambling, arena, woodworking, etc) with a page that
 * describes what each thing does and pin drop you can put on the map to go to
 * the one you want (two pins can be active at once - red pin and blue pin).
 * When you "enter it" it brings up the board."
 *
 *   THE BOARD   a tile a thing to do (data/townBoard.js, only what this worker
 *               opens: game/mapPinPlaces.js boardRows), under a few plain
 *               headings; a tile wears the pins that are on it;
 *   A PAGE      what it is, in 2-4 short sentences, where it is, and two
 *               buttons, Red pin and Blue pin (game/mapPins.js: on it, moved
 *               from wherever it was; pressed where it already is, lifted);
 *   THE FOOT    the Town Hall's two rows of v2.3.3258, the owner's choice
 *               (the trophy case is the leaderboard, the painted map the world
 *               map), as two small buttons.
 * v2.3.3801: a page and the foot are TownBoardPage.jsx (and a page with no
 * place has one action button); every tile has a line under its name.
 * The pins show on the minimap and the world map, until lifted, per
 * character.  Lantern Slate, as WheelHallPanel's halls (its tokens). */
export const LS = {
  txt1: '#F4F0E7', txt2: '#B6C1BE', txt3: '#8D9B98',
  strip: '#27393F', raised: '#293B41', well: '#111E23',
  border: 'rgba(229,237,233,.11)', borderStrong: 'rgba(229,237,233,.20)',
  brass: '#D8AA58'
};
const MOD = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: LS.txt3, margin: '4px 0 0' };
export const TAP = { touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', font: 'inherit', cursor: 'pointer' };

/* v2.3.3779: `aspect`, a picture wider than tall (a land's scene, the
   Arena's gate) drawn at the tile's height and its own width.  Every tile's
   picture fills about the same height (the orchestrator: the small icons
   "look half-empty next to the lands"): the game's UI icons (a building's map
   picture, the skull, the swords) leave a wide clear margin round what they
   draw, so they are drawn PAD times larger, the margin spilling into the
   tile's padding; a picture with fewer pixels than it is drawn with goes
   pixelated, crisp rather than blurred. */
const PAD = 1.45;
function padOf(src) { return src.startsWith('/icons/ui/') || src.startsWith('/ui/controls/') ? PAD : 1; }
export function Icon({ src, emoji, size, aspect }) {
  const zoom = padOf(src);
  return (
    <img src={src} alt="" draggable={false} data-icon-zoom={zoom}
      style={{ width: Math.round(size * (aspect || 1)), height: size, objectFit: 'contain', flexShrink: 0, borderRadius: 6,
        transform: zoom !== 1 ? 'scale(' + zoom + ')' : undefined }}
      onLoad={function (e) {
        const img = e.currentTarget;
        const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
        if (img.naturalHeight && img.naturalHeight < size * zoom * dpr) img.style.imageRendering = 'pixelated';
      }}
      onError={function (e) { e.currentTarget.replaceWith(document.createTextNode(emoji)); }} />
  );
}

/* ═══ v2.3.3802: ONE ART BOX, EVERY PICTURE THE SAME SIZE TO THE EYE ═══
   The board's layout pass (the owner ran it past ChatGPT; we took its layout
   advice): the townsfolk's heads looked much smaller than the lands' wide
   scenes, because a head is drawn small in the middle of a clear square and a
   scene fills its whole frame.  So each tile's picture sits in one THUMB x
   THUMB box and is scaled by what it DRAWS: once loaded, its opaque part is
   found (a 64 px read of the <img>, once a picture, kept in THUMB_FIT) and
   that part is grown to fill the box, centred -- a head and a scene end up
   the same size, neither stretched.  Small art still goes pixelated, crisp
   rather than blurred. */
const THUMB = 52;
const THUMB_FIT = new Map();   /* src -> { z, ox, oy } in box px (a cap of what the board shows) */
function fitOf(img, box) {
  const nw = img.naturalWidth, nh = img.naturalHeight;
  if (!nw || !nh) return null;
  const N = 64, k0 = Math.min(N / nw, N / nh), w = Math.max(1, Math.round(nw * k0)), h = Math.max(1, Math.round(nh * k0));
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  try {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    cv.width = cv.height = 0;
  } catch (e) { return null; }
  if (x1 < x0) return null;
  /* the picture as `contain` lays it in the box, and its drawn part there */
  const k = Math.min(box / nw, box / nh), dw = nw * k, dh = nh * k, ox = (box - dw) / 2, oy = (box - dh) / 2;
  const cw = ((x1 - x0 + 1) / w) * dw, ch = ((y1 - y0 + 1) / h) * dh;
  const cx = ox + ((x0 + x1 + 1) / 2 / w) * dw, cy = oy + ((y0 + y1 + 1) / 2 / h) * dh;
  const z = Math.max(1, Math.min(2.4, (box * 0.94) / Math.max(cw, ch)));
  return { z: +z.toFixed(3), cx, cy };
}
function Thumb({ src, emoji }) {
  const ref = React.useRef(null);
  const apply = function (img, f) {
    if (!f) return;
    img.style.transformOrigin = f.cx.toFixed(1) + 'px ' + f.cy.toFixed(1) + 'px';
    img.style.transform = 'translate(' + (THUMB / 2 - f.cx).toFixed(1) + 'px, ' + (THUMB / 2 - f.cy).toFixed(1) + 'px) scale(' + f.z + ')';
    img.setAttribute('data-thumb-zoom', String(f.z));
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const k = Math.min(THUMB / img.naturalWidth, THUMB / img.naturalHeight) * f.z;
    if (k * dpr > 1.05) img.style.imageRendering = 'pixelated';
  };
  return (
    <span className="bt-tb-thumb" aria-hidden="true">
      <img ref={ref} src={src} alt="" draggable={false} data-thumb=""
        onLoad={function (e) {
          const img = e.currentTarget;
          let f = THUMB_FIT.get(src);
          if (f === undefined) { f = fitOf(img, THUMB); if (THUMB_FIT.size < 200) THUMB_FIT.set(src, f); }
          apply(img, f);
        }}
        onError={function (e) { e.currentTarget.replaceWith(document.createTextNode(emoji)); }} />
    </span>
  );
}

/* v2.3.3803: what waits at a tile (mapPinPlaces.js boardBadge, real state
   only), in its top-left corner -- the pins have the right: the quests offered
   now, a count on the gold of the "!" pin; "Spin ready" in the Den's brass */
function Badge({ b }) {
  if (!b) return null;
  const quest = b.kind === 'quest';
  return (
    <span data-board-badge={b.kind} aria-label={quest ? b.n + (b.n === 1 ? ' quest' : ' quests') + ' to take' : b.text}
      style={{ position: 'absolute', top: 5, left: 5, minWidth: quest ? 18 : 0, height: 18, padding: quest ? '0 5px' : '0 7px', borderRadius: 999,
        background: quest ? '#F2B33D' : LS.brass, color: '#1B140A', fontSize: quest ? 11.5 : 10, fontWeight: 800, lineHeight: '18px', textAlign: 'center',
        boxShadow: '0 0 0 1.5px #0b161b', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
      {b.text}
    </span>
  );
}

/* ═══ v2.3.3802: THE NAV STRIP ═══
   A thin row of chips under the Town Hall's header, one per heading in the
   board's order, that stays at the top while the board scrolls (sticky in the
   window's own scroller, the building card).  A tap scrolls the board to that
   heading; the heading in view wears the gold accent, followed by an
   IntersectionObserver on the headings -- nothing done a frame. */
function NavStrip({ groups, active, onPick }) {
  return (
    <div className="bt-tb-nav" data-board-nav="" role="tablist">
      {groups.map(function (g) {
        const on = g.id === active;
        return (
          <button key={g.id} type="button" role="tab" aria-selected={on} data-board-chip={g.id} data-chip-on={on ? 1 : 0}
            className={'bt-tb-chip' + (on ? ' is-on' : '')} onClick={function () { onPick(g.id); }}>{g.name}</button>
        );
      })}
    </div>
  );
}

/* the little pins a tile wears, in its corner */
function PinDots({ on }) {
  if (!on.length) return null;
  return (
    <span aria-hidden="true" style={{ position: 'absolute', top: 5, right: 5, display: 'flex', gap: 3 }}>
      {on.map(function (k) {
        return <span key={k} data-tile-pin={k} style={{ width: 10, height: 10, borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', background: PIN_CSS[k], boxShadow: '0 0 0 1.5px #0b161b' }} />;
      })}
    </span>
  );
}

export function TownBoard(props) {
  const S = (props.stateRef && props.stateRef.current) || {};
  const [page, setPage] = React.useState(null);
  const [, bump] = React.useState(0);
  /* v2.3.3803: the worker's daily state arrives (or a spin is taken): the Den's badge follows */
  React.useEffect(function () { return dailyRewardsBus.subscribe(function () { bump(function (n) { return n + 1; }); }); }, []);
  loadPins(S, null, boardPinnable);
  const rows = boardRows(S);
  const e = page ? boardEntry(page) : null;
  const names = boardLandNames();   /* v2.3.3779: a land's name is the world's */
  /* v2.3.3802: the board's headings, in order, that have something under them */
  const shown = GROUPS.filter(function (g) { return rows.some(function (r) { return r.group === g.id; }); });
  const [active, setActive] = React.useState(shown.length ? shown[0].id : null);
  const boardRef = React.useRef(null);
  React.useEffect(function () {
    const el = boardRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const root = el.closest('.bt-inspect-card') || null;
    const nav = el.querySelector('[data-board-nav]');
    const top = nav ? nav.offsetHeight : 0;
    const seen = new Map();
    const io = new IntersectionObserver(function (list) {
      list.forEach(function (en) { seen.set(en.target.getAttribute('data-board-heading'), en.isIntersecting); });
      /* the first heading, in the board's order, still in the band under the strip */
      const heads = el.querySelectorAll('[data-board-heading]');
      for (let i = 0; i < heads.length; i++) {
        const id = heads[i].getAttribute('data-board-heading');
        if (seen.get(id)) { setActive(id); return; }
      }
    }, { root, rootMargin: '-' + (top + 2) + 'px 0px -55% 0px', threshold: 0 });
    el.querySelectorAll('[data-board-heading]').forEach(function (h) { io.observe(h); });
    return function () { io.disconnect(); };
  }, [page, rows.length]);
  const pick = function (id) {
    const el = boardRef.current;
    const h = el && el.querySelector('[data-board-heading="' + id + '"]');
    if (h) h.scrollIntoView({ block: 'start', behavior: 'smooth' });
    setActive(id);
  };

  if (e) {
    return <BoardPage S={S} entry={e} names={names} onBack={function () { setPage(null); }} bump={function () { bump(function (n) { return n + 1; }); }}
      onDash={props.onDash} onClose={props.onClose} />;
  }

  /* v2.3.3802: the layout pass -- the sticky nav strip, sections 22 px apart,
     a grid whose columns follow the board's own width (game.css .bt-tb: 3,
     4 from 540 px, 5 from 720 px), every tile in a section one height, its
     subtitle at its foot */
  return (
    <div ref={boardRef} className="bt-tb" data-town-board={rows.length}>
      <div className="bt-tb-lede">
        {deskWords('Everything to do in the world. Tap one to read about it and pin it on your map.')}
      </div>
      <NavStrip groups={shown} active={active} onPick={pick} />
      {shown.map(function (g) {
        const list = rows.filter(function (r) { return r.group === g.id; });
        return (
          <section key={g.id} className="bt-tb-sec">
            <div style={MOD} data-board-heading={g.id} className="bt-tb-head">{g.name}</div>
            <div data-board-group={g.id} className="bt-tb-grid">
              {list.map(function (r) {
                const on = pinsOn(S, r.id);
                const sub = boardSub(S, r);   /* v2.3.3801: every tile's one line (a dungeon's its levels) */
                return (
                  <button key={r.id} type="button" data-board-tile={r.id} data-board-pins={on.join(',')}
                    onClick={function () { setPage(r.id); }} className="bt-tb-tile"
                    style={Object.assign({}, TAP, { border: '1px solid ' + (on.length ? PIN_CSS[on[0]] : LS.borderStrong) })}>
                    <Thumb src={r.icon} emoji={r.emoji} />
                    <span className="bt-tb-name">{boardName(r, names)}</span>
                    {/* v2.3.3788: a dungeon's levels under its name (the owner: "list the level ranges below the dungeons");
                        v2.3.3801: every tile's line (data-board-level stays on a dungeon's); v2.3.3802: at the tile's foot */}
                    {sub ? <span className="bt-tb-sub" data-board-sub="" data-board-level={r.mouth ? '' : undefined}>{sub}</span> : null}
                    <PinDots on={on} />
                    <Badge b={boardBadge(S, r)} />
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
      <BoardFoot onLeaderboard={props.onLeaderboard} onMap={props.onMap} onDash={props.onDash} />
    </div>
  );
}
