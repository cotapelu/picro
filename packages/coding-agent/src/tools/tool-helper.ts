/**
 * Tool Helper
 * Helper functions for tool handlers
 */

export function toolResult(result: any): string {
  return JSON.stringify(result, null, 2);
}

export function toolError(message: string): string {
  return JSON.stringify({ error: message, success: false }, null, 2);
}
