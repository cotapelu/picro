import { describe, it, expect } from 'vitest';
import { parseCommandArgs, substituteArgs } from './prompt-templates.js';

describe('parseCommandArgs', () => {
  it('should split simple arguments', () => {
    expect(parseCommandArgs('foo bar baz')).toEqual(['foo', 'bar', 'baz']);
  });

  it('should handle quoted strings with spaces', () => {
    expect(parseCommandArgs('foo "bar baz" qux')).toEqual(['foo', 'bar baz', 'qux']);
  });

  it('should handle single quotes', () => {
    expect(parseCommandArgs("foo 'bar baz' qux")).toEqual(['foo', 'bar baz', 'qux']);
  });

  it('should ignore multiple spaces', () => {
    expect(parseCommandArgs('foo   bar    baz')).toEqual(['foo', 'bar', 'baz']);
  });

  it('should handle empty string', () => {
    expect(parseCommandArgs('')).toEqual([]);
  });

  it('should handle quoted strings at start and end', () => {
    expect(parseCommandArgs('"hello world" test')).toEqual(['hello world', 'test']);
  });

  it('should handle nested quotes? (no nesting, just treat inner quote as char)', () => {
    expect(parseCommandArgs('foo "bar\'baz"')).toEqual(['foo', "bar'baz"]);
  });

  it('should handle arguments with no spaces', () => {
    expect(parseCommandArgs('foo')).toEqual(['foo']);
  });

  it('should handle mixed quotes', () => {
    expect(parseCommandArgs('a "b c" d \'e f\' g')).toEqual(['a', 'b c', 'd', 'e f', 'g']);
  });
});

describe('substituteArgs', () => {
  it('should replace $1, $2 with positional args', () => {
    expect(substituteArgs('Hello $1, you are $2 years old', ['Alice', '30'])).toBe('Hello Alice, you are 30 years old');
  });

  it('should leave placeholder empty if positional arg missing', () => {
    expect(substituteArgs('Hello $1, $2', ['Alice'])).toBe('Hello Alice, ');
  });

  it('should replace $@ and $ARGUMENTS with all args joined by space', () => {
    expect(substituteArgs('Args: $@', ['a', 'b', 'c'])).toBe('Args: a b c');
    expect(substituteArgs('Args: $ARGUMENTS', ['a', 'b', 'c'])).toBe('Args: a b c');
  });

  it('should replace ${@:start} with args from start index', () => {
    // ${@:2} means from index 2 (1-indexed? The implementation uses start-1, so start=2 means second arg onward)
    expect(substituteArgs('From 2: ${@:2}', ['a', 'b', 'c', 'd'])).toBe('From 2: b c d');
  });

  it('should replace ${@:start:length} with limited slice', () => {
    expect(substituteArgs('Slice: ${@:2:2}', ['a', 'b', 'c', 'd'])).toBe('Slice: b c');
  });

  it('should handle $1 before wildcards', () => {
    // Order: $1 replaced first, then wildcards
    expect(substituteArgs('First: $1, Rest: $@', ['a', 'b', 'c'])).toBe('First: a, Rest: a b c');
  });

  it('should handle multiple $1 occurrences', () => {
    expect(substituteArgs('$1-$1', ['x'])).toBe('x-x');
  });

  it('should handle $@ and $ARGUMENTS multiple times', () => {
    expect(substituteArgs('$@ and $ARGUMENTS', ['a', 'b'])).toBe('a b and a b');
  });

  it('should handle empty args array gracefully', () => {
    expect(substituteArgs('Hello $1', [])).toBe('Hello ');
    expect(substituteArgs('$@', [])).toBe('');
  });

  it('should replace $ followed by digits even if part of larger number', () => {
    // Current implementation matches $1 anywhere, so $100 becomes args[0] (empty if none)
    expect(substituteArgs('Price: $100', [])).toBe('Price: ');
    // Non-digit after $ remains unchanged
    expect(substituteArgs('$var', [])).toBe('$var');
  });
});
