/* ═══ THE HEAD PIECES STAY ON THROUGH A LONG SESSION (v2.3.3700) ═══
 *
 * The owner, 2026-10-28: "Keep running tests through the night on memory
 * fixes/improvements and testing for disappearing traits."  Their reports:
 * "Some traits will disappear. It seems after combat or interacting in the
 * world a while" (v2.3.3606: a picture Safari emptied) and "I logged in as
 * another character and traits were missing when jogging in certain
 * directions" (v2.3.3689: a piece that did not come, asked for again).
 * mp-headkeep and mp-traitswitch each test one cause, once.  This plays a
 * session instead and keeps looking at the head:
 *
 * a phone (390 x 844 at 3x) in a full look -- wavy hair, the red bandana, a
 * beard, the golden glasses -- and the copper torso and greaves, the worker's
 * sword, bow and staff in hand, LAPS times round the lands (BroTown, the Flame
 * Fields, the Wind Dunes, Frost Ridge, the Verdant Wilds; each land's
 * monsters and art loaded as you arrive and let go of as you leave), and at
 * each stop:
 *   - a fight: the sword, the bow and the staff swapped by their keys, a roll
 *     and a double jump;
 *   - all eight facings, jogging and standing: the hair, the hat, the beard
 *     and the glasses each drawn (shown, and its picture read back off the
 *     graphics chip);
 * and once a lap a black screen's rebuild (window._rebuildRenderer), with the
 * eight facings looked at again after it.  Every piece not drawn is a failure,
 * named with the lap, the place, the facing and what had just happened.  The
 * page's memory is read each lap (mp-membudget's ruler), for the trend.
 *
 *   node tools/qa/mp/run.mjs traitsoak
 *   BT_TS_LAPS=n    laps (2)
 *   BT_TS_QUERY=x   a URL switch on the page
 *   BT_TS_VIEW=desk a computer instead: 1366 x 768 at 1x, a mouse and keys */
import * as H from './harness.mjs';
import { MEM_INIT, memSampler } from './memprobe.mjs';

const PHONE = { width: 390, height: 844 };
const DESK = process.env.BT_TS_VIEW === 'desk';
const VIEW = DESK ? { viewport: { width: 1366, height: 768 }, touch: false, dpr: 1 } : { viewport: PHONE, touch: true, dpr: 3 };
const LAPS = +(process.env.BT_TS_LAPS || 2);
const QUERY = process.env.BT_TS_QUERY || '';
/* v2.3.3753: BT_TS_LOOK='{"hair":"afro","hairColor":"pink",...}' -- another
   look, its colours too (a coloured piece is drawn from the look palette's
   numbers, traits/headLook.js) */
const LOOK = process.env.BT_TS_LOOK ? JSON.parse(process.env.BT_TS_LOOK)
  : { hair: 'wavy', hat: 'bandana-2', beard: 'beard', eye: 'golden-glasses' };
const STOPS = ['ember', 'sky', 'frost', 'verdant'];
const FACINGS = {
  east: ['d'], northeast: ['w', 'd'], north: ['w'], northwest: ['w', 'a'],
  west: ['a'], southwest: ['s', 'a'], south: ['s'], southeast: ['s', 'd'],
};
/* drawn off by design, the pictures each piece ships (west, northwest and
   southeast are mirrors): the golden glasses have no north, the beard no
   north or northeast -- it is the face's, behind the head facing away */
const DESIGNED_OFF = { eye: { north: true }, beard: { north: true, northeast: true, northwest: true } };

const INIT = (look) => {
  try {
    localStorage.setItem('bt-hair', look.hair);
    localStorage.setItem('bt-headwear', look.hat);
    localStorage.setItem('bt-facialhair', look.beard);
    localStorage.setItem('bt-eyewear', look.eye);
    if (look.hairColor) localStorage.setItem('bt-haircolor', look.hairColor);
    if (look.hatColor) localStorage.setItem('bt-hatcolor', look.hatColor);
    if (look.beardColor) localStorage.setItem('bt-beardcolor', look.beardColor);
    if (look.eyeColor) localStorage.setItem('bt-eyewearcolor', look.eyeColor);
  } catch (e) { /* none */ }
};

/* each head piece now: shown, and its picture read back off the graphics chip
   (a fresh sprite of it, drawn on nothing: mp-headkeep's reading) */
const pieces = (P) => P.page.evaluate(() => {
  const R = window._pixiRenderer;
  const d = R && R.playerDisplayRaw && R.playerDisplayRaw();
  if (!d) return null;
  const r = R.app.renderer;
  const one = (s) => {
    if (!s) return null;
    const t = s.texture, src = t && t.source;
    const o = { vis: !!s.visible, dead: !!(t && t.destroyed) || !!(src && src.destroyed) };
    if (o.vis && t && src && !o.dead && t !== t.constructor.EMPTY) {
      try {
        const probe = new s.constructor(t);
        const px = r.extract.pixels({ target: probe, clearColor: [0, 0, 0, 0] });
        probe.destroy();
        const a = px.pixels || px;
        let op = 0;
        for (let i = 3; i < a.length; i += 4) if (a[i] > 40) op++;
        o.px = op;
      } catch (e) { o.err = String(e && e.message || e).slice(0, 80); }
    }
    return o;
  };
  return { dir: d._animDir, pose: d._animPose, hair: one(d._hairSprite), hat: one(d._headwearSprite),
    beard: one(d._facialHairSprite), eye: one(d._eyewearSprite) };
});

/* all eight facings, jogging and standing; returns what was not drawn */
async function sweep(P, where) {
  const bad = [];
  for (const [name, keys] of Object.entries(FACINGS)) {
    for (const phase of ['jog', 'stand']) {
      for (const k of keys) await P.page.keyboard.down(k);
      await P.page.waitForTimeout(phase === 'jog' ? 700 : 260);
      if (phase === 'stand') for (const k of keys) await P.page.keyboard.up(k);
      if (phase === 'stand') await P.page.waitForTimeout(500);
      const p = await pieces(P).catch((e) => ({ err: String(e) }));
      if (phase === 'jog') for (const k of keys) await P.page.keyboard.up(k);
      for (const k of ['hair', 'hat', 'beard', 'eye']) {
        if (DESIGNED_OFF[k] && DESIGNED_OFF[k][name]) continue;
        const o = p && p[k];
        if (!o || !o.vis || o.dead || !(o.px > 0)) bad.push(`${where}: ${name} ${phase} ${k} ${JSON.stringify(o)} (${p && p.pose} ${p && p.dir})`);
      }
    }
  }
  console.log(`    [${where}] ${bad.length ? bad.length + ' not drawn:\n      ' + bad.slice(0, 8).join('\n      ') : 'every piece drawn in every facing'}`);
  return bad;
}

const near = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  if (!S || !S.player) return null;
  let m = null, d = Infinity;
  for (const x of S.monsters || []) {
    if (!x || x.alive === false || x.dead) continue;
    const dd = Math.hypot(x.x - S.player.x, x.y - S.player.y);
    if (dd < d) { d = dd; m = { id: x.id, d: dd }; }
  }
  return m;
});

/* one weapon, its auto attack on the nearest monster for `ms` (mp-battlemem's
   aim, without walking in) */
async function fight(P, key, slot, ms) {
  await P.page.keyboard.press(key);
  await P.page.waitForTimeout(350);
  const m = await near(P).catch(() => null);
  if (!m || m.d > 700) return 0;
  return P.page.evaluate(({ id, slot, ms }) => new Promise((resolve) => {
    const S = window._gameState.current;
    const sw0 = S.swingTimer || 0, n0 = (S.arrows || []).length;
    const aim = () => {
      const x = (S.monsters || []).find((q) => q.id === id);
      if (!x || !S.player) return;
      const ang = Math.atan2((x.renderY != null ? x.renderY : x.y) - 30 - S.player.y, (x.renderX != null ? x.renderX : x.x) - S.player.x);
      S._aimAngle = ang; S._lastAimAngle = ang; S._aiming = slot !== 'melee';
      S._facingAngle = ang; S._targetFacingAngle = ang;
    };
    aim();
    S.autoAttack = true;
    const iv = setInterval(aim, 60);
    setTimeout(() => {
      clearInterval(iv);
      S.autoAttack = false; S._aiming = false;
      resolve(((S.arrows || []).length > n0 || (S.swingTimer || 0) > sw0) ? 1 : 0);
    }, ms);
  }), { id: m.id, slot, ms });
}

async function moves(P) {
  await P.page.keyboard.press('x');       /* a roll (v2.3.3844: X, was Space) */
  await P.page.waitForTimeout(700);
  await P.page.keyboard.press('Space');   /* a jump... (v2.3.3844: Space, was X) */
  await P.page.waitForTimeout(300);
  await P.page.keyboard.press('Space');   /* ...and the flip */
  await P.page.waitForTimeout(900);
}

async function looksIn(P) {
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) {
    const a = await P.page.evaluate(() => (window.__btWheelArt ? window.__btWheelArt() : null)).catch(() => null);
    if (!a || (a.ready > 0 && a.loading === 0)) return;
    await P.page.waitForTimeout(500);
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Soakbro', wsPort, webPort, ...VIEW, world: 'wheel', query: QUERY || undefined,
    init: `(${INIT.toString()})(${JSON.stringify(LOOK)}); (${MEM_INIT.toString()})();`,
  });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  let stop = false;
  const misses = [];
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the world' }).catch(() => null);
    rec.ok('in the world (guard)', !!ok, ok);
    if (!ok) return;
    const me = await H.readState(P, (S) => S.myId);
    const home = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    await H.devOp(wsPort, 'quests', me).catch(() => null);
    await P.page.evaluate(() => {
      const keep = () => {
        const S = window._gameState && window._gameState.current, R = S && S.rpg;
        if (!R) return;
        if (!R._quests || typeof R._quests !== 'object') R._quests = {};
        if (!R._quests.tut_1) R._quests.tut_1 = true;
      };
      keep();
      window.__tsGateOpen = setInterval(keep, 100);
    });
    (async () => {
      while (!stop) {
        await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 8 }).catch(() => null);
        await P.page.keyboard.press('Control').catch(() => {});
        for (let i = 0; i < 4 && !stop; i++) await P.page.waitForTimeout(500).catch(() => {});
      }
    })();

    /* the copper torso and greaves, worn the real way (mp-armourflash) */
    await H.devOp(wsPort, 'kit', me, { what: 'armor' });
    let kit = null;
    for (let i = 0; i < 40 && !kit; i++) {
      kit = await P.page.evaluate(() => {
        const R = window._gameState.current.rpg || {};
        const t = (R.armorStash || []).find((x) => x && x.mat === 'copper' && x.gid);
        const l = (R.legsStash || []).find((x) => x && x.mat === 'copper' && x.gid);
        return t && l ? { t: t.gid, l: l.gid } : null;
      });
      if (!kit) await P.page.waitForTimeout(300);
    }
    if (kit) {
      await P.page.evaluate((p) => {
        const S = window._gameState.current;
        const R = S.rpg;
        const ti = (R.armorStash || []).findIndex((x) => x && x.gid === p.t);
        const li = (R.legsStash || []).findIndex((x) => x && x.gid === p.l);
        if (ti >= 0) { R.armor = R.armorStash[ti]; R.armorStash.splice(ti, 1); }
        if (li >= 0) { R.legsArmor = R.legsStash[li]; R.legsStash.splice(li, 1); }
        if (window.__btSyncArmorLayers) window.__btSyncArmorLayers(R);
        S.channel.send({ type: 'stats_update', payload: { armorRef: p.t, legsArmorRef: p.l } });
      }, kit);
    }
    /* the worker's bow and staff, and the kit's greatsword (mp-battlemem) */
    const armed = await H.armWorker(P, wsPort, me, ['bow', 'staff']).catch(() => []);
    const swordHeld = () => H.readState(P, (S) => !!(S.rpg.weapon && S.rpg.weapon.type === 'greatsword'));
    for (let t = 0; t < 3 && !(await swordHeld()); t++) {
      await P.page.evaluate(() => { const R = window._gameState.current.rpg; if (R && !(R.weapon && R.weapon.type === 'greatsword')) R.weapon = null; });
      await H.equipWeapon(P, 'greatsword', 'weapon', 'melee').catch(() => null);
      for (let i = 0; i < 40 && !(await swordHeld()); i++) await P.page.waitForTimeout(250);
    }
    const worn = await P.page.evaluate(() => ({ chest: window.__btGetGear && window.__btGetGear('chest'), legs: window.__btGetGear && window.__btGetGear('legs') }));
    rec.ok(`dressed and armed (guard: ${worn.chest}, ${worn.legs}; ${armed.join(', ')}${(await swordHeld()) ? ', greatsword' : ''})`,
      worn.chest === 'copperplate' && worn.legs === 'coppergreaves' && armed.includes('bow'), { worn, armed });
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    await P.page.waitForTimeout(2500);
    const first = await sweep(P, 'BroTown, arriving');
    misses.push(...first);
    rec.ok('in BroTown on arrival every head piece is drawn in every facing (guard)', first.length === 0, first.slice(0, 6));

    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const { sample } = await memSampler(P, browser);
    const mem = [];
    for (let lap = 1; lap <= LAPS; lap++) {
      for (const land of STOPS) {
        const at = WHEEL_SPAWNS[land] && WHEEL_SPAWNS[land].points[0];
        if (!at) continue;
        await H.glideTo(P, at[0], at[1] + 40);
        await looksIn(P);
        let fired = 0;
        fired += await fight(P, 'Digit1', 'melee', 2500).catch(() => 0);
        fired += await fight(P, 'Digit2', 'ranged', 2500).catch(() => 0);
        fired += await fight(P, 'Digit3', 'staff', 2500).catch(() => 0);
        await moves(P);
        console.log(`    lap ${lap}, ${land}: ${fired} weapons fired`);
        misses.push(...await sweep(P, `lap ${lap}, ${land}, after the fight`));
        if (land === 'ember') {
          await P.page.evaluate(() => { window.__tsOldApp = window._pixiRenderer && window._pixiRenderer.app; window.__btLastGlRebuild = 0; if (window._rebuildRenderer) window._rebuildRenderer('qa: trait soak'); });
          const fresh = await H.waitFor(P, () => {
            const a = window._pixiRenderer && window._pixiRenderer.app;
            return { fresh: !!a && a !== window.__tsOldApp && !!a.renderer };
          }, (v) => v.fresh, { timeout: 30000, label: 'a new renderer' }).catch(() => null);
          if (!fresh) misses.push(`lap ${lap}: the rebuild never came`);
          await P.page.waitForTimeout(4000);
          misses.push(...await sweep(P, `lap ${lap}, ${land}, after a black screen's rebuild`));
        }
      }
      await H.glideTo(P, home.x, home.y);
      await P.page.waitForTimeout(2000);
      misses.push(...await sweep(P, `lap ${lap}, back in BroTown`));
      const s = await sample(`lap ${lap}, back in BroTown`);
      mem.push({ lap, gpu: s.gpu, canvasMB: s.canvasMB, cache: s.cache, heapMB: s.heapMB, buffersMB: s.buffersMB });
      console.log(`    lap ${lap} memory: GPU ${s.gpu}, canvases ${s.canvasMB}, art ${s.cache}, heap ${s.heapMB}, buffers ${s.buffersMB}`);
    }
    rec.ok(`through ${LAPS} laps of the lands (fights, rolls, jumps, ${LAPS} black screen rebuilds) every head piece was drawn in every facing at every stop`,
      misses.length === 0, misses.slice(0, 12));
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
    console.log('    memory by lap: ' + JSON.stringify(mem));
  } finally {
    stop = true;
    await P.ctx.close().catch(() => {});
  }
}
