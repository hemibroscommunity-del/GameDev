/* ═══ v2.3.3755: EACH MEMORY SAVER, OFF FROM THE TEST PANEL, ON A PHONE ═══
 *
 * The worker's live flags `off_<name>: true` (server/src/clientoff.js) reach a
 * phone in the Wheel at once (`client_off`) and its savers follow
 * (src/game/clientOff.js, clientOffApply.js):
 *   1. a page in BroTown with nothing set: the voice cap and "pictures held
 *      once" on, nothing off;
 *   2. `off_voicecap` set: the page's voice cap is off within a few seconds,
 *      no reload, and the list is kept for the next load;
 *   3. `off_onecopy` set and the page reloaded: "pictures held once" is off
 *      from that load;
 *   4. both cleared: the voice cap is back at once; no page errors.
 *
 *   node tools/qa/mp/run.mjs clientoff
 */
import * as H from './harness.mjs';

const VIEW = { width: 900, height: 700 };

const state = (P) => P.page.evaluate(() => ({
  voice: !!(window.BT_AUDIO && window.BT_AUDIO.VOICE_CAP),
  once: window.__btPicsOnce ? window.__btPicsOnce().on : null,
  kept: (() => { try { return localStorage.getItem('bt_clientoff'); } catch (e) { return 'x'; } })(),
}));
async function waitFor(P, pred, ms = 6000) {
  const t0 = Date.now();
  let s = null;
  while (Date.now() - t0 < ms) { s = await state(P).catch(() => null); if (s && pred(s)) return s; await P.page.waitForTimeout(250); }
  return s;
}

export async function run({ browser, wsPort, webPort, rec }) {
  await H.liveFlag(wsPort, 'off_voicecap', null);
  await H.liveFlag(wsPort, 'off_onecopy', null);
  const A = await H.newPlayer(browser, { name: 'Saver', wsPort, webPort, world: 'wheel', wide: true, viewport: VIEW });
  try {
    await H.enterWorld(A);
    const s0 = await waitFor(A, (s) => s.once !== null);
    rec.ok(`1. nothing set: the voice cap ${s0 && s0.voice ? 'on' : 'off'}, pictures held once ${s0 && s0.once ? 'on' : 'off'}, nothing kept`,
      !!s0 && s0.once === true && !s0.kept, s0);
    const voiceWas = !!(s0 && s0.voice);

    await H.liveFlag(wsPort, 'off_voicecap', true);
    const s1 = await waitFor(A, (s) => !s.voice && s.kept === 'voicecap');
    rec.ok(`2. off_voicecap: the voice cap off at once, no reload (kept "${s1 && s1.kept}")`, !!s1 && !s1.voice && s1.kept === 'voicecap', s1);

    await H.liveFlag(wsPort, 'off_onecopy', true);
    await waitFor(A, (s) => s.kept === 'onecopy,voicecap' || s.kept === 'voicecap,onecopy');
    await A.page.reload();
    await H.enterWorld(A);
    const s2 = await waitFor(A, (s) => s.once !== null);
    rec.ok(`3. off_onecopy and a reload: pictures held once ${s2 && s2.once ? 'on' : 'off'} from that load`, !!s2 && s2.once === false, s2);

    await H.liveFlag(wsPort, 'off_voicecap', null);
    await H.liveFlag(wsPort, 'off_onecopy', null);
    const s3 = await waitFor(A, (s) => s.voice === voiceWas && !s.kept);
    rec.ok(`4. both cleared: the voice cap back as the page had it (${voiceWas ? 'on' : 'off'}) at once, nothing kept`, !!s3 && s3.voice === voiceWas && !s3.kept, s3);
    const errs = A.logs.filter((l) => /pageerror/.test(l));
    rec.ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
  } finally {
    await H.liveFlag(wsPort, 'off_voicecap', null).catch(() => {});
    await H.liveFlag(wsPort, 'off_onecopy', null).catch(() => {});
    await A.ctx.close().catch(() => {});
  }
}
