/* ═══ A FAR-AWAY DEATH IS NOT HEARD, A FAR-AWAY SLAM NOT FELT (v2.3.3228) ═══
 *
 * OPEN-DECISIONS 21 and 22 (the owner, 2026-10-14: "Go recommended").  The
 * Wheel is ONE zone, and the handlers asked only "is it in my zone?", so on
 * every phone in the Wheel:
 *   - every monster's death sound played at one level, wherever it died
 *     (kills still go to every phone: the phone's only news of a far
 *     monster's death -- TRAPS §175);
 *   - every landed slam shook the screen, kicked the camera and beeped, and
 *     every wind-up and miss beeped;
 *   - the bow special's blast boomed, and every slime's burst beeped.
 * Now each goes by how near you are (hitSounds.earVol: all of it within
 * 220 px, none past 1,150), and a death you helped bring about is heard in
 * full wherever it fell (hitSounds.deathVol).
 *
 * The events go in through window.__btDispatch, processGameEvent's own cases
 * (the handler a worker message reaches), for real Wheel monsters' ids, at
 * measured distances from where the player stands.  BT_AUDIO's monsterDeath,
 * play and beep are wrapped to record what they were asked (and still play).
 *
 *   node tools/qa/mp/run.mjs farfeel
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const FAR = 2000, MID = 700, NEAR = 100;

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Faraway', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await H.enterWorld(P);
  let zone = null;
  for (let i = 0; i < 120; i++) {
    zone = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
    if (zone === 'wheel') break;
    await P.page.waitForTimeout(500);
  }
  await P.page.waitForTimeout(2000);
  rec.ok(`setup: in the Wheel (${zone})`, zone === 'wheel', zone);

  /* the recorders, and three real monsters that are not slimes (a slime's
     death sound is its splat, drawn by the renderer) */
  const setup = await P.page.evaluate(() => {
    const A = window.BT_AUDIO;
    const log = window.__qaFar = { deaths: [], plays: [], beeps: [] };
    if (!A.__qaFarWrapped) {
      const md = A.monsterDeath, pl = A.play, bp = A.beep;
      A.monsterDeath = function (arch, opts, k) { log.deaths.push({ arch, k: k === undefined ? 'none' : k }); return md.apply(this, arguments); };
      A.play = function (key, opts) { log.plays.push({ key, vol: opts && opts.vol }); return pl.apply(this, arguments); };
      A.beep = function (f, d, v) { log.beeps.push({ f, v }); return bp.apply(this, arguments); };
      A.__qaFarWrapped = true;
    }
    const S = window._gameState.current;
    const ms = (S.monsters || []).filter((m) => m && m.alive && (m.archetype || m.type) !== 'fodder');
    return { myId: S.myId, n: ms.length, ids: ms.slice(0, 3).map((m) => m.id),
      probe: !!(window.__btHitSounds && window.__btHitSounds.deathVol), dispatch: typeof window.__btDispatch === 'function' };
  });
  rec.ok(`setup: three real monsters to kill by event (of ${setup.n}), the dispatcher and the probe`,
    setup.ids.length === 3 && setup.dispatch, setup);
  if (setup.ids.length < 3 || !setup.dispatch) return;
  const [m1, m2, m3] = setup.ids;

  /* one event, at dx px east of the player, and what it did */
  const fire = (type, payload, dx) => P.page.evaluate(({ type, payload, dx }) => {
    const S = window._gameState.current;
    const log = window.__qaFar;
    log.deaths.length = 0; log.plays.length = 0; log.beeps.length = 0;
    S.screenShake = 0; S._camPunch = null;
    const x = Math.round(S.player.x + dx), y = Math.round(S.player.y);
    const p = Object.assign({ zone: S.currentZone }, payload);
    for (const k of Object.keys(p)) {
      if (p[k] === '$x') p[k] = x;
      if (p[k] === '$y') p[k] = y;
      if (p[k] === '$me') p[k] = S.myId;
      if (Array.isArray(p[k])) p[k] = p[k].map((v) => (v === '$me' ? S.myId : v));
    }
    window.__btDispatch({ type, payload: p });
    return { deaths: log.deaths.slice(), plays: log.plays.slice(), beeps: log.beeps.slice(),
      shake: S.screenShake || 0, punch: S._camPunch ? Math.hypot(S._camPunch.dx, S._camPunch.dy) : 0, at: { x, y } };
  }, { type, payload, dx });
  const r3 = (v) => Math.round(v * 1000) / 1000;

  /* ── 1-3. the death sound ── */
  const k1 = await fire('monster_kill', { monsterId: m1, x: '$x', y: '$y', recipients: ['bp_someone_else'], xp: 0, gold: 0 }, FAR);
  rec.ok(`1. a kill ${FAR} px away that you had no part in: no death sound (it played at full on every phone)`,
    k1.deaths.length === 0, k1);
  const k2 = await fire('monster_kill', { monsterId: m2, x: '$x', y: '$y', recipients: ['bp_someone_else'], xp: 0, gold: 0 }, NEAR);
  rec.ok(`2. a kill ${NEAR} px away: the death sound in full (k ${k2.deaths[0] && k2.deaths[0].k})`,
    k2.deaths.length === 1 && k2.deaths[0].k === 1, k2);
  const k3 = await fire('monster_kill', { monsterId: m3, x: '$x', y: '$y', recipients: ['$me'], xp: 0, gold: 0 }, FAR);
  rec.ok(`3. a kill ${FAR} px away that you took part in: in full (k ${k3.deaths[0] && k3.deaths[0].k})`,
    k3.deaths.length === 1 && k3.deaths[0].k === 1, k3);

  /* ── 4-6. a landed slam ── */
  const slam = { monsterId: m1, ability: 'slam', phase: 'execute', hit: true, radius: 60, x: '$x', y: '$y' };
  const s4 = await fire('monster_ability', slam, FAR);
  rec.ok(`4. a slam that landed ${FAR} px away: no shake, no camera kick, no beep (it shook every screen)`,
    s4.shake === 0 && s4.punch === 0 && s4.beeps.length === 0, s4);
  const s5 = await fire('monster_ability', slam, NEAR);
  rec.ok(`5. a slam that landed ${NEAR} px away: the full shake (${s5.shake}), the camera's kick (${r3(s5.punch)} px) and the beep (${s5.beeps[0] && r3(s5.beeps[0].v)})`,
    s5.shake === 8 && Math.abs(s5.punch - 8) < 0.01 && s5.beeps.length === 1 && Math.abs(s5.beeps[0].v - 0.22) < 1e-6, s5);
  const k6 = ((1 - (MID - 220) / (1150 - 220)) ** 2);
  const s6 = await fire('monster_ability', slam, MID);
  rec.ok(`6. a slam ${MID} px away: a part of each, on the hits' curve (k ${r3(k6)}: shake ${s6.shake}, kick ${r3(s6.punch)}, beep ${s6.beeps[0] && r3(s6.beeps[0].v)})`,
    s6.shake === Math.round(8 * k6) && Math.abs(s6.punch - 8 * k6) < 0.01 && s6.beeps.length === 1 && Math.abs(s6.beeps[0].v - 0.22 * k6) < 1e-6, s6);

  /* ── 7-8. the wind-up and the miss ── */
  /* a wind-up far off, aimed far off */
  const t7 = await fire('monster_ability', { monsterId: m1, ability: 'slam', phase: 'telegraph',
    ms: 900, radius: 60, x: '$x', y: '$y', ax: '$x', ay: '$y' }, FAR);
  rec.ok(`7a. a wind-up ${FAR} px away, aimed there: no warning beep`, t7.beeps.length === 0, t7);
  const me = await H.readState(P, (S) => ({ x: Math.round(S.player.x), y: Math.round(S.player.y) }));
  const t7b = await fire('monster_ability', { monsterId: m1, ability: 'slam', phase: 'telegraph',
    ms: 900, radius: 60, x: '$x', y: '$y', ax: me.x, ay: me.y }, FAR);
  rec.ok(`7b. ...one aimed at you (its caster ${FAR} px off): the warning beep in full (${t7b.beeps[0] && r3(t7b.beeps[0].v)})`,
    t7b.beeps.length === 1 && Math.abs(t7b.beeps[0].v - 0.1) < 1e-6, t7b);
  const s8 = await fire('monster_ability', Object.assign({}, slam, { hit: false }), FAR);
  rec.ok(`8. a slam that missed ${FAR} px away: no beep`, s8.beeps.length === 0 && s8.shake === 0, s8);

  /* ── 9. the bow special's blast ── */
  const b9 = await fire('arrow_boom', { x: '$x', y: '$y', r: 80, id: 'bp_someone_else', targets: [] }, FAR);
  const b9m = await fire('arrow_boom', { x: '$x', y: '$y', r: 80, id: '$me', targets: [] }, FAR);
  const boom = (r) => r.plays.filter((p) => p.key === 'tree-fall');
  rec.ok(`9. another player's bow blast ${FAR} px away: no boom (it boomed on every phone); your own that far: in full (${boom(b9m)[0] && boom(b9m)[0].vol})`,
    boom(b9).length === 0 && boom(b9m).length === 1 && Math.abs(boom(b9m)[0].vol - 0.7) < 1e-6, { b9, b9m });

  /* ── 10. a slime's burst ── */
  const sb = await fire('monster_ability', { monsterId: m1, ability: 'burst', phase: 'execute', hit: false, radius: 110, ax: '$x', ay: '$y' }, FAR);
  const sbN = await fire('monster_ability', { monsterId: m1, ability: 'burst', phase: 'execute', hit: false, radius: 110, ax: '$x', ay: '$y' }, NEAR);
  rec.ok(`10. a slime's burst ${FAR} px away: no beep; ${NEAR} px away: the beep in full`,
    sb.beeps.length === 0 && sbN.beeps.length === 1 && Math.abs(sbN.beeps[0].v - 0.09) < 1e-6, { sb, sbN });

  /* ── 11. the probe's curve ── */
  const curve = await P.page.evaluate(() => {
    const S = window._gameState.current, hs = window.__btHitSounds;
    if (!hs || !hs.deathVol) return { none: 'no deathVol on the probe' };
    const at = (d) => hs.deathVol(null, S.player.x + d, S.player.y);
    return { d0: at(0), d220: at(220), d700: at(700), d1150: at(1150), d3000: at(3000), mine: hs.deathVol({ _killMine: true }, S.player.x + 5000, S.player.y) };
  });
  rec.ok(`11. the death's curve is the hits' own: 1 within 220 px, ${r3(curve.d700)} at 700, 0 from 1,150; 1 for your own kill anywhere`,
    curve.d0 === 1 && curve.d220 === 1 && Math.abs(curve.d700 - k6) < 1e-9 && curve.d1150 === 0 && curve.d3000 === 0 && curve.mine === 1, curve);

  rec.ok('no page errors', errs.length === 0, errs.slice(0, 4));
  /* the runner keeps one browser for every scenario: a Wheel page left open
     goes on drawing (software GL here) and slows the next scenario's clocks */
  await P.ctx.close().catch(() => {});
}
