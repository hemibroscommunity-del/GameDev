/* ═══ v2.3.6801 (card SHOP-gearbag): A PIECE THE WORKER HOLDS IS IN THE PHONE'S BAG ═══
 *
 * The bug: the phone put armour and legs in its bag only from the reply that
 * brought them, so a reply lost to a dropped line left a piece the worker
 * held (and the player paid for) unseen, even after a reload.  The mend:
 * every player_state's lists are adopted by id (src/game/gearAdopt.js,
 * wsClient.js's player_state case).  On an upright phone in the world
 * (BroTown):
 *
 *   A0. the worker's record holds armour and legs in its bag lists (the Test
 *       panel's armour kit: each piece minted with its id, on file);
 *   A1. the phone LOSES its copy of those lists (the replies it never got),
 *       on the page and in its saved copy;
 *   A2. it logs in again: every piece the worker holds is in the phone's bag,
 *       by its id, ONCE (and the worker still holds each once);
 *   A3. Gear's bag side shows them (a tile each);
 *   A4. a second join: still once each, nothing doubled;
 *   B.  no page errors.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const lane = 'full';

const PHONE = { width: 390, height: 844 };
const OUT = join(H.REPO, 'tools/qa/mp/out');
const shot = async (P, name) => { try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: join(OUT, `gearadopt-${name}.png`) }); } catch (e) { /* a picture only */ } };

const LISTS = ['armorStash', 'legsStash'];
/* the phone's bag lists, by id */
const bagOf = (P) => H.readState(P, (S) => {
  const R = S.rpg || {};
  const ids = (l) => (Array.isArray(l) ? l : []).map((p) => (p && p.gid) || null);
  return { armorStash: ids(R.armorStash), legsStash: ids(R.legsStash), worn: [R.armor && R.armor.gid, R.legsArmor && R.legsArmor.gid].filter(Boolean) };
});
const workerBag = async (wsPort, id) => {
  const sv = await H.adminPlayer(wsPort, id);
  const R = (sv && sv.rpg) || {};
  const ids = (l) => (Array.isArray(l) ? l : []).map((p) => (p && p.gid) || null).filter(Boolean);
  return { armorStash: ids(R.armorStash), legsStash: ids(R.legsStash) };
};
/* each id the worker holds is on the phone exactly once */
const onceEach = (want, have) => LISTS.every((f) => want[f].every((g) => have[f].filter((x) => x === g).length === 1));
const waitBag = async (P, want) => {
  let b = await bagOf(P);
  for (let t = 0; t < 60 && !onceEach(want, b); t++) { await P.page.waitForTimeout(250); b = await bagOf(P); }
  return b;
};

export async function run({ browser, wsPort, webPort, rec }) {
  const errors = [];
  const A = await H.newPlayer(browser, { name: 'GearAdopt', wsPort, webPort, viewport: PHONE, touch: true, dpr: 1, world: 'wheel' });
  A.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  await H.enterWorld(A);
  const stop = H.keepAlive(A);
  try {
    const id = await H.readState(A, (S) => S.myId);
    /* A0. the kit twice: the first pieces go on the empty slots, the second
       set into the worker's bag lists (its live stash, gearstash.js) */
    await H.devOp(wsPort, 'kit', id, { what: 'armor' });
    await A.page.waitForTimeout(800);
    await H.devOp(wsPort, 'kit', id, { what: 'armor' });
    await A.page.waitForTimeout(1200);
    const want = await workerBag(wsPort, id);
    rec.ok('A0 the worker\'s record holds armour or legs in its bag, each with its id (guard)', want.armorStash.length + want.legsStash.length > 0, want);

    /* A1. the phone loses its copy of the two lists */
    await A.page.evaluate(() => {
      const S = window._gameState.current;
      S.rpg.armorStash = []; S.rpg.legsStash = [];
      try { localStorage.setItem('bt_rpg', JSON.stringify(S.rpg)); } catch (e) { /* the memory copy is enough */ }
    });
    const lost = await bagOf(A);
    rec.ok('A1 the phone\'s copy of the bag lists is empty (the lost replies)', lost.armorStash.length === 0 && lost.legsStash.length === 0, lost);

    /* A2. log in again: the join's state brings every piece back, once */
    await A.page.reload({ waitUntil: 'domcontentloaded' });
    await H.enterWorld(A);
    const b1 = await waitBag(A, want);
    const sv1 = await workerBag(wsPort, id);
    rec.ok('A2 after the join every piece the worker holds is in the phone\'s bag, by its id, once; the worker holds each once',
      onceEach(want, b1) && LISTS.every((f) => want[f].every((g) => sv1[f].filter((x) => x === g).length === 1)) && !b1.worn.some((g) => b1.armorStash.includes(g) || b1.legsStash.includes(g)),
      { want, b1, sv1 });

    /* A3. Gear's bag side shows them */
    await H.dashOpen(A, 'dashboard');
    await A.page.waitForTimeout(900);
    let tiles = 0;
    for (let t = 0; t < 40; t++) {
      tiles = await A.page.evaluate(() => document.querySelectorAll('[data-gear-bag] [data-bag-key^="stashArmor-"], [data-gear-bag] [data-bag-key^="stashLegs-"]').length);
      if (tiles >= want.armorStash.length + want.legsStash.length) break;
      await A.page.waitForTimeout(250);
    }
    await shot(A, 'A3-gear');
    rec.ok('A3 Gear\'s bag side shows a tile for each piece', tiles === want.armorStash.length + want.legsStash.length, { tiles, want });

    /* A4. a second join: still once each */
    await A.page.reload({ waitUntil: 'domcontentloaded' });
    await H.enterWorld(A);
    await A.page.waitForTimeout(1500);
    const b2 = await waitBag(A, want);
    rec.ok('A4 a second join: each piece still once, nothing doubled',
      onceEach(want, b2) && b2.armorStash.length === b1.armorStash.length && b2.legsStash.length === b1.legsStash.length, { b1, b2 });
  } finally {
    try { stop(); } catch (e) { /* gone */ }
    await A.ctx.close().catch(() => {});
  }
  rec.ok('B no page errors', errors.length === 0, errors.slice(0, 3));
}
