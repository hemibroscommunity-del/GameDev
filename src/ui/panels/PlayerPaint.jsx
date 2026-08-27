import React from 'react';
import {
  ART_W, ART_H, ART_PALETTE, emptyArt, artColorAt,
  getArt, getSlots, setSlot, SLOT_COUNT,
} from '@/rendering/traits/playerArt.js';
import {
  TOOLS, toolById, lineCells, expandCells,
  BRUSH_SIZES, LETTERS,
} from '@/rendering/traits/artTools.js';   /* v2.3.1948 */
import {
  getDoc, saveDoc, appendToDoc, copyDoc, replay,
} from '@/rendering/traits/artOps.js';   /* v2.3.1967: the canvas is an op list */
import {
  patternsFor, getPattern, setPattern, parsePattern, formatPattern, patternInk,
} from '@/rendering/traits/patternCatalog.js';   /* v2.3.1941 */
import { drawCharacterPortrait } from '@/rendering/characterPortrait.js';   /* v2.3.1947 */
import BodyInk from '@/ui/panels/BodyInk.jsx';   /* v2.3.1965 */
import { heightMul, PORTRAIT_FIT, getBuildHeight } from '@/rendering/traits/buildCatalog.js';   /* v2.3.1953 */

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
    /* v2.3.1994: the Body screen reaches the arms as well now, so the caption
       says where a stroke will land before you make it. */
    note: 'Chest and arms. Draw straight on either — a shirt or breastplate covers the chest, sleeves cover the upper arm.',
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
/* v2.3.1978: TWO TATTOO SCREENS, BODY AND FACE.
   Owner: "For the tattoos just do two options: body and face."  The chest /
   face / arms split plus the v2.3.1965 free-roaming Body tab was four tabs for
   what is really one decision — which half of you are you drawing on.
   The ARM canvas keeps rendering and keeps its data; it simply has no editor
   any more.  Nothing is deleted: a player who inked their arms before this
   still wears them, and the wire, the renderer and both server gates are
   untouched.  Say the word if it should be cleared instead. */
const TATTOO_SPOT = { body: 'tattoo', face: 'tattooFace' };
/* v2.3.1994: and which canvases each of those two screens can REACH — the tab
   frames a view now rather than fencing one canvas off, so Body covers the
   torso and both arms.  Beside TATTOO_SPOT because the two are one table read
   two ways: the default, and the whole set. */
const TAB_SPOTS = { body: ['tattoo', 'tattooArm'], face: ['tattooFace'] };

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
  /* v2.3.1967 (owner: "add a hand shape to tap the existing shape to reselect
     and edit it").  The hint says TAP, because nothing about a hand icon tells
     you that the thing under it is still an object rather than pixels. */
  select: 'Tap something you already drew to pick it up again',
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
    /* v2.3.1967: the owner asked for "a hand shape", so it is a hand — a
       tapping hand with the index finger out, drawn in the same one-viewBox
       stroke style as its five neighbours rather than shipped as an asset (an
       asset that is never fetched cannot hitch on first use, which is what the
       animation-preload law exists to prevent). */
    select: [
      <path key="a" d="M9.6 13.2V6.1a1.75 1.75 0 0 1 3.5 0v5.3" {...stroke} />,
      <path key="b" d="M13.1 11.4v-1a1.75 1.75 0 0 1 3.5 0v1.3" {...stroke} />,
      <path key="c" d="M16.6 11.7a1.75 1.75 0 0 1 3.5 0v3.4a5.6 5.6 0 0 1-5.6 5.6h-1.2a5 5 0 0 1-3.5-1.5l-3.1-3.1a1.75 1.75 0 0 1 2.5-2.5l1.4 1.4" {...stroke} />,
    ],
  };
  return (
    <svg className="bt-paint-tool-icon" viewBox="0 0 24 24" width="20" height="20"
      aria-hidden="true" focusable="false">{kids[id] || kids.pen}</svg>
  );
}

/* v2.3.1967: what the layer readout calls the thing you have picked up.  Named
   at all because "Layer 3 of 5" alone does not tell you WHICH of the five you
   are holding when two of them overlap — and named by what the player made
   ("circle", "letter A"), not by the op kind, which is an implementation
   detail they never chose.  A chain of comparisons rather than a lookup table:
   the key comes off a stored op, and a plain object indexed by a value that
   round-tripped through localStorage is the '__proto__' trap (TRAPS #6). */
function selName(op) {
  if (!op) return '';
  if (op.k === 's') return op.t === 'rect' ? 'box' : op.t === 'ellipse' ? 'circle' : 'line';
  if (op.k === 't') return 'letter ' + op.g;
  if (op.k === 'f') return 'fill';
  return 'brush stroke';
}

/* The four layer steps.  A table rather than four near-identical buttons in the
   markup, so the disabled rule and the chip styling are written once — and so
   the wording stays parallel, which is what makes a row of four read as one
   control with four strengths instead of four unrelated actions. */
const LAYER_MOVES = [
  { k: 'bb', d: 'back', label: 'To back', tip: 'Send it behind everything else' },
  { k: 'b1', d: -1, label: 'Back', tip: 'One step further back' },
  { k: 'f1', d: 1, label: 'Forward', tip: 'One step further forward' },
  { k: 'ff', d: 'front', label: 'To front', tip: 'Bring it in front of everything else' },
];

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
  /* v2.3.1978: the face preview shows the WHOLE UPPER BODY, same frame as the
     body tab.  Owner: "If body, show full upper body including head in
     preview ... For face, same idea ... In the preview it shows the full upper
     body."  The v2.3.1949 frame went right in on the head (cy 0.255, h 0.20),
     which is the wrong job now: the editor beside it is already the head at
     full zoom, so a second close-up said nothing.  What the preview is for is
     the thing the editor cannot show you — what it looks like ON you.
     tattooArm keeps its frame: the arm canvas still renders, it just has no
     editor any more (see TATTOO_SPOT). */
  tattooFace: { cy: 0.43, h: 0.45 },
  tattooArm: { cy: 0.46, h: 0.40 },
  /* Trousers, plus the boot tops.  Centring higher put a third of the pane on
     shirt hem. */
  pants: { cy: 0.69, h: 0.35 },
  /* Down to 1.0, not to the boots: the feet sit at 0.977 and a frame that
     stopped at 0.947 sliced the soles off. */
  shoes: { cy: 0.865, h: 0.27 },
};
/* v2.3.1953: every frame above was measured against a figure drawn at full
   size and average build.  The composite now draws through PORTRAIT_FIT times
   the player's own height (buildCatalog), scaled about the FEET — so a tall
   bro's chest is higher up the canvas than a short one's, and a fixed frame
   would point at his stomach.  Same feet-anchored mapping the creator's camera
   uses: move the window's centre with the figure and scale the window by the
   same factor.  0.977 is the measured foot line quoted above. */
const FIG_BOT = 0.977;
function focusFor(target, heightId) {
  const f = FOCUS[target] || FOCUS.shirt;
  const k = PORTRAIT_FIT * heightMul(heightId);
  if (k === 1) return f;
  return { cy: FIG_BOT + (f.cy - FIG_BOT) * k, h: f.h * k };
}

function WornPreview({ look, target, side, art, pat }) {
  const boxRef = React.useRef(null);
  const offRef = React.useRef(null);
  const busyRef = React.useRef(false);
  const dirtyRef = React.useRef(false);

  /* Blit the finished composite into the visible box, cropped to the garment. */
  /* The build the composite is being drawn at — explicit from the caller when
     it has one, this device's own store otherwise (which is the same rule
     drawCharacterPortrait itself follows for every drawing and pattern). */
  const buildH = (look && look.buildHeight) || getBuildHeight();
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
    const f = focusFor(target, buildH);
    const S = off.width;                       /* the composite is square */
    const winH = f.h * S;
    const winW = winH * (cssW / cssH);
    ctx.drawImage(off, FIG_CX * S - winW / 2, f.cy * S - winH / 2, winW, winH, 0, 0, w, h);
  }, [target, buildH]);

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
  /* v2.3.1965 (owner: "just allow the user to zoom in on any part of the
     character skin to tattoo it ... you're just making the tattoo on whatever
     zoomed in body part you want").  `body` is the FIRST tab and the one this
     panel opens on, because inking the character directly is what the owner
     asked for and what most people want.  The three per-region grids stay
     behind it rather than being deleted: a 16x16 grid is a better tool for a
     deliberate, symmetrical design than a finger on a zoomed limb, and
     throwing it away to answer the note would be a trade, not a fix. */
  const MODES = isTattoo ? ['body', 'face']
    : (cfg.pattern && canDraw)
      ? (isShirt ? ['pattern', 'front', 'back'] : ['pattern', 'drawing'])
      : null;
  const [mode, setMode] = React.useState(isTattoo ? 'body' : (cfg.pattern ? 'pattern' : 'draw'));
  /* Which skin canvas the body surface last touched.  It drives `spot`, so the
     palette, Undo, Clear and the caption all follow your finger from the chest
     to the face without you telling them you moved. */
  const side = mode === 'back' ? 'back' : 'front';
  const onPattern = mode === 'pattern';
  /* WHERE on the body this panel is currently painting.  For everything but a
     tattoo that is just the target; for a tattoo the mode picks it, and the
     caption, the preview's camera and the Clear button all follow it. */
  /* Both tattoo screens are the draw-on-your-character surface now; the tab
     only says WHICH region it is framed on. */
  const onBody = isTattoo;
  /* ═══ v2.3.1994: THE TAB FRAMES, THE FINGER CHOOSES ═══
     Owner: "Can you just make anywhere where skin is showing be tattooable?"

     v2.3.1978 pinned the surface to ONE canvas per tab, which left the ARMS
     with no editor on any screen — a whole pair of limbs of plainly visible
     skin that no gesture could reach.  The Body tab now frames the torso AND
     both arms (BodyInk's TAB_REGIONS) and a stroke lands on whichever it
     started over, so `spot` follows your finger again rather than the tab.

     `bodySpot` is what the surface last reported.  It is checked against the
     tab's own list rather than being reset by an effect: switching to Face
     with an arm selected simply stops matching, and the tab's default answers
     — no second render, and no window in which the panel is pointed at a
     canvas the surface cannot reach. */
  const [bodySpot, setBodySpot] = React.useState('tattoo');
  const tabSpot = isTattoo ? (TATTOO_SPOT[mode] || 'tattoo') : target;
  const spot = (isTattoo && (TAB_SPOTS[mode] || []).indexOf(bodySpot) >= 0) ? bodySpot : tabSpot;
  const scfg = TARGETS[spot] || cfg;
  /* Which stored drawing this panel is editing right now. */
  const artId = isShirt ? (side === 'back' ? 'shirtBack' : 'shirtFront') : spot;
  /* v2.3.1994: and the same answer for code that runs BETWEEN renders.  A body
     stroke can move the canvas on pointer DOWN, and every op mutator below
     fires during that same gesture — a render-state `artId` is one render
     behind at exactly that moment, which is how a stroke made on an arm would
     be appended to the chest's list.  Assigned during render like the other
     refs, and again, eagerly, by the region switch. */
  const artIdRef = React.useRef(artId); artIdRef.current = artId;
  /* v2.3.1994: the body surface's cell lookup (BodyInk's apiRef).  The panel
     owns the tools; the surface owns the mapping. */
  const bodyApiRef = React.useRef(null);

  /* ── the garment's pattern ── */
  const [pat, setPat] = React.useState(() => (cfg.pattern ? getPattern(cfg.pattern) : ''));
  const parsed = parsePattern(pat, cfg.pattern);
  const patId = parsed ? parsed.id : '';
  const patColor = parsed ? parsed.colorIdx : 1;
  React.useEffect(() => { if (cfg.pattern) setPattern(cfg.pattern, pat); }, [cfg.pattern, pat]);
  const pickTile = (id) => setPat(id ? formatPattern(id, patColor) : '');
  const pickPatColor = (i) => { if (patId && i > 0) setPat(formatPattern(patId, i)); };
  /* ═══ v2.3.1967: THE CANVAS IS AN OP LIST, AND THE ART IS DERIVED ═══
     Owner, play-testing: "During the tattoo editor can you add a hand shape to
     tap the existing shape to reselect and edit it? Also can you add an option
     to change layers?"

     Neither is possible against a flat 256-character string: a placed shape had
     stopped being a shape, and a flat string has exactly one layer.  So this
     panel no longer edits the string at all.  It holds {base, ops} (artOps.js)
     and REPLAYS it — every stroke, shape, letter and fill is an entry in an
     ordered list, the drawing is what that list renders to, re-selecting is
     finding an entry, and changing layers is moving one.

     `doc.id` is the canvas the doc belongs to.  It is on the object rather than
     tracked beside it because the persist effect below has to be able to tell
     that it is looking at the canvas we just LEFT: switching tabs re-renders
     once with the new artId and the old doc still in state, and a persist in
     that window writes the old drawing onto the new canvas. */
  const [doc, setDoc] = React.useState(() => ({ id: artId, ...getDoc(artId) }));
  /* The drawing, and — from the same pass — which cells each op painted.  The
     hit test and the selection outline both read that, so what you tap is
     exactly what you see. */
  const painted = React.useMemo(() => {
    const out = [];
    return { art: replay(doc.base, doc.ops, out), cells: out };
  }, [doc]);
  const art = painted.art;
  /* Pointer handlers must read the CURRENT doc: a value captured in a handler's
     closure is a render behind (the same reason the draft used to live in a
     ref).  Assigned during render, so they are never stale. */
  const docRef = React.useRef(doc); docRef.current = doc;
  const paintedRef = React.useRef(painted); paintedRef.current = painted;
  const [ink, setInk] = React.useState(1);        /* palette index; 0 = eraser */
  /* v2.3.1948 (owner: "any drawing tools like lines, shapes, eraser, fill?",
     then "a small eraser for erasing areas ... different brush size options ...
     perhaps letters you can place?"). */
  const [tool, setTool] = React.useState('pen');
  const [brush, setBrush] = React.useState(1);
  const [letter, setLetter] = React.useState('A');
  /* ═══ v2.3.1994: MIRROR IS RETIRED, AND FILL TOOK ITS PLACE ═══
     Owner: "Swap out the mirror for 'fill'."

     v2.3.1949 added Mirror on the reasoning that hand-matching the other half
     of a face is not something anybody manages on a 16-cell grid.  That was a
     guess about what the player would want, and the player has now said.  Fill
     is not new — it has been in the TOOLS table since v2.3.1948 — but it was in
     the tool row, which the skin editor did not show, so on the one screen the
     owner was looking at the choice really was "mirror, or nothing".  The tool
     row is on every screen now (see the parity note below), so Fill is where it
     belongs and the dedicated cell Mirror held is gone rather than being filled
     with a second copy of a button that already exists.

     THE DATA IS NOT TOUCHED.  An op still carries `m`, artOps still replays it,
     and a drawing made before today keeps its mirrored halves exactly as they
     are — nothing in this panel SETS it any more, which is the whole change. */
  /* ── v2.3.1967: which op is selected ──
     An index into doc.ops, -1 for none.  ONE selection serves both halves of
     the owner's note: it is what the hand tool picks up, and it is what the
     layer buttons move. */
  const [sel, setSel] = React.useState(-1);
  const selRef = React.useRef(-1); selRef.current = sel;
  /* One entry per ACTION, not per cell: a drag paints dozens of cells and an
     undo that stepped back through them one at a time would be useless.  The
     pre-gesture drawing is pushed when the gesture starts (or, for a shape,
     when it commits), so one tap of Undo removes one thing you did.
     v2.3.1967: an entry is a whole {id, base, ops} snapshot now, id included —
     see `snapshot` for the two-canvas bug that fixes. */
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
  /* ═══ v2.3.1951: A SHAPE YOU CAN STILL RESIZE ═══
     Owner: "For shapes in editor it's helpful to have a drag handle on the
     corner so you can size it how you want (default is to keep shape ratio so
     proportions are consistent at each size but you can untick that option)."

     So a shape no longer commits when you lift your finger.  It becomes
     PENDING: still adjustable, with a handle on the free corner, until you
     place it.  `ratio` is the aspect it was drawn at, remembered so the lock
     preserves what you made rather than forcing a square.

     v2.3.1967: the geometry now lives in the OP, and this ref holds only what
     the op does not carry — the aspect it was drawn at, whether it is brand new
     (so Cancel knows whether to bin it or to put it back), the op object it
     looked like when it was picked up, and which undo entry was banked for this
     selection.  A re-selected shape and a freshly drawn one therefore land in
     exactly the same state, which is the point: one way to adjust a shape, not
     two.  The old draft-cells overlay is gone with it — a pending shape is a
     real op in the list now, so the grid already shows it where it will land,
     at its own layer, and there is nothing left to preview separately. */
  const pendRef = React.useRef(null);      /* {ratio, isNew, orig, hist} or null */
  const [lockRatio, setLockRatio] = React.useState(true);
  const dragHandleRef = React.useRef(false);
  const cvRef = React.useRef(null);
  const paintingRef = React.useRef(false);
  const lastRef = React.useRef('');
  const prevCellRef = React.useRef(null);
  const anchorRef = React.useRef(null);
  /* The freehand stroke in flight: which op is collecting it, and the cells it
     has already taken (a drag re-crosses its own cells constantly). */
  const strokeRef = React.useRef(null);    /* {idx, seen:Set, hist} or null */
  /* v2.3.1965: the body surface re-reads the skin canvases through this. */
  const [bodyTick, setBodyTick] = React.useState(0);
  /* ── v2.3.1994: the op in flight, for the body surface's fast overlay ──
     Re-compositing the figure costs 7-12ms on desktop and several times that
     on the phone, so the truth arrives a frame or two behind the finger.  The
     surface paints THIS op's cells straight onto the glass in the meantime.
     An index rather than the cells: the cells are already computed once per
     render by `painted`, and a second copy of them in state would be a second
     thing that can disagree with the drawing. */
  const [liveIdx, setLiveIdx] = React.useState(-1);

  /* The selected op, and whether it is one with a handle.  Read from render
     state (not a ref) because the controls below are rendered from it; the
     bounds check matters because Undo can shorten the list under a selection. */
  const selOp = (doc.id === artId && sel >= 0 && sel < doc.ops.length) ? doc.ops[sel] : null;
  const selOpRef = React.useRef(null); selOpRef.current = selOp;

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
    /* ── v2.3.1994: A CANVAS WE HAVE ALREADY MOVED TO IS NOT A TAB CHANGE ──
       A body stroke can change `artId` mid-gesture (a finger that starts on an
       arm), and `bodyRegion` does that switch SYNCHRONOUSLY — it loads the new
       canvas's doc before the first op is appended.  Without this guard this
       effect would then run on the very next commit and reload that canvas
       from the STORE, which has not been written yet, wiping the stroke that
       is still under the finger and clearing the history entry banked for it.
       Comparing what we HOLD against what is wanted says the difference: on a
       real tab change the held doc is the canvas we just left, and the whole
       reset below is right. */
    if (docRef.current.id === artId) return;
    setDoc({ id: artId, ...getDoc(artId) });
    histRef.current = [];
    redoRef.current = [];
    setUndoN(0);
    setRedoN(0);
    setCopied(false);
    setSlots(getSlots(artId));
    setArming(false);
    pendRef.current = null;
    strokeRef.current = null;
    setSel(-1);
  }, [artId]);

  const HIST_MAX = 40;
  /* ── v2.3.1967: an undo entry knows which canvas it belongs to ──
     Two things in this panel change a canvas that is NOT the one on screen:
     Copy-to-back, and a body-surface stroke that lands on a different skin
     region.  Both used to bank the OTHER canvas's drawing onto THIS canvas's
     undo stack, so one tap of Undo after a copy pasted the back's old drawing
     onto the FRONT — losing the front and not restoring the back — and the
     body surface's cross-canvas stroke gave up and banked nothing at all.
     With the id on the entry, Undo puts each change back where it came from. */
  /* v2.3.1994: against artIdRef, not the render's artId — a body gesture can
     move the canvas between renders, and comparing to a stale id here would
     bank the wrong drawing for undo. */
  const snapshot = (id) => (id === artIdRef.current ? docRef.current : { id, ...getDoc(id) });
  const applySnap = (d) => {
    if (d.id === artIdRef.current) { docRef.current = d; setDoc(d); }
    else saveDoc(d.id, d.base, d.ops);
    pendRef.current = null;
    setSel(-1);
    setBodyTick((t) => t + 1);
  };
  const pushHist = (d) => {
    const h = histRef.current;
    if (h[h.length - 1] === d) return;     /* nothing changed since last time */
    h.push(d);
    if (h.length > HIST_MAX) h.shift();
    /* v2.3.1950: a NEW action discards the redo stack.  Undoing three strokes
       and then drawing a fourth means the three you undid are no longer a
       future you can return to -- keeping them would let Redo paste in work
       that never followed from what is now on the grid. */
    redoRef.current = [];
    setUndoN(h.length);
    setRedoN(0);
  };
  /* Take an entry back OFF the stack, for an action that turned out not to
     happen: a cancelled adjustment, or a stroke that touched no cell.  Leaving
     it there would cost the player a tap of Undo that visibly does nothing. */
  const unbank = (entry) => {
    const h = histRef.current;
    if (!entry || h[h.length - 1] !== entry) return;
    h.pop();
    setUndoN(h.length);
  };
  const undo = () => {
    const h = histRef.current;
    if (!h.length) return;
    const prev = h.pop();
    redoRef.current.push(snapshot(prev.id));
    if (redoRef.current.length > HIST_MAX) redoRef.current.shift();
    applySnap(prev);
    setUndoN(h.length);
    setRedoN(redoRef.current.length);
  };
  const redo = () => {
    const r = redoRef.current;
    if (!r.length) return;
    /* Straight onto the undo stack, WITHOUT pushHist -- that would wipe the
       rest of the redo stack and make a second Redo impossible. */
    const next = r.pop();
    const h = histRef.current;
    h.push(snapshot(next.id));
    if (h.length > HIST_MAX) h.shift();
    applySnap(next);
    setUndoN(h.length);
    setRedoN(r.length);
  };

  /* ── v2.3.1967: the three ways the op list changes ──
     None of them mutates.  Undo snapshots share these arrays and these op
     objects, so an in-place edit would quietly rewrite history as well as the
     drawing — which is the same class of bug as the flat string's, one level
     up. */
  const addOp = (op) => {
    /* Belt and braces: if a stroke somehow lands in the one render where the
       canvas has changed and the doc has not caught up yet (the body surface
       moves `spot` on pointer DOWN), take the target canvas's doc from the
       store rather than appending this op to the doc for a DIFFERENT canvas —
       which would write one skin region's whole drawing onto another.
       v2.3.1994: the id comes off the REF, which the region switch sets before
       the first op of a cross-canvas gesture is appended. */
    const id = artIdRef.current;
    const d = docRef.current.id === id ? docRef.current : { id, ...getDoc(id) };
    pushHist(d);
    const next = appendToDoc(d, op);
    const nd = { id, base: next.base, ops: next.ops };
    /* v2.3.1994: the ref moves NOW as well as at the next render.  A gesture
       calls addOp and then reads docRef in the same tick (the shape tools bank
       their pending state from it), and a ref that only caught up on render
       handed them the list without the op they had just made. */
    docRef.current = nd;
    setDoc(nd);
    return next.ops.length - 1;
  };
  const setOp = (i, next) => setDoc((d) => ({ ...d, ops: d.ops.map((o, k) => (k === i ? next : o)) }));
  const dropOp = (i) => setDoc((d) => ({ ...d, ops: d.ops.filter((o, k) => k !== i) }));

  const saveToSlot = (i) => {
    setSlot(artId, i, art);
    setSlots(getSlots(artId));
    setArming(false);
  };
  const loadSlot = (i) => {
    const v = slots[i];
    if (!v) { saveToSlot(i); return; }   /* empty: the only sensible action */
    pushHist(docRef.current);             /* so a mis-tap is one Undo away */
    /* A loaded design arrives FLAT: a slot holds 256 characters, so we know its
       pixels and not its pieces.  It becomes the base with nothing selectable
       on top of it — the same rule artOps applies to any drawing it cannot
       account for. */
    setDoc({ id: artId, base: v, ops: [] });
    pendRef.current = null;
    setSel(-1);
  };

  /* Persist as you draw: the character updates live behind the panel, which is
     the whole point of drawing on a character rather than in a vacuum.
     v2.3.1967: through saveDoc, which stores the op list AND the 256-character
     drawing it renders to — the drawing is still what every renderer, slot and
     wire path reads.  The `doc.id` guard is the fix for a real (if brief) bug:
     switching tabs renders once with the new artId and the previous canvas's
     doc still in state, and this effect used to write that stale drawing onto
     the canvas being opened before the reset effect's state landed. */
  React.useEffect(() => {
    if (doc.id !== artId) return;
    saveDoc(artId, doc.base, doc.ops, art);
  }, [artId, doc, art]);

  /* ── v2.3.1965: the body surface's two hooks ─────────────────────────────
     The surface shows all three skin canvases at once and `art` is only the one
     this panel has selected, so the other two come from the STORE.  `bodyTick`
     re-reads them after a stroke lands.
     v2.3.1967: the SELECTED one comes from the live doc instead.  The store is
     written by the effect above, which runs after this render, so reading it
     here showed the body surface a stroke-old picture of the canvas you were
     actually inking. */
  const liveArt = (id) => (id === artId ? art : getArt(id));
  const bodyArts = React.useMemo(() => ({
    tattoo: liveArt('tattoo'), tattooFace: liveArt('tattooFace'), tattooArm: liveArt('tattooArm'),
    /* liveArt reads only `art`/`artId` and the store; bodyTick is the store's
       own change signal.  (No react-hooks plugin in this repo's flat config —
       the deps are stated by hand and checked by hand.) */
  }), [bodyTick, art, artId]);
  /* ═══ v2.3.1994: THE BODY SURFACE MOVES THE CANVAS, THE PANEL DOES THE REST ═══
     The v2.3.1967 `inkFromBody` handover is gone with the surface's own pen.
     BodyInk no longer collects a stroke and hands over finished cells; it
     reports which cell of which skin canvas a pointer is on and forwards the
     raw events, so the panel's tool handlers — pen, line, box, circle, fill,
     letters, the hand — run on the body exactly as they run on the shirt.
     One implementation of each tool, which is what "the same as the shirt
     editor" has to mean if the two are not to drift.

     What is left for the panel to own is the one thing the surface CAN change
     under it: which canvas the gesture is on.  A finger that comes down on an
     arm has to move the whole editing context — doc, replayed cells, undo
     target — before the first op is appended, and synchronously, because the
     op is appended in this same tick.  Hence the three eager writes: React
     state alone is a render too late here, and the drawing would land on the
     canvas you were looking at a moment ago.

     The reset effect above knows to leave this alone; the undo entries carry
     their own canvas id (v2.3.1967), so a history that spans the chest and an
     arm puts each change back where it came from. */
  const bodyRegion = React.useCallback((tgt) => {
    if (!tgt || tgt === artIdRef.current) return;
    const d = { id: tgt, ...getDoc(tgt) };
    artIdRef.current = tgt;
    docRef.current = d;
    /* The hit test reads `paintedRef`, so it has to describe the canvas we
       just moved to — otherwise the hand tool would pick up an op by an index
       from the drawing we LEFT. */
    const out = [];
    paintedRef.current = { art: replay(d.base, d.ops, out), cells: out };
    pendRef.current = null;
    setDoc(d);
    setBodySpot(tgt);
    setSel(-1);
  }, []);

  /* v2.3.1967: where the drag handle sits for an op — the corner you dragged TO
     for a shape, the letter's own centre for a letter.  null for a freehand
     stroke or a fill: those have nothing to drag, so they get a selection
     outline and the layer buttons and no handle. */
  /* v2.3.1994: MEMOISED where it is handed to the body surface, and that is not
     tidiness.  It answers a fresh `[x, y]` every call, and BodyInk's blit —
     and therefore the effect that owns the composite loop — depends on it: an
     unmemoised handle would tear down and restart the composite on every
     render, which during a shape drag is every pointermove. */
  const handleCell = (op) => {
    if (!op) return null;
    if (op.k === 's') return [op.a[2], op.a[3]];
    if (op.k === 't') return [op.x, op.y];
    return null;
  };
  const selHandle = React.useMemo(() => handleCell(selOp), [selOp]);   /* v2.3.1994 */

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
    /* v2.3.1948 drew the uncommitted shape as a separate overlay.  v2.3.1967
       does not need to: a shape being dragged is already an op in the list, so
       the loop above painted it — in its real colour, at its real layer, behind
       whatever is meant to be in front of it.  A preview that IS the drawing
       cannot disagree with the result.

       What is left to draw is the two things that are not part of the drawing:
       WHICH op is selected, and the handle that adjusts it. */
    const selCells = (sel >= 0 && sel < painted.cells.length) ? painted.cells[sel] : null;
    if (selCells && selCells.length) {
      /* An outline around the selection's own cells rather than a bounding box:
         a circle's box is mostly not the circle, and on a 16-cell grid a box
         drawn round one shape covers the three next to it.  Only the edges with
         no neighbour in the set are stroked, so the ring hugs the shape. */
      const has = new Uint8Array(ART_W * ART_H);
      for (let i = 0; i < selCells.length; i++) has[selCells[i][1] * ART_W + selCells[i][0]] = 1;
      ctx.save();
      ctx.lineWidth = Math.max(1.5, S * 0.11);
      ctx.strokeStyle = '#D8AA58';
      ctx.beginPath();
      for (let i = 0; i < selCells.length; i++) {
        const x = selCells[i][0], y = selCells[i][1];
        const px = x * S, py = y * S;
        if (y === 0 || !has[(y - 1) * ART_W + x]) { ctx.moveTo(px, py); ctx.lineTo(px + S, py); }
        if (y === ART_H - 1 || !has[(y + 1) * ART_W + x]) { ctx.moveTo(px, py + S); ctx.lineTo(px + S, py + S); }
        if (x === 0 || !has[y * ART_W + x - 1]) { ctx.moveTo(px, py); ctx.lineTo(px, py + S); }
        if (x === ART_W - 1 || !has[y * ART_W + x + 1]) { ctx.moveTo(px + S, py); ctx.lineTo(px + S, py + S); }
      }
      ctx.stroke();
      ctx.restore();
    }
    /* v2.3.1951: the resize handle, on the corner you dragged TO.  Drawn last
       so it is never hidden under the shape's own cells, and drawn as a ring
       rather than a blob so it does not read as part of the drawing.
       v2.3.1967: it sits on the selected OP now — the far corner of a shape, or
       a letter's own centre, since a letter has no size to drag and its handle
       moves it instead. */
    const hcell = handleCell(selOp);
    if (hcell) {
      const hx = (hcell[0] + 0.5) * S, hy = (hcell[1] + 0.5) * S;
      const r = Math.max(7, S * 0.62);
      ctx.beginPath();
      ctx.arc(hx, hy, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(10,14,18,.55)';
      ctx.fill();
      ctx.lineWidth = Math.max(2, S * 0.14);
      ctx.strokeStyle = '#D8AA58';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(hx, hy, Math.max(2, r * 0.28), 0, Math.PI * 2);
      ctx.fillStyle = '#D8AA58';
      ctx.fill();
    }
  }, [art, painted, onPattern, sel, selOp]);

  /* Which cell the pointer is over.  `clamp` pins a drag that has wandered off
     the grid to the nearest edge cell instead of dropping it: pointer capture
     keeps the events coming, and a shape whose corner you dragged past the edge
     should still have a corner. */
  const cellAt = (e, clamp) => {
    /* ── v2.3.1994: ONE QUESTION, TWO SURFACES ──
       Everything below this line works in cell space and does not care which
       glass the finger is on.  The flat grid answers it from its own bounding
       box; the body surface answers it by unprojecting the pointer through the
       composite's matrix onto the body sheet and asking the reported grid (see
       BodyInk).  Putting the fork HERE, in the one function every tool already
       calls, is what makes every tool work on the character without a second
       copy of any of them. */
    if (onBody) {
      const api = bodyApiRef.current;
      const c = api && api.cellAt(e, clamp);
      return c ? [c.gx, c.gy] : null;
    }
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
    const st = strokeRef.current;
    if (!st) return;
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
    /* v2.3.1967: the cells go into the stroke's OWN op rather than into the
       string.  The op stores what the stroke FINISHED with — already widened by
       the brush and already mirrored — because the pen is the one tool with
       nothing left to adjust afterwards, and storing the result means a replay
       can never disagree with what appeared under the finger. */
    const cells = expandCells(path, brush);   /* v2.3.1994: no mirror stage */
    const add = [];
    for (let i = 0; i < cells.length; i++) {
      const idx = cells[i][1] * ART_W + cells[i][0];
      if (st.seen.has(idx)) continue;       /* a drag re-crosses its own cells */
      st.seen.add(idx);
      add.push(idx);
    }
    if (!add.length) return;
    setDoc((d) => ({ ...d, ops: d.ops.map((o, i) => (i === st.idx ? { ...o, c: o.c.concat(add) } : o)) }));
  };

  /* ── v2.3.1967: selection ─────────────────────────────────────────────────
     Topmost first: the LAST op that painted the cell you tapped is the one on
     top of the pile there, which is the one you meant.  A box OUTLINE owns only
     its border cells, so a tap through the middle of one reaches whatever is
     behind it — which is right, because there is nothing of the box there. */
  const hitTest = (x, y) => {
    const cells = paintedRef.current.cells;
    for (let i = cells.length - 1; i >= 0; i--) {
      const list = cells[i];
      for (let k = 0; k < list.length; k++) {
        if (list[k][0] === x && list[k][1] === y) return i;
      }
    }
    return -1;
  };
  const selectOp = (i) => {
    if (i < 0) { pendRef.current = null; setSel(-1); return; }
    const op = docRef.current.ops[i];
    if (!op) return;
    /* A re-selected shape returns to EXACTLY the state a freshly drawn one is
       in — the same corner handle, the same Place/Cancel, the same ratio lock —
       so there is one way to adjust a shape and not two.  `orig` is what it
       looked like when it was picked up, which is what Cancel means here. */
    pendRef.current = {
      isNew: false,
      orig: op,
      hist: null,
      ratio: op.k === 's'
        ? (Math.abs(op.a[2] - op.a[0]) + 1) / (Math.abs(op.a[3] - op.a[1]) + 1)
        : 1,
    };
    setSel(i);
  };
  /* Bank ONE undo entry per selection, on the first adjustment: picking a shape
     up and putting it down unchanged should not cost a tap of Undo. */
  const bankPend = () => {
    const p = pendRef.current;
    if (!p || p.hist) return;
    pushHist(docRef.current);
    p.hist = histRef.current[histRef.current.length - 1];
  };

  /* Finished with the selection.  Called by starting a new gesture, by Place,
     by switching tool, and by Done — anything that means "I am done with this
     one".  The op stays exactly where it is; there is nothing to commit any
     more, which is the whole difference v2.3.1967 makes. */
  const placePending = () => { pendRef.current = null; setSel(-1); };
  /* Cancel means "as it was".  For a shape you have just drawn, that is nothing
     at all, so it is removed; for one you picked up, it is the geometry it had
     when you picked it up.  Either way the undo entry banked for this selection
     comes back off the stack — the action did not happen. */
  const cancelPending = () => {
    const p = pendRef.current, i = selRef.current;
    if (p && i >= 0) {
      if (p.isNew) dropOp(i);
      else if (p.orig) setOp(i, p.orig);
      unbank(p.hist);
    }
    pendRef.current = null;
    setSel(-1);
  };

  /* Is this pointer on the handle?  Generous: the handle is drawn about
     two-thirds of a cell and a finger is a lot wider than that. */
  const onHandle = (e) => {
    const h = handleCell(selOpRef.current);
    if (!h) return false;
    /* v2.3.1994: the body surface knows where a cell landed on the glass after
       the zoom and the pan, so it is asked rather than second-guessed. */
    if (onBody) {
      const api = bodyApiRef.current;
      const c = api && api.cellCenter(artIdRef.current, h[0], h[1]);
      if (!c) return false;
      return Math.hypot(e.clientX - c.x, e.clientY - c.y) <= Math.max(22, c.w * 1.3);
    }
    const cv = cvRef.current;
    if (!cv) return false;
    const r = cv.getBoundingClientRect();
    const cw = r.width / ART_W, ch = r.height / ART_H;
    const hx = r.left + (h[0] + 0.5) * cw, hy = r.top + (h[1] + 0.5) * ch;
    const dx = e.clientX - hx, dy = e.clientY - hy;
    return Math.hypot(dx, dy) <= Math.max(22, cw * 1.3);
  };

  /* ── v2.3.1967: LAYERS ────────────────────────────────────────────────────
     Owner: "Also can you add an option to change layers?"  Moving an op in the
     list IS the layer change — everything after it in the list paints over it —
     so this is a splice, and the drawing re-renders from the new order.  The
     selection follows the op rather than the slot, so the readout above the
     buttons ("Layer 3 of 5") names where the thing you are holding ended up.

     `to` is 'front', 'back', or a signed step. */
  const moveSel = (to) => {
    const i = selRef.current;
    const d = docRef.current;
    if (i < 0 || i >= d.ops.length) return;
    const n = d.ops.length;
    const j = Math.max(0, Math.min(n - 1,
      to === 'front' ? n - 1 : to === 'back' ? 0 : i + to));
    if (j === i) return;
    pushHist(d);
    const ops = d.ops.slice();
    const moved = ops.splice(i, 1)[0];
    ops.splice(j, 0, moved);
    setDoc({ ...d, ops });
    setSel(j);
    /* The layer move is its own undo step and stands on its own: a later Cancel
       reverts the GEOMETRY it was picked up with, not the ordering. */
    if (pendRef.current) pendRef.current.hist = null;
  };

  /* Resize to a new far corner, honouring the ratio lock.  The lock keeps the
     aspect the shape was DRAWN at rather than forcing a square: a 2:1 oval
     stays a 2:1 oval at every size, which is what "proportions are consistent"
     means for a shape you made yourself. */
  const resizeTo = (cx, cy) => {
    const pend = pendRef.current;
    const i = selRef.current;
    if (!pend || i < 0) return;
    /* Read the op INSIDE the updater: two pointermoves can arrive between
       renders, and a shape resized from a render-old copy of itself snaps back
       a frame every time the finger moves fast. */
    setDoc((d) => {
      const op = d.ops[i];
      if (!op) return d;
      /* A letter has no size, so its handle MOVES it.  That is the only edit a
         letter has, and giving it to the same handle keeps one gesture for
         "adjust the thing you picked up". */
      if (op.k === 't') {
        if (op.x === cx && op.y === cy) return d;
        return { ...d, ops: d.ops.map((o, k) => (k === i ? { ...o, x: cx, y: cy } : o)) };
      }
      if (op.k !== 's') return d;
      const x0 = op.a[0], y0 = op.a[1];
      let nx = cx, ny = cy;
      if (lockRatio && pend.ratio > 0) {
        const sx = nx >= x0 ? 1 : -1, sy = ny >= y0 ? 1 : -1;
        const w = Math.abs(nx - x0) + 1, h = Math.abs(ny - y0) + 1;
        /* Follow whichever axis the finger moved further along, so the shape
           tracks the finger instead of fighting it. */
        const useW = w >= h * pend.ratio;
        const nw = useW ? w : Math.max(1, Math.round(h * pend.ratio));
        const nh = useW ? Math.max(1, Math.round(w / pend.ratio)) : h;
        nx = x0 + sx * (nw - 1);
        ny = y0 + sy * (nh - 1);
        nx = Math.max(0, Math.min(ART_W - 1, nx));
        ny = Math.max(0, Math.min(ART_H - 1, ny));
      }
      if (op.a[2] === nx && op.a[3] === ny) return d;
      return { ...d, ops: d.ops.map((o, k) => (k === i ? { ...o, a: [x0, y0, nx, ny] } : o)) };
    });
  };

  const down = (e, info) => {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* not supported */ }
    /* v2.3.1951: the handle wins over everything — it is the only thing on the
       grid that is not a drawing gesture.
       v2.3.1994: on the body surface the answer arrives WITH the event.  The
       surface has to know whether this is a handle drag before it decides
       anything, because a handle that happens to sit over an arm must not
       re-target the canvas the shape lives on — so it asks once and tells us,
       rather than both of us testing the same circle and disagreeing. */
    if (info ? info.handle : onHandle(e)) {
      bankPend();
      dragHandleRef.current = true;
      paintingRef.current = true;
      lastRef.current = '';
      return;
    }
    /* v2.3.1967: the hand tool picks up what is already there instead of
       putting anything down.  A tap on nothing clears the selection, which is
       the only way to say "never mind" without moving something. */
    if (tdef.drag === 'pick') {
      const c = cellAt(e, false);
      selectOp(c ? hitTest(c[0], c[1]) : -1);
      return;
    }
    /* Anywhere else means "done with that one". */
    if (selRef.current >= 0) placePending();
    if (tdef.drag === 'once') {
      /* Fill and Letters are a TAP, not a drag: they commit where you touch.
         A fill is stored as an op like everything else, and it is re-run in
         sequence on every replay rather than resolved once — it floods against
         the grid AS IT WAS at that point in the list, so re-ordering the ops
         above it genuinely changes what it fills. */
      const c = cellAt(e, false);
      if (!c) return;
      setLiveIdx(addOp(tool === 'fill'
        ? { k: 'f', x: c[0], y: c[1], i: ink }
        : { k: 't', g: letter, x: c[0], y: c[1], i: ink }));
      return;
    }
    paintingRef.current = true;
    lastRef.current = '';
    prevCellRef.current = null;
    if (tdef.drag === 'shape') {
      /* A drag is ONE undoable action, and `addOp` banks the drawing before the
         shape joins it.  The shape is a real op from the first frame — which is
         why there is no draft overlay any more: what you are dragging out IS
         the drawing, at its own layer. */
      const c = cellAt(e, true);
      /* v2.3.1994: the body surface can answer "nowhere" — before the first
         composite has reported its grids there is no cell under anything. */
      if (!c) { paintingRef.current = false; return; }
      anchorRef.current = c;
      const i = addOp({ k: 's', t: tool, a: [c[0], c[1], c[0], c[1]], i: ink, b: brush });
      setLiveIdx(i);
      pendRef.current = { isNew: true, orig: null, ratio: 1, hist: histRef.current[histRef.current.length - 1] };
      setSel(i);
      return;
    }
    const idx = addOp({ k: 'c', c: [], i: ink });
    strokeRef.current = { idx, seen: new Set(), hist: histRef.current[histRef.current.length - 1] };
    setLiveIdx(idx);
    paintPen(e);
  };
  const move = (e) => {
    if (!paintingRef.current) return;
    if (dragHandleRef.current) {
      const c = cellAt(e, true);
      if (!c) return;
      const k = c[0] + ',' + c[1];
      if (k === lastRef.current) return;
      lastRef.current = k;
      resizeTo(c[0], c[1]);
      return;
    }
    if (tdef.drag === 'shape') {
      const a = anchorRef.current;
      const i = selRef.current;
      if (!a || i < 0) return;
      const c = cellAt(e, true);
      if (!c) return;
      const k = c[0] + ',' + c[1];
      if (k === lastRef.current) return;
      lastRef.current = k;
      setDoc((d) => {
        const op = d.ops[i];
        if (!op || op.k !== 's') return d;
        return { ...d, ops: d.ops.map((o, n) => (n === i ? { ...o, a: [a[0], a[1], c[0], c[1]] } : o)) };
      });
      return;
    }
    paintPen(e);
  };
  const up = () => {
    /* v2.3.1994: the gesture is over, so the fast overlay the body surface
       paints ahead of the composite has nothing left to be ahead of. */
    setLiveIdx(-1);
    if (dragHandleRef.current) {
      /* Still selected — the whole point is that you can keep adjusting it. */
      dragHandleRef.current = false;
      paintingRef.current = false;
      lastRef.current = '';
      return;
    }
    if (paintingRef.current && tdef.drag === 'shape') {
      /* v2.3.1951: a shape does not land on release.  It stays selected, with
         its handle, until you place it.  Only the ASPECT is settled here —
         remembered from the anchor and the last cell rather than read back out
         of the doc, because the last move's state may not have flushed yet. */
      const a = anchorRef.current;
      if (a && pendRef.current) {
        const c = lastRef.current ? lastRef.current.split(',').map(Number) : [a[0], a[1]];
        const w = Math.abs(c[0] - a[0]) + 1, h = Math.abs(c[1] - a[1]) + 1;
        pendRef.current.ratio = w / h;
      }
    } else if (strokeRef.current) {
      /* A stroke that touched no cell at all (a press that started off the
         grid) leaves an empty op and a dead undo step behind it. */
      const st = strokeRef.current;
      if (!st.seen.size) { dropOp(st.idx); unbank(st.hist); }
      strokeRef.current = null;
    }
    paintingRef.current = false;
    anchorRef.current = null;
    lastRef.current = '';
    prevCellRef.current = null;
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
                style={{ flex: 1, minHeight: 34, textTransform: 'capitalize',
                  /* see the label note below: the 2px side padding is what
                     "chest" overruns by one pixel at four tabs */
                  ...(MODES.length > 3 ? { paddingLeft: 1, paddingRight: 1 } : null) }}>
                {/* v2.3.1965: the skin strip is FOUR tabs now, and at four the
                    labels ellipsised to "Ch…" / "Ar…".  MEASURED rather than
                    nudged: the button comes out 34px wide with 2px of padding
                    each side, so a label has 30px, and "chest" wants 31px at
                    the clamp's 12px and 28px at 10px.  A notch smaller only
                    where there are four of them, rather than shrinking the
                    shirt's three for company. */}
                <span className="bt-cc-tab-label"
                  style={MODES.length > 3 ? { fontSize: '10px', letterSpacing: 0 } : undefined}>{m}</span>
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
                /* v2.3.1967: the OTHER side's whole doc, tagged with its id, so
                   Undo puts the back back rather than pasting it over the front
                   (which is what banking a bare string did).  And the copy
                   carries the op list, so the other side arrives with its
                   shapes still separable instead of as a flat print. */
                pushHist(snapshot(to));
                copyDoc(from, to);
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
          ) : onBody ? (
            /* v2.3.1965: the character IS the canvas — see BodyInk.jsx.
               v2.3.1994: and the panel drives every tool on it.  The surface
               reports cells and forwards pointers; the three overlays are the
               same things the flat grid draws on itself (what is selected,
               where its handle is, and the ink that has not been baked yet). */
            <BodyInk look={look} arts={bodyArts} ink={ink}
              region={mode === 'face' ? 'face' : 'tattoo'}
              apiRef={bodyApiRef} activeTarget={artId}
              onRegion={bodyRegion} onDown={down} onMove={move} onUp={up}
              overlayCells={(liveIdx >= 0 && liveIdx < painted.cells.length) ? painted.cells[liveIdx] : null}
              selCells={(sel >= 0 && sel < painted.cells.length) ? painted.cells[sel] : null}
              handleCell={selHandle} />
          ) : (
            /* v2.3.1967: a class, so a headless scenario can aim at the flat
               grid without guessing which canvas in the panel it is (the panel
               holds a worn preview and, on the body tab, the figure). */
            <canvas ref={cvRef} width={size} height={size} className="bt-paint-grid"
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
        {/* ═══ v2.3.1994: THE SAME SEVEN TOOLS, ON EVERY SCREEN ═══
            Owner: "Oh I see the shirt editor is where the more complex editor
            is.  Make the skin tattoo editor be the same as that."

            v2.3.1965 hid this row on the body, reasoning that "rect/ellipse/
            line are dragged out in cell space, and on a zoomed limb the drag
            you make with your finger is a path across skin, not a box in a
            16x16".  That is simply not true, and the surface proves it: a body
            drag resolves to a cell at both ends exactly as a grid drag does
            (BodyInk reports the cell; `cellAt` forks on the surface and
            nothing below it knows the difference), so a box dragged on the
            chest is a box.  What was actually missing was the plumbing, and
            the reasoning grew up to justify its absence — which is how the
            owner ended up with a tattoo editor that had lost the fill, the
            letters, the shapes, the hand and the layer row he had asked for on
            the shirt.  THIS is the gate that mattered; the four below are the
            same gate wearing different clothes. */}
        {!onPattern && (
          <div className="bt-paint-tools">
            {TOOLS.map((t) => (
              <button key={t.id} type="button"
                onClick={() => {
                  /* v2.3.1951: a pending shape belongs to you -- reaching for
                     another tool places it rather than binning it. */
                  if (selRef.current >= 0) placePending();
                  setTool(t.id);
                }}
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
            {selOp ? (   /* v2.3.1994: a shape picked up on the body adjusts the same way */
              /* v2.3.1951: while a shape is pending the row belongs to IT.
                 Contextual rather than three more permanent buttons: the row
                 already swaps for the letter tool, the controls only mean
                 anything while there is a shape to adjust, and appearing
                 exactly when you make one is how you find out they exist.
                 v2.3.1967: the same row serves anything you PICK UP with the
                 hand now, so the column count follows what was picked: a box
                 can be resized, a letter can only be moved, and a brush stroke
                 or a fill can only be re-layered (the row under this one) — so
                 those get one wide Done rather than a Cancel with nothing to
                 cancel. */
              <div className="bt-paint-opts-main bt-paint-shapeops"
                style={{ gridTemplateColumns: 'repeat(' + (selOp.k === 's' ? 3 : selOp.k === 't' ? 2 : 1) + ', 1fr)' }}>
                {selOp.k === 's' && (
                  <button type="button" onClick={() => setLockRatio((v) => !v)}
                    aria-pressed={lockRatio}
                    className={'bt-paint-size' + (lockRatio ? ' bt-paint-size--on' : '')}
                    title={lockRatio
                      ? 'Keeping the proportions you drew — tap to size width and height freely'
                      : 'Width and height are free — tap to keep the proportions you drew'}>
                    <span className="bt-paint-tool-label">
                      {lockRatio ? '\u2713 Keep shape' : 'Free size'}
                    </span>
                  </button>
                )}
                <button type="button" onClick={placePending}
                  className="bt-paint-size bt-paint-size--on"
                  title="Finished with this one">
                  <span className="bt-paint-tool-label">
                    {(selOp.k === 's' || selOp.k === 't') ? 'Place' : 'Done'}
                  </span>
                </button>
                {(selOp.k === 's' || selOp.k === 't') && (
                  <button type="button" onClick={cancelPending} className="bt-paint-size"
                    title={(pendRef.current && pendRef.current.isNew)
                      ? 'Throw this one away' : 'Put it back the way you found it'}>
                    <span className="bt-paint-tool-label">Cancel</span>
                  </button>
                )}
              </div>
            ) : tool === 'letter' ? (   /* v2.3.1994 (owner: "Add the letters back") */
              <div className="bt-paint-letters" ref={stripRef}>
                {LETTERS.map((ch) => (
                  <button key={ch} type="button" onClick={() => setLetter(ch)}
                    data-on={letter === ch ? '1' : undefined}
                    className={'bt-paint-letter' + (letter === ch ? ' bt-paint-letter--on' : '')}
                    aria-pressed={letter === ch} aria-label={'Letter ' + ch}>{ch}</button>
                ))}
              </div>
            ) : (
              /* v2.3.1994: one rule on both surfaces -- the width belongs to the
                 tools that draw a stroke, and ghosts for Fill, Letters and the
                 hand.  The body used to force all three live because the only
                 tool it had WAS a brush. */
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
            {/* v2.3.1994: the Mirror cell that stood here is gone (owner:
                "Swap out the mirror for 'fill'") -- Fill is a real tool in the
                row above, and a second copy of it in a fixed cell would be two
                buttons for one thing.  The row is the variable part alone now. */}
          </div>
        )}

        {/* ═══ v2.3.1967: THE LAYER ROW ═══
            Owner: "Also can you add an option to change layers?"

            ALWAYS RENDERED, not conditional on having something picked up.
            The first cut showed it only while something was selected, and that
            is a reflow in the middle of a GESTURE: a shape is selected from its
            first cell, so pointer-down would have grown the panel by a row — and
            the panel is a centred flex child, so on any viewport where it fits,
            growing it re-centres it and slides the grid out from under the
            finger that is still drawing.  This is the same rule the brush-width
            row already follows a few lines up ("the row keeps its height either
            way, so nothing below it jumps"), and this is why it is a rule.
            mp-shapelayer pins the panel's height across a selection.

            Being always-on also makes the feature findable: the controls are
            visible before you have used the hand, with a caption that says what
            to do, rather than hiding until you have already guessed.

            The readout is not decoration.  The owner reads the RESULT, not the
            code, and two overlapping shapes of the same colour can swap order
            with very little visibly happening — so the row names which layer
            the thing you are holding is on and how many there are, and that
            sentence changes on every tap.  Four steps rather than two because
            "one step back" is the move you actually want when a drawing has
            five pieces in it and only one of them is in the way.

            v2.3.1994: and on the body too.  A tattoo made of a circle with a
            letter over it has layers whether or not the panel offers to move
            them, and hiding the row on the one screen where the pieces overlap
            a curved surface was the wrong screen to hide it on. */}
        {!onPattern && (
          <div className="bt-paint-layers">
            <div className="bt-paint-layer-at">
              {selOp
                ? ('Layer ' + (sel + 1) + ' of ' + doc.ops.length + ' \u00b7 ' + selName(selOp))
                : 'Layers: pick the hand, tap something you drew'}
            </div>
            <div className="bt-paint-layer-btns">
              {LAYER_MOVES.map((m) => {
                const off = !selOp || (m.d === 'back' || m.d === -1 ? sel <= 0 : sel >= doc.ops.length - 1);
                return (
                  <button key={m.k} type="button" className="bt-paint-size" disabled={off}
                    style={off ? { opacity: 0.38, cursor: 'default' } : undefined}
                    onClick={() => moveSel(m.d)} title={m.tip}>
                    <span className="bt-paint-tool-label">{m.label}</span>
                  </button>
                );
              })}
            </div>
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
            aria-label={onPattern ? 'Remove the pattern' : ('Erase the whole ' + (isShirt ? side + ' of the shirt' : scfg.label))}
            onClick={() => {
              if (onPattern) { pickTile(''); return; }
              placePending();       /* nothing is selected on an empty grid */
              pushHist(docRef.current);
              /* v2.3.1967: Clear empties the LIST as well as the drawing.
                 Leaving the ops behind and blanking the base would put every
                 shape straight back on the next replay. */
              setDoc({ id: artId, base: emptyArt(), ops: [] });
            }}>
            {/* ── v2.3.1994: a bin, not the word "Clear" ──
                Owner: "Change clear to a trash can icon."  Drawn inline in the
                same one-viewBox stroke style as the tool icons, for the reason
                every icon in this panel is (v2.3.1946): it inherits the
                button's colour, it stays crisp at any pixel density, and an
                asset that is never fetched cannot hitch on first use.  The
                sentence it replaces has not gone anywhere — it is the title and
                the aria-label, which is where "erase the whole face tattoo"
                could always fit and a quarter of a phone's width could not.
                The pattern screen keeps its words: "No pattern" is a state to
                return to, not a thing to throw away. */}
            {onPattern ? (
              <span className="bt-cc-tab-label">No pattern</span>
            ) : (
              <svg className="bt-paint-tool-icon" viewBox="0 0 24 24" width="20" height="20"
                aria-hidden="true" focusable="false" style={{ margin: '0 auto' }}>
                <g fill="none" stroke="currentColor" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.4 6.6h15.2" />
                  <path d="M9.4 6.6V4.9a1.3 1.3 0 0 1 1.3-1.3h2.6a1.3 1.3 0 0 1 1.3 1.3v1.7" />
                  <path d="M6.4 6.6l.9 12a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5l.9-12" />
                  <path d="M10.4 10.2v6.4M13.6 10.2v6.4" />
                </g>
              </svg>
            )}
          </button>
          <button type="button" className="bt-cc-tab bt-cc-tab--on" style={{ flex: 1, minHeight: 38 }}
            onClick={() => { if (selRef.current >= 0) placePending(); onClose(); }}>
            <span className="bt-cc-tab-label">Done</span>
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
