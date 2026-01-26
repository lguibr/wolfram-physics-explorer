import * as THREE from 'three';

const materialCache = new Map<string, THREE.MeshBasicMaterial>();

export const getGlasmorphicMaterial = (color: string): THREE.MeshBasicMaterial => {
  if (!materialCache.has(color)) {
    const mat = new THREE.MeshBasicMaterial({ 
      color: color, 
      transparent: true, 
      opacity: 0.85
    });
    materialCache.set(color, mat);
  }
  return materialCache.get(color)!;
};

export const clearMaterialCache = () => materialCache.clear();
