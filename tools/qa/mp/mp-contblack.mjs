/* "WHEN I TRY TO CONTINUE MY CHARACTER THE SCREEN IS BLACK" (owner report).
 *
 * Every existing test of these roads asks whether the right CHARACTER came
 * back — same bp_ id, same name, a <canvas> in the document.  A black screen
 * passes all three: the canvas element exists from the first frame, and the
 * identity is correct behind it.  mp-freshpoints logs `inWorld: true` on the
 * exact road under suspicion and never looks at a pixel.
 *
 * So this measures the SCREEN, on each way back into a character:
 *   1. the plain resume — reload holding the key;
 *   2. the login door's "Continue as <name>";
 *   3. the login door's key entry, which is the other button in the game
 *      that says Continue.
 * ...and it distinguishes the two ways a screen can be black, because they
 * have different causes and different fixes:
 *   - THE OVERLAY NEVER LIFTED.  IntroVideo is a #000 sheet at z-index 100
 *     that waits on preloadPlayerAssets(); if that promise never settles the
 *     sheet stays up forever.  The black-screen watchdog cannot save this —
 *     it arms off __introLiftedAt, which the overlay stamps on its way out.
 *   - THE WORLD RENDERED DARK.  Overlay gone, canvas unlit; this is what the
 *     watchdog is for, so the question is whether it fires.
 */
import * as H from './harness.mjs';

/* The same 32x18 downsample the in-game watchdog judges by (BroTown.jsx
   _sampleLit), so a reading here means what a reading there means.  Taken
   inside rAF: drawImage off a WebGL canvas is only reliable in-frame. */
const LIT = (P) => P.page.evaluate(() => new Promise((res) => {
  requestAnimationFrame(() => {
    const out = { lit: -1, glLost: null, overlay: null, introLiftedAt: null, canvas: false };
    try {
      const S = window._gameState && window._gameState.current;
      out.introLiftedAt = (S && S.__introLiftedAt) || null;
      out.wdEverLit = !!(S && S.__wdEverLit);
      out.wdDark = (S && S.__wdDark) || 0;
    } catch (e) {}
    try {
      const cv = document.querySelector('canvas');
      out.canvas = !!cv;
      if (cv) {
        try {
          const gl = cv.getContext('webgl2') || cv.getContext('webgl');
          out.glLost = !!(gl && gl.isContextLost && gl.isContextLost());
        } catch (e) {}
        const c2 = document.createElement('canvas');
        c2.width = 32; c2.height = 18;
        const g2 = c2.getContext('2d');
        g2.drawImage(cv, 0, 0, 32, 18);
        const d = g2.getImageData(0, 0, 32, 18).data;
        let lit = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 30) lit++;
        out.lit = Math.round(100 * lit / (32 * 18));
      }
    } catch (e) { out.err = String(e && e.message); }
    /* WHICH BLACK.  A full-viewport opaque element on top is a different
       failure from a dark canvas underneath, and only one of them is
       something the watchdog can ever recover. */
    try {
      const vw = window.innerWidth, vh = window.innerHeight;
      const covers = [...document.querySelectorAll('body *')].filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.width < vw * 0.9 || r.height < vh * 0.9) return false;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') return false;
        if ((+cs.opacity || 0) < 0.9) return false;
        const bg = cs.backgroundColor || '';
        const m = bg.match(/rgba?\(([^)]+)\)/);
        if (!m) return false;
        const p = m[1].split(',').map((n) => parseFloat(n));
        if (p.length > 3 && p[3] < 0.9) return false;
        if (p[0] + p[1] + p[2] > 60) return false;         /* not dark */
        return true;
      }).map((el) => ({ tag: el.tagName, cls: (el.className || '').toString().slice(0, 40),
        z: getComputedStyle(el).zIndex, bg: getComputedStyle(el).backgroundColor }));
      out.overlay = covers.length ? covers[covers.length - 1] : null;
      out.overlayCount = covers.length;
    } catch (e) {}
    res(out);
  });
}));

/* Poll rather than one look, and SWALLOW navigation races: three of these
   roads end in a reload, so an evaluate can land mid-navigation and throw
   "Execution context was destroyed" — which is the page working, not a black
   screen.  The first cut of this file reported that as a scenario error and
   measured nothing at all. */
async function litWithin(P, ms) {
  const t0 = Date.now();
  let last = { lit: -1, note: 'never sampled' };
  for (;;) {
    try {
      last = await LIT(P);
      if (last.lit >= 1) return { ...last, waited: Date.now() - t0, ok: true };
    } catch (e) {
      last = { lit: -1, navigating: String(e && e.message).slice(0, 80) };
    }
    if (Date.now() - t0 > ms) return { ...last, waited: Date.now() - t0, ok: false };
    await P.page.waitForTimeout(500).catch(() => {});
  }
}

async function identity(P) {
  /* Same navigation tolerance as litWithin: this is called right after the
     roads that reload, and a throw here would end the scenario rather than
     report the road. */
  for (let i = 0; i < 12; i++) {
    try {
      return await P.page.evaluate(() => {
        const S = (window._gameState && window._gameState.current) || {};
        let key = null; try { key = localStorage.getItem('bt_passphrase'); } catch (e) {}
        return { myId: S.myId || null, name: S.myName || null, key,
          route: window.__btBootRoute || null,
          url: location.pathname + location.search };
      });
    } catch (e) { await P.page.waitForTimeout(500).catch(() => {}); }
  }
  return { myId: null, name: null, key: null, route: null, url: null, unreadable: true };
}

async function logOut(P) {
  await P.page.evaluate(() => { try { window.__broDashPanelBus.toBar(); } catch (e) {} });
  await P.page.waitForTimeout(500);
  const chip = await P.page.$('[aria-label="Log out to the character screen"]');
  if (!chip) return false;
  await chip.click();
  await P.page.waitForTimeout(600);
  const confirm = await P.page.$('text=Log Out');
  if (!confirm) return false;
  await Promise.all([
    P.page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
    confirm.click(),
  ]);
  await P.page.waitForTimeout(3000);
  return true;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Comeback', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3500);

  /* ── CONTROL: the world is lit when you are simply IN it ──
     Without this, a harness that renders black for its own reasons (a
     headless GL quirk, a missing texture host) would report every road
     below as broken and every one of those reports would be noise. */
  const base = await litWithin(P, 15000);
  console.log('    in-world baseline', JSON.stringify(base));
  rec.ok('CONTROL: a joined world renders lit pixels at all', base.ok, base);
  const idBefore = await identity(P);
  console.log('    identity', JSON.stringify(idBefore));

  /* ── ROAD 1: the plain resume — reload holding the key ── */
  await P.page.goto(P.page.url().split('?')[0], { waitUntil: 'load' }).catch(() => {});
  await P.page.waitForTimeout(3000);
  const r1 = await litWithin(P, 30000);
  const i1 = await identity(P);
  console.log('    road 1 resume', JSON.stringify(r1), JSON.stringify(i1));
  rec.ok('ROAD 1 (reload with the key): the screen is not black', r1.ok, { ...r1, ...i1 });
  rec.ok('ROAD 1: ...and it is the same character', i1.myId === idBefore.myId, { i1, idBefore });

  /* ── ROAD 2: the door's "Continue as <name>" ──
     Reachable only after a logout, which is the point: logout KEEPS the key
     (the passphrase is the character), so this is the one screen in the game
     where you stand at the door already holding a character. */
  const out = await logOut(P);
  rec.ok('logged out to the door (guard)', out === true, {});
  const atDoor = await identity(P);
  console.log('    at the door', JSON.stringify(atDoor));
  const create = await P.page.$('[data-tut="login-create"]');
  rec.ok('the door offers Create Character (guard)', !!create, atDoor);
  if (create) {
    await create.click();
    await P.page.waitForTimeout(800);
    const cont = await P.page.$('[data-tut="login-existing-continue"]');
    rec.ok('the dialog offers "Continue as <name>" (guard)', !!cont, {});
    if (cont) {
      await cont.click();
      const r2 = await litWithin(P, 30000);
      const i2 = await identity(P);
      console.log('    road 2 continue', JSON.stringify(r2), JSON.stringify(i2));
      rec.ok('ROAD 2 ("Continue as <name>"): the screen is not black', r2.ok, { ...r2, ...i2 });
      rec.ok('ROAD 2: ...and it is the same character', i2.myId === idBefore.myId, { i2, idBefore });
    }
  }

  /* ── ROAD 3: the door's KEY entry ──
     The other button in this game labelled Continue.  Walked from a SECOND
     browser so the key being typed is not the one this device already holds
     (that path answers "you're already playing as this character").
     The road matters beyond the label: applyAccountLogin finishes with
     location.reload(), and a logout leaves `?login=1` in the URL — so what
     the reload lands on is a real question, not a formality. */
  const Q = await H.newPlayer(browser, {
    name: 'Second', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true,
  });
  await H.enterWorld(Q);
  await Q.page.waitForTimeout(3000);
  const qBefore = await identity(Q);
  const qOut = await logOut(Q);
  rec.ok('the second device logged out to the door (guard)', qOut === true, {});
  const qDoor = await identity(Q);
  console.log('    second device at the door', JSON.stringify(qDoor));

  const keyBtn = await Q.page.$('[data-tut="login-key"]');
  rec.ok('the door offers the Login Key button (guard)', !!keyBtn, {});
  if (keyBtn && idBefore.key) {
    await keyBtn.click();
    await Q.page.waitForTimeout(700);
    const input = await Q.page.$('input');
    rec.ok('the key form has an input (guard)', !!input, {});
    if (input) {
      await input.fill(idBefore.key);
      await Promise.all([
        Q.page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
        Q.page.keyboard.press('Enter'),
      ]);
      await Q.page.waitForTimeout(3000);
      const r3 = await litWithin(Q, 30000);
      const i3 = await identity(Q);
      console.log('    road 3 key login', JSON.stringify(r3), JSON.stringify(i3));
      rec.ok('ROAD 3 (login with a Key): the screen is not black', r3.ok, { ...r3, ...i3 });
      /* AND IT ACTUALLY SWITCHED.  A reload that lands back on the door is
         not black, so the lit check above would pass it — and "it does
         nothing after you enter the key" is the owner report v2.3.1823 was
         supposed to have closed. */
      rec.ok('ROAD 3: ...and it landed in the WORLD, not back on the door',
        i3.route !== 'login-forced' && i3.route !== 'login', { i3, qDoor });
      rec.ok('ROAD 3: ...as the character whose key was typed',
        i3.key === idBefore.key && i3.myId === idBefore.myId, { i3, idBefore, qBefore });
    }
  }

  for (const [tag, pg] of [['a', P], ['b', Q]]) {
    await pg.page.screenshot({ path: `tools/qa/mp/out/contblack-${tag}.png` }).catch(() => {});
  }
  const threw = [...P.logs, ...Q.logs].filter((l) => /pageerror|Uncaught|threw/.test(l));
  rec.ok('nothing threw on any of the three roads', threw.length === 0, threw.slice(0, 6));
  await P.ctx.close().catch(() => {});
  await Q.ctx.close().catch(() => {});
}
