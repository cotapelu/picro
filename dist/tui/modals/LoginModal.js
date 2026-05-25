import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
const LoginModal = ({ onLogin, onClose }) => {
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const handleLogin = useCallback(async () => {
    if (!apiKey.trim()) {
      setStatus("error");
      setErrorMsg("API key cannot be empty");
      return;
    }
    setStatus("loading");
    try {
      await onLogin(apiKey.trim());
      onClose();
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "Failed to login");
    }
  }, [apiKey, onLogin, onClose]);
  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }
    if (key.return) {
      handleLogin();
      return;
    }
    if (key.backspace || input === "\x7F") {
      setApiKey((prev) => prev.slice(0, -1));
      return;
    }
    if (input.length === 1 && !key.ctrl && !key.meta) {
      setApiKey((prev) => prev + input);
    }
  });
  return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", borderStyle: "round", borderColor: "green", padding: 1, children: [
    /* @__PURE__ */ jsx(Text, { color: "green", bold: true, children: "Enter API Key" }),
    /* @__PURE__ */ jsxs(Box, { marginTop: 1, children: [
      /* @__PURE__ */ jsx(Text, { color: "gray", children: "API Key: " }),
      /* @__PURE__ */ jsxs(Text, { color: "cyan", children: [
        apiKey,
        /* @__PURE__ */ jsx(Text, { inverse: true, children: "_" })
      ] })
    ] }),
    status === "error" && /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { color: "red", children: errorMsg }) }),
    /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { children: "Press Enter to submit, Esc to cancel" }) })
  ] });
};
export {
  LoginModal
};
