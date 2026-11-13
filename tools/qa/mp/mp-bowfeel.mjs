/* mp-bowfeel (v2.3.4802): THE BOW'S FEEL on a phone in the Wheel.
 *
 * The owner, 2026-11-11: "Think about the sword swing.  The bow pull back and
 * release."  The rules are server/test/bow-feel.test.mjs (the draw, the share,
 * the settle, the tired arm, the cancel, the claim through a real worker);
 * this plays the page, an upright phone with nothing chosen (the game's own
 * combat), the worker's own bow in hand --
 *   1. the feel is on (the free swing, caps.bowDraw, a bow);
 *   2. THE NOCK: a real thumb down on the right side nocks: the bow raised
 *      (the stand-in's first frame held), no line yet, the walk unchanged;
 *   3. THE DRAW GROWS: pulled back past the line it draws -- the loop's own
 *      frame read at chosen moments of the draw: the share rising, the
 *      string pulled further, the aim line longer and narrower, the walk
 *      slower, the pose drawn;
 *   4. THE SETTLE: at full draw the click (once), the line one crisp gold
 *      line (DRAWN, read off the drawer), the walk planted; past the sweet
 *      spot the arm tires (the line trembles, no longer perfect);
 *   5. THE CANCEL: slid back to the touch point and lifted -- the string let
 *      down, NOTHING SENT;
 *   6. THE LOOSE: a real half draw lifted -- its relay carries `dr` (the draw,
 *      on the page's clock), the arrow leaves at once on the release frame,
 *      the creak stopped;
 *   7. THE WORKER'S VERDICT on a real monster of the Flame Fields: a half draw
 *      and a draw just past full, each claim naming its shot (`sw`), the
 *      worker's `pw` (the share) and `pf` (the perfect draw) back on the hit;
 *   8. THE BUDGET: the feel's work a frame within a small part of
 *      held-budget's frame line (mp-swordfeel's measure);
 *   9. a computer (`wide`): the left button held draws, its release looses at
 *      the cursor with its `dr`;
 *  10. a phone with `?bowfeel=0`: today's flick bow -- no feel, a flick shoots
 *      with no `dr`;
 *  11. no page errors.
 * Times that matter are held by the page's clock in one task (TRAPS §200). */
import * as H from './harness.mjs';
import { FRAME_JS_MAX_MS, HOLD_MAX_MS } from './held-budget.mjs';

const PHONE = { width: 390, height: 844 };
const FEEL_MAX_MS = FRAME_JS_MAX_MS / 4;
const FEEL_MEAN_MS = FRAME_JS_MAX_MS / 50;

/* the incoming wire, for the worker's verdict: every message carrying a
   monster_hit, kept raw (the page's own socket, wrapped before the bundle) */
const WIRE_IN = () => {
  const W = window.WebSocket;
  window.__bfIn = [];
  class QW extends W {
    constructor(...a) {
      super(...a);
      this.addEventListener('message', (e) => {
        try { const s = typeof e.data === 'string' ? e.data : ''; if (s.indexOf('monster_hit') >= 0 && window.__bfIn.length < 400) window.__bfIn.push(s); } catch (x) { /* QA only */ }
      });
    }
  }
  window.WebSocket = QW;
};

const PAGE_TOOLS = `
  window.__bfTouch = (el, type, x, y, id) => {
    const t = new Touch({ identifier: id, target: el, clientX: x, clientY: y });
    const end = type === 'touchend' || type === 'touchcancel';
    el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: end ? [] : [t], targetTouches: end ? [] : [t], changedTouches: [t] }));
  };
  window.__bfSpin = (until) => { while (Date.now() < until) { /* the clock, not a timer */ } };
  window.__bfZone = () => { const z = document.querySelector('[data-joyzone="R"]'); if (!z) return null; const r = z.getBoundingClientRect(); return { z, x: r.left + r.width * 0.5, y: r.top + r.height * 0.45 }; };
  /* what the phone sends, by kind */
  window.__bfOut = [];
  (function () {
    const S = window._gameState.current;
    if (!S || !S.channel || S.channel.__bf) return;
    const orig = S.channel.send.bind(S.channel);
    S.channel.send = (m) => {
      try {
        const k = m && (m.event || m.type);
        if (k === 'player_projectile' || k === 'monster_damage' || k === 'player_attack') {
          const p = m.payload || {};
          window.__bfOut.push({ k, at: Date.now(), dr: p.dr, ts: p.ts, sw: p.sw, isStaff: !!p.isStaff, special: !!p.isSpecial || !!p.special, mid: p.monsterId });
        }
      } catch (e) { /* QA only */ }
      return orig(m);
    };
    S.channel.__bf = true;
  })();
  /* the incoming monster_hits that are mine */
  window.__bfHits = () => {
    const S = window._gameState.current, out = [];
    const walk = (o) => {
      if (!o || typeof o !== 'object') return;
      if (Array.isArray(o)) { for (const x of o) walk(x); return; }
      if (o.type === 'monster_hit' && o.payload && o.payload.attackerId === S.myId && !o.payload.splash) out.push({ pw: o.payload.pw, pf: o.payload.pf, mid: o.payload.monsterId });
      for (const k of Object.keys(o)) if (o[k] && typeof o[k] === 'object') walk(o[k]);
    };
    for (const s of (window.__bfIn || [])) { try { walk(JSON.parse(s)); } catch (e) { /* not JSON */ } }
    return out;
  };
`;

/* the loop's frame and then a real drawn frame (the game's frame runs first in requestAnimationFrame) */
const frameOf = (P) => P.page.evaluate(() => new Promise((res) => { requestAnimationFrame(() => requestAnimationFrame(() => res({ bf: window.__btBowFeel(), fx: window.__btBowFeelFx() }))); }));

async function armBow(P, wsPort) {
  const me = await H.readState(P, (S) => S.myId);
  const armed = await H.armWorker(P, wsPort, me, ['bow']).catch(() => []);
  await P.page.evaluate(() => { const S = window._gameState.current; S.rpg.activeSlot = 'ranged'; S.lockedTarget = null; S.autoAttack = false; });
  return { me, armed };
}

async function enter(P, rec, label) {
  await H.enterWorld(P);
  const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'in the Wheel' }).catch(() => null);
  rec.ok(label + ': in the Wheel (guard)', !!inW, inW);
  if (!inW) return false;
  await P.page.waitForTimeout(2000);
  await P.page.evaluate(PAGE_TOOLS);
  return true;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const errors = [];
  const P = await H.newPlayer(browser, { name: 'Drawbro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query: 'manual=3', init: WIRE_IN });
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stop = H.keepAlive(P);
  try {
    if (!(await enter(P, rec, 'bowfeel'))) return;
    const { me, armed } = await armBow(P, wsPort);

    /* ── 1 ── */
    const on = await H.waitFor(P, () => window.__btBowFeel(), (v) => v.on, { timeout: 15000, label: 'the bow\'s feel' }).catch(() => null);
    const one = await P.page.evaluate(() => ({ free: window.__btManual.free(), caps: window._gameState.current._serverCaps || {}, full: window.__btBowFeel().full, zone: !!window.__bfZone() }));
    rec.ok('1 the game\'s own combat, the worker\'s bow in hand, a worker that counts a draw (caps.bowDraw): the bow\'s feel is on',
      !!on && armed.includes('bow') && one.free && one.caps.bowDraw === 1 && one.full >= 215 && one.zone, { on, armed, one: { free: one.free, bowDraw: one.caps.bowDraw, full: one.full, zone: one.zone } });

    /* ── 2 ── the nock */
    const two = await P.page.evaluate(() => {
      const o = window.__bfZone(), S = window._gameState.current;
      window.__bfSpin(Date.now() + 400);
      window.__bfTouch(o.z, 'touchstart', o.x, o.y, 91);
      window.__btBowFeel.tick();
      return window.__btBowFeel();
    });
    const twoF = await frameOf(P);
    rec.ok('2 THUMB DOWN NOCKS: the arrow on the string, the bow raised (the stand-in\'s first frame held), no line yet, the walk as it was',
      two.phase === 'nock' && two.n.nock >= 1 && two.pose && two.pose.frame === 0 && two.walk === 1 && !two.creak
      && twoF.bf.phase === 'nock' && (!twoF.fx.last || twoF.fx.last.phase === 'nock' && !twoF.fx.last.line), { two, fx: twoF.fx });

    /* ── 3 ── the draw grows: pulled back (down: the arrow will go up), then the loop's frame at chosen moments */
    const three = await P.page.evaluate(() => {
      const o = window.__bfZone(), S = window._gameState.current, F = window.__btBowFeel;
      window.__bfTouch(o.z, 'touchmove', o.x, o.y + 14, 91);
      const short = F().phase;
      window.__bfTouch(o.z, 'touchmove', o.x, o.y + 44, 91);
      const drawing = F().phase, creak = F().creak;
      const full = F().full;
      const at = (ms) => { S._bf.st.drawAt = Date.now() - ms; F.tick(); const v = F(); return { phase: v.view.phase, r: +v.view.r.toFixed(2), walk: +v.walk.toFixed(2), frame: v.pose && v.pose.frame }; };
      S.swingTimer = Date.now() - 60000;   /* the last shot long ago: the bound does not cut the draw */
      return { short, drawing, creak, full, aim: S._aimAngle, a: at(Math.round(full * 0.15)), b: at(Math.round(full * 0.5)), c: at(Math.round(full * 0.9)) };
    });
    rec.ok('3 DRAG BACK TO DRAW: a roll under the pull is still a nock, past it the arrow is drawn (the creak begins), aimed AWAY from the pull (up)',
      three.short === 'nock' && three.drawing === 'drawing' && three.creak && typeof three.aim === 'number' && Math.sin(three.aim) < -0.9, three);
    rec.ok('3 ...the share grows with the draw (the worker\'s buildShare), the walk slows with it, the bow is shown drawn from a third',
      three.a.phase === 'draw' && three.b.phase === 'draw' && three.c.phase === 'draw' && three.a.r < three.b.r && three.b.r < three.c.r && Math.abs(three.b.r - 0.5) <= 0.02
      && three.a.walk > three.b.walk && three.b.walk > three.c.walk && three.c.walk < 1 && three.a.frame === 0 && three.b.frame === 1, three);
    /* drawn: the drawer's own frames at a light and a deep draw */
    /* the draw PINNED at `ms` (bowFeel.js's QA pin: this box draws a few frames a second), then what the
       drawer drew two frames on */
    const hold = (ms) => P.page.evaluate((target) => new Promise((res) => {
      window.__btBowFeel.pin(target);
      let n = 0;
      const go = () => { if (++n >= 3) { const got = window.__btBowFeelFx().last; window.__btBowFeel.pin(null); res(got); } else requestAnimationFrame(go); };
      requestAnimationFrame(go);
    }), ms);
    const FULL = three.full;
    const light = await hold(Math.round(FULL * 0.1)), deep = await hold(Math.round(FULL * 0.75));
    rec.ok('3 DRAWN: the string pulled further back and the aim line longer, narrower, brighter as the draw fills -- two loose lines at first',
      !!light && !!deep && !!light.line && !!deep.line && light.phase === 'draw' && deep.phase === 'draw' && deep.bend > light.bend
      && deep.line.len > light.line.len && deep.line.spread < light.line.spread && deep.line.thick < light.line.thick && deep.line.alpha > light.line.alpha && light.line.lines === 2 && deep.line.gold === 0, { light, deep });

    /* ── 4 ── the settle and the tired arm */
    const four = await P.page.evaluate(() => {
      const S = window._gameState.current, F = window.__btBowFeel, full = F().full;
      S._bf.st.drawAt = Date.now() - Math.round(full * 0.9); F.tick();
      const s0 = F().settles;
      S._bf.st.drawAt = Date.now() - full - 40; F.tick();
      const settled = F();
      S._bf.st.drawAt = Date.now() - full - 140; F.tick();
      const still = F();
      return { s0, settled: { phase: settled.view.phase, perfect: settled.view.perfect, walk: settled.walk, settles: settled.settles }, stillSettles: still.settles };
    });
    const gold = await hold(FULL + 150);   /* the middle of the sweet spot (full to 300 after) */
    rec.ok('4 FULL DRAW SETTLES: the quiet click once (not every frame), a loose now is the perfect shot, the walk planted',
      four.settled.phase === 'full' && four.settled.perfect && four.settled.settles === four.s0 + 1 && four.stillSettles === four.settled.settles && four.settled.walk === 0.6, four);
    rec.ok('4 ...the line DRAWN one crisp gold line, the bow\'s whole reach', !!gold && gold.phase === 'full' && !!gold.line && gold.line.lines === 1 && gold.line.gold === 1 && gold.line.spread === 0 && gold.line.tremble === 0 && gold.line.color === 0xffd44a, gold);
    const tired = await hold(FULL + 300 + 600);
    const tv = await P.page.evaluate(() => window.__btBowFeel());
    rec.ok('4 HELD TOO LONG THE ARM TIRES: the sweet spot passed (not perfect), the line trembles and fades from gold',
      !!tired && tired.phase === 'tired' && tired.line && tired.line.tremble > 1 && tired.line.gold < 1 && tv.tires >= 1 && tv.view.phase === 'tired' && !tv.view.perfect, { tired, tv: tv.view });

    /* ── 5 ── the cancel: slide back to the touch point, lift -- nothing sent */
    const five = await P.page.evaluate(() => {
      const o = window.__bfZone(), F = window.__btBowFeel;
      const sent0 = window.__bfOut.filter((x) => x.k === 'player_projectile').length;
      const ld0 = F().n.letdown;
      window.__bfTouch(o.z, 'touchmove', o.x, o.y + 3, 91);
      const after = F();
      window.__bfTouch(o.z, 'touchend', o.x, o.y + 3, 91);
      return { sent0, phase: after.phase, letdown: after.n.letdown - ld0, creak: after.creak, end: F().phase };
    });
    await P.page.waitForTimeout(1500);
    const sent5 = await P.page.evaluate(() => window.__bfOut.filter((x) => x.k === 'player_projectile').length);
    rec.ok('5 SLID BACK TO THE TOUCH POINT the string is let down (the creak stops), and the lift sends NOTHING',
      five.phase === 'nock' && five.letdown === 1 && !five.creak && five.end === 'idle' && sent5 === five.sent0, { five, sent5 });

    /* ── 6 ── a real half draw, loosed */
    const six = await P.page.evaluate(() => {
      const o = window.__bfZone(), S = window._gameState.current, F = window.__btBowFeel, full = F().full;
      window.__bfSpin(Date.now() + 600);
      window.__bfTouch(o.z, 'touchstart', o.x, o.y, 92);
      window.__bfTouch(o.z, 'touchmove', o.x - 20, o.y + 40, 92);
      const t0 = Date.now();
      window.__bfSpin(t0 + Math.round(full * 0.5));
      window.__bfTouch(o.z, 'touchend', o.x - 20, o.y + 40, 92);
      const loose = F().loose;
      return { full, want: Math.round(full * 0.5), loose, creak: F().creak, phase: F().phase };
    });
    const relay = await H.waitFor(P, () => (window.__bfOut || []).filter((x) => x.k === 'player_projectile').slice(-1)[0] || null, (v) => v && v.dr != null, { timeout: 8000, label: 'the loose\'s relay' }).catch(() => null);
    const sixB = await P.page.evaluate(() => { const S = window._gameState.current, a = (S.arrows || []).slice(-1)[0]; return { last: window.__btBowFeel().last, arrow: a ? { dr: a._bfDr, share: a._bfShare, released: !!a._released || (Date.now() - a._bornTs) >= 110 } : null, shotAgo: Date.now() - S._bowShotAt }; });
    rec.ok('6 LIFT TO LOOSE: the creak cut, the shot at once for its share -- its relay carries `dr`, the draw on the page\'s clock (a half draw)',
      !!six.loose && !six.creak && six.phase === 'idle' && !!relay && Math.abs(relay.dr - six.want) <= 8 && !relay.isStaff && !relay.special && typeof relay.ts === 'number', { six, relay });
    rec.ok('6 ...the arrow leaves on the release (no extra nock wait), the stand-in on its release frame, a half draw a light shot',
      !!sixB.last && sixB.last.dr === relay.dr && sixB.last.ts === relay.ts && Math.abs(sixB.last.r - 0.5) < 0.05 && sixB.last.tier === 'light' && !sixB.last.perfect, sixB);

    /* ── 7 ── the worker's verdict, on a monster of the Flame Fields */
    try {
      await H.devOp(wsPort, 'quests', me);
      await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 8 });
      const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
      const spot = WHEEL_SPAWNS.ember.points[0];
      await H.glideTo(P, spot[0] + 200, spot[1] + 200, { timeoutMs: 150000 });
      const nearest = () => P.page.evaluate(() => {
        const S = window._gameState.current;
        const m = (S.monsters || []).filter((x) => x && x.alive !== false && x.hp > 0 && !/-t\d+-\d+$/.test(x.id))
          .sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y))[0];
        return m ? { id: m.id, x: m.x, y: m.y, zone: S.currentZone, d: Math.round(Math.hypot(m.x - S.player.x, m.y - S.player.y)) } : null;
      });
      let tgt = await nearest();
      for (let i = 0; i < 3 && tgt && tgt.d > 160; i++) { await H.glideTo(P, tgt.x, tgt.y + 110, { timeoutMs: 30000 }); await P.page.waitForTimeout(800); tgt = await nearest(); }
      rec.ok('7 a monster of the Flame Fields in reach (guard)', !!tgt && tgt.d < 400, tgt);
      if (tgt) {
        await P.page.evaluate(() => { window.__bfIn = []; });
        /* a real draw at it: the thumb pulled away from it, held `frac` of the full draw, lifted */
        const shoot = (frac, id) => P.page.evaluate(({ frac, id, mid }) => {
          const o = window.__bfZone(), S = window._gameState.current, F = window.__btBowFeel, full = F().full;
          const m = (S.monsters || []).find((x) => x && x.id === mid);
          const ang = m ? Math.atan2(m.y - S.player.y, m.x - S.player.x) : -Math.PI / 2;
          window.__bfSpin(Date.now() + 900);   /* the last shot well behind: the bound leaves the draw alone */
          window.__bfTouch(o.z, 'touchstart', o.x, o.y, id);
          window.__bfTouch(o.z, 'touchmove', o.x - Math.cos(ang) * 44, o.y - Math.sin(ang) * 44, id);
          const t0 = Date.now();
          window.__bfSpin(t0 + Math.round(full * frac));
          window.__bfTouch(o.z, 'touchend', o.x - Math.cos(ang) * 44, o.y - Math.sin(ang) * 44, id);
          return { full, at: t0, loose: F().loose };
        }, { frac, id, mid: tgt.id });
        const verdict = async (frac, id) => {
          tgt = (await nearest()) || tgt;
          const s = await shoot(frac, id);
          let rel = null;
          for (let i = 0; i < 16 && !rel; i++) { await P.page.waitForTimeout(500); rel = await P.page.evaluate((t0) => (window.__bfOut || []).filter((x) => x.k === 'player_projectile' && x.dr != null && x.at >= t0).slice(-1)[0] || null, s.at); }
          if (!rel) return { s, rel: null };
          /* the arrow's own claim, if it flew true; else the claim it would have sent (naming its shot) */
          let claim = null;
          for (let i = 0; i < 7 && !claim; i++) { await P.page.waitForTimeout(500); claim = await P.page.evaluate((ts) => (window.__bfOut || []).filter((x) => x.k === 'monster_damage' && x.sw === ts).slice(-1)[0] || null, rel.ts); }
          const byHand = !claim;
          if (byHand) await H.sendEvent(P, 'monster_damage', { monsterId: tgt.id, zone: tgt.zone, slot: 'ranged', element: null, sw: rel.ts });
          const hit = await H.waitFor(P, () => window.__bfHits(), (v) => v.length > 0, { timeout: 6000, label: 'the worker\'s hit' }).catch(() => []);
          await P.page.evaluate(() => { window.__bfIn = []; });
          return { full: s.full, dr: rel.dr, sw: claim ? claim.sw : rel.ts, ts: rel.ts, byHand, hit: hit[hit.length - 1] || null, target: tgt.id };
        };
        const half = await verdict(0.5, 93);
        await P.page.waitForTimeout(1200);
        const perf = await verdict(1.25, 94);   /* 1.25 x 371 = 464 ms: 93 into the 300 ms sweet spot */
        console.log('    verdicts: ' + JSON.stringify({ half, perf }));
        rec.ok('7 a HALF DRAW: its claim names its shot (`sw` = the relay\'s `ts`), and the worker answers with its share (`pw` about 0.5, no perfect)',
          !!half.hit && half.sw === half.ts && typeof half.hit.pw === 'number' && Math.abs(half.hit.pw - half.dr / half.full) <= 0.03 && half.hit.pf !== 1, half);
        rec.ok('7 a draw just past FULL, in the sweet spot: the worker\'s perfect draw (`pf: 1`, x1.12)',
          !!perf.hit && perf.sw === perf.ts && perf.hit.pf === 1 && typeof perf.hit.pw === 'number' && Math.abs(perf.hit.pw - 1.12) <= 0.01, perf);
      }
    } catch (e) {
      rec.ok('7 the worker\'s verdict: no error on the way (guard)', false, String((e && e.message) || e).slice(0, 300));
    }

    /* ── 8 ── the budget */
    const eight = await P.page.evaluate(() => ({ feel: window.__btBowFeel().cost, kit: window.__btWeaponFeelFx ? window.__btWeaponFeelFx().stats.maxMs : null }));
    rec.ok(`8 THE PAGE'S BUDGET: the bow's feel a frame at most ${FEEL_MAX_MS} ms (a quarter of held-budget's ${FRAME_JS_MAX_MS} ms frame line, far from its ${HOLD_MAX_MS} ms hold), ${FEEL_MEAN_MS} ms on average; the kit's layer (its drawer included) the same`,
      !!eight.feel && eight.feel.n > 10 && eight.feel.max < FEEL_MAX_MS && eight.feel.mean < FEEL_MEAN_MS && typeof eight.kit === 'number' && eight.kit < FEEL_MAX_MS, eight);
  } finally {
    stop();
    await P.ctx.close().catch(() => {});
  }

  /* ── 9 ── a computer: the left button held draws, let go looses */
  const D = await H.newPlayer(browser, { name: 'Deskbow', wsPort, webPort, viewport: { width: 1280, height: 800 }, wide: true, world: 'wheel', query: 'manual=3' });
  D.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stopD = H.keepAlive(D);
  try {
    if (await enter(D, rec, '9 a computer')) {
      await armBow(D, wsPort);
      await H.waitFor(D, () => window.__btBowFeel(), (v) => v.on, { timeout: 15000, label: 'the bow\'s feel' }).catch(() => null);
      const box = await D.page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2 + 150, y: r.top + r.height * 0.5 - 120 }; });
      await D.page.mouse.move(box.x, box.y);
      await D.page.waitForTimeout(400);
      await D.page.mouse.down();
      const mid = await D.page.evaluate(() => window.__btBowFeel());
      await D.page.waitForTimeout(250);
      await D.page.mouse.up();
      const after = await D.page.evaluate(() => window.__btBowFeel());
      const rel = await H.waitFor(D, () => (window.__bfOut || []).filter((x) => x.k === 'player_projectile').slice(-1)[0] || null, (v) => !!v, { timeout: 8000, label: 'the click\'s relay' }).catch(() => null);
      const last = await D.page.evaluate(() => window.__btBowFeel().last);
      /* the draw is the page's own time between the press and the release (this box's page is slow: more than the 250 ms held) */
      rec.ok('9 A COMPUTER: the left button held draws (nocked and drawing at once, no pull to make), its release looses at the cursor with its draw (`dr`)',
        mid.phase === 'drawing' && after.phase === 'idle' && !!rel && typeof rel.dr === 'number' && rel.dr >= 250 && !!last && last.dr === rel.dr && last.ts === rel.ts, { mid: mid.phase, after: after.phase, rel, last });
    }
  } finally {
    stopD();
    await D.ctx.close().catch(() => {});
  }

  /* ── 10 ── `?bowfeel=0`: today's flick bow */
  const Q = await H.newPlayer(browser, { name: 'Flickbro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query: 'manual=3&bowfeel=0' });
  Q.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stopQ = H.keepAlive(Q);
  try {
    if (await enter(Q, rec, '10 `?bowfeel=0`')) {
      await armBow(Q, wsPort);
      await Q.page.waitForTimeout(800);
      const q = await Q.page.evaluate(() => {
        const o = window.__bfZone(), F = window.__btBowFeel;
        window.__bfSpin(Date.now() + 1500);
        window.__bfTouch(o.z, 'touchstart', o.x, o.y, 95);
        const nocked = F().phase;
        window.__bfTouch(o.z, 'touchmove', o.x, o.y - 50, 95);   /* a flick UP: today's bow shoots the way the thumb went */
        window.__bfTouch(o.z, 'touchend', o.x, o.y - 50, 95);
        return { on: F().on, wanted: F().wanted, nocked, aim: window._gameState.current._aimAngle };
      });
      const rel = await H.waitFor(Q, () => (window.__bfOut || []).filter((x) => x.k === 'player_projectile').slice(-1)[0] || null, (v) => !!v, { timeout: 8000, label: 'the flick\'s relay' }).catch(() => null);
      rec.ok('10 `?bowfeel=0` on one phone: today\'s flick bow -- no feel, nothing nocked, a flick shoots the way it went with no `dr`',
        !q.on && !q.wanted && q.nocked === 'idle' && Math.sin(q.aim) < -0.9 && !!rel && rel.dr === undefined, { q, rel });
    }
  } finally {
    stopQ();
    await Q.ctx.close().catch(() => {});
  }
  rec.ok('11 no page errors', errors.length === 0, errors);
}
