import { jsxs } from "react/jsx-runtime";
import { Box, Text } from "ink";
import { useTheme } from "../../hooks/useTheme";
import { sanitizeAndTruncate } from "../../utils/output-guards";
const ToolExecution = ({ toolCall, expanded, onToggle }) => {
  const { theme } = useTheme();
  const renderArgs = () => {
    try {
      const json = JSON.stringify(toolCall.arguments, null, 2);
      return json;
    } catch {
      return String(toolCall.arguments);
    }
  };
  const renderResult = () => {
    if (!toolCall.result) return null;
    try {
      const json = JSON.stringify(toolCall.result, null, 2);
      return json;
    } catch {
      return String(toolCall.result);
    }
  };
  return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", marginLeft: 2, children: [
    /* @__PURE__ */ jsxs(Box, { children: [
      /* @__PURE__ */ jsxs(
        Text,
        {
          bold: true,
          color: expanded ? theme.accent : theme.warning,
          onPress: onToggle,
          children: [
            expanded ? "\u25BC" : "\u25B6",
            " ",
            toolCall.name
          ]
        }
      ),
      /* @__PURE__ */ jsxs(Text, { color: theme.dim, children: [
        " - ",
        toolCall.status
      ] })
    ] }),
    expanded && /* @__PURE__ */ jsxs(Box, { flexDirection: "column", marginLeft: 2, children: [
      /* @__PURE__ */ jsxs(Text, { color: theme.dim, children: [
        "Input: ",
        renderArgs()
      ] }),
      toolCall.result && /* @__PURE__ */ jsxs(Text, { color: toolCall.status === "error" ? theme.error : theme.dim, children: [
        "Output: ",
        sanitizeAndTruncate(renderResult() ?? "")
      ] })
    ] })
  ] });
};
export {
  ToolExecution
};
