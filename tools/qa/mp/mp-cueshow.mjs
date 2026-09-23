/* ═══ THE CUE GESTURE, ALL THREE GATHERING SKILLS, IN A REAL ZONE (v2.3.2760) ═══
 *
 * Owner: "I wanted the character to perform each animation with a loading bar
 * above their head ... once it reaches the limit, the character is supposed
 * to stop animating until you perform the correct gesture ... As you perform
 * the gesture the character's frames should animate at the speed you perform
 * the gesture, but require about 3 seconds of performing the gesture at a
 * quick pace ... resource or action specific effects."
 *
 * mp-gcue proves the mechanism on a campfire in town (cheap, no travel).  This
 * one walks the three skills that need a real node -- mining, woodcutting,
 * fishing -- in a real spoke zone (every spoke has one tree, one fish spot and
 * one ore vein, gathering.js), on a phone, through the real tap and the real
 * pointer path, and for each one:
 *   1. the wind-up: the bar fills and the character WORKS (its pose moves);
 *   2. `ready`, untouched: the character is FROZEN, the bar is full and
 *      flashing, the mini tool of THIS skill is the cue;
 *   3. the gesture: the pose moves with the strokes, the skill's own effect
 *      fires (rock debris / wood chips / a splash), and the meter fills;
 *   4. finished: the worker put the resource in the bag.
 * Screenshots of each stage land in tools/qa/mp/out/cueshow-*.png for a human
 * to look at -- the owner asked for a LOOK, and a 46px bar and a 26-unit icon
 * are exactly the things an assertion can pass on while looking wrong.
 */
import * as H from './harness.mjs';

const TILE = 32;
const PHONE = { width: 390, height: 844 };

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

/* Where the player stands to work each node, relative to its anchor.  Mining
   and fishing snap the player themselves on start (lifeSkillRewards); this is
   only close enough for the tap to be offered.  Trees: inside the canopy, the
   place a player actually stands (mp-chopyield's STAND_Y_OFF). */
const STAND = { oreVein: [0, -70], tree: [0, -130], fishSpot: [50, -40] };
const SKILL = { oreVein: 'mining', tree: 'woodcutting', fishSpot: 'fishing' };
const RES = { oreVein: 'ore_', tree: 'wood_', fishSpot: 'fish_' };
const FX = { oreVein: 'rocks', tree: 'woodchips', fishSpot: 'splash' };

const state = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const ex = S._extraction;
  const bar = window.__btWindupBar || null;
  const fx = (S._fxBursts || []).map((b) => b.kind);
  return {
    status: ex ? ex.status : null, skill: ex ? ex.skill : null,
    posF: ex && ex._posF != null ? +ex._posF.toFixed(3) : null,
    progress: ex ? +(ex.progress || 0).toFixed(3) : null,
    bar: bar ? { bar01: bar.bar01, ready: bar.ready, idle: bar.idle, x: bar.x, y: bar.y, w: bar.w } : null,
    player: S.player ? { x: Math.round(S.player.x), y: Math.round(S.player.y) } : null,
    band: S._selfBandTopY != null ? Math.round(S._selfBandTopY) : null,
    fx,
    sprite: (() => {
      const img = document.querySelector('.bt-rjoy-base svg[viewBox="0 0 100 100"] [data-cue="sprite"] image');
      return img ? img.getAttribute('href') : null;
    })(),
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Gatherer', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2 });
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

  const marks = await P.page.evaluate(() => {
    const f = window._gameFns;
    if (!f || !f.TOWN_EXITS || !f.WORLDVIEW_EXITS) return null;
    return {
      townExit: f.TOWN_EXITS.find((e) => e.zoneId === 'worldview') || null,
      spokes: f.WORLDVIEW_EXITS.filter((e) => e.zoneId !== 'town').map((e) => ({ zoneId: e.zoneId, tx: e.tx, ty: e.ty })),
    };
  });
  if (!marks || !marks.townExit || !marks.spokes.length) {
    rec.skip('the cue gesture in a real zone', 'no exit tables on the _gameFns bridge');
    await P.ctx.close().catch(() => {});
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
  await travel(marks.townExit.tx, marks.townExit.ty, 'worldview');
  const spoke = marks.spokes.find((s) => s.zoneId === 'frost') || marks.spokes[0];
  const arrived = await travel(spoke.tx, spoke.ty, spoke.zoneId);
  rec.ok(`arrived in a gathering zone (${spoke.zoneId}) (guard)`, arrived === true, { spoke });
  if (!arrived) { await P.ctx.close().catch(() => {}); return; }
  await H.waitFor(P, (S) => (S.gatherNodes || []).filter((n) => n.alive).length, (n) => n >= 3,
    { timeout: 15000, label: 'the nodes arrive' }).catch(() => {});
  /* Close whatever sheet is up so the button is not behind a menu, and the
     quest coach's tip bubble, which otherwise sits over the character. */
  await H.closeDest(P).catch(() => {});
  /* SCREENSHOT HYGIENE ONLY: the ore vein in these maps sits near the top
     edge, so the camera parks the miner right under the quest tracker, and
     the coach's tip bubble lands on the character -- together they cover the
     exact spot over the head this file wants a picture of.  Hidden with a
     style tag (not by dismissing, which would change quest state); nothing
     asserted below reads them. */
  await P.page.addStyleTag({ content:
    '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
  /* ...and the zone's quest reminder card, found by its text (it carries no
     stable class): the nearest positioned ancestor of the line that reads
     "Bring N ...". */
  const dismissTips = () => P.page.evaluate(() => {
    for (const d of document.querySelectorAll('div')) {
      /* the DEEPEST element with that text -- an ancestor matches too, and
         hiding the app root is how the first cut of this ate every tap */
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

  /* ONE HARVEST, measured.  `rec` here is a buffer the driver below flushes --
     see there for why an attempt can be thrown away. */
  const harvestOnce = async (type, rec) => {
    const skill = SKILL[type];
    const node = await P.page.evaluate((t) => {
      const S = window._gameState.current;
      const n = (S.gatherNodes || []).find((g) => g.alive && g.nodeType === t);
      return n ? { id: n.id, x: n.x, y: n.y } : null;
    }, type);
    rec.ok(`${skill}: a live ${type} in the zone (guard)`, !!node, { node });
    if (!node) return {};

    /* Stand there, with the field cleared so a monster cannot eat the tap
       (the tap hit-tests monsters first, v2.3.1448). */
    await P.page.evaluate(({ x, y }) => {
      const S = window._gameState.current;
      S.player.x = x; S.player.y = y; S.player.vx = 0; S.player.vy = 0;
      S._monstersStash = S.monsters; S.monsters = [];
    }, { x: node.x + STAND[type][0], y: node.y + STAND[type][1] });
    await P.page.waitForTimeout(900);
    const invBefore = await srvInv(wsPort, myId);

    let started = null;
    for (let i = 0; i < 4 && started !== skill; i++) {
      await P.page.evaluate((id) => {
        const S = window._gameState.current;
        const n = (S.gatherNodes || []).find((g) => g.id === id);
        if (!n) return;
        const cv = document.querySelector('canvas');
        const r = cv.getBoundingClientRect();
        const x = r.left + (n.x - S.camera.x) * (S._worldScaleX || 1);
        const y = r.top + (n.y - 24 - S.camera.y) * (S._worldScaleY || 1);
        const mk = (type) => new TouchEvent(type, { bubbles: true, cancelable: true,
          touches: type === 'touchend' ? [] : [new Touch({ identifier: 77, target: cv, clientX: x, clientY: y })],
          changedTouches: [new Touch({ identifier: 77, target: cv, clientX: x, clientY: y })] });
        cv.dispatchEvent(mk('touchstart'));
        cv.dispatchEvent(mk('touchend'));
      }, node.id);
      await P.page.waitForTimeout(700);
      started = await H.readState(P, (S) => (S._extraction ? S._extraction.skill : null));
    }
    rec.ok(`${skill}: tapping the node starts the harvest (guard)`, started === skill, { started });
    if (started !== skill) {
      await P.page.evaluate(() => { const S = window._gameState.current; if (S._monstersStash) { S.monsters = S._monstersStash; S._monstersStash = null; } });
      return {};
    }

    /* ── 1. THE WIND-UP ── */
    await dismissTips();
    const w1 = await state(P);
    await P.page.waitForTimeout(400);
    const w2 = await state(P);
    const box = await H.figureBox(P, { pad: 70 }).catch(() => null);
    const shot = async (name) => {
      await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/cueshow-${skill}-${name}.png`, clip: box || undefined }).catch(() => {});
      const btn = await P.page.evaluate(() => {
        const b = document.querySelector('.bt-rjoy-base');
        if (!b) return null;
        const r = b.getBoundingClientRect();
        return { x: Math.max(0, r.left - 14), y: Math.max(0, r.top - 14), width: r.width + 28, height: r.height + 28 };
      });
      if (btn) await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/cueshow-${skill}-${name}-button.png`, clip: btn }).catch(() => {});
    };
    await shot('1-windup');
    rec.ok(`${skill}: during the wind-up the bar fills`, !!(w1.bar && w2.bar && !w2.bar.ready && w2.bar.bar01 > w1.bar.bar01), { w1: w1.bar, w2: w2.bar });

    console.log(`    ${skill} wind-up: ` + JSON.stringify({ bar: w2.bar, player: w2.player, band: w2.band }));
    /* ── 2. READY, UNTOUCHED ── */
    const opened = await H.waitFor(P, (S) => (S._extraction ? S._extraction.status : null), (v) => v === 'ready',
      { timeout: 20000, label: 'the window opens' }).catch(() => null);
    rec.ok(`${skill}: the gesture window opens (guard)`, opened === 'ready', { opened });
    if (opened !== 'ready') return {};
    await P.page.waitForTimeout(500);
    const r1 = await state(P);
    await P.page.waitForTimeout(700);
    const r2 = await state(P);
    await shot('2-ready');
    await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/cueshow-${skill}-2-ready-full.png` }).catch(() => {});
    console.log(`    ${skill} ready: ` + JSON.stringify({ bar: r2.bar, player: r2.player, band: r2.band }));
    rec.ok(`${skill}: at ready the character is FROZEN on the ready pose`, r1.posF === 0 && r2.posF === 0, { r1: r1.posF, r2: r2.posF });
    rec.ok(`${skill}: ...the bar is full and flashing`, !!(r2.bar && r2.bar.ready && r2.bar.idle), r2.bar);
    rec.ok(`${skill}: ...and the cue is the ${skill} tool`, new RegExp({ mining: 'pickaxe', woodcutting: 'axe', fishing: 'fishing-pole' }[skill]).test(r2.sprite || ''), r2);

    /* ── 3. THE GESTURE ──  In-page, continuous, and a quick pace. */
    const cue = await P.page.evaluate(() => (window.__btHarvest ? window.__btHarvest().cue : null));
    const midShot = P.page.evaluate(async () => { await new Promise((r) => setTimeout(r, 1300)); return true; })
      .then(() => shot('3-gesture'));
    const g = await P.page.evaluate(async ([sk, cx, cy]) => {
      const S = window._gameState.current;
      const ev = (t, x, y) => window.dispatchEvent(new PointerEvent(t, { pointerId: 9, clientX: x, clientY: y,
        pointerType: 'touch', bubbles: true, cancelable: true, isPrimary: true }));
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      ev('pointerdown', cx, cy);
      const t0 = performance.now();
      const poses = new Set(), fx = new Set();
      let step = 0, lastProg = 0;
      while (performance.now() - t0 < 60000) {
        let x = cx, y = cy;
        if (sk === 'fishing') {
          const a = step * (Math.PI / 6);   /* 12 moves a turn, clockwise */
          x = cx + Math.cos(a) * 28; y = cy + Math.sin(a) * 28;
        } else {
          const k = step % 12, v = k < 6 ? -26 + 52 * k / 6 : 26 - 52 * (k - 6) / 6;
          if (sk === 'woodcutting') { x = cx + v; y = cy + Math.sin(step) * 3; } else { y = cy + v; x = cx + Math.sin(step) * 3; }
        }
        ev('pointermove', x, y);
        step++;
        await sleep(16);
        const ex = S._extraction;
        if (ex && ex._posF != null) poses.add(Math.round(ex._posF * 20));
        for (const b of (S._fxBursts || [])) fx.add(b.kind);
        if (ex) lastProg = ex.progress || 0;
        if (!ex || ex.status !== 'ready') break;
      }
      ev('pointerup', cx, cy);
      /* `done` means the METER finished it.  A harvest can also end because
         something else cancelled it -- a snowman's knockback is a walk-away
         cancel (the stash above only hides CLIENT monsters; the worker's still
         swing) -- and that must read as a cancel, not as the gesture working. */
      const ended = !S._extraction;
      return { ms: Math.round(performance.now() - t0), moves: step, poses: poses.size, fx: [...fx],
        done: ended && lastProg >= 0.85, cancelled: ended && lastProg < 0.85, lastProg: +lastProg.toFixed(2) };
    }, [skill, cue ? cue.x : 300, cue ? cue.y : 700]);
    await midShot;
    console.log(`    ${skill} gesture: ` + JSON.stringify(g));
    rec.ok(`${skill}: the strokes animate the character`, g.poses >= 5, g);
    rec.ok(`${skill}: ...the skill's own effect fires while you gesture (${FX[type]})`, g.fx.includes(FX[type]), g);
    rec.ok(`${skill}: ...and the gesture completes the harvest`, g.done === true, g);

    /* ── 4. THE RESOURCE ── */
    const got = await (async () => {
      for (let i = 0; i < 20; i++) {
        const inv = await srvInv(wsPort, myId);
        if (sumPrefix(inv, RES[type]) > sumPrefix(invBefore, RES[type])) return sumPrefix(inv, RES[type]) - sumPrefix(invBefore, RES[type]);
        await P.page.waitForTimeout(400);
      }
      return 0;
    })();
    /* The worker's own reason when it pays nothing (admin.js lastStrike). */
    const lastStrike = got > 0 ? null : await H.adminPlayer(wsPort, myId).then((a) => (a && (a.lastStrike || (a.live && a.live.lastStrike))) || null).catch(() => null);
    rec.ok(`${skill}: the worker put the ${RES[type]}* resource in the bag`, got > 0, { got, lastStrike });
    await P.page.evaluate(() => { const S = window._gameState.current; if (S._monstersStash) { S.monsters = S._monstersStash; S._monstersStash = null; } });
    await P.page.waitForTimeout(800);
    return { cancelled: !!(g && g.cancelled) };
  };
  /* THE DRIVER.  A harvest is ~6s of gesture now (v2.3.2761), which in this
     harness is ~25s of wall clock, and Frost Ridge's snowmen are the WORKER's:
     the client-side stash above cannot stop one walking up and knocking the
     player off the node, which is a walk-away cancel.  That is the game working
     as designed and not what this file measures, so a CANCELLED attempt (the
     meter was not full when the harvest ended) is thrown away and the skill is
     run once more.  Anything else -- a guard, a real failure -- is recorded. */
  for (const type of ['oreVein', 'tree', 'fishSpot']) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const buf = [];
      const res = await harvestOnce(type, { ok: (...args) => buf.push(args), skip: (...args) => rec.skip(...args) });
      if (res && res.cancelled && attempt === 0) {
        console.log(`    ${SKILL[type]}: a monster cancelled the harvest -- running it again`);
        await P.page.evaluate(() => { const S = window._gameState.current; if (S._monstersStash) { S.monsters = S._monstersStash; S._monstersStash = null; } });
        await P.page.waitForTimeout(2500);
        continue;
      }
      for (const args of buf) rec.ok(...args);
      break;
    }
  }
  await P.ctx.close().catch(() => {});
}
