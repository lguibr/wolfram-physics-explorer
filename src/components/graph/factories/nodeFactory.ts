import * as THREE from 'three';
import { SHARED_NODE_GEOMETRY } from '../geometries';
import { getGlasmorphicMaterial } from '../materials/glass';
import { GraphNode } from '@/types';

const PALETTE = {
    blue: '#4285F4',
    red: '#EA4335',
    yellow: '#FBBC05',
    green: '#34A853'
};

const COLORS_ARRAY = [PALETTE.blue, PALETTE.red, PALETTE.yellow, PALETTE.green];

export const getNodeColor = (node: GraphNode): string => {
    const age = node.group || 0;
    return COLORS_ARRAY[age % COLORS_ARRAY.length];
};

export interface NodeVisualProps {
    shadowGrowth: number;
    nodeSize: number;
    auraOpacity: number;
}

const DEFAULT_PROPS: NodeVisualProps = {
    shadowGrowth: 1.05,
    nodeSize: 1.0,
    auraOpacity: 0.3
};

export const createNodeObject = (node: GraphNode, props: Partial<NodeVisualProps> = {}): THREE.Object3D => {
     // Merge defaults
     const { shadowGrowth, nodeSize, auraOpacity } = { ...DEFAULT_PROPS, ...props };

     // eslint-disable-next-line @typescript-eslint/no-explicit-any
     const degree = (node as any).degree || 0;
     const baseVal = node.val !== undefined ? node.val : 1;

     const color = getNodeColor(node);
     
     // Size: Base value * Global Node Size Multiplier
     const scale = baseVal * nodeSize;
     
     // Material for Core
     const mat = getGlasmorphicMaterial(color);
     const mesh = new THREE.Mesh(SHARED_NODE_GEOMETRY, mat);
     mesh.scale.set(scale, scale, scale);

     // "Propagated Shadow": Colored Aura
     const growthPerEdge = Math.max(0, shadowGrowth - 1);
     const shadowScale = 1.4 * (1 + (degree * growthPerEdge));
     
     const shadowGeo = SHARED_NODE_GEOMETRY; 
     const shadowMat = new THREE.MeshBasicMaterial({
         color: color, 
         transparent: true,
         opacity: auraOpacity, 
         side: THREE.FrontSide, 
         blending: THREE.AdditiveBlending,
         depthWrite: false // Fix flashing/z-fighting
     });
     const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
     shadowMesh.scale.set(shadowScale, shadowScale, shadowScale);
     shadowMesh.userData = { isShadow: true }; 
     
     // Disable raycasting for shadow so it's not selectable
     shadowMesh.raycast = () => {};
     
     mesh.add(shadowMesh); 

     return mesh;
};

// Direct Mutation Helper to avoid Re-renders
export const updateNodeVisuals = (obj: THREE.Object3D, node: GraphNode, props: Partial<NodeVisualProps>) => {
    const { shadowGrowth, nodeSize, auraOpacity } = { ...DEFAULT_PROPS, ...props };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const degree = (node as any).degree || 0;
    const baseVal = node.val !== undefined ? node.val : 1;
    
    // 1. Update Parent Scale (Core)
    const finalScale = baseVal * nodeSize;
    if (Math.abs(obj.scale.x - finalScale) > 0.001) {
        obj.scale.set(finalScale, finalScale, finalScale);
    }
    
    // 2. Update Shadow Scale & Opacity
    const shadowMesh = obj.children.find(c => c.userData.isShadow) as THREE.Mesh;
    if (shadowMesh) {
        // Shadow Scale
        const growthPerEdge = Math.max(0, shadowGrowth - 1);
        const shadowScale = 1.4 * (1 + (degree * growthPerEdge));
        if (Math.abs(shadowMesh.scale.x - shadowScale) > 0.001) {
            shadowMesh.scale.set(shadowScale, shadowScale, shadowScale);
        }

        // Shadow Material
        const mat = shadowMesh.material as THREE.MeshBasicMaterial;
        if (mat) {
             if (Math.abs(mat.opacity - auraOpacity) > 0.01) mat.opacity = auraOpacity;
             const targetColor = getNodeColor(node);
             // Optimize color update check? 
             // Three.js Color.equals is fast.
             // But we can just set it, overhead is low for color.
             mat.color.set(targetColor);
        }
    }
};
