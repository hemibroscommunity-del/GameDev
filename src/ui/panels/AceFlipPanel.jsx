import React from 'react';
import { aceFlipBus } from '@/ui/mobile/aceFlipBus.js';
import { ACE_FLIP_MIN_STAKE, ACE_FLIP_RISK_MULT, ACE_FLIP_WIN_CHANCE, aceFlipMaxStake, BT_AUDIO } from '@/data/index.js';
import { portraitDataUrl, portraitOptsFromPeer, portraitHasSubject } from '@/rendering/characterPortrait.js';
import { thumbFor, ITEM_NAMES } from '@/ui/mobile/dash/InventoryPanel.jsx';
import { peerCosmeticsFromWire } from '@/networking/peerCosmetics.js';

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

/* ═══ v2.3.2620: THE COIN'S OWN SOUND ═══
 * Owner: "add a coin flip sound (there might already be one I uploaded
 * before)."  There was not one -- the whole sfx tree has exactly one coin
 * sample, `coin-pickup` (/sfx/loot/coin-pickup.mp3), the jingle that plays
 * when gold is credited.  So the toss borrows it, PITCHED UP AND SHORTENED
 * into a single metallic ting rather than the purse-jingle it is at 1.0: a
 * flip is one coin leaving a thumb, not a handful landing in a bag, and
 * played raw it would also be the exact sound the WIN pays out with a second
 * later (gameEvents BT_AUDIO.collect), so the toss and the payout would be
 * indistinguishable.
 *
 * ONE PLACE TO SWAP.  If a real coin-flip clip is ever uploaded, add it to
 * BT_AUDIO.SFX_MANIFEST and change the key here -- nothing else moves.
 * `coin-pickup` is in that manifest, and loadSfxManifest() eagerly fetches the
 * whole manifest at boot, so the first toss of a session is never the silent
 * one that a lazily-loaded sample would give (play() returns null on a miss). */
var TOSS_SFX = 'coin-pickup';
var TOSS_OPTS = { vol: 0.34, rate: 1.7, duration: 0.3 };

function gold(amount, size, color) {
  return React.createElement('span', {
    style: { display: 'inline-flex', alignItems: 'center', gap: 4, color: color || LS.brass, fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: size || 14 },
  }, React.createElement('img', {
    src: '/icons/popups/gold.webp', alt: '', draggable: false,
    style: { width: 15, height: 15, objectFit: 'contain' },
    onError: function (e) { e.currentTarget.replaceWith(document.createTextNode('🪙')); },
  }), amount);
}

/* The bag's keys are identifiers, not labels ('cooked_fish_bass').  Same
   shape as TradeWindowPanel's own labelFor -- panel-local by precedent,
   because the one shared prettyName is private to ItemDetailPopup. */
function labelFor(k) {
  if (ITEM_NAMES[k]) return ITEM_NAMES[k];
  return String(k || '')
    .replace(/^(fish|cooked_fish|wood|ore|herb|remnants)_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}

/* ═══ THE PFP BESIDE EACH RECORD ═══
   Owner: "Have it list the player pfp next to the record too."
   Rendered from the `look` the server snapshotted into the row, through the
   SAME recipe every other peer portrait uses (portraitOptsFromPeer ->
   portraitDataUrl, as InspectPlayerPanel and the trade window do) -- so a
   face on this board cannot drift from the same player's face anywhere else,
   and no image bytes had to be stored to get it.  portraitHasSubject rejects
   a row whose look is empty (a legacy record, or a player who joined before
   character records existed); those fall back to a letter tile, which is the
   honest answer rather than a default body that is nobody.

   THE LOOK ARRIVES IN WIRE KEYS AND MUST BE RENAMED FIRST.  char:<pid>.look is
   built from JOIN_COSMETIC_KEYS (join.js), which are the SHORT wire names --
   sk, hr, hw, fh, st -- while portraitOptsFromPeer and portraitHasSubject both
   read the LONG renderer fields (skin, hair, headwear, facialhair, shirt).
   Handing the stored look straight to them silently fails every test in
   portraitHasSubject, so EVERY row would have shown a letter tile forever and
   the feature would have looked simply broken rather than wrong.
   peerCosmeticsFromWire is the one rename table for exactly this (v2.3.1961,
   the same call the join snapshot and the 2s relay make), so it is used here
   rather than a second mapping that could drift from it. */
function useBoardFaces(rows) {
  var _s = React.useState({});
  var faces = _s[0], setFaces = _s[1];
  var sig = rows.map(function (r) { return r && r.pid; }).join(',');
  React.useEffect(function () {
    var alive = true;
    rows.forEach(function (r) {
      if (!r || !r.pid || !r.look) return;
      var cos = peerCosmeticsFromWire(r.look);
      if (!portraitHasSubject(cos)) return;
      try {
        portraitDataUrl(portraitOptsFromPeer(cos), true)
          .then(function (u) {
            if (alive && u) setFaces(function (m) { var n = Object.assign({}, m); n[r.pid] = u; return n; });
          })
          .catch(function () {});
      } catch (e) { /* a portrait is never worth taking the board down for */ }
    });
    return function () { alive = false; };
  }, [sig]);
  return faces;
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

  /* BEFORE the early return, and that is not style: this component returns
     null whenever the dialog is shut, so a hook called after that line runs on
     some renders and not others -- the Rules-of-Hooks crash TradeWindowPanel's
     own header records having hit five times. */
  var boardRows = (aceFlipBus.board.wins || []).concat(aceFlipBus.board.losses || []);
  var faces = useBoardFaces(boardRows);

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
      try { BT_AUDIO.play(TOSS_SFX, TOSS_OPTS); } catch (_s) { /* never hold a bet on a sound */ }
    } catch (e) { aceFlipBus.setPending(false); }
  };

  /* ── v2.3.2619: the item wager ── */
  var bag = (S && S.rpg && S.rpg.inventory) || {};
  var bagKeys = Object.keys(bag).filter(function (k) {
    return (Number(bag[k]) || 0) > 0
      && k !== '__proto__' && k !== 'constructor' && k !== 'prototype';
  }).sort();
  var staged = aceFlipBus.items;
  var stagedKeys = Object.keys(staged);
  var stagedTotal = stagedKeys.reduce(function (n, k) { return n + (staged[k] || 0); }, 0);
  var itemsOk = (S && S._serverCaps && S._serverCaps.aceItems);
  var canWager = stagedTotal > 0 && !aceFlipBus.pending;

  var sendItems = function () {
    if (!canWager) return;
    if (!itemsOk) {
      aceFlipBus.setNote('Ace shakes his head. "Gold only today, bro."');
      return;
    }
    var out = {};
    stagedKeys.forEach(function (k) { out[k] = staged[k]; });
    aceFlipBus.setNote('');
    aceFlipBus.setPending(true);
    try {
      S.channel.send({ type: 'broadcast', event: 'ace_item_flip_request', payload: { items: out } });
      try { BT_AUDIO.play(TOSS_SFX, TOSS_OPTS); } catch (_s) { /* never hold a bet on a sound */ }
    } catch (e) { aceFlipBus.setPending(false); }
  };

  var tab = function (id, label) {
    var on = aceFlipBus.mode === id;
    return React.createElement('button', {
      key: id,
      onClick: function () {
        aceFlipBus.setMode(id);
        /* Ask for a fresh board when the Records tab is opened: it arrives on
           join and after each flip, so another player's record set while this
           dialog sat open would otherwise not be here. */
        if (id === 'records' && itemsOk && S && S.channel) {
          try { S.channel.send({ type: 'broadcast', event: 'ace_board_request', payload: {} }); } catch (e) {}
        }
      },
      style: {
        flex: 1, padding: '9px 4px', border: 'none', cursor: 'pointer',
        background: on ? LS.panel : 'transparent',
        color: on ? LS.brass : LS.txt3,
        borderBottom: '2px solid ' + (on ? LS.brass : 'transparent'),
        fontSize: 11.5, fontWeight: 700, letterSpacing: '.10em', textTransform: 'uppercase',
      },
    }, label);
  };

  var itemRow = function (k) {
    var held = Math.floor(Number(bag[k]) || 0);
    var q = staged[k] || 0;
    var step = function (d) {
      return function () { aceFlipBus.stageItem(k, Math.max(0, Math.min(held, q + d))); };
    };
    return React.createElement('div', {
      key: k,
      style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 9, background: q > 0 ? LS.brassFill : 'transparent', border: '1px solid ' + (q > 0 ? LS.brass : LS.border), marginBottom: 5 },
    },
      React.createElement('img', {
        src: thumbFor(k), alt: '', draggable: false,
        style: { width: 26, height: 26, objectFit: 'contain', flexShrink: 0 },
        onError: function (e) { e.currentTarget.style.visibility = 'hidden'; },
      }),
      React.createElement('div', { style: { flex: 1, minWidth: 0 } },
        React.createElement('div', { style: { fontSize: 12, color: LS.txt1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, labelFor(k)),
        React.createElement('div', { style: { fontSize: 10.5, color: LS.txt3 } }, 'have ' + held)),
      React.createElement('button', { onClick: step(-1), disabled: q <= 0 || aceFlipBus.pending, style: { width: 26, height: 26, borderRadius: 7, border: '1px solid ' + LS.borderStrong, background: 'transparent', color: q > 0 ? LS.txt1 : LS.dis, fontSize: 15, lineHeight: 1, cursor: 'pointer' } }, '\u2212'),
      React.createElement('span', { style: { minWidth: 26, textAlign: 'center', fontSize: 13, fontWeight: 700, color: q > 0 ? LS.brass : LS.dis, fontVariantNumeric: 'tabular-nums' } }, q),
      React.createElement('button', { onClick: step(1), disabled: q >= held || aceFlipBus.pending, style: { width: 26, height: 26, borderRadius: 7, border: '1px solid ' + LS.borderStrong, background: 'transparent', color: q < held ? LS.txt1 : LS.dis, fontSize: 15, lineHeight: 1, cursor: 'pointer' } }, '+'),
      React.createElement('button', { onClick: function () { aceFlipBus.stageItem(k, held); }, disabled: q >= held || aceFlipBus.pending, style: { padding: '4px 7px', borderRadius: 7, border: '1px solid ' + LS.borderStrong, background: 'transparent', color: q < held ? LS.txt2 : LS.dis, fontSize: 10.5, fontWeight: 700, cursor: 'pointer' } }, 'All'));
  };

  var boardRow = function (r, i, isWin) {
    var face = r && faces[r.pid];
    return React.createElement('div', {
      key: (r && r.pid) || i,
      style: { display: 'flex', alignItems: 'center', gap: 9, padding: '6px 8px', borderRadius: 9, background: i % 2 ? 'transparent' : LS.raised, marginBottom: 3 },
    },
      React.createElement('span', { style: { width: 16, textAlign: 'right', fontSize: 11, fontWeight: 700, color: LS.txt3, fontVariantNumeric: 'tabular-nums' } }, i + 1),
      face
        ? React.createElement('img', { src: face, alt: '', draggable: false, style: { width: 30, height: 30, borderRadius: 7, objectFit: 'cover', background: LS.well, flexShrink: 0 } })
        : React.createElement('div', { style: { width: 30, height: 30, borderRadius: 7, background: LS.well, color: LS.txt3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 } }, String((r && r.name) || '?').slice(0, 1).toUpperCase()),
      React.createElement('div', { style: { flex: 1, minWidth: 0, fontSize: 12, color: LS.txt1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, (r && r.name) || 'Bro'),
      gold((isWin ? '+' : '-') + ((r && r.amount) || 0), 12.5, isWin ? LS.win : LS.lose));
  };

  var boardList = function (rows, isWin, title) {
    return React.createElement('div', { style: { marginBottom: 14 } },
      React.createElement('div', { style: { fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: isWin ? LS.win : LS.lose, marginBottom: 6 } }, title),
      rows.length
        ? rows.map(function (r, i) { return boardRow(r, i, isWin); })
        : React.createElement('div', { style: { fontSize: 12, color: LS.txt3, padding: '8px 2px' } }, 'Nobody yet. Could be you.'));
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

    /* ── v2.3.2619: three faces of the dialog ── */
    React.createElement('div', {
      style: { display: 'flex', background: LS.strip, borderBottom: '1px solid ' + LS.border },
    }, tab('gold', 'Gold'), tab('items', 'Items'), tab('records', 'Records')),

    aceFlipBus.mode === 'records' ? React.createElement('div', {
      style: { padding: '13px 14px 15px', maxHeight: '58vh', overflowY: 'auto' },
    },
      React.createElement('div', { style: { fontSize: 12, color: LS.txt2, lineHeight: 1.45, marginBottom: 12 } },
        'The book. Biggest single win and biggest single loss at my coin \u2014 gold only, one line each per bro.'),
      boardList(aceFlipBus.board.wins || [], true, 'Biggest wins'),
      boardList(aceFlipBus.board.losses || [], false, 'Biggest losses'))

    : aceFlipBus.mode === 'items' ? React.createElement('div', {
      style: { padding: '13px 14px 15px' },
    },
      React.createElement('div', { style: { fontSize: 12.5, color: LS.txt2, lineHeight: 1.45, marginBottom: 11 } },
        aceFlipBus.note
          ? aceFlipBus.note
          : 'Stake whatever you like out of that bag. Double or nothing \u2014 same coin, same odds: ' + acePct + '% me, ' + youPct + '% you.'),
      aceFlipBus.itemResult && !aceFlipBus.pending ? React.createElement('div', {
        style: { textAlign: 'center', marginBottom: 11, fontSize: 14, fontWeight: 700, color: aceFlipBus.itemResult.won ? LS.win : LS.lose },
      }, aceFlipBus.itemResult.won
        ? 'Doubled \u2014 ' + (aceFlipBus.itemResult.total || 0) + ' more in the bag'
        : 'Gone \u2014 Ace takes all ' + (aceFlipBus.itemResult.total || 0)) : null,
      React.createElement('div', { style: { maxHeight: '38vh', overflowY: 'auto', marginBottom: 10 } },
        bagKeys.length
          ? bagKeys.map(itemRow)
          : React.createElement('div', { style: { fontSize: 12, color: LS.txt3, padding: '12px 2px', textAlign: 'center' } }, 'Your bag is empty. Nothing to stake.')),
      stagedTotal > 0 ? React.createElement('div', {
        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: 12, color: LS.txt2 },
      },
        React.createElement('span', null, 'Staked: ', React.createElement('strong', { style: { color: LS.brass } }, stagedTotal), ' item', stagedTotal === 1 ? '' : 's'),
        React.createElement('button', { onClick: function () { aceFlipBus.clearItems(); }, disabled: aceFlipBus.pending, style: { border: 'none', background: 'transparent', color: LS.txt3, fontSize: 11.5, cursor: 'pointer', textDecoration: 'underline' } }, 'Clear')) : null,
      React.createElement('button', {
        onClick: sendItems, disabled: !canWager,
        style: {
          width: '100%', padding: '13px 0', borderRadius: 11, border: 'none', cursor: canWager ? 'pointer' : 'default',
          background: canWager ? LS.brass : 'rgba(216,170,88,.18)', color: canWager ? LS.onBrass : LS.dis,
          fontSize: 14, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase',
        },
      }, aceFlipBus.pending ? 'Flipping\u2026' : (stagedTotal > 0 ? 'Double or nothing \u00b7 ' + stagedTotal : 'Stake something')))

    : React.createElement('div', { style: { padding: '13px 14px 15px' } },
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
