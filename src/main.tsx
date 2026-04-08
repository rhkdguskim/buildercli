import React from 'react';
import { render } from 'ink';
import App from './App.js';

const { waitUntilExit } = render(<App />, {
  patchConsole: false,
});

waitUntilExit().catch(() => {
  process.exit(1);
});
