"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runInkApp = exports.InkApp = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/** @jsxImportSource react */
const react_1 = __importStar(require("react"));
const ink_1 = require("ink");
const useTheme_1 = require("./hooks/useTheme");
const useRuntime_1 = require("./hooks/useRuntime");
const Header_1 = require("./components/Header/Header");
const MessageList_1 = require("./components/MessageList/MessageList");
const InputBox_1 = require("./components/InputBox/InputBox");
const Footer_1 = require("./components/Footer/Footer");
const ErrorBoundary_1 = require("./ErrorBoundary");
const CommandPalette_1 = require("./modals/CommandPalette");
const ThinkingModal_1 = require("./modals/ThinkingModal");
const LoginModal_1 = require("./modals/LoginModal");
const HelpModal_1 = require("./modals/HelpModal");
const SessionSelectorModal_1 = require("./modals/SessionSelectorModal");
const ConfirmationModal_1 = require("./modals/ConfirmationModal");
const SettingsSelectorModal_1 = require("./modals/SettingsSelectorModal");
const ModelSelectorModal_1 = require("./modals/ModelSelectorModal");
const SessionInfoModal_1 = require("./modals/SessionInfoModal");
const ChangelogModal_1 = require("./modals/ChangelogModal");
const HotkeysModal_1 = require("./modals/HotkeysModal");
const TreeSelectorModal_1 = require("./modals/TreeSelectorModal");
const BashOutputModal_1 = require("./modals/BashOutputModal");
const InputModal_1 = require("./modals/InputModal");
const SelectModal_1 = require("./modals/SelectModal");
const Modal_1 = require("./modals/Modal");
const slash_commands_1 = require("../../runtime/slash-commands");
const config_1 = require("../../config");
const InkAppInner = ({ runtime }) => {
    const { messages, status: runtimeStatus, thinkingLevel, sendMessage, isCompacting, retryAttempt, steeringMessages, followUpMessages, toolOutputExpanded, setToolOutputExpanded, hideThinkingBlock, setHideThinkingBlock, hiddenThinkingLabel, setHiddenThinkingLabel, currentModel } = (0, useRuntime_1.useRuntime)(runtime);
    const [retryCountdown, setRetryCountdown] = react_1.default.useState(0);
    // Retry countdown timer
    react_1.default.useEffect(() => {
        if (retryAttempt > 0) {
            setRetryCountdown(3); // Assuming 3-second delay; could be configurable
            const timer = setInterval(() => {
                setRetryCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [retryAttempt]);
    // Compute status display
    let displayStatus = runtimeStatus || 'Ready';
    if (isCompacting) {
        displayStatus = 'Compacting... (Esc to cancel)';
    }
    else if (retryAttempt > 0) {
        const maxAttempts = 3; // should get from runtime? For now hardcoded
        displayStatus = `Retrying (${retryAttempt}/${maxAttempts}) in ${retryCountdown}s... (Esc to cancel)`;
    }
    const { toggleTheme, isDark, theme } = (0, useTheme_1.useTheme)();
    const [inputValue, setInputValue] = react_1.default.useState('');
    const [isSubmitting, setIsSubmitting] = react_1.default.useState(false);
    const [activeModal, setActiveModal] = react_1.default.useState(null);
    const [showDebug, setShowDebug] = react_1.default.useState(false);
    const messageListRef = react_1.default.useRef(null);
    const [toasts, setToasts] = react_1.default.useState([]);
    const toastIdRef = react_1.default.useRef(0);
    const lastCtrlCTimeRef = react_1.default.useRef(0);
    const [modelRefresh, setModelRefresh] = react_1.default.useState(0); // used to trigger footer re-render on model change
    // Close command palette if slash removed
    react_1.default.useEffect(() => {
        if (activeModal?.type === 'command-palette' && activeModal.isSlash && !inputValue.startsWith('/')) {
            setActiveModal(null);
        }
    }, [inputValue, activeModal]);
    const addToast = (0, react_1.useCallback)((message, type = 'info') => {
        const id = ++toastIdRef.current;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000); // auto-dismiss after 4s
    }, []);
    // Handle input submission
    const handleSubmit = (0, react_1.useCallback)(async () => {
        if (inputValue.trim() === '' || isSubmitting)
            return;
        const userInput = inputValue.trim();
        setInputValue('');
        setIsSubmitting(true);
        // Bash mode: !cmd or !!cmd
        if (userInput.startsWith('!')) {
            const withoutContext = userInput.startsWith('!!');
            const cmd = withoutContext ? userInput.slice(2).trim() : userInput.slice(1).trim();
            if (cmd) {
                try {
                    const { execSync } = await Promise.resolve().then(() => __importStar(require('node:child_process')));
                    const output = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
                    setActiveModal({ type: 'bash-output', command: cmd, output });
                }
                catch (err) {
                    setActiveModal({ type: 'bash-output', command: cmd, output: err.message || 'Error', error: true });
                }
            }
            setIsSubmitting(false);
            return;
        }
        try {
            await sendMessage(userInput);
        }
        catch (err) {
            console.error('Send error:', err.message || err);
        }
        finally {
            setIsSubmitting(false);
        }
    }, [inputValue, isSubmitting, sendMessage]);
    // Version check on mount
    react_1.default.useEffect(() => {
        const checkVersion = async () => {
            try {
                const response = await fetch('https://registry.npmjs.org/@picro/picro/latest', { signal: AbortSignal.timeout(5000) });
                if (response.ok) {
                    const data = await response.json();
                    const latest = data.version;
                    const current = config_1.VERSION;
                    if (latest && latest !== current) {
                        addToast(`New version available: ${latest} (current: ${current})`, 'info');
                        // Auto-open changelog modal
                        setActiveModal({ type: 'changelog' });
                    }
                }
            }
            catch {
                // ignore network errors
            }
        };
        checkVersion();
    }, [addToast]);
    // Global keybindings
    (0, ink_1.useInput)((input, key) => {
        if (activeModal)
            return;
        if (key.ctrl && input === 'p') {
            setActiveModal({ type: 'command-palette' });
        }
        else if (key.ctrl && input === 't') {
            setActiveModal({ type: 'thinking' });
        }
        else if (key.ctrl && key.shift && input === 't') {
            // Toggle theme with Ctrl+Shift+T
            toggleTheme();
            // Persist
            try {
                runtime.settings?.set('theme', isDark ? 'light' : 'dark');
                runtime.settings?.save?.();
            }
            catch {
                // ignore
            }
        }
        else if (key.ctrl && key.shift && input === 'x') {
            // Toggle tool output expansion
            setToolOutputExpanded(prev => !prev);
            addToast('Tool output ' + (!toolOutputExpanded ? 'expanded' : 'collapsed'));
        }
        else if (key.ctrl && key.shift && input === 'h') {
            // Toggle thinking block visibility
            setHideThinkingBlock(prev => !prev);
            addToast('Thinking blocks: ' + (!hideThinkingBlock ? 'hidden' : 'visible'));
        }
        else if (key.ctrl && input === 'l') {
            setActiveModal({ type: 'login' });
        }
        else if (key.ctrl && input === 'r') {
            setActiveModal({ type: 'session-selector' });
        }
        else if (key.ctrl && input === 'd') {
            setShowDebug((prev) => !prev);
        }
        else if (key.ctrl && input === 'e') {
            setActiveModal({ type: 'editor', initialValue: inputValue, onSave: async (val) => setInputValue(val) });
        }
        else if (key.ctrl && key.shift && input === 'v') {
            // Paste from clipboard (async fire-and-forget)
            (async () => {
                try {
                    const clipboardy = await Promise.resolve().then(() => __importStar(require('clipboardy')));
                    const text = await clipboardy.default.read();
                    setInputValue(prev => prev + text);
                    addToast('Pasted from clipboard', 'info');
                }
                catch (err) {
                    addToast('Paste failed: ' + (err.message || err), 'error');
                }
            })();
            return;
        }
        else if (key.ctrl && input === 'c') {
            const now = Date.now();
            if (now - lastCtrlCTimeRef.current < 1000) {
                process.exit(0);
            }
            else {
                lastCtrlCTimeRef.current = now;
                try {
                    runtime.session?.abort?.();
                    addToast('Interrupted', 'info');
                }
                catch {
                    // ignore
                }
            }
        }
    });
    const handleCommandSelect = (0, react_1.useCallback)(async (commandId, slashArgs) => {
        setActiveModal(null);
        const builtIn = slash_commands_1.BUILTIN_SLASH_COMMANDS.find(cmd => cmd.name === commandId);
        if (!builtIn) {
            // Non-built-in: insert into input for sending as user message
            setInputValue(commandId);
            return;
        }
        // Extract args after command name if present
        let args = '';
        if (slashArgs) {
            const withoutSlash = slashArgs.slice(1).trim(); // remove leading '/'
            const parts = withoutSlash.split(' ');
            if (parts[0] === commandId) {
                args = parts.slice(1).join(' ').trim();
            }
        }
        switch (commandId) {
            case 'quit':
                process.exit(0);
                break;
            case 'thinking':
                if (args && ['off', 'minimal', 'low', 'medium', 'high', 'xhigh'].includes(args)) {
                    runtime.setThinkingLevel(args);
                    addToast(`Thinking level set to ${args}`, 'success');
                }
                else {
                    setActiveModal({ type: 'thinking' });
                }
                break;
            case 'login':
                setActiveModal({ type: 'login' });
                break;
            case 'help':
                setActiveModal({ type: 'help' });
                break;
            case 'copy':
                // If args contain 'all', copy full conversation; else copy last assistant
                if (args === 'all') {
                    const conversation = messages.map(m => {
                        const role = m.role === 'user' ? 'You' : m.role === 'assistant' ? 'Assistant' : 'Tool';
                        return `${role}: ${m.content}`;
                    }).join('\n\n');
                    try {
                        await runtime.copyToClipboard(conversation);
                        addToast('Copied full conversation to clipboard', 'success');
                    }
                    catch (err) {
                        addToast('Copy failed', 'error');
                    }
                }
                else {
                    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
                    if (lastAssistant) {
                        try {
                            await runtime.copyToClipboard(lastAssistant.content);
                            addToast('Copied last assistant message', 'success');
                        }
                        catch (err) {
                            addToast('Copy failed', 'error');
                        }
                    }
                    else {
                        addToast('No assistant message to copy', 'info');
                    }
                }
                break;
            case 'resume':
                setActiveModal({ type: 'session-selector' });
                break;
            case 'new':
                // Show confirmation before creating new session
                setActiveModal({
                    type: 'confirmation',
                    title: 'New Session',
                    message: 'Create a new session? Current session will be saved.',
                    onConfirm: async () => {
                        try {
                            await runtime.newSession();
                            addToast('New session created', 'success');
                        }
                        catch (err) {
                            addToast('Failed to create session', 'error');
                        }
                    },
                    onCancel: () => {
                        // no-op
                    },
                });
                break;
            case 'settings':
                setActiveModal({ type: 'settings' });
                break;
            case 'model':
                setActiveModal({ type: 'model-selector' });
                break;
            case 'export':
                // Export current session to HTML file
                try {
                    const messages = runtime.session.messages;
                    if (messages.length === 0) {
                        addToast('No messages to export', 'info');
                        break;
                    }
                    // Generate simple HTML
                    const cwd = runtime.cwd;
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const filename = `session-${timestamp}.html`;
                    const filepath = `${cwd}/${filename}`;
                    let html = `<!DOCTYPE html><html><head><title>Session Export</title>`;
                    html += `<style>body{font-family:sans-serif;max-width:800px;margin:auto;padding:20px} .user{color:#0066cc} .assistant{color:#2e7d32} .tool{color:#d32f2f}</style>`;
                    html += `</head><body><h1>Session Export</h1>`;
                    for (const msg of messages) {
                        const role = msg.role;
                        const content = msg.content?.map((c) => c.text || '').join('') || String(msg.content || '');
                        const escaped = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        html += `<div class="${role}"><strong>${role}:</strong> ${escaped}</div>`;
                    }
                    html += `</body></html>`;
                    // Write file (using node fs)
                    const fs = await Promise.resolve().then(() => __importStar(require('node:fs')));
                    fs.writeFileSync(filepath, html, 'utf-8');
                    addToast(`Exported to ${filename}`, 'success');
                }
                catch (err) {
                    addToast('Export failed: ' + err.message, 'error');
                }
                break;
            case 'import':
                // Import session from JSONL file (use fd to pick)
                try {
                    const { execSync } = await Promise.resolve().then(() => __importStar(require('node:child_process')));
                    const cwd = runtime.cwd;
                    // Find jsonl files
                    const output = execSync('fd --extension jsonl', { cwd, encoding: 'utf-8' }).trim();
                    const files = output ? output.split('\n').filter(Boolean) : [];
                    if (files.length === 0) {
                        addToast('No JSONL files found in current directory', 'info');
                        break;
                    }
                    // For simplicity, pick the first one or prompt later
                    const filepath = `${cwd}/${files[0]}`; // TODO: prompt user to select
                    const { cancelled } = await runtime.switchSession(filepath);
                    if (cancelled) {
                        addToast('Import cancelled', 'info');
                    }
                    else {
                        addToast(`Imported session from ${files[0]}`, 'success');
                    }
                }
                catch (err) {
                    if (err.code === 'ENOENT') {
                        addToast('fd not found - install fd for file picking', 'error');
                    }
                    else {
                        addToast('Import failed: ' + err.message, 'error');
                    }
                }
                break;
            case 'share':
                // Share current session as GitHub gist (requires GitHub auth)
                try {
                    const messages = runtime.session.messages;
                    if (messages.length === 0) {
                        addToast('No messages to share', 'info');
                        break;
                    }
                    // Get GitHub token from authStorage (cast to any to bypass interface limitation)
                    const authStorage = runtime.authStorage;
                    const token = await authStorage.getApiKey?.('github') || process.env.GITHUB_TOKEN;
                    if (!token) {
                        addToast('GitHub token required. Login with /login github first.', 'error');
                        break;
                    }
                    // Create gist content (JSON)
                    const content = JSON.stringify(messages, (key, value) => {
                        if (key === 'content' && Array.isArray(value)) {
                            return value.map((v) => v.text || v.thinking || '').join('');
                        }
                        return value;
                    }, 2);
                    const response = await fetch('https://api.github.com/gists', {
                        method: 'POST',
                        headers: {
                            'Authorization': `token ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            description: 'Session export from picro',
                            public: false,
                            files: { 'session.json': { content } },
                        }),
                    });
                    if (!response.ok) {
                        throw new Error(`GitHub API error: ${response.status}`);
                    }
                    const data = await response.json();
                    const gistUrl = data.html_url;
                    await runtime.copyToClipboard(gistUrl);
                    addToast('Gist URL copied to clipboard', 'success');
                }
                catch (err) {
                    addToast('Share failed: ' + (err.message || err), 'error');
                }
                break;
            case 'name':
                // Set session display name via settings (persisted per session?)
                const currentName = runtime.settings?.get?.('sessionDisplayName') || '';
                setActiveModal({ type: 'editor', initialValue: currentName, onSave: async (val) => {
                        const name = val.trim();
                        try {
                            if (runtime.settings) {
                                runtime.settings.set('sessionDisplayName', name);
                                await runtime.settings.save?.();
                                addToast(`Session name set to: ${name || '(default)'}`, 'success');
                            }
                            else {
                                addToast('Settings unavailable', 'error');
                            }
                        }
                        catch (err) {
                            addToast('Failed to set session name', 'error');
                        }
                    } });
                break;
            case 'session':
                setActiveModal({ type: 'session-info' });
                break;
            case 'changelog':
                setActiveModal({ type: 'changelog' });
                break;
            case 'hotkeys':
                setActiveModal({ type: 'hotkeys' });
                break;
            case 'clone':
                // Duplicate current session by forking from first message or creating new session with same messages
                try {
                    const messages = runtime.session.messages;
                    if (messages.length === 0) {
                        addToast('No messages to clone', 'info');
                        break;
                    }
                    // Find earliest user message to fork from
                    const firstUserMsg = messages.find(m => m.role === 'user');
                    if (firstUserMsg && firstUserMsg.id) {
                        await runtime.fork(firstUserMsg.id);
                        addToast('Session cloned (forked from first message)', 'success');
                    }
                    else {
                        // Fallback: create new session
                        await runtime.newSession();
                        addToast('New empty session created', 'success');
                    }
                }
                catch (err) {
                    addToast('Clone failed: ' + err.message, 'error');
                }
                break;
            case 'tree':
                setActiveModal({ type: 'tree-selector' }); // Note: using 'tree' as type for modal mapping
                break;
            case 'compact':
                // Trigger manual compaction
                try {
                    const session = runtime.session;
                    if (typeof session.compact === 'function') {
                        await session.compact();
                        addToast('Compaction completed', 'success');
                    }
                    else {
                        addToast('Compaction not supported', 'error');
                    }
                }
                catch (err) {
                    addToast('Compaction failed', 'error');
                }
                break;
            case 'reload':
                // Reload all resources (extensions, skills, prompts, themes, keybindings)
                try {
                    const session = runtime.session;
                    if (typeof session.reload === 'function') {
                        await session.reload();
                        addToast('All resources reloaded', 'success');
                    }
                    else {
                        await runtime.settings?.reload?.();
                        addToast('Settings reloaded (full reload not available)', 'success');
                    }
                }
                catch (err) {
                    addToast('Reload failed: ' + err.message, 'error');
                }
                break;
                // Reload settings and resources
                try {
                    await runtime.settings?.reload?.();
                    // TODO: also reload extensions, skills, prompts, themes from runtime
                    addToast('Settings reloaded', 'success');
                }
                catch (err) {
                    addToast('Reload failed', 'error');
                }
                break;
            case 'logout':
                // Remove authentication for all providers
                try {
                    const authStorage = runtime.authStorage;
                    const providers = authStorage.getProviders?.() || [];
                    let count = 0;
                    for (const p of providers) {
                        await authStorage.removeApiKey?.(p);
                        count++;
                    }
                    addToast(`Logged out from ${count} provider(s)`, 'success');
                }
                catch (err) {
                    addToast('Logout failed', 'error');
                }
                break;
            case 'scoped-models':
                // Toggle scoped models mode for model cycling
                try {
                    const settings = runtime.settings;
                    if (settings) {
                        const current = settings.get('scopedModelsEnabled') ?? false;
                        const next = !current;
                        settings.set('scopedModelsEnabled', next);
                        await settings.save?.();
                        addToast(`Scoped models ${next ? 'enabled' : 'disabled'}`, 'success');
                    }
                    else {
                        addToast('Settings not available', 'error');
                    }
                }
                catch (err) {
                    addToast('Failed to toggle scoped models', 'error');
                }
                break;
            case 'fork':
                // Fork current session at a specific message
                // For now, fork from the first user message if available
                try {
                    const messages = runtime.session.messages;
                    if (messages.length === 0) {
                        addToast('No messages to fork', 'info');
                        break;
                    }
                    // Find a user message to fork from - prefer the last user message
                    const userMessages = messages.filter(m => m.role === 'user');
                    const targetMsg = userMessages[userMessages.length - 1] || userMessages[0];
                    if (targetMsg?.id) {
                        const result = await runtime.fork(targetMsg.id);
                        if (result.cancelled) {
                            addToast('Fork cancelled', 'info');
                        }
                        else {
                            addToast('Fork created successfully', 'success');
                        }
                    }
                    else {
                        addToast('No suitable message to fork', 'error');
                    }
                }
                catch (err) {
                    addToast('Fork failed: ' + err.message, 'error');
                }
                break;
            case 'stats':
                // Show performance metrics
                const stats = runtime.session.getPerformanceStats?.();
                if (stats) {
                    setActiveModal({ type: 'stats', stats });
                }
                else {
                    addToast('Performance tracking is disabled or no data available', 'info');
                }
                break;
            case 'paste':
                // Paste image from clipboard into input
                try {
                    // Try Wayland (wl-paste) first, then X11 (xclip)
                    let pngBuffer;
                    try {
                        const { execFileSync } = await Promise.resolve().then(() => __importStar(require('node:child_process')));
                        pngBuffer = execFileSync('wl-paste', ['--no-size', '--type', 'image/png']);
                    }
                    catch (e1) {
                        try {
                            const { execFileSync } = await Promise.resolve().then(() => __importStar(require('node:child_process')));
                            pngBuffer = execFileSync('xclip', ['-selection', 'clipboard', '-t', 'image/png', '-o']);
                        }
                        catch (e2) {
                            addToast('No image in clipboard or missing wl-paste/xclip', 'error');
                            break;
                        }
                    }
                    // Save to a PNG file in cwd
                    const fs = await Promise.resolve().then(() => __importStar(require('node:fs')));
                    const path = await Promise.resolve().then(() => __importStar(require('node:path')));
                    const timestamp = Date.now();
                    const filename = `pasted-${timestamp}.png`;
                    const filepath = path.join(runtime.cwd, filename);
                    fs.writeFileSync(filepath, pngBuffer);
                    // Append markdown image reference to input
                    setInputValue(prev => prev + `![](${filename})`);
                    addToast(`Pasted image as ${filename}`, 'success');
                }
                catch (err) {
                    addToast(`Paste failed: ${err.message}`, 'error');
                }
                break;
            case 'debug':
                handleDebugCommand();
                addToast('Debug log written', 'success');
                break;
            case 'arminsayshi':
                setActiveModal({ type: 'armin' });
                break;
            case 'dementedelves':
                setActiveModal({ type: 'earendil' });
                break;
            default:
                // Unimplemented command - show informative message
                addToast(`Command "/${commandId}" not yet implemented`, 'info');
                break;
        }
        setInputValue('');
    }, [runtime, messages, addToast, setActiveModal, setInputValue, slash_commands_1.BUILTIN_SLASH_COMMANDS]);
    const handleThinkingChange = (0, react_1.useCallback)((level) => {
        setActiveModal(null);
        runtime.setThinkingLevel(level);
    }, [runtime]);
    const handleLogin = (0, react_1.useCallback)(async (apiKey) => {
        const defaultProvider = runtime.settings?.getDefaultProvider() || 'openai';
        await runtime.authStorage.setApiKey(defaultProvider, apiKey);
        addToast('Logged in successfully', 'success');
        setActiveModal(null);
    }, [runtime, addToast]);
    const handleDebugCommand = (0, react_1.useCallback)(() => {
        try {
            const rt = runtime;
            const session = rt.session;
            const { messages } = session;
            const stats = session.getSessionStats?.();
            const debugLogPath = require('node:path').join(require('node:os').tmpdir(), `picro-debug-${Date.now()}.log`);
            const lines = [
                `Picro Debug Log`,
                `Generated: ${new Date().toISOString()}`,
                `CWD: ${rt.cwd}`,
                `Session: ${stats?.sessionFile || 'in-memory'}`,
                `Model: ${session.model?.provider}/${session.model?.id}`,
                `Thinking level: ${session.thinkingLevel}`,
                `Messages: ${messages.length} total`,
                `  User: ${stats?.userMessages || 0}`,
                `  Assistant: ${stats?.assistantMessages || 0}`,
                `  ToolCalls: ${stats?.toolCalls || 0}`,
                `  ToolResults: ${stats?.toolResults || 0}`,
                `Tokens: in=${stats?.tokens?.input || 0}, out=${stats?.tokens?.output || 0}, total=${stats?.tokens?.total || 0}`,
                `Cost: $${stats?.cost?.toFixed(4) || 0}`,
                '',
                '=== Full Message History (JSONL) ===',
            ];
            for (const msg of messages) {
                lines.push(JSON.stringify(msg));
            }
            require('node:fs').writeFileSync(debugLogPath, lines.join('\n'), 'utf-8');
            addToast(`Debug log written to ${debugLogPath}`, 'success');
        }
        catch (err) {
            addToast(`Debug failed: ${err.message}`, 'error');
        }
    }, [runtime, addToast]);
    const handleTreeSelect = (0, react_1.useCallback)(async (branchId) => {
        try {
            const session = runtime.session;
            if (session.navigateTree) {
                const result = await session.navigateTree(branchId);
                if (result.cancelled) {
                    addToast('Branch navigation cancelled', 'info');
                }
                else {
                    addToast(`Switched to branch: ${branchId}`, 'success');
                }
            }
            else {
                addToast('Tree navigation not supported', 'error');
            }
        }
        catch (err) {
            addToast(`Tree navigation failed: ${err.message}`, 'error');
        }
    }, [runtime, addToast]);
    // Path autocomplete using fd
    const handlePathComplete = (0, react_1.useCallback)(async (partial) => {
        if (!runtime.cwd)
            return [];
        try {
            const { execFile } = await Promise.resolve().then(() => __importStar(require('node:child_process')));
            return new Promise((resolve) => {
                execFile('fd', ['--color', 'never', '--base-path', '.', '--', partial + '*'], { cwd: runtime.cwd }, (err, stdout) => {
                    if (err) {
                        resolve([]);
                        return;
                    }
                    const files = stdout.trim().split('\n').filter(Boolean);
                    resolve(files);
                });
            });
        }
        catch (e) {
            console.error('fd autocomplete error:', e);
            return [];
        }
    }, [runtime.cwd]);
    // External editor (Ctrl+E)
    const handleExternalEdit = (0, react_1.useCallback)(async (text) => {
        const editor = process.env.EDITOR || process.env.VISUAL || 'vim';
        const fs = await Promise.resolve().then(() => __importStar(require('node:fs')));
        const path = await Promise.resolve().then(() => __importStar(require('node:path')));
        const os = await Promise.resolve().then(() => __importStar(require('node:os')));
        const { spawnSync } = await Promise.resolve().then(() => __importStar(require('node:child_process')));
        const tmpdir = os.tmpdir();
        const dir = fs.mkdtempSync(path.join(tmpdir, 'picro-'));
        const filepath = path.join(dir, 'edit.txt');
        try {
            fs.writeFileSync(filepath, text, 'utf-8');
            spawnSync(editor, [filepath], { stdio: 'inherit', cwd: runtime.cwd });
            const newText = fs.readFileSync(filepath, 'utf-8');
            return newText;
        }
        finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    }, [runtime.cwd]);
    // Render active modal
    const renderModal = () => {
        if (!activeModal)
            return null;
        switch (activeModal.type) {
            case 'command-palette':
                // Collect commands from multiple sources
                const session = runtime.session;
                const builtinCmds = slash_commands_1.BUILTIN_SLASH_COMMANDS;
                const extensionCommands = session._extensionRunner?.getCommands?.() || [];
                const skills = session._resourceLoader?.getSkills?.()?.skills || [];
                const promptTemplates = session._resourceLoader?.getPromptTemplates?.() || [];
                // Merge and map to Command shape
                const allCommands = [
                    ...builtinCmds.map(c => ({ id: c.name, label: `/${c.name}`, description: c.description, source: 'builtin' })),
                    ...extensionCommands.map(c => ({ id: c.invocationName, label: c.invocationName.startsWith('/') ? c.invocationName : `/${c.invocationName}`, description: c.description, source: 'extension' })),
                    ...skills.map(s => ({ id: `skill:${s.name}`, label: `skill:${s.name}`, description: s.description, source: 'skill' })),
                    ...promptTemplates.map(t => ({ id: t.name, label: `template:${t.name}`, description: t.description, source: 'template' })),
                ];
                const filter = activeModal.filter || '';
                // For slash-prefixed filter, strip leading slashes for matching
                const search = filter.toLowerCase().replace(/^\/+/g, '');
                const filtered = allCommands.filter(cmd => cmd.label.toLowerCase().includes(search) ||
                    (cmd.description && cmd.description.toLowerCase().includes(search)));
                return ((0, jsx_runtime_1.jsx)(Modal_1.Modal, { onClose: () => setActiveModal(null), children: (0, jsx_runtime_1.jsx)(CommandPalette_1.CommandPalette, { commands: filtered, onSelect: (id) => handleCommandSelect(id, filter), onClose: () => setActiveModal(null) }) }));
            case 'thinking':
                return ((0, jsx_runtime_1.jsx)(Modal_1.Modal, { onClose: () => setActiveModal(null), children: (0, jsx_runtime_1.jsx)(ThinkingModal_1.ThinkingModal, { currentLevel: thinkingLevel, onChange: handleThinkingChange }) }));
            case 'login':
                return ((0, jsx_runtime_1.jsx)(Modal_1.Modal, { onClose: () => setActiveModal(null), children: (0, jsx_runtime_1.jsx)(LoginModal_1.LoginModal, { onLogin: handleLogin, onClose: () => setActiveModal(null) }) }));
            case 'editor':
                return ((0, jsx_runtime_1.jsx)(Modal_1.Modal, { onClose: () => setActiveModal(null), children: (0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { bold: true, children: "Edit Input" }), (0, jsx_runtime_1.jsx)(InputBox_1.InputBox, { value: activeModal.initialValue, onChange: setInputValue, onSubmit: async () => {
                                    await activeModal.onSave(inputValue);
                                    setActiveModal(null);
                                }, multiline: true, autoFocus: true })] }) }));
            case 'help':
                return ((0, jsx_runtime_1.jsx)(Modal_1.Modal, { onClose: () => setActiveModal(null), children: (0, jsx_runtime_1.jsx)(HelpModal_1.HelpModal, { onClose: () => setActiveModal(null) }) }));
            case 'session-selector':
                return ((0, jsx_runtime_1.jsx)(SessionSelectorModal_1.SessionSelectorModal, { runtime: runtime, onClose: () => setActiveModal(null) }));
            case 'settings':
                return ((0, jsx_runtime_1.jsx)(Modal_1.Modal, { onClose: () => setActiveModal(null), children: (0, jsx_runtime_1.jsx)(SettingsSelectorModal_1.SettingsSelectorModal, { runtime: runtime, onClose: () => setActiveModal(null) }) }));
            case 'model-selector':
                return ((0, jsx_runtime_1.jsx)(Modal_1.Modal, { onClose: () => setActiveModal(null), children: (0, jsx_runtime_1.jsx)(ModelSelectorModal_1.ModelSelectorModal, { runtime: runtime, onClose: () => setActiveModal(null), onSelect: () => setModelRefresh(v => v + 1) }) }));
            case 'session-info':
                return ((0, jsx_runtime_1.jsx)(Modal_1.Modal, { onClose: () => setActiveModal(null), children: (0, jsx_runtime_1.jsx)(SessionInfoModal_1.SessionInfoModal, { runtime: runtime, onClose: () => setActiveModal(null) }) }));
            case 'changelog':
                return ((0, jsx_runtime_1.jsx)(Modal_1.Modal, { onClose: () => setActiveModal(null), children: (0, jsx_runtime_1.jsx)(ChangelogModal_1.ChangelogModal, { onClose: () => setActiveModal(null) }) }));
            case 'hotkeys':
                return ((0, jsx_runtime_1.jsx)(Modal_1.Modal, { onClose: () => setActiveModal(null), children: (0, jsx_runtime_1.jsx)(HotkeysModal_1.HotkeysModal, { onClose: () => setActiveModal(null) }) }));
            case 'tree-selector':
                return ((0, jsx_runtime_1.jsx)(Modal_1.Modal, { onClose: () => setActiveModal(null), children: (0, jsx_runtime_1.jsx)(TreeSelectorModal_1.TreeSelectorModal, { runtime: runtime, onClose: () => setActiveModal(null), onSelect: handleTreeSelect }) }));
            case 'bash-output':
                return ((0, jsx_runtime_1.jsx)(Modal_1.Modal, { onClose: () => setActiveModal(null), children: (0, jsx_runtime_1.jsx)(BashOutputModal_1.BashOutputModal, { command: activeModal.command, output: activeModal.output, error: activeModal.error, onClose: () => setActiveModal(null) }) }));
            case 'confirmation':
                return ((0, jsx_runtime_1.jsx)(Modal_1.Modal, { onClose: () => setActiveModal(null), children: (0, jsx_runtime_1.jsx)(ConfirmationModal_1.ConfirmationModal, { title: activeModal.title, message: activeModal.message, onConfirm: async () => {
                            await activeModal.onConfirm();
                            setActiveModal(null);
                        }, onCancel: () => {
                            activeModal.onCancel?.();
                            setActiveModal(null);
                        } }) }));
            case 'stats':
                return ((0, jsx_runtime_1.jsx)(Modal_1.Modal, { onClose: () => setActiveModal(null), children: (0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", borderStyle: "round", borderColor: "green", padding: 1, children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { bold: true, color: "green", children: "Performance Metrics" }), (0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", marginTop: 1, children: [(0, jsx_runtime_1.jsxs)(ink_1.Text, { children: ["Samples: ", activeModal.stats.sampleCount] }), (0, jsx_runtime_1.jsxs)(ink_1.Text, { children: ["Time Span: ", activeModal.stats.timeSpanMS.toFixed(0), "ms"] }), (0, jsx_runtime_1.jsxs)(ink_1.Text, { children: ["Avg CPU User: ", activeModal.stats.avgCpuUserMS.toFixed(2), "ms"] }), (0, jsx_runtime_1.jsxs)(ink_1.Text, { children: ["Avg CPU System: ", activeModal.stats.avgCpuSystemMS.toFixed(2), "ms"] }), (0, jsx_runtime_1.jsxs)(ink_1.Text, { children: ["Avg RSS: ", activeModal.stats.avgRSSMB.toFixed(2), " MB"] }), (0, jsx_runtime_1.jsxs)(ink_1.Text, { children: ["Avg Heap Used: ", activeModal.stats.avgHeapUsedMB.toFixed(2), " MB"] }), (0, jsx_runtime_1.jsxs)(ink_1.Text, { children: ["Peak RSS: ", activeModal.stats.peakRSSMB.toFixed(2), " MB"] }), (0, jsx_runtime_1.jsxs)(ink_1.Text, { children: ["Peak Heap Used: ", activeModal.stats.peakHeapUsedMB.toFixed(2), " MB"] })] })] }) }));
            case 'armin':
                return ((0, jsx_runtime_1.jsx)(Modal_1.Modal, { onClose: () => setActiveModal(null), children: (0, jsx_runtime_1.jsx)(ink_1.Box, { justifyContent: "center", alignItems: "center", flexDirection: "column", children: (0, jsx_runtime_1.jsx)(ink_1.Text, { children: "HI! I'M ARMIN!" }) }) }));
            case 'earendil':
                return ((0, jsx_runtime_1.jsx)(Modal_1.Modal, { onClose: () => setActiveModal(null), children: (0, jsx_runtime_1.jsx)(ink_1.Box, { justifyContent: "center", alignItems: "center", flexDirection: "column", children: (0, jsx_runtime_1.jsx)(ink_1.Text, { bold: true, color: "yellow", children: "DEMENTED ELVES HAVE EMERGED" }) }) }));
            case 'input':
                return ((0, jsx_runtime_1.jsx)(Modal_1.Modal, { onClose: () => setActiveModal(null), children: (0, jsx_runtime_1.jsx)(InputModal_1.InputModal, { title: activeModal.title, placeholder: activeModal.placeholder, onSubmit: (value) => {
                            activeModal.onSubmit(value);
                            setActiveModal(null);
                        }, onCancel: () => {
                            activeModal.onCancel?.();
                            setActiveModal(null);
                        } }) }));
            case 'select':
                return ((0, jsx_runtime_1.jsx)(Modal_1.Modal, { onClose: () => setActiveModal(null), children: (0, jsx_runtime_1.jsx)(SelectModal_1.SelectModal, { title: activeModal.title, options: activeModal.options, onSelect: (opt) => {
                            activeModal.onSelect(opt);
                            setActiveModal(null);
                        }, onCancel: () => {
                            activeModal.onCancel?.();
                            setActiveModal(null);
                        } }) }));
            case 'custom':
                if (!customOverlay)
                    return null;
                const CustomFactory = customOverlay.factory;
                return ((0, jsx_runtime_1.jsx)(Modal_1.Modal, { onClose: () => { setCustomOverlay(null); }, children: (() => {
                        const component = CustomFactory({
                            tui: null,
                            theme,
                            keybindings: {},
                            done: (result) => {
                                customOverlay.resolve(result);
                                setCustomOverlay(null);
                            },
                        });
                        return component;
                    })() }));
            default:
                return null;
        }
    };
    const modelId = currentModel?.id || runtime.session?.model?.id || 'No model';
    const themeLabel = isDark ? 'dark' : 'light';
    // Compute resource counts for display
    const session = runtime.session;
    const resourceLoader = session._resourceLoader;
    let extCount = 0, skillCount = 0, promptCount = 0, themeCount = 0;
    if (resourceLoader) {
        try {
            const extResult = resourceLoader.getExtensions?.();
            if (extResult?.extensions?.length)
                extCount = extResult.extensions.length;
            const skillsResult = resourceLoader.getSkills?.();
            if (skillsResult?.skills?.length)
                skillCount = skillsResult.skills.length;
            const promptsResult = resourceLoader.getPromptTemplates?.();
            if (promptsResult?.length)
                promptCount = promptsResult.length;
            const themesResult = resourceLoader.getThemes?.();
            if (themesResult?.themes?.length)
                themeCount = themesResult.themes.length;
        }
        catch (e) {
            // ignore errors
        }
    }
    const resourceCounts = { extensions: extCount, skills: skillCount, prompts: promptCount, themes: themeCount };
    // Extension widget management (above editor)
    const [extensionWidgetsAbove, setExtensionWidgetsAbove] = react_1.default.useState(new Map());
    const [extensionWidgetsBelow, setExtensionWidgetsBelow] = react_1.default.useState(new Map());
    const setExtensionWidget = react_1.default.useCallback((key, content, options) => {
        const placement = options?.placement || 'above';
        if (placement === 'above') {
            setExtensionWidgetsAbove(prev => {
                const next = new Map(prev);
                if (content == null)
                    next.delete(key);
                else if (typeof content === 'string')
                    next.set(key, content);
                return next;
            });
        }
        else if (placement === 'below') {
            setExtensionWidgetsBelow(prev => {
                const next = new Map(prev);
                if (content == null)
                    next.delete(key);
                else if (typeof content === 'string')
                    next.set(key, content);
                return next;
            });
        }
    }, []);
    // Custom editor component support
    const [customEditor, setCustomEditor] = react_1.default.useState(null);
    const [autocompleteProviderFactories, setAutocompleteProviderFactories] = react_1.default.useState([]);
    const registerAutocompleteProvider = react_1.default.useCallback((factory) => {
        setAutocompleteProviderFactories(prev => [...prev, factory]);
    }, []);
    const handleAutocomplete = (0, react_1.useCallback)(async (filter) => {
        const ctx = { sessionId: '', cwd: runtime.cwd, filter };
        const suggestions = [];
        for (const factory of autocompleteProviderFactories) {
            try {
                const result = await factory(ctx);
                for (const item of result) {
                    suggestions.push(item.insertText || item.label);
                }
            }
            catch {
                // ignore provider errors
            }
        }
        return suggestions;
    }, [runtime.cwd, autocompleteProviderFactories]);
    // Custom header/footer replacement
    const [customHeader, setCustomHeader] = react_1.default.useState(null);
    const [customFooter, setCustomFooter] = react_1.default.useState(null);
    // Custom overlay (for extensions)
    const [customOverlay, setCustomOverlay] = react_1.default.useState(null);
    const showCustomOverlay = react_1.default.useCallback((factory, options) => {
        return new Promise(resolve => {
            setCustomOverlay({ factory, resolve });
        });
    }, []);
    // Extension UI dialog helpers
    const showConfirm = (title, message, opts) => {
        return new Promise(resolve => {
            setActiveModal({
                type: 'confirmation',
                title,
                message,
                onConfirm: () => { resolve(true); setActiveModal(null); },
                onCancel: () => { resolve(false); setActiveModal(null); },
            });
        });
    };
    const showInput = (title, placeholder, opts) => {
        return new Promise(resolve => {
            setActiveModal({
                type: 'input',
                title,
                placeholder,
                onSubmit: (value) => { resolve(value); setActiveModal(null); },
                onCancel: () => { resolve(undefined); setActiveModal(null); },
            });
        });
    };
    const showSelect = (title, options, opts) => {
        return new Promise(resolve => {
            setActiveModal({
                type: 'select',
                title,
                options,
                onSelect: (option) => { resolve(option); setActiveModal(null); },
                onCancel: () => { resolve(undefined); setActiveModal(null); },
            });
        });
    };
    // Create ExtensionUIContext factory
    const createExtensionUIContext = () => ({
        select: showSelect,
        confirm: showConfirm,
        input: showInput,
        notify: (message, type = 'info') => addToast(message, type),
        onTerminalInput: (handler) => { return () => { }; },
        setStatus: (key, text) => { },
        setWorkingMessage: (message) => { },
        setWorkingIndicator: (options) => { },
        setHiddenThinkingLabel: setHiddenThinkingLabel,
        setWidget: (key, content, options) => { setExtensionWidget(key, content, options); },
        setFooter: setCustomFooter,
        setHeader: setCustomHeader,
        setTitle: (title) => { try {
            process.title = title;
        }
        catch { } },
        custom: showCustomOverlay,
        pasteToEditor: (text) => setInputValue(prev => prev + text),
        setEditorText: (text) => setInputValue(text),
        getEditorText: () => inputValue,
        editor: (title, prefill) => Promise.resolve(prefill),
        addAutocompleteProvider: (factory) => { },
        setEditorComponent: setCustomEditor,
        get theme() { return theme; },
        getAllThemes: () => [],
        getTheme: (name) => null,
        setTheme: () => ({ success: true }),
        getToolsExpanded: () => toolOutputExpanded,
        setToolsExpanded: (expanded) => setToolOutputExpanded(expanded),
    });
    // Bind extensions on mount
    react_1.default.useEffect(() => {
        const session = runtime.session;
        if (session?.bindExtensions && !session.__picroBound) {
            session.bindExtensions({
                uiContext: createExtensionUIContext(),
                commandContextActions: {
                    waitForIdle: async () => { },
                    newSession: async (options) => ({ cancelled: true }),
                    fork: async (entryId, options) => ({ cancelled: true }),
                    navigateTree: async (targetId, options) => ({ cancelled: true }),
                    switchSession: async (path, options) => ({ cancelled: true }),
                    reload: async () => { }
                },
                shutdownHandler: () => { },
                onError: (err) => console.error('Extension error:', err)
            });
            session.__picroBound = true;
        }
    }, [runtime, createExtensionUIContext]);
    // Check for latest version on startup
    react_1.default.useEffect(() => {
        const checkVersion = async () => {
            try {
                const res = await fetch('https://registry.npmjs.org/picro');
                if (!res.ok)
                    return;
                const data = await res.json();
                const latest = data?.['dist-tags']?.latest;
                if (latest && latest !== config_1.VERSION) {
                    addToast(`New version ${latest} available (current: ${config_1.VERSION})`, 'info');
                }
            }
            catch (e) {
                // ignore
            }
        };
        checkVersion();
    }, [addToast]);
    // Input editor (default or custom) props
    const inputProps = {
        value: inputValue,
        onChange: setInputValue,
        onSubmit: handleSubmit,
        placeholder: 'Type your message...',
        disabled: isSubmitting,
        onSlashCommand: (prefix) => {
            setActiveModal({ type: 'command-palette', filter: prefix, isSlash: true });
        },
        onTab: () => {
            setActiveModal({ type: 'command-palette', filter: '', isSlash: false });
        },
        cwd: runtime.cwd,
        onPathComplete: handlePathComplete,
        onExternalEdit: handleExternalEdit,
        onAutocomplete: handleAutocomplete,
    };
    return ((0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", width: "100%", position: "relative", children: [customHeader || ((0, jsx_runtime_1.jsx)(Header_1.Header, { title: "Picro Agent", status: status || 'Ready', thinkingLevel: thinkingLevel, model: modelId, theme: themeLabel, showArmin: true, resourceCounts: resourceCounts })), (0, jsx_runtime_1.jsxs)(ink_1.Box, { flexGrow: 1, overflow: "hidden", position: "relative", children: [(steeringMessages.length > 0 || followUpMessages.length > 0) && ((0, jsx_runtime_1.jsx)(ink_1.Box, { borderBottom: true, paddingX: 1, children: (0, jsx_runtime_1.jsxs)(ink_1.Text, { color: "yellow", dim: true, children: ["Queued: ", steeringMessages.length, " steer, ", followUpMessages.length, " follow-up (Ctrl+Alt+E to edit)"] }) })), (0, jsx_runtime_1.jsx)(MessageList_1.MessageList, { ref: messageListRef, messages: messages, hideThinkingBlock: hideThinkingBlock }), showDebug && ((0, jsx_runtime_1.jsx)(ink_1.Box, { position: "absolute", top: 0, right: 0, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { color: "yellow", children: "Debug" }) }))] }), extensionWidgetsAbove.size > 0 && ((0, jsx_runtime_1.jsx)(ink_1.Box, { flexDirection: "column", paddingX: 1, borderTop: "thin", children: Array.from(extensionWidgetsAbove.entries()).map(([key, text]) => ((0, jsx_runtime_1.jsx)(ink_1.Text, { children: text }, key))) })), customEditor
                ? react_1.default.createElement(customEditor, inputProps)
                : (0, jsx_runtime_1.jsx)(InputBox_1.InputBox, { ...inputProps }), extensionWidgetsBelow.size > 0 && ((0, jsx_runtime_1.jsx)(ink_1.Box, { flexDirection: "column", paddingX: 1, borderTop: "thin", children: Array.from(extensionWidgetsBelow.entries()).map(([key, text]) => ((0, jsx_runtime_1.jsx)(ink_1.Text, { children: text }, key))) })), (isCompacting || retryAttempt > 0) && ((0, jsx_runtime_1.jsx)(ink_1.Box, { paddingX: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { color: isCompacting ? 'yellow' : 'orange', children: displayStatus }) })), customFooter || (0, jsx_runtime_1.jsx)(Footer_1.Footer, { runtime: runtime, hints: [
                    'Ctrl+P: Commands',
                    'Ctrl+T: Thinking',
                    'Ctrl+Shift+T: Toggle Theme',
                    'Ctrl+R: Resume Session',
                    'Ctrl+Alt+E: Edit',
                    'Ctrl+D: Debug',
                    'Ctrl+C: Quit'
                ] }), activeModal && renderModal(), (0, jsx_runtime_1.jsx)(ink_1.Box, { flexDirection: "column", position: "absolute", top: 0, right: 0, children: toasts.map(toast => ((0, jsx_runtime_1.jsx)(ink_1.Box, { borderStyle: "round", paddingX: 1, margin: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { color: toast.type === 'error' ? 'red' : toast.type === 'success' ? 'green' : 'cyan', children: toast.message }) }, toast.id))) })] }));
};
const InkApp = ({ runtime }) => {
    // Set up global error handling for unhandled errors and rejections
    (0, ErrorBoundary_1.useGlobalErrorHandler)();
    // Determine initial theme from settings
    let initialMode = 'dark';
    try {
        const themeSetting = runtime.settings?.get?.('theme');
        if (themeSetting === 'light')
            initialMode = 'light';
    }
    catch {
        // default dark
    }
    return ((0, jsx_runtime_1.jsx)(ErrorBoundary_1.ErrorBoundary, { onError: (error, errorInfo) => {
            console.error('App error:', error, errorInfo);
            // TODO: report to telemetry if available
        }, children: (0, jsx_runtime_1.jsx)(useTheme_1.ThemeProvider, { initialMode: initialMode, children: (0, jsx_runtime_1.jsx)(InkAppInner, { runtime: runtime }) }) }));
};
exports.InkApp = InkApp;
const runInkApp = async (runtime) => {
    const { waitUntilExit } = (0, ink_1.render)((0, jsx_runtime_1.jsx)(exports.InkApp, { runtime: runtime }));
    await waitUntilExit();
};
exports.runInkApp = runInkApp;
//# sourceMappingURL=InkApp.js.map