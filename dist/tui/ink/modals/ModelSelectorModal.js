"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelSelectorModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/** @jsxImportSource react */
const react_1 = require("react");
const ink_1 = require("ink");
const useTheme_1 = require("../hooks/useTheme");
const Modal_1 = require("./Modal");
const ModelSelectorModal = ({ runtime, onClose, onSelect }) => {
    const { theme } = (0, useTheme_1.useTheme)();
    const [models, setModels] = (0, react_1.useState)([]);
    const [selectedIndex, setSelectedIndex] = (0, react_1.useState)(0);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [search, setSearch] = (0, react_1.useState)('');
    const loadModels = (0, react_1.useCallback)(async () => {
        try {
            // Access modelRegistry via runtime.services.modelRegistry
            const extRuntime = runtime;
            const modelRegistry = extRuntime.services?.modelRegistry;
            if (modelRegistry) {
                // Refresh to get latest
                await modelRegistry.refresh?.();
                const available = await modelRegistry.getAvailable?.();
                if (Array.isArray(available)) {
                    const modelInfos = available.map((m) => ({
                        id: m.id,
                        provider: m.provider,
                        name: m.name,
                        reasoning: m.reasoning,
                    }));
                    // Sort by provider then id
                    modelInfos.sort((a, b) => a.provider.localeCompare(b.provider) || a.id.localeCompare(b.id));
                    setModels(modelInfos);
                    return;
                }
            }
        }
        catch (err) {
            console.error('Failed to load models:', err);
        }
        setModels([]);
    }, [runtime]);
    (0, react_1.useEffect)(() => {
        let mounted = true;
        const fetch = async () => {
            setLoading(true);
            await loadModels();
            if (mounted)
                setLoading(false);
        };
        fetch();
        return () => { mounted = false; };
    }, [loadModels]);
    // Filter by search
    const filteredModels = models.filter(m => `${m.provider}/${m.id}`.toLowerCase().includes(search.toLowerCase()) ||
        (m.name && m.name.toLowerCase().includes(search.toLowerCase())));
    const [error, setError] = (0, react_1.useState)(null);
    const handleKey = async (input, key) => {
        if (key.escape) {
            onClose();
            return;
        }
        if (key.return) {
            const selected = filteredModels[selectedIndex];
            if (!selected)
                return;
            try {
                setError(null);
                // Call runtime.session.setModel with the selected model
                const extRuntime = runtime;
                await extRuntime.session?.setModel?.(selected);
                // Notify parent of model change
                onSelect?.();
                onClose();
            }
            catch (err) {
                setError(err?.message || 'Failed to set model');
            }
            return;
        }
        if (key.upArrow) {
            setSelectedIndex(prev => Math.max(0, prev - 1));
            return;
        }
        if (key.downArrow) {
            setSelectedIndex(prev => Math.min(filteredModels.length - 1, prev + 1));
            return;
        }
        // Basic type-to-search: accumulate characters (ink's useInput gives each char)
        if (input && input.length === 1 && !key.ctrl && !key.meta) {
            setSearch(prev => prev + input);
            setSelectedIndex(0);
        }
        if (key.backspace) {
            setSearch(prev => prev.slice(0, -1));
            setSelectedIndex(0);
        }
    };
    (0, ink_1.useInput)(handleKey);
    if (loading) {
        return ((0, jsx_runtime_1.jsx)(Modal_1.Modal, { onClose: onClose, children: (0, jsx_runtime_1.jsx)(ink_1.Box, { children: (0, jsx_runtime_1.jsx)(ink_1.Text, { color: "yellow", children: "Loading models..." }) }) }));
    }
    return ((0, jsx_runtime_1.jsx)(Modal_1.Modal, { onClose: onClose, children: (0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", borderStyle: "round", borderColor: theme.accent, padding: 1, width: 80, children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { bold: true, color: theme.accent, children: "Select Model" }), search && ((0, jsx_runtime_1.jsxs)(ink_1.Text, { dim: true, children: ["Filter: ", search] })), error && ((0, jsx_runtime_1.jsx)(ink_1.Text, { color: "red", dim: true, children: error })), (0, jsx_runtime_1.jsx)(ink_1.Box, { flexDirection: "column", marginTop: 1, children: filteredModels.length === 0 ? ((0, jsx_runtime_1.jsxs)(ink_1.Text, { color: "dim", children: ["No models match \"", search, "\""] })) : (filteredModels.map((model, idx) => ((0, jsx_runtime_1.jsxs)(ink_1.Box, { children: [(0, jsx_runtime_1.jsxs)(ink_1.Text, { color: idx === selectedIndex ? (theme.selectedForeground || 'white') : theme.foreground, children: [idx === selectedIndex ? '> ' : '  ', model.name || model.id] }), (0, jsx_runtime_1.jsxs)(ink_1.Text, { dim: true, children: [" (", model.provider, ")", model.reasoning && ' [thinking]'] })] }, `${model.provider}/${model.id}`)))) }), (0, jsx_runtime_1.jsx)(ink_1.Box, { marginTop: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { dim: true, children: "\u2191\u2193 to navigate, Enter to select, type to filter, Esc to cancel" }) })] }) }));
};
exports.ModelSelectorModal = ModelSelectorModal;
//# sourceMappingURL=ModelSelectorModal.js.map