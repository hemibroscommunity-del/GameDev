/* YOUR CHARACTER FOLLOWS YOU TO A NEW PHONE (v2.3.2444).
 *
 * src/game/characterRecord.js exists, by its own header, to stop "my
 * character looks right to everyone except me".  It restored 13 of the 38
 * keys the worker keeps in the permanent look, so twenty were read off the
 * wire and dropped -- among them every drawing, every garment pattern and the
 * eye colour.  Peers kept seeing them, because the stored look is forced onto
 * the join frame and the 2s relay is a delta merge that never clears what the
 * new device omits.
 *
 * The only honest test of that is TWO DEVICES.  One browser context creates
 * the character and inks it; a SECOND context arrives with the same Login Key
 * and nothing else -- no drawings, no patterns, no eye colour in its storage
 * -- which is exactly a new phone.  Every assertion then reads the second
 * device's OWN store, because the bug was never about what the server had.
 *
 * A scenario that drove the editor would prove less: the drawings are seeded
 * straight into storage here so the first device is unambiguous, and what is
 * under test is the road home, not the paint tools.
 */
import * as H from './harness.mjs';

/* one canvas per art key, so a mix-up between them cannot pass */
const INK = {
  'bt-shirtart': '1', 'bt-shirtart-back': '2', 'bt-pantsart': '3',
  'bt-pantsart-back': '4', 'bt-tattooart': '5', 'bt-tattooart-back': '6',
  'bt-facetattoo': '7', 'bt-armtattoo': '8', 'bt-headbackart': '9',
};
const ART = Object.fromEntries(Object.entries(INK).map(([k, c]) => [k, c.repeat(256)]));
const PATS = { 'bt-shirtpat': 'stripe-v:3', 'bt-pantspat': 'check:6', 'bt-shoespat': 'stripe-h:2' };
const EYE = 'green';

const read = (P, keys) => P.page.evaluate((ks) => {
  const out = {};
  for (const k of ks) out[k] = localStorage.getItem(k);
  return out;
}, keys);

export async function run({ browser, wsPort, webPort, rec }) {
  const tag = 'lookrestore';
  const phrase = 'qa-lookrestore-' + webPort;   /* per-run, so the worker has no record yet */

  /* ── device one: create the character, wearing everything ── */
  const A = await H.newPlayer(browser, {
    name: 'Inked', wsPort, webPort, phrase,
    init: `
      ${Object.entries(ART).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(v)});`).join('\n')}
      ${Object.entries(PATS).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(v)});`).join('\n')}
      localStorage.setItem('bt-eyecolor', ${JSON.stringify(EYE)});
    `,
  });
  await H.enterWorld(A);
  await A.page.waitForTimeout(2500);            /* let the join frame land the record */

  const sent = await read(A, [...Object.keys(ART), ...Object.keys(PATS), 'bt-eyecolor']);
  rec.ok(`${tag}: device one really is wearing all nine drawings, three patterns and an eye colour`,
    Object.keys(ART).every((k) => sent[k] === ART[k])
    && Object.keys(PATS).every((k) => sent[k] === PATS[k])
    && sent['bt-eyecolor'] === EYE);
  await A.ctx.close();

  /* ── device two: same Login Key, empty storage ── */
  const B = await H.newPlayer(browser, { name: 'Inked', wsPort, webPort, phrase });
  const before = await read(B, Object.keys(ART));
  rec.ok(`${tag}: device two starts with no drawings at all, which is what a new phone is`,
    Object.values(before).every((v) => v === null));

  await H.enterWorld(B);
  await B.page.waitForTimeout(3000);            /* state_sync -> applyCharacterRecord */

  const got = await read(B, [...Object.keys(ART), ...Object.keys(PATS), 'bt-eyecolor']);

  /* every drawing, named one at a time -- a loop that passed on eight of nine
     would report the feature as working */
  for (const [k, want] of Object.entries(ART)) {
    rec.ok(`${tag}: ${k} came back on the new device, byte for byte`, got[k] === want,
      got[k] ? ('got ' + got[k].slice(0, 8) + '... want ' + want.slice(0, 8) + '...') : 'got nothing');
  }
  for (const [k, want] of Object.entries(PATS)) {
    rec.ok(`${tag}: ${k} came back on the new device`, got[k] === want, got[k]);
  }
  rec.ok(`${tag}: the eye colour came back`, got['bt-eyecolor'] === EYE, got['bt-eyecolor']);

  /* and the character actually wears them -- the store is the road, not the
     destination.  __btArtForFacing is the renderer's own answer. */
  const worn = await B.page.evaluate(() => {
    const f = window.__btArtForFacing;
    return f ? { has: true, south: !!(f('south') && f('south').tattoo) } : { has: false };
  });
  rec.ok(`${tag}: the renderer sees the restored chest tattoo (probe ${worn.has ? 'read' : 'absent'})`,
    !worn.has || worn.south, worn);

  await B.ctx.close();
}
