/* THE TWO DRAUGHTS, END TO END (v2.3.2062).
 *
 * Owner: "Make the mana potion refill at a quick rate so you can just do
 * special attacks constantly for 3 mins" and "Then do a speed potion that lets
 * you run 1.5x speed 3 mins."
 *
 * server/test/potions.test.mjs proves the arithmetic against a mocked store.
 * What it cannot prove is the half that decides whether a player ever sees any
 * of it: that the shop is REACHABLE, that the buttons are there, and that the
 * client's own movement and mana actually change when you drink. Building
 * these turned up that no potion was buyable at all -- every shop door was a
 * prop held back on stale coordinates -- so "can you get one" is the first
 * thing this asserts, and it is not a formality.
 */
import * as H from './harness.mjs';

const pos = (P) => H.readState(P, (S) => ({ x: Math.round(S.player.x), y: Math.round(S.player.y) }));
const put = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState.current;
  S.player.x = px; S.player.y = py; S.player.vx = 0; S.player.vy = 0;
}, { px: x, py: y });
const coins = (P) => H.readState(P, (S) => (S.rpg || {}).coins || 0);
const mana = (P) => H.readState(P, (S) => Math.round((S.rpg || {}).mana || 0));

async function hold(P, key, ms) {
  await P.page.keyboard.down(key);
  await P.page.waitForTimeout(ms);
  await P.page.keyboard.up(key);
  await P.page.waitForTimeout(250);
}

/** How far the walk carries you per RENDERED FRAME, walking north up a clear
 *  lane. NOT px/second, and that distinction is the whole of this helper.
 *
 * v2.3.2069: this measured wall-clock distance over a fixed 2200 ms and the
 * comparison quietly stopped meaning anything. Movement is a FIXED STEP PER
 * FRAME (7.6 px un-buffed, measured), so the distance covered in a second is
 * really a measurement of headless Chromium's frame rate -- which here ramps
 * as the run goes on. Probed across five lanes in one session: 69, 86, 101 and
 * 103 px/s for the SAME walk, a 1.5x spread. That is exactly the size of the
 * Swift Draught, so a control taken early and a buffed run taken later could
 * differ by a factor of the thing under test with no potion involved at all.
 * It first showed up as the control out-running the buffed run (202 -> 180),
 * which reads as "the potion is broken" and is not.
 *
 * The same five lanes in px/FRAME: 7.600, 7.581, 7.644, 7.550 -- inside 1.2%.
 * So count frames, not milliseconds, and the frame rate cancels out.
 *
 * THE LANE IS SHORTER NOW, and that is the town's fault rather than the
 * test's. It ran 90 frames -- about 1030 px at the buffed rate -- up a plaza
 * that had four blocking props in it. v2.3.2073 gave all twelve a footprint
 * (owner: "make sure the objects are unwalkable"), and a furnished square has
 * no 1000 px straight line left in it: a sweep of every north-south lane in
 * town found the longest clear one is 630 px, at x=1000 south of the benches.
 * So the run is 30 counted frames behind a 250 ms roll-in, which is 513 px at
 * the buffed rate from (1000, 1600) -- ending at y 1087, comfortably clear of
 * bench-e's footprint at y 941..975. Fewer frames is noisier, and it does not
 * matter here: the effect under test is 1.5x against a 1.25x threshold, and
 * the measurement agreed to 1.2% over 120 frames.
 * The lane is checked against propFootprint and every NPC's wander radius
 * rather than remembered, and its ground samples 97% open cobble.
 * (x=300 was rejected long before that: it walks into the west cliff.) */
async function sprint(P, frames = 30) {
  await put(P, 1000, 1600);
  await P.page.waitForTimeout(350);
  await P.page.keyboard.down('w');
  /* Already in motion before the count starts, so the first frames of the
     press are not part of the sample -- and short, because every pixel of
     roll-in eats the clear lane the count needs. */
  await P.page.waitForTimeout(250);
  const m = await P.page.evaluate((n) => new Promise((res) => {
    const S = window._gameState.current;
    const y0 = S.player.y;
    let f = 0;
    const step = () => {
      f++;
      if (f >= n) return res({ dist: y0 - S.player.y, frames: f });
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), frames);
  await P.page.keyboard.up('w');
  await P.page.waitForTimeout(250);
  return Math.round((m.dist / m.frames) * 100) / 100;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Drinker', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2600);
  const id = await H.readState(P, (S) => S.myId);
  await H.grant(wsPort, id, 'gold', { amount: 500 });
  await P.page.waitForTimeout(1000);

  /* ── 1. THEY ARE ON SHOPKEEPER BRO'S SHELF ──
     Owner: "These potions should be purchasable there." Bro, not the vendor
     building -- which is why this drives his drawer and not a door. */
  const openBro = async () => {
    await P.page.evaluate(() => window.__broShopBus.setOpen(true));
    for (let i = 0; i < 40; i++) {
      const ready = await P.page.evaluate(() =>
        !!document.querySelector('[data-shop-bro="swiftDraught"]'));
      if (ready) return true;
      await P.page.waitForTimeout(150);
    }
    return false;
  };
  rec.ok('both draughts are on Shopkeeper Bro\'s shelf', await openBro(), null);

  const shelf = await P.page.evaluate(() => {
    const ids = [...document.querySelectorAll('[data-shop-bro]')]
      .map((e) => e.getAttribute('data-shop-bro'));
    const slot = document.querySelector('[data-shop-bro="swiftDraught"]');
    const price = slot && slot.parentElement && slot.parentElement.lastElementChild.textContent.trim();
    const badge = slot && slot.querySelector('.bt-item-qty');
    return { ids, price, badge: badge ? badge.textContent : null };
  });
  rec.ok('...priced under the slot like everything else on it',
    /^\d+g$/.test(shelf.price || ''), shelf);
  /* A count on a thing he cannot run out of would be a lie. */
  rec.ok('...with no count badge, because a staple never runs out',
    shelf.badge === null, shelf);

  /* ── 2. THE SWIFT DRAUGHT MAKES YOU FASTER ── */
  await P.page.evaluate(() => window.__broShopBus.setOpen(false));
  await P.page.waitForTimeout(500);
  const before = await sprint(P);
  rec.ok(`the control sprint covers ground (${before} px/frame)`, before > 4, { before });

  await openBro();
  await P.page.click('[data-shop-bro="swiftDraught"]');
  await P.page.waitForTimeout(900);
  const deal = await P.page.evaluate(() => {
    const act = document.querySelector('[data-shop-act]');
    return { side: act && act.getAttribute('data-shop-act'),
      label: act && act.textContent.trim(),
      total: act && act.getAttribute('data-shop-total'),
      stepper: !!document.querySelector('[data-shop-plus]'),
      staple: !!document.querySelector('[data-shop-staple]') };
  });
  rec.ok('tapping it offers a BUY at a real price', deal.side === 'bro' && +deal.total > 0, deal);
  /* Quantity on an effect could only mean "charge me five times, run it
     once", so the stepper is gone rather than disabled. */
  rec.ok('...with no quantity stepper, because an effect does not stack',
    !deal.stepper && deal.staple, deal);

  const c0 = await coins(P);
  await P.page.click('[data-shop-act]');
  await P.page.waitForTimeout(1800);
  rec.ok('the Swift Draught can be bought from him', (await coins(P)) < c0,
    { before: c0, after: await coins(P) });
  await P.page.evaluate(() => window.__broShopBus.setOpen(false));
  await P.page.waitForTimeout(500);

  const buffState = await H.readState(P, (S) => ({
    spdBuff: S._spdBuff ? S._spdBuff - Date.now() : 0, mul: S._spdBuffMul || 0 }));
  rec.ok('...and the client knows it is 1.5x, not the cooked-food 1.15',
    Math.abs(buffState.mul - 1.5) < 0.01, buffState);
  rec.ok('...for about three minutes',
    buffState.spdBuff > 170000 && buffState.spdBuff < 185000, buffState);

  const after = await sprint(P);
  rec.ok(`you actually run faster with it (${before} -> ${after} px/frame over the same walk)`,
    after > before * 1.25, { before, after, ratio: (after / before).toFixed(2) });
  rec.ok('...and the server accepted the sprint rather than rubber-banding it',
    after > before, { after, before });

  /* ── 3. THE MANA DRAUGHT KEEPS THE POOL UP ── */
  /* Spend the pool through the SERVER before buying, or the refill cannot be
     seen: setting S.rpg.mana in the page leaves the server still believing the
     pool is full, and with a delta player_state it has no changed field to
     send -- so the drink "fills" a pool the server never saw empty and the
     number on screen is the client's own guess. Three specials is 75 mana. */
  for (let i = 0; i < 3; i++) {
    await P.page.evaluate(() => {
      const S = window._gameState.current;
      if (S.channel) S.channel.send({ type: 'ability_use', payload: { type: 'swipe', tier: 0 } });
    });
    await P.page.waitForTimeout(180);
  }
  await P.page.waitForTimeout(400);
  const drained = await mana(P);
  rec.ok(`three specials really drained the pool server-side (${drained})`,
    drained < 60, { drained });

  await openBro();
  const c1 = await coins(P);
  await P.page.click('[data-shop-bro="manaShard"]');
  await P.page.waitForTimeout(900);
  await P.page.click('[data-shop-act]');
  await P.page.waitForTimeout(1800);
  rec.ok('the Mana Draught can be bought from him', (await coins(P)) < c1,
    { before: c1, after: await coins(P) });
  const filled = await mana(P);
  rec.ok(`...and fills the pool on the drink, so the first special lands now `
       + `(${drained} -> ${filled})`,
    filled > drained + 40, { drained, filled });

  /* ── ONE EFFECT AT A TIME ──
     Owner: "Only 1 effect active at a time though." The Swift Draught was
     running a moment ago; drinking this must have ended it. */
  const excl = await H.readState(P, (S) => ({
    spd: S._spdBuff && Date.now() < S._spdBuff ? 1 : 0,
    spdMul: S._spdBuffMul || 0,
    mana: S._manaBuff && Date.now() < S._manaBuff ? 1 : 0 }));
  rec.ok('drinking the Mana Draught ENDED the Swift Draught -- one effect at a time',
    excl.spd === 0 && excl.mana === 1, excl);
  rec.ok('...and took its multiplier with it, so nothing is left applying 1.5x',
    !excl.spdMul, excl);

  const manaBuff = await H.readState(P, (S) => ({
    ms: S._manaBuff ? S._manaBuff - Date.now() : 0, flat: S._manaFlat || 0 }));
  rec.ok('...for about three minutes', manaBuff.ms > 170000 && manaBuff.ms < 185000, manaBuff);
  rec.ok('...carrying the server\'s own per-tick regen floor',
    manaBuff.flat >= 10 && manaBuff.flat <= 200, manaBuff);
  await P.page.evaluate(() => window.__broShopBus.setOpen(false));
  await P.page.waitForTimeout(500);

  /* The speed is gone in the WORLD too, not just on a flag. */
  const slowAgain = await sprint(P);
  rec.ok(`...and you are back to normal speed (${slowAgain} px/frame, against `
       + `${before} un-buffed and ${after} buffed)`,
    slowAgain < after * 0.85, { before, after, slowAgain });

  /* ── 4. YOU CAN CAST SPECIALS WITHOUT PAUSE ──
     The owner's actual sentence, measured: cast at the real cadence the game
     allows (one per 1500 ms) and count how many the pool can pay for.

     Driven through ability_use, which is the message a real special sends and
     the one the SERVER charges mana for. An earlier cut of this zeroed
     S.rpg.mana in the page and watched it climb -- which measured nothing
     useful: the server never agreed the pool was empty, so with a delta
     player_state it had no changed field to send, and what the number did
     afterwards was the client's own prediction running at whatever frame rate
     headless Chromium felt like. Spending real mana makes the server the one
     answering. */
  /* OUT OF TOWN FIRST, and this is not incidental. Town is a HUB, and the hub
     top-off in _tickPlayerRegen refills every pool at 10% of max per tick --
     roughly 15 mana/sec for free. Nobody runs dry in town, potion or not, so a
     cast run measured there returns 8 of 8 for BOTH players and proves
     nothing. The first cut of this did exactly that. The zone moves through
     the real `move` message so the server agrees. */
  const toSpoke = async (Pl) => {
    await Pl.page.evaluate(() => {
      const S = window._gameState.current;
      S.currentZone = 'meadow';
      if (S.channel) S.channel.send({ type: 'move', x: 500, y: 500, z: 'meadow' });
    });
    await Pl.page.waitForTimeout(1200);
    return Pl.page.evaluate(() => window._gameState.current.currentZone);
  };

  const castRun = async (Pl, casts = 8) => {
    let paid = 0, fizzled = 0;
    for (let i = 0; i < casts; i++) {
      const have = await mana(Pl);
      if (have >= 25) paid++; else fizzled++;
      await Pl.page.evaluate(() => {
        const S = window._gameState.current;
        if (S.channel) S.channel.send({ type: 'ability_use', payload: { type: 'swipe', tier: 0 } });
      });
      await Pl.page.waitForTimeout(1500);
    }
    return { paid, fizzled, end: await mana(Pl) };
  };

  const zoneP = await toSpoke(P);
  /* `live` is the in-memory playerState; the zone field on it is `z`. Read
     through the admin endpoint rather than trusted from the page, because
     "the client thinks it is in the meadow" is exactly the state that would
     leave the server topping the pool up in town and the run meaningless. */
  const srvP = await H.serverPlayer(wsPort, id).catch(() => null);
  const srvZoneP = srvP ? (srvP.z || srvP.zone) : null;
  rec.ok(`the drinker is out of the hub before casting (client ${zoneP}, server ${srvZoneP})`,
    zoneP === 'meadow' && srvZoneP === 'meadow',
    { zoneP, srvZoneP, srvKeys: srvP ? Object.keys(srvP).slice(0, 30) : null });
  const withPotion = await castRun(P);
  rec.ok(`with the draught up you cast all ${withPotion.paid} of 8 specials at `
       + `the game's own cadence, none fizzled, and the pool ends at `
       + `${withPotion.end}`,
    withPotion.paid === 8 && withPotion.fizzled === 0, withPotion);

  /* THE CONTROL: a second player, same run, no potion. Without it the pool
     cannot pay for eight in a row -- which is what makes the line above a
     statement about the potion rather than about the cadence being gentle. */
  const C = await H.newPlayer(browser, { name: 'Sober', wsPort, webPort, guest: true,
    viewport: { width: 390, height: 844 }, touch: true });
  await H.enterWorld(C);
  await C.page.waitForTimeout(2600);
  await toSpoke(C);
  const sober = await castRun(C);
  rec.ok(`the control, with no draught, runs dry -- ${sober.paid} of 8 land and `
       + `${sober.fizzled} fizzle`,
    sober.fizzled > 0, sober);
  rec.ok('...so it is the draught doing it, not a cadence anyone could sustain',
    withPotion.paid > sober.paid, { withPotion, sober });
  await C.ctx.close();

  /* His shelf, open, for the record: staples lead and the pile follows, so
     what the artifact shows is the order a player actually sees. */
  await openBro();
  await P.page.click('[data-shop-bro="swiftDraught"]').catch(() => {});
  await P.page.waitForTimeout(900);
  await P.page.screenshot({ path: H.REPO + '/tools/qa/mp/out/potions.png' }).catch(() => {});
  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await P.ctx.close();
}
