import { describe, it, expect } from 'vitest';
import { evolveUniverse, createInitialState } from './engine';
import { RULE_REGISTRY } from './registry';

describe('Physics Engine', () => {
  it('should initialize with a single node', () => {
    const state = createInitialState();
    expect(state.nodes).toHaveLength(1);
    expect(state.links).toHaveLength(0);
    expect(state.step).toBe(0);
  });

  it('should evolve based on cosmic inflation rule', () => {
    let state = createInitialState();
    const inflationRule = RULE_REGISTRY.find(r => r.id === 'cosmic_inflation')!;
    
    // Evolve 1 step
    state = evolveUniverse(state, inflationRule.id, 100);
    expect(state.nodes.length).toBeGreaterThan(1);
    expect(state.step).toBe(1);
    
    // Check IDs are strings
    state.nodes.forEach(n => {
        expect(typeof n.id).toBe('string');
    });
  });

  it('should respect max nodes limit', () => {
    let state = createInitialState();
    const inflationRule = RULE_REGISTRY.find(r => r.id === 'cosmic_inflation')!;
    
    // Set low limit
    const limit = 5;
    
    // Run multiple steps to potential overflow
    for(let i=0; i<5; i++) {
        state = evolveUniverse(state, inflationRule.id, limit);
    }
    
    expect(state.nodes.length).toBeLessThanOrEqual(limit);
  });
});
