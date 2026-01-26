import * as THREE from 'three';
// import { PARTICLE_GEOMETRY } from '../geometries'; // Removed unused import
import { getParticleMaterial } from '../materials/particles';
import { GraphLink, GraphNode } from '@/types';
import { getNodeColor } from './nodeFactory';

export const createLinkParticle = (link: GraphLink, sourceNode?: GraphNode, sizeMultiplier: number = 1.0): THREE.Object3D => {
    let color = '#FBBC05'; // default fallback
    
    if (sourceNode) {
       color = getNodeColor(sourceNode);
    } else if (link.source && typeof link.source === 'object') {
       // Fallback if source is already an object on the link
       color = getNodeColor(link.source as GraphNode);
    }

    // Enhance material with user requested aesthetics
    // Using particle material generator but ensuring it handles color correctly
    // Scale geometry based on sizeMultiplier
    const geometry = new THREE.SphereGeometry(2 * sizeMultiplier, 8, 8);
    const mesh = new THREE.Mesh(geometry, getParticleMaterial(color));
    
    return mesh;
};
