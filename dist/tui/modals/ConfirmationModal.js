import { jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
const ConfirmationModal = ({
  title,
  message,
  onConfirm,
  onCancel
}) => {
  const [confirmed, setConfirmed] = useState(null);
  useEffect(() => {
    setConfirmed(false);
  }, []);
  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.return) {
      if (confirmed) {
        onConfirm();
      } else {
        onCancel();
      }
      return;
    }
    if (key.leftArrow || key.rightArrow) {
      setConfirmed((prev) => !prev);
      return;
    }
  });
  return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", borderStyle: "round", borderColor: "yellow", padding: 1, children: [
    /* @__PURE__ */ jsx(Text, { bold: true, color: "yellow", children: title }),
    /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { children: message }) }),
    /* @__PURE__ */ jsxs(Box, { marginTop: 1, gap: 2, children: [
      /* @__PURE__ */ jsx(Text, { color: confirmed ? "green" : "white", children: "[Yes]" }),
      /* @__PURE__ */ jsx(Text, { color: !confirmed ? "green" : "white", children: "[No]" }),
      /* @__PURE__ */ jsx(Text, { dim: true, children: "\u2190 \u2192 to navigate, Enter to confirm, Esc to cancel" })
    ] })
  ] });
};
export {
  ConfirmationModal
};
