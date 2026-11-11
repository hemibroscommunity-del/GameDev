/* ═══ v2.3.4802: THE BOW'S DRAWER -- the string's bend and the aim line ═══
 *
 * The owner's brief (docs/specs/bow-feel.md): drawing, "the bow visibly
 * bends ... a faint aim line grows forward, wide and loose at first",
 * narrowing as the draw fills; settled, "the line narrows and goes crisp
 * gold"; held too long, "the line trembles".  Readiness is shown ON THE
 * WEAPON, never a gauge.
 *
 * A drawer of the weapon feel kit (weaponFeelFx.js registers it): it draws in
 * the kit's own small world layer with the kit's minted soft pictures, by key,
 * each frame -- a key not drawn is hidden -- so nothing here touches a big
 * layer's draw list (TRAPS §218) and nothing is fetched.  It reads what
 * game/bowFeel.js wrote (S._bf.view, game/bowDraw.js's view of the draw) and
 * the bow's own sight (S._bowSight: monsterCombat's, the line the shot will
 * take, cut at what it meets).
 *
 *   the STRING: a V from the bow's two tips to the nock, pulled back behind
 *     the grip by the draw (bowStringPx) -- a placeholder over the stand-in's
 *     own drawn frame (the owner's art could replace it: a bow-bend strip);
 *   the AIM LINE from the grip: two faint lines spread apart at the first
 *     pull, reaching LINE_MIN of the way, closing to one as the draw fills
 *     (bowLineLook); settled, one crisp gold line to the end of the sight; tired,
 *     trembling and fading back from gold. */
import { bowLineLook, bowStringPx } from '../../game/bowDraw.js';
import { bowFeelOn } from '../../game/bowFeel.js';
import { rangedAimAngle } from '../../game/combatHelpers.js';

const LIMB_PX = 15;      /* a tip's distance from the grip across the shot, px (the stand-in's bow, near enough) */
const PALE = [0xdf, 0xe8, 0xff];
const GOLD = [0xff, 0xd4, 0x4a];
let _last = null;        /* what was drawn last (QA) */
let _drawn = 0;

function mix(a, b, t) {
  const k = t <= 0 ? 0 : t >= 1 ? 1 : t;
  return (Math.round(a[0] + (b[0] - a[0]) * k) << 16) | (Math.round(a[1] + (b[1] - a[1]) * k) << 8) | Math.round(a[2] + (b[2] - a[2]) * k);
}

/** The drawer: fn(fx, S, entityRenderer, now) (weaponFeelFx.js). */
export function bowFeelDrawer(fx, S, er, now) {
  const v = S && S._bf && S._bf.view;
  if (!v || !S.player || !S.rpg || S.rpg.activeSlot !== 'ranged' || !bowFeelOn(S)) return;
  const P = S.player;
  const gdx = S._bowGripDX, gdy = S._bowGripDY;
  const gx = (typeof gdx === 'number' && isFinite(gdx)) ? P.x + gdx : P.x;
  const gy = (typeof gdy === 'number' && isFinite(gdy)) ? P.y + gdy : P.y;
  const ang = rangedAimAngle(S, gx, gy).ang;
  if (typeof ang !== 'number' || !isFinite(ang)) return;
  const c = Math.cos(ang), s = Math.sin(ang);
  /* ── the string, pulled back ── */
  const bend = bowStringPx(v);
  const nx = gx - c * bend, ny = gy - s * bend;
  const back = bend * 0.3;   /* a bent bow's tips come back toward the archer */
  const ax = gx - s * LIMB_PX - c * back, ay = gy + c * LIMB_PX - s * back;
  const bx = gx + s * LIMB_PX - c * back, by = gy - c * LIMB_PX - s * back;
  const strA = v.phase === 'tired' ? 0.6 : 0.8;
  fx.line('bow:strA', ax, ay, nx, ny, 1.8, strA, 0xf4ecd8);
  fx.line('bow:strB', bx, by, nx, ny, 1.8, strA, 0xf4ecd8);
  fx.glow('bow:nock', nx, ny, v.phase === 'full' ? 9 : 6, v.phase === 'full' ? 0.9 : 0.6, v.phase === 'full' ? 0xffe28a : 0xffffff);
  /* ── the aim line ── */
  const look = bowLineLook(v);
  let line = null;
  if (look) {
    const sight = S._bowSight;
    let reach = (sight && typeof sight.reach === 'number' && isFinite(sight.reach)) ? sight.reach : 320;
    if (sight && typeof sight.d === 'number' && isFinite(sight.d)) reach = Math.max(24, Math.min(reach, sight.d));
    const len = Math.max(16, reach * look.len);
    const ox = gx + c * 8, oy = gy + s * 8;
    const col = mix(PALE, GOLD, look.gold);
    /* the tired arm: the far end wanders across the line, two beats at once */
    const tw = look.tremble ? look.tremble * (Math.sin(now / 29) + 0.6 * Math.sin(now / 13)) : 0;
    if (look.spread > 0.03) {
      const half = look.spread / 2;
      for (let i = 0; i < 2; i++) {
        const a = ang + (i ? half : -half);
        fx.line(i ? 'bow:aimB' : 'bow:aimA', ox, oy, ox + Math.cos(a) * len - s * tw, oy + Math.sin(a) * len + c * tw, look.thick, look.alpha, col);
      }
    } else {
      fx.line('bow:aim', ox, oy, ox + c * len - s * tw, oy + s * len + c * tw, look.thick, look.alpha, col);
    }
    line = { len: +len.toFixed(1), spread: +look.spread.toFixed(3), thick: look.thick, alpha: +look.alpha.toFixed(3), gold: +look.gold.toFixed(2), tremble: +look.tremble.toFixed(2), color: col, lines: look.spread > 0.03 ? 2 : 1 };
  }
  _drawn++;
  _last = { at: now, phase: v.phase, r: +v.r.toFixed(3), bend: +bend.toFixed(2), ang: +ang.toFixed(3), line };
}

/* QA: what the bow's drawer drew last */
if (typeof window !== 'undefined') {
  window.__btBowFeelFx = () => ({ drawn: _drawn, last: _last ? Object.assign({}, _last, { line: _last.line ? Object.assign({}, _last.line) : null }) : null });
}
