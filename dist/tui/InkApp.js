import { jsx, jsxs } from "react/jsx-runtime";
import React, { useCallback } from "react";
import { render, Box, Text, useInput } from "ink";
import { ThemeProvider, useTheme } from "./hooks/useTheme";
import { useRuntime } from "./hooks/useRuntime";
import { Header } from "./components/Header/Header";
import { MessageList } from "./components/MessageList/MessageList";
import { InputBox } from "./components/InputBox/InputBox";
import { Footer } from "./components/Footer/Footer";
import { ErrorBoundary, useGlobalErrorHandler } from "./ErrorBoundary";
import { CommandPalette } from "./modals/CommandPalette";
import { ThinkingModal } from "./modals/ThinkingModal";
import { LoginModal } from "./modals/LoginModal";
import { HelpModal } from "./modals/HelpModal";
import { SessionSelectorModal } from "./modals/SessionSelectorModal";
import { ConfirmationModal } from "./modals/ConfirmationModal";
import { SettingsSelectorModal } from "./modals/SettingsSelectorModal";
import { ModelSelectorModal } from "./modals/ModelSelectorModal";
import { SessionInfoModal } from "./modals/SessionInfoModal";
import { ChangelogModal } from "./modals/ChangelogModal";
import { HotkeysModal } from "./modals/HotkeysModal";
import { TreeSelectorModal } from "./modals/TreeSelectorModal";
import { BashOutputModal } from "./modals/BashOutputModal";
import { InputModal } from "./modals/InputModal";
import { SelectModal } from "./modals/SelectModal";
import { Modal } from "./modals/Modal";
import { BUILTIN_SLASH_COMMANDS } from "../../runtime/slash-commands";
import { VERSION } from "../../config";
const InkAppInner = ({ runtime }) => {
  const { messages, status: runtimeStatus, thinkingLevel, sendMessage, isCompacting, retryAttempt, steeringMessages, followUpMessages, toolOutputExpanded, setToolOutputExpanded, hideThinkingBlock, setHideThinkingBlock, hiddenThinkingLabel, setHiddenThinkingLabel, currentModel } = useRuntime(runtime);
  const [retryCountdown, setRetryCountdown] = React.useState(0);
  React.useEffect(() => {
    if (retryAttempt > 0) {
      setRetryCountdown(3);
      const timer = setInterval(() => {
        setRetryCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1e3);
      return () => clearInterval(timer);
    }
  }, [retryAttempt]);
  let displayStatus = runtimeStatus || "Ready";
  if (isCompacting) {
    displayStatus = "Compacting... (Esc to cancel)";
  } else if (retryAttempt > 0) {
    const maxAttempts = 3;
    displayStatus = `Retrying (${retryAttempt}/${maxAttempts}) in ${retryCountdown}s... (Esc to cancel)`;
  }
  const { toggleTheme, isDark, theme } = useTheme();
  const [inputValue, setInputValue] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [activeModal, setActiveModal] = React.useState(null);
  const [showDebug, setShowDebug] = React.useState(false);
  const messageListRef = React.useRef(null);
  const [toasts, setToasts] = React.useState([]);
  const toastIdRef = React.useRef(0);
  const lastCtrlCTimeRef = React.useRef(0);
  const [modelRefresh, setModelRefresh] = React.useState(0);
  React.useEffect(() => {
    if (activeModal?.type === "command-palette" && activeModal.isSlash && !inputValue.startsWith("/")) {
      setActiveModal(null);
    }
  }, [inputValue, activeModal]);
  const addToast = useCallback((message, type = "info") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4e3);
  }, []);
  const handleSubmit = useCallback(async () => {
    if (inputValue.trim() === "" || isSubmitting) return;
    const userInput = inputValue.trim();
    setInputValue("");
    setIsSubmitting(true);
    if (userInput.startsWith("!")) {
      const withoutContext = userInput.startsWith("!!");
      const cmd = withoutContext ? userInput.slice(2).trim() : userInput.slice(1).trim();
      if (cmd) {
        try {
          const { execSync } = await import("node:child_process");
          const output = execSync(cmd, { encoding: "utf-8", stdio: "pipe" });
          setActiveModal({ type: "bash-output", command: cmd, output });
        } catch (err) {
          setActiveModal({ type: "bash-output", command: cmd, output: err.message || "Error", error: true });
        }
      }
      setIsSubmitting(false);
      return;
    }
    try {
      await sendMessage(userInput);
    } catch (err) {
      console.error("Send error:", err.message || err);
    } finally {
      setIsSubmitting(false);
    }
  }, [inputValue, isSubmitting, sendMessage]);
  React.useEffect(() => {
    const checkVersion = async () => {
      try {
        const response = await fetch("https://registry.npmjs.org/@picro/picro/latest", { signal: AbortSignal.timeout(5e3) });
        if (response.ok) {
          const data = await response.json();
          const latest = data.version;
          const current = VERSION;
          if (latest && latest !== current) {
            addToast(`New version available: ${latest} (current: ${current})`, "info");
            setActiveModal({ type: "changelog" });
          }
        }
      } catch {
      }
    };
    checkVersion();
  }, [addToast]);
  useInput((input, key) => {
    if (activeModal) return;
    if (key.ctrl && input === "p") {
      setActiveModal({ type: "command-palette" });
    } else if (key.ctrl && input === "t") {
      setActiveModal({ type: "thinking" });
    } else if (key.ctrl && key.shift && input === "t") {
      toggleTheme();
      try {
        runtime.settings?.set("theme", isDark ? "light" : "dark");
        runtime.settings?.save?.();
      } catch {
      }
    } else if (key.ctrl && key.shift && input === "x") {
      setToolOutputExpanded((prev) => !prev);
      addToast("Tool output " + (!toolOutputExpanded ? "expanded" : "collapsed"));
    } else if (key.ctrl && key.shift && input === "h") {
      setHideThinkingBlock((prev) => !prev);
      addToast("Thinking blocks: " + (!hideThinkingBlock ? "hidden" : "visible"));
    } else if (key.ctrl && input === "l") {
      setActiveModal({ type: "login" });
    } else if (key.ctrl && input === "r") {
      setActiveModal({ type: "session-selector" });
    } else if (key.ctrl && input === "d") {
      setShowDebug((prev) => !prev);
    } else if (key.ctrl && input === "e") {
      setActiveModal({ type: "editor", initialValue: inputValue, onSave: async (val) => setInputValue(val) });
    } else if (key.ctrl && key.shift && input === "v") {
      (async () => {
        try {
          const clipboardy = await import("clipboardy");
          const text = await clipboardy.default.read();
          setInputValue((prev) => prev + text);
          addToast("Pasted from clipboard", "info");
        } catch (err) {
          addToast("Paste failed: " + (err.message || err), "error");
        }
      })();
      return;
    } else if (key.ctrl && input === "c") {
      const now = Date.now();
      if (now - lastCtrlCTimeRef.current < 1e3) {
        process.exit(0);
      } else {
        lastCtrlCTimeRef.current = now;
        try {
          runtime.session?.abort?.();
          addToast("Interrupted", "info");
        } catch {
        }
      }
    }
  });
  const handleCommandSelect = useCallback(async (commandId, slashArgs) => {
    setActiveModal(null);
    const builtIn = BUILTIN_SLASH_COMMANDS.find((cmd) => cmd.name === commandId);
    if (!builtIn) {
      setInputValue(commandId);
      return;
    }
    let args = "";
    if (slashArgs) {
      const withoutSlash = slashArgs.slice(1).trim();
      const parts = withoutSlash.split(" ");
      if (parts[0] === commandId) {
        args = parts.slice(1).join(" ").trim();
      }
    }
    switch (commandId) {
      case "quit":
        process.exit(0);
        break;
      case "thinking":
        if (args && ["off", "minimal", "low", "medium", "high", "xhigh"].includes(args)) {
          runtime.setThinkingLevel(args);
          addToast(`Thinking level set to ${args}`, "success");
        } else {
          setActiveModal({ type: "thinking" });
        }
        break;
      case "login":
        setActiveModal({ type: "login" });
        break;
      case "help":
        setActiveModal({ type: "help" });
        break;
      case "copy":
        if (args === "all") {
          const conversation = messages.map((m) => {
            const role = m.role === "user" ? "You" : m.role === "assistant" ? "Assistant" : "Tool";
            return `${role}: ${m.content}`;
          }).join("\n\n");
          try {
            await runtime.copyToClipboard(conversation);
            addToast("Copied full conversation to clipboard", "success");
          } catch (err) {
            addToast("Copy failed", "error");
          }
        } else {
          const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
          if (lastAssistant) {
            try {
              await runtime.copyToClipboard(lastAssistant.content);
              addToast("Copied last assistant message", "success");
            } catch (err) {
              addToast("Copy failed", "error");
            }
          } else {
            addToast("No assistant message to copy", "info");
          }
        }
        break;
      case "resume":
        setActiveModal({ type: "session-selector" });
        break;
      case "new":
        setActiveModal({
          type: "confirmation",
          title: "New Session",
          message: "Create a new session? Current session will be saved.",
          onConfirm: async () => {
            try {
              await runtime.newSession();
              addToast("New session created", "success");
            } catch (err) {
              addToast("Failed to create session", "error");
            }
          },
          onCancel: () => {
          }
        });
        break;
      case "settings":
        setActiveModal({ type: "settings" });
        break;
      case "model":
        setActiveModal({ type: "model-selector" });
        break;
      case "export":
        try {
          const messages2 = runtime.session.messages;
          if (messages2.length === 0) {
            addToast("No messages to export", "info");
            break;
          }
          const cwd = runtime.cwd;
          const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
          const filename = `session-${timestamp}.html`;
          const filepath = `${cwd}/${filename}`;
          let html = `<!DOCTYPE html><html><head><title>Session Export</title>`;
          html += `<style>body{font-family:sans-serif;max-width:800px;margin:auto;padding:20px} .user{color:#0066cc} .assistant{color:#2e7d32} .tool{color:#d32f2f}</style>`;
          html += `</head><body><h1>Session Export</h1>`;
          for (const msg of messages2) {
            const role = msg.role;
            const content = msg.content?.map((c) => c.text || "").join("") || String(msg.content || "");
            const escaped = content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            html += `<div class="${role}"><strong>${role}:</strong> ${escaped}</div>`;
          }
          html += `</body></html>`;
          const fs = await import("node:fs");
          fs.writeFileSync(filepath, html, "utf-8");
          addToast(`Exported to ${filename}`, "success");
        } catch (err) {
          addToast("Export failed: " + err.message, "error");
        }
        break;
      case "import":
        try {
          const { execSync } = await import("node:child_process");
          const cwd = runtime.cwd;
          const output = execSync("fd --extension jsonl", { cwd, encoding: "utf-8" }).trim();
          const files = output ? output.split("\n").filter(Boolean) : [];
          if (files.length === 0) {
            addToast("No JSONL files found in current directory", "info");
            break;
          }
          const filepath = `${cwd}/${files[0]}`;
          const { cancelled } = await runtime.switchSession(filepath);
          if (cancelled) {
            addToast("Import cancelled", "info");
          } else {
            addToast(`Imported session from ${files[0]}`, "success");
          }
        } catch (err) {
          if (err.code === "ENOENT") {
            addToast("fd not found - install fd for file picking", "error");
          } else {
            addToast("Import failed: " + err.message, "error");
          }
        }
        break;
      case "share":
        try {
          const messages2 = runtime.session.messages;
          if (messages2.length === 0) {
            addToast("No messages to share", "info");
            break;
          }
          const authStorage = runtime.authStorage;
          const token = await authStorage.getApiKey?.("github") || process.env.GITHUB_TOKEN;
          if (!token) {
            addToast("GitHub token required. Login with /login github first.", "error");
            break;
          }
          const content = JSON.stringify(messages2, (key, value) => {
            if (key === "content" && Array.isArray(value)) {
              return value.map((v) => v.text || v.thinking || "").join("");
            }
            return value;
          }, 2);
          const response = await fetch("https://api.github.com/gists", {
            method: "POST",
            headers: {
              "Authorization": `token ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              description: "Session export from picro",
              public: false,
              files: { "session.json": { content } }
            })
          });
          if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
          }
          const data = await response.json();
          const gistUrl = data.html_url;
          await runtime.copyToClipboard(gistUrl);
          addToast("Gist URL copied to clipboard", "success");
        } catch (err) {
          addToast("Share failed: " + (err.message || err), "error");
        }
        break;
      case "name":
        const currentName = runtime.settings?.get?.("sessionDisplayName") || "";
        setActiveModal({ type: "editor", initialValue: currentName, onSave: async (val) => {
          const name = val.trim();
          try {
            if (runtime.settings) {
              runtime.settings.set("sessionDisplayName", name);
              await runtime.settings.save?.();
              addToast(`Session name set to: ${name || "(default)"}`, "success");
            } else {
              addToast("Settings unavailable", "error");
            }
          } catch (err) {
            addToast("Failed to set session name", "error");
          }
        } });
        break;
      case "session":
        setActiveModal({ type: "session-info" });
        break;
      case "changelog":
        setActiveModal({ type: "changelog" });
        break;
      case "hotkeys":
        setActiveModal({ type: "hotkeys" });
        break;
      case "clone":
        try {
          const messages2 = runtime.session.messages;
          if (messages2.length === 0) {
            addToast("No messages to clone", "info");
            break;
          }
          const firstUserMsg = messages2.find((m) => m.role === "user");
          if (firstUserMsg && firstUserMsg.id) {
            await runtime.fork(firstUserMsg.id);
            addToast("Session cloned (forked from first message)", "success");
          } else {
            await runtime.newSession();
            addToast("New empty session created", "success");
          }
        } catch (err) {
          addToast("Clone failed: " + err.message, "error");
        }
        break;
      case "tree":
        setActiveModal({ type: "tree-selector" });
        break;
      case "compact":
        try {
          const session2 = runtime.session;
          if (typeof session2.compact === "function") {
            await session2.compact();
            addToast("Compaction completed", "success");
          } else {
            addToast("Compaction not supported", "error");
          }
        } catch (err) {
          addToast("Compaction failed", "error");
        }
        break;
      case "reload":
        try {
          const session2 = runtime.session;
          if (typeof session2.reload === "function") {
            await session2.reload();
            addToast("All resources reloaded", "success");
          } else {
            await runtime.settings?.reload?.();
            addToast("Settings reloaded (full reload not available)", "success");
          }
        } catch (err) {
          addToast("Reload failed: " + err.message, "error");
        }
        break;
        try {
          await runtime.settings?.reload?.();
          addToast("Settings reloaded", "success");
        } catch (err) {
          addToast("Reload failed", "error");
        }
        break;
      case "logout":
        try {
          const authStorage = runtime.authStorage;
          const providers = authStorage.getProviders?.() || [];
          let count = 0;
          for (const p of providers) {
            await authStorage.removeApiKey?.(p);
            count++;
          }
          addToast(`Logged out from ${count} provider(s)`, "success");
        } catch (err) {
          addToast("Logout failed", "error");
        }
        break;
      case "scoped-models":
        try {
          const settings = runtime.settings;
          if (settings) {
            const current = settings.get("scopedModelsEnabled") ?? false;
            const next = !current;
            settings.set("scopedModelsEnabled", next);
            await settings.save?.();
            addToast(`Scoped models ${next ? "enabled" : "disabled"}`, "success");
          } else {
            addToast("Settings not available", "error");
          }
        } catch (err) {
          addToast("Failed to toggle scoped models", "error");
        }
        break;
      case "fork":
        try {
          const messages2 = runtime.session.messages;
          if (messages2.length === 0) {
            addToast("No messages to fork", "info");
            break;
          }
          const userMessages = messages2.filter((m) => m.role === "user");
          const targetMsg = userMessages[userMessages.length - 1] || userMessages[0];
          if (targetMsg?.id) {
            const result = await runtime.fork(targetMsg.id);
            if (result.cancelled) {
              addToast("Fork cancelled", "info");
            } else {
              addToast("Fork created successfully", "success");
            }
          } else {
            addToast("No suitable message to fork", "error");
          }
        } catch (err) {
          addToast("Fork failed: " + err.message, "error");
        }
        break;
      case "stats":
        const stats = runtime.session.getPerformanceStats?.();
        if (stats) {
          setActiveModal({ type: "stats", stats });
        } else {
          addToast("Performance tracking is disabled or no data available", "info");
        }
        break;
      case "paste":
        try {
          let pngBuffer;
          try {
            const { execFileSync } = await import("node:child_process");
            pngBuffer = execFileSync("wl-paste", ["--no-size", "--type", "image/png"]);
          } catch (e1) {
            try {
              const { execFileSync } = await import("node:child_process");
              pngBuffer = execFileSync("xclip", ["-selection", "clipboard", "-t", "image/png", "-o"]);
            } catch (e2) {
              addToast("No image in clipboard or missing wl-paste/xclip", "error");
              break;
            }
          }
          const fs = await import("node:fs");
          const path = await import("node:path");
          const timestamp = Date.now();
          const filename = `pasted-${timestamp}.png`;
          const filepath = path.join(runtime.cwd, filename);
          fs.writeFileSync(filepath, pngBuffer);
          setInputValue((prev) => prev + `![](${filename})`);
          addToast(`Pasted image as ${filename}`, "success");
        } catch (err) {
          addToast(`Paste failed: ${err.message}`, "error");
        }
        break;
      case "debug":
        handleDebugCommand();
        addToast("Debug log written", "success");
        break;
      case "arminsayshi":
        setActiveModal({ type: "armin" });
        break;
      case "dementedelves":
        setActiveModal({ type: "earendil" });
        break;
      default:
        addToast(`Command "/${commandId}" not yet implemented`, "info");
        break;
    }
    setInputValue("");
  }, [runtime, messages, addToast, setActiveModal, setInputValue, BUILTIN_SLASH_COMMANDS]);
  const handleThinkingChange = useCallback((level) => {
    setActiveModal(null);
    runtime.setThinkingLevel(level);
  }, [runtime]);
  const handleLogin = useCallback(async (apiKey) => {
    const defaultProvider = runtime.settings?.getDefaultProvider() || "openai";
    await runtime.authStorage.setApiKey(defaultProvider, apiKey);
    addToast("Logged in successfully", "success");
    setActiveModal(null);
  }, [runtime, addToast]);
  const handleDebugCommand = useCallback(() => {
    try {
      const rt = runtime;
      const session2 = rt.session;
      const { messages: messages2 } = session2;
      const stats = session2.getSessionStats?.();
      const debugLogPath = require("node:path").join(require("node:os").tmpdir(), `picro-debug-${Date.now()}.log`);
      const lines = [
        `Picro Debug Log`,
        `Generated: ${(/* @__PURE__ */ new Date()).toISOString()}`,
        `CWD: ${rt.cwd}`,
        `Session: ${stats?.sessionFile || "in-memory"}`,
        `Model: ${session2.model?.provider}/${session2.model?.id}`,
        `Thinking level: ${session2.thinkingLevel}`,
        `Messages: ${messages2.length} total`,
        `  User: ${stats?.userMessages || 0}`,
        `  Assistant: ${stats?.assistantMessages || 0}`,
        `  ToolCalls: ${stats?.toolCalls || 0}`,
        `  ToolResults: ${stats?.toolResults || 0}`,
        `Tokens: in=${stats?.tokens?.input || 0}, out=${stats?.tokens?.output || 0}, total=${stats?.tokens?.total || 0}`,
        `Cost: $${stats?.cost?.toFixed(4) || 0}`,
        "",
        "=== Full Message History (JSONL) ==="
      ];
      for (const msg of messages2) {
        lines.push(JSON.stringify(msg));
      }
      require("node:fs").writeFileSync(debugLogPath, lines.join("\n"), "utf-8");
      addToast(`Debug log written to ${debugLogPath}`, "success");
    } catch (err) {
      addToast(`Debug failed: ${err.message}`, "error");
    }
  }, [runtime, addToast]);
  const handleTreeSelect = useCallback(async (branchId) => {
    try {
      const session2 = runtime.session;
      if (session2.navigateTree) {
        const result = await session2.navigateTree(branchId);
        if (result.cancelled) {
          addToast("Branch navigation cancelled", "info");
        } else {
          addToast(`Switched to branch: ${branchId}`, "success");
        }
      } else {
        addToast("Tree navigation not supported", "error");
      }
    } catch (err) {
      addToast(`Tree navigation failed: ${err.message}`, "error");
    }
  }, [runtime, addToast]);
  const handlePathComplete = useCallback(async (partial) => {
    if (!runtime.cwd) return [];
    try {
      const { execFile } = await import("node:child_process");
      return new Promise((resolve) => {
        execFile("fd", ["--color", "never", "--base-path", ".", "--", partial + "*"], { cwd: runtime.cwd }, (err, stdout) => {
          if (err) {
            resolve([]);
            return;
          }
          const files = stdout.trim().split("\n").filter(Boolean);
          resolve(files);
        });
      });
    } catch (e) {
      console.error("fd autocomplete error:", e);
      return [];
    }
  }, [runtime.cwd]);
  const handleExternalEdit = useCallback(async (text) => {
    const editor = process.env.EDITOR || process.env.VISUAL || "vim";
    const fs = await import("node:fs");
    const path = await import("node:path");
    const os = await import("node:os");
    const { spawnSync } = await import("node:child_process");
    const tmpdir = os.tmpdir();
    const dir = fs.mkdtempSync(path.join(tmpdir, "picro-"));
    const filepath = path.join(dir, "edit.txt");
    try {
      fs.writeFileSync(filepath, text, "utf-8");
      spawnSync(editor, [filepath], { stdio: "inherit", cwd: runtime.cwd });
      const newText = fs.readFileSync(filepath, "utf-8");
      return newText;
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }, [runtime.cwd]);
  const renderModal = () => {
    if (!activeModal) return null;
    switch (activeModal.type) {
      case "command-palette":
        const session2 = runtime.session;
        const builtinCmds = BUILTIN_SLASH_COMMANDS;
        const extensionCommands = session2._extensionRunner?.getCommands?.() || [];
        const skills = session2._resourceLoader?.getSkills?.()?.skills || [];
        const promptTemplates = session2._resourceLoader?.getPromptTemplates?.() || [];
        const allCommands = [
          ...builtinCmds.map((c) => ({ id: c.name, label: `/${c.name}`, description: c.description, source: "builtin" })),
          ...extensionCommands.map((c) => ({ id: c.invocationName, label: c.invocationName.startsWith("/") ? c.invocationName : `/${c.invocationName}`, description: c.description, source: "extension" })),
          ...skills.map((s) => ({ id: `skill:${s.name}`, label: `skill:${s.name}`, description: s.description, source: "skill" })),
          ...promptTemplates.map((t) => ({ id: t.name, label: `template:${t.name}`, description: t.description, source: "template" }))
        ];
        const filter = activeModal.filter || "";
        const search = filter.toLowerCase().replace(/^\/+/g, "");
        const filtered = allCommands.filter(
          (cmd) => cmd.label.toLowerCase().includes(search) || cmd.description && cmd.description.toLowerCase().includes(search)
        );
        return /* @__PURE__ */ jsx(Modal, { onClose: () => setActiveModal(null), children: /* @__PURE__ */ jsx(
          CommandPalette,
          {
            commands: filtered,
            onSelect: (id) => handleCommandSelect(id, filter),
            onClose: () => setActiveModal(null)
          }
        ) });
      case "thinking":
        return /* @__PURE__ */ jsx(Modal, { onClose: () => setActiveModal(null), children: /* @__PURE__ */ jsx(
          ThinkingModal,
          {
            currentLevel: thinkingLevel,
            onChange: handleThinkingChange
          }
        ) });
      case "login":
        return /* @__PURE__ */ jsx(Modal, { onClose: () => setActiveModal(null), children: /* @__PURE__ */ jsx(
          LoginModal,
          {
            onLogin: handleLogin,
            onClose: () => setActiveModal(null)
          }
        ) });
      case "editor":
        return /* @__PURE__ */ jsx(Modal, { onClose: () => setActiveModal(null), children: /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
          /* @__PURE__ */ jsx(Text, { bold: true, children: "Edit Input" }),
          /* @__PURE__ */ jsx(
            InputBox,
            {
              value: activeModal.initialValue,
              onChange: setInputValue,
              onSubmit: async () => {
                await activeModal.onSave(inputValue);
                setActiveModal(null);
              },
              multiline: true,
              autoFocus: true
            }
          )
        ] }) });
      case "help":
        return /* @__PURE__ */ jsx(Modal, { onClose: () => setActiveModal(null), children: /* @__PURE__ */ jsx(HelpModal, { onClose: () => setActiveModal(null) }) });
      case "session-selector":
        return /* @__PURE__ */ jsx(SessionSelectorModal, { runtime, onClose: () => setActiveModal(null) });
      case "settings":
        return /* @__PURE__ */ jsx(Modal, { onClose: () => setActiveModal(null), children: /* @__PURE__ */ jsx(SettingsSelectorModal, { runtime, onClose: () => setActiveModal(null) }) });
      case "model-selector":
        return /* @__PURE__ */ jsx(Modal, { onClose: () => setActiveModal(null), children: /* @__PURE__ */ jsx(
          ModelSelectorModal,
          {
            runtime,
            onClose: () => setActiveModal(null),
            onSelect: () => setModelRefresh((v) => v + 1)
          }
        ) });
      case "session-info":
        return /* @__PURE__ */ jsx(Modal, { onClose: () => setActiveModal(null), children: /* @__PURE__ */ jsx(SessionInfoModal, { runtime, onClose: () => setActiveModal(null) }) });
      case "changelog":
        return /* @__PURE__ */ jsx(Modal, { onClose: () => setActiveModal(null), children: /* @__PURE__ */ jsx(ChangelogModal, { onClose: () => setActiveModal(null) }) });
      case "hotkeys":
        return /* @__PURE__ */ jsx(Modal, { onClose: () => setActiveModal(null), children: /* @__PURE__ */ jsx(HotkeysModal, { onClose: () => setActiveModal(null) }) });
      case "tree-selector":
        return /* @__PURE__ */ jsx(Modal, { onClose: () => setActiveModal(null), children: /* @__PURE__ */ jsx(
          TreeSelectorModal,
          {
            runtime,
            onClose: () => setActiveModal(null),
            onSelect: handleTreeSelect
          }
        ) });
      case "bash-output":
        return /* @__PURE__ */ jsx(Modal, { onClose: () => setActiveModal(null), children: /* @__PURE__ */ jsx(
          BashOutputModal,
          {
            command: activeModal.command,
            output: activeModal.output,
            error: activeModal.error,
            onClose: () => setActiveModal(null)
          }
        ) });
      case "confirmation":
        return /* @__PURE__ */ jsx(Modal, { onClose: () => setActiveModal(null), children: /* @__PURE__ */ jsx(
          ConfirmationModal,
          {
            title: activeModal.title,
            message: activeModal.message,
            onConfirm: async () => {
              await activeModal.onConfirm();
              setActiveModal(null);
            },
            onCancel: () => {
              activeModal.onCancel?.();
              setActiveModal(null);
            }
          }
        ) });
      case "stats":
        return /* @__PURE__ */ jsx(Modal, { onClose: () => setActiveModal(null), children: /* @__PURE__ */ jsxs(Box, { flexDirection: "column", borderStyle: "round", borderColor: "green", padding: 1, children: [
          /* @__PURE__ */ jsx(Text, { bold: true, color: "green", children: "Performance Metrics" }),
          /* @__PURE__ */ jsxs(Box, { flexDirection: "column", marginTop: 1, children: [
            /* @__PURE__ */ jsxs(Text, { children: [
              "Samples: ",
              activeModal.stats.sampleCount
            ] }),
            /* @__PURE__ */ jsxs(Text, { children: [
              "Time Span: ",
              activeModal.stats.timeSpanMS.toFixed(0),
              "ms"
            ] }),
            /* @__PURE__ */ jsxs(Text, { children: [
              "Avg CPU User: ",
              activeModal.stats.avgCpuUserMS.toFixed(2),
              "ms"
            ] }),
            /* @__PURE__ */ jsxs(Text, { children: [
              "Avg CPU System: ",
              activeModal.stats.avgCpuSystemMS.toFixed(2),
              "ms"
            ] }),
            /* @__PURE__ */ jsxs(Text, { children: [
              "Avg RSS: ",
              activeModal.stats.avgRSSMB.toFixed(2),
              " MB"
            ] }),
            /* @__PURE__ */ jsxs(Text, { children: [
              "Avg Heap Used: ",
              activeModal.stats.avgHeapUsedMB.toFixed(2),
              " MB"
            ] }),
            /* @__PURE__ */ jsxs(Text, { children: [
              "Peak RSS: ",
              activeModal.stats.peakRSSMB.toFixed(2),
              " MB"
            ] }),
            /* @__PURE__ */ jsxs(Text, { children: [
              "Peak Heap Used: ",
              activeModal.stats.peakHeapUsedMB.toFixed(2),
              " MB"
            ] })
          ] })
        ] }) });
      case "armin":
        return /* @__PURE__ */ jsx(Modal, { onClose: () => setActiveModal(null), children: /* @__PURE__ */ jsx(Box, { justifyContent: "center", alignItems: "center", flexDirection: "column", children: /* @__PURE__ */ jsx(Text, { children: "HI! I'M ARMIN!" }) }) });
      case "earendil":
        return /* @__PURE__ */ jsx(Modal, { onClose: () => setActiveModal(null), children: /* @__PURE__ */ jsx(Box, { justifyContent: "center", alignItems: "center", flexDirection: "column", children: /* @__PURE__ */ jsx(Text, { bold: true, color: "yellow", children: "DEMENTED ELVES HAVE EMERGED" }) }) });
      case "input":
        return /* @__PURE__ */ jsx(Modal, { onClose: () => setActiveModal(null), children: /* @__PURE__ */ jsx(
          InputModal,
          {
            title: activeModal.title,
            placeholder: activeModal.placeholder,
            onSubmit: (value) => {
              activeModal.onSubmit(value);
              setActiveModal(null);
            },
            onCancel: () => {
              activeModal.onCancel?.();
              setActiveModal(null);
            }
          }
        ) });
      case "select":
        return /* @__PURE__ */ jsx(Modal, { onClose: () => setActiveModal(null), children: /* @__PURE__ */ jsx(
          SelectModal,
          {
            title: activeModal.title,
            options: activeModal.options,
            onSelect: (opt) => {
              activeModal.onSelect(opt);
              setActiveModal(null);
            },
            onCancel: () => {
              activeModal.onCancel?.();
              setActiveModal(null);
            }
          }
        ) });
      case "custom":
        if (!customOverlay) return null;
        const CustomFactory = customOverlay.factory;
        return /* @__PURE__ */ jsx(Modal, { onClose: () => {
          setCustomOverlay(null);
        }, children: (() => {
          const component = CustomFactory({
            tui: null,
            theme,
            keybindings: {},
            done: (result) => {
              customOverlay.resolve(result);
              setCustomOverlay(null);
            }
          });
          return component;
        })() });
      default:
        return null;
    }
  };
  const modelId = currentModel?.id || runtime.session?.model?.id || "No model";
  const themeLabel = isDark ? "dark" : "light";
  const session = runtime.session;
  const resourceLoader = session._resourceLoader;
  let extCount = 0, skillCount = 0, promptCount = 0, themeCount = 0;
  if (resourceLoader) {
    try {
      const extResult = resourceLoader.getExtensions?.();
      if (extResult?.extensions?.length) extCount = extResult.extensions.length;
      const skillsResult = resourceLoader.getSkills?.();
      if (skillsResult?.skills?.length) skillCount = skillsResult.skills.length;
      const promptsResult = resourceLoader.getPromptTemplates?.();
      if (promptsResult?.length) promptCount = promptsResult.length;
      const themesResult = resourceLoader.getThemes?.();
      if (themesResult?.themes?.length) themeCount = themesResult.themes.length;
    } catch (e) {
    }
  }
  const resourceCounts = { extensions: extCount, skills: skillCount, prompts: promptCount, themes: themeCount };
  const [extensionWidgetsAbove, setExtensionWidgetsAbove] = React.useState(/* @__PURE__ */ new Map());
  const [extensionWidgetsBelow, setExtensionWidgetsBelow] = React.useState(/* @__PURE__ */ new Map());
  const setExtensionWidget = React.useCallback((key, content, options) => {
    const placement = options?.placement || "above";
    if (placement === "above") {
      setExtensionWidgetsAbove((prev) => {
        const next = new Map(prev);
        if (content == null) next.delete(key);
        else if (typeof content === "string") next.set(key, content);
        return next;
      });
    } else if (placement === "below") {
      setExtensionWidgetsBelow((prev) => {
        const next = new Map(prev);
        if (content == null) next.delete(key);
        else if (typeof content === "string") next.set(key, content);
        return next;
      });
    }
  }, []);
  const [customEditor, setCustomEditor] = React.useState(null);
  const [autocompleteProviderFactories, setAutocompleteProviderFactories] = React.useState([]);
  const registerAutocompleteProvider = React.useCallback((factory) => {
    setAutocompleteProviderFactories((prev) => [...prev, factory]);
  }, []);
  const handleAutocomplete = useCallback(async (filter) => {
    const ctx = { sessionId: "", cwd: runtime.cwd, filter };
    const suggestions = [];
    for (const factory of autocompleteProviderFactories) {
      try {
        const result = await factory(ctx);
        for (const item of result) {
          suggestions.push(item.insertText || item.label);
        }
      } catch {
      }
    }
    return suggestions;
  }, [runtime.cwd, autocompleteProviderFactories]);
  const [customHeader, setCustomHeader] = React.useState(null);
  const [customFooter, setCustomFooter] = React.useState(null);
  const [customOverlay, setCustomOverlay] = React.useState(null);
  const showCustomOverlay = React.useCallback((factory, options) => {
    return new Promise((resolve) => {
      setCustomOverlay({ factory, resolve });
    });
  }, []);
  const showConfirm = (title, message, opts) => {
    return new Promise((resolve) => {
      setActiveModal({
        type: "confirmation",
        title,
        message,
        onConfirm: () => {
          resolve(true);
          setActiveModal(null);
        },
        onCancel: () => {
          resolve(false);
          setActiveModal(null);
        }
      });
    });
  };
  const showInput = (title, placeholder, opts) => {
    return new Promise((resolve) => {
      setActiveModal({
        type: "input",
        title,
        placeholder,
        onSubmit: (value) => {
          resolve(value);
          setActiveModal(null);
        },
        onCancel: () => {
          resolve(void 0);
          setActiveModal(null);
        }
      });
    });
  };
  const showSelect = (title, options, opts) => {
    return new Promise((resolve) => {
      setActiveModal({
        type: "select",
        title,
        options,
        onSelect: (option) => {
          resolve(option);
          setActiveModal(null);
        },
        onCancel: () => {
          resolve(void 0);
          setActiveModal(null);
        }
      });
    });
  };
  const createExtensionUIContext = () => ({
    select: showSelect,
    confirm: showConfirm,
    input: showInput,
    notify: (message, type = "info") => addToast(message, type),
    onTerminalInput: (handler) => {
      return () => {
      };
    },
    setStatus: (key, text) => {
    },
    setWorkingMessage: (message) => {
    },
    setWorkingIndicator: (options) => {
    },
    setHiddenThinkingLabel,
    setWidget: (key, content, options) => {
      setExtensionWidget(key, content, options);
    },
    setFooter: setCustomFooter,
    setHeader: setCustomHeader,
    setTitle: (title) => {
      try {
        process.title = title;
      } catch {
      }
    },
    custom: showCustomOverlay,
    pasteToEditor: (text) => setInputValue((prev) => prev + text),
    setEditorText: (text) => setInputValue(text),
    getEditorText: () => inputValue,
    editor: (title, prefill) => Promise.resolve(prefill),
    addAutocompleteProvider: (factory) => {
    },
    setEditorComponent: setCustomEditor,
    get theme() {
      return theme;
    },
    getAllThemes: () => [],
    getTheme: (name) => null,
    setTheme: () => ({ success: true }),
    getToolsExpanded: () => toolOutputExpanded,
    setToolsExpanded: (expanded) => setToolOutputExpanded(expanded)
  });
  React.useEffect(() => {
    const session2 = runtime.session;
    if (session2?.bindExtensions && !session2.__picroBound) {
      session2.bindExtensions({
        uiContext: createExtensionUIContext(),
        commandContextActions: {
          waitForIdle: async () => {
          },
          newSession: async (options) => ({ cancelled: true }),
          fork: async (entryId, options) => ({ cancelled: true }),
          navigateTree: async (targetId, options) => ({ cancelled: true }),
          switchSession: async (path, options) => ({ cancelled: true }),
          reload: async () => {
          }
        },
        shutdownHandler: () => {
        },
        onError: (err) => console.error("Extension error:", err)
      });
      session2.__picroBound = true;
    }
  }, [runtime, createExtensionUIContext]);
  React.useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch("https://registry.npmjs.org/picro");
        if (!res.ok) return;
        const data = await res.json();
        const latest = data?.["dist-tags"]?.latest;
        if (latest && latest !== VERSION) {
          addToast(`New version ${latest} available (current: ${VERSION})`, "info");
        }
      } catch (e) {
      }
    };
    checkVersion();
  }, [addToast]);
  const inputProps = {
    value: inputValue,
    onChange: setInputValue,
    onSubmit: handleSubmit,
    placeholder: "Type your message...",
    disabled: isSubmitting,
    onSlashCommand: (prefix) => {
      setActiveModal({ type: "command-palette", filter: prefix, isSlash: true });
    },
    onTab: () => {
      setActiveModal({ type: "command-palette", filter: "", isSlash: false });
    },
    cwd: runtime.cwd,
    onPathComplete: handlePathComplete,
    onExternalEdit: handleExternalEdit,
    onAutocomplete: handleAutocomplete
  };
  return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", width: "100%", position: "relative", children: [
    customHeader || /* @__PURE__ */ jsx(
      Header,
      {
        title: "Picro Agent",
        status: status || "Ready",
        thinkingLevel,
        model: modelId,
        theme: themeLabel,
        showArmin: true,
        resourceCounts
      }
    ),
    /* @__PURE__ */ jsxs(Box, { flexGrow: 1, overflow: "hidden", position: "relative", children: [
      (steeringMessages.length > 0 || followUpMessages.length > 0) && /* @__PURE__ */ jsx(Box, { borderBottom: true, paddingX: 1, children: /* @__PURE__ */ jsxs(Text, { color: "yellow", dim: true, children: [
        "Queued: ",
        steeringMessages.length,
        " steer, ",
        followUpMessages.length,
        " follow-up (Ctrl+Alt+E to edit)"
      ] }) }),
      /* @__PURE__ */ jsx(
        MessageList,
        {
          ref: messageListRef,
          messages,
          hideThinkingBlock
        }
      ),
      showDebug && /* @__PURE__ */ jsx(Box, { position: "absolute", top: 0, right: 0, children: /* @__PURE__ */ jsx(Text, { color: "yellow", children: "Debug" }) })
    ] }),
    extensionWidgetsAbove.size > 0 && /* @__PURE__ */ jsx(Box, { flexDirection: "column", paddingX: 1, borderTop: "thin", children: Array.from(extensionWidgetsAbove.entries()).map(([key, text]) => /* @__PURE__ */ jsx(Text, { children: text }, key)) }),
    customEditor ? React.createElement(customEditor, inputProps) : /* @__PURE__ */ jsx(InputBox, { ...inputProps }),
    extensionWidgetsBelow.size > 0 && /* @__PURE__ */ jsx(Box, { flexDirection: "column", paddingX: 1, borderTop: "thin", children: Array.from(extensionWidgetsBelow.entries()).map(([key, text]) => /* @__PURE__ */ jsx(Text, { children: text }, key)) }),
    (isCompacting || retryAttempt > 0) && /* @__PURE__ */ jsx(Box, { paddingX: 1, children: /* @__PURE__ */ jsx(Text, { color: isCompacting ? "yellow" : "orange", children: displayStatus }) }),
    customFooter || /* @__PURE__ */ jsx(Footer, { runtime, hints: [
      "Ctrl+P: Commands",
      "Ctrl+T: Thinking",
      "Ctrl+Shift+T: Toggle Theme",
      "Ctrl+R: Resume Session",
      "Ctrl+Alt+E: Edit",
      "Ctrl+D: Debug",
      "Ctrl+C: Quit"
    ] }),
    activeModal && renderModal(),
    /* @__PURE__ */ jsx(Box, { flexDirection: "column", position: "absolute", top: 0, right: 0, children: toasts.map((toast) => /* @__PURE__ */ jsx(Box, { borderStyle: "round", paddingX: 1, margin: 1, children: /* @__PURE__ */ jsx(Text, { color: toast.type === "error" ? "red" : toast.type === "success" ? "green" : "cyan", children: toast.message }) }, toast.id)) })
  ] });
};
const InkApp = ({ runtime }) => {
  useGlobalErrorHandler();
  let initialMode = "dark";
  try {
    const themeSetting = runtime.settings?.get?.("theme");
    if (themeSetting === "light") initialMode = "light";
  } catch {
  }
  return /* @__PURE__ */ jsx(ErrorBoundary, { onError: (error, errorInfo) => {
    console.error("App error:", error, errorInfo);
  }, children: /* @__PURE__ */ jsx(ThemeProvider, { initialMode, children: /* @__PURE__ */ jsx(InkAppInner, { runtime }) }) });
};
const runInkApp = async (runtime) => {
  const { waitUntilExit } = render(
    /* @__PURE__ */ jsx(InkApp, { runtime })
  );
  await waitUntilExit();
};
export {
  InkApp,
  runInkApp
};
