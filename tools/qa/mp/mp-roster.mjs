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
 *   1. ORDER.  v2.3.2111 — owner: "sort by highest level character on top?
 *      People will probably have a bunch of them."  Highest level first, with
 *      last-played as the tiebreak (this supersedes the "most recent at the
 *      top" of the quote above).  Trivially true for one character and for a
 *      list that happens to have been written in that order, so the roster is
 *      seeded deliberately out of order on BOTH keys — the newest row is not
 *      the strongest, and two rows tie on level — and the RENDERED rows are
 *      read back.  The door is also expected to open this list BY ITSELF now:
 *      standing on it means the device's key has no character, so the list is
 *      what the player came for.
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
    /* ═══ v2.3.2111: A FIXTURE HAS TO CLEAR BOTH STORES ═══
       The roster is mirrored to a cookie so it survives a change of origin
       (src/networking/rosterCookie.js), and readRoster MERGES anything the
       mirror holds that the local list does not.  So a fixture that writes
       only `bt_chars` is not seeding "a device with exactly these characters"
       — it is seeding those PLUS everything an earlier section left behind.
       This bit twice: the cap section below seeded nine and measured ten.
       On localhost the mirror is a host-only cookie (no dot in the hostname,
       so the domain probe finds nothing to widen to), which is what this one
       line clears. */
    try { document.cookie = 'bt_chars=; Path=/; Max-Age=0'; } catch (e) {}
    const now = Date.now();
    /* v2.3.2111: seeded so neither storage order NOR play order can pass by
       accident.  Newest is the most recently played and the WEAKEST; Middle
       and Rosie tie on level 9 so the tiebreak is exercised; Strongest is
       written first and played longest ago, so only a level sort floats it. */
    const list = [
      { phrase: 'seed-strong-key', id: 'bp_seed3', name: 'Strongest', level: 31, at: now - 86400000 * 9, looked: true },
      { phrase: 'seed-oldest-key', id: 'bp_seed0', name: 'Oldest', level: 4, at: now - 86400000 * 6, looked: true },
      { phrase: 'seed-middle-key', id: 'bp_seed1', name: 'Middle', level: 9, at: now - 3600000 * 5, looked: true },
      { phrase: 'seed-tietop-key', id: 'bp_seed4', name: 'TieTop', level: 9, at: now - 3600000 * 2, looked: true },
      { phrase: realKey, id: 'x', name: 'Rosie', level: 9, at: now - 60000, looked: true },
      { phrase: 'seed-newest-key', id: 'bp_seed2', name: 'Newest', level: 2, at: now - 1000, looked: true },
    ];
    localStorage.setItem('bt_chars', JSON.stringify({ v: 1, list }));
  }, mine.key);
  await P.page.reload({ waitUntil: 'domcontentloaded' });
  await P.page.waitForTimeout(2200);

  /* v2.3.2111: the list is expected to be up ALREADY — H.openPicker and
     H.uncoverDoor are the shared spellings of "get to it" and "get past it",
     and every scenario that touches this screen uses them so there is one
     description of the door's behaviour rather than nine. */
  const openPicker = () => H.openPicker(P.page);
  const closePicker = () => H.uncoverDoor(P.page);
  const rowNames = () => P.page.evaluate(() => [...document.querySelectorAll('[data-tut="char-row"]')]
    .map((el) => el.getAttribute('data-char-name')));
  const rowLevels = () => P.page.evaluate(() => [...document.querySelectorAll('[data-tut="char-row"]')]
    .map((el) => Number(el.getAttribute('data-char-level'))));

  /* ═══ WAIT FOR THE LIST TO STOP MOVING ═══
     A fixture can claim any level it likes for a SEEDED key, but not for the
     one this device actually played: the boot check asks the worker who that
     key is and writes the answer back (ensureChar), so Rosie's fake level 9 is
     replaced by her real one a beat after the screen paints — and the list
     re-sorts under the read.  That is the feature working, not a race to
     paper over, so this waits for it to land before measuring.  Everything
     asserted below is therefore about the SEEDED rows, whose levels nothing
     can correct. */
  const settle = async () => {
    let prev = null;
    for (let i = 0; i < 12; i++) {
      const snap = (await rowNames()).join(',') + '|' + (await rowLevels()).join(',');
      if (snap === prev) return;
      prev = snap;
      await P.page.waitForTimeout(600);
    }
  };

  /* The door opens onto the list with no tap — that IS the feature, so it is
     asserted before anything reopens it by hand. */
  const autoOpen = !!(await P.page.$('[data-tut="char-picker"]'));
  rec.ok('the door opens the character list by itself', autoOpen, {});
  rec.ok('the picker is reachable from Continue (guard)', await openPicker(), {});
  await settle();
  const order = await rowNames();
  const levels = await rowLevels();
  console.log('    rendered order', JSON.stringify(order), JSON.stringify(levels));
  /* Strongest is written FIRST in storage and played LONGEST ago, so neither
     storage order nor play order can put it at the top. */
  rec.ok('the strongest character is first, not the newest and not the first stored',
    order[0] === 'Strongest', order);
  /* Read from the rendered levels rather than the fixture: a row showing a
     number the sort did not use would pass a names-only check. */
  rec.ok('...and the rendered levels descend all the way down',
    levels.length === 6 && levels.every((v, i) => i === 0 || levels[i - 1] >= v), levels);
  /* TieTop (9, two hours ago) over Middle (9, five hours ago) — both seeded,
     so this is the tiebreak and nothing else. */
  rec.ok('...with last played breaking a level tie',
    order.indexOf('TieTop') < order.indexOf('Middle'), order);
  rec.ok('...and the weakest is last', order[order.length - 1] === 'Newest', order);
  await P.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/roster-order.png' });

  /* ── 2. DELETE ───────────────────────────────────────────────────────── */
  const clickDelete = async (name) => {
    const btn = await P.page.$(`[data-tut="char-row"][data-char-name="${name}"] + [data-tut="char-delete"]`);
    if (!btn) return false;
    await btn.click();
    await P.page.waitForTimeout(500);
    return true;
  };

  /* ═══ v2.3.2180: THE CONTROL LOOKS LIKE DELETING, NOT CLOSING ═══
     Owner: "it looks like the x is just to back out of the window instead of
     delete the character."  It drew a ✕ -- which is the CLOSE affordance on
     every other panel in this game -- while every comment around it called it
     "the bin".  On the one screen where the destructive control sits beside a
     row you tap to play, that reading costs a character.

     Pinned as "not a dismiss glyph, and it draws something": a future edit that
     reaches for ✕ or × again fails here rather than shipping, and a bin that
     silently stopped rendering (an icon font that never loaded, a stroke that
     inherited to transparent) is caught by the same assertion.  The words stay
     the accessible name, which is what a screen reader and a hover actually
     read. */
  const delLook = await P.page.evaluate(() => {
    const b = document.querySelector('[data-tut="char-delete"]');
    if (!b) return null;
    const svg = b.querySelector('svg');
    return {
      text: (b.textContent || '').trim(),
      hasIcon: !!svg,
      paths: svg ? svg.querySelectorAll('path').length : 0,
      aria: b.getAttribute('aria-label') || '',
      title: b.getAttribute('title') || '',
    };
  });
  rec.ok('the delete control is not a dismiss glyph — no ✕/× where a bin belongs',
    !!delLook && !/[✕×xX]/.test(delLook.text), delLook);
  rec.ok('...it draws an actual bin (an icon that failed to render would be silent)',
    !!delLook && delLook.hasIcon && delLook.paths >= 3, delLook);
  rec.ok('...and it still SAYS delete, for a screen reader and a hover',
    !!delLook && /^Delete\s+\S/.test(delLook.aria) && /^Delete\s+\S/.test(delLook.title), delLook);

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
    rec.ok('answering "Keep them" deletes NOTHING',
      JSON.stringify(after) === JSON.stringify(order), { after, before: order });
  }

  await clickDelete('Middle');
  const yes = await P.page.$('[data-tut="char-delete-yes"]');
  rec.ok('the pop-up offers Delete (guard)', !!yes, {});
  if (yes) {
    await yes.click();
    await P.page.waitForTimeout(600);
    const after = await rowNames();
    console.log('    after delete', JSON.stringify(after));
    /* Set, not sequence, and deliberately.  The picker reads the roster at
       mount and re-reads it when IT changes something — so a delete is also
       the moment a late correction from the boot check lands, and the active
       character's row can legitimately move as her real level replaces the
       one this fixture invented.  "That row and only that row" is a claim
       about MEMBERSHIP; the ordering claim is the descending check below,
       which stays true however she places. */
    const expected = order.filter((n) => n !== 'Middle');
    rec.ok('confirming removes that row and only that row',
      after.length === expected.length && expected.every((n) => after.includes(n)),
      { after, expected });
    const afterLevels = await rowLevels();
    rec.ok('...and the list is still highest-level-first afterwards',
      afterLevels.every((v, i) => i === 0 || afterLevels[i - 1] >= v), afterLevels);
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
      try { document.cookie = 'bt_chars=; Path=/; Max-Age=0'; } catch (e) {}   /* v2.3.2111 — see above */
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
    /* v2.3.2111: the seeded roster makes the door open the list over both
       buttons, so Create has to be uncovered before it can be pressed. */
    await closePicker();
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
