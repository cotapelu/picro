/** @jsxImportSource react */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import React, { act } from 'react';
import { ThemeProvider, useTheme } from './useTheme.js';
import { darkTheme, lightTheme } from '../themes.js';

// Helper component to test useTheme hook inside a provider
const TestComponent = ({ onMount }: { onMount?: (value: ReturnType<typeof useTheme>) => void }) => {
  const themeValue = useTheme();
  if (onMount) onMount(themeValue);
  return null;
};

describe('useTheme', () => {
  it('provides theme context within ThemeProvider', () => {
    let capturedValue: any = null;
    const { lastFrame } = render(
      <ThemeProvider initialMode="dark">
        <TestComponent onMount={(value) => { capturedValue = value; }} />
      </ThemeProvider>
    );
    expect(capturedValue).not.toBeNull();
    expect(capturedValue.theme).toBe(darkTheme);
    expect(capturedValue.isDark).toBe(true);
    expect(typeof capturedValue.toggleTheme).toBe('function');
  });

  it('defaults to dark mode when initialMode not specified', () => {
    let capturedValue: any = null;
    render(
      <ThemeProvider>
        <TestComponent onMount={(value) => { capturedValue = value; }} />
      </ThemeProvider>
    );
    expect(capturedValue.isDark).toBe(true);
    expect(capturedValue.theme).toBe(darkTheme);
  });

  it('initializes with light mode when initialMode="light"', () => {
    let capturedValue: any = null;
    render(
      <ThemeProvider initialMode="light">
        <TestComponent onMount={(value) => { capturedValue = value; }} />
      </ThemeProvider>
    );
    expect(capturedValue.isDark).toBe(false);
    expect(capturedValue.theme).toBe(lightTheme);
  });

  it('toggles theme between dark and light', () => {
    let capturedValue: any = null;
    const { rerender } = render(
      <ThemeProvider initialMode="dark">
        <TestComponent onMount={(value) => { capturedValue = value; }} />
      </ThemeProvider>
    );
    expect(capturedValue.isDark).toBe(true);
    expect(capturedValue.theme).toBe(darkTheme);

    // Toggle to light
    act(() => {
      capturedValue.toggleTheme();
    });
    // Rerender to get updated context
    rerender(
      <ThemeProvider initialMode="dark">
        <TestComponent onMount={(value) => { capturedValue = value; }} />
      </ThemeProvider>
    );
    expect(capturedValue.isDark).toBe(false);
    expect(capturedValue.theme).toBe(lightTheme);

    // Toggle back to dark
    act(() => {
      capturedValue.toggleTheme();
    });
    rerender(
      <ThemeProvider initialMode="dark">
        <TestComponent onMount={(value) => { capturedValue = value; }} />
      </ThemeProvider>
    );
    expect(capturedValue.isDark).toBe(true);
    expect(capturedValue.theme).toBe(darkTheme);
  });

  // Note: Testing the error case when useTheme is used outside ThemeProvider
  // is complex because ink-testing-library catches React errors. The branch is
  // covered in integration and the code is straightforward. Skipping unit test for now.
});
