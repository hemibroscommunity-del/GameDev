/* ═══ v2.3.2862: ANOTHER PLAYER'S SWING AND BOW SHOT WEAR THEIR DRAWINGS ═══
 *
 * Owner: "Yea do woodcutting and missing ones."  v2.3.2429 put YOUR drawings on
 * your sword swing, bow shot and raised shield (mp-standinart).  A peer's swing
 * and bow shot are baked by two other functions (_remoteBodyFramesFor /
 * _remoteSheetFramesFor) that never got the drawings -- so on your screen a
 * tattooed player's tattoos vanished whenever they attacked.
 *
 * The attacker draws a BLUE block on the chest, off-centre (asymmetric, so the
 * side it lands on says whether a flipped facing reads backwards), and a GREEN
 * one on the back of the body.  Nothing on the sword or bow art leads in blue
 * or green (mp-standinart's premise).  The watcher drives the peer's swing and
 * bow shot on his own screen -- the same fields the network sets -- and reads
 * the stand-in's body sprite as the renderer holds it:
 *
 *   - blue on the swing and the bow shot facing south and east;
 *   - facing WEST (east drawn flipped): the pre-flipped bake, so the block is
 *     on the other side of the frame in the texture and reads right on screen;
 *   - facing north: the back drawing (green), not the chest;
 *   - THE SHARED KEY: the sword and the bow both have a south sheet, and the
 *     peer cache was keyed by facing alone -- a bow shot after a sword swing
 *     was drawn with the sword's frames.  The bow's frame must be the bow's
 *     size (130x234), not the sword's (320x320).
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const SHOTS = H.REPO + '/tools/qa/mp/out';
/* A picture of the frame the watcher's renderer draws for the peer mid-attack
   -- read off the stand-in sprite itself (its crop rebuilt into the whole frame,
   flipped when the sprite is), not photographed off the screen, where the
   timing of a 300 ms swing on this box and the other figures around decide
   what ends up in the box. */
const shotAttack = async (P, pid, kind, ang, name) => {
  const url = await P.page.evaluate(async ({ pid, kind, ang }) => {
    const WIN = kind === 'sword' ? 300 : 360;
    let lastT = 0, gap = 100, got = null;
    const t0 = performance.now();
    await new Promise((done) => {
      const tick = () => {
        const o = (((window._gameState || {}).current || {}).others || {})[pid];
        const now = Date.now();
        if (lastT) gap = gap * 0.7 + (now - lastT) * 0.3;
        const first = !lastT;
        lastT = now;
        const start = now + gap - WIN / 2;
        if (o) {
          if (kind === 'sword') { o._swingTs = start; o._swingAng = ang; o._swingWpn = 'sword'; }
          else { o._bowShotAt = start; o._bowShotAng = ang; }
        }
        const sp = window._pixiRenderer.remoteAttackSpriteRaw(pid, kind);
        const t = sp && sp.visible && sp.texture;
        if (!first && t && t.source && t.source.resource && performance.now() - t0 > 600) {
          const f = t.frame, tr = t.trim || { x: 0, y: 0 };
          const W = Math.round((t.orig || f).width), Hh = Math.round((t.orig || f).height);
          const c = document.createElement('canvas'); c.width = W; c.height = Hh;
          const g = c.getContext('2d');
          g.imageSmoothingEnabled = false;
          if (sp.scale.x < 0) { g.translate(W, 0); g.scale(-1, 1); }
          g.drawImage(t.source.resource, f.x, f.y, f.width, f.height, tr.x, tr.y, f.width, f.height);
          got = c.toDataURL('image/png');
        }
        if (got || performance.now() - t0 > 6000) done(); else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return got;
  }, { pid, kind, ang }).catch(() => null);
  if (url) writeFileSync(`${SHOTS}/peerattackink-${name}.png`, Buffer.from(url.split(',')[1], 'base64'));
  await P.page.waitForTimeout(400);
};

const block = (ch, x0, x1) => {
  let s = '';
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) s += (y >= 4 && y <= 11 && x >= x0 && x <= x1) ? ch : '0';
  return s;
};
const CHEST = block('8', 2, 7);      /* blue, the drawing's LEFT third */
const BACK = block('6', 2, 13);      /* green */

const COACH_OFF = `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle',
    'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
} catch (e) {}`;
/* Into storage BEFORE the character exists (v2.3.2746). */
const SEED = COACH_OFF + `
try {
  localStorage.setItem('bt-tattooart', ${JSON.stringify(CHEST)});
  localStorage.setItem('bt-tattooart-back', ${JSON.stringify(BACK)});
  /* shirtless, so the pictures show the chest (the bake is measured under the
     shirt either way) */
  localStorage.setItem('bt-shirt', 'none');
  localStorage.setItem('bt-gear-v3-shirt', 'none');
} catch (e) {}`;

const ANG = { east: 0, south: Math.PI / 2, west: Math.PI, north: -Math.PI / 2 };

/* Hold two peers' swings (kind 'sword') or bow shots ('bow') at `ang` on the
   watcher's screen for `ms` -- the inked player and the plain control, started
   at the SAME instant, so every frame drawn shows both on the same frame of the
   same sheet -- and measure each pair once. */
const sampleAttack = (P, pids, kind, ang, ms, kFix) => P.page.evaluate(async ({ pids, kind, ang, dur, kFix }) => {
  const R = window._pixiRenderer;
  const isBlue = (d, o) => d[o + 3] > 60 && d[o + 2] - d[o] >= 30 && d[o + 2] - d[o + 1] >= 20;
  const isGreen = (d, o) => d[o + 3] > 60 && d[o + 1] - d[o] >= 30 && d[o + 1] - d[o + 2] >= 20;
  const measure = (sp) => {
    const t = sp && sp.visible && sp.texture;
    if (!t || !t.source || !t.source.resource) return null;
    const f = t.frame, tr = t.trim || { x: 0, y: 0 };
    const W = Math.round((t.orig || f).width), Hh = Math.round((t.orig || f).height);
    const c = document.createElement('canvas'); c.width = W; c.height = Hh;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = false;
    g.drawImage(t.source.resource, f.x, f.y, f.width, f.height, tr.x, tr.y, f.width, f.height);
    const d = g.getImageData(0, 0, W, Hh).data;
    let blue = 0, green = 0, bx = 0;
    for (let q = 0, p = 0; q < d.length; q += 4, p++) {
      if (isBlue(d, q)) { blue++; bx += p % W; }
      if (isGreen(d, q)) green++;
    }
    return { w: W, h: Hh, flip: sp.scale.x < 0, fi: sp._qaFi, uid: t.uid, blue, green, cx: blue ? +(bx / blue).toFixed(1) : null };
  };
  /* A swing lasts 300 ms and a shot 360 (SWORD_SWING_MS / BOW_SHOT_MS), and
     this box can take about that long between two frames -- a swing started
     "now" is often over by the frame that would draw it.  So each tick aims the
     start so that the NEXT frame lands inside the window, at a point swept
     across it (k), using the measured gap between frames. */
  const WIN = kind === 'sword' ? 300 : 360;
  let lastT = 0, gap = 100, n = 0;
  const out = [];
  const seen = new Set();
  const t0 = performance.now();
  await new Promise((done) => {
    const tick = () => {
      const S = window._gameState && window._gameState.current;
      const now = Date.now();
      if (lastT) gap = gap * 0.7 + (now - lastT) * 0.3;
      lastT = now;
      const k = kFix != null ? kFix : 20 + ((n++ * 67) % (WIN - 60));   /* kFix: hold one point of the swing */
      const start = now + gap - k;
      for (const pid of pids) {
        const o = S && S.others && S.others[pid];
        if (!o) continue;
        if (kind === 'sword') { o._swingTs = start; o._swingAng = ang; o._swingWpn = 'sword'; }
        else { o._bowShotAt = start; o._bowShotAng = ang; }
      }
      const sps = pids.map((pid) => (R.remoteAttackSpriteRaw ? R.remoteAttackSpriteRaw(pid, kind) : null));
      const key = sps.map((sp) => (sp && sp.visible && sp.texture ? sp.texture.uid + (sp.scale.x < 0 ? 'f' : 'n') : '-')).join('|');
      if (!seen.has(key)) {
        seen.add(key);
        const m = sps.map(measure);
        /* `fresh`: drawn after this window's facing was set.  What the sprite
           holds on the FIRST tick is the previous window's last frame. */
        if (m[0]) out.push({ t: Math.round(performance.now() - t0), fresh: n > 1, a: m[0], c: m[1] || null });
      }
      if (performance.now() - t0 < dur) requestAnimationFrame(tick); else done();
    };
    requestAnimationFrame(tick);
  });
  return out;
}, { pids, kind, ang, dur: ms, kFix: kFix == null ? null : kFix });

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
  /* THE CONTROL: the same code, no drawings.  The sword and bow art have some
     blue of their own (measured: up to ~190 px a frame on sword-east), so the
     honest assertion is the DIFFERENCE from a plain player on the same frame
     of the same sheet -- mp-standinart's A/B, for the same reason. */
  const C = await H.newPlayer(browser, { name: 'Plain', wsPort, webPort, guest: true, dpr: 2, init: COACH_OFF });
  opened.push(C);
  await H.enterWorld(B);
  await H.enterWorld(A);
  await H.enterWorld(C);
  await A.page.waitForTimeout(3000);
  await settle(A, wsPort);
  const aId = await H.readState(A, (S) => S.myId);
  const cId = await H.readState(C, (S) => S.myId);
  await H.waitMutualSight(A, B).catch(() => {});
  await H.waitMutualSight(C, B).catch(() => {});
  const aAt = await H.readState(A, (S) => ({ x: S.player.x, y: S.player.y }));
  await H.hopTo(B, aAt.x - 150, aAt.y + 20);
  await H.hopTo(C, aAt.x - 60, aAt.y + 60);
  await B.page.waitForTimeout(2000);

  const relayed = await B.page.evaluate(([id, chest, back]) => {
    const o = ((window._gameState.current || {}).others || {})[id];
    return o ? { chest: o.tattooArt === chest, back: o.bodyBackTattooArt === back } : null;
  }, [aId, CHEST, BACK]);
  rec.ok('the watcher has his chest and back drawings off the wire (guard)', !!relayed && relayed.chest && relayed.back, relayed);
  const seesC = await B.page.evaluate((id) => !!(((window._gameState.current || {}).others || {})[id]), cId);
  rec.ok('the watcher can see the plain control player too (guard)', seesC, cId);

  /* Each sheet's own frame size (effectsRenderer _swordCfg / _bowCfg). */
  const SIZE = {
    'sword-south': '320x320', 'sword-east': '402x246', 'sword-west': '402x246', 'sword-north': '340x227',
    'bow-south': '130x234', 'bow-east': '214x241', 'bow-west': '214x241', 'bow-north': '122x260',
  };
  const res = {};
  const fmt = (m) => (m ? `${m.fi}/${m.w}x${m.h}/${m.flip ? 1 : 0}/${m.blue}/${m.green}` : '-');
  for (const kind of ['sword', 'bow']) {
    for (const dir of ['south', 'east', 'west', 'north']) {
      const k = kind + '-' + dir;
      res[k] = await sampleAttack(B, [aId, cId], kind, ANG[dir], 4500);
      await B.page.waitForTimeout(300);
      console.log(`    ${k}: inked | plain  (fi/size/flip/blue/green): ${res[k].map((x) => fmt(x.a) + ' | ' + fmt(x.c)).join('   ')}`);
    }
  }
  const sz = (m) => m.w + 'x' + m.h;
  for (const kind of ['sword', 'bow']) {
    for (const dir of ['south', 'east', 'west', 'north']) {
      const k = kind + '-' + dir;
      const what = kind === 'sword' ? 'swing' : 'bow shot';
      const drawn = res[k].filter((x) => x.fresh);
      rec.ok(`${k}: his ${what} is drawn from the ${kind} sheet (${SIZE[k]}), never another sheet's frames`,
        drawn.length >= 1 && drawn.every((x) => sz(x.a) === SIZE[k]), res[k].map((x) => sz(x.a)));
      /* Pairs on the SAME frame of the SAME sheet, his and the control's. */
      const pairs = drawn.filter((x) => x.c && sz(x.a) === SIZE[k] && sz(x.c) === SIZE[k] && x.a.fi === x.c.fi);
      const key = dir === 'north' ? 'green' : 'blue';
      /* the first pairs may still be the plain bake while his lands */
      const i0 = pairs.findIndex((x) => x.a[key] >= x.c[key] + 60);
      const after = i0 >= 0 ? pairs.slice(i0) : [];
      const show = pairs.map((x) => [x.a.fi, x.a.blue, x.c.blue, x.a.green, x.c.green]);
      if (dir === 'north') {
        rec.ok(`${k}: facing away, his BACK drawing is on it (green over the plain player's on the same frame), and not the chest`,
          after.length >= 1 && after.every((x) => x.a.green >= x.c.green + 60 && x.a.blue <= x.c.blue + 10), show);
      } else if (dir === 'west') {
        /* flipped, the block lands on the side of the chest the arm crosses on
           some frames -- present, not necessarily on every frame */
        rec.ok(`${k}: his chest drawing is on it (blue over the plain player's on the same frame)`, after.length >= 1, show);
      } else {
        rec.ok(`${k}: his chest drawing is on every frame once his bake lands (blue over the plain player's on the same frame)`,
          after.length >= 1 && after.every((x) => x.a.blue >= x.c.blue + 60), show);
      }
    }
    /* THE FLIP.  West is the east sheet drawn flipped, so it must draw the
       PRE-FLIPPED bake -- the drawing read mirrored inside the same box, so it
       comes out the right way round once the sprite flips.  Read both bakes of
       every frame directly (the renderer's own call, via remoteAttackBake) and
       compare: on each frame the pre-flipped one's blue sits further RIGHT in
       the texture, by about a third of the box for a block in the left third.
       Then check that facing west on screen actually drew the pre-flipped one. */
    const mir = await B.page.evaluate(({ id, kind }) => {
      const R = window._pixiRenderer;
      const o = (((window._gameState || {}).current || {}).others || {})[id];
      const plain = R.remoteAttackBake(o, kind, 'east', false);
      const twin = R.remoteAttackBake(o, kind, 'east', true);
      if (!plain || !twin) return null;
      const isBlue = (d, q) => d[q + 3] > 60 && d[q + 2] - d[q] >= 30 && d[q + 2] - d[q + 1] >= 20;
      const cxOf = (t) => {
        const f = t.frame, tr = t.trim || { x: 0, y: 0 };
        const W = Math.round((t.orig || f).width), Hh = Math.round((t.orig || f).height);
        const c = document.createElement('canvas'); c.width = W; c.height = Hh;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(t.source.resource, f.x, f.y, f.width, f.height, tr.x, tr.y, f.width, f.height);
        const d = g.getImageData(0, 0, W, Hh).data;
        let n = 0, sx = 0;
        for (let q = 0, p = 0; q < d.length; q += 4, p++) if (isBlue(d, q)) { n++; sx += p % W; }
        return { blue: n, cx: n ? +(sx / n).toFixed(1) : null };
      };
      return {
        frames: plain.map((t, i) => ({ fi: i, plain: cxOf(t), twin: twin[i] ? cxOf(twin[i]) : null })),
        twinUids: twin.map((t) => t.uid), plainUids: plain.map((t) => t.uid),
      };
    }, { id: aId, kind });
    const cmpd = mir ? mir.frames.filter((f) => f.twin && f.plain.blue >= 150 && f.twin.blue >= 150) : [];
    console.log(`    ${kind} east frames, plain cx -> pre-flipped cx: ${cmpd.map((f) => `${f.fi}: ${f.plain.cx} -> ${f.twin.cx}`).join('  ')}`);
    rec.ok(`${kind}: every frame of his east sheet has a pre-flipped twin with the drawing mirrored (further right in the texture)`,
      !!mir && cmpd.length >= 2 && cmpd.every((f) => f.twin.cx > f.plain.cx + 3), mir && mir.frames);
    const westDrawn = res[kind + '-west'].filter((x) => x.fresh).map((x) => x.a).filter((m) => sz(m) === SIZE[kind + '-west']);
    rec.ok(`${kind} facing WEST: drawn flipped, and from the pre-flipped bake -- so the drawing reads the way it was drawn`,
      !!mir && westDrawn.length >= 1 && westDrawn.every((m) => m.flip && mir.twinUids.includes(m.uid)),
      westDrawn.map((m) => ({ fi: m.fi, flip: m.flip, twin: !!mir && mir.twinUids.includes(m.uid), plain: !!mir && mir.plainUids.includes(m.uid) })));
  }

  /* pictures for the spec: the peer mid-swing, mid-shot and swinging away */
  await shotAttack(B, aId, 'sword', ANG.south, 'sword-south');
  await shotAttack(B, aId, 'bow', ANG.south, 'bow-south');
  await shotAttack(B, aId, 'sword', ANG.north, 'sword-north');

  for (const P of [A, B, C]) {
    const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
    rec.ok(`no page errors on ${P.name}'s client`, errs.length === 0, errs.slice(0, 3));
  }
}
