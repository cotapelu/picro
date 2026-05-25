import { jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { useTheme } from "../hooks/useTheme";
import { Modal } from "./Modal";
const TreeSelectorModal = ({ runtime, onClose, onSelect }) => {
  const { theme } = useTheme();
  const [branches, setBranches] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  useEffect(() => {
    try {
      const manager = runtime.session?.sessionManager;
      if (manager?.getBranch) {
        const branchList = manager.getBranch();
        setBranches(branchList.map((b) => b.id || String(b)));
      } else {
        setBranches(["main"]);
      }
    } catch {
      setBranches(["main"]);
    }
  }, [runtime]);
  const handleKey = (input, key) => {
    if (key.escape) {
      onClose();
      return;
    }
    if (key.return) {
      const branchId = branches[selectedIndex];
      if (onSelect) {
        onSelect(branchId);
      }
      onClose();
      return;
    }
    if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(branches.length - 1, prev + 1));
      return;
    }
  };
  useInput(handleKey);
  return /* @__PURE__ */ jsx(Modal, { onClose, children: /* @__PURE__ */ jsxs(Box, { flexDirection: "column", borderStyle: "round", borderColor: "cyan", padding: 1, children: [
    /* @__PURE__ */ jsx(Text, { bold: true, color: "cyan", children: "Session Tree" }),
    /* @__PURE__ */ jsx(Box, { flexDirection: "column", marginTop: 1, children: branches.map((branch, idx) => /* @__PURE__ */ jsx(Box, { children: /* @__PURE__ */ jsxs(Text, { color: idx === selectedIndex ? theme.selectedForeground || "white" : theme.foreground, children: [
      idx === selectedIndex ? "> " : "  ",
      branch
    ] }) }, branch)) }),
    /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { dim: true, children: "\u2191\u2193 navigate, Enter switch, Esc cancel" }) })
  ] }) });
};
export {
  TreeSelectorModal
};
