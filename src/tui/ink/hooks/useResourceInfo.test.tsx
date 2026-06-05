// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResourceInfo } from './useResourceInfo';

function createMockRuntime(overrides: any = {}): any {
  return {
    session: {
      _resourceLoader: {
        getExtensions: vi.fn(),
        getSkills: vi.fn(),
        getPromptTemplates: vi.fn(),
        getThemes: vi.fn(),
      },
    },
    settings: {
      get: vi.fn().mockReturnValue(false),
    },
    ...overrides,
  };
}

describe('useResourceInfo', () => {
  let addToast: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.clearAllMocks();
    addToast = vi.fn();
  });

  it('initializes with zero counts', () => {
    const runtime = createMockRuntime();
    const { result } = renderHook(() => useResourceInfo(runtime, addToast));
    expect(result.current.resourceCounts).toEqual({
      extensions: 0,
      skills: 0,
      prompts: 0,
      themes: 0,
    });
  });

  it('counts extensions, skills, prompts, themes', () => {
    const runtime = createMockRuntime();
    runtime.session._resourceLoader.getExtensions = vi.fn().mockReturnValue({ extensions: [{}, {}] });
    runtime.session._resourceLoader.getSkills = vi.fn().mockReturnValue({ skills: [{}, {}, {}] });
    runtime.session._resourceLoader.getPromptTemplates = vi.fn().mockReturnValue(['p1', 'p2']);
    runtime.session._resourceLoader.getThemes = vi.fn().mockReturnValue({ themes: [{}, {}] });

    const { result } = renderHook(() => useResourceInfo(runtime, addToast));

    act(() => {
      result.current.showLoadedResources();
    });

    expect(result.current.resourceCounts).toEqual({
      extensions: 2,
      skills: 3,
      prompts: 2,
      themes: 2,
    });
  });

  it('shows toast when not quiet by default', () => {
    const runtime = createMockRuntime();
    runtime.session._resourceLoader.getExtensions = vi.fn().mockReturnValue({ extensions: [{}] });
    runtime.session._resourceLoader.getSkills = vi.fn().mockReturnValue({ skills: [{}] });
    runtime.session._resourceLoader.getPromptTemplates = vi.fn().mockReturnValue([]);
    runtime.session._resourceLoader.getThemes = vi.fn().mockReturnValue({ themes: [{}] });

    const { result } = renderHook(() => useResourceInfo(runtime, addToast));

    act(() => {
      result.current.showLoadedResources();
    });

    expect(addToast).toHaveBeenCalledWith('Loaded: 1 extensions, 1 skills, 0 prompts, 1 themes', 'info');
  });

  it('does not show toast when quietStartup is true', () => {
    const runtime = createMockRuntime();
    runtime.settings.get = vi.fn().mockReturnValue(true); // quiet = true
    runtime.session._resourceLoader.getExtensions = vi.fn().mockReturnValue({ extensions: [{}] });
    runtime.session._resourceLoader.getSkills = vi.fn().mockReturnValue({ skills: [{}] });
    runtime.session._resourceLoader.getPromptTemplates = vi.fn().mockReturnValue([]);
    runtime.session._resourceLoader.getThemes = vi.fn().mockReturnValue({ themes: [{}] });

    const { result } = renderHook(() => useResourceInfo(runtime, addToast));

    act(() => {
      result.current.showLoadedResources();
    });

    expect(addToast).not.toHaveBeenCalled();
  });

  it('shows toast when force option is true even if quiet', () => {
    const runtime = createMockRuntime();
    runtime.settings.get = vi.fn().mockReturnValue(true); // quiet = true
    runtime.session._resourceLoader.getExtensions = vi.fn().mockReturnValue({ extensions: [{}] });
    runtime.session._resourceLoader.getSkills = vi.fn().mockReturnValue({ skills: [{}] });
    runtime.session._resourceLoader.getPromptTemplates = vi.fn().mockReturnValue([]);
    runtime.session._resourceLoader.getThemes = vi.fn().mockReturnValue({ themes: [{}] });

    const { result } = renderHook(() => useResourceInfo(runtime, addToast));

    act(() => {
      result.current.showLoadedResources({ force: true });
    });

    expect(addToast).toHaveBeenCalledWith('Loaded: 1 extensions, 1 skills, 0 prompts, 1 themes', 'info');
  });

  it('handles missing loader gracefully', () => {
    const runtime = createMockRuntime();
    runtime.session._resourceLoader = undefined;

    const { result } = renderHook(() => useResourceInfo(runtime, addToast));

    act(() => {
      result.current.showLoadedResources();
    });

    expect(result.current.resourceCounts).toEqual({
      extensions: 0,
      skills: 0,
      prompts: 0,
      themes: 0,
    });
    // No toast because quiet by default and no force; but settings not quiet? Actually we default quiet false, but since loader is undefined, no toast because counts zero? Actually even without loader, the code will try to get resourceCounts (zero) and then if not quiet, it will toast "Loaded: 0 extensions, 0 skills, 0 prompts, 0 themes". The default quiet is false, so it would toast. In this test runtime.settings.get returns false, so quiet false, so toast called. Wait we want to check that it handles loader undefined gracefully without throwing. It will still call toast with zeros. That's fine.
    expect(addToast).toHaveBeenCalledWith('Loaded: 0 extensions, 0 skills, 0 prompts, 0 themes', 'info');
  });

  it('handles exceptions in loader methods', () => {
    const runtime = createMockRuntime();
    runtime.session._resourceLoader.getExtensions = vi.fn().mockImplementation(() => {
      throw new Error('fail');
    });
    runtime.session._resourceLoader.getSkills = vi.fn().mockReturnValue({ skills: [{}] }); // this may not be called due to catch inside

    const { result } = renderHook(() => useResourceInfo(runtime, addToast));

    act(() => {
      result.current.showLoadedResources();
    });

    // Should still set counts to zero and not throw
    expect(result.current.resourceCounts).toEqual({
      extensions: 0,
      skills: 0,
      prompts: 0,
      themes: 0,
    });
    // Toast still called with zeros (quiet false)
    expect(addToast).toHaveBeenCalledWith('Loaded: 0 extensions, 0 skills, 0 prompts, 0 themes', 'info');
  });
});
