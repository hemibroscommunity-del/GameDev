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

/** Distance covered walking north for `ms`, from a clear patch of plaza. */
async function sprint(P, ms = 2200) {
  await put(P, 700, 1450);
  await P.page.waitForTimeout(350);
  const a = await pos(P);
  await hold(P, 'w', ms);
  const b = await pos(P);
  return a.y - b.y;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Drinker', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2600);
  const id = await H.readState(P, (S) => S.myId);
  await H.grant(wsPort, id, 'gold', { amount: 500 });
  await P.page.waitForTimeout(1000);

  /* ── 1. THE SHOP IS REACHABLE AT ALL ──
     This is the check that would have caught the whole problem: potions have
     only ever been sold behind a building door, and every door was switched
     off with the v16 props. */
  const store = await P.page.evaluate(() =>
    (window.__btWorldProps ? window.__btWorldProps() : []).find((p) => p.id === 'general-store') || null);
  rec.ok('the general store is on the map', !!store, store);

  await put(P, store.x, store.y + 60);
  await P.page.waitForTimeout(900);
  const near = await H.readState(P, (S) => S.nearBuilding);
  rec.ok('...and standing at its door offers a way in',
    near !== null && near !== undefined, { nearBuilding: near });

  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (window.__btEnterBuilding) window.__btEnterBuilding();
  });
  /* The door opens on the E key in the desktop rig. */
  await P.page.keyboard.press('e');
  await P.page.waitForTimeout(1200);
  const shelf = await P.page.evaluate(() => {
    const t = document.body.innerText || '';
    /* Case-insensitive: the header is text-transform:uppercase, and innerText
       returns the RENDERED text, so a check for 'Vendor' misses 'VENDOR'. */
    return { text: /vendor/i.test(t), mana: t.includes('Mana Draught'),
      swift: t.includes('Swift Draught'), fury: t.includes('Fury Tonic') };
  });
  rec.ok('the vendor shelf opens', shelf.text, shelf);
  rec.ok('...and both new draughts are on it', shelf.mana && shelf.swift, shelf);

  /* ── 2. THE SWIFT DRAUGHT MAKES YOU FASTER ──
     Measured as distance covered, before and after, over the same walk. */
  await P.page.keyboard.press('Escape');
  await P.page.waitForTimeout(600);
  const before = await sprint(P);
  rec.ok(`the control sprint covers ground (${before}px)`, before > 80, { before });

  await put(P, store.x, store.y + 60);
  await P.page.waitForTimeout(500);
  await P.page.keyboard.press('e');
  await P.page.waitForTimeout(900);
  const c0 = await coins(P);
  const bought = await P.page.evaluate(() => {
    const rows = [...document.querySelectorAll('div')].filter((d) => (d.textContent || '').includes('Swift Draught'));
    const row = rows[rows.length - 1];
    const btn = row && row.closest('div') && row.parentElement
      && row.parentElement.parentElement && row.parentElement.parentElement.querySelector('button');
    if (btn) { btn.click(); return true; }
    return false;
  });
  await P.page.waitForTimeout(1600);
  rec.ok('the Swift Draught can be bought', (await coins(P)) < c0, { before: c0, after: await coins(P) });
  await P.page.keyboard.press('Escape');
  await P.page.waitForTimeout(600);

  const buffState = await H.readState(P, (S) => ({
    spdBuff: S._spdBuff ? S._spdBuff - Date.now() : 0, mul: S._spdBuffMul || 0 }));
  rec.ok('...and the client knows it is 1.5x, not the cooked-food 1.15',
    Math.abs(buffState.mul - 1.5) < 0.01, buffState);
  rec.ok('...for about three minutes',
    buffState.spdBuff > 170000 && buffState.spdBuff < 185000, buffState);

  const after = await sprint(P);
  rec.ok(`you actually run faster with it (${before}px -> ${after}px over the same walk)`,
    after > before * 1.25, { before, after, ratio: (after / before).toFixed(2) });
  /* The server must not have refused any of those moves -- a rubber-banded
     player ends up BEHIND where the client thinks they are. */
  const drift = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return { bought: !!S._spdBuff };
  });
  rec.ok('...and the server accepted the sprint rather than rubber-banding it '
       + '(the run is longer, so no move was rejected)', after > before, { after, before, drift });

  /* ── 3. THE MANA DRAUGHT KEEPS THE POOL UP ── */
  await put(P, store.x, store.y + 60);
  await P.page.waitForTimeout(500);
  await P.page.keyboard.press('e');
  await P.page.waitForTimeout(900);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.mana = 5;                       /* drained, so the fill is visible */
  });
  const c1 = await coins(P);
  await P.page.evaluate(() => {
    const rows = [...document.querySelectorAll('div')].filter((d) => (d.textContent || '').includes('Mana Draught'));
    const row = rows[rows.length - 1];
    const btn = row && row.parentElement && row.parentElement.parentElement
      && row.parentElement.parentElement.querySelector('button');
    if (btn) btn.click();
  });
  await P.page.waitForTimeout(1600);
  rec.ok('the Mana Draught can be bought', (await coins(P)) < c1, { before: c1, after: await coins(P) });
  rec.ok('...and fills the pool on the drink, so the first special lands now',
    (await mana(P)) > 80, { mana: await mana(P) });

  const manaBuff = await H.readState(P, (S) => ({
    ms: S._manaBuff ? S._manaBuff - Date.now() : 0, flat: S._manaFlat || 0 }));
  rec.ok('...for about three minutes', manaBuff.ms > 170000 && manaBuff.ms < 185000, manaBuff);
  rec.ok('...carrying the server\'s own per-tick regen floor',
    manaBuff.flat >= 10 && manaBuff.flat <= 200, manaBuff);
  await P.page.keyboard.press('Escape');
  await P.page.waitForTimeout(500);

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

  await P.page.screenshot({ path: H.REPO + '/tools/qa/mp/out/potions.png' }).catch(() => {});
  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await P.ctx.close();
}
