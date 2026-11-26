// Import from cypress/support/e2e.(js|ts): `import '@a11y-checker/cypress/support';`
import { registerA11yCommands } from './command.js';

registerA11yCommands();

export type { CheckA11yOptions } from './command.js';
