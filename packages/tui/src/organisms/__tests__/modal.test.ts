import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Modal, ModalType, ModalButton, ModalTheme } from '../modal';
import type { RenderContext, KeyEvent } from '../base';

const ctx = (w = 80, h = 24): RenderContext => ({ width: w, height: h });
const k = (key: string): KeyEvent => ({ key, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, preventDefault: vi.fn(), stopPropagation: vi.fn() });

describe('Modal Component', () => {
  describe('Constructor', () => {
    it('should create confirm modal', () => {
      const modal = new Modal({
        type: 'confirm',
        title: 'Confirm',
        message: 'Are you sure?',
        buttons: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }],
      });
      expect(modal).toBeDefined();
    });

    it('should create info modal', () => {
      const modal = new Modal({
        type: 'info',
        title: 'Info',
        message: 'Something happened',
      });
      expect(modal).toBeDefined();
    });

    it('should create warning modal', () => {
      const modal = new Modal({
        type: 'warning',
        title: 'Warning',
        message: 'Be careful',
      });
      expect(modal).toBeDefined();
    });

    it('should create error modal', () => {
      const modal = new Modal({
        type: 'error',
        title: 'Error',
        message: 'Something went wrong',
      });
      expect(modal).toBeDefined();
    });

    it('should create custom modal', () => {
      const modal = new Modal({
        type: 'custom',
        title: 'Custom',
        message: 'Custom message',
        buttons: [{ label: 'OK', value: 'ok' }],
      });
      expect(modal).toBeDefined();
    });
  });

  describe('draw', () => {
    it('should render modal within width', () => {
      const modal = new Modal({
        type: 'confirm',
        title: 'Confirm',
        message: 'Are you sure?',
        buttons: [{ label: 'Yes', value: 'yes' }],
      });
      const lines = modal.draw(ctx(50, 20));
      for (const line of lines) {
        expect(line.length).toBeLessThanOrEqual(50);
      }
    });

    it('should show title', () => {
      const modal = new Modal({
        type: 'info',
        title: 'Test Title',
        message: 'Test message',
      });
      const lines = modal.draw(ctx());
      expect(lines.join('')).toContain('Test Title');
    });

    it('should show message', () => {
      const modal = new Modal({
        type: 'info',
        title: 'Title',
        message: 'Test message here',
      });
      const lines = modal.draw(ctx());
      expect(lines.join('')).toContain('Test message here');
    });

    it('should show buttons', () => {
      const modal = new Modal({
        type: 'confirm',
        title: 'Confirm',
        message: 'Question?',
        buttons: [
          { label: 'Yes', value: 'yes', primary: true },
          { label: 'No', value: 'no' },
        ],
      });
      const lines = modal.draw(ctx());
      const content = lines.join('');
      expect(content).toContain('Yes');
      expect(content).toContain('No');
    });
  });

  describe('keyboard navigation', () => {
    it('should navigate buttons with ArrowLeft', () => {
      const modal = new Modal({
        type: 'confirm',
        title: 'Confirm',
        message: 'Question?',
        buttons: [
          { label: 'Yes', value: 'yes', primary: true },
          { label: 'No', value: 'no' },
        ],
      });
      modal.setFocus(true);
      modal.keypress(k('ArrowLeft'));
      const lines = modal.draw(ctx());
      expect(lines.join('')).toContain('No');
    });

    it('should navigate buttons with ArrowRight', () => {
      const modal = new Modal({
        type: 'confirm',
        title: 'Confirm',
        message: 'Question?',
        buttons: [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no', primary: true },
        ],
      });
      modal.setFocus(true);
      modal.keypress(k('ArrowRight'));
      const lines = modal.draw(ctx());
      expect(lines.join('')).toContain('Yes');
    });

    it('should select with Enter', () => {
      const onSelect = vi.fn();
      const modal = new Modal({
        type: 'confirm',
        title: 'Confirm',
        message: 'Question?',
        buttons: [{ label: 'Yes', value: 'yes', primary: true }],
        onSelect,
      });
      modal.setFocus(true);
      modal.keypress(k('Enter'));
      expect(onSelect).toHaveBeenCalledWith('yes');
    });
  });

  describe('isActive', () => {
    it('should be active by default', () => {
      const modal = new Modal({
        type: 'info',
        title: 'Title',
        message: 'Message',
      });
      expect(modal.isActive()).toBe(true);
    });
  });

  describe('close', () => {
    it('should close with Escape', () => {
      const onClose = vi.fn();
      const modal = new Modal({
        type: 'info',
        title: 'Title',
        message: 'Message',
        onClose,
      });
      modal.setFocus(true);
      modal.keypress(k('Escape'));
      expect(onClose).toHaveBeenCalled();
    });
  });
});