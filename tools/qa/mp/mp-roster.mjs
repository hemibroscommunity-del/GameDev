/* THE DEVICE'S CHARACTER ROSTER (v2.3.1923).
 *
 * Owner: "instead of [one key] it makes sense to just present you with a list
 * of characters you've made (in order of most recent at the top) to choose
 * from to continue playing.  It should also give you an option to delete the
 * character with an are you sure pop up.  Up to 10 characters per device.
 * Otherwise it won't let you create new ones."
 *
 * mp-freshpoints covers the road IN — Continue opens the picker, the row is
 * the character this device made, tapping it lands back in the same bp_ id.
 * This file covers the three claims that are about the LIST itself, each of
 * which can be satisfied by something that looks right and is not:
 *
 *   1. ORDER.  "Most recent at the top" is trivially true for one character
 *      and for a list that happens to have been written in that order.  So
 *      the roster is seeded deliberately out of order and the RENDERED rows
 *      are read back.
 *   2. DELETE.  A confirm that appears is not the feature; a confirm whose
 *      buttons do what they say is.  Both answers are pressed, and "Keep
 *      them" is checked FIRST — a delete that fires on either button would
 *      otherwise pass the happy path and destroy a character on the sad one.
 *      And when the row deleted is the one the device would boot into, the
 *      boot key has to go with it, or the next reload walks straight back
 *      into the character that was just removed from the list.
 *   3. THE CAP.  Asserted at ten AND at nine, because "the button refuses"
 *      is only correct if the button also still WORKS below the limit — a
 *      cap that is off by one, or that refuses always, passes a test that
 *      only ever looks at the full case.
 *
 * The roster is seeded through its own storage format rather than by making
 * ten characters: the claims above are about the list and the screen, and
 * ten real joins would spend two minutes proving something mp-freshpoints
 * already proves once.
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Rosie', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  const mine = await P.page.evaluate(() => ({
    myId: window._gameState.current.myId,
    key: (() => { try { return localStorage.getItem('bt_passphrase'); } catch (e) { return null; } })(),
  }));
  rec.ok('the played character is on a bp_ key (guard)', !!mine.key && /^bp_/.test(mine.myId), mine);

  /* ── 1. ORDER ────────────────────────────────────────────────────────── */
  /* Three seeds around the real one, written youngest-LAST so a renderer
     that simply prints storage order gets it wrong. */
  /* BOTH flags, the way a real logout navigates (v2.3.1840).  `login=1`
     alone routes to the door and then the RESUME SNAPSHOT rejoins over the
     top of it — measured: route 'login-forced' with the world painted behind
     it and the roster's own play-stamp already rewritten.  `noresume=1` is
     the half that makes the door stay. */
  await P.page.goto(`http://localhost:${webPort}/?noresume=1&login=1`, { waitUntil: 'domcontentloaded' });
  await P.page.waitForTimeout(2000);
  await P.page.evaluate((realKey) => {
    const now = Date.now();
    const list = [
      { phrase: 'seed-oldest-key', id: 'bp_seed0', name: 'Oldest', level: 4, at: now - 86400000 * 6, looked: true },
      { phrase: 'seed-middle-key', id: 'bp_seed1', name: 'Middle', level: 9, at: now - 3600000 * 5, looked: true },
      { phrase: realKey, id: 'x', name: 'Rosie', level: 3, at: now - 60000, looked: true },
      { phrase: 'seed-newest-key', id: 'bp_seed2', name: 'Newest', level: 12, at: now - 1000, looked: true },
    ];
    localStorage.setItem('bt_chars', JSON.stringify({ v: 1, list }));
  }, mine.key);
  await P.page.reload({ waitUntil: 'domcontentloaded' });
  await P.page.waitForTimeout(2200);

  const openPicker = async () => {
    const b = await P.page.$('[data-tut="login-key"]');
    if (!b) return false;
    await b.click();
    await P.page.waitForTimeout(700);
    return !!(await P.page.$('[data-tut="char-picker"]'));
  };
  const rowNames = () => P.page.evaluate(() => [...document.querySelectorAll('[data-tut="char-row"]')]
    .map((el) => el.getAttribute('data-char-name')));

  rec.ok('the picker opens from Continue (guard)', await openPicker(), {});
  const order = await rowNames();
  console.log('    rendered order', JSON.stringify(order));
  rec.ok('the list is most-recent-first, not storage order',
    JSON.stringify(order) === JSON.stringify(['Newest', 'Rosie', 'Middle', 'Oldest']), order);
  await P.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/roster-order.png' });

  /* ── 2. DELETE ───────────────────────────────────────────────────────── */
  const clickDelete = async (name) => {
    const btn = await P.page.$(`[data-tut="char-row"][data-char-name="${name}"] + [data-tut="char-delete"]`);
    if (!btn) return false;
    await btn.click();
    await P.page.waitForTimeout(500);
    return true;
  };

  rec.ok('a row has its own delete control (guard)', await clickDelete('Middle'), {});
  const confirm = await P.page.evaluate(() => {
    const el = document.querySelector('[data-tut="char-delete-confirm"]');
    if (!el) return { shown: false };
    return { shown: true, namesIt: /Middle/.test(el.textContent || ''),
      text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200) };
  });
  console.log('    confirm', JSON.stringify(confirm));
  rec.ok('deleting asks "are you sure" first', confirm.shown === true, confirm);
  /* Named, for the same reason the retired overwrite dialog named its
     victim: "this character" is abstract until it is your bro. */
  rec.ok('...and the pop-up names the character', confirm.namesIt === true, confirm);
  /* Says what actually happens — the key still reaches them.  Copy, not
     mechanism, but it is the claim the player is being asked to act on. */
  rec.ok('...and says the Login Key can bring them back',
    /Login Key/i.test(confirm.text || ''), confirm.text);
  await P.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/roster-confirm.png' });

  /* The sad path FIRST: a delete that fires on either button would sail
     through the happy path below. */
  const keep = await P.page.$('[data-tut="char-delete-no"]');
  rec.ok('the pop-up offers a way out (guard)', !!keep, {});
  if (keep) {
    await keep.click();
    await P.page.waitForTimeout(500);
    const after = await rowNames();
    rec.ok('answering "Keep them" deletes NOTHING', after.length === 4 && after.includes('Middle'), after);
  }

  await clickDelete('Middle');
  const yes = await P.page.$('[data-tut="char-delete-yes"]');
  rec.ok('the pop-up offers Delete (guard)', !!yes, {});
  if (yes) {
    await yes.click();
    await P.page.waitForTimeout(600);
    const after = await rowNames();
    console.log('    after delete', JSON.stringify(after));
    rec.ok('confirming removes that row and only that row',
      JSON.stringify(after) === JSON.stringify(['Newest', 'Rosie', 'Oldest']), after);
  }

  /* Deleting the character the device would BOOT into has to take the boot
     key with it — otherwise the next reload lands in a character the player
     just removed from the list. */
  await clickDelete('Rosie');
  const yes2 = await P.page.$('[data-tut="char-delete-yes"]');
  if (yes2) {
    await yes2.click();
    await P.page.waitForTimeout(600);
    const st = await P.page.evaluate(() => ({
      rows: [...document.querySelectorAll('[data-tut="char-row"]')].map((el) => el.getAttribute('data-char-name')),
      key: (() => { try { return localStorage.getItem('bt_passphrase'); } catch (e) { return null; } })(),
      rpg: (() => { try { return localStorage.getItem('bt_rpg'); } catch (e) { return null; } })(),
    }));
    console.log('    after deleting the ACTIVE character', JSON.stringify({ ...st, key: st.key }));
    rec.ok('deleting the active character drops its row', !st.rows.includes('Rosie'), st.rows);
    rec.ok('...and clears the key the device would have booted into', st.key === null, { key: st.key });
    rec.ok('...and its cached progress with it', st.rpg === null, { rpg: st.rpg });
  } else {
    rec.ok('deleting the active character drops its row', false, 'no confirm for Rosie');
  }

  /* ── 2b. AND CREATE, RIGHT AFTER DELETING THE ACTIVE CHARACTER ───────
     The nastiest ordering on this screen, and it is reachable in three taps:
     delete the character the device is pointed at, go Back, press Create.

     The danger is that S.myId was derived from `bt_passphrase` when this page
     loaded, and the delete just removed that key from under it — so the
     session is still HOLDING the deleted character's id while localStorage no
     longer names it.  A create road that decides what to do by looking only
     at localStorage sees "no key, nothing taken, go ahead", runs the creator
     on the stale id, and the worker hands the deleted character straight back
     (charLock).  Which is the original v2.3.1861 bug, arriving by a door that
     did not exist when it was fixed. */
  const backBtn = await P.page.$('[data-tut="char-picker"] >> text=Back');
  if (backBtn) { await backBtn.click(); await P.page.waitForTimeout(400); }
  const createAfterDelete = await P.page.$('[data-tut="login-create"]');
  rec.ok('Create is reachable after deleting the active character (guard)', !!createAfterDelete, {});
  if (createAfterDelete) {
    await Promise.all([
      P.page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
      createAfterDelete.click(),
    ]);
    await P.page.waitForTimeout(3000);
    const made = await P.page.evaluate(() => ({
      myId: window._gameState.current.myId,
      inCreator: !!document.querySelector('.bt-cc-shell'),
      route: window.__btBootRoute || null,
      key: (() => { try { return localStorage.getItem('bt_passphrase'); } catch (e) { return null; } })(),
    }));
    console.log('    create after deleting the active character', JSON.stringify({ ...made, key: !!made.key }));
    rec.ok('creating after that delete lands in the creator', made.inCreator === true, made);
    rec.ok('...on an identity that is NOT the deleted character',
      !!made.myId && made.myId !== mine.myId, { deleted: mine.myId, now: made.myId });
    rec.ok('...with a key to build it on', !!made.key, { key: !!made.key });
  }

  /* ── 3. THE CAP ──────────────────────────────────────────────────────── */
  const setCount = async (n) => {
    await P.page.evaluate((count) => {
      const now = Date.now();
      const list = [];
      for (let i = 0; i < count; i++) {
        list.push({ phrase: 'cap-key-' + i, id: 'bp_cap' + i, name: 'Cap' + i, level: 2, at: now - i * 1000, looked: true });
      }
      localStorage.setItem('bt_chars', JSON.stringify({ v: 1, list }));
    }, n);
    await P.page.goto(`http://localhost:${webPort}/?noresume=1&login=1`, { waitUntil: 'domcontentloaded' });
    await P.page.waitForTimeout(2000);
  };
  const pressCreate = async () => {
    const b = await P.page.$('[data-tut="login-create"]');
    if (!b) return null;
    await b.click();
    await P.page.waitForTimeout(800);
    return P.page.evaluate(() => ({
      full: !!document.querySelector('[data-tut="login-full-warn"]'),
      inCreator: !!document.querySelector('.bt-cc-shell'),
      route: window.__btBootRoute || null,
    }));
  };

  await setCount(10);
  const at10 = await pressCreate();
  console.log('    Create at 10', JSON.stringify(at10));
  rec.ok('at ten characters, Create Character refuses', !!at10 && at10.full === true, at10);
  rec.ok('...and does NOT run the creator anyway', !!at10 && at10.inCreator === false, at10);
  /* The refusal has to point somewhere — deleting is how a slot is freed and
     this dialog is the only place that is said. */
  const manage = await P.page.$('[data-tut="login-full-manage"]');
  rec.ok('...and offers the way to free a slot', !!manage, {});
  if (manage) {
    await manage.click();
    await P.page.waitForTimeout(700);
    rec.ok('...which opens the picker', !!(await P.page.$('[data-tut="char-picker"]')), {});
  }
  await P.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/roster-full.png' });

  /* The other side of the cap.  Without this, "refuses always" passes. */
  await setCount(9);
  const at9 = await pressCreate();
  console.log('    Create at 9', JSON.stringify(at9));
  rec.ok('at NINE it still lets you create one', !!at9 && at9.full === false, at9);

  await P.ctx.close().catch(() => {});
}
