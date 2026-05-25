import { jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { useTheme } from "../hooks/useTheme";
import { Modal } from "./Modal";
const SessionInfoModal = ({ runtime, onClose }) => {
  const { theme } = useTheme();
  const [info, setInfo] = useState(null);
  useEffect(() => {
    const sessionManager = runtime.session;
    const session = sessionManager?.getSession?.() || runtime.session;
    const infoData = {
      id: session.id,
      name: session.name,
      messageCount: session.messages?.length || 0,
      cwd: runtime.cwd,
      model: session?.model?.id || "unknown"
    };
    setInfo(infoData);
  }, [runtime]);
  const handleKey = (input, key) => {
    if (key.escape) {
      onClose();
    }
  };
  useInput(handleKey);
  if (!info) {
    return /* @__PURE__ */ jsx(Modal, { onClose, children: /* @__PURE__ */ jsx(Box, { children: /* @__PURE__ */ jsx(Text, { color: "yellow", children: "Loading session info..." }) }) });
  }
  return /* @__PURE__ */ jsx(Modal, { onClose, children: /* @__PURE__ */ jsxs(Box, { flexDirection: "column", borderStyle: "round", borderColor: "cyan", padding: 1, children: [
    /* @__PURE__ */ jsx(Text, { bold: true, color: "cyan", children: "Session Info" }),
    /* @__PURE__ */ jsxs(Box, { flexDirection: "column", marginTop: 1, children: [
      /* @__PURE__ */ jsxs(Text, { children: [
        "ID: ",
        info.id
      ] }),
      /* @__PURE__ */ jsxs(Text, { children: [
        "Name: ",
        info.name || "(unnamed)"
      ] }),
      /* @__PURE__ */ jsxs(Text, { children: [
        "Messages: ",
        info.messageCount
      ] }),
      /* @__PURE__ */ jsxs(Text, { children: [
        "CWD: ",
        info.cwd
      ] }),
      /* @__PURE__ */ jsxs(Text, { children: [
        "Model: ",
        info.model
      ] })
    ] }),
    /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { dim: true, children: "Press Esc to close" }) })
  ] }) });
};
export {
  SessionInfoModal
};
