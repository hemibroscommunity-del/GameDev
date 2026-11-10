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
  /* v2.3.4152: only the old side column (?oneband=0) has the dashboard page;
     the one band, the default, is the band at rest on every view */
  if (view.id === 'landscape' && await evalIn(P, () => document.documentElement.getAttribute('data-orient') === 'landscape')) return bus(P, 'open', 'dashboard');
  await evalIn(P, () => { if (window.__broDashPanelBus) window.__broDashPanelBus.toBar(); });
  return unfoldBand(P);
}
/* v2.3.4151: the Gear tab is the band at rest (sideways the dashboard
   column): openBag's way, with nothing picked and no filter, so each Gear
   state starts from the same tab */
async function gearReset(P) {
  await evalIn(P, () => {
    const g = window.__btGearTab;
    if (!g) return;
    g.bus.afterChange(); g.bus.clearFilter(); g.bus.setMenu(false); if (g.bus.setMore) g.bus.setMore(false);
  });
}
async function openGear(P, view) {
  await gearReset(P);
  const e = await openBag(P, view);
  if (e) return e;
  await wait(P, 700);
  if (!(await has(P, '[data-gear-tab]'))) return 'no Gear tab on screen';
  return null;
}
/* the test kit's three weapons (a spare greatsword in the bag beside the one in
   hand) and its shield, for the compare picture */
async function gearKit(P, wsPort, myId) {
  if (!wsPort || !myId) return;
  await H.devOp(wsPort, 'kit', myId, { what: 'weapons' }).catch(() => {});
  await wait(P, 1200);
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

/* v2.3.3768: a stand-in party of four for the party chip's pictures: `open`
   true opens its list as a tap does (the device's choice), false leaves it
   folded, null takes the party away and forgets the choice */
const partyStub = (P, open) => evalIn(P, (o) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !window._uiPanels) return 'no state';
  try { if (o) localStorage.setItem('bt_party_list', 'open'); else localStorage.removeItem('bt_party_list'); } catch (e) { /* private mode */ }
  window.dispatchEvent(new Event('bt-party-list'));
  if (o === null) { window._uiPanels.party(null); return null; }
  const z = S.currentZone;
  window._uiPanels.party({ id: 'party_demo', leader: S.myId, max: 4, members: [
    { id: S.myId, name: (S.rpg && S.rpg.name) || 'You', level: (S.rpg && S.rpg.level) || 1, hp: 90, maxHp: 100, zone: z },
    { id: 'bp_demo1', name: 'Rival Bro', level: 7, hp: 80, maxHp: 100, zone: z },
    { id: 'bp_demo2', name: 'Sandy', level: 5, hp: 45, maxHp: 100, zone: z },
    { id: 'bp_demo3', name: 'Moss', level: 4, hp: 15, maxHp: 100, zone: z },
  ] });
  return null;
}, open);

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
    about: 'Making a new character: the bro on the left, the Trait Picker on the right (a wide Bro type button over tabs for hair, hats, skin, eyes, eyewear, beard, clothes), the name field and ENTER BRO TOWN.',
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
     owner's "Go recommended"), so the opening shot no longer shows Hair.
     v2.3.3589: and 'species', a tab of its own (the owner: "Yes make species
     it's own button"); the creator opens on it, and Skin is the skin tones. */
  /* v2.3.3777: the 'species' tab reads "Bro type" (v2.3.3772, the owner:
     "Change species to bro type"); its id stays, as UI-DESIGN-NOTES and the
     review's packets key on it, and the tab is found by either word */
  ...['species', 'hair', 'hat', 'skin', 'eyes', 'eyewear', 'beard', 'shirt', 'pants', 'shoes'].map((t) => ({
    id: 'creator-tab-' + t, group: 'Before the game', pre: true, keep: true, title: 'Creator: ' + (t === 'species' ? 'Bro type' : t) + ' tab',
    about: 'The character creator with the "' + (t === 'species' ? 'Bro type' : t) + '" tab of the Trait Picker open.',
    run: async ({ P }) => {
      const r = await evalIn(P, (tt) => {
        const tabs = Array.from(document.querySelectorAll('button.bt-cc-tab'));
        const want = { species: /^(bro type|species)/i, hair: /^hair/i, hat: /hat/i, skin: /^skin/i, eyes: /^eyes/i, eyewear: /eyewear/i, beard: /beard/i, shirt: /shirt/i, pants: /pants/i, shoes: /shoes/i }[tt];
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
        const b = Array.from(document.querySelectorAll('button.bt-cc-tab')).find((x) => /^skin/i.test((x.innerText || '').trim()));
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

  /* v2.3.4167: the drawing editor with MORE THAN ONE ready-made design on a
     canvas -- the owner's two flames on the pants -- the second held, so the
     Select row shows its Copy button and the layer row its Delete.  Undone on
     the way out, so the rest of the review's bro wears plain trousers. */
  {
    id: 'creator-paint-designs', group: 'Before the game', pre: true, title: 'Creator: two designs on the pants',
    about: 'The Pants editor with two ready-made Flame designs placed on the trousers, the second still held: Keep shape, Copy, Place and Cancel in the Select row; the layer row (To back, Back, Forward, To front, Delete) says "Layer 2 of 2 \u00b7 design".',
    run: async ({ P }) => {
      await evalIn(P, () => {
        const b = Array.from(document.querySelectorAll('button.bt-cc-tab')).find((x) => /pants/i.test((x.innerText || '').trim()));
        if (b) b.click();
      });
      await wait(P, 800);
      const ok = await evalIn(P, () => {
        const b = document.querySelector('.bt-cc-ink button');
        if (!b) return false;
        b.click();
        return true;
      });
      if (!ok) return 'no drawing card on the Pants tab';
      await wait(P, 1600);
      await evalIn(P, () => {
        const b = Array.from(document.querySelectorAll('.bt-paint-tabs .bt-cc-tab')).find((x) => /draw/i.test(x.textContent || ''));
        if (b) b.click();
      });
      await wait(P, 1600);
      for (let n = 0; n < 2; n++) {
        const opened = await evalIn(P, () => {
          const b = Array.from(document.querySelectorAll('.bt-paint-note button')).find((x) => /designs/i.test(x.textContent || ''));
          if (!b) return false;
          b.click();
          return true;
        });
        if (!opened) return 'no Designs button in the Pants editor';
        await wait(P, 700);
        const picked = await evalIn(P, () => {
          const s = Array.from(document.querySelectorAll('.bt-modal-scrim'));
          const g = s[s.length - 1];
          const t = g && Array.from(g.querySelectorAll('button')).find((b) => b.querySelector('canvas') && (b.textContent || '').trim() === 'Flame');
          if (!t) return false;
          t.click();
          return true;
        });
        if (!picked) return 'no Flame in the design gallery';
        await wait(P, 1000);
      }
    },
    after: async ({ P }) => {
      /* both flames off again (one Undo each), then the editor's own Done */
      for (let n = 0; n < 2; n++) {
        await evalIn(P, () => {
          const u = Array.from(document.querySelectorAll('.bt-paint button')).find((x) => /^undo$/i.test((x.innerText || '').trim()));
          if (u) u.click();
        });
        await wait(P, 500);
      }
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
    about: 'The resting game screen in the town square: top bar (only the log-out door since v2.3.4183: the coins are in the Gear tab\'s header and the achievement points on the Bro card, a gain said as a "+12 gold" / "+5 AP" word under the bar; since v2.3.4113 nothing in its centre: the place and "safe" are on the minimap\'s name plate), the quest card just under the top bar (since v2.3.4163 no player frame: your HP and energy show over your bro\'s head and on the dashboard), the minimap with its name plate, the dashboard folded to its button row, and on a phone the controls appearing when touched (on a computer, the keyboard keys strip).',
    run: async ({ P }) => { await wait(P, 600); },
  },
  /* v2.3.3974: the top bar's place chip in its other two states (staged with
     window.__btPlaceHold: the chip and its window only, the worker never
     told), its window, and (until v2.3.4163) the player frame top-left.  v2.3.4113: the chip
     left the top bar; the minimap's name plate says it and takes the tap */
  {
    id: 'hud-pvp', group: 'The world (HUD)', title: 'No man\'s land on the minimap',
    about: 'In No man\'s land the minimap\'s name plate says "No man\'s land 1" in red under the land\'s name (the top bar\'s centre is clear since v2.3.4113: the owner, "Remove name of town and "safe" or other designation from top bar"). Nothing is said or played on the way in; the plate and the red line along the band show it, and a tap on the plate says who can attack you.',
    run: async ({ P }) => { await evalIn(P, () => { window.__btPlaceHold = { nml: 1, red: 0 }; }); await wait(P, 700); },
    after: async ({ P }) => { await evalIn(P, () => { window.__btPlaceHold = null; }).catch(() => {}); await wait(P, 400); },
  },
  {
    id: 'nml-popup', group: 'The world (HUD)', title: 'The minimap plate\'s window (No man\'s land)',
    about: 'A tap on the minimap\'s name plate in No man\'s land: who can attack you here and exactly what a player kill would take ("your 2,550 gold and the 12 things in your bag"), the Bank to keep things safe, then the rules.',
    run: async ({ P }) => {
      await evalIn(P, () => { window.__btPlaceHold = { nml: 1, red: 0 }; });
      await wait(P, 600);
      await evalIn(P, () => { const b = document.querySelector('[data-plate-tap]'); if (b) b.click(); });
      await wait(P, 700);
      if (!(await has(P, '[data-place-lead]'))) return 'the plate\'s window did not open';
    },
    after: async ({ P }) => { await evalIn(P, () => { if (window.__btInfoPopup) window.__btInfoPopup.close(); window.__btPlaceHold = null; }).catch(() => {}); await wait(P, 400); },
  },
  {
    id: 'hud-outlaw', group: 'The world (HUD)', title: 'Outlaw, on the minimap',
    about: 'While you carry the red skull (you attacked a player first) the minimap\'s name plate says "Outlaw · 18 min" in red; a tap on it says the minutes left and that a player kill now takes everything, worn gear too.',
    run: async ({ P }) => { await evalIn(P, () => { window.__btPlaceHold = { nml: 1, red: 18 }; }); await wait(P, 700); },
    after: async ({ P }) => { await evalIn(P, () => { window.__btPlaceHold = null; }).catch(() => {}); await wait(P, 400); },
  },
  {
    id: 'hud-band', group: 'The world (HUD)', title: 'BroTown, dashboard band open',
    about: 'The same screen with the dashboard band unfolded: the bag, what you have equipped and your combat skills at a glance (since v2.3.4152 the same band on every screen, sideways and on a computer too, its slots counted from the room it has).',
    run: async ({ P }) => unfoldBand(P),
    after: async ({ P }) => {
      /* folded again, as a new player has it: the screens of the world after
         this one show the world, and the dashboard's pages open the same way
         either way (its fold chip, as a player taps it) */
      await foldBand(P);
    },
  },
  {
    /* v2.3.3769: on a computer the dashboard's column folded to its strip --
       in the top bar's grey, an arrow at its middle (v2.3.3793: no OPEN) */
    id: 'hud-folded', group: 'The world (HUD)', title: 'BroTown, dashboard closed',
    /* v2.3.4152: the one band is the default -- every view folds the band to its button row */
    about: 'The same screen with the dashboard closed: on every screen (upright, sideways, a computer) the band folds to its button row and the world takes the room; OPEN, or I on a computer, brings it back. (The old side column, ?oneband=0, folds to a strip at the edge.)',
    run: async ({ P }) => { await foldBand(P); await wait(P, 400); },
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
      const x = Math.round(vp.width * 0.18), y = Math.round(vp.height * (view.id === 'landscape' ? 0.45 : 0.66));   /* v2.3.4152: sideways the world is above the band (a third of 390) */
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 41 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 26, y: y - 10, id: 41 }] });
      await wait(P, 700);
      return { release: async () => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }).catch(() => {}); } };
    },
  },
  /* v2.3.4130: the weapon pill with all three weapons held, the bow in hand
     (written on the page: the picture, not the worker's say) */
  {
    id: 'hud-weapons', group: 'The world (HUD)', title: 'The weapon pill: three weapons, the bow in hand',
    about: 'The weapon pill centred at the foot of the world (the owner: "Put it centered bottom of screen area"): sword, bow and staff in three wells, the one in hand ringed in glowing gold in colour, the others grey. A tap or click on a grey well takes that weapon; on a computer the wells wear 1, 2 and 3.',
    run: async ({ P }) => {
      await evalIn(P, () => {
        const R = window._gameState.current.rpg;
        R.rangedWeapon = R.rangedWeapon || { type: 'bow', tier: 'common', gearBase: 'ww_pine', name: 'Pine Bow', quality: 'normal' };
        R.staffWeapon = R.staffWeapon || { type: 'staff', tier: 'common', gearBase: 'ww_pine', name: 'Pine Staff', quality: 'normal' };
        R.activeSlot = 'ranged';
      });
      await wait(P, 900);
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
        /* a second tap (a phone) or click (a computer) on him -- v2.3.4105:
           never E or the right stick's tap, which never talk now */
        await H.talkToNpc(P, 'mayor_bro').catch(() => false);
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
  /* v2.3.3925: the big arrow the first time a weapon is handed over (ui/guideArrow.js) */
  {
    id: 'guide-arrow', group: 'Talking to characters', title: 'The big arrow, the first weapon',
    about: 'Just after the first quest hands over the sword and shield: a big gold arrow points at where to go to wear them (the fold handle, the Gear button or the weapon\'s tile), with a short line beside it.',
    settle: 600,
    run: async ({ P }) => {
      for (let i = 0; i < 40; i++) {
        if (await has(P, '[data-guide-arrow]')) return undefined;
        await wait(P, 250);
      }
      return 'no arrow showed (the sword and shield not in the bag, or already worn)';
    },
  },

  /* ═══ THE DASHBOARD ═══ */
  /* v2.3.3773: two tabs, Equipment and Points (Journey is More's page).
     v2.3.4172: the Character page is Bro, ONE card -- the owner's drawing:
     you, the weapon's combat stats, the doors (sheet/BroCard.jsx) -- with
     Points and Equipment as windows over it, Life Skills and Achievements as
     pages under it: each its own screen here, dash-bro-* */
  {
    id: 'dash-bro', group: 'Dashboard', title: 'Bro: your card',
    about: 'The Bro page, as the owner drew it: three panels, laid out from the page\'s own width (side by side from 600 px; on an upright phone you beside the doors, the stats under them; sideways stacked). You: your portrait in a gold frame, name, "Lv N" (no XP bar), your title as a gold ribbon ("No title"), your clan ("No clan"), your AP, and Achievements n / total and Lifetime Kills tiles. Over the combat stats, the three combat skills (Melee, Bow, Magic: the Gear tab\'s tiles, "Lv N" above each big picture), the one whose weapon the stats show gold-edged (starting on the one in your hand): thirteen rows, Damage to Move Speed. The doors, a chevron each: Achievements, Life Skills, Points (gold and glowing while points wait), Equipment, Homestead, Pet, Titles, Clan.',
    run: async ({ P }) => {
      await evalIn(P, () => { if (window.__btHeroSection) window.__btHeroSection.request('Card'); });
      const e = await bus(P, 'open', 'hero');
      if (e) return e;
      await wait(P, 900);
      if (!(await has(P, '[data-bro-page="Card"] [data-bro-card="v2"]'))) return 'the card is not up';
    },
  },
  {
    /* v2.3.4172: a combat-skill tile tapped (the owner: "Move the 3 primary
       combat skills out of the gear menu and put them into the bro menu") */
    id: 'dash-bro-bow', group: 'Dashboard', title: 'Bro: the Bow\'s combat stats',
    about: 'The Bro page with Bow\'s skill tile just tapped: the tile gold-edged and showing its XP bar ("N / M XP", for 4 s, then its picture again), and the thirteen combat stats as the bow would fight (its damage, swings a second, reach in tiles, the Bow lane\'s crit, special and elemental power; the shared five the same under every weapon), "No bow equipped" and dashes when there is none.',
    run: async ({ P }) => {
      await evalIn(P, () => { if (window.__btHeroSection) window.__btHeroSection.request('Card'); });
      const e = await bus(P, 'open', 'hero');
      if (e) return e;
      await wait(P, 900);
      const t = await tapSel(P, '[data-bro-skill="bow"]');
      if (t) return t;
      await wait(P, 400);
      if (!(await has(P, '[data-bro-panel="stats"][data-bro-weapon="bow"]'))) return 'the Bow was not picked';
      await evalIn(P, () => {
        const c = document.querySelector('[data-bro-card="v2"]');
        const st = c && c.querySelector('[data-bro-panel="stats"]');
        if (c && st && c.scrollHeight > c.clientHeight) c.scrollTop += st.getBoundingClientRect().top - c.getBoundingClientRect().top - 4;
      });
      await wait(P, 300);
    },
  },
  {
    id: 'dash-bro-equipment', group: 'Dashboard', title: 'Bro: Equipment (a window, reached by name)',
    about: 'The Equipment window over the Bro card: equipment slots, the figure, your stats as pills and families, under a title row with a close back to the card. Since the Gear tab the card\'s Equipment door opens Gear; this window is reached only by name (the roads that ask for it).',
    run: async ({ P }) => {
      await evalIn(P, () => { if (window.__btHeroSection) window.__btHeroSection.request('Overview'); });
      const e = await bus(P, 'open', 'hero');
      if (e) return e;
      await wait(P, 900);
      if (!(await has(P, '[data-bro-popup="Overview"]'))) return 'the Equipment window did not open';
    },
  },
  {
    id: 'dash-bro-points', group: 'Dashboard', title: 'Bro: Points (a window over the card)',
    about: 'The Points window, opened from the card\'s Points row: spending points on each weapon skill and on the character, under a title row with a close back to the card.',
    run: async ({ P }) => {
      await evalIn(P, () => { if (window.__btHeroSection) window.__btHeroSection.request('Card'); });
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
      if (!(await has(P, '[data-bro-popup="Build"]'))) return 'the Points window did not open';
    },
  },
  /* v2.3.4049: the Hemi Bro portrait's two screens (v2.3.3999) went with its
     default: it is off unless `?hemiface=1` (docs/specs/hemi-portrait.md) */
  /* v2.3.3944: the quest journal (dash/QuestsPanel.jsx): it opens on the
     quest you are on (a run has taken Into the Blue at quest-accepted) */
  dash('quests', 'Quests', 'The Quests page (v2.3.4390: a menu): your quests as a list of pills down the left (Active, Available, then Done with its count and Daily), each with its giver\'s pin; the open quest beside it: its title and status with Map and Track, what to do NOW with its count and bar, WHERE; then, a scroll below, WHO you talked to, GIVEN TO YOU, REWARD with +5 Achievement Points, NEXT.'),
  {
    id: 'dash-quest-detail', group: 'Dashboard', title: 'A quest in detail',
    about: 'One quest\'s own page, as the pinned quest card in the world opens it (v2.3.4390: the Quests page itself opens a quest beside its list): the six parts (NOW, WHERE, WHO with each step ticked, GIVEN TO YOU, REWARD, NEXT) and Track this quest.',
    /* v2.3.3944: a row of the list by its own mark (an Active row, else an
       Available one), scrolled into view under the page it opens on */
    run: async ({ P }) => {
      await bus(P, 'open', 'quests');
      await wait(P, 600);
      const sel = (await has(P, '[data-quest-row]')) ? '[data-quest-row]' : '[data-quest-offer-row]';
      /* v2.3.4390: a pill of the list opens its quest beside it; the quest's
         own page is the pinned card's road (questDetailBus, then the drill) */
      const qid = await evalIn(P, (s0) => { const el = document.querySelector(s0); return el ? (el.getAttribute('data-quest-row') || el.getAttribute('data-quest-offer-row')) : null; }, sel);
      if (!qid) return 'no quest in the list to open';
      const ok = await evalIn(P, (q) => { if (!window.__btQuestDetail) return false; window.__btQuestDetail.open(q); return true; }, qid);
      if (!ok) return 'no quest-detail probe';
      await wait(P, 500);
      if (!(await has(P, '[data-journal-page]')) || (await has(P, '[data-journal-focus]'))) return 'the quest\'s page did not open';
    },
  },
  /* v2.3.4172: Life Skills are a page under Bro (the card's Life Skills row;
     the bus puts 'skills' there, its back chip returning to the card) */
  Object.assign(dash('skills', 'Bro: Life Skills', 'The Life Skills page, under Bro (the card\'s Life Skills row opens it; back returns to the card): your life skills (mining, woodcutting, fishing, cooking, farming...) and their levels.'), { id: 'dash-bro-skills' }),
  {
    id: 'dash-bro-skill-detail', group: 'Dashboard', title: 'Bro: a life skill in detail',
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
  dash('more', 'More', 'The More page: eleven tiles (map, social, party, guild, pets, journey, settings, account, notifications with its unread count, feedback, about).'),
  /* v2.3.4389: the Leaderboards have a button of their own on the row
     ("Ranks"): the list of boards down the left (Ranks, Records, Skills), the
     board beside it, a face and a level on each row */
  dash('leaderboard', 'Leaderboards', 'The Leaderboards, from the Ranks button on the row: the list of boards down the left (Ranks: Level, Melee, Bow, Magic, Kills, AP; Records: Daily spin, Coin flip, Biggest fish; Skills: the ten life skills), the board beside it. Each row: the rank, the character\'s face, the name, the record ("Lv 1"). Your own row is lit.'),
  {
    id: 'leaderboard-spin', group: 'Dashboard', title: 'Leaderboards: Daily spin',
    about: 'Leaderboards, Records, Daily spin: Biggest wins / Biggest losses on the board\'s first line, then the ten biggest pots taken from the daily spin (or lost to double or nothing), one row a player: face, name, the level pill, how many doubles, the gold. A deleted character\'s record stays as a grey row with DELETED across its face.',
    run: async ({ P }) => {
      const e = await bus(P, 'open', 'leaderboard');
      if (e) return e;
      await wait(P, 500);
      const e2 = await tapSel(P, '[data-lb-cat="spin"]');
      if (e2) return 'no Daily spin board (' + e2 + ')';
      await wait(P, 900);
    },
  },
  /* v2.3.3736: a rare window whose script cannot come (src/ui/lazyPanel.js):
     a tab left open across a deploy is answered with the page itself.  The
     Settings page's script answered so here; its own state, next, opens it
     with the script back (a fresh try) */
  {
    id: 'lazy-cantopen', group: 'Dashboard: More', title: 'A window that could not open',
    about: '"Couldn\'t open this": a window whose code could not be loaded (a game left open across an update), with Reload and Close, over the game, which plays on.',
    run: async ({ P }) => {
      await P.page.route(/\/assets\/SettingsPanel-[^/]+\.js/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html></html>' }));
      const e = await bus(P, 'open', 'more');
      if (e) return e;
      await wait(P, 300);
      await bus(P, 'push', 'settings');
      const up = await P.page.waitForSelector('[data-lazy-cantopen]', { timeout: 10000 }).then(() => true).catch(() => false);
      if (!up) return 'no "Couldn\'t open this" card (was the Settings page\'s script already loaded?)';
    },
    after: async ({ P }) => {
      await P.page.unroute(/\/assets\/SettingsPanel-[^/]+\.js/).catch(() => {});
      await evalIn(P, () => { const b = document.querySelector('[data-lazy-cantopen] button[data-esc]'); if (b) b.click(); });
      await wait(P, 300);
    },
  },
  more('settings', 'Settings', 'Settings: sound, graphics, controls and the rest.'),
  more('pets', 'Pets', 'Your pets: the ones you caught, the one out with you, the journal of kinds.'),
  more('social', 'Social', 'Social: your friends list and messages.'),
  /* v2.3.3527: Journey's tile is Achievements while the server grants them
     (the review's own worker does); the Journey page stays the fallback.
     Two common ones are earned first by the owner's lever (/dev/achv: no
     points, a common one a chat line and no banner, so nothing covers the
     page) and one worn as the title, so the picture has earned rows, a title
     and the locked super-rares together -- a new character's page is 23
     locked rows */
  /* v2.3.4172: a page under Bro (moved from More; the card's Achievements
     row and AP open it, and the bus puts 'achievements' there) */
  Object.assign(more('achievements', 'Bro: Achievements', 'The Achievements page, under Bro (the card\'s Achievements row and its AP open it): all 33 (v2.3.4036: + the ten rare fish), which you have and when, each tier\'s points, the six super-rares shown before they are earned, and the one you wear as your title.'), {
    id: 'dash-bro-achievements', group: 'Dashboard',
    run: async ({ P, wsPort, myId }) => {
      for (const id of ['first_blood', 'combat_10']) await H.devOp(wsPort, 'achv', myId, { id }).catch(() => {});
      await wait(P, 600);
      const e = await bus(P, 'open', 'achievements');
      if (e) return e;
      await P.page.waitForSelector('[data-achv-panel]', { timeout: 6000 }).catch(() => {});
      const state = await evalIn(P, () => { const p = document.querySelector('[data-achv-panel]'); return p ? p.dataset.achvPanel : null; });
      if (state !== '1') return 'the Achievements page is ' + (state ? '"' + state + '"' : 'not there');
      await evalIn(P, () => { const b = document.querySelector('[data-achv-title-use="first_blood"]'); if (b) b.click(); });
      /* the worker's answer names it; the picture goes either way */
      await P.page.waitForSelector('[data-achv-title-current="first_blood"]', { timeout: 6000 }).catch(() => {});
    },
  }),
  /* v2.3.3773: Journey is its own page under More, the Character page's old records tab moved here */
  more('journey', 'Journey', 'Your journey: kills, deaths, lifetime gold and XP, duels won and the deepest zone (the Character page\'s old third tab).'),
  /* v2.3.4172: Account -- Log out / Switch character, then the Login Key */
  more('account', 'Account', 'Your account: Log out (or Switch character, with more than one bro on the device), then your Login Key: how to carry this character to another device.'),
  /* v2.3.4172: what the bell in the world's corner held, with a few lines in it */
  Object.assign(more('notifications', 'Notifications', 'Notifications: world chat and the game\'s news, newest first (the bell that was in the world\'s corner), with Show on screen.'), {
    run: async ({ P }) => {
      await evalIn(P, () => {
        const S = window._gameState && window._gameState.current;
        if (!S) return;
        S.chatLog = S.chatLog || [];
        const now = Date.now();
        [['Sandy', 'anyone up for the frost dungeon?'], ['Moss', 'selling pine logs at the market'], ['', 'Rival Bro reached level 10!'], ['Rival Bro', 'gg everyone']]
          .forEach(([name, text], i) => S.chatLog.push({ name, text, ts: now + i, color: name ? '#8FD3FF' : undefined }));
        try { window.__broChatLogBus && window.__broChatLogBus.bump(); } catch (e) { /* no bus */ }
      });
      const e = await bus(P, 'open', 'more');
      if (e) return e;
      await wait(P, 300);
      await bus(P, 'push', 'notifications');
    },
  }),
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
    /* v2.3.4151: a bag tap no longer opens the card (the Gear tab shows the
       item in its middle panel); the card is where Sell and Drop go on to.
       v2.3.4191: the Gear tab has no Sell any more (the owner: "Just remove
       the 'sell' option for now"), so the card's sell sheet is opened the
       way the Gear tab's Drop opens its own sheet: itemDetailBus with a flow */
    id: 'item-card', group: 'Dashboard', title: 'An item card',
    about: 'The item card on its sell sheet: the item\'s picture and name over the Auction House\'s price sheet (how many, your price, Put it up / Back). The Gear tab offers no Sell (v2.3.4191); the card keeps its own.',
    run: async ({ P, view }) => {
      const e0 = await openGear(P, view);
      if (e0) return e0;
      const ok = await evalIn(P, () => {
        const S = window._gameState && window._gameState.current;
        const inv = (S && S.rpg && S.rpg.inventory) || {};
        const key = Object.keys(inv).find((k) => (inv[k] || 0) > 0);
        if (!key || !window._itemDetailBus) return false;
        window._itemDetailBus.open({ kind: 'inventory', key, count: inv[key], flow: 'sell' });
        return true;
      });
      if (!ok) return 'no bag item to open the card on';
      await wait(P, 600);
      if (!(await has(P, '[data-item-card]'))) return 'the item card did not open';
    },
    after: async ({ P }) => { await evalIn(P, () => { if (window._itemDetailBus) window._itemDetailBus.close(); }); await gearReset(P); },
    after: async ({ P }) => { await gearReset(P); },
  },
  /* ═══ v2.3.4151: THE GEAR TAB (src/ui/mobile/dash/GearTab.jsx) ═══ */
  {
    id: 'gear-tab', group: 'Dashboard', title: 'The Gear tab',
    about: 'The resting dashboard as the owner\'s second mockup and notes (v2.3.4151, A4 v2.3.4191): the bag ("All Items" with a funnel and a chevron, the coins beside it -- the coin picture with the amount as a count badge, as on a bag slot -- three square slots a row and three rows in view, the rest by scrolling) | ONE card, no tabs, which never scrolls: "<name> Lv N" on top, your bro full-body in the middle wearing what is equipped (the Character page\'s own figure, facing southwest), the HP, MP and EN bars below (stamina is the game\'s energy: one bar) -- no skill tiles (they are on the Bro page) and no headshot | "Equipped" over Sword, Bow, Staff / Chest, Legs, Cape / Shield, Amulet, Gem, its cells the bag\'s squares\' size (the weapon in hand gold). In the sideways one band the three sit in one short row (the figure at the card\'s left, the name and bars beside it); a computer switches weapons with its keys 1 2 3 (no weapon bar in the tab).',
    run: async ({ P, view, wsPort, myId }) => {
      await gearKit(P, wsPort, myId);
      const e = await openGear(P, view);
      if (e) return e;
    },
  },
  {
    id: 'gear-slot-selected', group: 'Dashboard', title: 'Gear tab: a slot tapped',
    about: 'The Sword slot tapped: its bright blue ring (3 px, a dark gap and a glow, unlike a rare piece\'s thin edge), the bag filtered to swords (the pill reads "Swords" with an × beside it that clears it), and the card, wearing the same blue, showing the sword: its framed picture beside its name in its grade\'s colour, the grade\'s stars under it (one white for normal, two blue rare, three orange elite, four gold godly), "Hardness N/5" as a number line of five marks, its numbers as four large pills two to a row (each its picture: DMG, DPS, SPD, RNG), and one gold button, Unequip, at the card\'s foot.',
    run: async ({ P, view }) => {
      const e = await openGear(P, view);
      if (e) return e;
      return tapSel(P, '[data-gear-cell="sword"]');
    },
    after: async ({ P }) => { await gearReset(P); },
  },
  {
    id: 'gear-compare', group: 'Dashboard', title: 'Gear tab: a bag weapon compared',
    about: 'With the bag filtered to swords, a spare sword in the bag tapped: its blue ring, and the card (wearing the same blue) showing it -- its framed picture, its name in its grade\'s colour, its stars and "Hardness N/5" (no "Copper · Greatsword" subtitle), then its numbers as large pills two to a row, each with the change against the sword in its slot inside it (a green ▲ +N, a red ▼ -N, or "--" for the same), ONE gold button at its foot (Equip) with a "⋯" beside it for the rest (Drop, Pin, Inspect where they apply); the name always whole (smaller rather than cut) -- no Sell in the Gear tab. Tapping it again, or the bag\'s empty space, brings the overview back.',
    run: async ({ P, view }) => {
      const e = await openGear(P, view);
      if (e) return e;
      const e1 = await tapSel(P, '[data-gear-cell="sword"]');
      if (e1) return e1;
      await wait(P, 500);
      return tapSel(P, '[data-gear-bag] [data-bag-key^="stashWeapon-"]');
    },
    after: async ({ P }) => { await gearReset(P); },
  },
  /* v2.3.4191: the item card's "⋯" and a material's card */
  {
    id: 'gear-more', group: 'Dashboard', title: 'Gear tab: the card\'s "⋯" open',
    about: 'A material in the bag picked, then the card\'s "⋯" (at its foot) tapped: a list over the card, never beside it, of what the piece can do besides its gold button -- Pin, Drop, Inspect where it has them, never Sell -- with a ✕ (Esc) that shuts it and keeps the pick.  A piece you can wear has no "⋯" (v2.3.4191, the owner): its gold Equip alone.',
    run: async ({ P, view }) => {
      const e = await openGear(P, view);
      if (e) return e;
      const e1 = await tapSel(P, '[data-gear-bag] [data-bag-key^="i-"]');
      if (e1) return e1;
      await wait(P, 500);
      return tapSel(P, '[data-gear-pane="bro"] [data-gear-act="more"]');
    },
    after: async ({ P }) => { await gearReset(P); },
  },
  {
    id: 'gear-material', group: 'Dashboard', title: 'Gear tab: a material picked',
    about: 'A stack in the bag (an ore, a fish, a log) picked: the card shows its framed picture, its name, one white star, "Qty N", and at most two lines of what it is for ("Smelt 1 into a Copper Bar at the Blacksmith"); its main action gold at the foot where it has one (Light fire, Eat, Drink), and Drop and Pin behind "⋯".',
    run: async ({ P, view }) => {
      const e = await openGear(P, view);
      if (e) return e;
      return tapSel(P, '[data-gear-bag] [data-bag-key^="i-"]');
    },
    after: async ({ P }) => { await gearReset(P); },
  },
  {
    id: 'gear-filter-open', group: 'Dashboard', title: 'Gear tab: the filter menu',
    about: 'The filter pill tapped: a menu drops down over the bag panel only (the other two panels stay put), its rows in groups (Weapons: Swords, Bows, Staffs; Armour: Chest, Legs, Capes, Shields, Amulets; Gems & shards, Ore & bars, Wood, Crops & seeds, Fish, Food & drinks, Potions, Quest items, Other), each with its count, a group you hold nothing of greyed; its ✕ (Esc) closes it.',
    run: async ({ P, view }) => {
      const e = await openGear(P, view);
      if (e) return e;
      return tapSel(P, '[data-gear-filter]');
    },
    after: async ({ P }) => { await gearReset(P); },
  },
  {
    id: 'gear-filter-empty', group: 'Dashboard', title: 'Gear tab: a filter with nothing in it',
    about: 'Potions picked from the menu with none in the bag: never a mysterious empty bag -- "No potions in your bag" and a Show all button; the pill reads "Filter: Potions" with its ×.',
    run: async ({ P, view }) => {
      const e = await openGear(P, view);
      if (e) return e;
      await evalIn(P, () => { const g = window.__btGearTab; if (g) g.bus.pickFilter('potion'); });
    },
    after: async ({ P }) => { await gearReset(P); },
  },
  /* v2.3.4036: the rare fish (server fishlog.js): two albino trout put in the
     bag as catches by the owner's lever (/dev/fish give), one opened and
     Inspected -- the weigh-in card over the world -- then Ranks' Biggest fish
     tab, on the trout, with that weigh-in on it */
  {
    id: 'fish-weigh', group: 'Dashboard', title: 'A fish weighed (the weigh-in card)',
    about: 'Inspect on a fish in the bag: the server weighs one catch of it, and this card says the weight, your best of that kind, a place on its board and how many more you have to weigh, with Records for the boards.',
    run: async ({ P, view, wsPort, myId }) => {
      const g = await H.devOp(wsPort, 'fish', myId, { give: 'fish_trout_albino', n: 2 }).catch(() => null);
      if (!g || !g.ok) return 'the /dev/fish lever said ' + JSON.stringify(g);
      const e0 = await openBag(P, view);
      if (e0) return e0;
      await wait(P, 800);
      /* v2.3.4151: the Gear tab's bag shows nine and scrolls the rest: bring
         the fish into its view first, as a thumb would */
      await evalIn(P, () => { const t = document.querySelector('[data-bag-key="i-fish_trout_albino"]'); if (t) t.scrollIntoView({ block: 'nearest' }); });
      await wait(P, 300);
      const e = await tapSel(P, '[data-bag-key="i-fish_trout_albino"]');
      if (e) return e;
      await wait(P, 600);
      const e2 = await tapSel(P, '[data-fish-inspect]');
      if (e2) return e2;
      await P.page.waitForSelector('[data-fish-weigh="weighed"]', { timeout: 8000 }).catch(() => {});
      if (!(await has(P, '[data-fish-weigh="weighed"]'))) return 'no weigh-in card';
    },
    after: async ({ P }) => {
      await evalIn(P, () => { const b = document.querySelector('[data-fish-weigh-close]'); if (b) b.click(); });
      await wait(P, 200);
    },
  },
  {
    id: 'fish-board', group: 'Dashboard', title: 'Leaderboards: Biggest fish',
    about: 'Leaderboards, Records, Biggest fish: the ten heaviest of each kind of fish weighed, one row a player, the face, the name and level, and the kilos (an albino or a large one says so).',
    run: async ({ P }) => {
      /* v2.3.4389: the Leaderboards' own button on the row, no drill under More */
      const e = await bus(P, 'open', 'leaderboard');
      if (e) return e;
      await wait(P, 500);
      const e2 = await tapSel(P, '[data-lb-cat="fish"]');
      if (e2) return 'no Biggest fish chip (' + e2 + ')';
      await wait(P, 500);
      await tapSel(P, '[data-fish-board-sp="trout"]');
      await P.page.waitForSelector('[data-fish-board-row]', { timeout: 6000 }).catch(() => {});
    },
  },

  /* v2.3.4012: a mystery piece waiting in the bag (game/revealBag.js): its
     "?" tile and its card's Reveal button -- the piece put in the bag by the
     test lever through the pickup's own credit (/dev/revealbag) */
  {
    id: 'bag-unrevealed', group: 'Dashboard', title: 'A mystery piece in the bag',
    about: 'A rare-or-better drop waiting in the bag as a "?": its silhouette on the rare-blue edge, and its card with Reveal and Equip.',
    run: async ({ P, view, wsPort, myId }) => {
      if (!wsPort || !myId) return 'no test lever here';
      await H.devOp(wsPort, 'revealbag', myId, { grade: 'elite', give: 'armor' }).catch(() => null);
      await wait(P, 800);
      const e0 = await openBag(P, view);
      if (e0) return e0;
      await wait(P, 700);
      const e = await tapSel(P, '[data-unrevealed]');
      if (e) return e;
      await wait(P, 600);
      if (!(await has(P, '[data-reveal]'))) return 'the card shows no Reveal button';
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
  {
    id: 'login-spin', group: 'Buildings (BroTown)', title: 'Free daily spin (login wheel)',
    about: 'The login wheel: the green FREE DAILY SPIN plate, the wheel with its gold amounts (100 about half of it, a thin 10K), the fixed pointer at the top and one big SPIN button.  It opens by itself once the loading screen and a new character\'s first steps are over, once a day per account; this picture opens it by hand.',
    settle: 1500,
    run: async ({ P }) => {
      const ok = await evalIn(P, () => { if (!window.__btLoginSpinBus) return false; window.__btLoginSpinBus.open(); return true; });
      if (!ok) return 'no login-spin probe';
    },
  },
  /* v2.3.3460: no 'daily-season' -- the daily quests and the season were put
     away in v2.3.3400, the window has no Season tab, and the picture was the
     Today page again (found by the design notes' research) */
  building('farm', 'Feed & Seed', 'The Feed & Seed: visit your farm, buy seeds, the order board.'),
  building('farmhome', 'Land Office', 'The Land Office: the trip to your own farm.'),
  /* v2.3.3785: the Bank is a vault (server/src/bank.js) -- seeded with a few
     things in the bag, so the picture shows tiles to put in, not "Your bag is
     empty" (moving them needs the door; the window shows them anywhere) */
  (() => {
    const b = building('bank', 'Bank', 'The Bank\'s vault: your gold and the vault\'s, put in and taken out by 10, 100, All or a typed amount; the vault (48 kinds) and your bag, a tap moving an item, a stack asking how many.');
    const open = b.run;
    b.run = async (ctx) => {
      if (ctx.wsPort && ctx.myId) {
        await H.grant(ctx.wsPort, ctx.myId, 'item', { invKey: 'wood_oak', count: 12 }).catch(() => {});
        await H.grant(ctx.wsPort, ctx.myId, 'item', { invKey: 'fish_minnow', count: 3 }).catch(() => {});
        await wait(ctx.P, 800);
      }
      return open(ctx);
    };
    return b;
  })(),
  building('exchange', 'General Store (market)', 'The General Store\'s Marketplace: an order book where players post buy and sell orders for kinds of gear, with a way to the Auction House at its top.'),
  building('auctionhouse', 'Auction House', 'The Auction House: its clerk behind the counter and its one button, Market, which opens the players\' listings and bids.'),
  building('party', 'Saloon', 'The Saloon: your party and finding one.'),
  building('post', 'Post Office', 'The Post Office: your mail and friends\' messages.'),
  building('sheriff', "Sheriff's Office", "The Sheriff's Office: the player list (duels start from a player's card) and the arena sign-up."),
  building('guildhall', 'Guild Hall', 'The Guild Hall: a row saying clans are parties now (made in the Saloon), and the skill guilds.'),
  /* v2.3.3899: the board opens from the square's noticeboard now, not the Town Hall's door (game/wheelNoticeboard.js); the window and its ids are the same */
  building('townhall', 'Town Board', 'The town board (v2.3.3766; on the square\'s noticeboard since v2.3.3899, the Town Hall\'s door opens nothing): the board of everything to do in the world, under eight headings (v2.3.3801: the owner\'s review\'s), a line under every tile, the leaderboard, the world map, the Codex and Journey at its foot.'),
  /* v2.3.3766: a page of the board -- the arena's, with its two pins */
  building('townhall', 'Town Board: a page', 'A page of the town board (v2.3.3766): what the arena is, where it is, and the Red pin and Blue pin buttons.', {
    id: 'building-townhall-page',
    run: async ({ P }) => {
      const ok = await evalIn(P, (p) => { if (!window.__btBuildingWindow) return false; window.__btBuildingWindow.open(p); return true; }, 'townhall');
      if (!ok) return 'no building-window probe';
      for (let i = 0; i < 30; i++) {
        const hit = await evalIn(P, () => { const t = document.querySelector('[data-board-tile="arena"]'); if (t) { t.click(); return true; } return false; });
        if (hit) break;
        await wait(P, 200);
      }
    },
  }),
  /* v2.3.3801: a page with no one place -- Town Quests', with its one action, "Open Quests" */
  building('townhall', 'Town Board: a page with one action', 'A page of the town board with no one place (v2.3.3801): Town Quests -- what they are, look for the gold "!", and one button, Open Quests, in place of the pins.', {
    id: 'building-townhall-action',
    run: async ({ P }) => {
      const ok = await evalIn(P, (p) => { if (!window.__btBuildingWindow) return false; window.__btBuildingWindow.open(p); return true; }, 'townhall');
      if (!ok) return 'no building-window probe';
      for (let i = 0; i < 30; i++) {
        const hit = await evalIn(P, () => { const t = document.querySelector('[data-board-tile="townquests"]'); if (t) { t.click(); return true; } return false; });
        if (hit) break;
        await wait(P, 200);
      }
    },
  }),
  building('hotel', 'Hotel', 'The Hotel (v2.3.3539): a free rest -- full health, stamina and mana, and Well Rested, +10% combat XP for 30 minutes -- paid by the server.'),
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
    about: 'The world map (a tap on the minimap): the Wheel, its eight lands, where you are, the quest\'s road, zoom buttons and the compass, and the key bottom left -- its marks little pictures of what they mark (a house, a tent, two peaks, an arch, a flag; zoomed in a horned head for a monster, a fish, a tree, a rock with metal, a person), drawn the same on the map.',
    settle: 1600,
    run: async ({ P }) => {
      const ok = await evalIn(P, () => { if (!window.__btWorldMapOpen) return false; window.__btWorldMapOpen(true); return true; });
      if (!ok) return 'no world-map probe';
    },
    after: async ({ P }) => { await evalIn(P, () => { if (window.__btWorldMapOpen) window.__btWorldMapOpen(false); }); },
  },
  {
    id: 'world-map-pin', group: 'Maps and chat', title: 'World map, your pins',
    about: 'The world map with both your pins up (a tap on open ground drops one, blue then red; a tap on one lifts it): the blue and the red pin on the map, a dashed line from you to each in its colour, "Remove blue" and "Remove red" at the top, "your pins" in the key; the minimap shows them too, with a solid line to each (v2.3.3879, v2.3.4045).',
    settle: 1600,
    run: async ({ P }) => {
      const ok = await evalIn(P, () => {
        const S = window._gameState && window._gameState.current;
        if (!window.__btMapPin || !window.__btWorldMapOpen || !S || !S.player) return false;
        window.__btMapPin.set(S.player.x - 260, S.player.y - 180, 'blue');
        window.__btMapPin.set(S.player.x + 300, S.player.y + 120, 'red');
        window.__btWorldMapOpen(true);
        return true;
      });
      if (!ok) return 'no map-pin probe';
    },
    after: async ({ P }) => { await evalIn(P, () => { if (window.__btWorldMapOpen) window.__btWorldMapOpen(false); if (window.__btMapPin) window.__btMapPin.clear(); }); },
  },
  /* v2.3.4045: the pins' three cards (ui/PinCards.jsx) */
  {
    id: 'map-pin-replace', group: 'Maps and chat', title: 'World map, replace which pin?',
    about: 'Both pins are up and you tap open ground on the world map: a small card under the top chips asks "Replace which pin?" with Blue, Red and Cancel (and a ✕), and a white ghost pin stands where you tapped (v2.3.4045).',
    settle: 1600,
    run: async ({ P }) => {
      const ok = await evalIn(P, () => {
        const S = window._gameState && window._gameState.current;
        if (!window.__btMapPin || !window.__btWorldMapOpen || !S || !S.player) return false;
        window.__btMapPin.set(S.player.x - 260, S.player.y - 180, 'blue');
        window.__btMapPin.set(S.player.x + 300, S.player.y + 120, 'red');
        window.__btWorldMapOpen(true);
        return true;
      });
      if (!ok) return 'no map-pin probe';
      await P.page.waitForTimeout(1200);
      /* a tap on open ground, a little below the middle (clear of the pins and the key) */
      const tapped = await evalIn(P, () => {
        const cv = document.querySelector('[data-world-map-canvas]');
        if (!cv) return false;
        const r = cv.getBoundingClientRect(), x = r.left + r.width * 0.62, y = r.top + r.height * 0.42;
        const ev = (t) => cv.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerId: 9, isPrimary: true, button: 0, clientX: x, clientY: y }));
        ev('pointerdown'); ev('pointerup');
        return true;
      });
      if (!tapped) return 'no world-map canvas';
    },
    after: async ({ P }) => { await evalIn(P, () => { if (window.__btWorldMapOpen) window.__btWorldMapOpen(false); if (window.__btMapPin) window.__btMapPin.clear(); }); },
  },
  {
    id: 'map-pin-arrive', group: 'Maps and chat', title: 'You reached a pin',
    about: 'Walking up to one of your pins (within about 160 game px), out of a fight and with no other card up: a small card beside or under the minimap, "You reached the blue pin. Remove it?" with Remove and Keep (and a ✕, which keeps it). Keep leaves the pin up and it never asks again (v2.3.4045).',
    settle: 900,
    run: async ({ P }) => {
      const ok = await evalIn(P, () => {
        const S = window._gameState && window._gameState.current;
        if (!window.__btMapPin || !S || !S.player) return false;
        window.__btMapPin.set(S.player.x + 90, S.player.y - 40, 'blue');
        return window.__btMapPin.open('arrive', 'blue');
      });
      if (!ok) return 'no map-pin probe';
    },
    after: async ({ P }) => { await evalIn(P, () => { if (window.__btMapPin) window.__btMapPin.clear(); }); },
  },
  {
    id: 'map-pin-remove', group: 'Maps and chat', title: 'Remove a pin (from the minimap)',
    about: 'A tap on one of your pins on the minimap: instead of opening the world map, a small card beside or under the minimap asks "Remove the red pin?" with Remove and Cancel (and a ✕). A tap anywhere else on the minimap still opens the map (v2.3.4045).',
    settle: 900,
    run: async ({ P }) => {
      const ok = await evalIn(P, () => {
        const S = window._gameState && window._gameState.current;
        if (!window.__btMapPin || !S || !S.player) return false;
        window.__btMapPin.set(S.player.x + 600, S.player.y - 300, 'red');
        return window.__btMapPin.open('remove', 'red');
      });
      if (!ok) return 'no map-pin probe';
    },
    after: async ({ P }) => { await evalIn(P, () => { if (window.__btMapPin) window.__btMapPin.clear(); }); },
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
  /* v2.3.3768: the party strip folds to a chip (PartyHUD.jsx, game/partyChip.js):
     a party of four drawn from a stand-in roster (you, the leader, and three
     friends, one of them low), folded as it is by default and opened as a tap
     opens it.  View state only: the worker knows no such party. */
  {
    id: 'party-hud', group: 'Other players', title: 'In a party: the chip',
    about: 'In a party of four (shown with stand-in friends): the party chip at the top left -- the party mark, 4/4 and a pip a friend, coloured as their health bar (one friend low, in red).  A tap opens the list.',
    run: async ({ P }) => { await partyStub(P, false); },
    after: async ({ P }) => { await partyStub(P, null); },
  },
  {
    id: 'party-hud-open', group: 'Other players', title: 'In a party: the list opened',
    about: 'The same party with its list opened by a tap: each member\'s name, level and health bar, the leader\'s crown, a kick (two taps) on each friend for the leader, and ✖ to leave (two taps).  A tap on its head folds it back to the chip.',
    run: async ({ P }) => { await partyStub(P, true); },
    after: async ({ P }) => { await partyStub(P, null); },
  },
  {
    id: 'inspect-self', group: 'Other players', title: 'An Inspect card (your own)',
    about: 'The Inspect card, a player\'s profile (level, achievement points, the title they chose and their rarest achievement, the three combat levels, what they wear, kills), here your own -- the one way to show it without a second player.  For another player it opens from the portrait on their card, with Invite to Party, Trade and Duel at its foot; nothing in the game opens your own yet (where its button goes is the owner\'s call).',
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
  /* v2.3.3973: the lock you chose wears a thin pulsing reticle (the owner:
     "Thin the reticle when you lock on target so it's just a thin larger line
     that grows and shrinks while on target"), at Frost Ridge's first snowmen */
  {
    id: 'lock-reticle', group: 'Fighting', title: 'A monster you locked on',
    about: 'A snowman you clicked or tapped to lock on: four thin orange corner lines round it, slowly growing and shrinking, with the orange chip over its head.  With a sword in hand and no lock, the same lines, softer, come up on a monster as soon as it is inside your swing\'s reach.',
    settle: 1500,
    run: async ({ P, wsPort, myId }) => {
      await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
      const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
      const at = WHEEL_SPAWNS.frost && WHEEL_SPAWNS.frost.points[0];
      if (!at) return 'no Frost Ridge spawn';
      await H.hopTo(P, at[0] + 150, at[1] + 220, { tries: 260 });
      await wait(P, 2500);
      const ok = await evalIn(P, () => {
        const S = window._gameState.current, p = S.player;
        const m = (S.monsters || []).filter((q) => q && q.alive !== false && (q.curHp == null || q.curHp > 0))
          .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
        if (!m) return false;
        S.lockedTarget = { type: 'monster', id: m.id, ref: m, src: 'tap' };   /* as a click or a tap locks it */
        return true;
      });
      if (!ok) return 'no monster near';
    },
    after: async ({ P }) => { await evalIn(P, () => { const S = window._gameState.current; if (S) S.lockedTarget = null; }).catch(() => {}); await wait(P, 300); },
  },
  {
    /* v2.3.3817: the death card, staged (a real death's is mp-deathcard's),
       then let go */
    id: 'death-card', group: 'Fighting', title: 'You died (the death card)',
    about: 'The card over the scene for the five seconds between a death and coming back: "You died", what killed you, and "Back in BroTown in N" counting down. It never takes a tap or a click. Once you are back, one line in the chat says what happened.',
    run: async ({ P }) => {
      await evalIn(P, () => {
        const S = window._gameState.current;
        /* restaged every 4 s, so the picture reads as a real death's does
           ("in 5", "in 4"), whenever the shot is taken */
        const stage = () => { const S = window._gameState.current; if (S) S._deathCard = { at: Date.now(), ms: 5000, killer: 'Blue Slime', pvp: false, keptBag: false, lost: null }; };
        stage();
        clearInterval(window.__uiDeathStage);
        window.__uiDeathStage = setInterval(stage, 4000);
      });
      await wait(P, 700);
    },
    after: async ({ P }) => { await evalIn(P, () => { clearInterval(window.__uiDeathStage); const S = window._gameState.current; if (S) S._deathCard = null; }).catch(() => {}); await wait(P, 400); },
  },
];
