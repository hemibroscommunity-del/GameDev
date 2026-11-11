/* ═══ v2.3.4803: THE STAFF'S FEEL -- its pictures (a drawer of the feel kit) ═══
 *
 * The owner's approved brief (docs/specs/staff-feel.md): "Thumb down starts
 * gathering: a spark at the staff's tip ... The orb grows in three clear
 * stages, spark -> orb -> sphere, each landing with a pulse ... Drag while
 * gathering to aim: the orb leans toward where it will go.  Lift to blast:
 * ... a big orb pushes the bro back a step".
 *
 * A DRAWER of the weapon feel kit (weaponFeelFx.js registerFeelDrawer: its
 * own small world layer, so nothing here rebuilds a big layer's draw list,
 * TRAPS §218), called once a frame after everything that moves the body:
 *   - THE ORB at the staff's crystal (where entityRenderer published it,
 *     S._staffTipX/Y), stepped by the gather's STAGE -- a spark, an orb, a
 *     sphere -- so each stage reads as a clear size, swelling past it for a
 *     moment as it lands (the pulse; the ring itself is the kit's 'pulse'
 *     queued by game/staffFeel.js), leaning toward the aim.  The crystal's
 *     own light and the specks pulled inward are staffCastFx.js's charge,
 *     fed the gather (staffCharge).  In the element's colours.
 *   - THE PUSH BACK A STEP on an orb's or a sphere's blast: the bro's figure
 *     drawn back along the shot for RECOIL_MS -- A LOOK ONLY.  His place
 *     (S.player) is never written (TRAPS §231): the figure's position is put
 *     back the next frame wherever nothing has written it since (jumpFx.js's
 *     rule), and not while he jumps (jumpFx shapes the figure then).
 * Placeholders: the kit's minted soft dot, tinted (nothing fetched, nothing
 * to preload).  The owner's own art could replace the orb by stage
 * (docs/specs/staff-feel.md "Art").
 *
 * QA: window.__btStaffFeelFx() -- what was drawn. */
import { STAFF_FEEL } from '../../game/staffFeel.js';
import { rampFor } from '../staffCastFx.js';

const _st = { orbDrawn: 0, lastOrb: null, recoilDrawn: 0, lastRecoil: null };

function recoilLook(S, er, now) {
  const d = er && er.playerDisplay;
  if (!d || d.destroyed) return;
  /* last frame's push, put back where nothing has written the figure since */
  const r = d._stfRec;
  if (r) {
    d._stfRec = null;
    if (d.x === r.xw) d.x = r.x0;
    if (d.y === r.yw) d.y = r.y0;
  }
  const rc = S && S._stf && S._stf.recoil;
  if (!rc || d._jfx || !d.visible) return;
  const t = (now - rc.at) / STAFF_FEEL.RECOIL_MS;
  if (!(t >= 0 && t < 1)) return;
  /* back fast (the first quarter), then eased home */
  const u = (t - 0.25) / 0.75;
  const k = t < 0.25 ? t / 0.25 : 1 - u * u * (3 - 2 * u);
  const off = rc.px * Math.max(0, Math.min(1, k));
  const x0 = d.x, y0 = d.y;
  d.x = x0 - Math.cos(rc.ang) * off;
  d.y = y0 - Math.sin(rc.ang) * off * 0.6;   /* the ground is foreshortened */
  d._stfRec = { x0, y0, xw: d.x, yw: d.y };
  _st.recoilDrawn++;
  _st.lastRecoil = { at: now, off: +off.toFixed(2), px: rc.px };
}

/** The kit's drawer: fn(fx, S, entityRenderer, now). */
export function staffFeelDraw(fx, S, er, now) {
  recoilLook(S, er, now);
  const f = S && S._stf, v = f && f.view;
  if (!v || !v.gathering || v.stage < 0) return;
  if (!(S._staffTipAt && now - S._staffTipAt < 250) || !isFinite(S._staffTipX)) return;
  const sg = Math.max(0, Math.min(2, v.stage));
  const R = S.rpg;
  const ramp = rampFor((R && R.staffWeapon && R.staffWeapon.element1) || null);
  /* the stage's landing: a moment past its size */
  const pt = v.popStage === sg ? (now - v.popAt) / 160 : 1;
  const pop = pt >= 0 && pt < 1 ? 1 + 0.45 * (1 - pt) : 1;
  const breathe = 1 + 0.07 * Math.sin(now / 70);
  const rad = STAFF_FEEL.ORB_PX[sg] * pop * breathe;
  const lean = STAFF_FEEL.LEAN_PX[sg];
  const a = typeof v.aim === 'number' && isFinite(v.aim) ? v.aim : 0;
  const x = S._staffTipX + Math.cos(a) * lean, y = S._staffTipY + Math.sin(a) * lean;
  const dim = S._staffTipBehind ? 0.35 : 1;
  if (sg === 2) fx.glow('staff:halo', x, y, rad * 5.2, 0.3 * dim, ramp[2]);
  fx.glow('staff:orb', x, y, rad * 3, 0.8 * dim, ramp[1]);
  fx.glow('staff:core', x, y, rad * 1.3, 0.95 * dim, 0xffffff);
  _st.orbDrawn++;
  _st.lastOrb = { at: now, stage: sg, r: +rad.toFixed(2), x: +x.toFixed(1), y: +y.toFixed(1), lean };
}

if (typeof window !== 'undefined') {
  window.__btStaffFeelFx = () => ({ orbDrawn: _st.orbDrawn, lastOrb: _st.lastOrb ? Object.assign({}, _st.lastOrb) : null,
    recoilDrawn: _st.recoilDrawn, lastRecoil: _st.lastRecoil ? Object.assign({}, _st.lastRecoil) : null });
}
