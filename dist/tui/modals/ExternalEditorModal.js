import { jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Box, Text } from "ink";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { unlink, writeFile, readFile } from "node:fs/promises";
const ExternalEditorModal = ({
  initialValue,
  onSave,
  onClose
}) => {
  const [status, setStatus] = useState("preparing");
  const [errorMsg, setErrorMsg] = useState("");
  const filePathRef = useRef(null);
  useEffect(() => {
    let isMounted = true;
    const cleanup = async () => {
      if (filePathRef.current) {
        try {
          await unlink(filePathRef.current);
        } catch {
        }
        filePathRef.current = null;
      }
    };
    const launchEditor = async () => {
      try {
        const path = join(tmpdir(), `picro-${randomUUID()}.txt`);
        filePathRef.current = path;
        await writeFile(path, initialValue, "utf-8");
        if (!isMounted) {
          await unlink(path);
          return;
        }
        setStatus("waiting");
        const editor = process.env.EDITOR || process.env.VISUAL || "vi";
        const parts = editor.split(" ");
        const cmd = parts[0];
        const args = [...parts.slice(1), path];
        const child = spawn(cmd, args, { stdio: "inherit", shell: true });
        child.on("error", (err) => {
          if (isMounted) {
            setStatus("error");
            setErrorMsg(`Failed to launch editor: ${err.message}`);
          }
        });
        child.on("exit", async (code) => {
          if (!isMounted) {
            await unlink(path);
            return;
          }
          if (code === 0) {
            try {
              const content = await readFile(path, "utf-8");
              setStatus("saving");
              await onSave(content);
              await cleanup();
              onClose();
            } catch (err) {
              setStatus("error");
              setErrorMsg(`Failed to read edited file: ${err.message}`);
            }
          } else {
            setStatus("error");
            setErrorMsg(`Editor exited with code ${code}`);
          }
          await cleanup();
        });
      } catch (err) {
        if (isMounted) {
          setStatus("error");
          setErrorMsg(err.message);
        }
        await cleanup();
      }
    };
    launchEditor();
    return () => {
      isMounted = false;
      cleanup();
    };
  }, [initialValue, onSave, onClose]);
  const handleForceClose = () => {
    onClose();
  };
  return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", borderStyle: "round", borderColor: "yellow", padding: 1, children: [
    /* @__PURE__ */ jsx(Text, { color: "yellow", bold: true, children: "External Editor" }),
    /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsxs(Text, { children: [
      "Status: ",
      /* @__PURE__ */ jsx(Text, { color: status === "error" ? "red" : "green", children: status })
    ] }) }),
    status === "error" && /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { color: "red", children: errorMsg }) }),
    status === "waiting" && /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { children: "Launching $EDITOR... (press Ctrl+C to abort)" }) }),
    status === "preparing" && /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { children: "Preparing temporary file..." }) }),
    status === "saving" && /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { children: "Saving changes..." }) }),
    /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { dim: true, children: "Press Esc to cancel" }) })
  ] });
};
export {
  ExternalEditorModal
};
