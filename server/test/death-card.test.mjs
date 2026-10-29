/* ═══ v2.3.3817: THE DEATH CARD (src/game/deathCard.js) ═══
 *
 * A death says what happened: a card over the scene for the five seconds to
 * the worker's respawn ("You died", what killed you, "Back in BroTown in N"),
 * then one line in the chat once you are back.
 *
 *   1. what killed you, from the worker's cause: a monster by its plate's
 *      name (a boss's "Boss "), a burning heap, a player in No man's land by
 *      name; an unknown monster or player is "a monster" / "a player"; the
 *      watchdog's `stuck-at-zero` names nobody;
 *   2. the card: its words, counting down from the worker's respawnInMs (5 s
 *      when it says none, never past 30), held at "in 0" a moment for a late
 *      respawn, then gone; the dungeon's "Your bag is safe"; No man's land's
 *      loss once the worker has said it;
 *   3. the chat's line once you are back, and the card gone with it -- never
 *      a line for a death that never was, nor for one long before;
 *      "in No man's land" only for a death there (the worker's pvp:<id> is a
 *      duel's, a spar's and a war's too: the review of v2.3.3817);
 *   4. the wiring, read from the source: wsClient's player_died notes it with
 *      the plate's name, nml_loss adds the loss, respawn.js says the line,
 *      BroTown mounts the card, and the card never takes a tap.
 */
import { readFileSync } from 'node:fs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

const root = new URL('../../', import.meta.url);
const src = (p) => readFileSync(new URL(p, root), 'utf8');
const D = await import('../../src/game/deathCard.js');

const name = { monsterName: (m) => ({ blueSlime: 'Blue Slime', bogLurker: 'Bog Lurker' })[m.archetype] || 'Monster' };
const S0 = () => ({
  monsters: [{ id: 'wm-verdant-28', archetype: 'blueSlime' }, { id: 'boss-1', archetype: 'bogLurker', boss: true }],
  others: { bp_raider: { name: 'Raider' }, bp_blank: { name: '  ' } },
});

/* ── 1. what killed you ── */
{
  const S = S0();
  check('1a a monster by its plate\'s name', D.killerOf(S, 'monster:wm-verdant-28', name).name === 'Blue Slime');
  check('1b a boss is "Boss <name>"', D.killerOf(S, 'monster:boss-1', name).name === 'Boss Bog Lurker');
  check('1c a monster no longer in the list is "a monster"', D.killerOf(S, 'monster:gone', name).name === 'a monster');
  check('1d a burning heap', D.killerOf(S, 'monster:heap', name).name === 'a burning heap');
  const p = D.killerOf(S, 'pvp:bp_raider', name);
  check('1e a player in No man\'s land by name', p.name === 'Raider' && p.pvp === true, p);
  check('1f a player with no name, or one not here, is "a player"', D.killerOf(S, 'pvp:bp_blank').name === 'a player' && D.killerOf(S, 'pvp:bp_x').name === 'a player');
  check('1g the watchdog\'s stuck-at-zero, or no cause, names nobody', D.killerOf(S, 'stuck-at-zero') === null && D.killerOf(S, undefined) === null);
}

/* ── 2. the card ── */
{
  const S = S0();
  D.noteDeath(S, { cause: 'monster:wm-verdant-28', respawnInMs: 5000 }, 1000, name);
  S.monsters = [];   /* the respawn empties the list; the card keeps the name */
  const v0 = D.deathCardView(S, 1000), v1 = D.deathCardView(S, 2100), v4 = D.deathCardView(S, 5900);
  check('2a "You died", "Killed by Blue Slime", "Back in BroTown in 5"', v0.title === 'You died' && v0.by === 'Killed by Blue Slime' && v0.back === 'Back in BroTown in 5' && v0.note === null, v0);
  check('2b it counts down (4, then 1)', v1.secs === 4 && v4.secs === 1, { v1, v4 });
  check('2c a late respawn: "in 0" a moment, then gone', D.deathCardView(S, 6300).secs === 0 && D.deathCardView(S, 6700) === null);
  const S2 = S0();
  D.noteDeath(S2, { cause: 'x' }, 0);
  check('2d no respawnInMs is the worker\'s five seconds; nobody named, no "Killed by"', S2._deathCard.ms === 5000 && D.deathCardView(S2, 0).by === null);
  D.noteDeath(S2, { cause: 'x', respawnInMs: 999999 }, 0);
  check('2e never held past 30 s', S2._deathCard.ms === 30000);
  const S3 = S0();
  D.noteDeath(S3, { cause: 'monster:wm-verdant-28', keptBag: 1 }, 0, name);
  check('2f a dungeon\'s kept bag says so', D.deathCardView(S3, 0).note === 'Your bag is safe');
  const S4 = S0();
  D.noteDeath(S4, { cause: 'pvp:bp_raider' }, 0, { ...name, inNml: true });
  check('2g a player in No man\'s land: "Raider killed you in No man\'s land"', D.deathCardView(S4, 0).by === 'Raider killed you in No man\'s land');
  /* the review of v2.3.3817: pvp:<id> is a duel's, a spar's and a war's death too */
  const S6 = S0();
  D.noteDeath(S6, { cause: 'pvp:bp_raider' }, 0, { ...name, inNml: false });
  check('2k a player anywhere else (a duel, a war): "Raider killed you", never "in No man\'s land"', D.deathCardView(S6, 0).by === 'Raider killed you');
  const S7 = S0();
  D.noteDeath(S7, { cause: 'monster:wm-verdant-28' }, 0, { ...name, inNml: true });
  check('2l a monster in No man\'s land is still "Killed by Blue Slime"', D.deathCardView(S7, 0).by === 'Killed by Blue Slime');
  D.noteDeathLoss(S4, false);
  check('2h ...and once the worker says it, what they took', D.deathCardView(S4, 0).note === 'They took what you carried');
  D.noteDeathLoss(S4, true);
  check('2i a red skull\'s loss: what you carried and wore', D.deathCardView(S4, 0).note === 'You lost what you carried and wore');
  const S5 = S0();
  D.noteDeathLoss(S5, false);
  check('2j a loss with no death noted makes no card', D.deathCardView(S5, 0) === null && S5._deathCard === undefined);
}

/* ── 3. the chat's line ── */
{
  const S = S0();
  D.noteDeath(S, { cause: 'monster:wm-verdant-28' }, 0, name);
  check('3a "You were killed by Blue Slime, and came back in BroTown."', D.deathLine(S, 0) === 'You were killed by Blue Slime, and came back in BroTown.');
  check('3b ...and the card goes with it, once', S._deathCard === null && D.deathLine(S) === null && D.deathCardView(S, 0) === null);
  D.noteDeath(S, { cause: 'pvp:bp_raider' }, 0, { ...name, inNml: true });
  check('3c a player\'s in No man\'s land', D.deathLine(S, 0) === 'Raider killed you in No man\'s land. You came back in BroTown.');
  D.noteDeath(S, { cause: 'pvp:bp_raider' }, 0, { ...name, inNml: false });
  check('3f a player\'s anywhere else: no "No man\'s land"', D.deathLine(S, 0) === 'Raider killed you. You came back in BroTown.');
  D.noteDeath(S, { cause: 'monster:wm-verdant-28', respawnInMs: 5000 }, 0, name);
  check('3g a card left from a death long before this respawn says nothing, and goes', D.deathLine(S, 5000 + D.DEATH_LINE_STALE_MS + 1) === null && S._deathCard === null);
  D.noteDeath(S, { cause: 'stuck-at-zero' }, 0, name);
  check('3d nobody named', D.deathLine(S, 0) === 'You died, and came back in BroTown.');
  check('3e no death, no line', D.deathLine(S0()) === null && D.deathLine(null) === null);
}

/* ── 4. the wiring ── */
{
  const ws = src('src/networking/wsClient.js');
  const died = ws.slice(ws.indexOf("case 'player_died':"), ws.indexOf("case 'player_respawned':"));
  check('4a player_died notes the card, with the plate\'s name (its stage too) and whether you lie in No man\'s land', /noteDeath\(S, msg\.payload, Date\.now\(\), \{ monsterName: function \(m\) \{ return wheelStageName\(m, monsterDisplayName\(m\.archetype \|\| m\.type\)\); \}, inNml: nmlHere\(S\) > 0 \}\)/.test(died));
  const loss = ws.slice(ws.indexOf("case 'nml_loss':"), ws.indexOf("case 'nml_loss':") + 600);
  check('4b nml_loss adds what went', /noteDeathLoss\(S, /.test(loss));
  check('4c the respawn says the line (both ways back: the message and the watchdog)', /deathLine\(S, Date\.now\(\)\)/.test(src('src/game/respawn.js')) && /chatLogBus\.bump\(\)/.test(src('src/game/respawn.js')));
  check('4d BroTown mounts the card', /React\.createElement\(DeathCard, \{ stateRef: stateRef \}\)/.test(src('src/ui/BroTown.jsx')));
  const card = src('src/ui/mobile/DeathCard.jsx');
  check('4e the card never takes a tap, and has nothing to close', /pointerEvents: 'none'/.test(card) && !/onClick|data-esc/.test(card));
  check('4f its words are BroTown\'s, never "Wheel" or "town" alone', !/Wheel|back in town/i.test(src('src/game/deathCard.js').split('\n').filter((l) => /'[^']*'/.test(l) && !/^\s*(\/\*|\*)/.test(l)).join('\n')));
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
