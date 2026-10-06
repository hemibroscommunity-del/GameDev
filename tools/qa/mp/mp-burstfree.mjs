/* ═══ A SNOWBALL'S BURST, ITS PICTURE HANDED BACK WHILE IT PLAYS (v2.3.3071) ═══
 *
 * The snowball burst's frames are the frost's own (freeFrostImpactTex hands
 * them back on leaving the frost zone, and the Wheel's frost land:
 * wheelMonsterArt).  It destroyed them whether or not a burst was still on
 * screen with one, and the next frame drew a destroyed texture: app.render
 * threw ("Cannot read properties of null (reading 'addressModeU')") every
 * frame until the burst ran out -- found by mp-zombietex's render check, on a
 * tour of the Wheel's lands.  Now a burst whose frames are gone is retired
 * before the frame draws.
 *
 * A phone in the Wheel.  The burst's art loaded (window.__btFrostImpactTex,
 * QA), a burst started where the bro stands -- stamped a few seconds ahead,
 * as `at` allows, so it is still playing when the art goes:
 *   1. it plays (window._pixiRenderer.snowballBurstProbe);
 *   2. the art handed back mid-burst: the burst is retired, and the render
 *      does not throw;
 *   3. the art loaded again, a new burst plays as before.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const threw = (P) => P.logs.filter((l) => /app\.render threw/.test(l)).length;

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'burstfree', wsPort, webPort, viewport: PHONE, touch: true, dpr: 1, world: 'wheel' });
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!ok, ok);
    if (!ok) return;
    await P.page.waitForTimeout(3000);
    const hooks = await P.page.evaluate(() => !!(window.__btFrostImpactTex && window._pixiRenderer && window._pixiRenderer.snowballBurstProbe));
    rec.ok('the burst\'s art can be loaded and handed back on demand (guard: window.__btFrostImpactTex, snowballBurstProbe)', hooks);
    if (!hooks) return;
    const probe = () => P.page.evaluate(() => window._pixiRenderer.snowballBurstProbe());
    const burst = (aheadMs) => P.page.evaluate((ahead) => {
      const S = window._gameState.current;
      S.snowballBursts = S.snowballBursts || [];
      S.snowballBursts.push({ x: S.player.x, y: S.player.y - 34, at: Date.now() + ahead });
    }, aheadMs);

    /* 1 */
    await P.page.evaluate(() => window.__btFrostImpactTex.ensure());
    await burst(6000);
    const playing = await H.waitFor(P, () => window._pixiRenderer.snowballBurstProbe(), (v) => v.playing >= 1 && v.inLayer >= 1,
      { timeout: 10000, label: 'the burst playing' }).catch(() => null);
    rec.ok(`a burst plays where the bro stands, its art loaded: ${JSON.stringify(playing)}`, !!playing && playing.loaded === 8, playing);

    /* 2 */
    const before = threw(P);
    await P.page.evaluate(() => window.__btFrostImpactTex.free());
    await P.page.waitForTimeout(2500);
    const after = await probe();
    const thrown = threw(P) - before;
    console.log(`    art handed back mid-burst: ${JSON.stringify(after)}, render threw ${thrown} time(s)`);
    rec.ok(`the art handed back mid-burst: the burst is retired (${after.playing} playing, ${after.inLayer} in the layer, ${after.loaded} frames)`, after.playing === 0 && after.inLayer === 0 && after.loaded === 0, after);
    rec.ok(`...and the render did not throw (${thrown} times; without this fix it threw, "addressModeU" of null)`, thrown === 0, P.logs.filter((l) => /app\.render threw/.test(l)).slice(0, 2));

    /* 3 */
    await P.page.evaluate(() => window.__btFrostImpactTex.ensure());
    await burst(1500);
    const again = await H.waitFor(P, () => window._pixiRenderer.snowballBurstProbe(), (v) => v.playing >= 1,
      { timeout: 10000, label: 'a new burst' }).catch(() => null);
    rec.ok(`the art loaded again, a new burst plays as before: ${JSON.stringify(again)}`, !!again && again.loaded === 8, again);
    const errors = P.logs.filter((l) => /pageerror/.test(l));
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 4));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
