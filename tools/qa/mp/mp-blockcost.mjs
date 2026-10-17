/* ═══ A BLOCK'S COST ON THE PHONE IS THE WORKER'S (v2.3.3297) ═══
 *
 * The worker names a blocked hit's stamina cost (`staminaDrain` on its
 * monster_attack) whenever it charges one, and leaves it off on purpose when
 * it charges nothing: a PARRY pays stamina back (v2.3.1731), and a snowball
 * is free to block.  The phone read a missing cost as 15 -- the cost before
 * v2.3.1731 -- so both drew "-15⚡" under "Blocked!".
 *
 * The events go in through window.__btDispatch, processGameEvent's own case
 * (the handler a worker message reaches), from a real Wheel monster's id at
 * the player's side, and the popups are read off S.dmgNumbers:
 *   1. a block the worker charged 10 for says "Blocked!" and "-10⚡";
 *   2. a parried block (no cost named) says "Blocked!" and no "⚡";
 *   3. a free block (a snowball, no cost named) says "Blocked!" and no "⚡";
 *   4. no page errors.
 *
 *   node tools/qa/mp/run.mjs blockcost
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Blocker', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await H.enterWorld(P);
  let zone = null;
  for (let i = 0; i < 120; i++) {
    zone = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
    if (zone === 'wheel') break;
    await P.page.waitForTimeout(500);
  }
  await P.page.waitForTimeout(1500);
  const setup = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const m = (S.monsters || []).find((x) => x && x.alive);
    return { dispatch: typeof window.__btDispatch === 'function', mid: m ? m.id : null, n: (S.monsters || []).length };
  });
  rec.ok(`setup: in the Wheel (${zone}), the dispatcher, a real monster in the snapshot (of ${setup.n})`,
    zone === 'wheel' && setup.dispatch && !!setup.mid, setup);
  if (!setup.dispatch || !setup.mid) return;

  /* one blocked hit from that monster at the player's side, and the popups */
  const block = (extra) => P.page.evaluate(({ extra, mid }) => {
    const S = window._gameState.current;
    S.dmgNumbers.length = 0;
    const p = Object.assign({
      monsterId: mid, targetId: S.myId, dmg: 30, dmgTaken: 0, dodged: false, blocked: true,
      hp: Math.round((S.rpg && S.rpg.hp) || 0), zone: S.currentZone,
      attackerX: Math.round(S.player.x + 20), attackerY: Math.round(S.player.y),
    }, extra);
    window.__btDispatch({ type: 'monster_attack', payload: p });
    return S.dmgNumbers.map((d) => String(d.text));
  }, { extra, mid: setup.mid });

  const paid = await block({ staminaDrain: 10 });
  rec.ok('1. a block the worker charged 10 for: "Blocked!" and "-10⚡"', paid.includes('Blocked!') && paid.includes('-10⚡'), paid);
  const parried = await block({ parried: true });
  rec.ok('2. a parry names no cost and shows none -- it paid stamina back', parried.includes('Blocked!') && !parried.some((t) => t.includes('⚡')), parried);
  const free = await block({});
  rec.ok('3. a free block (a snowball) shows no cost', free.includes('Blocked!') && !free.some((t) => t.includes('⚡')), free);
  rec.ok('4. no page errors', errs.length === 0, errs);
}
