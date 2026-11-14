/* ═══ v2.3.5461: THE TOWNSFOLK AT THEIR OWN TRADES -- on a phone (card TF PR 2) ═══
 *
 * The owner, 2026-11-14: "make sure all NPCs do things that match their
 * characters. Like chef blaze should cook, not hammer like an anvil"
 * (docs/specs/townsfolk-work.md).  In the world's BroTown, from where a tap
 * reaches him (Chef Blaze, a keeper, works on beside you) or from 260 px (a
 * quest giver stops and faces you within 200: he is watched from past it, as
 * mp-folkwalk watches the blacksmith), without a word (a window of yours up
 * stops anyone near):
 *   1. Chef Blaze cooks with his pan, Woodworker Bro chops with his axe, Farmer
 *      Bro kneels, hoes and waters -- each drawn in the player's skill figure
 *      from the `skills` set's colour numbers (the renderer's probe:
 *      __btNpcSprites `pose` and `skill.look`), his tee over it, the farmer's
 *      hoe and can (`skill.prop`); a picture of each (out/folkwork-*.png);
 *   2. the same with the phone sideways;
 *   3. on a computer (`wide: true`): what it shows -- drawn live where its
 *      look palette is on (this box's Chromium), the photographs standing
 *      where it is not (Windows, a Mac);
 *   4. `?folkwork=0`: Chef Blaze never cooks, and the set is not loaded;
 *   5. no page errors.
 * Run after `npm run build`: node tools/qa/mp/run.mjs folkwork
 * (BT_FOLKWORK_ONLY=upright|sideways|computer|off runs one part.)
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ONLY = process.env.BT_FOLKWORK_ONLY || '';
const PARTS = [
  { key: 'upright', viewport: { width: 390, height: 844 }, touch: true },
  { key: 'sideways', viewport: { width: 844, height: 390 }, touch: true },
  { key: 'computer', viewport: { width: 1280, height: 800 }, touch: false, wide: true },
];
/* who, the trades he works, and where he is watched from (an offset from him) */
const WORKERS = [
  { name: 'Chef Blaze', poses: ['cook'], from: [30, 180] },
  { name: 'Woodworker Bro', poses: ['chop'], from: [0, 260] },
  { name: 'Farmer Bro', poses: ['farmkneel', 'farmhoe', 'farmwater'], from: [0, 260] },
];
const TOOL = { farmhoe: true, farmwater: true };
const HIDE = '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }';

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });

  const play = async (part, query) => {
    const P = await H.newPlayer(browser, { name: 'Workbro', wsPort, webPort, world: 'wheel', viewport: part.viewport, touch: part.touch, wide: !!part.wide, query: query || '' });
    const errors = [];
    P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
    const alive = H.keepAlive(P);
    const drawnOf = (name) => P.page.evaluate((nm) => (window.__btNpcSprites ? window.__btNpcSprites() : []).find((n) => n.name === nm) || null, name);
    const npcAt = (name) => P.page.evaluate((nm) => { const S = window._gameState.current; const q = (S.npcs || []).find((m) => m.name === nm); return q ? { x: q.x, y: q.y } : null; }, name);
    const goNear = async (name, dx, dy) => {
      for (let k = 0; k < 2; k++) {
        const n = await npcAt(name);
        if (!n) return false;
        await H.hopTo(P, n.x + dx, n.y + dy, { step: 100, gap: 260, tries: 90 });
      }
      await P.page.waitForTimeout(800);
      return true;
    };
    const waitPose = async (name, pose, ms) => {
      const end = Date.now() + ms;
      while (Date.now() < end) {
        const d = await drawnOf(name);
        if (d && d.pose === pose) return d;
        await P.page.waitForTimeout(250);
      }
      return drawnOf(name);
    };
    /* a picture of him, cropped round his feet (CSS px off the camera) */
    const shot = async (name, file) => {
      const box = await P.page.evaluate((nm) => {
        const S = window._gameState.current, c = document.querySelector('canvas.brotown-canvas') || document.querySelector('canvas'), r = c.getBoundingClientRect();
        const n = (S.npcs || []).find((q) => q.name === nm);
        if (!n || !S.camera) return null;
        const kx = S._worldScaleX || 1, ky = S._worldScaleY || 1;
        const x = r.left + (n.x - S.camera.x) * kx, y = r.top + (n.y - S.camera.y) * ky;
        const w = 150 * kx, h = 170 * ky;
        return { x: Math.max(0, x - w / 2), y: Math.max(0, y - h + 30 * ky), width: w, height: h };
      }, name);
      await P.page.screenshot({ path: join(OUT, file), ...(box ? { clip: box } : {}) }).catch(() => {});
    };
    /* into the world, as mp-folkwalk goes: BroTown, never the retired map */
    await H.enterWorld(P);
    const inWheel = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the world' }).catch(() => null);
    if (inWheel) {
      const id = await H.readState(P, (S) => S.myId);
      await H.devOp(wsPort, 'vitals', id, { god: true, godMinutes: 30 }).catch(() => null);
      await P.page.addStyleTag({ content: HIDE }).catch(() => {});
      await P.page.waitForTimeout(2500);
    }
    return { P, errors, alive, drawnOf, goNear, waitPose, shot, inWheel: !!inWheel };
  };

  for (const part of PARTS) {
    if (ONLY && ONLY !== part.key) continue;
    const T = await play(part);
    try {
      rec.ok(`${part.key}: in the world (guard)`, T.inWheel);
      if (!T.inWheel) continue;
      const ready = await T.P.page.waitForFunction(() => window.__btFolkWalk && window.__btFolkWalk() && window.__btFolkWalk().on, null, { timeout: 60000 }).then(() => true, () => false);
      const fs = await T.P.page.evaluate(() => (window.__btFolkSkill ? window.__btFolkSkill() : null));
      const live = ready && !!fs && fs.on;
      if (part.key === 'computer' && !live) {
        /* a computer with no look palette: the photographs, standing (lookPaletteChoice.js) */
        await T.goNear('Chef Blaze', 30, 180);
        const d = await T.drawnOf('Chef Blaze');
        rec.ok(`3. computer: no look palette here, so the townsfolk are their photographs, standing (Chef Blaze drawn live: ${d && d.live})`, !!d && !d.live, { fs, d });
      } else {
        rec.ok(`${part.key}: the townsfolk drawn live, the trades' figures in (sheets ${fs && fs.sheets.filter((s) => s[1]).length} of ${fs && fs.sheets.length})`,
          live && fs.sheets.every((s) => s[1]), fs);
        for (const W of WORKERS) {
          if (process.env.BT_FOLKWORK_WHO && process.env.BT_FOLKWORK_WHO !== W.name) continue;
          await T.goNear(W.name, W.from[0], W.from[1]);
          for (const pose of W.poses) {
            let d = await T.waitPose(W.name, pose, 60000);
            /* the picture while his trade's figure is on the screen: taken, then
               the probe read (a round is seconds on this box, and his day has
               standing stops a step from his work: a picture can catch one) */
            for (let q = 0; q < 6; q++) {
              await T.shot(W.name, `folkwork-${part.key}-${pose}.png`);
              const after = await T.drawnOf(W.name);
              if (after && after.skill && after.skill.shown === 'skill' && after.pose === pose) { d = after; break; }
              d = await T.waitPose(W.name, pose, 30000);
            }
            const sk = d && d.skill;
            const ok = !!d && d.pose === pose && d.live && !!sk && sk.shown === 'skill' && sk.pose === pose && sk.look === true && sk.shirt === true
              && (!TOOL[pose] || sk.prop === true) && sk.misses === 0;
            rec.ok(`${part.key}: ${W.name} ${pose === 'cook' ? 'cooks with his pan' : pose === 'chop' ? 'chops with his axe' : pose === 'farmkneel' ? 'kneels in the soil' : pose === 'farmhoe' ? 'hoes' : 'waters'}: the skill figure from the colour numbers, his tee on${TOOL[pose] ? ', the tool in his hands' : ''} (${d && d.pose}, ${sk ? `frame ${sk.frame}, ${sk.height} px tall, ${sk.misses} frames stood` : 'no figure'})`, ok, d);
          }
        }
      }
      rec.ok(`${part.key}: no page errors`, T.errors.length === 0, T.errors.slice(0, 5));
    } finally {
      T.alive();
      await T.P.ctx.close().catch(() => {});
    }
  }

  if (!ONLY || ONLY === 'off') {
    const T = await play(PARTS[0], 'folkwork=0');
    try {
      rec.ok('off: in the world (guard)', T.inWheel);
      await T.P.page.waitForFunction(() => window.__btFolkWalk && window.__btFolkWalk() && window.__btFolkWalk().on, null, { timeout: 60000 }).catch(() => {});
      await T.goNear('Chef Blaze', 30, 180);
      let cooked = false;
      const end = Date.now() + 30000;
      while (Date.now() < end && !cooked) {
        const d = await T.drawnOf('Chef Blaze');
        if (d && (d.pose === 'cook' || (d.skill && d.skill.shown === 'skill'))) cooked = true;
        await T.P.page.waitForTimeout(400);
      }
      const fs = await T.P.page.evaluate(() => (window.__btFolkSkill ? window.__btFolkSkill() : null));
      rec.ok(`4. ?folkwork=0: Chef Blaze never cooks (30 s by his stop), and none of the trades' figures is loaded (${fs && fs.sheets.filter((s) => s[1]).length} sheets)`,
        !cooked && !!fs && fs.off && fs.sheets.every((s) => !s[1]), fs);
      rec.ok('off: no page errors', T.errors.length === 0, T.errors.slice(0, 5));
    } finally {
      T.alive();
      await T.P.ctx.close().catch(() => {});
    }
  }
}
