/* ═══ THE GATHERING HITS, ALL THREE SKILLS, IN A REAL ZONE (v2.3.2956) ═══
 *
 * Owner: "the resource has something akin to an hp bar and the player ticks
 * away at it and the tick range is determined by their skill level ...
 * level 1 would do 1 tick per second (or whatever interval makes the most
 * sense) until the 10 ticks assigned to the resource are exhausted.  At that
 * point the user would have to do the gesture to complete the resource
 * extraction."  "Just add it for every resource gathering process."  And:
 * "Make it appear for cooking too.  And you can remove the status bar above
 * the player head now since the HP-like bar will replace that."
 *
 * server/test/gather-hits.test.mjs pins the worker's dice and its window
 * against a mocked room.  This is the half no fixture can reach (TRAPS #18:
 * ask the worker, not the browser): a real phone client, in Frost Ridge,
 * through the real tap, the real shim and the real worker, for each of
 * mining, woodcutting, fishing and COOKING (a fire lit in town first, where
 * nothing can interrupt it, and a minnow) --
 *   1. the client asks for hits and the worker's plan reaches it, and what
 *      the client plays is EXACTLY what the worker rolled (operator view);
 *   2. one number pops per hit, each hit takes its roll off the node, and the
 *      node's HP bar and the ring on the button follow it down to 0;
 *   3. the hits land ON THE BLOW: each pick and axe hit is held against the
 *      renderer's own strike effect (the rock debris / wood chips it stamps
 *      on the frame the tool lands), never against our own arithmetic
 *      (TRAPS §37); a fishing nibble makes no splash (the owner's "reeling is
 *      the ONLY splash moment", v2.3.1445); and a cook's grease pops on its
 *      hits and nowhere between them;
 *   4. the gesture window opens on the last hit and not before, and the
 *      node's bar, empty, calls for the gesture (the job of the bar over the
 *      head, which is gone);
 *   5. the gesture still completes and the worker pays -- it accepted a
 *      strike held to the plan's window.
 * Then the three ways out of the hits, each ending in a PAID harvest:
 *   A. a worker that never answers (what an old worker does with hitSeq):
 *      the client waits GATHER_HIT_PLAN_WAIT_MS, drops to the old timer and
 *      re-declares the attempt, and the worker's record follows it;
 *   B. an old client (no caps.gatherhits): the timer, untouched, no plan;
 *   C. the kill switch thrown mid-session through the real admin route: the
 *      worker answers `off` and the client is on the timer at once.
 * A and the cook's own no-answer case also hold the node's bar to the timer:
 * it drains with the clock (since v2.3.3035 reading the node's HP worn down
 * with it, "7/10" -- it showed no number, the owner's "the bar has no
 * numbers").  And (v2.3.3035) the bar is green, at the resource: over the
 * crown and the pond, under the rock and the fire.
 * Screenshots: tools/qa/mp/out/gatherhits-<skill>-hits.png, mid-run, for a
 * human to look at -- a 44px bar and a white "1" are exactly what an
 * assertion passes on while looking wrong. */
import * as H from './harness.mjs';
import { GATHER_SWING, GATHER_HIT_PLAN_WAIT_MS, GATHER_HIT_SETTLE_MS } from '../../../src/data/gameSystems.js';

const TILE = 32;
const PHONE = { width: 390, height: 844 };
const STAND = { oreVein: [0, -70], tree: [0, -130], fishSpot: [50, -40] };
/* `campfire` is the cook: no gather node, a fire lit where the player stands. */
const SKILL = { oreVein: 'mining', tree: 'woodcutting', fishSpot: 'fishing', campfire: 'cooking' };
const RES = { oreVein: 'ore_', tree: 'wood_', fishSpot: 'fish_', campfire: 'cooked_fish_' };
/* The renderer's own strike effect for each skill (effectsRenderer: 'rocks'
   on the pick's frame 4, 'woodchips' on the axe's bite + its 200 ms lead).
   Fishing has no blow, and its nibbles draw no splash (the owner's "reeling
   is the ONLY splash moment"), so it is held to having none.  A cook has no
   blow either: its pan's GREASE pops on each hit instead (v2.3.2956). */
const BLOW_FX = { mining: 'rocks', woodcutting: 'woodchips', cooking: 'grease' };

const stand = (P, tx, ty) => P.page.evaluate(({ x, y, t }) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.player) return false;
  S.player.x = x * t + t / 2;
  S.player.y = y * t + t / 2;
  return true;
}, { x: tx, y: ty, t: TILE });

const srvInv = async (wsPort, id) => {
  const a = await H.adminPlayer(wsPort, id).catch(() => ({}));
  return (a && (a.inventory || (a.rpg && a.rpg.inventory) || (a.live && a.live.inventory))) || {};
};
const sumPrefix = (inv, pre) => Object.keys(inv || {}).filter((k) => k.indexOf(pre) === 0)
  .reduce((n, k) => n + (inv[k] || 0), 0);
const hitPlanOf = async (wsPort, id) => {
  const a = await H.adminPlayer(wsPort, id).catch(() => ({}));
  return (a && a.live && a.live.hitPlan) || null;
};
const flag = (wsPort, method, body) => fetch(`http://127.0.0.1:${wsPort}/api/admin/flags` + (method === 'DELETE' ? '?name=gatherhits' : ''), {
  method,
  headers: { Authorization: 'Bearer ' + H.ADMIN_KEY, 'Content-Type': 'application/json' },
  body: body ? JSON.stringify(body) : undefined,
}).then((r) => r.json()).catch((e) => ({ ok: false, error: String(e) }));

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Hitter', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2 });
  try {
    await body({ P, wsPort, rec });
  } finally {
    await flag(wsPort, 'DELETE');   /* never leave the switch thrown for the next scenario */
    await P.ctx.close().catch(() => {});
  }
}

async function body({ P, wsPort, rec }) {
  await H.enterWorld(P);
  await P.page.waitForTimeout(1200);
  const myId = await H.readState(P, (S) => S.myId);
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
  });
  for (const tool of ['woodcutting_axe', 'fishing_pole', 'mining_pickaxe']) {
    await H.grant(wsPort, myId, 'item', { invKey: tool, count: 1 }).catch(() => {});
  }
  await H.waitFor(P, (S) => (S.rpg?.inventory || {}).mining_pickaxe || 0, (n) => n >= 1,
    { timeout: 20000, label: 'the tools reach the bag' }).catch(() => {});
  const caps = await H.readState(P, (S) => !!(S._serverCaps && S._serverCaps.gatherhits));
  rec.ok('the worker advertises caps.gatherhits (guard)', caps === true, { caps });

  const marks = await P.page.evaluate(() => {
    const f = window._gameFns;
    if (!f || !f.TOWN_EXITS || !f.WORLDVIEW_EXITS) return null;
    return {
      townExit: f.TOWN_EXITS.find((e) => e.zoneId === 'worldview') || null,
      spokes: f.WORLDVIEW_EXITS.filter((e) => e.zoneId !== 'town').map((e) => ({ zoneId: e.zoneId, tx: e.tx, ty: e.ty })),
    };
  });
  if (!marks || !marks.townExit || !marks.spokes.length) {
    rec.skip('the gathering hits in a real zone', 'no exit tables on the _gameFns bridge');
    return;
  }
  const travel = async (tx, ty, zoneId) => {
    for (let i = 0; i < 6; i++) {
      await stand(P, tx, ty);
      const got = await H.waitFor(P, (S) => S.currentZone, (z) => z === zoneId,
        { timeout: 6000, label: 'reach ' + zoneId }).catch(() => null);
      if (got === zoneId) return true;
    }
    return (await H.readState(P, (S) => S.currentZone)) === zoneId;
  };
  /* Screenshot hygiene only (mp-cueshow's reasons): the quest banner, the
     coach's bubble and the zone's reminder card sit over the very spot the
     pictures are of.  Nothing asserted reads them. */
  await P.page.addStyleTag({ content:
    '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
  const dismissTips = () => P.page.evaluate(() => {
    for (const d of document.querySelectorAll('div')) {
      if (!/Bring \d/.test(d.textContent || '')) continue;
      if ([...d.children].some((c) => /Bring \d/.test(c.textContent || ''))) continue;
      if (d.closest('canvas, .bt-rjoy-base')) continue;
      let e = d;
      while (e && e !== document.body) {
        const pos = getComputedStyle(e).position;
        if (pos === 'fixed' || pos === 'absolute') {
          if (!e.querySelector('canvas')) e.style.visibility = 'hidden';
          break;
        }
        e = e.parentElement;
      }
    }
  }).catch(() => {});
  await dismissTips();

  /* Stand at a live node of `type` with the client's monsters stashed (the
     tap hit-tests monsters first) and tap it; returns the node or null. */
  const tapNode = async (type, r) => {
    const skill = SKILL[type];
    /* Polled with page.evaluate(fn, arg), NOT H.waitFor: waitFor serialises
       its projection into the page, where a closure over `type` would be a
       ReferenceError -- which readState turns into an {__err} object, which
       is truthy, which would read as "found a node". */
    let node = null;
    for (let i = 0; i < 160 && !node; i++) {
      node = await P.page.evaluate((t) => {
        const S = window._gameState.current;
        const n = (S.gatherNodes || []).find((g) => g.alive && g.nodeType === t);
        return n ? { id: n.id, x: n.x, y: n.y } : null;
      }, type).catch(() => null);
      if (!node) await P.page.waitForTimeout(250);
    }
    r.ok(`${skill}: a live ${type} in the zone (guard)`, !!node, { node });
    if (!node) return null;
    /* WALK there, in steps the worker accepts (H.hopTo).  A single write of
       S.player.x/y is a teleport: movement.js refuses any move further than
       500 px/s x the time since the last one + 80, and while a harvest runs
       the client re-sends its position every 500 ms -- so a jump of more than
       ~330 px is refused for good, the worker keeps the player at the zone
       entrance, and the harvest's strike comes back `out-of-range` (measured:
       702 px, on a run where the worker had rolled the ore far from the
       entry).  Node positions re-roll on every worker boot, so a teleport
       passes or fails by where the ore happened to land. */
    const sx = node.x + STAND[type][0], sy = node.y + STAND[type][1];
    await H.hopTo(P, sx, sy);
    await P.page.evaluate(({ x, y }) => {
      const S = window._gameState.current;
      S.player.x = x; S.player.y = y; S.player.vx = 0; S.player.vy = 0;
      S._monstersStash = S.monsters; S.monsters = [];
    }, { x: sx, y: sy });
    let srvAt = null;
    for (let i = 0; i < 16; i++) {
      srvAt = await H.serverPlayer(wsPort, myId).catch(() => null);
      if (srvAt && Math.hypot(srvAt.x - sx, srvAt.y - sy) < 60) break;
      await P.page.waitForTimeout(250);
    }
    r.ok(`${skill}: the worker has the player at the node too (guard)`,
      !!srvAt && Math.hypot(srvAt.x - sx, srvAt.y - sy) < 60,
      { worker: srvAt && { x: Math.round(srvAt.x), y: Math.round(srvAt.y) }, client: { x: Math.round(sx), y: Math.round(sy) } });
    let started = null;
    for (let i = 0; i < 4 && started !== skill; i++) {
      await P.page.evaluate((id) => {
        const S = window._gameState.current;
        const n = (S.gatherNodes || []).find((g) => g.id === id);
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
      }, node.id);
      await P.page.waitForTimeout(250);
      started = await H.readState(P, (S) => (S._extraction ? S._extraction.skill : null));
    }
    r.ok(`${skill}: tapping the node starts the harvest (guard)`, started === skill, { started });
    return started === skill ? node : null;
  };
  /* The fallback paths are about the CODE PATH, not the skill, so each takes
     whichever node is alive now instead of standing idle until one type
     respawns: idling in Frost Ridge with no harvest running means no shield,
     and a worker snowman can kill the player and send them to town, which has
     no nodes at all (what an earlier run of this file did, after one refused
     strike left its ore dead on the client for good). */
  const pickAlive = async (prefer) => {
    const order = [prefer, ...['oreVein', 'tree', 'fishSpot'].filter((t) => t !== prefer)];
    for (let i = 0; i < 120; i++) {
      const got = await P.page.evaluate((ts) => {
        const S = window._gameState.current;
        if (!S || S.currentZone === 'town') return { zone: S && S.currentZone };
        for (const t of ts) if ((S.gatherNodes || []).some((g) => g.alive && g.nodeType === t)) return { type: t, zone: S.currentZone };
        return { zone: S.currentZone };
      }, order).catch(() => ({}));
      if (got.type || got.zone === 'town') return got;
      await P.page.waitForTimeout(250);
    }
    return {};
  };
  const unstash = () => P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S._monstersStash) { S.monsters = S._monstersStash; S._monstersStash = null; }
  });

  /* A cook needs a fire: light one where the player stands (mp-gcue's route,
     the Bag's "Light fire") unless one is still burning, then TAP it -- the
     real touchscreen, as a player would.  Returns the fire or null. */
  const startCook = async (r) => {
    const fireAt = () => P.page.evaluate(() => {
      const S = window._gameState.current, n = S._campfire;
      return n && n.alive ? { x: n.x, y: n.y } : null;
    });
    let fire = await fireAt();
    if (!fire) {
      await P.page.evaluate(() => {
        const bus = window._itemDetailBus;
        const S = window._gameState && window._gameState.current;
        if (bus && S && S.rpg) bus.open({ kind: 'inventory', key: 'wood_pine_log', count: (S.rpg.inventory || {}).wood_pine_log || 0 });
      });
      await P.page.waitForTimeout(600);
      await H.clickText(P, 'Light fire').catch(() => {});
      for (let i = 0; i < 40 && !fire; i++) { await P.page.waitForTimeout(250); fire = await fireAt(); }
      await P.page.evaluate(() => { try { window._itemDetailBus.close(); } catch (e) { /* not open */ } });
      await H.closeDest(P).catch(() => {});
    }
    r.ok('cooking: a campfire is lit (guard)', !!fire, { fire });
    if (!fire) return null;
    await P.page.evaluate(() => {
      const S = window._gameState.current;
      if (!S._monstersStash) { S._monstersStash = S.monsters; S.monsters = []; }
    });
    let started = null;
    for (let i = 0; i < 4 && started !== 'cooking'; i++) {
      const at = await P.page.evaluate(() => {
        const S = window._gameState.current, n = S._campfire, cv = document.querySelector('canvas');
        if (!n || !cv) return null;
        const rc = cv.getBoundingClientRect();
        return { x: rc.left + (n.x - S.camera.x) * (S._worldScaleX || 1), y: rc.top + (n.y - S.camera.y) * (S._worldScaleY || 1) };
      });
      if (!at) break;
      await P.page.touchscreen.tap(at.x, at.y);
      await P.page.waitForTimeout(250);
      started = await H.readState(P, (S) => (S._extraction ? S._extraction.skill : null));
    }
    r.ok('cooking: tapping the fire starts a cook (guard)', started === 'cooking', { started });
    return started === 'cooking' ? fire : null;
  };

  /* The gesture, in-page and continuous at a quick pace (mp-cueshow's), and
     the worker's verdict on it. */
  const gestureAndPay = async (type, invBefore, r, label) => {
    const skill = SKILL[type];
    const opened = await H.waitFor(P, (S) => (S._extraction ? S._extraction.status : null), (v) => v === 'ready',
      { timeout: 20000, label: 'the window opens' }).catch(() => null);
    r.ok(`${label}: the gesture window opens (guard)`, opened === 'ready', { opened });
    if (opened !== 'ready') return { cancelled: false };
    const cue = await P.page.evaluate(() => (window.__btHarvest ? window.__btHarvest().cue : null));
    /* v2.3.3035: the moves 16 ms apart in ONE uninterrupted run on the page's
       thread, as mp-wheelnodes plays them (v2.3.3012).  The meter's clock
       counts only gaps under 200 ms between moves (ExtractionSwipeLayer
       activeMs), and since the Wheel's water and the wider view a frame of
       this box's software renderer is ~200-400 ms: moves that yield between
       them (the sleep(16) this loop had) land a frame apart, and the meter
       sat at 0.7-0.96 for the whole 60 s -- every harvest here failed on
       main, the game itself being fine (mp-recoverpay, mp-wheelnodes pay).
       A phone draws a frame in ~16 ms; holding the thread for the stroke is
       the phone's cadence, not a shortcut through the gesture. */
    const g = await P.page.evaluate(([sk, cx, cy]) => {
      const S = window._gameState.current;
      const ev = (t, x, y) => window.dispatchEvent(new PointerEvent(t, { pointerId: 9, clientX: x, clientY: y,
        pointerType: 'touch', bubbles: true, cancelable: true, isPrimary: true }));
      const zone0 = S.currentZone;
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
        if (!ex || ex.status !== 'ready') break;
      }
      ev('pointerup', cx, cy);
      const ended = !S._extraction;
      /* A harvest also ends when the player DIES (the respawn's zone change
         clears it), and a death late in the gesture would otherwise read as
         the meter finishing it -- what hid the v2.3.2956 cook-shield lapse. */
      const died = !!(S.rpg && S.rpg.hp <= 0) || S.currentZone !== zone0;
      return { done: ended && !died && lastProg >= 0.85, cancelled: ended && !died && lastProg < 0.85, died,
        ms: Math.round(performance.now() - t0), lastProg: +lastProg.toFixed(2) };
    }, [skill, cue ? cue.x : 300, cue ? cue.y : 700]);
    r.ok(`${label}: the player is alive and in the zone when the gesture ends (guard)`, !g.died, g);
    if (g.died) return { cancelled: false };
    if (g.cancelled) return { cancelled: true };
    r.ok(`${label}: the gesture completes the harvest`, g.done === true, g);
    const got = await (async () => {
      for (let i = 0; i < 20; i++) {
        const inv = await srvInv(wsPort, myId);
        if (sumPrefix(inv, RES[type]) > sumPrefix(invBefore, RES[type])) return sumPrefix(inv, RES[type]) - sumPrefix(invBefore, RES[type]);
        await P.page.waitForTimeout(400);
      }
      return 0;
    })();
    const lastStrike = got > 0 ? null : await H.adminPlayer(wsPort, myId).then((a) => (a && a.live && a.live.lastStrike) || null).catch(() => null);
    r.ok(`${label}: the worker paid it (${RES[type]}* in the bag)`, got > 0, { got, lastStrike });
    return { cancelled: false };
  };

  /* ── THE HITS, one skill ── */
  const hitsOnce = async (type, r) => {
    const skill = SKILL[type];
    const invBefore = await srvInv(wsPort, myId);
    const node = type === 'campfire' ? await startCook(r) : await tapNode(type, r);
    if (!node) return {};
    await dismissTips();
    /* Sample every frame from the tap to `ready`: each hit as it lands, what
       the node's bar and the button's ring said at that moment, every number
       popped, and every strike effect the renderer stamped. */
    const box = await H.figureBox(P, { pad: 90 }).catch(() => null);
    const traceP = P.page.evaluate(async () => {
      const S = window._gameState.current;
      /* The ring on the right button, read off its own SVG: BroTown stamps its
         dash as a fraction of 2*pi*r, r = 40% of the box it measured
         (`_rpxW`).  The meter the player sees, not a copy of its maths. */
      const ring = () => {
        const c = document.querySelector('.bt-rjoy-base circle[r="40%"]');
        const svg = c && c.parentNode;
        if (!c || !svg || svg.style.display === 'none') return null;
        const w = svg._rpxW || svg.clientWidth || 96;
        return parseFloat(c.getAttribute('stroke-dasharray') || '0') / (2 * Math.PI * w * 0.4);
      };
      const out = { events: [], pops: [], fx: [], dts: [], planAt: null, readyAt: null, aborted: null, fellBack: false };
      let prevFrame = 0;
      const seenPop = new Set(), seenFx = new Set();
      const start = Date.now();
      let lastShown = 0, plan = null;
      out.startedAt = S._extraction ? S._extraction.startedAt : null;
      while (Date.now() - start < 30000) {
        const ex = S._extraction;
        const now = Date.now();
        if (!ex) { out.aborted = 'the extraction ended before ready'; break; }
        const h = ex.hits;
        if (!h) { out.fellBack = true; }
        /* planAt is stamped by the CLIENT when the plan lands (applyGatherHits);
           this loop may start well after the tap, so its own clock would time
           its start, not the round trip. */
        if (h && h.plan && out.planAt == null) { out.planAt = h.planAt || now; plan = h; }
        if (h && h.shown > lastShown) {
          /* The hit is applied by the game tick; the two bars publish their
             probes when the renderer DRAWS -- so read them two frames on, off
             the frame that actually carries this hit. */
          const batch = [];
          for (let k = lastShown; k < h.shown; k++) batch.push({ k: k + 1, seen: now, at: h.times[k], d: h.plan[k], hp: null });
          batch[batch.length - 1].hp = h.hp;
          lastShown = h.shown;
          await new Promise((res) => requestAnimationFrame(res));
          await new Promise((res) => requestAnimationFrame(res));
          const bar = window.__btNodeHpBar ? Object.assign({}, window.__btNodeHpBar) : null;
          const rg = ring();
          /* Two frames on, a LAST hit can already be past the settle beat on a
             slow box: then the window is open and the ring is turning over to
             the gesture's own progress, from 0 -- what it is for at `ready` --
             or still shows the full wind-up, if it was stamped the frame
             before the window opened. */
          const rgReady = !!S._extraction && S._extraction.status === 'ready';
          for (const e of batch) { e.bar = bar; e.ring = rg; e.ringReady = rgReady; }
          out.events.push(...batch);
        }
        for (const p of (S.dmgNumbers || [])) {
          if (!seenPop.has(p) && /^\d+$/.test(String(p.text || ''))) { seenPop.add(p); out.pops.push({ text: p.text, t: p.ts }); }
        }
        for (const b of (S._fxBursts || [])) {
          if (!seenFx.has(b)) { seenFx.add(b); out.fx.push({ kind: b.kind, t0: b.t0 }); }
        }
        if (ex.status === 'ready') {
          /* The game stamps the moment it opened the window (BroTown's
             extraction tick); this loop's own `now` was taken before the
             two-frame probe wait above and would read it early. */
          out.readyAt = ex.readyAt || Date.now();
          /* What `ready` found: how many hits had landed when the window
             opened is the property ("not before the last hit"); the clock
             gap is only a loose sanity bound, since this loop sees the flip
             a frame or two after the tick that made it. */
          out.atReady = { hp: h ? h.hp : null, shown: h ? h.shown : null, of: h && h.plan ? h.plan.length : null };
          await new Promise((res) => requestAnimationFrame(res));
          await new Promise((res) => requestAnimationFrame(res));
          out.atReady.bar = window.__btNodeHpBar ? Object.assign({}, window.__btNodeHpBar) : null;
          /* v2.3.3035: where the resource stands, for the bar over it */
          out.atReady.nodeX = ex.nodeRef ? ex.nodeRef.x : null;
          /* v2.3.3027: and what the band over the head shows instead */
          out.atReady.plate = window.__btResourceBars ? window.__btResourceBars.plateVisible : null;
          out.atReady.hpA = window.__btHpReads ? window.__btHpReads.barA : null;
          break;
        }
        await new Promise((res) => requestAnimationFrame(res));
        /* The frame time this browser is actually running at -- the yardstick
           for every "within a frame" below, measured, not assumed (a loaded
           CI box draws at a fraction of a phone's 60 fps). */
        const tf = performance.now();
        if (prevFrame) out.dts.push(tf - prevFrame);
        prevFrame = tf;
      }
      if (plan) { out.plan = plan.plan.slice(); out.hp = plan.maxHp; out.times = plan.times.slice(); out.seq = plan.seq; }
      return out;
    });
    /* The worker's copy, read while the attempt is in flight. */
    let srvPlan = null;
    for (let i = 0; i < 10 && !srvPlan; i++) { srvPlan = await hitPlanOf(wsPort, myId); if (!srvPlan) await P.page.waitForTimeout(150); }
    /* Mid-run picture: the number and the bar on the node. */
    await P.page.waitForTimeout(Math.round(GATHER_SWING[skill].ms * 3.3));
    await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/gatherhits-${skill}-hits.png`, clip: box || undefined }).catch(() => {});
    const tr = await traceP;
    if (tr.aborted) {
      /* A worker snowman's knockback is a walk-away cancel: the game working,
         not what this file measures (mp-cueshow's driver rule). */
      return { cancelled: true, why: tr.aborted };
    }
    console.log(`    ${skill} hits: ` + JSON.stringify({ plan: tr.plan, hp: tr.hp, srv: srvPlan && srvPlan.hits,
      events: tr.events.map((e) => [e.k, e.d, e.hp, e.seen - e.at]), readyMinusLast: tr.readyAt && tr.times ? tr.readyAt - tr.times[tr.times.length - 1] : null }));

    /* 1. the plan */
    r.ok(`${skill}: the client is playing hits, not the timer`, !tr.fellBack && Array.isArray(tr.plan), { fellBack: tr.fellBack, plan: tr.plan });
    if (!Array.isArray(tr.plan)) return {};
    r.ok(`${skill}: the worker's plan reached the client within one swing of the tap`,
      tr.planAt != null && tr.startedAt != null && tr.planAt - tr.startedAt < GATHER_SWING[skill].ms, { ms: tr.planAt - tr.startedAt });
    r.ok(`${skill}: the client plays EXACTLY the hits the worker rolled (operator view)`,
      !!srvPlan && JSON.stringify(srvPlan.hits) === JSON.stringify(tr.plan) && srvPlan.hp === tr.hp && srvPlan.skill === skill
        && (type !== 'campfire' || srvPlan.fishKey === 'fish_minnow'),
      { client: tr.plan, worker: srvPlan });
    r.ok(`${skill}: the first tier (${type === 'campfire' ? 'a minnow' : 'the node'}) has the owner's 10 HP`, tr.hp === 10, tr.hp);
    const lvl = srvPlan ? srvPlan.level : 1;
    r.ok(`${skill}: every hit is 1..skill level (${lvl}), and they break the node exactly on the last one`,
      tr.plan.every((d) => d >= 1 && d <= lvl) && tr.plan.reduce((a, b) => a + b, 0) >= tr.hp
        && tr.plan.slice(0, -1).reduce((a, b) => a + b, 0) < tr.hp, { plan: tr.plan, lvl });

    /* 2. the hits as played */
    r.ok(`${skill}: every hit landed, one at a time`, tr.events.length === tr.plan.length
      && tr.events.every((e, i) => e.k === i + 1 && e.d === tr.plan[i]), tr.events.map((e) => [e.k, e.d]));
    let hp = tr.hp, hpOk = true;
    for (const e of tr.events) { hp = Math.max(0, hp - e.d); e.want = hp; if (e.hp != null && e.hp !== hp) hpOk = false; }
    r.ok(`${skill}: each hit took its roll off the node's HP, down to 0`, hpOk && hp === 0, tr.events.map((e) => [e.hp, e.want]));
    const dts = tr.dts.slice().sort((a, b) => a - b);
    const pct = (q) => (dts.length ? dts[Math.min(dts.length - 1, Math.floor(q * dts.length))] : 16.7);
    const frame50 = pct(0.5), frame95 = pct(0.95);
    const lates = tr.events.map((e) => e.seen - e.at);
    const late50 = lates.slice().sort((a, b) => a - b)[Math.floor(lates.length / 2)];
    r.ok(`${skill}: no hit lands before its moment, and they land promptly (median within two frames)`,
      lates.every((l) => l >= 0) && late50 <= 2 * frame50 + 20,
      { lates, frameMs: { p50: Math.round(frame50), p95: Math.round(frame95) } });
    const nums = tr.pops.map((p) => Number(p.text));
    const want = tr.plan.slice().sort().join(',');
    r.ok(`${skill}: one number popped per hit, showing the roll`, nums.length >= tr.plan.length
      && nums.slice(0, tr.plan.length).slice().sort().join(',') === want, { popped: nums, plan: tr.plan });
    r.ok(`${skill}: the ${type === 'campfire' ? 'fire' : 'node'}'s HP bar was up through the hits, reading its HP`,
      tr.events.every((e) => e.bar && e.bar.show === true && e.bar.mode === 'hits' && e.bar.skill === skill
        && e.bar.maxHp === tr.hp && e.bar.hp === e.want),
      tr.events.map((e) => e.bar));
    r.ok(`${skill}: the ring on the button stepped up with each hit (chunked, not a clock)`,
      tr.events.every((e) => e.ring != null && (Math.abs(e.ring - (1 - e.want / tr.hp)) < 0.02
        || (e.ringReady && Math.abs(e.ring) < 0.02)))
        && tr.events.slice(0, -1).every((e) => !e.ringReady),
      tr.events.map((e) => [e.ring == null ? null : +e.ring.toFixed(3), +(1 - e.want / tr.hp).toFixed(3), e.ringReady ? 'ready' : '']));

    /* 3. on the blow */
    if (BLOW_FX[skill]) {
      const blows = tr.fx.filter((f) => f.kind === BLOW_FX[skill]).map((f) => f.t0);
      const offs = tr.events.map((e) => {
        let best = Infinity;
        for (const b of blows) best = Math.min(best, Math.abs(b - e.at));
        return best;
      });
      /* The renderer stamps its strike effect on the first frame it DRAWS
         after the blow, so a hit and its blow sit at most about a frame apart:
         the tolerance is this browser's own p95 frame, not a guess. */
      const tol = Math.max(40, 1.25 * frame95 + 15);
      r.ok(`${skill}: every hit lands on a blow the renderer drew (its ${BLOW_FX[skill]} within a frame)`,
        offs.length === tr.events.length && offs.every((o) => o <= tol), { offs, tol: Math.round(tol), blows: blows.length });
      if (skill === 'cooking') {
        /* The pan's grease is the hit: from the plan's arrival on it pops on
           the hits and nowhere else -- its own 650 ms clock is off while a
           plan plays (it runs before the plan lands, and at `ready`, where
           this sampler has stopped).  The plan lands between frames, so a
           frame stamped after it is a frame that saw it. */
        const lastT = tr.times[tr.times.length - 1];
        const during = blows.filter((t) => t >= tr.planAt && t <= lastT + tol).length;
        r.ok(`${skill}: ...and the grease pops ONLY on the hits while they land (one per hit)`,
          during === tr.plan.length, { during, hits: tr.plan.length });
      }
    } else {
      /* The owner's rule, pinned: "reeling is the ONLY splash moment"
         (v2.3.1445).  A nibble is a number and the pond's bar, never a
         splash -- the splash belongs to the reel gesture that follows. */
      const splashes = tr.fx.filter((f) => f.kind === 'splash').length;
      r.ok(`${skill}: no splash before the reel -- the nibbles are numbers only (owner: reeling is the ONLY splash moment)`,
        splashes === 0, { splashes, hits: tr.plan.length });
    }
    r.ok(`${skill}: the hits are one swing apart (${GATHER_SWING[skill].ms} ms)`,
      tr.times.every((t, i) => i === 0 || t - tr.times[i - 1] === GATHER_SWING[skill].ms), tr.times);

    /* 4. the window */
    const last = tr.times[tr.times.length - 1];
    r.ok(`${skill}: the gesture window opened a beat after the last hit (its blow seen to land), never before`,
      !!tr.atReady && tr.atReady.shown === tr.plan.length && tr.readyAt >= last + GATHER_HIT_SETTLE_MS
        && tr.readyAt - last < GATHER_HIT_SETTLE_MS + 2 * frame95 + 120,
      { atReady: tr.atReady, readyMinusLast: tr.readyAt - last, settle: GATHER_HIT_SETTLE_MS });
    r.ok(`${skill}: at ready the node reads 0, its bar shows 0 and CALLS for the gesture (the old head bar's flash)`,
      !!tr.atReady && tr.atReady.hp === 0 && !!tr.atReady.bar && tr.atReady.bar.show === true && tr.atReady.bar.hp === 0
        && tr.atReady.bar.frac === 0 && tr.atReady.bar.ready === true && tr.atReady.bar.call === true, tr.atReady);
    /* v2.3.3035, owner: "I want resource harvesting bar to be green and to
       appear above the resource, not the player head.  It should also list
       the numbers on the bar" -- the bar hangs over the TOP of the resource's
       art (its bottom edge a few world px clear of it, centred on it), at the
       HP bar's 76 x 22 (v2.3.3027's size), its fill the green, reading
       "0/<its HP>" at ready; your name plate and HP bar still put away while
       you gather (v2.3.3027).  And the owner: "For mining you can put the
       bar beneath the ore" -- the rock's, like the fire's, hangs UNDER its
       art's ground line, its top a few world px below it. */
    {
      const b = (tr.atReady && tr.atReady.bar) || {};
      const clear = b.artTop != null ? b.artTop - (b.y + b.h / 2) : NaN;
      const below = b.artBase != null ? (b.y - b.h / 2) - b.artBase : NaN;
      r.ok(`${skill}: ...the bar is at the ${type === 'campfire' ? 'fire' : type === 'oreVein' ? 'rock' : type === 'tree' ? 'tree' : 'pond'} (${b.under ? 'under it, ' + (type === 'campfire' ? 'the cook leaning over it' : 'clear of the miner behind it') + ', its top ' + Math.round(below) + ' world px under the ground line' : 'its bottom ' + Math.round(clear) + ' world px over the art\'s top'}), green, at the HP bar's size (${b.w} x ${b.h}), reading "${b.text}"; the name plate and the HP bar put away`,
        b.big === true && Math.abs(b.w - 76 * b.scale) < 0.6 && Math.abs(b.h - 22 * b.scale) < 0.6
          && (b.under ? below > 0 && below < 24 && (type === 'campfire' || type === 'oreVein') : clear > 0 && clear < 12) && Math.abs(b.x - tr.atReady.nodeX) < 1 && b.green === true
          && b.text === '0/' + tr.hp && tr.atReady.plate === false && tr.atReady.hpA === 0,
        { bar: b, clear, below, nodeX: tr.atReady && tr.atReady.nodeX, plate: tr.atReady && tr.atReady.plate, hpA: tr.atReady && tr.atReady.hpA });
    }

    /* 5. the gesture still pays */
    const res = await gestureAndPay(type, invBefore, r, skill);
    await unstash();
    if (res.cancelled) return { cancelled: true, why: 'a monster cancelled the gesture' };
    const after = await P.page.evaluate(() => window.__btNodeHpBar ? Object.assign({}, window.__btNodeHpBar) : null);
    r.ok(`${skill}: the node's bar is gone once the harvest is over`, !!after && after.show === false, after);
    await P.page.waitForTimeout(600);
    return {};
  };

  /* Harvest drivers with mp-cueshow's one retry on a monster's cancel. */
  const withRetry = async (label, fn) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const buf = [];
      const res = await fn({ ok: (...args) => buf.push(args), skip: (...args) => rec.skip(...args) });
      if (res && res.cancelled && attempt === 0) {
        console.log(`    ${label}: cancelled (${res.why}) -- running it again`);
        await unstash();
        await P.page.waitForTimeout(2500);
        continue;
      }
      for (const args of buf) rec.ok(...args);
      return;
    }
  };

  /* ── THE COOK, IN TOWN, BEFORE THE TRIP ──  A fire needs no node, and town
     has no monsters: in Frost Ridge the snowmen killed the cook in the idle
     gaps between this file's steps (granting the fish, lighting the fire),
     where no shield covers anyone -- a fixture failure, not the game's.  The
     log and the minnows are granted. */
  await H.grant(wsPort, myId, 'item', { invKey: 'wood_pine_log', count: 2 }).catch(() => {});
  await H.grant(wsPort, myId, 'item', { invKey: 'fish_minnow', count: 3 }).catch(() => {});
  await H.waitFor(P, (S) => ((S.rpg?.inventory || {}).fish_minnow || 0) + ':' + ((S.rpg?.inventory || {}).wood_pine_log || 0),
    (v) => { const [f, w] = String(v).split(':').map(Number); return f >= 1 && w >= 1; },
    { timeout: 20000, label: 'the log and the minnows reach the bag' }).catch(() => {});
  await withRetry('cooking', (r) => hitsOnce('campfire', r));

  /* ── A COOK THE WORKER NEVER ANSWERS ──  The cook's own fallback: the
     timer, and NO re-declare -- the worker keeps no record of a cook. */
  await withRetry('no answer (cook)', async (r) => {
    const invBefore = await srvInv(wsPort, myId);
    await H.instrumentWire(P);
    const wire0 = (await H.wireCounts(P)).extraction_start || 0;
    await P.page.evaluate(() => { window._gameState.current._gatherHitSeq = 5e9; });
    const fire = await startCook(r);
    if (!fire) { await P.page.evaluate(() => { window._gameState.current._gatherHitSeq = 0; }); return {}; }
    const t0 = await H.readState(P, (S) => (S._extraction ? S._extraction.startedAt : null));
    const fell = await H.waitFor(P, (S) => (S._extraction ? (S._extraction.hits ? 'hits' : 'timer') : 'none'), (v) => v !== 'hits',
      { timeout: GATHER_HIT_PLAN_WAIT_MS + 4000, label: 'the plan wait gives up' }).catch(() => null);
    const tFell = await H.readState(P, (S) => (S._extraction ? S._extraction.startedAt : null));
    if (fell === 'none') { await P.page.evaluate(() => { window._gameState.current._gatherHitSeq = 0; }); return { cancelled: true, why: 'the cook ended while waiting' }; }
    r.ok('no answer (cook): with no plan, the cook drops to the old timer', fell === 'timer', { fell });
    r.ok('no answer (cook): ...after waiting GATHER_HIT_PLAN_WAIT_MS for it, not before',
      t0 != null && tFell != null && tFell - t0 >= GATHER_HIT_PLAN_WAIT_MS - 50, { waited: tFell - t0 });
    const b1 = await P.page.evaluate(() => (window.__btNodeHpBar ? Object.assign({}, window.__btNodeHpBar) : null));
    await P.page.waitForTimeout(700);
    const b2 = await P.page.evaluate(() => (window.__btNodeHpBar ? Object.assign({}, window.__btNodeHpBar) : null));
    const wire1 = (await H.wireCounts(P)).extraction_start || 0;
    r.ok('no answer (cook): ...and does NOT re-declare it (one start on the wire: the worker keeps no cook record to re-stamp)',
      wire1 - wire0 === 1, { sent: wire1 - wire0 });
    r.ok('no answer (cook): the fire\'s bar drains on the timer, its number worn down with it (v2.3.3035: "7/10", the node\'s HP)',
      !!b1 && !!b2 && b1.mode === 'timer' && b2.mode === 'timer' && b2.frac < b1.frac
        && /^[0-9]+[/][0-9]+$/.test(b1.text || '') && b1.maxHp > 0 && b2.hp <= b1.hp && b1.text === b1.hp + '/' + b1.maxHp,
      { b1, b2 });
    const res = await gestureAndPay('campfire', invBefore, r, 'no answer (cook)');
    await unstash();
    await P.page.evaluate(() => { window._gameState.current._gatherHitSeq = 0; });
    return res;
  });

  /* ── THE TRIP ──  Every gathering skill has its node in each spoke zone. */
  await travel(marks.townExit.tx, marks.townExit.ty, 'worldview');
  const spoke = marks.spokes.find((s) => s.zoneId === 'frost') || marks.spokes[0];
  const arrived = await travel(spoke.tx, spoke.ty, spoke.zoneId);
  rec.ok(`arrived in a gathering zone (${spoke.zoneId}) (guard)`, arrived === true, { spoke });
  if (!arrived) return;
  await H.waitFor(P, (S) => (S.gatherNodes || []).filter((n) => n.alive).length, (n) => n >= 3,
    { timeout: 15000, label: 'the nodes arrive' }).catch(() => {});
  await H.closeDest(P).catch(() => {});

  for (const type of ['oreVein', 'tree', 'fishSpot']) await withRetry(SKILL[type], (r) => hitsOnce(type, r));

  /* ── A. A WORKER THAT NEVER ANSWERS ──  A hitSeq past SEQ_MAX is ignored by
     the worker exactly as an old worker ignores the field altogether: no plan
     comes back. */
  await withRetry('no answer', async (r) => {
    const invBefore = await srvInv(wsPort, myId);
    await H.instrumentWire(P);
    const wire0 = (await H.wireCounts(P)).extraction_start || 0;
    const pick = await pickAlive('oreVein');
    r.ok('no answer: a live node and still in the zone (guard)', !!pick.type, pick);
    if (!pick.type) return {};
    await P.page.evaluate(() => { window._gameState.current._gatherHitSeq = 5e9; });
    const node = await tapNode(pick.type, r);
    if (!node) return {};
    const t0 = await H.readState(P, (S) => (S._extraction ? S._extraction.startedAt : null));
    const fell = await H.waitFor(P, (S) => (S._extraction ? (S._extraction.hits ? 'hits' : 'timer') : 'none'), (v) => v !== 'hits',
      { timeout: GATHER_HIT_PLAN_WAIT_MS + 4000, label: 'the plan wait gives up' }).catch(() => null);
    const tFell = await H.readState(P, (S) => (S._extraction ? S._extraction.startedAt : null));
    if (fell === 'none') return { cancelled: true, why: 'the extraction ended while waiting' };
    r.ok('no answer: with no plan, the harvest drops to the old timer', fell === 'timer', { fell });
    r.ok('no answer: ...after waiting GATHER_HIT_PLAN_WAIT_MS for it, not before',
      t0 != null && tFell != null && tFell - t0 >= GATHER_HIT_PLAN_WAIT_MS - 50, { waited: tFell - t0 });
    await P.page.waitForTimeout(400);
    const wire1 = (await H.wireCounts(P)).extraction_start || 0;
    const srv = await hitPlanOf(wsPort, myId);
    const live = await H.adminPlayer(wsPort, myId).then((a) => a && a.live).catch(() => null);
    r.ok('no answer: ...and re-declared the attempt on the wire (one start for the tap, one for the timer)', wire1 - wire0 === 2,
      { sent: wire1 - wire0 });
    r.ok('no answer: ...so the worker holds a timer record, not a plan', srv === null && !!live && live.extracting === true,
      { hitPlan: srv, extracting: live && live.extracting });
    const b1 = await P.page.evaluate(() => (window.__btNodeHpBar ? Object.assign({}, window.__btNodeHpBar) : null));
    await P.page.waitForTimeout(600);
    const b2 = await P.page.evaluate(() => (window.__btNodeHpBar ? Object.assign({}, window.__btNodeHpBar) : null));
    r.ok('no answer: the node\'s bar drains on the timer, its number worn down with it (v2.3.3035: "7/10", the node\'s HP)',
      !!b1 && !!b2 && b1.mode === 'timer' && b2.mode === 'timer' && b2.frac < b1.frac
        && /^[0-9]+[/][0-9]+$/.test(b1.text || '') && b1.maxHp > 0 && b2.hp <= b1.hp && b1.text === b1.hp + '/' + b1.maxHp,
      { b1, b2 });
    const res = await gestureAndPay(pick.type, invBefore, r, 'no answer');
    await unstash();
    await P.page.evaluate(() => { window._gameState.current._gatherHitSeq = 0; });
    return res;
  });

  /* ── B. AN OLD CLIENT ──  No caps.gatherhits: it never asks. */
  await withRetry('old client', async (r) => {
    const invBefore = await srvInv(wsPort, myId);
    const pick = await pickAlive('tree');
    r.ok('old client: a live node and still in the zone (guard)', !!pick.type, pick);
    if (!pick.type) return {};
    await P.page.evaluate(() => { const S = window._gameState.current; S._capsKeep = S._serverCaps; S._serverCaps = Object.assign({}, S._serverCaps, { gatherhits: false }); });
    const node = await tapNode(pick.type, r);
    if (!node) { await P.page.evaluate(() => { const S = window._gameState.current; S._serverCaps = S._capsKeep; }); return {}; }
    const hits = await H.readState(P, (S) => (S._extraction ? !!S._extraction.hits : null));
    await P.page.waitForTimeout(500);
    const srv = await hitPlanOf(wsPort, myId);
    r.ok('old client: no cap, no hits -- the timer it always ran', hits === false, { hits });
    r.ok('old client: ...and the worker holds it to the timer, not to a plan', srv === null, srv);
    const res = await gestureAndPay(pick.type, invBefore, r, 'old client');
    await unstash();
    await P.page.evaluate(() => { const S = window._gameState.current; S._serverCaps = S._capsKeep; });
    return res;
  });

  /* ── C. THE KILL SWITCH, THROWN MID-SESSION ── */
  const set = await flag(wsPort, 'POST', { name: 'gatherhits', value: false });
  rec.ok('the gatherhits kill switch is thrown through the admin flags route (guard)',
    !!(set && set.ok && set.flags && set.flags.gatherhits === false), set);
  await withRetry('kill switch', async (r) => {
    const invBefore = await srvInv(wsPort, myId);
    const pick = await pickAlive('fishSpot');
    r.ok('kill switch: a live node and still in the zone (guard)', !!pick.type, pick);
    if (!pick.type) return {};
    const node = await tapNode(pick.type, r);
    if (!node) return {};
    const t0 = await H.readState(P, (S) => (S._extraction ? S._extraction.startedAt : null));
    const fell = await H.waitFor(P, (S) => (S._extraction ? (S._extraction.hits ? 'hits' : 'timer') : 'none'), (v) => v !== 'hits',
      { timeout: 4000, label: 'the worker says off' }).catch(() => null);
    const tFell = await H.readState(P, (S) => (S._extraction ? S._extraction.startedAt : null));
    if (fell === 'none') return { cancelled: true, why: 'the extraction ended while waiting' };
    r.ok('kill switch: the worker answers `off` and the harvest is on the timer AT ONCE (not after the plan wait)',
      fell === 'timer' && t0 != null && tFell != null && tFell - t0 < 1000, { fell, after: tFell - t0 });
    const res = await gestureAndPay(pick.type, invBefore, r, 'kill switch');
    await unstash();
    return res;
  });
}
