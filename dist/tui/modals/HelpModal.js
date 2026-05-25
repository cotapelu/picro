import { jsx, jsxs } from "react/jsx-runtime";
import { Box, Text } from "ink";
import { BUILTIN_SLASH_COMMANDS } from "../../../runtime/slash-commands";
const HelpModal = ({ onClose }) => {
  return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", borderStyle: "round", borderColor: "cyan", padding: 1, children: [
    /* @__PURE__ */ jsx(Text, { bold: true, color: "cyan", children: "Slash Commands" }),
    /* @__PURE__ */ jsx(Box, { flexDirection: "column", marginTop: 1, children: BUILTIN_SLASH_COMMANDS.map((cmd) => /* @__PURE__ */ jsxs(Text, { children: [
      "/",
      cmd.name,
      " - ",
      cmd.description
    ] }, cmd.name)) }),
    /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { dim: true, children: "Press Esc to close" }) })
  ] });
};
export {
  HelpModal
};
