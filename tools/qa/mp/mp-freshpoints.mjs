/* A BRAND NEW CHARACTER HAS NOTHING TO SPEND (v2.3.1860).
 *
 * Owner: "I'm creating a brand new chat and it's showing that it has combat
 * points to allocate already."
 *
 * The three combat cards badge "+N" when a skill has unspent allocation
 * points, and that badge is a call to action — it says go and spend
 * something.  On a character that has never fought, there is nothing to
 * spend, so the badge is either lying or the server really is handing out
 * points at creation.  This scenario answers which, by reading BOTH: what
 * the worker actually stored, and what the card drew.
 *
 * The harness makes a new bp_ identity per player, so every run of this is
 * a genuinely new character — the state under test cannot be inherited from
 * a previous run.
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Newbie', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3500);

  const state = await P.page.evaluate(() => {
    const R = window._gameState.current.rpg || {};
    const p3 = R.prog3 || null;
    return {
      hasProg3: !!p3,
      pool: p3 ? p3.pool : null,
      ms: p3 ? p3.ms : null,
      levels: p3 && p3.sk ? { sword: p3.sk.sword && p3.sk.sword.level,
        bow: p3.sk.bow && p3.sk.bow.level, staff: p3.sk.staff && p3.sk.staff.level } : null,
      charLevel: R.level,
      poolFrom: R._p3PoolFrom || null,
      /* the legacy ladder, in case prog3 has not landed yet */
      legacy: { weaponUnspent: R.weaponUnspent || null, defenseUnspent: R.defenseUnspent || 0,
        hpUnspent: R.hpUnspent || 0, enduranceUnspent: R.enduranceUnspent || 0 },
    };
  });
  console.log('    fresh character state', JSON.stringify(state));

  rec.ok('the new character joined with a prog3 blob (guard)', state.hasProg3 === true, state);
  rec.ok('a brand new character has an EMPTY point pool', state.pool === 0, state);
  rec.ok('...and no legacy unspent points either',
    !!(state.legacy && !state.legacy.defenseUnspent && !state.legacy.hpUnspent
      && !state.legacy.enduranceUnspent
      && (!state.legacy.weaponUnspent
        || Object.values(state.legacy.weaponUnspent).every((n) => !n))), state.legacy);

  /* ...and, separately, that the CARD agrees.  The pool being 0 and the
     badge being absent are two different claims: the badge has its own
     fallback (v2.3.1687, "show it on all three when the stamp is missing")
     that could light up on its own. */
  const cards = await P.page.evaluate(() => {
    try { window.__broDashPanelBus.toBar(); } catch (e) {}
    const els = [...document.querySelectorAll('[role="button"][aria-label*="level"]')]
      .filter((el) => el.getBoundingClientRect().width > 0
        && /^(Melee|Bow|Magic) level/i.test(el.getAttribute('aria-label') || ''));
    return els.map((el) => ({
      label: el.getAttribute('aria-label'),
      badge: [...el.querySelectorAll('span')]
        .map((s) => (s.textContent || '').trim())
        .filter((t) => /^\+\d+$/.test(t))[0] || null,
      flashing: el.className.includes('bt-build-flash')
        || [...el.querySelectorAll('*')].some((n) => (n.className || '').toString().includes('bt-build-flash')),
    }));
  });
  console.log('    cards', JSON.stringify(cards));
  rec.ok('all three combat cards rendered (guard)', cards.length === 3, cards);
  rec.ok('no card shows a "+N" points badge on a new character',
    cards.length === 3 && cards.every((c) => c.badge === null), cards);
  rec.ok('...and none of them is pulsing for attention',
    cards.length === 3 && cards.every((c) => c.flashing === false), cards);

  await P.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/freshpoints.png' });

  /* ═══ IS "CREATE CHARACTER" ACTUALLY A NEW CHARACTER? ═══
     The first half proves a genuinely new server player has nothing to
     spend.  This half asks the question the owner's report actually turns
     on: when you log out and press Create Character in the SAME browser,
     do you get a new character — or your old one wearing a creator flow?

     The identity is `bt_passphrase`, minted once per browser and never
     cleared except by three paths (a server-driven restart, applying a
     login KEY, and the destructive reset in MenuBar).  The creator is not
     one of them.  So this asserts the OBSERVED id across the round trip
     rather than reasoning about it. */
  const idBefore = await P.page.evaluate(() => ({
    myId: window._gameState.current.myId,
    key: (() => { try { return localStorage.getItem('bt_passphrase'); } catch (e) { return null; } })(),
  }));

  /* Back to the resting band first: the dashboard work above can leave a
     panel open OVER the log-out chip, and a click that lands on the panel
     does nothing.  This is also why the confirm is checked rather than
     assumed — the first cut of this never logged out at all, so the identity
     comparison below compared a page to ITSELF and passed on nothing. */
  await P.page.evaluate(() => { try { window.__broDashPanelBus.toBar(); } catch (e) {} });
  await P.page.waitForTimeout(600);
  const chip = await P.page.$('[aria-label="Log out to the character screen"]');
  rec.ok('the log-out chip is there (guard)', !!chip, {});
  if (chip) {
    await chip.click();
    await P.page.waitForTimeout(700);
    const confirmBtn = await P.page.$('text=Log Out');
    rec.ok('...and the confirm appeared (guard)', !!confirmBtn, {});
    if (confirmBtn) {
      await Promise.all([
        P.page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
        confirmBtn.click(),
      ]);
      await P.page.waitForTimeout(3500);
    }
    const idAfter = await P.page.evaluate(() => ({
      myId: window._gameState.current && window._gameState.current.myId,
      key: (() => { try { return localStorage.getItem('bt_passphrase'); } catch (e) { return null; } })(),
      onDoor: /Create Character/i.test(document.body.innerText || ''),
      text: (document.body.innerText || '').slice(0, 160),
    }));
    console.log('    identity across logout', JSON.stringify({ idBefore, idAfter }));
    rec.ok('the door offers Create Character (guard)', idAfter.onDoor === true,
      { ...idAfter, text: idAfter.text });
    /* THE FINDING, asserted so it cannot drift silently either way:
       the browser keeps its key, so the identity waiting behind that
       button is the SAME one.  Pressing Create Character does not mint a
       new character — it re-enters the existing one, points and all. */
    await P.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/freshdoor.png' });
    /* Is the world's chrome VISIBLE on the door, or merely in the DOM behind
       an opaque screen?  innerText sees both; the player only sees one. */
    const chrome = await P.page.evaluate(() => {
      const cards = [...document.querySelectorAll('[role="button"][aria-label*="level"]')]
        .filter((el) => /^(Melee|Bow|Magic) level/i.test(el.getAttribute('aria-label') || ''));
      const vis = (el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (r.width < 1 || r.height < 1 || cs.visibility === 'hidden' || cs.display === 'none') return false;
        if (parseFloat(cs.opacity || '1') < 0.05) return false;
        /* Is anything painted OVER its centre? */
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !!(top && (el === top || el.contains(top)));
      };
      return { cards: cards.length, visible: cards.filter(vis).length,
        rects: cards.map((el) => { const r = el.getBoundingClientRect();
          return { t: Math.round(r.top), h: Math.round(r.height) }; }) };
    });
    console.log('    world chrome on the door', JSON.stringify(chrome));
    rec.ok('the browser still holds the SAME key at the door',
      !!idAfter.key && idAfter.key === idBefore.key,
      { before: !!idBefore.key, same: idAfter.key === idBefore.key });
  }

  /* ═══ AND WHAT DOES "CREATE CHARACTER" DO FROM HERE? ═══
     This is the question the owner's report turns on.  mp-charlock proves a
     device holding its key never SEES this door — it walks straight in — so
     the only way to be standing here with a key is to have logged out, and
     logging out keeps the key on purpose (the passphrase IS the character).

     Press the button and find out whether the character that arrives is a
     NEW one or the one that was just logged out of.  Asserted on the name
     and the identity rather than on the points, because this character has
     never earned any — the points are the SYMPTOM the owner saw; whose
     character it is, is the cause. */
  const doorCreate = await P.page.$('[data-tut="login-create"]');
  rec.ok('the door has a Create Character button (guard)', !!doorCreate, {});
  if (doorCreate) {
    await doorCreate.click();
    await P.page.waitForTimeout(1500);
    await H.enterWorld(P).catch(() => {});
    await P.page.waitForTimeout(3000);
    const after = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const R = S.rpg || {};
      return { myId: S.myId, name: S.myName, level: R.level,
        pool: R.prog3 ? R.prog3.pool : null,
        key: (() => { try { return localStorage.getItem('bt_passphrase'); } catch (e) { return null; } })() };
    });
    console.log('    after Create Character', JSON.stringify(after));
    /* THE FINDING.  Recorded as an assertion either way so the behaviour
       cannot change silently: if this passes, "Create Character" after a
       logout hands back the SAME character — which is what makes a
       supposedly brand-new character arrive with progress already on it. */
    rec.ok('"Create Character" after a logout returns the SAME identity',
      after.myId === idBefore.myId,
      { before: idBefore.myId, after: after.myId, name: after.name, level: after.level });
    rec.ok('...wearing the same name it had before',
      after.name === 'Newbie', { name: after.name });
  }

  await P.ctx.close().catch(() => {});
}
