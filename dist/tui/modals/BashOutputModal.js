import { jsx, jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { useTheme } from "../hooks/useTheme";
import { Modal } from "./Modal";
const BashOutputModal = ({ command, output, error = false, onClose }) => {
  const { theme } = useTheme();
  useEffect(() => {
  }, []);
  const handleKey = (input, key) => {
    if (key.escape || key.return || key.ctrl) {
      onClose();
    }
  };
  useInput(handleKey);
  return /* @__PURE__ */ jsx(Modal, { onClose, children: /* @__PURE__ */ jsxs(Box, { flexDirection: "column", borderStyle: "round", borderColor: error ? "red" : "green", padding: 1, width: 100, children: [
    /* @__PURE__ */ jsxs(Text, { bold: true, color: error ? "red" : "green", children: [
      "Bash: ",
      command
    ] }),
    /* @__PURE__ */ jsx(Box, { flexDirection: "column", marginTop: 1, children: output.split("\n").map((line, i) => /* @__PURE__ */ jsx(Text, { color: error ? "red" : "gray", children: line || "\xA0" }, i)) }),
    /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { dim: true, children: "Press any key to close" }) })
  ] }) });
};
export {
  BashOutputModal
};
