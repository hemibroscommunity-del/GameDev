/* SKIP TUTORIAL, AND THEN NOTHING  (v2.3.2880)
 *
 * Owner: "add just a 'skip tutorial' button on the very first dialog box when
 * you join the game.  No pop ups should be scheduled after that."
 *
 * Two brand-new iPhone players (the UA spoof is what makes the install card
 * eligible at all -- see mp-a2hs), with the install card brought forward to
 * 3s and the harness's short coach gap, so both kinds of scheduled pop-up
 * WOULD arrive inside the watch window:
 *   - the CONTROL does not skip, and gets a coach card -- proof the window is
 *     long enough to see one, so the negative below means something;
 *   - the SKIPPER taps "Skip tutorial" on the WELCOME plate (a real,
 *     hit-tested tap -- the overlay around it is pointerEvents:none), the
 *     plate goes at once, and for the same window no coach card and no
 *     install card ever appears.  The choice survives a reload. */
import * as H from './harness.mjs';

const IOS_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const SPOOF = `try{Object.defineProperty(navigator,'userAgent',{get:()=>${JSON.stringify(IOS_UA)}})}catch(e){}`;
const PHONE = { width: 390, height: 844 };
const WATCH_MS = 22000;

/* Every coach card, install card and WELCOME plate that is ever on screen,
   from the first moment of the page -- an init script, so a card that goes up
   the instant the world does (the "YOUR DASHBOARD" card used to) is caught.
   POLLED at 100ms rather than observed: a MutationObserver on the document
   missed the coach card outright in the first cut (it was on the page and the
   observer never reported it), and every surface here stays up for seconds. */
const WATCH = `window.__popups=[];(function(){
  var on={};
  setInterval(function(){
    var now=Date.now();
    var c=document.querySelector('[data-coach]');
    var cid=c?c.getAttribute('data-coach'):null;
    if(cid&&on.coach!==cid)window.__popups.push({kind:'coach',id:cid,at:now});
    on.coach=cid;
    var i=!!document.querySelector('[data-install-hint]');
    if(i&&!on.install)window.__popups.push({kind:'install',at:now});
    on.install=i;
    var w=!!document.querySelector('[data-quest-banner="welcome"]');
    if(w&&!on.welcome)window.__popups.push({kind:'welcome',at:now});
    on.welcome=w;
  },100);
})();`;
const popups = (P) => P.page.evaluate(() => window.__popups || []);
const resetPopups = (P) => P.page.evaluate(() => { window.__popups = []; });

const waitSkip = async (P) => {
  const t0 = Date.now();
  while (Date.now() - t0 < 15000) {
    const r = await P.page.evaluate(() => {
      const b = document.querySelector('[data-skip-tutorial]');
      if (!b) return null;
      const bb = b.getBoundingClientRect();
      return { w: Math.round(bb.width), h: Math.round(bb.height), text: b.textContent,
        plate: (document.querySelector('[data-quest-banner]') || {}).getAttribute
          ? document.querySelector('[data-quest-banner]').getAttribute('data-quest-banner') : null };
    });
    if (r) return r;
    await P.page.waitForTimeout(150);
  }
  return null;
};

export async function run({ browser, wsPort, webPort, rec }) {
  const init = SPOOF + ';window.__btInstallAfterMs=3000;' + WATCH;

  /* ── the CONTROL: a new player who does not skip ── */
  const C = await H.newPlayer(browser, { name: 'Tutee', wsPort, webPort, viewport: PHONE, touch: true, init });
  await H.enterWorld(C);
  const cBtn = await waitSkip(C);
  await C.page.waitForTimeout(700);   /* past the plate's rise, so the button is measured at rest */
  const cBtnRest = await waitSkip(C);
  rec.ok('the WELCOME plate carries a Skip tutorial button', !!cBtn && /skip tutorial/i.test(cBtn.text) && cBtn.plate === 'welcome', cBtn);
  rec.ok('...big enough to hit with a thumb (>= 36 px tall)', !!cBtnRest && cBtnRest.h >= 36, cBtnRest);
  await C.page.waitForTimeout(WATCH_MS);
  const cPops = await popups(C);
  /* v2.3.2880: the WELCOME is the first thing a new player sees -- the coach
     card used to go up ~1.2s before it */
  const firstC = cPops.find((p) => p.kind !== 'install');
  rec.ok(`control: the WELCOME plate is the first pop-up, before any coach card (first: ${firstC ? firstC.kind : 'none'})`,
    !!firstC && firstC.kind === 'welcome', cPops);
  rec.ok(`control: without the skip, the tutorial carries on (${cPops.map((p) => p.kind + (p.id ? ':' + p.id : '')).join(', ') || 'nothing'})`,
    cPops.some((p) => p.kind === 'coach'), cPops);
  const wAt = (cPops.find((p) => p.kind === 'welcome') || {}).at || 0;
  const coachAt = (cPops.find((p) => p.kind === 'coach') || {}).at || 0;
  rec.ok(`control: ...and the first coach card waits out the welcome (${((coachAt - wAt) / 1000).toFixed(1)}s after it)`,
    wAt > 0 && coachAt - wAt >= 9000, { wAt, coachAt });
  await C.ctx.close().catch(() => {});

  /* ── the SKIPPER ── */
  const P = await H.newPlayer(browser, { name: 'Skipper', wsPort, webPort, viewport: PHONE, touch: true, init });
  await H.enterWorld(P);
  const btn = await waitSkip(P);
  rec.ok('skipper: the Skip tutorial button is up (guard)', !!btn, btn);
  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/tutskip-welcome.png` }).catch(() => {});
  /* a REAL tap: Playwright hit-tests the point, so a button the overlay's
     pointerEvents:none swallowed would fail here, not pass */
  await P.page.tap('[data-skip-tutorial]', { timeout: 3000 }).catch((e) => rec.ok('the button takes a real tap', false, String(e)));
  await P.page.waitForTimeout(400);
  const before = await popups(P);
  rec.ok('skipper: nothing but the WELCOME was up before the tap', before.every((p) => p.kind === 'welcome'), before);
  await resetPopups(P);
  const after = await P.page.evaluate(() => ({
    plate: !!document.querySelector('[data-quest-banner="welcome"]'),
    pace: window.__btPace ? window.__btPace() : null,
    flag: (() => { try { return localStorage.getItem('bt_tutorial_skipped'); } catch (e) { return null; } })(),
  }));
  rec.ok('tapping it takes the WELCOME plate down at once', after.plate === false, after);
  rec.ok('...and records the skip', !!after.pace && after.pace.skipped === true && after.flag === '1', after);
  await P.page.waitForTimeout(WATCH_MS);
  const pops = await popups(P);
  rec.ok(`after the skip, no coach card and no install card for ${WATCH_MS / 1000}s (${pops.length} seen)`,
    pops.length === 0, pops);
  const pace = await P.page.evaluate(() => (window.__btPace ? window.__btPace() : null));
  rec.ok('...and the referee still says no to both', !!pace && pace.coachMayShow === false && pace.installMayShow === false, pace);

  /* ── it sticks ── */
  await P.page.reload();
  await H.enterWorld(P);
  await P.page.waitForTimeout(8000);
  const again = await P.page.evaluate(() => ({ pops: window.__popups || [], pace: window.__btPace ? window.__btPace() : null }));
  rec.ok('after a reload the skip still holds (no coach, no install card)',
    again.pops.length === 0 && !!again.pace && again.pace.skipped === true, again);

  await P.ctx.close().catch(() => {});
}
