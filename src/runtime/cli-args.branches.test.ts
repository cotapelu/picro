// SPDX-License-Identifier: Apache-2.0
/**
 * Branch coverage tests for cli-args parsing.
 */

import { describe, it, expect } from 'vitest';
import { parseArgs } from './cli-args.js';

describe('cli-args - parseArgs branch coverage', () => {
  it('handles unknown short flag with error diagnostic', () => {
    const args = parseArgs(['-z']);
    expect(args.diagnostics).toHaveLength(1);
    expect(args.diagnostics[0].type).toBe('error');
    expect(args.diagnostics[0].message).toContain('-z');
  });

  it('parses --list-models with value', () => {
    const args = parseArgs(['--list-models', 'searchterm']);
    expect(args.listModels).toBe('searchterm');
  });

  it('parses --list-models without value', () => {
    const args = parseArgs(['--list-models']);
    expect(args.listModels).toBe(true);
  });

  it('parses --tools comma-separated list', () => {
    const args = parseArgs(['--tools', 'read,write,bash']);
    expect(args.tools).toEqual(['read', 'write', 'bash']);
  });

  it('parses --models comma-separated list', () => {
    const args = parseArgs(['--models', 'm1,m2,m3']);
    expect(args.models).toEqual(['m1', 'm2', 'm3']);
  });

  it('parses --no-prompt-templates flag', () => {
    const args = parseArgs(['--no-prompt-templates']);
    expect(args.noPromptTemplates).toBe(true);
  });

  it('parses --no-themes flag', () => {
    const args = parseArgs(['--no-themes']);
    expect(args.noThemes).toBe(true);
  });

  it('parses --no-skills flag', () => {
    const args = parseArgs(['--no-skills']);
    expect(args.noSkills).toBe(true);
  });

  it('parses --no-extensions flag', () => {
    const args = parseArgs(['--no-extensions']);
    expect(args.noExtensions).toBe(true);
  });

  it('parses --extension and adds to array', () => {
    const args = parseArgs(['--extension', 'ext1', '--extension', 'ext2']);
    expect(args.extensions).toEqual(['ext1', 'ext2']);
  });

  it('parses --skill and adds to array', () => {
    const args = parseArgs(['--skill', 'skill1']);
    expect(args.skills).toEqual(['skill1']);
  });

  it('parses --prompt-template and adds to array', () => {
    const args = parseArgs(['--prompt-template', 'tpl1', '--prompt-template', 'tpl2']);
    expect(args.promptTemplates).toEqual(['tpl1', 'tpl2']);
  });

  it('parses --theme and adds to array', () => {
    const args = parseArgs(['--theme', 'theme1']);
    expect(args.themes).toEqual(['theme1']);
  });

  it('parses --export with value', () => {
    const args = parseArgs(['--export', 'out.html']);
    expect(args.export).toBe('out.html');
  });

  it('ignores --export when missing value', () => {
    const args = parseArgs(['--export']);
    expect(args.export).toBeUndefined();
  });

  it('handles invalid thinking level with warning diagnostic', () => {
    const args = parseArgs(['--thinking', 'ultra']);
    expect(args.thinking).toBeUndefined();
    expect(args.diagnostics.some(d => d.type === 'warning' && d.message.includes('Invalid thinking level'))).toBe(true);
  });

  it('ignores invalid mode without diagnostic', () => {
    const args = parseArgs(['--mode', 'invalid']);
    expect(args.mode).toBeUndefined();
  });

  it('handles unknown flag with equals sign', () => {
    const args = parseArgs(['--myflag=somevalue']);
    expect(args.unknownFlags.get('--myflag')).toBe('somevalue');
  });

  it('handles unknown flag without value', () => {
    const args = parseArgs(['--standalone']);
    expect(args.unknownFlags.get('--standalone')).toBe(true);
  });

  it('handles unknown flag with separate value', () => {
    const args = parseArgs(['--unknown', 'value']);
    expect(args.unknownFlags.get('--unknown')).toBe('value');
  });

  it('treats arguments with dot as fileArgs', () => {
    const args = parseArgs(['file.txt', 'dir/file2.md']);
    expect(args.fileArgs).toEqual(['file.txt', 'dir/file2.md']);
  });

  it('treats arguments without dot as messages', () => {
    const args = parseArgs(['hello', 'world']);
    expect(args.messages).toEqual(['hello', 'world']);
  });

  it('handles mixed messages and fileArgs', () => {
    const args = parseArgs(['msg1', 'file.txt', 'msg2']);
    expect(args.messages).toEqual(['msg1', 'msg2']);
    expect(args.fileArgs).toEqual(['file.txt']);
  });

  it('handles --no-session flag', () => {
    const args = parseArgs(['--no-session']);
    expect(args.noSession).toBe(true);
  });

  it('handles --offline flag', () => {
    const args = parseArgs(['--offline']);
    expect(args.offline).toBe(true);
  });

  it('handles --continue flag', () => {
    const args = parseArgs(['-c']);
    expect(args['continue']).toBe(true);
  });

  it('handles --resume flag', () => {
    const args = parseArgs(['-r']);
    expect(args.resume).toBe(true);
  });

  it('handles --version flag', () => {
    const args = parseArgs(['--version']);
    expect(args.version).toBe(true);
  });

  it('handles --help flag', () => {
    const args = parseArgs(['-h']);
    expect(args.help).toBe(true);
  });

  it('handles --no-session and other flags together', () => {
    const args = parseArgs(['--no-session', '--mode', 'json', 'message']);
    expect(args.noSession).toBe(true);
    expect(args.mode).toBe('json');
    expect(args.messages).toEqual(['message']);
  });
});
