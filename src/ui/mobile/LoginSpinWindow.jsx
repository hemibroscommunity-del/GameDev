import React, { useEffect, useRef, useState } from 'react';
import { getState } from './dash/common.js';
import { useModalGuard } from './modalGuardBus.js';
import { BT_AUDIO } from '@/data/index.js';
import { deskWords } from '@/game/deskWords.js';
import { flyPicture, questFlyTarget } from '@/game/questFly.js';
import { onSafeGround } from '@/game/trapping.js';
import { worldReady } from '@/ui/loadingGate.js';
import { onboardingBusy, worldInMs } from '@/ui/onboardingPace.js';
import { LOGIN_SPIN_URLS } from '@/rendering/loginSpinPreload.js';
import {
  loginSpinBus, loginSpinTarget, loginSpinEase, LOGIN_SPIN_MS, LOGIN_SPIN_TURNS,
  LOGIN_SPIN_UNSAFE_WORDS, loginDoubleTarget, LOGIN_DOUBLE_MS, loginSpinSegAt, loginSpinParty,
  LOGIN_SPIN_WINDUP_MS, LOGIN_SPIN_WINDUP_DEG, LOGIN_SPIN_OVER_DEG, LOGIN_SPIN_SETTLE_MS,
} from '@/game/loginSpinWheel.js';

/* ═══ v2.3.4285: THE LOGIN WHEEL'S WINDOW ═══
 *
 * Owner, 2026-11-05: "a 'free daily spin' you can see the gold amounts on the
 * wheel ... once you login to the game for the day.  One per account."  The
 * worker decides everything (server/src/loginspin.js): it rolls with the
 * picture's own segment angles, pays, and answers `loginspin_result {idx,
 * coins}`; this window only asks and then turns the wheel to land inside that
 * segment (a random spot in it, five turns, an eased stop that ends with the
 * sound's last click).  The pointer is its own layer and never turns.
 *
 * DOUBLE OR NOTHING (the owner's, 2026-11-05: "Keep the double or nothing
 * going until user chooses yes or no ... as many times as they want").  The
 * spin's prize is only a POT the worker holds.  After it lands the window
 * asks DOUBLE OR NOTHING? with YES and NO: NO collects (`loginspin_collect`),
 * YES asks the worker for a 50/50 (`loginspin_double {k}`, k the round, so a
 * double tap is never a second roll) and the little wheel turns to land on
 * the half the worker rolled -- coins (the slot machine pays out, the pot
 * doubles, the question comes back) or the skull (the buzzer, nothing).  A pot
 * a further double would carry past the house limit is paid by itself.
 * Closing (the X) while a pot is held is NO.
 *
 * WHEN.  Never over a loading screen (loadingGate.worldReady) and never over
 * a new character's first steps (onboardingPace.onboardingBusy): the host
 * below asks once the world is up, and opens when the worker says there is a
 * spin AND the screen is quiet.  Closing it without spinning keeps today's
 * spin for the next login that day (nothing is written until the spin).
 *
 * MEMORY.  The three pictures (wheel 640 px, pointer, title; 256 colours each)
 * are only fetched into the HTTP cache behind the loading screen
 * (preloadLoginSpin) and decoded when the window opens; they are dropped with
 * it.  Gated on caps.loginspin (an old worker: nothing). */

export const LOGIN_SPIN_ART = Object.freeze({
  wheel: LOGIN_SPIN_URLS[0], pointer: LOGIN_SPIN_URLS[1], title: LOGIN_SPIN_URLS[2],
  dWheel: LOGIN_SPIN_URLS[3], dPointer: LOGIN_SPIN_URLS[4], dPlate: LOGIN_SPIN_URLS[5], dYes: LOGIN_SPIN_URLS[6], dNo: LOGIN_SPIN_URLS[7],
  wheelPlain: LOGIN_SPIN_URLS[8], dWheelPlain: LOGIN_SPIN_URLS[9],
});
const Z = 9260;
const ASK_POLL_MS = 1000;
const ANSWER_TIMEOUT_MS = 8000;
const SETTLE_AFTER_WORLD_MS = 2500;
const DRUM_MS = 750;
const reduced = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };

/* v2.3.4285: the owner: "Make sure the wheel spin is satisfying it's supposed to be a dopamine hit."
   Wind-up and launch, a long eased stop with the divider flicking the pointer, a little overshoot,
   a burst of coins that grows with the prize, a pop and count-up of the gold.  Transforms and Web
   Animations only; a capped number of coins, each removed when it ends; nothing outlives the window.
   Under prefers-reduced-motion: no wind-up, flicks, coins or dimming. */
const KEYFRAMES = `
@keyframes btlsDim{from{opacity:1}to{opacity:0}}
@keyframes btlsPop{0%{transform:scale(.3);opacity:0}55%{transform:scale(1.35);opacity:1}100%{transform:scale(1)}}
@keyframes btlsShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-10px)}40%{transform:translateX(9px)}60%{transform:translateX(-6px)}80%{transform:translateX(4px)}}
@keyframes btlsFlash{0%{opacity:.75}100%{opacity:0}}
@keyframes btlsRays{to{transform:rotate(360deg)}}
@keyframes btlsDrum{0%,100%{transform:scale(1)}50%{transform:scale(1.035)}}
@keyframes btlsGlow{0%,100%{filter:drop-shadow(0 0 6px #ffd23a)}50%{filter:drop-shadow(0 0 24px #fff1a0)}}
@media (prefers-reduced-motion: reduce){.btls-lit{animation:none!important}.btls-plain{display:none!important}}
`;

/* coins thrown out of a box: `n` of them, each removed when its animation ends */
function coinBurst(box, n, shower) {
  if (!box || reduced() || !box.animate) return;
  const cnt = Math.min(60, n);
  for (let i = 0; i < cnt; i++) {
    const c = document.createElement('img');
    c.src = '/icons/coins/coin-1.png'; c.alt = ''; c.draggable = false;
    c.style.cssText = 'position:absolute;width:26px;height:26px;pointer-events:none;z-index:4;left:' + (shower ? Math.random() * 90 + '%' : '50%') + ';top:' + (shower ? '-8%' : '50%') + ';';
    box.appendChild(c);
    const ang = Math.random() * Math.PI * 2, dist = 90 + Math.random() * 120;
    const frames = shower
      ? [{ transform: 'translateY(0) rotate(0deg)', opacity: 1 }, { transform: 'translateY(' + (box.clientHeight * (1.1 + Math.random() * 0.2)) + 'px) rotate(' + (Math.random() * 720 - 360) + 'deg)', opacity: 1 }]
      : [{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 1 }, { transform: 'translate(calc(-50% + ' + Math.cos(ang) * dist + 'px), calc(-50% + ' + (Math.sin(ang) * dist - 40) + 'px)) scale(1)', opacity: 1, offset: 0.7 }, { transform: 'translate(calc(-50% + ' + Math.cos(ang) * dist + 'px), calc(-50% + ' + (Math.sin(ang) * dist + 60) + 'px)) scale(.8)', opacity: 0 }];
    const a = c.animate(frames, { duration: 900 + Math.random() * 600, delay: Math.random() * (shower ? 700 : 150), easing: 'ease-out', fill: 'both' });
    a.onfinish = () => { try { c.remove(); } catch (e) { /* gone */ } };
  }
}
/* "+N gold" counting up */
function countUp(el, from, to, ms, fmtFn) {
  if (!el) return;
  if (reduced()) { el.textContent = fmtFn(to); return; }
  const t0 = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - t0) / ms);
    if (!el.isConnected) return;
    el.textContent = fmtFn(Math.round(from + (to - from) * (1 - (1 - t) * (1 - t))));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* the owner: "only allow the wheel to spin if you're in a safe area" -- the Wheel's safe ground (the worker enforces it too) */
export const spinSafeNow = () => {
  const S = getState();
  if (!S || S.currentZone !== 'wheel' || !S.player) return true;
  try { return onSafeGround(S.player.x, S.player.y); } catch (e) { return true; }
};
const send = (type, payload) => {
  const S = getState();
  try { if (S && S.channel) { S.channel.send({ type, payload: payload || {} }); return true; } } catch (e) { /* the timeout tells */ }
  return false;
};

const fmt = (n) => Number(n).toLocaleString('en-US');

export const LoginSpinWindow = () => {
  const [bus, setBus] = useState(loginSpinBus.get());
  /* loading | ready | waiting | spinning | landed | ask | dwaiting | dspinning | dwon | dlost | done | error */
  const [stage, setStage] = useState('loading');
  const askedRef = useRef(false);
  const seenResult = useRef(null);
  const seenRound = useRef(null);
  const timers = useRef([]);
  const raf = useRef(0);
  const wheelEl = useRef(null);
  const dWheelEl = useRef(null);
  const dDeg = useRef(0);
  const ptrEl = useRef(null);
  const dPtrEl = useRef(null);
  const partyEl = useRef(null);
  const popEl = useRef(null);
  const [, tickSafe] = useState(0);
  const [fx, setFx] = useState(null);   /* 'win' | 'lose' | null: the celebration's lights */
  const mDeg = useRef(0);   /* the big wheel's rest angle: it comes back after a double */
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.current.push(t); return t; };

  useEffect(() => loginSpinBus.subscribe(setBus), []);
  useEffect(() => { if (!bus.open) return undefined; const id = setInterval(() => tickSafe((n) => n + 1), 400); return () => clearInterval(id); }, [bus.open]);
  /* the worker refused (not on safe ground): back to the button, explained by the words under it */
  useEffect(() => { if (bus.refused) setStage((s) => (s === 'waiting' ? 'ready' : s === 'dwaiting' ? 'ask' : s)); }, [bus.refused]);
  useEffect(() => () => { timers.current.forEach(clearTimeout); cancelAnimationFrame(raf.current); }, []);

  /* the host: ask once the world is up, open when it is quiet */
  useEffect(() => {
    const id = setInterval(() => {
      const S = getState();
      const b = loginSpinBus.get();
      if (b.open || !S || !S.channel || !S._serverCaps || !S._serverCaps.loginspin) return;
      if (!worldReady() || worldInMs() < SETTLE_AFTER_WORLD_MS) return;
      if (!askedRef.current) { askedRef.current = send('loginspin_ask'); return; }
      if (b.avail && !onboardingBusy() && spinSafeNow()) loginSpinBus.open();
    }, ASK_POLL_MS);
    return () => clearInterval(id);
  }, []);

  /* opening: decode the art, then show */
  useEffect(() => {
    if (!bus.open) { setStage('loading'); seenResult.current = null; seenRound.current = null; dDeg.current = 0; mDeg.current = 0; setFx(null); return undefined; }
    let dead = false;
    const imgs = Object.values(LOGIN_SPIN_ART).map((u) => { const i = new Image(); i.src = u; return i; });
    Promise.all(imgs.map((i) => (i.decode ? i.decode().catch(() => {}) : Promise.resolve()))).then(() => { if (!dead) setStage((s) => (s === 'loading' ? 'ready' : s)); });
    later(() => { if (!dead) setStage((s) => (s === 'loading' ? 'ready' : s)); }, 2500);
    return () => { dead = true; imgs.forEach((i) => { i.src = ''; }); };
  }, [bus.open, bus.seq]);

  useModalGuard(React, !!bus.open);

  const spin = () => {
    if (stage !== 'ready' || !spinSafeNow()) return;
    setStage('waiting');
    const S = getState();
    send('loginspin_go', { opId: 'loginspin:' + ((S && S.myId) || 'me') + ':' + Date.now() });
    later(() => { if (!seenResult.current) setStage((s) => (s === 'waiting' ? 'error' : s)); }, ANSWER_TIMEOUT_MS);
  };

  const flick = (el) => { try { if (el && el.animate && !reduced()) el.animate([{ transform: 'rotate(-22deg)' }, { transform: 'rotate(5deg)', offset: 0.6 }, { transform: 'rotate(0deg)' }], { duration: 150, easing: 'ease-out' }); } catch (e) { /* a missed flick */ } };

  /* the worker's answer to the spin: wind up, launch, a long eased stop (the divider flicks the pointer), settle */
  useEffect(() => {
    const r = bus.result;
    if (!r || r === seenResult.current || !bus.open) return;
    seenResult.current = r;
    const target = loginSpinTarget(r.idx, Math.random(), LOGIN_SPIN_TURNS);
    const red = reduced();
    const WIND = red ? 0 : LOGIN_SPIN_WINDUP_MS, BACK = red ? 0 : LOGIN_SPIN_WINDUP_DEG, OVER = red ? 0 : LOGIN_SPIN_OVER_DEG;
    setStage('spinning');
    try { BT_AUDIO.play('daily-spin', { vol: 0.7 }); } catch (e) { /* silence is fine */ }
    const t0 = performance.now();
    let seg = loginSpinSegAt(0), lastFlick = 0;
    const step = (now) => {
      const e = now - t0;
      let d, fin = false;
      if (e < WIND) d = -BACK * (1 - (1 - e / WIND) * (1 - e / WIND));
      else {
        const t = Math.min(1, (e - WIND) / LOGIN_SPIN_MS);
        d = -BACK + (target + BACK + OVER) * loginSpinEase(t);
        if (t >= 1) {
          const u = Math.min(1, (e - WIND - LOGIN_SPIN_MS) / (red ? 1 : LOGIN_SPIN_SETTLE_MS));
          d = target + OVER * (1 - u * (2 - u));
          fin = u >= 1;
        }
      }
      if (wheelEl.current) wheelEl.current.style.transform = 'rotate(' + d.toFixed(2) + 'deg)';
      const sg = loginSpinSegAt(d);
      if (sg !== seg) { seg = sg; if (now - lastFlick > 45) { lastFlick = now; flick(ptrEl.current); } }
      if (!fin) { raf.current = requestAnimationFrame(step); return; }
      mDeg.current = target;
      setStage('landed'); setFx('win');
      later(() => setStage(r.can ? 'ask' : 'done'), 1900);
    };
    raf.current = requestAnimationFrame(step);
  }, [bus.result, bus.open]);

  /* the prize pops, counts up, and the coins fly out (a shower for the big ones) */
  useEffect(() => {
    if (stage !== 'landed' && stage !== 'dwon') return;
    const pot0 = bus.round && stage === 'dwon' ? bus.round.pot / 2 : 0;
    const to = bus.round && stage === 'dwon' ? bus.round.pot : (bus.result ? bus.result.pot : 0);
    countUp(popEl.current, pot0, to, 800, (n) => (stage === 'landed' ? fmt(n) + ' gold!' : 'Doubled: ' + fmt(n) + ' gold!'));
    coinBurst(partyEl.current, loginSpinParty(to), to >= 10000);
  }, [stage]);
  /* the worker's answer to a double or a collect: a drum roll, then the little wheel */
  useEffect(() => {
    const r = bus.round;
    if (!r || r === seenRound.current || !bus.open) return;
    seenRound.current = r;
    if (r.collected && !r.win && !r.lost) { setStage('done'); return; }   /* NO */
    if (r.replay && !r.win && !r.lost) return;
    const win = !!r.win;
    const target = loginDoubleTarget(win, Math.random());
    const end = dDeg.current - (dDeg.current % 360) + target;
    setStage('ddrum'); setFx(null);
    const start = () => {
      setStage('dspinning');
      const t0 = performance.now(), from = dDeg.current;
      let half = win;
      const step = (now) => {
        const t = Math.min(1, (now - t0) / LOGIN_DOUBLE_MS);
        const d = from + (end - from) * loginSpinEase(t);
        if (dWheelEl.current) dWheelEl.current.style.transform = 'rotate(' + d.toFixed(2) + 'deg)';
        const h = ((((1.3 - d) % 360) + 360) % 360) < 180;
        if (h !== half) { half = h; flick(dPtrEl.current); }
        if (t < 1) { raf.current = requestAnimationFrame(step); return; }
        dDeg.current = end;
        try { BT_AUDIO.play(win ? 'daily-double-win' : 'daily-double-lose', { vol: win ? 0.6 : 0.5 }); } catch (e) { /* silence is fine */ }
        if (win) { setStage('dwon'); setFx('win'); later(() => setStage(r.can && r.open ? 'ask' : 'done'), 1700); }
        else { setStage('dlost'); setFx('lose'); }
      };
      raf.current = requestAnimationFrame(step);
    };
    later(start, reduced() ? 0 : DRUM_MS);
  }, [bus.round, bus.open]);

  const pot = bus.round ? bus.round.pot : (bus.result ? bus.result.pot : 0);
  const kNow = bus.round ? bus.round.k : (bus.result ? bus.result.k : 0);

  const collect = () => {
    if (stage !== 'ask') return;
    setStage('dwaiting');
    send('loginspin_collect', { k: kNow });
    later(() => setStage((s) => (s === 'dwaiting' ? 'error' : s)), ANSWER_TIMEOUT_MS);
  };
  const double = () => {
    if (stage !== 'ask' || !spinSafeNow()) return;
    setStage('dwaiting');
    send('loginspin_double', { k: kNow });
    later(() => setStage((s) => (s === 'dwaiting' ? 'error' : s)), ANSWER_TIMEOUT_MS);
  };

  const close = () => {
    if (stage === 'done' && pot > 0) {
      /* the coins fly to the Gear tab's gold (questFly) as it goes */
      try {
        const from = document.querySelector('[data-login-spin-won]');
        const to = questFlyTarget('gold');
        if (from && to) for (let i = 0; i < 5; i++) flyPicture('/icons/coins/coin-1.png', from, 'gold', { delay: i * 85, size: 26, drift: (i - 2) * 14, lift: 60 + i * 6 });
      } catch (e) { /* the gold is already paid */ }
    }
    cancelAnimationFrame(raf.current);
    loginSpinBus.close();
  };
  /* the X: while a pot is held it is NO (collect); while the wheel turns it waits */
  const xClose = () => { if (stage === 'ask') { collect(); return; } if (stage === 'done' || stage === 'dlost' || stage === 'ready' || stage === 'error' || stage === 'loading') close(); };

  if (!bus.open) return null;
  const safe = spinSafeNow();
  const dStage = stage === 'ask' || stage === 'ddrum' || stage === 'dwaiting' || stage === 'dspinning' || stage === 'dwon' || stage === 'dlost';
  const xOff = !(stage === 'ask' || stage === 'done' || stage === 'dlost' || stage === 'ready' || stage === 'error' || stage === 'loading');
  const btn = {
    width: '100%', maxWidth: 300, minHeight: 56, border: '2px solid #5a2d00', borderRadius: 14, cursor: 'pointer',
    background: 'linear-gradient(#ffd23a,#f08a00)', color: '#4a1f00', fontFamily: 'inherit', fontSize: 22, fontWeight: 900,
    letterSpacing: '.06em', touchAction: 'manipulation', boxShadow: '0 4px 0 #8a4600',
  };
  const gold = { fontSize: 28, fontWeight: 900, color: '#ffd23a', textShadow: '0 2px 0 #5a2d00' };
  return (
    <div data-login-spin={stage} style={{
      position: 'fixed', inset: 0, zIndex: Z, background: 'rgba(8,10,16,.82)', touchAction: 'manipulation',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'calc(env(safe-area-inset-top, 0px) + 8px) 10px calc(env(safe-area-inset-bottom, 0px) + 8px)', boxSizing: 'border-box',
    }}>
      <div style={{
        position: 'relative', width: '100%', maxWidth: 'min(94vw, 560px)', maxHeight: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 6, fontFamily: 'Baloo 2, Source Sans 3, sans-serif',
      }}>
        <style>{KEYFRAMES}</style>
        <button type="button" aria-label="Close" data-login-spin-close="1" data-esc="" data-key="Esc" data-key-at="hang"
          onClick={xClose} disabled={xOff}
          style={{ position: 'absolute', top: -2, right: -2, width: 44, height: 44, border: 0, borderRadius: 22, background: 'rgba(0,0,0,.45)', color: '#fff', fontSize: 24, fontWeight: 700, cursor: 'pointer', opacity: xOff ? 0.35 : 1, zIndex: 3 }}>×</button>
        {dStage ? (
          /* ── DOUBLE OR NOTHING? (the owner's mock-up: plate, wheel, YES / NO) ── */
          <div data-login-double={pot} style={{
            position: 'relative', animation: stage === 'dlost' ? 'btlsShake .5s' : stage === 'ddrum' ? 'btlsDrum .25s ease-in-out infinite' : 'none',
            width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '0 0 12px', boxSizing: 'border-box',
            background: '#23252f', border: '5px solid #e8b52a', borderRadius: 22, boxShadow: '0 0 0 2px #7a4d00, 0 10px 30px rgba(0,0,0,.6), inset 0 0 40px rgba(0,0,0,.45)',
          }}>
            <img src={LOGIN_SPIN_ART.dPlate} alt="Double or nothing?" draggable={false} style={{ width: '104%', marginTop: -26, display: 'block' }} />
            <div ref={partyEl} style={{ position: 'relative', width: 'min(86%, 46vh, 400px)', aspectRatio: '1 / 1', marginTop: -10 }}>
              {/* the lit and plain wheels turn together; the lit one fades in and out over the plain one, so the lights dim and brighten */}
              <div ref={dWheelEl} data-login-double-wheel="1" style={{ position: 'absolute', inset: 0, willChange: 'transform', transform: 'rotate(' + dDeg.current + 'deg)', filter: stage === 'dwon' ? 'drop-shadow(0 0 16px #ffd23a)' : 'none' }}>
                <img className="btls-plain" src={LOGIN_SPIN_ART.dWheelPlain} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
                <img className="btls-lit" src={LOGIN_SPIN_ART.dWheel} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', animation: 'btlsDim 1.3s ease-in-out infinite alternate' }} />
              </div>
              <img ref={dPtrEl} src={LOGIN_SPIN_ART.dPointer} alt="" draggable={false}
                style={{ position: 'absolute', left: (260.3 / 600 * 100) + '%', top: (-3.4 / 600 * 100) + '%', width: (92 / 600 * 100) + '%', pointerEvents: 'none', transformOrigin: '50% 25%' }} />
              {fx === 'lose' && stage === 'dlost' ? <div aria-hidden="true" style={{ position: 'absolute', inset: '-10%', borderRadius: '50%', background: 'radial-gradient(#ff2a1a,transparent 70%)', animation: 'btlsFlash .6s ease-out forwards', pointerEvents: 'none' }} /> : null}
            </div>
            <div style={{ textAlign: 'center', minHeight: 50, color: '#ffe9b8', fontSize: 15, fontWeight: 700, textShadow: '0 1px 0 #000', padding: '0 10px' }}>
              {stage === 'dlost' ? <span style={{ color: '#ff9a8a', fontSize: 24, fontWeight: 900 }}>Nothing. Better luck tomorrow.</span>
                : stage === 'dwon' ? <span ref={popEl} style={{ ...gold, fontSize: 24, display: 'inline-block', animation: 'btlsPop .5s ease-out' }}>{'Doubled: ' + fmt(pot) + ' gold!'}</span>
                : stage === 'ddrum' || stage === 'dspinning' || stage === 'dwaiting' ? <span>Round and round...</span>
                : (<>
                    <div style={{ ...gold, fontSize: 24 }}>{fmt(pot) + ' gold'}</div>
                    <div>{'Win it for ' + fmt(pot * 2) + ', or lose it all. 50 / 50.'}</div>
                  </>)}
            </div>
            {stage === 'ask' && !safe ? <div data-login-unsafe="1" style={{ color: '#ffb3a0', fontSize: 15, fontWeight: 800 }}>{LOGIN_SPIN_UNSAFE_WORDS + ' (NO still collects)'}</div> : null}
            <div data-login-fifty="1" style={{ color: '#ffd23a', fontSize: 14, fontWeight: 800, letterSpacing: '.04em', textShadow: '0 1px 0 #000' }}>Exactly 50/50 every spin</div>
            {stage === 'dlost' ? (
              <button type="button" data-enter="" data-key="Enter" data-key-at="inline" onClick={close} style={btn}>OK</button>
            ) : (
              <div style={{ display: 'flex', gap: 10, width: '92%', justifyContent: 'center' }}>
                <button type="button" data-login-yes="1" data-enter="" data-key="Enter" data-key-at="inline" disabled={stage !== 'ask' || !safe} onClick={double}
                  aria-label="Yes, double or nothing" style={{ flex: 1, minWidth: 0, padding: 0, border: 0, background: 'none', cursor: 'pointer', touchAction: 'manipulation', opacity: stage === 'ask' ? 1 : 0.55 }}>
                  <img src={LOGIN_SPIN_ART.dYes} alt="YES" draggable={false} style={{ width: '100%', display: 'block' }} />
                </button>
                <button type="button" data-login-no="1" disabled={stage !== 'ask'} onClick={collect}
                  aria-label="No, collect the gold" style={{ flex: 1, minWidth: 0, padding: 0, border: 0, background: 'none', cursor: 'pointer', touchAction: 'manipulation', opacity: stage === 'ask' ? 1 : 0.55 }}>
                  <img src={LOGIN_SPIN_ART.dNo} alt="NO" draggable={false} style={{ width: '100%', display: 'block' }} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <img src={LOGIN_SPIN_ART.title} alt="Free daily spin" draggable={false} style={{ width: '88%', maxHeight: '14vh', objectFit: 'contain', display: 'block' }} />
            <div ref={partyEl} style={{ position: 'relative', width: 'min(94%, 58vh, 520px)', aspectRatio: '1 / 1', flex: '0 1 auto' }}>
              {(stage === 'landed' || stage === 'done') && fx === 'win' && !reduced() ? <div aria-hidden="true" style={{ position: 'absolute', inset: '-22%', borderRadius: '50%', background: 'repeating-conic-gradient(rgba(255,226,120,.55) 0 7deg, transparent 7deg 22deg)', WebkitMaskImage: 'radial-gradient(circle, #000 25%, transparent 70%)', maskImage: 'radial-gradient(circle, #000 25%, transparent 70%)', animation: 'btlsRays 7s linear infinite', pointerEvents: 'none' }} /> : null}
              {/* the lit and plain wheels turn together; the lit one fades in and out over the plain one, so the lights dim and brighten */}
              <div ref={wheelEl} data-login-spin-wheel="1" style={{ position: 'absolute', inset: 0, willChange: 'transform', transform: 'rotate(' + mDeg.current + 'deg)', animation: stage === 'landed' ? 'btlsGlow .6s ease-in-out 3' : 'none' }}>
                <img className="btls-plain" src={LOGIN_SPIN_ART.wheelPlain} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
                <img className="btls-lit" src={LOGIN_SPIN_ART.wheel} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', animation: 'btlsDim 1.3s ease-in-out infinite alternate' }} />
              </div>
              {/* the pointer never turns: its own layer, placed on the wheel's 640 px grid; it flicks as a divider passes */}
              <img ref={ptrEl} src={LOGIN_SPIN_ART.pointer} alt="" draggable={false}
                style={{ position: 'absolute', left: (291.6 / 640 * 100) + '%', top: (-8 / 640 * 100) + '%', width: (75 / 640 * 100) + '%', pointerEvents: 'none', transformOrigin: '50% 25%' }} />
            </div>
            <div style={{ minHeight: 64, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}>
              {stage === 'landed' ? (
                <div ref={popEl} style={{ ...gold, display: 'inline-block', animation: 'btlsPop .5s ease-out' }}>{fmt(pot) + ' gold!'}</div>
              ) : stage === 'done' ? (
                <>
                  <div data-login-spin-won={pot} style={{ ...gold, display: 'inline-block', animation: 'btlsPop .4s ease-out' }}>{pot > 0 ? '+' + fmt(pot) + ' gold' : 'Nothing'}</div>
                  <button type="button" data-enter="" data-key="Enter" data-key-at="inline" onClick={close} style={btn}>COLLECT</button>
                </>
              ) : stage === 'error' ? (
                <>
                  <div style={{ color: '#ffd9a0', fontSize: 14, fontWeight: 700 }}>The wheel did not answer. What you hold is kept.</div>
                  <button type="button" data-enter="" data-key="Enter" data-key-at="inline" onClick={close} style={btn}>OK</button>
                </>
              ) : (
                <>
                  <div style={{ color: '#ffe9b8', fontSize: 14, fontWeight: 700, textShadow: '0 1px 0 #000' }}>{stage === 'ready' ? (safe ? deskWords('Tap SPIN: one free spin a day') : <span data-login-unsafe="1" style={{ color: '#ffb3a0' }}>{LOGIN_SPIN_UNSAFE_WORDS}</span>) : ' '}</div>
                  <button type="button" data-enter="" data-key="Enter" data-key-at="inline" data-login-spin-go="1" disabled={stage !== 'ready' || !safe} onClick={spin}
                    style={{ ...btn, opacity: stage === 'ready' && safe ? 1 : 0.55 }}>
                    {stage === 'ready' ? 'SPIN' : stage === 'loading' ? '...' : 'SPINNING...'}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
