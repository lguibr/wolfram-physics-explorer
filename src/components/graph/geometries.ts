import * as THREE from 'three';

// OPTIMIZATION: Low-Poly Geometry for High Performance
export const SHARED_NODE_GEOMETRY = new THREE.SphereGeometry(3, 8, 8); 

// PARTICLE GEOMETRY: A "Sphere" or "Ball" shape
export const PARTICLE_GEOMETRY = new THREE.SphereGeometry(1.5, 8, 8); 
