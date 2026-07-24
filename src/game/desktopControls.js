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
    _desktopCloseAll = deps._desktopCloseAll,
    setShowPetHouse = deps.setShowPetHouse,
    setChatOpen = deps.setChatOpen,
    chatInputRef = deps.chatInputRef,
    chatOpen = deps.chatOpen;
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

      /* E — interact priority: building > sleep > gather > NPC quest */
      if (e.code === 'KeyE') {
        e.preventDefault();
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
        }
        return;
      }

      /* Q — toggle shield */
      if (e.code === 'KeyQ' && !e.repeat) {
        e.preventDefault();
        if (S._shieldUp) {
          S._shieldUp = false;
          _desktopShieldOff();
        } else {
          _desktopShieldOn();
        }
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

      /* C — open chat */
      if (e.code === 'KeyC' && !e.repeat) {
        e.preventDefault();
        setChatOpen(true);
        setTimeout(function() {
          if (chatInputRef.current) chatInputRef.current.focus();
        }, 50);
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
        S._shieldUp = false;
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
