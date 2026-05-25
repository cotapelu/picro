import { jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { InputBox } from "../components/InputBox/InputBox";
import { Modal } from "./Modal";
const InputModal = ({ title, placeholder, onSubmit, onCancel }) => {
  const [value, setValue] = useState("");
  const handleSubmit = () => {
    if (value.trim() !== "") {
      onSubmit(value);
    } else {
      onCancel();
    }
  };
  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.return) {
      handleSubmit();
      return;
    }
  });
  return /* @__PURE__ */ jsx(Modal, { onClose: onCancel, children: /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
    /* @__PURE__ */ jsx(Text, { bold: true, children: title }),
    /* @__PURE__ */ jsx(
      InputBox,
      {
        value,
        onChange: setValue,
        onSubmit: handleSubmit,
        placeholder,
        multiline: false,
        autoFocus: true
      }
    )
  ] }) });
};
export {
  InputModal
};
