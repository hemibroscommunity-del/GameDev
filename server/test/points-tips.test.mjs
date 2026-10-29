/* YOUR FIRST POINTS, SHOWN -- v2.3.3551 (docs/specs/levelup-tips.md).
 *
 * The owner, 2026-10-21: "Leave tips for first natural level up.  I don't
 * want players choosing xp to train in for weapons they haven't used yet.  Go
 * with your guided level up."  The rules are the page's src/game/pointsTips.js
 * (no imports but the reset's own, also import-free), run here in node:
 *
 *   1. The points waiting: weapon (lane) points and shared points, whole
 *      numbers, nothing from a missing or bad record.
 *   2. A quiet moment: no blow dealt or taken in the last POINTS_TIP_CALM_MS.
 *   3. Wanted: points waiting, none ever placed, and a quiet moment; done for
 *      good the moment a point is placed (the reset's own count).
 *   4. The words for each step of the way in, with the counts, singular and
 *      plural, and never a stat chosen for the player.
 *   5. After a Spend: the free reset named on the FIRST spend only, and only
 *      against a worker that resets.
 *   6. The coach (ui/mobile/QuestCoach.jsx) carries the lesson: `anytime`,
 *      before chatTap and passkey, the grid's head cell first, the snooze, and
 *      the tutorial gate opened for it alone.
 *   7. The XP still goes where you fought: nothing here, in the coach or the
 *      stat window sends a message. */
import * as PT from '../../src/game/pointsTips.js';
import { placedPoints } from '../../src/game/pointsReset.js';
import { readFileSync } from 'fs';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const fresh = () => ({ prog3: { pool: 0, shared: 0, alloc: {}, atk: { sword: {}, bow: {}, staff: {} } } });
const levelled = () => ({ prog3: { pool: 3, shared: 3, alloc: {}, atk: { sword: {}, bow: {}, staff: {} } } });

/* ── 1. the points waiting ── */
{
  check('1: a fresh character has nothing waiting', PT.pointsWaiting(fresh()).total === 0);
  const w = PT.pointsWaiting(levelled());
  check('1: a first level-up: 3 weapon points and 3 shared, 6 in all', w.lane === 3 && w.shared === 3 && w.total === 6, w);
  check('1: whole numbers, never below 0, nothing from a bad record',
    PT.pointsWaiting({ prog3: { pool: 2.7, shared: -4 } }).total === 2
    && PT.pointsWaiting(null).total === 0 && PT.pointsWaiting({}).total === 0
    && PT.pointsWaiting({ prog3: 'x' }).total === 0
    && PT.pointsWaiting({ prog3: { pool: 'abc', shared: NaN } }).total === 0);
}

/* ── 2. a quiet moment ── */
{
  const now = 1000000;
  check('2: no blow ever: calm', PT.pointsTipCalm({}, now) === true);
  check('2: a blow taken 2 s ago: not calm', PT.pointsTipCalm({ lastDamageTaken: now - 2000 }, now) === false);
  check('2: a blow dealt 2 s ago: not calm', PT.pointsTipCalm({ _dealtAt: now - 2000 }, now) === false);
  check('2: the last blow ' + PT.POINTS_TIP_CALM_MS + ' ms ago: calm again',
    PT.pointsTipCalm({ lastDamageTaken: now - PT.POINTS_TIP_CALM_MS, _dealtAt: now - PT.POINTS_TIP_CALM_MS - 50 }, now) === true);
  check('2: no state: not calm (nothing to show it on)', PT.pointsTipCalm(null, now) === false);
}

/* ── 3. wanted, and done ── */
{
  const now = 5000000;
  const calm = { lastDamageTaken: 0, _dealtAt: 0 };
  check('3: a fresh character: not wanted', PT.pointsTipWanted(fresh(), calm, now) === false);
  check('3: a first level-up, calm: wanted', PT.pointsTipWanted(levelled(), calm, now) === true);
  check('3: ...but not mid-fight', PT.pointsTipWanted(levelled(), { _dealtAt: now - 1000 }, now) === false);
  const placed = levelled(); placed.prog3.alloc = { hp: 1 };
  check('3: a point placed (shared): done, not wanted', PT.pointsTipDone(placed) === true && PT.pointsTipWanted(placed, calm, now) === false);
  const placedLane = levelled(); placedLane.prog3.atk.bow = { aspd: 1 };
  check('3: a point placed (a weapon): done', PT.pointsTipDone(placedLane) === true);
  check('3: done is the reset\'s own count of placed points',
    PT.pointsTipDone(placed) === (placedPoints(placed.prog3) > 0) && PT.pointsTipDone(levelled()) === false);
  check('3: no prog3 (an older worker): never wanted, never done',
    PT.pointsTipWanted({}, calm, now) === false && PT.pointsTipDone({}) === false && PT.pointsTipWanted(null, calm, now) === false);
  check('3: the snooze is shorter than its wait, and gives up',
    PT.POINTS_TIP_SNOOZE_AFTER_MS > 0 && PT.POINTS_TIP_SNOOZE_MS > PT.POINTS_TIP_SNOOZE_AFTER_MS && PT.POINTS_TIP_MAX_SNOOZES >= 1);
}

/* ── 4. the words ── */
{
  const R = levelled();
  check('4: OPEN', PT.pointsTipWords('fold', R) === 'You have 6 points to spend. Tap OPEN.', PT.pointsTipWords('fold', R));
  check('4: the sideways dashboard', PT.pointsTipWords('side', R) === 'You have 6 points to spend. Open your dashboard.');
  check('4: Character', PT.pointsTipWords('nav', R) === 'You have 6 points to spend. Tap Character.');
  check('4: the Points tab', PT.pointsTipWords('tab', R) === 'Your 6 points are on the Points tab.');
  const g = PT.pointsTipWords('grid', R);
  check('4: the grid says what the two rows are and to tap a stat',
    g === "Top row: 3 weapon points for your weapon's stats. Bottom row: 3 shared points for any stat there. Tap a stat to see what it does.", g);
  const one = { prog3: { pool: 1, shared: 0 } };
  check('4: singular', PT.pointsTipWords('tab', one) === 'Your 1 point is on the Points tab.'
    && PT.pointsTipWords('nav', one) === 'You have 1 point to spend. Tap Character.', [PT.pointsTipWords('tab', one), PT.pointsTipWords('nav', one)]);
  check('4: ...on the grid too', PT.pointsTipWords('grid', one).startsWith('Top row: 1 weapon point for') && PT.pointsTipWords('grid', one).includes('0 shared points'));
  const all = ['fold', 'side', 'nav', 'tab', 'grid'].map((w) => PT.pointsTipWords(w, R)).join(' ');
  check('4: never names a weapon or a stat to pick', !/\b(melee|sword|bow|staff|magic|power|luck|defen[cs]e|dodge|max hp)\b/i.test(all), all);
  check('4: never the word "Wheel"', !/wheel/i.test(all));
  check('4: the card\'s title says "Level up!", so no body repeats it', !/level up/i.test(all) && /label: 'Level up!'/.test(readFileSync(new URL('../../src/ui/mobile/QuestCoach.jsx', import.meta.url), 'utf8')));
}

/* ── 5. after a Spend ── */
{
  const p3 = { alloc: { hp: 1 }, atk: { sword: {}, bow: {}, staff: {} } };
  const hint = PT.firstSpendHint(p3, 1, true);
  check('5: a first spend names the free reset', hint === 'Not sure? Reset points (free), under the grid, gives them all back.', hint);
  check('5: ...a spend of two at once too', PT.firstSpendHint({ alloc: { hp: 1, def: 1 } }, 2, true) !== null);
  check('5: not a later spend (points placed before)', PT.firstSpendHint({ alloc: { hp: 2 } }, 1, true) === null);
  check('5: not against a worker that does not reset', PT.firstSpendHint(p3, 1, false) === null);
  check('5: nothing spent: nothing said', PT.firstSpendHint(p3, 0, true) === null && PT.firstSpendHint(null, 1, true) === null);
}

/* ── 6. the coach carries it ── */
const coach = readFileSync(new URL('../../src/ui/mobile/QuestCoach.jsx', import.meta.url), 'utf8');
{
  const at = coach.indexOf("id: 'points'");
  check('6: the lesson is in the coach', at > 0);
  const lessonsAt = coach.indexOf('const LESSONS = [');
  const chatAt = coach.indexOf("id: 'chatTap'", lessonsAt);
  const keyAt = coach.indexOf("id: 'passkey'", lessonsAt);
  check('6: ...before chatTap and passkey (the level-up is the moment)', at > lessonsAt && (chatAt < 0 || at < chatAt) && (keyAt < 0 || at < keyAt), { at, chatAt, keyAt });
  const body = coach.slice(at, coach.indexOf('\n  },', at));
  check('6: ...anytime (it runs past the Mayor\'s tutorial)', /anytime:\s*true/.test(body));
  const anchors = ['[data-prog3-band="lane"] [data-prog3-lane]', '[data-section="Build"]', '[data-nav="hero"]', '[data-dash-fold="min"]', '[data-land-fold="min"]'];
  const pos = anchors.map((a) => body.indexOf("sel: '" + a + "'"));
  check('6: ...its anchors most specific first: the grid, the tab, Character, OPEN, the sideways chip',
    pos.every((p, i) => p > 0 && (i === 0 || p > pos[i - 1])), pos);
  check('6: ...live and done from game/pointsTips.js', /pointsTipWanted\(rpg, S\)/.test(body) && /pointsTipDone\(rpg\)/.test(body));
  check('6: the walk passes the game state to live()', /L\.live\(rpg, stateRef && stateRef\.current\)/.test(coach));
  check('6: past the tutorial only the anytime lessons are walked', /if \(!tut && !L\.anytime\) continue;/.test(coach));
  check('6: the snooze, and the give-up after it', /POINTS_TIP_SNOOZE_AFTER_MS/.test(coach) && /POINTS_TIP_MAX_SNOOZES/.test(coach)
    && /done\.points = true; saveDone\(done\)/.test(coach));
  check('6: a body may be worked out when shown', /typeof body === 'function'/.test(coach));
  /* the anchors the lesson names exist in the page */
  const hero = readFileSync(new URL('../../src/ui/mobile/sheet/HeroExpanded.jsx', import.meta.url), 'utf8');
  const dash = readFileSync(new URL('../../src/ui/mobile/BottomDashboard.jsx', import.meta.url), 'utf8');
  check('6: the grid\'s top row and its head cell are there', /data-prog3-band="lane"/.test(hero) && /data-prog3-lane=\{isLane \? buildCat : 'shared'\}/.test(hero));
  check('6: the Points tab is the "Build" section', /const SECTIONS = \['Overview', 'Build'\]/.test(hero) && /data-section=\{s\}/.test(hero));
  check('6: Character is the "hero" destination', /\{ id: 'hero',\s+label: 'Character'/.test(dash));
  check('6: the stat window shows the hint under "points spent"', /spentHint: spentN > 0 \? firstSpendHint\(/.test(hero));
  const pop = readFileSync(new URL('../../src/ui/mobile/InfoPopup.jsx', import.meta.url), 'utf8');
  check('6: ...and InfoPopup draws it', /cur\.spentNote && cur\.spentHint/.test(pop) && /data-infopopup-spent-hint/.test(pop));
}

/* ── 7. nothing sent ── */
{
  const src = readFileSync(new URL('../../src/game/pointsTips.js', import.meta.url), 'utf8');
  check('7: pointsTips.js sends nothing and picks nothing', !/channel|\.send\(|prog3_allocate|wsOut/.test(src));
  const imports = [...src.matchAll(/^import .* from '(.*)';$/gm)].map((m) => m[1]);
  check('7: ...and imports only the reset (node runs it)', imports.length === 1 && imports[0] === './pointsReset.js', imports);
}

if (failures) { console.log(`\n${failures} TEST(S) FAILED`); process.exit(1); }
console.log('\npoints-tips: all passed');
