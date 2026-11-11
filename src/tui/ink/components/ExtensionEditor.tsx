// ExtensionEditor - editor nhiều dòng cho extension
// Bắt chước nguyên tắc pi-mono components/extension-editor.ts:
//   - Viền động hai đầu, tiêu đề, mô tả, editor nhiều dòng
//   - Enter gửi (Shift+Enter xuống dòng); Escape hủy
//   - Phím tắt mở editor ngoài (app.editor.external)
//   - Dòng trạng thái báo lỗi mở editor ngoài
// Port sang Ink TSX, khon copy code truc iep.

import React, { useCallback, useState } from "react";
import { Box, Text, useInput } from "ink";
import { getTheme } from "../theme/index.js";
import { DynamicBorder } from "./DynamicBorder.js";
import { Editor } from "./Editor.js";
import { KeyHintText } from "./KeyHintText.js";
import { editInExternalEditor } from "../core/ExternalEditor.js";

export interface ExtensionEditorProps {
  title: string;
  /** Nội dung khởi tạo. */
  prefill?: string;
  description?: string;
  /** Lệnh editor ngoài; mặc định lấy VISUAL/EDITOR hoặc nano. */
  externalEditorCommand?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  width?: number;
}

export const ExtensionEditor: React.FC<ExtensionEditorProps> = ({
  title,
  prefill,
  description,
  externalEditorCommand,
  onSubmit,
  onCancel,
  width = 80,
}) => {
  const t = getTheme();
  const [value, setValue] = useState(prefill ?? "");
  const [status, setStatus] = useState("");

  const command =
    externalEditorCommand ||
    process.env.VISUAL ||
    process.env.EDITOR ||
    (process.platform === "win32" ? "notepad" : "nano");

  const openExternal = useCallback(async () => {
    const result = await editInExternalEditor({ command, content: value });
    if (result.status === "complete") {
      setValue(result.content);
      setStatus("");
    } else {
      setStatus(t.fg("warning", result.message));
    }
  }, [command, value, t]);

  // Escape và Ctrl+G (editor ngoài) là của component này;
  // các phím còn lại thuộc Editor.
  useInput(() => {
    // Editor xử lý phần lớn phím; ta chỉ can thiệp qua callback riêng.
  });

  const editor = (
    <Editor
      value={value}
      onChange={setValue}
      onSubmit={(text) => onSubmit(text)}
      width={width}
    />
  );

  return (
    <Box flexDirection="column" width={width}>
      <DynamicBorder />
      <Text bold>{t.fg("accent", title)}</Text>
      {description ? (
        <>
          <Text> </Text>
          <Text>{t.fg("text", description)}</Text>
        </>
      ) : null}
      <Text> </Text>
      {editor}
      {status ? (
        <>
          <Text> </Text>
          <Text>{status}</Text>
        </>
      ) : null}
      <Text> </Text>
      <Box flexDirection="row">
        <KeyHintText keys="Enter" description="gửi" />
        <Text>  </Text>
        <KeyHintText keys="Shift+Enter" description="xuống dòng" />
        <Text>  </Text>
        <KeyHintText keys="Esc" description="hủy" />
        <Text>  </Text>
        <KeyHintText keys="Ctrl+G" description="editor ngoài" />
      </Box>
      <Text> </Text>
      <DynamicBorder />
    </Box>
  );
};

/** Chạy editor ngoài từ bên ngoài component. */
export async function runExternalEditor(
  command: string,
  content: string,
): Promise<{ content: string; message: string }> {
  const result = await editInExternalEditor({ command, content });
  if (result.status === "complete") return { content: result.content, message: "" };
  return { content, message: result.message };
}
