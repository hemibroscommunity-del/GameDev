/* ═══ v2.3.3145: THE BRO'S LOOK WHILE HE GATHERS ═══
 *
 * The owner, 2026-10-07: "The character's appearance changes during resource
 * gathering activities.  It needs to stay consistent."
 *
 * Pictures of one dressed character (a skin, hair and its colour, a cap, a
 * beard, a coloured shirt) standing, then mid-swing at each harvest -- mining,
 * woodcutting, fishing -- lighting a fire and cooking, on a phone in the
 * Wheel: tools/qa/mp/out/gatherlook-*.png.  (Pictures only so far; the checks
 * come with the fix.)
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const STAND = { oreVein: [0, -70], tree: [0, -130], fishSpot: [52, -43] };
const SKILL = { oreVein: 'mining', tree: 'woodcutting', fishSpot: 'fishing' };

const LOOK = `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle',
    'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  localStorage.setItem('bt-skin', 'deep');
  localStorage.setItem('bt-hair', 'flat-top');
  localStorage.setItem('bt-haircolor', 'blonde');
  localStorage.setItem('bt-headwear', 'red-cap');
  localStorage.setItem('bt-facialhair', 'beard');
  localStorage.setItem('bt-beardcolor', 'blonde');
  localStorage.setItem('bt-shirt', 'tshirt');
  localStorage.setItem('bt-shirtcolor', 'green');
} catch (e) {}`;

/* mp-harvestbar's walk: H.hopTo's hops, checked against the worker */
async function travel(P, wsPort, myId, tx, ty) {
  const worker = async () => {
    const a = await H.adminPlayer(wsPort, myId).catch(() => null);
    return (a && a.live) || {};
  };
  const here = () => H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
  const apart = (L, c) => typeof L.x === 'number' && Math.hypot(L.x - c.x, L.y - c.y) > 60;
  for (let leg = 0; leg < 300; leg++) {
    const L = await worker();
    const c = await here();
    if (apart(L, c)) {
      await P.page.waitForTimeout(900);
      const L2 = await worker();
      const c2 = await here();
      if (apart(L2, c2) && Math.hypot(L2.x - L.x, L2.y - L.y) < 2) {
        await P.page.evaluate(({ x, y }) => { const S = window._gameState.current; S.player.x = x; S.player.y = y; S.player.vx = 0; S.player.vy = 0; }, { x: L2.x, y: L2.y });
        await P.page.waitForTimeout(500);
      }
      continue;
    }
    if (Math.hypot(tx - c.x, ty - c.y) < 6) return true;
    await H.hopTo(P, tx, ty, { tries: 4 });
  }
  return false;
}

async function tapNode(P, id, done, tries = 6) {
  for (let i = 0; i < tries; i++) {
    await P.page.evaluate((nid) => {
      const S = window._gameState.current;
      const n = (S.gatherNodes || []).find((g) => g.id === nid);
      if (!n) return;
      const cv = document.querySelector('canvas');
      const rc = cv.getBoundingClientRect();
      const x = rc.left + (n.x - S.camera.x) * (S._worldScaleX || 1);
      const y = rc.top + (n.y - 24 - S.camera.y) * (S._worldScaleY || 1);
      const mk = (t) => new TouchEvent(t, { bubbles: true, cancelable: true,
        touches: t === 'touchend' ? [] : [new Touch({ identifier: 77, target: cv, clientX: x, clientY: y })],
        changedTouches: [new Touch({ identifier: 77, target: cv, clientX: x, clientY: y })] });
      cv.dispatchEvent(mk('touchstart'));
      cv.dispatchEvent(mk('touchend'));
    }, id);
    await P.page.waitForTimeout(300);
    if (await H.readState(P, done)) return true;
  }
  return false;
}

async function closeTalk(P) {
  for (let i = 0; i < 10; i++) {
    await P.page.waitForTimeout(400);
    const scrim = P.page.locator('.bt-npcdlg-scrim').first();
    if (await scrim.isVisible().catch(() => false)) {
      await scrim.click({ position: { x: 20, y: 300 } }).catch(() => {});
      continue;
    }
    let hit = false;
    for (const t of ['Next', 'Close', 'Got it']) {
      const btn = P.page.locator('button:visible', { hasText: t }).first();
      if (await btn.isVisible().catch(() => false)) { await btn.click().catch(() => {}); hit = true; break; }
    }
    if (!hit) return;
  }
}

const nearestNode = (P, type) => P.page.evaluate((t) => {
  const S = window._gameState.current, p = S.player;
  let best = null, d = Infinity;
  for (const n of S.gatherNodes || []) {
    if (n.nodeType !== t || !n.alive || (n.gatherLvl || 1) !== 1) continue;
    const dd = Math.hypot(n.x - p.x, n.y - p.y);
    if (dd < d) { d = dd; best = { id: n.id, x: n.x, y: n.y, d: Math.round(dd) }; }
  }
  return best;
}, type);

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Lookbro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', init: LOOK });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();
  /* a picture round the bro: 150 x 170 CSS px over his feet */
  const shot = async (name) => {
    const c = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const r = document.querySelector('canvas').getBoundingClientRect();
      const d = window.__btPlayerDrawn ? window.__btPlayerDrawn() : null;
      const wx = d ? d.x : S.player.x, wy = d ? d.footY : S.player.y;
      return { x: r.left + (wx - S.camera.x) * (S._worldScaleX || 1), y: r.top + (wy - S.camera.y) * (S._worldScaleY || 1),
        pose: (() => { const pd = window._pixiRenderer && window._pixiRenderer.playerDisplayRaw ? window._pixiRenderer.playerDisplayRaw() : null; return pd ? pd._animPose || null : null; })(),
        hid: S._standInBody === true };
    });
    const W = 150, Hh = 170;
    const clip = { x: Math.max(0, Math.min(PHONE.width - W, Math.round(c.x - W / 2))), y: Math.max(0, Math.min(PHONE.height - Hh, Math.round(c.y - 125))), width: W, height: Hh };
    await P.page.screenshot({ path: join(OUT, `gatherlook-${name}.png`), clip }).catch(() => {});
    console.log(`    shot ${name}: pose ${c.pose} standInBody ${c.hid}`);
  };
  try {
    await H.enterWorld(P);
    const myId = await H.readState(P, (S) => S.myId);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading, n: (S.gatherNodes || []).length }),
      (v) => v.zone === 'wheel' && !v.loading && v.n > 0, { timeout: 120000, label: 'into the Wheel, its nodes in' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!inW, inW);
    if (!inW) return;
    await P.page.addStyleTag({ content:
      '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]), [data-coach],[data-coach-card],[data-coach-ring] { visibility: hidden !important; }' }).catch(() => {});
    for (const k of ['woodcutting_axe', 'fishing_pole', 'mining_pickaxe']) await H.grant(wsPort, myId, 'item', { invKey: k, count: 1 }).catch(() => {});
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 });
    await H.waitFor(P, (S) => ['woodcutting_axe', 'fishing_pole', 'mining_pickaxe'].filter((k) => ((S.rpg || {}).inventory || {})[k] > 0).length,
      (n) => n === 3, { timeout: 20000, label: 'the tools' }).catch(() => 0);
    await closeTalk(P);
    await P.page.waitForTimeout(1500);
    await shot('0-stand');

    for (const type of ['oreVein', 'tree', 'fishSpot']) {
      const n = await nearestNode(P, type);
      if (!n) { console.log(`    no ${type}`); continue; }
      await travel(P, wsPort, myId, n.x + STAND[type][0], n.y + STAND[type][1]);
      await closeTalk(P);
      await P.page.waitForTimeout(800);
      await shot(`1-${type}-before`);
      await P.page.evaluate(() => { const S = window._gameState.current; S._monstersStash = S.monsters; S.monsters = []; });
      const ok = await tapNode(P, n.id, (S) => !!S._extraction);
      console.log(`    ${type}: started ${ok}`);
      for (let k = 0; k < 4; k++) {
        await P.page.waitForTimeout(450);
        await shot(`2-${type}-${k}`);
      }
      /* the ready window: the gesture pose */
      const ready = await H.waitFor(P, (S) => (S._extraction ? S._extraction.status : null), (v) => v === 'ready',
        { timeout: 40000, label: 'ready' }).catch(() => null);
      if (ready) { await P.page.waitForTimeout(400); await shot(`3-${type}-ready`); }
      await P.page.evaluate(() => { const S = window._gameState.current; S._extraction = null;
        if (S._monstersStash) { S.monsters = S._monstersStash; S._monstersStash = null; } });
      await P.page.waitForTimeout(800);
      await shot(`4-${type}-after`);
    }

    /* a fire, then a cook */
    await H.grant(wsPort, myId, 'item', { invKey: 'wood_pine_log', count: 2 }).catch(() => {});
    await H.grant(wsPort, myId, 'item', { invKey: 'fish_minnow', count: 2 }).catch(() => {});
    await H.waitFor(P, () => window.__btStandIns && window.__btStandIns().fire, (v) => v && v.state === 'ready', { timeout: 30000, label: 'fire-lighter' }).catch(() => null);
    const me = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    await travel(P, wsPort, myId, me.x, me.y + 200);
    await P.page.evaluate(() => {
      const bus = window._itemDetailBus;
      const S = window._gameState && window._gameState.current;
      if (bus && S && S.rpg) bus.open({ kind: 'inventory', key: 'wood_pine_log', count: (S.rpg.inventory || {}).wood_pine_log || 0 });
    });
    await P.page.locator('button:visible', { hasText: 'Light fire' }).first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await P.page.waitForTimeout(1500);
    await P.page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => /Light fire/.test(x.textContent || '') && x.offsetParent);
      if (b) b.click();
    });
    await P.page.keyboard.press('Escape').catch(() => {});
    for (let k = 0; k < 2; k++) { await P.page.waitForTimeout(250); await shot(`5-fire-${k}`); }
    const camp = await H.waitFor(P, (S) => ({ fire: !!S._campfire, lighting: !!S._firemaking, cook: window.__btStandIns().cook }),
      (v) => v.fire && !v.lighting && v.cook.state === 'ready', { timeout: 20000, label: 'a campfire, and the cook made' }).catch(() => null);
    if (camp) {
      const at = await P.page.evaluate(() => {
        const S = window._gameState.current;
        const n = S._campfire;
        if (!n) return null;
        const r = document.querySelector('canvas').getBoundingClientRect();
        return { x: r.left + (n.x - S.camera.x) * (S._worldScaleX || 1), y: r.top + (n.y - S.camera.y) * (S._worldScaleY || 1) };
      });
      await P.page.waitForTimeout(400);
      if (at) await P.page.touchscreen.tap(at.x, at.y);
      const cooking = await H.waitFor(P, (S) => (S._extraction ? S._extraction.skill : null), (v) => v === 'cooking',
        { timeout: 6000, label: 'a cook' }).catch(() => null);
      console.log(`    cooking: ${cooking}`);
      for (let k = 0; k < 3; k++) { await P.page.waitForTimeout(450); await shot(`6-cook-${k}`); }
    }
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    stopAlive = true;
    await P.ctx.close().catch(() => {});
  }
}
