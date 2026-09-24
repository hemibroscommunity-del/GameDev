/* ═══ v2.3.2835: YOUR TATTOOS STAY ON WHILE YOU CHOP ═══
 *
 * Owner: "yes make tattoos stay on while harvesting resources", then "Yea do
 * woodcutting".  Woodcutting swaps the body for a pre-drawn lumberjack
 * (chop-strip.webp), which was baked with your skin and nothing else -- so a
 * tattoo vanished on your own screen, and on everyone else's the figure was
 * the shared raw art.  Now both carry the drawings (standInInk.js fits the
 * face/chest/arm regions to the twelve swing frames).  This checks, from the
 * frame each renderer actually draws:
 *
 *   - YOUR SCREEN: ink on every swing frame, the pink too (the axe's recolour
 *     finds its key by a hue window the pink sits in -- v2.3.2834's rod);
 *   - THE AXE: every key pixel of the art is still wood/copper on every frame;
 *   - THE HEAD: no skin pixel is left in the artist's paint.  On frames 6..11
 *     the head was an island under the recolour's blob floor and kept the
 *     painted orange whatever skin you picked;
 *   - THE FLIP: the figure is drawn mirrored when the tree is on your left,
 *     and a drawing that is not its own mirror image must still read the way
 *     it was drawn.  The face is drawn on its LEFT half only, so the side the
 *     ink sits on in the texture says which bake is being drawn;
 *   - A WATCHER'S SCREEN: the peer's lumberjack carries their drawings once
 *     its bake lands (their look is not known at load -- the preload law's
 *     named exception), stays inked after that, and is released again when
 *     they stop.
 *
 * WHY THE FRAME: a screenshot would also photograph the tree and the ground.
 * The drawn frame is compared pixel for pixel with the same frame of the
 * shipped strip, so blue that is in the drawn frame and not in the art is ink.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { CHOP_INK_REGIONS } from '../../../src/rendering/standInInk.js';

const SHOTS = H.REPO + '/tools/qa/mp/out';
const ALL_PINK = 'b'.repeat(256);
/* The face drawing's LEFT eight columns, blue: asymmetric on purpose. */
const LEFT_BLUE = Array.from({ length: 256 }, (_, i) => ((i % 16) < 8 ? '8' : '0')).join('');

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
  localStorage.setItem('bt-armtattoo', ${JSON.stringify(ALL_PINK)});
  localStorage.setItem('bt-tattooart', ${JSON.stringify(ALL_PINK)});
} catch (e) {}`;

/* Read a lumberjack's frame as the renderer holds it, and the same frame of the
   shipped strip, on every animation frame for `ms`.  `pid` null = your own
   figure.  Each distinct texture is measured once. */
const sampleChop = (P, pid, ms) => P.page.evaluate(async ({ pid, dur, faceBoxes }) => {
  const R = window._pixiRenderer;
  if (!window.__qaChopSheet) {
    window.__qaChopSheet = await new Promise((res) => {
      const im = new Image();
      im.onload = () => res(im); im.onerror = () => res(null);
      im.src = '/sprites/skills/chop-strip.webp?v=2.3.1469';   /* the URL the game loads */
    });
  }
  const sheet = window.__qaChopSheet;
  const isBlue = (d, o) => d[o + 3] > 60 && d[o + 2] > d[o] + 40 && d[o + 2] > d[o + 1] + 20;
  const isPink = (d, o) => d[o + 3] > 60 && d[o + 2] > d[o + 1] + 24 && d[o] > 110 && d[o] >= d[o + 2];
  const isKey = (d, o) => {   /* toolRecolor's key window */
    const r = d[o], g = d[o + 1], b = d[o + 2];
    if (d[o + 3] < 77) return false;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx < 46 || mx - mn < mx * 0.4) return false;
    let h;
    if (mx === r) h = 60 * (((g - b) / (mx - mn)) % 6);
    else if (mx === g) h = 60 * ((b - r) / (mx - mn) + 2);
    else h = 60 * ((r - g) / (mx - mn) + 4);
    if (h < 0) h += 360;
    return h >= 315 && h <= 350;
  };
  const isWood = (d, o) => d[o + 3] > 60 && d[o] >= d[o + 1] && d[o + 1] >= d[o + 2];
  const isSkin = (d, o) => { const r = d[o], g = d[o + 1], b = d[o + 2];
    return d[o + 3] > 40 && r > g && g >= b && (r - b) > 30 && r > 90 && (r - g) > 25; };
  const FW = 240, FH = 220;
  const measure = (sp) => {
    const tex = sp && sp.texture;
    if (!sp || !sp.visible) return { err: 'not drawn' };
    if (!tex || !tex.source || !tex.source.resource) return { err: 'no texture' };
    /* The frames are cropped to their art (v2.3.2775, _sliceStandIn): `frame`
       is the crop inside the packed sheet, `orig` the whole 240x220 frame and
       `trim` where the crop sits in it.  So the swing frame's index comes from
       the sprite (_chopK), and the whole frame is rebuilt from the crop. */
    const f = tex.frame, orig = tex.orig || f, trim = tex.trim || null;
    if (Math.round(orig.width) !== FW || Math.round(orig.height) !== FH) return { err: `frame ${orig.width}x${orig.height}` };
    if (!sheet) return { err: 'the shipped strip did not load' };
    const k = sp._chopK;
    if (typeof k !== 'number' || k < 0 || k > 11) return { err: 'no swing frame index' };
    const draw = (res, sx, sy, sw, sh, dx, dy) => {
      const c = document.createElement('canvas'); c.width = FW; c.height = FH;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.imageSmoothingEnabled = false;
      g.drawImage(res, sx, sy, sw, sh, dx, dy, sw, sh);
      return g.getImageData(0, 0, FW, FH).data;
    };
    let got;
    try {
      got = draw(tex.source.resource, f.x, f.y, f.width, f.height, trim ? trim.x : 0, trim ? trim.y : 0);
    } catch (e) { return { err: 'unreadable: ' + e.message }; }
    const raw = draw(sheet, (12 + k) * FW, 0, FW, FH, 0, 0);
    const fb = faceBoxes[k];
    const fcx = (fb[0] + fb[1]) / 2, fhw = (fb[1] - fb[0]) / 2;
    let ink = 0, pink = 0, axeRaw = 0, axeKept = 0, sameSkin = 0, faceInk = 0, sx = 0;
    for (let o = 0, p = 0; o < got.length; o += 4, p++) {
      const x = p % FW, y = (p / FW) | 0;
      if (isBlue(got, o) && !isBlue(raw, o)) {
        ink++;
        if (x >= fb[0] && x <= fb[1] && y >= fb[2] && y <= fb[3]) { faceInk++; sx += x; }
      }
      if (isPink(got, o) && !isPink(raw, o) && !isKey(raw, o)) pink++;
      if (isKey(raw, o)) { axeRaw++; if (isWood(got, o)) axeKept++; }
      if (isSkin(raw, o) && got[o] === raw[o] && got[o + 1] === raw[o + 1] && got[o + 2] === raw[o + 2]) sameSkin++;
    }
    /* where the face ink sits across the head box: -1 its left edge, +1 its right */
    const side = faceInk ? +(((sx / faceInk) - fcx) / fhw).toFixed(2) : null;
    return { k, flip: sp.scale.x < 0, ink, pink, axeRaw, axeKept, sameSkin, side };
  };
  const out = [];
  const seen = new Set();
  const t0 = performance.now();
  await new Promise((done) => {
    const tick = () => {
      const sp = R && R.chopSpriteRaw ? R.chopSpriteRaw(pid) : null;
      const tex = sp && sp.visible && sp.texture;
      const key = tex ? tex.uid + ':' + (sp.scale.x < 0 ? 'f' : 'n') : 'none';
      if (!seen.has(key)) {
        seen.add(key);
        const m = measure(sp);
        m.t = Math.round(performance.now() - t0);
        if (pid && R.remoteSkillProbe) { const pr = R.remoteSkillProbe(pid); m.chopInk = pr ? pr.chopInk : null; }
        out.push(m);
      }
      if (performance.now() - t0 < dur) requestAnimationFrame(tick); else done();
    };
    requestAnimationFrame(tick);
  });
  return out;
}, { pid: pid || null, dur: ms, faceBoxes: CHOP_INK_REGIONS.face });

/* Park a live tree beside the player and hold the woodcutting extraction open
   (mp-cookpeer's fixture: the tick drops an extraction whose node is not live,
   and 'waiting' with a far window keeps the swing playing).  `side` +1 puts the
   tree on the player's right -- the art's own facing -- and -1 on his left,
   where the figure is drawn flipped.  `also` gets the same tree, so a watcher
   finds it too (the peer figure faces the nearest tree the WATCHER knows). */
async function startChop(P, side, also) {
  const at = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
  const node = { id: 'qa_node_chopink', nodeType: 'tree', x: at.x + side * 40, y: at.y,
    alive: true, hp: 999, maxHp: 999, r: 40 };
  for (const Q of [P, ...(also ? [also] : [])]) {
    await Q.page.evaluate((n) => {
      const S = window._gameState && window._gameState.current;
      if (!S) return;
      S.gatherNodes = (Array.isArray(S.gatherNodes) ? S.gatherNodes : [])
        .filter((g) => g && g.id !== n.id).concat([n]);
    }, node);
  }
  await P.page.evaluate((id) => {
    const S = window._gameState && window._gameState.current;
    const n = (S.gatherNodes || []).find((g) => g.id === id);
    S._extraction = { skill: 'woodcutting', status: 'waiting', nodeRef: n, nodeId: id,
      startedAt: Date.now(), windowOpensAt: Date.now() + 600000 };
  }, node.id);
  return node;
}
async function stopChop(P, also) {
  for (const Q of [P, ...(also ? [also] : [])]) {
    await Q.page.evaluate(() => {
      const S = window._gameState && window._gameState.current;
      if (!S) return;
      S._extraction = null;
      S.gatherNodes = (S.gatherNodes || []).filter((g) => g && g.id !== 'qa_node_chopink');
    });
  }
}

const settle = async (P, wsPort) => {
  await H.clickText(P, 'CLOSE').catch(() => {});
  const id = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'quests', id).catch(() => {});
  await P.page.waitForTimeout(1000);
  await H.closeNpcDialogue(P).catch(() => {});
};
const crop = async (P, name) => {
  const box = await P.page.evaluate(() => {
    const R = window._pixiRenderer;
    const sp = R && R.chopSpriteRaw && R.chopSpriteRaw(null);
    if (!sp || !sp.visible || !sp.getBounds) return null;
    const b = sp.getBounds();
    const c = document.querySelector('canvas');
    const r = c ? c.getBoundingClientRect() : { x: 0, y: 0 };
    const k = c ? r.width / c.width * (window.devicePixelRatio || 1) : 1;
    return { x: r.x + b.x * k - 8, y: r.y + b.y * k - 8, width: b.width * k + 16, height: b.height * k + 16 };
  }).catch(() => null);
  if (box && box.width > 4 && box.height > 4) {
    await P.page.screenshot({ path: `${SHOTS}/chopink-${name}.png`, clip: box }).catch(() => {});
  }
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
  await B.page.waitForTimeout(2500);

  const relayed = await B.page.evaluate(([id, face, pink]) => {
    const o = ((window._gameState.current || {}).others || {})[id];
    return o ? { face: o.faceTattooArt === face, arm: o.armTattooArt === pink, chest: o.tattooArt === pink } : null;
  }, [aId, LEFT_BLUE, ALL_PINK]);
  rec.ok('the watcher has his face, arm and chest drawings off the wire (guard)',
    !!relayed && relayed.face && relayed.arm && relayed.chest, relayed);

  /* ── THE TREE ON HIS RIGHT: the art's own facing ── */
  let peerR = null, selfR = null;
  [peerR, selfR] = await Promise.all([
    sampleChop(B, aId, 9000),
    (async () => { await startChop(A, +1, B); return sampleChop(A, null, 6000); })(),
  ]);
  await crop(A, 'right');
  const own = selfR.filter((s) => !s.err);
  const ks = new Set(own.map((s) => s.k));
  console.log(`    own screen (tree right), per frame k:ink/pink/sameSkin/side: ${own.map((s) => `${s.k}:${s.ink}/${s.pink}/${s.sameSkin}/${s.side}`).join(' ')}`);
  rec.ok('he is drawn as the lumberjack on his own screen, through most of the swing (guard)',
    own.length >= 6 && ks.size >= 6, { frames: [...ks].sort((a, b) => a - b), errs: selfR.filter((s) => s.err).slice(0, 3) });
  rec.ok('ON HIS OWN SCREEN the tattoos are on every swing frame, from the first one',
    own.length > 0 && own.every((s) => s.ink >= 20), own.map((s) => [s.k, s.ink]));
  rec.ok('...the PINK ones too -- not turned to copper by the axe\'s recolour (every frame)',
    own.length > 0 && own.every((s) => s.pink >= 12), own.map((s) => [s.k, s.pink]));
  rec.ok('the axe is untouched: every key pixel of the art is still wood or copper, on every frame',
    own.length > 0 && own.every((s) => s.axeRaw > 0 && s.axeKept === s.axeRaw), own.map((s) => [s.k, s.axeRaw, s.axeKept]));
  /* The head fix: frames 6..11 used to keep ~1240 painted skin pixels (the head)
     and every frame a few fingers.  The retint maps every skin pixel somewhere
     else, so a pixel still EXACTLY the art's is one it skipped. */
  rec.ok('the whole lumberjack wears his skin: no skin pixel left in the artist\'s paint on any frame (the head on frames 6-11 was)',
    own.length > 0 && own.every((s) => s.sameSkin <= 3), own.map((s) => [s.k, s.sameSkin]));
  rec.ok('the face drawing sits the way it was drawn: its left half, on the head\'s left (tree on his right, figure not flipped)',
    own.length > 0 && own.every((s) => !s.flip && s.side != null && s.side < -0.15), own.map((s) => [s.k, s.flip, s.side]));

  /* the watcher: bare until the bake lands, then inked for good */
  const peer = peerR.filter((s) => !s.err);
  const firstInked = peer.findIndex((s) => s.ink >= 20);
  const bareMs = firstInked >= 0 ? peer[firstInked].t - peer[0].t : null;
  console.log(`    watcher (tree right), per frame t:k:ink/pink/chopInk: ${peer.map((s) => `${s.t}:${s.k}:${s.ink}/${s.pink}/${s.chopInk ? 1 : 0}`).join(' ')}`);
  rec.ok('the watcher sees him chopping (guard)', peer.length >= 4, peerR.slice(0, 6));
  /* A peer's look cannot be baked at load; the bake runs the first time he is
     seen chopping.  One swing is 12 x 45 ms; the bound is generous for this
     box, which renders several times slower than a phone. */
  rec.ok(`ON THE WATCHER'S SCREEN his tattoos are on too, from his first swings (bare for ${bareMs} ms here while it bakes)`,
    firstInked >= 0 && bareMs <= 2500, { firstInked, frames: peer.slice(0, 12).map((s) => [s.t, s.ink]) });
  rec.ok('...and stay on for every frame after that, pink ones included, drawn from his own bake',
    firstInked >= 0 && peer.slice(firstInked).every((s) => s.ink >= 20 && s.pink >= 12 && s.chopInk === true),
    peer.slice(Math.max(0, firstInked)).map((s) => [s.k, s.ink, s.pink, s.chopInk]));
  rec.ok('...with the axe untouched on the watcher\'s screen too',
    firstInked >= 0 && peer.slice(firstInked).every((s) => s.axeRaw > 0 && s.axeKept === s.axeRaw),
    peer.slice(Math.max(0, firstInked)).map((s) => [s.k, s.axeRaw, s.axeKept]));

  /* ── THE TREE ON HIS LEFT: the figure is drawn flipped ── */
  await stopChop(A, B);
  await A.page.waitForTimeout(700);
  let peerL = null, selfL = null;
  [peerL, selfL] = await Promise.all([
    sampleChop(B, aId, 8000),
    (async () => { await startChop(A, -1, B); return sampleChop(A, null, 5000); })(),
  ]);
  await crop(A, 'left');
  const ownL = selfL.filter((s) => !s.err);
  console.log(`    own screen (tree left), per frame k:ink/side/flip: ${ownL.map((s) => `${s.k}:${s.ink}/${s.side}/${s.flip ? 1 : 0}`).join(' ')}`);
  rec.ok('with the tree on his LEFT the lumberjack is drawn flipped, facing it (guard)',
    ownL.length >= 4 && ownL.every((s) => s.flip), ownL.map((s) => [s.k, s.flip]));
  /* Flipped, the figure's texture must carry the drawing mirrored -- ink on the
     head's RIGHT in the texture, which the flip puts back on the left.  The
     plain bake would put it on the left in the texture and the flip would show
     the drawing backwards. */
  rec.ok('...and draws the pre-flipped bake, so the face drawing still reads the way it was drawn (not backwards)',
    ownL.length > 0 && ownL.every((s) => s.ink >= 20 && s.side != null && s.side > 0.15), ownL.map((s) => [s.k, s.ink, s.side]));
  const peerLf = peerL.filter((s) => !s.err);
  const firstL = peerLf.findIndex((s) => s.flip && s.ink >= 20 && s.side != null && s.side > 0.15);
  console.log(`    watcher (tree left), per frame t:k:ink/side/flip: ${peerLf.map((s) => `${s.t}:${s.k}:${s.ink}/${s.side}/${s.flip ? 1 : 0}`).join(' ')}`);
  rec.ok('the watcher sees him flipped too, and reading the right way round once his flipped bake lands',
    firstL >= 0 && peerLf.slice(firstL).every((s) => s.flip && s.ink >= 20 && s.side > 0.15),
    { firstL, frames: peerLf.slice(0, 14).map((s) => [s.t, s.k, s.flip, s.ink, s.side]) });

  /* ── RELEASED WHEN HE STOPS ── */
  const held = await B.page.evaluate(() => (window._pixiRenderer.peerChopBakes ? window._pixiRenderer.peerChopBakes() : -1));
  rec.ok(`the watcher holds at most two drawn lumberjacks (${held} now: one per side)`, held >= 1 && held <= 2, held);
  await stopChop(A, B);
  await B.page.waitForTimeout(17000);
  const left = await B.page.evaluate(() => (window._pixiRenderer.peerChopBakes ? window._pixiRenderer.peerChopBakes() : -1));
  rec.ok('...and releases them once he has stopped chopping (15 s)', left === 0, left);

  for (const P of [A, B]) {
    const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
    rec.ok(`no page errors on ${P.name}'s client`, errs.length === 0, errs.slice(0, 3));
  }
}
