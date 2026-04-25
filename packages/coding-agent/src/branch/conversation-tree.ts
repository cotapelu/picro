/**
 * Conversation Tree
 * Branching conversation history with tree structure
 */
import { randomUUID } from 'crypto';

export interface MessageNode {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  parentId: string | null;
  childrenIds: string[];
  metadata?: {
    model?: string;
    provider?: string;
    usage?: {
      input: number;
      output: number;
      cost: number;
    };
  };
}

export interface ConversationBranch {
  id: string;
  name: string;
  rootId: string;
  currentNodeId: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

/**
 * Tree-based conversation manager
 */
export class ConversationTree {
  private nodes: Map<string, MessageNode> = new Map();
  private branches: Map<string, ConversationBranch> = new Map();
  private activeBranchId: string = '';

  /**
   * Create new conversation tree
   */
  static create(): ConversationTree {
    const tree = new ConversationTree();
    const mainBranch = tree.createBranch('main', 'Main Conversation');
    tree.activeBranchId = mainBranch.id;
    return tree;
  }

  /**
   * Create a new branch from a specific node
   */
  forkBranch(fromNodeId: string, name: string): ConversationBranch {
    const branch: ConversationBranch = {
      id: randomUUID(),
      name: name || `Branch ${this.branches.size + 1}`,
      rootId: fromNodeId,
      currentNodeId: fromNodeId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 0,
    };

    this.branches.set(branch.id, branch);
    return branch;
  }

  /**
   * Create branch
   */
  createBranch(id: string, name: string): ConversationBranch {
    const branch: ConversationBranch = {
      id,
      name,
      rootId: '',
      currentNodeId: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 0,
    };
    this.branches.set(id, branch);
    return branch;
  }

  /**
   * Add message to current branch
   */
  addMessage(role: MessageNode['role'], content: string, metadata?: MessageNode['metadata']): MessageNode {
    const branch = this.getCurrentBranch();
    if (!branch) throw new Error('No active branch');

    const node: MessageNode = {
      id: randomUUID(),
      role,
      content,
      timestamp: Date.now(),
      parentId: branch.currentNodeId || null,
      childrenIds: [],
      metadata,
    };

    // Link to parent
    if (branch.currentNodeId) {
      const parent = this.nodes.get(branch.currentNodeId);
      if (parent) {
        parent.childrenIds.push(node.id);
      }
    } else {
      branch.rootId = node.id;
    }

    this.nodes.set(node.id, node);
    branch.currentNodeId = node.id;
    branch.updatedAt = Date.now();
    branch.messageCount++;

    return node;
  }

  /**
   * Switch to a different branch
   */
  switchBranch(branchId: string): boolean {
    if (!this.branches.has(branchId)) return false;
    this.activeBranchId = branchId;
    return true;
  }

  /**
   * Get message history for current branch
   */
  getCurrentHistory(): MessageNode[] {
    const branch = this.getCurrentBranch();
    if (!branch) return [];

    const history: MessageNode[] = [];
    let currentId: string | null = branch.currentNodeId;

    while (currentId) {
      const node = this.nodes.get(currentId);
      if (!node) break;
      history.unshift(node);
      currentId = node.parentId;
    }

    return history;
  }

  /**
   * Get all branches
   */
  getBranches(): ConversationBranch[] {
    return Array.from(this.branches.values())
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Get current branch
   */
  getCurrentBranch(): ConversationBranch | undefined {
    return this.branches.get(this.activeBranchId);
  }

  /**
   * Get active branch ID
   */
  getActiveBranchId(): string {
    return this.activeBranchId;
  }

  /**
   * Rename branch
   */
  renameBranch(branchId: string, newName: string): boolean {
    const branch = this.branches.get(branchId);
    if (!branch) return false;
    branch.name = newName;
    branch.updatedAt = Date.now();
    return true;
  }

  /**
   * Delete branch (cannot delete main)
   */
  deleteBranch(branchId: string): boolean {
    if (branchId === 'main') return false;
    const deleted = this.branches.delete(branchId);
    if (deleted && this.activeBranchId === branchId) {
      this.activeBranchId = 'main';
    }
    return deleted;
  }

  /**
   * Generate tree visualization
   */
  generateTreeView(): string {
    const lines: string[] = [];
    const branches = this.getBranches();
    
    lines.push('🌳 Conversation Branches:');
    lines.push('');

    for (const branch of branches) {
      const active = branch.id === this.activeBranchId ? ' ⭐' : '';
      lines.push(`  ${branch.id === 'main' ? '📁' : '🌿'} ${branch.name} (${branch.messageCount} messages)${active}`);
    }

    return lines.join('\n');
  }

  /**
   * Export to JSON
   */
  toJSON(): object {
    return {
      activeBranchId: this.activeBranchId,
      nodes: Array.from(this.nodes.entries()),
      branches: Array.from(this.branches.entries()),
    };
  }
}
