/* ═══ THE FARMER'S OWN MOVES, ON A PHONE (v2.3.3402) ═══
 *
 * The owner, 2026-10-17: "I'd like to have animations during the farming
 * process perhaps on a sprite sheet."  They made three in ChatGPT -- the hoe,
 * the watering can, and kneeling with his hands in the soil -- and
 * tools/make_farm_anims.py cut them into the game's strips.
 *
 * On a phone (390 x 844, 3x), a bro dressed before he exists -- deep skin, a
 * blonde flat-top under a red cap, a blonde beard, a green tee, BLUE trousers
 * and RED boots -- goes to his farm and works bed 0 through every step:
 *   1. the farmer's moves are made behind the farm's loading screen (the
 *      'farm' pose ready when it lifts), in HIS colours: the bake's own
 *      reading of each strip is his deep skin, blue legs and red boots;
 *   2. each step plays its own -- dig the hoe, plant the kneel, water the can,
 *      feed the kneel -- every frame of it, held one by one: the strip's foot
 *      point on his boots, the walking body put away, his green tee over the
 *      man, the hoe or the can over both (the kneel holds nothing), in that
 *      order;
 *   3. HIS SIZE: standing with the hoe and the can he is as tall as his
 *      walking figure from head to boots, within 6%;
 *   4. each step still ends in one farm_act the worker takes;
 *   5. (v2.3.3402) IN ARMOUR, cut from the owner's dressed sheets, on bed 1:
 *      copper plate and greaves (dig, the hoe), the greaves under his green
 *      tee (plant, the kneel), the plate over his trousers (water, the can) --
 *      in each, every frame: the garments he wears drawn and the others not,
 *      the tee hidden under a plate, the body under greaves the one cut for
 *      them, each garment on the body's own frame, in the order body,
 *      greaves, shirt, plate, tool, and in the metal his walking figure wears;
 *   6. leaving through the gate lets all of it go: the 'farm' pose idle again,
 *      the three strips, the two tools and the nine garments no longer on the
 *      graphics chip;
 *   7. no page errors.
 * Pictures: tools/qa/mp/out/farmanim-<step>-<frame>.png, one a frame, and
 * farmanim-armour-<step>-<frame>.png for the armour.
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FARM_BEDS, FARM_GATE } from '../../../src/data/farmLayout.js';
import { FARM_ANIMS } from '../../../src/data/farmAnims.js';
import { FARM_STEP_ANIM, FARM_ANIM_TURN, FARM_WORK_MS } from '../../../src/game/farmWork.js';

const PHONE = { width: 390, height: 844 };
const FOOT_DY = 52;   /* a body's middle to its boots on the farm (no perspective) */
const WALK_H = 105.7; /* the walking figure, top of the head to the boots, world px (CHOP_STANDIN_H's note) */

const LOOK = `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle',
    'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  localStorage.setItem('bt-skin', 'deep');
  localStorage.setItem('bt-hair', 'flat-top');
  localStorage.setItem('bt-haircolor', 'blonde');
  localStorage.setItem('bt-headwear', 'red-cap');
  localStorage.setItem('bt-facialhair', 'beard');
  localStorage.setItem('bt-beardcolor', 'blonde');
  localStorage.setItem('bt-shirt', 'tshirt');
  localStorage.setItem('bt-shirtcolor', 'green');
  localStorage.setItem('bt-pants', 'blue');
  localStorage.setItem('bt-shoes', 'red');
} catch (e) {}`;

/* the ms into a step of `total` at which the step shows `frame` of its first
   turn, at the frame's middle (farmWork.js farmWorkFrame's arithmetic) */
function frameMid(step, frame, total) {
  const turn = FARM_ANIM_TURN[FARM_STEP_ANIM[step]];
  const T = turn.reduce((a, b) => a + b, 0);
  const n = Math.max(1, Math.round(total / T));
  const k = (n * T) / total;
  let at = 0;
  for (let f = 0; f < frame; f++) at += turn[f];
  return (at + turn[frame] / 2) / k;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Hoebro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', init: LOOK });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();
  const until = async (fn, pred, ms = 8000) => {
    let v = null;
    for (let t0 = Date.now(); Date.now() - t0 < ms;) { v = await fn(); if (pred(v)) return v; await P.page.waitForTimeout(150); }
    return v;
  };
  const fig = () => P.page.evaluate(() => ({ fig: window.__btFarmFigure ? window.__btFarmFigure() : null, body: !!window._gameState.current._standInBody,
    work: window.__btFarmWalk ? (window.__btFarmWalk() || {}).work : null,
    made: window.__btStandIns ? (window.__btStandIns().farm || {}).state : null }));
  /* a picture round the farmer, 170 x 190 CSS px over his boots */
  const shot = async (name, f) => {
    const c = await P.page.evaluate((f) => {
      const S = window._gameState.current;
      const r = document.querySelector('canvas').getBoundingClientRect();
      return { x: r.left + (f.foot.x - S.camera.x) * (S._worldScaleX || 1), y: r.top + (f.foot.y - S.camera.y) * (S._worldScaleY || 1) };
    }, f);
    const W = 170, Hh = 190;
    const clip = { x: Math.max(0, Math.min(PHONE.width - W, Math.round(c.x - W / 2))), y: Math.max(0, Math.min(PHONE.height - Hh, Math.round(c.y - 150))), width: W, height: Hh };
    await P.page.screenshot({ path: join(OUT, `farmanim-${name}.png`), clip }).catch(() => {});
  };
  const report = { steps: {} };
  try {
    await H.enterWorld(P);
    const wa = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the Wheel' }).catch(() => null);
    rec.ok('the player is in the Wheel (guard)', !!wa, wa);
    if (!wa) return;
    const id = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'quests', id);
    await H.devOp(wsPort, 'vitals', id, { god: true, godMinutes: 30 });
    await P.page.evaluate(() => { setInterval(() => { const S = window._gameState && window._gameState.current; if (S) S._isDesktop = false; }, 120); });
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    await P.page.evaluate(() => {
      window.__farmActs = [];
      const S = window._gameState.current;
      const orig = S.channel.send.bind(S.channel);
      S.channel.send = (m) => { if (m && m.type === 'farm_act') window.__farmActs.push(JSON.parse(JSON.stringify(m.payload))); return orig(m); };
    });
    const acts = () => P.page.evaluate(() => window.__farmActs.slice());
    const bag = () => H.readState(P, (S) => Object.assign({}, S.rpg && S.rpg.inventory));
    const buy = async (item, n) => {
      await until(() => P.page.evaluate(() => !(window.__btFarm && window.__btFarm.pending)), (v) => v, 6000);
      await P.page.evaluate(({ item, n }) => window.__btFarm.buy(window._gameState.current, item, n), { item, n });
      return until(bag, (b) => (b[item] || 0) >= n, 8000);
    };
    await buy('seed_carrot', 2);
    const b0 = await buy('compost', 1);
    rec.ok(`seeds and compost from the worker (guard: ${b0.seed_carrot}, ${b0.compost})`, b0.seed_carrot >= 2 && b0.compost >= 1, b0);

    /* the walking figure's height, before the farm (world px) */
    const walkH = await until(() => P.page.evaluate(() => {
      const S = window._gameState.current;
      const r = window._pixiRenderer && window._pixiRenderer.bodyFigureProbe ? window._pixiRenderer.bodyFigureProbe() : null;
      return r && r.figurePx ? +(r.figurePx / (S._worldScaleY || 1)).toFixed(2) : null;
    }), (v) => v > 0, 4000);

    /* ── 1. onto the farm: the moves made behind its loading screen ── */
    await P.page.evaluate(() => { try { window._uiPanels.building('farm'); } catch (e) { /* the check says */ } });
    const visit = await until(() => P.page.evaluate(() => { const b = document.querySelector('[data-farm-visit]'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }), (v) => !!v, 8000);
    await P.page.touchscreen.tap(visit.x, visit.y);
    const onFarm = await until(() => H.readState(P, (S) => ({ zone: S.currentZone, hold: !!S._farmArtHold, veil: !!document.querySelector('.bt-zone-loading') })),
      (v) => v.zone === 'farm_home' && !v.hold && !v.veil, 25000);
    const made = await P.page.evaluate(() => ({ st: window.__btStandIns ? window.__btStandIns().farm : null,
      clothes: Object.assign({}, window.__btStandInClothes || {}), skin: Object.assign({}, window.__btStandInSkin || {}),
      holds: (window.__btFarmHolds || []).slice() }));
    rec.ok(`onto the farm under its loading screen, and when it lifts the farmer's moves are made (${made.st && made.st.state}, ${made.st && made.st.ms} ms)`,
      onFarm && onFarm.zone === 'farm_home' && made.st && made.st.state === 'ready' && made.holds.length >= 1 && made.holds[made.holds.length - 1].ready === true, { onFarm, made: made.st, holds: made.holds });
    const blue = (c) => !!c && c.n > 50 && c.rgb[2] > c.rgb[0] + 30 && c.rgb[2] > c.rgb[1];
    const red = (c) => !!c && c.n > 50 && c.rgb[0] > c.rgb[1] + 40 && c.rgb[0] > c.rgb[2] + 40;
    for (const a of Object.keys(FARM_ANIMS)) {
      const cl = made.clothes['farm-' + a] || {}, sk = made.skin['farm-' + a] || {};
      rec.ok(`...the ${a} in his colours: skin ${JSON.stringify(sk.rgb)} (deep), trousers ${JSON.stringify(cl.legs && cl.legs.rgb)} (blue), boots ${JSON.stringify(cl.boots && cl.boots.rgb)} (red)`,
        !!sk.rgb && sk.n > 500 && sk.rgb[0] < 150 && blue(cl.legs) && (a === 'kneel' || red(cl.boots)), { skin: sk, clothes: cl });
    }

    /* ── 2. bed 0, every step, every frame ── */
    const B0 = FARM_BEDS[0];
    await H.hopTo(P, B0.x + B0.w / 2, B0.y - 16 - FOOT_DY, { step: 80, gap: 220, tries: 60 });
    await until(() => P.page.evaluate(() => (window.__btFarmWalk() || {}).near), (n) => n && n.i === 0, 4000);
    for (const step of ['dig', 'plant', 'water', 'feed']) {
      await until(() => P.page.evaluate(() => (window.__btFarmWalk() || {}).near), (n) => n && n.i === 0 && n.step === step, 6000);
      const a0 = (await acts()).length;
      const anim = FARM_STEP_ANIM[step], A = FARM_ANIMS[anim];
      const T = FARM_WORK_MS[step];
      /* the step pinned at a frame while it is read and pictured -- from
         before E, so it is held from its first moment (a read on this box can
         outlast a whole step), and at a hundred times its length, so a
         screenshot that holds the page up (its timers and its game loop
         alike) cannot run it out: the same whole turns fill it, so the frame
         at `mid` is the same frame */
      const pinAt = (mid, f) => P.page.evaluate(({ step, mid, T, f }) => {
        clearInterval(window.__pinT);
        /* and the renderer told to draw that frame and no other while the
           picture is taken (window.__btFarmHoldFrame, effectsRenderer
           _updateFarmWork): a screenshot holds the page up long enough for
           the step's clock alone to have moved on a frame or two
           (docs/TRAPS.md §102) */
        window.__btFarmHoldFrame = f;
        const pin = () => {
          const w = window._gameState.current._farmWork;
          if (!w || w.step !== step) return;
          const n = Date.now(); w.startedAt = n - mid; w.doneAt = w.startedAt + T * 100;
        };
        pin();
        window.__pinT = setInterval(pin, 10);
      }, { step, mid, T, f });
      await pinAt(frameMid(step, 0, T), 0);
      await P.page.keyboard.press('e');
      const started = await until(fig, (v) => v.work && v.work.step === step && v.fig && v.fig.visible, 3000);
      const frames = [];
      for (let f = 0; f < A.n; f++) {
        const mid = frameMid(step, f, T);
        await pinAt(mid, f);
        const v = await until(fig, (x) => x.fig && x.fig.visible && x.fig.frame === f, 1500);
        const F = v && v.fig;
        if (F) await shot(`${step}-${f}`, F);
        const P0 = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
        frames.push({ f, ok: !!F && F.frame === f, anim: F && F.anim, foot: F && F.foot, feetY: F && F.figure.feetY, px: P0.x, work: v && v.work, made: v && v.made,
          body: v && v.body, shirt: F && F.shirt, prop: F && F.prop, order: F && F.order, crown: F && F.crown, h: F && F.figure.drawnH, headW: F && F.headW });
      }
      await P.page.evaluate(() => { clearInterval(window.__pinT); window.__btFarmHoldFrame = null; const w = window._gameState.current._farmWork; if (w) { w.startedAt = Date.now() - 50; w.doneAt = Date.now() + 120; } });
      report.steps[step] = frames;
      const allShown = frames.every((x) => x.ok && x.anim === anim);
      const onBoots = frames.every((x) => x.foot && Math.abs(x.foot.x - x.px) < 1.5 && Math.abs(x.foot.y - x.feetY) < 1.5);
      const dressed = frames.every((x) => x.body && x.shirt && x.shirt.visible && x.prop.visible === !!A.prop
        && x.order.body >= 0 && x.order.shirt > x.order.body && (!A.prop || x.order.prop > x.order.shirt));
      rec.ok(`${step}: the ${anim}, all ${A.n} frames shown one by one (${started ? 'started' : 'NOT started'})`, !!started && allShown, frames.map((x) => x.f + ':' + x.anim + ':' + x.ok).join(' '));
      rec.ok(`...his boots on yours in every frame, the walking body put away`, onBoots && frames.every((x) => x.body), frames.map((x) => x.foot && [+(x.foot.x - x.px).toFixed(2), +(x.foot.y - x.feetY).toFixed(2)]));
      rec.ok(`...your green tee over him${A.prop ? ', the ' + anim + "'s tool over both" : ', his hands empty'} (body ${frames[0].order && frames[0].order.body}, shirt ${frames[0].order && frames[0].order.shirt}, tool ${frames[0].order && frames[0].order.prop})`,
        dressed, frames.map((x) => ({ f: x.f, shirt: x.shirt, prop: x.prop, order: x.order })));
      if (anim === 'hoe' || anim === 'water') {
        /* standing (the rest frame): crown to boots in world px, against yours */
        const rest = frames[0];
        const top = rest.crown ? rest.crown.y : null;
        const hFig = top != null ? rest.feetY - top : null;
        const ref = walkH > 0 ? walkH : WALK_H;
        report.steps[step + '-height'] = { hFig, ref, walkH };
        rec.ok(`...standing with the ${anim} he is your height: ${hFig && hFig.toFixed(1)} world px from the top of his head to his boots, yours ${ref.toFixed ? ref.toFixed(1) : ref} (${hFig && Math.round(hFig / ref * 100)}%)`,
          hFig != null && Math.abs(hFig / ref - 1) <= 0.08, { hFig, ref });
      }
      const sent = await until(acts, (l) => l.length > a0, 6000);
      rec.ok(`...and the step ends in ONE farm_act the worker takes (${JSON.stringify(sent.slice(a0))})`,
        sent.length - a0 === 1 && sent[a0].op === step && JSON.stringify(sent[a0].beds) === '[0]', sent.slice(a0));
      await P.page.waitForTimeout(700);
    }

    /* ── 5. v2.3.3402: in armour, on bed 1 ── */
    const B1 = FARM_BEDS[1];
    const OUTFITS = [
      { step: 'dig', chest: 'copperplate', legs: 'coppergreaves', label: 'copper plate and greaves' },
      { step: 'plant', chest: 'none', legs: 'coppergreaves', label: 'copper greaves under his green tee' },
      { step: 'water', chest: 'copperplate', legs: 'none', label: 'the copper plate over his trousers' },
    ];
    report.armour = {};
    for (const o of OUTFITS) {
      await P.page.evaluate(({ c, l }) => { window.__btSetGear('chest', c); window.__btSetGear('legs', l); }, { c: o.chest, l: o.legs });
      const wantUnder = o.legs !== 'none';
      /* the body under greaves is baked again as they go on or come off */
      const baked = await until(() => P.page.evaluate(() => (window.__btFarmFigure ? window.__btFarmFigure().under : null)), (u) => u === wantUnder, 8000);
      await P.page.waitForTimeout(400);
      /* the metal his walking figure wears, read off its own layers */
      const walk = await P.page.evaluate(() => {
        const t = window.__btGearTints ? window.__btGearTints() : null;
        const of = (slot) => { const r = t && t.slots.find((x) => x.slot === slot); return r && r.visible ? r.tint : null; };
        return { chest: of('chest'), legs: of('legs') };
      });
      await H.hopTo(P, B1.x + B1.w / 2, B1.y - 16 - FOOT_DY, { step: 80, gap: 220, tries: 60 });
      const near = await until(() => P.page.evaluate(() => (window.__btFarmWalk() || {}).near), (n) => n && n.i === 1 && n.step === o.step, 6000);
      const a0 = (await acts()).length;
      const anim = FARM_STEP_ANIM[o.step], A = FARM_ANIMS[anim];
      const T = FARM_WORK_MS[o.step];
      const pinAt = (mid, f) => P.page.evaluate(({ step, mid, T, f }) => {
        clearInterval(window.__pinT);
        window.__btFarmHoldFrame = f;
        const pin = () => {
          const w = window._gameState.current._farmWork;
          if (!w || w.step !== step) return;
          const n = Date.now(); w.startedAt = n - mid; w.doneAt = w.startedAt + T * 100;
        };
        pin();
        window.__pinT = setInterval(pin, 10);
      }, { step: o.step, mid, T, f });
      await pinAt(frameMid(o.step, 0, T), 0);
      await P.page.keyboard.press('e');
      const started = await until(fig, (v) => v.work && v.work.step === o.step && v.fig && v.fig.visible, 3000);
      const frames = [];
      for (let f = 0; f < A.n; f++) {
        await pinAt(frameMid(o.step, f, T), f);
        const v = await until(fig, (x) => x.fig && x.fig.visible && x.fig.frame === f, 1500);
        const F = v && v.fig;
        if (F) await shot(`armour-${o.step}-${f}`, F);
        frames.push({ f, ok: !!F && F.frame === f && F.anim === anim, under: F && F.under, legs: F && F.legs, chest: F && F.chest, shirt: F && F.shirt,
          prop: F && F.prop, order: F && F.order });
      }
      await P.page.evaluate(() => { clearInterval(window.__pinT); window.__btFarmHoldFrame = null; const w = window._gameState.current._farmWork; if (w) { w.startedAt = Date.now() - 50; w.doneAt = Date.now() + 120; } });
      report.armour[o.step] = { outfit: o, walk, frames };
      const wearsChest = o.chest !== 'none', wearsLegs = o.legs !== 'none';
      rec.ok(`in ${o.label}: the ${anim}, all ${A.n} frames (${started ? 'started' : 'NOT started'}; at the bed ${!!near}), on the body ${wantUnder ? 'cut for greaves' : 'in his trousers'} (${baked})`,
        !!started && frames.every((x) => x.ok && x.under === wantUnder), frames.map((x) => x.f + ':' + x.ok + ':' + x.under).join(' '));
      const layersOk = (x) => x.legs && x.chest && x.shirt && x.legs.visible === wearsLegs && x.chest.visible === wearsChest
        && x.shirt.visible === !wearsChest && x.prop.visible === !!A.prop
        && (!wearsLegs || x.legs.frame === x.f) && (!wearsChest || x.chest.frame === x.f);
      rec.ok(`...${[wearsLegs && 'the greaves', !wearsChest && 'the tee', wearsChest && 'the plate'].filter(Boolean).join(', ')} drawn${wearsChest ? ' (the tee hidden under the plate)' : ''}, each on the body's own frame`,
        frames.every(layersOk), frames.map((x) => ({ f: x.f, legs: x.legs, chest: x.chest, shirt: x.shirt && x.shirt.visible })));
      const seq = (x) => ['body', 'legs', 'shirt', 'chest', 'prop'].map((k) => x.order[k]).filter((i) => i >= 0);
      rec.ok(`...in the order body, greaves, shirt, plate, tool (${JSON.stringify(frames[0].order)})`,
        frames.every((x) => x.order && x.order.body >= 0 && seq(x).every((i, j, a) => j === 0 || i > a[j - 1])), frames.map((x) => x.order));
      const metalOk = (x) => (!wearsLegs || (x.legs.tint === walk.legs && walk.legs !== 0xffffff))
        && (!wearsChest || (x.chest.tint === walk.chest && walk.chest !== 0xffffff));
      rec.ok(`...in the copper his walking figure wears (greaves ${walk.legs}, plate ${walk.chest})`, frames.every(metalOk),
        { walk, got: frames.map((x) => ({ legs: x.legs && x.legs.tint, chest: x.chest && x.chest.tint })) });
      const sent = await until(acts, (l) => l.length > a0, 6000);
      rec.ok(`...and the step ends in ONE farm_act the worker takes (${JSON.stringify(sent.slice(a0))})`,
        sent.length - a0 === 1 && sent[a0].op === o.step && JSON.stringify(sent[a0].beds) === '[1]', sent.slice(a0));
      await P.page.waitForTimeout(700);
    }
    await P.page.evaluate(() => { window.__btSetGear('chest', 'none'); window.__btSetGear('legs', 'none'); });

    /* ── 6. leaving lets it all go ── */
    const gpuBefore = await P.page.evaluate(() => (window.__btGpuTex ? window.__btGpuTex(400) : null));
    const farmTex = (g) => !g ? null : (g.list || g.top || []).filter((t) => /farm-(hoe|water|kneel)|farmhoe|farmwater|farmkneel/.test(String(t.label || t.url || t.src || ''))).length;
    await H.hopTo(P, FARM_GATE.x, 1376 - FOOT_DY, { step: 80, gap: 220, tries: 80 });
    const left = await until(() => H.readState(P, (S) => S.currentZone), (z) => z && z !== 'farm_home', 20000);
    await P.page.waitForTimeout(1500);
    const after = await P.page.evaluate(() => ({ st: window.__btStandIns ? window.__btStandIns().farm : null }));
    const gpuAfter = await P.page.evaluate(() => (window.__btGpuTex ? window.__btGpuTex(400) : null));
    report.gpu = { before: farmTex(gpuBefore), after: farmTex(gpuAfter) };
    rec.ok(`leaving the farm (to ${left}) lets the farmer's moves go: the pose ${after.st && after.st.state}, his textures on the graphics chip ${report.gpu.before} -> ${report.gpu.after}`,
      left && left !== 'farm_home' && after.st && after.st.state === 'idle' && (report.gpu.after === null || report.gpu.after === 0), { after, gpu: report.gpu });
    rec.ok(`no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  } finally {
    stopAlive = true;
    writeFileSync(join(OUT, 'farmanim.json'), JSON.stringify(report, null, 2));
    await P.ctx.close().catch(() => {});
  }
}
