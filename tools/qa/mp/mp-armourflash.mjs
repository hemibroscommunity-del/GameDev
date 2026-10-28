/* ═══ v2.3.3577: DOES ANY PART OF AN ARMOURED BRO FLASH AFTER A FRESH LOGIN? ═══
 *
 * The owner, 2026-10-22: "flashing is still happening on certain body parts
 * even after logging out and back in".  A phone in the world wearing the
 * owner's own set (a copper torso and copper greaves the worker minted and
 * holds as worn), reloaded and back in through the door (Continue, the row,
 * the loading screen), then walked every way, sprinting and jumping, watched
 * every frame:
 *   - for each layer of the figure (body, hair, shirt, plate, greaves, head):
 *     BLINKS (shown, hidden, shown again within 400 ms) and SWAPS BACK
 *     (picture A, B, then A again within 400 ms);
 *   - the body's PLAIN frames: drawn with the plain body under the armour
 *     because its masked bake was not ready (window.__btBakeWorker().local);
 *   - which pose and facing each plain frame was, and its body picture;
 *   - v2.3.3742: and before all that, straight after putting the set on: how
 *     long until its jog, and all of it, is baked (measured, not a line).
 *
 *   node tools/qa/mp/run.mjs armourflash
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const LAYERS = ['_spriteBody', '_hairSprite', '_headwearSprite', '_facialHairSprite', '_gearShirt', '_gearChest', '_gearLegs', '_bodyHead'];
const WALK = [
  ['south', ['s']], ['southeast', ['s', 'd']], ['east', ['d']], ['northeast', ['w', 'd']],
  ['north', ['w']], ['northwest', ['w', 'a']], ['west', ['a']], ['southwest', ['s', 'a']],
];

/* watch the local figure every frame until window.__qaAfStop is set */
const startWatch = (P) => P.page.evaluate((LAYERS) => {
  const t0 = performance.now();
  const hist = Object.create(null);
  for (const k of LAYERS) hist[k] = [];
  const plainAt = [];
  let frames = 0;
  const bw = () => (window.__btBakeWorker ? window.__btBakeWorker().local : null);
  const b0 = bw();
  let lastPlain = b0 ? b0.plain : 0;
  const shown = (s) => { for (let c = s; c; c = c.parent) { if (!c.visible || c.renderable === false) return false; if (c.parent == null) return true; } return true; };
  window.__qaAfStop = false;
  window.__qaAf = null;
  const tick = () => {
    const R = window._pixiRenderer;
    const d = R && R.playerDisplayRaw && R.playerDisplayRaw();
    const t = performance.now() - t0;
    if (d) {
      frames++;
      for (const k of LAYERS) {
        const s = d[k];
        const on = !!(s && s.visible && shown(s) && s.alpha > 0.02 && s.texture && s.texture.uid != null && s.texture.width > 2);
        const src = on && s.texture.source ? s.texture.source.uid : null;
        const h = hist[k];
        const last = h[h.length - 1];
        if (!last || last.on !== on || last.src !== src) h.push({ t: Math.round(t), on, src, pose: d._animPose, dir: d._animDir });
      }
      const b = bw();
      if (b && b.plain !== lastPlain) { plainAt.push({ t: Math.round(t), n: b.plain - lastPlain, pose: d._animPose, dir: d._animDir }); lastPlain = b.plain; }
    }
    if (!window.__qaAfStop) { requestAnimationFrame(tick); return; }
    const b1 = bw();
    const out = { frames, ms: Math.round(t), layers: Object.create(null), plainAt,
      plain: b0 && b1 ? b1.plain - b0.plain : null, hits: b0 && b1 ? b1.hits - b0.hits : null, late: b0 && b1 ? b1.late - b0.late : null, inline: b0 && b1 ? b1.inline - b0.inline : null };
    for (const k of LAYERS) {
      const h = hist[k];
      let blinks = 0, swapsBack = 0;
      const ev = [];
      for (let i = 2; i < h.length; i++) {
        const a = h[i - 2], b = h[i - 1], c = h[i];
        if (a.on && !b.on && c.on && c.t - a.t < 400) { blinks++; if (ev.length < 6) ev.push(`blink ${b.pose}/${b.dir}@${b.t}`); }
        if (a.on && b.on && c.on && a.src != null && a.src === c.src && b.src !== a.src && c.t - a.t < 400) { swapsBack++; if (ev.length < 6) ev.push(`swap ${b.pose}/${b.dir}@${b.t} (${c.t - b.t} ms)`); }
      }
      out.layers[k] = { changes: h.length - 1, blinks, swapsBack, ev };
    }
    window.__qaAf = out;
  };
  requestAnimationFrame(tick);
  return true;
}, LAYERS);

const stopWatch = async (P) => {
  await P.page.evaluate(() => { window.__qaAfStop = true; });
  return H.waitFor(P, () => window.__qaAf, (v) => !!v, { timeout: 10000, label: 'the watch stops' });
};

/* the Mayor's welcome and any other talk put away (mp-gatherquiet's) */
async function closeTalk(P) {
  for (let i = 0; i < 10; i++) {
    await P.page.waitForTimeout(400);
    const scrim = P.page.locator('.bt-npcdlg-scrim').first();
    if (await scrim.isVisible().catch(() => false)) {
      await scrim.click({ position: { x: 20, y: 300 } }).catch(() => {});
      continue;
    }
    let hit = false;
    for (const t of ['Next', 'Close', 'Got it']) {
      const btn = P.page.locator('button:visible', { hasText: t }).first();
      if (await btn.isVisible().catch(() => false)) { await btn.click().catch(() => {}); hit = true; break; }
    }
    if (!hit) return;
  }
}

async function walkAll(P, ms) {
  for (const [, keys] of WALK) {
    for (const k of keys) await P.page.keyboard.down(k);
    await P.page.waitForTimeout(ms);
    for (const k of keys) await P.page.keyboard.up(k);
    await P.page.waitForTimeout(250);
  }
}

async function inWheel(P) {
  for (let i = 0; i < 160; i++) {
    if ((await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone))) === 'wheel') return true;
    await P.page.waitForTimeout(500);
  }
  return false;
}

async function report(P, label, w) {
  const lm = await P.page.evaluate(() => (window.__btLocalMisses ? window.__btLocalMisses() : null)).catch(() => null);
  const summary = Object.entries(w.layers).map(([k, v]) => `${k.replace(/^_/, '')} ${v.blinks}b/${v.swapsBack}s/${v.changes}c`).join(', ');
  console.log(`    ${label}: ${w.frames} frames in ${w.ms} ms, ${w.plain} plain body frames (${w.hits} baked hits, ${w.late} late, ${w.inline} inline); ${summary}`);
  for (const [k, v] of Object.entries(w.layers)) if (v.ev.length) console.log(`      ${k}: ${v.ev.join('; ')}`);
  if (w.plainAt.length) {
    const by = Object.create(null);
    for (const p of w.plainAt) { const k = `${p.pose}/${p.dir}`; by[k] = (by[k] || 0) + p.n; }
    console.log('      plain frames by pose/facing: ' + Object.entries(by).map(([k, n]) => `${k} ${n}`).join(', '));
    console.log('      first plain at: ' + w.plainAt.slice(0, 8).map((p) => `${p.pose}/${p.dir}@${p.t}`).join(', '));
  }
  if (lm) {
    const recent = lm.misses.slice(-Math.min(Math.max(w.plain || 0, 1), 32));
    const by = Object.create(null);
    for (const m of recent) { const k = `${m.pose}/${m.dir} uid ${m.uid}${lm.cachedUids[m.uid] ? ' (bakes held: ' + lm.cachedUids[m.uid] + ')' : ' (no bakes held)'} [${m.worn}]`; by[k] = (by[k] || 0) + 1; }
    if (w.plain) console.log('      drawn plain: ' + Object.entries(by).map(([k, n]) => `${n}x ${k}`).join('; '));
    console.log('      bakes held by body picture: ' + JSON.stringify(lm.cachedUids));
  }
}

/* a pattern on the trousers, put in the store before the creator opens so
   the character's record keeps it (mp-joinflicker's SEED_LOOK): a drawn
   player's west, northwest and southeast are drawn from a body picture of
   their own, the pattern flipped (playerSkins localBodyArt(true)) */
const SEED_INK = () => {
  try {
    if (!localStorage.getItem('qa-af-ink') && !/[?&]qaplain=1/.test(location.search)) {
      localStorage.setItem('bt-pantspat', 'check:3');
      localStorage.setItem('qa-af-ink', '1');
    }
  } catch (e) { /* reported below */ }
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Flashbro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', init: SEED_INK });
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e && e.message || e).slice(0, 200)));
  let stopAlive = false;
  (async () => { while (!stopAlive) { await P.page.keyboard.press('Control').catch(() => {}); for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {}); } })();
  try {
    await H.enterWorld(P);
    rec.ok('setup: in the world (guard)', await inWheel(P));
    await P.page.waitForTimeout(1500);
    const myId = await H.readState(P, (S) => S.myId);

    /* the owner's set: a copper torso and copper greaves, worn the real way */
    await H.devOp(wsPort, 'kit', myId, { what: 'armor' });
    let pieces = null;
    for (let i = 0; i < 40 && !pieces; i++) {
      pieces = await P.page.evaluate(() => {
        const R = window._gameState.current.rpg || {};
        const t = (R.armorStash || []).find((x) => x && x.mat === 'copper' && x.gid);
        const l = (R.legsStash || []).find((x) => x && x.mat === 'copper' && x.gid);
        return t && l ? { t: t.gid, l: l.gid } : null;
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
    }), (v) => v && v.chest === 'copperplate' && v.legs === 'coppergreaves', { timeout: 15000, label: 'the armour worn' }).catch((e) => ({ err: String(e.message || e).slice(0, 160) }));
    rec.ok('setup: the copper torso and copper greaves are worn (guard)', !!worn && !worn.err, worn);
    /* v2.3.3742: straight after putting it on -- a judge handed the set,
       wearing it and running off.  Measured, not held to a line (this box
       draws a few frames a second, so a plain frame is rare here at any
       pace): how long, standing still, until every jog frame of the set you
       wear is baked, and until all of it is (window.__btMaskedCoverage;
       `missing` lists the first 24 not baked, in the prewarm's order); then
       the walk, its plain body frames counted */
    const ready = await P.page.evaluate(async () => {
      const t0 = performance.now();
      let jog = null, all = null, last = null;
      while (performance.now() - t0 < 90000 && all == null) {
        const c = window.__btMaskedCoverage ? window.__btMaskedCoverage() : null;
        if (c && c.want > 0) {
          last = c;
          const t = Math.round(performance.now() - t0);
          if (jog == null && c.missing.length < 24 && !c.missing.some((m) => /^jog\//.test(m))) jog = t;
          if (c.have === c.want) { all = t; if (jog == null) jog = t; }
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      const bw = window.__btBakeWorker ? window.__btBakeWorker() : null;
      const lm = window.__btLocalMisses ? window.__btLocalMisses() : null;
      return { jog, all, have: last && last.have, want: last && last.want, missing: last ? last.missing.slice(0, 12) : null,
        worker: bw && { stuck: bw.stuck, busy: bw.busy, queued: bw.queued, pending: bw.pending, worker: bw.worker, inline: bw.inline, failed: bw.failed, raw: bw.raw, skipped: bw.skipped, beltPending: bw.beltPending, dead: bw.dead },
        cache: lm && { size: lm.size, cap: lm.cap, worn: lm.worn, uids: lm.cachedUids } };
    });
    await startWatch(P);
    await walkAll(P, 1000);
    const w0 = await stopWatch(P);
    await report(P, 'the walk after putting the armour on', w0);
    console.log('    the bake worker then: ' + JSON.stringify(ready.worker) + '; the cache: ' + JSON.stringify(ready.cache));
    console.log(`    after putting the armour on: every jog frame baked in ${ready.jog} ms, the whole set in ${ready.all} ms (held ${ready.have} of ${ready.want}${ready.missing && ready.missing.length ? '; missing ' + ready.missing.join(', ') : ''})`);
    rec.ok(`(measure) after putting the armour on: the jog baked in ${ready.jog} ms, the set in ${ready.all} ms; the walk after, ${w0.plain} plain body frames`, true);
    const look = await P.page.evaluate(() => { const r = window.__btCharRecord ? window.__btCharRecord() : null; return r && r.look ? JSON.stringify(r.look).slice(0, 300) : null; });
    console.log('    the character\'s record: ' + look);
    await P.page.waitForTimeout(4000);

    /* log out and back in: the page made again, the door, Continue, the row,
       the loading screen */
    await P.page.reload({ waitUntil: 'domcontentloaded' });
    await H.enterWorld(P);
    rec.ok('back in the world after logging in again (guard)', await inWheel(P));
    const pre = await P.page.evaluate(() => {
      const s = window.__btPreloadSteps || {}, t0 = s.start || 0;
      const S = window._gameState.current;
      return { steps: Object.keys(s).filter((k) => k !== 'start').map((k) => `${k} +${s[k] - t0} ms`), lifted: S.__introLiftedAt || 0, ready: window.__btAvatarReadyAt || 0,
        gear: [window.__btGetGear && window.__btGetGear('chest'), window.__btGetGear && window.__btGetGear('legs')] };
    });
    console.log(`    preload: ${pre.steps.join(', ')}; the loading screen lifted ${pre.ready && pre.lifted ? (pre.ready <= pre.lifted ? 'after' : (pre.ready - pre.lifted) + ' ms before') : '?'} the bro's pictures were made; wearing ${pre.gear.join(' + ')}`);

    /* ── every frame baked, once the loading screen has baked what you wear ──
       (this box finishes that step after the screen's own 20 s cap: a phone
       well before; the step, `masks`, is the worn set's prewarm, before the
       sets one equip away) -- of every frame the bro can be drawn in under
       the armour, in all EIGHT facings, the flipped three from their own body
       picture, how many the cache holds (window.__btMaskedCoverage) */
    const masked = await H.waitFor(P, () => (window.__btPreloadSteps && window.__btPreloadSteps.masks) || 0, (v) => v > 0,
      { timeout: 300000, label: "the worn set's masks baked" }).catch(() => 0);
    const cov = await P.page.evaluate(() => (window.__btMaskedCoverage ? window.__btMaskedCoverage() : null));
    const bw = await P.page.evaluate(() => { const b = window.__btBakeWorker ? window.__btBakeWorker() : null; return b && { worker: b.worker, inline: b.inline, failed: b.failed, raw: b.raw, rawKeys: b.rawKeys, beltPending: b.beltPending, skipped: b.skipped }; });
    console.log('    bake worker: ' + JSON.stringify(bw));
    console.log(`    the worn set's masks baked: ${masked ? 'yes' : 'NO'}; masked frames held ${cov && cov.have} of ${cov && cov.want}${cov && cov.missing.length ? ' -- missing ' + cov.missing.join(', ') : ''}`);
    rec.ok(`with the worn set's masks baked behind the loading screen, every frame the bro can be drawn in (all 8 facings, the flipped three from their own picture) is baked under the armour (${cov && cov.have} of ${cov && cov.want})`,
      !!masked && !!cov && cov.want > 100 && cov.have === cov.want, cov);

    await startWatch(P);
    await closeTalk(P);
    await P.page.waitForTimeout(2000);
    await walkAll(P, 1500);
    /* a sprint east and back, jumps */
    await P.page.keyboard.down('Shift'); await P.page.keyboard.down('d');
    await P.page.waitForTimeout(2000);
    await P.page.keyboard.up('d'); await P.page.keyboard.down('a');
    await P.page.waitForTimeout(2000);
    await P.page.keyboard.up('a'); await P.page.keyboard.up('Shift');
    for (let i = 0; i < 3; i++) { await P.page.keyboard.press('x'); await P.page.waitForTimeout(900); }
    const w1 = await stopWatch(P);
    await report(P, 'first walk after logging in', w1);

    /* again: every frame is baked by now, so anything left is not a bake */
    await startWatch(P);
    await walkAll(P, 1500);
    const w2 = await stopWatch(P);
    await report(P, 'second walk', w2);

    const blinks = (w) => Object.values(w.layers).reduce((n, v) => n + v.blinks + v.swapsBack, 0);
    rec.ok(`after logging in, no frame of the walk shows the plain body under the armour (${w1.plain} plain)`, w1.plain === 0, { plainAt: w1.plainAt.slice(0, 12) });
    rec.ok(`after logging in, no layer of the figure blinks or swaps back (${blinks(w1)})`, blinks(w1) === 0, w1.layers);
    rec.ok(`the second walk too: no plain frame (${w2.plain}) and no blink (${blinks(w2)})`, w2.plain === 0 && blinks(w2) === 0, w2.layers);
    rec.ok('no page errors', errs.length === 0, errs.slice(0, 5));
  } finally {
    stopAlive = true;
  }
}
