/* ═══ v2.3.2747: THE TEE'S OUTLINE HOLDS ON EVERY FRAME OF THE RUN, IN GAME ═══
 *
 * Owner: "running while wearing the shirt produces a static-like effect where
 * it pops from frame to frame. I think it's because the black outline from the
 * shirt was removed at some point during the recolor tooling."
 *
 * tools/gear/reoutline-shirt.mjs re-draws the keyline on the sheets and checks
 * them there.  This checks what a PHONE actually draws: the running character
 * in all eight directions, reading every frame the game puts on the tee's
 * sprite straight off its texture -- so a stale .webp twin (the loader prefers
 * it over the PNG), a gear cache that was not bumped, or a sheet left out of
 * the bake would all show up here as frames with a broken outline.
 *
 * For each frame: the tee's silhouette edge, and how much of it is keyline
 * (dark).  The hem is left out -- it is line-free on purpose (v2.3.1559).
 * The flicker the owner saw was that share jumping from frame to frame.
 *
 * Also saves real-size crops of the running figure, one per sampled moment,
 * to /tmp/qa-shirtjog/ for the PR's recording.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';

const DIR = process.env.QA_SHIRTJOG_DIR || '/tmp/qa-shirtjog';
const PHONE = { width: 390, height: 844 };
const COACH_OFF = () => {
  try {
    const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle',
      'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
    const d = {}; for (const k of l) d[k] = true;
    localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  } catch (e) { /* private mode */ }
};

/* The eight run directions and the keys that make them. */
const RUNS = [
  { dir: 'south', keys: ['s'] },
  { dir: 'north', keys: ['w'] },
  { dir: 'east', keys: ['d'] },
  { dir: 'west', keys: ['a'] },
  { dir: 'northeast', keys: ['w', 'd'] },
  { dir: 'northwest', keys: ['w', 'a'] },
  { dir: 'southwest', keys: ['s', 'a'] },
  { dir: 'southeast', keys: ['s', 'd'] },
];

/* The frames the running figure actually shows, sampled on every animation
   frame inside the page for `ms` -- this box renders a phone-sized game at a
   few frames a second, so a sampler that round-trips to the test process
   between samples sees one or two frames of a whole run. */
const liveFrames = (P, ms) => P.page.evaluate((dur) => new Promise((res) => {
  const seen = new Set();
  let src = null;
  const t0 = performance.now();
  window.__qaTexN = window.__qaTexN || 0;
  const tick = () => {
    const pd = window._pixiRenderer.playerDisplayRaw();
    const s = pd && pd._gearShirt;
    const t = s && s.visible ? s.texture : null;
    if (t && t.source) {
      if (!t.__qaId) t.__qaId = ++window.__qaTexN;
      seen.add(t.__qaId + '@' + t.frame.x + ',' + t.frame.y);
      const r = t.source.resource;
      /* v2.3.2748: a cropped sheet's resource is a packed canvas; gearSheets
         keeps the decoded file's URL on the source's label */
      src = String((r && (r.currentSrc || r.src)) || t.source.label || '').split('/').slice(-2).join('/');
    }
    if (performance.now() - t0 < dur) requestAnimationFrame(tick); else res({ n: seen.size, src });
  };
  requestAnimationFrame(tick);
}), ms);

/* EVERY frame of the sheet the tee is drawing from, as the phone decoded it
   (the served .webp twin, not the PNG in git): per frame, the tee's
   silhouette edge and the share of it that is keyline.  The hem -- the
   lowest two solid pixels of each column -- is left out: it is line-free on
   purpose (v2.3.1559). */
const sheetOutline = (P) => P.page.evaluate(() => {
  const pd = window._pixiRenderer.playerDisplayRaw();
  const s = pd && pd._gearShirt;
  const t = s && s.texture;
  const img = t && t.source && t.source.resource;
  if (!img || !(img.naturalWidth || img.width)) return null;
  /* One cell per frame, each as fw x fh RGBA.  v2.3.2748: gear frames are
     CROPPED (gearSheets packTrimmed), so the source is no longer a grid of
     equal cells -- the sheet's frames come from __btGearSheetOf and each is
     drawn back into its whole frame at its trim, which is byte-identical to
     the uncropped cell.  An uncropped sheet keeps the grid walk. */
  const cells = [];
  let fw, fh;
  const sheet = window.__btGearSheetOf ? window.__btGearSheetOf(t) : null;
  if (sheet && sheet[0] && sheet[0].trim) {
    fw = Math.round(sheet[0].orig.width); fh = Math.round(sheet[0].orig.height);
    for (const f of sheet) {
      const c = document.createElement('canvas'); c.width = fw; c.height = fh;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.imageSmoothingEnabled = false;
      g.drawImage(f.source.resource, f.frame.x, f.frame.y, f.frame.width, f.frame.height,
        f.trim.x, f.trim.y, f.frame.width, f.frame.height);
      cells.push(g.getImageData(0, 0, fw, fh).data);
    }
  } else {
    const k = (t.source.pixelWidth && t.source.width) ? t.source.pixelWidth / t.source.width : 1;
    fw = Math.round(t.frame.width * k); fh = Math.round(t.frame.height * k);
    const W = img.naturalWidth || img.width, Hh = img.naturalHeight || img.height;
    const c = document.createElement('canvas');
    c.width = W; c.height = Hh;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    for (let fy = 0; fy + fh <= Hh; fy += fh) {
      for (let fx = 0; fx + fw <= W; fx += fw) cells.push(g.getImageData(fx, fy, fw, fh).data);
    }
  }
  const frames = [];
  for (const px of cells) {
    const solid = (x, y) => x >= 0 && y >= 0 && x < fw && y < fh && px[(y * fw + x) * 4 + 3] >= 128;
    const hem = new Uint8Array(fw * fh);
    let any = false;
    for (let x = 0; x < fw; x++) {
      let n = 0;
      for (let y = fh - 1; y >= 0 && n < 2; y--) if (solid(x, y)) { hem[y * fw + x] = 1; n++; any = true; }
    }
    if (!any) continue;                       /* an empty cell past the last frame */
    let edge = 0, dark = 0;
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        if (!solid(x, y) || hem[y * fw + x]) continue;
        if (solid(x - 1, y) && solid(x + 1, y) && solid(x, y - 1) && solid(x, y + 1)) continue;
        edge++;
        const i = (y * fw + x) * 4;
        if (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2] < 90) dark++;
      }
    }
    if (edge) frames.push(dark / edge);
  }
  const url = String(img.currentSrc || img.src || t.source.label || '');
  return { src: url.split('/').slice(-2).join('/'), frames };
});

export async function run(ctx) {
  const opened = [];
  try { await scenario(ctx, opened); } finally {
    for (const P of opened) await P.ctx.close().catch(() => {});
  }
}

async function scenario({ browser, wsPort, webPort, rec }, opened) {
  mkdirSync(DIR, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Runner', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, init: COACH_OFF });
  opened.push(P);
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  await H.clickText(P, 'CLOSE').catch(() => {});
  const shirt = await P.page.evaluate(() => (window.__btWardrobe ? window.__btWardrobe().gearShirt : null));
  rec.ok('the character is wearing the tee (guard)', shirt === 'tshirt', { shirt });
  /* nobody with something to say: a fresh character's first quest has the
     Mayor open his dialogue over the whole screen, and the recording is of
     the runner, not of him */
  const myId = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'quests', myId).catch(() => {});
  await P.page.waitForTimeout(1000);
  await H.closeNpcDialogue(P).catch(() => {});
  const spawn = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));

  const all = [];
  for (const r of RUNS) {
    /* start each run from the spawn, in the open plaza */
    await H.hopTo(P, spawn.x, spawn.y).catch(() => {});
    await H.closeNpcDialogue(P).catch(() => {});
    await P.page.waitForTimeout(500);
    for (const k of r.keys) await P.page.keyboard.down(k);
    await P.page.waitForTimeout(400);
    const live = await liveFrames(P, 3000);
    const sheet = await sheetOutline(P);
    /* a few real-size crops of the running figure for the PR's recording */
    for (let i = 0; i < 8; i++) {
      /* figureBox anchors on the body's centre; drop it to frame head to boots */
      const fb = await H.figureBox(P, { pad: 18 });
      const box = fb ? { x: fb.x, y: fb.y + Math.round(fb.height * 0.34), width: fb.width, height: Math.round(fb.height * 0.86) } : null;
      if (box) await P.page.screenshot({ path: `${DIR}/${r.dir}-${String(i).padStart(2, '0')}.png`, clip: box }).catch(() => {});
    }
    for (const k of r.keys) await P.page.keyboard.up(k);
    await P.page.waitForTimeout(300);
    const shares = (sheet && sheet.frames) || [];
    const lo = shares.length ? Math.min(...shares) : 0;
    const hi = shares.length ? Math.max(...shares) : 0;
    console.log(`    ${r.dir}: ${live.n} frames drawn in 3 s of running (${live.src}); its sheet: ${shares.length} frames, keyline share of the edge ${lo.toFixed(2)}-${hi.toFixed(2)}`);
    all.push({ dir: r.dir, live: live.n, src: live.src, frames: shares.length, lo, hi });
  }

  rec.ok('every run direction animates: several different tee frames drawn in 3 s (guard)',
    all.every((a) => a.live >= 3), all);
  /* v2.3.2747: at least the version that shipped this art, not exactly it --
     so the next gear bump, for any sheet, does not fail a test about the tee.
     A missed bump in this change still fails: the old value was 2.3.2174. */
  const bumped = (src) => {
    const m = /\.webp\?v=2\.3\.(\d+)$/.exec(src || '');
    return !!m && Number(m[1]) >= 2747;
  };
  rec.ok('...and the tee is drawn from the NEW art: the .webp the phone loads carries a gear version of v2.3.2747 or later',
    all.every((a) => bumped(a.src)), all.map((a) => a.src));
  rec.ok('on EVERY frame of every run sheet the tee\'s edge is keyline -- at least 85% of it (hem excluded)',
    all.every((a) => a.frames >= 20 && a.lo >= 0.85), all);
  rec.ok('...and it does not jump from frame to frame: within 12 points across each sheet',
    all.every((a) => a.hi - a.lo <= 0.12), all);
}
