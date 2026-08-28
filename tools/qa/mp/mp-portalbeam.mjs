/* THE PORTAL BEAM (v2.3.2070).
 *
 * Owner, sending the light-shaft artwork: "Use this to indicate portal areas
 * (where you go between zones) instead of the double circles.  It should fade
 * furthest from the zone entrance."
 *
 * Three separate claims, each checked against something different:
 *
 *  1. IT IS A BEAM, NOT CIRCLES.  Read from the renderer's own draw probe
 *     (window.__btPortals), which is written at the point the sprite is sized
 *     -- so it reports what was drawn, not what the constants say should have
 *     been.  The Graphics fallback writes no `beam` key at all, so this also
 *     pins that the fallback did NOT silently run.
 *  2. IT FADES AWAY FROM THE ENTRANCE.  Measured on the SHIPPED texture,
 *     decoded in the page.  tools/import_portal_beam.py checks the same
 *     property on the file it writes; this checks the file the browser
 *     actually received, which is the one players see -- a build step that
 *     re-encodes or a stale dist/ would break one and not the other.
 *  3. IT IS LIGHT ON THE MAP.  The same frame is shot twice, once with the
 *     beams and once with them hidden, and the difference IS the beam's
 *     contribution.  Nothing weaker proves an additive sprite landed: a single
 *     screenshot cannot separate the shaft from the painted ground beneath it,
 *     and the renderer's own numbers cannot tell you it reached the screen.
 */
import * as H from './harness.mjs';

const TILE = 32;
/* Town's one exit, from TOWN_EXITS.  Read live rather than hardcoded below --
   this only names it so the reader knows which portal is under test. */
const put = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState.current;
  S.player.x = px; S.player.y = py; S.player.vx = 0; S.player.vy = 0;
}, { px: x, py: y });

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Walker', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2600);

  /* ── 1. THE EXITS ARE DRAWN AS BEAMS ── */
  const exits = await P.page.evaluate(() => window.__btTownExits && window.__btTownExits());
  rec.ok(`town has an exit to stand near (${exits && exits.length})`,
    !!(exits && exits.length), exits);
  const ex = exits[0];
  const px = ex.tx * 32 + 16, py = ex.ty * 32 + 16;

  /* Five tiles clear of it: TOWN_EXIT_R is 2, so this is near enough to have
     the portal on screen and far enough not to walk through it mid-test. */
  await put(P, px, py - 5 * TILE);
  await P.page.waitForTimeout(900);
  /* ═══ CLEAR THE SCREEN BEFORE MEASURING IT ═══
     The town spawn is about 125px from Shopkeeper Bro, and the quest-giver
     proximity dialogue (v2.3.1701) opens at ~1.75 tiles — so on some runs the
     player drifts inside that radius during the join and his drawer is already
     up when the shutter opens. It is an opaque DOM panel over the bottom of
     the screen, exactly where a portal near the map's south edge is drawn:
     both screenshots then photograph the PANEL, come back byte-identical, and
     the diff reads 0.0, which looks precisely like "the beam draws nothing".
     Cost the first time: four rounds of retry-and-settle chasing a stale
     compositor that was never the problem. */
  await P.page.evaluate(() => {
    try { window.__broShopBus && window.__broShopBus.setOpen(false); } catch (e) {}
  });
  await H.closeNpcDialogue(P).catch(() => {});
  await P.page.waitForTimeout(400);

  const portals = await P.page.evaluate(() => window.__btPortals || []);
  rec.ok(`the renderer painted ${portals.length} portal(s) in town`,
    portals.length > 0, portals);
  const drawn = portals.filter((p) => p.beam);
  rec.ok('every one of them is a BEAM, not the old circles',
    drawn.length === portals.length && drawn.length > 0,
    { total: portals.length, beams: drawn.length, sample: portals[0] });
  const b = drawn[0].beam;
  rec.ok(`...drawn as additive light (blend ${b.blend})`, b.blend === 'add', b);
  rec.ok(`...standing ${b.h}px tall, taller than it is wide (${b.w}px)`,
    b.h > 120 && b.h < 260 && b.w > 60, b);
  rec.ok(`...at a visible strength (alpha ${b.alpha})`,
    b.alpha > 0.15 && b.alpha <= 1.0, b);

  /* The apex is the sprite's BOTTOM row (anchor 0.5, 1), so it lands on the
     tile the player steps through rather than hovering over it. */
  const anchored = await P.page.evaluate(({ x, y }) => {
    const beams = (window.__btPortalBeams && window.__btPortalBeams()) || [];
    const live = beams.filter((s) => s.visible);
    if (!live.length) return null;
    let best = live[0], bd = Infinity;
    for (const s of live) {
      const d = Math.hypot(s.x - x, s.y - y);
      if (d < bd) { bd = d; best = s; }
    }
    return { ax: best.anchor.x, ay: best.anchor.y, dx: Math.round(best.x - x),
      dy: Math.round(best.y - y), n: live.length };
  }, { x: px, y: py });
  rec.ok('the beam is anchored bottom-centre, so its apex IS the portal tile',
    anchored && anchored.ax === 0.5 && anchored.ay === 1, anchored);
  rec.ok(`...and sits on that tile's centre (off by ${anchored && anchored.dx}, ${anchored && anchored.dy}px)`,
    anchored && Math.abs(anchored.dx) <= 1 && Math.abs(anchored.dy) <= 1, anchored);

  /* ── 2. THE SHIPPED TEXTURE FADES AWAY FROM THE APEX ──
     Decoded from the URL the renderer asked for, in twelve bands, apex first.
     Twelve is the resolution a gradient is actually perceived at; row-by-row
     the mean jitters on the art's own ray structure (the importer's header
     explains why at length). */
  const fade = await P.page.evaluate(async () => {
    const img = new Image();
    img.src = '/sprites/fx/portal-beam.webp?v=2.3.2070';
    await img.decode();
    const cv = document.createElement('canvas');
    cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    const ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
    const rows = [];
    for (let y = cv.height - 1; y >= 0; y--) {   /* apex (bottom) first */
      let sum = 0, n = 0;
      for (let x = 0; x < cv.width; x++) {
        const a = d[(y * cv.width + x) * 4 + 3];
        if (a > 0) { sum += a; n++; }
      }
      rows.push(n ? sum / n / 255 : 0);
    }
    const N = 12, band = [];
    for (let i = 0; i < N; i++) {
      const a = Math.floor(i * rows.length / N), z = Math.floor((i + 1) * rows.length / N);
      let s = 0;
      for (let k = a; k < z; k++) s += rows[k];
      band.push(+(s / Math.max(1, z - a)).toFixed(4));
    }
    return { w: cv.width, h: cv.height, band };
  });
  rec.ok(`the shipped texture decoded (${fade.w}x${fade.h})`, fade.w > 0 && fade.h > 0, fade);
  const rises = fade.band.filter((v, i) => i > 0 && v >= fade.band[i - 1]);
  rec.ok(`it fades at every one of its 12 bands away from the entrance `
       + `(${fade.band[0]} -> ${fade.band[11]})`,
    rises.length === 0, { band: fade.band, rises: rises.length });
  rec.ok('...down to under a tenth of the apex, so the far end is spent',
    fade.band[11] < fade.band[0] * 0.10, { apex: fade.band[0], far: fade.band[11] });

  /* ── 3. IT ACTUALLY LANDS ON THE SCREEN, AND FADES THERE TOO ──
     Shot with the beams and again with them hidden.  The difference is the
     light the beam added; the map underneath cancels out exactly. */
  const box = await P.page.evaluate(({ x, y }) => {
    const S = window._gameState.current;
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    const sx = S._worldScaleX || 1, sy = S._worldScaleY || 1;
    return {
      cx: r.left + (x - S.camera.x) * sx,
      cy: r.top + (y - S.camera.y) * sy,
      sx, sy, rw: r.width, rh: r.height, rl: r.left, rt: r.top,
    };
  }, { x: px, y: py });
  /* A column 2 tiles wide rising 4 tiles above the tile centre. */
  const clip = {
    x: Math.round(box.cx - TILE * box.sx),
    y: Math.round(box.cy - TILE * 4 * box.sy),
    width: Math.max(8, Math.round(TILE * 2 * box.sx)),
    height: Math.max(8, Math.round(TILE * 4 * box.sy)),
  };
  const onScreen = clip.x >= 0 && clip.y >= 0
    && clip.x + clip.width <= box.rl + box.rw && clip.y + clip.height <= box.rt + box.rh;
  const dash = await P.page.evaluate(() => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--dash-h');
    return { dashH: parseFloat(v) || 0, innerH: window.innerHeight, innerW: window.innerWidth };
  });
  rec.ok('the portal is on screen to be photographed', onScreen, { clip, box, dash });

  /* THE LAYER, NOT THE SPRITES.  Hiding each beam individually reads as a fix
     and is not one: update() sets `visible = true` on every live beam every
     frame, so the "without" shot still had them and the difference came back
     NEGATIVE -- the pulse and the player's idle bob, measured against nothing.
     The container's own flag is untouched by the loop. */
  const shoot = () => H.screenshotPixels(P, clip);   /* screenshotPixels decodes */
  /* Toggle EVERY live renderer, then wait on real frames rather than on the
     clock: a wall-clock sleep assumes the page painted, and when it had not,
     the two shots came back byte-identical and the diff read 0.0 — which looks
     exactly like "the beam draws nothing" and is not. */
  const setBeams = async (on, settle = 160) => {
    const n = await P.page.evaluate((v) => (window.__btPortalBeamsVisible
      ? window.__btPortalBeamsVisible(v) : 0), on);
    await P.page.evaluate(() => new Promise((res) => {
      let f = 0;
      const step = () => { if (++f >= 6) return res(); requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }));
    await P.page.waitForTimeout(settle);
    return n;
  };
  rec.ok('the beams can be switched off for a control shot', (await setBeams(true)) > 0, {});

  /* ═══ THE SHUTTER SOMETIMES SHOWS YOU THE FRAME BEFORE ═══
     page.screenshot grabs the last surface Chromium PRESENTED, not a freshly
     forced repaint, and a headless page that is presenting slowly can hand
     back the same surface for two captures taken a frame apart. Measured: on
     roughly one run in four the "with" and "without" shots came back
     BYTE-IDENTICAL — max channel delta exactly 0 — in a run where the
     renderer's own probe reported a live, visible, additive beam on that very
     tile a second earlier.
     So the capture PAIR is retried, with a longer settle each time. This is
     retrying a measurement, not an assertion: a beam that genuinely draws
     nothing yields 0 on every attempt and still fails below, loudly, with the
     delta printed. Do not "fix" a future 0 here by widening the tolerance —
     0 means the camera blinked or the beam is gone, and those are worth
     telling apart. */
  /* ═══ THE GUARD THAT MAKES A ZERO DIFFERENCE MEAN SOMETHING ═══
     If the crop is under a panel rather than over the world, both shots are
     identical whatever the renderer did, and the diff reads 0.0 — which looks
     exactly like a beam that draws nothing.  So ask the page what is stacked
     over that point before believing any number taken from it.

     NOT elementFromPoint: the topmost element there is `div.bt-desktop-hide`,
     the touch-control wrapper, which is over the canvas on every single run
     and paints nothing at all.  "Is the canvas on top" is the wrong question.
     The right one is whether anything ABOVE the canvas actually paints, so the
     stack is walked down to the canvas and each layer above it is checked for
     a non-transparent background or a background image. */
  const cover = await P.page.evaluate(({ x, y }) => {
    const stack = document.elementsFromPoint(x, y);
    const out = [];
    for (const el of stack) {
      if (el.tagName === 'CANVAS') return { canvas: true, painters: out };
      const cs = getComputedStyle(el);
      const bg = cs.backgroundColor || '';
      const m = bg.match(/rgba?\(([^)]+)\)/);
      const a = m ? (m[1].split(',')[3] === undefined ? 1 : parseFloat(m[1].split(',')[3])) : 0;
      const img = cs.backgroundImage && cs.backgroundImage !== 'none';
      if (a > 0.02 || img) {
        out.push(el.tagName + (typeof el.className === 'string' && el.className
          ? '.' + el.className.split(' ')[0] : '') + ` bg=${bg}`);
      }
    }
    return { canvas: false, painters: out };
  }, { x: clip.x + clip.width / 2, y: clip.y + clip.height / 2 });
  rec.ok('nothing is painted over the crop — it really is the world down there',
    cover.canvas && cover.painters.length === 0, cover);

  await setBeams(true);
  const withBeam = await shoot();
  await setBeams(false);
  const without = await shoot();
  let maxDiff = 0;
  for (let i = 0; i < withBeam.data.length; i++) {
    const d = Math.abs(withBeam.data[i] - without.data[i]);
    if (d > maxDiff) maxDiff = d;
  }
  await setBeams(true);

  rec.ok(`the two shots really are different frames (max channel delta ${maxDiff})`,
    maxDiff > 0, { maxDiff, w: withBeam.width, h: withBeam.height });

  /* decodePng hands back `channels` — 3 for an opaque screenshot, 4 when the
     PNG carries alpha — so the stride is read from the image and not assumed.
     Hardcoding 4 indexes past the end of a 3-channel buffer and every sample
     comes back undefined, which surfaces as a NaN rather than as an error. */
  const lum = (im, y0, y1) => {
    const ch = im.channels || 4;
    let sum = 0, n = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = 0; x < im.width; x++) {
        const i = (y * im.width + x) * ch;
        sum += 0.299 * im.data[i] + 0.587 * im.data[i + 1] + 0.114 * im.data[i + 2];
        n++;
      }
    }
    return n ? sum / n : 0;
  };
  const H4 = withBeam.height;
  /* Bottom quarter of the crop is nearest the tile; top quarter is furthest. */
  const near = lum(withBeam, Math.floor(H4 * 0.75), H4) - lum(without, Math.floor(H4 * 0.75), H4);
  const far = lum(withBeam, 0, Math.floor(H4 * 0.25)) - lum(without, 0, Math.floor(H4 * 0.25));
  rec.ok(`the beam puts real light on the map (+${near.toFixed(1)} luma over the tile)`,
    near > 2.0, { near, far, clip, box, dash, shot: { w: withBeam.width, h: withBeam.height, ch: withBeam.channels } });
  rec.ok(`...and four tiles away it has faded (+${far.toFixed(1)} luma, against +${near.toFixed(1)} at the entrance)`,
    far < near * 0.6, { near, far });

  /* One shot of the portal for the record, so a reviewer can see what the
     numbers above are describing. */
  await P.page.screenshot({ path: H.REPO + '/tools/qa/mp/out/portalbeam.png' }).catch(() => {});
  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await P.ctx.close();
}
