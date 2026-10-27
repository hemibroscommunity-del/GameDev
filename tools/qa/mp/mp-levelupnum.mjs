/* ═══ THE LEVEL NUMBER, BIG UNDER THE BANNER, AND HALF AGAIN AS LONG (v2.3.3676) ═══
 *
 * The owner, 2026-10-27: "I think the level up message should stay on the
 * screen about 50% longer and put the number of the level more prominently
 * just below the icon label of the level up".
 *
 * On a phone (390 x 844) in the world, against a real worker, through the
 * React setter every real level-up calls (window._setLevelUpMsg, shaped as the
 * real senders shape it -- shot-levelup.mjs's cases):
 *   1. a combat skill, a life skill (two levels at once) and the character:
 *      at rest the number is its own line, the level asked for, about twice the
 *      words' height, centred under the medallion and just below the banner
 *      (the art's settled frame), the words under it saying whose level, and
 *      the plate above the dashboard's tray;
 *   2. on screen about 50% longer: mounted to gone ~1.94 s (it was 1.30);
 *   3. no page errors;
 *   4. pictures held in the hold (window.__btLevelUpFreeze, shot-levelup.mjs's
 *      handle): one burst, then two side by side; last, as a frozen burst
 *      never retires.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { LEVELUP_TOTAL_MS, LEVELUP_RUN_MS } from '../../../src/data/levelUpBurst.js';

const PHONE = { width: 390, height: 844 };
const OLD_TOTAL_MS = 1295;   /* v2.3.3608's: 590 run + 455 hold + 250 fade */

const CASES = [
  { name: 'combat', msg: { kind: 'combat', level: 14, skill: 'bow', skillLabel: 'Bow', skillLevel: 9 }, num: '9', words: /^Bow Level$/ },
  { name: 'life', msg: { kind: 'life', skill: 'woodcutting', label: 'Woodcutting', level: 7, gained: 2 }, num: '7', words: /^Woodcutting · Skill Level\s+\(\+2\)$/ },
  { name: 'char', msg: { kind: 'char', level: 14 }, num: '14', words: /^Character Level$/ },
];

/* the burst's numbers, read IN the page on the first frame its caption is
   fully shown and the whole is not fading (no freeze: a burst held frozen past
   its own end never retires, and the next one would be laid in a second
   column -- LevelUpBurstStack keeps two) */
const atRest = (P) => P.page.evaluate(() => new Promise((res) => {
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; };
  const t0 = performance.now();
  const tick = () => {
    const root = document.querySelector('[data-levelup-kind]');
    const cap = root && root.querySelector('[data-levelup-caption]');
    if (cap && parseFloat(getComputedStyle(cap).opacity) > 0.99 && parseFloat(getComputedStyle(root).opacity) > 0.99) {
      const num = root.querySelector('[data-levelup-num]');
      const words = num ? num.nextElementSibling : null;
      return res({
        cols: document.querySelectorAll('[data-levelup-kind]').length,
        num: num ? num.textContent.trim() : null, numFont: num ? parseFloat(getComputedStyle(num).fontSize) : 0, numBox: box(num),
        words: words ? words.textContent.replace(/\s+/g, ' ').trim() : null, wordsBox: box(words),
        icon: box(root.querySelector('[data-levelup-icon]')), art: box(root.querySelector('[data-levelup-art]')),
        plate: box(root.querySelector('[data-levelup-caption] > div')), at: Math.round(performance.now() - t0),
      });
    }
    if (performance.now() - t0 > 8000) return res(null);
    requestAnimationFrame(tick);
  };
  tick();
}));
const gone = (P) => H.waitFor(P, () => !document.querySelector('[data-levelup-kind]'), (v) => v, { timeout: 8000, label: 'the burst gone' }).catch(() => false);

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Levelbro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the world' }).catch(() => null);
    rec.ok('in the world (guard)', !!inW, inW);
    if (!inW) return;
    /* the first session's quest card sits over the burst by design (z 71 to
       its 70, shot-levelup.mjs) -- cleared out of the picture */
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    const hasSetter = await P.page.evaluate(() => typeof window._setLevelUpMsg === 'function');
    rec.ok('the level-up setter is there (guard)', hasSetter, hasSetter);
    if (!hasSetter) return;

    /* 1. each kind, held at rest (frame 7 and the caption, before the fade) */
    const worldBottom = PHONE.height * 0.67;
    for (const c of CASES) {
      await P.page.evaluate((m) => window._setLevelUpMsg({ ...m, ts: Date.now() }), c.msg);
      const q = await atRest(P);
      const ok = !!q && q.cols === 1 && q.num === c.num && c.words.test(q.words || '')
        && q.numFont >= 40 && q.numBox.h >= 1.8 * q.wordsBox.h
        && Math.abs((q.numBox.l + q.numBox.r) / 2 - (q.icon.l + q.icon.r) / 2) < 6
        && q.numBox.t >= q.art.b - 4 && q.numBox.t - q.art.b < 40
        && q.wordsBox.t >= q.numBox.b - 2 && q.plate.b <= worldBottom;
      rec.ok(`1. ${c.name}: "${q && q.num}" at ${q && q.numFont}px, ${q && Math.round(q.numBox.h)}px tall over "${q && q.words}" (${q && Math.round(q.wordsBox.h)}px), centred under the medallion, ${q && Math.round(q.numBox.t - q.art.b)}px below the banner's art, the plate above the tray (${q && Math.round(q.plate.b)} <= ${Math.round(worldBottom)})`,
        ok, q);
      await gone(P);
      await P.page.waitForTimeout(300);
    }

    /* 2. how long it stays: mounted to gone, by the page's own clock */
    const life = await P.page.evaluate(() => new Promise((res) => {
      const t0 = performance.now();
      let seen = null;
      window._setLevelUpMsg({ kind: 'combat', level: 15, skill: 'sword', skillLabel: 'Melee', skillLevel: 10, ts: Date.now() });
      const tick = () => {
        const on = !!document.querySelector('[data-levelup-kind]');
        if (on && seen == null) seen = performance.now() - t0;
        if (!on && seen != null) return res({ mounted: Math.round(seen), gone: Math.round(performance.now() - t0) });
        if (performance.now() - t0 > 8000) return res({ mounted: seen, gone: null });
        setTimeout(tick, 25);
      };
      tick();
    }));
    const onScreen = life.gone != null ? life.gone - (life.mounted || 0) : null;
    rec.ok(`2. on screen ${onScreen} ms (the burst's own ${LEVELUP_TOTAL_MS}; it was ${OLD_TOTAL_MS}): about 50% longer`,
      LEVELUP_TOTAL_MS >= OLD_TOTAL_MS * 1.45 && LEVELUP_TOTAL_MS <= OLD_TOTAL_MS * 1.55 && onScreen != null && onScreen >= LEVELUP_TOTAL_MS - 60 && onScreen < LEVELUP_TOTAL_MS + 900, { life, total: LEVELUP_TOTAL_MS });
    rec.ok('3. no page errors', errors.length === 0, errors.slice(0, 3));

    /* 4. the pictures, held in the hold (shot-levelup.mjs's handle): last, as
       a frozen burst never retires -- one burst, then a second beside it (a
       combat skill's level with a life skill's, two columns at the smaller size) */
    await gone(P);
    await P.page.evaluate(([m, at]) => { window.__btLevelUpFreeze = at; window._setLevelUpMsg({ ...m, ts: Date.now() }); }, [CASES[0].msg, LEVELUP_RUN_MS + 500]);
    await P.page.waitForTimeout(900);
    await P.page.screenshot({ path: join(OUT, 'levelupnum-one.png'), clip: { x: 0, y: 150, width: 390, height: 470 } }).catch(() => {});
    await P.page.evaluate((m) => window._setLevelUpMsg({ ...m, ts: Date.now() }), CASES[1].msg);
    await P.page.waitForTimeout(900);
    await P.page.screenshot({ path: join(OUT, 'levelupnum-two.png'), clip: { x: 0, y: 150, width: 390, height: 470 } }).catch(() => {});
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
