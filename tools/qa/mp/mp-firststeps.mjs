/* ═══ A NEW CHARACTER'S FIRST STEPS: FIVE, AND NOTHING MORE (v2.3.4106) ═══
 *
 * The owner, 2026-11-03: "First sequence of events when first creating
 * character should be welcome to Brotown, talk to mayor bro, equip weapons,
 * see minimap with star marker and quest progress in top left pill. Don't
 * include the non-essential stuff anymore like tap to talk etc".
 *
 * A brand-new character in the world's BroTown, on an upright phone (390 x
 * 844, touch), a phone on its side (844 x 390) and a computer (wide).  Every coach card and every big
 * arrow that comes up is recorded (sampled in the page every 200 ms):
 *   1. the WELCOME plate, "BroTown", first;
 *   2. the coach's "Talk to Mayor Bro" card ringing HIM, and the big arrow at
 *      him; talking to him (H.approachNpc) ends it;
 *   3. his first quest taken: "Gear up" (and the arrow at the glow's target);
 *      the sword and the shield worn end it;
 *   4. "Your map" ringing the minimap box, then going by itself;
 *   5. "Your quest" ringing the quest card at the top left, then going;
 *   then 25 s of quiet: no other card;
 *   6. the cards seen, in order, are exactly mayor, equip, minimap,
 *      questPill -- none of the retired ones (move, attack, chat, ...);
 *   7. no page errors.
 * BT_FS_ONLY=phone|sideways|computer runs one view.
 * Pictures: tools/qa/mp/out/firststeps-<view>-<n>-<step>.png (the phone's
 * five are docs/shots/first-steps-*.webp).
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const VIEWS = [
  { id: 'phone', opts: { viewport: { width: 390, height: 844 }, touch: true } },
  { id: 'sideways', opts: { viewport: { width: 844, height: 390 }, touch: true } },
  { id: 'computer', opts: { viewport: { width: 1280, height: 800 }, wide: true } },
];
const WANT = ['mayor', 'equip', 'minimap', 'questPill'];

/* every card and arrow that shows, in order, recorded in the page */
const RECORDER = `(() => {
  window.__fsSeen = []; window.__fsArrows = []; window.__fsWelcome = 0;
  setInterval(() => {
    try {
      const c = document.querySelector('[data-coach]');
      const id = c ? c.getAttribute('data-coach') : null;
      const L = window.__fsSeen;
      if (id && L[L.length - 1] !== id) L.push(id);
      const a = window.__btGuideArrow && document.querySelector('[data-guide-arrow]') ? window.__btGuideArrow.lesson : null;
      const A = window.__fsArrows;
      if (a && A[A.length - 1] !== a) A.push(a);
      if (!window.__fsWelcome && document.querySelector('[data-quest-banner="welcome"]')) window.__fsWelcome = Date.now();
    } catch (e) { /* a probe only */ }
  }, 200);
})();`;

const card = (P) => P.page.evaluate(() => {
  const el = document.querySelector('[data-coach]');
  if (!el) return null;
  const ring = el.querySelector('[data-coach-ring]');
  const rr = ring ? ring.getBoundingClientRect() : null;
  return { id: el.getAttribute('data-coach'), text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
    ring: rr ? { left: rr.left, top: rr.top, width: rr.width, height: rr.height } : null };
});
async function waitCard(P, id, ms = 30000) {
  let c = null;
  for (const t0 = Date.now(); Date.now() - t0 < ms;) {
    c = await card(P);
    if (c && c.id === id) return c;
    await P.page.waitForTimeout(250);
  }
  return c;
}
/* does the ring sit over rect r's middle? */
const ringOn = (c, r) => !!(c && c.ring && r)
  && (r.left + r.width / 2) >= c.ring.left - 2 && (r.left + r.width / 2) <= c.ring.left + c.ring.width + 2
  && (r.top + r.height / 2) >= c.ring.top - 2 && (r.top + r.height / 2) <= c.ring.top + c.ring.height + 2;

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  for (const V of VIEWS.filter((v) => !process.env.BT_FS_ONLY || v.id === process.env.BT_FS_ONLY)) {
    const P = await H.newPlayer(browser, { name: 'First' + V.id.slice(0, 4), wsPort, webPort, world: 'wheel', init: RECORDER, ...V.opts });
    const shot = (n) => P.page.screenshot({ path: join(OUT, `firststeps-${V.id}-${n}.png`) }).catch(() => {});
    const errors = [];
    P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
    try {
      await H.enterWorld(P);
      await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'world' });

      /* 1. the welcome */
      let welcome = null;
      for (let i = 0; i < 60 && !welcome; i++) {
        welcome = await P.page.evaluate(() => { const b = document.querySelector('[data-quest-banner="welcome"]'); return b ? (b.textContent || '').replace(/\s+/g, ' ').trim() : null; });
        if (!welcome) await P.page.waitForTimeout(250);
      }
      await shot('1-welcome');
      const cardAtWelcome = await card(P);
      rec.ok(`${V.id} 1. the WELCOME plate first, alone: "${welcome}"`, !!welcome && /welcome/i.test(welcome) && /BroTown/.test(welcome) && !cardAtWelcome, { welcome, cardAtWelcome });

      /* 2. talk to Mayor Bro: the card rings him, the arrow points at him */
      const c2 = await waitCard(P, 'mayor');
      const mayorAt = await P.page.evaluate(() => {
        const S = window._gameState.current, n = (S.npcs || []).find((o) => o.name === 'Mayor Bro');
        const cv = document.querySelector('canvas.brotown-canvas') || document.querySelector('canvas');
        if (!n || !cv) return null;
        const r = cv.getBoundingClientRect(), sx = S._worldScaleX || 1, sy = S._worldScaleY || 1;
        return { left: r.left + (n.x - S.camera.x) * sx - 2, top: r.top + (n.y - S.camera.y) * sy - 50 * sy, width: 4, height: 4 };
      });
      await P.page.waitForTimeout(800);
      const arrow2 = await P.page.evaluate(() => (window.__btGuideArrow ? { lesson: window.__btGuideArrow.lesson, el: !!document.querySelector('[data-guide-arrow]') } : null));
      await shot('2-mayor');
      rec.ok(`${V.id} 2. "Talk to Mayor Bro" rings him ("${c2 && c2.text}"), and the big arrow points at him`,
        !!c2 && c2.id === 'mayor' && /Talk to Mayor Bro/.test(c2.text) && !/tap/i.test(c2.text) && ringOn(c2, mayorAt) && !!arrow2 && arrow2.lesson === 'mayor' && arrow2.el,
        { c2, mayorAt, arrow2 });
      const talked = await H.approachNpc(P, 'mayor_bro');
      await P.page.waitForTimeout(800);
      const after2 = await P.page.evaluate(() => ({ done: window.__btCoach ? window.__btCoach().done.mayor : null }));
      rec.ok(`${V.id} 2. ...talking to him ends it`, talked && after2.done === true, { talked, after2 });

      /* 3. his quest taken: gear up */
      await H.acceptQuestFromGiver(P).catch(() => null);
      await H.waitFor(P, (S) => (S.rpg && S.rpg._quests && S.rpg._quests.tut_1) || null, (v) => v === 'active', { timeout: 15000, label: 'tut_1 taken' }).catch(() => null);
      await H.closeNpcDialogue(P).catch(() => {});
      const c3 = await waitCard(P, 'equip');
      await P.page.waitForTimeout(600);
      await shot('3-equip');
      rec.ok(`${V.id} 3. the first quest taken: "${c3 && c3.text}"`, !!c3 && c3.id === 'equip', c3);
      await H.equipWeapon(P, 'greatsword', 'weapon', 'melee').catch(() => null);
      await P.page.evaluate(() => {
        const S = window._gameState.current, R = S && S.rpg;
        if (!R || R.shield || !Array.isArray(R.shieldStash) || !R.shieldStash.length) return;
        const sh = R.shieldStash.shift();
        R.shield = sh;
        if (S.channel && S._serverCaps && S._serverCaps.shieldwear) {
          const payload = (typeof sh.gid === 'string' && sh.gid) ? { gid: sh.gid } : { sig: [sh.name || '', sh.gearBase || '', sh.tierMult == null ? '' : sh.tierMult, sh.tier || ''].join('|') };
          try { S.channel.send({ type: 'shield_wear', payload }); } catch (e) { /* the next change reports it */ }
        }
      });

      /* 4. the map and its star */
      const c4 = await waitCard(P, 'minimap', 20000);
      const box = await P.page.evaluate(() => { const m = window.__btWheelMini; return m ? { left: m.left, top: m.top, width: m.w, height: m.h } : null; });
      await P.page.waitForTimeout(600);
      await shot('4-minimap');
      rec.ok(`${V.id} 4. the gear on: "${c4 && c4.text}" rings the minimap`, !!c4 && c4.id === 'minimap' && /star/i.test(c4.text) && ringOn(c4, box), { c4, box });

      /* 5. the quest card */
      const c5 = await waitCard(P, 'questPill', 20000);
      const pill = await P.page.evaluate(() => { const e = document.querySelector('[data-quest-hud]'); if (!e) return null; const r = e.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; });
      await P.page.waitForTimeout(600);
      await shot('5-quest');
      rec.ok(`${V.id} 5. then "${c5 && c5.text}" rings the quest card at the top left`, !!c5 && c5.id === 'questPill' && ringOn(c5, pill) && !!pill && pill.top < 200, { c5, pill });

      /* then quiet */
      await P.page.waitForTimeout(25000);
      const tail = await card(P);
      const seen = await P.page.evaluate(() => ({ cards: window.__fsSeen.slice(), arrows: window.__fsArrows.slice(), coach: window.__btCoach ? window.__btCoach() : null }));
      await shot('6-after');
      rec.ok(`${V.id} 6. the cards, in order: ${seen.cards.join(' -> ')}; the arrows: ${seen.arrows.join(' -> ')}; then nothing`,
        seen.cards.join() === WANT.join() && !tail && seen.arrows[0] === 'mayor' && seen.arrows.every((a) => a === 'mayor' || a === 'weapon')
          && !!seen.coach && WANT.every((id) => seen.coach.done[id] === true),
        { cards: seen.cards, arrows: seen.arrows, tail, done: seen.coach && seen.coach.done });
      rec.ok(`${V.id} 7. no page errors`, errors.length === 0, errors.slice(0, 3));
    } finally {
      await P.ctx.close().catch(() => {});
    }
  }
}
