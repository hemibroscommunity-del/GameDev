/* ═══ v2.3.3891: THE TROUSERS, EVERY FRAME, A WHILE INTO A VISIT ═══
 *
 * The owner, 2026-10-29, on their iPhone: "North, northwest, west, and
 * southwest has pants flickering from a character I continued from a previous
 * save. I think it happened a bit later not the moment I joined the game."
 *
 * A phone (touch, 390x844, the look palette on), a character with coloured
 * trousers and boots (BT_PF_PANTS / BT_PF_SHOES; BT_PF_INK=1 adds a trouser
 * pattern).  It jogs and stands in each facing for a while, and on every frame
 * the screen draws (renders of the stage only) the walking body's picture is
 * read: the look palette's (and which row of colours) or the old path's.  A
 * body that changes between the two, or between rows, while it faces one way
 * is a flicker; so is a look frame whose row was given back (-1: the art's own
 * colours).
 *
 *   node tools/qa/mp/run.mjs pantsflicker
 *   BT_PF_SECS=40  seconds a facing (jogging; standing half that)
 */
import * as H from './harness.mjs';

const VIEW = { width: 390, height: 844 };
const FACINGS = [['east', 0], ['southeast', 1], ['south', 2], ['southwest', 3], ['west', 4], ['northwest', 5], ['north', 6], ['northeast', 7]];

const INIT = `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle', 'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  localStorage.setItem('bt-pants', ${JSON.stringify(process.env.BT_PF_PANTS || 'blue')});
  localStorage.setItem('bt-shoes', ${JSON.stringify(process.env.BT_PF_SHOES || 'brown')});
  if (${JSON.stringify(process.env.BT_PF_INK || '')} === '1') localStorage.setItem('bt-pantspat', 'stripe-v:5');
} catch (e) {}`;

const TOOLS = () => {
  if (window.__qaPF) return true;
  const R = window._pixiRenderer;
  const app = R && R.app;
  if (!app) return false;
  const T = window.__qaPF = { frames: 0, by: Object.create(null), log: [] };
  const rend = app.renderer;
  const orig = rend.render.bind(rend);
  let last = null;
  rend.render = function (...a) {
    const r = orig(...a);
    if (!(a[0] === app.stage || (a[0] && a[0].container === app.stage))) return r;
    try {
      T.frames++;
      const S = window._gameState.current;
      const me = R.playerDisplayRaw();
      const sb = me && me._spriteBody;
      const t = sb && sb.texture;
      const look = t && t._btLook;
      const f = S._renderFacing || '?';
      const pose = me && me._animPose;
      const kind = !sb || !sb.visible ? 'hidden' : (look ? 'look:' + look.row : (t && t.label === 'EMPTY' ? 'empty' : 'old'));
      const b = T.by[f] || (T.by[f] = { frames: 0, kinds: Object.create(null), switches: 0, poses: Object.create(null) });
      b.frames++;
      b.kinds[kind] = (b.kinds[kind] || 0) + 1;
      b.poses[pose] = (b.poses[pose] || 0) + 1;
      if (last && last.f === f && last.kind !== kind) {
        b.switches++;
        if (T.log.length < 60) T.log.push({ f, pose, from: last.kind, to: kind, at: Math.round(performance.now()) });
      }
      last = { f, kind };
    } catch (e) { /* the frame drew */ }
    return r;
  };
  return true;
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Pantsbro', wsPort, webPort, viewport: VIEW, touch: true, dpr: 3, world: 'wheel', init: INIT, ...(process.env.BT_PF_QUERY ? { query: process.env.BT_PF_QUERY } : {}) });
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
    /* BT_PF_ARMOUR=legs|chest|full: the kit's iron, worn the real way
       (mp-ghostaudit's wear) -- the legs under armour come from the masked
       bakes (lookArmour.js), the plain body while one is pending */
    const arm = process.env.BT_PF_ARMOUR || '';
    if (arm) {
      await H.devOp(wsPort, 'kit', myId, { what: 'armor' }).catch(() => {});
      await page.waitForFunction(() => {
        const R = window._gameState.current.rpg || {};
        return (R.legsStash || []).concat(R.legsArmor ? [R.legsArmor] : []).some((x) => x && x.mat === 'iron' && x.gid);
      }, null, { timeout: 30000, polling: 500 }).catch(() => null);
      const worn = await page.evaluate((arm) => {
        const S = window._gameState.current, R = S.rpg;
        const put = (stash, slot, want) => {
          if (R[slot]) { (R[stash] = R[stash] || []).push(R[slot]); R[slot] = null; }
          if (!want) return null;
          const i = (R[stash] || []).findIndex((x) => x && x.mat === 'iron' && x.gid);
          if (i < 0) return null;
          R[slot] = R[stash][i]; R[stash].splice(i, 1);
          return R[slot].gid;
        };
        const t = put('armorStash', 'armor', arm === 'chest' || arm === 'full');
        const l = put('legsStash', 'legsArmor', arm === 'legs' || arm === 'full');
        if (window.__btSyncArmorLayers) window.__btSyncArmorLayers(R);
        S.channel.send({ type: 'stats_update', payload: { armorRef: t, legsArmorRef: l } });
        return { t, l };
      }, arm);
      await page.waitForTimeout(4000);
      const gear = await page.evaluate(() => ({ chest: window.__btGetGear('chest'), legs: window.__btGetGear('legs') }));
      rec.ok(`armour worn: ${arm} (guard)`, !!(gear.legs !== 'none' || gear.chest !== 'none'), { worn, gear });
    }
    const stick = (x, y) => page.evaluate(([x, y]) => { const S = window._gameState.current; S.stickX = x; S.stickY = y; }, [x, y]);
    const secs = +(process.env.BT_PF_SECS || 40);
    for (const [dir, k] of FACINGS) {
      const ang = k * Math.PI / 4;
      /* jog that way (round a little square so the bro stays near), then stand */
      for (let i = 0; i < 4; i++) {
        await stick(Math.cos(ang), Math.sin(ang));
        await page.waitForTimeout(secs * 1000 / 8);
        await stick(-Math.cos(ang) * 0.001, -Math.sin(ang) * 0.001);   /* the same facing, barely moving */
        await page.waitForTimeout(secs * 1000 / 8);
      }
      await stick(Math.cos(ang) * 0.3, Math.sin(ang) * 0.3);
      await page.waitForTimeout(200);
      await stick(0, 0);
      await page.waitForTimeout(secs * 1000 / 2);
    }
    const out = await page.evaluate(() => ({ frames: window.__qaPF.frames, by: window.__qaPF.by, log: window.__qaPF.log,
      look: window.__btLookPalette ? window.__btLookPalette() : null }));
    console.log('    look palette:', JSON.stringify(out.look).slice(0, 400));
    for (const [f, b] of Object.entries(out.by)) console.log(`    ${f}: ${b.frames} frames, kinds ${JSON.stringify(b.kinds)}, poses ${JSON.stringify(b.poses)}, switches ${b.switches}`);
    if (out.log.length) console.log('    first switches:', JSON.stringify(out.log.slice(0, 20)));
    for (const [dir] of FACINGS) {
      const b = out.by[dir];
      if (!b) { rec.ok(`${dir}: drawn (guard)`, false); continue; }
      const kinds = Object.keys(b.kinds);
      rec.ok(`${dir}: the body's picture never flips while it faces one way (${b.switches} switches; ${kinds.join(', ')})`,
        b.switches === 0 && !kinds.includes('look:-1'), b);
    }
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    try { stopAlive && stopAlive(); } catch (e) { /* gone */ }
    await P.ctx.close().catch(() => {});
  }
}
