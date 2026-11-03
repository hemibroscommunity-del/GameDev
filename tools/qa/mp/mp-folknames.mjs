/* v2.3.4021: THE TOWNSFOLK GO BY NICKNAMES -- photographed.
 *
 * The owner: "Instead of names like 'gavel Greg' it would be more humorous to
 * just have them go by nicknames. I didn't mean to remake all the NPCs to be
 * like gavel Greg. The way their appearance looks now is fine."
 * (src/data/folkNames.js; the old names stay the keys.)
 *
 *   1. on a phone held upright, in BroTown: beside the auctioneer his plate
 *      reads "Going-Going" (the renderer's own plate, __btNpcSprites), and a
 *      tap on him still opens his building (the key still finds his door);
 *   2. a tap on the tourist, a local with nothing for you, floats "Selfie has
 *      nothing for you right now" -- his nickname, never "Tourist Terry";
 *   3. on a computer (the sideways layout): beside the auctioneer, in his
 *      door's reach, the prompt reads "Talk to Going-Going"; and the Mayor's
 *      dialogue title (the same helper, a name with no nickname) still reads
 *      "Mayor Bro";
 *   4. no page errors.
 * None of the eight opens a dialogue window today (a keeper opens his
 * building, a local answers over his head), so the dialogue's title is
 * checked on the Mayor and held for the eight by server/test/folk-names.
 * Pictures: tools/qa/mp/out/folknames-*.png.  Run after `npm run build`.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(H.REPO, 'tools/qa/mp/out');
const HIDE = '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }';
const shot = (P, name, clip) => P.page.screenshot(Object.assign({ path: join(OUT, `folknames-${name}.png`) }, clip ? { clip } : {})).catch(() => {});

async function enter(P) {
  await H.enterWorld(P);
  return H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
    (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'in the Wheel' }).catch(() => null);
}
const npcAt = (P, id) => P.page.evaluate((who) => {
  const S = window._gameState.current, n = (S.npcs || []).find((q) => q.id === who);
  return n ? { x: n.x, y: n.y } : null;
}, id);
/* where he is on the screen, CSS px, once the camera has settled */
const onScreen = async (P, id) => {
  let prev = null;
  for (let i = 0; i < 40; i++) {
    const cur = await P.page.evaluate((who) => {
      const S = window._gameState.current, c = document.querySelector('canvas'), r = c.getBoundingClientRect();
      const n = (S.npcs || []).find((q) => q.id === who);
      return n && S.camera ? { x: r.left + (n.x - S.camera.x) * (S._worldScaleX || 1), y: r.top + (n.y - S.camera.y) * (S._worldScaleY || 1) } : null;
    }, id);
    if (cur && prev && Math.abs(cur.x - prev.x) < 1.5 && Math.abs(cur.y - prev.y) < 1.5) return cur;
    prev = cur;
    await P.page.waitForTimeout(80);
  }
  return prev;
};
const walkTo = async (P, id) => {
  const n = await npcAt(P, id);
  if (!n) return false;
  await H.hopTo(P, n.x + 70, n.y + 90, { step: 100, gap: 260, tries: 90 });
  await P.page.waitForTimeout(1200);
  return true;
};
const plateOf = (P, id) => P.page.evaluate((who) => {
  const d = (window.__btNpcSprites ? window.__btNpcSprites() : []).find((n) => n.id === who);
  return d && d.plate ? d.plate.name : null;
}, id);
/* a tap on him, as a finger does: the game's own record of it */
const tapOn = async (P, id) => {
  const at = await onScreen(P, id);
  const t0 = Date.now();
  if (at) await P.page.touchscreen.tap(at.x, at.y - 26);
  await P.page.waitForTimeout(700);
  return P.page.evaluate((t) => { const r = window.__btNpcTap; return r && r.ts >= t - 50 ? r : { stale: r || null }; }, t0);
};
const clipAround = (P, at, w, h) => {
  const vp = P.page.viewportSize();
  return { x: Math.max(0, Math.min(vp.width - w, at.x - w / 2)), y: Math.max(0, Math.min(vp.height - h, at.y - h * 0.62)), width: w, height: h };
};

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  const errors = [];

  /* ── 1-2. a phone held upright ── */
  const P = await H.newPlayer(browser, { name: 'Nickphone', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, dpr: 3, touch: true });
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stopP = H.keepAlive(P);
  try {
    const inP = await enter(P);
    rec.ok('phone: in the Wheel (guard)', !!inP, inP);
    if (inP) {
      const id = await H.readState(P, (S) => S.myId);
      await H.devOp(wsPort, 'vitals', id, { god: true, godMinutes: 30 });
      await P.page.addStyleTag({ content: HIDE }).catch(() => {});
      /* a phone plays touch: the computer's E path stays out of it */
      await P.page.evaluate(() => { setInterval(() => { const S = window._gameState && window._gameState.current; if (S) S._isDesktop = false; }, 120); });

      await walkTo(P, 'auctioneer');
      const plate = await H.waitFor(P, () => {
        const d = (window.__btNpcSprites ? window.__btNpcSprites() : []).find((n) => n.id === 'auctioneer');
        return d && d.plate ? d.plate.name : null;
      }, (v) => !!v, { timeout: 8000, label: 'his plate' }).catch(() => null);
      const at = await onScreen(P, 'auctioneer');
      if (at) await shot(P, 'phone-plate', clipAround(P, at, 300, 300));
      await shot(P, 'phone-auctioneer');
      rec.ok(`1. beside the auctioneer his plate reads "${plate}" (Going-Going, never Gavel Greg)`, plate === 'Going-Going', { plate, at });

      const tap = await tapOn(P, 'auctioneer');
      const opened = await H.waitFor(P, () => { const c = document.querySelector('[data-building-panel]'); return c ? c.getAttribute('data-building-panel') : null; },
        (v) => !!v, { timeout: 5000, label: 'his building open' }).catch(() => null);
      await shot(P, 'phone-auction-open');
      rec.ok(`1. ...and a tap on him still opens his building (${opened}): the old name still keys his door`,
        !!tap && tap.npc === 'Gavel Greg' && tap.result === 'opens' && !!opened, { tap, opened });
      await P.page.evaluate(() => { const b = document.querySelector('.bt-inspect-close'); if (b) b.click(); if (window.__btBuildingWindow) window.__btBuildingWindow.open(null); });
      await P.page.waitForTimeout(600);

      await walkTo(P, 'tourist');
      const tPlate = await plateOf(P, 'tourist');
      const tTap = await tapOn(P, 'tourist');
      const said = await H.waitFor(P, (S) => (S.dmgNumbers || []).map((d) => d && d.text).filter((t) => /has nothing for you/.test(t || '')),
        (v) => v.length > 0, { timeout: 4000, label: 'his answer' }).catch(() => []);
      const tAt = await onScreen(P, 'tourist');
      if (tAt) await shot(P, 'phone-tourist', clipAround(P, tAt, 340, 320));
      rec.ok(`2. the tourist's plate reads "${tPlate}" and a tap on him floats "${said[said.length - 1] || '?'}"`,
        tPlate === 'Selfie' && !!tTap && tTap.result === 'nothing' && said.some((t) => t === 'Selfie has nothing for you right now') && !said.some((t) => /Tourist Terry/.test(t)),
        { tPlate, tTap, said });
    }
  } finally {
    stopP();
    await P.ctx.close().catch(() => {});
  }

  /* ── 3. a computer ── */
  const C = await H.newPlayer(browser, { name: 'Nickdesk', wsPort, webPort, world: 'wheel', wide: true, viewport: { width: 1440, height: 900 } });
  C.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stopC = H.keepAlive(C);
  try {
    const inC = await enter(C);
    rec.ok('computer: in the Wheel (guard)', !!inC, inC);
    if (inC) {
      const id = await H.readState(C, (S) => S.myId);
      await H.devOp(wsPort, 'vitals', id, { god: true, godMinutes: 30 });
      await C.page.addStyleTag({ content: HIDE }).catch(() => {});
      await walkTo(C, 'auctioneer');
      /* beside him, in his door's reach: searched round him (mp-mayordoor's way) */
      let prompt = null, spot = null;
      for (const [dx, dy] of [[30, -30], [50, -50], [0, 34], [40, 0], [60, -20], [20, -60], [70, -70], [-30, -30]]) {
        await C.page.evaluate(({ ox, oy }) => {
          const S = window._gameState.current, n = (S.npcs || []).find((q) => q.id === 'auctioneer');
          if (n) { S.player.x = n.x + ox; S.player.y = n.y + oy; }
        }, { ox: dx, oy: dy });
        for (let k = 0; k < 8 && !prompt; k++) {
          await C.page.waitForTimeout(300);
          prompt = await C.page.evaluate(() => {
            const S = window._gameState.current, b = document.querySelector('[data-talk-prompt]');
            return b && S._nearNpc && S._nearNpc.id === 'auctioneer' ? b.innerText.replace(/\s+/g, ' ').trim() : null;
          });
        }
        if (prompt) { spot = [dx, dy]; break; }
      }
      const cAt = await onScreen(C, 'auctioneer');
      await shot(C, 'computer-talk-prompt');
      if (cAt) await shot(C, 'computer-plate', clipAround(C, cAt, 420, 320));
      const cPlate = await plateOf(C, 'auctioneer');
      rec.ok(`3. on a computer, beside the auctioneer (${JSON.stringify(spot)}): the prompt reads "${prompt}", his plate "${cPlate}"`,
        !!prompt && /Talk to Going-Going$/.test(prompt) && cPlate === 'Going-Going', { prompt, spot, cPlate });

      const open = await H.approachNpc(C, 'mayor_bro').catch(() => false);
      const title = await C.page.evaluate(() => { const t = document.querySelector('.bt-npcdlg-name'); return t ? t.textContent.trim() : null;   /* the words, not their CSS capitals */ });
      await shot(C, 'computer-mayor-dialogue');
      rec.ok(`3. ...and the Mayor's dialogue title (the same helper, a name with no nickname) reads "${title}"`, !!open && title === 'Mayor Bro', { open, title });
      await H.closeNpcDialogue(C).catch(() => {});
    }
  } finally {
    stopC();
    await C.ctx.close().catch(() => {});
  }
  rec.ok('4. no page errors', errors.length === 0, errors.slice(0, 6));
}
