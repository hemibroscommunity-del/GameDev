import React, { useState } from 'react';
import { COL, panelStyle } from './common.js';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { reportOn, setReportOn } from '../../../debug/report.js';   /* v2.3.5122: the smoothness report's switch */
import { SAY } from '@/data/say/aboutPanel.js';   /* v2.3.6344: its words, in the one table (docs/specs/player-words.md, W1) */
import { say, sayPieces } from '@/game/say.js';

/* ═══ v2.3.2820: ABOUT, PRIVACY, RULES, CREDITS ═══
 * The 2026-09-24 demo audit: a public demo with no privacy notice, no rules
 * and no credits anywhere a player could see them -- CREDITS.md lived only
 * in the repository, and the game keeps a per-device id for anti-cheat
 * (networking/index.js DEVICE NONCE), which is exactly the thing a privacy
 * notice exists to say out loud.
 *
 * WHAT THIS PAGE CLAIMS IS WHAT THE CODE DOES -- keep it that way.  Each
 * "we store" line maps to a real store: the character record and progress
 * (GameRoom DO storage: auth:, char:, rpg:), the device nonce (join ->
 * botfp.js), crash reports (/api/feedback/crash, crashTrap.js), feedback
 * tickets (Feedback DO), reported chat lines (chatmod.js), and a linked
 * wallet address (broverify.js bro_link:).  Add a row here in the same PR
 * as any new thing the game keeps about a player.
 *
 * It is a plain-language starting draft written from the code, not legal
 * advice; the owner signs off on the wording (and the age line) before it
 * is relied on.
 *
 * v2.3.3581: the Credits name the Hemi Bros collection as the source of the
 * townsfolk's portraits (v2.3.3580's tools/qa/nft_portraits.py), as
 * CREDITS.md does -- the owner: "Yes you can credit Hemi bros as source of
 * portrait art. No terms." */

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ fontSize: 13, fontWeight: 800, color: COL.accent, margin: '0 0 6px' }}>{title}</div>
    <div style={{ fontSize: 13, color: COL.text2, lineHeight: 1.5 }}>{children}</div>
  </div>
);
const Li = ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>;
const ul = { margin: 0, paddingLeft: 18 };

/* v2.3.5122: THE SMOOTHNESS REPORT (debug/report.js; the grand plan's step
   1.1).  On for every player (the owner's call 1), with this switch, kept on
   this device.  What it holds is what debug/report.js sends; it is added into
   the day's totals by device type with no name, id or address
   (server/src/report.js), and the day's book is kept 60 days
   (server/src/daybook.js). */
const SmoothRow = () => {
  const [on, setOn] = useState(() => reportOn());
  return (
    <Li>{sayPieces(SAY, 'aboutPanel.smooth', { what: <b key="what" style={{ color: COL.text }}>{say(SAY, 'aboutPanel.smoothWhat')}</b> })}{' '}
      <button type="button" data-report-switch={on ? 'on' : 'off'}
        onClick={() => { setReportOn(!on); setOn(!on); }}
        style={{ minHeight: 32, padding: '0 10px', margin: '4px 0 0', fontSize: 12, fontWeight: 700, borderRadius: 8,
          border: '1px solid ' + COL.accent, background: 'transparent', color: COL.accent, touchAction: 'manipulation', cursor: 'pointer' }}>
        {say(SAY, on ? 'aboutPanel.smoothOn' : 'aboutPanel.smoothOff')}
      </button>
    </Li>
  );
};

export const AboutPanel = () => (
  <div style={panelStyle} data-about="">
    <Section title={say(SAY, 'aboutPanel.gameTitle')}>
      {say(SAY, 'aboutPanel.gameBody')}
    </Section>

    <Section title={say(SAY, 'aboutPanel.keepTitle')}>
      <ul style={ul}>
        <Li>{sayPieces(SAY, 'aboutPanel.keepCharacter', { what: <b key="what" style={{ color: COL.text }}>{say(SAY, 'aboutPanel.keepCharacterWhat')}</b> })}</Li>
        <Li>{sayPieces(SAY, 'aboutPanel.keepKey', { what: <b key="what" style={{ color: COL.text }}>{say(SAY, 'aboutPanel.keepKeyWhat')}</b> })}</Li>
        <Li>{sayPieces(SAY, 'aboutPanel.keepDevice', { what: <b key="what" style={{ color: COL.text }}>{say(SAY, 'aboutPanel.keepDeviceWhat')}</b> })}</Li>
        <Li>{sayPieces(SAY, 'aboutPanel.keepCrash', { what: <b key="what" style={{ color: COL.text }}>{say(SAY, 'aboutPanel.keepCrashWhat')}</b> })}</Li>
        <Li>{sayPieces(SAY, 'aboutPanel.keepFeedback', { what: <b key="what" style={{ color: COL.text }}>{say(SAY, 'aboutPanel.keepFeedbackWhat')}</b> })}</Li>
        <Li>{sayPieces(SAY, 'aboutPanel.keepChat', { what: <b key="what" style={{ color: COL.text }}>{say(SAY, 'aboutPanel.keepChatWhat')}</b> })}</Li>
        <Li>{sayPieces(SAY, 'aboutPanel.keepWallet', { what: <b key="what" style={{ color: COL.text }}>{say(SAY, 'aboutPanel.keepWalletWhat')}</b> })}</Li>
        <SmoothRow />
      </ul>
      <div style={{ marginTop: 6 }}>
        {say(SAY, 'aboutPanel.keepNot')}
      </div>
    </Section>

    <Section title={say(SAY, 'aboutPanel.rulesTitle')}>
      <ul style={ul}>
        <Li>{say(SAY, 'aboutPanel.ruleDecent')}</Li>
        <Li>{say(SAY, 'aboutPanel.ruleCheat')}</Li>
        <Li>{say(SAY, 'aboutPanel.ruleKey')}</Li>
        <Li>{say(SAY, 'aboutPanel.ruleAge')}</Li>
        <Li>{say(SAY, 'aboutPanel.ruleAsIs')}</Li>
      </ul>
    </Section>

    <Section title={say(SAY, 'aboutPanel.creditsTitle')}>
      {say(SAY, 'aboutPanel.credits')}
    </Section>

    <button onClick={() => dashboardPanelBus.push('feedback')} className="button-primary"
      style={{ minHeight: 44, padding: '0 18px', fontSize: 13, touchAction: 'manipulation', width: '100%' }}>
      {say(SAY, 'aboutPanel.feedback')}
    </button>
  </div>
);
