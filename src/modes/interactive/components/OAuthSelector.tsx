// OAuthSelector - chọn nhà cung cấp và phương thức xác thực
// Bắt chước nguyên tắc pi-mono components/oauth-selector.ts:
//   - Mỗi nhà cung cấp có thể hiện nhiều phương thức (oauth / api_key)
//   - Hậu tố mô tả trạng thái: "✓ configured", "env: XXX", "• not configured"
//   - Đánh dấu ✦ cho nhà cung cấp đối tác
//   - Ô tìm kiếm lọc mờ; nhà cung cấp đối tác được tô màu thương hiệu
// Port sang Ink TSX, khon copy code truc iep.

import React, { useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import { getTheme } from "../theme/theme.js";
import { DynamicBorder } from "../../../tui/ink/components/DynamicBorder.js";
import { TextInput } from "../../../tui/ink/components/TextInput.js";
import { fuzzyFilter } from "../../../tui/ink/core/Fuzzy.js";
import { getProviderBrandStyle } from "./provider-brand.js";

export type AuthType = "oauth" | "api_key";

export interface AuthSelectorProvider {
  id: string;
  name: string;
  authType: AuthType;
  /** Tên phương thức (vd "API key", "OAuth"). */
  methodName?: string;
  status?: { type: AuthType; source?: string };
  /** Đăng nhập subscription hay account. */
  subscription?: boolean;
  /** Nhà cung cấp đối tác. */
  preferred?: boolean;
}

export function formatAuthType(type: AuthType, subscription?: boolean): string {
  if (type === "api_key") return "API key";
  return subscription === false ? "account" : "subscription";
}

/** Hậu tố mô tả cách nhà cung cấp đã được cấu hình. */
export function formatAuthStatus(provider: AuthSelectorProvider): string {
  const t = getTheme();
  if (!provider.status) return t.fg("muted", " • chưa cấu hình");
  if (provider.status.type !== provider.authType) {
    const label = `${formatAuthType(provider.status.type, provider.subscription)} đã cấu hình`;
    return `${t.fg("muted", " • ")}${t.fg("warning", label)}`;
  }
  const source = provider.status.source;
  if (!source || source === "OAuth" || source === "stored credential") {
    return t.fg("success", " ✓ đã cấu hình");
  }
  const isEnv = /^[A-Z][A-Z0-9_]*(?:, [A-Z][A-Z0-9_]*)*$/.test(source);
  return t.fg("success", ` ✓ ${isEnv ? `env: ${source}` : source}`);
}

const MAX_VISIBLE = 8;

export const OAuthSelector: React.FC<{
  mode: "login" | "logout";
  providers: AuthSelectorProvider[];
  onSelect: (providerId: string, authType: AuthType) => void;
  onCancel: () => void;
  initialSearch?: string;
  width?: number;
}> = ({ mode, providers, onSelect, onCancel, initialSearch, width = 80 }) => {
  const t = getTheme();
  const [query, setQuery] = useState(initialSearch ?? "");
  const [selected, setSelected] = useState(0);
  const showTypes = useMemo(() => new Set(providers.map((p) => p.authType)).size > 1, [providers]);

  const filtered = useMemo(
    () =>
      query.trim()
        ? fuzzyFilter(providers, query, (p) => `${p.name} ${p.id} ${p.authType} ${p.methodName ?? ""}`)
        : providers,
    [providers, query],
  );

  const clamped = Math.max(0, Math.min(selected, filtered.length - 1));
  const start = Math.max(0, Math.min(clamped - Math.floor(MAX_VISIBLE / 2), filtered.length - MAX_VISIBLE));
  const visible = filtered.slice(start, start + MAX_VISIBLE);

  useInput((data, key) => {
    if (matchesEscape(data, key)) {
      onCancel();
      return;
    }
    if (key.return) {
      const provider = filtered[clamped];
      if (provider) onSelect(provider.id, provider.authType);
      return;
    }
    if (key.upArrow) setSelected((i) => (i <= 0 ? filtered.length - 1 : i - 1));
    if (key.downArrow) setSelected((i) => (i >= filtered.length - 1 ? 0 : i + 1));
    if (key.backspace) setQuery((q) => q.slice(0, -1));
    if (data.length === 1 && !key.ctrl && data.charCodeAt(0) >= 32) setQuery((q) => q + data);
  });

  const title = mode === "login" ? "Chọn nhà cung cấp để cấu hình:" : "Chọn nhà cung cấp để đăng xuất:";

  return (
    <Box flexDirection="column" width={width}>
      <DynamicBorder />
      <Text bold>{t.fg("accent", title)}</Text>
      <Text> </Text>
      <TextInput value={query} placeholder="Tìm nhà cung cấp…" onChange={setQuery} />
      <Text> </Text>
      {visible.length === 0 ? (
        <Text>{t.fg("muted", "  Không có nhà cung cấp")}</Text>
      ) : (
        visible.map((provider, offset) => {
          const index = start + offset;
          const isSelected = index === clamped;
          const cursor = isSelected ? t.fg("accent", "→ ") : "  ";
          const partner = provider.preferred ? t.fg("muted", " ✦") : "";
          const typeLabel = showTypes
            ? t.fg("muted", ` [${formatAuthType(provider.authType, provider.subscription)}]`)
            : "";
          const status = formatAuthStatus(provider);
          const name = isSelected ? t.fg("accent", provider.name) : t.fg("text", provider.name);
          return (
            <Text key={`${provider.id}-${provider.authType}`}>
              {cursor}
              {name}
              {partner}
              {typeLabel}
              {status}
            </Text>
          );
        })
      )}
      {start > 0 || visible.length < filtered.length ? (
        <Text>{t.fg("muted", `  (${clamped + 1}/${filtered.length})`)}</Text>
      ) : null}
      <Text> </Text>
      <DynamicBorder />
    </Box>
  );
};

function matchesEscape(data: string, key: { ctrl?: boolean; meta?: boolean }): boolean {
  return data === "\u001b" && !key.ctrl && !key.meta;
}
