/* ═══ GROUND LOOT IS DRAWN AT TWICE THE SIZE (v2.3.2316) ═══
 *
 * Owner: "sprite size for monster loot while on the ground increase by 2x
 * (includes coin too)."
 *
 * TWO SPRITES, NOT ONE, and he named the second himself: a pile's remnant art
 * and the coin that rides on it are drawn in different branches from different
 * constants, so doubling one and not the other is the easy half-fix. This
 * measures both.
 *
 * IT MEASURES THE DRAWN SPRITE, not the constant. The size is chosen in four
 * places from three constants (the slime splat, a variant's own
 * remnantsScalePx, the snowman's, and the coin's), so a test that read a
 * number from the source could pass while the thing on the ground never moved.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

/* What the old build drew, in world px -- the baseline this doubles from. */
const WAS = { remnant: 48, coin: 14, coinOnPile: 12 };

const lootSprites = (P) => P.page.evaluate(() =>
  (window.__btLootSprites ? window.__btLootSprites() : null));

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Looter', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* ═══ A REAL PILE, MINTED THE WAY mp-remnant MINTS ONE ═══
     Ground loot is the WORKER's: a pile pushed into S.groundLoot by hand is
     replaced wholesale by the next zone tick (measured: piles 0 within 1.5s,
     even while re-pushing every frame). So this borrows the recipe
     mp-remnant already proves works -- go to a server-driven spoke and hold a
     monster at 0 hp but ALIVE, which is the window the client's own death path
     mints a remnant in.
     Town is no good for a second reason: its monsters are client-side
     (TRAPS #32). */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.currentZone = 'meadow';
    if (S.channel) S.channel.send({ type: 'move', x: 500, y: 500, z: 'meadow' });
  });
  await P.page.waitForTimeout(3000);
  const zone = await P.page.evaluate(() => ({
    srv: !!window._gameState.current._serverMonsters,
    n: (window._gameState.current.monsters || []).length,
  }));
  rec.ok('reached a server-driven zone with monsters (guard)', zone.srv && zone.n > 0, zone);
  if (!zone.srv || !zone.n) { await P.ctx.close().catch(() => {}); return; }

  const held = await P.page.evaluate(async () => {
    const S = window._gameState.current;
    const m = (S.monsters || []).find((x) => x.alive !== false);
    if (!m) return null;
    S.groundLoot = [];
    let frames = 0;
    const hold = setInterval(() => {
      frames++;
      m.curHp = 0; m.alive = true;
      m.statuses = { burn: { until: Date.now() + 9000, tickAt: 0, amount: 1, statusId: 'burn' } };
      m._lastDotDmg = null;
      /* Stand clear the whole time: pickup is 20 world px and the magnet
         reaches 50, so a pile that lands near the player is collected before
         it can be measured. */
      const l = (S.groundLoot || [])[0];
      if (l) {
        S.player.x = l.x + 240; S.player.y = l.y + 30;
        /* PUT GOLD ON IT. A remnant does not always carry coins, and the coin
           that rides on a pile is drawn by its own method from its own
           constant -- the half the owner named separately ("includes coin
           too"). Leaving it to chance made this assertion SKIP, and a skip on
           the half he called out is not coverage. */
        if (!l.coins) { l.coins = 12; l.recipients = [S.myId]; }
      }
    }, 50);
    await new Promise((r) => setTimeout(r, 2600));
    clearInterval(hold);
    await new Promise((r) => setTimeout(r, 600));
    const shot = window.__btLootSprites ? window.__btLootSprites() : null;
    return { frames, piles: (S.groundLoot || []).length,
      withSkull: (S.groundLoot || []).filter((x) => x.skull).length, shot };
  });
  console.log('    HELD -> ' + JSON.stringify(held && { frames: held.frames, piles: held.piles, withSkull: held.withSkull, shot: held.shot }));
  rec.ok('a pile is on the ground and drawn (guard)',
    !!(held && held.piles > 0 && held.shot && held.shot.length > 0),
    held && { frames: held.frames, piles: held.piles, shot: held.shot });
  if (!held || !held.shot || !held.shot.length) { await P.ctx.close().catch(() => {}); return; }

  const sprites = (held && held.shot && held.shot.length) ? held.shot : await lootSprites(P);
  console.log('    LOOT SPRITES -> ' + JSON.stringify(sprites));
  rec.ok('the probe answers and the pile is drawn (guard)',
    !!sprites && sprites.length > 0, sprites);
  if (!sprites || !sprites.length) { await P.ctx.close().catch(() => {}); return; }

  /* A window rather than an equality: the remnant branch multiplies a
     PER-VARIANT constant, so 96 is the fodder splat and a variant with its own
     number lands elsewhere. What must hold is that each sprite is twice what
     that branch used to draw, not that it is any particular number. */
  const doubledFrom = (was, got) => got >= was * 1.8 && got <= was * 2.2;

  const remnant = sprites.find((x) => x.kind === 'remnant');
  const coinOnPile = sprites.find((x) => x.kind === 'coinOnPile');
  const loneCoin = sprites.find((x) => x.kind === 'coin');

  if (remnant) {
    rec.ok('the monster\'s remnant art is drawn at twice its old size',
      doubledFrom(WAS.remnant, remnant.worldPx), { remnant, was: WAS.remnant });
  } else {
    rec.skip('the monster\'s remnant art is drawn at twice its old size',
      'this drop carried no remnant sprite');
  }

  /* THE HALF HE NAMED SEPARATELY. The coin that rides on a monster's pile is
     drawn by a different METHOD from every other loot sprite, so it is the one
     a hunt-and-edit pass misses -- and it is the coin he actually sees on a
     monster drop. */
  if (coinOnPile) {
    rec.ok('...and so is the coin sitting on top of it, which is its own branch',
      doubledFrom(WAS.coinOnPile, coinOnPile.worldPx), { coinOnPile, was: WAS.coinOnPile });
  } else if (loneCoin) {
    rec.ok('...and so is the coin, which is its own branch',
      doubledFrom(WAS.coin, loneCoin.worldPx), { loneCoin, was: WAS.coin });
  } else {
    rec.skip('the coin is drawn at twice its old size', 'this drop carried no coin');
  }

  /* THE THING THAT MUST NOT HAVE MOVED. A size change that also changed how
     close you must stand to collect would be a gameplay change nobody asked
     for: the pickup radius is a hard-coded 20 world px in groundLoot.js and
     has no relationship to these constants. Proven by USE -- the art is now
     wider than the radius, so a build that had tied collection to the sprite
     would sweep this up. */
  const stillThere = await P.page.evaluate(async () => {
    const S = window._gameState.current;
    S.groundLoot = [];
    const px = S.player.x + 46, py = S.player.y;
    /* 46 px: outside the 20px pickup, and well inside the doubled art's own
       span -- so a build that had tied collection to the sprite sweeps it up. */
    const hold = setInterval(() => {
      if (!S.groundLoot.some((l) => l && l.x === px)) {
        S.groundLoot.push({ x: px, y: py, coins: 5, ts: Date.now(), recipients: [S.myId] });
      }
    }, 50);
    await new Promise((r) => setTimeout(r, 1500));
    clearInterval(hold);
    /* _collected is what pickup stamps; the entry lingers 0.75s after. */
    return (S.groundLoot || []).filter((l) => l && l._collected).length;
  });
  rec.ok('a pile 46px away is still NOT collected -- the bigger art did not '
    + 'widen the pickup radius', stillThere === 0, { collected: stillThere });

  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/lootsize.png` }).catch(() => {});
  await P.ctx.close().catch(() => {});
}
