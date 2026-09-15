/* DOES THE CHAIN BELT COVER THE PLATE-TO-GREAVES SEAM? (v2.3.2508)
 *
 * Owner (backlog triage 2026-09-14, art item 6): "SE jog, armored legs: gap
 * between the legs and the torso on a frame or few."
 *
 * The seam between the chest plate's hem and the greaves' waist is covered by a
 * chain belt drawn as its own gear layer (belt/chainbelt/jog-<dir>.png,
 * tools/gen_jog_belt_table.py).  The band's HEIGHT is one number per DIRECTION
 * -- the median plate-bottom to greaves-top distance, plus a margin -- and a
 * median cannot cover the frames whose seam is wider than it.  That is the
 * "a frame or few" shape of the report.
 *
 * SOUTHEAST IS NOT A SHEET.  It is jog-southwest drawn mirrored
 * (docs/specs/gear-layer-spec.md), so if southwest measures clean and southeast
 * does not, the belt art is innocent and the bug is in the mirror -- a very
 * different fix.  This measures the sheets, so it can only speak about the art;
 * a clean result here is what sends the next session to the renderer.
 *
 * Chromium because it is the only image decoder in this sandbox, and because
 * tools/gen_jog_belt_table.py cannot run here at all: it imports PIL, which is
 * not installed and cannot be (PyPI is firewalled -- CLAUDE.md).
 *
 *   node tools/qa/art/measure-belt-seam.mjs [--dirs=southwest,south,east,...]
 */
import { chromium } from 'playwright-core';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const DIRS = arg('dirs', 'southwest,south,east,northeast,north').split(',');

const pinned = process.env.BT_CHROMIUM || '/opt/pw-browsers/chromium';
const browser = await chromium.launch(existsSync(pinned) ? { executablePath: pinned } : {});
const page = await browser.newPage();
const u = (p) => `data:image/png;base64,${readFileSync(p).toString('base64')}`;

for (const dir of DIRS) {
  const P = {
    chest: `${REPO}/public/sprites/gear/chest/steelplate/jog-${dir}.png`,
    legs: `${REPO}/public/sprites/gear/legs/steelgreaves/jog-${dir}.png`,
    belt: `${REPO}/public/sprites/gear/belt/chainbelt/jog-${dir}.png`,
  };
  if (!existsSync(P.chest) || !existsSync(P.legs) || !existsSync(P.belt)) {
    console.log(`jog-${dir}: a sheet is missing (chest ${existsSync(P.chest)}, legs ${existsSync(P.legs)}, belt ${existsSync(P.belt)})`);
    continue;
  }
  const out = await page.evaluate(async (o) => {
    const load = async (url) => {
      const i = new Image();
      await new Promise((res, rej) => { i.onload = res; i.onerror = rej; i.src = url; });
      const c = document.createElement('canvas');
      c.width = i.width; c.height = i.height;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(i, 0, 0);
      return { w: c.width, h: c.height, d: g.getImageData(0, 0, c.width, c.height).data };
    };
    const C = await load(o.chest), L = await load(o.legs), B = await load(o.belt);
    const F = C.h, n = Math.round(C.w / F);
    /* The seam is measured DOWN THE MIDDLE of the figure, not across the whole
       frame: a swinging gauntlet is chest-layer art out at hip height and would
       report the plate reaching far lower than it does over the body. */
    const span = (S, f, y, x0, x1) => {
      let lo = -1, hi = -1;
      for (let x = x0; x < x1; x++) {
        if (S.d[((y * S.w) + (f % Math.round(S.w / F)) * F + x) * 4 + 3] > 20) { if (lo < 0) lo = x; hi = x; }
      }
      return [lo, hi];
    };
    const rows = [];
    for (let f = 0; f < n; f++) {
      /* the greaves' own horizontal centre, as the column window */
      let gl = F, gr = -1;
      for (let y = 0; y < F; y++) {
        const [a, b] = span(L, f, y, 0, F);
        if (a >= 0) { if (a < gl) gl = a; if (b > gr) gr = b; }
      }
      if (gr < 0) { rows.push({ f, error: 'no greaves' }); continue; }
      const cx = Math.round((gl + gr) / 2), half = Math.max(3, Math.round((gr - gl) * 0.18));
      const x0 = Math.max(0, cx - half), x1 = Math.min(F, cx + half);
      const lastRow = (S) => { let r = -1; for (let y = 0; y < F; y++) if (span(S, f, y, x0, x1)[0] >= 0) r = y; return r; };
      const firstRow = (S) => { for (let y = 0; y < F; y++) if (span(S, f, y, x0, x1)[0] >= 0) return y; return -1; };
      const plateBot = lastRow(C), greavesTop = firstRow(L);
      let beltTop = -1, beltBot = -1;
      for (let y = 0; y < F; y++) if (span(B, f, y, x0, x1)[0] >= 0) { if (beltTop < 0) beltTop = y; beltBot = y; }
      const seam = greavesTop - plateBot - 1;          /* uncovered rows between them */
      const covered = beltTop >= 0 && beltTop <= plateBot + 1 && beltBot >= greavesTop - 1;
      rows.push({ f, plateBot, greavesTop, seam, beltTop, beltBot, covered });
    }
    return { n, F, rows };
  }, { chest: u(P.chest), legs: u(P.legs), belt: u(P.belt) });

  const bad = out.rows.filter((r) => !r.error && !r.covered);
  const seams = out.rows.filter((r) => !r.error).map((r) => r.seam);
  const med = [...seams].sort((a, b) => a - b)[Math.floor(seams.length / 2)];
  console.log(`\njog-${dir}  (${out.n} frames, ${out.F}px)`);
  console.log(`  seam between the plate's hem and the greaves' top: median ${med}px, max ${Math.max(...seams)}px`);
  console.log(`  frames the belt does NOT span: ${bad.length}/${out.n}`
    + (bad.length ? '  ' + bad.slice(0, 10).map((r) => `f${r.f}(seam ${r.seam}, belt ${r.beltTop}..${r.beltBot}, needs ${r.plateBot + 1}..${r.greavesTop - 1})`).join('  ') : ''));
}
await browser.close();
