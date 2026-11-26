/* ═══ mp-loadlift (v2.3.6760, card LOAD part 1): WHY THE LOADING SCREEN LIFTED ═══
 *
 * The owner's phone (2026-11-26): the pictures ready 11.9 s into the loading
 * screen, the world 13.1 s, yet the screen up 21.3 s -- IntroVideo's 20 s limit
 * plus its 1 s fade.  For a player in armour the screen lifts because its limit
 * fires, while the bro's own chain after the pictures (the worn armour's masked
 * body frames) is still baking.  The Test panel's Loading times now says why
 * the screen lifted (game/loadTimes.js markLift), the bro's own steps and the
 * armour's frames ready of wanted at that moment.  This reads it, on a phone
 * entering the Wheel:
 *   1. a BARE character: "Why it lifted: ready", every one of the bro's steps
 *      noted in the preload's order, the armour line "none worn";
 *   2. a character in the copper torso and greaves, logging in for the FIRST
 *      time in a fresh browser (nothing kept by the page: true before and after
 *      card LOAD part 2, whose store is the browser's own): "Why it lifted: its
 *      20 s limit", the armour's frames part-baked at the lift (have < want),
 *      the `masks` step not reached before the screen lifted, and the panel's
 *      text saying the same;
 *   3. no page errors.
 * Nothing about the game changes with this test: it only reads the marks.
 *
 *   node tools/qa/mp/run.mjs loadlift
 */
import * as H from './harness.mjs';
export const lane = 'full';

const PHONE = { width: 390, height: 844 };

const inWheel = (P) => H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l,
  { timeout: 150000, label: 'in the Wheel' }).then(() => true).catch(() => false);

/* the loading screen has gone and the lift was noted (the world step is the
   screen's end: markWorldIn) */
const readLift = async (P) => {
  const lt = await H.waitFor(P, () => (window.__btLoadTimes ? window.__btLoadTimes() : null),
    (v) => !!v && !!v.lift && v.steps.every((s) => s.at != null), { timeout: 90000, label: 'the lift noted' }).catch(() => null)
    || await P.page.evaluate(() => (window.__btLoadTimes ? window.__btLoadTimes() : null));
  return { lt };
};

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── 1. a bare character ── */
  const A = await H.newPlayer(browser, { name: 'Barebro', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
  const stopA = H.keepAlive(A);
  let errsA = [];
  try {
    await H.enterWorld(A);
    rec.ok('setup: the bare character is in the Wheel (guard)', await inWheel(A));
    const { lt } = await readLift(A);
    console.log('    BARE ' + JSON.stringify({ bro: lt && lt.bro, lift: lt && lt.lift, screen: lt && lt.screen }));
    const bro = (lt && lt.bro) || [];
    const ordered = bro.length === 6 && bro.every((b, i) => typeof b.at === 'number' && (i === 0 || b.at >= bro[i - 1].at));
    rec.ok(`1. a bare character: why it lifted reads "ready" (limit fired: ${lt && lt.lift && lt.lift.limit}), the armour "none worn" (${JSON.stringify(lt && lt.lift && lt.lift.armour)}), the bro's six steps in order (${bro.map((b) => b.at).join(', ')} s)`,
      !!lt && !!lt.lift && lt.lift.limit === false && !!lt.lift.armour && lt.lift.armour.want === 0 && ordered, { bro, lift: lt && lt.lift });
  } finally {
    stopA();
    errsA = A.logs.filter((l) => l.startsWith('pageerror'));
    await A.ctx.close().catch(() => {});
  }

  /* ── 2. a character in copper, logging in again in a fresh browser ── */
  const C = await H.newPlayer(browser, { name: 'Copperbro', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
  const stopC = H.keepAlive(C);
  let key = null;
  try {
    await H.enterWorld(C);
    rec.ok('setup: the copper character is in the Wheel (guard)', await inWheel(C));
    await C.page.waitForTimeout(1500);
    const myId = await H.readState(C, (S) => S.myId);
    /* the copper torso and greaves, worn the way mp-armourflash wears them */
    await H.devOp(wsPort, 'kit', myId, { what: 'armor' });
    let pieces = null;
    for (let i = 0; i < 40 && !pieces; i++) {
      pieces = await C.page.evaluate(() => {
        const R = window._gameState.current.rpg || {};
        const t = (R.armorStash || []).find((x) => x && x.mat === 'copper' && x.gid);
        const l = (R.legsStash || []).find((x) => x && x.mat === 'copper' && x.gid);
        return t && l ? { t: t.gid, l: l.gid } : null;
      });
      if (!pieces) await C.page.waitForTimeout(300);
    }
    rec.ok('setup: the kit gave a copper torso and copper greaves (guard)', !!pieces, pieces);
    if (pieces) {
      await C.page.evaluate((p) => {
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
    const worn = await H.waitFor(C, () => ({
      chest: window.__btGetGear ? window.__btGetGear('chest') : null, legs: window.__btGetGear ? window.__btGetGear('legs') : null,
    }), (v) => v && v.chest === 'copperplate' && v.legs === 'coppergreaves', { timeout: 15000, label: 'the armour worn' }).catch((e) => ({ err: String(e.message || e).slice(0, 160) }));
    rec.ok('setup: the copper torso and greaves are worn (guard)', !!worn && !worn.err, worn);
    /* the worker has the worn set on file before this browser goes (a login in
       a new browser reads the record) */
    let onFile = false;
    for (let i = 0; i < 40 && !onFile; i++) {
      const rpg = (await H.adminPlayer(wsPort, myId)).rpg || {};
      const w = JSON.stringify([rpg.armor, rpg.legsArmor, rpg.armorRef, rpg.legsArmorRef]);
      onFile = /copper/.test(w) || !!(rpg.armorRef && rpg.legsArmorRef);
      if (!onFile) await C.page.waitForTimeout(500);
    }
    rec.ok('setup: the worker holds the worn set on file (guard)', onFile);
    key = await H.keyAndDevice(C);
  } finally {
    stopC();
    await C.ctx.close().catch(() => {});
  }
  rec.ok('setup: the character\'s Login Key is known (guard)', !!(key && key.phrase));
  if (!(key && key.phrase)) return;

  /* a new browser: nothing is kept in it (the same before and after part 2) */
  const B = await H.newPlayer(browser, { name: 'Copperbro', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, phrase: key.phrase, device: key.device });
  const stopB = H.keepAlive(B);
  try {
    await H.enterWorld(B, 240000);
    rec.ok('setup: the copper character is in the Wheel again (guard)', await inWheel(B));
    const { lt } = await readLift(B);
    /* the coverage read is what markLift does ONCE at the lift on the page's thread: its cost here, in ms */
    const cov = await B.page.evaluate(() => {
      if (!window.__btMaskedCoverage) return null;
      const t0 = performance.now();
      const c = window.__btMaskedCoverage();
      return { want: c.want, have: c.have, ms: +(performance.now() - t0).toFixed(1) };
    });
    const steps = await B.page.evaluate(() => window.__btPreloadSteps || null);
    console.log('    COPPER ' + JSON.stringify({ bro: lt && lt.bro, lift: lt && lt.lift, screen: lt && lt.screen, coverageNow: cov, steps }));
    const lift = lt && lt.lift;
    const bro = (lt && lt.bro) || [];
    const masks = bro.find((b) => b.key === 'bro-masks');
    rec.ok(`2. a character in copper, first login in this browser: why it lifted reads "its 20 s limit" (limit fired: ${lift && lift.limit}, ${lift && lift.capS} s)`,
      !!lift && lift.limit === true && lift.capS === 20, { lift });
    rec.ok(`2b. the armour's frames were part baked at the lift (${lift && lift.armour && lift.armour.have} of ${lift && lift.armour && lift.armour.want}), and the masks step came after the lift or never (masks ${masks && masks.at}, lift ${lift && lift.at} s)`,
      !!lift && !!lift.armour && lift.armour.want > 0 && lift.armour.have < lift.armour.want
        && (masks.at == null || masks.at >= lift.at), { lift, masks });
  } finally {
    stopB();
    const bad = B.logs.filter((l) => l.startsWith('pageerror')).concat(errsA);
    rec.ok(`3. nothing went wrong on the pages (${bad.length} page errors)`, bad.length === 0, bad.slice(0, 5));
    await B.ctx.close().catch(() => {});
  }
}
