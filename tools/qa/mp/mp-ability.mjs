/* THE STAMINA ABILITIES REACH THE WORKER — and stay locked until they don't
 * (v2.3.1733, PR 5 of docs/COMBAT-OVERHAUL-PLAN.md).
 *
 * The ability RULES are pinned by server/test/abilities.test.mjs, which drives
 * the handler and the monster tick directly.  What a unit suite structurally
 * cannot see is the join between the two halves, and this scenario is only
 * about that join:
 *
 *   1. Does the worker ADVERTISE caps.abil, and does the client store it?
 *      Without the flag the buttons never render against any worker.
 *   2. Does the milestone gate hide the BUTTONS?  A fresh character is level
 *      3 and must see neither ability.  The owner asked for levels that
 *      unlock things; a button visible before its level is the feature
 *      failing quietly in the direction nobody notices.
 *   3. Does an `ability` message actually LEAVE THE BROWSER and get answered?
 *      This is TRAPS #18 in its exact shape: a new client->server type needs
 *      a server case, a handler AND a channelShim passthrough, and the
 *      failure mode of a missing third leg is silence in both directions.
 *      The tell used here is the one the trap entry recommends — count what
 *      the client tried to send (H.instrumentWire), then look for something
 *      only the WORKER could have produced.
 *   4. Does ability_rejected finally have a client handler?  It has existed
 *      server-side for many versions with nothing listening (a refused cast
 *      did nothing and said nothing — the v2.3.1716 failure).  The popup is
 *      the proof, and it is also proof of leg 3: the client cannot invent a
 *      "unlocks at level 4" message it was never sent.
 *
 * A SUCCESSFUL cast is deliberately not attempted here.  It needs character
 * level 4, i.e. a real trained level-up, and there is no operator grant for
 * XP — faking it client-side would prove nothing (prog3 is server-owned, so
 * the worker would still refuse).  The successful path, the damage, the stun
 * and the AoE all live in the server suite where they can be driven exactly.
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Basher', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1200);
  const myId = await H.readState(P, (S) => S.myId);
  await H.instrumentWire(P);

  /* ── 1. the capability flag ── */
  const caps = await H.readState(P, (S) => (S._serverCaps && S._serverCaps.abil) === true);
  rec.ok('the worker advertises caps.abil and the client stored it', caps === true, caps);

  /* ── 2. the milestone gate hides the buttons ── */
  const level = await H.readState(P, (S) => (S.rpg && S.rpg.level) || null);
  rec.ok('a fresh character is character level 3 (the ungated floor)', level === 3, level);
  const status = await P.page.evaluate(() => {
    const F = window._gameFns || {};
    if (!F.abilityStatus) return { __noBridge: true };
    return { bash: F.abilityStatus('bash'), whirl: F.abilityStatus('whirl') };
  });
  rec.ok('the client agrees both abilities are still locked at level 3',
    !!status.bash && status.bash.visible === false && status.whirl.visible === false, status);
  const buttons = await P.page.evaluate(() => document.querySelectorAll('[data-ability]').length);
  rec.ok('...so no ability button is on screen', buttons === 0, buttons);

  /* ── 3 + 4. the message leaves the browser, the worker answers, the client
        finally listens ── */
  const stam0 = await H.adminPlayer(wsPort, myId).then((a) => a?.live?.stamina ?? null).catch(() => null);
  rec.ok('the operator view can read this player\'s stamina', typeof stam0 === 'number', stam0);

  /* Sent raw rather than through castAbility(): the client-side gate would
     (correctly) refuse a locked cast before it reached the wire, and the
     thing under test here is the WIRE. */
  /* The popup is captured by a HOOK rather than read out of S.dmgNumbers
     afterwards: floating numbers are short-lived by design (the renderer
     ages them out), so a fixed sleep-then-read races the animation and the
     first draft of this check failed for that reason alone. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.dmgNumbers) return;
    window.__popups = [];
    const list = S.dmgNumbers;
    const push = list.push.bind(list);
    list.push = (p) => { try { window.__popups.push(p && p.text); } catch (e) {} return push(p); };
  });
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'ability', payload: { kind: 'bash' } });
  });
  await P.page.waitForTimeout(1500);

  const wire = await H.wireCounts(P);
  rec.ok('the client tried to send `ability`', (wire.ability || 0) >= 1, wire);

  const popups = await P.page.evaluate(() => (window.__popups || []).slice());
  /* ONLY the worker knows the unlock level — the client-side refusal path
     never produces this string, so seeing it proves the round trip. */
  rec.ok('the worker refused it and the client SAID SO (ability_rejected has a handler now)',
    popups.some((t) => typeof t === 'string' && /unlocks at level 4/i.test(t)), popups);

  const stam1 = await H.adminPlayer(wsPort, myId).then((a) => a?.live?.stamina ?? null).catch(() => null);
  rec.ok('a locked cast spends no stamina on the worker', stam1 === stam0, { before: stam0, after: stam1 });

  /* ── 5. a client that FAKES its level still gets nothing ──
     The button's visibility is derived from the client's own copy of the
     prog3 blob, so forging that copy is the cheapest possible cheat: edit
     one number and the ability appears.  Doing exactly that here proves two
     things at once — that the button really is level-driven (it appears the
     moment the number changes, which is what a real level-up will do), and
     that appearing buys nothing, because the worker computes the level from
     ITS OWN blob and refuses anyway. */
  /* A shield first: the CLIENT-side gate refuses a bash without one before
     anything reaches the wire (correctly — that refusal is instant feedback,
     not a rule).  The mayor's first quest is what hands one out (v2.3.1676),
     the same route mp-block takes. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
  });
  await H.waitFor(P, (S) => (S.rpg?.shieldStash || []).length, (n) => n > 0,
    { timeout: 20000, label: 'the quest shield arrives' }).catch(() => {});
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.rpg || !S.rpg.prog3) return;
    if (!S.rpg.shield && (S.rpg.shieldStash || []).length) S.rpg.shield = S.rpg.shieldStash.shift();
    S.rpg.prog3.sk.sword.level = 8;   /* char level = 8 + 1 + 1 = 10 locally */
    window.__popups = [];
  });
  await P.page.waitForTimeout(700);
  const fakeButtons = await P.page.evaluate(() => document.querySelectorAll('[data-ability]').length);
  rec.ok('with the level present, BOTH ability buttons render', fakeButtons === 2, fakeButtons);
  await P.page.evaluate(() => {
    const el = document.querySelector('[data-ability="bash"]');
    if (el) el.click();
  });
  await P.page.waitForTimeout(1500);
  const fakePopups = await P.page.evaluate(() => (window.__popups || []).slice());
  rec.ok('...but the worker still refuses it (the level it checks is its own)',
    fakePopups.some((t) => typeof t === 'string' && /unlocks at level 4/i.test(t)), fakePopups);
  const stamFake = await H.adminPlayer(wsPort, myId).then((a) => a?.live?.stamina ?? null).catch(() => null);
  rec.ok('...and the forged level costs the worker nothing', stamFake === stam0,
    { before: stam0, after: stamFake });

  /* An unknown kind must be inert on the same path — the handler indexes its
     table with a wire string. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    window.__popups = [];
    if (S && S.channel) S.channel.send({ type: 'ability', payload: { kind: '__proto__' } });
  });
  await P.page.waitForTimeout(1200);
  const stam2 = await H.adminPlayer(wsPort, myId).then((a) => a?.live?.stamina ?? null).catch(() => null);
  const alive = await H.readState(P, (S) => !!(S.rpg && S.channel));
  rec.ok('a junk ability kind changes nothing and does not break the session',
    stam2 === stam0 && alive === true, { stam2, alive });

  await P.ctx.close().catch(() => {});
}
