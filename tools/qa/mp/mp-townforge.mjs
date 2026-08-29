/* FORGING A WEAPON REACHES THE WORKER (v2.3.2077).
 *
 * `forge_weapon` was gated on `S._serverMonsters && S.channel`, and that flag
 * is FALSE in town -- it means "this zone has server-managed monsters", and
 * wsClient sets it false on an empty monster list. The blacksmith and the
 * woodworker are both TOWN buildings, so forging had never reached the worker
 * at all: the client spent the ore and the coins and minted the weapon
 * locally, and the server's blob -- which owns all three -- reconciled every
 * bit of it away on the next player_state. See TRAPS §32.
 *
 * The server's half was never the problem and is well covered by unit tests
 * (mint shape, prototype tierKeys, prog3 stat gates, the threat lock). What
 * had no coverage at all was whether the request ARRIVES, which is exactly
 * the half that was broken -- so this drives the real forge panel and then
 * asks the WORKER what it thinks the player owns.
 */
import * as H from './harness.mjs';

const ORE = 'wood_pine_log';     // v2.3.2123: BLACKSMITH_TIERS.wood consumes the first tree's log (3 + 8g, Lv1, no stat req) -- it asked for ore_wood_ore, which nothing produces
const NEED_ORE = 3, NEED_GOLD = 8;

const put = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState.current;
  S.player.x = px; S.player.y = py; S.player.vx = 0; S.player.vy = 0;
}, { px: x, py: y });

const srv = async (wsPort, id) => {
  const p = await H.adminPlayer(wsPort, id);
  const rpg = (p && p.rpg) || {};
  return {
    ore: ((rpg.inventory || {})[ORE]) || 0,
    coins: typeof rpg.coins === 'number' ? rpg.coins : ((p.live && p.live.coins) || 0),
    weapon: rpg.weapon ? (rpg.weapon.name || 'unnamed') : null,
    stash: Array.isArray(rpg.weaponStash) ? rpg.weaponStash.length : 0,
  };
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Smith', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2600);
  const id = await H.readState(P, (S) => S.myId);

  await H.grant(wsPort, id, 'item', { invKey: ORE, count: 8 });
  await H.grant(wsPort, id, 'gold', { amount: 300 });
  await P.page.waitForTimeout(1600);
  const before = await srv(wsPort, id);
  rec.ok(`the worker has the makings (${before.ore} ore, ${before.coins}g)`,
    before.ore >= NEED_ORE && before.coins >= NEED_GOLD, before);

  /* Stand at the forge door and open it the way the prompt tells you to. */
  const forge = await P.page.evaluate(() => {
    const f = window._gameFns;
    const p = (f.propsForZone ? f.propsForZone('town') : []).find((q) => q.id === 'forge');
    return p ? { x: p.x, y: p.y } : null;
  }).catch(() => null);
  const at = forge || { x: 480, y: 900 };
  await put(P, at.x, at.y + 55);
  await P.page.waitForTimeout(700);
  await P.page.keyboard.press('e');
  await P.page.waitForTimeout(1100);
  const open = await H.seesText(P, 'Forge');
  rec.ok('the forge panel opens', open, { at });

  /* The wood tier is the one a fresh character can actually make: Lv1, no
     stat requirement, 3 ore and 8 gold. Its button is the first enabled
     Forge button in the panel. */
  const pressed = await P.page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
      .filter((b) => /forge/i.test(b.textContent || '') && !b.disabled);
    if (!btns.length) return { ok: false, seen: [...document.querySelectorAll('button')].map((b) => b.textContent.trim()).slice(0, 12) };
    btns[0].click();
    return { ok: true, label: btns[0].textContent.trim() };
  });
  rec.ok(`an affordable tier could be forged (${pressed.label || 'none enabled'})`,
    pressed.ok === true, pressed);

  await P.page.waitForTimeout(2400);
  const after = await srv(wsPort, id);

  /* THE ASSERTION: the worker's own blob, not the client's. */
  rec.ok(`the WORKER spent the ore (${before.ore} -> ${after.ore})`,
    after.ore === before.ore - NEED_ORE, { before, after });
  rec.ok(`...and the coins (${before.coins} -> ${after.coins})`,
    after.coins === before.coins - NEED_GOLD, { before, after });
  rec.ok(`...and holds the weapon it minted (${after.weapon})`,
    !!after.weapon, { before, after });

  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await P.ctx.close();
}
