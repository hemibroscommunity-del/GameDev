/* ═══ v2.3.2751: YOUR TATTOOS STAY ON WHILE YOU FISH ═══
 *
 * Owner: "yes make tattoos stay on while harvesting resources."
 *
 * Fishing drew the RAW fish sheet (entityRenderer v2.3.2304) so the region
 * recolour could not mis-paint the pink rod -- and a character's drawings rode
 * that same bake, so every tattoo vanished for as long as he fished, on his
 * own screen and on everyone else's.  getFishFrame now stamps the drawings on
 * the raw sheet with no recolour at all.  This checks that on both screens,
 * from the frames the renderer actually draws, and that the two things the old
 * choice protected are still protected:
 *
 *   - THE ROD'S OWN PIXELS: not one of them is repainted by the ink;
 *   - THE HAND-OVER-SHIRT OVERLAY (v2.3.1914): it lifts the rod and the hand
 *     around it above the shirt, finding the rod by its magenta.  A PINK tattoo
 *     passes that same colour test, so found on the inked frame a chest tattoo
 *     would ride over the shirt.  It is found on the raw frame now; the
 *     measure is the overlay's rod size against a plain angler's.
 *
 * WHY THE FRAME AND NOT ONLY THE SCREEN.  A screenshot of a figure at a
 * fishing spot also photographs the water, and ink blue is water blue.  The
 * frame the body sprite holds is read directly and compared pixel for pixel
 * with the same frame of the shipped fish sheet: blue that is in the drawn
 * frame and NOT at the same spot in the art is ink, whatever else is blue.
 * The crops are saved as pictures, not gated.
 *
 * Face and arm are drawn BLUE (palette 8) because nothing on the fish art is;
 * the chest is drawn PINK (palette 11) because that is the colour that trips
 * the rod detector.  All three go into storage before the character exists, so
 * the creator's join carries them into the saved record (v2.3.2746 -- a look
 * seeded after creation is, correctly, blank).
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';

const SHOTS = H.REPO + '/tools/qa/mp/out';
const ALL_BLUE = '8'.repeat(256);
const ALL_PINK = 'b'.repeat(256);

const COACH_OFF = `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle',
    'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
} catch (e) {}`;
const SEED = COACH_OFF + `
try {
  localStorage.setItem('bt-facetattoo', ${JSON.stringify(ALL_BLUE)});
  localStorage.setItem('bt-armtattoo', ${JSON.stringify(ALL_BLUE)});
  localStorage.setItem('bt-tattooart', ${JSON.stringify(ALL_PINK)});
} catch (e) {}`;

/* Read one figure's body frame as the renderer holds it, and the same frame
   of the shipped sheet, on EVERY animation frame for `ms` -- this box renders a
   phone-sized game at a few frames a second, and a sampler that round-trips to
   the test between reads sees one or two frames of a whole cast.  Each distinct
   texture is measured once.  `peerId` null = your own figure.  Per frame: the
   pose, the ink that is in the drawn frame and not in the art, and the rod
   pixels of each (the rod test is _fishTopFrame's own). */
const sampleFrames = (P, peerId, ms) => P.page.evaluate(async ({ pid, dur }) => {
  const R = window._pixiRenderer;
  /* The sheet the GAME loads: loadWebpOrPng asks for the .webp twin first.
     Compared against the .png instead, one semi-transparent rod-edge pixel on
     two frames reads as "not rod" -- the two decode a unit or two apart on
     thousands of semi-transparent edge pixels -- and that is the source, not
     ink (the bake reproduced from one source changes no rod pixel at all). */
  if (!window.__qaFishSheet) {
    const load = (src) => new Promise((res) => {
      const im = new Image();
      im.onload = () => res(im); im.onerror = () => res(null);
      im.src = src;
    });
    window.__qaFishSheet = (await load('/sprites/player/fish-south.webp')) || (await load('/sprites/player/fish-south.png'));
  }
  const sheet = window.__qaFishSheet;
  const isBlue = (d, o) => d[o + 3] > 60 && d[o + 2] > d[o] + 40 && d[o + 2] > d[o + 1] + 20;
  const isRod = (d, o) => {
    const r = d[o], g = d[o + 1], b = d[o + 2], a = d[o + 3];
    return a > 60 && r > 140 && g < 115 && b > 60 && b < 195 && (r - g) > 60 && b > g + 22;
  };
  const measure = (pd) => {
    const sb = pd && pd._spriteBody;
    const tex = sb && sb.texture;
    if (!pd || !tex || !tex.source) return { pose: pd ? pd._animPose : null, err: 'no body texture' };
    const pose = pd._animPose;
    if (pose !== 'fish') return { pose };
    if (!sheet) return { pose, err: 'the shipped fish sheet did not load' };
    const f = tex.frame;
    const W = Math.round(f.width), Hh = Math.round(f.height);
    const draw = (res, sx, sy, sw, sh) => {
      const c = document.createElement('canvas'); c.width = W; c.height = Hh;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.imageSmoothingEnabled = false;
      g.drawImage(res, sx, sy, sw, sh, 0, 0, W, Hh);
      return g.getImageData(0, 0, W, Hh).data;
    };
    let got;
    try { got = draw(tex.source.resource, f.x, f.y, f.width, f.height); } catch (e) { return { pose, err: 'unreadable: ' + e.message }; }
    const idx = Math.round(f.x / f.width);
    const sfw = sheet.naturalHeight;   /* square frames, one row */
    const raw = draw(sheet, idx * sfw, 0, sfw, sfw);
    let ink = 0, rodRaw = 0, rodKept = 0;
    for (let o = 0; o < got.length; o += 4) {
      if (isBlue(got, o) && !isBlue(raw, o)) ink++;
      if (isRod(raw, o)) { rodRaw++; if (isRod(got, o)) rodKept++; }
    }
    return { pose, idx, ink, rodRaw, rodKept };
  };
  const out = [];
  const seen = new Set();
  const t0 = performance.now();
  await new Promise((done) => {
    const tick = () => {
      const pd = pid ? (R && R.peerDisplayRaw && R.peerDisplayRaw(pid)) : (R && R.playerDisplayRaw && R.playerDisplayRaw());
      const tex = pd && pd._spriteBody && pd._spriteBody.texture;
      const k = tex ? (tex.uid + ':' + (pd._animPose || '')) : 'none';
      if (!seen.has(k)) {
        seen.add(k);
        const m = measure(pd);
        m.t = Math.round(performance.now() - t0);
        out.push(m);
      }
      if (performance.now() - t0 < dur) requestAnimationFrame(tick); else done();
    };
    requestAnimationFrame(tick);
  });
  return out;
}, { pid: peerId || null, dur: ms });

/* Every overlay the page builds while the soak runs: _fishTopFrame publishes
   its rod/grip counts as it builds one.  Polled per animation frame so a build
   between two samples is not missed. */
const watchFishTop = (P) => P.page.evaluate(() => {
  window.__qaFishTops = [];
  let last = null;
  const tick = () => {
    const t = window.__btFishTop;
    if (t && t !== last) { last = t; window.__qaFishTops.push({ rod: t.rod, grip: t.grip }); }
    if (window.__qaFishTops) window.__qaFishTopRaf = requestAnimationFrame(tick);
  };
  tick();
});
const fishTops = (P) => P.page.evaluate(() => {
  const a = window.__qaFishTops || [];
  cancelAnimationFrame(window.__qaFishTopRaf);
  return a;
});

/* Put a fishing spot at the player's feet and start fishing it, the way
   mp-cosmpose does (the node is injected; mp-harvest owns node sync). */
async function startFishing(P) {
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S) return;
    S._extraction = null; S._tapNode = null; S._nearNode = null;
  });
  await P.page.waitForTimeout(400);
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.player) return;
    S.rpg = S.rpg || {};
    S.rpg.inventory = S.rpg.inventory || {};
    S.rpg.inventory.fishing_pole = (S.rpg.inventory.fishing_pole || 0) + 1;
    const node = { id: 'qa-harvestink-fish', nodeType: 'fishSpot', tierLvl: 1, alive: true,
      respawnAt: 0, x: S.player.x + 8, y: S.player.y + 8 };
    S.gatherNodes = [node];
    S._tapNode = node;
  });
  await P.page.waitForTimeout(700);
  const pressed = await P.page.evaluate(() => {
    const el = document.querySelector('.bt-rjoy-base');
    if (!el || !/harvest/i.test(el.textContent || '')) return false;
    const r = el.getBoundingClientRect();
    const mk = (type) => new TouchEvent(type, { bubbles: true, cancelable: true,
      touches: type === 'touchend' ? [] : [new Touch({ identifier: 71, target: el, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 })],
      changedTouches: [new Touch({ identifier: 71, target: el, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 })] });
    el.dispatchEvent(mk('touchstart')); el.dispatchEvent(mk('touchend'));
    return true;
  });
  if (!pressed) return { ok: false, why: 'the right button did not offer HARVEST' };
  await P.page.waitForTimeout(900);
  const skill = await H.readState(P, (S) => (S._extraction ? S._extraction.skill : null));
  return skill ? { ok: true, skill } : { ok: false, why: 'HARVEST was pressed and no extraction started' };
}

const crop = async (P, peerId, name) => {
  const box = await H.figureBox(P, { peerId: peerId || null, pad: 10 }).catch(() => null);
  if (box) await P.page.screenshot({ path: `${SHOTS}/harvestink-${name}.png`, clip: box }).catch(() => {});
};

/* A fresh character's first quest opens the Mayor's dialogue over the screen;
   the pictures are of the angler, not of him. */
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

  /* ── THE CONTROL: a plain angler ──
     Draws the raw sheet as ever (no ink), and sets the size of the overlay's
     rod on an undrawn frame. */
  const C = await H.newPlayer(browser, { name: 'Plain', wsPort, webPort, dpr: 2, init: COACH_OFF });
  opened.push(C);
  await H.enterWorld(C);
  await C.page.waitForTimeout(2500);
  await settle(C, wsPort);
  await watchFishTop(C);
  const cFish = await startFishing(C);
  rec.ok('a plain character can be put to fishing (guard)', cFish.ok, cFish);
  /* as long as the tattooed angler's soak below, so both see the whole cast */
  const cSamples = await sampleFrames(C, null, 7000);
  await crop(C, null, 'plain-fishing');
  const cTops = await fishTops(C);
  const cFishS = cSamples.filter((s) => s.pose === 'fish' && !s.err);
  rec.ok('...and is drawn in the fish pose (guard)', cFishS.length >= 5, cSamples.map((s) => s.pose + (s.err ? ':' + s.err : '')).slice(0, 12));
  rec.ok('with nothing drawn, fishing still draws the plain sheet -- no ink on any frame (control)',
    cFishS.length > 0 && cFishS.every((s) => s.ink === 0), cFishS.map((s) => s.ink));
  const cRodMax = cTops.length ? Math.max(...cTops.map((t) => t.rod)) : null;
  rec.ok('the hand-over-shirt overlay is built for a plain angler in a tee (guard)', cTops.length > 0, cTops.slice(0, 4));
  await C.ctx.close().catch(() => {});
  opened.splice(opened.indexOf(C), 1);

  /* ── THE TATTOOED ANGLER, AND SOMEONE WATCHING ── */
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

  const own = await A.page.evaluate(([blue, pink]) => ({
    face: localStorage.getItem('bt-facetattoo') === blue,
    arm: localStorage.getItem('bt-armtattoo') === blue,
    chest: localStorage.getItem('bt-tattooart') === pink,
  }), [ALL_BLUE, ALL_PINK]);
  rec.ok('the character\'s face, arm and chest drawings are his own (guard: exact strings)',
    own.face && own.arm && own.chest, own);
  const relayed = await B.page.evaluate(([id, blue]) => {
    const o = ((window._gameState.current || {}).others || {})[id];
    return o ? { face: o.faceTattooArt === blue, arm: o.armTattooArt === blue } : null;
  }, [aId, ALL_BLUE]);
  rec.ok('the watcher has his drawings off the wire (guard)', !!relayed && relayed.face && relayed.arm, relayed);

  await crop(A, null, 'inked-standing');
  await watchFishTop(A);
  /* Both screens at once.  The WATCHER starts looking before he casts: a
     peer's inked fish sheet bakes the first time they cast (their drawings
     cannot be known at load), and the question is how long that first cast
     shows him bare -- which a watch that began after the cast cannot see. */
  let aFish = null;
  const [peerS, selfS] = await Promise.all([
    sampleFrames(B, aId, 10000),
    (async () => { aFish = await startFishing(A); return sampleFrames(A, null, 7000); })(),
  ]);
  rec.ok('the tattooed character can be put to fishing (guard)', !!aFish && aFish.ok, aFish);
  for (let i = 0; i < 3; i++) {
    await crop(A, null, `inked-fishing-${i}`);
    await crop(B, aId, `inked-fishing-${i}-watcher`);
    await A.page.waitForTimeout(600);
  }
  const aTops = await fishTops(A);

  const selfF = selfS.filter((s) => s.pose === 'fish' && !s.err);
  const peerF = peerS.filter((s) => s.pose === 'fish' && !s.err);
  console.log(`    own screen, ink per fish frame: ${selfF.map((s) => s.ink).join(' ')}`);
  console.log(`    watcher's screen, ink per fish frame: ${peerF.map((s) => s.ink).join(' ')}`);
  console.log(`    overlay rod px -- plain angler max ${cRodMax}; tattooed: ${aTops.map((t) => t.rod).join(' ')}`);
  rec.ok('he is drawn in the fish pose on his own screen (guard)', selfF.length >= 5, selfS.map((s) => s.pose + (s.err ? ':' + s.err : '')).slice(0, 12));
  rec.ok('...and on the watcher\'s (guard)', peerF.length >= 5, peerS.map((s) => s.pose + (s.err ? ':' + s.err : '')).slice(0, 12));
  rec.ok('ON HIS OWN SCREEN the tattoos are on every fishing frame, from the first one (baked behind the loading screen)',
    selfF.length > 0 && selfF.every((s) => s.ink >= 20), selfF.map((s) => s.ink));
  const firstInked = peerF.findIndex((s) => s.ink >= 20);
  const bareMs = firstInked >= 0 ? peerF[firstInked].t - peerF[0].t : null;
  console.log(`    watcher: first fishing frame at ${peerF[0] ? peerF[0].t : '-'} ms, first with the tattoos at ${firstInked >= 0 ? peerF[firstInked].t : '-'} ms`);
  /* THE ONE TRADE, measured rather than hidden.  Your own inked fish sheet is
     baked behind the loading screen; a PEER's cannot be -- their drawings are
     not known until they are seen, the licence CLAUDE.md's preload law gives
     "a remote player's arbitrary recolor" -- so it bakes on their first cast,
     the way every other pose of a custom-looking peer already does, and they
     fish bare until it lands.  Baking every tattooed peer's fish sheet on
     sight instead would hold ~2.7 MB of GPU memory per tattooed player whether
     they ever fish or not.  The bound is two casts (FISH_DURATION_MS 1333):
     this box renders several times slower than a phone, and what is being
     guarded is "during the first cast", not a particular machine's speed. */
  rec.ok(`ON THE WATCHER'S SCREEN they are on too, from his first cast (bare for ${bareMs} ms here while it bakes; a cast is 1333 ms)`,
    firstInked >= 0 && bareMs <= 2 * 1333, { firstInked, frames: peerF.map((s) => [s.t, s.ink]) });
  rec.ok('...and stay on for every frame after that',
    firstInked >= 0 && peerF.slice(firstInked).every((s) => s.ink >= 20), peerF.slice(Math.max(0, firstInked)).map((s) => s.ink));
  /* on the INKED frames: the claim is that the ink never lands on the rod.  A
     bare frame is the loader's copy of the sheet, not the bake, and says
     nothing either way. */
  const inkedF = [...selfF, ...peerF].filter((s) => s.ink >= 20);
  const rodHit = inkedF.filter((s) => !(s.rodRaw > 0 && s.rodKept === s.rodRaw));
  rec.ok(`the rod is untouched: every rod pixel of the art is still rod, on every inked frame on both screens (${inkedF.length} frames)`,
    inkedF.length > 0 && rodHit.length === 0,
    rodHit.slice(0, 8).map((s) => ({ idx: s.idx, rodRaw: s.rodRaw, kept: s.rodKept, ink: s.ink })));
  rec.ok('the hand-over-shirt overlay lifts the ROD, not the pink chest tattoo: its rod is no bigger than a plain angler\'s',
    aTops.length > 0 && cRodMax != null && Math.max(...aTops.map((t) => t.rod)) <= cRodMax,
    { plainMax: cRodMax, tattooed: aTops.map((t) => t.rod) });

  for (const P of [A, B]) {
    const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
    rec.ok(`no page errors on ${P.name}'s client`, errs.length === 0, errs.slice(0, 3));
  }
}
