/* ═══ v2.3.3426: THE OTHERS SEE YOU WORK A BED ═══
 *
 * Until this, a player working a bed on the farm was seen by everyone else
 * there standing at it: the steps went only to the worker.  Now the move
 * carries the step as its `ex` ('farm:<step>:<n>', game/farmWork.js), as a
 * lumberjack's carries 'chop', and every screen on the farm draws that
 * player's farmer (effectsRenderer _drawPeerFarmer).  Two phones on the farm:
 * Digger, dressed his own way (deep skin, blue trousers, red boots, copper
 * greaves under a green tee), digs bed 0 and then bed 1 while Watcher, in the
 * default look, stands beside him.  On Watcher's screen:
 *   1. the code arrives off the wire, 'farm:dig:<n>';
 *   2. Digger's farmer is drawn and his walking body put away: the hoe, from
 *      its first frames through the swing, at his boots, his size;
 *   3. in HIS colours: a figure baked for them (Watcher's own is in other
 *      colours), the body cut for greaves, his greaves in copper, his tee
 *      over them, the hoe over both, his cap on top;
 *   4. the hoe heard where it strikes (the step's own sound, at his share);
 *   5. when the step ends his walking body is back and the farmer gone;
 *   6. Digger takes Watcher's colours and no greaves: his next step is drawn
 *      from Watcher's own farmer (nothing baked for him);
 *   7. back in his own colours his farmer is baked for them again, and
 *      Watcher leaves through the gate: the farmer's sprites and the figure
 *      baked for Digger let go of at once;
 *   8. no page errors on either.
 * Picture: tools/qa/mp/out/farmpeer-swing.png, Digger mid-swing on Watcher's
 * screen.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { FARM_BEDS, FARM_GATE } from '../../../src/data/farmLayout.js';
import { FARM_ANIMS } from '../../../src/data/farmAnims.js';

const PHONE = { width: 390, height: 844 };
const FOOT_DY = 52;   /* a body's middle to its boots on the farm */

const COACH_OFF = `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle',
    'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
} catch (e) {}
window.__btTrimVerify = true;`;
const DIGGER = COACH_OFF + `
try {
  localStorage.setItem('bt-skin', 'deep');
  localStorage.setItem('bt-headwear', 'red-cap');
  localStorage.setItem('bt-shirt', 'tshirt');
  localStorage.setItem('bt-shirtcolor', 'green');
  localStorage.setItem('bt-pants', 'blue');
  localStorage.setItem('bt-shoes', 'red');
} catch (e) {}`;

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  /* at 1x: two phones' pages on this box drew about a frame a second at 2x,
     too few to see a swing */
  const W = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, guest: true, viewport: PHONE, touch: true, dpr: 1, world: 'wheel', init: COACH_OFF });
  const D = await H.newPlayer(browser, { name: 'Digger', wsPort, webPort, viewport: PHONE, touch: true, dpr: 1, world: 'wheel', init: DIGGER });
  const errors = { W: [], D: [] };
  W.page.on('pageerror', (e) => errors.W.push(String((e && e.message) || e).slice(0, 200)));
  D.page.on('pageerror', (e) => errors.D.push(String((e && e.message) || e).slice(0, 200)));
  let stopAlive = false;
  for (const P of [W, D]) {
    (async () => {
      while (!stopAlive) {
        await P.page.keyboard.press('Control').catch(() => {});
        for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
      }
    })();
  }
  const until = async (P, fn, pred, ms = 8000) => {
    let v = null;
    for (let t0 = Date.now(); Date.now() - t0 < ms;) { v = await fn(); if (pred(v)) return v; await P.page.waitForTimeout(150); }
    return v;
  };
  const toFarm = async (P) => {
    await P.page.evaluate(() => { try { window._uiPanels.building('farm'); } catch (e) { /* the check says */ } });
    const visit = await until(P, () => P.page.evaluate(() => { const b = document.querySelector('[data-farm-visit]'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }), (v) => !!v, 8000);
    if (visit) await P.page.touchscreen.tap(visit.x, visit.y);
    return until(P, () => H.readState(P, (S) => ({ zone: S.currentZone, hold: !!S._farmArtHold, veil: !!document.querySelector('.bt-zone-loading') })),
      (v) => v.zone === 'farm_home' && !v.hold && !v.veil, 25000);
  };
  /* Watcher's view of Digger, every animation frame for `ms` */
  const watch = (dId, ms) => W.page.evaluate(({ dId, ms, footDy }) => new Promise((done) => {
    const out = [];
    const t0 = performance.now();
    const tick = () => {
      const S = window._gameState.current;
      const o = (S.others || {})[dId];
      const fp = window.__btPeerFarmers ? window.__btPeerFarmers()[dId] : null;
      const d = window._pixiRenderer && window._pixiRenderer.peerDisplayRaw ? window._pixiRenderer.peerDisplayRaw(dId) : null;
      const ox = o ? (o.renderX != null ? o.renderX : o.x) : null, oy = o ? (o.renderY != null ? o.renderY : o.y) : null;
      out.push({ t: Math.round(performance.now() - t0), ex: o ? o._ex || null : 'gone', farmer: fp ? JSON.parse(JSON.stringify(fp)) : null,
        body: d ? !!d.visible : null, ox, oy,
        groundDy: footDy });
      if (performance.now() - t0 < ms) requestAnimationFrame(tick); else done(out);
    };
    requestAnimationFrame(tick);
  }), { dId, ms, footDy: FOOT_DY });
  try {
    await Promise.all([H.enterWorld(W), H.enterWorld(D)]);
    for (const P of [W, D]) {
      const wa = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
        (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the Wheel' }).catch(() => null);
      rec.ok(`${P.name} is in the Wheel (guard)`, !!wa, wa);
      if (!wa) return;
    }
    const wId = await H.readState(W, (S) => S.myId);
    const dId = await H.readState(D, (S) => S.myId);
    for (const [P, id] of [[W, wId], [D, dId]]) {
      await H.devOp(wsPort, 'quests', id);
      await P.page.evaluate(() => { setInterval(() => { const S = window._gameState && window._gameState.current; if (S) S._isDesktop = false; }, 120); });
      await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    }
    await D.page.evaluate(() => window.__btSetGear('legs', 'coppergreaves'));

    /* ── onto the farm, both ── */
    const fw = await toFarm(W);
    const fd = await toFarm(D);
    rec.ok('both phones on the farm (guard)', fw && fw.zone === 'farm_home' && fd && fd.zone === 'farm_home', { fw, fd });
    if (!(fw && fw.zone === 'farm_home' && fd && fd.zone === 'farm_home')) return;
    const B0 = FARM_BEDS[0], B1 = FARM_BEDS[1];
    await H.hopTo(D, B0.x + B0.w / 2, B0.y - 16 - FOOT_DY, { step: 80, gap: 220, tries: 60 });
    await H.hopTo(W, B0.x + B0.w / 2 - 90, B0.y - 40 - FOOT_DY, { step: 80, gap: 220, tries: 60 });
    const peerOf = (id) => W.page.evaluate((id) => {
      const o = ((window._gameState.current || {}).others || {})[id];
      return o ? { zone: o.zone || o.z, x: o.x, y: o.y, skin: o.skin || null, pants: o.pants || null, shoes: o.shoes || null, legs: (o.equip || {}).legs || null } : null;
    }, id);
    const seen = await until(W, () => peerOf(dId), (v) => !!v && v.zone === 'farm_home', 15000);
    rec.ok('Watcher sees Digger on the farm (guard)', !!seen && seen.zone === 'farm_home', seen);
    await until(D, () => D.page.evaluate(() => (window.__btFarmWalk() || {}).near), (n) => n && n.i === 0 && n.step === 'dig', 8000);
    /* Digger's figure in his colours is made by Watcher's screen the first
       time it is wanted; the first step can go to that (his walking body
       stands meanwhile) -- so one step first, then the one measured */
    await D.page.keyboard.press('e');
    await D.page.waitForTimeout(2600);
    await H.hopTo(D, B1.x + B1.w / 2, B1.y - 16 - FOOT_DY, { step: 80, gap: 220, tries: 60 });
    await until(D, () => D.page.evaluate(() => (window.__btFarmWalk() || {}).near), (n) => n && n.i === 1 && n.step === 'dig', 8000);
    await W.page.evaluate(() => {
      window.__qaSounds = [];
      const A = window.BT_AUDIO;
      if (A && !A.__qaWrapped) {
        const orig = A.play.bind(A);
        A.play = (k, o) => { window.__qaSounds.push({ k, vol: o && o.vol, at: Date.now() }); return orig(k, o); };
        A.__qaWrapped = true;
      }
    });

    /* ── 1-5: the dig on bed 1, watched ── */
    const [view] = await Promise.all([watch(dId, 3200), (async () => {
      await D.page.waitForTimeout(150);
      await D.page.keyboard.press('e');
      /* a picture of him mid-swing on Watcher's screen */
      await W.page.waitForTimeout(700);
      await W.page.screenshot({ path: join(OUT, 'farmpeer-swing.png') }).catch(() => {});
    })()]);
    const on = view.filter((v) => v.farmer && v.farmer.on);
    const codes = [...new Set(view.map((v) => v.ex).filter(Boolean))];
    console.log(`    Watcher's view, t:ex:frame:body: ${view.filter((_, i) => i % 3 === 0).map((v) => `${v.t}:${v.ex ? v.ex.slice(5) : '-'}:${v.farmer && v.farmer.on ? v.farmer.frame : '-'}:${v.body ? 'B' : '-'}`).join(' ')}`);
    rec.ok(`the step comes off the wire as Digger's \`ex\`: ${codes.join(', ')}`, codes.some((c) => /^farm:dig:\d+$/.test(c)), codes);
    const frames = on.map((v) => v.farmer.frame);
    /* the frames this box draws are few (a phone draws every one): the swing
       seen moving and from its start is what can be asked */
    rec.ok(`Watcher draws Digger's farmer with the hoe, through the swing (${frames.length} frames drawn, ${new Set(frames).size} of the hoe's 8, the first ${frames[0]})`,
      on.length >= 2 && on.every((v) => v.farmer.anim === 'hoe') && new Set(frames).size >= 2 && frames[0] <= 2, { frames });
    rec.ok('...and his walking body is put away whenever the farmer is drawn', on.length > 0 && on.every((v) => v.body === false), on.map((v) => [v.t, v.body]));
    /* where the strip's foot point is DRAWN -- off the frame's own box as
       drawn, its anchor counted (the first cut placed the anchor right and
       drew the figure half a body right of it and a whole body below) --
       against his place and his boots */
    const atBoots = on.map((v) => {
      const A = FARM_ANIMS.hoe;
      const d = v.farmer.drawn, s = v.farmer.scaleY;
      const fx = d.midX + (A.foot[0] - A.fw / 2) * s;
      const fy = d.bottom - (A.fh - A.foot[1]) * s;
      return [+(fx - v.ox).toFixed(1), +(fy - (v.oy + v.groundDy)).toFixed(1)];
    });
    rec.ok(`...drawn at his boots: the strip's foot point ${atBoots.slice(0, 3).map((a) => '(' + a.join(', ') + ')').join(' ')} px from them`,
      atBoots.length > 0 && atBoots.every(([dx, dy]) => Math.abs(dx) < 3 && Math.abs(dy) < 3), atBoots);
    const f0 = on[0] && on[0].farmer;
    rec.ok('...in HIS colours: a figure baked for them, not Watcher\'s own; the body cut for greaves', !!f0 && f0.shared === false && f0.under === true && f0.figures >= 1, f0);
    const dressed = on.filter((v) => v.farmer.order.legs > v.farmer.order.body && v.farmer.order.shirt > v.farmer.order.legs
      && v.farmer.order.prop > v.farmer.order.shirt && v.farmer.order.hat > v.farmer.order.prop);
    const copper = await D.page.evaluate(() => {
      const t = window.__btGearTints ? window.__btGearTints() : null;
      const r = t && t.slots.find((x) => x.slot === 'legs');
      return r ? r.tint : null;
    });
    rec.ok(`...dressed as he is: his greaves (in his copper, ${copper}), his tee over them, the hoe over both, his cap on top`,
      on.length > 0 && dressed.length === on.length && on.every((v) => v.farmer.tints.legs === copper), on.slice(0, 3).map((v) => [v.farmer.order, v.farmer.tints]));
    const sounds = await W.page.evaluate(() => (window.__qaSounds || []).filter((s) => s.k === 'footstep-v3'));
    rec.ok(`the hoe is heard where it strikes on Watcher's screen (${sounds.length} strike${sounds.length === 1 ? '' : 's'}, at ${sounds.map((s) => s.vol && s.vol.toFixed(2)).join(', ')})`,
      sounds.length >= 1 && sounds.every((s) => s.vol > 0 && s.vol <= 0.55), sounds);
    const last = view[view.length - 1];
    rec.ok('when the step ends his walking body is back and the farmer gone', !!last && !last.ex && last.body === true && !(last.farmer && last.farmer.on), last);
    const heldTheirs = await W.page.evaluate(() => (window.__btPeerFarmFigs ? window.__btPeerFarmFigs() : -1));

    /* ── 6. in Watcher's colours, no greaves: Watcher's own farmer ── */
    const look = await W.page.evaluate(() => ({ skin: localStorage.getItem('bt-skin') || 'default', pants: localStorage.getItem('bt-pants') || 'default', shoes: localStorage.getItem('bt-shoes') || 'default' }));
    await D.page.evaluate((look) => {
      window.__btSetSkin(look.skin); window.__btSetPants(look.pants); window.__btSetShoes(look.shoes);
      window.__btSetGear('legs', 'none');
    }, look);
    const B2 = FARM_BEDS[2];
    await H.hopTo(D, B2.x + B2.w / 2, B2.y - 16 - FOOT_DY, { step: 80, gap: 220, tries: 60 });
    const sameLook = await until(W, () => peerOf(dId),
      (v) => !!v && (v.skin || 'default') === look.skin && (v.pants || 'default') === look.pants && (v.shoes || 'default') === look.shoes && (!v.legs || v.legs === 'none'), 15000);
    await until(D, () => D.page.evaluate(() => (window.__btFarmWalk() || {}).near), (n) => n && n.i === 2 && n.step === 'dig', 8000);
    const [view2] = await Promise.all([watch(dId, 2400), (async () => { await D.page.waitForTimeout(150); await D.page.keyboard.press('e'); })()]);
    const on2 = view2.filter((v) => v.farmer && v.farmer.on);
    rec.ok(`Digger in Watcher's colours and no greaves: his farmer drawn from Watcher's own (${on2.length} frames drawn)`,
      !!sameLook && on2.length >= 2 && on2.every((v) => v.farmer.shared === true && v.farmer.under === false), { sameLook, frames: on2.slice(0, 3).map((v) => v.farmer) });

    /* ── 7. back in his own colours for one more step, then Watcher leaves
       while the figure baked for them is held: everything let go of ── */
    await D.page.evaluate(() => { window.__btSetSkin('deep'); window.__btSetPants('blue'); window.__btSetShoes('red'); });
    const B3 = FARM_BEDS[3];
    await H.hopTo(D, B3.x + B3.w / 2, B3.y - 16 - FOOT_DY, { step: 80, gap: 220, tries: 60 });
    await until(W, () => peerOf(dId), (v) => !!v && v.skin === 'deep' && v.pants === 'blue', 15000);
    await until(D, () => D.page.evaluate(() => (window.__btFarmWalk() || {}).near), (n) => n && n.i === 3 && n.step === 'dig', 8000);
    const [view3] = await Promise.all([watch(dId, 2400), (async () => { await D.page.waitForTimeout(150); await D.page.keyboard.press('e'); })()]);
    const on3 = view3.filter((v) => v.farmer && v.farmer.on);
    rec.ok(`back in his own colours, his farmer is baked for them again (${on3.length} frames drawn, figures held ${heldTheirs} after the first)`,
      heldTheirs >= 1 && on3.length >= 1 && on3.every((v) => v.farmer.shared === false), { heldTheirs, frames: on3.slice(0, 2).map((v) => v.farmer) });
    const held = await W.page.evaluate(() => (window.__btPeerFarmFigs ? window.__btPeerFarmFigs() : -1));
    await H.hopTo(W, FARM_GATE.x, 1376 - FOOT_DY, { step: 80, gap: 220, tries: 80 });
    const left = await until(W, () => H.readState(W, (S) => S.currentZone), (z) => z && z !== 'farm_home', 20000);
    await W.page.waitForTimeout(800);
    const after = await W.page.evaluate(() => ({ farmers: window.__btPeerFarmers ? Object.keys(window.__btPeerFarmers()).length : -1,
      figures: window.__btPeerFarmFigs ? window.__btPeerFarmFigs() : -1 }));
    rec.ok(`Watcher out through the gate (${left}): no farmer of Digger's kept (${after.farmers}), the figures baked for him let go of (${held} -> ${after.figures})`,
      !!left && left !== 'farm_home' && after.farmers === 0 && held >= 1 && after.figures === 0, { left, after, held });
  } finally {
    stopAlive = true;
    rec.ok('no page errors on Watcher', errors.W.length === 0, errors.W.slice(0, 4));
    rec.ok('no page errors on Digger', errors.D.length === 0, errors.D.slice(0, 4));
    await W.ctx.close().catch(() => {});
    await D.ctx.close().catch(() => {});
  }
}
