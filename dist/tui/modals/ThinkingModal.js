import { jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Box, Text, useInput } from "ink";
const THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh"];
const ThinkingModal = ({
  currentLevel,
  onChange
}) => {
  const [selectedIndex, setSelectedIndex] = useState(
    THINKING_LEVELS.indexOf(currentLevel)
  );
  useInput((input, key) => {
    if (key.escape) {
      onChange(currentLevel);
      return;
    }
    if (key.return) {
      onChange(THINKING_LEVELS[selectedIndex]);
      return;
    }
    if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(THINKING_LEVELS.length - 1, prev + 1));
      return;
    }
  });
  return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", borderStyle: "round", borderColor: "yellow", padding: 1, children: [
    /* @__PURE__ */ jsx(Text, { color: "yellow", bold: true, children: "Select Thinking Level" }),
    /* @__PURE__ */ jsx(Box, { flexDirection: "column", marginTop: 1, children: THINKING_LEVELS.map((level, idx) => /* @__PURE__ */ jsxs(Box, { children: [
      /* @__PURE__ */ jsxs(
        Text,
        {
          color: idx === selectedIndex ? "white" : "gray",
          backgroundColor: idx === selectedIndex ? "yellow" : void 0,
          children: [
            idx === selectedIndex ? "> " : "  ",
            level
          ]
        }
      ),
      idx === selectedIndex && /* @__PURE__ */ jsxs(Text, { color: "black", backgroundColor: "yellow", children: [
        " ",
        "(current: ",
        currentLevel,
        ")"
      ] })
    ] }, level)) }),
    /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { children: "\u2191\u2193 to navigate, Enter to select, Esc to cancel" }) })
  ] });
};
export {
  ThinkingModal
};
