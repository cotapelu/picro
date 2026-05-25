import { jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
const SessionSelectorModal = ({ runtime, onClose }) => {
  const [sessions, setSessions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const list = await runtime.listSessions();
        const sorted = list.sort((a, b) => {
          const dateA = a.modified?.getTime() || 0;
          const dateB = b.modified?.getTime() || 0;
          return dateB - dateA;
        });
        setSessions(sorted);
      } catch (err) {
        setError(err.message || "Failed to load sessions");
      } finally {
        setLoading(false);
      }
    })();
  }, [runtime]);
  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }
    if (key.return) {
      if (sessions[selectedIndex]) {
        const session = sessions[selectedIndex];
        runtime.switchSession(session.path).then((result) => {
          if (!result.cancelled) {
            onClose();
          }
        }).catch((err) => {
          console.error("Failed to switch session:", err);
        });
      }
      return;
    }
    if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(sessions.length - 1, prev + 1));
      return;
    }
  });
  if (loading) {
    return /* @__PURE__ */ jsx(Box, { flexDirection: "column", borderStyle: "round", borderColor: "cyan", padding: 1, children: /* @__PURE__ */ jsx(Text, { color: "cyan", children: "Loading sessions..." }) });
  }
  if (error) {
    return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", borderStyle: "round", borderColor: "red", padding: 1, children: [
      /* @__PURE__ */ jsxs(Text, { color: "red", children: [
        "Error: ",
        error
      ] }),
      /* @__PURE__ */ jsx(Text, { dim: true, children: "Press Esc to close" })
    ] });
  }
  if (sessions.length === 0) {
    return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", borderStyle: "round", borderColor: "yellow", padding: 1, children: [
      /* @__PURE__ */ jsx(Text, { color: "yellow", children: "No sessions found." }),
      /* @__PURE__ */ jsx(Text, { dim: true, children: "Press Esc to close" })
    ] });
  }
  const formatDate = (d) => d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", borderStyle: "round", borderColor: "cyan", padding: 1, children: [
    /* @__PURE__ */ jsx(Text, { color: "cyan", bold: true, children: "Select Session to Resume" }),
    /* @__PURE__ */ jsx(Box, { flexDirection: "column", marginTop: 1, children: sessions.map((session, idx) => {
      const displayName = session.name || session.firstMessage?.substring(0, 50) || session.id.slice(0, 8);
      const dateStr = session.modified ? formatDate(session.modified) : "";
      const line = idx === selectedIndex ? `> ${displayName}` : `  ${displayName}`;
      return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
        /* @__PURE__ */ jsx(
          Text,
          {
            color: idx === selectedIndex ? "white" : "gray",
            backgroundColor: idx === selectedIndex ? "blue" : void 0,
            children: line
          }
        ),
        dateStr && /* @__PURE__ */ jsxs(Text, { dim: true, color: idx === selectedIndex ? "white" : "gray", children: [
          dateStr,
          " - ",
          session.cwd
        ] })
      ] }, session.path);
    }) }),
    /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { dim: true, children: "\u2191\u2193 to navigate, Enter to select, Esc to cancel" }) })
  ] });
};
export {
  SessionSelectorModal
};
