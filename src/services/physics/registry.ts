import type { ModelDefinition } from './types';

// Rule and seed text is copied from the cited page. Every label inside a rule is a pattern variable;
// registry universes keep the numeric labels their pages print.
export const RULE_REGISTRY: readonly ModelDefinition[] = [
  {
    id: 'wm148', name: 'Branching · wm148', group: 'Documentation fixtures',
    description: 'A relation reproduces itself and extends to a fresh atom.',
    signature: '{{x,y}} -> {{x,y},{y,z}}', seed: [['1', '1']],
    source: 'https://www.wolframphysics.org/universes/wm148/',
  },
  {
    id: 'wm121', name: 'Self-loops · wm121', group: 'Documentation fixtures',
    description: 'A self-loop and an incoming relation are produced by each event.',
    signature: '{{x,y}} -> {{x,x},{z,x}}', seed: [['1', '1']],
    source: 'https://www.wolframphysics.org/universes/wm121/',
  },
  {
    id: 'two-to-four', name: 'Two to four · {{x,y},{x,z}}', group: 'Documentation fixtures',
    description: 'Two relations that share their first atom become four; the rule and the two self-loop seed are the SetReplace causal-graph documentation example.',
    signature: '{{x,y},{x,z}} -> {{x,z},{x,w},{y,w},{z,w}}', seed: [['0', '0'], ['0', '0']],
    source: 'https://github.com/maxitg/SetReplace/blob/44c868bf4622e4542b306846ffdcc47c19d0bba8/Documentation/SymbolsAndFunctions/WolframModelAndWolframModelEvolutionObject/Properties/CausalGraphs.md',
  },
  {
    id: 'setreplace-ternary', name: 'Ternary rewriting', group: 'Documentation fixtures',
    description: 'Two ordered ternary relations are replaced by three.',
    signature: '{{a,b,c},{b,d,e}} -> {{e,f,a},{f,d,b},{d,e,c}}',
    seed: [['1','2','3'], ['2','4','5'], ['4','6','7']],
    source: 'https://github.com/maxitg/SetReplace/blob/44c868bf4622e4542b306846ffdcc47c19d0bba8/README.md',
  },
  {
    id: 'wm1113', name: 'wm1113 · 1₂ → 3₂', group: 'Registry of notable universes',
    description: 'Registry universe wm1113, signature 1₂ → 3₂. The registry page evolves it from 1 self-loop relation for 4 generations. Every label in the rule is a pattern variable.',
    signature: '{{1,2}} -> {{3,3},{3,2},{1,2}}', seed: [['1', '1']],
    source: 'https://www.wolframphysics.org/universes/wm1113/',
  },
  {
    id: 'wm1116', name: 'wm1116 · 2₂ → 4₂', group: 'Registry of notable universes',
    description: 'Registry universe wm1116, signature 2₂ → 4₂. The registry page evolves it from 2 self-loop relations for 6 generations. Every label in the rule is a pattern variable.',
    signature: '{{1,2},{3,2}} -> {{4,1},{1,4},{2,4},{3,4}}', seed: [['1', '1'], ['1', '1']],
    source: 'https://www.wolframphysics.org/universes/wm1116/',
  },
  {
    id: 'wm1137', name: 'wm1137 · 1₃ → 4₃', group: 'Registry of notable universes',
    description: 'Registry universe wm1137, signature 1₃ → 4₃. The registry page evolves it from 1 self-loop relation for 4 generations. Every label in the rule is a pattern variable.',
    signature: '{{1,1,2}} -> {{2,2,2},{2,1,2},{1,2,3},{3,3,1}}', seed: [['1', '1', '1']],
    source: 'https://www.wolframphysics.org/universes/wm1137/',
  },
  {
    id: 'wm1157', name: 'wm1157 · 3₂ → 5₂', group: 'Registry of notable universes',
    description: 'Registry universe wm1157, signature 3₂ → 5₂. The registry page evolves it from 3 self-loop relations for 6 generations. Every label in the rule is a pattern variable.',
    signature: '{{1,2},{1,3},{1,4}} -> {{1,1},{5,1},{5,2},{3,5},{4,3}}', seed: [['1', '1'], ['1', '1'], ['1', '1']],
    source: 'https://www.wolframphysics.org/universes/wm1157/',
  },
  {
    id: 'wm1158', name: 'wm1158 · 2₃ → 3₃', group: 'Registry of notable universes',
    description: 'Registry universe wm1158, signature 2₃ → 3₃. The registry page evolves it from 2 self-loop relations for 6 generations. Every label in the rule is a pattern variable.',
    signature: '{{1,1,2},{3,2,4}} -> {{2,2,4},{5,2,3},{3,5,1}}', seed: [['1', '1', '1'], ['1', '1', '1']],
    source: 'https://www.wolframphysics.org/universes/wm1158/',
  },
  {
    id: 'wm1167', name: 'wm1167 · 2₃ → 3₃', group: 'Registry of notable universes',
    description: 'Registry universe wm1167, signature 2₃ → 3₃. The registry page evolves it from 2 self-loop relations for 6 generations. Every label in the rule is a pattern variable.',
    signature: '{{1,1,2},{3,4,1}} -> {{1,1,4},{5,4,3},{2,5,1}}', seed: [['1', '1', '1'], ['1', '1', '1']],
    source: 'https://www.wolframphysics.org/universes/wm1167/',
  },
  {
    id: 'wm1172', name: 'wm1172 · 2₂ → 4₂', group: 'Registry of notable universes',
    description: 'Registry universe wm1172, signature 2₂ → 4₂. The registry page evolves it from 2 self-loop relations for 6 generations. Every label in the rule is a pattern variable.',
    signature: '{{1,2},{3,2}} -> {{4,1},{4,2},{1,2},{4,3}}', seed: [['1', '1'], ['1', '1']],
    source: 'https://www.wolframphysics.org/universes/wm1172/',
  },
  {
    id: 'wm1173', name: 'wm1173 · 2₃ → 4₃', group: 'Registry of notable universes',
    description: 'Registry universe wm1173, signature 2₃ → 4₃. The registry page evolves it from 2 self-loop relations for 6 generations. Every label in the rule is a pattern variable.',
    signature: '{{1,2,1},{3,4,5}} -> {{6,1,6},{1,5,2},{2,3,7},{3,5,8}}', seed: [['1', '1', '1'], ['1', '1', '1']],
    source: 'https://www.wolframphysics.org/universes/wm1173/',
  },
  {
    id: 'wm1194', name: 'wm1194 · 1₃ → 2₃', group: 'Registry of notable universes',
    description: 'Registry universe wm1194, signature 1₃ → 2₃. The registry page evolves it from 1 self-loop relation for 6 generations. Every label in the rule is a pattern variable.',
    signature: '{{1,1,2}} -> {{3,3,1},{2,1,1}}', seed: [['1', '1', '1']],
    source: 'https://www.wolframphysics.org/universes/wm1194/',
  },
  {
    id: 'wm1199', name: 'wm1199 · 2₃ → 3₃', group: 'Registry of notable universes',
    description: 'Registry universe wm1199, signature 2₃ → 3₃. The registry page evolves it from 2 self-loop relations for 6 generations. Every label in the rule is a pattern variable.',
    signature: '{{1,1,1},{2,3,1}} -> {{3,3,3},{3,1,3},{4,4,2}}', seed: [['1', '1', '1'], ['1', '1', '1']],
    source: 'https://www.wolframphysics.org/universes/wm1199/',
  },
  {
    id: 'wm1218', name: 'wm1218 · 2₂ → 4₂', group: 'Registry of notable universes',
    description: 'Registry universe wm1218, signature 2₂ → 4₂. The registry page evolves it from 2 self-loop relations for 6 generations. Every label in the rule is a pattern variable.',
    signature: '{{1,2},{2,3}} -> {{2,4},{2,4},{4,1},{3,4}}', seed: [['1', '1'], ['1', '1']],
    source: 'https://www.wolframphysics.org/universes/wm1218/',
  },
  {
    id: 'wm1268', name: 'wm1268 · 2₃ → 3₃', group: 'Registry of notable universes',
    description: 'Registry universe wm1268, signature 2₃ → 3₃. The registry page evolves it from 2 self-loop relations for 6 generations. Every label in the rule is a pattern variable.',
    signature: '{{1,1,2},{3,4,2}} -> {{4,4,2},{1,5,2},{1,5,3}}', seed: [['1', '1', '1'], ['1', '1', '1']],
    source: 'https://www.wolframphysics.org/universes/wm1268/',
  },
  {
    id: 'wm11114', name: 'wm11114 · 1₂ 2₃ → 4₂ 4₃', group: 'Registry of notable universes',
    description: 'Registry universe wm11114, signature 1₂ 2₃ → 4₂ 4₃. The registry page evolves it from 3 self-loop relations for 5 generations. Every label in the rule is a pattern variable.',
    signature: '{{1,2,3},{4,3,5},{3,6}} -> {{6,7,8},{6,9,10},{11,8,10},{5,2,9},{9,9},{1,9},{7,5},{8,5}}', seed: [['1', '1', '1'], ['1', '1', '1'], ['1', '1']],
    source: 'https://www.wolframphysics.org/universes/wm11114/',
  },
  {
    id: 'wm12518', name: 'wm12518 · 1₂ 2₃ → 4₂ 4₃', group: 'Registry of notable universes',
    description: 'Registry universe wm12518, signature 1₂ 2₃ → 4₂ 4₃. The registry page evolves it from 3 self-loop relations for 6 generations. Every label in the rule is a pattern variable.',
    signature: '{{1,2,3},{4,3,5},{6,1}} -> {{7,5,4},{5,1,2},{8,2,7},{3,2,9},{10,5},{11,5},{12,4},{13,9}}', seed: [['1', '1', '1'], ['1', '1', '1'], ['1', '1']],
    source: 'https://www.wolframphysics.org/universes/wm12518/',
  },];
export const MODEL_GROUPS = [...new Set(RULE_REGISTRY.map(rule => rule.group))];
export function getRuleById(id: string): ModelDefinition {
  const rule = RULE_REGISTRY.find(r => r.id === id);
  if (!rule) throw new Error(`Unknown rule: ${id}`);
  return rule;
}
