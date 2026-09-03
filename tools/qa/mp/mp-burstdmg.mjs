/* THE EXPLOSION'S DAMAGE SHOWS ON YOU (v2.3.2235).
 *
 * Owner: "One thing I don't think worked was seeing damage numbers on my own
 * health bar (as the floaty disappearing number for damage taken) once slime
 * exploded."
 *
 * The blast is server-rolled: telegraph.js's burst calls _telegraphHitPlayer
 * for every player inside the 110px radius, and that emits monster_attack
 * carrying the resolved dmgTaken.  The client's monster_attack handler ends
 * in an unconditional '-N' floater with the heart -- so if no number appears,
 * the event was dropped before reaching it.  There are exactly two filters
 * upstream that can do that, both written for a different problem (melee
 * "ghost hits" from monsters the client cannot see):
 *
 *   1. the attacker must be in the local monster snapshot
 *   2. the attacker must be within 160px of where the player is NOW
 *
 * A blast is neither of those things.  It is resolved against where the
 * player stood at detonation, by a monster that is in the act of dying, and
 * the natural response to a swelling slime is to RUN -- so both filters are
 * being asked a question about a melee swipe that the explosion cannot
 * answer.  This drives the payload telegraph.js actually builds, against a
 * real server monster, through each of those conditions.
 *
 * Verdant, where blue slimes live, is quest-gated and out of the harness's
 * reach, so the vehicle is a real meadow monster and the burst's own payload
 * shape rather than a real detonation.  The control below is what makes that
 * honest: the same payload DOES float a number when neither filter trips.
 */
import * as H from './harness.mjs';

const burstAttack = (P, id, opts) => P.page.evaluate(({ mid, far, gone, ability }) => {
  const S = window._gameState.current;
  const m = (S.monsters || []).find((x) => x.id === mid);
  const ax = m ? m.x : S.player.x, ay = m ? m.y : S.player.y;
  S.dmgNumbers = [];
  if (far) { S.player.x = ax + 260; S.player.y = ay; }
  else { S.player.x = ax + 40; S.player.y = ay; }
  if (gone) S.monsters = (S.monsters || []).filter((x) => x.id !== mid);
  /* The payload telegraph.js builds, field for field. */
  const payload = { monsterId: mid, targetId: S.myId, dmg: 60, dmgTaken: 47,
    dodged: false, zone: S.currentZone, attackerX: ax, attackerY: ay };
  if (ability) payload.ability = ability;      /* what telegraph.js now sends */
  window.__btDispatch({ type: 'monster_attack', payload });
  return true;
}, { mid: id, far: !!(opts && opts.far), gone: !!(opts && opts.gone),
     ability: (opts && 'ability' in opts) ? opts.ability : 'burst' });

const BLAST = 47;   /* the dmgTaken this file injects -- nothing else deals it */
/* ONLY the injected blast.  The meadow monster is alive and swinging for the
   whole run, and its real '-11's landed in the first version of this file as
   a false PASS on the deploy-order case.  Filtering by the exact number is
   what keeps ambient combat out of the measurement. */
const popped = (P) => P.page.evaluate((want) => (window._gameState.current.dmgNumbers || [])
  .filter((p) => p.text === '-' + want)
  .map((p) => ({ text: p.text, icon: p.iconKey || null })), BLAST);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Blaster', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.currentZone = 'meadow';
    if (S.channel) S.channel.send({ type: 'move', x: 500, y: 500, z: 'meadow' });
  });
  await P.page.waitForTimeout(3000);

  const target = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const m = (S.monsters || []).find((x) => x.alive !== false);
    if (S.rpg) { S.rpg.hp = S.rpg.maxHp; }
    return m ? { id: m.id, srv: !!S._serverMonsters } : null;
  });
  rec.ok('a real server monster to attack us (guard)', !!(target && target.srv), target);
  if (!target) { await P.ctx.close().catch(() => {}); return; }

  /* ── CONTROL: neither filter trips.  If this does not float a number the
       rest of the file means nothing. ── */
  await burstAttack(P, target.id);
  await P.page.waitForTimeout(300);
  const ctrl = await popped(P);
  console.log('    CONTROL (attacker known, player close) -> ' + JSON.stringify(ctrl));
  rec.ok('CONTROL: the blast payload floats a damage number on us',
    ctrl.some((p) => /^-\d/.test(p.text) && p.icon === 'heart'), ctrl);

  /* ── 1. THE PLAYER RAN.  The server decided the hit against where we
       stood at detonation; the client re-asks against where we are NOW. ── */
  await burstAttack(P, target.id, { far: true });
  await P.page.waitForTimeout(300);
  const far = await popped(P);
  console.log('    RAN OUT OF RANGE -> ' + JSON.stringify(far));
  rec.ok('a blast we already took still shows its number after we ran',
    far.some((p) => /^-\d/.test(p.text) && p.icon === 'heart'), far);

  /* ── 2. THE SLIME IS GONE.  It detonates as it dies, so by the time the
       event is read the attacker may no longer be in the snapshot. ── */
  await burstAttack(P, target.id, { gone: true });
  await P.page.waitForTimeout(300);
  const gone = await popped(P);
  console.log('    ATTACKER NOT IN SNAPSHOT -> ' + JSON.stringify(gone));
  rec.ok('a blast from a monster that has died still shows its number',
    gone.some((p) => /^-\d/.test(p.text) && p.icon === 'heart'), gone);

  /* ── DEPLOY ORDER (rule 19): an older worker names no ability, and the
       filters must behave exactly as they did before.  Without this the fix
       reads as "the client stopped filtering", which is a different and
       worse change. ── */
  await burstAttack(P, target.id, { far: true, ability: null });
  await P.page.waitForTimeout(300);
  const oldWorker = await popped(P);
  console.log('    OLD WORKER (no ability tag), player far -> ' + JSON.stringify(oldWorker));
  rec.ok('against a worker that does not tag the hit, the old filtering stands',
    oldWorker.length === 0, oldWorker);

  await P.ctx.close().catch(() => {});
}
