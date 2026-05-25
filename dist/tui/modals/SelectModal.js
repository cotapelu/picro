import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { Modal } from "./Modal";
import { useTheme } from "../hooks/useTheme";
const SelectModal = ({ title, options, onSelect, onCancel }) => {
  const { theme } = useTheme();
  const [selectedIndex, setSelectedIndex] = useState(0);
  useEffect(() => {
    setSelectedIndex(0);
  }, [options]);
  const handleKey = (input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.return) {
      onSelect(options[selectedIndex]);
      return;
    }
    if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(options.length - 1, prev + 1));
      return;
    }
  };
  useInput(handleKey);
  return /* @__PURE__ */ jsx(Modal, { onClose: onCancel, children: /* @__PURE__ */ jsxs(Box, { flexDirection: "column", borderStyle: "round", borderColor: "cyan", padding: 1, children: [
    /* @__PURE__ */ jsx(Text, { bold: true, color: "cyan", children: title }),
    /* @__PURE__ */ jsx(Box, { flexDirection: "column", marginTop: 1, children: options.map((opt, idx) => /* @__PURE__ */ jsx(Box, { children: /* @__PURE__ */ jsxs(
      Text,
      {
        color: idx === selectedIndex ? theme.selectedForeground || "green" : theme.foreground,
        backgroundColor: idx === selectedIndex ? theme.selectedBackground || void 0 : void 0,
        children: [
          idx === selectedIndex ? "> " : "  ",
          opt
        ]
      }
    ) }, opt)) }),
    /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { dim: true, children: "\u2191\u2193 navigate, Enter select, Esc cancel" }) })
  ] }) });
};
export {
  SelectModal
};
