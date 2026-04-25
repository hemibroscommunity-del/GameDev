import React, { useState, useEffect } from 'react';
import { BroTown } from './BroTown.jsx';
import { DebugOverlay } from '../debug/DebugOverlay.jsx';
import { UtilityWheel } from './mobile/UtilityWheel.jsx';
import { wheelBus } from './mobile/wheelBus.js';
import { debugBus } from '../debug/debugBus.js';

const NFT_CSV_URL = 'https://raw.githubusercontent.com/hemibroscommunity-del/Hemi-Bros-catalogue/main/Hemi%20Bro%20spreadsheet-CleanDataWithImages.csv';

export const GameApp = () => {
  const [nfts, setNfts] = useState([]);

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

    return () => { offs.forEach(f => f()); };
  }, []);

  return (
    <>
      <BroTown
        nfts={nfts}
        onExit={() => { window.location.href = '/'; }}
      />
      <UtilityWheel />
      <DebugOverlay />
    </>
  );
};
