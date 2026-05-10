// SPDX-License-Identifier: Apache-2.0
/**
 * @picro/session - Session Persistence Layer
 */

export { SessionManager } from './session-manager';
export type { SessionEntry, BranchSummaryEntry, CompactionEntry } from './session-manager';

export { AgentSession } from './agent-session';
export type { AgentSessionConfig, AgentSessionEventListener, AgentSessionEvent } from './agent-session-types';
export {
  createAgentSessionServices,
  createAgentSessionFromServices,
  type AgentSessionServices,
} from './agent-session-services';

export * from '../compaction';
export * from '../compaction/branch-summarization';
