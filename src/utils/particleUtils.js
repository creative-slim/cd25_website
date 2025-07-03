// Shared utilities for particle effects
import * as THREE from 'three';

export const PARTICLE_COLORS = [
    "#FFD700", // Gold
    "#00BFFF", // Blue
    "#FFFACD", // Lemon
    "#87CEEB", // Sky blue
    "#F5DEB3", // Wheat
    "#1E90FF", // Dodger blue
    "#FFEC8B", // Light gold
    "#4682B4", // Steel blue
];

export function randomColor() {
    return PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
}

// Returns a random point on a ring in the XZ plane, with Y randomized in ±yJitter
export function randomOnRing(radius, yJitter = 0.1) {
    const theta = Math.random() * 2 * Math.PI;
    const x = radius * Math.cos(theta);
    const z = radius * Math.sin(theta);
    const y = (Math.random() - 0.5) * 2 * yJitter;
    return new THREE.Vector3(x, y, z);
}

// Returns N evenly distributed points on a ring in the XZ plane, with Y randomized in ±yJitter
export function distributedRingPoints(count, radius, yJitter = 0.1) {
    const points = [];
    for (let i = 0; i < count; i++) {
        const theta = (i / count) * 2 * Math.PI;
        const x = radius * Math.cos(theta);
        const z = radius * Math.sin(theta);
        const y = (Math.random() - 0.5) * 2 * yJitter;
        points.push(new THREE.Vector3(x, y, z));
    }
    return points;
} 