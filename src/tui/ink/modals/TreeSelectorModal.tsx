/** @jsxImportSource react */
import React, { useEffect, useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import type { AgentSessionRuntimeInterface } from '../../../runtime.js';
import { useTheme } from '../hooks/useTheme.js';
import { Modal } from './Modal.js';

interface TreeSelectorModalProps {
  runtime: AgentSessionRuntimeInterface;
  onClose: () => void;
  onSelect?: (branchId: string) => Promise<void> | void;
}

interface FlatNode {
  entry: any;
  indent: number;
  isLast: boolean;
  label?: string;
}

/**
 * Modal for selecting a tree branch to navigate to.
 * Displays hierarchical tree with labels, highlights current leaf.
 */
export const TreeSelectorModal: React.FC<TreeSelectorModalProps> = ({ runtime, onClose, onSelect }) => {
  const { theme } = useTheme();
  const [flatNodes, setFlatNodes] = useState<FlatNode[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentLeafId, setCurrentLeafId] = useState<string | null>(null);

  // Flatten the tree into a list with indentation
  const buildFlatTree = useCallback((roots: any[]): FlatNode[] => {
    const result: FlatNode[] = [];

    const flatten = (nodes: any[], indent: number, isLastSibling: boolean[]) => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const isLast = i === nodes.length - 1;
        const label = node.label;
        result.push({
          entry: node.entry,
          indent,
          isLast,
          label,
        });

        // Recurse into children
        if (node.children && node.children.length > 0) {
          flatten(node.children, indent + 1, [...isLastSibling, isLast]);
        }
      }
    };

    flatten(roots, 0, []);
    return result;
  }, []);

  useEffect(() => {
    try {
      const session = (runtime.session as any);
      if (session?.sessionManager?.getTree) {
        const tree = session.sessionManager.getTree();
        const leafId = session.sessionManager.getLeafId();
        const flat = buildFlatTree(tree);
        setFlatNodes(flat);
        setCurrentLeafId(leafId);

        // Select current leaf by default if visible, otherwise first entry
        const currentIdx = flat.findIndex(node => node.entry.id === leafId);
        setSelectedIndex(currentIdx >= 0 ? currentIdx : 0);
      }
    } catch (err) {
      console.error('Tree load error:', err);
      setFlatNodes([]);
    }
  }, [runtime, buildFlatTree]);

  const handleKey = (input: string, key: any) => {
    if (key.escape) {
      onClose();
      return;
    }

    if (key.return) {
      const selected = flatNodes[selectedIndex];
      if (selected && onSelect) {
        onSelect(selected.entry.id);
      }
      onClose();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex(prev => Math.min(flatNodes.length - 1, prev + 1));
      return;
    }
  };

  useInput(handleKey);

  // Render tree lines with proper indentation
  const renderNode = (node: FlatNode, idx: number) => {
    const isSelected = idx === selectedIndex;
    const isCurrent = node.entry.id === currentLeafId;
    const indentStr = '   '.repeat(node.indent);
    const connector = isSelected ? '> ' : (node.isLast ? '└─ ' : '├─ ');
    const fullIndent = indentStr + connector;

    // Build display text: include label if present
    let displayText = node.entry.id.slice(0, 8);
    if (node.label) {
      displayText += ` (${node.label})`;
    } else if (node.entry.type === 'message') {
      // Preview from message content
      const msg = node.entry.message;
      if (msg?.content) {
        if (Array.isArray(msg.content)) {
          const textBlock = msg.content.find((c: any) => c.type === 'text');
          if (textBlock?.text) {
            const preview = textBlock.text.trim().replace(/\n/g, ' ').slice(0, 40);
            displayText += `: ${preview}${textBlock.text.length > 40 ? '…' : ''}`;
          }
        } else if (typeof msg.content === 'string') {
          const preview = msg.content.trim().replace(/\n/g, ' ').slice(0, 40);
          displayText += `: ${preview}${msg.content.length > 40 ? '…' : ''}`;
        }
      }
    }

    const textColor = isSelected ? theme.selectedForeground || 'white' : (isCurrent ? theme.accent : theme.foreground);
    const bgColor = isSelected ? theme.selectedBackground : undefined;

    return (
      <Box key={node.entry.id}>
        <Text color={textColor} backgroundColor={bgColor}>
          {fullIndent}
          <Text bold={isCurrent}>{displayText}</Text>
        </Text>
      </Box>
    );
  };

  return (
    <Modal onClose={onClose}>
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1} width={80}>
        <Text bold color="cyan">Session Tree Navigation</Text>
        <Text dim size={11}>Current leaf is highlighted; press Enter to navigate (summarization options follow)</Text>
        <Box flexDirection="column" marginTop={1}>
          {flatNodes.length === 0 ? (
            <Text color="muted">No tree entries found</Text>
          ) : (
            flatNodes.map((node, idx) => renderNode(node, idx))
          )}
        </Box>
        {flatNodes.length > 0 && (
          <Text dim> ({selectedIndex + 1}/{flatNodes.length})</Text>
        )}
        <Box marginTop={1}>
          <Text dim>↑↓ navigate · Enter select · Esc cancel</Text>
        </Box>
      </Box>
    </Modal>
  );
};
