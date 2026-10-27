/* ═══ THE SWORD AND BOW BODIES UNDER GREAVES (v2.3.3640) ═══
 *
 * The owner, 2026-10-27: "check all the animations for ghost remnants of
 * either a body beneath or areas for cleanup".  mp-ghostaudit photographed
 * every frame of a bro in pink trousers and blue boots under iron armour, and
 * every frame of the sword's swing showed them beside the greaves: the swing
 * (and the bow's shot) is a stand-in made of separate pictures -- a recoloured
 * bare body with the greaves' own strip drawn over it -- whose legs are not
 * drawn in the same place.  playerSkins.js _clampLegsUnder takes the body's
 * legs that the greaves do not cover out of the bake.
 *
 * A bro in those colours stands on the commons, the world's other layers put
 * away so only the stand-in is drawn, the page's clock held mid-pose:
 *   1. in iron greaves, every sword facing (south, east, north and the
 *      mirrored west) and every bow facing (east, southwest, south, northwest,
 *      north): almost no trousers or boots colour at or below the greaves'
 *      top -- and the very same frame with the clamp off
 *      (`__btStandInLegs.set(false)`) shows plenty, so the test sees the leak;
 *   2. with no greaves the stand-in keeps its trousers and boots;
 *   3. a second player sees the first's swing in greaves clamped the same way
 *      (the peer bake, _remoteBodyFramesFor), and plain with the clamp off.
 */
import * as H from './harness.mjs';

const VIEW = { width: 900, height: 700 };
const LOOK = `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle', 'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  localStorage.setItem('bt-skin', 'green'); localStorage.setItem('bt-pants', 'pink'); localStorage.setItem('bt-shoes', 'blue');
  localStorage.setItem('bt-shirt', 'tshirt'); localStorage.setItem('bt-shirtcolor', 'yellow');
  localStorage.setItem('bt-hair', 'none'); localStorage.setItem('bt-headwear', 'none');
} catch (e) {}`;
/* the most of the trousers' and boots' colours (device px, at pixel ratio 2)
   a frame may show at or below the greaves' top: their anti-aliased seam with
   the steel, a speck or two */
const LEAK_MAX = 14;
/* ...and the least a pose's moments show together with the clamp off, for the
   check to mean anything */
const LEAK_SEEN = 25;

const FACING_ANG = { east: 0, southeast: Math.PI / 4, south: Math.PI / 2, southwest: 3 * Math.PI / 4, west: Math.PI, northwest: -3 * Math.PI / 4, north: -Math.PI / 2, northeast: -Math.PI / 4 };

/* the page's tools: a held clock that creeps (as mp-ghostaudit's: frozen
   outright a time-sliced job never ends), and a render hook that draws only
   the bro's figure layers, without what stood there before the pose (a
   stone, the townsfolk, another player), his name plate or -- for the
   greaves' own row -- anything but their strip */
const KIT = () => {
  if (window.__sl) return true;
  const R = window._pixiRenderer;
  const app = R && R.app;
  const world = app && app.stage.children.find((c) => c.label === 'world');
  if (!world) return false;
  /* the black-screen watchdog (BroTown) would take a frame drawn with the
     world put away for a dark screen and rebuild the renderer -- this hook's
     renderer -- after two strikes; it skips its judgement while a loading
     veil is up, so a hidden one stays up for the test (as mp-ghostaudit) */
  const veil = document.createElement('div');
  veil.className = 'bt-zone-loading';
  veil.setAttribute('data-qa-standin-veil', '');
  veil.style.setProperty('display', 'none', 'important');
  document.body.appendChild(veil);
  const G = window.__sl = {
    on: false, only: null, hideMe: false, realNow: Date.now, held: null, hid: new Set(), foreign: new Set(),
    keep: new Set(['entities', 'player', 'gatherNodesBack', 'gatherNodes', 'gatherNodesFront', 'gestureFront']),
  };
  G.hold = (t) => { G.at = t; G.held = t; Date.now = () => (G.held += 0.0005); };
  /* back to the moment held: the creep adds up over the seconds a shot takes */
  G.rehold = () => { if (G.at != null) G.held = G.at; };
  G.free = () => { Date.now = G.realNow; G.held = null; G.at = null; };
  /* hidden for the one render and put straight back: the game's own idea of
     what is shown is never touched (a stand-in it put away stays away) */
  const rend = app.renderer, orig = rend.render.bind(rend);
  rend.render = function (...a) {
    const hidden = [];
    const hide = (o) => { if (o && o.visible) { o.visible = false; hidden.push(o); } };
    try {
      if (G.on) {
        const me = R.playerDisplayRaw();
        for (const layer of world.children) {
          if (!G.keep.has(layer.label)) { hide(layer); continue; }
          for (const c of layer.children) {
            if (G.foreign.has(c) || (G.only && c !== G.only) || (G.hideMe && c === me)) hide(c);
          }
        }
        if (me && me._uiLayer) hide(me._uiLayer);
      }
    } catch (e) { /* the frame still draws */ }
    G.renders = (G.renders || 0) + 1;
    try { return orig(...a); } finally { for (const o of hidden) o.visible = true; }
  };
  G.isolate = (on) => { G.on = !!on; };
  G.app = app;
  G.same = () => !!(window._pixiRenderer && window._pixiRenderer.app === G.app);
  G.markForeign = () => {
    G.foreign.clear();
    const me = R.playerDisplayRaw();
    for (const layer of world.children) {
      if (!G.keep.has(layer.label)) continue;
      for (const c of layer.children) if (c !== me && c.visible) G.foreign.add(c);
    }
    return G.foreign.size;
  };
  /* the stand-in drawn now (yours, or a peer's by id): where it is on the page */
  G.box = (id) => {
    const p = window.__btStandInLegs && window.__btStandInLegs.pieces(id);
    if (!p) return null;
    const cv = document.querySelector('canvas').getBoundingClientRect();
    const b = p.body.getBounds();
    const pad = 20;
    const X0 = Math.max(0, cv.left + b.x - pad), Y0 = Math.max(0, cv.top + b.y - pad);
    const X1 = Math.min(window.innerWidth, cv.left + b.x + b.width + pad), Y1 = Math.min(window.innerHeight, cv.top + b.y + b.height + pad);
    return { x: Math.round(X0), y: Math.round(Y0), width: Math.round(X1 - X0), height: Math.round(Y1 - Y0), legs: !!(p.legs && p.legs.visible) };
  };
  G.onlyLegs = (id, on) => {
    const p = on && window.__btStandInLegs && window.__btStandInLegs.pieces(id);
    G.only = p && p.legs && p.legs.visible ? p.legs : null;
    return !!G.only;
  };
  return true;
};

/* the page's colours in a shot, in the page itself: trousers pink, boots
   blue, and the rows where anything is drawn */
async function colours(page, buf) {
  return page.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
    const d = cx.getImageData(0, 0, cv.width, cv.height).data;
    const W = cv.width, H = cv.height;
    const pinkRow = new Int32Array(H), blueRow = new Int32Array(H), anyRow = new Int32Array(H);
    let top = H, bottom = -1;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4, r = d[i], g = d[i + 1], b = d[i + 2];
        if (Math.abs(r - 13) + Math.abs(g - 11) + Math.abs(b - 24) < 18) continue;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        anyRow[y]++;
        if (r > 110 && b > 70 && r > b && g < r * 0.72 && b > g * 1.15) pinkRow[y]++;
        else if (b > 110 && b > r * 2.0 && b > g * 1.5) blueRow[y]++;
      }
    }
    return { W, H, top, bottom, pinkRow: Array.from(pinkRow), blueRow: Array.from(blueRow), anyRow: Array.from(anyRow) };
  }, buf.toString('base64'));
}

/* one held frame, measured: the trousers' and boots' colours at or below the
   greaves' top (their own strip drawn alone gives the row), else below the
   figure's top third (the head) */
const SHOTS = process.env.BT_SL_SHOTS ? H.REPO + '/tools/qa/mp/out/standinlegs' : null;
async function shoot(page, box) {
  await page.evaluate(() => window.__sl.rehold());
  await page.waitForTimeout(350);
  return page.screenshot({ clip: box });
}
async function measure(page, box, withGreaves, id, name) {
  const buf = await shoot(page, box);
  if (SHOTS) { const fs = await import('node:fs'); fs.mkdirSync(SHOTS, { recursive: true }); fs.writeFileSync(`${SHOTS}/${name}.png`, buf); }
  const full = await colours(page, buf);
  let from = full.top + Math.round((full.bottom - full.top + 1) * 0.32);
  let greavesTop = null;
  if (withGreaves) {
    const only = await page.evaluate((id) => window.__sl.onlyLegs(id, true), id || null);
    const gbuf = only ? await shoot(page, box) : null;
    if (gbuf && SHOTS) { const fs = await import('node:fs'); fs.writeFileSync(`${SHOTS}/${name}-greaves.png`, gbuf); }
    const g = gbuf ? await colours(page, gbuf) : null;
    await page.evaluate(() => window.__sl.onlyLegs(null, false));
    await page.waitForTimeout(150);
    /* the greaves' top as the clamp takes it (playerSkins _clampLegsUnder):
       the row above which 3% of their pixels lie -- above it the trousers'
       waistband shows, as on the walking figure in greaves alone */
    if (g && g.bottom >= 0) {
      const total = g.anyRow.reduce((a, b) => a + b, 0);
      let cum = 0;
      for (let y = 0; y < g.H; y++) { cum += g.anyRow[y]; if (cum >= 0.03 * total) { greavesTop = y; break; } }
      from = greavesTop;
    }
  }
  let pink = 0, blue = 0, pinkAll = 0, blueAll = 0, blueMid = 0;
  /* the band from under the head to above the boots: no boot belongs there */
  const fh = full.bottom - full.top + 1, m0 = full.top + Math.round(fh * 0.35), m1 = full.top + Math.round(fh * 0.72);
  for (let y = 0; y < full.H; y++) {
    pinkAll += full.pinkRow[y]; blueAll += full.blueRow[y];
    if (y >= from) { pink += full.pinkRow[y]; blue += full.blueRow[y]; }
    if (y >= m0 && y <= m1) blueMid += full.blueRow[y];
  }
  return { pink, blue, leak: pink + blue, pinkAll, blueAll, blueMid, greavesTop, top: full.top, bottom: full.bottom };
}

async function wearGreaves(page, on) {
  return page.evaluate((on) => {
    const S = window._gameState.current, R = S.rpg;
    if (on) {
      const i = (R.legsStash || []).findIndex((x) => x && x.mat === 'iron' && x.gid);
      if (i < 0) return { ok: false, why: 'no iron greaves in the stash' };
      if (R.legsArmor) R.legsStash.push(R.legsArmor);
      R.legsArmor = R.legsStash[i]; R.legsStash.splice(i, 1);
    } else if (R.legsArmor) {
      (R.legsStash || (R.legsStash = [])).push(R.legsArmor); R.legsArmor = null;
    }
    if (window.__btSyncArmorLayers) window.__btSyncArmorLayers(R);
    S.channel.send({ type: 'stats_update', payload: { armorRef: R.armor ? R.armor.gid : null, legsArmorRef: R.legsArmor ? R.legsArmor.gid : null } });
    return { ok: true, legs: window.__btStandInLegs ? window.__btStandInLegs().legs : null };
  }, on);
}

/* aim the way `ang` points from the middle of the bro as drawn, mark what
   stands there now, press, and wait for the pose: its start (a swing's
   timer, a bow's press) */
async function startPose(P, kind, ang) {
  const page = P.page;
  const me = await page.evaluate(() => {
    const R = window._pixiRenderer, d = R.playerDisplayRaw();
    const r = document.querySelector('canvas').getBoundingClientRect();
    const b = d.getBounds();
    return { x: r.left + b.x + b.width / 2, y: r.top + b.y + b.height / 2 };
  });
  await page.mouse.move(me.x + Math.cos(ang) * 170, me.y + Math.sin(ang) * 170);
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__sl.markForeign());
  await page.mouse.down();
  let t0 = null;
  if (kind === 'sword') {
    t0 = await H.waitFor(P, (S) => (S._swordSwinging && S.swingTimer ? S.swingTimer : null), (v) => !!v, { timeout: 5000, label: 'a swing' }).catch(() => null);
  } else {
    /* the bow looses only at something (v2.3.3528), and the commons is empty:
       the shot the stand-in shows is written as monsterCombat writes it when
       an arrow leaves -- the time and the angle */
    await page.waitForTimeout(200);
    t0 = await page.evaluate((a) => { const S = window._gameState.current; const T = Date.now(); S._bowShotAt = T; S._bowShotAng = a; return T; }, ang);
  }
  /* the bow's button let go (a held one draws again); a swing ends the moment
     its button is let go, so the sword's stays down -- the held clock stops
     the next swing (holdAt) -- until letGo */
  if (kind !== 'sword') await page.mouse.up();
  return t0;
}
/* the clock held `dt` into the pose -- read off the pose's own start in the
   same breath (a swing that began since is the one drawn) -- the figure alone */
async function holdAt(page, kind, dt) {
  await page.evaluate(({ kind, dt }) => {
    const S = window._gameState.current;
    const t0 = kind === 'sword' ? S.swingTimer : S._bowShotAt;
    window.__sl.hold(t0 + dt);
    /* the moment held is one the swing was on: on a slow page the combat loop
       may have closed it (450 ms on the real clock) before the hold landed */
    if (kind === 'sword') S.isSwinging = true;
    window.__sl.isolate(true);
  }, { kind, dt });
  await page.waitForTimeout(450);
}
async function letGo(page) {
  await page.evaluate(() => { window.__sl.free(); window.__sl.isolate(false); });
  await page.mouse.up();
  await page.waitForTimeout(900);
}
/* where in a pose to look: two moments of the swing (300 ms), and the bow's
   draw and loose */
const MOMENTS = { sword: [90, 210], bow: [60, 160] };
/* `BT_SL_ONLY=sword:east,bow:south` runs those poses alone (a quicker look) */
const ONLY = process.env.BT_SL_ONLY ? process.env.BT_SL_ONLY.split(',') : null;

export async function run({ browser, wsPort, webPort, rec }) {
  const errors = [];
  const A = await H.newPlayer(browser, { name: 'Greaves', wsPort, webPort, viewport: VIEW, touch: false, dpr: 2, world: 'wheel', init: LOOK });
  let B = null;
  A.page.on('pageerror', (e) => errors.push('A ' + String(e && e.message || e)));
  try {
    await H.enterWorld(A);
    const inA = await H.waitFor(A, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 90000, label: 'into the world' }).catch(() => null);
    rec.ok('in the world (guard)', !!inA, inA);
    if (!inA) return;
    const aId = await H.readState(A, (S) => S.myId);
    await H.devOp(wsPort, 'kit', aId, { what: 'weapons' }).catch(() => {});
    await H.devOp(wsPort, 'kit', aId, { what: 'armor' }).catch(() => {});
    await A.page.waitForTimeout(3000);
    const G = await H.wheelGeom();
    const spot = { x: Math.round(G.cx + 1350), y: Math.round(G.cy - 1350) };
    await H.hopTo(A, spot.x, spot.y, { tries: 80 });
    await A.page.waitForTimeout(1500);
    const kit = await A.page.evaluate(KIT);
    rec.ok('the page can hold its clock and draw the stand-in alone (guard)', kit === true);

    /* ── 1. in iron greaves ── */
    const worn = await wearGreaves(A.page, true);
    await A.page.waitForTimeout(2500);
    const legsProbe = await A.page.evaluate(() => (window.__btStandInLegs ? window.__btStandInLegs() : null));
    rec.ok('iron greaves worn the real way, and the greaves\' shapes are in for all eight sheets (guard)',
      worn.ok && legsProbe && /greaves/.test(legsProbe.legs || '') && legsProbe.shapes.length >= 8, { worn, shapes: legsProbe && legsProbe.shapes });
    const POSES = [
      ['sword', 'greatsword', 'weapon', 'melee', ['south', 'east', 'north', 'west']],
      ['bow', 'bow', 'rangedWeapon', 'ranged', ['east', 'southwest', 'south', 'northwest', 'north']],
    ];
    for (const [kind, type, slot, active, facings] of POSES) {
      const eq = await H.equipWeapon(A, type, slot, active);
      await A.page.waitForTimeout(2000);
      for (const facing of facings) {
        if (ONLY && !ONLY.includes(kind + ':' + facing)) continue;
        const t0 = await startPose(A, kind, FACING_ANG[facing]);
        if (!t0) { rec.ok(`${kind} ${facing}: the pose began (guard)`, false, eq); await letGo(A.page); continue; }
        let seenOn = 0, seenOff = 0;
        for (const dt of MOMENTS[kind]) {
          await holdAt(A.page, kind, dt);
          const box = await A.page.evaluate(() => window.__sl.box());
          if (!box) {
            const why = await A.page.evaluate(() => { const S = window._gameState.current; const fx = window.__btStandInLegs; return { now: Date.now(), sw: S.isSwinging, t0: S.swingTimer, showing: S._swordSwinging, dir: S._swordSwingDir, bowAt: S._bowShotAt, auto: S.autoAttack, held: window.__sl.held, pieces: !!(fx && fx.pieces()), renders: window.__sl.renders }; });
            rec.ok(`${kind} ${facing} +${dt} ms: the stand-in is drawn (guard)`, false, why);
            continue;
          }
          const on = await measure(A.page, box, true, null, `${kind}-${facing}-${dt}-on`);
          await A.page.evaluate(() => window.__btStandInLegs.set(false));
          const off = await measure(A.page, box, true, null, `${kind}-${facing}-${dt}-off`);
          await A.page.evaluate(() => window.__btStandInLegs.set(true));
          await A.page.waitForTimeout(250);
          console.log(`    ${kind} ${facing} +${dt}: on ${JSON.stringify(on)} off ${JSON.stringify(off)}`);
          rec.ok(`greaves, ${kind} ${facing} +${dt} ms: at most ${LEAK_MAX} px of trousers or boots at or below the greaves' top (${on.leak}; ${off.leak} with the clamp off)`,
            on.greavesTop != null && on.leak <= LEAK_MAX, { on, off });
          seenOn += on.leak; seenOff += off.leak;
        }
        /* and the test sees the leak it guards against: the same moments with
           the clamp off show plenty (one moment of a pose may show none) */
        rec.ok(`greaves, ${kind} ${facing}: with the clamp off the same frames show the legs (${seenOff} px against ${seenOn})`,
          seenOff >= LEAK_SEEN && seenOff >= 3 * seenOn, { seenOn, seenOff });
        await letGo(A.page);
      }
    }
    const clamped = await A.page.evaluate(() => window.__btStandInLegs().clamped);
    rec.ok('every sword and bow sheet was clamped under the greaves', Object.keys(clamped).length >= 8, clamped);

    /* ── 2. no greaves: the trousers and boots stay ── */
    await wearGreaves(A.page, false);
    await A.page.waitForTimeout(2500);
    await H.equipWeapon(A, 'greatsword', 'weapon', 'melee');
    await A.page.waitForTimeout(2000);
    for (const facing of ['south', 'east']) {
      const t0 = await startPose(A, 'sword', FACING_ANG[facing]);
      if (!t0) { rec.ok(`bare, sword ${facing}: the pose began (guard)`, false); await letGo(A.page); continue; }
      await holdAt(A.page, 'sword', 150);
      const box = await A.page.evaluate(() => window.__sl.box());
      const bare = box ? await measure(A.page, box, false, null, `bare-sword-${facing}`) : null;
      console.log(`    bare sword ${facing}: ${JSON.stringify(bare)}`);
      rec.ok(`no greaves, sword ${facing}: the trousers and boots are there (${bare && bare.pinkAll} pink, ${bare && bare.blueAll} blue)`,
        !!bare && bare.pinkAll >= 150 && bare.blueAll >= 60, bare);
      await letGo(A.page);
    }

    /* ── 3. another player sees the swing in greaves clamped ── */
    await wearGreaves(A.page, true);
    await A.page.waitForTimeout(2500);
    B = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, viewport: VIEW, touch: false, dpr: 2, world: 'wheel' });
    B.page.on('pageerror', (e) => errors.push('B ' + String(e && e.message || e)));
    await H.enterWorld(B);
    const inB = await H.waitFor(B, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 90000, label: 'B into the world' }).catch(() => null);
    rec.ok('the watcher is in the world (guard)', !!inB, inB);
    if (!inB) return;
    await H.hopTo(B, spot.x - 160, spot.y + 20, { tries: 80 });
    /* readState sends the function's source, so the id is written into it */
    const peerLook = new Function('S', `const o = S.others && S.others[${JSON.stringify(aId)}]; return o ? { pants: o.pants, shoes: o.shoes, legs: o.equip && o.equip.legs } : null;`);
    let last = null;
    const seen = await H.waitFor(B, peerLook,
      (v) => { last = v; return !!v && v.pants === 'pink' && v.shoes === 'blue' && /greaves/.test(v.legs || ''); }, { timeout: 30000, label: 'the watcher sees the greaves' }).catch(() => null);
    rec.ok('the watcher sees the first player\'s colours and greaves (guard)', !!seen, seen || last);
    if (seen) {
      await B.page.evaluate(KIT);
      /* the camera eases after a hop: the shot's box is worked out from where
         the stand-in is drawn, so wait for it to be still */
      let cam = null;
      for (let i = 0; i < 40; i++) {
        const c = await B.page.evaluate(() => { const S = window._gameState.current; return { x: S.camera.x, y: S.camera.y }; });
        if (cam && Math.abs(c.x - cam.x) < 0.5 && Math.abs(c.y - cam.y) < 0.5) break;
        cam = c;
        await B.page.waitForTimeout(500);
      }
      /* east only: the peer path is one bake whatever the facing (the local
         poses above cover every sheet), and a held clock makes a quiet peer
         look gone to the ghost sweep once it is let go -- one facing keeps the
         watcher's world honest */
      for (const facing of ['east']) {
        /* a held clock makes the other player look long gone to the ghost
           sweep when it is let go: wait for them to be back, look and all */
        const back = await H.waitFor(B, peerLook,
          (v) => !!v && v.pants === 'pink' && v.shoes === 'blue' && /greaves/.test(v.legs || ''), { timeout: 30000, label: 'the peer back' }).catch(() => null);
        if (!back) { rec.ok(`the watcher, sword ${facing}: the peer is there to watch (guard)`, false); continue; }
        await B.page.evaluate(({ id, ang }) => {
          const S = window._gameState.current, o = S.others[id];
          o._lastUpdate = Date.now();   /* fresh to the ghost sweep for the minute the clock is held */
          window.__sl.markForeign();
          window.__sl.hideMe = true;
          const T = Date.now();
          window.__sl.hold(T);
          window.__sl.isolate(true);
          o._swingTs = T - 150; o._swingAng = ang; o._swingWpn = 'greatsword'; o._swingBash = false; o._swingSpecial = false;
        }, { id: aId, ang: FACING_ANG[facing] });
        await B.page.waitForTimeout(600);
        const box = await B.page.evaluate((id) => window.__sl.box(id), aId);
        if (!box) {
          rec.ok(`the watcher, the peer's sword ${facing}: their stand-in is drawn (guard)`, false);
        } else {
          const on = await measure(B.page, box, true, aId, `peer-sword-${facing}-on`);
          await B.page.evaluate(() => window.__btStandInLegs.set(false));
          await B.page.waitForTimeout(300);
          const off = await measure(B.page, box, true, aId, `peer-sword-${facing}-off`);
          await B.page.evaluate(() => window.__btStandInLegs.set(true));
          console.log(`    watcher sword ${facing}: on ${JSON.stringify(on)} off ${JSON.stringify(off)}`);
          rec.ok(`the watcher, the peer's sword ${facing} in greaves: at most ${LEAK_MAX} px of trousers or boots at or below the greaves' top (${on.leak}; ${off.leak} with the clamp off)`,
            on.greavesTop != null && on.leak <= LEAK_MAX && off.leak >= LEAK_SEEN, { on, off });
        }
        await B.page.evaluate((id) => { window.__sl.free(); const o = window._gameState.current.others[id]; if (o) { o._swingTs = 0; o._lastUpdate = Date.now(); } window.__sl.isolate(false); window.__sl.hideMe = false; }, aId);
        await B.page.waitForTimeout(600);
      }
    }
    for (const [who, P] of [['the player', A], ['the watcher', B]]) {
      if (!P) continue;
      const same = await P.page.evaluate(() => (window.__sl ? window.__sl.same() : null)).catch(() => null);
      rec.ok(`${who}'s renderer was never rebuilt under the test (guard)`, same !== false, same);
    }
    rec.ok(`no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  } finally {
    if (B) await B.ctx.close().catch(() => {});
    await A.ctx.close().catch(() => {});
  }
}
