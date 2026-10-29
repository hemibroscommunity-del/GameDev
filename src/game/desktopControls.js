/* ═══ DESKTOP CONTROLS — keyboard handlers (WASD is read by the game loop via S.keys) ═══ */
/* v2.3.789: moved verbatim from the game-loop useEffect in
   src/ui/BroTown.jsx (REBUILD-PLAN Phase 7, behavior-frozen). Registers
   keydown/keyup on window and returns the teardown the effect cleanup
   calls. Closure captures made explicit:
   - BT_AUDIO / getNpcQuest imported below (the `typeof getNpcQuest`
     guard in the E-handler is kept verbatim);
   - the _desktop* useCallback helpers, React setters, chatInputRef and
     the chatOpen value arrive via `deps` (destructured to the original
     names so the body is untouched). `chatOpen` is the value captured
     when the owning effect ran — identical staleness semantics to the
     original inline closure (the effect's dep array is unchanged).
   S is stateRef.current; S.keys feeds the movement code that stayed in
   the game loop. */
import { BT_AUDIO, getNpcQuest, calcDisplayHeal } from '@/data/index.js';
import { quickEatView } from '@/game/quickEat.js';   /* v2.3.3260: V eats */
import { eatBus } from '@/ui/mobile/eatBus.js';   /* v2.3.3260: ...through the bag's own Eat */
import { triggerJump } from '@/game/jumpActions.js';   /* v2.3.3017: X jumps; v2.3.3844: Space does */
import { trapButtonView, armTrap } from '@/game/trapping.js';   /* v2.3.3120: T arms a trap */
import { dashboardPanelBus } from '@/ui/mobile/dashboardPanelBus.js';   /* v2.3.3120: the Pet House opens the Pets page */
import { enterWheelDungeon } from '@/game/wheelDungeons.js';   /* v2.3.3016: E at a Wheel dungeon's mouth */
import { aceFlipBus } from '@/ui/mobile/aceFlipBus.js';   /* v2.3.3067: E at Ace opens his coin flip */
import { npcSpeaks } from '@/game/npcVoices.js';   /* v2.3.3462: the townsfolk answer in their own voices */
import { shopBus } from '@/ui/mobile/shopBus.js';   /* v2.3.3067: ...and at Diego his shop */
import { startFarmStep } from '@/game/farmWalk.js';   /* v2.3.3136: a bed on your farm, worked where it lies */
import { emotesLive } from '@/game/emotes.js';   /* v2.3.3391: B opens the emotes */
import { navIdForCode, navKey, browserChord, frontControl, pressControl, ESC_SEL, ENTER_SEL, MAP_KEY } from '@/game/deskKeys.js';
import { rideButtonWanted, toggleRide } from '@/game/ride.js';   /* v2.3.3776: Z rides the skateboard */
import { rideGround } from '@/game/rideGround.js';   /* v2.3.3407: I P J L K O, M, Enter, Esc */
import { toggleWorldMap } from '@/ui/WorldMapOverlay.jsx';   /* v2.3.3407: M */
import { dblTapRoll, tapDir } from '@/game/deskCombos.js';   /* v2.3.3711: a direction key tapped twice rolls */

/* v2.3.3711: `?dbltap=0` -- the double tap's roll off, for a tab (the owner's
   to keep or not: a quick double nudge of W rolls now) */
function dblTapOn() {
  try { return !(typeof location !== 'undefined' && /[?&]dbltap=0(?:&|$)/.test(location.search)); } catch (_e) { return true; }
}

/**
 * v2.3.3105: what runInteract would do here, for the right stick's picture
 * (BroTown's resolver): 'door' (a building, a hall, the Workshop, a dungeon's
 * mouth, the Pet House), 'sleep' (the farm's bed), 'gather' (a resource --
 * the stick's own harvest owns that), 'talk' (a character), or null.  The same
 * order as runInteract -- `{ npcFirst: true }` is the right stick's, the
 * character before the door.
 */
export function interactKind(S, opts) {
  if (!S) return null;
  if (opts && opts.npcFirst && S._nearNpc) return 'talk';   /* the right stick's order (runInteract) */
  if (questWaits(S) && !doorPromptUp(S)) return 'talk';   /* v2.3.3583: E's order too (runInteract); v2.3.3834: not over the door's prompt */
  if (S.nearBuilding != null || (S._nearWheelBuilding && S._nearWheelBuilding.hall)) return 'door';
  if (S._nearHouse) return 'sleep';
  if (S._nearWorkshop || S._nearWheelDoor || S._nearPetHouse) return 'door';
  /* v2.3.3136: a bed's next step on your farm -- 'farm-dig', 'farm-plant',
     'farm-water', 'farm-feed' or 'farm-harvest', each its own picture */
  if (S._nearBed && S._nearBed.step) return 'farm-' + S._nearBed.step;
  var gn = S._nearNode || S._proxNode;
  if (gn && gn.alive) return 'gather';
  if (S._nearNpc) return 'talk';
  return null;
}

/* ═══ v2.3.3583: A QUEST BESIDE YOU COMES BEFORE A DOOR ═══
   The owner: "change the npc dialog behavior to be tap only instead of
   proximity based" -- so walking up to a townsperson opens nothing now
   (BroTown NPC_PROX_OPENS).  On a phone the right stick's tap asks for the
   character first (npcFirst, below).  E asked for a DOOR first, and the
   givers stand by doors -- Mayor Bro at the Town Hall's steps -- so with the
   walk-up gone, E beside the Mayor opened the Town Hall and a keyboard could
   reach his quest only with the mouse.  A townsperson with a quest for you
   (offered, under way or ready: what walking up used to open) now comes
   before a door for E too; one with none leaves the door first, as before. */
function questWaits(S) {
  var npc = S && S._nearNpc;
  if (!npc) return false;
  try { return !!getNpcQuest(S.rpg, npc.name); } catch (e) { return false; }
}

/* ═══ v2.3.3834: E DOES WHAT THE PROMPT ON THE SCREEN SAYS ═══
   The judge pass (2026-10-29): at the Town Hall's door, Mayor Bro beside it,
   the prompt read "E  ENTER TOWN HALL" and E talked to the Mayor instead --
   v2.3.3583 put a townsperson with a quest before a door, for a keyboard that
   could reach his quest no other way.  Where the door's prompt is up (the
   same test the prompt itself makes, BroTown's "bt-interact-prompt": a
   building, or a Wheel hall's door), it is what E does; a townsperson with a
   quest still comes first everywhere else, and a click (or a tap) on him
   always talks.  The right stick's `npcFirst` order on a phone is unchanged. */
function doorPromptUp(S) {
  return !!(S && (S.nearBuilding != null || (S._nearWheelBuilding && S._nearWheelBuilding.hall)));
}

export function setupDesktopControls(S, deps) {
  var triggerContextualDodge = deps.triggerContextualDodge,
    _desktopEnterBuilding = deps._desktopEnterBuilding,
    _desktopSleep = deps._desktopSleep,
    _desktopOpenWorkshop = deps._desktopOpenWorkshop,
    _desktopGather = deps._desktopGather,
    _desktopNpcQuest = deps._desktopNpcQuest,
    _desktopShieldOff = deps._desktopShieldOff,
    _desktopCycleWeapon = deps._desktopCycleWeapon,
    _desktopSelectSlot = deps._desktopSelectSlot,
    _desktopSpecialAttack = deps._desktopSpecialAttack,
    _desktopElementBurst = deps._desktopElementBurst,   /* v2.3.1734 */
    _desktopCloseAll = deps._desktopCloseAll,
    setShowPetHouse = deps.setShowPetHouse,
    setChatOpen = deps.setChatOpen,
    chatInputRef = deps.chatInputRef,
    chatOpen = deps.chatOpen,
    toggleKbHints = deps.toggleKbHints,   /* v2.3.1715 */
    _desktopShieldBash = deps._desktopShieldBash, /* v2.3.1733 */
    _desktopWhirlwind = deps._desktopWhirlwind;   /* v2.3.1733 */
    /* ═══ v2.3.3105: THE INTERACT CHAIN, SHARED WITH THE RIGHT STICK ═══
       The owner: "I'd like the right joystick button to have an icon that
       represents the action like this current jump, the sword for attack,
       etc. so maybe chat bubble for speaking [to NPCs], door for entering
       door".  What E does beside a door, a bed, a dungeon's mouth or a
       character is what a tap on the stick does there now (BroTown's rE asks
       S._interactNow), and interactKind() below names it for the stick's
       picture -- one chain, so the picture can never promise one thing and
       the tap do another.  Returns true when it did something. */
    /* 4. The character beside you -- his quest, Ace's flip, Diego's shop, or
       "has nothing for you right now" (v2.3.3105: its own function, so the
       right stick can ask for it first) */
    var runTalk = function runTalk() {
      if (!S._nearNpc) return false;
      var npc = S._nearNpc;
      var npcQ = typeof getNpcQuest === 'function' ? getNpcQuest(S.rpg, npc.name) : null;
      if (npcQ) {
        _desktopNpcQuest(npc, npcQ);
        return true;
      }
      /* v2.3.3258: a keeper opens his building, as a tap does (BroTown.jsx
         openKeeper; data/wheelBuildingDoors.js WHEEL_KEEPERS) */
      if (npc.keeperOf && deps._desktopOpenKeeper && deps._desktopOpenKeeper(npc)) { npcSpeaks(S, npc); return true; }   /* v2.3.3664: he answers as he opens it */
      /* v2.3.3067: the same answers a TAP gives (BroTown.jsx tapNpcAtCss):
         Ace's coin flip and Diego's shop.  E said "has nothing for you"
         to both, and Ace's flip has no other door -- he stands in the
         Wheel's Brotown now (WHEEL_TOWNSFOLK), where a keyboard plays too. */
      /* v2.3.3462: each answer in his own voice, as a tap's (game/npcVoices.js) */
      if (npc.flip) {
        try { aceFlipBus.setStake(0); aceFlipBus.setOpen(true); } catch (_e) { /* display-only */ }
        npcSpeaks(S, npc);
        return true;
      }
      if (npc.shop) {
        S._npcProxLatch = { npc: npc, ready: false };   /* as the tap: closing it beside him does not reopen it */
        try { shopBus.setOpen(true); } catch (_e) { /* display-only */ }
        npcSpeaks(S, npc);
        return true;
      }
      /* v2.3.3121: Beastmaster Bro, his quests done: the Pets page, as a tap */
      if (npc.pets && S._serverCaps && S._serverCaps.petbook) {
        try { dashboardPanelBus.open('pets'); } catch (_e) { /* display-only */ }
        npcSpeaks(S, npc);
        return true;
      }
      /* v2.3.1717: he is right there and has nothing left.  Say so — a
         giver whose chain is finished used to go completely inert, which
         is indistinguishable from a broken NPC. */
      if (deps.pushNpcMsg) deps.pushNpcMsg(npc.name + ' has nothing for you right now');
      npcSpeaks(S, npc);
      return true;
    };
    var runInteract = function runInteract(opts) {
      /* the right stick asks for the character FIRST (opts.npcFirst): a door
         has its own Enter button, and Ace and Diego stand by theirs, so door
         first would never let the stick's tap reach them */
      if (opts && opts.npcFirst && S._nearNpc && runTalk()) return true;
      /* v2.3.3583: and E for a townsperson with a quest for you (questWaits) */
      /* v2.3.3834: ...unless the door's prompt is up: then E is the door, as it says */
      if (questWaits(S) && !doorPromptUp(S) && runTalk()) return true;
      /* 1. Building (v2.3.3066: or a Wheel hall's door) */
      if (S.nearBuilding != null || (S._nearWheelBuilding && S._nearWheelBuilding.hall)) {
        _desktopEnterBuilding();
        return true;
      }
      /* 2. Sleep at house */
      if (S._nearHouse) {
        _desktopSleep();
        return true;
      }
      /* 2b. Dungeon Workshop */
      if (S._nearWorkshop) {
        _desktopOpenWorkshop();
        return true;
      }
      /* 2b2. v2.3.3016: a Wheel dungeon's mouth (game/wheelDungeons.js) */
      if (S._nearWheelDoor) {
        enterWheelDungeon(S, S._nearWheelDoor.id);
        return true;
      }
      /* 2c. Pet House */
      if (S._nearPetHouse) {
        /* v2.3.3120: the Pets page when the worker keeps the pets record
           (BroTown's Pet House prompt does the same) */
        if (S._serverCaps && S._serverCaps.petbook) dashboardPanelBus.open('pets');
        else setShowPetHouse(true);
        BT_AUDIO.enterBuilding();
        return true;
      }
      /* 2d. v2.3.3136: a bed on your farm -- its next step, kneeling there
         (game/farmWalk.js) */
      if (S._nearBed && S._nearBed.step && startFarmStep(S, S._nearBed.i)) return true;
      /* 3. Gather node.  v2.3.1448: the shell now only opens on a TAP
         (S._nearNode), but the desktop E key keeps its proximity
         behaviour — S._proxNode is the closest resource in reach. */
      var _gn = S._nearNode || S._proxNode;
      if (_gn && _gn.alive) {
        _desktopGather();
        return true;
      }
      /* 4. Nearby NPC — open quest dialog */
      if (S._nearNpc && runTalk()) return true;
      return false;
    };
    S._interactNow = runInteract;
    /* ═══ DESKTOP KEYBOARD CONTROLS ═══ */
    S._isDesktop = window.matchMedia('(pointer:fine)').matches;
    var onKeyDown = function onKeyDown(e) {
      var _document$activeEleme, _S$rpg25;
      var _ae = document.activeElement, _aeTag = _ae && _ae.tagName;
      if (_aeTag === 'INPUT' || _aeTag === 'TEXTAREA') return; /* typing in a field (chat bar etc.) -- don't drive the game */
      S.keys[e.key] = true;
      S._isDesktop = true; /* any keyboard input confirms desktop */

      /* ═══ v2.3.3711: A DIRECTION KEY TAPPED TWICE ROLLS THAT WAY ═══
         The owner: "I still think there are better layouts if you consider
         more creative combos".  W, A, S or D (or an arrow) pressed twice
         within 250 ms is a dodge roll that way, the move a PC action game's
         player reaches for without leaving the keys they walk with; Space
         still rolls (X since v2.3.3844, when Space became the jump).  The rule is game/deskCombos.js (node-tested): only
         presses count (a held key's repeats never), only the same key pairs,
         the other axis from the keys held across it (W held, D tapped twice:
         up and right, as Space there).  The press still walks -- nothing
         returns here -- and the roll is the roll key's own call, so a lock still
         turns it into the sword's lunge or the bow's retreat shot
         (dodge.js resolveDodgeContext).  `?dbltap=0` turns it off. */
      if (!e.repeat && !browserChord(e) && tapDir(e.key) && dblTapOn()) {
        var _K = S.keys;
        var _held = {
          up: !!(_K['w'] || _K['W'] || _K['ArrowUp']), down: !!(_K['s'] || _K['S'] || _K['ArrowDown']),
          left: !!(_K['a'] || _K['A'] || _K['ArrowLeft']), right: !!(_K['d'] || _K['D'] || _K['ArrowRight']),
        };
        /* the tap's own time (e.timeStamp: when the key went down), never
           when this handler got to it -- on a slow frame two quick taps wait
           and run together, or the second waits a frame and reads late */
        var _tapAt = (typeof e.timeStamp === 'number' && e.timeStamp > 0) ? e.timeStamp : Date.now();
        var _rollAng = dblTapRoll(S._dblTap || (S._dblTap = { key: null, at: 0 }), e.key, _tapAt, _held);
        if (_rollAng != null && S.rpg && !S._dodgeRoll) {
          S._dblTapRolls = (S._dblTapRolls || 0) + 1;   /* QA: mp-deskkeys counts them */
          triggerContextualDodge(S, S.rpg, _rollAng);
        }
      }

      /* ═══ v2.3.3844: SPACE JUMPS, X ROLLS ═══
         The owner, 2026-10-29: "Also spacebar I think should be jump."  Space
         was the dodge roll (and X the jump, v2.3.3017); the two swap.  Space
         is the jump: one press, one jump, a held key's repeats nothing more
         (game/jumpActions.js; the touch button is JumpButton.jsx), and a
         second press in the air is the double jump's flip, as X's was.  Its
         repeats are still refused to the browser: Space must never scroll the
         page, nor press a button a click left focused (the keyup below
         refuses that too). */
      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) triggerJump(S);
        return;
      }

      /* X -- the dodge roll in movement or facing direction (§5.8
         contextual), exactly as Space rolled it until v2.3.3844. */
      if (e.code === 'KeyX') {
        e.preventDefault();
        var _R1 = S.rpg;
        if (!_R1 || S._dodgeRoll) return;
        /* Direction: WASD if held, else mouse aim, else facing. */
        var ddx = 0, ddy = 0;
        if (S.keys['w'] || S.keys['W'] || S.keys['ArrowUp']) ddy = -1;
        if (S.keys['s'] || S.keys['S'] || S.keys['ArrowDown']) ddy = 1;
        if (S.keys['a'] || S.keys['A'] || S.keys['ArrowLeft']) ddx = -1;
        if (S.keys['d'] || S.keys['D'] || S.keys['ArrowRight']) ddx = 1;
        var ang;
        if (ddx || ddy) ang = Math.atan2(ddy, ddx);
        else if (S._mouseAimAngle != null) ang = S._mouseAimAngle;
        else {
          var dirs = { down: Math.PI / 2, up: -Math.PI / 2, left: Math.PI, right: 0 };
          ang = dirs[S.player.dir] || 0;
        }
        triggerContextualDodge(S, _R1, ang);
        return;
      }

      /* ═══ v2.3.3776: Z — THE SKATEBOARD ═══
         The board button's twin (ui/panels/RideButton.jsx): on, and off
         again, where the button is shown -- BroTown's safe ground, a worker
         that carries boards.  Anywhere else it does nothing. */
      if (e.code === 'KeyZ' && !e.repeat) {   /* RIDE_KEY (deskKeys.js), written out as the other keys are (desk-keys.test §6) */
        if (rideButtonWanted(S, rideGround(S))) {
          e.preventDefault();
          toggleRide(S, Date.now(), function (type, payload) { if (S.channel) S.channel.send({ type: type, payload: payload }); });
          return;
        }
      }

      /* ═══ v2.3.3120: T — TRAP ═══
         The TRAP pop-up's key (ui/panels/TrapButton.jsx): arm a trap on the
         monster you have targeted.  A free key under the left hand; with no
         monster targeted, or a grey button, it does what a tap would --
         nothing is sent (game/trapping.js armTrap). */
      if (e.code === 'KeyT' && !e.repeat) {
        if (trapButtonView(S)) {
          e.preventDefault();
          armTrap(S);
          return;
        }
      }

      /* ═══ v2.3.3260: V — QUICK EAT ═══
         The touch button's twin (ui/panels/QuickEatButton.jsx): the heal
         that fills what you are missing, else the biggest you carry
         (game/quickEat.js), eaten through the bag's own Eat.  A free key
         under the left hand; with nothing to eat it does nothing. */
      if (e.code === 'KeyV' && !e.repeat) {
        var _qe = quickEatView(S, calcDisplayHeal);
        if (_qe) {
          e.preventDefault();
          eatBus.open(_qe.key);
          return;
        }
      }

      /* v2.3.1733: R — Whirlwind (stamina ability, char 8).  A free key: R
         was unbound, and the ability needs one that is reachable while the
         left hand is on WASD. */
      if (e.code === 'KeyR' && !e.repeat) {
        e.preventDefault();
        if (_desktopWhirlwind) _desktopWhirlwind();
        return;
      }

      /* E — interact priority: building > sleep > gather > NPC quest */
      if (e.code === 'KeyE') {
        e.preventDefault();
        /* ═══ v2.3.1733: E WHILE BLOCKING IS SHIELD BASH ═══
           The plan asks for E, and E is the interact key — so the block
           state disambiguates: you cannot be talking to the mayor and
           holding a shield up at the same time, and everything below this
           line requires standing next to something.  Taking the FIRST
           branch (rather than appending to the bottom of the chain) means
           blocking next to an NPC bashes rather than opening dialogue,
           which is the reading that matches the finger already on Q. */
        /* v2.3.3711: the bash is a left click with the shield up now (the
           right mouse button holds it: BroTown onMouseDown); E with the guard
           up still bashes, quietly, for a hand that learned Q+E */
        if (S._shieldUp && _desktopShieldBash) {
          _desktopShieldBash();
          return;
        }
        /* ═══ v2.3.3407: A HARVEST UNDER WAY OWNS E ═══
           The owner: "I don't think you can harvest lifeskills right now on
           the computer."  E started a harvest and then had nothing to do: the
           gesture that ends one was asked for on a button a computer does not
           show (gesturePose.js DESK_GESTURE_HINT).  Held now, E WORKS the
           gesture (ExtractionSwipeLayer's S._harvestKeys) -- and a second
           press no longer starts the harvest over: runInteract below reaches
           the resource through S._proxNode, which stays set while you work
           it, and startExtraction drops the attempt in flight for a new one,
           so every press of E threw the wind-up away. */
        if (S._extraction) {
          if (S._harvestKeys) S._harvestKeys.down();
          return;
        }
        /* v2.3.3407: one press, one interact -- a held E's repeats start
           nothing (held through a finished harvest, its repeats would start
           the next resource's) */
        if (e.repeat) return;
        /* 1-4. v2.3.3105: the interact chain lives in runInteract (below), so
           the right stick's tap -- which wears its picture -- runs the very
           same one */
        if (runInteract()) {
          /* v2.3.3407: the press that starts a harvest, held on, works it once
             the window opens -- "hold E to harvest" */
          if (S._extraction && S._harvestKeys) S._harvestKeys.down();
          return;
        }
        /* v2.3.1717: NOT in range, but close enough that the player plainly
           MEANT this NPC.  E used to return in silence here, and a judge on a
           fresh character read that as "the mayor is broken" rather than
           "walk closer" — the interact radius is under three tiles and there
           is no on-screen cue for where it ends. */
        if (S.npcs && S.currentZone === 'town' && S.player) {
          var _bestD = 220, _bestN = null;
          S.npcs.forEach(function (n2) {
            if (!n2 || !n2.alive) return;
            var d2 = Math.sqrt(Math.pow(n2.x - S.player.x, 2) + Math.pow(n2.y - S.player.y, 2));
            if (d2 < _bestD) { _bestD = d2; _bestN = n2; }
          });
          if (_bestN && deps.pushNpcMsg) deps.pushNpcMsg('Too far from ' + _bestN.name);
        }
        return;
      }

      /* ═══ v2.3.3711: Q — THE WEAPON'S SPECIAL ═══
         The owner: "Do your recommended keyboard layout."  The special is the
         fighting move you reach for most after the swing, so it takes the key
         under the left hand's first finger beside W -- Q, where the shield
         was.  The shield is the right mouse button HELD now (BroTown's
         canvas onMouseDown, released by onMouseUp below; v2.3.3847: pressed
         up and pressed down again, a toggle): a guard on the hand that aims it.  Aimed at the mouse, as F and the right
         click were (both gave it up: F is the Element Burst, the right button
         the shield).  Q+E's bash is a left click with the shield up.
         v2.3.1726's note on the old Q (the mouse-steered shield) lives on in
         BroTown's rAF loop, which _shieldKb still drives. */
      if (e.code === 'KeyQ' && !e.repeat) {
        e.preventDefault();
        if (S._mouseAimAngle != null) S._aimAngle = S._mouseAimAngle;
        _desktopSpecialAttack();
        return;
      }

      /* Tab — cycle weapon slot */
      if (e.code === 'Tab') {
        e.preventDefault();
        _desktopCycleWeapon();
        return;
      }

      /* 1/2/3 — direct weapon slot */
      if (e.code === 'Digit1') {
        _desktopSelectSlot('melee');
        return;
      }
      if (e.code === 'Digit2') {
        _desktopSelectSlot('ranged');
        return;
      }
      if (e.code === 'Digit3' && (_S$rpg25 = S.rpg) !== null && _S$rpg25 !== void 0 && _S$rpg25.staffWeapon) {
        _desktopSelectSlot('staff');
        return;
      }

      /* ═══ v2.3.3711: F — THE ELEMENT BURST (G STILL WORKS) ═══
         The special moved to Q, and F, the left hand's other near key, is the
         burst's now -- G was a stretch off WASD.  G keeps working, quietly
         (unlisted), for a hand that learned it.
         v2.3.1734's note: the burst is its own ability with its own resource
         curve, not a stronger special, so it is its own key; unlike the touch
         button (which hides when ineligible) the key is always live, and
         elementBurst floats the reason it refused. */
      if ((e.code === 'KeyF' || e.code === 'KeyG') && !e.repeat) {
        e.preventDefault();
        _desktopElementBurst();
        return;
      }

      /* C — open chat */
      if (e.code === 'KeyC' && !e.repeat) {
        e.preventDefault();
        setChatOpen(true);
        setTimeout(function() {
          if (chatInputRef.current) chatInputRef.current.focus();
        }, 50);
        return;
      }

      /* ═══ v2.3.3391: B — THE EMOTES (B for Bro) ═══
         The picker's only door was the hidden toolbar's.  1-3 already pick
         weapons, so the plan's "1-8 for emotes" was out; B toggles the picker
         (BroTown's window.__broLegacyUI.emotes), as the chat box's smiley
         opens it on a phone.  After the C handler for the same reason H is:
         the INPUT/TEXTAREA guard at the top keeps a typed "b" out of it. */
      if (e.code === 'KeyB' && !e.repeat) {
        e.preventDefault();
        var _emoteUi = typeof window !== 'undefined' ? window.__broLegacyUI : null;
        if (_emoteUi && typeof _emoteUi.emotes === 'function' && emotesLive(S)) _emoteUi.emotes();
        return;
      }

      /* v2.3.1715: H — hide/show the keyboard-hints strip (owner: "do a
         toggle on and off option for it too").  Placed after the KeyC
         handler above so it inherits the same INPUT/TEXTAREA guard at the
         top of this function: typing "h" in chat must not toggle the HUD.
         The strip itself is also tappable — this is the second door, not
         the only one, which is why H is listed ON the strip. */
      if (e.code === 'KeyH' && !e.repeat) {
        e.preventDefault();
        if (toggleKbHints) toggleKbHints();
        return;
      }

      /* ═══ v2.3.3407: I P J L K O -- THE DASHBOARD'S SIX BUTTONS; M -- THE MAP ═══
         The owner: "For computer usage if there's a key that makes sense to
         use for a certain action just put the letter next to the icon or
         action in a tasteful way."  Each button wears its letter (NavRail,
         the minimap's open button: game/deskKeys.js is the one table).  A
         key does what a click on its button does, and closes the page it
         opened when pressed again.  Never with Ctrl, Cmd or Alt held: those
         are the browser's (Ctrl+P, Cmd+L, Ctrl+J). */
      if (!browserChord(e) && !e.repeat && S.rpg) {
        var _navId = navIdForCode(e.code);
        if (_navId) {
          e.preventDefault();
          BT_AUDIO.uiClickNow();
          navKey(_navId);
          return;
        }
        if (e.code === 'Key' + MAP_KEY) {
          if (toggleWorldMap()) {
            e.preventDefault();
            BT_AUDIO.uiClickNow();
          }
          return;
        }
      }

      /* ═══ v2.3.3407: Enter -- A DIALOGUE'S OWN BUTTON ═══
         Mayor Bro's Next / Continue and the quest's Accept Quest / Claim
         Rewards (data-enter, each wearing "Enter"), the one in front.  With
         none up, Enter is left alone -- a focused button's own Enter. */
      if ((e.code === 'Enter' || e.code === 'NumpadEnter') && !e.repeat && !browserChord(e)) {
        var _go = frontControl(ENTER_SEL);
        if (_go) {
          e.preventDefault();
          pressControl(_go);
          return;
        }
      }

      /* Escape — close chat first, then close panels */
      if (e.code === 'Escape') {
        if (chatOpen) {
          setChatOpen(false);
          if (chatInputRef.current) chatInputRef.current.blur();
          return;
        }
        /* ═══ v2.3.3407: ...THE WINDOW IN FRONT, BY ITS OWN ✕ ═══
           Each window's ✕ wears "Esc" on a computer (data-esc, and every
           .bt-inspect-close), so Esc presses THAT ✕: whatever closing it
           does, Esc does -- the world map, Diego, Ace, the daily rewards and
           the item card were not closed by it at all, and one window over
           another now closes one at a time.  Then the old sweep for a window
           with no ✕ of that kind (a .bt-inspect window, a character's
           dialogue), then the dashboard's open page (back one step, then
           shut). */
        var _x = frontControl(ESC_SEL);
        if (_x) {
          pressControl(_x);
          return;
        }
        if (document.querySelector('.bt-inspect, .bt-npcdlg-scrim')) {
          _desktopCloseAll();
          return;
        }
        if (dashboardPanelBus.state.mode === 'expanded') {
          dashboardPanelBus.pop();
          return;
        }
        _desktopCloseAll();
        return;
      }
    };
    var onKeyUp = function onKeyUp(e) {
      S.keys[e.key] = false;
      /* v2.3.3844: Space is the jump: its release never presses the button a
         click left focused (a button's Space press lands on the keyup) --
         except in a field, where Space is a space */
      if (e.code === 'Space') {
        var _uae = document.activeElement, _uTag = _uae && _uae.tagName;
        if (_uTag !== 'INPUT' && _uTag !== 'TEXTAREA' && _uTag !== 'SELECT' && !(_uae && _uae.isContentEditable)) e.preventDefault();
      }
      /* v2.3.3006: Shift is the sprint now, so it is held WHILE walking, and a
         letter's e.key changes case with it: press W, press Shift, let go of W
         and the keyup says 'W' -- K['w'] stayed true and you walked on with
         no key down.  A letter's release clears both cases. */
      if (typeof e.key === 'string' && e.key.length === 1) {
        S.keys[e.key.toLowerCase()] = false;
        S.keys[e.key.toUpperCase()] = false;
      }
      /* v2.3.3711: Q is the special now, so its release lowers nothing (the
         right mouse button's did; v2.3.3847: its next press does) */
      /* v2.3.3407: let go of E, and the harvest's gesture stops being worked */
      if (e.code === 'KeyE' && S._harvestKeys) S._harvestKeys.up();
    };
    /* v2.3.3006: a key held as the window loses focus never sends its keyup
       (alt-tab with Shift down kept a sprint running, with W down kept you
       walking), so every held key is let go there. */
    var onBlur = function onBlur() {
      for (var k in S.keys) S.keys[k] = false;
      if (S._harvestKeys) S._harvestKeys.up();   /* v2.3.3407: ...E's work too */
      /* v2.3.3711: ...and a shield held on the right mouse button: its
         release would come to another window.  v2.3.3847: a toggle now, and
         still lowered here: alt-tab away and back, and the guard you see is
         the guard you have -- down, one right click from up -- never a
         guard left raised while you were in another window */
      if (S._shieldMouse) { S._shieldMouse = false; _desktopShieldOff(); }
    };
    /* v2.3.3711's onMouseUp (the right button's release lowered the guard)
       is gone with v2.3.3847: the right button is a toggle -- "right click
       should just hold up shield until you click right click again" -- and
       the next right press lowers it (BroTown _deskRightPress). */
    /* ═══ v2.3.3711: NO BROWSER MENU OVER THE GAME ═══
       The right button is the shield, so its click must never open the
       browser's menu: the canvas refused it already, but a guard let go over
       the pages or a button opened it there (Windows opens it on the release,
       where the pointer is then).  Anywhere in the page on a computer, except
       where the menu is the point: a text field (paste) and a link. */
    var onContextMenu = function onContextMenu(e) {
      try {
        if (!(window.matchMedia && window.matchMedia('(pointer:fine)').matches)) return;   /* phones unchanged */
        var t = e.target;
        if (t && t.closest && t.closest('input, textarea, select, [contenteditable="true"], a[href]')) return;
        e.preventDefault();
      } catch (_e) { /* the browser's menu, then */ }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('contextmenu', onContextMenu);
  return function teardownDesktopControls() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    document.removeEventListener('contextmenu', onContextMenu);
  };
}
