/* ═══ HOW BIG IS THE BLUE SLIME'S BALL, REALLY (v2.3.2310) ═══
 *
 * Owner: "make the blue slime projectiles larger by about 4x."
 *
 * THE NUMBER WAS NOT A TASTE CALL, IT WAS A BUG.  projectileScalePx is stated
 * in on-screen pixels, and the divisor that turns it into a Sprite scale was
 * hard-coded to 256 -- true of the fire goblin's fireball.png, false of the
 * recoloured slime orb, which is a 128px sheet.  The blue slime had no entry
 * of its own, so it took the shared default 16 and drew at EIGHT px: a third
 * of the 25.6px a PLAIN green slime gets from the fallback path, on the very
 * same sheet.  "About 4x" is what a third-size ball looks like from the seat.
 *
 * SO THIS FILE MEASURES PIXELS, not a scale constant.  A test that asserted
 * `projectileScalePx === 32` would pass on a build where the divisor was still
 * wrong and the ball still drew at 16.  What matters is the width on screen.
 *
 * AND IT MEASURES BOTH SLIMES.  Blue alone proves nothing: if the recolour
 * branch were never taken, the ball would fall through to the green fallback
 * at 25.6px and a "blue is big enough" assertion would pass on art that is not
 * even blue.  Green is the control.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

/* What the renderer drew, in on-screen px. */
const orbs = (P) => P.page.evaluate(() => (window.__btSlimeProj ? window.__btSlimeProj() : null));

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

/* Put one ball in the air, written EXACTLY the way gameEvents.js writes a
   server `monster_projectile` -- display-only, kind 'slime'. The wire path is
   not what is under test; the texture-and-scale resolution is, and it reads
   only these fields. Deliberately long-lived so the sampler cannot miss it. */
const fireOrb = (P) => P.page.evaluate(() => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.player) return false;
  if (!S.slimeProjectiles) S.slimeProjectiles = [];
  S.slimeProjectiles.push({
    x: S.player.x + 60, y: S.player.y - 40,
    ang: Math.PI, speed: 0.01, life: 900,
    displayOnly: true, ownerId: 'qa', rawDmg: 0, kind: 'slime', ts: Date.now(),
  });
  return true;
});

const clearOrbs = (P) => P.page.evaluate(() => {
  const S = window._gameState && window._gameState.current;
  if (S) S.slimeProjectiles = [];
});

/* Read the drawn size, retrying: the sprite is created on the renderer's next
   pass, not on the push. */
const measure = async (P, tries = 25) => {
  for (let i = 0; i < tries; i++) {
    await P.page.waitForTimeout(200);
    const o = await orbs(P);
    if (o && o.length && o[0].px > 0) return o[0];
  }
  return null;
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Splat', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2000);
  const myId = await H.readState(P, (S) => S.myId);

  await fetch('http://127.0.0.1:' + wsPort + '/api/admin/dev/quests', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + H.ADMIN_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: myId }),
  }).catch(() => {});
  await P.page.waitForTimeout(1200);

  /* ── THE CONTROL: a plain green slime's orb, in town ──
     Town's fodder has no zone variant, so this is the fallback path -- the
     same 128px sheet, untouched by this change. */
  rec.ok('we start in town, which has no slime variant (guard)',
    (await zoneOf(P)) === 'town', { zone: await zoneOf(P) });
  await clearOrbs(P);
  await fireOrb(P);
  const green = await measure(P);
  console.log('    GREEN (town fallback) -> ' + JSON.stringify(green));
  rec.ok('the plain slime orb is drawn at all (guard)', !!green && green.px > 0, green);
  await clearOrbs(P);

  /* ── THE SUBJECT: the Verdant Wilds, whose fodder IS the blue slime ── */
  const there = await warpTo(P, 'verdant');
  rec.ok('we can reach the Verdant Wilds (guard)', there, { zone: await zoneOf(P) });
  await P.page.waitForTimeout(1800);
  /* Informational only, and said so on purpose: the branch is chosen from
     ZONE_VARIANT_MAP[currentZone], NOT from what happens to be alive, so a
     zone with no fodder standing in it still resolves the blue orb. An
     earlier cut of this file printed this as a "positive control" and it read
     false on a run where the branch had plainly run -- a control that can be
     false while the thing it controls for is true is not a control. What
     actually proves the branch ran is the last assertion below. */
  const alive = await H.readState(P, (S) => (S.monsters || [])
    .filter((m) => m && m.alive).map((m) => m.arch));
  console.log('    verdant monsters -> ' + JSON.stringify(alive.slice(0, 8)));

  await clearOrbs(P);
  await fireOrb(P);
  const blue = await measure(P);
  console.log('    BLUE (verdant recolour) -> ' + JSON.stringify(blue));

  rec.ok('the blue slime orb is drawn at all (guard)', !!blue && blue.px > 0, blue);
  /* THE HEADLINE, in pixels. 8px was the bug; 32 is the ask. The window is
     wide enough to survive a retune of projectileScalePx and narrow enough
     that the old 8 -- or a half-fixed 16 -- fails it. */
  rec.ok('the blue slime orb is about 4x the eight pixels it used to be',
    !!blue && blue.px >= 28 && blue.px <= 40, blue);
  /* It must come off the SAME 128px sheet as the green one. If a future
     change swapped in a different source, the px above could be right for the
     wrong reason. */
  rec.ok('...off the same 128px sheet the green orb uses, so the size is the scale',
    !!blue && !!green && blue.srcPx === green.srcPx && blue.srcPx === 128,
    { blue: blue && blue.srcPx, green: green && green.srcPx });
  /* And the recolour branch really was taken: the fallback would have handed
     back the green orb's exact size. */
  rec.ok('...and it is bigger than the plain slime orb, so the recolour branch ran',
    !!blue && !!green && blue.px > green.px + 4, { blue: blue && blue.px, green: green && green.px });

  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/slimeorb.png` }).catch(() => {});
  await P.ctx.close();
}
