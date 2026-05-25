import { jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { useTheme } from "../hooks/useTheme";
import { Modal } from "./Modal";
const SettingsSelectorModal = ({ runtime, onClose }) => {
  const { isDark } = useTheme();
  const [settings, setSettings] = useState([]);
  const [values, setValues] = useState({});
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    const sm = runtime.settings;
    if (!sm) return;
    const defs = [];
    const add = (label, getter, setter, type, extra) => {
      if (getter && setter) {
        defs.push({ label, type, get: getter, set: setter, ...extra });
      }
    };
    add("Theme", () => sm.getTheme?.() ?? (isDark ? "dark" : "light"), (v) => sm.setTheme?.(v), "select", {
      options: [
        { label: "Dark", value: "dark" },
        { label: "Light", value: "light" }
      ]
    });
    add("Default Thinking", () => sm.getDefaultThinkingLevel?.() ?? "medium", (v) => sm.setDefaultThinkingLevel?.(v), "select", {
      options: [
        { label: "Off", value: "off" },
        { label: "Minimal", value: "minimal" },
        { label: "Low", value: "low" },
        { label: "Medium", value: "medium" },
        { label: "High", value: "high" },
        { label: "X-High", value: "xhigh" }
      ]
    });
    add("Transport", () => sm.getTransport?.() ?? "sse", (v) => sm.setTransport?.(v), "select", {
      options: [
        { label: "SSE", value: "sse" },
        { label: "WebSocket", value: "websocket" },
        { label: "Polling", value: "polling" }
      ]
    });
    add("Auto Compaction", () => sm.getCompactionEnabled?.() ?? true, (v) => sm.setCompactionEnabled?.(v), "toggle");
    add("Hide Thinking Blocks", () => sm.getHideThinkingBlock?.() ?? false, (v) => sm.setHideThinkingBlock?.(v), "toggle");
    add("Show Images", () => sm.getShowImages?.() ?? true, (v) => sm.setShowImages?.(v), "toggle");
    add("Image Width (cells)", () => sm.getImageWidthCells?.() ?? 60, (v) => sm.setImageWidthCells?.(v), "number", { min: 10, max: 200, step: 5 });
    setSettings(defs);
    const initVals = {};
    for (const def of defs) {
      initVals[def.label] = def.get();
    }
    setValues(initVals);
  }, [runtime, isDark]);
  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      for (const def of settings) {
        def.set(values[def.label]);
      }
      await runtime.settings?.save?.();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }, [runtime, settings, values, onClose]);
  const handleToggle = useCallback((label) => {
    setValues((prev) => ({ ...prev, [label]: !prev[label] }));
  }, []);
  const handleNumberChange = useCallback((label, delta) => {
    setValues((prev) => {
      const def = settings.find((s) => s.label === label);
      if (!def || def.type !== "number") return prev;
      const newVal = Math.max(def.min ?? 0, Math.min(def.max ?? Infinity, prev[label] + delta));
      return { ...prev, [label]: newVal };
    });
  }, [settings]);
  const handleSelect = useCallback((label, value) => {
    setValues((prev) => ({ ...prev, [label]: value }));
  }, []);
  useInput((input, key) => {
    if (saving) return;
    if (key.escape) {
      onClose();
      return;
    }
    if (key.return) {
      handleSave();
      return;
    }
    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((i) => Math.min(settings.length - 1, i + 1));
      return;
    }
    if (selectedIndex >= settings.length) return;
    const def = settings[selectedIndex];
    if (!def) return;
    if (def.type === "toggle" && (input === " " || key.return)) {
      handleToggle(def.label);
      return;
    }
    if (def.type === "number") {
      if (key.leftArrow || key.backspace) {
        handleNumberChange(def.label, -(def.step || 1));
        return;
      }
      if (key.rightArrow) {
        handleNumberChange(def.label, def.step || 1);
        return;
      }
    }
    if (def.type === "select") {
      if (key.leftArrow) {
        const idx = def.options?.findIndex((o) => o.value === values[def.label]) ?? -1;
        if (idx > 0) {
          handleSelect(def.label, def.options[idx - 1].value);
        } else if (def.options && def.options.length > 0) {
          handleSelect(def.label, def.options[def.options.length - 1].value);
        }
        return;
      }
      if (key.rightArrow) {
        const idx = def.options?.findIndex((o) => o.value === values[def.label]) ?? -1;
        if (idx < (def.options?.length ?? 0) - 1) {
          handleSelect(def.label, def.options[idx + 1].value);
        } else if (def.options && def.options.length > 0) {
          handleSelect(def.label, def.options[0].value);
        }
        return;
      }
    }
  });
  const renderValue = (def, value) => {
    switch (def.type) {
      case "toggle":
        return value ? "On" : "Off";
      case "number":
        return `${value}`;
      case "select":
        const opt = def.options?.find((o) => o.value === value);
        return opt?.label || String(value);
      default:
        return String(value);
    }
  };
  if (saving) {
    return /* @__PURE__ */ jsx(Modal, { onClose, children: /* @__PURE__ */ jsx(Box, { borderStyle: "round", borderColor: "yellow", padding: 1, children: /* @__PURE__ */ jsx(Text, { color: "yellow", children: "Saving..." }) }) });
  }
  return /* @__PURE__ */ jsx(Modal, { onClose, children: /* @__PURE__ */ jsxs(Box, { flexDirection: "column", borderStyle: "round", borderColor: "cyan", padding: 1, width: 60, children: [
    /* @__PURE__ */ jsx(Text, { bold: true, color: "cyan", children: "Settings" }),
    error && /* @__PURE__ */ jsxs(Text, { color: "red", children: [
      "Error: ",
      error
    ] }),
    /* @__PURE__ */ jsx(Box, { flexDirection: "column", marginTop: 1, children: settings.map((def, idx) => {
      const isSel = idx === selectedIndex;
      const val = values[def.label];
      return /* @__PURE__ */ jsxs(Box, { children: [
        /* @__PURE__ */ jsxs(Text, { color: isSel ? "cyan" : "white", bold: isSel, children: [
          isSel ? "\u25B6 " : "  ",
          def.label
        ] }),
        def.type !== "toggle" && /* @__PURE__ */ jsx(Text, { children: ": " }),
        def.type === "toggle" && /* @__PURE__ */ jsx(Text, { children: " [" }),
        /* @__PURE__ */ jsx(Text, { color: isSel ? "yellow" : "green", children: renderValue(def, val) }),
        def.type === "toggle" && /* @__PURE__ */ jsx(Text, { children: "]" }),
        def.type === "number" && isSel && /* @__PURE__ */ jsx(Text, { dim: true, children: " (\u2190\u2192)" }),
        def.type === "toggle" && isSel && /* @__PURE__ */ jsx(Text, { dim: true, children: " (Space)" }),
        def.type === "select" && isSel && /* @__PURE__ */ jsx(Text, { dim: true, children: " (\u2190\u2192)" })
      ] }, def.label);
    }) }),
    /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { dim: true, children: "\u2191\u2193 select, Enter save, Esc cancel" }) })
  ] }) });
};
export {
  SettingsSelectorModal
};
