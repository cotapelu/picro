// LoginDialog - hộp thoại đăng nhập nhà cung cấp
// Bắt chước nguyên tắc pi-mono components/login-dialog.ts:
//   - Viền động hai đầu, tiêu đề, vùng nội dung thay đổi được
//   - showAuth: hiện URL đăng nhập (bấm/mở trình duyệt được)
//   - showDeviceCode: hiện mã xác thực kèm hành động mở trình duyệt + sao chép
//   - showManualInput/showPrompt: ô nhập cho callback server / API key
//   - onComplete báo kết quả cho cha
// Port sang Ink TSX, khon copy code truc iep.

import React, { useCallback, useState } from "react";
import { Box, Text } from "ink";
import { getTheme } from "../theme/theme.js";
import { DynamicBorder } from "../../../tui/ink/components/DynamicBorder.js";
import { TextInput } from "../../../tui/ink/components/TextInput.js";
import { AuthUrl, copyAuthUrl } from "./AuthUrl.js";

export interface DeviceCodeInfo {
  verificationUri: string;
  userCode: string;
  openBrowserOnConfirm?: boolean;
  copyCodeOnConfirm?: boolean;
}

export interface LoginDialogProps {
  providerId: string;
  providerName?: string;
  title?: string;
  /** Báo kết quả: thành công hay hủy. */
  onComplete: (success: boolean, message?: string) => void;
  onSubmitInput?: (value: string) => void;
  width?: number;
}

export const LoginDialog: React.FC<LoginDialogProps> = ({
  providerId,
  providerName,
  title,
  onComplete,
  onSubmitInput,
  width = 80,
}) => {
  const t = getTheme();
  const [lines, setLines] = useState<string[]>([]);
  const [inputMode, setInputMode] = useState<"none" | "input">("none");
  const [inputValue, setInputValue] = useState("");
  const [authUrl, setAuthUrl] = useState<string | undefined>(undefined);

  const addLine = useCallback((line: string) => setLines((prev) => [...prev, line]), []);

  const showAuth = useCallback(
    (url: string, instructions?: string) => {
      setAuthUrl(url);
      setLines([]);
      if (instructions) addLine(instructions);
    },
    [addLine],
  );

  const showDeviceCode = useCallback(
    (info: DeviceCodeInfo) => {
      setAuthUrl(info.verificationUri);
      setLines([`Nhập mã: ${info.userCode}`]);
    },
    [],
  );

  const showManualInput = useCallback((prompt: string) => {
    setLines([prompt]);
    setInputMode("input");
    setInputValue("");
  }, []);

  const showPrompt = useCallback(
    (message: string, _placeholder?: string) => {
      setLines([message]);
      setInputMode("input");
      setInputValue("");
    },
    [],
  );

  const submitInput = useCallback(
    (value: string) => {
      onSubmitInput?.(value);
      setInputMode("none");
    },
    [onSubmitInput],
  );

  const cancel = useCallback(() => onComplete(false, "Đã hủy đăng nhập"), [onComplete]);

  const heading = title ?? `Đăng nhập ${providerName ?? providerId}`;

  return (
    <Box flexDirection="column" width={width}>
      <DynamicBorder />
      <Text bold>{t.fg("accent", heading)}</Text>
      <Text> </Text>
      {authUrl ? (
        <AuthUrl
          url={authUrl}
          onCopy={async (url) => {
            await copyAuthUrl(url);
          }}
          width={width}
        />
      ) : null}
      {lines.map((line, i) => (
        <Text key={`line-${i}`}>{t.fg(line.startsWith("Nhập mã") ? "warning" : "text", line)}</Text>
      ))}
      {inputMode === "input" ? (
        <>
          <Text> </Text>
          <TextInput value={inputValue} onChange={setInputValue} onSubmit={submitInput} onEscape={cancel} />
          <Text>{t.fg("dim", "(Enter để gửi · Esc để hủy)")}</Text>
        </>
      ) : null}
      <Text> </Text>
      <Text>{t.fg("dim", "(Esc để hủy)")}</Text>
      <DynamicBorder />
    </Box>
  );
};
