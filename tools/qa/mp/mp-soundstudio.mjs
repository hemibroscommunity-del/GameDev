/* ═══ v2.3.3523: THE SOUND STUDIO, ON A PHONE ═══
 *
 * The owner: "I think sounds were wired in the wrong places.  The labels
 * should tell you where they go.  Might need to build a quick studio to show
 * which sounds belong where."  The studio (ui/panels/SoundStudio.jsx, its
 * catalogue data/soundStudio.js, its "heard just now" game/soundStudio.js) on
 * an upright phone in the Wheel's BroTown:
 *
 *   1. the Test panel's "Sound studio" opens it (the panel closes first);
 *   2. every cue in the table has its row, with its label, and the families
 *      (hits by material, objects, balls, statuses, noises, footsteps) too;
 *   3. a row's ▶ plays it through the game's own player (the cue counted,
 *      its sample started and remembered under its name), with no menu click
 *      on top of it;
 *   4. the search narrows the list to what matches;
 *   5. a recording's chip shows every place that recording is used;
 *   6. "Heard just now": a jump done in the game, then the studio opened on
 *      it, shows the jump's push-off at the top, by its label; the menu's own
 *      clicks left out;
 *   7. it fits the phone: no sideways scroll, every ▶ 44 px;
 *   8. ✕ closes it and takes it off the page;
 *   9. no page errors.
 *
 *   node tools/qa/mp/run.mjs soundstudio
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

const panelUp = (P) => P.page.evaluate(() => !!Array.from(document.querySelectorAll('strong')).find((n) => n.textContent === 'Test panel'));
/* the Test panel: a 1.2 s hold on the zone's name (ZoneHeader), held until it is up (mp-speedtest's) */
async function openPanel(P) {
  for (let i = 0; i < 3; i++) {
    if (await panelUp(P)) return true;
    const at = await P.page.evaluate(() => {
      const el = document.querySelector('.bt-zone-header__title');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    });
    if (!at) { await P.page.waitForTimeout(1000); continue; }
    await P.page.mouse.move(at.x, at.y);
    await P.page.mouse.down();
    const t0 = Date.now();
    await P.page.waitForTimeout(1400);
    while (Date.now() - t0 < 8000 && !(await panelUp(P))) await P.page.waitForTimeout(250);
    await P.page.mouse.up();
    for (const t1 = Date.now(); Date.now() - t1 < 4000;) {
      if (await panelUp(P)) return true;
      await P.page.waitForTimeout(250);
    }
  }
  return panelUp(P);
}
const studioUp = (P) => P.page.evaluate(() => !!document.querySelector('[data-sound-studio]'));
const waitStudio = async (P, up) => {
  for (const t0 = Date.now(); Date.now() - t0 < 15000;) {
    if ((await studioUp(P)) === up) return true;
    await P.page.waitForTimeout(250);
  }
  return false;
};
/* a real tap on what `sel` picks (scrolled into view first) */
async function tap(P, sel) {
  const at = await P.page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, sel);
  if (!at) return false;
  await P.page.waitForTimeout(150);
  await P.page.touchscreen.tap(at.x, at.y);
  await P.page.waitForTimeout(250);
  return true;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Studio', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await H.enterWorld(P);
  const inWheel = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l,
    { timeout: 120000, label: 'in the Wheel' }).catch(() => null);
  const myId = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'quests', myId);
  await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 });
  const audio = await P.page.evaluate(async () => {
    const A = window.BT_AUDIO;
    if (!A) return null;
    if (!A.ctx) { try { A.unlock(); } catch (e) { /* reported below */ } }
    if (A.ctx && A.ctx.state !== 'running') { try { await A.ctx.resume(); } catch (e) { /* reported below */ } }
    const t0 = Date.now();
    while (Date.now() - t0 < 20000 && !['arrow-fly', 'ui-click'].every((k) => A._samples && A._samples[k])) await new Promise((r) => setTimeout(r, 250));
    return { ctx: !!A.ctx, state: A.ctx && A.ctx.state, muted: !!A.muted, probe: !!window.__btSoundStudio, cues: !!window.__btCues };
  });
  rec.ok(`setup: in the Wheel, the sound up (${audio && audio.state}), the studio's probe there`,
    !!inWheel && !!audio && audio.ctx && !audio.muted && audio.probe && audio.cues, { inWheel, audio });

  try {
    /* ── 1. the Test panel's button ── */
    const panel = await openPanel(P);
    const btn = panel && await P.page.evaluate(() => !!document.querySelector('[data-dev-sound-studio]'));
    if (btn) await tap(P, '[data-dev-sound-studio]');
    const opened = btn && await waitStudio(P, true);
    const panelGone = !(await panelUp(P));
    rec.ok('1. the Test panel has "Sound studio", and its button opens the studio (the panel closed first)', !!panel && !!btn && opened && panelGone,
      { panel, btn, opened, panelGone });
    if (!opened) return;

    /* ── 2. every cue has its row ── */
    const rows = await P.page.evaluate(() => {
      const ids = Array.from(document.querySelectorAll('[data-studio-row]')).map((n) => n.getAttribute('data-studio-row'));
      const names = window.__btCues.names();
      const missing = names.filter((n) => ids.indexOf('cue:' + n) < 0);
      const fam = ['hit:snow', 'hit:stone', 'prop:wood:hit', 'prop:crystal:hit', 'shot:snowball', 'elem:chill', 'noise:snowman-snarl', 'step:grass', 'other:sprint', 'other:oreCrack']
        .filter((id) => ids.indexOf(id) < 0);
      const bow = document.querySelector('[data-studio-row="cue:bowLoose"]');
      return { n: ids.length, cues: names.length, missing, fam, bowText: bow ? bow.textContent : null,
        sections: document.querySelectorAll('[data-studio-section]').length };
    });
    await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/soundstudio-all.png` }).catch(() => {});
    rec.ok(`2. every one of the ${rows.cues} cues has its row, and the families have theirs (${rows.n} rows in ${rows.sections} sections); the bow's: "${rows.bowText && rows.bowText.slice(1, 70)}"`,
      rows.missing.length === 0 && rows.fam.length === 0 && rows.n > rows.cues + 40 && /Your bow shot/.test(rows.bowText || '') && /arrow-fly/.test(rows.bowText || ''),
      { missing: rows.missing, fam: rows.fam });

    /* ── 3. ▶ plays it, through the game's own player ── */
    await P.page.evaluate(() => { window.__btCues.reset(); window.__btSoundStudio.clear(); });
    await tap(P, '[data-studio-play="cue:bowLoose"]');
    await P.page.waitForTimeout(500);
    const played = await P.page.evaluate(() => {
      const h = window.__btSoundStudio.heard();
      return { n: window.__btCues.stats.played.bowLoose || 0, heard: h.map((e) => [e.key, e.tag]),
        clicks: h.filter((e) => e.key === 'ui-click').length };
    });
    rec.ok(`3. its ▶ plays the cue (asked ${played.n} time), its recording started and remembered under its name, with no menu click on top`,
      played.n === 1 && played.heard.some(([k, t]) => k === 'arrow-fly' && t === 'cue:bowLoose') && played.clicks === 0, played);

    /* ── 4. the search ── */
    await P.page.click('[data-studio-search]');
    await P.page.keyboard.type('snowman');
    await P.page.waitForTimeout(400);
    const found = await P.page.evaluate(() => {
      const ids = Array.from(document.querySelectorAll('[data-studio-row]')).map((n) => n.getAttribute('data-studio-row'));
      const off = Array.from(document.querySelectorAll('[data-studio-row]')).filter((n) => !/snowman/i.test(n.textContent)).map((n) => n.getAttribute('data-studio-row'));
      return { ids, off };
    });
    rec.ok(`4. "snowman" narrows the list to what matches (${found.ids.length} rows, the hit on one and its throw among them)`,
      found.ids.length >= 4 && found.off.length === 0 && found.ids.includes('hit:snow') && found.ids.includes('cue:throwSnow'), found);
    await P.page.fill('[data-studio-search]', '');
    await P.page.waitForTimeout(300);

    /* ── 5. a recording's chip: every place it is used ──
       v2.3.3708: from the bow's shot, as the jump is the owner's "hup" now
       (its row's chip is jump-hup) */
    await tap(P, '[data-studio-row="cue:bowLoose"] [data-studio-sample="arrow-fly"]');
    await P.page.waitForTimeout(400);
    const rec5 = await P.page.evaluate(() => {
      const f = document.querySelector('[data-studio-filter]');
      const ids = Array.from(document.querySelectorAll('[data-studio-row]')).map((n) => n.getAttribute('data-studio-row'));
      const off = Array.from(document.querySelectorAll('[data-studio-row]')).filter((n) => !n.querySelector('[data-studio-sample="arrow-fly"]')).map((n) => n.getAttribute('data-studio-row'));
      return { filter: f ? f.getAttribute('data-studio-filter') : null, text: f ? f.textContent.slice(0, 120) : null, ids, off };
    });
    await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/soundstudio-recording.png` }).catch(() => {});
    rec.ok(`5. the arrow's flight's chip shows every place that recording plays: ${rec5.ids.join(', ')}`,
      rec5.filter === 'arrow-fly' && rec5.off.length === 0 && ['cue:bowLoose', 'cue:dodged', 'cue:dodgeRoll'].every((i) => rec5.ids.includes(i))
        && !rec5.ids.includes('cue:jumpUp'), rec5);

    /* ── 7. it fits the phone ── */
    const fit = await P.page.evaluate(() => {
      const root = document.querySelector('[data-sound-studio]');
      const list = document.querySelector('[data-studio-list]');
      const r = root.getBoundingClientRect();
      const plays = Array.from(document.querySelectorAll('[data-studio-play]')).map((b) => b.getBoundingClientRect());
      const wide = Array.from(root.querySelectorAll('*')).filter((n) => n.getBoundingClientRect().right > window.innerWidth + 1 && !n.closest('[style*="overflow-x"]')).length;
      return { w: Math.round(r.width), vw: window.innerWidth, h: Math.round(r.height), vh: window.innerHeight,
        sideways: list.scrollWidth > list.clientWidth + 1, wide, small: plays.filter((b) => b.width < 44 || b.height < 44).length, plays: plays.length };
    });
    rec.ok(`7. it fits the phone: ${fit.w} x ${fit.h} of ${fit.vw} x ${fit.vh}, no sideways scroll, every ▶ (${fit.plays}) 44 px or more`,
      fit.w === fit.vw && fit.h === fit.vh && !fit.sideways && fit.wide === 0 && fit.small === 0, fit);

    /* ── 8. ✕ closes it ── */
    await tap(P, '[data-studio-close]');
    const closed = await waitStudio(P, false);
    const host = await P.page.evaluate(() => !!document.querySelector('[data-sound-studio-host]'));
    rec.ok('8. ✕ closes it and takes it off the page', closed && !host, { closed, host });

    /* ── 6. heard just now: a real jump, then the studio on it ── */
    await P.page.evaluate(() => window.__btSoundStudio.clear());
    await P.page.keyboard.press('Space');   /* v2.3.3844: Space jumps (was X) */
    let jumped = null;
    for (const t0 = Date.now(); Date.now() - t0 < 6000;) {
      jumped = await P.page.evaluate(() => window.__btSoundStudio.heard().filter((e) => e.tag === 'cue:jumpUp').length);
      if (jumped) break;
      await P.page.waitForTimeout(200);
    }
    await P.page.evaluate(() => window.__btSoundStudio.open({ tab: 'heard' }));
    await waitStudio(P, true);
    await P.page.waitForTimeout(800);
    const heard = await P.page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('[data-studio-list] [data-studio-row]'));
      return { ids: rows.map((n) => n.getAttribute('data-studio-row')), text: rows.slice(0, 3).map((n) => n.textContent.slice(1, 80)) };
    });
    await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/soundstudio-heard.png` }).catch(() => {});
    const iJump = heard.ids.indexOf('cue:jumpUp');
    rec.ok(`6. a jump in the game, then "Heard just now": its push-off by its label near the top (${heard.text.join(' | ')}), no menu click listed`,
      jumped > 0 && iJump >= 0 && iJump <= 4 && !heard.ids.includes('other:uiClick'), { jumped, heard });
    await P.page.evaluate(() => window.__btSoundStudio.close());

    /* ── 10. v2.3.3610: the Music tab -- every track under where it plays, the
       one playing where you stand named, and ▶ playing it from its file with
       the game's music turned down, ■ putting the game's back ── */
    await P.page.evaluate(() => window.__btSoundStudio.open({ tab: 'music' }));
    await waitStudio(P, true);
    await P.page.waitForTimeout(600);
    const mus = await P.page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('[data-studio-music] [data-studio-row]'));
      const now = document.querySelector('[data-studio-music-now]');
      return { ids: rows.map((n) => n.getAttribute('data-studio-row')), text: rows.map((n) => n.textContent.replace(/\s+/g, ' ').slice(1, 90)),
        now: now ? now.getAttribute('data-studio-music-now') : null, nowText: now ? now.textContent : '' };
    });
    await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/soundstudio-music.png` }).catch(() => {});
    const MUSIC_IDS = ['town', 'frost', 'ember', 'sky', 'hollows', 'tidal', 'mist', 'verdant', 'dungeon', 'minigame', 'farm_home', 'theme', 'dance'].map((k) => 'music:' + k);   /* v2.3.3672: the farm's */
    rec.ok(`10. the Music tab lists every track under where it plays (${mus.ids.length}: ${mus.text.slice(0, 3).join(' | ')} ...), and the one playing here ("${mus.nowText}")`,
      MUSIC_IDS.every((i) => mus.ids.includes(i)) && /Town Square Loop/.test(mus.text[mus.ids.indexOf('music:town')] || '') && mus.now === 'town', mus);
    await tap(P, '[data-studio-play="music:hollows"]');
    let pv = null;
    for (const t0 = Date.now(); Date.now() - t0 < 4000;) {
      pv = await P.page.evaluate(() => {
        const A = window.BT_AUDIO;
        const b = document.querySelector('[data-studio-play="music:hollows"]');
        return { stop: b ? b.textContent : null, preview: !!(A && A._musicPreview), bus: A && A._musicBus ? +A._musicBus.gain.value.toFixed(3) : null,
          media: Array.from(document.querySelectorAll('audio')).length };
      });
      if (pv.stop === '■' && pv.preview) break;
      await P.page.waitForTimeout(200);
    }
    await P.page.waitForTimeout(700);
    const bus1 = await P.page.evaluate(() => (window.BT_AUDIO && window.BT_AUDIO._musicBus ? +window.BT_AUDIO._musicBus.gain.value.toFixed(3) : null));
    rec.ok(`10. ...▶ on the Stone Hollows' Rock level plays it (its button ■), the land watch held off and the game's music turned down (music bus ${bus1})`,
      !!pv && pv.stop === '■' && pv.preview === true && bus1 !== null && bus1 < 0.05, { pv, bus1 });
    await tap(P, '[data-studio-play="music:hollows"]');
    await P.page.waitForTimeout(900);
    const back = await P.page.evaluate(() => {
      const A = window.BT_AUDIO;
      return { preview: !!(A && A._musicPreview), bus: A && A._musicBus ? +A._musicBus.gain.value.toFixed(3) : null, level: A ? A.musicLevel : null,
        btn: (document.querySelector('[data-studio-play="music:hollows"]') || {}).textContent };
    });
    rec.ok(`10. ...■ stops it and puts the game's music back (music bus ${back.bus} of ${back.level})`,
      back.preview === false && back.btn === '▶' && back.bus !== null && Math.abs(back.bus - back.level) < 0.05, back);
    await P.page.evaluate(() => window.__btSoundStudio.close());

    rec.ok('9. no page errors', errs.length === 0, errs.slice(0, 3));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
