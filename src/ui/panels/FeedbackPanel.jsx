import React from 'react';
import { BT_AUDIO, FEEDBACK_CATEGORIES, FEEDBACK_TOPICS } from '@/data/index.js';
import { BT_API_BASE } from '@/networking/index.js';
import { _asyncToGenerator, _objectSpread, _regenerator, _slicedToArray } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
/* ═══ FeedbackPanel — submit + browse community feedback tickets ═══ */
/* v2.3.858: moved verbatim from BroTown.jsx's JSX tree (UI-panel
   decomposition; behavior-frozen). createElement subtree unchanged,
   including the async fetch of the feedback ticket list. All the
   feedback-* useState values + setters arrive via props; FEEDBACK_*
   data, BT_API_BASE, BT_AUDIO, and the babel async/spread helpers are
   module imports; fetch / URLSearchParams are browser globals. */
/* v2.3.1232: Lantern Slate restyle (docs/LANTERN-SLATE-SPEC.md) —
   presentation only: the ticket fetch/vote/submit flows, filter-key
   cache and every handler are unchanged. Segmented 36px tabs, 32px
   filter pills with brass-fill selection (kills the stray #8880ff
   accent), 44px ticket rows with a proper vote rail, #121B20 input
   well, and a single brass Submit primary. */

/* v2.3.1232: Lantern Slate style tokens — local, no shared module. */
var LS_CARD = {
  background: '#202C32',
  border: '1px solid rgba(238,242,235,.14)',
  borderRadius: 14,
  boxShadow: '0 14px 30px rgba(4,7,9,.38)'
};
var LS_HEADER = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '.12em',
  color: '#96A2A0'
};
var LS_WELL = {
  background: '#121B20',
  borderRadius: 10,
  boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.035)'
};
var LS_DIVIDER = '1px solid rgba(238,242,235,.10)';
/* selectable 32px pill chip (spec: selected = #3B3427 fill + brass label) */
var lsChip = function lsChip(sel) {
  return {
    minHeight: 32,
    boxSizing: 'border-box',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    border: '1px solid ' + (sel ? '#D8A85F' : 'rgba(238,242,235,.08)'),
    background: sel ? '#3B3427' : 'transparent',
    color: sel ? '#D8A85F' : '#96A2A0',
    cursor: 'pointer'
  };
};
/* v2.3.1232: UI-Bible icon with emoji fallback (onError replaceWith
   pattern from src/ui/mobile/dash/SkillsPanel.jsx) */
var lsIcon = function lsIcon(src, emoji, size) {
  return React.createElement('img', {
    src: src,
    alt: '',
    draggable: false,
    style: { width: size || 18, height: size || 18, objectFit: 'contain', flex: 'none' },
    onError: function (e) { e.currentTarget.replaceWith(document.createTextNode(emoji)); }
  });
};

export function FeedbackPanel(props) {
  var stateRef = props.stateRef,
    feedbackTab = props.feedbackTab,
    setFeedbackTab = props.setFeedbackTab,
    feedbackCategory = props.feedbackCategory,
    setFeedbackCategory = props.setFeedbackCategory,
    feedbackTopic = props.feedbackTopic,
    setFeedbackTopic = props.setFeedbackTopic,
    feedbackText = props.feedbackText,
    setFeedbackText = props.setFeedbackText,
    feedbackSort = props.feedbackSort,
    setFeedbackSort = props.setFeedbackSort,
    feedbackTickets = props.feedbackTickets,
    setFeedbackTickets = props.setFeedbackTickets,
    feedbackSubmitCategory = props.feedbackSubmitCategory,
    setFeedbackSubmitCategory = props.setFeedbackSubmitCategory,
    feedbackSubmitTopic = props.feedbackSubmitTopic,
    setFeedbackSubmitTopic = props.setFeedbackSubmitTopic,
    setShowFeedback = props.setShowFeedback;
  return React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setShowFeedback(false);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: Object.assign({}, LS_CARD, {
      width: 'min(360px, calc(100vw - 24px))', /* v2.3.1234: was 340 fixed — fill narrow phones, never overflow */
      maxHeight: '85vh',
      overflowY: 'auto',
      padding: 16,
      textAlign: 'left'
    })
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setShowFeedback(false);
    }
  }, "✕"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
      minHeight: 24
    }
  }, lsIcon('/icons/ui/panel-feedback.webp?v=2.3.1232', '📝', 20), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.10em',
      color: '#F7F2E7'
    }
  }, "Community Feedback")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#96A2A0',
      marginBottom: 10
    }
  }, "Report bugs, suggest features, vote on priorities"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 3,
      marginBottom: 14,
      borderRadius: 10,
      padding: 3,
      background: '#121B20',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44)'
    }
  }, [['browse', 'Browse'], ['submit', 'Submit']].map(function (_ref33) {
    var _ref34 = _slicedToArray(_ref33, 2),
      id = _ref34[0],
      label = _ref34[1];
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: function onClick() {
        return setFeedbackTab(id);
      },
      style: {
        flex: 1,
        height: 36,
        padding: '0 2px',
        fontSize: 12,
        fontWeight: 600,
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        background: feedbackTab === id ? '#2B3940' : 'transparent',
        boxShadow: feedbackTab === id ? 'inset 0 -2px 0 #D8A85F' : 'none',
        color: feedbackTab === id ? '#F7F2E7' : '#96A2A0',
        fontFamily: 'inherit',
        transition: 'all 140ms cubic-bezier(.2,.8,.2,1)'
      }
    }, label);
  })), feedbackTab === 'browse' && function () {
    var S = stateRef.current;
    /* Fetch tickets on filter change */
    var filterKey = feedbackSort + (feedbackTopic || 'all') + (feedbackCategory || 'all');
    if (S._fbLastFilter !== filterKey) {
      S._fbLastFilter = filterKey;
      var params = new URLSearchParams({
        sort: feedbackSort,
        limit: '20',
        offset: '0'
      });
      if (feedbackTopic) params.set('topic', feedbackTopic);
      if (feedbackCategory) params.set('category', feedbackCategory);
      fetch(BT_API_BASE + '/api/feedback/list?' + params).then(function (r) {
        return r.json();
      }).then(function (d) {
        if (d.ok) setFeedbackTickets(d.tickets || []);
      }).catch(function () {});
    }
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 4,
        marginBottom: 8
      }
    }, [['top', '🔥 Top'], ['trending', '📈 Trending'], ['new', '🆕 New']].map(function (_ref35) {
      var _ref36 = _slicedToArray(_ref35, 2),
        id = _ref36[0],
        label = _ref36[1];
      return /*#__PURE__*/React.createElement("button", {
        key: id,
        onClick: function onClick() {
          setFeedbackSort(id);
          S._fbLastFilter = null;
        },
        style: Object.assign({}, lsChip(feedbackSort === id), {
          flex: 1
        })
      }, label);
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4,
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: function onClick() {
        setFeedbackTopic(null);
        S._fbLastFilter = null;
      },
      style: lsChip(feedbackTopic === null)
    }, "All"), FEEDBACK_TOPICS.map(function (t) {
      return /*#__PURE__*/React.createElement("button", {
        key: t.id,
        onClick: function onClick() {
          setFeedbackTopic(feedbackTopic === t.id ? null : t.id);
          S._fbLastFilter = null;
        },
        style: lsChip(feedbackTopic === t.id)
      }, t.label);
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4,
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: function onClick() {
        setFeedbackCategory(null);
        S._fbLastFilter = null;
      },
      style: lsChip(feedbackCategory === null)
    }, "All"), FEEDBACK_CATEGORIES.map(function (c) {
      return /*#__PURE__*/React.createElement("button", {
        key: c.id,
        onClick: function onClick() {
          setFeedbackCategory(feedbackCategory === c.id ? null : c.id);
          S._fbLastFilter = null;
        },
        style: Object.assign({}, lsChip(feedbackCategory === c.id), {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5
        })
      }, /* v2.3.1232: category identity kept as a content-color dot;
           selection itself is the spec brass pill */
      /*#__PURE__*/React.createElement("span", {
        style: {
          width: 7,
          height: 7,
          borderRadius: 4,
          flex: 'none',
          display: 'inline-block',
          background: c.color
        }
      }), c.label);
    })), feedbackTickets.length === 0 && /*#__PURE__*/React.createElement("div", {
      style: Object.assign({}, LS_WELL, {
        fontSize: 12,
        color: '#96A2A0',
        textAlign: 'center',
        padding: '18px 10px',
        lineHeight: 1.4
      })
    }, "No feedback yet. Be the first to submit!"), feedbackTickets.map(function (t, _ti) {
      var cat = FEEDBACK_CATEGORIES.find(function (c) {
        return c.id === t.category;
      });
      var top = FEEDBACK_TOPICS.find(function (tp) {
        return tp.id === t.topic;
      });
      var score = t.up - t.down;
      var age = Date.now() - t.ts;
      var ageStr = age < 60000 ? 'now' : age < 3600000 ? Math.floor(age / 60000) + 'm' : age < 86400000 ? Math.floor(age / 3600000) + 'h' : Math.floor(age / 86400000) + 'd';
      return /*#__PURE__*/React.createElement("div", {
        key: t.id,
        style: {
          display: 'flex',
          gap: 10,
          minHeight: 44,
          padding: '8px 2px',
          borderBottom: _ti < feedbackTickets.length - 1 ? LS_DIVIDER : 'none'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
          minWidth: 30,
          flex: 'none'
        }
      }, /*#__PURE__*/React.createElement("button", {
        onClick: /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5() {
          var res, d, _t4;
          return _regenerator().w(function (_context5) {
            while (1) switch (_context5.p = _context5.n) {
              case 0:
                _context5.p = 0;
                _context5.n = 1;
                return fetch(BT_API_BASE + '/api/feedback/vote', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    ticketId: t.id,
                    playerId: stateRef.current.myId,
                    vote: 'up'
                  })
                });
              case 1:
                res = _context5.v;
                _context5.n = 2;
                return res.json();
              case 2:
                d = _context5.v;
                if (d.ok) setFeedbackTickets(function (prev) {
                  return prev.map(function (x) {
                    return x.id === t.id ? _objectSpread(_objectSpread({}, x), {}, {
                      up: d.up,
                      down: d.down
                    }) : x;
                  });
                });
                _context5.n = 4;
                break;
              case 3:
                _context5.p = 3;
                _t4 = _context5.v;
              case 4:
                return _context5.a(2);
            }
          }, _callee5, null, [[0, 3]]);
        })),
        style: {
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 14,
          lineHeight: 1,
          color: score > 0 ? '#59BF91' : '#96A2A0',
          padding: '2px 6px'
        }
      }, "▲"), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 13,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: score > 0 ? '#59BF91' : score < 0 ? '#D95C54' : '#96A2A0'
        }
      }, score), /*#__PURE__*/React.createElement("button", {
        onClick: /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6() {
          var res, d, _t5;
          return _regenerator().w(function (_context6) {
            while (1) switch (_context6.p = _context6.n) {
              case 0:
                _context6.p = 0;
                _context6.n = 1;
                return fetch(BT_API_BASE + '/api/feedback/vote', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    ticketId: t.id,
                    playerId: stateRef.current.myId,
                    vote: 'down'
                  })
                });
              case 1:
                res = _context6.v;
                _context6.n = 2;
                return res.json();
              case 2:
                d = _context6.v;
                if (d.ok) setFeedbackTickets(function (prev) {
                  return prev.map(function (x) {
                    return x.id === t.id ? _objectSpread(_objectSpread({}, x), {}, {
                      up: d.up,
                      down: d.down
                    }) : x;
                  });
                });
                _context6.n = 4;
                break;
              case 3:
                _context6.p = 3;
                _t5 = _context6.v;
              case 4:
                return _context6.a(2);
            }
          }, _callee6, null, [[0, 3]]);
        })),
        style: {
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 14,
          lineHeight: 1,
          color: score < 0 ? '#D95C54' : '#96A2A0',
          padding: '2px 6px'
        }
      }, "▼")), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          marginBottom: 3
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          padding: '1px 7px',
          borderRadius: 999,
          fontSize: 10,
          fontWeight: 700,
          background: (cat === null || cat === void 0 ? void 0 : cat.color) + '20',
          color: cat === null || cat === void 0 ? void 0 : cat.color,
          border: '1px solid ' + (cat === null || cat === void 0 ? void 0 : cat.color) + '30'
        }
      }, (cat === null || cat === void 0 ? void 0 : cat.label) || t.category), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10,
          fontWeight: 600,
          color: '#96A2A0'
        }
      }, (top === null || top === void 0 ? void 0 : top.label) || t.topic), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10,
          color: '#96A2A0',
          marginLeft: 'auto',
          fontVariantNumeric: 'tabular-nums'
        }
      }, ageStr)), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12.5,
          color: '#B9C1BF',
          lineHeight: 1.4,
          wordBreak: 'break-word'
        }
      }, t.text), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          color: '#96A2A0',
          marginTop: 3,
          fontVariantNumeric: 'tabular-nums'
        }
      }, "by ", t.playerName, " \xB7 👍", t.up, " 👎", t.down)));
    }), /*#__PURE__*/React.createElement("button", {
      onClick: function onClick() {
        stateRef.current._fbLastFilter = null;
        setFeedbackTickets([]);
      },
      style: {
        width: '100%',
        marginTop: 10,
        minHeight: 36,
        padding: '0 12px',
        borderRadius: 11,
        fontSize: 12,
        fontWeight: 700,
        border: '1px solid rgba(238,242,235,.14)',
        background: 'linear-gradient(180deg, #304047 0%, #2B3940 100%)',
        color: '#B9C1BF',
        cursor: 'pointer'
      }
    }, "🔄 Refresh"));
  }(), feedbackTab === 'submit' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: Object.assign({}, LS_HEADER, {
      marginBottom: 6
    })
  }, "Topic"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 4,
      marginBottom: 12
    }
  }, FEEDBACK_TOPICS.map(function (t) {
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: function onClick() {
        return setFeedbackSubmitTopic(t.id);
      },
      style: lsChip(feedbackSubmitTopic === t.id)
    }, t.label);
  })), /*#__PURE__*/React.createElement("div", {
    style: Object.assign({}, LS_HEADER, {
      marginBottom: 6
    })
  }, "Category"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 12
    }
  }, FEEDBACK_CATEGORIES.map(function (c) {
    return /*#__PURE__*/React.createElement("button", {
      key: c.id,
      onClick: function onClick() {
        return setFeedbackSubmitCategory(c.id);
      },
      style: {
        minHeight: 44,
        boxSizing: 'border-box',
        padding: '6px 12px',
        borderRadius: 10,
        fontSize: 12,
        fontWeight: 700,
        textAlign: 'left',
        border: '1px solid ' + (feedbackSubmitCategory === c.id ? '#D8A85F' : 'rgba(238,242,235,.08)'),
        background: feedbackSubmitCategory === c.id ? '#3B3427' : '#19252A',
        color: feedbackSubmitCategory === c.id ? '#D8A85F' : '#B9C1BF',
        cursor: 'pointer'
      }
    }, c.label, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 400,
        color: '#96A2A0',
        marginTop: 2
      }
    }, c.desc));
  })), /*#__PURE__*/React.createElement("div", {
    style: Object.assign({}, LS_HEADER, {
      marginBottom: 6,
      fontVariantNumeric: 'tabular-nums'
    })
  }, "Description (", feedbackText.length, "/100)"), /*#__PURE__*/React.createElement("textarea", {
    value: feedbackText,
    onChange: function onChange(e) {
      return setFeedbackText(e.target.value.slice(0, 100));
    },
    maxLength: 100,
    rows: 3,
    placeholder: "Brief description...",
    style: {
      width: '100%',
      padding: 10,
      borderRadius: 11,
      border: '1px solid rgba(238,242,235,.14)',
      background: '#121B20',
      color: '#F7F2E7',
      caretColor: '#F0C878',
      fontSize: 16 /* v2.3.1233b: iOS zoom guard */,
      fontFamily: 'inherit',
      resize: 'none',
      outline: 'none',
      boxSizing: 'border-box',
      marginBottom: 12
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee7() {
      var S, res, d, _t6;
      return _regenerator().w(function (_context7) {
        while (1) switch (_context7.p = _context7.n) {
          case 0:
            S = stateRef.current;
            if (feedbackText.trim()) {
              _context7.n = 1;
              break;
            }
            pushDmgPopup(S, S.player.x, S.player.y - 30, 'Write something first!', '#D95C54');
            return _context7.a(2);
          case 1:
            _context7.p = 1;
            _context7.n = 2;
            return fetch(BT_API_BASE + '/api/feedback/submit', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                playerId: S.myId,
                playerName: S.myName,
                category: feedbackSubmitCategory,
                topic: feedbackSubmitTopic,
                text: feedbackText.trim()
              })
            });
          case 2:
            res = _context7.v;
            _context7.n = 3;
            return res.json();
          case 3:
            d = _context7.v;
            if (d.ok) {
              _context7.n = 4;
              break;
            }
            pushDmgPopup(S, S.player.x, S.player.y - 30, d.error || 'Failed', '#D95C54');
            return _context7.a(2);
          case 4:
            pushDmgPopup(S, S.player.x, S.player.y - 30, 'Feedback submitted!', '#D8A85F');
            BT_AUDIO.beep(500, 0.06, 0.08, 'sine');
            setFeedbackText('');
            setFeedbackTab('browse');
            S._fbLastFilter = null; /* force refresh */
            _context7.n = 6;
            break;
          case 5:
            _context7.p = 5;
            _t6 = _context7.v;
            pushDmgPopup(S, S.player.x, S.player.y - 30, 'Server error', '#D95C54');
          case 6:
            return _context7.a(2);
        }
      }, _callee7, null, [[1, 5]]);
    })),
    disabled: !feedbackText.trim(),
    style: {
      width: '100%',
      minHeight: 44,
      padding: '0 12px',
      borderRadius: 11,
      fontSize: 13,
      fontWeight: 700,
      border: 'none',
      background: feedbackText.trim() ? '#D8A85F' : '#2B3940',
      color: feedbackText.trim() ? '#20170D' : '#687575',
      cursor: feedbackText.trim() ? 'pointer' : 'not-allowed'
    }
  }, "Submit Feedback"))));
}
