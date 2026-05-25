"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionSelectorModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/** @jsxImportSource react */
const react_1 = require("react");
const ink_1 = require("ink");
const SessionSelectorModal = ({ runtime, onClose }) => {
    const [sessions, setSessions] = (0, react_1.useState)([]);
    const [selectedIndex, setSelectedIndex] = (0, react_1.useState)(0);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        (async () => {
            try {
                const list = await runtime.listSessions();
                // Sort by modified descending (most recent first)
                const sorted = list.sort((a, b) => {
                    const dateA = a.modified?.getTime() || 0;
                    const dateB = b.modified?.getTime() || 0;
                    return dateB - dateA;
                });
                setSessions(sorted);
            }
            catch (err) {
                setError(err.message || 'Failed to load sessions');
            }
            finally {
                setLoading(false);
            }
        })();
    }, [runtime]);
    (0, ink_1.useInput)((input, key) => {
        if (key.escape) {
            onClose();
            return;
        }
        if (key.return) {
            if (sessions[selectedIndex]) {
                const session = sessions[selectedIndex];
                runtime.switchSession(session.path).then((result) => {
                    if (!result.cancelled) {
                        onClose();
                    }
                }).catch((err) => {
                    console.error('Failed to switch session:', err);
                });
            }
            return;
        }
        if (key.upArrow) {
            setSelectedIndex(prev => Math.max(0, prev - 1));
            return;
        }
        if (key.downArrow) {
            setSelectedIndex(prev => Math.min(sessions.length - 1, prev + 1));
            return;
        }
    });
    if (loading) {
        return ((0, jsx_runtime_1.jsx)(ink_1.Box, { flexDirection: "column", borderStyle: "round", borderColor: "cyan", padding: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { color: "cyan", children: "Loading sessions..." }) }));
    }
    if (error) {
        return ((0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", borderStyle: "round", borderColor: "red", padding: 1, children: [(0, jsx_runtime_1.jsxs)(ink_1.Text, { color: "red", children: ["Error: ", error] }), (0, jsx_runtime_1.jsx)(ink_1.Text, { dim: true, children: "Press Esc to close" })] }));
    }
    if (sessions.length === 0) {
        return ((0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", borderStyle: "round", borderColor: "yellow", padding: 1, children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { color: "yellow", children: "No sessions found." }), (0, jsx_runtime_1.jsx)(ink_1.Text, { dim: true, children: "Press Esc to close" })] }));
    }
    const formatDate = (d) => d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return ((0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", borderStyle: "round", borderColor: "cyan", padding: 1, children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { color: "cyan", bold: true, children: "Select Session to Resume" }), (0, jsx_runtime_1.jsx)(ink_1.Box, { flexDirection: "column", marginTop: 1, children: sessions.map((session, idx) => {
                    const displayName = session.name || session.firstMessage?.substring(0, 50) || session.id.slice(0, 8);
                    const dateStr = session.modified ? formatDate(session.modified) : '';
                    const line = idx === selectedIndex ? `> ${displayName}` : `  ${displayName}`;
                    return ((0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { color: idx === selectedIndex ? 'white' : 'gray', backgroundColor: idx === selectedIndex ? 'blue' : undefined, children: line }), dateStr && ((0, jsx_runtime_1.jsxs)(ink_1.Text, { dim: true, color: idx === selectedIndex ? 'white' : 'gray', children: [dateStr, " - ", session.cwd] }))] }, session.path));
                }) }), (0, jsx_runtime_1.jsx)(ink_1.Box, { marginTop: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { dim: true, children: "\u2191\u2193 to navigate, Enter to select, Esc to cancel" }) })] }));
};
exports.SessionSelectorModal = SessionSelectorModal;
//# sourceMappingURL=SessionSelectorModal.js.map