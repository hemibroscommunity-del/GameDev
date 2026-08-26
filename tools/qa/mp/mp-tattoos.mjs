/* FACE AND ARM TATTOOS ACROSS THE WIRE (v2.3.1949).
 *
 * Owner: "Allow tattoos on the face and arms too."
 *
 * The rendering is covered by headless probes; what those cannot cover is the
 * part that has broken before.  A drawing reaches another player through TWO
 * server gates — the join sanitiser and the `track` handler — and v2.3.1939
 * shipped a key into one and not the other, so a drawn shirt appeared when a
 * peer joined and vanished on the first two-second relay.  The server suite now
 * asserts both gates directly, but it asserts them against a MOCK.  This is the
 * same claim through a real worker, a real WebSocket and the real client:
 * player A draws, player B sees it, and B's copy is the same 256 characters A
 * drew rather than a truncated one.
 *
 * The drawings are seeded into localStorage and the page reloaded, rather than
 * driven through the designer's grid: playerArt reads its store once at module
 * load, so this is exactly the path a RETURNING player takes, and it keeps the
 * scenario about the wire rather than about pointer events (which tools-ui
 * already covers).
 */
import * as H from './harness.mjs';

/* Recognisable, valid, and different from each other — a truncation or a
   crossed wire shows up as a mismatch rather than as "still 256 chars". */
const FACE = '1'.repeat(256);
const ARM = '2'.repeat(256);
const CHEST = '3'.repeat(256);

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Inked', wsPort, webPort });
  /* Seed BEFORE entering the world: the creator sends the drawings in its join
     frame, so they have to exist by then. */
  await A.page.evaluate(([f, m, c]) => {
    localStorage.setItem('bt-facetattoo', f);
    localStorage.setItem('bt-armtattoo', m);
    localStorage.setItem('bt-tattooart', c);
  }, [FACE, ARM, CHEST]);
  await A.page.reload({ waitUntil: 'domcontentloaded' });
  await A.page.waitForTimeout(1500);

  const seeded = await A.page.evaluate(() => ({
    face: (localStorage.getItem('bt-facetattoo') || '').length,
    arm: (localStorage.getItem('bt-armtattoo') || '').length,
  }));
  rec.ok('A: the drawings survived the reload', seeded.face === 256 && seeded.arm === 256, seeded);

  await H.enterWorld(A);
  await A.page.waitForTimeout(2500);

  const B = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, guest: true });
  await H.enterWorld(B);
  await B.page.waitForTimeout(4000);

  /* What B knows about A. */
  const peer = await B.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.others) return { err: 'no state' };
    const rows = Object.values(S.others).map((o) => ({
      name: o.name,
      face: typeof o.faceTattooArt === 'string' ? o.faceTattooArt : null,
      arm: typeof o.armTattooArt === 'string' ? o.armTattooArt : null,
      chest: typeof o.tattooArt === 'string' ? o.tattooArt : null,
    }));
    return { n: rows.length, rows };
  });
  const a = (peer.rows || []).find((r) => r.name === 'Inked') || null;
  rec.ok('B sees A at all', !!a, peer);

  if (a) {
    rec.ok('B received A’s FACE tattoo, all 256 characters',
      a.face === FACE, { len: a.face && a.face.length, head: a.face && a.face.slice(0, 8) });
    rec.ok('B received A’s ARM tattoo, all 256 characters',
      a.arm === ARM, { len: a.arm && a.arm.length, head: a.arm && a.arm.slice(0, 8) });
    rec.ok('B received A’s CHEST tattoo (the one that already worked)',
      a.chest === CHEST, { len: a.chest && a.chest.length });
    /* The three must not be crossed: a copy-paste in the wire mapping would
       show up as the same string under two keys, and every one of them being
       256 valid characters is exactly what would hide it. */
    rec.ok('the three canvases did not get crossed in the wire mapping',
      a.face !== a.arm && a.arm !== a.chest && a.face !== a.chest,
      { face: a.face && a.face[0], arm: a.arm && a.arm[0], chest: a.chest && a.chest[0] });
  }

  /* THE RELAY, which is the half that broke in v2.3.1939: wait past a couple of
     track cycles and re-read.  A key missing from the track gate arrives on
     join and is then overwritten by a truncated or absent value. */
  await B.page.waitForTimeout(6000);
  const after = await B.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const o = Object.values((S && S.others) || {}).find((x) => x.name === 'Inked');
    return o ? { face: (o.faceTattooArt || '').length, arm: (o.armTattooArt || '').length,
      chest: (o.tattooArt || '').length } : null;
  });
  rec.ok('...and they are STILL intact after the relay cycles (v2.3.1939 incident)',
    !!after && after.face === 256 && after.arm === 256 && after.chest === 256, after);

  /* A player who drew nothing must carry nothing — the absence is what keeps
     every undrawn player on the shared, prewarmed body sheet. */
  const watcherSeenByA = await A.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const o = Object.values((S && S.others) || {}).find((x) => x.name === 'Watcher');
    return o ? { face: o.faceTattooArt, arm: o.armTattooArt } : null;
  });
  rec.ok('a player who drew nothing sends nothing',
    !!watcherSeenByA && !watcherSeenByA.face && !watcherSeenByA.arm, watcherSeenByA);

  const errs = [...(A.logs || []), ...(B.logs || [])].filter((l) => /error|uncaught/i.test(l));
  rec.ok('no page errors on either client', errs.length === 0, errs.slice(0, 3));
}
