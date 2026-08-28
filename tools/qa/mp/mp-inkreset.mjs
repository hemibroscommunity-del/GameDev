/* ═══ v2.3.2114: RESET AND RANDOMIZE CLEAR THE TATTOOS ═══
 *
 * Owner: "The tattoos are not resetting through character reset and
 * randomize."
 *
 * They did not, on purpose, until this version: v2.3.2036's Reset left the
 * painted canvases alone rather than wipe a drawing from a button labelled
 * Reset.  The owner has asked for the opposite, so the claim to prove is that
 * both whole-character buttons now clear the ink — and there are three ways
 * for that to look right and be wrong, which is why this file exists:
 *
 *   1. THERE ARE FOUR TATTOO CANVASES, not one.  Chest, face, arm (v2.3.1949)
 *      and the back of the head (v2.3.2043).  A clear that misses one looks
 *      like it worked until the character turns round, so every canvas is
 *      seeded and every canvas is checked.
 *   2. A DRAWING HAS TWO HALVES.  The flat 256-char art AND the op list that
 *      still knows which shapes it is made of (artOps, v2.3.1967).  Clearing
 *      the pixels while leaving the shapes leaves the editor holding a
 *      drawing that no longer exists, so the ops blob is checked too.
 *   3. THE CLOTHING DESIGNS GO TOO (v2.3.2115 — owner: "Yes make the shirt
 *      and pants reset too").  Three more canvases, and the shirt is TWO of
 *      them: front and back have been separate since v2.3.1939, so a clear
 *      that only knows about "the shirt" leaves a drawing on the character's
 *      back — the same turn-around failure as the tattoos, one garment along.
 *   4. THE DESIGN SLOTS MUST SURVIVE.  They are the whole reason a button
 *      that erases drawings is honest rather than destructive (v2.3.1950:
 *      "try something without losing what you had"), so the saved slots are
 *      seeded and asserted UNCHANGED.  Nothing else in this file would catch
 *      a clear that reached into them.
 *
 * The art is seeded straight into localStorage the way mp-inkplace does, and
 * BEFORE the load that matters: playerArt.js reads these keys once at module
 * load, so seeding after the page is up would set storage the running code
 * never looks at.
 *
 *   node tools/qa/mp/run.mjs inkreset
 */
import * as H from './harness.mjs';

/* A few cells of colour 3 — enough for artHasInk, short of anything clever. */
const INK = '3'.repeat(8) + '0'.repeat(248);

/* Every painted canvas, by its storage key (playerArt.js STORAGE_KEY). */
const CLEAR_KEYS = {
  'bt-tattooart': 'the chest tattoo',
  'bt-facetattoo': 'the face tattoo',
  'bt-armtattoo': 'the arm tattoo',
  'bt-headbackart': 'the back-of-head tattoo',
  'bt-shirtart': 'the shirt front design',
  'bt-shirtart-back': 'the shirt BACK design',
  'bt-pantsart': 'the trouser print',
};
/* The saved slots, which must NOT be touched. */
const SLOTS_KEY = 'bt-artslots';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Inky', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true });

  const seed = async () => {
    await P.page.evaluate(([ink, keys, slotsKey]) => {
      try {
        for (const k of keys) localStorage.setItem(k, ink);
        /* An op list for one canvas, so the "shapes go too" half is real
           rather than vacuously true on an empty blob. */
        localStorage.setItem('bt-artops', JSON.stringify({
          tattoo: { base: '0'.repeat(256), ops: [{ t: 'dot', x: 1, y: 1, c: 3 }] },
        }));
        /* A saved design in a slot — the thing that must survive. */
        localStorage.setItem(slotsKey, JSON.stringify({ tattoo: [ink, null, null] }));
      } catch (e) { /* ignore */ }
    }, [INK, Object.keys(CLEAR_KEYS), SLOTS_KEY]);
  };

  /* Read the STORE, not just localStorage: setArt writes both, and a clear
     that updated only the in-memory copy would still leave the character
     inked on the next load. */
  const inkState = () => P.page.evaluate(([keys, slotsKey]) => {
    const has = (s) => typeof s === 'string' && /[1-9a-f]/.test(s);
    const out = { art: {}, ops: null, slot: false };
    for (const k of keys) out.art[k] = has(localStorage.getItem(k));
    try {
      const blob = JSON.parse(localStorage.getItem('bt-artops') || '{}');
      out.ops = (blob && blob.tattoo && (blob.tattoo.ops || []).length) || 0;
    } catch (e) { out.ops = -1; }
    try {
      const slots = JSON.parse(localStorage.getItem(slotsKey) || '{}');
      out.slot = has(slots && slots.tattoo && slots.tattoo[0]);
    } catch (e) { out.slot = false; }
    return out;
  }, [Object.keys(CLEAR_KEYS), SLOTS_KEY]);

  const openCreator = async () => {
    await H.uncoverDoor(P.page);
    const create = await P.page.$('[data-tut="login-create"]');
    if (!create) return false;
    await Promise.all([
      P.page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
      create.click(),
    ]);
    await P.page.waitForTimeout(2500);
    return !!(await P.page.$('.bt-cc-shell'));
  };

  /* ── the two buttons, one road each ── */
  for (const [label, hook] of [['Reset', 'cc-reset'], ['Randomize Look', 'cc-randomize']]) {
    await seed();
    await P.page.reload({ waitUntil: 'domcontentloaded' });
    await P.page.waitForTimeout(2000);
    /* A create road may already have run for the first button; seed again
       after any navigation it caused, then confirm the ink survived TO the
       creator — otherwise a later "it is gone" proves nothing. */
    const inCreator = (await P.page.$('.bt-cc-shell')) ? true : await openCreator();
    rec.ok(`the creator is open for ${label} (guard)`, inCreator === true, {});
    if (!inCreator) continue;

    const before = await inkState();
    const allInked = Object.values(before.art).every(Boolean);
    rec.ok(`all seven canvases are drawn before ${label} (guard)`, allInked, before.art);
    rec.ok(`...and the shapes are recorded before ${label} (guard)`, before.ops > 0, { ops: before.ops });
    rec.ok(`...and a design is saved in a slot before ${label} (guard)`, before.slot === true, { slot: before.slot });

    const btn = await P.page.$(`[data-tut="${hook}"]`);
    rec.ok(`the creator has a ${label} button (guard)`, !!btn, {});
    if (!btn) continue;
    await btn.click();
    /* Randomize rolls for ~330ms of flair; the clear is synchronous but the
       wait costs nothing and makes the two roads read the same. */
    await P.page.waitForTimeout(900);

    const after = await inkState();
    for (const [key, name] of Object.entries(CLEAR_KEYS)) {
      rec.ok(`${label} clears ${name}`, after.art[key] === false, { key, after: after.art });
    }
    rec.ok(`${label} drops the drawing's shapes with it`, after.ops === 0, { ops: after.ops });
    /* The one thing that must NOT go — see claim 4 in the header. */
    rec.ok(`${label} leaves the saved design slot alone`, after.slot === true, { slot: after.slot });
  }

  await P.ctx.close().catch(() => {});
}
