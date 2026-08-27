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
    /* 1. the shape */
    const hR = big.fig.heightPx / ref.fig.heightPx;
    const wR = big.fig.widthPx / ref.fig.widthPx;
    rec.ok(`tall is ${TALL}x taller on screen (measured ${hR.toFixed(3)})`,
      Math.abs(hR - TALL) < TOL, { ref: ref.fig.heightPx, big: big.fig.heightPx, ratio: +hR.toFixed(4) });
    rec.ok(`a saved 'large' frame does NOT widen him — locked to medium (measured ${wR.toFixed(3)}x)`,
      Math.abs(wR - LOCKED_W) < TOL, { ref: ref.fig.widthPx, big: big.fig.widthPx, ratio: +wR.toFixed(4) });
    rec.ok('the height change did not widen him either — the axes stay independent',
      Math.abs(hR - wR) > 0.02, { hR: +hR.toFixed(4), wR: +wR.toFixed(4) });

    /* 2. the boots.  Measured against the player's own WORLD y, which is the
       position everything authoritative agrees on — the offset from the
       display's ORIGIN necessarily grows with the scale, because the origin is
       the sprite's centre and the lift is what corrects for that. */
    const refDrop = ref.feetWorldY - ref.worldY;
    const bigDrop = big.feetWorldY - big.worldY;
    rec.ok('the boots stay put — growth is absorbed by lifting the display, not by sinking the feet',
      ref.worldY != null && big.worldY != null && Math.abs(bigDrop - refDrop) < 1.5,
      { ref: +refDrop.toFixed(2), big: +bigDrop.toFixed(2) });

    /* 3. the plate.  Compared through the accumulated TRANSFORM rather than
       the painted bounds: two players have different names, and "Ref" makes a
       narrower plate than "Bigg" for reasons that have nothing to do with
       build.  Both stand in town, so both carry the same zone scale. */
    rec.ok('the HUD layer carries the exact inverse of the build',
      Math.abs(big.uiScaleX * (big.scaleX / ref.scaleX) - 1) < 1e-3
      && Math.abs(big.uiScaleY * (big.scaleY / ref.scaleY) - 1) < 1e-3,
      { uiX: big.uiScaleX, uiY: big.uiScaleY, sx: big.scaleX, sy: big.scaleY });
    rec.ok('...so the name plate is drawn at the same scale on a huge bro as on an average one',
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
    rec.ok('A sees B TALL — the height crossed the wire',
      Math.abs(hR - TALL) < TOL, { ratio: +hR.toFixed(4), peer: seen.fig.heightPx, self: ref.fig.heightPx });
    rec.ok('A sees B at MEDIUM width — the locked frame reaches no peer either',
      Math.abs(wR - LOCKED_W) < TOL, { ratio: +wR.toFixed(4) });
    /* And the same on the remote path, which is a different factory and a
       different update loop — the plate must come out square there too.
       `plainSeen` below is the same measurement for a peer with NO build, so
       the comparison is like for like on one client's screen. */
    rec.ok('B’s plate is not stretched on A’s screen either',
      Math.abs(seen.uiScaleX * (seen.scaleX / seen.uiScaleY / seen.scaleY) - 1) < 1e-3,
      { uiX: seen.uiScaleX, uiY: seen.uiScaleY, sx: seen.scaleX, sy: seen.scaleY });
    const plainSeen = await probe(B, 'Ref');
    if (plainSeen) {
      rec.ok('...at exactly the scale an unbuilt peer’s plate is drawn at',
        Math.abs(seen.pillScaleX - plainSeen.pillScaleX) < 1e-3
        && Math.abs(seen.pillScaleY - plainSeen.pillScaleY) < 1e-3,
        { big: [seen.pillScaleX, seen.pillScaleY], plain: [plainSeen.pillScaleX, plainSeen.pillScaleY] });
    }
  }

  /* THE RELAY, which is the half v2.3.1939 got wrong: wait past a couple of
     2 s track cycles and re-measure.  A key missing from the track gate
     arrives on join and is then overwritten by an absent value. */
  await A.page.waitForTimeout(6500);
  const after = await probe(A, 'Bigg');
  rec.ok('...and B is STILL tall, and still NOT wide, after the relay cycles (v2.3.1939 incident)',
    !!(after && after.fig)
    && Math.abs(after.fig.heightPx / ref.fig.heightPx - TALL) < TOL
    && Math.abs(after.fig.widthPx / ref.fig.widthPx - LOCKED_W) < TOL,
    after && after.fig);

  /* A peer who never picked a build must carry nothing — the absence is what
     keeps every untouched player rendering exactly as they do today. */
  const plain = await probe(B, 'Ref');
  rec.ok('a player who picked no build renders unscaled on a peer’s screen',
    !!plain && Math.abs(plain.scaleX - plain.scaleY) < 1e-4 && plain.uiScaleX === 1,
    plain && { sx: plain.scaleX, sy: plain.scaleY, ui: plain.uiScaleX });

  /* ── 5. v2.3.1996: THE PICKER OFFERS HEIGHT AND NOTHING ELSE ──
     Everything above measures the RENDERER, which is where the lock has to
     hold.  This measures the SCREEN, which is where the owner reported it:
     the Build tab used to carry six tiles wrapping onto two rows -- three
     heights then three frames -- and must now carry the three heights alone.
     Asserted by the tiles' own titles (which _buildTile sets from the catalog
     entry's name) rather than by counting buttons, so a tile that came back
     under a new label still fails. */
  const C = await H.newPlayer(browser, { name: 'Picker', wsPort, webPort, guest: true,
    viewport: { width: 390, height: 844 }, touch: true });
  await C.page.waitForSelector('[data-tut="login-create"]', { timeout: 30000 });
  await C.page.click('[data-tut="login-create"]');
  await C.page.waitForSelector('input.bt-cc-name', { timeout: 30000 });
  await H.clickText(C, 'Build').catch(() => {});
  await C.page.waitForTimeout(600);

  const tile = (t) => C.page.$('button[title="' + t + '"]');
  const has = async (t) => !!(await tile(t));
  const heights = { Short: await has('Short'), Average: await has('Average'), Tall: await has('Tall') };
  const frames = { Thin: await has('Thin'), Medium: await has('Medium'), Large: await has('Large') };

  rec.ok('the Build tab still offers all three heights',
    heights.Short && heights.Average && heights.Tall, heights);
  rec.ok('...and offers NO frame tile at all — thin, medium and large are gone from the picker',
    !frames.Thin && !frames.Medium && !frames.Large, frames);

  /* Tapping a height must still take.  A tab that renders its tiles but has
     lost its setter would pass both assertions above. */
  await C.page.click('button[title="Tall"]').catch(() => {});
  await C.page.waitForTimeout(400);
  const picked = await C.page.evaluate(() => { try { return localStorage.getItem('bt-height'); } catch (e) { return null; } });
  rec.ok('tapping Tall still writes the height through', picked === 'tall', { 'bt-height': picked });

  await C.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/build-tab.png' });

  const errs = [...(A.logs || []), ...(B.logs || []), ...(C.logs || [])].filter((l) => /error|uncaught/i.test(l));
  rec.ok('no page errors on any client', errs.length === 0, errs.slice(0, 3));
}
