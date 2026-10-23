/* ═══ v2.3.3577: THE MONSTERS THE WHIRLWIND WILL CATCH, IN ITS AMBER ═══
 *
 * The owner: "The indicator that the enemies are within the whirlwind active
 * radius needs to be more obvious.  Maybe change the whole color of the enemy
 * to be in a certain tint of color and make it flash a bit."
 *
 * One phone in the world, out among the Verdant Wilds' slimes
 * (QA_WT_LAND=ember: the Flame Fields' fire goblins, the red ones a tint
 * could never turn amber):
 *   1. (guard) monsters drawn round you, some inside the whirlwind's 240 px,
 *      and the one-colour batcher in and built (rendering/fillBatch.js);
 *   2. through a wind-up (held on this phone for 8 s, the ring and the catch
 *      worked out as the game does every frame -- this box draws a few frames
 *      a second, and the real one lasts 1 s) every monster the catch names is
 *      drawn over by its own picture in the whirlwind's amber, at 0.9, on
 *      the body's very frame (game/whirlCatch.js);
 *   3. it FLASHES: each caught monster's amber is darker and lighter from
 *      frame to frame;
 *   4. a monster outside the ring wears none;
 *   5. the monster's own body keeps its own colours under it (no tint);
 *   6. ON SCREEN, rendered: each kind caught reads amber in the flash's
 *      trough AND at its peak (the share of its body's pixels whose hue is
 *      amber), keeps its light and shade, and the peak is brighter;
 *   7. the wind-up over, no monster wears it;
 *   8. no page errors.
 * Pictures: tools/qa/mp/out/whirltint-windup[-land].png, and
 * whirltint-close[-land].png (a caught monster drawn without it, in the
 * flash's trough and at its peak).
 *
 *   node tools/qa/mp/run.mjs whirltint
 */
import * as H from './harness.mjs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  const { WHEEL_DOORS } = await import(H.REPO + '/server/src/wheelspawns.js');
  const G = WHEEL_DOORS.verdant;
  const P = await H.newPlayer(browser, { name: 'Spinner', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel' });
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e && e.message || e).slice(0, 200)));
  let stopAlive = false;
  (async () => { while (!stopAlive) { await P.page.keyboard.press('Control').catch(() => {}); for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {}); } })();
  try {
    await H.enterWorld(P);
    for (let i = 0; i < 160; i++) {
      if ((await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone))) === 'wheel') break;
      await P.page.waitForTimeout(500);
    }
    const id = await H.readState(P, (S) => S.myId);
    /* past the Mayor's gate (a new character is held in the safe commons until
       his first quest), as mp-googrotto goes */
    await H.devOp(wsPort, 'quests', id);
    await H.devOp(wsPort, 'vitals', id, { god: true, godMinutes: 30 });
    /* out among the Verdant Wilds' first slimes, east of the Goo Grotto
       (QA_WT_LAND=ember|frost|...: that land's first stretch instead) */
    const land = process.env.QA_WT_LAND;
    if (land) {
      const geo = await H.wheelGeom();
      const at = geo.along(land, 1, 0);
      await H.hopTo(P, at.x, at.y, { step: 120, gap: 240 });
    } else {
      await H.hopTo(P, G.at[0] + 700, G.at[1] + 300, { step: 120, gap: 240 });
    }
    await P.page.waitForTimeout(3000);
    /* stand among the nearest few */
    const near = await H.readState(P, (S) => {
      const ms = (S.monsters || []).filter((m) => m && m.alive !== false && !(m.curHp <= 0));
      ms.sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y));
      return ms.slice(0, 3).map((m) => ({ id: m.id, x: m.x, y: m.y }));
    });
    /* inside the ring but clear of you, so the picture shows it */
    if (near.length) await H.hopTo(P, near[0].x - 150, near[0].y + 60, { step: 120, gap: 240 });
    await P.page.waitForTimeout(1500);

    /* ── the wind-up, held 8 s on this phone; its picture taken in the
       middle of it (this box takes a while over a screenshot) ── */
    const fill = await P.page.evaluate(() => (window.__btFill ? window.__btFill() : null));
    const seenP = P.page.evaluate(() => new Promise((resolve) => {
      const S = window._gameState.current;
      const R = window._pixiRenderer;
      /* the game's own clock for the ring (abilities.js: Date.now()) */
      const now0 = Date.now();
      S._whirlWindup = { t0: now0, until: now0 + 8000, r: 240, max: 16 };
      const frames = [];
      const tick = () => {
        const t = Date.now();
        const c = window.__btWhirlCatch && window.__btWhirlCatch();
        const tints = R && R.monsterTintProbe ? R.monsterTintProbe() : [];
        frames.push({ t: Math.round(t - now0), caught: c ? c.ids.map(String) : null, inside: c ? c.inside : 0, tints });
        if (t < now0 + 8000) requestAnimationFrame(tick);
        else {
          S._whirlWindup = null;
          /* three frames after the ring is gone (the amber is set a
             frame after the catch is worked out) */
          requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => {
            resolve({ frames, after: R && R.monsterTintProbe ? R.monsterTintProbe() : [] });
          })));
        }
      };
      requestAnimationFrame(tick);
    }));
    await P.page.waitForTimeout(900);
    await P.page.screenshot({ path: join(OUT, `whirltint-windup${land ? '-' + land : ''}.png`) }).catch(() => {});
    /* 6: each kind caught, rendered on its own as it is drawn now: without
       the amber, in the flash's trough and at its peak (the renderer's own
       extract, the same batchers as the screen) */
    const looks = await P.page.evaluate(() => {
      const R = window._pixiRenderer;
      return R && R.whirlGlowLooks ? R.whirlGlowLooks() : null;
    });
    if (looks && looks.close) {
      const b64 = looks.close.replace(/^data:image\/png;base64,/, '');
      const { writeFileSync } = await import('node:fs');
      writeFileSync(join(OUT, `whirltint-close${land ? '-' + land : ''}.png`), Buffer.from(b64, 'base64'));
    }
    const seen = await seenP;
    await P.page.evaluate(() => { window._gameState.current._whirlWindup = null; });

    const F = seen.frames.filter((f) => f.caught);
    const caughtIds = new Set(F.flatMap((f) => f.caught));
    rec.ok(`1. (guard) a wind-up held on screen, monsters drawn round you and some inside the ring, the one-colour batcher in and built (${F.length} frames, ${caughtIds.size} caught)`,
      F.length >= 4 && caughtIds.size >= 1 && !!(fill && fill.on && fill.built), { frames: seen.frames.length, caught: [...caughtIds], fill });
    /* 2-5: frame by frame.  A frame's amber was set from the catch worked
       out the frame before (entityRenderer draws before effectsRenderer
       decides), so each frame is read against the previous frame's catch. */
    const ambery = (c) => ((c >> 16) & 255) === 255 && ((c >> 8) & 255) >= 150 && ((c >> 8) & 255) <= 206 && (c & 255) >= 56 && (c & 255) <= 96;
    let painted = 0, bare = 0, wrong = [], ownTint = 0, tinted = [];
    const byMon = Object.create(null);
    const outside = [];
    for (let i = 1; i < F.length; i++) {
      const f = F[i], caughtThen = F[i - 1].caught;
      for (const p of f.tints) {
        const g = p.glow;
        if (caughtThen.includes(p.id) && f.caught.includes(p.id)) {
          if (g && g.on) {
            painted++;
            const hit = p.tint === 0xff8080;
            const aOk = hit ? (g.a > 0.2 && g.a < 0.4) : (g.a > 0.85 && g.a <= 0.91);
            if (!ambery(g.tint) || !g.same || !g.fill || !aOk) wrong.push({ id: p.id, t: f.t, g: { ...g, tint: g.tint.toString(16) } });
            (byMon[p.id] = byMon[p.id] || []).push((g.tint >> 8) & 255);
          } else bare++;
          if (p.base != null && p.tint !== 0xff8080) { if (p.tint === p.base) ownTint++; else tinted.push({ id: p.id, t: f.t, tint: p.tint.toString(16) }); }
        } else if (!caughtThen.includes(p.id) && !f.caught.includes(p.id) && g && g.on) outside.push({ id: p.id, t: f.t });
      }
    }
    rec.ok(`2. through the wind-up every caught monster is drawn over by its own picture in the amber, at 0.9 (${painted} of ${painted + bare} looks; ${wrong.length} not the amber on the body's frame)`,
      painted > 0 && bare === 0 && wrong.length === 0, { painted, bare, wrong: wrong.slice(0, 6) });
    const flashes = Object.entries(byMon).filter(([, gs]) => gs.length >= 6).map(([k, gs]) => [k, Math.min(...gs), Math.max(...gs)]);
    rec.ok(`3. ...and it flashes, darker and lighter amber: each monster caught 6 frames or more (its green channel ${flashes.map(([k, lo, hi]) => k + ' ' + lo + '-' + hi).join(', ')})`,
      flashes.length > 0 && flashes.every(([, lo, hi]) => hi - lo >= 20), flashes);
    rec.ok(`4. a monster outside the ring wears none (${outside.length} frames otherwise)`, outside.length === 0, outside.slice(0, 6));
    rec.ok(`5. the monster's own body keeps its own colours under it (${ownTint} looks; ${tinted.length} tinted)`, ownTint > 0 && tinted.length === 0, tinted.slice(0, 6));
    const kinds = (looks && looks.kinds) || [];
    const pc = (x) => Math.round(x * 100) + '%';
    rec.ok(`6. drawn, each kind caught reads amber at the flash's darkest and lightest, its light and shade kept (${kinds.map((k) => `${k.kind}: ${pc(k.amberOwn)} amber as itself, ${pc(k.amberTrough)} / ${pc(k.amberPeak)} caught; ${pc(k.cover)} of its body changed; ${pc(k.shadeKept)} of its shading kept; the peak ${k.flash.toFixed(2)} brighter`).join('; ')})`,
      kinds.length > 0 && kinds.every((k) => k.cover >= 0.9 && k.amberTrough >= 0.85 && k.amberPeak >= 0.85 && k.shadeKept >= 0.4 && k.flash >= 0.06), looks && (looks.err || kinds));
    const after = seen.after.filter((p) => p.glow && p.glow.on);
    rec.ok(`7. the wind-up over, no monster wears it (${after.length} do)`, after.length === 0, after.slice(0, 6));
    rec.ok('8. no page errors', errs.length === 0, errs.slice(0, 5));
  } finally {
    stopAlive = true;
  }
}
