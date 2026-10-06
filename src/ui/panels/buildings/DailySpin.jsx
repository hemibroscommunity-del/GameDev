import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { BT_AUDIO } from '@/data/index.js';
import {
  dailyRewardsBus, spinLive, askSpin, coinsShort, untilText,
} from '@/game/dailyRewards.js';

/* ═══ v2.3.3109: THE FREE DAILY SPIN, AT THE GAMBLING DEN ═══
 *
 * Owner, 2026-10-06: "Personally I find the login page with the chest
 * intrusive.  I'd rather have it be something like a free daily spin from
 * the gambling building where you can win quite good rewards but it's rare.
 * Like a layered reward spin system where the first win has a 50% chance and
 * it continues further spins at a 50% win chance and the rewards double each
 * time."
 *
 * So the top of the Gambling Den's window is a wheel, half WIN and half MISS
 * (eight slices, the coin's own odds), and a LADDER of ten prizes, each double
 * the one before.  SPIN: a win lights the next rung and pays it at once; SPIN
 * AGAIN climbs on; the first miss ends the run and you keep the rung you
 * reached.  One free run a day; bonus spins (from finishing all three daily
 * quests, and from the season) start more.
 *
 * NOTHING HERE ROLLS OR PAYS.  The tap sends `daily_spin`; the worker rolls,
 * pays and answers with a `rewards_state` whose `news` is the spin
 * (server/src/dailyrewards.js).  The wheel turns while it waits and LANDS on
 * a slice of the answer's colour; the coins arrive on the player_state echo
 * (rule 20).  No answer in 8 s and the wheel stops and says so -- nothing
 * was taken, because nothing is ever taken by a spin.
 *
 * Drawn in code: a conic-gradient wheel, a CSS pointer, chips for the ladder
 * (Lantern Slate's pills: brass fill for a rung reached, a brass edge for the
 * next one).  No art to load, so nothing to preload (CLAUDE.md's preload
 * law), and nothing held in memory when the window is shut. */

const LS = {
  txt1: '#F4F0E7', txt2: '#B6C1BE', txt3: '#8D9B98', dis: '#667875',
  panel: '#1E2E34', strip: '#27393F', raised: '#293B41', well: '#111E23',
  border: 'rgba(229,237,233,.11)', borderStrong: 'rgba(229,237,233,.20)',
  brass: '#D8AA58', brassFill: 'rgba(216,170,88,.15)', onBrass: '#172126',
  win: '#59BF91', lose: '#D95C54',
};
const SLICES = 8;                 /* alternating WIN / MISS, from the top */
const SLICE = 360 / SLICES;
const WAIT_DEG_PER_S = 720;       /* while the worker answers */
const LAND_MS = 1500;             /* the ease-out onto the answer */
const ANSWER_TIMEOUT_MS = 8000;
const WHEEL = 112;

function useRewards() {
  return useSyncExternalStore(dailyRewardsBus.subscribe, dailyRewardsBus.get, dailyRewardsBus.get);
}

function play(key, opts) { try { BT_AUDIO.play(key, opts); } catch (e) { /* a sound never breaks the spin */ } }

const isWinSlice = (j) => j % 2 === 0;

/* The wheel: gold WIN slices wearing a coin, slate MISS slices a ✕.  A coin
   and a cross read the same at any angle -- the first cut set "WIN" round the
   rim, and on the lower half it read "NIM". */
const Wheel = React.forwardRef(function Wheel(props, ref) {
  const stops = [];
  for (let j = 0; j < SLICES; j++) {
    const c = isWinSlice(j) ? LS.brass : LS.strip;
    stops.push(c + ' ' + (j * SLICE) + 'deg ' + ((j + 1) * SLICE) + 'deg');
  }
  return (
    <div style={{ position: 'relative', width: WHEEL, height: WHEEL + 8, flex: 'none' }}>
      {/* the pointer, over the top of the wheel */}
      <div aria-hidden="true" style={{
        position: 'absolute', left: WHEEL / 2 - 8, top: 0, zIndex: 2,
        width: 0, height: 0,
        borderLeft: '8px solid transparent', borderRight: '8px solid transparent',
        borderTop: '13px solid ' + LS.txt1,
        filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.6))',
      }} />
      <div ref={ref} data-spin-wheel="1" style={{
        position: 'absolute', left: 0, top: 8, width: WHEEL, height: WHEEL,
        borderRadius: '50%',
        background: 'conic-gradient(' + stops.join(', ') + ')',
        border: '3px solid ' + LS.borderStrong,
        boxShadow: 'inset 0 0 0 2px rgba(0,0,0,.25), 0 2px 6px rgba(0,0,0,.45)',
        boxSizing: 'border-box',
        willChange: 'transform',
      }}>
        {Array.from({ length: SLICES }, (_, j) => {
          /* the slice's middle, a little in from the rim */
          const a = (j * SLICE + SLICE / 2) * Math.PI / 180;
          const r = WHEEL / 2 - 24;
          const x = WHEEL / 2 - 3 + Math.sin(a) * r;
          const y = WHEEL / 2 - 3 - Math.cos(a) * r;
          return isWinSlice(j) ? (
            <img key={j} src="/icons/ui/cur-gold.webp" alt="" draggable={false} aria-hidden="true" style={{
              position: 'absolute', left: x - 9, top: y - 9, width: 18, height: 18, objectFit: 'contain', pointerEvents: 'none',
            }} />
          ) : (
            <span key={j} aria-hidden="true" style={{
              position: 'absolute', left: x - 8, top: y - 9, width: 16, height: 18, lineHeight: '18px', textAlign: 'center',
              fontSize: 13, fontWeight: 800, color: LS.txt3, pointerEvents: 'none',
            }}>✕</span>
          );
        })}
        <div aria-hidden="true" style={{
          position: 'absolute', left: '50%', top: '50%', width: 22, height: 22, marginLeft: -11, marginTop: -11,
          borderRadius: '50%', background: LS.panel, border: '2px solid ' + LS.brass, boxSizing: 'border-box',
        }} />
      </div>
    </div>
  );
});

/* The ladder: ten rungs, each double the last; reached ones lit. */
function Ladder({ base, layers, k, nextOn }) {
  const rungs = [];
  for (let i = 1; i <= layers; i++) {
    const reached = i <= k;
    const next = nextOn && i === k + 1;
    rungs.push(
      <span key={i} data-spin-rung={i} data-reached={reached ? '1' : '0'} style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 28, padding: '0 4px', borderRadius: 999,
        fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
        background: reached ? LS.brass : (next ? LS.brassFill : LS.well),
        color: reached ? LS.onBrass : (next ? LS.brass : LS.txt3),
        border: '1px solid ' + (reached || next ? LS.brass : LS.border),
        boxSizing: 'border-box', minWidth: 0,
        transition: 'background 180ms, color 180ms',
      }}>{coinsShort(base * Math.pow(2, i - 1))}</span>,
    );
  }
  return (
    <div data-spin-ladder="1" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 4, margin: '8px 0' }}>
      {rungs}
    </div>
  );
}

export function DailySpin() {
  const st = useRewards();
  const wheelRef = useRef(null);
  const rotRef = useRef(0);          /* the wheel's angle, degrees */
  const rafRef = useRef(0);
  const askedAtRef = useRef(0);
  /* what the panel showed when the spin was asked -- held until the wheel
     LANDS, because the worker's answer (and its new rung) arrives while the
     wheel is still turning, and lighting the rung then would give it away */
  const beforeRef = useRef(null);
  const timeoutRef = useRef(0);
  const landTimerRef = useRef(0);
  const [phase, setPhase] = useState('idle');   /* idle | waiting | landing */
  const [shown, setShown] = useState(null);     /* the spin news being shown */
  const [, tick] = useState(0);

  /* the countdown to the next free spin reads once a second */
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(id); }, []);
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    clearTimeout(timeoutRef.current);
    clearTimeout(landTimerRef.current);
  }, []);

  const setRot = (deg, ms) => {
    rotRef.current = deg;
    const el = wheelRef.current;
    if (!el) return;
    el.style.transition = ms ? 'transform ' + ms + 'ms cubic-bezier(.12,.75,.18,1)' : 'none';
    el.style.transform = 'rotate(' + deg + 'deg)';
  };

  /* The answer: land on a slice of its colour, then show it. */
  useEffect(() => {
    if (phase !== 'waiting' || !st || !st.news || st.news.kind !== 'spin') return;
    if (!st._at || st._at < askedAtRef.current) return;
    const n = st.news;
    cancelAnimationFrame(rafRef.current);
    clearTimeout(timeoutRef.current);
    if (n.refused) { setRot(rotRef.current, 0); beforeRef.current = null; setPhase('idle'); setShown({ refused: true }); return; }
    /* a slice of the right colour, a little off its middle so it never
       looks placed */
    const want = [];
    for (let j = 0; j < SLICES; j++) if (isWinSlice(j) === !!n.won) want.push(j);
    const j = want[Math.floor(Math.random() * want.length)];
    const centre = j * SLICE + SLICE / 2 + (Math.random() - 0.5) * SLICE * 0.6;
    const now = rotRef.current;
    let target = now - (((now % 360) + 360) % 360) + 360 * 2 + ((360 - centre) % 360);
    while (target - now < 540) target += 360;
    setPhase('landing');
    setRot(target, LAND_MS);
    landTimerRef.current = setTimeout(() => {
      beforeRef.current = null;
      setPhase('idle');
      setShown({ ...n, at: Date.now() });
      if (n.won) {
        play(n.top ? 'level-up' : 'flip-win', { vol: 0.55 });
        setTimeout(() => play('coin-pickup', { vol: 0.5 }), 120);
      } else {
        play('flip-lose', { vol: 0.5 });
      }
      try { if (typeof window !== 'undefined' && window.__btProbe) (window.__btSpinLog || (window.__btSpinLog = [])).push({ at: Date.now(), won: !!n.won, k: n.k, paid: n.paid }); } catch (e) { /* probe only */ }
    }, LAND_MS + 40);
  }, [st, phase]);

  if (!spinLive() || !st || !st.spin || !st.spin.on) return null;
  const running = phase !== 'idle';
  const live = st.spin;
  const sp = running && beforeRef.current ? beforeRef.current : live;
  /* the ladder: the rungs this run has reached, and whether the next one is
     in play -- while turning, the run as it was asked; a run going on, its
     own; a run that just ended, its result (the next tap starts afresh);
     nothing ended just now and a spin to take, a fresh ladder; nothing left
     today, today's last result */
  let k;
  let nextOn;
  if (running && beforeRef.current) { k = beforeRef.current.k; nextOn = true; }
  else if (live.open) { k = live.k; nextOn = true; }
  else if (shown && shown.at) { k = shown.k || 0; nextOn = false; }
  else if (live.ready || live.extra > 0) { k = 0; nextOn = true; }
  else { k = live.k || 0; nextOn = false; }
  const canStart = sp.ready || sp.extra > 0;
  const can = !running && (sp.open || canStart);

  const spin = () => {
    if (!can) return;
    setShown(null);
    askedAtRef.current = Date.now();
    beforeRef.current = { ...st.spin, k: st.spin.open ? st.spin.k : 0 };
    if (!askSpin()) { beforeRef.current = null; return; }
    setPhase('waiting');
    play('coin-flip', { vol: 0.45 });
    /* turn while the worker answers */
    let last = performance.now();
    const step = (t) => {
      const dt = Math.min(64, t - last);
      last = t;
      setRot(rotRef.current + WAIT_DEG_PER_S * dt / 1000, 0);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    timeoutRef.current = setTimeout(() => {
      cancelAnimationFrame(rafRef.current);
      beforeRef.current = null;
      setPhase('idle');
      setShown({ timeout: true });
    }, ANSWER_TIMEOUT_MS);
  };

  const total = sp.base * Math.pow(2, Math.max(0, k - 1));
  const nextPrize = sp.base * Math.pow(2, k);
  /* what the streak adds to the first prize (the worker sends both) */
  const streakBonus = Math.max(0, (st.spin.base || 0) - (st.spin.base1 || st.spin.base || 0));

  /* the words under the title */
  let line;
  if (shown && shown.timeout) line = 'The wheel didn\'t hear back. Nothing was spent — try again.';
  else if (shown && shown.refused) line = 'No spins left today.';
  else if (running) line = 'Spinning for ' + nextPrize.toLocaleString('en-US') + '…';
  else if (shown && shown.won && shown.top) line = 'THE TOP! ' + (shown.total || 0).toLocaleString('en-US') + ' coins!';
  else if (shown && shown.won) line = 'WIN! ' + (shown.total || 0).toLocaleString('en-US') + ' coins so far. Spin again: 50% to make it ' + ((shown.total || 0) * 2).toLocaleString('en-US') + '.';
  else if (shown && !shown.won && shown.k > 0) line = 'Missed — you keep ' + (shown.base * Math.pow(2, shown.k - 1)).toLocaleString('en-US') + ' coins.';
  else if (shown && !shown.won) line = 'Missed. ' + (sp.extra > 0 ? 'You have a bonus spin.' : 'Better luck tomorrow!');
  else if (sp.open) line = 'You\'ve won ' + total.toLocaleString('en-US') + '. Spin again: 50% to make it ' + nextPrize.toLocaleString('en-US') + '.';
  else if (sp.ready) line = 'Free today! Win ' + sp.base + ' coins, and every win after doubles it.';
  else if (sp.extra > 0) line = 'You have ' + sp.extra + ' bonus spin' + (sp.extra === 1 ? '' : 's') + '.';
  else line = 'Today\'s spin is done. Next free spin in ' + untilText(st.resetAt, st) + '.';

  let label;
  if (running) label = 'Spinning…';
  else if (sp.open) label = 'Spin again · 50%';
  else if (sp.ready) label = 'Spin · free';
  else if (sp.extra > 0) label = 'Use a bonus spin (' + sp.extra + ')';
  else label = 'Next free spin in ' + untilText(st.resetAt, st);

  const tone = shown && shown.won ? LS.win : (shown && shown.won === false ? LS.lose : LS.txt2);

  return (
    <div data-daily-spin={sp.open ? 'open' : (sp.ready ? 'ready' : (sp.extra > 0 ? 'bonus' : 'done'))}
      style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid ' + LS.border }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: LS.txt3 }}>Free daily spin</div>
        {st.streak && st.streak.n > 1 && (
          <div data-spin-streak={st.streak.n} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: LS.txt2, fontVariantNumeric: 'tabular-nums' }}>
            <img src="/icons/ui/elem-flame.webp" alt="" draggable={false} style={{ width: 14, height: 14, objectFit: 'contain' }} />
            {st.streak.n}-day streak{streakBonus > 0 ? ' · +' + streakBonus : ''}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
        <Wheel ref={wheelRef} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div data-spin-line="1" aria-live="polite" style={{ fontSize: 13.5, lineHeight: 1.35, color: tone, fontWeight: shown && shown.won ? 700 : 600 }}>{line}</div>
          <div style={{ fontSize: 11.5, lineHeight: 1.4, color: LS.txt3, marginTop: 4 }}>
            Each spin is 50/50. A miss ends the run — you keep what you won.
          </div>
        </div>
      </div>
      <Ladder base={shown && shown.at && !live.open ? (shown.base || sp.base) : sp.base} layers={sp.layers} k={k} nextOn={nextOn} />
      <button
        type="button"
        data-spin-btn="1"
        className={can ? 'button-primary' : undefined}
        disabled={!can}
        onClick={spin}
        style={{
          width: '100%', minHeight: 44, padding: '10px 0', borderRadius: 10,
          fontSize: 13, fontWeight: 700, letterSpacing: '.03em', fontVariantNumeric: 'tabular-nums',
          cursor: can ? 'pointer' : 'default',
          border: can ? undefined : '1px solid ' + LS.border,
          background: can ? undefined : '#1A292F',
          color: can ? undefined : LS.txt3,
          opacity: 1,
        }}>{label}</button>
      {sp.extra > 0 && (sp.open || sp.ready) && (
        <div style={{ fontSize: 11.5, color: LS.txt3, textAlign: 'center', marginTop: 4 }}>
          {sp.extra} bonus spin{sp.extra === 1 ? '' : 's'} saved for later
        </div>
      )}
      <button
        type="button"
        data-open-daily="1"
        onClick={() => dailyRewardsBus.openWindow('today')}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          width: '100%', minHeight: 44, marginTop: 6, padding: '0 8px', borderRadius: 10,
          background: 'transparent', border: '1px solid ' + LS.border, color: LS.txt2,
          fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
        }}>
        Daily quests &amp; season <span aria-hidden="true" style={{ color: LS.brass }}>›</span>
      </button>
    </div>
  );
}
