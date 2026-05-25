import { jsx, jsxs } from "react/jsx-runtime";
import React, { forwardRef, useImperativeHandle, useState } from "react";
import { Box, Text } from "ink";
import { MessageItem } from "../MessageItem/MessageItem";
const MessageList = forwardRef(
  ({ messages, theme, hideThinkingBlock = false }, ref) => {
    const [autoScroll, setAutoScroll] = useState(true);
    useImperativeHandle(ref, () => ({
      scrollToBottom: () => {
        setAutoScroll(true);
      }
    }));
    const renderSeparator = (index) => {
      if (index === 0) return null;
      return /* @__PURE__ */ jsx(Box, { marginBottom: 1, children: /* @__PURE__ */ jsx(Text, { color: "gray", children: "\u2500" }) });
    };
    const [expandedTools, setExpandedTools] = useState(/* @__PURE__ */ new Set());
    const toggleTool = (toolId) => {
      setExpandedTools((prev) => {
        const next = new Set(prev);
        if (next.has(toolId)) {
          next.delete(toolId);
        } else {
          next.add(toolId);
        }
        return next;
      });
    };
    return /* @__PURE__ */ jsx(
      Box,
      {
        flexDirection: "column",
        overflow: "hidden",
        width: "100%",
        height: "100%",
        borderStyle: "round",
        borderBottom: true,
        borderTop: false,
        children: messages.length === 0 ? /* @__PURE__ */ jsx(Box, { justifyContent: "center", alignItems: "center", flexGrow: 1, children: /* @__PURE__ */ jsx(Text, { color: "gray", children: "No messages yet. Start typing..." }) }) : /* @__PURE__ */ jsx(Box, { flexDirection: "column", width: "100%", children: messages.map((msg, index) => /* @__PURE__ */ jsxs(React.Fragment, { children: [
          renderSeparator(index),
          /* @__PURE__ */ jsx(
            MessageItem,
            {
              message: msg,
              onToolToggle: toggleTool,
              expandedTools,
              hideThinkingBlock
            }
          )
        ] }, `${msg.id || index}-${msg.timestamp || Date.now()}`)) })
      }
    );
  }
);
MessageList.displayName = "MessageList";
export {
  MessageList
};
