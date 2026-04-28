import { describe, it, expect } from 'vitest';
import { Modal } from '../src/components/modal.js';
import { Toast, type ToastOptions } from '../src/components/toast.js';
import { LoginDialog, type LoginDialogOptions } from '../src/components/login-dialog.js';

describe('Modal', () => {
	it('renders title and message with buttons', () => {
		const modal = new Modal({
			title: 'Confirm',
			message: 'Are you sure?',
			buttons: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }],
		});
		const lines = modal.draw({ width: 40, height: 10 });
		const output = lines.join('\n');
		expect(output).toContain('Confirm');
		expect(output).toContain('Are you sure?');
		expect(output).toContain('Yes');
		expect(output).toContain('No');
	});

	it('renders without buttons (info dialog)', () => {
		const modal = new Modal({
			title: 'Info',
			message: 'Just information',
			type: 'info',
		});
		const lines = modal.draw({ width: 30, height: 5 });
		expect(lines.join('\n')).toContain('Info');
		expect(lines.join('\n')).toContain('Just information');
	});

	it('clears cache', () => {
		const modal = new Modal({
			title: 'Test',
			message: '',
		});
		expect(() => modal.clearCache()).not.toThrow();
	});

	it('shows icon based on type', () => {
		const modal = new Modal({
			title: 'Warn',
			message: 'Watch out',
			type: 'warning',
		});
		const lines = modal.draw({ width: 30, height: 5 });
		// Warning icon is ⚠️
		expect(lines.join('\n')).toContain('⚠️');
	});
});

describe('Toast', () => {
	it('renders message and icon based on type', () => {
		const toast = new Toast({ message: 'Success!', type: 'success', duration: 5000 });
		const lines = toast.draw({ width: 40, height: 1 });
		expect(lines.join('\n')).toContain('Success!');
		// success icon is ✅
		expect(lines.join('\n')).toContain('✅');
	});

	it('shows different icons for types', () => {
		const infoToast = new Toast({ message: 'Info', type: 'info', duration: 0 });
		expect(infoToast.draw({ width: 30, height: 1 }).join('\n')).toContain('ℹ️');
		const errorToast = new Toast({ message: 'Error', type: 'error', duration: 0 });
		expect(errorToast.draw({ width: 30, height: 1 }).join('\n')).toContain('❌');
	});

	it('isExpired returns false for infinite duration', () => {
		const toast = new Toast({ message: 'Persistent', type: 'info', duration: 0 });
		expect(toast.isExpired()).toBe(false);
	});

	it('getRemainingPercent returns 100 for infinite', () => {
		const toast = new Toast({ message: 'Info', type: 'info', duration: 0 });
		expect(toast.getRemainingPercent()).toBe(100);
	});
});

describe('LoginDialog', () => {
	it('renders provider and prompt', () => {
		const dlg = new LoginDialog({ provider: 'openai', title: 'API Key' });
		const lines = dlg.draw({ width: 50, height: 10 });
		const output = lines.join('\n');
		expect(output).toContain('API Key');
		expect(output).toContain('openai');
	});

	it('shows empty apiKey initially', () => {
		const dlg = new LoginDialog({});
		expect(dlg.getApiKey()).toBe('');
	});

	it('allows setting apiKey programmatically', () => {
		const dlg = new LoginDialog({});
		dlg.setApiKey('sk-...');
		expect(dlg.getApiKey()).toBe('sk-...');
	});

	it('has isFocused flag', () => {
		const dlg = new LoginDialog({});
		expect(dlg.isFocused).toBe(false);
	});
});
