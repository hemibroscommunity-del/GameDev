/* ═══ NOTHING THE WORKER SETTLES IS LOST TO A DEAD CONNECTION (v2.3.3034) ═══
 *
 * Owner, 2026-10-05: "Logs aren't going to the inventory after getting
 * chopped, and points in point stat allocation menu weren't getting
 * allocated. It was a game where screen had gone black then came back from
 * low memory if that matters."  And the harvest bar "has no numbers" -- the
 * bar of a harvest whose hits the worker never sent.
 *
 * A chop and a point spend are both actions the client sends and the WORKER
 * settles (node_strike, prog3_allocate).  This plays, on a phone in the Wheel,
 * each way a session comes back from a black screen, and each way it can lose
 * the server while the game plays on, and after each one spends a point and
 * chops a tree, asking the WORKER what it did:
 *   A-C. the renderer rebuilt in place, the recovery reload, a graphics
 *        context lost and restored: all three settle (they always did --
 *        measured on main before the fix);
 *   F.   a thumb HELD on the stick is a player: no idle logout under it (it
 *        logged out two minutes into a walk);
 *   D.   the idle logout itself: the page says so, a tree tapped while out is
 *        refused with "Reconnecting...", and that touch brings the session
 *        back -- it played on, losing both, before;
 *   E.   a dead pipe (the relay below black-holes the connection under an
 *        OPEN socket, with a chop's window open): the page notices and
 *        rejoins, and the strike that went down it is paid after all -- 20 s
 *        into one, main still read "connected".
 * QA_RECOVER_ONLY=DE (any of A-F) runs just those parts, after the baseline.
 */
import * as H from './harness.mjs';
import net from 'node:net';

/* A plain TCP relay between the page and the worker, so a test can make the
   pipe go dead under an OPEN socket: freeze() black-holes every byte of the
   connections open now, both ways, and closes nothing -- what a phone's
   socket looks like when the network under it is gone and nobody said so.
   A connection made after the freeze is relayed normally. */
async function startRelay(targetPort) {
  const pairs = new Set();
  const server = net.createServer((c) => {
    const u = net.connect(targetPort, '127.0.0.1');
    const pair = { c, u, frozen: false };
    pairs.add(pair);
    c.on('data', (d) => { if (!pair.frozen) u.write(d); });
    u.on('data', (d) => { if (!pair.frozen) c.write(d); });
    const end = () => { pairs.delete(pair); c.destroy(); u.destroy(); };
    c.on('close', end); u.on('close', end);
    c.on('error', () => {}); u.on('error', () => {});
  });
  await new Promise((res) => server.listen(0, '127.0.0.1', res));
  return {
    port: server.address().port,
    freeze() { let n = 0; for (const p of pairs) { p.frozen = true; n++; } return n; },
    close() { for (const p of pairs) { p.c.destroy(); p.u.destroy(); } server.close(); },
  };
}

const PHONE = { width: 390, height: 844 };
const STAND_TREE = [0, -130];

const srvBlob = async (wsPort, id) => {
  const a = await H.adminPlayer(wsPort, id).catch(() => ({}));
  return a || {};
};
const invOf = (a) => (a && (a.inventory || (a.rpg && a.rpg.inventory) || (a.live && a.live.inventory))) || {};
const woodOf = (inv) => Object.keys(inv || {}).filter((k) => k.indexOf('wood_') === 0).reduce((n, k) => n + (inv[k] || 0), 0);
const allocOf = (a) => {
  const p3 = (a && a.rpg && a.rpg.prog3) || null;
  if (!p3) return null;
  const al = p3.alloc || {};
  return { hp: al.hp || 0, pool: p3.pool || 0, shared: p3.shared || 0, poolBy: p3.poolBy || null };
};

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

const netState = (P) => P.page.evaluate(() => {
  const S = window._gameState && window._gameState.current;
  if (!S) return null;
  return {
    status: S._realtimeStatus || null,
    live: !!(S.channel && S.channel.isLive && S.channel.isLive()),
    channel: !!S.channel,
    zone: S.currentZone, loading: !!S._zoneLoading, netHold: !!S._netHold,
    banner: !!document.getElementById('bt-resume-banner'),
    serverNodes: !!S._serverGatherNodes, nodes: (S.gatherNodes || []).length,
    pixi: window.__pixiActive, epoch: window.__btLastGlRebuild || 0,
  };
}).catch((e) => ({ err: String(e && e.message || e) }));

async function spendOne(P, wsPort, myId, rec, label) {
  const before = allocOf(await srvBlob(wsPort, myId));
  const sent = await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (!S || !S.channel) return { sent: false, why: 'no channel' };
    S.channel.send({ type: 'prog3_allocate', payload: { stat: 'hp', cat: 'sword' } });
    return { sent: true };
  });
  let after = before;
  for (let i = 0; i < 20; i++) {
    await P.page.waitForTimeout(300);
    after = allocOf(await srvBlob(wsPort, myId));
    if (after && before && after.hp > before.hp) break;
  }
  const net = await netState(P);
  rec.ok(`${label}: a point spent on HP is allocated by the worker`, !!(after && before && after.hp === before.hp + 1),
    { before, after, sent, net });
}

/* Walk to the nearest live tree, tap it, play the chop's gesture, and ask the
   worker whether it paid a log.  `opts.beforeGesture` runs once the window is
   open (the dead pipe is made there); `opts.payWithin` is how long to wait
   for the pay. */
async function chopOne(P, wsPort, myId, rec, label, opts = {}) {
  const tree = await P.page.evaluate(() => {
    const S = window._gameState.current, p = S.player;
    let best = null, d = Infinity;
    for (const n of S.gatherNodes || []) {
      if (n.nodeType !== 'tree' || !n.alive) continue;
      const dd = Math.hypot(n.x - p.x, n.y - p.y);
      if (dd < d) { d = dd; best = { id: n.id, x: n.x, y: n.y, tier: n.gatherLvl, d: Math.round(dd) }; }
    }
    return best;
  });
  if (!tree) { rec.ok(`${label}: a tree to chop (guard)`, false, { net: await netState(P) }); return; }
  await travel(P, wsPort, myId, tree.x + STAND_TREE[0], tree.y + STAND_TREE[1]);
  await closeTalk(P);
  const invBefore = invOf(await srvBlob(wsPort, myId));
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S._monstersStash = S.monsters; S.monsters = [];
  });
  await tapNode(P, tree.id, (S) => !!S._extraction);
  const started = await H.readState(P, (S) => (S._extraction ? S._extraction.skill : null));
  if (started !== 'woodcutting') {
    rec.ok(`${label}: tapping a tree starts a chop (guard)`, false, { started, tree, net: await netState(P) });
    return;
  }
  const opened = await H.waitFor(P, (S) => (S._extraction ? S._extraction.status : null), (v) => v === 'ready',
    { timeout: 70000, label: 'the window opens' }).catch(() => null);
  if (opened !== 'ready') {
    rec.ok(`${label}: the chop's hits run down (guard)`, false, { opened, net: await netState(P) });
    return;
  }
  const bar = await P.page.evaluate(() => (window.__btNodeHpBar ? Object.assign({}, window.__btNodeHpBar) : null));
  if (opts.beforeGesture) await opts.beforeGesture();
  const cue = await P.page.evaluate(() => (window.__btHarvest ? window.__btHarvest().cue : null));
  const g = await P.page.evaluate(([cx, cy]) => {
    const S = window._gameState.current;
    const ev = (t, x, y) => window.dispatchEvent(new PointerEvent(t, { pointerId: 9, clientX: x, clientY: y,
      pointerType: 'touch', bubbles: true, cancelable: true, isPrimary: true }));
    ev('pointerdown', cx, cy);
    const t0 = performance.now();
    let step = 0, lastProg = 0, next = t0;
    while (performance.now() - t0 < 12000) {
      while (performance.now() < next) { /* the phone's 16 ms */ }
      next += 16;
      const k = step % 12, v = k < 6 ? -26 + 52 * k / 6 : 26 - 52 * (k - 6) / 6;
      ev('pointermove', cx + v, cy + Math.sin(step) * 3);
      step++;
      const ex = S._extraction;
      if (ex) lastProg = ex.progress || 0;
      if (!ex || ex.status !== 'ready' || lastProg >= 1) break;
    }
    ev('pointerup', cx, cy);
    return { lastProg: +lastProg.toFixed(2), ms: Math.round(performance.now() - t0), moves: step };
  }, [cue ? cue.x : 200, cue ? cue.y : 700]);
  const ended = await H.waitFor(P, (S) => !S._extraction, (v) => v === true, { timeout: 8000, label: 'the harvest ends' }).catch(() => false);
  let got = 0, inv = null;
  const t0 = Date.now();
  while (Date.now() - t0 < (opts.payWithin || 8000)) {
    inv = invOf(await srvBlob(wsPort, myId));
    got = woodOf(inv) - woodOf(invBefore);
    if (got > 0) break;
    await P.page.waitForTimeout(400);
  }
  const a = await srvBlob(wsPort, myId);
  const L = (a && a.live) || {};
  rec.ok(`${label}: the chop completes and the worker pays a log`, ended === true && got > 0,
    { g, ended, got, tree, paidInMs: got > 0 ? Date.now() - t0 : null, lastStrike: L.lastStrike || null,
      srv: { zone: L.zone, x: L.x, y: L.y, online: a.online }, net: await netState(P) });
  /* the bar the hits were played on: the worker's plan, with its numbers --
     a bar on the timer is a harvest the worker was never asked about */
  rec.ok(`${label}: ...on the worker's hits (the bar read "${bar && bar.mode}")`, !!bar && bar.mode === 'hits', bar);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S._monstersStash) { S.monsters = S._monstersStash; S._monstersStash = null; }
  });
}

const intoWheel = (P) => H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading, n: (S.gatherNodes || []).length, hold: !!S._netHold }),
  (v) => v.zone === 'wheel' && !v.loading && v.n > 0 && !v.hold, { timeout: 120000, label: 'into the Wheel, its nodes in' }).catch(() => null);

export async function run({ browser, wsPort, webPort, rec }) {
  const relay = await startRelay(wsPort);
  const P = await H.newPlayer(browser, { name: 'Recoverbro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel',
    init: `window.BROTOWN_WS_URL = 'ws://127.0.0.1:${relay.port}';` });
  const ONLY = process.env.QA_RECOVER_ONLY || '';
  const want = (k) => !ONLY || ONLY.indexOf(k) >= 0;
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
    const inW = await intoWheel(P);
    rec.ok('in the Wheel (guard)', !!inW, inW);
    if (!inW) return;
    await P.page.addStyleTag({ content:
      '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    await H.grant(wsPort, myId, 'item', { invKey: 'woodcutting_axe', count: 1 }).catch(() => {});
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 });
    await H.devOp(wsPort, 'kit', myId, { what: 'levels' });
    await H.waitFor(P, (S) => ((S.rpg || {}).inventory || {}).woodcutting_axe > 0, (v) => v === true, { timeout: 20000, label: 'the axe' }).catch(() => null);
    await closeTalk(P);
    console.log('    start: ' + JSON.stringify({ alloc: allocOf(await srvBlob(wsPort, myId)), net: await netState(P) }));

    /* 0. no recovery */
    await spendOne(P, wsPort, myId, rec, 'before any black screen');
    await chopOne(P, wsPort, myId, rec, 'before any black screen');

    if (want('A')) {
    /* A. the watchdog's first answer: the in-place renderer rebuild */
    await P.page.evaluate(() => { window.__btLastGlRebuild = 0; if (window._rebuildRenderer) window._rebuildRenderer('qa: in-place rebuild'); });
    await P.page.waitForTimeout(6000);
    const backA = await intoWheel(P);
    console.log('    after rebuild: ' + JSON.stringify(await netState(P)));
    rec.ok('after the in-place rebuild, still in the Wheel (guard)', !!backA, backA);
    await spendOne(P, wsPort, myId, rec, 'after the in-place rebuild');
    await chopOne(P, wsPort, myId, rec, 'after the in-place rebuild');
    }

    if (want('B')) {
    /* B. the watchdog's second answer: the recovery reload (BroTown.jsx
       _recoveryReload, verbatim in what it leaves behind) */
    await P.page.evaluate(() => {
      sessionStorage.setItem('bt_resume_now', '1');
      const g = /[?&]guest=1\b/.test(window.location.search) ? '?guest=1' : '';
      window.location.replace(window.location.pathname + g);
    });
    await P.page.waitForTimeout(4000);
    await P.page.waitForFunction(() => !!(window._gameState && window._gameState.current && window._gameState.current.player), null, { timeout: 120000 }).catch(() => {});
    const backB = await intoWheel(P);
    console.log('    after reload: ' + JSON.stringify(await netState(P)));
    rec.ok('after the recovery reload, back in the Wheel (guard)', !!backB, backB);
    await P.page.addStyleTag({ content:
      '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    await closeTalk(P);
    await spendOne(P, wsPort, myId, rec, 'after the recovery reload');
    await chopOne(P, wsPort, myId, rec, 'after the recovery reload');
    }

    if (want('C')) {
    /* C. the GL context lost and restored (an iOS graphics reset) */
    await P.page.evaluate(() => {
      const r = window._pixiRenderer;
      const gl = r && r.app && r.app.renderer && r.app.renderer.gl;
      const ext = gl && gl.getExtension('WEBGL_lose_context');
      if (ext) { ext.loseContext(); setTimeout(() => { try { ext.restoreContext(); } catch (e) {} }, 2500); }
    });
    await P.page.waitForTimeout(15000);
    const backC = await intoWheel(P);
    console.log('    after context loss: ' + JSON.stringify(await netState(P)));
    rec.ok('after the context loss, still in the Wheel (guard)', !!backC, backC);
    await spendOne(P, wsPort, myId, rec, 'after a context loss');
    await chopOne(P, wsPort, myId, rec, 'after a context loss');
    }

    if (want('F')) {
    /* F. a thumb held on the stick: two minutes of it is a walk, not an
       absence.  The idle clock is set two minutes back, as two minutes of a
       held stick leaves it, and the stick held for the 2 s check. */
    await P.page.evaluate(() => {
      const S = window._gameState.current;
      S._lastInputAt = Date.now() - 130000;
      S.stickX = 0.25; S.stickY = 0;
    });
    await P.page.waitForTimeout(4500);
    const held = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const out = { sinceInput: Date.now() - (S._lastInputAt || 0), status: S._realtimeStatus,
        live: !!(S.channel && S.channel.isLive && S.channel.isLive()), banner: !!document.getElementById('bt-resume-banner') };
      S.stickX = 0; S.stickY = 0;
      return out;
    });
    rec.ok('a thumb held on the stick is a player: no idle logout under it', held.live === true && held.status === 'connected'
      && held.banner === false && held.sinceInput < 3000, held);
    }

    if (want('D')) {
    /* D. the page's own idle logout (two minutes with no touch: a black
       screen waited out) */
    await P.page.evaluate(() => { const S = window._gameState.current; if (S.channel && S.channel.idleLogout) S.channel.idleLogout(); });
    await P.page.waitForTimeout(2500);
    const out = await netState(P);
    rec.ok('the idle logout logs out and says so (guard)', out && out.status === 'idle' && out.live === false && out.banner === true, out);
    /* a tree tapped while logged out: refused, said, and that very touch is
       the player coming back */
    const tree = await P.page.evaluate(() => {
      const S = window._gameState.current, p = S.player;
      let best = null, d = Infinity;
      for (const n of S.gatherNodes || []) {
        if (n.nodeType !== 'tree' || !n.alive) continue;
        const dd = Math.hypot(n.x - p.x, n.y - p.y);
        if (dd < d) { d = dd; best = { id: n.id, x: n.x, y: n.y }; }
      }
      return best;
    });
    if (tree) {
      await P.page.evaluate(({ x, y }) => { const S = window._gameState.current; S.player.x = x; S.player.y = y; S.player.vx = 0; S.player.vy = 0; },
        { x: tree.x + STAND_TREE[0], y: tree.y + STAND_TREE[1] });
      await P.page.waitForTimeout(400);
      const n0 = await P.page.evaluate(() => window._gameState.current.dmgNumbers.filter((p) => /^Reconnecting/.test(p.text)).length);
      await tapNode(P, tree.id, (S) => !!S._extraction, 1);
      const tapped = await P.page.evaluate((k) => {
        const S = window._gameState.current;
        return { started: S._extraction ? S._extraction.skill : null,
          said: S.dmgNumbers.filter((p) => /^Reconnecting/.test(p.text)).length - k };
      }, n0);
      rec.ok('a tree tapped while logged out is not chopped: "Reconnecting..." over your head', tapped.started === null && tapped.said >= 1, tapped);
    } else {
      rec.ok('a tree near you (guard)', false, {});
    }
    const back = await H.waitFor(P, (S) => ({ status: S._realtimeStatus, live: !!(S.channel && S.channel.isLive()), hold: !!S._netHold,
      banner: !!document.getElementById('bt-resume-banner') }),
      (v) => v.status === 'connected' && v.live && !v.hold && !v.banner, { timeout: 20000, label: 'back in' }).catch(() => null);
    rec.ok('...and that touch brought the session back, banner and all', !!back, back || await netState(P));
    await intoWheel(P);
    await spendOne(P, wsPort, myId, rec, 'back from the idle logout');
    await chopOne(P, wsPort, myId, rec, 'back from the idle logout');
    }

    if (want('E')) {
    /* E. a dead pipe: the socket still reads OPEN, nothing goes out and
       nothing comes in (the network under a phone's socket gone, and nobody
       told the page) -- made under a chop whose window is open, so its
       strike goes down the dead pipe */
    let frozenAt = 0;
    await chopOne(P, wsPort, myId, rec, 'a strike lost in a dead pipe', {
      payWithin: 40000,
      beforeGesture: async () => { frozenAt = Date.now(); console.log('    pipe frozen: ' + relay.freeze() + ' connection(s)'); },
    });
    const noticed = await P.page.evaluate(() => window.__btDeadPipes || null);
    console.log('    the page after the dead pipe: ' + JSON.stringify({ net: await netState(P), sinceFreezeMs: Date.now() - frozenAt, noticed }));
    rec.ok('the page noticed the dead pipe and is back on a live one', !!(await H.waitFor(P,
      (S) => S._realtimeStatus === 'connected' && !!(S.channel && S.channel.isLive()) && !S._netHold, (v) => v === true,
      { timeout: 30000, label: 'live again' }).catch(() => null)), await netState(P));
    await spendOne(P, wsPort, myId, rec, 'after the dead pipe');
    }

    rec.ok('no page errors', errors.length === 0, errors.slice(0, 6));
  } finally {
    stopAlive = true;
    await P.ctx.close().catch(() => {});
    relay.close();
  }
}
