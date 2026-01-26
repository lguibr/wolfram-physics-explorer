import { GraphNode, GraphLink } from '@/types';

// Helper to extract variables from "{x,y}" string
const extractVars = (str: string): string[] => {
    return str.replace(/[{}]/g, '').split(',').map(s => s.trim());
};

export const parseAndApplyCustomRule = (
    signature: string,
    nodes: GraphNode[],
    links: GraphLink[],
    maxId: number,
    step: number
): { newNodes: GraphNode[], newLinks: GraphLink[] } => {
    const [lhsStr, rhsStr] = signature.split('->').map(s => s.trim());
    
    // Parse LHS: Find required edge blocks e.g. ["{x,y}", "{u,v}"]
    const lhsEdges = (lhsStr.match(/\{[^{}]*?\}/g) || []).filter(s => s.includes(','));
    const neededCount = Math.max(1, lhsEdges.length);

    // GENESIS CHECK
    if (links.length < neededCount) {
         if (nodes.length === 0) return { newNodes: [], newLinks: [] };
         const parent = nodes[Math.floor(Math.random() * nodes.length)];
         const id = (maxId + 1).toString();
         return {
             newNodes: [{ id, group: step, val: 1 }],
             newLinks: [{ source: parent.id, target: id }]
         };
    }

    // STOCHASTIC MATCHING
    // 1. Pick 'neededCount' random links from the graph
    const chosenLinks: GraphLink[] = [];
    for(let i=0; i<neededCount; i++) {
        chosenLinks.push(links[Math.floor(Math.random() * links.length)]);
    }

    // 2. Build Variable Map (e.g. x -> '1', y -> '2')
    const varMap = new Map<string, string>();
    
    lhsEdges.forEach((edgePattern, idx) => {
        const vars = extractVars(edgePattern); // ['x', 'y']
        const link = chosenLinks[idx % chosenLinks.length]; // Cycle if needed
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = typeof link.source === 'object' ? (link.source as any).id : link.source;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const t = typeof link.target === 'object' ? (link.target as any).id : link.target;
        
        if (vars[0]) varMap.set(vars[0], s);
        if (vars[1]) varMap.set(vars[1], t);
    });

    // 3. Generate RHS
    const newNodes: GraphNode[] = [];
    const newLinks: GraphLink[] = [];
    let localMaxId = maxId;

    const rhsEdges = (rhsStr.match(/\{[^{}]*?\}/g) || []).filter(s => s.includes(','));
    
    rhsEdges.forEach(edgePattern => {
        const vars = extractVars(edgePattern); // ['x', 'z']
        const sourceVar = vars[0];
        const targetVar = vars[1];
        
        // Resolve Source
        let sourceId = varMap.get(sourceVar);
        if (!sourceId) {
            // New variable! (e.g. 'z') -> Create new node
            localMaxId++;
            sourceId = localMaxId.toString();
            varMap.set(sourceVar, sourceId); // Cache it
            newNodes.push({ id: sourceId, group: step, val: 1 });
        }

        // Resolve Target
        let targetId = varMap.get(targetVar);
        if (!targetId) {
            localMaxId++;
            targetId = localMaxId.toString();
            varMap.set(targetVar, targetId);
            newNodes.push({ id: targetId, group: step, val: 1 });
        }

        // Add Link
        // Prevent self-loops if intended? No, allow everything.
        newLinks.push({ source: sourceId, target: targetId });
    });

    return { newNodes, newLinks };
};
