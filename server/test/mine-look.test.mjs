/* ═══ v2.3.3696: THE MINER'S PICKAXE IS NOT SEE-THROUGH, AND HIS PRINT STAYS PUT ═══
 *
 * The owner, 2026-10-28: "I think the pickaxe during mining is transparent for
 * some reason", and "the shirt while mining still moves around a lot. It
 * would be better to have it move less".
 *
 * 1. THE LOOPS (tools/art/clear-mine-fringe.py).  public/sprites/player/
 *    mine-south.png was cut off its picture's background by colour; two pieces
 *    of that background are enclosed by the figure (beside the head when the
 *    pick is up, and between the legs) and kept their edges round a cut-out
 *    middle: a ring of light grey, (150, 158, 172), and between it and the
 *    outline a pale edge of near-white -- a hollow loop beside his head that
 *    read as a see-through pickaxe blade, and with the ring gone a dotted line.
 *    The tool rebuilds the sheet from it as it was cut
 *    (assets/skill-anim-src/mine-south.as-cut.png):
 *      1a the tool's own check finds the shipped sheet is what it makes;
 *      1b every ring pixel (that grey, joined to a hole the frame's edge
 *         cannot reach) and every pale pixel within two of the ring is
 *         see-through in the shipped sheet -- asked here in node, apart from
 *         the tool;
 *      1c ...and nothing else changed: every pixel that differs from the
 *         sheet as cut is one of those; the eyes' whites, which share the
 *         ring's grey, are still there on the frames that face you, frame 4,
 *         where the pick strikes between his legs, keeps its blade's grey, and
 *         the pickaxe's handle keeps every pixel of its wood;
 *      1d phones fetch the new sheet: the player sprites' VERSION is 102 or
 *         later, and the stale .webp twin is gone (CI mints a fresh one from
 *         the new sheet: any twin but the stale one's bytes passes).
 * 2. THE PRINT (playerDecal.js torsoAnchors, gearSheets.js STABLE_PRINT_POSES).
 *    The print and the pattern were placed by each frame's own chest box (its
 *    widest upper row, its top and bottom), and the mining swing raises the
 *    sleeve with the pickaxe: on the tee's mining strip the print's middle
 *    moved 4.6 px against the hem and its size by 7 x 6 px.  Anchored on the hem
 *    and the torso's middle, with one height for the strip:
 *      2a the old placement's middle moved against the hem and its size
 *         changed through the swing (what the owner saw), the new one's
 *         middle not at all, at one size;
 *      2b across, the new middle follows the torso (the body sways ~4 px);
 *      2c the mining pose is one that is anchored, the walking ones are not.
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

const root = new URL('../../', import.meta.url);
const { decode } = await import('../../tools/gear/lib/png.mjs');
const FW = 128;
const KEY = [150, 158, 172], TOL = 24;

/* ── 1. the loops ── */
{
  const r = spawnSync('python3', [new URL('tools/art/clear-mine-fringe.py', root).pathname, '--check'], { encoding: 'utf8' });
  /* no python3, or none with Pillow and numpy (a CI runner's own): the sheet
     is checked below in node, apart from the tool */
  if (r.error && r.error.code === 'ENOENT') console.log('SKIP 1a: no python3 here (the sheet is checked below in node)');
  else if (/No module named|ModuleNotFoundError|ImportError/.test(r.stderr || '')) console.log('SKIP 1a: python3 here has no Pillow or numpy (the sheet is checked below in node)');
  else check('1a the tool\'s check finds the shipped sheet is what it makes: "0 px differ"', r.status === 0 && /^0 px differ/m.test(r.stdout || ''), (r.stdout || r.stderr || '').slice(-300));

  const C = decode(readFileSync(new URL('assets/skill-anim-src/mine-south.as-cut.png', root)));
  const B = decode(readFileSync(new URL('public/sprites/player/mine-south.png', root)));
  const frames = Math.floor(B.width / FW);
  const pxOf = (S) => (f, x, y) => { const i = (y * S.width + f * FW + x) * 4; return [S.data[i], S.data[i + 1], S.data[i + 2], S.data[i + 3]]; };
  const cut = pxOf(C), px = pxOf(B);
  const isKey = (p) => p[3] > 0 && Math.abs(p[0] - KEY[0]) + Math.abs(p[1] - KEY[1]) + Math.abs(p[2] - KEY[2]) <= TOL;
  /* the tool's pale: near-neutral and lighter than the outline */
  const isPale = (p) => { const hi = Math.max(p[0], p[1], p[2]), lo = Math.min(p[0], p[1], p[2]); return p[3] > 0 && hi - lo <= 0.12 * Math.max(1, hi) && p[0] + p[1] + p[2] > 95 * 3; };
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const N8 = [...N4, [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const keyAt = (f, x0, x1, y0, y1) => { let n = 0; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (isKey(px(f, x, y))) n++; return n; };
  let notGone = 0, otherChanged = 0, ringN = 0, edgeN = 0, woodChanged = 0;
  const firstBad = [];
  for (let f = 0; f < frames; f++) {
    /* the see-through pixels of the sheet as cut that its edge cannot reach (4-connected) */
    const reach = new Uint8Array(FW * FW);
    const q = [];
    const see = (x, y) => cut(f, x, y)[3] === 0;
    for (let i = 0; i < FW; i++) {
      for (const [x, y] of [[i, 0], [i, FW - 1], [0, i], [FW - 1, i]]) if (see(x, y) && !reach[y * FW + x]) { reach[y * FW + x] = 1; q.push(x, y); }
    }
    while (q.length) {
      const y = q.pop(), x = q.pop();
      for (const [dx, dy] of N4) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= FW || ny >= FW || reach[ny * FW + nx] || !see(nx, ny)) continue;
        reach[ny * FW + nx] = 1; q.push(nx, ny);
      }
    }
    /* the ring: that grey 8-connected to such a hole */
    const ring = new Uint8Array(FW * FW);
    const rq = [];
    for (let y = 0; y < FW; y++) {
      for (let x = 0; x < FW; x++) {
        if (!see(x, y) || reach[y * FW + x]) continue;
        for (const [dx, dy] of N8) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < FW && ny < FW && !ring[ny * FW + nx] && isKey(cut(f, nx, ny))) { ring[ny * FW + nx] = 1; rq.push(nx, ny); }
        }
      }
    }
    while (rq.length) {
      const y = rq.pop(), x = rq.pop();
      for (const [dx, dy] of N8) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < FW && ny < FW && !ring[ny * FW + nx] && isKey(cut(f, nx, ny))) { ring[ny * FW + nx] = 1; rq.push(nx, ny); }
      }
    }
    /* the pale edge: pale pixels within two steps of the ring (8-connected) */
    const edge = new Uint8Array(FW * FW);
    let front = [];
    for (let i = 0; i < FW * FW; i++) if (ring[i]) front.push(i);
    for (let d = 0; d < 2; d++) {
      const nxt = [];
      for (const i of front) {
        const x = i % FW, y = (i / FW) | 0;
        for (const [dx, dy] of N8) {
          const nx = x + dx, ny = y + dy, j = ny * FW + nx;
          if (nx < 0 || ny < 0 || nx >= FW || ny >= FW || ring[j] || edge[j] || !isPale(cut(f, nx, ny))) continue;
          edge[j] = 1; nxt.push(j);
        }
      }
      front = nxt;
    }
    for (let y = 0; y < FW; y++) {
      for (let x = 0; x < FW; x++) {
        const i = y * FW + x, a = cut(f, x, y), b = px(f, x, y);
        const taken = ring[i] || edge[i];
        if (ring[i]) ringN++; else if (edge[i]) edgeN++;
        if (taken && b[3] !== 0) { notGone++; if (firstBad.length < 4) firstBad.push({ f, x, y, was: a, now: b }); }
        const changed = a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2] || a[3] !== b[3];
        if (!taken && changed) { otherChanged++; if (firstBad.length < 4) firstBad.push({ f, x, y, was: a, now: b, other: true }); }
        /* the handle's wood: strongly coloured, warm (the skin's hue family) */
        if (changed && a[3] > 0 && a[0] - a[2] > 60 && a[0] > 100) woodChanged++;
      }
    }
  }
  check(`1b every ring pixel (${ringN}) and every pale edge pixel within two of it (${edgeN}) is see-through in all ${frames} frames`,
    frames === 14 && ringN > 1000 && edgeN > 200 && notGone === 0, { frames, ringN, edgeN, notGone, firstBad });
  /* the eyes (rows 25-36 of the faces that look at you, frames 8-12) and the
     blade going into the rock between the legs on frame 4 (rows 85-103) */
  const eyes = [8, 9, 10, 11, 12].map((f) => keyAt(f, 60, 100, 25, 36));
  const blade = keyAt(4, 62, 82, 85, 103);
  check(`1c ...and nothing else changed (${otherChanged} px): the eyes' whites are still there (${eyes.join(', ')} px on frames 8-12), frame 4 keeps its blade (${blade} px) and the handle every pixel of its wood (${woodChanged} changed)`,
    otherChanged === 0 && woodChanged === 0 && eyes.every((n) => n >= 4) && blade >= 30, { otherChanged, woodChanged, eyes, blade, firstBad });
  const ps = readFileSync(new URL('src/rendering/playerSprites.js', root), 'utf8');
  const v = Number((ps.match(/const VERSION = (\d+);/) || [])[1]);
  /* v2.3.3710: "gone" meant "no twin at all", and CI's optimize-assets.yml
     then minted a fresh, lossless twin from the new sheet -- as it is meant
     to -- and this check failed on the merge train.  The stale twin is the one
     whose bytes these are; any other is the bot's copy of the new sheet. */
  const twin = new URL('public/sprites/player/mine-south.webp', root);
  const STALE_TWIN = '59c640ffa49eab70a73c13118d78a7ce81619faca66e956a64ac8093df4fb0db';
  const twinHash = existsSync(twin) ? createHash('sha256').update(readFileSync(twin)).digest('hex') : null;
  check(`1d phones fetch the new sheet (VERSION ${v}) and the stale .webp twin is gone (${twinHash ? 'the bot\'s fresh twin' : 'no twin'})`,
    v >= 102 && twinHash !== STALE_TWIN, { v, twinHash });
}

/* ── 2. the print ── */
{
  const { torsoAnchors, chestBox } = await import('../../src/rendering/playerDecal.js');
  const T = decode(readFileSync(new URL('public/sprites/gear/shirt/tshirt/mine-south.png', root)));
  const frames = Math.floor(T.width / FW);
  const on = (p) => T.data[p * 4 + 3] > 40;   /* composeShirt's garment mask */
  const A = torsoAnchors(on, T.width, T.height, FW);
  const CHEST_Y = 0.547;   /* playerDecal.js: the print's middle, a share down the chest box */
  const FILL_W = 0.72, FILL_H = 0.76;   /* playerDecal.js: the print's share of the chest box */
  const oldOff = [], newOff = [], newX = [], oldW = [], oldH = [];
  for (let f = 0; f < frames; f++) {
    const b = chestBox(T.data, T.width, T.height, f * FW, FW);
    const a = A && A.frames[f];
    if (!b || !a) continue;
    oldOff.push(+(b.top + (b.bot - b.top + 1) * CHEST_Y - b.bot).toFixed(1));
    oldW.push(Math.round((b.x1 - b.x0 + 1) * FILL_W));
    oldH.push(Math.round((b.bot - b.top + 1) * FILL_H));
    newOff.push(+(a.bot + 1 - A.bh * (1 - CHEST_Y) - a.bot).toFixed(1));
    newX.push(+a.cx.toFixed(1));
  }
  const span = (v) => +(Math.max(...v) - Math.min(...v)).toFixed(1);
  check(`2a placed by each frame's chest box the print's middle moved ${span(oldOff)} px against the hem and its size ${span(oldW)} x ${span(oldH)} px through the swing; anchored, the middle ${span(newOff)} px and one size`,
    oldOff.length === frames && span(oldOff) >= 4 && (span(oldW) >= 4 || span(oldH) >= 4) && span(newOff) === 0, { oldOff, oldW, oldH, newOff });
  /* the body under the tee sways about 4 px across through the swing itself
     (its own middle 71.0-75.2 on this sheet): the print follows the torso */
  check(`2b ...and across, it follows the torso's middle (${span(newX)} px of sway through the swing, no more than 4)`, newX.length === frames && span(newX) <= 4, newX);
  const gs = readFileSync(new URL('src/rendering/gearSheets.js', root), 'utf8');
  const m = gs.match(/const STABLE_PRINT_POSES = new Set\(\[([^\]]*)\]\)/);
  const poses = m ? m[1].split(',').map((s) => s.trim().replace(/'/g, '')).filter(Boolean) : null;
  check(`2c the mining pose is anchored, the walking and standing ones are not (${poses && poses.join(', ')})`,
    !!poses && poses.includes('mine') && !poses.includes('stand') && !poses.includes('jog')
      && /composeShirt\(img, fh, STABLE_PRINT_POSES\.has\(pose\)/.test(gs), poses);
}

console.log(`\n${passed + failed} checks, ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
