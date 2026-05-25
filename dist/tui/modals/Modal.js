import { jsx } from "react/jsx-runtime";
import { Box } from "ink";
const Modal = ({ children, onClose }) => {
  return /* @__PURE__ */ jsx(
    Box,
    {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "black",
      children: /* @__PURE__ */ jsx(Box, { borderStyle: "round", borderColor: "white", padding: 1, children })
    }
  );
};
export {
  Modal
};
