import React from 'react';
import { BT_AUDIO, MAX_PET_SLOTS, TRAP_HP_THRESHOLD, addLifeSkillXp, createPet, xpRequired } from '@/data/index.js';
import { btRpc, getBtPassphrase, getBtPlayerId, syncRpgToServer } from '@/networking/index.js';
import { _asyncToGenerator, _objectSpread, _regenerator, _slicedToArray } from '@/lib/babelHelpers.js';

/* === MenuBar — the bottom action / menu button bar === */
/* v2.3.894: extracted verbatim from the scrollable HUD button-bar div in
   BroTown.jsx's render (the horizontal-scroll row of buttons that open
   the panels: inventory, skills, stats, social, clan, guild,
   leaderboard, encyclopedia, feedback, shop, emotes, info; plus the
   special-attack button, chat toggle, pet/body bits). Behavior-frozen
   UI decomposition; the div is the LAST sibling extracted here -- only
   the createElement subtree moves, the rest of the tree stays. 32 props
   carry rpgState/stateRef + the show* flags, the panel-toggle setters,
   and the doSpecialAttack handler. Data/helper imports verified real
   exports (createPet from items via the @/data barrel; btRpc, the getBt
   id/passphrase helpers and syncRpgToServer from @/networking);
   async/regenerator + spread/slice babel helpers imported; 7 hoisted
   temps declared locally. */
export function MenuBar(props) {
  var stateRef = props.stateRef,
    rpgState = props.rpgState,
    bodySize = props.bodySize,
    chatOpen = props.chatOpen,
    friendsList = props.friendsList,
    unreadChats = props.unreadChats,
    showClanPanel = props.showClanPanel,
    showEncyclopedia = props.showEncyclopedia,
    showFeedback = props.showFeedback,
    showGuildPanel = props.showGuildPanel,
    showInventory = props.showInventory,
    showLeaderboard = props.showLeaderboard,
    showSkills = props.showSkills,
    showSocialPanel = props.showSocialPanel,
    showStatScreen = props.showStatScreen,
    doSpecialAttack = props.doSpecialAttack,
    setBodySize = props.setBodySize,
    setChatOpen = props.setChatOpen,
    setRpgState = props.setRpgState,
    setUnreadChats = props.setUnreadChats,
    setShowClanPanel = props.setShowClanPanel,
    setShowEmotes = props.setShowEmotes,
    setShowEncyclopedia = props.setShowEncyclopedia,
    setShowFeedback = props.setShowFeedback,
    setShowGuildPanel = props.setShowGuildPanel,
    setShowInfo = props.setShowInfo,
    setShowInventory = props.setShowInventory,
    setShowLeaderboard = props.setShowLeaderboard,
    setShowShop = props.setShowShop,
    setShowSkills = props.setShowSkills,
    setShowSocialPanel = props.setShowSocialPanel,
    setShowStatScreen = props.setShowStatScreen;
  var _Object$entries8, _Object$entries9, _S$myBroData, _sk$trapping, _sk$woodcutting, _stateRef$current59, _stateRef$current60;
  return React.createElement("div", {
    style: {
      // Legacy bottom toolbar — replaced by the utility wheel (§1.7d).
      // Hidden in v14.x; kept in tree to avoid surgery on a 33k-line file
      // and because some buttons drive functions not yet relocated.
      display: 'none',
      background: 'rgba(10,8,20,.95)',
      borderTop: '1px solid rgba(255,255,255,.08)',
      alignItems: 'center',
      gap: 3,
      padding: '3px 6px',
      flexShrink: 0,
      height: 44,
      overflowX: 'auto',
      overflowY: 'hidden',
      WebkitOverflowScrolling: 'touch'
    }
  }, /*#__PURE__*/React.createElement(React.Fragment, null, rpgState && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 3,
      flexShrink: 0,
      marginRight: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      fontWeight: 800,
      color: '#fff'
    }
  }, "Lv", rpgState.level), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 4,
      background: 'rgba(255,255,255,.1)',
      borderRadius: 2,
      overflow: 'hidden'
    },
    title: 'XP: ' + rpgState.xp + '/' + xpRequired(rpgState.level)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: Math.min(100, rpgState.xp / xpRequired(rpgState.level) * 100) + '%',
      height: '100%',
      background: '#a78bfa',
      borderRadius: 2
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      fontWeight: 800,
      color: '#f5c542'
    }
  }, "\uD83D\uDCB0", rpgState.coins)), function (_stateRef$current59) {
    var closeAll = function closeAll() {
      setShowStatScreen(false);
      setShowInventory(false);
      setShowSkills(false);
      setShowClanPanel(false);
      setShowSocialPanel(false);
      setShowEmotes(false);
      setShowShop(false);
      setShowInfo(false);
      setShowEncyclopedia(false);
      setShowLeaderboard(false);
      setShowGuildPanel(false);
      setShowFeedback(false);
    };
    var tog = function tog(getter, setter) {
      if (getter) {
        closeAll();
      } else {
        closeAll();
        setter(true);
      }
    };
    return [{
      e: '💬',
      badge: unreadChats || 0,
      fn: function fn() {
        setChatOpen(function (s) {
          return !s;
        });
        if (!chatOpen) setUnreadChats(0);
      }
    }, {
      e: '⚔️',
      fn: function fn() {
        return tog(showStatScreen, setShowStatScreen);
      }
    }, {
      e: '🎒',
      badge: (((_stateRef$current59 = stateRef.current) === null || _stateRef$current59 === void 0 || (_stateRef$current59 = _stateRef$current59.rpg) === null || _stateRef$current59 === void 0 ? void 0 : _stateRef$current59.weaponStash) || []).length || 0,
      fn: function fn() {
        return tog(showInventory, setShowInventory);
      }
    }, {
      e: '📊',
      fn: function fn() {
        return tog(showSkills, setShowSkills);
      }
    }, {
      e: '📖',
      fn: function fn() {
        return tog(showEncyclopedia, setShowEncyclopedia);
      }
    }, {
      e: '🏛️',
      fn: function fn() {
        return tog(showGuildPanel, setShowGuildPanel);
      }
    }, {
      e: '🏆',
      fn: function fn() {
        return tog(showLeaderboard, setShowLeaderboard);
      }
    }, {
      e: '📝',
      fn: function fn() {
        return tog(showFeedback, setShowFeedback);
      }
    }, {
      e: '🏰',
      fn: function fn() {
        return tog(showClanPanel, setShowClanPanel);
      }
    }, {
      e: '👥',
      badge: friendsList.length || 0,
      fn: function fn() {
        return tog(showSocialPanel, setShowSocialPanel);
      }
    }, {
      e: bodySize === 'slim' ? '🧍' : '🛡️',
      fn: function fn() {
        var nb = bodySize === 'slim' ? 'armored' : 'slim';
        setBodySize(nb);
        stateRef.current.bodySize = nb;
      }
    }, {
      e: '💥',
      bg: function (_stateRef$current60) {
        var R = (_stateRef$current60 = stateRef.current) === null || _stateRef$current60 === void 0 ? void 0 : _stateRef$current60.rpg;
        if (!R) return 'rgba(255,60,60,.15)';
        var mana = R.mana || 0;
        var cost = 30;
        return mana >= cost ? 'rgba(60,200,60,.15)' : 'rgba(255,60,60,.15)';
      }(),
      fn: function fn() {
        return doSpecialAttack();
      }
    }, {
      e: '🪤',
      fn: function fn() {
        var _sk$trapping, _sk$woodcutting;
        var S = stateRef.current;
        var R = S.rpg;
        if (!R || !S.lockedTarget || S.lockedTarget.type !== 'monster') {
          S.dmgNumbers.push({
            x: S.player.x,
            y: S.player.y - 30,
            text: 'Lock a weak monster first!',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        var m = S.lockedTarget.ref;
        if (!m.alive) {
          S.dmgNumbers.push({
            x: S.player.x,
            y: S.player.y - 30,
            text: 'Target is dead!',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        var hpPct = m.curHp / m.hp;
        if (hpPct > TRAP_HP_THRESHOLD) {
          S.dmgNumbers.push({
            x: m.x,
            y: m.y - 25,
            text: 'Too healthy! (<20% HP)',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        var sk = R.lifeSkills;
        if (!sk.pets) sk.pets = [];
        if (sk.pets.length >= MAX_PET_SLOTS) {
          S.dmgNumbers.push({
            x: S.player.x,
            y: S.player.y - 30,
            text: 'Pet slots full! (' + MAX_PET_SLOTS + ')',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        var trapLvl = ((_sk$trapping = sk.trapping) === null || _sk$trapping === void 0 ? void 0 : _sk$trapping.level) || 1;
        var wcLvl = ((_sk$woodcutting = sk.woodcutting) === null || _sk$woodcutting === void 0 ? void 0 : _sk$woodcutting.level) || 1;
        /* Woodcutting provides better trap materials: +0.2% per woodcutting level */
        var wcBonus = wcLvl * 0.002;
        var baseChance = 0.4 + trapLvl * 0.005 + wcBonus;
        var levelPenalty = Math.max(0, (m.level || 1) - R.level) * 0.05;
        var chance = Math.max(0.1, Math.min(0.95, baseChance - levelPenalty));
        if (Math.random() > chance) {
          S.dmgNumbers.push({
            x: m.x,
            y: m.y - 25,
            text: 'Escaped!',
            color: '#ff5e6c',
            ts: Date.now()
          });
          addLifeSkillXp(sk, 'trapping', 5);
          BT_AUDIO.beep(200, 0.08, 0.12, 'square');
          return;
        }
        var pet = createPet(m);
        sk.pets.push(pet);
        if (sk.activePet === null) sk.activePet = sk.pets.length - 1;
        m.alive = false;
        m.respawnAt = Date.now() + 60000;
        var leveled = addLifeSkillXp(sk, 'trapping', 15 + (m.level || 1) * 2);
        S.dmgNumbers.push({
          x: m.x,
          y: m.y - 20,
          text: 'Captured ' + pet.name + '!',
          color: '#3dd497',
          ts: Date.now()
        });
        S.dmgNumbers.push({
          x: m.x,
          y: m.y - 35,
          text: pet.emoji + ' ' + pet.archetype + ' Lv' + (m.level || 1),
          color: pet.color,
          ts: Date.now()
        });
        if (leveled) S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 50,
          text: 'Trapping Lv' + sk.trapping.level + '!',
          color: '#f5c542',
          ts: Date.now()
        });
        S.lockedTarget = null;
        BT_AUDIO.collect();
        setTimeout(function () {
          return BT_AUDIO.beep(523, 0.1, 0.08, 'sine');
        }, 100);
        setTimeout(function () {
          return BT_AUDIO.beep(659, 0.1, 0.08, 'sine');
        }, 200);
        setTimeout(function () {
          return BT_AUDIO.beep(784, 0.15, 0.1, 'sine');
        }, 300);
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, {
      e: '😀',
      fn: function fn() {
        return setShowEmotes(function (s) {
          return !s;
        });
      }
    }, {
      e: '🔑',
      fn: function fn() {
        var p = getBtPassphrase();
        if (p) alert('Passphrase:\n\n' + p);
      }
    }, {
      e: '🚪',
      bg: 'rgba(255,80,80,.15)',
      fn: function () {
        var _fn = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee10() {
          var S, pid, _S$myBroData, _i44, _Object$entries8, _Object$entries8$_i, k, v, _i45, _Object$entries9, _Object$entries9$_i, _k, _v;
          return _regenerator().w(function (_context10) {
            while (1) switch (_context10.n) {
              case 0:
                if (confirm('Log out?')) {
                  _context10.n = 1;
                  break;
                }
                return _context10.a(2);
              case 1:
                S = stateRef.current, pid = getBtPlayerId();
                if (!(pid && S.rpg)) {
                  _context10.n = 9;
                  break;
                }
                _context10.n = 2;
                return btRpc('bt_register_player', {
                  p_id: pid,
                  p_name: S.myName || 'Anon',
                  p_avatar: S.myAvatar,
                  p_color: S.myColor,
                  p_body_torso: S.bodyTorso,
                  p_body_legs: S.bodyLegs,
                  p_bro_id: ((_S$myBroData = S.myBroData) === null || _S$myBroData === void 0 ? void 0 : _S$myBroData.ID) || null,
                  p_bro_data: S.myBroData || null
                });
              case 2:
                syncRpgToServer(S.rpg);
                if (!S.rpg.inventory) {
                  _context10.n = 5;
                  break;
                }
                _i44 = 0, _Object$entries8 = Object.entries(S.rpg.inventory);
              case 3:
                if (!(_i44 < _Object$entries8.length)) {
                  _context10.n = 5;
                  break;
                }
                _Object$entries8$_i = _slicedToArray(_Object$entries8[_i44], 2), k = _Object$entries8$_i[0], v = _Object$entries8$_i[1];
                if (!(v > 0)) {
                  _context10.n = 4;
                  break;
                }
                _context10.n = 4;
                return btRpc('bt_sync_inventory', {
                  p_id: pid,
                  p_item: k,
                  p_qty: v
                });
              case 4:
                _i44++;
                _context10.n = 3;
                break;
              case 5:
                if (!S.rpg.skills) {
                  _context10.n = 8;
                  break;
                }
                _i45 = 0, _Object$entries9 = Object.entries(S.rpg.skills);
              case 6:
                if (!(_i45 < _Object$entries9.length)) {
                  _context10.n = 8;
                  break;
                }
                _Object$entries9$_i = _slicedToArray(_Object$entries9[_i45], 2), _k = _Object$entries9$_i[0], _v = _Object$entries9$_i[1];
                if (!(typeof _v === 'number')) {
                  _context10.n = 7;
                  break;
                }
                _context10.n = 7;
                return btRpc('bt_sync_skill', {
                  p_id: pid,
                  p_skill: _k,
                  p_value: _v
                });
              case 7:
                _i45++;
                _context10.n = 6;
                break;
              case 8:
                if (!S.stats) {
                  _context10.n = 9;
                  break;
                }
                _context10.n = 9;
                return btRpc('bt_update_stats', {
                  p_id: pid,
                  p_steps: S.stats.steps || 0,
                  p_msgs: S.stats.msgsSent || 0,
                  p_emotes: S.stats.emotesUsed || 0
                });
              case 9:
                try {
                  localStorage.removeItem('bt_passphrase');
                  localStorage.removeItem('bt_player');
                  localStorage.removeItem('bt_rpg');
                  localStorage.removeItem('bt_stats');
                } catch (e) {}
                window.location.reload();
              case 10:
                return _context10.a(2);
            }
          }, _callee10);
        }));
        function fn() {
          return _fn.apply(this, arguments);
        }
        return fn;
      }()
    }].map(function (b, i) {
      return /*#__PURE__*/React.createElement("button", {
        key: i,
        onClick: b.fn,
        style: {
          width: 28,
          height: 28,
          borderRadius: 6,
          border: 'none',
          flexShrink: 0,
          background: b.bg || 'rgba(255,255,255,.06)',
          cursor: 'pointer',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          padding: 0
        }
      }, b.e, b.badge > 0 && /*#__PURE__*/React.createElement("span", {
        style: {
          position: 'absolute',
          top: -3,
          right: -3,
          fontSize: 7,
          fontWeight: 900,
          color: '#fff',
          background: '#5b52ff',
          borderRadius: 6,
          padding: '0 3px',
          minWidth: 10,
          textAlign: 'center',
          lineHeight: '12px'
        }
      }, b.badge));
    });
  }()));
}
