import { jsx } from "react/jsx-runtime";
import { Box, Text } from "ink";
import { useTheme } from "../hooks/useTheme";
const Armin = ({ size = 1 }) => {
  const { theme } = useTheme();
  const logo = [
    "   _    ",
    "  /|\\   ",
    " / | \\  ",
    "/__|__\\ ",
    "   |    ",
    "   |    "
  ];
  return /* @__PURE__ */ jsx(Box, { flexDirection: "column", children: logo.map((line, i) => /* @__PURE__ */ jsx(Text, { color: theme.accent, children: line }, i)) });
};
export {
  Armin
};
