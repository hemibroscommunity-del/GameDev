/* ═══ ON A COMPUTER, THE BUTTONS A CLICK AIMS AT ARE THE ONES IT REACHES (v2.3.3407) ═══
 *
 * Owner, 2026-10-18: "Make sure all actions/buttons can be completed in
 * landscape mode and on the computer."
 *
 * Two the UI review's numbered pictures (tools/qa/ui-review) marked COVERED on
 * a computer, each a click that landed on something else:
 *   1. at a building's door, the "Enter" button lay under the keyboard-keys
 *      strip (.bt-kb-hints, outside the game's wrap, so it paints over the
 *      prompt whatever the z-index): a click on the button's left half hit a
 *      key chip and hid the strip.  The strip now stands aside while a prompt
 *      is up -- the prompt shows its own key (E) on a computer;
 *   2. the Daily Rewards window's ✕ (and the right of its Season tab) lay in
 *      the minimap's box, under the world map's invisible "open" button: a
 *      click on the ✕ opened the world map.  That button lets clicks through
 *      while the window is up, as it does for every .bt-inspect window (and
 *      since main's v2.3.3400 the window, with no Season tab, is shorter, so
 *      the check is the button's, not where the ✕ happens to lie).
 * Both by a REAL mouse click (1440 x 900, the game in its centred column).
 *   3. and on a LAPTOP's window (1366 x 768) the character creator's ENTER
 *      BRO TOWN lay below the screen, unreachable: it is on it now, and a
 *      click on it starts the game (v2.3.3407).
 *   3b. and there the drawing editor ran off the column, Done off its edge:
 *      it fits the column now and Done answers a click (v2.3.3481, the
 *      2026-10-19 UI review).
 */
import * as H from './harness.mjs';

const DESK = { width: 1440, height: 900 };
const LAPTOP = { width: 1366, height: 768 };

async function standAt(P, x, bootsY) {
  for (let k = 0; k < 4; k++) {
    const dy = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const g = window.__btPlayerGround ? window.__btPlayerGround() : null;
      return g ? g.y - S.player.y : 0;
    });
    await H.hopTo(P, x, bootsY - dy, { step: 100, gap: 260, tries: 90 });
    await P.page.waitForTimeout(700);
    const g = await P.page.evaluate(() => (window.__btPlayerGround ? window.__btPlayerGround() : null));
    if (!g || Math.hypot(g.x - x, g.y - bootsY) < 14) return true;
  }
  return false;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Deskreach', wsPort, webPort, viewport: DESK, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stopAlive = H.keepAlive(P, 15000);
  try {
    await H.enterWorld(P);
    await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'into the Wheel' }).catch(() => null);
    await P.page.waitForTimeout(2000);
    rec.ok('a computer, its keyboard strip up (guard)', await P.page.evaluate(() => matchMedia('(pointer:fine)').matches
      && !!document.querySelector('.bt-kb-hints') && getComputedStyle(document.querySelector('.bt-kb-hints')).display !== 'none'));

    /* 1. the bank's door: the Enter button answers a click on its left half */
    const door = await P.page.evaluate(() => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []).find((d) => d.id === 'bank') || null);
    if (door) await standAt(P, door.x, door.y + 30);
    await P.page.waitForTimeout(1000);
    /* a new bro walking past Mayor Bro gets his welcome, whose backdrop covers
       the screen: put away, as "Not now" does, before the door is judged */
    for (let i = 0; i < 3; i++) {
      const dlg = await P.page.evaluate(() => !!document.querySelector('.bt-npcdlg-scrim'));
      if (!dlg) break;
      await P.page.evaluate(() => { const U = window._uiPanels || {}; if (U.quest) U.quest(null); });
      await P.page.waitForTimeout(700);
    }
    const btn = await P.page.evaluate(() => {
      const b = document.querySelector('button.bt-interact-prompt');
      if (!b) return null;
      const r = b.getBoundingClientRect();
      const pts = [[0.2, 0.5], [0.5, 0.5], [0.8, 0.5]].map(([fx, fy]) => {
        const el = document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy);
        return !!(el && b.contains(el));
      });
      const strip = document.querySelector('.bt-kb-hints');
      const col = document.getElementById('root').getBoundingClientRect();
      const sr = strip ? strip.getBoundingClientRect() : null;
      return { x: r.left + r.width * 0.25, y: r.top + r.height / 2, text: b.textContent.replace(/\s+/g, ' ').trim(), answers: pts,
        strip: strip ? getComputedStyle(strip).display : 'none',
        /* v2.3.3487: drawn in the margin beside the game it covers nothing */
        margin: !!(strip && strip.getAttribute('data-kb-place') === 'side' && sr && sr.right <= col.left) };
    });
    rec.ok('at the bank\'s door the Enter button answers a click anywhere on it (the key strip in the margin, or standing aside)',
      !!btn && btn.answers.every(Boolean) && (btn.strip === 'none' || btn.margin), btn);
    if (btn) await P.page.mouse.click(btn.x, btn.y);
    await P.page.waitForTimeout(1200);
    const opened = await P.page.evaluate(() => {
      const e = document.querySelector('[data-building-panel]');
      return e ? e.getAttribute('data-building-panel') : null;
    });
    rec.ok('...and a mouse click on its left half opens the bank', opened === 'bank', { opened });
    await P.page.evaluate(() => window.__btBuildingWindow && window.__btBuildingWindow.open(null));
    await P.page.waitForTimeout(600);

    /* walk away: with no prompt up, the strip is back */
    if (door) await standAt(P, door.x, door.y + 330);
    await P.page.waitForTimeout(800);
    const back = await P.page.evaluate(() => ({ prompt: !!document.querySelector('button.bt-interact-prompt'),
      strip: document.querySelector('.bt-kb-hints') ? getComputedStyle(document.querySelector('.bt-kb-hints')).display : 'gone' }));
    rec.ok('...and away from the door the key strip is back', !back.prompt && back.strip !== 'none', back);

    /* 2. the Daily Rewards window's ✕.  v2.3.3407: since main's v2.3.3400
       put the season away the window has no tab row and is shorter, so its ✕
       no longer lies in the minimap's box on this window size -- the rule is
       checked where it lives instead: while the window is up, the world map's
       invisible "open" button takes no click anywhere in its box (a click
       there went to the map), and the ✕ answers one, in that box or not. */
    await P.page.evaluate(() => window.__btDailyRewards && window.__btDailyRewards.open('today'));
    await P.page.waitForTimeout(1200);
    const x = await P.page.evaluate(() => {
      const c = document.querySelector('[data-daily-close]');
      if (!c) return null;
      const r = c.getBoundingClientRect();
      const m = document.querySelector('[data-world-map-open]');
      const mr = m ? m.getBoundingClientRect() : null;
      const inMapBox = !!(mr && r.left < mr.right && r.right > mr.left && r.top < mr.bottom && r.bottom > mr.top);
      /* the middle of the part of the ✕ that lies in the minimap's box, if
         any: where the click went to the map */
      const px = inMapBox ? (Math.max(r.left, mr.left) + Math.min(r.right, mr.right)) / 2 : r.left + r.width / 2;
      const py = inMapBox ? (Math.max(r.top, mr.top) + Math.min(r.bottom, mr.bottom)) / 2 : r.top + r.height / 2;
      const at = document.elementFromPoint(px, py);
      /* the map's open button, sampled across its box */
      const mapTakes = mr ? [0.2, 0.5, 0.8].some((f) => {
        const el = document.elementFromPoint(mr.left + mr.width * f, mr.top + mr.height * f);
        return !!(el && (el === m || m.contains(el)));
      }) : null;
      return { x: px, y: py, inMapBox, mapTakes, answers: !!(at && c.contains(at)),
        what: at ? at.tagName.toLowerCase() + (at.getAttribute('data-world-map-open') != null ? '[data-world-map-open]' : '') : null };
    });
    rec.ok('while the Daily Rewards window is up, the world map\'s "open" button takes no click anywhere in its box',
      !!x && x.mapTakes === false, x);
    rec.ok(`the Daily Rewards ✕ answers a click${x && x.inMapBox ? ', though it lies in the minimap\'s box' : ''}`,
      !!x && x.answers, x);
    if (x) await P.page.mouse.click(x.x, x.y);
    await P.page.waitForTimeout(900);
    const after = await P.page.evaluate(() => ({ window: !!document.querySelector('[data-daily-rewards]'),
      map: !!(window.__btWorldMap && window.__btWorldMap.open) }));
    rec.ok('...and the click closes the window, opening no world map', !after.window && !after.map, after);
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 3));
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }

  /* 3. v2.3.3407: a LAPTOP's window (1366 x 768).  The creator's sizes were
     fractions of the window's width, so on a computer the character's column
     took its 360 px ceiling inside the 419 px play column, the Trait Picker
     got 31 px and ENTER BRO TOWN lay at y 847-903 -- off the screen, and the
     creator does not scroll: a new player on a laptop could not begin.  They
     are fractions of the column now (game.css "THE CREATOR SIZES ITSELF FROM
     THE COLUMN"). */
  const L = await H.newPlayer(browser, { name: 'Laptop', wsPort, webPort, viewport: LAPTOP, world: 'wheel' });
  const lErrors = [];
  L.page.on('pageerror', (e) => lErrors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await L.page.waitForSelector('[data-tut="login-create"], input.bt-cc-name', { timeout: 30000 });
    if (await L.page.$('[data-tut="login-create"]')) {
      await H.uncoverDoor(L.page);
      await L.page.click('[data-tut="login-create"]');
    }
    await L.page.waitForSelector('input.bt-cc-name', { timeout: 30000 });
    await L.page.waitForTimeout(1500);
    const cc = await L.page.evaluate(() => {
      const b = document.querySelector('button.bt-cc-play');
      const pane = document.querySelector('.bt-cc-panel');
      const label = document.querySelector('.bt-cc-play-label');
      if (!b || !pane || !label) return null;
      const r = b.getBoundingClientRect();
      const at = r.bottom <= innerHeight ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), winH: innerHeight, x: r.left + r.width / 2, y: r.top + r.height / 2,
        answers: !!(at && b.contains(at)), pane: Math.round(pane.getBoundingClientRect().width),
        labelH: Math.round(label.getBoundingClientRect().height), font: parseFloat(getComputedStyle(label).fontSize) };
    });
    rec.ok('on a 1366 x 768 laptop the creator\'s ENTER BRO TOWN is on the screen and answers a click there',
      !!cc && cc.bottom <= cc.winH && cc.answers, cc);
    rec.ok('...the Trait Picker beside it has room for its tiles (it had 31 px)', !!cc && cc.pane >= 150, cc);
    rec.ok('...and "ENTER BRO TOWN" stays on one line', !!cc && cc.labelH < cc.font * 1.6, cc);

    /* 3b. v2.3.3481 (the 2026-10-19 UI review): the DRAWING EDITOR on the
       same laptop.  Its pane was a fraction of the WINDOW (min(52vw,52vh,
       288px)), so it took its 288 px ceiling and the panel wanted ~505 px in
       the 419 px column: it scrolled sideways inside itself, with Done,
       Select, Mirror and "To front" off its edge.  It is a fraction of the
       column now (game.css, the v2.3.3407 computer block).  Opened from the
       Skin tab's card, the way a player opens it. */
    const tab = (label) => L.page.evaluate((l) => {
      const b = [...document.querySelectorAll('.bt-cc-tabs .bt-cc-tab')].find((x) => (x.textContent || '').trim() === l);
      if (b) b.click();
      return !!b;
    }, label);
    const onSkin = await tab('Skin');
    await L.page.waitForTimeout(800);
    const inkCard = await L.page.$('.bt-cc-ink-pane');
    if (inkCard) await inkCard.click({ timeout: 10000 }).catch(() => {});
    const edOpen = await L.page.waitForSelector('.bt-paint', { timeout: 20000 }).then(() => true).catch(() => false);
    rec.ok('on the laptop the Skin tab\'s drawing card opens the editor (guard)', onSkin && !!inkCard && edOpen,
      { onSkin, card: !!inkCard, edOpen });
    if (edOpen) {
      await L.page.waitForTimeout(1200);
      const ed = await L.page.evaluate(() => {
        const p = document.querySelector('.bt-paint');
        const pr = p.getBoundingClientRect();
        const done = [...p.querySelectorAll('button')].filter((b) => (b.textContent || '').trim() === 'Done').pop();
        const dr = done ? done.getBoundingClientRect() : null;
        const x = dr ? dr.left + dr.width / 2 : -1, y = dr ? dr.top + dr.height / 2 : -1;
        const inView = !!dr && x >= pr.left && x <= pr.right && y >= pr.top && y <= pr.bottom && x <= innerWidth && y <= innerHeight;
        const at = inView ? document.elementFromPoint(x, y) : null;
        return { panel: [Math.round(pr.left), Math.round(pr.top), Math.round(pr.right), Math.round(pr.bottom)],
          win: [innerWidth, innerHeight], scrollW: p.scrollWidth, clientW: p.clientWidth,
          scrollH: p.scrollHeight, clientH: p.clientHeight,
          done: dr ? [Math.round(dr.left), Math.round(dr.top), Math.round(dr.right), Math.round(dr.bottom)] : null,
          inView, answers: !!(at && done && done.contains(at)), x, y };
      });
      rec.ok('...the editor no longer scrolls sideways inside itself (it was ~505 px of content in the 419 px column)',
        !!ed && ed.scrollW <= ed.clientW + 1, ed);
      rec.ok('...its Done button is in view and answers a click there', !!ed && ed.inView && ed.answers, ed);
      if (ed && ed.answers) await L.page.mouse.click(ed.x, ed.y);
      const edClosed = await L.page.waitForFunction(() => !document.querySelector('.bt-paint'), null, { timeout: 10000, polling: 200 })
        .then(() => true).catch(() => false);
      rec.ok('...and a mouse click on Done closes it', edClosed);
    }
    await tab('Skin');   /* back to the tab ENTER was measured on (v2.3.3487: the creator opens on Skin) */
    await L.page.waitForTimeout(500);

    await L.page.fill('input.bt-cc-name', 'Laptop');
    if (cc) await L.page.mouse.click(cc.x, cc.y);
    /* the creator GONE, not only a socket: the page has an id and a zone
       while the creator is still up (on the build before the fix this read
       "joined" with the click landing below the window) */
    const joined = await L.page.waitForFunction(() => {
      const S = window._gameState && window._gameState.current;
      return !document.querySelector('input.bt-cc-name') && !!(S && S.myId && S.currentZone);
    }, null, { timeout: 90000, polling: 500 }).then(() => true).catch(() => false);
    rec.ok('...and a mouse click on it takes the new bro into the game', joined);

    /* 4. v2.3.3407: the quest coach's card on a laptop.  It was lifted clear
       of the phone's combat band, which a computer does not show, up to the
       cap at the top -- onto the minimap, under its invisible "open map"
       button, where a click on the card's ✕ opened the world map.  On a
       computer it clears the keys strip instead (QuestCoach bandClear). */
    if (joined) {
      await L.page.waitForFunction(() => document.querySelectorAll('video').length === 0, null, { timeout: 60000, polling: 300 }).catch(() => {});
      await L.page.evaluate(() => {
        const S = window._gameState && window._gameState.current;
        if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
      });
      const card = async () => L.page.waitForFunction(() => {
        const el = document.querySelector('[data-coach="equip"] [data-coach-card]');
        if (!el) return null;
        const c = el.getBoundingClientRect();
        if (!(c.width > 0)) return null;
        const map = document.querySelector('[data-world-map-open]');
        const m = map ? map.getBoundingClientRect() : null;
        const kb = document.querySelector('.bt-kb-hints');
        const k = kb && getComputedStyle(kb).display !== 'none' ? kb.getBoundingClientRect() : null;
        const hits = (a, b) => !!(a && b && a.width > 0 && b.width > 0 && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
        const x = el.querySelector('[data-coach-dismiss]');
        const xr = x ? x.getBoundingClientRect() : null;
        const at = xr ? document.elementFromPoint(xr.left + xr.width / 2, xr.top + xr.height / 2) : null;
        return { card: [Math.round(c.left), Math.round(c.top), Math.round(c.right), Math.round(c.bottom)],
          onMap: hits(c, m), onKeys: hits(c, k), xAnswers: !!(at && x.contains(at)) };
      }, null, { timeout: 20000, polling: 300 }).then((h) => h.jsonValue()).catch(() => null);
      const folded = await card();
      rec.ok('on a laptop the gear lesson\'s card (band folded) clears the minimap and the keys strip, and its ✕ answers a click',
        !!folded && !folded.onMap && !folded.onKeys && folded.xAnswers, folded);
      await L.page.keyboard.press('b');   /* the band open: the bag, where the gear is */
      await L.page.waitForTimeout(1200);
      const bag = await card();
      rec.ok('...and with the bag open, the same',
        !!bag && !bag.onMap && !bag.onKeys && bag.xAnswers, bag);
    }
    rec.ok('no page errors on the laptop', lErrors.length === 0, lErrors.slice(0, 3));
  } finally {
    await L.ctx.close().catch(() => {});
  }
}
