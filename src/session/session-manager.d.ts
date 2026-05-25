/**
 * Session Manager - Quản lý conversation sessions
 *
 * Học từ legacy mà KHÔNG copy code:
 * - Session entries với id/parentId cho tree structure
 * - JSONL file format
 * - Branching support
 * - Labels và bookmarks
 */
export declare const CURRENT_SESSION_VERSION = 3;
export interface SessionHeader {
    type: "session";
    version?: number;
    id: string;
    timestamp: string;
    cwd: string;
    parentSession?: string;
}
export interface SessionEntryBase {
    type: string;
    id: string;
    parentId: string | null;
    timestamp: string;
}
export interface SessionMessageEntry extends SessionEntryBase {
    type: "message";
    message: any;
}
export interface ThinkingLevelChangeEntry extends SessionEntryBase {
    type: "thinking_level_change";
    thinkingLevel: string;
}
export interface ModelChangeEntry extends SessionEntryBase {
    type: "model_change";
    provider: string;
    modelId: string;
}
export interface CompactionEntry<T = unknown> extends SessionEntryBase {
    type: "compaction";
    summary: string;
    firstKeptEntryId: string;
    tokensBefore: number;
    details?: T;
    fromHook?: boolean;
}
export interface BranchSummaryEntry<T = unknown> extends SessionEntryBase {
    type: "branch_summary";
    fromId: string;
    summary: string;
    details?: T;
    fromHook?: boolean;
}
export interface CustomEntry<T = unknown> extends SessionEntryBase {
    type: "custom";
    customType: string;
    data?: T;
}
export interface CustomMessageEntry<T = unknown> extends SessionEntryBase {
    type: "custom_message";
    customType: string;
    content: string | any[];
    details?: T;
    display: boolean;
}
export interface LabelEntry extends SessionEntryBase {
    type: "label";
    targetId: string;
    label: string | undefined;
}
export interface SessionInfoEntry extends SessionEntryBase {
    type: "session_info";
    name?: string;
}
export type SessionEntry = SessionMessageEntry | ThinkingLevelChangeEntry | ModelChangeEntry | CompactionEntry | BranchSummaryEntry | CustomEntry | CustomMessageEntry | LabelEntry | SessionInfoEntry;
export type FileEntry = SessionHeader | SessionEntry;
export interface SessionTreeNode {
    entry: SessionEntry;
    children: SessionTreeNode[];
    label?: string;
    labelTimestamp?: string;
}
export interface SessionContext {
    messages: any[];
    thinkingLevel: string;
    model: {
        provider: string;
        modelId: string;
    } | null;
}
export interface SessionInfo {
    path: string;
    id: string;
    cwd: string;
    name?: string;
    parentSessionPath?: string;
    created: Date;
    modified: Date;
    messageCount: number;
    firstMessage: string;
    allMessagesText: string;
}
export declare function parseSessionEntries(content: string): FileEntry[];
export declare function findMostRecentSession(sessionDir: string): string | null;
export declare function getDefaultSessionDir(cwd: string, agentDir: string): string;
/**
 * Build SessionInfo from a session file.
 * Extracts metadata, name, first message, message count.
 */
export declare function buildSessionInfo(filePath: string): Promise<SessionInfo | null>;
export declare function buildSessionContext(entries: SessionEntry[], leafId?: string | null, byId?: Map<string, SessionEntry>): SessionContext;
export declare class SessionManager {
    private sessionId;
    private sessionFile;
    private sessionDir;
    private cwd;
    private persist;
    private flushed;
    private fileEntries;
    private byId;
    private labelsById;
    private labelTimestampsById;
    private leafId;
    private constructor();
    setSessionFile(sessionFile: string): void;
    newSession(options?: {
        id?: string;
        parentSession?: string;
    }): string | undefined;
    private _buildIndex;
    private _rewriteFile;
    isPersisted(): boolean;
    getCwd(): string;
    getSessionDir(): string;
    getSessionId(): string;
    getSessionFile(): string | undefined;
    getLeafId(): string | null;
    getLeafEntry(): SessionEntry | undefined;
    getEntry(id: string): SessionEntry | undefined;
    getChildren(parentId: string): SessionEntry[];
    getLabel(id: string): string | undefined;
    appendMessage(message: any): string;
    /**
     * Append a raw session entry (used for compaction, branch summaries).
     * The entry should already have id, parentId, timestamp set.
     */
    appendEntry(entry: SessionEntry): void;
    appendThinkingLevelChange(thinkingLevel: string): string;
    appendModelChange(provider: string, modelId: string): string;
    appendCompaction<T>(summary: string, firstKeptEntryId: string, tokensBefore: number, details?: T, fromHook?: boolean): string;
    appendCustomEntry(customType: string, data?: unknown): string;
    appendSessionInfo(name: string): string;
    getSessionName(): string | undefined;
    appendCustomMessageEntry<T>(customType: string, content: string | any[], display: boolean, details?: T): string;
    appendLabelChange(targetId: string, label: string | undefined): string;
    private _appendEntry;
    private _persist;
    getBranch(fromId?: string): SessionEntry[];
    buildSessionContext(): SessionContext;
    /**
     * Find the latest compaction entry in a branch.
     */
    getLatestCompactionEntry(branch: SessionEntry[]): CompactionEntry | null;
    /**
     * Export the entire session (all entries) as a JSON string.
     * This includes the header, all entries, and labels.
     * The data is NOT encrypted by default; use encrypt parameter for encryption.
     */
    exportSession(encrypt: false): string;
    exportSession(encrypt: true, password: string): string;
    /**
     * Import a session from JSON string.
     * Can handle both plain and encrypted (with password) formats.
     * Returns a new SessionManager instance with the imported session.
     */
    static importSession(cwd: string, sessionDir: string, json: string, password?: string): SessionManager;
    /**
     * XOR-based encryption (simple). Use WebCrypto in production.
     */
    private _encrypt;
    private static _decrypt;
    private static _hashPassword;
    getHeader(): SessionHeader | null;
    getEntries(): SessionEntry[];
    getTree(): SessionTreeNode[];
    branch(branchFromId: string): void;
    resetLeaf(): void;
    branchWithSummary(branchFromId: string | null, summary: string, details?: unknown, fromHook?: boolean): string;
    /**
     * Find entries by label substring
     */
    findByLabel(label: string): SessionEntry[];
    /**
     * Find entries by type(s)
     */
    findByTypes(types: string[]): SessionEntry[];
    /**
     * Search message content case-insensitively
     */
    searchMessages(query: string): SessionMessageEntry[];
    static create(cwd: string, sessionDir?: string): SessionManager;
    static open(path: string, sessionDir?: string, cwdOverride?: string): SessionManager;
    static continueRecent(cwd: string, sessionDir?: string): SessionManager;
    static inMemory(cwd?: string): SessionManager;
    /**
     * List sessions in the project's session directory.
     */
    static list(cwd: string, sessionDir?: string): Promise<SessionInfo[]>;
    /**
     * List all sessions across all projects under the agent's sessions directory.
     */
    static listAll(): Promise<SessionInfo[]>;
}
//# sourceMappingURL=session-manager.d.ts.map