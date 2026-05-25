function sanitizeAndTruncate(text, maxLength = 1e4) {
  const ansiRegex = /\x1b\[[0-9;]*m/g;
  const cleaned = text.replace(ansiRegex, "");
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength) + `... (truncated, full length ${cleaned.length})`;
}
export {
  sanitizeAndTruncate
};
