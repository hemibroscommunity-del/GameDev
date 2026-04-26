import React, { useState, useEffect } from 'react';
import { BroTown } from './BroTown.jsx';
import { DebugOverlay } from '../debug/DebugOverlay.jsx';
import { UtilityWheel } from './mobile/UtilityWheel.jsx';
import { wheelBus } from './mobile/wheelBus.js';
import { InventorySurface } from './mobile/InventorySurface.jsx';
import { inventoryBus } from './mobile/inventoryBus.js';
import { generateMockInventory, generateMockEquipped } from './mobile/mockItems.js';
import { InspectCard } from './mobile/InspectCard.jsx';
import { inspectCardBus } from './mobile/inspectCardBus.js';
import { generateMockProfile } from './mobile/mockProfile.js';
import { BlockRing } from './mobile/BlockRing.jsx';
import { blockRingBus } from './mobile/blockRingBus.js';
import { MoreOverlay, moreOverlay } from './mobile/MoreOverlay.jsx';
import { MasteryNotification } from './mobile/MasteryNotification.jsx';
import { advanceMastery, earnCertification } from '../game/mastery.js';
import { debugBus } from '../debug/debugBus.js';
import { BuildBadge } from './BuildBadge.jsx';
import { BT_AUDIO } from '../data/gameSystems.js';

const NFT_CSV_URL = 'https://raw.githubusercontent.com/hemibroscommunity-del/Hemi-Bros-catalogue/main/Hemi%20Bro%20spreadsheet-CleanDataWithImages.csv';

// Best-effort mapping from live game state into the inspect-card profile shape.
// Falls back to mock fields where the live state doesn't yet expose them.
const buildSelfProfile = (s) => {
  const p = s.player || {};
  const rpg = s.rpgState || {};
  const ls = rpg.lifeSkills || {};
  const lvl = (k) => (ls[k]?.level) ?? 0;
  const fallback = generateMockProfile({ name: p.name || 'You' });
  return {
    name: p.name || fallback.name,
    level: rpg.level || p.level || fallback.level,
    archetype: p.archetype || fallback.archetype,
    pole: p.pole || rpg.pole || fallback.pole,
    clanTag: s._clanData?.tag || null,
    questLine: s.activeQuest?.text || fallback.questLine,
    recentJourneyLine: s.journey?.recent || fallback.recentJourneyLine,
    logo: p.logo || null,
    stats: {
      power:     rpg.power     ?? fallback.stats.power,
      vitality:  rpg.vitality  ?? fallback.stats.vitality,
      endurance: rpg.endurance ?? fallback.stats.endurance,
      agility:   rpg.agility   ?? fallback.stats.agility,
      mind:      rpg.mind      ?? fallback.stats.mind,
    },
    tier2: fallback.tier2,
    vows: rpg.vows || [],
    weapon: rpg.weapon || fallback.weapon,
    armor:  rpg.armor  || fallback.armor,
    pet:    rpg.pet    || fallback.pet,
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
    journey: s.journey || fallback.journey,
  };
};

export const GameApp = () => {
  const [nfts, setNfts] = useState([]);

  // Unlock the audio context on the first user gesture. Mobile/Safari refuse
  // to play any sound until an AudioContext is created (or resumed) inside a
  // user-initiated handler. Once unlocked we also kick off SFX preload.
  useEffect(() => {
    let done = false;
    const unlock = () => {
      if (done) return;
      done = true;
      try { BT_AUDIO.init(); BT_AUDIO.unlock(); } catch (e) {}
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
    // Wire wheel → "More" overlay (legacy panels not yet relocated).
    offs.push(wheelBus.onActivate('more', () => moreOverlay.open()));
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
        onExit={() => { window.location.href = '/'; }}
      />
      <UtilityWheel />
      <InventorySurface />
      <InspectCard />
      <BlockRing />
      <MoreOverlay />
      <MasteryNotification />
      <DebugOverlay />
      <BuildBadge />
    </>
  );
};
