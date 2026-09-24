/* ═══ v2.3.2787: THE FACE TATTOO STAYS ON UNDER THE HEAD OVERLAYS ═══
 *
 * Owner: "Yea do woodcutting and missing ones."  The missing ones started
 * here: the game draws a separate HEAD over your own on every loot pickup,
 * while mining or taking a hit in armour, and while jogging in the full steel
 * set (the helmetless knight figure) -- and those head sheets were baked with
 * no drawings at all, so a face tattoo vanished whenever one was up.
 *
 * This reads the head overlay sprite (display._bodyHead) as the renderer holds
 * it, on every animation frame, and counts the ink in it:
 *
 *   - the face is drawn BLUE on its LEFT half only (asymmetric on purpose, so
 *     the side the ink sits on says whether a flipped facing reads backwards);
 *   - the back of the head is drawn GREEN, which is what a head turned away
 *     must show instead of the face (artForFacing, v2.3.2043).
 *
 * Nothing in the head art is blue or green, so ink needs no comparison with the
 * sheet: a blue pixel on a head overlay is the face drawing.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';

const SHOTS = H.REPO + '/tools/qa/mp/out';
/* A picture of the figure while a pose is held (`poke` keeps it up). */
const shot = async (P, name, poke) => {
  if (poke) {
    await P.page.evaluate((code) => {
      window.__qaShotPoke = new Function('S', code);
      const tick = () => {
        if (!window.__qaShotPoke) return;
        try { window.__qaShotPoke(window._gameState.current); } catch (e) { /* ignore */ }
        requestAnimationFrame(tick);
      };
      tick();
    }, poke);
    await P.page.waitForTimeout(500);
  }
  const box = await H.figureBox(P, { pad: 12 }).catch(() => null);
  if (box) await P.page.screenshot({ path: `${SHOTS}/headink-${name}.png`, clip: box }).catch(() => {});
  if (poke) await P.page.evaluate(() => { window.__qaShotPoke = null; });
};

const LEFT_BLUE = Array.from({ length: 256 }, (_, i) => ((i % 16) < 8 ? '8' : '0')).join('');
const ALL_GREEN = '6'.repeat(256);

const COACH_OFF = `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle',
    'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
} catch (e) {}`;
/* Into storage BEFORE the character exists, so the creator's join carries them
   into the saved record (v2.3.2746). */
const SEED = COACH_OFF + `
try {
  localStorage.setItem('bt-facetattoo', ${JSON.stringify(LEFT_BLUE)});
  localStorage.setItem('bt-headbackart', ${JSON.stringify(ALL_GREEN)});
} catch (e) {}`;

/* Every distinct head-overlay frame drawn for `ms`, own figure (pid null) or a
   peer's.  `poke` runs in the page each animation frame -- it is what holds a
   pose that the game would otherwise let lapse (a hit flash is 250 ms). */
const sampleHead = (P, pid, ms, poke) => P.page.evaluate(async ({ pid, dur, poke }) => {
  const R = window._pixiRenderer;
  const pokeFn = poke ? new Function('S', 'pid', poke) : null;
  const isBlue = (d, o) => d[o + 3] > 60 && d[o + 2] > d[o] + 40 && d[o + 2] > d[o + 1] + 20;
  const isGreen = (d, o) => d[o + 3] > 60 && d[o + 1] > d[o] + 30 && d[o + 1] > d[o + 2] + 20;
  const out = [];
  const seen = new Set();
  const t0 = performance.now();
  await new Promise((done) => {
    const tick = () => {
      const S = window._gameState && window._gameState.current;
      try { if (pokeFn && S) pokeFn(S, pid); } catch (e) { /* the pose holds or it does not */ }
      const disp = pid ? (R.peerDisplayRaw && R.peerDisplayRaw(pid)) : (R.playerDisplayRaw && R.playerDisplayRaw());
      const hd = disp && disp._bodyHead;
      const pose = disp ? disp._animPose : null, dir = disp ? disp._animDir : null;
      if (hd && hd.visible && hd.texture && hd.texture.source && hd.texture.source.resource) {
        const t = hd.texture;
        const key = t.uid + ':' + (hd.scale.x < 0 ? 'f' : 'n') + ':' + pose;
        if (!seen.has(key)) {
          seen.add(key);
          const f = t.frame, tr = t.trim || { x: 0, y: 0 };
          const W = Math.round((t.orig || f).width), Hh = Math.round((t.orig || f).height);
          const c = document.createElement('canvas'); c.width = W; c.height = Hh;
          const g = c.getContext('2d', { willReadFrequently: true });
          g.imageSmoothingEnabled = false;
          g.drawImage(t.source.resource, f.x, f.y, f.width, f.height, tr.x, tr.y, f.width, f.height);
          const d = g.getImageData(0, 0, W, Hh).data;
          let blue = 0, green = 0, sx = 0, x0 = W, x1 = -1;
          for (let o = 0, p = 0; o < d.length; o += 4, p++) {
            if (d[o + 3] > 60) { const x = p % W; if (x < x0) x0 = x; if (x > x1) x1 = x; }
            if (isBlue(d, o)) { blue++; sx += p % W; }
            if (isGreen(d, o)) green++;
          }
          /* where the face ink sits across the head: -1 its left edge, +1 its right */
          const side = (blue && x1 > x0) ? +(((sx / blue) - (x0 + x1) / 2) / ((x1 - x0) / 2)).toFixed(2) : null;
          out.push({ t: Math.round(performance.now() - t0), pose, dir, flip: hd.scale.x < 0, blue, green, side });
        }
      } else {
        const key = 'none:' + pose;
        if (!seen.has(key)) { seen.add(key); out.push({ t: Math.round(performance.now() - t0), pose, dir, none: true }); }
      }
      if (performance.now() - t0 < dur) requestAnimationFrame(tick); else done();
    };
    requestAnimationFrame(tick);
  });
  return out;
}, { pid: pid || null, dur: ms, poke: poke || null });

const setGear = (P, slot, item) => P.page.evaluate(([s, i]) => {
  if (!window.__btSetGear) return 'no seam';
  window.__btSetGear(s, i); return 'ok';
}, [slot, item]);

const settle = async (P, wsPort) => {
  await H.clickText(P, 'CLOSE').catch(() => {});
  const id = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'quests', id).catch(() => {});
  await P.page.waitForTimeout(1000);
  await H.closeNpcDialogue(P).catch(() => {});
};

export async function run(ctx) {
  const opened = [];
  try { await scenario(ctx, opened); } finally {
    for (const P of opened) await P.ctx.close().catch(() => {});
  }
}

async function scenario({ browser, wsPort, webPort, rec }, opened) {
  mkdirSync(SHOTS, { recursive: true });
  const B = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, guest: true, dpr: 2, init: COACH_OFF });
  opened.push(B);
  const A = await H.newPlayer(browser, { name: 'Inked', wsPort, webPort, dpr: 2, init: SEED });
  opened.push(A);
  await H.enterWorld(B);
  await H.enterWorld(A);
  await A.page.waitForTimeout(3000);
  await settle(A, wsPort);
  const aId = await H.readState(A, (S) => S.myId);
  await H.waitMutualSight(A, B).catch(() => {});
  const aAt = await H.readState(A, (S) => ({ x: S.player.x, y: S.player.y }));
  await H.hopTo(B, aAt.x - 150, aAt.y + 20);
  await B.page.waitForTimeout(2000);

  const relayed = await B.page.evaluate(([id, face, back]) => {
    const o = ((window._gameState.current || {}).others || {})[id];
    return o ? { face: o.faceTattooArt === face, back: o.headBackTattooArt === back } : null;
  }, [aId, LEFT_BLUE, ALL_GREEN]);
  rec.ok('the watcher has his face and back-of-head drawings off the wire (guard)',
    !!relayed && relayed.face && relayed.back, relayed);

  /* ── LOOT PICKUP: the overlay is drawn on every pickup, armour or not ── */
  const pick = await sampleHead(A, null, 4000,
    "if (!S._lootFreezeUntil || Date.now() > S._lootFreezeUntil - 100) S._lootFreezeUntil = Date.now() + 700;");
  await shot(A, 'pickup', "S._lootFreezeUntil = Date.now() + 700;");
  const pk = pick.filter((s) => s.pose === 'pickup' && !s.none);
  console.log(`    pickup, blue ink per head frame: ${pk.map((s) => s.blue).join(' ')}`);
  rec.ok('picking up loot draws the head overlay (guard)', pk.length >= 3, pick.slice(0, 6));
  rec.ok('ON EVERY PICKUP FRAME the face tattoo is on the head overlay, from the first',
    pk.length > 0 && pk.every((s) => s.blue >= 30), pk.map((s) => s.blue));
  rec.ok('...on the head\'s left half, the way it was drawn', pk.length > 0 && pk.every((s) => s.side != null && s.side < -0.1),
    pk.map((s) => s.side));

  /* ── THE FULL STEEL SET: the knight figure wears your head ── */
  rec.ok('the test can drive the equip store (guard)', (await setGear(A, 'chest', 'steelplate')) === 'ok');
  await setGear(A, 'legs', 'steelgreaves');
  await A.page.waitForTimeout(1800);
  const jog = {};
  for (const [key, name] of [['s', 'south'], ['d', 'east'], ['a', 'west'], ['w', 'north']]) {
    await A.page.keyboard.down(key);
    await A.page.waitForTimeout(250);
    jog[name] = (await sampleHead(A, null, 1600)).filter((s) => s.pose === 'jog' && !s.none);
    if (name === 'south' || name === 'west') await shot(A, 'knight-' + name);
    await A.page.keyboard.up(key);
    await A.page.waitForTimeout(300);
    console.log(`    knight jog ${name}: blue/green/side/flip per frame: ${jog[name].map((s) => `${s.blue}/${s.green}/${s.side}/${s.flip ? 1 : 0}`).join(' ')}`);
  }
  for (const name of ['south', 'east', 'west']) {
    const fr = jog[name];
    rec.ok(`knight jog ${name}: the head overlay is drawn (guard)`, fr.length >= 3, fr.length);
    rec.ok(`knight jog ${name}: the face tattoo is on it, every frame`, fr.length > 0 && fr.every((s) => s.blue >= 20),
      fr.map((s) => s.blue));
  }
  /* East is the art's own facing; west is east drawn flipped.  In the texture
     the plain bake has the ink on the head's left, and the flipped one must
     have it on the RIGHT -- which the flip puts back on the left on screen. */
  rec.ok('knight jog east: the drawing\'s left half on the head\'s left', jog.east.length > 0
    && jog.east.every((s) => !s.flip && s.side != null && s.side < -0.1), jog.east.map((s) => [s.flip, s.side]));
  rec.ok('knight jog WEST (east flipped): the pre-flipped head, so the drawing still reads the way it was drawn',
    jog.west.length > 0 && jog.west.every((s) => s.flip && s.side != null && s.side > 0.1), jog.west.map((s) => [s.flip, s.side]));
  rec.ok('knight jog NORTH: the back of the head shows the back-of-head drawing, not the face',
    jog.north.length >= 3 && jog.north.every((s) => s.green >= 20 && s.blue === 0), jog.north.map((s) => [s.green, s.blue]));

  /* ── A HIT, IN ARMOUR ──
     The hit pose lasts 250 ms from S._hitFlash, and this box can take longer
     than that between two frames -- a flash set "60 ms ago" is often already
     over by the frame that draws it.  So the flash is set AHEAD of the clock,
     far enough to survive a slow frame, and swept, which keeps the pose up and
     still walks it off its first frame now and then. */
  const HIT_POKE = 'const k = (performance.now() / 5) % 300; ';
  /* The jogs above end facing NORTH, where the hit head is the back of the
     head (and correctly shows the green back drawing).  Face the camera. */
  await A.page.keyboard.down('s');
  await A.page.waitForTimeout(220);
  await A.page.keyboard.up('s');
  await A.page.waitForTimeout(600);
  const hitAll = await sampleHead(A, null, 1800, HIT_POKE + 'S._hitFlash = Date.now() + 400 - k;');
  const hit = hitAll.filter((s) => s.pose === 'hit' && !s.none);
  await shot(A, 'hit', 'S._hitFlash = Date.now() + 300;');
  console.log(`    hit in armour, blue ink per head frame: ${hit.map((s) => s.blue).join(' ')}`);
  rec.ok('a hit in armour draws the head overlay (guard)', hit.length >= 1, hitAll.slice(0, 6));
  rec.ok('...and the face tattoo is on it', hit.length > 0 && hit.every((s) => s.blue >= 20), hit.map((s) => s.blue));

  /* ── MINING, IN ARMOUR ── */
  await A.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const node = { id: 'qa_node_headink', nodeType: 'oreVein', tierLvl: 1, x: S.player.x, y: S.player.y + 20,
      alive: true, hp: 999, maxHp: 999, r: 40 };
    S.gatherNodes = (S.gatherNodes || []).filter((n) => n && n.id !== node.id).concat([node]);
    S._extraction = { skill: 'mining', status: 'waiting', nodeRef: node, nodeId: node.id,
      startedAt: Date.now(), windowOpensAt: Date.now() + 600000 };
  });
  const mine = (await sampleHead(A, null, 2500)).filter((s) => s.pose === 'mine' && !s.none);
  await shot(A, 'mine');
  await A.page.evaluate(() => { const S = window._gameState.current; S._extraction = null; });
  console.log(`    mining in armour, blue ink per head frame: ${mine.map((s) => s.blue).join(' ')}`);
  rec.ok('mining in armour draws the head overlay (guard)', mine.length >= 3, mine.length);
  rec.ok('...and the face tattoo is on every frame of the swing', mine.length > 0 && mine.every((s) => s.blue >= 20),
    mine.map((s) => s.blue));

  /* ── ANOTHER PLAYER'S VIEW ── */
  await H.waitMutualSight(A, B).catch(() => {});
  let peerJog = null;
  await A.page.keyboard.down('s');
  peerJog = (await sampleHead(B, aId, 3500)).filter((s) => s.pose === 'jog' && !s.none);
  await A.page.keyboard.up('s');
  const firstInk = peerJog.findIndex((s) => s.blue >= 20);
  console.log(`    watcher, knight jog south: t:blue per frame: ${peerJog.map((s) => `${s.t}:${s.blue}`).join(' ')}`);
  rec.ok('the watcher sees his knight with the head overlay (guard)', peerJog.length >= 3, peerJog.length);
  /* A peer's look cannot be baked at load; the head sheet bakes the first time
     it is needed, as every other part of a custom-looking peer does. */
  rec.ok('ON THE WATCHER\'S SCREEN the knight\'s head carries the face tattoo once it bakes, and on every frame after',
    firstInk >= 0 && peerJog.slice(firstInk).every((s) => s.blue >= 20),
    { firstInk, frames: peerJog.map((s) => [s.t, s.blue]) });
  const peerHitAll = await sampleHead(B, aId, 2500, HIT_POKE + 'const o = S.others && S.others[pid]; if (o) o._hitFlash = Date.now() + 400 - k;');
  const peerHit = peerHitAll.filter((s) => s.pose === 'hit' && !s.none);
  const firstHitInk = peerHit.findIndex((s) => s.blue >= 20);
  console.log(`    watcher, his hit in armour: t:blue per frame: ${peerHit.map((s) => `${s.t}:${s.blue}`).join(' ')}`);
  rec.ok('...and on his head when he is hit in armour, once it bakes',
    firstHitInk >= 0 && peerHit.slice(firstHitInk).every((s) => s.blue >= 20),
    { hit: peerHit.map((s) => [s.t, s.blue]), all: peerHitAll.slice(0, 8) });

  for (const P of [A, B]) {
    const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
    rec.ok(`no page errors on ${P.name}'s client`, errs.length === 0, errs.slice(0, 3));
  }
}
