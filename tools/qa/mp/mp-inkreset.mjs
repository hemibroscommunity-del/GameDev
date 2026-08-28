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
 *   3. IT MUST NOT CLEAR WHAT WAS NOT ASKED FOR.  The shirt and pants designs
 *      are the same kind of object stored the same way; a clear written by
 *      canvas prefix could take them with it and nobody would notice until
 *      someone lost a trouser print.  Both are seeded and asserted UNCHANGED.
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

const TATTOO_KEYS = {
  'bt-tattooart': 'the chest tattoo',
  'bt-facetattoo': 'the face tattoo',
  'bt-armtattoo': 'the arm tattoo',
  'bt-headbackart': 'the back-of-head tattoo',
};
const KEEP_KEYS = {
  'bt-pantsart': 'the trouser print',
  'bt-shirtart': 'the shirt design',
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Inky', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true });

  const seed = async () => {
    await P.page.evaluate(([ink, tat, keep]) => {
      try {
        for (const k of tat) localStorage.setItem(k, ink);
        for (const k of keep) localStorage.setItem(k, ink);
        /* An op list for one canvas, so the "shapes go too" half is real
           rather than vacuously true on an empty blob. */
        localStorage.setItem('bt-artops', JSON.stringify({
          tattoo: { base: '0'.repeat(256), ops: [{ t: 'dot', x: 1, y: 1, c: 3 }] },
        }));
      } catch (e) { /* ignore */ }
    }, [INK, Object.keys(TATTOO_KEYS), Object.keys(KEEP_KEYS)]);
  };

  /* Read the STORE, not just localStorage: setArt writes both, and a clear
     that updated only the in-memory copy would still leave the character
     inked on the next load. */
  const inkState = () => P.page.evaluate(([tat, keep]) => {
    const has = (s) => typeof s === 'string' && /[1-9a-f]/.test(s);
    const out = { tattoos: {}, keep: {}, ops: null };
    for (const k of tat) out.tattoos[k] = has(localStorage.getItem(k));
    for (const k of keep) out.keep[k] = has(localStorage.getItem(k));
    try {
      const blob = JSON.parse(localStorage.getItem('bt-artops') || '{}');
      out.ops = (blob && blob.tattoo && (blob.tattoo.ops || []).length) || 0;
    } catch (e) { out.ops = -1; }
    return out;
  }, [Object.keys(TATTOO_KEYS), Object.keys(KEEP_KEYS)]);

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
    const allInked = Object.values(before.tattoos).every(Boolean);
    rec.ok(`all four tattoos are drawn before ${label} (guard)`, allInked, before.tattoos);
    rec.ok(`...and the shapes are recorded before ${label} (guard)`, before.ops > 0, { ops: before.ops });

    const btn = await P.page.$(`[data-tut="${hook}"]`);
    rec.ok(`the creator has a ${label} button (guard)`, !!btn, {});
    if (!btn) continue;
    await btn.click();
    /* Randomize rolls for ~330ms of flair; the clear is synchronous but the
       wait costs nothing and makes the two roads read the same. */
    await P.page.waitForTimeout(900);

    const after = await inkState();
    for (const [key, name] of Object.entries(TATTOO_KEYS)) {
      rec.ok(`${label} clears ${name}`, after.tattoos[key] === false, { key, after: after.tattoos });
    }
    rec.ok(`${label} drops the tattoo's shapes with it`, after.ops === 0, { ops: after.ops });
    for (const [key, name] of Object.entries(KEEP_KEYS)) {
      rec.ok(`${label} leaves ${name} alone`, after.keep[key] === true, { key, after: after.keep });
    }
  }

  await P.ctx.close().catch(() => {});
}
