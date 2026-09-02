/* v2.3.2228: the exploding slime's death burst has to actually PLAY, at the
 * size it grew to.  Owner, twice: "play the slime explosion animation at the
 * peak swell size", then "I never see the death animation play it swells then
 * freezes."
 *
 * The freeze was a ReferenceError inside _updateMonsters -- a `display` read
 * one line above its own `const` -- thrown on the first frame a fodder slime
 * died.  pixiRenderer.js:323 wraps that whole call in a try/catch that logs
 * ONCE and carries on, so it surfaced as neither a crash nor a pageerror: the
 * monster loop simply aborted at the corpse on every frame of its death
 * window, the corpse never reached its own draw, and every monster ITERATED
 * AFTER IT was skipped entirely -- left holding whatever scale the last good
 * frame put there.  That is the "swells then freezes" the owner saw, and it is
 * why the sabotage run fails on the SECOND slime hardest.
 *
 * Nothing about that is visible in a screenshot (a swollen live slime and a
 * frozen swollen corpse are the same still image) and nothing about it is a
 * syntax error, so precheck was never going to catch it.  Hence the assertion
 * on the renderer's own catch line below: keep it, and keep it reading the
 * console rather than pageerror, because that catch is what stands between a
 * renderer throw and a visible crash.
 *
 * Scale is read through __btMonsterSprite, NOT __btMonHit: that one is written
 * further down the loop, past the dead-monster `continue`, so for a corpse it
 * reports a stale frame from when it was still alive -- which is exactly the
 * window under test here.  An earlier cut of this file used it and "passed"
 * on a frame that no longer existed.
 *
 * Two monsters, because a blue slime takes ONE more branch than raw fodder:
 * MONSTER_VARIANTS has a blueSlime entry (so the variant death branch is
 * consulted) but VARIANT_SPRITES does not (so it falls through to the slime
 * splat).  Both must animate.
 */
import * as H from './harness.mjs';

const spriteOf = (P, id) => P.page.evaluate(
  (mid) => (window.__btMonsterSprite ? window.__btMonsterSprite(mid) : null), id);

const swell = (P, id) => P.page.evaluate((mid) => {
  const S = window._gameState.current;
  const m = S.monsters.find((x) => x.id === mid);
  window.__btDispatch({ type: 'monster_ability', payload: {
    monsterId: mid, zone: S.currentZone, ability: 'burst', phase: 'swell',
    ms: 1600, radius: 110, scale: 3.5, ax: m.x, ay: m.y } });
}, id);

/* execute + kill in one evaluate, the way one server tick emits them. */
const detonate = (P, id) => P.page.evaluate((mid) => {
  const S = window._gameState.current;
  const m = S.monsters.find((x) => x.id === mid);
  window.__btDispatch({ type: 'monster_ability', payload: {
    monsterId: mid, zone: S.currentZone, ability: 'burst', phase: 'execute',
    radius: 110, hit: false, ax: m.x, ay: m.y } });
  if (m) { m.curHp = 0; m.alive = false; }
}, id);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Burster', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  const CASES = [
    { id: 'qa-burst-fodder', arch: 'fodder', label: 'raw fodder' },
    { id: 'qa-burst-blue', arch: 'blueSlime', label: 'the blue slime' },
  ];

  await P.page.evaluate((cases) => {
    const S = window._gameState.current;
    S.monsters = (S.monsters || []).concat(cases.map((c, i) => ({
      /* statuses is not optional -- see the mp-windup note. */
      id: c.id, x: S.player.x + 70 + i * 60, y: S.player.y,
      hp: 100, maxHp: 100, curHp: 100, alive: true,
      arch: c.arch, type: c.arch, level: 3,
      statuses: {}, vx: 0, vy: 0, atkCd: 0,
      spawnX: S.player.x + 70 + i * 60, spawnY: S.player.y,
    })));
  }, CASES);
  await P.page.waitForTimeout(500);

  const idle = {};
  for (const c of CASES) {
    const s = await spriteOf(P, c.id);
    idle[c.id] = s ? s.sx : null;
    rec.ok(`${c.label} renders at its ordinary scale while alive`,
      !!(s && s.sx > 0 && s.visible), { case: c.id, s });
  }

  /* ── swell ── */
  for (const c of CASES) await swell(P, c.id);
  await P.page.waitForTimeout(1500);
  const peak = {};
  for (const c of CASES) {
    const s = await spriteOf(P, c.id);
    peak[c.id] = s ? s.sx : null;
    rec.ok(`${c.label} swells toward peak while the fuse burns`,
      !!(s && s.sx > idle[c.id] * 2.5), { case: c.id, idle: idle[c.id], sx: s && s.sx });
  }

  /* ── detonate ── */
  for (const c of CASES) await detonate(P, c.id);
  await P.page.waitForTimeout(160);   /* inside the ~400ms death burst */

  /* THE assertion the freeze bug needed: the render loop is still standing.
     pixiRenderer catches an entityRenderer throw and logs '[pixi-render]
     entityRenderer threw' exactly once, so a pageerror filter would see
     nothing at all -- match the catch line itself. */
  const thrown = P.logs.filter((l) => /pageerror|entityRenderer threw/.test(l));
  rec.ok('the death frame does not throw (owner: "it swells then freezes")',
    thrown.length === 0, { thrown: thrown.slice(0, 3) });

  for (const c of CASES) {
    const st = await P.page.evaluate((mid) => {
      const S = window._gameState.current;
      const m = S.monsters.find((x) => x.id === mid);
      const s = window.__btMonsterSprite ? window.__btMonsterSprite(mid) : null;
      return {
        deathStart: m ? (m._slimeDeathStart || null) : null,
        burstUntil: m ? (m._burstUntil || 0) : 0,
        peakFrom: m ? (m._burstPeakFrom || 0) : 0,
        sx: s ? s.sx : null, visible: s ? s.visible : null,
      };
    }, c.id);
    rec.ok(`${c.label}'s death animation actually starts`,
      st.deathStart != null && st.visible === true, { case: c.id, st });
    rec.ok(`...and ${c.label} released the fuse, so it is not frozen mid-swell`,
      st.burstUntil === 0 && st.peakFrom > 0, { case: c.id, st });
    rec.ok(`...and ${c.label}'s burst plays at the size it grew to, not back at 1x`,
      st.sx != null && st.sx > idle[c.id] * 2, { case: c.id, idle: idle[c.id], st });
  }

  /* ── and the hold ends with the animation, rather than scaling the splat
        that follows it (the death window is ~400ms; 900 is well clear). */
  await P.page.waitForTimeout(900);
  for (const c of CASES) {
    const s = await spriteOf(P, c.id);
    rec.ok(`...and ${c.label}'s peak hold does not outlive the burst`,
      !s || !s.visible || s.sx <= idle[c.id] * 1.5, { case: c.id, idle: idle[c.id], s });
  }

  await P.ctx.close().catch(() => {});
}
