/* ═══ v2.3.3407: THE SCREENS THE UI REVIEW VISITS, IN ORDER ═══
 *
 * Each state is one picture per view (capture.mjs).  `run(ctx)` gets the
 * screen there and returns nothing on success; a thrown error, or a returned
 * string, is the reason it was SKIPPED -- written into the bundle, never a
 * stop: a review with one screen missing is still a review.
 *
 *   id      the file name (NN-id.jpg), kebab-case
 *   group   the section it is listed under
 *   title   what it is, in a few words
 *   about   one or two sentences for whoever reads the picture (ChatGPT):
 *           what the screen is for, what is on it, how the player got there
 *   views   (optional) only in these views
 *   pre     (optional) true for the screens before the world (the door and
 *           the creator): run before enterWorld
 *   settle  (optional) ms to wait after run() before the picture (default 900)
 *
 * The order matters: a state may rely on what an earlier one did (the quest
 * accepted, the tools granted).  Everything opened is closed by the runner's
 * closeAll() before the next state, unless `keep` is set.
 */
import * as H from '../mp/harness.mjs';

/* ── small helpers every state uses (ctx carries P and the worker) ── */
const evalIn = (P, fn, arg) => P.page.evaluate(fn, arg);
const wait = (P, ms) => P.page.waitForTimeout(ms);
const bus = (P, method, id) => evalIn(P, ([m, i]) => {
  const b = window.__broDashPanelBus;
  if (!b || typeof b[m] !== 'function') return 'no dashboard bus';
  b[m](i);
  return null;
}, [method, id]);
/* A real press where a player's finger (a phone) or mouse (a computer) would
   go: the game's tabs, rows and bag tiles answer pointer events, not a
   synthetic click.  P.view is set by the runner. */
export async function tapAt(P, x, y) {
  if (P.view && P.view.touch) await P.page.touchscreen.tap(x, y);
  else await P.page.mouse.click(x, y);
}

/* Press the control whose words match `re`: a real button first, else the
   smallest element showing those words that looks pressable (a pointer
   cursor) -- the game's tabs and rows are not all <button>s.  `scope` narrows
   the search (a CSS selector).  Scrolled into view, then pressed for real. */
const clickText = async (P, re, scope = null) => {
  const at = await evalIn(P, ([src, flags, sc]) => {
    const rx = new RegExp(src, flags);
    const root = sc ? Array.from(document.querySelectorAll(sc)) : [document.body];
    const vis = (b) => {
      const r = b.getBoundingClientRect();
      if (r.width < 3 || r.height < 3) return false;
      const cs = getComputedStyle(b);
      return cs.visibility !== 'hidden' && cs.display !== 'none' && cs.pointerEvents !== 'none';
    };
    const words = (b) => (b.innerText || b.getAttribute('aria-label') || b.getAttribute('title') || '').replace(/\s+/g, ' ').trim();
    const pool = [];
    for (const r0 of root) for (const b of r0.querySelectorAll('*')) pool.push(b);
    const buttons = pool.filter((b) => b.matches('button, [role="button"], [role="tab"], a[href]') && vis(b) && rx.test(words(b)));
    let pick = buttons[0] || null;
    if (!pick) {
      const any = pool.filter((b) => vis(b) && rx.test(words(b)) && getComputedStyle(b).cursor === 'pointer');
      const area = (e) => { const r = e.getBoundingClientRect(); return r.width * r.height; };
      any.sort((p1, p2) => area(p1) - area(p2));
      pick = any[0] || null;
    }
    if (!pick) return null;
    pick.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const r = pick.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, [re.source, re.flags, scope]);
  if (!at) return 'no control matching ' + re.source;
  await tapAt(P, at.x, at.y);
  return null;
};
/* the middle of the first visible element matching `sel`, pressed for real */
const tapSel = async (P, sel) => {
  const at = await evalIn(P, (s0) => {
    const el = Array.from(document.querySelectorAll(s0)).find((x) => {
      const r = x.getBoundingClientRect();
      return r.width > 8 && r.height > 8 && r.top >= 0 && r.bottom <= innerHeight;
    });
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, sel);
  if (!at) return 'nothing to press at ' + sel;
  await tapAt(P, at.x, at.y);
  return null;
};
const has = (P, sel) => evalIn(P, (s) => !!document.querySelector(s), sel);
/* where the dashboard's pages are: the band upright and on a computer, and
   sideways its own column (.bt-dashboard is display:none sideways --
   BottomDashboard's .bt-land-sheet) */
const DASH = '.bt-dashboard, .bt-land-sheet';
/* The dashboard band folded to its button row, as a new player has it: its fold
   chip pressed, as a player presses it, when it is open.  The bag's page opens
   the band, and left open it sat under every screen after it. */
/* v2.3.3460: the chip that SHOWS -- sideways the band's own chip is still in
   the page, hidden, and v2.3.3407 pressed it: "nothing to press at
   [data-dash-fold]", the sideways band-open picture never taken */
const foldChip = (P) => evalIn(P, () => {
  const shown = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 2 && r.height > 2 && cs.display !== 'none' && cs.visibility !== 'hidden';
  };
  const b = document.querySelector('[data-dash-fold]');
  if (shown(b)) return { sel: '[data-dash-fold]', v: b.getAttribute('data-dash-fold') };
  const l = document.querySelector('[data-land-fold]');
  if (shown(l)) return { sel: '[data-land-fold]', v: l.getAttribute('data-land-fold') };
  return null;
});
export async function foldBand(P) {
  const st = await foldChip(P);
  if (!st || st.v === 'min') return false;
  await tapSel(P, st.sel).catch(() => {});
  await wait(P, 700);
  return true;
}
/* ...and unfolded: the band's chip (upright, a computer), or sideways the
   column's own chip, ▴ (BottomDashboard's `data-land-fold`: sideways the rest
   state IS folded, and the chip opens the dashboard column) */
async function unfoldBand(P) {
  const st = await foldChip(P);
  if (!st) return 'no dashboard fold chip';
  if (st.v === 'min') { const e = await tapSel(P, st.sel); if (e) return e; await wait(P, 900); }
  return null;
}
/* v2.3.3481 (the 2026-10-19 UI review): the bag a PLAYER sees -- upright and
   on a computer the band at rest, unfolded (four across, BAG_VIEW_COLS);
   sideways the dashboard column.  open('bag') was the retired expanded bag
   page, which no button opens (v2.3.1654) and which fits five across at 390
   px: the review read its five columns as the game's bag. */
async function openBag(P, view) {
  if (view.id === 'landscape') return bus(P, 'open', 'dashboard');
  await evalIn(P, () => { if (window.__broDashPanelBus) window.__broDashPanelBus.toBar(); });
  return unfoldBand(P);
}
const S_ = (P, fn) => H.readState(P, fn);

/* Stand somewhere in the Wheel by walking there in hops the worker accepts
   (harness hopTo), with your BOOTS at (x, bootsY). */
export async function standAt(P, x, bootsY) {
  for (let k = 0; k < 4; k++) {
    const dy = await evalIn(P, () => {
      const S = window._gameState.current;
      const g = window.__btPlayerGround ? window.__btPlayerGround() : null;
      return g ? g.y - S.player.y : 0;
    });
    await H.hopTo(P, x, bootsY - dy, { step: 100, gap: 260, tries: 90 });
    await wait(P, 700);
    const g = await evalIn(P, () => (window.__btPlayerGround ? window.__btPlayerGround() : null));
    if (!g || Math.hypot(g.x - x, g.y - bootsY) < 14) return true;
  }
  return false;
}

async function nearestNode(P, type, skip = []) {
  return evalIn(P, ([t, sk]) => {
    const S = window._gameState.current, p = S.player;
    let best = null, d = Infinity;
    for (const n of S.gatherNodes || []) {
      if (n.nodeType !== t || !n.alive || (n.gatherLvl || 1) !== 1 || sk.includes(n.id)) continue;
      const dd = Math.hypot(n.x - p.x, n.y - p.y);
      if (dd < d) { d = dd; best = { id: n.id, x: n.x, y: n.y }; }
    }
    return best;
  }, [type, skip]);
}

async function doorOf(P, id) {
  const doors = await evalIn(P, () => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []));
  return doors.find((d) => d.id === id) || null;
}

/* the dashboard's page by its id, opened as the rail opens it */
const dash = (id, title, about, extra) => Object.assign({
  id: 'dash-' + id, group: 'Dashboard', title, about,
  run: async ({ P }) => { const e = await bus(P, 'open', id); if (e) return e; },
}, extra || {});
/* a page under More (drilled, with its back button) */
const more = (id, title, about) => ({
  id: 'more-' + id, group: 'Dashboard: More', title, about,
  run: async ({ P }) => {
    const e = await bus(P, 'open', 'more');
    if (e) return e;
    await wait(P, 300);
    await bus(P, 'push', id);
  },
});
/* a building's window, as its door opens it (the room behind it loads first) */
const building = (panel, title, about, extra) => Object.assign({
  id: 'building-' + panel, group: 'Buildings (BroTown)', title, about, settle: 1600,
  run: async ({ P }) => {
    const ok = await evalIn(P, (p) => { if (!window.__btBuildingWindow) return false; window.__btBuildingWindow.open(p); return true; }, panel);
    if (!ok) return 'no building-window probe';
    /* the room picture behind the menu, if it has one */
    await evalIn(P, async () => {
      for (let i = 0; i < 40; i++) {
        const im = document.querySelector('[data-room] img, .bt-room img, img[src*="/world/interiors/"]');
        if (!im || (im.complete && im.naturalWidth > 0)) return;
        await new Promise((r) => setTimeout(r, 150));
      }
    }).catch(() => {});
  },
}, extra || {});

/* v2.3.3460: the arrival's banners out of the pictures -- the QUEST REWARD
   the setup's armour raises waits its turn behind the welcome plate, and
   v2.3.3407's "BroTown, nothing open" wore it.  BroTown publishes when the
   banner on screen, or the last one queued, will be gone. */
async function bannersGone(P, maxMs = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const busy = await evalIn(P, () => {
      const until = typeof window.__btQuestMsgUntil === 'function' ? window.__btQuestMsgUntil() : 0;
      return until > Date.now() || !!document.querySelector('[data-quest-banner]');
    });
    if (!busy) return true;
    await wait(P, 300);
  }
  return false;
}

/* v2.3.3460: your sparring clones are the ids the worker's spar_state named
   (game/spar.js S._spar.ids), there once a tick has put them in S.others --
   v2.3.3407 looked for a `.spar` flag no player entry carries, and aimed with
   a _gameFns.sparAim that does not exist, so its fight was never aimed */
async function sparCloneId(P, timeout = 9000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const id = await evalIn(P, () => {
      const S = window._gameState.current;
      const ids = S && S._spar && S._spar.ids ? Array.from(S._spar.ids) : [];
      return ids.find((k) => S.others && S.others[k]) || null;
    });
    if (id) return id;
    await wait(P, 400);
  }
  return null;
}

/* v2.3.3481: a sword in your hand and a shield on your arm, as a player arms
   (the 2026-10-19 UI review, p11/spar-fight #1).  The Reviewer never put on
   the sword and shield tut_1 gives (both phone views' controls read "Weapon:
   Fists"), and with no weapon in hand the Special button stays away
   (SpecialButton.jsx specialButtonLive), with no shield on the arm the Shield
   button (shieldToggle.js shieldButtonLive) -- the fight's two buttons the
   screen is about.  The quest's own pieces when the bag holds them (a full
   run accepts tut_1 at quest-accepted), else the test panel's kit (a
   `--only` retake).  The sword through the game's own equip_request
   (harness equipWeapon); the shield the bag's way (ItemDetailPopup
   onEquipStashShield: off the stash onto the arm, and the worker told which,
   as shieldWear.js syncShieldWorn tells it). */
async function armForFight(P, wsPort, myId) {
  let r = await H.equipWeapon(P, 'greatsword', 'weapon', 'melee').catch(() => null);
  if (!r || !r.ok) {
    await H.devOp(wsPort, 'kit', myId, { what: 'weapons' }).catch(() => {});
    for (let i = 0; i < 24 && !(r && r.ok); i++) {
      await wait(P, 250);
      r = await H.equipWeapon(P, 'greatsword', 'weapon', 'melee').catch(() => null);
    }
  }
  const onArm = () => evalIn(P, () => {
    const S = window._gameState.current, R = S && S.rpg;
    if (!R) return false;
    if (R.shield) return true;
    if (!Array.isArray(R.shieldStash) || !R.shieldStash.length) return false;
    const sh = R.shieldStash.shift();
    R.shield = sh;
    if (S.channel && S._serverCaps && S._serverCaps.shieldwear) {
      const payload = (typeof sh.gid === 'string' && sh.gid) ? { gid: sh.gid }
        : { sig: [sh.name || '', sh.gearBase || '', sh.tierMult == null ? '' : sh.tierMult, sh.tier || ''].join('|') };
      try { S.channel.send({ type: 'shield_wear', payload }); } catch (e) { /* the next change reports it */ }
    }
    return true;
  });
  if (!(await onArm())) {
    await H.devOp(wsPort, 'kit', myId, { what: 'shield' }).catch(() => {});
    for (let i = 0; i < 24 && !(await onArm()); i++) await wait(P, 250);
  }
}

export const STATES = [
  /* ═══ BEFORE THE WORLD ═══ */
  {
    id: 'login-door', group: 'Before the game', pre: true, title: 'The login door',
    about: 'The first screen of the game: create a new character, or continue with a Login Key on a device that already has one.',
    run: async ({ P }) => {
      await P.page.waitForFunction(() => !!(document.querySelector('[data-tut="login-create"]') || document.querySelector('input.bt-cc-name')),
        null, { timeout: 45000, polling: 250 });
      await wait(P, 1500);
    },
  },
  {
    id: 'creator', group: 'Before the game', pre: true, title: 'Character creator',
    about: 'Making a new character: the bro on the left, the Trait Picker on the right (tabs for hair, hats, skin, eyes, eyewear, beard, clothes), the name field and ENTER BRO TOWN.',
    run: async ({ P }) => {
      if (await has(P, '[data-tut="login-create"]')) {
        await H.uncoverDoor(P.page);
        await P.page.click('[data-tut="login-create"]');
      }
      await P.page.waitForSelector('input.bt-cc-name', { timeout: 30000 });
      await wait(P, 1800);
    },
  },
  /* v2.3.3526: 'hair' joins the list -- the creator opens on Skin now (the
     owner's "Go recommended"), so the opening shot no longer shows Hair */
  ...['hair', 'hat', 'skin', 'eyes', 'eyewear', 'beard', 'shirt', 'pants', 'shoes'].map((t) => ({
    id: 'creator-tab-' + t, group: 'Before the game', pre: true, keep: true, title: 'Creator: ' + t + ' tab',
    about: 'The character creator with the "' + t + '" tab of the Trait Picker open.',
    run: async ({ P }) => {
      const r = await evalIn(P, (tt) => {
        const tabs = Array.from(document.querySelectorAll('button.bt-cc-tab'));
        const want = { hair: /^hair/i, hat: /hat/i, skin: /skin|species/i, eyes: /^eyes/i, eyewear: /eyewear/i, beard: /beard/i, shirt: /shirt/i, pants: /pants/i, shoes: /shoes/i }[tt];
        const b = tabs.find((x) => want.test((x.innerText || x.getAttribute('aria-label') || '').trim()));
        if (!b) return 'no tab ' + tt + ' (have: ' + tabs.map((x) => (x.innerText || '').trim()).join(', ') + ')';
        b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        b.click();
        return null;
      }, t);
      if (r) return r;
      await wait(P, 700);
    },
  })),
  {
    id: 'creator-paint', group: 'Before the game', pre: true, title: 'Creator: the drawing editor',
    about: 'The editor the creator opens to draw on the character -- here a tattoo, from the Skin tab (the Shirt and Pants tabs open it for a worn shirt or trousers): canvas, brushes, colours, Done.',
    run: async ({ P }) => {
      await evalIn(P, () => {
        const b = Array.from(document.querySelectorAll('button.bt-cc-tab')).find((x) => /skin|species/i.test(x.innerText || ''));
        if (b) b.click();
      });
      await wait(P, 700);
      const ok = await evalIn(P, () => {
        const b = document.querySelector('.bt-cc-ink button');
        if (!b) return false;
        b.click();
        return true;
      });
      if (!ok) return 'no drawing card on the Skin tab';
      await wait(P, 1800);
    },
    after: async ({ P }) => {
      /* back to the creator: the editor's own Done */
      await evalIn(P, () => {
        const d = Array.from(document.querySelectorAll('button')).find((x) => /^done$/i.test((x.innerText || '').trim()));
        if (d) d.click();
      });
      await wait(P, 900);
    },
  },

  /* ═══ ARRIVING ═══ */
  {
    id: 'welcome', group: 'Arriving in BroTown', title: 'Welcome, first seconds in the world',
    /* v2.3.3481: no coach card -- none is shown over the welcome plate, and the
       review plays as a player who skipped the tutorial (capture.mjs) */
    about: 'A brand-new character just arrived in BroTown: the welcome plate (with Skip tutorial) over the world with the dashboard folded.  The review then plays on as a player who pressed Skip tutorial, so no tutorial coach card is in the screens after this one.',
    settle: 400,
    run: async ({ P }) => {
      for (let i = 0; i < 40; i++) {
        if (await has(P, '[data-quest-banner="welcome"]')) break;
        await wait(P, 250);
      }
    },
    after: async ({ P }) => {
      /* the review is of the game, not of the tutorial: skip it, as a player can */
      await clickText(P, /skip tutorial/i).catch(() => {});
      await evalIn(P, () => { try { localStorage.setItem('bt_tutorial_skipped', '1'); } catch (e) { /* */ } });
      await wait(P, 1200);
      await bannersGone(P);
    },
  },
  {
    id: 'hud', group: 'The world (HUD)', title: 'BroTown, nothing open',
    about: 'The resting game screen in the town square: top bar (place, coins), the minimap with its name plate, the dashboard folded to its button row, and on a phone the controls appearing when touched (on a computer, the keyboard keys strip).',
    run: async ({ P }) => { await wait(P, 600); },
  },
  {
    id: 'hud-band', group: 'The world (HUD)', title: 'BroTown, dashboard band open',
    about: 'The same screen with the dashboard band unfolded: the bag, what you have equipped and your combat skills at a glance (sideways, the ▴ button opens it as a column at the side).',
    run: async ({ P }) => unfoldBand(P),
    after: async ({ P }) => {
      /* folded again, as a new player has it: the screens of the world after
         this one show the world, and the dashboard's pages open the same way
         either way (its fold chip, as a player taps it) */
      await foldBand(P);
    },
  },
  {
    id: 'hud-controls', group: 'The world (HUD)', title: 'Controls in use',
    about: 'Walking with the left stick (a phone) or WASD (a computer): the movement stick and the contextual right button show while you play.',
    views: ['portrait', 'landscape', 'tablet'],
    run: async ({ P, view }) => {
      /* away from Mayor Bro first: walking into him opens his dialogue */
      await H.leaveNpc(P, 'mayor_bro').catch(() => {});
      await wait(P, 600);
      /* a real touch on the left half, held, while the picture is taken */
      const vp = view.viewport;
      const cdp = await P.ctx.newCDPSession(P.page);
      const x = Math.round(vp.width * 0.18), y = Math.round(vp.height * (view.id === 'landscape' ? 0.62 : 0.66));
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 41 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 26, y: y - 10, id: 41 }] });
      await wait(P, 700);
      return { release: async () => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }).catch(() => {}); } };
    },
  },
  {
    id: 'near-mayor', group: 'The world (HUD)', title: 'Next to Mayor Bro',
    about: 'Walking up to a character with a quest to give: the ! badge over his head and the name plates.  A step closer and his dialogue opens by itself (a tap on him, or E on a computer, opens it too).',
    run: async ({ P }) => {
      await H.leaveNpc(P, 'mayor_bro').catch(() => {});
      /* close enough to talk, not on top of him (the proximity opener would open the dialogue) */
      await evalIn(P, () => {
        const S = window._gameState.current;
        const m = (S.npcs || []).find((n) => /mayor/i.test(n.name || n.id || ''));
        if (m) { S.player.x = m.x + 70; S.player.y = m.y + 60; }
      });
      await wait(P, 1200);
    },
  },
  {
    id: 'mayor-dialogue', group: 'Talking to characters', title: 'Mayor Bro talking',
    about: "Mayor Bro's dialogue: his portrait, his lines, and Next.  This is how every quest giver talks.",
    run: async ({ P }) => {
      const open = await H.approachNpc(P, 'mayor_bro').catch(() => false);
      if (!open) {
        /* E (a computer) or the right stick's tap (a phone) */
        await evalIn(P, () => { const S = window._gameState.current; if (S._interactNow) S._interactNow({ npcFirst: true }); });
        await wait(P, 900);
      }
      if (!(await H.npcDialogueOpen(P))) return 'the dialogue did not open';
    },
    keep: true,
  },
  {
    id: 'quest-offer', group: 'Talking to characters', title: 'A quest offered',
    about: 'The quest offer at the end of the dialogue: what the quest asks, its rewards, Accept.',
    keep: true,
    run: async ({ P }) => {
      await H.advanceNpcDialogue(P, { max: 14 }).catch(() => {});
      await wait(P, 700);
      if (!(await has(P, '.bt-qoffer'))) return 'no quest offer showed';
    },
  },
  {
    id: 'quest-accepted', group: 'Talking to characters', title: 'Quest accepted',
    about: 'After Accept: the QUEST ACCEPTED banner, and the quest pinned on screen with its objective.',
    settle: 500,
    run: async ({ P }) => {
      const r = await H.confirmQuestOffer(P).catch((e) => String(e));
      if (typeof r === 'string' && /error|timeout/i.test(r)) return r;
    },
    after: async ({ P }) => { await H.closeNpcDialogue(P).catch(() => {}); await H.leaveNpc(P, 'mayor_bro').catch(() => {}); },
  },

  /* ═══ THE DASHBOARD ═══ */
  dash('hero', 'Character', 'Your character page: equipment slots, the figure, your stats as pills (offense, player, vitals).'),
  {
    id: 'dash-hero-points', group: 'Dashboard', title: 'Character: Points',
    about: 'The Character page on its Points tab: spending points on each weapon skill and on the character.',
    run: async ({ P }) => {
      await bus(P, 'open', 'hero');
      /* v2.3.3481 (the 2026-10-19 UI review): the computer's picture showed
         the Equipment tab.  Opening from the folded band is two renders and a
         220 ms rise, and 500 ms on the software-drawn 2880 x 1800 page measured
         the tab mid-rise, so the press landed on the bars under it.  Wait the
         rise out, press the tab by its id (its words are the owner's copy),
         and check it took: a miss is SKIPPED, never the wrong picture. */
      await wait(P, 900);
      const e = await tapSel(P, '[data-section="Build"]');
      if (e) return e;
      await wait(P, 400);
      if (!(await has(P, '[data-section="Build"][aria-pressed="true"]'))) return 'the Points tab did not take the press';
    },
  },
  dash('quests', 'Quests', 'The quest log: active quests with progress, the daily rewards card.'),
  {
    id: 'dash-quest-detail', group: 'Dashboard', title: 'A quest in detail',
    about: 'One quest opened from the log: its steps, rewards and where to go.',
    run: async ({ P }) => {
      await bus(P, 'open', 'quests');
      await wait(P, 600);
      const ok = await clickText(P, / pays |objective|remnant|bring|visit|talk/i, DASH).then((e) => !e);
      if (!ok) return 'no quest row to open';
    },
  },
  dash('skills', 'Life Skills', 'Your life skills (mining, woodcutting, fishing, cooking, farming...) and their levels.'),
  {
    id: 'dash-skill-detail', group: 'Dashboard', title: 'A life skill in detail',
    about: 'One life skill opened: what it unlocks at each level, the XP it pays, each hit\'s odds.',
    /* v2.3.3481: the 2026-10-19 UI review -- the laptop's picture was the
       ten-skill list, not the detail: the press went in while the band was
       still unfolding (the last view of a run on a box drawing a few frames a
       second) and landed on empty band, and the state said it had worked.  So
       it checks for the detail's "‹ All skills", presses once more if it is
       not there, and skips the picture if it still is not. */
    run: async ({ P }) => {
      await bus(P, 'open', 'skills');
      await wait(P, 600);
      const backSel = DASH.split(',').map((s) => s.trim() + ' button').join(', ');
      for (let k = 0; k < 2; k++) {
        const e = await clickText(P, /^(mining|woodcutting|fishing)\b/i, DASH);
        if (e) return e;
        await wait(P, 500);
        const open = await evalIn(P, (s) => Array.from(document.querySelectorAll(s)).some((b) => /all skills/i.test(b.innerText || '')), backSel);
        if (open) return;
      }
      return 'the skill detail did not open';
    },
  },
  dash('encyclopedia', 'Codex', 'The Monster Codex: a card for each kind of monster, opened by the first kill.'),
  {
    id: 'dash-codex-monster', group: 'Dashboard', title: 'Codex: a monster',
    about: "One monster's codex page: header, drops table with the kill roll, info with its stage, locations.",
    run: async ({ P, wsPort, myId }) => {
      await H.devOp(wsPort, 'codex', myId, { all: true, n: 3 }).catch(() => {});
      await wait(P, 800);
      await bus(P, 'open', 'encyclopedia');
      await wait(P, 800);
      const ok = !(await clickText(P, /snowman|slime|goblin|mummy/i, DASH));
      if (!ok) return 'no monster card to open';
    },
  },
  dash('more', 'More', 'The More page: tiles for everything else (settings, pets, ranks, friends, login key, about...).'),
  more('settings', 'Settings', 'Settings: sound, graphics, controls and the rest.'),
  more('pets', 'Pets', 'Your pets: the ones you caught, the one out with you, the journal of kinds.'),
  more('leaderboard', 'Ranks (leaderboard)', 'The leaderboard.'),
  more('social', 'Friends', 'Friends: your friends list and messages.'),
  more('journey', 'Journey', 'Your journey so far.'),
  more('account', 'Login Key', 'Your Login Key: how to carry this character to another device.'),
  more('about', 'About & privacy', 'About the game, privacy, rules and credits.'),
  more('feedback', 'Feedback', 'Sending feedback to the developer.'),
  {
    id: 'dash-bag', group: 'Dashboard', title: 'Bag',
    about: 'The bag: everything you carry, filtered by kind; a tap on an item opens its card.',
    run: async ({ P, view }) => {
      const e = await openBag(P, view);
      if (e) return e;
      await wait(P, 600);
    },
  },
  {
    id: 'item-card', group: 'Dashboard', title: 'An item card',
    about: 'A bag item opened: its picture, what it is, and its buttons (use, equip, sell, drop...).',
    run: async ({ P, view }) => {
      const e0 = await openBag(P, view);
      if (e0) return e0;
      await wait(P, 700);
      const e = await tapSel(P, '[data-bag-key]');
      if (e) return e;
      await wait(P, 600);
      const ok = await has(P, '[data-item-detail], .bt-item-detail, .bt-idp, [data-idp]');
      if (!ok) return null;   /* the card's class is not pinned: the picture says whether it opened */
    },
  },

  /* ═══ BUILDINGS ═══ */
  {
    id: 'near-door', group: 'Buildings (BroTown)', title: 'At a building\'s door',
    about: 'Standing at the foot of a building\'s steps: the Enter button over the name on its sign (a phone) -- E does the same on a computer.',
    run: async ({ P }) => {
      const d = await doorOf(P, 'bank');
      if (!d) return 'no doors known yet';
      await standAt(P, d.x, d.y + 30);
      await wait(P, 1000);
      if (!(await has(P, 'button.bt-interact-prompt'))) return 'no Enter button showed';
    },
  },
  building('forge', 'Blacksmith (forge)', 'The Blacksmith: smithing weapons and armour, hardening, smelting and salvage, its room behind the menu.'),
  building('woodwork', 'Woodworker', 'The Woodworker: bows, staffs, traps and hardened wood.'),
  /* v2.3.3516: the crack and the combine (ShardCrackPanel.jsx) -- seeded with
     shards of every land and raw gems so the picture shows rows, not the
     empty tab (the test panel's own two buttons) */
  (() => {
    const b = building('gemcut', 'Gem Works: cut gems', 'The Gem Works on its Cut gems tab: shards to gems -- a row a land to crack its shards for raw gems, three raw gems combined into an elemental gem, the Rare Gem cut into any.');
    const open = b.run;
    b.run = async (ctx) => {
      if (ctx.wsPort && ctx.myId) {
        await H.devOp(ctx.wsPort, 'kit', ctx.myId, { what: 'shards', count: 12 }).catch(() => {});
        await H.devOp(ctx.wsPort, 'kit', ctx.myId, { what: 'gems', raw: true, count: 4 }).catch(() => {});
        await wait(ctx.P, 800);
      }
      return open(ctx);
    };
    return b;
  })(),
  building('enchant', 'Gem Works: set gems', 'The Gem Works on its Set gems tab (the enchanter).'),
  building('cook', 'Cookhouse', 'The Cookhouse: recipes to cook from what you carry.'),
  building('gamble', 'Gambling Den', 'The Gambling Den: the free daily spin and the games.'),
  {
    id: 'daily-rewards', group: 'Buildings (BroTown)', title: 'Daily rewards',
    about: 'The Daily Rewards window (from the Gambling Den, or the "Daily rewards" card on the Quests page): the login streak and the free daily spin.',
    settle: 1200,
    run: async ({ P }) => {
      const ok = await evalIn(P, () => { if (!window.__btDailyRewards) return false; window.__btDailyRewards.open('today'); return true; });
      if (!ok) return 'no daily-rewards probe';
    },
  },
  /* v2.3.3460: no 'daily-season' -- the daily quests and the season were put
     away in v2.3.3400, the window has no Season tab, and the picture was the
     Today page again (found by the design notes' research) */
  building('farm', 'Feed & Seed', 'The Feed & Seed: visit your farm, buy seeds, the order board.'),
  building('farmhome', 'Land Office', 'The Land Office: the trip to your own farm.'),
  building('bank', 'Bank', 'The Bank: your gold and what you wear (nothing is stored in it yet).'),
  building('exchange', 'General Store (market)', 'The General Store\'s Marketplace: an order book where players post buy and sell orders for kinds of gear, with a way to the Auction House at its top.'),
  building('auctionhouse', 'Auction House', 'The Auction House: its clerk behind the counter and its one button, Market, which opens the players\' listings and bids.'),
  building('party', 'Saloon', 'The Saloon: your party and finding one.'),
  building('post', 'Post Office', 'The Post Office: your mail and friends\' messages.'),
  building('sheriff', "Sheriff's Office", "The Sheriff's Office: the player list (duels start from a player's card) and the arena sign-up."),
  building('guildhall', 'Guild Hall', 'The Guild Hall: a row saying clans are parties now (made in the Saloon), and the skill guilds.'),
  building('townhall', 'Town Hall', 'The Town Hall: the leaderboard and the world map.'),
  building('arena', 'Gladiator Arena', 'The arena window (from the Sheriff\'s Office).'),
  {
    id: 'shop-diego', group: 'Buildings (BroTown)', title: "Diego's shop",
    about: "Diego, the shopkeeper standing outside the General Store: his shop window, buying and selling.",
    settle: 1200,
    run: async ({ P }) => { await evalIn(P, () => { if (window.__broShopBus) window.__broShopBus.setOpen(true); }); },
    after: async ({ P }) => { await evalIn(P, () => { if (window.__broShopBus) window.__broShopBus.setOpen(false); }); },
  },
  {
    id: 'ace-flip', group: 'Buildings (BroTown)', title: "Ace's coin flip",
    about: "Ace, outside the Gambling Den: his coin flip game.",
    run: async ({ P }) => { await evalIn(P, () => { if (window.__btAceFlipBus) { window.__btAceFlipBus.setStake(0); window.__btAceFlipBus.setOpen(true); } }); },
    after: async ({ P }) => { await evalIn(P, () => { if (window.__btAceFlipBus) window.__btAceFlipBus.setOpen(false); }); },
  },

  /* ═══ OVERLAYS ═══ */
  {
    id: 'world-map', group: 'Maps and chat', title: 'World map',
    about: 'The world map (a tap on the minimap): the Wheel, its eight lands, where you are, the quest\'s road, zoom buttons and the compass.',
    settle: 1600,
    run: async ({ P }) => {
      const ok = await evalIn(P, () => { if (!window.__btWorldMapOpen) return false; window.__btWorldMapOpen(true); return true; });
      if (!ok) return 'no world-map probe';
    },
    after: async ({ P }) => { await evalIn(P, () => { if (window.__btWorldMapOpen) window.__btWorldMapOpen(false); }); },
  },
  {
    id: 'chat', group: 'Maps and chat', title: 'Chat',
    about: 'Writing in the chat.  On a phone a tap on your own bro opens the chat box high over him, its tail pointing down at him (no Send button: the keyboard\'s own key sends; the smiley opens the emotes, the mic types by voice); on a computer C opens the chat bar at the top (All / Area / Whisper, the line and Send).',
    /* v2.3.3460: each the way its player opens it -- a phone's tap on your
       own bro raises the box over his head (chatBubbleBus, as BroTown's
       self-tap does, the band folded to its bar first), C on a computer the
       chat bar.  v2.3.3407 opened the computer's bar on the phones too: found
       by the design notes' research */
    run: async ({ P, view }) => {
      if (view.touch) {
        const ok = await evalIn(P, () => {
          const b = window.__broDashPanelBus;
          if (b && b.state && b.state.mode !== 'bar') b.toBar();
          if (!window.__broChatBubbleBus) return false;
          window.__broChatBubbleBus.setOpen(true);
          return true;
        });
        if (!ok) return 'no chat box bus';
      } else {
        await evalIn(P, () => { if (window._uiPanels) window._uiPanels.chatOpen(true); });
      }
    },
  },
  {
    id: 'player-list', group: 'Other players', title: 'Player list',
    about: 'Everyone in the game: the list a party or a duel starts from.',
    run: async ({ P }) => { await evalIn(P, () => { if (window.__broLegacyUI) window.__broLegacyUI.playersOpen(); }); },
  },
  /* v2.3.3460: the card a tap on another player opens -- the review had none:
     a sparring clone of you (the test panel's, standing still) is the player */
  {
    id: 'player-card', group: 'Other players', title: 'Another player\'s card',
    about: 'What a tap on another player opens: their portrait (a tap on it opens their Inspect card), name and level, the buttons to party, trade, add a friend and duel, and Mute, Block and Report.  The player here is a sparring clone of you from the test panel, standing still.',
    settle: 1500,
    run: async ({ P, wsPort, myId }) => {
      const r = await H.devOp(wsPort, 'spar', myId, { add: 'sword', skill: 'dummy' }).catch((e) => ({ error: String(e) }));
      if (r && r.ok === false) return 'no clone: ' + (r.error || JSON.stringify(r));
      const id = await sparCloneId(P);
      if (!id) return 'no clone came';
      await wait(P, 800);
      const ok = await evalIn(P, (cid) => !!(window.__broInspectPlayer && window.__broInspectPlayer(cid)), id);
      if (!ok) return 'the card did not open';
    },
    after: async ({ P, wsPort, myId }) => {
      await H.devOp(wsPort, 'spar', myId, { clear: true }).catch(() => {});
      await wait(P, 1000);
    },
  },
  {
    id: 'inspect-self', group: 'Other players', title: 'An Inspect card (your own)',
    about: 'The Inspect card, a player\'s profile (level, achievement points, the three combat levels, what they wear, kills), here your own -- the one way to show it without a second player.  For another player it opens from the portrait on their card, with Invite to Party, Trade and Duel at its foot; nothing in the game opens your own yet (where its button goes is the owner\'s call).',
    run: async ({ P }) => { await evalIn(P, () => { if (window.__broInspectSelf) window.__broInspectSelf(); }); },
  },
  {
    id: 'trade-request', group: 'Other players', title: 'A trade request',
    about: 'Another player asking to trade with you (shown with a stand-in player): the trade drawer over the dashboard, "Open trade" or "Decline". Opened, the trade is a drawer joined to the top of your bag.',
    /* v2.3.3460: the drawer today's worker raises (trade2_invite ->
       TradeWindowPanel's invite stub).  v2.3.3407 showed IncomingTradePanel,
       the one-way gift card kept only for an old worker -- found by the
       design notes' research: a screen no player sees */
    run: async ({ P }) => { await evalIn(P, () => window._uiPanels.trade2({ invite: true, from: 'bp_demo', fromName: 'Rival Bro', ts: Date.now() })); },
  },
  {
    id: 'duel-request', group: 'Other players', title: 'A duel challenge',
    about: 'Another player challenging you to a duel (shown with a stand-in player): Accept or Decline.  A challenge from a player\'s card carries no stake, so there is no wager line.',
    /* v2.3.3460: no wager -- the one sender (InspectPlayerPanel) sends 0, so
       v2.3.3407's 500 drew a line no player sees */
    run: async ({ P }) => { await evalIn(P, () => window._uiPanels.duelRequest({ fromId: 'bp_demo', fromName: 'Rival Bro', wager: 0 })); },
  },

  /* ═══ LIFE SKILLS ═══ */
  {
    id: 'harvest-near', group: 'Harvesting (life skills)', title: 'At a tree, with an axe',
    about: 'Standing at a resource you hold the tool for: its name over it, and on a phone the right button showing the tool (a word -- WAIT, then CHOP, PUMP, REEL or FLIP -- comes only once the harvest has started).  A tap (phone), E or a click (computer) starts the harvest.',
    run: async (ctx) => {
      const { P } = ctx;
      const node = await nearestNode(P, 'tree', ctx.used || []);
      if (!node) return 'no tree near';
      (ctx.used = ctx.used || []).push(node.id);
      ctx.node = node;
      /* v2.3.3481: the 2026-10-19 UI review read "Pine Log over empty grass,
         no tree": 130 px NORTH of the node stood the bro behind the trunk,
         under the crown, and a tree whose crown covers you is drawn see-through
         (0.42, tierTrees.js behindTree) -- a green pine on green grass all but
         gone in a JPEG.  In front of the trunk instead, as a player walking up
         from the south stands: the woodcutter's own side of it, inside the reach
         the next screen chops from (a tier-1 tree's reach box, BroTown
         nodeReachDist), the boots south of its foot. */
      await H.hopTo(P, node.x - 60, node.y + 10);
      await wait(P, 1500);
    },
  },
  {
    id: 'harvest-windup', group: 'Harvesting (life skills)', title: 'Chopping: the hits land',
    about: 'The harvest under way: the character chops, each hit a number off the tree, the green bar over the tree counting its HP down ("7/10"), the button\'s ring filling.',
    settle: 300,
    run: async (ctx) => {
      const { P } = ctx;
      await evalIn(P, () => { const S = window._gameState.current; if (S._interactNow) S._interactNow(); });
      const ok = await P.page.waitForFunction(() => {
        const ex = window._gameState.current._extraction;
        return !!(ex && ex.hits && ex.hits.shown >= 2);
      }, null, { timeout: 25000, polling: 100 }).then(() => true).catch(() => false);
      if (!ok) return 'the hits did not start';
    },
    keep: true,
  },
  {
    id: 'harvest-ready', group: 'Harvesting (life skills)', title: 'Chopping: the gesture',
    about: 'The tree is down to 0 and the game asks for the gesture: on a phone, chop side to side on the right button (the axe and arrows show how); on a computer, drag the mouse side to side or hold E (the line over the button says so).',
    run: async ({ P }) => {
      const ok = await P.page.waitForFunction(() => {
        const ex = window._gameState.current._extraction;
        return !!(ex && ex.status === 'ready');
      }, null, { timeout: 60000, polling: 150 }).then(() => true).catch(() => false);
      if (!ok) return 'the window never opened';
      await wait(P, 700);
    },
    after: async ({ P }) => {
      /* finish it the computer's way (E held) or walk off: either ends it */
      await evalIn(P, () => { const S = window._gameState.current; if (S._harvestKeys) S._harvestKeys.down(); });
      await wait(P, 2500);
      await evalIn(P, () => { const S = window._gameState.current; if (S._harvestKeys) S._harvestKeys.up(); S._extraction = null; });
    },
  },

  /* ═══ A FIGHT ═══ */
  {
    id: 'spar-fight', group: 'Fighting', title: 'A fight (sparring clone)',
    about: 'Fighting: your target\'s HP bar and name plate, damage numbers, and on a phone the shield, special and attack buttons that come up in a fight.  The opponent is a sparring clone from the test panel.',
    settle: 2500,
    run: async ({ P, wsPort, myId }) => {
      await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
      await armForFight(P, wsPort, myId);   /* v2.3.3481: so Special and Shield can come up */
      const r = await H.devOp(wsPort, 'spar', myId, { add: 'sword', skill: 'easy' }).catch((e) => ({ error: String(e) }));
      if (r && r.ok === false) return 'no clone: ' + (r.error || JSON.stringify(r));
      await wait(P, 3000);
      /* aim at it, as a tap does (game/spar.js sparAim's own lock) */
      const id = await sparCloneId(P);
      if (!id) return 'no clone came';
      await evalIn(P, (cid) => {
        const S = window._gameState.current;
        const o = S.others && S.others[cid];
        if (o) S.lockedTarget = { type: 'player', id: cid, ref: o, spar: true };
        /* v2.3.3481: and hold Attack, as a thumb on the button does, so the
           blows land in the picture: the clone's HP bar shows only once it is
           hurt, and the numbers only with a blow (the review's picture had
           neither -- the bro never swung) */
        S.autoAttack = true;
      }, id);
    },
    after: async ({ P, wsPort, myId }) => {
      await evalIn(P, () => { const S = window._gameState.current; if (S) S.autoAttack = false; }).catch(() => {});   /* v2.3.3481 */
      await H.devOp(wsPort, 'spar', myId, { clear: true }).catch(() => {});
      await wait(P, 1000);
    },
  },
];
