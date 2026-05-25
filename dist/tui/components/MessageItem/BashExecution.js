import { jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Box, Text } from "ink";
import { useTheme } from "../../hooks/useTheme";
import { sanitizeAndTruncate } from "../../utils/output-guards";
const BashExecution = ({
  command,
  output,
  exitCode,
  cancelled = false,
  truncated = false
}) => {
  const { theme } = useTheme();
  const [showOutput, setShowOutput] = useState(true);
  const isError = !cancelled && exitCode !== 0;
  return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", marginLeft: 2, children: [
    /* @__PURE__ */ jsxs(Box, { children: [
      /* @__PURE__ */ jsxs(
        Text,
        {
          bold: true,
          color: isError ? theme.error : theme.accent,
          onPress: () => setShowOutput(!showOutput),
          children: [
            showOutput ? "\u25BC" : "\u25B6",
            " !",
            command
          ]
        }
      ),
      cancelled && /* @__PURE__ */ jsx(Text, { color: theme.warning, children: " (cancelled)" }),
      !cancelled && exitCode !== void 0 && /* @__PURE__ */ jsxs(Text, { color: isError ? theme.error : theme.dim, children: [
        " (exit ",
        exitCode,
        ")"
      ] }),
      truncated && /* @__PURE__ */ jsx(Text, { color: theme.warning, children: " [truncated]" })
    ] }),
    showOutput && output && /* @__PURE__ */ jsx(Box, { marginLeft: 2, flexDirection: "column", children: /* @__PURE__ */ jsx(Text, { color: theme.dim, children: sanitizeAndTruncate(output) }) })
  ] });
};
export {
  BashExecution
};
