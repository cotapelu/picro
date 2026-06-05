// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModal } from './useModal';

describe('useModal', () => {
  it('initial state has no active modal', () => {
    const { result } = renderHook(() => useModal());
    expect(result.current.activeModal).toBeNull();
  });

  it('setActiveModal updates activeModal', () => {
    const { result } = renderHook(() => useModal());
    act(() => {
      result.current.setActiveModal({ type: 'test' });
    });
    expect(result.current.activeModal).toEqual({ type: 'test' });
  });

  it('can close modal by setting null', () => {
    const { result } = renderHook(() => useModal());
    act(() => {
      result.current.setActiveModal({ type: 'test' });
    });
    act(() => {
      result.current.setActiveModal(null);
    });
    expect(result.current.activeModal).toBeNull();
  });

  it('supports multiple set calls', () => {
    const { result } = renderHook(() => useModal());
    act(() => {
      result.current.setActiveModal({ type: 'first' });
    });
    expect(result.current.activeModal).toEqual({ type: 'first' });
    act(() => {
      result.current.setActiveModal({ type: 'second' });
    });
    expect(result.current.activeModal).toEqual({ type: 'second' });
  });
});
