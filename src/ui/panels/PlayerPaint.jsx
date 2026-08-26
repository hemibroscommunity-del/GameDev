import React from 'react';
import {
  ART_W, ART_H, ART_PALETTE, emptyArt, artColorAt, artWithCells,
  getArt, setArt as storeArt, copyArt, getSlots, setSlot, SLOT_COUNT,
} from '@/rendering/traits/playerArt.js';
import {
  TOOLS, toolById, shapeCells, lineCells, fillCells, expandCells, mirrorCells,
  BRUSH_SIZES, LETTERS, letterCells,
} from '@/rendering/traits/artTools.js';   /* v2.3.1948; v2.3.1949 mirror */
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
  /* v2.3.1949 (owner: "Allow tattoos on the face and arms too").  Three skin
     canvases rather than one drawing stretched over three very differently
     shaped regions. */
  tattooFace: {
    label: 'face tattoo',
    pattern: null,
    note: 'On your face. A hat or a beard can cover part of it.',
  },
  tattooArm: {
    label: 'arm tattoo',
    pattern: null,
    note: 'Goes on BOTH arms. Sleeves cover the upper arm, so it shows below them.',
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

/* Which canvas each tattoo mode paints. */
const TATTOO_SPOT = { chest: 'tattoo', face: 'tattooFace', arms: 'tattooArm' };

/* ── the toolbar's icons ──
   Drawn inline rather than shipped as art, for the reason the creator's pencil
   is (v2.3.1946): they are a handful of strokes, they inherit the button's own
   colour, they stay crisp at any pixel density, and an asset that is never
   fetched cannot hitch on first use — which the animation-preload law exists to
   prevent.  One 24x24 viewBox for all of them so they sit on the same optical
   size. */
const TOOL_HINT = {
  pen: 'Draw freehand',
  line: 'Drag for a straight line',
  rect: 'Drag for a box outline',
  ellipse: 'Drag for a circle outline',
  fill: 'Tap an area to flood it — with the eraser chosen, to clear it',
  letter: 'Pick a letter, then tap to place it',
};

function ToolIcon({ id }) {
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const kids = {
    pen: [
      <path key="a" d="M4 20.5h4.2L20 8.7a2 2 0 0 0 0-2.8l-1.9-1.9a2 2 0 0 0-2.8 0L3.5 15.8V20a.5.5 0 0 0 .5.5Z" {...stroke} />,
      <path key="b" d="M14.6 5.7 18.9 10" {...stroke} />,
    ],
    line: [<path key="a" d="M4.5 19.5 19.5 4.5" {...stroke} />],
    rect: [<rect key="a" x="4.5" y="5.5" width="15" height="13" rx="1.5" {...stroke} />],
    ellipse: [<circle key="a" cx="12" cy="12" r="7.5" {...stroke} />],
    /* a drop, because a tilted bucket is unreadable at 20px */
    fill: [<path key="a" d="M12 3.5c0 0-5.8 6.7-5.8 10.2a5.8 5.8 0 0 0 11.6 0C17.8 10.2 12 3.5 12 3.5Z"
      fill="currentColor" stroke="none" />],
    letter: [<text key="a" x="12" y="17.6" textAnchor="middle" fontSize="16" fontWeight="700"
      fill="currentColor" stroke="none" fontFamily="inherit">A</text>],
  };
  return (
    <svg className="bt-paint-tool-icon" viewBox="0 0 24 24" width="20" height="20"
      aria-hidden="true" focusable="false">{kids[id] || kids.pen}</svg>
  );
}

/* ── a saved design ──
   v2.3.1950 (owner: "Design slots, so you can try something without losing what
   you had.")

   ONE control does both jobs, and which one it does is never ambiguous: an
   EMPTY slot has nothing to load, so tapping it saves; a FULL slot has
   something to load, so tapping it loads.  Only overwriting needs a second
   step, and that is the rare case — the Save button below arms it.

   Drawn from the same codec the grid draws from, so a thumbnail can never
   disagree with what the slot actually holds. */
function SlotChip({ art, on, arming, onPick }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const S = cv.width / ART_W;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = '#243039';
    ctx.fillRect(0, 0, cv.width, cv.height);
    if (!art) return;
    for (let y = 0; y < ART_H; y++) {
      for (let x = 0; x < ART_W; x++) {
        const c = artColorAt(art, x, y);
        if (c) { ctx.fillStyle = c; ctx.fillRect(x * S, y * S, S, S); }
      }
    }
  }, [art]);
  const label = arming ? 'Save here' : (art ? 'Load this design' : 'Empty — tap to save this design here');
  return (
    <button type="button" onClick={onPick} title={label} aria-label={label}
      className={'bt-paint-slot' + (on ? ' bt-paint-slot--on' : '')}>
      <canvas ref={ref} width={ART_W * 3} height={ART_H * 3} />
      {!art && !arming && <span className="bt-paint-slot-plus">+</span>}
    </button>
  );
}

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
  /* v2.3.1949: a face tattoo is a few pixels on a head the size of a thumbnail,
     so this one goes right in.  The arms need most of the torso's height
     because they run its full length. */
  tattooFace: { cy: 0.255, h: 0.20 },
  tattooArm: { cy: 0.46, h: 0.40 },
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
      } else if (target === 'tattooFace') {
        opts.faceTattooArt = art;
        /* v2.3.1949: a hat hides a face tattoo the same way, so the pane takes
           it off while you work.  The caption says so. */
        opts.headwear = 'none';
      } else if (target === 'tattooArm') {
        opts.armTattooArt = art;
        /* Sleeves cover the upper arm; bare-chested you see the whole limb. */
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
  /* v2.3.1949: the skin tab now opens on THREE canvases (owner: "Allow tattoos
     on the face and arms too").  They ride the mode strip the shirt's front/back
     already uses rather than adding three buttons to the creator: same one way
     in, and the spot you are inking is the thing you switch, not the thing you
     navigate to. */
  const isTattoo = target === 'tattoo';
  const MODES = isTattoo ? ['chest', 'face', 'arms']
    : (cfg.pattern && canDraw)
      ? (isShirt ? ['pattern', 'front', 'back'] : ['pattern', 'drawing'])
      : null;
  const [mode, setMode] = React.useState(isTattoo ? 'chest' : (cfg.pattern ? 'pattern' : 'draw'));
  const side = mode === 'back' ? 'back' : 'front';
  const onPattern = mode === 'pattern';
  /* WHERE on the body this panel is currently painting.  For everything but a
     tattoo that is just the target; for a tattoo the mode picks it, and the
     caption, the preview's camera and the Clear button all follow it. */
  const spot = isTattoo ? (TATTOO_SPOT[mode] || 'tattoo') : target;
  const scfg = TARGETS[spot] || cfg;
  /* Which stored drawing this panel is editing right now. */
  const artId = isShirt ? (side === 'back' ? 'shirtBack' : 'shirtFront') : spot;

  /* ── the garment's pattern ── */
  const [pat, setPat] = React.useState(() => (cfg.pattern ? getPattern(cfg.pattern) : ''));
  const parsed = parsePattern(pat, cfg.pattern);
  const patId = parsed ? parsed.id : '';
  const patColor = parsed ? parsed.colorIdx : 1;
  React.useEffect(() => { if (cfg.pattern) setPattern(cfg.pattern, pat); }, [cfg.pattern, pat]);
  const pickTile = (id) => setPat(id ? formatPattern(id, patColor) : '');
  const pickPatColor = (i) => { if (patId && i > 0) setPat(formatPattern(patId, i)); };  const [art, setArtState] = React.useState(() => getArt(artId));
  const [ink, setInk] = React.useState(1);        /* palette index; 0 = eraser */
  /* v2.3.1948 (owner: "any drawing tools like lines, shapes, eraser, fill?",
     then "a small eraser for erasing areas ... different brush size options ...
     perhaps letters you can place?"). */
  const [tool, setTool] = React.useState('pen');
  const [brush, setBrush] = React.useState(1);
  const [letter, setLetter] = React.useState('A');
  /* v2.3.1949: symmetry, and a way back.  Neither was asked for by name -- the
     owner asked what else was missing -- and between them they are the two
     things a pixel editor is unusable without: a mis-stroke you cannot take
     back means starting over, and hand-matching the other half of a face is
     not something anybody manages on a 16-cell grid. */
  const [mirror, setMirror] = React.useState(false);
  /* One entry per ACTION, not per cell: a drag paints dozens of cells and an
     undo that stepped back through them one at a time would be useless.  The
     pre-gesture drawing is pushed when the gesture starts (or, for a shape,
     when it commits), so one tap of Undo removes one thing you did. */
  const histRef = React.useRef([]);
  const redoRef = React.useRef([]);                /* v2.3.1950 */
  const [undoN, setUndoN] = React.useState(0);
  const [redoN, setRedoN] = React.useState(0);
  /* A copy changes the side you are NOT looking at, so without a word of
     feedback the button appears to do nothing at all. */
  const [copied, setCopied] = React.useState(false);
  /* The slots for THIS canvas, mirrored into state so a save repaints the row.
     `arming` is the overwrite step: tap Save, then tap the slot to replace. */
  const [slots, setSlots] = React.useState([]);
  const [arming, setArming] = React.useState(false);
  const cvRef = React.useRef(null);
  const paintingRef = React.useRef(false);
  const lastRef = React.useRef('');
  const prevCellRef = React.useRef(null);
  /* The shape being dragged, before it is committed.  A ref plus a counter
     rather than state: `up` has to read the CURRENT draft to commit it, and a
     state value captured in that handler's closure is one render behind. */
  const draftRef = React.useRef(null);
  const [draftTick, setDraftTick] = React.useState(0);
  const setDraft = (cells) => { draftRef.current = cells; setDraftTick((t) => t + 1); };

  const tdef = toolById(tool);
  /* The alphabet does not fit the strip's width, so re-opening the tool must
     bring the letter you last used back into view rather than showing A again
     while a Q is loaded. */
  const stripRef = React.useRef(null);
  React.useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const on = strip.querySelector('[data-on]');
    if (on && on.scrollIntoView) {
      try { on.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) { /* older Safari */ }
    }
  }, [tool]);

  /* Switching side (or opening on a different target) loads that drawing --
     and its history, which belongs to that canvas and not to this panel. */
  React.useEffect(() => {
    setArtState(getArt(artId));
    histRef.current = [];
    redoRef.current = [];
    setUndoN(0);
    setRedoN(0);
    setCopied(false);
    setSlots(getSlots(artId));
    setArming(false);
  }, [artId]);

  const HIST_MAX = 40;
  const pushHist = (a) => {
    const h = histRef.current;
    if (h[h.length - 1] === a) return;     /* nothing changed since last time */
    h.push(a);
    if (h.length > HIST_MAX) h.shift();
    /* v2.3.1950: a NEW action discards the redo stack.  Undoing three strokes
       and then drawing a fourth means the three you undid are no longer a
       future you can return to -- keeping them would let Redo paste in work
       that never followed from what is now on the grid. */
    redoRef.current = [];
    setUndoN(h.length);
    setRedoN(0);
  };
  const undo = () => {
    const h = histRef.current;
    if (!h.length) return;
    redoRef.current.push(art);
    if (redoRef.current.length > HIST_MAX) redoRef.current.shift();
    setArtState(h.pop());
    setDraft(null);
    setUndoN(h.length);
    setRedoN(redoRef.current.length);
  };
  const redo = () => {
    const r = redoRef.current;
    if (!r.length) return;
    /* Straight onto the undo stack, WITHOUT pushHist -- that would wipe the
       rest of the redo stack and make a second Redo impossible. */
    const h = histRef.current;
    h.push(art);
    if (h.length > HIST_MAX) h.shift();
    setArtState(r.pop());
    setDraft(null);
    setUndoN(h.length);
    setRedoN(r.length);
  };

  const saveToSlot = (i) => {
    setSlot(artId, i, art);
    setSlots(getSlots(artId));
    setArming(false);
  };
  const loadSlot = (i) => {
    const v = slots[i];
    if (!v) { saveToSlot(i); return; }   /* empty: the only sensible action */
    pushHist(art);                        /* so a mis-tap is one Undo away */
    setArtState(v);
    setDraft(null);
  };

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
    const checker = (x, y) => (((x + y) % 2) ? '#2b3640' : '#243039');
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (let y = 0; y < ART_H; y++) {
      for (let x = 0; x < ART_W; x++) {
        /* checkerboard under the art so transparent cells read as empty
           rather than as "black" — the palette contains a near-black. */
        ctx.fillStyle = checker(x, y);
        ctx.fillRect(x * S, y * S, S, S);
        const c = artColorAt(art, x, y);
        if (c) { ctx.fillStyle = c; ctx.fillRect(x * S, y * S, S, S); }
      }
    }
    /* v2.3.1948: the shape under your finger, drawn but not yet committed.  It
       is painted with exactly the code that will commit it, so the preview
       cannot disagree with the result.  With the eraser chosen it paints the
       checkerboard back in, which is what erasing those cells will look like. */
    const d = draftRef.current;
    if (d) {
      const col = ART_PALETTE[ink];
      for (let i = 0; i < d.length; i++) {
        const x = d[i][0], y = d[i][1];
        ctx.fillStyle = col || checker(x, y);
        ctx.fillRect(x * S, y * S, S, S);
      }
    }
  }, [art, onPattern, draftTick, ink]);

  /* Which cell the pointer is over.  `clamp` pins a drag that has wandered off
     the grid to the nearest edge cell instead of dropping it: pointer capture
     keeps the events coming, and a shape whose corner you dragged past the edge
     should still have a corner. */
  const cellAt = (e, clamp) => {
    const cv = cvRef.current;
    if (!cv) return null;
    const r = cv.getBoundingClientRect();
    let x = Math.floor(((e.clientX - r.left) / r.width) * ART_W);
    let y = Math.floor(((e.clientY - r.top) / r.height) * ART_H);
    if (clamp) {
      x = Math.max(0, Math.min(ART_W - 1, x));
      y = Math.max(0, Math.min(ART_H - 1, y));
      return [x, y];
    }
    return (x >= 0 && y >= 0 && x < ART_W && y < ART_H) ? [x, y] : null;
  };

  const paintPen = (e) => {
    const cell = cellAt(e, false);
    if (!cell) { prevCellRef.current = null; return; }
    const k = cell[0] + ',' + cell[1];
    if (k === lastRef.current) return;      /* same cell: nothing to redraw */
    /* v2.3.1948: JOIN UP THE SAMPLES.  A pointer event fires per frame at best,
       so a quick flick used to leave a dotted trail of the cells that happened
       to be sampled.  Bresenham between this sample and the last makes the pen
       draw the line your finger actually travelled. */
    const prev = prevCellRef.current;
    const path = (prev && (Math.abs(prev[0] - cell[0]) > 1 || Math.abs(prev[1] - cell[1]) > 1))
      ? lineCells(prev[0], prev[1], cell[0], cell[1])
      : [cell];
    lastRef.current = k;
    prevCellRef.current = cell;
    const cells = mirrorCells(expandCells(path, brush), mirror);
    setArtState((a) => artWithCells(a, cells, ink));
  };

  const down = (e) => {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* not supported */ }
    if (tdef.drag === 'once') {
      /* Fill and Letters are a TAP, not a drag: they commit where you touch. */
      const c = cellAt(e, false);
      if (!c) return;
      pushHist(art);
      if (tool === 'fill') {
        setArtState((a) => artWithCells(a, mirrorCells(fillCells(a, c[0], c[1]), mirror), ink));
      } else {
        setArtState((a) => artWithCells(a, mirrorCells(letterCells(letter, c[0], c[1]), mirror), ink));
      }
      return;
    }
    /* A drag is ONE undoable action, so the drawing is banked here, before the
       first cell of it is painted. */
    pushHist(art);
    paintingRef.current = true;
    lastRef.current = '';
    prevCellRef.current = null;
    if (tdef.drag === 'shape') {
      const c = cellAt(e, true);
      anchorRef.current = c;
      setDraft(mirrorCells(expandCells(shapeCells(tool, c[0], c[1], c[0], c[1]), brush), mirror));
      return;
    }
    paintPen(e);
  };
  const anchorRef = React.useRef(null);
  const move = (e) => {
    if (!paintingRef.current) return;
    if (tdef.drag === 'shape') {
      const a = anchorRef.current;
      if (!a) return;
      const c = cellAt(e, true);
      const k = c[0] + ',' + c[1];
      if (k === lastRef.current) return;
      lastRef.current = k;
      setDraft(mirrorCells(expandCells(shapeCells(tool, a[0], a[1], c[0], c[1]), brush), mirror));
      return;
    }
    paintPen(e);
  };
  const up = () => {
    const d = draftRef.current;
    if (paintingRef.current && d && d.length) setArtState((a) => artWithCells(a, d, ink));
    paintingRef.current = false;
    anchorRef.current = null;
    lastRef.current = '';
    prevCellRef.current = null;
    if (d) setDraft(null);
  };

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
          cannot reach an inline style.
          v2.3.1948: and the panel is a GRID now, not a column.  The tool row,
          the tool-options row and the palette do not fit under the grid on a
          390px-tall phone held sideways, but that phone has 844px of WIDTH
          going spare -- so on a short, wide viewport the same DOM re-flows into
          three columns (preview | drawing | controls) via grid-template-areas.
          Regrouping like that is exactly what named areas are for; the
          alternative was a second copy of the markup. */}
      <div className="bt-paint"
        style={{ background: 'var(--ui-panel, #16202a)', border: '1px solid rgba(229,237,233,.26)',
          borderRadius: 12, maxHeight: '96vh', maxWidth: '98vw', overflow: 'auto' }}>

        {MODES && (
          <div className="bt-paint-tabs" style={{ display: 'flex', gap: 6 }}>
            {MODES.map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={'bt-cc-tab' + (mode === m ? ' bt-cc-tab--on' : '')}
                style={{ flex: 1, minHeight: 34, textTransform: 'capitalize' }}>
                <span className="bt-cc-tab-label">{m}</span>
              </button>
            ))}
          </div>
        )}

        {/* v2.3.1947: the character wearing what you are making. */}
        <div className="bt-paint-side">
          <WornPreview look={look} target={spot} side={side} art={art} pat={pat} />
        </div>
        <div className="bt-paint-note">
          {onPattern ? 'A pattern fills the whole garment. Anything you draw goes on top of it.' : scfg.note}
          {/* v2.3.1950 (owner: "Copy front -> back for shirts.  One tap,
              obvious want.").  It sits under the caption rather than in the
              button row: that row is Undo/Redo/Clear/Done, and this is a
              once-per-design action, not one you reach for mid-stroke.  The
              copy is banked for undo like any other change, so a mis-tap does
              not cost you the side it overwrote -- and it SAYS it copied,
              because the thing it changes is the side you are not looking at. */}
          {isShirt && !onPattern && (
            <button type="button" className="bt-paint-copy"
              title={'Put this drawing on the ' + (side === 'front' ? 'back' : 'front') + ' as well'}
              onClick={() => {
                const from = side === 'front' ? 'shirtFront' : 'shirtBack';
                const to = side === 'front' ? 'shirtBack' : 'shirtFront';
                pushHist(getArt(to));       /* what the OTHER side had */
                copyArt(from, to);
                setCopied(true);
              }}>
              {copied ? 'Copied \u2713' : ('Copy to ' + (side === 'front' ? 'back' : 'front'))}
            </button>
          )}
        </div>

        <div className="bt-paint-main">
          {onPattern ? (
            /* v2.3.1941: the pattern screen — a tile, then a colour for it.
               v2.3.1947: shoes offer five choices, not ten (only four tiles
               survive at boot size), and five in a 5-wide grid is one thin row
               against a two-row preview column.  Three wide gives them two
               rows, a bigger thumb target, and a balanced panel. */
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

        {/* v2.3.1948: a wrapper that is `display:contents` in the stacked layout —
            so these four take their own grid areas — and a real flex column in
            the three-column one.  Without it the controls share ROWS with the
            preview beside them, and the preview is 140px tall against a 44px
            tool row, so each control got stranded at the top of an oversized
            row with a gap under it. */}
        <div className="bt-paint-ctl">
        {!onPattern && (
          <div className="bt-paint-tools">
            {TOOLS.map((t) => (
              <button key={t.id} type="button" onClick={() => { setTool(t.id); setDraft(null); }}
                className={'bt-paint-tool' + (tool === t.id ? ' bt-paint-tool--on' : '')}
                aria-pressed={tool === t.id} title={TOOL_HINT[t.id]}>
                <ToolIcon id={t.id} />
                <span className="bt-paint-tool-label">{t.name}</span>
              </button>
            ))}
          </div>
        )}

        {!onPattern && (
          /* ── the tool's own options ──
             One row that belongs to whichever tool is selected, rather than a
             row per tool: brush width for the four that draw a stroke, the
             alphabet for the one that stamps a letter.  Fill has no options, so
             the widths ghost the way the designer button on the creator does —
             the row keeps its height either way, so nothing below it jumps when
             you change tool. */
          <div className="bt-paint-opts">
            {tool === 'letter' ? (
              <div className="bt-paint-letters" ref={stripRef}>
                {LETTERS.map((ch) => (
                  <button key={ch} type="button" onClick={() => setLetter(ch)}
                    data-on={letter === ch ? '1' : undefined}
                    className={'bt-paint-letter' + (letter === ch ? ' bt-paint-letter--on' : '')}
                    aria-pressed={letter === ch} aria-label={'Letter ' + ch}>{ch}</button>
                ))}
              </div>
            ) : (
              <div className="bt-paint-opts-main">
                {BRUSH_SIZES.map((n) => (
                  <button key={n} type="button" disabled={!tdef.brush}
                    onClick={() => setBrush(n)} aria-pressed={brush === n}
                    aria-label={'Brush ' + n + ' wide'}
                    style={tdef.brush ? undefined : { opacity: 0.38 }}
                    className={'bt-paint-size' + (brush === n && tdef.brush ? ' bt-paint-size--on' : '')}>
                    <span className="bt-paint-dot-well">
                      <span className="bt-paint-dot" style={{ width: 5 + (n - 1) * 6, height: 5 + (n - 1) * 6 }} />
                    </span>
                    <span className="bt-paint-tool-label">{n === 1 ? 'Fine' : n === 2 ? 'Medium' : 'Thick'}</span>
                  </button>
                ))}
              </div>
            )}
            {/* v2.3.1949: Mirror keeps the SAME place whichever tool is up --
                it is a modifier on all six, so hiding it behind a tool choice
                would leave it silently on.  Its own cell, outside the part of
                the row that changes. */}
            <button type="button" onClick={() => setMirror((m) => !m)}
              aria-pressed={mirror} title="Mirror: paint both halves at once"
              className={'bt-paint-size bt-paint-mirror' + (mirror ? ' bt-paint-size--on' : '')}>
              <svg className="bt-paint-tool-icon" viewBox="0 0 24 24" width="20" height="20"
                aria-hidden="true" focusable="false">
                <path d="M12 3v18" fill="none" stroke="currentColor" strokeWidth="1.6"
                  strokeLinecap="round" strokeDasharray="2.4 2.4" />
                <path d="M9.6 6.4 4.4 12l5.2 5.6Z" fill="currentColor" stroke="none" />
                <path d="M14.4 6.4 19.6 12l-5.2 5.6Z" fill="currentColor" stroke="none" />
              </svg>
              <span className="bt-paint-tool-label">Mirror</span>
            </button>
          </div>
        )}

        {onPattern ? (
          <div className="bt-paint-pal" style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 5, opacity: patId ? 1 : .35 }}>
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
          <div className="bt-paint-pal" style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 5 }}>
            {ART_PALETTE.map((c, i) => (
              <button key={i} type="button" title={i === 0 ? 'Eraser — works with every tool' : 'Colour'}
                aria-label={i === 0 ? 'Eraser' : 'Colour ' + i}
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

        {!onPattern && (
          <div className="bt-paint-slots">
            {Array.from({ length: SLOT_COUNT }, (_, i) => (
              <SlotChip key={i} art={slots[i] || ''} arming={arming}
                on={arming && !!slots[i]}
                onPick={() => (arming ? saveToSlot(i) : loadSlot(i))} />
            ))}
            <button type="button"
              className={'bt-paint-save' + (arming ? ' bt-paint-save--on' : '')}
              aria-pressed={arming}
              onClick={() => setArming((a) => !a)}
              title={arming ? 'Now tap the slot to replace' : 'Save this design over one of the slots'}>
              {arming ? 'Tap a slot' : 'Save'}
            </button>
          </div>
        )}

        <div className="bt-paint-btn" style={{ display: 'flex', gap: 8 }}>
          {/* v2.3.1950: DIMMED, not ghosted.  `.bt-cc-ghost` is visibility:hidden,
              which is right for the creator's design button (it holds a slot in
              a grid and must not make the rows jump) and wrong here: these two
              start disabled on every fresh canvas, so ghosting them means a
              player never learns the panel HAS an undo until they happen to
              draw something. Dim and unclickable says "here, but nothing to
              undo yet". */}
          {!onPattern && (
            <button type="button" className="bt-cc-tab"
              disabled={!undoN} onClick={undo}
              style={{ flex: 1, minHeight: 38, opacity: undoN ? 1 : 0.38,
                cursor: undoN ? 'pointer' : 'default' }}
              title={undoN ? 'Undo the last thing you did' : 'Nothing to undo yet'}>
              <span className="bt-cc-tab-label">Undo</span>
            </button>
          )}
          {!onPattern && (
            <button type="button" className="bt-cc-tab"
              disabled={!redoN} onClick={redo}
              style={{ flex: 1, minHeight: 38, opacity: redoN ? 1 : 0.38,
                cursor: redoN ? 'pointer' : 'default' }}
              title={redoN ? 'Put back what you just undid' : 'Nothing to redo'}>
              <span className="bt-cc-tab-label">Redo</span>
            </button>
          )}
          <button type="button" className="bt-cc-tab" style={{ flex: 1, minHeight: 38 }}
            /* v2.3.1950: a bare "Clear" now that Redo makes four buttons in this
               row -- "Clear arm tattoo" does not fit a quarter of a phone.  The
               mode strip above says which canvas you are on, and the title
               carries the whole sentence. */
            title={onPattern ? 'Remove the pattern' : ('Erase the whole ' + (isShirt ? side + ' of the shirt' : scfg.label))}
            onClick={() => {
              if (onPattern) { pickTile(''); return; }
              pushHist(art);
              setArtState(emptyArt());
            }}>
            <span className="bt-cc-tab-label">
              {onPattern ? 'No pattern' : 'Clear'}
            </span>
          </button>
          <button type="button" className="bt-cc-tab bt-cc-tab--on" style={{ flex: 1, minHeight: 38 }}
            onClick={onClose}>
            <span className="bt-cc-tab-label">Done</span>
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
