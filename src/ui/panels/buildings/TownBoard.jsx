import React from 'react';
import { deskWords } from '@/game/deskWords.js';
import { GROUPS, boardEntry, boardPinnable, boardName } from '@/data/townBoard.js';
import { boardRows, boardLandNames, boardSub } from '@/game/mapPinPlaces.js';
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
  loadPins(S, null, boardPinnable);
  const rows = boardRows(S);
  const e = page ? boardEntry(page) : null;
  const names = boardLandNames();   /* v2.3.3779: a land's name is the world's */

  if (e) {
    return <BoardPage S={S} entry={e} names={names} onBack={function () { setPage(null); }} bump={function () { bump(function (n) { return n + 1; }); }}
      onDash={props.onDash} onClose={props.onClose} />;
  }

  return (
    <div data-town-board={rows.length} style={{ display: 'grid', gap: 8 }}>
      <div style={{ fontSize: 12.5, color: LS.txt2, lineHeight: 1.4 }}>
        {deskWords('Everything to do in the world. Tap one to read about it and pin it on your map.')}
      </div>
      {GROUPS.map(function (g) {
        const list = rows.filter(function (r) { return r.group === g.id; });
        if (!list.length) return null;
        return (
          <React.Fragment key={g.id}>
            <div style={MOD}>{g.name}</div>
            <div data-board-group={g.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(98px, 1fr))', gap: 6 }}>
              {list.map(function (r) {
                const on = pinsOn(S, r.id);
                const sub = boardSub(S, r);   /* v2.3.3801: every tile's one line (a dungeon's its levels) */
                return (
                  <button key={r.id} type="button" data-board-tile={r.id} data-board-pins={on.join(',')}
                    onClick={function () { setPage(r.id); }}
                    style={Object.assign({}, TAP, { position: 'relative', minHeight: 78, padding: '10px 6px 8px', borderRadius: 10, background: LS.raised, color: LS.txt1,
                      border: '1px solid ' + (on.length ? PIN_CSS[on[0]] : LS.borderStrong), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 })}>
                    <Icon src={r.icon} emoji={r.emoji} size={36} aspect={r.iconAspect} />
                    <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2, textAlign: 'center' }}>{boardName(r, names)}</span>
                    {/* v2.3.3788: a dungeon's levels under its name (the owner: "list the level ranges below the dungeons");
                        v2.3.3801: every tile's line (data-board-level stays on a dungeon's) */}
                    {sub ? <span data-board-sub="" data-board-level={r.mouth ? '' : undefined} style={{ fontSize: 10.5, fontWeight: 600, color: LS.txt2, lineHeight: 1.2, textAlign: 'center', marginTop: -3 }}>{sub}</span> : null}
                    <PinDots on={on} />
                  </button>
                );
              })}
            </div>
          </React.Fragment>
        );
      })}
      <BoardFoot onLeaderboard={props.onLeaderboard} onMap={props.onMap} onDash={props.onDash} />
    </div>
  );
}
