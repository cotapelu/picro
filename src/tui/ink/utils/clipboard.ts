import clipboard from 'clipboardy';

export async function copyToClipboard(text: string): Promise<void> {
  try {
    await clipboard.write(text);
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    throw err;
  }
}
