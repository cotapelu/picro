import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { useTheme } from "../../hooks/useTheme";
function getCommonPrefix(strings) {
  if (strings.length === 0) return "";
  const first = strings[0];
  for (let i = 0; i < first.length; i++) {
    const char = first[i];
    for (let j = 1; j < strings.length; j++) {
      if (strings[j][i] !== char) {
        return first.slice(0, i);
      }
    }
  }
  return first;
}
const InputBox = ({
  value,
  onChange,
  onSubmit,
  placeholder = "",
  disabled = false,
  multiline = true,
  autoFocus = true,
  onSlashCommand,
  onTab,
  cwd,
  onPathComplete,
  onExternalEdit,
  onAutocomplete
}) => {
  const { theme } = useTheme();
  const [cursorPosition, setCursorPosition] = useState(value.length);
  const inputRef = useRef(value);
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const killRingRef = useRef("");
  useEffect(() => {
    inputRef.current = value;
    setCursorPosition(value.length);
    if (onSlashCommand && value.startsWith("/")) {
      onSlashCommand(value);
    }
  }, [value, onSlashCommand]);
  const navigateHistory = useCallback((direction) => {
    const history = historyRef.current;
    if (history.length === 0) return;
    if (direction === "up") {
      if (historyIndexRef.current < history.length - 1) {
        historyIndexRef.current++;
        const newValue = history[history.length - 1 - historyIndexRef.current];
        onChange(newValue);
      }
    } else {
      if (historyIndexRef.current > 0) {
        historyIndexRef.current--;
        const newValue = history[history.length - 1 - historyIndexRef.current];
        onChange(newValue);
      } else if (historyIndexRef.current === 0) {
        historyIndexRef.current = -1;
        onChange("");
      }
    }
  }, [onChange]);
  useInput(async (input, key) => {
    if (disabled) return;
    if (key.return && (!multiline || !key.shift)) {
      if (value.trim()) {
        const history = historyRef.current;
        if (history.length === 0 || history[history.length - 1] !== value) {
          historyRef.current = [...history, value];
        }
        historyIndexRef.current = -1;
        onSubmit(value);
      }
      return;
    }
    if (key.return && multiline && key.shift) {
      onChange(value + "\n");
      return;
    }
    if (key.ctrl && input === "c") {
      process.exit(0);
      return;
    }
    if (key.upArrow) {
      navigateHistory("up");
      return;
    }
    if (key.downArrow) {
      navigateHistory("down");
      return;
    }
    if (key.ctrl && input === "k") {
      const before = value.slice(0, cursorPosition);
      const killed = value.slice(cursorPosition);
      killRingRef.current = killed;
      onChange(before);
      setCursorPosition(before.length);
      return;
    }
    if (key.ctrl && input === "y") {
      const killRing = killRingRef.current;
      const newValue = value.slice(0, cursorPosition) + killRing + value.slice(cursorPosition);
      onChange(newValue);
      setCursorPosition(cursorPosition + killRing.length);
      return;
    }
    if (key.backspace || input === "\x7F") {
      if (cursorPosition > 0) {
        const newValue = value.slice(0, cursorPosition - 1) + value.slice(cursorPosition);
        onChange(newValue);
        setCursorPosition(cursorPosition - 1);
      }
      return;
    }
    if (key.delete) {
      if (cursorPosition < value.length) {
        const newValue = value.slice(0, cursorPosition) + value.slice(cursorPosition + 1);
        onChange(newValue);
      }
      return;
    }
    if (key.leftArrow) {
      if (cursorPosition > 0) {
        setCursorPosition(cursorPosition - 1);
      }
      return;
    }
    if (key.rightArrow) {
      if (cursorPosition < value.length) {
        setCursorPosition(cursorPosition + 1);
      }
      return;
    }
    if (key.ctrl && input === "a") {
      setCursorPosition(0);
      return;
    }
    if (key.ctrl && input === "e") {
      setCursorPosition(value.length);
      return;
    }
    if (key.tab) {
      const before = value.slice(0, cursorPosition);
      const lastSpace = before.lastIndexOf(" ");
      const tokenStart = lastSpace === -1 ? 0 : lastSpace + 1;
      const partial = before.slice(tokenStart);
      const completions = [];
      if (onPathComplete && partial.includes("/")) {
        try {
          const pathCompletions = await onPathComplete(partial);
          completions.push(...pathCompletions);
        } catch {
        }
      }
      if (!completions.length && onAutocomplete && partial.length > 0) {
        try {
          const autoCompletions = await onAutocomplete(partial);
          completions.push(...autoCompletions);
        } catch {
        }
      }
      if (completions.length > 0) {
        let replacement;
        if (completions.length === 1) {
          replacement = completions[0];
        } else {
          const common = getCommonPrefix(completions);
          replacement = common.length > partial.length ? common : completions[0];
        }
        const newValue = value.slice(0, tokenStart) + replacement + value.slice(cursorPosition);
        onChange(newValue);
        setCursorPosition(tokenStart + replacement.length);
      } else {
        onTab?.();
      }
      return;
    }
    if (key.ctrl && input === "e" && key.alt) {
      if (onExternalEdit) {
        const edited = await onExternalEdit(value);
        onChange(edited);
        setCursorPosition(edited.length);
      }
      return;
    }
    if (input.length === 1 && !key.ctrl && !key.meta) {
      const newValue = value.slice(0, cursorPosition) + input + value.slice(cursorPosition);
      onChange(newValue);
      setCursorPosition(cursorPosition + 1);
      if (input === "/" && cursorPosition === 0) {
        onSlashCommand?.("/");
      } else if (onSlashCommand && value.slice(0, cursorPosition).startsWith("/")) {
        const newPrefix = newValue.slice(0, cursorPosition + 1);
        if (newPrefix.startsWith("/")) {
          onSlashCommand(newPrefix);
        }
      }
    }
  });
  const renderInputLine = () => {
    const beforeCursor = value.slice(0, cursorPosition);
    const afterCursor = value.slice(cursorPosition);
    const isSlashMode = value.startsWith("/");
    return /* @__PURE__ */ jsxs(Box, { children: [
      /* @__PURE__ */ jsx(Text, { color: "cyan", children: "> " }),
      isSlashMode && /* @__PURE__ */ jsx(Text, { bold: true, color: theme.accent, children: "[CMD] " }),
      /* @__PURE__ */ jsx(Text, { children: beforeCursor }),
      /* @__PURE__ */ jsx(Text, { inverse: true, children: afterCursor.charAt(0) || " " }),
      /* @__PURE__ */ jsx(Text, { children: afterCursor.slice(1) }),
      value.length === 0 && cursorPosition === 0 && /* @__PURE__ */ jsx(Text, { color: theme.dim, children: placeholder })
    ] });
  };
  return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
    renderInputLine(),
    multiline && value.includes("\n") && /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { color: "gray", children: "(Multiline mode: Shift+Enter for new line, Enter to submit)" }) })
  ] });
};
export {
  InputBox
};
