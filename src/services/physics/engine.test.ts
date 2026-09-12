import { describe, expect, it } from 'vitest';
import { createInitialState, evolveUniverse } from './engine';

describe('engine event accounting', () => {
  it('uses a real relation in the default initial state', () => {
    const state = createInitialState();
    expect(state.edges.map(e => e.atoms)).toEqual([['1','1']]);
    expect(state.step).toBe(0);
  });
  it('reproduces 100 deterministic wm148 events', () => {
    let state = createInitialState('wm148');
    for (let i = 0; i < 100; i++) state = evolveUniverse(state, 'wm148', 200);
    expect(state.step).toBe(100);
    expect(state.edges).toHaveLength(101);
    expect(new Set(state.edges.flatMap(e => e.atoms)).size).toBe(101);
    expect(state.events).toHaveLength(100);
  });
});
