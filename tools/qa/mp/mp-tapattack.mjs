/* ═══ A TAP ON THE RIGHT STICK ATTACKS ONCE, LAST -- AND NEVER JUMPS (v2.3.3712) ═══
 *
 * Was mp-tapjump (v2.3.3105: "Try moving jump as tap on right joystick but
 * prioritize other contextual uses for the tap instead of jump first if any
 * apply").  The owner, 2026-10-28: "I need to figure out how to make it so
 * that the contextual jump button gives the jumps only to the jump button and
 * what to replace it with (maybe just an attack in its place if nothing else
 * is there?)" (src/game/tapJump.js requestTapAttack, BroTown.jsx rE).
 *
 * On a phone (390 x 844, 2x) in the Wheel's Brotown, facing east, the thumb
 * on the right stick's zone ([data-joyzone="R"]):
 *   1. the JUMP button under the attack disc is drawn ([data-jump]): it is
 *      the jump now;
 *   2. with the greatsword, a tap on empty ground swings it ONCE and never
 *      jumps (the forwarded tap reached "empty space"); the attack is never
 *      switched on (no held attack);
 *   3. with the staff, a tap looses ONE bolt, the way you face (east);
 *   4. with the bow, a tap at empty ground looses nothing and draws no sight
 *      line (the bow looses only at something, the owner's rule since
 *      v2.3.2473) -- and still never jumps;
 *   5. a tap with a LOCK held lets go of it and does not attack;
 *   6. a tap while the disc has a job (a monster or a resource in reach,
 *      `_rBtnPressUntil`) does not attack (the disc is the attack there);
 *   7. a drag (aiming) is the held attack, not the tap's;
 *   8. a tap on your own bro opens chat and does not attack;
 *   9. no page errors.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

/* touches on the right zone, from inside the page, at (fx, fy) of its box or at
   a client point; `move` drags that far right over `ms` before letting go.
   Sampled once a frame until `after` ms past the release. */
const TOUCH = (P, opt) => P.page.evaluate(async (o) => {
  const z = document.querySelector('[data-joyzone="R"]');
  if (!z) return { ok: false };
  const b = z.getBoundingClientRect();
  const x = o.x != null ? o.x : b.left + b.width * o.fx, y = o.y != null ? o.y : b.top + b.height * o.fy;
  const mk = (t, cx, cy) => new TouchEvent(t, { bubbles: true, cancelable: true,
    touches: t === 'touchend' ? [] : [new Touch({ identifier: o.id, target: z, clientX: cx, clientY: cy })],
    changedTouches: [new Touch({ identifier: o.id, target: z, clientX: cx, clientY: cy })] });
  const S = window._gameState.current;
  if (o.lock) {
    const m = { id: 'qa-ghost', alive: true, x: S.player.x + 4000, y: S.player.y, curHp: 10 };
    S.lockedTarget = { type: 'monster', id: m.id, ref: m, src: 'tap' };
  }
  if (o.busy) S._rBtnPressUntil = Date.now() + 5000;
  const beam = () => { try { return !!(window.__btSightBeam && window.__btSightBeam().visible); } catch (e) { return null; } };
  const seq0 = S._tapEmptySeq || 0, j0 = window.__btJumpBtn(), a0 = S._tapAttacks || 0;
  const arrows0 = (S.arrows || []).length;
  let lastSw = S.swingTimer || 0, swings = 0, aa = false, beamSeen = false, on = true;
  const samp = () => {
    if (!on) return;
    if ((S.swingTimer || 0) !== lastSw) { swings++; lastSw = S.swingTimer || 0; }
    if (S.autoAttack) aa = true;
    if (beam()) beamSeen = true;
    requestAnimationFrame(samp);
  };
  requestAnimationFrame(samp);
  z.dispatchEvent(mk('touchstart', x, y));
  if (o.move) {
    for (let k = 1; k <= 4; k++) {
      await new Promise((r) => setTimeout(r, o.ms / 4));
      z.dispatchEvent(mk('touchmove', x + (o.move * k) / 4, y));
    }
  }
  const aaHeld = !!S.autoAttack;
  z.dispatchEvent(mk('touchend', x + (o.move || 0), y));
  await new Promise((r) => setTimeout(r, o.after || 1500));
  on = false;
  const j1 = window.__btJumpBtn();
  const newArrows = (S.arrows || []).slice(arrows0).filter((a) => a && typeof a.ang === 'number');
  const t = S._tapAtk || null;
  const out = { ok: true, empty: (S._tapEmptySeq || 0) > seq0, jumped: j1.count > j0.count, tapJumps: (S._tapJumps || 0),
    asked: (S._tapAttacks || 0) - a0, how: t ? t.how : null, why: S._tapAtkWhy || null, swings, aa, aaHeld, beam: beamSeen,
    shots: newArrows.length, shotAng: newArrows.length ? +newArrows[0].ang.toFixed(2) : null, staff: newArrows.length ? !!newArrows[0].isStaff : null,
    lock: !!S.lockedTarget, chat: S._chatBySelfTap || 0, air: j1.air };
  if (o.busy) S._rBtnPressUntil = 0;
  S.autoAttack = false; S._aiming = false;
  return out;
}, opt);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Tapbro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!inW, inW);
    if (!inW) return;
    const myId = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 20 });
    const kit = await H.devOp(wsPort, 'kit', myId, { what: 'weapons' });
    rec.ok('the dev kit hands over a bow, a staff and a greatsword (guard)', !!kit && kit.ok && kit.weapons >= 3, kit);
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    await P.page.waitForTimeout(2500);
    /* nothing locked or in reach to start with: the town is safe ground */
    await P.page.evaluate(() => { const S = window._gameState.current; S.lockedTarget = null; });
    const wield = async (type, slot, active) => {
      const eq = await H.equipWeapon(P, type, slot, active);
      await P.page.waitForTimeout(1500);
      const held = await H.readState(P, (S) => ({ slot: S.rpg.activeSlot,
        w: (S.rpg.activeSlot === 'ranged' ? S.rpg.rangedWeapon : S.rpg.activeSlot === 'staff' ? S.rpg.staffWeapon : S.rpg.weapon) || null }));
      rec.ok(`the ${type} in hand (guard)`, eq.ok && held.slot === active && !!held.w && held.w.type === type, { eq, held: { slot: held.slot, type: held.w && held.w.type } });
      /* face east (a step that way) */
      await H.nudge(P, 'd', 450);
      await P.page.waitForTimeout(900);
    };

    /* ── 1. the button is the jump ── */
    const btn = await P.page.evaluate(() => ({ el: !!document.querySelector('[data-jump]'), probe: window.__btJumpBtn() }));
    rec.ok('the JUMP button under the attack disc is drawn: the jump is its now', btn.el && btn.probe.button === true && btn.probe.shown === true, btn);

    /* ── 2. the greatsword: an empty tap swings once ── */
    await wield('greatsword', 'weapon', 'melee');
    let spot = null, a = null;
    for (const [fx, fy] of [[0.5, 0.35], [0.7, 0.25], [0.3, 0.2], [0.8, 0.45], [0.6, 0.15]]) {
      a = await TOUCH(P, { id: 61, fx, fy });
      if (a.empty) { spot = { fx, fy }; break; }
      await P.page.waitForTimeout(300);
    }
    rec.ok(`greatsword: a tap on empty ground on the right stick swings it ONCE and never jumps (${JSON.stringify(spot)}: ${a && a.how}, ${a && a.swings} swing)`,
      !!spot && a.asked === 1 && a.how === 'swing' && a.swings === 1 && !a.jumped && a.tapJumps === 0 && !a.air, a);
    rec.ok('greatsword: ...a tap, not the held attack -- the attack is never switched on', !!a && !a.aa && !a.aaHeld, a);
    if (!spot) return;

    /* ── 3. the staff: one bolt, the way you face ── */
    await wield('staff', 'staffWeapon', 'staff');
    await P.page.waitForTimeout(800);
    const st = await TOUCH(P, { id: 62, ...spot });
    rec.ok(`staff: a tap looses ONE bolt, the way you face -- east (${st.shots} bolt at ${st.shotAng} rad), and never jumps`,
      st.asked === 1 && st.how === 'bolt' && st.shots === 1 && st.staff === true && Math.abs(st.shotAng) < 0.5 && !st.jumped && !st.aa, st);

    /* ── 4. the bow at empty ground: nothing, and no line ── */
    await wield('bow', 'rangedWeapon', 'ranged');
    await P.page.waitForTimeout(800);
    const bw = await TOUCH(P, { id: 63, ...spot });
    rec.ok(`bow: a tap at empty ground looses nothing (the bow looses only at something) and draws no sight line, and never jumps (${bw.how})`,
      bw.asked === 1 && bw.how === 'empty' && bw.shots === 0 && !bw.beam && !bw.jumped && !bw.aa, bw);

    /* ── 5. a lock: the tap lets go of it, no attack ── */
    await P.page.waitForTimeout(300);
    const b = await TOUCH(P, { id: 64, ...spot, lock: true });
    rec.ok('with a lock held, the same tap lets go of it and does not attack (nor jump)', b.empty && b.asked === 0 && !b.lock && !b.jumped, b);

    /* ── 6. the disc has a job ── */
    await P.page.waitForTimeout(300);
    const c = await TOUCH(P, { id: 65, ...spot, busy: true });
    rec.ok('while the disc has a job (a monster or a resource in reach), the tap does not attack (nor jump)', c.asked === 0 && !c.jumped, c);

    /* ── 7. a drag aims ── */
    await P.page.waitForTimeout(300);
    const d = await TOUCH(P, { id: 66, ...spot, move: 60, ms: 320 });
    rec.ok('a drag on the stick aims (the held attack) and is not the tap\'s attack (nor a jump)', d.asked === 0 && !d.jumped && !d.empty, d);

    /* ── 8. a tap on yourself opens chat ── */
    await P.page.waitForTimeout(300);
    const me = await P.page.evaluate(() => {
      const S = window._gameState.current, cv = document.querySelector('canvas'), rc = cv.getBoundingClientRect();
      return { x: rc.left + (S.player.x - S.camera.x) * (S._worldScaleX || 1), y: rc.top + (S.player.y - 24 - S.camera.y) * (S._worldScaleY || 1) };
    });
    const e = await TOUCH(P, { id: 67, x: me.x, y: me.y });
    rec.ok('a tap on your own bro opens chat and does not attack (nor jump)', e.asked === 0 && !e.jumped && e.chat > 0 && !e.empty, e);

    rec.ok(`no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
