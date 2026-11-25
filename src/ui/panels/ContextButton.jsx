/* ═══ v2.3.6550: THE BUTTON UNDER THE THING (card CT part 17; the rule is src/game/contextButton.js) ═══
 *
 * The owner, 2026-11-24: "contextual buttons like mining fishing or
 * interacting with npc should appear below the item instead of having a dual
 * purpose attack button. Attack button always stays attack".  The two buttons
 * (`?manual=5`) only; `?ctxbuttons=0` none.
 *
 * ONE element for the whole sitting, rendered once by React and never again:
 * the game's frame (BroTown's loop, ctxButtonFrame below) stamps what it says
 * and moves it by `transform` alone -- no React render a frame, no layout read
 * a frame (the canvas's place is mayorScreen.js canvasPlace's kept box;
 * docs/specs/layout-reads.md), nothing in a Pixi layer (TRAPS 218).  Fixed
 * over the touch zones (zIndex 31, the sprint button's), so a tap on it is
 * never the stick's walk nor the world's swing: it swallows its own touch.
 * 48 px tall (past 44 points), `touch-action: manipulation`, the brass chisel
 * of the game's own buttons (game.css .bt-chisel--brass, already on every
 * menu), the skill's picture from the Attack disc's own set (RDISC_ICONS,
 * warmed on the loading screen: nothing new to load).
 *
 * During a harvest the gesture layer (ExtractionSwipeLayer buttonCueScreenPos)
 * anchors on this button while it shows (`data-show="1"`), so the beat is
 * pumped, chopped or reeled here; its pointerdown is left to reach the window.
 */
import React, { useRef } from 'react';
import { ctxPick, ctxScreen, CTX_KINDS } from '../../game/contextButton.js';
import { canvasPlace } from '../mayorScreen.js';
import { RDISC_ICONS } from './controlSkin.jsx';
import { say } from '../../game/say.js';
import { SAY } from '../../data/say/contextButton.js';

const SKILL_ICONS = RDISC_ICONS.filter(function (ic) { return ic[0] === 'mining' || ic[0] === 'woodcutting' || ic[0] === 'fishing' || ic[0] === 'cooking'; });
const BTN_H = 48;

/** The frame's stamp: what the button says, where it stands, whether it
 *  shows.  `o` is ctxPick's (live, busy, npcsHere, shown).  Every write is
 *  compared against its last value (the house rule for a per-frame stamp). */
export function ctxButtonFrame(el, S, o) {
  if (!el) return null;
  const pick = ctxPick(S, o);
  const pos = pick ? ctxScreen(pick, S.camera, S._worldScaleX, S._worldScaleY, canvasPlace(), (typeof window !== 'undefined' && window.devicePixelRatio) || 1) : null;
  const use = pick && pos ? pick : null;
  el._btPick = use;
  el._btPos = use ? pos : null;
  const show = use ? '1' : '0';
  if (el.getAttribute('data-show') !== show) {
    el.setAttribute('data-show', show);
    el.style.display = use ? 'flex' : 'none';
  }
  if (!use) { ctxProbe(null); return null; }
  if (el._btKind !== use.kind) { el.setAttribute('data-kind', use.kind); el._btKind = use.kind; }
  const ic = use.skill || 'none';
  if (el._btIcon !== ic) {
    el.setAttribute('data-icon', ic);
    el._btIcon = ic;
    const imgs = el._btImgs || [];   /* kept by the ref (no search a frame) */
    for (let i = 0; i < imgs.length; i++) imgs[i].style.display = imgs[i].getAttribute('data-ctx-icon') === ic ? 'block' : 'none';
  }
  const w = el._btWord !== use.word ? el._btWordEl : null;
  if (w) { w.textContent = use.word; el._btWord = use.word; }
  const tf = 'translate(' + pos.x + 'px,' + pos.y + 'px) translate(-50%,-50%)';
  if (el._btTf !== tf) { el.style.transform = tf; el._btTf = tf; }
  ctxProbe(use);
  return use;
}

/* the probe, in the house style (__btShieldBtn): what is offered, written
   only when it changes */
let _probeKey = null;
function ctxProbe(p) {
  if (typeof window === 'undefined') return;
  const t = p && p.thing;
  const key = p ? p.kind + '|' + p.word + '|' + (t.id != null ? t.id : (t.name || '')) : '';
  if (key === _probeKey) return;
  _probeKey = key;
  window.__btCtxButton = p ? { kind: p.kind, word: p.word, skill: p.skill, id: t.id != null ? t.id : null, name: t.name || null, nodeType: t.nodeType || null, ts: Date.now() } : { kind: null, ts: Date.now() };
}

export function ContextButton(props) {
  const ref = useRef(null);
  const lastTouch = useRef(0);
  const fire = function () {
    const el = ref.current;
    const p = el && el._btPick;
    if (!p || CTX_KINDS.indexOf(p.kind) < 0) return;
    if (typeof props.onTap === 'function') props.onTap(p, el._btPos);
  };
  return React.createElement('button', {
    ref: function (n) {
      ref.current = n;
      if (props.btnRef) props.btnRef.current = n;
      /* its pictures and its word, kept once here: the frame searches nothing */
      if (n) {
        n._btImgs = [];
        for (let i = 0; i < n.children.length; i++) {
          const c = n.children[i];
          if (c.hasAttribute('data-ctx-icon')) n._btImgs.push(c);
          else if (c.getAttribute('data-ctx') === 'word') n._btWordEl = c;
        }
      }
    },
    type: 'button',
    className: 'bt-chisel bt-chisel--brass bt-ctx-btn bt-desktop-hide',
    'data-show': '0',
    'aria-label': say(SAY, 'contextButton.label'),
    style: {
      position: 'fixed', left: 0, top: 0, zIndex: 31, display: 'none',
      height: BTN_H, minWidth: 72, padding: '0 12px 0 8px', boxSizing: 'border-box',
      alignItems: 'center', justifyContent: 'center', gap: 6,
      fontWeight: 800, fontSize: 17, letterSpacing: '0.04em', lineHeight: 1,
      touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none',
      transition: 'none', willChange: 'transform',
    },
    /* a finger: its own tap, never the stick's or the world's (stopped
       here); the pointerdown is left alone, the gesture layer's beat */
    onTouchStart: function (e) {
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
      lastTouch.current = Date.now();
      fire();
    },
    onTouchMove: function (e) { e.stopPropagation(); },
    onTouchEnd: function (e) { e.stopPropagation(); if (e.cancelable) e.preventDefault(); },
    /* a mouse (a computer never plays mode 5; a test's click): the same tap,
       never a second one after a finger's */
    onClick: function (e) {
      e.stopPropagation();
      if (Date.now() - lastTouch.current < 700) return;
      fire();
    },
  },
  SKILL_ICONS.map(function (ic) {
    return React.createElement('img', {
      key: ic[0], 'data-ctx-icon': ic[0], src: ic[1], alt: '', draggable: false, width: 28, height: 28,
      style: { display: 'none', width: 28, height: 28, objectFit: 'contain', pointerEvents: 'none' },
    });
  }),
  React.createElement('span', { 'data-ctx': 'word', style: { pointerEvents: 'none' } }, ''));
}
