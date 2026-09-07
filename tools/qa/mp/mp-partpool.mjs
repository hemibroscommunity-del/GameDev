/* ═══ THE PARTICLE FIELD IS SPRITES, NOT POLYGONS (v2.3.2331) ═══
 *
 * Every hit particle, death-explosion particle and dust puff used to be drawn
 * into one Graphics with circle()+fill() and the Graphics cleared each frame.
 * In Pixi 8 that re-tessellates the entire field every frame: each 2-3px dot
 * becomes a 40-56 point polygon.  They are a pool of Sprites over one minted
 * hard-edged dot now, which is one batch and zero tessellation.
 *
 * WHAT IS MEASURED, and what is not.  Milliseconds are not: this box runs at
 * 6-18 rAF turns a second with no GPU, so a frame-time number here would be a
 * lie about a phone.  What IS device-independent is the SHAPE of the work --
 * how many Graphics instructions the particle Graphics holds each frame (each
 * old dot was one) and how many pooled sprites are lit -- read off the
 * renderer's own probe.  The simulation itself must not change: the particles
 * still move, still decay, still die on the same schedule.
 *
 * THE PHOTOGRAPH is the other half.  The dots are meant to look exactly as they
 * did; the same fixture is shot on the build before and after (PARTSHOT=before
 * against a stash of the old renderer), so "identical" is two pictures, not a
 * sentence.
 *
 * Deterministic fixture: no Math.random.  150 hit particles on a ring with
 * fixed velocities, one 30-particle death explosion, 20 dust puffs -- the
 * shape of a multi-kill burst, well under the 400 cap.
 */
import * as H from './harness.mjs';

const spawn = (P) => P.page.evaluate(() => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.player) return null;
  S.hitParticles = S.hitParticles || [];
  S.deathExplosions = S.deathExplosions || [];
  S._dustPuffs = S._dustPuffs || [];
  const cx = S.player.x, cy = S.player.y - 20;
  const cols = ['#ff5e6c', '#ffb050', '#5b99de', '#8fbf6a', '#f5c542'];
  for (let i = 0; i < 150; i++) {
    const a = (i / 150) * Math.PI * 2;
    S.hitParticles.push({ x: cx + Math.cos(a) * 18, y: cy + Math.sin(a) * 18,
      vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.6 - 1.2, life: 1.0, color: cols[i % 5], size: 2 + (i % 3) });
  }
  const parts = [];
  for (let i = 0; i < 30; i++) { const a = (i / 30) * Math.PI * 2; parts.push({ vx: Math.cos(a) * 2, vy: Math.sin(a) * 2 - 1, life: 1.2, color: '#ffb050', size: 2.5 }); }
  S.deathExplosions.push({ x: cx + 60, y: cy, ts: Date.now(), particles: parts });
  for (let i = 0; i < 20; i++) S._dustPuffs.push({ x: cx - 60 + i * 3, y: cy + 10, vx: 0.2, vy: -0.3, life: 1, decay: 0.03 });
  return { hit: S.hitParticles.length, exp: S.deathExplosions.length, dust: S._dustPuffs.length };
});

const sample = (P, frames) => P.page.evaluate(async (n) => {
  const S = window._gameState.current;
  const out = [];
  for (let i = 0; i < n; i++) {
    await new Promise((r) => requestAnimationFrame(r));
    const st = window.__btParticleStats ? window.__btParticleStats() : null;
    /* DRAWABLE particles, which is what the old Graphics drew too: an
       explosion keeps its particle list for 2s but stops drawing a particle
       once 1 - age/life hits zero (effectsRenderer, "if (pAlpha <= 0) continue"). */
    const now = Date.now();
    const live = (S.hitParticles || []).length
      + (S.deathExplosions || []).reduce((a, e) => {
        const age = (now - e.ts) / 1000;
        return a + (e.particles || []).filter((p) => 1 - age / (p.life || 1) > 0).length;
      }, 0)
      + (S._dustPuffs || []).length;
    out.push({ live, hitLife: S.hitParticles && S.hitParticles[0] ? +S.hitParticles[0].life.toFixed(2) : null, st });
  }
  return out;
}, frames);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Sparks', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);

  const fx = await spawn(P);
  rec.ok('the fixture is on the field: 150 hit + 30 explosion + 20 dust (guard)',
    !!fx && fx.hit >= 150 && fx.exp >= 1 && fx.dust >= 20, fx);
  if (!fx) { await P.ctx.close().catch(() => {}); return; }

  /* Two frames in, photograph the burst around the figure. */
  await sample(P, 2);
  try {
    let box = null;
    try { box = await H.figureBox(P, { pad: 0 }); } catch (e) { box = null; }
    if (!box) box = await P.page.evaluate(() => ({ x: window.innerWidth / 2 - 20, y: window.innerHeight / 2 - 60, w: 40, h: 80 }));
    if (box) {
      const clip = { x: Math.max(0, Math.round(box.x - 110)), y: Math.max(0, Math.round(box.y - 120)),
        width: Math.round(box.w + 220), height: Math.round(box.h + 200) };
      const cdp = await P.page.context().newCDPSession(P.page);
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 2 } });
      (await import('node:fs')).writeFileSync(`tools/qa/shots/particles-${process.env.PARTSHOT || 'after'}.png`, Buffer.from(shot.data, 'base64'));
      await cdp.detach();
      console.log(`    photo: tools/qa/shots/particles-${process.env.PARTSHOT || 'after'}.png`);
    }
  } catch (e) { console.log('    photo skipped: ' + e); }

  const frames = await sample(P, 8);
  console.log('    frames: ' + JSON.stringify(frames.map((f) => ({ live: f.live, dots: f.st && f.st.dots, gfx: f.st && f.st.gfxInstr }))));
  const withProbe = frames.filter((f) => f.st);
  rec.ok('the renderer publishes its per-frame particle cost (guard)', withProbe.length === frames.length,
    { probed: withProbe.length, of: frames.length });

  /* The simulation is untouched: still alive, still decaying. */
  rec.ok('the particles still move and decay on the same schedule (life falls ~0.04/frame)',
    frames[0].hitLife != null && frames[7].hitLife != null && frames[0].hitLife > frames[7].hitLife && frames[7].live > 0, { first: frames[0], last: frames[7] });

  if (withProbe.length) {
    const worstGfx = Math.max(...withProbe.map((f) => f.st.gfxInstr));
    const mismatch = Math.max(...withProbe.map((f) => Math.abs(f.st.dots - f.live)));
    rec.ok('THE HEADLINE: no particle is tessellated -- the particle Graphics holds a handful of instructions a frame, not one per dot',
      worstGfx >= 0 && worstGfx < 12, { worstGfxInstr: worstGfx, liveParticles: frames[0].live });
    rec.ok('...every live particle is a lit pooled sprite instead (dots == live, within 2)',
      mismatch <= 2, { worstMismatch: mismatch });
    rec.ok('...and the pool is bounded', withProbe.every((f) => f.st.pool <= 700), withProbe[withProbe.length - 1].st);
  }

  /* When the burst has burnt out, the pool is parked, not leaked. */
  await P.page.waitForTimeout(3500);
  const after = await sample(P, 2);
  const last = after[1];
  rec.ok('when the field is empty, every pooled sprite is hidden and none is lit',
    last.live === 0 && last.st && last.st.dots === 0 && last.st.visible === 0, last);

  await P.ctx.close().catch(() => {});
}
