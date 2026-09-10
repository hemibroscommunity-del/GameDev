/* ═══ v2.3.2444: THE DESIGN GALLERY ═══
 *
 * Owner: "Can you make some pre-done tattoo designs to choose from? ... (launch
 * its own window to choose from within the editor)".
 *
 * Its own window, so: a second scrim over the paint panel rather than a takeover
 * of the drawing surface.  The panel underneath keeps its state -- tool, colour,
 * selection, undo stack -- and closing the gallery puts you back exactly where
 * you were, which a takeover that re-mounted the surface would not.
 *
 * ── WHY THIS IS NOT A "SAVE" AND MUST NEVER READ LIKE ONE ──
 * The three design SLOTS were removed at v2.3.2416 because the owner could not
 * tell "stash this drawing" from "save what I am wearing": two promises behind
 * one word.  This screen is a third thing again -- art that ships with the game
 * -- and the whole feature dies the moment it reads as either of the other two.
 * Hence: no Save anywhere on it, nothing that writes to a slot, and the word
 * for what a tap does is APPLY.  It puts a picture on your grid; that is all.
 *
 * ── EVERY THUMBNAIL IS DRAWN, NOT SHIPPED ──
 * A thumbnail is the design's own cells painted onto a canvas from the same
 * table the character is painted from, so a swatch cannot drift from what you
 * actually get -- the reason PatternSwatch is drawn rather than shipped as art
 * (v2.3.1941), applied again.  It also means this screen loads NOTHING: there
 * is no texture here to preload and no first-use fetch to hitch on, so the
 * preloading law (CLAUDE.md) has nothing to bite.
 *
 * ── THE TILE IS SKIN-COLOURED ──
 * Transparent cells are the commonest cell in the catalogue and they are not
 * "empty", they are "your skin shows through".  On a dark panel a transparent
 * cell reads as a hole and every design looks like it has been cut out, so the
 * tile behind a thumbnail is the default body tan (SKIN_CATALOG's 'default'
 * swatch).  What you see is what lands on you.
 */

import React from 'react';
import { ART_W, ART_H, artColorAt } from '@/rendering/traits/playerArt.js';
import { DESIGN_CATALOG, DESIGN_CATEGORIES } from '@/rendering/traits/designCatalog.js';
import { SKIN_CATALOG, getSkin } from '@/rendering/playerSkins.js';

/* v2.3.2445: THE GROUND UNDER A THUMBNAIL IS THE PLAYER'S OWN SKIN.
   This said "what you see is what lands on you" while painting every tile on
   the DEFAULT tan, which for a player on the palest or darkest skin is a lie
   about the one property that decides whether a design reads at all --
   designCatalog's header calls internal contrast against skin running #f9ece2
   to #50382a the strongest predictor there is.  Browsing on someone else's
   skin is how you pick the design that vanishes on yours. */
const DEFAULT_TILE = '#cd864b';
function skinTile() {
  try {
    const e = SKIN_CATALOG.find((c) => c.id === getSkin());
    return (e && e.swatch) || DEFAULT_TILE;
  } catch (err) { return DEFAULT_TILE; }
}

/** One design, painted cell by cell at `px` per cell. */
function DesignSwatch({ art, px = 4, tile = DEFAULT_TILE }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = tile;
    ctx.fillRect(0, 0, cv.width, cv.height);
    for (let y = 0; y < ART_H; y++) {
      for (let x = 0; x < ART_W; x++) {
        const c = artColorAt(art, x, y);
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(x * px, y * px, px, px);
      }
    }
  }, [art, px, tile]);
  /* v2.3.2445: `pixelated`, like every other pixel-art canvas in this UI
     (PatternSwatch, .bt-paint-pv, .bt-cc-ink-pv, BodyInk).  The backing store
     is 1:1 with the CSS box, so on a phone at DPR 2-3 the compositor
     bilinearly upsamples it -- and the first thing a bilinear upsample smears
     is exactly the full-cell near-black outline the catalogue relies on. */
  return <canvas ref={ref} width={ART_W * px} height={ART_H * px}
    style={{ width: ART_W * px, height: ART_H * px, borderRadius: 4, display: 'block',
      imageRendering: 'pixelated' }} />;
}

/** The gallery. `onPick(design)` applies; `onClose()` backs out changing nothing. */
export default function DesignGallery({ onPick, onClose, label = 'design' }) {
  /* 'all' first: the catalogue is small enough to scan whole, and landing on a
     filtered view would hide most of it from someone who has never seen it. */
  const [cat, setCat] = React.useState('all');
  const downOnScrim = React.useRef(false);
  /* read once per open: the store does not change while this is on screen */
  const tile = React.useMemo(() => skinTile(), []);
  const shown = cat === 'all' ? DESIGN_CATALOG : DESIGN_CATALOG.filter((d) => d.cat === cat);

  /* Escape closes the gallery.  Note the panel underneath binds no Escape of
     its own, so this is the only Escape in the editor -- a second press does
     nothing, which is asymmetric but is not something to "fix" here. */
  React.useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [onClose]);

  /* v2.3.2445: 32px and a pill, which is what LANTERN-SLATE gives a chip, and
     tokens rather than literals so a theme change reaches this screen too. */
  const chip = (on) => ({
    minHeight: 32, padding: '0 12px', borderRadius: 999, cursor: 'pointer',
    whiteSpace: 'nowrap', fontSize: 12,
    background: on ? 'var(--ui-brass-soft)' : 'var(--ui-well-soft, #16262C)',
    border: '1px solid ' + (on ? 'var(--ui-brass)' : 'var(--ui-line-strong, rgba(229,237,233,.20))'),
    color: on ? 'var(--ui-text)' : 'var(--ui-text-secondary)',
  });

  return (
    <div className="bt-modal-scrim" role="dialog" aria-modal="true" aria-label="Ready-made designs"
      /* v2.3.2445: only a click that BEGAN on the scrim dismisses.  A click is
         dispatched at the nearest common ancestor of its down and up targets,
         so a drag that starts on the card and lifts over the scrim fires here
         -- and threw away the player's category and scroll position in a
         grid of tiles.  Comparing target to currentTarget is not enough on its
         own for a drag, so the press is recorded on pointerdown. */
      onPointerDown={(e) => { downOnScrim.current = e.target === e.currentTarget; }}
      onClick={(e) => { if (e.target === e.currentTarget && downOnScrim.current) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        /* v2.3.2445: the LIGHT scrim token, not another copy of the panel's own.
           Two at rgba(6,10,14,.72) composite to .92 and the character behind --
           the thing the editor exists to show -- goes effectively black. */
        background: 'var(--ui-modal-scrim, rgba(4,9,12,.38))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        /* above the paint panel's own scrim (60), which stays put underneath */
        zIndex: 70, padding: 12,
      }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--ui-panel, #1E2E34)', border: '1px solid var(--ui-line-strong, rgba(229,237,233,.20))',
          borderRadius: 14, maxHeight: '92vh', width: 'min(96vw, 430px)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(5,8,10,.45)',
        }}>

        <div style={{ padding: '12px 12px 8px', display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 15, color: 'var(--ui-text)', flex: 1 }}>Designs</h2>
          <span style={{ fontSize: 11, color: 'var(--ui-text-secondary)' }}>
            {shown.length} of {DESIGN_CATALOG.length}
          </span>
        </div>
        <div style={{ padding: '0 12px 8px', fontSize: 11, color: 'var(--ui-text-secondary)' }}>
          Tap one to put it on your {label}. It replaces what is there — one tap of Undo brings it back.
        </div>

        {/* the filter row scrolls sideways rather than wrapping: wrapping costs
            a second 30px line on a phone, and this row is already optional */}
        {/* v2.3.2445: overscroll-behavior on BOTH new scrollers.  .bt-paint got
            this at v2.3.2414 with TRAPS #64 cited by name: without it a drag
            past either end chains outward into .bt-name-modal, which on iOS 14
            still leaves a scroll container that can be shoved with no finger
            able to drag it back. */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', overscrollBehavior: 'contain',
          padding: '0 12px 10px' }}>
          <button type="button" style={chip(cat === 'all')} onClick={() => setCat('all')}>All</button>
          {DESIGN_CATEGORIES.map((c) => (
            <button key={c.id} type="button" style={chip(cat === c.id)} onClick={() => setCat(c.id)}>
              {c.name}
            </button>
          ))}
        </div>

        <div style={{
          overflowY: 'auto', overscrollBehavior: 'contain',
          padding: '0 12px 12px', display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8,
        }}>
          {shown.map((d) => (
            <button key={d.id} type="button" title={'Put ' + d.name + ' on your ' + label}
              onClick={() => onPick(d)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: '7px 3px', borderRadius: 8, cursor: 'pointer',
                background: 'var(--ui-well, #111E23)',
                border: '1px solid var(--ui-line-strong, rgba(229,237,233,.20))',
                color: 'var(--ui-text-secondary)', fontSize: 10, lineHeight: 1.15,
              }}>
              <DesignSwatch art={d.art} px={4} tile={tile} />
              <span style={{ textAlign: 'center' }}>{d.name}</span>
            </button>
          ))}
        </div>

        <div style={{ padding: 12, borderTop: '1px solid rgba(229,237,233,.14)' }}>
          <button type="button" className="bt-paint-copy" style={{ minHeight: 44 }}
            onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export { DesignSwatch };
