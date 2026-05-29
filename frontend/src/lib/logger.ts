/**
 * DEV-only console wrapper.
 *
 * Vite injects `import.meta.env.DEV` as a literal `true` / `false` at build
 * time → calls collapse to dead code in production bundles.
 *
 * Replace ad-hoc `console.log` calls with `logger.debug` so the production
 * bundle doesn't leak request/response payloads or noisy traces.
 */
const isDev = import.meta.env.DEV;

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};
