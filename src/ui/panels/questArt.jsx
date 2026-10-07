import React from 'react';
import { QUALITY_LABEL, qualityInk } from '../mobile/dash/common.js';

/* ═══ v2.3.3030: THE QUEST WINDOWS, IN THE OWNER'S OWN ART ═══
 *
 * Owner (2026-10-04), with three sheets of painted frames, buttons and
 * ornaments and a mockup of the flow they are for: "Add these for the new
 * quest windows."
 *
 * The pictures are the owner's, cut from those sheets by
 * tools/ui/cut-quest-art.sh into public/ui/quest/ (the sheets themselves are
 * kept in tools/ui/quest-art/).  This file draws them; it decides nothing
 * about quests -- QuestCompleteFlow.jsx (the windows) and the banner in
 * BroTown use these pieces, and the pieces keep no state.
 *
 * HOW A PAINTED FRAME FITS ANY CONTENT.  Every piece keeps its own shape:
 *   - the framed panel is a 9-slice that keeps the crest whole: the four
 *     corner ornaments and the crest (with its wood band and brackets) are
 *     drawn at one scale, `--qs`, and only plain band and plain fill
 *     stretch between them -- so a window grows with what it holds, is as
 *     wide as the screen allows, and the crest never squashes;
 *   - a button's states (gold / glowing / grey), a chip and its selected
 *     ring, a slot and its glow were re-fitted onto ONE canvas each by the
 *     cutter, so a state change swaps a picture and nothing moves;
 *   - the selected ring is the owner's selected sword chip with its middle
 *     lifted out, so the bow and the staff wear the same gold ring and check.
 * Sizes are a share of the element's own box, or of `--qs` for the frame's
 * ornaments, so a phone, a wide phone and a sideways phone draw the same art.
 *
 * NO FILTERS (TRAPS §42, the iOS grain over the WebGL canvas): the glow is
 * the owner's painted glow, the sparkles are pictures, and motion is
 * transform and opacity only.  docs/LANTERN-SLATE-SPEC.md, seventh
 * exception, says where this art may go and where it may not. */

const Q = '/ui/quest/';
export const QUEST_ART = {
  frameTL: Q + 'frame-tl.webp', frameTF: Q + 'frame-tf.webp', frameTC: Q + 'frame-tc.webp', frameTR: Q + 'frame-tr.webp',
  frameML: Q + 'frame-ml.webp', frameMC: Q + 'frame-mc.webp', frameMR: Q + 'frame-mr.webp',
  frameBL: Q + 'frame-bl.webp', frameBF: Q + 'frame-bf.webp', frameBR: Q + 'frame-br.webp',
  banner: Q + 'banner.webp', bannerCompact: Q + 'banner-compact.webp', bannerFlat: Q + 'banner-flat.webp',
  green: Q + 'green.webp',
  claim: Q + 'claim.webp', claimGlow: Q + 'claim-glow.webp', claimOff: Q + 'claim-off.webp',
  close: Q + 'close.webp', check: Q + 'check.webp',
  chipRing: Q + 'chip-ring.webp',
  slot: Q + 'slot.webp', slotGlow: Q + 'slot-glow.webp',
  badgeDone: Q + 'badge-done.webp', sparkGold: Q + 'spark-gold.webp', sparkGreen: Q + 'spark-green.webp',
  burst: Q + 'burst.webp', divider: Q + 'divider.webp', flourish: Q + 'flourish.webp',
};
/* The chip for each prog3 skill key (PROG3_SKILL_META): the owner drew the
   weapon into the chip, so the chip IS the skill's picture. */
export const QUEST_CHIP = {
  sword: Q + 'chip-melee.webp', bow: Q + 'chip-bow.webp', staff: Q + 'chip-magic.webp',
};
export const QUEST_ART_URLS = Object.keys(QUEST_ART).map(function (k) { return QUEST_ART[k]; })
  .concat(Object.keys(QUEST_CHIP).map(function (k) { return QUEST_CHIP[k]; }));

/* The game's own coin and XP pictures (the HUD's), so "+25 Gold" here is the
   same coin that counts up in the corner when it lands. */
export const QUEST_COIN = '/icons/ui/cur-gold.webp';
export const QUEST_XP = '/icons/ui/cur-xp.webp';

var h = React.createElement;
function art(src, cls, extra) {
  return h('img', Object.assign({ src: src, alt: '', draggable: false, className: cls, 'aria-hidden': 'true' }, extra || {}));
}

/** The framed navy panel with the crest: a window's body.  `children` sit
    inside the frame's gold line. */
export function QuestFrame(props) {
  return h('div', Object.assign({}, props.rest || {}, {
    className: 'bt-qw' + (props.className ? ' ' + props.className : ''),
    style: props.style,
    onClick: props.onClick,
  }),
  /* order matters only where pieces meet: the fill first, the crest last */
  h('div', { className: 'bt-qw-bg', 'aria-hidden': 'true' },
    art(QUEST_ART.frameMC, 'bt-qw-f bt-qw-f-mc'),
    art(QUEST_ART.frameML, 'bt-qw-f bt-qw-f-ml'),
    art(QUEST_ART.frameMR, 'bt-qw-f bt-qw-f-mr'),
    art(QUEST_ART.frameTF, 'bt-qw-f bt-qw-f-tfl'),
    art(QUEST_ART.frameTF, 'bt-qw-f bt-qw-f-tfr'),
    art(QUEST_ART.frameBF, 'bt-qw-f bt-qw-f-bf'),
    art(QUEST_ART.frameTL, 'bt-qw-f bt-qw-f-tl'),
    art(QUEST_ART.frameTR, 'bt-qw-f bt-qw-f-tr'),
    art(QUEST_ART.frameBL, 'bt-qw-f bt-qw-f-bl'),
    art(QUEST_ART.frameBR, 'bt-qw-f bt-qw-f-br'),
    art(QUEST_ART.frameTC, 'bt-qw-f bt-qw-f-tc')),
  h('div', { className: 'bt-qw-body' }, props.children));
}

/** The round X (the owner's): closes, with the caller's handler. */
export function QuestCloseX(props) {
  return h('button', {
    type: 'button',
    className: 'bt-qw-x',
    'data-qa': props.qa || 'dlg-close',
    'aria-label': props.label || 'Close',
    onClick: function (e) { e.stopPropagation(); if (props.onClick) props.onClick(e); },
  }, art(QUEST_ART.close, 'bt-qw-x-img'));
}

/** "+25 Gold  +30 XP" with the HUD's coin and XP pictures. */
export function QuestPay(props) {
  var gold = props.gold || 0, xp = props.xp || 0;
  if (!gold && !xp) return null;
  return h('div', { className: 'bt-qw-pay' + (props.small ? ' bt-qw-pay--small' : '') + (props.className ? ' ' + props.className : ''), 'data-qw-pay': '1' },
    gold ? h('span', { className: 'bt-qw-gold', 'data-qw-gold': gold }, art(QUEST_COIN, 'bt-qw-payicon'), '+' + gold + ' Gold') : null,
    /* spaces between the figures and after them: the page's TEXT must read
       "+25 Gold +30 XP ", not "+25 Gold+30 XPFor finishing" -- the quest
       scenarios find "30 XP" as a whole word */
    ' ',
    xp ? h('span', { className: 'bt-qw-xp', 'data-qw-xp': xp }, art(QUEST_XP, 'bt-qw-payicon'), '+' + xp + ' XP') : null,
    ' ');
}

/** A caption between two hairlines of the owner's divider rod. */
export function QuestCaption(props) {
  return h('div', { className: 'bt-qw-cap' + (props.className ? ' ' + props.className : '') }, h('span', null, props.children));
}

/** One reward in its slot: the item's picture large, its name, its rarity
    when it has one.  `glow` is the slot's glowing frame (a reward you now
    have, on the confirmation).
    RARITY is the game's own quality ladder (QUALITY_LABEL / QUALITY_COLOR,
    the bag's words and hues), read from the reward's `quality`: a plain
    'normal' item is unlabelled there and here -- which is every quest
    reward today (the worker mints them normal) -- so the owner's mockup's
    rarity line appears the day a quest pays a rare one. */
export function QuestSlot(props) {
  var it = props.item || {};
  var q = it.quality && it.quality !== 'normal' ? it.quality : null;
  /* The slot's frame is the box's BACKGROUND, not an <img>: the only picture
     in a reward is the reward (mp-questui counts the hand-over group's
     pictures, and a frame image would double them). */
  return h('div', { className: 'bt-qw-item', 'data-qw-item': it.label || '' },
    h('div', { className: 'bt-qw-slot' + (props.glow ? ' bt-qw-slot--glow' : '') },
      it.icon ? h('img', {
        src: it.icon, alt: it.label || '', draggable: false, className: 'bt-qw-slot-icon',
        /* a missing picture removes itself rather than leaving a broken
           glyph in a reward (QuestOfferPanel's rule since v2.3.1820) */
        onError: function (e) { e.currentTarget.style.display = 'none'; },
      }) : null),
    h('div', { className: 'bt-qw-item-name' }, it.label || ''),
    q ? h('div', { className: 'bt-qw-item-rarity', 'data-quality': q,
      style: qualityInk(q) }, QUALITY_LABEL[q] || q) : null);   /* v2.3.3142: godly's name a rainbow */
}

/** A skill chip (Melee / Bow / Magic): the owner's chip with its weapon,
    the gold ring and check over it when chosen. */
export function QuestSkillChip(props) {
  var on = !!props.selected;
  return h('button', {
    type: 'button',
    className: 'bt-qw-chip' + (on ? ' bt-qw-chip--on' : ''),
    'data-xp-skill': props.skill,
    'aria-pressed': on,
    onClick: function (e) { e.stopPropagation(); if (props.onClick) props.onClick(e); },
  },
  art(QUEST_CHIP[props.skill] || QUEST_CHIP.sword, 'bt-qw-chip-art'),
  on ? art(QUEST_ART.chipRing, 'bt-qw-chip-ring') : null,
  /* the label is the button's own text node, not a span: mp-questxp measures
     that node's line count, and chooseQuestSkill matches the button's text */
  props.label);
}

/** The claim button: grey until it can be pressed, gold when it can, the
    owner's glowing gold under a finger. */
export function QuestClaimButton(props) {
  var off = !!props.disabled;
  return h('button', {
    type: 'button',
    className: 'bt-qw-claim' + (props.className ? ' ' + props.className : ''),
    'data-tut': props.tut || undefined,
    'aria-disabled': off,
    'data-state': off ? 'off' : 'on',
    onClick: function (e) { e.stopPropagation(); if (!off && props.onClick) props.onClick(e); },
  },
  art(off ? QUEST_ART.claimOff : QUEST_ART.claim, 'bt-qw-claim-art'),
  off ? null : art(QUEST_ART.claimGlow, 'bt-qw-claim-glow'),
  h('span', { className: 'bt-qw-claim-label' }, props.children));
}

/** The green "Rewards claimed!" bar with the owner's round check. */
export function QuestClaimed(props) {
  return h('div', { className: 'bt-qw-claimed', 'data-qw-claimed': '1' },
    art(QUEST_ART.green, 'bt-qw-claimed-art'),
    art(QUEST_ART.check, 'bt-qw-claimed-check'),
    h('span', { className: 'bt-qw-claimed-label' }, props.children || 'Rewards claimed!'),
    art(QUEST_ART.sparkGold, 'bt-qw-spark bt-qw-spark--a'),
    art(QUEST_ART.sparkGold, 'bt-qw-spark bt-qw-spark--b'));
}

/** The green banner in the world.  `kind`:
      completed  QUEST COMPLETE! on the owner's big glowing banner, the crest's
                 burst and the sparkles playing once as it arrives; `compact`
                 the same, smaller (a window is up under it); `auto` the
                 laurel check on its crest -- the rewards are already yours;
      accepted   QUEST ACCEPTED! on the thin glowing one (two lines is all
                 it holds: the words and the quest);
      reward     QUEST REWARD on the flat one: the piece and where it went. */
export function QuestBanner(props) {
  var kind = props.kind || 'completed';
  var compact = !!props.compact;
  var src = kind === 'accepted' ? QUEST_ART.bannerCompact : kind === 'reward' ? QUEST_ART.bannerFlat : QUEST_ART.banner;
  var head = props.head || (kind === 'accepted' ? 'Quest Accepted!' : kind === 'reward' ? 'Quest Reward' : 'Quest Complete!');
  return h('div', {
    className: 'bt-qw-banner bt-qw-banner--' + kind + (compact ? ' bt-qw-banner--compact' : '') + (props.auto ? ' bt-qw-banner--auto' : ''),
    'data-qw-banner': kind,
  },
  kind === 'completed' ? art(QUEST_ART.burst, 'bt-qw-burst') : null,
  art(src, 'bt-qw-banner-art'),
  props.auto ? art(QUEST_ART.badgeDone, 'bt-qw-banner-badge') : null,
  kind === 'completed' ? art(QUEST_ART.sparkGold, 'bt-qw-spark bt-qw-spark--l') : null,
  kind === 'completed' ? art(QUEST_ART.sparkGreen, 'bt-qw-spark bt-qw-spark--r') : null,
  h('div', { className: 'bt-qw-banner-text' },
    h('div', { className: 'bt-qw-banner-head' }, head),
    props.title ? h('div', { className: 'bt-qw-banner-title' }, props.title) : null,
    (props.gold || props.xp) ? h(QuestPay, { gold: props.gold, xp: props.xp, small: true })
      : (props.sub ? h('div', { className: 'bt-qw-banner-sub' }, props.sub) : null)));
}
