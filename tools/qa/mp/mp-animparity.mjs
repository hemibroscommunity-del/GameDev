/* ═══ v2.3.2905: DOES A PEER'S ATTACK LOOK LIKE THE ONE ITS OWNER SEES? ═══
 *
 * Owner: "Other players get smaller and move when they do bow shooting", and
 * then: "check all other broadcasted player animations to make sure they match
 * what your character does client side so there's no discrepancies."
 *
 * Two real clients.  B attacks; A watches.  For every facing, and at several
 * frames of each animation, it compares what B's own client draws with what
 * A's client draws for B:
 *
 *   SIZE -- both screens draw the SAME stand-in sheet, so the sprite's own
 *     |scale.y| is directly comparable between the two clients.  They must
 *     agree.
 *
 *   BOOTS -- where the figure's feet land, read off the FRAME'S OWN ALPHA: the
 *     lowest opaque row of the texture actually on screen, pushed through the
 *     sprite's transform with toGlobal.  Not the BODY_ROWS table, and not the
 *     `footY` the entity pass publishes for the stand-ins -- the fix plants the
 *     stand-in ON that number, so checking it against the number would be
 *     checking the code against itself (TRAPS §35).  And not __btPeersDrawn's
 *     `footY` either: that is `display.y`, the body's CENTRE, which is where
 *     the old stand-in was planted too -- measured against it, the feet
 *     "do not move", because it is one number compared with itself.  Feet are
 *     measured against feet here.
 *
 *     The comparison is a DIFFERENCE OF DIFFERENCES: on each screen, how far
 *     the boots move between the standing body and the attack pose.  Your own
 *     boots may move a little between two different paintings -- that is the
 *     art, and it is the reference.  A peer's must move by the same amount.
 *
 * DRIVEN LIKE THE GAME DRIVES IT, and pinned to a frame.  B's own attack is
 * pinned every animation frame through the fields its attack code sets (the
 * mp-arules idiom); A's copy of B is pinned through exactly the fields the
 * network handlers set (gameEvents 'player_projectile' / 'player_swing',
 * including _reconcileFacing's `_renderFacing`).  One real network round trip
 * first proves those are the fields the real handler sets, so pinning them is
 * the game's own path held still, not a stand-in for it.
 *
 *   node tools/qa/mp/run.mjs animparity
 */
import * as H from './harness.mjs';

const FACING8 = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];

/* Frames to sample, as elapsed ms into the animation.  Several, because the
   draw/release frames are different paintings and "right on frame 0, wrong on
   frame 5" is a failure a single sample passes.  Chosen clear of every frame
   boundary: the pin lands a few ms before the game reads the clock, so a
   sample just under a boundary could show neighbouring frames on the two
   screens.  Bow: 3 frames, boundaries 55/110 (BOW_RELEASE_MS), shown to 360.
   Sword: 14 (south) / 11 (east) / 9 (north) frames over 300ms -- the sheet
   widths over their cell widths. */
const BOW_E = [30, 80, 190, 300];
const SWORD_E = [35, 115, 175, 250];

/* Size tolerance: 1.5% of the figure.  Boots: 2 screen px after allowing for
   the art's own difference on the owner's screen. */
const SIZE_TOL = 0.015;
const BOOT_TOL = 2;

/* ── page-side: ink measurement and the two pins ── */
const install = (P) => P.page.evaluate(() => {
  if (window.__apReady) return true;
  window.__apInkCache = new Map();
  /* Where a sprite's painted pixels start and end ON SCREEN, from the frame's
     own alpha.  Resolution- and trim-aware; a rotated atlas frame is refused
     rather than guessed at. */
  window.__apInk = (sp) => {
    if (!sp) return { err: 'no sprite' };
    if (!sp.texture) return { err: 'no texture' };
    /* Pixi v8 has no worldVisible: walk up.  Every ancestor must be shown,
       and the chain must reach a root (a detached sprite is not on screen). */
    for (let n = sp; n; n = n.parent) {
      if (!n.visible) return { err: 'hidden at ' + (n.label || n.constructor.name) };
      if (n.renderable === false) return { err: 'unrenderable at ' + (n.label || n.constructor.name) };
    }
    const tex = sp.texture, src = tex.source;
    const res = src && src.resource;
    if (!res) return { err: 'no-resource' };
    if (tex.rotate) return { err: 'rotated' };
    const f = tex.frame, R = src.resolution || 1;
    const fw = Math.max(1, Math.round(f.width * R)), fh = Math.max(1, Math.round(f.height * R));
    const key = (src.uid != null ? src.uid : '?') + ':' + f.x + ',' + f.y + ',' + f.width + ',' + f.height;
    let rows = window.__apInkCache.get(key);
    if (!rows) {
      const c = document.createElement('canvas'); c.width = fw; c.height = fh;
      const g = c.getContext('2d', { willReadFrequently: true });
      try { g.drawImage(res, f.x * R, f.y * R, fw, fh, 0, 0, fw, fh); } catch (e) { return { err: 'draw ' + e.message }; }
      const d = g.getImageData(0, 0, fw, fh).data;
      let top = -1, bot = -1;
      for (let y = 0; y < fh; y++) {
        for (let x = 0; x < fw; x++) if (d[(y * fw + x) * 4 + 3] > 24) { if (top < 0) top = y; bot = y; break; }
      }
      rows = { top, bot, fh };
      window.__apInkCache.set(key, rows);
    }
    if (rows.top < 0) return { err: 'empty' };
    const H = tex.orig ? tex.orig.height : f.height;
    const base = tex.trim ? tex.trim.y : 0, span = tex.trim ? tex.trim.height : H;
    const ay = sp.anchor ? sp.anchor.y : 0;
    const ly = (r) => base + (r / rows.fh) * span - ay * H;
    const gT = sp.toGlobal({ x: 0, y: ly(rows.top) });
    const gB = sp.toGlobal({ x: 0, y: ly(rows.bot + 1) });
    /* pz: screen px per unit of the sprite's PARENT -- for a stand-in (drawn
       straight into the world) that is the camera zoom, which must be the
       same on both screens for their screen-px boots to be comparable. */
    const p0 = sp.parent.toGlobal({ x: 0, y: 0 }), p1 = sp.parent.toGlobal({ x: 0, y: 100 });
    return { top: +gT.y.toFixed(2), bot: +gB.y.toFixed(2), h: +(gB.y - gT.y).toFixed(2),
      scaleY: +Math.abs(sp.scale.y).toFixed(5), pz: +((p1.y - p0.y) / 100).toFixed(5),
      /* which painting: the ink's first and last rows as fractions of the
         frame, so the two screens can be seen to be on the same frame */
      frame: (rows.top / rows.fh).toFixed(3) + '-' + ((rows.bot + 1) / rows.fh).toFixed(3) };
  };
  /* B: its OWN attack, pinned each frame (mp-arules). kind null = stand still. */
  window.__apSelf = { on: false, kind: null, a: 0, e: 0 };
  /* A: its copy of a PEER, pinned each frame through the network's fields. */
  window.__apPeer = { on: false, id: null, kind: null, a: 0, e: 0, i: 0 };
  const pin = () => {
    const S = window._gameState && window._gameState.current;
    const me = window.__apSelf, pe = window.__apPeer;
    if (S && me.on) {
      S._facingAngle = me.a; S._targetFacingAngle = me.a; S._aimAngle = me.a; S._mouseAimAngle = me.a;
      S._shieldKb = false; S.lockedTarget = null;
      if (S.player) { S.player.vx = 0; S.player.vy = 0; }
      const t = Date.now() - me.e;
      if (me.kind === 'sword') { S.isSwinging = true; S.swingTimer = t; S._swingAng = me.a; S._bowShotAt = 0; }
      else if (me.kind === 'bow') { S._bowShotAt = t; S._bowShotAng = me.a; S.isSwinging = false; }
      else { S.isSwinging = false; S._bowShotAt = 0; }
    }
    if (S && pe.on && S.others && S.others[pe.id]) {
      const o = S.others[pe.id];
      o._renderFacing = FACING8_P[((pe.i % 8) + 8) % 8];   /* _reconcileFacing */
      const t = Date.now() - pe.e;
      if (pe.kind === 'sword') { o._swingTs = t; o._swingWpn = 'sword'; o._swingAng = pe.a; o._bowShotAt = 0; }
      else if (pe.kind === 'bow') { o._bowShotAt = t; o._bowShotAng = pe.a; o._swingTs = 0; }
      else { o._bowShotAt = 0; o._swingTs = 0; }
    }
  };
  const FACING8_P = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];
  /* The pin runs at the START of every frame, before the game loop: the loop
     re-queues itself through the global requestAnimationFrame each frame, so
     wrapping it puts the pin ahead of it.  A plain rAF loop of our own would
     run AFTER the game's and every sample would be drawn one frame late -- on
     a slow headless frame, late enough to fall off the end of the attack. */
  const _raf = window.requestAnimationFrame.bind(window);
  let _lastTs = -1;
  window.requestAnimationFrame = (cb) => _raf((ts) => {
    if (ts !== _lastTs) { _lastTs = ts; try { pin(); } catch (e) { /* keep the game's frame */ } }
    cb(ts);
  });
  window.__apReady = true;
  return true;
});

const pinSelf = (P, v) => P.page.evaluate((v) => Object.assign(window.__apSelf, v), v);
const pinPeer = (P, v) => P.page.evaluate((v) => Object.assign(window.__apPeer, v), v);
const settle = (P, ms = 260) => P.page.waitForTimeout(ms);

/* Ink of the walking body (no kind) or an attack stand-in, for self (no id) or
   a peer.  Retries: a peer's baked frames and a stand-in's first texture can
   take a few frames to exist. */
const ink = async (P, kind, id) => {
  let last = null;
  for (let i = 0; i < 12; i++) {
    const r = await P.page.evaluate(({ kind, id }) => {
      const R = window._pixiRenderer;
      const d = !kind && R && (id ? R.peerDisplayRaw(id) : R.playerDisplayRaw());
      const sp = kind ? (R && (id ? R.remoteAttackSpriteRaw(id, kind) : R.localAttackSpriteRaw(kind)))
        : (d && d._spriteBody);
      const m = window.__apInk(sp);
      const S = window._gameState.current;
      const pub = id && S._peerStandGeom ? S._peerStandGeom.get(id) : null;
      return m && !m.err ? { ...m, pubDir: pub ? pub.dir : null } : { err: (m && m.err) || 'not drawn' };
    }, { kind: kind || null, id: id || null });
    if (r && !r.err) return r;
    last = r;
    await P.page.waitForTimeout(90);
  }
  return last || { err: 'no result' };
};

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Watcher', nameB: 'Actor' });
  await H.waitMutualSight(A, B);
  await A.page.waitForTimeout(1200);
  const bId = await H.readState(B, (S) => S.myId);
  rec.ok('probes present: the renderer\'s read-only body and stand-in getters (guard)',
    await A.page.evaluate(() => { const R = window._pixiRenderer;
      return !!R && ['playerDisplayRaw', 'peerDisplayRaw', 'remoteAttackSpriteRaw', 'localAttackSpriteRaw'].every((k) => typeof R[k] === 'function'); }), {});
  await install(A); await install(B);

  /* ── 0. the pinned fields ARE the real handler's fields ── */
  const real = await (async () => {
    /* Turn B west first, as a player would before swinging west: B's own
       position broadcasts carry its facing too, and an unturned B would
       overwrite A's _renderFacing with 'south' a moment after the swing. */
    await pinSelf(B, { on: true, kind: null, a: Math.PI, e: 0 });
    await settle(B, 600);
    await B.page.evaluate(() => {
      const S = window._gameState.current;
      S.channel.send({ type: 'broadcast', event: 'player_swing', payload: { id: S.myId, ts: Date.now(), wpn: 'sword', ang: Math.PI } });
    });
    await A.page.waitForTimeout(700);
    return A.page.evaluate((id) => {
      const o = window._gameState.current.others[id] || {};
      return { wpn: o._swingWpn || null, ang: o._swingAng, face: o._renderFacing || null, ts: !!o._swingTs };
    }, bId);
  })();
  rec.ok('a REAL swing sets exactly the fields this file pins: _swingTs, _swingWpn, _swingAng, _renderFacing (guard)',
    real.ts && real.wpn === 'sword' && typeof real.ang === 'number' && real.face === 'west', real);

  const cases = [];
  for (let i = 0; i < 8; i += 2) cases.push({ kind: 'sword', i, E: SWORD_E });   /* the sword is 4-way */
  for (let i = 0; i < 8; i++) cases.push({ kind: 'bow', i, E: BOW_E });

  const table = [];
  for (const c of cases) {
    const a = c.i * Math.PI / 4, face = FACING8[c.i];
    /* standing, facing this way, on both screens */
    await pinSelf(B, { on: true, kind: null, a, e: 0 });
    await pinPeer(A, { on: true, id: bId, kind: null, a, e: 0, i: c.i });
    await settle(B, 420);
    const selfBody = await ink(B, null, null);
    const peerBody = await ink(A, null, bId);
    if (selfBody.err || peerBody.err) {
      rec.ok(`${c.kind} ${face}: both walking bodies measured (guard)`, false, { selfBody, peerBody });
      continue;
    }
    for (const e of c.E) {
      await pinSelf(B, { on: true, kind: c.kind, a, e });
      await pinPeer(A, { on: true, id: bId, kind: c.kind, a, e, i: c.i });
      await settle(B, 240);
      const selfSI = await ink(B, c.kind, null);
      const peerSI = await ink(A, c.kind, bId);
      /* Every sample is inside the attack's window (BOW_SHOT_MS 360,
         SWORD_SWING_MS 300), so both screens must be drawing the stand-in. */
      if (selfSI.err || peerSI.err) {
        rec.ok(`${c.kind} ${face} @${e}ms: both screens draw the attack figure (guard)`, false, { selfSI, peerSI });
        continue;
      }
      if (Math.abs(peerSI.pz - selfSI.pz) > 1e-3 * selfSI.pz) {
        rec.ok(`${c.kind} ${face} @${e}ms: both screens at the same camera zoom (guard)`, false, { peer: peerSI.pz, own: selfSI.pz });
        continue;
      }
      const sizeErr = (peerSI.scaleY - selfSI.scaleY) / selfSI.scaleY;
      const dSelf = selfSI.bot - selfBody.bot;
      const dPeer = peerSI.bot - peerBody.bot;
      table.push({ kind: c.kind, face, e, sizePct: +(sizeErr * 100).toFixed(2),
        bootsSelf: +dSelf.toFixed(1), bootsPeer: +dPeer.toFixed(1), pubDir: peerSI.pubDir,
        frames: selfSI.frame === peerSI.frame ? 'same' : `${selfSI.frame} vs ${peerSI.frame}` });
      rec.ok(`${c.kind} ${face} @${e}ms: the peer is drawn the SIZE its owner sees (${(sizeErr * 100).toFixed(1)}%)`,
        Math.abs(sizeErr) <= SIZE_TOL, { peer: peerSI.scaleY, own: selfSI.scaleY });
      rec.ok(`${c.kind} ${face} @${e}ms: ...and its BOOTS move as its owner's do (peer ${dPeer.toFixed(1)}px, own ${dSelf.toFixed(1)}px)`,
        Math.abs(dPeer - dSelf) <= BOOT_TOL, { dPeer, dSelf, peerBody, peerSI, selfBody, selfSI });
    }
  }
  await pinSelf(B, { on: false }); await pinPeer(A, { on: false });

  /* One line per sample, so a run log is the table. */
  for (const r of table) {
    console.log(`    ${r.kind.padEnd(5)} ${r.face.padEnd(9)} @${String(r.e).padStart(3)}ms  size ${String(r.sizePct).padStart(6)}%   boots peer ${String(r.bootsPeer).padStart(6)}px  own ${String(r.bootsSelf).padStart(6)}px   pub:${r.pubDir}  painting:${r.frames}`);
  }
  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
