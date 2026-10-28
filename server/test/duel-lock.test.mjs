/* ═══ v2.3.3713: THE DUEL LOCK, THE PHONE'S HALF (src/game/duelLock.js) ═══
 *
 * Found by mp-arena, the first tournament played on phones in the world: a
 * gladiator who walked out of view and back swung for ninety seconds and
 * landed nothing -- the lock kept the peer object of the moment it was taken,
 * and coming back into view made a new one.  keepDuelLock (run each frame by
 * targeting.js updateTargeting):
 *   1. a player lock re-points at the peer drawn NOW, by id;
 *   2. an arena match's lock takes the moment the opponent is drawn (the
 *      match's start could only lock an opponent drawn then);
 *   3. ...but a plain duel never locks by itself (a tap is the player's), and
 *      a monster lock is left alone;
 *   4. lockOntoDuelOpponent does nothing for an opponent not drawn.
 */
const L = await import('../../src/game/duelLock.js');

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

/* ── 1. a player lock follows its peer ── */
{
  const old = { x: 10, y: 10 }, now = { x: 400, y: 300 };
  const S = { others: { bp_b: now }, lockedTarget: { type: 'player', id: 'bp_b', ref: old }, _inDuel: { opponent: 'bp_b', arena: 'm1' } };
  L.keepDuelLock(S);
  check('1. a player lock re-points at the peer drawn now (the old object was dropped out of view)', S.lockedTarget.ref === now && S.lockedTarget.id === 'bp_b', S.lockedTarget);
  const S2 = { others: {}, lockedTarget: { type: 'player', id: 'bp_b', ref: old } };
  L.keepDuelLock(S2);
  check('...and with the peer not drawn it is left as it is (nothing invented)', S2.lockedTarget.ref === old);
}

/* ── 2. an arena match locks on sight ── */
{
  const foe = { x: 1, y: 2 };
  const S = { others: {}, lockedTarget: null, _inDuel: { opponent: 'bp_b', arena: 'm1' } };
  L.keepDuelLock(S);
  check('2. an arena match with the opponent not drawn: no lock yet', S.lockedTarget === null);
  S.others.bp_b = foe;
  L.keepDuelLock(S);
  check('...and the moment they are drawn, the lock takes', !!S.lockedTarget && S.lockedTarget.type === 'player' && S.lockedTarget.id === 'bp_b' && S.lockedTarget.ref === foe, S.lockedTarget);
}

/* ── 3. a plain duel, and a monster lock ── */
{
  const S = { others: { bp_b: {} }, lockedTarget: null, _inDuel: { opponent: 'bp_b' } };
  L.keepDuelLock(S);
  check('3. a plain duel never locks by itself (a tap is the player\'s)', S.lockedTarget === null);
  const mon = { id: 7 };
  const S2 = { others: { bp_b: {} }, lockedTarget: { type: 'monster', id: 7, ref: mon }, _inDuel: { opponent: 'bp_b', arena: 'm1' } };
  L.keepDuelLock(S2);
  check('...and a monster lock is left alone', S2.lockedTarget.type === 'monster' && S2.lockedTarget.ref === mon);
  L.keepDuelLock(null);
  L.keepDuelLock({});
  check('...and no state, or an empty one, is no error', true);
}

/* ── 4. lockOntoDuelOpponent ── */
{
  const S = { others: {}, lockedTarget: null };
  check('4. lockOntoDuelOpponent with the opponent not drawn does nothing', L.lockOntoDuelOpponent(S, 'bp_b') === false && S.lockedTarget === null);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) { console.log(`${failed} FAILURE(S)`); process.exit(1); }
console.log('ALL PASS');
