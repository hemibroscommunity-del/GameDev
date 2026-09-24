/* PICTURES OF EVERY HAT, STANDING AND RUNNING SIDEWAYS (v2.3.2896)
 *
 * Owner: "some hats look squished when running east to west.  I didn't get
 * the scaled proportions very good on these.  Check each hat (this one is
 * army helmet)."
 *
 * A contact sheet, not a pass/fail: one row per hat, the head cropped from
 * the live client standing and mid-jog in both sideways directions, so the
 * size of the hat against the head can be compared by eye across the whole
 * catalog in one picture.  Asserts only that it could take the pictures.
 *
 *   node tools/qa/mp/run.mjs hatrun                      # every hat
 *   BT_HATS=army-helmet,top-hat node tools/qa/mp/run.mjs hatrun
 *
 * Writes tools/qa/mp/out/hatrun-<id>-<W|E><0|1|2>.png per hat (0 standing,
 * 1 and 2 mid-jog); `python3 tools/qa/hatrun_sheet.py <tag>` stacks them into
 * hatrun-sheet-<tag>-<n>.png, a dozen hats to a page.
 */
import * as H from './harness.mjs';
import { readdirSync, existsSync } from 'node:fs';

const HATS_DIR = `${H.REPO}/public/sprites/traits/headwear`;

async function headShot(P, path) {
  const b = await H.figureBox(P, { pad: 10 });
  if (!b) return false;
  /* the head is the top ~55% of the figure box */
  const clip = { x: b.x, y: b.y, width: b.width, height: Math.round(b.height * 0.6) };
  await P.page.screenshot({ path, clip });
  return true;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const want = (process.env.BT_HATS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const hats = want.length ? want
    : readdirSync(HATS_DIR).filter((d) => existsSync(`${HATS_DIR}/${d}/meta.json`)).sort();
  const P = await H.newPlayer(browser, { name: 'Hatrack', wsPort, webPort, dpr: 3 });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  await P.page.mouse.click(500, 400).catch(() => {});
  const can = await P.page.evaluate(() => typeof window.__btSetHeadwear === 'function');
  rec.ok('the test can put a hat on (guard)', can);
  if (!can) return;

  let shots = 0;
  for (const id of hats) {
    await P.page.evaluate((h) => window.__btSetHeadwear(h), id);
    await H.hopTo(P, 1190, 1400);
    await P.page.waitForTimeout(900);            /* the hat's art loads */
    const run = async (key, tag) => {
      await P.page.keyboard.down(key);
      await P.page.waitForTimeout(380);
      if (await headShot(P, `${H.REPO}/tools/qa/mp/out/hatrun-${id}-${tag}1.png`)) shots++;
      await P.page.waitForTimeout(170);
      if (await headShot(P, `${H.REPO}/tools/qa/mp/out/hatrun-${id}-${tag}2.png`)) shots++;
      await P.page.keyboard.up(key);
      await P.page.waitForTimeout(650);          /* settle into the idle */
      if (await headShot(P, `${H.REPO}/tools/qa/mp/out/hatrun-${id}-${tag}0.png`)) shots++;
    };
    await run('a', 'W');
    await run('d', 'E');
  }
  console.log(`    ${shots} head shots of ${hats.length} hat(s)`);
  rec.ok('every hat was photographed standing and running both ways', shots === hats.length * 6, { shots, hats: hats.length });
  await P.ctx.close().catch(() => {});
}
