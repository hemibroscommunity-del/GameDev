/* HEIGHT AND FRAME, ON THE GLASS AND ACROSS THE WIRE (v2.3.1953).
 *
 * ── v2.3.1996: THE FRAME AXIS IS LOCKED TO MEDIUM ──
 * Owner: "keep the medium build only and only allow the height to change".
 * The frame assertions below were NOT deleted -- they were INVERTED, because
 * "a wide build no longer widens" is the claim that now needs proving, and it
 * is the one with a migration behind it.  B still seeds `bt-frame: 'large'`
 * into localStorage and still reloads, so this measures exactly the returning
 * player who picked Large before today: the catalog must refuse the saved id
 * and render them medium, on their own screen AND on a peer's, on join AND
 * after the relay cycles.  A frame that came back to life anywhere fails here.
 * Every height assertion is untouched.
 *
 * Owner: "is there a way to add 'height' to your character as an option?" ...
 * "Yes build the heights too ... Maybe also frame wideness (thin, medium,
 * large)".
 *
 * Four claims, none of which a screenshot or a game-state read can settle,
 * because all four are facts about a live transform:
 *
 *   1. THE FIGURE ACTUALLY CHANGES SHAPE.  Tall is 1.13x taller and Large is
 *      1.17x wider, measured in SCREEN pixels off the painted frame, not read
 *      back off the constants that set them.
 *
 *   2. THE BOOTS STAY ON THE GROUND.  The display container's origin is the
 *      sprite's CENTRE, ~24 units above the feet, so scaling it about that
 *      origin pushes a tall bro's boots into the floor and lifts a short one
 *      off it.  The renderer compensates by lifting the display; this measures
 *      the boots' absolute screen y and requires it not to move.
 *
 *   3. THE NAME PLATE DOES NOT STRETCH.  It rides display._uiLayer, which
 *      carries the inverse scale.  A plate 17% wider on a Large bro would be
 *      the most visible bug this feature could ship.
 *
 *   4. IT CROSSES THE WIRE.  A peer's build has to survive the join
 *      sanitiser AND the 2 s track relay -- the pair of gates v2.3.1939 shipped
 *      a key into one of and not the other, which made a drawn shirt appear on
 *      join and vanish two seconds later.  So the peer is measured on the
 *      OTHER client, twice, with a relay cycle in between.
 *
 * The build is seeded into localStorage and the page reloaded rather than
 * clicked through the creator: buildCatalog reads its store once at module
 * load, so this is exactly the path a RETURNING player takes, and it keeps the
 * scenario about the renderer and the wire rather than about pointer events
 * (which the creator probe covers).
 */
import * as H from './harness.mjs';

/* The catalog's own numbers, restated so a change to them fails HERE rather
   than silently redefining what the test is asserting. */
const TALL = 1.13;
/* v2.3.1996: this was `LARGE = 1.17`.  The frame axis is locked now, so the
   width a 'large' save must measure is 1 -- the same as an average bro. */
const LOCKED_W = 1;
const TOL = 0.02;          /* 2% -- one screen pixel on a ~78px figure is 1.3% */

const probe = (P, peer) => P.page.evaluate((n) => (window._pixiRenderer && window._pixiRenderer.buildProbe
  ? window._pixiRenderer.buildProbe(n) : null), peer || null);

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── A: an average bro, for the reference numbers ── */
  const A = await H.newPlayer(browser, { name: 'Ref', wsPort, webPort });
  await H.enterWorld(A);
  await A.page.waitForTimeout(2500);
  const ref = await probe(A);
  rec.ok('the build probe answers at all', !!(ref && ref.fig && ref.fig.heightPx > 0), ref);
  if (!ref || !ref.fig || !ref.fig.heightPx) return;

  rec.ok('an untouched player renders at scale 1 in both axes',
    Math.abs(ref.scaleX - ref.scaleY) < 1e-4, { x: ref.scaleX, y: ref.scaleY });
  rec.ok('...and their HUD layer carries no correction',
    ref.uiScaleX === 1 && ref.uiScaleY === 1, { x: ref.uiScaleX, y: ref.uiScaleY });

  /* ── B: tall, plus a 'large' frame left over from before the lock ── */
  const B = await H.newPlayer(browser, { name: 'Bigg', wsPort, webPort, guest: true });
  await B.page.evaluate(() => {
    localStorage.setItem('bt-height', 'tall');
    localStorage.setItem('bt-frame', 'large');
  });
  await B.page.reload({ waitUntil: 'domcontentloaded' });
  await B.page.waitForTimeout(1500);
  await H.enterWorld(B);
  await B.page.waitForTimeout(2500);
  const big = await probe(B);
  rec.ok('B: the seeded build survived the reload', !!(big && big.fig && big.fig.heightPx > 0), big);

  if (big && big.fig) {
    /* ═══ v2.3.2268: A SAVED `tall` NOW RENDERS AVERAGE ═══
       Owner: "remove the tall and short build from the game."  HEIGHT_CATALOG
       is locked to a single entry, so this scenario's job inverts: it used to
       prove the axis WORKS and now proves it is GONE -- and, more importantly,
       that it is gone for the players who already picked it.  B is exactly
       that player: `bt-height: tall` and `bt-frame: large` written before the
       lock, then a reload.

       There is no migration code anywhere and there does not need to be.  The
       catalog's localStorage read has always gated on `HEIGHT_CATALOG.some()`,
       so an id the catalog no longer lists simply fails the guard and the
       store keeps the default.  That guard was written in v2.3.1953 for this
       exact day; this is the assertion that it held. */
    const hR = big.fig.heightPx / ref.fig.heightPx;
    const wR = big.fig.widthPx / ref.fig.widthPx;
    rec.ok(`a saved 'tall' no longer makes him taller — the axis is locked (measured ${hR.toFixed(3)}x)`,
      Math.abs(hR - 1) < TOL, { ref: ref.fig.heightPx, big: big.fig.heightPx, ratio: +hR.toFixed(4) });
    rec.ok(`a saved 'large' frame does NOT widen him either — locked since v2.3.1996 (measured ${wR.toFixed(3)}x)`,
      Math.abs(wR - LOCKED_W) < TOL, { ref: ref.fig.widthPx, big: big.fig.widthPx, ratio: +wR.toFixed(4) });
    /* THE STORE, not just the pixels: a renderer that ignored the id while the
       store still held it would pass the measurements above and hand `tall`
       straight back to the wire and to a future build. */
    const stored = await B.page.evaluate(() => {
      try {
        return { ls: localStorage.getItem('bt-height'),
          live: window.__btBuild ? window.__btBuild() : null };
      } catch (e) { return null; }
    });
    rec.ok('...and the STORE rejected it too, so nothing downstream can pick it back up',
      !!stored && !!stored.live && stored.live.height === 'average'
      && stored.live.wire.ht === undefined, stored);
    rec.ok('...and the catalog itself offers exactly one height and one frame',
      !!stored && !!stored.live
      && stored.live.heights.length === 1 && stored.live.heights[0] === 'average'
      && stored.live.frames.length === 1 && stored.live.frames[0] === 'medium',
      stored && stored.live);

    /* The boots and the plate still have to be right -- at scale 1 both are
       trivially true, which is the point: the correction machinery is still
       wired and simply has nothing to correct. */
    const refDrop = ref.feetWorldY - ref.worldY;
    const bigDrop = big.feetWorldY - big.worldY;
    rec.ok('the boots sit where an unbuilt bro\u2019s boots sit',
      ref.worldY != null && big.worldY != null && Math.abs(bigDrop - refDrop) < 1.5,
      { ref: +refDrop.toFixed(2), big: +bigDrop.toFixed(2) });
    rec.ok('the name plate is drawn at the same scale as on any other bro',
      ref.pillScaleX != null && big.pillScaleX != null
      && Math.abs(big.pillScaleX - ref.pillScaleX) < 1e-3
      && Math.abs(big.pillScaleY - ref.pillScaleY) < 1e-3,
      { ref: [ref.pillScaleX, ref.pillScaleY], big: [big.pillScaleX, big.pillScaleY] });
  }

  /* ── 4. the wire: what A sees of B ── */
  await H.waitMutualSight(A, B).catch(() => {});
  await A.page.waitForTimeout(2500);
  const seen = await probe(A, 'Bigg');
  rec.ok('A can measure B at all', !!(seen && seen.fig), seen);
  if (seen && seen.fig && ref.fig) {
    const hR = seen.fig.heightPx / ref.fig.heightPx;
    const wR = seen.fig.widthPx / ref.fig.widthPx;
    /* v2.3.2268: nothing crosses the wire now.  wireHeight() returns undefined
       whenever the height is the default, and after the lock it always is, so
       'ht' drops off the join frame entirely -- there is nothing to relay when
       there is only one answer.  A therefore sees B exactly as it sees anyone. */
    rec.ok('A sees B at AVERAGE height — the retired axis reaches no peer',
      Math.abs(hR - 1) < TOL, { ratio: +hR.toFixed(4), peer: seen.fig.heightPx, self: ref.fig.heightPx });
    rec.ok('A sees B at MEDIUM width — the locked frame reaches no peer either',
      Math.abs(wR - LOCKED_W) < TOL, { ratio: +wR.toFixed(4) });
    rec.ok('B\u2019s plate is not stretched on A\u2019s screen either',
      Math.abs(seen.uiScaleX * (seen.scaleX / seen.uiScaleY / seen.scaleY) - 1) < 1e-3,
      { uiX: seen.uiScaleX, uiY: seen.uiScaleY, sx: seen.scaleX, sy: seen.scaleY });
  }

  /* THE RELAY, which is the half v2.3.1939 got wrong: wait past a couple of
     2 s track cycles and re-measure.  Kept after the lock because the failure
     it guards runs the other way too -- a key that arrives on join and is then
     overwritten would be how a retired build came BACK mid-session. */
  await A.page.waitForTimeout(6500);
  const after = await probe(A, 'Bigg');
  rec.ok('...and B is STILL average after the relay cycles (v2.3.1939 incident, inverted)',
    !!(after && after.fig)
    && Math.abs(after.fig.heightPx / ref.fig.heightPx - 1) < TOL
    && Math.abs(after.fig.widthPx / ref.fig.widthPx - LOCKED_W) < TOL,
    after && after.fig);

  /* A peer who never picked a build must carry nothing — the absence is what
     keeps every untouched player rendering exactly as they do today. */
  const plain = await probe(B, 'Ref');
  rec.ok('a player who picked no build renders unscaled on a peer’s screen',
    !!plain && Math.abs(plain.scaleX - plain.scaleY) < 1e-4 && plain.uiScaleX === 1,
    plain && { sx: plain.scaleX, sy: plain.scaleY, ui: plain.uiScaleX });

  /* ── 5. v2.3.2268: THERE IS NO BUILD TAB ──
     Everything above measures the RENDERER, which is where the lock has to
     hold.  This measures the SCREEN, which is where the owner reported it:
     "remove it as an option in the trait picker".  With both axes locked the
     tab's only control would be one already-selected option, so the tab itself
     is gone -- and the tab strip filters itself off the type definitions, so
     removing the definition removed the tab.

     Asserted by the TILES as well as by the tab, because those are two
     different failures: a tab that vanished while its tiles still rendered
     somewhere else would pass a tab-only check. */
  const C = await H.newPlayer(browser, { name: 'Picker', wsPort, webPort, guest: true,
    viewport: { width: 390, height: 844 }, touch: true });
  await C.page.waitForSelector('[data-tut="login-create"]', { timeout: 30000 });
  await C.page.click('[data-tut="login-create"]');
  await C.page.waitForSelector('input.bt-cc-name', { timeout: 30000 });
  await C.page.waitForTimeout(600);

  const tabLabels = await C.page.evaluate(() => Array.from(
    document.querySelectorAll('.bt-cc-tabs button, [class*="cc-tab"] button'))
    .map((b) => (b.getAttribute('title') || b.textContent || '').trim()).filter(Boolean));
  rec.ok('the character creator still has its tab strip (guard)', tabLabels.length >= 4, tabLabels);
  rec.ok('...and BUILD is not one of the tabs any more',
    !tabLabels.some((t) => /^build$/i.test(t)), tabLabels);

  const tile = (t) => C.page.$('button[title="' + t + '"]');
  const has = async (t) => !!(await tile(t));
  const gone = { Short: await has('Short'), Average: await has('Average'), Tall: await has('Tall'),
    Thin: await has('Thin'), Medium: await has('Medium'), Large: await has('Large') };
  rec.ok('...and no build tile is reachable anywhere in the creator',
    Object.values(gone).every((v) => v === false), gone);

  /* And picking through the STORE is refused too, which is the half a UI check
     cannot see: a tab can be hidden while the setter still works, and then any
     stale caller re-introduces the retired build. */
  const forced = await C.page.evaluate(() => {
    try {
      localStorage.setItem('bt-height', 'tall');
      return localStorage.getItem('bt-height');
    } catch (e) { return null; }
  });
  await C.page.reload({ waitUntil: 'domcontentloaded' });
  await C.page.waitForTimeout(1200);
  const afterReload = await C.page.evaluate(() => {
    try { return window.__btBuild ? window.__btBuild() : null; } catch (e) { return null; }
  });
  rec.ok('a hand-written `tall` in storage does not survive a reload',
    !!afterReload && afterReload.height === 'average', { wrote: forced, read: afterReload });

  await C.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/build-tab.png' });

  const errs = [...(A.logs || []), ...(B.logs || []), ...(C.logs || [])].filter((l) => /error|uncaught/i.test(l));
  rec.ok('no page errors on any client', errs.length === 0, errs.slice(0, 3));
}
