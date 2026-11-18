/* v2.3.6353: the info popup's words (src/ui/panels/InfoPanel.jsx; docs/specs/player-words.md, wave W1) */
export const SAY = Object.freeze({
  /* who is on */
  'infoPanel.online': '{count} online',
  /* the combat numbers' three facts, when one is off */
  'infoPanel.lowWarn': '⚠ Combat numbers may read low — {why}.',
  'infoPanel.whyOffline': 'not connected to the server',
  'infoPanel.whyNoRules': 'server has not sent combat rules yet',
  'infoPanel.whyNoSkills': 'character has no trained-skill record',
  'infoPanel.facts': 'link {link} · rules {rules} · skills {skills}',
  'infoPanel.ok': 'ok',
  'infoPanel.off': 'off',
  /* the build */
  'infoPanel.build': 'build {game} ({sha})',
  /* the buttons */
  'infoPanel.unmute': '🔇 Unmute',
  'infoPanel.mute': '🔊 Mute',
  'infoPanel.close': 'Close',
  /* the Hemi Bro check: a wallet's count */
  'infoPanel.broChecking': 'Check your wallet…',
  'infoPanel.broCount': { one: '✓ {n} Hemi Bro · check again', other: '✓ {n} Hemi Bros · check again' },
  'infoPanel.broVerifyMine': 'Verify my Hemi Bros',
  'infoPanel.broHowTo': 'Hemi Bro holder? Open BroTown in your wallet app to verify',
  'infoPanel.broNone': 'This wallet holds no Hemi Bros.',
  /* ...or the worn Bro */
  'infoPanel.broVerified': '✓ Hemi Bro #{id} verified',
  'infoPanel.broVerifyWorn': 'Verify Hemi Bro #{id}',
  'infoPanel.broNoWallet': 'No wallet in this browser',
});
