/** @jsxImportSource react */
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { ThemeProvider } from '../../hooks/useTheme.js';
import { CustomMessage } from './CustomMessage';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider initialMode="dark">{ui}</ThemeProvider>);
}

describe('CustomMessage', () => {
  it('renders custom type and JSON content', () => {
    const { lastFrame } = renderWithTheme(
      <CustomMessage content='{"type":"info","text":"Hello"}' customType="my-extension" />
    );
    expect(lastFrame()).toContain('my-extension');
    expect(lastFrame()).toContain('"type":"info"');
    expect(lastFrame()).toContain('"text":"Hello"');
  });

  it('renders string content directly', () => {
    const { lastFrame } = renderWithTheme(
      <CustomMessage content="Plain text content" customType="simple" />
    );
    expect(lastFrame()).toContain('Plain text content');
  });

  it('handles empty content', () => {
    const { lastFrame } = renderWithTheme(
      <CustomMessage content="" customType="empty" />
    );
    // Renders label and empty content line
    expect(lastFrame()).toContain('empty');
  });

  it('renders complex JSON formatting', () => {
    const json = '{"items":[1,2,3],"meta":{"count":3}}';
    const { lastFrame } = renderWithTheme(
      <CustomMessage content={json} customType="complex" />
    );
    expect(lastFrame()).toContain('[1,2,3]');
    expect(lastFrame()).toContain('"count":3');
  });
});
