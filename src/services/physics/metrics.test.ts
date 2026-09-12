import { describe, expect, it } from 'vitest';
import { createModelState } from './model';
import { measureGraph, summarizeSamples } from './metrics';

describe('measured graph values', () => {
  it('handles empty states without NaN', () => {
    expect(measureGraph(createModelState([]))).toMatchObject({ atoms:0, relations:0, components:0, meanIncidence:0, maxIncidence:0, meanArity:0 });
  });
  it('counts multiplicity, repeated positions and connected components', () => {
    const result = measureGraph(createModelState([['a','a'],['a','b'],['a','b'],['c'],['d','e','f']]));
    expect(result).toMatchObject({ atoms:6, relations:5, incidences:10, components:3, maxIncidence:4, meanArity:2, selfLoops:1 });
    expect(result.arityCounts).toEqual({ 1:1, 2:3, 3:1 });
  });
  it('is invariant under atom renaming and edge list permutation', () => {
    const a = measureGraph(createModelState([['a','b'],['b','c'],['x']]));
    const b = measureGraph(createModelState([['4'],['2','3'],['1','2']]));
    expect(a).toEqual(b);
  });
  it('reports exact median and nearest-rank p95 for reproducible samples', () => {
    expect(summarizeSamples([1,2,3,4])).toEqual({ median:2.5, p95:4 });
    expect(summarizeSamples([])).toEqual({ median:0, p95:0 });
  });
});
