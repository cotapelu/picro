import { jsx } from "react/jsx-runtime";
import { Box, Text } from "ink";
const UserMessage = ({ text }) => {
  const lines = text.split("\n");
  return /* @__PURE__ */ jsx(Box, { flexDirection: "column", paddingX: 1, children: lines.map((line, i) => /* @__PURE__ */ jsx(Text, { children: line }, i)) });
};
export {
  UserMessage
};
