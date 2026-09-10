/* ═══ v2.3.2436: THE DESIGN GALLERY ═══
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

/* The body art's own tan (playerSkins' SKIN_CATALOG 'default' swatch), so a
   transparent cell reads as skin rather than as a hole. */
const TILE = '#cd864b';

/** One design, painted cell by cell at `px` per cell. */
function DesignSwatch({ art, px = 4 }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = TILE;
    ctx.fillRect(0, 0, cv.width, cv.height);
    for (let y = 0; y < ART_H; y++) {
      for (let x = 0; x < ART_W; x++) {
        const c = artColorAt(art, x, y);
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(x * px, y * px, px, px);
      }
    }
  }, [art, px]);
  return <canvas ref={ref} width={ART_W * px} height={ART_H * px}
    style={{ width: ART_W * px, height: ART_H * px, borderRadius: 4, display: 'block' }} />;
}

/** The gallery. `onPick(design)` applies; `onClose()` backs out changing nothing. */
export default function DesignGallery({ onPick, onClose, label = 'design' }) {
  /* 'all' first: the catalogue is small enough to scan whole, and landing on a
     filtered view would hide most of it from someone who has never seen it. */
  const [cat, setCat] = React.useState('all');
  const shown = cat === 'all' ? DESIGN_CATALOG : DESIGN_CATALOG.filter((d) => d.cat === cat);

  /* Escape closes, like the panel underneath. */
  React.useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [onClose]);

  const chip = (on) => ({
    minHeight: 30, padding: '0 10px', borderRadius: 8, cursor: 'pointer',
    whiteSpace: 'nowrap', fontSize: 12,
    background: on ? 'var(--ui-brass-soft)' : 'rgba(0,0,0,.22)',
    border: '1px solid ' + (on ? 'var(--ui-brass)' : 'rgba(229,237,233,.26)'),
    color: on ? 'var(--ui-text)' : 'var(--ui-text-secondary)',
  });

  return (
    <div className="bt-modal-scrim" role="dialog" aria-label="Ready-made designs"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(6,10,14,.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        /* above the paint panel's own scrim (60), which stays put underneath */
        zIndex: 70, padding: 12,
      }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--ui-panel,#16202a)', border: '1px solid rgba(229,237,233,.26)',
          borderRadius: 12, maxHeight: '92vh', width: 'min(96vw, 430px)',
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
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 12px 10px' }}>
          <button type="button" style={chip(cat === 'all')} onClick={() => setCat('all')}>All</button>
          {DESIGN_CATEGORIES.map((c) => (
            <button key={c.id} type="button" style={chip(cat === c.id)} onClick={() => setCat(c.id)}>
              {c.name}
            </button>
          ))}
        </div>

        <div style={{
          overflowY: 'auto', padding: '0 12px 12px', display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8,
        }}>
          {shown.map((d) => (
            <button key={d.id} type="button" title={'Put ' + d.name + ' on your ' + label}
              onClick={() => onPick(d)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: '7px 3px', borderRadius: 8, cursor: 'pointer',
                background: 'rgba(0,0,0,.22)', border: '1px solid rgba(229,237,233,.20)',
                color: 'var(--ui-text-secondary)', fontSize: 10, lineHeight: 1.15,
              }}>
              <DesignSwatch art={d.art} px={4} />
              <span style={{ textAlign: 'center' }}>{d.name}</span>
            </button>
          ))}
        </div>

        <div style={{ padding: 12, borderTop: '1px solid rgba(229,237,233,.14)' }}>
          <button type="button" className="bt-paint-copy" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export { DesignSwatch };
