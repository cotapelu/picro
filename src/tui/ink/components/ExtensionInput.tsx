// ExtensionInput - hộp thoại nhập một dòng cho extension
// Bắt chước nguyên tắc pi-mono components/extension-input.ts:
//   - Viền động hai đầu, tiêu đề, mô tả, ô nhập, gợi ý phím
//   - Hỗ trợ đếm ngược tự hủy
//   - Phím xác nhận/hủy từ bàn phím
// Port sang Ink TSX, khong copy code truc tiep.

import React, { useState } from "react";
import { Box, Text } from "ink";
import { theme, fg, bg } from "../theme.js";
import { DynamicBorder } from "./DynamicBorder.js";
import { TextInput } from "./TextInput.js";
import { CountdownTimer } from "./CountdownTimer.js";
import { KeyHintText } from "./KeyHintText.jsx";

export interface ExtensionInputProps {
  title: string;
  description?: string;
  placeholder?: string;
  initialValue?: string;
  /** Thời gian tự hủy (ms); bỏ trống = không tự hủy. */
  timeout?: number;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  width?: number;
}

export const ExtensionInput: React.FC<ExtensionInputProps> = ({
  title,
  description,
  placeholder,
  initialValue,
  timeout,
  onSubmit,
  onCancel,
  width = 80,
}) => {
  const [value, setValue] = useState(initialValue ?? "");

  return (
    <Box flexDirection="column" width={width}>
      <DynamicBorder />
      <Text bold>{fg("accent", title)}</Text>
      {description ? (
        <>
          <Text> </Text>
          <Text>{fg("text", description)}</Text>
        </>
      ) : null}
      <Text> </Text>
      <TextInput value={value} placeholder={placeholder} onChange={setValue} onSubmit={onSubmit} onEscape={onCancel} />
      <Text> </Text>
      {timeout && timeout > 0 ? (
        <CountdownTimer durationMs={timeout} onTimeout={onCancel} label="tự đóng sau" />
      ) : null}
      <Box flexDirection="row">
        <KeyHintText keys="Enter" description="gửi" />
        <Text>  </Text>
        <KeyHintText keys="Esc" description="hủy" />
      </Box>
      <DynamicBorder />
    </Box>
  );
};
