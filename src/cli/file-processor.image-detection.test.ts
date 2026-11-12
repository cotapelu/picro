// SPDX-License-Identifier: Apache-2.0
/**
 * Image detection for @file arguments.
 *
 * The magic-number table matched WebP on its bare "RIFF" prefix, which every
 * RIFF container shares (WAV audio, AVI video, ...). A @sound.wav argument was
 * therefore reported as an image, base64-encoded and sent to the model as an
 * image block instead of being attached as text.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { processFileArguments } from './file-processor.js';

let cwd: string;
let previousCwd: string;

beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), 'picro-fileproc-'));
  previousCwd = process.cwd();
  process.chdir(cwd);
});

afterEach(() => {
  process.chdir(previousCwd);
  rmSync(cwd, { recursive: true, force: true });
});

function riff(fourCC: string, bodyLength = 16): Buffer {
  return Buffer.concat([
    Buffer.from('RIFF'),
    Buffer.from([0x24, 0x00, 0x00, 0x00]),
    Buffer.from(fourCC),
    Buffer.alloc(bodyLength),
  ]);
}

describe('processFileArguments - image detection', () => {
  it('recognises a real WebP file', async () => {
    writeFileSync(join(cwd, 'pic.webp'), riff('WEBP'));
    const result = await processFileArguments(['pic.webp']);
    expect(result.images).toHaveLength(1);
    expect(result.images[0]!.mimeType).toBe('image/webp');
  });

  it('does not treat a RIFF/WAV file as an image', async () => {
    writeFileSync(join(cwd, 'sound.wav'), riff('WAVE'));
    const result = await processFileArguments(['sound.wav']);
    expect(result.images).toHaveLength(0);
  });

  it('does not treat a RIFF/AVI file as an image', async () => {
    writeFileSync(join(cwd, 'clip.avi'), riff('AVI '));
    const result = await processFileArguments(['clip.avi']);
    expect(result.images).toHaveLength(0);
  });

  it('recognises PNG, JPEG and GIF by magic number', async () => {
    writeFileSync(join(cwd, 'a.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]));
    writeFileSync(join(cwd, 'b.jpg'), Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]));
    writeFileSync(join(cwd, 'c.gif'), Buffer.from('GIF89a'));

    expect((await processFileArguments(['a.png'])).images[0]!.mimeType).toBe('image/png');
    expect((await processFileArguments(['b.jpg'])).images[0]!.mimeType).toBe('image/jpeg');
    expect((await processFileArguments(['c.gif'])).images[0]!.mimeType).toBe('image/gif');
  });

  it('attaches text files as text, not images', async () => {
    writeFileSync(join(cwd, 'notes.txt'), 'hello');
    const result = await processFileArguments(['notes.txt']);
    expect(result.images).toHaveLength(0);
    expect(result.text).toContain('hello');
  });
});
