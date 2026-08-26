import React from 'react';
import {
  ART_W, ART_H, ART_PALETTE, emptyArt, artWith, artColorAt,
  getArt, setArt as storeArt,
} from '@/rendering/traits/playerArt.js';
import {
  patternsFor, getPattern, setPattern, parsePattern, formatPattern, patternInk,
} from '@/rendering/traits/patternCatalog.js';   /* v2.3.1941 */
import { drawCharacterPortrait } from '@/rendering/characterPortrait.js';   /* v2.3.1947 */

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
    /* v2.3.1941: `pattern` names the garment slot this target can pattern, or
       null when it cannot be patterned (a tattoo is not clothing). */
    pattern: 'shirt',
    note: 'Front and back are separate — the back shows when you walk away.',
  },
  pants: {
    label: 'pants',
    pattern: 'pants',
    note: 'Sits on the upper leg. Leg armour covers it.',
  },
  tattoo: {
    label: 'tattoo',
    pattern: null,
    note: 'Inked on your chest — it shows when you are bare-chested, and a shirt or breastplate covers it.',
  },
  /* v2.3.1944: shoes are pattern-ONLY.  A boot is about eight screen pixels, so
     there is nothing to draw on -- and the four tiles offered are the ones that
     survive at that size (see patternCatalog). */
  shoes: {
    label: 'shoes',
    pattern: 'shoes',
    drawing: false,
    note: 'Boots are small, so these are the patterns that still read at that size.',
  },
};

/* ── the pattern swatch ──
   Drawn rather than shipped as art: the tile IS the picture, so rendering it
   here from the same table the character is patterned from means a swatch can
   never drift from what the garment actually shows.  Scaled up so a 4-cell tile
   reads at thumbnail size (the character wears it at 2-3px a cell). */
function PatternSwatch({ tile, color, on, onPick }) {
  const ref = React.useRef(null);
  const S = 6, N = 8;                          /* px per cell, cells shown */
  React.useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#e9eef2';
    ctx.fillRect(0, 0, cv.width, cv.height);
    if (!tile) {                               /* the "plain" swatch */
      ctx.strokeStyle = '#b33'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(4, cv.height - 4); ctx.lineTo(cv.width - 4, 4); ctx.stroke();
      return;
    }
    ctx.fillStyle = color;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (patternInk(tile, x, y)) ctx.fillRect(x * S, y * S, S, S);
      }
    }
  }, [tile, color]);
  return (
    <button type="button" onClick={onPick} title={tile ? tile.name : 'Plain'}
      style={{ padding: 0, lineHeight: 0, borderRadius: 7, cursor: 'pointer',
        border: on ? '2px solid #D8AA58' : '1px solid rgba(0,0,0,.4)', boxSizing: 'border-box' }}>
      {/* v2.3.1947: sizes off its grid column rather than a fixed 44px — the
          pattern pane shares the panel with the worn preview now. */}
      <canvas ref={ref} width={S * N} height={S * N}
        style={{ width: '100%', aspectRatio: '1 / 1', imageRendering: 'pixelated',
          borderRadius: 6, display: 'block' }} />
    </button>
  );
}

/* ═══ v2.3.1947: THE WORN PREVIEW ═══
 *
 * Owner: "can you also provide another pane of a preview of what it looks like
 * on character?"
 *
 * The designer is a full-screen scrim, so the creator's own live figure — which
 * has always updated stroke by stroke — is COVERED by the very panel you are
 * drawing in.  You were drawing blind and finding out when you closed it.  This
 * is that figure, brought inside the panel and pointed at the part you are
 * editing.
 *
 * ── WHY IT ZOOMS INSTEAD OF SHOWING THE WHOLE BODY ──
 * A print gets about 30x18 pixels of shirt, and a boot pattern about eight
 * pixels of boot.  A whole figure in a 125px box renders that print four pixels
 * tall, which tells you nothing.  So the camera points at the garment: chest for
 * a shirt or a tattoo, thighs for trousers, feet for boots.  Nearest-neighbour
 * on the way up, because the thing being previewed IS pixels and smoothing it
 * would be a lie about how it looks in the game.
 *
 * ── WHY THE DRAWING IS PASSED IN RATHER THAN READ FROM THE STORE ──
 * drawCharacterPortrait falls back to the live store for any drawing/pattern
 * the caller omits, which is how the creator's stage stays current for free.
 * It would NOT work here: this is a child component, and React flushes a
 * child's effects BEFORE its parent's, so the panel's own "persist to the
 * store" effect has not run yet when this one draws — every frame would be one
 * stroke stale.  Passing the value being edited explicitly sidesteps the
 * ordering question entirely; everything NOT being edited still comes from the
 * store, which is what you want.
 */

/* ── where to point the camera ──
   drawCharacterPortrait always composites into the same square (256, times a
   device-scale multiplier) and always puts the figure in the same place in it,
   so the crop is arithmetic rather than an alpha scan of a 600k-pixel canvas on
   every stroke.

   MEASURED (v2.3.1947, alpha bbox over four looks incl. a hatted afro and a
   north facing): the figure is centred at x 0.4975 and its FEET land at 0.977
   down the canvas every time.  The top does NOT: a bare head starts at 0.152
   and a cowboy hat over an afro at 0.055.  So these are stated against the
   canvas and anchored on the feet — hang them off the silhouette's top instead
   and putting a hat on would swing the camera a tenth of a frame.

   `cy`/`h` are the window's centre and height as canvas fractions. */
const FIG_CX = 0.4975;
const FOCUS = {
  /* The shirt frame keeps the HEAD in shot on purpose: the figure stays
     recognisably yours, which a floating torso does not. */
  shirt: { cy: 0.43, h: 0.45 },
  tattoo: { cy: 0.43, h: 0.45 },
  /* Trousers, plus the boot tops.  Centring higher put a third of the pane on
     shirt hem. */
  pants: { cy: 0.69, h: 0.35 },
  /* Down to 1.0, not to the boots: the feet sit at 0.977 and a frame that
     stopped at 0.947 sliced the soles off. */
  shoes: { cy: 0.865, h: 0.27 },
};

function WornPreview({ look, target, side, art, pat }) {
  const boxRef = React.useRef(null);
  const offRef = React.useRef(null);
  const busyRef = React.useRef(false);
  const dirtyRef = React.useRef(false);

  /* Blit the finished composite into the visible box, cropped to the garment. */
  const blit = React.useCallback(() => {
    const box = boxRef.current, off = offRef.current;
    if (!box || !off || !off.width) return;
    const cssW = box.clientWidth, cssH = box.clientHeight;
    if (!cssW || !cssH) return;
    const dpr = Math.min(2, Math.round((typeof window !== 'undefined' && window.devicePixelRatio) || 1));
    const w = Math.round(cssW * dpr), h = Math.round(cssH * dpr);
    if (box.width !== w || box.height !== h) { box.width = w; box.height = h; }
    const ctx = box.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    const f = FOCUS[target] || FOCUS.shirt;
    const S = off.width;                       /* the composite is square */
    const winH = f.h * S;
    const winW = winH * (cssW / cssH);
    ctx.drawImage(off, FIG_CX * S - winW / 2, f.cy * S - winH / 2, winW, winH, 0, 0, w, h);
  }, [target]);

  React.useEffect(() => {
    if (!look) return undefined;
    let alive = true;
    let raf = 0;
    const draw = () => {
      if (!offRef.current) offRef.current = document.createElement('canvas');
      const opts = Object.assign({}, look, {
        /* Face the side being edited.  A shirt BACK you cannot see is the one
           drawing in this panel that most needed a preview. */
        dir: side === 'back' ? 'north' : 'south',
        /* Half the creator stage's resolution: this box is ~125px, and the
           composite cost is paid on every stroke. */
        scale: Math.min(2, Math.round((typeof window !== 'undefined' && window.devicePixelRatio) || 1)),
      });
      if (target === 'shirt') { opts.shirtArt = art; opts.shirtPattern = pat; }
      else if (target === 'pants') { opts.pantsArt = art; opts.pantsPattern = pat; }
      else if (target === 'shoes') { opts.shoesPattern = pat; }
      else if (target === 'tattoo') {
        opts.tattooArt = art;
        /* A tattoo is under the shirt, so with a shirt on this pane would be a
           blank chest — which reads as broken rather than as "covered".  The
           caption under it says a shirt hides it. */
        opts.shirt = 'none';
      }
      return drawCharacterPortrait(offRef.current, opts);
    };
    /* One composite in flight at a time, coalesced to a frame: a drag paints
       many cells per frame and each one would otherwise re-bake a sheet. */
    const run = () => {
      raf = 0;
      if (!alive || busyRef.current) { dirtyRef.current = true; return; }
      busyRef.current = true;
      Promise.resolve().then(draw).then(() => { if (alive) blit(); })
        .catch(() => { /* a missing sprite must not take the panel down */ })
        .then(() => {
          busyRef.current = false;
          if (alive && dirtyRef.current) { dirtyRef.current = false; kick(); }
        });
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(run); };
    kick();
    /* Rotating the phone resizes the box; the composite is still good. */
    const onResize = () => { try { blit(); } catch (e) { /* ignore */ } };
    window.addEventListener('resize', onResize);
    return () => {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [look, target, side, art, pat, blit]);

  if (!look) return null;
  return (
    <canvas ref={boxRef} className="bt-paint-pv"
      aria-label="Preview on your character" role="img" />
  );
}

export function PlayerPaint({ target = 'shirt', onClose, look = null }) {
  const cfg = TARGETS[target] || TARGETS.shirt;
  const isShirt = target === 'shirt';
  /* v2.3.1941: the panel has MODES now, not just shirt sides.  A garment can be
     patterned as well as drawn on, and the two are different jobs, so they get
     different screens rather than one crowded one.  Opening on 'pattern' is
     deliberate: picking a ready-made pattern is the thing most people want, and
     drawing freehand is the thing some people want. */
  const canDraw = cfg.drawing !== false;
  const MODES = (cfg.pattern && canDraw)
    ? (isShirt ? ['pattern', 'front', 'back'] : ['pattern', 'drawing'])
    : null;
  const [mode, setMode] = React.useState(cfg.pattern ? 'pattern' : 'draw');
  const side = mode === 'back' ? 'back' : 'front';
  const onPattern = mode === 'pattern';
  /* Which stored drawing this panel is editing right now. */
  const artId = isShirt ? (side === 'back' ? 'shirtBack' : 'shirtFront') : target;

  /* ── the garment's pattern ── */
  const [pat, setPat] = React.useState(() => (cfg.pattern ? getPattern(cfg.pattern) : ''));
  const parsed = parsePattern(pat, cfg.pattern);
  const patId = parsed ? parsed.id : '';
  const patColor = parsed ? parsed.colorIdx : 1;
  React.useEffect(() => { if (cfg.pattern) setPattern(cfg.pattern, pat); }, [cfg.pattern, pat]);
  const pickTile = (id) => setPat(id ? formatPattern(id, patColor) : '');
  const pickPatColor = (i) => { if (patId && i > 0) setPat(formatPattern(patId, i)); };
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

  /* v2.3.1941: `onPattern` is a DEPENDENCY, not decoration.  The grid canvas is
     unmounted on the pattern screen, so coming back to a drawing re-creates it
     blank -- and `art` has not changed, so nothing else here would repaint it. */
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
  }, [art, onPattern]);

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
    <div className="bt-modal-scrim" role="dialog"
      /* v2.3.1944: shoes cannot be drawn on, so "Draw your shoes" was wrong for
         a screen reader as well as for the eye. */
      aria-label={(canDraw ? 'Draw your ' : 'Pattern your ') + cfg.label}
      style={{ position: 'fixed', inset: 0, background: 'rgba(6,10,14,.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
      {/* v2.3.1947: padding and gap live in the stylesheet, not here -- a short
          viewport (iPhone landscape) has to tighten them, and a media query
          cannot reach an inline style. */}
      <div className="bt-paint"
        style={{ background: 'var(--ui-panel, #16202a)', border: '1px solid rgba(229,237,233,.26)',
          borderRadius: 12, display: 'flex', flexDirection: 'column',
          maxHeight: '96vh', overflow: 'auto' }}>

        {MODES && (
          <div style={{ display: 'flex', gap: 6 }}>
            {MODES.map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={'bt-cc-tab' + (mode === m ? ' bt-cc-tab--on' : '')}
                style={{ flex: 1, minHeight: 34, textTransform: 'capitalize' }}>
                <span className="bt-cc-tab-label">{m}</span>
              </button>
            ))}
          </div>
        )}

        {/* v2.3.1947: two panes.  Left is the character wearing what you are
            making, with the caption under it; right is the thing you work in.
            Both modes fill the same right-hand box so switching between
            "pattern" and "draw" does not resize the panel under your thumb, and
            the colour rows below span BOTH panes — which makes each swatch
            wider than it was when they were penned into the grid's width. */}
        <div className="bt-paint-row">
          <div className="bt-paint-side">
            <WornPreview look={look} target={target} side={side} art={art} pat={pat} />
            <div style={{ fontSize: 11, lineHeight: 1.3, opacity: .78 }}>
              {onPattern ? 'A pattern fills the whole garment. Anything you draw goes on top of it.' : cfg.note}
            </div>
          </div>

          <div className="bt-paint-main">
            {onPattern ? (
              /* v2.3.1941: the pattern screen — a tile, then a colour for it. */
              /* v2.3.1947: shoes offer five choices, not ten (only four tiles
                 survive at boot size), and five in a 5-wide grid is one thin
                 row against a two-row preview column.  Three wide gives them
                 two rows, a bigger thumb target, and a balanced panel. */
              <div style={{ display: 'grid', gap: 6,
                gridTemplateColumns: 'repeat(' + (patternsFor(cfg.pattern).length + 1 <= 6 ? 3 : 5) + ', 1fr)' }}>
                <PatternSwatch tile={null} color={null} on={!patId} onPick={() => pickTile('')} />
                {patternsFor(cfg.pattern).map((t) => (
                  <PatternSwatch key={t.id} tile={t} color={ART_PALETTE[patColor]}
                    on={patId === t.id} onPick={() => pickTile(t.id)} />
                ))}
              </div>
            ) : (
              <canvas ref={cvRef} width={size} height={size}
                onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
                style={{ width: '100%', aspectRatio: '1 / 1',
                  imageRendering: 'pixelated', touchAction: 'none', cursor: 'crosshair',
                  borderRadius: 8, border: '1px solid rgba(229,237,233,.28)', display: 'block' }} />
            )}
          </div>
        </div>

        {onPattern ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 5, opacity: patId ? 1 : .35 }}>
            {ART_PALETTE.map((c, i) => (i === 0 ? null : (
              <button key={i} type="button" title="Pattern colour" disabled={!patId}
                onClick={() => pickPatColor(i)}
                style={{ aspectRatio: '1 / 1', minHeight: 26, borderRadius: 6,
                  cursor: patId ? 'pointer' : 'default', background: c,
                  border: patColor === i && patId ? '2px solid #D8AA58' : '1px solid rgba(0,0,0,.4)',
                  boxSizing: 'border-box' }} />
            )))}
          </div>
        ) : (
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
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="bt-cc-tab" style={{ flex: 1, minHeight: 38 }}
            onClick={() => (onPattern ? pickTile('') : setArtState(emptyArt()))}>
            <span className="bt-cc-tab-label">
              {onPattern ? 'No pattern' : ('Clear ' + (isShirt ? side : cfg.label))}
            </span>
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
