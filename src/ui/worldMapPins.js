/* ═══ v2.3.3987: THE TWO PINS ON THE WORLD MAP, AND A LINE TO EACH ═══
 *
 * The owner: "Add a line path when you drop pins on your minimap" -- and the
 * World map draws the same: from you to each pin (game/pinSlots.js, blue and
 * red), a DASHED line in the pin's colour, cased dark so it reads on every
 * land (the minimap's are solid: wheelMinimap.js).  Then the pin itself, the
 * board's pin shape (v2.3.3766), at every zoom; off the screen at its edge on
 * the line from the middle, smaller -- the way to go.  The line runs to where
 * the pin is drawn, the edge mark when it is off the screen.  Drawn over the
 * quest's gold road and star: they are where you chose to go.
 *
 * And while the map asks "Replace which pin?" (ui/PinCards.jsx), a white
 * ghost pin where you tapped (`ghost`), so the card says what it is about.
 *
 * The map's own canvas (2D), redrawn on its 120 ms beat: nothing to keep
 * between frames.  Returns the pins drawn, for the map's probe and its tap
 * (a tap on a pin's head lifts it: WorldMapOverlay.jsx onUp). */
import { PIN_SLOTS, PIN_CSS, pinOf, pinPlace, mapPinsOn } from '../game/pinSlots.js';
import { boardPlaceAt } from '../game/mapPinPlaces.js';

const HALO = 'rgba(11,22,27,0.92)';
/* the dash, CSS px, and the line's width and its casing's */
const DASH = [10, 7], LINE_W = 3, CASE_W = 6;
/* the line starts clear of your arrow, and is not drawn when the pin is this close */
const FROM_PX = 12, MIN_PX = 16;

/* the board's pin shape: its point at (x, y), its head 16 * sc above */
function pinShape(g, x, y, sc, fill, dot) {
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x - 7 * sc, y - 13 * sc);
  g.arc(x, y - 16 * sc, 8 * sc, Math.PI * 0.82, Math.PI * 0.18, false);
  g.closePath();
  g.fillStyle = fill; g.fill();
  g.lineWidth = 1.8; g.strokeStyle = HALO; g.stroke();
  g.beginPath(); g.arc(x, y - 16 * sc, 3.2 * sc, 0, Math.PI * 2); g.fillStyle = dot; g.fill();
}

/** Draw the pins and their lines.  `X`, `Y` game px to the canvas's CSS px;
 *  `P` you; `ghost` the place a "Replace which pin?" is about, or null. */
export function drawMapPins(g, S, X, Y, w, h, P, ghost) {
  const out = [];
  if (!S) return out;
  const on = mapPinsOn();
  const resolve = (id) => boardPlaceAt(S, id);
  const m = 20;
  for (const k of PIN_SLOTS) {
    const pin = pinOf(S, k);
    if (!pin) continue;
    /* ?mappin=0: the board's pins only, as before v2.3.3987 */
    if (!on && !pin.id) continue;
    const at = pinPlace(S, k, resolve);
    if (!at) continue;
    let x = X(at.x), y = Y(at.y), edge = false;
    if (x < m || y < m + 22 || x > w - m || y > h - m) {
      const cx = w / 2, cy = h / 2, dx = x - cx, dy = y - cy;
      let t = 1;
      if (dx > 0) t = Math.min(t, (w - m - cx) / dx); else if (dx < 0) t = Math.min(t, (m - cx) / dx);
      if (dy > 0) t = Math.min(t, (h - m - cy) / dy); else if (dy < 0) t = Math.min(t, (m + 22 - cy) / dy);
      x = cx + dx * t; y = cy + dy * t; edge = true;
    }
    /* the line, you to the pin as drawn */
    let line = null;
    if (on && P) {
      const px = X(P.x), py = Y(P.y), dx = x - px, dy = y - py, L = Math.hypot(dx, dy);
      if (L > MIN_PX) {
        const x0 = px + (dx / L) * FROM_PX, y0 = py + (dy / L) * FROM_PX;
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x, y);
        g.lineCap = 'round';
        g.setLineDash([]);
        g.lineWidth = CASE_W; g.strokeStyle = 'rgba(11,22,27,0.5)'; g.stroke();
        g.setLineDash(DASH);
        g.lineWidth = LINE_W; g.strokeStyle = PIN_CSS[k]; g.stroke();
        g.setLineDash([]);
        line = { x0: Math.round(x0), y0: Math.round(y0), x1: Math.round(x), y1: Math.round(y), dashed: true };
      }
    }
    out.push({ color: k, id: pin.id, at: { x: Math.round(at.x), y: Math.round(at.y) }, edge, x: Math.round(x), y: Math.round(y), line, asked: pin.asked });
  }
  /* the pins over every line (a line never crosses the other's head) */
  for (const p of out) pinShape(g, p.x, p.y, p.edge ? 0.9 : 1.4, PIN_CSS[p.color], '#FFFFFF');
  if (ghost && Number.isFinite(ghost.x) && Number.isFinite(ghost.y)) {
    const gx = X(ghost.x), gy = Y(ghost.y);
    g.globalAlpha = 0.85;
    pinShape(g, gx, gy, 1.4, '#F4F0E7', '#0B161B');
    g.globalAlpha = 1;
  }
  return out;
}
