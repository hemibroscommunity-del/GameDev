import React from 'react';
import {
  ART_W, ART_H, ART_PALETTE, emptyArt, artWith, artColorAt,
  getArt, setArt as storeArt, SHIRT_SIDES,
} from '@/rendering/traits/playerArt.js';

/* ═══ v2.3.1938: DRAW YOUR OWN SHIRT ═══
 *
 * Owner: "allowing people to customize their own t shirts ... a drawing feature
 * with your finger (or mouse if on desktop)", then "It actually makes sense to
 * have a front and back custom t shirt".
 *
 * ── WHY POINTER EVENTS AND NOT touchstart/mousedown ──
 * One code path covers finger, stylus and mouse, and `setPointerCapture` keeps
 * the stroke alive when the finger slides off the grid and back on — which is
 * most strokes on a 16-cell target. The alternative is two listener sets that
 * drift apart, and a stroke that dies the moment you leave the edge.
 *
 * ── WHY THE GRID IS ONE ELEMENT AND NOT 256 ──
 * A cell per <div> is 256 nodes re-rendering on every pointermove. This paints
 * to a canvas and hit-tests arithmetically from the pointer's offset, so a
 * stroke costs one draw. It also makes the preview honest: the canvas IS the
 * drawing at 1:1, scaled up, which is exactly what the shirt will show.
 *
 * The primary platform is iPhone Safari, so the grid is sized in `min(vw,vh)`
 * units to stay square and thumb-reachable in landscape, and touch-action is
 * none so a drawing stroke never scrolls the page underneath it.
 *
 * ═══ v2.3.1940: THE SAME PANEL DRAWS PANTS AND TATTOOS ═══
 * Owner: "allow drawing on pants too.  Also allow drawing in the form of
 * tattoos on the character skin."  The three targets differ only in WHICH
 * drawing they edit and what the caption says, so this takes a `target` prop
 * rather than being copied twice — the grid, the palette, the stroke handling
 * and the live-preview wiring are all one implementation.
 *
 * Only the shirt gets front/back tabs.  Pants and tattoos are one drawing each
 * (see playerArt.js for why), so their tab strip would be a row with one
 * button in it, and it is simply not rendered.
 */

const CELL_PX = 18;            /* on-screen size of one cell at rest */

/* Per-target copy.  `note` is the one thing a player cannot work out by looking
   at the grid: WHERE the drawing ends up and what can hide it. */
const TARGETS = {
  shirt: {
    label: 'shirt',
    note: 'Front and back are separate — the back shows when you walk away.',
  },
  pants: {
    label: 'pants',
    note: 'Sits on the upper leg. Leg armour covers it.',
  },
  tattoo: {
    label: 'tattoo',
    note: 'Inked on your chest — it shows when you are bare-chested, and a shirt or breastplate covers it.',
  },
};

export function PlayerPaint({ target = 'shirt', onClose }) {
  const cfg = TARGETS[target] || TARGETS.shirt;
  const isShirt = target === 'shirt';
  const [side, setSide] = React.useState('front');
  /* Which stored drawing this panel is editing right now. */
  const artId = isShirt ? (side === 'back' ? 'shirtBack' : 'shirtFront') : target;
  const [art, setArtState] = React.useState(() => getArt(artId));
  const [ink, setInk] = React.useState(1);        /* palette index; 0 = eraser */
  const cvRef = React.useRef(null);
  const paintingRef = React.useRef(false);
  const lastRef = React.useRef('');

  /* Switching side (or opening on a different target) loads that drawing. */
  React.useEffect(() => { setArtState(getArt(artId)); }, [artId]);

  /* Persist as you draw: the character updates live behind the panel, which is
     the whole point of drawing on a character rather than in a vacuum. */
  React.useEffect(() => { storeArt(artId, art); }, [artId, art]);

  React.useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const S = cv.width / ART_W;
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (let y = 0; y < ART_H; y++) {
      for (let x = 0; x < ART_W; x++) {
        /* checkerboard under the art so transparent cells read as empty
           rather than as "black" — the palette contains a near-black. */
        ctx.fillStyle = ((x + y) % 2) ? '#2b3640' : '#243039';
        ctx.fillRect(x * S, y * S, S, S);
        const c = artColorAt(art, x, y);
        if (c) { ctx.fillStyle = c; ctx.fillRect(x * S, y * S, S, S); }
      }
    }
  }, [art]);

  const cellAt = (e) => {
    const cv = cvRef.current;
    if (!cv) return null;
    const r = cv.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * ART_W);
    const y = Math.floor(((e.clientY - r.top) / r.height) * ART_H);
    return (x >= 0 && y >= 0 && x < ART_W && y < ART_H) ? [x, y] : null;
  };
  const paint = (e) => {
    const cell = cellAt(e);
    if (!cell) return;
    const k = cell[0] + ',' + cell[1];
    if (k === lastRef.current) return;      /* same cell: nothing to redraw */
    lastRef.current = k;
    setArtState((a) => artWith(a, cell[0], cell[1], ink));
  };
  const down = (e) => {
    paintingRef.current = true;
    lastRef.current = '';
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* not supported */ }
    paint(e);
  };
  const move = (e) => { if (paintingRef.current) paint(e); };
  const up = () => { paintingRef.current = false; lastRef.current = ''; };

  const size = ART_W * CELL_PX;
  return (
    <div className="bt-modal-scrim" role="dialog" aria-label={'Draw your ' + cfg.label}
      style={{ position: 'fixed', inset: 0, background: 'rgba(6,10,14,.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
      <div style={{ background: 'var(--ui-panel, #16202a)', border: '1px solid rgba(229,237,233,.26)',
        borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
        maxHeight: '96vh', overflow: 'auto' }}>

        {isShirt && (
          <div style={{ display: 'flex', gap: 6 }}>
            {SHIRT_SIDES.map((s) => (
              <button key={s} type="button" onClick={() => setSide(s)}
                className={'bt-cc-tab' + (side === s ? ' bt-cc-tab--on' : '')}
                style={{ flex: 1, minHeight: 34, textTransform: 'capitalize' }}>
                <span className="bt-cc-tab-label">{s}</span>
              </button>
            ))}
          </div>
        )}

        <canvas ref={cvRef} width={size} height={size}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          style={{ width: 'min(72vw, 72vh, 288px)', height: 'min(72vw, 72vh, 288px)',
            imageRendering: 'pixelated', touchAction: 'none', cursor: 'crosshair',
            borderRadius: 8, border: '1px solid rgba(229,237,233,.28)', display: 'block' }} />

        <div style={{ fontSize: 12, lineHeight: 1.35, opacity: .78, maxWidth: 288 }}>{cfg.note}</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 5 }}>
          {ART_PALETTE.map((c, i) => (
            <button key={i} type="button" title={i === 0 ? 'Eraser' : 'Colour'}
              onClick={() => setInk(i)}
              style={{ aspectRatio: '1 / 1', minHeight: 26, borderRadius: 6, cursor: 'pointer',
                background: c || 'transparent',
                /* the eraser reads as a hole, not as a colour */
                backgroundImage: c ? undefined : 'linear-gradient(45deg,#3a4650 25%,transparent 25%,transparent 75%,#3a4650 75%)',
                backgroundSize: c ? undefined : '10px 10px',
                border: ink === i ? '2px solid #D8AA58' : '1px solid rgba(0,0,0,.4)',
                boxSizing: 'border-box' }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="bt-cc-tab" style={{ flex: 1, minHeight: 38 }}
            onClick={() => setArtState(emptyArt())}>
            <span className="bt-cc-tab-label">Clear {isShirt ? side : cfg.label}</span>
          </button>
          <button type="button" className="bt-cc-tab bt-cc-tab--on" style={{ flex: 1, minHeight: 38 }}
            onClick={onClose}>
            <span className="bt-cc-tab-label">Done</span>
          </button>
        </div>
      </div>
    </div>
  );
}
