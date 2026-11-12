// Mermaid - thay khối mã mermaid bằng sơ đồ Unicode trong terminal
// Bắt chước nguyên tắc pi-mono components/mermaid.ts:
//   - Mỗi dòng sơ đồ bọc trong code span để giữ khoảng trắng và ký tự khung
//   - Chọn dấu backtick dài hơn mọi run backtick trong nội dung
//   - Dùng non-breaking space cho dòng trống để giữ chiều cao
//   - Chỉ render cho user/assistant/summary, không render khi đang stream
//     (trừ chế độ streaming) và khi chế độ off
//   - Sơ đồ quá rộng hoặc lỗi: giữ nguyên khối mã gốc
// Port sang TSX riêng, khon copy code truc iep.

import type { MarkdownTransformer } from "./markdown-transform.js";

export interface MermaidRenderResult {
  plain: string[];
  styled?: unknown[];
  width: number;
  warnings: string[];
}

export interface MermaidRenderer {
  render(source: string): MermaidRenderResult | undefined;
}

export interface CreateMermaidTransformerOptions {
  getMode: () => "off" | "on" | "streaming";
  /** Bộ render sơ đồ bên ngoài (lovely-mermaid hoặc tương đương). */
  renderer?: MermaidRenderer;
  /** Màu cho khung, chữ, cạnh, tiêu đề sơ đồ. */
  theme?: {
    border?: string;
    text?: string;
    edge?: string;
    title?: string;
  };
}

/** Bọc một dòng trong code span, chọn fence dài đủ. */
function codeSpan(line: string): string {
  const content = line || "\u00a0";
  const longestRun = Math.max(0, ...Array.from(content.matchAll(/`+/g), (m) => m[0]!.length));
  const fence = "`".repeat(longestRun + 1);
  const padding = content.startsWith("`") || content.endsWith("`") ? " " : "";
  return `${fence}${padding}${content}${padding}${fence}`;
}

/** Tạo transformer thay khối mermaid bằng sơ đồ. */
export function createMermaidMarkdownTransformer(options: CreateMermaidTransformerOptions): MarkdownTransformer {
  return (markdown, context) => {
    const mode = options.getMode();
    if (mode === "off") return markdown;
    if (context.messageType !== "user" && context.messageType !== "assistant" && context.messageType !== "summary") {
      return markdown;
    }
    if (context.isStreaming && mode !== "streaming") return markdown;
    if (!options.renderer) return markdown;

    // Tách khối mã mermaid ở cấp cao cùng.
    //
    // split(/```/) yields [before, inside1, between1, inside2, between2, ...]:
    // even indices are outside any fence, odd indices are fence content. The old
    // code toggled a boolean and re-emitted only the OPENING fence of a
    // non-mermaid block, so that block's closing fence was never written and
    // everything after it rendered as code (the mermaid diagram also swallowed
    // the following separator). Parity makes the structure explicit, and every
    // consumed fence is re-emitted.
    const blocks = markdown.split(/```/);
    const out: string[] = [];
    blocks.forEach((block, index) => {
      const insideFence = index % 2 === 1;
      if (!insideFence) {
        out.push(block);
        return;
      }
      const firstLine = block.split("\n", 1)[0] ?? "";
      const isMermaid = firstLine.trim().split(/\s+/)[0]?.toLowerCase() === "mermaid";
      if (!isMermaid) {
        out.push("```", block, "```");
        return;
      }
      const source = block.slice(firstLine.length).replace(/^\n/, "");
      const art = options.renderer!.render(source);
      if (!art || art.width > context.availableWidth) {
        out.push("```", block, "```");
        return;
      }
      if (!context.isStreaming && art.warnings.length > 0) {
        const suffix = art.warnings.length > 1 ? ` (+${art.warnings.length - 1} more)` : "";
        const warning = `Sơ đồ không render: ${art.warnings[0]}${suffix}`;
        out.push("```", block, "```", "\n", codeSpan(warning), "  \n");
        return;
      }
      const lines = art.plain;
      out.push(`${lines.map(codeSpan).join("  \n")}\n`);
    });
    return out.join("");
  };
}
