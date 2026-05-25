import { jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { useTheme } from "../hooks/useTheme";
import { Modal } from "./Modal";
const ChangelogModal = ({ onClose }) => {
  const { theme } = useTheme();
  const [content, setContent] = useState("");
  useEffect(() => {
    setContent("=== CHANGELOG ===\n\n- Added new slash commands\n- Improved UI\n\n(Press Esc to close)");
  }, []);
  const handleKey = (input, key) => {
    if (key.escape) {
      onClose();
    }
  };
  useInput(handleKey);
  return /* @__PURE__ */ jsx(Modal, { onClose, children: /* @__PURE__ */ jsxs(Box, { flexDirection: "column", borderStyle: "round", borderColor: "cyan", padding: 1, width: 80, children: [
    /* @__PURE__ */ jsx(Text, { bold: true, color: "cyan", children: "Changelog" }),
    /* @__PURE__ */ jsx(Box, { flexDirection: "column", marginTop: 1, children: content.split("\n").map((line, i) => /* @__PURE__ */ jsx(Text, { children: line }, i)) }),
    /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { dim: true, children: "Press Esc to close" }) })
  ] }) });
};
export {
  ChangelogModal
};
