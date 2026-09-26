/* v2.3.2928: HAIR ON EVERY FRAME OF THE EAST JOG.
 *
 * Owner: "East jog hair disappears on some."  Not yet reproduced -- this is
 * the rig for it.
 *
 * One player jogging east in place (real keys; the player pinned at the start
 * of each frame), every hair in public/sprites/traits/hair switched on in
 * turn (__btSetHair), under each VARIANT: bare, holding the greatsword, the
 * full copper set (held on every frame -- the worker resets a client-side
 * equip -- which puts the painted fullset figure on the east jog), a beanie.
 * Every rendered frame is logged by jog frame index: is the hair drawn (a
 * texture, alpha), and which visible layers ABOVE it overlap its box.  Checks
 * the hair is drawn on every frame; saves pictures
 * (tools/qa/mp/out/jogeasthair/) for eyes.
 *
 * Narrow a run: VARIANTS=bare,copper HAIRS=afro,long node tools/qa/mp/run.mjs jogeasthair
 * Measured 2026-09-26: all 8 hairs x 4 variants drawn on every frame, nothing
 * over them but the name tag, the hat and (held) the sword.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';

const OUT = `${H.REPO}/tools/qa/mp/out/jogeasthair`;

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  const hair = process.env.HAIR || 'afro';
  const P = await H.newPlayer(browser, { name: 'Hair', wsPort, webPort, viewport: { width: 390, height: 844 }, dpr: 3,
    init: `try { localStorage.setItem('bt-hair', ${JSON.stringify(hair)}); } catch (e) {}` });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);
  await P.page.evaluate(() => {
    const S = window._gameState.current, pin = { x: S.player.x, y: S.player.y };
    window.__jhLog = [];
    const _raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => _raf((ts) => {
      try { const Q = window._gameState.current; Q.player.x = pin.x; Q.player.y = pin.y; } catch (e) { /* frame first */ }
      /* the worker is authoritative for equipment and resets a client-side
         equip within a second -- hold the variant's armour on every frame */
      try {
        const g = window.__jhGear, R = window._gameState.current.rpg;
        if (g && R) {
          const want = g.chest !== 'none';
          if (want && !(R.armor && R.armor.mat === 'copper')) { R.armor = { name: 'Copper Torso', mat: 'copper', type: 'armor', slot: 'chest' }; R.legsArmor = { name: 'Copper Greaves', mat: 'copper', type: 'armor', slot: 'legs' }; }
          if (!want && (R.armor || R.legsArmor)) { R.armor = null; R.legsArmor = null; }
          if (window.__btGetGear('chest') !== (want ? g.chest : 'none') || window.__btGetGear('legs') !== (want ? g.legs : 'none')) window.__btSyncArmorLayers(R);
        }
      } catch (e) { /* gear hook only */ }
      cb(ts);
      try {
        const d = window._pixiRenderer && window._pixiRenderer.playerDisplayRaw();
        const h = d && d._hairSprite;
        if (d && window.__jhOn) {
          const par = h && h.parent;
          window.__jhLog.push({
            f: d._animFrame, pose: d._animPose, dir: d._lastFacingKey, fs: !!d._fullsetOn, chest: window.__btGetGear && window.__btGetGear('chest'),
            vis: !!(h && h.visible), tex: !!(h && h.texture && h.texture.width > 1 && !h.texture.destroyed),
            a: h ? +h.alpha.toFixed(2) : null, masked: !!(h && h.mask),
            wa: h ? +(h.groupAlpha != null ? h.groupAlpha : h.alpha).toFixed(2) : null, rv: !!(h && h.renderable !== false), pv: !!(h && h.parent && h.parent.visible),
            idx: par ? par.getChildIndex(h) : -1,
            x: h ? +h.x.toFixed(1) : null, y: h ? +h.y.toFixed(1) : null,
            sx: h ? +h.scale.x.toFixed(3) : null, sy: h ? +h.scale.y.toFixed(3) : null,
            over: (() => {   /* visible layers drawn ABOVE the hair whose box overlaps it */
              if (!h || !par || !h.visible) return [];
              const names = new Map();
              for (const k of Object.keys(d)) { const v = d[k]; if (k[0] === '_' && v && typeof v === 'object' && v.parent === par) names.set(v, k); }
              let hb; try { hb = h.getBounds(); } catch (e) { return ['?']; }
              const out = [];
              for (let i = par.getChildIndex(h) + 1; i < par.children.length; i++) {
                const c = par.children[i];
                if (!c.visible || c.renderable === false || c.alpha < 0.05) continue;
                let cb; try { cb = c.getBounds(); } catch (e) { continue; }
                if (cb.width <= 0 || cb.height <= 0) continue;
                const ix = Math.min(hb.x + hb.width, cb.x + cb.width) - Math.max(hb.x, cb.x);
                const iy = Math.min(hb.y + hb.height, cb.y + cb.height) - Math.max(hb.y, cb.y);
                if (ix > 0 && iy > 0) out.push((names.get(c) || c.label || ('#' + i)) + ':' + Math.round(100 * ix * iy / Math.max(1, hb.width * hb.height)));
              }
              return out;
            })(),
          });
        }
      } catch (e) { window.__jhErr = String(e && e.message || e); }
    });
  });
  await P.page.click('canvas', { position: { x: 5, y: 5 } }).catch(() => {});
  await P.page.keyboard.down('d');
  await P.page.waitForTimeout(600);
  const box = await P.page.evaluate(() => {
    const S = window._gameState.current, c = document.querySelector('canvas').getBoundingClientRect();
    const x = c.left + (S.player.x - S.camera.x) * (S._worldScaleX || 1), y = c.top + (S.player.y - 30 - S.camera.y) * (S._worldScaleY || 1);
    return { x: Math.max(0, Math.round(x - 45)), y: Math.max(0, Math.round(y - 60)), width: 90, height: 70 };
  });
  const fs = await import('node:fs');
  const hairs = fs.readdirSync(`${H.REPO}/public/sprites/traits/hair`).filter((d) => fs.existsSync(`${H.REPO}/public/sprites/traits/hair/${d}/meta.json`));
  const allBad = {};
  const VARIANTS = (process.env.VARIANTS || 'bare,greatsword,copper,hat').split(',');
  const HAIRS = process.env.HAIRS ? process.env.HAIRS.split(',') : hairs;
  for (const variant of VARIANTS) {
  await P.page.evaluate((v) => {
    const S = window._gameState.current;
    window.__jhGear = v === 'copper' ? { chest: 'copperplate', legs: 'coppergreaves' } : { chest: 'none', legs: 'none' };
    try { window.__btSetHeadwear(v === 'hat' ? 'beanie' : 'none'); } catch (e) {}
    window.__jhWeapon = v === 'greatsword';
    if (!window.__jhWeapon) { S.rpg.weapon = null; }
  }, variant);
  for (const id of HAIRS) {
    await P.page.evaluate(() => { if (window.__jhWeapon) { const S = window._gameState.current; S.rpg.activeSlot = 'melee'; S.rpg.weapon = { name: 'Copper Great Sword', type: 'greatsword', gearBase: 'copper' }; } });
    await P.page.evaluate((h) => { window.__btSetHair(h); }, id);
    await P.page.waitForTimeout(1200);
    await P.page.evaluate(() => { window.__jhLog = []; window.__jhOn = true; });
    for (let t = 0; t < 6; t++) {
      const f = await P.page.evaluate(() => { const d = window._pixiRenderer.playerDisplayRaw(); return d ? d._animFrame : null; });
      const buf = await P.page.screenshot({ clip: box }).catch(() => null);
      if (buf) fs.writeFileSync(`${OUT}/${variant}-${id}-${t}-f${String(f).padStart(2, '0')}.png`, buf);
    }
    await P.page.waitForTimeout(1500);
    const log = await P.page.evaluate(() => { window.__jhOn = false; return window.__jhLog; });
    const jog = log.filter((r) => r.pose === 'jog' && r.dir === 'east');
    const byF = new Map();
    for (const r of jog) { if (!byF.has(r.f)) byF.set(r.f, []); byF.get(r.f).push(r); }
    const frames = [...byF.keys()].sort((a, b) => a - b);
    const bad = [];
    for (const f of frames) {
      const rs = byF.get(f), off = rs.filter((r) => !(r.vis && r.tex && r.wa > 0.5));
      if (off.length) bad.push({ f, of: rs.length, off: off.length, sample: off[0] });
    }
    console.log('      fullset on', jog.filter((r) => r.fs).length, 'of', jog.length, 'chest', jog.length ? jog[jog.length - 1].chest : '-');
    const overBy = {};
    for (const f of frames) for (const r of byF.get(f)) for (const o of (r.over || [])) { const n = o.split(':')[0]; (overBy[n] = overBy[n] || new Set()).add(f); }
    console.log(`    ${variant}/${id}: frames ${frames.length}, hair off on ${bad.length ? bad.map((b) => b.f + '(' + b.off + '/' + b.of + ')').join(' ') : 'none'}; over it: ${Object.entries(overBy).map(([n, fs2]) => n + ' [' + [...fs2].sort((x, y) => x - y).join(',') + ']').join('  ') || 'nothing'}`);
    if (bad.length) { allBad[variant + '/' + id] = bad; console.log('      sample', JSON.stringify(bad[0].sample)); }
    rec.ok(`${variant}/${id}: the east jog was running (guard)`, frames.length >= 10, { frames: frames.length });
  }
  }
  await P.page.keyboard.up('d');
  rec.ok('every hair is drawn on every frame of the east jog', Object.keys(allBad).length === 0, { allBad });
  const thrown = P.logs.filter((l) => /pageerror|threw/.test(l));
  rec.ok('nothing threw', thrown.length === 0, { thrown: thrown.slice(0, 3) });
  await P.ctx.close().catch(() => {});
}
