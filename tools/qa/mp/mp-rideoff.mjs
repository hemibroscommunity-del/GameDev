/* ═══ v2.3.3891: THE LEGS AFTER THE SKATEBOARD ═══
 *
 * The owner, 2026-10-29, on their iPhone: the legs flicker -- "maybe only one
 * frame is drawn and the rest is transparent" -- jogging north, north-west,
 * west and south-west, and "It's triggered after getting off the skateboard."
 * Mobile only (the look palette), plain clothes.
 *
 * A phone (touch, 390x844, the look palette on; BT_RO_QUERY overrides).  The
 * bro jogs each facing; on a few frames of each, the lower half of his
 * figure is photographed with the body drawn and with it held back for one
 * frame (the screen's own frames only): the legs' pixels.  Then he gets on
 * the board, rides every way with its pushes, gets off, and jogs every facing
 * again.  After the ride every facing must still draw its legs on every frame
 * photographed, as it did before.
 *
 *   node tools/qa/mp/run.mjs rideoff
 */
import * as H from './harness.mjs';

const VIEW = { width: 390, height: 844 };
const FACINGS = [['east', 0], ['southeast', 1], ['south', 2], ['southwest', 3], ['west', 4], ['northwest', 5], ['north', 6], ['northeast', 7]];
const SHOTS = +(process.env.BT_RO_SHOTS || 6);   /* frames photographed a facing */

const INIT = `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle', 'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
} catch (e) {}
/* BT_RO_UNITS=16: the texture units an iPhone has (this box: 32), read by
   Pixi when it sizes its batches (P3's recipe) */
try {
  const units = ${JSON.stringify(+(process.env.BT_RO_UNITS || 0))};
  if (units) {
    for (const C of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const g = C.prototype.getParameter;
      C.prototype.getParameter = function (p) { if (p === 0x8872 || p === 0x8B4D) return Math.min(units, g.call(this, p)); return g.call(this, p); };
    }
  }
} catch (e) {}`;

const TOOLS = () => {
  if (window.__qaRO) return true;
  const R = window._pixiRenderer;
  const app = R && R.app;
  if (!app) return false;
  const T = window.__qaRO = { frames: 0, hide: false };
  const rend = app.renderer;
  const orig = rend.render.bind(rend);
  rend.render = function (...a) {
    const stage = a[0] === app.stage || (a[0] && a[0].container === app.stage);
    const me = R.playerDisplayRaw();
    const sb = me && T.hide ? me._spriteBody : null;
    let was = null;
    if (sb) { was = sb.renderable; sb.renderable = false; }
    try { return orig(...a); } finally { if (was != null) sb.renderable = was; if (stage) T.frames++; }
  };
  T.body = () => {
    const S = window._gameState.current;
    const me = R.playerDisplayRaw();
    const sb = me && me._spriteBody;
    const t = sb && sb.texture;
    const look = t && t._btLook;
    return { facing: S._renderFacing, pose: me && me._animPose, frame: me && me._animFrame, ride: !!(S._ride && S._ride.on),
      look: look ? look.row : null, mirror: t ? !!t._btLookMirror : null, ix: t ? t.__btIx : null,
      tf: t && t.frame ? [Math.round(t.frame.x), Math.round(t.frame.y), Math.round(t.frame.width), Math.round(t.frame.height)] : null,
      scale: sb ? [+sb.scale.x.toFixed(3), +sb.scale.y.toFixed(3)] : null,
      bodyVis: !!(sb && sb.visible), standIn: S._standInBody === true, auto: !!S.autoAttack, slot: S.rpg && S.rpg.activeSlot,
      wpnAbove: me && me._weaponContainer && me._weaponContainer.visible ? me.getChildIndex(me._weaponContainer) > me.getChildIndex(sb) : null };
  };
  return true;
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Boardbro', wsPort, webPort, viewport: VIEW, touch: true, dpr: 2, world: 'wheel', init: INIT, ...(process.env.BT_RO_QUERY != null ? { query: process.env.BT_RO_QUERY } : {}) });
  const page = P.page;
  const errors = [];
  page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stopAlive = H.keepAlive(P);
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 180000, label: 'into the world' }).catch(() => null);
    rec.ok('in the world (guard)', !!inW, inW);
    if (!inW) return;
    const myId = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 60 });
    rec.ok('the page tools (guard)', !!(await page.evaluate(TOOLS)));
    /* BT_RO_WEAPON=bow|staff|greatsword: carried the way a player carries it
       (the worker's own equip, H.armWorker), the owner's bow and staff */
    const wpn = process.env.BT_RO_WEAPON || '';
    if (wpn) {
      let armed = [];
      if (wpn === 'greatsword') {
        await H.devOp(wsPort, 'kit', myId, { what: 'weapons' }).catch(() => null);
        await page.waitForTimeout(3000);
        await H.equipWeapon(P, 'greatsword', 'weapon', 'melee');
        armed = await H.waitFor(P, (S) => (S.rpg && S.rpg.weapon ? S.rpg.weapon.type : null), (v) => v === 'greatsword', { timeout: 30000, label: 'held' }).then(() => ['greatsword']).catch(() => []);
      } else {
        armed = await H.armWorker(P, wsPort, myId, [wpn]);
      }
      const held = await H.readState(P, (S) => ({ slot: S.rpg && S.rpg.activeSlot, w: S.rpg && S.rpg.weapon && S.rpg.weapon.type, r: S.rpg && S.rpg.rangedWeapon && S.rpg.rangedWeapon.type, s: S.rpg && S.rpg.staffWeapon && S.rpg.staffWeapon.type }));
      rec.ok(`a ${wpn} carried (guard)`, armed.includes(wpn), { armed, held });
    }
    const frames = () => page.evaluate(() => window.__qaRO.frames);
    const drawn = async (n = 2) => { const f0 = await frames(); for (let i = 0; i < 300; i++) { await page.waitForTimeout(40); if (await frames() >= f0 + n) return; } };
    const stick = (x, y) => page.evaluate(([x, y]) => { const S = window._gameState.current; S.stickX = x; S.stickY = y; }, [x, y]);
    /* the legs' pixels this frame: the figure's lower half, body drawn vs held back */
    const legsPx = async () => {
      const box = await H.figureBox(P, { pad: 6 });
      if (!box) return null;
      const lower = { x: box.x, y: Math.round(box.y + box.height * 0.55), width: box.width, height: Math.round(box.height * 0.45) };
      await page.evaluate(() => { window.__qaRO.hide = false; });
      await drawn(1);
      const a = await H.screenshotPixels(P, lower);
      await page.evaluate(() => { window.__qaRO.hide = true; });
      await drawn(1);
      const b = await H.screenshotPixels(P, lower);
      await page.evaluate(() => { window.__qaRO.hide = false; });
      let n = 0;
      for (let i = 0; i < a.data.length && i < b.data.length; i += 4) {
        if (Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]) > 24) n++;
      }
      return n;
    };
    /* jog each facing, photographing the legs on SHOTS frames */
    const jogAll = async (tag) => {
      const out = {};
      for (const [dir, k] of FACINGS) {
        const ang = k * Math.PI / 4;
        await stick(Math.cos(ang), Math.sin(ang));
        await page.waitForTimeout(700);
        const shots = [];
        for (let i = 0; i < SHOTS; i++) {
          const px = await legsPx();
          const b = await page.evaluate(() => window.__qaRO.body());
          shots.push({ px, ...b });
        }
        await stick(0, 0);
        await page.waitForTimeout(300);
        out[dir] = shots;
        console.log(`    ${tag} ${dir}: legs px ${shots.map((s) => s.px).join(',')}  frames ${shots.map((s) => s.pose + s.frame).join(',')}  body ${shots.map((s) => (s.bodyVis ? 'B' : '-') + (s.standIn ? 'S' : '') + (s.auto ? 'A' : '') + (s.wpnAbove ? '^' : '')).join(',')}`);
      }
      return out;
    };
    /* BT_RO_STALE=1: an old save's half-state -- the worker's stored lane
       'melee', the phone's own 'ranged' (or 'staff'), no cycle this session
       (wsClient: the worker's activeSlot is taken until the phone cycles).
       Then on the board and off, the lane read after each */
    if (process.env.BT_RO_STALE === '1') {
      const lane0 = await page.evaluate(() => {
        const S = window._gameState.current;
        const mine = S.rpg.activeSlot;
        S.channel.send({ type: 'set_active_slot', payload: { slot: 'melee' } });
        S.rpg.activeSlot = mine; S._userCycledSlot = false;
        return mine;
      });
      await page.waitForTimeout(2000);
      const read = () => H.readState(P, (S) => ({ slot: S.rpg.activeSlot, ride: !!(S._ride && S._ride.on) }));
      const r0 = await read();
      await page.evaluate(() => { const S = window._gameState.current; S.channel.send({ type: 'ride', payload: { on: 1 } }); });
      await page.waitForTimeout(4000);
      const r1 = await read();
      await page.evaluate(() => { const S = window._gameState.current; S.stickX = 1; S.stickY = 0; });
      await page.waitForTimeout(3000);
      await page.evaluate(() => { const S = window._gameState.current; S.stickX = 0; S.stickY = 0; S.channel.send({ type: 'ride', payload: { on: 0 } }); });
      await page.waitForTimeout(4000);
      const r2 = await read();
      console.log('    lane: start', lane0, '| before the board', JSON.stringify(r0), '| on it', JSON.stringify(r1), '| off it', JSON.stringify(r2));
      rec.ok(`the lane in hand survives the board (${lane0} -> ${r2.slot})`, r2.slot === lane0, { r0, r1, r2 });
      return;
    }
    /* BT_RO_TOUCH=1: real touch (CDP) -- on the board, a finger down on the
       right zone (the attack: autoAttack, which steps you off the board),
       held through the step-off, then lifted wherever it is; the attack must
       let go.  Then a second touch on the ride button while the attack is
       held, the release landing there. */
    if (process.env.BT_RO_TOUCH === '1') {
      const cdp = await page.context().newCDPSession(page);
      const st = () => page.evaluate(() => { const S = window._gameState.current; return { auto: !!S.autoAttack, aiming: !!S._aiming, ride: !!(S._ride && S._ride.on), why: S._ride && S._ride.why, slot: S.rpg.activeSlot,
        held: S.rpg.rangedWeapon ? S.rpg.rangedWeapon.type : null, bow: !!S._bowShowing,
        wpnVis: (() => { const me = window._pixiRenderer.playerDisplayRaw(); return !!(me && me._weaponContainer && me._weaponContainer.visible); })() }; });
      const zone = await page.evaluate(() => { const z = document.querySelector('[data-joyzone="R"]'); const r = z && z.getBoundingClientRect(); return r ? { x: Math.round(r.left + r.width * 0.6), y: Math.round(r.top + r.height * 0.75) } : null; });
      const rideBtn = () => page.evaluate(() => { const b = [...document.querySelectorAll('[data-key]')].find((e) => /ride|board/i.test(e.getAttribute('aria-label') || e.title || e.textContent || '') || e.getAttribute('data-key') === 'z' || e.getAttribute('data-key') === 'Z'); const r = b && b.getBoundingClientRect(); return r && r.width ? { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) } : null; });
      console.log('    zone', JSON.stringify(zone), 'ride button', JSON.stringify(await rideBtn()));
      await page.evaluate(() => { const S = window._gameState.current; S.channel.send({ type: 'ride', payload: { on: 1 } }); });
      await H.waitFor(P, (S) => !!(S._ride && S._ride.on), (v) => v, { timeout: 8000, label: 'on' }).catch(() => null);
      await page.evaluate(() => { const S = window._gameState.current; S.stickX = 1; S.stickY = 0; });
      await page.waitForTimeout(1500);
      console.log('    riding:', JSON.stringify(await st()));
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: zone.x, y: zone.y, id: 7 }] });
      for (let i = 0; i < 8; i++) { await page.waitForTimeout(150); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: zone.x - 20 - i * 3, y: zone.y - 10, id: 7 }] }); }
      console.log('    attack held on the board:', JSON.stringify(await st()));
      await page.waitForTimeout(1500);
      console.log('    held, after the step-off:', JSON.stringify(await st()));
      const rb = await rideBtn();
      if (rb) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: rb.x, y: rb.y, id: 7 }] });
      await page.waitForTimeout(300);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.evaluate(() => { const S = window._gameState.current; S.stickX = 0; S.stickY = 0; });
      await page.waitForTimeout(1500);
      const after = await st();
      console.log('    lifted (on the ride button if shown):', JSON.stringify(after));
      rec.ok('the attack lets go when the finger lifts after the board (bow)', !after.auto && !after.bow, after);
      return;
    }
    /* BT_RO_HELD=1: the attack held with nothing in sight (S.autoAttack
       left on, as a touch whose end never reached the attack zone leaves it) */
    if (process.env.BT_RO_HELD === '1') {
      await page.evaluate(() => { const S = window._gameState.current; S.autoAttack = true; });
      await page.waitForTimeout(1500);
      const st = await page.evaluate(() => { const S = window._gameState.current; return { auto: !!S.autoAttack, standIn: S._standInBody === true, slot: S.rpg.activeSlot }; });
      console.log('    held:', JSON.stringify(st));
      await jogAll('held');
      return;
    }
    /* BT_RO_EMPTY_MELEE=1: the lane a left-stick double tap lands a bow or
       staff owner on (weaponSlots.js: melee is always in the rotation),
       with no melee weapon -- set directly, no board */
    if (process.env.BT_RO_EMPTY_MELEE === '1') {
      const lane = await page.evaluate(() => { const S = window._gameState.current; S.rpg.activeSlot = 'melee'; S._userCycledSlot = true; return { slot: S.rpg.activeSlot, melee: S.rpg.weapon ? S.rpg.weapon.type : null }; });
      console.log('    lane now:', JSON.stringify(lane));
      await page.waitForTimeout(1500);
      await jogAll('empty-melee');
      return;
    }
    const before = await jogAll('before');
    /* on the board */
    await page.evaluate(() => { const S = window._gameState.current; S.channel.send({ type: 'ride', payload: { on: 1 } }); });
    const on = await H.waitFor(P, (S) => !!(S._ride && S._ride.on), (v) => v, { timeout: 8000, label: 'on the board' }).catch(() => false);
    rec.ok('on the board (guard)', !!on);
    for (const [dir, k] of FACINGS) {
      const ang = k * Math.PI / 4;
      await stick(Math.cos(ang), Math.sin(ang));
      await page.waitForTimeout(+(process.env.BT_RO_RIDE_MS || 3000));
    }
    await stick(0, 0);
    await page.waitForTimeout(800);
    await page.evaluate(() => { const S = window._gameState.current; S.channel.send({ type: 'ride', payload: { on: 0 } }); });
    const off = await H.waitFor(P, (S) => !(S._ride && S._ride.on), (v) => v, { timeout: 8000, label: 'off the board' }).catch(() => false);
    rec.ok('off the board (guard)', !!off);
    await page.waitForTimeout(1000);
    const after = await jogAll('after');
    for (const [dir] of FACINGS) {
      const b0 = Math.min(...before[dir].map((s) => s.px || 0));
      const a0 = Math.min(...after[dir].map((s) => s.px || 0));
      const thin = after[dir].filter((s) => (s.px || 0) < Math.max(40, b0 * 0.4));
      rec.ok(`${dir}: the legs drawn on every frame after the ride (fewest px before ${b0}, after ${a0})`, thin.length === 0, thin.slice(0, 3));
    }
    /* with `bodyframes` in the address: the probe counted, read the legs and
       showed its box (bodyFrames.js) */
    if (/bodyframes/.test(process.env.BT_RO_QUERY || '')) {
      const bf = await page.evaluate(() => ({ data: window.__btBodyFrames ? window.__btBodyFrames() : null,
        box: (document.querySelector('[data-bodyframes]') || {}).textContent || null }));
      console.log('    bodyframes:', JSON.stringify({ frames: bf.data && bf.data.frames, looked: bf.data && bf.data.looked, drops: bf.data && bf.data.drops, byFacing: bf.data && bf.data.byFacing }), '\n    box:', (bf.box || '').replace(/\n/g, ' / ').slice(0, 300));
      rec.ok('?bodyframes counts the frames, reads the legs and shows its box', !!(bf.data && bf.data.frames > 10 && bf.data.looked > 10 && bf.box && /legs missing/.test(bf.box)), bf.data && { frames: bf.data.frames, looked: bf.data.looked, now: bf.data.now });
    }
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    try { stopAlive && stopAlive(); } catch (e) { /* gone */ }
    await P.ctx.close().catch(() => {});
  }
}
