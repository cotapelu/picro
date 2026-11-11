// ModelSelector - port ý tưởng từ pi-mono model-selector.ts
// Chọn model với search, scoped models
import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import type { AgentSessionRuntimeInterface } from "../../../runtime/index.js";

interface ModelSelectorProps {
  runtime: AgentSessionRuntimeInterface;
  onSelect: (modelId: string) => void;
  onCancel: () => void;
}

interface ModelInfo {
  id: string;
  provider: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ runtime, onSelect, onCancel }) => {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [search, setSearch] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const modelRegistry = runtime.services?.modelRegistry || {};
    const providers = modelRegistry.getProviders?.() || [];
    const allModels: ModelInfo[] = [];
    for (const p of providers) {
      const pm = modelRegistry.getModels?.(p) || [];
      for (const m of pm) {
        allModels.push({ id: m.id, provider: p });
      }
    }
    setModels(allModels);
  }, [runtime]);

  useInput((inputString, key) => {
    if (key.ctrl && inputString === "\u0003") {
      onCancel();
      return;
    }
    if (key.return) {
      const selected = models[currentIndex];
      if (selected) {
        onSelect(selected.id);
      }
      return;
    }
    if (key.backspace) {
      setSearch(search.slice(0, -1));
      return;
    }
    if (key.upArrow) {
      setCurrentIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (key.downArrow) {
      setCurrentIndex((i) => Math.min(models.length - 1, i + 1));
      return;
    }
    if (inputString && inputString.length === 1 && inputString.charCodeAt(0) >= 32) {
      setSearch((s) => s + inputString);
    }
  });

  const filtered = models.filter((m) => m.id.toLowerCase().includes(search.toLowerCase()));

  return (
    <Box borderStyle="round" borderColor="cyan" padding={1}>
      <Text bold>Model Selector</Text>
      <Text>Search: {search}</Text>
      <Box flexDirection="column">
        {filtered.map((m, i) => (
          <Box key={m.id} flexDirection="row" justifyContent="space-between">
            <Text color={i === currentIndex ? "cyan" : "white"}>{m.id}</Text>
            <Text dimColor>[{m.provider}]</Text>
          </Box>
        ))}
        {filtered.length === 0 && <Text>No models found</Text>}
      </Box>
      <Text dimColor>↑/↓: select, Enter: confirm, Ctrl+C: cancel</Text>
    </Box>
  );
}
