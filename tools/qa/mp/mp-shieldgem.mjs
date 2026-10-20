/* A GEM GOES INTO A SHIELD ON THE WORKER (v2.3.3187)
 *
 * The owner, on the overnight hunt's report: "Go recommended fixes" (its
 * decision 11).  The Enchanter's shield gem slot was this browser's alone:
 * the worker's next player_state put the gem back on the count, and the
 * Blacksmith's Take out found no gem on the worker's shield ("Could not
 * remove the gem").
 *
 * A real client against a real worker, in the Wheel's BroTown, through the
 * Gem Works' (its Set gems tab is the Enchanter; v2.3.3259, the Assay Office's
 * until then) and the Blacksmith's real doors, on a phone:
 *   1. caps.shieldgem; the tutorial's Pine Shield (the dev kit mints it as
 *      tut_1 does) worn, and two polished gems of each element;
 *   2. the Enchanter's flame button ASKS: the shield takes the gem and the
 *      worker's name for it ("Wood Flame Shield"), the count drops to one --
 *      on the screen AND in the worker's saved record;
 *   3. a refusal (a shield the worker does not hold) changes nothing and says
 *      why under the Enchanter's buttons;
 *   4. a reload keeps both: the gem in the shield, and the count at one
 *      (before, the count came back to two);
 *   5. the Blacksmith's Take out gives the gem back: the shield bare on the
 *      screen (the worker's copy adopted by id), the count two again, and no
 *      Take out row left;
 *   6. an old shield (no id, adopted from the bag at a join) takes a gem and
 *      KEEPS ITS NAME, on both sides; an answer the game never got mends at
 *      the next join, by signature, with no second copy anywhere; no page
 *      errors.
 * Pictures: tools/qa/mp/out/shieldgem-*.png.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const shot = (P, name) => P.page.screenshot({ path: `tools/qa/mp/out/shieldgem-${name}.png` }).catch(() => {});
const put = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState.current;
  S.player.x = px; S.player.y = py; S.player.vx = 0; S.player.vy = 0;
}, { px: x, py: y });
const state = (P) => H.readState(P, (S) => {
  const R = S.rpg || {};
  const g = (R.lifeSkills && R.lifeSkills.gems) || {};
  const sh = R.shield ? { name: R.shield.name, gem: R.shield.gem || null, gid: R.shield.gid || null } : null;
  const inv = R.inventory || {};   /* v2.3.3516: gems are bag items (`gem_<e>`), and any an old pouch still holds */
  return { shield: sh, flame: (inv.gem_flame || 0) + (g.polished_flame || 0), frost: (inv.gem_frost || 0) + (g.polished_frost || 0), bag: (R.shieldStash || []).map((p) => p && { name: p.name, gid: p.gid || null }) };
});
const lastLog = (P) => P.page.evaluate(() => { const l = window.__btShieldGemLog || []; return l.length ? l[l.length - 1] : null; });
const server = async (wsPort, id) => {
  const a = await H.adminPlayer(wsPort, id);
  const rpg = (a && a.rpg) || {};
  const g = (rpg.lifeSkills && rpg.lifeSkills.gems) || {};
  const inv = rpg.inventory || {};   /* v2.3.3516: gems are bag items */
  return { shield: rpg.shield ? { name: rpg.shield.name, gem: rpg.shield.gem || null, gid: rpg.shield.gid || null } : null, flame: (inv.gem_flame || 0) + (g.polished_flame || 0) };
};
const until = async (P, pred, tries = 24, ms = 250) => {
  let s = null;
  for (let i = 0; i < tries; i++) { s = await state(P); if (pred(s)) return s; await P.page.waitForTimeout(ms); }
  return s;
};

export async function run({ browser, wsPort, webPort, rec }) {
  /* in the Wheel's BroTown: today's town has no Enchanter door (the Wheel's
     twelve open the old town's panels, v2.3.3032; mp-wheeldoors) */
  const P = await H.newPlayer(browser, { name: 'Gemsetter', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  let stopAlive = false;
  try {
    await H.enterWorld(P);
    const zoneNow = () => H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
    const waitWheel = async (ms = 60000) => {
      for (let t0 = Date.now(); Date.now() - t0 < ms;) { if ((await zoneNow()) === 'wheel') return true; await P.page.waitForTimeout(400); }
      return false;
    };
    const inWheel = await waitWheel();
    const caps = await H.readState(P, (S) => !!(S._serverCaps && S._serverCaps.shieldgem));
    rec.ok('the worker advertises caps.shieldgem (in the Wheel\'s BroTown)', caps && inWheel, { caps, inWheel });
    if (!caps || !inWheel) return;
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'quests', me);
    (async () => {
      while (!stopAlive) {
        await P.page.keyboard.press('Control').catch(() => {});
        for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
      }
    })();

    /* the doors, from the worker's answer (mp-wheeldoors) */
    let doors = [];
    for (let i = 0; i < 40 && doors.length < 17; i++) {
      doors = await P.page.evaluate(() => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []));
      if (doors.length < 17) await P.page.waitForTimeout(500);
    }
    const byId = Object.fromEntries(doors.map((d) => [d.id, d]));
    const standAt = async (x, bootsY) => {
      for (let k = 0; k < 4; k++) {
        const dy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g.y - S.player.y; });
        await H.hopTo(P, x, bootsY - dy, { step: 100, gap: 260, tries: 90 });
        await P.page.waitForTimeout(800);
        const g = await P.page.evaluate(() => window.__btPlayerGround());
        if (Math.hypot(g.x - x, g.y - bootsY) < 12) return true;
      }
      return false;
    };
    const panelKey = () => P.page.evaluate(() => { const c = document.querySelector('.bt-inspect-card'); return c ? c.getAttribute('data-building-panel') : null; });
    const closePanel = async () => {
      await P.page.evaluate(() => { const b = document.querySelector('.bt-inspect-close'); if (b) b.click(); });
      await P.page.waitForTimeout(350);
    };
    /* walk to a door and tap Enter, as mp-wheeldoors does */
    const enter = async (id, want) => {
      const d = byId[id];
      if (!d) return null;
      await standAt(d.x, d.y + 30);
      let btn = false;
      for (let i = 0; i < 16 && !btn; i++) {
        btn = await P.page.evaluate(() => !!Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')));
        if (!btn) await P.page.waitForTimeout(250);
      }
      if (!btn) return null;
      await P.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')); if (b) b.click(); });
      let opened = null;
      for (let i = 0; i < 16 && opened !== want; i++) { await P.page.waitForTimeout(250); opened = await panelKey(); }
      return opened;
    };
    /* v2.3.3259: the Enchanter is the Gem Works' "Set gems" tab -- the Assay Office is gone (the owner: "one gem building is
       enough") -- so its door opens the cutter's tab, and a tap on the other brings the Enchanter */
    const enterSetGems = async () => {
      const cut = await enter('gemcutter', 'gemcut');
      if (cut !== 'gemcut') return cut;
      await P.page.evaluate(() => { const b = document.querySelector('[data-gem-works] button[data-gem-tab="enchant"]'); if (b) b.click(); });
      let opened = null;
      for (let i = 0; i < 16 && opened !== 'enchant'; i++) { await P.page.waitForTimeout(250); opened = await panelKey(); }
      return opened;
    };

    /* ── 1. a Pine Shield on the arm, two gems of each element ── */
    await H.devOp(wsPort, 'kit', me, { what: 'shield' });
    const s0 = await until(P, (s) => s.bag.some((p) => p && p.gid && /Pine Shield/.test(p.name)));
    const pine = s0.bag.find((p) => p && p.gid && /Pine Shield/.test(p.name));
    rec.ok('the Pine Shield lands in the bag with the worker\'s id', !!pine, s0);
    if (!pine) return;
    /* worn as the bag's Equip wears it (ItemDetailPopup): onto the arm, and the
       worker told which (shield_wear, shieldWear.js) */
    await P.page.evaluate((gid) => {
      const S = window._gameState.current;
      const R = S.rpg;
      const i = R.shieldStash.findIndex((p) => p && p.gid === gid);
      if (R.shield) R.shieldStash.push(R.shield);
      R.shield = R.shieldStash.splice(i, 1)[0];
      S.channel.send({ type: 'shield_wear', payload: { gid } });
    }, pine.gid);
    await H.devOp(wsPort, 'kit', me, { what: 'gems', count: 2 });
    const s1 = await until(P, (s) => s.flame === 2 && s.frost === 2 && !!s.shield);
    rec.ok('worn, with two polished gems of each element (the worker\'s count, on the screen)', !!s1.shield && s1.shield.gid === pine.gid && s1.flame === 2, s1);

    /* ── 2. the Enchanter's flame button ── */
    const ench = await enterSetGems();
    const pill = ench === 'enchant' && await P.page.waitForSelector('[data-shield-gem="flame"]', { timeout: 6000 }).then(() => true).catch(() => false);
    await P.page.evaluate(() => { const e = document.querySelector('[data-shield-gem]'); if (e) e.scrollIntoView({ block: 'center' }); });
    await shot(P, 'enchanter');
    rec.ok('the Gem Works\' Set gems tab (the Enchanter) offers the shield a flame gem', !!pill, { ench });
    if (!pill) return;
    await P.page.click('[data-shield-gem="flame"]', { force: true });
    const s2 = await until(P, (s) => s.shield && s.shield.gem === 'flame' && s.flame === 1);
    const log2 = await lastLog(P);
    await P.page.waitForTimeout(400);
    await shot(P, 'slotted');
    rec.ok(`the worker put it in: the shield is "${s2.shield && s2.shield.name}" with the flame gem, one flame gem left`,
      !!s2.shield && s2.shield.gem === 'flame' && s2.shield.name === 'Wood Flame Shield' && s2.flame === 1 && !!log2 && log2.ok === true, { s2, log2 });
    let sv = null;
    for (let i = 0; i < 20; i++) { sv = await server(wsPort, me); if (sv.shield && sv.shield.gem === 'flame') break; await P.page.waitForTimeout(250); }
    rec.ok('...and so says the worker\'s saved record (the shield\'s gem, the count of one)', !!sv.shield && sv.shield.gem === 'flame' && sv.shield.gid === pine.gid && sv.flame === 1, sv);

    /* ── 3. a refusal says why, and changes nothing ── */
    const before = await state(P);
    await P.page.evaluate(() => {
      /* a shield the worker does not hold: the ask the button would make, by
         an id it never minted */
      window._gameState.current.channel.send({ type: 'shield_gem', payload: { gem: 'frost', gid: 'g_not_mine' } });
    });
    let refused = null;
    for (let i = 0; i < 20; i++) { refused = await lastLog(P); if (refused && refused.ok === false) break; await P.page.waitForTimeout(250); }
    await P.page.waitForTimeout(400);
    const line = await P.page.$eval('[data-shield-gem-refused]', (e) => ({ reason: e.getAttribute('data-shield-gem-refused'), text: e.textContent })).catch(() => null);
    const after = await state(P);
    await shot(P, 'refused');
    rec.ok(`refused ("${line && line.text}"), the reason under the buttons, nothing changed`, !!refused && refused.ok === false && refused.reason === 'not_held'
      && !!line && line.reason === 'not_held' && JSON.stringify(before) === JSON.stringify(after), { refused, line, before, after });
    await closePanel();

    /* ── 4. a reload keeps both ── */
    stopAlive = true;
    await P.page.reload();
    await H.enterWorld(P);
    await waitWheel();
    await P.page.waitForTimeout(2000);
    stopAlive = false;
    (async () => {
      while (!stopAlive) {
        await P.page.keyboard.press('Control').catch(() => {});
        for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
      }
    })();
    const s3 = await until(P, (s) => !!s.shield && s.flame >= 1, 30);
    rec.ok('after a reload the shield still has its gem, and the count stays at one (it used to come back to two)',
      !!s3.shield && s3.shield.gem === 'flame' && s3.flame === 1, s3);

    /* ── 5. the Blacksmith's Take out ── */
    await H.grant(wsPort, me, 'gold', { amount: 5000 });
    await P.page.waitForTimeout(600);
    for (let i = 0; i < 40 && Object.keys(byId).length < 17; i++) await P.page.waitForTimeout(250);
    const smith = await enter('blacksmith', 'forge');
    if (smith === 'forge') { await P.page.click('[data-smithy-tab="upgrade"]').catch(() => {}); await P.page.waitForTimeout(500); }
    const row = await P.page.$('[data-extract-row="shield"]');
    await shot(P, 'take-out');
    rec.ok('the Blacksmith offers to take the shield\'s gem out', !!row, { smith });
    if (row) {
      await row.$eval('button', (b) => b.click()).catch(() => {});
      const s4 = await until(P, (s) => s.shield && !s.shield.gem && s.flame === 2, 30);
      await P.page.waitForTimeout(800);
      const left = await P.page.$('[data-extract-row="shield"]');
      await shot(P, 'taken-out');
      rec.ok(`Take out gives it back: the shield is bare ("${s4.shield && s4.shield.name}"), two flame gems, and no Take out row left`,
        !!s4.shield && !s4.shield.gem && s4.flame === 2 && !left, { s4, left: !!left });
    }
    await closePanel();

    /* ── 6. a shield from before the ledger (no id) ── */
    const OLD = { name: 'Old Oak Shield', gearBase: 'wood', tierMult: 1, tier: 'common' };
    const oldSig = [OLD.name, OLD.gearBase, OLD.tierMult, OLD.tier].join('|');
    const reloadIn = async (prep) => {
      stopAlive = true;
      if (prep) await P.page.evaluate(prep.fn, prep.arg);
      await P.page.reload();
      await H.enterWorld(P);
      await waitWheel();
      await P.page.waitForTimeout(2500);
      stopAlive = false;
      (async () => {
        while (!stopAlive) {
          await P.page.keyboard.press('Control').catch(() => {});
          for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
        }
      })();
    };
    /* it reaches the worker the way an old one does: in the bag the game
       offers at the join (gearstash.js adopts it, unproven) */
    await reloadIn({ fn: (o) => {
      const R = window._gameState.current.rpg;
      R.shieldStash = (R.shieldStash || []).concat([o]);
      localStorage.setItem('bt_rpg', JSON.stringify(R));
    }, arg: OLD });
    const oldCount = (list) => (list || []).filter((p) => p && p.name === OLD.name).length;
    let svOld = await H.adminPlayer(wsPort, me);
    rec.ok('an old shield from the bag is the worker\'s too (adopted at the join, no id)',
      oldCount(((svOld && svOld.rpg) || {}).shieldStash) === 1, ((svOld && svOld.rpg) || {}).shieldStash);
    await P.page.evaluate((sig) => {
      const S = window._gameState.current;
      const R = S.rpg;
      const i = R.shieldStash.findIndex((p) => p && !p.gid && [p.name || '', p.gearBase || '', p.tierMult == null ? '' : p.tierMult, p.tier || ''].join('|') === sig);
      if (R.shield) R.shieldStash.push(R.shield);
      R.shield = R.shieldStash.splice(i, 1)[0];
      S.channel.send({ type: 'shield_wear', payload: { sig } });
    }, oldSig);
    await P.page.waitForTimeout(800);
    const ench2 = await enterSetGems();
    const pill2 = ench2 === 'enchant' && await P.page.waitForSelector('[data-shield-gem="frost"]', { timeout: 6000 }).then(() => true).catch(() => false);
    if (pill2) await P.page.click('[data-shield-gem="frost"]', { force: true });
    const s6 = await until(P, (s) => s.shield && s.shield.gem === 'frost');
    for (let i = 0; i < 20; i++) { svOld = await H.adminPlayer(wsPort, me); const a = svOld && svOld.rpg && svOld.rpg.shield; if (a && a.gem === 'frost') break; await P.page.waitForTimeout(250); }
    const arm = (svOld && svOld.rpg && svOld.rpg.shield) || null;
    await shot(P, 'old-shield');
    rec.ok(`the old shield takes the frost gem and KEEPS ITS NAME ("${s6.shield && s6.shield.name}"), on the screen and in the worker's record`,
      !!pill2 && !!s6.shield && s6.shield.gem === 'frost' && s6.shield.name === OLD.name && !!arm && arm.gem === 'frost' && arm.name === OLD.name && !arm.gid,
      { s6, arm });
    await closePanel();
    /* an answer the game never got: its copy loses the gem, then a reload --
       the join's echo puts the worker's gem back on it, by its signature,
       with no second copy anywhere */
    await reloadIn({ fn: () => {
      const R = window._gameState.current.rpg;
      if (R.shield) R.shield.gem = null;
      localStorage.setItem('bt_rpg', JSON.stringify(R));
    } });
    const s7 = await until(P, (s) => s.shield && s.shield.gem === 'frost', 30);
    const bag7 = await H.readState(P, (S) => (S.rpg.shieldStash || []).filter((p) => p && p.name === 'Old Oak Shield').length);
    svOld = await H.adminPlayer(wsPort, me);
    rec.ok('a lost answer mends itself: after a reload the old shield has the worker\'s frost gem again, and no second copy on either side',
      !!s7.shield && s7.shield.name === OLD.name && s7.shield.gem === 'frost' && bag7 === 0
        && oldCount(((svOld && svOld.rpg) || {}).shieldStash) === 0 && !!(svOld && svOld.rpg && svOld.rpg.shield) && svOld.rpg.shield.name === OLD.name,
      { s7, bag7, serverBag: ((svOld && svOld.rpg) || {}).shieldStash, serverArm: svOld && svOld.rpg && svOld.rpg.shield });
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    stopAlive = true;
    await P.ctx.close().catch(() => {});
  }
}
