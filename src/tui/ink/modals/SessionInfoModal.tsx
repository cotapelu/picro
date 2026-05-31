/** @jsxImportSource react */
import React, { useEffect, useState, useCallback } from 'react';
import { Box, Text, useInput, useFocus } from 'ink';
import type { AgentSessionRuntimeInterface } from '../../../runtime.js';
import { useTheme } from '../hooks/useTheme.js';
import { Modal } from './Modal.js';

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

interface SessionInfoModalProps {
  runtime: AgentSessionRuntimeInterface;
  onClose: () => void;
}

export const SessionInfoModal: React.FC<SessionInfoModalProps> = ({ runtime, onClose }) => {
  const { theme } = useTheme();
  // Auto-focus this modal
  const { setFocus } = useFocus();
  useEffect(() => { setFocus(); }, [setFocus]);
  const [stats, setStats] = useState<{
    id?: string;
    name?: string;
    messageCount: number;
    userMessages: number;
    assistantMessages: number;
    toolCalls: number;
    cwd: string;
    model?: string;
    thinkingLevel: string;
    tokens: { input: number; output: number; cacheRead: number; cacheWrite: number };
    cost: number;
    sessionFile?: string;
    performance?: { avgCpuUserMS: number; avgRSSMB: number; sampleCount: number };
  } | null>(null);

  const computeStats = useCallback(() => {
    const session = runtime.session as any;
    const sessionManager = session?.sessionManager;
    const messages = session?.messages || [];
    
    let userMsgs = 0, assistantMsgs = 0, toolCalls = 0;
    let tokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
    let cost = 0;

    for (const msg of messages) {
      if (msg.role === 'user') userMsgs++;
      else if (msg.role === 'assistant') {
        assistantMsgs++;
        const usage = msg.usage || {};
        tokens.input += usage.input || 0;
        tokens.output += usage.output || 0;
        tokens.cacheRead += usage.cacheRead || 0;
        tokens.cacheWrite += usage.cacheWrite || 0;
        if (usage.cost?.total) cost += usage.cost.total;
      }
      if (msg.toolCalls) toolCalls += msg.toolCalls.length;
    }

    let perfData;
    try {
      const perf = session?.getPerformanceStats?.();
      if (perf && perf.sampleCount > 0) {
        perfData = {
          avgCpuUserMS: perf.avgCpuUserMS,
          avgRSSMB: perf.avgRSSMB,
          sampleCount: perf.sampleCount,
        };
      }
    } catch {}

    return {
      id: session?.sessionId || session?.id,
      name: session?.sessionName,
      messageCount: messages.length,
      userMessages: userMsgs,
      assistantMessages: assistantMsgs,
      toolCalls,
      cwd: runtime.cwd,
      model: session?.model?.id || 'unknown',
      thinkingLevel: runtime.thinkingLevel || 'off',
      tokens,
      cost,
      sessionFile: session?.sessionFile,
      performance: perfData,
    };
  }, [runtime]);

  useEffect(() => {
    const data = computeStats();
    setStats(data);
    // Subscribe to changes? Could recompute on events; for now static on open
  }, [runtime, computeStats]);

  const handleKey = useCallback((input: string, key: any) => {
    if (key.escape) {
      onClose();
    }
  }, [onClose]);

  useInput(handleKey);

  if (!stats) {
    return (
      <Modal onClose={onClose}>
        <Box>
          <Text color="yellow">Loading session info...</Text>
        </Box>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1} width={60}>
        <Text bold color="cyan">Session Info</Text>
        <Box flexDirection="column" marginTop={1}>
          <Text>ID: {stats.id?.slice(0, 8)}...</Text>
          <Text>Name: {stats.name || '(unnamed)'}</Text>
          <Text>Session File: {stats.sessionFile || '(in-memory)'}</Text>
          <Text>Messages: {stats.messageCount} (user: {stats.userMessages}, assistant: {stats.assistantMessages})</Text>
          {stats.toolCalls > 0 && <Text>Tool Calls: {stats.toolCalls}</Text>}
          <Text>CWD: {stats.cwd}</Text>
          <Text>Model: {stats.model}</Text>
          <Text>Thinking: {stats.thinkingLevel}</Text>
          <Text>
            Tokens: in={formatNumber(stats.tokens.input)} out={formatNumber(stats.tokens.output)}
            {stats.tokens.cacheWrite > 0 && ` | cache: +${formatNumber(stats.tokens.cacheWrite)} -${formatNumber(stats.tokens.cacheRead)}`}
          </Text>
          {stats.cost > 0 && <Text color="yellow">Cost: ${stats.cost.toFixed(4)}</Text>}
          {stats.performance && (
            <Text>
              Perf: CPU {stats.performance.avgCpuUserMS.toFixed(1)}ms | RSS {stats.performance.avgRSSMB.toFixed(1)}MB
            </Text>
          )}
        </Box>
        <Box marginTop={1}>
          <Text dim>Press Esc to close</Text>
        </Box>
      </Box>
    </Modal>
  );
};

