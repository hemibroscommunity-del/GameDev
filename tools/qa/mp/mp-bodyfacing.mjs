/* ═══ v2.3.3864: THE BODY IN EVERY FACING, ON A PHONE ═══
 *
 * The owner, 2026-10-29, on their phone: "Disappearing body on mobile.
 * Northeast, east, southeast, and south are fine. The rest disappear."
 *
 * A phone (touch, 390x844, three device px a CSS px), the look palette on,
 * in the world.  For each of the eight facings, standing and jogging (the
 * stick held that way), bare and in the kit's iron: the walking body is
 * asked whether it is drawn -- visible, with a picture, its alpha above
 * nought -- AND the screen is asked: the figure's box photographed with the
 * body sprite drawn and with it held back for one frame must differ by a
 * body's worth of pixels (a sprite that says it is drawn and paints nothing
 * is the bug a phone shows).
 *
 *   node tools/qa/mp/run.mjs bodyfacing
 *   BT_BF_QUERY=lookpalette=0   the old path, for a comparison
 */
import * as H from './harness.mjs';

const VIEW = { width: 390, height: 844 };
const FACINGS = [['east', 0], ['southeast', 1], ['south', 2], ['southwest', 3], ['west', 4], ['northwest', 5], ['north', 6], ['northeast', 7]];
const MIN_BODY_PX = 60;   /* device px that change when the body is held back: a body draws hundreds */

const INIT = `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle', 'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
} catch (e) {}
/* the GL audit: every draw while it is on, its program (named by the
   source's own name line) and any error the call raised */
try {
  const P = WebGL2RenderingContext.prototype;
  const srcOf = new WeakMap(), nameOf = new WeakMap();
  const ss = P.shaderSource;
  P.shaderSource = function (sh, src) { srcOf.set(sh, String(src)); return ss.call(this, sh, src); };
  const at = P.attachShader;
  P.attachShader = function (pr, sh) {
    const src = srcOf.get(sh) || '';
    const m = /#define SHADER_NAME (\S+)/.exec(src) || /name: '([^']+)'/.exec(src);
    if (m && !/vertex/i.test(m[1])) nameOf.set(pr, m[1].replace(/-fragment$/, ''));
    else if (!nameOf.has(pr) && m) nameOf.set(pr, m[1].replace(/-vertex$/, ''));
    return at.call(this, pr, sh);
  };
  let cur = null;
  const up = P.useProgram;
  P.useProgram = function (pr) { cur = pr; return up.call(this, pr); };
  const A = window.__glAudit = { on: false, draws: [], errors: [] };
  for (const fn of ['drawElements', 'drawArrays']) {
    const o = P[fn];
    P[fn] = function (...a) {
      if (!A.on) return o.apply(this, a);
      while (this.getError() !== 0) { /* clear */ }
      const r = o.apply(this, a);
      const e = this.getError();
      const name = (cur && nameOf.get(cur)) || '?';
      A.draws.push(name);
      if (e) A.errors.push({ name, e });
      return r;
    };
  }
} catch (e) {}`;

/* the page's tools: a render hook that can hold the body sprite back for
   the next frames, and the body's own state */
const TOOLS = () => {
  if (window.__qaBF) return true;
  const R = window._pixiRenderer;
  const app = R && R.app;
  if (!app) return false;
  const T = window.__qaBF = { renders: 0, hideBody: false };
  const rend = app.renderer;
  const orig = rend.render.bind(rend);
  rend.render = function (...a) {
    const me = R.playerDisplayRaw();
    const sb = me && me._spriteBody;
    let was = null;
    if (T.hideBody && sb) { was = sb.renderable; sb.renderable = false; }
    T.renders++;
    try { return orig(...a); } finally { if (was != null) sb.renderable = was; }
  };
  T.body = () => {
    const S = window._gameState.current;
    const me = R.playerDisplayRaw();
    const sb = me && me._spriteBody;
    if (!sb) return { none: true };
    const t = sb.texture, src = t && t.source;
    let wa = sb.alpha, n = sb.parent;
    while (n) { wa *= n.alpha; if (!n.visible) wa = 0; n = n.parent; }
    return {
      facing: S._renderFacing, src: S._facingSrc, pose: me._animPose || null,
      displayVisible: !!me.visible, visible: !!sb.visible, renderable: sb.renderable !== false,
      alpha: +sb.alpha.toFixed(2), worldAlpha: +wa.toFixed(2),
      empty: !t || t.label === 'EMPTY' || !src || (t.frame && (t.frame.width < 2 || t.frame.height < 2)),
      destroyed: !!(t && t.destroyed) || !!(src && src.destroyed),
      frame: t && t.frame ? [Math.round(t.frame.width), Math.round(t.frame.height)] : null,
      scale: [+sb.scale.x.toFixed(3), +sb.scale.y.toFixed(3)],
      shader: !!sb._lookRow || sb._lookRow === 0 ? sb._lookRow : null,
      batcher: sb.batcherName || (sb.groupBatcher) || null,
      look: !!(window.__btLookPalette && window.__btLookPalette().on),
      /* the carried weapon: shown, and above (true) or below the body */
      weapon: (() => {
        const wc = me._weaponContainer;
        if (!wc || !wc.visible) return null;
        return { above: me.getChildIndex(wc) > me.getChildIndex(sb), held: S.rpg && S.rpg.weapon ? S.rpg.weapon.type : null, slot: S.rpg ? S.rpg.activeSlot : null };
      })(),
    };
  };
  return true;
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Facebro', wsPort, webPort, viewport: VIEW, touch: true, dpr: 3, world: 'wheel', init: INIT, ...(process.env.BT_BF_QUERY ? { query: process.env.BT_BF_QUERY } : {}) });
  const page = P.page;
  const errors = [];
  page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stopAlive = H.keepAlive(P);
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'into the world' }).catch(() => null);
    rec.ok('in the world (guard)', !!inW, inW);
    if (!inW) return;
    const myId = await H.readState(P, (S) => S.myId);
    await page.addStyleTag({ content: '[data-coach],[data-coach-card],[data-coach-ring] { visibility: hidden !important; }' }).catch(() => {});
    await H.devOp(wsPort, 'quests', myId);
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 60 });
    /* a weapon carried, as a player carries one (the sheathed one's order
       turns on SW/W/NW/N, entityRenderer's weapon z-order) --
       BT_BF_WEAPON=none | greatsword (the default) | bow | staff */
    const wantW = process.env.BT_BF_WEAPON || 'greatsword';
    if (wantW !== 'none') {
      const SLOT = { greatsword: ['weapon', 'melee'], bow: ['rangedWeapon', 'ranged'], staff: ['staffWeapon', 'staff'] }[wantW];
      const bag = () => H.readState(P, (S) => ((S.rpg && S.rpg.weaponStash) || []).map((w) => w && w.type));
      let inBag = [];
      for (let i = 0; i < 4 && !inBag.includes(wantW); i++) {
        await H.devOp(wsPort, 'kit', myId, { what: 'weapons' }).catch(() => null);
        for (let j = 0; j < 40 && !(inBag = await bag()).includes(wantW); j++) await page.waitForTimeout(250);
      }
      const eq = await H.equipWeapon(P, wantW, SLOT[0], SLOT[1]);
      let held = await H.waitFor(P, (S) => (S.rpg && S.rpg[SLOT[0]] ? S.rpg[SLOT[0]].type : null), (v) => v === wantW, { timeout: 30000, label: 'held' }).catch(() => null);
      /* the worker refused or is slow: carried on the page alone (all the
         drawing reads) */
      if (held !== wantW) {
        held = await page.evaluate(([t, slot, active]) => {
          const S = window._gameState.current, R = S.rpg;
          const w = (R.weaponStash || []).find((x) => x && x.type === t);
          if (!w) return null;
          R[slot] = Object.assign({}, w); R.activeSlot = active; S._userCycledSlot = true;
          return R[slot].type;
        }, [wantW, SLOT[0], SLOT[1]]);
        if (held) console.log('    (the weapon put in hand on the page: the worker did not)');
      }
      rec.ok(`a ${wantW} carried (guard)`, held === wantW, { eq, held, inBag });
    }
    await page.waitForTimeout(2000);
    rec.ok('the page tools (guard)', !!(await page.evaluate(TOOLS)));
    const look = await page.evaluate(() => (window.__btLookPalette ? window.__btLookPalette() : null));
    console.log('    look palette:', JSON.stringify(look).slice(0, 300));
    const renders = () => page.evaluate(() => window.__qaBF.renders);
    const drawn = async (n = 2) => { const r0 = await renders(); for (let i = 0; i < 200; i++) { await page.waitForTimeout(40); if (await renders() >= r0 + n) return; } };
    const bodyPx = async () => {
      const box = await H.figureBox(P, { pad: 6 });
      if (!box) return null;
      await page.evaluate(() => { window.__qaBF.hideBody = false; });
      await drawn(2);
      const a = await H.screenshotPixels(P, box);
      await page.evaluate(() => { window.__qaBF.hideBody = true; });
      await drawn(2);
      const b = await H.screenshotPixels(P, box);
      await page.evaluate(() => { window.__qaBF.hideBody = false; });
      let n = 0;
      for (let i = 0; i < a.data.length && i < b.data.length; i += 4) {
        if (Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]) > 24) n++;
      }
      return n;
    };

    const outfits = (process.env.BT_BF_OUTFITS || 'bare,iron').split(',');
    for (const outfit of outfits) {
      if (outfit === 'iron') {
        await H.devOp(wsPort, 'kit', myId, { what: 'armor' }).catch(() => {});
        await page.waitForTimeout(1500);
        await page.waitForFunction(() => {
          const R = window._gameState.current.rpg || {};
          return (R.armorStash || []).concat(R.armor ? [R.armor] : []).some((x) => x && x.mat === 'iron' && x.gid)
            && (R.legsStash || []).concat(R.legsArmor ? [R.legsArmor] : []).some((x) => x && x.mat === 'iron' && x.gid);
        }, null, { timeout: 15000, polling: 250 }).catch(() => null);
        /* mp-ghostaudit's wear: the worker told which pieces are worn */
        await page.evaluate(() => {
          const S = window._gameState.current, R = S.rpg;
          const put = (stash, slot) => {
            if (R[slot] && R[slot].mat === 'iron') return R[slot].gid;
            if (R[slot]) { (R[stash] = R[stash] || []).push(R[slot]); R[slot] = null; }
            const i = (R[stash] || []).findIndex((x) => x && x.mat === 'iron' && x.gid);
            if (i < 0) return null;
            R[slot] = R[stash][i]; R[stash].splice(i, 1);
            return R[slot].gid;
          };
          const t = put('armorStash', 'armor'), l = put('legsStash', 'legsArmor');
          if (window.__btSyncArmorLayers) window.__btSyncArmorLayers(R);
          S.channel.send({ type: 'stats_update', payload: { armorRef: t, legsArmorRef: l } });
        });
        await page.waitForTimeout(2500);
        const worn = await page.evaluate(() => ({ chest: window.__btGetGear('chest'), legs: window.__btGetGear('legs') }));
        console.log('    worn:', JSON.stringify(worn));
      }
      for (const pose of ['stand', 'jog']) {
        for (const [dir, k] of FACINGS) {
          const ang = k * Math.PI / 4;
          /* the left stick held that way (what the thumb's drag writes,
             BroTown.jsx handleJoystickMove); standing, let go after a step:
             the facing stays */
          const stick = (x, y) => page.evaluate(([x, y]) => { const S = window._gameState.current; S.stickX = x; S.stickY = y; }, [x, y]);
          await stick(Math.cos(ang), Math.sin(ang));
          if (pose === 'jog') await page.waitForTimeout(900);
          else {
            await page.waitForTimeout(700);
            await stick(0, 0);
            await page.waitForTimeout(900);
          }
          const b = await page.evaluate(() => window.__qaBF.body());
          const px = await bodyPx();
          /* two frames' draws: which programs drew, and any GL error */
          await page.evaluate(() => { const A = window.__glAudit; if (A) { A.draws = []; A.errors = []; A.on = true; } });
          await drawn(2);
          const gl = await page.evaluate(() => {
            const A = window.__glAudit;
            if (!A) return null;
            A.on = false;
            const n = Object.create(null);
            for (const d of A.draws) n[d] = (n[d] || 0) + 1;
            return { draws: n, errors: A.errors.slice(0, 8) };
          });
          if (gl && gl.errors.length) console.log(`    GL errors at ${pose} ${dir}:`, JSON.stringify(gl.errors));
          b.gl = gl;
          const ok = (!gl || !gl.errors.length) && b.facing === dir && b.displayVisible && b.visible && b.renderable && b.worldAlpha > 0.05 && !b.empty && !b.destroyed && px != null && px >= MIN_BODY_PX;
          rec.ok(`${outfit} ${pose} ${dir}: the body is drawn (${px} px)`, ok, b);
          if (pose === 'jog') { await stick(0, 0); await page.waitForTimeout(400); }
        }
      }
    }
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    try { stopAlive && stopAlive(); } catch (e) { /* gone */ }
    await P.ctx.close().catch(() => {});
  }
}
