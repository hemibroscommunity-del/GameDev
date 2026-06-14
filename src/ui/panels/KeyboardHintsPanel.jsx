import React from 'react';

/* === KeyboardHintsPanel — the desktop keyboard-hints overlay === */
/* v2.3.889: extracted verbatim from the bt-kb-hints JSX subtree in
   BroTown.jsx (the desktop-only WASD / hotkey help strip). Behavior-
   frozen UI decomposition; the desktop-detection gate (the
   window.matchMedia check) stays in BroTown. Zero props — the subtree
   is fully static markup. */
export function KeyboardHintsPanel() {
  return React.createElement("div", {
    className: "bt-kb-hints"
  }, /*#__PURE__*/React.createElement("span", {
    className: "bt-kb-key"
  }, /*#__PURE__*/React.createElement("kbd", null, "WASD"), " Move"), /*#__PURE__*/React.createElement("span", {
    className: "bt-kb-key"
  }, /*#__PURE__*/React.createElement("kbd", null, "Click"), " Attack"), /*#__PURE__*/React.createElement("span", {
    className: "bt-kb-key"
  }, /*#__PURE__*/React.createElement("kbd", null, "R-Click"), " Special"), /*#__PURE__*/React.createElement("span", {
    className: "bt-kb-key"
  }, /*#__PURE__*/React.createElement("kbd", null, "Space"), " Dodge"), /*#__PURE__*/React.createElement("span", {
    className: "bt-kb-key"
  }, /*#__PURE__*/React.createElement("kbd", null, "E"), " Interact"), /*#__PURE__*/React.createElement("span", {
    className: "bt-kb-key"
  }, /*#__PURE__*/React.createElement("kbd", null, "Q"), " Shield"), /*#__PURE__*/React.createElement("span", {
    className: "bt-kb-key"
  }, /*#__PURE__*/React.createElement("kbd", null, "Tab"), " Swap"), /*#__PURE__*/React.createElement("span", {
    className: "bt-kb-key"
  }, /*#__PURE__*/React.createElement("kbd", null, "F"), " Special"), /*#__PURE__*/React.createElement("span", {
    className: "bt-kb-key"
  }, /*#__PURE__*/React.createElement("kbd", null, "C"), " Chat"), /*#__PURE__*/React.createElement("span", {
    className: "bt-kb-key"
  }, /*#__PURE__*/React.createElement("kbd", null, "Esc"), " Close"));
}
