/* ═══ THE HARVEST'S BAR: GREEN, AT THE RESOURCE, "7/10", IN THE WHEEL (v2.3.3035) ═══
 *
 * Owner, 2026-10-05: "I want resource harvesting bar to be green and to appear
 * above the resource, not the player head. It should also list the numbers on
 * the bar right now the bar has no numbers."
 *
 * On a phone (390 x 844, 3x) in the Wheel, for a tree, a copper vein and a
 * minnow spot on the commons: walk up, tap, and while the hits land --
 *   1. the bar is up on the worker's hits, reading "<hp>/<its HP>", its fill
 *      the green one;
 *   2. it is at the RESOURCE: over the crown, sitting on the rock's top (the
 *      miner stands right behind it), over the spot's school -- centred on it,
 *      and far from where v2.3.3027 put it, over your head;
 *   3. at ready it reads "0/<HP>", and the gesture still finishes and the
 *      worker pays.
 * Pictures mid-hits: tools/qa/mp/out/harvestbar-<tag>-<skill>.png, <tag> from
 * QA_SHOT_TAG (run once against main's build, QA_DIST, for "before").
 * QA_HB_TYPES=oreVein (any of tree, oreVein, fishSpot) runs just those.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const STAND = { oreVein: [0, -70], tree: [0, -130], fishSpot: [52, -43] };
const SKILL = { oreVein: 'mining', tree: 'woodcutting', fishSpot: 'fishing' };
const RES = { oreVein: 'ore_', tree: 'wood_', fishSpot: 'fish_' };

const srvInv = async (wsPort, id) => {
  const a = await H.adminPlayer(wsPort, id).catch(() => ({}));
  return (a && (a.inventory || (a.rpg && a.rpg.inventory) || (a.live && a.live.inventory))) || {};
};
const sumPrefix = (inv, pre) => Object.keys(inv || {}).filter((k) => k.indexOf(pre) === 0)
  .reduce((n, k) => n + (inv[k] || 0), 0);

/* mp-wheelnodes' walk: H.hopTo's 100 px a hop, checked against the worker */
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

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const TAG = process.env.QA_SHOT_TAG || 'after';
  const P = await H.newPlayer(browser, { name: 'Barbro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();
  try {
    await H.enterWorld(P);
    const myId = await H.readState(P, (S) => S.myId);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading, n: (S.gatherNodes || []).length }),
      (v) => v.zone === 'wheel' && !v.loading && v.n > 0, { timeout: 120000, label: 'into the Wheel, its nodes in' }).catch(() => null);
    rec.ok('in the Wheel, with its resources (guard)', !!inW, inW);
    if (!inW) return;
    await P.page.addStyleTag({ content:
      '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    for (const k of ['woodcutting_axe', 'fishing_pole', 'mining_pickaxe']) await H.grant(wsPort, myId, 'item', { invKey: k, count: 1 }).catch(() => {});
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 });
    await H.waitFor(P, (S) => ['woodcutting_axe', 'fishing_pole', 'mining_pickaxe'].filter((k) => ((S.rpg || {}).inventory || {})[k] > 0).length,
      (n) => n === 3, { timeout: 20000, label: 'the tools' }).catch(() => 0);
    await closeTalk(P);
    const TYPES = (process.env.QA_HB_TYPES || 'tree,oreVein,fishSpot').split(',');
    for (const type of TYPES) {
      const skill = SKILL[type];
      /* the nearest of its kind on the commons (tier 1) */
      const node = await P.page.evaluate((t) => {
        const S = window._gameState.current, p = S.player;
        let best = null, d = Infinity;
        for (const n of S.gatherNodes || []) {
          if (n.nodeType !== t || !n.alive || (n.gatherLvl || 1) !== 1) continue;
          const dd = Math.hypot(n.x - p.x, n.y - p.y);
          if (dd < d) { d = dd; best = { id: n.id, x: n.x, y: n.y, d: Math.round(dd) }; }
        }
        return best;
      }, type);
      rec.ok(`${skill}: a tier-1 ${type} on the commons (guard)`, !!node, node);
      if (!node) continue;
      await travel(P, wsPort, myId, node.x + STAND[type][0], node.y + STAND[type][1]);
      await closeTalk(P);
      const invBefore = await srvInv(wsPort, myId);
      await P.page.evaluate(() => { const S = window._gameState.current; S._monstersStash = S.monsters; S.monsters = []; });
      await tapNode(P, node.id, (S) => !!S._extraction);
      const started = await H.readState(P, (S) => (S._extraction ? S._extraction.skill : null));
      rec.ok(`${skill}: tapping it starts the harvest (guard)`, started === skill, { started });
      if (started !== skill) continue;
      /* A hit in, then the bar AT REST between two hits, as a phone shows it
         -- part-way down, its numbers mid-count, the hit's white flash
         (HPBAR_FLASH_MS, 160) over and the white trail of the HP just lost
         drained -- held right there, so the picture is that frame and the
         reading is the same one.  This box draws ~2 frames a second, about
         the pace of the hits, so nearly every frame it draws is a hit's,
         flash and all; and the trail drains a fixed step a FRAME (a phone
         clears it in ~0.2 s).  So, for the picture only, the hits still to
         come are put back 7 s (their times and the window's with them: the
         worker takes a strike late as readily as on time), the bar is let
         settle, and the frame is held with nothing due. */
      const bar = await P.page.evaluate(async () => {
        const S = window._gameState.current;
        const raf = () => new Promise((res) => requestAnimationFrame(res));
        const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
        for (let i = 0; i < 600; i++) {
          const ex = S._extraction, h = ex && ex.hits;
          if (!ex || ex.status !== 'waiting') return { err: 'the hits ran out first', status: ex ? ex.status : null };
          if (!h || !h.plan || h.shown < 1 || h.shown >= h.plan.length) { await sleep(20); continue; }
          /* long enough that nothing falls due through the settle, the hold,
             the frame already asked for and the picture (~5 s here) */
          const PAUSE = 7000;
          for (let k = h.shown; k < h.times.length; k++) h.times[k] += PAUSE;
          ex.windowOpensAt += PAUSE; ex.windowClosesAt += PAUSE;
          await sleep(3500);
          await raf();
          const w = window;
          w.__hbHeld = [];
          w.__hbRaf = w.requestAnimationFrame;
          w.requestAnimationFrame = (cb) => { w.__hbHeld.push(cb); return 0; };
          await sleep(900);   /* the frame the game had already asked for is drawn too, with nothing due */
          const b = window.__btNodeHpBar ? Object.assign({}, window.__btNodeHpBar) : {};
          const cv = document.querySelector('canvas').getBoundingClientRect();
          const sx = S._worldScaleX || 1, sy = S._worldScaleY || 1;
          const toScreen = (x, y) => ({ x: cv.left + (x - S.camera.x) * sx, y: cv.top + (y - S.camera.y) * sy });
          return { b, shown: h.shown, hp: h.hp, max: h.maxHp, player: { x: S.player.x, y: S.player.y },
            node: ex.nodeRef ? { x: ex.nodeRef.x, y: ex.nodeRef.y } : null,
            scr: ex.nodeRef ? toScreen(ex.nodeRef.x, ex.nodeRef.y) : null, sx };
        }
        return { err: 'no hit came' };
      });
      if (bar.scr) {
        const W = 260, Hh = 260;
        const x = Math.max(0, Math.min(PHONE.width - W, Math.round(bar.scr.x - W / 2)));
        const y = Math.max(0, Math.min(PHONE.height - Hh, Math.round(bar.scr.y - 190)));
        await P.page.screenshot({ path: join(OUT, `harvestbar-${TAG}-${skill}.png`), clip: { x, y, width: W, height: Hh } }).catch(() => {});
      }
      await P.page.evaluate(() => {
        const w = window;
        const held = w.__hbHeld;
        if (!held) return;
        w.requestAnimationFrame = w.__hbRaf;
        w.__hbHeld = null;
        held.forEach((cb) => w.requestAnimationFrame(cb));
      }).catch(() => {});
      const mid = bar.err ? null : { shown: bar.shown, hp: bar.hp, max: bar.max };
      const b = bar.b || {};
      rec.ok(`${skill}: the bar is up on the worker's hits, green, reading "${b.text}" (${bar.hp} of ${bar.max} left)`,
        !!mid && b.show === true && b.mode === 'hits' && b.green === true && b.text === bar.hp + '/' + bar.max && bar.hp < bar.max,
        { mid, bar: b });
      const clear = b.artTop != null ? b.artTop - (b.y + b.h / 2) : NaN;
      const wantX = bar.node ? bar.node.x + (type === 'fishSpot' ? -30 : 0) : NaN;
      rec.ok(`${skill}: ...at the resource (${b.sit ? 'sitting on its top' : 'its bottom ' + Math.round(clear) + ' world px over the top of its art'}), centred on it`,
        Math.abs(b.x - wantX) < 1 && (b.sit ? Math.abs(b.y - (b.artTop + 12)) < 1 : clear > 0 && clear < 12),
        { bar: b, clear, wantX });
      /* and not over your head, where v2.3.3027 had it (~143 world px over
         your boots): the miner and the angler are you, so the bar's bottom
         must not be up over your head, ~50 world px over your centre.  The
         lumberjack is a stand-in beside the trunk, so a tree has no "you"
         to test against here (mp-gatherhits holds it to the crown). */
      if (type !== 'tree') {
        const overHead = Math.abs(b.x - bar.player.x) < 30 && (b.y + b.h / 2) < bar.player.y - 50;
        rec.ok(`${skill}: ...not over your head any more`, !overHead, { bar: { x: b.x, y: b.y, h: b.h }, player: bar.player });
      }
      /* at ready, "0/<HP>", then the gesture pays */
      const opened = await H.waitFor(P, (S) => (S._extraction ? S._extraction.status : null), (v) => v === 'ready',
        { timeout: 70000, label: 'the window opens' }).catch(() => null);
      const atReady = await P.page.evaluate(async () => {
        await new Promise((res) => requestAnimationFrame(res));
        return window.__btNodeHpBar ? Object.assign({}, window.__btNodeHpBar) : null;
      });
      rec.ok(`${skill}: at ready it reads "0/${bar.max}"`, opened === 'ready' && !!atReady && atReady.text === '0/' + bar.max, { opened, atReady });
      const cue = await P.page.evaluate(() => (window.__btHarvest ? window.__btHarvest().cue : null));
      const g = await P.page.evaluate(([sk, cx, cy]) => {
        const S = window._gameState.current;
        const ev = (t, x, y) => window.dispatchEvent(new PointerEvent(t, { pointerId: 9, clientX: x, clientY: y,
          pointerType: 'touch', bubbles: true, cancelable: true, isPrimary: true }));
        ev('pointerdown', cx, cy);
        const t0 = performance.now();
        let step = 0, lastProg = 0, next = t0;
        while (performance.now() - t0 < 12000) {
          while (performance.now() < next) { /* the phone's 16 ms */ }
          next += 16;
          let x = cx, y = cy;
          if (sk === 'fishing') {
            const a = step * (Math.PI / 6);
            x = cx + Math.cos(a) * 28; y = cy + Math.sin(a) * 28;
          } else {
            const k = step % 12, v = k < 6 ? -26 + 52 * k / 6 : 26 - 52 * (k - 6) / 6;
            if (sk === 'woodcutting') { x = cx + v; y = cy + Math.sin(step) * 3; } else { y = cy + v; x = cx + Math.sin(step) * 3; }
          }
          ev('pointermove', x, y);
          step++;
          const ex = S._extraction;
          if (ex) lastProg = ex.progress || 0;
          if (!ex || ex.status !== 'ready' || lastProg >= 1) break;
        }
        ev('pointerup', cx, cy);
        return { lastProg: +lastProg.toFixed(2), ms: Math.round(performance.now() - t0) };
      }, [skill, cue ? cue.x : 200, cue ? cue.y : 700]);
      let got = 0;
      for (let i = 0; i < 20 && got <= 0; i++) {
        got = sumPrefix(await srvInv(wsPort, myId), RES[type]) - sumPrefix(invBefore, RES[type]);
        if (got <= 0) await P.page.waitForTimeout(400);
      }
      rec.ok(`${skill}: the gesture finishes it and the worker pays`, got > 0, { g, got });
      await P.page.evaluate(() => { const S = window._gameState.current; if (S._monstersStash) { S.monsters = S._monstersStash; S._monstersStash = null; } });
    }
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    stopAlive = true;
    await P.ctx.close().catch(() => {});
  }
}
