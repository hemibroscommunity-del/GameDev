import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { BT_AUDIO } from '@/data/index.js';
import {
  dailyRewardsBus, spinLive, askSpin, coinsShort, untilText,
} from '@/game/dailyRewards.js';

/* ═══ v2.3.3125: THE FREE DAILY SPIN, AT THE GAMBLING DEN ═══
 *
 * Owner, 2026-10-06: "Personally I find the login page with the chest
 * intrusive.  I'd rather have it be something like a free daily spin from
 * the gambling building where you can win quite good rewards but it's rare."
 * And its twist, after a first cut that climbed a doubling ladder: "Your
 * first spin is for a lump sum award.  You have a rare chance at a high lump
 * sum in gold.  Then you have the option of spinning it for double or
 * nothing at 50% odds and that continues on."
 *
 * So the top of the Gambling Den's window is a PRIZE WHEEL: eight slices, one
 * a lump sum (the worker's `spin.prizes`, raised by the login streak), the
 * rare ones coloured by rarity and the jackpot brass.  SPIN lands on one: that
 * is your POT, not yet paid.  Then two buttons: TAKE IT, or DOUBLE OR NOTHING
 * -- the wheel turns into the coin's own (half x2, half ✕) and spins again:
 * x2 doubles the pot, ✕ loses it all.  Again and again, until you take it,
 * lose it, or reach the house limit (paid by itself).  One free spin a day;
 * bonus spins (all three daily quests, the season) start more.  A pot left
 * open is paid at the day's end, never lost (the worker's rollover).
 *
 * The slices are drawn the same size, as a fairground wheel's are; the real
 * odds are the worker's weights, and the line under the pot prints them
 * ("1 in 1,000 the 10,000 jackpot").
 *
 * NOTHING HERE ROLLS OR PAYS.  A tap sends `daily_spin {act}`; the worker
 * rolls, settles and answers with a `rewards_state` whose `news` is the act
 * (server/src/dailyrewards.js).  The wheel turns while it waits and LANDS on
 * the answer -- the prize's own slice, or an x2 / ✕ -- and what the panel says
 * is held back until then (`beforeRef`), so the words never give it away.
 * Coins arrive on the player_state echo (rule 20).  No answer in 8 s and the
 * wheel stops and says so; an unanswered ask spends nothing.
 *
 * Drawn in code: a conic-gradient wheel, labels kept upright by turning them
 * back as the wheel turns, a CSS pointer.  No art to load, so nothing to
 * preload (CLAUDE.md's preload law), and nothing held in memory when the
 * window is shut. */

const LS = {
  txt1: '#F4F0E7', txt2: '#B6C1BE', txt3: '#8D9B98', dis: '#667875',
  panel: '#1E2E34', strip: '#27393F', raised: '#293B41', well: '#111E23',
  border: 'rgba(229,237,233,.11)', borderStrong: 'rgba(229,237,233,.20)',
  brass: '#D8AA58', brassFill: 'rgba(216,170,88,.15)', onBrass: '#172126',
  win: '#59BF91', lose: '#D95C54',
};
const SLICES = 8;
const SLICE = 360 / SLICES;
const WAIT_DEG_PER_S = 720;       /* while the worker answers */
const LAND_MS = 1500;             /* the ease-out onto the answer */
const EASE = 'cubic-bezier(.12,.75,.18,1)';
const ANSWER_TIMEOUT_MS = 8000;
const WHEEL = 128;

/* The prize wheel's slices, clockwise from the pointer: big and small
   interleaved, as a fairground wheel's are.  ORDER[j] is the prize (an index
   into the worker's `spin.prizes`, smallest first) on slice j. */
const ORDER = [0, 4, 1, 5, 2, 6, 3, 7];
/* A prize's slice by rarity: the everyday four two slates, then teal, blue,
   purple and the jackpot's brass. */
const PRIZE_FILL = ['#34494F', '#27393F', '#34494F', '#27393F', '#2B6A61', '#2F5A87', '#664A8E', LS.brass];
const PRIZE_INK = [LS.txt1, LS.txt1, LS.txt1, LS.txt1, LS.txt1, LS.txt1, LS.txt1, LS.onBrass];
/* The double wheel: x2 on the even slices, ✕ on the odd. */
const isDoubleSlice = (j) => j % 2 === 0;

function useRewards() {
  return useSyncExternalStore(dailyRewardsBus.subscribe, dailyRewardsBus.get, dailyRewardsBus.get);
}

function play(key, opts) { try { BT_AUDIO.play(key, opts); } catch (e) { /* a sound never breaks the spin */ } }

const fmt = (n) => Math.max(0, Math.floor(Number(n) || 0)).toLocaleString('en-US');

/* The wheel at `rot` degrees.  `face` 'prize' wears the eight lump sums,
   'double' the coin's x2 and ✕.  Its labels are kept upright by turning each
   one back by as much as the wheel turns (here, and on every frame by
   applyRot) -- the first cut set "WIN" round the rim, and on the lower half
   it read "NIM".  The transforms are also written here so a label made new
   (a face change) starts where the wheel is; React rewrites them only with
   the angle applyRot last set, so a turn in progress is never cut short. */
const Wheel = React.forwardRef(function Wheel({ face, prizes, rot }, ref) {
  const stops = [];
  const labels = [];
  for (let j = 0; j < SLICES; j++) {
    let fill;
    let ink;
    let text;
    if (face === 'double') {
      fill = isDoubleSlice(j) ? LS.brass : LS.strip;
      ink = isDoubleSlice(j) ? LS.onBrass : LS.txt3;
      text = isDoubleSlice(j) ? 'x2' : '✕';
    } else {
      const p = ORDER[j];
      fill = PRIZE_FILL[p] || LS.strip;
      ink = PRIZE_INK[p] || LS.txt1;
      text = prizes && prizes[p] ? coinsShort(prizes[p].c) : '';
    }
    stops.push(fill + ' ' + (j * SLICE) + 'deg ' + ((j + 1) * SLICE) + 'deg');
    /* the slice's middle, a little in from the rim */
    const a = (j * SLICE + SLICE / 2) * Math.PI / 180;
    const r = WHEEL / 2 - 23;
    labels.push(
      <span key={face + j} data-slab="1" aria-hidden="true" style={{
        position: 'absolute', left: WHEEL / 2 - 3 + Math.sin(a) * r, top: WHEEL / 2 - 3 - Math.cos(a) * r,
        fontSize: face === 'double' ? 13 : 11, fontWeight: 800, lineHeight: 1, whiteSpace: 'nowrap',
        color: ink, pointerEvents: 'none', fontVariantNumeric: 'tabular-nums',
        textShadow: ink === LS.txt1 ? '0 1px 1px rgba(0,0,0,.55)' : 'none',
        transform: 'translate(-50%, -50%) rotate(' + (-rot) + 'deg)',
      }}>{text}</span>,
    );
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
      <div ref={ref} data-spin-wheel="1" data-face={face} data-order={ORDER.join(',')} style={{
        position: 'absolute', left: 0, top: 8, width: WHEEL, height: WHEEL,
        borderRadius: '50%',
        background: 'conic-gradient(' + stops.join(', ') + ')',
        border: '3px solid ' + LS.borderStrong,
        boxShadow: 'inset 0 0 0 2px rgba(0,0,0,.25), 0 2px 6px rgba(0,0,0,.45)',
        boxSizing: 'border-box',
        willChange: 'transform',
        transform: 'rotate(' + rot + 'deg)',
      }}>
        {labels}
        <div aria-hidden="true" style={{
          position: 'absolute', left: '50%', top: '50%', width: 22, height: 22, marginLeft: -11, marginTop: -11,
          borderRadius: '50%', background: LS.panel, border: '2px solid ' + LS.brass, boxSizing: 'border-box',
        }} />
      </div>
    </div>
  );
});

/* Where to stop so slice j's middle (give or take a little) sits under the
   pointer, at least a turn and a half on from `now`. */
function landAngle(now, j, jitter) {
  const centre = j * SLICE + SLICE / 2 + (jitter || 0) * SLICE;
  let target = now - (((now % 360) + 360) % 360) + 360 * 2 + ((360 - centre) % 360);
  while (target - now < 540) target += 360;
  return target;
}

export function DailySpin() {
  const st = useRewards();
  const wheelRef = useRef(null);
  const rotRef = useRef(0);          /* the wheel's angle, degrees */
  const rafRef = useRef(0);
  const askedAtRef = useRef(0);
  const actRef = useRef('spin');     /* the act in flight */
  /* what the panel showed when the act was asked -- held until the wheel
     LANDS, because the worker's answer (and its new pot) arrives while the
     wheel is still turning, and showing it then would give it away */
  const beforeRef = useRef(null);
  const timeoutRef = useRef(0);
  const landTimerRef = useRef(0);
  const [phase, setPhase] = useState('idle');   /* idle | waiting | landing */
  const [shown, setShown] = useState(null);     /* the news being shown */
  const [face, setFace] = useState('prize');
  const [, tick] = useState(0);
  /* The first time there is a wheel to draw: a pot already open (the window
     shut and opened again) rests where it landed -- the prize's slice, or an
     x2 once doubled.  Once, before that draw, so the wheel never jumps. */
  const placedRef = useRef(false);
  if (!placedRef.current && st && st.spin && st.spin.on) {
    placedRef.current = true;
    const sp0 = st.spin;
    if (sp0.open && sp0.k > 0) { rotRef.current = 360 - SLICE / 2; if (face !== 'double') setFace('double'); }
    else if (sp0.open) rotRef.current = (360 - (Math.max(0, ORDER.indexOf(sp0.i)) * SLICE + SLICE / 2)) % 360;
  }

  /* the countdown to the next free spin reads once a second */
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(id); }, []);
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    clearTimeout(timeoutRef.current);
    clearTimeout(landTimerRef.current);
  }, []);

  /* The wheel to `deg`, over `ms` (0: at once) -- and every label turned
     back by as much, on the same curve, so they stay upright all the way. */
  const applyRot = (deg, ms) => {
    rotRef.current = deg;
    const el = wheelRef.current;
    if (!el) return;
    const tr = ms ? 'transform ' + ms + 'ms ' + EASE : 'none';
    el.style.transition = tr;
    el.style.transform = 'rotate(' + deg + 'deg)';
    const labs = el.querySelectorAll('[data-slab]');
    for (let i = 0; i < labs.length; i++) {
      labs[i].style.transition = tr;
      labs[i].style.transform = 'translate(-50%, -50%) rotate(' + (-deg) + 'deg)';
    }
  };

  /* The answer: land on it, then show it.  Read from the bus's own copy of
     the last spin answer, not `st.news`: a quest's news landing in the same
     frame would replace it before this ran, and the wheel would wait out its
     8 s for an answer that came. */
  useEffect(() => {
    if (phase !== 'waiting') return;
    const ls = dailyRewardsBus.lastSpin();
    if (!ls || ls.at < askedAtRef.current) return;
    const n = ls.news;
    cancelAnimationFrame(rafRef.current);
    clearTimeout(timeoutRef.current);
    const log = () => {
      try { if (typeof window !== 'undefined' && window.__btProbe) (window.__btSpinLog || (window.__btSpinLog = [])).push({ at: Date.now(), act: n.act, i: n.i, won: n.won, k: n.k, pot: n.pot, paid: n.paid || 0, lost: n.lost || 0, top: !!n.top, refused: n.refused || null, face: wheelRef.current && wheelRef.current.getAttribute('data-face') }); } catch (e) { /* probe only */ }
    };
    if (n.refused) {
      applyRot(rotRef.current, 0);
      beforeRef.current = null;
      setPhase('idle');
      setShown({ refused: n.refused, act: n.act });
      log();
      return;
    }
    if (n.act === 'collect') {
      /* taking turns nothing: the coins, and the words */
      beforeRef.current = null;
      setPhase('idle');
      setShown({ ...n, at: Date.now() });
      play('coin-pickup', { vol: 0.6 });
      if ((n.paid || 0) >= 1000) setTimeout(() => play('quest-complete-v2', { vol: 0.45 }), 160);
      log();
      return;
    }
    let j;
    if (n.act === 'spin') {
      j = Math.max(0, ORDER.indexOf(n.i));
    } else {
      const want = [];
      for (let q = 0; q < SLICES; q++) if (isDoubleSlice(q) === !!n.won) want.push(q);
      j = want[Math.floor(Math.random() * want.length)];
    }
    setPhase('landing');
    applyRot(landAngle(rotRef.current, j, (Math.random() - 0.5) * 0.6), LAND_MS);
    landTimerRef.current = setTimeout(() => {
      beforeRef.current = null;
      setPhase('idle');
      setShown({ ...n, at: Date.now() });
      if (n.act === 'spin') {
        play(n.jackpot ? 'level-up' : 'flip-win', { vol: 0.55 });
      } else if (n.won) {
        play(n.top ? 'level-up' : 'flip-win', { vol: 0.55 });
        if (n.top) setTimeout(() => play('coin-pickup', { vol: 0.6 }), 160);
      } else {
        play('flip-lose', { vol: 0.5 });
      }
      log();
    }, LAND_MS + 40);
  }, [st, phase]);

  if (!spinLive() || !st || !st.spin || !st.spin.on) return null;
  const running = phase !== 'idle';
  const live = st.spin;
  /* while an act is in flight, the panel as it was asked */
  const sp = running && beforeRef.current ? beforeRef.current : live;
  const prizes = Array.isArray(live.prizes) ? live.prizes : [];
  const canStart = !!(sp.ready || sp.extra > 0);

  const ask = (act) => {
    if (running) return;
    if (act === 'spin' && (sp.open || !canStart)) return;
    if (act !== 'spin' && !sp.open) return;
    if (act === 'double' && !sp.canDouble) return;
    setShown(null);
    askedAtRef.current = Date.now();
    actRef.current = act;
    beforeRef.current = { ...live };
    if (!askSpin(act)) { beforeRef.current = null; return; }
    setPhase('waiting');
    timeoutRef.current = setTimeout(() => {
      cancelAnimationFrame(rafRef.current);
      beforeRef.current = null;
      setPhase('idle');
      setShown({ timeout: true });
    }, ANSWER_TIMEOUT_MS);
    if (act === 'collect') return;
    if (act === 'spin') setFace('prize');
    else setFace('double');
    play('coin-flip', { vol: 0.45 });
    /* turn while the worker answers */
    let last = performance.now();
    const step = (t) => {
      const dt = Math.min(64, t - last);
      last = t;
      applyRot(rotRef.current + WAIT_DEG_PER_S * dt / 1000, 0);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  };

  /* the odds, from the worker's own weights: "Rare: 1 in 25 lands 1,000+,
     1 in 1,000 the 10,000 jackpot." */
  let rare = '';
  if (prizes.length >= 4) {
    const tot = prizes.reduce((t, p) => t + (p.w || 0), 0);
    const top = prizes[prizes.length - 1];
    const big = prizes.slice(-3);
    const bigW = big.reduce((t, p) => t + (p.w || 0), 0);
    if (tot > 0 && bigW > 0 && top.w > 0) {
      rare = 'Rare: 1 in ' + fmt(Math.round(tot / bigW)) + ' lands ' + fmt(big[0].c) + '+, 1 in ' + fmt(Math.round(tot / top.w)) + ' the ' + fmt(top.c) + ' jackpot.';
    }
  }
  const act = actRef.current;
  const potOpen = !!sp.open && sp.pot > 0;

  /* the words beside the wheel */
  let line;
  let tone = LS.txt2;
  if (shown && shown.timeout) line = 'The wheel didn\'t hear back. Nothing was spent — try again.';
  else if (shown && shown.refused === 'none') line = 'No spins left today.';
  else if (shown && shown.refused === 'open') line = 'Take your pot or double it first.';
  else if (shown && shown.refused === 'limit') line = 'That\'s the house limit — take it!';
  else if (shown && shown.refused) line = 'Nothing to take.';
  else if (running && act === 'collect') line = 'Taking ' + fmt(sp.pot) + '…';
  else if (running && act === 'double') line = 'Double or nothing…';
  else if (running) line = 'Spinning…';
  else if (shown && shown.act === 'spin') { line = (shown.jackpot ? 'JACKPOT! ' : 'You won ') + fmt(shown.pot) + ' coins!'; tone = LS.win; }
  else if (shown && shown.act === 'double' && shown.won && shown.top) { line = 'Doubled! ' + fmt(shown.pot) + ' — the house limit, paid!'; tone = LS.win; }
  else if (shown && shown.act === 'double' && shown.won) { line = 'Doubled! ' + fmt(shown.pot) + ' coins.'; tone = LS.win; }
  else if (shown && shown.act === 'double') { line = 'Lost it all — ' + fmt(shown.lost) + ' coins.'; tone = LS.lose; }
  else if (shown && shown.act === 'collect') { line = '+' + fmt(shown.paid) + ' coins!'; tone = LS.win; }
  else if (potOpen) line = 'Your pot: ' + fmt(sp.pot) + ' coins.';
  else if (sp.ready) line = 'Free today! Spin for a lump sum of coins.';
  else if (sp.extra > 0) line = 'You have ' + sp.extra + ' bonus spin' + (sp.extra === 1 ? '' : 's') + '.';
  else line = 'Today\'s spin is done.';

  /* the small line under it */
  let sub;
  if (potOpen && sp.canDouble) sub = 'Take it, or double or nothing: 50% to make it ' + fmt(sp.pot * 2) + ', 50% to lose it.';
  else if (potOpen) sub = 'The house limit is ' + fmt(sp.limit) + '. Take it!';
  else if (!canStart && !running) sub = 'Next free spin in ' + untilText(st.resetAt, st) + '.';
  else sub = rare;

  let label;
  if (running && act === 'spin') label = 'Spinning…';
  else if (sp.ready) label = 'Spin · free';
  else if (sp.extra > 0) label = 'Use a bonus spin (' + sp.extra + ')';
  else label = 'Next free spin in ' + untilText(st.resetAt, st);

  const streakPct = Math.round(((Number(live.mult) || 1) - 1) * 100);
  const btnBase = {
    minHeight: 44, padding: '6px 4px', borderRadius: 10, boxSizing: 'border-box',
    fontSize: 13, fontWeight: 700, letterSpacing: '.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2,
  };
  const off = { cursor: 'default', border: '1px solid ' + LS.border, background: '#1A292F', color: LS.txt3 };

  return (
    <div data-daily-spin={potOpen ? 'open' : (sp.ready ? 'ready' : (sp.extra > 0 ? 'bonus' : 'done'))}
      style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid ' + LS.border }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: LS.txt3 }}>Free daily spin</div>
        {st.streak && st.streak.n > 1 && (
          <div data-spin-streak={st.streak.n} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: LS.txt2, fontVariantNumeric: 'tabular-nums' }}>
            <img src="/icons/ui/elem-flame.webp" alt="" draggable={false} style={{ width: 14, height: 14, objectFit: 'contain' }} />
            {st.streak.n}-day streak{streakPct > 0 ? ' · +' + streakPct + '%' : ''}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
        <Wheel ref={wheelRef} face={face} prizes={prizes} rot={rotRef.current} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {potOpen && (
            <div data-spin-pot={sp.pot} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: LS.txt3 }}>Pot</span>
              <img src="/icons/ui/cur-gold.webp" alt="" draggable={false} style={{ width: 18, height: 18, objectFit: 'contain' }} />
              <span style={{ fontSize: 22, fontWeight: 800, color: LS.brass, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{fmt(sp.pot)}</span>
            </div>
          )}
          <div data-spin-line="1" aria-live="polite" style={{ fontSize: 13.5, lineHeight: 1.35, color: tone, fontWeight: tone === LS.txt2 ? 600 : 700 }}>{line}</div>
          {sub && (
            <div data-spin-sub="1" style={{ fontSize: 11.5, lineHeight: 1.4, color: LS.txt3, marginTop: 4 }}>{sub}</div>
          )}
        </div>
      </div>
      {potOpen ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
          <button
            type="button"
            data-spin-take="1"
            className={!running ? 'button-primary' : undefined}
            disabled={running}
            onClick={() => ask('collect')}
            style={{ ...btnBase, ...(running ? off : { cursor: 'pointer' }) }}>
            Take {fmt(sp.pot)}
          </button>
          <button
            type="button"
            data-spin-double="1"
            disabled={running || !sp.canDouble}
            onClick={() => ask('double')}
            style={{
              ...btnBase,
              ...(running || !sp.canDouble ? off : { cursor: 'pointer', border: '1.5px solid ' + LS.brass, background: LS.brassFill, color: LS.brass }),
            }}>
            {sp.canDouble ? (
              <>
                <span style={{ display: 'block' }}>Double or nothing</span>
                <span style={{ display: 'block', fontSize: 11, fontWeight: 600, opacity: 0.85, marginTop: 1 }}>50% for {fmt(sp.pot * 2)}</span>
              </>
            ) : 'House limit'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          data-spin-btn="1"
          className={!running && canStart ? 'button-primary' : undefined}
          disabled={running || !canStart}
          onClick={() => ask('spin')}
          style={{
            ...btnBase, width: '100%', marginTop: 8, padding: '10px 0',
            ...(running || !canStart ? off : { cursor: 'pointer' }),
          }}>{label}</button>
      )}
      {sp.extra > 0 && (potOpen || sp.ready) && (
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
