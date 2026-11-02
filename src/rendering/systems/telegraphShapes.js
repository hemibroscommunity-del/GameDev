/* ═══ v2.3.3946: THE MOVES' WARNINGS, DRAWN (a lane, a fan, two rings) ═══
 * (spec: docs/specs/monster-moves.md)
 *
 * effectsRenderer.js draws every kit's warning as a ring that fills as the
 * wind-up runs (v2.3.1730: when it is solid, the hit lands).  A move of the
 * tiers past the first (server/src/monstermoves.js) may warn in another
 * shape; the telegraph's entry carries it as `geo` (src/game/monsterMoves.js
 * moveGeometry) and is drawn here, in the same Graphics, the same colour and
 * the same filling, so it reads as the same language:
 *
 *   line    a charge's lane: a band from the monster through you and on,
 *           with an arrowhead at its end -- step off its side
 *   fan     a volley: a faint line to each ball's landing spot and a ring
 *           where each lands -- stand between them, or further off
 *   rings   a two-step slam: the small ring and the big one round it
 *   follow  a combo's ring, round the monster wherever it is (a player's
 *           blows cannot shove it while it winds up, but a gust can)
 *
 * Exactly what the worker tests: the lane's width, each ball's ring and each
 * slam's radius are its numbers (a warning that lied about its size would be
 * worse than none).  Returns true when it drew the entry. */
export function drawTelegraphShape(gfx, tz, age, col, S) {
  const g = tz && tz.geo;
  if (!g) return false;
  const fillA = 0.10 + age * 0.22, lineA = 0.45 + age * 0.45;
  if (g.shape === 'line') {
    const dx = g.bx - tz.x, dy = g.by - tz.y, L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L * g.w, ny = dx / L * g.w;
    gfx.poly([tz.x + nx, tz.y + ny, g.bx + nx, g.by + ny, g.bx - nx, g.by - ny, tz.x - nx, tz.y - ny]);
    gfx.fill({ color: col, alpha: fillA });
    gfx.poly([tz.x + nx, tz.y + ny, g.bx + nx, g.by + ny, g.bx - nx, g.by - ny, tz.x - nx, tz.y - ny]);
    gfx.stroke({ color: col, width: 2, alpha: lineA });
    /* the arrowhead: which way it runs */
    const ux = dx / L, uy = dy / L, hx = g.bx - ux * g.w * 1.4, hy = g.by - uy * g.w * 1.4;
    gfx.poly([g.bx, g.by, hx + nx * 0.8, hy + ny * 0.8, hx - nx * 0.8, hy - ny * 0.8]);
    gfx.fill({ color: col, alpha: lineA });
    return true;
  }
  if (g.shape === 'fan') {
    for (let i = 0; i < g.n; i++) {
      const a = g.ang + (g.n > 1 ? (i / (g.n - 1) - 0.5) * g.span : 0);
      const ex = tz.x + Math.cos(a) * g.len, ey = tz.y + Math.sin(a) * g.len;
      gfx.moveTo(tz.x, tz.y);
      gfx.lineTo(ex, ey);
      gfx.stroke({ color: col, width: 2, alpha: lineA * 0.5 });
      gfx.circle(ex, ey, g.br);
      gfx.fill({ color: col, alpha: fillA });
      gfx.circle(ex, ey, g.br);
      gfx.stroke({ color: col, width: 2, alpha: lineA });
    }
    return true;
  }
  if (g.shape === 'rings') {
    const R = tz.r || 150;
    gfx.circle(tz.x, tz.y, R);
    gfx.fill({ color: col, alpha: fillA * 0.6 });
    gfx.circle(tz.x, tz.y, R);
    gfx.stroke({ color: col, width: 2, alpha: lineA });
    gfx.circle(tz.x, tz.y, g.r0);
    gfx.fill({ color: col, alpha: fillA });
    gfx.circle(tz.x, tz.y, g.r0);
    gfx.stroke({ color: col, width: 2, alpha: lineA });
    return true;
  }
  if (g.shape === 'follow') {
    /* round the monster where it is drawn now (its last place if gone) */
    let x = tz.x, y = tz.y;
    const list = (S && S.monsters) || [];
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      if (m && m.id === g.mid) {
        x = typeof m.renderX === 'number' ? m.renderX : m.x;
        y = typeof m.renderY === 'number' ? m.renderY : m.y;
        tz.x = x; tz.y = y;
        break;
      }
    }
    const R = tz.r || 100;
    gfx.circle(x, y, R);
    gfx.fill({ color: col, alpha: fillA });
    gfx.circle(x, y, R);
    gfx.stroke({ color: col, width: 2, alpha: lineA });
    return true;
  }
  return false;
}
