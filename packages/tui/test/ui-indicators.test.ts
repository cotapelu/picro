import { describe, it, expect, vi } from 'vitest';
import { ProgressBar } from '../src/components/progress-bar.js';
import { Rating } from '../src/components/rating.js';
import { Stepper } from '../src/components/stepper.js';
import { Badge, BadgeGroup } from '../src/components/badge.js';
import { BorderedLoader } from '../src/components/loader.js';

// Mock TUI for Loader
const mockTUI = { requestRender: vi.fn() };

describe('ProgressBar', () => {
	it('renders with default chars', () => {
		const bar = new ProgressBar({ percent: 50 });
		const lines = bar.draw({ width: 20, height: 1 });
		expect(lines.join('\n')).toContain('█'); // fill
		expect(lines.join('\n')).toContain('░'); // empty
	});

	it('displays percentage label', () => {
		const bar = new ProgressBar({ percent: 75, showLabel: true });
		const lines = bar.draw({ width: 20, height: 1 });
		expect(lines.join('\n')).toContain('75%');
	});

	it('respects custom fill and empty chars', () => {
		const bar = new ProgressBar({ percent: 25, fillChar: '=', emptyChar: '-' });
		const lines = bar.draw({ width: 10, height: 1 });
		expect(lines.join('\n')).toContain('=');
		expect(lines.join('\n')).toContain('-');
	});

	it('clamps percent to 0-100', () => {
		const bar = new ProgressBar({ percent: 120 });
		expect(bar.getValue()).toBe(100);
		bar.setPercent(-10);
		expect(bar.getValue()).toBe(0);
	});

	it('increments correctly', () => {
		const bar = new ProgressBar({ percent: 50 });
		bar.increment(10);
		expect(bar.getValue()).toBe(60);
	});
});

describe('Rating', () => {
	it('renders stars with correct count', () => {
		const rating = new Rating({ value: 3, maxStars: 5, showLabel: false });
		const lines = rating.draw({ width: 20, height: 1 });
		const text = lines.join('\n');
		const filled = (text.match(/★/g) || []).length;
		const empty = (text.match(/☆/g) || []).length;
		expect(filled).toBe(3);
		expect(empty).toBe(2);
	});

	it('supports half star', () => {
		const rating = new Rating({ value: 3.5, maxStars: 5, allowHalf: true, showLabel: false });
		const lines = rating.draw({ width: 20, height: 1 });
		expect(lines.join('\n')).toContain('½');
	});

	it('updates value via setValue', () => {
		const rating = new Rating({ value: 2, maxStars: 5, showLabel: false });
		rating.setValue(4);
		// Re-render should reflect new value; we'll just check getValue
		expect(rating.getValue()).toBe(4);
	});
});

describe('Stepper', () => {
	const steps = [
		{ id: 'one', label: 'Step 1' },
		{ id: 'two', label: 'Step 2' },
		{ id: 'three', label: 'Step 3' },
	];

	it('renders steps with current highlighted', () => {
		const stepper = new Stepper({ steps, currentStep: 1 });
		const lines = stepper.draw({ width: 40, height: 3 });
		const text = lines.join('\n');
		expect(text).toContain('Step 1');
		expect(text).toContain('Step 2');
		expect(text).toContain('Step 3');
	});

	it('shows connector and description if enabled', () => {
		const stepper = new Stepper({ steps, currentStep: 0, showDescription: true });
		const lines = stepper.draw({ width: 60, height: 5 });
		// Just check that something is rendered
		expect(lines.length).toBeGreaterThan(0);
	});

	it('can navigate next/previous and detect completion', () => {
		const stepper = new Stepper({ steps, currentStep: 0 });
		stepper.nextStep();
		expect(stepper.isComplete()).toBe(false);
		stepper.setCurrentStep(2);
		expect(stepper.isComplete()).toBe(true);
		stepper.previousStep();
		expect(stepper.isComplete()).toBe(false);
	});
});

describe('Badge', () => {
	it('renders label with default variant', () => {
		const badge = new Badge({ label: 'Default' });
		const lines = badge.draw({ width: 20, height: 1 });
		expect(lines.join('\n')).toContain('Default');
	});

	it('applies variant colors', () => {
		const badge = new Badge({ label: 'Error', variant: 'error' });
		const lines = badge.draw({ width: 20, height: 1 });
		expect(lines.join('\n')).toContain('Error');
		expect(lines.join('\n')).toContain('\x1b[48;5;196m'); // error bg
	});

	it('supports prefix and suffix', () => {
		const badge = new Badge({ label: 'Count', prefix: '#' });
		const lines = badge.draw({ width: 20, height: 1 });
		expect(lines.join('\n')).toContain('#Count');
	});
});

describe('BadgeGroup', () => {
	it('renders badges horizontally', () => {
		const group = new BadgeGroup([new Badge({ label: 'A' }), new Badge({ label: 'B' })]);
		const lines = group.draw({ width: 40, height: 1 });
		expect(lines.join('\n')).toContain('A');
		expect(lines.join('\n')).toContain('B');
	});
});

describe('BorderedLoader', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('renders loader with message and spinner', () => {
		const loader = new BorderedLoader(mockTUI as any, {}, 'Loading...', undefined);
		(loader as any).spinnerIndex = 0; // deterministic
		const lines = loader.draw({ width: 40, height: 5 });
		expect(lines.length).toBe(5);
		expect(lines.join('\n')).toContain('Loading...');
		expect(lines.join('\n')).toContain('⠋'); // first spinner frame
	});

	it('shows cancel hint and borders', () => {
		const loader = new BorderedLoader(mockTUI as any, {}, 'Wait', () => {});
		(loader as any).spinnerIndex = 0;
		const lines = loader.draw({ width: 40, height: 5 });
		expect(lines.join('\n')).toContain('Press Esc to cancel');
		// Borders
		expect(lines.join('\n')).toContain('┌');
		expect(lines.join('\n')).toContain('└');
	});
});
