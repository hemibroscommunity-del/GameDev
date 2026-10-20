/* ═══ v2.3.3520: DOES ANY OF YOUR BRO'S LAYERS FLICKER WHEN YOU COME BACK? ═══
 *
 * The owner: "flicker of hair/torso after returning/joining".  This watches
 * your own figure, every frame, for the first seconds after each way of
 * coming back:
 *
 *   join     -- a reload and the road a returning player takes (Continue,
 *               the character's row, the loading screen);
 *   rebuild  -- the renderer made again on a fresh canvas, which is what an
 *               iPhone's lost graphics context after time away gets
 *               (window._rebuildRenderer: 'context was lost while away');
 *   tab      -- the page hidden and shown again (no rebuild);
 *   recovery -- the black-screen watchdog's reload (`bt_resume_now`): no
 *               loading screen, straight back into the world (BroTown's
 *               auto-rejoin, v2.3.777).  The avatar's pictures preloaded
 *               behind a spinner while the world already showed: 26 of 58
 *               frames plain under the armour.  Since v2.3.3520 that road
 *               waits behind a veil of its own (game/avatarHold.js), and
 *               the watch starts when it comes down, as a player's eyes do.
 *
 * For each layer (body, hair, hat, beard, shirt, plate, greaves, head
 * overlay) it counts the BLINKS (shown, hidden, shown again within 400 ms)
 * and the SWAPS BACK (picture A, B, then A again within 400 ms), and for the
 * body the PLAIN frames: a frame of a jog or stand drawn with the plain body
 * under the armour because its masked bake was not ready
 * (window.__btBakeWorker().local.plain, entityRenderer _localMaskedFrame).
 * A character dressed to reach every bake: a recoloured afro and a beard in
 * its saved look, a copper torso and iron greaves the worker minted and holds
 * as worn (the layered figure), a tee; standing for 3 s, then jogging east.
 *
 *   node tools/qa/mp/run.mjs joinflicker
 */
import * as H from './harness.mjs';

const LAYERS = ['_spriteBody', '_hairSprite', '_headwearSprite', '_facialHairSprite', '_gearShirt', '_gearChest', '_gearLegs', '_bodyHead'];

/* watch the local figure every frame for `ms` */
const watch = (P, ms) => P.page.evaluate(({ ms, LAYERS }) => new Promise((resolve) => {
  const t0 = performance.now();
  const hist = Object.create(null);
  for (const k of LAYERS) hist[k] = [];
  let frames = 0;
  const bw0 = window.__btBakeWorker ? window.__btBakeWorker().local : null;
  const shown = (s) => { for (let c = s; c; c = c.parent) { if (!c.visible || c.renderable === false) return false; if (c.parent == null) return true; } return true; };
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
    }
    if (t < ms) requestAnimationFrame(tick);
    else {
      const bw1 = window.__btBakeWorker ? window.__btBakeWorker().local : null;
      const out = { frames, layers: Object.create(null),
        plain: bw0 && bw1 ? bw1.plain - bw0.plain : null, hits: bw0 && bw1 ? bw1.hits - bw0.hits : null };
      for (const k of LAYERS) {
        const h = hist[k];
        let blinks = 0, swapsBack = 0;
        for (let i = 2; i < h.length; i++) {
          const a = h[i - 2], b = h[i - 1], c = h[i];
          if (a.on && !b.on && c.on && c.t - a.t < 400) blinks++;
          if (a.on && b.on && c.on && a.src != null && a.src === c.src && b.src !== a.src && c.t - a.t < 400) swapsBack++;
        }
        out.layers[k] = { changes: h.length - 1, blinks, swapsBack, tail: h.slice(-6).map((e) => (e.on ? e.src : '-') + '@' + e.t) };
      }
      resolve(out);
    }
  };
  requestAnimationFrame(tick);
}), { ms, LAYERS });

/* stand 3 s, then jog east for the rest of the watch */
async function watchStandThenJog(P, ms) {
  const jog = P.page.evaluate(() => new Promise((r) => setTimeout(r, 3000))).then(() => P.page.keyboard.down('d'));
  const w = await watch(P, ms);
  await jog; await P.page.keyboard.up('d');
  return w;
}

const displayUp = (P, label) => H.waitFor(P, () => {
  const R = window._pixiRenderer;
  return !!(R && R.playerDisplayRaw && R.playerDisplayRaw());
}, (v) => v, { timeout: 90000, label });

/* v2.3.3520: the look is the CHARACTER's.  Put in the stores before the
   creator opens (its pickers start from them), so the record the creator's
   join writes keeps it and every join brings the same look back.  Set on the
   page alone after joining, each join's record (characterRecord.js) put the
   creator's look back over it -- a hair change the test made, not the game.
   First load only. */
const SEED_LOOK = () => {
  try {
    if (!localStorage.getItem('qa-jf-look')) {
      localStorage.setItem('bt-hair', 'afro');
      localStorage.setItem('bt-haircolor', 'auburn');
      localStorage.setItem('bt-facialhair', 'beard');
      localStorage.setItem('qa-jf-look', '1');
    }
  } catch (e) { /* reported below */ }
};

export async function run({ browser, wsPort, webPort, rec }) {
  /* avatarholdms: this box makes the bro's pictures more slowly than the
     hold's 20 s cap (a phone does not), so the recovery road's veil waits for
     the pictures themselves here -- what the road does when they are ready */
  const P = await H.newPlayer(browser, { name: 'Flicker', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, init: SEED_LOOK, query: 'avatarholdms=170000' });
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);
  const myId = await H.readState(P, (S) => S.myId);
  /* ═══ v2.3.3520: REAL ARMOUR, WORN THE REAL WAY ═══
     The first cut put the plate on with window.__btGearSet -- the drawn layer
     alone, which the worker never hears of.  Its next full player_state took
     the plate off again (wsClient's armour echo drives the layer,
     gearCatalog.syncArmorLayers), so the reload started bare and every "plain
     frame after joining" it counted was the first bake after the test put the
     plate back on.  Now the admin kit mints a copper torso and iron greaves
     and they are worn through the equip lane (stats_update by id, as the
     game's own equip does), so the worker keeps them and the reload starts
     armoured, as a returning player's does. */
  await H.devOp(wsPort, 'kit', myId, { what: 'armor' });
  let pieces = null;
  for (let i = 0; i < 40 && !pieces; i++) {
    pieces = await P.page.evaluate(() => {
      const R = window._gameState.current.rpg || {};
      const t = (R.armorStash || []).find((x) => x && x.mat === 'copper' && x.gid);
      const l = (R.legsStash || []).find((x) => x && x.mat === 'iron' && x.gid);
      return t && l ? { t: t.gid, l: l.gid } : null;
    });
    if (!pieces) await P.page.waitForTimeout(300);
  }
  rec.ok('setup: the admin kit hands out a copper torso and iron greaves the worker minted (guard)', !!pieces, pieces);
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
  /* the worker's echo says it is on */
  const worn = await H.waitFor(P, (S) => ({
    t: S.rpg && S.rpg.armor && S.rpg.armor.gid, l: S.rpg && S.rpg.legsArmor && S.rpg.legsArmor.gid,
    chest: window.__btGetGear ? window.__btGetGear('chest') : null, legs: window.__btGetGear ? window.__btGetGear('legs') : null,
  }), (v) => !!(pieces && v && v.t === pieces.t && v.l === pieces.l && v.chest === 'copperplate' && v.legs === 'irongreaves'),
  { timeout: 15000, label: 'the armour worn' }).catch((e) => ({ err: String(e.message || e).slice(0, 200) }));
  const look = await P.page.evaluate(() => { const r = window.__btCharRecord ? window.__btCharRecord() : null; return r && r.look ? { hr: r.look.hr, hc: r.look.hc, fh: r.look.fh } : null; });
  rec.ok('setup: the copper torso and iron greaves are worn and drawn, and the character\'s record keeps the auburn afro and the beard (guard)',
    !!(worn && !worn.err && look && look.hr === 'afro' && look.hc === 'auburn' && look.fh === 'beard'), { worn, look });
  /* the greatsword in hand: the page's own state is enough for the figure */
  const arm = () => P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.rpg) { S.rpg.weapon = { name: 'Copper Greatsword', type: 'greatsword', gearBase: 'copper' }; S.rpg.activeSlot = 'melee'; }
  });
  await arm();
  await P.page.waitForTimeout(3000);
  const roads = [];
  const report = async (road, w) => {
    roads.push({ road, w });
    /* v2.3.3520: how far the bro's preload got (pixiRenderer _preStep), and
       the bake worker's queue -- a step that never finishes is named here */
    const pre = await P.page.evaluate(() => {
      const s = window.__btPreloadSteps || {}, t0 = s.start || 0;
      const steps = Object.keys(s).filter((k) => k !== 'start').map((k) => `${k} +${s[k] - t0} ms`);
      const bw = window.__btBakeWorker ? window.__btBakeWorker() : null;
      return { steps, bw: bw && { alive: bw.alive, dead: bw.dead, busy: bw.busy, queued: bw.queued, pending: bw.pending, worker: bw.worker, failed: bw.failed, inline: bw.inline, late: bw.local && bw.local.late } };
    }).catch(() => null);
    if (pre) console.log(`      preload: ${pre.steps.join(', ') || 'no step stamped'}; bake worker ${JSON.stringify(pre.bw)}`);
    const summary = Object.entries(w.layers).map(([k, v]) => `${k.replace(/^_/, '')} ${v.blinks}b/${v.swapsBack}s/${v.changes}c`).join(', ');
    console.log(`    ${road}: ${w.frames} frames, ${w.plain} plain body frames (${w.hits} baked); ${summary}`);
    /* which frames were drawn plain, and was their body picture one the
       loading screen baked for (a frame never baked) or a new one (the body
       made again after it) */
    const lm = await P.page.evaluate(() => (window.__btLocalMisses ? window.__btLocalMisses() : null)).catch(() => null);
    if (lm && w.plain) {
      const recent = lm.misses.slice(-Math.min(w.plain, 32));
      const by = Object.create(null);
      for (const m of recent) { const k = `${m.pose}/${m.dir} uid ${m.uid}${lm.cachedUids[m.uid] ? ' (bakes held: ' + lm.cachedUids[m.uid] + ')' : ' (no bakes held)'} [${m.worn}]`; by[k] = (by[k] || 0) + 1; }
      console.log('      drawn plain: ' + Object.entries(by).map(([k, n]) => `${n}x ${k}`).join('; '));
      console.log('      bakes held by body picture: ' + JSON.stringify(lm.cachedUids));
      w.misses = recent;
    }
  };

  /* 1. JOIN: a reload and the returning player's road -- nothing put on
     after it: what the worker and the record bring back is what is drawn */
  await P.page.reload({ waitUntil: 'domcontentloaded' });
  await H.enterWorld(P);
  await arm();
  await displayUp(P, 'back in the world');
  /* the loading screen lifts on the same 20 s cap when the pictures take
     longer (this box): say which it was, as a frame drawn plain then is the
     cap's, not the road's */
  const lifted = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return { shown: S.__introLiftedAt || 0, ready: window.__btAvatarReadyAt || 0 };
  });
  console.log(`    join: the loading screen lifted ${!lifted.shown ? '(unknown)'
    : !lifted.ready ? 'BEFORE the bro\'s pictures were made -- they still were (its 20 s cap, on this box)'
    : lifted.ready <= lifted.shown ? 'after the bro\'s pictures were made'
    : `${lifted.ready - lifted.shown} ms BEFORE they were (its 20 s cap, on this box)`}`);
  await report('join', await watchStandThenJog(P, 8000));

  /* 2. REBUILD: the renderer made again, as after a lost context */
  await H.hopTo(P, H.TOWN_CLEAN_SPOT.x, H.TOWN_CLEAN_SPOT.y).catch(() => {});
  await P.page.evaluate(() => { window.__btLastGlRebuild = 0; if (window._rebuildRenderer) window._rebuildRenderer('qa: joinflicker'); });
  await P.page.waitForTimeout(300);
  await displayUp(P, 'renderer rebuilt');
  await report('rebuild', await watchStandThenJog(P, 8000));

  /* 3. TAB: hidden for 6 s and shown again */
  await H.hopTo(P, H.TOWN_CLEAN_SPOT.x, H.TOWN_CLEAN_SPOT.y).catch(() => {});
  await P.page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('blur'));
  });
  await P.page.waitForTimeout(6000);
  await P.page.evaluate(() => {
    delete document.visibilityState; delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
  });
  await report('tab', await watchStandThenJog(P, 8000));

  /* 4. RECOVERY: the watchdog's reload, straight back in with no loading
     screen -- given 2 minutes, then reported as not reached */
  try {
    await P.page.evaluate(() => { try { sessionStorage.setItem('bt_resume_now', '1'); } catch (e) { /* none */ } });
    await P.page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    const route = await P.page.waitForFunction(() => window.__btBootRoute || null, null, { timeout: 30000, polling: 100 })
      .then((h) => h.jsonValue()).catch(() => null);
    await displayUp(P, 'back in after the recovery reload');
    /* v2.3.3520: this road holds the world behind a veil of its own until the
       bro's pictures are made (game/avatarHold.js) -- what a player sees
       starts when it comes down, and a veil still up is not that */
    const hold = await P.page.waitForFunction(() => {
      const h = window.__btAvatarHold;
      return h && h.liftedAt && !document.querySelector('.bt-zone-loading') ? { ms: h.liftedAt - h.t, why: h.why } : null;
    }, null, { timeout: 190000, polling: 100 }).then((x) => x.jsonValue()).catch(() => null);
    console.log(`    recovery: the bro's veil ${hold ? `held ${hold.ms} ms (${hold.why})` : 'never seen'}`);
    rec.ok('the straight-in road holds the world behind a veil until the bro\'s pictures are made, and lets it go',
      !!hold && hold.why === 'ready', hold);
    const rw = await watchStandThenJog(P, 8000);
    rw.route = route;
    await report('recovery (' + route + ')', rw);
    rec.ok(`...and once it is down no frame of the bro is drawn plain under his armour (${rw.plain} of ${rw.frames})`,
      rw.plain === 0 && rw.frames > 5, { plain: rw.plain, frames: rw.frames, misses: rw.misses });
  } catch (e) {
    console.log('    recovery: not reached -- ' + String(e && e.message || e).slice(0, 160));
  }

  const worst = roads.flatMap((r) => Object.entries(r.w.layers).map(([k, v]) => ({ road: r.road, k, blinks: v.blinks, swapsBack: v.swapsBack, tail: v.tail })))
    .filter((x) => x.blinks || x.swapsBack);
  rec.ok(`REPORT: layers that blink or swap back after coming back (${worst.length ? worst.map((x) => x.road + ' ' + x.k + ' ' + x.blinks + 'b/' + x.swapsBack + 's').join(', ') : 'none'}); `
    + `plain body frames ${roads.map((r) => r.road + ' ' + r.w.plain).join(', ')}`,
    roads.length >= 3 && roads.every((r) => r.w.frames > 5), roads.map((r) => ({ road: r.road, frames: r.w.frames, plain: r.w.plain })));
  rec.ok('no layer blinks or swaps back after coming back in', worst.length === 0, worst);
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await P.ctx.close();
}
