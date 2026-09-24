/* THE DEMO-AUDIT POLISH PASS (v2.3.2820)
 *
 * Owner: "Fix feedback button. Do the quick polish."  The 2026-09-24 audit
 * found the Feedback panel lost every report (and shouted it to the room),
 * and listed the small gaps a demo player notices.  This walks each fix in a
 * real client against a real worker:
 *
 *   1. FEEDBACK ARRIVES: Send posts to /api/feedback/submit, the report is on
 *      the board (/api/feedback/list), the Browse tab lists it, and an
 *      up-vote counts.  The legacy socket event is no longer relayed: a
 *      second player never receives a `feedback` message.
 *   2. SOUND: Music and Effects sliders write BT_AUDIO's levels and persist;
 *      the Audio switch mutes LIVE (it used to write only localStorage).
 *   3. The Debug switch is gone without ?dev=1.
 *   4. PARTY CHAT: a Party lane exists only while you are in a party, sends
 *      /p, and a party line whose party has gone is refused, not shouted.
 *   5. DAILY REWARD: shown once as a toast, not in chat.
 *   6. ABOUT: privacy, rules and credits open from Settings.
 */
import * as H from './harness.mjs';

const shot = (P, name) => P.page.screenshot({ path: `tools/qa/mp/out/polish-${name}.png` }).catch(() => {});

/* Count every message type the socket RECEIVES, from the first line of the
   page, so "B never got a feedback event" is a measurement. */
const recordInbound = () => {
  window.__inTypes = Object.create(null);
  const OrigWS = window.WebSocket;
  window.WebSocket = function (...a) {
    const ws = new OrigWS(...a);
    ws.addEventListener('message', (ev) => {
      try {
        const m = JSON.parse(ev.data);
        const note = (t) => { if (t) window.__inTypes[t] = (window.__inTypes[t] || 0) + 1; };
        note(m && m.type);
        if (m && Array.isArray(m.events)) m.events.forEach((e) => note(e && e.type));
        if (m && Array.isArray(m.batch)) m.batch.forEach((e) => note(e && e.type));
      } catch (e) { /* binary or non-JSON */ }
    });
    return ws;
  };
  window.WebSocket.prototype = OrigWS.prototype;
  Object.assign(window.WebSocket, { OPEN: OrigWS.OPEN, CLOSED: OrigWS.CLOSED, CONNECTING: OrigWS.CONNECTING, CLOSING: OrigWS.CLOSING });
};

const bodyHas = (P, t) => P.page.evaluate((x) => document.body.innerText.includes(x), t);

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Scribe', nameB: 'Reader', init: recordInbound, chestOffer: true });

  /* ═══ 5. THE DAILY CHEST (owner: "a loot box ... instead of daily coin
     reward"; then, with the chest art: "you need to click the claim button to
     get it.  You can stack them.  It'll reveal whatever the reward is coming
     out of it.") ═══  The day paid a chest into the bag and the claim window
     opened by itself once the intro lifted. */
  const inChat = await A.page.evaluate(() => {
    const S = window._gameState.current;
    return (S.chatLog || []).some((m) => /Daily (reward|chest)/.test((m && (m.text || m.msg)) || ''));
  });
  rec.ok('the daily reward is still not a chat line (v2.3.2037)', inChat === false, { inChat });
  const hasChest = await H.readState(A, (S) => (S.rpg && S.rpg.inventory && S.rpg.inventory.daily_chest) || 0);
  rec.ok('DAILY CHEST: the day put a chest in the bag', hasChest === 1, { hasChest });
  await A.page.waitForSelector('[data-chest-window="offer"]', { timeout: 10000 }).catch(() => {});
  rec.ok('...and its claim window opened by itself after the intro', !!(await A.page.$('[data-chest-window="offer"]')));

  /* STACKING: a second chest (the same item the day pays) joins the stack. */
  const myIdA = await H.readState(A, (S) => S.myId);
  await H.grant(wsPort, myIdA, 'item', { invKey: 'daily_chest', count: 1 });
  await A.page.waitForFunction(() => document.body.innerText.includes('You have 2 chests waiting'), null, { timeout: 6000 }).catch(() => {});
  rec.ok('chests STACK: the window says two are waiting', await bodyHas(A, 'You have 2 chests waiting'));
  await shot(A, 'chest-offer');

  await A.page.click('[data-chest-claim]');
  const sawShake = await A.page.waitForSelector('[data-chest-window="shaking"]', { timeout: 2000 }).then(() => true).catch(() => false);
  rec.ok('Claim: the chest shakes while the worker rolls', sawShake);
  await A.page.waitForSelector('[data-chest-window="opening"]', { timeout: 8000 }).catch(() => {});
  await shot(A, 'chest-opening');
  await A.page.waitForSelector('[data-chest-reveal]', { timeout: 8000 }).catch(() => {});
  const reveal = await A.page.evaluate(() => {
    const el = document.querySelector('[data-chest-reveal]');
    return el ? { kind: el.getAttribute('data-chest-reveal'), text: el.textContent,
      icon: !!document.querySelector('[data-chest-prize-icon]'),
      frame: (document.querySelector('[data-chest-frame]') || {}).getAttribute && document.querySelector('[data-chest-frame]').getAttribute('data-chest-frame') } : null;
  });
  rec.ok('...then it opens and the prize comes out of it (text + icon, chest on its last frame)',
    !!reveal && /coins|Fish|Gem|Torso|Greaves/.test(reveal.text) && reveal.icon && reveal.frame === '8', reveal);
  await A.page.waitForTimeout(700);
  await shot(A, 'chest-reveal');
  const left = await H.readState(A, (S) => (S.rpg && S.rpg.inventory && S.rpg.inventory.daily_chest) || 0);
  rec.ok('...and the worker took exactly one chest', left === 1, { left });

  await A.page.click('[data-chest-claim]');
  await A.page.waitForFunction(() => {
    const w = document.querySelector('[data-chest-window]');
    return w && w.getAttribute('data-chest-window') === 'reveal' && !document.querySelector('[data-chest-claim]');
  }, null, { timeout: 10000 }).catch(() => {});
  const gone = await H.readState(A, (S) => (S.rpg && S.rpg.inventory && S.rpg.inventory.daily_chest) || 0);
  rec.ok('"Claim next" opens the second, and with none left only Done remains', gone === 0
    && !(await A.page.$('[data-chest-claim]')) && !!(await A.page.$('[data-chest-done]')), { gone });
  await A.page.click('[data-chest-done]');
  await A.page.waitForTimeout(300);
  rec.ok('Done closes the window', !(await A.page.$('[data-chest-window]')));

  /* The second player has its own chest window up -- "Later" keeps the chest
     and gets out of the way of the quest checks below. */
  await B.page.waitForSelector('[data-chest-window="offer"]', { timeout: 10000 }).catch(() => {});
  await B.page.click('text=Later').catch(() => {});
  await B.page.waitForTimeout(300);
  const bKept = await H.readState(B, (S) => (S.rpg && S.rpg.inventory && S.rpg.inventory.daily_chest) || 0);
  rec.ok('"Later" closes the window and keeps the chest in the bag',
    !(await B.page.$('[data-chest-window]')) && bKept === 1, { bKept });

  /* ═══ 7. THE COOKING QUEST'S STEPS (owner: "a lot of people get stuck on
     the quest for cooking 2 fish") ═══
     On the SECOND player: the first one just opened a chest, and a chest can
     roll 10 cooked fish -- which completes this quest outright and ticks
     every step, a pass/fail decided by the dice. */
  await B.page.evaluate(() => {
    const S = window._gameState.current;
    S.channel.send({ type: 'quest_accept', payload: { questId: 'life_1' } });
  });
  await H.waitFor(B, (S) => S.rpg && S.rpg._quests && S.rpg._quests.life_1, (v) => v === 'active',
    { timeout: 10000, label: 'life_1 active' }).catch(() => {});
  await B.page.waitForFunction(() => (window.__btToastLog || []).some((t) => /^Next: Catch a fish/.test(t)), null, { timeout: 6000 }).catch(() => {});
  rec.ok('accepting the quest says the first step', await B.page.evaluate(() => (window.__btToastLog || []).some((t) => /^Next: Catch a fish/.test(t))));
  const myId = await H.readState(B, (S) => S.myId);
  await H.grant(wsPort, myId, 'item', { invKey: 'fish_minnow', count: 1 });
  await H.grant(wsPort, myId, 'item', { invKey: 'wood_pine_log', count: 1 });
  await B.page.waitForFunction(() => (window.__btToastLog || []).some((t) => /^Next: Open your Bag and tap the log/.test(t)), null, { timeout: 8000 }).catch(() => {});
  rec.ok('...and with a fish and a log in the bag, it says the NEXT one: tap the log to light a fire',
    await B.page.evaluate(() => (window.__btToastLog || []).some((t) => /^Next: Open your Bag and tap the log/.test(t))));
  await H.openDest(B, 'Quests');
  await B.page.waitForFunction(() => document.body.innerText.includes('Next: Open your Bag'), null, { timeout: 6000 }).catch(() => {});
  rec.ok('the Quests list shows the next step on the quest row', await bodyHas(B, 'Next: Open your Bag'));
  await H.clickText(B, 'Learn a Trade');
  await B.page.waitForSelector('[data-quest-steps]', { timeout: 6000 }).catch(() => {});
  const steps = await B.page.evaluate(() => Array.from(document.querySelectorAll('[data-step-state]')).map((e) => e.getAttribute('data-step-state')));
  rec.ok('the quest page lists every step: fish and log ticked, lighting the fire next',
    steps.length === 6 && steps[0] === 'done' && steps[1] === 'done' && steps[2] === 'current', steps);
  await shot(B, 'quest-steps');
  await H.closeDest(B).catch(() => {});

  /* ═══ 1. FEEDBACK ═══ */
  await H.openDest(A, 'Settings');
  await H.clickText(A, 'Feedback — message the developers');
  await A.page.waitForSelector('[data-fb-text]', { timeout: 6000 });
  await A.page.click('[data-fb-cat="bug"]');
  await A.page.click('[data-fb-topic="ui"]');
  const stamp = 'mp-polish report ' + Date.now();
  await A.page.fill('[data-fb-text]', stamp);
  await shot(A, 'feedback-submit');
  await A.page.click('[data-fb-send]');
  await A.page.waitForFunction(() => {
    const el = document.querySelector('[data-fb-status]');
    return el && (el.getAttribute('data-fb-status') === 'sent' || el.getAttribute('data-fb-status') === 'error');
  }, null, { timeout: 8000 }).catch(() => {});
  const status = await A.page.evaluate(() => {
    const el = document.querySelector('[data-fb-status]');
    return el ? { s: el.getAttribute('data-fb-status'), t: el.textContent } : null;
  });
  rec.ok('Send reports success', !!status && status.s === 'sent', status);

  const list = await (await fetch(`http://127.0.0.1:${wsPort}/api/feedback/list?sort=new&limit=50&offset=0`)).json();
  const mine = (list.tickets || []).find((t) => t.text === stamp);
  rec.ok('THE BUG: the report is actually ON THE BOARD now (it used to vanish)',
    !!mine && mine.category === 'bug' && mine.topic === 'ui' && mine.playerName === 'Scribe', mine || list);

  /* Browse lists it; an up-vote counts. */
  await A.page.click('text=Browse');
  await A.page.waitForSelector('[data-fb-board]', { timeout: 6000 });
  await A.page.waitForFunction((t) => document.body.innerText.includes(t), stamp, { timeout: 8000 }).catch(() => {});
  rec.ok('the Browse tab lists the board (was "coming soon")', await bodyHas(A, stamp));
  await shot(A, 'feedback-browse');
  if (mine) {
    await A.page.click(`[data-fb-row="${mine.id}"] button`);
    await A.page.waitForTimeout(1200);
    const after = await (await fetch(`http://127.0.0.1:${wsPort}/api/feedback/list?sort=new&limit=50&offset=0`)).json();
    const up = ((after.tickets || []).find((t) => t.id === mine.id) || {}).up;
    rec.ok('an up-vote from Browse counts on the board', up === 1, { up });
  }

  /* The old socket event is DROPPED, not relayed to the room. */
  await H.sendEvent(A, 'feedback', { name: 'Scribe', text: 'legacy client report' });
  await A.page.waitForTimeout(1500);
  const bIn = await B.page.evaluate(() => Object.assign({}, window.__inTypes || {}));
  rec.ok('the inbound recorder saw ordinary traffic on the second player (guard)',
    Object.keys(bIn).length > 3, Object.keys(bIn).slice(0, 12));
  rec.ok('...and a legacy `feedback` socket event is never relayed to another player',
    !bIn.feedback, { feedback: bIn.feedback || 0 });

  /* ═══ 2 + 3 + 6. SETTINGS ═══ */
  await H.closeDest(A).catch(() => {});
  await H.openDest(A, 'Settings');
  await A.page.waitForSelector('[data-vol="music"]', { timeout: 6000 });
  rec.ok('the Debug switch is not offered without ?dev=1', !(await bodyHas(A, 'Debug overlay')));
  await shot(A, 'settings');
  const setRange = (sel, v) => A.page.evaluate(({ s, val }) => {
    const el = document.querySelector(s);
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(el, String(val));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, { s: sel, val: v });
  await setRange('[data-vol="music"]', 30);
  await setRange('[data-vol="sfx"]', 80);
  await A.page.waitForTimeout(200);
  const lv = await A.page.evaluate(() => ({
    m: localStorage.getItem('brotown_vol_music'), s: localStorage.getItem('brotown_vol_sfx'),
    audioMusic: window.__btAudioProbe ? window.__btAudioProbe().musicLevel : null,
  }));
  rec.ok('the Music and Effects sliders save their levels', lv.m === '0.3' && lv.s === '0.8', lv);
  const live = await A.page.evaluate(() => window.__btAudioProbe ? window.__btAudioProbe() : null);
  rec.ok('...and the sound engine plays at them', !!live && Math.abs(live.musicLevel - 0.3) < 1e-9 && Math.abs(live.sfxLevel - 0.8) < 1e-9, live);

  await A.page.evaluate(() => {
    const row = Array.from(document.querySelectorAll('div')).find((d) => d.children.length === 2
      && d.firstChild && d.firstChild.textContent === 'Audio');
    const b = row && row.querySelector('button');
    if (b) b.click();
  });
  await A.page.waitForTimeout(200);
  const muted = await A.page.evaluate(() => window.__btAudioProbe ? window.__btAudioProbe().muted : null);
  rec.ok('the Audio switch mutes the game immediately (it used to need a reload)', muted === true, { muted });

  await H.clickText(A, 'About — privacy, rules and credits');
  await A.page.waitForSelector('[data-about]', { timeout: 6000 });
  await shot(A, 'about');
  rec.ok('About opens with the privacy notice, rules and credits',
    (await bodyHas(A, 'What we keep, and why')) && (await bodyHas(A, 'Rules')) && (await bodyHas(A, 'Credits')));

  /* ═══ 4. PARTY CHAT ═══ */
  const party = await A.page.evaluate(() => {
    const S = window._gameState.current;
    const bus = window.__btChatLane;
    const caps = !!(S._serverCaps && S._serverCaps.partyChat);
    const before = bus.available().map((l) => l.id);
    S._party = { members: [{ id: S.myId }, { id: 'someone' }] };
    const during = bus.available().map((l) => l.id);
    bus.setMode('party');
    const line = bus.compose('meet at the gate');
    S._party = null;
    const gone = bus.compose('still there?');
    return { caps, before, during, line, gone, modeAfter: bus.mode() };
  });
  rec.ok('the worker carries party chat (guard)', party.caps === true, party);
  rec.ok('PARTY CHIP: no Party lane outside a party', !party.before.includes('party'), party.before);
  rec.ok('...a Party lane while in one', party.during.includes('party'), party.during);
  rec.ok('...which sends the /p line chat.js routes to the party',
    party.line && party.line.text === '/p meet at the gate', party.line);
  rec.ok('...and a party line after the party is gone is REFUSED and drops to All, never shouted',
    party.gone && party.gone.refuse && !party.gone.text && party.modeAfter === 'all', party);

  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
