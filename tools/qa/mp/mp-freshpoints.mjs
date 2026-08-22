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
     This is the question the owner's report turned on.  mp-charlock proves a
     device holding its key never SEES this door — it walks straight in — so
     the only way to be standing here with a key is to have logged out, and
     logging out keeps the key on purpose (the passphrase IS the character).

     Before v2.3.1861, pressing Create Character from here ran the creator
     and then handed back the STORED character anyway (charLock): same bp_
     id, same name, same progress.  That is how a "brand new character" turns
     up with combat points already on it.

     Now it asks first.  Both answers are tested, because a dialog that
     appears is not the fix — a dialog whose buttons do what they say is. */
  const doorCreate = await P.page.$('[data-tut="login-create"]');
  rec.ok('the door has a Create Character button (guard)', !!doorCreate, {});
  if (doorCreate) {
    await doorCreate.click();
    await P.page.waitForTimeout(900);
    const warn = await P.page.evaluate(() => {
      const el = document.querySelector('[data-tut="login-existing-warn"]');
      if (!el) return { shown: false };
      return { shown: true, text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160),
        namesIt: /Newbie/.test(el.textContent || '') };
    });
    rec.ok('it warns that a character already exists', warn.shown === true, warn);
    /* NAMED, not counted: "you have a character" is abstract until it is
       your bro's name about to be written over. */
    rec.ok('...and names the character at risk', warn.namesIt === true, warn);
    await P.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/existingwarn.png' });

    /* ── answer 1: Continue ── */
    const cont = await P.page.$('[data-tut="login-existing-continue"]');
    rec.ok('the dialog offers Continue (guard)', !!cont, {});
    if (cont) {
      await cont.click();
      await P.page.waitForTimeout(4000);
      const back = await P.page.evaluate(() => {
        const S = window._gameState.current;
        return { myId: S.myId, name: S.myName, inWorld: !!document.querySelector('canvas') };
      });
      console.log('    after Continue', JSON.stringify(back));
      rec.ok('Continue puts you back in the SAME character',
        back.myId === idBefore.myId && back.name === 'Newbie', { before: idBefore.myId, back });
    }
  }

  /* ── answer 2: Create new ──
     A second logout, then take the other branch.  Asserted on the IDENTITY,
     which is what actually changed: a new key means the worker has no
     stored record to hand back, so the creator's character is the one that
     lives.  This is the assertion that fails on the old code. */
  await P.page.evaluate(() => { try { window.__broDashPanelBus.toBar(); } catch (e) {} });
  await P.page.waitForTimeout(600);
  const chip2 = await P.page.$('[aria-label="Log out to the character screen"]');
  if (chip2) {
    await chip2.click();
    await P.page.waitForTimeout(700);
    const c2 = await P.page.$('text=Log Out');
    if (c2) {
      await Promise.all([
        P.page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
        c2.click(),
      ]);
      await P.page.waitForTimeout(3500);
    }
  }
  const create2 = await P.page.$('[data-tut="login-create"]');
  rec.ok('back at the door for the second answer (guard)', !!create2, {});
  if (create2) {
    await create2.click();
    await P.page.waitForTimeout(900);
    const replace = await P.page.$('[data-tut="login-existing-replace"]');
    rec.ok('the dialog offers Create new character (guard)', !!replace, {});
    if (replace) {
      await Promise.all([
        P.page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
        replace.click(),
      ]);
      await P.page.waitForTimeout(3000);
      const fresh = await P.page.evaluate(() => ({
        route: window.__btBootRoute || null,
        myId: window._gameState.current.myId,
        key: (() => { try { return localStorage.getItem('bt_passphrase'); } catch (e) { return null; } })(),
        prev: (() => { try { return localStorage.getItem('bt_passphrase_prev'); } catch (e) { return null; } })(),
        rpgCache: (() => { try { return localStorage.getItem('bt_rpg'); } catch (e) { return null; } })(),
        inCreator: !!document.querySelector('.bt-cc-shell'),
      }));
      console.log('    after Create new', JSON.stringify({ ...fresh, key: !!fresh.key, prev: !!fresh.prev }));
      rec.ok('choosing Create new lands in the CREATOR, not back at the door',
        fresh.route === 'create-forced' && fresh.inCreator === true, fresh);
      /* THE ONE THAT WOULD HAVE CAUGHT THE ORIGINAL BUG. */
      rec.ok('...on a NEW identity, so the old character cannot be handed back',
        !!fresh.myId && fresh.myId !== idBefore.myId, { before: idBefore.myId, now: fresh.myId });
      rec.ok('...with the old key stashed, not destroyed',
        !!fresh.prev && fresh.prev === idBefore.key, { stashed: !!fresh.prev });
      /* The stale cache is what carried old progress into a "new"
         character; it has to be gone, not merely overwritten later. */
      rec.ok('...and no stale character cache left behind',
        fresh.rpgCache === null, { rpgCache: fresh.rpgCache });
    }
  }

  await P.ctx.close().catch(() => {});
}
