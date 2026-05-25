import clipboard from "clipboardy";
async function copyToClipboard(text) {
  try {
    await clipboard.write(text);
  } catch (err) {
    console.error("Failed to copy to clipboard:", err);
    throw err;
  }
}
export {
  copyToClipboard
};
