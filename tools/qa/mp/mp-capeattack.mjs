/* THE CAPE STAYS ON WHILE YOU ATTACK (v2.3.2190).
 *
 * Owner: "the attack animations need to have the cape anchored on the player's
 * head to look right."
 *
 * WHAT MAKES THIS HARD TO TEST, and why the assertions are shaped the way they
 * are.  During a swing or a bow shot the real body is HIDDEN and the whole
 * figure is redrawn by a stand-in in effectsRenderer -- and `pose` still reads
 * 'stand' throughout (v2.3.1784, the bug that left a shield hanging in the air
 * beside a swing).  So nothing on the player display says an attack is
 * happening, and a scenario that watched `pose` would photograph a standing
 * character and caption it "swinging".  The load-bearing guard here is the same
 * one the renderer itself uses: the body sprite is not visible.
 *
 * The swing window is ~300ms, far shorter than a round trip from node, so the
 * attack is re-armed every frame from inside the page -- the shape mp-backshield
 * settled on, and for the same reason.
 *
 * MEASURED WITH `crimson`, which ships hood art for south/southwest/east, so the
 * split is exercised: on those facings the panels go BEHIND the stand-in body
 * and the hood in front.
 */
import * as H from './harness.mjs';

const probe = (P) => P.page.evaluate(() => {
  const pd = window._pixiRenderer.playerDisplayRaw ? window._pixiRenderer.playerDisplayRaw() : null;
  return {
    bodyVisible: !!(pd && pd._spriteBody && pd._spriteBody.visible),
    cape: window.__btStandInCape ? window.__btStandInCape() : null,
    clip: window.__btStandInHairClip ? window.__btStandInHairClip() : null,
    /* the WALKING cape's drawn size, for the size comparison below */
    walkCapeH: (pd && pd._capeSprite && pd._capeSprite.texture)
      ? +Number(Math.abs(pd._capeSprite.height)).toFixed(1) : null,
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Swinger', wsPort, webPort,
    init: () => {
      try {
        localStorage.setItem('bt-hair', 'afro');
        localStorage.setItem('bt_cape', 'crimson');
      } catch (e) { /* a private-mode context tests the default look */ }
    },
  });
  await P.page.waitForTimeout(3500);
  await H.enterWorld(P).catch(() => {});
  await P.page.waitForTimeout(2500);

  /* The cape is the server's to give — seeding bt_cape alone leaves the
     character bare.  Same path mp-cape and mp-capehair walk. */
  const pid = await P.page.evaluate(
    () => (window._gameState && window._gameState.current && window._gameState.current.myId) || null);
  rec.ok('the player has an id to grant against (guard)', !!pid, { pid });
  await H.grant(wsPort, pid, 'item', { invKey: 'goldticket_crimson', count: 1 }).catch(() => null);
  await P.page.waitForTimeout(1200);
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) {
      S.channel.send({ type: 'cape_redeem',
        payload: { invKey: 'goldticket_crimson', opId: 'mp-capeattack-' + Date.now() } });
    }
  });
  await P.page.waitForTimeout(2500);
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'cape_equip', payload: { worn: true } });
  });
  await P.page.waitForTimeout(2000);

  /* THE STANDING REFERENCE, taken first: the pose the cape art is fitted to and
     the only size the owner has ever seen and not objected to.  Every size claim
     below is against this rather than against a baked-in number, so a cape drawn
     at a different scale, or a character resized, does not make this file lie. */
  await P.page.keyboard.down('s'); await P.page.waitForTimeout(350);
  await P.page.keyboard.up('s'); await P.page.waitForTimeout(1100);
  const standing = await probe(P);
  rec.ok('the character is standing there wearing the cape, so there is a '
    + 'reference size to compare against (guard)',
    !!(standing && standing.bodyVisible && standing.walkCapeH > 0), standing);
  const refH = (standing && standing.walkCapeH) || 0;

  /* Re-arm the attack every frame from inside the page: a one-shot evaluate
     cannot hold a 300ms window open across a round trip. */
  await P.page.evaluate(() => {
    window.__pinAtk = { i: 0, kind: 'sword', on: false };
    const tick = () => {
      const S = window._gameState && window._gameState.current;
      const p = window.__pinAtk;
      if (S && p && p.on) {
        if (S.rpg) S.rpg.weapon = { name: 'Copper Sword', type: 'sword', gearBase: 'copper' };
        const a = p.i * Math.PI / 4;
        S._facingAngle = a; S._aimAngle = a; S._mouseAimAngle = a;
        S._shieldKb = false; S.lockedTarget = null;
        if (S.player) { S.player.vx = 0; S.player.vy = 0; }
        if (p.kind === 'sword') { S.isSwinging = true; S.swingTimer = Date.now(); S._swingAng = a; }
        else { S._bowShotAt = Date.now(); S._bowShotAng = a; }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  const seen = [];
  /* sector 0 = east, 2 = south, 3 = southwest — the three facings crimson ships
     hood art for, so the split is under test on every one of them. */
  const CASES = [['sword-east', 'sword', 0], ['sword-south', 'sword', 2],
                 ['sword-southwest', 'sword', 3], ['bow-east', 'bow', 0],
                 ['bow-south', 'bow', 2]];
  for (const [tag, kind, i] of CASES) {
    await P.page.evaluate((v) => { window.__pinAtk = { i: v.i, kind: v.kind, on: true }; }, { i, kind });
    await P.page.waitForTimeout(700);
    const pr = await probe(P);
    await P.page.screenshot({ path: `tools/qa/mp/out/capeattack-${tag}.png` });
    seen.push({ tag, ...pr });
    await P.page.evaluate(() => { window.__pinAtk.on = false; });
    await P.page.waitForTimeout(450);
  }

  /* THE GUARD THE WHOLE FILE RESTS ON.  Without it every claim below is made
     about a character standing still, because `pose` never says 'swing'. */
  rec.ok('every sample was taken with a stand-in ACTUALLY on screen — the real '
    + 'body hidden, which is what an attack does and what `pose` never says',
    seen.length === 5 && seen.every((s) => s.bodyVisible === false),
    seen.map((s) => ({ tag: s.tag, bodyVisible: s.bodyVisible })));

  rec.ok('THE CAPE IS DRAWN ON EVERY ATTACK — it used to be hidden outright '
    + '(v2.3.2023 _CAPE_HIDDEN_POSES), which is what the owner asked to change',
    seen.every((s) => s.cape && s.cape.on && s.cape.hoodOn),
    seen.map((s) => ({ tag: s.tag, on: s.cape && s.cape.on, hood: s.cape && s.cape.hoodOn })));

  /* NOT an exact match, and the tolerance is a fact about the art rather than
     slack: _placeStandaloneTrait adds the hair style's own crownNudge to cwx,
     so a hair that is drawn a pixel off centre sits a pixel off the crown.
     Measured across the five stand-ins the spread is 0 to 1.4px.  What the
     claim is really about is that both are placed FROM the crown, so a change
     that started deriving one of them from something else would show up as a
     gap far larger than a nudge. */
  rec.ok('...on the stand-in\'s own crown, the same anchor the hat and hair have '
    + 'ridden since v2.3.867 — both land within a hair-nudge of it, so there is '
    + 'one piece of geometry here and not two to drift apart',
    seen.every((s) => s.cape && s.cape.hoodX != null && s.cape.hairX != null
      && Math.abs(s.cape.hoodX - s.cape.hairX) <= 3),
    seen.map((s) => ({ tag: s.tag, hoodX: s.cape && s.cape.hoodX, hairX: s.cape && s.cape.hairX,
      gap: s.cape ? +Math.abs(s.cape.hoodX - s.cape.hairX).toFixed(2) : null })));

  rec.ok('...SPLIT the same way it is when you walk: the panels behind the '
    + 'stand-in body and the hood in front, so the torso is not covered by a slab',
    seen.every((s) => s.cape && s.cape.split && s.cape.backUnderBody === true),
    seen.map((s) => ({ tag: s.tag, split: s.cape && s.cape.split,
      under: s.cape && s.cape.backUnderBody, backIdx: s.cape && s.cape.backIdx,
      bodyIdx: s.cape && s.cape.bodyIdx })));

  /* ═══ v2.3.2192: THE CLIP IS ASSERTED ON THE HAIR, NOT ON THE MASK ═══
     v2.3.2190 asserted only that the hood mask was READY, and shipped green.
     "The mask sprite got placed" and "the hair is masked to it" are different
     facts -- the distinction __btStandInHairClip was built for at v2.3.1776,
     and the one this file then failed to apply.  So both are claimed now, and
     the second one is the one the owner asked for. */
  rec.ok('the hood mask is placed and ready on every attack (guard for the '
    + 'claim below)',
    seen.every((s) => s.cape && s.cape.hoodClipReady),
    seen.map((s) => ({ tag: s.tag, ready: s.cape && s.cape.hoodClipReady })));

  rec.ok('...and THE HAIR IS ACTUALLY CLIPPED TO IT, so a big style does not '
    + 'burst out of the hood for the quarter-second of every swing',
    seen.every((s) => s.clip && s.clip.hairVisible && s.clip.maskedToHood),
    seen.map((s) => ({ tag: s.tag, hair: s.clip && s.clip.hairVisible,
      toHood: s.clip && s.clip.maskedToHood, toHat: s.clip && s.clip.masked,
      hoodReady: s.clip && s.clip.hoodReady })));

  /* THE SIZE.  This is the claim that failed first and it failed silently:
     sharing the HAT's scale (_skillTraitMul, normalised to the head) drew the
     cape 19% oversized on the south swing and 49% on the east one, swallowing
     the arms.  A stand-in is separate art whose head sits in a different
     proportion to its body, so matching the head cannot match the body.  Sized
     to the FIGURE the measured spread is -3% to +13% of the standing cape --
     the +13% is the east swing genuinely lunging, which lengthens its own
     crown-to-feet.  A quarter is loose enough for that and tight enough that
     the old rule cannot come back unnoticed. */
  rec.ok('the cape is the CHARACTER\'S size on an attack, not the hat\'s — within '
    + 'a quarter of the size it is standing, where sharing the hat\'s scale put '
    + 'it half as big again',
    refH > 0 && seen.every((s) => s.cape && s.cape.capeDrawnH > 0
      && Math.abs(s.cape.capeDrawnH - refH) / refH <= 0.25),
    { refH, sizes: seen.map((s) => ({ tag: s.tag, h: s.cape && s.cape.capeDrawnH,
      ratio: s.cape && s.cape.capeDrawnH ? +(s.cape.capeDrawnH / refH).toFixed(3) : null })) });

  /* AND IT LEAVES.  A cape that arrived on the stand-in and never went home
     would be the mirror-image bug -- two capes, one on the walking body and one
     hanging where the swing was. */
  await P.page.waitForTimeout(900);
  const after = await probe(P);
  rec.ok('when the attack ends the stand-in cape goes with it, so there is never '
    + 'a second cape left hanging where the swing was',
    !!(after && after.bodyVisible && after.cape && !after.cape.on), after);
}
