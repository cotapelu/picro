import { jsx, jsxs } from "react/jsx-runtime";
import { Box, Text } from "ink";
import { useTheme } from "../../hooks/useTheme";
import { AssistantMessage } from "./AssistantMessage";
import { UserMessage } from "./UserMessage";
import { ToolExecution } from "./ToolExecution";
import { BashExecution } from "./BashExecution";
const MessageItem = ({
  message,
  onToolToggle,
  expandedTools = /* @__PURE__ */ new Set(),
  hideThinkingBlock = false
}) => {
  const { theme } = useTheme();
  const renderContent = (content) => {
    const maxWidth = 80;
    const lines = [];
    const words = content.split(" ");
    let currentLine = "";
    for (const word of words) {
      if ((currentLine + " " + word).length > maxWidth) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = currentLine ? currentLine + " " + word : word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.map((line, i) => /* @__PURE__ */ jsx(Text, { children: line }, i));
  };
  const renderToolCalls = (toolCalls) => {
    return toolCalls.map((tool) => {
      const isExpanded = expandedTools.has(tool.id);
      return /* @__PURE__ */ jsx(
        ToolExecution,
        {
          toolCall: tool,
          expanded: isExpanded,
          onToggle: () => onToolToggle?.(tool.id)
        },
        tool.id
      );
    });
  };
  const shouldShowRole = message.role !== "user";
  const roleColor = message.role === "assistant" ? theme.success : message.role === "tool" ? theme.accent : theme.primary;
  return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", marginBottom: 1, children: [
    shouldShowRole && /* @__PURE__ */ jsxs(Text, { bold: true, color: roleColor, children: [
      message.role === "assistant" ? "Assistant" : message.role === "tool" ? "Tool" : "User",
      ":"
    ] }),
    /* @__PURE__ */ jsxs(Box, { flexDirection: "column", marginLeft: shouldShowRole ? 2 : 0, children: [
      message.role === "user" && /* @__PURE__ */ jsx(UserMessage, { text: message.content }),
      message.role === "assistant" && /* @__PURE__ */ jsx(
        AssistantMessage,
        {
          content: message.content,
          thinkingBlocks: message.thinkingBlocks,
          hideThinkingBlock
        }
      ),
      message.role === "bashExecution" && /* @__PURE__ */ jsx(
        BashExecution,
        {
          command: message.bashCommand || "",
          output: message.bashOutput || "",
          exitCode: message.bashExitCode,
          cancelled: message.bashCancelled,
          truncated: message.bashTruncated
        }
      ),
      (message.role === "tool" || message.role === "compactionSummary" || message.role === "branchSummary" || message.role === "custom") && /* @__PURE__ */ jsx(Text, { children: message.content }),
      message.toolCalls && message.toolCalls.length > 0 && /* @__PURE__ */ jsx(Box, { flexDirection: "column", children: renderToolCalls(message.toolCalls) }),
      message.error && /* @__PURE__ */ jsxs(Text, { color: theme.error, children: [
        "Error: ",
        message.error
      ] }),
      message.streaming && !message.content && /* @__PURE__ */ jsx(Text, { color: theme.dim, children: "..." })
    ] })
  ] });
};
export {
  MessageItem
};
