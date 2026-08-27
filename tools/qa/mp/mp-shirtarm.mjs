/* THE T-SHIRT WHILE JOGGING EAST (v2.3.1984).
 *
 * Owner, twice now: "The bare arm showing while jogging east wearing t shirt
 * is still an issue."
 *
 * ── WHY THIS IS A SCREENSHOT SCENARIO ──
 * Reading the sprite sheets does not settle it. The shirt sheet's coverage
 * legitimately shrinks on the frames where the near arm swings across the
 * chest (the artist cuts the crossing arm out of the tee so the arm draws in
 * front — tools/gear/seal-shirt-edges.mjs says so), and a pixel count cannot
 * tell that intended cut-out from a missing sleeve. What the owner is
 * reporting is what the composite LOOKS like in motion, so the honest probe
 * is to run east in a real client and photograph the character.
 *
 * Captures a strip of the character across a full stride, cropped to the
 * figure and zoomed, so the frames can be compared side by side.
 *
 * ── STATUS: STILL OPEN (v2.3.1990) ──
 * v2.3.1986 attempted a fix and was REVERTED the same night: its "crossing
 * arm" detector picked the jaw-and-neck mass on frames 9-11 (the head, neck,
 * torso and arms are one connected skin region, so a horizontal neck cut does
 * not sever the head) and painted a shirt-coloured blob on the character's
 * FACE. The owner caught it in play. See docs/TRAPS.md for the full postmortem
 * and the rules it leaves. The diagnosis below stands; only the fix was wrong.
 *
 * ── v2.3.1999: THE DIAGNOSIS BELOW IS WRONG ABOUT WHICH ARM ──
 * Re-measured from the sheets, and then looked at. The claim below is that
 * the sleeve goes missing on frames 8-11, where the near arm crosses the
 * chest. It does not. Counting bare skin in the top 8 rows of the shirt's own
 * band, with neck columns excluded, over one 14-frame cycle of jog-east:
 *
 *     frame   0  1  2  3  4  5  6  7  8  9 10 11 12 13
 *     bare    4  8  6  4  6  3  3  0  0  2  0  0  0  1
 *     armRow  5  3  4  4  4  5  3  8 10  5 11  8  8  7
 *
 * `armRow` is how far down the shirt's band the outer arm first shows bare.
 * The frames the old note accuses (7-12) are the BEST ones — the arm stays
 * covered to row 8-11 and nothing bare reaches the shoulder. The frames that
 * are wrong are 0-6, and it is the TRAILING arm, the one swinging behind,
 * not the one crossing in front: it is bare from the shoulder joint down,
 * while the leading arm on the same frame carries a correct white sleeve.
 * Rendered at 20x, frames 1-4, that is unmistakable.
 *
 * This matters beyond bookkeeping. v2.3.1986 built a "crossing arm" detector
 * to fix frames it had no business touching, and that detector is what found
 * the jaw and painted the face. The wrong target came first; the wrong
 * mechanism followed it.
 *
 * One measured consequence for whoever fixes it: most of the bare trailing
 * arm lies OUTSIDE the shirt's own bounding box (that is why the counts above
 * are single digits — they only see inside it). So this cannot be closed by a
 * fill rule that grows the shirt within its silhouette, the way the v2.3.1995
 * keyline work did. It needs the shoulder EXTENDED over the arm, which is new
 * art, which is the direction that adds pixels — the dangerous one. Whatever
 * does it must hold the invariant v2.3.1986 lacked: never write above the
 * shirt's own topmost row in that frame, and never on a column whose skin
 * continues up out of the collar. Both are cheap to assert per frame.
 *
 * ── WHAT THE v2.3.1986 SESSION BELIEVED (kept for the record) ──
 * v2.3.1986 diagnosed it. The tee's coverage is PROPORTIONALLY constant across
 * the cycle (0.63-0.71 of the torso band, both halves), so the shirt was never
 * shrinking and the near arm crossing the chest for half the stride is correct
 * animation. What was missing was the SLEEVE: on frames 8-11 the arm tucks in
 * front of the torso and the artist's deliberate cut-out took the sleeve with
 * it, leaving the arm bare from the shoulder JOINT down — the character read
 * as wearing a tank top for those four frames.
 * So in this strip, the figures whose near arm tucks in front of the torso
 * still show that arm bare to the shoulder joint. That is the open bug. When
 * it is fixed, they should show white at the shoulder — and the fix must
 * assert it never touches the head, which is exactly what v2.3.1986 did not do.
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Jogger', wsPort, webPort, viewport: { width: 390, height: 844 } });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2000);

  /* A plain white tee and nothing over it — the loadout the report is about. */
  const armed = await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (!S) return null;
    S._equip = S._equip || {};
    try {
      const g = window.__btGear || null;
      if (g && g.setEquip) { g.setEquip('shirt', 'tshirt'); g.setEquip('chest', 'none'); }
    } catch (e) { /* fall through to the state read below */ }
    /* HAIR ON, and it is not a detail: the hair is a separate trait sprite
       composited over the run, so a bald probe cannot see anything the hair
       does wrong. The v2.3.1990 hunt for a reported "blob on the face" in all
       jog directions ran bald first and found nothing, which is exactly the
       false negative this line removes. Afro because it is the tallest and
       widest of the eight and the one the owner tests with. */
    try { if (window.__btSetHair) window.__btSetHair('afro'); } catch (e) { /* bald is still a run */ }
    return { shirt: S.myShirt || null, equip: S._equip };
  });
  rec.ok('the client is up and reports its loadout (guard)', armed !== null, armed);

  /* Run in EVERY direction and photograph each stride. The canvas is
     camera-centred on the player, so the crop is the middle of the play area.
     All four because the owner's follow-up on the v2.3.1986 regression was
     "Looks like it's all jog directions" — a probe that only ever looks east
     cannot answer that, and answering it was what showed the shirt sheets were
     clean and sent the hunt somewhere else. */
  const DIRS = [['d', 'east'], ['a', 'west'], ['s', 'south'], ['w', 'north']];
  const shots = [];
  for (const [key] of DIRS) {
    await P.page.keyboard.down(key);
    for (let i = 0; i < 8; i++) {
      await P.page.waitForTimeout(110);
      const b = await P.page.evaluate(() => {
        const c = document.querySelector('canvas');
        const r = c.getBoundingClientRect();
        return { x: Math.round(r.x + r.width / 2 - 32), y: Math.round(r.y + r.height / 2 - 62), width: 64, height: 78 };
      });
      shots.push(await P.page.screenshot({ clip: b }));
    }
    await P.page.keyboard.up(key);
    await P.page.waitForTimeout(200);
  }

  rec.ok(`photographed a stride in all ${DIRS.length} directions`, shots.length === DIRS.length * 8,
    { shots: shots.length });

  /* Stitched into one strip so a human can compare the stride at a glance. */
  const strip = await P.page.evaluate(async (pngs) => {
    const imgs = await Promise.all(pngs.map((b64) => new Promise((res) => {
      const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null);
      im.src = 'data:image/png;base64,' + b64;
    })));
    const ok = imgs.filter(Boolean);
    if (!ok.length) return null;
    const S = 6;
    const cv = document.createElement('canvas');
    cv.width = ok.length * ok[0].width * S; cv.height = ok[0].height * S;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#14202a'; g.fillRect(0, 0, cv.width, cv.height);
    ok.forEach((im, i) => g.drawImage(im, i * im.width * S, 0, im.width * S, im.height * S));
    return cv.toDataURL('image/png');
  }, shots.map((b) => b.toString('base64')));

  if (strip) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(H.REPO + '/tools/qa/mp/.last-shirtarm.png',
      Buffer.from(strip.split(',')[1], 'base64'));
  }
  rec.ok('a stride strip was captured to look at', !!strip, { shots: shots.length });

  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await P.ctx.close();
}
