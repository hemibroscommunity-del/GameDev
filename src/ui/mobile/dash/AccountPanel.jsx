import React from 'react';
import { panelStyle } from './common.js';
import { AccountKeyCard } from '../../account/AccountKeyCard.jsx';
import { AccountLoginForm } from '../../account/AccountLoginForm.jsx';

/* v2.3.1143: Account panel (More -> Account).  Two jobs: show this
   device's Login Key so the player can save it, and accept a key from
   another device to continue that character here.  All the actual
   logic lives in the shared account components + the networking
   helpers (see docs/specs/account-login.md). */
export const AccountPanel = () => (
  <div style={panelStyle}>
    <AccountKeyCard />
    <div style={{ height: 1, background: 'rgba(238, 242, 235, 0.12)', margin: '14px 0' }} />
    <AccountLoginForm />
  </div>
);
