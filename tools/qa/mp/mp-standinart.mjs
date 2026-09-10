/* THE STAND-INS WEAR YOUR DRAWINGS (v2.3.2429).
 *
 * Owner: "make sure during shield block (I noticed tattoos and other custom
 * designs weren't there) etc that the custom designs show up."
 *
 * ── WHAT WAS WRONG ──
 * A raised shield swaps the whole figure to the BOW art (entityRenderer
 * v2.3.1800) and a swing swaps it to the SWORD art. Those sheets are baked by
 * their own loader in effectsRenderer rather than by getBodyFrame, and that
 * loader passed skin, pants and shoes to recolorBodyToCanvas and stopped
 * there -- the ninth argument, the drawings, was never handed over. So every
 * tattoo, print and pattern was on the walking body and gone the instant you
 * raised a shield or swung a sword.
 *
 * ── WHY THIS IS A/B AND NOT A THRESHOLD ──
 * "Are there blue pixels in the baked sheet" has no absolute answer: trousers,
 * shoes and shading all contribute, and the numbers differ per facing. So two
 * players are driven through the same code -- one who drew a blue chest tattoo
 * in the creator and one who drew nothing -- and the assertion is the
 * DIFFERENCE between them on the same sheets. A bake that ignores the drawings
 * makes the two identical, which is precisely the defect.
 *
 * ── AND WHY IT READS THE BAKE, NOT THE SCREEN ──
 * Getting a shield into a player's hand and raised, in a headless run, is a
 * long chain of things that can fail for reasons that have nothing to do with
 * this; and a screenshot of the world is swamped by ground texture (the same
 * finding as mp-standinskin, v2.3.1788). The baked canvas is where the defect
 * lives and is the honest place to measure it.
 */
import * as H from './harness.mjs';

/* The drawing store's key for the chest tattoo, and a drawing made of one
   colour: every cell of the top rows set to palette 8 (#3f7fd0), a blue no
   skin tone or shipped garment can answer to. */
/* The drawing store's keys, and two one-colour drawings.  Blue (#3f7fd0) on
   the CHEST and green (#5aa84f) on the BACK -- two colour families no skin
   tone or shipped garment leads in, and two different ones so a pixel says
   which canvas it came from.  That is what turns this from "something got
   baked" into "the right side of the character got the right drawing". */
const TATTOO_KEY = 'bt-tattooart';
const TATTOO_BACK_KEY = 'bt-tattooart-back';
/* ═══ v2.3.2431: THE BLOCK IS OFF-CENTRE ON PURPOSE ═══
   A pre-flipped twin sheet is only baked when flipping would actually change
   the picture (effectsRenderer's _twinWouldDiffer), so a test drawing that is
   its own mirror image proves nothing about the twins.  x 2..9 in a 16-wide
   grid is not centred, so it is asymmetric; `sym` is the same block centred,
   for the player who must NOT get a twin. */
const solid = (ch) => {
  let s = '';
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) s += (y >= 4 && y <= 11 && x >= 2 && x <= 9) ? ch : '0';
  return s;
};
const sym = (ch) => {
  let s = '';
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) s += (y >= 4 && y <= 11 && x >= 4 && x <= 11) ? ch : '0';
  return s;
};
/* Which way a stand-in sheet faces, from its own filename.  north and
   northwest are back views (playerArt sideForDir), and that is exactly the
   split artForFacing makes -- so it is also the split this file asserts. */
const isBack = (url) => /north/.test(url);

const standInArt = (page) => page.evaluate(() => {
  const m = window.__btStandInArt || {};
  const out = {};
  for (const k of Object.keys(m)) out[k] = m[k];
  return out;
});

export async function run({ browser, wsPort, webPort, rec }) {
  /* The drawing is seeded into localStorage BEFORE the app boots, because the
     bake happens during the loading screen -- everything preloads before the
     intro lifts (the animation-preload law), and that includes these strips.
     Seeding after boot would test the rebake path instead, which is a
     different claim; there is an assertion for that one at the end. */
  const A = await H.newPlayer(browser, { name: 'Inked', wsPort, webPort,
    init: `try {
      localStorage.setItem(${JSON.stringify(TATTOO_KEY)}, ${JSON.stringify(solid('8'))});
      localStorage.setItem(${JSON.stringify(TATTOO_BACK_KEY)}, ${JSON.stringify(solid('6'))});
    } catch (e) {}` });
  const B = await H.newPlayer(browser, { name: 'Plain', wsPort, webPort, guest: true });
  /* v2.3.2431: a THIRD player whose drawing is its own mirror image.  Without
     one, "a twin is baked when it is needed" and "no twin is baked when it is
     not" cannot both be asserted, and the second is the one holding ~29 MB of
     RGBA off a phone. */
  const C = await H.newPlayer(browser, { name: 'Symm', wsPort, webPort, guest: true,
    init: `try { localStorage.setItem(${JSON.stringify(TATTOO_KEY)}, ${JSON.stringify(sym('8'))}); } catch (e) {}` });

  await H.enterWorld(A);
  await H.enterWorld(B);
  await H.enterWorld(C);
  await A.page.waitForTimeout(2500);
  await B.page.waitForTimeout(2500);
  await C.page.waitForTimeout(2500);

  const inked = await standInArt(A.page);
  const plain = await standInArt(B.page);
  const symm = await standInArt(C.page);

  const urls = Object.keys(inked).filter((u) => /bow-|sword-/.test(u));
  rec.ok(`both players baked the same stand-in sheets (guard: ${urls.length} of them)`,
    urls.length >= 4 && urls.every((u) => plain[u]), { urls: urls.length, missing: urls.filter((u) => !plain[u]) });
  if (!urls.length) return;

  /* WAS THE BAKE EVEN TOLD.  The weaker of the two readings and the one that
     localises a failure: told-and-not-landed is a stamping problem, not-told
     is the v2.3.2429 defect itself. */
  const told = urls.filter((u) => inked[u].art);
  rec.ok(`the inked player's stand-in bakes were handed a drawing (${told.length}/${urls.length})`,
    told.length === urls.length, { told: told.length, of: urls.length });
  rec.ok('...and the plain player\'s were not, so "was told" separates the two',
    urls.every((u) => !plain[u].art), { any: urls.filter((u) => plain[u].art) });

  /* AND DID IT LAND, ON THE RIGHT SIDE.  The reading that matters, and it is
     two readings rather than one: this player drew a BLUE chest and a GREEN
     back, so a sheet that faces the camera must gain blue and no green, and a
     sheet that faces away must gain green and no blue.
     One count would have passed the wrong thing here.  A first run asserted
     "every sheet gains blue" and six of the sixteen failed -- every north and
     northwest one -- which read as a broken bake and was the opposite: those
     are back views, artForFacing had correctly swapped in the back canvas, and
     the player had not drawn one.  Splitting the assertion by facing turns that
     into the thing being defended. */
  const front = urls.filter((u) => !isBack(u));
  const back = urls.filter((u) => isBack(u));
  rec.ok(`the stand-ins come in both facings (guard: ${front.length} toward, ${back.length} away)`,
    front.length > 0 && back.length > 0, { front: front.length, back: back.length });

  const gainedBlue = front.filter((u) => inked[u].ink.blue > plain[u].ink.blue + 40);
  rec.ok(`the CHEST drawing is in the baked pixels of every camera-facing sheet `
    + `(${gainedBlue.length}/${front.length}; e.g. ${front[0].split('/').pop()}: `
    + `${inked[front[0]].ink.blue} blue vs ${plain[front[0]].ink.blue})`,
    gainedBlue.length === front.length,
    { per: front.map((u) => ({ u: u.split('/').pop(), inked: inked[u].ink.blue, plain: plain[u].ink.blue })) });
  rec.ok('...and the BACK drawing is not, because a chest is not a back',
    front.every((u) => inked[u].ink.green <= plain[u].ink.green + 40),
    { per: front.map((u) => ({ u: u.split('/').pop(), inked: inked[u].ink.green, plain: plain[u].ink.green })) });

  const gainedGreen = back.filter((u) => inked[u].ink.green > plain[u].ink.green + 40);
  rec.ok(`the BACK drawing is in the baked pixels of every away-facing sheet `
    + `(${gainedGreen.length}/${back.length}; e.g. ${back[0].split('/').pop()}: `
    + `${inked[back[0]].ink.green} green vs ${plain[back[0]].ink.green})`,
    gainedGreen.length === back.length,
    { per: back.map((u) => ({ u: u.split('/').pop(), inked: inked[u].ink.green, plain: plain[u].ink.green })) });
  rec.ok('...and the chest drawing does NOT wrap round onto them -- artForFacing '
    + 'reaches the stand-ins, which is the half a single-colour test cannot see',
    back.every((u) => inked[u].ink.blue <= plain[u].ink.blue + 40),
    { per: back.map((u) => ({ u: u.split('/').pop(), inked: inked[u].ink.blue, plain: plain[u].ink.blue })) });

  /* ═══ v2.3.2431: ON WHICH FRAME ═══
     The assertions above ask whether ink reached the SHEET.  That is what let a
     bake which mis-sliced the sheet pass this file completely: recolorBodyToCanvas
     did all of its per-frame work with a hard-coded 256px frame, and these sheets
     are 122-402px, so `frames` was floor(w/256) and the stamp windows straddled
     whichever figures fell in them.  Measured at the time:

       bow-north-body      3 frames, ink [407, 0, 0]
       bow-northwest-body  3 frames, ink [1095, 1, 0]
       bow-southwest-body  3 frames, ink [439, 0, 0]
       jog-east-legs      28 frames, ink [31, 0, 82, 0, 102, 0, ...]

     A raised shield draws frame 1 (BLOCK_POSE_FRAME), so on three of the five
     bow facings the block pose carried NO tattoo -- the exact thing this whole
     change exists to fix -- and the trouser print flickered on alternate jog
     frames.  Every one of those sheets satisfied "the drawing is in the baked
     pixels".  So: every frame, and the block frame by name. */
  const BLOCK_FRAME = 1;
  const framed = urls.filter((u) => Array.isArray(inked[u].perFrame) && inked[u].perFrame.length > 1);
  rec.ok(`the probe reports ink per FRAME on multi-frame sheets (guard: ${framed.length})`,
    framed.length >= 6, { framed: framed.length, of: urls.length });

  const gaps = framed.filter((u) => inked[u].perFrame.some((n) => n === 0));
  rec.ok('no frame of any stand-in sheet is left without ink -- the sheet is sliced '
    + 'on its OWN frame width, not on a constant',
    gaps.length === 0,
    { gaps: gaps.map((u) => ({ u: u.split('/').pop(), fw: inked[u].fw, perFrame: inked[u].perFrame })) });

  /* The one a player actually looks at.  Named separately from the sweep above
     because it is the reported symptom rather than a general property, and a
     future art change that legitimately occludes some other frame must not be
     able to quietly take this one with it. */
  const blockSheets = framed.filter((u) => /bow-/.test(u));
  const blockBlank = blockSheets.filter((u) => !(inked[u].perFrame[BLOCK_FRAME] > 0));
  rec.ok(`the BLOCK POSE frame carries ink on every bow sheet (${blockSheets.length} of them) `
    + '-- this is the frame a raised shield draws',
    blockSheets.length > 0 && blockBlank.length === 0,
    { blank: blockBlank.map((u) => u.split('/').pop()),
      perFrame: blockSheets.map((u) => ({ u: u.split('/').pop(), f1: inked[u].perFrame[BLOCK_FRAME] })) });

  /* And the sweep has to be measuring the DRAWING rather than the artwork.  A
     first cut asserted the plain player's frames were empty and three sword
     sheets failed it: sword-east-body reads [68, 204, 112, 292, ...] with nothing
     drawn at all, because that art has its own blue-leading pixels.  The
     whole-canvas assertions above already knew this and compare against the
     plain player; the per-frame ones have to do the same, or they measure the
     sheet.  So: every frame gains ink, frame by frame, over the same frame of
     the same sheet baked for someone who drew nothing. */
  const deltas = framed.map((u) => {
    const a = inked[u].perFrame, b = plain[u].perFrame || [];
    const per = a.map((n, i) => n - (b[i] || 0));
    return { u, min: Math.min(...per), per };
  });
  const thin = deltas.filter((d) => d.min < 20);
  rec.ok('...and every frame GAINED that ink -- measured against the same frame '
    + `of the same sheet with nothing drawn (thinnest gain ${Math.min(...deltas.map((d) => d.min))})`,
    thin.length === 0,
    { thin: thin.map((d) => ({ u: d.u.split('/').pop(), per: d.per })) });

  /* THE MIRRORED TWIN.  Three of the eight facings are drawn by flipping a
     base-dir sheet, and a drawing baked straight in reads backwards there --
     the owner's own report on the shirt (v2.3.1938, "Your smiley face rotated
     the opposite direction").  So the flipped directions get a second bake,
     and only those: a twin for a direction that is never mirrored is memory
     nobody can see, on the platform this game is built for. */
  const mirrored = urls.filter((u) => inked[u].mirrored);
  rec.ok(`some stand-in sheets are drawn flipped and are known to be (guard: ${mirrored.length})`,
    mirrored.length > 0, { mirrored: mirrored.length });
  rec.ok('...each of those has a mirrored twin baked for the inked player',
    mirrored.every((u) => inked[u].twin), { without: mirrored.filter((u) => !inked[u].twin).map((u) => u.split('/').pop()) });
  rec.ok('...and NONE of them costs the plain player a twin, who has nothing to flip',
    urls.every((u) => !plain[u].twin), { with: urls.filter((u) => plain[u].twin).map((u) => u.split('/').pop()) });
  /* ═══ v2.3.2431: NOR THE PLAYER WHOSE DRAWING IS ITS OWN MIRROR ═══
     MEASURED: the twins are 28.78 MB of RGBA, which is the same order as the
     single biggest memory win this repo has shipped.  v2.3.2429 charged that to
     anyone who had inked one cell.  A symmetric drawing bakes to a
     pixel-identical twin, so it is 28.78 MB of duplicate -- and the designer's
     Mirror tool produces symmetric drawings, so this is a common player, not a
     corner case. */
  const symTwins = mirrored.filter((u) => symm[u] && symm[u].twin);
  rec.ok('a drawing that is its own mirror image is baked ONCE -- flipping it '
    + 'cannot change it, so the twin would be ~29 MB of duplicate',
    symTwins.length === 0, { with: symTwins.map((u) => u.split('/').pop()) });
  rec.ok('...and that player still gets the drawing itself (guard: this is a '
    + 'skipped TWIN, not a skipped bake)',
    mirrored.every((u) => symm[u] && symm[u].art),
    { without: mirrored.filter((u) => !(symm[u] && symm[u].art)).map((u) => u.split('/').pop()) });
  const unmirrored = urls.filter((u) => !inked[u].mirrored);
  rec.ok(`...nor is one baked for a direction that is never flipped (${unmirrored.length} such)`,
    unmirrored.every((u) => !inked[u].twin), { with: unmirrored.filter((u) => inked[u].twin).map((u) => u.split('/').pop()) });

  /* NOT ASSERTED, AND WORTH SAYING WHY: the loader also rebakes on
     onArtChange / onPatternChange, beside the skin / pants / shoes hooks it
     copies.  There is no way to exercise that from here, because there is no
     way to exercise it at all -- the designer is reachable only from the
     character creator, which is before the world loads, so no drawing can
     change while these strips are alive.  The hooks are there because the
     three next to them are and because the day a wardrobe opens in-game is
     not the day to remember this file; a test that pretended to prove them
     would need a write hook on the drawing store, which is client surface
     added for no player-facing reason. */

  const errs = A.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors while baking the stand-ins', errs.length === 0, errs.slice(0, 3));
  await A.ctx.close(); await B.ctx.close(); await C.ctx.close();
}
