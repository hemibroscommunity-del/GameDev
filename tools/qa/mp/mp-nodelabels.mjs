/* ═══ THE LABEL OVER EACH RESOURCE, AND ITS LEVEL (v2.3.3038, v2.3.3040) ═══
 *
 * Owner, 2026-10-05: "Add hatchet icon above trees you can chop.  Add pickaxe
 * icon above ore you can mine with its name and level.  Same with fish and
 * tree resources to harvest.  Add cracking sound when the ore splits when
 * user completes the gesture."  And: "black steel now requires a mining level
 * of at least 5 ... Fishing clownfish required fishing level 5."
 *
 * On a phone (390 x 844, 3x) in the Wheel, against a real worker:
 *   1. with the tools in the bag, every resource drawn near you carries ONE
 *      label (nodeLabels.js): the tool's picture, what it gives (its name, as
 *      the bag names it) and "Lv 1" -- the commons' copper, pine and minnows
 *      ask nothing -- in gold; none of the old tier dot / emoji / tips;
 *   2. it is over the art (above the crown, the rock, the school), screen-
 *      sized: about 20 CSS px tall at this zoom;
 *   3. a clownfish spot says "Lv 5", in RED for a Fishing 1 player, and a tap
 *      on it is refused, "Need Fishing Lv 5", no harvest started (the
 *      worker's caps.gatherreq advertised);
 *   4. a copper vein mined to the end hides its label while its bar is up,
 *      CRACKS on the split frame (window.__btOreCracks: yours, full voice),
 *      and the worker pays the ore;
 *   5. no page errors.
 * Pictures: tools/qa/mp/out/nodelabels-{commons,clownfish}.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const STAND = { oreVein: [0, -70], tree: [0, -130], fishSpot: [52, -43] };

const srvInv = async (wsPort, id) => {
  const a = await H.adminPlayer(wsPort, id).catch(() => ({}));
  return (a && (a.inventory || (a.rpg && a.rpg.inventory) || (a.live && a.live.inventory))) || {};
};

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

/* every drawn resource's label, as the page holds it */
const labels = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const ws = S._worldScaleX || 1;
  return (S.gatherNodes || []).filter((n) => n._pixiLabel && !n._pixiLabel.destroyed).map((n) => {
    const L = n._pixiLabel, p = L._nl;
    const b = L.getLocalBounds();
    return {
      id: n.id, type: n.nodeType, tier: n.gatherLvl, req: n.reqLvl, name: n.name,
      visible: !!L.visible, text: p.name.text, lv: p.lv.text, lvFill: String(p.lv.style.fill),
      icon: !!(p.icon && p.icon.texture && !p.icon.texture.destroyed),
      cssH: +(b.height * L.scale.y * ws).toFixed(1),
      footY: +L.y.toFixed(1), nodeY: n.y,
      legacy: !!(n._pixiTier || n._pixiEmoji || n._pixiTip1),
    };
  });
});

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Labelbro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel' });
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
    await P.page.evaluate(() => { window.__btProbe = true; });
    const myId = await H.readState(P, (S) => S.myId);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading, n: (S.gatherNodes || []).length }),
      (v) => v.zone === 'wheel' && !v.loading && v.n > 0, { timeout: 120000, label: 'into the Wheel, its nodes in' }).catch(() => null);
    rec.ok('in the Wheel, with its resources (guard)', !!inW, inW);
    if (!inW) return;
    const caps = await H.readState(P, (S) => !!(S._serverCaps && S._serverCaps.gatherreq === true));
    rec.ok('the worker advertises caps.gatherreq (guard)', caps === true, { caps });
    await P.page.addStyleTag({ content:
      '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    for (const k of ['woodcutting_axe', 'fishing_pole', 'mining_pickaxe']) await H.grant(wsPort, myId, 'item', { invKey: k, count: 1 }).catch(() => {});
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 });
    await H.waitFor(P, (S) => ['woodcutting_axe', 'fishing_pole', 'mining_pickaxe'].filter((k) => ((S.rpg || {}).inventory || {})[k] > 0).length,
      (n) => n === 3, { timeout: 20000, label: 'the tools' }).catch(() => 0);
    await closeTalk(P);

    /* ── 1-2. the commons' labels ── */
    const near = await P.page.evaluate(() => {
      const S = window._gameState.current, p = S.player;
      let best = null, d = Infinity;
      for (const n of S.gatherNodes || []) {
        if (!n.alive || (n.gatherLvl || 1) !== 1) continue;
        const dd = Math.hypot(n.x - p.x, n.y - p.y);
        if (dd < d) { d = dd; best = { id: n.id, x: n.x, y: n.y, type: n.nodeType }; }
      }
      return best;
    });
    if (near) await travel(P, wsPort, myId, near.x + 40, near.y + 140);
    await P.page.waitForTimeout(1200);
    const L1 = await labels(P);
    const shown = L1.filter((l) => l.visible);
    rec.ok(`every resource drawn near you carries a label (${shown.length} shown)`, shown.length >= 1, L1.slice(0, 6));
    const commons = shown.filter((l) => l.tier === 1);
    rec.ok('...each says what it gives (its bag name) and "Lv 1" on the commons, in gold, with its tool\'s picture',
      commons.length >= 1 && commons.every((l) => l.text === l.name && l.lv === 'Lv 1' && /d8aa58/i.test(l.lvFill) && l.icon),
      commons.slice(0, 6));
    rec.ok('...and none of the old tier dot, emoji or 7 px tips is made any more', L1.every((l) => !l.legacy), L1.filter((l) => l.legacy).slice(0, 3));
    rec.ok('...screen-sized: about 20 CSS px tall at this zoom', shown.every((l) => l.cssH > 16 && l.cssH < 26), shown.map((l) => l.cssH));
    rec.ok('...over its art: the label\'s foot is above the node\'s ground point', shown.every((l) => l.footY < l.nodeY - 20), shown.map((l) => ({ id: l.id, footY: l.footY, nodeY: l.nodeY })));
    if (near) {
      const scr = await P.page.evaluate((n) => {
        const S = window._gameState.current;
        const cv = document.querySelector('canvas').getBoundingClientRect();
        return { x: cv.left + (n.x - S.camera.x) * (S._worldScaleX || 1), y: cv.top + (n.y - S.camera.y) * (S._worldScaleY || 1) };
      }, near);
      const W = 300, Hh = 300;
      await P.page.screenshot({ path: join(OUT, 'nodelabels-commons.png'),
        clip: { x: Math.max(0, Math.min(PHONE.width - W, Math.round(scr.x - W / 2))), y: Math.max(0, Math.min(PHONE.height - Hh, Math.round(scr.y - 220))), width: W, height: Hh } }).catch(() => {});
    }

    /* ── 3. a clownfish spot: "Lv 5", red, and refused ── */
    const clown = await P.page.evaluate(() => {
      const S = window._gameState.current, p = S.player;
      let best = null, d = Infinity;
      for (const n of S.gatherNodes || []) {
        if (n.nodeType !== 'fishSpot' || !n.alive || (n.gatherLvl || 1) !== 6) continue;
        const dd = Math.hypot(n.x - p.x, n.y - p.y);
        if (dd < d) { d = dd; best = { id: n.id, x: n.x, y: n.y, d: Math.round(dd) }; }
      }
      return best;
    });
    rec.ok('a clownfish spot in a land\'s levels 1-10 (guard)', !!clown, clown);
    if (clown) {
      await travel(P, wsPort, myId, clown.x + STAND.fishSpot[0], clown.y + STAND.fishSpot[1]);
      await P.page.waitForTimeout(1200);
      const lab = (await labels(P)).find((l) => l.id === clown.id);
      const fishLv = await H.readState(P, (S) => (((S.rpg || {}).lifeSkills || {}).fishing || {}).level || 1);
      rec.ok(`its label says "Clownfish" and "Lv 5", in red for a Fishing ${fishLv} player`,
        !!lab && lab.visible && lab.text === 'Clownfish' && lab.lv === 'Lv 5' && /ff7a6e/i.test(lab.lvFill) && fishLv < 5, { lab, fishLv });
      const scr = await P.page.evaluate((n) => {
        const S = window._gameState.current;
        const cv = document.querySelector('canvas').getBoundingClientRect();
        return { x: cv.left + (n.x - S.camera.x) * (S._worldScaleX || 1), y: cv.top + (n.y - S.camera.y) * (S._worldScaleY || 1) };
      }, clown);
      /* the whole phone screen: the walk may leave the spot anywhere on it */
      void scr;
      await P.page.screenshot({ path: join(OUT, 'nodelabels-clownfish.png') }).catch(() => {});
      /* stand right on its seat, so the tap lands on the spot and not on the
         dashboard: the refusal is the CLIENT's, before anything is sent, so
         the worker's idea of where we are does not enter into it */
      await P.page.evaluate(({ x, y }) => { const S = window._gameState.current; S.player.x = x; S.player.y = y; S.player.vx = 0; S.player.vy = 0; },
        { x: clown.x + STAND.fishSpot[0], y: clown.y + STAND.fishSpot[1] });
      await P.page.waitForTimeout(1500);
      const k0 = await H.readState(P, (S) => S.dmgNumbers.filter((p) => p.text === 'Need Fishing Lv 5').length);
      const started = await tapNode(P, clown.id, (S) => !!S._extraction, 2);
      const said = await H.readState(P, (S) => S.dmgNumbers.filter((p) => p.text === 'Need Fishing Lv 5').length);
      rec.ok('a tap on it is refused before anything is sent: "Need Fishing Lv 5", no harvest started', started === false && said > k0, { started, said, k0 });
    }

    /* ── 4. a copper vein, mined to the end: its label steps aside, it cracks ── */
    const vein = await P.page.evaluate(() => {
      const S = window._gameState.current, p = S.player;
      let best = null, d = Infinity;
      for (const n of S.gatherNodes || []) {
        if (n.nodeType !== 'oreVein' || !n.alive || (n.gatherLvl || 1) !== 1) continue;
        const dd = Math.hypot(n.x - p.x, n.y - p.y);
        if (dd < d) { d = dd; best = { id: n.id, x: n.x, y: n.y }; }
      }
      return best;
    });
    rec.ok('a copper vein on the commons (guard)', !!vein, vein);
    if (vein) {
      await travel(P, wsPort, myId, vein.x + STAND.oreVein[0], vein.y + STAND.oreVein[1]);
      await closeTalk(P);
      const invBefore = await srvInv(wsPort, myId);
      await P.page.evaluate(() => { const S = window._gameState.current; S._monstersStash = S.monsters; S.monsters = []; window.__btOreCracks = []; });
      await tapNode(P, vein.id, (S) => !!S._extraction);
      const started = await H.readState(P, (S) => (S._extraction ? S._extraction.skill : null));
      rec.ok('mining: tapping it starts the harvest (guard)', started === 'mining', { started });
      if (started === 'mining') {
        await H.waitFor(P, (S) => (S._extraction && S._extraction.hits ? S._extraction.hits.shown : 0), (v) => v >= 1, { timeout: 20000, label: 'a hit' }).catch(() => 0);
        const during = (await labels(P)).find((l) => l.id === vein.id);
        rec.ok('...while its bar is up, the vein\'s label steps aside', !during || during.visible === false, during);
        const opened = await H.waitFor(P, (S) => (S._extraction ? S._extraction.status : null), (v) => v === 'ready',
          { timeout: 70000, label: 'the window opens' }).catch(() => null);
        const cue = await P.page.evaluate(() => (window.__btHarvest ? window.__btHarvest().cue : null));
        await P.page.evaluate(([cx, cy]) => {
          const S = window._gameState.current;
          const ev = (t, x, y) => window.dispatchEvent(new PointerEvent(t, { pointerId: 9, clientX: x, clientY: y,
            pointerType: 'touch', bubbles: true, cancelable: true, isPrimary: true }));
          ev('pointerdown', cx, cy);
          const t0 = performance.now();
          let step = 0, next = t0;
          while (performance.now() - t0 < 12000) {
            while (performance.now() < next) { /* the phone's 16 ms */ }
            next += 16;
            const k = step % 12, v = k < 6 ? -26 + 52 * k / 6 : 26 - 52 * (k - 6) / 6;
            ev('pointermove', cx + Math.sin(step) * 3, cy + v);
            step++;
            const ex = S._extraction;
            if (!ex || ex.status !== 'ready' || (ex.progress || 0) >= 1) break;
          }
          ev('pointerup', cx, cy);
        }, [cue ? cue.x : 200, cue ? cue.y : 700]);
        const cracks = await H.waitFor(P, () => window.__btOreCracks || [], (a) => a.length > 0, { timeout: 8000, label: 'the crack' }).catch(() => []);
        let got = 0;
        for (let i = 0; i < 20 && got <= 0; i++) {
          const inv = await srvInv(wsPort, myId);
          got = (inv.ore_copper_ore || 0) - (invBefore.ore_copper_ore || 0);
          if (got <= 0) await P.page.waitForTimeout(400);
        }
        rec.ok('...the gesture finishes it: the worker pays the copper, and the rock CRACKS as it splits (yours, full voice)',
          opened === 'ready' && got > 0 && cracks.length >= 1 && cracks[0].self === true && cracks[0].vol > 0.6, { opened, got, cracks });
      }
      await P.page.evaluate(() => { const S = window._gameState.current; if (S._monstersStash) { S.monsters = S._monstersStash; S._monstersStash = null; } });
    }
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    stopAlive = true;
    await P.ctx.close().catch(() => {});
  }
}
