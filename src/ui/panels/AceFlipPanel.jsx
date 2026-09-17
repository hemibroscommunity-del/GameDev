import React from 'react';
import { aceFlipBus } from '@/ui/mobile/aceFlipBus.js';
import { ACE_FLIP_MIN_STAKE, ACE_FLIP_RISK_MULT, ACE_FLIP_WIN_CHANCE, aceFlipMaxStake, BT_AUDIO } from '@/data/index.js';

/* ═══ v2.3.2618: ACE'S COIN FLIP ═══
 *
 * Owner: "Add a new dialog for him.  You can triple your money or lose 3x of
 * your bag (you can only bet what you can lose 3x of).  The odds are 55% him
 * winning, 45% you winning."
 *
 * WHAT THIS FILE IS NOT ALLOWED TO DO: roll, or pay.  It sends a stake and
 * draws whatever comes back.  The coins move on the authoritative
 * player_state echo (ARCHITECTURE-HANDOFF rule 20); `ace_flip_result` only
 * says which way the coin fell so the right strip can play.  The Gamble Hall
 * shipped the other way round once -- the player's own Math.random with a
 * local self-credit -- and gamble.js's header keeps that as the reason this
 * one never will.
 *
 * THE STAKE SLIDER IS CLAMPED BY THE LOSS, NOT THE STAKE.  aceFlipMaxStake is
 * coins/3, because a stake of S risks 3S.  The server re-checks it and simply
 * ignores anything over; the clamp here exists so the player is never offered
 * a bet that would be silently dropped, which reads as a broken button.
 *
 * THE COIN IS A CSS SPRITE WALK over an 11-frame strip, not a GIF and not a
 * per-frame <img> swap: one background-position step per frame off one
 * already-warm image (npcSprites.js NPC_DIALOG_FX), so the landing frame
 * cannot arrive late.  It stops ON the last frame rather than looping -- the
 * last frame IS the answer (blue head, or red skull), so looping past it
 * would throw away the only thing the animation is for.
 */
var LS = {
  txt1: '#F4F0E7', txt2: '#B6C1BE', txt3: '#8D9B98', dis: '#667875',
  panel: '#1E2E34', strip: '#27393F', raised: '#293B41', well: '#111E23',
  border: 'rgba(229,237,233,.11)', borderStrong: 'rgba(229,237,233,.20)',
  brass: '#D8AA58', brassFill: 'rgba(216,170,88,.15)', onBrass: '#172126',
  win: '#59BF91', lose: '#D95C54',
};
var FRAME_W = 128, FRAME_H = 192, FRAMES = 11, STEP_MS = 55;

function gold(amount, size, color) {
  return React.createElement('span', {
    style: { display: 'inline-flex', alignItems: 'center', gap: 4, color: color || LS.brass, fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: size || 14 },
  }, React.createElement('img', {
    src: '/icons/popups/gold.webp', alt: '', draggable: false,
    style: { width: 15, height: 15, objectFit: 'contain' },
    onError: function (e) { e.currentTarget.replaceWith(document.createTextNode('🪙')); },
  }), amount);
}

export function AceFlipPanel() {
  var bus = React.useSyncExternalStore(aceFlipBus.subscribe, function () { return aceFlipBus.open; });
  var _v = React.useState(0); var bump = _v[1];
  React.useEffect(function () { return aceFlipBus.subscribe(function () { bump(function (n) { return n + 1; }); }); }, []);

  /* The coin's current frame. Driven by a timer that starts when a flip is
     sent and is cleared on unmount -- a stray interval left running behind a
     closed panel is a leak that only shows up as a slow tab an hour later. */
  var _f = React.useState(0); var frame = _f[0], setFrame = _f[1];
  var spinning = aceFlipBus.pending;
  var settledAt = aceFlipBus.settled;
  React.useEffect(function () {
    if (!aceFlipBus.open) return undefined;
    var id = setInterval(function () {
      setFrame(function (n) {
        /* While the answer is in flight the coin spins through the EDGE-ON
           frames only (1..6): the face frames are the answer, and showing one
           before the server has spoken would be the panel guessing. */
        if (aceFlipBus.pending) return n >= 6 ? 1 : n + 1;
        if (aceFlipBus.result) return n < FRAMES - 1 ? n + 1 : FRAMES - 1;
        return 0;
      });
    }, STEP_MS);
    return function () { clearInterval(id); };
  }, [bus, settledAt, spinning]);
  React.useEffect(function () { if (aceFlipBus.pending) setFrame(1); }, [spinning]);

  /* ═══ THE SILENT-REFUSAL TIMEOUT ═══
     The server IGNORES an invalid request rather than answering it (gamble.js:
     answering would make the handler a probe oracle).  That is right, and it
     means a refused flip produces no event at all -- so without this the coin
     spins and the button reads "Flipping..." forever, which is the worst of
     both worlds: it looks like the bet was taken.  Caught in the v2.3.2618
     smoke test, where a stake the CLIENT thought was affordable was refused by
     the server whose coins are the real ones (rule 20, and exactly the drift
     this timeout has to survive).  Long enough that a slow round-trip is never
     mistaken for a refusal. */
  React.useEffect(function () {
    if (!aceFlipBus.pending) return undefined;
    var id = setTimeout(function () {
      if (!aceFlipBus.pending) return;
      aceFlipBus.setPending(false);
      aceFlipBus.setNote('Ace waves you off. "Come back when your bag can cover it."');
    }, 6000);
    return function () { clearTimeout(id); };
  }, [spinning]);

  if (!aceFlipBus.open) return null;

  var S = typeof window !== 'undefined' && window._gameState ? window._gameState.current : null;
  var coins = (S && S.rpg && S.rpg.coins) || 0;
  var maxStake = aceFlipMaxStake(coins);
  var stake = Math.min(aceFlipBus.stake, maxStake);
  var risk = stake * ACE_FLIP_RISK_MULT;
  var canFlip = stake >= ACE_FLIP_MIN_STAKE && risk <= coins && !aceFlipBus.pending;
  /* ═══ THE ODDS ARE DERIVED, NOT TYPED ═══
     Owner asked Ace to say the split out loud.  Both numbers come off
     ACE_FLIP_WIN_CHANCE (the mirror of the server's own constant) rather than
     being written as "45" and "55" in three places, because a hardcoded
     percentage does not fail loudly when the constant is retuned -- it just
     quietly starts lying to the player about a bet they are about to take.
     The stat boxes below read the same two values for the same reason. */
  var youPct = Math.round(ACE_FLIP_WIN_CHANCE * 100);
  var acePct = 100 - youPct;
  var res = aceFlipBus.result;
  var strip = res && res.won ? '/sprites/fx/coinflip-win.webp' : '/sprites/fx/coinflip-lose.webp';

  var close = function () { aceFlipBus.setOpen(false); };
  var send = function () {
    if (!canFlip) return;
    var st = S;
    if (!st || !st._serverCaps || !st._serverCaps.aceFlip) {
      /* Deploy-order safety (rule 19): a worker that has not advertised the
         flag has no case for ace_flip_request and would REBROADCAST the stake
         to the room while settling nothing. Say so rather than send. */
      aceFlipBus.setNote('Ace pockets the coin. "Not taking bets today, bro."');
      return;
    }
    aceFlipBus.setNote('');
    aceFlipBus.setPending(true);
    try {
      st.channel.send({ type: 'broadcast', event: 'ace_flip_request', payload: { stake: stake } });
      BT_AUDIO.beep(520, 0.06, 0.05, 'triangle');
    } catch (e) { aceFlipBus.setPending(false); }
  };

  var chip = function (label, value, active) {
    return React.createElement('button', {
      key: label, disabled: aceFlipBus.pending || value < ACE_FLIP_MIN_STAKE,
      onClick: function () { aceFlipBus.setStake(value); },
      style: {
        flex: 1, minWidth: 0, padding: '9px 4px', borderRadius: 9, cursor: 'pointer',
        border: '1px solid ' + (active ? LS.brass : LS.borderStrong),
        background: active ? LS.brassFill : 'transparent',
        color: value < ACE_FLIP_MIN_STAKE ? LS.dis : (active ? LS.brass : LS.txt2),
        fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
      },
    }, label);
  };

  return React.createElement('div', {
    onClick: close,
    style: { position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(8,14,17,.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  }, React.createElement('div', {
    onClick: function (e) { e.stopPropagation(); },
    style: { width: '100%', maxWidth: 380, background: LS.panel, borderRadius: 14, overflow: 'hidden', border: '1px solid ' + LS.border, boxShadow: '0 18px 48px rgba(0,0,0,.5)' },
  },
    /* ── header: his own portrait, so the face in the chip is the man outside ── */
    React.createElement('div', {
      style: { display: 'flex', alignItems: 'center', gap: 11, padding: '11px 14px', background: LS.strip, borderBottom: '1px solid ' + LS.border },
    },
      React.createElement('img', {
        src: '/sprites/npc/cardsharp-bro-head.webp', alt: '', draggable: false,
        style: { width: 42, height: 42, borderRadius: 8, objectFit: 'cover', background: LS.well, flexShrink: 0 },
        onError: function (e) { e.currentTarget.replaceWith(document.createTextNode('🃏')); },
      }),
      React.createElement('div', { style: { minWidth: 0, flex: 1 } },
        React.createElement('div', { style: { fontSize: 13, fontWeight: 700, letterSpacing: '.10em', textTransform: 'uppercase', color: LS.txt1 } }, 'Ace'),
        React.createElement('div', { style: { fontSize: 11, color: LS.txt3, marginTop: 1 } }, 'Gambler')),
      React.createElement('button', {
        onClick: close, 'aria-label': 'Close',
        style: { border: 'none', background: 'transparent', color: LS.txt3, fontSize: 20, lineHeight: 1, cursor: 'pointer', padding: 4 },
      }, '×')),

    React.createElement('div', { style: { padding: '13px 14px 15px' } },
      React.createElement('div', { style: { fontSize: 12.5, color: LS.txt2, lineHeight: 1.45, marginBottom: 11 } },
        aceFlipBus.note
          ? aceFlipBus.note
          : 'One flip. Land it and I pay you three times your stake — miss and I take three times off you. I win a little more often than you do: ' + acePct + '% me, ' + youPct + '% you. Still in?'),

      /* ── the coin ── */
      React.createElement('div', {
        style: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: FRAME_H, background: LS.well, borderRadius: 11, border: '1px solid ' + LS.border, marginBottom: 12, overflow: 'hidden' },
      }, React.createElement('div', {
        style: {
          width: FRAME_W, height: FRAME_H,
          backgroundImage: 'url(' + strip + ')',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: '-' + (frame * FRAME_W) + 'px 0',
          imageRendering: 'auto',
        },
      })),

      res && !aceFlipBus.pending ? React.createElement('div', {
        style: { textAlign: 'center', marginBottom: 11, fontSize: 14, fontWeight: 700, color: res.won ? LS.win : LS.lose },
      }, res.won ? 'Heads — you take ' : 'Skull — Ace takes ',
        gold(Math.abs(res.delta || 0), 14, res.won ? LS.win : LS.lose)) : null,

      /* ── stake ── */
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 } },
        React.createElement('span', { style: { fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: LS.txt3 } }, 'Your stake'),
        React.createElement('span', { style: { fontSize: 11, color: LS.txt3 } }, 'Bag ', gold(coins, 11))),
      /* THE LADDER IS BUILT, NOT LISTED.  A fixed Min / quarter / half / Max
         row reads as broken on a small bag: at 105 gold the max stake is 35,
         so the quarter is 8 -- BELOW the 10 minimum -- and the row rendered
         "10, 8, 17, Max 35", one of them permanently dead and the whole thing
         out of order.  Filtering under the minimum, de-duplicating and sorting
         gives an honest ascending ladder at every bag size, and collapses to a
         single Max chip on the smallest one that can play at all. */
      React.createElement('div', { style: { display: 'flex', gap: 6, marginBottom: 9 } },
        [ACE_FLIP_MIN_STAKE, Math.floor(maxStake / 4), Math.floor(maxStake / 2), maxStake]
          .filter(function (v) { return v >= ACE_FLIP_MIN_STAKE && v <= maxStake; })
          .filter(function (v, i, arr) { return arr.indexOf(v) === i; })
          .sort(function (a, b) { return a - b; })
          .map(function (v) { return chip(v === maxStake ? 'Max ' + v : String(v), v, stake === v); })),

      /* The two numbers that matter, stated rather than implied: what you
         win, and what it costs if you don't. */
      React.createElement('div', {
        style: { display: 'flex', gap: 8, marginBottom: 12 },
      },
        React.createElement('div', { style: { flex: 1, background: LS.raised, border: '1px solid ' + LS.border, borderRadius: 9, padding: '8px 10px' } },
          React.createElement('div', { style: { fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: LS.txt3, marginBottom: 2 } }, 'Win (' + youPct + '%)'),
          gold('+' + risk, 14, LS.win)),
        React.createElement('div', { style: { flex: 1, background: LS.raised, border: '1px solid ' + LS.border, borderRadius: 9, padding: '8px 10px' } },
          React.createElement('div', { style: { fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: LS.txt3, marginBottom: 2 } }, 'Lose (' + acePct + '%)'),
          gold('-' + risk, 14, LS.lose))),

      maxStake < ACE_FLIP_MIN_STAKE ? React.createElement('div', {
        style: { fontSize: 12, color: LS.lose, textAlign: 'center', padding: '10px 0' },
      }, 'You need ', gold(ACE_FLIP_MIN_STAKE * ACE_FLIP_RISK_MULT, 12, LS.lose), ' in the bag to cover his smallest bet.')
        : React.createElement('button', {
          onClick: send, disabled: !canFlip,
          style: {
            width: '100%', padding: '13px 0', borderRadius: 11, border: 'none', cursor: canFlip ? 'pointer' : 'default',
            background: canFlip ? LS.brass : 'rgba(216,170,88,.18)', color: canFlip ? LS.onBrass : LS.dis,
            fontSize: 14, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase',
          },
        }, aceFlipBus.pending ? 'Flipping…' : (stake < ACE_FLIP_MIN_STAKE ? 'Pick a stake' : 'Flip for ' + risk + 'g')))));
}
