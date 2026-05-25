import { jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { useTheme } from "../hooks/useTheme";
import { Modal } from "./Modal";
const ModelSelectorModal = ({ runtime, onClose, onSelect }) => {
  const { theme } = useTheme();
  const [models, setModels] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const loadModels = useCallback(async () => {
    try {
      const extRuntime = runtime;
      const modelRegistry = extRuntime.services?.modelRegistry;
      if (modelRegistry) {
        await modelRegistry.refresh?.();
        const available = await modelRegistry.getAvailable?.();
        if (Array.isArray(available)) {
          const modelInfos = available.map((m) => ({
            id: m.id,
            provider: m.provider,
            name: m.name,
            reasoning: m.reasoning
          }));
          modelInfos.sort((a, b) => a.provider.localeCompare(b.provider) || a.id.localeCompare(b.id));
          setModels(modelInfos);
          return;
        }
      }
    } catch (err) {
      console.error("Failed to load models:", err);
    }
    setModels([]);
  }, [runtime]);
  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      setLoading(true);
      await loadModels();
      if (mounted) setLoading(false);
    };
    fetch();
    return () => {
      mounted = false;
    };
  }, [loadModels]);
  const filteredModels = models.filter(
    (m) => `${m.provider}/${m.id}`.toLowerCase().includes(search.toLowerCase()) || m.name && m.name.toLowerCase().includes(search.toLowerCase())
  );
  const [error, setError] = useState(null);
  const handleKey = async (input, key) => {
    if (key.escape) {
      onClose();
      return;
    }
    if (key.return) {
      const selected = filteredModels[selectedIndex];
      if (!selected) return;
      try {
        setError(null);
        const extRuntime = runtime;
        await extRuntime.session?.setModel?.(selected);
        onSelect?.();
        onClose();
      } catch (err) {
        setError(err?.message || "Failed to set model");
      }
      return;
    }
    if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(filteredModels.length - 1, prev + 1));
      return;
    }
    if (input && input.length === 1 && !key.ctrl && !key.meta) {
      setSearch((prev) => prev + input);
      setSelectedIndex(0);
    }
    if (key.backspace) {
      setSearch((prev) => prev.slice(0, -1));
      setSelectedIndex(0);
    }
  };
  useInput(handleKey);
  if (loading) {
    return /* @__PURE__ */ jsx(Modal, { onClose, children: /* @__PURE__ */ jsx(Box, { children: /* @__PURE__ */ jsx(Text, { color: "yellow", children: "Loading models..." }) }) });
  }
  return /* @__PURE__ */ jsx(Modal, { onClose, children: /* @__PURE__ */ jsxs(Box, { flexDirection: "column", borderStyle: "round", borderColor: theme.accent, padding: 1, width: 80, children: [
    /* @__PURE__ */ jsx(Text, { bold: true, color: theme.accent, children: "Select Model" }),
    search && /* @__PURE__ */ jsxs(Text, { dim: true, children: [
      "Filter: ",
      search
    ] }),
    error && /* @__PURE__ */ jsx(Text, { color: "red", dim: true, children: error }),
    /* @__PURE__ */ jsx(Box, { flexDirection: "column", marginTop: 1, children: filteredModels.length === 0 ? /* @__PURE__ */ jsxs(Text, { color: "dim", children: [
      'No models match "',
      search,
      '"'
    ] }) : filteredModels.map((model, idx) => /* @__PURE__ */ jsxs(Box, { children: [
      /* @__PURE__ */ jsxs(Text, { color: idx === selectedIndex ? theme.selectedForeground || "white" : theme.foreground, children: [
        idx === selectedIndex ? "> " : "  ",
        model.name || model.id
      ] }),
      /* @__PURE__ */ jsxs(Text, { dim: true, children: [
        " (",
        model.provider,
        ")",
        model.reasoning && " [thinking]"
      ] })
    ] }, `${model.provider}/${model.id}`)) }),
    /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { dim: true, children: "\u2191\u2193 to navigate, Enter to select, type to filter, Esc to cancel" }) })
  ] }) });
};
export {
  ModelSelectorModal
};
