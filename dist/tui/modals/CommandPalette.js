import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { useTheme } from "../hooks/useTheme";
const CommandPalette = ({
  commands,
  onSelect,
  onClose,
  initialFilter = ""
}) => {
  const { theme } = useTheme();
  const [filter, setFilter] = useState(initialFilter);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const filteredCommands = commands.filter(
    (cmd) => cmd.label.toLowerCase().includes(filter.toLowerCase()) || cmd.description?.toLowerCase().includes(filter.toLowerCase())
  );
  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);
  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }
    if (key.return) {
      if (filteredCommands[selectedIndex]) {
        onSelect(filteredCommands[selectedIndex].id);
      }
      return;
    }
    if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(filteredCommands.length - 1, prev + 1));
      return;
    }
    if (input.length === 1 && !key.ctrl && !key.meta) {
      setFilter((prev) => prev + input);
    }
  });
  return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", borderStyle: "round", borderColor: theme.accent, padding: 1, children: [
    /* @__PURE__ */ jsx(Text, { bold: true, color: theme.accent, children: "Command Palette" }),
    /* @__PURE__ */ jsxs(Box, { children: [
      /* @__PURE__ */ jsx(Text, { color: theme.dim, children: "Filter: " }),
      /* @__PURE__ */ jsx(Text, { color: theme.foreground, children: filter })
    ] }),
    /* @__PURE__ */ jsx(Box, { flexDirection: "column", marginTop: 1, children: filteredCommands.length === 0 ? /* @__PURE__ */ jsxs(Text, { color: theme.dim, children: [
      'No commands match "',
      filter,
      '"'
    ] }) : filteredCommands.map((cmd, idx) => /* @__PURE__ */ jsxs(Box, { children: [
      /* @__PURE__ */ jsxs(
        Text,
        {
          color: idx === selectedIndex ? theme.selectedForeground || "white" : theme.secondary,
          backgroundColor: idx === selectedIndex ? theme.selectedBackground || "blue" : void 0,
          bold: idx === selectedIndex,
          children: [
            idx === selectedIndex ? "> " : "  ",
            cmd.label
          ]
        }
      ),
      cmd.shortcut && /* @__PURE__ */ jsxs(Text, { color: theme.dim, children: [
        " ",
        "[",
        cmd.shortcut,
        "]"
      ] }),
      cmd.description && /* @__PURE__ */ jsxs(Text, { color: theme.dim, children: [
        " ",
        "- ",
        cmd.description
      ] })
    ] }, cmd.id)) }),
    /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { color: theme.dim, children: "Use \u2191\u2193 to navigate, Enter to select, Esc to close" }) })
  ] });
};
export {
  CommandPalette
};
