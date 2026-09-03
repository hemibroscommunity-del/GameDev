/* THE INK THE EDITOR PROMISED, ON THE CHARACTER, IN THE GAME (v2.3.1994).
 *
 * v2.3.1994 widened the three skin boxes so the 16x16 grid covers the WHOLE
 * region instead of a rectangle in the middle of it (playerDecal: chest
 * 0.70x0.55 -> 1x1, face 0.78x0.63 -> 1x1, arm 0.92x0.40 -> 1x1).  That is a
 * change to where the grid sits ON THE BODY, and the editor cannot prove it:
 * the editor draws the grid from the same numbers the change moved, so a grid
 * that lands in the wrong place looks perfectly correct there and wrong only
 * on the character.  TRAPS §26 is exactly this failure one level down — valid
 * arithmetic on a wrong measurement paints something plausible somewhere
 * wrong — so the claim is measured where the player sees it: in the world.
 *
 * ── WHAT IS MEASURED ──
 * A FULL PINK grid on all three skin canvases, which is the maximum-coverage
 * case: every cell inked, so the pink that appears on the figure IS the skin
 * the editor can reach.  On a bare-chested bro, so the chest and the upper arm
 * are not measured through a shirt.
 *
 * Standing, in four facings, and MID-STRIDE, because the box is measured per
 * frame and a pose that folds an arm across the chest measures a different
 * box from a pose that does not.
 *
 * ── WHAT THIS SCENARIO DOES NOT CLAIM ──
 * The run-frame extent measurement itself (`stampRegion`'s column histogram)
 * is repaired by v2.3.1992 on another branch and is NOT in this one.  With
 * that fix absent, frames after the first of any strip put their grid in the
 * wrong place for a reason that predates this change and is fixed elsewhere.
 * So the jog assertion below is deliberately stated as "the ink is on the
 * figure at all", which is the part v2.3.1994 owns, and the standing facings
 * — five sheets of one frame each, where x0 is 0 and the v2.3.1992 defect
 * cannot occur — carry the coverage claim.
 */
import * as H from './harness.mjs';

const SHOTS = process.env.BT_SHOT_DIR || '/tmp';
/* Palette index 11 ('b') is #d76ba8.  Every cell of every skin canvas.
   PINK, and not the white the first cut used, because the measurement has to
   survive the scene: this character stands on golden cobbles in a white tee,
   and "much lighter than skin" counted 2704 pixels of ground and shirt before
   a single mark had been made.  Nothing else in the frame is magenta — the
   ground is gold, the skin tan, the trousers olive, the boots grey, the tee
   white — so one channel comparison separates ink from everything, with no
   threshold to tune. */
const ALL_PINK = 'b'.repeat(256);

/* Ink is stamped UNDER skin (INK_TUNE) so it arrives blended toward the body,
   but blue-over-green survives that: every OTHER thing on screen has more
   green in it than blue.
   TRAPS §21 ("a colour count is evidence only against a CONTROL, or when the
   classifier is tight enough that nothing else in frame can pass it") is why
   this scenario does BOTH: the no-tattoo control below has to come out at
   zero, and the crops are written to disk to be looked at. */
/* v2.3.2078: ...and `r >= b`, the guard mp-facingside added in v2.3.2043.
   The claim above — "every OTHER thing on screen has more green in it than
   blue" — stopped being true when v2.3.2069 put the fountain in the plaza:
   its water clears both `b > g + 24` and `r > 110` and reads as ink.  The
   ink is #d76ba8 (215,107,168), r comfortably above b, so the guard costs
   this scenario nothing and takes the water to zero. */
const isInk = (r, g, b) => b > g + 24 && r > 110 && r >= b;

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Inked', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true,
    /* v2.3.1906's option: the player is ~40 CSS px tall on a phone, and an arm
       is a handful of pixels of that. */
    dpr: 3,
  });
  /* BARE-CHESTED FROM BIRTH.  A look is permanent (v2.3.1814), so the shirt has
     to be chosen before the character is created — setting it later changes the
     creator's store and nothing the world draws.  A tee covers the chest tattoo
     outright and its sleeves cover the upper arm, which is two of the three
     regions this scenario exists to measure. */
  /* TWO stores, because there are two shirts.  `bt-shirt` is the creator's
     trait pick; `bt-gear-v3-shirt` is the LAYER the world actually draws, and
     it defaults to 'tshirt' on purpose (gearCatalog: "a creator default of
     'none' never strips the new-player default tshirt").  Setting only the
     first changes nothing visible — measured, on the first run of this
     scenario, as a white tee over a pink chest. */
  await P.page.evaluate(() => {
    try {
      localStorage.setItem('bt-shirt', 'none');
      localStorage.setItem('bt-gear-v3-shirt', 'none');
    } catch (e) { /* ignore */ }
  });
  await P.page.reload({ waitUntil: 'domcontentloaded' });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* Where the figure is on the glass, so the crop follows him rather than a
     guessed fraction of the screen (the same aim-with-a-probe rule the editor
     scenario follows). */
  /* v2.3.2078: was a local 88x104 box about twice the character — the
     v2.3.2069 fountain landed inside it (see H.figureBox).  One copy now,
     shared with mp-facingside and mp-cosmpose.  The old version clamped a
     negative origin to 0, which silently slid the box off the figure; the
     shared one returns null instead, so an unmeasurable frame says so. */
  /* ═══ v2.3.2082: A MOVING FIGURE NEEDS A BIGGER BOX ═══
     figureBox is 40x46 around where the renderer last drew the player, and
     page.screenshot takes long enough that a RUNNING player has left it: the
     jog samples below photographed bare cobbles and empty rocks and reported
     0, 81, 177 ink pixels, which read as "the tattoo vanishes when he runs"
     and is not what the pictures show (tools/qa/mp/out/, and the shots this
     writes).  The pad is aim, not slack: the control below still requires
     fewer than 12 ink pixels ANYWHERE in the box with no tattoo on, so a
     larger box cannot manufacture a pass -- the town has no pink in it. */
  const RUN_PAD = 26;
  const clip = (pad = 0) => H.figureBox(P, { pad });
  /* v2.3.2249: the crop itself, for its scale factor k (see the normalisation
     below).  Same call inkCount makes, so it reports the box actually used. */
  const clipBox = async () => clip(0).catch(() => null);
  const inkCount = async (tag, pad = 0) => {
    const box = await clip(pad);
    /* v2.3.2078: a null box means the figure is not fully on the glass.
       Counting a FULL-PAGE screenshot instead (what screenshotPixels does
       with no clip) would report the whole town's ink as the character's. */
    if (!box) return null;
    const px = await H.screenshotPixels(P, box);
    if (tag) await P.page.screenshot({ path: SHOTS + '/skinworld-' + tag + '.png', clip: box });
    return px.count(isInk);
  };

  /* Say out loud what he is wearing: a tee over the chest would silently turn
     the chest half of this scenario into a measurement of a shirt. */
  const worn = await P.page.evaluate(() => {
    const S = window._gameState.current;
    let store = null;
    try { store = localStorage.getItem('bt-shirt'); } catch (e) { /* ignore */ }
    let layer = null;
    try { layer = localStorage.getItem('bt-gear-v3-shirt'); } catch (e) { /* ignore */ }
    return { store, layer, equipped: (S.rpg && (S.rpg.chest || S.rpg.armor || (S.rpg.equipment && S.rpg.equipment.chest))) || null };
  });
  rec.ok('he is bare-chested, so the chest and upper arm are actually visible',
    worn.store === 'none' && worn.layer === 'none' && !worn.equipped, worn);

  /* ── THE CONTROL: no tattoo, nothing light on the figure ── */
  const bare = await inkCount('bare');
  /* v2.3.2078: `bare !== null` explicitly.  inkCount returns null when the
     figure is not fully on the glass, and `null < 12` is TRUE — the control
     would have passed by being unmeasurable. */
  rec.ok('with no tattoo there is no ink colour anywhere in the frame (the measure is honest)',
    bare !== null && bare < 12, { inkPixels: bare });

  /* ── INK EVERYTHING ──
     Through the store and a reload, the way a returning player arrives (the
     same path mp-tattoos takes): this scenario is about the BAKE, not about
     pointer events, which mp-skinink already drives. */
  await P.page.evaluate((w) => {
    localStorage.setItem('bt-tattooart', w);
    localStorage.setItem('bt-facetattoo', w);
    localStorage.setItem('bt-armtattoo', w);
    try { localStorage.removeItem('bt-artops'); } catch (e) { /* ignore */ }
  }, ALL_PINK);
  await P.page.reload({ waitUntil: 'domcontentloaded' });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3500);

  /* ── STANDING, IN FIVE FACINGS ──
     Walk a step and stop: the idle keeps the last facing (v2.3.1837), which is
     how a player gets to any of them. */
  const DIRS = [
    ['south', 's'], ['north', 'w'], ['east', 'd'], ['west', 'a'],
  ];
  const stand = {};
  for (const [name, key] of DIRS) {
    await P.page.keyboard.down(key);
    await P.page.waitForTimeout(650);
    await P.page.keyboard.up(key);
    await P.page.waitForTimeout(900);
    stand[name] = await inkCount('stand-' + name);
  }
  const facingsWithInk = Object.keys(stand).filter((k) => stand[k] > bare + 40);
  rec.ok('the tattoo is on the character standing, in EVERY facing',
    facingsWithInk.length === DIRS.length, stand);

  /* ── AND IT COVERS MORE THAN THE OLD INSET BOXES DID ──
     MEASURED IN BOTH DIRECTIONS, which is the only way this number means
     anything.  Same scenario, same character, same crop:
       old boxes (chest 0.70x0.55, face 0.78x0.63, arm 0.92x0.40)   2396 px
       full-region boxes (1x1 on all three)                         4744 px
     Twice the skin, which is what "anywhere skin is showing" cost.  The floor
     sits between the two, so putting any of the three boxes back fails here —
     and a bit of art tuning that moves the figure by a few pixels does not. */
  /* ═══ v2.3.2249: NORMALISED, BECAUSE THE FIGURE CAN CHANGE SIZE ═══
     2396 / 4744 / 3600 were all measured at world scale 2/3, the only scale
     the game had.  v2.3.2247 made it per zone and v2.3.2249 floors it at 0.45,
     so town draws the bro at 0.675x his old linear size -- 46% of the pixels
     for identical coverage.  Comparing that to 3600 would read a working
     tattoo as a broken one.
     figureBox scales its crop by the same k, so dividing the count by k*k puts
     the measurement back in the units the three numbers above were written in.
     The CLAIM is unchanged and so is its floor; only the yardstick moved. */
  const _k = (await clipBox()) ;
  const kk = _k && _k.k ? _k.k * _k.k : 1;
  const southNorm = Math.round(stand.south / kk);
  rec.ok(`a full-grid tattoo covers the whole of the visible skin (${southNorm} px south normalised, was 2396 with the inset boxes)`,
    southNorm >= 3600, { ...stand, k: _k && _k.k, southNorm });

  /* ── MID-STRIDE ──
     See the header: the CLAIM here is that the ink is on the figure while he
     runs, not where each later frame's box lands — that measurement belongs to
     v2.3.1992, which is not on this branch.

     v2.3.2082: RUN SOMEWHERE ELSE.  These strides used to start at the spawn
     and head east, straight at Lil Bro (1180, 1180) — and an NPC's chat
     bubble is a large opaque white panel drawn over whatever is behind it.
     Two of the four east samples photographed the words "...s got" with the
     character underneath them, which counts as no ink for the same reason a
     player would see no tattoo: it is covered.  (1000, 1420) is open plaza
     with 200px of clear runway east and south (tools/dev/town-lanes.mjs), no
     townsperson within 240px of either path, and tile x=31 all the way — six
     tiles clear of the World View trail-head at (25, 48), whose reach is
     TOWN_EXIT_R = 2 in Manhattan tiles. */
  await H.hopTo(P, 1000, 1420);
  await P.page.waitForTimeout(500);
  await P.page.keyboard.down('d');
  await P.page.waitForTimeout(700);
  const jog = [];
  for (let i = 0; i < 4; i++) { await P.page.waitForTimeout(140); jog.push(await inkCount('jog-east-' + i, RUN_PAD)); }
  await P.page.keyboard.up('d');
  await P.page.waitForTimeout(600);
  await H.hopTo(P, 1000, 1420);
  await P.page.waitForTimeout(400);
  await P.page.keyboard.down('s');
  await P.page.waitForTimeout(700);
  for (let i = 0; i < 3; i++) { await P.page.waitForTimeout(140); jog.push(await inkCount('jog-south-' + i, RUN_PAD)); }
  await P.page.keyboard.up('s');
  rec.ok('every running frame could actually be measured (guard)',
    jog.length > 0 && jog.every((n) => n !== null), jog);
  rec.ok('the tattoo is still on him while he runs, on every sampled frame',
    bare !== null && jog.every((n) => n !== null && n > bare + 20), { jog, bare });

  /* A reload mid-scenario is a reconnect, and the client announces its own
     re-join on the error channel.  That is the harness's doing, not the
     game's. */
  const errs = P.logs.filter((l) => !/net::|Failed to load resource|auto-rejoin/i.test(l));
  rec.ok('no client errors while all of that happened', errs.length === 0, errs.slice(0, 4));
}
