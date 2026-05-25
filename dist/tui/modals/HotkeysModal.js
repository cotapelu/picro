import { jsx, jsxs } from "react/jsx-runtime";
import { Box, Text, useInput } from "ink";
import { useTheme } from "../hooks/useTheme";
import { Modal } from "./Modal";
const HotkeysModal = ({ onClose }) => {
  const { theme } = useTheme();
  const handleKey = (input, key) => {
    if (key.escape) {
      onClose();
    }
  };
  useInput(handleKey);
  const keybindings = [
    { key: "Ctrl+P", desc: "Open command palette" },
    { key: "Ctrl+T", desc: "Set thinking level" },
    { key: "Ctrl+Shift+T", desc: "Toggle theme" },
    { key: "Ctrl+L", desc: "Login" },
    { key: "Ctrl+R", desc: "Resume session" },
    { key: "Ctrl+Alt+E", desc: "Edit input in external editor" },
    { key: "Ctrl+D", desc: "Toggle debug mode" },
    { key: "Ctrl+C", desc: "Exit application" },
    { key: "Tab", desc: "Autocomplete / command palette" },
    { key: "/", desc: "Slash commands" },
    { key: "!", desc: "Bash command" },
    { key: "!!", desc: "Bash command without context" }
  ];
  return /* @__PURE__ */ jsx(Modal, { onClose, children: /* @__PURE__ */ jsxs(Box, { flexDirection: "column", borderStyle: "round", borderColor: "cyan", padding: 1, children: [
    /* @__PURE__ */ jsx(Text, { bold: true, color: "cyan", children: "Keybindings" }),
    /* @__PURE__ */ jsx(Box, { flexDirection: "column", marginTop: 1, children: keybindings.map((kb) => /* @__PURE__ */ jsxs(Box, { children: [
      /* @__PURE__ */ jsx(Text, { color: "yellow", children: kb.key.padEnd(15) }),
      /* @__PURE__ */ jsx(Text, { children: kb.desc })
    ] }, kb.key)) }),
    /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { dim: true, children: "Press Esc to close" }) })
  ] }) });
};
export {
  HotkeysModal
};
