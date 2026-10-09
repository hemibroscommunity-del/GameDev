/* ═══ WHAT YOU CANNOT SEE DOES NOT STOP YOU (v2.3.3145) ═══
 *
 * The owner: "there are invisible areas that block movement near the town",
 * and "Sometimes jumping doesn't work because 'too far away!' message.  Make
 * jumping work and just remove the too far away message when too far away
 * from resource extraction areas."
 *
 * The Wheel's commons ring BroTown with six copper veins and six pines.  A
 * resource you hold no tool for is not drawn (effectsRenderer, v2.3.1680) --
 * and Mayor Bro's "Learn a Trade" hands you the hatchet and the rod, the
 * pickaxe only as its reward -- but it was still solid (BroTown.jsx
 * nodeBlockEllipse): a rock-sized patch of empty grass round each vein.  And
 * the right stick is the whole right half of the screen, so a thumb tapping it
 * to jump over a resource across the screen got "Too far away!" and no jump.
 *
 * On a phone (390 x 844, 2x) in the Wheel, a player on "Learn a Trade":
 *   1. the axe and the pole in the bag, no pickaxe (guard);
 *   2. at a copper vein by town (one with nothing else in the way), the vein
 *      is not drawn, and walking east straight through where it stands is
 *      not stopped;
 *   3. with the pickaxe in the bag it is drawn, and the same walk stops at it;
 *   4. standing west of it, out of reach, a tap on the right stick with the
 *      thumb on the vein JUMPS -- no "Too far away!", no harvest;
 *   5. no page errors.
 * Pictures: tools/qa/mp/out/unseenwall-{hidden,drawn}.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
/* the body's centre's height over the boots (entityRenderer playerGroundDy
   in the Wheel); a vein's rock blocks round ~68 px over its anchor */
const FEET = 52, ROCK_UP = 68;
const RUN = 150;   /* game px either side of the vein the walk runs */

/* mp-wheelnodes' travel: 100 px hops, checked against the worker every few */
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

/* walk east from (x0, y) holding D until the body is `past` px beyond `xEnd`
   or has stopped (no ground gained for three looks), at most `maxMs` -- this
   box draws a frame every few hundred ms and a frame moves you at most three
   frames' worth (BroTown dtScale), so a walk here is slow and timed by
   result, not by the clock.  Put there in hops the worker agrees with
   (travel), never a teleport it would put back. */
async function walkEast(P, wsPort, myId, x0, y, xEnd, maxMs) {
  await travel(P, wsPort, myId, x0, y);
  await P.page.waitForTimeout(700);
  await P.page.keyboard.down('d');
  const t0 = Date.now();
  let last = -Infinity, still = 0, at = null;
  while (Date.now() - t0 < maxMs) {
    await P.page.waitForTimeout(500);
    at = await H.readState(P, (S) => ({ x: Math.round(S.player.x), y: Math.round(S.player.y) }));
    if (at.x > xEnd) break;
    if (at.x <= last + 2) { if (++still >= 3) break; } else still = 0;
    last = Math.max(last, at.x);
  }
  await P.page.keyboard.up('d');
  await P.page.waitForTimeout(400);
  return H.readState(P, (S) => ({ x: Math.round(S.player.x), y: Math.round(S.player.y) }));
}

const drawnInfo = (P, id) => P.page.evaluate((nid) => {
  const S = window._gameState.current;
  const n = (S.gatherNodes || []).find((g) => g.id === nid);
  const sp = n && n._pixiSprite;
  return { drawn: !!(sp && !sp.destroyed && sp.visible !== false && sp.parent), tools: ['woodcutting_axe', 'fishing_pole', 'mining_pickaxe'].filter((k) => ((S.rpg || {}).inventory || {})[k] > 0) };
}, id);

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Wallbro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel', query: 'jumpms=1400&tapms=1500' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  /* real input on a loop: a page logs itself out after two idle minutes, and
     the walk there is long (mp-wheelnodes' keep-alive) */
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();
  try {
    await H.enterWorld(P);
    await P.page.evaluate(() => { window.__btProbe = true; });
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading, n: (S.gatherNodes || []).length }),
      (v) => v.zone === 'wheel' && !v.loading && v.n > 100, { timeout: 120000, label: 'into the Wheel, its nodes in' }).catch(() => null);
    rec.ok('in the Wheel, with its resources (guard)', !!inW, inW);
    if (!inW) return;
    const myId = await H.readState(P, (S) => S.myId);
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});

    /* ── 1. "Learn a Trade": the axe and the pole, not the pickaxe ── */
    await P.page.evaluate(() => { window._gameState.current.channel.send({ type: 'quest_accept', payload: { questId: 'life_1' } }); });
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 20 });
    const tools = await H.waitFor(P, (S) => ['woodcutting_axe', 'fishing_pole', 'mining_pickaxe'].filter((k) => ((S.rpg || {}).inventory || {})[k] > 0),
      (t) => t.length === 2, { timeout: 20000, label: 'the axe and the pole' }).catch(() => null);
    rec.ok(`on "Learn a Trade": the axe and the pole in the bag, no pickaxe (${tools}) (guard)`, !!tools && tools.indexOf('mining_pickaxe') < 0, tools);
    await closeTalk(P);

    /* ── a copper vein by town with open ground either side of it, and no
       other resource near (one in reach would rightly take the stick's tap,
       step 4): the most alone of the commons' six ── */
    const vein = await P.page.evaluate(({ FEET, ROCK_UP, RUN }) => {
      const S = window._gameState.current, P0 = S.player, all = S.gatherNodes || [];
      const alone = (n) => Math.min(...all.filter((o) => o !== n).map((o) => Math.hypot(o.x - n.x, o.y - n.y)));
      const cands = all.filter((n) => n.nodeType === 'oreVein' && n.alive && /^wn-commons-/.test(n.id))
        .map((n) => ({ n, a: alone(n) })).sort((p, q) => q.a - p.a).map((c) => c.n);
      for (const n of cands) {
        const by = n.y - ROCK_UP - FEET;   /* the body's centre with the boots on the rock's middle */
        let clear = true;
        for (let dx = -RUN; dx <= RUN && clear; dx += 8) {
          if (window.__btIsSolid(n.x + dx, by)) clear = false;
        }
        if (clear) return { id: n.id, x: n.x, y: n.y, by, d: Math.round(Math.hypot(n.x - P0.x, n.y - P0.y)), alone: Math.round(alone(n)) };
      }
      return { none: cands.length };
    }, { FEET, ROCK_UP, RUN });
    rec.ok(`a copper vein on the commons by town with open ground either side (${vein.id || 'none'}, ${vein.d} px away) (guard)`, !!vein.id, vein);
    if (!vein.id) return;
    const arrived = await travel(P, wsPort, myId, vein.x - RUN, vein.by);
    rec.ok('walked out to it (guard)', arrived, { arrived });
    await P.page.waitForTimeout(1200);

    /* ── 2. no pickaxe: not drawn, and walked straight through ── */
    const d0 = await drawnInfo(P, vein.id);
    const through = await walkEast(P, wsPort, myId, vein.x - RUN, vein.by, vein.x + 60, 30000);
    /* the objects (bushes, stones) are the Wheel's own and drawn; one on the
       line would stop this walk with or without the vein -- so say which */
    const objs = await P.page.evaluate(({ x0, x1, y }) => (window.__btWheelObjects ? window.__btWheelObjects.blockers() : [])
      .filter((b) => b.x1 > x0 && b.x0 < x1 && b.y0 < y + 62 && b.y1 > y + 42).map((b) => b.id), { x0: vein.x - RUN, x1: vein.x + RUN, y: vein.by });
    await P.page.screenshot({ path: join(OUT, 'unseenwall-hidden.png') }).catch(() => {});
    rec.ok(`with no pickaxe the vein is not drawn, and a walk east through where it stands is not stopped (from ${vein.x - RUN} to ${through.x}, the vein at ${Math.round(vein.x)})`,
      !d0.drawn && through.x > vein.x + 60, { d0, through, objs });

    /* ── 3. the pickaxe: drawn, and the same walk stops at it ── */
    await H.grant(wsPort, myId, 'item', { invKey: 'mining_pickaxe', count: 1 }).catch(() => {});
    const got = await H.waitFor(P, (S) => ((S.rpg || {}).inventory || {}).mining_pickaxe || 0, (n) => n > 0, { timeout: 15000, label: 'the pickaxe' }).catch(() => 0);
    rec.ok('the pickaxe reaches the bag (guard)', got > 0, { got });
    await P.page.waitForTimeout(1200);
    const stopped = await walkEast(P, wsPort, myId, vein.x - RUN, vein.by, vein.x + 60, 30000);
    const d1 = await drawnInfo(P, vein.id);
    await P.page.screenshot({ path: join(OUT, 'unseenwall-drawn.png') }).catch(() => {});
    rec.ok(`with the pickaxe the vein is drawn, and the same walk stops at it (at ${stopped.x}, the vein at ${Math.round(vein.x)})`,
      d1.drawn && stopped.x < vein.x - 20 && stopped.x > vein.x - RUN + 20, { d1, stopped, objs });

    /* ── 4. out of reach, the thumb on the vein: the tap jumps ── */
    await travel(P, wsPort, myId, vein.x - 260, vein.by);
    await P.page.evaluate(() => { window._gameState.current.lockedTarget = null; });
    await P.page.waitForTimeout(1500);
    const tap = await P.page.evaluate(async (nid) => {
      const S = window._gameState.current;
      const n = (S.gatherNodes || []).find((g) => g.id === nid);
      const z = document.querySelector('[data-joyzone="R"]');
      const cv = document.querySelector('canvas');
      if (!n || !z || !cv) return { ok: false };
      const rc = cv.getBoundingClientRect(), zb = z.getBoundingClientRect();
      /* the middle of the rock as drawn */
      const x = rc.left + (n.x - S.camera.x) * (S._worldScaleX || 1);
      const y = rc.top + (n.y - 68 - S.camera.y) * (S._worldScaleY || 1);
      const inZone = x > zb.left && x < zb.right && y > zb.top && y < zb.bottom;
      const mk = (t) => new TouchEvent(t, { bubbles: true, cancelable: true,
        touches: t === 'touchend' ? [] : [new Touch({ identifier: 71, target: z, clientX: x, clientY: y })],
        changedTouches: [new Touch({ identifier: 71, target: z, clientX: x, clientY: y })] });
      const j0 = S._tapJumps || 0;
      const p0 = (S.dmgNumbers || []).length;
      /* nothing else wants the tap here: no resource in reach (the disc
         pressable), no lock -- else it rightly would not jump (mp-tapjump) */
      const busy = (S._rBtnPressUntil || 0) > Date.now() || !!S.lockedTarget || !!S._nearNode;
      z.dispatchEvent(mk('touchstart'));
      await new Promise((r) => setTimeout(r, 120));
      z.dispatchEvent(mk('touchend'));
      const pops = (S.dmgNumbers || []).slice(p0).map((d) => d && d.text).filter((t) => typeof t === 'string');
      return { ok: true, inZone, busy, x: Math.round(x), y: Math.round(y), jumped: (S._tapJumps || 0) > j0, why: S._jumpWhy || null,
        pops, far: pops.indexOf('Too far away!') >= 0, harvest: !!S._extraction, drawn: !!(n._pixiSprite && !n._pixiSprite.destroyed) };
    }, vein.id);
    rec.ok('...standing out of its reach, the thumb on the vein\'s rock in the right stick\'s half, nothing else wanting the tap (guard)', tap.ok && tap.inZone && tap.drawn && !tap.busy, tap);
    rec.ok(`out of reach, a tap on the right stick with the thumb on the drawn vein jumps -- no "Too far away!", no harvest (${JSON.stringify(tap.pops || [])})`,
      tap.ok && tap.jumped && !tap.far && !tap.harvest, tap);

    rec.ok(`no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  } finally {
    stopAlive = true;
    await P.ctx.close().catch(() => {});
  }
}
