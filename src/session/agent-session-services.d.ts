/**
 * AgentSessionServices - Cwd-bound runtime services
 *
 * Provides all cwd-bound services needed by AgentSession
 */
import { AuthStorage } from "./auth-storage.js";
import { SettingsManager } from "../runtime/settings-manager.js";
import { DefaultModelRegistry } from "./model-registry.js";
import { DefaultResourceLoader } from "../runtime/resource-loader.js";
import { SessionManager } from "../session/session-manager.js";
import { AgentSession } from "../session/agent-session.js";
import type { ToolDefinition } from "../agent/types.js";
import type { Model } from "../llm/index.js";
/**
 * Session start event metadata
 */
export interface SessionStartEvent {
    type: "session_start";
    reason: "startup" | "new" | "resume" | "fork";
    previousSessionFile?: string;
}
/**
 * Non-fatal issues collected while creating services or sessions
 */
export interface AgentSessionRuntimeDiagnostic {
    type: "info" | "warning" | "error";
    message: string;
}
/**
 * Inputs for creating cwd-bound runtime services
 */
export interface CreateAgentSessionServicesOptions {
    cwd: string;
    agentDir?: string;
    authStorage?: AuthStorage;
    settingsManager?: SettingsManager;
    modelRegistry?: DefaultModelRegistry;
    extensionFlagValues?: Map<string, boolean | string>;
    resourceLoader?: DefaultResourceLoader;
    resourceLoaderOptions?: {
        additionalExtensionPaths?: string[];
        additionalSkillPaths?: string[];
        additionalPromptTemplatePaths?: string[];
        additionalThemePaths?: string[];
        noExtensions?: boolean;
        noSkills?: boolean;
        noPromptTemplates?: boolean;
        noThemes?: boolean;
        noContextFiles?: boolean;
        systemPrompt?: string;
        appendSystemPrompt?: string[];
    };
}
/**
 * Inputs for creating an AgentSession from already-created services
 */
export interface CreateAgentSessionFromServicesOptions {
    services: AgentSessionServices;
    sessionManager: SessionManager;
    sessionStartEvent?: SessionStartEvent;
    model?: Model;
    thinkingLevel?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
    scopedModels?: Array<{
        model: Model;
        thinkingLevel?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
    }>;
    tools?: string[];
    noTools?: "all" | "builtin";
    customTools?: ToolDefinition[];
}
/**
 * Coherent cwd-bound runtime services for one effective session cwd
 */
export interface AgentSessionServices {
    cwd: string;
    agentDir: string;
    sessionDir: string;
    authStorage: AuthStorage;
    settingsManager: SettingsManager;
    modelRegistry: DefaultModelRegistry;
    resourceLoader: DefaultResourceLoader;
    diagnostics: AgentSessionRuntimeDiagnostic[];
    extensionRunner?: any;
}
/**
 * Create cwd-bound runtime services
 */
export declare function createAgentSessionServices(options: CreateAgentSessionServicesOptions): Promise<AgentSessionServices>;
/**
 * Create an AgentSession from previously created services
 */
export declare function createAgentSessionFromServices(options: CreateAgentSessionFromServicesOptions): Promise<AgentSession>;
//# sourceMappingURL=agent-session-services.d.ts.map