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
import { BT_AUDIO, getNpcQuest } from '@/data/index.js';
import { cycleTarget } from '@/game/targeting.js'; /* v2.3.2230 */

export function setupDesktopControls(S, deps) {
  var triggerContextualDodge = deps.triggerContextualDodge,
    _desktopEnterBuilding = deps._desktopEnterBuilding,
    _desktopSleep = deps._desktopSleep,
    _desktopOpenWorkshop = deps._desktopOpenWorkshop,
    _desktopGather = deps._desktopGather,
    _desktopNpcQuest = deps._desktopNpcQuest,
    _desktopShieldOn = deps._desktopShieldOn,
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
    /* ═══ DESKTOP KEYBOARD CONTROLS ═══ */
    S._isDesktop = window.matchMedia('(pointer:fine)').matches;
    var onKeyDown = function onKeyDown(e) {
      var _document$activeEleme, _S$rpg25;
      var _ae = document.activeElement, _aeTag = _ae && _ae.tagName;
      if (_aeTag === 'INPUT' || _aeTag === 'TEXTAREA') return; /* typing in a field (chat bar etc.) -- don't drive the game */
      S.keys[e.key] = true;
      S._isDesktop = true; /* any keyboard input confirms desktop */

      /* Space — dodge roll in movement or facing direction (§5.8 contextual). */
      if (e.code === 'Space') {
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
        if (S._shieldUp && _desktopShieldBash) {
          _desktopShieldBash();
          return;
        }
        /* 1. Building */
        if (S.nearBuilding !== null) {
          _desktopEnterBuilding();
          return;
        }
        /* 2. Sleep at house */
        if (S._nearHouse) {
          _desktopSleep();
          return;
        }
        /* 2b. Dungeon Workshop */
        if (S._nearWorkshop) {
          _desktopOpenWorkshop();
          return;
        }
        /* 2c. Pet House */
        if (S._nearPetHouse) {
          setShowPetHouse(true);
          BT_AUDIO.enterBuilding();
          return;
        }
        /* 3. Gather node.  v2.3.1448: the shell now only opens on a TAP
           (S._nearNode), but the desktop E key keeps its proximity
           behaviour — S._proxNode is the closest resource in reach. */
        var _gn = S._nearNode || S._proxNode;
        if (_gn && _gn.alive) {
          _desktopGather();
          return;
        }
        /* 4. Nearby NPC — open quest dialog */
        if (S._nearNpc) {
          var npc = S._nearNpc;
          var npcQ = typeof getNpcQuest === 'function' ? getNpcQuest(S.rpg, npc.name) : null;
          if (npcQ) {
            _desktopNpcQuest(npc, npcQ);
            return;
          }
          /* v2.3.1717: he is right there and has nothing left.  Say so — a
             giver whose chain is finished used to go completely inert, which
             is indistinguishable from a broken NPC. */
          if (deps.pushNpcMsg) deps.pushNpcMsg(npc.name + ' has nothing for you right now');
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

      /* Q — toggle shield */
      /* v2.3.2229: the touch shield is a toggle too now (ShieldButton), and
         both sides go through shieldToggle.js -- the desktop wrappers
         _desktopShieldOn/Off are what BroTown binds to that module. */
      if (e.code === 'KeyQ' && !e.repeat) {
        e.preventDefault();
        if (S._shieldUp) {
          S._shieldKb = false;
          _desktopShieldOff();
        } else {
          /* v2.3.1726: aim the shield at the mouse.  Blocking is directional
             (±BLOCK_ARC_HALF) and on mobile the block ring steers
             S._shieldAngle every frame — but this path never set it, so a
             desktop shield pointed wherever the player last WALKED
             (wsClient falls back to _facingAngle) and directional blocking
             felt random on a keyboard.  Seed from the mouse-aim angle here;
             the rAF loop in BroTown keeps it tracking the cursor while
             _shieldKb holds (mirroring the ring's every-frame writes). */
          if (typeof S._mouseAimAngle === 'number') S._shieldAngle = S._mouseAimAngle;
          S._shieldKb = true;
          _desktopShieldOn();
        }
        return;
      }

      /* v2.3.2230: T — cycle the locked target through the monsters in the
         perimeter (Shift+T goes the other way).  The desktop twin of the
         touch arrows; Tab was already the weapon cycle. */
      if (e.code === 'KeyT' && !e.repeat) {
        e.preventDefault();
        try { cycleTarget(S, e.shiftKey ? -1 : 1); } catch (err) { /* nothing in range */ }
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

      /* F — special attack toward mouse aim */
      if (e.code === 'KeyF' && !e.repeat) {
        e.preventDefault();
        if (S._mouseAimAngle != null) S._aimAngle = S._mouseAimAngle;
        _desktopSpecialAttack();
        return;
      }

      /* v2.3.1734: G — Element Burst (COMBAT-OVERHAUL-PLAN PR 6).  G
         rather than a modifier on F: the burst is a different ability
         with a different resource curve, not a stronger special, and
         every other combat verb here is its own single key.  Unlike the
         touch button (which hides when ineligible) the key is always
         live, so elementBurst floats the reason it refused. */
      if (e.code === 'KeyG' && !e.repeat) {
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

      /* Escape — close chat first, then close panels */
      if (e.code === 'Escape') {
        if (chatOpen) {
          setChatOpen(false);
          if (chatInputRef.current) chatInputRef.current.blur();
          return;
        }
        _desktopCloseAll();
        return;
      }
    };
    var onKeyUp = function onKeyUp(e) {
      S.keys[e.key] = false;
      /* Release Q → drop shield */
      if (e.code === 'KeyQ' && S._shieldUp) {
        S._shieldKb = false; /* v2.3.1726: stop the rAF mouse-steer too */
        _desktopShieldOff();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
  return function teardownDesktopControls() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };
}
