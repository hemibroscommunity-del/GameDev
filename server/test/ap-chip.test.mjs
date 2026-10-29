/* YOUR ACHIEVEMENT POINTS ON THE TOP BAR -- v2.3.3553 (docs/specs/ap-on-the-bar.md).
 *
 * The owner, 2026-10-21: "Achievement points should be a prominent part of
 * the experience in brotown."  The page's rules (src/game/apChip.js, no
 * imports) run here in node, and the bar (ui/mobile/ZoneHeader.jsx) is read
 * for what it promises:
 *   1. the number's words: whole, never below 0, thousands commas;
 *   2. a rise: only a real rise, only after the quiet start, never from a
 *      first reading;
 *   3. the "+N" words;
 *   4. the bar: the worker's number (achvApTotal), only against a worker that
 *      grants achievements, a rise counted only once the worker's record has
 *      come, a tap opening the Achievements page under More, a flat fill (no
 *      filter over the canvas), and the bar's left column sized to fit it. */
import * as AP from '../../src/game/apChip.js';
import { readFileSync } from 'fs';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

/* ── 1 ── */
check('1: words', AP.apWords(0) === '0' && AP.apWords(10) === '10' && AP.apWords(1240) === '1,240' && AP.apWords(7470.9) === '7,470');
check('1: never below 0, nothing from junk', AP.apWords(-5) === '0' && AP.apWords('abc') === '0' && AP.apWords(null) === '0');

/* ── 2 ── */
const late = AP.AP_RISE_QUIET_MS + 1;
check('2: a rise after the quiet start counts', AP.apRise(0, 10, late) === 10 && AP.apRise(1240, 1340, late) === 100);
check('2: not in the quiet start (the record loading)', AP.apRise(0, 10, AP.AP_RISE_QUIET_MS - 1) === 0);
check('2: never from a first reading', AP.apRise(null, 1240, late) === 0 && AP.apRise(undefined, 10, late) === 0);
check('2: never a fall or no change', AP.apRise(100, 90, late) === 0 && AP.apRise(100, 100, late) === 0);

/* ── 3 ── */
check('3: the "+N" words', AP.apGainWords(10) === '+10' && AP.apGainWords(1000) === '+1,000' && AP.apGainWords(0) === '' && AP.apGainWords(-3) === '');

/* ── 4. the bar ── */
const zh = readFileSync(new URL('../../src/ui/mobile/ZoneHeader.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../src/styles/game.css', import.meta.url), 'utf8');
check('4: the worker\'s number, only against a worker that grants achievements',
  /const apOn = achvLive\(S\);/.test(zh) && /const ap = apOn \? achvApTotal\(S\) : 0;/.test(zh) && /\{apOn && \(/.test(zh));
check('4: a rise is counted only once the worker\'s record has come', /if \(apOn && S\._achv && S\._achv\.known\) \{/.test(zh));
check('4: ...and never under calm motion', /if \(g > 0 && !lifeCalm\(\)\)/.test(zh));
check('4: a tap opens the Achievements page under More',
  /dashboardPanelBus\.open\('more'\); dashboardPanelBus\.push\('achievements'\);/.test(zh) && /onClick=\{openAchievements\}/.test(zh));
check('4: the owner\'s medal, and a hook for tests', /src=\{ACHV_MEDAL_SRC\}/.test(zh) && /data-ap-chip="1"/.test(zh) && /data-ap-gain=/.test(zh));
check('4: it is in the bar\'s left column, after the door', zh.indexOf('className="bt-zone-header__left"') > 0
  && zh.indexOf('bt-zone-header__logout') > zh.indexOf('className="bt-zone-header__left"')
  && zh.indexOf('data-ap-chip') > zh.indexOf('bt-zone-header__logout', zh.indexOf('className="bt-zone-header__left"')));
check('4: the bar\'s left column grows to fit it', /grid-template-columns:auto minmax\(0,1fr\) auto/.test(css) && /\.bt-zone-header__left\{min-width:calc\(38px \* var\(--zk\)\)/.test(css));   /* v2.3.3765: 38 px x the bar's scale */
const apCss = (css.match(/\.bt-zone-header__ap\{[\s\S]*?\}/) || [''])[0] + (css.match(/\.bt-ap-gain\{[\s\S]*?\}/) || [''])[0];
check('4: a flat fill: no filter over the canvas (TRAPS section 42), and it takes a touch', apCss.length > 0 && !/filter|backdrop/.test(apCss) && /pointer-events:auto/.test(apCss), apCss);
check('4: the "+N" is still under calm motion', /html\.bt-calm \.bt-ap-gain\{animation:none;opacity:0\}/.test(css));
check('4: the "+N" flies inside the bar\'s own box, beside the number', /\.bt-ap-gain\{position:absolute;left:100%;top:50%/.test(css));

if (failures) { console.log(`\n${failures} TEST(S) FAILED`); process.exit(1); }
console.log('\nap-chip: all passed');
