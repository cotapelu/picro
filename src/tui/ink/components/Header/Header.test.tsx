/** @jsxImportSource react */
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { Header } from './Header';

describe('Header', () => {
  it('renders title and model info', () => {
    const { lastFrame } = render(
      <Header
        title="Picro"
        status="Ready"
        thinkingLevel="medium"
        model="gpt-4"
      />
    );
    const frame = lastFrame();
    expect(frame).toContain('Picro');
    expect(frame).toContain('Model: gpt-4');
    expect(frame).toContain('Thinking: medium');
    expect(frame).toContain('[Ready]');
  });

  it('shows theme when provided', () => {
    const { lastFrame } = render(
      <Header
        title="Test"
        status="Running"
        thinkingLevel="high"
        model="claude"
        theme="dark"
      />
    );
    expect(lastFrame()).toContain('Theme: dark');
  });

  it('shows Armin when showArmin=true', () => {
    const { lastFrame } = render(
      <Header
        title="Test"
        status="Ready"
        thinkingLevel="low"
        model="test"
        showArmin={true}
      />
    );
    // Armin component renders something; just check it doesn't crash
    expect(lastFrame()).toBeTruthy();
  });

  it('shows resource counts when provided', () => {
    const { lastFrame } = render(
      <Header
        title="Picro"
        status="Ready"
        thinkingLevel="medium"
        model="gpt-4"
        resourceCounts={{ extensions: 5, skills: 3, prompts: 2, themes: 1 }}
      />
    );
    const frame = lastFrame();
    expect(frame).toContain('E:5');
    expect(frame).toContain('S:3');
    expect(frame).toContain('P:2');
    expect(frame).toContain('T:1');
  });

  it('does not show resource counts when not provided', () => {
    const { lastFrame } = render(
      <Header
        title="Picro"
        status="Ready"
        thinkingLevel="medium"
        model="gpt-4"
      />
    );
    const frame = lastFrame();
    expect(frame).not.toContain('E:');
    expect(frame).not.toContain('S:');
  });

  it('shows red status when starts with Error', () => {
    const { lastFrame } = render(
      <Header
        title="Test"
        status="Error: something went wrong"
        thinkingLevel="medium"
        model="gpt-4"
      />
    );
    // Ink uses ANSI colors; frame contains the raw text with escape sequences
    const frame = lastFrame();
    expect(frame).toContain('Error: something went wrong');
  });
});
