/* ═══ v2.3.4123: THE DOOR ALWAYS LOGS OUT ═══
 * The owner, 2026-11-03: "Change just the exit door icon on top left to
 * "logout" (bring to splash screen) not switch character".  This scenario
 * now holds the new rule, IN THE WORLD (`world: 'wheel'`): with ONE bro and
 * with TWO on the device the door is labelled "Log out" and asks "Leave the
 * world?" with a red Log Out; pressing it lands on the splash screen with the
 * list CLOSED (Continue / Create); and Continue there opens the list of bros,
 * so a device with several still picks another.  (What it held before,
 * v2.3.2421, below.)
 *
 * DOES THE DOOR SAY WHAT IT DOES?  (v2.3.2421)
 *
 * Owner: "the level 0 I saw when I logged in was from an old save that somehow
 * was the DEFAULT I logged into (it was an old character I'd made that I
 * tattooed at one point)."
 *
 * The road already existed: this chip goes to /?noresume=1&login=1, and
 * LoginScreen auto-opens the CharacterPicker whenever the roster is non-empty.
 * One tap. What stopped anyone finding it is that every signal on the control
 * said the opposite -- a DOOR glyph, the words LOG OUT, and a confirm button
 * wearing bt-chisel--danger, the same red as forge salvage and Leave Clan.
 *
 * So this pins the WORDS, in both directions, because a relabel that fires
 * unconditionally would be a worse bug than the one it fixes: a device with
 * ONE bro must keep the old copy exactly, or it gains a "switch" that has
 * nothing to switch to.
 *
 * It also pins the ROAD, not just the copy -- the claim "this is the bro
 * switcher" is only true while the destination really opens the list.
 */
import * as H from './harness.mjs';

/* Seed EXTRA rows beside the bro who is actually playing.
   The count that matters is not the number seeded: ensureChar puts the live
   bt_passphrase in the roster on every boot, so the device holds
   (seeded + 1). mp-roster's setCount sidesteps this by deleting the boot key,
   which is not available here -- the header only exists while somebody is in
   the world, so their key is necessarily in the list.

   The first cut of this file seeded 1 for the "one bro" case, got 2, and read
   the correct switch wording as a failure. Hence readCount below: every round
   now ASSERTS the roster size it thinks it set up, so a fixture that drifts
   fails as a fixture instead of as a verdict on the product. */
async function seedExtra(P, n) {
  await P.page.evaluate((count) => {
    try { document.cookie = 'bt_chars=; Path=/; Max-Age=0'; } catch (e) {}
    const now = Date.now();
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push({ phrase: 'sw-key-' + i, id: 'bp_sw' + i, name: 'Bro' + i,
        level: 3, at: now - i * 1000, looked: true });
    }
    try { localStorage.setItem('bt_chars', JSON.stringify({ v: 1, list })); } catch (e) {}
  }, n);
}

/* What the header itself will read at render. Same function, same source. */
const readCount = (P) => P.page.evaluate(() => {
  try { return (window.__btRoster.read() || []).length; } catch (e) { return -1; }
});

/* Open the header's confirm and read what it actually says. */
async function readConfirm(P) {
  const chip = await P.page.$('.bt-zone-header__logout');
  if (!chip) return { noChip: true };
  await chip.click();
  await P.page.waitForTimeout(450);
  return P.page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const act = btns.find((b) => /^(Switch Bro|Log Out)$/i.test((b.textContent || '').trim()));
    if (!act) return { noDialog: true };
    const box = act.closest('div').parentElement;
    const txt = (box && box.textContent) || '';
    return {
      title: /Switch bro\?/i.test(txt) ? 'switch' : /Leave the world\?/i.test(txt) ? 'leave' : '?',
      body: txt.replace(/\s+/g, ' ').slice(0, 200),
      action: (act.textContent || '').trim(),
      danger: /bt-chisel--danger/.test(act.className || ''),
      chipLabel: (document.querySelector('.bt-zone-header__logout') || {}).ariaLabel
        || (document.querySelector('.bt-zone-header__logout') || {}).getAttribute?.('aria-label') || '',
      chipTitle: (document.querySelector('.bt-zone-header__logout') || { getAttribute: () => '' }).getAttribute('title') || '',
    };
  });
}

const dismiss = (P) => P.page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => /^Cancel$/i.test((x.textContent || '').trim()));
  if (b) b.click();
}).catch(() => {});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Switcher', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true, world: 'wheel' });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2200);

  rec.ok('the bro is in the world with the zone header up (guard)',
    !!(await P.page.$('.bt-zone-header__logout')), {});

  /* ── ONE BRO: the copy must not move ────────────────────────────────── */
  /* ZERO extra: the playing bro's own key is the one row. */
  await seedExtra(P, 0);
  await P.page.reload({ waitUntil: 'domcontentloaded' });
  await H.enterWorld(P).catch(() => {});
  await P.page.waitForTimeout(2600);
  const oneN = await readCount(P);
  rec.ok('the device really holds exactly ONE bro (fixture guard)', oneN === 1, { rosterCount: oneN });
  const one = await readConfirm(P);
  console.log('    one bro on the device: ' + JSON.stringify(one));
  rec.ok('with ONE bro the door still says Leave the world?',
    one.title === 'leave', one);
  rec.ok('...and its button still says Log Out', /^Log Out$/i.test(one.action || ''), one);
  rec.ok('...and still wears the danger red, because it IS an exit',
    one.danger === true, one);
  await dismiss(P);

  /* ── TWO BROS: v2.3.4123, the door still only logs out ─────────────────── */
  /* ONE extra, beside the playing bro's own key. */
  await seedExtra(P, 1);
  await P.page.reload({ waitUntil: 'domcontentloaded' });
  await H.enterWorld(P).catch(() => {});
  await P.page.waitForTimeout(2600);
  const twoN = await readCount(P);
  rec.ok('the device really holds TWO bros (fixture guard)', twoN === 2, { rosterCount: twoN });
  const two = await readConfirm(P);
  console.log('    two bros on the device: ' + JSON.stringify(two));
  rec.ok('with TWO bros the door still asks Leave the world? (v2.3.4123: never "Switch bro?")', two.title === 'leave', two);
  rec.ok('...its button says Log Out, in the danger red', /^Log Out$/i.test(two.action || '') && two.danger === true, two);
  rec.ok('...and the chip is labelled "Log out" (its spoken label and its tooltip)',
    /^Log out$/i.test(two.chipLabel || '') && /^Log out$/i.test(two.chipTitle || ''), two);

  /* ── THE ROAD: the splash screen, then Continue opens the list ───────── */
  const acted = await P.page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => /^Log Out$/i.test((x.textContent || '').trim()));
    if (!b) return false;
    b.click();
    return true;
  });
  rec.ok('the Log Out button is pressable (guard)', acted === true, { acted });
  await P.page.waitForTimeout(3500);
  const landed = await P.page.evaluate(() => ({
    url: location.search,
    picker: !!document.querySelector('[data-tut="char-picker"]'),
    door: !!document.querySelector('[data-tut="login-key"]') && !!document.querySelector('[data-tut="login-create"]'),
  }));
  console.log('    after pressing it: ' + JSON.stringify(landed));
  rec.ok('...it lands on the splash screen (login=1): Continue and Create, the list CLOSED',
    /login=1/.test(landed.url || '') && landed.door && !landed.picker, landed);
  let picked = null;
  for (let i = 0; i < 20 && !(picked && picked.picker); i++) {
    if (i === 0) await P.page.evaluate(() => { const b = document.querySelector('[data-tut="login-key"]'); if (b && !b.disabled) b.click(); });
    await P.page.waitForTimeout(300);
    picked = await P.page.evaluate(() => ({
      picker: !!document.querySelector('[data-tut="char-picker"]'),
      rows: document.querySelectorAll('[data-tut="char-picker"] [data-char-row], [data-tut="char-picker"] button').length,
      text: ((document.querySelector('[data-tut="char-picker"]') || {}).textContent || '').replace(/\s+/g, ' ').slice(0, 160),
    }));
    if (!picked.picker && i % 5 === 4) await P.page.evaluate(() => { const b = document.querySelector('[data-tut="login-key"]'); if (b && !b.disabled) b.click(); });
  }
  console.log('    after Continue: ' + JSON.stringify(picked));
  rec.ok('...and Continue there opens the list of bros, so another can be picked',
    !!picked && picked.picker === true, picked);

  await P.ctx.close().catch(() => {});
}
