/* ═══ THE BACK OF THE BODY IS ITS OWN CANVAS (v2.3.2148) ═══
 *
 * Owner: "make it so that the back and front of the character body have
 * separate tattoos areas so body and face should have a front and back now."
 *
 * The FACE half of that was already done (v2.3.2043 gave the head a back
 * canvas) and the shirt has had two sides since v2.3.1939. The TORSO was the
 * one surface still showing its front drawing to somebody standing behind you.
 *
 * Two things have to hold and they fail in different ways, so they are checked
 * separately:
 *   1. the editor can reach the new canvas and inks it WITHOUT touching the
 *      chest -- checked in localStorage, which is exact and has no pixels in
 *      it;
 *   2. the renderer picks a DIFFERENT drawing when the character faces away --
 *      checked through the body-sheet cache keys, because those keys are
 *      literally derived from the art that went into each bake (bodyArtSeg),
 *      so a front-facing sheet and a back-facing sheet sharing a key would BE
 *      the bug.
 */
import * as H from './harness.mjs';

const KEYS = { tattoo: 'bt-tattooart', tattooBack: 'bt-tattooart-back' };
const inked = (a) => (a ? [...a].filter((c) => c !== '0').length : 0);
/* 256 cells, one hex char each -- the shape playerArt.isValidArt demands. */
const art = (ch, n) => ch.repeat(n) + '0'.repeat(256 - n);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Inker', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);

  /* ── 1. the canvas exists and is separate ── */
  const wrote = await P.page.evaluate(([k, front, back]) => {
    try {
      localStorage.setItem(k.tattoo, front);
      localStorage.setItem(k.tattooBack, back);
      return true;
    } catch (e) { return false; }
  }, [KEYS, art('a', 40), art('c', 90)]);
  rec.ok('both torso canvases could be written (guard)', wrote);

  await P.page.reload({ waitUntil: 'domcontentloaded' });
  await P.page.waitForTimeout(1200);
  const created = await P.page.$('[data-tut="login-create"]');
  if (created) await created.click();
  await H.enterWorld(P).catch(() => {});
  await P.page.waitForTimeout(2500);

  const back = await P.page.evaluate((k) => {
    const out = {};
    for (const n of Object.keys(k)) { try { out[n] = localStorage.getItem(k[n]) || ''; } catch (e) { out[n] = ''; } }
    return out;
  }, KEYS);
  rec.ok('the chest drawing survived the reload (guard)', inked(back.tattoo) === 40,
    { chest: inked(back.tattoo) });
  rec.ok('...and the BACK drawing is stored separately, at its own size -- one '
    + 'canvas cannot be the other', inked(back.tattooBack) === 90,
    { chest: inked(back.tattoo), back: inked(back.tattooBack) });

  /* ── 2. facing away resolves to the OTHER drawing ── */
  /* THROUGH THE DECISION, NOT THROUGH THE CACHE. The first cut of this read
     window.__btBodySheetKeys() and compared the art segment of south-facing
     against north-facing sheets -- and passed identically with the swap
     reverted, because that cache accumulates across the whole session, so
     filtering it by direction reports bakes that already existed rather than
     what the renderer would choose now. __btArtForFacing answers the actual
     question. */
  const facing = (dir) => P.page.evaluate((d) => (window.__btArtForFacing ? window.__btArtForFacing(d) : null), dir);
  const s0 = await facing('south');
  const n0 = await facing('north');
  rec.ok('the facing probe is wired (guard: null answers prove nothing)',
    !!(s0 && n0 && typeof s0.tattoo === 'string' && typeof n0.tattoo === 'string'),
    { s0: s0 && inked(s0.tattoo), n0: n0 && inked(n0.tattoo) });
  rec.ok('facing the camera, the torso wears the CHEST drawing',
    !!(s0 && inked(s0.tattoo) === 40), { cells: s0 && inked(s0.tattoo) });
  rec.ok("facing away, it wears the BACK drawing instead -- the owner's ask: "
    + 'the chest design no longer wraps round you',
    !!(n0 && inked(n0.tattoo) === 90), { cells: n0 && inked(n0.tattoo) });

  /* And the half that is easy to lose: someone who has drawn only a chest
     piece must show a BARE back, not their chest wrapped round.

     Cleared and RELOADED, not just written: playerArt keeps the active
     drawings in a module-scope store read once at boot, so a late
     localStorage write is invisible to getArt until the next load. Writing it
     and probing straight away reported the old 90-cell back drawing and looked
     like a failure of the fix. */
  await P.page.evaluate((k) => { try { localStorage.setItem(k.tattooBack, '0'.repeat(256)); } catch (e) {} }, KEYS);
  await P.page.reload({ waitUntil: 'domcontentloaded' });
  await P.page.waitForTimeout(1200);
  const created2 = await P.page.$('[data-tut="login-create"]');
  if (created2) await created2.click();
  await H.enterWorld(P).catch(() => {});
  await P.page.waitForTimeout(2500);
  const n1 = await facing('north');
  rec.ok('...and with no back drawing at all the back is BARE, rather than '
    + 'falling back to the chest', !!(n1 && inked(n1.tattoo) === 0),
    { cells: n1 && inked(n1.tattoo) });

  await P.ctx.close();
}
