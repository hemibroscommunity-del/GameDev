/* THE DUNGEON FIXES ON THE PHONE -- v2.3.3556 (docs/specs/dungeon-fixes.md).
 *
 * The owner, 2026-10-21: "I have no clue what the state of dungeons are right
 * now in the game.  I have never played dungeons yet.  This will probably need
 * work to get right."  The tour (docs/specs/dungeons-today.md) found what a
 * player meets; the worker's half of the fixes is in wheeldungeon.test and
 * dungeon.test.  This is the phone's half, its rules run here in node and its
 * wiring read for what it promises:
 *   1. AFTER THE CLEAR (src/game/dungeonClear.js): 30 seconds, counted down,
 *      and you are taken out only while you are still in THAT dungeon -- never
 *      out of a new run you went straight back into, never twice; Leave now
 *      goes at once;
 *   2. ...and gameEvents.js's dungeon_complete uses it (the old 3 s timer
 *      gone), the card (DungeonClearHud.jsx) is mounted beside the race's and
 *      answers a touch;
 *   3. THE TOP BAR: a range that is one level is that level, "(Lv 28)";
 *   4. THE BOSS: the worker's `boss` drawn BOSS_SIZE_K bigger, its plate
 *      "Boss <name>" on a deep red that is not the alarm's, the plate kept the
 *      plates' size on the screen.
 * And (2) a death in a dungeon, which keeps the bag (the owner: "Keep your bag
 * in dungeons"; the worker's rule in wheeldungeon.test §12), says "Your bag is
 * safe" when the worker says it kept it.
 */
import { readFileSync } from 'fs';
import { DUNGEON_LOOT_MS, startDungeonClear, dungeonClearView, leaveClearedDungeon, dungeonClearBus } from '../../src/game/dungeonClear.js';
import { zoneTitle } from '../../src/ui/mobile/zoneTitle.js';
import { ZONES } from '../../src/data/zones.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

/* ── 1. the clock ── */
{
  check('1: thirty seconds (it was three)', DUNGEON_LOOT_MS === 30000, DUNGEON_LOOT_MS);
  /* a hand-held clock: the timer's function is kept, run when we say */
  const timers = [];
  const setT = (fn, ms) => { timers.push({ fn, ms }); };
  let woke = 0;
  const unsub = dungeonClearBus.sub(() => { woke++; });
  const S = { _serverDungeon: 'dungeon:a' };
  let left = 0;
  const t0 = 1000000;
  const c = startDungeonClear(S, 'dungeon:a', t0, () => { left++; S._serverDungeon = null; }, setT);
  check('1: the clear starts the clock and wakes the card', !!c && S._dungeonClear === c && timers.length === 1 && timers[0].ms === DUNGEON_LOOT_MS && woke === 1, { woke, timers: timers.length });
  const v0 = dungeonClearView(S, t0), v10 = dungeonClearView(S, t0 + 10000), v29 = dungeonClearView(S, t0 + 29400), vEnd = dungeonClearView(S, t0 + 31000);
  check('1: the card counts down in whole seconds, never below 0 (30, 20, 1, 0)',
    v0 && v0.secs === 30 && v10.secs === 20 && v29.secs === 1 && vEnd.secs === 0 && v0.zone === 'dungeon:a', { v0, v10, v29, vEnd });
  timers[0].fn();
  check('1: at the time you are taken out, once', left === 1 && S._dungeonClear === null && dungeonClearView(S, t0 + 31000) === null, { left });
  timers[0].fn();
  check('1: ...never twice', left === 1, left);

  /* walked out by the way out first: the timer does nothing */
  const S2 = { _serverDungeon: 'dungeon:b' };
  let left2 = 0;
  timers.length = 0;
  startDungeonClear(S2, 'dungeon:b', t0, () => { left2++; }, setT);
  S2._serverDungeon = null;
  check('1: walked out first: no card', dungeonClearView(S2, t0 + 5000) === null);
  timers[0].fn();
  check('1: ...and the time running out does nothing', left2 === 0, left2);

  /* STRAIGHT BACK IN within the thirty seconds: the old clear's time never
     takes you out of the new run */
  const S3 = { _serverDungeon: 'dungeon:c' };
  let left3 = 0;
  timers.length = 0;
  startDungeonClear(S3, 'dungeon:c', t0, () => { left3++; }, setT);
  S3._serverDungeon = null;          /* out by the way out */
  S3._serverDungeon = 'dungeon:d';   /* and straight back in: a new run */
  check('1: back in a new run: no card for the old clear', dungeonClearView(S3, t0 + 9000) === null);
  timers[0].fn();
  check('1: ...and the old clear\'s time does not take you out of the new run (the old `!S._serverDungeon` test did)', left3 === 0 && S3._serverDungeon === 'dungeon:d', { left3, z: S3._serverDungeon });

  /* Leave now */
  const S4 = { _serverDungeon: 'dungeon:e' };
  let left4 = 0;
  timers.length = 0;
  startDungeonClear(S4, 'dungeon:e', t0, () => { left4++; S4._serverDungeon = null; }, setT);
  check('1: Leave now goes at once', leaveClearedDungeon(S4) === true && left4 === 1 && S4._dungeonClear === null, left4);
  timers[0].fn();
  check('1: ...and the time running out after it does nothing', left4 === 1, left4);
  check('1: Leave now with no clear does nothing', leaveClearedDungeon({}) === false && leaveClearedDungeon(null) === false);
  unsub();
}

/* ── 2. the wiring ── */
{
  const ge = src('src/networking/gameEvents.js');
  const at = ge.indexOf("case 'dungeon_complete':");
  const block = ge.slice(at, ge.indexOf("case 'dungeon_error':", at));
  check('2: dungeon_complete starts the clock for ITS dungeon, and the old 3 s timer is gone',
    at > 0 && /startDungeonClear\(S, payload\.zone, Date\.now\(\), function \(\) \{/.test(block) && !/\}, 3000\);/.test(block) && !/setTimeout\(/.test(block), block.length);
  check('2: ...still home to the mouth (a world dungeon) or the farm (the Workshop)', /if \(leaveWheelDungeon\(S\)\) return;/.test(block) && /holdFarmUntilReady\(S\)/.test(block));
  const bt = src('src/ui/BroTown.jsx');
  check('2: the card is mounted beside the race\'s', /import DungeonClearHud from '\.\/mobile\/DungeonClearHud\.jsx';/.test(bt) && /React\.createElement\(DungeonClearHud, \{ stateRef: stateRef \}\)/.test(bt));
  const hud = src('src/ui/mobile/DungeonClearHud.jsx');
  check('2: the card counts down and its Leave now goes at once (a real button, a touch never reaching the world)',
    /Pick up your loot · out in \{v\.secs\} s/.test(hud) && /data-dungeon-leave=""/.test(hud) && /leaveClearedDungeon\(stateRef\.current\)/.test(hud)
      && /onPointerDown=\{stop\} onTouchStart=\{stop\}/.test(hud) && /type="button"/.test(hud));
  check('2: ...and Esc is not "leave the dungeon" (no data-esc on it)', !/data-esc/.test(hud));
  /* v2.3.3556: a death in a dungeon keeps the bag, and the phone says so --
     only when the worker says it kept it (an older worker's death promises
     nothing) */
  const wc = src('src/networking/wsClient.js');
  const dAt = wc.indexOf("case 'player_died':");
  const dBlock = wc.slice(dAt, wc.indexOf("case 'player_respawned':", dAt));
  check('2: "Your bag is safe" under "YOU DIED", only on the worker\'s `keptBag`',
    dAt > 0 && /if \(msg\.payload && msg\.payload\.keptBag\) pushDmgPopup\(S, [^;]*'Your bag is safe'/.test(dBlock), dBlock.length);
}

/* ── 3. the top bar ── */
{
  ZONES['dungeon:t1'] = { id: 'dungeon:t1', name: 'the Great Cave', level: [28, 28], _instance: true };
  ZONES['dungeon:t2'] = { id: 'dungeon:t2', name: 'Workshop', level: [5, 7], _instance: true };
  const one = zoneTitle({ currentZone: 'dungeon:t1' });
  const range = zoneTitle({ currentZone: 'dungeon:t2' });
  check(`3: one level is that level ("${one}", it read "the Great Cave (Lv28-28)"), a range a range ("${range}")`,
    one === 'the Great Cave (Lv 28)' && range === 'Workshop (Lv5-7)', { one, range });
  check('3: a zone with no level stays its name ("Your Farm")', zoneTitle({ currentZone: 'farm_home' }) === 'Your Farm');
  delete ZONES['dungeon:t1']; delete ZONES['dungeon:t2'];
}

/* ── 4. the boss on the screen ── */
{
  const er = src('src/rendering/systems/entityRenderer.js');
  check('4: the worker\'s `boss` drawn BOSS_SIZE_K (1.5) bigger, through the one scale every write uses',
    /export const BOSS_SIZE_K = 1\.5;/.test(er) && /const _bossK = m\.boss \? BOSS_SIZE_K : 1;/.test(er)
      && /const _mk = MONSTER_SIZE_MULT \* \(this\._zonePscale\(S, rx, ry\) \|\| 1\) \* _bossK;/.test(er));
  check('4: ...its plate fitted back to the plates\' size on the screen', /_ui\._plateLift = _plateLiftAt\(S\.currentZone, ry\) \/ _bossK;/.test(er));
  check('4: the plate says "Boss <name>" and is drawn as a boss\'s (`boss`, in its key)',
    /\(m\.boss \? 'Boss ' : ''\) \+ wheelStageName\(/.test(er) && /_plateAlarm, _plateBand, false, !!m\.boss\);/.test(er)
      && /\+ \(boss \? '\|b' : ''\);/.test(er) && /_drawPlateCapsule\(display, level, broId, alarm, band, party, boss\);/.test(er));
  const fill = (er.match(/const PLATE_BOSS_FILL = (0x[0-9A-Fa-f]{6});/) || [])[1];
  const alarm = (er.match(/const PLATE_ALARM_FILL = (0x[0-9A-Fa-f]{6});/) || [])[1];
  check(`4: on a deep red (${fill}) that is not the alarm's bright red (${alarm}), which still wins while it hits you`,
    !!fill && !!alarm && fill !== alarm && /const _fill = alarm \? PLATE_ALARM_FILL : boss \? PLATE_BOSS_FILL : PLATE_INK;/.test(er), { fill, alarm });
  /* the name's ink on it, measured as the plate's other text is (WCAG) */
  const lum = (hex) => {
    const n = parseInt(String(hex).replace(/^0x|^#/, ''), 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const c = ratio('#F4F0E7', fill);
  check(`4: ...the name readable on it (${c.toFixed(2)}:1, AA is 4.5)`, c >= 4.5, c);
}

if (failures) { console.log(`\n${failures} TEST(S) FAILED`); process.exit(1); }
console.log('\ndungeon-clear: all passed');
