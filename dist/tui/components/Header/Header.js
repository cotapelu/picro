import { jsx, jsxs } from "react/jsx-runtime";
import { Box, Text } from "ink";
import { Armin } from "../Armin";
const Header = ({ title, status, thinkingLevel, model, theme, showArmin = false, resourceCounts }) => {
  return /* @__PURE__ */ jsxs(Box, { borderStyle: "single", borderBottom: true, paddingX: 1, justifyContent: "space-between", children: [
    /* @__PURE__ */ jsxs(Box, { gap: 1, children: [
      showArmin && /* @__PURE__ */ jsx(Armin, { size: 1 }),
      /* @__PURE__ */ jsx(Text, { bold: true, color: "cyan", children: title })
    ] }),
    /* @__PURE__ */ jsxs(Box, { gap: 1, children: [
      /* @__PURE__ */ jsxs(Text, { color: "gray", children: [
        "Model: ",
        model
      ] }),
      /* @__PURE__ */ jsxs(Text, { color: "green", children: [
        "Thinking: ",
        thinkingLevel
      ] }),
      theme && /* @__PURE__ */ jsxs(Text, { color: "cyan", children: [
        "Theme: ",
        theme
      ] }),
      /* @__PURE__ */ jsxs(Text, { color: status.startsWith("Error") ? "red" : "green", children: [
        "[",
        status,
        "]"
      ] }),
      resourceCounts && /* @__PURE__ */ jsxs(Box, { gap: 1, children: [
        /* @__PURE__ */ jsxs(Text, { dim: true, children: [
          "E:",
          resourceCounts.extensions
        ] }),
        /* @__PURE__ */ jsxs(Text, { dim: true, children: [
          "S:",
          resourceCounts.skills
        ] }),
        /* @__PURE__ */ jsxs(Text, { dim: true, children: [
          "P:",
          resourceCounts.prompts
        ] }),
        /* @__PURE__ */ jsxs(Text, { dim: true, children: [
          "T:",
          resourceCounts.themes
        ] })
      ] })
    ] })
  ] });
};
export {
  Header
};
