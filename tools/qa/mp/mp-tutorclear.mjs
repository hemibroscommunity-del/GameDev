/* ═══ v2.3.6791: NO TUTORIAL MESSAGE OVER THE CONTROLLER (card UI3, PR 11) ═══
 *
 * The owner, 2026-11-27, after the new controller landed (card PAD): "Needs
 * to fix tutorial messages over new controller area."
 *
 * A brand-new character in the world's BroTown, on an upright phone
 * (375 x 667), a sideways one (667 x 375), real touch, and a computer (wide).
 * At every message of the first minutes the WORDS' box of each message is
 * measured against the housings' boxes (the stick's lobe, the rail, the right
 * lobe and its tier), worked out HERE from the shell as drawn
 * (`[data-padhousing="shell"]`, window.__btPad's layout) and the outline's
 * measured tops (game/tutorClear.js HOUSING_TOP_REF), never from the rule the
 * game asks:
 *   1. the welcome: the WELCOME plate;
 *   2. the coach's TALK TO MAYOR BRO card (hung BELOW him: the right lobe,
 *      sideways, on main);
 *   3. QUEST ACCEPTED!, then GEAR UP and the big arrow's words ("Tap to
 *      open": the rail and the stick's lobe, sideways, on main);
 *   4. a "Next: ..." toast (QuestStepNudge's card: 14 px over the band, in
 *      the shell, on main), through the page's probe window.__btTutorClear;
 *   5. the Add to Home Screen card (iPhone Safari's; 12 px over the band);
 *   6. the controls tour (Settings' "Controls"), every step;
 *   7. no message pushed off the screen's top or over the top bar to clear it;
 *   8. a sweep: any element with words drawn over a housing (a message added
 *      tomorrow with `bottom: 160`) at each sample;
 *   9. no page errors.
 * On a computer the controller is not drawn (padSkin.js padOn): no shell,
 * and every message keeps its place.  RED on main at 2, 3, 4, 5 (and 6
 * sideways); green with the rule.
 * Pictures: tools/qa/mp/out/tutorclear-<view>-<step>.png (TUTOR_SHOTS=<dir>
 * copies them, for docs/shots).
 *
 *   node tools/qa/mp/run.mjs tutorclear
 */
import * as H from './harness.mjs';
import { mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { HOUSING_TOP_REF, REF_H } from '../../../src/game/tutorClear.js';
export const lane = 'full';

const VIEWS = [
  { id: 'upright', opts: { viewport: { width: 375, height: 667 }, touch: true } },
  { id: 'sideways', opts: { viewport: { width: 667, height: 375 }, touch: true } },
  { id: 'computer', opts: { viewport: { width: 1280, height: 800 }, wide: true } },
];

/* the words of each message: [selector, name] */
const WORDS = [
  ['[data-coach-card]', 'coach card'],
  ['[data-quest-banner] .bt-quest-plate', 'quest plate'],
  ['[data-store-toast] > div', 'toast'],
  ['[data-install-hint]', 'install card'],
  ['[data-guide-arrow] > div', 'arrow words'],
  ['[data-ctltut-card]', 'controls tour card'],
  ['[data-desk-teach]', 'desk teach'],
];

const sample = (P, args) => P.page.evaluate(({ WORDS, TOP, REFH }) => {
  const out = { hous: [], hits: [], sweep: [], high: [], shown: [] };
  const shell = document.querySelector('[data-padhousing="shell"]');
  const pad = window.__btPad;
  if (shell && pad && pad.layout) {
    const r = shell.getBoundingClientRect();
    const L = pad.layout, k = r.height / REFH;
    const rise = pad.tier && pad.tier.rise > 0 ? pad.tier.rise : 0;
    out.hous.push({ n: 'left', l: r.left, r: r.left + L.shell.cutL, t: r.bottom - (REFH - TOP.left) * k, b: r.bottom });
    out.hous.push({ n: 'rail', l: r.left + L.shell.cutL, r: r.right - L.shell.cutR, t: r.bottom - (REFH - TOP.rail) * k, b: r.bottom });
    out.hous.push({ n: 'right', l: r.right - L.shell.cutR, r: r.right, t: r.bottom - (REFH - TOP.right) * k - rise, b: r.bottom });
  }
  const vis = (el) => {
    const q = el.getBoundingClientRect();
    if (q.width < 2 || q.height < 2) return null;
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return null;
    }
    return q;
  };
  const meet = (q, h) => q.left < h.r - 0.5 && q.right > h.l + 0.5 && q.top < h.b - 0.5 && q.bottom > h.t + 0.5;
  const mine = new Set();
  for (const [sel, name] of WORDS) {
    for (const el of document.querySelectorAll(sel)) {
      const q = vis(el);
      if (!q) continue;
      mine.add(el);
      const txt = (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40);
      if (!txt && name !== 'install card') continue;
      out.shown.push(name + ': ' + txt);
      for (const h of out.hous) if (meet(q, h)) out.hits.push({ name, txt, h: h.n, by: Math.round(Math.min(q.bottom - h.t, h.b - q.top)) });
      if (q.top < 0 || q.bottom > innerHeight + 1) out.high.push({ name, txt, top: Math.round(q.top), bottom: Math.round(q.bottom) });
    }
  }
  /* 8. the sweep: words drawn over a housing by anything not the controller,
     the band or a message already named (text over the world only) */
  if (out.hous.length) {
    const skip = '[data-padhousing], [data-pad], [data-weapon-pill], .bt-desktop-hide, [data-dash], .bt-dash, [data-band], [data-joyzone], [data-coach-ring], [data-guide-arrow]';
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = (n.nodeValue || '').trim();
      if (!t) continue;
      const el = n.parentElement;
      if (!el || el.closest(skip)) continue;
      let ok = false;
      for (const m of mine) if (m.contains(el)) { ok = true; break; }
      if (ok) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      const q = rg.getBoundingClientRect();
      if (q.width < 2 || q.height < 2 || !vis(el)) continue;
      /* drawn over the shell? only what stands above it (the shell's z 7) */
      let z = 0;
      for (let e = el; e && e !== document.body; e = e.parentElement) { const zi = parseInt(getComputedStyle(e).zIndex, 10); if (zi > z) z = zi; }
      if (z <= 7) continue;
      for (const h of out.hous) if (meet(q, h)) { out.sweep.push({ txt: t.slice(0, 30), h: h.n, z, cls: (el.className || '').toString().slice(0, 40) }); break; }
    }
  }
  return out;
}, args);

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const SHOTS = process.env.TUTOR_SHOTS || null;
  if (SHOTS) mkdirSync(SHOTS, { recursive: true });
  const args = { WORDS, TOP: HOUSING_TOP_REF, REFH: REF_H };
  for (const V of VIEWS.filter((v) => !process.env.BT_TC_ONLY || v.id === process.env.BT_TC_ONLY)) {
    const P = await H.newPlayer(browser, { name: 'Tutor' + V.id.slice(0, 4), wsPort, webPort, world: 'wheel', ...V.opts });
    const errors = [];
    P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
    const shot = async (n) => {
      const f = join(OUT, `tutorclear-${V.id}-${n}.png`);
      await P.page.screenshot({ path: f }).catch(() => {});
      if (SHOTS) { try { copyFileSync(f, join(SHOTS, `tutorclear-${V.id}-${n}.png`)); } catch (e) { /* none */ } }
    };
    /* watch for `ms`: every overlap, the sweep's, the messages off the top */
    const watch = async (step, ms, want) => {
      const t0 = Date.now();
      const hits = new Map(), sweep = new Map(), high = new Map();
      const shown = new Set();
      let hous = 0, pictured = false;
      while (Date.now() - t0 < ms) {
        const o = await sample(P, args).catch(() => null);
        if (o) {
          hous = Math.max(hous, o.hous.length);
          for (const s of o.shown) shown.add(s);
          for (const h of o.hits) hits.set(h.name + '|' + h.txt + '|' + h.h, h);
          for (const h of o.sweep) sweep.set(h.txt + '|' + h.h, h);
          for (const h of o.high) high.set(h.name + '|' + h.txt, h);
          if (!pictured && (o.hits.length || (want && o.shown.some((s) => s.startsWith(want))))) { pictured = true; await shot(step); }
        }
        await P.page.waitForTimeout(250);
      }
      const seen = want ? [...shown].some((s) => s.startsWith(want)) : true;
      rec.ok(`${V.id} ${step}: ${want ? want + ' shown (' + seen + '), ' : ''}no words over the controller (${hits.size})`,
        seen && hits.size === 0, { hits: [...hits.values()], shown: [...shown].slice(0, 8), housings: hous });
      if (hous) rec.ok(`${V.id} ${step}: the sweep finds no other words over the controller (${sweep.size})`, sweep.size === 0, [...sweep.values()]);
      rec.ok(`${V.id} ${step}: no message pushed off the screen (${high.size})`, high.size === 0, [...high.values()]);
      return { hous };
    };
    try {
      await H.enterWorld(P);
      await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'world' });
      const w1 = await watch('1-welcome', 6000, null);
      const touch = V.id !== 'computer';
      rec.ok(`${V.id}: the controller is ${touch ? 'drawn (its housings measured)' : 'not drawn on a computer'}`, touch ? w1.hous === 3 : w1.hous === 0, w1);
      await H.pastWelcome(P).catch(() => {});
      await watch('2-coach-mayor', 4000, 'coach card');
      await H.approachNpc(P, 'mayor_bro').catch(() => {});
      await H.advanceNpcDialogue(P, { max: 14 }).catch(() => {});
      await H.confirmQuestOffer(P).catch(() => null);
      await watch('3-accepted', 4000, 'quest plate');
      await H.closeNpcDialogue(P).catch(() => {});
      await watch('3-gear-up', 7000, 'arrow words');
      /* 4. a "Next:" toast */
      const said = await P.page.evaluate(() => { const t = window.__btTutorClear; if (!t) return false; t.say('Next: Open your Bag and tap the log to light a campfire'); return true; });
      rec.ok(`${V.id} 4. the page's probe can say a "Next:" toast (${said})`, said);
      await watch('4-next-toast', 2500, 'toast');
      /* 5. the Add to Home Screen card */
      await P.page.evaluate(() => { const t = window.__btTutorClear; if (t) t.install(); });
      await watch('5-install', 2000, 'install card');
      await P.page.evaluate(() => { const b = document.querySelector('[data-install-hint-dismiss]'); if (b) b.click(); });
      /* 6. the controls tour, every step */
      const opened = await P.page.evaluate(() => { const b = window.__btCtlTut; if (!b) return false; b.open(); return true; });
      await P.page.waitForTimeout(600);
      const steps = await P.page.evaluate(() => (window.__btCtlTutSteps ? window.__btCtlTutSteps().live.length : 0)).catch(() => 0);
      rec.ok(`${V.id} 6. the controls tour opens (${opened}, ${steps} steps)`, opened && steps > 0);
      for (let i = 0; i < steps; i++) {
        await watch('6-tour-' + (i + 1), 1200, 'controls tour card');
        if (i < steps - 1) await P.page.click('[data-ctltut-card]', { position: { x: 20, y: 20 } }).catch(() => {});
        await P.page.waitForTimeout(350);
      }
      await P.page.evaluate(() => { try { window.__btCtlTut.close(); } catch (e) { /* closed */ } });
      rec.ok(`${V.id} 9. no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 3));
    } finally {
      await P.ctx.close().catch(() => {});
    }
  }
}
