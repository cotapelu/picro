"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useRuntime = useRuntime;
/** @jsxImportSource react */
const react_1 = require("react");
function agentMessageToUiMessage(msg) {
    if (!msg || typeof msg !== 'object')
        return null;
    let role; // 'user' | 'assistant' | 'tool' | 'bashExecution' | 'compactionSummary' | 'branchSummary' | 'custom'
    let content = '';
    let toolCalls;
    let thinkingBlocks;
    if (msg.role === 'user') {
        role = 'user';
        if (typeof msg.content === 'string') {
            content = msg.content;
        }
        else if (Array.isArray(msg.content)) {
            const textBlocks = msg.content.filter((c) => c.type === 'text');
            content = textBlocks.map((c) => c.text).join('') || '';
        }
    }
    else if (msg.role === 'assistant') {
        role = 'assistant';
        if (Array.isArray(msg.content)) {
            const textBlocks = [];
            const thinking = [];
            for (const c of msg.content) {
                if (c.type === 'text')
                    textBlocks.push(c.text);
                else if (c.type === 'thinking')
                    thinking.push(c.thinking);
                else if (c.type === 'toolCall') {
                    // toolCalls handled below
                }
            }
            content = textBlocks.join('');
            if (thinking.length > 0)
                thinkingBlocks = thinking;
            const toolCallBlocks = msg.content.filter((c) => c.type === 'toolCall');
            toolCalls = toolCallBlocks.map((c) => ({
                id: c.id,
                name: c.name,
                arguments: c.arguments,
                status: 'pending',
            }));
        }
        else if (typeof msg.content === 'string') {
            content = msg.content;
        }
    }
    else if (msg.role === 'tool') {
        role = 'tool';
        if (Array.isArray(msg.content)) {
            content = msg.content.map((c) => c.text).join('') || '';
        }
        else {
            content = String(msg.content || '');
        }
    }
    else if (msg.role === 'bashExecution') {
        role = 'bashExecution';
        // Preserve bash fields in the returned Message
        const bashMsg = {
            bashCommand: msg.command,
            bashOutput: msg.output,
            bashExitCode: msg.exitCode,
            bashCancelled: msg.cancelled,
            bashTruncated: msg.truncated,
        };
        return { ...bashMsg, id: msg.id || `msg-${Date.now()}`, role, timestamp: msg.timestamp || Date.now(), content: '', streaming: false };
    }
    else if (msg.role === 'compactionSummary' || msg.role === 'branchSummary') {
        role = 'assistant';
        content = msg.content?.toString() || `[${msg.role}]`;
    }
    else if (msg.role === 'custom') {
        role = 'assistant';
        content = `[Custom: ${msg.customType}]`;
    }
    return {
        id: msg.id || `msg-${Date.now()}`,
        role,
        content,
        timestamp: msg.timestamp || Date.now(),
        toolCalls,
        thinkingBlocks,
        streaming: false,
    };
}
function useRuntime(runtime) {
    const [messages, setMessages] = (0, react_1.useState)([]);
    const [status, setStatus] = (0, react_1.useState)('Ready');
    const [isStreaming, setIsStreaming] = (0, react_1.useState)(false);
    const [isCompacting, setIsCompacting] = (0, react_1.useState)(false);
    const [retryAttempt, setRetryAttempt] = (0, react_1.useState)(0);
    const [toolOutputExpanded, setToolOutputExpanded] = (0, react_1.useState)(false);
    const [hideThinkingBlock, setHideThinkingBlock] = (0, react_1.useState)(false);
    const [hiddenThinkingLabel, setHiddenThinkingLabel] = (0, react_1.useState)('Thinking...');
    const [currentModel, setCurrentModel] = (0, react_1.useState)(null);
    const [thinkingLevel, setThinkingLevelState] = (0, react_1.useState)(() => {
        try {
            return runtime.thinkingLevel ?? 'medium';
        }
        catch {
            return 'medium';
        }
    });
    const [steeringMessages, setSteeringMessages] = (0, react_1.useState)([]);
    const [followUpMessages, setFollowUpMessages] = (0, react_1.useState)([]);
    // Load initial messages
    (0, react_1.useEffect)(() => {
        const sessionMsgs = runtime.session.messages;
        if (Array.isArray(sessionMsgs)) {
            const initial = sessionMsgs
                .map(agentMessageToUiMessage)
                .filter((msg) => msg !== null);
            setMessages(initial);
        }
    }, [runtime]);
    // Subscribe to events
    (0, react_1.useEffect)(() => {
        const session = runtime.session;
        const unsubscribe = session.subscribe((event) => {
            switch (event.type) {
                case 'agent_start':
                    setIsStreaming(true);
                    setStatus('Running...');
                    break;
                case 'agent_end':
                    setIsStreaming(false);
                    setStatus('Ready');
                    break;
                case 'queue_update':
                    setSteeringMessages(Array.isArray(event.steering) ? event.steering : []);
                    setFollowUpMessages(Array.isArray(event.followUp) ? event.followUp : []);
                    break;
                case 'compaction_start':
                    setIsCompacting(true);
                    break;
                case 'compaction_end':
                    setIsCompacting(false);
                    break;
                case 'auto_retry_start':
                    setRetryAttempt(event.attempt ?? 0);
                    break;
                case 'auto_retry_end':
                    setRetryAttempt(0);
                    break;
                case 'model_change':
                    setCurrentModel(event.model ?? null);
                    setThinkingLevelState(runtime.thinkingLevel ?? thinkingLevel);
                    break;
                case 'error':
                    setStatus(`Error: ${event.error}`);
                    break;
                case 'session_tree':
                    // Rebuild full message list from session after branch navigation
                    const sessionMsgs = runtime.session.messages;
                    if (Array.isArray(sessionMsgs)) {
                        const allMessages = sessionMsgs
                            .map(agentMessageToUiMessage)
                            .filter((msg) => msg !== null);
                        setMessages(allMessages);
                    }
                    break;
                default:
                    break;
            }
        });
        // Set initial model
        try {
            setCurrentModel(session.model);
        }
        catch {
            setCurrentModel(null);
        }
        return unsubscribe;
    }, [runtime, thinkingLevel]);
    const sendMessage = (0, react_1.useCallback)(async (text) => {
        await runtime.session.prompt(text);
    }, [runtime]);
    const abort = (0, react_1.useCallback)(() => {
        runtime.session.abort();
        setIsStreaming(false);
        setStatus('Aborted');
    }, [runtime]);
    const setThinkingLevel = (0, react_1.useCallback)(async (level) => {
        runtime.setThinkingLevel(level);
        setThinkingLevelState(level);
        try {
            if (runtime.settings?.set) {
                runtime.settings.set('defaultThinkingLevel', level);
                await runtime.settings.save?.();
            }
        }
        catch {
            // ignore
        }
    }, [runtime]);
    return {
        messages,
        status,
        isStreaming,
        isCompacting,
        retryAttempt,
        toolOutputExpanded,
        setToolOutputExpanded,
        hideThinkingBlock,
        setHideThinkingBlock,
        hiddenThinkingLabel,
        setHiddenThinkingLabel,
        steeringMessages,
        followUpMessages,
        currentModel,
        thinkingLevel,
        sendMessage,
        abort,
        setThinkingLevel,
        runtime,
    };
}
//# sourceMappingURL=useRuntime.js.map