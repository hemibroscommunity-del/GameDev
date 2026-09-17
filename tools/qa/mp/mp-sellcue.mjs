/* ═══ v2.3.2606: A SALE MAKES THE COIN NOISE ═══
 *
 * Owner: "Play gold sound when you sell stuff for money."
 *
 * The sibling of mp-lootcue, and it exists for the same one reason that file
 * gives: "a refused sale makes NO coin sound" has to be an assertion about the
 * SOUND, not a re-reading of the code that plays it.  That property is the
 * whole of the brief -- selling is server-settled (server/src/shop.js
 * _shopSell), so a cue on the tap would ring for sales the worker then refuses,
 * and a player who hears coins and loses the item has been lied to.
 *
 * WHAT IS DRIVEN.  A real `shop_sell` down the real socket, so the worker
 * really settles it and really answers.  The cue hangs off the `shop_result`
 * handler (gameEvents.js), which is reached only by the worker's reply -- so
 * driving the round trip is the only way to test the thing that was asked for.
 * The refusal leg sends a sale the player cannot make; the worker answers
 * `ok: false` down the SAME message type, which is exactly the case a cue
 * placed one line too high would get wrong.
 *
 * AND THE SOUND SETTING.  BT_AUDIO.play early-returns on `muted` -- the flag
 * SettingsPanel's toggle writes -- so the cue inherits the setting by riding
 * the shared path.  That inheritance is asserted rather than assumed: the
 * scenario mutes, sells, and checks the play call produced no source.
 *
 *   node tools/qa/mp/run.mjs sellcue
 */
import * as H from './harness.mjs';

/* Not a staple -- he refuses to buy his own stock back (shop.js isShopStaple),
   which would make every leg below fail for a reason that is not the cue. */
const SELLABLE = 'wood_oak';

/* Arm the probe AND a spy on the shared audio path.  The probe counts the cue
   site; the spy records what key it actually asked for and what came back, so
   "it rides coin-pickup through BT_AUDIO" is read off the call rather than off
   the source. */
const arm = (P) => P.page.evaluate(() => {
  window.__btProbe = 1;
  window.__btSellSfx = 0;
  window.__btPlayLog = [];
  const A = window.BT_AUDIO || (window._gameFns && window._gameFns.BT_AUDIO);
  if (!A || A.__btSpied) return !!A;
  const real = A.play.bind(A);
  A.play = function (key, opts) {
    const out = real(key, opts);
    try { window.__btPlayLog.push({ key, muted: !!A.muted, got: out === null ? null : 'source' }); } catch (e) { /* ignore */ }
    return out;
  };
  A.__btSpied = 1;
  return true;
});

const readCue = (P) => P.page.evaluate(() => ({
  n: window.__btSellSfx || 0,
  log: (window.__btPlayLog || []).filter((e) => e.key === 'coin-pickup'),
}));

const sell = (P, key, qty) => P.page.evaluate(({ k, q }) => {
  const S = window._gameState.current;
  if (!S || !S.channel) return false;
  S.channel.send({ type: 'shop_sell', payload: { key: k, qty: q } });
  return true;
}, { k: key, q: qty });

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Seller', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  const myId = await H.readState(P, (S) => S.myId);

  const capOn = await H.readState(P, (S) => !!(S._serverCaps && S._serverCaps.store));
  rec.ok('the worker advertises the store capability (guard)', capOn, { capOn });

  rec.ok('the audio path is spied (guard)', (await arm(P)) === true, {});

  await H.grant(wsPort, myId, 'item', { invKey: SELLABLE, count: 4 });
  await P.page.waitForTimeout(1600);
  const bag0 = await H.readState(P, (S) => ((S.rpg || {}).inventory || {}));
  rec.ok('the seller has something to sell (guard)', (bag0[SELLABLE] || 0) >= 4, bag0);

  /* ── 1. A SALE THE WORKER SETTLES ── */
  const before = await readCue(P);
  rec.ok('no coin sound before anything is sold (guard)', before.n === 0, before);
  await sell(P, SELLABLE, 2);
  await P.page.waitForTimeout(2200);
  const afterOk = await readCue(P);
  rec.ok('a server-settled sale plays the coin sound', afterOk.n === before.n + 1, afterOk);
  rec.ok('...through the shared sample path, as coin-pickup',
    afterOk.log.length >= 1 && afterOk.log[afterOk.log.length - 1].key === 'coin-pickup', afterOk.log);
  /* The worker really took the item -- otherwise "a sale happened" is this
     scenario asserting its own send. */
  const bag1 = await H.readState(P, (S) => ((S.rpg || {}).inventory || {}));
  rec.ok('...and the worker really settled it (the bag is two lighter)',
    (bag1[SELLABLE] || 0) === (bag0[SELLABLE] || 0) - 2, { bag0, bag1 });

  /* ── 2. A SALE THE WORKER REFUSES ── THE POINT OF THE FILE ── */
  const beforeBad = await readCue(P);
  /* Far more than the bag holds: shop.js answers "You don't have that many"
     with ok:false, down the same shop_result message the cue hangs off. */
  await sell(P, SELLABLE, 99);
  await P.page.waitForTimeout(2200);
  const afterBad = await readCue(P);
  rec.ok('a REFUSED sale plays no coin sound', afterBad.n === beforeBad.n, afterBad);
  const bag2 = await H.readState(P, (S) => ((S.rpg || {}).inventory || {}));
  rec.ok('...and took nothing from the bag (guard — the refusal was real)',
    (bag2[SELLABLE] || 0) === (bag1[SELLABLE] || 0), { bag1, bag2 });

  /* ── 3. THE SOUND SETTING ── */
  await P.page.evaluate(() => {
    const A = window.BT_AUDIO || (window._gameFns && window._gameFns.BT_AUDIO);
    if (A) A.muted = true;
  });
  const beforeMute = await readCue(P);
  await sell(P, SELLABLE, 1);
  await P.page.waitForTimeout(2200);
  const afterMute = await readCue(P);
  /* The cue still FIRES -- muting is not meant to change the game's logic --
     but the shared path must hand back no source, which is what silence is. */
  rec.ok('with sound off the cue still reaches the audio path (guard)',
    afterMute.n === beforeMute.n + 1, afterMute);
  const lastMuted = afterMute.log[afterMute.log.length - 1];
  rec.ok('...and the sound setting silences it (no source handed back)',
    !!lastMuted && lastMuted.muted === true && lastMuted.got === null, lastMuted || {});
  await P.page.evaluate(() => {
    const A = window.BT_AUDIO || (window._gameFns && window._gameFns.BT_AUDIO);
    if (A) A.muted = false;
  });

  await P.ctx.close().catch(() => {});
}
