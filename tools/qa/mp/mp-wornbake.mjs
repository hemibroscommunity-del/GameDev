/* ═══ v2.3.3704: THE ARMOUR YOU WEAR IS THE LAST TO GO ═══
 *
 * The owner: "Northwest jog has trouble loading reloading textures after
 * recovering from black screen".  The body under your armour is baked into a
 * cache of 900 frames for every frame you can be drawn in, and in spare time
 * for the sets one equip away (each piece in your bag put on over what you
 * wear).  A player owning pieces of two metals now asks for more than 900, so
 * the spare bakes went on into play letting go of the least recently DRAWN
 * frame -- the worn set's in a facing not faced lately -- and jogging that way
 * drew the plain body under the plate, frame by frame, while each was baked
 * again (docs/specs/worn-bake-first.md, src/rendering/maskedEvict.js).
 * No black screen is needed: the owner saw it after one because a rebuild and
 * then a first jog north-west in a while is where it shows.
 *
 * A phone in the world in copper armour and checked trousers, the kit's other
 * pieces in the bag:
 *   1. every frame of the worn set baked behind the loading screen (guard);
 *   2. the spare sets baked as far as they go: the cache stops growing, the
 *      bake worker idle;
 *   3. THE WORN SET IS ALL STILL HELD: every frame it can be drawn in, the
 *      cache within its cap;
 *   4. jogging north-east and north-west, every look is the masked body,
 *      never the plain one under the plate;
 *   5. no page errors.
 *
 *   node tools/qa/mp/run.mjs wornbake
 * On the build before it: the cache full at 900, 137 of 177 worn frames held,
 * and 20 of 26 looks north-east and north-west the plain body.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const SETTLE_MS = +(process.env.BT_WB_SETTLE_MS || 600000);

const state = (P) => P.page.evaluate(() => {
  const cov = window.__btMaskedCoverage ? window.__btMaskedCoverage() : null;
  const bw = window.__btBakeWorker ? window.__btBakeWorker() : null;
  const lm = window.__btLocalMisses ? window.__btLocalMisses() : null;
  const st = window.__btMaskedStats ? window.__btMaskedStats() : null;
  /* the cache's size from __btMaskedStats, which the build before has too;
     the worn frames held and the spare bakes skipped only from this one */
  return { have: cov && cov.have, want: cov && cov.want, missing: cov ? cov.missing.slice(0, 8) : null,
    size: st ? st.frames : null, cap: (lm && lm.cap) || 900, worn: lm ? lm.worn : null, spareSkipped: lm ? lm.spareSkipped : null,
    queued: bw ? bw.queued : 0, busy: bw ? bw.busy : 0 };
});

/* the body's look this frame: the masked bake or the plain body */
const bodyNow = (P) => P.page.evaluate(() => {
  const R = window._pixiRenderer;
  const d = R && R.playerDisplayRaw && R.playerDisplayRaw();
  const s = d && d._spriteBody;
  const src = s && s.texture && s.texture.source;
  if (!d || !src) return null;
  if (d._fullsetOn) return 'figure';
  const masked = new Set((window.__btMaskedSources ? window.__btMaskedSources() : []).map((x) => x.uid));
  return { dir: d._animDir, masked: masked.has(src.uid) };
});

async function jogLooks(P, keys, ms) {
  const looks = [];
  for (const k of keys) await P.page.keyboard.down(k);
  await P.page.waitForTimeout(600);
  for (let t = 0; t < ms; t += 400) {
    const b = await bodyNow(P).catch(() => null);
    if (b && b !== 'figure') looks.push(b.masked ? 'M' : 'P');
    await P.page.waitForTimeout(400);
  }
  for (const k of keys) await P.page.keyboard.up(k);
  await P.page.waitForTimeout(300);
  return looks;
}

export async function run({ browser, wsPort, webPort, rec }) {
  /* checked trousers: a pattern, like any drawing, gives the flipped facings
     body pictures of their own (_prewarmArts), and so every set nearly half
     as many frames again -- what takes a player owning two metals past the
     cap (mp-rebuildjog's look, the owner's way of dressing) */
  const P = await H.newPlayer(browser, { name: 'Wornbake', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel',
    init: `(() => { try { if (!localStorage.getItem('qa-wb-seeded')) { localStorage.setItem('bt-pantspat', 'check:3'); localStorage.setItem('qa-wb-seeded', '1'); } } catch (e) { /* plain trousers */ } })()` });
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e && e.message || e).slice(0, 200)));
  let stop = null;
  try {
    await H.enterWorld(P);
    let inWorld = false;
    for (let i = 0; i < 160 && !inWorld; i++) {
      inWorld = (await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone))) === 'wheel';
      if (!inWorld) await P.page.waitForTimeout(500);
    }
    rec.ok('in the world (guard)', inWorld);
    stop = H.keepAlive(P);
    const myId = await H.readState(P, (S) => S.myId);

    /* a copper torso and greaves worn the real way, the kit's other pieces in
       the bag (mp-packedimages's way) */
    await H.devOp(wsPort, 'kit', myId, { what: 'armor' });
    let pieces = null;
    for (let i = 0; i < 40 && !pieces; i++) {
      pieces = await P.page.evaluate(() => {
        const R = window._gameState.current.rpg || {};
        const t = (R.armorStash || []).find((x) => x && x.mat === 'copper' && x.gid);
        const l = (R.legsStash || []).find((x) => x && x.mat === 'copper' && x.gid);
        return t && l ? { t: t.gid, l: l.gid, owned: (R.armorStash || []).length + (R.legsStash || []).length } : null;
      });
      if (!pieces) await P.page.waitForTimeout(300);
    }
    if (pieces) {
      await P.page.evaluate((p) => {
        const S = window._gameState.current;
        const R = S.rpg;
        const ti = (R.armorStash || []).findIndex((x) => x && x.gid === p.t);
        const li = (R.legsStash || []).findIndex((x) => x && x.gid === p.l);
        if (ti >= 0) { R.armor = R.armorStash[ti]; R.armorStash.splice(ti, 1); }
        if (li >= 0) { R.legsArmor = R.legsStash[li]; R.legsStash.splice(li, 1); }
        if (window.__btSyncArmorLayers) window.__btSyncArmorLayers(R);
        S.channel.send({ type: 'stats_update', payload: { armorRef: p.t, legsArmorRef: p.l } });
      }, pieces);
    }
    const worn = await H.waitFor(P, () => ({
      chest: window.__btGetGear ? window.__btGetGear('chest') : null, legs: window.__btGetGear ? window.__btGetGear('legs') : null,
    }), (v) => v && v.chest === 'copperplate' && v.legs === 'coppergreaves', { timeout: 15000, label: 'the armour worn' }).catch(() => null);

    /* 1. the worn set baked */
    let s = null;
    for (let t = 0; t < 240000; t += 1000) {
      s = await state(P);
      if (s.want > 50 && s.have === s.want) break;
      await P.page.waitForTimeout(1000);
    }
    rec.ok(`1. copper torso and greaves worn, every frame of them baked (${s && s.have} of ${s && s.want}; ${pieces && pieces.owned} pieces owned) (guard)`,
      !!worn && !!s && s.want > 50 && s.have === s.want, { worn, s, pieces });

    /* 2. the spare sets baked as far as they go */
    const t0 = Date.now();
    let last = -1, still = 0;
    while (Date.now() - t0 < SETTLE_MS) {
      s = await state(P);
      still = (s.size != null && s.size === last && !s.queued && !s.busy) ? still + 1 : 0;
      last = s.size;
      if (still >= 20) break;
      await P.page.waitForTimeout(1000);
    }
    console.log(`    the cache settled after ${Math.round((Date.now() - t0) / 1000)} s:`, JSON.stringify(s));
    rec.ok(`2. the spare sets baked as far as they go: the cache still for 20 s at ${s.size} frames (cap ${s.cap}), ${s.spareSkipped} spare frames left for want of room (guard)`,
      still >= 20, s);

    /* 3. the worn set all still held */
    rec.ok(`3. every frame of the armour you wear still held (${s.have} of ${s.want}), the cache within its cap (${s.size} of ${s.cap})`,
      s.have === s.want && s.size <= s.cap, s);

    /* 4. north-east and north-west: the masked body, every look */
    const ne = await jogLooks(P, ['w', 'd'], 5000);
    const nw = await jogLooks(P, ['w', 'a'], 5000);
    console.log(`    jogging north-east: ${ne.join(' ')}; north-west: ${nw.join(' ')}`);
    rec.ok(`4. jogging north-east and north-west, never the plain body under the plate (${ne.length + nw.length} looks)`,
      ne.length >= 6 && nw.length >= 6 && !ne.includes('P') && !nw.includes('P'), { ne, nw });

    rec.ok('5. no page errors', errs.length === 0, errs.slice(0, 5));
  } finally {
    if (stop) stop();
    await P.ctx.close().catch(() => {});
  }
}
