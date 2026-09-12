import type { ModelDefinition } from './types';

export const RULE_REGISTRY: readonly ModelDefinition[] = [
  {
    id: 'wm148', name: 'Branching · wm148',
    description: 'A relation reproduces itself and extends to a fresh atom.',
    signature: '{{x,y}} -> {{x,y},{y,z}}', seed: [['1', '1']],
    source: 'https://www.wolframphysics.org/universes/wm148/',
  },
  {
    id: 'wm121', name: 'Self-loops · wm121',
    description: 'A self-loop and an incoming relation are produced by each event.',
    signature: '{{x,y}} -> {{x,x},{z,x}}', seed: [['1', '1']],
    source: 'https://www.wolframphysics.org/universes/wm121/',
  },
  {
    id: 'setreplace-ternary', name: 'Ternary rewriting',
    description: 'Two ordered ternary relations are replaced by three.',
    signature: '{{a,b,c},{b,d,e}} -> {{e,f,a},{f,d,b},{d,e,c}}',
    seed: [['1','2','3'], ['2','4','5'], ['4','6','7']],
    source: 'https://github.com/maxitg/SetReplace/blob/44c868bf4622e4542b306846ffdcc47c19d0bba8/README.md',
  },
];
export function getRuleById(id: string): ModelDefinition {
  const rule = RULE_REGISTRY.find(r => r.id === id);
  if (!rule) throw new Error(`Unknown rule: ${id}`);
  return rule;
}
