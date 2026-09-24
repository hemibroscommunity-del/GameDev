import React, { useEffect, useRef, useState } from 'react';
import { COL, QUALITY_COLOR, QUALITY_LABEL, getState } from './dash/common.js';
import { thumbFor } from './dash/InventoryPanel.jsx';
import { armorIconFor } from '@/rendering/gearVariants.js';
import { DAILY_CHEST_STRIP, DAILY_CHEST_FRAMES } from '@/rendering/chestPreload.js';

/* ═══ v2.3.2820: THE DAILY CHEST'S CLAIM WINDOW ═══
 * Owner, with the chest art: "You can make the daily reward this chest that
 * you need to click the claim button to get it.  You can stack them.  It'll
 * reveal whatever the reward is coming out of it."
 *
 * ONE window, four beats, driven by the owner's 9-frame strip
 * (chestPreload.js): OFFER (the idle chest, how many are stacked, Claim /
 * Later) -> SHAKE (frames 0-2, while the worker rolls -- the wait is the
 * anticipation, not a spinner) -> OPEN (frames 3-8) -> REVEAL (the prize
 * rises out of the open chest, in its quality's colour when it has one, with
 * "Claim next" while more are stacked).
 *
 * Nothing here decides a prize: Claim sends `chest_open`, the worker takes
 * the chest, rolls, pays, and answers `chest_opened` (dailychest.js), which
 * wsClient hands to chestRevealBus.prize().  If no answer comes in 8s the
 * window says so and offers the chest again -- the chest is still in the bag,
 * because only the worker removes it.
 *
 * It opens by itself once per session after the intro lifts when a chest is
 * waiting (the daily reward's announcement -- no chat line, v2.3.2037), and
 * from the bag's Claim button.  "Later" keeps the stack for another time. */
const listeners = new Set();
let _state = { open: false, claimNow: false, prize: null, seq: 0 };
const emit = () => { for (const fn of listeners) { try { fn(_state); } catch (e) { /* a dead listener must not eat the prize */ } } };
export const chestRevealBus = {
  get() { return _state; },
  /** Open the window; `claimNow` skips the offer (the bag's Claim button). */
  open(claimNow) { _state = { ..._state, open: true, claimNow: !!claimNow, seq: _state.seq + 1 }; emit(); },
  close() { _state = { ..._state, open: false, claimNow: false }; emit(); },
  /** The worker's answer (wsClient `chest_opened`). */
  prize(p) {
    _state = { ..._state, open: true, prize: p ? { ...p, at: Date.now() } : null };
    try { if (typeof window !== 'undefined') window.__btChestReveal = _state.prize; } catch (e) { /* probe only */ }
    emit();
  },
  /* Back-compat with the first cut's name. */
  show(p) { this.prize(p); },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

const FRAME_MS = 75;
const SHAKE_MIN_MS = 650;
const ANSWER_TIMEOUT_MS = 8000;

/* The one line that says what it is. */
export function prizeText(p) {
  if (!p) return '';
  if (p.kind === 'coins') return '+' + (p.coins || 0) + ' coins';
  if (p.kind === 'fish') return (p.count || 10) + ' Cooked Fish';
  if (p.kind === 'gem') return 'A Rare Gem';
  if (p.kind === 'armor' && p.piece) {
    const q = p.piece.quality && p.piece.quality !== 'normal' ? (QUALITY_LABEL[p.piece.quality] || p.piece.quality) + ' ' : '';
    return q + (p.piece.name || 'Armour');
  }
  return 'A prize';
}
function prizeIcon(p) {
  if (!p) return null;
  if (p.kind === 'coins') return '/icons/ui/cur-gold.webp';
  if (p.kind === 'fish') return thumbFor(p.invKey || 'cooked_fish_minnow');
  if (p.kind === 'gem') return thumbFor(p.invKey || 'rare_gem');
  if (p.kind === 'armor' && p.piece) return armorIconFor(p.piece.slot === 'legsArmor' ? 'legsArmor' : 'armor', p.piece.mat);
  return null;
}
/* Warm the prize icons once, at mount (the app shell mounts this at boot), so
   the reveal never waits on a fetch. */
const _warm = [];
function warmPrizeIcons() {
  if (_warm.length || typeof Image === 'undefined') return;
  const urls = ['/icons/ui/cur-gold.webp', thumbFor('cooked_fish_minnow'), thumbFor('rare_gem'),
    armorIconFor('armor', 'copper'), armorIconFor('legsArmor', 'copper'),
    armorIconFor('armor', 'iron'), armorIconFor('legsArmor', 'iron')];
  for (const u of urls) { if (!u) continue; const i = new Image(); i.src = u; _warm.push(i); }
}

const chestCount = () => {
  const S = getState();
  return (S && S.rpg && S.rpg.inventory && S.rpg.inventory.daily_chest) || 0;
};
const chestLive = () => {
  const S = getState();
  return !!(S && S._serverCaps && S._serverCaps.dailyChest);
};

const Frame = ({ frame, shaking }) => (
  <div data-chest-frame={frame} style={{
    width: 176, height: 176, margin: '0 auto',
    backgroundImage: `url(${DAILY_CHEST_STRIP})`,
    backgroundSize: `${DAILY_CHEST_FRAMES * 100}% 100%`,
    backgroundPosition: `${(frame / (DAILY_CHEST_FRAMES - 1)) * 100}% 0`,
    backgroundRepeat: 'no-repeat',
    animation: shaking ? 'btChestWobble .18s linear infinite' : 'btChestBob 2.4s ease-in-out infinite',
  }} />
);

export const ChestReveal = () => {
  const [bus, setBus] = useState(chestRevealBus.get());
  const [stage, setStage] = useState('closed');   /* offer | shaking | opening | reveal | error */
  const [frame, setFrame] = useState(0);
  const [, tick] = useState(0);
  const prizeRef = useRef(null);
  const shakeAtRef = useRef(0);
  const offeredRef = useRef(false);
  const timers = useRef([]);
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.current.push(t); return t; };
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  useEffect(() => { warmPrizeIcons(); return chestRevealBus.subscribe(setBus); }, []);
  useEffect(() => () => clearTimers(), []);

  /* The login offer: once per session, after the intro, when a chest waits. */
  useEffect(() => {
    const id = setInterval(() => {
      tick((n) => n + 1);
      if (offeredRef.current) return;
      const S = getState();
      if (!S || !S.__introLiftedAt || S._zoneLoading || S._netHold) return;
      if (chestCount() > 0 && chestLive()) { offeredRef.current = true; chestRevealBus.open(false); }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const claim = () => {
    const S = getState();
    if (!S || !S.channel || chestCount() <= 0) return;
    clearTimers();
    prizeRef.current = null;
    shakeAtRef.current = Date.now();
    setStage('shaking');
    const opId = 'chest:' + (S.myId || 'me') + ':' + Date.now();
    try { S.channel.send({ type: 'chest_open', payload: { invKey: 'daily_chest', opId } }); } catch (e) { /* timeout below */ }
    later(() => { if (!prizeRef.current) setStage('error'); }, ANSWER_TIMEOUT_MS);
  };

  /* React to the bus: opening, and the worker's answer. */
  useEffect(() => {
    if (!bus.open) { clearTimers(); setStage('closed'); return; }
    if (stage === 'closed') {
      if (bus.claimNow) claim(); else setStage('offer');
    }
  }, [bus.open, bus.seq]);
  useEffect(() => {
    const p = bus.prize;
    if (!p || p === prizeRef.current) return;
    prizeRef.current = p;
    const wait = Math.max(0, SHAKE_MIN_MS - (Date.now() - shakeAtRef.current));
    later(() => {
      setStage('opening');
      for (let f = 3; f < DAILY_CHEST_FRAMES; f++) later(() => setFrame(f), (f - 3) * FRAME_MS);
      later(() => setStage('reveal'), (DAILY_CHEST_FRAMES - 3) * FRAME_MS + 60);
    }, wait);
  }, [bus.prize]);

  /* The shake loop: 0, 1, 2, 1 ... */
  useEffect(() => {
    if (stage !== 'shaking') return undefined;
    const seq = [0, 1, 2, 1];
    let i = 0;
    const id = setInterval(() => { setFrame(seq[i++ % seq.length]); }, 90);
    return () => clearInterval(id);
  }, [stage]);
  useEffect(() => { if (stage === 'offer' || stage === 'error') setFrame(0); }, [stage]);

  if (stage === 'closed' || !bus.open) return null;
  const n = chestCount();
  const p = prizeRef.current;
  const q = p && p.kind === 'armor' && p.piece ? p.piece.quality : null;
  const tone = (q && QUALITY_COLOR[q]) || COL.accent;
  const icon = prizeIcon(p);
  const close = () => chestRevealBus.close();

  return (
    <div data-chest-window={stage} onPointerDown={(e) => { if (e.target === e.currentTarget && stage !== 'shaking' && stage !== 'opening') close(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(8,12,14,.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <style>{'@keyframes btChestBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}'
        + '@keyframes btChestWobble{0%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}100%{transform:rotate(-2deg)}}'
        + '@keyframes btPrizeRise{0%{transform:translate(-50%,40px) scale(.3);opacity:0}60%{opacity:1}100%{transform:translate(-50%,-64px) scale(1);opacity:1}}'
        + '@keyframes btPrizeText{0%{opacity:0;transform:translateY(6px)}100%{opacity:1;transform:none}}'}</style>
      <div style={{
        width: 300, maxWidth: '100%', boxSizing: 'border-box', padding: '14px 16px 16px', borderRadius: 14,
        background: COL.bg, border: `2px solid ${stage === 'reveal' ? tone : COL.edgeWarm}`,
        boxShadow: `0 10px 34px rgba(0,0,0,.6)${stage === 'reveal' ? `, 0 0 26px ${tone}55` : ''}`,
        textAlign: 'center', fontFamily: 'Source Sans 3, sans-serif',
      }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: COL.accent }}>
          Daily chest{n > 1 && stage !== 'reveal' ? ` ×${n}` : ''}
        </div>
        <div style={{ position: 'relative', marginTop: 4 }}>
          <Frame frame={frame} shaking={stage === 'shaking'} />
          {stage === 'reveal' && icon && (
            <img src={icon} alt="" draggable={false} data-chest-prize-icon="" style={{
              position: 'absolute', left: '50%', top: 64, width: 72, height: 72, objectFit: 'contain',
              filter: `drop-shadow(0 0 10px ${tone})`,
              animation: 'btPrizeRise .55s cubic-bezier(.2,.9,.3,1.2) forwards',
            }} />
          )}
        </div>
        {stage === 'reveal' ? (
          <div data-chest-reveal={p && p.kind} style={{ animation: 'btPrizeText .35s ease-out .25s both' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: tone, marginTop: 2 }}>{prizeText(p)}</div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: COL.text2, minHeight: 20, marginTop: 2 }}>
            {stage === 'offer' ? (n > 1 ? `You have ${n} chests waiting.` : 'Your daily chest is here.')
              : stage === 'error' ? 'The chest would not open — try again.'
              : 'Opening…'}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {(stage === 'offer' || stage === 'error') && (
            <>
              <button onClick={close} style={secondaryBtn}>Later</button>
              <button onClick={claim} data-chest-claim="" className="button-primary" disabled={n <= 0}
                style={{ flex: 1, minHeight: 44, fontSize: 14, touchAction: 'manipulation' }}>Claim</button>
            </>
          )}
          {stage === 'reveal' && (
            <>
              <button onClick={close} style={n > 0 ? secondaryBtn : { ...secondaryBtn, flex: 1 }} data-chest-done="">Done</button>
              {n > 0 && (
                <button onClick={claim} data-chest-claim="" className="button-primary"
                  style={{ flex: 1, minHeight: 44, fontSize: 14, touchAction: 'manipulation' }}>Claim next ({n})</button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const secondaryBtn = {
  minHeight: 44, padding: '0 16px', borderRadius: 10, cursor: 'pointer', touchAction: 'manipulation',
  background: COL.raised, color: COL.text2, border: `1px solid ${COL.borderStrong}`,
  fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
};
