import React, { useState, useEffect } from 'react';
import { NotificationMute } from './mobile/NotificationMute.jsx'; /* v2.3.2145 */
import { BroTown } from './BroTown.jsx';
import { DebugOverlay } from '../debug/DebugOverlay.jsx';
import { wheelBus } from './mobile/wheelBus.js';
import { BottomDashboard } from './mobile/BottomDashboard.jsx';
import { ChatBubble } from './mobile/ChatBubble.jsx';
import { WorldChatFeed } from './mobile/WorldChatFeed.jsx'; /* v2.3.2037 */
import { ShopkeeperPanel } from './panels/ShopkeeperPanel.jsx';   /* v2.3.2050 */
import { XpFlyOverlay } from './XpFlyOverlay.jsx';
import { InventorySurface } from './mobile/InventorySurface.jsx';
import { inventoryBus } from './mobile/inventoryBus.js';
/* v2.3.1750: only the `inv mock` DEBUG command still seeds these — the
   automatic first-load seed is gone (see the note at its old site below). */
import { generateMockInventory, generateMockEquipped } from './mobile/mockItems.js';
import { InspectCard } from './mobile/InspectCard.jsx';
import { inspectCardBus } from './mobile/inspectCardBus.js';
import { generateMockProfile } from './mobile/mockProfile.js';
import { setEquip, getEquip, GEAR_CATALOG, GEAR_SLOTS, gearInventoryItems } from '@/rendering/gearCatalog.js';
import { BlockRing } from './mobile/BlockRing.jsx';
import { ZoneHeader } from './mobile/ZoneHeader.jsx'; /* v2.3.1333 */
/* v2.3.1895: SpecialChargePie retired — the special-charge readout moved
   back under the character as the MP spend bar (entityRenderer
   _drawResourceBar).  The component file is left in place; nothing renders
   it, so deleting it is a separate tidy-up rather than part of this change. */
import { ElementBurstButton } from './mobile/ElementBurstButton.jsx'; /* v2.3.1734 */
import { blockRingBus } from './mobile/blockRingBus.js';
/* v2.3.1287: MoreOverlay deleted (unmounted since the BottomDashboard
   landed); the legacy wheel's "more" activation routes to the nav
   sheet's More destination instead. */
import { dashboardPanelBus } from './mobile/dashboardPanelBus.js';
import { ControlsTutorial } from './mobile/ControlsTutorial.jsx';
/* v2.3.2131: the "what is this?" explainer -- one overlay behind both the
   combat-card XP popup and the hero sheet's tappable stat labels. */
import { InfoPopup } from './mobile/InfoPopup.jsx';
/* v2.3.820: MasteryNotification removed from the render (owner request) --
   import dropped to avoid an unused symbol. */
import { advanceMastery, earnCertification } from '../game/mastery.js';
import { debugBus } from '../debug/debugBus.js';
import { BuildBadge } from './BuildBadge.jsx';
/* v2.3.1207: derived-stat helpers for buildSelfProfile's tier2 tiles —
   the same call pairs the dashboard readouts use. */
import { BT_AUDIO, calcCritChance, calcCritMult, getWeaponCritStat, getWeaponCritDmgStat, passiveDodgeChance, getEvasionPts } from '../data/gameSystems.js';

const NFT_CSV_URL = 'https://raw.githubusercontent.com/hemibroscommunity-del/Hemi-Bros-catalogue/main/Hemi%20Bro%20spreadsheet-CleanDataWithImages.csv';

// Mapping from live game state into the inspect-card profile shape.
// v2.3.1207: no more mock fallbacks for game DATA.  This read
// `s.rpgState` — a key that never existed on the game state (it is
// S.rpg, see BroTown's stateRef) — so every `?? fallback` below fired
// and the SELF card showed generateMockProfile's RANDOM stats, random
// tier2 tiles, a fake "Iron Greatsword", and a fake quest line as the
// player's own.  Now: real rpg blob, real derived stats via the shared
// helpers (same call pairs as the dashboard readouts), and absent
// fields render empty instead of mock ("never render mock numbers").
const buildSelfProfile = (s) => {
  const p = s.player || {};
  const rpg = s.rpg || s.rpgState || {};
  const ls = rpg.lifeSkills || {};
  const lvl = (k) => (ls[k]?.level) ?? 0;
  return {
    name: p.name || 'You',
    level: rpg.level || p.level || 1,
    archetype: p.archetype || null, /* IdentityBand shows 'Wanderer' */
    pole: p.pole || rpg.pole || null, /* IdentityBand shows 'unaligned' */
    clanTag: s._clanData?.tag || null,
    questLine: s.activeQuest?.text || null,
    recentJourneyLine: s.journey?.recent || null,
    logo: p.logo || null,
    stats: {
      power:     rpg.power     ?? 0,
      vitality:  rpg.vitality  ?? 0,
      endurance: rpg.endurance ?? 0,
      agility:   rpg.agility   ?? 0,
      mind:      rpg.mind      ?? 0,
    },
    /* Real derived stats for the expanded combat tiles (InspectCard
       tier2Label): crit via the ACTIVE weapon's channel getters — the
       dashboard/DPS-helper call pair — pools from the recalc/echo
       product, dodge via the shared-cap helper. */
    tier2: {
      crit: {
        chance: calcCritChance(rpg.power || 0, getWeaponCritStat(rpg)),
        mult:   calcCritMult(rpg.power || 0, getWeaponCritDmgStat(rpg)),
      },
      maxHp:      rpg.maxHp || 0,
      maxStamina: rpg.maxStamina || 0,
      dodge:      passiveDodgeChance(rpg.agility || 0, getEvasionPts(rpg)),
      maxMana:    rpg.maxMana || 0,
    },
    vows: rpg.vows || [],
    weapon: rpg.weapon || null,
    armor:  rpg.armor  || null,
    pet:    rpg.pet    || null,
    skills: {
      cooking: lvl('cooking'), fishing: lvl('fishing'), farming: lvl('farming'),
      blacksmithing: lvl('blacksmithing'), gemCutting: lvl('gemCutting'),
      alchemy: lvl('alchemy'), woodworking: lvl('woodworking'),
      tailoring: lvl('tailoring'), taming: lvl('taming'), scribing: lvl('scribing'),
    },
    history: {
      displayedTitle: p.displayedTitle || null,
      titles: p.titles || [],
      capstones: p.capstones || [],
      zonesCleared: p.zonesCleared || 0,
      apexKills: p.apexKills || 0,
      ascendant: !!p.ascendant,
    },
    journey: s.journey || { count: 0, folklore: null, entries: [] },
  };
};

export const GameApp = () => {
  const [nfts, setNfts] = useState([]);

  // Unlock the audio context on the first user gesture. Mobile/Safari refuse
  // to play any sound until an AudioContext is created (or resumed) inside a
  // user-initiated handler. Once unlocked we also kick off SFX preload.
  useEffect(() => {
    // Sync persisted mute preference. SettingsPanel writes
    // 'brotown_audio_off' to localStorage but only pushes the value
    // into BT_AUDIO.muted on toggle, so without this a returning
    // player who muted last session would hear sound this session
    // while the UI toggle still shows OFF.
    try {
      if (localStorage.getItem('brotown_audio_off') === '1') {
        BT_AUDIO.muted = true;
      }
    } catch (e) {}

    let done = false;
    // Reusable silent WAV (44-byte header, 0 samples). Playing this as
    // an HTMLAudio element on the first gesture is the standard trick to
    // switch iOS Safari's audio session from the default Ambient category
    // (which the physical mute switch silences) to a category that
    // overrides the mute switch. Web Audio playback in the same context
    // inherits the switch. Harmless no-op on desktop/Android.
    const SILENT_WAV =
      'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

    const unlock = () => {
      if (done) return;
      done = true;
      try { BT_AUDIO.init(); BT_AUDIO.unlock(); } catch (e) {}
      try {
        const a = new Audio(SILENT_WAV);
        a.setAttribute('playsinline', '');
        a.setAttribute('webkit-playsinline', '');
        const p = a.play();
        if (p && p.catch) p.catch(function () {});
      } catch (e) {}
      window.removeEventListener('touchstart', unlock, true);
      window.removeEventListener('mousedown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    };
    window.addEventListener('touchstart', unlock, true);
    window.addEventListener('mousedown', unlock, true);
    window.addEventListener('keydown', unlock, true);
    return () => {
      window.removeEventListener('touchstart', unlock, true);
      window.removeEventListener('mousedown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    };
  }, []);

  /* v2.3.130: re-resume the AudioContext whenever the tab regains
     focus.  iOS Safari suspends the ctx on tab-switch / phone call /
     screen lock; the one-time unlock() above runs once per session
     and won't fire again when the tab comes back.  Without this,
     SFX appears to "pop in then go silent" because the first source
     started before suspension finished, and every later play() call
     creates a BufferSource that never produces audio.  The play()
     method has a defensive resume too; this listener is the
     proactive one so the first hit after returning isn't silent. */
  useEffect(() => {
    /* v2.3.1594: `hard` distinguishes a real hide/show cycle (visibilitychange,
       pageshow) from a bare focus.  Only the former is allowed to rebuild the
       audio sources — iOS can kill them while reporting the context healthy,
       so the ctx-state check alone misses it; but rebuilding on every focus
       restarts the zone song from the top, which v2.3.1593 fixed. */
    const onResume = (hard) => {
      if (!BT_AUDIO || !BT_AUDIO.ctx) return;
      /* v2.3.254: resume ctx AND re-kick the zone music if it was
         playing.  ctx.resume() by itself doesn't restart a stopped
         BufferSource -- iOS Safari can stop the source during long
         backgrounds, leaving the game silent on return. */
      try { BT_AUDIO.resumeFromBackground(!!hard); } catch (e) {}
    };
    /* v2.3.1604: record how long we were away.  An app switch (>=2s) means
       another app took the iOS audio session; a flick between tabs did not. */
    const onVis = () => {
      if (!BT_AUDIO) return;
      if (document.visibilityState === 'hidden') { try { BT_AUDIO.noteHidden(); } catch (e) {} return; }
      try { BT_AUDIO.noteVisible(); } catch (e) {}
      onResume(true);
    };
    document.addEventListener('visibilitychange', onVis);
    /* v2.3.780: iOS Safari often REJECTS ctx.resume() outside a user
       gesture after a long background -- the visibilitychange resume
       above then silently fails and the game stays mute until reload
       ('music stopped' after switching between two game windows).
       Retry inside every tap: the first gesture after returning
       restores the context AND re-kicks the zone music. */
    /* v2.3.1594: was `state === 'suspended'`, which on iOS never matches an
       INTERRUPTED context (phone call / backgrounding / another app taking the
       audio session).  That made this the most damaging of the six copies of
       the same check: it is the tap-to-recover path, the player's only way
       back without a reload, and it silently declined to fire on the exact
       platform the retry exists for.  Anything not 'running' now retries. */
    /* v2.3.1596: NO state gate.  This used to run only when
       `ctx.state !== 'running'`, which is exactly why a quick tab-return could
       not be fixed by touching: iOS leaves the context reading 'running' with
       its output detached, so the one handler that could have recovered it
       declined to.  A touch is now simply an extra convergence opportunity —
       _audioHealthCheck is idempotent and cheap, and it decides by LISTENING
       to the master bus rather than by believing ctx.state.
       onResume still runs when the state does say asleep, because a real user
       gesture is the only moment iOS reliably honours resume() (v2.3.780). */
    const onGesture = () => {
      if (!BT_AUDIO || !BT_AUDIO.ctx) return;
      /* v2.3.1604: FIRST, re-claim the iOS audio session if we came back from
         another app.  This has to run inside the gesture — it is the only
         moment iOS honours either the silent-WAV session claim or a fresh
         AudioContext.  It also has to run BEFORE the state checks below,
         because in this failure mode the context reports 'running' and the
         graph looks perfectly healthy; the sound simply has no route to the
         speaker, and nothing downstream of here can tell. */
      try { if (BT_AUDIO.reclaimIfNeeded()) return; } catch (e) {}
      if (BT_AUDIO.ctx.state !== 'running') onResume(true);
      else { try { BT_AUDIO._audioHealthCheck(); } catch (e) {} }
    };
    /* v2.3.1596: CAPTURE phase, and touchend as well as touchstart.
       Confirmed on the owner's iPhone: iOS refuses ctx.resume() outside a user
       gesture (v2.3.780), so after a tab-return the game is silent until the
       first touch — this handler IS the recovery, not a backstop.  It was
       registered on document in the BUBBLE phase, so any canvas or overlay
       handler calling stopPropagation would swallow the one event that
       restores audio.  Capture runs before any of them can.  The one-shot
       `unlock` listeners above already use capture for the same reason.
       touchend is added because a touch that turns into a drag (the joystick,
       a swipe) can have its touchstart consumed by the input layer. */
    document.addEventListener('pointerdown', onGesture, { capture: true, passive: true });
    document.addEventListener('touchstart', onGesture, { capture: true, passive: true });
    document.addEventListener('touchend', onGesture, { capture: true, passive: true });
    /* pageshow fires on iOS Safari when restoring from the bfcache
       (back/forward navigation or returning from a backgrounded tab
       that the browser unloaded).  visibilitychange does not always
       fire in that case. */
    /* v2.3.1594: WRAPPED, not passed straight to addEventListener.  onResume
       now takes a `hard` flag, and a raw listener would hand it the Event
       object — truthy — making every window focus a hard rebuild and undoing
       the v2.3.1593 no-restart-on-focus fix.  pageshow IS a real restore, so
       it stays hard; focus is not, so it stays soft. */
    const onPageShow = () => onResume(true);
    const onFocus = () => onResume(false);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      document.removeEventListener('pointerdown', onGesture, { capture: true });
      document.removeEventListener('touchstart', onGesture, { capture: true });
      document.removeEventListener('touchend', onGesture, { capture: true });
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  /* v2.3.604: bridge the inventory's armor slots (head/chest/legs) to the gear
     renderer.  Seed the real gear items, reflect the current equipped gear into
     the inventory, then keep gearCatalog in sync whenever the player equips /
     removes a piece in the EquippedTab. */
  useEffect(() => {
    const gearItems = gearInventoryItems();
    // reflect current equipped gear (defaults) into the inventory equip slots
    ['chest', 'legs'].forEach((slot) => {
      const cur = getEquip(slot);
      const it = gearItems.find(g => g.slot === slot && g.gearId === cur) || null;
      if (it && !inventoryBus.state.equipped[slot]) inventoryBus.setEquipped(slot, it);
    });
    // First load: seed a mock inventory so the surface has things to test with
    // (weapons/potions + extra armor in each slot that maps to real gear art).
    // v2.3.1228: prepend the rarity showcase set (one guaranteed item per
    // quality) so the Lantern Slate slot system is always demonstrable.
    /* ═══ v2.3.1750: NO MORE MOCK INVENTORY ON A REAL CHARACTER ═══
       Owner: "you can access iron torso and iron graves through the character
       equip menu even before completing the quest that gives you these" and
       "only show items that are from the player inventory (not placeholder
       art)".
       This block seeded EVERY new session with a rarity showcase, twenty
       randomly-generated items and a Steel Plate + Greaves.  mockItems.js says
       what it is in its first line — "Throwaway item generator for
       development ... until the live state binding lands" — and the live
       binding landed long ago.  The seed is why a fresh character opened the
       equip menu holding armour nobody gave them, and why the trade window
       offered placeholder art: those are the mock items, and they carry no
       server-side existence at all, which is the "0% armor bonus" the owner
       noticed.
       The `inv mock` debug command still seeds them on demand, so the surface
       is still developable — it is just no longer forced on players.
       gearItems (the catalog art for pieces the player actually wears) is
       still reflected into the equip slots above; what is gone is handing out
       the items themselves. */
    // keep the renderer's gear slots in sync with the inventory equips
    const sync = () => {
      ['chest', 'legs'].forEach((slot) => {
        const it = inventoryBus.state.equipped[slot];
        setEquip(slot, (it && it.gearId) || 'none');
      });
    };
    sync();
    const off = inventoryBus.subscribe(sync);
    return off;
  }, []);

  useEffect(() => {
    fetch(NFT_CSV_URL)
      .then(r => r.text())
      .then(csv => {
        const lines = csv.split('\n');
        const parsed = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const parts = line.split(',');
          if (parts.length < 2) continue;
          const id = parseInt(parts[0]);
          const image = parts[1];
          if (!id || !image || !image.includes('ipfs')) continue;
          parsed.push({
            ID: id,
            Image: image,
            broType: parts[2] || '',
            headwear: parts[3] || '',
            clothes: parts[4] || '',
            eyes: parts[5] || '',
            eyewear: parts[6] || '',
            mouth: parts[7] || '',
            background: parts[8] || '',
            diScore: 0,
            rank: 0,
          });
        }
        console.log(`[NFT] Loaded ${parsed.length} Hemi Bros from catalogue`);
        setNfts(parsed);
      })
      .catch(err => {
        console.warn('[NFT] Failed to fetch catalogue:', err);
      });

    // Expose the self-profile builder so the bottom-dashboard "Self" icon
    // can open the live inspect card without re-importing GameApp internals.
    window.__broBuildSelfProfile = buildSelfProfile;

    // Default wheel slot handlers — placeholder until each surface is built.
    const tools = ['inventory','journey','map','more','social','selfInspect','bank','clan','market','arena','quests','settings'];
    const offs = tools.map(t => wheelBus.onActivate(t, () => console.log(`[wheel] activate: ${t}`)));
    // Wire wheel → inventory surface (uses new spec'd surface).
    offs.push(wheelBus.onActivate('inventory', () => inventoryBus.setOpen(true)));
    // Wire wheel → self-inspect card.
    offs.push(wheelBus.onActivate('selfInspect', () => {
      const s = window._gameState?.current;
      const profile = (s && s.player) ? buildSelfProfile(s) : generateMockProfile({ name: 'You' });
      inspectCardBus.open(profile);
    }));
    // Wire wheel → the nav sheet's More destination (v2.3.1287: the
    // legacy MoreOverlay is deleted).
    offs.push(wheelBus.onActivate('more', () => dashboardPanelBus.openCompact('more')));
    // Wire wheel slots that map directly to a legacy panel.
    const legacyPanel = (key) => () => {
      const fn = window.__broLegacyUI?.[key];
      if (fn) fn(); else console.log(`[wheel] legacy panel '${key}' not ready`);
    };
    offs.push(wheelBus.onActivate('social', legacyPanel('social')));
    offs.push(wheelBus.onActivate('clan',   legacyPanel('clan')));
    offs.push(wheelBus.onActivate('quests', legacyPanel('encyclopedia'))); // closest match
    offs.push(wheelBus.onActivate('journey', legacyPanel('encyclopedia'))); // until journey surface lands
    offs.push(wheelBus.onActivate('map',    legacyPanel('encyclopedia'))); // until map surface lands

    // Debug commands for the wheel.
    debugBus.cmd('wheel', (args) => {
      const sub = args[0];
      if (sub === 'open' || sub === 'show') { wheelBus.setOpen(true); return 'wheel open'; }
      if (sub === 'close' || sub === 'hide') { wheelBus.setOpen(false); return 'wheel closed'; }
      if (sub === 'badge') {
        const tool = args[1]; const val = args[2];
        if (!tool) return 'usage: wheel badge <tool> <count|dot|off>';
        if (val === 'off' || val == null) wheelBus.setBadge(tool, null);
        else if (val === 'dot') wheelBus.setBadge(tool, { dot: true });
        else wheelBus.setBadge(tool, { count: Number(val) });
        return `badge ${tool} = ${val}`;
      }
      if (sub === 'combat') { wheelBus.setInCombat(args[1] === 'on'); return `combat=${wheelBus.state.inCombat}`; }
      return 'wheel <open|close|badge <tool> <n|dot|off>|combat <on|off>>';
    }, 'wheel — toggle wheel, set badges, simulate combat');

    // Armor gear slots (head/chest/legs/shoulders) — equip/unequip live.
    // v2.3.602: helmet split into its own `head` slot; each renders independently.
    debugBus.cmd('gear', (args) => {
      const slot = args[0], id = args[1];
      if (!slot) {
        return GEAR_SLOTS.map(s => `${s}=${getEquip(s)}`).join('  ');
      }
      if (!GEAR_SLOTS.includes(slot)) return `unknown slot '${slot}' (use ${GEAR_SLOTS.join('/')})`;
      if (!id) {
        const ids = (GEAR_CATALOG[slot] || []).map(c => c.id).join('|');
        return `${slot} = ${getEquip(slot)} (options: ${ids})`;
      }
      setEquip(slot, id);
      return `${slot} = ${getEquip(slot)}`;
    }, 'gear — equip/unequip an armor slot, e.g. `gear chest none` / `gear legs steelgreaves`');

    // Inventory debug commands.
    debugBus.cmd('inv', (args) => {
      const sub = args[0];
      if (sub === 'open') { inventoryBus.setOpen(true); return 'inventory open'; }
      if (sub === 'close') { inventoryBus.setOpen(false); return 'inventory closed'; }
      if (sub === 'mock') {
        const n = args[1] ? Number(args[1]) : 30;
        inventoryBus.setItems(generateMockInventory(n));
        const eq = generateMockEquipped();
        Object.entries(eq).forEach(([k, v]) => inventoryBus.setEquipped(k, v));
        return `seeded ${n} mock items`;
      }
      if (sub === 'clear') { inventoryBus.setItems([]); return 'cleared inventory'; }
      if (sub === 'tab') { inventoryBus.setTab(args[1] || 'inventory'); return `tab = ${inventoryBus.state.activeTab}`; }
      if (sub === 'damage') { inventoryBus.pushDamage(Number(args[1] || 0.05)); return `hp = ${inventoryBus.state.hp.toFixed(2)}`; }
      if (sub === 'hp') { inventoryBus.setHp(Number(args[1] || 1)); return `hp = ${inventoryBus.state.hp}`; }
      if (sub === 'layer') {
        const n = Number(args[1]); if (!n) return 'usage: inv layer <1|2|3>';
        inventoryBus.triggerLayer(n); return `layer ${n} = ${inventoryBus.state.layers[n]}`;
      }
      return 'inv <open|close|mock [n]|clear|tab <inventory|equipped>|damage [amt]|hp [frac]|layer <1|2|3>>';
    }, 'inv — control inventory surface');

    // Inspect card debug commands.
    debugBus.cmd('card', (args) => {
      const sub = args[0];
      if (sub === 'self') {
        const s = window._gameState?.current;
        const profile = (s && s.player) ? buildSelfProfile(s) : generateMockProfile({ name: 'You' });
        inspectCardBus.open(profile);
        return 'opened self card';
      }
      if (sub === 'mock') { inspectCardBus.open(generateMockProfile()); return 'opened mock card'; }
      if (sub === 'close') { inspectCardBus.close(); return 'closed'; }
      if (sub === 'expand') {
        const id = args[1];
        if (!id) return 'usage: card expand <combat|carrying|skills|history|journey>';
        inspectCardBus.toggleExpanded(id);
        return `toggled ${id}`;
      }
      return 'card <self|mock|close|expand <section>>';
    }, 'card — control inspect card');

    // Block-ring debug commands.
    debugBus.cmd('block', (args) => {
      const sub = args[0];
      if (sub === 'hostile') { blockRingBus.setHostileNear(args[1] !== 'off'); return `hostileNear=${blockRingBus.state.hostileNear}`; }
      if (sub === 'relaxed') { blockRingBus.setRelaxedParry(args[1] !== 'off'); return `relaxedParry=${blockRingBus.state.relaxedParry}`; }
      if (sub === 'count') {
        const n = Number(args[1]);
        if (!Number.isNaN(n)) { blockRingBus.state.blockCount = n; try { localStorage.setItem('brotown_block_count', String(n)); } catch {} }
        return `blockCount=${blockRingBus.state.blockCount}`;
      }
      if (sub === 'parry') { blockRingBus.state.parryFlashAt = performance.now(); return 'parry flash'; }
      return 'block <hostile [off]|relaxed [off]|count <n>|parry>';
    }, 'block — control block ring (hostile proximity, relaxed parry, simulate parry)');

    // Live-override the source-pixel handle position for a weapon image.
    // Useful when handles.json was clicked imprecisely — adjust until the
    // pivot dot lands on the visible handle, then tell Claude the values
    // and they'll be baked into handles.json.
    debugBus.cmd('hpx', (args) => {
      if (args[0] === 'show') return JSON.stringify(window.__broWeaponHpxOverride || {}, null, 2);
      if (args[0] === 'reset') { window.__broWeaponHpxOverride = {}; return 'cleared'; }
      const type = args[0];
      const x = Number(args[1]);
      const y = Number(args[2]);
      if (!type || Number.isNaN(x) || Number.isNaN(y)) {
        return 'usage: hpx <sword|bow|staff> X Y  (source-pixel coords 0..64)  |  hpx show  |  hpx reset';
      }
      if (!window.__broWeaponHpxOverride) window.__broWeaponHpxOverride = {};
      window.__broWeaponHpxOverride[type] = [x, y];
      return `${type} hpx → [${x}, ${y}]`;
    }, 'hpx — override weapon handle source pixel; iterate until dot is on handle');

    // Show / hide a yellow dot at the sword's rotation pivot point. Useful
    // when the sword visually drifts during swing — if the dot stays on the
    // hand, the math is correct and the apparent drift is the sword's
    // silhouette rotating around a stationary pivot.
    debugBus.cmd('pivot', (args) => {
      if (args[0] === 'on')  { window.__broShowPivot = true;  return 'pivot dot ON'; }
      if (args[0] === 'off') { window.__broShowPivot = false; return 'pivot dot OFF'; }
      return 'pivot <on|off>';
    }, 'pivot — show / hide rotation-pivot dot during sword swings');

    // Per-weapon, per-direction weapon-nudge tuning.
    //   nudge X Y                    — applies to current weapon + current facing
    //   nudge <weapon> <dir> X Y     — explicit, e.g. `nudge sword NE 6 4`
    //   nudge <weapon> default X Y   — default for that weapon's unset facings
    //   nudge show                   — print current overrides
    //   nudge reset                  — clear all overrides
    debugBus.cmd('nudge', (args) => {
      const DIR_NAMES = ['E','SE','S','SW','W','NW','N','NE'];
      if (args[0] === 'show') return JSON.stringify(window.__broWeaponNudge || {}, null, 2);
      if (args[0] === 'reset') { window.__broWeaponNudge = {}; return 'cleared'; }
      const wTypeFromState = () => {
        const S = window._gameState?.current;
        const slot = S?.rpg?.activeSlot;
        const w = slot === 'ranged' ? S?.rpg?.rangedWeapon : slot === 'staff' ? S?.rpg?.weapon : S?.rpg?.weapon;
        return (w && w.type) || 'sword';
      };
      const dirFromState = () => {
        const S = window._gameState?.current;
        const fa = S?._facingAngle ?? Math.PI / 2;
        const tau = Math.PI * 2;
        const a = ((fa % tau) + tau) % tau;
        const idx = Math.round(a / (Math.PI / 4)) % 8;
        return DIR_NAMES[idx];
      };
      let type, dir, x, y;
      if (args.length === 2) {
        // nudge X Y — current weapon, current facing
        type = wTypeFromState();
        dir  = dirFromState();
        x = Number(args[0]); y = Number(args[1]);
      } else if (args.length === 4) {
        // nudge <weapon> <dir|default> X Y
        type = args[0];
        dir  = args[1];
        x = Number(args[2]); y = Number(args[3]);
      } else if (args.length === 3) {
        // nudge <weapon> X Y — sets that weapon's default
        type = args[0];
        dir  = 'default';
        x = Number(args[1]); y = Number(args[2]);
      } else {
        return 'usage: nudge X Y  |  nudge <weapon> <dir|default> X Y  |  nudge show  |  nudge reset';
      }
      if (Number.isNaN(x) || Number.isNaN(y)) return 'X / Y must be numbers';
      if (!window.__broWeaponNudge) window.__broWeaponNudge = {};
      if (!window.__broWeaponNudge[type]) window.__broWeaponNudge[type] = {};
      const key = dir === 'default' ? '_default' : dir;
      window.__broWeaponNudge[type][key] = { x, y };
      return `${type}.${key} → (${x}, ${y})`;
    }, 'nudge — per-direction weapon offset; `nudge X Y` uses current weapon+facing');

    // Toggle player sprite-sheet rendering (vs procedural body drawing).
    debugBus.cmd('sprite', (args) => {
      const sub = args[0];
      if (sub === 'on')  { window.__broUseSprites = true;  return 'sprite mode ON'; }
      if (sub === 'off') { window.__broUseSprites = false; return 'sprite mode OFF (procedural body)'; }
      return 'sprite <on|off>';
    }, 'sprite — toggle sprite-sheet vs procedural player rendering');

    // Tap-to-lock diagnostics — flip on, tap a monster, read the console.
    debugBus.cmd('tap', (args) => {
      const sub = args[0];
      if (sub === 'on')  { window.__broTapLog = true;  return 'tap logging ON — tap a monster, watch console'; }
      if (sub === 'off') { window.__broTapLog = false; return 'tap logging OFF'; }
      return 'tap <on|off>';
    }, 'tap — toggle tap-to-lock diagnostic logging');

    // Mastery debug commands.
    debugBus.cmd('mastery', (args) => {
      const sub = args[0];
      if (sub === 'tier') {
        const t = Number(args[1]);
        if (Number.isNaN(t)) return 'usage: mastery tier <0|0.5|1|1.5|2|2.5|3|4>';
        advanceMastery(t); return `advanced to ${t}`;
      }
      if (sub === 'cert') {
        const id = args[1]; if (!id) return 'usage: mastery cert <cert-id>';
        return earnCertification(id) ? `earned ${id}` : `already earned (or unknown): ${id}`;
      }
      if (sub === 'reset') {
        try {
          localStorage.removeItem('bt_mastery_level');
          localStorage.removeItem('bt_mastery_certs');
          localStorage.removeItem('bt_mastery_timestamps');
        } catch {}
        return 'mastery state cleared (reload to rehydrate)';
      }
      if (sub === 'off') { try { localStorage.setItem('bt_mastery_notif_off', '1'); } catch {} return 'notifications disabled'; }
      if (sub === 'on')  { try { localStorage.removeItem('bt_mastery_notif_off'); } catch {} return 'notifications enabled'; }
      return 'mastery <tier <n>|cert <id>|reset|on|off>';
    }, 'mastery — fire tier/cert notifications, reset state');

    // Hostile proximity poll: sets ring opacity gate based on nearby hostiles.
    // Cheap heuristic — refine when combat layer exposes a real hostile-near flag.
    const hostilePoll = setInterval(() => {
      const s = window._gameState?.current;
      if (!s) return;
      const others = s.others || {};
      const me = s.player;
      let near = false;
      if (me) {
        for (const id in others) {
          const o = others[id];
          if (!o || !o.hostile) continue;
          const dx = (o.x ?? 0) - (me.x ?? 0);
          const dy = (o.y ?? 0) - (me.y ?? 0);
          if (dx * dx + dy * dy < 800 * 800) { near = true; break; }
        }
      }
      if (near !== blockRingBus.state.hostileNear) blockRingBus.setHostileNear(near);
    }, 500);

    return () => { offs.forEach(f => f()); clearInterval(hostilePoll); };
  }, []);

  return (
    <>
      <BroTown
        nfts={nfts}
        onExit={() => {
          /* v2.3.786: exit means "back to the character screen", but the
             v2.3.777 auto-rejoin treats ANY reload within 10 min as a crash
             recovery and warps straight back into the world. ?noresume=1 is
             that feature's own escape hatch for deliberate exits. */
          window.location.href = '/?noresume=1';
        }}
      />
      {/* v2.3.1333: zone header rail — hosts the logout chip (with
          confirmation) + centered zone name; replaces BroTown's
          bt-exit-fab and floating zone label. */}
      {/* v2.3.1840: `login=1` alongside `noresume=1`.  noresume only stops the
          resume SNAPSHOT; the boot check is a second road into the world and
          it walked the player straight back in, which is why logging out did
          not appear to do anything.  `guest` is carried through because it
          identifies WHICH browser identity this tab is — dropping it would
          log a guest tab out into the main character. */}
      <ZoneHeader onExit={() => {
        let guest = '';
        try { guest = /[?&]guest=1\b/.test(window.location.search) ? '&guest=1' : ''; } catch (e) { guest = ''; }
        window.location.href = `/?noresume=1&login=1${guest}`;
      }} />
      <BottomDashboard />
      <ChatBubble />
      {/* v2.3.2037: the World Chat section, lower left above the dashboard.
          Mounted beside ChatBubble because it reads the same log off the game
          state and the same bus -- and, like it, has no path to BroTown's
          React state. */}
      <WorldChatFeed />
      {/* v2.3.2145: the silence control, in the corner it silences. */}
      <NotificationMute />
      {/* v2.3.2050: Shopkeeper Bro's trade window. Mounted here rather than in
          BroTown's tree for the same reason the chat surfaces are: it is driven
          by a bus that a WebSocket handler and the game loop both write to, and
          neither of those has a route to BroTown's React state. */}
      <ShopkeeperPanel />
      {/* InventorySurface, InspectCard, MoreOverlay are no longer mounted — */}
      {/* the bottom dashboard nests their content inside the --dash-h band. */}
      {/* Their buses still exist and are exercised by debug commands.      */}
      <BlockRing />
      {/* v2.3.1734: Element Burst's touch input (COMBAT-OVERHAUL-PLAN
          PR 6).  Self-hiding — it mounts always and renders nothing
          until the character is level 6 with an enchanted weapon in
          hand, so there is no gate to maintain here. */}
      <ElementBurstButton />
      <XpFlyOverlay />
      {/* v2.3.820: MasteryNotification unmounted at the owner's request --
          the mastery/certification toasts ("First Resonance-Timed Hit",
          etc.) were auto-generated notifications they didn't add.  Mastery
          tracking itself (advanceMastery/earnCertification + localStorage)
          is untouched; only the popup UI is gone. */}
      <ControlsTutorial />
      <InfoPopup />
      {/* v2.3.221: dev-tooling overlays gated on ?dev=1 URL param so
          the player-facing build doesn't show the D button, version
          badge, or FPS counter. */}
      {typeof window !== 'undefined' && /[?&]dev=1\b/.test(window.location.search) && (
        <>
          <DebugOverlay />
          <BuildBadge />
        </>
      )}
    </>
  );
};
