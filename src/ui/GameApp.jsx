import React, { useState, useEffect } from 'react';
import { BroTown } from './BroTown.jsx';

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
  }, []);

  return (
    <BroTown
      nfts={nfts}
      onExit={() => { window.location.href = '/'; }}
    />
  );
};
