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
    style: {
      width: 340,
      maxHeight: '85vh',
      overflowY: 'auto',
      padding: 16,
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setShowFeedback(false);
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 800,
      color: '#D8A85F',
      marginBottom: 2,
      textAlign: 'center'
    }
  }, "\uD83D\uDCDD Community Feedback"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.35)',
      textAlign: 'center',
      marginBottom: 8
    }
  }, "Report bugs, suggest features, vote on priorities"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 2,
      marginBottom: 10,
      borderRadius: 8,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,.1)'
    }
  }, [['browse', '📋 Browse'], ['submit', '✏️ Submit']].map(function (_ref33) {
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
        padding: '6px 2px',
        fontSize: 10,
        fontWeight: 700,
        border: 'none',
        cursor: 'pointer',
        background: feedbackTab === id ? 'rgba(216,168,95,.2)' : 'rgba(255,255,255,.03)',
        color: feedbackTab === id ? '#8880ff' : 'rgba(255,255,255,.4)',
        fontFamily: 'inherit'
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
        gap: 2,
        marginBottom: 6
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
        style: {
          flex: 1,
          padding: '4px 2px',
          borderRadius: 4,
          fontSize: 8,
          fontWeight: 700,
          border: '1px solid ' + (feedbackSort === id ? 'rgba(216,168,95,.3)' : 'rgba(255,255,255,.06)'),
          background: feedbackSort === id ? 'rgba(216,168,95,.1)' : 'transparent',
          color: feedbackSort === id ? '#8880ff' : 'rgba(255,255,255,.3)',
          cursor: 'pointer'
        }
      }, label);
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: function onClick() {
        setFeedbackTopic(null);
        S._fbLastFilter = null;
      },
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        border: '1px solid ' + (feedbackTopic === null ? 'rgba(216,168,95,.3)' : 'rgba(255,255,255,.06)'),
        background: feedbackTopic === null ? 'rgba(216,168,95,.08)' : 'transparent',
        color: feedbackTopic === null ? '#8880ff' : 'rgba(255,255,255,.2)',
        cursor: 'pointer'
      }
    }, "All"), FEEDBACK_TOPICS.map(function (t) {
      return /*#__PURE__*/React.createElement("button", {
        key: t.id,
        onClick: function onClick() {
          setFeedbackTopic(feedbackTopic === t.id ? null : t.id);
          S._fbLastFilter = null;
        },
        style: {
          padding: '2px 5px',
          borderRadius: 3,
          fontSize: 7,
          fontWeight: 600,
          border: '1px solid ' + (feedbackTopic === t.id ? 'rgba(216,168,95,.3)' : 'rgba(255,255,255,.04)'),
          background: feedbackTopic === t.id ? 'rgba(216,168,95,.08)' : 'transparent',
          color: feedbackTopic === t.id ? '#8880ff' : 'rgba(255,255,255,.18)',
          cursor: 'pointer'
        }
      }, t.label);
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 2,
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: function onClick() {
        setFeedbackCategory(null);
        S._fbLastFilter = null;
      },
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        border: '1px solid ' + (feedbackCategory === null ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.06)'),
        background: feedbackCategory === null ? 'rgba(255,255,255,.05)' : 'transparent',
        color: feedbackCategory === null ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.18)',
        cursor: 'pointer'
      }
    }, "All"), FEEDBACK_CATEGORIES.map(function (c) {
      return /*#__PURE__*/React.createElement("button", {
        key: c.id,
        onClick: function onClick() {
          setFeedbackCategory(feedbackCategory === c.id ? null : c.id);
          S._fbLastFilter = null;
        },
        style: {
          padding: '2px 5px',
          borderRadius: 3,
          fontSize: 7,
          fontWeight: 700,
          border: '1px solid ' + (feedbackCategory === c.id ? c.color + '50' : 'rgba(255,255,255,.04)'),
          background: feedbackCategory === c.id ? c.color + '15' : 'transparent',
          color: feedbackCategory === c.id ? c.color : 'rgba(255,255,255,.18)',
          cursor: 'pointer'
        }
      }, c.label);
    })), feedbackTickets.length === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: 'rgba(255,255,255,.15)',
        fontStyle: 'italic',
        textAlign: 'center',
        padding: 12
      }
    }, "No feedback yet. Be the first to submit!"), feedbackTickets.map(function (t) {
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
          gap: 6,
          padding: '6px 8px',
          borderRadius: 6,
          marginBottom: 3,
          background: 'rgba(255,255,255,.02)',
          border: '1px solid rgba(255,255,255,.05)'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
          minWidth: 28
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
          fontSize: 12,
          lineHeight: 1,
          color: score > 0 ? '#59BF91' : 'rgba(255,255,255,.2)',
          padding: 0
        }
      }, "\u25B2"), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10,
          fontWeight: 900,
          color: score > 0 ? '#59BF91' : score < 0 ? '#D95C54' : 'rgba(255,255,255,.3)'
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
          fontSize: 12,
          lineHeight: 1,
          color: score < 0 ? '#D95C54' : 'rgba(255,255,255,.2)',
          padding: 0
        }
      }, "\u25BC")), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          marginBottom: 2
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          padding: '1px 4px',
          borderRadius: 2,
          fontSize: 6,
          fontWeight: 800,
          background: (cat === null || cat === void 0 ? void 0 : cat.color) + '20',
          color: cat === null || cat === void 0 ? void 0 : cat.color,
          border: '1px solid ' + (cat === null || cat === void 0 ? void 0 : cat.color) + '30'
        }
      }, (cat === null || cat === void 0 ? void 0 : cat.label) || t.category), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 6,
          color: 'rgba(255,255,255,.2)'
        }
      }, (top === null || top === void 0 ? void 0 : top.label) || t.topic), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 6,
          color: 'rgba(255,255,255,.12)',
          marginLeft: 'auto'
        }
      }, ageStr)), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9,
          color: 'rgba(255,255,255,.7)',
          lineHeight: 1.3,
          wordBreak: 'break-word'
        }
      }, t.text), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 6,
          color: 'rgba(255,255,255,.15)',
          marginTop: 2
        }
      }, "by ", t.playerName, " \xB7 \uD83D\uDC4D", t.up, " \uD83D\uDC4E", t.down)));
    }), /*#__PURE__*/React.createElement("button", {
      onClick: function onClick() {
        stateRef.current._fbLastFilter = null;
        setFeedbackTickets([]);
      },
      style: {
        width: '100%',
        marginTop: 4,
        padding: '4px 0',
        borderRadius: 4,
        fontSize: 8,
        fontWeight: 700,
        border: '1px solid rgba(255,255,255,.08)',
        background: 'rgba(255,255,255,.03)',
        color: 'rgba(255,255,255,.3)',
        cursor: 'pointer'
      }
    }, "\uD83D\uDD04 Refresh"));
  }(), feedbackTab === 'submit' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#D8A94D',
      marginBottom: 3
    }
  }, "Topic"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginBottom: 8
    }
  }, FEEDBACK_TOPICS.map(function (t) {
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: function onClick() {
        return setFeedbackSubmitTopic(t.id);
      },
      style: {
        padding: '3px 6px',
        borderRadius: 4,
        fontSize: 7,
        fontWeight: 700,
        border: '1.5px solid ' + (feedbackSubmitTopic === t.id ? 'rgba(216,168,95,.4)' : 'rgba(255,255,255,.06)'),
        background: feedbackSubmitTopic === t.id ? 'rgba(216,168,95,.12)' : 'rgba(255,255,255,.02)',
        color: feedbackSubmitTopic === t.id ? '#8880ff' : 'rgba(255,255,255,.3)',
        cursor: 'pointer'
      }
    }, t.label);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#D8A94D',
      marginBottom: 3
    }
  }, "Category"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 3,
      marginBottom: 8
    }
  }, FEEDBACK_CATEGORIES.map(function (c) {
    return /*#__PURE__*/React.createElement("button", {
      key: c.id,
      onClick: function onClick() {
        return setFeedbackSubmitCategory(c.id);
      },
      style: {
        padding: '4px 8px',
        borderRadius: 5,
        fontSize: 8,
        fontWeight: 700,
        border: '1.5px solid ' + (feedbackSubmitCategory === c.id ? c.color + '60' : 'rgba(255,255,255,.08)'),
        background: feedbackSubmitCategory === c.id ? c.color + '18' : 'rgba(255,255,255,.02)',
        color: feedbackSubmitCategory === c.id ? c.color : 'rgba(255,255,255,.3)',
        cursor: 'pointer'
      }
    }, c.label, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 6,
        fontWeight: 400,
        color: 'rgba(255,255,255,.2)',
        marginTop: 1
      }
    }, c.desc));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#D8A94D',
      marginBottom: 3
    }
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
      padding: '8px',
      borderRadius: 6,
      border: '1px solid rgba(255,255,255,.15)',
      background: 'rgba(255,255,255,.05)',
      color: '#fff',
      fontSize: 11,
      fontFamily: 'inherit',
      resize: 'none',
      outline: 'none',
      boxSizing: 'border-box',
      marginBottom: 8
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
      padding: '10px 0',
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 800,
      border: '1.5px solid ' + (feedbackText.trim() ? 'rgba(216,168,95,.4)' : 'rgba(255,255,255,.06)'),
      background: feedbackText.trim() ? 'rgba(216,168,95,.15)' : 'rgba(255,255,255,.02)',
      color: feedbackText.trim() ? '#8880ff' : 'rgba(255,255,255,.15)',
      cursor: feedbackText.trim() ? 'pointer' : 'not-allowed'
    }
  }, "\uD83D\uDCDD Submit Feedback"))));
}
