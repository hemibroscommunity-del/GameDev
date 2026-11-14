// RT-3: what React 18 does with an object where the Feedback panel prints a name.
const React = require('react');
const { renderToString } = require('react-dom/server');
const t = { id: 'x', category: 'bug', playerName: { a: 1 }, text: 'hi' };
const Row = () => React.createElement('span', null, ' · ', t.playerName || 'Bro');
try { console.log('rendered:', renderToString(React.createElement(Row))); }
catch (e) { console.log('THROWS:', e.message.split('\n')[0]); }
