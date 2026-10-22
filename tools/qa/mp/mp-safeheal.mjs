/* ═══ BROTOWN'S SAFE GROUND HEALS YOU QUICKLY, ON A PHONE (v2.3.3569,
 * docs/specs/safe-ground-heal.md) ═══
 *
 * The owner: "Yes standing on the safe ground should heal you quickly."  One
 * real player against a real worker, on a phone (390 x 844, touch), in the
 * world, standing in BroTown where they arrive:
 *   1. knocked down to a tenth of the bar (the dev vitals lever, which is no
 *      hit: out of a fight), the bar on the phone climbs back to full in about
 *      seven seconds, about a tenth of it at a time;
 *   2. with `safeheal: false` (the kill switch) the same tenth climbs only the
 *      wilds' trickle in the same time -- the minute-long wait this fixes;
 *   3. the switch cleared, it is quick again;
 *   4. no page errors.
 * The rule's fight, duel, race and edge cases are the server suite's
 * (server/test/safe-heal.test.mjs); here is what a player sees.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Healbro', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 2 });
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  try {
    await H.enterWorld(P);
    const zoneNow = () => H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
    const t0z = Date.now();
    while (Date.now() - t0z < 60000 && (await zoneNow()) !== 'wheel') await P.page.waitForTimeout(400);
    const id = await H.readState(P, (S) => S.myId);
    const bar = () => H.readState(P, (S) => ({ hp: S.rpg && S.rpg.hp, max: S.rpg && S.rpg.maxHp, zone: S.currentZone }));

    /* knocked down to a tenth, then sampled every 250 ms for `ms` */
    const climb = async (ms) => {
      const b0 = await bar();
      const low = Math.max(1, Math.floor((b0.max || 250) * 0.1));
      await H.devOp(wsPort, 'vitals', id, { hp: low });
      const tLow = Date.now();
      while (Date.now() - tLow < 8000) {   /* the echo of the knock-down */
        const b = await bar();
        if (b.hp <= low + Math.ceil(b.max * 0.11)) break;
        await P.page.waitForTimeout(100);
      }
      const t0 = Date.now();
      const seen = [];
      let fullAt = null;
      while (Date.now() - t0 < ms) {
        const b = await bar();
        seen.push(b.hp);
        if (fullAt == null && b.hp >= b.max) fullAt = Date.now() - t0;
        await P.page.waitForTimeout(250);
      }
      const last = await bar();
      return { low, max: last.max, end: last.hp, fullAt, steps: [...new Set(seen)].slice(0, 16), zone: last.zone };
    };

    /* 1: quick */
    const a = await climb(12000);
    await P.page.screenshot({ path: join(OUT, 'safe-heal-town.png') }).catch(() => {});
    rec.ok(`1: in BroTown, from ${a.low} of ${a.max} the bar on the phone is full in ${a.fullAt == null ? 'never' : (a.fullAt / 1000).toFixed(1) + ' s'} (climbing ${a.steps.join(' > ')})`,
      a.zone === 'wheel' && a.fullAt != null && a.fullAt <= 11000 && a.end === a.max, a);

    /* 2: the kill switch -- the wilds' trickle */
    await H.liveFlag(wsPort, 'safeheal', false);
    const b = await climb(8000);
    rec.ok(`2: with \`safeheal: false\` the same knock-down climbs only to ${b.end} of ${b.max} in 8 s -- the minute-long wait it fixes`,
      b.end < b.max * 0.4 && b.end > b.low, b);

    /* 3: back on */
    await H.liveFlag(wsPort, 'safeheal', null);
    const c = await climb(12000);
    rec.ok(`3: the switch cleared, full again in ${c.fullAt == null ? 'never' : (c.fullAt / 1000).toFixed(1) + ' s'}`,
      c.fullAt != null && c.fullAt <= 11000, c);

    rec.ok('4: no page errors', errs.length === 0, errs.slice(0, 3));
  } finally {
    await H.liveFlag(wsPort, 'safeheal', null).catch(() => {});
    await P.ctx.close().catch(() => {});
  }
}
