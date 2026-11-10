/* ═══ A MONSTER IN ANOTHER COLOUR IS ITS PALETTE IN ANOTHER COLOUR (v2.3.4470) ═══
 *
 * The whole-game sweep (mp-heldsweep, docs/specs/held-sweep.md) found the
 * colour variants of a monster (the blue slime of the Verdant Wilds, the moss
 * slime, the mire wisp) recoloured on the page as their look came in: each of
 * six sheets unpacked onto a canvas, read back, every pixel rewritten, 23 ms
 * a sheet.  They now come through the strip door as their own colour numbers,
 * read off the page's thread, with only their PALETTE retinted
 * (retintPalette.js, zoneTextures.js loadTrackedStripRetinted).
 *
 * A phone glides to the edge of the Verdant Wilds, where the blue slime's
 * look loads, two ways:
 *   - as it ships: every sheet of the colour came as numbers;
 *   - `?stripworker=0` (no reader): recoloured on a canvas, as before;
 * and the two looks are the same: the same sheets, as many frames, the same
 * solid pixels in the first frame of each, their mean colour within
 * MEAN_MAX levels -- and blue.
 *
 *   node tools/qa/mp/run.mjs recolour
 */
import * as H from './harness.mjs';

const PHONE = { width: 430, height: 932 };
const MEAN_MAX = 3;

async function look(browser, wsPort, webPort, rec, label, query) {
  const P = await H.newPlayer(browser, { name: 'rc' + label.length, wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 1, query });
  const stopAlive = H.keepAlive(P);
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'into the Wheel' }).then(() => true).catch(() => false);
    rec.ok(`${label}: in BroTown (guard)`, ok);
    if (!ok) return null;
    const G = await H.wheelGeom();
    const to = G.along('verdant', 1);
    await H.glideTo(P, to.x, to.y, { speed: 700, timeoutMs: 90000 });
    const got = await H.waitFor(P, () => (window.__btMonsterRecolor ? window.__btMonsterRecolor() : []),
      (v) => v.some((c) => Object.keys(c.states).length >= 5 && Object.values(c.states).every((s) => s.frames > 0)), { timeout: 40000, label: 'a colour variant\'s look' }).catch(() => null);
    return got || (await P.page.evaluate(() => (window.__btMonsterRecolor ? window.__btMonsterRecolor() : [])));
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  const now = await look(browser, wsPort, webPort, rec, 'as it ships', '');
  const old = await look(browser, wsPort, webPort, rec, 'on a canvas (?stripworker=0)', 'stripworker=0');
  if (!now || !old) return;
  const pick = (list) => list.find((c) => Object.keys(c.states).length >= 5) || null;
  const a = pick(now), b = pick(old);
  rec.ok(`both pages hold a colour variant's look at the edge of the Verdant Wilds (guard: ${a && a.key}, ${b && b.key})`, !!a && !!b && a.key === b.key, { now: now.map((c) => c.key), old: old.map((c) => c.key) });
  if (!a || !b) return;
  const sa = Object.entries(a.states), sb = b.states;
  console.log(`    as it ships: ${sa.map(([k, s]) => `${k} ${s.frames}f ${s.numbers ? 'numbers' : 'canvas'} ${s.solid}px ${JSON.stringify(s.mean)}`).join(' | ')}`);
  console.log(`    on a canvas: ${Object.entries(sb).map(([k, s]) => `${k} ${s.frames}f ${s.numbers ? 'numbers' : 'canvas'} ${s.solid}px ${JSON.stringify(s.mean)}`).join(' | ')}`);
  rec.ok(`as it ships: every sheet of the colour came as colour numbers, its palette retinted (${sa.filter(([, s]) => s.numbers).length} of ${sa.length})`, sa.length >= 5 && sa.every(([, s]) => s.numbers), a.states);
  rec.ok(`\`?stripworker=0\`: recoloured on a canvas, as before (${Object.values(sb).filter((s) => !s.numbers).length} of ${Object.keys(sb).length})`, Object.values(sb).every((s) => !s.numbers), sb);
  const bad = [];
  let worst = 0;
  for (const [k, s] of sa) {
    const o = sb[k];
    if (!o || o.frames !== s.frames || o.solid !== s.solid || !s.mean || !o.mean) { bad.push({ k, now: s, old: o }); continue; }
    const d = Math.max(Math.abs(s.mean[0] - o.mean[0]), Math.abs(s.mean[1] - o.mean[1]), Math.abs(s.mean[2] - o.mean[2]));
    if (d > worst) worst = d;
    if (d > MEAN_MAX) bad.push({ k, now: s, old: o });
  }
  rec.ok(`the two looks are the same: each sheet as many frames, the first frame the same solid pixels, its mean colour at most ${worst} levels apart (${MEAN_MAX} at most)`, bad.length === 0, bad.slice(0, 3));
  const blue = sa.filter(([, s]) => s.mean && s.mean[2] > s.mean[0] && s.mean[2] >= s.mean[1]);
  rec.ok(`...and the slime is blue (${blue.length} of ${sa.length} sheets lead with blue)`, blue.length === sa.length, a.states);
}
