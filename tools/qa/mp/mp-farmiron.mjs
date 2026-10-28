/* ═══ v2.3.3636: THE FARMER'S IRON IS THE WALKING IRON ═══
 *
 * The owner's list of 2026-10-26: "The armor while performing farming
 * gestures is noticeably different color (iron). Try to make it match more
 * exactly."  Then, 2026-10-28: "As part of the farming animations I think
 * either the watering, planting, or fertilizing the armor styles didn't match
 * (different shades of gray for iron armor) possibly wrong shades for copper
 * armor too".
 *
 * v2.3.3472 graded the farmer's plate and greaves to the walking sheets' greys
 * and gave them the same metal tint and shine; v2.3.3636 lit them with the
 * walking figure's form shade at the world's heights.  v2.3.3697 fits that
 * shade to his own crown and boots (kneeling, his plate took a standing
 * figure's thighs' cooler shade), and lays the metal's shine across a walking
 * body's frame where he works (it fell back to the farm frames, two to three
 * times the figure).
 *
 * Measured as a player sees it, on a phone, on the farm, in each OUTFIT (a
 * full iron set, a full copper set): the walking figure standing by bed 0,
 * then the farmer at the same spot in each MOVE -- the hoe, the can, the
 * kneel that plants, composts and harvests -- at FRAMES of it, each held.
 * Every piece is pictured ALONE (every other piece of the figure and the
 * world not rendered), the plate and then the greaves, and its pixels (not
 * the canvas's colour, not its darkest outline) read: the median colour,
 * farmer over walker, every channel within FIT_PIECE; and the farmer carries
 * the walking figure's own shade at his boots and crown (the probe).
 *
 *   node tools/qa/mp/run.mjs farmiron
 *   BT_FARMIRON_SHADE=0     ?shade=0 (no form shading anywhere)
 *   BT_FARMIRON_QUERY=x     adds x to the address (sheen=0: the metal's shine off)
 *   BT_FARMIRON_OUTFITS=iron,copper  BT_FARMIRON_MOVES=dig,water,plant
 *   BT_FARMIRON_FRAMES=0,2,4,6
 * Pictures: tools/qa/mp/out/farmiron-<outfit>-<step>-<frame>-<piece>.png and
 * farmiron-walk-<outfit>-<piece>.png; numbers in farmiron.json.
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FARM_BEDS } from '../../../src/data/farmLayout.js';
import { FARM_STEP_ANIM, FARM_ANIM_TURN, FARM_WORK_MS } from '../../../src/game/farmWork.js';

const PHONE = { width: 390, height: 844 };
const FOOT_DY = 52;   /* a body's middle to its boots on the farm (mp-farmanim) */
/* v2.3.3697: what is pictured -- each outfit, each move, these frames of it */
const OUTFITS = [
  { id: 'iron', chest: 'ironplate', legs: 'irongreaves' },
  { id: 'copper', chest: 'copperplate', legs: 'coppergreaves' },
].filter((o) => !process.env.BT_FARMIRON_OUTFITS || process.env.BT_FARMIRON_OUTFITS.split(',').includes(o.id));
const MOVES = [
  { step: 'dig', what: 'with the hoe' },
  { step: 'water', what: 'with the can' },
  { step: 'plant', what: 'kneeling (plant, compost, harvest)' },
].filter((m) => !process.env.BT_FARMIRON_MOVES || process.env.BT_FARMIRON_MOVES.split(',').includes(m.step));
const FRAMES = (process.env.BT_FARMIRON_FRAMES || '0,2,4,6').split(',').map(Number);
/* each piece's median colour, farmer over walker, every channel, within
   FIT_PIECE; a piece of fewer than SMALL_PX pixels within FIT_SMALL (the
   kneel's frame 2 shows only the greaves' knee tips, ~240 px, in the shade
   the art draws under him) */
const FIT_PIECE = 0.10, FIT_SMALL = 0.25, SMALL_PX = 300;
/* the plate's brightest tenth (its metal's light), farmer over walker, at
   least BRIGHT_MIN in every move: kneeling it was 0.86-0.92 in both metals
   before v2.3.3697 (main's build fails here) -- the standing figure's
   thighs' shade on his plate -- and is 0.905-0.996 now; the hoe and the can
   raise his arms into the light, so it may be brighter */
const BRIGHT_MIN = 0.90;

const LOOK = `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle',
    'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  localStorage.setItem('bt-skin', 'deep');
  localStorage.setItem('bt-hair', 'flat-top');
  localStorage.setItem('bt-haircolor', 'blonde');
  localStorage.setItem('bt-headwear', 'red-cap');
} catch (e) {}`;

/* the ms into a step at which it shows `frame` of its first turn (mp-farmanim) */
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
  const shadeOff = process.env.BT_FARMIRON_SHADE === '0';
  const P = await H.newPlayer(browser, { name: 'Ironbro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel', init: LOOK,
    query: [shadeOff ? 'shade=0' : '', process.env.BT_FARMIRON_QUERY || ''].filter(Boolean).join('&') || undefined });
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
  /* a picture round the boots, 120 x 150 CSS px over them */
  const shot = async (name, feet) => {
    const c = await P.page.evaluate((f) => {
      const S = window._gameState.current;
      const r = document.querySelector('canvas').getBoundingClientRect();
      return { x: r.left + (f.x - S.camera.x) * (S._worldScaleX || 1), y: r.top + (f.y - S.camera.y) * (S._worldScaleY || 1) };
    }, feet);
    const W = 120, Hh = 150;
    const clip = { x: Math.max(0, Math.round(c.x - W / 2)), y: Math.max(0, Math.round(c.y - 125)), width: W, height: Hh };
    const file = join(OUT, `farmiron-${name}.png`);
    await P.page.screenshot({ path: file, clip });
    return { file, clip, at: c };
  };
  const report = {};
  try {
    await H.enterWorld(P);
    const wa = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the world' }).catch(() => null);
    rec.ok('the player is in the world (guard)', !!wa, wa);
    if (!wa) return;
    const id = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'quests', id);
    await H.devOp(wsPort, 'vitals', id, { god: true, godMinutes: 30 });
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    await P.page.evaluate(() => { window.__btGearSet('shirt', 'none'); window.__btGearSet('chest', 'ironplate'); window.__btGearSet('legs', 'irongreaves'); });

    /* onto the farm */
    await P.page.evaluate(() => { try { window._uiPanels.building('farm'); } catch (e) { /* the check says */ } });
    const visit = await until(() => P.page.evaluate(() => { const b = document.querySelector('[data-farm-visit]'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }), (v) => !!v, 8000);
    if (visit) await P.page.touchscreen.tap(visit.x, visit.y);
    const onFarm = await until(() => H.readState(P, (S) => ({ zone: S.currentZone, hold: !!S._farmArtHold, veil: !!document.querySelector('.bt-zone-loading') })),
      (v) => v.zone === 'farm_home' && !v.hold && !v.veil, 25000);
    rec.ok('onto the farm in a full iron set (guard)', !!onFarm && onFarm.zone === 'farm_home', onFarm);
    if (!onFarm || onFarm.zone !== 'farm_home') return;
    const B0 = FARM_BEDS[0];
    await H.hopTo(P, B0.x + B0.w / 2, B0.y - 16 - FOOT_DY, { step: 80, gap: 220, tries: 60 });
    await until(() => P.page.evaluate(() => (window.__btFarmWalk() || {}).near), (n) => n && n.i === 0 && n.step === 'dig', 6000);
    await P.page.waitForTimeout(1500);

    /* ── v2.3.3697: every move, in iron and in copper, piece by piece ──
       The owner, 2026-10-28: "As part of the farming animations I think either
       the watering, planting, or fertilizing the armor styles didn't match
       (different shades of gray for iron armor) possibly wrong shades for
       copper armor too".  v2.3.3636 measured the hoe's rest frame alone, the
       whole figure in three bands (the skin and the cap kept out by their
       colour, which copper shares).  Now each outfit's walking plate and
       greaves are pictured ALONE (every other piece of the figure hidden),
       then the farmer's at the same spot in each move -- the hoe, the can, the
       kneel that plants, composts and harvests -- at FRAMES of it, held; each
       piece's median colour, and its upper and lower halves', farmer over
       walker. */
    /* every world layer's children hidden but one armour piece: the walker's
       `part` (its own sprite in the figure, every other piece of the figure
       hidden) or the farmer's; `null` puts them all back */
    const isolatePiece = (which, part) => P.page.evaluate(({ which, part }) => {
      const R = window._pixiRenderer;
      const world = R && R.app && R.app.stage.children.find((c) => c.label === 'world');
      if (!world) return false;
      if (!which) {
        for (const c of (window.__isoWas || [])) c.renderable = true;
        window.__isoWas = null;
        return true;
      }
      const me = R.playerDisplayRaw();
      const was = window.__isoWas || [];
      /* `renderable`, never `visible`: the renderers set each figure's
         sprites visible every frame, and nothing in the game sets renderable.
         Called again just before the picture is taken, it hides what was
         added since (a planting's seeds and soil fly from his hands on its
         beat): each hidden once, so the restore puts every one back */
      const hide = (c) => { if (c.renderable === false) return; was.push(c); c.renderable = false; };
      let keep = null;
      if (which === 'walk') {
        keep = me && (part === 'chest' ? me._gearChest : me._gearLegs);
      } else {
        const label = part === 'chest' ? 'farmChest' : 'farmLegs';
        for (const layer of world.children) for (const c of layer.children || []) if (c.label === label) keep = c;
      }
      const up = new Set();
      for (let n = keep; n; n = n.parent) up.add(n);
      /* every other layer whole, so nothing added to it shows; in the kept
         piece's own layer and figure, everything but its line */
      for (const layer of world.children) if (!up.has(layer)) hide(layer);
      const down = (n) => { for (const ch of n.children || []) { if (ch === keep) continue; if (up.has(ch)) down(ch); else hide(ch); } };
      for (const layer of world.children) if (up.has(layer)) down(layer);
      window.__isoWas = was;
      return !!(keep && keep.visible);
    }, { which, part });
    /* a piece's pixels in its picture: not the canvas's own colour, not its
       darkest outline; their median r, g, b, and its upper and lower halves'
       (by the piece's own height in the picture) */
    const pieceStats = (png) => {
      const W = png.width, Hh = png.height, ch = png.channels, d = png.data;
      const px = [];
      let top = Hh, bot = -1;
      for (let y = 0; y < Hh; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * ch;
          const r = d[i], g = d[i + 1], b = d[i + 2];
          if (Math.abs(r - 13) + Math.abs(g - 11) + Math.abs(b - 24) < 18) continue;   /* CANVAS_BG */
          if (0.299 * r + 0.587 * g + 0.114 * b < 30) continue;                         /* the outline */
          px.push([y, r, g, b]);
          if (y < top) top = y;
          if (y > bot) bot = y;
        }
      }
      const med = (list, j) => { const v = list.map((p) => p[j]).sort((a, b) => a - b); return v.length ? v[v.length >> 1] : null; };
      const rgb = (list) => (list.length >= 20 ? [med(list, 1), med(list, 2), med(list, 3)] : null);
      const midY = (top + bot) / 2;
      const lum = px.map((p) => 0.299 * p[1] + 0.587 * p[2] + 0.114 * p[3]).sort((a, b) => a - b);
      const hi = lum.length >= 20 ? +lum[Math.floor(lum.length * 0.9)].toFixed(1) : null;
      return { n: px.length, all: rgb(px), upper: rgb(px.filter((p) => p[0] < midY)), lower: rgb(px.filter((p) => p[0] >= midY)), hi };
    };
    const shotPiece = async (name, which, part, feet) => {
      const ok = await isolatePiece(which, part);
      await P.page.waitForTimeout(450);
      await isolatePiece(which, part);   /* and what was added meanwhile */
      await P.page.waitForTimeout(120);
      const sh = await shot(`${name}-${part}`, feet);
      await isolatePiece(null);
      return { ok, ...pieceStats(H.decodePng(readFileSync(sh.file))) };
    };
    const ratio3 = (a, b) => (a && b ? [0, 1, 2].map((j) => +(b[j] / a[j]).toFixed(3)) : null);
    const within = (q, k) => !!q && q.every((x) => Math.abs(x - 1) <= k);
    const walkerAt = () => P.page.evaluate(() => {
      const S = window._gameState.current, d = window._pixiRenderer.playerDisplayRaw();
      const t = window.__btGearTints ? window.__btGearTints() : null;
      const of = (slot) => { const r = t && t.slots.find((x) => x.slot === slot); return r && r.visible ? r.tint : null; };
      return { pose: d && d._animPose, x: S.player.x, feetY: S.player.y + 52, chest: of('chest'), legs: of('legs') };
    });

    /* the work, held: its step's frame `frame` for as long as it is pictured,
       and never finished (no step is sent) */
    await P.page.evaluate(() => {
      const S0 = window._gameState.current;
      let cur = S0._farmWork;
      window.__farmPin = null;
      const pin = () => { const w = cur, p = window.__farmPin; if (!w || !p || w.step !== p.step) return; const n = Date.now(); w.startedAt = n - p.mid; w.doneAt = w.startedAt + p.T * 100; };
      Object.defineProperty(S0, '_farmWork', { configurable: true, enumerable: true, get() { return cur; }, set(v) { cur = v; pin(); } });
      window.__pinT = setInterval(pin, 10);
    });
    const holdWork = (step, frame) => P.page.evaluate(({ step, frame, mid, T }) => {
      const S = window._gameState.current, Pl = S.player;
      window.__farmPin = { step, mid, T };
      window.__btFarmHoldFrame = frame;
      const n = Date.now();
      S._farmWork = { bed: 0, step, crop: 'carrot', startedAt: n - mid, doneAt: n - mid + T * 100, x: Pl.x, y: Pl.y, n: 1 };
    }, { step, frame, mid: frameMid(step, frame, FARM_WORK_MS[step]), T: FARM_WORK_MS[step] });
    const letGo = () => P.page.evaluate(() => {
      window.__farmPin = null;
      window.__btFarmHoldFrame = null;
      window._gameState.current._farmWork = null;
    });

    /* the bed's first step, pressed for real: it puts you at the bed's back
       (startFarmStep), where every move below is pictured */
    await P.page.keyboard.press('e');
    const F0 = await until(() => P.page.evaluate(() => (window.__btFarmFigure ? window.__btFarmFigure() : null)), (v) => v && v.visible, 5000);
    rec.ok('the farmer works the bed (guard)', !!F0 && F0.visible, F0 && { frame: F0.frame, anim: F0.anim });
    if (!F0 || !F0.visible) return;
    await letGo();
    await P.page.waitForTimeout(600);

    /* the metal's passing sweep held off everywhere: a picture would catch it
       on one figure and not the other (the steady shine stays) */
    await P.page.evaluate(() => { if (window.__btLightFx && window.__btLightFx.glint) window.__btLightFx.glint(-1); });
    report.outfits = {};
    for (const O of OUTFITS) {
      await P.page.evaluate((o) => { window.__btGearSet('chest', o.chest); window.__btGearSet('legs', o.legs); }, O);
      await P.page.waitForTimeout(2500);
      const walk = await walkerAt();
      const wChest = await shotPiece(`walk-${O.id}`, 'walk', 'chest', { x: walk.x, y: walk.feetY });
      const wLegs = await shotPiece(`walk-${O.id}`, 'walk', 'legs', { x: walk.x, y: walk.feetY });
      rec.ok(`${O.id}: the walking figure stands by the bed, its plate and greaves pictured alone (pose ${walk.pose}; plate ${walk.chest} ${wChest.n} px, greaves ${walk.legs} ${wLegs.n} px)`,
        walk.pose === 'stand' && walk.chest != null && wChest.ok && wLegs.ok && !!wChest.all && !!wLegs.all, { walk, wChest, wLegs });
      const rows = [];
      for (const M of MOVES) {
        for (const frame of FRAMES) {
          await holdWork(M.step, frame);
          const F = await until(() => P.page.evaluate(() => (window.__btFarmFigure ? window.__btFarmFigure() : null)),
            (v) => v && v.visible && v.frame === frame && v.step === M.step, 5000);
          if (!F || !F.visible || F.frame !== frame) { rows.push({ step: M.step, frame, err: 'not drawn' }); continue; }
          await P.page.waitForTimeout(250);
          /* a piece's picture is kept only when the farmer was still on the
             frame asked for after it was taken: at a move's first frame a
             slow page's next draw could still show the last move's, and a
             picture of it (more pixels, another pose) is taken again */
          const held = () => P.page.evaluate(({ step, frame }) => {
            const f = window.__btFarmFigure ? window.__btFarmFigure() : null;
            return !!(f && f.visible && f.frame === frame && f.step === step);
          }, { step: M.step, frame });
          const steadyShot = async (part) => {
            let got = null;
            for (let k = 0; k < 3; k++) {
              got = await shotPiece(`${O.id}-${M.step}-${frame}`, 'farm', part, F.foot);
              if (await held()) { got.tries = k + 1; return got; }
              await P.page.waitForTimeout(300);
            }
            got.tries = 3;
            got.unsteady = true;
            return got;
          };
          const fChest = await steadyShot('chest');
          const fLegs = await steadyShot('legs');
          rows.push({
            step: M.step, anim: F.anim, frame,
            chest: { all: ratio3(wChest.all, fChest.all), upper: ratio3(wChest.upper, fChest.upper), lower: ratio3(wChest.lower, fChest.lower), n: fChest.n,
              hi: wChest.hi && fChest.hi ? +(fChest.hi / wChest.hi).toFixed(3) : null },
            legs: { all: ratio3(wLegs.all, fLegs.all), upper: ratio3(wLegs.upper, fLegs.upper), lower: ratio3(wLegs.lower, fLegs.lower), n: fLegs.n },
            tints: { chest: F.chest && F.chest.tint, legs: F.legs && F.legs.tint },
            tries: [fChest.tries, fLegs.tries], unsteady: !!(fChest.unsteady || fLegs.unsteady),
            shade: F.shade || null,
            /* to 0.01 at the boots; to 0.025 at the crown: a sprite's shade is
               two colours at its quad's top and bottom (formShade), and a
               colour cannot go over 1, so where his frame reaches above the
               walking frame's top (the hoe raised, a kneel's short span) the
               red channel stops at 1 there and the slope below it is a little
               shallower -- his crown up to 2% darker than the walker's */
            shadeFits: !!(F.shade && F.shade.boots && [0, 1, 2].every((j) => Math.abs(F.shade.boots[j] - F.shade.walkBoots[j]) < 0.01 && Math.abs(F.shade.crown[j] - F.shade.walkCrown[j]) < 0.025)),
          });
        }
        await letGo();
        await P.page.waitForTimeout(300);
      }
      report.outfits[O.id] = { walk, wChest, wLegs, rows };
      const fits = (part) => within(part.all, part.n < SMALL_PX ? FIT_SMALL : FIT_PIECE);
      for (const M of MOVES) {
        const mine = rows.filter((r) => r.step === M.step);
        const bad = mine.filter((r) => r.err || !fits(r.chest) || !fits(r.legs));
        const fmt = (q) => (q ? q.join('/') : '-');
        const show = mine.map((r) => (r.err ? `f${r.frame} ${r.err}` : `f${r.frame} plate ${fmt(r.chest.all)} greaves ${fmt(r.legs.all)}${r.legs.n < SMALL_PX ? ` (${r.legs.n} px)` : ''}`)).join('; ');
        rec.ok(`${O.id}: the farmer's plate and greaves ${M.what} are the walking ones' colour (farmer over walker, r/g/b, within ${Math.round(FIT_PIECE * 100)}%, a piece under ${SMALL_PX} px ${Math.round(FIT_SMALL * 100)}%): ${show}`,
          mine.length === FRAMES.length && bad.length === 0, mine);
        const dim = mine.filter((r) => r.err || !(r.chest.hi >= BRIGHT_MIN));
        rec.ok(`${O.id}: ...and the plate's metal ${M.what} is lit as the walker's: its brightest tenth at least ${BRIGHT_MIN} of his (${mine.map((r) => (r.err ? '-' : r.chest.hi)).join(', ')})`,
          mine.length === FRAMES.length && dim.length === 0, mine.map((r) => [r.frame, r.chest && r.chest.hi]));
      }
      if (!shadeOff) {
        const sh = rows.filter((r) => !r.err);
        rec.ok(`${O.id}: ...and the farmer carries the walking figure's own shade at his height in every move (${sh.filter((r) => r.shadeFits).length}/${sh.length})`,
          sh.length > 0 && sh.every((r) => r.shadeFits), sh.map((r) => [r.step, r.frame, r.shadeFits]));
      }
    }
    await P.page.evaluate(() => { clearInterval(window.__pinT); window.__btFarmHoldFrame = null; window.__farmPin = null; });
    rec.ok(`no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  } finally {
    stopAlive = true;
    writeFileSync(join(OUT, 'farmiron.json'), JSON.stringify(report, null, 2));
    await P.ctx.close().catch(() => {});
  }
}
