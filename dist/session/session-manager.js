// SPDX-License-Identifier: Apache-2.0
/**
 * Session Manager - Quản lý conversation sessions
 *
 * Học từ legacy mà KHÔNG copy code:
 * - Session entries với id/parentId cho tree structure
 * - JSONL file format
 * - Branching support
 * - Labels và bookmarks
 */
import { randomUUID } from "node:crypto";
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, readSync, statSync, writeFileSync, } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { getAgentDir } from "../config.js";
// ============================================================================
// Constants
// ============================================================================
export const CURRENT_SESSION_VERSION = 3;
// ============================================================================
// Helper Functions
// ============================================================================
function createSessionId() {
    return randomUUID();
}
function generateId(byId) {
    for (let i = 0; i < 100; i++) {
        const id = randomUUID().slice(0, 8);
        if (!byId.has(id))
            return id;
    }
    return randomUUID();
}
function migrateV1ToV2(entries) {
    const ids = new Set();
    let prevId = null;
    for (const entry of entries) {
        if (entry.type === "session") {
            entry.version = 2;
            continue;
        }
        entry.id = generateId({ has: (id) => ids.has(id) });
        entry.parentId = prevId;
        prevId = entry.id;
        if (entry.type === "compaction") {
            const comp = entry;
            if (typeof comp.firstKeptEntryIndex === "number") {
                const targetEntry = entries[comp.firstKeptEntryIndex];
                if (targetEntry && targetEntry.type !== "session") {
                    comp.firstKeptEntryId = targetEntry.id;
                }
                delete comp.firstKeptEntryIndex;
            }
        }
    }
}
function migrateV2ToV3(entries) {
    for (const entry of entries) {
        if (entry.type === "session") {
            entry.version = 3;
            continue;
        }
        if (entry.type === "message") {
            const msgEntry = entry;
            if (msgEntry.message && msgEntry.message.role === "hookMessage") {
                msgEntry.message.role = "custom";
            }
        }
    }
}
function migrateToCurrentVersion(entries) {
    const header = entries.find((e) => e.type === "session");
    const version = header?.version ?? 1;
    if (version >= CURRENT_SESSION_VERSION)
        return false;
    if (version < 2)
        migrateV1ToV2(entries);
    if (version < 3)
        migrateV2ToV3(entries);
    return true;
}
export function parseSessionEntries(content) {
    const entries = [];
    const lines = content.trim().split("\n");
    for (const line of lines) {
        if (!line.trim())
            continue;
        try {
            const entry = JSON.parse(line);
            entries.push(entry);
        }
        catch {
            // Skip malformed lines
        }
    }
    // Apply migrations if needed
    migrateToCurrentVersion(entries);
    return entries;
}
function loadEntriesFromFile(filePath) {
    if (!existsSync(filePath))
        return [];
    const content = readFileSync(filePath, "utf8");
    return parseSessionEntries(content);
}
function isValidSessionFile(filePath) {
    try {
        const fd = openSync(filePath, "r");
        const buffer = Buffer.alloc(512);
        const bytesRead = readSync(fd, buffer, 0, 512, 0);
        closeSync(fd);
        const firstLine = buffer.toString("utf8", 0, bytesRead).split("\n")[0];
        if (!firstLine)
            return false;
        const header = JSON.parse(firstLine);
        return header.type === "session" && typeof header.id === "string";
    }
    catch {
        return false;
    }
}
export function findMostRecentSession(sessionDir) {
    try {
        const files = readdirSync(sessionDir)
            .filter((f) => f.endsWith(".jsonl"))
            .map((f) => join(sessionDir, f))
            .filter(isValidSessionFile)
            .map((path) => ({ path, mtime: statSync(path).mtime }))
            .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
        return files[0]?.path || null;
    }
    catch {
        return null;
    }
}
export function getDefaultSessionDir(cwd, agentDir) {
    const safePath = `--${cwd.replace(/^[/\\]/, "").replace(/[/\\:]/g, "-")}--`;
    const sessionDir = join(agentDir, "sessions", safePath);
    if (!existsSync(sessionDir)) {
        mkdirSync(sessionDir, { recursive: true });
    }
    return sessionDir;
}
function getLatestCompactionEntry(entries) {
    for (let i = entries.length - 1; i >= 0; i--) {
        if (entries[i].type === "compaction") {
            return entries[i];
        }
    }
    return null;
}
/**
 * Build SessionInfo from a session file.
 * Extracts metadata, name, first message, message count.
 */
export async function buildSessionInfo(filePath) {
    try {
        const content = await readFile(filePath, 'utf8');
        const mtime = await stat(filePath);
        const lines = content.trim().split('\n').filter(l => l.trim());
        const entries = [];
        for (const line of lines) {
            try {
                entries.push(JSON.parse(line));
            }
            catch {
                // skip malformed
            }
        }
        if (entries.length === 0)
            return null;
        const header = entries.find(e => e.type === 'session');
        if (!header)
            return null;
        const info = {
            path: filePath,
            id: header.id,
            cwd: header.cwd,
            parentSessionPath: header.parentSession,
            created: new Date(header.timestamp),
            modified: mtime.mtime,
            messageCount: 0,
            firstMessage: '',
            allMessagesText: '',
        };
        // Look for SessionInfoEntry to get name
        for (const entry of entries) {
            if (entry.type === 'session_info') {
                const si = entry;
                if (si.name) {
                    info.name = si.name;
                    break; // use first name
                }
            }
        }
        // Extract message count and text
        let first = true;
        for (const entry of entries) {
            if (entry.type === 'message') {
                const msgEntry = entry;
                info.messageCount++;
                const msgText = JSON.stringify(msgEntry.message);
                info.allMessagesText += msgText + '\n';
                if (first) {
                    const content = msgEntry.message.content;
                    if (typeof content === 'string') {
                        info.firstMessage = content.substring(0, 200);
                    }
                    else if (Array.isArray(content) && content.length > 0) {
                        // Try to extract text from first content item
                        const firstItem = content[0];
                        if (typeof firstItem === 'string') {
                            info.firstMessage = firstItem.substring(0, 200);
                        }
                        else if (firstItem && typeof firstItem === 'object' && 'text' in firstItem) {
                            info.firstMessage = firstItem.text.substring(0, 200);
                        }
                    }
                    first = false;
                }
            }
        }
        return info;
    }
    catch (err) {
        return null;
    }
}
// ============================================================================
// Session Context Building
// ============================================================================
import { convertSessionMessagesToLlm } from './convert-to-llm.js';
export function buildSessionContext(entries, leafId, byId) {
    if (!byId) {
        byId = new Map();
        for (const entry of entries) {
            byId.set(entry.id, entry);
        }
    }
    let leaf;
    if (leafId === null) {
        return { messages: [], thinkingLevel: "off", model: null };
    }
    if (leafId) {
        leaf = byId.get(leafId);
    }
    if (!leaf) {
        leaf = entries[entries.length - 1];
    }
    if (!leaf) {
        return { messages: [], thinkingLevel: "off", model: null };
    }
    // Walk from leaf to root
    const path = [];
    let current = leaf;
    while (current) {
        path.unshift(current);
        current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    let thinkingLevel = "off";
    let model = null;
    let compaction = null;
    for (const entry of path) {
        if (entry.type === "thinking_level_change") {
            thinkingLevel = entry.thinkingLevel;
        }
        else if (entry.type === "model_change") {
            model = {
                provider: entry.provider,
                modelId: entry.modelId,
            };
        }
        else if (entry.type === "message" && entry.message.role === "assistant") {
            const msg = entry.message;
            model = { provider: msg.provider, modelId: msg.model };
        }
        else if (entry.type === "compaction") {
            compaction = entry;
        }
    }
    const messages = [];
    // Helper to append non-compaction entries to messages
    const appendMessage = (entry) => {
        if (entry.type === "message") {
            messages.push(entry.message);
        }
        else if (entry.type === "custom_message") {
            const cme = entry;
            messages.push({
                role: "custom",
                customType: cme.customType,
                content: cme.content,
                details: cme.details,
                timestamp: cme.timestamp,
            });
        }
        else if (entry.type === "branch_summary") {
            const bse = entry;
            messages.push({
                role: "branchSummary",
                summary: bse.summary,
                fromId: bse.fromId,
                timestamp: bse.timestamp,
            });
        }
        // Note: compaction entries are handled separately
    };
    if (compaction) {
        // Emit compaction summary first
        messages.push({
            role: "compactionSummary",
            summary: compaction.summary,
            tokensBefore: compaction.tokensBefore,
            timestamp: compaction.timestamp,
        });
        // Find compaction index in path
        const compactionIdx = path.findIndex((e) => e.id === compaction.id);
        // Emit kept messages before compaction (starting from firstKeptEntryId)
        let foundFirstKept = false;
        for (let i = 0; i < compactionIdx; i++) {
            const entry = path[i];
            if (entry.id === compaction.firstKeptEntryId) {
                foundFirstKept = true;
            }
            if (foundFirstKept) {
                appendMessage(entry);
            }
        }
        // Emit messages after compaction
        for (let i = compactionIdx + 1; i < path.length; i++) {
            appendMessage(path[i]);
        }
    }
    else {
        // No compaction - emit all messages in path order
        for (const entry of path) {
            appendMessage(entry);
        }
    }
    // Convert session-specific messages to LLM-compatible format
    const convertedMessages = convertSessionMessagesToLlm(messages);
    return { messages: convertedMessages, thinkingLevel, model };
}
// ============================================================================
// SessionManager Class
// ============================================================================
export class SessionManager {
    sessionId = "";
    sessionFile;
    sessionDir;
    cwd;
    persist;
    flushed = false;
    fileEntries = [];
    byId = new Map();
    labelsById = new Map();
    labelTimestampsById = new Map();
    leafId = null;
    constructor(cwd, sessionDir, sessionFile, persist) {
        this.cwd = cwd;
        this.sessionDir = sessionDir;
        this.persist = persist;
        if (persist && sessionDir && !existsSync(sessionDir)) {
            mkdirSync(sessionDir, { recursive: true });
        }
        if (sessionFile) {
            this.setSessionFile(sessionFile);
        }
        else {
            this.newSession();
        }
    }
    setSessionFile(sessionFile) {
        this.sessionFile = resolve(sessionFile);
        if (existsSync(this.sessionFile)) {
            this.fileEntries = loadEntriesFromFile(this.sessionFile);
            if (this.fileEntries.length === 0) {
                const explicitPath = this.sessionFile;
                this.newSession();
                this.sessionFile = explicitPath;
                this._rewriteFile();
                this.flushed = true;
                return;
            }
            const header = this.fileEntries.find((e) => e.type === "session");
            this.sessionId = header?.id ?? createSessionId();
            if (migrateToCurrentVersion(this.fileEntries)) {
                this._rewriteFile();
            }
            this._buildIndex();
            this.flushed = true;
        }
        else {
            const explicitPath = this.sessionFile;
            this.newSession();
            this.sessionFile = explicitPath;
        }
    }
    newSession(options) {
        this.sessionId = options?.id ?? createSessionId();
        const timestamp = new Date().toISOString();
        const header = {
            type: "session",
            version: CURRENT_SESSION_VERSION,
            id: this.sessionId,
            timestamp,
            cwd: this.cwd,
            parentSession: options?.parentSession,
        };
        this.fileEntries = [header];
        this.byId.clear();
        this.labelsById.clear();
        this.leafId = null;
        this.flushed = false;
        if (this.persist) {
            const fileTimestamp = timestamp.replace(/[:.]/g, "-");
            this.sessionFile = join(this.getSessionDir(), `${fileTimestamp}_${this.sessionId}.jsonl`);
        }
        return this.sessionFile;
    }
    _buildIndex() {
        this.byId.clear();
        this.labelsById.clear();
        this.labelTimestampsById.clear();
        this.leafId = null;
        for (const entry of this.fileEntries) {
            if (entry.type === "session")
                continue;
            this.byId.set(entry.id, entry);
            this.leafId = entry.id;
            if (entry.type === "label") {
                const le = entry;
                if (le.label) {
                    this.labelsById.set(le.targetId, le.label);
                    this.labelTimestampsById.set(le.targetId, le.timestamp);
                }
                else {
                    this.labelsById.delete(le.targetId);
                    this.labelTimestampsById.delete(le.targetId);
                }
            }
        }
    }
    _rewriteFile() {
        if (!this.persist || !this.sessionFile)
            return;
        const content = `${this.fileEntries.map((e) => JSON.stringify(e)).join("\n")}\n`;
        writeFileSync(this.sessionFile, content);
    }
    isPersisted() {
        return this.persist;
    }
    getCwd() {
        return this.cwd;
    }
    getSessionDir() {
        return this.sessionDir;
    }
    getSessionId() {
        return this.sessionId;
    }
    getSessionFile() {
        return this.sessionFile;
    }
    getLeafId() {
        return this.leafId;
    }
    getLeafEntry() {
        return this.leafId ? this.byId.get(this.leafId) : undefined;
    }
    getEntry(id) {
        return this.byId.get(id);
    }
    getChildren(parentId) {
        const children = [];
        for (const entry of this.byId.values()) {
            if (entry.parentId === parentId) {
                children.push(entry);
            }
        }
        return children;
    }
    getLabel(id) {
        return this.labelsById.get(id);
    }
    appendMessage(message) {
        const entry = {
            type: "message",
            id: generateId(this.byId),
            parentId: this.leafId,
            timestamp: new Date().toISOString(),
            message,
        };
        this._appendEntry(entry);
        return entry.id;
    }
    /**
     * Append a raw session entry (used for compaction, branch summaries).
     * The entry should already have id, parentId, timestamp set.
     */
    appendEntry(entry) {
        this._appendEntry(entry);
    }
    appendThinkingLevelChange(thinkingLevel) {
        const entry = {
            type: "thinking_level_change",
            id: generateId(this.byId),
            parentId: this.leafId,
            timestamp: new Date().toISOString(),
            thinkingLevel,
        };
        this._appendEntry(entry);
        return entry.id;
    }
    appendModelChange(provider, modelId) {
        const entry = {
            type: "model_change",
            id: generateId(this.byId),
            parentId: this.leafId,
            timestamp: new Date().toISOString(),
            provider,
            modelId,
        };
        this._appendEntry(entry);
        return entry.id;
    }
    appendCompaction(summary, firstKeptEntryId, tokensBefore, details, fromHook) {
        const entry = {
            type: "compaction",
            id: generateId(this.byId),
            parentId: this.leafId,
            timestamp: new Date().toISOString(),
            summary,
            firstKeptEntryId,
            tokensBefore,
            details,
            fromHook,
        };
        this._appendEntry(entry);
        return entry.id;
    }
    appendCustomEntry(customType, data) {
        const entry = {
            type: "custom",
            id: generateId(this.byId),
            parentId: this.leafId,
            timestamp: new Date().toISOString(),
            customType,
            data,
        };
        this._appendEntry(entry);
        return entry.id;
    }
    appendSessionInfo(name) {
        const entry = {
            type: "session_info",
            id: generateId(this.byId),
            parentId: this.leafId,
            timestamp: new Date().toISOString(),
            name: name.trim(),
        };
        this._appendEntry(entry);
        return entry.id;
    }
    getSessionName() {
        const entries = this.getEntries();
        for (let i = entries.length - 1; i >= 0; i--) {
            const entry = entries[i];
            if (entry.type === "session_info") {
                return entry.name?.trim();
            }
        }
        return undefined;
    }
    appendCustomMessageEntry(customType, content, display, details) {
        const entry = {
            type: "custom_message",
            id: generateId(this.byId),
            parentId: this.leafId,
            timestamp: new Date().toISOString(),
            customType,
            content,
            display,
            details,
        };
        this._appendEntry(entry);
        return entry.id;
    }
    appendLabelChange(targetId, label) {
        if (!this.byId.has(targetId)) {
            throw new Error(`Entry ${targetId} not found`);
        }
        const entry = {
            type: "label",
            id: generateId(this.byId),
            parentId: this.leafId,
            timestamp: new Date().toISOString(),
            targetId,
            label,
        };
        this._appendEntry(entry);
        if (label) {
            this.labelsById.set(targetId, label);
            this.labelTimestampsById.set(targetId, entry.timestamp);
        }
        else {
            this.labelsById.delete(targetId);
            this.labelTimestampsById.delete(targetId);
        }
        return entry.id;
    }
    _appendEntry(entry) {
        this.fileEntries.push(entry);
        this.byId.set(entry.id, entry);
        this.leafId = entry.id;
        this._persist(entry);
    }
    _persist(entry) {
        if (!this.persist || !this.sessionFile)
            return;
        const hasAssistant = this.fileEntries.some((e) => e.type === "message" && e.message.role === "assistant");
        if (!hasAssistant) {
            this.flushed = false;
            return;
        }
        if (!this.flushed) {
            for (const e of this.fileEntries) {
                appendFileSync(this.sessionFile, `${JSON.stringify(e)}\n`);
            }
            this.flushed = true;
        }
        else {
            appendFileSync(this.sessionFile, `${JSON.stringify(entry)}\n`);
        }
    }
    getBranch(fromId) {
        const path = [];
        const startId = fromId ?? this.leafId;
        let current = startId ? this.byId.get(startId) : undefined;
        while (current) {
            path.unshift(current);
            current = current.parentId ? this.byId.get(current.parentId) : undefined;
        }
        return path;
    }
    buildSessionContext() {
        return buildSessionContext(this.getEntries(), this.leafId, this.byId);
    }
    /**
     * Find the latest compaction entry in a branch.
     */
    getLatestCompactionEntry(branch) {
        for (let i = branch.length - 1; i >= 0; i--) {
            if (branch[i].type === 'compaction') {
                return branch[i];
            }
        }
        return null;
    }
    exportSession(encrypt = false, password) {
        const sessionData = {
            version: CURRENT_SESSION_VERSION,
            header: this.getHeader(),
            entries: this.getEntries(),
            labels: Object.fromEntries(this.labelsById),
            labelTimestamps: Object.fromEntries(this.labelTimestampsById),
        };
        const json = JSON.stringify(sessionData, null, 2);
        if (encrypt && password) {
            // Simple XOR-based encryption (use webcrypto in production)
            const encrypted = this._encrypt(json, password);
            return JSON.stringify({ v: 1, alg: 'xor', data: encrypted });
        }
        return json;
    }
    /**
     * Import a session from JSON string.
     * Can handle both plain and encrypted (with password) formats.
     * Returns a new SessionManager instance with the imported session.
     */
    static importSession(cwd, sessionDir, json, password) {
        let wrapper;
        try {
            wrapper = JSON.parse(json);
        }
        catch (e) {
            throw new Error('Invalid JSON');
        }
        let sessionData;
        if (wrapper.encrypted || wrapper.v === 1) {
            if (!password) {
                throw new Error('Password required for encrypted session');
            }
            const decrypted = SessionManager._decrypt(wrapper.data, password);
            try {
                sessionData = JSON.parse(decrypted);
            }
            catch (e) {
                throw new Error('Failed to decrypt session: invalid password or corrupted data');
            }
        }
        else {
            sessionData = wrapper;
        }
        const entries = [sessionData.header];
        entries.push(...(sessionData.entries || []));
        // Rebuild indexes
        const byId = new Map();
        const labelsById = new Map();
        const labelTimestampsById = new Map();
        let leafId = null;
        for (const entry of entries) {
            if (entry.type === 'session')
                continue;
            byId.set(entry.id, entry);
            leafId = entry.id;
            if (entry.type === 'label') {
                if (entry.label) {
                    labelsById.set(entry.targetId, entry.label);
                    labelTimestampsById.set(entry.targetId, entry.timestamp);
                }
            }
        }
        const manager = new SessionManager(cwd, sessionDir, undefined, true);
        manager.fileEntries = entries;
        manager.byId = byId;
        manager.labelsById = labelsById;
        manager.labelTimestampsById = labelTimestampsById;
        manager.leafId = leafId;
        // Write to file if persist
        if (manager.persist && manager.sessionFile) {
            const content = entries.map(e => JSON.stringify(e)).join('\n') + '\n';
            writeFileSync(manager.sessionFile, content);
        }
        return manager;
    }
    /**
     * XOR-based encryption (simple). Use WebCrypto in production.
     */
    _encrypt(text, password) {
        const key = SessionManager._hashPassword(password);
        const result = [];
        for (let i = 0; i < text.length; i++) {
            result.push(text.charCodeAt(i) ^ key[i % key.length]);
        }
        return Buffer.from(result).toString('base64');
    }
    static _decrypt(encrypted, password) {
        const key = SessionManager._hashPassword(password);
        const buffer = Buffer.from(encrypted, 'base64');
        let result = '';
        for (let i = 0; i < buffer.length; i++) {
            result += String.fromCharCode(buffer[i] ^ key[i % key.length]);
        }
        return result;
    }
    static _hashPassword(password) {
        const key = [];
        for (let i = 0; i < password.length; i++) {
            key.push(password.charCodeAt(i));
        }
        while (key.length < 32) {
            key.push(...key.slice(0, Math.min(32 - key.length, key.length)));
        }
        return key;
    }
    getHeader() {
        const h = this.fileEntries.find((e) => e.type === "session");
        return h;
    }
    getEntries() {
        return this.fileEntries.filter((e) => e.type !== "session");
    }
    getTree() {
        const entries = this.getEntries();
        const nodeMap = new Map();
        const roots = [];
        for (const entry of entries) {
            const label = this.labelsById.get(entry.id);
            const labelTimestamp = this.labelTimestampsById.get(entry.id);
            nodeMap.set(entry.id, { entry, children: [], label, labelTimestamp });
        }
        for (const entry of entries) {
            const node = nodeMap.get(entry.id);
            if (entry.parentId === null || entry.parentId === entry.id) {
                roots.push(node);
            }
            else {
                const parent = nodeMap.get(entry.parentId);
                if (parent) {
                    parent.children.push(node);
                }
                else {
                    roots.push(node);
                }
            }
        }
        // Sort children by timestamp
        const stack = [...roots];
        while (stack.length > 0) {
            const node = stack.pop();
            node.children.sort((a, b) => new Date(a.entry.timestamp).getTime() - new Date(b.entry.timestamp).getTime());
            stack.push(...node.children);
        }
        return roots;
    }
    branch(branchFromId) {
        if (!this.byId.has(branchFromId)) {
            throw new Error(`Entry ${branchFromId} not found`);
        }
        this.leafId = branchFromId;
    }
    resetLeaf() {
        this.leafId = null;
    }
    branchWithSummary(branchFromId, summary, details, fromHook) {
        if (branchFromId !== null && !this.byId.has(branchFromId)) {
            throw new Error(`Entry ${branchFromId} not found`);
        }
        this.leafId = branchFromId;
        const entry = {
            type: "branch_summary",
            id: generateId(this.byId),
            parentId: branchFromId,
            timestamp: new Date().toISOString(),
            fromId: branchFromId ?? "root",
            summary,
            details,
            fromHook,
        };
        this._appendEntry(entry);
        return entry.id;
    }
    // ============================================================================
    // Search & Filtering
    // ============================================================================
    /**
     * Find entries by label substring
     */
    findByLabel(label) {
        const result = [];
        for (const [entryId, entryLabel] of this.labelsById) {
            if (entryLabel.includes(label)) {
                const entry = this.byId.get(entryId);
                if (entry)
                    result.push(entry);
            }
        }
        return result;
    }
    /**
     * Find entries by type(s)
     */
    findByTypes(types) {
        return this.fileEntries.filter(e => types.includes(e.type));
    }
    /**
     * Search message content case-insensitively
     */
    searchMessages(query) {
        const lowerQ = query.toLowerCase();
        return this.fileEntries.filter(e => {
            if (e.type !== "message")
                return false;
            const msgEntry = e;
            const content = JSON.stringify(msgEntry.message).toLowerCase();
            return content.includes(lowerQ);
        });
    }
    // ============================================================================
    // Static Methods
    // ============================================================================
    static create(cwd, sessionDir) {
        const dir = sessionDir ?? getDefaultSessionDir(cwd, process.env.PI_AGENT_DIR || join(process.env.HOME || "", ".pi", "agent"));
        return new SessionManager(cwd, dir, undefined, true);
    }
    static open(path, sessionDir, cwdOverride) {
        const entries = loadEntriesFromFile(path);
        const header = entries.find((e) => e.type === "session");
        const cwd = cwdOverride ?? header?.cwd ?? process.cwd();
        const dir = sessionDir ?? resolve(path, "..");
        return new SessionManager(cwd, dir, path, true);
    }
    static continueRecent(cwd, sessionDir) {
        const dir = sessionDir ?? getDefaultSessionDir(cwd, process.env.PI_AGENT_DIR || join(process.env.HOME || "", ".pi", "agent"));
        const mostRecent = findMostRecentSession(dir);
        if (mostRecent) {
            return new SessionManager(cwd, dir, mostRecent, true);
        }
        return new SessionManager(cwd, dir, undefined, true);
    }
    static inMemory(cwd = process.cwd()) {
        return new SessionManager(cwd, "", undefined, false);
    }
    /**
     * List sessions in the project's session directory.
     */
    static async list(cwd, sessionDir) {
        const dir = sessionDir ?? getDefaultSessionDir(cwd, getAgentDir());
        if (!existsSync(dir))
            return [];
        const files = readdirSync(dir).filter(f => f.endsWith('.jsonl'));
        const infos = [];
        for (const file of files) {
            const full = join(dir, file);
            const info = await buildSessionInfo(full);
            if (info)
                infos.push(info);
        }
        return infos.sort((a, b) => b.modified.getTime() - a.modified.getTime());
    }
    /**
     * List all sessions across all projects under the agent's sessions directory.
     */
    static async listAll() {
        const sessionsRoot = join(getAgentDir(), "sessions");
        if (!existsSync(sessionsRoot))
            return [];
        const projectDirs = readdirSync(sessionsRoot).filter(d => existsSync(join(sessionsRoot, d)));
        const infos = [];
        for (const proj of projectDirs) {
            const dir = join(sessionsRoot, proj);
            const files = readdirSync(dir).filter(f => f.endsWith('.jsonl'));
            for (const file of files) {
                const full = join(dir, file);
                const info = await buildSessionInfo(full);
                if (info)
                    infos.push(info);
            }
        }
        return infos.sort((a, b) => b.modified.getTime() - a.modified.getTime());
    }
}
//# sourceMappingURL=session-manager.js.map