// MarkdownRenderer - port ý tưởng từ pi-mono markdown-transform.ts
// Render markdown thành văn bản có màu sắc cho terminal
// Viết lại bằng Ink TSX, không copy code
import React from "react";
import { Box, Text } from "ink";
import { theme } from "../theme.js";

// Helper: tô màu cho code block
const codeBlockStyle = (text: string) => `\x1b[36m${text}\x1b[39m`; // cyan
const codeInlineStyle = (text: string) => `\x1b[36m${text}\x1b[39m`; // cyan
const boldStyle = (text: string) => `\x1b[1m${text}\x1b[22m`; // bold
const italicStyle = (text: string) => `\x1b[3m${text}\x1b[23m`; // italic
const headingStyle = (text: string) => `\x1b[1m${text}\x1b[22m`; // bold
const linkStyle = (text: string) => `\x1b[34m${text}\x1b[39m`; // blue
const listStyle = (text: string) => `\x1b[32m${text}\x1b[39m`; // green
const quoteStyle = (text: string) => `\x1b[2m${text}\x1b[22m`; // dim

// Parse markdown thành văn bản có màu ANSI
export function renderMarkdown(text: string): string {
  if (!text) return "";

  let result = text;

  // Code blocks (triple backticks) - phải xử lý trước
  result = result.replace(/```([\s\S]*?)```/g, (_match, code) => {
    return `\n${codeBlockStyle(code.trim())}\n`;
  });

  // Inline code (single backticks)
  result = result.replace(/`([^`]+)`/g, (_match, code) => {
    return codeInlineStyle(code);
  });

  // Headings (#, ##, ###)
  result = result.replace(/^#{1,3}\s+(.+)$/gm, (_match, text) => {
    return `\n${headingStyle(text.trim())}\n`;
  });

  // Bold (**text**)
  result = result.replace(/\*\*([^*]+)\*\*/g, (_match, text) => {
    return boldStyle(text);
  });

  // Italic (*text*)
  result = result.replace(/\*([^*]+)\*/g, (_match, text) => {
    return italicStyle(text);
  });

  // Links [text](url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, url) => {
    return linkStyle(text);
  });

  // Lists (- item, * item, + item)
  result = result.replace(/^[-*+]\s+(.+)$/gm, (_match, text) => {
    return `  ${listStyle("• " + text.trim())}`;
  });

  // Numbered lists (1. item, 2. item)
  result = result.replace(/^\d+\.\s+(.+)$/gm, (_match, text) => {
    return `  ${listStyle(text.trim())}`;
  });

  // Horizontal rule (---)
  result = result.replace(/^---$/gm, "\n" + "─".repeat(40) + "\n");

  // Blockquote (> text)
  result = result.replace(/^>\s+(.+)$/gm, (_match, text) => {
    return quoteStyle(text.trim());
  });

  // Xóa các thẻ HTML còn lại
  result = result.replace(/<[^>]*>/g, "");

  // Xóa dòng trống nhiều hơn 2
  result = result.replace(/\n{3,}/g, "\n\n");

  return result;
}

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const rendered = renderMarkdown(content);

  return (
    <Box padding={1}>
      <Text>{rendered}</Text>
    </Box>
  );
}
