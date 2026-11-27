/* ═══ mp-sparelater (v2.3.6763, card LOAD part 3b): THE SPARE ARMOUR SETS AFTER THE LOADING SCREEN ═══
 *
 * The owner's iPhone, a first login (2026-11-27): "25.0 s The armour's body
 * frames were baked", "54.7 s The spare armour sets were baked", the screen
 * up 42.5 s.  Asked if the spare sets (each piece in the bag put on over what
 * you wear) may finish after the screen lifts, THE OWNER: "Yes".  A character
 * in the copper torso and greaves, the iron torso and greaves in the bag (the
 * kit: three spare sets), each login in a FRESH browser (nothing kept on its
 * disk, card LOAD part 2's store), in the Wheel's BroTown:
 *   1. the default: at the lift the spare pass has not begun; it begins only
 *      once the screen is gone and the bro's chain is done; it runs to its end
 *      after it (`bro-alt` noted after `bro-done` and the world), within a
 *      time counted in the renderer's own frames; the page's longest stretch
 *      on it is under the 12 ms line (held-budget.mjs); the readout lists it
 *      last and says so (spareLater);
 *   2. `?sparelater=0`: the old order (alt between masks and upload, before
 *      the bro is done), the readout's old order: and the loading screen's
 *      seconds of the two first logins, side by side (the owner's numbers);
 *   3. the iron torso put on THE MOMENT the bro's chain is done (its set not
 *      baked yet: the spare pass has just begun): the torso is drawn from the
 *      first frame it is worn, no layer of the figure blinks or swaps back,
 *      and the new set's frames are all ready within a time (the body drawn
 *      plain under the armour meanwhile, counted: the stand-in the specs name);
 *   4. no page errors.
 * Timed by the renderer's clock (frames it drew, and performance.now for the
 * record), never a 60 fps window (TRAPS §200).
 *
 *   node tools/qa/mp/run.mjs sparelater
 */
import * as H from './harness.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
export const lane = 'full';

const PHONE = { width: 390, height: 844 };
const OUT = 'tools/qa/mp/out/sparelater.txt';
const LAYERS = ['_spriteBody', '_hairSprite', '_gearShirt', '_gearChest', '_gearLegs', '_bodyHead'];
const log = [];
const note = (s) => { log.push(s); console.log('    ' + s.slice(0, 400)); };

/* every page load: the renderer's frames counted; the lift, and the moment
   the bro's chain is done, each with what stood then */
const WATCH = () => {
  try {
    window.__qaFrames = 0;
    const count = () => { window.__qaFrames++; requestAnimationFrame(count); };
    requestAnimationFrame(count);
    const snap = () => ({
      at: Math.round(performance.now()), frames: window.__qaFrames,
      steps: Object.assign({}, window.__btPreloadSteps || {}),
      spare: window.__btSpareLater ? window.__btSpareLater() : null,
    });
    const t = setInterval(() => {
      const ev = window.__btIntro || [];
      if (!window.__qaLift && ev.find((e) => e && e.ev === 'finish')) window.__qaLift = snap();
      const s = window.__btPreloadSteps || {};
      if (!window.__qaDone && s.done) window.__qaDone = snap();
      if (window.__qaLift && window.__qaDone) clearInterval(t);
    }, 20);
  } catch (e) { /* reported below */ }
};

const inWheel = (P) => H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l,
  { timeout: 240000, label: 'in the Wheel' }).then(() => true).catch(() => false);
const lt = (P) => P.page.evaluate(() => (window.__btLoadTimes ? window.__btLoadTimes() : null)).catch(() => null);
const at = (L, key) => { const b = L && L.bro.find((x) => x.key === key); return b ? b.at : null; };
const stepAt = (L, key) => { const b = L && L.steps.find((x) => x.key === key); return b ? b.at : null; };

/* a fresh browser for the character (nothing kept on its disk) */
async function login(browser, key, wsPort, webPort, query) {
  const P = await H.newPlayer(browser, { name: 'Sparebro', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, phrase: key.phrase, device: key.device, init: WATCH, query });
  P.stop = H.keepAlive(P);
  await H.enterWorld(P, 240000);
  P.inWheel = await inWheel(P);
  return P;
}
const close = async (P) => { try { P.stop(); } catch (e) { /* gone */ } const bad = P.logs.filter((l) => l.startsWith('pageerror')); await P.ctx.close().catch(() => {}); return bad; };

export async function run({ browser, wsPort, webPort, rec }) {
  const errs = [];
  /* ── setup: the copper pair worn, the iron pair in the bag ── */
  const A = await H.newPlayer(browser, { name: 'Sparebro', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
  const stopA = H.keepAlive(A);
  let key = null;
  try {
    await H.enterWorld(A);
    rec.ok('setup: in the Wheel (guard)', await inWheel(A));
    await A.page.waitForTimeout(1500);
    const myId = await H.readState(A, (S) => S.myId);
    await H.devOp(wsPort, 'kit', myId, { what: 'armor' });
    let pieces = null;
    for (let i = 0; i < 40 && !pieces; i++) {
      pieces = await A.page.evaluate(() => {
        const R = window._gameState.current.rpg || {};
        const f = (list, mat) => (list || []).find((x) => x && x.mat === mat && x.gid);
        const t = f(R.armorStash, 'copper'), l = f(R.legsStash, 'copper');
        return t && l && f(R.armorStash, 'iron') && f(R.legsStash, 'iron') ? { t: t.gid, l: l.gid } : null;
      });
      if (!pieces) await A.page.waitForTimeout(300);
    }
    rec.ok('setup: the kit gave copper and iron torsos and greaves (guard)', !!pieces, pieces);
    if (pieces) {
      await A.page.evaluate((p) => {
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
    let onFile = false;
    for (let i = 0; i < 40 && !onFile; i++) {
      const rpg = (await H.adminPlayer(wsPort, myId)).rpg || {};
      onFile = !!(rpg.armorRef && rpg.legsArmorRef) || /copper/.test(JSON.stringify([rpg.armor, rpg.legsArmor]));
      if (!onFile) await A.page.waitForTimeout(500);
    }
    rec.ok('setup: the worker holds the copper pair worn (guard)', onFile);
    /* the armour bag reaches the worker when a browser joins with it
       (wsClient _stashSeed, server/src/gearstash.js): once more through the
       door, so a fresh browser is given the iron pair back */
    await A.page.reload({ waitUntil: 'domcontentloaded' });
    await H.enterWorld(A, 240000);
    rec.ok('setup: back in the world, the bag seeded (guard)', await inWheel(A));
    let held = null;
    for (let i = 0; i < 40 && !held; i++) {
      const rpg = (await H.adminPlayer(wsPort, myId)).rpg || {};
      const mats = (l) => (Array.isArray(l) ? l.map((x) => x && x.mat) : []);
      if (mats(rpg.armorStash).includes('iron') && mats(rpg.legsStash).includes('iron')) held = { armour: mats(rpg.armorStash), legs: mats(rpg.legsStash) };
      else await A.page.waitForTimeout(500);
    }
    rec.ok('setup: the worker holds the iron torso and greaves in the bag (guard)', !!held, held);
    key = await H.keyAndDevice(A);
  } finally {
    stopA();
    errs.push(...A.logs.filter((l) => l.startsWith('pageerror')));
    await A.ctx.close().catch(() => {});
  }
  rec.ok("setup: the character's Login Key is known (guard)", !!(key && key.phrase));
  if (!(key && key.phrase)) return;

  /* ── 1. the default, a first login ── */
  let screenNew = null;
  {
    const B = await login(browser, key, wsPort, webPort, '');
    try {
      rec.ok('setup: 1. in the Wheel, a first login (guard)', B.inWheel);
      const lift = await H.waitFor(B, () => window.__qaLift || null, (v) => !!v, { timeout: 240000, label: 'the lift' }).catch(() => null);
      const done = await H.waitFor(B, () => window.__qaDone || null, (v) => !!v, { timeout: 900000, label: 'the bro done' }).catch(() => null);
      const end = await H.waitFor(B, () => (window.__btPreloadSteps || {}).alt ? { frames: window.__qaFrames, at: Math.round(performance.now()), spare: window.__btSpareLater() } : null,
        (v) => !!v, { timeout: 900000, label: 'the spare sets baked' }).catch(() => null);
      const L = await lt(B);
      screenNew = L && L.screen;
      note('1. default ' + JSON.stringify({ screen: L && L.screen, lift: L && L.lift, bro: L && L.bro, world: stepAt(L, 'world'), atLift: lift && lift.spare, atDone: done && { frames: done.frames, spare: done.spare }, end }));
      rec.ok(`1a. at the lift the spare pass had not begun (runs ${lift && lift.spare && lift.spare.runs}, its gate ${lift && lift.spare && lift.spare.opened ? 'open' : 'shut'}, alt ${lift && lift.steps.alt ? 'noted' : 'not noted'})`,
        !!lift && !!lift.spare && lift.spare.on === true && lift.spare.runs === 0 && lift.spare.opened === false && !lift.steps.alt, lift);
      rec.ok(`1b. nor when the bro's chain was done (runs ${done && done.spare && done.spare.runs}, alt ${done && done.steps.alt ? 'noted' : 'not noted'})`,
        !!done && !done.steps.alt && done.spare.ends === 0, done);
      const fr = end && done ? end.frames - done.frames : null;
      rec.ok(`1c. the spare sets ran to their end after the screen: bro-alt ${at(L, 'bro-alt')} s after bro-done ${at(L, 'bro-done')} s and the world ${stepAt(L, 'world')} s; ${end && end.spare.jobs} jobs in ${fr} of the renderer's frames (${end && done ? ((end.at - done.at) / 1000).toFixed(1) : '--'} s)`,
        !!end && end.spare.ends >= 1 && end.spare.jobs > 0 && at(L, 'bro-alt') != null && at(L, 'bro-alt') >= at(L, 'bro-done') && at(L, 'bro-alt') >= stepAt(L, 'world') && fr != null && fr < 20000, end);
      rec.ok(`1d. the page's longest stretch on the spare sets: ${end && end.spare.maxMs} ms over ${end && end.spare.slices} stretches (the line: 12 ms)`,
        !!end && end.spare.maxMs <= 12, end && end.spare);
      rec.ok('1e. the readout lists the spare sets last and says they were after the screen (spareLater)',
        !!L && L.spareLater === true && L.bro[L.bro.length - 1].key === 'bro-alt', L && L.bro);
    } finally { errs.push(...await close(B)); }
  }

  /* ── 2. ?sparelater=0, a first login ── */
  {
    const D = await login(browser, key, wsPort, webPort, 'sparelater=0');
    try {
      rec.ok('setup: 2. in the Wheel, a first login with ?sparelater=0 (guard)', D.inWheel);
      const done = await H.waitFor(D, () => window.__qaDone || null, (v) => !!v, { timeout: 900000, label: 'the bro done' }).catch(() => null);
      const L = await lt(D);
      const s = (done && done.steps) || {};
      note('2. sparelater=0 ' + JSON.stringify({ screen: L && L.screen, lift: L && L.lift, bro: L && L.bro, spare: done && done.spare }));
      rec.ok(`2a. the old order: masks ${s.masks - s.start}, alt ${s.alt - s.start}, upload ${s.upload - s.start}, done ${s.done - s.start} ms, the gate open from the start`,
        !!done && s.masks > 0 && s.alt >= s.masks && s.upload >= s.alt && s.done >= s.upload && done.spare && done.spare.on === false && done.spare.runs === 0, s);
      rec.ok('2b. ...and the readout in its old order', !!L && L.spareLater === false && L.bro.map((b) => b.key).join(',') === 'bro-loads,bro-masks,bro-alt,bro-upload,bro-gear,bro-done', L && L.bro);
      note(`THE OWNER'S NUMBERS (this box, a first login in copper with the iron pair in the bag): the loading screen up ${L && L.screen} s with ?sparelater=0, ${screenNew} s by default`);
    } finally { errs.push(...await close(D)); }
  }

  /* ── 3. the iron torso put on the moment the bro's chain is done ── */
  {
    const C = await login(browser, key, wsPort, webPort, '');
    try {
      rec.ok('setup: 3. in the Wheel, a first login (guard)', C.inWheel);
      await H.waitFor(C, () => window.__qaDone || null, (v) => !!v, { timeout: 900000, label: 'the bro done' }).catch(() => null);
      const bag = await H.waitFor(C, () => ((window._gameState.current.rpg || {}).armorStash || []).map((x) => x && x.mat),
        (v) => v.includes('iron'), { timeout: 60000, label: 'the iron torso in the bag' }).catch(() => null);
      rec.ok(`setup: 3. the iron torso is in the bag (guard): ${JSON.stringify(bag)}`, !!bag);
      /* the watch and the equip in one evaluate: nothing between them */
      const r = await C.page.evaluate((LAYERS) => new Promise((resolve) => {
        const t0 = performance.now();
        const S = window._gameState.current, R = S.rpg;
        const i = (R.armorStash || []).findIndex((x) => x && x.mat === 'iron' && x.gid);
        if (i < 0) { resolve({ err: 'no iron torso in the bag' }); return; }
        const spareAtEquip = window.__btSpareLater();
        const old = R.armor;
        const piece = R.armorStash[i];
        R.armor = piece; R.armorStash.splice(i, 1, old);
        if (window.__btSyncArmorLayers) window.__btSyncArmorLayers(R);
        S.channel.send({ type: 'stats_update', payload: { armorRef: piece.gid } });
        const shown = (s) => { for (let c = s; c; c = c.parent) { if (!c.visible || c.renderable === false) return false; } return true; };
        const bw = () => (window.__btBakeWorker ? window.__btBakeWorker().local : null);
        const b0 = bw();
        const hist = Object.create(null);
        for (const k of LAYERS) hist[k] = [];
        let frames = 0, wornAt = null, chestOff = 0, fullAt = null, cov0 = null;
        const tick = () => {
          const t = performance.now() - t0;
          const d = window._pixiRenderer && window._pixiRenderer.playerDisplayRaw && window._pixiRenderer.playerDisplayRaw();
          frames++;
          if (d) {
            for (const k of LAYERS) {
              const s = d[k];
              const on = !!(s && s.visible && shown(s) && s.alpha > 0.02 && s.texture && s.texture.width > 2);
              const src = on && s.texture.source ? s.texture.source.uid : null;
              const h = hist[k], last = h[h.length - 1];
              if (!last || last.on !== on || last.src !== src) h.push({ t: Math.round(t), f: frames, on, src });
            }
            const iron = window.__btGetGear && window.__btGetGear('chest') === 'ironplate';
            if (iron && wornAt == null) wornAt = { t: Math.round(t), f: frames };
            if (iron) {
              const g = d._gearChest;
              if (!(g && g.visible && shown(g) && g.texture && g.texture.width > 2)) chestOff++;
              if (frames % 5 === 0 || fullAt == null) {
                const c = window.__btMaskedCoverage();
                if (cov0 == null) cov0 = { have: c.have, want: c.want };
                if (fullAt == null && c.want > 0 && c.have >= c.want) fullAt = { t: Math.round(t), f: frames };
              }
            }
          }
          if ((fullAt && frames - fullAt.f > 30) || t > 600000) {
            const b1 = bw();
            const out = { frames, ms: Math.round(t), wornAt, fullAt, chestOff, cov0, spareAtEquip, spareNow: window.__btSpareLater(),
              plain: b0 && b1 ? b1.plain - b0.plain : null, layers: Object.create(null) };
            for (const k of LAYERS) {
              const h = hist[k];
              let blinks = 0, swapsBack = 0;
              for (let j = 2; j < h.length; j++) {
                const a = h[j - 2], b = h[j - 1], c = h[j];
                if (a.on && !b.on && c.on && c.t - a.t < 400) blinks++;
                if (a.on && b.on && c.on && a.src != null && a.src === c.src && b.src !== a.src && c.t - a.t < 400) swapsBack++;
              }
              out.layers[k] = { changes: h.length - 1, blinks, swapsBack };
            }
            resolve(out);
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }), LAYERS).catch((e) => ({ err: String(e.message || e).slice(0, 200) }));
      note('3. equip at once ' + JSON.stringify(r));
      const lay = (r && r.layers) || {};
      const bad = Object.keys(lay).filter((k) => lay[k].blinks || lay[k].swapsBack);
      rec.ok(`3a. the iron torso was put on while its set was not baked (the spare pass ${r && r.spareAtEquip ? r.spareAtEquip.ends : '--'} ends at the equip; ${r && r.cov0 ? r.cov0.have + ' of ' + r.cov0.want : '--'} of its frames ready at the first look)`,
        !!r && !r.err && !!r.wornAt && !!r.cov0 && r.cov0.have < r.cov0.want && r.spareAtEquip && r.spareAtEquip.ends === 0, r);
      rec.ok(`3b. the torso drawn every frame it was worn (${r && r.chestOff} frames without it), no layer blinked or swapped back (${bad.join(', ') || 'none'})`,
        !!r && !r.err && r.chestOff === 0 && bad.length === 0, r && r.layers);
      rec.ok(`3c. the new set's frames all ready ${r && r.fullAt ? ((r.fullAt.t - r.wornAt.t) / 1000).toFixed(1) + ' s (' + (r.fullAt.f - r.wornAt.f) + ' frames)' : 'NEVER'} after it went on; the body drawn plain under it meanwhile on ${r && r.plain} frames`,
        !!r && !!r.fullAt && !!r.wornAt, r && r.fullAt);
    } finally { errs.push(...await close(C)); }
  }
  rec.ok(`4. nothing went wrong on the pages (${errs.length} page errors)`, errs.length === 0, errs.slice(0, 5));
  try { mkdirSync('tools/qa/mp/out', { recursive: true }); writeFileSync(OUT, log.join('\n') + '\n'); } catch (e) { /* a note only */ }
}
