/* Does the face in the HUD corner match the character you are playing?
 * (v2.3.1835)
 *
 * Owner: "the character displayed in the HUD doesn't match the character
 * played anymore."
 *
 * The portrait is generated from a snapshot of eleven wardrobe stores, so it
 * goes stale in exactly two ways and neither is visible from the code: a
 * store nobody subscribed to, and an async render that finishes out of order.
 * This changes one cosmetic at a time and asserts the corner follows.
 *
 * WHY IT COMPARES THE IMAGE AND NOT THE STATE.  Asserting that the store
 * changed would pass with the portrait frozen — the store was never the
 * broken half.  The only thing that proves the picture is current is the
 * picture, so this reads the <img> the player is actually looking at.
 */
import * as H from './harness.mjs';

const PORTRAIT = 'img[alt="Portrait"]';

/* A cheap stable fingerprint of the data URL — the whole thing is ~10-40KB
   and comparing it wholesale would put a blob that size in every failure
   report for no extra information. */
const fingerprint = (P) => P.page.evaluate((sel) => {
  const img = document.querySelector(sel);
  if (!img) return null;
  const s = img.getAttribute('src') || '';
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
  return { len: s.length, hash: h, isData: s.slice(0, 5) === 'data:' };
}, PORTRAIT);

/* Pick a catalog entry that is NOT the one currently worn, so "it changed"
   cannot pass by setting a value to itself. */
const swap = (P, catalog, getter, setter) => P.page.evaluate(({ c, g, s }) => {
  const f = window._gameFns;
  if (!f || !f[c] || !f[s]) return { ok: false, why: 'no ' + c + '/' + s };
  const cur = f[g] ? f[g]() : null;
  const pick = (f[c] || []).find((x) => x && x.id && x.id !== 'none' && x.id !== cur);
  if (!pick) return { ok: false, why: 'no alternative in ' + c, cur };
  try { f[s](pick.id); } catch (e) { return { ok: false, why: String(e && e.message) }; }
  return { ok: true, from: cur, to: pick.id };
}, { c: catalog, g: getter, s: setter });

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Face', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3500);

  const first = await fingerprint(P);
  rec.ok('the HUD shows a portrait at all (guard)', !!first, { first });
  /* If it is still the fallback icon the comparisons below would be
     measuring a static PNG, so say so rather than letting them look green. */
  rec.ok('...and it is a RENDERED portrait, not the fallback icon (guard)',
    !!(first && first.isData), { first });

  /* Only the two stores window._gameFns actually exposes.  Hair and skin are
     driven the same way and are already subscribed; adding them here would
     mean widening a debug surface for no coverage this bug needs. */
  const CASES = [
    ['headwear',    'HEADWEAR_CATALOG',   'getHeadwear',   'setHeadwear'],
    ['facial hair', 'FACIALHAIR_CATALOG', 'getFacialHair', 'setFacialHair'],
  ];

  let prev = first;
  for (const [label, cat, getter, setter] of CASES) {
    const did = await swap(P, cat, getter, setter);
    rec.ok(`the game let us change the ${label} (guard)`, !!(did && did.ok), did);
    if (!did || !did.ok) continue;
    /* Wait for the REPAINT, not the clock: portraitDataUrl is async and a
       fixed sleep would either flake or hide a slow path. */
    const t0 = Date.now();
    let now = prev;
    for (;;) {
      now = await fingerprint(P);
      if (now && prev && (now.hash !== prev.hash || now.len !== prev.len)) break;
      if (Date.now() - t0 > 6000) break;
      await P.page.waitForTimeout(120);
    }
    rec.ok(`changing the ${label} repaints the face in the HUD`,
      !!(now && prev && (now.hash !== prev.hash || now.len !== prev.len)),
      { changed: did, before: prev, after: now });
    prev = now;
  }

  /* ═══ THE RACE ═══
     Rolling a random bro fires ten setters in a row and each starts an async
     render.  Whichever FINISHES last used to win rather than whichever
     STARTED last, so a slow early portrait could land after a fast late one
     and leave the corner showing a character already changed away from.

     THE OBVIOUS TEST DOES NOT WORK, and it passed before I noticed: re-set
     the last hat and check the portrait does not move.  setHeadwear is a
     no-op when the id is unchanged (`if (id === _active) return`), so no
     event fires, no render starts, and the portrait cannot move whether it
     is stale or not.  Vacuous.

     What does work is comparing the burst's result against the SAME hat
     reached slowly.  Fire A,B,C in one tick and let it settle; then go via a
     fourth hat and come back to C one change at a time, which cannot race.
     The two images must be identical.  A portrait left on A or B by the race
     differs from C's, and that is the whole bug. */
  const hats = await P.page.evaluate(() => {
    const f = window._gameFns;
    const all = ((f && f.HEADWEAR_CATALOG) || []).filter((h) => h && h.id && h.id !== 'none');
    return all.slice(0, 4).map((h) => h.id);
  });
  rec.ok('there are four hats to race with (guard)', hats.length === 4, { hats });
  if (hats.length === 4) {
    const [a, b, c, d] = hats;
    const settle = async () => {
      /* Wait for the image to stop moving rather than for a fixed time. */
      let last = null, stableFor = 0;
      for (let i = 0; i < 60; i++) {
        const f = await fingerprint(P);
        if (last && f && f.hash === last.hash && f.len === last.len) {
          if (++stableFor >= 4) return f;
        } else { stableFor = 0; }
        last = f;
        await P.page.waitForTimeout(120);
      }
      return last;
    };
    /* Make sure we are not already wearing c, or the burst's last step would
       be the no-op above and the whole thing would prove nothing. */
    await P.page.evaluate((id) => { try { window._gameFns.setHeadwear(id); } catch (e) {} }, d);
    await settle();
    await P.page.evaluate((seq) => {
      for (const id of seq) { try { window._gameFns.setHeadwear(id); } catch (e) {} }
    }, [a, b, c]);
    const afterBurst = await settle();

    /* Now reach the same hat slowly: d, settle, c, settle. */
    await P.page.evaluate((id) => { try { window._gameFns.setHeadwear(id); } catch (e) {} }, d);
    await settle();
    await P.page.evaluate((id) => { try { window._gameFns.setHeadwear(id); } catch (e) {} }, c);
    const canonical = await settle();

    rec.ok('a burst of hat changes leaves the HUD on the LAST one, not an earlier one',
      !!(afterBurst && canonical && afterBurst.hash === canonical.hash
        && afterBurst.len === canonical.len),
      { burst: [a, b, c], afterBurst, sameHatReachedSlowly: canonical });
  }
}
