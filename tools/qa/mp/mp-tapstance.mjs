/* ═══ A TAP-JUMP SHOWS NOTHING OF THE ATTACK (v2.3.3145) ═══
 *
 * The owner: "When you tap jump with bow equipped it shows you and your line
 * of sight facing southward for a brief instant.  Fix.  Same for staff and
 * sword."
 *
 * A press on the right stick with nothing to fight switched the attack on at
 * once (S.autoAttack) while it waited to see whether it was a tap, so for the
 * length of the tap the body turned to whatever aim was left over (a monster
 * killed earlier, an old drag of the stick), the bow drew its sight line and
 * the sword its swing preview -- and a thumb that rolled 9 px on the tap
 * (the aim's dead zone is 8, a tap's 10) aimed the way it rolled, for good.
 * Now such a press is PENDING until it turns out to be a hold or a drag
 * (game/tapJump.js settleTapPress).
 *
 * On a phone (390 x 844, 2x) in the Wheel's Brotown, facing east, with an old
 * aim left pointing SOUTH (as a monster killed below you, or a drag, leaves
 * it), for the bow, the staff and the greatsword:
 *   1. a tap on the right stick jumps, and through the whole press the body
 *      faces east, the attack is never on, and no sight line or swing preview
 *      is drawn;
 *   2. the old aim is left as it was (the tap is not an aim);
 * and with the bow:
 *   3. a thumb that rolls 9 px down on its tap still jumps and aims nothing;
 *   4. a press held past the tap's window IS the attack (the sight line
 *      drawn), and its release does not jump;
 *   5. a tap mid-sprint jumps and the sprint runs on (an attack ends a sprint);
 *   6. no page errors.
 * ?tapms=2500 stretches the tap's window (tapJump.js tapJumpMaxMs): this box
 * draws a frame every few hundred ms, and the press must be a tap however
 * slowly the page gets round to its release.
 * Picture: tools/qa/mp/out/tapstance-press.png, the bow's tap with the thumb
 * still down (on main: turned south, the sight line drawn).
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const TAP_MS = 2500;
const AIR_MS = 1400;
const SOUTHISH = new Set(['south', 'southeast', 'southwest']);

/* One press on the right zone at (fx, fy) of its box, held `hold` ms, the
   thumb rolled `roll` px down halfway through, sampled once a frame from
   before the press to `after` ms past the release. */
const PRESS = (P, o) => P.page.evaluate(async (o) => {
  const z = document.querySelector('[data-joyzone="R"]');
  if (!z) return { ok: false };
  const b = z.getBoundingClientRect();
  const x = b.left + b.width * o.fx, y = b.top + b.height * o.fy;
  const mk = (t, cx, cy) => new TouchEvent(t, { bubbles: true, cancelable: true,
    touches: t === 'touchend' ? [] : [new Touch({ identifier: o.id, target: z, clientX: cx, clientY: cy })],
    changedTouches: [new Touch({ identifier: o.id, target: z, clientX: cx, clientY: cy })] });
  const S = window._gameState.current;
  const beam = () => { try { return !!(window.__btSightBeam && window.__btSightBeam().visible); } catch (e) { return null; } };
  const frames = [];
  let phase = 'before', on = true;
  const samp = () => {
    if (!on) return;
    frames.push({ phase, aa: !!S.autoAttack, pend: !!S._atkPending, f: S._renderFacing || null, beam: beam(),
      sw: !!S.isSwinging, air: !!(S._jump), spr: !!(S._sprint && S._sprint.on) });
    requestAnimationFrame(samp);
  };
  requestAnimationFrame(samp);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(120);
  const j0 = S._tapJumps || 0;
  phase = 'press';
  z.dispatchEvent(mk('touchstart', x, y));
  let ry = y;
  if (o.roll) {
    await wait(o.hold / 2);
    ry = y + o.roll;
    z.dispatchEvent(mk('touchmove', x, ry));
    await wait(o.hold / 2);
  } else {
    await wait(o.hold);
  }
  const atRelease = { aa: !!S.autoAttack, beam: beam(), f: S._renderFacing || null };
  z.dispatchEvent(mk('touchend', x, ry));
  phase = 'after';
  const jumped = (S._tapJumps || 0) > j0;
  await wait(o.after || 500);
  on = false;
  const press = frames.filter((r) => r.phase === 'press');
  return { ok: true, jumped, atRelease, frames: frames.length, press: press.length,
    faced: [...new Set(press.map((r) => r.f))], attack: press.some((r) => r.aa), beam: press.some((r) => r.beam),
    swung: frames.some((r) => r.sw), pending: press.some((r) => r.pend),
    sprintAll: frames.every((r) => r.spr), sprintWhy: S._sprint ? S._sprint.why : null,
    aim: S._aimAngle == null ? null : +S._aimAngle.toFixed(3), last: S._lastAimAngle == null ? null : +S._lastAimAngle.toFixed(3),
    aiming: !!S._aiming, why: S._jumpWhy || null };
}, o);

/* the stale aim a fight leaves: a monster killed below you (its lock's aim,
   monsterCombat) and a drag the same way (rJoyAim) */
const seedAim = (P, ang, src) => P.page.evaluate(({ ang, src }) => {
  const S = window._gameState.current;
  S.lockedTarget = null;
  S._aimAngle = ang; S._aimSrc = src; S._lastAimAngle = ang; S._aiming = false;
  return { aim: S._aimAngle, last: S._lastAimAngle };
}, { ang, src });

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Leapbro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel',
    query: `jumpms=${AIR_MS}&tapms=${TAP_MS}` });
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
    const down = () => H.waitFor(P, (S) => !!S._jump, (v) => v === false, { timeout: AIR_MS + 4000, label: 'down again' }).catch(() => null);

    /* an empty spot on the right stick: one a tap reaches "empty space" from
       (mp-tapjump's search) */
    let spot = null;
    for (const [fx, fy] of [[0.5, 0.35], [0.7, 0.25], [0.3, 0.2], [0.8, 0.45], [0.6, 0.15]]) {
      const a = await PRESS(P, { id: 80, fx, fy, hold: 60, after: 200 });
      await down();
      if (a.jumped) { spot = { fx, fy }; break; }
      await P.page.waitForTimeout(300);
    }
    rec.ok(`an empty spot on the right stick, where a tap jumps (${JSON.stringify(spot)}) (guard)`, !!spot, spot);
    if (!spot) return;

    /* ── 1-2. bow, staff and greatsword: a tap jumps and shows nothing of the attack ── */
    let id = 90;
    for (const [type, slot, active] of [['bow', 'rangedWeapon', 'ranged'], ['staff', 'staffWeapon', 'staff'], ['greatsword', 'weapon', 'melee']]) {
      const eq = await H.equipWeapon(P, type, slot, active);
      await P.page.waitForTimeout(1500);
      const held = await H.readState(P, (S) => ({ slot: S.rpg.activeSlot,
        w: (S.rpg.activeSlot === 'ranged' ? S.rpg.rangedWeapon : S.rpg.activeSlot === 'staff' ? S.rpg.staffWeapon : S.rpg.weapon) || null }));
      rec.ok(`the ${type} in hand (guard)`, eq.ok && held.slot === active && !!held.w && held.w.type === type, { eq, held: { slot: held.slot, type: held.w && held.w.type } });
      /* face east (a step that way), then leave an old aim pointing south */
      await H.nudge(P, 'd', 450);
      await P.page.waitForTimeout(900);
      const seeded = await seedAim(P, Math.PI / 2, 'lock');
      const face0 = await H.readState(P, (S) => S._renderFacing);
      const r = await PRESS(P, { id: id++, ...spot, hold: 300, after: 600 });
      await down();
      rec.ok(`${type}: a tap on the right stick jumps (guard: facing ${face0}, an old aim south ${JSON.stringify(seeded)})`, r.jumped && face0 === 'east', { face0, r: { jumped: r.jumped, why: r.why } });
      rec.ok(`${type}: through the press the body faces east -- never south -- and the attack is never on (${r.press} frames: ${r.faced.join(',')})`,
        r.press > 0 && r.faced.every((f) => f === 'east') && !r.faced.some((f) => SOUTHISH.has(f)) && !r.attack && !r.atRelease.aa && r.pending, r);
      rec.ok(`${type}: no sight line or swing preview is drawn, and nothing swings`, r.beam === false && r.atRelease.beam === false && !r.swung, r);
      rec.ok(`${type}: the old aim is left as it was (the tap aimed nothing)`, r.aim === 1.571 && r.last === 1.571 && !r.aiming, { aim: r.aim, last: r.last, aiming: r.aiming });
      await P.page.waitForTimeout(400);
    }

    /* ── a picture with the thumb still down: the bow's tap, mid-press ── */
    await H.equipWeapon(P, 'bow', 'rangedWeapon', 'ranged');
    await P.page.waitForTimeout(1200);
    await H.nudge(P, 'd', 400);
    await P.page.waitForTimeout(800);
    {
      const OUT = join(H.REPO, 'tools/qa/mp/out');
      mkdirSync(OUT, { recursive: true });
      await seedAim(P, Math.PI / 2, 'lock');
      const touch = (type) => P.page.evaluate(({ type, sp }) => {
        const z = document.querySelector('[data-joyzone="R"]'), b = z.getBoundingClientRect();
        const x = b.left + b.width * sp.fx, y = b.top + b.height * sp.fy;
        const t = new Touch({ identifier: 97, target: z, clientX: x, clientY: y });
        z.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === 'touchend' ? [] : [t], changedTouches: [t] }));
        const S = window._gameState.current, cv = document.querySelector('canvas').getBoundingClientRect();
        return { at: Date.now(), aa: !!S.autoAttack, f: S._renderFacing,
          bx: cv.left + (S.player.x - S.camera.x) * (S._worldScaleX || 1), by: cv.top + (S.player.y - S.camera.y) * (S._worldScaleY || 1) };
      }, { type, sp: spot });
      const t0 = await touch('touchstart');
      await P.page.waitForTimeout(500);
      const mid = await H.readState(P, (S) => ({ aa: !!S.autoAttack, f: S._renderFacing, pend: !!S._atkPending }));
      const W = 360, Hh = 360;
      await P.page.screenshot({ path: join(OUT, 'tapstance-press.png'),
        clip: { x: Math.max(0, Math.min(PHONE.width - W, Math.round(t0.bx - W / 2))), y: Math.max(0, Math.round(t0.by - 200)), width: W, height: Hh } }).catch(() => {});
      const t1 = await touch('touchend');
      await down();
      console.log(`    picture mid-press (${t1.at - t0.at} ms of a ${TAP_MS} ms window): ${JSON.stringify(mid)}`);
      await P.page.waitForTimeout(400);
    }

    /* ── 3. a rolled thumb: 9 px down on the tap ── */
    await seedAim(P, 0, 'stick');
    const roll = await PRESS(P, { id: id++, ...spot, hold: 300, roll: 9, after: 600 });
    await down();
    rec.ok(`a thumb that rolls 9 px down on its tap still jumps, and aims nothing -- not south (aim ${roll.aim}, last ${roll.last}, ${roll.faced.join(',')})`,
      roll.jumped && roll.aim === 0 && roll.last === 0 && !roll.aiming && !roll.attack && roll.faced.every((f) => f === 'east'), roll);

    /* ── 4. a hold IS the attack ── */
    await P.page.waitForTimeout(400);
    const hold = await PRESS(P, { id: id++, ...spot, hold: TAP_MS + 900, after: 400 });
    rec.ok('a press held past the tap\'s window is the attack -- on, the bow\'s sight line drawn -- and its release does not jump',
      hold.atRelease.aa === true && hold.atRelease.beam === true && !hold.jumped, { atRelease: hold.atRelease, jumped: hold.jumped, pending: hold.pending });
    await P.page.waitForTimeout(600);

    /* ── 5. a tap mid-sprint ── */
    const spr = await H.readState(P, (S) => !!(S._serverCaps && S._serverCaps.sprint));
    if (!spr) {
      rec.skip('a tap mid-sprint jumps and the sprint runs on', 'the worker does not advertise caps.sprint');
    } else {
      await P.page.keyboard.down('Shift');
      await P.page.keyboard.down('a');
      const on = await H.waitFor(P, (S) => !!(S._sprint && S._sprint.on && S._sprint.ran), (v) => v, { timeout: 6000, label: 'sprinting' }).catch(() => false);
      const run = await PRESS(P, { id: id++, ...spot, hold: 300, after: 500 });
      await P.page.keyboard.up('a');
      await P.page.keyboard.up('Shift');
      await down();
      rec.ok('a tap mid-sprint jumps, and the sprint runs on through the press (an attack would end it)',
        on && run.jumped && run.sprintAll && !run.attack, { on, jumped: run.jumped, sprintAll: run.sprintAll, why: run.sprintWhy, attack: run.attack });
    }

    rec.ok(`no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
