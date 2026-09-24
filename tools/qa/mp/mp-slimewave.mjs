/* v2.3.2912: THE SLIME BURST'S SHOCKWAVE, AND WHO GETS SHAKEN.
 *
 * Owner: "when the slime explodes make an explosion effect like a shockwave
 * in the damage area.  Also if you're within damage radius when it explodes
 * make the screen do a little shake".
 *
 * Drives the worker's own swell/execute payloads (same shape as
 * mp-slimeburst) against two blue slimes: one with the player INSIDE its
 * 110 radius, one well OUTSIDE it.  Checks the wave is drawn at the worker's
 * centre and radius, that it is gone again in well under a second, and that
 * only the inside blast kicks the camera.  Saves a mid-wave picture
 * (SHOTDIR, default the OS temp dir) for eyes.
 */
import * as H from './harness.mjs';
import { tmpdir } from 'node:os';

/* The blast centre is given relative to where the player stands, not read
   off the injected monster: the worker is authoritative for S.monsters and
   can rewrite an injected entry between evaluates, and the execute payload
   carries its own ax/ay anyway. */
const detonate = (P, id, dx) => P.page.evaluate(([mid, off]) => {
  const S = window._gameState.current;
  const m = S.monsters.find((x) => x.id === mid);
  const ax = Math.round(S.player.x + off), ay = Math.round(S.player.y);
  S.screenShake = 0;
  window.__btDispatch({ type: 'monster_ability', payload: {
    monsterId: mid, zone: S.currentZone, ability: 'burst', phase: 'execute',
    radius: 110, hit: false, ax, ay } });
  if (m) { m.curHp = 0; m.alive = false; }
  return { shake: S.screenShake || 0, x: ax, y: ay };
}, [id, dx]);

const pr = (P) => P.page.evaluate(() => (window._pixiRenderer && window._pixiRenderer.slimeShockwaveProbe)
  ? window._pixiRenderer.slimeShockwaveProbe() : null);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Wave', wsPort, webPort, viewport: { width: 390, height: 844 } });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  const CASES = [
    { id: 'qa-wave-near', dx: 60, inside: true },
    { id: 'qa-wave-far', dx: 320, inside: false },
  ];
  await P.page.evaluate((cases) => {
    const S = window._gameState.current;
    S.monsters = (S.monsters || []).concat(cases.map((c) => ({
      id: c.id, x: S.player.x + c.dx, y: S.player.y,
      hp: 100, maxHp: 100, curHp: 100, alive: true,
      arch: 'blueSlime', type: 'blueSlime', level: 3,
      statuses: {}, vx: 0, vy: 0, atkCd: 0,
      spawnX: S.player.x + c.dx, spawnY: S.player.y,
    })));
  }, CASES);
  await P.page.waitForTimeout(400);

  rec.ok('the shockwave probe is published (guard)', !!(await pr(P)));

  for (const c of CASES) {
    const d = await detonate(P, c.id, c.dx);
    rec.ok(`${c.inside ? 'inside' : 'outside'} the radius: the screen ${c.inside ? 'shakes' : 'stays still'}`,
      c.inside ? d.shake > 0 : d.shake === 0, { d });
    await P.page.waitForTimeout(110);
    const p = await pr(P);
    rec.ok(`${c.inside ? 'near' : 'far'} blast: a shockwave is drawn at the worker's centre and radius`,
      !!(p && p.playing >= 1 && p.drawn.some((w) => w.x === d.x && w.y === d.y && w.r === 110)), { p, d });

    await P.page.waitForTimeout(700);
    const after = await pr(P);
    rec.ok(`${c.inside ? 'near' : 'far'} blast: the wave is over within a second`, !!(after && after.playing === 0), { after });
  }
  /* A picture for eyes.  Headless screenshots take a few hundred ms each --
     longer than the whole 460ms wave -- so it is slowed 10x for the photo
     (window.__btSlimeWaveMs, a QA-only override) and shot three times. */
  await P.page.evaluate(() => { window.__btSlimeWaveMs = 4600; });
  await detonate(P, CASES[0].id, CASES[0].dx);
  for (const k of [0, 1, 2]) {
    await P.page.waitForTimeout(k === 0 ? 150 : 900);
    await P.page.screenshot({ path: `${process.env.SHOTDIR || tmpdir()}/slimewave-${k}.png`, clip: { x: 45, y: 250, width: 300, height: 300 } });
  }
  await P.page.evaluate(() => { delete window.__btSlimeWaveMs; });

  const thrown = P.logs.filter((l) => /pageerror|threw/.test(l));
  rec.ok('nothing threw', thrown.length === 0, { thrown: thrown.slice(0, 3) });
  await P.ctx.close().catch(() => {});
}
