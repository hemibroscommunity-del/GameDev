/* ═══ v2.3.1960: THE WIDTH RULE, MEASURED ON A RENDERED HEAD ═══
 *
 * Owner, the rule this pins (shipped v2.3.1957 with no test):
 *
 *     "For the hair mask it's best to clip the width of the hair and any hair
 *     above it based on the width equal to and above the hat item.  Other
 *     headwear (like bandana, other open top headwear, etc) would be the
 *     exceptions to that rule."
 *
 * tools/dev/check-hairmask-rule.mjs pins the PNGs.  This pins what a player
 * actually sees, which is a different fact: the mask is only half of it — the
 * renderer has to load it, honour `clipsHair`, and place it over the hat with
 * the hat's own meta.  A mask that is a perfect statement of the rule and is
 * never applied passes every pixel check in that file and looks exactly like
 * no rule at all.  So this drives the REAL compositor
 * (drawCharacterPortrait's destination-in pass, src/rendering/
 * characterPortrait.js) in a REAL browser and measures the head that comes
 * out.
 *
 * WHY IT LIVES HERE AND NOT IN tools/qa/mp/.  The mp scenarios share one
 * worker and one static server over dist/, and both of those are the wrong
 * shape for this: there is no server-side fact here to prove, and a built
 * bundle has no module URL to import — `import('/rendering/characterPortrait
 * .js')` only resolves against a vite dev server rooted at src/.  So this
 * harness brings its own vite and its own browser and needs neither a player
 * nor a worker; tools/qa/run-all.mjs picks it up like any other qa-*.mjs.
 *
 * HOW THE HAIR IS FOUND.  Hair is recoloured to a target RGB by
 * recolorHairToCanvas, so the hair pixels are a brightness family around
 * hairColorTarget('blue') — nothing else on the head is blue, which makes
 * "b beats both r and g" a clean classifier.  hairColorTarget takes a CATALOG
 * ID and returns the triple; drawCharacterPortrait takes the TRIPLE.  Passing
 * the id renders the art's own colour instead and every count below silently
 * becomes zero, so the bald-head guard is asserted first.
 *
 *   node tools/qa/qa-hairmask-look.mjs
 *
 * Needs: npm install (vite + playwright-core) and a chromium at
 * /opt/pw-browsers/chromium, or QA_CHROME=<path>.
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EXE = process.env.QA_CHROME
  || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

let failures = 0;
const check = (name, cond, detail) => {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name + (cond ? '' : '\n      ' + JSON.stringify(detail)));
  if (!cond) failures++;
};

const freePort = () => new Promise((r) => {
  const s = net.createServer();
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); });
});

const PORT = await freePort();
/* v2.3.2018: DETACHED, so the whole group can be killed.  `npx` FORKS vite
   rather than exec'ing it, so `vite.kill()` reaps the npx wrapper and leaves
   the real dev server orphaned — measured, a 23-minute-old vite was still
   holding a port and burning CPU long after this tool printed its summary and
   exited 0.  Two of those plus a hung probe were running at once, which is a
   fine way to make an unrelated QA scenario flake and then spend an hour
   blaming the scenario.  Detached puts vite in its own process GROUP; the
   negative pid below kills the group. */
const vite = spawn('npx', ['vite', '--port', String(PORT), '--host', '127.0.0.1', '--no-open'],
  { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
const killVite = () => { try { process.kill(-vite.pid, 'SIGKILL'); } catch { try { killVite(); } catch { /* already gone */ } } };
/* and it runs on the ways out that are NOT the happy path, too. */
process.on('exit', killVite);
process.on('SIGINT', () => { killVite(); process.exit(130); });
process.on('uncaughtException', (e) => { killVite(); console.log('FAIL  uncaught: ' + (e && e.message)); process.exit(1); });
let viteLog = '';
vite.stdout.on('data', (d) => { viteLog += d; });
vite.stderr.on('data', (d) => { viteLog += d; });
const BASE = `http://127.0.0.1:${PORT}`;
let up = false;
for (let i = 0; i < 80 && !up; i++) {
  try { up = (await fetch(BASE + '/index.html')).ok; } catch { /* still booting */ }
  if (!up) await new Promise((r) => setTimeout(r, 500));
}
if (!up) { console.log('FAIL  vite dev server never came up\n' + viteLog.slice(-800)); killVite(); process.exit(1); }

const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('  PAGEERROR', e.message.slice(0, 160)));
/* A blank document on vite's own origin: bare enough that nothing else runs,
   same origin so a module specifier still resolves through the dev server. */
await page.route('**/__hairmask.html', (r) => r.fulfill({
  status: 200, contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><title>hairmask probe</title>',
}));
await page.goto(BASE + '/__hairmask.html');

/* Hats chosen for what they have to prove, not for coverage:
     closed  — the shape the rule is aimed at, a cap the hair must sit under.
     openTop — the "exceptions" clause, where the outermost pixels are points
               and the hair between them has to survive. */
/* v2.3.1976: devil-horns moved OPEN_TOP -> CLOSED.  Owner: "For devil horns I
   would actually rather it clip, I don't think it has a hole on the top."  He
   is right about his own art and it is worth writing down why the first guess
   was wrong: the horns spread wide and read like a crown's spikes, but the
   piece between them is a solid red skull-cap, not a gap.  Rendered both ways
   to check — clipped, the cap covers the crown and the hair shows at the
   sides, with no bald patch anywhere, which is the whole worry with a
   band-shaped hat.
   Note the generator REFUSES to switch clipsHair on for this shape ("787px of
   bare scalp ... this is a band, not a cap").  That refusal is the v2.3.1974
   span-scoped over-count — a wide horn span sweeps in cheeks and temples that
   the hat is standing in front of — and it is harmless here because
   devil-horns already had clipsHair on.  It is left as-is rather than re-aimed
   a day before a demo; see the two-metric note in check-hairmask-rule.mjs.
   v2.3.1976: the first cut of this left 81px of hair standing between the
   horns, because the default closed rule keeps a column the hat has reached at
   any row ABOVE — right for a cowboy crown, wrong for horns, where the gap is
   sky but the scalp under it is under the cap.  The owner said so plainly
   ("There should be no hair between the horns.  I understand it to be a fully
   enclosed hat"), and `enclosed` in the hat's meta now says it too: 81px -> 1px.
   mickey-ears followed for the same reason and on the same evidence — owner:
   "Mickey ears and devil horns are still wrong.  Hair from Afro is on the
   sides."  Ears on a solid cap, not spikes on a band.
   AND THE OTHER HALF OF THAT NOTE, which I first read backwards: "be more
   conservative on clipping when the hair is equal to or beneath the lowest
   outline of the hat -- I see a floating detached Afro hair beneath the hat"
   means clip MORE, not keep more.  Opening part 2 per column (keeping more)
   made it worse and had to be reverted; for an enclosed hat part 2 is now
   BOUNDED to the hat's own span instead of the full frame.  The owner's eye on
   the render is the acceptance test here: a tighter footprint bound was tried
   after that and he said "the image looks correct, I don't think you should
   change it". */
const CLOSED = ['beanie', 'top-hat', 'red-cap', 'devil-horns', 'mickey-ears'];
const OPEN_TOP = ['crown', 'evil-crown'];

const M = await page.evaluate(async ({ closed, openTop }) => {
  const cp = await import('/rendering/characterPortrait.js');
  const hc = await import('/rendering/traits/hairColorCatalog.js');
  const TARGET = hc.hairColorTarget('blue');
  const F = 256;
  const draw = async (o) => {
    const cv = document.createElement('canvas'); cv.width = F; cv.height = F;
    await cp.drawCharacterPortrait(cv, Object.assign(
      { dir: 'south', skin: 'tan', facialHair: 'none', shirt: 'none', hairColor: TARGET }, o));
    return cv.getContext('2d').getImageData(0, 0, F, F).data;
  };
  const hairPx = (d) => {
    const s = new Uint8Array(F * F);
    for (let i = 0; i < F * F; i++) {
      const a = d[i * 4 + 3], r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
      if (a > 128 && b - Math.max(r, g) >= 25) s[i] = 1;
    }
    return s;
  };
  const count = (s) => { let n = 0; for (let i = 0; i < s.length; i++) n += s[i]; return n; };

  const out = { target: TARGET, hats: {} };
  const bald = await draw({ hair: 'none', headwear: 'none' });
  out.baldFalsePositives = count(hairPx(bald));
  const bare = hairPx(await draw({ hair: 'afro', headwear: 'none' }));
  out.bareTotal = count(bare);

  for (const H of [...closed, ...openTop]) {
    /* The hat's own silhouette: every pixel a BALD head renders differently
       with the hat on.  Deliberately a DIFF and not "opaque in the hatted
       render and not in the bald one" — that was the first version and it is
       wrong, because a brim sitting over the skull is opaque in both, so the
       whole part of the hat that covers the head dropped out of the silhouette
       and got counted as a hole.  Bald so that nothing the mask does can move
       it; bandFit only regrows band-type hats and none of these are bands, so
       the placement is the same with hair on. */
    const hatted0 = await draw({ hair: 'none', headwear: H });
    const hat = new Uint8Array(F * F);
    for (let i = 0; i < F * F; i++) {
      for (let k = 0; k < 4; k++) if (hatted0[i * 4 + k] !== bald[i * 4 + k]) { hat[i] = 1; break; }
    }
    let hTop = -1, hBot = -1, hLeft = F, hRight = -1;
    for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) if (hat[y * F + x]) {
      if (hTop < 0) hTop = y; hBot = y;
      if (x < hLeft) hLeft = x; if (x > hRight) hRight = x;
    }
    const worn = hairPx(await draw({ hair: 'afro', headwear: H }));
    /* Everything below is scoped to rows AT OR ABOVE the hat's lowest pixel.
       Below that line part 2 of the rule opens the mask to full width on
       purpose, so an unscoped measurement is dominated by hair the rule never
       touches and would move for neither a revert nor a shave.
       The last few rows of the silhouette are dropped with it: the hat art is
       128px drawn into a 256 frame, so its bottom edge arrives soft, and the
       rendered silhouette runs 2-3 rows past the last row the 128px mask calls
       "hat" — rows where part 2 has already opened to full width.  Without the
       margin the red cap's band reaches into them and reads as a 6px-wide
       overhang that is really the hair under the brim. */
    /* v2.3.1977: 4 -> 6.  The margin exists because the 128px mask is drawn
       into a 256 frame, so the RENDERED hat silhouette runs a few rows past the
       last row the mask calls "hat" — and this assertion must not read those
       rows, where part 2 has legitimately opened to full width, as hair
       ballooning beside the cap.  v2.3.1977 moved the mask's own boundary UP
       onto the hat's solid outline (off the stray pixels below it), which
       widens that discrepancy by exactly the length of the speck tail: 1 row on
       most hats, 4-5 on devil-horns' turned facings.  red-cap failed at 4 with
       hair 92..162 against a hat 97..155 — entirely in those bottom rows.
       Raising the margin keeps the guard pointed at what it is for (hair above
       the hat) rather than at the boundary the owner asked to move. */
    const EDGE = 6;
    let bareAbove = 0, wornAbove = 0, wl = F, wr = -1, gapAvail = 0, gapKept = 0;
    for (let y = 0; y <= hBot - EDGE; y++) {
      let rl = -1, rr = -1;
      for (let x = 0; x < F; x++) if (hat[y * F + x]) { if (rl < 0) rl = x; rr = x; }
      for (let x = 0; x < F; x++) {
        const i = y * F + x;
        /* a hole in the hat's own outline: inside its leftmost and rightmost
           pixel on this row, with no hat on it — between a crown's spikes,
           between the horns, between the mouse ears and the cap */
        const inGap = rr >= 0 && x > rl && x < rr && !hat[i];
        if (bare[i]) { bareAbove++; if (inGap) gapAvail++; }
        if (worn[i]) {
          wornAbove++;
          if (x < wl) wl = x; if (x > wr) wr = x;
          if (inGap) gapKept++;
        }
      }
    }
    out.hats[H] = { hatSpan: [hLeft, hRight], hatBot: hBot, bareAbove, wornAbove, wornSpan: [wl, wr], gapAvail, gapKept };
  }
  return out;
}, { closed: CLOSED, openTop: OPEN_TOP });

if (process.env.QA_DUMP) console.log(JSON.stringify(M, null, 1));

/* ── guards: without these every measurement below is vacuously true ── */
check('hairColorTarget(\'blue\') gave a real RGB triple, so the hair is recoloured and findable',
  Array.isArray(M.target) && M.target.length === 3, M.target);
check('a bald head has no "hair" pixels — the colour classifier is not counting eyes or skin',
  M.baldFalsePositives === 0, { falsePositives: M.baldFalsePositives });
check('the un-hatted afro is a big target to measure against (guard: no hair, no test)',
  M.bareTotal > 1500, { bareTotal: M.bareTotal });

/* ── part 1: at and above the hat, the hair is no wider than the hat ── */
for (const H of [...CLOSED, ...OPEN_TOP]) {
  const h = M.hats[H];
  /* 2px of slack, and only that.  Every hat here measures 0-3px INSIDE its own
     span at v2.3.1957 (beanie hair 100..152 in a hat 98..152; top hat 92..162
     in 89..165; red cap 100..155 in 97..155), so the slack is headroom for the
     soft edge of a 128px sheet drawn into a 256 frame, not something the art
     is using.  It is also the assertion that fails if the mask stops being
     APPLIED rather than being wrong: flipping beanie's clipsHair off puts the
     hair straight back out to the afro's own 92..162. */
  check(`${H}: at and above the hat, the hair stays inside the hat's own width`,
    h.wornSpan[0] >= h.hatSpan[0] - 2 && h.wornSpan[1] <= h.hatSpan[1] + 2,
    { hair: h.wornSpan, hat: h.hatSpan });
}
/* The same fact stated as an area, because a span is two pixels and an
   unapplied mask should be visible in the bulk as well.  Measured at
   v2.3.1957: beanie keeps 11% of the hair above its own brim, top hat 6.7%,
   red cap 7.7% — and the same beanie with clipsHair off keeps 37%, which is
   where the floor comes from. */
for (const H of CLOSED) {
  const h = M.hats[H];
  check(`${H}: the afro is pressed DOWN, not left ballooning above the brim (${h.wornAbove} of ${h.bareAbove}px survive)`,
    h.wornAbove < h.bareAbove * 0.20, { worn: h.wornAbove, bare: h.bareAbove });
}

/* ── the exceptions, which the rule does not list ──────────────────────
 * An open-top hat's outermost pixels are its points, so the accumulated bound
 * is already wide by the time the scan reaches the skull, and the hair inside
 * the crown survives.  That survival lives in ONE place — the holes in the
 * hat's own outline — and it is exactly what the pre-v2.3.1957 rule took away,
 * because that rule kept only the columns the hat itself occupies and a hole
 * has no hat in it by definition.
 *
 * The quantity is a RATIO of the hair that is there to be kept — of the hair
 * the hatless render shows in those holes, how much still shows with the hat
 * on — not a raw pixel count and not a share of the whole head.  Under the
 * rule the answer is 1.00 by construction, because the accumulated run spans
 * the whole outline including its holes, and it measured exactly 156/156,
 * 216/216, 524/524 and 141/141 at v2.3.1957.  A bare count would drift with
 * the art; a share of the whole head is too blunt to fail, since reverting
 * part 1 still leaves devil-horns showing 14.5% and evil-crown 6.9% of the
 * hair above their brims and any threshold safe enough to keep would wave
 * that through.  This ratio takes the same revert to 3%, 16%, 37% and 56%
 * against a floor of 95%. */
for (const H of OPEN_TOP) {
  const h = M.hats[H];
  check(`${H}: there are real holes in this hat's outline with hair behind them (guard: no holes, nothing to lose)`,
    h.gapAvail >= 40, { gapAvail: h.gapAvail });
  const kept = h.gapAvail ? h.gapKept / h.gapAvail : 0;
  check(`${H}: the hair inside the hat's open top SURVIVES (${h.gapKept}/${h.gapAvail} = ${(kept * 100).toFixed(0)}% of the hair in its outline's holes)`,
    kept >= 0.95, { gapKept: h.gapKept, gapAvail: h.gapAvail, kept: +kept.toFixed(3) });
}
/* The negative half, without which "the holes keep their hair" would pass just
   as well on a mask that kept everything: a closed cap has no open top, so it
   has almost no hole to keep anything in, and must not be sprouting hair out
   of the middle of its own crown. */
for (const H of CLOSED.filter((h) => h !== 'beanie')) {
  const h = M.hats[H];
  const frac = h.bareAbove ? h.gapKept / h.bareAbove : 0;
  check(`${H}: a closed cap shows no hair through its own crown (${h.gapKept}px)`,
    frac < 0.02, { gapKept: h.gapKept, bareAbove: h.bareAbove });
}

await browser.close();
killVite();
console.log(failures ? `\n${failures} FAILED` : '\nhairmask-look: ALL PASS');
process.exit(failures ? 1 : 0);
