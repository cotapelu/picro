import { jsx, jsxs } from "react/jsx-runtime";
import { Box, Text } from "ink";
import { useTheme } from "../../hooks/useTheme";
function formatNumber(num) {
  if (num >= 1e6) return (num / 1e6).toFixed(1) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(1) + "k";
  return num.toString();
}
function getThinkingLevelDisplay(level) {
  switch (level) {
    case "off":
      return "";
    case "minimal":
      return "min";
    case "low":
      return "low";
    case "medium":
      return "med";
    case "high":
      return "high";
    case "xhigh":
      return "xhigh";
    default:
      return level;
  }
}
const Footer = ({ runtime, hints = [], autoCompactEnabled = false }) => {
  const { theme } = useTheme();
  const cwdBasename = (() => {
    try {
      const cwd = runtime.cwd;
      return cwd ? cwd.split(/[/\\]/).filter(Boolean).pop() || "" : "";
    } catch {
      return "";
    }
  })();
  const sessionName = (() => {
    try {
      const session = runtime.session;
      const sessionManager = session?.sessionManager;
      if (sessionManager?.getSessionName) {
        return sessionManager.getSessionName();
      }
    } catch {
    }
    return "";
  })();
  const model = (() => {
    try {
      const session = runtime.session;
      const m = session?.model;
      if (!m) return "No model";
      return m.id || m.name || "Unknown";
    } catch {
      return "No model";
    }
  })();
  const thinkingLevel = (() => {
    try {
      return runtime.thinkingLevel || "off";
    } catch {
      return "off";
    }
  })();
  const tokenStats = (() => {
    try {
      const session = runtime.session;
      const sessionManager = session?.sessionManager;
      if (!sessionManager?.getEntries) return null;
      const entries = sessionManager.getEntries();
      let input = 0, output = 0, cacheRead = 0, cacheWrite = 0, cost = 0;
      for (const entry of entries) {
        if (entry.type === "message" && entry.message?.role === "assistant") {
          const usage = entry.message.usage || {};
          input += usage.input || 0;
          output += usage.output || 0;
          cacheRead += usage.cacheRead || 0;
          cacheWrite += usage.cacheWrite || 0;
          if (usage.cost?.total) cost += usage.cost.total;
        }
      }
      return { input, output, cacheRead, cacheWrite, cost };
    } catch {
      return null;
    }
  })();
  const leftParts = [cwdBasename];
  if (sessionName) leftParts.push(sessionName);
  if (autoCompactEnabled) leftParts.push("(auto)");
  const centerParts = [model];
  const thinkingDisplay = getThinkingLevelDisplay(thinkingLevel);
  if (thinkingDisplay) centerParts.push(`(${thinkingDisplay})`);
  const rightParts = [];
  if (tokenStats) {
    if (tokenStats.cacheRead > 0 || tokenStats.cacheWrite > 0) {
      rightParts.push(`cache: +${formatNumber(tokenStats.cacheWrite)} -${formatNumber(tokenStats.cacheRead)}`);
    }
    rightParts.push(`in:${formatNumber(tokenStats.input)} out:${formatNumber(tokenStats.output)}`);
    if (tokenStats.cost > 0) {
      rightParts.push(`$${tokenStats.cost.toFixed(4)}`);
    }
    if (hints.length > 0) rightParts.push("\xB7");
  }
  const perfStats = (() => {
    try {
      const session = runtime.session;
      return session?.getPerformanceStats?.() ?? null;
    } catch {
      return null;
    }
  })();
  if (perfStats && perfStats.sampleCount > 0) {
    if (tokenStats) rightParts.push("\xB7");
    rightParts.push(`CPU:${perfStats.avgCpuUserMS.toFixed(1)}ms`);
    rightParts.push(`RSS:${perfStats.avgRSSMB.toFixed(1)}MB`);
  }
  if (hints.length > 0) {
    rightParts.push(hints.join(" | "));
  }
  return /* @__PURE__ */ jsxs(Box, { borderStyle: "single", borderTop: true, borderColor: theme.border, paddingX: 1, justifyContent: "space-between", flexShrink: 0, children: [
    /* @__PURE__ */ jsx(Text, { dim: true, children: leftParts.join(" / ") || " " }),
    /* @__PURE__ */ jsx(Text, { bold: true, children: centerParts.join(" ") || "Picro" }),
    /* @__PURE__ */ jsx(Text, { dim: true, children: rightParts.join(" ") || "" })
  ] });
};
export {
  Footer
};
