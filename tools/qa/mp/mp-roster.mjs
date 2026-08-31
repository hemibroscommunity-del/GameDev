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

  /* ── 2. DELETE, RETIRED ──────────────────────────────────────────────
     Owner, of this window: "Remove the delete character button from this
     menu."  There is no delete control here to press, so the assertions that
     pressed it are gone rather than left failing or quietly skipped.

     WHAT WENT WITH THEM, said plainly because it was real coverage: the bin's
     glyph and accessible name (v2.3.2187), the are-you-sure and both of its
     answers, that deleting the ACTIVE character also clears the boot key and
     the cached progress, and the create-right-after-deleting ordering (the old
     §2b) -- the nastiest path on this screen, and one that needed a delete
     button to reach.  `forgetChar` and the boot-key clearing still EXIST and
     are still exercised (a provisional row the worker denies is dropped
     through the same call), but nothing in the UI drives them now.  When
     delete gets a home again, this coverage belongs with it.

     WHAT REPLACES IT is the pin below: the two controls the owner removed are
     asserted ABSENT, so neither drifts back into this screen unnoticed --
     which is the one thing a removal test can usefully do. */

  /* ═══ v2.3.2193: IT IS A CHARACTER SELECT, NOT A PROFILE MANAGER ═══
     Owner: "The biggest issue is that it currently feels like an
     account-management modal, not a character-selection screen ... the
     hierarchy should make the character(s) feel like the star."

     Four structural claims, each of which the old screen failed and each of
     which something that merely LOOKS right could still fail:

       the PORTRAIT, because "In an RPG, I should recognize my character
       visually before I even read the name" — and a portrait is the one item
       here that needed the WORKER to change (the roster holds keys, never
       cosmetics), so an assertion that only counted tiles would pass on ten
       letter placeholders.  Both are counted, and at least one real drawing is
       required: these rows have looks.

       CREATE, which used to sit on the screen BEHIND this one, visible through
       the scrim.

       the KEY BOX SHUT, which is where half the panel went.

       the count, in the corner where it belongs. */
  const shape = await P.page.evaluate(() => {
    const q = (s) => document.querySelectorAll(s).length;
    const sheet = document.querySelector('[data-tut="char-picker"]');
    return {
      rows: q('[data-tut="char-row"]'),
      art: q('[data-portrait="art"]'),
      letter: q('[data-portrait="letter"]'),
      create: q('[data-tut="char-create"]'),
      menus: q('[data-tut="char-menu"]'),
      confirm: q('[data-tut="char-confirm"]'),
      keyOpen: q('input[placeholder*="Login Key"]'),
      useKey: q('[data-tut="char-usekey"]'),
      title: /CHOOSE YOUR BRO/.test((sheet && sheet.textContent) || ''),
    };
  });
  console.log('    shape', JSON.stringify(shape));
  rec.ok('every row wears a portrait — the thing you recognise before the name',
    shape.rows > 0 && (shape.art + shape.letter) === shape.rows, shape);
  rec.ok('...and they are REAL drawings, not a screen full of letter tiles '
    + '(the worker had to start sending the look for this to be possible)',
    shape.art > 0, shape);
  /* Create stays off this screen ("Remove the create bro from there") — the
     door behind it already carries Create Character. */
  rec.ok('there is no Create card — the door behind already carries one',
    shape.create === 0, shape);
  /* Every row has its options road, and NOTHING destructive is on the card
     itself: the ... is a menu, so a mis-tap on a list you are scrolling cannot
     reach a wipe. */
  rec.ok('every row has an options control, and nothing destructive sits on '
    + 'the card itself',
    shape.menus === shape.rows && shape.confirm === 0, shape);
  rec.ok('the Login Key box is SHUT, one line until it is wanted',
    shape.keyOpen === 0 && shape.useKey === 1, shape);
  rec.ok('...and the window asks you to choose a bro rather than manage profiles',
    shape.title === true, shape);

  /* ── 2b. OPTIONS: RESTART, DELETE, AND THE TYPED WORD ────────────────
     Owner: "Add an ellipses to the character for options where you can open
     another menu and choose to delete or restart the character to lvl 1 and
     another menu that asks are you sure? And need to type yes to confirm."

     THE CLAIM THAT MATTERS is the middle one.  A confirm dialog that appears
     is not a safety catch; a confirm that REFUSES TO ACT until the word is
     typed is.  So the button is pressed first with the box empty and then with
     a wrong word, and the row is checked to be still there each time — a gate
     that only looked disabled, or one wired to `onClick` regardless, passes
     every other assertion in this file and loses somebody's character.

     Delete is exercised end to end here.  RESTART is not driven to completion
     on purpose: it is an irreversible server wipe, and the rows this scenario
     seeds are invented keys with no character behind them, so the worker would
     correctly refuse and the test would be asserting the refusal rather than
     the feature.  The restart's own machinery is covered where it can be
     driven honestly — server/test/account.test.mjs walks the endpoint against
     real storage and checks the blob is gone, the prereset snapshot exists,
     and the character and auth records survive. */
  const openMenu = async (name) => {
    const btn = await P.page.$(`[data-tut="char-row"][data-char-name="${name}"] ~ [data-tut="char-menu"]`);
    if (!btn) return false;
    await btn.click();
    await P.page.waitForTimeout(400);
    return true;
  };
  rec.ok('the ... opens a menu (guard)', await openMenu('Middle'), {});
  const menu = await P.page.evaluate(() => {
    const el = document.querySelector('[data-tut="char-menu-sheet"]');
    return {
      shown: !!el,
      namesIt: /Middle/.test((el && el.textContent) || ''),
      restart: !!document.querySelector('[data-tut="char-menu-restart"]'),
      del: !!document.querySelector('[data-tut="char-menu-delete"]'),
      text: ((el && el.textContent) || '').replace(/\s+/g, ' ').trim().slice(0, 240),
    };
  });
  console.log('    menu', JSON.stringify(menu));
  rec.ok('...naming the character it is about to act on', menu.shown && menu.namesIt, menu);
  rec.ok('...offering BOTH restart at level 1 and remove from this device',
    menu.restart === true && menu.del === true, menu);
  /* The two are not the same act and the menu has to say so — one is a server
     wipe, the other frees a slot and leaves the Login Key working. */
  rec.ok('...and saying which one is which', /Login Key/i.test(menu.text)
    && /level 1/i.test(menu.text), menu.text);

  await P.page.click('[data-tut="char-menu-delete"]');
  await P.page.waitForTimeout(400);
  const ask = await P.page.evaluate(() => {
    const el = document.querySelector('[data-tut="char-confirm"]');
    return { shown: !!el, hasInput: !!document.querySelector('[data-tut="char-confirm-input"]'),
      text: ((el && el.textContent) || '').replace(/\s+/g, ' ').trim().slice(0, 200) };
  });
  rec.ok('choosing one asks "are you sure" with a box to type in',
    ask.shown && ask.hasInput && /are you sure/i.test(ask.text), ask);

  /* ── THE GATE, pressed twice against a row that must survive both ── */
  const stillThere = async () => (await rowNames()).includes('Middle');
  await P.page.click('[data-tut="char-confirm-go"]').catch(() => {});
  await P.page.waitForTimeout(400);
  rec.ok('pressing confirm with the box EMPTY does nothing', await stillThere(), await rowNames());
  await P.page.fill('[data-tut="char-confirm-input"]', 'no');
  await P.page.click('[data-tut="char-confirm-go"]').catch(() => {});
  await P.page.waitForTimeout(400);
  rec.ok('...and the wrong word does nothing either', await stillThere(), await rowNames());

  /* ...and the right one does.  Case-insensitive and trimmed, because a phone
     capitalises the first letter of a text box by default and a gate you have
     to fight the keyboard to pass teaches people to stop reading it. */
  await P.page.fill('[data-tut="char-confirm-input"]', ' YES ');
  await P.page.click('[data-tut="char-confirm-go"]');
  await P.page.waitForTimeout(700);
  const after = await rowNames();
  console.log('    after the typed yes', JSON.stringify(after));
  rec.ok('typing yes removes the character', !after.includes('Middle'), after);
  rec.ok('...and only that one — the rest of the list is untouched',
    after.length === 5 && after.includes('Strongest'), after);
  rec.ok('...and both the menu and the confirm closed behind it',
    await P.page.evaluate(() => !document.querySelector('[data-tut="char-confirm"]')
      && !document.querySelector('[data-tut="char-menu-sheet"]')), {});
  await P.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/roster-confirm.png' });

  /* ── 3. THE CAP ──────────────────────────────────────────────────────── */
  const setCount = async (n) => {
    await P.page.evaluate((count) => {
      try { document.cookie = 'bt_chars=; Path=/; Max-Age=0'; } catch (e) {}   /* v2.3.2111 — see above */
      /* ═══ v2.3.2193b: AND THE BOOT KEY, OR THE COUNT IS OFF BY ONE ═══
         `ensureChar` adds the key this device holds to the roster on boot, so
         seeding nine rows next to a live bt_passphrase produces TEN and the
         "at nine it still lets you create" case tests the cap instead.

         It used to work by accident: §2 deleted the active character on its
         way past, which cleared that key as a side effect.  §2 is retired
         (the owner removed delete from this screen), so the fixture now says
         outright what it was relying on — which is where it belonged anyway,
         since a helper called setCount owes an EXACT count. */
      try { localStorage.removeItem('bt_passphrase'); } catch (e) {}
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
  /* The refusal has to point SOMEWHERE.  It used to point at deleting, which
     was how a slot got freed; since the owner removed delete there is no way
     to free one, so the claim is the honest, weaker one: the dialog still
     gives the player a door rather than ending the road. */
  const manage = await P.page.$('[data-tut="login-full-manage"]');
  rec.ok('...and still offers somewhere to go', !!manage, {});
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
