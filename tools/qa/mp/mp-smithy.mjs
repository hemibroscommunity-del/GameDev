/* THE BLACKSMITH, REBUILT (v2.3.2826-2827)
 *
 * Owner: "I hate the blacksmithing menu.  I almost want to Delete it and
 * start from scratch.  Nobody wants to read a novel to know how it works."
 * And: "is there an existing animation that I can repurpose for the act of
 * smelting ore into armor?  Maybe you can add code effects for the flame
 * part too."
 *
 * A real client, a real worker, through the real door:
 *   1. The panel opens LOW, with four tabs, and says little (a text budget
 *      per tab -- the complaint was the reading).
 *   2. Smelt: the smith works -- mining swing, anvil, fire, strike sparks.
 *   3. Forge: a wooden greatsword is forged by the WORKER (3 pine logs +
 *      8 gold), and the panel says so.
 *   4. Upgrade: a harden attempt is settled by the worker (500 gold).
 *   5. Amulet: the rows are there, and costs are chips, not sentences.
 */
import * as H from './harness.mjs';

const shot = (P, name) => P.page.screenshot({ path: `tools/qa/mp/out/smithy-${name}.png` }).catch(() => {});
const put = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState.current;
  S.player.x = px; S.player.y = py; S.player.vx = 0; S.player.vy = 0;
}, { px: x, py: y });
const panelText = (P) => P.page.$eval('[data-smithy]', (el) => el.innerText.replace(/\s+/g, ' ').trim()).catch(() => '');
const tab = async (P, id) => { await P.page.click(`[data-smithy-tab="${id}"]`); await P.page.waitForTimeout(250); };
/* Readable words only: numbers and costs are chips, and the owner's
   complaint was prose.  The old panel ran ~900 characters on one screen. */
const TEXT_BUDGET = 200;

/* Keep the worker's harden answers, so a refusal says why -- and mark the
   first-run coach bubbles seen (mp-lightfx's COACH_OFF): one of them sits
   right over the anvil in the close-up. */
const recordReplies = () => {
  try {
    const d = {};
    for (const k of ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle', 'blockRanged', 'attack', 'special', 'chatTap', 'passkey']) d[k] = true;
    localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  } catch (e) { /* private mode */ }
  window.__hardenReplies = [];
  const OrigWS = window.WebSocket;
  window.WebSocket = function (...a) {
    const ws = new OrigWS(...a);
    ws.addEventListener('message', (ev) => {
      try {
        const m = JSON.parse(ev.data);
        const look = (e) => { if (e && e.type === 'harden_result') window.__hardenReplies.push(e.payload); };
        look(m);
        if (m && Array.isArray(m.events)) m.events.forEach(look);
        if (m && Array.isArray(m.batch)) m.batch.forEach(look);
      } catch (e) { /* not JSON */ }
    });
    return ws;
  };
  window.WebSocket.prototype = OrigWS.prototype;
  Object.assign(window.WebSocket, { OPEN: OrigWS.OPEN, CLOSED: OrigWS.CLOSED, CONNECTING: OrigWS.CONNECTING, CLOSING: OrigWS.CLOSING });
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Smithy', wsPort, webPort, viewport: { width: 390, height: 844 }, init: recordReplies });
  await H.enterWorld(P);
  await P.page.waitForFunction(() => !document.body.innerText.includes('WELCOME'), null, { timeout: 15000 }).catch(() => {});
  const me = await H.readState(P, (S) => S.myId);
  await H.grant(wsPort, me, 'item', { invKey: 'ore_copper_ore', count: 10 });
  await H.grant(wsPort, me, 'item', { invKey: 'wood_pine_log', count: 3 });
  await H.grant(wsPort, me, 'gold', { amount: 600 });
  await P.page.waitForTimeout(1200);

  const forge = await P.page.evaluate(() =>
    (window.__btWorldProps ? window.__btWorldProps() : []).find((p) => p.action === 'forge') || null);
  await put(P, forge.x, forge.y + 55);
  await P.page.waitForTimeout(500);
  await P.page.keyboard.press('e');
  const opened = await P.page.waitForSelector('[data-smithy]', { timeout: 5000 }).then(() => true).catch(() => false);
  rec.ok('the Blacksmith door opens the new panel', opened);
  if (!opened) { await shot(P, 'no-panel'); return; }

  /* ── 1. Layout ── */
  const tabs = await P.page.$$eval('[data-smithy-tab]', (b) => b.map((x) => x.getAttribute('data-smithy-tab')));
  rec.ok('four tabs: Smelt, Forge, Upgrade, Amulet', tabs.join(',') === 'smelt,forge,upgrade,amulet', tabs);
  const geo = await P.page.evaluate(() => {
    const c = document.querySelector('.bt-inspect-card').getBoundingClientRect();
    const el = document.querySelector('.bt-inspect-card');
    return { top: Math.round(c.top), h: Math.round(c.height), vh: window.innerHeight, maxH: getComputedStyle(el).maxHeight,
      inl: el.style.maxHeight, dash: getComputedStyle(document.documentElement).getPropertyValue('--dash-h'),
      wrapAlign: getComputedStyle(el.parentElement).alignItems };
  });
  const fig = await H.figureBox(P, { pad: 0 }).catch(() => null);
  const feet = fig ? Math.round(fig.y + fig.height) : null;
  rec.ok('the panel\'s top stays below the smith\'s feet, so he is seen working', feet != null && geo.top >= feet - 4, { ...geo, feet });
  for (const id of tabs) {
    await tab(P, id);
    const words = (await panelText(P)).replace(/[\d/×()+→·%◆.,:-]+/g, ' ').replace(/\s+/g, ' ').trim();
    rec.ok(`the ${id} tab reads in a glance (${words.length} characters of words, budget ${TEXT_BUDGET})`, words.length <= TEXT_BUDGET, words);
  }

  /* ── 2. Smelt: the smith at work ── */
  await tab(P, 'smelt');
  await shot(P, 'smelt');
  await P.page.evaluate(() => { window.__btSmithStrikes = 0; });
  await P.page.click('[data-smelt-all="bar_copper"]');
  await P.page.waitForTimeout(700);
  const work = await H.readState(P, (S) => ({ on: !!(S._smithing && Date.now() < S._smithing.until), kind: S._smithing && S._smithing.kind }));
  rec.ok('pressing Smelt sets the smith to work', work.on && work.kind === 'smelt', work);
  await shot(P, 'working');
  /* a close-up of the anvil under the pick, with the panel out of the way */
  const clip = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return { cx: Math.round(window.innerWidth / 2), cy: Math.round(window.innerHeight / 2) };
  });
  await P.page.evaluate(() => { const c = document.querySelector('.bt-inspect'); if (c) c.style.visibility = 'hidden'; });
  await P.page.waitForTimeout(350);
  await P.page.screenshot({ path: 'tools/qa/mp/out/smithy-anvil.png', clip: { x: clip.cx - 110, y: clip.cy - 110, width: 220, height: 220 } }).catch(() => {});
  await P.page.evaluate(() => { const c = document.querySelector('.bt-inspect'); if (c) c.style.visibility = ''; });
  await P.page.waitForTimeout(1600);
  const strikes = await P.page.evaluate(() => window.__btSmithStrikes || 0);
  rec.ok('...the hammer lands (strike sparks + clink) on the swing\'s contact frame', strikes >= 2, { strikes });
  const bars = await H.readState(P, (S) => (S.rpg.inventory || {}).bar_copper || 0);
  rec.ok('...and the worker made the bars (10 ore -> 2)', bars === 2, { bars });

  /* ── 3. Forge ── */
  await tab(P, 'forge');
  const woodRow = await P.page.$eval('[data-forge-row="wood"]', (el) => el.innerText).catch(() => '');
  rec.ok('the Forge tab offers the wood greatsword with its costs as chips (3/3 logs, gold)', /3\/3/.test(woodRow) && /\/8/.test(woodRow), woodRow);
  const lockRow = await P.page.$eval('[data-forge-row="copper"]', (el) => el.innerText).catch(() => '');
  rec.ok('...and the next tier shows the ONE thing missing as a lock', /Smithing 6/.test(lockRow), lockRow);
  await shot(P, 'forge');
  await P.page.click('[data-forge-go="wood"]');
  const forged = await P.page.waitForFunction(() => {
    const w = window._gameState.current.rpg.weapon;
    return w && w.gearBase === 'wood' && w.type === 'greatsword';
  }, null, { timeout: 6000 }).then(() => true).catch(() => false);
  rec.ok('Forge: the worker minted a wooden greatsword into your hand', forged);

  /* ── 4. Upgrade ── */
  await tab(P, 'upgrade');
  const c0 = await H.readState(P, (S) => S.rpg.coins || 0);
  const hRow = await P.page.$eval('[data-harden-row]', (el) => el.innerText).catch(() => '');
  rec.ok('Upgrade shows H0 → H1 with its cost and odds', /H0 → H1/.test(hRow) && /\/500/.test(hRow) && /80%/.test(hRow), hRow);
  /* The worker gates hardening on Smithing = 5 x the weapon's tier (wood is
     tier 1).  The panel must SAY so rather than offer a button it refuses. */
  const gated = await P.page.$eval('[data-harden-go]', (b) => b.disabled).catch(() => null);
  rec.ok('...and below Smithing 5 it shows the lock and holds the button (the worker would refuse)',
    gated === true && /Smithing 5/.test(hRow), { gated, hRow });
  /* earn it: 20 more ore -> 4 bars -> Smithing 5 */
  await H.grant(wsPort, me, 'item', { invKey: 'ore_copper_ore', count: 20 });
  await P.page.waitForTimeout(900);
  await tab(P, 'smelt');
  await P.page.click('[data-smelt-all="bar_copper"]');
  await P.page.waitForFunction(() => ((window._gameState.current.rpg.lifeSkills || {}).blacksmithing || {}).level >= 5, null, { timeout: 8000 }).catch(() => {});
  await tab(P, 'upgrade');
  await shot(P, 'upgrade');
  await P.page.click('[data-harden-go]');
  const paid = await P.page.waitForFunction((c) => (window._gameState.current.rpg.coins || 0) <= c - 500, c0, { timeout: 6000 }).then(() => true).catch(() => false);
  const replies = await P.page.evaluate(() => window.__hardenReplies);
  rec.ok('Harden: the worker took the 500 gold and rolled it', paid && replies.length === 1 && replies[0].cost === 500,
    { c0, now: await H.readState(P, (S) => S.rpg.coins), replies });

  /* ── 5. Amulet ── */
  await tab(P, 'amulet');
  const aRows = await P.page.$$eval('[data-amulet-row]', (r) => r.length);
  rec.ok('the Amulet tab lists the amulet tiers', aRows >= 2, { aRows });
  await shot(P, 'amulet');

  /* A clean look at the smith working: panel shut, celebration gone, the
     work started directly (display state only -- nothing is sent). */
  await P.page.keyboard.press('Escape');
  await P.page.waitForTimeout(3500);
  /* the first-run coach bubble sits right where the anvil is drawn */
  await P.page.evaluate(() => {
    /* hide (for the photo only) the smallest box that holds the coach text */
    let best = null;
    for (const el of document.querySelectorAll('div')) {
      const t = (el.innerText || '').trim();
      if (/^YOUR DASHBOARD/i.test(t) && (!best || t.length < (best.innerText || '').length)) best = el;
    }
    if (best) best.style.visibility = 'hidden';
  });
  await P.page.waitForTimeout(400);
  await put(P, 1300, 1250);    /* open plaza cobble, clear of every prop */
  await P.page.waitForTimeout(900);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const n = Date.now();
    S._smithing = { t0: n, until: n + 6000, kind: 'smelt', x: S.player.x, y: S.player.y };
  });
  await P.page.waitForTimeout(500);
  const box = await H.figureBox(P, { pad: 130 }).catch(() => null);
  await P.page.screenshot({ path: 'tools/qa/mp/out/smithy-work.png', clip: box || undefined }).catch(() => {});
  await P.page.waitForTimeout(260);
  await P.page.screenshot({ path: 'tools/qa/mp/out/smithy-work2.png', clip: box || undefined }).catch(() => {});
}
