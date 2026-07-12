import React from 'react';
import { COL, panelStyle } from './common.js';
import { AccountKeyCard } from '../../account/AccountKeyCard.jsx';
import { AccountLoginForm } from '../../account/AccountLoginForm.jsx';

/* v2.3.1143: Account panel (More -> Account).  Two jobs: show this
   device's Login Key so the player can save it, and accept a key from
   another device to continue that character here.  All the actual
   logic lives in the shared account components + the networking
   helpers (see docs/specs/account-login.md). */
/* v2.3.1232: Lantern Slate pass — the two flows read as separate
   modules via spacing + the spec divider token, not cards
   (docs/LANTERN-SLATE-SPEC.md: no full cards around groupable
   content).  The shared account components own their own copy. */
export const AccountPanel = () => (
  <div style={panelStyle}>
    <div style={{ paddingTop: 4 }}>
      <AccountKeyCard />
    </div>
    <div style={{ height: 1, background: COL.divider, margin: '16px 0' }} />
    <AccountLoginForm />
  </div>
);
