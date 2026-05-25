"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalEditorModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/** @jsxImportSource react */
const react_1 = require("react");
const ink_1 = require("ink");
const node_child_process_1 = require("node:child_process");
const node_crypto_1 = require("node:crypto");
const node_path_1 = require("node:path");
const node_os_1 = require("node:os");
const promises_1 = require("node:fs/promises");
const ExternalEditorModal = ({ initialValue, onSave, onClose, }) => {
    const [status, setStatus] = (0, react_1.useState)('preparing');
    const [errorMsg, setErrorMsg] = (0, react_1.useState)('');
    const filePathRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        let isMounted = true;
        const cleanup = async () => {
            if (filePathRef.current) {
                try {
                    await (0, promises_1.unlink)(filePathRef.current);
                }
                catch {
                    // ignore
                }
                filePathRef.current = null;
            }
        };
        const launchEditor = async () => {
            try {
                // Create temp file in system tmpdir
                const path = (0, node_path_1.join)((0, node_os_1.tmpdir)(), `picro-${(0, node_crypto_1.randomUUID)()}.txt`);
                filePathRef.current = path;
                await (0, promises_1.writeFile)(path, initialValue, 'utf-8');
                if (!isMounted) {
                    await (0, promises_1.unlink)(path);
                    return;
                }
                setStatus('waiting');
                const editor = process.env.EDITOR || process.env.VISUAL || 'vi';
                const parts = editor.split(' ');
                const cmd = parts[0];
                const args = [...parts.slice(1), path];
                const child = (0, node_child_process_1.spawn)(cmd, args, { stdio: 'inherit', shell: true });
                child.on('error', (err) => {
                    if (isMounted) {
                        setStatus('error');
                        setErrorMsg(`Failed to launch editor: ${err.message}`);
                    }
                });
                child.on('exit', async (code) => {
                    if (!isMounted) {
                        await (0, promises_1.unlink)(path);
                        return;
                    }
                    if (code === 0) {
                        try {
                            const content = await (0, promises_1.readFile)(path, 'utf-8');
                            setStatus('saving');
                            await onSave(content);
                            await cleanup();
                            onClose();
                        }
                        catch (err) {
                            setStatus('error');
                            setErrorMsg(`Failed to read edited file: ${err.message}`);
                        }
                    }
                    else {
                        setStatus('error');
                        setErrorMsg(`Editor exited with code ${code}`);
                    }
                    await cleanup();
                });
            }
            catch (err) {
                if (isMounted) {
                    setStatus('error');
                    setErrorMsg(err.message);
                }
                await cleanup();
            }
        };
        launchEditor();
        return () => {
            isMounted = false;
            cleanup();
        };
    }, [initialValue, onSave, onClose]);
    const handleForceClose = () => {
        onClose();
    };
    return ((0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", borderStyle: "round", borderColor: "yellow", padding: 1, children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { color: "yellow", bold: true, children: "External Editor" }), (0, jsx_runtime_1.jsx)(ink_1.Box, { marginTop: 1, children: (0, jsx_runtime_1.jsxs)(ink_1.Text, { children: ["Status: ", (0, jsx_runtime_1.jsx)(ink_1.Text, { color: status === 'error' ? 'red' : 'green', children: status })] }) }), status === 'error' && ((0, jsx_runtime_1.jsx)(ink_1.Box, { marginTop: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { color: "red", children: errorMsg }) })), status === 'waiting' && ((0, jsx_runtime_1.jsx)(ink_1.Box, { marginTop: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { children: "Launching $EDITOR... (press Ctrl+C to abort)" }) })), status === 'preparing' && ((0, jsx_runtime_1.jsx)(ink_1.Box, { marginTop: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { children: "Preparing temporary file..." }) })), status === 'saving' && ((0, jsx_runtime_1.jsx)(ink_1.Box, { marginTop: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { children: "Saving changes..." }) })), (0, jsx_runtime_1.jsx)(ink_1.Box, { marginTop: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { dim: true, children: "Press Esc to cancel" }) })] }));
};
exports.ExternalEditorModal = ExternalEditorModal;
//# sourceMappingURL=ExternalEditorModal.js.map