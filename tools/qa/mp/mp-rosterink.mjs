/* ONE CHARACTER'S FACE TATTOO ON EVERY SAVED CHARACTER (v2.3.2690).
 *
 * Owner: "Looks like there's a bug where every saved character has same face
 * tattoo as one."
 *
 * A device holds up to ten characters (charRoster.js, v2.3.1923), but the
 * drawings live in ONE set of localStorage canvases (playerArt.js), and three
 * roads let one character's drawing turn up on the others.  Each is pinned
 * here through the real client, a real worker and a real peer:
 *
 *   1. THE PICKER'S FACES.  A saved character's portrait is drawn from its
 *      stored look (portraitOptsFromPeer), and any drawing that recipe leaves
 *      out is filled from THIS DEVICE's canvases.  It left out the face and
 *      arm tattoos, so every row wore whatever face tattoo the device held.
 *      Asserted as "a row's face does not change when the device's own
 *      drawing does" -- true of a correct portrait whatever it looks like.
 *   2. SWITCHING CHARACTERS.  The canvases are not per-character, and
 *      applying a character's stored look only ever ADDED drawings, so a
 *      character with no face tattoo kept the previous character's -- on its
 *      own screen and, through the join frame and the relay, on everybody
 *      else's.  Asserted from a second player's screen.
 *   3. A NEW CHARACTER.  Create opened the creator on the previous
 *      character's canvases, so the new character was saved wearing them.
 *
 * And the other direction, because a fix that clears too much is its own bug:
 * switching BACK to the tattooed character must bring its tattoo back.
 *
 * THE SECOND DOOR, the same bug through a different gap.  A character's record
 * is written once, at creation, from the keys the join carried THEN -- so a
 * character made before species (v2.3.2682) has no `sc` at all, and on a
 * device that has since made a monkey, "nothing to apply" left the monkey on.
 * Plainy stands in for such a character: its creation join goes out the way
 * a pre-v2.3.2361 client sent it, without eyewear, eye style or species.
 * That is the only thing done to Plainy's device, and nothing is done to the
 * device under test.  Inky is a monkey, and road 2 asserts Plainy is not.
 */
import * as H from './harness.mjs';

const FACE = '1'.repeat(256);    /* Inky's face tattoo -- the one that spread */
const OTHER = '2'.repeat(256);   /* a different drawing on the device, for road 1 */

/* An OLDER CLIENT's creation join, for Plainy only: the keys eyewear (v2.3.2361),
   its colour (2424), eye styles (2643) and species (2682) added are left off,
   so Plainy's record has none of them -- which is what every character made
   before those versions has.  An init script because the sandbox has no old
   build to run; it reshapes a message on its way out and stubs none of our
   code, and it is never installed on the device the scenario is testing. */
const OLD_CLIENT_JOIN = () => {
  const send = WebSocket.prototype.send;
  WebSocket.prototype.send = function (d) {
    try {
      const m = typeof d === 'string' ? JSON.parse(d) : null;
      if (m && m.type === 'join' && m.data) {
        delete m.data.ew; delete m.data.ewc; delete m.data.es; delete m.data.sc;
        d = JSON.stringify(m);
      }
    } catch (e) { /* not ours to reshape */ }
    return send.call(this, d);
  };
};

/* The picker, opened the way a player opens it, with every row's face drawn. */
async function pickerFaces(page, webPort, names) {
  await page.goto(`http://localhost:${webPort}/?noresume=1&login=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await H.openPicker(page);
  const got = await page.waitForFunction((want) => {
    const out = {};
    for (const n of want) {
      const row = document.querySelector('[data-tut="char-row"][data-char-name="' + n + '"]');
      const img = row && row.querySelector('[data-portrait="art"] img');
      if (!img || !img.src || img.src.indexOf('data:image') !== 0) return null;
      out[n] = img.src;
    }
    return out;
  }, names, { timeout: 30000, polling: 300 }).then((h) => h.jsonValue()).catch(() => null);
  return got;
}

/* Tap a character's row the way a player does.  Play switches the key and
   RELOADS into the world (BroTown onPlay: activateChar, bt_play_now, then
   navigate), so the old page's door is still on screen for a moment -- wait
   for the navigation and for the world to be live as THAT character. */
async function playRow(page, name, wantId) {
  const row = await page.waitForSelector('[data-tut="char-row"][data-char-name="' + name + '"]', { timeout: 15000 }).catch(() => null);
  if (!row) return { ok: false, why: 'no row' };
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null),
    row.click(),
  ]);
  const live = await page.waitForFunction((id) => {
    const S = window._gameState && window._gameState.current;
    return !!(S && S.myId === id && S.currentZone);
  }, wantId, { timeout: 90000, polling: 500 }).then(() => true).catch(() => false);
  await page.waitForFunction(() => document.querySelectorAll('video').length === 0,
    null, { timeout: 15000, polling: 200 }).catch(() => {});
  return { ok: live };
}

/* What the observer's client holds for a peer's face tattoo and species, once
   the peer is in view and (optionally) once `want` says so.  Waited for rather
   than read once: the relay lands every two seconds and a join takes a
   moment. */
async function peerLook(O, id, want, timeout = 20000) {
  const t0 = Date.now();
  let last = { seen: false };
  while (Date.now() - t0 < timeout) {
    last = await O.page.evaluate((pid) => {
      const S = window._gameState && window._gameState.current;
      const o = S && S.others && S.others[pid];
      if (!o) return { seen: false };
      return {
        seen: true,
        face: typeof o.faceTattooArt === 'string' ? o.faceTattooArt : '',
        species: typeof o.species === 'string' ? o.species : '',
      };
    }, id).catch(() => ({ seen: false }));
    if (last.seen && (!want || want(last))) return last;
    await O.page.waitForTimeout(500);
  }
  return last;
}

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── Plainy: a character with NO face tattoo, made on another device, so its
     stored look is plain whatever Inky's device holds. ───────────────────── */
  const E = await H.newPlayer(browser, { name: 'Plainy', wsPort, webPort, init: OLD_CLIENT_JOIN });
  await H.enterWorld(E);
  await E.page.waitForTimeout(2000);
  const plain = await E.page.evaluate(() => {
    const r = window.__btCharRecord && window.__btCharRecord();
    return {
      phrase: localStorage.getItem('bt_passphrase'),
      id: window._gameState.current.myId,
      face: localStorage.getItem('bt-facetattoo') || '',
      look: r && r.look ? Object.keys(r.look) : null,
    };
  });
  rec.ok('Plainy was made with no face tattoo (guard)', !!plain.phrase && plain.face === '', { id: plain.id, face: plain.face.length });
  rec.ok('Plainy\'s record is an older client\'s: a look, but no species key (guard)',
    !!plain.look && plain.look.length > 0 && plain.look.indexOf('sc') === -1 && plain.look.indexOf('hr') !== -1,
    { keys: plain.look && plain.look.length, sc: !!plain.look && plain.look.indexOf('sc') !== -1 });
  await E.ctx.close();

  /* ── Inky: the tattooed character, on the device under test. ────────────── */
  const D = await H.newPlayer(browser, { name: 'Inky', wsPort, webPort });
  await D.page.evaluate((f) => { localStorage.setItem('bt-facetattoo', f); localStorage.setItem('bt-species', 'monkey'); }, FACE);
  await D.page.reload({ waitUntil: 'domcontentloaded' });
  await H.enterWorld(D);
  await D.page.waitForTimeout(2500);
  const inky = await D.page.evaluate(() => {
    const r = window.__btCharRecord && window.__btCharRecord();
    return {
      phrase: localStorage.getItem('bt_passphrase'),
      id: window._gameState.current.myId,
      face: localStorage.getItem('bt-facetattoo') || '',
      species: r && r.look ? r.look.sc : null,
    };
  });
  rec.ok('Inky wears the face tattoo (guard)', inky.face === FACE, { face: inky.face.length });
  rec.ok('...and was made a monkey (guard)', inky.species === 'monkey', inky.species);

  /* The same device learns Plainy's Login Key -- a second saved character. */
  await D.page.evaluate((p) => window.__btRoster.remember(p.phrase, { name: 'Plainy' }), plain);

  /* ── 1. THE PICKER'S FACES ──────────────────────────────────────────────── */
  const pass1 = await pickerFaces(D.page, webPort, ['Inky', 'Plainy']);
  rec.ok('the picker draws both saved characters (guard)', !!pass1, pass1 && Object.keys(pass1));
  await D.page.evaluate((o) => localStorage.setItem('bt-facetattoo', o), OTHER);
  const pass2 = await pickerFaces(D.page, webPort, ['Inky', 'Plainy']);
  if (pass1 && pass2) {
    rec.ok('1. Plainy\'s portrait does not change when this device\'s face tattoo does',
      pass1.Plainy === pass2.Plainy, { same: pass1.Plainy === pass2.Plainy });
    rec.ok('1. ...nor does Inky\'s (it is drawn from Inky\'s own saved look)',
      pass1.Inky === pass2.Inky, { same: pass1.Inky === pass2.Inky });
    rec.ok('1. ...and the two saved characters do not share one face',
      pass1.Plainy !== pass1.Inky, { same: pass1.Plainy === pass1.Inky });
  }
  /* Put the device back the way Inky left it. */
  await D.page.evaluate((f) => localStorage.setItem('bt-facetattoo', f), FACE);

  /* ── 2. SWITCHING CHARACTERS, seen from somebody else's screen ─────────── */
  const O = await H.newPlayer(browser, { name: 'Onlooker', wsPort, webPort, guest: true });
  await H.enterWorld(O);
  await O.page.waitForTimeout(1500);

  await D.page.goto(`http://localhost:${webPort}/?noresume=1&login=1`, { waitUntil: 'domcontentloaded' });
  await D.page.waitForTimeout(1500);
  await H.openPicker(D.page);
  const toPlain = await playRow(D.page, 'Plainy', plain.id);
  rec.ok('tapping Plainy\'s row walks into the world as Plainy (guard)', toPlain.ok, toPlain);
  if (toPlain.ok) {
    await D.page.waitForTimeout(4000);
    const asPlain = await D.page.evaluate(() => ({
      id: window._gameState.current.myId,
      face: localStorage.getItem('bt-facetattoo') || '',
      species: localStorage.getItem('bt-species') || 'none',
    }));
    rec.ok('2. the device is now playing Plainy (guard)', asPlain.id === plain.id, asPlain.id);
    rec.ok('2. Plainy does not wear Inky\'s face tattoo on this device',
      asPlain.face !== FACE, { faceLen: asPlain.face.length, isInkys: asPlain.face === FACE });
    rec.ok('2. ...and is not a monkey on this device (a record older than species)',
      asPlain.species === 'none', asPlain.species);
    /* Seen, and then given two relay rounds to settle, so a look that
       arrives only on the relay (not in the join frame) is caught too. */
    await peerLook(O, plain.id);
    await O.page.waitForTimeout(5000);
    const pf = await peerLook(O, plain.id, null, 5000);
    rec.ok('2. ...nor on the onlooker\'s screen',
      pf.seen && pf.face !== FACE, { seen: pf.seen, faceLen: (pf.face || '').length, isInkys: pf.face === FACE });
    rec.ok('2. ...where Plainy is not a monkey either',
      pf.seen && pf.species !== 'monkey', { seen: pf.seen, species: pf.species });
  }

  /* ── The other direction: Inky gets the tattoo back. ────────────────────── */
  await D.page.goto(`http://localhost:${webPort}/?noresume=1&login=1`, { waitUntil: 'domcontentloaded' });
  await D.page.waitForTimeout(1500);
  await H.openPicker(D.page);
  const toInky = await playRow(D.page, 'Inky', inky.id);
  if (toInky.ok) {
    await D.page.waitForTimeout(4000);
    const back = await D.page.evaluate(() => ({
      id: window._gameState.current.myId,
      face: localStorage.getItem('bt-facetattoo') || '',
      species: localStorage.getItem('bt-species') || 'none',
    }));
    rec.ok('back to Inky: the device is playing Inky (guard)', back.id === inky.id, back.id);
    rec.ok('back to Inky: Inky\'s own face tattoo comes back from the saved look',
      back.face === FACE, { faceLen: back.face.length });
    rec.ok('back to Inky: ...and Inky is a monkey again', back.species === 'monkey', back.species);
    const pf = await peerLook(O, inky.id, (l) => l.face === FACE && l.species === 'monkey');
    rec.ok('back to Inky: ...and the onlooker sees both', pf.seen && pf.face === FACE && pf.species === 'monkey',
      { seen: pf.seen, faceLen: (pf.face || '').length, species: pf.species });
  } else {
    rec.ok('tapping Inky\'s row walks back into the world as Inky (guard)', false, toInky);
  }

  /* ── 3. A NEW CHARACTER starts with a blank face ────────────────────────── */
  await D.page.goto(`http://localhost:${webPort}/?noresume=1&login=1`, { waitUntil: 'domcontentloaded' });
  await D.page.waitForTimeout(1500);
  await H.uncoverDoor(D.page);
  const create = await D.page.waitForSelector('[data-tut="login-create"]', { timeout: 15000 }).catch(() => null);
  rec.ok('the door offers Create (guard)', !!create);
  if (create) {
    await create.click();
    await D.page.waitForSelector('input.bt-cc-name', { timeout: 30000 }).catch(() => {});
    await D.page.waitForTimeout(1500);
    const fresh = await D.page.evaluate(() => ({
      phrase: localStorage.getItem('bt_passphrase'),
      face: localStorage.getItem('bt-facetattoo') || '',
      creator: !!document.querySelector('input.bt-cc-name'),
    }));
    rec.ok('3. the creator is open on a NEW key (guard)', fresh.creator && fresh.phrase !== inky.phrase && fresh.phrase !== plain.phrase,
      { creator: fresh.creator, newKey: fresh.phrase !== inky.phrase });
    rec.ok('3. a new character does not start wearing Inky\'s face tattoo',
      fresh.face !== FACE, { faceLen: fresh.face.length, isInkys: fresh.face === FACE });
  }

  await O.ctx.close();
  await D.ctx.close();
}
