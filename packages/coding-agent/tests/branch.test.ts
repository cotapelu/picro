import { describe, it, expect, beforeEach } from 'vitest';
import { ConversationTree } from '../src/branch/conversation-tree.js';

describe('ConversationTree', () => {
  let tree: ConversationTree;

  beforeEach(() => {
    tree = ConversationTree.create();
  });

  describe('creation', () => {
    it('creates with main branch', () => {
      const branches = tree.getBranches();
      expect(branches).toHaveLength(1);
      expect(branches[0].name).toBe('Main Conversation');
    });

    it('sets main as active', () => {
      expect(tree.getActiveBranchId()).toBe('main');
    });
  });

  describe('addMessage', () => {
    it('adds messages to current branch', () => {
      tree.addMessage('user', 'Hello');
      tree.addMessage('assistant', 'Hi there!');
      
      const history = tree.getCurrentHistory();
      expect(history).toHaveLength(2);
      expect(history[0].role).toBe('user');
      expect(history[1].role).toBe('assistant');
    });

    it('increments message count', () => {
      const before = tree.getCurrentBranch()!.messageCount;
      tree.addMessage('user', 'Test');
      const after = tree.getCurrentBranch()!.messageCount;
      expect(after).toBe(before + 1);
    });

    it('generates unique IDs', () => {
      const msg1 = tree.addMessage('user', 'First');
      const msg2 = tree.addMessage('user', 'Second');
      expect(msg1.id).not.toBe(msg2.id);
    });
  });

  describe('forkBranch', () => {
    it('creates new branch from node', () => {
      const msg = tree.addMessage('user', 'Hello');
      const branch = tree.forkBranch(msg.id, 'Alternative');
      
      expect(branch.name).toBe('Alternative');
      expect(branch.rootId).toBe(msg.id);
      expect(tree.getBranches()).toHaveLength(2);
    });

    it('allows switching to new branch', () => {
      const msg = tree.addMessage('user', 'Hello');
      const branch = tree.forkBranch(msg.id, 'Test');
      
      const switched = tree.switchBranch(branch.id);
      expect(switched).toBe(true);
      expect(tree.getActiveBranchId()).toBe(branch.id);
    });
  });

  describe('switchBranch', () => {
    it('fails for non-existent branch', () => {
      expect(tree.switchBranch('invalid')).toBe(false);
    });

    it('succeeds for existing branch', () => {
      const msg = tree.addMessage('user', 'Hello');
      const branch = tree.forkBranch(msg.id, 'Branch');
      
      expect(tree.switchBranch(branch.id)).toBe(true);
    });
  });

  describe('getCurrentHistory', () => {
    it('returns empty for new branch without messages', () => {
      expect(tree.getCurrentHistory()).toHaveLength(0);
    });

    it('returns messages in order', () => {
      tree.addMessage('system', 'Welcome');
      tree.addMessage('user', 'Hello');
      tree.addMessage('assistant', 'Hi!');
      
      const history = tree.getCurrentHistory();
      expect(history.map(m => m.role)).toEqual(['system', 'user', 'assistant']);
    });
  });

  describe('renameBranch', () => {
    it('renames existing branch', () => {
      const renamed = tree.renameBranch('main', 'Primary');
      expect(renamed).toBe(true);
      expect(tree.getCurrentBranch()!.name).toBe('Primary');
    });

    it('fails for non-existent branch', () => {
      expect(tree.renameBranch('invalid', 'Name')).toBe(false);
    });
  });

  describe('deleteBranch', () => {
    it('deletes non-main branch', () => {
      const msg = tree.addMessage('user', 'Hello');
      const branch = tree.forkBranch(msg.id, 'Temp');
      
      const deleted = tree.deleteBranch(branch.id);
      expect(deleted).toBe(true);
      expect(tree.getBranches()).toHaveLength(1);
    });

    it('cannot delete main branch', () => {
      expect(tree.deleteBranch('main')).toBe(false);
    });

    it('switches to main when deleting active', () => {
      const msg = tree.addMessage('user', 'Hello');
      const branch = tree.forkBranch(msg.id, 'Active');
      tree.switchBranch(branch.id);
      
      tree.deleteBranch(branch.id);
      expect(tree.getActiveBranchId()).toBe('main');
    });
  });

  describe('generateTreeView', () => {
    it('generates branch list', () => {
      const view = tree.generateTreeView();
      expect(view).toContain('🌳 Conversation Branches:');
      expect(view).toContain('Main Conversation');
    });

    it('shows all branches', () => {
      const msg = tree.addMessage('user', 'Hello');
      tree.forkBranch(msg.id, 'Alt1');
      tree.forkBranch(msg.id, 'Alt2');
      
      const view = tree.generateTreeView();
      expect(view).toContain('Alt1');
      expect(view).toContain('Alt2');
    });
  });
});
