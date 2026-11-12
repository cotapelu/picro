import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { ConfigSelector } from './ConfigSelector.js';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const groups = [
  { label: 'Extensions', scope: 'user', subgroups: [
    { label: 'a', type: 'extension', items: [
      { path: '/p/a1.ts', displayName: 'alpha-ext', resourceType: 'extension', enabled: true },
      { path: '/p/a2.ts', displayName: 'beta-ext', resourceType: 'extension', enabled: true },
    ]},
  ]},
  { label: 'Skills', scope: 'user', subgroups: [
    { label: 'b', type: 'skill', items: [
      { path: '/p/b1.md', displayName: 'gamma-skill', resourceType: 'skill', enabled: true },
    ]},
  ]},
];

describe('ConfigSelector filter', () => {
  it('keeps group headers for groups with no match (they stay visible)', async () => {
    const changed: any[] = [];
    const { stdin, lastFrame } = render(React.createElement(ConfigSelector as any, {
      groups, onChange: (i: any, e: any) => changed.push([i.displayName, e]), onClose: () => {},
    }));
    stdin.write('gamma');
    await sleep(60);
    console.log('FRAME:' + JSON.stringify(lastFrame()));
  });
});
