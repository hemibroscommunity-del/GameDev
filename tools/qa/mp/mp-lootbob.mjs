/* ═══ EVERY PILE ON THE GROUND BOBS -- THE SNOWMAN'S TOO (v2.3.2329) ═══
 *
 * Owner: "The subtle floating of the remnants and coins after the mummy death
 * is perfect.  The snowman remnants and coins don't have that subtle floating
 * effect when the loot is on the ground though.  Make sure all monster
 * remnants and loot has that effect."
 *
 * Two branches draw a monster's remnants.  v2.3.2318 removed the "settled
 * puddle, no bob" exclusion from the VARIANT branch, which is the mummy's --
 * so the mummy bobbed and looked perfect.  The snowman has had its own branch
 * since v2.3.191, and it kept the exclusion: wreck, coin and shard pinned at a
 * flat +38 with alpha 1.  Two piles side by side, one breathing, one not.
 *
 * MEASURED, NOT SCREENSHOTTED.  The renderer writes each pile's position into
 * its own Pixi sprite, and the loot entry carries a reference to it
 * (`l._pixiSprite`, and `l._pixiCoinSprite` for the coin riding a remnant), so
 * the bob is read straight off `.y` over time.  A 2.5px sine at a 2.1s period
 * is well under what a pixel diff on a 390px phone shot can tell from noise;
 * the sprite's own y cannot lie about it.
 *
 * THE CONTROL is a plain coin pile in the same frame -- the standard branch,
 * which has bobbed since v2.3.2318 -- so "bobbing" has a measured shape to be
 * compared against, and a run where NOTHING bobs (the renderer stalled, the
 * zone did not settle) reads as a broken harness, not a fixed snowman.
 *
 * Frost, because a snowman wreck only exists where the snowman does: its
 * remnants texture is per-zone art and the branch is a no-op elsewhere.
 */
import * as H from './harness.mjs';

const zoneOf = (P) => H.readState(P, (S) => S.currentZone);
const warpTo = async (P, zone, tries = 45) => {
  await P.page.evaluate((z) => {
    const S = window._gameState && window._gameState.current;
    if (S) S._devWarp = { to: z, legs: 0, t: Date.now(), nextAt: 0 };
  }, zone);
  for (let i = 0; i < tries; i++) {
    await P.page.waitForTimeout(1000);
    if ((await zoneOf(P)) === zone) return true;
  }
  return false;
};

/* Drop three piles beside the player and hand back their indices. `ts` is the
   spawn stamp the renderer ages from, so an old one lands in the last-call
   window (age 20-30s) straight away. */
const drop = (P, ageS) => P.page.evaluate((age) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.player || !S.groundLoot) return null;
  const ts = Date.now() - age * 1000;
  const base = S.groundLoot.length;
  S.groundLoot.push({ x: S.player.x + 70, y: S.player.y, skull: 'snowman', coins: 5, ts, recipients: [S.myId] });
  S.groundLoot.push({ x: S.player.x - 70, y: S.player.y, coins: 5, ts, recipients: [S.myId] });
  return { snow: base, coin: base + 1 };
}, ageS);

/* Sample sprite y and alpha for a set of piles for ~1.6s. Period is 2.1s, so
   even this box's 9-18 rAF turns per 1.4s catch most of a swing. */
const sample = (P, idx, ms = 1700) => P.page.evaluate(async ({ idx, ms }) => {
  const S = window._gameState && window._gameState.current;
  const out = {};
  for (const k of Object.keys(idx)) out[k] = { y: [], coinY: [], a: [] };
  const t0 = performance.now();
  while (performance.now() - t0 < ms) {
    await new Promise((r) => requestAnimationFrame(r));
    for (const k of Object.keys(idx)) {
      const l = S.groundLoot[idx[k]];
      if (!l) continue;
      if (l._pixiSprite && !l._pixiSprite.destroyed) { out[k].y.push(l._pixiSprite.y); out[k].a.push(l._pixiSprite.alpha); }
      if (l._pixiCoinSprite && !l._pixiCoinSprite.destroyed) out[k].coinY.push(l._pixiCoinSprite.y);
    }
  }
  const span = (a) => (a.length ? +(Math.max(...a) - Math.min(...a)).toFixed(2) : null);
  const res = {};
  for (const k of Object.keys(out)) res[k] = {
    frames: out[k].y.length, ySwing: span(out[k].y), coinSwing: span(out[k].coinY),
    aMin: out[k].a.length ? +Math.min(...out[k].a).toFixed(2) : null,
    aMax: out[k].a.length ? +Math.max(...out[k].a).toFixed(2) : null,
  };
  return res;
}, { idx, ms });

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Bobber', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2000);
  const myId = await H.readState(P, (S) => S.myId);
  await fetch('http://127.0.0.1:' + wsPort + '/api/admin/dev/quests', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + H.ADMIN_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: myId }),
  }).catch(() => {});
  await P.page.waitForTimeout(1200);

  const there = await warpTo(P, 'frost');
  rec.ok('we can reach frost, where a snowman wreck exists (guard)', there, { zone: await zoneOf(P) });
  if (!there) { await P.ctx.close().catch(() => {}); return; }
  await P.page.waitForTimeout(2500);   /* past the per-zone overlay; snowman art resident */

  /* ── fresh piles: the bob ── */
  const fresh = await drop(P, 0);
  rec.ok('two piles are on the ground beside us (guard)', !!fresh, fresh);
  if (!fresh) { await P.ctx.close().catch(() => {}); return; }
  await P.page.waitForTimeout(400);
  const m = await sample(P, fresh);
  console.log('    fresh: ' + JSON.stringify(m));
  rec.ok('both piles were drawn and sampled across several frames (guard)',
    m.snow.frames >= 6 && m.coin.frames >= 6, m);
  rec.ok('CONTROL: the plain coin pile bobs (the branch that already did)',
    m.coin.ySwing != null && m.coin.ySwing >= 2, m.coin);
  rec.ok('the SNOWMAN wreck bobs -- same amplitude as every other pile',
    m.snow.ySwing != null && m.snow.ySwing >= 2, m.snow);
  rec.ok('...and the coin riding on the wreck bobs with it',
    m.snow.coinSwing != null && m.snow.coinSwing >= 2, m.snow);
  rec.ok('...at the same amplitude as the control (within 1px), not some other motion',
    m.snow.ySwing != null && m.coin.ySwing != null && Math.abs(m.snow.ySwing - m.coin.ySwing) <= 1, m);
  rec.ok('a fresh pile is drawn at full opacity (guard for the pulse below)',
    m.snow.aMin != null && m.snow.aMin >= 0.99, m.snow);

  /* ── old piles: the last-call pulse (v2.3.2318), which the snowman skipped ── */
  const old = await drop(P, 24);
  await P.page.waitForTimeout(400);
  const o = await sample(P, old, 1400);
  console.log('    aged 24s: ' + JSON.stringify(o));
  rec.ok('CONTROL: a coin pile in its last ten seconds pulses (alpha dips below 0.9)',
    o.coin.aMin != null && o.coin.aMin < 0.9 && o.coin.aMax > o.coin.aMin, o.coin);
  rec.ok('the SNOWMAN wreck in its last ten seconds pulses too -- it used to hold alpha 1',
    o.snow.aMin != null && o.snow.aMin < 0.9 && o.snow.aMax > o.snow.aMin, o.snow);

  await P.ctx.close().catch(() => {});
}
