import React, { useEffect, useState } from 'react';
import { COL, getState } from '../dash/common.js';
import { xpRequired } from '../../../data/gameSystems.js';
import { portraitStore } from './portraitStore.js';

/* v2.3.1294 (ChatGPT round-4): the identity strip — one compact row
   that replaces the retired top-right world card.  Portrait (with the
   presence dot), name, level, a thin XP strip WITH exact progress, and
   gold aligned right.  Shared by Hero compact and Hero expanded so the
   "who am I" row is pixel-identical in both.
   Canonical name source: S.myName (the world card's source) — the old
   HeroExpanded read S.player.name and fell back to 'Bro' while the
   card said 'Anon'; one record now. */
export const IdentityStrip = () => {
  const [, force] = useState(0);
  useEffect(() => portraitStore.subscribe(() => force(v => v + 1)), []);

  const S = getState();
  const R = (S && S.rpg) || {};
  const level = R.level || 1;
  const xp = R.xp || 0;
  const xpNeed = Math.max(1, Math.floor(xpRequired(level)));
  const gold =
    (R._compStats && (R._compStats.totalGoldEarned || R._compStats.goldEarnedTotal)) ||
    R.goldEarned || R.coins || R.gold || 0;
  const portrait = portraitStore.get();

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '2px 0 4px',
      flex: '0 0 auto',
      fontFamily: 'Source Sans 3, sans-serif',
    }}>
      {/* Portrait + presence dot (connection status — lived on the old
          world card; the identity strip keeps it). */}
      <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
        <img
          src={portrait || (S && S.myAvatar) || '/icons/ui/profile.webp?v=2.3.128'}
          alt="Portrait"
          draggable={false}
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover', imageRendering: 'pixelated',
            borderRadius: 8, userSelect: 'none', pointerEvents: 'none',
          }}
        />
        <span style={{
          position: 'absolute', right: -2, bottom: -2,
          width: 7, height: 7, borderRadius: '50%',
          background: (S && S._realtimeStatus === 'connected') ? '#55B98A' : '#D95C54',
          border: '2px solid #202C32',
        }} />
      </div>
      {/* Name · Lv + XP strip with exact progress. */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
          <span style={{
            fontSize: 13, fontWeight: 700, color: COL.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            minWidth: 0,
          }}>{(S && S.myName) || 'Anon'}</span>
          <span style={{ flex: 'none', fontSize: 11, fontWeight: 600, color: COL.text2 }}>Lv {level}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <div style={{
            flex: 1, height: 4, borderRadius: 2,
            background: 'rgba(0,0,0,.5)', border: '1px solid rgba(255,255,255,.08)',
            overflow: 'hidden',
          }}>
            <div style={{ width: `${Math.min(100, (xp / xpNeed) * 100)}%`, height: '100%', background: '#8AA9F9' }} />
          </div>
          <span style={{ flex: 'none', fontSize: 10, color: COL.muted, fontVariantNumeric: 'tabular-nums' }}>
            {xp} / {xpNeed} XP
          </span>
        </div>
      </div>
      {/* Gold, right-aligned. */}
      <span style={{
        flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
        color: COL.gold, fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
      }}>
        <img src="/icons/popups/gold.webp" alt=""
          style={{ width: 13, height: 13, imageRendering: 'pixelated', display: 'block' }} />
        <span className="bt-coin-glimmer">{Number(gold).toLocaleString()}</span>
      </span>
    </div>
  );
};
