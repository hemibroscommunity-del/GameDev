/* ═══ THE LEVEL IN THE MEDALLION, IN THE OWNER'S NUMERALS (v2.3.3693) ═══
 *
 * The owner, 2026-10-28: "on the level up badge the number just needs to be
 * inside that big paper colored center space.  You can use numbers from
 * sprite sheets I've given you to make it look better than just code drawn".
 * (v2.3.3676 had put it big on the plate under the banner, in a font; the
 * skill's icon, which sat in the paper centre, is on the plate now.)
 *
 * On a phone (390 x 844) in the world, against a real worker, through the
 * React setter every real level-up calls (window._setLevelUpMsg, shaped as the
 * real senders shape it -- shot-levelup.mjs's cases):
 *   1. a combat skill, a life skill (two levels at once), the character and a
 *      three-digit level: at rest the level is the gold numerals' pictures, one
 *      a digit, every one loaded, centred on the medallion's circle and wholly
 *      inside its cream void, LEVELUP_NUM_H x the icon's radius tall (a 100
 *      drawn smaller, LEVELUP_NUM_W wide); the plate one row, the skill's icon
 *      (the character's portrait) loaded, level with the words and before
 *      them, no number on it; the plate above the dashboard's tray;
 *   2. mid-run, held at the art's first frame and at its peak (frame 4), the
 *      number is in the void's middle there too, its size the circle's: it
 *      grows with it;
 *   3. the ten numerals are held decoded from the loading screen
 *      (window.__btLevelUpWarm, the preload's seam): nothing is fetched as a
 *      level-up lands;
 *   4. on screen as long as v2.3.3676 made it (~1.94 s), by the burst's own
 *      clock (sampled every frame, so a slow page cannot bend it);
 *   5. no page errors;
 *   6. pictures held in the hold (window.__btLevelUpFreeze, shot-levelup.mjs's
 *      handle): one burst, then two side by side; last, as a frozen burst
 *      never retires;
 *   7. v2.3.5004, the art from its colour numbers (docs/specs/pictures-256.md
 *      §7): (a) before any burst, the eight frames' numbers held from the
 *      loading screen (under 1 MB) and NONE of the art held decoded as a
 *      picture (the strip was 6.29 MB); (b) each of the eight frames, held,
 *      drawn on its canvas from its own file: every pixel's alpha the file's,
 *      at the frame's place in the box, nothing past it, the box and the
 *      canvas at one scale, a draw under the 12 ms line; (c) a burst played
 *      live reaches frame 7 with at most eight draws (one a frame, never one
 *      a tick), and its canvas is emptied and the shared ImageData let go
 *      when it ends.  With BT_QA_QUERY=burstnumbers=0: the strip held
 *      (6.29 MB) and drawn, as before.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  LEVELUP_TOTAL_MS, LEVELUP_RUN_MS, LEVELUP_FADE_MS, LEVELUP_FRAMES, LEVELUP_ICON_FILL,
  LEVELUP_NUM_H, LEVELUP_NUM_W, LEVELUP_NUM_URLS,
} from '../../../src/data/levelUpBurst.js';
import { POINTS_DIGIT_H, POINTS_DIGIT_W } from '../../../src/data/pointsHeadArt.js';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { LEVELUP_NUMBER_SRCS, LEVELUP_MAX_W, LEVELUP_MAX_H, LEVELUP_STRIP_W, LEVELUP_STRIP_H } from '../../../src/data/levelUpBurst.js';
import { decodePng8 } from '../../../src/rendering/png8Decode.js';

/* v2.3.5004 (step 7): the art from its colour numbers unless the run turns
   them off (BT_QA_QUERY=burstnumbers=0) */
const NUMBERS = !/(^|&)burstnumbers=0(&|$)/.test(String(process.env.BT_QA_QUERY || '').replace(/^[?&]+/, ''));
/* each frame file's own alpha: how many pixels show, and their alpha summed */
async function frameAlpha(i) {
  const file = join(H.REPO, 'public', LEVELUP_NUMBER_SRCS[i].replace(/\?.*$/, ''));
  const p = await decodePng8(new Uint8Array(readFileSync(file)), async (z) => new Uint8Array(inflateSync(z)), 1);
  let n = 0, sum = 0;
  for (let q = 0; q < p.w * p.h; q++) { const a = p.alpha[p.idx[q]] ?? 0; if (a) { n++; sum += a; } }
  return { w: p.w, h: p.h, n, sum };
}

const PHONE = { width: 390, height: 844 };
const OLD_TOTAL_MS = 1295;   /* v2.3.3608's: 590 run + 455 hold + 250 fade */

const CASES = [
  { name: 'combat', msg: { kind: 'combat', level: 14, skill: 'bow', skillLabel: 'Bow', skillLevel: 9 }, num: '9', words: /^Bow Level$/ },
  { name: 'life', msg: { kind: 'life', skill: 'woodcutting', label: 'Woodcutting', level: 7, gained: 2 }, num: '7', words: /^Woodcutting · Skill Level\s+\(\+2\)$/ },
  { name: 'char', msg: { kind: 'char', level: 14 }, num: '14', words: /^Character Level$/ },
  { name: 'three digits', msg: { kind: 'char', level: 100 }, num: '100', words: /^Character Level$/ },
];
/* step 2's burst: two digits, and the same kind and skill as CASES[0], so
   step 6's first push replaces it in its column (levelUpBursts.js) */
const MID = { msg: { kind: 'combat', level: 20, skill: 'bow', skillLabel: 'Bow', skillLevel: 14 }, num: '14' };

/* what goldNumber (LevelUpBurst.jsx) draws for `s` in a circle whose icon
   radius is `iconR`: the run's height and width, shrunk to LEVELUP_NUM_W */
function expectRun(s, iconR) {
  const h = iconR * LEVELUP_NUM_H, maxW = iconR * LEVELUP_NUM_W;
  const ws = s.split('').map((ch) => POINTS_DIGIT_W.gold[+ch] * h / POINTS_DIGIT_H);
  const lap = Math.max(1, h * 0.06);
  const full = ws.reduce((a, w) => a + w, 0) - lap * (s.length - 1);
  const k = full > maxW ? maxW / full : 1;
  return { h: h * k, w: full * k, shrunk: k < 1 };
}

/* the burst's medallion, number and plate, read IN the page.  `pin` is the
   number's parent: the zero-size div the art is placed round, at the circle's
   centre (LevelUpBurst.jsx). */
const READ = () => {
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; };
  const root = document.querySelector('[data-levelup-kind]');
  if (!root) return null;
  const num = root.querySelector('[data-levelup-num]');
  const icon = root.querySelector('[data-levelup-icon]');
  const plate = root.querySelector('[data-levelup-caption] > div');
  const words = icon ? icon.nextElementSibling : null;
  const pin = num ? num.parentElement.getBoundingClientRect() : null;
  return {
    cols: document.querySelectorAll('[data-levelup-kind]').length,
    value: num ? num.getAttribute('data-value') : null,
    digits: num ? [...num.querySelectorAll('img')].map((im) => ((im.getAttribute('src') || '').match(/gold-(\d)\.png/) || [])[1] || '?').join('') : null,
    digitsLoaded: num ? [...num.querySelectorAll('img')].every((im) => im.complete && im.naturalWidth > 0) : false,
    numBox: box(num), pin: pin ? { x: pin.left, y: pin.top } : null,
    art: box(root.querySelector('[data-levelup-art]')),
    icon: box(icon), iconLoaded: !!(icon && icon.complete && icon.naturalWidth > 0),
    words: words ? words.textContent.replace(/\s+/g, ' ').trim() : null, wordsBox: box(words),
    plate: box(plate), numOnPlate: !!(plate && plate.querySelector('[data-levelup-num]')),
  };
};
const READ_SRC = READ.toString();

/* at rest: the first frame its caption is fully shown and the whole is not
   fading (no freeze: a burst held frozen past its own end never retires, and
   the next one would be laid in a second column -- LevelUpBurstStack keeps two) */
const atRest = (P) => P.page.evaluate((readSrc) => new Promise((res) => {
  const read = new Function('return (' + readSrc + ')()');
  const t0 = performance.now();
  const tick = () => {
    const root = document.querySelector('[data-levelup-kind]');
    const cap = root && root.querySelector('[data-levelup-caption]');
    if (cap && parseFloat(getComputedStyle(cap).opacity) > 0.99 && parseFloat(getComputedStyle(root).opacity) > 0.99) {
      return res({ ...read(), at: Math.round(performance.now() - t0) });
    }
    if (performance.now() - t0 > 8000) return res(null);
    requestAnimationFrame(tick);
  };
  tick();
}), READ_SRC);
/* a frozen burst, once its numerals have drawn */
const frozenRead = (P) => P.page.waitForFunction((readSrc) => {
  const q = new Function('return (' + readSrc + ')()')();
  return q && q.numBox && q.numBox.w > 0 && q.art && q.art.w > 0 && q.digitsLoaded ? q : null;
}, READ_SRC, { timeout: 8000, polling: 100 }).then((h) => h.jsonValue()).catch(() => null);
const gone = (P) => H.waitFor(P, () => !document.querySelector('[data-levelup-kind]'), (v) => v, { timeout: 8000, label: 'the burst gone' }).catch(() => false);

/* the circle a reading's art was drawn at: its frame's numbers, scaled by the
   art's drawn width (LevelUpBurst.jsx draws the frame f at f.sw * k) */
function circleOf(q, f) {
  const k = q.art.w / f.sw;
  return { k, cx: q.art.l + f.ox * k, cy: q.art.t + f.oy * k, voidR: f.r * k, iconR: f.r * k * LEVELUP_ICON_FILL };
}
/* the number's verdict in a circle: centred on the pin, every corner inside
   the void, and the size goldNumber gives that circle */
function inCircle(q, f, want) {
  const c = circleOf(q, f);
  const ex = expectRun(want, c.iconR);
  const mx = (q.numBox.l + q.numBox.r) / 2, my = (q.numBox.t + q.numBox.b) / 2;
  const corner = Math.max(...[[q.numBox.l, q.numBox.t], [q.numBox.r, q.numBox.t], [q.numBox.l, q.numBox.b], [q.numBox.r, q.numBox.b]]
    .map(([x, y]) => Math.hypot(x - c.cx, y - c.cy)));
  return {
    ok: Math.abs(mx - c.cx) < 1.5 && Math.abs(my - c.cy) < 1.5
      && Math.abs(q.pin.x - c.cx) < 1.5 && Math.abs(q.pin.y - c.cy) < 1.5
      && corner < c.voidR - 1
      && Math.abs(q.numBox.h - ex.h) < 1 && Math.abs(q.numBox.w - ex.w) < 1.5,
    why: {
      centre: [Math.round((mx - c.cx) * 10) / 10, Math.round((my - c.cy) * 10) / 10], corner: Math.round(corner), voidR: Math.round(c.voidR),
      h: [Math.round(q.numBox.h * 10) / 10, Math.round(ex.h * 10) / 10], w: [Math.round(q.numBox.w * 10) / 10, Math.round(ex.w * 10) / 10], shrunk: ex.shrunk,
    },
  };
}

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

    /* 3 first, before any burst has drawn a numeral: the loading screen held
       all ten decoded */
    const warm = await P.page.evaluate((urls) => {
      const W = window.__btLevelUpWarm;
      if (!W || typeof W.has !== 'function') return null;
      return urls.map((u) => W.has(new URL(u, location.href).href));
    }, LEVELUP_NUM_URLS);
    rec.ok(`3. the ten gold numerals held decoded from the loading screen (${warm ? warm.filter(Boolean).length : 'no seam'}/10)`,
      !!warm && warm.length === 10 && warm.every(Boolean), warm);

    /* 7a. v2.3.5004: before any burst, what the loading screen holds of the
       art: the numbers (0.88 MB) and no picture of it -- or, with
       burstnumbers=0, the strip decoded (6.29 MB) as before */
    const held = await P.page.evaluate(() => {
      const W = window.__btLevelUpWarm;
      return W && typeof W.numbers === 'function' && typeof W.artHeld === 'function' ? { num: W.numbers(), art: W.artHeld() } : null;
    });
    const STRIP_BYTES = LEVELUP_STRIP_W * LEVELUP_STRIP_H * 4;
    if (NUMBERS) {
      rec.ok(`7a. the art held as colour numbers from the loading screen: ${held ? held.num.frames : '-'}/8 frames, ${held ? (held.num.bytes / 1e6).toFixed(2) : '-'} MB; as a picture: ${held ? held.art.n : '-'} (${held ? (held.art.bytes / 1e6).toFixed(2) : '-'} MB; the strip was ${(STRIP_BYTES / 1e6).toFixed(2)})`,
        !!held && held.num.ready && held.num.frames === 8 && held.num.bytes > 0.8e6 && held.num.bytes < 1.0e6 && held.art.n === 0 && held.art.bytes === 0, held);
    } else {
      rec.ok(`7a. burstnumbers=0: the strip held decoded as before (${held ? (held.art.bytes / 1e6).toFixed(2) : '-'} MB), no numbers`,
        !!held && !held.num.wanted && held.num.frames === 0 && held.art.n === 1 && held.art.bytes === STRIP_BYTES, held);
    }

    /* 1. each kind, at rest (frame 7 and the caption, before the fade) */
    const worldBottom = PHONE.height * 0.67;
    const rest = LEVELUP_FRAMES[LEVELUP_FRAMES.length - 1];
    for (const c of CASES) {
      await P.page.evaluate((m) => window._setLevelUpMsg({ ...m, ts: Date.now() }), c.msg);
      const q = await atRest(P);
      const v = q && q.numBox && q.art && q.pin ? inCircle(q, rest, c.num) : { ok: false, why: null };
      rec.ok(`1. ${c.name}: "${q && q.value}" drawn as the numerals ${q && q.digits} (all loaded: ${q && q.digitsLoaded}) in the paper centre ${JSON.stringify(v.why)}`,
        !!q && q.cols === 1 && q.value === c.num && q.digits === c.num && q.digitsLoaded && v.ok, { q, why: v.why });
      const plateOk = !!q && !!q.icon && !!q.wordsBox && !!q.plate && q.iconLoaded && c.words.test(q.words || '')
        && !q.numOnPlate && q.icon.r <= q.wordsBox.l + 0.5
        && Math.abs((q.icon.t + q.icon.b) / 2 - (q.wordsBox.t + q.wordsBox.b) / 2) < 3
        && q.icon.l >= q.plate.l && q.icon.r <= q.plate.r && q.plate.h < 48 && q.plate.b <= worldBottom;
      rec.ok(`1. ${c.name}: the plate one row, ${q && q.plate ? Math.round(q.plate.h) : '-'} px tall, the icon (loaded) before "${q && q.words}" and level with it, no number on it, above the tray (${q && q.plate ? Math.round(q.plate.b) : '-'} <= ${Math.round(worldBottom)})`,
        plateOk, q);
      await gone(P);
      await P.page.waitForTimeout(300);
    }

    /* 4. how long it stays, judged by the burst's own clock (it runs from the
       message's ts, LevelUpBurst.jsx): sampled every frame as [ms since the
       message, its opacity], so a page slow to draw (this box mounted it 552
       and 849 ms late, and took it down as late) samples the same timeline
       more sparsely rather than a shorter or longer one.  Fully shown past
       1,100 ms, where v2.3.3608's had faded (its hold ended at 1,045); gone
       from the screen by its own end; and never taken down early. */
    const life = await P.page.evaluate(() => new Promise((res) => {
      const ts = Date.now();
      const seen = [];
      window._setLevelUpMsg({ kind: 'combat', level: 15, skill: 'sword', skillLabel: 'Melee', skillLevel: 10, ts });
      const tick = () => {
        const root = document.querySelector('[data-levelup-kind]');
        const t = Date.now() - ts;
        if (root) seen.push([t, Math.round(parseFloat(getComputedStyle(root).opacity) * 100) / 100]);
        else if (seen.length) return res({ seen, gone: t });
        if (t > 12000) return res({ seen, gone: null });
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }));
    const fullLate = life.seen.filter(([t, a]) => t >= 1100 && t <= LEVELUP_TOTAL_MS - LEVELUP_FADE_MS && a >= 0.99).map(([t]) => t);
    /* still showing a frame AFTER one already past its end: the frame a
       sample lands in may not have re-drawn the burst yet (this rAF can run
       before the burst's own), but the next one has */
    const lingering = life.seen.filter(([, a], i) => i > 0 && life.seen[i - 1][0] > LEVELUP_TOTAL_MS + 50 && a > 0.01);
    rec.ok(`4. on screen by its own clock: fully shown at ${fullLate.length ? fullLate[fullLate.length - 1] : 'no'} ms (past 1,100, where v2.3.3608's had faded), gone from view by ${LEVELUP_TOTAL_MS} ms (${lingering.length} late frames showing it), taken down at ${life.gone} ms (it appeared at ${life.seen.length ? life.seen[0][0] : '-'}); ${LEVELUP_TOTAL_MS} is ${Math.round(LEVELUP_TOTAL_MS / OLD_TOTAL_MS * 100)}% of ${OLD_TOTAL_MS}`,
      LEVELUP_TOTAL_MS >= OLD_TOTAL_MS * 1.45 && LEVELUP_TOTAL_MS <= OLD_TOTAL_MS * 1.55
        && fullLate.length > 0 && lingering.length === 0 && life.gone != null && life.gone >= LEVELUP_TOTAL_MS - 60,
      { seen: life.seen.slice(0, 40), gone: life.gone, total: LEVELUP_TOTAL_MS });
    await gone(P);

    /* 2. mid-run, frozen at a named frame: a push of the same kind and skill
       replaces the slot (levelUpBursts.js), so each is a new burst reading
       the freeze from its first render, in the one column */
    for (const m of [{ frame: 0, at: 35 }, { frame: 4, at: 345 }]) {
      await P.page.evaluate(([ms, msg]) => { window.__btLevelUpFreeze = ms; window._setLevelUpMsg({ ...msg, ts: Date.now() }); }, [m.at, MID.msg]);
      await P.page.waitForTimeout(300);
      const q = await frozenRead(P);
      const f = LEVELUP_FRAMES[m.frame];
      const v = q && q.numBox && q.art && q.pin ? inCircle(q, f, MID.num) : { ok: false, why: null };
      rec.ok(`2. held at frame ${m.frame} (its circle ${f.r} px of the art), "${q && q.value}" is in the void's middle at the circle's size ${JSON.stringify(v.why)}`,
        !!q && q.cols === 1 && q.value === MID.num && v.ok, { q, why: v.why });
    }

    /* 7b. v2.3.5004: each frame held (the freeze) in turn, read off its
       canvas: drawn from that frame's own file, at the box's top left, at
       the box's scale (k the same for all eight) */
    const starts = []; let acc = 0;
    for (const f of LEVELUP_FRAMES) { starts.push(acc); acc += f.ms; }
    const ks = [];
    for (let i = 0; i < LEVELUP_FRAMES.length; i++) {
      const f = LEVELUP_FRAMES[i];
      const at = f.ms ? starts[i] + f.ms / 2 : LEVELUP_RUN_MS + 200;
      await P.page.evaluate(([ms, msg]) => { window.__btLevelUpFreeze = ms; window._setLevelUpMsg({ ...msg, ts: Date.now() }); }, [at, MID.msg]);
      const q = await P.page.waitForFunction(([want, SW, SH]) => {
        const all = document.querySelectorAll('[data-levelup-art]');
        const art = all[0];
        if (all.length !== 1 || !art || art.getAttribute('data-levelup-frame') !== String(want)) return null;
        const r = art.getBoundingClientRect();
        const cv = art.querySelector('canvas');
        const out = { numbers: art.getAttribute('data-levelup-numbers'), w: r.width, h: r.height, bg: getComputedStyle(art).backgroundImage.slice(0, 160) };
        if (cv) {
          if (!cv.width) return null;   /* not drawn yet */
          const cr = cv.getBoundingClientRect();
          const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
          let n = 0, sum = 0, past = 0;
          for (let y = 0; y < cv.height; y++) {
            for (let x = 0; x < cv.width; x++) {
              const a = d[(y * cv.width + x) * 4 + 3];
              if (x < SW && y < SH) { if (a) { n++; sum += a; } } else if (a) past++;
            }
          }
          out.cv = { w: cv.width, h: cv.height, cssW: cr.width, cssH: cr.height, dx: cr.left - r.left, dy: cr.top - r.top, n, sum, past };
        }
        return out;
      }, [i, f.sw, f.sh], { timeout: 8000, polling: 100 }).then((h) => h.jsonValue()).catch(() => null);
      if (NUMBERS) {
        const want = await frameAlpha(i);
        const k = q ? q.w / f.sw : 0;
        ks.push(k);
        const c = q && q.cv;
        rec.ok(`7b. frame ${i} (${f.sw} x ${f.sh}) drawn from its numbers: ${c ? c.n : '-'} px showing (the file: ${want.n}), alpha ${c ? c.sum : '-'} (${want.sum}), ${c ? c.past : '-'} past the frame; the canvas ${c ? c.w + ' x ' + c.h : '-'} at k ${k.toFixed(3)}`,
          !!c && q.numbers === '1' && want.w === f.sw && want.h === f.sh
            && c.w === LEVELUP_MAX_W && c.h === LEVELUP_MAX_H && c.n === want.n && c.sum === want.sum && c.past === 0
            && Math.abs(c.dx) < 0.5 && Math.abs(c.dy) < 0.5
            && Math.abs(c.cssW / LEVELUP_MAX_W - k) < 0.005 * k && Math.abs(q.h / f.sh - k) < 0.005 * k,
          { q, want });
      } else {
        rec.ok(`7b. burstnumbers=0: frame ${i} drawn from the strip`, !!q && q.numbers === '0' && !q.cv && /levelup-burst-v1\.webp/.test(q.bg), q);
      }
    }
    if (NUMBERS) {
      const st = await P.page.evaluate(() => window.__btLevelUpWarm.numbers());
      const kOk = ks.length === 8 && ks.every((k) => k > 0 && Math.abs(k - ks[0]) < 0.005 * ks[0]);
      rec.ok(`7b. one scale for all eight (k ${ks.map((k) => k.toFixed(3)).join(', ')}); a frame's draw ${st.lastMs} ms last, ${st.maxMs} ms at most (the line: 12 ms)`,
        kOk && st.maxMs < 12, { ks, st });
    }
    /* the frozen burst let go (its own clock is long past its end) */
    await P.page.evaluate(() => { delete window.__btLevelUpFreeze; });
    await gone(P);
    await P.page.waitForTimeout(300);

    /* 7c. v2.3.5004: a burst played live: its frames in order to 7, drawn at
       most once each, the canvas emptied and the ImageData let go after */
    if (NUMBERS) {
      const live = await P.page.evaluate(() => new Promise((res) => {
        const W = window.__btLevelUpWarm;
        const d0 = W.numbers().draws;
        const ts = Date.now();
        const seen = [];
        let cv = null;
        window._setLevelUpMsg({ kind: 'combat', level: 16, skill: 'sword', skillLabel: 'Melee', skillLevel: 11, ts });
        const tick = () => {
          const art = document.querySelector('[data-levelup-art]');
          if (art) {
            const f = +art.getAttribute('data-levelup-frame');
            if (seen[seen.length - 1] !== f) seen.push(f);
            cv = art.querySelector('canvas') || cv;
          } else if (seen.length) {
            setTimeout(() => { const n = W.numbers(); res({ seen, draws: n.draws - d0, cvW: cv ? cv.width : null, cvH: cv ? cv.height : null, scratch: n.scratch, users: n.users }); }, 400);
            return;
          }
          if (Date.now() - ts > 12000) { res({ seen, timeout: true }); return; }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }));
      const inOrder = live.seen.length > 0 && live.seen.every((f, j) => j === 0 || f > live.seen[j - 1]) && live.seen[live.seen.length - 1] === 7;
      rec.ok(`7c. played live: frames ${live.seen.join(' ')} (in order to 7), ${live.draws} draws (one a frame at most: <= 8), the canvas emptied after (${live.cvW} x ${live.cvH}), the ImageData let go (${!live.scratch})`,
        !live.timeout && inOrder && live.draws >= live.seen.length && live.draws <= 8 && live.cvW === 0 && live.cvH === 0 && !live.scratch && live.users === 0, live);
      await gone(P);
    }

    rec.ok('5. no page errors', errors.length === 0, errors.slice(0, 3));

    /* 6. the pictures, held in the hold: last, as a frozen burst never
       retires -- one burst (replacing step 2's in its column), then a second
       beside it (a combat skill's level with a life skill's, two columns at
       the smaller size) */
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
