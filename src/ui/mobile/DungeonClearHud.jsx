/* ═══ v2.3.3556: AFTER THE CLEAR, A CARD THAT COUNTS DOWN ═══
 *
 * game/dungeonClear.js keeps the clock: DUNGEON_LOOT_MS after "DUNGEON
 * CLEARED!" you are taken back out, where it used to be three seconds and the
 * boss's drop was left on the floor.  This is its face: a small card at the
 * top, where Lil Bro's race clock goes (RaceHud.jsx, NmlAskCard's cardPlace),
 * out of the thumbs' way -- "Dungeon cleared!", "Pick up your loot · out in
 * 27 s", and Leave now, which goes at once.  Only while you stand in the
 * cleared dungeon; read off the game's state four times a second while it is
 * up, woken by the clock's bus.
 *
 * v2.3.3565: AND THE BOSS'S CHEST.  A world dungeon's clear pays the boss's
 * chest and puts its XP into the weapons you fought with there
 * (server/src/dungeonreward.js).  Under the card's first row the chest opens
 * -- its lid's sounds on its frames as the daily chest played them, after the
 * clear's fanfare -- beside what it held: its gold, each item with its count
 * and each weapon's XP (game/bossChest.js).
 *
 * v2.3.3566: the chest is the OWNER'S, the one that lands where the boss fell
 * (rendering/arenaWorld.js), shut and then open at the same moment
 * (CHEST_OPEN_MS there) -- it was the old daily chest's strip.  Its picture
 * (src/data/dungeonArt.js BOSS_CHEST_ART) is warmed with the row's others.
 */
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Z_ABOVE_DASH_PROMPT } from '@/ui/zLayers.js';
import { dungeonClearBus, dungeonClearView, leaveClearedDungeon } from '@/game/dungeonClear.js';
import { cardPlace } from './NmlAskCard.jsx';
import { BOSS_CHEST_ART } from '@/data/dungeonArt.js';
import { dungeonArtUrl } from '@/game/dungeonArt.js';
import { thumbFor } from './dash/InventoryPanel.jsx';
import { ZONE_SHARDS, shardByKey } from '@/data/shards.js';
import { chestLines } from '@/game/bossChest.js';
import { BT_AUDIO } from '@/data/index.js';

const CARD = {
  position: 'fixed', boxSizing: 'border-box', borderRadius: 12,
  background: 'rgba(17,25,29,.94)', border: '1px solid rgba(238,242,235,.24)',
  boxShadow: '0 14px 30px rgba(4,7,9,.38)', color: '#F7F2E7',
  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px 8px 12px',
};
const BTN = {
  font: 'inherit', flex: '0 0 auto', minHeight: 40, padding: '0 12px', borderRadius: 11,
  fontSize: 13, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent', whiteSpace: 'nowrap',
  background: 'linear-gradient(180deg,#E2B866,#C9973F)', color: '#1A1408', border: '1px solid #F0CF86',
};

/* v2.3.3565: the chest's lines' pictures -- its gold, an item's bag picture,
   a weapon's skill */
const GOLD_ICON = '/icons/ui/cur-gold.webp';
const SKILL_ICON = { sword: '/icons/ui/combat-melee.webp', bow: '/icons/ui/combat-bow.webp', staff: '/icons/ui/combat-magic.webp' };
const nameOf = (k) => (k === 'rare_gem' ? 'Rare Gem' : ((shardByKey(k) || {}).label || null));
const iconOf = (l) => (l.skill ? SKILL_ICON[l.skill] : (l.key === 'gold' ? GOLD_ICON : thumbFor(l.key)));
/* Warm (and hold) the few small pictures the chest's row may show, so the row
   never waits on one: the gold, the three weapons, the Rare Gem and the
   lands' shards.  The chest's own strip is on the loading screen already. */
const _held = [];
try {
  if (typeof Image !== 'undefined') {
    const urls = [GOLD_ICON, ...Object.values(SKILL_ICON), thumbFor('rare_gem'), ...Object.values(ZONE_SHARDS).map((z) => thumbFor(z.key))];
    if (BOSS_CHEST_ART) urls.push(dungeonArtUrl(BOSS_CHEST_ART.url));   /* v2.3.3566 */
    for (const u of urls) { if (!u) continue; const img = new Image(); img.decoding = 'async'; img.src = u; _held.push(img); }
  }
} catch (e) { /* a warm-up never breaks the card */ }
/* the lid lifts after the clear's fanfare (cue 'dungeonClear') has had its
   moment -- the same moment the chest in the arena opens (rendering/
   arenaWorld.js CHEST_OPEN_MS = these two) */
const CHEST_WAIT_MS = 900;
const CHEST_FRAME_MS = 75;
/* v2.3.3566: the owner's chest in the card's 44 px box: both pictures at one
   scale (the open one, lid up, fills the height), standing on the same front
   corner (each frame's `foot`), the shut one centred */
const CHEST_BOX = 44;
function chestFrameStyle(name) {
  const A = BOSS_CHEST_ART;
  const fr = A && A.frames.find((f) => f.id === name);
  const sh = A && A.frames.find((f) => f.id === 'shut-1');
  if (!fr || !sh) return null;
  const k = CHEST_BOX / Math.max(...A.frames.map((f) => f.h));
  const footX = CHEST_BOX / 2 - (sh.w / 2) * k + sh.foot[0] * k;
  return {
    position: 'absolute', bottom: 0, left: footX - fr.foot[0] * k, width: fr.w * k, height: fr.h * k,
    backgroundImage: `url(${dungeonArtUrl(A.url)})`, backgroundRepeat: 'no-repeat',
    backgroundSize: `${A.w * k}px ${A.h * k}px`, backgroundPosition: `${-fr.x * k}px ${-fr.y * k}px`,
  };
}

function ChestRow({ reward }) {
  const lines = chestLines(reward && reward.chest, reward && reward.skillXp, nameOf);
  const hasChest = !!(reward && reward.chest);
  const [opened, setOpened] = useState(!hasChest);
  useEffect(() => {
    if (!hasChest) return undefined;
    const ts = [];
    const later = (fn, ms) => ts.push(setTimeout(fn, ms));
    later(() => setOpened(true), CHEST_WAIT_MS + CHEST_FRAME_MS);
    /* the daily chest's sounds on its frames (ChestReveal.jsx, v2.3.3045):
       a wooden knock and a shimmer as the lid lifts, the coins as they rise */
    later(() => {
      try { BT_AUDIO.play('wood-chop', { vol: 0.32, rate: 1.18 }); BT_AUDIO.play('magic-cast', { vol: 0.22, rate: 1.12 }); } catch (e) { /* a sound never breaks the card */ }
    }, CHEST_WAIT_MS + CHEST_FRAME_MS);
    later(() => {
      try { BT_AUDIO.play('coin-pickup', { vol: 0.5 }); } catch (e) { /* a sound never breaks the card */ }
    }, CHEST_WAIT_MS + 5 * CHEST_FRAME_MS + 60);
    return () => ts.forEach(clearTimeout);
  }, [reward && reward.at]);
  if (!lines.length) return null;
  const pic = hasChest ? chestFrameStyle(opened ? 'open-1' : 'shut-1') : null;
  return (
    <div data-boss-chest={hasChest ? 'open' : 'xp'} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      {pic ? (
        <div aria-hidden="true" data-chest-frame={opened ? 'open' : 'shut'} style={{ position: 'relative', width: CHEST_BOX, height: CHEST_BOX, flex: `0 0 ${CHEST_BOX}px` }}>
          <div style={pic} />
        </div>
      ) : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', minWidth: 0 }}>
        {lines.map((l, i) => {
          const src = iconOf(l);
          return (
            <span key={i} data-chest-line={l.skill || l.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#F7F2E7', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
              {src ? <img src={src} alt="" width={16} height={16} style={{ width: 16, height: 16, objectFit: 'contain', flex: '0 0 16px' }} /> : null}
              {l.text}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function DungeonClearHud({ stateRef }) {
  const [, setTick] = useState(0);
  const S = stateRef && stateRef.current;
  const v = dungeonClearView(S, Date.now());
  useEffect(() => dungeonClearBus.sub(() => setTick((n) => n + 1)), []);
  const live = !!v;
  useEffect(() => {
    if (!live) return undefined;
    const t = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(t);
  }, [live]);
  if (!v) return null;
  const pl = cardPlace();
  const stop = (e) => { e.stopPropagation(); };
  const leave = (e) => { e.preventDefault(); e.stopPropagation(); leaveClearedDungeon(stateRef.current); };
  return createPortal(
    <div data-dungeon-clear={v.secs} role="status" aria-live="polite"
      onPointerDown={stop} onTouchStart={stop} onMouseDown={stop} onClick={stop}
      style={Object.assign({}, CARD, { left: pl.left, top: pl.top, width: pl.w, zIndex: Z_ABOVE_DASH_PROMPT, flexDirection: 'column', alignItems: 'stretch', gap: 6 })}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: '#F6D38B' }}>Dungeon cleared!</div>
          <div style={{ fontSize: 12, color: '#D9DEDB', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
            Pick up your loot · out in {v.secs} s
          </div>
        </div>
        <button type="button" data-dungeon-leave="" onClick={leave} style={BTN}>Leave now</button>
      </div>
      {v.reward ? <ChestRow reward={v.reward} /> : null}
    </div>,
    document.body
  );
}
