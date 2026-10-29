/* ═══ v2.3.3860: A HEAD PIECE IS NEVER A FRAME LATE ═══
 *
 * The owner, 2026-10-29: "For disappearing traits sometimes it's a flicker",
 * and "keep trying to patch the causes of any flicker or missing traits
 * first."  mp-traitsoak and mp-headkeep look at the head once you stop; a
 * flicker is a frame or a few in between.  So this plays a phone (390 x 844,
 * at 1x: see DPR) in a full coloured look -- pink wavy hair, a blue beanie, a red beard, the golden
 * glasses, the first three in a colour (drawn from the look palette's numbers,
 * traits/headLook.js) -- with the page counting, the moment before EVERY
 * frame is drawn, each worn piece not on screen (src/rendering/headFrames.js,
 * `?headframes`): on the walking figure or on the stand-in that draws you
 * while you swing.  Each phase is counted on its own:
 *   1. standing;
 *   2. jogging each of the eight facings;
 *   3. turning: the eight facings in quick turns, a fifth of a second each;
 *   4. rolls and double jumps (the flip), facing about;
 *   4b. a peer in sight, in pieces of their own colours, jogging the eight
 *      facings and rolling: every other bro's and townsperson's pieces are
 *      counted too, in every phase (headFrames.js othersFrameTick);
 *   4c. the graphics lost and given back (WEBGL_lose_context, a phone's
 *      memory purge), the pieces counted through the restore;
 *   5. a fight in the Flame Fields: the greatsword's swings and the bow's
 *      shots on the nearest monster (the stand-ins take over the figure);
 *   6. with ?headframes the count shows itself on the screen (the owner's
 *      iPhone has no console); without it (the peer's page) no readout, no
 *      probe, the module never fetched;
 *   7. no page errors.
 * Every phase's count of frames with a worn piece missing must be 0.  The
 * misses are printed with their reason, pose, facing and frame.
 *
 *   node tools/qa/mp/run.mjs headframes
 *   BT_HF_QUERY=x   another URL switch on the page (e.g. lookpalette=0)
 *   BT_HF_ONLY=fight|peer|ctx  that phase alone (BT_HF_ROUNDS=n the fight's rounds, 3)
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
/* 1x by default: this box draws a 3x phone's 1170 x 2532 canvas at about two
   frames a second, too few to see a one-frame gap; what hides a piece is the
   game's own state, the same at any density.  BT_HF_DPR=3 for the phone's. */
const DPR = +(process.env.BT_HF_DPR || 1);
const ONLY = process.env.BT_HF_ONLY || '';
const ROUNDS = +(process.env.BT_HF_ROUNDS || 3);
const QUERY = 'headframes' + (process.env.BT_HF_QUERY ? '&' + process.env.BT_HF_QUERY : '');
const LOOK = { hair: 'wavy', hairColor: 'pink', hat: 'beanie', hatColor: 'blue', beard: 'beard', beardColor: 'red', eye: 'golden-glasses' };
/* each colour's target (the catalogs'), for the pixels read back: colours no
   skin, ground or outline shares, so a piece's own pixels are what is counted */
/* the peer: pieces in their own colours (each facing a picture of its own) */
const PEER_LOOK = { hair: 'afro', hairColor: 'default', hat: 'cowboy-hat-2', hatColor: 'default', beard: 'beard', beardColor: 'default', eye: 'thug-life' };
const TARGETS = { hair: [232, 110, 170], headwear: [74, 96, 200], facialhair: [170, 58, 42] };
const FACINGS = {
  east: ['d'], northeast: ['w', 'd'], north: ['w'], northwest: ['w', 'a'],
  west: ['a'], southwest: ['s', 'a'], south: ['s'], southeast: ['s', 'd'],
};
const INIT = (look) => {
  try {
    localStorage.setItem('bt-hair', look.hair);
    localStorage.setItem('bt-headwear', look.hat);
    localStorage.setItem('bt-facialhair', look.beard);
    localStorage.setItem('bt-eyewear', look.eye);
    localStorage.setItem('bt-haircolor', look.hairColor);
    localStorage.setItem('bt-hatcolor', look.hatColor);
    localStorage.setItem('bt-beardcolor', look.beardColor);
  } catch (e) { /* none */ }
};

const count = (P, reset) => P.page.evaluate((r) => (window.__btHeadFrames ? window.__btHeadFrames(r) : null), !!reset);
const others = (P, reset) => P.page.evaluate((r) => (window.__btHeadOthers ? window.__btHeadOthers(r) : null), !!reset);
const pixels = (P, reset) => P.page.evaluate((r) => (window.__btHeadPixels ? window.__btHeadPixels(r) : null), !!reset);

async function hold(P, keys, ms) {
  for (const k of keys) await P.page.keyboard.down(k);
  await P.page.waitForTimeout(ms);
  for (const k of keys) await P.page.keyboard.up(k);
}

/* the nearest live monster (mp-traitsoak's) */
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
/* one weapon's auto attack on the nearest monster for `ms` (mp-traitsoak's) */
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

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Headframe', wsPort, webPort, viewport: PHONE, touch: true, dpr: DPR, world: 'wheel', query: QUERY,
    init: `(${INIT.toString()})(${JSON.stringify(LOOK)});`,
  });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  let stop = false;
  const phases = [];
  const phase = async (name, fn) => {
    await count(P, true);
    await pixels(P, true);
    await others(P, true);
    await fn();
    const c = await count(P, false);
    const px = await pixels(P, false);
    const ot = await others(P, false);
    if (c) { c.px = px; c.ot = ot; }
    phases.push({ name, c });
    const top = c ? Object.entries(c.byWhy).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} x${v}`).join(', ') : '?';
    console.log(`    [${name}] ${c ? c.frames : '?'} frames, ${c ? c.missed : '?'} piece-frames missing${c && c.missed ? ': ' + top : ''}${c && c.bodyGone ? `; ${c.bodyGone} frames with no bro drawn ${JSON.stringify(c.goneBy)}` : ''}`);
    if (c && c.bodyGone) for (const l of c.goneLog.slice(0, 6)) console.log('      gone: ' + JSON.stringify(l));
    if (c && c.missed) for (const l of c.log.slice(-8)) console.log('      ' + JSON.stringify(l));
    if (ot) console.log(`      others (${ot.figures} peers and townsfolk): ${ot.counted} piece-frames, ${ot.missed} missing${ot.missed ? ' ' + JSON.stringify(ot.byWhy) : ''}`);
    if (ot && ot.missed) for (const l of ot.log.slice(-8)) console.log('      ' + JSON.stringify(l));
    if (px) console.log(`      pixels: ${px.looked} piece-frames read back, ${px.drops} dropped${px.drops ? ' ' + JSON.stringify(px.byCat) : ''}`);
    if (px && px.drops) for (const l of px.log.slice(-8)) console.log('      ' + JSON.stringify(l));
    if (px && px.shots) {
      const { writeFileSync, mkdirSync } = await import('node:fs');
      mkdirSync(H.REPO + '/tools/qa/mp/out', { recursive: true });
      for (const sh of px.shots) {
        const f = `${H.REPO}/tools/qa/mp/out/headframes-${name.split(':')[0].replace(/\W+/g, '-')}-f${sh.f}-${sh.cat.replace(/\W+/g, '-')}.png`;
        writeFileSync(f, Buffer.from(sh.url.split(',')[1], 'base64'));
        console.log('      picture: ' + f.replace(H.REPO + '/', ''));
      }
      delete px.shots;
    }
    return c;
  };
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the world' }).catch(() => null);
    const probe = await count(P, false);
    rec.ok('in the world, the head-frame count on (guard)', !!ok && !!probe && probe.on, { ok, probe: !!probe });
    if (!ok || !probe) return;
    /* the count shows itself on the screen (the owner's iPhone has no console) */
    const box = await H.waitFor(P, () => { const b = document.querySelector('[data-headframes]'); return b ? { text: b.textContent, pe: getComputedStyle(b).pointerEvents } : null; },
      (v) => !!v && /head pieces: \d+ frames/.test(v.text), { timeout: 8000, label: 'the readout' }).catch(() => null);
    rec.ok(`with ?headframes the count is on the screen, touching nothing ("${box ? box.text.split('\n').slice(0, 2).join(' / ') : 'NONE'}")`,
      !!box && box.pe === 'none' && /missing: yours \d+/.test(box.text), box);
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'quests', me).catch(() => null);
    /* the first quest's gate held open, so the weapons come (mp-traitsoak) */
    await P.page.evaluate(() => {
      const keep = () => {
        const S = window._gameState && window._gameState.current, R = S && S.rpg;
        if (!R) return;
        if (!R._quests || typeof R._quests !== 'object') R._quests = {};
        if (!R._quests.tut_1) R._quests.tut_1 = true;
      };
      keep();
      window.__hfGateOpen = setInterval(keep, 100);
    });
    (async () => {
      while (!stop) {
        await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 8 }).catch(() => null);
        for (let i = 0; i < 6 && !stop; i++) await P.page.waitForTimeout(500).catch(() => {});
      }
    })();
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    await P.page.evaluate((t) => { window.__btHeadTargets = t; }, TARGETS);
    await P.page.waitForTimeout(3000);

    if (!ONLY) {
    await phase('standing', () => P.page.waitForTimeout(5000));
    await phase('jogging the eight facings', async () => { for (const keys of Object.values(FACINGS)) await hold(P, keys, 1200); });
    await phase('quick turns', async () => {
      for (let r = 0; r < 3; r++) for (const keys of Object.values(FACINGS)) await hold(P, keys, 200);
    });
    await phase('rolls and flips', async () => {
      for (const keys of [FACINGS.east, FACINGS.north, FACINGS.west, FACINGS.south, FACINGS.northeast, FACINGS.southwest]) {
        for (const k of keys) await P.page.keyboard.down(k);
        await P.page.waitForTimeout(150);
        await P.page.keyboard.press('x');       /* a roll */
        await P.page.waitForTimeout(700);
        await P.page.keyboard.press('Space');   /* a jump... */
        await P.page.waitForTimeout(250);
        await P.page.keyboard.press('Space');   /* ...and the flip */
        await P.page.waitForTimeout(900);
        for (const k of keys) await P.page.keyboard.up(k);
      }
    });
    }

    /* the graphics lost and given back mid-play (WEBGL_lose_context), as a
       phone's memory purge does: every piece counted through the restore,
       standing and jogging the eight facings after it */
    if (!ONLY || ONLY === 'ctx') {
      /* each piece's usual pixels learnt first, in every facing, before the
         loss (the pixel count compares with them): a piece that came back
         blank must not become its own yardstick */
      if (ONLY) { await P.page.waitForTimeout(2000); for (const keys of Object.values(FACINGS)) { await hold(P, keys, 900); await P.page.waitForTimeout(400); } }
      const lost = await P.page.evaluate(() => {
        const c = document.querySelector('canvas');
        const gl = c && (c.getContext('webgl2') || c.getContext('webgl'));
        const ext = gl && gl.getExtension('WEBGL_lose_context');
        if (!ext) return false;
        window.__hfCtx = ext;
        ext.loseContext();
        setTimeout(() => { try { ext.restoreContext(); } catch (e) { /* gone */ } }, 800);
        return true;
      }).catch(() => false);
      const back = await phase('graphics lost and given back', async () => {
        await P.page.waitForTimeout(6000);
        for (const keys of Object.values(FACINGS)) await hold(P, keys, 900);
        await P.page.waitForTimeout(1500);
      });
      await P.page.screenshot({ path: H.REPO + '/tools/qa/mp/out/headframes-after-restore.png' }).catch(() => {});
      rec.ok(`the graphics were lost and given back (guard: ${lost ? 'lost' : 'NOT LOST'}, ${back ? back.frames : 0} frames drawn after)`, !!lost && !!back && back.frames > 8, { lost });
    }

    /* a peer in sight, in pieces of their own colours (each facing its own
       picture, not the look palette's numbers): jogging round you through
       the eight facings, rolling and turning */
    if (!ONLY || ONLY === 'peer') {
      const Q = await H.newPlayer(browser, {
        name: 'Headpeer', wsPort, webPort, viewport: PHONE, touch: true, dpr: 1, world: 'wheel',
        init: `(${INIT.toString()})(${JSON.stringify(PEER_LOOK)});`,
      });
      const qAsked = [];
      Q.page.on('request', (r) => { if (/headFrames/i.test(r.url())) qAsked.push(r.url()); });
      try {
        await H.enterWorld(Q);
        await H.waitFor(Q, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
          { timeout: 90000, label: 'the peer in the world' }).catch(() => null);
        await Q.page.waitForTimeout(1500);
        /* ...and without the switch: no readout, no probe, the module never fetched */
        const qOff = await Q.page.evaluate(() => ({ box: !!document.querySelector('[data-headframes]'), probe: typeof window.__btHeadFrames }));
        rec.ok(`without ?headframes there is no readout, no probe, and the counter is never fetched (${qAsked.length} asked)`,
          !qOff.box && qOff.probe === 'undefined' && qAsked.length === 0, { qOff, qAsked });
        const here = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
        await H.hopTo(Q, here.x + 80, here.y + 40, { step: 100, gap: 260, tries: 60 }).catch(() => null);
        const seen = await H.waitFor(P, (S) => (S.others ? Object.keys(S.others).length : 0), (v) => v > 0, { timeout: 20000, label: 'the peer seen' }).catch(() => 0);
        await P.page.waitForTimeout(2000);
        const pc = await phase('a peer jogging, rolling and turning in sight', async () => {
          for (const keys of Object.values(FACINGS)) await hold(Q, keys, 900);
          for (let r = 0; r < 2; r++) for (const keys of Object.values(FACINGS)) await hold(Q, keys, 200);
          for (const keys of [FACINGS.east, FACINGS.west, FACINGS.north, FACINGS.south]) {
            for (const k of keys) await Q.page.keyboard.down(k);
            await Q.page.waitForTimeout(150);
            await Q.page.keyboard.press('x');
            await Q.page.waitForTimeout(800);
            for (const k of keys) await Q.page.keyboard.up(k);
          }
        });
        rec.ok(`the peer was in sight (guard: ${seen} seen, ${pc && pc.ot ? pc.ot.counted : 0} of their piece-frames counted)`, !!seen && !!pc && !!pc.ot && pc.ot.counted > 20, { seen });
      } finally {
        await Q.ctx.close().catch(() => {});
      }
    }

    if (!ONLY || ONLY === 'fight') {
      /* armed, then to the Flame Fields' monsters */
      const armed = await H.armWorker(P, wsPort, me, ['bow']).catch(() => []);
      const swordHeld = () => H.readState(P, (S) => !!(S.rpg.weapon && S.rpg.weapon.type === 'greatsword'));
      for (let t = 0; t < 3 && !(await swordHeld()); t++) {
        await P.page.evaluate(() => { const R = window._gameState.current.rpg; if (R && !(R.weapon && R.weapon.type === 'greatsword')) R.weapon = null; });
        await H.equipWeapon(P, 'greatsword', 'weapon', 'melee').catch(() => null);
        for (let i = 0; i < 40 && !(await swordHeld()); i++) await P.page.waitForTimeout(250);
      }
      const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
      const at = WHEEL_SPAWNS.ember && WHEEL_SPAWNS.ember.points[0];
      if (at) await H.glideTo(P, at[0], at[1] + 40).catch(() => null);
      await P.page.waitForTimeout(2500);
      let hits = 0;
      await phase('a fight: sword swings and bow shots', async () => {
        for (let r = 0; r < ROUNDS; r++) {
          hits += await fight(P, 'Digit1', 'melee', 2500).catch(() => 0);
          hits += await fight(P, 'Digit2', 'ranged', 2500).catch(() => 0);
        }
      });
      rec.ok(`the fight happened (guard: ${hits} rounds swung or shot, ${armed.join(', ') || 'no bow'}${(await swordHeld()) ? ', greatsword' : ''})`, hits > 0, { hits, armed });

    }

    for (const { name, c } of phases) {
      rec.ok(`${name}: every worn head piece drawn in every frame (${c ? c.frames : '?'} frames, ${c ? c.counted : '?'} piece-frames, ${c ? c.missed : '?'} missing${c && c.bodyGone ? `, ${c.bodyGone} with no bro drawn` : ''})`,
        !!c && c.frames > 8 && c.missed === 0, c ? { byWhy: c.byWhy, log: c.log.slice(-10) } : null);
      rec.ok(`${name}: every other bro's and townsperson's worn head pieces drawn in every frame (${c && c.ot ? c.ot.counted : '?'} piece-frames, ${c && c.ot ? c.ot.missed : '?'} missing)`,
        !!c && !!c.ot && c.ot.missed === 0, c && c.ot ? { byWhy: c.ot.byWhy, log: c.ot.log.slice(-10) } : null);
      rec.ok(`${name}: and on the screen, every frame (${c && c.px ? c.px.looked : '?'} piece-frames read back, ${c && c.px ? c.px.drops : '?'} under a quarter of the piece's usual pixels)`,
        !!c && !!c.px && c.px.looked > 8 && c.px.drops === 0, c && c.px ? { byCat: c.px.byCat, log: c.px.log.slice(-10) } : null);
    }
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 6));
  } finally {
    stop = true;
    await P.ctx.close().catch(() => {});
  }
}
