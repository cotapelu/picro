// SPDX-License-Identifier: Apache-2.0
/**
 * Unit tests for slash commands.
 */

import { describe, it, expect } from 'vitest';
import { getSlashCommand, listSlashCommands, BUILTIN_SLASH_COMMANDS } from './slash-commands';

describe('Slash Commands', () => {
  describe('BUILTIN_SLASH_COMMANDS', () => {
    it('should contain common commands', () => {
      const names = BUILTIN_SLASH_COMMANDS.map(c => c.name);
      expect(names).toContain('settings');
      expect(names).toContain('model');
      expect(names).toContain('new');
      expect(names).toContain('quit');
      expect(names).toContain('compact');
      expect(names).toContain('fork');
      expect(names).toContain('tree');
    });

    it('should have description for each command', () => {
      for (const cmd of BUILTIN_SLASH_COMMANDS) {
        expect(cmd.description).toBeDefined();
        expect(cmd.description.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getSlashCommand', () => {
    it('should return command info for known command', () => {
      const cmd = getSlashCommand('settings');
      expect(cmd).toBeDefined();
      expect(cmd!.name).toBe('settings');
    });

    it('should return undefined for unknown command', () => {
      const cmd = getSlashCommand('unknown');
      expect(cmd).toBeUndefined();
    });
  });

  describe('listSlashCommands', () => {
    it('should return all builtin commands', () => {
      const cmds = listSlashCommands();
      expect(cmds.length).toBe(BUILTIN_SLASH_COMMANDS.length);
    });
  });
});
