/* ═══ v2.3.3572: A HARVEST'S SWIPE MOMENT IS QUIET ═══
 *
 * The owner, 2026-10-22: "Also there's a splat sound when the ore is ready for
 * the gesture cue (reaches 0hp).  At least I think that's when it happened.
 * But it needs to be removed."
 *
 * The sound was the `gatherReady` cue (v2.3.3343: a slice of sword-hit2 at
 * 1.6x), started by BroTown.jsx the frame a harvest's window opened -- a rock,
 * a tree or a cook, the moment the last hit takes it to 0.  On a phone in the
 * world, a copper rock on the commons mined to the end, every sound the game
 * starts recorded by its own log (window.__btSoundStudio.heard(), what the
 * Sound studio's "Heard just now" reads):
 *   1. the rock reaches 0 and the window opens (the harvest's own status);
 *   2. nothing starts as it opens: no `cue:gatherReady`, no sword-hit2, from
 *      the last hit to well after the window opened -- the hits' own sounds
 *      before it are the swings', and the crack after it is the break's;
 *   3. the gesture still finishes it: the worker pays the copper and the rock
 *      cracks as it splits (yours, full voice) -- only the one sound is gone;
 *   4. no page errors.
 * QA_GQ_EXPECT=ring runs the same steps and wants the cue (the build before);
 * QA_GQ_TRACE=1 prints every sound started round the window's opening.
 *
 *   node tools/qa/mp/run.mjs gatherquiet
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const STAND = [0, -70];   /* mp-nodelabels' miner's spot by a vein */
/* how long after the window opens a sound counts as ITS sound */
const AFTER_MS = 1500;

const srvInv = async (wsPort, id) => {
  const a = await H.adminPlayer(wsPort, id).catch(() => ({}));
  return (a && (a.inventory || (a.rpg && a.rpg.inventory) || (a.live && a.live.inventory))) || {};
};

/* mp-nodelabels' walk */
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
  const ring = process.env.QA_GQ_EXPECT === 'ring';
  const P = await H.newPlayer(browser, { name: 'Quietbro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String(e && e.message || e)));
  let stopAlive = false;
  try {
    await H.enterWorld(P);
    let inWheel = false;
    for (let i = 0; i < 120 && !inWheel; i++) {
      inWheel = (await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone))) === 'wheel';
      if (!inWheel) await P.page.waitForTimeout(500);
    }
    (async () => { while (!stopAlive) { await P.page.keyboard.press('Control').catch(() => {}); for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {}); } })();
    await P.page.waitForTimeout(1500);
    const myId = await H.readState(P, (S) => S.myId);
    await H.grant(wsPort, myId, 'item', { invKey: 'mining_pickaxe', count: 1 });
    await H.waitFor(P, (S) => ((S.rpg && S.rpg.inventory) || {}).mining_pickaxe || 0, (v) => v >= 1, { timeout: 15000, label: 'the pickaxe' }).catch(() => 0);

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
    rec.ok('a copper rock on the commons (guard)', !!vein, vein);
    if (!vein) return;
    await travel(P, wsPort, myId, vein.x + STAND[0], vein.y + STAND[1]);
    await closeTalk(P);
    const invBefore = await srvInv(wsPort, myId);
    /* no monster in the way (mp-nodelabels'), and the sound log emptied */
    await P.page.evaluate(() => {
      const S = window._gameState.current; S._monstersStash = S.monsters; S.monsters = []; window.__btOreCracks = [];
      try { window.__btSoundStudio.clear(); } catch (e) { /* no log */ }
    });
    await tapNode(P, vein.id, (S) => !!S._extraction);
    const started = await H.readState(P, (S) => (S._extraction ? S._extraction.skill : null));
    rec.ok('mining: tapping it starts the harvest (guard)', started === 'mining', { started });
    if (started !== 'mining') return;

    /* ── 1. the rock reaches 0 and the window opens ── */
    const opened = await H.waitFor(P, (S) => {
      const ex = S._extraction;
      return ex ? { status: ex.status, readyAt: ex.readyAt || 0, hp: ex.hits ? ex.hits.hp : null, lastHitAt: ex.hits ? ex.hits.lastHitAt || 0 : 0 } : null;
    }, (v) => !!v && v.status === 'ready', { timeout: 70000, label: 'the window opens' }).catch(() => null);
    rec.ok(`1. the rock reaches 0 and the window opens (its HP ${opened ? opened.hp : '?'})`, !!opened && opened.hp === 0, opened);
    /* the log a beat after it opened: what started at the opening */
    await P.page.waitForTimeout(AFTER_MS);
    const heard = await P.page.evaluate(() => (window.__btSoundStudio ? window.__btSoundStudio.heard() : null));
    const at = opened ? opened.readyAt : 0;
    const near = (heard || []).filter((e) => e.at >= at - 60 && e.at <= at + AFTER_MS);
    const ready = near.filter((e) => e.tag === 'cue:gatherReady' || e.key === 'sword-hit2');
    const before = (heard || []).filter((e) => e.at < at - 60).map((e) => e.tag || e.key);
    if (process.env.QA_GQ_TRACE) console.log('GATHER-QUIET', JSON.stringify({ at, lastHitAt: opened && opened.lastHitAt, near: near.map((e) => [e.tag || e.key, e.key, e.at - at]), before: (heard || []).filter((e) => e.at < at - 60).slice(-8).map((e) => [e.tag || e.key, e.key, e.at - at]) }));
    if (ring) {
      rec.ok(`2'. (the build before) the window's opening starts the cue (${ready.map((e) => e.tag || e.key).join(', ') || 'nothing'})`,
        ready.length >= 1, { near, before: before.slice(-6) });
    } else {
      rec.ok(`2. nothing starts as the window opens: no cue:gatherReady, no sword-hit2 (started then: ${near.map((e) => e.tag || e.key).join(', ') || 'nothing'})`,
        !!heard && ready.length === 0, { near, before: before.slice(-6) });
    }

    /* ── 3. the gesture still finishes it ── */
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
    rec.ok('3. the gesture still finishes it: the worker pays the copper, and the rock cracks as it splits (yours, full voice)',
      got > 0 && cracks.length >= 1 && cracks[0].self === true && cracks[0].vol > 0.6, { got, cracks });
    await P.page.evaluate(() => { const S = window._gameState.current; if (S._monstersStash) { S.monsters = S._monstersStash; S._monstersStash = null; } });
    rec.ok('4. no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    stopAlive = true;
    await P.ctx.close().catch(() => {});
  }
}
