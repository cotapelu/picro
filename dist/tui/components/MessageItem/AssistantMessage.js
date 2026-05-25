import { jsx, jsxs } from "react/jsx-runtime";
import { Box, Text } from "ink";
import { useTheme } from "../../hooks/useTheme";
const AssistantMessage = ({
  content,
  thinkingBlocks,
  hideThinkingBlock = false,
  hiddenThinkingLabel = "Thinking..."
}) => {
  const { theme } = useTheme();
  const renderThinking = () => {
    if (!thinkingBlocks || thinkingBlocks.length === 0) return null;
    if (hideThinkingBlock) {
      return /* @__PURE__ */ jsx(Text, { italic: true, color: theme.thinkingText || theme.dim, children: hiddenThinkingLabel });
    }
    return /* @__PURE__ */ jsx(Box, { flexDirection: "column", children: thinkingBlocks.map((tb, i) => /* @__PURE__ */ jsxs(Text, { italic: true, color: theme.thinkingText || theme.dim, children: [
      "[Thinking: ",
      tb,
      "]"
    ] }, i)) });
  };
  return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
    renderThinking(),
    /* @__PURE__ */ jsx(Text, { children: content })
  ] });
};
export {
  AssistantMessage
};
