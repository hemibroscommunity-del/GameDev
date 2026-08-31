/* THE LOGIN DOOR (v2.3.1823).
 *
 * Owner: "make it so that when you enter your character key you just
 * immediately join the game.  Right now it's broken and does nothing after
 * you enter it."  And, on the look of the screen: "the buttons feel like
 * standard mobile-app controls... your background and title currently say
 * fantasy RPG, while the buttons say website login form."
 *
 * Two claims, and the first one is the load-bearing one:
 *   1. Typing a real key on the login door joins the game — no second tap,
 *      no confirm card, and above all not "nothing".
 *   2. The restyled title screen is actually ON: chamfered plates rather
 *      than rounded rects, a key icon that is no longer accidental, the
 *      BRO TOWN line, and NO stale "your Login Key" card on a door where
 *      this device has no character to have a key for.
 *
 * The first assertion is written so it CANNOT pass vacuously: it captures
 * the key from a character created in one browser context, then drives a
 * SECOND context that has never seen it, and asserts that context ends up
 * in the world wearing that character's name.  A test that only checked the
 * modal closed would pass while the player sat on the splash forever, which
 * is exactly the bug being fixed.
 */
import * as H from './harness.mjs';
import fs from 'fs';

const route = (P) => P.page.evaluate(() => window.__btBootRoute || null);
const phraseOf = (P) => P.page.evaluate(() => { try { return localStorage.getItem('bt_passphrase'); } catch (e) { return null; } });
const nameOf = (P) => P.page.evaluate(() => {
  const S = window._gameState && window._gameState.current;
  return S ? S.myName : null;
});
const visible = (P, sel) => P.page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}, sel);

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── a picture of the finished door, at phone size ──
     The assertions below prove the wiring; "does it feel like Bro Town" is a
     judgement only a picture can carry, and the owner is the one who makes
     it.  Taken first so a later failure still leaves the screenshot behind. */
  {
    const S = await H.newPlayer(browser, {
      name: 'Shot', wsPort, webPort, touch: true,
      viewport: { width: 393, height: 852 },
    });
    await S.page.waitForTimeout(3500);
    try { fs.mkdirSync('tools/qa/mp/out', { recursive: true }); } catch (e) {}
    await S.page.screenshot({ path: 'tools/qa/mp/out/titlescreen.png' });

    /* ── THE BUILD STAMP (v2.3.2185) ──
       Owner: "add the version back to the home splash screen somewhere".  It
       goes HERE, on the screenshot browser, and deliberately not on B below:
       B's flow ends in applyAccountLogin's full page RELOAD, whose 45s
       waitForFunction swallows its own timeout with .catch(() => {}), so any
       extra work near it can tip the reload past the wait and every later
       assertion reads null.  Measured while placing this: the same three
       assertions next to that reload flipped `route` to null on 6 of 8 runs,
       while the pristine scenario passed 4 of 4 -- the reload is the fragile
       thing, not the reading.  S is a throwaway browser that only ever looks
       at the door, so a read here cannot perturb anything.

       WHAT THIS PINS is not "the element exists" but "the NUMBER is true".
       package.json's version is moved by hand and had sat at 2.3.1201 for
       ~900 tags while the code marched on, which is exactly a badge that
       lies.  So: the rendered text must match package.json as it is on disk
       right now, and the sha must be a real one rather than the
       'local'/'nogit'/'dev' fallback BuildBadge uses when Vite did not
       substitute the token. */
    const ver = await S.page.$eval('.bt-login-ver', (el) => el.textContent.trim())
      .catch(() => null);
    const pkg = JSON.parse(fs.readFileSync(H.REPO + '/package.json', 'utf8'));
    rec.ok('the splash carries a build stamp', !!ver, { ver });
    rec.ok('...showing the version package.json actually declares',
      !!ver && ver.includes('v' + pkg.version), { ver, pkg: pkg.version });
    rec.ok('...and a real build sha, not the un-substituted fallback',
      !!ver && !/\b(local|nogit|dev)\b/.test(ver) && /\u00b7\s*[0-9a-f]{7,}/.test(ver),
      { ver });

    await S.ctx.close().catch(() => {});
  }

  /* ── make a character in browser A and take its key ── */
  const A = await H.newPlayer(browser, { name: 'Keyholder', wsPort, webPort });
  await A.page.waitForTimeout(2500);
  await A.page.click('[data-tut="login-create"]');
  await A.page.waitForTimeout(1200);
  await H.enterWorld(A);
  await A.page.waitForTimeout(3500);
  const key = await phraseOf(A);
  const madeName = await nameOf(A);
  rec.ok('a character exists to log back in as (guard)',
    !!key && !!madeName, { key: !!key, name: madeName });
  await A.ctx.close().catch(() => {});
  if (!key) return;

  /* ── browser B has never seen it: type the key on the door ── */
  const B = await H.newPlayer(browser, { name: 'ignored', wsPort, webPort });
  await B.page.waitForTimeout(2500);
  rec.ok('the second browser lands on the login door (guard)',
    (await route(B)) === 'login', { route: await route(B) });

  /* ── 2. the title screen is the owner's painted set ── */
  rec.ok('the BRO TOWN banner is under the logo',
    await visible(B, '.bt-login-banner'), {});

  const plates = await B.page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        bg: cs.backgroundImage,
        w: r.width, h: r.height, cx: r.left + r.width / 2,
        label: (el.textContent || '').trim(),
      };
    };
    return { key: pick('[data-tut="login-key"]'), make: pick('[data-tut="login-create"]') };
  });
  const K = plates.key, C = plates.make;
  /* ═══ v2.3.2188: THE WORD IS ALONE ON THE PLATE, AND CENTRED ═══
     Owner: "The continue label is still not centered on the button it looks
     slightly offset left."

     THE WORD WAS ALREADY CENTRED -- measured on their own screenshot, 645
     against the plate's 646.  What was off was the BALANCE: a key roundel on
     the left with nothing opposite it left 31px of field before it and 269px
     after the word, and the eye reads that cluster's centre of mass, not the
     glyphs'.  v2.3.2151 re-centred the word and the report came back unchanged,
     which is the tell that the word was never the problem.  The owner chose to
     drop the key, so the plate now matches CREATE CHARACTER below it.

     Measured on the ART, because that is where the answer lives -- the word is
     painted into the PNG, so no DOM box can see it.  Reading the columns that
     differ from an empty field column finds the frame, the word, and anything
     else on the plate; "anything else" is what must stay absent.  Tolerance is
     1% of the plate: CREATE's own art is 2px off on 758 (0.26%), so anything
     tighter would fail the button this one is being matched to. */
  const plateArt = await B.page.evaluate(async () => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej;
      img.src = '/ui/welcome/title/btn-continue.png'; });
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const at = (x, y) => { const i = (y * c.width + x) * 4; return [d[i], d[i+1], d[i+2], d[i+3]]; };
    const y0 = Math.round(c.height * 0.28), y1 = Math.round(c.height * 0.71);
    const CLEAN = Math.round(c.width * 0.81);       /* empty field, right of the word */
    const cols = [];
    for (let x = 0; x < c.width; x++) {
      let dev = 0, n = 0;
      for (let y = y0; y < y1; y += 2) {
        const p = at(x, y), q = at(CLEAN, y);
        dev += Math.abs(p[0]-q[0]) + Math.abs(p[1]-q[1]) + Math.abs(p[2]-q[2]); n += 3;
      }
      cols.push(dev / n);
    }
    const hot = []; let s = -1;
    for (let x = 0; x < cols.length; x++) {
      if (cols[x] > 6) { if (s < 0) s = x; }
      else if (s >= 0) { if (x - s > 12) hot.push([s, x - 1]); s = -1; }
    }
    if (s >= 0) hot.push([s, cols.length - 1]);
    /* the plate's own extent, from alpha */
    let px0 = c.width, px1 = -1;
    for (let x = 0; x < c.width; x++) {
      for (let y = 0; y < c.height; y += 3) {
        if (at(x, y)[3] > 16) { if (x < px0) px0 = x; if (x > px1) px1 = x; break; }
      }
    }
    return { w: c.width, hot, plate: [px0, px1] };
  }).catch(() => null);
  rec.ok('the CONTINUE plate art could be read (guard)', !!plateArt && plateArt.hot.length > 0, plateArt);
  {
    const inner = plateArt ? plateArt.hot.filter(
      (r) => r[0] > plateArt.plate[0] + 60 && r[1] < plateArt.plate[1] - 60) : [];
    const pc = plateArt ? (plateArt.plate[0] + plateArt.plate[1]) / 2 : 0;
    const span = plateArt ? plateArt.plate[1] - plateArt.plate[0] : 1;
    const wc = inner.length === 1 ? (inner[0][0] + inner[0][1]) / 2 : null;
    const offPct = wc === null ? null : +(Math.abs(wc - pc) / span * 100).toFixed(2);
    rec.ok('the plate carries ONE thing between its frames — the word, with no key '
      + 'roundel beside it to pull the eye left (v2.3.2188)',
      inner.length === 1, { inner, plate: plateArt && plateArt.plate });
    rec.ok('...and that word sits on the plate\'s centre line (within 1% of its width)',
      offPct !== null && offPct <= 1.0, { wordCentre: wc, plateCentre: pc, offPct });
  }

  rec.ok('both buttons are painted plates, not CSS rectangles',
    /* v2.3.1954: btn-continue.png, renamed from btn-login.png when the word
       painted into it changed — game.css cannot cache-bust a url(), so the
       rename IS the cache bust.  Matched by name rather than by "some png"
       because the whole point of this line is that the plate is the OWNER'S
       art and not a CSS rectangle. */
    !!K && !!C && /btn-continue\.png/.test(K.bg) && /btn-create\.png/.test(C.bg),
    { key: K && K.bg, make: C && C.bg });
  /* The slices are cut so each plate is 94% of its box and dead-centred, so
     under one CSS width the two painted edges must line up.  This is the
     assertion that catches a re-cut going wrong — the thing that actually
     went wrong the first time. */
  rec.ok('the two plates are the same width and in line',
    !!K && !!C && Math.abs(K.w - C.w) < 2 && Math.abs(K.cx - C.cx) < 2,
    { keyW: K && Math.round(K.w), makeW: C && Math.round(C.w),
      keyCx: K && Math.round(K.cx), makeCx: C && Math.round(C.cx) });
  /* GUARD: a background-image that 404s still reports its url() in
     getComputedStyle, so the art has to be proven to DECODE. */
  const loaded = await B.page.evaluate(async () => {
    const one = (u) => new Promise((res) => {
      const i = new Image();
      i.onload = () => res(i.naturalWidth);
      i.onerror = () => res(0);
      i.src = u;
    });
    return {
      login: await one('/ui/welcome/title/btn-continue.png'),
      create: await one('/ui/welcome/title/btn-create.png'),
      logo: await one('/ui/welcome/title/logo.png'),
      banner: await one('/ui/welcome/title/banner.png'),
    };
  });
  rec.ok('every title slice actually decodes (guard: url() lies about 404s)',
    loaded.login > 0 && loaded.create > 0 && loaded.logo > 0 && loaded.banner > 0, loaded);
  rec.ok('the second action is named "Create Character" for a screen reader',
    !!C && /Create Character/i.test(C.label), { label: C && C.label });
  /* v2.3.1954: and the FIRST one is named "Continue".  The plate's word is
     painted art, so nothing can assert it directly — but the accessible name
     and the artwork are supposed to say the same thing, and for a whole
     version they did not: v2.3.1923 renamed the button to Continue and left
     the plate reading LOG IN WITH YOUR KEY, which is the bug the owner
     reported.  Pinning the name here means a future rename that forgets the
     art fails on the pair rather than shipping the mismatch again. */
  rec.ok('the first action is named "Continue" for a screen reader',
    !!K && /^Continue$/i.test(K.label), { label: K && K.label });

  await B.page.click('[data-tut="login-key"]');
  await B.page.waitForTimeout(600);
  /* This device has no character, so offering it "your Login Key" is
     offering a key to nobody. */
  rec.ok('the door does NOT show a "your Login Key" card',
    !(await visible(B, '[data-bt="account-keycard"]')), {});

  /* ── 1. type the key: it should JOIN, not ask again ── */
  await B.page.fill('input[placeholder*="Login Key"]', key);
  /* By ROLE + exact name: the plate button's hidden label is "Log in with
     your Key", so a substring match on "Log in" hits it instead of the
     form's submit and clicks the thing that opened this modal. */
  await B.page.getByRole('button', { name: 'Log in', exact: true }).click();

  /* applyAccountLogin reloads the page, so WAIT FOR THE APP TO COME BACK
     rather than sleeping a guessed number of seconds: a fixed 7s sampled the
     reload mid-flight, and every assertion after it read null and "failed"
     for the wrong reason — which is worse than a red test, because the
     numbers looked like a real regression. */
  await B.page.waitForFunction(() => !!window.__btBootRoute, null, { timeout: 45000 })
    .catch(() => {});
  await B.page.waitForTimeout(2500);   // let the join settle and the name land

  const r2 = await route(B);
  const nm = await nameOf(B);
  rec.ok('entering the key joins the game — no confirm step',
    r2 === 'resume', { route: r2 });
  rec.ok('...and it is the RIGHT character (not a fresh one)',
    nm === madeName, { expected: madeName, got: nm });
  rec.ok('...with no pre-game screen left on top',
    !(await visible(B, '.bt-name-modal')), {});
  rec.ok('...and the key really is this device\'s now',
    (await phraseOf(B)) === key, { got: await phraseOf(B) });

  await B.ctx.close().catch(() => {});
}
