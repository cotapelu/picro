// Version check - backend logic
import { VERSION } from '../config.js';

/**
 * Check for new version on npm registry
 */
export async function checkVersion(): Promise<void> {
  try {
    const response = await fetch('https://registry.npmjs.org/@picro/picro/latest', { signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      const data = await response.json();
      const latest = data.version;
      if (latest && latest !== VERSION) {
        console.log(`New version ${latest} available (current: ${VERSION})`);
        // Could also emit toast via callback
      }
    }
  } catch {
    // ignore
  }
}
