// SPDX-License-Identifier: Apache-2.0
/**
 * Diagnostics - Resource collision interface
 * 
 * Học từ legacy mà KHÔNG copy code:
 * - Resource collision interface
 */

export interface ResourceCollision {
  resourceType: "extension" | "skill" | "prompt" | "theme";
  name: string;
  winnerPath: string;
  loserPath: string;
  winnerSource?: string;
  loserSource?: string;
}

export interface ResourceDiagnostic {
  type: "warning" | "error" | "collision";
  message: string;
  path?: string;
  collision?: ResourceCollision;
}