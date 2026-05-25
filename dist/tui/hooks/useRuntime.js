import { useEffect, useState, useCallback } from "react";
function agentMessageToUiMessage(msg) {
  if (!msg || typeof msg !== "object") return null;
  let role;
  let content = "";
  let toolCalls;
  let thinkingBlocks;
  if (msg.role === "user") {
    role = "user";
    if (typeof msg.content === "string") {
      content = msg.content;
    } else if (Array.isArray(msg.content)) {
      const textBlocks = msg.content.filter((c) => c.type === "text");
      content = textBlocks.map((c) => c.text).join("") || "";
    }
  } else if (msg.role === "assistant") {
    role = "assistant";
    if (Array.isArray(msg.content)) {
      const textBlocks = [];
      const thinking = [];
      for (const c of msg.content) {
        if (c.type === "text") textBlocks.push(c.text);
        else if (c.type === "thinking") thinking.push(c.thinking);
        else if (c.type === "toolCall") {
        }
      }
      content = textBlocks.join("");
      if (thinking.length > 0) thinkingBlocks = thinking;
      const toolCallBlocks = msg.content.filter((c) => c.type === "toolCall");
      toolCalls = toolCallBlocks.map((c) => ({
        id: c.id,
        name: c.name,
        arguments: c.arguments,
        status: "pending"
      }));
    } else if (typeof msg.content === "string") {
      content = msg.content;
    }
  } else if (msg.role === "tool") {
    role = "tool";
    if (Array.isArray(msg.content)) {
      content = msg.content.map((c) => c.text).join("") || "";
    } else {
      content = String(msg.content || "");
    }
  } else if (msg.role === "bashExecution") {
    role = "bashExecution";
    const bashMsg = {
      bashCommand: msg.command,
      bashOutput: msg.output,
      bashExitCode: msg.exitCode,
      bashCancelled: msg.cancelled,
      bashTruncated: msg.truncated
    };
    return { ...bashMsg, id: msg.id || `msg-${Date.now()}`, role, timestamp: msg.timestamp || Date.now(), content: "", streaming: false };
  } else if (msg.role === "compactionSummary" || msg.role === "branchSummary") {
    role = "assistant";
    content = msg.content?.toString() || `[${msg.role}]`;
  } else if (msg.role === "custom") {
    role = "assistant";
    content = `[Custom: ${msg.customType}]`;
  }
  return {
    id: msg.id || `msg-${Date.now()}`,
    role,
    content,
    timestamp: msg.timestamp || Date.now(),
    toolCalls,
    thinkingBlocks,
    streaming: false
  };
}
function useRuntime(runtime) {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("Ready");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCompacting, setIsCompacting] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [toolOutputExpanded, setToolOutputExpanded] = useState(false);
  const [hideThinkingBlock, setHideThinkingBlock] = useState(false);
  const [hiddenThinkingLabel, setHiddenThinkingLabel] = useState("Thinking...");
  const [currentModel, setCurrentModel] = useState(null);
  const [thinkingLevel, setThinkingLevelState] = useState(() => {
    try {
      return runtime.thinkingLevel ?? "medium";
    } catch {
      return "medium";
    }
  });
  const [steeringMessages, setSteeringMessages] = useState([]);
  const [followUpMessages, setFollowUpMessages] = useState([]);
  useEffect(() => {
    const sessionMsgs = runtime.session.messages;
    if (Array.isArray(sessionMsgs)) {
      const initial = sessionMsgs.map(agentMessageToUiMessage).filter((msg) => msg !== null);
      setMessages(initial);
    }
  }, [runtime]);
  useEffect(() => {
    const session = runtime.session;
    const unsubscribe = session.subscribe((event) => {
      switch (event.type) {
        case "agent_start":
          setIsStreaming(true);
          setStatus("Running...");
          break;
        case "agent_end":
          setIsStreaming(false);
          setStatus("Ready");
          break;
        case "queue_update":
          setSteeringMessages(Array.isArray(event.steering) ? event.steering : []);
          setFollowUpMessages(Array.isArray(event.followUp) ? event.followUp : []);
          break;
        case "compaction_start":
          setIsCompacting(true);
          break;
        case "compaction_end":
          setIsCompacting(false);
          break;
        case "auto_retry_start":
          setRetryAttempt(event.attempt ?? 0);
          break;
        case "auto_retry_end":
          setRetryAttempt(0);
          break;
        case "model_change":
          setCurrentModel(event.model ?? null);
          setThinkingLevelState(runtime.thinkingLevel ?? thinkingLevel);
          break;
        case "error":
          setStatus(`Error: ${event.error}`);
          break;
        case "session_tree":
          const sessionMsgs = runtime.session.messages;
          if (Array.isArray(sessionMsgs)) {
            const allMessages = sessionMsgs.map(agentMessageToUiMessage).filter((msg) => msg !== null);
            setMessages(allMessages);
          }
          break;
        default:
          break;
      }
    });
    try {
      setCurrentModel(session.model);
    } catch {
      setCurrentModel(null);
    }
    return unsubscribe;
  }, [runtime, thinkingLevel]);
  const sendMessage = useCallback(async (text) => {
    await runtime.session.prompt(text);
  }, [runtime]);
  const abort = useCallback(() => {
    runtime.session.abort();
    setIsStreaming(false);
    setStatus("Aborted");
  }, [runtime]);
  const setThinkingLevel = useCallback(async (level) => {
    runtime.setThinkingLevel(level);
    setThinkingLevelState(level);
    try {
      if (runtime.settings?.set) {
        runtime.settings.set("defaultThinkingLevel", level);
        await runtime.settings.save?.();
      }
    } catch {
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
    runtime
  };
}
export {
  useRuntime
};
