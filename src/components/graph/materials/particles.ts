import * as THREE from 'three';

const particleMaterialCache = new Map<string, THREE.Material>();

export const getParticleMaterial = (color: string): THREE.MeshPhongMaterial => {
    if(!particleMaterialCache.has(color)) {
        const mat = new THREE.MeshPhongMaterial({
            color: color,
            transparent: true,
            opacity: 0.9,
            shininess: 100, // High shine
            emissive: color,
            emissiveIntensity: 0.5,
            specular: 0xffffff,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        particleMaterialCache.set(color, mat);
    }
    return particleMaterialCache.get(color)! as THREE.MeshPhongMaterial; // casting for cache
};

export const clearParticleCache = () => particleMaterialCache.clear();
