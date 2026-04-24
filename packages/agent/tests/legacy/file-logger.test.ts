/**
 * Tests for file-logger.ts - File logging
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { FileLogger, createFileLogger } from '../src/file-logger.js';
import type { AgentEvent, AgentStartEvent } from '../src/types.js';

describe('FileLogger', () => {
  let logger: FileLogger;
  let testLogDir: string;

  beforeEach(() => {
    testLogDir = path.join(process.cwd(), '.test-logs-' + Date.now());
    logger = new FileLogger({
      logDir: testLogDir,
      maxFileSize: 1000, // 1KB for easier rotation testing
      maxFiles: 3,
      timestamps: true,
      format: 'json',
    });
  });

  afterEach(async () => {
    // Clean up test log directory
    if (fs.existsSync(testLogDir)) {
      fs.rmSync(testLogDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create logger with default config', () => {
      const fl = new FileLogger();
      expect(fl).toBeDefined();
    });

    it('should accept custom config with writable dir', async () => {
      const fl = new FileLogger({
        logDir: testLogDir,
      });
      await fl.init();
      expect(fl).toBeDefined();
    });
  });

  describe('init', () => {
    it('should create log directory if not exists', async () => {
      await logger.init();
      expect(fs.existsSync(testLogDir)).toBe(true);
    });

    it('should create log file', async () => {
      await logger.init();
      const logFile = logger.getLogFilePath();
      expect(logFile).toBeTruthy();
    });
  });

  describe('getLogFilePath', () => {
    it('should return null before init', () => {
      expect(logger.getLogFilePath()).toBeNull();
    });

    it('should return path after init', async () => {
      await logger.init();
      expect(logger.getLogFilePath()).toBeTruthy();
    });
  });

  describe('close', () => {
    it('should close without error', async () => {
      await logger.init();
      await logger.close();
    });
  });
});

describe('createFileLogger', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(process.cwd(), '.test-create-logs-' + Date.now());
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should create and initialize logger', () => {
    const logger = createFileLogger({ logDir: testDir });
    expect(logger).toBeDefined();
  });
});