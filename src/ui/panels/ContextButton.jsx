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
 * over the touch zones (zIndex 29: under the right side's buttons), so a tap on it is
 * never the stick's walk nor the world's swing: it swallows its own touch.
 * 48 px tall (past 44 points), `touch-action: manipulation`, the brass chisel
 * of the game's own buttons (game.css .bt-chisel--brass, already on every
 * menu), the skill's picture from the Attack disc's own set (RDISC_ICONS,
 * warmed on the loading screen: nothing new to load).
 *
 * v2.3.6552 (card CT part 19): TALK is the owner's pill, the picture alone
 * (game/contextButton.js ctxLook says what each pick wears): no brass plate,
 * no word, 44 x 30 in a clear 48 x 48 touch box; its name "Talk" for a
 * screen reader.  The picture rides in the script, a data address (controlSkin
 * TALK_PILL_URL, decoded on the loading screen).  The harvest kinds keep the
 * brass word button.  The frame dresses the element only when its kind
 * changes (ctxDress): one class and four styles, compared.
 *
 * During a harvest the gesture layer (ExtractionSwipeLayer buttonCueScreenPos)
 * anchors on this button while it shows (`data-show="1"`), so the beat is
 * pumped, chopped or reeled here; its pointerdown is left to reach the window.
 */
import React, { useRef } from 'react';
import { ctxPick, ctxScreen, ctxLook, CTX_KINDS, CTX_TALK_W, CTX_TALK_H, CTX_TOUCH, CTX_TALK_PIC } from '../../game/contextButton.js';
import { canvasPlace } from '../mayorScreen.js';
import { RDISC_ICONS, TALK_PILL_URL } from './controlSkin.jsx';
import { say } from '../../game/say.js';
import { SAY } from '../../data/say/contextButton.js';

const SKILL_ICONS = RDISC_ICONS.filter(function (ic) { return ic[0] === 'mining' || ic[0] === 'woodcutting' || ic[0] === 'fishing' || ic[0] === 'cooking'; });
const BTN_H = 48;
/* v2.3.6552: the two dresses (ctxDress): the brass word button, and the
   picture alone (TALK) -- no chisel class, no border, no ground */
const PLATE_CLASS = 'bt-chisel bt-chisel--brass bt-ctx-btn bt-desktop-hide';
const PIC_CLASS = 'bt-ctx-btn bt-ctx-btn--pic bt-desktop-hide';
const PLATE_DRESS = { padding: '0 12px 0 8px', minWidth: '72px', background: '', border: '' };
const PIC_DRESS = { padding: '0', minWidth: CTX_TOUCH + 'px', background: 'none', border: '0' };

/** The element dressed for a look: the plate or the picture alone, and its
 *  accessible name; the word's span hidden when no word is drawn.  Called
 *  only when the kind changes (the frame's compared write). */
function ctxDress(el, look) {
  const cls = look.plate ? PLATE_CLASS : PIC_CLASS;
  if (el.className !== cls) el.className = cls;
  const d = look.plate ? PLATE_DRESS : PIC_DRESS;
  el.style.padding = d.padding; el.style.minWidth = d.minWidth;
  el.style.background = d.background; el.style.border = d.border;
  if (el.getAttribute('aria-label') !== look.label) el.setAttribute('aria-label', look.label);
  if (el._btWordEl) el._btWordEl.style.display = look.word ? '' : 'none';
}

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
  const look = ctxLook(use);
  if (el._btKind !== use.kind) { el.setAttribute('data-kind', use.kind); el._btKind = use.kind; ctxDress(el, look); }
  const ic = look.pic;
  if (el._btIcon !== ic) {
    el.setAttribute('data-icon', ic);
    el._btIcon = ic;
    const imgs = el._btImgs || [];   /* kept by the ref (no search a frame) */
    for (let i = 0; i < imgs.length; i++) imgs[i].style.display = imgs[i].getAttribute('data-ctx-icon') === ic ? 'block' : 'none';
  }
  const w = el._btWord !== look.word ? el._btWordEl : null;
  if (w) { w.textContent = look.word; el._btWord = look.word; }
  const tf = 'translate(' + pos.x + 'px,' + pos.y + 'px) translate(-50%,-50%)';
  if (el._btTf !== tf) { el.style.transform = tf; el._btTf = tf; }
  ctxProbe(use, look);
  return use;
}

/* the probe, in the house style (__btShieldBtn): what is offered, written
   only when it changes */
let _probeKey = null;
function ctxProbe(p, look) {
  if (typeof window === 'undefined') return;
  const t = p && p.thing;
  const key = p ? p.kind + '|' + p.word + '|' + (t.id != null ? t.id : (t.name || '')) : '';
  if (key === _probeKey) return;
  _probeKey = key;
  /* v2.3.6552: and what is drawn (ctxLook): the picture, the word, the plate */
  window.__btCtxButton = p ? { kind: p.kind, word: p.word, skill: p.skill, id: t.id != null ? t.id : null, name: t.name || null, nodeType: t.nodeType || null,
    pic: look ? look.pic : null, drawn: look ? look.word : null, plate: look ? look.plate : null, ts: Date.now() } : { kind: null, ts: Date.now() };
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
    className: PLATE_CLASS,
    'data-show': '0',
    'aria-label': say(SAY, 'contextButton.label'),
    style: {
      position: 'fixed', left: 0, top: 0, zIndex: 29, display: 'none',   /* v2.3.6550 (part 18's join): under Attack (30) and the arc's 31s -- a thing under the thumb must not take their tap; still over the touch zones (6) */
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
  /* v2.3.6552: TALK's pill, the picture alone (ctxLook) */
  React.createElement('img', {
    key: CTX_TALK_PIC, 'data-ctx-icon': CTX_TALK_PIC, src: TALK_PILL_URL, alt: '', draggable: false, width: CTX_TALK_W, height: CTX_TALK_H,
    style: { display: 'none', width: CTX_TALK_W, height: CTX_TALK_H, objectFit: 'contain', pointerEvents: 'none' },
  }),
  React.createElement('span', { 'data-ctx': 'word', style: { pointerEvents: 'none' } }, ''));
}
