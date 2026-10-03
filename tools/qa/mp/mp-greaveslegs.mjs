/* ═══ UNDER GREAVES ALONE, NO PLAIN LEGS (v2.3.3010) ═══
 *
 * Owner, 2026-10-03: "While wearing copper greaves the legs underneath near
 * the shoes poke out during east jog. You can just remove the plain clothes
 * legs beneath."
 *
 * Greaves without the plate are PARTIAL wear, and the masked-body bake kept a
 * row of the body whole wherever the gear wrapped less than 85% of it
 * (v2.3.684).  On the east jog the greave art is narrower than the body's
 * legs behind the knee and by the feet, so the olive trousers and the dark
 * shoe came back beside the metal.  maskedBake.js _legsOnlyClamp now keeps,
 * under greaves alone, only the plates' own silhouette and the arms below
 * the greaves' top.
 *
 * This reads the bake itself, frame by frame (window.__btLegsPeek bakes the
 * player's own frames afresh with the clamp on and off), on a real client:
 *   1. copper greaves on, nothing on the chest (guard);
 *   2. east jog, the owner's case: below the waist band and the greaves'
 *      top nothing of the body is left outside the greaves -- with the clamp
 *      off it is hundreds of pixels a frame, which is what the owner saw (the
 *      waistband above the plates stays: taken out, the greaves would hang
 *      apart from the body);
 *   3. ...and the hands hanging there are all still drawn, frame by frame;
 *   4. every other jog facing and every standing facing: no more left over
 *      than with the clamp off, and the arms the same;
 *   5. with the plate on as well nothing changes (the clamp is greaves-alone).
 *
 * A picture lands in tools/qa/mp/out/greaveslegs-east.png.
 */
import * as H from './harness.mjs';
import { join } from 'node:path';

const sum = (a) => a.reduce((s, v) => s + v, 0);
/* every frame keeps its hands: at most a fleck (6 px, or a tenth) of the
   skin below the greaves' top may go -- the colour tests at a hand's edge
   disagree by a pixel or two; a lost hand is a hundred */
const handsKept = (r) => r.armOn.length === r.armOff.length && r.armOn.every((v, i) => v >= r.armOff[i] - Math.max(6, 0.1 * r.armOff[i]));
const DIRS = ['east', 'south', 'north', 'northeast', 'southwest'];

const setGear = (P, chest, legs) => P.page.evaluate(({ c, l }) => {
  if (!window.__btSetGear) return 'missing';
  window.__btSetGear('chest', c);
  window.__btSetGear('legs', l);
  return 'ok';
}, { c: chest, l: legs });

/* the probe answers only once every frame's body and gear sheets are in */
async function peek(P, pose, dir) {
  let r = null;
  for (let i = 0; i < 40; i++) {
    r = await P.page.evaluate(({ pose, dir }) => (window.__btLegsPeek ? window.__btLegsPeek(pose, dir, true) : null), { pose, dir });
    if (r && r.frames === r.want) return r;
    await P.page.waitForTimeout(500);
  }
  return r;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Greaves', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);

  /* ── 1. greaves alone ── */
  const set = await setGear(P, 'none', 'coppergreaves');
  await P.page.waitForTimeout(1500);
  const worn = await P.page.evaluate(() => ({
    probe: typeof window.__btLegsPeek === 'function',
    legs: window.__btGetGear ? window.__btGetGear('legs') : null,
    chest: window.__btGetGear ? window.__btGetGear('chest') : null,
  }));
  rec.ok('copper greaves on, nothing on the chest, and the bake probe there (guard)',
    set === 'ok' && worn.probe && (worn.legs == null || worn.legs === 'coppergreaves') && (worn.chest == null || worn.chest === 'none'), { set, worn });

  /* ── 2-3. the owner's case: the east jog ── */
  const east = await peek(P, 'jog', 'east');
  const on = east ? sum(east.on) : -1, off = east ? sum(east.off) : -1;
  const worstOn = east ? Math.max(...east.on) : -1;
  rec.ok(`east jog, greaves alone: beneath the greaves nothing of the plain legs is left outside them (${on} px over ${east && east.frames} frames, the worst ${worstOn}; ${off} px as it was)`,
    !!east && east.frames === east.want && east.frames >= 20 && off > 1000 && on <= Math.max(20, off * 0.01) && worstOn <= 8, east && { on: east.on, off: east.off, seen: east.seen });
  const armOn = east ? sum(east.armOn) : -1, armOff = east ? sum(east.armOff) : -1;
  rec.ok(`...and the hands hanging there are all still drawn, frame by frame (${armOn} skin px below the greaves' top, ${armOff} as it was)`,
    !!east && armOff > 0 && handsKept(east), east && { armOn: east.armOn, armOff: east.armOff });

  /* a look, from the game itself: running east in greaves alone */
  await P.page.evaluate(() => { const S = window._gameState.current; S._facingAngle = 0; });
  await P.page.keyboard.down('d');
  await P.page.waitForTimeout(900);
  await P.page.screenshot({ path: join(H.REPO, 'tools/qa/mp/out/greaveslegs-east.png') }).catch(() => {});
  await P.page.keyboard.up('d');
  await P.page.waitForTimeout(400);

  /* ── 4. the other facings, jog and stand: never worse, arms kept ── */
  const rows = [];
  for (const pose of ['jog', 'stand']) {
    for (const dir of DIRS) {
      if (pose === 'jog' && dir === 'east') continue;
      const r = await peek(P, pose, dir);
      rows.push({ pose, dir, frames: r && r.frames, want: r && r.want, on: r ? sum(r.on) : -1, off: r ? sum(r.off) : -1,
        armOn: r ? sum(r.armOn) : -1, armOff: r ? sum(r.armOff) : -1, hands: !!r && handsKept(r) });
    }
  }
  const bad = rows.filter((r) => !(r.frames === r.want && r.frames > 0 && r.on <= r.off && r.hands));
  rec.ok(`every other facing, running and standing, keeps no more of the plain legs than before and every arm (${rows.map((r) => `${r.pose}-${r.dir} ${r.off}->${r.on}`).join(', ')})`,
    rows.length === 9 && bad.length === 0, { bad, rows });

  /* ── 5. the full set is untouched ── */
  await setGear(P, 'copperplate', 'coppergreaves');
  await P.page.waitForTimeout(1200);
  const full = [];
  for (const dir of ['south', 'northeast']) {
    const r = await peek(P, 'stand', dir);
    full.push({ dir, same: !!r && r.frames === r.want && r.on.every((v, i) => v === r.off[i]) && r.armOn.every((v, i) => v === r.armOff[i]) });
  }
  rec.ok('with the plate on as well, the bake is exactly as it was (the clamp is for greaves alone)',
    full.every((f) => f.same), full);

  const errs = P.logs.filter((l) => /pageerror/.test(l));
  rec.ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
  await P.ctx.close().catch(() => {});
}
