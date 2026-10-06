/* ═══ A TAP ON THE RIGHT STICK JUMPS, LAST (v2.3.3087) ═══
 *
 * The owner: "Try moving jump as tap on right joystick but prioritize other
 * contextual uses for the tap instead of jump first if any apply"
 * (src/game/tapJump.js, BroTown.jsx rE).
 *
 * On a phone (390 x 844, 2x) in the Wheel's Brotown, the thumb on the right
 * stick's zone ([data-joyzone="R"]):
 *   1. the old button under the attack disc is not drawn ([data-jump]);
 *   2. a tap on empty ground jumps (the forwarded tap reached "empty space"),
 *      the body in the air;
 *   3. a tap with a LOCK held lets go of it and does not jump;
 *   4. a tap while the disc has a job (a monster or a resource in reach,
 *      `_rBtnPressUntil`) does not jump;
 *   5. a drag (aiming) does not jump;
 *   6. a tap on your own bro opens chat and does not jump;
 *   7. no page errors.
 * Picture: tools/qa/mp/out/tapjump-air.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const AIR_MS = 1400;   /* ?jumpms= -- a page drawing a few frames a second sees it */

/* touches on the right zone, from inside the page, at (fx, fy) of its box or at
   a client point; `move` drags that far right over `ms` before letting go */
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
  const seq0 = S._tapEmptySeq || 0, j0 = window.__btJumpBtn();
  z.dispatchEvent(mk('touchstart', x, y));
  if (o.move) {
    for (let k = 1; k <= 4; k++) {
      await new Promise((r) => setTimeout(r, o.ms / 4));
      z.dispatchEvent(mk('touchmove', x + (o.move * k) / 4, y));
    }
  }
  z.dispatchEvent(mk('touchend', x + (o.move || 0), y));
  const j1 = window.__btJumpBtn();
  const out = { ok: true, empty: (S._tapEmptySeq || 0) > seq0, jumped: j1.count > j0.count, tapJumps: j1.tapJumps - j0.tapJumps,
    air: j1.air, why: j1.why, lock: !!S.lockedTarget, chat: S._chatBySelfTap || 0 };
  if (o.busy) S._rBtnPressUntil = 0;
  S.autoAttack = false; S._aiming = false;
  return out;
}, opt);

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Hopbro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel', query: `jumpms=${AIR_MS}` });
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
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    await P.page.waitForTimeout(2500);
    const down = () => H.waitFor(P, () => window.__btJumpBtn().air, (v) => v === false, { timeout: AIR_MS + 4000, label: 'down again' }).catch(() => null);
    /* nothing locked or in reach to start with: the town is safe ground */
    await P.page.evaluate(() => { const S = window._gameState.current; S.lockedTarget = null; });

    /* ── 1. no button ── */
    const btn = await P.page.evaluate(() => ({ el: !!document.querySelector('[data-jump]'), probe: window.__btJumpBtn() }));
    rec.ok('the old jump button under the attack disc is not drawn', !btn.el && btn.probe.button === false && btn.probe.shown === false, btn);

    /* ── 2. an empty tap jumps ── */
    let spot = null, a = null;
    for (const [fx, fy] of [[0.5, 0.35], [0.7, 0.25], [0.3, 0.2], [0.8, 0.45], [0.6, 0.15]]) {
      a = await TOUCH(P, { id: 61, fx, fy });
      if (a.empty) { spot = { fx, fy }; break; }
      await P.page.waitForTimeout(300);
    }
    rec.ok(`a tap on empty ground on the right stick jumps (${JSON.stringify(spot)})`, !!spot && a.jumped && a.tapJumps === 1 && a.air, a);
    await P.page.waitForTimeout(AIR_MS / 2 - 200);
    await P.page.screenshot({ path: join(OUT, 'tapjump-air.png'), clip: { x: 95, y: 220, width: 200, height: 360 } }).catch(() => {});
    await down();
    if (!spot) return;

    /* ── 3. a lock: the tap lets go of it, no jump ── */
    await P.page.waitForTimeout(300);
    const b = await TOUCH(P, { id: 62, ...spot, lock: true });
    rec.ok('with a lock held, the same tap lets go of it and does not jump', b.empty && !b.jumped && !b.lock && b.tapJumps === 0, b);

    /* ── 4. the disc has a job ── */
    await P.page.waitForTimeout(300);
    const c = await TOUCH(P, { id: 63, ...spot, busy: true });
    rec.ok('while the disc has a job (a monster or a resource in reach), the tap does not jump', !c.jumped && c.tapJumps === 0, c);

    /* ── 5. a drag aims ── */
    await P.page.waitForTimeout(300);
    const d = await TOUCH(P, { id: 64, ...spot, move: 60, ms: 320 });
    rec.ok('a drag on the stick aims and does not jump', !d.jumped && !d.empty, d);

    /* ── 6. a tap on yourself opens chat ── */
    await P.page.waitForTimeout(300);
    const me = await P.page.evaluate(() => {
      const S = window._gameState.current, cv = document.querySelector('canvas'), rc = cv.getBoundingClientRect();
      return { x: rc.left + (S.player.x - S.camera.x) * (S._worldScaleX || 1), y: rc.top + (S.player.y - 24 - S.camera.y) * (S._worldScaleY || 1) };
    });
    const e = await TOUCH(P, { id: 65, x: me.x, y: me.y });
    rec.ok('a tap on your own bro opens chat and does not jump', !e.jumped && e.chat > 0 && !e.empty, e);

    rec.ok(`no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
