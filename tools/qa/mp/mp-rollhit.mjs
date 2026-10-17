/* ═══ A HIT THAT LANDS MID-ROLL SHOWS ITS NUMBER (v2.3.3300) ═══
 *
 * The worker decides whether a roll slips a monster's blow now (hit-door.md
 * decision 4: movement.js _rollIFrames, a dodge or a lunge inside the window
 * it charged for), and a blow it slipped sends nothing.  So a monster_attack
 * that reaches a rolling phone LANDED -- the snow pile, fire, a storm's arc,
 * a retreat shot's roll, or a blow judged a moment before the worker heard of
 * the roll -- and its HP is off the bar.  The phone hid every monster hit's
 * number while it rolled (gameEvents.js, "in i-frames"), so the bar dropped
 * with nothing said.
 *
 * The events go in through window.__btDispatch, processGameEvent's own case
 * (the handler a worker message reaches), from a real Wheel monster's id at
 * the player's side, and the popups are read off S.dmgNumbers:
 *   1. a landed hit while rolling shows its "-N" (nothing on the code before);
 *   2. the same hit standing still shows it too (the guard: the hit reaches);
 *   3. a burn's tick while rolling shows, as it always did;
 *   4. no page errors.
 *
 *   node tools/qa/mp/run.mjs rollhit
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  /* v2.3.3318: every Wheel monster on the way in, as before (`wheelwhole`,
     server/src/wheelnear.js): this reads a real monster off the arrival's list in Brotown's square */
  const P = await H.newPlayer(browser, { name: 'Roller', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query: 'wheelwhole' });
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
    return { dispatch: typeof window.__btDispatch === 'function', mid: m ? m.id : null, n: (S.monsters || []).length, srv: !!S._serverMonsters };
  });
  rec.ok(`setup: in the Wheel (${zone}), the dispatcher, server monsters, a real monster in the snapshot (of ${setup.n})`,
    zone === 'wheel' && setup.dispatch && setup.srv && !!setup.mid, setup);
  if (!setup.dispatch || !setup.mid) return;

  /* one landed hit from that monster at the player's side, rolling or not,
     and the popups it drew */
  const hit = (rolling, extra) => P.page.evaluate(({ rolling, extra, mid }) => {
    const S = window._gameState.current;
    S.dmgNumbers.length = 0;
    S._dodgeRoll = rolling ? { angle: 0, startTime: Date.now() } : null;
    const hp = Math.round((S.rpg && S.rpg.hp) || 0);
    const p = Object.assign({
      monsterId: mid, targetId: S.myId, dmg: 12, dmgTaken: 12, dodged: false,
      hp: Math.max(1, hp - 12), zone: S.currentZone,
      attackerX: Math.round(S.player.x + 20), attackerY: Math.round(S.player.y),
    }, extra);
    window.__btDispatch({ type: 'monster_attack', payload: p });
    const out = S.dmgNumbers.map((d) => String(d.text));
    S._dodgeRoll = null;
    return out;
  }, { rolling, extra, mid: setup.mid });

  const mid = await hit(true, {});
  rec.ok('1. a hit that lands mid-roll shows its number (the worker landed it)', mid.some((t) => /^-\d/.test(t)), mid);
  const still = await hit(false, {});
  rec.ok('2. the same hit standing still shows it too (guard: the hit reaches the popup)', still.some((t) => /^-\d/.test(t)), still);
  const tick = await hit(true, { ability: 'burn', elem: 'flame', attackerX: undefined, attackerY: undefined });
  rec.ok('3. a burn\'s tick mid-roll shows, as it always did', tick.some((t) => /^-\d/.test(t)), tick);
  rec.ok('4. no page errors', errs.length === 0, errs);
}
