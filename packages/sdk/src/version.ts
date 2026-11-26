import pkg from '../package.json' with { type: 'json' };

/** Version of the SDK package. */
export const VERSION: string = pkg.version;
