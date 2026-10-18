/* ═══ v2.3.3343: HOW LOUD THE NEW SOUNDS ARE, RENDERED ═══
 *
 * The owner, 2026-10-18: "Start adding the have ones" -- the missing sounds
 * made from recordings already in the game (data/eventSounds.js).  Their
 * levels were tuned by measuring each slice; this RENDERS every cue for real
 * through Web Audio, as the game plays it (an OfflineAudioContext: the same
 * slices, rates, delays, gains and fades, every layer together, at the share 1
 * a cue is written for), and checks:
 *
 *   1. no cue clips (there is no limiter on the bus): peak under 0.95;
 *   2. none is lost or deafening: each between 0.08 and 4 times the game's own
 *      hit (sword-hit3 at 0.55 x HIT_GAIN, "1.0" in the table's comments);
 *   3. the level a cue's comment promises (~0.55, ~1.4 ...) is the level it
 *      has, within a factor of 1.6 -- measured the way the table was tuned, the
 *      loudest 50 ms, plain RMS -- so the comments stay true;
 *   4. the quiet ones stay quiet: the reveal's and the spin's ticks under the
 *      menu click's own level, a status wearing off under a blow;
 *   5. a rush of air is air: the dodge, the roll, the jump's push-off, the
 *      sprint running dry and the mummy's unwrapping each put at most 0.6 of
 *      the old sprint push-off's share of their energy below 400 Hz -- the
 *      owner heard that slowed special swipe's body thump as "a fleshy sound"
 *      (v2.3.3336; measured through a 400 Hz low-pass, which lets a little
 *      above it through, hence the comparison and not a fixed number).
 *
 * Prints every cue's level, so a retune starts from numbers.
 *
 *   node tools/qa/mp/mp-cuelevels.mjs        # needs dist/ built
 */
import * as H from './harness.mjs';
import { EVENT_SOUNDS } from '../../../src/data/eventSounds.js';

/* the levels the table's comments promise (data/eventSounds.js) */
const PROMISED = {
  shieldBlock: 1.4, shieldBall: 0.6, shieldUp: 0.55, shieldDown: 0.35, dodged: 0.5, dodgeRoll: 0.6,
  crit: 0.65, bowDraw: 0.5, discovery: 0.8, jumpUp: 0.4, jumpLand: 0.4, statusEnd: 0.2,
  throwSnow: 0.5, door: 0.65, gatherReady: 0.45, lootDrop: 0.25, dungeonClear: 2.5,
};

const WEB = await H.freePort();
const srv = await H.serveDist(WEB);
const b = await H.launch();
let fail = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };

try {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await p.goto(`http://localhost:${WEB}/`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => !!(window.BT_AUDIO && window.BT_AUDIO.SFX_MANIFEST), null, { timeout: 30000 });

  const res = await p.evaluate(async (table) => {
    const A = window.BT_AUDIO;
    const SR = 48000;
    const dec = new AudioContext();
    const bufs = {};
    const need = new Set(['sword-hit3', 'ui-click']);
    for (const n of Object.keys(table)) for (const L of table[n]) need.add(L[0]);
    for (const k of need) {
      const r = await fetch(A.SFX_MANIFEST[k]);
      bufs[k] = await dec.decodeAudioData(await r.arrayBuffer());
    }
    /* A-weighting at 48 kHz (mp-hitsound's three sections) */
    const AW = [
      [[0.234300592866472, 0.468601185732944, 0.234300592866472], [1, -0.224558458059779, 0.0126066252715464]],
      [[1, -2, 1], [1, -1.89387049472307, 0.895159769094662]],
      [[1, -2, 1], [1, -1.99461445599302, 0.994621707014084]],
    ];
    const loudest = (ch) => {
      const w = Math.floor(SR * 0.05);
      let s = 0, best = 0;
      for (let i = 0; i < ch.length; i++) {
        s += ch[i] * ch[i];
        if (i >= w) s -= ch[i - w] * ch[i - w];
        if (i >= w - 1 && s > best) best = s;
      }
      return Math.sqrt(Math.max(0, best) / w);
    };
    /* as BT_AUDIO._playLayer plays a layer: vol x hg x gain, the rate, the
       slice, the delay, and a fade over the slice's last `fade` seconds */
    const render = async (layers, vol, hg) => {
      const once = async (aw, lp) => {
        let len = 0.2;
        for (const L of layers) {
          const dur = L[2] > 0 ? L[2] : bufs[L[0]].duration - (L[1] || 0);
          len = Math.max(len, (L[5] || 0) + dur / (L[4] || 1) + 0.1);
        }
        const oc = new OfflineAudioContext(1, Math.ceil(SR * len), SR);
        let bus = oc.destination;
        if (aw) for (let i = AW.length - 1; i >= 0; i--) { const f = oc.createIIRFilter(AW[i][0], AW[i][1]); f.connect(bus); bus = f; }
        if (lp) for (let i = 0; i < 2; i++) { const f = oc.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400; f.Q.value = 0.7071; f.connect(bus); bus = f; }
        for (const L of layers) {
          const src = oc.createBufferSource();
          src.buffer = bufs[L[0]];
          const rate = L[4] || 1;
          src.playbackRate.value = rate;
          const g = oc.createGain();
          const v = vol * hg * L[3];
          g.gain.value = v;
          src.connect(g); g.connect(bus);
          const when = L[5] || 0;
          if (L[2] > 0) src.start(when, L[1] || 0, L[2]); else src.start(when, L[1] || 0);
          if (L[6] > 0 && L[2] > 0) {
            const real = L[2] / rate;
            g.gain.setValueAtTime(v, when + Math.max(0, real - L[6]));
            g.gain.linearRampToValueAtTime(0, when + real);
          }
        }
        return (await oc.startRendering()).getChannelData(0);
      };
      const plain = await once(false);
      let peak = 0;
      for (let i = 0; i < plain.length; i++) if (Math.abs(plain[i]) > peak) peak = Math.abs(plain[i]);
      const energy = (ch) => { let e = 0; for (let i = 0; i < ch.length; i++) e += ch[i] * ch[i]; return e; };
      const low = energy(await once(false, true)) / Math.max(1e-12, energy(plain));
      return { peak, rms: loudest(plain), arms: loudest(await once(true)), low };
    };
    const ref = await render([['sword-hit3', 0, 0, 1]], 0.55, A.HIT_GAIN);
    /* the old sprint push-off, the slowed special swipe ("a fleshy sound") */
    const fleshy = await render([['special-swipe', 0.02, 0.3, 2, 0.82]], 1, 1);
    /* the menu click as BT_AUDIO.uiClickNow plays it (UI_CLICK_VOL 0.85, from UI_CLICK_OFFSET) */
    const click = await render([['ui-click', A.UI_CLICK_OFFSET, 0, 1]], A.UI_CLICK_VOL, 1);
    const out = {};
    for (const n of Object.keys(table)) {
      const r = await render(table[n], 1, 1);
      out[n] = { peak: r.peak, plain: r.rms / ref.rms, ear: r.arms / ref.arms, low: r.low };
    }
    return { out, click: { plain: click.rms / ref.rms, ear: click.arms / ref.arms }, fleshyLow: fleshy.low };
  }, EVENT_SOUNDS);

  const f2 = (v) => v.toFixed(2);
  console.log('    cue              level (plain / by ear)  peak   under 400 Hz');
  for (const [n, r] of Object.entries(res.out)) console.log(`    ${n.padEnd(16)} ${f2(r.plain).padStart(5)} / ${f2(r.ear).padStart(5)}         ${f2(r.peak)}   ${Math.round(r.low * 100)}%`);
  console.log(`    (the menu click: ${f2(res.click.plain)} / ${f2(res.click.ear)})`);

  const clip = Object.entries(res.out).filter(([, r]) => !(r.peak < 0.95));
  ok(clip.length === 0, `1. no cue clips: every peak under 0.95 (${clip.map(([n, r]) => n + ' ' + f2(r.peak)).join(', ') || 'all clear'})`);
  const odd = Object.entries(res.out).filter(([, r]) => { const m = 0.5 * (r.plain + r.ear); return !(m > 0.08 && m < 4); });
  ok(odd.length === 0, `2. every cue between 0.08 and 4 times the game's hit (${odd.map(([n, r]) => n + ' ' + f2(0.5 * (r.plain + r.ear))).join(', ') || 'all'})`);
  const off = Object.entries(PROMISED).filter(([n, want]) => { const got = res.out[n] && res.out[n].plain; return !(got > want / 1.6 && got < want * 1.6); });
  ok(off.length === 0, `3. the levels the comments promise are the levels they have, within 1.6x (${off.map(([n, w]) => `${n} ~${w} is ${f2(res.out[n].plain)}`).join(', ') || Object.keys(PROMISED).length + ' checked'})`);
  const ticks = ['revealTick', 'spinTick'].filter((n) => !(res.out[n].plain <= res.click.plain * 1.15));
  ok(ticks.length === 0 && res.out.statusEnd.plain < 0.5,
    `4. the quiet ones stay quiet: the reveal's and spin's ticks at or under the menu click (${f2(res.out.revealTick.plain)}, ${f2(res.out.spinTick.plain)} vs ${f2(res.click.plain)}), a status wearing off under half a blow (${f2(res.out.statusEnd.plain)})`);
  const AIRY = ['dodged', 'dodgeRoll', 'jumpUp', 'sprintOut', 'unwrap'];
  const thump = AIRY.filter((n) => !(res.out[n].low <= 0.6 * res.fleshyLow));
  ok(thump.length === 0, `5. a rush of air is air: ${AIRY.map((n) => n + ' ' + Math.round(res.out[n].low * 100) + '%').join(', ')} of its energy under 400 Hz (the old "fleshy" push-off ${Math.round(res.fleshyLow * 100)}%; at most 0.6 of it)`);
  ok(errs.length === 0, `no page errors (${errs.slice(0, 2).join(' | ')})`);
} finally {
  await b.close();
  srv.close();
}
console.log(fail ? `\n${fail} FAILED` : '\nALL PASS');
process.exit(fail ? 1 : 0);
