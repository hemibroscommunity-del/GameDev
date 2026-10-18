/* ═══ mp-monsternoise (v2.3.3340): THE MONSTERS' OWN NOISES ═══
 *
 * The owner, with four recordings: the "growl and rawr" for the fire goblins,
 * the "rattling bones" for the skeleton form of the mummy, the bouncy jelly
 * for the slimes, the beast snarling for the snowmen
 * (game/monsterNoises.js; the clips cut by tools/audio/cut_monster_noises.py).
 *
 * On a phone in the Wheel:
 *   1. the table: snowman snarls, every slime (fodder and its reskins)
 *      bounces, the fire goblin rawrs, the skeleton rattles, the mummy (its
 *      first form) and the kinds with no recording are silent;
 *   2. the four clips are in the sound manifest the game loads;
 *   3. a snowman noticing you from 1,500 px is not heard (the hits' curve,
 *      hitSounds earVol, ends at 1,150);
 *   4. a mummy shedding into its skeleton rattles its bones;
 *   5. REAL monsters, out on Frost Ridge, in the Verdant Wilds and in the
 *      Flame Fields: one that notices you calls with its noise (the worker's
 *      `tg` edge, the same one as the "!" over its head), one that keeps
 *      chasing you calls again now and then, never more often than its own
 *      limit, and never two calls closer than the limit between any two.
 * God mode while out there: the noises are the test, not surviving the pack.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const LANDS = [
  { home: 'frost', kind: 'snowman', clip: 'snowman-snarl' },
  { home: 'verdant', kind: 'slime', clip: 'slime-bounce' },
  { home: 'ember', kind: 'fire goblin', clip: 'goblin-rawr' },
];

const log = (P) => P.page.evaluate(() => (window.__btMonsterNoises || []).slice());

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Listener', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
  const stopAlive = H.keepAlive(P);
  try {
    await H.enterWorld(P);
    await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l,
      { timeout: 120000, label: 'in the Wheel' }).catch(() => null);
    await P.page.waitForTimeout(1500);
    const myId = await H.readState(P, (S) => S.myId);
    await H.openLands(P, wsPort);

    /* ── 1. the table ── */
    const map = await P.page.evaluate(() => {
      const Q = window.__btMonsterNoiseQA;
      if (!Q) return null;
      const o = {};
      for (const a of ['snowman', 'fodder', 'blueSlime', 'mossSlime', 'fireGoblin', 'skeleton', 'mummy', 'mireWisp', 'rockmonster', 'fishman']) {
        o[a] = Q.noiseOf({ archetype: a });
      }
      return o;
    });
    /* the mummy and the mire wisp are fodder underneath, as the slimes are:
       neither may borrow the slime's bounce */
    rec.ok('the snowman snarls, every slime bounces, the fire goblin rawrs, the skeleton rattles; the mummy, the wisp and the kinds with no recording are silent',
      !!map && map.snowman === 'snowman-snarl' && map.fodder === 'slime-bounce' && map.blueSlime === 'slime-bounce'
        && map.mossSlime === 'slime-bounce' && map.fireGoblin === 'goblin-rawr' && map.skeleton === 'skeleton-rattle'
        && map.mummy === null && map.mireWisp === null && map.rockmonster === null && map.fishman === null, map);

    /* ── 2. the clips ── */
    const clips = await P.page.evaluate(() => {
      const A = window.BT_AUDIO;
      if (!A) return null;
      return ['goblin-rawr', 'skeleton-rattle', 'slime-bounce', 'snowman-snarl'].map((k) => ({
        k, inManifest: !!(A.SFX_MANIFEST && A.SFX_MANIFEST['noise-' + k]),
        decoded: !!(A._samples && A._samples['noise-' + k]), ctx: !!A.ctx,
      }));
    });
    rec.ok('the four clips are in the sound manifest the game loads', !!clips && clips.every((c) => c.inManifest), clips);
    if (clips && clips[0] && clips[0].ctx) {
      rec.ok('...and decoded, ready to play', clips.every((c) => c.decoded), clips);
    }

    /* ── 3. far away: not heard ── */
    const far = await P.page.evaluate(() => {
      const S = window._gameState.current;
      return window.__btMonsterNoiseQA.notice({ id: 'qa-far', archetype: 'snowman', alive: true, x: S.player.x + 1500, y: S.player.y });
    });
    rec.ok('a snowman noticing you from 1,500 px away is not heard', far === false, far);

    /* ── 4. the shed ── */
    await P.page.waitForTimeout(1100);
    const shed = await P.page.evaluate(() => {
      const S = window._gameState.current;
      window.__btMonsterNoises = [];
      const ok = window.__btMonsterNoiseQA.shed({ id: 'qa-skel', archetype: 'skeleton', alive: true, x: S.player.x + 60, y: S.player.y });
      return { ok, log: (window.__btMonsterNoises || []).slice(), last: window.BT_AUDIO && window.BT_AUDIO._lastMonsterNoise };
    });
    rec.ok('a mummy shedding into its skeleton rattles its bones',
      shed.ok === true && shed.log.some((e) => e.clip === 'skeleton-rattle' && e.why === 'shed') && shed.last === 'skeleton-rattle', shed);

    /* ── 5. real monsters ── */
    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const consts = await P.page.evaluate(() => window.__btMonsterNoiseQA.consts);
    for (const L of LANDS) {
      const at = WHEEL_SPAWNS[L.home] && WHEEL_SPAWNS[L.home].points && WHEEL_SPAWNS[L.home].points[0];
      if (!at) { rec.skip(`${L.kind}: a real one's noise`, `no spawn point for ${L.home}`); continue; }
      await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 5 });
      await H.hopTo(P, at[0] + 150, at[1] + 150, { tries: 300 });
      await P.page.evaluate(() => { window.__btMonsterNoises = []; });
      /* wait to be noticed: step beside the nearest monster not on us yet */
      let L1 = [];
      const t0 = Date.now();
      while (Date.now() - t0 < 45000) {
        L1 = await log(P);
        if (L1.some((e) => e.why === 'notice' && e.clip === L.clip)) break;
        const near = await P.page.evaluate(() => {
          const S = window._gameState.current;
          const ms = (S.monsters || []).filter((m) => m && m.alive !== false && m.tg !== S.myId)
            .map((m) => ({ id: m.id, x: m.x, y: m.y, d: Math.hypot(m.x - S.player.x, m.y - S.player.y) }))
            .sort((a, b) => a.d - b.d);
          return ms[0] || null;
        });
        if (near && near.d > 90) await H.hopTo(P, near.x - 50, near.y, { tries: 12 });
        await P.page.waitForTimeout(1200);
      }
      const notice = L1.find((e) => e.why === 'notice' && e.clip === L.clip);
      rec.ok(`${L.kind}: a real one that notices you calls with its noise (${L.clip}, heard at ${notice ? notice.k : '?'})`,
        !!notice && notice.k > 0, L1.slice(-8));
      /* stay in the pack: one keeps chasing, and calls again */
      const t1 = Date.now();
      let L2 = L1;
      while (Date.now() - t1 < 25000) {
        L2 = await log(P);
        if (L2.some((e) => e.why === 'chase' && e.clip === L.clip)) break;
        await P.page.waitForTimeout(1000);
      }
      rec.ok(`${L.kind}: ...and now and then while it chases you`, L2.some((e) => e.why === 'chase' && e.clip === L.clip), L2.slice(-8));
      const gaps = L2.slice(1).map((e, i) => e.at - L2[i].at);
      const perMon = [];
      const lastOf = Object.create(null);
      for (const e of L2) {
        if (lastOf[e.id] != null) perMon.push(e.at - lastOf[e.id]);
        lastOf[e.id] = e.at;
      }
      rec.ok(`${L.kind}: ...never two calls closer than ${consts.GAP_MS} ms, never one monster's closer than ${consts.PER_MONSTER_MS} ms (${L2.length} calls)`,
        gaps.every((g) => g >= consts.GAP_MS - 20) && perMon.every((g) => g >= consts.PER_MONSTER_MS - 20), { gaps, perMon });
      await H.devOp(wsPort, 'vitals', myId, { heal: true, god: false });
    }
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}
