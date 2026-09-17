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
 *   5. THE GARMENT PATTERNS GO TOO (v2.3.2604 — owner: "'Reset' doesn't reset
 *      shoe or pants patterns.  Those also survive 'randomize'").  A pattern
 *      is NOT one of the canvases above: it lives in patternCatalog's own
 *      store under its own three keys, which is exactly why clearAllArt never
 *      touched it and why this file did not notice for 490 versions.  All
 *      THREE slots are seeded and checked, including the SHIRT — the owner
 *      could only report two because Reset also sets the shirt to 'none', and
 *      a pattern with no shirt under it paints nothing and looks cleared.
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

/* v2.3.2604: the pattern store's own keys (patternCatalog STORAGE_KEY).  The
   seeded tiles are all `small: true` so the SAME value is legal in all three
   slots — shoes refuse the other five (v2.3.1944), and a seed a slot rejects
   would be cleared on load and prove nothing. */
const PAT_KEYS = { shirt: 'bt-shirtpat', pants: 'bt-pantspat', shoes: 'bt-shoespat' };
const PAT_SEED = 'check:5';
/* Rerolling is a random act, so it is proven over a RUN rather than a single
   click: 10 rolls that all land the same value is about a 1-in-1000 event
   (plain carries half the weight, so all-identical is ~0.5^10), while a
   Randomize that does not touch patterns at all returns the seed every time. */
const ROLL_TRIALS = 10;

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Inky', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true });

  const seed = async () => {
    await P.page.evaluate(([ink, keys, slotsKey, patKeys, patSeed]) => {
      try {
        for (const k of keys) localStorage.setItem(k, ink);
        /* An op list for one canvas, so the "shapes go too" half is real
           rather than vacuously true on an empty blob. */
        localStorage.setItem('bt-artops', JSON.stringify({
          tattoo: { base: '0'.repeat(256), ops: [{ t: 'dot', x: 1, y: 1, c: 3 }] },
        }));
        /* A saved design in a slot — the thing that must survive. */
        localStorage.setItem(slotsKey, JSON.stringify({ tattoo: [ink, null, null] }));
        /* v2.3.2604: a pattern on all three garments. */
        for (const k of Object.keys(patKeys)) localStorage.setItem(patKeys[k], patSeed);
      } catch (e) { /* ignore */ }
    }, [INK, Object.keys(CLEAR_KEYS), SLOTS_KEY, PAT_KEYS, PAT_SEED]);
  };

  /* Read the STORE, not just localStorage: setArt writes both, and a clear
     that updated only the in-memory copy would still leave the character
     inked on the next load. */
  const inkState = () => P.page.evaluate(([keys, slotsKey, patKeys]) => {
    const has = (s) => typeof s === 'string' && /[1-9a-f]/.test(s);
    const out = { art: {}, ops: null, slot: false, pat: {} };
    for (const k of Object.keys(patKeys)) out.pat[k] = localStorage.getItem(patKeys[k]) || '';
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
  }, [Object.keys(CLEAR_KEYS), SLOTS_KEY, PAT_KEYS]);

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
    /* v2.3.2604: the seed must have SURVIVED to the creator.  patternCatalog
       reads its keys once at module load and drops anything that does not
       parse, so a seed that never took would make every "it is gone" below
       true for the wrong reason. */
    const patSeeded = Object.keys(PAT_KEYS).every((k) => before.pat[k] === PAT_SEED);
    rec.ok(`...and all three garments carry a pattern before ${label} (guard)`, patSeeded, before.pat);

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

    /* ── v2.3.2604: the garment patterns ── */
    if (label === 'Reset') {
      /* Reset means the bare default, so every slot is plain. */
      for (const slot of Object.keys(PAT_KEYS)) {
        rec.ok(`Reset clears the ${slot} pattern`, after.pat[slot] === '', { slot, pat: after.pat });
      }
    } else {
      /* Randomize REROLLS rather than clears, so the claim is that the value
         moves and that it only ever lands somewhere the picker could have.
         The first click already happened above; `after` is roll 1. */
      const seen = new Set([after.pat.shirt]);
      const rolls = [after.pat];
      const btn2 = await P.page.$('[data-tut="cc-randomize"]');
      for (let i = 1; i < ROLL_TRIALS && btn2; i++) {
        await btn2.click();
        await P.page.waitForTimeout(700);
        const st = await inkState();
        rolls.push(st.pat);
        seen.add(st.pat.shirt);
      }
      rec.ok(`Randomize rerolls the shirt pattern (${ROLL_TRIALS} rolls)`,
        seen.size > 1, { distinct: seen.size, seen: [...seen] });
      /* Not the seed forever: the failure this replaces is "the value never
         moved", which reads as `seen === {PAT_SEED}`. */
      rec.ok('...and does not simply keep the seeded pattern',
        !(seen.size === 1 && seen.has(PAT_SEED)), { seen: [...seen] });

      /* Every landed value must be one the player could also have picked.
         '' is plain; otherwise "<tile>:<1..15>", and SHOES may only wear the
         four small tiles (v2.3.1944) -- rolling `camo` onto a boot would be
         stored, refused by parsePattern at paint time, and show as nothing. */
      const SMALL = ['stripe-v', 'stripe-h', 'check', 'diag'];
      const ALL = SMALL.concat(['dots', 'grid', 'chevron', 'camo', 'diamond']);
      const legal = (v, slot) => {
        if (v === '') return true;
        const m = /^([a-z-]+):(\d+)$/.exec(v);
        if (!m) return false;
        const n = Number(m[2]);
        if (!(n >= 1 && n <= 15)) return false;
        return (slot === 'shoes' ? SMALL : ALL).includes(m[1]);
      };
      for (const slot of Object.keys(PAT_KEYS)) {
        const bad = rolls.map((r) => r[slot]).filter((v) => !legal(v, slot));
        rec.ok(`every ${slot} pattern Randomize lands is one the picker offers`,
          bad.length === 0, { bad, rolled: rolls.map((r) => r[slot]) });
      }
      /* The other two slots roll too -- the owner named exactly these. */
      for (const slot of ['pants', 'shoes']) {
        const distinct = new Set(rolls.map((r) => r[slot]));
        rec.ok(`Randomize rerolls the ${slot} pattern`, distinct.size > 1,
          { distinct: distinct.size, rolled: [...distinct] });
      }
    }
  }

  await P.ctx.close().catch(() => {});
}
