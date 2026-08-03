/* T1 report-gate test — v2.3.1634.
 *
 * `src/game/t1Sync.js` is the client-side half of audit C-2 (the
 * new-device character wipe). Adversarial review flagged that it had NO
 * automated coverage of any kind, and it is a PURE module — no DOM, no
 * Pixi, no React — so the zero-dependency server suite can pin it
 * outright. Same precedent as zones.test.mjs importing the client zone
 * table across the boundary.
 *
 * WHAT IS AT STAKE. The five raw stats are split-brain: the client is
 * their only reporter, the server their only store. A client that does
 * not know a stat and reports 0 is indistinguishable on the wire from a
 * character that genuinely has none, and `_handleStatsUpdate` persists
 * it. The server-side guard (v2.3.1624) only protects workers that HAVE
 * it — a rollback below that version is the documented CLAUDE.md
 * procedure — so this gate is the half that works everywhere.
 *
 * The bug this suite exists to prevent recurring: the gate was
 * originally ALL-OR-NOTHING. An unseeded client that use-trained a
 * single point answered "yes, I know these" and emitted all five, four
 * of them zeros it had never learned — so training one point wiped the
 * other four. §2 pins the per-key rule that replaced it.
 */
import { t1StatsPayload, t1Echoed, T1_KEYS } from '../../src/game/t1Sync.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const keys = (o) => Object.keys(o).sort().join(',');

// ── 1. The seeded flag ──
{
  check('echoed: false with no state', t1Echoed(null) === false);
  check('echoed: false when unset', t1Echoed({}) === false);
  check('echoed: true once the echo has landed', t1Echoed({ _t1Seeded: true }) === true);
  check('keys: the canonical five, in order',
    T1_KEYS.join(',') === 'power,vitality,endurance,agility,mind', T1_KEYS);
}

// ── 2. PER-KEY gating — the regression that motivated this suite ──
{
  const S = { _t1Seeded: false };
  const trained = t1StatsPayload(S, { power: 1, vitality: 0, endurance: 0, agility: 0, mind: 0 });
  check('unseeded: a single trained point reports ONLY that stat',
    keys(trained) === 'power' && trained.power === 1, trained);
  check('unseeded: the four unknown stats are OMITTED, not zeroed',
    !('vitality' in trained) && !('endurance' in trained)
    && !('agility' in trained) && !('mind' in trained), trained);

  const two = t1StatsPayload(S, { power: 5, vitality: 0, endurance: 2, agility: 0, mind: 0 });
  check('unseeded: reports exactly the trained subset',
    keys(two) === 'endurance,power' && two.power === 5 && two.endurance === 2, two);

  const none = t1StatsPayload(S, { power: 0, vitality: 0, endurance: 0, agility: 0, mind: 0 });
  check('unseeded: a brand-new character reports nothing at all',
    keys(none) === '', none);
}

// ── 3. Once echo-seeded, zeros are real information ──
{
  const S = { _t1Seeded: true };
  const full = t1StatsPayload(S, { power: 47, vitality: 0, endurance: 12, agility: 0, mind: 3 });
  check('seeded: all five reported, including genuine zeros',
    keys(full) === 'agility,endurance,mind,power,vitality'
    && full.power === 47 && full.vitality === 0 && full.agility === 0, full);
  const allZero = t1StatsPayload(S, { power: 0, vitality: 0, endurance: 0, agility: 0, mind: 0 });
  check('seeded: an all-zero character still reports all five',
    keys(allZero) === 'agility,endurance,mind,power,vitality', allZero);
}

// ── 4. Defensive shapes ──
{
  check('missing state reports nothing', keys(t1StatsPayload(null, { power: 9 })) === '');
  check('missing rpg reports nothing', keys(t1StatsPayload({ _t1Seeded: true }, null)) === '');
  check('absent fields are treated as unknown, not NaN',
    keys(t1StatsPayload({ _t1Seeded: false }, {})) === '');
  const undef = t1StatsPayload({ _t1Seeded: true }, {});
  check('seeded with absent fields coerces to 0, never undefined/NaN',
    T1_KEYS.every((k) => undef[k] === 0), undef);
  /* The payload must never carry a value the server would reject or
     poison state with -- _handleStatsUpdate clamps, but a NaN that
     survives one assignment poisons a stat forever. */
  const weird = t1StatsPayload({ _t1Seeded: true }, { power: NaN, vitality: '12', endurance: -3 });
  check('non-numeric / negative inputs never emit NaN',
    Object.values(weird).every((v) => typeof v === 'number' && !Number.isNaN(v)), weird);
}

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
